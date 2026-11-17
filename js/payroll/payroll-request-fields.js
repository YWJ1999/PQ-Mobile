// Both the applicant and the approver use the same request card.
const PayrollRequestFields = (() => {
  const upload = `<div class="payroll-upload" role="group" aria-labelledby="attachmentTitle">
              <h3 class="form-section-heading" id="attachmentTitle">Upload Attachments</h3>
              <div class="payroll-upload-actions">
                <button type="button" class="payroll-upload-button" id="payrollChooseFiles"><span class="payroll-upload-icon"><i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i></span><span>Select File(s)</span></button>
                <button type="button" class="payroll-upload-button is-camera" id="payrollTakePicture"><span class="payroll-upload-icon"><i class="fa-solid fa-camera" aria-hidden="true"></i></span><span>Take a Picture</span></button>
              </div>
              <div class="payroll-file-list" id="payrollFileList" aria-live="polite"></div>
              <input id="payrollFiles" type="file" multiple hidden>
              <input id="payrollCamera" type="file" accept="image/*" capture="environment" hidden>
            </div>`;
  const cards = {
    tax: `<section class="claim-form-card" aria-labelledby="taxDetailsTitle">
          <div class="claim-section-header">
            <div class="claim-section-title-wrap"><span class="claim-section-accent" aria-hidden="true"></span><h2 class="claim-section-title" id="taxDetailsTitle">Tax Relief Details</h2></div>
          </div>
          <div class="claim-form-stack">
            <div class="claim-field"><label class="claim-field-label" for="transactionDate">Transaction Date</label><input class="claim-control" type="date" id="transactionDate" name="transactionDate" value="2026-10-01"></div>
            <div class="claim-field"><label class="claim-field-label" for="rebateItem">Rebate Item <span class="claim-required">*</span></label><div class="payroll-select"><select class="claim-control" id="rebateItem" name="rebateItem" required><option value="">Select Rebate Item</option></select><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></div></div>
            <div class="claim-field-grid">
              <div class="claim-field"><label class="claim-field-label" for="receiptNo">Receipt No</label><input class="claim-control" id="receiptNo" name="receiptNo" type="text" placeholder="Receipt number" maxlength="100"></div>
              <div class="claim-field"><label class="claim-field-label" for="amount">Amount</label><div class="payroll-money"><span>RM</span><input class="claim-control" id="amount" name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="0.00"></div></div>
            </div>
            <div class="claim-field"><label class="claim-field-label" for="description">Description</label><textarea class="claim-control" id="description" name="description" rows="2" placeholder="Describe the relief item" maxlength="2000"></textarea></div>
            <div class="claim-field"><label class="claim-field-label" for="remarks">Remarks</label><textarea class="claim-control" id="remarks" name="remarks" rows="2" placeholder="Add optional remarks" maxlength="2000"></textarea></div>
${upload}
          </div>
        </section>`,
    deduction: `<section class="claim-form-card" aria-labelledby="deductionDetailsTitle">
          <div class="claim-section-header">
            <div class="claim-section-title-wrap"><span class="claim-section-accent" aria-hidden="true"></span><h2 class="claim-section-title" id="deductionDetailsTitle">Deduction Details</h2></div>
          </div>
          <div class="claim-form-stack">
            <div class="claim-field"><label class="claim-field-label" for="deductionType">Deduction Type <span class="claim-required">*</span></label><div class="payroll-select"><select class="claim-control" id="deductionType" name="deductionType" required><option value="">Select Deduction Type</option></select><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></div></div>
            <div class="claim-field"><label class="claim-field-label" for="requestType">Request Type</label><div class="payroll-select"><select class="claim-control" id="requestType" name="requestType"><option value="Stop Deduction">Stop Deduction</option></select><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></div></div>
            <div class="claim-field-grid">
              <div class="claim-field"><label class="claim-field-label" for="stopPeriod">Stop Period</label><input class="claim-control" id="stopPeriod" name="stopPeriod" type="text" inputmode="numeric" pattern="[0-9]{4}(0[1-9]|1[0-2])" maxlength="6" placeholder="YYYYMM" title="Enter a valid period in YYYYMM format, for example 202610" value="202610"></div>
              <div class="claim-field"><label class="claim-field-label" for="stopDate">Stop Date</label><input class="claim-control" id="stopDate" name="stopDate" type="date" value="2026-10-01"></div>
            </div>
            <div class="claim-field"><label class="claim-field-label" for="stopCycle">Stop Cycle</label><div class="payroll-select"><select class="claim-control" id="stopCycle" name="stopCycle"><option value="MONTH END">MONTH END</option></select><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></div></div>
            <div class="claim-field"><label class="claim-field-label" for="accountNo">Account #</label><input class="claim-control" id="accountNo" name="accountNo" type="text" placeholder="Account number" maxlength="100"></div>
            <div class="claim-field"><label class="claim-field-label" for="remarks">Remarks</label><textarea class="claim-control" id="remarks" name="remarks" rows="2" placeholder="Add optional remarks" maxlength="2000"></textarea></div>
${upload}
          </div>
        </section>`
  };

  function create(kind, record, fileUrls) {
    const template = document.createElement('template');
    template.innerHTML = cards[kind];
    const card = template.content.firstElementChild;
    if (!record) return card;
    // Earlier start requests contain a pay period and a date range instead of stop instructions.
    if (kind === 'deduction' && !record.stopPeriod && !record.stopDate && !record.stopCycle &&
        (record.dateFrom || record.dateTo || record.deductionDate || record.period)) {
      const startFields = [
        ['period', 'Period'], ['cycle', 'Cycle'], ['dateFrom', 'Date From'], ['dateTo', 'Date To'],
        ['deductionDate', 'Deduction Date'], ['days', 'Days'], ['amount', 'Amount']
      ];
      const grid = card.querySelector('.claim-field-grid');
      card.querySelector('#stopCycle').closest('.claim-field').remove();
      grid.replaceChildren();
      for (const [key, title] of startFields) {
        if (record[key] == null || record[key] === '') continue;
        const field = document.createElement('div');
        field.className = 'claim-field';
        const label = document.createElement('label');
        label.className = 'claim-field-label';
        label.htmlFor = key;
        label.textContent = title;
        const control = document.createElement('input');
        control.id = control.name = key;
        if (['dateFrom', 'dateTo', 'deductionDate'].includes(key)) control.type = 'date';
        field.append(label, control);
        grid.append(field);
      }
    }
    for (const control of card.querySelectorAll('[name]')) {
      const key = control.name;
      const label = control.closest('.claim-field').querySelector('.claim-field-label');
      label.removeAttribute('for');
      label.querySelector('.claim-required')?.remove();
      const output = document.createElement('div');
      output.className = 'claim-control payroll-review-value';
      output.dataset.payrollField = key;
      const value = record[key];
      let text = value;
      if (value != null && value !== '') {
        if (key === 'amount') text = 'RM ' + Number(value).toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (control.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          text = new Date(value + 'T00:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
        }
      }
      output.textContent = text == null || text === '' ? '—' : text;
      (control.closest('.payroll-select, .payroll-money') || control).replaceWith(output);
    }
    const uploadBox = card.querySelector('.payroll-upload');
    const title = uploadBox.querySelector('h3');
    title.textContent = 'Attachments';
    const list = uploadBox.querySelector('.payroll-file-list');
    list.removeAttribute('aria-live');
    uploadBox.replaceChildren(title, list);
    for (const attachment of record.attachments || []) {
      const row = document.createElement('div');
      row.className = 'payroll-file-row';
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-paperclip';
      icon.setAttribute('aria-hidden', 'true');
      const available = attachment.file instanceof Blob;
      const name = document.createElement(available ? 'a' : 'span');
      name.className = 'payroll-file-name';
      name.textContent = attachment.name;
      if (available) {
        name.href = URL.createObjectURL(attachment.file);
        name.download = attachment.name;
        fileUrls.push(name.href);
      }
      row.append(icon, name);
      list.append(row);
    }
    if (!list.childElementCount) list.textContent = 'No attachments';
    return card;
  }

  return { create };
})();
