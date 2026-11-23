const AttendanceAdviceFields = (() => {
  function display(value, empty = '-') {
    const text = String(value ?? '').trim();
    return text && !/^[-–—]$/.test(text) ? text : empty;
  }

  function minutes(value, empty) {
    const text = display(value, empty);
    const duration = /^(\d+):([0-5]\d)$/.exec(text);
    if (duration) return String(Number(duration[1]) * 60 + Number(duration[2]));
    return text.replace(/^(\d+)\s*min(?:ute)?s?$/i, '$1');
  }

  function absent(value) {
    const text = display(value);
    if (/^(yes|true|1)$/i.test(text)) return 'Yes';
    if (/^(no|false|0)$/i.test(text)) return 'No';
    return text;
  }

  function reason(value, duration) {
    return display(value, Number(duration) === 0 ? 'Not applicable' : undefined);
  }

  function entries(record, attendanceDay) {
    // A submitted value takes precedence over the linked day's original value.
    function field(...names) {
      for (const source of [record, attendanceDay]) {
        for (const name of names) {
          const value = display(source?.[name], '');
          if (value) return value;
        }
      }
      return '';
    }
    const lateIn = minutes(field('lateInMinutes', 'lateIn'));
    const missingClockOut = field('missingClockOut') === 'true';
    const earlyOut = minutes(field('earlyOutMinutes', 'earlyOut'), missingClockOut ? 'Clock-out missing' : undefined);
    const timeOff = minutes(field('timeOffMinutes', 'timeOff'));
    const absence = absent(field('absent'));
    return [
      ['Late In Minutes', lateIn],
      ['Late Reason', reason(field('lateReason', 'lateInReason'), lateIn)],
      ['Early Out Minutes', earlyOut],
      ['Early Out Reason', reason(field('earlyOutReason'), earlyOut)],
      ['Time Off Minutes', timeOff],
      ['Time Off Reason', reason(field('timeOffReason'), timeOff)],
      ['Absent', absence],
      ['Absent Reason', display(field('absentReason'), absence === 'No' ? 'Not applicable' : undefined)],
      ['Leave Code', display(field('leaveCode'))]
    ];
  }

  function render(body, record, attendanceDay) {
    body.replaceChildren();
    for (const [label, value] of entries(record, attendanceDay)) {
      const row = body.insertRow();
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.className = 'detail-label detail-popout-label';
      heading.textContent = label;
      row.append(heading);
      const cell = row.insertCell();
      cell.className = 'detail-value detail-popout-value';
      cell.textContent = value;
    }
  }

  return { entries, render };
})();
