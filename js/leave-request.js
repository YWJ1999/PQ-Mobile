const LeaveRequest = (() => {
  const storageKey = 'peoplehcm.leave.requests.v1';
  const employee = { applicant: 'Farhan binti rahmat', empNo: 'EBB12', department: 'Human Resource', branch: 'Times Square Branch' };
  const source = () => document.querySelector('#viewApplyLeaveForm [data-leave-form]');
  const display = value => value == null || value === '' ? '—' : String(value);
  const medical = type => ['medical leave', 'sick leave', 'hospitalization leave', 'unpaid mc', 'unpaid hospitalization'].includes(String(type).toLowerCase());
  const dateLabel = date => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const files = data => Array.isArray(data.attachments) ? data.attachments : data.attachment ? [data.attachment] : [];

  function collect() {
    const form = source();
    const now = new Date();
    const data = { ...employee, submitter: employee.applicant, submitDate: dateLabel(now),
      docStatus: 'Pending Approval',
      leaveYear: form.querySelector('[data-leave-heading]').textContent.match(/\d{4}/)?.[0],
      attachments: Array.from(form.querySelectorAll('.form-attachment-file-name'), el => el.textContent) };
    for (const field of form.querySelectorAll('[data-leave-field]')) {
      const key = field.dataset.leaveField;
      if (field.closest('#mainMedicalFieldsGroup') && !medical(data.type)) continue;
      if (field.matches('.custom-toggle')) data[key] = field.querySelector('input').checked ? 'Yes' : 'No';
      else if (key === 'duration') data[key] = field.querySelector('.active').lastChild.textContent.trim();
      else if (field.type === 'date') data[key] = field.value ? dateLabel(new Date(field.value + 'T00:00:00')) : '';
      else if (field.matches('select') && key !== 'type') data[key] = field.value ? field.selectedOptions[0].textContent.trim() : '';
      else data[key] = field.value ?? field.textContent.trim();
    }
    data.dates = data.fromDate === data.toDate ? data.fromDate : [data.fromDate, data.toDate].join(' - ');
    return data;
  }

  function review(data) {
    const form = source().cloneNode(true);
    form.querySelector('[data-leave-heading]').textContent = data.leaveYear ? 'Leave Details (' + data.leaveYear + ')' : 'Leave Details';
    form.querySelector('[data-leave-heading]').after(recordSubmitDate.create(data.submitDate));
    form.querySelector('#mainFormChecklistText').remove();
    const medicalGroup = form.querySelector('#mainMedicalFieldsGroup');
    if (medical(data.type) || [...medicalGroup.querySelectorAll('[data-leave-field]')].some(el => data[el.dataset.leaveField])) {
      medicalGroup.style.display = 'flex';
    } else medicalGroup.remove();
    const total = form.querySelector('#mainTotalDaysBanner');
    total.textContent = data.leaveDays != null && data.leaveDays !== '' ? 'Total: ' + data.leaveDays + (Number(data.leaveDays) === 1 ? ' Day' : ' Days') : '';
    for (const field of form.querySelectorAll('[data-leave-field]')) {
      const key = field.dataset.leaveField;
      const value = document.createElement('div');
      value.dataset.reviewField = key;
      value.className = field.matches('.custom-toggle') ? 'leave-review-flag' : 'leave-review-value';
      value.textContent = display(typeof data[key] === 'boolean' ? (data[key] ? 'Yes' : 'No') : data[key]);
      const control = field.closest('.peoplehcm-select-wrap') || field;
      control.replaceWith(value);
    }
    const attachment = form.querySelector('[data-leave-attachments]');
    const label = attachment.querySelector('label');
    label.textContent = 'Attachments';
    const list = document.createElement('div');
    list.className = 'form-attachment-list';
    const names = files(data);
    for (const name of names) {
      const row = document.createElement('div');
      row.className = 'form-attachment-item';
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-paperclip form-attachment-file-icon';
      icon.setAttribute('aria-hidden', 'true');
      const filename = document.createElement('span');
      filename.className = 'form-attachment-file-name';
      filename.textContent = name;
      row.append(icon, filename);
      list.append(row);
    }
    if (!names.length) { list.className = 'leave-review-value'; list.textContent = 'No attachments'; }
    attachment.replaceChildren(label, list);
    form.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    return form;
  }

  function records(forWrite = false) {
    try {
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(items)) throw new Error('Invalid leave request list');
      return items;
    } catch (error) {
      if (forWrite) throw error;
      return [];
    }
  }

  function submit() {
    const items = records(true);
    const request = collect();
    do {
      const number = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
      request.docRef = 'LV-' + new Date().getFullYear() + '-' + number.toUpperCase();
    } while (items.some(item => item.request.docRef === request.docRef));
    items.unshift({ request, status: 'submitted' });
    localStorage.setItem(storageKey, JSON.stringify(items));
    return request;
  }

  // Read the latest queue before committing all selected decisions together.
  function setStatus(refs, status, comment = '') {
    if (!refs.length) return true;
    const items = records(true);
    const selected = refs.map(ref => items.find(item => item.request.docRef === ref));
    if (selected.some(item => !item || !(item.status === 'submitted' || (status === 'cancelled' && item.status === 'approved')))) return false;
    for (const item of selected) {
      item.status = status;
      if (status !== 'cancelled') item.comment = comment;
    }
    localStorage.setItem(storageKey, JSON.stringify(items));
    return true;
  }

  function history() {
    return records().map(({ request, status, comment }) => ({
      ref: request.docRef, title: request.type, type: request.type.toLowerCase().replace(/ leave$/, ''),
      dates: request.dates, daysHours: request.leaveDays + ' Days', duration: request.duration,
      submittedDate: request.submitDate, reason: request.reason, request, status, comment
    }));
  }

  function queueCard(request) {
    const card = document.getElementById('approvalCard1').cloneNode(true);
    const ref = request.docRef;
    card.id = 'approval-' + ref;
    Object.assign(card.dataset, { localLeave: '', approvalId: ref, request: JSON.stringify(request), handled: 'false',
      name: request.applicant, empno: request.empNo, type: request.type, submitDate: request.submitDate,
      start: toHistoryISO(request.fromDate), end: toHistoryISO(request.toDate), days: request.leaveDays });
    card.querySelector('.approval-card-checkbox').checked = false;
    const heading = card.querySelector('.approval-employee-heading');
    heading.textContent = employeeCardHeading.text(request.empNo, request.applicant);
    heading.nextElementSibling.textContent = request.department;
    const link = card.querySelector('.approval-record-link');
    link.href = PendingApprovalPage.href('details', ref);
    link.replaceChildren(createApprovalCardDetails([['Submit Date', request.submitDate], ['Type', request.type], ['Reason', request.reason],
      ['Date Start', request.fromDate], ['Date End', request.toDate], ['Duration', request.duration], ['Remark', request.remark]]));
    card.querySelector('.action-btn-approve').onclick = () => singleApproveCard(card.id, request.applicant);
    card.querySelector('.action-btn-reject').onclick = () => singleRejectCard(card.id);
    card.querySelector('.action-btn-resubmit').onclick = () => singleResubmitCard(card.id, request.applicant);
    return card;
  }

  function syncQueue() {
    const list = document.getElementById('teamApprovalsListContainer');
    const items = records();
    const pending = new Set(items.filter(item => item.status === 'submitted').map(item => item.request.docRef));
    list.querySelectorAll('[data-local-leave]').forEach(card => {
      if (!pending.has(card.dataset.approvalId)) card.remove();
    });
    for (const item of items.slice().reverse()) {
      if (pending.has(item.request.docRef) && !document.getElementById('approval-' + item.request.docRef)) list.prepend(queueCard(item.request));
    }
    submitTeamApprovalsFilterModal(false);
    updateCategoryTabCounts();
  }

  return { storageKey, review, submit, setStatus, history, syncQueue, medical, files };
})();
