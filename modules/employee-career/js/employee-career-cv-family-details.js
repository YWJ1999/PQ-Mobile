(() => {
  const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const unwrap = value => value && typeof value === 'object' && Object.hasOwn(value, 'value') ? value.value : value;
  const fields = [
    ['Name', ['name', 'Member Full Name']],
    ['Relation', ['relation']],
    ['Birth Date', ['birthDate', 'dateOfBirth']],
    ['Status', ['status']],
    ['Rank', ['rank']],
    ['New NRIC', ['newNric', 'nric', 'New NRIC/Birth Cert']],
    ['Birth Cert', ['birthCert', 'birthCertificate']],
    ['Tax Status', ['taxStatus']],
    ['Member Employee No.', ['memberEmployeeNo', 'Member Employee#', 'memberEmpNo', 'empNo']],
    ['Beneficiary', ['beneficiary']],
    ['Allocation%', ['allocation', 'allocationPercent', 'allocationPercentage']],
    ['Attachment', ['attachments', 'attachment']]
  ];

  function display(value, label) {
    value = unwrap(value);
    if (value === '' || value == null || typeof value === 'object') return '\u2014';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (label === 'Member Employee No.') return formatEmployeeNumber(value);
    if (label === 'Birth Date' && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const date = new Date(value + 'T00:00:00');
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(value);
  }

  function renderRows(member, table) {
    const values = new Map(Object.entries({ ...member, ...(member.fields || {}) }).map(([key, value]) => [normalize(key), value]));
    for (const [label, aliases] of fields) {
      const key = aliases.map(normalize).find(alias => values.has(alias));
      const field = values.get(key);
      const row = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.className = 'detail-popout-label';
      heading.textContent = label;
      const cell = document.createElement('td');
      cell.className = 'detail-popout-value';
      if (label === 'Attachment') {
        const value = unwrap(field);
        const attachments = (Array.isArray(value) ? value : value ? [value] : [])
          .map(file => typeof file === 'string' ? file : file?.name || file?.fileName || file?.filename).filter(Boolean);
        if (attachments.length) {
          const list = document.createElement('ul');
          list.className = 'cv-family-member-attachments';
          for (const name of attachments) {
            const item = document.createElement('li');
            item.textContent = name;
            list.append(item);
          }
          cell.append(list);
        } else cell.textContent = 'No attachments';
      } else {
        const value = document.createElement('span');
        value.className = 'cv-history-field-value';
        value.textContent = display(field, label);
        if (field?.changed || (member.changed && ['Name', 'Relation'].includes(label))) cell.classList.add('cv-history-field-changed');
        cell.append(value);
      }
      row.append(heading, cell);
      table.append(row);
    }
  }

  function open(member, opener) {
    if (!member || document.querySelector('.cv-family-member-dialog[open]')) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'cv-family-member-dialog';
    dialog.setAttribute('aria-labelledby', 'cvFamilyMemberTitle');
    dialog.innerHTML = '<section class="detail-popout-panel"><header class="detail-popout-header"><h2 id="cvFamilyMemberTitle" class="detail-popout-title">Family Member Details</h2><button type="button" class="detail-popout-close" aria-label="Close family member details"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header><div class="detail-popout-body"><table class="detail-popout-table" aria-label="Family member details"><tbody></tbody></table></div></section>';
    renderRows(member, dialog.querySelector('tbody'));
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    dialog.addEventListener('click', event => {
      event.stopPropagation();
      if (event.target === dialog || event.target.closest('.detail-popout-close')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }, { once: true });
    (opener?.closest('.phone-container') || document.body).append(dialog);
    dialog.showModal();
    dialog.querySelector('button').focus({ preventScroll: true });
  }

  window.EmployeeCareerCVFamilyDetails = { open, renderRows };
})();
