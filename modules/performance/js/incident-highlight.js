(() => {
  const $ = id => document.getElementById(id);
  const records = Array.isArray(window.PERFORMANCE_INCIDENT_HIGHLIGHT_DATA) ? window.PERFORMANCE_INCIDENT_HIGHLIGHT_DATA : [];
  const defaults = { keyword: '', startDate: '', endDate: '', company: '', branch: '', department: '', incidentType: '', meritType: '', pointMin: '', pointMax: '' };
  const metrics = { incidentType: 'Incident Type', incidentAction: 'Incident Action', meritType: 'Merit Type', company: 'Company', branch: 'Branch', department: 'Department', position: 'Position' };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#f97316'];
  const state = { filters: { ...defaults }, employees: [], metric: 'incidentType', view: 'report' };
  const main = document.querySelector('main'), phone = document.querySelector('.phone-container'), form = $('incidentHighlightFilterForm');
  let activeOverlay = null, returnFocus = null, inerted = [];

  function node(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
  function display(value) { return value === '' || value == null ? '—' : String(value); }
  function numeric(value) { if (value === '' || value == null) return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
  function numberText(value) { return value == null ? '—' : String(Number(Number(value).toFixed(2))); }
  function employeeId(value) { const id = String(value ?? '').replace(/^#+/, ''); return id ? `#${id}` : '—'; }
  function meritKey(record) { return record.merit === true ? 'merit' : record.merit === false ? 'demerit' : ''; }
  function meritLabel(record) { const key = meritKey(record); return key === 'merit' ? 'Merit' : key === 'demerit' ? 'Demerit' : '—'; }
  function sumPoints(items) { const points = items.map(record => numeric(record.point)).filter(value => value != null); return points.length ? points.reduce((sum, value) => sum + value, 0) : null; }
  function totalPoints(items) { return items.length ? sumPoints(items) : 0; }
  function dateText(value, withTime = false) {
    const text = String(value || ''), datePart = /^\d{4}-\d{2}-\d{2}/.exec(text)?.[0];
    if (!datePart) return display(value);
    const date = new Date(`${datePart}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return display(value);
    const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
    const time = withTime ? /T(\d{2}:\d{2})/.exec(text)?.[1] : '';
    return time ? `${formatted} ${time}` : formatted;
  }

  function filteredEmployees() {
    const filters = state.filters, query = filters.keyword.toLowerCase().replace(/^#/, '');
    const groups = new Map();
    records.filter(record => {
      const text = [record.empNo, record.name, record.company, record.branch, record.department, record.position].join(' ').toLowerCase();
      const date = String(record.incidentDate || '').slice(0, 10);
      return (!query || text.includes(query)) && (!(filters.startDate || filters.endDate) || (date && (!filters.startDate || date >= filters.startDate) && (!filters.endDate || date <= filters.endDate))) &&
        ['company', 'branch', 'department', 'incidentType'].every(key => !filters[key] || record[key] === filters[key]) &&
        (!filters.meritType || meritKey(record) === filters.meritType);
    }).forEach(record => {
      const empNo = String(record.empNo ?? '').replace(/^#+/, ''), key = empNo || `name:${record.name}`;
      if (!groups.has(key)) groups.set(key, { empNo, name: record.name, branch: record.branch, department: record.department, position: record.position, incidents: [] });
      groups.get(key).incidents.push(record);
    });
    return [...groups.values()].map(employee => ({ ...employee, total: sumPoints(employee.incidents) }))
      .filter(employee => (filters.pointMin === '' && filters.pointMax === '') || (employee.total != null && (filters.pointMin === '' || employee.total >= Number(filters.pointMin)) && (filters.pointMax === '' || employee.total <= Number(filters.pointMax))))
      .sort((a, b) => a.empNo.localeCompare(b.empNo) || String(a.name).localeCompare(String(b.name)));
  }

  function visibleIncidents() { return state.employees.flatMap(employee => employee.incidents); }
  function renderReport() {
    state.employees = filteredEmployees();
    const tbody = $('incidentHighlightTable').tBodies[0]; tbody.replaceChildren();
    state.employees.forEach(employee => {
      const row = node('tr'), totalCell = node('td');
      const button = node('button', 'performance-highlight-score', numberText(employee.total));
      button.type = 'button'; button.dataset.incidentEmployee = employee.empNo;
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'incidentHighlightDetailsOverlay');
      button.setAttribute('aria-label', `View ${display(employee.name)} incident details, ${numberText(employee.total)} points`);
      button.addEventListener('click', () => openDetails(employee, button)); totalCell.append(button);
      row.append(node('td', 'performance-highlight-employee-id', employeeId(employee.empNo)), node('td', 'attendance-report-name', display(employee.name)), totalCell, ...['branch', 'department', 'position'].map(key => node('td', '', display(employee[key]))));
      tbody.append(row);
    });
    if (!state.employees.length) { const cell = tbody.insertRow().insertCell(); cell.colSpan = 6; cell.className = 'attendance-report-empty'; cell.textContent = 'No records match the current filter.'; }
    $('incidentHighlightTotalRecords').textContent = String(state.employees.length);
    $('incidentHighlightTotalPoints').textContent = numberText(totalPoints(visibleIncidents()));
    const filters = state.filters;
    const range = filters.startDate || filters.endDate ? `${filters.startDate ? dateText(filters.startDate) : 'Any Start Date'} – ${filters.endDate ? dateText(filters.endDate) : 'Any End Date'}` : 'All Dates';
    const parts = [filters.keyword, range, filters.company, filters.branch, filters.department, filters.incidentType, filters.meritType === 'merit' ? 'Merit' : filters.meritType === 'demerit' ? 'Demerit' : ''];
    if (filters.pointMin !== '' || filters.pointMax !== '') parts.push(`${filters.pointMin === '' ? 'Any Min' : filters.pointMin}–${filters.pointMax === '' ? 'Any Max' : filters.pointMax} points`);
    $('incidentHighlightFilterSummary').textContent = parts.filter(Boolean).join(' · ');
  }

  function openOverlay(overlay, target, trigger = document.activeElement) {
    activeOverlay = overlay; returnFocus = trigger; overlay.hidden = false;
    overlay.classList.toggle('is-open', overlay.classList.contains('standard-filter-sheet')); overlay.setAttribute('aria-hidden', 'false');
    inerted = [...phone.children].filter(element => element !== overlay && !element.inert);
    inerted.forEach(element => { element.inert = true; }); target.focus({ preventScroll: true });
  }
  function closeOverlay() {
    if (!activeOverlay) return;
    activeOverlay.hidden = true; activeOverlay.classList.remove('is-open'); activeOverlay.setAttribute('aria-hidden', 'true'); activeOverlay = null;
    inerted.forEach(element => { element.inert = false; }); inerted = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); returnFocus = null;
  }
  function safeAttachmentUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, location.href), assets = new URL('../../../assets/', location.href);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      if (location.protocol === 'file:' && url.protocol === 'file:' && url.pathname.startsWith(assets.pathname)) return url.href;
    } catch { /* Missing/unavailable attachment links remain plain text. */ }
    return null;
  }
  function attachmentList(record) {
    const files = Array.isArray(record.attachments) ? record.attachments : [];
    const list = node('span', 'incident-highlight-attachments');
    if (!files.length) { list.textContent = 'No attachments'; return list; }
    files.forEach(file => {
      const name = typeof file === 'string' ? file : file.name || 'Attachment';
      const href = typeof file === 'string' ? null : safeAttachmentUrl(file.href ?? file.url);
      const item = node(href ? 'a' : 'span', 'incident-highlight-attachment');
      if (href) { item.href = href; item.download = name; item.target = '_blank'; item.rel = 'noopener noreferrer'; item.setAttribute('aria-label', `Download attachment ${name}`); }
      const icon = node('i', 'fa-solid fa-paperclip'); icon.setAttribute('aria-hidden', 'true');
      item.append(icon, node('span', '', name)); list.append(item);
    });
    return list;
  }
  function openDetails(employee, trigger) {
    $('incidentHighlightDetailName').textContent = display(employee.name);
    const list = $('incidentHighlightDetailsList'); list.replaceChildren();
    [...employee.incidents].sort((a, b) => String(b.incidentDate).localeCompare(String(a.incidentDate)) || String(b.createdDate).localeCompare(String(a.createdDate))).forEach(record => {
      const wrapper = node('div', 'incident-highlight-detail-record'), table = node('table', 'detail-popout-table'), tbody = node('tbody');
      table.dataset.incidentReference = record.reference || ''; table.setAttribute('aria-label', `Incident details ${display(record.reference)}`);
      const fields = [['Employee #', employeeId(record.empNo)], ['Name', record.name], ['Incident Date', dateText(record.incidentDate)], ['Created Date', dateText(record.createdDate, true)],
        ['Incident Type', record.incidentType], ['Incident Action', record.incidentAction], ['Measure Value', record.measureValue],
        ['Merit', record.merit === true ? 'Yes' : record.merit === false ? 'No' : null], ['Remarks', record.remarks], ['Attachment', attachmentList(record)]];
      fields.forEach(([label, value]) => {
        const row = node('tr'), heading = node('th', 'detail-popout-label', label), cell = node('td', 'detail-popout-value');
        heading.scope = 'row'; if (value instanceof Node) cell.append(value); else cell.textContent = display(value);
        row.append(heading, cell); tbody.append(row);
      });
      table.append(tbody); wrapper.append(table); list.append(wrapper);
    });
    const overlay = $('incidentHighlightDetailsOverlay'); overlay.querySelector('.detail-popout-body').scrollTop = 0;
    openOverlay(overlay, $('incidentHighlightCloseDetails'), trigger);
  }

  function clearError() { $('incidentHighlightFilterError').hidden = true; $('incidentHighlightFilterError').textContent = ''; form.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid')); }
  function fillFilter(values) { Object.entries(values).forEach(([key, value]) => { form.elements.namedItem(key).value = value; }); clearError(); }
  function applyFilter(event) {
    event.preventDefault(); clearError();
    const start = $('incidentHighlightStartDate'), end = $('incidentHighlightEndDate'), min = $('incidentHighlightPointMin'), max = $('incidentHighlightPointMax');
    const invalidDateRange = start.value && end.value && start.value > end.value;
    const invalidPointRange = min.value !== '' && max.value !== '' && Number(min.value) > Number(max.value);
    const invalidField = [start, end, min, max].find(field => !field.validity.valid) || (invalidDateRange ? end : invalidPointRange ? min : null);
    if (invalidField) {
      $('incidentHighlightFilterError').textContent = invalidDateRange ? 'End Date must be on or after Start Date.' : invalidPointRange ? 'Minimum points must be on or below maximum points.' : 'Enter a valid date or point value.';
      $('incidentHighlightFilterError').hidden = false; invalidField.setAttribute('aria-invalid', 'true'); invalidField.focus(); return;
    }
    state.filters = Object.fromEntries(Object.keys(defaults).map(key => [key, form.elements.namedItem(key).value.trim()]));
    renderReport(); closeOverlay(); main.scrollTop = 0;
  }

  function renderChart() {
    const incidents = visibleIncidents(), groups = new Map();
    incidents.forEach(record => { const key = state.metric === 'meritType' ? meritLabel(record) : display(record[state.metric]); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record); });
    $('incidentHighlightChartTitle').textContent = `Incidents by ${metrics[state.metric].toLowerCase()}`;
    $('incidentHighlightChartColumn').textContent = metrics[state.metric];
    $('incidentHighlightChartTotal').textContent = numberText(totalPoints(incidents));
    $('incidentHighlightChartNote').textContent = incidents.length ? 'Slices show incident counts; points keep their positive or negative values.' : 'No incidents match the current filter.';
    $('incidentHighlightChartDonut').setAttribute('aria-label', `${incidents.length} incidents by ${metrics[state.metric].toLowerCase()}, ${numberText(totalPoints(incidents))} total points`);
    const segments = $('incidentHighlightChartSegments'), legend = $('incidentHighlightChartLegend'); segments.replaceChildren(); legend.replaceChildren();
    const circumference = 2 * Math.PI * 70; let offset = 0;
    [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).forEach(([category, items], index) => {
      const fraction = items.length / incidents.length, color = colors[index % colors.length];
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); title.textContent = `${category}: ${items.length} incidents, ${numberText(sumPoints(items))} points`; circle.append(title); segments.append(circle); offset += fraction * circumference;
      const row = node('div', 'attendance-report-legend-row'), label = node('span', 'attendance-report-legend-label'), dot = node('i', 'attendance-report-dot');
      row.dataset.category = category; row.dataset.incidents = String(items.length); row.dataset.points = numberText(sumPoints(items));
      dot.style.background = color; dot.setAttribute('aria-hidden', 'true'); label.append(dot, node('span', '', category));
      row.append(label, node('span', '', numberText(sumPoints(items))), node('span', '', `${(fraction * 100).toFixed(1)}%`)); legend.append(row);
    });
  }
  function showView(view) {
    state.view = view; $('incidentHighlightReportView').hidden = view !== 'report'; $('incidentHighlightChartView').hidden = view !== 'chart';
    $('incidentHighlightTitle').textContent = view === 'chart' ? 'Incident Highlight Analysis' : 'Incident Highlight'; main.scrollTop = 0;
    $('incidentHighlightBack').setAttribute('aria-label', view === 'chart' ? 'Back to Incident Highlight' : 'Back to Performance');
    if (view === 'chart') { renderChart(); $('incidentHighlightChartMetric').focus({ preventScroll: true }); } else $('incidentHighlightViewChart').focus({ preventScroll: true });
  }
  function syncBack() { $('incidentHighlightBack').href = `../index.html?scope=team&theme=${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`; }

  for (const [key, id] of Object.entries({ company: 'incidentHighlightCompany', branch: 'incidentHighlightBranch', department: 'incidentHighlightDepartment', incidentType: 'incidentHighlightIncidentType' })) {
    [...new Set(records.map(record => record[key]).filter(value => value !== '' && value != null).map(String))].sort().forEach(value => $(id).add(new Option(value, value)));
  }
  Object.entries(metrics).forEach(([key, label]) => $('incidentHighlightChartMetric').add(new Option(label, key)));
  $('incidentHighlightFilterTrigger').addEventListener('click', () => { fillFilter(state.filters); openOverlay($('incidentHighlightFilterOverlay'), $('incidentHighlightKeyword')); });
  $('incidentHighlightResetFilter').addEventListener('click', () => { state.filters = { ...defaults }; fillFilter(defaults); renderReport(); });
  $('incidentHighlightCloseFilter').addEventListener('click', closeOverlay); $('incidentHighlightCloseDetails').addEventListener('click', closeOverlay); form.addEventListener('submit', applyFilter);
  for (const id of ['incidentHighlightFilterOverlay', 'incidentHighlightDetailsOverlay']) $(id).addEventListener('click', event => { if (event.target === event.currentTarget) closeOverlay(); });
  $('incidentHighlightViewChart').addEventListener('click', () => showView('chart'));
  $('incidentHighlightExportPdf').addEventListener('click', () => window.print());
  $('incidentHighlightExportExcel').addEventListener('click', () => {
    window.PeopleHcmHighlightExport.downloadCsv('incident-highlight.csv', [
      ['Emp #', 'Name', 'Total', 'Branch', 'Department', 'Position'],
      ...state.employees.map(employee => [employeeId(employee.empNo), employee.name, employee.total, employee.branch, employee.department, employee.position]),
      ['Total Records', state.employees.length, '', '', '', ''],
      ['Total Points', '', totalPoints(visibleIncidents()), '', '', ''],
      ['Current Filter', $('incidentHighlightFilterSummary').textContent, '', '', '', '']
    ]);
  });
  $('incidentHighlightChartMetric').addEventListener('change', event => { state.metric = event.target.value; renderChart(); });
  $('incidentHighlightBack').addEventListener('click', event => { if (state.view === 'chart') { event.preventDefault(); showView('report'); } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (activeOverlay) { event.preventDefault(); closeOverlay(); } else if (state.view === 'chart') { event.preventDefault(); showView('report'); } return; }
    if (event.key !== 'Tab' || !activeOverlay) return;
    const controls = [...activeOverlay.querySelectorAll('button,input,select,a[href]')].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); syncBack(); fillFilter(defaults); renderReport();
})();
