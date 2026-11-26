(() => {
  const $ = id => document.getElementById(id);
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  // Preview changes survive navigation in this tab without changing the source incidents.
  let records = window.StaffIncidentPreviewStore.all();
  const emptyFilters = () => ({ keyword: '', type: '', start: '', end: '', closed: '' });
  let filters = emptyFilters(), visible = [], modal = null, returnFocus = null, deleting = null;
  const actions = new Map();
  records.forEach(record => {
    if (!record.incidentType) return;
    if (!actions.has(record.incidentType)) actions.set(record.incidentType, new Set());
    if (record.incidentAction) actions.get(record.incidentType).add(record.incidentAction);
  });
  const text = value => value === null || value === undefined || value === '' ? '—' : String(value);
  const employeeId = record => formatEmployeeNumber(record.empNo) || '—';
  function dateValid(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function dateText(value) {
    const day = String(value || '').slice(0, 10);
    return dateValid(day) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`)) : text(value);
  }
  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function syncBack() { $('incidentHistoryBack').href = `../index.html?scope=team&theme=${theme()}`; }
  function syncHistoryUrl() {
    const url = new URL(location.href); url.searchParams.set('theme', theme());
    url.searchParams.delete('update');
    if (Object.values(filters).some(Boolean)) url.searchParams.set('filters', JSON.stringify(filters)); else url.searchParams.delete('filters');
    history.replaceState(history.state, '', url);
  }
  function matches(record) {
    const day = String(record.incidentDate || '').slice(0, 10);
    if (filters.type && record.incidentType !== filters.type) return false;
    if (filters.closed && record.isClosed !== (filters.closed === 'true')) return false;
    if ((filters.start || filters.end) && !dateValid(day)) return false;
    if (filters.start && day < filters.start || filters.end && day > filters.end) return false;
    return !filters.keyword || [record.reference, record.name, employeeId(record), record.incidentDate, dateText(record.incidentDate), record.incidentType, record.incidentAction, record.remarks].join(' ').toLowerCase().includes(formatEmployeeNumber(filters.keyword).toLowerCase());
  }
  function render() {
    visible = records.filter(matches).sort((a, b) => String(b.incidentDate || '').localeCompare(String(a.incidentDate || '')) || String(b.reference).localeCompare(String(a.reference)));
    const list = $('incidentHistoryList'); list.replaceChildren();
    visible.forEach(record => {
      const card = element('article', 'incident-history-card'); card.dataset.reference = record.reference;
      const header = element('div', 'incident-history-card-header');
      const identity = element('span', 'incident-history-identity');
      identity.append(element('strong', 'incident-history-name', employeeCardHeading.text(record.empNo, record.name)));
      const trigger = element('a', 'incident-history-details-trigger');
      trigger.href = HistoryRecordPage.href('incident', record.reference); trigger.dataset.historyLink = '';
      trigger.setAttribute('aria-label', `View incident details for ${text(record.name)} ${employeeId(record)}, ${dateText(record.incidentDate)}, ${text(record.incidentType)}`);
      trigger.append(identity); header.append(trigger);
      const details = element('dl', 'incident-history-details');
      [['Date', dateText(record.incidentDate)], ['Incident Type', record.incidentType], ['Action', record.incidentAction], ['Remarks', record.remarks]].forEach(([label, value]) => {
        const tile = element('div', 'incident-history-detail'); tile.append(element('dt', '', label), element('dd', '', text(value))); details.append(tile);
      });
      const buttons = element('div', 'incident-history-actions');
      [['edit', 'Edit'], ['delete', 'Delete']].forEach(([action, label]) => {
        const button = element('button', 'incident-history-button'); button.type = 'button'; button.dataset[action] = record.reference;
        button.setAttribute('aria-label', `${label} incident for ${text(record.name)}, ${dateText(record.incidentDate)}`);
        button.append(element('span', '', label)); buttons.append(button);
      });
      card.append(header, details, buttons); list.append(card);
    });
    $('incidentHistoryCount').textContent = String(visible.length);
    $('incidentHistoryEmpty').hidden = visible.length > 0;
    const summary = [];
    if (filters.keyword) summary.push(`“${filters.keyword}”`);
    if (filters.type) summary.push(filters.type);
    if (filters.start || filters.end) summary.push(`${filters.start ? dateText(filters.start) : 'Any Date'} – ${filters.end ? dateText(filters.end) : 'Any Date'}`);
    if (filters.closed) summary.push(`Is Closed: ${filters.closed === 'true' ? 'Yes' : 'No'}`);
    $('incidentHistoryFilterSummary').textContent = summary.join(' • ') || 'All Staff Incident Records';
    syncHistoryUrl();
  }
  function setBackgroundInert(value) {
    document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, body > preview-top-bar').forEach(node => { node.inert = value; });
  }
  function openModal(id, trigger, initialFocus) {
    returnFocus = trigger; modal = $(id); modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); setBackgroundInert(true);
    (initialFocus || modal.querySelector('input,button,select,textarea')).focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); modal = null; setBackgroundInert(false);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    else $('incidentHistoryFilterTrigger').focus({ preventScroll: true });
    returnFocus = null;
  }
  function detailRow(label, value, key) {
    const row = element('tr'), heading = element('th', 'detail-popout-label', label), cell = element('td', 'detail-popout-value');
    heading.scope = 'row'; if (key) cell.dataset.detail = key;
    if (value instanceof Node) cell.append(value); else cell.textContent = text(value);
    row.append(heading, cell); return row;
  }
  function safeAttachmentUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, location.href), assets = new URL('../../../assets/', location.href);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      if (location.protocol === 'file:' && url.protocol === 'file:' && url.pathname.startsWith(assets.pathname)) return url.href;
    } catch { /* An unavailable attachment remains a file name. */ }
    return null;
  }
  function attachmentList(record) {
    const list = element('div', 'incident-history-attachments');
    const files = Array.isArray(record.attachments) ? record.attachments.filter(Boolean) : [];
    if (!files.length) { list.textContent = 'No attachment'; return list; }
    files.forEach(file => {
      const name = typeof file === 'string' ? file : String(file.name || 'Attachment');
      const href = typeof file === 'string' ? null : safeAttachmentUrl(file.href ?? file.url);
      const item = element(href ? 'a' : 'span', 'incident-history-attachment');
      if (href) { item.href = href; item.download = name; item.target = '_blank'; item.rel = 'noopener noreferrer'; item.setAttribute('aria-label', `Download attachment ${name}`); }
      const icon = element('i', 'fa-solid fa-paperclip'); icon.setAttribute('aria-hidden', 'true');
      item.append(icon, element('span', '', name)); list.append(item);
    });
    return list;
  }
  function renderDetails(record) {
    const created = dateText(record.createdDate), time = /(?:T|\s)(\d{2}:\d{2})/.exec(String(record.createdDate || ''))?.[1];
    const yesNo = value => value === true ? 'Yes' : value === false ? 'No' : null;
    $('incidentHistoryDetailsRows').replaceChildren(
      detailRow('Reference #', record.reference), detailRow('Emp No.', employeeId(record), 'empNo'), detailRow('Name', record.name),
      detailRow('Incident Date', dateText(record.incidentDate)), detailRow('Created Date', time ? `${created} ${time}` : created),
      detailRow('Incident Type', record.incidentType), detailRow('Incident Action', record.incidentAction), detailRow('Measure Value', record.measureValue),
      detailRow('Merit', yesNo(record.merit)), detailRow('Value', record.value), detailRow('Remarks', record.remarks),
      detailRow('Is Closed?', yesNo(record.isClosed)), detailRow('Attachment', attachmentList(record))
    );
    return $('incidentHistoryDetailsModal');
  }
  const fields = { keyword: 'incidentHistoryKeyword', type: 'incidentHistoryType', start: 'incidentHistoryStart', end: 'incidentHistoryEnd' };
  function fillFilters(values) {
    Object.entries(fields).forEach(([key, id]) => { $(id).value = values[key]; });
    $('incidentHistoryClosed').checked = values.closed === 'true'; $('incidentHistoryFilterError').hidden = true;
  }
  for (const type of [...actions.keys()].sort()) {
    $('incidentHistoryType').add(new Option(type, type));
  }
  $('incidentHistoryFilterTrigger').addEventListener('click', event => {
    fillFilters(filters); openModal('incidentHistoryFilterModal', event.currentTarget, $('incidentHistoryKeyword'));
  });
  $('incidentHistoryResetFilter').addEventListener('click', () => fillFilters(emptyFilters()));
  $('incidentHistoryFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    const draft = { ...Object.fromEntries(Object.entries(fields).map(([key, id]) => [key, $(id).value.trim()])), closed: $('incidentHistoryClosed').checked ? 'true' : '' };
    if (draft.start && !dateValid(draft.start) || draft.end && !dateValid(draft.end) || draft.start && draft.end && draft.start > draft.end) {
      $('incidentHistoryFilterError').textContent = 'Enter valid dates with Start Date on or before End Date.'; $('incidentHistoryFilterError').hidden = false; $('incidentHistoryStart').focus(); return;
    }
    filters = draft; render(); closeModal();
  });
  $('incidentHistoryList').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
    if (edit) {
      const record = records.find(record => record.reference === edit.dataset.edit); if (!record) return;
      const url = new URL('staff-incident.html', location.href);
      url.searchParams.set('edit', record.reference); url.searchParams.set('theme', theme()); url.searchParams.set('returnTo', location.href);
      location.assign(url); return;
    }
    if (remove) {
      deleting = records.find(record => record.reference === remove.dataset.delete); if (!deleting) return;
      $('incidentHistoryDeleteMessage').textContent = `Delete the ${text(deleting.incidentType)} incident for ${text(deleting.name)} (${employeeId(deleting)}) dated ${dateText(deleting.incidentDate)}?`;
      $('incidentHistoryDeleteError').hidden = true;
      openModal('incidentHistoryDeleteModal', remove, $('incidentHistoryDeleteCancel')); return;
    }
    const card = event.target.closest('.incident-history-card'); if (!card) return;
    const record = records.find(record => record.reference === card.dataset.reference);
    if (record && !event.target.closest('[data-history-link]')) HistoryRecordPage.open('incident', record.reference, card.querySelector('.incident-history-details-trigger'));
  });
  $('incidentHistoryDeleteConfirm').addEventListener('click', () => {
    if (!deleting) return;
    try { window.StaffIncidentPreviewStore.remove(deleting.reference); }
    catch { $('incidentHistoryDeleteError').textContent = 'Unable to save this preview change. Try again.'; $('incidentHistoryDeleteError').hidden = false; return; }
    closeModal(); records = window.StaffIncidentPreviewStore.all(); deleting = null; render();
    ($('incidentHistoryList').querySelector('[data-delete]') || $('incidentHistoryFilterTrigger')).focus({ preventScroll: true });
    $('incidentHistoryStatus').textContent = 'Incident deleted from this preview.';
  });
  document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', closeModal));
  document.querySelectorAll('.claim-filter-sheet').forEach(sheet => sheet.addEventListener('click', event => { if (event.target === sheet) closeModal(); }));
  document.addEventListener('keydown', event => {
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(node => !node.disabled && node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  const params = new URLSearchParams(location.search);
  try {
    const restored = JSON.parse(params.get('filters') || '{}');
    if (restored && typeof restored === 'object' && !Array.isArray(restored)) {
      for (const key of Object.keys(fields)) if (typeof restored[key] === 'string') filters[key] = restored[key].trim();
      filters.keyword = filters.keyword.slice(0, 200);
      if (!actions.has(filters.type)) filters.type = '';
      if (filters.start && !dateValid(filters.start) || filters.end && !dateValid(filters.end) || filters.start && filters.end && filters.start > filters.end) { filters.start = ''; filters.end = ''; }
      filters.closed = restored.closed === 'true' ? 'true' : '';
    }
  } catch { /* An invalid return filter opens the unfiltered History. */ }
  new MutationObserver(() => { syncBack(); syncHistoryUrl(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  syncBack(); render();
  HistoryRecordPage.register((kind, id) => {
    const record = kind === 'incident' && records.find(row => row.reference === id);
    if (record) return renderDetails(record);
  });
})();
