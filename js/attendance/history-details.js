/* Record-specific forms for Attendance History; shared popout styles own presentation. */
(function () {
  const drafts = new Map();
  const active = { ot: null, feedback: null };
  const prefixes = { ot: 'modalOt', feedback: 'modalFbk' };
  const overlays = { ot: 'otDetailsModal', feedback: 'feedbackDetailsModal' };
  const closeTimers = { ot: null, feedback: null };
  const returnFocus = { ot: null, feedback: null };
  const resubmittable = status => /resubmit|resubmission/i.test(status || '');
  const text = (id, value) => { document.getElementById(id).textContent = value ?? '-'; };
  const fullDate = value => {
    const date = new Date(value + 'T12:00:00Z');
    const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()];
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()];
    return `${weekday} ${String(date.getUTCDate()).padStart(2, '0')} ${month} ${date.getUTCFullYear()}`;
  };

  function setEmployee(prefix, employee) {
    const [id, ...parts] = String(employee || '').split(' - ');
    text(prefix + 'EmpName', parts.join(' - ') || '-');
    text(prefix + 'EmpNo', id ? '#' + id.replace(/^#/, '') : '-');
  }

  function setStatus(id, status) {
    const node = document.getElementById(id);
    node.replaceChildren(recordDetailStatus.create(status || '-'));
    node.dataset.status = resubmittable(status) ? 'resubmit' : /approved/i.test(status) ? 'approved' : 'pending-review';
  }

  function show(kind, record) {
    const overlay = document.getElementById(overlays[kind]);
    window.clearTimeout(closeTimers[kind]);
    returnFocus[kind] = document.activeElement;
    active[kind] = record;
    const prefix = prefixes[kind];
    const saved = drafts.get(kind + ':' + record.ref);
    record.fields = { ...record.fields, ...saved?.fields };
    record.files = saved?.files ? [...saved.files] : [];
    record.punches = (saved?.punches || record.punches || []).map(punch => ({ ...punch }));
    overlay.querySelectorAll('[data-history-field]').forEach(control => {
      const value = record.fields[control.dataset.historyField];
      if (control.type === 'checkbox') control.checked = Boolean(value);
      else control.value = value ?? '';
      control.disabled = !record.editable;
    });
    overlay.querySelectorAll('[data-history-edit-only]').forEach(node => { node.hidden = !record.editable; });
    overlay.querySelectorAll('[data-history-submit]').forEach(button => { button.disabled = !record.editable; });
    document.getElementById(prefix + 'Files').value = '';
    document.getElementById(prefix + 'Camera').value = '';
    renderFiles(kind);
    if (kind === 'feedback') {
      document.getElementById('modalFbkPunches').scrollLeft = 0;
      renderPunches();
    }
    overlay.querySelector('.attendance-history-modal-body').scrollTop = 0;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.classList.add('is-open');
      overlay.querySelector(kind === 'ot' ? '[data-ot-form-back]' : '[data-feedback-form-back]')?.focus({ preventScroll: true });
    });
  }

  function close(kind) {
    const overlay = document.getElementById(overlays[kind]);
    overlay.classList.remove('is-open');
    overlay.style.opacity = '0';
    closeTimers[kind] = window.setTimeout(() => {
      overlay.style.display = 'none';
      returnFocus[kind]?.focus?.({ preventScroll: true });
    }, 280);
  }

  function capture(kind) {
    const record = active[kind];
    document.getElementById(overlays[kind]).querySelectorAll('[data-history-field]').forEach(control => {
      record.fields[control.dataset.historyField] = control.type === 'checkbox' ? control.checked : control.value;
    });
    drafts.set(kind + ':' + record.ref, {
      fields: { ...record.fields },
      punches: record.punches.map(punch => ({ ...punch })),
      files: [...record.files]
    });
  }

  function saveDraft(kind) {
    capture(kind);
    if (typeof showToast === 'function') showToast('Attendance advice draft saved');
    close(kind);
  }

  function submit(kind) {
    if (!active[kind]?.editable) return;
    const form = document.getElementById(kind === 'ot' ? 'historyOtForm' : 'historyFeedbackForm');
    if (!form.reportValidity()) return;
    capture(kind);
    if (typeof showToast === 'function') showToast(kind === 'ot' ? 'OT Plan Details Submitted' : 'Attendance Advice Submitted');
    close(kind);
  }

  function openOtDetailsModal(docRef, planStatus, emp, supervisor, submitDate, otDate, shift, clkTimes, startTime, endTime, breakHrs, planHrs, otType, otReason, task, allowLeaveCredit, needTransport, remarks, approverComments) {
    text('modalOtDocRef', docRef);
    setStatus('modalOtPlanStatus', planStatus);
    setEmployee('modalOt', emp);
    text('modalOtSupervisor', supervisor);
    text('modalOtSubmitDate', submitDate);
    text('modalOtShift', shift);
    text('modalOtClockingTimes', clkTimes);
    document.getElementById('modalOtApproverComments').value = approverComments || '-';
    const match = String(otDate || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    show('ot', {
      ref: docRef, editable: resubmittable(planStatus), punches: [],
      fields: {
        date: match ? `${match[3]}-${match[2]}-${match[1]}` : '',
        startTime, endTime, breakHours: breakHrs, planHours: planHrs,
        type: otType, reason: otReason, task: task === '- SELECT TASK -' ? '' : task,
        credit: allowLeaveCredit === 'Yes', transport: needTransport === 'Yes', remarks: remarks || ''
      }
    });
  }

  function openFeedbackDetailsModal(docRef, docStatus, emp, branch, dept, date, shift, submitter, submitDate, comments, amendments = {}) {
    text('modalFbkDocRef', docRef);
    setStatus('modalFbkDocStatus', docStatus);
    setEmployee('modalFbk', emp);
    text('modalFbkBranch', branch);
    text('modalFbkDepartment', dept);
    text('modalFbkDate', date);
    text('modalFbkShift', shift);
    text('modalFbkSubmitDate', submitDate);
    const [submitterId, ...submitterName] = String(submitter || '').split(' - ');
    text('modalFbkSubmitterName', submitterName.join(' - ') || '-');
    text('modalFbkSubmitterId', submitterId ? '#' + submitterId.replace(/^#/, '') : '-');
    document.getElementById('modalFbkApproverComments').value = comments || '-';
    // The first document's two time amendments are shown in the supplied reference.
    const referencePunches = docRef === 'ATT000000000432' ? [
      { date: '2025-12-31', original: '07:02', amended: '06:02' },
      { date: '2025-12-31', original: 'New', amended: '10:00' }
    ] : [];
    show('feedback', {
      ref: docRef, editable: resubmittable(docStatus),
      date, punches: amendments.punches || referencePunches,
      fields: {
        amendedShift: amendments.amendedShift || '', shiftReason: amendments.shiftReason || '',
        editReason: amendments.editReason || '', remarks: amendments.remarks || ''
      }
    });
  }

  function renderFiles(kind) {
    const record = active[kind];
    const container = document.getElementById(prefixes[kind] + 'Attachments');
    container.replaceChildren();
    if (!record.files.length) {
      const empty = document.createElement('p');
      empty.className = 'attendance-history-attachment-empty';
      empty.textContent = 'No attachments';
      container.append(empty);
    }
    record.files.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'attendance-history-attachment form-attachment-item';
      const icon = document.createElement('span');
      icon.className = 'form-attachment-file-icon';
      icon.innerHTML = '<i class="fa-solid fa-paperclip" aria-hidden="true"></i>';
      row.append(icon);
      const name = document.createElement('span');
      name.className = 'form-attachment-file-name';
      name.textContent = file.name;
      name.title = file.name;
      row.append(name);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'form-attachment-remove';
      remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      remove.setAttribute('aria-label', 'Remove ' + file.name);
      remove.onclick = () => { record.files.splice(index, 1); renderFiles(kind); };
      row.append(remove);
      container.append(row);
    });
  }

  function handleHistoryFiles(kind, input) {
    if (!active[kind]?.editable) return;
    active[kind].files.push(...Array.from(input.files || []));
    input.value = '';
    renderFiles(kind);
  }

  function triggerHistoryUpload(kind, camera) {
    if (!active[kind]?.editable) return;
    document.getElementById(prefixes[kind] + (camera ? 'Camera' : 'Files')).click();
  }

  function renderPunches() {
    const record = active.feedback;
    const container = document.getElementById('modalFbkPunches');
    const scrollLeft = container.scrollLeft;
    container.replaceChildren();
    document.getElementById('modalFbkPunchEmpty').hidden = record.punches.length > 0;
    if (!Number.isInteger(record.selectedPunch) || record.selectedPunch >= record.punches.length) {
      record.selectedPunch = record.punches.findIndex(punch => punch.original === 'New');
      if (record.selectedPunch < 0) record.selectedPunch = record.punches.length ? 0 : -1;
    }
    const deleteButton = document.getElementById('modalFbkPunchDelete');
    deleteButton.disabled = !record.editable || !record.punches.length;
    deleteButton.onclick = () => {
      if (!record.editable || record.selectedPunch < 0) return;
      record.punches.splice(record.selectedPunch, 1);
      record.selectedPunch = Math.min(record.selectedPunch, record.punches.length - 1);
      renderPunches();
    };
    function selectPunch(index) {
      record.selectedPunch = index;
      [...container.children].forEach((row, rowIndex) => {
        row.classList.toggle('selected', rowIndex === index);
        row.setAttribute('aria-current', String(rowIndex === index));
      });
    }
    record.punches.forEach((punch, index) => {
      const row = document.createElement('div');
      row.className = 'attendance-history-punch-row';
      row.dataset.punchRow = '';
      row.tabIndex = 0;
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'Clock entry ' + (index + 1) + ': original and amended times');
      row.onclick = () => selectPunch(index);
      row.onkeydown = event => {
        if (event.target !== row || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        selectPunch(index);
      };
      const top = document.createElement('div');
      top.className = 'attendance-history-clock-top';
      const date = document.createElement('time');
      date.dateTime = punch.date;
      date.textContent = fullDate(punch.date);
      const original = document.createElement('span');
      original.textContent = punch.original;
      original.className = 'attendance-history-punch-original' + (punch.original === 'New' ? ' is-new' : '');
      top.append(date, original);
      const bottom = document.createElement('div');
      bottom.className = 'attendance-history-clock-bottom';
      const control = document.createElement('input');
      control.type = 'text';
      control.inputMode = 'numeric';
      control.placeholder = '--:--';
      control.pattern = '([01][0-9]|2[0-3]):[0-5][0-9]';
      control.maxLength = 5;
      control.value = punch.amended;
      control.disabled = !record.editable;
      control.setAttribute('aria-label', 'Amended time for ' + date.textContent + ' ' + punch.original);
      control.title = 'Amended time (HH:MM)';
      control.onfocus = () => selectPunch(index);
      // A semantic text value keeps the amendment understandable in text-only views.
      const value = document.createElement('span');
      value.className = 'attendance-history-sr-only';
      value.textContent = punch.amended;
      control.oninput = () => {
        // Numeric mobile keyboards can enter HHMM without a colon key.
        if (/^\d{3,4}$/.test(control.value)) control.value = control.value.slice(0, 2) + ':' + control.value.slice(2);
        punch.amended = control.value;
        value.textContent = control.value;
      };
      bottom.append(date.cloneNode(true), control, value);
      row.append(top, bottom);
      container.append(row);
    });
    selectPunch(record.selectedPunch);
    container.scrollLeft = scrollLeft;
    const controls = document.getElementById('modalFbkPunchDays');
    controls.replaceChildren();
    // Day offsets are tied to this record, rather than shared between documents.
    const match = String(record.date).match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (!match) return;
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[2]);
    for (const offset of [-1, 0, 1]) {
      const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1]) + offset));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'attendance-history-day-button';
      button.textContent = '+ ' + fullDate(date.toISOString().slice(0,10));
      button.style.setProperty('--day-rgb', ['239, 68, 68', '16, 185, 129', '59, 130, 246'][offset + 1]);
      button.onclick = () => {
        if (!record.editable) return;
        record.punches.push({ date: date.toISOString().slice(0,10), original: 'New', amended: '' });
        record.selectedPunch = record.punches.length - 1;
        renderPunches();
        container.scrollLeft = container.scrollWidth;
      };
      controls.append(button);
    }
  }

  Object.assign(window, {
    openOtDetailsModal, openFeedbackDetailsModal,
    closeOtDetailsDirect: () => close('ot'), closeFeedbackDetailsDirect: () => close('feedback'),
    closeOtDetailsModal: event => { if (event.target === event.currentTarget) close('ot'); },
    closeFeedbackDetailsModal: event => { if (event.target === event.currentTarget) close('feedback'); },
    submitOtDetailsForm: () => submit('ot'), submitFeedbackDetailsForm: () => submit('feedback'),
    saveHistoryDetailDraft: saveDraft, handleHistoryFiles, triggerHistoryUpload
  });
})();
