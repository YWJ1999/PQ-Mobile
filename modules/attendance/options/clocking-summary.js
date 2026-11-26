/* One transaction source feeds the report, count details and chart. */
const clockingGroups = [
  { id: 1, branch: 'TIMES SQUARE BRANCH', dept: 'HUMAN RESOURCE', section: 'BENEFITS', costCenter: 'MANAGEMENT', date: '2026-10-05', zone: 'TIMES SQUARE OFFICE', location: 'Times Square Office, Kuala Lumpur', details: [
    { empNo: 'EBB15', name: 'Asmawi idris', time: '08:18', type: 'Clock In', mode: 'Manual Input (People HR)' },
    { empNo: 'EBB15', name: 'Asmawi idris', time: '19:53', type: 'Clock Out', mode: 'Manual Input (People HR)' },
    { empNo: 'A0001', name: 'Natasha thean mei hoi', time: '07:58', type: 'Clock In', mode: 'Manual Input (People HR)' },
    { empNo: 'A0001', name: 'Natasha thean mei hoi', time: '18:47', type: 'Clock Out', mode: 'Manual Input (People HR)' }
  ] },
  { id: 2, branch: 'TIMES SQUARE BRANCH', dept: 'HUMAN RESOURCE', section: 'BENEFITS', costCenter: 'MID VALLEY', date: '2026-10-05', zone: 'MID VALLEY OFFICE', location: 'Mid Valley Office', details: [
    { empNo: 'EBB12', name: 'Farhan binti rahmat', time: '08:05', type: 'Clock In', mode: 'Mobile Geofence', distance: 18 },
    { empNo: 'EBB12', name: 'Farhan binti rahmat', time: '17:42', type: 'Clock Out', mode: 'Mobile Geofence', distance: 32 }
  ] },
  // Keep the existing September sample records available through the date filter.
  { id: 3, branch: 'HQ - KL Main', dept: 'HUMAN RESOURCE', section: 'BENEFITS', costCenter: 'MANAGEMENT', date: '2026-09-20', location: 'HQ - KL Main', details: [
    { empNo: 'EBB15', name: 'Asmawi idris', time: '08:04', type: 'Clock In', mode: 'Manual Input (People HR)' },
    { empNo: 'A0001', name: 'Natasha thean mei hoi', time: '08:00', type: 'Clock In', mode: 'Manual Input (People HR)' },
    { empNo: 'EBB12', name: 'Farhan binti rahmat', time: '07:34', type: 'Clock In', mode: 'Manual Input (People HR)' }
  ] },
  { id: 4, branch: 'HQ - KL Main', dept: 'HUMAN RESOURCE', section: 'CORPORATE', costCenter: 'CC-101 MANAGEMENT', date: '2026-09-20', location: 'HQ - KL Main', details: [
    { empNo: 'EBB01', name: 'Lee Soon Hock', time: '08:00', type: 'Clock In', mode: 'Face Kiosk' },
    { empNo: '004177', name: 'Siti Nurhaliza', time: '08:15', type: 'Clock In', mode: 'Mobile Geofence' },
    { empNo: '0000101', name: 'Tan Wei Ming', time: '17:30', type: 'Clock Out', mode: 'Face Kiosk' }
  ] },
  { id: 5, branch: 'Penang Branch', dept: 'HUMAN RESOURCE', section: 'GENERAL HR', costCenter: 'CC-501 HR & OPS', date: '2026-09-20', location: 'Penang Branch', details: [
    { empNo: 'EBB02', name: 'Wong Kah Fai', time: '08:30', type: 'Clock In', mode: 'Mobile Geofence' }
  ] },
  { id: 6, branch: 'Johor Bahru Branch', dept: 'PLANT OPERATIONS', section: 'ASSEMBLY', costCenter: 'CC-301 PRODUCTION', date: '2026-09-20', location: 'Johor Bahru Branch', details: [
    { empNo: 'EBB03', name: 'Chok Ching Hou', time: '07:45', type: 'Clock In', mode: 'Biometric Scanner' },
    { empNo: '004199', name: 'Kavitha Raj', time: '07:50', type: 'Clock In', mode: 'Biometric Scanner' }
  ] }
];
const clockingTransactions = clockingGroups.flatMap(({ details, ...group }) => details.map(record => ({ ...group, ...record })));
const missingClockingLocation = 'Not recorded';
const defaultClockingFilters = { date: '2026-10-05', start: '00:00', end: '23:59', branch: 'all', dept: 'all', section: 'all', costCenter: 'all', type: 'all', zone: 'all', radius: 0 };
const clockingFilterFields = { date: 'filterDateInput', start: 'filterStartTimeInput', end: 'filterEndTimeInput', branch: 'filterBranchSelect', dept: 'filterDeptSelect', section: 'filterSectionSelect', costCenter: 'filterCostCenterSelect', type: 'filterClockTypeSelect', zone: 'filterZoneSelect', radius: 'filterRadiusInput' };
let appliedClockingFilters = { ...defaultClockingFilters };
let currentActiveSection = 'summary';
let chartScope = null;
let detailsContext = null;
let detailsReturnSection = 'summary';
let chartReturnSection = 'summary';
let modalReturnFocus = null;
const modalHideTimers = new Map();
const chartDimensionLabels = { branch: 'Branch', dept: 'Department', section: 'Section', costCenter: 'Cost Centre', type: 'Clocking Type', mode: 'Clock Mode' };

