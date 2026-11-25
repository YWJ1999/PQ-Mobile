(() => {
  const params = new URLSearchParams(window.location.search);
  const employeeId = params.get('employee');
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const records = window.createDailyOtRecords();
  const employee = records.find(record => record.id === employeeId) || records[0];

  const listUrl = `daily-ot.html?theme=${encodeURIComponent(theme)}`;
  const backLink = document.getElementById('dailyOtBack');
  backLink.href = listUrl;
  backLink.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    backLink.href = `daily-ot.html?theme=${encodeURIComponent(currentTheme)}`;
  });

  const form = document.getElementById('dailyOtForm');
  const recordsContainer = document.getElementById('dailyOtRecords');
  const template = document.getElementById('dailyOtEntry');
  const total = document.getElementById('dailyOtTotal');
  const toast = document.getElementById('dailyOtToast');
  let toastTimer;

  if (!employee?.items.length) {
    document.getElementById('dailyOtUpdate').disabled = true;
    return;
  }

  const entries = employee.items.map((item, index) => {
    const row = template.content.firstElementChild.cloneNode(true);
    const approved = row.querySelector('.daily-ot-approval-input');
    const voidBox = row.querySelector('.daily-ot-void-checkbox');
    const description = item.description.replace(/\b[A-Z]{3,}\b/g, word => word[0] + word.slice(1).toLowerCase());
    row.querySelector('.ot-type-name').textContent = description;
    row.querySelector('.record-readonly').textContent = item.actual;
    approved.id = `dailyOtApproved${index}`;
    approved.setAttribute('aria-label', `Approved time for ${description} (HHMM)`);
    approved.value = item.approve;
    voidBox.id = `dailyOtVoid${index}`;
    voidBox.setAttribute('aria-label', `Void entry for ${description}`);
    voidBox.checked = Boolean(item.voided);
    approved.disabled = voidBox.checked;

    approved.addEventListener('input', () => {
      approved.value = approved.value.replace(/\D/g, '');
      updateTotal();
    });
    voidBox.addEventListener('change', () => {
      if (voidBox.checked && !approved.validity.valid) approved.value = item.approve;
      approved.disabled = voidBox.checked;
      updateTotal();
    });
    recordsContainer.appendChild(row);
    return { item, approved, voidBox };
  });

  function updateTotal() {
    let minutes = 0;
    for (const { approved } of entries) {
      if (approved.disabled) continue;
      if (!approved.validity.valid) {
        total.value = '—';
        return null;
      }
      minutes += Number(approved.value.slice(0, 2)) * 60 + Number(approved.value.slice(2));
    }
    total.value = (minutes / 60).toFixed(2);
    return minutes;
  }
  updateTotal();

  form.addEventListener('submit', event => {
    event.preventDefault();
    const approvedMinutes = updateTotal();
    if (approvedMinutes === null) return;
    entries.forEach(({ item, approved, voidBox }) => {
      item.approve = approved.value;
      item.voided = voidBox.checked;
    });

    const actualMinutes = Math.round(Number.parseFloat(employee.actualHours) * 60);
    employee.approvedHours = total.value;
    employee.unapprovedHours = (Math.max(0, actualMinutes - approvedMinutes) / 60).toFixed(2);
    window.saveDailyOtRecord(employee);

    window.clearTimeout(toastTimer);
    toast.textContent = 'Daily OT updated';
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      toast.textContent = '';
    }, 1800);
  });
})();
