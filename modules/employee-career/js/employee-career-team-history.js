(() => {
  const data = window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA || {};
  const labels = {
    'staff-confirmation': 'Staff Confirmation',
    'staff-exit': 'Staff Exit',
    'staff-request': 'Staff Request',
    'staff-engagement': 'Staff Engagement'
  };
  const statusMeta = {
    approved: { tone: 'approved', icon: 'fa-check' },
    completed: { tone: 'approved', icon: 'fa-check' },
    pending: { tone: 'submitted', icon: 'fa-clock' },
    submitted: { tone: 'submitted', icon: 'fa-paper-plane' },
    'follow-up required': { tone: 'submitted', icon: 'fa-rotate-right' },
    'to resubmit': { tone: 'resubmit', icon: 'fa-rotate-left' },
    draft: { tone: 'draft', icon: 'fa-file-pen' },
    rejected: { tone: 'rejected', icon: 'fa-xmark' }
  };
  const approvalStatuses = ['Pending', 'To Resubmit', 'Approved', 'Rejected'];
  const historyStatuses = {
    'staff-confirmation': approvalStatuses,
    'staff-exit': ['Pending', 'Approved'],
    'staff-request': approvalStatuses,
    'staff-engagement': [...approvalStatuses, 'Follow-up Required', 'Completed']
  };
  const defaultKind = 'staff-confirmation';
  const requestedKind = new URLSearchParams(location.search).get('category');
  let kind = Object.hasOwn(labels, requestedKind) ? requestedKind : defaultKind;
  const confirmationDefaults = { startDate: '', endDate: '' };
  let confirmationFilter = { ...confirmationDefaults };
  const exitDefaults = { keyword: '', startDate: '', endDate: '', status: '' };
  let exitFilter = { ...exitDefaults };
  const engagementDefaults = { keyword: '', startDate: '', endDate: '', status: '' };
  let engagementFilter = { ...engagementDefaults };
  const requestDefaults = { periodFrom: '', periodTo: '', company: '', department: '', branch: '', job: '', requestType: '' };
  let requestFilter = { ...requestDefaults };
  const requestFields = {
    periodFrom: 'teamRequestPeriodFrom', periodTo: 'teamRequestPeriodTo', company: 'teamRequestCompany',
    department: 'teamRequestDepartment', branch: 'teamRequestBranch', job: 'teamRequestJob', requestType: 'teamRequestType'
  };
  // Match the Staff Request form choices and include values already present in history.
  const requestChoices = {
    company: ['PeopleHCM Malaysia', 'PeopleHCM Services', 'PeopleHCM Technology'],
    department: ['People Operations', 'Finance', 'Product', 'Technology', 'Sales'],
    branch: ['Kuala Lumpur', 'Johor Bahru', 'Penang', 'Remote'],
    job: ['Executive', 'Senior Executive', 'Manager', 'Specialist', 'Intern'],
    requestType: ['Unbudgeted', 'Budgeted', 'Replacement']
  };
  let activeOverlay = null;
  let returnFocus = null;
  let inerted = [];

  const $ = id => document.getElementById(id);

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  function formatDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return value || '';
    const [, year, month, day] = match;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
  }

  function attachmentUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      const modulePath = new URL('../../', location.href).pathname;
      if (location.protocol === 'file:' && url.protocol === 'file:' && url.pathname.startsWith(modulePath)) return url.href;
    } catch { /* Unavailable attachments remain plain text. */ }
    return null;
  }

  function formatPeriod(value) {
    if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return value || '';
    return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${value}-01T00:00:00Z`));
  }

  function confirmationFilterSummary() {
    const { startDate, endDate } = confirmationFilter;
    if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    if (startDate) return `From ${formatDate(startDate)}`;
    if (endDate) return `Until ${formatDate(endDate)}`;
    return 'All Submission Dates';
  }

  function visibleRecords() {
    const records = Array.isArray(data[kind]) ? data[kind] : [];
    if (kind === 'staff-engagement') {
      const { keyword, startDate, endDate, status } = engagementFilter;
      const query = formatEmployeeNumber(keyword).toLowerCase();
      return records.filter(record => {
        const text = [record.reference, record.id, record.interviewerName, record.interviewerPosition, record.employeeName,
          formatEmployeeNumber(record.empNo), record.position, formatEmployeeNumber(record.intervieweeNo), record.intervieweePosition,
          formatEmployeeNumber(record.submitterNo), record.reason, record.flightRisk, record.recommendation].join(' ').toLowerCase();
        const interviewDate = String(record.interviewDate || '');
        return (!query || text.includes(query)) && (!status || String(record.status || '').toLowerCase() === status.toLowerCase()) &&
          (!(startDate || endDate) || (interviewDate && (!startDate || interviewDate >= startDate) && (!endDate || interviewDate <= endDate)));
      });
    }
    if (kind === 'staff-request') {
      const { periodFrom, periodTo, ...selections } = requestFilter;
      return records.filter(record => {
        const period = String(record.period || '');
        return (!(periodFrom || periodTo) || (/^\d{4}-\d{2}$/.test(period) && (!periodFrom || period >= periodFrom) && (!periodTo || period <= periodTo))) &&
          Object.entries(selections).every(([key, value]) => !value || String(record[key] ?? (key === 'requestType' ? record.type : '') ?? '') === value);
      });
    }
    if (kind === 'staff-exit') {
      const { keyword, startDate, endDate, status } = exitFilter;
      const query = formatEmployeeNumber(keyword).toLowerCase();
      return records.filter(record => {
        const text = [record.employeeName, formatEmployeeNumber(record.empNo), record.position, record.id, record.reason, record.exitType].join(' ').toLowerCase();
        const noticeDate = String(record.noticeDate || '');
        return (!query || text.includes(query)) && (!status || String(record.status || '').toLowerCase() === status.toLowerCase()) &&
          (!(startDate || endDate) || (noticeDate && (!startDate || noticeDate >= startDate) && (!endDate || noticeDate <= endDate)));
      });
    }
    if (kind !== 'staff-confirmation') return records;
    const { startDate, endDate } = confirmationFilter;
    if (!startDate && !endDate) return records;
    return records.filter(record => {
      const submittedDate = String(record.submittedDate || '');
      if (!submittedDate) return false;
      return (!startDate || submittedDate >= startDate) && (!endDate || submittedDate <= endDate);
    });
  }

  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.set('category', kind);
    history.replaceState(history.state, '', url);
  }

  function statusMarkup(record) {
    const label = recordReviewStatusLabel(record.status || 'Pending');
    const meta = statusMeta[label.toLowerCase()] || statusMeta.pending;
    return {
      tone: meta.tone,
      html: `<span class="status-pill ${meta.tone}"><i class="fa-solid ${meta.icon}" aria-hidden="true"></i><span>${escape(label)}</span></span>`
    };
  }

  function fieldMarkup(fields) {
    return (Array.isArray(fields) ? fields : []).map(([label, value]) => `
      <span class="history-card-row${label === 'Reason' ? ' record-reason-field' : ''}">
        <span>${escape(label)}</span>
        <strong>${escape(value || '\u2014')}</strong>
      </span>`).join('');
  }

  function cardMarkup(record) {
    const status = statusMarkup(record);
    const employee = record.employeeName || '—';
    const id = formatEmployeeNumber(record.empNo);
    const isConfirmation = kind === 'staff-confirmation';
    const isExit = kind === 'staff-exit';
    const isRequest = kind === 'staff-request';
    const isEngagement = kind === 'staff-engagement';
    const hasDetails = isConfirmation || isExit || isRequest || isEngagement;
    const tag = hasDetails ? 'a' : 'article';
    const fields = isConfirmation
      ? [['Recommendation', record.recommendation], ['Adjustment', record.adjustment]]
      : isExit || isEngagement ? [['Notice Date', formatDate(record.noticeDate)], ['Last Paid Date', formatDate(record.lastPaidDate)], ['Reason', record.reason]]
      : isRequest ? [['Request Date', formatDate(record.requestDate)], ['Require Date', formatDate(record.requiredBy)], ['Reason', record.reason]]
      : record.fields;
    if (isRequest || isEngagement) fields.push(['Reference #', record.reference || record.id]);
    if (isEngagement && record.interviewerName) {
      fields.push(['Interviewer', [record.interviewerName, record.interviewerPosition].filter(Boolean).join(' · ')]);
    }
    const triggerAttributes = isConfirmation
      ? `data-confirmation-id="${escape(record.id || '')}" data-history-link href="${escape(HistoryRecordPage.href(kind, record.id))}"`
      : isExit ? `data-exit-id="${escape(record.id || '')}" data-history-link href="${escape(HistoryRecordPage.href(kind, record.id))}"`
      : isRequest ? `data-request-id="${escape(record.id || '')}" data-history-link href="${escape(HistoryRecordPage.href(kind, record.id))}"`
      : isEngagement ? `data-engagement-id="${escape(record.id || '')}" data-history-link href="${escape(HistoryRecordPage.href(kind, record.id))}"` : '';
    const accessibleName = [employee, id, record.position, recordReviewStatusLabel(record.status || 'Pending')].filter(Boolean).join(', ');
    return `<${tag} ${triggerAttributes} class="history-card-item team-history-card" data-status="${status.tone}" aria-label="${hasDetails ? 'View details for ' : ''}${escape(accessibleName)}">
      <span class="history-card-header">
        <span class="history-card-heading">
          <span class="team-history-employee-identity"><span class="history-employee-name">${employeeCardHeading.html(id, employee)}</span></span>
          <span class="team-history-employee-position">${escape(record.position || '—')}</span>
        </span>
        ${status.html}
      </span>
      ${recordSubmitDate.cardHTML(record.submittedDate ?? record.submitDate)}
      <span class="history-card-details team-history-card-details">
        ${fieldMarkup(fields)}
      </span>
    </${tag}>`;
  }

  function render() {
    const records = visibleRecords();
    document.querySelectorAll('[data-team-history-kind]').forEach(button => {
      const active = button.dataset.teamHistoryKind === kind;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const title = $('teamHistoryCategoryTitle');
    const count = $('teamHistoryRecordCount');
    const list = $('teamHistoryList');
    setRecordLegend(list.closest('main'), labels[kind] + ' status',
      Object.fromEntries(historyStatuses[kind].map(label => [label, statusMeta[label.toLowerCase()].tone])));
    const empty = $('teamHistoryEmpty');
    const emptyCopy = $('teamHistoryEmptyCopy');
    const filterBar = $('teamConfirmationFilterBar');
    if (filterBar) filterBar.hidden = kind !== 'staff-confirmation';
    if ($('teamExitFilterBar')) $('teamExitFilterBar').hidden = kind !== 'staff-exit';
    if ($('teamRequestFilterBar')) $('teamRequestFilterBar').hidden = kind !== 'staff-request';
    if ($('teamEngagementFilterBar')) $('teamEngagementFilterBar').hidden = kind !== 'staff-engagement';
    if ($('teamEngagementFilterSummary')) {
      const { keyword, startDate, endDate, status } = engagementFilter;
      $('teamEngagementFilterSummary').textContent = [keyword, startDate ? `From ${formatDate(startDate)}` : '', endDate ? `Until ${formatDate(endDate)}` : '', recordReviewStatusLabel(status)].filter(Boolean).join(' / ') || 'All Interview Dates';
    }
    if ($('teamRequestFilterSummary')) {
      const { periodFrom, periodTo, ...selections } = requestFilter;
      $('teamRequestFilterSummary').textContent = [periodFrom ? `From ${formatPeriod(periodFrom)}` : '', periodTo ? `Until ${formatPeriod(periodTo)}` : '', ...Object.values(selections)].filter(Boolean).join(' / ') || 'All Staff Request Records';
    }
    if ($('teamConfirmationFilterSummary')) $('teamConfirmationFilterSummary').textContent = confirmationFilterSummary();
    if ($('teamExitFilterSummary')) {
      const { keyword, startDate, endDate, status } = exitFilter;
      $('teamExitFilterSummary').textContent = [keyword, startDate ? `From ${formatDate(startDate)}` : '', endDate ? `Until ${formatDate(endDate)}` : '', recordReviewStatusLabel(status)].filter(Boolean).join(' / ') || 'All Staff Exit Records';
    }
    if (title) title.textContent = `${labels[kind]} History`;
    if (count) count.textContent = String(records.length);
    if (list) list.innerHTML = records.map(cardMarkup).join('');
    if (empty) empty.hidden = records.length > 0;
    if (emptyCopy) {
      const filteredConfirmation = kind === 'staff-confirmation' && (confirmationFilter.startDate || confirmationFilter.endDate);
      const filteredExit = kind === 'staff-exit' && Object.values(exitFilter).some(Boolean);
      const filteredRequest = kind === 'staff-request' && Object.values(requestFilter).some(Boolean);
      const filteredEngagement = kind === 'staff-engagement' && Object.values(engagementFilter).some(Boolean);
      emptyCopy.textContent = filteredExit || filteredRequest || filteredEngagement ? 'No records match the selected filters.' : filteredConfirmation
        ? 'No records match the selected submission dates.'
        : 'There are no records in this category yet.';
    }
  }

  function openOverlay(overlay, focusTarget, returnTarget = document.activeElement) {
    activeOverlay = overlay;
    returnFocus = returnTarget;
    overlay.hidden = false;
    overlay.classList.toggle('is-open', overlay.classList.contains('standard-filter-sheet'));
    overlay.setAttribute('aria-hidden', 'false');
    inerted = [...overlay.parentElement.children].filter(node => node !== overlay && !node.inert);
    inerted.forEach(node => { node.inert = true; });
    focusTarget.focus({ preventScroll: true });
  }

  function closeOverlay({ restoreFocus = true } = {}) {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay.classList.remove('is-open');
    activeOverlay.setAttribute('aria-hidden', 'true');
    activeOverlay = null;
    inerted.forEach(node => { node.inert = false; });
    inerted = [];
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function formValue(value) {
    const control = document.createElement('div');
    control.className = 'employee-career-control';
    const text = value == null || value === '' ? '—' : String(value);
    control.append(value instanceof Node ? value : text);
    return control;
  }

  function formField(label, value) {
    const field = document.createElement('div');
    field.className = 'employee-career-field';
    const caption = document.createElement('span');
    caption.className = 'employee-career-label';
    caption.textContent = label;
    field.append(caption, formValue(value));
    return field;
  }

  function formGrid(...fields) {
    const grid = document.createElement('div');
    grid.className = 'employee-career-form-grid';
    grid.append(...fields);
    return grid;
  }

  function formSection(title, ...fields) {
    const section = document.createElement('section');
    section.className = 'employee-career-form-section';
    const heading = document.createElement('h2');
    heading.className = 'form-section-heading';
    heading.textContent = title;
    section.append(heading, ...fields);
    return section;
  }

  function optionalFields(fields) {
    return fields.filter(([, value]) => value != null && value !== '').map(([label, value]) => formField(label, value));
  }

  function confirmationDetails(record) {
    const score = record.score ?? record.assessmentScore;
    return formSection('Confirmation Detail',
      formField('Assessment Score', score == null || score === '' ? null : score + ' / 100'),
      formField('Recommendation', record.recommendation),
      formGrid(
        formField('Effective Date', formatDate(record.effectiveDate)),
        formField('Extension Months', record.extensionMonths)
      ),
      formField('Adjustment', record.adjustment),
      formField('Remarks', record.remarks ?? record.remark)
    );
  }

  function exitDetails(record) {
    const blacklist = record.isBlacklist ?? record.blacklist;
    return formSection('Termination Detail',
      formGrid(
        formField('Notice Date', formatDate(record.noticeDate)),
        formField('Last Paid Day', formatDate(record.lastPaidDate ?? record.lastPaidDay ?? record.lastServiceDate))
      ),
      formField('Exit Type', record.exitType),
      formField('Reason', record.reason),
      formField('Recommendation', record.recommendedAction ?? record.recommendation),
      formField('Replace Deadline', formatDate(record.replacementDeadline ?? record.replaceDeadline)),
      formField('Blacklist?', typeof blacklist === 'boolean' ? (blacklist ? 'Yes' : 'No') : blacklist),
      formField('Remarks', record.remarks),
      ...optionalFields([['HR Remarks', record.hrRemarks ?? record.hrRemark]])
    );
  }

  function requestDetails(record, metadata) {
    const request = record.request ?? record.title;
    return formSection('Request Detail',
      ...metadata,
      formGrid(
        formField('Request Period', formatPeriod(record.period)),
        formField('Type', record.requestType ?? record.type)
      ),
      formField('Manpower Plan #', record.manpowerPlanNo),
      ...optionalFields([['Request', request === record.job ? '' : request]]),
      formField('Description', record.description),
      formField('Company', record.company),
      formField('Branch', record.branch),
      formField('Department', record.department),
      ...optionalFields([['Section', record.section]]),
      formField('Location', record.location),
      formField('Job', record.job),
      formField('Access', record.access),
      formGrid(
        formField('Employment Type', record.employmentType),
        formField('Count', record.count)
      ),
      formField('Required By', formatDate(record.requiredBy)),
      formField('Reason', record.reason),
      formField('Remarks', record.remarks)
    );
  }

  function engagementDetails(record) {
    return formSection('Engagement Details',
      formField('Interviewee No.', formatEmployeeNumber(record.intervieweeNo)),
      formField('Interviewee Position', record.intervieweePosition),
      ...optionalFields([
        ['Interviewer', record.interviewerName],
        ['Interviewer Position', record.interviewerPosition]
      ]),
      formField('Interview Date', formatDate(record.interviewDate)),
      formField('Positive Feedback', record.positiveFeedback),
      formField('Negative Feedback', record.negativeFeedback),
      formField('Flight Risk', record.flightRisk),
      formField('Recommendation', record.recommendation),
      formField('Mitigation Action', record.mitigationAction),
      formField('Remarks', record.remarks ?? record.applicantRemark),
      ...optionalFields([
        ['Notes', record.notes],
        ['Applicant Remark', record.remarks && record.remarks !== record.applicantRemark ? record.applicantRemark : ''],
        ['Approver Remark', record.approverRemark]
      ])
    );
  }

  function historyAttachments(attachments) {
    const files = [].concat(attachments || []);
    if (!files.length) return 'No attachments';
    const list = document.createElement('span');
    list.className = 'team-history-detail-attachments';
    for (const attachment of files) {
      const filename = typeof attachment === 'string' ? attachment : attachment?.name || 'Attachment';
      const url = attachmentUrl(attachment?.url);
      const item = document.createElement(url ? 'a' : 'span');
      const icon = document.createElement('i');
      const name = document.createElement('span');
      item.className = 'team-history-detail-attachment';
      if (url) {
        item.href = url;
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.download = filename;
        item.setAttribute('aria-label', 'Download attachment ' + filename);
      }
      icon.className = 'fa-solid fa-paperclip';
      icon.setAttribute('aria-hidden', 'true');
      name.textContent = filename;
      item.append(icon, name);
      list.append(item);
    }
    return list;
  }

  const historyDetailViews = {
    'staff-confirmation': { id: 'teamConfirmationDetailsOverlay', details: confirmationDetails },
    'staff-exit': { id: 'teamExitDetailsOverlay', details: exitDetails },
    'staff-request': { id: 'teamRequestDetailsOverlay', details: requestDetails },
    'staff-engagement': { id: 'teamEngagementDetailsOverlay', details: engagementDetails }
  };

  function renderRecordDetails(record, category) {
    const view = historyDetailViews[category];
    const overlay = $(view.id);
    const body = overlay.querySelector('.history-record-content');
    const header = document.createElement('header');
    header.className = 'team-history-form-header';
    const employeeName = employeeCardHeading.text(record.empNo, record.employeeName);
    if (employeeName) {
      const heading = document.createElement('h2');
      heading.textContent = employeeName;
      header.append(heading);
    }
    if (record.status) header.append(recordDetailStatus.create(record.status));

    const form = document.createElement('div');
    form.className = 'employee-career-form-card team-history-form';
    const submitDate = recordSubmitDate.form(record.submittedDate || record.submitDate);
    submitDate.classList.add('employee-career-field');
    const metadata = [submitDate, formField('Reference No.', record.reference || record.id)];
    if (category === 'staff-request') {
      form.append(view.details(record, metadata));
    } else {
      const employee = formSection('Employee Details',
        ...metadata,
        formField('Employee No.', formatEmployeeNumber(record.empNo)),
        formField('Name', record.employeeName),
        formField('Position', record.position)
      );
      if (category === 'staff-confirmation') {
        employee.append(
          formGrid(
            formField('Hire Date', formatDate(record.hireDate)),
            formField('Employment Type', record.employmentType)
          ),
          formField('Confirmation Due', formatDate(record.confirmDue))
        );
      }
      form.append(employee, view.details(record));
    }
    form.append(formSection('Attachments', formValue(historyAttachments(record.attachments))));
    body.replaceChildren(form);
    if (header.childElementCount) body.prepend(header);
    return overlay;
  }

  function fillConfirmationFilter(values) {
    $('teamConfirmationStartDate').value = values.startDate;
    $('teamConfirmationEndDate').value = values.endDate;
    $('teamConfirmationFilterError').hidden = true;
    $('teamConfirmationFilterError').textContent = '';
    $('teamConfirmationStartDate').removeAttribute('aria-invalid');
    $('teamConfirmationEndDate').removeAttribute('aria-invalid');
  }

  function openConfirmationFilter() {
    if (kind !== 'staff-confirmation') return;
    const overlay = $('teamConfirmationFilterOverlay');
    fillConfirmationFilter(confirmationFilter);
    openOverlay(overlay, $('teamConfirmationStartDate'), $('teamConfirmationFilterTrigger'));
  }

  function applyConfirmationFilter() {
    const start = $('teamConfirmationStartDate');
    const end = $('teamConfirmationEndDate');
    const error = $('teamConfirmationFilterError');
    start.removeAttribute('aria-invalid');
    end.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';

    const invalidRange = start.value && end.value && start.value > end.value;
    const invalidDate = !start.validity.valid ? start : !end.validity.valid ? end : null;
    if (invalidRange || invalidDate) {
      const field = invalidDate || end;
      error.textContent = invalidRange ? 'End Date must be on or after Start Date.' : 'Enter a valid date.';
      error.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: true });
      return;
    }

    confirmationFilter = { startDate: start.value, endDate: end.value };
    closeOverlay();
    render();
    document.querySelector('main')?.scrollTo({ top: 0 });
  }

  function selectKind(nextKind) {
    if (!Object.hasOwn(labels, nextKind)) return;
    if (activeOverlay) closeOverlay({ restoreFocus: false });
    kind = nextKind;
    updateUrl();
    render();
    document.querySelector(`[data-team-history-kind="${kind}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function fillExitFilter(values) {
    for (const [key, id] of Object.entries({ keyword: 'teamExitKeyword', startDate: 'teamExitStartDate', endDate: 'teamExitEndDate', status: 'teamExitStatus' })) $(id).value = values[key];
    $('teamExitFilterError').hidden = true;
    $('teamExitFilterError').textContent = '';
    $('teamExitStartDate').removeAttribute('aria-invalid');
    $('teamExitEndDate').removeAttribute('aria-invalid');
  }

  function openExitFilter() {
    if (kind !== 'staff-exit') return;
    fillExitFilter(exitFilter);
    openOverlay($('teamExitFilterOverlay'), $('teamExitKeyword'), $('teamExitFilterTrigger'));
  }

  function applyExitFilter() {
    const start = $('teamExitStartDate');
    const end = $('teamExitEndDate');
    const error = $('teamExitFilterError');
    start.removeAttribute('aria-invalid');
    end.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';
    const invalidRange = start.value && end.value && start.value > end.value;
    const invalidDate = !start.validity.valid ? start : !end.validity.valid ? end : null;
    if (invalidRange || invalidDate) {
      const field = invalidDate || end;
      error.textContent = invalidRange ? 'End Date must be on or after Start Date.' : 'Enter a valid date.';
      error.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: true });
      return;
    }
    exitFilter = { keyword: $('teamExitKeyword').value.trim(), startDate: start.value, endDate: end.value, status: $('teamExitStatus').value };
    closeOverlay();
    render();
    document.querySelector('main')?.scrollTo({ top: 0 });
  }

  function fillRequestFilter(values) {
    for (const [key, choices] of Object.entries(requestChoices)) {
      const select = $(requestFields[key]);
      const allLabel = select.options[0].textContent;
      const existing = (data['staff-request'] || []).map(record => record[key] ?? (key === 'requestType' ? record.type : ''));
      const options = [...new Set([...choices, ...existing].filter(value => value !== '' && value != null).map(String))];
      select.replaceChildren(new Option(allLabel, ''), ...options.map(value => new Option(value, value)));
    }
    for (const [key, id] of Object.entries(requestFields)) $(id).value = values[key];
    $('teamRequestFilterError').hidden = true;
    $('teamRequestFilterError').textContent = '';
    $('teamRequestPeriodFrom').removeAttribute('aria-invalid');
    $('teamRequestPeriodTo').removeAttribute('aria-invalid');
  }

  function openRequestFilter() {
    if (kind !== 'staff-request') return;
    fillRequestFilter(requestFilter);
    openOverlay($('teamRequestFilterOverlay'), $('teamRequestPeriodFrom'), $('teamRequestFilterTrigger'));
  }

  function applyRequestFilter() {
    const from = $('teamRequestPeriodFrom');
    const to = $('teamRequestPeriodTo');
    const error = $('teamRequestFilterError');
    from.removeAttribute('aria-invalid');
    to.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';
    const invalidRange = from.value && to.value && from.value > to.value;
    const invalidPeriod = !from.validity.valid ? from : !to.validity.valid ? to : null;
    if (invalidRange || invalidPeriod) {
      const field = invalidPeriod || to;
      error.textContent = invalidRange ? 'Period To must be on or after Period From.' : 'Enter a valid period.';
      error.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: true });
      return;
    }
    requestFilter = Object.fromEntries(Object.entries(requestFields).map(([key, id]) => [key, $(id).value]));
    closeOverlay();
    render();
    document.querySelector('main')?.scrollTo({ top: 0 });
  }

  function fillEngagementFilter(values) {
    for (const [key, id] of Object.entries({ keyword: 'teamEngagementKeyword', startDate: 'teamEngagementStartDate', endDate: 'teamEngagementEndDate', status: 'teamEngagementStatus' })) $(id).value = values[key];
    $('teamEngagementFilterError').hidden = true;
    $('teamEngagementFilterError').textContent = '';
    $('teamEngagementStartDate').removeAttribute('aria-invalid');
    $('teamEngagementEndDate').removeAttribute('aria-invalid');
  }

  function openEngagementFilter() {
    if (kind !== 'staff-engagement') return;
    fillEngagementFilter(engagementFilter);
    openOverlay($('teamEngagementFilterOverlay'), $('teamEngagementKeyword'), $('teamEngagementFilterTrigger'));
  }

  function applyEngagementFilter() {
    const start = $('teamEngagementStartDate');
    const end = $('teamEngagementEndDate');
    const error = $('teamEngagementFilterError');
    start.removeAttribute('aria-invalid');
    end.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';
    const invalidRange = start.value && end.value && start.value > end.value;
    const invalidDate = !start.validity.valid ? start : !end.validity.valid ? end : null;
    if (invalidRange || invalidDate) {
      const field = invalidDate || end;
      error.textContent = invalidRange ? 'End Date must be on or after Start Date.' : 'Enter a valid date.';
      error.hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: true });
      return;
    }
    engagementFilter = { keyword: $('teamEngagementKeyword').value.trim(), startDate: start.value, endDate: end.value, status: $('teamEngagementStatus').value };
    closeOverlay();
    render();
    document.querySelector('main')?.scrollTo({ top: 0 });
  }

  function init() {
    updateUrl();
    document.querySelector('.team-history-tabs')?.addEventListener('click', event => {
      const button = event.target.closest('[data-team-history-kind]');
      if (button) selectKind(button.dataset.teamHistoryKind);
    });
    $('teamConfirmationFilterTrigger')?.addEventListener('click', openConfirmationFilter);
    $('teamExitFilterTrigger')?.addEventListener('click', openExitFilter);
    $('teamRequestFilterTrigger')?.addEventListener('click', openRequestFilter);
    $('teamEngagementFilterTrigger')?.addEventListener('click', openEngagementFilter);
    $('teamEngagementCloseFilter')?.addEventListener('click', closeOverlay);
    $('teamEngagementResetFilter')?.addEventListener('click', () => {
      fillEngagementFilter(engagementDefaults);
      applyEngagementFilter();
    });
    $('teamEngagementFilterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applyEngagementFilter();
    });
    for (const id of ['teamEngagementFilterOverlay']) $(id)?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay();
    });
    $('teamRequestCloseFilter')?.addEventListener('click', closeOverlay);
    $('teamRequestResetFilter')?.addEventListener('click', () => {
      fillRequestFilter(requestDefaults);
      applyRequestFilter();
    });
    $('teamRequestFilterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applyRequestFilter();
    });
    for (const id of ['teamRequestFilterOverlay']) $(id)?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay();
    });
    $('teamExitCloseFilter')?.addEventListener('click', closeOverlay);
    $('teamExitResetFilter')?.addEventListener('click', () => {
      fillExitFilter(exitDefaults);
      applyExitFilter();
    });
    $('teamExitFilterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applyExitFilter();
    });
    $('teamExitFilterOverlay')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay();
    });
    $('teamConfirmationCloseFilter')?.addEventListener('click', closeOverlay);
    $('teamConfirmationResetFilter')?.addEventListener('click', () => {
      fillConfirmationFilter(confirmationDefaults);
      applyConfirmationFilter();
    });
    $('teamConfirmationFilterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applyConfirmationFilter();
    });
    $('teamConfirmationFilterOverlay')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay();
    });
    document.addEventListener('keydown', event => {
      if (!activeOverlay) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...activeOverlay.querySelectorAll('button, input, select, textarea, a[href]')]
        .filter(node => !node.disabled && node.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    render();
    HistoryRecordPage.register((category, id) => {
      const record = Object.hasOwn(data, category) && data[category].find(row => String(row.id) === id);
      if (!record) return;
      if (kind !== category) { kind = category; render(); }
      return renderRecordDetails(record, category);
    });
    document.querySelector(`[data-team-history-kind="${kind}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
