const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = pathToFileURL(path.resolve(__dirname, '..') + path.sep);
const trigger = 'button.record-key-trigger';
const dialog = '#recordColourLegend[open]';

async function checkLegend(page, heading, labels, cardHeader, badge, { empty = false } = {}) {
  await page.waitForSelector(trigger, { visible: true });
  await page.click(trigger);
  await page.waitForSelector(dialog, { visible: true });
  const actual = await page.$eval(dialog, panel => ({
    titles: [...panel.querySelectorAll('h3')].map(title => title.textContent),
    rows: [...panel.querySelectorAll('li')].map(li => [li.textContent.trim(), getComputedStyle(li.firstElementChild).backgroundImage])
  }));
  assert.deepEqual(actual.titles, [heading]);
  assert.deepEqual(actual.rows.map(([label]) => label).sort(), [...labels].sort());
  assert.ok(actual.rows.every(([, fill]) => fill.startsWith('linear-gradient')));
  const colors = new Map(actual.rows);
  const records = await page.$$eval(cardHeader, (headers, selector) => headers
    .filter(header => header.getClientRects().length)
    .map(header => [
      header.querySelector(selector).textContent.trim().replace(/\s+/g, ' ').replace(/ \([\d.]+ (?:Hrs|mins)\)$/, ''),
      getComputedStyle(header).backgroundImage
    ]), badge);
  assert.equal(records.length === 0, empty, `Unexpected number of visible cards in ${page.url()}`);
  for (const [label, fill] of records) {
    assert.ok(fill.startsWith('linear-gradient'), label);
    assert.equal(colors.get(label), fill, `${label} in ${page.url()}`);
  }
  await page.keyboard.press('Escape');
  await page.waitForSelector(dialog, { hidden: true });
  return colors;
}

async function checkStaffAttendance(page, go) {
  const labels = ['No Exception', 'Late In', 'Early Out', 'Absent', 'Missing Clock', 'Unapproved OT'];
  const headers = '#staffCardsContainer .history-card-header';
  const check = options => checkLegend(page, 'Staff attendance status', labels, headers, '.attendance-exception-status', options);
  await go('modules/attendance/options/staff-attendance.html');
  const colours = await check();
  assert.equal(new Set(colours.values()).size, labels.length, 'Each staff attendance status has its own colour');

  const examples = [...labels, 'Missing Clock In', 'Missing Clock Out', '-'];
  await page.evaluate(exceptions => {
    renderStaffCards(exceptions.map((exception, index) => ({
      ...masterStaffDataset[0], cleanEmpNo: 'colour-test-' + index, exception
    })));
  }, examples);
  const cards = await page.$$eval(headers, nodes => nodes.map(node => [
    node.querySelector('.attendance-exception-status').textContent.trim(), getComputedStyle(node).backgroundImage
  ]));
  const expected = labels.map(label => [label, colours.get(label)]);
  expected.push(['Missing Clock In', colours.get('Missing Clock')], ['Missing Clock Out', colours.get('Missing Clock')], ['No Exception', colours.get('No Exception')]);
  assert.deepEqual(cards, expected, 'Card headers match the legend and keep the clock direction in the badge');

  await page.click('#filterBarContainer .filter-trigger-btn');
  await page.waitForSelector('#filterModal.active');
  await page.type('#filterKeyword', 'No matching employee');
  await page.focus('#filterModal .standard-filter-apply');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#filterModal', { hidden: true });
  assert.equal(await page.$eval('#totalRecordsText', node => node.textContent), '0');
  assert.deepEqual(await check({ empty: true }), colours);
}

