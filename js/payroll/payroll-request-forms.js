/* Individual payroll form preview. Records and actual attachment files stay on this device. */
(() => {
  'use strict';
  const form = document.getElementById('payrollForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const kind = form.dataset.requestKind;
  $('payrollRequestFields').replaceWith(PayrollRequestFields.create(kind));
  const employee = window.PAYROLL_CONFIG.employee;
  const recordKey = `${employee.empNo}:${kind}`;
  const fields = Array.from(form.querySelectorAll('[name]'));
  let attachments = [], urls = [], dirty = false, busy = false, loaded = false, submitted = false;
  let revision = 0;
  let savedValues = {}, savedAttachments = [], hasSavedRecord = false;

  function status(message, error = false) {
    $('payrollFormStatus').textContent = message;
    $('payrollFormStatus').classList.toggle('is-error', error);
  }

  function markDirty() {
    dirty = true;
    revision++;
    status('Unsaved changes');
  }

  function renderFiles() {
    urls.forEach(url => URL.revokeObjectURL(url));
    urls = [];
    $('payrollFileList').replaceChildren();
    attachments.forEach((attachment, index) => {
      const row = document.createElement('div');
      row.className = 'payroll-file-row';
      const icon = document.createElement('i');
      icon.className = attachment.file.type.startsWith('image/') ? 'fa-regular fa-image' : 'fa-regular fa-file-lines';
      icon.setAttribute('aria-hidden', 'true');
      const download = document.createElement('a');
      download.className = 'payroll-file-name';
      download.textContent = attachment.name;
      download.download = attachment.name;
      download.href = URL.createObjectURL(attachment.file);
      urls.push(download.href);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'payroll-file-remove';
      remove.setAttribute('aria-label', `Remove ${attachment.name}`);
      const closeIcon = document.createElement('i');
      closeIcon.className = 'fa-solid fa-xmark';
      closeIcon.setAttribute('aria-hidden', 'true');
      remove.append(closeIcon);
      remove.addEventListener('click', () => {
        attachments.splice(index, 1);
        markDirty();
        renderFiles();
        ($('payrollFileList').querySelector('.payroll-file-remove') || $('payrollChooseFiles')).focus();
      });
      row.append(icon, download, remove);
      $('payrollFileList').append(row);
    });
  }

  function addFiles(input) {
    if (!input.files.length) return;
    for (const file of input.files) {
      const duplicate = attachments.some(item => item.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
      if (!duplicate) attachments.push({ name: file.name, file });
    }
    input.value = '';
    markDirty();
    renderFiles();
  }

  function validateField(field) {
    // Keep required free-entry fields from accepting whitespace only.
    if (field.required && field.type === 'text') field.setCustomValidity(field.value.trim() ? '' : 'Please enter a value.');
    if (field.validity.valid) field.removeAttribute('aria-invalid');
  }

  function leaveForm() {
    if (busy) return;
    if (dirty) $('payrollExitDialog').showModal();
    else window.location.href = '../index.html?scope=individual';
  }

  function cancelForm() {
    if (busy) return;
    dirty = false;
    if (window.history.length > 1) window.history.back();
    else window.location.href = '../index.html?scope=individual';
  }

  fields.forEach(field => {
    field.addEventListener('input', () => {
      validateField(field);
      markDirty();
    });
    field.addEventListener('invalid', () => field.setAttribute('aria-invalid', 'true'));
  });
  $('payrollChooseFiles').addEventListener('click', () => $('payrollFiles').click());
  $('payrollTakePicture').addEventListener('click', () => $('payrollCamera').click());
  $('payrollFiles').addEventListener('change', event => addFiles(event.target));
  $('payrollCamera').addEventListener('change', event => addFiles(event.target));
  $('payrollBack').addEventListener('click', leaveForm);
  $('payrollCancel').addEventListener('click', cancelForm);
  $('payrollKeepEditing').addEventListener('click', () => $('payrollExitDialog').close());
  $('payrollDiscard').addEventListener('click', () => {
    fields.forEach(field => { field.value = savedValues[field.name] ?? ''; field.setCustomValidity(''); field.removeAttribute('aria-invalid'); });
    attachments = [...savedAttachments];
    renderFiles();
    $('payrollExitDialog').close();
    dirty = false;
    status(hasSavedRecord ? 'Saved on this device' : '');
    window.location.href = '../index.html?scope=individual';
  });
  window.addEventListener('beforeunload', event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  // Keep attachment URLs alive while this document is cached for browser Back.
  // Replaced URLs are revoked in renderFiles; unloading the document releases the rest.

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !loaded || (kind === 'deduction' && submitted && !dirty)) return;
    fields.forEach(validateField);
    if (!form.reportValidity()) return;
    busy = true;
    $('payrollSubmit').disabled = true;
    const savingRevision = revision;
    const record = {
      id: recordKey,
      employeeId: employee.empNo,
      kind,
      values: Object.fromEntries(fields.map(field => [field.name, field.value])),
      attachments: [...attachments],
      savedAt: new Date().toISOString()
    };
    status('Saving…');
    try {
      await PayrollRequests.save(record, kind === 'deduction', employee);
      submitted = kind === 'deduction';
      savedValues = { ...record.values };
      savedAttachments = [...record.attachments];
      hasSavedRecord = true;
      dirty = revision !== savingRevision;
      status(dirty ? 'Unsaved changes' : 'Saved on this device');
    } catch (error) {
      status('Unable to save. Your entries are still here; please try again.', true);
    } finally {
      busy = false;
      $('payrollSubmit').disabled = false;
    }
  });

  async function init() {
    // Reuse existing preview categories without introducing tax rules or statutory limits.
    if (kind === 'tax') {
      const categories = new Set((window.PAYROLL_CONFIG.teamTaxRelief?.submissions || []).map(item => item.category));
      for (const category of categories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        $('rebateItem').append(option);
      }
    }
    if (kind === 'deduction') {
      const deductions = new Set(Object.values(window.PAYROLL_CONFIG.payslips || {}).flatMap(payslip => (payslip.deductions || []).map(item => item.name)));
      for (const deduction of deductions) $('deductionType').add(new Option(deduction, deduction));
    }
    // Lock inputs until saved values load so a late read cannot overwrite user edits.
    fields.forEach(field => { field.disabled = true; });
    $('payrollChooseFiles').disabled = true;
    $('payrollTakePicture').disabled = true;
    try {
      const record = await PayrollRequests.get(recordKey);
      submitted = Boolean(record?.submittedId);
      if (record) {
        fields.forEach(field => {
          if (!field.readOnly && Object.hasOwn(record.values, field.name)) {
            const savedValue = record.values[field.name];
            // Preserve items saved when these fields allowed free entry.
            if (field.tagName === 'SELECT' && savedValue && !Array.from(field.options).some(option => option.value === savedValue)) {
              field.add(new Option(savedValue, savedValue));
            }
            field.value = savedValue;
          }
        });
        attachments = (record.attachments || []).filter(item => item.file instanceof Blob);
        renderFiles();
      }
      savedValues = Object.fromEntries(fields.map(field => [field.name, field.value]));
      savedAttachments = [...attachments];
      hasSavedRecord = Boolean(record);
      status(record ? 'Saved on this device' : '');
      loaded = true;
      fields.forEach(field => { field.disabled = false; });
      $('payrollChooseFiles').disabled = false;
      $('payrollTakePicture').disabled = false;
      $('payrollSubmit').disabled = false;
    } catch (error) {
      status('Unable to load your saved form. Reload this page to try again.', true);
    }
  }
  init();
})();
