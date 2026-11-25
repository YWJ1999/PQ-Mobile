(() => {
  const grid = document.querySelector('[data-roster-grid]');
  if (!grid) return;

  const initialMonth = calendarMonth(2026, 8);
  const today = '2026-09-11';
  let month = initialMonth;
  let selectedDay = 11;
  const standalone = grid.hasAttribute('data-shift-roster');
  const rosterCells = new Map();
  // The standalone roster includes dated shifts in the following month's preview.
  if (standalone) {
    Array.from(grid.children).forEach((cell, index) => {
      if (cell.querySelector('.cal-date')) {
        rosterCells.set(calendarDateKey(month.date(index - month.mondayOffset + 1)), cell);
      }
    });
  }

  const septemberShifts = [
    'D', 'D', 'D', 'HOL', 'OFF', 'REST',
    'D', 'D', 'CS', 'D', 'D', 'OFF', 'REST',
    'NS', 'D', 'D', 'D', 'D', 'OFF', 'REST',
    'N', 'N', 'N', 'N', 'N', 'OFF', 'REST',
    'D', 'D', 'D'
  ];
  const septemberOvertime = {
    3: ['17:00 – 19:00', 2], 8: ['17:00 – 18:00', 1], 11: ['17:00 – 19:00', 2],
    15: ['17:00 – 19:00', 2], 22: ['18:00 – 20:00', 2], 24: ['19:00 – 20:00', 1],
    29: ['17:00 – 19:00', 2]
  };
  const shifts = {
    day: ['Day shift', '08:00 – 17:00', '#7c3aed'],
    night: ['Night shift', '20:00 – 05:00', '#0d9488'],
    rest: ['Rest day', 'Off duty', '#94a3b8'],
    unknown: ['No shift recorded', '', '#94a3b8']
  };

  function span(className, text) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function codeFor(day) {
    return month.key === initialMonth.key ? septemberShifts[day - 1] : null;
  }

  function showDetails() {
    const date = month.date(selectedDay);
    const code = codeFor(selectedDay);
    let shift = shifts.day;
    if (!code) shift = shifts.unknown;
    else if (code === 'N') shift = shifts.night;
    else if (code === 'REST' || code === 'OFF') shift = shifts.rest;
    document.getElementById('selectedDayTitle').textContent = date.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }).replace('Sept', 'Sep');
    document.getElementById('selectedDayBadge').style.display = calendarDateKey(date) === today ? 'inline-block' : 'none';
    document.getElementById('shiftTitle').textContent = shift[0];
    document.getElementById('shiftTime').textContent = shift[1];
    const icon = document.getElementById('shiftIconCircle');
    icon.style.color = shift[2];
    icon.style.borderColor = shift[2];
    const overtime = code && septemberOvertime[selectedDay];
    document.getElementById('dayOtRow').style.display = overtime ? 'flex' : 'none';
    if (overtime) {
      document.getElementById('otTime').textContent = overtime[0];
      document.getElementById('otHours').textContent = overtime[1] + (overtime[1] === 1 ? ' hour' : ' hours');
    }
  }

  function scheduleCell(day) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.id = 'cal-day-' + day;
    cell.append(span('cal-date', day));
    const code = codeFor(day);
    if (code) {
      cell.append(span('cal-' + (code === 'NS' ? 'none' : code.toLowerCase()), code));
      const overtime = septemberOvertime[day];
      if (overtime && grid.hasAttribute('data-show-overtime')) cell.append(span('cal-ot', 'OT ' + overtime[1] + 'h'));
    }
    return cell;
  }

  function render() {
    document.querySelector('[data-roster-title]').textContent = month.label;
    const fragment = document.createDocumentFragment();
    const slots = Math.ceil((month.mondayOffset + month.days) / 7) * 7;
    for (let index = 0; index < slots; index++) {
      const day = index - month.mondayOffset + 1;
      const inMonth = day >= 1 && day <= month.days;
      const key = calendarDateKey(month.date(day));
      let cell = document.createElement('div');
      if (standalone) {
        cell = rosterCells.get(key) || cell;
        if (!cell.firstElementChild && inMonth) cell.append(span('cal-date', day));
        cell.style.opacity = inMonth ? '' : '0.3';
      } else if (inMonth) {
        cell = scheduleCell(day);
        cell.setAttribute('aria-pressed', String(day === selectedDay));
      }
      cell.classList.add('cal-cell');
      cell.classList.toggle('active', day === selectedDay);
      const isToday = inMonth && key === today;
      cell.classList.toggle('today', isToday);
      if (isToday) cell.setAttribute('aria-current', 'date');
      else cell.removeAttribute('aria-current');
      if (inMonth) cell.dataset.day = day;
      else delete cell.dataset.day;
      fragment.append(cell);
    }
    grid.replaceChildren(fragment);
    if (!standalone) showDetails();
  }

  grid.addEventListener('click', event => {
    const cell = event.target.closest('[data-day]');
    if (!cell) return;
    selectedDay = Number(cell.dataset.day);
    const previous = grid.querySelector('.active');
    previous?.classList.remove('active');
    cell.classList.add('active');
    if (!standalone) {
      previous?.setAttribute('aria-pressed', 'false');
      cell.setAttribute('aria-pressed', 'true');
      showDetails();
    }
  });
  document.querySelectorAll('[data-roster-step]').forEach(button => button.addEventListener('click', () => {
    month = month.move(Number(button.dataset.rosterStep));
    selectedDay = Math.min(selectedDay, month.days);
    render();
  }));
  document.querySelector('[data-roster-today]')?.addEventListener('click', () => {
    month = initialMonth;
    selectedDay = 11;
    render();
  });
  render();
})();
