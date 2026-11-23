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

  if (!employee) return;

  const recordsContainer = document.getElementById('dailyOtRecords');
  employee.items.forEach((item, index) => {
    const record = document.createElement('article');
    record.className = 'daily-ot-record';

    record.innerHTML = `
      <h3>${item.description}</h3>
      <div class="record-fields">
        <div class="record-field">
          <span>Actual (HHMM)</span>
          <span class="record-readonly">${item.actual}</span>
        </div>
        <div class="record-field">
          <label for="dailyOtApproved${index}">Approved (HHMM)</label>
          <input id="dailyOtApproved${index}" class="daily-ot-approval-input" type="text" inputmode="numeric" maxlength="4" value="${item.approve}" data-record-index="${index}" aria-label="Approved time for ${item.description}" ${item.voided ? 'disabled' : ''}>
        </div>
        <label class="daily-ot-void-control" for="dailyOtVoid${index}">
          <span>Void</span>
          <input id="dailyOtVoid${index}" class="daily-ot-void-checkbox" type="checkbox" data-record-index="${index}" aria-label="Void ${item.description}" ${item.voided ? 'checked' : ''}>
        </label>
      </div>
    `;
    recordsContainer.appendChild(record);
  });

  function parseHhmm(value) {
    if (!/^\d{4}$/.test(value) || Number(value.slice(2)) > 59) return null;
    return { normalized: value, minutes: Number(value.slice(0, 2)) * 60 + Number(value.slice(2)) };
  }

  document.querySelectorAll('.daily-ot-approval-input').forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      input.setCustomValidity('');
    });
  });

  const actions = document.getElementById('dailyOtActions');
  function syncUpdateVisibility() {
    const count = recordsContainer.querySelectorAll('.daily-ot-void-checkbox:checked').length;
    document.getElementById('dailyOtUpdate').textContent = formatSelectedAction('Void', count);
    actions.hidden = count === 0;
  }

  document.querySelectorAll('.daily-ot-void-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const approved = document.getElementById(`dailyOtApproved${checkbox.dataset.recordIndex}`);
      approved.disabled = checkbox.checked;
      approved.setCustomValidity('');
      syncUpdateVisibility();
    });
  });
  syncUpdateVisibility();

  document.getElementById('dailyOtUpdate').addEventListener('click', () => {
    let approvedMinutes = 0;
    const pendingItems = [];
    for (const input of document.querySelectorAll('.daily-ot-approval-input')) {
      const index = Number(input.dataset.recordIndex);
      const voided = document.getElementById(`dailyOtVoid${index}`).checked;
      const parsed = parseHhmm(input.value);
      if (!voided && !parsed) {
        input.setCustomValidity('Enter four digits in HHMM format, with minutes from 00 to 59.');
        input.reportValidity();
        return;
      }
      pendingItems.push({ index, approve: parsed ? parsed.normalized : employee.items[index].approve, voided });
      if (!voided) approvedMinutes += parsed.minutes;
    }
    pendingItems.forEach(item => {
      employee.items[item.index].approve = item.approve;
      employee.items[item.index].voided = item.voided;
    });

    const actualMinutes = Math.round(Number.parseFloat(employee.actualHours) * 60);
    employee.approvedHours = (approvedMinutes / 60).toFixed(2);
    employee.unapprovedHours = (Math.max(0, actualMinutes - approvedMinutes) / 60).toFixed(2);
    window.saveDailyOtRecord(employee);

    const toast = document.getElementById('dailyOtToast');
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 1800);
  });
})();
