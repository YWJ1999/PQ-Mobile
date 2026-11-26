(() => {
  const $ = id => document.getElementById(id);
  const raw = Array.isArray(window.TRAINING_HIGHLIGHT_DATA) ? window.TRAINING_HIGHLIGHT_DATA : [];
  const defaults = { keyword: '', startDate: '', endDate: '', developmentArea: '', course: '', summaryBy: 'employee', daysMin: '', daysMax: '' };
  const metrics = { employee: 'Employee', branch: 'Branch', department: 'Department', position: 'Position', developmentArea: 'Development Area', courseTitle: 'Course', month: 'Month' };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4'];
  const state = { filters: { ...defaults }, rows: [], sessions: [], view: 'report', metric: 'employee', analysisMetric: 'branch', analysis: null, expanded: { chart: false, analysis: false } };
  const form = $('trainingHighlightFilterForm'), overlay = $('trainingHighlightFilterOverlay'), main = document.querySelector('main');
  const detailsOverlay = $('trainingHighlightDetailsOverlay');
  let detailInerted = [];
  let inerted = [], returnFocus = null, detailTrigger = null, selectedEmployee = null, reportScroll = 0;
  const display = value => value === '' || value == null ? '—' : String(value);
  const employeeId = value => formatEmployeeNumber(value) || '—';
  const numberText = value => Number(value).toFixed(2);
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function dateText(value, monthOnly = false) {
    const day = monthOnly ? `${value}-01` : value;
    if (!validDate(day)) return '—';
    return new Intl.DateTimeFormat('en-GB', { ...(monthOnly ? {} : { day: '2-digit' }), month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`)).replace(/\bSept\b/g, 'Sep');
  }

  function days(record) {
    if (record.days == null || record.days === '') return null;
    const value = Number(record.days);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const records = raw.filter(record => record?.empNo && validDate(record.date) && days(record) != null);
  const total = rows => Math.round(rows.reduce((sum, record) => sum + days(record), 0) * 1e8) / 1e8;

  function syncBack() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    $('trainingHighlightBack').href = `../index.html?scope=team&theme=${theme}`;
    $('trainingHighlightBack').setAttribute('aria-label', state.view === 'report' ? 'Back to Training and Competency Team' : 'Back to previous training report');
  }

  function syncUrl() {
    const url = new URL(location.href);
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value === defaults[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    url.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    history.replaceState(null, '', url);
  }

  function renderReport() {
    const filters = state.filters, query = filters.keyword.trim().toLowerCase().replace(/^#+/, '');
    const sessions = records.filter(record => {
      const text = [record.empNo, record.name, record.branch, record.department, record.position, record.courseTitle, record.developmentArea].join(' ').toLowerCase();
      return (!query || text.includes(query)) && (!filters.startDate || record.date >= filters.startDate) && (!filters.endDate || record.date <= filters.endDate)
        && (!filters.developmentArea || record.developmentArea === filters.developmentArea) && (!filters.course || record.courseTitle === filters.course);
    });
    const employees = new Map();
    sessions.forEach(record => {
      if (!employees.has(record.empNo)) employees.set(record.empNo, { ...record, sessions: [] });
      employees.get(record.empNo).sessions.push(record);
    });
    state.rows = [...employees.values()].map(record => ({ ...record, days: total(record.sessions) })).filter(record =>
      (filters.daysMin === '' || record.days >= Number(filters.daysMin)) && (filters.daysMax === '' || record.days <= Number(filters.daysMax)));
    const included = new Set(state.rows.map(record => record.empNo));
    state.sessions = sessions.filter(record => included.has(record.empNo));
    $('trainingHighlightTable').tBodies[0].replaceChildren(...state.rows.map(record => {
      const row = node('tr'), value = node('td'), button = node('button', 'performance-highlight-score', numberText(record.days));
      button.type = 'button'; button.dataset.trainingEmployee = record.empNo;
      button.setAttribute('aria-label', `View training courses for ${record.name}, ${numberText(record.days)} days`);
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'trainingHighlightDetailsOverlay');
      button.addEventListener('click', () => openDetails(record, button));
      value.append(button);
      row.append(node('td', 'performance-highlight-employee-id', employeeId(record.empNo)), node('td', 'attendance-report-name', display(record.name)), value,
        ...['branch', 'department', 'position'].map(key => node('td', '', display(record[key]))));
      return row;
    }));
    if (!state.rows.length) {
      const cell = $('trainingHighlightTable').tBodies[0].insertRow().insertCell();
      cell.colSpan = 6; cell.className = 'attendance-report-empty'; cell.textContent = 'No training records match the current filter.';
    }
    $('trainingHighlightTotalRecords').textContent = String(state.rows.length);
    $('trainingHighlightTotalDays').textContent = numberText(total(state.sessions));
    const parts = [filters.keyword, filters.startDate || filters.endDate ? `${filters.startDate ? dateText(filters.startDate) : 'Any Start'} – ${filters.endDate ? dateText(filters.endDate) : 'Any End'}` : 'All Dates', filters.developmentArea, filters.course, `Summary by ${metrics[filters.summaryBy]}`].filter(Boolean);
    if (filters.daysMin !== '' || filters.daysMax !== '') parts.push(`${filters.daysMin || '0'}–${filters.daysMax || 'Any'} Days`);
    $('trainingHighlightFilterSummary').textContent = parts.join(' · ');
    syncUrl();
  }

  function renderDetails() {
    const sessions = state.sessions.filter(record => record.empNo === selectedEmployee.empNo).sort((a, b) => b.date.localeCompare(a.date));
    $('trainingHighlightDetailsTitle').textContent = display(selectedEmployee.name);
    $('trainingHighlightDetailRecords').textContent = String(sessions.length);
    $('trainingHighlightDetailDays').textContent = numberText(total(sessions));
    $('trainingHighlightDetailTable').tBodies[0].replaceChildren(...sessions.map(record => {
      const row = node('tr');
      row.append(node('td', '', dateText(record.date)), node('td', 'attendance-report-name', display(record.courseTitle)), node('td', '', numberText(days(record))));
      return row;
    }));
  }

  function openDetails(record, trigger) {
    selectedEmployee = record;
    detailTrigger = trigger;
    reportScroll = main.scrollTop;
    renderDetails();
    detailsOverlay.hidden = false;
    detailsOverlay.setAttribute('aria-hidden', 'false');
    detailsOverlay.querySelector('.detail-popout-body').scrollTop = 0;
    detailInerted = [...detailsOverlay.parentElement.children, document.querySelector('preview-top-bar')]
      .filter(element => element && element !== detailsOverlay)
      .map(element => ({ element, previous: element.inert }));
    detailInerted.forEach(({ element }) => { element.inert = true; });
    $('trainingHighlightDetailsClose').focus({ preventScroll: true });
  }

  function closeDetails() {
    if (detailsOverlay.hidden) return;
    detailsOverlay.hidden = true;
    detailsOverlay.setAttribute('aria-hidden', 'true');
    detailInerted.forEach(({ element, previous }) => { element.inert = previous; });
    detailInerted = [];
    main.scrollTop = reportScroll;
    if (detailTrigger?.isConnected) detailTrigger.focus({ preventScroll: true });
    detailTrigger = null;
    selectedEmployee = null;
  }

  function periodText(rows = state.sessions) {
    if (state.filters.startDate && state.filters.endDate && rows === state.sessions) return `${dateText(state.filters.startDate)} – ${dateText(state.filters.endDate)}`;
    const dates = rows.map(record => record.date).sort();
    return dates.length ? `${dateText(dates[0])} – ${dateText(dates.at(-1))}` : 'No Training Records';
  }

  function groups(rows, metric) {
    const grouped = new Map();
    rows.forEach(record => {
      const key = metric === 'employee' ? record.empNo : metric === 'month' ? record.date.slice(0, 7) : display(record[metric]);
      const label = metric === 'employee' ? display(record.name) : metric === 'month' ? dateText(key, true) : key;
      if (!grouped.has(key)) grouped.set(key, { label, rows: [] });
      grouped.get(key).rows.push(record);
    });
    return [...grouped.values()].sort((a, b) => total(b.rows) - total(a.rows) || a.label.localeCompare(b.label));
  }

  function renderBreakdown(kind, rows, metric, subtitle) {
    const prefix = kind === 'chart' ? 'trainingHighlightChart' : 'trainingHighlightAnalysis';
    const sum = total(rows), allGroups = groups(rows, metric);
    let shown = allGroups;
    if (!state.expanded[kind] && allGroups.length > 5) shown = [...allGroups.slice(0, 5), { label: 'Other', rows: allGroups.slice(5).flatMap(group => group.rows) }];
    $(`${prefix}Title`).textContent = `Training days by ${metrics[metric].toLowerCase()}`;
    $(`${prefix}Subtitle`).textContent = subtitle;
    $(`${prefix}Column`).textContent = metrics[metric];
    $(`${prefix}Total`).textContent = numberText(sum);
    $(`${prefix}Note`).textContent = rows.length ? (!state.expanded[kind] && allGroups.length > 5 ? 'Top 5 categories + other · share of training days' : 'Share of total training days') : 'No training records match the current filter.';
    $(`${prefix}Donut`).setAttribute('aria-label', `${numberText(sum)} training days by ${metrics[metric].toLowerCase()}`);
    $(`${prefix}ViewAllFooter`).hidden = allGroups.length <= 5;
    $(`${prefix}ViewAll`).textContent = state.expanded[kind] ? 'Show top 5 categories' : 'View all categories';
    const segments = $(`${prefix}Segments`), legend = $(`${prefix}Legend`);
    segments.replaceChildren(); legend.replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    shown.forEach((group, index) => {
      const count = total(group.rows), fraction = sum > 0 ? count / sum : 0, color = colors[index % colors.length];
      if (fraction > 0) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${group.label}: ${numberText(count)} days, ${(fraction * 100).toFixed(2)}%`;
        circle.append(title); segments.append(circle); offset += fraction * circumference;
      }
      const row = node(kind === 'chart' ? 'button' : 'div', 'attendance-report-legend-row');
      row.dataset.category = group.label; row.dataset.days = String(count);
      if (kind === 'chart') {
        row.type = 'button'; row.setAttribute('aria-label', `View ${group.label} training days analysis`);
        row.addEventListener('click', () => openAnalysis(group.rows, `${group.label} · ${periodText(group.rows)}`, 'chart'));
      }
      const label = node('span', 'attendance-report-legend-label'), dot = node('i', 'attendance-report-dot');
      dot.style.background = color; dot.setAttribute('aria-hidden', 'true'); label.append(dot, node('span', '', group.label));
      row.append(label, node('span', '', numberText(count)), node('span', '', `${(fraction * 100).toFixed(2)}%`)); legend.append(row);
    });
  }

  function renderTrend() {
    const monthly = new Map();
    state.sessions.forEach(record => { const month = record.date.slice(0, 7); if (!monthly.has(month)) monthly.set(month, []); monthly.get(month).push(record); });
    $('trainingHighlightTrendRange').textContent = periodText();
    $('trainingHighlightTrendTotal').textContent = numberText(total(state.sessions));
    $('trainingHighlightTrendRecordCount').textContent = `${state.sessions.length} training records`;
    $('trainingHighlightTrendTotalCard').disabled = !state.sessions.length;
    const max = Math.max(1, ...[...monthly.values()].map(total)), bars = $('trainingHighlightTrendBars');
    bars.replaceChildren();
    [...monthly].sort(([a], [b]) => a.localeCompare(b)).forEach(([month, sessions]) => {
      const value = total(sessions), button = node('button', 'performance-highlight-trend-bar');
      button.type = 'button'; button.dataset.trainingMonth = month; button.dataset.days = String(value);
      button.setAttribute('aria-label', `View ${dateText(month, true)} training analysis, ${numberText(value)} days`);
      const track = node('span', 'performance-highlight-trend-track'), fill = node('span', 'performance-highlight-trend-fill');
      fill.style.width = `${value / max * 100}%`; track.append(fill);
      button.append(node('span', 'performance-highlight-trend-month', dateText(month, true)), track, node('span', 'performance-highlight-trend-value', numberText(value)));
      button.addEventListener('click', () => openAnalysis(sessions, dateText(month, true), 'trend')); bars.append(button);
    });
    if (!monthly.size) bars.append(node('p', 'attendance-report-empty', 'No training records match the current filter.'));
  }

  function openAnalysis(rows, subtitle, origin) {
    state.analysis = { rows: [...rows], subtitle, origin }; state.analysisMetric = 'branch'; state.expanded.analysis = false;
    $('trainingHighlightAnalysisMetric').value = 'branch'; showView('analysis');
  }

  function showView(view) {
    closeDetails();
    state.view = view;
    const views = { report: 'Report', chart: 'Chart', trend: 'Trend', analysis: 'Analysis' };
    Object.entries(views).forEach(([key, suffix]) => { $(`trainingHighlight${suffix}View`).hidden = key !== view; });
    const titles = { report: 'Training Highlight', chart: 'Training Days Analysis', trend: 'Training Days Trend Analysis', analysis: 'Training Days Analysis' };
    $('trainingHighlightTitle').textContent = titles[view]; main.scrollTop = 0;
    if (view === 'chart') { renderBreakdown('chart', state.sessions, state.metric, 'Share of total training days'); $('trainingHighlightChartMetric').focus({ preventScroll: true }); }
    else if (view === 'trend') { renderTrend(); (!$('trainingHighlightTrendTotalCard').disabled ? $('trainingHighlightTrendTotalCard') : $('trainingHighlightBack')).focus({ preventScroll: true }); }
    else if (view === 'analysis') { renderBreakdown('analysis', state.analysis.rows, state.analysisMetric, state.analysis.subtitle); $('trainingHighlightAnalysisMetric').focus({ preventScroll: true }); }
    else $('trainingHighlightViewChart').focus({ preventScroll: true });
    syncBack();
  }

  function back() { showView(state.view === 'analysis' ? state.analysis.origin : state.view === 'trend' ? 'chart' : 'report'); }
  function clearError() { $('trainingHighlightFilterError').hidden = true; form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid')); }
  function openFilter() {
    Object.entries(state.filters).forEach(([key, value]) => { form.elements[key].value = value; }); clearError();
    returnFocus = document.activeElement; overlay.hidden = false; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false');
    $('trainingHighlightFilterTrigger').setAttribute('aria-expanded', 'true');
    inerted = [...document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, body > preview-top-bar')].filter(node => !node.inert);
    inerted.forEach(node => { node.inert = true; }); $('trainingHighlightKeyword').focus();
  }
  function closeFilter() {
    overlay.hidden = true; overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true');
    $('trainingHighlightFilterTrigger').setAttribute('aria-expanded', 'false');
    inerted.forEach(node => { node.inert = false; }); inerted = [];
    returnFocus?.focus({ preventScroll: true }); returnFocus = null;
  }
  function applyFilter(event) {
    event.preventDefault(); clearError();
    const controls = ['startDate', 'endDate', 'daysMin', 'daysMax'].map(key => form.elements[key]);
    let invalid = controls.find(control => !control.validity.valid), message = 'Enter valid dates and non-negative days.';
    if (!invalid && form.elements.startDate.value && form.elements.endDate.value && form.elements.startDate.value > form.elements.endDate.value) {
      invalid = form.elements.endDate; message = 'End date must be on or after start date.';
    }
    if (!invalid && form.elements.daysMin.value !== '' && form.elements.daysMax.value !== '' && Number(form.elements.daysMin.value) > Number(form.elements.daysMax.value)) {
      invalid = form.elements.daysMin; message = 'Minimum days must be on or below maximum days.';
    }
    if (invalid) {
      $('trainingHighlightFilterError').textContent = message; $('trainingHighlightFilterError').hidden = false;
      invalid.setAttribute('aria-invalid', 'true'); invalid.focus(); return;
    }
    state.filters = Object.fromEntries(Object.keys(defaults).map(key => [key, form.elements[key].value.trim()]));
    state.metric = state.filters.summaryBy; state.expanded.chart = false; state.analysis = null;
    $('trainingHighlightChartMetric').value = state.metric;
    renderReport(); closeFilter(); main.scrollTop = 0;
  }

  function exportExcel() {
    window.PeopleHcmHighlightExport.downloadCsv('training-highlight.csv', [
      ['Emp No.', 'Name', 'Days', 'Branch', 'Department', 'Position'],
      ...state.rows.map(record => [employeeId(record.empNo), display(record.name), record.days, display(record.branch), display(record.department), display(record.position)]),
      [], ['Total Records', state.rows.length], ['Total Training Days', total(state.sessions)], ['Current Filter', $('trainingHighlightFilterSummary').textContent]
    ]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    Object.keys(defaults).forEach(key => {
      const value = params.get(key)?.trim();
      if (!value) return;
      if (['startDate', 'endDate'].includes(key) && !validDate(value)) return;
      if (['daysMin', 'daysMax'].includes(key) && (!Number.isFinite(Number(value)) || Number(value) < 0)) return;
      if (key === 'summaryBy' && (!metrics[value] || value === 'month')) return;
      state.filters[key] = value;
    });
    if (state.filters.startDate && state.filters.endDate && state.filters.startDate > state.filters.endDate) Object.assign(state.filters, { startDate: '', endDate: '' });
    if (state.filters.daysMin !== '' && state.filters.daysMax !== '' && Number(state.filters.daysMin) > Number(state.filters.daysMax)) Object.assign(state.filters, { daysMin: '', daysMax: '' });
    for (const [key, field] of Object.entries({ developmentArea: 'developmentArea', course: 'courseTitle' })) {
      [...new Set(records.map(record => record[field]).filter(Boolean))].sort().forEach(value => form.elements[key].append(new Option(value, value)));
    }
    Object.entries(metrics).forEach(([key, label]) => {
      for (const id of ['trainingHighlightChartMetric', 'trainingHighlightAnalysisMetric']) $(id).append(new Option(label, key));
      if (key !== 'month') form.elements.summaryBy.append(new Option(label, key));
    });
    state.metric = state.filters.summaryBy; $('trainingHighlightChartMetric').value = state.metric; $('trainingHighlightAnalysisMetric').value = 'branch';
    $('trainingHighlightFilterTrigger').addEventListener('click', openFilter);
    $('trainingHighlightCloseFilter').addEventListener('click', closeFilter);
    $('trainingHighlightResetFilter').addEventListener('click', () => { form.reset(); clearError(); });
    form.addEventListener('input', clearError); form.addEventListener('submit', applyFilter);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeFilter(); });
    $('trainingHighlightViewChart').addEventListener('click', () => showView('chart'));
    $('trainingHighlightViewTrend').addEventListener('click', () => showView('trend'));
    $('trainingHighlightTrendTotalCard').addEventListener('click', () => openAnalysis(state.sessions, periodText(), 'trend'));
    $('trainingHighlightChartMetric').addEventListener('change', event => { state.metric = event.target.value; state.expanded.chart = false; renderBreakdown('chart', state.sessions, state.metric, 'Share of total training days'); });
    $('trainingHighlightAnalysisMetric').addEventListener('change', event => { state.analysisMetric = event.target.value; state.expanded.analysis = false; renderBreakdown('analysis', state.analysis.rows, state.analysisMetric, state.analysis.subtitle); });
    for (const kind of ['chart', 'analysis']) $(`trainingHighlight${kind === 'chart' ? 'Chart' : 'Analysis'}ViewAll`).addEventListener('click', () => {
      state.expanded[kind] = !state.expanded[kind];
      if (kind === 'chart') renderBreakdown(kind, state.sessions, state.metric, 'Share of total training days');
      else renderBreakdown(kind, state.analysis.rows, state.analysisMetric, state.analysis.subtitle);
    });
    $('trainingHighlightExportExcel').addEventListener('click', exportExcel);
    $('trainingHighlightExportPdf').addEventListener('click', () => window.print());
    $('trainingHighlightDetailsClose').addEventListener('click', closeDetails);
    detailsOverlay.addEventListener('click', event => { if (event.target === detailsOverlay) closeDetails(); });
    $('trainingHighlightBack').addEventListener('click', event => {
      if (!detailsOverlay.hidden) { event.preventDefault(); closeDetails(); }
      else if (state.view !== 'report') { event.preventDefault(); back(); }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!detailsOverlay.hidden) { event.preventDefault(); closeDetails(); }
        else if (!overlay.hidden) { event.preventDefault(); closeFilter(); }
        else if (state.view !== 'report') { event.preventDefault(); back(); }
        return;
      }
      if (event.key !== 'Tab' || overlay.hidden && detailsOverlay.hidden) return;
      const active = detailsOverlay.hidden ? form : detailsOverlay;
      const controls = [...active.querySelectorAll('button,input,select,[tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    });
    renderReport(); syncBack();
  });
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
