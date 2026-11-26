(() => {
  const $ = id => document.getElementById(id);
  const source = Array.isArray(window.PERFORMANCE_INCIDENT_HIGHLIGHT_DATA) ? window.PERFORMANCE_INCIDENT_HIGHLIGHT_DATA : [];
  const employees = new Map(), actions = new Map();
  const form = $('staffIncidentForm');
  const params = new URLSearchParams(location.search), editMode = params.has('edit');
  const editingRecord = editMode ? window.StaffIncidentPreviewStore.all().find(record => record.reference === params.get('edit')) : null;
  let files = [];
  source.forEach(record => {
    const empNo = String(record.empNo ?? '').replace(/^#+/, '');
    if (empNo && !employees.has(empNo)) employees.set(empNo, { empNo, name: record.name || '', position: record.position || '' });
    if (record.incidentType) {
      if (!actions.has(record.incidentType)) actions.set(record.incidentType, new Set());
      if (record.incidentAction) actions.get(record.incidentType).add(record.incidentAction);
    }
  });
  function backUrl() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    if (!editMode) return `../index.html?scope=team&theme=${theme}`;
    const expected = new URL('history.html', location.href);
    let target = expected;
    try {
      const candidate = new URL(params.get('returnTo') || 'history.html', location.href);
      if (candidate.origin === expected.origin && candidate.protocol === expected.protocol && candidate.pathname === expected.pathname) target = candidate;
    } catch { /* Invalid return destinations use this module's History. */ }
    target.searchParams.set('theme', theme); return target.href;
  }
  function syncBack() {
    const url = backUrl();
    $('staffIncidentBack').href = url; $('staffIncidentCancel').href = url;
    $('staffIncidentBack').setAttribute('aria-label', editMode ? 'Back to History' : 'Back to Performance');
  }
  function clearFeedback() {
    $('staffIncidentError').hidden = true; $('staffIncidentError').textContent = '';
    $('staffIncidentStatus').hidden = true; $('staffIncidentStatus').textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  }
  function syncEmployee() {
    const employee = employees.get($('staffIncidentEmployee').value);
    $('staffIncidentName').value = employee?.name || ''; $('staffIncidentPosition').value = employee?.position || '';
  }
  function syncActions() {
    const select = $('staffIncidentActionType'), previous = select.value;
    const values = [...(actions.get($('staffIncidentType').value) || [])].sort();
    select.replaceChildren(new Option('Select Action Type', ''), ...values.map(value => new Option(value, value)));
    select.disabled = !values.length; select.value = values.includes(previous) ? previous : '';
  }
  function renderFiles() {
    const list = $('staffIncidentAttachments'); list.replaceChildren();
    files.forEach((file, index) => {
      const row = document.createElement('div'); row.className = 'form-attachment-item';
      const icon = document.createElement('i'); icon.className = 'form-attachment-file-icon'; icon.setAttribute('aria-hidden', 'true');
      const href = file instanceof File ? null : safeAttachmentUrl(file.href ?? file.url);
      const name = document.createElement(href ? 'a' : 'span'); name.className = 'form-attachment-file-name'; name.textContent = file.name; name.title = file.name;
      if (href) { name.href = href; name.download = file.name; name.target = '_blank'; name.rel = 'noopener noreferrer'; }
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'form-attachment-remove'; remove.dataset.removeFile = String(index); remove.setAttribute('aria-label', `Remove ${file.name}`);
      const close = document.createElement('i'); close.className = 'fa-solid fa-xmark'; close.setAttribute('aria-hidden', 'true'); remove.append(close);
      row.append(icon, name, remove); list.append(row);
    });
  }
  function safeAttachmentUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, location.href), assets = new URL('../../../assets/', location.href);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      if (location.protocol === 'file:' && url.protocol === 'file:' && url.pathname.startsWith(assets.pathname)) return url.href;
    } catch { /* Files without an available link remain attachment names. */ }
    return null;
  }
  function fileKey(file) { return [file.name, file.size, file.type, file.lastModified].join('\u0000'); }
  function validationError(message, field) {
    $('staffIncidentError').textContent = message; $('staffIncidentError').hidden = false; field.setAttribute('aria-invalid', 'true'); field.focus();
  }
  [...employees.values()].sort((a,b) => a.empNo.localeCompare(b.empNo)).forEach(employee => $('staffIncidentEmployee').add(new Option(`${formatEmployeeNumber(employee.empNo)} — ${employee.name}`, employee.empNo)));
  [...actions.keys()].sort().forEach(type => $('staffIncidentType').add(new Option(type, type)));
  $('staffIncidentEmployee').addEventListener('change', syncEmployee); $('staffIncidentType').addEventListener('change', syncActions);
  form.addEventListener('input', clearFeedback); form.addEventListener('change', clearFeedback);
  form.querySelectorAll('[data-file-picker]').forEach(button => button.addEventListener('click', () => $(button.dataset.filePicker).click()));
  for (const id of ['staffIncidentFiles', 'staffIncidentCamera']) $(id).addEventListener('change', event => {
    const keys = new Set(files.map(fileKey));
    for (const file of event.target.files || []) if (!keys.has(fileKey(file))) { files.push(file); keys.add(fileKey(file)); }
    event.target.value = ''; renderFiles();
  });
  $('staffIncidentAttachments').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-file]'); if (!button) return;
    const index = Number(button.dataset.removeFile); files.splice(index, 1); renderFiles(); clearFeedback();
    const remaining = $('staffIncidentAttachments').querySelectorAll('[data-remove-file]');
    (remaining[Math.min(index, remaining.length - 1)] || form.querySelector('[data-file-picker]')).focus({ preventScroll: true });
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); clearFeedback();
    if (editMode && !editingRecord) return validationError('Staff incident not found. Return to History.', $('staffIncidentEmployee'));
    const employee = employees.get($('staffIncidentEmployee').value), date = $('staffIncidentDate'), type = $('staffIncidentType'), action = $('staffIncidentActionType'), measure = $('staffIncidentValueMeasure');
    if (!employee) return validationError('Select an employee.', $('staffIncidentEmployee'));
    if (!date.value || !date.validity.valid) return validationError('Enter a valid incident date.', date);
    if (!actions.has(type.value)) return validationError('Select an incident type.', type);
    if (!actions.get(type.value).has(action.value)) return validationError('Select an action type.', action);
    if (!measure.value.trim() || !measure.validity.valid) return validationError('Enter a value or measure.', measure);
    const remarks = $('staffIncidentRemarks');
    if (!remarks.validity.valid) return validationError('Keep remarks within 5,000 characters.', remarks);
    syncEmployee();
    // Like the existing Staff Engagement form, this preview prepares a save without an API write.
    const record = { ...(editMode ? editingRecord : {}), ...employee, incidentDate: date.value, incidentType: type.value, incidentAction: action.value, measureValue: measure.value.trim(), remarks: remarks.value.trim(), attachments: [...files] };
    form.dispatchEvent(new CustomEvent('staffincident:ready', { bubbles: true, detail: record }));
    if (editMode) {
      try { window.StaffIncidentPreviewStore.update(editingRecord.reference, record); }
      catch { return validationError('Unable to save this preview change. Try again.', remarks); }
      location.assign(backUrl()); return;
    }
    $('staffIncidentStatus').textContent = 'Staff incident saved successfully.'; $('staffIncidentStatus').hidden = false;
  });
  if (editMode) {
    document.querySelector('h1').textContent = 'Edit Staff Incident'; document.title = 'PeopleHCM - Edit Staff Incident';
    if (editingRecord) {
      $('staffIncidentEmployee').value = String(editingRecord.empNo ?? '').replace(/^#+/, '');
      $('staffIncidentDate').value = String(editingRecord.incidentDate || '').slice(0, 10);
      $('staffIncidentType').value = editingRecord.incidentType || ''; syncActions();
      $('staffIncidentActionType').value = editingRecord.incidentAction || '';
      $('staffIncidentValueMeasure').value = editingRecord.measureValue ?? '';
      $('staffIncidentRemarks').value = editingRecord.remarks ?? '';
      files = Array.isArray(editingRecord.attachments) ? structuredClone(editingRecord.attachments).filter(Boolean).map(file => typeof file === 'string' ? { name: file } : file) : [];
      renderFiles();
    } else {
      $('staffIncidentSubmit').disabled = true;
      validationError('Staff incident not found. Return to History.', $('staffIncidentEmployee'));
    }
  }
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); syncBack(); syncEmployee(); syncActions();
})();