function escapeClockingText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function filteredClockingTransactions() {
  const filter = appliedClockingFilters;
  return clockingTransactions.filter(record => record.date === filter.date && record.time >= filter.start && record.time <= filter.end
    && ['branch', 'dept', 'section', 'costCenter', 'type', 'zone'].every(key => filter[key] === 'all' || record[key] === filter[key])
    && (filter.radius === 0 || (Number.isFinite(record.distance) && record.distance <= filter.radius)));
}

function formatClockingDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${year}`;
}

function updateFilterSummaryDisplay() {
  const filter = appliedClockingFilters;
  document.getElementById('clockingCurrentDate').textContent = formatClockingDate(filter.date);
  const parts = [`${filter.start} – ${filter.end}`];
  for (const key of ['branch', 'dept', 'section', 'costCenter', 'type', 'zone']) if (filter[key] !== 'all') parts.push(filter[key]);
  if (filter.branch === 'all') parts.push('All Branches');
  if (filter.radius > 0) parts.push(`Within ${filter.radius} m`);
  document.getElementById('filterSummaryText').textContent = parts.join(' • ');
}

function renderTable() {
  const transactions = filteredClockingTransactions();
  // The visible summary has only Section and Cost Centre, so group by those columns.
  const groups = new Map();
  transactions.forEach(record => {
    const key = JSON.stringify([record.section, record.costCenter]);
    if (!groups.has(key)) groups.set(key, { ...record, count: 0 });
    groups.get(key).count++;
  });
  document.getElementById('totalRecordsVal').textContent = groups.size;
  document.getElementById('totalCountVal').textContent = transactions.length;
  document.getElementById('summaryTableBody').innerHTML = [...groups.values()].map(group => `
    <tr class="summary-table-row">
      <td class="cell-section attendance-report-name">${escapeClockingText(group.section)}</td>
      <td class="cell-cc">${escapeClockingText(group.costCenter)}</td>
      <td class="cell-count"><button type="button" class="attendance-report-pill" onclick="openDetailsPage(${group.id})" aria-label="View ${group.count} clocking records for ${escapeClockingText(group.section)}, ${escapeClockingText(group.costCenter)}">${group.count}</button></td>
    </tr>`).join('') || '<tr><td colspan="3" class="attendance-report-empty">No clocking records match the current filter.</td></tr>';
}

function showSectionView(section) {
  currentActiveSection = section;
  ['summary', 'chart', 'details', 'map'].forEach(view => {
    document.getElementById('view-' + view).style.display = section === view ? 'block' : 'none';
  });
  const titles = { summary: 'Clocking Summary', chart: 'Clocking Analysis', details: 'Clocking Summary Details', map: 'Location Map' };
  document.getElementById('pageHeaderTitle').textContent = titles[section];
  const mainContent = document.querySelector('.main-content');
  mainContent.classList.toggle('is-map-view', section === 'map');
  document.querySelector('.phone-container').classList.toggle('clocking-map-active', section === 'map');
  mainContent.scrollTop = 0;
}

function handleHeaderBack() {
  if (currentActiveSection === 'map') { showSectionView('details'); return; }
  if (currentActiveSection === 'details') { showSectionView(detailsReturnSection); return; }
  if (currentActiveSection === 'chart') {
    const returnSection = chartReturnSection;
    showSectionView(returnSection);
    if (returnSection === 'summary') chartScope = null;
  } else { history.back(); }
}

function openSummaryChart() {
  chartScope = null;
  chartReturnSection = 'summary';
  showSectionView('chart');
  renderDonutChartData();
}

function renderDonutChartData() {
  const dimension = document.getElementById('clockingBreakdownSelect').value;
  const transactions = chartScope ? chartScope.records : filteredClockingTransactions();
  const groups = new Map();
  transactions.forEach(record => {
    const label = record[dimension] || 'Unspecified';
    groups.set(label, (groups.get(label) || 0) + 1);
  });
  const items = [...groups].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const colors = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
  const total = transactions.length;
  document.getElementById('summaryCenterTotal').textContent = total;
  document.getElementById('summaryDonutSvg').setAttribute('aria-label', `${total} clock transactions by ${chartDimensionLabels[dimension].toLowerCase()}`);
  document.getElementById('clockingChartTitle').textContent = `Clock transactions by ${chartDimensionLabels[dimension].toLowerCase()}`;
  document.getElementById('clockingLegendLabel').textContent = chartDimensionLabels[dimension].toUpperCase();
  document.getElementById('clockingChartSubtitle').textContent = chartScope ? `${chartScope.title} • ${chartScope.meta}` : 'Share of the currently filtered clocking transactions';
  document.getElementById('clockingChartNote').textContent = total ? `${formatClockingDate(appliedClockingFilters.date)} • Select a category below to view records` : 'No clocking records match the current filter';
  let offset = 0;
  const circumference = 2 * Math.PI * 70;
  document.getElementById('summaryDonutCircles').innerHTML = items.map((item, index) => {
    const length = item.count / total * circumference;
    const segment = `<circle cx="90" cy="90" r="70" fill="none" stroke="${colors[index % colors.length]}" stroke-width="22" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"><title>${escapeClockingText(item.name)}: ${item.count}</title></circle>`;
    offset += length;
    return segment;
  }).join('');
  const legend = document.getElementById('summaryChartLegendGrid');
  legend.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'attendance-report-legend-row';
    row.innerHTML = `<span class="attendance-report-legend-label"><i class="attendance-report-dot" style="background:${colors[index % colors.length]}"></i>${escapeClockingText(item.name)}</span><span>${item.count}</span><span>${(item.count / total * 100).toFixed(1)}%</span>`;
    row.setAttribute('aria-label', `View ${item.count} clocking records for ${item.name}`);
    row.addEventListener('click', () => showClockingDetails({ title: item.name, meta: `${chartDimensionLabels[dimension]} • ${formatClockingDate(appliedClockingFilters.date)}`, records: transactions.filter(record => (record[dimension] || 'Unspecified') === item.name) }));
    legend.append(row);
  });
  if (!total) legend.innerHTML = '<div class="attendance-report-empty">No categories to display.</div>';
}

