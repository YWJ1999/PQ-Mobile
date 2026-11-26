const shiftDurationFormat = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

function parseShiftNumber(value) {
  const raw = typeof value === 'string' ? value.trim().replaceAll(',', '') : value;
  return raw == null || raw === '' ? NaN : Number(raw);
}

function formatShiftDuration(value) {
  const duration = parseShiftNumber(value);
  return Number.isFinite(duration) ? shiftDurationFormat.format(duration) : '—';
}

function totalLeaveDays({ leaveDays, employees, headcount }) {
  const reported = parseShiftNumber(leaveDays);
  if (Number.isFinite(reported)) return reported;
  // A partial roster cannot supply the total for the whole group.
  const roster = employees ?? [];
  if (roster.length !== parseShiftNumber(headcount)) return NaN;
  return roster.reduce((sum, employee) => sum + parseShiftNumber(employee.leaveDay), 0);
}

function formatShiftSummaryDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace('Sept', 'Sep');
}

function workShiftDisplayName(shift) {
  if (!shift) return '—';
  // Some shift codes append a W to the end time.
  const label = shift.trim().replace(/([:.]\d{2,4}|\b[AP]M)\s*W$/i, '$1');
  // Both compact (0700:1500) and dotted (8.30:17.30W) codes occur in attendance records.
  const range = /^(\d{1,2})\.?([0-5]\d):(\d{1,2})\.?([0-5]\d)([a-z]+|\([^)]+\))?$/i.exec(label);
  if (!range) {
    return label.replace(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s+(AM|PM)\b/gi, (_, hour, minute, period) => {
      const hour24 = Number(hour) % 12 + (period.toUpperCase() === 'PM' ? 12 : 0);
      return `${String(hour24).padStart(2, '0')}:${minute}`;
    });
  }
  const [, startHour, startMinute, endHour, endMinute, suffix] = range;
  const time = `${startHour.padStart(2, '0')}:${startMinute} – ${endHour.padStart(2, '0')}:${endMinute}`;
  return suffix ? `${time} ${suffix}` : time;
}

function shiftEmployeeButton(record, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  if (record.id != null) button.dataset.detailId = record.id;
  if (record.groupId != null) button.dataset.groupId = record.groupId;
  button.addEventListener('click', () => onSelect(record, button));
  return button;
}

function appendShiftHeadcountRow(body, record, label, description, onSelect, plannedHours) {
  const row = body.insertRow();
  const heading = document.createElement('th');
  heading.scope = 'row';
  heading.textContent = label;
  row.append(heading);

  const button = shiftEmployeeButton(record, onSelect);
  button.className = 'shift-headcount-button';
  button.textContent = record.headcount.toLocaleString('en-GB');
  row.insertCell().append(button);
  let actionLabel = `View employees for ${description}, headcount ${button.textContent}`;
  if (plannedHours !== undefined) {
    row.insertCell().textContent = plannedHours;
    actionLabel += `, ${plannedHours} planned hours`;
  }
  button.setAttribute('aria-label', actionLabel);
  return button;
}

function workShiftMetrics(record, includeHeadcount = true) {
  const metrics = document.createElement('span');
  metrics.className = 'work-shift-metrics';
  const fields = [
    ['Scheduled hours', 'scheduled', formatShiftDuration(record.scheduledHours)],
    ['Work hours', 'worked', formatShiftDuration(record.workHours)]
  ];
  if (includeHeadcount) fields.unshift(['Headcount', 'headcount', record.headcount ?? '—']);
  for (const [label, key, value] of fields) {
    const field = document.createElement('span');
    const caption = document.createElement('span');
    caption.className = 'work-shift-label';
    caption.textContent = label;
    const number = document.createElement('strong');
    number.dataset[key] = '';
    number.textContent = value;
    field.append(caption, number);
    metrics.append(field);
  }
  return metrics;
}

