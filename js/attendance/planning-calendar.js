customElements.define('attendance-planning-calendar', class extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    this.innerHTML = `
      <div class="grid-cal-header">
        <div>
          <h3 class="grid-cal-month" id="gridCalTitle"></h3>
          <ul class="grid-cal-legend" aria-label="Calendar legend">
            <li class="cal-legend-item"><span class="legend-dot staff" aria-hidden="true"></span>Staff</li>
            <li class="cal-legend-item"><span class="legend-dot hours" aria-hidden="true"></span>Scheduled hours</li>
          </ul>
        </div>
        <div class="grid-cal-controls">
          <button type="button" class="grid-cal-nav-btn" data-grid-month="previous" aria-label="Previous month"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
          <button type="button" class="grid-cal-nav-btn" data-grid-month="next" aria-label="Next month"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="grid-cal-weekdays">
        ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => `<span class="grid-cal-weekday">${day}</span>`).join('')}
      </div>
      <div class="grid-cal-days" id="gridCalDays"></div>`;
  }

  render(selectedDate, totalsForDate, selectDate) {
    const month = calendarMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const selectedDay = selectedDate.getDate();
    this.querySelector('.grid-cal-month').textContent = month.label;
    for (const arrow of this.querySelectorAll('[data-grid-month]')) {
      arrow.onclick = () => {
        const target = month.move(arrow.dataset.gridMonth === 'next' ? 1 : -1);
        selectDate(target.date(Math.min(selectedDay, target.days)));
      };
    }

    const grid = this.querySelector('.grid-cal-days');
    const cells = document.createDocumentFragment();
    for (let i = month.mondayOffset; i > 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'grid-cal-cell empty';
      cell.innerHTML = `<span class="grid-cal-date">${month.previousDays - i + 1}</span>`;
      cells.appendChild(cell);
    }

    let selectedTotals;
    for (let day = 1; day <= month.days; day++) {
      const date = month.date(day);
      const totals = totalsForDate(date);
      const hours = totals.hours?.toLocaleString('en-GB');
      const selected = day === selectedDay;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'grid-cal-cell';
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
      cell.setAttribute('aria-label', `${day} ${month.label}, ${totals.staff} staff, ${hours == null ? 'scheduled hours unavailable' : hours + ' scheduled hours'}`);
      cell.innerHTML = `<span class="grid-cal-date">${day}</span>
        <span class="grid-cal-stat-staff">${totals.staff}</span>
        <span class="grid-cal-stat-hours">${hours == null ? '—' : hours + 'h'}</span>`;
      cell.onclick = () => {
        selectDate(date);
        grid.querySelector('.selected').focus({ preventScroll: true });
      };
      cells.appendChild(cell);
      if (selected) selectedTotals = totals;
    }
    grid.replaceChildren(cells);
    return selectedTotals;
  }
});
