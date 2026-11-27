const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

async function checkCalendar(query, gridId, summaryId) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    const url = pathToFileURL(path.resolve(__dirname, '../leave.html'));
    url.search = query;
    await page.goto(url.href);
    const grid = '#' + gridId;
    const summary = '#' + summaryId;

    for (const [day, title, name, duration, reference, submitted] of [
      ['10', 'Thu, 10 Sep 2026', 'Annual leave', 'Full day · Approved', 'Ref: LV-2026-0041', '05/09/2026'],
      ['22', 'Tue, 22 Sep 2026', 'Annual leave', 'Half day · 4.0 Hours (PM) · Approved', 'Ref: LV-2026-0047', '18/09/2026'],
      ['12', 'Sat, 12 Sep 2026', 'Medical leave', 'Full day · Approved', 'Ref: LV-2026-0044', '12/09/2026'],
      ['16', 'Wed, 16 Sep 2026', 'Malaysia Day', 'Full day', 'Ref: PH-2026-0009', null],
      ['17', 'Thu, 17 Sep 2026', 'No leave scheduled', '', null, null]
    ]) {
      await page.click(grid + ' [data-date="2026-09-' + day + '"]');
      const values = await page.$eval(summary, card => [
        card.querySelector('h3').textContent,
        card.querySelector('.cal-detail-name').textContent,
        card.querySelector('.cal-detail-time').textContent,
        card.querySelector('.leave-day-record p')?.textContent ?? null,
        card.querySelector('.card-submit-date strong')?.textContent ?? null
      ]);
      assert.deepEqual(values, [title, name, duration, reference, submitted]);
      assert.equal(await page.$eval(grid, (grid, id) =>
        grid.closest('.calendar-card').nextElementSibling.id === id &&
        grid.querySelector('[aria-pressed="true"]') === document.activeElement, summaryId), true);
      assert.equal(await page.evaluate(() => !!document.querySelector('#calEventSheetOverlay')?.getClientRects().length), false);
    }

    await page.click('.calendar-card:has(' + grid + ') [aria-label="Next month"]');
    assert.equal(await page.$eval(summary + ' h3', node => node.textContent), 'Sat, 17 Oct 2026');
    assert.equal(await page.$eval(summary + ' .cal-detail-name', node => node.textContent), 'No leave scheduled');
    console.log('PASS: ' + gridId + ' shows the selected tile details below the calendar.');
  } finally {
    await browser.close();
  }
}

module.exports = checkCalendar;
if (require.main === module) {
  checkCalendar('', 'indivCalDaysGrid', 'indivCalEventDetail').catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
