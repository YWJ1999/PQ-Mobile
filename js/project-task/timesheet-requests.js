const TimesheetRequests = (() => {
  const sheetsKey = 'pq_project_timesheets';
  const decisionsKey = 'pq_project_pending_decisions';
  const decisions = { approve: 'Approved', reject: 'Rejected', resubmit: 'Pending Resubmit', cancel: 'Cancelled' };
  const examples = [
    { id: "ETS00000002819", employeeName: "Farhan binti rahmat", employeeId: "EBB12", date: "30 Sep 2026", clockTimes: "08:30 – 17:30", remark: "Client portal sprint progress update.", normalMinutes: 450, overtimeMinutes: 60,
      activities: [{ title: "Portal accessibility review", project: "Client Portal Upgrade", task: "Accessibility Sprint", timeFrom: "09:00", timeTo: "12:00" }] },
    { id: "ETS00000002820", employeeName: "Aina Rahman", employeeId: "EBB27", date: "29 Sep 2026", clockTimes: "08:00 – 17:00", remark: "Month-end timesheet submission.", normalMinutes: 480, overtimeMinutes: 0,
      activities: [{ title: "API integration review", project: "Payroll Modernisation", task: "Integration Testing", timeFrom: "13:30", timeTo: "17:00" }] },
    { id: "ETS00000002821", employeeName: "Daniel Lee", employeeId: "EBB41", date: "28 Sep 2026", clockTimes: "09:00 – 17:30", remark: "Overtime support for release preparation.", normalMinutes: 390, overtimeMinutes: 120,
      activities: [{ title: "Release readiness support", project: "Mobile Workforce", task: "Release Preparation", timeFrom: "18:00", timeTo: "20:00" }] },
  ];

  function duration(from, to) {
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) return 0;
    const [fromHour, fromMinute] = from.split(':').map(Number);
    const [toHour, toMinute] = to.split(':').map(Number);
    if (fromHour > 23 || toHour > 23 || fromMinute > 59 || toMinute > 59) return 0;
    return (toHour * 60 + toMinute - fromHour * 60 - fromMinute + 1440) % 1440;
  }
  function totals(activities) {
    return activities.reduce((total, activity) => {
      total[(activity.overtime ?? activity.isOvertime) ? 'overtimeMinutes' : 'normalMinutes'] += duration(activity.timeFrom, activity.timeTo);
      return total;
    }, { normalMinutes: 0, overtimeMinutes: 0 });
  }

  function read(key) {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(data)) throw new Error('Invalid timesheet data');
    return data;
  }

  function saved(key) {
    try { return read(key); } catch { return []; }
  }

  function storedId(record, index) {
    // Earlier History submissions reused the draft ID for multiple requests.
    return record.id && record.id !== 'TS-DRAFT-LOCAL' ? String(record.id) : 'TS-LOCAL-' + (index + 1);
  }

  function dateLabel(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '—';
    return new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function submitted(record) {
    return /^(submitted|pending|pending approval)$/i.test(record.status || '');
  }

  function pending(sheets = saved(sheetsKey), previous = saved(decisionsKey)) {
    const handled = new Set(previous.map(item => item.reference));
    const local = sheets.map((sheet, i) => ({ ...sheet, id: storedId(sheet, i) })).filter(submitted).reverse();
    return [...local, ...examples].filter(sheet => !handled.has(sheet.id)).map(sheet => {
      const activities = Array.isArray(sheet.activities) ? sheet.activities : [];
      const calculated = totals(activities);
      return { ...sheet, submittedAt: sheet.submittedAt || sheet.createdAt, activities, employeeName: sheet.employeeName || previewUserName, employeeId: sheet.employeeId || sheet.empNo || 'EBB01',
        normalMinutes: sheet.normalMinutes ?? calculated.normalMinutes, overtimeMinutes: sheet.overtimeMinutes ?? calculated.overtimeMinutes,
        dateLabel: dateLabel(sheet.date) };
    });
  }

  function exclusive(operation) {
    return navigator.locks ? navigator.locks.request(sheetsKey, operation) : Promise.resolve().then(operation);
  }

  function submit(sheet, draftToClear, requireDraft = false) {
    return exclusive(() => {
      const sameDraft = draftToClear && draftToClear === localStorage.getItem('pq_project_timesheet_draft');
      if (requireDraft && !sameDraft) throw new Error('The saved draft has changed');
      const sheets = read(sheetsKey);
      if (sheets.some((record, i) => storedId(record, i) === sheet.id && submitted(record))) throw new Error('Timesheet already submitted');
      const index = sheets.findIndex((record, i) => storedId(record, i) === sheet.id);
      const submission = { ...sheet, submittedAt: new Date().toISOString() };
      if (index < 0) sheets.push(submission);
      else sheets[index] = submission;
      localStorage.setItem(sheetsKey, JSON.stringify(sheets));
      if (sameDraft) localStorage.removeItem('pq_project_timesheet_draft');
    });
  }

  function decide(ids, action, comments = '') {
    return exclusive(() => {
      const previous = read(decisionsKey);
      const available = new Set(pending(read(sheetsKey), previous).map(sheet => sheet.id));
      if (!Object.hasOwn(decisions, action) || !ids.length || ids.some(id => !available.has(id))) throw new Error('Timesheet no longer pending');
      const decidedAt = new Date().toISOString();
      const updates = ids.map(reference => ({ reference, action, comments, decidedAt }));
      localStorage.setItem(decisionsKey, JSON.stringify([...previous, ...updates]));
    });
  }

  function reviewed(records) {
    const byId = new Map(saved(decisionsKey).map(item => [item.reference, item]));
    return records.map(record => {
      const result = byId.get(record.id);
      return result && Object.hasOwn(decisions, result.action) ? { ...record, status: decisions[result.action], approverComments: result.comments } : record;
    });
  }

  return { sheetsKey, decisionsKey, storedId, pending, submit, decide, reviewed, duration, totals };
})();
