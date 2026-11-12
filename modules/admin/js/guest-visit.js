document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('guestVisitForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const draftKey = 'peoplehcm:guest-visit:draft:v1';
  const tabs = ['general', 'guest', 'attendee', 'other'];
  const generalIds = ['visitDate', 'visitStartTime', 'visitEndTime', 'visitTotalGuest', 'visitLocation'];
  const guestIds = ['visitGuestCompany', 'visitGuestRelation', 'visitGuestName', 'visitGuestPosition'];
  const storedIds = [...generalIds, ...guestIds, 'visitStaff', 'visitMeal', 'visitRequestFloor', 'visitRequestSitting', 'visitRequestRooms', 'visitRequestNone'];
  // Demo employees match the existing employee forms until an Admin API is available.
  const employees = {
    EBB01: { name: 'Aina Rahman', department: 'Human Resources', position: 'People Operations Executive' },
    EBB02: { name: 'Daniel Wong', department: 'Product', position: 'Product Designer' },
    EBB03: { name: 'Nur Izzati', department: 'Finance', position: 'Finance Analyst' }
  };
  let currentTab = 'general';
  let currentView = 'tab';
  let guests = [];
  let attendeeIds = [];
  let editingGuest = null;
  let editingAttendee = null;
  let attachments = [];
  let historyRecordId = null;
  const today = new Date();
  $('visitDate').value = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');

  function feedback(message, error = false) {
    $('visitFeedback').textContent = message;
    $('visitFeedback').classList.toggle('is-error', error);
    $('visitFeedback').hidden = false;
    $('visitFeedback').scrollIntoView({ block: 'nearest' });
  }
  function showTab(name, focus = false) {
    if (!tabs.includes(name)) return;
    currentTab = name;
    currentView = 'tab';
    $('visitCategories').hidden = true;
    $('visitPageActions').hidden = false;
    $('visitGuestEditor').hidden = true;
    $('visitGuestListView').hidden = false;
    $('visitAttendeeEditor').hidden = true;
    $('visitAttendeeListView').hidden = false;
    document.querySelector('.admin-heading h1').textContent = 'Guest Visit';
    const step = tabs.indexOf(name);
    tabs.forEach((tab, index) => {
      const active = tab === name;
      const button = $('visitTab-' + tab);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      button.classList.toggle('active', active);
      button.classList.toggle('passed', index < step);
      $('visitPanel-' + tab).hidden = !active;
    });
    $('visitStepFill').style.width = step * 25 + '%';
    const listPage = name === 'guest' || name === 'attendee';
    $('visitPageActions').classList.toggle('is-list-page', listPage);
    $('visitSaveDraft').hidden = listPage;
    $('visitPrevious').className = listPage ? 'claim-button claim-button-secondary' : 'form-cancel-btn';
    $('visitPrevious').querySelector('span').textContent = listPage ? 'Back to Categories' : 'Cancel';
    $('visitPrevious').querySelector('i').className = listPage ? 'fa-solid fa-arrow-left' : 'fa-solid fa-xmark';
    $('visitCancel').hidden = step !== 0;
    $('visitPrevious').hidden = step === 0;
    $('visitNext').hidden = step === tabs.length - 1;
    $('visitSubmit').hidden = step !== tabs.length - 1;
    document.querySelector('main').scrollTop = 0;
    if (focus) $('visitTab-' + name).focus();
  }
  form.querySelectorAll('[data-visit-tab]').forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.visitTab));
    button.addEventListener('keydown', event => {
      const index = tabs.indexOf(currentTab);
      const next = { ArrowRight: (index + 1) % 4, ArrowLeft: (index + 3) % 4, Home: 0, End: 3 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      showTab(tabs[next], true);
    });
  });
  function showCategories() {
    showTab('general');
    currentView = 'categories';
    $('visitPanel-general').hidden = true;
    $('visitCategories').hidden = false;
    $('visitPageActions').hidden = true;
    $('visitFeedback').hidden = true;
    document.querySelector('.admin-heading h1').textContent = 'Visit Categories';
    document.querySelector('main').scrollTop = 0;
  }
  function showEntry(category, focus = true) {
    showTab(category);
    currentView = category + '-entry';
    const prefix = category === 'guest' ? 'visitGuest' : 'visitAttendee';
    $(prefix + 'ListView').hidden = true;
    $(prefix + 'Editor').hidden = false;
    $('visitPageActions').hidden = true;
    $('visitFeedback').hidden = true;
    const editing = category === 'guest' ? editingGuest : editingAttendee;
    document.querySelector('.admin-heading h1').textContent = (editing === null ? 'Add ' : 'Edit ') + (category === 'guest' ? 'Guest' : 'Attendee');
    if (focus) $(category === 'guest' ? 'visitGuestCompany' : 'visitStaff').focus();
  }
  $('visitSummaryDetails').addEventListener('click', showCategories);
  $('visitCategoriesBack').addEventListener('click', () => { showTab('general'); $('visitSummaryDetails').focus(); });
  $('visitCategoriesNext').addEventListener('click', () => showTab('guest', true));
  form.querySelectorAll('[data-visit-category]').forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.visitCategory, true));
  });
  $('visitOpenGuest').addEventListener('click', () => {
    resetGuest();
    showEntry('guest');
  });
  $('visitOpenAttendee').addEventListener('click', () => {
    editingAttendee = null;
    $('visitStaff').value = '';
    clearError($('visitStaff'));
    updateStaff();
    showEntry('attendee');
  });
  $('visitNext').addEventListener('click', () => showTab(tabs[tabs.indexOf(currentTab) + 1], true));
  $('visitPrevious').addEventListener('click', () => {
    if (currentTab === 'guest' || currentTab === 'attendee') showCategories();
    else showTab(tabs[tabs.indexOf(currentTab) - 1], true);
  });
  document.querySelector('.admin-header [data-admin-back]').addEventListener('click', event => {
    if (currentView === 'guest-entry') { event.preventDefault(); cancelGuestEntry(); }
    else if (currentView === 'attendee-entry') { event.preventDefault(); cancelAttendeeEntry(); }
    else if (currentView === 'categories') { event.preventDefault(); showTab('general', true); }
    else if (currentTab === 'guest' || currentTab === 'attendee') { event.preventDefault(); showCategories(); }
    else if (currentTab === 'other') { event.preventDefault(); showTab('attendee', true); }
  });

  function clearError(field) {
    field.setCustomValidity('');
    field.removeAttribute('aria-invalid');
  }
  function invalid(field, message) {
    const panel = field.closest('[role="tabpanel"]');
    if (field.closest('#visitGuestEditor')) showEntry('guest', false);
    else if (field.closest('#visitAttendeeEditor')) showEntry('attendee', false);
    else if (panel) showTab(panel.id.replace('visitPanel-', ''));
    field.setAttribute('aria-invalid', 'true');
    feedback(message, true);
    field.focus();
    field.reportValidity();
    return false;
  }
  function validate(ids, label) {
    ids.forEach(id => clearError($(id)));
    for (const id of ids) {
      const field = $(id);
      if (!field.value.trim()) field.setCustomValidity('Please complete this field.');
      if (!field.checkValidity()) return invalid(field, 'Please complete the required ' + label + ' details.');
    }
    return true;
  }
  form.addEventListener('input', event => {
    if (event.target.matches('.claim-control')) clearError(event.target);
    $('visitFeedback').hidden = true;
  });
  form.addEventListener('change', event => {
    if (event.target.matches('.claim-control')) clearError(event.target);
  });

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function detailRows(values) {
    const dl = node('dl');
    values.forEach(([label, value]) => {
      const row = node('div');
      row.append(node('dt', '', label), node('dd', '', value));
      dl.append(row);
    });
    return dl;
  }
  function recordButton(text, attribute, index, name) {
    const button = node('button', '', text);
    button.type = 'button';
    button.setAttribute(attribute, index);
    button.setAttribute('aria-label', text + ' ' + name);
    if (text === 'Edit' || text === 'Remove') {
      button.replaceChildren();
      button.className = 'visit-record-action';
      const icon = node('i', text === 'Edit' ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-trash-can');
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);
      button.title = text;
    }
    return button;
  }
  function updateSummaries() {
    $('visitGuestSummaryCount').textContent = String(guests.length);
    $('visitSummarySubtitle').textContent = guests.length + (guests.length === 1 ? ' guest, ' : ' guests, ') + attendeeIds.length + (attendeeIds.length === 1 ? ' attendee added' : ' attendees added');
    $('visitGuestListCount').textContent = window.PeopleHcmRecordSummary.formatCount(guests.length);
    $('visitAttendeeListCount').textContent = window.PeopleHcmRecordSummary.formatCount(attendeeIds.length);
    $('visitGuestCategoryCount').textContent = String(guests.length);
    $('visitAttendeeCategoryCount').textContent = String(attendeeIds.length);
    $('visitOtherCategoryCount').textContent = String(form.querySelectorAll('[data-other-request]:checked').length);
  }
  function addRecordDetails(record, title, subtitle, values, index, category, employeeId) {
    const header = node('div', 'visit-record-header');
    const copy = node('div', 'visit-record-copy');
    copy.append(node('h3', 'visit-record-name', title));
    if (employeeId) copy.append(node('span', 'visit-employee-id', '#' + employeeId));
    if (subtitle) copy.append(node('p', 'visit-record-subtitle', subtitle));
    const details = node('div', 'visit-record-details');
    details.id = 'visitRecord-' + category + '-' + index;
    details.hidden = true;
    details.append(detailRows(values));
    const toggle = node('button', 'form-record-toggle');
    toggle.type = 'button';
    toggle.dataset.toggleRecord = '';
    toggle.setAttribute('aria-label', 'Details for ' + title);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', details.id);
    const icon = node('i', 'fa-solid fa-chevron-down');
    icon.setAttribute('aria-hidden', 'true');
    toggle.append(icon);
    const actions = node('div', 'visit-record-actions');
    actions.append(toggle, recordButton('Edit', 'data-edit-' + category, index, title), recordButton('Remove', 'data-remove-' + category, index, title));
    header.append(copy, actions);
    record.append(header, details);
  }
  function toggleRecord(event) {
    const toggle = event.target.closest('[data-toggle-record]') ||
      (!event.target.closest('button') && event.target.closest('.visit-record-header')?.querySelector('[data-toggle-record]'));
    toggleFormRecordDetails(toggle);
  }
  function renderGuests() {
    const list = $('visitGuestList');
    list.replaceChildren();
    $('visitGuestEmpty').hidden = guests.length > 0;
    guests.forEach((guest, index) => {
      const record = node('article', 'visit-record');
      addRecordDetails(record, guest.name, guest.company, [['Company', guest.company], ['Relation', guest.relation], ['Position', guest.position]], index, 'guest');
      list.append(record);
    });
    updateSummaries();
  }
  function resetGuest() {
    guestIds.forEach(id => { $(id).value = ''; clearError($(id)); });
    editingGuest = null;
  }
  function updateGuestEditor() {
    $('visitGuestAdd').querySelector('span').textContent = 'Save Item';
  }
  $('visitGuestAdd').addEventListener('click', () => {
    if (!validate(guestIds, 'guest')) return;
    const guest = {
      company: $('visitGuestCompany').value.trim(),
      relation: $('visitGuestRelation').selectedOptions[0].textContent,
      relationValue: $('visitGuestRelation').value,
      name: $('visitGuestName').value.trim(),
      position: $('visitGuestPosition').value.trim()
    };
    if (editingGuest === null) guests.push(guest);
    else guests[editingGuest] = guest;
    resetGuest();
    renderGuests();
    showTab('guest');
    $('visitOpenGuest').focus();
    feedback('Guest details saved.');
  });
  function cancelGuestEntry() {
    resetGuest();
    showTab('guest');
    $('visitOpenGuest').focus();
  }
  $('visitGuestCancelEdit').addEventListener('click', cancelGuestEntry);
  $('visitGuestList').addEventListener('click', event => {
    toggleRecord(event);
    const edit = event.target.closest('[data-edit-guest]');
    const remove = event.target.closest('[data-remove-guest]');
    if (edit) {
      editingGuest = Number(edit.dataset.editGuest);
      const guest = guests[editingGuest];
      ['company', 'relationValue', 'name', 'position'].forEach((key, index) => {
        $(guestIds[index]).value = guest[key];
        clearError($(guestIds[index]));
      });
      updateGuestEditor();
      showEntry('guest');
    }
    if (remove) {
      const index = Number(remove.dataset.removeGuest);
      guests.splice(index, 1);
      if (editingGuest === index) resetGuest();
      else if (editingGuest !== null && index < editingGuest) editingGuest--;
      renderGuests();
      $('visitOpenGuest').focus();
      feedback('Guest removed.');
    }
  });

  function updateStaff() {
    const id = $('visitStaff').value;
    const employee = employees[id];
    $('visitStaffDepartment').value = employee?.department || '';
    $('visitStaffPosition').value = employee?.position || '';
    $('visitSelectedStaffId').textContent = employee ? '#' + id : '';
    $('visitSelectedStaffId').hidden = !employee;
  }
  function renderAttendees() {
    const list = $('visitAttendeeList');
    list.replaceChildren();
    $('visitAttendeeEmpty').hidden = attendeeIds.length > 0;
    attendeeIds.forEach((id, index) => {
      const employee = employees[id];
      const record = node('article', 'visit-record visit-attendee-record');
      addRecordDetails(record, employee.name, '', [['Department', employee.department], ['Position', employee.position]], index, 'attendee', id);
      list.append(record);
    });
    updateSummaries();
  }
  $('visitStaff').addEventListener('change', updateStaff);
  $('visitAttendeeAdd').addEventListener('click', () => {
    if (!validate(['visitStaff'], 'attendee')) return;
    const id = $('visitStaff').value;
    if (attendeeIds.some((existingId, index) => existingId === id && index !== editingAttendee)) {
      feedback('This employee is already in the attendee list.', true);
      return;
    }
    if (editingAttendee === null) attendeeIds.push(id);
    else attendeeIds[editingAttendee] = id;
    editingAttendee = null;
    $('visitStaff').value = '';
    updateStaff();
    renderAttendees();
    showTab('attendee');
    $('visitOpenAttendee').focus();
    feedback('Attendee added.');
  });
  function cancelAttendeeEntry() {
    $('visitStaff').value = '';
    clearError($('visitStaff'));
    editingAttendee = null;
    updateStaff();
    showTab('attendee');
    $('visitOpenAttendee').focus();
  }
  $('visitAttendeeCancelEdit').addEventListener('click', cancelAttendeeEntry);
  $('visitAttendeeList').addEventListener('click', event => {
    toggleRecord(event);
    const edit = event.target.closest('[data-edit-attendee]');
    if (edit) {
      editingAttendee = Number(edit.dataset.editAttendee);
      $('visitStaff').value = attendeeIds[editingAttendee];
      clearError($('visitStaff'));
      updateStaff();
      showEntry('attendee');
      return;
    }
    const button = event.target.closest('[data-remove-attendee]');
    if (!button) return;
    const index = Number(button.dataset.removeAttendee);
    attendeeIds.splice(index, 1);
    if (editingAttendee === index) {
      editingAttendee = null;
      $('visitStaff').value = '';
      updateStaff();
    } else if (editingAttendee !== null && index < editingAttendee) editingAttendee--;
    renderAttendees();
    $('visitOpenAttendee').focus();
    feedback('Attendee removed.');
  });
  const requestInputs = [...form.querySelectorAll('[data-other-request]')];
  function syncNone() { $('visitRequestNone').checked = !requestInputs.some(input => input.checked); updateSummaries(); }
  requestInputs.forEach(input => input.addEventListener('change', syncNone));
  $('visitRequestNone').addEventListener('change', () => {
    if ($('visitRequestNone').checked) requestInputs.forEach(input => { input.checked = false; });
    syncNone();
  });

  function renderAttachments() {
    const list = $('visitAttachments');
    list.replaceChildren();
    attachments.forEach((attachment, index) => {
      const row = node('div', 'visit-attachment');
      const icon = node('i', 'fa-solid fa-paperclip');
      icon.setAttribute('aria-hidden', 'true');
      const text = node('span', 'visit-attachment-text', attachment.name);
      if (!attachment.file) text.append(node('span', 'visit-attachment-note', 'Please reattach this file or remove it.'));
      const remove = recordButton('', 'data-remove-attachment', index, attachment.name);
      remove.className = 'visit-record-action';
      const removeIcon = node('i', 'fa-solid fa-xmark');
      removeIcon.setAttribute('aria-hidden', 'true');
      remove.append(removeIcon);
      remove.title = 'Remove';
      remove.setAttribute('aria-label', 'Remove ' + attachment.name);
      row.append(icon, text, remove);
      list.append(row);
    });
  }
  form.querySelectorAll('[data-file-picker]').forEach(button => {
    button.addEventListener('click', () => $(button.dataset.filePicker).click());
  });
  ['visitFiles', 'visitCamera'].forEach(id => {
    $(id).addEventListener('change', event => {
      [...event.target.files].forEach(file => {
        const pending = attachments.find(attachment => !attachment.file && attachment.name === file.name);
        if (pending) pending.file = file;
        else attachments.push({ name: file.name, file });
      });
      event.target.value = '';
      renderAttachments();
    });
  });
  $('visitAttachments').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-attachment]');
    if (!button) return;
    attachments.splice(Number(button.dataset.removeAttachment), 1);
    renderAttachments();
    form.querySelector('[data-file-picker="visitFiles"]').focus();
  });

  function saveDraft() {
    const fields = Object.fromEntries(storedIds.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value]));
    const draft = { fields, guests, attendeeIds, editingGuest, editingAttendee, currentTab, currentView, attachmentNames: attachments.map(attachment => attachment.name) };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      feedback(attachments.length ? 'Draft saved on this device. Reattach your files if you reopen it.' : 'Draft saved on this device.');
    } catch { feedback('Could not save the draft on this device. Your current entries are still available.', true); }
  }
  $('visitSaveDraft').addEventListener('click', saveDraft);
  form.querySelectorAll('[data-visit-save-draft]').forEach(button => button.addEventListener('click', saveDraft));
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (draft && draft.fields && typeof draft.fields === 'object') {
      storedIds.forEach(id => {
        const field = $(id);
        const value = draft.fields[id];
        if (field.type === 'checkbox' && typeof value === 'boolean') field.checked = value;
        else if (typeof value === 'string') field.value = value;
      });
      guests = Array.isArray(draft.guests) ? draft.guests.filter(guest =>
        guest && ['company', 'relation', 'relationValue', 'name', 'position'].every(key => typeof guest[key] === 'string')
      ) : [];
      attendeeIds = Array.isArray(draft.attendeeIds) ? [...new Set(draft.attendeeIds.filter(id => Object.hasOwn(employees, id)))] : [];
      attachments = Array.isArray(draft.attachmentNames) ? draft.attachmentNames.filter(name => typeof name === 'string').map(name => ({ name, file: null })) : [];
      editingGuest = Number.isInteger(draft.editingGuest) && draft.editingGuest >= 0 && draft.editingGuest < guests.length ? draft.editingGuest : null;
      editingAttendee = Number.isInteger(draft.editingAttendee) && draft.editingAttendee >= 0 && draft.editingAttendee < attendeeIds.length ? draft.editingAttendee : null;
      updateStaff();
      updateGuestEditor();
      syncNone();
      showTab(tabs.includes(draft.currentTab) ? draft.currentTab : 'general');
      if (draft.currentView === 'guest-entry' || draft.currentView === 'attendee-entry') showEntry(draft.currentView.replace('-entry', ''), false);
      else if (draft.currentView === 'categories') showCategories();
      feedback(attachments.length ? 'Draft restored. Please reattach your files before submitting.' : 'Draft restored.');
    }
  } catch { feedback('Could not restore the saved draft. You can continue filling in the form.', true); }
  renderGuests();
  renderAttendees();
  renderAttachments();

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (currentView === 'guest-entry') { $('visitGuestAdd').click(); return; }
    if (currentView === 'attendee-entry') { $('visitAttendeeAdd').click(); return; }
    if (currentView === 'categories') { showTab('guest', true); return; }
    if (currentTab !== 'other') {
      showTab(tabs[tabs.indexOf(currentTab) + 1], true);
      return;
    }
    generalIds.forEach(id => clearError($(id)));
    // Visit times belong to the selected visit date.
    if ($('visitStartTime').value && $('visitEndTime').value && $('visitEndTime').value <= $('visitStartTime').value) {
      $('visitEndTime').setCustomValidity('End time must be later than start time.');
      return invalid($('visitEndTime'), 'Visit end time must be later than the start time.');
    }
    if (!validate(generalIds, 'visit')) return;
    if (!guests.length || editingGuest !== null || guestIds.some(id => $(id).value.trim())) {
      showEntry('guest', false);
      feedback(guests.length ? 'Please Add or Update the guest details before submitting.' : 'Please add at least one guest before submitting.', true);
      $('visitGuestCompany').focus();
      return;
    }
    if (!attendeeIds.length || editingAttendee !== null || $('visitStaff').value) {
      showEntry('attendee', false);
      feedback('Please save or cancel the attendee details before submitting.', true);
      $('visitStaff').focus();
      return;
    }
    if (attachments.some(attachment => !attachment.file)) {
      showTab('general');
      feedback('Please reattach or remove the saved attachments before submitting.', true);
      form.querySelector('[data-file-picker="visitFiles"]').focus();
      return;
    }
    try {
      const location = $('visitLocation').selectedOptions[0].textContent;
      const requests = [...form.querySelectorAll('[data-other-request]:checked')].map(field => field.closest('label').querySelector('span').textContent);
      const record = window.WorkplaceHistoryStore.save({
        id: historyRecordId, kind: 'guest-visit', title: location, date: $('visitDate').value,
        fields: [['Visit Date', $('visitDate').value], ['Time', $('visitStartTime').value + ' – ' + $('visitEndTime').value],
          ['Total Guest', $('visitTotalGuest').value], ['Location', location], ['Meal', $('visitMeal').checked ? 'Yes' : 'No'],
          ...guests.map((guest, index) => ['Guest ' + (index + 1), `${guest.name} • ${guest.company} • ${guest.relation} • ${guest.position}`]),
          ...attendeeIds.map((id, index) => ['Attendee ' + (index + 1), `${employees[id].name}\n#${id}\n${employees[id].department} • ${employees[id].position}`]),
          ['Other Request', requests.join(', ') || 'None'], ['Attachments', attachments.map(file => file.name).join(', ') || 'None']]
      });
      historyRecordId = record.id;
      feedback('Guest visit saved to History on this device.');
    } catch {
      feedback('Unable to save this visit to History. Please try again.', true);
    }
  });
});
