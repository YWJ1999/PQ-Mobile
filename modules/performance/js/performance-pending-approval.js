(() => {
  const $ = id => document.getElementById(id);
  const names = { 'goal-plan': 'Goal Plan', 'self-evaluation': 'Self Evaluation', 'self-review': 'Self Review' };
  const actions = { approve: 'Approve', backup: 'Backup', resubmit: 'Resubmit', reject: 'Reject' };
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
  function person(record) {
    const copy = node('div', 'payroll-employee-copy');
    copy.append(node('div', 'employee-name', record.name), node('div', 'employee-id', `#${record.empNo.replace(/^#+/, '')}`));
    return copy;
  }
  function field(label, value) {
    const field = node('div', 'payroll-approval-field');
    field.append(node('small', '', label), node('strong', '', value));
    return field;
  }
  function actionButtons(ids, details = false) {
    const grid = node('div', details ? 'pending-action-grid detail-popout-actions' : 'pending-action-grid');
    if (details) grid.style.setProperty('--detail-action-count', '4');
    const entries = details ? [['approve', 'Approve'], ['resubmit', 'Resubmit'], ['cancel', 'Cancel'], ['reject', 'Reject']] : Object.entries(actions);
    entries.forEach(([action, title]) => {
      const button = node('button', `action-btn-${action}`, !ids && action === 'approve' ? 'Approve Selected' : title);
      button.type = 'button';
      if (action === 'cancel') {
        button.setAttribute('data-close-approval', '');
        button.addEventListener('click', cancelDialog);
      } else {
        button.dataset.approvalAction = action;
        button.addEventListener('click', () => confirmAction(ids ? [ids] : [...selected], action, button));
      }
      grid.append(button);
    });
    return grid;
  }
  function saveCommentDraft() {
    if (activeDialog?.id === 'approvalDetails' && activeRecordId) commentDrafts.set(activeRecordId, $('performanceApprovalComments').value);
  }
  function closeDialog(restore = true) {
    saveCommentDraft();
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
  function table(rows) {
    const result = node('table', 'payroll-approval-table detail-popout-table');
    const body = node('tbody');
    rows.forEach(([label, value]) => {
      const row = node('tr');
      const heading = node('th', 'detail-popout-label', label);
      heading.scope = 'row';
      const content = node('td', 'detail-popout-value');
      if (value instanceof Node) content.append(value);
      else content.textContent = value == null || value === '' ? '—' : String(value);
      row.append(heading, content);
      body.append(row);
    });
    result.append(body);
    return result;
  }
  function attachmentsContent(record) {
    const files = node('div', 'payroll-approval-files');
    for (const file of record.attachments || []) {
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
  function showDetails(record, trigger) {
    record = store.getPending().find(item => item.id === record?.id);
    if (!record) return;
    saveCommentDraft();
    activeRecordId = record.id;
    $('approvalDetailsTitle').textContent = `${names[record.category]} Approval`;
    const body = $('approvalDetailsBody');
    body.replaceChildren(node('h3', '', 'Employee Details'), table([
      ['Employee', person(record)],
      ['Job', record.position], ['Company', record.company],
      ['Department', record.department], ['Branch', record.branch],
      ...(record.category === 'self-review' ? [['Section', record.section]] : []),
      ['Reporting To', record.reportingTo],
      ...(record.backupApprover ? [['Backup Approver', person(record.backupApprover)]] : [])
    ]), node('h3', '', 'Appraisal Details'), table([
      ['Reference #', record.id], ['Status', 'Pending Approval'], ['Submit Date', date(record.submittedAt)],
      [record.category === 'goal-plan' ? 'Session' : 'Period', record.category === 'goal-plan' ? record.session : record.period], ['Appraisal Type', record.appraisalType],
      ['Period Start', date(record.startDate)], ['Period End', date(record.endDate)]
    ]));
    if (record.category === 'goal-plan') {
      for (const [title, entries] of [['Goals', record.goals], ['Competencies', record.competencies]]) {
        body.append(node('h3', '', title));
        if (!entries?.length) { body.append(node('p', 'performance-approval-note', `No ${title.toLowerCase()} submitted.`)); continue; }
        entries.forEach((entry, index) => body.append(table([
          [title === 'Goals' ? 'Goal' : 'Competency', `${index + 1}. ${entry.title}`], ['Weight', `${entry.weight}%`], ['Target', entry.target]
        ])));
        body.append(table([['Total Weight', `${entries.reduce((sum, entry) => sum + (Number(entry.weight) || 0), 0)}%`]]));
      }
    } else if (record.category === 'self-evaluation') {
      body.append(node('h3', '', 'Self Evaluation'), table([
        ['Goal Score', record.goalScore], ['Competency Score', record.competencyScore],
        ['Overall Score', record.overallScore], ['Score Grade', record.scoreGrade],
        ['Achievements', record.achievements], ['Development Areas', record.development]
      ]));
    } else {
      body.append(node('h3', '', 'Self Review'), table([
        ['Overall Score', record.overallScore], ['Score Grade', record.scoreGrade],
        ['Employee Review', record.review], ['Development Plan', record.development]
      ]));
    }
    body.append(node('h3', '', 'Remarks & Attachments'), table([
      ['Remarks', record.remarks],
      ...(record.category === 'self-review' ? [['Approver / Supervisor Comments', record.supervisorComments]] : []),
      ['Attachment', attachmentsContent(record)]
    ]));
    const comments = node('section', 'detail-popout-comments approval-comments-card');
    const label = node('label', '', 'Approver Remarks'); label.htmlFor = 'performanceApprovalComments';
    const input = node('textarea', 'detail-popout-comment-control'); input.id = label.htmlFor;
    input.rows = 2; input.maxLength = 2000; input.placeholder = 'Add approver remarks (optional)...'; input.value = commentDrafts.get(record.id) || '';
    comments.append(label, input); body.append(comments);
    $('approvalDetailsActions').replaceChildren(actionButtons(record.id, true));
    openDialog('approvalDetails', trigger);
    body.scrollTop = 0;
  }
  function showMenu(record, trigger) {
    activeRecordId = record.id;
    openDialog('performanceApprovalMenu', trigger);
  }
  function showWorkflow() {
    const record = store.getPending().find(item => item.id === activeRecordId); if (!record) return;
    $('performanceApprovalWorkflowTitle').textContent = `${names[record.category]} Workflow`;
    const employee = node('div', 'payroll-approval-workflow-person'); employee.append(person(record));
    $('performanceApprovalWorkflowRequest').replaceChildren(field('Reference #', record.id), employee, field('Status', 'Pending Approval'), field(record.category === 'goal-plan' ? 'Session' : 'Period', record.category === 'goal-plan' ? record.session : record.period));
    const submitted = node('li', 'payroll-approval-workflow-step is-complete');
    submitted.append(field('Request Submitted', 'Completed'), field('Submitted By', record.name), field('Submit Date', date(record.submittedAt)));
    const approval = node('li', 'payroll-approval-workflow-step is-active');
    approval.append(field(`${names[record.category]} Approval`, 'Awaiting Approval'), field('Approver', record.reportingTo), field('Action Date', '—'));
    if (record.backupApprover) approval.append(person(record.backupApprover), field('Assignment', 'Backup Approver'));
    $('performanceApprovalWorkflowSteps').replaceChildren(submitted, approval);
    const audit = node('li'); audit.append(field('Request Submitted', date(record.submittedAt)), node('span', '', record.name));
    $('performanceApprovalWorkflowAudit').replaceChildren(audit);
    if (record.backupApprover) {
      const assignment = node('li'); assignment.append(field('Backup Approver Assigned', date(record.backupApprover.assignedAt)), node('span', '', record.backupApprover.name));
      $('performanceApprovalWorkflowAudit').append(assignment);
    }
    openDialog('performanceApprovalWorkflow');
    $('performanceApprovalWorkflow').querySelector('.payroll-approval-workflow-body').scrollTop = 0;
  }
  function cancelDialog() {
    if (activeDialog?.id === 'approvalConfirm' && pendingAction?.fromDetails) {
      const id = pendingAction.ids[0]; commentDrafts.set(id, $('approvalComments').value); pendingAction = null;
      const record = store.getPending().find(item => item.id === id);
      if (record) { showDetails(record, returnFocus); return; }
    }
    pendingAction = null;
    closeDialog();
  }
  function confirmAction(ids, action, trigger) {
    const available = new Set(store.getPending().map(record => record.id));
    ids = ids.filter(id => available.has(id));
    if (!ids.length) return;
    if (action === 'backup') {
      pendingAction = { ids, action };
      $('approvalBackupMessage').textContent = `Assign a backup approver for ${ids.length} ${names[category]} request${ids.length === 1 ? '' : 's'}. The requests will remain pending.`;
      const picker = $('approvalBackupApprover'); picker.replaceChildren(new Option('Select an approver', ''));
      const employees = store.getPending().filter(record => ids.includes(record.id)).map(record => record.empNo);
      store.getBackupApprovers().filter(person => !employees.includes(person.empNo)).forEach(person => picker.add(new Option(`${person.name} (#${person.empNo})`, person.empNo)));
      $('approvalBackupError').hidden = true;
      openDialog('approvalBackup', trigger); return;
    }
    if (!['approve', 'resubmit', 'reject'].includes(action)) return;
    const fromDetails = activeDialog?.id === 'approvalDetails';
    saveCommentDraft();
    pendingAction = { ids, action, fromDetails };
    $('approvalConfirmTitle').textContent = `${actions[action]} Request${ids.length === 1 ? '' : 's'}`;
    $('approvalConfirmMessage').textContent = `${actions[action]} ${ids.length} selected ${names[category]} request${ids.length === 1 ? '' : 's'}?`;
    $('approvalConfirmSubmit').textContent = actions[action];
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
    document.querySelector('.phone-container').classList.toggle('has-selection', selected.size > 0);
    document.querySelectorAll('.approval-card-checkbox').forEach(input => { input.checked = selected.has(input.value); });
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
      const header = node('header', 'payroll-approval-card-header');
      const check = node('input', 'approval-card-checkbox');
      check.type = 'checkbox';
      check.value = record.id;
      check.setAttribute('aria-label', `Select ${record.name}'s ${names[record.category]}`);
      check.addEventListener('change', () => { check.checked ? selected.add(record.id) : selected.delete(record.id); syncSelection(); });
      const employee = person(record);
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
      const body = node('div', 'payroll-approval-card-body');
      const status = node('div', 'payroll-approval-status-row');
      status.append(node('span', 'payroll-approval-date', `Submitted ${date(record.submittedAt)}`));
      const fields = node('div', 'payroll-approval-field-grid');
      if (record.category === 'goal-plan') {
        fields.append(field('Department', record.department), field('Session', record.session));
        body.append(status, fields, actionButtons(record.id));
      } else {
        fields.append(field('Department', record.department), field('Period', record.period));
        if (record.category === 'self-review') {
          fields.append(field('Appraisal Type', record.appraisalType), field('Section', record.section));
        }
        const facts = node('div', 'payroll-approval-facts');
        const scores = node('div', 'payroll-approval-field-grid');
        scores.append(field('Overall Score', record.overallScore), field('Score Grade', record.scoreGrade));
        facts.append(scores);
        body.append(status, fields, facts, actionButtons(record.id));
      }
      if (record.backupApprover) body.insertBefore(field('Backup Approver', record.backupApprover.name), body.lastElementChild);
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
      history.replaceState(null, '', url);
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
  $('performanceApprovalViewDetails').addEventListener('click', () => showDetails(store.getPending().find(record => record.id === activeRecordId), returnFocus));
  $('performanceApprovalViewWorkflow').addEventListener('click', showWorkflow);
  $('performanceApprovalBulkActions').append(actionButtons());
  $('approvalConfirmForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!pendingAction) return;
    const { ids, action } = pendingAction;
    let count;
    try { count = store.act(ids, action, $('approvalComments').value.trim()); }
    catch {
      $('approvalConfirmError').textContent = 'Unable to save this decision. Please try again.'; $('approvalConfirmError').hidden = false; return;
    }
    ids.forEach(id => commentDrafts.delete(id));
    pendingAction = null;
    selected.clear();
    render();
    closeDialog();
    if (typeof showToast === 'function') showToast(`${{ approve: 'Approved', resubmit: 'Sent for resubmission:', reject: 'Rejected' }[action]} ${count} request${count === 1 ? '' : 's'}.`);
  });
  $('approvalBackupForm').addEventListener('submit', event => {
    event.preventDefault();
    if (pendingAction?.action !== 'backup') return;
    try {
      const count = store.assignBackup(pendingAction.ids, $('approvalBackupApprover').value);
      if (!count) throw new Error('No eligible request');
    } catch {
      $('approvalBackupError').textContent = 'Unable to assign this backup approver. Please try again.'; $('approvalBackupError').hidden = false; return;
    }
    pendingAction = null; selected.clear(); render(); closeDialog();
    if (typeof showToast === 'function') showToast('Backup approver assigned. Requests remain pending.');
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
    history.replaceState(null, '', url);
  }
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('popstate', () => setCategory(new URLSearchParams(location.search).get('tab'), false));
  syncTheme();
  setCategory(category);
})();