class AttendanceShiftSummary extends HTMLElement {
  render({ date, scope = {}, records, onSelect }) {
    this.innerHTML = `
      <section class="record-summary-card work-shift-context" aria-label="Date and organization">
        <div class="work-shift-context-top">
          <div>
            <span class="work-shift-label">Date</span>
            <strong class="work-shift-date"><i class="fa-regular fa-calendar-days" aria-hidden="true"></i><span data-date></span></strong>
          </div>
          <span class="work-shift-count"></span>
        </div>
        <dl class="work-shift-scope">
          <div><dt>Company</dt><dd data-company></dd></div>
          <div><dt>Section</dt><dd data-section></dd></div>
          <div><dt>Cost center</dt><dd data-cost-center></dd></div>
        </dl>
      </section>
      <div class="work-shift-records"></div>`;

    this.querySelector('[data-date]').textContent = formatShiftSummaryDate(date);
    this.querySelector('.work-shift-count').textContent = PeopleHcmRecordSummary.formatCount(records.length).toLowerCase();
    this.querySelector('[data-company]').textContent = scope.company || 'All companies';
    this.querySelector('[data-section]').textContent = scope.section || 'All sections';
    this.querySelector('[data-cost-center]').textContent = scope.costCenter || 'All cost centers';

    const list = this.querySelector('.work-shift-records');
    if (records.length) {
      this.renderRecords(list, records, onSelect);
    } else {
      const empty = document.createElement('p');
      empty.className = 'work-shift-empty';
      empty.textContent = 'No records match the current filter.';
      list.append(empty);
    }
  }
}

class WorkShiftSummary extends AttendanceShiftSummary {
  renderRecords(list, records, onSelect) {
    for (const record of records) {
      const card = shiftEmployeeButton(record, onSelect);
      card.className = 'history-card-item work-shift-card';
      card.innerHTML = `
        <span class="history-time-row work-shift-card-header">
          <i class="fa-regular fa-clock" aria-hidden="true"></i>
          <strong></strong>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </span>`;
      card.querySelector('.work-shift-card-header strong').textContent = workShiftDisplayName(record.shift);
      card.append(workShiftMetrics(record));
      list.append(card);
    }
  }
}