function openDetailsPage(id) {
  const group = clockingGroups.find(item => item.id === id);
  if (!group) return;
  showClockingDetails({ title: group.section, meta: `Cost Centre: ${group.costCenter} • ${formatClockingDate(appliedClockingFilters.date)}`, records: filteredClockingTransactions().filter(record => record.section === group.section && record.costCenter === group.costCenter) });
}

function showClockingDetails(context, returnSection = currentActiveSection === 'chart' ? 'chart' : 'summary') {
  detailsContext = context;
  detailsReturnSection = returnSection;
  document.getElementById('detailsRecordCount').textContent = String(context.records.length);
  document.getElementById('detailsListContainer').innerHTML = context.records.map(record => {
    const isIn = record.type === 'Clock In' || record.type === 'Break In';
    const location = record.location?.trim();
    return `<article class="staff-clock-card history-card-item ${isIn ? 'clocking-in-card' : 'clocking-out-card'}">
      <div class="clocking-record-header history-card-header">
        <div class="clocking-record-heading history-card-heading"><h3 class="staff-name-text">${employeeCardHeading.html(record.empNo, record.name)}</h3></div>
        <span class="clocking-status-badge clocking-record-type ${isIn ? 'is-in' : 'is-out'}"><i class="fa-solid ${isIn ? 'fa-right-to-bracket' : 'fa-right-from-bracket'}" aria-hidden="true"></i>${escapeClockingText(record.type)}</span>
      </div>
      <div class="clocking-record-body history-card-details">
        <div class="clocking-record-field"><div class="clocking-record-label">Clock Time</div><strong class="clocking-record-time">${escapeClockingText(record.time)}</strong></div>
        <div class="clocking-record-field clocking-record-mode-field"><div class="clocking-record-label">Clock Mode</div><strong class="clocking-record-mode">${escapeClockingText(record.mode)}</strong></div>
        <div class="clocking-record-field clocking-record-location-field"><div class="clocking-record-label">Location</div><strong class="clocking-record-mode clocking-record-location">${escapeClockingText(location || missingClockingLocation)}</strong></div>
      </div>
      ${location ? `<div class="clocking-card-actions"><button type="button" class="clocking-map-btn" aria-label="View ${escapeClockingText(location)} map full screen"><span>View Map</span></button></div>` : ''}
    </article>`;
  }).join('') || '<div class="attendance-report-empty">No clocking records match the current filter.</div>';
  document.querySelectorAll('#detailsListContainer .clocking-map-btn').forEach(button => {
    button.addEventListener('click', () => openClockingMap(button));
  });
  document.querySelector('#view-details .view-chart-btn').disabled = !context.records.length;
  showSectionView('details');
}

