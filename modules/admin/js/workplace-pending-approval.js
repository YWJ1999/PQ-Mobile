document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const store = window.WorkplacePendingStore;
  const selected = new Set();
  const actions = [['approve', 'Approve', 'fa-check'], ['resubmit', 'Resubmit', 'fa-rotate-left'], ['reject', 'Reject', 'fa-xmark']];
  const tabConfig = {
    'guest-visit': {
      kind: 'guest-visit',
      requestName: 'Guest Visit Request',
      detailsTitle: 'Guest Visit Request Approval',
      emptyText: 'Guest Visit requests awaiting review will appear here.'
    },
    inventory: {
      kind: 'inventory-request',
      requestName: 'Inventory Request',
      detailsTitle: 'Inventory Request Approval',
      emptyText: 'Inventory requests awaiting review will appear here.'
    }
  };
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  let activeTab = tabConfig[requestedTab] ? requestedTab : 'guest-visit';
  let visible = [];
  let filter;
  let currentId;
  let sheet;
  let opener;
  let background = [];
  const date = value => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' Sept ', ' Sep ') : '—';
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function icon(name) {
    const element = node('i', 'fa-solid ' + name);
    element.setAttribute('aria-hidden', 'true');
    return element;
  }
  function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
  function identity(name, empNo) {
    const copy = node('div', 'payroll-employee-copy');
    copy.append(node('strong', 'employee-name', name), node('span', 'employee-id', '#' + empNo.replace(/^#+/, '')));
    return copy;
  }
  function fieldGrid(rows) {
    const grid = node('div', 'payroll-approval-field-grid');
    rows.forEach(([label, value]) => {
      const field = node('div', 'payroll-approval-field');
      field.append(node('small', '', label), node('strong', '', value));
      grid.append(field);
    });
    return grid;
  }
  function detailActionButtons() {
    const grid = node('div', 'pending-action-grid');
    for (const [action, label, symbol] of actions) {
      const button = node('button', 'action-btn-' + action);
      button.type = 'button';
      button.dataset.approvalAction = action;
      button.append(icon(symbol), node('span', '', label));
      grid.append(button);
    }
    const close = node('button', 'action-btn-cancel', 'Cancel');
    close.type = 'button';
    close.dataset.closeWorkplaceApproval = '';
    grid.append(close);
    return grid;
  }
  function updateSelection() {
    $('workplacePendingSelectAll').checked = visible.length > 0 && visible.every(row => selected.has(row.id));
    $('workplacePendingSelectAll').indeterminate = selected.size > 0 && !$('workplacePendingSelectAll').checked;
    $('workplacePendingBulk').hidden = selected.size === 0;
    $('workplacePendingBulk').querySelector('bulk-approval-actions').syncWithQueue($('workplacePendingQueue'));
    $('workplacePendingSelectedCount').textContent = selected.size;
  }
  function updateTabs() {
    document.querySelectorAll('[data-workplace-tab]').forEach(tab => {
      const active = tab.dataset.workplaceTab === activeTab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $('workplacePendingQueue').setAttribute('aria-labelledby', 'workplacePendingTab-' + activeTab);
  }
  function setActiveTab(tab, focus = false) {
    if (!tabConfig[tab] || tab === activeTab) return;
    activeTab = tab;
    selected.clear();
    const url = new URL(window.location.href);
    if (tab === 'guest-visit') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
    render();
    if (focus) document.querySelector(`[data-workplace-tab="${tab}"]`).focus();
  }
  function renderCard(item) {
    const card = node('article', 'approval-request-card');
    card.dataset.itemId = item.id;
    const header = node('header', 'payroll-approval-card-header');
    const checkbox = node('input', 'approval-card-checkbox');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(item.id);
    checkbox.setAttribute('aria-label', `Select ${item.reference} for ${item.employeeName}`);
    checkbox.addEventListener('change', () => { if (checkbox.checked) selected.add(item.id); else selected.delete(item.id); updateSelection(); });
    const menu = node('button', 'three-dots-btn');
    menu.type = 'button';
    menu.setAttribute('aria-label', 'Options for ' + item.reference);
    menu.setAttribute('aria-haspopup', 'dialog');
    menu.append(icon('fa-ellipsis-vertical'));
    menu.addEventListener('click', () => {
      currentId = item.id;
      message('workplaceApprovalMenuFeedback', '');
      openSheet('workplaceApprovalMenu', menu);
    });
    header.append(checkbox, identity(item.employeeName, item.empNo), menu);
    const body = node('div', 'approval-card-body payroll-approval-card-body');
    const review = node('div', 'workplace-approval-review');
    review.tabIndex = 0;
    review.setAttribute('role', 'button');
    review.setAttribute('aria-label', 'View details for ' + item.reference);
    const status = node('span', 'payroll-approval-status');
    status.append(icon('fa-hourglass-half'), node('span', '', 'Submitted'));
    header.insertBefore(status, menu);
    const reference = node('p', 'workplace-approval-reference', 'Ref: ' + item.reference);
    const rows = item.kind === 'inventory-request'
      ? [['Quantity', String(item.quantity)], ['Request Item', item.requestItem], ['Reason', item.reason]]
      : [['Visit Date', date(item.visitDate)], ['Visit Time', `${item.startTime} – ${item.endTime}`], ['Total Guest', String(item.totalGuest)]];
    header.querySelector('.payroll-employee-copy').append(reference);
    review.append(createApprovalCardDetails([['Submit Date', date(item.submitDate)], ...rows]));
    review.addEventListener('click', () => openDetails(item.id, review));
    review.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); openDetails(item.id, review); } });
    body.append(review, createApprovalCardActions('approvalAction'));
    PendingApprovalBackup.showAssignment(body.lastElementChild, { scope: 'workplace', id: item.id });
    card.append(header, body);
    return card;
  }
  function render() {
    try {
      const config = tabConfig[activeTab];
      const pending = store.getPending().filter(item => item.kind === config.kind);
      visible = pending.filter(item => filter.matches({
        keyword: `${item.employeeName} ${item.empNo} ${item.reference} ${config.requestName} ${item.requestItem || ''} ${item.reason || ''}`,
        startDate: item.submitDate,
        endDate: item.submitDate,
        submittedAt: item.submitDate
      }));
      const ids = new Set(visible.map(row => row.id));
      [...selected].forEach(id => { if (!ids.has(id)) selected.delete(id); });
      $('workplacePendingQueue').replaceChildren(...visible.map(renderCard));
      $('workplacePendingCount').textContent = visible.length;
      $('workplacePendingEmpty').hidden = visible.length > 0;
      $('workplacePendingEmptyText').textContent = pending.length ? 'Try another filter.' : config.emptyText;
      $('workplacePendingSelectAll').disabled = visible.length === 0;
      message('workplacePendingError', '');
    } catch {
      visible = [];
      selected.clear();
      $('workplacePendingQueue').replaceChildren();
      $('workplacePendingCount').textContent = '—';
      $('workplacePendingEmpty').hidden = true;
      $('workplacePendingSelectAll').disabled = true;
      message('workplacePendingError', 'Unable to load pending approvals. Please try again.');
    }
    updateTabs();
    updateSelection();
  }
  function closeSheet(restore = true) {
    if (!sheet) return;
    sheet.hidden = true;
    sheet.classList.remove('active');
    background.forEach(({ element, inert }) => { element.inert = inert; });
    background = [];
    sheet = null;
    if (restore) (opener?.isConnected ? opener : $('workplacePendingFilterTrigger')).focus({ preventScroll: true });
  }
  function openSheet(id, trigger) {
    closeSheet(false);
    sheet = $(id);
    opener = trigger || opener || document.activeElement;
    background = [...sheet.parentElement.children].filter(element => element !== sheet).map(element => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    sheet.hidden = false;
    sheet.classList.add('active');
    sheet.querySelector('button').focus({ preventScroll: true });
  }
  function table(parent, rows) {
    const table = node('table', 'payroll-approval-table');
    const tbody = table.createTBody();
    rows.forEach(([label, value]) => {
      const row = tbody.insertRow();
      const th = node('th');
      th.scope = 'row';
      th.textContent = label;
      const td = node('td');
      td.append(value instanceof HTMLElement ? value : document.createTextNode(value === '' || value == null ? '—' : String(value)));
      row.append(th, td);
    });
    const container = node('div', 'claim-detail-table-grid');
    container.append(table);
    parent.append(container);
  }
  function sectionTitle(section, title) {
    section.replaceChildren(node('h4', 'claim-detail-section-title', title));
  }
  function openDetails(id, trigger) {
    const item = store.getPending().find(row => row.id === id);
    if (!item) return;
    currentId = id;
    const config = item.kind === 'inventory-request' ? tabConfig.inventory : tabConfig['guest-visit'];
    $('workplaceApprovalDetailsTitle').textContent = config.detailsTitle;
    const general = $('approvalPanel-general');
    const guests = $('approvalPanel-guest');
    const attendees = $('approvalPanel-attendee');
    const other = $('approvalPanel-other');
    general.hidden = false;
    if (item.kind === 'inventory-request') {
      [guests, attendees, other].forEach(section => {
        section.hidden = true;
        section.replaceChildren();
      });
      sectionTitle(general, 'Request Details');
      table(general, [
        ['Document Reference #', node('span', 'workplace-approval-document-ref', item.reference)],
        ['Employee #', '#' + item.empNo.replace(/^#+/, '')],
        ['Name', item.employeeName],
        ['Position', item.position],
        ['Department', item.department],
        ['Document Status', 'Submitted'],
        ['Submit Date', date(item.submitDate)],
        ['Item Group', item.itemGroup],
        ['Item', item.requestItem],
        ['Item Type', item.itemType],
        ['Required By', date(item.requiredBy)],
        ['Survey', item.survey ? 'Yes' : 'No'],
        ['Checklist', item.checklist],
        ['Unit of Measure', item.unitOfMeasure],
        ['Reason', item.reason],
        ['Quantity', item.quantity],
        ['Remarks', item.remarks],
        ['Attachment', item.attachments.length ? item.attachments.join(', ') : 'None']
      ]);
    } else {
      [guests, attendees, other].forEach(section => { section.hidden = false; });
      sectionTitle(general, 'General');
      table(general, [
        ['Document Reference', node('span', 'workplace-approval-document-ref', item.reference)], ['Document Status', 'Submitted'],
        ['Submit Date', date(item.submitDate)], ['Visit Date', date(item.visitDate)],
        ['Visit Time', `${item.startTime} – ${item.endTime}`], ['Total Guest', item.totalGuest],
        ['Location', item.location], ['Meal?', item.meal ? 'Yes' : 'No']
      ]);
      sectionTitle(guests, 'Guest');
      item.guests.forEach(guest => table(guests, [['Company', guest.company], ['Relation', guest.relation], ['Name', guest.name], ['Position', guest.position]]));
      sectionTitle(attendees, 'Attendee');
      item.attendees.forEach(attendee => {
        table(attendees, [['Employee', identity(attendee.name, attendee.empNo)], ['Department', attendee.department], ['Position', attendee.position]]);
      });
      sectionTitle(other, 'Other');
      const requests = [['Floor Visit', 'floor-visit'], ['Sitting Arrangement', 'sitting-arrangement'], ['Multiple Rooms', 'multiple-rooms']].map(([text, value]) => [text, item.otherRequests.includes(value) ? 'Yes' : 'No']);
      requests.push(['None', item.otherRequests.length === 0 ? 'Yes' : 'No']);
      table(other, requests);
    }
    if (item.kind !== 'inventory-request' && item.attachments.length) table(general, [['Attachment', item.attachments.join(', ')]]);
    const commentLabel = node('label', 'workplace-approval-comment-label', 'Approver Action Comments');
    commentLabel.htmlFor = 'approvalComments';
    const comments = node('input', 'payroll-approval-comments workplace-approval-comment-input');
    comments.type = 'text';
    comments.placeholder = 'Add approver action comments (optional)...';
    comments.id = 'approvalComments';
    comments.maxLength = 2000;
    comments.value = item.approverComments;
    $('workplaceApprovalComments').replaceChildren(commentLabel, comments);
    $('workplaceApprovalDetailActions').replaceChildren(...detailActionButtons().children);
    message('workplaceApprovalDetailFeedback', '');
    openSheet('workplaceApprovalDetails', trigger);
    general.parentElement.scrollTop = 0;
  }
  function openWorkflow() {
    const item = store.list().find(row => row.id === currentId);
    if (!item) return;
    const body = $('workplaceApprovalWorkflowBody');
    const request = node('section', 'payroll-approval-workflow-request');
    const employee = identity(item.employeeName, item.empNo);
    employee.classList.add('payroll-approval-workflow-person');
    const config = item.kind === 'inventory-request' ? tabConfig.inventory : tabConfig['guest-visit'];
    request.append(node('p', 'workplace-approval-reference', item.reference), employee, fieldGrid([['Request', config.requestName], ['Submit Date', date(item.submitDate)]]));
    const steps = node('section', 'payroll-approval-workflow-step is-active');
    steps.append(node('h3', '', 'Approval Steps'), node('p', 'workplace-approval-notice', 'Submitted'), node('strong', '', 'Awaiting Approval'));
    const backup = PendingApprovalBackup.assigned('workplace', item.id);
    if (backup) steps.append(fieldGrid([['Backup Approver', backup.name]]));
    const audit = node('section', 'payroll-approval-workflow-audit');
    audit.append(node('h3', '', 'Audit History'));
    item.audit.forEach(event => audit.append(node('p', 'workplace-approval-comment-label', `${event.action === 'submitted' ? 'Submitted' : event.action} · ${date(event.at)}`)));
    body.replaceChildren(request, steps, audit);
    openSheet('workplaceApprovalWorkflow', opener);
  }
  function act(button) {
    const action = button.dataset.approvalAction;
    const inDetails = Boolean(button.closest('#workplaceApprovalDetails'));
    const inMenu = Boolean(button.closest('#workplaceApprovalMenu'));
    const card = button.closest('[data-item-id]');
    const ids = inDetails || inMenu ? [currentId] : card ? [card.dataset.itemId] : [...selected];
    if (!ids.length) return;
    if (action === 'approve' && !inDetails && ids.length === 1) { openDetails(ids[0], button); return; }
    const options = {};
    if (inDetails) {
      options.comments = $('approvalComments').value;
    }
    try {
      const count = store.act(ids, action, options);
      closeSheet(false);
      selected.clear();
      render();
      message('workplacePendingFeedback', `${count} request${count === 1 ? '' : 's'} ${ { approve: 'approved', resubmit: 'sent for resubmission', reject: 'rejected', cancel: 'cancelled' }[action] }.`);
      $('workplacePendingFilterTrigger').focus({ preventScroll: true });
    } catch (error) {
      const text = /^(Please|End Time|Total Guest|This request)/.test(error.message) ? error.message : 'Unable to update this request. Please try again.';
      const feedback = inDetails ? 'workplaceApprovalDetailFeedback' : inMenu ? 'workplaceApprovalMenuFeedback' : 'workplacePendingFeedback';
      message(feedback, text);
      if (inDetails) $('workplaceApprovalDetailFeedback').scrollIntoView({ block: 'nearest' });
    }
  }
  filter = window.PendingApprovalFilter.create('workplacePendingFilter', { summaryId: 'workplacePendingFilterSummary', onApply: render });
  const tabs = [...document.querySelectorAll('[data-workplace-tab]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.workplaceTab));
    tab.addEventListener('keydown', event => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      setActiveTab(tabs[nextIndex].dataset.workplaceTab, true);
    });
  });
  $('workplacePendingFilterTrigger').addEventListener('click', filter.open);
  $('workplacePendingSelectAll').addEventListener('change', event => { visible.forEach(row => { if (event.target.checked) selected.add(row.id); else selected.delete(row.id); }); render(); });
  $('workplacePendingViewDetails').addEventListener('click', () => openDetails(currentId, opener));
  $('workplacePendingViewWorkflow').addEventListener('click', openWorkflow);
  $('workplaceApprovalReview').addEventListener('submit', event => event.preventDefault());
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-approval-action]');
    if (button) act(button);
    if (event.target.closest('[data-close-workplace-approval]')) closeSheet();
  });
  document.querySelectorAll('.payroll-approval-overlay').forEach(overlay => {
    overlay.addEventListener('click', event => { if (event.target === overlay) closeSheet(); });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeSheet(); }
      if (event.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter(control => !control.disabled && control.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', event => {
    if (event.key === 'peoplehcm:workplace:pending-approval:v1' || event.key === null) { closeSheet(); render(); }
  });
  render();
});
