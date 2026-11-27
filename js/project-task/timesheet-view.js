// The application and its approval page use the same cards and activity disclosure.
const TimesheetView = (() => {
  function node(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function icon(name) {
    const el = node('i', 'fa-solid ' + name);
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function fields() {
    const template = document.createElement('template');
    template.innerHTML = `<section class="form-card" aria-labelledby="timesheetDetailsHeading">
  <div class="section-header-bar"><span class="section-title-accent" aria-hidden="true"></span><h2 class="section-title-text" id="timesheetDetailsHeading">Timesheet Details</h2></div>
  <div class="field-group"><label class="field-label" for="timesheetDate">Timesheet Date <span class="req">*</span></label><input type="date" id="timesheetDate" name="date" class="form-ctrl" data-today required></div>
  <div class="field-group"><span class="field-label">Clock Times</span><div class="project-clock-times" id="timesheetClockTimes">No clock times recorded</div></div>
  <div class="project-hours-summary" aria-live="polite">
    <div class="project-hours-stat"><span>Normal Work Hours</span><strong id="normalWorkHours">0.00 Hours</strong></div>
    <div class="project-hours-stat"><span>Overtime Hours</span><strong id="overtimeHours">0.00 Hours</strong></div>
  </div>
  <div class="field-group"><label class="field-label" for="timesheetRemark">Remark</label><textarea id="timesheetRemark" name="remark" class="form-ctrl" rows="3"></textarea></div>
</section>
<section class="form-card project-activities-card" aria-labelledby="workActivityHeading">
  <div class="project-activities-header">
    <div class="project-activities-heading"><span class="project-option-icon"><i class="fa-solid fa-list-check" aria-hidden="true"></i></span><div><h2 class="form-section-heading" id="workActivityHeading">Work Activity</h2><span class="project-activities-total" id="workActivityTotal">Total Hours: 0.00 hrs</span></div></div>
    <button type="button" class="btn-submit-primary project-add-activity" id="addWorkActivity" aria-label="Add Work Activity" title="Add Work Activity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
  </div>
  <div class="project-activities-list" id="workActivityList"></div>
</section>`;
    return template.content;
  }

  function yesNo(value) {
    return value == null ? '—' : value ? 'Yes' : 'No';
  }

  function activityCard(activity, index, options) {
    const item = node('article', 'project-activity-item');
    const top = node('div', 'project-activity-top');
    const heading = node('div', 'project-activity-heading');
    const symbol = node('span', 'project-activity-symbol');
    symbol.append(icon('fa-clock'));
    const copy = node('div', 'project-activity-copy');
    const title = node('h3', 'project-activity-title', activity.title || 'Work activity');
    title.title = title.textContent;
    const time = node('div', 'project-activity-time', `${activity.timeFrom || '—'} - ${activity.timeTo || '—'}${activity.timeTo < activity.timeFrom ? ' (+1 day)' : ''}`);
    copy.append(title, time);
    heading.append(symbol, copy);
    const toggle = node('button', 'project-activity-details-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'activity-details-' + index);
    toggle.setAttribute('aria-label', 'Expand details for ' + activity.title);
    toggle.title = 'Expand Details';
    toggle.append(icon('fa-chevron-down'));
    const details = node('div', 'project-activity-details');
    details.id = 'activity-details-' + index;
    details.hidden = true;
    for (const [label, value] of [
      ['Title', activity.title], ['Description', activity.description], ['Is Adhoc Task?', yesNo(activity.adhoc ?? activity.isAdHocTask)],
      ['Project', activity.project], ['Task', activity.task], ['Is Overtime?', yesNo(activity.overtime ?? activity.isOvertime)],
      ['Time From', activity.timeFrom], ['Time To', activity.timeTo], ['Completion %', activity.completion == null || activity.completion === '' ? '—' : activity.completion + '%']
    ]) {
      const row = node('div', 'project-activity-data-row');
      row.append(node('span', '', label), node('span', '', value || '—'));
      details.append(row);
    }
    function toggleDetails() {
      details.hidden = !details.hidden;
      toggle.setAttribute('aria-expanded', String(!details.hidden));
      toggle.setAttribute('aria-label', (details.hidden ? 'Expand details for ' : 'Collapse details for ') + activity.title);
      toggle.title = details.hidden ? 'Expand Details' : 'Collapse Details';
      toggle.querySelector('i').className = 'fa-solid ' + (details.hidden ? 'fa-chevron-down' : 'fa-chevron-up');
    }
    toggle.addEventListener('click', toggleDetails);
    top.addEventListener('click', event => {
      if (!event.target.closest('button')) toggleDetails();
    });
    const tools = node('div', 'project-activity-tools');
    const hours = activity.timeFrom && activity.timeTo ? (TimesheetRequests.duration(activity.timeFrom, activity.timeTo) / 60).toFixed(2) + ' hrs' : '—';
    tools.append(node('span', 'project-activity-hours', hours), toggle);
    if (options.edit) {
      const edit = node('button', 'project-activity-icon-button');
      edit.type = 'button';
      edit.dataset.editActivity = index;
      edit.setAttribute('aria-label', 'Edit ' + activity.title);
      edit.title = 'Edit Activity';
      edit.append(icon('fa-pen-to-square'));
      edit.addEventListener('click', () => options.edit(index));
      const remove = node('button', 'project-activity-icon-button project-activity-delete');
      remove.type = 'button';
      remove.dataset.deleteActivity = index;
      remove.setAttribute('aria-label', 'Delete ' + activity.title);
      remove.title = 'Delete Activity';
      remove.append(icon('fa-trash-can'));
      remove.addEventListener('click', () => options.remove(index));
      tools.append(edit, remove);
    }
    top.append(heading, tools);
    item.append(top, details);
    return item;
  }

  function render(root, activities, options = {}) {
    const total = options.record || {};
    const calculated = TimesheetRequests.totals(activities);
    const normal = Number(total.normalMinutes ?? calculated.normalMinutes);
    const overtime = Number(total.overtimeMinutes ?? calculated.overtimeMinutes);
    root.querySelector('#normalWorkHours').textContent = (normal / 60).toFixed(2) + ' Hours';
    root.querySelector('#overtimeHours').textContent = (overtime / 60).toFixed(2) + ' Hours';
    root.querySelector('#workActivityTotal').textContent = 'Total Hours: ' + ((calculated.normalMinutes + calculated.overtimeMinutes) / 60).toFixed(2) + ' hrs';
    const list = root.querySelector('#workActivityList');
    list.replaceChildren(...activities.map((activity, index) => activityCard(activity, index, options)));
    if (!activities.length) list.append(node('p', 'project-activities-empty', 'No work activities added yet'));
  }

  function review(root, record) {
    root.replaceChildren(fields());
    const submitted = recordSubmitDate.form(record.submittedAt);
    submitted.id = 'projectApprovalSubmitDate';
    submitted.classList.add('field-group');
    root.querySelector('.section-header-bar').after(submitted);
    root.querySelector('#addWorkActivity').remove();
    root.querySelector('.req').remove();
    for (const [id, value] of [['timesheetDate', record.dateLabel], ['timesheetRemark', record.remark]]) {
      const control = root.querySelector('#' + id);
      const output = node('div', 'form-ctrl project-review-value', value || '—');
      const label = control.labels[0];
      label.removeAttribute('for');
      label.id = id + 'Label';
      output.setAttribute('aria-labelledby', label.id);
      output.id = id;
      control.replaceWith(output);
    }
    if (record.clockTimes) root.querySelector('#timesheetClockTimes').textContent = record.clockTimes;
    render(root, record.activities || [], { record });
  }

  return { fields, render, review };
})();
