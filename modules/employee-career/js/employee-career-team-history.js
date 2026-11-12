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

  function employeeId(value) {
    const number = String(value ?? '').replace(/^#+/, '');
    return number ? `#${number}` : '';
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
      const query = keyword.trim().toLowerCase();
      return records.filter(record => {
        const text = [record.reference, record.id, record.interviewerName, record.interviewerPosition, record.employeeName,
          employeeId(record.empNo), record.position, employeeId(record.intervieweeNo), record.intervieweePosition,
          employeeId(record.submitterNo), record.reason, record.flightRisk, record.recommendation].join(' ').toLowerCase();
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
      const query = keyword.trim().toLowerCase();
      return records.filter(record => {
        const text = [record.employeeName, '#' + String(record.empNo || '').replace(/^#+/, ''), record.position, record.id, record.reason, record.exitType].join(' ').toLowerCase();
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
    history.replaceState({}, '', url);
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
      <span class="history-card-row">
        <span>${escape(label)}</span>
        <strong>${escape(value || '\u2014')}</strong>
      </span>`).join('');
  }

  function headingMarkup(record) {
    if (kind === 'staff-engagement') {
      return `<span class="history-card-heading team-history-employee-heading">
        <span class="team-history-employee-name">${escape(record.interviewerName || '\u2014')}</span>
        <span class="team-history-employee-position">${escape(record.interviewerPosition || '\u2014')}</span>
        <span class="team-history-record-ref">Ref: ${escape(record.reference || record.id || '\u2014')}</span>
      </span>`;
    }
    if (kind === 'staff-request') {
      return `<span class="history-card-heading team-history-request-heading">
        <span class="team-history-employee-name">${escape(record.employeeName || '\u2014')}</span>
        <span class="team-history-request-ref">Ref: ${escape(record.reference || record.id || '\u2014')}</span>
      </span>`;
    }

    const empNo = String(record.empNo || '').replace(/^#+/, '');
    return `<span class="history-card-heading team-history-employee-heading">
      <span class="team-history-employee-name">${escape(record.employeeName || '\u2014')}</span>
      <span class="team-history-employee-id">#${escape(empNo)}</span>
      ${kind === 'staff-exit' ? `<span class="team-history-employee-position">${escape(record.position || '\u2014')}</span>` : ''}
      ${['staff-confirmation', 'staff-exit'].includes(kind) ? '' : `<span class="team-history-record-ref">Ref: ${escape(record.id || '\u2014')}</span>`}
    </span>`;
  }

  function cardMarkup(record) {
    const status = statusMarkup(record);
    const name = kind === 'staff-engagement' ? record.interviewerName : record.employeeName;
    const isConfirmation = kind === 'staff-confirmation';
    const isExit = kind === 'staff-exit';
    const isRequest = kind === 'staff-request';
    const isEngagement = kind === 'staff-engagement';
    const hasDetails = isConfirmation || isExit || isRequest || isEngagement;
    const tag = hasDetails ? 'button' : 'article';
    const fields = isConfirmation
      ? [['Recommendation', record.recommendation], ['Submitted', formatDate(record.submittedDate)], ['Adjustment', record.adjustment]]
      : isExit || isEngagement ? [['Notice Date', formatDate(record.noticeDate)], ['Last Paid Date', formatDate(record.lastPaidDate)], ['Reason', record.reason]]
      : isRequest ? [['Request Date', formatDate(record.requestDate)], ['Require Date', formatDate(record.requiredBy)], ['Reason', record.reason]]
      : record.fields;
    const triggerAttributes = isConfirmation
      ? `type="button" data-confirmation-id="${escape(record.id || '')}" aria-haspopup="dialog" aria-controls="teamConfirmationDetailsOverlay"`
      : isExit ? `type="button" data-exit-id="${escape(record.id || '')}" aria-haspopup="dialog" aria-controls="teamExitDetailsOverlay"`
      : isRequest ? `type="button" data-request-id="${escape(record.id || '')}" aria-haspopup="dialog" aria-controls="teamRequestDetailsOverlay"`
      : isEngagement ? `type="button" data-engagement-id="${escape(record.id || '')}" aria-haspopup="dialog" aria-controls="teamEngagementDetailsOverlay"` : '';
    return `<${tag} ${triggerAttributes} class="history-card-item team-history-card" data-status="${status.tone}" aria-label="${hasDetails ? 'View details for ' : ''}${escape(name || labels[kind])}, ${escape(recordReviewStatusLabel(record.status || 'Pending'))}">
      <span class="history-card-header">
        ${headingMarkup(record)}
        ${status.html}
      </span>
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

  function openRecordDetails(record, trigger, category) {
    const prefix = category === 'staff-engagement' ? 'teamEngagement' : category === 'staff-request' ? 'teamRequest' : category === 'staff-exit' ? 'teamExit' : 'teamConfirmation';
    const overlay = $(`${prefix}DetailsOverlay`);
    const display = value => value === '' || value == null ? '—' : String(value);
    const blacklist = record.isBlacklist ?? record.blacklist;
    const empNo = String(record.empNo ?? '').replace(/^#+/, '');
    const fields = category === 'staff-engagement' ? [
      ['Reference #', record.reference || record.id],
      ['Emp #', employeeId(record.empNo)],
      ['Name', record.employeeName],
      ['Position', record.position],
      ['Interviewee #', employeeId(record.intervieweeNo)],
      ['Interviewee Position', record.intervieweePosition],
      ['Submitter #', employeeId(record.submitterNo)],
      ['Submit Date', formatDate(record.submittedDate ?? record.submitDate)],
      ['Interview Date', formatDate(record.interviewDate)],
      ['Flight Risk', record.flightRisk],
      ['Recommendation', record.recommendation],
      ['Notes', record.notes],
      ['Positive Feedback', record.positiveFeedback],
      ['Negative Feedback', record.negativeFeedback],
      ['Mitigation Action', record.mitigationAction],
      ['Approver Remark', record.approverRemark],
      ['Applicant Remark', record.applicantRemark],
      ['Status', record.status]
    ] : category === 'staff-request' ? [
      ['Reference #', record.reference || record.id],
      ['Request', record.request ?? record.title],
      ['Period', formatPeriod(record.period)],
      ['Type', record.requestType ?? record.type],
      ['Manpower Plan #', record.manpowerPlanNo],
      ['Description', record.description],
      ['Company', record.company],
      ['Branch', record.branch],
      ['Department', record.department],
      ['Section', record.section],
      ['Location', record.location],
      ['Job', record.job],
      ['Access', record.access],
      ['Employment Type', record.employmentType],
      ['Count', record.count],
      ['Required By', formatDate(record.requiredBy)],
      ['Reason', record.reason],
      ['Remarks', record.remarks]
    ] : category === 'staff-exit' ? [
      ['Reference #', record.reference || record.id],
      ['Status', record.status],
      ['Emp #', empNo ? `#${empNo}` : null],
      ['Name', record.employeeName],
      ['Position', record.position],
      ['Submit Date', formatDate(record.submittedDate ?? record.submitDate)],
      ['Notice Date', formatDate(record.noticeDate)],
      ['Last Service Date', formatDate(record.lastServiceDate)],
      ['Replacement Deadline', formatDate(record.replacementDeadline ?? record.replaceDeadline)],
      ['Recommended Action', record.recommendedAction ?? record.recommendation],
      ['Is Blacklist', typeof blacklist === 'boolean' ? (blacklist ? 'Yes' : 'No') : blacklist],
      ['Exit Type', record.exitType],
      ['Reason', record.reason],
      ['Remarks', record.remarks],
      ['HR Remarks', record.hrRemarks ?? record.hrRemark]
    ] : [
      ['Reference #', record.reference || record.id],
      ['Emp #', `#${String(record.empNo || '').replace(/^#+/, '')}`],
      ['Name', record.employeeName],
      ['Position', record.position],
      ['Hire Date', formatDate(record.hireDate)],
      ['Employment Type', record.employmentType],
      ['Confirm Due', formatDate(record.confirmDue)],
      ['Recommendation', record.recommendation],
      ['Effective Date', formatDate(record.effectiveDate)],
      ['Extension Months', record.extensionMonths],
      ['Adjustment', record.adjustment],
      ['Score', record.score == null ? null : `${record.score} / 100`],
      ['Remark', record.remark]
    ];
    const rows = fields.map(([label, value]) => {
      const row = document.createElement('tr');
      const labelCell = document.createElement('th');
      const valueCell = document.createElement('td');
      labelCell.scope = 'row';
      labelCell.className = 'detail-popout-label';
      labelCell.textContent = label;
      valueCell.className = 'detail-popout-value';
      valueCell.append(label === 'Status' ? recordDetailStatus.create(value) : display(value));
      row.append(labelCell, valueCell);
      return row;
    });
    const attachmentRow = document.createElement('tr');
    const attachmentLabel = document.createElement('th');
    const attachmentValue = document.createElement('td');
    attachmentLabel.scope = 'row';
    attachmentLabel.className = 'detail-popout-label';
    attachmentLabel.textContent = 'Attachment';
    attachmentValue.className = 'detail-popout-value';
    if (!record.attachments?.length) attachmentValue.textContent = 'No attachments';
    else {
      const attachmentList = document.createElement('span');
      attachmentList.className = 'team-history-detail-attachments';
      record.attachments.forEach(attachment => {
        const url = attachmentUrl(attachment.url);
        const item = document.createElement(url ? 'a' : 'span');
        const icon = document.createElement('i');
        const name = document.createElement('span');
        item.className = 'team-history-detail-attachment';
        if (url) {
          item.href = url;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
          item.download = attachment.name || 'attachment';
          item.setAttribute('aria-label', `Download attachment ${attachment.name || 'Attachment'}`);
        }
        icon.className = 'fa-solid fa-paperclip';
        icon.setAttribute('aria-hidden', 'true');
        name.textContent = attachment.name || 'Attachment';
        item.append(icon, name);
        attachmentList.append(item);
      });
      attachmentValue.append(attachmentList);
    }
    attachmentRow.append(attachmentLabel, attachmentValue);
    rows.push(attachmentRow);
    $(`${prefix}DetailsRows`).replaceChildren(...rows);
    $(`${prefix}DetailsSubtitle`).textContent = category === 'staff-request' ? record.employeeName || '—' : `#${empNo} · ${record.employeeName || '—'}`;
    overlay.querySelector('.detail-popout-body').scrollTop = 0;
    openOverlay(overlay, $(`${prefix}CloseDetails`), trigger);
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
    $('teamHistoryList')?.addEventListener('click', event => {
      const trigger = event.target.closest('[data-confirmation-id], [data-exit-id], [data-request-id], [data-engagement-id]');
      if (!trigger) return;
      const category = trigger.hasAttribute('data-engagement-id') ? 'staff-engagement' : trigger.hasAttribute('data-request-id') ? 'staff-request' : trigger.hasAttribute('data-exit-id') ? 'staff-exit' : 'staff-confirmation';
      const id = trigger.dataset.engagementId ?? trigger.dataset.requestId ?? trigger.dataset.exitId ?? trigger.dataset.confirmationId;
      const record = (data[category] || []).find(item => String(item.id) === id);
      if (record) openRecordDetails(record, trigger, category);
    });
    $('teamConfirmationFilterTrigger')?.addEventListener('click', openConfirmationFilter);
    $('teamExitFilterTrigger')?.addEventListener('click', openExitFilter);
    $('teamRequestFilterTrigger')?.addEventListener('click', openRequestFilter);
    $('teamEngagementFilterTrigger')?.addEventListener('click', openEngagementFilter);
    $('teamEngagementCloseFilter')?.addEventListener('click', closeOverlay);
    $('teamEngagementCloseDetails')?.addEventListener('click', closeOverlay);
    $('teamEngagementResetFilter')?.addEventListener('click', () => {
      fillEngagementFilter(engagementDefaults);
      applyEngagementFilter();
    });
    $('teamEngagementFilterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applyEngagementFilter();
    });
    for (const id of ['teamEngagementFilterOverlay', 'teamEngagementDetailsOverlay']) $(id)?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay();
    });
    $('teamRequestCloseFilter')?.addEventListener('click', closeOverlay);
    $('teamRequestCloseDetails')?.addEventListener('click', closeOverlay);
    $('teamRequestResetFilter')?.addEventListener('click', () => {
      fillRequestFilter(requestDefaults);
      applyRequestFilter();
    });
    $('teamRequestFilterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applyRequestFilter();
    });
    for (const id of ['teamRequestFilterOverlay', 'teamRequestDetailsOverlay']) $(id)?.addEventListener('click', event => {
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
    $('teamConfirmationCloseDetails')?.addEventListener('click', closeOverlay);
    $('teamExitCloseDetails')?.addEventListener('click', closeOverlay);
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
    $('teamConfirmationDetailsOverlay')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeOverlay();
    });
    $('teamExitDetailsOverlay')?.addEventListener('click', event => {
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
    document.querySelector(`[data-team-history-kind="${kind}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
