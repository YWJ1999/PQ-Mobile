(() => {
  const $ = id => document.getElementById(id);
  const names = { 'goal-plan': 'Goal Plan', 'self-evaluation': 'Self Evaluation', 'self-review': 'Self Review' };
  const actions = { approve: 'Approve', resubmit: 'Resubmit', reject: 'Reject' };
  const store = window.PerformancePendingStore;
  let category = new URLSearchParams(location.search).get('tab');
  if (!names[category]) category = 'goal-plan';
  let selected = new Set();
  let visible = [];
  let pendingAction;
  let returnFocus;
  let activeDialog = null, activeRecordId = null, background = [];
  const commentDrafts = new Map();
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const date = value => {
    if (!value) return '—';
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  };
  function person(record, cardHeading = false) {
    const copy = node('div', 'payroll-employee-copy');
    copy.append(node('div', 'employee-name', cardHeading ? employeeCardHeading.text(record.empNo, record.name) : record.name));
    if (!cardHeading) copy.append(node('div', 'employee-id', formatEmployeeNumber(record.empNo)));
    return copy;
  }
  function field(label, value) {
    const field = node('div', 'payroll-approval-field');
    field.append(node('small', '', label), value instanceof Node ? value : node('strong', '', value));
    return field;
  }
  function detailActionButtons(recordId) {
    const grid = node('div', 'pending-action-grid detail-popout-actions');
    grid.style.setProperty('--detail-action-count', '4');
    const entries = [['approve', 'Approve'], ['resubmit', 'Resubmit'], ['cancel', 'Cancel'], ['reject', 'Reject']];
    entries.forEach(([action, title]) => {
      const button = node('button', `action-btn-${action}`, title);
      button.type = 'button';
      if (action === 'cancel') {
        button.setAttribute('data-approval-back', '');
      } else {
        button.dataset.approvalAction = action;
        button.addEventListener('click', () => confirmAction([recordId], action, button));
      }
      grid.append(button);
    });
    return grid;
  }
  function saveCommentDraft() {
    if (PendingApprovalPage.active && $('performanceApprovalComments') && activeRecordId && !$('approvalDetails').hidden) commentDrafts.set(activeRecordId, $('performanceApprovalComments').value);
  }
  function closeDialog(restore = true) {
    if (activeDialog) { activeDialog.hidden = true; activeDialog.classList.remove('active'); }
    background.forEach(({ element, inert }) => { element.inert = inert; });
    background = []; activeDialog = null;
    if (restore) {
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else ($('performanceApprovalQueue').querySelector('.three-dots-btn') || document.querySelector(`[data-approval-tab="${category}"]`)).focus({ preventScroll: true });
    }
  }
  function openDialog(id, trigger) {
    const rootTrigger = activeDialog ? returnFocus : trigger || document.activeElement;
    closeDialog(false);
    returnFocus = rootTrigger;
    const overlay = $(id);
    activeDialog = overlay;
    background = [...overlay.parentElement.children].filter(element => element !== overlay).map(element => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    overlay.hidden = false;
    overlay.classList.add('active');
    overlay.querySelector('button, textarea, input')?.focus({ preventScroll: true });
  }
  function attachmentsContent(record) {
    const files = node('div', 'payroll-approval-files');
    for (const file of record.attachments || []) {
      if (typeof file.base64 === 'string') {
        const entry = node('a', 'payroll-approval-file', file.name);
        entry.href = 'data:application/octet-stream;base64,' + file.base64;
        entry.download = file.name;
        files.append(entry);
        continue;
      }
      let href;
      try {
        const url = new URL(file.href || file.url, location.href);
        const assets = new URL('../../../assets/', location.href);
        if ((file.href || file.url) && (['http:', 'https:'].includes(url.protocol) || (location.protocol === 'file:' && url.protocol === 'file:' && url.pathname.startsWith(assets.pathname)))) href = url.href;
      } catch { /* A file without a usable URL stays a file name. */ }
      const entry = node(href ? 'a' : 'span', 'payroll-approval-file', file.name || 'Attachment');
      if (href) { entry.href = href; entry.download = file.name || 'attachment'; entry.target = '_blank'; entry.rel = 'noopener noreferrer'; }
      files.append(entry);
    }
    return files.childElementCount ? files : 'No attachments';
  }
  function displayField(control, value) {
    const output = node('div', 'performance-review-value ' + control.className);
    const label = control.parentElement.querySelector('label');
    label.removeAttribute('for');
    label.id = control.id + 'Label';
    output.id = control.id;
    output.setAttribute('aria-labelledby', label.id);
    if (value instanceof Node) output.append(value);
    else output.textContent = value == null || value === '' ? '—' : value;
    control.replaceWith(output);
  }

  function extraFields(parent, title, entries) {
    const supplied = entries.filter(([, value]) => value != null && value !== '');
    if (!supplied.length) return;
    const section = node('section', 'goal-plan-employee-form');
    section.append(node('h2', 'form-section-heading', title));
    const fields = node('dl', 'performance-review-fields');
    for (const [label, value] of supplied) {
      const group = node('div');
      const entry = node('dd', 'performance-review-value');
      if (value instanceof Node) entry.append(value);
      else entry.textContent = value;
      group.append(node('dt', '', label), entry);
      fields.append(group);
    }
    section.append(fields);
    parent.append(section);
  }

  function appraisalDetails(record, parent) {
    const evaluation = record.category === 'self-evaluation';
    const form = PerformanceRequestForm.appraisalFields(evaluation);
    for (const input of form.querySelectorAll('[data-field]')) {
      const key = input.dataset.field;
      let value = record[key];
      if (key === 'name') value = person(record);
      if (key === 'supervisor' && value?.empNo) value = person(value);
      if (key === 'reportingTo' && record.reportingEmployee?.empNo) value = person(record.reportingEmployee);
      if (key === 'evaluationRef') value = record.evaluationRef || record.id;
      displayField(input, value);
    }
    for (const button of form.querySelectorAll('.goal-plan-section-card')) {
      const kind = button.dataset.planSection || button.dataset.evaluationSection;
      const items = record[kind] || [];
      const list = node('div', 'goal-plan-detail-card');
      list.id = 'review-' + kind;
      list.hidden = true;
      const cards = node('div', 'goal-plan-cards');
      cards.append(...items.map(item => PerformanceRequestForm.itemCard(item, kind, evaluation)));
      if (!items.length) cards.append(node('p', 'performance-approval-note', 'No items submitted.'));
      list.append(cards);
      const weights = items.map(item => item.weightage ?? item.weight);
      const total = weights.reduce((sum, weight) => sum + Number(weight || 0), 0);
      button.querySelector('small').textContent = items.length + (items.length === 1 ? ' item' : ' items') +
        (items.length && weights.every(weight => weight != null) ? ' · Total weight ' + Number(total.toFixed(2)) + '%' : '');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', list.id);
      button.addEventListener('click', () => {
        list.hidden = !list.hidden;
        button.setAttribute('aria-expanded', String(!list.hidden));
      });
      button.after(list);
    }
    parent.append(form);
    extraFields(parent, 'Appraisal Details', [
      ['Session', record.session], ['Company', record.company], ['Branch', record.branch],
      ['Period Start', record.startDate && date(record.startDate)], ['Period End', record.endDate && date(record.endDate)],
      ...(evaluation ? [['Goal Score', record.goalScore], ['Competency Score', record.competencyScore],
        ['Overall Score', record.overallScore], ['Score Grade', record.scoreGrade], ['Achievements', record.achievements],
        ['Development Areas', record.development]] : []),
      ['Remarks', record.remarks], ['Attachment', record.attachments?.length ? attachmentsContent(record) : null]
    ]);
  }

  function selfReviewDetails(record, parent) {
    const card = PerformanceRequestForm.selfReviewCard();
    const values = { ...record, empNo: formatEmployeeNumber(record.empNo), reference: record.reference || record.id,
      category: record.employeeCategory, status: record.appraisalStatus,
      comments: record.supervisorComments ?? record.comments, assessmentFrom: record.assessmentFrom || (record.startDate && date(record.startDate)),
      assessmentTo: record.assessmentTo || (record.endDate && date(record.endDate)) };
    for (const control of card.querySelectorAll('[name]')) displayField(control, values[control.name]);
    const files = card.querySelector('fieldset');
    files.querySelectorAll('.employee-career-upload-actions, input').forEach(el => el.remove());
    files.querySelector('.form-attachment-list').append(attachmentsContent(record));
    parent.classList.add('employee-career-form-page', 'employee-career-team-form-page');
    parent.append(card);
    extraFields(parent, 'Review Details', [['Section', record.section], ['Reporting To', record.reportingTo],
      ['Overall Score', record.overallScore], ['Score Grade', record.scoreGrade], ['Employee Review', record.review],
      ['Development Plan', record.development], ['Remarks', record.remarks]]);
  }

  function renderDetails(record) {
    $('approvalDetailsTitle').textContent = names[record.category] + ' Approval';
    const body = $('approvalDetailsBody');
    const request = node('div', 'performance-request-review');
    if (record.category === 'self-review') selfReviewDetails(record, request);
    else appraisalDetails(record, request);
    const submitDate = recordSubmitDate.form(record.submittedAt);
    submitDate.classList.add('employee-career-field');
    request.querySelector('.form-section-heading').after(submitDate);
    body.replaceChildren(request);
    const comments = node('section', 'detail-popout-comments approval-comments-card');
    const label = node('label', '', 'Approver Remarks'); label.htmlFor = 'performanceApprovalComments';
    const input = node('textarea', 'detail-popout-comment-control'); input.id = label.htmlFor;
    input.rows = 2; input.maxLength = 2000; input.placeholder = 'Add approver remarks (optional)...'; input.value = commentDrafts.get(record.id) || '';
    comments.append(label, input); body.append(comments);
    $('approvalDetailsActions').replaceChildren(detailActionButtons(record.id));
    body.scrollTop = 0;
  }
  function showMenu(record, trigger) {
    activeRecordId = record.id;
    openDialog('performanceApprovalMenu', trigger);
  }
  function renderWorkflow(record) {
    $('performanceApprovalWorkflowTitle').textContent = `${names[record.category]} Workflow`;
    const employee = node('div', 'payroll-approval-workflow-person'); employee.append(person(record, true));
    $('performanceApprovalWorkflowRequest').replaceChildren(recordSubmitDate.create(record.submittedAt), field('Reference #', record.id), employee, field('Status', recordDetailStatus.create('Pending Approval')), field(record.category === 'goal-plan' ? 'Session' : 'Period', record.category === 'goal-plan' ? record.session || record.period : record.period));
    const submitted = node('li', 'payroll-approval-workflow-step is-complete');
    submitted.append(field('Request Submitted', recordDetailStatus.create('Completed')), field('Submitted By', record.name));
    const approval = node('li', 'payroll-approval-workflow-step is-active');
    approval.append(field(`${names[record.category]} Approval`, recordDetailStatus.create('Awaiting Approval')), field('Approver', record.reportingTo), field('Action Date', '—'));
    if (record.backupApprover) approval.append(person(record.backupApprover), field('Assignment', 'Backup Approver'));
    $('performanceApprovalWorkflowSteps').replaceChildren(submitted, approval);
    const audit = node('li'); audit.append(field('Request Submitted', date(record.submittedAt)), node('span', '', record.name));
    $('performanceApprovalWorkflowAudit').replaceChildren(audit);
    if (record.backupApprover) {
      const assignment = node('li'); assignment.append(field('Backup Approver Assigned', date(record.backupApprover.assignedAt)), node('span', '', record.backupApprover.name));
      $('performanceApprovalWorkflowAudit').append(assignment);
    }
    $('performanceApprovalWorkflow').querySelector('.payroll-approval-workflow-body').scrollTop = 0;
  }
  function cancelDialog() {
    if (activeDialog?.id === 'approvalConfirm' && pendingAction?.fromDetails) {
      $('performanceApprovalComments').value = $('approvalComments').value;
      saveCommentDraft();
    }
    pendingAction = null;
    closeDialog();
  }
  function confirmAction(ids, action, trigger) {
    const available = new Set(store.getPending().map(record => record.id));
    ids = ids.filter(id => available.has(id));
    if (!ids.length) return;
    if (!['approve', 'resubmit', 'reject'].includes(action)) return;
    const fromDetails = PendingApprovalPage.active;
    saveCommentDraft();
    pendingAction = { ids, action, fromDetails };
    $('approvalConfirmTitle').textContent = `${actions[action]} Request${ids.length === 1 ? '' : 's'}`;
    $('approvalConfirmMessage').textContent = `${actions[action]} ${ids.length} selected ${names[category]} request${ids.length === 1 ? '' : 's'}?`;
    $('approvalConfirmSubmit').textContent = trigger?.closest('#performanceApprovalBulk') ? formatSelectedAction(action, ids.length) : actions[action];
    $('approvalComments').value = fromDetails ? commentDrafts.get(ids[0]) || '' : '';
    $('approvalConfirmError').hidden = true;
    openDialog('approvalConfirm', trigger);
  }
  function syncSelection() {
    const all = $('performanceApprovalSelectAll');
    all.checked = visible.length > 0 && selected.size === visible.length;
    all.indeterminate = selected.size > 0 && selected.size < visible.length;
    all.disabled = !visible.length;
    $('performanceApprovalSelectedCount').textContent = selected.size;
    $('performanceApprovalBulk').hidden = !selected.size;
    document.querySelectorAll('.approval-card-checkbox').forEach(input => { input.checked = selected.has(input.value); });
    $('performanceApprovalBulk').querySelector('bulk-approval-actions').syncWithQueue($('performanceApprovalQueue'));
  }
  const filter = window.PendingApprovalFilter.create('performanceApprovalFilter', {
    summaryId: 'performanceApprovalFilterSummary', onApply: () => { selected.clear(); render(); }
  });
  function render() {
    visible = store.getPending().filter(record => record.category === category && filter.matches({
      keyword: `${record.name} #${record.empNo} ${record.id} ${names[record.category]} ${record.period} ${record.department} ${record.position} ${record.company} ${record.session} ${record.section} ${record.appraisalType}`,
      startDate: record.submittedAt, endDate: record.submittedAt, submittedAt: record.submittedAt
    }));
    selected = new Set([...selected].filter(id => visible.some(record => record.id === id)));
    $('performanceApprovalCount').textContent = visible.length;
    const queue = $('performanceApprovalQueue');
    queue.replaceChildren();
    visible.forEach(record => {
      const card = node('article', 'approval-request-card');
      card.dataset.requestId = record.id;
      card.dataset.approvalId = record.id;
      const header = node('header', 'payroll-approval-card-header');
      const check = node('input', 'approval-card-checkbox');
      check.type = 'checkbox';
      check.value = record.id;
      check.setAttribute('aria-label', `Select ${record.name}'s ${names[record.category]}`);
      check.addEventListener('change', () => { check.checked ? selected.add(record.id) : selected.delete(record.id); syncSelection(); });
      const employee = person(record, true);
      employee.append(node('div', 'payroll-employee-dept', record.position));
      const menu = node('button', 'three-dots-btn');
      menu.type = 'button';
      menu.setAttribute('aria-label', `Request options for ${record.name}`);
      menu.setAttribute('aria-haspopup', 'dialog');
      menu.setAttribute('aria-controls', 'performanceApprovalMenu');
      const icon = node('i', 'fa-solid fa-ellipsis-vertical');
      icon.setAttribute('aria-hidden', 'true');
      menu.append(icon);
      menu.addEventListener('click', () => showMenu(record, menu));
      header.append(check, employee, node('span', 'payroll-approval-status', 'Pending Approval'), menu);
      const body = node('div', 'approval-card-body payroll-approval-card-body');
      const fields = [['Submit Date', record.submittedAt], ['Department', record.department]];
      if (record.category === 'goal-plan') {
        fields.push([record.session ? 'Session' : 'Period', record.session || record.period]);
      } else {
        fields.push(['Period', record.period]);
        if (record.category === 'self-review') fields.push(['Appraisal Type', record.appraisalType], ['Section', record.section]);
        fields.push(['Overall Score', record.overallScore], ['Score Grade', record.scoreGrade]);
      }
      if (record.backupApprover) fields.push(['Backup Approver', record.backupApprover.name]);
      body.append(PendingApprovalPage.link(record.id, createApprovalCardDetails(fields.filter(([, value]) => value != null && value !== ''))), createApprovalCardActions('approvalAction'));
      card.append(header, body);
      queue.append(card);
    });
    if (!visible.length) {
      const empty = node('div', 'payroll-pending-empty');
      empty.append(node('h3', '', 'No pending requests'), node('p', '', `No ${names[category]} requests match the current filter.`));
      queue.append(empty);
    }
    syncSelection();
  }
  function setCategory(value, updateUrl = true) {
    category = names[value] ? value : 'goal-plan';
    selected.clear();
    document.querySelectorAll('[data-approval-tab]').forEach(tab => {
      const active = tab.dataset.approvalTab === category;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $('performanceApprovalPanel').setAttribute('aria-labelledby', `approvalTab-${category}`);
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('tab', category);
      history.replaceState(history.state, '', url);
    }
    render();
  }
  document.querySelectorAll('[data-approval-tab]').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => setCategory(tab.dataset.approvalTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setCategory(tabs[next].dataset.approvalTab);
      tabs[next].focus();
    });
  });
  $('performanceApprovalFilterTrigger').addEventListener('click', filter.open);
  $('performanceApprovalSelectAll').addEventListener('change', event => { selected = new Set(event.target.checked ? visible.map(record => record.id) : []); syncSelection(); });
  $('performanceApprovalViewDetails').addEventListener('click', () => PendingApprovalPage.open('details', activeRecordId, returnFocus));
  $('performanceApprovalViewWorkflow').addEventListener('click', () => PendingApprovalPage.open('workflow', activeRecordId, returnFocus));
  $('performanceApprovalQueue').addEventListener('click', event => {
    const button = event.target.closest('button[data-approval-action]');
    if (button) confirmAction([button.closest('[data-request-id]').dataset.requestId], button.dataset.approvalAction, button);
  });
  $('performanceApprovalBulk').addEventListener('click', event => {
    const button = event.target.closest('button[data-approval-action]');
    if (button) confirmAction([...selected], button.dataset.approvalAction, button);
  });
  $('approvalConfirmForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!pendingAction) return;
    const { ids, action } = pendingAction;
    let count;
    try { count = store.act(ids, action, $('approvalComments').value.trim()); }
    catch {
      $('approvalConfirmError').textContent = 'Unable to save this decision. Please try again.'; $('approvalConfirmError').hidden = false; return;
    }
    activeRecordId = null;
    ids.forEach(id => commentDrafts.delete(id));
    pendingAction = null;
    selected.clear();
    render();
    closeDialog();
    PendingApprovalPage.back();
    if (typeof showToast === 'function') showToast(`${{ approve: 'Approved', resubmit: 'Sent for resubmission:', reject: 'Rejected' }[action]} ${count} request${count === 1 ? '' : 's'}.`);
  });
  document.querySelectorAll('[data-close-approval]').forEach(button => button.addEventListener('click', cancelDialog));
  document.querySelectorAll('.payroll-approval-overlay').forEach(overlay => {
    overlay.addEventListener('click', event => { if (event.target === overlay) cancelDialog(); });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); cancelDialog(); return; }
      if (event.key !== 'Tab') return;
      const items = [...overlay.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]')].filter(item => !item.disabled && item.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  function syncTheme() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    $('performanceApprovalBack').href = `../index.html?scope=team&theme=${theme}`;
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    history.replaceState(history.state, '', url);
  }
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  syncTheme();
  setCategory(category);
  window.addEventListener('pageshow', event => { if (event.persisted) render(); });
  PendingApprovalPage.register({
    render(view, id) {
      const record = store.getPending().find(item => item.id === id);
      if (!record) return false;
      closeDialog(false);
      if (category !== record.category) setCategory(record.category, false);
      activeRecordId = id;
      if (view === 'details') renderDetails(record);
      else renderWorkflow(record);
      return true;
    },
    onLeave() {
      saveCommentDraft();
      pendingAction = null;
      closeDialog(false);
    }
  });
})();
