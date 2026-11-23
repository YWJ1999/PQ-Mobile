(() => {
  const $ = id => document.getElementById(id);
  const records = Array.isArray(window.PERFORMANCE_GOAL_SUMMARY_DATA) ? window.PERFORMANCE_GOAL_SUMMARY_DATA : [];
  const defaults = { keyword: '', company: '', branch: '', department: '', job: '', period: '', evaluationType: '', achievedMin: '', achievedMax: '' };
  const metrics = { goalType: 'Goal Type', company: 'Company', branch: 'Branch', department: 'Department', job: 'Job', period: 'Period', evaluationType: 'Evaluation Type' };
  const goalTypes = ['Financial', 'Customer', 'Process', 'Learning & Growth', 'People'];
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#f97316'];
  const state = { filters: { ...defaults }, rows: [], metric: 'goalType', employeeMetric: 'branch', selectedType: '', chartOrigin: 'report', view: 'report' };
  const form = $('goalSummaryFilterForm'), overlay = $('goalSummaryFilterOverlay'), phone = document.querySelector('.phone-container'), main = document.querySelector('main');
  let returnFocus = null, inerted = [];
  function node(tag, className, value) { const element = document.createElement(tag); if (className) element.className = className; if (value !== undefined) element.textContent = value; return element; }
  function display(value) { return value === '' || value == null ? '—' : String(value); }
  function achievement(record) { if (record.achievedPercent === '' || record.achievedPercent == null) return null; const value = Number(record.achievedPercent); return Number.isFinite(value) ? value : null; }
  function average(items) { const values = items.map(achievement).filter(value => value != null); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
  function percent(value) { return value == null ? '—' : `${value.toFixed(2)}%`; }
  function grouped(rows, key) { const groups = new Map(); rows.forEach(record => { const category = display(record[key]); if (!groups.has(category)) groups.set(category, []); groups.get(category).push(record); }); return [...groups]; }
  function goalTypeUrl(category) {
    const url = new URL(location.href); url.searchParams.set('goalType',category); url.searchParams.set('filters',JSON.stringify(state.filters)); url.searchParams.set('theme',document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); return url;
  }
  function syncUrl() {
    const url = new URL(location.href); url.searchParams.set('filters',JSON.stringify(state.filters));
    if (state.selectedType) url.searchParams.set('goalType',state.selectedType); else url.searchParams.delete('goalType');
    history.replaceState(null,'',url);
  }
  function filterRows() {
    const filters = state.filters, query = filters.keyword.trim().toLowerCase().replace(/^#/, '');
    return records.filter(record => {
      const text = [record.empNo, record.name, record.title, record.goalType, record.company, record.branch, record.department, record.job].join(' ').toLowerCase();
      const value = achievement(record), range = filters.achievedMin !== '' || filters.achievedMax !== '';
      return (!query || text.includes(query)) && ['company','branch','department','job','period','evaluationType'].every(key => !filters[key] || String(record[key] ?? '') === filters[key]) &&
        (!range || (value != null && (filters.achievedMin === '' || value >= Number(filters.achievedMin)) && (filters.achievedMax === '' || value <= Number(filters.achievedMax))));
    });
  }
  function renderReport() {
    state.rows = filterRows();
    const tbody = $('goalSummaryTable').tBodies[0]; tbody.replaceChildren();
    const groups = grouped(state.rows, 'goalType');
    const order = category => goalTypes.includes(category) ? goalTypes.indexOf(category) : goalTypes.length;
    groups.sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b));
    groups.forEach(([category, items]) => {
      const row = node('tr'), cell = node('td'), link = node('a','goal-summary-row-link',category);
      row.dataset.goalSummaryType = category; link.href = goalTypeUrl(category).href; link.setAttribute('aria-label',`View ${category} goals by employee`); cell.append(link);
      row.append(cell,node('td','',String(items.length)),node('td','',percent(average(items))));
      row.addEventListener('click',event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return; event.preventDefault(); openEmployees(category); });
      link.addEventListener('keydown',event => { if (event.key === ' ') { event.preventDefault(); openEmployees(category); } }); tbody.append(row);
    });
    if (!groups.length) { const cell = tbody.insertRow().insertCell(); cell.colSpan = 3; cell.className = 'attendance-report-empty'; cell.textContent = 'No goals match the current filter.'; }
    $('goalSummaryTotalRecords').textContent = String(state.rows.length);
    const filters = state.filters, parts = [filters.keyword, filters.company, filters.branch, filters.department, filters.job, filters.period || 'All Periods', filters.evaluationType];
    if (filters.achievedMin !== '' || filters.achievedMax !== '') parts.push(`${filters.achievedMin === '' ? 'Any Min' : filters.achievedMin}–${filters.achievedMax === '' ? 'Any Max' : filters.achievedMax}%`);
    $('goalSummaryFilterSummary').textContent = parts.filter(Boolean).join(' · ');
  }
  function employeeRows() { return state.rows.filter(record => display(record.goalType) === state.selectedType); }
  function cvUrl(record) {
    const url = new URL('../../../me.html',location.href); url.searchParams.set('employee',String(record.empNo ?? '').replace(/^#+/,'')); url.searchParams.set('theme',document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); return url.href;
  }
  function renderEmployeeCards() {
    const rows = employeeRows(), cards = $('goalSummaryEmployeeCards'); cards.replaceChildren();
    $('goalSummaryEmployeeType').textContent = ''; $('goalSummaryEmployeeType').hidden = true; $('goalSummaryEmployeeCount').textContent = String(rows.length);
    rows.forEach(record => {
      const empNo = String(record.empNo ?? '').replace(/^#+/,'');
      const card = node(empNo ? 'a' : 'article','history-card-item goal-summary-employee-card');
      const achieved = achievement(record), statusTone = achieved === 100 ? 'approved' : 'draft';
      card.dataset.status = statusTone;
      if (empNo) {
        card.href = cvUrl(record);
        card.dataset.goalCv = record.id || '';
        card.setAttribute('aria-label','Open CV for ' + display(record.name) + ', #' + empNo);
      }
      const header = node('span','history-card-header goal-summary-employee-header');
      const heading = node('span','history-card-heading goal-summary-employee-identity');
      heading.append(
        node('strong','history-card-title goal-summary-employee-name',display(record.name)),
        node('span','history-card-ref goal-summary-employee-id',empNo ? '#' + empNo : '—')
      );
      const status = node('span','status-pill ' + statusTone + ' goal-summary-achieved-pill',percent(achieved));
      status.dataset.recordKeyLabel = achieved == null ? 'No achievement reported' : achieved === 100 ? '100% achieved' : 'Below 100% achieved';
      header.append(heading,status);

      const details = node('dl','history-card-details goal-summary-employee-details');
      [['Department',record.department],['Job',record.job],['Period',record.period],['Goal',record.title]].forEach(([label,value]) => {
        const field = node('div','goal-summary-employee-detail');
        field.append(node('dt','',label),node('dd','',display(value)));
        details.append(field);
      });
      card.append(header,details);
      cards.append(card);
    });
  }  function openEmployees(category) { state.selectedType = category; syncUrl(); showView('employees'); }
  function clearError() { $('goalSummaryFilterError').hidden = true; $('goalSummaryFilterError').textContent = ''; form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid')); }
  function fillForm(values) { Object.entries(values).forEach(([key,value]) => { form.elements.namedItem(key).value = value; }); clearError(); }
  function openFilter() {
    fillForm(state.filters); returnFocus = document.activeElement; overlay.hidden = false; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden','false');
    inerted = [...phone.children].filter(element => element !== overlay && !element.inert); inerted.forEach(element => { element.inert = true; }); $('goalSummaryKeyword').focus();
  }
  function closeFilter() {
    overlay.hidden = true; overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden','true'); inerted.forEach(element => { element.inert = false; }); inerted = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); returnFocus = null;
  }
  function applyFilter(event) {
    event.preventDefault(); clearError();
    const min = $('goalSummaryAchievedMin'), max = $('goalSummaryAchievedMax');
    const reversed = min.value !== '' && max.value !== '' && Number(min.value) > Number(max.value);
    const invalid = !min.validity.valid ? min : !max.validity.valid ? max : reversed ? min : null;
    if (invalid) { $('goalSummaryFilterError').textContent = reversed ? 'Minimum achievement must be on or below maximum achievement.' : 'Enter an achieved percentage between 0 and 100.'; $('goalSummaryFilterError').hidden = false; invalid.setAttribute('aria-invalid','true'); invalid.focus(); return; }
    state.filters = Object.fromEntries(Object.keys(defaults).map(key => [key, form.elements.namedItem(key).value.trim()])); renderReport(); syncUrl(); closeFilter(); main.scrollTop = 0;
  }
  function renderChart() {
    const metric = state.chartOrigin === 'employees' ? state.employeeMetric : state.metric;
    const rows = state.chartOrigin === 'employees' ? employeeRows() : state.rows;
    const label = metrics[metric], total = rows.length;
    $('goalSummaryChartTitle').textContent = `Goals by ${label.toLowerCase()}`; $('goalSummaryChartColumn').textContent = label; $('goalSummaryChartTotal').textContent = String(total);
    $('goalSummaryChartNote').textContent = total ? 'Slices show goal counts; achievement is the average of available goal percentages.' : 'No goals match the current filter.';
    $('goalSummaryChartDonut').setAttribute('aria-label', `${total} goals by ${label.toLowerCase()}`);
    const segments = $('goalSummaryChartSegments'), legend = $('goalSummaryChartLegend'); segments.replaceChildren(); legend.replaceChildren();
    const circumference = 2 * Math.PI * 70; let offset = 0;
    grouped(rows, metric).sort((a,b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).forEach(([category,items],index) => {
      const fraction = items.length / total, color = colors[index % colors.length];
      const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      Object.entries({ cx:90, cy:90, r:70, fill:'none', stroke:color, 'stroke-width':22, 'stroke-dasharray':`${fraction*circumference} ${circumference}`, 'stroke-dashoffset':-offset }).forEach(([key,value]) => circle.setAttribute(key,value));
      const title = document.createElementNS('http://www.w3.org/2000/svg','title'); title.textContent = `${category}: ${items.length} goals (${(fraction*100).toFixed(1)}%), ${percent(average(items))} achieved`; circle.append(title); segments.append(circle); offset += fraction*circumference;
      const row = node('div','attendance-report-legend-row'), categoryLabel = node('span','attendance-report-legend-label'), dot = node('i','attendance-report-dot');
      row.dataset.category = category; row.dataset.count = String(items.length); row.dataset.achieved = percent(average(items)); dot.style.background = color; dot.setAttribute('aria-hidden','true');
      categoryLabel.append(dot,node('span','',category)); row.append(categoryLabel,node('span','',String(items.length)),node('span','',percent(average(items)))); legend.append(row);
    });
  }
  function showView(view) {
    if (view === 'chart') state.chartOrigin = state.view === 'employees' ? 'employees' : 'report';
    const previousType = state.selectedType;
    if (view === 'report') { state.selectedType = ''; syncUrl(); }
    state.view = view; $('goalSummaryReportView').hidden = view !== 'report'; $('goalSummaryEmployeeView').hidden = view !== 'employees'; $('goalSummaryChartView').hidden = view !== 'chart';
    $('goalSummaryTitle').textContent = view === 'chart' ? 'Goal Summary Analysis' : view === 'employees' ? 'Goal Summary Details' : 'Goal Summary'; $('goalSummaryBack').setAttribute('aria-label', view === 'chart' || view === 'employees' ? 'Back to Goal Summary' : 'Back to Performance'); main.scrollTop = 0;
    if (view === 'chart') { $('goalSummaryChartMetric').value = state.chartOrigin === 'employees' ? state.employeeMetric : state.metric; renderChart(); $('goalSummaryChartMetric').focus({ preventScroll: true }); }
    else if (view === 'employees') { renderEmployeeCards(); $('goalSummaryEmployeeViewChart').focus({ preventScroll: true }); }
    else { const rowLink = [...document.querySelectorAll('[data-goal-summary-type]')].find(row => row.dataset.goalSummaryType === previousType)?.querySelector('a'); (rowLink || $('goalSummaryViewChart')).focus({ preventScroll: true }); }
  }
  function backView() { showView(state.view === 'chart' ? state.chartOrigin : 'report'); }
  function syncBack() {
    $('goalSummaryBack').href = `../index.html?scope=team&theme=${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`;
    document.querySelectorAll('[data-goal-summary-type]').forEach(row => { row.querySelector('a').href = goalTypeUrl(row.dataset.goalSummaryType).href; });
    document.querySelectorAll('[data-goal-cv]').forEach(card => { const url = new URL(card.href); url.searchParams.set('theme',document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); card.href = url.href; });
  }
  const selects = { company:'goalSummaryCompany', branch:'goalSummaryBranch', department:'goalSummaryDepartment', job:'goalSummaryJob', period:'goalSummaryPeriod', evaluationType:'goalSummaryEvaluationType' };
  for (const [key,id] of Object.entries(selects)) {
    const values = [...new Set(records.map(record => record[key]).filter(value => value != null && value !== '').map(String))].sort(); if (key === 'period') values.reverse();
    values.forEach(value => $(id).add(new Option(value,value)));
  }
  Object.entries(metrics).forEach(([key,label]) => $('goalSummaryChartMetric').add(new Option(label,key)));
  $('goalSummaryFilterTrigger').addEventListener('click',openFilter); $('goalSummaryCloseFilter').addEventListener('click',closeFilter);
  $('goalSummaryResetFilter').addEventListener('click',() => { state.filters = { ...defaults }; fillForm(defaults); renderReport(); syncUrl(); }); form.addEventListener('submit',applyFilter);
  overlay.addEventListener('click',event => { if (event.target === overlay) closeFilter(); });
  $('goalSummaryViewChart').addEventListener('click',() => showView('chart')); $('goalSummaryEmployeeViewChart').addEventListener('click',() => showView('chart'));
  $('goalSummaryChartMetric').addEventListener('change',event => { if (state.chartOrigin === 'employees') state.employeeMetric = event.target.value; else state.metric = event.target.value; renderChart(); });
  $('goalSummaryBack').addEventListener('click',event => { if (state.view !== 'report') { event.preventDefault(); backView(); } });
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape') { if (!overlay.hidden) { event.preventDefault(); closeFilter(); } else if (state.view !== 'report') { event.preventDefault(); backView(); } return; }
    if (event.key !== 'Tab' || overlay.hidden) return;
    const controls = [...overlay.querySelectorAll('button,input,select')].filter(element => !element.disabled && element.getClientRects().length), first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  const params = new URLSearchParams(location.search);
  try {
    const saved = JSON.parse(params.get('filters') || 'null');
    if (saved && typeof saved === 'object') for (const key of Object.keys(defaults)) if (typeof saved[key] === 'string') state.filters[key] = saved[key].trim();
    const { achievedMin:min, achievedMax:max } = state.filters;
    if ([min,max].some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) || (min !== '' && max !== '' && Number(min) > Number(max))) { state.filters.achievedMin = ''; state.filters.achievedMax = ''; }
  } catch { /* Malformed saved filters fall back to the normal report. */ }
  new MutationObserver(syncBack).observe(document.documentElement,{ attributes:true, attributeFilter:['data-theme'] }); syncBack(); fillForm(state.filters); renderReport();
  const selectedType = params.get('goalType'); if (selectedType && state.rows.some(record => display(record.goalType) === selectedType)) openEmployees(selectedType);
})();
