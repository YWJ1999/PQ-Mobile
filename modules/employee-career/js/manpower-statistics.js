(() => {
  const records = window.MANPOWER_STATISTICS_DATA;
  const staffRecords = window.MANPOWER_STATISTICS_STAFF || [];
  const $ = id => document.getElementById(id);
  const defaults = { company: '', branch: '', department: '', summaryBy: 'jobType', summaryType: 'headcount', effectiveDate: '2026-10-05' };
  const labels = { category: 'Category', gender: 'Gender', grade: 'Grade', jobType: 'Job Type', skillGroup: 'Skill Group', talentGroup: 'Talent Group', company: 'Company', branch: 'Branch', department: 'Department' };
  const plurals = { category: 'categories', gender: 'genders', grade: 'grades', jobType: 'job types', skillGroup: 'skill groups', talentGroup: 'talent groups', company: 'companies', branch: 'branches', department: 'departments' };
  const employeeBreakdowns = new Set(['category', 'gender', 'grade', 'skillGroup', 'talentGroup']);
  const colors = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
  const state = {
    filters: { ...defaults },
    rows: [],
    filteredStaff: [],
    view: 'table',
    metric: 'jobType',
    showAll: false,
    tableScroll: 0,
    selectedGroupLabel: '',
    staffTrigger: null,
    activeOverlay: null,
    detailTrigger: null
  };
  const fieldIds = { company: 'manpowerCompany', branch: 'manpowerBranch', department: 'manpowerDepartment', summaryBy: 'manpowerSummaryBy', summaryType: 'manpowerSummaryType', effectiveDate: 'manpowerEffectiveDate' };
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function formatDate(date) {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function isEffectiveOn(record, effectiveDate) {
    return Boolean(effectiveDate)
      && record.effectiveFrom <= effectiveDate
      && (!record.effectiveTo || effectiveDate <= record.effectiveTo);
  }
  function getFilteredStaff(filters) {
    return staffRecords.filter(employee => isEffectiveOn(employee, filters.effectiveDate)
      && ['company', 'branch', 'department'].every(key => !filters[key] || employee[key] === filters[key]));
  }
  function groupLabel(record, metric) {
    const value = record?.[metric];
    return value === undefined || value === null || value === '' ? '—' : String(value);
  }
  function getGroupStaff(metric, label) {
    return state.filteredStaff.filter(employee => groupLabel(employee, metric) === label);
  }
  function resolveGroupStaff(label) {
    const group = groupRows(state.filters.summaryBy).find(entry => entry.label === label);
    const staff = getGroupStaff(state.filters.summaryBy, label);
    if (!group || staff.length !== group.count) {
      $('manpowerDrilldownStatus').textContent = `Staff records for ${label} are unavailable. Refresh the current filter and try again.`;
      return null;
    }
    $('manpowerDrilldownStatus').textContent = '';
    return staff;
  }
  function yearsBetween(start, end) {
    const startDate = new Date(start + 'T00:00:00Z');
    const endDate = new Date(end + 'T00:00:00Z');
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate < startDate) return 0;
    return (endDate - startDate) / (365.2425 * 24 * 60 * 60 * 1000);
  }
  function formatNumber(value) {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }
  function formatMoney(value) {
    return Number.isFinite(value)
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';
  }
  function summarizeGroup(label, staff) {
    const average = field => staff.length
      ? staff.reduce((total, employee) => total + (Number(employee[field]) || 0), 0) / staff.length
      : 0;
    const pay = staff.map(employee => Number(employee.basicPay) || 0).sort((a, b) => a - b);
    const middle = Math.floor(pay.length / 2);
    const medianPay = !pay.length ? 0 : pay.length % 2 ? pay[middle] : (pay[middle - 1] + pay[middle]) / 2;
    const age = staff.length
      ? staff.reduce((total, employee) => total + yearsBetween(employee.birthDate, state.filters.effectiveDate), 0) / staff.length
      : 0;
    const service = staff.length
      ? staff.reduce((total, employee) => total + yearsBetween(employee.hireDate, state.filters.effectiveDate), 0) / staff.length
      : 0;
    return [
      ['Description', label],
      ['Headcount', String(staff.length)],
      ['Average Age', formatNumber(age)],
      ['Average Service Years', formatNumber(service)],
      ['Average Competency Points', formatNumber(average('competencyPoints'))],
      ['Average Competency Match %', formatNumber(average('competencyMatchPercent'))],
      ['Average Basic Pay', formatMoney(average('basicPay'))],
      ['Median Basic Pay', formatMoney(medianPay)],
      ['Minimum Basic Pay', formatMoney(pay.length ? pay[0] : 0)],
      ['Maximum Basic Pay', formatMoney(pay.length ? pay[pay.length - 1] : 0)],
      ['Average Increment %', formatNumber(average('incrementPercent'))],
      ['Average Bonus Factor', formatNumber(average('bonusFactor'))],
      ['Attendance %', formatNumber(average('attendancePercent'))],
      ['Average Monthly OT Hours', formatNumber(average('monthlyOtHours'))],
      ['Average Training Cost', formatMoney(average('trainingCost'))],
      ['Average Performance Score', formatNumber(average('performanceScore'))],
      ['Annual Attrition %', formatNumber(average('annualAttritionPercent'))]
    ];
  }
  function groupRows(metric) {
    const grouped = new Map();
    const useEmployees = employeeBreakdowns.has(metric);
    const source = useEmployees ? state.filteredStaff : state.rows;
    source.forEach(row => {
      const label = groupLabel(row, metric);
      grouped.set(label, (grouped.get(label) || 0) + (useEmployees ? 1 : row.headcount));
    });
    return [...grouped].map(([label, count]) => ({ label, count }));
  }
  function renderTable() {
    const filters = state.filters;
    state.rows = records.filter(row => isEffectiveOn(row, filters.effectiveDate)
      && ['company', 'branch', 'department'].every(key => !filters[key] || row[key] === filters[key])
      && row.headcount > 0);
    state.filteredStaff = getFilteredStaff(filters);
    const groups = groupRows(filters.summaryBy).sort((a, b) => a.label.localeCompare(b.label));
    const body = $('manpowerTable').tBodies[0];
    body.replaceChildren();
    groups.forEach(group => {
      const row = node('tr');
      const descriptionCell = node('td');
      const description = node('button', 'manpower-description-link', group.label);
      description.type = 'button';
      description.setAttribute('aria-label', `View statistics for ${group.label}`);
      description.addEventListener('click', () => openGroupStatistics(group.label, description));
      descriptionCell.append(description);
      const headcountCell = node('td');
      const headcount = node('button', 'manpower-headcount-link', group.count);
      headcount.type = 'button';
      headcount.setAttribute('aria-label', `View ${group.count} staff records for ${group.label}`);
      headcount.addEventListener('click', () => showStaffRecords(group.label, headcount));
      headcountCell.append(headcount);
      row.append(descriptionCell, headcountCell);
      body.append(row);
    });
    $('manpowerEmpty').hidden = groups.length !== 0;
    $('manpowerTotalRecords').textContent = groups.length;
    $('manpowerTotalHeadcount').textContent = state.rows.reduce((sum, row) => sum + row.headcount, 0);
    const summary = ['company', 'branch', 'department'].map(key => filters[key]).filter(Boolean);
    if (!summary.length) summary.push('All Employees');
    summary.push(labels[filters.summaryBy] + ' · Headcount');
    $('manpowerFilterSummary').textContent = summary.join(' >> ');
  }
  function setPageInert(value) {
    ['main', '.employee-career-header', 'phone-bottom-nav'].forEach(selector => {
      const element = document.querySelector(selector);
      if (element) element.inert = value;
    });
  }
  function closeDetailOverlay(restoreFocus = true) {
    const overlay = state.activeOverlay;
    const trigger = state.detailTrigger;
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    state.activeOverlay = null;
    state.detailTrigger = null;
    setPageInert(false);
    if (restoreFocus) {
      const focusTarget = trigger && trigger.isConnected ? trigger : $('manpowerFilterTrigger');
      focusTarget?.focus({ preventScroll: true });
    }
  }
  function trapOverlayFocus(event, overlay) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDetailOverlay();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.disabled && !element.hidden);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function openGroupStatistics(label, trigger) {
    const staff = resolveGroupStaff(label);
    if (!staff) return;
    const body = $('manpowerStatisticsDetails').tBodies[0];
    body.replaceChildren();
    summarizeGroup(label, staff).forEach(([field, value]) => {
      const row = node('tr');
      const heading = node('th', '', field);
      heading.scope = 'row';
      row.append(heading, node('td', '', value));
      body.append(row);
    });
    const overlay = $('manpowerStatisticsOverlay');
    state.activeOverlay = overlay;
    state.detailTrigger = trigger;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    setPageInert(true);
    $('manpowerStatisticsClose').focus({ preventScroll: true });
  }
  function renderChart() {
    const all = groupRows(state.metric).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map((group, index) => ({ ...group, color: colors[index % colors.length] }));
    const shown = state.showAll || all.length <= 5 ? all : [...all.slice(0, 5), {
      label: 'Others', count: all.slice(5).reduce((sum, group) => sum + group.count, 0), color: '#94a3b8'
    }];
    const total = all.reduce((sum, group) => sum + group.count, 0);
    const title = 'Headcount by ' + labels[state.metric].toLowerCase();
    $('manpowerChartTitle').textContent = title;
    $('manpowerChartColumn').textContent = labels[state.metric];
    $('manpowerChartDonut').setAttribute('aria-label', `${title}: ${total} people`);
    $('manpowerChartTotal').textContent = total;
    $('manpowerChartNote').textContent = !total ? 'No records match the current filter' : !state.showAll && all.length > 5 ? `Top 5 categories + other ${plurals[state.metric]}` : `All ${plurals[state.metric]}`;
    $('manpowerChartSegments').replaceChildren();
    $('manpowerChartLegend').replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    shown.forEach(group => {
      const length = group.count / total * circumference;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: group.color, 'stroke-width': 22, 'stroke-dasharray': `${length} ${circumference - length}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
      const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      tooltip.textContent = `${group.label}: ${group.count} people (${(group.count / total * 100).toFixed(1)}%)`;
      circle.append(tooltip);
      $('manpowerChartSegments').append(circle);
      offset += length;
      const row = node('div', 'staff-list-legend-row manpower-legend-grid');
      const name = node('div', 'staff-list-legend-name');
      const swatch = node('i');
      swatch.style.background = group.color;
      swatch.setAttribute('aria-hidden', 'true');
      name.append(swatch, node('span', '', group.label));
      const count = node('strong', '', group.count);
      count.dataset.count = group.count;
      row.append(name, count, node('span', '', (group.count / total * 100).toFixed(1) + '%'));
      $('manpowerChartLegend').append(row);
    });
    if (!total) $('manpowerChartLegend').append(node('p', 'staff-list-chart-note', 'No Manpower Records Found'));
    $('manpowerChartViewAllFooter').hidden = all.length <= 5;
    $('manpowerChartViewAll').setAttribute('aria-expanded', String(state.showAll));
    $('manpowerChartViewAll').querySelector('span').textContent = state.showAll ? 'Show top 5' : 'View all ' + plurals[state.metric];
    $('manpowerChartViewAll').querySelector('i').className = 'fa-solid ' + (state.showAll ? 'fa-chevron-up' : 'fa-chevron-down');
  }
  function renderStaffRecords(staff) {
    const list = $('manpowerStaffList');
    list.replaceChildren();
    staff.forEach(employee => {
      const card = node('button', 'manpower-employee-card');
      card.type = 'button';
      card.dataset.empNo = employee.empNo;
      card.setAttribute('aria-label', `View employee details for ${employeeCardHeading.text(employee.empNo, employee.name)}`);
      const content = node('span', 'manpower-employee-card-content');
      const identity = node('span', 'manpower-employee-identity');
      identity.append(node('span', 'employee-name', employeeCardHeading.text(employee.empNo, employee.name)));
      const details = node('span', 'manpower-employee-card-details');
      const position = node('span', 'manpower-employee-card-row');
      position.append(node('span', '', 'Position'), node('strong', '', employee.position || '—'));
      const department = node('span', 'manpower-employee-card-row');
      department.append(node('span', '', 'Department'), node('strong', '', employee.department || '—'));
      details.append(position, department);
      content.append(identity, details);
      card.append(content);
      card.addEventListener('click', () => openEmployeeDetails(employee.empNo, card));
      list.append(card);
    });
    $('manpowerStaffTotalRecords').textContent = staff.length;
    $('manpowerStaffEmpty').hidden = staff.length !== 0;
  }
  function showStaffRecords(label, trigger) {
    const staff = resolveGroupStaff(label);
    if (!staff) {
      showView('table');
      return;
    }
    state.selectedGroupLabel = label;
    state.staffTrigger = trigger;
    renderStaffRecords(staff);
    showView('staff');
  }
  function employeeInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '?';
  }
  function openEmployeeDetails(empNo, trigger) {
    const employee = getGroupStaff(state.filters.summaryBy, state.selectedGroupLabel)
      .find(record => String(record.empNo) === String(empNo));
    if (!employee) return;
    const value = entry => entry === undefined || entry === null || entry === '' ? '—' : String(entry);
    const details = [
      ['Employee No.', formatEmployeeNumber(employee.empNo)],
      ['Name', value(employee.name)],
      ['Position', value(employee.position)],
      ['Superior', value(employee.superior)],
      ['Job', value(employee.job)],
      ['Company', value(employee.company)],
      ['Branch', value(employee.branch)],
      ['Base', value(employee.base)],
      ['Division', value(employee.division)],
      ['Department', value(employee.department)],
      ['Section', value(employee.section)],
      ['Cost Center', value(employee.costCenter)],
      ['Line', value(employee.line)],
      ['Service Years', formatNumber(yearsBetween(employee.hireDate, state.filters.effectiveDate))]
    ];
    const body = $('manpowerEmployeeDetails').tBodies[0];
    body.replaceChildren();
    details.forEach(([field, detail]) => {
      const row = node('tr');
      const heading = node('th', '', field);
      heading.scope = 'row';
      row.append(heading, node('td', '', detail));
      body.append(row);
    });
    const portrait = $('manpowerEmployeePortrait');
    portrait.replaceChildren();
    if (employee.photo) {
      const image = node('img');
      image.src = employee.photo;
      image.alt = `${employee.name} portrait`;
      image.addEventListener('error', () => {
        portrait.replaceChildren(node('span', 'manpower-employee-avatar', employeeInitials(employee.name)));
        portrait.firstElementChild.id = 'manpowerEmployeeAvatar';
        portrait.firstElementChild.setAttribute('aria-hidden', 'true');
      }, { once: true });
      portrait.append(image);
    } else {
      const avatar = node('span', 'manpower-employee-avatar', employeeInitials(employee.name));
      avatar.id = 'manpowerEmployeeAvatar';
      avatar.setAttribute('aria-hidden', 'true');
      portrait.append(avatar);
    }
    const overlay = $('manpowerEmployeeOverlay');
    state.activeOverlay = overlay;
    state.detailTrigger = trigger;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    setPageInert(true);
    $('manpowerEmployeeClose').focus({ preventScroll: true });
  }
  function showView(view) {
    const main = document.querySelector('main');
    if (state.view === 'table' && view !== 'table') state.tableScroll = main.scrollTop;
    state.view = view;
    $('manpowerTableView').hidden = view !== 'table';
    $('manpowerChartView').hidden = view !== 'chart';
    $('manpowerStaffView').hidden = view !== 'staff';
    $('manpowerTitle').textContent = view === 'chart'
      ? 'Manpower Analysis'
      : view === 'staff' ? `${state.selectedGroupLabel} Staff Records` : 'Manpower Statistics';
    $('manpowerBack').setAttribute('aria-label', view === 'table' ? 'Back to Employee and Career' : 'Back to Manpower Statistics');
    main.scrollTop = view === 'table' ? state.tableScroll : 0;
  }
  function populateFilter() {
    Object.entries(fieldIds).forEach(([key, id]) => { $(id).value = state.filters[key]; });
  }
  function openFilter() {
    populateFilter();
    $('manpowerFilterOverlay').hidden = false;
    $('manpowerFilterOverlay').classList.add('is-open');
    setPageInert(true);
    $('manpowerCompany').focus();
  }
  function closeFilter() {
    $('manpowerFilterOverlay').hidden = true;
    $('manpowerFilterOverlay').classList.remove('is-open');
    setPageInert(false);
    $('manpowerFilterTrigger').focus();
  }
  function applyFilters(filters) {
    closeDetailOverlay(false);
    showView('table');
    state.filters = filters;
    state.metric = [...$('manpowerChartMetric').options].some(option => option.value === filters.summaryBy) ? filters.summaryBy : 'jobType';
    state.showAll = false;
    $('manpowerChartMetric').value = state.metric;
    state.tableScroll = 0;
    renderTable();
    renderChart();
    closeFilter();
    document.querySelector('main').scrollTop = 0;
  }
  ['company', 'branch', 'department'].forEach(key => {
    const select = $(fieldIds[key]);
    const all = node('option', '', '- All -');
    all.value = '';
    select.append(all);
    [...new Set(records.map(row => row[key]))].sort().forEach(value => {
      const option = node('option', '', value);
      option.value = value;
      select.append(option);
    });
  });
  $('manpowerFilterTrigger').addEventListener('click', openFilter);
  $('manpowerCloseFilter').addEventListener('click', closeFilter);
  $('manpowerResetFilter').addEventListener('click', () => applyFilters({ ...defaults }));
  $('manpowerFilterOverlay').addEventListener('click', event => { if (event.target === event.currentTarget) closeFilter(); });
  $('manpowerFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!$('manpowerFilterForm').reportValidity()) return;
    applyFilters(Object.fromEntries(Object.entries(fieldIds).map(([key, id]) => [key, $(id).value])));
  });
  $('manpowerFilterOverlay').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeFilter(); }
    if (event.key !== 'Tab') return;
    const controls = [...$('manpowerFilterForm').querySelectorAll('button, input, select')].filter(element => !element.disabled);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  $('manpowerStatisticsClose').addEventListener('click', () => closeDetailOverlay());
  $('manpowerStatisticsOverlay').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeDetailOverlay();
  });
  $('manpowerStatisticsOverlay').addEventListener('keydown', event => trapOverlayFocus(event, $('manpowerStatisticsOverlay')));
  $('manpowerEmployeeClose').addEventListener('click', () => closeDetailOverlay());
  $('manpowerEmployeeOverlay').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeDetailOverlay();
  });
  $('manpowerEmployeeOverlay').addEventListener('keydown', event => trapOverlayFocus(event, $('manpowerEmployeeOverlay')));
  $('manpowerViewChart').addEventListener('click', () => {
    renderChart();
    showView('chart');
    $('manpowerChartMetric').focus({ preventScroll: true });
  });
  $('manpowerBack').addEventListener('click', event => {
    if (state.view === 'table') return;
    event.preventDefault();
    const previousView = state.view;
    showView('table');
    const focusTarget = previousView === 'staff' && state.staffTrigger?.isConnected
      ? state.staffTrigger
      : $('manpowerViewChart');
    focusTarget.focus({ preventScroll: true });
  });
  $('manpowerChartMetric').addEventListener('change', event => {
    state.metric = event.target.value;
    state.showAll = false;
    renderChart();
  });
  $('manpowerChartViewAll').addEventListener('click', () => { state.showAll = !state.showAll; renderChart(); });
  populateFilter();
  renderTable();
  renderChart();
})();
