/* Applications, approvals and history share the same Guest Visit sections. */
(() => {
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
      const description = node('dd');
      description.append(value ?? '');
      row.append(node('dt', '', label), description);
      dl.append(row);
    });
    return dl;
  }
  function recordButton(text, attribute, index, name) {
    const button = node('button', 'visit-record-action');
    button.type = 'button';
    button.setAttribute(attribute, index);
    button.setAttribute('aria-label', text + ' ' + name);
    const icon = node('i', text === 'Edit' ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-trash-can');
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    button.title = text;
    return button;
  }
  function addRecordDetails(record, title, subtitle, values, index, category, employeeId, editable) {
    const header = node('div', 'visit-record-header');
    const copy = node('div', 'visit-record-copy');
    copy.append(node('h3', 'visit-record-name', employeeId ? employeeCardHeading.text(employeeId, title) : title));
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
    actions.append(toggle);
    if (editable) actions.append(recordButton('Edit', 'data-edit-' + category, index, title), recordButton('Remove', 'data-remove-' + category, index, title));
    header.append(copy, actions);
    record.append(header, details);
  }
  function toggleRecord(event) {
    const toggle = event.target.closest('[data-toggle-record]') ||
      (!event.target.closest('button') && event.target.closest('.visit-record-header')?.querySelector('[data-toggle-record]'));
    toggleFormRecordDetails(toggle);
  }

  class GuestVisitFields extends HTMLElement {
    connectedCallback() {
      if (this.querySelector('.visit-stepper')) return;
      const editors = [...this.querySelectorAll('[data-editor-for]')];
      this.innerHTML = `
        <div class="visit-stepper" role="tablist" aria-label="Guest Visit sections">
          <span class="visit-step-line" aria-hidden="true"></span><span id="visitStepFill" class="visit-step-fill" aria-hidden="true"></span>
          <button id="visitTab-general" class="visit-step active" type="button" role="tab" data-visit-tab="general" aria-controls="visitPanel-general" aria-selected="true" tabindex="0"><span class="visit-step-circle" aria-hidden="true">1</span><span class="visit-step-label">General</span></button>
          <button id="visitTab-guest" class="visit-step" type="button" role="tab" data-visit-tab="guest" aria-controls="visitPanel-guest" aria-selected="false" tabindex="-1"><span class="visit-step-circle" aria-hidden="true">2</span><span class="visit-step-label">Guest</span></button>
          <button id="visitTab-attendee" class="visit-step" type="button" role="tab" data-visit-tab="attendee" aria-controls="visitPanel-attendee" aria-selected="false" tabindex="-1"><span class="visit-step-circle" aria-hidden="true">3</span><span class="visit-step-label">Attendee</span></button>
          <button id="visitTab-other" class="visit-step" type="button" role="tab" data-visit-tab="other" aria-controls="visitPanel-other" aria-selected="false" tabindex="-1"><span class="visit-step-circle" aria-hidden="true">4</span><span class="visit-step-label">Other</span></button>
        </div>
        <section id="visitPanel-general" role="tabpanel" aria-labelledby="visitTab-general" tabindex="0">
          <div class="claim-form-card">
            <h2 class="form-section-heading">Visit Details</h2>
            <div class="claim-form-stack">
              <div class="claim-field"><label class="claim-field-label" for="visitDate">Visit Date<span class="claim-required" aria-hidden="true">*</span></label><input id="visitDate" name="visitDate" class="claim-control" type="date" required></div>
              <div class="claim-field"><span id="visitTimeLabel" class="claim-field-label">Visit Time<span class="claim-required" aria-hidden="true">*</span></span><div class="claim-field-grid visit-time-grid" role="group" aria-labelledby="visitTimeLabel">
                <div class="claim-field"><input id="visitStartTime" name="visitStartTime" class="claim-control" type="time" value="00:00" aria-label="Visit start time" required></div>
                <div class="claim-field"><input id="visitEndTime" name="visitEndTime" class="claim-control" type="time" value="00:00" aria-label="Visit end time" required></div>
              </div></div>
              <div class="claim-field"><label class="claim-field-label" for="visitTotalGuest">Total Guest<span class="claim-required" aria-hidden="true">*</span></label><input id="visitTotalGuest" name="visitTotalGuest" class="claim-control" type="number" value="0" min="1" step="1" required></div>
              <div class="claim-field"><label class="claim-field-label" for="visitLocation">Location<span class="claim-required" aria-hidden="true">*</span></label><div class="visit-select"><select id="visitLocation" name="visitLocation" class="claim-control" required><option value="">Select Location</option><option value="head-office">Head Office</option><option value="branch-office">Branch Office</option><option value="meeting-room">Meeting Room</option></select><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></div></div>
              <label class="visit-choice" for="visitMeal"><span>Meal?</span><span class="visit-switch"><input id="visitMeal" name="meal" type="checkbox" role="switch"><span class="visit-switch-track" aria-hidden="true"></span></span></label>
              <div class="claim-field visit-upload-section">
                <h2 class="form-section-heading visit-upload-heading">Upload Attachments</h2>
                <div class="visit-upload-actions"><button type="button" class="visit-upload" data-file-picker="visitFiles"><span class="visit-upload-icon"><i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i></span><span>Select File(s)</span></button><button type="button" class="visit-upload" data-file-picker="visitCamera"><span class="visit-upload-icon visit-camera-icon"><i class="fa-solid fa-camera" aria-hidden="true"></i></span><span>Take Picture</span></button></div>
                <input id="visitFiles" type="file" multiple hidden><input id="visitCamera" type="file" accept="image/*" capture="environment" hidden>
                <div id="visitAttachments" class="visit-record-list"></div>
              </div>
            </div>
          </div>
          <button id="visitSummaryDetails" class="visit-summary-card" type="button" aria-controls="visitCategories">
            <span class="visit-summary-icon"><i class="fa-solid fa-user-group" aria-hidden="true"></i></span>
            <span class="visit-summary-copy"><span class="visit-summary-label">TOTAL GUESTS</span><strong id="visitGuestSummaryCount">0</strong><span id="visitSummarySubtitle">0 guests, 0 attendees added</span></span>
            <span class="visit-details-pill">Details <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
          </button>
        </section>
        <section id="visitPanel-guest" role="tabpanel" aria-labelledby="visitTab-guest" tabindex="0" hidden>
          <div id="visitGuestListView" class="claim-form-card visit-list-card">
            <div class="visit-list-heading"><span class="visit-list-icon"><i class="fa-solid fa-user-group" aria-hidden="true"></i></span><div class="visit-list-heading-copy"><h2 class="form-section-heading">Guest</h2><span id="visitGuestListCount" class="form-list-caption">0 Records</span></div><button id="visitOpenGuest" type="button" class="claim-button claim-button-primary visit-add-record" aria-label="Add Guest"><i class="fa-solid fa-plus" aria-hidden="true"></i></button></div>
            <div class="visit-list-body"><div id="visitGuestEmpty" class="visit-empty-state"><span class="visit-empty-icon"><i class="fa-solid fa-user-group" aria-hidden="true"></i></span><p class="visit-empty-title">No guests added yet</p><p class="visit-empty-description">Click "+ Add Guest" above to add your first record</p></div><div id="visitGuestList" class="visit-record-list"></div></div>
          </div>
        </section>
        <section id="visitPanel-attendee" role="tabpanel" aria-labelledby="visitTab-attendee" tabindex="0" hidden>
          <div id="visitAttendeeListView" class="claim-form-card visit-list-card">
            <div class="visit-list-heading"><span class="visit-list-icon"><i class="fa-solid fa-user-tie" aria-hidden="true"></i></span><div class="visit-list-heading-copy"><h2 class="form-section-heading">Attendee</h2><span id="visitAttendeeListCount" class="form-list-caption">0 Records</span></div><button id="visitOpenAttendee" type="button" class="claim-button claim-button-primary visit-add-record" aria-label="Add Attendee"><i class="fa-solid fa-plus" aria-hidden="true"></i></button></div>
            <div class="visit-list-body"><div id="visitAttendeeEmpty" class="visit-empty-state"><span class="visit-empty-icon"><i class="fa-solid fa-user-tie" aria-hidden="true"></i></span><p class="visit-empty-title">No attendees added yet</p><p class="visit-empty-description">Click "+ Add Attendee" above to add your first record</p></div><div id="visitAttendeeList" class="visit-record-list"></div></div>
          </div>
        </section>
        <section id="visitCategories" aria-labelledby="visitCategoriesHeading" hidden>
          <h2 id="visitCategoriesHeading" class="form-section-heading">Visit Categories (3)</h2>
          <p class="visit-category-note">Select a category to view or add details.</p>
          <button type="button" class="visit-category-card" data-visit-category="guest"><span class="visit-list-icon"><i class="fa-solid fa-user-group" aria-hidden="true"></i></span><span class="visit-category-copy"><strong>Guest</strong><span>Guest details</span></span><strong id="visitGuestCategoryCount">0</strong><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
          <button type="button" class="visit-category-card" data-visit-category="attendee"><span class="visit-list-icon visit-attendee-icon"><i class="fa-solid fa-user-tie" aria-hidden="true"></i></span><span class="visit-category-copy"><strong>Attendee</strong><span>Staff attending the visit</span></span><strong id="visitAttendeeCategoryCount">0</strong><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
          <button type="button" class="visit-category-card" data-visit-category="other"><span class="visit-list-icon visit-other-icon"><i class="fa-solid fa-list-check" aria-hidden="true"></i></span><span class="visit-category-copy"><strong>Other</strong><span>Other requests</span></span><strong id="visitOtherCategoryCount">0</strong><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
          <div class="visit-category-actions"><button id="visitCategoriesBack" type="button" class="claim-button claim-button-primary"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Back to Application</span></button><button id="visitCategoriesNext" type="button" class="claim-button claim-button-primary"><span>Next</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>
        </section>
        <section id="visitPanel-other" role="tabpanel" aria-labelledby="visitTab-other" tabindex="0" hidden>
          <div class="claim-form-card">
            <h2 class="form-section-heading">Other Request</h2>
            <div class="claim-form-stack">
              <label class="visit-choice" for="visitRequestFloor"><span>Floor Visit</span><span class="visit-switch"><input id="visitRequestFloor" type="checkbox" role="switch" name="requests" value="floor-visit" data-other-request><span class="visit-switch-track" aria-hidden="true"></span></span></label>
              <label class="visit-choice" for="visitRequestSitting"><span>Sitting Arrangement</span><span class="visit-switch"><input id="visitRequestSitting" type="checkbox" role="switch" name="requests" value="sitting-arrangement" data-other-request><span class="visit-switch-track" aria-hidden="true"></span></span></label>
              <label class="visit-choice" for="visitRequestRooms"><span>Multiple Rooms</span><span class="visit-switch"><input id="visitRequestRooms" type="checkbox" role="switch" name="requests" value="multiple-rooms" data-other-request><span class="visit-switch-track" aria-hidden="true"></span></span></label>
              <label class="visit-choice" for="visitRequestNone"><span>None</span><span class="visit-switch"><input id="visitRequestNone" type="checkbox" role="switch" name="noRequests" checked><span class="visit-switch-track" aria-hidden="true"></span></span></label>
            </div>
          </div>
        </section>
      `;
      this.querySelector('#visitGuestList').addEventListener('click', toggleRecord);
      this.querySelector('#visitAttendeeList').addEventListener('click', toggleRecord);
      for (const editor of editors) this.querySelector('#visitPanel-' + editor.dataset.editorFor).append(editor);
    }

    updateCounts(guestCount, attendeeCount) {
      this.querySelector('#visitGuestSummaryCount').textContent = String(guestCount);
      this.querySelector('#visitSummarySubtitle').textContent = guestCount + (guestCount === 1 ? ' guest, ' : ' guests, ') + attendeeCount + (attendeeCount === 1 ? ' attendee added' : ' attendees added');
      this.querySelector('#visitGuestListCount').textContent = window.PeopleHcmRecordSummary.formatCount(guestCount);
      this.querySelector('#visitAttendeeListCount').textContent = window.PeopleHcmRecordSummary.formatCount(attendeeCount);
      this.querySelector('#visitGuestCategoryCount').textContent = String(guestCount);
      this.querySelector('#visitAttendeeCategoryCount').textContent = String(attendeeCount);
      this.querySelector('#visitOtherCategoryCount').textContent = String(this.querySelectorAll('[data-other-request]:checked').length);
    }

    renderPeople(category, people) {
      const guest = category === 'guest';
      const prefix = guest ? '#visitGuest' : '#visitAttendee';
      const list = this.querySelector(prefix + 'List');
      this.querySelector(prefix + 'Empty').hidden = people.length !== 0;
      list.replaceChildren(...people.map((person, index) => {
        const record = node('article', guest ? 'visit-record' : 'visit-record visit-attendee-record');
        const rows = guest ? [['Company', person.company], ['Relation', person.relation], ['Position', person.position]]
          : [['Department', person.department], ['Position', person.position]];
        addRecordDetails(record, person.name, guest ? person.company : '', rows, index, category, guest ? null : person.empNo, !this.hasAttribute('readonly'));
        return record;
      }));
    }

    showSubmission(item, formatDate, scrollArea, requestDetails = []) {
      this.setAttribute('readonly', '');
      const $ = id => this.querySelector('#' + id);
      const general = $('visitPanel-general');
      const stack = general.querySelector('.claim-form-stack');
      stack.prepend(recordSubmitDate.form(item.submitDate));
      if (requestDetails.length) {
        const metadata = detailRows(requestDetails);
        metadata.className = 'visit-submission-meta';
        stack.prepend(metadata);
      }

      const location = node('input', 'claim-control');
      location.id = 'visitLocation';
      $('visitLocation').parentElement.replaceWith(location);
      const values = {visitDate: formatDate(item.visitDate), visitStartTime: item.startTime, visitEndTime: item.endTime,
        visitTotalGuest: item.totalGuest, visitLocation: item.location};
      for (const [id, value] of Object.entries(values)) {
        const input = $(id);
        input.type = 'text';
        input.readOnly = true;
        input.required = false;
        input.value = value === '' || value == null ? '—' : String(value);
      }
      $('visitMeal').checked = item.meal;
      this.querySelectorAll('[data-other-request]').forEach(input => { input.checked = item.otherRequests.includes(input.value); });
      $('visitRequestNone').checked = item.otherRequests.length === 0;
      this.querySelectorAll('input[type="checkbox"]').forEach(input => { input.disabled = true; });
      this.querySelectorAll('.claim-required, .visit-upload-actions, input[type="file"], .visit-add-record, .visit-empty-description').forEach(element => element.remove());
      if (item.remarks) {
        const field = node('label', 'claim-field');
        const remarks = node('textarea', 'claim-control');
        remarks.id = 'visitRemarks';
        remarks.readOnly = true;
        remarks.value = item.remarks;
        field.append(node('span', 'claim-field-label', 'Remarks'), remarks);
        this.querySelector('.visit-upload-section').before(field);
      }
      this.querySelector('.visit-upload-heading').textContent = 'Attachments';
      const files = $('visitAttachments');
      for (const file of item.attachments) {
        const attachment = node('div', 'visit-attachment');
        attachment.append(node('span', 'visit-attachment-text', file.name ?? file));
        files.append(attachment);
      }
      if (!item.attachments.length) files.textContent = 'No attachments';
      this.renderPeople('guest', item.guests);
      this.renderPeople('attendee', item.attendees);
      this.updateCounts(item.guests.length, item.attendees.length);

      const showTab = (name, focus = false) => {
        this.selectStep(name);
        scrollArea.scrollTop = 0;
        if (focus) $('visitTab-' + name).focus({ preventScroll: true });
      };
      this.bindSteps(showTab);
      this.querySelector('.visit-category-note').textContent = 'Select a category to view its details.';
      $('visitCategoriesBack').querySelector('span').textContent = 'Back to General';
      $('visitSummaryDetails').addEventListener('click', () => {
        general.hidden = true;
        $('visitCategories').hidden = false;
        scrollArea.scrollTop = 0;
        this.querySelector('[data-visit-category]').focus({ preventScroll: true });
      });
      this.querySelectorAll('[data-visit-category]').forEach(button => {
        button.addEventListener('click', () => showTab(button.dataset.visitCategory, true));
      });
      $('visitCategoriesBack').addEventListener('click', () => showTab('general', true));
      $('visitCategoriesNext').addEventListener('click', () => showTab('guest', true));
    }

    bindSteps(showTab) {
      const steps = [...this.querySelectorAll('[data-visit-tab]')];
      steps.forEach((button, index) => {
        button.addEventListener('click', () => showTab(button.dataset.visitTab));
        button.addEventListener('keydown', event => {
          const next = {ArrowRight: (index + 1) % steps.length, ArrowLeft: (index + steps.length - 1) % steps.length, Home: 0, End: steps.length - 1}[event.key];
          if (next === undefined) return;
          event.preventDefault();
          showTab(steps[next].dataset.visitTab, true);
        });
      });
    }

    selectStep(name) {
      const steps = [...this.querySelectorAll('[data-visit-tab]')];
      const step = steps.findIndex(button => button.dataset.visitTab === name);
      steps.forEach((button, index) => {
        const active = index === step;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        button.classList.toggle('active', active);
        button.classList.toggle('passed', index < step);
        this.querySelector('#' + button.getAttribute('aria-controls')).hidden = !active;
      });
      this.querySelector('#visitStepFill').style.width = (100 * step / steps.length) + '%';
      this.querySelector('#visitCategories').hidden = true;
    }
  }
  customElements.define('guest-visit-fields', GuestVisitFields);
})();
