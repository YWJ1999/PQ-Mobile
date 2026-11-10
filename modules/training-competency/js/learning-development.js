(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const source = window.TRAINING_LEARNING_DEVELOPMENT;
  const employee = window.TRAINING_COMPETENCY_INDIVIDUAL.employee;
  const page = document.body.dataset.ldPage;
  const params = new URLSearchParams(location.search);
  const storageKey = 'peoplehcm.learningDevelopment.records.v1';
  const activities = structuredClone(source.activities);
  const selected = activities.find(activity => activity.id === params.get('activity'));
  const addMode = page === 'edit' && params.get('mode') === 'add';
  let modalTrigger = null;
  let inerted = [];
  let storageError = '';

  const number = value => new Intl.NumberFormat('en-MY', { maximumFractionDigits: 2 }).format(value);
  const date = value => new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function url(file, activityId, recordId, mode) {
    const query = new URLSearchParams({ theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' });
    if (activityId) query.set('activity', activityId);
    if (recordId) query.set('record', recordId);
    if (mode) query.set('mode', mode);
    return `${file}?${query}`;
  }

  function progress(activity) {
    const latest = [...activity.records].sort((left, right) => left.end.localeCompare(right.end) || left.start.localeCompare(right.start)).at(-1);
    return latest?.progress ?? 0;
  }

  function validRecord(record, activity) {
    return record && typeof record.id === 'string' && validDate(record.start) && validDate(record.end)
      && record.start >= source.periodStart && record.end >= record.start && record.end <= activity.deadline
      && Number.isFinite(record.progress) && record.progress >= 0 && record.progress <= 100
      && Number.isFinite(record.hours) && record.hours >= 0
      && typeof record.remarks === 'string' && record.remarks.length <= 2000;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved !== null) {
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid saved records');
      activities.forEach(activity => {
        if (!Object.hasOwn(saved, activity.id)) return;
        const records = saved[activity.id];
        if (!Array.isArray(records) || !records.every(record => validRecord(record, activity)) || new Set(records.map(record => record.id)).size !== records.length) throw new Error('Invalid saved records');
      });
      activities.forEach(activity => {
        if (Object.hasOwn(saved, activity.id)) activity.records = saved[activity.id];
      });
    }
  } catch {
    storageError = 'Saved progress could not be loaded. Please check browser storage and reload this page before saving changes.';
  }
  const activeRecord = selected?.records.find(record => record.id === params.get('record'));

  function showStorageError(message) {
    $('ldStorageError').textContent = message;
    $('ldStorageError').hidden = !message;
  }

  function persist(activity, records) {
    if (storageError) {
      showStorageError(storageError);
      $('ldStorageError').scrollIntoView({ block: 'nearest' });
      return false;
    }
    try {
      const saved = Object.fromEntries(activities.map(item => [item.id, item.id === activity.id ? records : item.records]));
      localStorage.setItem(storageKey, JSON.stringify(saved));
      activity.records = records;
      showStorageError('');
      return true;
    } catch {
      showStorageError('Unable to save progress. Your changes have not been saved. Please check browser storage and try again.');
      $('ldStorageError').scrollIntoView({ block: 'nearest' });
      return false;
    }
  }

  function summary(container, rows) {
    $(container).replaceChildren(...rows.map(([label, value, field]) => {
      const row = node('div', 'ld-summary-field');
      row.dataset.field = field;
      const isRecordCount = field === 'total-records';
      row.classList.toggle('record-summary-metric', isRecordCount);
      row.append(node('span', isRecordCount ? 'record-summary-label' : '', label), node('strong', isRecordCount ? 'record-summary-value' : '', value));
      return row;
    }));
  }

  function contextRows(activity) {
    return [
      ['Activity', activity.activity, 'activity'],
      ['Deadline', date(activity.deadline), 'deadline'],
      ['Budget Hours', number(activity.budgetHours), 'budget-hours'],
      ['Review Due', date(activity.reviewDue), 'review-due'],
      ['Progress%', `${number(progress(activity))}%`, 'progress']
    ];
  }

  function cardDetails(rows) {
    const list = node('dl', 'ld-card-details');
    rows.forEach(([label, value, field]) => {
      const detail = node('div', 'ld-card-detail');
      detail.dataset.field = field;
      detail.append(node('dt', '', label), node('dd', '', value));
      list.append(detail);
    });
    return list;
  }

  function header(activity) {
    const heading = node('header', 'ld-card-header');
    heading.append(node('h2', '', activity.activity));
    return heading;
  }

  function action(label, className, href) {
    const button = node(href ? 'a' : 'button', className);
    if (href) button.href = href;
    else button.type = 'button';
    button.append(node('span', '', label));
    return button;
  }

  function renderPlan() {
    const average = activities.length ? activities.reduce((total, activity) => total + progress(activity), 0) / activities.length : 0;
    summary('ldPlanSummary', [
      ['Employee Name', employee.name, 'employee-name'], ['Position', employee.position, 'position'],
      ['Period', source.period, 'period'], ['Description', source.description, 'description'],
      ['Total Records', activities.length, 'total-records'], ['Average Progress%', `${number(average)}%`, 'average-progress']
    ]);
    $('ldActivities').replaceChildren(...activities.map(activity => {
      const card = node('article', 'ld-card ld-activity-card');
      card.dataset.activityId = activity.id;
      card.append(header(activity), cardDetails([
        ['Budget Hours', number(activity.budgetHours), 'budget-hours'], ['Deadline', date(activity.deadline), 'deadline'],
        ['Review Month(s)', activity.reviewMonths, 'review-months'], ['Progress%', `${number(progress(activity))}%`, 'progress']
      ]));
      const footer = node('footer', 'ld-card-footer');
      const update = action('Update', 'ld-primary ld-update', url('learning-development-update.html', activity.id));
      update.setAttribute('aria-label', `Update ${activity.activity}`);
      footer.append(update);
      card.append(footer);
      return card;
    }));
  }

  function openDetails(record, trigger) {
    $('ldDetailsRows').replaceChildren(...[
      ['Start Date', date(record.start)], ['End Date', date(record.end)], ['Progress', `${number(record.progress)}%`],
      ['Hours', number(record.hours)], ['Remarks', record.remarks || '—']
    ].map(([label, value]) => {
      const row = node('tr');
      const heading = node('th', 'detail-popout-label', label);
      heading.scope = 'row';
      row.append(heading, node('td', 'detail-popout-value', value));
      return row;
    }));
    const overlay = $('ldDetailsOverlay');
    modalTrigger = trigger;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('.detail-popout-body').scrollTop = 0;
    inerted = [...overlay.parentElement.children, document.querySelector('preview-top-bar')].filter(element => element && element !== overlay).map(element => ({ element, previous: element.inert }));
    inerted.forEach(({ element }) => { element.inert = true; });
    $('ldDetailsClose').focus({ preventScroll: true });
  }

  function closeDetails() {
    $('ldDetailsOverlay').hidden = true;
    $('ldDetailsOverlay').setAttribute('aria-hidden', 'true');
    inerted.forEach(({ element, previous }) => { element.inert = previous; });
    inerted = [];
    modalTrigger?.focus({ preventScroll: true });
    modalTrigger = null;
  }

  function renderProgress() {
    summary('ldProgressSummary', [...contextRows(selected),
      ['Total Records', selected.records.length, 'total-records'],
      ['Total Used Hours', number(selected.records.reduce((total, record) => total + record.hours, 0)), 'total-used-hours']
    ]);
    $('ldRecordsEmpty').hidden = selected.records.length > 0;
    $('ldRecords').replaceChildren(...selected.records.map(record => {
      const card = node('article', 'ld-card ld-record-card');
      card.dataset.recordId = record.id;
      const open = node('button', 'ld-record-open');
      open.type = 'button';
      open.setAttribute('aria-label', `View ${selected.activity} progress from ${date(record.start)}`);
      open.setAttribute('aria-haspopup', 'dialog');
      open.setAttribute('aria-controls', 'ldDetailsOverlay');
      const heading = header(selected);
      open.append(heading, cardDetails([
        ['Start Date', date(record.start), 'start-date'], ['End Date', date(record.end), 'end-date'],
        ['Hours Used', number(record.hours), 'hours-used'], ['Progress%', `${number(record.progress)}%`, 'progress']
      ]));
      open.addEventListener('click', () => openDetails(record, open));
      const footer = node('footer', 'ld-card-footer');
      const edit = action('Edit', 'ld-record-action ld-edit', url('learning-development-edit.html', selected.id, record.id));
      edit.setAttribute('aria-label', `Edit progress from ${date(record.start)}`);
      const remove = action('Delete', 'ld-record-action ld-delete');
      remove.setAttribute('aria-label', `Delete progress from ${date(record.start)}`);
      remove.addEventListener('click', () => {
        if (!persist(selected, selected.records.filter(item => item.id !== record.id))) return;
        renderProgress();
        const target = $('ldRecords').querySelector('.ld-delete') || $('ldBack');
        target.focus();
        if (typeof showToast === 'function') showToast('Progress record deleted');
      });
      footer.append(edit, remove);
      card.append(open, footer);
      return card;
    }));
  }

  function formError(message, field) {
    $('ldEditError').textContent = message;
    $('ldEditError').hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }

  function renderEdit() {
    summary('ldEditSummary', contextRows(selected));
    const initial = addMode ? { start: '', end: '', progress: '', hours: '', remarks: '' } : activeRecord;
    if (addMode) {
      document.title = 'PeopleHCM - Add L&D Progress';
      $('ldEditPageTitle').textContent = 'Add L&D Progress';
      $('ldEditFormTitle').textContent = 'Progress Details';
      $('ldSaveLabel').textContent = 'Add';
    }
    [['ldStartInput', initial.start], ['ldEndInput', initial.end], ['ldProgressInput', initial.progress], ['ldHoursInput', initial.hours], ['ldRemarksInput', initial.remarks]].forEach(([id, value]) => { $(id).value = value; });
    ['ldStartInput', 'ldEndInput'].forEach(id => { $(id).min = source.periodStart; $(id).max = selected.deadline; });
    $('ldEditForm').addEventListener('input', event => {
      event.target.removeAttribute('aria-invalid');
      $('ldEditError').hidden = true;
    });
    $('ldEditForm').addEventListener('submit', event => {
      event.preventDefault();
      const record = {
        id: addMode ? (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`) : activeRecord.id,
        start: $('ldStartInput').value, end: $('ldEndInput').value,
        progress: $('ldProgressInput').value === '' ? NaN : Number($('ldProgressInput').value),
        hours: $('ldHoursInput').value === '' ? NaN : Number($('ldHoursInput').value), remarks: $('ldRemarksInput').value.trim()
      };
      if (!validDate(record.start)) return formError('Start Date is required.', $('ldStartInput'));
      if (!validDate(record.end)) return formError('End Date is required.', $('ldEndInput'));
      if (record.end < record.start) return formError('End Date must be on or after Start Date.', $('ldEndInput'));
      if (record.start < source.periodStart) return formError('Start Date must be within the plan period.', $('ldStartInput'));
      if (record.end > selected.deadline) return formError('End Date must be on or before the activity deadline.', $('ldEndInput'));
      if (!Number.isFinite(record.progress) || record.progress < 0 || record.progress > 100) return formError('Progress must be between 0 and 100%.', $('ldProgressInput'));
      if (!Number.isFinite(record.hours) || record.hours < 0) return formError('Hours must be 0 or more.', $('ldHoursInput'));
      if (record.remarks.length > 2000) return formError('Remarks must be 2,000 characters or fewer.', $('ldRemarksInput'));
      const records = addMode ? [...selected.records, record] : selected.records.map(item => item.id === activeRecord.id ? record : item);
      if (!persist(selected, records)) return;
      location.href = url('learning-development-update.html', selected.id);
    });
  }

  function syncLinks() {
    $('ldBack').href = page === 'plan' ? `../index.html?scope=individual&theme=${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`
      : page === 'edit' && selected ? url('learning-development-update.html', selected.id) : url('learning-development-plan.html');
    $('ldBack').setAttribute('aria-label', page === 'plan' ? 'Back to Training and Competency' : page === 'edit' && selected ? 'Back to L&D Progress' : 'Back to L&D Plan');
    $('ldUnavailableBack').href = url('learning-development-plan.html');
    if (page === 'edit') $('ldCancel').href = selected ? url('learning-development-update.html', selected.id) : url('learning-development-plan.html');
    if (page === 'plan') document.querySelectorAll('.ld-update').forEach((link, index) => { link.href = url('learning-development-update.html', activities[index].id); });
    if (page === 'update' && selected) {
      $('ldAddProgress').href = url('learning-development-edit.html', selected.id, null, 'add');
      document.querySelectorAll('.ld-edit').forEach((link, index) => { link.href = url('learning-development-edit.html', selected.id, selected.records[index].id); });
    }
  }

  showStorageError(storageError);
  if (page !== 'plan' && (!selected || page === 'edit' && !addMode && !activeRecord)) {
    $('ldUnavailable').hidden = false;
    ['ldProgressSummary', 'ldRecordsToolbar', 'ldRecords', 'ldEditSummary', 'ldEditForm'].forEach(id => { if ($(id)) $(id).hidden = true; });
  } else if (page === 'plan') renderPlan();
  else if (page === 'edit') renderEdit();
  else renderProgress();
  syncLinks();
  new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (page === 'update') {
    $('ldDetailsClose').addEventListener('click', closeDetails);
    $('ldDetailsOverlay').addEventListener('click', event => { if (event.target === event.currentTarget) closeDetails(); });
    document.addEventListener('keydown', event => {
      if ($('ldDetailsOverlay').hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeDetails(); }
      if (event.key !== 'Tab') return;
      const elements = [...$('ldDetailsOverlay').querySelectorAll('button,[tabindex="0"]')];
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
    });
  }
})();
