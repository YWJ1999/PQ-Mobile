const BenefitClaimForm = (() => {
  const template = document.createElement('template');
  template.innerHTML = `
    <section class="benefit-claim-fields" aria-label="Benefit Details" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 24px; padding: 20px; box-shadow: var(--shadow-card); margin-bottom: 20px;">
      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h2 class="form-section-heading" style="font-size: 19px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.3px; margin: 0;">Benefit Details</h2>
          <div style="font-size: 12.5px; font-weight: 700; color: var(--text-muted);">
            Entitlement Year <strong data-benefit-field="entitlementYear" style="color: var(--text-primary);">2026</strong>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label class="field-label">Benefit Type <span class="req">*</span></label>
            <select id="mainApplyBenefitTypeSelect" data-benefit-field="benefitType" class="form-input-ctrl" onchange="handleBenefitTypeChange(this.value)">
              <option value="CAR MAINTENANCE">CAR MAINTENANCE</option>
              <option value="PERSONAL ALLOWANCE">PERSONAL ALLOWANCE</option>
              <option value="MOBILE PHONE">MOBILE PHONE</option>
              <option value="OPTICAL &amp; DENTAL">OPTICAL &amp; DENTAL</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="field-label" style="margin-bottom: 0; min-width: 120px;">Entitled Balance</span>
              <strong id="entitledBalanceDisplay" data-benefit-field="entitledBalance" class="balance-pill">1000.00</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="field-label" style="margin-bottom: 0; min-width: 120px;">Usable Balance</span>
              <strong id="usableBalanceDisplay" data-benefit-field="usableBalance" class="balance-pill">803.00</strong>
            </div>
          </div>
          <div>
            <label class="field-label">Claim Period <span class="req">*</span></label>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
              <select id="claimPeriodYear" data-benefit-field="periodYear" class="form-input-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
              <select id="claimPeriodMonth" data-benefit-field="periodMonth" class="form-input-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
                <option value="June">June</option>
              </select>
            </div>
          </div>
          <div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
              <div>
                <label class="field-label">Start Date</label>
                <input type="date" id="startDateInput" data-benefit-field="fromDate" class="form-input-ctrl" value="2026-09-22" aria-label="Start Date" />
              </div>
              <div>
                <label class="field-label">End Date</label>
                <input type="date" id="endDateInput" data-benefit-field="toDate" class="form-input-ctrl" value="2026-09-22" aria-label="End Date" />
              </div>
            </div>
          </div>
          <div>
            <label class="field-label">Purpose <span class="req">*</span></label>
            <input type="text" id="purposeInput" data-benefit-field="purpose" class="form-input-ctrl" placeholder="Enter claim purpose..." />
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
            <div>
              <label class="field-label">Receipt # <span class="req">*</span></label>
              <input type="text" id="receiptNoInput" data-benefit-field="receiptNo" class="form-input-ctrl" placeholder="Receipt #" />
            </div>
            <div>
              <label class="field-label">Other Reference #</label>
              <input type="text" id="otherRefNoInput" data-benefit-field="otherRef" class="form-input-ctrl" placeholder="Ref #" />
            </div>
          </div>
          <div>
            <label class="field-label">Currency <span class="req">*</span></label>
            <select id="currencySelect" data-benefit-field="currency" class="form-input-ctrl">
              <option value="US DOLLAR" selected>US DOLLAR</option>
              <option value="MYR">MYR - MALAYSIAN RINGGIT</option>
              <option value="SGD">SGD - SINGAPORE DOLLAR</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
            <div>
              <label class="field-label">Claim Amount <span class="req">*</span></label>
              <input type="number" id="expenseAmountInput" data-benefit-field="amount" class="form-input-ctrl" placeholder="0.00" step="0.01" />
            </div>
            <div>
              <label class="field-label">Claim Quantity <span class="req">*</span></label>
              <input type="number" id="claimQuantityInput" data-benefit-field="claimQuantity" class="form-input-ctrl" value="5" min="1" />
            </div>
          </div>
          <div>
            <label class="field-label">Remarks</label>
            <textarea id="remarksInput" data-benefit-field="remarks" rows="3" class="form-input-ctrl" placeholder="Add optional remarks..." style="font-family: inherit; resize: vertical;"></textarea>
          </div>
          <div data-benefit-attachments style="margin-top: 6px;">
            <label class="field-label form-section-heading" style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; display: block;">Upload Attachment</label>
            <div style="display: flex; align-items: center; justify-content: center; gap: 36px; padding: 12px 0 6px;">
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerClaimFileUpload('file')">
                <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.3); display: flex; align-items: center; justify-content: center; color: var(--purple-primary); font-size: 20px; transition: transform 0.15s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                  <i class="fa-solid fa-file-arrow-up"></i>
                </div>
                <span style="font-size: 13px; font-weight: 700; color: var(--purple-primary);">Select File(s)</span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerClaimFileUpload('camera')">
                <div style="width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 20px; box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45); transition: transform 0.15s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">
                  <i class="fa-solid fa-camera"></i>
                </div>
                <span style="font-size: 13px; font-weight: 800; color: var(--text-primary);">Take a Picture</span>
              </div>
            </div>
            <div id="uploadedClaimFilesChipsList" class="attachment-upload-list"></div>
            <input type="file" id="hiddenClaimFileInput" style="display: none;" onchange="handleClaimFileSelected(this)" />
          </div>
        </div>
      </div>
    </section>`;

  const months = Array.from({ length: 12 }, (_, month) =>
    new Date(2000, month, 1).toLocaleString('en-GB', { month: 'long' }));

  function read(form) {
    const record = {};
    for (const field of form.querySelectorAll('[data-benefit-field]')) {
      record[field.dataset.benefitField] = field.value ?? field.textContent.trim();
    }
    record.period = record.periodYear + String(months.indexOf(record.periodMonth) + 1).padStart(2, '0');
    record.currencyLabel = form.querySelector('#currencySelect').selectedOptions[0].textContent;
    record.amountText = record.amount;
    record.amount = record.amount === '' ? null : Number(record.amount);
    record.attachments = Array.from(form.querySelectorAll('.attachment-upload-name'), element => element.textContent);
    return record;
  }

  function dateLabel(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function create(record) {
    const card = template.content.firstElementChild.cloneNode(true);
    if (!record) return card;
    const period = /^(\d{4})-?(0[1-9]|1[0-2])$/.exec(record.period || '');
    const values = { ...record,
      benefitType: record.benefitType ?? record.subCatName,
      periodYear: record.periodYear ?? period?.[1] ?? record.period,
      periodMonth: record.periodMonth ?? (period ? months[Number(period[2]) - 1] : ''),
      fromDate: dateLabel(record.fromDate ?? record.claimDate),
      toDate: dateLabel(record.toDate ?? record.claimDate),
      currency: record.currencyLabel ?? record.currency,
      amount: record.amountText ?? (typeof record.amount === 'number' ? record.amount.toFixed(2) : record.amount),
      remarks: record.savedBenefit ? record.remarks : record.remarks?.replace(/(?:\s*\|undefined)+\s*$/g, '').trim()
    };
    for (const field of card.querySelectorAll('[data-benefit-field]')) {
      const name = field.dataset.benefitField;
      const value = values[name];
      const output = field.matches('input,select,textarea') ? document.createElement('div') : field;
      if (output !== field) {
        output.className = 'form-input-ctrl benefit-readonly-value';
        field.replaceWith(output);
      }
      output.removeAttribute('id');
      output.dataset.benefitField = name;
      output.textContent = value == null || value === '' ? '—' : value;
    }
    card.querySelectorAll('.req').forEach(el => el.remove());
    const attachments = card.querySelector('[data-benefit-attachments]');
    const heading = attachments.querySelector('label');
    heading.textContent = 'Attachments';
    const list = document.createElement('div');
    list.className = 'attachment-upload-list';
    for (const name of record.attachments || []) {
      const row = document.createElement('div');
      row.className = 'attachment-upload-item';
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-paperclip attachment-upload-icon';
      icon.setAttribute('aria-hidden', 'true');
      row.append(icon, document.createTextNode(name));
      list.append(row);
    }
    if (!list.childElementCount) list.textContent = 'No attachments';
    attachments.replaceChildren(heading, list);
    return card;
  }

  return { create, read };
})();