async function checkWorkplaceHistory(page, go) {
  const tabs = { 'guest-visit': 'Guest Visit', 'letter-request': 'Letter Request', 'inventory-request': 'Inventory' };
  const statuses = { draft: 'Draft', submitted: 'Pending', resubmit: 'Resubmit', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
  const inventoryStatuses = ['submitted', 'approved', 'resubmit', 'rejected', 'cancelled'];
  const statusKeys = kind => kind === 'inventory-request' ? inventoryStatuses : Object.keys(statuses);
  const check = (kind, options) => checkLegend(page, `${tabs[kind]} status`, statusKeys(kind).map(key => statuses[key]),
    '#workplaceHistoryList .history-card-header', '.status-pill', options);
  await go('modules/admin/options/history.html?category=letter-request');
  await check('letter-request');

  for (const kind of Object.keys(tabs)) {
    await page.click(`[data-history-kind="${kind}"]`);
    await check(kind);
    await page.click('#historyFilterTrigger');
    const filterStatuses = await page.$$eval('#historyStatus option', options => options.map(option => option.value));
    assert.deepEqual(filterStatuses, ['', ...statusKeys(kind)]);
    if (kind === 'guest-visit') {
      await page.$eval('#historyDateFrom', input => { input.value = '2099-01-01'; });
    } else {
      await page.select('#historyStatus', 'rejected');
    }
    await page.click('#applyHistoryFilter');
    await page.waitForSelector('#historyEmptyState', { visible: true });
    await check(kind, { empty: true });
  }

  const key = 'peoplehcm:workplace:history:v1';
  const fixtures = Object.entries(tabs).flatMap(([kind, title]) => statusKeys(kind).map(status => ({
    id: `${kind}-${status}`, kind, title, status, date: '2026-01-01', fields: []
  })));
  const saved = await page.evaluate(key => localStorage.getItem(key), key);
  await page.evaluate((key, rows) => localStorage.setItem(key, JSON.stringify(rows)), key, fixtures);
  await page.reload({ waitUntil: 'load' });
  for (const kind of Object.keys(tabs)) {
    await page.click(`[data-history-kind="${kind}"]`);
    const rendered = await page.$$eval('#workplaceHistoryList [data-status]', cards => cards.map(card => card.dataset.status));
    assert.deepEqual(rendered.sort(), [...statusKeys(kind)].sort());
    await check(kind);
  }
  await page.evaluate(key => localStorage.setItem(key, '[]'), key);
  for (const kind of Object.keys(tabs)) {
    await go(`modules/admin/options/history.html?category=${kind}`);
    await page.waitForSelector('#historyEmptyState', { visible: true });
    await check(kind, { empty: true });
  }
  await page.evaluate((key, value) => localStorage.setItem(key, value), key, saved);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 800 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    for (const theme of ['light', 'dark']) {
      const go = route => {
        const url = new URL(route, root);
        url.searchParams.set('theme', theme);
        return page.goto(url.href, { waitUntil: 'load' });
      };
      const attendance = 'modules/attendance/options/';
      await go(attendance + 'overtime.html');
      await checkLegend(page, 'Overtime status', ['Unapproved OT', 'Approved'], '.ot-record-top', '.ot-record-status');
      await page.click('#overtimeAddRequest');
      await page.waitForSelector(trigger, { hidden: true });
      await page.click('.cal-top-header [aria-label="Back"]');
      await page.waitForSelector(trigger, { visible: true });

      await go(attendance + 'daily-ot.html');
      await checkLegend(page, 'Daily OT status', ['Approved', 'Unapproved'], '.daily-ot-card-header', '.card-status-badge');

      await checkStaffAttendance(page, go);

      await go(attendance + 'attendance-performance.html');
      await checkLegend(page, 'Attendance performance bands', ['Good', 'Caution', 'Poor'], '.emp-card .history-card-header', '.card-status-badge');
      await page.focus('#pill-poor');
      await page.keyboard.press('Enter');
      await checkLegend(page, 'Attendance performance bands', ['Good', 'Caution', 'Poor'], '.emp-card .history-card-header', '.card-status-badge');

      await go(attendance + 'clocking-summary.html');
      await page.evaluate(() => openDetailsPage(1));
      await checkLegend(page, 'Clocking types', ['Clock In', 'Clock Out', 'Break Out', 'Break In'],
        '#detailsListContainer .history-card-header', '.clocking-status-badge');

      await go(attendance + 'clocking-history.html');
      await checkLegend(page, 'Clocking status', ['Normal', 'Overtime', 'Early Out', 'Late In'], '#viewClockingHistory .history-card-header', '.card-status-badge');
      await page.click('#tabOt');
      await checkLegend(page, 'OT plan status', ['Pending Approve', 'Pending Resubmit', 'Approved', 'Rejected'], '#viewOtHistory .history-card-header', '.card-status-badge');
      await page.click('#tabFeedback');
      await checkLegend(page, 'Attendance feedback status', ['Pending Approve', 'Pending Review', 'Pending Resubmit', 'Approved', 'Rejected', 'Cancelled'], '#viewFeedbackHistory .history-card-header', '.card-status-badge');

      await go('modules/admin/index.html');
      await go('modules/admin/options/book-resource.html');
      const bookingLegend = options => checkLegend(page, 'Booking status', ['Confirmed', 'Plan'],
        '#bookingRecords .history-card-header', '.status-pill', options);
      await bookingLegend();
      const bookings = await page.evaluate(() => BookResourceStore.list());
      const setBookings = records => page.evaluate(rows => {
        localStorage.setItem('peoplehcm:workplace:book-resource:v1', JSON.stringify(rows));
      }, records);
      for (const status of ['confirmed', 'plan', null]) {
        const records = bookings.filter(booking => booking.status === status).slice(0, 1);
        assert.equal(records.length, status ? 1 : 0);
        await setBookings(records);
        await page.reload({ waitUntil: 'load' });
        assert.equal(await page.$eval('#bookingRecordCount', count => Number(count.textContent)), records.length);
        await bookingLegend({ empty: !records.length });
      }
      await page.click('#bookingAdd');
      await page.waitForSelector(trigger, { hidden: true });
      await page.click('#bookingCancel');
      await bookingLegend({ empty: true });
      await setBookings(bookings);

      await go('modules/admin/options/pending-approval.html');
      const workplaceLegend = options => checkLegend(page, 'Approval status',
        ['Pending', 'Approved', 'Resubmit', 'Rejected', 'Cancelled'],
        '#workplacePendingQueue .payroll-approval-card-header', '.payroll-approval-status', options);
      await workplaceLegend();
      await page.click('#workplacePendingTab-inventory');
      await workplaceLegend();
      await page.click('#workplacePendingFilterTrigger');
      await page.type('#workplacePendingFilter-keyword', 'No matching request');
      await page.click('#workplacePendingFilter .approval-filter-apply');
      await page.waitForSelector('#workplacePendingEmpty', { visible: true });
      await workplaceLegend({ empty: true });
      await page.click('#workplacePendingTab-guest-visit');
      await workplaceLegend({ empty: true });

      await checkWorkplaceHistory(page, go);

      await go('modules/training-competency/options/training-plan.html');
      await checkLegend(page, 'Training attendance', ['Not Attended', 'Registered', 'Completed'], '.training-plan-card-header', '.card-status-badge');
      await go('modules/employee-career/options/history.html');
      const feedbackLegend = options => checkLegend(page, 'Feedback status', ['Pending', 'Responded'],
        '#careerHistoryList .history-card-header', '.status-pill', options);
      await feedbackLegend();
      await page.click('#historyFilterTrigger');
      await page.select('#historyStatus', 'responded');
      await page.click('#applyHistoryFilter');
      await feedbackLegend({ empty: true });
      await page.evaluate(() => {
        window.EMPLOYEE_CAREER_HISTORY_DATA.feedback[0].reviewerComment = 'Reviewed by HR';
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      });
      assert.equal(await page.$eval('#historyRecordCount', el => el.textContent), '1');
      await feedbackLegend();
      await page.click('#careerHistoryList .career-history-card-open');
      assert.equal(await page.$eval('#historyDetailBody [data-status]', el => el.textContent), 'Responded');
      await page.click('#closeHistoryDetails');
      await page.click('[data-history-kind="cv-change-request"]');
      await checkLegend(page, 'CV Change Request status', ['Draft', 'Pending', 'Pending Approval', 'Pending HR Approval', 'Resubmit', 'Approved', 'Rejected', 'Cancelled'],
        '#careerHistoryList .history-card-header', '.status-pill');
      await page.click('[data-history-kind="whereabout"]');
      await checkLegend(page, 'Whereabout status', ['Pass'], '#careerHistoryList .history-card-header', '.status-pill');

      await go('modules/employee-career/options/team/history.html?category=staff-engagement');
      await checkLegend(page, 'Staff Engagement status', ['Pending', 'To Resubmit', 'Approved', 'Rejected', 'Follow-up Required', 'Completed'],
        '#teamHistoryList .history-card-header', '.status-pill');
      await page.click('[data-team-history-kind="staff-exit"]');
      await checkLegend(page, 'Staff Exit status', ['Pending', 'Approved'], '#teamHistoryList .history-card-header', '.status-pill');

      await go('modules/employee-career/options/team/staff-feedback.html');
      const staffFeedbackLegend = options => checkLegend(page, 'Feedback status', ['Pending', 'Responded'],
        '#staffFeedbackRecords .history-card-header', '.status-pill', options);
      await staffFeedbackLegend();
      await page.click('#staffFeedbackViewChart');
      await page.waitForSelector(trigger, { hidden: true });
      await page.click('#staffFeedbackBack');
      await page.click('#staffFeedbackFilterTrigger');
      await page.type('#staffFeedbackKeyword', 'No matching feedback');
      await page.click('#staffFeedbackFilterForm [type="submit"]');
      await staffFeedbackLegend({ empty: true });

      await go('modules/project-task/options/history.html');
      const workPlanLegend = () => checkLegend(page, 'Work plan status',
        ['Draft', 'Pending', 'Pending Approval', 'Resubmit', 'Approved', 'Rejected', 'Cancelled'],
        '#workPlanHistoryPanel .project-history-card-top', '.project-history-status-badge');
      await workPlanLegend();
      const plansKey = 'pq_project_work_plans';
      const previousPlans = await page.evaluate(key => localStorage.getItem(key), plansKey);
      await page.evaluate(key => {
        const states = ['Pending Approval', 'Approved', 'Rejected', 'Resubmit', 'Cancelled'];
        localStorage.setItem(key, JSON.stringify(states.map((status, index) => ({ id: 'legend-test-' + index, title: 'Work plan', status }))));
      }, plansKey);
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.$$eval('#workPlanHistoryPanel [data-record-id^="legend-test-"]', cards => cards.length), 5);
      await workPlanLegend();
      await page.evaluate((key, value) => value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value), plansKey, previousPlans);
      await page.click('#historyTab-timesheet');
      await checkLegend(page, 'Timesheet status', ['Draft', 'Pending', 'Pending Approval', 'Pending Resubmit', 'Approved', 'Rejected', 'Cancelled'],
        '#timesheetHistoryPanel .project-history-card-top', '.project-history-status-badge');

      await go('leave.html?mode=team&view=approvals');
      await checkLegend(page, 'Approval status', ['Pending Approval', 'Resubmitted', 'Approved', 'Rejected'], '#viewTeamApprovals .approval-record-header', '.approval-status-badge');
      await page.click('#tabApprovalOfftime');
      await checkLegend(page, 'Approval status', ['Pending Approval', 'Resubmitted', 'Approved', 'Rejected'], '#viewTeamApprovals .approval-record-header', '.approval-status-badge');
      await go('leave.html?view=my-calendar');
      await page.waitForSelector(trigger, { hidden: true });
      await page.focus('#leavePersonalCalendarInfo');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#leaveCalendarInfo[open]', { visible: true });
      assert.equal(await page.$eval('#leaveCalendarInfoTitle', title => title.textContent.trim()), 'Calendar Information');

      await go('modules/performance/options/history.html');
      await page.waitForSelector('.incident-history-card-header', { visible: true });
      await page.waitForSelector(trigger, { hidden: true });
    }
    console.log('Record legends match the active option, tab, filter and card colours in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
