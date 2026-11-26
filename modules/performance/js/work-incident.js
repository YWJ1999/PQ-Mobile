(() => {
  const $ = id => document.getElementById(id);
  const records = [...(window.PERFORMANCE_WORK_INCIDENTS || [])].sort((a, b) => b.incidentDate.localeCompare(a.incidentDate));
  let filters = { incidentType: '', startDate: '', endDate: '' };
  let activeOverlay = null;
  let returnFocus = null;
  let inerted = [];
  const formatDate = value => value ? value.slice(0, 10).split('-').reverse().join('/') : '—';
  const number = value => String(Number(Number(value).toFixed(2)));
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  };

  function syncBack() {
    $('workIncidentBack').href = `../index.html?scope=individual&theme=${getCurrentTheme() === 'light' ? 'light' : 'dark'}`;
  }

  function openOverlay(overlay, focus) {
    returnFocus = document.activeElement;
    activeOverlay = overlay;
    overlay.hidden = false;
    inerted = [...overlay.parentElement.children].filter(el => el !== overlay && !el.inert);
    inerted.forEach(el => { el.inert = true; });
    focus.focus({ preventScroll: true });
  }

  function closeOverlay() {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay = null;
    inerted.forEach(el => { el.inert = false; });
    inerted = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function render() {
    const visible = records.filter(record => (!filters.incidentType || record.incidentType === filters.incidentType)
      && (!filters.startDate || record.incidentDate >= filters.startDate)
      && (!filters.endDate || record.incidentDate <= filters.endDate));
    $('workIncidentRows').replaceChildren(...visible.map(record => {
      const row = node('tr');
      row.tabIndex = 0;
      row.setAttribute('aria-haspopup', 'dialog');
      row.setAttribute('aria-controls', 'workIncidentDetailsOverlay');
      row.setAttribute('aria-label', `${formatDate(record.incidentDate)}, ${record.incidentType}, ${number(record.point)} points. View details`);
      const points = node('td');
      points.append(node('span', 'work-incident-point', number(record.point)));
      row.append(node('td', '', formatDate(record.incidentDate)), node('td', '', record.incidentType), points);
      row.addEventListener('click', () => { row.focus({ preventScroll: true }); openDetails(record); });
      row.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openDetails(record);
      });
      return row;
    }));
    $('workIncidentTotalRecords').textContent = String(visible.length);
    $('workIncidentTotalPoints').textContent = number(visible.reduce((sum, record) => sum + Number(record.point), 0));
    $('workIncidentEmpty').hidden = visible.length > 0;
    const period = filters.startDate || filters.endDate ? `${filters.startDate ? formatDate(filters.startDate) : 'Any Start Date'} – ${filters.endDate ? formatDate(filters.endDate) : 'Any End Date'}` : 'All Dates';
    $('workIncidentFilterSummary').textContent = `${filters.incidentType || 'All Incident Types'} • ${period}`;
  }

  function detailRow(label, value, key) {
    const row = node('tr');
    const heading = node('th', 'detail-popout-label', label);
    heading.scope = 'row';
    const cell = node('td', 'detail-popout-value');
    if (key) cell.dataset.detail = key;
    if (value instanceof Node) cell.append(value);
    else cell.textContent = value === '' || value == null ? '—' : String(value);
    row.append(heading, cell);
    return row;
  }

  function openDetails(record) {
    const files = node('div');
    (record.attachments || []).forEach(file => {
      const link = node('a', 'work-incident-attachment');
      link.href = file.href;
      link.download = file.name;
      const icon = node('i', 'fa-solid fa-paperclip');
      icon.setAttribute('aria-hidden', 'true');
      link.append(icon, node('span', '', file.name));
      files.append(link);
    });
    if (!files.childElementCount) files.textContent = 'No attachment';
    $('workIncidentDetailsRows').replaceChildren(
      detailRow('Reference #', record.reference), detailRow('Name', record.name),
      detailRow('Emp No.', formatEmployeeNumber(record.empNo), 'empNo'),
      detailRow('Incident Date', formatDate(record.incidentDate)),
      detailRow('Created Date', `${formatDate(record.createdDate)} ${record.createdDate.slice(11, 16)}`.trim()),
      detailRow('Incident Type', record.incidentType), detailRow('Incident Action', record.incidentAction),
      detailRow('Measure Value', record.measureValue), detailRow('Merit', record.merit ? 'Yes' : 'No'),
      detailRow('Value', number(record.value)), detailRow('Remarks', record.remarks),
      detailRow('Is Closed?', record.isClosed ? 'Yes' : 'No'), detailRow('Attachment', files)
    );
    openOverlay($('workIncidentDetailsOverlay'), $('workIncidentDetailsClose'));
    $('workIncidentDetailsOverlay').querySelector('.detail-popout-body').scrollTop = 0;
  }

  function clearError() {
    $('workIncidentFilterError').hidden = true;
    $('workIncidentFilterStart').removeAttribute('aria-invalid');
    $('workIncidentFilterEnd').removeAttribute('aria-invalid');
  }
  $('workIncidentFilterTrigger').addEventListener('click', () => {
    $('workIncidentFilterType').value = filters.incidentType;
    $('workIncidentFilterStart').value = filters.startDate;
    $('workIncidentFilterEnd').value = filters.endDate;
    clearError();
    openOverlay($('workIncidentFilterOverlay'), $('workIncidentFilterType'));
  });
  $('workIncidentResetFilter').addEventListener('click', () => { $('workIncidentFilterForm').reset(); clearError(); });
  $('workIncidentFilterForm').addEventListener('input', clearError);
  $('workIncidentFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    const next = { incidentType: $('workIncidentFilterType').value, startDate: $('workIncidentFilterStart').value, endDate: $('workIncidentFilterEnd').value };
    if (next.startDate && next.endDate && next.startDate > next.endDate) {
      $('workIncidentFilterError').textContent = 'End date must be on or after start date.';
      $('workIncidentFilterError').hidden = false;
      $('workIncidentFilterEnd').setAttribute('aria-invalid', 'true');
      $('workIncidentFilterEnd').focus();
      return;
    }
    filters = next;
    render();
    closeOverlay();
  });
  [$('workIncidentCloseFilter'), $('workIncidentDetailsClose')].forEach(button => button.addEventListener('click', closeOverlay));
  [$('workIncidentFilterOverlay'), $('workIncidentDetailsOverlay')].forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(); }));
  document.addEventListener('keydown', event => {
    if (!activeOverlay) return;
    if (event.key === 'Escape') { event.preventDefault(); closeOverlay(); return; }
    if (event.key !== 'Tab') return;
    const items = [...activeOverlay.querySelectorAll('button, input, select, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('DOMContentLoaded', () => {
    [...new Set(records.map(record => record.incidentType))].sort().forEach(type => $('workIncidentFilterType').append(new Option(type, type)));
    syncBack();
    render();
  });
})();
