(() => {
  // Employees visible in the reference. Values outside the screenshot stay blank.
  const referenceRecords = [
    { empNo: '000030', name: 'Andrew', whereabout: 'Annual Leave' },
    { empNo: '000070', name: 'Yee seong liew', whereabout: 'Medical Leave' },
    { empNo: '82828', name: 'Ewi robert', whereabout: 'Medical Leave' },
    { empNo: 'A9999', name: 'Ali bin ahmad', whereabout: 'Medical Leave' },
    { empNo: 'EBB204', name: 'Juliana binti othman', whereabout: '' }
  ].map(row => ({ date: '2026-10-05', time: '-', project: '-', task: '-', branch: '', department: '', ...row }));
  const records = window.EMPLOYEE_CAREER_STAFF_WHEREABOUT_RECORDS || referenceRecords;
  const $ = id => document.getElementById(id);
  const defaults = { date: '2026-10-05', keyword: '', branch: '', department: '', whereabout: '' };
  const filterIds = { date: 'staffWhereaboutDate', keyword: 'staffWhereaboutKeyword', branch: 'staffWhereaboutBranch', department: 'staffWhereaboutDepartment', whereabout: 'staffWhereaboutType' };
  let applied = { ...defaults };
  let returnFocus = null;
  let inerted = [];
  let openOverlay = null;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function render() {
    const keyword = applied.keyword.toLowerCase().replace(/^#/, '');
    const rows = records.filter(row => row.date === applied.date &&
      (!keyword || `${row.empNo} ${row.name}`.toLowerCase().includes(keyword)) &&
      (!applied.branch || row.branch === applied.branch) &&
      (!applied.department || row.department === applied.department) &&
      (!applied.whereabout || row.whereabout === applied.whereabout)
    );
    const container = $('staffWhereaboutRecords');
    container.replaceChildren();
    rows.forEach((row, index) => {
      const card = element('article', 'staff-whereabout-card');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `View whereabout details for ${row.name}, #${row.empNo}`);
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-controls', 'staffWhereaboutDetails');
      const header = element('header', 'staff-whereabout-card-header');
      header.append(element('h3', 'staff-whereabout-name', row.name), element('span', 'staff-whereabout-emp-no', '#' + row.empNo));
      const arrow = element('i', 'fa-solid fa-chevron-right staff-whereabout-card-chevron');
      arrow.setAttribute('aria-hidden', 'true');
      header.append(arrow);
      const body = element('dl', 'staff-whereabout-card-body');
      body.id = `staffWhereaboutSummary${index}`;
      card.setAttribute('aria-describedby', body.id);
      [['Whereabout', row.whereabout], ['Time', row.time], ['Project', row.project], ['Task', row.task]].forEach(([label, value]) => {
        const field = element('div', 'staff-whereabout-field');
        field.append(element('dt', '', label), element('dd', '', value || '-'));
        body.append(field);
      });
      card.append(header, body);
      card.addEventListener('click', () => showDetails(row));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetails(row); }
      });
      container.append(card);
    });
    $('staffWhereaboutEmpty').hidden = rows.length > 0;
    $('staffWhereaboutTotal').textContent = String(rows.length);
    const currentDate = $('staffWhereaboutCurrentDate');
    currentDate.dateTime = applied.date;
    currentDate.textContent = new Date(applied.date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    $('staffWhereaboutDate').value = applied.date;
    const summary = [];
    if (applied.keyword) summary.push(`Search: ${applied.keyword}`);
    if (applied.branch) summary.push(applied.branch);
    if (applied.department) summary.push(applied.department);
    if (applied.whereabout) summary.push(applied.whereabout);
    $('staffWhereaboutFilterSummary').textContent = summary.join(' · ') || 'All Employees';
  }

  function changeDate(offset) {
    const [year, month, day] = applied.date.split('-').map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
    applied.date = nextDate;
    render();
  }

  function validateDate() {
    const valid = Boolean($('staffWhereaboutDate').value && $('staffWhereaboutDate').validity.valid);
    $('staffWhereaboutFilterError').hidden = valid;
    if (valid) $('staffWhereaboutDate').removeAttribute('aria-invalid');
    else $('staffWhereaboutDate').setAttribute('aria-invalid', 'true');
    return valid;
  }

  function fillFilter(values) {
    Object.entries(filterIds).forEach(([key, id]) => { $(id).value = values[key]; });
    validateDate();
  }

  function show(overlay, focus) {
    returnFocus = document.activeElement;
    openOverlay = overlay;
    overlay.hidden = false;
    if (overlay.classList.contains('standard-filter-sheet')) overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    inerted = [...overlay.parentElement.children].filter(node => node !== overlay && !node.inert);
    inerted.forEach(node => { node.inert = true; });
    focus.focus({ preventScroll: true });
  }

  function close() {
    if (!openOverlay) return;
    const overlay = openOverlay;
    overlay.hidden = true;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    inerted.forEach(node => { node.inert = false; });
    inerted = [];
    openOverlay = null;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function openFilter() {
    fillFilter(applied);
    show($('staffWhereaboutFilterOverlay'), $('staffWhereaboutDate'));
  }

  function showDetails(row) {
    const body = $('staffWhereaboutDetailFields');
    body.replaceChildren();
    const date = row.date ? new Date(row.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    const fields = [['Name', row.name], ['Branch', row.branch], ['Department', row.department], ['Project', row.project], ['Task', row.task], ['State', row.state], ['Date', date], ['Description', row.description], ['Status', row.status], ['Remark', row.remark ?? row.remarks]];
    fields.forEach(([label, value]) => {
      const field = element('tr', '');
      const heading = element('th', 'detail-popout-label', label);
      heading.scope = 'row';
      const cell = element('td', 'detail-popout-value');
      if (label === 'Name') {
        cell.append(element('strong', 'staff-whereabout-detail-name', value || '-'));
      } else cell.append(label === 'Status' ? recordDetailStatus.create(value) : value || '-');
      field.append(heading, cell);
      body.append(field);
    });
    $('staffWhereaboutDetails').querySelector('.detail-popout-body').scrollTop = 0;
    show($('staffWhereaboutDetails'), $('staffWhereaboutCloseDetails'));
  }

  function apply() {
    if (!validateDate()) { $('staffWhereaboutDate').focus(); return; }
    applied = Object.fromEntries(Object.entries(filterIds).map(([key, id]) => [key, $(id).value.trim()]));
    close();
    render();
    document.querySelector('main').scrollTop = 0;
  }

  function init() {
    ['branch', 'department', 'whereabout'].forEach(key => {
      [...new Set(records.map(row => row[key]).filter(Boolean))].sort().forEach(value => {
        const option = element('option', '', value);
        option.value = value;
        $(filterIds[key]).append(option);
      });
    });
    $('staffWhereaboutFilterTrigger').addEventListener('click', openFilter);
    $('staffWhereaboutPreviousDate').addEventListener('click', () => changeDate(-1));
    $('staffWhereaboutNextDate').addEventListener('click', () => changeDate(1));
    ['staffWhereaboutCloseFilter', 'staffWhereaboutCloseDetails'].forEach(id => $(id).addEventListener('click', close));
    $('staffWhereaboutResetFilter').addEventListener('click', () => { fillFilter(defaults); apply(); });
    $('staffWhereaboutFilterForm').addEventListener('submit', event => { event.preventDefault(); apply(); });
    $('staffWhereaboutDate').addEventListener('input', validateDate);
    ['staffWhereaboutFilterOverlay', 'staffWhereaboutDetails'].forEach(id => $(id).addEventListener('click', event => { if (event.target === event.currentTarget) close(); }));
    document.addEventListener('keydown', event => {
      if (!openOverlay) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'Tab') {
        const controls = [...openOverlay.querySelectorAll('button, input, select')].filter(node => !node.disabled && node.getClientRects().length);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    render();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