class NoWorkSummary extends AttendanceShiftSummary {
  renderRecords(list, records, onSelect) {
    list.innerHTML = `
      <div class="history-card-item shift-table-card no-work-table-card">
        <table class="shift-headcount-table no-work-table" aria-label="No work headcount by shift">
          <thead><tr><th scope="col">Shift</th><th scope="col">Headcount</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    const body = list.querySelector('tbody');
    for (const record of records) {
      const shift = record.shift || 'No Work';
      appendShiftHeadcountRow(body, record, shift, shift, onSelect).classList.add('no-work-headcount');
    }
  }
}

function groupShiftRecordsByType(records, typeField) {
  const shifts = new Map();
  let headcount = 0;
  let plannedHours = 0;
  for (const record of records) {
    const shift = record.shift?.trim() || '—';
    const type = record[typeField]?.trim() || '—';
    if (!shifts.has(shift)) shifts.set(shift, new Map());
    const types = shifts.get(shift);
    const key = type.toLowerCase();
    if (!types.has(key)) {
      const entry = { ...record, shift, [typeField]: type, headcount: 0, employees: [] };
      if (typeField === 'otType') entry.hours = 0;
      else entry.leaveDays = 0;
      types.set(key, entry);
    }
    const entry = types.get(key);
    const count = parseShiftNumber(record.headcount);
    entry.headcount += count;
    entry.employees.push(...(record.employees ?? []));
    headcount += count;
    if (typeField === 'otType') {
      const hours = parseShiftNumber(record.hours);
      entry.hours += hours;
      plannedHours += hours;
    } else {
      entry.leaveDays += totalLeaveDays(record);
    }
  }
  return { shifts, headcount, plannedHours };
}

function shiftTypeLabel(type) {
  if (type !== type.toUpperCase() || !type.includes(' ')) return type;
  return type.toLowerCase().replace(/\bot\b|\b[a-z]/g, word => word.toUpperCase());
}

class GroupedShiftSummary extends HTMLElement {
  render({ date, records, totalHeadcount, onSelect }) {
    const typeField = this.constructor.typeField;
    const hasHours = typeField === 'otType';
    const category = hasHours ? 'OT' : 'Leave';
    this.selectedButton = null;
    this.innerHTML = `
      <dl class="history-card-item record-summary-card shift-headcount-overview" aria-label="${category} totals">
        <div><dt class="work-shift-label">Date</dt><dd data-date></dd></div>
        <div><dt class="work-shift-label">Total headcount</dt><dd data-headcount></dd></div>
        ${hasHours ? '<div><dt class="work-shift-label">Total planned hours</dt><dd data-planned-hours></dd></div>' : ''}
      </dl>
      <div class="work-shift-records"></div>`;
    const { shifts, headcount, plannedHours } = groupShiftRecordsByType(records, typeField);
    this.querySelector('[data-date]').textContent = formatShiftSummaryDate(date);
    this.querySelector('[data-headcount]').textContent = (totalHeadcount ?? headcount).toLocaleString('en-GB');
    if (hasHours) this.querySelector('[data-planned-hours]').textContent = formatShiftDuration(plannedHours);

    const list = this.querySelector('.work-shift-records');
    if (!shifts.size) {
      list.innerHTML = `<p class="work-shift-empty">No ${hasHours ? 'OT plan' : 'leave'} records match this selection.</p>`;
      return;
    }
    const selectRecord = (record, button) => {
      this.selectedButton = button;
      onSelect(record);
    };
    for (const [shift, types] of shifts) {
      const card = document.createElement('details');
      card.className = 'history-card-item shift-table-card shift-type-group';
      card.open = true;
      card.innerHTML = `
        <summary class="history-time-row work-shift-card-header">
          <i class="fa-regular fa-clock" aria-hidden="true"></i><strong></strong>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </summary>
        <table class="shift-headcount-table">
          <thead><tr>
            <th scope="col">${category} type</th><th scope="col">Headcount</th>
            ${hasHours ? '<th scope="col">Planned hours</th>' : ''}
          </tr></thead>
          <tbody></tbody>
        </table>`;
      card.querySelector('summary strong').textContent = `Shift · ${shift}`;
      card.querySelector('table').setAttribute('aria-label', `${category} headcount${hasHours ? ' and planned hours' : ''} for shift ${shift}`);
      const body = card.querySelector('tbody');
      for (const entry of types.values()) {
        const label = shiftTypeLabel(entry[typeField]);
        const hours = hasHours ? formatShiftDuration(entry.hours) : undefined;
        appendShiftHeadcountRow(body, entry, label, `${label}, shift ${shift}`, selectRecord, hours);
      }
      list.append(card);
    }
  }
}

class LeaveSummary extends GroupedShiftSummary {
  static typeField = 'leaveType';
}

class OtPlanSummary extends GroupedShiftSummary {
  static typeField = 'otType';
}

class WorkShiftEmployeeDetail extends HTMLElement {
  render(record) {
    this.innerHTML = `
      <section class="record-summary-card work-shift-overview" aria-label="Shift totals">
        <h2 class="work-shift-detail-title"><i class="fa-regular fa-clock" aria-hidden="true"></i><span></span></h2>
      </section>
      <section class="work-shift-roster">
        <h2>Employees</h2>
        <div class="work-shift-employee-list"></div>
      </section>`;
    this.querySelector('.work-shift-detail-title span').textContent = `Shift · ${workShiftDisplayName(record.shift)}`;
    this.querySelector('.work-shift-overview').append(workShiftMetrics(record));

    const list = this.querySelector('.work-shift-employee-list');
    for (const employee of record.employees ?? []) {
      const card = document.createElement('article');
      card.className = 'history-card-item work-shift-employee-card';
      card.innerHTML = '<header class="history-time-row work-shift-employee-header"><h3></h3><p></p></header>';
      card.querySelector('h3').textContent = employeeCardHeading.text(employee.empNo ?? employee.id, employee.name);
      card.querySelector('p').textContent = employee.jobTitle || '—';
      card.append(workShiftMetrics(employee, false));
      list.append(card);
    }
    if (!list.childElementCount) {
      const empty = document.createElement('p');
      empty.className = 'work-shift-empty';
      empty.textContent = 'No employee details available.';
      list.append(empty);
    }
  }
}

class NoWorkEmployeeDetail extends HTMLElement {
  render({ shift, headcount, employees }) {
    this.innerHTML = `
      <dl class="history-card-item record-summary-card shift-headcount-overview no-work-detail-overview" aria-label="Shift totals">
        <div><dt class="work-shift-label">Shift</dt><dd data-shift></dd></div>
        <div><dt class="work-shift-label">Total headcount</dt><dd data-headcount></dd></div>
      </dl>
      <div class="history-card-item shift-table-card no-work-table-card"></div>`;
    const shiftLabel = shift?.trim();
    this.querySelector('[data-shift]').textContent = shiftLabel?.toLowerCase() === 'no work' ? '—' : workShiftDisplayName(shiftLabel);
    this.querySelector('[data-headcount]').textContent = headcount?.toLocaleString('en-GB') ?? '—';

    const roster = this.querySelector('.no-work-table-card');
    if (!employees?.length) {
      roster.innerHTML = '<p class="work-shift-empty">No employee details available.</p>';
      return;
    }

    roster.innerHTML = `
      <table class="no-work-employee-table" aria-label="No work employees">
        <thead><tr><th scope="col">Emp No.</th><th scope="col">Name</th><th scope="col">Job title</th></tr></thead>
        <tbody></tbody>
      </table>`;
    const body = roster.querySelector('tbody');
    for (const employee of employees) {
      const row = body.insertRow();
      row.insertCell().textContent = formatEmployeeNumber(employee.empNo ?? employee.id) || '—';
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = employee.name || '—';
      row.append(name);
      row.insertCell().textContent = employee.jobTitle || '—';
    }
  }
}

class ShiftTypeEmployeeDetail extends HTMLElement {
  renderDetail({ date, shift, headcount, employees }, { type, column, employeeField, total, totalAttribute }) {
    this.innerHTML = `
      <section class="history-card-item record-summary-card shift-employee-overview" aria-label="${column} summary">
        <h2 class="history-time-row"></h2>
        <p class="shift-employee-context">
          <span><i class="fa-regular fa-calendar-days" aria-hidden="true"></i> <span data-date></span></span>
          <span>Shift <span data-shift></span></span>
        </p>
        <dl class="shift-headcount-overview">
          <div><dt class="work-shift-label">Total headcount</dt><dd data-headcount></dd></div>
          <div><dt class="work-shift-label">Total ${column.toLowerCase()}</dt><dd ${totalAttribute}></dd></div>
        </dl>
      </section>
      <div class="history-card-item shift-table-card"></div>`;
    this.querySelector('h2').textContent = shiftTypeLabel(type?.trim() || '—');
    this.querySelector('[data-date]').textContent = formatShiftSummaryDate(date);
    this.querySelector('[data-shift]').textContent = shift?.trim() || '—';
    this.querySelector('[data-headcount]').textContent = headcount?.toLocaleString('en-GB') ?? '—';
    this.querySelector(`[${totalAttribute}]`).textContent = formatShiftDuration(total);

    const roster = this.querySelector('.shift-table-card');
    if (!employees?.length) {
      roster.innerHTML = '<p class="work-shift-empty">No employee details available.</p>';
      return;
    }
    roster.innerHTML = `
      <table class="shift-employee-table" aria-label="${column} by employee">
        <thead><tr><th scope="col">Employee</th><th scope="col">Job position</th><th scope="col">${column}</th></tr></thead>
        <tbody></tbody>
      </table>`;
    const body = roster.querySelector('tbody');
    for (const employee of employees) {
      const row = body.insertRow();
      const identity = document.createElement('th');
      identity.scope = 'row';
      const number = formatEmployeeNumber(employee.empNo ?? employee.id);
      const heading = employeeCardHeading.text(number, employee.name);
      if (number && (heading === number || heading.startsWith(number + ' - '))) {
        const id = document.createElement('span');
        id.className = 'shift-employee-number';
        id.textContent = number;
        identity.append(id, heading.slice(number.length));
      } else {
        identity.textContent = heading;
      }
      row.append(identity);
      row.insertCell().textContent = employee.jobTitle?.trim() || '—';
      row.insertCell().textContent = formatShiftDuration(employee[employeeField]);
    }
  }
}

class OtPlanEmployeeDetail extends ShiftTypeEmployeeDetail {
  render(record) {
    this.renderDetail(record, {
      type: record.otType, column: 'Planned hours', employeeField: 'hours',
      total: record.hours, totalAttribute: 'data-planned-hours'
    });
  }
}

class LeaveEmployeeDetail extends ShiftTypeEmployeeDetail {
  render(record) {
    this.renderDetail(record, {
      type: record.leaveType, column: 'Leave days', employeeField: 'leaveDay',
      total: totalLeaveDays(record), totalAttribute: 'data-leave-days'
    });
  }
}

customElements.define('work-shift-summary', WorkShiftSummary);
customElements.define('no-work-summary', NoWorkSummary);
customElements.define('leave-summary', LeaveSummary);
customElements.define('ot-plan-summary', OtPlanSummary);
customElements.define('work-shift-employee-detail', WorkShiftEmployeeDetail);
customElements.define('no-work-employee-detail', NoWorkEmployeeDetail);
customElements.define('ot-plan-employee-detail', OtPlanEmployeeDetail);
customElements.define('leave-employee-detail', LeaveEmployeeDetail);
