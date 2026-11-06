document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const form = $('bookingForm');
  if (!form) return;
  const store = window.BookResourceStore;
  const list = $('bookingRecords');
  const editor = $('bookingEditor');
  const add = $('bookingAdd');
  const detailsDialog = $('bookingDetailsDialog');
  const detailsContent = $('bookingDetailsContent');
  let busy = false;
  let detailsTrigger = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function feedback(message, error = false, formError = false) {
    const element = $(formError ? 'bookingFormFeedback' : 'bookingFeedback');
    element.textContent = message;
    element.hidden = !message;
    element.classList.toggle('is-error', error);
  }
  function clearFormError() {
    $('bookingFormFeedback').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  }
  function toggleEditor(open) {
    editor.hidden = !open;
    $('bookingListView').hidden = open;
    add.setAttribute('aria-expanded', String(open));
    document.querySelector('.admin-back').setAttribute('aria-label', open ? 'Back to Current Records' : 'Back to Workplace');
    document.querySelector('.admin-content').scrollTop = 0;
    if (open) {
      $('bookingDate').focus({ preventScroll: true });
      editor.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else add.focus({ preventScroll: true });
  }
  function row(details, label, value) {
    if (!value) return;
    const line = node('div', 'booking-card-row');
    line.append(node('dt', '', label), node('dd', '', value));
    details.append(line);
  }
  function formatDate(value) {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function detailRow(label, value) {
    const line = node('tr', '');
    line.append(node('td', 'detail-popout-label', label), node('td', 'detail-popout-value', value || '—'));
    detailsContent.append(line);
  }
  function closeDetails() {
    if (detailsDialog.hidden) return;
    detailsDialog.hidden = true;
    detailsDialog.setAttribute('aria-hidden', 'true');
    if (detailsTrigger?.isConnected) detailsTrigger.focus({ preventScroll: true });
    detailsTrigger = null;
  }
  function openDetails(id, trigger) {
    try {
      const record = store.list().find(item => item.id === id);
      if (!record) throw new Error('Booking no longer exists.');
      const resource = store.resources.find(item => item.id === record.resource);
      const task = store.tasks.find(item => item.id === record.task);
      detailsContent.replaceChildren();
      [
        ['References', record.meetingRef],
        ['Emp #', '#' + record.employee.empNo.replace(/^#+/, '')],
        ['Name', record.employee.name],
        ['Booking Date', formatDate(record.date)],
        ['Start', record.startTime],
        ['End', record.endTime],
        ['Meeting Room #', resource?.roomNo],
        ['Resource', resource?.name],
        ['Task', task?.name],
        ['Status', record.status === 'plan' ? 'Plan' : 'Confirmed'],
        ['Purpose', record.purpose],
        ['Remark', record.remarks]
      ].forEach(([label, value]) => detailRow(label, value));
      detailsTrigger = trigger;
      detailsDialog.hidden = false;
      detailsDialog.setAttribute('aria-hidden', 'false');
      $('bookingDetailsClose').focus({ preventScroll: true });
    } catch {
      feedback('Unable to open this booking. Please refresh and try again.', true);
    }
  }
  function action(card, label, actionName) {
    const button = node('button', 'booking-card-action booking-' + actionName + ' history-submit-btn', label);
    button.type = 'button';
    button.dataset.bookingAction = actionName;
    button.setAttribute('aria-label', `${label} ${store.resources.find(resource => resource.id === card.resource).name} booking on ${card.date}, ${card.startTime} to ${card.endTime}`);
    return button;
  }
  function render() {
    try {
      const records = store.list();
      list.replaceChildren();
      $('bookingRecordCount').textContent = records.length;
      $('bookingEmpty').hidden = records.length !== 0;
      for (const record of records) {
        const planned = record.status === 'plan';
        const card = node('article', 'history-card-item');
        card.dataset.recordId = record.id;
        card.dataset.bookingStatus = record.status;
        card.dataset.status = planned ? 'draft' : 'approved';
        const summary = node('div', 'booking-card-summary');
        summary.tabIndex = 0;
        summary.setAttribute('role', 'button');
        summary.setAttribute('aria-label', 'View details for ' + store.resources.find(resource => resource.id === record.resource).name);
        summary.setAttribute('aria-haspopup', 'dialog');
        summary.setAttribute('aria-controls', 'bookingDetailsDialog');
        const header = node('div', 'history-card-header');
        const heading = node('div', 'history-card-heading');
        heading.append(node('h3', 'history-card-title', store.resources.find(resource => resource.id === record.resource).name));
        const badge = node('span', 'status-pill ' + (planned ? 'draft' : 'approved'));
        const statusIcon = node('i', 'fa-solid ' + (planned ? 'fa-floppy-disk' : 'fa-circle-check'));
        statusIcon.setAttribute('aria-hidden', 'true');
        badge.append(statusIcon, node('span', '', planned ? 'Plan' : 'Confirmed'));
        header.append(heading, badge);
        const details = node('dl', 'history-card-details booking-card-rows');
        row(details, 'Booking Date', formatDate(record.date));
        row(details, 'Time', `${record.startTime} – ${record.endTime}`);
        row(details, 'Task', store.tasks.find(task => task.id === record.task).name);
        row(details, 'Purpose', record.purpose.trim() || '-');
        row(details, 'Remarks', record.remarks);
        summary.append(header, details);
        const actions = node('div', 'history-card-actions');
        if (planned) actions.append(action(record, 'Confirm', 'confirm'));
        actions.append(action(record, 'Delete', 'delete'));
        card.append(summary, actions);
        list.append(card);
      }
      add.disabled = false;
      return true;
    } catch {
      list.replaceChildren();
      $('bookingEmpty').hidden = true;
      $('bookingRecordCount').textContent = '—';
      add.disabled = true;
      feedback('Unable to load saved bookings. Please check browser storage and try again.', true);
      return false;
    }
  }

  store.resources.forEach(resource => $('bookingResource').add(new Option(resource.name, resource.id)));
  store.tasks.forEach(task => $('bookingTask').add(new Option(task.name, task.id)));
  $('bookingDate').value = store.today();
  add.addEventListener('click', () => toggleEditor(editor.hidden));
  document.querySelector('.admin-back').addEventListener('click', event => {
    if (editor.hidden) return;
    event.preventDefault();
    clearFormError();
    toggleEditor(false);
  });
  $('bookingCancel').addEventListener('click', () => { clearFormError(); toggleEditor(false); });
  form.addEventListener('input', clearFormError);
  form.addEventListener('change', clearFormError);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (busy) return;
    clearFormError();
    const invalid = [...form.elements].find(field => field.willValidate && !field.checkValidity());
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true');
      feedback('Please complete the required booking fields.', true, true);
      invalid.focus();
      return;
    }
    if ($('bookingEndTime').value <= $('bookingStartTime').value) {
      $('bookingEndTime').setAttribute('aria-invalid', 'true');
      feedback('End Time must be later than Start Time.', true, true);
      $('bookingEndTime').focus();
      return;
    }
    busy = true;
    const planned = event.submitter?.value === 'plan';
    try {
      store.save(Object.fromEntries(new FormData(form)), planned ? 'plan' : 'confirmed');
      form.reset();
      $('bookingDate').value = store.today();
      toggleEditor(false);
      if (render()) {
        feedback(planned ? 'Plan saved. Tap Confirm when you are ready to book.' : 'Resource booked successfully.');
        $('bookingFeedback').scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    } catch {
      feedback('Unable to save this booking. Your form is kept; please try again.', true, true);
    } finally { busy = false; }
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-booking-action]');
    if (!button) {
      const card = event.target.closest('[data-record-id]');
      if (card && !busy) openDetails(card.dataset.recordId, card.querySelector('.booking-card-summary'));
      return;
    }
    if (busy) return;
    const card = button.closest('[data-record-id]');
    const actionName = button.dataset.bookingAction;
    busy = true;
    try {
      if (actionName === 'confirm') store.confirm(card.dataset.recordId);
      else store.remove(card.dataset.recordId);
      if (render()) {
        feedback(actionName === 'confirm' ? 'Booking confirmed.' : 'Booking deleted.');
        const updated = [...list.querySelectorAll('[data-record-id]')].find(record => record.dataset.recordId === card.dataset.recordId);
        (updated?.querySelector('button') || list.querySelector('button') || add).focus({ preventScroll: true });
      }
    } catch { feedback('Unable to update this booking. Please try again.', true); }
    finally { busy = false; }
  });
  list.addEventListener('keydown', event => {
    if (!event.target.matches('.booking-card-summary') || !['Enter', ' '].includes(event.key) || busy) return;
    event.preventDefault();
    openDetails(event.target.closest('[data-record-id]').dataset.recordId, event.target);
  });
  $('bookingDetailsClose').addEventListener('click', closeDetails);
  detailsDialog.addEventListener('click', event => {
    if (event.target === detailsDialog) closeDetails();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !detailsDialog.hidden) closeDetails();
  });
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', event => {
    if (event.key === 'peoplehcm:workplace:book-resource:v1' || event.key === null) {
      feedback('');
      render();
    }
  });
  render();
});
