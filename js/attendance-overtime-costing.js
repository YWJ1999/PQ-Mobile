/* Costing uses Highlight's report -> chart -> trend -> period analysis flow. */
(() => {
  const source = window.OVERTIME_COSTING_REPORT;
  if (!source) return;
  const defaults = { from: source.from, to: source.to, costCenter: 'all', status: 'all' };
  const fields = { from: 'filterFromDate', to: 'filterToDate', costCenter: 'filterCostCenter', status: 'filterStatus' };
  const dimensions = [
    { key: 'costCenter', label: 'Cost Centre', plural: 'cost centres' },
    { key: 'branch', label: 'Branch', plural: 'branches' },
    { key: 'dept', label: 'Department', plural: 'departments' },
    { key: 'grade', label: 'Grade', plural: 'grades' },
    { key: 'section', label: 'Section', plural: 'sections' },
    { key: 'status', label: 'Status', plural: 'statuses' }
  ];
  const colors = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const costText = value => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sumCost = rows => rows.reduce((total, row) => total + Math.round(row.costVal * 100), 0) / 100;
  const dateText = value => { const [year, month, day] = value.split('-'); return Number(day) + ' ' + months[Number(month) - 1] + ' ' + year; };
  const monthText = value => { const [year, month] = value.split('-'); return months[Number(month) - 1] + ' ' + year; };
  let applied = { ...defaults };
  let currentSection = 'report';
  let dimension = dimensions[0];
  let selectedAnalysis = { rows: [], period: '' };
  let expandedChart = false;
  let expandedAnalysis = false;
  let returnFocus = null;
  const selectedRange = () => dateText(applied.from) + ' – ' + dateText(applied.to);
  const category = (row, key) => row[key] || 'Unspecified';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function filteredRecords() {
    return source.records.filter(row => row.dateISO >= applied.from && row.dateISO <= applied.to
      && (applied.costCenter === 'all' || category(row, 'costCenter') === applied.costCenter)
      && (applied.status === 'all' || category(row, 'status') === applied.status));
  }

  function renderReport() {
    const records = filteredRecords();
    const body = document.getElementById('overtimeCostingTableBody');
    body.replaceChildren();
    for (const record of records) {
      const row = body.insertRow();
      row.insertCell().textContent = dateText(record.dateISO);
      row.insertCell().textContent = record.costCenter || '—';
      const amount = row.insertCell();
      amount.className = 'hours-number';
      amount.textContent = costText(record.costVal);
    }
    if (!records.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 3;
      cell.className = 'attendance-report-empty';
      cell.textContent = 'No records match the current filter.';
    }
    document.getElementById('costingTotalRecords').textContent = records.length;
    document.getElementById('costingTotalCost').textContent = costText(sumCost(records));
    const parts = [selectedRange()];
    if (applied.costCenter !== 'all') parts.push(applied.costCenter);
    if (applied.status !== 'all') parts.push(applied.status);
    document.getElementById('highlightFilterSummaryText').textContent = parts.join(' • ');
  }

  function chartItems(rows) {
    const groups = new Map();
    for (const row of rows) {
      const label = category(row, dimension.key);
      groups.set(label, (groups.get(label) || 0) + Math.round(row.costVal * 100));
    }
    return [...groups].map(([label, cents]) => ({ label, costVal: cents / 100 })).sort((a, b) => b.costVal - a.costVal);
  }

  function renderChart(analysis = false) {
    const prefix = analysis ? 'highlightAnalysis' : 'highlight';
    const rows = analysis ? selectedAnalysis.rows : filteredRecords();
    const items = chartItems(rows);
    const total = sumCost(rows);
    const expanded = analysis ? expandedAnalysis : expandedChart;
    const shown = expanded || items.length <= 5 ? items : [...items.slice(0, 5), { label: 'Other ' + dimension.plural, costVal: sumCost(items.slice(5)) }];
    document.getElementById(prefix + 'ChartTitle').textContent = 'Cost by ' + dimension.label.toLowerCase();
    document.getElementById(prefix + 'CenterTotal').textContent = costText(total);
    document.getElementById(analysis ? 'highlightAnalysisSubtitle' : 'highlightChartSubtitle').textContent = analysis ? 'As At ' + selectedAnalysis.period : 'Share of visible records cost';
    document.getElementById(prefix + 'ChartNote').textContent = rows.length ? 'Visible records only' + (dimension.key !== 'costCenter' ? ' • Unspecified values were not provided' : '') : 'No records match the current filter.';
    document.querySelector('#' + (analysis ? 'highlightAnalysisView' : 'highlightChartView') + ' .hours-highlight-legend-head span').textContent = dimension.label.toUpperCase();
    const circles = document.getElementById(prefix + 'DonutCircles');
    circles.replaceChildren();
    circles.parentElement.setAttribute('aria-label', costText(total) + ' total overtime cost');
    const legend = document.getElementById(prefix + 'ChartLegend');
    legend.replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    shown.forEach((item, index) => {
      const ratio = total ? item.costVal / total : 0;
      if (ratio) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const length = ratio * circumference;
        Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: colors[index % colors.length], 'stroke-width': analysis ? 24 : 22, 'stroke-dasharray': length + ' ' + (circumference - length), 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
        circles.append(circle);
        offset += length;
      }
      const line = element('div', 'hours-highlight-legend-row');
      line.dataset.chartValue = item.costVal;
      const label = element('span', 'hours-highlight-legend-label');
      const dot = element('i', 'hours-highlight-legend-dot');
      dot.style.background = colors[index % colors.length];
      label.append(dot, document.createTextNode(item.label));
      line.append(label, element('span', '', costText(item.costVal)), element('span', '', (ratio * 100).toFixed(2) + '%'));
      legend.append(line);
    });
    const footer = document.getElementById(prefix + 'ViewAll');
    footer.hidden = items.length <= 5;
    footer.textContent = expanded ? 'Show top 5 only' : 'View all ' + dimension.plural;
  }

  function openAnalysis(rows, period) {
    selectedAnalysis = { rows, period };
    expandedAnalysis = false;
    showSection('analysis');
  }

  function renderTrend() {
    const rows = filteredRecords();
    document.getElementById('trendSelectedRangeText').textContent = selectedRange();
    document.getElementById('trendTotalCost').textContent = costText(sumCost(rows));
    const grouped = new Map();
    for (const row of rows) {
      const month = row.dateISO.slice(0, 7);
      if (!grouped.has(month)) grouped.set(month, []);
      grouped.get(month).push(row);
    }
    const maximum = Math.max(0, ...[...grouped.values()].map(sumCost));
    const container = document.getElementById('trendMonthlyBarsContainer');
    container.replaceChildren();
    for (const [month, records] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
      const total = sumCost(records);
      const button = element('button', 'highlight-trend-bar');
      button.type = 'button';
      button.dataset.costingTrendBar = month;
      button.dataset.costingValue = total;
      button.setAttribute('aria-label', 'View ' + monthText(month) + ', ' + costText(total) + ' cost analysis');
      const track = element('span', 'highlight-trend-track');
      const fill = element('span', 'highlight-trend-fill');
      fill.style.width = (maximum ? total / maximum * 100 : 0) + '%';
      track.append(fill);
      button.append(element('span', 'highlight-trend-month', monthText(month)), track, element('span', 'highlight-trend-value', costText(total)));
      button.addEventListener('click', () => openAnalysis(records, monthText(month)));
      container.append(button);
    }
    if (!grouped.size) container.append(element('p', 'attendance-report-empty', 'No records match the current filter.'));
    document.getElementById('trendTotalCard').disabled = !rows.length;
  }

  function showSection(section) {
    const views = { report: 'highlightReportView', chart: 'highlightChartView', trend: 'highlightTrendView', analysis: 'highlightAnalysisView' };
    if (!views[section]) return;
    currentSection = section;
    Object.entries(views).forEach(([key, id]) => { document.getElementById(id).hidden = key !== section; });
    document.getElementById('pageHeaderTitle').textContent = section === 'report' ? 'Overtime Costing' : section === 'trend' ? 'Overtime Cost Trend Analysis' : 'Overtime Cost Analysis';
    if (section === 'chart') renderChart();
    if (section === 'trend') renderTrend();
    if (section === 'analysis') renderChart(true);
    document.querySelector('.main-content').scrollTop = 0;
  }

  function showFilter(open) {
    const modal = document.getElementById('highlightFilterModal');
    if (open) {
      returnFocus = document.activeElement;
      for (const [key, id] of Object.entries(fields)) {
        const field = document.getElementById(id);
        field.setCustomValidity('');
        field.value = applied[key];
      }
    }
    modal.hidden = !open;
    for (const child of document.querySelector('.phone-container').children) {
      if (!child.classList.contains('modal-overlay')) child.inert = open;
    }
    if (open) document.getElementById('filterFromDate').focus();
    else if (returnFocus?.isConnected) returnFocus.focus();
  }

  function submitFilter() {
    const from = document.getElementById('filterFromDate'), to = document.getElementById('filterToDate');
    to.setCustomValidity(to.value < from.value ? 'End date must be on or after the start date.' : '');
    if (!document.getElementById('highlightFilterForm').reportValidity()) return;
    for (const [key, id] of Object.entries(fields)) applied[key] = document.getElementById(id).value;
    expandedChart = false;
    renderReport();
    showFilter(false);
  }

  window.showCostingSection = showSection;
  window.handleBackNavigation = () => {
    if (currentSection === 'analysis') showSection('trend');
    else if (currentSection === 'trend') showSection('chart');
    else if (currentSection === 'chart') showSection('report');
    else window.location.href = 'team.html';
  };
  window.openHighlightPeriodAnalysis = () => openAnalysis(filteredRecords(), selectedRange());
  window.openHighlightFilterModal = () => showFilter(true);
  window.closeHighlightFilterModal = event => { if (!event || event.target === event.currentTarget) showFilter(false); };
  window.resetHighlightFilterModal = () => { applied = { ...defaults }; expandedChart = false; renderReport(); showFilter(false); };
  for (const key of ['costCenter', 'status']) {
    const select = document.getElementById(fields[key]);
    for (const value of [...new Set(source.records.map(row => category(row, key)))].sort()) select.add(new Option(value, value));
  }
  for (const id of ['highlightMetricSelect', 'highlightAnalysisMetricSelect']) {
    const select = document.getElementById(id);
    select.replaceChildren();
    dimensions.forEach(item => select.add(new Option(item.label, item.key)));
    select.addEventListener('change', () => {
      dimension = dimensions.find(item => item.key === select.value);
      document.getElementById('highlightMetricSelect').value = dimension.key;
      document.getElementById('highlightAnalysisMetricSelect').value = dimension.key;
      expandedChart = false;
      expandedAnalysis = false;
      renderChart(currentSection === 'analysis');
    });
  }
  document.getElementById('costingExportPdf').addEventListener('click', () => window.print());
  document.getElementById('costingExportExcel').addEventListener('click', () => {
    const rows = filteredRecords().map(record => [dateText(record.dateISO), record.costCenter, record.costVal]);
    window.PeopleHcmHighlightExport.downloadCsv('overtime-costing.csv', [['Date', 'Cost Centre', 'Amount'], ...rows]);
  });
  document.getElementById('highlightViewAll').addEventListener('click', () => { expandedChart = !expandedChart; renderChart(); });
  document.getElementById('highlightAnalysisViewAll').addEventListener('click', () => { expandedAnalysis = !expandedAnalysis; renderChart(true); });
  document.getElementById('highlightFilterForm').addEventListener('submit', event => { event.preventDefault(); submitFilter(); });
  document.getElementById('highlightFilterForm').addEventListener('input', () => document.getElementById('filterToDate').setCustomValidity(''));
  document.addEventListener('keydown', event => {
    const modal = document.getElementById('highlightFilterModal');
    if (modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); showFilter(false); }
    if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('input, select, button')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  renderReport();
})();
