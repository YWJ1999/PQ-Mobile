(() => {
  const $ = id => document.getElementById(id);
  const actions = [['approve', 'Approve'], ['resubmit', 'Resubmit'], ['reject', 'Reject']];
  const records = (window.EMPLOYEE_CAREER_PENDING_DATA || []).map(item => ({ ...item, status: item.status || 'pending' }));
  const selected = new Set();
  let category = '';
  let visible = [];
  let filter;
  let currentId;
  let sheet;
  let opener;
  let background = [];
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const icon = name => { const element = node('i', 'fa-solid ' + name); element.setAttribute('aria-hidden', 'true'); return element; };
  const date = value => { const iso = window.PendingApprovalFilter.toISO(value); return iso ? iso.split('-').reverse().join('/') : (value || '—'); };
  const current = () => records.find(item => item.id === currentId);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function identity(name, empNo, position) {
    const element = node('div', 'payroll-employee-copy');
    element.append(node('strong', 'employee-name', name || 'Employee'));
    if (empNo) element.append(node('span', 'employee-id', '#' + String(empNo).replace(/^#+/, '')));
    if (position) element.append(node('div', 'career-pending-note', position));
    return element;
  }
  function field(label, value) {
    const element = node('div', 'payroll-approval-field');
    element.append(node('small', '', label), node('strong', '', value == null || value === '' ? '—' : value));
    return element;
  }
  function detailActionButtons(engagementDetails) {
    const grid = node('div', 'pending-action-grid');
    const entries = engagementDetails ? [['approve', 'Approve'], ['resubmit', 'Resubmit'], ['cancel', 'Cancel'], ['reject', 'Reject']] : actions;
    grid.dataset.actionCount = String(entries.length);
    if (engagementDetails) {
      grid.classList.add('detail-popout-actions');
      grid.style.setProperty('--detail-action-count', String(entries.length));
    }
    entries.forEach(([action, label]) => {
      const button = node('button', 'action-btn-' + action);
      button.type = 'button';
      if (action === 'cancel') button.setAttribute('data-close-career-sheet', '');
      else button.dataset.careerApprovalAction = action;
      button.append(node('span', '', label));
      grid.append(button);
    });
    return grid;
  }
  function updateSelection() {
    $('careerPendingSelectAll').checked = visible.length > 0 && visible.every(item => selected.has(item.id));
    $('careerPendingSelectAll').indeterminate = selected.size > 0 && !$('careerPendingSelectAll').checked;
    $('careerPendingSelectAll').disabled = !visible.length;
    $('careerPendingSelectedCount').textContent = String(selected.size);
    $('careerPendingBulk').hidden = !selected.size;
    $('careerPendingBulk').querySelector('bulk-approval-actions').syncWithQueue($('careerPendingQueue'));
  }
  function renderCard(item) {
    const isEngagement = item.type === 'Staff Engagement';
    const card = node('article', 'approval-request-card');
    card.dataset.careerRequestId = item.id;
    const header = node('header', 'payroll-approval-card-header');
    const checkbox = node('input', 'approval-card-checkbox');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(item.id);
    checkbox.setAttribute('aria-label', `Select ${item.reference || item.id} for ${item.employeeName}`);
    checkbox.addEventListener('change', () => { if (checkbox.checked) selected.add(item.id); else selected.delete(item.id); updateSelection(); });
    const menu = node('button', 'three-dots-btn');
    menu.type = 'button';
    menu.setAttribute('aria-label', `Request options for ${item.employeeName}`);
    menu.setAttribute('aria-haspopup', 'dialog');
    menu.append(icon('fa-ellipsis-vertical'));
    menu.addEventListener('click', () => { currentId = item.id; openSheet('careerPendingMenu', menu); });
    header.append(checkbox, identity(item.employeeName, item.empNo, isEngagement ? null : item.position),
      node('span', 'payroll-approval-status', 'Pending Approval'), menu);
    const body = node('div', 'approval-card-body payroll-approval-card-body');
    const review = node('div', 'career-pending-review');
    review.tabIndex = 0;
    review.setAttribute('role', 'button');
    review.setAttribute('aria-label', `View ${item.type || 'request'} details for ${item.employeeName}`);
    const summary = isEngagement
      ? [['Interview Date', date(item.interviewDate)], ['Position', item.position]]
      : [['Submitted Date', date(item.submitDate)], ['Reference #', item.reference || item.id]];
    review.append(createApprovalCardDetails(summary));
    review.addEventListener('click', () => openDetails(item.id, review));
    review.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); openDetails(item.id, review); } });
    body.append(review);
    body.append(createApprovalCardActions('careerApprovalAction'));
    card.append(header, body);
    return card;
  }
  function render() {
    const focused = document.activeElement;
    const focusedCard = focused?.closest('[data-career-request-id]');
    visible = records.filter(item => item.status === 'pending' && (!category || item.type === category) && filter.matches({ keyword: `${item.employeeName} ${item.empNo} ${item.reference || item.id} ${item.type}`, startDate: item.startDate || item.submitDate, endDate: item.endDate || item.submitDate, submittedAt: item.submitDate }));
    const ids = new Set(visible.map(item => item.id));
    [...selected].forEach(id => { if (!ids.has(id)) selected.delete(id); });
    $('careerPendingQueue').replaceChildren(...visible.map(renderCard));
    $('careerPendingCount').textContent = String(visible.length);
    $('careerPendingEmpty').hidden = visible.length > 0;
    $('careerPendingEmptyText').textContent = records.some(item => item.status === 'pending') ? 'Try another request type or filter.' : 'Employee & Career requests awaiting review will appear here.';
    updateSelection();
    if (focusedCard && !focused.isConnected) {
      const replacement = [...$('careerPendingQueue').children].find(card => card.dataset.careerRequestId === focusedCard.dataset.careerRequestId);
      const selector = focused.dataset.careerApprovalAction ? `[data-career-approval-action="${focused.dataset.careerApprovalAction}"]` : focused.matches('.three-dots-btn') ? '.three-dots-btn' : focused.matches('.approval-card-checkbox') ? '.approval-card-checkbox' : '.career-pending-review';
      (replacement?.querySelector(selector) || $('careerPendingFilterTrigger')).focus({ preventScroll: true });
    }
  }
  function closeSheet(restore = true) {
    if (!sheet) return;
    sheet.hidden = true;
    sheet.classList.remove('active');
    background.forEach(element => { element.inert = false; });
    background = [];
    sheet = null;
    if (restore) (opener?.isConnected ? opener : $('careerPendingFilterTrigger')).focus({ preventScroll: true });
  }
  function openSheet(id, trigger) {
    const returnTarget = sheet ? opener : document.activeElement;
    closeSheet(false);
    opener = trigger || returnTarget;
    sheet = $(id);
    background = [...sheet.parentElement.children].filter(element => element !== sheet && !element.inert);
    background.forEach(element => { element.inert = true; });
    sheet.hidden = false;
    sheet.classList.add('active');
    sheet.querySelector('button').focus({ preventScroll: true });
  }
  function remarksControl(item) {
    const comments = node('textarea', 'payroll-approval-comments');
    comments.id = 'careerPendingComments';
    comments.setAttribute('aria-label', 'Approver Remarks');
    comments.placeholder = 'Add remarks for this decision';
    comments.value = item.approverRemarks || '';
    return comments;
  }
  function engagementAttachments(attachments) {
    if (!attachments?.length) return node('span', '', 'No attachments');
    const files = node('div', 'payroll-approval-files');
    attachments.forEach(attachment => {
      let url;
      try {
        const candidate = new URL(attachment.url, location.href);
        const modulePath = new URL('../', location.href).pathname;
        if (attachment.url && (['http:', 'https:'].includes(candidate.protocol)
          || (location.protocol === 'file:' && candidate.protocol === 'file:' && candidate.pathname.startsWith(modulePath)))) url = candidate.href;
      } catch { /* Unavailable attachments remain plain text. */ }
      const file = node(url ? 'a' : 'span', 'payroll-approval-file');
      if (url) {
        file.href = url;
        file.target = '_blank';
        file.rel = 'noopener noreferrer';
        file.download = attachment.name || 'attachment';
        file.setAttribute('aria-label', `Download attachment ${attachment.name || 'Attachment'}`);
      }
      file.append(icon('fa-paperclip'), node('span', '', attachment.name || 'Attachment'));
      files.append(file);
    });
    return files;
  }
  function openDetails(id, trigger) {
    currentId = id;
    const item = current();
    if (!item) return;
    const isEngagement = item.type === 'Staff Engagement';
    const overlay = $('careerPendingDetails');
    const presentation = [
      [overlay, 'detail-popout-overlay'],
      [overlay.querySelector('.payroll-approval-panel'), 'detail-popout-panel'],
      [overlay.querySelector('.payroll-approval-details-header'), 'detail-popout-header'],
      [$('careerPendingDetailsTitle'), 'detail-popout-title'],
      [overlay.querySelector('.payroll-approval-close'), 'detail-popout-close'],
      [overlay.querySelector('.payroll-approval-details-body'), 'detail-popout-body'],
      [$('careerPendingDetailsActions'), 'detail-popout-footer']
    ];
    presentation.forEach(([element, className]) => element.classList.toggle(className, isEngagement));
    overlay.classList.toggle('career-pending-engagement-details', isEngagement);
    let subtitle = $('careerPendingDetailsSubtitle');
    if (!subtitle) {
      subtitle = node('p', 'detail-popout-subtitle', 'Review staff engagement details');
      subtitle.id = 'careerPendingDetailsSubtitle';
      $('careerPendingDetailsTitle').after(subtitle);
    }
    subtitle.hidden = !isEngagement;
    $('careerPendingDetailsTitle').textContent = item.approvalTitle || `${item.type || 'Request'} Approval`;
    const body = $('careerPendingDetails').querySelector('.payroll-approval-details-body');
    body.replaceChildren();
    const isProfile = Boolean(item.profile && window.EmployeeCareerCVHistoryDetails);
    body.classList.toggle('career-pending-record-details', !isProfile);
    if (isProfile) {
      body.innerHTML = window.EmployeeCareerCVHistoryDetails.render(
        item,
        escape(item.documentStatus || 'Submitted'),
        date(item.submitDate),
        {qualificationLayout: 'cards'}
      );
      const remarksRow = [...body.querySelectorAll('.cv-history-request-summary .cv-history-detail-row')]
        .find(row => row.querySelector('dt')?.textContent.trim() === 'Approver Remarks');
      remarksRow?.remove();
      const remarks = node('section', 'career-pending-remarks approval-comments-card');
      const label = node('label', '', 'Approver Remarks');
      label.htmlFor = 'careerPendingComments';
      const comments = remarksControl(item);
      comments.placeholder = 'Add approver action comments (optional)...';
      remarks.append(label, comments);
      body.querySelector('#cv-panel-family').append(remarks);
    } else {
      const table = node('table', 'payroll-approval-table');
      table.id = 'careerPendingDetailsTable';
      const tbody = node('tbody');
      table.classList.toggle('career-pending-engagement-table', isEngagement);
      table.classList.toggle('detail-popout-table', isEngagement);
      const rows = isEngagement ? [
        ['Employee #', item.empNo ? '#' + String(item.empNo).replace(/^#+/, '') : '—'],
        ['Name', item.employeeName],
        ['Position', item.position],
        ['Interview Date', date(item.interviewDate)],
        ['Positive Feedback', item.positiveFeedback],
        ['Negative Feedback', item.negativeFeedback],
        ['Flight Risk', item.flightRisk],
        ['Recommendation', item.recommendation],
        ['Mitigation Action', item.mitigationAction],
        ['Remarks', item.remarks],
        ['Attachment', engagementAttachments(item.attachments)]
      ] : [
        ['Document Reference', item.reference || item.id],
        ['Document Status', item.documentStatus || 'Submitted'],
        ['Employee', identity(item.employeeName, item.empNo, item.position)],
        ['Type', item.type],
        ['Submit Date', date(item.submitDate)],
        ...(item.details || []),
        ['Approver Remarks', remarksControl(item)]
      ];
      rows.forEach(([label, value]) => {
        const row = node('tr');
        const heading = node('th', isEngagement ? 'detail-popout-label' : '', label);
        heading.scope = 'row';
        const cell = node('td', isEngagement ? 'detail-popout-value' : '');
        cell.append(value instanceof HTMLElement ? value : document.createTextNode(value == null || value === '' ? '—' : String(value)));
        row.append(heading, cell);
        tbody.append(row);
      });
      table.append(tbody);
      body.append(table);
      if (isEngagement) {
        const remarks = node('section', 'detail-popout-comments approval-comments-card');
        const label = node('label', '', 'Approver Remarks');
        label.htmlFor = 'careerPendingComments';
        const comments = remarksControl(item);
        comments.classList.add('detail-popout-comment-control');
        comments.placeholder = 'Add approver action comments (optional)...';
        remarks.append(label, comments);
        body.append(remarks);
      }
    }
    $('careerPendingDetailsActions').replaceChildren(detailActionButtons(isEngagement));
    body.scrollTop = 0;
    body.querySelector('.cv-history-detail-scroll')?.scrollTo(0, 0);
    openSheet('careerPendingDetails', trigger);
  }
  function openWorkflow() {
    const item = current();
    if (!item) return;
    $('careerPendingWorkflowRequest').replaceChildren(field('Document Reference', item.reference || item.id), identity(item.employeeName, item.empNo), field('Request Type', item.type));
    $('careerPendingWorkflowSteps').replaceChildren(...(item.workflow || []).map(step => {
      const entry = node('li', 'payroll-approval-workflow-step');
      entry.append(field(step.title || 'Approval Step', step.status || 'Pending'));
      if (step.name) entry.append(identity(step.name, step.empNo, step.role));
      if (step.date) entry.append(field('Date', date(step.date)));
      return entry;
    }));
    if (!item.workflow?.length) $('careerPendingWorkflowSteps').append(node('li', 'career-pending-note', 'No approval steps available.'));
    $('careerPendingWorkflowAudit').replaceChildren(...(item.audit || []).map(event => {
      const entry = node('li');
      entry.append(field(event.title || 'Activity', date(event.date)));
      if (event.description) entry.append(node('span', '', event.description));
      return entry;
    }));
    if (!item.audit?.length) $('careerPendingWorkflowAudit').append(node('li', 'career-pending-note', 'No audit history available.'));
    openSheet('careerPendingWorkflow');
  }
  function decide(action, ids) {
    const items = records.filter(item => item.status === 'pending' && ids.includes(item.id));
    if (!items.length) { showToast('Please select at least one request.'); return; }
    const status = { approve: 'approved', resubmit: 'resubmit', reject: 'rejected' }[action];
    if (!status) return;
    items.forEach(item => { item.status = status; selected.delete(item.id); });
    closeSheet();
    render();
    showToast(`${items.length} ${items.length === 1 ? 'request' : 'requests'} ${action === 'resubmit' ? 'returned for resubmission' : status}.`);
    window.dispatchEvent(new CustomEvent('employee-career-approval-change', { detail: { action, records: items.map(item => ({ ...item })) } }));
  }
  function init() {
    const types = [...new Set([...(window.EMPLOYEE_CAREER_PENDING_CATEGORIES || []), ...records.map(item => item.type).filter(Boolean)])];
    const requestedType = new URLSearchParams(location.search).get('type');
    category = types.includes(requestedType) ? requestedType : types.find(Boolean) || 'CV Change Request';
    filter = window.PendingApprovalFilter.create('careerPendingFilter', { summaryId: 'careerPendingFilterSummary', onApply: render });
    function setCategory(type, updateUrl = true) {
      category = type;
      selected.clear();
      $('careerPendingTabs').querySelectorAll('[role="tab"]').forEach(tab => {
        const active = tab.dataset.careerPendingType === type;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) $('careerPendingPanel').setAttribute('aria-labelledby', tab.id);
      });
      if (updateUrl) {
        const url = new URL(location.href);
        url.searchParams.set('type', type);
        url.searchParams.set('theme', document.documentElement.dataset.theme);
        history.replaceState(null, '', url);
      }
      render();
    }
    $('careerPendingTabs').replaceChildren(...types.map((type, index) => {
      const tab = node('button', 'filter-pill', type);
      tab.id = `careerPendingTab${index}`;
      tab.type = 'button';
      tab.dataset.careerPendingType = type;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'careerPendingPanel');
      tab.addEventListener('click', () => setCategory(type));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? types.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + types.length) % types.length;
        setCategory(types[next]);
        $(`careerPendingTab${next}`).focus();
      });
      return tab;
    }));
    $('careerPendingFilterTrigger').addEventListener('click', filter.open);
    $('careerPendingSelectAll').addEventListener('change', event => { visible.forEach(item => { if (event.target.checked) selected.add(item.id); else selected.delete(item.id); }); render(); });
    $('careerPendingViewDetails').addEventListener('click', () => openDetails(currentId));
    $('careerPendingViewWorkflow').addEventListener('click', openWorkflow);
    $('careerPendingBack').addEventListener('click', () => { const url = new URL($('careerPendingBack').href); url.searchParams.set('theme', document.documentElement.dataset.theme); $('careerPendingBack').href = url.href; });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-close-career-sheet]') || event.target === sheet) { closeSheet(); return; }
      const familyMember = event.target.closest('[data-cv-family-member]');
      if (familyMember && current()) {
        window.EmployeeCareerCVHistoryDetails.openFamilyMember(current(), familyMember);
        return;
      }
      const qualificationCard = event.target.closest('[data-qualification-card-toggle]');
      if (qualificationCard && window.EmployeeCareerCVHistoryDetails) {
        window.EmployeeCareerCVHistoryDetails.toggleQualificationCard($('careerPendingDetails').querySelector('.payroll-approval-details-body'), qualificationCard.dataset.qualificationCardToggle);
        return;
      }
      const qualificationTab = event.target.closest('[data-qualification-tab]');
      if (qualificationTab && window.EmployeeCareerCVHistoryDetails) {
        window.EmployeeCareerCVHistoryDetails.selectQualificationTab($('careerPendingDetails').querySelector('.payroll-approval-details-body'), qualificationTab.dataset.qualificationTab, true);
        return;
      }
      const cvTab = event.target.closest('[data-cv-tab]');
      if (cvTab && window.EmployeeCareerCVHistoryDetails) {
        window.EmployeeCareerCVHistoryDetails.selectTab($('careerPendingDetails').querySelector('.payroll-approval-details-body'), cvTab.dataset.cvTab);
        return;
      }
      const button = event.target.closest('[data-career-approval-action]');
      if (button) {
        currentId = button.closest('[data-career-request-id]')?.dataset.careerRequestId || currentId;
        const comments = button.closest('#careerPendingDetails') ? $('careerPendingComments') : null;
        if (comments && current()) current().approverRemarks = comments.value;
        decide(button.dataset.careerApprovalAction, [currentId]);
      }
      const bulk = event.target.closest('[data-career-bulk-action]');
      if (bulk) decide(bulk.dataset.careerBulkAction, [...selected]);
    });
    document.addEventListener('keydown', event => {
      if (!sheet) return;
      if (event.target.closest('[data-qualification-tab]') && window.EmployeeCareerCVHistoryDetails) {
        window.EmployeeCareerCVHistoryDetails.qualificationKeydown(event, $('careerPendingDetails').querySelector('.payroll-approval-details-body'));
      } else if (event.target.closest('[data-cv-tab]') && window.EmployeeCareerCVHistoryDetails) {
        window.EmployeeCareerCVHistoryDetails.keydown(event, $('careerPendingDetails').querySelector('.payroll-approval-details-body'));
      }
      if (event.key === 'Escape') { event.preventDefault(); closeSheet(); }
      if (event.key === 'Tab' && sheet) {
        const controls = [...sheet.querySelectorAll('button, input, textarea, a')].filter(element => !element.disabled && element.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    setCategory(category, false);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
