document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const labels = { 'guest-visit': 'Guest Visit', 'letter-request': 'Letter Request', 'inventory-request': 'Inventory Request' };
  const statuses = { submitted: ['Submitted', 'fa-paper-plane'], resubmit: ['Resubmit', 'fa-rotate-right'], approved: ['Approved', 'fa-check'], rejected: ['Rejected', 'fa-xmark'] };
  const requested = new URLSearchParams(location.search).get('category');
  let kind = labels[requested] ? requested : 'guest-visit';
  const emptyFilter = () => ({ from: '', to: '', status: '' });
  const filters = { 'guest-visit': emptyFilter(), 'letter-request': emptyFilter(), 'inventory-request': emptyFilter() };
  let records = [];
  let modal = null;
  let opener = null;
  let inerted = [];
  const date = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function statusPill(status) {
    const [label, icon] = statuses[status];
    const pill = node('span', 'status-pill ' + status);
    const glyph = node('i', 'fa-solid ' + icon);
    glyph.setAttribute('aria-hidden', 'true');
    pill.append(glyph, document.createTextNode(label));
    return pill;
  }
  function render() {
    try {
      records = window.WorkplaceHistoryStore.list();
      $('historyLoadError').hidden = true;
    } catch {
      records = [];
      $('historyLoadError').textContent = 'Unable to read saved History. Please try again.';
      $('historyLoadError').hidden = false;
    }
    document.querySelectorAll('[data-history-kind]').forEach(button => {
      const active = button.dataset.historyKind === kind;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const f = filters[kind];
    const rows = records.filter(row => row.kind === kind && (!f.from || row.date >= f.from) && (!f.to || row.date <= f.to) && (!f.status || row.status === f.status));
    $('historyCategoryTitle').textContent = labels[kind] + ' History';
    $('historyRecordCount').textContent = String(rows.length);
    const summary = [f.from ? 'From ' + date(f.from) : '', f.to ? 'To ' + date(f.to) : '', f.status ? statuses[f.status][0] : ''].filter(Boolean);
    $('historyFilterSummary').textContent = summary.join(' / ') || 'All ' + labels[kind];
    $('historyEmptyState').hidden = !!rows.length || !$('historyLoadError').hidden;
    $('historyEmptyDescription').textContent = summary.length ? 'Try another filter.' : 'Saved ' + labels[kind] + ' requests will appear here.';
    const list = $('workplaceHistoryList');
    list.replaceChildren();
    for (const row of rows) {
      const card = node('button', 'history-card-item');
      card.type = 'button';
      card.dataset.recordId = row.id;
      card.dataset.status = row.status;
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-controls', 'historyDetailsModal');
      const header = node('span', 'history-card-header');
      const heading = node('span', 'history-card-heading');
      heading.append(node('span', 'history-card-title', row.title));
      header.append(heading, statusPill(row.status));
      const details = node('span', 'history-card-details');
      const summaryLabels = kind === 'guest-visit' ? ['Time', 'Total Guest'] : kind === 'letter-request' ? ['Description', 'Reason'] : ['Quantity', 'Required By'];
      const summaryFields = [['Date', date(row.date)], ...row.fields.filter(([label]) => summaryLabels.includes(label))];
      for (const [label, value] of summaryFields) {
        const line = node('span', 'history-card-row');
        line.append(node('span', '', label + ' :'), node('strong', '', value || '—'));
        details.append(line);
      }
      card.append(header, details);
      list.append(card);
    }
  }
  function openModal(id, focusId) {
    modal = $(id);
    opener = document.activeElement;
    inerted = [...document.querySelector('.phone-container').children].filter(child => child !== modal && !child.inert);
    inerted.forEach(child => { child.inert = true; });
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    $(focusId).focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    inerted.forEach(child => { child.inert = false; });
    inerted = [];
    modal = null;
    if (opener?.isConnected) opener.focus();
  }
  function fillFilter() {
    const f = filters[kind];
    $('historyFilterTitle').textContent = 'Filter';
    $('historyDateFrom').value = f.from;
    $('historyDateTo').value = f.to;
    $('historyStatus').value = f.status;
    $('historyFilterError').hidden = true;
  }
  function showDetails(row) {
    $('historyDetailTitle').textContent = labels[row.kind] + ' Details';
    const body = $('historyDetailBody');
    body.replaceChildren();
    const table = node('table', 'history-detail-table');
    const tbody = table.createTBody();
    for (const [label, value] of [['Date', date(row.date)], ['Status', row.status], ...row.fields]) {
      const tr = tbody.insertRow();
      const th = node('th', '', label); th.scope = 'row'; tr.append(th);
      const cell = tr.insertCell();
      if (label === 'Status') cell.append(statusPill(value));
      else if (label.startsWith('Attendee ') && value.includes('\n#')) {
        const [name, empNo, description] = value.split('\n');
        cell.append(node('span', 'history-employee-name', name), node('span', 'history-employee-id', empNo), document.createTextNode(description || ''));
      } else cell.textContent = value || '—';
    }
    body.append(table);
    openModal('historyDetailsModal', 'closeHistoryDetails');
  }
  document.querySelectorAll('[data-history-kind]').forEach(button => button.addEventListener('click', () => {
    kind = button.dataset.historyKind;
    const url = new URL(location.href);
    url.searchParams.set('category', kind);
    history.replaceState(null, '', url);
    render();
  }));
  $('workplaceHistoryList').addEventListener('click', event => {
    const card = event.target.closest('[data-record-id]');
    const record = card && records.find(row => row.id === card.dataset.recordId);
    if (record) showDetails(record);
  });
  $('historyFilterTrigger').addEventListener('click', () => { fillFilter(); openModal('historyFilterModal', 'closeHistoryFilter'); });
  $('resetHistoryFilter').addEventListener('click', () => { filters[kind] = emptyFilter(); fillFilter(); render(); });
  $('historyFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    const from = $('historyDateFrom').value, to = $('historyDateTo').value;
    if (from && to && from > to) {
      $('historyFilterError').textContent = 'End Date must be on or after Start Date.';
      $('historyFilterError').hidden = false;
      $('historyDateTo').focus();
      return;
    }
    filters[kind] = { from, to, status: $('historyStatus').value };
    render();
    closeModal();
  });
  $('closeHistoryFilter').addEventListener('click', closeModal);
  $('closeHistoryDetails').addEventListener('click', closeModal);
  [$('historyFilterModal'), $('historyDetailsModal')].forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); }));
  document.addEventListener('keydown', event => {
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('input,select,button,[tabindex="0"]')].filter(control => !control.disabled && control.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', render);
  render();
});
