/* Both highlight pages share Leave Highlight's report, details and chart flow. */
(() => {
  const kind = document.body.dataset.highlightKind;
  const source = window.ATTENDANCE_HOURS_HIGHLIGHTS[kind];
  if (!source) return;
  const tableBody = document.getElementById(kind + 'HighlightTableBody');
  const defaults = { keyword: '', department: 'all', costCenter: 'all', from: source.from, to: source.to, type: source.metric, min: 0, max: 99999999 };
  let applied = { ...defaults };
  let currentSection = 'report';
  let selectedAnalysis = { rows: [], period: '' };
  let expandedChart = false;
  let expandedAnalysis = false;
  let returnFocus = null;
  const colors = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fields = { keyword: 'filterKeyword', department: 'filterDepartment', costCenter: 'filterCostCenter', from: 'filterFromDate', to: 'filterToDate', type: 'filterHighlightType', min: 'filterRangeMin', max: 'filterRangeMax' };
  const hoursText = value => Number(value).toFixed(2);
  const sumHours = rows => rows.reduce((sum, row) => sum + Math.round(row.hours * 100), 0) / 100;
  const dateText = value => { const [year, month, day] = value.split('-'); return day + ' ' + monthNames[Number(month) - 1] + ' ' + year; };
  const monthText = value => { const [year, month] = value.split('-'); return monthNames[Number(month) - 1] + ' ' + year; };
  const selectedRange = () => dateText(applied.from) + ' – ' + dateText(applied.to);
  const includesCompletePeriod = () => applied.from <= source.from && applied.to >= source.to;

  function filteredEmployees() {
    const keyword = applied.keyword.toLowerCase();
    const completePeriod = includesCompletePeriod();
    return source.employees.map(employee => {
      const details = employee.details.filter(detail => detail.date >= applied.from && detail.date <= applied.to);
      return { ...employee, details, hours: completePeriod ? employee.hours : sumHours(details) };
    }).filter(employee => (!keyword || (employee.name + ' #' + employee.empNo).toLowerCase().includes(keyword))
      && (applied.department === 'all' || (employee.department || 'unspecified') === applied.department)
      && (applied.costCenter === 'all' || (employee.costCenter || 'unspecified') === applied.costCenter)
      && (completePeriod || employee.details.length > 0)
      && employee.hours >= applied.min && employee.hours <= applied.max);
  }

  function datedRecords() {
    return filteredEmployees().flatMap(employee => employee.details.map(detail => ({ ...detail, branch: employee.branch, empNo: employee.empNo })));
  }

  function textElement(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }

  function renderReport() {
    const employees = filteredEmployees();
    tableBody.replaceChildren();
    employees.forEach(employee => {
      const row = tableBody.insertRow();
      const idCell = row.insertCell();
      idCell.className = 'employee-id-cell';
      idCell.textContent = '#' + employee.empNo;
      const nameCell = row.insertCell();
      nameCell.className = 'attendance-report-name';
      nameCell.textContent = employee.name;
      const hoursCell = row.insertCell();
      hoursCell.className = 'hours-number';
      const button = textElement('button', 'hours-pill', hoursText(employee.hours));
      button.type = 'button';
      button.dataset.highlightHours = employee.empNo;
      button.setAttribute('aria-label', 'View ' + employee.name + ' hours details');
      button.addEventListener('click', () => openDetails(employee));
      hoursCell.append(button);
      const branchCell = row.insertCell();
      branchCell.textContent = employee.branch || '—';
      row.insertCell().textContent = employee.department || '—';
      row.insertCell().textContent = employee.position || '—';
    });
    if (!employees.length) {
      const cell = tableBody.insertRow().insertCell();
      cell.colSpan = 6;
      cell.className = 'attendance-report-empty';
      cell.textContent = 'No records match the current filter.';
    }
    document.getElementById('highlightTotalRecords').textContent = employees.length;
    document.getElementById('highlightMetricValue').textContent = hoursText(sumHours(employees));
    const parts = [selectedRange(), source.metric];
    if (!includesCompletePeriod()) parts.push('Available dated records');
    if (applied.keyword) parts.push('“' + applied.keyword + '”');
    if (applied.department !== 'all') parts.push('Department not specified');
    if (applied.costCenter !== 'all') parts.push('Cost Center not specified');
    if (applied.min > 0 || applied.max < defaults.max) parts.push(hoursText(applied.min) + ' – ' + hoursText(applied.max) + ' hrs');
    document.getElementById('highlightFilterSummaryText').textContent = parts.join(' • ');
  }

  function showModal(id, open) {
    const modal = document.getElementById(id);
    if (open) returnFocus = document.activeElement;
    modal.hidden = !open;
    for (const child of document.querySelector('.phone-container').children) {
      if (!child.classList.contains('modal-overlay')) child.inert = open;
    }
    if (open) modal.querySelector(id === 'highlightFilterModal' ? 'input' : 'button').focus();
    else if (returnFocus?.isConnected) returnFocus.focus();
  }

  function openDetails(employee) {
    document.getElementById('highlightDetailName').textContent = employee.name;
    document.getElementById('highlightDetailEmpNo').textContent = '#' + employee.empNo;
    const list = document.getElementById('highlightDetailsList');
    list.replaceChildren();
    if (kind === 'overtime' && employee.details.length) {
      const meta = textElement('div', 'hours-highlight-detail-meta record-summary-card');
      const count = textElement('span', 'record-summary-metric');
      count.append(textElement('span', 'record-summary-label', 'Total Records'),
        textElement('strong', 'record-summary-value', String(employee.details.length)));
      meta.append(count);
      const total = textElement('span', '', 'Total Hours: ');
      const value = textElement('strong', '', hoursText(sumHours(employee.details)));
      value.id = 'highlightDetailsTotal';
      total.append(value);
      meta.append(total);
      list.append(meta);
    }
    for (const detail of employee.details) {
      const card = textElement('article', 'leave-highlight-detail-record history-card-item');
      card.append(textElement('div', 'leave-highlight-detail-date', dateText(detail.date)));
      const body = textElement('div', 'leave-highlight-detail-body');
      const detailFields = kind === 'overtime'
        ? [['Description', detail.description, 'description'], ['Hours', hoursText(detail.hours), 'hours']]
        : [['Shift', detail.shift, 'shift'], ['Clock Times', detail.clockTimes.join(', '), 'clockTimes'], ['Hours', hoursText(detail.hours), 'hours'], ...(detail.exception ? [['Exception', detail.exception, 'exception']] : [])];
      detailFields.forEach(([label, value, key]) => {
        const field = textElement('div', 'leave-highlight-detail-field' + (key === 'shift' || key === 'exception' ? ' wide' : ''));
        const content = textElement('div', 'leave-highlight-detail-value', value);
        content.dataset.field = key;
        field.append(textElement('div', 'leave-highlight-detail-label', label), content);
        body.append(field);
      });
      card.append(body);
      list.append(card);
    }
    if (!employee.details.length) list.append(textElement('p', 'attendance-report-empty', 'No detailed records are available for this employee in the selected period.'));
    showModal('highlightDetailsModal', true);
  }

  function chartItems(rows) {
    const groups = new Map();
    rows.forEach(row => {
      const label = row.branch || 'Unspecified';
      groups.set(label, (groups.get(label) || 0) + Math.round(row.hours * 100));
    });
    return [...groups].map(([label, cents]) => ({ label, hours: cents / 100 })).sort((a, b) => b.hours - a.hours);
  }

  function renderChart(analysis = false) {
    const prefix = analysis ? 'highlightAnalysis' : 'highlight';
    const rows = analysis ? selectedAnalysis.rows : filteredEmployees();
    const items = chartItems(rows);
    const total = sumHours(rows);
    const expanded = analysis ? expandedAnalysis : expandedChart;
    const shown = expanded || items.length <= 5 ? items : [...items.slice(0, 5), { label: 'Other branches', hours: sumHours(items.slice(5)) }];
    document.getElementById(prefix + 'ChartTitle').textContent = source.metric + ' by branch';
    document.getElementById(prefix + 'CenterTotal').textContent = hoursText(total);
    if (analysis) document.getElementById('highlightAnalysisSubtitle').textContent = 'As At ' + selectedAnalysis.period;
    else document.getElementById('highlightChartSubtitle').textContent = 'Share of ' + source.metric.toLowerCase();
    document.getElementById(prefix + 'ChartNote').textContent = !rows.length ? (!includesCompletePeriod() ? 'No available dated records match the current filter.' : 'No records match the current filter.') : analysis || !includesCompletePeriod() ? 'Available dated records' : 'Based on the current filter';
    const svg = document.getElementById(prefix + 'DonutCircles');
    svg.replaceChildren();
    svg.parentElement.setAttribute('aria-label', hoursText(total) + ' ' + source.metric);
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    const legend = document.getElementById(prefix + 'ChartLegend');
    legend.replaceChildren();
    shown.forEach((item, index) => {
      const ratio = total ? item.hours / total : 0;
      if (ratio) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const length = ratio * circumference;
        Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: colors[index % colors.length], 'stroke-width': analysis ? 24 : 22, 'stroke-dasharray': length + ' ' + (circumference - length), 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
        svg.append(circle);
        offset += length;
      }
      const line = textElement('div', 'hours-highlight-legend-row');
      line.dataset.chartValue = item.hours;
      const label = textElement('span', 'hours-highlight-legend-label');
      const dot = textElement('i', 'hours-highlight-legend-dot');
      dot.style.background = colors[index % colors.length];
      label.append(dot, document.createTextNode(item.label));
      line.append(label, textElement('span', '', hoursText(item.hours)), textElement('span', '', (ratio * 100).toFixed(2) + '%'));
      legend.append(line);
    });
    const footer = document.getElementById(prefix + 'ViewAll');
    footer.hidden = items.length <= 5;
    footer.textContent = expanded ? 'Show top 5 only' : 'View all branches';
  }

  function renderTrend() {
    const rows = datedRecords();
    document.getElementById('trendSelectedRangeText').textContent = selectedRange();
    document.getElementById('trendTotalHours').textContent = hoursText(sumHours(rows));
    const months = new Map();
    rows.forEach(row => {
      const month = row.date.slice(0, 7);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(row);
    });
    const maximum = Math.max(0, ...[...months.values()].map(sumHours));
    const container = document.getElementById('trendMonthlyBarsContainer');
    container.replaceChildren();
    for (const [month, records] of [...months].sort(([a], [b]) => a.localeCompare(b))) {
      const total = sumHours(records);
      const button = textElement('button', 'highlight-trend-bar');
      button.type = 'button';
      button.dataset.highlightTrendBar = month;
      button.setAttribute('aria-label', 'View ' + monthText(month) + ', ' + hoursText(total) + ' hours analysis');
      const track = textElement('span', 'highlight-trend-track');
      const fill = textElement('span', 'highlight-trend-fill');
      fill.style.width = (maximum ? total / maximum * 100 : 0) + '%';
      track.append(fill);
      button.append(textElement('span', 'highlight-trend-month', monthText(month)), track, textElement('span', 'highlight-trend-value', hoursText(total)));
      button.addEventListener('click', () => openAnalysis(records, monthText(month)));
      container.append(button);
    }
    if (!months.size) container.append(textElement('p', 'attendance-report-empty', 'No dated records are available for the selected period.'));
    document.getElementById('trendTotalCard').disabled = !rows.length;
  }

  function showSection(section) {
    currentSection = section === 'table' ? 'report' : section;
    const viewIds = { report: 'highlightReportView', chart: 'highlightChartView', trend: 'highlightTrendView', analysis: 'highlightAnalysisView' };
    Object.entries(viewIds).forEach(([key, id]) => { document.getElementById(id).hidden = key !== currentSection; });
    document.getElementById('pageHeaderTitle').textContent = currentSection === 'report' ? source.title : currentSection === 'trend' ? (kind === 'overtime' ? 'Overtime' : 'Attendance') + ' Hours Trend Analysis' : (kind === 'overtime' ? 'Overtime' : 'Attendance') + ' Hours Analysis';
    if (currentSection === 'chart') renderChart();
    if (currentSection === 'trend') renderTrend();
    if (currentSection === 'analysis') renderChart(true);
    document.querySelector('.main-content').scrollTop = 0;
  }

  function openAnalysis(rows, period) {
    selectedAnalysis = { rows, period };
    expandedAnalysis = false;
    showSection('analysis');
  }

  function openFilter() {
    for (const [key, id] of Object.entries(fields)) {
      const field = document.getElementById(id);
      if (field) { field.setCustomValidity(''); field.value = applied[key]; }
    }
    showModal('highlightFilterModal', true);
  }

  function submitFilter() {
    const form = document.getElementById('highlightFilterForm');
    const from = document.getElementById('filterFromDate'), to = document.getElementById('filterToDate');
    const min = document.getElementById('filterRangeMin'), max = document.getElementById('filterRangeMax');
    to.setCustomValidity(to.value < from.value ? 'End date must be on or after the start date.' : '');
    max.setCustomValidity(Number(max.value) < Number(min.value) ? 'Maximum hours must be at least the minimum hours.' : '');
    if (!form.reportValidity()) return;
    for (const [key, id] of Object.entries(fields)) {
      const field = document.getElementById(id);
      if (field) applied[key] = key === 'min' || key === 'max' ? Number(field.value) : field.value.trim();
    }
    expandedChart = false;
    renderReport();
    showModal('highlightFilterModal', false);
  }

  function closeModal(id, event) { if (!event || event.target === event.currentTarget) showModal(id, false); }
  window.showHoursHighlightSection = showSection;
  window.showOvertimeSection = showSection;
  window.showAttendanceSection = showSection;
  window.handleBackNavigation = () => {
    if (currentSection === 'analysis') showSection('trend');
    else if (currentSection === 'trend') showSection('chart');
    else if (currentSection === 'chart') showSection('report');
    else window.location.href = 'team.html';
  };
  window.openHighlightPeriodAnalysis = () => openAnalysis(datedRecords(), selectedRange());
  window.openHighlightFilterModal = openFilter;
  window.closeHighlightFilterModal = event => closeModal('highlightFilterModal', event);
  window.closeHighlightDetailsModal = event => closeModal('highlightDetailsModal', event);
  window.submitHighlightFilterModal = submitFilter;
  window.resetHighlightFilterModal = () => { applied = { ...defaults }; expandedChart = false; renderReport(); showModal('highlightFilterModal', false); };
  window.handleExportAction = type => {
    if (type === 'PDF') { window.print(); return; }
    const rows = [['Emp #', 'Name', 'Hours', 'Branch', 'Department', 'Position'], ...filteredEmployees().map(employee => ['#' + employee.empNo, employee.name, hoursText(employee.hours), employee.branch || '', employee.department || '', employee.position || ''])];
    const csv = '\uFEFF' + rows.map(row => row.map(value => {
      const text = /^[=+@-]/.test(String(value)) ? "'" + value : String(value);
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = kind + '-highlight.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.getElementById('highlightFilterForm').addEventListener('submit', event => { event.preventDefault(); submitFilter(); });
  document.getElementById('highlightFilterForm').addEventListener('input', event => { if (event.target.setCustomValidity) event.target.setCustomValidity(''); });
  document.getElementById('highlightViewAll').addEventListener('click', () => { expandedChart = !expandedChart; renderChart(); });
  document.getElementById('highlightAnalysisViewAll').addEventListener('click', () => { expandedAnalysis = !expandedAnalysis; renderChart(true); });
  document.addEventListener('keydown', event => {
    const modal = [...document.querySelectorAll('.hours-highlight-page .modal-overlay')].find(element => !element.hidden);
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); showModal(modal.id, false); }
    if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('input, select, button')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  renderReport();
})();
