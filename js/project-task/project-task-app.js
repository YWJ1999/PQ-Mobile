/* Project & Task module navigation. Option content is implemented separately. */
(function () {
  const individualCalendarEvents = new Map([
    ['2026-10-02', { badge: 'TS', type: 'timesheet', title: 'Draft timesheet' }],
    ['2026-10-05', { badge: 'WP', type: 'work-plan', title: 'Client portal sprint starts' }],
    ['2026-10-12', { badge: 'WP', type: 'work-plan', title: 'Policy archive cleanup starts' }],
    ['2026-10-22', { badge: 'DL', type: 'deadline', title: 'Client portal sprint deadline' }],
    ['2026-10-30', { badge: 'DL', type: 'deadline', title: 'Policy archive cleanup deadline' }]
  ]);
  const individualTimesheetDetails = new Map([
    ['2026-10-02', {
      reference: 'ETS00000002819',
      dateLabel: '2 Oct 2026',
      remark: 'Client portal accessibility sprint.',
      status: 'Draft',
      normalHours: '7.50',
      otHours: '1.00',
      activities: [
        {
          title: 'Responsive accessibility review',
          description: 'Verified navigation, focus states and mobile layouts.',
          project: 'Client Portal Upgrade',
          adhoc: false,
          task: 'Portal Upgrade',
          overtime: false,
          timeFrom: '09:00',
          completion: 75,
          timeTo: '16:30'
        },
        {
          title: 'Regression fixes',
          description: 'Resolved issues found during review.',
          project: 'Client Portal Upgrade',
          adhoc: true,
          task: 'Portal Upgrade',
          overtime: true,
          timeFrom: '18:00',
          completion: 100,
          timeTo: '19:00'
        }
      ]
    }]
  ]);
  const teamProjectPendingTasks = new Map([
    ['MOBILE APP FOR TIMESHEET', [
      { task: 'RISDA HR DEMO', employee: 'Farhan binti rahmat', deadline: '25/02/2016', completion: '0%' },
      { task: 'Meeting with POS', employee: 'Farhan binti rahmat', deadline: '16/03/2016', completion: '0%' },
      { task: 'Meeting ZACKLIM', employee: 'Farhan binti rahmat', deadline: '08/04/2016', completion: '0%' },
      { task: 'Meeting at FSA', employee: 'Farhan binti rahmat', deadline: '22/04/2016', completion: '0%' },
      { task: 'MEETING WITH EQUINAS', employee: 'Farhan binti rahmat', deadline: '11/05/2016', completion: '0%' },
      { task: 'MEETING WITH SHAFIZA', employee: 'Farhan binti rahmat', deadline: '21/05/2016', completion: '0%' },
      { task: 'Meeting at Teleflex', employee: 'Farhan binti rahmat', deadline: '24/05/2016', completion: '0%' },
      { task: 'Meeting at Cheng & Co', employee: 'Farhan binti rahmat', deadline: '24/06/2016', completion: '0%' },
      { task: 'TSH Meeting', employee: 'Farhan binti rahmat', deadline: '04/08/2016', completion: '0%' },
      { task: 'MBMR', employee: 'Farhan binti rahmat', deadline: '05/08/2016', completion: '0%' },
      { task: 'OM Materials', employee: 'Farhan binti rahmat', deadline: '10/10/2016', completion: '0%' },
      { task: 'Parkson', employee: 'Farhan binti rahmat', deadline: '11/10/2016', completion: '0%' },
      { task: 'Mitsui Soko', employee: 'Farhan binti rahmat', deadline: '11/10/2016', completion: '0%' },
      { task: 'HR Demo at EPSON', employee: 'Farhan binti rahmat', deadline: '07/12/2016', completion: '0%' },
      { task: 'Install PeopleHCM at Acme Corporation', employee: 'Farhan binti rahmat', deadline: '19/10/2017', completion: '0%' },
      { task: 'TRAINING', employee: 'Kathleen lee chee dee', deadline: '31/12/2017', completion: '0%' },
      { task: 'Meeting Pan Intl', employee: 'Farhan binti rahmat', deadline: '14/03/2018', completion: '0%' },
      { task: 'Test', employee: 'Kathleen lee chee dee', deadline: '31/01/2023', completion: '0%' },
      { task: 'Test', employee: 'Asmawi idris', deadline: '31/01/2023', completion: '0%' }
    ]]
  ]);
  const teamProjectTaskTemplates = [
    { task: 'Requirements review', employee: 'Farhan binti rahmat' },
    { task: 'Project setup', employee: 'Kathleen lee chee dee' },
    { task: 'Data preparation', employee: 'Asmawi idris' },
    { task: 'Configuration check', employee: 'Farhan binti rahmat' },
    { task: 'User acceptance review', employee: 'Kathleen lee chee dee' },
    { task: 'Handover preparation', employee: 'Asmawi idris' }
  ];
  let calendarYear = 2026;
  let calendarMonth = 9;
  let selectedCalendarDate = '2026-10-02';

  function calendarDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function renderIndividualCalendar() {
    const calendarGrid = document.getElementById('projectCalendarGrid');
    const monthLabel = document.getElementById('projectCalendarMonth');
    if (!calendarGrid || !monthLabel) return;

    const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
    const firstWeekdayOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekdayOffset + daysInMonth) / 7) * 7;
    const todayKey = calendarDateKey(new Date());

    monthLabel.textContent = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(firstOfMonth);
    calendarGrid.replaceChildren();

    for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
      const dayNumber = cellIndex - firstWeekdayOffset + 1;
      const cellDate = new Date(calendarYear, calendarMonth, dayNumber);
      const dateKey = calendarDateKey(cellDate);
      const calendarEvent = individualCalendarEvents.get(dateKey);
      const day = document.createElement('button');
      day.type = 'button';
      day.className = 'project-calendar-day';
      day.dataset.date = dateKey;
      day.setAttribute('aria-pressed', String(dateKey === selectedCalendarDate));
      day.setAttribute('aria-label', calendarEvent
        ? `${cellDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}: ${calendarEvent.title}`
        : cellDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

      if (cellDate.getMonth() !== calendarMonth) day.classList.add('is-outside');
      if (dateKey === todayKey) day.classList.add('is-today');
      if (dateKey === selectedCalendarDate) day.classList.add('is-selected');
      if (calendarEvent && cellDate.getMonth() === calendarMonth) {
        day.classList.add('has-event');
        day.dataset.eventType = calendarEvent.type;
      }
      if (cellDate.getMonth() === calendarMonth) {
        day.addEventListener('click', () => {
          selectedCalendarDate = dateKey;
          renderIndividualCalendar();
        });
      }

      const number = document.createElement('span');
      number.textContent = String(cellDate.getDate());
      day.appendChild(number);

      if (calendarEvent && cellDate.getMonth() === calendarMonth) {
        const badge = document.createElement('span');
        badge.className = 'project-calendar-day-badge';
        badge.textContent = calendarEvent.badge;
        day.appendChild(badge);
      }

      calendarGrid.appendChild(day);
    }
    renderCalendarDetails();
  }

  function renderCalendarDetails() {
    const detailsCard = document.getElementById('projectCalendarDetails');
    if (!detailsCard) return;
    const details = individualTimesheetDetails.get(selectedCalendarDate);
    const selectedDate = new Date(`${selectedCalendarDate || ''}T00:00:00`);
    const selectedMonthIsVisible = Number.isFinite(selectedDate.getTime())
      && selectedDate.getFullYear() === calendarYear
      && selectedDate.getMonth() === calendarMonth;
    detailsCard.hidden = !details || !selectedMonthIsVisible;
    if (!details || !selectedMonthIsVisible) return;

    document.getElementById('projectCalendarDetailReference').textContent = details.reference;
    document.getElementById('projectCalendarDetailDate').textContent = details.dateLabel;
    document.getElementById('projectCalendarDetailNormalHours').textContent = details.normalHours;
    document.getElementById('projectCalendarDetailOtHours').textContent = details.otHours;
    detailsCard.setAttribute('aria-label', `View timesheet details for ${details.dateLabel}, ${details.reference}`);
  }

  function initCalendarTimesheetDetails() {
    const card = document.getElementById('projectCalendarDetails');
    const overlay = document.getElementById('projectCalendarTimesheetOverlay');
    const summary = document.getElementById('projectCalendarTimesheetSummary');
    const activities = document.getElementById('projectCalendarTimesheetActivities');
    const closeButton = document.getElementById('closeProjectCalendarTimesheet');
    const phone = document.querySelector('.phone-container');
    if (!card || !overlay || !summary || !activities || !closeButton || !phone) return;
    let inertElements = [];

    const createRow = (label, value) => {
      const row = document.createElement('div');
      row.className = 'project-history-detail-row';
      const name = document.createElement('span');
      name.textContent = label;
      const content = document.createElement('strong');
      if (label === 'Status') content.append(recordDetailStatus.create(value));
      else content.textContent = value === '' || value == null ? '—' : String(value);
      row.append(name, content);
      return row;
    };
    const closeDetails = () => {
      if (overlay.hidden) return;
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      card.setAttribute('aria-expanded', 'false');
      inertElements.forEach(element => { element.inert = false; });
      inertElements = [];
      card.focus({ preventScroll: true });
    };
    const openDetails = () => {
      const record = individualTimesheetDetails.get(selectedCalendarDate);
      if (!record || card.hidden || !overlay.hidden) return;
      summary.replaceChildren(...[
        ['Reference #', record.reference],
        ['Date', record.dateLabel],
        ['Remark', record.remark],
        ['Status', record.status],
        ['Normal Hours', `${record.normalHours} hrs`],
        ['OT Hours', `${record.otHours} hrs`]
      ].map(([label, value]) => createRow(label, value)));
      activities.replaceChildren(...record.activities.map(activity => {
        const item = document.createElement('section');
        item.className = 'project-history-detail-activity';
        item.append(...[
          ['Title', activity.title],
          ['Description', activity.description],
          ['Project', activity.project],
          ['Is AdHoc Task?', activity.adhoc ? 'Yes' : 'No'],
          ['Task', activity.task],
          ['Is Overtime?', activity.overtime ? 'Yes' : 'No'],
          ['Time From', activity.timeFrom],
          ['Completion %', `${activity.completion}%`],
          ['Time To', activity.timeTo]
        ].map(([label, value]) => createRow(label, value)));
        return item;
      }));
      overlay.hidden = false;
      overlay.classList.add('is-open');
      overlay.querySelector('.project-history-detail-content').scrollTop = 0;
      card.setAttribute('aria-expanded', 'true');
      inertElements = [...phone.children].filter(element => element !== overlay && !element.inert);
      inertElements.forEach(element => { element.inert = true; });
      closeButton.focus({ preventScroll: true });
    };
    card.addEventListener('click', openDetails);
    card.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openDetails();
    });
    closeButton.addEventListener('click', closeDetails);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeDetails(); });
    document.addEventListener('keydown', event => {
      if (overlay.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetails();
      } else if (event.key === 'Tab') {
        const controls = [...overlay.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  function changeCalendarMonth(monthOffset) {
    const nextMonth = new Date(calendarYear, calendarMonth + monthOffset, 1);
    calendarYear = nextMonth.getFullYear();
    calendarMonth = nextMonth.getMonth();
    selectedCalendarDate = null;
    renderIndividualCalendar();
  }

  function syncThemeNavigation() {
    const theme = getCurrentTheme();
    const url = new URL(window.location.href);
    url.searchParams.set('theme', theme);
    window.history.replaceState(null, '', url);
    for (const link of document.querySelectorAll('.project-option, .project-team-action-card, .project-dashboard-status-card')) {
      const target = new URL(link.href);
      target.searchParams.set('theme', theme);
      link.href = target.href;
    }
  }

  function switchScope(scope, focusTab = false) {
    const selected = scope === 'team' ? 'team' : 'individual';
    for (const name of ['individual', 'team']) {
      const tab = document.getElementById(`projectTab-${name}`);
      const panel = document.getElementById(`projectPanel-${name}`);
      const active = name === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
      if (active && focusTab) tab.focus({ preventScroll: true });
    }
    const url = new URL(window.location.href);
    url.searchParams.set('scope', selected);
    window.history.replaceState(null, '', url);
  }

  function initPendingApprovalActions() {
    const queue = document.getElementById('projectTimesheetApprovalList');
    if (!queue) return;
    const storageKey = 'pq_project_pending_decisions';
    const read = () => {
      try { const value = JSON.parse(localStorage.getItem(storageKey)); return Array.isArray(value) ? value : []; }
      catch { return []; }
    };
    const updateCount = () => {
      const count = document.querySelectorAll('#projectTimesheetApprovalList .project-approval-card').length;
      const label = document.getElementById('projectTimesheetApprovalCount');
      if (label) label.textContent = window.PeopleHcmRecordSummary.formatCount(count);
    };
    const handled = new Set(read().map(item => item.reference));
    document.querySelectorAll('#projectTimesheetApprovalList .project-approval-card').forEach(card => {
      const reference = card.dataset.reference;
      if (handled.has(reference)) { card.remove(); return; }
      PendingApprovalBackup.showAssignment(card.querySelector('.project-approval-actions'), { scope: 'timesheet', id: reference });
    });
    updateCount();
    function decide(cards, action, comments = '') {
      const references = new Set(cards.map(card => card.dataset.reference));
      const decisions = read().filter(item => !references.has(item.reference));
      const decidedAt = new Date().toISOString();
      for (const reference of references) decisions.push({ reference, action, comments, decidedAt });
      try {
        localStorage.setItem(storageKey, JSON.stringify(decisions));
      } catch {
        window.showToast?.('Unable to save the decision. Please try again.');
        return false;
      }
      cards.forEach(card => card.remove());
      updateCount();
      const verb = { approve: 'Approved', reject: 'Rejected', resubmit: 'Sent for resubmission' }[action];
      window.showToast?.(`${verb}: ${cards.length} request${cards.length === 1 ? '' : 's'}`);
      return true;
    }
    mountPendingApprovalSelection(queue, document.getElementById('projectApprovalSelectAll'), (action, boxes) => {
      decide(boxes.map(box => box.closest('.project-approval-card')), action);
    });
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-project-approval-action]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const details = document.getElementById('projectApprovalDetails');
      const inDetails = details?.contains(button);
      const card = inDetails ? queue.querySelector(`[data-reference="${CSS.escape(details.dataset.reference)}"]`) : button.closest('.project-approval-card');
      if (!card) return;
      const action = button.dataset.projectApprovalAction;
      const comments = inDetails ? document.getElementById('projectApprovalApproverComments').value.trim() : '';
      if (decide([card], action, comments) && inDetails) details.querySelector('[data-close-project-approval]').click();
    });
  }

  function initPendingApprovalSheets() {
    const phone = document.querySelector('.phone-container');
    const menu = document.getElementById('projectApprovalMenu');
    const details = document.getElementById('projectApprovalDetails');
    const workflow = document.getElementById('projectApprovalWorkflow');
    if (!phone || !menu || !details || !workflow) return;
    let currentCard = null;
    let currentMenuTrigger = null;
    let activeOverlay = null;
    let returnFocus = null;
    let inertElements = [];
    const openOverlay = (overlay, trigger) => {
      if (activeOverlay) closeOverlay(false);
      activeOverlay = overlay;
      returnFocus = trigger || document.activeElement;
      inertElements = [...phone.children].filter(node => node !== overlay && !node.inert);
      inertElements.forEach(node => { node.inert = true; });
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      overlay.querySelector('button')?.focus({ preventScroll: true });
    };
    const closeOverlay = (restoreFocus = true) => {
      if (!activeOverlay) return;
      activeOverlay.classList.remove('is-open');
      activeOverlay.hidden = true;
      inertElements.forEach(node => { node.inert = false; });
      activeOverlay = null;
      inertElements = [];
      if (restoreFocus) returnFocus?.focus({ preventScroll: true });
    };
    const value = key => currentCard?.dataset[key] || '—';
    const fillDetails = () => {
      const fields = {
        projectApprovalDetailDocumentReference: 'documentReference',
        projectApprovalDetailEmployeeName: 'employeeName',
        projectApprovalDetailEmployeeId: 'employeeId',
        projectApprovalDetailTimesheetDate: 'timesheetDate',
        projectApprovalDetailClockTimes: 'clockTimes',
        projectApprovalDetailNormalWorkHours: 'normalWorkHours',
        projectApprovalDetailOvertimeHours: 'otHours',
        projectApprovalDetailRemark: 'remark',
        projectApprovalActivityTime: 'activityTime',
        projectApprovalActivityTitle: 'activityTitle',
        projectApprovalActivityProject: 'activityProject',
        projectApprovalActivityTask: 'activityTask'
      };
      Object.entries(fields).forEach(([id, key]) => {
        document.getElementById(id).textContent = value(key);
      });
      document.getElementById('projectApprovalDetailDocumentStatus').replaceChildren(recordDetailStatus.create(value('documentStatus')));
      document.getElementById('projectApprovalApproverComments').value = '';
      details.dataset.reference = value('reference');
    };
    document.querySelectorAll('[data-project-approval-menu]').forEach(button => {
      button.addEventListener('click', () => {
        currentCard = button.closest('.project-approval-card');
        currentMenuTrigger = button;
        openOverlay(menu, button);
      });
    });
    document.getElementById('projectApprovalViewDetails').addEventListener('click', event => {
      fillDetails();
      closeOverlay(false);
      openOverlay(details, currentMenuTrigger || event.currentTarget);
    });
    document.getElementById('projectApprovalViewWorkflow').addEventListener('click', event => {
      document.getElementById('projectApprovalWorkflowReference').textContent = value('reference');
      document.getElementById('projectApprovalWorkflowName').textContent = value('employeeName');
      document.getElementById('projectApprovalWorkflowEmployeeId').textContent = value('employeeId');
      const backup = PendingApprovalBackup.assigned('timesheet', value('reference'));
      const assignment = document.getElementById('projectApprovalWorkflowBackup');
      assignment.hidden = !backup;
      assignment.textContent = backup ? 'Backup approver · ' + backup.name : '';
      closeOverlay(false);
      openOverlay(workflow, currentMenuTrigger || event.currentTarget);
    });
    document.querySelectorAll('[data-close-project-approval]').forEach(button => button.addEventListener('click', () => closeOverlay()));
    [menu, details, workflow].forEach(overlay => overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    }));
    document.addEventListener('keydown', event => {
      if (!activeOverlay) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    });
  }

  function initTeamProjectDetails() {
    const phone = document.querySelector('.phone-container');
    const overlay = document.getElementById('projectTeamProjectDetails');
    const taskList = document.getElementById('projectTeamPendingTaskList');
    const rows = [...document.querySelectorAll('#projectTeamProjectOverview tbody tr')];
    if (!phone || !overlay || !taskList || !rows.length) return;

    let activeRow = null;
    let inertElements = [];
    const setText = (id, value) => { document.getElementById(id).textContent = value; };
    const getProjectTasks = row => {
      const storedTasks = teamProjectPendingTasks.get(row.dataset.project);
      if (storedTasks?.length) return storedTasks;
      const taskCount = Math.max(Number(row.dataset.pending || 0), 1);
      return Array.from({ length: taskCount }, (_, index) => {
        const template = teamProjectTaskTemplates[index % teamProjectTaskTemplates.length];
        return {
          task: template.task,
          employee: template.employee,
          deadline: row.dataset.deadline || 'TBC',
          completion: row.dataset.completion || '0%'
        };
      });
    };
    const createTaskItem = task => {
      const row = document.createElement('tr');
      const values = [
        ['project-team-task-title', task.task],
        ['project-team-task-employee', task.employee],
        ['project-team-task-deadline', task.deadline],
        ['project-team-task-completion', task.completion.replace('%', '')]
      ];
      values.forEach(([className, value]) => {
        const cell = document.createElement('td');
        cell.className = className;
        cell.textContent = value;
        row.appendChild(cell);
      });
      return row;
    };
    const renderTasks = row => {
      const tasks = getProjectTasks(row);
      taskList.replaceChildren(...tasks.map(createTaskItem));
      return tasks;
    };
    const closeDetails = () => {
      if (overlay.hidden) return;
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      inertElements.forEach(element => { element.inert = false; });
      inertElements = [];
      activeRow?.focus({ preventScroll: true });
    };
    const openDetails = row => {
      activeRow = row;
      const tasks = renderTasks(row);
      setText('projectTeamProjectDetailsSubtitle', `${row.dataset.project} · ${tasks.length} ${tasks.length === 1 ? 'Task' : 'Tasks'}`);
      overlay.querySelector('.project-approval-details-body').scrollTop = 0;
      inertElements = [...phone.children].filter(element => element !== overlay && !element.inert);
      inertElements.forEach(element => { element.inert = true; });
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      overlay.querySelector('button')?.focus({ preventScroll: true });
    };

    rows.forEach(row => {
      row.addEventListener('click', () => openDetails(row));
      row.addEventListener('keydown', event => {
        if (!['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        openDetails(row);
      });
    });
    overlay.querySelectorAll('[data-close-project-detail]').forEach(button => button.addEventListener('click', closeDetails));
    overlay.addEventListener('click', event => { if (event.target === overlay) closeDetails(); });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || overlay.hidden) return;
      event.preventDefault();
      closeDetails();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTheme(getCurrentTheme());
    syncThemeNavigation();
    initPendingApprovalSheets();
    initPendingApprovalActions();
    initTeamProjectDetails();
    initCalendarTimesheetDetails();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-set-theme], .project-option, .project-team-action-card, .project-dashboard-status-card')) syncThemeNavigation();
    });
    if (!document.getElementById('projectTab-individual')) return;
    document.getElementById('projectCalendarPrevious')?.addEventListener('click', () => changeCalendarMonth(-1));
    document.getElementById('projectCalendarNext')?.addEventListener('click', () => changeCalendarMonth(1));
    renderIndividualCalendar();
    switchScope(new URLSearchParams(window.location.search).get('scope'));
    for (const scope of ['individual', 'team']) {
      const tab = document.getElementById(`projectTab-${scope}`);
      tab.addEventListener('click', () => switchScope(scope));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'individual' : event.key === 'End' ? 'team' : scope === 'individual' ? 'team' : 'individual';
        switchScope(next, true);
      });
    }
    document.documentElement.dataset.projectDashboardReady = 'true';
  });
})();
