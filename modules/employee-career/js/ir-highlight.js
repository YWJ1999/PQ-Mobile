(() => {
  const $ = id => document.getElementById(id);
  const records = Array.isArray(window.EMPLOYEE_CAREER_IR_CASE_DATA) ? window.EMPLOYEE_CAREER_IR_CASE_DATA : [];
  const defaults = { keyword: '', startDate: '2026-01-01', endDate: '2026-10-13', offence: '', action: '', casesMin: 0, casesMax: 99 };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#f97316'];
  const metrics = { offence: 'Offence type', action: 'Action type' };
  const state = { filters: { ...defaults }, employees: [], metric: 'offence', analysisMetric: 'offence', analysis: null, view: 'report' };
  const form = $('irHighlightFilterForm');
  const filterOverlay = $('irHighlightFilterOverlay');
  const detailsOverlay = $('irHighlightDetailsOverlay');
  const main = document.querySelector('main');
  const phone = document.querySelector('.phone-container');
  const background = [...phone.children].filter(node => node !== filterOverlay && node !== detailsOverlay);

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function optionValues(key) {
    return [...new Set(records.map(record => record[key]))].sort((a, b) => a.localeCompare(b));
  }

  function populateSelect(id, label, values) {
    const select = $(id);
    select.replaceChildren(new Option(`All ${label}s`, ''));
    values.forEach(value => select.add(new Option(value, value)));
  }

  function groupCases(filteredCases) {
    const employees = new Map();
    filteredCases.forEach(record => {
      const employee = employees.get(record.empNo) || { empNo: record.empNo, name: record.name, cases: [] };
      employee.cases.push(record);
      employees.set(record.empNo, employee);
    });
    return [...employees.values()]
      .filter(employee => employee.cases.length >= state.filters.casesMin && employee.cases.length <= state.filters.casesMax)
      .sort((a, b) => a.empNo.localeCompare(b.empNo));
  }

  function applyRows() {
    const keyword = state.filters.keyword.toLowerCase().replace(/^#/, '');
    const filteredCases = records.filter(record => (
      (!keyword || `${record.empNo} ${record.name}`.toLowerCase().includes(keyword))
      && record.date >= state.filters.startDate
      && record.date <= state.filters.endDate
      && (!state.filters.offence || record.offence === state.filters.offence)
      && (!state.filters.action || record.action === state.filters.action)
    ));
    state.employees = groupCases(filteredCases);
  }

  function renderTable() {
    const tbody = $('irHighlightTable').tBodies[0];
    tbody.replaceChildren();
    state.employees.forEach(employee => {
      const row = node('tr');
      row.append(node('td', 'ir-highlight-employee-id', `#${employee.empNo}`), node('td', 'ir-highlight-name', employee.name));
      const casesCell = node('td');
      const button = node('button', 'ir-highlight-cases-button', String(employee.cases.length));
      button.type = 'button';
      button.setAttribute('aria-label', `View ${employee.name} IR cases`);
      button.addEventListener('click', () => openDetails(employee));
      casesCell.append(button);
      row.append(casesCell);
      tbody.append(row);
    });
    const totalCases = state.employees.reduce((sum, employee) => sum + employee.cases.length, 0);
    $('irHighlightTotalRecords').textContent = String(state.employees.length);
    $('irHighlightTotalCases').textContent = String(totalCases);
    $('irHighlightEmpty').hidden = state.employees.length > 0;
  }

  function renderSummary() {
    const parts = [];
    if (state.filters.keyword) parts.push(state.filters.keyword);
    if (state.filters.offence) parts.push(state.filters.offence);
    if (state.filters.action) parts.push(state.filters.action);
    parts.push(`${formatDate(state.filters.startDate)} - ${formatDate(state.filters.endDate)}`);
    if (state.filters.casesMin !== defaults.casesMin || state.filters.casesMax !== defaults.casesMax) parts.push(`${state.filters.casesMin}-${state.filters.casesMax} cases`);
    $('irHighlightFilterSummary').textContent = parts.join(' · ');
  }

  function filteredCases() {
    return state.employees.flatMap(employee => employee.cases);
  }

  function renderBreakdown(prefix, cases, metric, subtitle) {
    const label = metrics[metric];
    const grouped = new Map();
    cases.forEach(record => grouped.set(record[metric], (grouped.get(record[metric]) || 0) + 1));
    const groups = [...grouped].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = groups.reduce((sum, [, count]) => sum + count, 0);
    $(`${prefix}Title`).textContent = `Cases by ${label.toLowerCase()}`;
    $(`${prefix}Subtitle`).textContent = subtitle;
    $(`${prefix}Column`).textContent = label;
    $(`${prefix}Total`).textContent = String(total);
    $(`${prefix}Note`).textContent = total ? 'Based on the selected period' : 'No IR cases match the selected period.';
    $(`${prefix}Donut`).setAttribute('aria-label', `${total} IR cases by ${label.toLowerCase()}`);
    $(`${prefix}Segments`).replaceChildren();
    $(`${prefix}Legend`).replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    groups.forEach(([name, count], index) => {
      const fraction = total ? count / total : 0;
      const color = colors[index % colors.length];
      if (fraction) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${name}: ${count} (${(fraction * 100).toFixed(1)}%)`;
        circle.append(title);
        $(`${prefix}Segments`).append(circle);
        offset += fraction * circumference;
      }
      const row = node('div', 'attendance-report-legend-row');
      row.dataset.count = String(count);
      const category = node('span', 'attendance-report-legend-label');
      const dot = node('i', 'attendance-report-dot');
      dot.style.background = color;
      dot.setAttribute('aria-hidden', 'true');
      category.append(dot, node('span', '', name));
      row.append(category, node('span', '', String(count)), node('span', '', `${(fraction * 100).toFixed(1)}%`));
      $(`${prefix}Legend`).append(row);
    });
  }

  function renderChart() {
    renderBreakdown('irHighlightChart', filteredCases(), state.metric, 'Share of filtered IR cases');
  }

  function monthText(month) {
    return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  function selectedRange() {
    return `${formatDate(state.filters.startDate)} - ${formatDate(state.filters.endDate)}`;
  }

  function renderTrend() {
    const cases = filteredCases();
    const months = new Map();
    cases.forEach(record => {
      const month = record.date.slice(0, 7);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(record);
    });
    const maximum = Math.max(0, ...[...months.values()].map(items => items.length));
    $('irHighlightTrendRange').textContent = selectedRange();
    $('irHighlightTrendTotal').textContent = String(cases.length);
    $('irHighlightTrendTotalCard').disabled = cases.length === 0;
    const container = $('irHighlightTrendBars');
    container.replaceChildren();
    [...months].sort(([a], [b]) => a.localeCompare(b)).forEach(([month, items]) => {
      const button = node('button', 'ir-highlight-trend-bar');
      button.type = 'button';
      button.dataset.irTrendMonth = month;
      button.dataset.count = String(items.length);
      button.setAttribute('aria-label', `View ${monthText(month)}, ${items.length} cases analysis`);
      const track = node('span', 'ir-highlight-trend-track');
      const fill = node('span', 'ir-highlight-trend-fill');
      fill.style.width = `${maximum ? items.length / maximum * 100 : 0}%`;
      track.append(fill);
      button.append(node('span', 'ir-highlight-trend-month', monthText(month)), track, node('span', 'ir-highlight-trend-value', String(items.length)));
      button.addEventListener('click', () => openAnalysis(items, monthText(month)));
      container.append(button);
    });
    if (!months.size) container.append(node('p', 'ir-highlight-empty', 'No dated IR cases match the current filter.'));
  }

  function renderAnalysis() {
    if (!state.analysis) return;
    const { cases, period } = state.analysis;
    renderBreakdown('irHighlightAnalysis', cases, state.analysisMetric, `${period} - ${cases.length} cases`);
  }

  function openAnalysis(cases, period) {
    state.analysis = { cases: [...cases], period };
    state.analysisMetric = 'offence';
    $('irHighlightAnalysisMetric').value = state.analysisMetric;
    showView('analysis');
  }

  function render() {
    applyRows();
    renderTable();
    renderSummary();
    renderChart();
    renderTrend();
    renderAnalysis();
  }

  function setBackgroundInert(value) {
    background.forEach(element => { element.inert = value; });
  }

  function openFilter() {
    fillForm(state.filters);
    clearError();
    filterOverlay.hidden = false;
    setBackgroundInert(true);
    $('irHighlightFilterKeyword').focus();
  }

  function closeFilter() {
    filterOverlay.hidden = true;
    setBackgroundInert(false);
    $('irHighlightFilterTrigger').focus({ preventScroll: true });
  }

  function openDetails(employee) {
    $('irHighlightDetailName').textContent = employee.name;
    const tbody = $('irHighlightDetailsTable').tBodies[0];
    tbody.replaceChildren();
    [...employee.cases].sort((a, b) => a.date.localeCompare(b.date)).forEach(record => {
      const row = node('tr');
      [formatDate(record.date), record.offence, record.action].forEach(value => row.append(node('td', '', value)));
      tbody.append(row);
    });
    detailsOverlay.hidden = false;
    setBackgroundInert(true);
    $('irHighlightCloseDetails').focus();
  }

  function closeDetails() {
    detailsOverlay.hidden = true;
    setBackgroundInert(false);
  }

  function fillForm(values) {
    Object.entries(values).forEach(([key, value]) => { form.elements.namedItem(key).value = String(value); });
  }

  function clearError() {
    $('irHighlightFilterError').hidden = true;
    $('irHighlightFilterError').textContent = '';
    [...form.querySelectorAll('[aria-invalid="true"]')].forEach(element => element.removeAttribute('aria-invalid'));
  }

  function validate(next) {
    clearError();
    let message = '';
    let fields = [];
    if (next.startDate > next.endDate) {
      message = 'Start date must be on or before end date.';
      fields = [$('irHighlightFilterStartDate'), $('irHighlightFilterEndDate')];
    } else if (next.casesMin < 0 || next.casesMax < 0 || next.casesMin > next.casesMax) {
      message = 'Minimum cases must be less than or equal to maximum cases.';
      fields = [$('irHighlightFilterCasesMin'), $('irHighlightFilterCasesMax')];
    }
    if (!message) return true;
    fields.forEach(field => field.setAttribute('aria-invalid', 'true'));
    $('irHighlightFilterError').textContent = message;
    $('irHighlightFilterError').hidden = false;
    fields[0].focus();
    return false;
  }

  function showView(view) {
    state.view = view;
    const views = { report: 'irHighlightReportView', chart: 'irHighlightChartView', trend: 'irHighlightTrendView', analysis: 'irHighlightAnalysisView' };
    Object.entries(views).forEach(([key, id]) => { $(id).hidden = key !== view; });
    const titles = { report: 'IR Highlight', chart: 'IR Highlight Analysis', trend: 'IR Highlight Trend Analysis', analysis: 'IR Highlight Analysis' };
    $('irHighlightTitle').textContent = titles[view];
    $('irHighlightBack').setAttribute('aria-label', view === 'report' ? 'Back to Employee and Career' : `Back from ${titles[view]}`);
    main.scrollTop = 0;
    if (view === 'chart') {
      renderChart();
      $('irHighlightChartMetric').focus({ preventScroll: true });
    } else if (view === 'trend') {
      renderTrend();
      $('irHighlightTrendTotalCard').focus({ preventScroll: true });
    } else if (view === 'analysis') {
      renderAnalysis();
      $('irHighlightAnalysisMetric').focus({ preventScroll: true });
    } else $('irHighlightViewChart').focus({ preventScroll: true });
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab') return;
    const controls = [...container.querySelectorAll('button, input, select')].filter(element => !element.disabled);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  populateSelect('irHighlightFilterOffenceType', 'Offence type', optionValues('offence'));
  populateSelect('irHighlightFilterActionType', 'Action type', optionValues('action'));
  fillForm(defaults);
  $('irHighlightFilterTrigger').addEventListener('click', openFilter);
  $('irHighlightCloseFilter').addEventListener('click', closeFilter);
  $('irHighlightResetFilter').addEventListener('click', () => { state.filters = { ...defaults }; fillForm(defaults); clearError(); render(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = {
      keyword: form.elements.keyword.value.trim(),
      startDate: form.elements.startDate.value,
      endDate: form.elements.endDate.value,
      offence: form.elements.offence.value,
      action: form.elements.action.value,
      casesMin: Number(form.elements.casesMin.value),
      casesMax: Number(form.elements.casesMax.value)
    };
    if (!validate(next)) return;
    state.filters = next;
    render();
    closeFilter();
    main.scrollTop = 0;
  });
  filterOverlay.addEventListener('click', event => { if (event.target === filterOverlay) closeFilter(); });
  filterOverlay.addEventListener('keydown', event => trapFocus(event, form));
  $('irHighlightCloseDetails').addEventListener('click', closeDetails);
  detailsOverlay.addEventListener('click', event => { if (event.target === detailsOverlay) closeDetails(); });
  detailsOverlay.addEventListener('keydown', event => trapFocus(event, detailsOverlay));
  $('irHighlightViewChart').addEventListener('click', () => showView('chart'));
  $('irHighlightChartMetric').addEventListener('change', event => { state.metric = event.target.value; renderChart(); });
  $('irHighlightViewTrend').addEventListener('click', () => showView('trend'));
  $('irHighlightTrendTotalCard').addEventListener('click', () => openAnalysis(filteredCases(), selectedRange()));
  $('irHighlightAnalysisMetric').addEventListener('change', event => { state.analysisMetric = event.target.value; renderAnalysis(); });
  $('irHighlightBack').addEventListener('click', event => {
    if (state.view === 'report') return;
    event.preventDefault();
    showView(state.view === 'analysis' ? 'trend' : state.view === 'trend' ? 'chart' : 'report');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!detailsOverlay.hidden) { event.preventDefault(); closeDetails(); }
    else if (!filterOverlay.hidden) { event.preventDefault(); closeFilter(); }
    else if (state.view !== 'report') {
      event.preventDefault();
      showView(state.view === 'analysis' ? 'trend' : state.view === 'trend' ? 'chart' : 'report');
    }
  });
  render();
})();
