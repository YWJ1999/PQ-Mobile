/* Individual forms use local persistence until the Project & Task API is connected. */
(function () {
  const projects = ['Project Alpha (HCM Rebrand)', 'Internal System Maintenance', 'Client Portal Upgrade'];
  const taskCategories = ['Development', 'Maintenance', 'Support'];
  const tasks = ['System Deployment', 'System Maintenance', 'Portal Upgrade'];
  const byId = id => document.getElementById(id);

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function icon(className) {
    const element = node('i', 'fa-solid ' + className);
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function readStored(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function writeStored(key, value, feedback) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      showFeedback(feedback, 'Unable to save. Please try again.', true);
      return false;
    }
  }

  function showFeedback(id, message, error = false) {
    const element = byId(id);
    element.textContent = message;
    element.hidden = false;
    element.classList.toggle('is-error', error);
    element.scrollIntoView({ block: 'nearest' });
  }

  function record(kind, data) {
    return { id: `${kind}-${crypto.randomUUID()}`, status: 'Pending Approval', createdAt: new Date().toISOString(), ...data };
  }

  function saveRecord(key, value, feedback) {
    const previous = readStored(key, []);
    const entries = Array.isArray(previous) ? previous : [];
    return writeStored(key, [...entries, value], feedback);
  }

  function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function fillOptions(selector, placeholder, values) {
    for (const select of document.querySelectorAll(selector)) {
      select.replaceChildren(new Option(placeholder, ''), ...values.map(value => new Option(value, value)));
    }
  }

  function requireText(id, label) {
    const input = byId(id);
    input.setCustomValidity(input.value.trim() ? '' : `Please enter ${label.toLowerCase()}.`);
  }

  function initAttachments(form, inputIds, listId) {
    const attachments = [];
    function renderAttachments() {
      byId(listId).replaceChildren(...attachments.map((file, index) => {
        const row = node('div', 'attachment-upload-item');
        const fileIcon = node('span', 'attachment-upload-icon');
        fileIcon.append(icon('fa-paperclip'));
        const name = node('span', 'attachment-upload-name', file.name);
        name.title = file.name;
        const remove = node('button', 'attachment-upload-remove');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Remove ' + file.name);
        remove.append(icon('fa-xmark'));
        remove.addEventListener('click', () => { attachments.splice(index, 1); renderAttachments(); });
        row.append(fileIcon, name, remove);
        return row;
      }));
    }
    for (const button of form.querySelectorAll('[data-pick-file]')) {
      button.addEventListener('click', () => byId(button.dataset.pickFile).click());
    }
    for (const id of inputIds) {
      byId(id).addEventListener('change', event => {
        for (const file of event.target.files) {
          if (!attachments.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) attachments.push(file);
        }
        renderAttachments();
        event.target.value = '';
      });
    }
    return attachments;
  }

  function initWorkPlan() {
    const form = byId('workPlanForm');
    if (!form) return;
    const attachments = initAttachments(form, ['workPlanFiles', 'workPlanCamera'], 'workPlanAttachments');
    form.addEventListener('submit', event => {
      event.preventDefault();
      requireText('workPlanTitle', 'Title');
      requireText('workPlanDescription', 'Description');
      const from = byId('workPlanScheduleFrom').value;
      const to = byId('workPlanScheduleTo').value;
      byId('workPlanScheduleTo').setCustomValidity(from && to && to < from ? 'Schedule To must be on or after Schedule From.' : '');
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      data.title = data.title.trim();
      data.description = data.description.trim();
      data.priority = Number(data.priority);
      data.allocatedHours = Number(data.allocatedHours);
      data.attachments = attachments.map(file => ({ name: file.name, size: file.size, type: file.type }));
      if (saveRecord('pq_project_work_plans', record('WP', data), 'workPlanFeedback')) showFeedback('workPlanFeedback', 'Work plan saved.');
    });
  }

  function initWorkAssignment() {
    const form = byId('workAssignmentForm');
    if (!form) return;
    const attachments = initAttachments(form, ['workAssignmentFiles', 'workAssignmentCamera'], 'workAssignmentAttachments');
    const picker = form.querySelector('.project-assignee-picker');
    const trigger = byId('workAssignmentAssigneeTrigger');
    const optionsPanel = byId('workAssignmentAssigneeOptions');
    const assigneeInputs = [...optionsPanel.querySelectorAll('input[type="checkbox"]')];

    function selectedAssignees() {
      return assigneeInputs.filter(input => input.checked);
    }

    function closeAssignees() {
      optionsPanel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }

    function renderAssignees() {
      const selected = selectedAssignees();
      byId('workAssignmentAssigneeSummary').textContent = selected.length
        ? `${selected.length} assignee${selected.length === 1 ? '' : 's'} selected`
        : 'Select assignee(s)';
      byId('workAssignmentAssigneeSelection').replaceChildren(...selected.map(input => {
        const label = input.closest('.project-assignee-option');
        return node('span', 'project-assignee-chip', label.querySelector('.project-assignee-name').textContent);
      }));
    }

    trigger.addEventListener('click', () => {
      const willOpen = optionsPanel.hidden;
      optionsPanel.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    for (const input of assigneeInputs) input.addEventListener('change', renderAssignees);
    document.addEventListener('click', event => {
      if (!optionsPanel.hidden && !picker.contains(event.target)) closeAssignees();
    });
    form.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || optionsPanel.hidden) return;
      closeAssignees();
      trigger.focus({ preventScroll: true });
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      requireText('workAssignmentTitle', 'Title');
      requireText('workAssignmentDescription', 'Description');
      const scheduleFrom = byId('workAssignmentScheduleFrom').value;
      const scheduleTo = byId('workAssignmentScheduleTo').value;
      byId('workAssignmentScheduleTo').setCustomValidity(
        scheduleFrom && scheduleTo && scheduleTo < scheduleFrom
          ? 'Schedule To must be on or after Schedule From.'
          : ''
      );
      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form));
      data.title = data.title.trim();
      data.description = data.description.trim();
      data.priority = Number(data.priority);
      data.assignees = selectedAssignees().map(input => input.value);
      data.attachments = attachments.map(file => ({ name: file.name, size: file.size, type: file.type }));
      data.status = 'Assigned';
      if (saveRecord('pq_project_work_assignments', record('WA', data), 'workAssignmentFeedback')) {
        showFeedback('workAssignmentFeedback', 'Work assignment submitted.');
      }
    });
    renderAssignees();
  }

  function initTimesheet() {
    const form = byId('timesheetForm');
    if (!form) return;
    const activityForm = byId('workActivityForm');
    const draft = readStored('pq_project_timesheet_draft', null);
    let savedDraft = draft ? JSON.stringify(draft) : null;
    let activities = [];
    let editing = null;
    if (draft && typeof draft === 'object') {
      if (typeof draft.date === 'string') byId('timesheetDate').value = draft.date;
      if (typeof draft.remark === 'string') byId('timesheetRemark').value = draft.remark;
      if (Array.isArray(draft.activities)) activities = draft.activities.filter(item => item && typeof item.title === 'string' && TimesheetRequests.duration(item.timeFrom, item.timeTo) > 0);
    }

    function showMain() {
      byId('timesheet-main-view').hidden = false;
      byId('timesheet-entry-view').hidden = true;
      document.querySelector('.project-header h1').textContent = 'Time Sheet';
      document.querySelector('.project-task-content').scrollTop = 0;
      editing = null;
    }

    function openActivity(index = null) {
      editing = index;
      activityForm.reset();
      for (const control of activityForm.elements) if (typeof control.setCustomValidity === 'function') control.setCustomValidity('');
      if (index !== null) {
        for (const [name, value] of Object.entries(activities[index])) {
          const input = activityForm.elements.namedItem(name);
          if (!input) continue;
          if (input.type === 'checkbox') input.checked = Boolean(value);
          else input.value = value;
        }
      }
      const title = index === null ? 'Add Work Activity' : 'Edit Work Activity';
      byId('activityFormHeading').textContent = title;
      document.querySelector('.project-header h1').textContent = title;
      byId('activityFeedback').hidden = true;
      byId('timesheet-main-view').hidden = true;
      byId('timesheet-entry-view').hidden = false;
      updateNextDay();
      document.querySelector('.project-task-content').scrollTop = 0;
      byId('activityTitle').focus({ preventScroll: true });
    }

    function updateNextDay() {
      const from = byId('activityTimeFrom').value;
      const to = byId('activityTimeTo').value;
      byId('activityNextDay').hidden = !(from && to && to < from);
    }

    function renderActivities() {
      TimesheetView.render(form, activities, {
        edit: openActivity,
        remove(index) { activities.splice(index, 1); renderActivities(); }
      });
    }

    byId('addWorkActivity').addEventListener('click', () => openActivity());
    byId('cancelWorkActivity').addEventListener('click', showMain);
    document.querySelector('.project-back').addEventListener('click', event => {
      if (byId('timesheet-entry-view').hidden) return;
      event.preventDefault();
      showMain();
    });
    for (const id of ['activityTimeFrom', 'activityTimeTo']) byId(id).addEventListener('input', updateNextDay);
    activityForm.addEventListener('submit', event => {
      event.preventDefault();
      requireText('activityTitle', 'Title');
      const from = byId('activityTimeFrom').value;
      const to = byId('activityTimeTo').value;
      byId('activityTimeTo').setCustomValidity(from && to && TimesheetRequests.duration(from, to) === 0 ? 'Time To must differ from Time From.' : '');
      if (!activityForm.reportValidity()) return;
      const activity = Object.fromEntries(new FormData(activityForm));
      activity.title = activity.title.trim();
      activity.adhoc = byId('activityAdhoc').checked;
      activity.overtime = byId('activityOvertime').checked;
      activity.completion = Number(activity.completion);
      if (editing === null) activities.push(activity);
      else activities[editing] = activity;
      renderActivities();
      showMain();
      byId('addWorkActivity').focus({ preventScroll: true });
    });
    byId('saveTimesheetDraft').addEventListener('click', () => {
      const data = { date: byId('timesheetDate').value, remark: byId('timesheetRemark').value, activities };
      if (writeStored('pq_project_timesheet_draft', data, 'timesheetFeedback')) {
        savedDraft = JSON.stringify(data);
        showFeedback('timesheetFeedback', 'Timesheet draft saved.');
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = byId('submitTimesheet');
      if (submit.disabled || !form.reportValidity()) return;
      if (!activities.length) {
        showFeedback('timesheetFeedback', 'Add at least one work activity before submitting.', true);
        return;
      }
      submit.disabled = true;
      try {
        const data = { date: byId('timesheetDate').value, remark: byId('timesheetRemark').value,
          employeeName: previewUserName, employeeId: 'EBB01', ...TimesheetRequests.totals(activities), activities: [...activities] };
        await TimesheetRequests.submit(record('TS', data), savedDraft);
        savedDraft = null;
        showFeedback('timesheetFeedback', 'Timesheet saved.');
      } catch {
        showFeedback('timesheetFeedback', 'Unable to submit the timesheet. Please try again.', true);
      } finally {
        submit.disabled = false;
      }
    });
    renderActivities();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const fields = byId('timesheetFields');
    if (fields) fields.replaceWith(TimesheetView.fields());
    fillOptions('[data-project-select]', '- Select Project -', projects);
    fillOptions('[data-task-category-select]', '- Select Task Category -', taskCategories);
    fillOptions('[data-task-select]', '- Select Task -', tasks);
    for (const input of document.querySelectorAll('[data-today]')) input.value = localDate();
    for (const form of document.querySelectorAll('form')) {
      form.addEventListener('input', event => {
        if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
      });
    }
    initWorkPlan();
    initWorkAssignment();
    initTimesheet();
  });
})();
