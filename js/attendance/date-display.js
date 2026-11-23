/* Calendar dates stay independent of the browser's time zone. */
(function () {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function parse(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    const text = String(value || '').trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const slash = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const named = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    let year, month, day;
    if (iso) [year, month, day] = iso.slice(1).map(Number);
    else if (slash) [day, month, year] = slash.slice(1).map(Number);
    else if (named) {
      day = Number(named[1]);
      month = months.findIndex(item => item.toLowerCase() === named[2].slice(0, 3).toLowerCase()) + 1;
      year = Number(named[3]);
    } else return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
  }
  function format(value) {
    const date = parse(value);
    return date ? `${weekdays[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}` : String(value || '—');
  }
  function formatRange(from, to) {
    const start = parse(from);
    const end = parse(to);
    if (!start || !end) return '';
    const dayMonth = date => `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
    const last = `${dayMonth(end)} ${end.getUTCFullYear()}`;
    if (start.getTime() === end.getTime()) return last;
    const first = start.getUTCFullYear() === end.getUTCFullYear()
      ? dayMonth(start) : `${dayMonth(start)} ${start.getUTCFullYear()}`;
    return `${first} – ${last}`;
  }
  window.AttendanceDateDisplay = { parse, format, formatRange };
})();
