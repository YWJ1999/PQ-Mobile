(() => {
  const source = window.TRAINING_CALENDAR_DATA || { initialMonth: '2026-10', events: [] };
  const pageType = document.body.dataset.trainingCalendarPage;
  const params = new URLSearchParams(location.search);
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

  function parseDateKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function formatDate(value) {
    const date = parseDateKey(value);
    return date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : value;
  }

  function formatTime(value) {
    const match = /T(\d{2}):(\d{2})/.exec(value || '');
    if (!match) return '-';
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  function formatDateTime(value) {
    const [key] = (value || '').split('T');
    return `${formatDate(key)}, ${formatTime(value)}`;
  }

  function dashboardUrl(date) {
    return `../index.html?scope=individual&date=${encodeURIComponent(date)}&theme=${theme()}`;
  }

  function detailsUrl(event) {
    const query = new URLSearchParams({ request: event.id, date: event.date, theme: theme() });
    return `options/training-request-details.html?${query}`;
  }

  function initDashboardCalendar() {
    const section = document.getElementById('trainingCalendarSection');
    const grid = document.getElementById('trainingCalendarGrid');
    const monthTitle = document.getElementById('trainingCalendarMonth');
    const eventOverlay = document.getElementById('trainingCalendarSheet');
    const eventList = document.getElementById('trainingCalendarEvents');
    const eventDate = document.getElementById('trainingCalendarSheetDate');
    const eventClose = document.getElementById('trainingCalendarSheetClose');
    const classDetailsOverlay = document.getElementById('trainingClassDetailsModal');
    const classDetailsFields = document.getElementById('trainingClassDetailsFields');
    const classDetailsClose = document.getElementById('trainingClassDetailsClose');
    const main = document.querySelector('main');
    const calendarFragment = location.hash === '#trainingCalendarSection';
    if (calendarFragment) {
      // Older return links must not trigger a browser jump through the phone frame.
      const url = new URL(location.href);
      url.hash = '';
      history.replaceState(null, '', url);
    }
    const initialParts = (source.initialMonth || '2026-10').split('-').map(Number);
    const requestedDate = parseDateKey(params.get('date'));
    let visibleMonth = requestedDate || new Date(initialParts[0], initialParts[1] - 1, 1);
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    let selectedDate = requestedDate ? params.get('date') : '';
    let lastEventTrigger = null;
    let lastClassDetailsTrigger = null;

    function scrollToCalendar(behavior = 'auto') {
      const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
      main.scrollTo({
        top: main.scrollTop + section.getBoundingClientRect().top - main.getBoundingClientRect().top - margin,
        behavior
      });
    }

    section.addEventListener('training:showcalendar', () => {
      scrollToCalendar('smooth');
      monthTitle.focus({ preventScroll: true });
    });

    function eventsFor(key) {
      return source.events.filter(event => event.date === key);
    }

    function createDay(date) {
      const key = dateKey(date);
      const events = eventsFor(key);
      const day = document.createElement(events.length ? 'button' : 'span');
      day.className = 'cal-day-cell';
      day.dataset.date = key;
      day.dataset.hasEvents = String(Boolean(events.length));
      if (key === selectedDate) day.classList.add('selected');
      const number = document.createElement('span');
      number.className = 'cal-date-num';
      number.textContent = date.getDate();
      day.append(number);
      if (events.length) {
        day.type = 'button';
        day.classList.add('status-event');
        day.setAttribute('aria-label', `${formatDate(key)}, ${events.length} training ${events.length === 1 ? 'activity' : 'activities'}`);
        const tag = document.createElement('span');
        tag.className = 'cal-cell-tag';
        tag.textContent = 'TRAIN';
        day.append(tag);
        day.addEventListener('click', () => openEventSheet(key, day));
      }
      return day;
    }

    function render() {
      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      monthTitle.textContent = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(visibleMonth);
      const fragment = document.createDocumentFragment();
      const leadCount = (new Date(year, month, 1).getDay() + 6) % 7;
      const previousMonthLastDate = new Date(year, month, 0).getDate();
      for (let index = leadCount; index > 0; index -= 1) {
        const placeholder = document.createElement('span');
        placeholder.className = 'cal-day-cell other-month';
        placeholder.textContent = previousMonthLastDate - index + 1;
        fragment.append(placeholder);
      }
      const dayCount = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= dayCount; day += 1) fragment.append(createDay(new Date(year, month, day)));
      grid.replaceChildren(fragment);
    }

    function classDetailRow(label, value, modifier = '') {
      const row = document.createElement('div');
      row.className = 'training-calendar-class-detail-row';
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value || '-';
      if (modifier) description.classList.add(modifier);
      row.append(term, description);
      return row;
    }

    function closeClassDetails(restoreFocus = true) {
      if (classDetailsOverlay.getAttribute('aria-hidden') === 'true') return;
      classDetailsOverlay.classList.remove('is-open');
      classDetailsOverlay.setAttribute('aria-hidden', 'true');
      eventOverlay.inert = false;
      if (restoreFocus && lastClassDetailsTrigger?.isConnected) lastClassDetailsTrigger.focus({ preventScroll: true });
    }

    function openClassDetails(event, trigger) {
      const details = event.classDetails;
      lastClassDetailsTrigger = trigger;
      classDetailsFields.replaceChildren(
        classDetailRow('Class', details.class),
        classDetailRow('Description', details.description),
        classDetailRow('Course Title', details.courseTitle),
        classDetailRow('Class Status', details.classStatus, 'training-calendar-class-status'),
        classDetailRow('Start', formatDateTime(details.start)),
        classDetailRow('End', formatDateTime(details.end)),
        classDetailRow('Venue', details.venue),
        classDetailRow('Closing Date', formatDateTime(details.closingDate)),
        classDetailRow('Trainer / Facilitator', details.trainer),
        classDetailRow('Class / Capacity', details.capacity),
        classDetailRow('Remark', details.remark),
        classDetailRow('Class Attachment', details.attachment, 'training-calendar-class-attachment')
      );
      eventOverlay.inert = true;
      classDetailsOverlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        classDetailsOverlay.classList.add('is-open');
        classDetailsClose.focus({ preventScroll: true });
      });
    }

    function closeEventSheet(restoreFocus = true) {
      if (eventOverlay.getAttribute('aria-hidden') === 'true') return;
      closeClassDetails(false);
      eventOverlay.classList.remove('is-open');
      eventOverlay.setAttribute('aria-hidden', 'true');
      main.inert = false;
      if (restoreFocus && lastEventTrigger?.isConnected) lastEventTrigger.focus({ preventScroll: true });
    }

    function openEventSheet(key, trigger) {
      const events = eventsFor(key);
      if (!events.length) return;
      selectedDate = key;
      render();
      lastEventTrigger = grid.querySelector(`[data-date="${key}"]`) || trigger;
      eventDate.textContent = formatDate(key);
      eventList.replaceChildren(...events.map(event => {
        const details = event.classDetails;
        const status = String(event.status || 'Submitted');
        const statusTheme = status.toLowerCase();
        const card = document.createElement('article');
        card.className = 'training-calendar-event-card history-card-item';
        card.dataset.status = statusTheme;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `View details for class ${details.class}`);
        const heading = document.createElement('div');
        heading.className = 'history-card-heading';
        const title = document.createElement('h3');
        title.className = 'history-card-title';
        title.textContent = details.class;
        const course = document.createElement('div');
        course.className = 'history-card-ref';
        course.textContent = `Course: ${details.courseTitle}`;
        heading.append(title, course);
        const badge = document.createElement('span');
        badge.className = 'card-status-badge';
        badge.dataset.status = statusTheme;
        const statusIcon = document.createElement('i');
        statusIcon.className = statusTheme === 'approved' ? 'fa-solid fa-check' : 'fa-solid fa-hourglass-half';
        statusIcon.setAttribute('aria-hidden', 'true');
        badge.append(statusIcon, document.createTextNode(status));
        const header = document.createElement('header');
        header.className = 'training-calendar-event-card-header history-card-header';
        header.append(heading, badge);
        const body = document.createElement('div');
        body.className = 'training-calendar-history-details history-card-details';
        const description = document.createElement('div');
        description.className = 'training-calendar-event-detail training-calendar-event-meta-row';
        description.dataset.field = 'description';
        const descriptionLabel = document.createElement('span');
        descriptionLabel.textContent = 'Description';
        const descriptionValue = document.createElement('strong');
        descriptionValue.textContent = details.description;
        description.append(descriptionLabel, descriptionValue);
        const time = document.createElement('div');
        time.className = 'training-calendar-event-time training-calendar-event-meta-row';
        const timeLabel = document.createElement('span');
        timeLabel.textContent = 'Time';
        const timeValue = document.createElement('strong');
        timeValue.textContent = `${formatTime(details.start)} – ${formatTime(details.end)}`;
        time.append(timeLabel, timeValue);
        const actions = document.createElement('footer');
        actions.className = 'training-calendar-event-actions history-card-actions';
        const detail = document.createElement('a');
        detail.className = 'training-calendar-detail';
        detail.href = detailsUrl(event);
        detail.textContent = 'Detail';
        detail.addEventListener('click', clickEvent => {
          clickEvent.stopPropagation();
          detail.href = detailsUrl(event);
        });
        card.addEventListener('click', () => openClassDetails(event, card));
        card.addEventListener('keydown', keyEvent => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault();
            openClassDetails(event, card);
          }
        });
        actions.append(detail);
        body.append(description, time);
        card.append(header, body, actions);
        return card;
      }));
      main.inert = true;
      eventOverlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        eventOverlay.classList.add('is-open');
        eventClose.focus({ preventScroll: true });
      });
    }

    document.getElementById('trainingCalendarPrevious').addEventListener('click', () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      selectedDate = '';
      render();
    });
    document.getElementById('trainingCalendarNext').addEventListener('click', () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      selectedDate = '';
      render();
    });
    document.getElementById('trainingCalendarInfo').addEventListener('click', () => {
      if (typeof window.showToast === 'function') window.showToast('Purple dates indicate scheduled training activities.');
    });
    eventClose.addEventListener('click', () => closeEventSheet());
    document.getElementById('trainingCalendarSheetCancel').addEventListener('click', () => closeEventSheet());
    eventOverlay.addEventListener('click', event => {
      if (event.target === eventOverlay) closeEventSheet();
    });
    classDetailsClose.addEventListener('click', () => closeClassDetails());
    document.getElementById('trainingClassDetailsCancel').addEventListener('click', () => closeClassDetails());
    classDetailsOverlay.addEventListener('click', event => {
      if (event.target === classDetailsOverlay) closeClassDetails();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (classDetailsOverlay.getAttribute('aria-hidden') === 'false') {
        event.preventDefault();
        closeClassDetails();
      } else if (eventOverlay.getAttribute('aria-hidden') === 'false') {
        event.preventDefault();
        closeEventSheet();
      }
    });
    render();
    if (calendarFragment || selectedDate) scrollToCalendar();
    if (selectedDate && eventsFor(selectedDate).length) {
      const trigger = grid.querySelector(`[data-date="${selectedDate}"]`);
      requestAnimationFrame(() => openEventSheet(selectedDate, trigger));
    }
  }

  function statusMarkup(value, modifier = '') {
    const span = document.createElement('span');
    span.className = `training-request-status ${modifier}`.trim();
    span.textContent = value;
    return span;
  }

  function field(label, value, name, renderer) {
    const row = document.createElement('div');
    row.className = 'training-request-field';
    if (name) row.dataset.field = name;
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    if (renderer) description.append(renderer());
    else description.textContent = value || '-';
    row.append(term, description);
    return row;
  }

  function initDetails() {
    const event = source.events.find(item => item.id === params.get('request'));
    const details = document.getElementById('trainingRequestDetails');
    const unavailable = document.getElementById('trainingRequestUnavailable');
    const classFields = document.getElementById('trainingClassDetails');
    const requestFields = document.getElementById('trainingRequestFields');
    const selectedDate = event?.date || params.get('date') || source.events[0]?.date || `${source.initialMonth}-01`;
    function syncLinks() {
      const href = dashboardUrl(selectedDate);
      document.getElementById('trainingRequestBack').href = href;
      document.getElementById('trainingRequestCancel').href = href;
    }
    syncLinks();
    new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (!event) {
      details.hidden = true;
      unavailable.hidden = false;
      return;
    }
    const classData = event.classDetails;
    const requestData = event.requestDetails;
    classFields.replaceChildren(
      field('Class', classData.class), field('Description', classData.description), field('Course Title', classData.courseTitle),
      field('Class Status', '', 'class-status', () => statusMarkup(classData.classStatus, 'scheduled')),
      field('Start', formatDateTime(classData.start)), field('End', formatDateTime(classData.end)), field('Venue', classData.venue),
      field('Trainer / Facilitator', classData.trainer), field('Class Capacity', classData.capacity), field('Remark', classData.remark)
    );
    requestFields.replaceChildren(
      field('Document Reference', requestData.documentReference),
      field('Document Status', '', 'document-status', () => statusMarkup(requestData.documentStatus)),
      field('Employee', '', 'employee', () => {
        const wrapper = document.createElement('span');
        const name = document.createElement('span');
        name.className = 'training-request-employee-name';
        name.textContent = requestData.employee.name;
        const employeeId = document.createElement('span');
        employeeId.className = 'training-request-employee-id';
        employeeId.textContent = `#${String(requestData.employee.empNo).replace(/^#/, '')}`;
        wrapper.append(name, employeeId);
        return wrapper;
      }),
      field('Attendance Status', '', 'attendance-status', () => statusMarkup(requestData.attendanceStatus, 'registered')),
      field('Reason', requestData.reason), field('Is Require Traveling', requestData.requireTraveling),
      field('Is Require Accommodation', requestData.requireAccommodation), field('Is Vegetarian', requestData.vegetarian),
      field('Remark', requestData.remark), field('Attended Hours', requestData.attendedHours),
      field('Attendance Remark', requestData.attendanceRemark), field('Approver Comments', requestData.approverComments)
    );
  }

  if (pageType === 'dashboard') initDashboardCalendar();
  if (pageType === 'details') initDetails();
})();
