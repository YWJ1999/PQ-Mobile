// Calendar views use local civil dates. An out-of-range month rolls into the adjacent year.
function calendarMonth(year, monthIndex) {
  const first = new Date(year, monthIndex, 1, 12);
  const index = first.getMonth();
  const calendarYear = first.getFullYear();
  const date = day => new Date(calendarYear, index, day, 12);
  return {
    year: calendarYear,
    index,
    key: calendarYear + '-' + String(index + 1).padStart(2, '0'),
    label: first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    days: new Date(calendarYear, index + 1, 0, 12).getDate(),
    mondayOffset: (first.getDay() + 6) % 7,
    previousDays: date(0).getDate(),
    date,
    move: offset => calendarMonth(calendarYear, index + offset)
  };
}

function calendarDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
