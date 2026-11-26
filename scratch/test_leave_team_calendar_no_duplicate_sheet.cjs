const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const leaveUrl = pathToFileURL(path.resolve(__dirname, '..', 'leave.html')).href + '?mode=team&theme=dark';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(leaveUrl, { waitUntil: 'domcontentloaded' });

    const grid = '#hubTeamCalDaysGridContainer';
    const day = date => grid + ' button[data-date="' + date + '"]';
    const summary = () => page.$eval('#teamSelectedDateSummary', el => el.textContent);
    const staff = () => page.$$eval('#teamSelectedDateStaff a', rows => rows.map(row => [
      row.querySelector('.team-date-employee-name').textContent,
      row.querySelector('.team-date-leave-type').textContent
    ]));
    const detail = '#teamCalendarLeavePage';
    const openEmployee = async selector => {
      await page.click('#teamSelectedDateStaff ' + selector);
      await page.waitForSelector(detail, { visible: true });
      assert.equal(await page.$(detail + ' [data-leave-form] :is(input, select, textarea, button, [onclick], [contenteditable], .peoplehcm-select-chevron)'), null);
      return page.$$eval(detail + ' [data-review-field]', nodes =>
        Object.fromEntries(nodes.map(node => [node.dataset.reviewField, node.textContent])));
    };
    const backToCalendar = async () => {
      await page.click(detail + ' [data-history-back]');
      await page.waitForSelector(detail, { hidden: true });
    };

    assert.equal(await summary(), '11 Sep 2026 · 4 employees on leave');
    await page.click(day('2026-09-15') + ' .team-leave-calendar-count');
    assert.equal(await summary(), '15 Sep 2026 · 2 employees on leave');
    assert.deepEqual(await staff(), [
      ['NURFARHANA BINTI MOHAMAD YUSOFF', 'Annual Leave'],
      ['WAN MOHD HANAPI BIN WAN HUSSIM', 'Replacement Leave']
    ]);
    const replacement = await openEmployee('a:last-child');
    assert.equal(await page.$eval('#teamCalendarLeaveEmployee', el => el.textContent), '008025 - WAN MOHD HANAPI BIN WAN HUSSIM');
    assert.equal(replacement.type, 'Replacement Leave');
    assert.equal(replacement.reason, 'Weekend Shift Replacement');
    assert.equal(replacement.fromDate, '15 Sep 2026');
    assert.equal(replacement.toDate, replacement.fromDate);
    assert.equal(replacement.leaveDays, '1');
    assert.equal(await page.$$eval(detail + ' button', nodes => nodes.length), 1);
    await backToCalendar();
    assert.equal(await summary(), '15 Sep 2026 · 2 employees on leave');
    assert.equal(await page.$eval('#teamSelectedDateStaff a:last-child', el => document.activeElement === el), true);

    const annual = await openEmployee('a:first-child');
    assert.equal(annual.type, 'Annual Leave');
    assert.equal(annual.fromDate, '15 Sep 2026');
    assert.equal(annual.toDate, '16 Sep 2026');
    assert.equal(annual.leaveDays, '2');
    assert.equal(await page.$eval('#teamCalendarLeaveReference', el => el.textContent), 'Ref: LV-2026-0062');
    await backToCalendar();

    await page.click(day('2026-09-11'));
    const emergency = await openEmployee('a:last-child');
    assert.equal(emergency.type, 'Emergency Leave');
    assert.equal(emergency.duration, 'Half Day');
    assert.equal(emergency.leaveDays, '0.5');
    assert.equal(await page.$eval('#teamCalendarLeaveStatus', el => el.textContent), 'Pending Approval');
    assert.equal(await page.$eval('#teamCalendarLeaveReference', el => el.textContent), '');
    await backToCalendar();
    const medical = await openEmployee('a:nth-child(2)');
    assert.equal(medical.type, 'Sick Leave');
    assert.equal(medical.reason, 'Fever & Flu');
    assert.equal(medical.mcChitNo, '—');
    assert.equal(annual.mcChitNo, undefined);
    await backToCalendar();

    await page.focus(day('2026-09-14'));
    await page.keyboard.press('Enter');
    assert.equal(await summary(), '14 Sep 2026 · 0 employees on leave');
    assert.deepEqual(await staff(), []);
    assert.equal(await page.$eval('#teamSelectedDateEmpty', el => el.innerText), 'No leave scheduled for this date.');
    assert.equal(await page.$eval(grid + ' [aria-pressed="true"]', el => el.dataset.date), '2026-09-14');

    await page.click(day('2026-10-01'));
    assert.equal(await page.$eval('#teamCalMonthText', el => el.textContent), 'October 2026');
    assert.equal(await summary(), '1 Oct 2026 · 0 employees on leave');
    await page.click(day('2026-10-06'));
    assert.equal(await summary(), '6 Oct 2026 · 2 employees on leave');
    assert.deepEqual(await staff(), []);
    assert.equal(await page.$eval('#teamSelectedDateEmpty', el => el.innerText), 'Employee details are unavailable for this date.');
    await page.click(day('2026-09-29'));
    assert.equal(await summary(), '29 Sep 2026 · 2 employees on leave');
    assert.equal(await page.$eval('#teamSelectedDateApply', el => el.value), '2026-09-29');
    assert.equal(await page.$('#calDateDetailsDrawerOverlay.active'), null);
    await page.click('#teamSelectedDateApply');
    await page.waitForSelector('#viewApplyLeaveForm', { visible: true });
    assert.equal(await page.$eval('#mainFromDateInput', el => el.value), '2026-09-29');
    assert.equal(await page.$eval('#viewApplyLeaveForm [data-leave-field="reason"]', el => el.disabled), false);

    // The standalone calendar uses its own date sheet.
    await page.goto(leaveUrl + '&view=team-calendar', { waitUntil: 'domcontentloaded' });
    await page.click('#teamCalDaysGrid [data-day="11"]');
    await page.waitForSelector('#calDateDetailsDrawerOverlay.active');
    assert.equal(await page.$eval('#calModalDateTitle', el => el.textContent), '11 September 2026');

    console.log('PASS: Team calendar selection opens the employee’s read-only Leave Apply form and returns to the same date.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
