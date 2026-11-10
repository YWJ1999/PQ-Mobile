// Local preview records retained from the existing page. Clock pairs include
// sample values; missing branch values stay unknown. The September clock-out
// values come from the supplied image.
const continuousHistory = [
  ['2026-01-10', 'Morning Shift (08:00 - 17:00)', ['0755', '1705']],
  ['2026-01-11', 'Morning Shift (08:00 - 17:00)', ['0758', '1708']],
  ['2026-01-12', 'General Shift (08:30 - 17:30)', ['0825', '1735']],
  ['2026-01-13', 'Morning Shift (08:00 - 17:00)', ['0752', '1710']],
  ['2026-01-14', 'Flexi Shift (09:00 - 18:00)', ['0855', '1805']],
  ['2026-01-15', 'Morning Shift (08:00 - 17:00)', ['0756', '1706']],
  ['2026-01-16', 'Morning Shift (08:00 - 17:00)', ['0754', '1712']]
].map(([date, shift, clockTimes]) => ({ date, shift, clockTimes }));
const julyRestHistory = [
  { date: '2026-07-09', shift: 'Night Shift (22:00 - 07:00)', clockTimes: ['2155', '0705'] },
  { date: '2026-07-10', shift: 'Morning Shift (08:00 - 17:00)', clockTimes: ['0755', '1705'] }
];
const violationRecords = [
  ...[
    ['LSH', '0000100', 'ACCOUNTS', 'Account Executive'],
    ['Tay Siow Kung', '000020', 'HUMAN RESOURCE', 'BFT & Com. Executive'],
    ['Tan Siow Soon', '000022', 'ACCOUNTS', 'Account Manager'],
    ['Tony Stunk', '000053', 'ADMINISTRATION', 'Barista']
  ].map(([name, empNo, department, jobTitle]) => ({
    id: `continuous-${empNo}`, name, empNo, department, jobTitle, branch: null,
    type: 'continuous', date: '2026-01-16', startDate: '2026-01-10', history: continuousHistory
  })),
  ...[
    ['Aqilah Antasha', '000008', 'ADMINISTRATION', 'Admin Executive'],
    ['Chan Mee Ling', '000009', 'ADMINISTRATION', 'Barista'],
    ['Loh Siew Hong', '0000100', 'ACCOUNTS', 'Account Executive']
  ].map(([name, empNo, department, jobTitle]) => ({
    id: `rest-july-${empNo}`, name, empNo, department, jobTitle, branch: null,
    type: 'rest', date: '2026-07-10', history: julyRestHistory
  })),
  {
    id: 'rest-september-000008', name: 'Aqilah Antasha', empNo: '000008',
    department: 'ADMINISTRATION', jobTitle: 'Admin Executive', branch: null,
    type: 'rest', date: '2026-09-25', history: [
      { date: '2026-09-24', shift: 'OFF DAY', clockTimes: ['0830', '1945'] },
      { date: '2026-09-25', shift: 'REST DAY', clockTimes: ['0828', '1945'] },
      { date: '2026-09-26', shift: '8.30AM–5.30PM (W01)', clockTimes: ['0825', '1925'] }
    ]
  }
];
const defaultViolationFilters = { date: '2026-01-16', branch: 'all', department: 'all' };
let violationFilters = { ...defaultViolationFilters };
let hasExplicitViolationDate = false;
let activeTab = 'continuous';
let modalReturnFocus = null;

document.documentElement.classList.add('violation-icons-fallback');
document.fonts.load('900 14px "Font Awesome 6 Free"').then(fonts => {
  if (fonts.length) document.documentElement.classList.remove('violation-icons-fallback');
}).catch(() => { /* Local vector icons remain available if the CDN fails. */ });

function parseViolationDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function formatViolationDate(value) {
  const date = parseViolationDate(value);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function violationTypeLabel(type) { return type === 'continuous' ? 'Continuous Work' : 'Below 30 Rest Hour'; }
function violationPeriod(record) {
  return record.startDate ? `${formatViolationDate(record.startDate)} – ${formatViolationDate(record.date)}` : formatViolationDate(record.date);
}
function filteredViolationRecords(type = activeTab) {
  return violationRecords.filter(record => record.type === type
    && record.date === violationFilters.date
    && (violationFilters.branch === 'all' || (record.branch || 'unspecified') === violationFilters.branch)
    && (violationFilters.department === 'all' || record.department === violationFilters.department));
}
function createViolationCard(record) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'history-card-item violation-card';
  card.dataset.violationDetail = record.id;
  card.dataset.department = record.department;
  card.dataset.position = record.jobTitle;
  card.setAttribute('aria-label', `View details for ${record.name}, #${record.empNo}, ${violationTypeLabel(record.type)}, ${violationPeriod(record)}`);
  card.innerHTML = '<span class="history-time-row"><strong class="violation-card-name"></strong><span class="attendance-report-emp"></span></span><span class="violation-card-content"><span class="violation-card-details"><span class="violation-card-period" data-period></span><span class="violation-card-fields"><span class="violation-card-field"><small>Department</small><strong data-department></strong></span><span class="violation-card-field"><small>Job Title</small><strong data-job></strong></span></span><span class="violation-card-footer"><span data-type></span></span></span></span>';
  if (record.type === 'continuous' && record.startDate) {
    card.querySelector('[data-period]').remove();
    card.querySelector('[data-type]').textContent = `Continuous Work between ${formatViolationDate(record.startDate)} and ${formatViolationDate(record.date)}`;
  } else if (record.type === 'rest') {
    card.querySelector('[data-period]').remove();
    const [year, month, day] = record.date.split('-');
    card.querySelector('[data-type]').textContent = `Below 30 rest hours at ${day}/${month}/${year}`;
  } else {
    card.querySelector('[data-period]').textContent = violationPeriod(record);
    card.querySelector('[data-type]').textContent = violationTypeLabel(record.type);
  }
  card.querySelector('.violation-card-name').textContent = record.name;
  card.querySelector('.attendance-report-emp').textContent = `#${record.empNo}`;
  card.querySelector('[data-department]').textContent = record.department;
  card.querySelector('[data-job]').textContent = record.jobTitle;
  card.addEventListener('click', () => openDetailModal(record.id));
  return card;
}
function renderViolationRecords() {
  for (const [type, viewId, tabId] of [
    ['continuous', 'viewContinuous', 'boxContinuous'],
    ['rest', 'viewRest', 'boxRest']
  ]) {
    const records = filteredViolationRecords(type);
    const view = document.getElementById(viewId);
    const tab = document.getElementById(tabId);
    view.replaceChildren(...records.map(createViolationCard));
    if (!records.length) {
      const empty = document.createElement('p');
      empty.className = 'attendance-report-empty';
      empty.textContent = 'No records match the current filter.';
      view.append(empty);
    }
    view.hidden = activeTab !== type;
    tab.classList.toggle('active', activeTab === type);
    tab.setAttribute('aria-selected', String(activeTab === type));
    tab.tabIndex = activeTab === type ? 0 : -1;
  }
  document.getElementById('currentDateDisplay').textContent = formatViolationDate(violationFilters.date);
  updateFilterSummaryLabel();
}
function defaultViolationDate(type) {
  return violationRecords.filter(record => record.type === type)
    .reduce((latest, record) => record.date > latest ? record.date : latest, '') || defaultViolationFilters.date;
}
function switchViolationTab(type) {
  activeTab = type;
  if (!hasExplicitViolationDate) violationFilters.date = defaultViolationDate(type);
  renderViolationRecords();
}
function shiftDate(deltaDays) {
  hasExplicitViolationDate = true;
  const date = parseViolationDate(violationFilters.date);
  date.setDate(date.getDate() + deltaDays);
  violationFilters.date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  renderViolationRecords();
}
function updateFilterSummaryLabel() {
  const parts = [];
  parts.push(violationFilters.branch === 'all' ? 'All Branches' : violationFilters.branch === 'unspecified' ? 'Branch not specified' : violationFilters.branch);
  parts.push(violationFilters.department === 'all' ? 'All Departments' : violationFilters.department);
  document.getElementById('filterSummaryText').textContent = parts.join(' • ');
}
function setViolationModal(id, open) {
  const modal = document.getElementById(id);
  if (open) modalReturnFocus = document.activeElement;
  modal.hidden = !open;
  for (const element of document.querySelector('.phone-container').children) {
    if (!element.classList.contains('modal-overlay')) element.inert = open;
  }
  if (open) modal.querySelector(id === 'filterModal' ? 'input' : 'button').focus();
  else if (modalReturnFocus && modalReturnFocus.isConnected) modalReturnFocus.focus();
}
function openFilterModal() {
  document.getElementById('filterDateInput').value = violationFilters.date;
  document.getElementById('filterBranchSelect').value = violationFilters.branch;
  document.getElementById('filterDeptSelect').value = violationFilters.department;
  setViolationModal('filterModal', true);
}
function closeFilterModal(event) { if (!event || event.target === event.currentTarget) closeFilterModalDirect(); }
function closeFilterModalDirect() { setViolationModal('filterModal', false); }
function resetFilterModal() {
  hasExplicitViolationDate = false;
  violationFilters = { ...defaultViolationFilters, date: defaultViolationDate(activeTab) };
  renderViolationRecords();
  closeFilterModalDirect();
}
function applyFilterModal() {
  const form = document.getElementById('violationFilterForm');
  if (!form.reportValidity()) return;
  hasExplicitViolationDate = true;
  violationFilters = {
    date: document.getElementById('filterDateInput').value,
    branch: document.getElementById('filterBranchSelect').value,
    department: document.getElementById('filterDeptSelect').value
  };
  renderViolationRecords();
  closeFilterModalDirect();
}
function openDetailModal(recordId) {
  const record = violationRecords.find(item => item.id === recordId);
  if (!record) return;
  document.getElementById('detailName').textContent = record.name;
  document.getElementById('detailEmpNo').textContent = `#${record.empNo}`;
  document.getElementById('detailRecordCount').textContent = record.history.length;
  const body = document.getElementById('detailTableBody');
  body.replaceChildren();
  for (const item of record.history) {
    const row = body.insertRow();
    for (const value of [formatViolationDate(item.date), item.shift, item.clockTimes.length ? item.clockTimes.join(', ') : '—']) row.insertCell().textContent = value;
  }
  document.getElementById('detailEmpty').hidden = record.history.length > 0;
  setViolationModal('detailModal', true);
}
function closeDetailModal(event) { if (!event || event.target === event.currentTarget) closeDetailModalDirect(); }
function closeDetailModalDirect() { setViolationModal('detailModal', false); }
function goBack() { history.back(); }

for (const [selectId, values, label] of [
  ['filterBranchSelect', [...new Set(violationRecords.map(item => item.branch || 'unspecified'))], value => value === 'unspecified' ? 'Not specified' : value],
  ['filterDeptSelect', [...new Set(violationRecords.map(item => item.department))].sort(), value => value]
]) {
  for (const value of values) document.getElementById(selectId).add(new Option(label(value), value));
}
document.getElementById('violationFilterForm').addEventListener('submit', event => { event.preventDefault(); applyFilterModal(); });
document.querySelector('.hist-tab-switcher').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const type = event.key === 'Home' ? 'continuous' : event.key === 'End' ? 'rest' : activeTab === 'continuous' ? 'rest' : 'continuous';
  switchViolationTab(type);
  document.getElementById(type === 'continuous' ? 'boxContinuous' : 'boxRest').focus();
});
document.addEventListener('keydown', event => {
  const modal = [...document.querySelectorAll('.violation-page .modal-overlay')].find(element => !element.hidden);
  if (!modal) return;
  if (event.key === 'Escape') { event.preventDefault(); setViolationModal(modal.id, false); }
  if (event.key === 'Tab') {
    const controls = [...modal.querySelectorAll('button, input, select')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
renderViolationRecords();
