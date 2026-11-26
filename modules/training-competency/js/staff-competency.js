(() => {
  const $ = id => document.getElementById(id);
  const records = Array.isArray(window.STAFF_COMPETENCY_DATA) ? window.STAFF_COMPETENCY_DATA : [];
  const defaults = { keyword: '', company: '', branch: '', department: '', job: '', matchMin: 0, matchMax: 100 };
  const metadata = { company: 'company', branch: 'branch', department: 'department', job: 'position' };
  const metrics = { company: 'Company', branch: 'Branch', department: 'Department', position: 'Position' };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4'];
  const state = { filters: { ...defaults }, rows: [], view: 'report', metric: 'branch' };
  const form = $('staffCompetencyFilterForm');
  const overlay = $('staffCompetencyFilterOverlay');
  const main = document.querySelector('main');
  let returnFocus = null, inerted = [];
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const display = value => value === '' || value == null ? '—' : String(value);
  const employeeId = value => formatEmployeeNumber(value) || '—';
  const percent = value => value == null ? '—' : `${value.toFixed(2)}%`;

  function match(record) {
    if (record.matchPercent === '' || record.matchPercent == null) return null;
    const value = Number(record.matchPercent);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  }

  function average(rows) {
    const values = rows.map(match).filter(value => value != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function syncBack() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    $('staffCompetencyBack').href = `../index.html?scope=team&theme=${theme}`;
    $('staffCompetencyBack').setAttribute('aria-label', state.view === 'chart' ? 'Back to Staff Competency table' : 'Back to Training and Competency Team');
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

  function openEmployee(record) {
    const url = new URL('staff-competency-employee.html', location.href);
    url.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    url.searchParams.set('emp', record.empNo);
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value !== defaults[key]) url.searchParams.set(key, value);
    });
    const context = new URLSearchParams(location.search);
    context.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    url.searchParams.set('hubReturn', context.toString());
    location.href = url.href;
  }

  function renderReport() {
    const filters = state.filters;
    const query = filters.keyword.trim().toLowerCase().replace(/^#+/, '');
    const range = filters.matchMin !== 0 || filters.matchMax !== 100;
    state.rows = records.filter(record => {
      const text = [record.empNo, record.name, record.company, record.branch, record.department, record.position].join(' ').toLowerCase();
      const value = match(record);
      return (!query || text.includes(query)) && Object.entries(metadata).every(([key, field]) => !filters[key] || record[field] === filters[key])
        && (value == null ? !range : value >= filters.matchMin && value <= filters.matchMax);
    });
    const tbody = $('staffCompetencyTable').tBodies[0];
    tbody.replaceChildren(...state.rows.map(record => {
      const row = node('tr');
      row.dataset.empNo = record.empNo || '';
      row.tabIndex = 0;
      row.setAttribute('aria-label', `View competencies for ${display(record.name)}, ${employeeId(record.empNo)}`);
      const value = node('td');
      value.append(node('span', 'staff-competency-match', percent(match(record))));
      row.append(node('td', 'performance-highlight-employee-id', employeeId(record.empNo)), node('td', 'attendance-report-name', display(record.name)), value,
        ...['branch', 'department', 'position'].map(key => node('td', '', display(record[key]))));
      row.addEventListener('click', () => openEmployee(record));
      row.addEventListener('keydown', event => {
        if (!['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); openEmployee(record);
      });
      return row;
    }));
    if (!state.rows.length) {
      const cell = tbody.insertRow().insertCell();
      cell.colSpan = 6; cell.className = 'attendance-report-empty'; cell.textContent = 'No staff match the current filter.';
    }
    $('staffCompetencyTotalRecords').textContent = String(state.rows.length);
    $('staffCompetencyAverageMatch').textContent = percent(average(state.rows));
    const parts = [filters.keyword, filters.company, filters.branch, filters.department, filters.job].filter(Boolean);
    if (range) parts.push(`${filters.matchMin}–${filters.matchMax}%`);
    $('staffCompetencyFilterSummary').textContent = parts.join(' · ') || 'All Staff';
    syncUrl();
  }

  function renderChart() {
    const groups = new Map();
    state.rows.forEach(record => {
      const key = display(record[state.metric]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    $('staffCompetencyChartTitle').textContent = `Average match by ${metrics[state.metric].toLowerCase()}`;
    $('staffCompetencyChartColumn').textContent = metrics[state.metric];
    $('staffCompetencyChartAverage').textContent = percent(average(state.rows));
    $('staffCompetencyChartNote').textContent = state.rows.length ? 'Slices show share of employees; averages use available match percentages.' : 'No staff match the current filter.';
    $('staffCompetencyChartDonut').setAttribute('aria-label', `${state.rows.length} employees by ${metrics[state.metric].toLowerCase()}, average match ${percent(average(state.rows))}`);
    const segments = $('staffCompetencyChartSegments'), legend = $('staffCompetencyChartLegend');
    segments.replaceChildren(); legend.replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).forEach(([category, items], index) => {
      const fraction = items.length / state.rows.length, color = colors[index % colors.length];
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${category}: ${items.length} employees, average match ${percent(average(items))}`;
      circle.append(title); segments.append(circle); offset += fraction * circumference;
      const row = node('div', 'attendance-report-legend-row');
      row.dataset.category = category; row.dataset.records = items.length;
      const label = node('span', 'attendance-report-legend-label'), dot = node('i', 'attendance-report-dot');
      dot.style.background = color; dot.setAttribute('aria-hidden', 'true');
      label.append(dot, node('span', '', category));
      row.append(label, node('span', '', percent(average(items))), node('span', '', `${(fraction * 100).toFixed(1)}%`));
      legend.append(row);
    });
  }

  function showView(view) {
    state.view = view;
    $('staffCompetencyReportView').hidden = view !== 'report';
    $('staffCompetencyChartView').hidden = view !== 'chart';
    $('staffCompetencyTitle').textContent = view === 'chart' ? 'Staff Competency Chart' : 'Staff Competency';
    if (view === 'chart') renderChart();
    main.scrollTop = 0;
    syncBack();
    if (view === 'chart') $('staffCompetencyChartMetric').focus({ preventScroll: true });
    else $('staffCompetencyViewChart').focus({ preventScroll: true });
  }

  function clearError() {
    $('staffCompetencyFilterError').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
  }

  function openFilter() {
    Object.entries(state.filters).forEach(([key, value]) => { form.elements[key].value = value; });
    clearError(); returnFocus = document.activeElement;
    overlay.hidden = false; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false');
    $('staffCompetencyFilterTrigger').setAttribute('aria-expanded', 'true');
    inerted = [...document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, body > preview-top-bar')].filter(element => !element.inert);
    inerted.forEach(element => { element.inert = true; });
    $('staffCompetencyKeyword').focus();
  }

  function closeFilter() {
    overlay.hidden = true; overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true');
    $('staffCompetencyFilterTrigger').setAttribute('aria-expanded', 'false');
    inerted.forEach(element => { element.inert = false; }); inerted = [];
    returnFocus?.focus({ preventScroll: true }); returnFocus = null;
  }

  function applyFilter(event) {
    event.preventDefault(); clearError();
    const min = form.elements.matchMin, max = form.elements.matchMax;
    const matchMin = min.value === '' ? 0 : Number(min.value), matchMax = max.value === '' ? 100 : Number(max.value);
    const invalid = !min.validity.valid ? min : !max.validity.valid ? max : matchMin > matchMax ? min : null;
    if (invalid) {
      $('staffCompetencyFilterError').textContent = matchMin > matchMax ? 'Minimum match must be on or below maximum match.' : 'Enter a match percentage between 0 and 100.';
      $('staffCompetencyFilterError').hidden = false;
      invalid.setAttribute('aria-invalid', 'true'); invalid.focus(); return;
    }
    state.filters = { keyword: form.elements.keyword.value.trim(), company: form.elements.company.value, branch: form.elements.branch.value,
      department: form.elements.department.value, job: form.elements.job.value, matchMin, matchMax };
    renderReport(); closeFilter(); main.scrollTop = 0;
  }

  function exportExcel() {
    window.PeopleHcmHighlightExport.downloadCsv('staff-competency.csv', [
      ['Emp No.', 'Name', 'Match %', 'Branch', 'Department', 'Position'],
      ...state.rows.map(record => [employeeId(record.empNo), display(record.name), match(record) ?? '', display(record.branch), display(record.department), display(record.position)]),
      [], ['Total Records', state.rows.length], ['Average Match %', average(state.rows) ?? ''], ['Current Filter', $('staffCompetencyFilterSummary').textContent]
    ]);
  }

  function loadUrlFilters() {
    state.filters = { ...defaults };
    const params = new URLSearchParams(location.search);
    Object.keys(defaults).forEach(key => {
      if (!params.has(key)) return;
      if (key === 'matchMin' || key === 'matchMax') {
        const value = Number(params.get(key));
        if (Number.isFinite(value) && value >= 0 && value <= 100) state.filters[key] = value;
      } else state.filters[key] = params.get(key).trim();
    });
    if (state.filters.matchMin > state.filters.matchMax) Object.assign(state.filters, { matchMin: 0, matchMax: 100 });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadUrlFilters();
    Object.entries(metadata).forEach(([key, field]) => {
      [...new Set(records.map(record => record[field]).filter(Boolean))].sort().forEach(value => form.elements[key].append(new Option(value, value)));
    });
    Object.entries(metrics).forEach(([value, label]) => $('staffCompetencyChartMetric').append(new Option(label, value)));
    $('staffCompetencyChartMetric').value = state.metric;
    $('staffCompetencyFilterTrigger').addEventListener('click', openFilter);
    $('staffCompetencyCloseFilter').addEventListener('click', closeFilter);
    $('staffCompetencyResetFilter').addEventListener('click', () => { form.reset(); clearError(); });
    form.addEventListener('submit', applyFilter); form.addEventListener('input', clearError);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeFilter(); });
    $('staffCompetencyViewChart').addEventListener('click', () => showView('chart'));
    $('staffCompetencyChartMetric').addEventListener('change', event => { state.metric = event.target.value; renderChart(); });
    $('staffCompetencyExportExcel').addEventListener('click', exportExcel);
    $('staffCompetencyExportPdf').addEventListener('click', () => { showView('report'); window.print(); });
    $('staffCompetencyBack').addEventListener('click', event => { if (state.view === 'chart') { event.preventDefault(); showView('report'); } });
    document.addEventListener('competency:tabchange', event => {
      if (!overlay.hidden) closeFilter();
      if (event.detail !== 'staff' && state.view === 'chart') showView('report');
      if (event.detail === 'staff') {
        loadUrlFilters(); renderReport();
        if (state.view === 'chart') renderChart();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!overlay.hidden) { event.preventDefault(); closeFilter(); }
        else if (state.view === 'chart') { event.preventDefault(); showView('report'); }
        return;
      }
      if (event.key !== 'Tab' || overlay.hidden) return;
      const controls = [...form.querySelectorAll('button, input, select')].filter(node => !node.disabled && node.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    });
    renderReport(); syncBack();
  });
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
