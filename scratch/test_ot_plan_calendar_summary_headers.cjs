const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 900 });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });

    const summaries = [
      ['view-ot-plan-summary', '2'],
      ['view-approved-ot-summary', '1'],
      ['view-pending-ot-summary', '2'],
      ['view-leave-summary', '3']
    ];

    for (const [viewId, expectedRecords] of summaries) {
      await page.evaluate(id => openSummaryViewFromCal(id), viewId);
      const summary = await page.$eval(`#${viewId} .calendar-summary-meta`, card => {
        const rows = Array.from(card.querySelectorAll('.calendar-summary-meta-row'));
        const cardStyle = getComputedStyle(card);
        const recordStyle = getComputedStyle(rows[1]);
        const valueStyle = getComputedStyle(rows[1].querySelector('.calendar-summary-meta-value'));
        return {
          display: cardStyle.display,
          columns: cardStyle.gridTemplateColumns,
          background: cardStyle.backgroundColor,
          rowTexts: rows.map(row => row.textContent.replace(/\s+/g, ' ').trim()),
          recordBorderTop: recordStyle.borderTopWidth,
          recordValue: rows[1].querySelector('.calendar-summary-meta-value').textContent.trim(),
          recordValueColor: valueStyle.color,
          iconCount: card.querySelectorAll('i').length
        };
      });

      assert.equal(summary.display, 'grid');
      assert.equal(summary.iconCount, 0);
      assert.equal(summary.rowTexts[0], 'Date: 15 Sep 2026');
      assert.equal(summary.rowTexts[1], `${expectedRecords} ${expectedRecords === '1' ? 'Record' : 'Records'}`);
      assert.equal(summary.recordValue, expectedRecords);
      assert.equal(summary.recordBorderTop, '1px');
      assert.notEqual(summary.background, 'rgb(255, 255, 255)');
      assert.equal(summary.recordValueColor, 'rgb(124, 58, 237)');
    }

    assert.deepEqual(errors, []);
    console.log('OT Plan calendar summary header consistency checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
