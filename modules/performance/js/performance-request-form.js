// The individual request and its read-only approval share the same fields, goals and competencies.
const PerformanceRequestForm = (() => {
  let itemSequence = 0;
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function icon(name) {
    const el = node('i', 'fa-solid ' + name);
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function appraisalFields(evaluation) {
    const prefix = evaluation ? 'selfEvaluation' : 'goalPlan';
    const content = document.createDocumentFragment();
    const employee = node('section', 'goal-plan-employee-form');
    const heading = node('h2', 'form-section-heading', 'Employee Details');
    heading.id = prefix + 'EmployeeHeading';
    employee.setAttribute('aria-labelledby', heading.id);
    employee.append(heading);
    function field(parent, suffix, label, key) {
      const group = node('div', 'goal-form-field');
      const caption = node('label', '', label);
      const input = node('input');
      input.type = 'text';
      input.readOnly = true;
      input.id = prefix + suffix;
      input.dataset.field = key;
      caption.htmlFor = input.id;
      group.append(caption, input);
      parent.append(group);
    }
    field(employee, evaluation ? 'Name' : 'EmployeeName', 'Name', 'name');
    field(employee, 'Position', 'Position', 'position');
    field(employee, 'Department', 'Department', 'department');
    field(employee, evaluation ? 'Supervisor' : 'SupervisorName', 'Supervisor', 'supervisor');
    field(employee, evaluation ? 'ReportTo' : 'ReportingName', 'Reporting To', 'reportingTo');
    if (evaluation) field(employee, 'Ref', 'Evaluation Ref#', 'evaluationRef');
    const pair = node('div', 'goal-form-grid');
    field(pair, 'Period', 'Period', 'period');
    field(pair, evaluation ? 'Type' : 'AppraisalType', evaluation ? 'Type' : 'Appraisal Type', 'appraisalType');
    employee.append(pair);
    const sections = node('section', 'goal-plan-sections');
    sections.setAttribute('aria-label', (evaluation ? 'Self Evaluation' : 'Goal Plan') + ' details');
    for (const [kind, title, symbol] of [
      ['goals', evaluation ? 'Goal' : 'Performance Goal', 'fa-bullseye'], ['competencies', 'Competency', 'fa-award']
    ]) {
      const button = node('button', 'goal-plan-section-card');
      button.type = 'button';
      button.dataset[evaluation ? 'evaluationSection' : 'planSection'] = kind;
      const image = node('span', 'goal-plan-section-icon');
      image.append(icon(symbol));
      const copy = node('span', 'goal-plan-section-copy');
      const count = node('small');
      count.id = prefix + (kind === 'goals' ? 'GoalsSummary' : 'CompetenciesSummary');
      copy.append(node('strong', 'goal-plan-section-name', title), count);
      const link = node('span', 'goal-plan-section-link', 'Details ');
      link.append(icon('fa-chevron-right'));
      button.append(image, copy, link);
      sections.append(button);
    }
    content.append(employee, sections);
    return content;
  }

  function selfReviewCard() {
    const template = document.createElement('template');
    template.innerHTML = `<div class="employee-career-form-card">
          <section class="employee-career-form-section" aria-labelledby="selfReviewEmployeeHeading">
            <h2 id="selfReviewEmployeeHeading" class="form-section-heading">Employee Details</h2>
            <div class="employee-career-field"><label for="selfReviewName">Name</label><input id="selfReviewName" name="name" class="employee-career-control employee-career-readonly" type="text" value="Farhan Binti Rahmat" readonly></div>
            <div class="employee-career-field"><label for="selfReviewEmployee">Employee#</label><input id="selfReviewEmployee" name="empNo" class="employee-career-control employee-career-readonly" type="text" value="#EBB12" readonly></div>
            <div class="employee-career-field"><label for="selfReviewPosition">Position</label><input id="selfReviewPosition" name="position" class="employee-career-control employee-career-readonly" type="text" value="Group HR Manager" readonly></div>
            <div class="employee-career-field"><label for="selfReviewPositionTitle">Position Title</label><input id="selfReviewPositionTitle" name="positionTitle" class="employee-career-control employee-career-readonly" type="text" value="Group Human Resource Manager" readonly></div>
            <!-- Additional employee attributes are sample values for this form preview. -->
            <div class="employee-career-field"><label for="selfReviewBand">Band</label><input id="selfReviewBand" name="band" class="employee-career-control employee-career-readonly" type="text" value="M1" readonly></div>
            <div class="employee-career-field"><label for="selfReviewJoined">Date Joined</label><input id="selfReviewJoined" name="dateJoined" class="employee-career-control employee-career-readonly" type="text" value="12/08/2006" readonly></div>
            <div class="employee-career-field"><label for="selfReviewConfirmation">Confirmation Due Date</label><input id="selfReviewConfirmation" name="confirmationDueDate" class="employee-career-control employee-career-readonly" type="text" value="12/11/2006" readonly></div>
            <div class="employee-career-field"><label for="selfReviewService">Year of Service</label><input id="selfReviewService" name="yearOfService" class="employee-career-control employee-career-readonly" type="text" value="19 years" readonly></div>
            <div class="employee-career-field"><label for="selfReviewCompany">Company</label><input id="selfReviewCompany" name="company" class="employee-career-control employee-career-readonly" type="text" value="PeopleHCM Malaysia" readonly></div>
            <div class="employee-career-field"><label for="selfReviewBranch">Branch</label><input id="selfReviewBranch" name="branch" class="employee-career-control employee-career-readonly" type="text" value="Kuala Lumpur" readonly></div>
            <div class="employee-career-field"><label for="selfReviewDepartment">Department</label><input id="selfReviewDepartment" name="department" class="employee-career-control employee-career-readonly" type="text" value="Human Resource" readonly></div>
            <div class="employee-career-field"><label for="selfReviewCategory">Category</label><input id="selfReviewCategory" name="category" class="employee-career-control employee-career-readonly" type="text" value="Permanent" readonly></div>
            <div class="employee-career-field"><label for="selfReviewSalary">Salary Scale</label><input id="selfReviewSalary" name="salaryScale" class="employee-career-control employee-career-readonly" type="text" value="M1 - Management" readonly></div>
          </section>
          <section class="employee-career-form-section" aria-labelledby="selfReviewAppraisalHeading">
            <h2 id="selfReviewAppraisalHeading" class="form-section-heading">Appraisal Details</h2>
            <div class="employee-career-field"><label for="selfReviewReference">Reference#</label><input id="selfReviewReference" name="reference" class="employee-career-control employee-career-readonly" type="text" value="APP000000000233" readonly></div>
            <div class="employee-career-field"><label for="selfReviewCreated">Create Date</label><input id="selfReviewCreated" name="createdDate" class="employee-career-control employee-career-readonly" type="text" value="21/01/2009" readonly></div>
            <div class="employee-career-field"><label for="selfReviewPeriod">Performance Period</label><input id="selfReviewPeriod" name="period" class="employee-career-control employee-career-readonly" type="text" value="FY 2026A - Review 01" readonly></div>
            <div class="employee-career-field"><label for="selfReviewType">Appraisal Type</label><input id="selfReviewType" name="appraisalType" class="employee-career-control employee-career-readonly" type="text" value="ANNUAL APPRAISAL" readonly></div>
            <div class="employee-career-field"><label for="selfReviewGroup">Performance Group</label><input id="selfReviewGroup" name="performanceGroup" class="employee-career-control employee-career-readonly" type="text" value="SENIOR MANAGEMENT" readonly></div>
            <div class="employee-career-field"><label for="selfReviewRecordStatus">Status</label><input id="selfReviewRecordStatus" name="status" class="employee-career-control employee-career-readonly" type="text" value="Planning" readonly></div>
            <div class="employee-career-field"><label for="selfReviewAssessmentFrom">Assessment From</label><input id="selfReviewAssessmentFrom" name="assessmentFrom" class="employee-career-control employee-career-readonly" type="text" value="01/01/2008" readonly></div>
            <div class="employee-career-field"><label for="selfReviewAssessmentTo">Assessment To</label><input id="selfReviewAssessmentTo" name="assessmentTo" class="employee-career-control employee-career-readonly" type="text" value="31/12/2008" readonly></div>
            <div class="employee-career-field"><label for="selfReviewValidFrom">Valid From</label><input id="selfReviewValidFrom" name="validFrom" class="employee-career-control employee-career-readonly" type="text" value="01/01/2026" readonly></div>
            <div class="employee-career-field"><label for="selfReviewValidTo">Valid To</label><input id="selfReviewValidTo" name="validTo" class="employee-career-control employee-career-readonly" type="text" value="31/12/2026" readonly></div>
          </section>
          <section class="employee-career-form-section" aria-labelledby="selfReviewCommentsHeading">
            <h2 id="selfReviewCommentsHeading" class="form-section-heading">Comments</h2>
            <div class="employee-career-field"><label for="selfReviewComments">Approver / Supervisor Comments</label><textarea id="selfReviewComments" name="comments" class="employee-career-control" rows="4" maxlength="5000" placeholder="Enter comments"></textarea></div>
          </section>
          <fieldset class="employee-career-field employee-career-fieldset">
            <legend class="form-section-heading">Attachment</legend>
            <div class="employee-career-upload-actions">
              <button class="employee-career-upload-button" type="button" data-file-picker="selfReviewFiles"><span class="employee-career-upload-icon"><i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i></span><span>Select File(s)</span></button>
              <button class="employee-career-upload-button" type="button" data-file-picker="selfReviewCamera"><span class="employee-career-upload-icon"><i class="fa-solid fa-camera" aria-hidden="true"></i></span><span>Take a Picture</span></button>
            </div>
            <input id="selfReviewFiles" type="file" multiple hidden>
            <input id="selfReviewCamera" type="file" accept="image/*" capture="environment" hidden>
            <div id="selfReviewAttachments" class="form-attachment-list" aria-live="polite"></div>
          </fieldset>
        </div>`;
    return template.content.firstElementChild;
  }

  function itemCard(item, kind, evaluation) {
    const competency = kind === 'competencies';
    const weight = item.weightage ?? item.weight;
    const has = value => value != null && value !== '';
    const percent = has(weight) ? (evaluation || competency ? Number(weight) : Number(weight).toFixed(2)) + '%' : '—';
    const rating = has(item.rating) ? item.rating + ' / 5' : '—';
    const deadline = item.deadline && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline)
      ? new Date(item.deadline + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : item.deadline;
    const rows = evaluation || competency
      ? [['Title', item.title], ['Weightage', percent], ['Rating', rating], ['Remark', item.remark]]
      : [['Goal Title', item.title], ['Goal Type', item.type], ['Description', item.description],
        ['Target Description', item.targetDescription ?? item.target], ['Deadline', deadline], ['Weightage', percent],
        ['Budget Hours', has(item.budgetHours) ? Number(item.budgetHours).toFixed(2) : null], ['Remark', item.remark]];
    if ((evaluation || competency) && item.target) rows.push(['Target', item.target]);

    const card = node('article', 'goal-plan-card');
    if (item.id) card.dataset[evaluation ? 'itemId' : 'goalId'] = item.id;
    const header = node('header', 'goal-plan-card-header');
    const toggle = node('button', 'goal-plan-item-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    const image = node('span', 'goal-plan-item-icon');
    image.append(icon(competency ? 'fa-award' : 'fa-bullseye'));
    const chevron = icon('fa-chevron-down');
    chevron.classList.add('goal-plan-item-chevron');
    toggle.append(image, node('strong', 'goal-plan-card-title', item.title), node('strong', 'goal-plan-item-weight', evaluation ? rating : percent), chevron);
    header.append(toggle);
    const body = node('div', 'goal-plan-card-body goal-plan-item-details');
    body.id = 'performance-item-details-' + (++itemSequence);
    toggle.setAttribute('aria-controls', body.id);
    body.hidden = true;
    const fields = node('dl', 'goal-plan-item-fields');
    for (const [label, value] of rows) {
      const field = node('div', 'goal-plan-item-field');
      field.append(node('dt', '', label), node('dd', '', has(value) ? value : '—'));
      fields.append(field);
    }
    body.append(fields);
    toggle.addEventListener('click', () => {
      body.hidden = !body.hidden;
      toggle.setAttribute('aria-expanded', String(!body.hidden));
    });
    card.append(header, body);
    return card;
  }

  return { appraisalFields, selfReviewCard, itemCard };
})();
