/* Presentation adapter for audited details only. Existing record renderers and handlers stay authoritative. */
(function () {
  const definitions = [
    ['detailsModalOverlay', '#claimDetailsModalContainer'],
    ['claimDetailsModalOverlay', ':scope > .indicators-sheet'],
    ['historyDetailsModalOverlay', '.history-details-dialog'],
    ['approvalDetailsModalOverlay', ':scope > .indicators-sheet', 'closeApprovalDetailsModal'],
    ['clockDetailsModal', ':scope > .modal-content'],
    ['otDetailsModal', ':scope > .modal-content'],
    ['feedbackDetailsModal', ':scope > .modal-content'],
    ['attendanceDetailsModalOverlay', ':scope > .details-popout-card, :scope > .popup-modal-content', 'closeAttendanceDetailsModal'],
    ['historyDetailsModal', '.history-detail-panel'],
    ['payrollPendingDetails', '.payroll-approval-panel'],
    ['taxReliefDetailModal', '.tax-relief-detail-modal'],
    ['priorRecordDetails', '.prior-record-modal'],
    ['projectHistoryDetailOverlay', '.project-history-detail-sheet'],
    ['projectApprovalDetails', '.project-approval-details-sheet'],
    ['modal-ot-details', ':scope > .popup-modal-content'],
    ['modal-attendance-details', ':scope > .popup-modal-content'],
    ['detailModal', ':scope > .modal-content']
  ];
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const addClass = (node, className) => { if (node && !node.classList.contains(className)) node.classList.add(className); };
  const clear = (node, properties) => properties.forEach(property => { if (node.style.getPropertyValue(property)) node.style.removeProperty(property); });
  const attachmentLabel = value => /^(attachments?|upload files)\s*:?$/i.test(clean(value));
  const commentLabel = value => /^(?:approver(?: action)? comments|comments)\s*:?$/i.test(clean(value));
  const commentCards = new WeakMap();

  function directChild(node, panel) {
    while (node && node.parentElement !== panel) node = node.parentElement;
    return node;
  }

  function normalizeCloseButton(close) {
    if (!close) return;
    addClass(close, 'detail-popout-close');
    close.classList.remove('detail-popout-decoration');
    if (!close.getAttribute('aria-label')) close.setAttribute('aria-label', 'Close details');
    if (!close.querySelector('.fa-xmark')) {
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-xmark';
      icon.setAttribute('aria-hidden', 'true');
      close.append(icon);
    }
  }

  function normalizeHeader(header, title) {
    addClass(header, 'detail-popout-header');
    clear(header, ['background', 'background-image', 'background-color', 'color']);
    addClass(title, 'detail-popout-title');
    for (let node = title.parentElement; node && node !== header; node = node.parentElement) addClass(node, 'detail-popout-header-contents');
    const buttons = [...header.querySelectorAll('button')];
    const close = buttons.find(button => /close/i.test(button.getAttribute('aria-label') || button.title || '')) || buttons.at(-1);
    normalizeCloseButton(close);
    for (const button of buttons) if (button !== close) addClass(button, 'detail-popout-back');
    for (const node of header.querySelectorAll('[class*="handle"], [class*="-icon"]')) addClass(node, 'detail-popout-decoration');
    for (const node of header.children) {
      if (node === close) continue;
      if (!node.textContent.trim() && !node.querySelector('button') && !node.contains(title)) addClass(node, 'detail-popout-decoration');
    }
    for (const node of header.querySelectorAll('p,small,[id$="Sub"],[id$="Subtitle"],#detailEmpNo')) addClass(node, 'detail-popout-subtitle');
    // Some header metadata is a div next to the title, not a semantic subtitle.
    for (const node of title.parentElement.children) {
      if (node !== title && !node.contains(close) && clean(node.textContent) && !node.matches('button')) addClass(node, 'detail-popout-subtitle');
    }
  }

  function normalizeFields(body) {
    for (const table of body.querySelectorAll('table')) {
      addClass(table, 'detail-popout-table');
      for (const row of table.rows) {
        if (row.cells.length === 2) {
          addClass(row.cells[0], 'detail-popout-label');
          addClass(row.cells[1], 'detail-popout-value');
        }
      }
      for (let node = table.parentElement; node && node !== body; node = node.parentElement) {
        if (!node.matches('tbody,thead,tr') && !node.hidden) addClass(node, 'detail-popout-group');
      }
    }
    const rows = [...body.querySelectorAll('.project-history-detail-row,.tax-relief-detail-row,dl > div')];
    if (!rows.length && !body.querySelector('table')) {
      for (const node of body.querySelectorAll('div')) {
        if (node.children.length === 2 && [...node.children].every(child => child.tagName === 'SPAN')) rows.push(node);
      }
    }
    for (const row of rows) {
      if (row.children.length !== 2) continue;
      addClass(row, 'detail-popout-row');
      addClass(row.firstElementChild, 'detail-popout-label');
      addClass(row.lastElementChild, 'detail-popout-value');
      for (let node = row.parentElement; node && node !== body; node = node.parentElement) addClass(node, 'detail-popout-group');
    }
  }

  function normalizeAttachments(body) {
    // Keep each file row in its own tab/table. Only reorder the original siblings;
    // creating a global attachment table loses which section owns the file.
    const groups = new Map();
    const candidates = [...body.querySelectorAll('tr,.detail-popout-row')].filter(row => attachmentLabel(row.firstElementChild?.textContent));
    for (const row of candidates) {
      const owner = row.parentElement;
      if (!groups.has(owner)) groups.set(owner, []);
      const next = row.nextElementSibling;
      const fileRow = row.tagName === 'TR' && row.cells.length === 1 && next?.tagName === 'TR' && next.cells.length === 1 ? next : null;
      groups.get(owner).push({ row, fileRow });
    }
    for (const [owner, blocks] of groups) {
      // Upload controls precede file viewing, with both at the end of this table.
      const ordered = [
        ...blocks.filter(block => /^upload files/i.test(clean(block.row.firstElementChild?.textContent))),
        ...blocks.filter(block => !/^upload files/i.test(clean(block.row.firstElementChild?.textContent)))
      ].flatMap(block => [block.row, block.fileRow].filter(Boolean));
      const tail = [...owner.children].slice(-ordered.length);
      if (!ordered.every((row, index) => tail[index] === row)) owner.append(...ordered);
    }
  }

  function normalizeActions(panel, body, closeFunction) {
    const grid = [...panel.querySelectorAll('.pending-action-grid')].find(node => node.querySelector('.action-btn-approve,[data-payroll-action="approve"],[data-project-approval-action="approve"]'));
    if (!grid) return;
    const footer = directChild(grid, panel);
    if (footer === body) return;
    addClass(footer, 'detail-popout-footer');
    addClass(grid, 'detail-popout-actions');
    if (closeFunction && typeof window[closeFunction] === 'function') {
      if (!grid.querySelector('.detail-popout-cancel')) {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'detail-popout-cancel';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => window[closeFunction]());
        const reject = [...grid.children].find(button => clean(button.textContent) === 'Reject');
        grid.insertBefore(cancel, reject || null);
      }
    }
    const count = grid.querySelectorAll('button').length;
    if (grid.style.getPropertyValue('--detail-action-count') !== String(count)) grid.style.setProperty('--detail-action-count', String(count));
  }

  function normalizeComments(panel, body) {
    if (!panel.querySelector('.pending-action-grid')) return;
    let records = commentCards.get(body);
    if (!records) { records = new Map(); commentCards.set(body, records); }
    // Record renderers may replace a tbody while leaving the modal body in place.
    for (const [control, record] of records) {
      if (!body.contains(record.source) || !body.contains(control)) {
        record.card.remove();
        records.delete(control);
      }
    }
    for (const control of body.querySelectorAll('input,textarea')) {
      if (records.has(control)) continue;
      const row = control.closest('tr');
      const nativeCard = control.closest('.claim-detail-approver-comments,.project-approval-comments-card,.leave-approval-comments');
      if (!nativeCard && (!row || !commentLabel(row.firstElementChild?.textContent))) continue;
      const card = nativeCard || document.createElement('div');
      const visibilitySource = nativeCard ? nativeCard.parentElement : row.parentElement;
      if (!nativeCard) {
        const label = document.createElement('label');
        if (control.id) label.htmlFor = control.id;
        else label.append(control);
        card.append(label);
        if (control.id) card.append(control);
        addClass(row, 'detail-popout-comment-source');
      }
      const label = card.querySelector('label');
      // Keep anonymous controls implicitly labelled without changing their IDs.
      if (label?.contains(control)) {
        label.prepend(document.createTextNode('Approver Action Comments'));
      } else if (label) label.textContent = 'Approver Action Comments';
      control.placeholder = 'Add approver action comments (optional)...';
      addClass(control, 'detail-popout-comment-control');
      addClass(card, 'detail-popout-comments');
      records.set(control, { card, source: nativeCard || row, visibilitySource });
      body.append(card);
    }
    const flowLayout = /^(flex|grid|inline-flex|inline-grid)$/.test(getComputedStyle(body).display);
    for (const record of records.values()) {
      let shown = true;
      for (let node = record.visibilitySource; node && node !== body; node = node.parentElement) {
        if (node.hidden || getComputedStyle(node).display === 'none') { shown = false; break; }
      }
      if (record.card.hidden === shown) record.card.hidden = !shown;
      const margin = flowLayout ? '0px' : '12px';
      if (record.card.style.getPropertyValue('--detail-comments-margin') !== margin) record.card.style.setProperty('--detail-comments-margin', margin);
    }
    const cards = [...records.values()].map(record => record.card);
    const tail = [...body.children].slice(-cards.length);
    if (!cards.every((card, index) => tail[index] === card)) body.append(...cards);
  }

  function normalize(overlay, selector, closeFunction) {
    const panel = overlay.querySelector(selector);
    const title = panel?.querySelector('h1,h2,h3');
    if (!panel || !title) return;
    const header = directChild(title, panel);
    const body = [...panel.children].find(node => node !== header && !node.matches('style,script,footer,[class*="handle"]') && !node.querySelector('.pending-action-grid'));
    if (!header || !body) return;
    addClass(overlay, 'detail-popout-overlay');
    addClass(panel, 'detail-popout-panel');
    addClass(body, 'detail-popout-body');
    normalizeHeader(header, title);
    normalizeFields(body);
    normalizeAttachments(body);
    normalizeFields(body);
    normalizeActions(panel, body, closeFunction);
    normalizeComments(panel, body);
    for (const node of panel.children) if (node !== header && /handle/i.test(node.className)) addClass(node, 'detail-popout-decoration');
  }

  function init() {
    for (const close of document.querySelectorAll('.detail-popout-close')) normalizeCloseButton(close);
    for (const [id, selector, closeFunction] of definitions) {
      const overlay = document.getElementById(id);
      if (!overlay) continue;
      if (overlay.classList.contains('attendance-history-form-overlay')) continue;
      const options = { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style','hidden'] };
      const update = () => {
        observer.disconnect();
        normalize(overlay, selector, closeFunction);
        observer.observe(overlay, options);
      };
      const observer = new MutationObserver(update);
      update();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
