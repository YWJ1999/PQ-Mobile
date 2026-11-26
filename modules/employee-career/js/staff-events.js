(() => {
  const categories = window.EMPLOYEE_CAREER_STAFF_EVENTS;
  const $ = id => document.getElementById(id);
  const defaults = { keyword: '', start: '', end: '', eventType: '' };
  const filterIds = { keyword: 'staffEventKeyword', start: 'staffEventStartDate', end: 'staffEventEndDate', eventType: 'staffEventType' };
  let filters = { ...defaults };
  let returnFocus = null;
  let inerted = [];
  let openOverlay = null;
  const matches = category => category.records.filter(row =>
    (!filters.keyword || `${row.empNo} ${row.name}`.toLowerCase().includes(filters.keyword.toLowerCase().replace(/^#/, ''))) &&
    (!filters.start || (row.date && row.date >= filters.start)) &&
    (!filters.end || (row.date && row.date <= filters.end))
  );
  const count = category => filters.keyword || filters.start || filters.end ? matches(category).length : category.total;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const formatDate = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

  function render() {
    $('staffEventOverview').replaceChildren();
    $('staffEventCategories').replaceChildren();
    const visibleCategories = categories.filter(category => !filters.eventType || category.id === filters.eventType);
    const eventCount = visibleCategories.filter(category => category.id !== 'active').length;
    $('staffEventOverview').hidden = !visibleCategories.some(category => category.id === 'active');
    $('staffEventSectionHeading').hidden = eventCount === 0;
    $('staffEventCategoryCount').textContent = `${eventCount} ${eventCount === 1 ? 'category' : 'categories'}`;
    visibleCategories.forEach(category => {
      const card = element('button', 'staff-event-card' + (category.id === 'active' ? ' is-overview' : ''));
      card.type = 'button';
      card.dataset.staffEvent = category.id;
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-controls', 'staffEventDetails');
      const icon = element('span', 'staff-event-icon');
      const glyph = element('i', 'fa-solid ' + category.icon);
      glyph.setAttribute('aria-hidden', 'true');
      icon.append(glyph);
      const copy = element('span', 'staff-event-copy');
      copy.append(element('span', 'staff-event-title', category.title), element('span', 'staff-event-description', category.description));
      const arrow = element('i', 'fa-solid fa-chevron-right staff-event-chevron');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(icon, copy, element('span', 'staff-event-count', String(count(category))), arrow);
      card.addEventListener('click', () => showDetails(category));
      $(category.id === 'active' ? 'staffEventOverview' : 'staffEventCategories').append(card);
    });
    const summary = [];
    if (filters.keyword) summary.push(`Search: ${filters.keyword}`);
    if (filters.start && filters.end) summary.push(`${formatDate(filters.start)} – ${formatDate(filters.end)}`);
    else if (filters.start) summary.push(`From ${formatDate(filters.start)}`);
    else if (filters.end) summary.push(`Until ${formatDate(filters.end)}`);
    if (filters.eventType) summary.push(categories.find(category => category.id === filters.eventType).title);
    $('staffEventFilterSummary').textContent = summary.join(' · ') || 'All Employees';
  }

  function show(overlay, focus) {
    returnFocus = document.activeElement;
    openOverlay = overlay;
    inerted = [...overlay.parentElement.children].filter(node => node !== overlay && !node.inert);
    inerted.forEach(node => { node.inert = true; });
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    if (overlay.classList.contains('standard-filter-sheet')) overlay.classList.add('is-open');
    focus.focus({ preventScroll: true });
  }

  function close() {
    if (!openOverlay) return;
    openOverlay.hidden = true;
    openOverlay.setAttribute('aria-hidden', 'true');
    openOverlay.classList.remove('is-open');
    inerted.forEach(node => { node.inert = false; });
    inerted = [];
    openOverlay = null;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function showDetails(category) {
    const rows = matches(category);
    const total = count(category);
    $('staffEventDetailsTitle').textContent = category.title;
    $('staffEventDetailsCount').textContent = String(total);
    const body = $('staffEventPeople');
    body.replaceChildren();
    rows.forEach(row => {
      const item = element('tr', 'staff-event-person');
      const employee = element('td', 'staff-event-person-identity');
      employee.append(element('strong', 'staff-event-person-name', row.name), element('span', 'staff-event-person-id', formatEmployeeNumber(row.empNo)));
      const date = element('td', 'staff-event-person-date-column');
      const value = element(row.date ? 'time' : 'span', 'staff-event-person-date', formatDate(row.date));
      if (row.date) value.dateTime = row.date;
      date.append(value);
      item.append(employee, date);
      body.append(item);
    });
    $('staffEventDetailsEmpty').hidden = rows.length > 0;
    $('staffEventDetails').querySelector('.detail-popout-body').scrollTop = 0;
    show($('staffEventDetails'), $('staffEventCloseDetails'));
  }

  function validateDates() {
    const invalid = $('staffEventStartDate').value && $('staffEventEndDate').value && $('staffEventEndDate').value < $('staffEventStartDate').value;
    $('staffEventFilterError').hidden = !invalid;
    if (invalid) $('staffEventEndDate').setAttribute('aria-invalid', 'true');
    else $('staffEventEndDate').removeAttribute('aria-invalid');
    return !invalid;
  }

  function fillFilter(values) {
    Object.entries(filterIds).forEach(([key, id]) => { $(id).value = values[key]; });
    validateDates();
  }

  function apply() {
    if (!validateDates()) { $('staffEventEndDate').focus(); return; }
    filters = Object.fromEntries(Object.entries(filterIds).map(([key, id]) => [key, $(id).value.trim()]));
    // Close before replacing cards, so no detached background element remains inert.
    close();
    render();
  }

  function init() {
    categories.forEach(category => {
      const option = element('option', '', category.title);
      option.value = category.id;
      $('staffEventType').append(option);
    });
    $('staffEventFilterTrigger').addEventListener('click', () => {
      fillFilter(filters);
      show($('staffEventFilterOverlay'), $('staffEventKeyword'));
    });
    $('staffEventFilterForm').addEventListener('submit', event => { event.preventDefault(); apply(); });
    $('staffEventFilterForm').addEventListener('input', validateDates);
    $('staffEventResetFilter').addEventListener('click', () => { fillFilter(defaults); apply(); });
    ['staffEventCloseDetails', 'staffEventCloseFilter'].forEach(id => $(id).addEventListener('click', close));
    ['staffEventDetails', 'staffEventFilterOverlay'].forEach(id => $(id).addEventListener('click', event => { if (event.target === event.currentTarget) close(); }));
    document.addEventListener('keydown', event => {
      if (!openOverlay) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'Tab') {
        const controls = [...openOverlay.querySelectorAll('button, input, select, [tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length);
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
