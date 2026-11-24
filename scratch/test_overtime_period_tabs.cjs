const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '..', 'modules/attendance/options/overtime.html')).href;
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const viewports = [320, 360, 390, 420];

async function periodResults(page) {
  return page.evaluate(() => ({
    dates: Array.from(document.querySelectorAll('.ot-record-card'))
      .filter(card => card.getClientRects().length > 0)
      .map(card => card.querySelector('time').dateTime),
    hours: document.getElementById('overtimeTotalHours').textContent,
    count: document.querySelector('.overtime-summary-count').innerText,
    empty: Boolean(document.getElementById('overtimeEmptyState')?.getClientRects().length)
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

    for (const theme of ['light', 'dark']) {
      for (const width of viewports) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(`${pageUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });

        const layout = await page.evaluate(() => {
          const container = document.querySelector('.pill-tabs-container');
          const tabs = [...container.querySelectorAll('.pill-tab')];
          const containerRect = container.getBoundingClientRect();
          const tabRects = tabs.map(tab => tab.getBoundingClientRect());

          return {
            labels: tabs.map(tab => tab.textContent.trim()),
            overflow: container.scrollWidth - container.clientWidth,
            scrollLeft: container.scrollLeft,
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
        assert.ok(layout.overflow <= 1, `${theme} ${width}px: period tabs must not scroll horizontally`);
        assert.equal(layout.scrollLeft, 0, `${theme} ${width}px: period tab row starts without horizontal offset`);
        assert.equal(
          layout.tabs.every(tab => tab.left >= layout.container.left - 1 && tab.right <= layout.container.right + 1),
          true,
          `${theme} ${width}px: all four period tabs must be fully visible`
        );
        assert.equal(layout.tabTextFits, true, `${theme} ${width}px: every period label must remain fully readable`);
        assert.ok(
          Math.max(...layout.tabs.map(tab => tab.top)) - Math.min(...layout.tabs.map(tab => tab.top)) <= 1,
          `${theme} ${width}px: all four period tabs must stay on one row`
        );
        assert.ok(
          Math.max(...layout.tabs.map(tab => tab.width)) - Math.min(...layout.tabs.map(tab => tab.width)) <= 1,
          `${theme} ${width}px: period tabs must share the available width equally`
        );

        assert.deepEqual(await periodResults(page), { dates: ['2026-09-14'], hours: '2.00', count: '1 record', empty: false });
        await page.click('[data-period="last-week"]');
        assert.deepEqual(await periodResults(page), { dates: ['2026-09-11'], hours: '2.00', count: '1 record', empty: false });
        await page.click('[data-period="this-month"]');
        assert.deepEqual(await periodResults(page), { dates: ['2026-09-14', '2026-09-11'], hours: '4.00', count: '2 records', empty: false });
        await page.click('[data-period="last-month"]');
        assert.deepEqual(await periodResults(page), { dates: [], hours: '0.00', count: '0 records', empty: true });
        assert.deepEqual(
          await page.$$eval('.pill-tab', tabs => tabs.map(tab => tab.classList.contains('active'))),
          [false, false, false, true],
          `${theme} ${width}px: the selected period remains interactive`
        );
        assert.equal(
          await page.$eval('.pill-tabs-container', container => container.scrollLeft),
          0,
          `${theme} ${width}px: selecting a period must not scroll the tab row`
        );
      }
    }

    await page.click('[data-period="last-week"]');
    await page.click('.ot-record-card:not([hidden])');
    await page.waitForSelector('#overtimeApprovedDetails', { visible: true });
    await page.click('#modal-ot-details [data-history-back]');
    await page.waitForSelector('#modal-ot-details', { hidden: true });
    assert.equal(await page.$eval('.pill-tab[aria-pressed="true"]', tab => tab.dataset.period), 'last-week');
    assert.deepEqual((await periodResults(page)).dates, ['2026-09-11']);

    // December 31 and January 1 share a week, but belong to different months.
    await page.$eval('.pill-tabs-container', tabs => { tabs.dataset.asOf = '2027-01-01'; });
    await page.$$eval('.ot-record-card', ([first, second]) => {
      first.querySelector('time').dateTime = '2027-01-01';
      second.querySelector('time').dateTime = '2026-12-31';
      second.querySelector('[data-actual-hours]').textContent = '1.25';
    });
    await page.click('[data-period="this-week"]');
    assert.deepEqual(await periodResults(page), { dates: ['2027-01-01', '2026-12-31'], hours: '3.25', count: '2 records', empty: false });
    await page.click('[data-period="last-month"]');
    assert.deepEqual(await periodResults(page), { dates: ['2026-12-31'], hours: '1.25', count: '1 record', empty: false });

    assert.deepEqual(pageErrors, [], 'Overtime period tabs render without page errors');
    console.log('Overtime period filters, totals and mobile layout passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