function openDetailsChart() {
  const context = detailsContext;
  if (!context?.records.length) return;
  chartScope = context;
  chartReturnSection = 'details';
  showSectionView('chart');
  renderDonutChartData();
  document.querySelector('.header-btn-icon').focus();
}

function openClockingMap(button) {
  const location = button.closest('.staff-clock-card')?.querySelector('.clocking-record-location')?.textContent.trim() || '';
  document.getElementById('clockingMapAddress').textContent = location;
  showSectionView('map');
  document.querySelector('.header-btn-icon').focus();
}

function clockingExportRows() {
  return [
    ['Employee Name', 'Employee ID', 'Date', 'Clock Time', 'Clock Type', 'Clock Mode', 'Branch', 'Department', 'Section', 'Cost Centre', 'Location'],
    ...(detailsContext?.records || []).map(record => [record.name, formatEmployeeNumber(record.empNo), record.date, record.time, record.type, record.mode, record.branch, record.dept, record.section, record.costCenter, record.location?.trim() || missingClockingLocation])
  ];
}

function exportClockingDetails() {
  const rows = clockingExportRows();
  const xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'
    + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Clocking Details"><Table>'
    + rows.map(row => `<Row>${row.map(value => `<Cell><Data ss:Type="String">${escapeClockingText(value)}</Data></Cell>`).join('')}</Row>`).join('')
    + '</Table></Worksheet></Workbook>';
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Clocking_Details_${appliedClockingFilters.date}.xml`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printClockingDetails() {
  document.querySelector('.clocking-print-report')?.remove();
  const report = document.createElement('section');
  report.className = 'clocking-print-report';
  const [columns, ...rows] = clockingExportRows();
  report.innerHTML = `<h1>Clocking Summary Details</h1><p>${escapeClockingText(detailsContext.title)} • ${escapeClockingText(detailsContext.meta)} • ${rows.length} Records</p><table><thead><tr>${columns.map(value => `<th>${escapeClockingText(value)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escapeClockingText(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  document.body.append(report);
  window.print();
}

window.addEventListener('afterprint', () => document.querySelector('.clocking-print-report')?.remove());

function openClockingOverlay(id) {
  const modal = document.getElementById(id);
  clearTimeout(modalHideTimers.get(id));
  modalReturnFocus = document.activeElement;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-content').inert = true;
  requestAnimationFrame(() => { modal.classList.add('active'); modal.querySelector('button, input, select')?.focus(); });
}

function closeClockingOverlay(id) {
  const modal = document.getElementById(id);
  if (modal.style.display !== 'flex') return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.querySelector('.main-content').inert = false;
  modalReturnFocus?.focus();
  clearTimeout(modalHideTimers.get(id));
  modalHideTimers.set(id, setTimeout(() => { modal.style.display = 'none'; }, 260));
}

function closeFilterModal(event) { if (!event || event.target === event.currentTarget) closeClockingOverlay('filterModal'); }

function setClockingFilterInputs(filters) {
  Object.entries(clockingFilterFields).forEach(([key, id]) => { document.getElementById(id).value = filters[key]; });
  document.getElementById('clockingFilterError').hidden = true;
}

function openFilterModal() { setClockingFilterInputs(appliedClockingFilters); openClockingOverlay('filterModal'); }

function changeClockingSummaryDate(days) {
  const date = new Date(`${appliedClockingFilters.date || defaultClockingFilters.date}T12:00:00`);
  date.setDate(date.getDate() + days);
  appliedClockingFilters.date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  setClockingFilterInputs(appliedClockingFilters);
  updateFilterSummaryDisplay();
  renderTable();
  if (currentActiveSection === 'chart') renderDonutChartData();
}

function resetFilterModal() {
  appliedClockingFilters = { ...defaultClockingFilters };
  setClockingFilterInputs(appliedClockingFilters);
  closeFilterModal();
  updateFilterSummaryDisplay();
  renderTable();
  showToastNotification('Filters reset to default');
}

function applyFilterModal() {
  const filters = Object.fromEntries(Object.entries(clockingFilterFields).map(([key, id]) => [key, document.getElementById(id).value]));
  const radiusValue = filters.radius;
  filters.radius = Number(radiusValue);
  const error = !filters.date || !filters.start || !filters.end ? 'Enter a date, start time and end time.'
    : filters.start > filters.end ? 'End Time must be on or after Start Time.'
    : radiusValue === '' || !Number.isFinite(filters.radius) || filters.radius < 0 ? 'Radius must be zero or a positive number.' : '';
  const errorNode = document.getElementById('clockingFilterError');
  errorNode.hidden = !error;
  errorNode.textContent = error;
  if (error) { errorNode.scrollIntoView({ block: 'nearest' }); return; }
  appliedClockingFilters = filters;
  closeFilterModal();
  updateFilterSummaryDisplay();
  renderTable();
  showToastNotification('Filter applied successfully');
}

function showToastNotification(message) {
  document.getElementById('toastMessage').textContent = message;
  const toast = document.getElementById('feedbackToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

document.addEventListener('keydown', event => {
  const modal = document.getElementById('filterModal').classList.contains('active') ? document.getElementById('filterModal') : null;
  if (!modal) return;
  if (event.key === 'Escape') { closeClockingOverlay(modal.id); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled), input, select')];
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

document.addEventListener('DOMContentLoaded', () => { setClockingFilterInputs(appliedClockingFilters); updateFilterSummaryDisplay(); renderTable(); });
