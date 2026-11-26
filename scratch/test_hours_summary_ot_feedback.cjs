const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const summaryUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/hours-summary.html')).href;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(summaryUrl + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('#odd-clocking-day-count', node => node.innerText), '0');
      await page.evaluate(() => openListDetails('Normal OT Hours'));
      const rows = await page.$$eval('.summary-history-detail', nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim()));
      assert.deepEqual(rows, ['Clock Times 07:45, 17:50', 'Approved OT 0.50 Hrs']);
      assert.equal(await page.$$eval('[data-summary-feedback]', nodes => nodes.length), 0);
      await page.click('.summary-history-card');
      await page.waitForSelector('#modal-attendance-details', { visible: true });
      assert.deepEqual(await page.$$eval('#ad-overtime-info-table tr', nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim())), ['OT Code OB1', 'Description OT 1.5 BEFORE WORK', 'OT Hours 00:30', 'UOT No']);
      await page.evaluate(() => closeAttendanceDetails(true));
      await page.waitForSelector('#modal-attendance-details', { hidden: true });
      await page.evaluate(() => openListDetails('Other OT Hours'));
      assert.equal(await page.$$eval('.summary-history-card', nodes => nodes.length), 1);
      assert.deepEqual(await page.$$eval('.summary-history-detail', nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim())), ['Clock Times 08:14, 19:00', 'Approved OT 1.50 Hrs']);
      assert.equal(await page.$eval('#list-total-hours', node => node.innerText), '1.50');
      assert.equal(await page.$eval('#other-ot-hours-total', node => node.innerText), '0.00');
      await page.click('.summary-history-card');
      await page.waitForSelector('#modal-attendance-details', { visible: true });
      assert.equal(await page.$eval('#ad-date', node => node.innerText), '10 Sep 2026');
      assert.equal(await page.$eval('#ad-approved-ot', node => node.innerText), '1.50');
      assert.deepEqual(await page.$$eval('#ad-overtime-info-table tr', nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim())), ['OT Code OA2', 'Description OT 2.0 AFTER WORK', 'OT Hours 01:30', 'UOT No']);
      await page.evaluate(() => closeAttendanceDetails(true));
      await page.waitForSelector('#modal-attendance-details', { hidden: true });
      assert.equal(await page.$$eval('[data-summary-feedback]', nodes => nodes.length), 0);
      await page.evaluate(() => openListDetails('Odd Clocking Days'));
      assert.equal(await page.$$eval('.summary-history-card', nodes => nodes.length), 8);
      assert.equal(await page.$$eval('[data-summary-feedback]', nodes => nodes.length), 5);
      assert.equal(await page.$$eval('[data-summary-feedback] i', nodes => nodes.length), 0, 'Feedback is text only');
      assert.deepEqual(await page.$$eval('.summary-history-card', nodes => nodes.map(node => Array.from(node.querySelectorAll('.summary-history-detail')).map(row => row.innerText.replace(/\s+/g, ' ').trim()))),
        ['17:40', '19:00', '07:02', '07:37', '07:13', '07:34', '07:07', '07:58'].map(time => [`Clock Times ${time}`, 'Normal Hours 0.00']));
      await page.click('.summary-history-card');
      await page.waitForSelector('#modal-attendance-details', { visible: true });
      assert.deepEqual(await page.evaluate(() => ['ad-emp-no', 'ad-name', 'ad-date', 'ad-shift', 'ad-clock-times', 'ad-normal-hours', 'ad-absent', 'ad-exception'].map(id => document.getElementById(id).innerText)),
        ['EBB12', 'Farhan binti rahmat', '9 Feb 2026', '8.30AM–5.30PM (W01)', '1740', '-', 'No', 'Odd Clocking']);
      assert.equal(await page.$eval('#ad-overtime-info-table', node => node.hidden), true, 'An odd punch has no Overtime Info');
      assert.equal(await page.$eval('#ad-leave-info-table', node => node.hidden), true);
      await page.waitForFunction(() => getComputedStyle(document.getElementById('modal-attendance-details')).opacity === '1');
      await page.screenshot({ path: path.resolve(__dirname, 'hours_summary_odd_details_' + theme + '.png') });
      await page.evaluate(() => closeAttendanceDetails(true));
      await page.waitForSelector('#modal-attendance-details', { hidden: true });
      await page.screenshot({ path: path.resolve(__dirname, 'hours_summary_odd_feedback_' + theme + '.png') });
      // Enter on the action must activate Feedback, never the containing detail card.
      await page.focus('[data-summary-feedback]');
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);
      await page.waitForSelector('#feedbackModalOverlay', { visible: true });
      assert.equal(await page.$eval('#fbMetaDate', node => node.innerText), 'Mon 9 Feb 2026');
      assert.equal(await page.$eval('#fbMetaShift', node => node.innerText), '8.30AM–5.30PM (W01)');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(await page.$$eval('#feedbackModalOverlay .pill-tab', nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim())), ['+ Sun 8 Feb 2026', '+ Mon 9 Feb 2026', '+ Tue 10 Feb 2026']);
      assert.deepEqual(await page.$$eval('.fb-clock-date-label, .fb-clock-bottom-date', nodes => nodes.map(node => node.innerText)), ['9 Feb', '9 Feb']);
      assert.equal(await page.$eval('.fb-clock-pill-blue', node => node.innerText), '17:40');
      assert.equal(await page.$eval('.fb-clock-pill-white', node => node.innerText), '17:40');
      assert.equal(await page.$eval('#fbMetaEmployeeName', node => node.innerText), 'Farhan binti rahmat');
      assert.equal(await page.$eval('#fbMetaEmployeeNo', node => node.innerText), 'EBB12');
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('#feedbackModalOverlay .hero-info-banner', node => node.scrollWidth <= node.clientWidth + 1), true, `Employee details fit at ${width}px`);
        assert.equal(await page.evaluate(() => document.getElementById('fbMetaEmployeeNo').getBoundingClientRect().top >= document.getElementById('fbMetaEmployeeName').getBoundingClientRect().bottom), true, 'ID appears below the name');
      }
      await page.setViewport({ width: 390, height: 950 });
      assert.equal(await page.$eval('#fbAmendReasonSelect', node => node.value), '', 'No amendment reason is assumed');
      await page.click('#feedbackModalOverlay .pill-tab:last-child');
      assert.deepEqual(await page.$$eval('.fb-clock-date-label, .fb-clock-bottom-date', nodes => nodes.map(node => node.innerText)), ['9 Feb', '9 Feb', '10 Feb', '10 Feb']);
      await page.waitForFunction(() => getComputedStyle(document.getElementById('feedbackModalOverlay')).opacity === '1');
      await page.screenshot({ path: path.resolve(__dirname, 'hours_summary_odd_feedback_form_' + theme + '.png') });
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('[data-feedback-back]')]);
      assert.equal(await page.$eval('#headerTitle', node => node.innerText), 'Odd Clocking Days');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.equal(await page.$$eval('[data-summary-feedback]', nodes => nodes.length), 5);
    }
    // An odd punch with a known original time must not inherit the unrelated demo punches.
    const feedbackUrl = new URL('attendance.html', summaryUrl);
    feedbackUrl.search = new URLSearchParams({ theme: 'light', feedbackFrom: 'hours-summary', feedbackDate: '31 Dec 2026', feedbackShift: 'Custom shift', feedbackClockTimes: '08:09' });
    await page.goto(feedbackUrl.href, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('.fb-clock-pill-blue', node => node.innerText), '08:09');
    assert.deepEqual(await page.$$eval('#feedbackModalOverlay .pill-tab', nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim())), ['+ Wed 30 Dec 2026', '+ Thu 31 Dec 2026', '+ Fri 1 Jan 2027']);
    await page.click('#feedbackModalOverlay .attendance-form-draft');
    await page.waitForFunction(() => document.getElementById('headerTitle')?.innerText === 'Odd Clocking Days');
    assert.deepEqual(errors, []);
    console.log('PASS: Normal/Other OT fields and totals; Odd Clocking Feedback action; existing form, record data, date boundaries and return navigation in both themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
