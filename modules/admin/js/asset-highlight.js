document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const records = window.WORKPLACE_ASSET_DATA || [];
  const defaults = { keyword: '', description: '', assetType: '', effectiveDate: '', company: '', branch: '', department: '' };
  const dimensions = { assetType: 'Asset Type', company: 'Company', branch: 'Branch', department: 'Department' };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#8b5cf6'];
  const money = cents => (cents / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const integer = value => value.toLocaleString('en-MY');
  let filters = { ...defaults };
  let filtered = records;
  let chartOpen = false;
  let reportScroll = 0;
  const form = $('assetFilterForm');
  const overlay = $('assetDataFilter');
  const main = document.querySelector('main');
  const phone = document.querySelector('.phone-container');
  const background = [...phone.children].filter(node => node !== overlay);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  Object.entries(dimensions).forEach(([key, label]) => {
    const select = form.elements.namedItem(key);
    select.append(new Option(`All ${label === 'Company' ? 'Companies' : label === 'Branch' ? 'Branches' : label === 'Asset Type' ? 'Asset Types' : 'Departments'}`, ''));
    [...new Set(records.map(record => record[key]))].sort().forEach(value => select.append(new Option(value, value)));
  });

  function renderReport() {
    const keyword = filters.keyword.toLowerCase().replace(/^#/, '');
    filtered = records.filter(record => {
      const searchable = `${record.empNo} ${record.name} ${record.id} ${record.description}`.toLowerCase();
      return (!keyword || searchable.includes(keyword))
        && (!filters.description || record.description.toLowerCase().includes(filters.description.toLowerCase()))
        && (!filters.effectiveDate || record.effectiveDate === filters.effectiveDate)
        && Object.keys(dimensions).every(key => !filters[key] || filters[key] === record[key]);
    });
    const employees = new Map();
    filtered.forEach(record => {
      const employee = employees.get(record.empNo) || { empNo: record.empNo, name: record.name, count: 0, valueCents: 0 };
      employee.count += record.count;
      employee.valueCents += record.valueCents;
      employees.set(record.empNo, employee);
    });
    const tbody = $('assetTable').tBodies[0];
    tbody.replaceChildren();
    [...employees.values()].sort((a, b) => a.empNo.localeCompare(b.empNo)).forEach(employee => {
      const row = element('tr');
      [`#${employee.empNo}`, employee.name, integer(employee.count), money(employee.valueCents)].forEach(value => row.append(element('td', '', value)));
      tbody.append(row);
    });
    $('assetTotalRecords').textContent = integer(employees.size);
    $('assetEmpty').hidden = filtered.length > 0;
    const summary = [];
    if (filters.keyword) summary.push(`Keyword: ${filters.keyword}`);
    if (filters.description) summary.push(`Description: ${filters.description}`);
    summary.push(filters.assetType || 'All Asset Types');
    if (filters.effectiveDate) summary.push(`Effective: ${new Date(`${filters.effectiveDate}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    ['company', 'branch', 'department'].forEach(key => { if (filters[key]) summary.push(filters[key]); });
    if (!filters.keyword) summary.unshift('All Employees');
    $('assetFilterSummary').textContent = summary.join(' • ');
    renderChart();
  }

  function renderChart() {
    const grouped = new Map();
    filtered.forEach(record => grouped.set(record.branch, (grouped.get(record.branch) || 0) + record.count));
    const groups = [...grouped].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = groups.reduce((sum, [, value]) => sum + value, 0);
    const title = 'Asset count by branch';
    $('assetChartTitle').textContent = title;
    $('assetChartTotal').textContent = integer(total);
    $('assetChartNote').textContent = filtered.length ? `${integer(filtered.length)} asset records • Current filter applied` : 'No assets match the current filter.';
    $('assetChartDonut').setAttribute('aria-label', `${title}. Total ${integer(total)} assets.`);
    $('assetChartSegments').replaceChildren();
    $('assetChartLegend').replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    groups.forEach(([label, value], index) => {
      const fraction = total > 0 ? value / total : 0;
      const color = colors[index % colors.length];
      if (fraction > 0) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([attribute, val]) => circle.setAttribute(attribute, val));
        const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        tooltip.textContent = `${label}: ${integer(value)} (${(fraction * 100).toFixed(1)}%)`;
        circle.append(tooltip);
        $('assetChartSegments').append(circle);
        offset += fraction * circumference;
      }
      const row = element('div', 'attendance-report-legend-row');
      const name = element('span', 'attendance-report-legend-label');
      const dot = element('i', 'attendance-report-dot');
      dot.style.background = color;
      dot.setAttribute('aria-hidden', 'true');
      name.append(dot, element('span', '', label));
      row.append(name, element('span', '', integer(value)), element('span', '', `${(fraction * 100).toFixed(1)}%`));
      $('assetChartLegend').append(row);
    });
    if (!groups.length) $('assetChartLegend').append(element('p', 'asset-empty', 'No Asset Records'));
  }

  function showChart(open) {
    chartOpen = open;
    if (open) reportScroll = main.scrollTop;
    $('assetReport').hidden = open;
    $('assetChart').hidden = !open;
    $('assetPageTitle').textContent = open ? 'Asset Chart' : 'Asset Highlight';
    $('assetBack').setAttribute('aria-label', open ? 'Back to Asset Highlight' : 'Back to Workplace Individual');
    main.scrollTop = open ? 0 : reportScroll;
    if (open) $('assetChartDimension').focus({ preventScroll: true });
    else $('assetViewChart').focus({ preventScroll: true });
  }
  function openFilter() {
    Object.entries(filters).forEach(([name, value]) => { form.elements.namedItem(name).value = value; });
    overlay.hidden = false;
    background.forEach(node => { node.inert = true; });
    $('assetKeyword').focus();
  }
  function closeFilter() {
    overlay.hidden = true;
    background.forEach(node => { node.inert = false; });
    $('assetFilterTrigger').focus();
  }
  $('assetFilterTrigger').addEventListener('click', openFilter);
  $('assetCloseFilter').addEventListener('click', closeFilter);
  $('assetResetFilter').addEventListener('click', () => { form.reset(); });
  overlay.addEventListener('click', event => { if (event.target === overlay) closeFilter(); });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeFilter(); }
    if (event.key !== 'Tab') return;
    const controls = [...form.querySelectorAll('button, input, select')].filter(node => !node.disabled);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    filters = Object.fromEntries(Object.keys(defaults).map(name => [name, form.elements.namedItem(name).value.trim()]));
    renderReport();
    closeFilter();
    main.scrollTop = 0;
  });
  $('assetViewChart').addEventListener('click', () => showChart(true));
  $('assetBack').addEventListener('click', event => { if (chartOpen) { event.preventDefault(); showChart(false); } });
  renderReport();
});
