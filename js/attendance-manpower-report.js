let renderedManpowerGroups = [];
let renderedManpowerScope = {};
let manpowerNavigation = null;
const manpowerDetailTitles = {
  workShift: ['Work Shift Summary', 'Work Shift Employee Detail'],
  noWork: ['No Work Summary', 'No Work Employee Detail'],
  otPlan: ['OT Plan Summary', 'OT Plan Employee Detail'],
  onLeave: ['Leave Summary', 'Leave Employee Detail']
};
const manpowerShiftViews = {
  workShift: { summary: 'work-shift-summary', employees: 'work-shift-employee-detail' },
  noWork: { summary: 'no-work-summary', employees: 'no-work-employee-detail' },
  otPlan: { summary: 'ot-plan-summary', employees: 'ot-plan-employee-detail' },
  onLeave: { summary: 'leave-summary', employees: 'leave-employee-detail' }
};

function renderManpowerCards(container, records, scope = {}) {
  renderedManpowerGroups = [...records];
  renderedManpowerScope = scope;
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

function prepareManpowerDetailView(title) {
  const header = document.getElementById('headerTitle');
  header.textContent = title;
  header.tabIndex = -1;
  document.getElementById('view-dashboard').style.display = 'none';
  document.getElementById('view-details').style.display = 'block';
  document.getElementById('manpowerDetailList').replaceChildren();
  document.querySelector('.main-content').scrollTop = 0;
  header.focus({ preventScroll: true });

  const scope = document.getElementById('manpowerDetailScope');
  scope.hidden = !manpowerNavigation.group || ['workShift', 'noWork'].includes(manpowerNavigation.type);
  if (!scope.hidden) {
    const group = manpowerNavigation.group;
    scope.textContent = `${group.company} · ${group.section} · ${group.costCenter}`;
  }
}

function manpowerSummaryScope({ company, section, costCenter }) {
  function optionLabel(selectId, value) {
    if (!value || value === 'all') return '';
    const option = Array.from(document.getElementById(selectId).options).find(item => item.value === value);
    return option?.label || value;
  }
  return {
    company: company === 'all' ? '' : company,
    section: optionLabel('filterSectionSelect', section).replace(/ Section$/, ''),
    costCenter: optionLabel('filterCostCenterSelect', costCenter)
  };
}

function openManpowerSummary(type, group = null) {
  if (!manpowerDetailTitles[type]) return;
  const groups = group ? [group] : renderedManpowerGroups;
  const dateKey = formatDateISO(currentDateObj);
  selectedManpowerGroup = group;
  manpowerNavigation = {
    type, group,
    records: groups.flatMap(item => getManpowerPreviewRecords(item.id, type, dateKey).map(record => ({ ...record, groupId: item.id }))),
    returnFocus: document.activeElement,
    dashboardScroll: document.querySelector('.main-content').scrollTop,
    summaryScroll: 0,
    selectedRecord: null
  };
  renderManpowerSummary();
}

function renderManpowerSummary() {
  const { type, group, records } = manpowerNavigation;
  currentView = 'summary';
  prepareManpowerDetailView(manpowerDetailTitles[type][0]);
  const list = document.getElementById('manpowerDetailList');
  if (!manpowerNavigation.summaryElement) {
    const summary = document.createElement(manpowerShiftViews[type].summary);
    summary.render({
      date: currentDateObj,
      scope: manpowerSummaryScope(group || renderedManpowerScope),
      records,
      onSelect: openManpowerEmployees
    });
    manpowerNavigation.summaryElement = summary;
  }
  list.append(manpowerNavigation.summaryElement);
}

function openManpowerEmployees(record) {
  manpowerNavigation.summaryScroll = document.querySelector('.main-content').scrollTop;
  manpowerNavigation.selectedRecord = record;
  renderManpowerEmployees(record);
}

function renderManpowerEmployees(record) {
  const { type } = manpowerNavigation;
  currentView = 'employees';
  prepareManpowerDetailView(manpowerDetailTitles[type][1]);
  const detail = document.createElement(manpowerShiftViews[type].employees);
  detail.render({ ...record, date: currentDateObj });
  document.getElementById('manpowerDetailList').append(detail);
}

function backManpowerDetails() {
  if (!manpowerNavigation || currentView === 'dashboard') return false;
  if (currentView === 'employees') {
    const previous = manpowerNavigation.selectedRecord;
    const scroll = manpowerNavigation.summaryScroll;
    renderManpowerSummary();
    const card = [...document.querySelectorAll('#manpowerDetailList [data-detail-id]')].find(item => item.dataset.detailId === previous.id && Number(item.dataset.groupId) === previous.groupId);
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
