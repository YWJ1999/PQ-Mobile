let renderedManpowerGroups = [];
let manpowerNavigation = null;
const manpowerDetailTitles = {
  workShift: ['Work Shift Summary', 'Work Shift Employee Detail'],
  noWork: ['No Work Summary', 'No Work Employee Detail'],
  otPlan: ['OT Plan Summary', 'OT Plan Employee Detail'],
  onLeave: ['Leave Summary', 'Leave Employee Detail']
};

function renderManpowerCards(container, records) {
  renderedManpowerGroups = [...records];
  container.replaceChildren();
  records.forEach(record => {
    const card = document.createElement('section');
    card.className = 'history-card-item manpower-group-card';
    card.dataset.groupId = record.id;
    card.innerHTML = '<h2 class="manpower-company-header"></h2><div class="manpower-group-content"><div class="manpower-group-details"><div class="manpower-group-fields"><div class="manpower-group-field"><small>Section</small><strong data-section></strong></div><div class="manpower-group-field"><small>Cost Center</small><strong data-cost-center></strong></div></div><div class="manpower-group-actions" role="group"></div></div></div>';
    card.querySelector('.manpower-company-header').textContent = record.company;
    card.querySelector('[data-section]').textContent = record.section;
    card.querySelector('[data-cost-center]').textContent = record.costCenter;
    const actions = card.querySelector('.manpower-group-actions');
    actions.setAttribute('aria-label', `Manpower categories for ${record.company}, ${record.section}`);
    for (const [key, label, colorClass] of [
      ['workShift', 'Work Shift', 'val-work-shift'],
      ['noWork', 'No Work', 'val-no-work'],
      ['otPlan', 'OT Plan', 'val-ot-plan'],
      ['onLeave', 'On Leave', 'val-on-leave']
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.manpowerType = key;
      button.innerHTML = '<span></span><strong></strong>';
      button.querySelector('span').textContent = label;
      const value = button.querySelector('strong');
      value.textContent = record[key];
      value.className = record[key] > 0 ? colorClass : 'val-zero';
      button.setAttribute('aria-label', `${label}, ${record[key]} records, ${record.company}, ${record.section}`);
      button.addEventListener('click', () => openKpiDetails(key, record));
      actions.append(button);
    }
    container.append(card);
  });
}

function manpowerHours(value) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function appendManpowerRows(container, rows) {
  const list = document.createElement('dl');
  list.className = 'manpower-detail-rows';
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    const key = document.createElement('dt');
    const text = document.createElement('dd');
    key.textContent = label;
    text.textContent = value;
    row.append(key, text);
    list.append(row);
  }
  container.append(list);
}

function manpowerSummaryRows(type, record) {
  if (type === 'workShift') return [
    ['Headcount', record.headcount],
    ['Scheduled Hours', manpowerHours(record.scheduledHours)],
    ['Work Hours', manpowerHours(record.workHours)]
  ];
  if (type === 'noWork') return [['Headcount', record.headcount]];
  if (type === 'otPlan') return [
    ['OT Type', record.otType], ['Headcount', record.headcount], ['Hours', manpowerHours(record.hours)]
  ];
  return [['Leave Type', record.leaveType], ['Headcount', record.headcount]];
}

function prepareManpowerDetailView(title, overviewRows) {
  const header = document.getElementById('headerTitle');
  header.textContent = title;
  header.tabIndex = -1;
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-details').style.display = 'block';
  document.getElementById('manpowerDetailDate').textContent = formatDateDisplay(currentDateObj);
  const scope = document.getElementById('manpowerDetailScope');
  scope.hidden = !manpowerNavigation.group;
  if (manpowerNavigation.group) {
    const group = manpowerNavigation.group;
    scope.textContent = `${group.company} · ${group.section} · ${group.costCenter}`;
  }
  const overview = document.getElementById('manpowerDetailOverview');
  const isSummary = currentView === 'summary';
  overview.classList.toggle('record-summary-card', isSummary);
  overview.classList.toggle('manpower-summary-overview', isSummary);
  overview.replaceChildren();
  if (isSummary) {
    const count = document.createElement('div');
    window.PeopleHcmRecordSummary.renderCount(count, manpowerNavigation.records.length);
    overview.append(count);
  } else {
    appendManpowerRows(overview, overviewRows);
  }
  document.getElementById('manpowerDetailList').replaceChildren();
  document.getElementById('manpowerDetailEmpty').hidden = true;
  document.querySelector('.main-content').scrollTop = 0;
  header.focus({ preventScroll: true });
}

function openManpowerSummary(type, group = null) {
  if (!manpowerDetailTitles[type]) return;
  const groups = group ? [group] : renderedManpowerGroups;
  selectedManpowerGroup = group;
  manpowerNavigation = {
    type, group,
    records: groups.flatMap(item => (manpowerPreviewDetails[item.id]?.[type] || []).map(record => ({ ...record, groupId: item.id }))),
    returnFocus: document.activeElement,
    dashboardScroll: document.querySelector('.main-content').scrollTop,
    summaryScroll: 0,
    selectedRecord: null
  };
  renderManpowerSummary();
}

