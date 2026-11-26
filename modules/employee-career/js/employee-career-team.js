(() => {
  const $ = id => document.getElementById(id);
  const source = window.EMPLOYEE_CAREER_STAFF_EVENTS || [];
  const events = [
    ['active', 'Active', 281], ['birthday', 'Birthday', 44], ['confirmation', 'Confirmation Due', 3],
    ['retirement-due', 'Retirement Due', 1], ['medical', 'Medical Check', 6],
    ['confirmation-past', 'Confirmation Past Due', 237], ['retirement', 'Retirement Past Due', 80], ['contract', 'Contract Expiry Past Due', 29]
  ].map(([id, title, total]) => ({ id, title, total, records: source.find(item => item.id === id)?.records || [] }));
  const params = new URLSearchParams(location.search);
  const dashboard = Boolean($('employeeCareerStaffEvents'));
  const eventPage = dashboard ? 'options/team/staff-event-details.html' : 'staff-event-details.html';
  let appliedEvent = events.find(item => item.id === params.get('staffEvent'))?.id || '';
  let filterBackground = [];
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function setLink(link, target) {
    const url = new URL(target, location.href);
    url.searchParams.set('theme', document.documentElement.dataset.theme);
    if (appliedEvent) url.searchParams.set('staffEvent', appliedEvent);
    link.href = url.href;
    link.dataset.staffEventLink = '';
  }
  function eventRow(item) {
    const row = element('li');
    const link = element('a', 'employee-career-event-row');
    const url = new URL(eventPage, location.href);
    url.searchParams.set('event', item.id);
    if (!dashboard) url.searchParams.set('from', 'all');
    setLink(link, url);
    link.dataset.careerEventRow = item.id;
    link.append(element('span', '', item.title), element('span', 'employee-career-event-count', String(item.total)));
    row.append(link);
    return row;
  }
  function renderEvents() {
    const selected = events.find(item => item.id === appliedEvent);
    $('employeeCareerEventFilterTrigger').setAttribute('aria-label', `Open Staff Events filter. Current filter: ${selected?.title || 'All Events'}`);
    $('employeeCareerStaffEventCount').textContent = selected ? '1' : String(events.length);
    $('employeeCareerStaffEventRows').replaceChildren(...(selected ? [selected] : events.slice(0, 5)).map(eventRow));
    const all = $('employeeCareerAllEvents');
    all.textContent = `View all events (${events.length})`;
    setLink(all, eventPage);
  }
  function closeEventFilter() {
    const overlay = $('employeeCareerEventFilterOverlay');
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
    $('employeeCareerEventFilterTrigger').setAttribute('aria-expanded', 'false');
    filterBackground.forEach(node => { node.inert = false; });
    filterBackground = [];
    $('employeeCareerEventFilterTrigger').focus({ preventScroll: true });
  }
  function openEventFilter() {
    const overlay = $('employeeCareerEventFilterOverlay');
    const phone = overlay.parentElement;
    $('employeeCareerEventFilter').value = appliedEvent;
    filterBackground = [
      ...[...phone.children].filter(node => node !== overlay && !node.inert),
      ...[...document.body.children].filter(node => node !== phone && !node.inert)
    ];
    filterBackground.forEach(node => { node.inert = true; });
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    $('employeeCareerEventFilterTrigger').setAttribute('aria-expanded', 'true');
    $('employeeCareerEventFilter').focus({ preventScroll: true });
  }
  function applyEventFilter() {
    appliedEvent = $('employeeCareerEventFilter').value;
    const url = new URL(location.href);
    if (appliedEvent) url.searchParams.set('staffEvent', appliedEvent);
    else url.searchParams.delete('staffEvent');
    history.replaceState(history.state, '', url);
    closeEventFilter();
    renderEvents();
  }
  function resetEventFilter() {
    $('employeeCareerEventFilter').value = '';
    applyEventFilter();
  }
  function employeeRow(record) {
    const row = element('li', 'career-event-person');
    const person = element('div');
    person.append(element('strong', 'career-event-person-name', employeeCardHeading.text(record.empNo, record.name)));
    row.append(person);
    if (record.date) {
      const date = element('time', 'career-event-person-date', new Date(record.date + 'T12:00:00').toLocaleDateString('en-GB'));
      date.dateTime = record.date;
      row.append(date);
    }
    return row;
  }
  function renderEventPage() {
    const list = $('staffEventList');
    const back = $('staffEventBack');
    const fromDirectory = params.has('event') && params.get('from') === 'all';
    setLink(back, fromDirectory ? eventPage : '../../index.html?scope=team#employeeCareerStaffEvents');
    if (fromDirectory) back.setAttribute('aria-label', 'Back to all staff events');
    const navigation = window.navigation;
    const previousUrl = navigation?.currentEntry
      ? navigation.entries()[navigation.currentEntry.index - 1]?.url
      : document.referrer;
    if (previousUrl) {
      const previous = new URL(previousUrl);
      back.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = new URL(back.href);
        if (previous.origin !== target.origin || previous.pathname !== target.pathname) return;
        if (['scope', 'staffEvent', 'event'].some(key => previous.searchParams.get(key) !== target.searchParams.get(key))) return;
        if ((previous.searchParams.get('theme') || 'dark') !== target.searchParams.get('theme')) return;
        if (history.length > 1) { event.preventDefault(); history.back(); }
      });
    }
    if (!params.has('event')) {
      list.replaceChildren(...events.map(eventRow));
      return;
    }
    const item = events.find(event => event.id === params.get('event'));
    const title = item?.title || 'Staff Events';
    $('staffEventTitle').textContent = title;
    document.title = `PeopleHCM - ${title}`;
    if (!item?.records.length) {
      list.hidden = true;
      $('staffEventEmpty').textContent = item ? 'No employee details available for this event.' : 'Event not found.';
      $('staffEventEmpty').hidden = false;
      return;
    }
    list.replaceChildren(...item.records.map(employeeRow));
    if (item.records.length < item.total) {
      $('staffEventAvailable').textContent = `Showing ${item.records.length} of ${item.total} employee records.`;
      $('staffEventAvailable').hidden = false;
    }
  }
  function initDashboard() {
    $('employeeCareerActiveHeadcountTotal').textContent = String(events.find(item => item.id === 'active').total);
    events.forEach(item => { const option = element('option', '', item.title); option.value = item.id; $('employeeCareerEventFilter').append(option); });
    $('employeeCareerEventFilterTrigger').addEventListener('click', openEventFilter);
    $('employeeCareerEventFilterClose').addEventListener('click', closeEventFilter);
    $('employeeCareerEventFilterReset').addEventListener('click', resetEventFilter);
    $('employeeCareerEventFilterForm').addEventListener('submit', event => { event.preventDefault(); applyEventFilter(); });
    $('employeeCareerEventFilterOverlay').addEventListener('click', event => { if (event.target === event.currentTarget) closeEventFilter(); });
    $('employeeCareerActiveHeadcount').addEventListener('click', () => {
      const url = new URL('../employee-career/options/team/active-headcount.html', location.href);
      url.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      location.href = url.href;
    });
    $('employeeCareerVacantPositionTotal').textContent = String(window.EMPLOYEE_CAREER_VACANT_POSITION?.total || 0);
    $('employeeCareerVacantPosition').addEventListener('click', () => {
      const url = new URL('options/team/vacant-position.html', location.href);
      url.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      location.href = url.href;
    });
    const pending = (window.EMPLOYEE_CAREER_PENDING_DATA || []).filter(item => !item.status || item.status === 'pending').length;
    $('employeeCareerPendingCount').textContent = String(pending);
    $('employeeCareerTeamTaskCount').textContent = `${pending} ${pending === 1 ? 'Task' : 'Tasks'}`;
    $('employeeCareerPendingApproval').addEventListener('click', () => {
      const url = new URL($('employeeCareerPendingApproval').href);
      url.searchParams.set('theme', document.documentElement.dataset.theme);
      $('employeeCareerPendingApproval').href = url.href;
    });
    document.addEventListener('keydown', event => {
      const filterOverlay = $('employeeCareerEventFilterOverlay');
      if (!filterOverlay.hidden) {
        if (event.key === 'Escape') { event.preventDefault(); closeEventFilter(); }
        if (event.key === 'Tab') {
          const controls = [...filterOverlay.querySelectorAll('button, input, select, [tabindex="0"]')].filter(node => node.getClientRects().length && !node.disabled);
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
    });
    renderEvents();
  }
  if (dashboard) initDashboard();
  else renderEventPage();

  new MutationObserver(() => {
    document.querySelectorAll('[data-staff-event-link]').forEach(link => setLink(link, link.href));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
