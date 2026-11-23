const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '..', 'modules/attendance/options/attendance.html')).href;
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const viewports = [320, 360, 390, 420];

async function attendanceResults(page) {
  return page.evaluate(() => ({
    dates: Array.from(document.querySelectorAll('.attendance-record-card'))
      .filter(card => card.getClientRects().length > 0)
      .map(card => card.dataset.date),
    hours: document.getElementById('attendanceTotalHoursValue').textContent.trim(),
    range: document.getElementById('attendancePeriodRange').textContent.trim()
  }));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());

    for (const width of viewports) {
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

      const layout = await page.evaluate(() => {
        const container = document.querySelector('.me-jump-bar-container');
        const bar = document.getElementById('meJumpBar');
        const tabs = [...bar.querySelectorAll('.me-jump-pill')];
        const containerRect = container.getBoundingClientRect();
        const tabRects = tabs.map(tab => tab.getBoundingClientRect());
        const fade = document.getElementById('meJumpFade');

        return {
          labels: tabs.map(tab => tab.textContent.trim()),
          barOverflow: bar.scrollWidth - bar.clientWidth,
          containerOverflow: container.scrollWidth - container.clientWidth,
          fadeVisible: Boolean(fade) && getComputedStyle(fade).display !== 'none',
          tabs: tabRects.map(rect => ({
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width
          })),
          tabTextFits: tabs.every(tab => tab.scrollWidth <= tab.clientWidth + 1),
          container: { left: containerRect.left, right: containerRect.right }
        };
      });

      assert.deepEqual(layout.labels, ['This Week', 'Last Week', 'This Month', 'Last Month']);
      assert.ok(layout.barOverflow <= 1, `${width}px: period tabs must not scroll horizontally`);
      assert.ok(layout.containerOverflow <= 1, `${width}px: tab container must not overflow horizontally`);
      assert.equal(layout.fadeVisible, false, `${width}px: scroll affordance must be removed when every tab is visible`);
      assert.equal(
        layout.tabs.every(tab => tab.left >= layout.container.left - 1 && tab.right <= layout.container.right + 1),
        true,
        `${width}px: all four period tabs must be fully visible`
      );
      assert.equal(layout.tabTextFits, true, `${width}px: every period label must remain fully readable`);
      assert.ok(
        Math.max(...layout.tabs.map(tab => tab.top)) - Math.min(...layout.tabs.map(tab => tab.top)) <= 1,
        `${width}px: all four period tabs must stay on one row`
      );
      assert.ok(
        Math.max(...layout.tabs.map(tab => tab.width)) - Math.min(...layout.tabs.map(tab => tab.width)) <= 1,
        `${width}px: period tabs must share the available width equally`
      );

      assert.deepEqual(await attendanceResults(page), { dates: ['2026-09-15', '2026-09-14'], hours: '8.00/2.00', range: '14 Sep – 20 Sep 2026' });
      await page.click('.me-jump-pill:nth-child(2)');
      assert.deepEqual(await attendanceResults(page), { dates: ['2026-09-13'], hours: '7.80/0.00', range: '7 Sep – 13 Sep 2026' });
      await page.click('.me-jump-pill:nth-child(3)');
      assert.deepEqual(await attendanceResults(page), { dates: ['2026-09-15', '2026-09-14', '2026-09-13'], hours: '15.80/2.00', range: '1 Sep – 30 Sep 2026' });
      await page.click('.me-jump-pill:last-child');
      assert.deepEqual(await attendanceResults(page), { dates: [], hours: '0.00/0.00', range: '1 Aug – 31 Aug 2026' });
      await page.waitForSelector('#attendanceEmptyState', { visible: true });
      assert.equal(await page.$eval('#verifyAllBtn', button => button.disabled), true);
      assert.deepEqual(
        await page.$$eval('.me-jump-pill', tabs => tabs.map(tab => tab.classList.contains('active'))),
        [false, false, false, true],
        `${width}px: the selected period remains interactive`
      );
      assert.equal(await page.$eval('#meJumpBar', bar => bar.scrollLeft), 0, `${width}px: selecting a period must not scroll the tab row`);
    }

    await page.goto(new URL('../index.html?scope=individual', pageUrl).href, { waitUntil: 'domcontentloaded' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('a[href^="options/attendance.html"]')
    ]);
    await page.click('[data-period="last-week"]');
    await page.click('.attendance-record-card:not([hidden]) .btn-feedback');
    assert.equal(await page.$eval('#fbMetaDate', date => date.textContent), 'Sun 13 Sep 2026');
    await page.click('#feedbackModalOverlay [data-feedback-back]');
    await page.waitForSelector('#feedbackModalOverlay', { hidden: true });
    await page.click('#verifyAllBtn');
    assert.deepEqual(await page.$$eval('.attendance-verify-button', buttons => buttons.map(button => button.ariaPressed)), ['false', 'false', 'true']);
    await page.click('[data-period="this-week"]');
    assert.equal(await page.$eval('#attendanceUpdateBtn', button => button.hidden), true);
    await page.click('#verifyAllBtn');
    await page.click('#attendanceUpdateBtn');
    await page.click('[data-period="last-week"]');
    assert.equal(await page.$eval('#attendanceUpdateBtn', button => button.hidden), false, 'Saving this week leaves last week’s selection pending');
    assert.equal(await page.$eval('#verifyAllBtn', button => button.ariaPressed), 'true');
    await page.click('#attendanceUpdateBtn');

    await page.click('.enterprise-toast-btn');
    await page.select('#attendanceExceptionFilter', 'late-in');
    await page.click('#attendanceApplyFilter');
    await page.waitForSelector('#filterModalOverlay', { hidden: true });
    await page.click('[data-period="this-week"]');
    assert.equal(await page.$('.attendance-record-card:not([hidden])'), null);
    await page.click('[data-period="this-month"]');
    assert.deepEqual(await attendanceResults(page), { dates: ['2026-09-13'], hours: '7.80/0.00', range: '1 Sep – 30 Sep 2026' });
    await page.click('[data-period="this-week"]');
    await page.click('.enterprise-toast-btn');
    await page.click('#attendanceFilterReset');
    assert.deepEqual(await attendanceResults(page), { dates: ['2026-09-15', '2026-09-14'], hours: '8.00/2.00', range: '14 Sep – 20 Sep 2026' });
    await page.click('#attendanceApplyFilter');
    await page.waitForSelector('#filterModalOverlay', { hidden: true });

    // Exercise calendar rollovers through the same period controls.
    await page.$eval('#meJumpBar', bar => { bar.dataset.asOf = '2027-01-01'; });
    await page.click('[data-period="this-week"]');
    assert.equal((await attendanceResults(page)).range, '28 Dec 2026 – 3 Jan 2027');
    await page.click('[data-period="last-month"]');
    assert.equal((await attendanceResults(page)).range, '1 Dec – 31 Dec 2026');
    await page.$eval('#meJumpBar', bar => { bar.dataset.asOf = '2024-03-31'; });
    await page.click('[data-period="last-month"]');
    assert.equal((await attendanceResults(page)).range, '1 Feb – 29 Feb 2024');

    assert.deepEqual(pageErrors, [], 'Attendance period tabs render without page errors');
    console.log('Attendance period filters, totals and mobile layout passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
