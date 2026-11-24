const HoursSummaryLegend = (() => {
  const plannedOT = { label: 'Planned OT', field: 'planHours' };
  const overtimeMetrics = new Map([
    ['Normal OT Hours', { label: 'Approved OT', field: 'approvedOt' }],
    ['Other OT Hours', { label: 'Approved OT', field: 'otherOt' }],
    ['Unapproved OT Hours', { label: 'Unapproved OT', field: 'unapprovedOt' }],
    ['OT Plan Hours', plannedOT],
    ['Planned OT Hours', plannedOT],
    ['Plan OT Hours', plannedOT],
    ['Absent OT Hours', { label: 'Absent OT', field: 'absentHours' }]
  ]);

  // These colors are looked up only for statuses found on a record.
  const statusTones = new Map([
    ['Normal', 'theme-green'],
    ['Approved OT', 'theme-green'],
    ['Unapproved OT', 'theme-orange'],
    ['Planned OT', 'theme-blue'],
    ['Absent OT', 'theme-red'],
    ['Absent', 'theme-red'],
    ['Late In', 'theme-purple'],
    ['Early Out', 'theme-red'],
    ['Missing Clock', 'theme-orange'],
    ['Missing Clock In', 'theme-orange'],
    ['Missing Clock Out', 'theme-orange'],
    ['Odd Clocking', 'theme-orange'],
    ['Overtime', 'theme-orange'],
    ['On Leave', 'theme-purple'],
    ['Time Off', 'theme-purple']
  ]);
  const statusLabels = new Map(Array.from(statusTones.keys(), label => [label.toLowerCase(), label]));
  const clockingTones = new Map([
    ['Odd Clocking', 'theme-orange'],
    ['Missing Clock Out', 'theme-red'],
    ['Missing Clock In', 'theme-blue'],
    ['Missing Clock', 'theme-slate']
  ]);
  const statusIcons = new Map([
    ['Normal', 'fa-check'], ['Approved OT', 'fa-check'],
    ['Planned OT', 'fa-calendar-check'], ['Absent OT', 'fa-clock-rotate-left'],
    ['Absent', 'fa-user-xmark'], ['On Leave', 'fa-plane-departure']
  ]);
  const headings = new Map([
    ['Odd Clocking Days', 'Clocking exception'],
    ['Leave Hours', 'Leave status']
  ]);

  function hasValue(value) {
    const text = String(value ?? '').trim();
    return text !== '' && !/^[-–—]$/.test(text);
  }

  function recordedTime(value) {
    return String(value ?? '').split(':').some(part => Number(part) > 0);
  }

  function hasRecordedLeave(record) {
    return record.exception === 'On Leave' || record.dayType === 'Leave Day'
      || hasValue(record.leaveInfo) || hasValue(record.leaveCode) || recordedTime(record.leaveHours);
  }

  function isDayFlagSet(value) {
    return /^(yes|true|1)$/i.test(String(value ?? '').trim());
  }

  function recordedException(record) {
    const exception = String(record.exception ?? '').trim();
    const key = exception.toLowerCase().replace(/[-_]+/g, ' ');
    if (!hasValue(exception) || ['normal', 'no exception', 'none'].includes(key)) return '';
    return statusLabels.get(key) ?? exception;
  }

  function attendanceDayLabel(record) {
    const exception = recordedException(record);
    if (exception) return exception;
    if (isDayFlagSet(record.absent)) return 'Absent';
    if (isDayFlagSet(record.uot) || recordedTime(record.unapprovedOt)) return 'Unapproved OT';
    return 'Normal';
  }

  function setEntries(view, heading, entries) {
    if (entries.length) {
      setRecordLegend(view, heading, Object.fromEntries(entries));
    } else {
      delete view.dataset.recordLegend;
      delete view.dataset.recordColourView;
    }
  }

  function clockingLabels(record) {
    const labels = new Set();
    if (isDayFlagSet(record.missingClockIn)) labels.add('Missing Clock In');
    if (isDayFlagSet(record.missingClockOut)) labels.add('Missing Clock Out');
    const exception = recordedException(record);
    const general = exception === 'Odd Clocking' || exception === 'Missing Clock';
    if (/clock|punch/i.test(exception) && !(general && labels.size)) labels.add(exception);
    return [...labels];
  }

  function recordLabels(title, record) {
    const metric = overtimeMetrics.get(title);
    if (metric) {
      const flagged = metric.field === 'unapprovedOt' && (
        isDayFlagSet(record.uot) || recordedTime(record.unapprovedDisplay) || recordedException(record) === metric.label
      );
      const hours = record[metric.field] ?? (title === 'Absent OT Hours' ? record.absentOtHours : undefined);
      return recordedTime(hours) || flagged ? [metric.label] : [];
    }
    switch (title) {
      case 'Scheduled Work Days':
      case 'Normal Present Days':
      case 'Normal Work Hours':
        return [attendanceDayLabel(record)];
      case 'Odd Clocking Days':
        return clockingLabels(record);
      case 'Absent Days': {
        const absent = isDayFlagSet(record.absent) || recordedException(record) === 'Absent' || recordedTime(record.absentHours);
        return absent ? ['Absent'] : [];
      }
      case 'Leave Hours':
        return hasRecordedLeave(record) ? ['On Leave'] : [];
      default:
        return [];
    }
  }

  function cardInfo(title, labels, kind = 'record') {
    const primary = labels[0];
    const showIcon = title !== 'Leave Hours';
    if (title === 'Lost Hours' || (!showIcon && !primary)) return '';
    const end = document.createElement('div');
    end.className = 'summary-history-card-end';
    let content = end;
    if (primary) {
      const badge = document.createElement('span');
      badge.className = 'card-status-badge summary-history-status';
      badge.dataset.status = kind === 'attendance' ? (primary === 'Normal' ? 'normal' : 'exception') : kind;
      const caption = document.createElement('span');
      caption.textContent = labels.join(', ');
      badge.append(caption);
      end.append(badge);
      content = badge;
    }
    if (showIcon) {
      const icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      let glyph = 'fa-circle-info';
      if (primary) glyph = kind === 'rate' ? 'fa-chart-pie' : statusIcons.get(primary) ?? 'fa-circle-exclamation';
      icon.className = 'fa-solid ' + glyph;
      content.prepend(icon);
    }
    return end.outerHTML;
  }

  function individual(view, title, records) {
    if (title === 'Lost Hours') {
      setEntries(view, '', []);
      return records.map(() => ({ labels: [], tone: 'theme-purple' }));
    }
    const attendanceBadge = title === 'Normal Present Days' || title === 'Normal Work Hours';
    const defaultTone = title === 'Leave Hours' ? 'theme-purple' : '';
    const entries = new Map();
    const cards = records.map(record => {
      const labels = recordLabels(title, record);
      for (const label of labels) {
        let tone;
        if (title === 'Odd Clocking Days') tone = clockingTones.get(label) ?? 'theme-purple';
        else if (attendanceBadge) tone = label === 'Normal' ? 'theme-green' : 'theme-orange';
        else tone = statusTones.get(label) ?? 'theme-orange';
        entries.set(label, tone);
      }
      return { labels, tone: entries.get(labels[0]) ?? defaultTone };
    });
    const heading = overtimeMetrics.has(title) ? 'Overtime status' : headings.get(title) ?? 'Attendance status';
    setEntries(view, heading, [...entries]);
    return cards;
  }

  function recordKey(title, getRecords) {
    if (title === 'Lost Hours') return ['', []];
    if (overtimeMetrics.has(title)) return ['Overtime status', [overtimeMetrics.get(title).label]];
    if (title === 'Absent Days') return ['Attendance status', ['Absent']];

    const records = getRecords(title);
    switch (title) {
      case 'Scheduled Work Days':
      case 'Normal Work Hours':
        return ['Attendance status', records.map(record => {
          if (hasValue(record.exception)) return record.exception;
          return record.absent === 'Yes' ? 'Absent' : 'Normal';
        })];
      case 'Odd Clocking Days': {
        const exceptions = new Set(['Odd Clocking']);
        for (const record of records) {
          if (hasValue(record.exception)) exceptions.add(record.exception);
          if (record.missingClockIn === true) exceptions.add('Missing Clock In');
          if (record.missingClockOut === true) exceptions.add('Missing Clock Out');
        }
        return ['Clocking exception', [...exceptions]];
      }
      case 'Leave Hours': {
        const hasLeave = records.some(hasRecordedLeave);
        return ['Leave status', hasLeave ? ['On Leave'] : []];
      }
      default:
        return ['', []];
    }
  }

  function records(view, title, theme, getRecords) {
    // Use the option's full record source so filtering does not remove a supported entry.
    const [heading, labels] = recordKey(title, getRecords);
    setEntries(view, heading, labels.map(label => [label, 'theme-' + theme]));
  }

  function attendance(view, items, normalTone, supportedExceptions) {
    const entries = { Normal: normalTone };
    for (const label of supportedExceptions) entries[label] = 'submitted';
    for (const item of items) {
      if (hasValue(item.exception) && item.exception !== 'Normal') entries[item.exception] = 'submitted';
    }
    setRecordLegend(view, 'Attendance status', entries);
  }

  return { individual, records, attendance, recordLabels, cardInfo };
})();