function renderManpowerSummary() {
  const { type, records } = manpowerNavigation;
  currentView = 'summary';
  prepareManpowerDetailView(manpowerDetailTitles[type][0]);
  const list = document.getElementById('manpowerDetailList');
  for (const record of records) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'history-card-item manpower-detail-card manpower-detail-summary-card';
    card.dataset.detailId = record.id;
    card.dataset.groupId = record.groupId;
    card.innerHTML = '<span class="history-time-row manpower-detail-card-header"><strong></strong></span><span class="manpower-detail-card-body"></span>';
    const title = record.shift || 'No Work';
    card.querySelector('.manpower-detail-card-header strong').textContent = title;
    card.setAttribute('aria-label', `${title}, ${type === 'otPlan' ? record.otType + ', ' : type === 'onLeave' ? record.leaveType + ', ' : ''}${record.headcount} employees`);
    appendManpowerRows(card.querySelector('.manpower-detail-card-body'), manpowerSummaryRows(type, record));
    card.addEventListener('click', () => openManpowerEmployees(record));
    list.append(card);
  }
  if (!records.length) {
    const empty = document.getElementById('manpowerDetailEmpty');
    empty.textContent = 'No records match the current filter.';
    empty.hidden = false;
  }
}

function openManpowerEmployees(record) {
  manpowerNavigation.summaryScroll = document.querySelector('.main-content').scrollTop;
  manpowerNavigation.selectedRecord = record;
  renderManpowerEmployees(record);
}

function renderManpowerEmployees(record) {
  const { type } = manpowerNavigation;
  currentView = 'employees';
  const overview = [['Shift', record.shift || '—']];
  if (type === 'otPlan') overview.push(['OT Type', record.otType]);
  if (type === 'onLeave') overview.push(['Leave Type', record.leaveType]);
  overview.push(['Total Headcount', record.headcount]);
  if (type === 'workShift') overview.push(
    ['Total Scheduled Hours', manpowerHours(record.scheduledHours)],
    ['Total Work Hours', manpowerHours(record.workHours)]
  );
  if (type === 'otPlan') overview.push(['Total Hours', manpowerHours(record.hours)]);
  prepareManpowerDetailView(manpowerDetailTitles[type][1], overview);
  const list = document.getElementById('manpowerDetailList');
  for (const employee of record.employees) {
    const card = document.createElement('section');
    card.className = 'history-card-item manpower-detail-card manpower-employee-card';
    card.innerHTML = '<div class="manpower-detail-card-header manpower-employee-identity"><h2 class="manpower-employee-name"></h2><span class="attendance-report-emp"></span></div><div class="manpower-detail-card-body"></div>';
    card.querySelector('.manpower-employee-name').textContent = employee.name;
    card.querySelector('.attendance-report-emp').textContent = `#${employee.empNo.replace(/^#/, '')}`;
    const rows = [['Job Title', employee.jobTitle]];
    if (type === 'workShift') rows.push(
      ['Scheduled Hours', manpowerHours(employee.scheduledHours)], ['Work Hours', manpowerHours(employee.workHours)]
    );
    if (type === 'otPlan') rows.push(['Hours', manpowerHours(employee.hours)]);
    if (type === 'onLeave') rows.push(['Leave Type', employee.leaveType], ['Leave Day', manpowerHours(employee.leaveDay)]);
    appendManpowerRows(card.querySelector('.manpower-detail-card-body'), rows);
    list.append(card);
  }
  if (!record.employees.length) {
    const empty = document.getElementById('manpowerDetailEmpty');
    empty.textContent = 'No employee details available.';
    empty.hidden = false;
  }
}

function backManpowerDetails() {
  if (!manpowerNavigation || currentView === 'dashboard') return false;
  if (currentView === 'employees') {
    const previous = manpowerNavigation.selectedRecord;
    const scroll = manpowerNavigation.summaryScroll;
    renderManpowerSummary();
    const card = [...document.querySelectorAll('.manpower-detail-summary-card')].find(item => item.dataset.detailId === previous.id && Number(item.dataset.groupId) === previous.groupId);
    card?.focus({ preventScroll: true });
    document.querySelector('.main-content').scrollTop = scroll;
    return true;
  }
  document.getElementById('view-details').style.display = 'none';
  document.getElementById('view-dashboard').style.display = 'block';
  document.getElementById('headerTitle').textContent = 'Daily Manpower Summary';
  currentView = 'dashboard';
  selectedManpowerGroup = null;
  const { returnFocus, dashboardScroll } = manpowerNavigation;
  returnFocus?.focus({ preventScroll: true });
  document.querySelector('.main-content').scrollTop = dashboardScroll;
  manpowerNavigation = null;
  return true;
}
