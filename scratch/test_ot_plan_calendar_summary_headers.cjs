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

    await page.click('#tabCalendarBtn');
    for (const [kind, viewId, count, hours, shifts] of [
      ['total', 'view-ot-plan-summary', '73', '127.00', 2],
      ['approved', 'view-approved-ot-summary', '28', '45.00', 1],
      ['pending', 'view-pending-ot-summary', '45', '82.00', 2]
    ]) {
      await page.click('#calSummaryCard .is-' + kind);
      const view = '#' + viewId;
      assert.deepEqual(await page.$$eval(view + ' dd', nodes => nodes.map(el => el.textContent)), ['15 Sep 2026', count, hours]);
      assert.equal(await page.$$eval(view + ' details[open]', nodes => nodes.length), shifts);
      if (shifts > 1) await page.click(view + ' details:first-child summary');
      await page.click(view + ' details:last-child tbody tr:last-child td:last-child');
      assert.equal(await page.$eval('#view-ot-plan-detail', el => el.classList.contains('active')), true);
      await page.click('#view-ot-plan-detail [aria-label="Back"]');
      assert.equal(await page.evaluate(() => document.activeElement.closest('.view-container').id), viewId);
      assert.equal(await page.$eval(view + ' details:first-child', group => group.open), shifts === 1);
      await page.click(view + ' [aria-label="Back"]');
    }

    await page.evaluate(() => openSummaryViewFromCal('view-leave-summary'));
    assert.deepEqual(await page.$$eval('leave-summary dd', nodes => nodes.map(el => el.textContent)), ['15 Sep 2026', '6']);
    assert.deepEqual(await page.$$eval('leave-summary tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
      ['Annual Leave', '3'], ['Medical Leave', '2'], ['Unpaid Leave', '1']
    ]);
    await page.click('leave-summary tbody tr:last-child button');
    assert.deepEqual(await page.$eval('leave-employee-detail .shift-employee-overview', card =>
      [...card.querySelectorAll('h2, [data-date], [data-shift], dd')].map(node => node.textContent)
    ), ['Unpaid Leave', '15 Sep 2026', '8.30:17.30W', '1', '1.00']);
    assert.deepEqual(await page.$$eval('leave-employee-detail tbody tr', rows =>
      rows.map(row => [...row.cells].map(cell => cell.textContent))
    ), [['000019 - Tee ang lung', 'ACCOUNT EXECUTIVE', '1.00']]);
    await page.click('#view-leave-detail [aria-label="Back"]');
    assert.equal(await page.evaluate(() => document.activeElement.closest('tr').querySelector('th').textContent), 'Unpaid Leave');
    assert.deepEqual(errors, []);
    console.log('OT Plan calendar summary header consistency checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
