(() => {
  const $ = id => document.getElementById(id);
  const records = Array.isArray(window.PERFORMANCE_HIGHLIGHT_DATA) ? window.PERFORMANCE_HIGHLIGHT_DATA : [];
  const defaults = { keyword: '', period: '', evaluationType: '', scoreGrade: '', scoreType: 'overallScore', scoreMin: 0, scoreMax: 100 };
  const scoreTypes = { overallScore: 'Overall Score', goalScore: 'Goal Score', competencyScore: 'Competency Score' };
  const metrics = { branch: 'Branch', department: 'Department', position: 'Position', reportingTo: 'Reporting To', evaluationType: 'Evaluation Type', scoreGrade: 'Score Grade', period: 'Period' };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#f97316'];
  const state = { filters: { ...defaults }, rows: [], view: 'report', metric: 'branch', analysisMetric: 'branch', analysis: null };
  const main = document.querySelector('main');
  const phone = document.querySelector('.phone-container');
  const form = $('performanceHighlightFilterForm');
  let activeOverlay = null, returnFocus = null, inerted = [];

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function numeric(value) {
    if (value === '' || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function score(record, type = state.filters.scoreType) { return numeric(record[type]); }
  function numberText(value) { return value == null ? '—' : Number(value).toFixed(2); }
  function display(value) { return value === '' || value == null ? '—' : String(value); }
  function employeeId(value) { const id = String(value ?? '').replace(/^#+/, ''); return id ? `#${id}` : '—'; }
  function average(rows) {
    const scores = rows.map(record => score(record)).filter(value => value != null);
    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  }
  function dateText(value, monthOnly = false) {
    if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(String(value || ''))) return display(value);
    const date = new Date(`${value.length === 7 ? value + '-01' : value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? display(value) : new Intl.DateTimeFormat('en-GB', { ...(monthOnly ? {} : { day: 'numeric' }), month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function filterRows() {
    const filters = state.filters, query = filters.keyword.trim().toLowerCase().replace(/^#/, '');
    const rangeActive = filters.scoreMin !== defaults.scoreMin || filters.scoreMax !== defaults.scoreMax;
    return records.filter(record => {
      const text = [record.empNo, record.name, record.branch, record.department, record.position, record.reportingTo].join(' ').toLowerCase();
      const value = score(record);
      return (!query || text.includes(query)) && (!filters.period || String(record.period) === filters.period) &&
        (!filters.evaluationType || record.evaluationType === filters.evaluationType) && (!filters.scoreGrade || record.scoreGrade === filters.scoreGrade) &&
        (value == null ? !rangeActive : value >= filters.scoreMin && value <= filters.scoreMax);
    });
  }

  function renderReport() {
    state.rows = filterRows();
    const tbody = $('performanceHighlightTable').tBodies[0];
    tbody.replaceChildren();
    state.rows.forEach(record => {
      const row = node('tr');
      row.append(node('td', 'performance-highlight-employee-id', employeeId(record.empNo)), node('td', 'attendance-report-name', display(record.name)));
      const cell = node('td');
      const button = node('button', 'performance-highlight-score', numberText(score(record)));
      button.type = 'button';
      button.dataset.performanceEvaluation = record.id;
      button.setAttribute('aria-label', `View ${display(record.name)} performance evaluation, ${dateText(record.evaluationDate)}`);
      button.addEventListener('click', () => openDetails(record, button));
      cell.append(button);
      row.append(cell, ...['branch', 'department', 'position'].map(key => node('td', '', display(record[key]))));
      tbody.append(row);
    });
    if (!state.rows.length) { const cell = tbody.insertRow().insertCell(); cell.colSpan = 6; cell.className = 'attendance-report-empty'; cell.textContent = 'No records match the current filter.'; }
    $('performanceHighlightTotalRecords').textContent = String(state.rows.length);
    $('performanceHighlightAverageScore').textContent = numberText(average(state.rows));
    const filters = state.filters;
    const parts = [filters.keyword, filters.period || 'All Periods', filters.evaluationType, filters.scoreGrade ? `Grade ${filters.scoreGrade}` : '', scoreTypes[filters.scoreType]];
    if (filters.scoreMin !== defaults.scoreMin || filters.scoreMax !== defaults.scoreMax) parts.push(`${filters.scoreMin}–${filters.scoreMax}`);
    $('performanceHighlightFilterSummary').textContent = parts.filter(Boolean).join(' · ');
  }

  function openOverlay(overlay, target, trigger = document.activeElement) {
    activeOverlay = overlay; returnFocus = trigger;
    overlay.hidden = false;
    overlay.classList.toggle('is-open', overlay.classList.contains('standard-filter-sheet'));
    overlay.setAttribute('aria-hidden', 'false');
    inerted = [...phone.children].filter(element => element !== overlay && !element.inert);
    inerted.forEach(element => { element.inert = true; });
    target.focus({ preventScroll: true });
  }

  function closeOverlay() {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay.classList.remove('is-open');
    activeOverlay.setAttribute('aria-hidden', 'true');
    activeOverlay = null;
    inerted.forEach(element => { element.inert = false; }); inerted = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function openDetails(record, trigger) {
    const fields = [
      ['Evaluation Date', dateText(record.evaluationDate)], ['Period', record.period], ['Appraisal Type', record.appraisalType ?? record.evaluationType],
      ['Position', record.position], ['Reporting To', record.reportingTo], ['Goal Score', numberText(numeric(record.goalScore))],
      ['Competency Score', numberText(numeric(record.competencyScore))], ['Overall Score', numberText(numeric(record.overallScore))],
      ['Score Grade', record.scoreGrade], ['Recommendation', record.recommendation],
      ['Increment %', record.incrementPercent == null || record.incrementPercent === '' ? null : `${record.incrementPercent}%`],
      ['Bonus Factor', record.bonusFactor], ['Notes', record.notes], ['Superior Remarks', record.superiorRemarks]
    ];
    $('performanceHighlightDetailName').textContent = display(record.name);
    $('performanceHighlightDetailsRows').replaceChildren(...fields.map(([label, value]) => {
      const row = node('tr'), heading = node('th', 'detail-popout-label', label);
      heading.scope = 'row'; row.append(heading, node('td', 'detail-popout-value', display(value))); return row;
    }));
    const overlay = $('performanceHighlightDetailsOverlay');
    overlay.querySelector('.detail-popout-body').scrollTop = 0;
    openOverlay(overlay, $('performanceHighlightCloseDetails'), trigger);
  }

  function fillFilter(values) {
    Object.entries(values).forEach(([key, value]) => { form.elements.namedItem(key).value = String(value); });
    $('performanceHighlightFilterError').hidden = true;
    $('performanceHighlightFilterError').textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
  }

  function applyFilter(event) {
    event.preventDefault();
    const min = $('performanceHighlightScoreMin'), max = $('performanceHighlightScoreMax');
    const scoreMin = min.value === '' ? defaults.scoreMin : Number(min.value);
    const scoreMax = max.value === '' ? defaults.scoreMax : Number(max.value);
    form.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    const invalid = !min.validity.valid ? min : !max.validity.valid ? max : scoreMin > scoreMax ? min : null;
    if (invalid) {
      $('performanceHighlightFilterError').textContent = scoreMin > scoreMax ? 'Minimum score must be on or below maximum score.' : 'Enter a score between 0 and 100.';
      $('performanceHighlightFilterError').hidden = false; invalid.setAttribute('aria-invalid', 'true'); invalid.focus(); return;
    }
    state.filters = { keyword: form.elements.keyword.value.trim(), period: form.elements.period.value, evaluationType: form.elements.evaluationType.value,
      scoreGrade: form.elements.scoreGrade.value, scoreType: form.elements.scoreType.value, scoreMin, scoreMax };
    state.analysis = null;
    renderReport(); closeOverlay(); main.scrollTop = 0;
  }

  function selectedRange(rows = state.rows) {
    const dates = rows.map(record => record.evaluationDate).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))).sort();
    return dates.length ? `${dateText(dates[0])} – ${dateText(dates.at(-1))}` : state.filters.period || 'All Periods';
  }

  // Donut slices show evaluation counts; averages remain weighted by individual evaluations.
  function renderBreakdown(prefix, rows, metric, subtitle, interactive = false) {
    const groups = new Map();
    rows.forEach(record => { const key = display(record[metric]); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record); });
    const grouped = [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    $(`${prefix}Title`).textContent = `Average score by ${metrics[metric].toLowerCase()}`;
    $(`${prefix}Subtitle`).textContent = subtitle;
    $(`${prefix}Column`).textContent = metrics[metric];
    $(`${prefix}Average`).textContent = numberText(average(rows));
    $(`${prefix}Note`).textContent = rows.length ? `Slices show share of evaluations · ${scoreTypes[state.filters.scoreType]}` : 'No evaluations match the current filter.';
    $(`${prefix}Donut`).setAttribute('aria-label', `${rows.length} evaluations by ${metrics[metric].toLowerCase()}, average ${numberText(average(rows))}`);
    const segments = $(`${prefix}Segments`), legend = $(`${prefix}Legend`);
    segments.replaceChildren(); legend.replaceChildren();
    const circumference = 2 * Math.PI * 70; let offset = 0;
    grouped.forEach(([category, items], index) => {
      const fraction = items.length / rows.length, color = colors[index % colors.length];
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); title.textContent = `${category}: ${items.length} evaluations, average ${numberText(average(items))}`;
      circle.append(title); segments.append(circle); offset += fraction * circumference;
      const row = node(interactive ? 'button' : 'div', 'attendance-report-legend-row');
      row.dataset.records = String(items.length); row.dataset.category = category;
      if (interactive) { row.type = 'button'; row.setAttribute('aria-label', `View ${category} performance analysis`); row.addEventListener('click', () => openAnalysis(items, `${category} · ${selectedRange(items)}`, 'chart')); }
      const label = node('span', 'attendance-report-legend-label'), dot = node('i', 'attendance-report-dot');
      dot.style.background = color; dot.setAttribute('aria-hidden', 'true'); label.append(dot, node('span', '', category));
      row.append(label, node('span', '', numberText(average(items))), node('span', '', `${(fraction * 100).toFixed(1)}%`)); legend.append(row);
    });
  }

  function renderChart() { renderBreakdown('performanceHighlightChart', state.rows, state.metric, 'Average scores and share of filtered evaluations', true); }
  function renderAnalysis() { if (state.analysis) renderBreakdown('performanceHighlightAnalysis', state.analysis.rows, state.analysisMetric, state.analysis.period); }

  function renderTrend() {
    const months = new Map();
    state.rows.forEach(record => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(record.evaluationDate || ''))) return; const month = record.evaluationDate.slice(0, 7); if (!months.has(month)) months.set(month, []); months.get(month).push(record); });
    $('performanceHighlightTrendRange').textContent = selectedRange();
    $('performanceHighlightTrendAverage').textContent = numberText(average(state.rows));
    $('performanceHighlightTrendTotalCard').disabled = !state.rows.length;
    $('performanceHighlightTrendScoreType').textContent = `${state.rows.length} evaluations · ${scoreTypes[state.filters.scoreType]}`;
    $('performanceHighlightTrendNote').textContent = `${scoreTypes[state.filters.scoreType]} by evaluation month · Click a bar to view analysis`;
    const bars = $('performanceHighlightTrendBars'); bars.replaceChildren();
    [...months].sort(([a], [b]) => a.localeCompare(b)).forEach(([month, items]) => {
      const value = average(items), button = node('button', 'performance-highlight-trend-bar');
      button.type = 'button'; button.dataset.performanceMonth = month; button.dataset.average = numberText(value);
      button.setAttribute('aria-label', `View ${dateText(month, true)} performance analysis, average ${numberText(value)}`);
      const track = node('span', 'performance-highlight-trend-track'), fill = node('span', 'performance-highlight-trend-fill');
      fill.style.width = `${value == null ? 0 : Math.max(0, Math.min(100, value))}%`; track.append(fill);
      button.append(node('span', 'performance-highlight-trend-month', dateText(month, true)), track, node('span', 'performance-highlight-trend-value', numberText(value)));
      button.addEventListener('click', () => openAnalysis(items, dateText(month, true), 'trend')); bars.append(button);
    });
    if (!months.size) bars.append(node('p', 'attendance-report-empty', 'No dated evaluations match the current filter.'));
  }

  function openAnalysis(rows, period, origin) {
    state.analysis = { rows: [...rows], period, origin }; state.analysisMetric = 'branch';
    $('performanceHighlightAnalysisMetric').value = 'branch'; showView('analysis');
  }

  function showView(view) {
    state.view = view;
    const titles = { report: 'Performance Highlight', chart: 'Performance Highlight Analysis', trend: 'Performance Highlight Trend Analysis', analysis: 'Performance Highlight Analysis' };
    const views = { report: 'performanceHighlightReportView', chart: 'performanceHighlightChartView', trend: 'performanceHighlightTrendView', analysis: 'performanceHighlightAnalysisView' };
    Object.entries(views).forEach(([key, id]) => { $(id).hidden = view !== key; });
    $('performanceHighlightTitle').textContent = titles[view]; main.scrollTop = 0;
    $('performanceHighlightBack').setAttribute('aria-label', view === 'report' ? 'Back to Performance' : `Back from ${titles[view]}`);
    if (view === 'chart') { renderChart(); $('performanceHighlightChartMetric').focus({ preventScroll: true }); }
    else if (view === 'trend') { renderTrend(); if (!$('performanceHighlightTrendTotalCard').disabled) $('performanceHighlightTrendTotalCard').focus({ preventScroll: true }); else $('performanceHighlightBack').focus({ preventScroll: true }); }
    else if (view === 'analysis') { renderAnalysis(); $('performanceHighlightAnalysisMetric').focus({ preventScroll: true }); }
    else $('performanceHighlightViewChart').focus({ preventScroll: true });
  }

  function backView() { showView(state.view === 'analysis' ? state.analysis.origin : state.view === 'trend' ? 'chart' : 'report'); }
  function syncBackLink() { $('performanceHighlightBack').href = `../index.html?scope=team&theme=${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`; }

  for (const [key, id] of Object.entries({ period: 'performanceHighlightPeriod', evaluationType: 'performanceHighlightEvaluationType', scoreGrade: 'performanceHighlightScoreGrade' })) {
    const values = [...new Set(records.map(record => record[key]).filter(value => value !== '' && value != null).map(String))].sort();
    if (key === 'period') values.reverse();
    values.forEach(value => $(id).add(new Option(value, value)));
  }
  for (const id of ['performanceHighlightChartMetric', 'performanceHighlightAnalysisMetric']) Object.entries(metrics).forEach(([key, label]) => $(id).add(new Option(label, key)));
  $('performanceHighlightFilterTrigger').addEventListener('click', () => { fillFilter(state.filters); openOverlay($('performanceHighlightFilterOverlay'), $('performanceHighlightKeyword')); });
  $('performanceHighlightResetFilter').addEventListener('click', () => { state.filters = { ...defaults }; state.analysis = null; fillFilter(defaults); renderReport(); });
  $('performanceHighlightCloseFilter').addEventListener('click', closeOverlay);
  $('performanceHighlightCloseDetails').addEventListener('click', closeOverlay);
  form.addEventListener('submit', applyFilter);
  for (const id of ['performanceHighlightFilterOverlay', 'performanceHighlightDetailsOverlay']) $(id).addEventListener('click', event => { if (event.target === event.currentTarget) closeOverlay(); });
  $('performanceHighlightViewChart').addEventListener('click', () => showView('chart'));
  $('performanceHighlightExportPdf').addEventListener('click', () => window.print());
  $('performanceHighlightExportExcel').addEventListener('click', () => {
    window.PeopleHcmHighlightExport.downloadCsv('performance-highlight.csv', [
      ['Emp #', 'Name', 'Score', 'Branch', 'Department', 'Position'],
      ...state.rows.map(record => [employeeId(record.empNo), record.name, score(record), record.branch, record.department, record.position]),
      ['Total Records', state.rows.length, '', '', '', ''],
      ['Average Score', '', average(state.rows), '', '', ''],
      ['Current Filter', $('performanceHighlightFilterSummary').textContent, '', '', '', '']
    ]);
  });
  $('performanceHighlightChartMetric').addEventListener('change', event => { state.metric = event.target.value; renderChart(); });
  $('performanceHighlightAnalysisMetric').addEventListener('change', event => { state.analysisMetric = event.target.value; renderAnalysis(); });
  $('performanceHighlightViewTrend').addEventListener('click', () => showView('trend'));
  $('performanceHighlightTrendTotalCard').addEventListener('click', () => openAnalysis(state.rows, selectedRange(), 'trend'));
  $('performanceHighlightBack').addEventListener('click', event => { if (state.view !== 'report') { event.preventDefault(); backView(); } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (activeOverlay) { event.preventDefault(); closeOverlay(); } else if (state.view !== 'report') { event.preventDefault(); backView(); } return; }
    if (event.key !== 'Tab' || !activeOverlay) return;
    const controls = [...activeOverlay.querySelectorAll('button,input,select,textarea,a[href]')].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  new MutationObserver(syncBackLink).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  syncBackLink(); fillFilter(defaults); renderReport();
})();
