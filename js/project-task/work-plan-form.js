function createWorkPlanFields() {
  const template = document.createElement('template');
  template.innerHTML = `<section class="form-card work-plan-fields" aria-labelledby="workPlanDetailsHeading">
  <div class="section-header-bar"><span class="section-title-accent" aria-hidden="true"></span><h2 class="section-title-text" id="workPlanDetailsHeading">Work Plan Details</h2></div>
  <div class="field-group"><label class="field-label" for="workPlanTitle">Title <span class="req">*</span></label><input id="workPlanTitle" name="title" class="form-ctrl" maxlength="200" placeholder="Enter work plan title" required></div>
  <div class="field-group"><label class="field-label" for="workPlanDescription">Description <span class="req">*</span></label><textarea id="workPlanDescription" name="description" class="form-ctrl" rows="3" placeholder="Describe the planned work" required></textarea></div>
  <div class="field-group"><label class="field-label" for="workPlanProject">Project</label><div class="select-wrapper"><select id="workPlanProject" name="project" class="form-ctrl" data-project-select></select></div></div>
  <div class="field-group"><label class="field-label" for="workPlanMilestone">Milestone</label><input id="workPlanMilestone" name="milestone" class="form-ctrl" placeholder="Enter milestone"></div>
  <div class="section-header-bar work-plan-divider"><span class="section-title-accent" aria-hidden="true"></span><h3 class="section-title-text">Schedule &amp; Deadline</h3></div>
  <fieldset class="field-group"><legend class="field-label">Scheduled</legend><div class="project-form-grid">
    <div><label class="project-form-sub-label" for="workPlanScheduleFrom">From</label><input type="date" id="workPlanScheduleFrom" name="scheduleFrom" class="form-ctrl" data-today></div>
    <div><label class="project-form-sub-label" for="workPlanScheduleTo">To</label><input type="date" id="workPlanScheduleTo" name="scheduleTo" class="form-ctrl" data-today></div>
  </div></fieldset>
  <div class="field-group"><label class="field-label" for="workPlanDeadline">Deadline <span class="req">*</span></label><input type="date" id="workPlanDeadline" name="deadline" class="form-ctrl" data-today required></div>
  <div class="section-header-bar work-plan-divider"><span class="section-title-accent" aria-hidden="true"></span><h3 class="section-title-text">Task Details</h3></div>
  <div class="field-group"><label class="field-label" for="workPlanTaskCategory">Task Category</label><div class="select-wrapper"><select id="workPlanTaskCategory" name="taskCategory" class="form-ctrl" data-task-category-select></select></div></div>
  <div class="field-group"><label class="field-label" for="workPlanTask">Task</label><div class="select-wrapper"><select id="workPlanTask" name="task" class="form-ctrl" data-task-select></select></div></div>
  <div class="project-form-grid">
    <div class="field-group"><label class="field-label" for="workPlanPriority">Priority</label><input type="number" id="workPlanPriority" name="priority" class="form-ctrl" value="0" min="0" step="1" inputmode="numeric"></div>
    <div class="field-group"><label class="field-label" for="workPlanAllocatedHours">Allocated Hours</label><input type="number" id="workPlanAllocatedHours" name="allocatedHours" class="form-ctrl" value="0" min="0" step="0.01" inputmode="decimal"></div>
  </div>
  <div class="field-group"><label class="field-label" for="workPlanRemarks">Remarks</label><textarea id="workPlanRemarks" name="remarks" class="form-ctrl" rows="3" placeholder="Add any additional remarks"></textarea></div>
  <fieldset class="field-group">
    <legend class="field-label form-section-heading">Upload Attachments</legend>
    <div class="project-upload-actions">
      <button type="button" class="project-upload-button" data-pick-file="workPlanFiles"><span class="project-upload-icon"><i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i></span><span>Select File(s)</span></button>
      <button type="button" class="project-upload-button" data-pick-file="workPlanCamera"><span class="project-upload-icon"><i class="fa-solid fa-camera" aria-hidden="true"></i></span><span>Take a Picture</span></button>
    </div>
    <input type="file" id="workPlanFiles" multiple hidden>
    <input type="file" id="workPlanCamera" accept="image/*" capture="environment" hidden>
    <div id="workPlanAttachments" class="attachment-upload-list" aria-live="polite"></div>
  </fieldset>
</section>`;
  return template.content.firstElementChild;
}

(() => {
  const fields = document.getElementById('workPlanFields');
  if (!fields) return;
  fields.replaceWith(createWorkPlanFields());

  function syncReturnLinks() {
    const theme = getCurrentTheme() === 'light' ? 'light' : 'dark';
    document.querySelectorAll('[data-work-plan-back]').forEach(link => {
      link.href = `../index.html?scope=individual&theme=${theme}`;
    });
  }
  document.addEventListener('DOMContentLoaded', syncReturnLinks);
  new MutationObserver(syncReturnLinks).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
})();
