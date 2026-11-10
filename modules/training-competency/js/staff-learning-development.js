(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const source = window.TRAINING_STAFF_LEARNING_DEVELOPMENT;
  const page = document.body.dataset.sldPage;
  const params = new URLSearchParams(location.search);
  const storageKey = 'peoplehcm.staffLearningDevelopment.records.v1';
  const activities = structuredClone(source.activities);
  const selected = activities.find(activity => activity.id === params.get('activity'));
  let storageError = '';

  const number = value => new Intl.NumberFormat('en-MY', { maximumFractionDigits: 2 }).format(value);
  const date = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function themedUrl(file, activityId, recordId) {
    const query = new URLSearchParams({ theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' });
    if (activityId) query.set('activity', activityId);
    if (recordId) query.set('record', recordId);
    return `${file}?${query}`;
  }

  function employeeId(value) {
    return `#${String(value || '').replace(/^#/, '')}`;
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
        if (!Array.isArray(records) || !records.every(record => validRecord(record, activity)) || new Set(records.map(record => record.id)).size !== records.length) {
          throw new Error('Invalid saved records');
        }
      });
      activities.forEach(activity => {
        if (Object.hasOwn(saved, activity.id)) activity.records = saved[activity.id];
      });
    }
  } catch {
    storageError = 'Saved progress could not be loaded. Please check browser storage and reload this page before saving changes.';
  }
  const requestedRecordId = params.get('record');
  const activeRecord = selected?.records.find(record => record.id === requestedRecordId);

  function showStorageError(message) {
    $('sldStorageError').textContent = message;
    $('sldStorageError').hidden = !message;
  }

  function persist(activity, records) {
    if (storageError) {
      showStorageError(storageError);
      $('sldStorageError').scrollIntoView({ block: 'nearest' });
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
      $('sldStorageError').scrollIntoView({ block: 'nearest' });
      return false;
    }
  }

  function summary(containerId, rows) {
    $(containerId).replaceChildren(...rows.map(([label, value, field]) => {
      const row = node('div', 'ld-summary-field');
      row.dataset.field = field;
      const isRecordCount = field === 'total-records';
      row.classList.toggle('record-summary-metric', isRecordCount);
      const strong = node('strong', isRecordCount ? 'record-summary-value' : '');
      if (field === 'employee') {
        strong.append(
          node('span', 'sld-employee-name', value.name),
          node('span', 'sld-employee-id', employeeId(value.empNo))
        );
      } else {
        strong.textContent = value;
      }
      row.append(node('span', isRecordCount ? 'record-summary-label' : '', label), strong);
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

  function cardHeader(activity) {
    const header = node('header', 'ld-card-header');
    header.append(node('h2', '', activity.activity));
    return header;
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

  function renderPlan() {
    const average = activities.length ? activities.reduce((total, activity) => total + progress(activity), 0) / activities.length : 0;
    summary('sldPlanSummary', [
      ['Employee', source.employee, 'employee'],
      ['Position', source.employee.position, 'position'],
      ['Period', source.period, 'period'],
      ['Description', source.description, 'description'],
      ['Total Records', activities.length, 'total-records'],
      ['Average Progress%', `${number(average)}%`, 'average-progress']
    ]);
    $('sldActivities').replaceChildren(...activities.map(activity => {
      const card = node('article', 'ld-card ld-activity-card sld-activity-card');
      card.dataset.activityId = activity.id;
      card.append(cardHeader(activity), cardDetails([
        ['Budget Hours', number(activity.budgetHours), 'budget-hours'],
        ['Deadline', date(activity.deadline), 'deadline'],
        ['Review Month(s)', number(activity.reviewMonths), 'review-months'],
        ['Progress%', `${number(progress(activity))}%`, 'progress']
      ]));
      const footer = node('footer', 'ld-card-footer');
      const update = node('a', 'ld-primary ld-update sld-update', 'Update');
      update.href = themedUrl('staff-learning-development-update.html', activity.id);
      update.setAttribute('aria-label', `Update ${activity.activity}`);
      footer.append(update);
      card.append(footer);
      return card;
    }));
  }

  function renderProgress() {
    summary('sldProgressSummary', [
      ...contextRows(selected),
      ['Total Records', selected.records.length, 'total-records'],
      ['Total Used Hours', number(selected.records.reduce((total, record) => total + record.hours, 0)), 'total-used-hours']
    ]);
    $('sldRecordsEmpty').hidden = selected.records.length > 0;
    $('sldRecords').replaceChildren(...selected.records.map(record => {
      const card = node('article', 'ld-card ld-record-card sld-record-card');
      card.dataset.recordId = record.id;
      card.append(cardHeader(selected), cardDetails([
        ['Start Date', date(record.start), 'start-date'],
        ['End Date', date(record.end), 'end-date'],
        ['Hours Used', number(record.hours), 'hours-used'],
        ['Progress%', `${number(record.progress)}%`, 'progress']
      ]));
      const footer = node('footer', 'ld-card-footer');
      const edit = node('a', 'ld-record-action sld-record-action sld-edit', 'Edit');
      edit.href = themedUrl('staff-learning-development-edit.html', selected.id, record.id);
      edit.setAttribute('aria-label', `Edit progress from ${date(record.start)}`);
      const remove = node('button', 'ld-record-action sld-record-action sld-delete', 'Delete');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Delete progress from ${date(record.start)}`);
      remove.addEventListener('click', () => {
        if (!persist(selected, selected.records.filter(item => item.id !== record.id))) return;
        renderProgress();
        ($('sldRecords').querySelector('.sld-delete') || $('sldAddProgress')).focus({ preventScroll: true });
        if (typeof showToast === 'function') showToast('Progress record deleted');
      });
      footer.append(edit, remove);
      card.append(footer);
      return card;
    }));
  }

  function formError(message, field) {
    $('sldEditError').textContent = message;
    $('sldEditError').hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }

  function renderEdit() {
    summary('sldEditSummary', contextRows(selected));
    const initial = activeRecord || { start: '', end: '', progress: '', hours: '', remarks: '' };
    if (activeRecord) {
      document.title = 'PeopleHCM - Edit L&D Progress';
      $('sldEditPageTitle').textContent = 'Edit L&D Progress';
      $('sldSaveLabel').textContent = 'Update';
    }
    [
      ['sldStartInput', initial.start],
      ['sldEndInput', initial.end],
      ['sldProgressInput', initial.progress],
      ['sldHoursInput', initial.hours],
      ['sldRemarksInput', initial.remarks]
    ].forEach(([id, value]) => { $(id).value = value; });
    ['sldStartInput', 'sldEndInput'].forEach(id => {
      $(id).min = source.periodStart;
      $(id).max = selected.deadline;
    });
    $('sldEditForm').addEventListener('input', event => {
      event.target.removeAttribute('aria-invalid');
      $('sldEditError').hidden = true;
    });
    $('sldEditForm').addEventListener('submit', event => {
      event.preventDefault();
      const record = {
        id: activeRecord?.id || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        start: $('sldStartInput').value,
        end: $('sldEndInput').value,
        progress: $('sldProgressInput').value === '' ? NaN : Number($('sldProgressInput').value),
        hours: $('sldHoursInput').value === '' ? NaN : Number($('sldHoursInput').value),
        remarks: $('sldRemarksInput').value.trim()
      };
      if (!validDate(record.start)) return formError('Start Date is required.', $('sldStartInput'));
      if (!validDate(record.end)) return formError('End Date is required.', $('sldEndInput'));
      if (record.end < record.start) return formError('End Date must be on or after Start Date.', $('sldEndInput'));
      if (record.start < source.periodStart) return formError('Start Date must be within the plan period.', $('sldStartInput'));
      if (record.end > selected.deadline) return formError('End Date must be on or before the activity deadline.', $('sldEndInput'));
      if (!Number.isFinite(record.progress) || record.progress < 0 || record.progress > 100) return formError('Progress must be between 0 and 100%.', $('sldProgressInput'));
      if (!Number.isFinite(record.hours) || record.hours < 0) return formError('Hours must be 0 or more.', $('sldHoursInput'));
      if (record.remarks.length > 2000) return formError('Remarks must be 2,000 characters or fewer.', $('sldRemarksInput'));
      const records = activeRecord
        ? selected.records.map(item => item.id === activeRecord.id ? record : item)
        : [...selected.records, record];
      if (!persist(selected, records)) return;
      location.href = themedUrl('staff-learning-development-update.html', selected.id);
    });
  }

  function syncLinks() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    if (page === 'plan') {
      $('sldBack').href = `../index.html?scope=team&theme=${theme}`;
      document.querySelectorAll('.sld-update').forEach(link => {
        link.href = themedUrl('staff-learning-development-update.html', link.closest('[data-activity-id]').dataset.activityId);
      });
    } else if (page === 'update') {
      $('sldBack').href = themedUrl('staff-learning-development-plan.html');
      if (selected) $('sldAddProgress').href = themedUrl('staff-learning-development-edit.html', selected.id);
    } else {
      $('sldBack').href = selected ? themedUrl('staff-learning-development-update.html', selected.id) : themedUrl('staff-learning-development-plan.html');
      $('sldCancel').href = selected ? themedUrl('staff-learning-development-update.html', selected.id) : themedUrl('staff-learning-development-plan.html');
    }
    $('sldUnavailableBack').href = themedUrl('staff-learning-development-plan.html');
  }

  showStorageError(storageError);
  if (page !== 'plan' && (!selected || page === 'edit' && requestedRecordId && !activeRecord)) {
    $('sldUnavailable').hidden = false;
    ['sldProgressSummary', 'sldRecordsToolbar', 'sldRecords', 'sldRecordsEmpty', 'sldEditSummary', 'sldEditForm'].forEach(id => {
      if ($(id)) $(id).hidden = true;
    });
  } else if (page === 'plan') {
    renderPlan();
  } else if (page === 'update') {
    renderProgress();
  } else {
    renderEdit();
  }

  syncLinks();
  new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
