/* Project & Task history tabs, cards, details and filters. */
(function () {
  const demoWorkPlans = [
    {
      id: 'WP-2026-0051',
      title: 'Payroll year-end readiness',
      description: 'Complete the payroll validation checklist and close outstanding review items.',
      taskCategory: 'Support',
      subTask: 'Payroll Validation',
      project: 'Internal System Maintenance',
      milestone: 'Year-end Close',
      scheduleFrom: '2026-09-01',
      scheduleTo: '2026-09-20',
      deadline: '2026-09-25',
      status: 'Submitted',
      assignee: 'Farhan binti rahmat',
      estimatedComplete: '2026-09-25',
      actualComplete: '',
      allocatedHours: 40,
      actualHours: 31.5,
      priority: 1,
      completion: 80,
      remarks: 'Final validation is pending.',
      hours: 30,
      otHours: 1.5,
      reassign: false,
      reassignRemarks: '',
      reassignTo: '',
      reassignDate: '',
      attachments: [{ name: 'year-end-checklist.pdf' }],
      isOverdue: true
    },
    {
      id: 'WP-2026-0048',
      title: 'Client portal sprint',
      description: 'Complete accessibility improvements and verify the responsive portal experience.',
      taskCategory: 'Development',
      subTask: 'Portal Upgrade',
      project: 'Client Portal Upgrade',
      milestone: 'Accessibility Sprint',
      scheduleFrom: '2026-10-05',
      scheduleTo: '2026-10-20',
      deadline: '2026-10-22',
      status: 'Submitted',
      assignee: 'Farhan binti rahmat',
      estimatedComplete: '2026-10-22',
      actualComplete: '',
      allocatedHours: 48,
      actualHours: 22.5,
      priority: 2,
      completion: 55,
      remarks: 'Responsive verification is in progress.',
      hours: 22,
      otHours: 0.5,
      reassign: false,
      reassignRemarks: '',
      reassignTo: '',
      reassignDate: '',
      attachments: [{ name: 'accessibility-checklist.pdf' }],
      isOverdue: false
    },
    {
      id: 'WP-2026-0043',
      title: 'Mobile onboarding rollout',
      description: 'Prepare the employee onboarding flow for the production release.',
      taskCategory: 'Development',
      subTask: 'System Deployment',
      project: 'Project Alpha (HCM Rebrand)',
      milestone: 'Production Rollout',
      scheduleFrom: '2026-09-08',
      scheduleTo: '2026-09-16',
      deadline: '2026-09-18',
      status: 'Submitted',
      assignee: 'Farhan binti rahmat',
      estimatedComplete: '2026-09-18',
      actualComplete: '2026-09-17',
      allocatedHours: 36,
      actualHours: 35,
      priority: 1,
      completion: 100,
      remarks: 'Released successfully.',
      hours: 34,
      otHours: 1,
      reassign: false,
      reassignRemarks: '',
      reassignTo: '',
      reassignDate: '',
      attachments: [],
      isOverdue: false
    },
    {
      id: 'WP-2026-0039',
      title: 'Policy archive cleanup',
      description: 'Review archived policy records before the next document migration.',
      taskCategory: 'Maintenance',
      subTask: 'System Maintenance',
      project: 'Internal System Maintenance',
      milestone: 'Archive Review',
      scheduleFrom: '2026-10-12',
      scheduleTo: '2026-10-24',
      deadline: '2026-10-30',
      status: 'Draft',
      assignee: 'Farhan binti rahmat',
      estimatedComplete: '2026-10-30',
      actualComplete: '',
      allocatedHours: 20,
      actualHours: 0,
      priority: 3,
      completion: 0,
      remarks: '',
      hours: 0,
      otHours: 0,
      reassign: false,
      reassignRemarks: '',
      reassignTo: '',
      reassignDate: '',
      attachments: [],
      isOverdue: false
    }
  ];

  const demoTimesheets = [
    {
      id: 'TS-2026-0102',
      date: '2026-10-02',
      remark: 'Client portal accessibility sprint.',
      status: 'Submitted',
      normalMinutes: 450,
      overtimeMinutes: 60,
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
    },
    {
      id: 'TS-2026-0101',
      date: '2026-10-01',
      remark: 'Prepared sprint components.',
      status: 'Submitted',
      normalMinutes: 480,
      overtimeMinutes: 0,
      activities: [
        {
          title: 'Component preparation',
          description: 'Prepared reusable portal components.',
          project: 'Client Portal Upgrade',
          adhoc: false,
          task: 'Portal Upgrade',
          overtime: false,
          timeFrom: '09:00',
          completion: 100,
          timeTo: '17:00'
        }
      ]
    },
    {
      id: 'TS-2026-0099',
      date: '2026-10-03',
      remark: 'Mobile onboarding checks.',
      status: 'Submitted',
      normalMinutes: 420,
      overtimeMinutes: 30,
      activities: [
        {
          title: 'Onboarding verification',
          description: 'Checked the employee onboarding flow.',
          project: 'Project Alpha (HCM Rebrand)',
          adhoc: false,
          task: 'System Deployment',
          overtime: false,
          timeFrom: '09:30',
          completion: 90,
          timeTo: '16:30'
        }
      ]
    },
    {
      id: 'TS-2026-0094',
      date: '2026-09-24',
      remark: 'Completed payroll checklist review.',
      status: 'Draft',
      normalMinutes: 360,
      overtimeMinutes: 0,
      activities: [
        {
          title: 'Payroll checklist review',
          description: 'Reviewed all outstanding year-end checklist items.',
          project: 'Internal System Maintenance',
          adhoc: false,
          task: 'System Maintenance',
          overtime: false,
          timeFrom: '10:00',
          completion: 100,
          timeTo: '16:00'
        }
      ]
    }
  ];

  const byId = id => document.getElementById(id);
  let lastFocusedElement = null;
  let activeProjectHistoryDetail = null;
  const historyActions = new Map();

  function createNode(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function readStored(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readStoredObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }
  function statusKey(value) {
    const key = String(value || 'Draft')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (/^(?:to-|pending-)?resubmit(?:ted)?$/.test(key)) return 'resubmit';
    if (/^(?:pending(?:-|$)|awaiting-|in-review$|(?:next|final)-approval$)/.test(key)) return 'submitted';
    return key;
  }

  function historyStatus(value) {
    const status = String(value || '').trim();
    if (!status) return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function statusIconClass(value) {
    return {
      submitted: 'fa-paper-plane',
      draft: 'fa-floppy-disk',
      approved: 'fa-check',
      cancelled: 'fa-ban',
      rejected: 'fa-xmark',
      resubmit: 'fa-rotate-left'
    }[statusKey(value)] || 'fa-circle';
  }

  function dateToday() {
    const current = new Date();
    return current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
  }

  function calculateOverdue(record) {
    if (typeof record.isOverdue === 'boolean') return record.isOverdue;
    return Boolean(record.deadline && record.deadline < dateToday());
  }

  function normalizeAttachment(attachment) {
    if (typeof attachment === 'string') return { name: attachment };
    return { name: String(attachment?.name || 'Attachment') };
  }

  function normalizeWorkPlan(record, index) {
    return {
      id: String(record.id || 'WP-LOCAL-' + (index + 1)),
      title: String(record.title || 'Untitled Work Plan'),
      description: String(record.description || ''),
      taskCategory: String(record.taskCategory || ''),
      subTask: String(record.subTask || record.task || ''),
      project: String(record.project || ''),
      milestone: String(record.milestone || ''),
      scheduleFrom: String(record.scheduleFrom || ''),
      scheduleTo: String(record.scheduleTo || record.scheduleFrom || ''),
      deadline: String(record.deadline || ''),
      status: historyStatus(record.status),
      assignee: String(record.assignee || 'Farhan binti rahmat'),
      estimatedComplete: String(record.estimatedComplete || record.deadline || ''),
      actualComplete: String(record.actualComplete || ''),
      allocatedHours: Number(record.allocatedHours || 0),
      actualHours: Number(record.actualHours || 0),
      priority: record.priority === undefined || record.priority === '' ? 0 : record.priority,
      completion: Number(record.completion || 0),
      remarks: String(record.remarks || ''),
      hours: Number(record.hours || record.actualHours || 0),
      otHours: Number(record.otHours || 0),
      reassign: Boolean(record.reassign),
      reassignRemarks: String(record.reassignRemarks || ''),
      reassignTo: String(record.reassignTo || ''),
      reassignDate: String(record.reassignDate || ''),
      attachments: Array.isArray(record.attachments) ? record.attachments.map(normalizeAttachment) : [],
      isOverdue: calculateOverdue(record)
    };
  }

  function getWorkPlans() {
    const stored = readStored('pq_project_work_plans').map(normalizeWorkPlan).reverse();
    const demoSamples = demoWorkPlans
      .filter(record => ['WP-2026-0048', 'WP-2026-0039'].includes(record.id))
      .map(normalizeWorkPlan);
    const records = [...stored, ...demoSamples];
    return selectStatusSamples(records);
  }

  function selectStatusSamples(records) {
    const unique = records.filter((record, index) => records.findIndex(candidate => candidate.id === record.id) === index);
    return unique
      .filter(record => historyActions.get(record.id) !== 'discard')
      .map(record => {
        const action = historyActions.get(record.id);
        if (action === 'submit') return { ...record, status: 'Submitted' };
        if (action === 'cancel') return { ...record, status: 'Cancelled' };
        return record;
      });
  }

  function calculateActivityMinutes(activity) {
    const from = String(activity.timeFrom || '').match(/^([0-9]{2}):([0-9]{2})$/);
    const to = String(activity.timeTo || '').match(/^([0-9]{2}):([0-9]{2})$/);
    if (!from || !to) return 0;
    const start = Number(from[1]) * 60 + Number(from[2]);
    const end = Number(to[1]) * 60 + Number(to[2]);
    return (end - start + 1440) % 1440;
  }

  function normalizeActivity(activity, index) {
    return {
      title: String(activity.title || 'Work Item ' + (index + 1)),
      description: String(activity.description || ''),
      project: String(activity.project || ''),
      adhoc: Boolean(activity.adhoc ?? activity.isAdHocTask),
      task: String(activity.task || ''),
      overtime: Boolean(activity.overtime ?? activity.isOvertime),
      timeFrom: String(activity.timeFrom || ''),
      completion: Number(activity.completion || 0),
      timeTo: String(activity.timeTo || '')
    };
  }

  function normalizeTimesheet(record, index) {
    const activities = Array.isArray(record.activities) ? record.activities.map(normalizeActivity) : [];
    const calculated = activities.reduce((total, activity) => {
      total[activity.overtime ? 'overtimeMinutes' : 'normalMinutes'] += calculateActivityMinutes(activity);
      return total;
    }, { normalMinutes: 0, overtimeMinutes: 0 });
    return {
      id: String(record.id || 'TS-LOCAL-' + (index + 1)),
      date: String(record.date || record.createdAt?.slice(0, 10) || ''),
      remark: String(record.remark || ''),
      status: historyStatus(record.status),
      normalMinutes: Number(record.normalMinutes ?? calculated.normalMinutes),
      overtimeMinutes: Number(record.overtimeMinutes ?? calculated.overtimeMinutes),
      activities
    };
  }

  function getTimesheets() {
    const stored = readStored('pq_project_timesheets').map(normalizeTimesheet).reverse();
    const demoSamples = demoTimesheets
      .filter(record => ['TS-2026-0102', 'TS-2026-0094'].includes(record.id))
      .map(normalizeTimesheet);
    const draft = readStoredObject('pq_project_timesheet_draft');
    const draftRecord = draft && typeof draft === 'object'
      ? [normalizeTimesheet({ ...draft, id: 'TS-DRAFT-LOCAL', status: 'Draft' })]
      : [];
    const records = [...draftRecord, ...stored, ...demoSamples];
    return selectStatusSamples(records);
  }

  function formatDate(value) {
    const match = String(value || '').match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    if (!match) return value || '-';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(match[3]) + ' ' + months[Number(match[2]) - 1] + ' ' + match[1];
  }

  function formatSchedule(record) {
    if (!record.scheduleFrom && !record.scheduleTo) return '-';
    if (!record.scheduleTo || record.scheduleFrom === record.scheduleTo) return formatDate(record.scheduleFrom || record.scheduleTo);
    return formatDate(record.scheduleFrom) + ' - ' + formatDate(record.scheduleTo);
  }

  function formatHours(value) {
    return Number(value || 0).toFixed(2);
  }

  function formatMinutes(value) {
    return (Number(value || 0) / 60).toFixed(2);
  }

  function displayValue(value) {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  }

  function createDataRow(label, value, valueClass) {
    const row = createNode('div', 'project-history-data-row');
    row.append(
      createNode('span', '', label),
      createNode('strong', valueClass || '', displayValue(value))
    );
    return row;
  }

  function makeCardInteractive(card, callback) {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.addEventListener('click', callback);
    card.addEventListener('keydown', event => {
      if (event.target !== card) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      callback();
    });
  }

  function createStatusBadge(status) {
    const badge = createNode('span', 'project-history-status-badge');
    const icon = createNode('i', 'fa-solid ' + statusIconClass(status));
    icon.setAttribute('aria-hidden', 'true');
    badge.append(icon, createNode('span', '', recordReviewStatusLabel(status)));
    return badge;
  }

  function createCardTop(title, reference, status) {
    const top = createNode('div', 'project-history-card-top');
    const copy = createNode('div', 'project-history-card-copy');
    const titleRow = createNode('div', 'project-history-card-title-row');
    titleRow.append(createNode('h3', '', title));
    copy.append(
      titleRow,
      createNode('span', 'project-history-card-reference', 'Ref: ' + reference)
    );
    top.append(copy, createStatusBadge(status));
    return top;
  }

  function getProjectHistoryActions(record) {
    const state = statusKey(record.status);
    if (state === 'draft') {
      return [
        { key: 'submit', label: 'Submit', variant: 'primary' },
        { key: 'discard', label: 'Cancel', variant: 'danger' }
      ];
    }
    if (state === 'submitted') return [{ key: 'cancel', label: 'Cancel', variant: 'danger' }];
    return [];
  }

  function getProjectHistoryRecord(kind, id) {
    const records = kind === 'work-plan' ? getWorkPlans() : getTimesheets();
    return records.find(record => record.id === id) || null;
  }

  function executeProjectHistoryAction(record, kind, action) {
    const detailWasOpen = activeProjectHistoryDetail?.kind === kind && activeProjectHistoryDetail.id === record.id;
    const current = getProjectHistoryRecord(kind, record.id);
    const actionIsCurrent = current && getProjectHistoryActions(current).some(candidate => candidate.key === action.key);
    if (!actionIsCurrent) {
      if (detailWasOpen) closeOverlay('projectHistoryDetailOverlay', false);
      if (kind === 'work-plan') renderWorkPlans();
      else renderTimesheets();
      window.showToast?.('This record is no longer available for that action');
      return false;
    }

    if (action.key === 'discard' && detailWasOpen) closeOverlay('projectHistoryDetailOverlay', false);
    historyActions.set(current.id, action.key);
    if (current.id === 'TS-DRAFT-LOCAL' && (action.key === 'submit' || action.key === 'discard')) {
      if (action.key === 'submit') {
        const stored = readStored('pq_project_timesheets');
        stored.push({ ...current, status: 'Submitted' });
        localStorage.setItem('pq_project_timesheets', JSON.stringify(stored));
      }
      localStorage.removeItem('pq_project_timesheet_draft');
    }

    if (kind === 'work-plan') renderWorkPlans();
    else renderTimesheets();
    if (action.key !== 'discard' && detailWasOpen) {
      refreshProjectHistoryDetails();
      (byId('projectHistoryDetailActions').querySelector('.history-detail-action') || byId('closeProjectHistoryDetails')).focus({ preventScroll: true });
    }
    window.showToast?.(action.label + ' completed');
    return true;
  }

  function createProjectHistoryActionButton(record, kind, action, surface, actionCount) {
    const className = surface === 'detail'
      ? 'history-detail-action'
      : 'project-history-card-action project-history-card-action-' + action.variant;
    const button = createNode('button', className, action.label);
    if (action.key === 'cancel') setRecordCancelButton(button, actionCount, surface === 'detail');
    else if (action.key === 'discard' && surface === 'detail') setRecordDeleteButton(button);
    button.type = 'button';
    button.dataset.historyAction = action.key;
    button.addEventListener('click', event => {
      event.stopPropagation();
      executeProjectHistoryAction(record, kind, action);
    });
    return button;
  }

  function createCardActions(record, kind) {
    const descriptors = getProjectHistoryActions(record);
    if (!descriptors.length) return null;
    const actions = createNode('div', 'project-history-card-actions');
    actions.setAttribute('aria-label', recordReviewStatusLabel(record.status) + ' actions');
    for (const action of descriptors) {
      actions.append(createProjectHistoryActionButton(record, kind, action, 'card', descriptors.length));
    }
    return actions;
  }

  function createWorkPlanCard(record) {
    const card = createNode('article', 'project-history-card');
    card.dataset.recordId = record.id;
    card.dataset.status = statusKey(record.status);
    card.setAttribute('aria-label', 'View ' + record.title + ' details');

    const details = createNode('div', 'project-history-card-details');
    details.append(
      createDataRow('Scheduled', formatSchedule(record)),
      createDataRow('Deadline', formatDate(record.deadline))
    );
    card.append(createCardTop(record.title, record.id, record.status), details);
    const actions = createCardActions(record, 'work-plan');
    if (actions) card.append(actions);
    makeCardInteractive(card, () => openWorkPlanDetails(record));
    return card;
  }

  function createTimesheetCard(record) {
    const card = createNode('article', 'project-history-card');
    card.dataset.recordId = record.id;
    card.dataset.status = statusKey(record.status);
    card.setAttribute('aria-label', 'View timesheet for ' + formatDate(record.date));

    const details = createNode('div', 'project-history-card-details');
    details.append(
      createDataRow('Normal Hours', formatMinutes(record.normalMinutes)),
      createDataRow('OT Hours', formatMinutes(record.overtimeMinutes))
    );
    card.append(createCardTop(formatDate(record.date), record.id, record.status), details);
    const actions = createCardActions(record, 'timesheet');
    if (actions) card.append(actions);
    makeCardInteractive(card, () => openTimesheetDetails(record));
    return card;
  }

  function getWorkPlanFilters() {
    return {
      title: byId('workPlanFilterTitle').value.trim().toLowerCase(),
      description: byId('workPlanFilterDescription').value.trim().toLowerCase(),
      deadlineFrom: byId('workPlanFilterDeadlineFrom').value,
      deadlineTo: byId('workPlanFilterDeadlineTo').value,
      scheduledFrom: byId('workPlanFilterScheduledFrom').value,
      scheduledTo: byId('workPlanFilterScheduledTo').value,
      status: byId('workPlanFilterStatus').value,
      overdue: byId('workPlanFilterOverdue').checked
    };
  }

  function matchesWorkPlanFilters(record, filters) {
    if (filters.title && !record.title.toLowerCase().includes(filters.title)) return false;
    if (filters.description && !record.description.toLowerCase().includes(filters.description)) return false;
    if (filters.deadlineFrom && (!record.deadline || record.deadline < filters.deadlineFrom)) return false;
    if (filters.deadlineTo && (!record.deadline || record.deadline > filters.deadlineTo)) return false;

    const scheduleStart = record.scheduleFrom || record.scheduleTo;
    const scheduleEnd = record.scheduleTo || record.scheduleFrom;
    if (filters.scheduledFrom && (!scheduleEnd || scheduleEnd < filters.scheduledFrom)) return false;
    if (filters.scheduledTo && (!scheduleStart || scheduleStart > filters.scheduledTo)) return false;
    if (filters.status !== 'all' && statusKey(record.status) !== filters.status) return false;
    if (filters.overdue && !record.isOverdue) return false;
    return true;
  }

  function selectedText(selectId) {
    const select = byId(selectId);
    return select.options[select.selectedIndex].text;
  }

  function formatRange(from, to) {
    if (from && to) return formatDate(from) + ' - ' + formatDate(to);
    return formatDate(from || to);
  }

  function updateWorkPlanFilterSummary(filters) {
    const parts = [];
    if (filters.title) parts.push('Title: ' + byId('workPlanFilterTitle').value.trim());
    if (filters.description) parts.push('Description: ' + byId('workPlanFilterDescription').value.trim());
    if (filters.deadlineFrom || filters.deadlineTo) parts.push('Deadline: ' + formatRange(filters.deadlineFrom, filters.deadlineTo));
    if (filters.scheduledFrom || filters.scheduledTo) parts.push('Scheduled: ' + formatRange(filters.scheduledFrom, filters.scheduledTo));
    if (filters.status !== 'all') parts.push(selectedText('workPlanFilterStatus'));
    if (filters.overdue) parts.push('Is Overdue');
    byId('workPlanHistoryFilterSummary').textContent = parts.length ? parts.join(' · ') : 'All Work Plans';
  }

  function renderWorkPlans() {
    const filters = getWorkPlanFilters();
    const records = getWorkPlans().filter(record => matchesWorkPlanFilters(record, filters));
    byId('workPlanHistoryList').replaceChildren(...records.map(createWorkPlanCard));
    byId('workPlanHistoryCount').textContent = String(records.length);
    updateWorkPlanFilterSummary(filters);
  }

  function getTimesheetFilters() {
    return {
      year: byId('timesheetFilterYear').value,
      month: byId('timesheetFilterMonth').value
    };
  }

  function matchesTimesheetFilters(record, filters) {
    const match = record.date.match(/^([0-9]{4})-([0-9]{2})-[0-9]{2}$/);
    if (!match) return filters.year === 'all' && filters.month === 'all';
    if (filters.year !== 'all' && match[1] !== filters.year) return false;
    if (filters.month !== 'all' && Number(match[2]) !== Number(filters.month)) return false;
    return true;
  }

  function updateTimesheetFilterSummary(filters) {
    const parts = [];
    if (filters.year !== 'all') parts.push(selectedText('timesheetFilterYear'));
    if (filters.month !== 'all') parts.push(selectedText('timesheetFilterMonth'));
    byId('timesheetHistoryFilterSummary').textContent = parts.length ? parts.join(' · ') : 'All Timesheets';
  }

  function renderTimesheets() {
    const filters = getTimesheetFilters();
    const records = getTimesheets()
      .filter(record => matchesTimesheetFilters(record, filters))
      .sort((first, second) => second.date.localeCompare(first.date));
    byId('timesheetHistoryList').replaceChildren(...records.map(createTimesheetCard));
    byId('timesheetHistoryCount').textContent = String(records.length);
    updateTimesheetFilterSummary(filters);
  }

  function createDetailRow(label, value) {
    const row = createNode('div', 'project-history-detail-row');
    const detailValue = createNode('strong');
    if (value instanceof Node) detailValue.append(value);
    else detailValue.textContent = displayValue(value);
    row.append(createNode('span', '', label), detailValue);
    return row;
  }

  function createAttachments(attachments) {
    if (!attachments.length) return createNode('span', '', 'No attachments');
    const list = createNode('div', 'project-history-attachments');
    for (const attachment of attachments) {
      const item = createNode('span', 'project-history-attachment');
      const icon = createNode('i', 'fa-solid fa-paperclip');
      icon.setAttribute('aria-hidden', 'true');
      item.append(icon, createNode('span', '', attachment.name));
      list.append(item);
    }
    return list;
  }

  function renderWorkPlanDetails(record) {
    const section = createNode('section', 'project-history-detail-section');
    section.dataset.detailSection = 'work-plan';
    section.append(
      createDetailRow('Reference #', record.id),
      createDetailRow('Task Category', record.taskCategory),
      createDetailRow('Sub Task', record.subTask),
      createDetailRow('Project', record.project),
      createDetailRow('Milestone', record.milestone),
      createDetailRow('Schedule From', formatDate(record.scheduleFrom)),
      createDetailRow('Schedule To', formatDate(record.scheduleTo)),
      createDetailRow('Status', recordDetailStatus.create(record.status)),
      createDetailRow('Assignee', record.assignee),
      createDetailRow('Est. Complete', formatDate(record.estimatedComplete)),
      createDetailRow('Act. Complete', formatDate(record.actualComplete)),
      createDetailRow('Allocated Hour', formatHours(record.allocatedHours)),
      createDetailRow('Actual Hour', formatHours(record.actualHours)),
      createDetailRow('Priority', record.priority),
      createDetailRow('Completion %', record.completion + '%'),
      createDetailRow('Remarks', record.remarks),
      createDetailRow('Hours', formatHours(record.hours)),
      createDetailRow('OT Hours', formatHours(record.otHours)),
      createDetailRow('Reassign?', record.reassign ? 'Yes' : 'No'),
      createDetailRow('Reassign Remarks', record.reassignRemarks),
      createDetailRow('Reassign To', record.reassignTo),
      createDetailRow('Reassign Date', formatDate(record.reassignDate)),
      createDetailRow('Attachments', createAttachments(record.attachments))
    );
    return section;
  }

  function renderTimesheetDetails(record) {
    const summary = createNode('section', 'project-history-detail-section');
    summary.dataset.detailSection = 'timesheet-summary';
    summary.append(
      createDetailRow('Reference #', record.id),
      createDetailRow('Date', formatDate(record.date)),
      createDetailRow('Remark', record.remark),
      createDetailRow('Status', recordDetailStatus.create(record.status)),
      createDetailRow('Normal Hours', formatMinutes(record.normalMinutes)),
      createDetailRow('OT Hours', formatMinutes(record.overtimeMinutes))
    );

    const content = [summary, createNode('h3', 'project-history-detail-subtitle', 'Work Details')];
    if (!record.activities.length) {
      const empty = createNode('section', 'project-history-detail-activity');
      empty.append(createNode('div', 'project-history-detail-activity-header', 'No work details recorded'));
      content.push(empty);
      return content;
    }

    record.activities.forEach((activity, index) => {
      const item = createNode('section', 'project-history-detail-activity');
      item.dataset.detailActivity = String(index);
      const header = createNode('div', 'project-history-detail-activity-header');
      const icon = createNode('i', 'fa-solid fa-list-check');
      icon.setAttribute('aria-hidden', 'true');
      header.append(icon, createNode('span', '', 'Work Item ' + (index + 1)));
      item.append(
        header,
        createDetailRow('Title', activity.title),
        createDetailRow('Description', activity.description),
        createDetailRow('Project', activity.project),
        createDetailRow('Is AdHocTask?', activity.adhoc ? 'Yes' : 'No'),
        createDetailRow('Task', activity.task),
        createDetailRow('Is Overtime?', activity.overtime ? 'Yes' : 'No'),
        createDetailRow('Time From', activity.timeFrom),
        createDetailRow('Completion %', activity.completion + '%'),
        createDetailRow('Time To', activity.timeTo)
      );
      content.push(item);
    });
    return content;
  }

  function setDetailIcon(iconName) {
    const icon = document.querySelector('.project-history-detail-icon i');
    icon.className = 'fa-solid ' + iconName;
  }

  function renderProjectDetailActions(record, kind) {
    const footer = byId('projectHistoryDetailActions');
    const actions = getProjectHistoryActions(record);
    footer.replaceChildren(...actions.map(action => createProjectHistoryActionButton(record, kind, action, 'detail', actions.length)));
    footer.hidden = actions.length === 0;
  }

  function replaceProjectHistoryDetailContent(record, kind) {
    const content = kind === 'work-plan' ? [renderWorkPlanDetails(record)] : renderTimesheetDetails(record);
    byId('projectHistoryDetailContent').replaceChildren(...content);
    renderProjectDetailActions(record, kind);
  }

  function refreshProjectHistoryDetails() {
    if (!activeProjectHistoryDetail) return;
    const record = getProjectHistoryRecord(activeProjectHistoryDetail.kind, activeProjectHistoryDetail.id);
    if (!record) {
      closeOverlay('projectHistoryDetailOverlay', false);
      return;
    }
    replaceProjectHistoryDetailContent(record, activeProjectHistoryDetail.kind);
  }

  function openDetails(title, iconName, record, kind) {
    const overlay = byId('projectHistoryDetailOverlay');
    lastFocusedElement = document.activeElement;
    activeProjectHistoryDetail = { kind, id: record.id };
    byId('projectHistoryDetailTitle').textContent = title;
    setDetailIcon(iconName);
    replaceProjectHistoryDetailContent(record, kind);
    overlay.hidden = false;
    overlay.querySelector('.project-history-detail-sheet').scrollTop = 0;
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      byId('closeProjectHistoryDetails').focus({ preventScroll: true });
    });
  }

  function openWorkPlanDetails(record) {
    openDetails('Work Plan Details', 'fa-clipboard-list', record, 'work-plan');
  }

  function openTimesheetDetails(record) {
    openDetails('Timesheet Details', 'fa-clock', record, 'timesheet');
  }

  function closeOverlay(id, restoreFocus) {
    const overlay = byId(id);
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    if (id === 'projectHistoryDetailOverlay') activeProjectHistoryDetail = null;
    if (restoreFocus !== false && lastFocusedElement?.isConnected) lastFocusedElement.focus({ preventScroll: true });
  }

  function openFilter(overlayId, focusId) {
    const overlay = byId(overlayId);
    lastFocusedElement = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      byId(focusId).focus({ preventScroll: true });
    });
  }

  function closeAllOverlays(restoreFocus) {
    closeOverlay('workPlanHistoryFilterOverlay', restoreFocus);
    closeOverlay('timesheetHistoryFilterOverlay', restoreFocus);
    closeOverlay('projectHistoryDetailOverlay', restoreFocus);
  }

  function switchHistoryTab(name, focusTab) {
    const selected = name === 'timesheet' ? 'timesheet' : 'workPlan';
    for (const tabName of ['workPlan', 'timesheet']) {
      const active = tabName === selected;
      const tab = byId('historyTab-' + tabName);
      const panel = byId(tabName + 'HistoryPanel');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
      if (active && focusTab) tab.focus({ preventScroll: true });
    }
    closeAllOverlays(false);
  }

  function bindOverlayDismiss(overlayId) {
    byId(overlayId).addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay(overlayId);
    });
  }

  function initHistory() {
    if (!byId('workPlanHistoryPanel')) return;
    renderWorkPlans();
    renderTimesheets();

    byId('openWorkPlanHistoryFilter').addEventListener('click', () => openFilter('workPlanHistoryFilterOverlay', 'workPlanFilterTitle'));
    byId('closeWorkPlanHistoryFilter').addEventListener('click', () => closeOverlay('workPlanHistoryFilterOverlay'));
    byId('workPlanHistoryFilterForm').addEventListener('submit', event => {
      event.preventDefault();
      renderWorkPlans();
      closeOverlay('workPlanHistoryFilterOverlay');
    });
    byId('applyWorkPlanHistoryFilter').addEventListener('click', () => {
      renderWorkPlans();
      closeOverlay('workPlanHistoryFilterOverlay');
    });
    byId('resetWorkPlanHistoryFilter').addEventListener('click', () => {
      byId('workPlanHistoryFilterForm').reset();
      renderWorkPlans();
    });

    byId('openTimesheetHistoryFilter').addEventListener('click', () => openFilter('timesheetHistoryFilterOverlay', 'timesheetFilterYear'));
    byId('closeTimesheetHistoryFilter').addEventListener('click', () => closeOverlay('timesheetHistoryFilterOverlay'));
    byId('timesheetHistoryFilterForm').addEventListener('submit', event => {
      event.preventDefault();
      renderTimesheets();
      closeOverlay('timesheetHistoryFilterOverlay');
    });
    byId('applyTimesheetHistoryFilter').addEventListener('click', () => {
      renderTimesheets();
      closeOverlay('timesheetHistoryFilterOverlay');
    });
    byId('resetTimesheetHistoryFilter').addEventListener('click', () => {
      byId('timesheetHistoryFilterForm').reset();
      renderTimesheets();
    });

    byId('closeProjectHistoryDetails').addEventListener('click', () => closeOverlay('projectHistoryDetailOverlay'));
    bindOverlayDismiss('workPlanHistoryFilterOverlay');
    bindOverlayDismiss('timesheetHistoryFilterOverlay');
    bindOverlayDismiss('projectHistoryDetailOverlay');

    for (const tabName of ['workPlan', 'timesheet']) {
      const tab = byId('historyTab-' + tabName);
      tab.addEventListener('click', () => switchHistoryTab(tabName));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' || event.key === 'ArrowLeft' ? 'workPlan' : 'timesheet';
        switchHistoryTab(next, true);
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!byId('projectHistoryDetailOverlay').hidden) closeOverlay('projectHistoryDetailOverlay');
      else if (!byId('timesheetHistoryFilterOverlay').hidden) closeOverlay('timesheetHistoryFilterOverlay');
      else if (!byId('workPlanHistoryFilterOverlay').hidden) closeOverlay('workPlanHistoryFilterOverlay');
    });
    window.addEventListener('storage', event => {
      const workPlansChanged = !event.key || event.key === 'pq_project_work_plans';
      const timesheetsChanged = !event.key || event.key === 'pq_project_timesheets' || event.key === 'pq_project_timesheet_draft';
      if (workPlansChanged) renderWorkPlans();
      if (timesheetsChanged) renderTimesheets();
      if (activeProjectHistoryDetail
        && ((activeProjectHistoryDetail.kind === 'work-plan' && workPlansChanged)
          || (activeProjectHistoryDetail.kind === 'timesheet' && timesheetsChanged))) {
        refreshProjectHistoryDetails();
      }
    });
    document.documentElement.dataset.projectHistoryReady = 'true';
  }

  initHistory();
})();
