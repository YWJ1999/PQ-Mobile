const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

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
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });

    await page.click('#tabCalendarBtn');
    await page.$$eval('#gridCalDays .grid-cal-cell', cells => {
      cells.find(cell => cell.querySelector('.grid-cal-date')?.textContent.trim() === '3').click();
    });

    await page.click('#calSummaryCard [data-kind="ot"]');
    assert.deepEqual(await page.$$eval('ot-plan-summary dd', nodes => nodes.map(el => el.textContent)), ['03 Sep 2026', '73', '120.00']);
    assert.deepEqual(await page.$$eval('ot-plan-summary summary strong', nodes => nodes.map(el => el.textContent)), ['Shift · 8.30:17.30W']);
    assert.deepEqual(await page.$$eval('ot-plan-summary tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
      ['OT 1.5 Before Work', '26', '26.00'], ['1.5 OT', '55', '94.00']
    ]);
    await page.focus('ot-plan-summary summary');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('ot-plan-summary details', group => group.open), false);
    await page.keyboard.press('Enter');
    await page.click('ot-plan-summary tbody tr:first-child td:last-child');
    assert.deepEqual(await page.$eval('ot-plan-employee-detail .shift-employee-overview', card =>
      [...card.querySelectorAll('h2, [data-date], [data-shift], dd')].map(node => node.textContent)
    ), ['OT 1.5 Before Work', '03 Sep 2026', '8.30:17.30W', '26', '26.00']);
    assert.equal(await page.$$eval('ot-plan-employee-detail tbody tr', rows => rows.length), 26);
    assert.deepEqual(await page.$eval('ot-plan-employee-detail tbody tr', row => [...row.cells].map(cell => cell.textContent)), [
      '000016 - Raju Kumar', 'ACCOUNT EXECUTIVE', '1.00'
    ]);

    await page.click('#view-ot-plan-detail [aria-label="Back"]');
    assert.equal(await page.evaluate(() => document.activeElement.closest('tr').querySelector('th').textContent), 'OT 1.5 Before Work');
    await page.click('#view-ot-plan-summary [aria-label="Back"]');
    await page.evaluate(() => {
      leaveEmployeeDataset[0].leaveDay = '0.50';
      leaveEmployeeDataset[1].leaveDay = 0;
      const annual = calendarGroups.find(group => group.type === 'ANNUAL LEAVE');
      annual.employees = annual.employees.slice(0, 1);
      annual.leaveDays = 1.75;
    });
    await page.click('#calSummaryCard [data-kind="leave"]');
    assert.deepEqual(await page.$$eval('leave-summary dd', nodes => nodes.map(el => el.textContent)), ['03 Sep 2026', '5']);
    assert.deepEqual(await page.$$eval('leave-summary summary strong', nodes => nodes.map(el => el.textContent)), ['Shift · 8.30:17.30W']);
    assert.deepEqual(await page.$$eval('leave-summary tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
      ['Annual Leave', '2'], ['Medical Leave', '3'], ['Unpaid Leave', '1']
    ]);
    await page.focus('leave-summary summary');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('leave-summary details', card => card.open), false);
    await page.keyboard.press('Enter');
    await page.click('leave-summary tbody tr:first-child button');
    assert.deepEqual(await page.$$eval('leave-employee-detail dd', nodes => nodes.map(el => el.textContent)), ['2', '1.75']);
    assert.equal(await page.$$eval('leave-employee-detail tbody tr', rows => rows.length), 1);
    await page.click('#view-leave-detail [aria-label="Back"]');
    await page.click('leave-summary tbody tr:nth-child(2) th');
    assert.deepEqual(await page.$eval('leave-employee-detail .shift-employee-overview', card =>
      [...card.querySelectorAll('h2, [data-date], [data-shift], dd')].map(node => node.textContent)
    ), ['Medical Leave', '03 Sep 2026', '8.30:17.30W', '3', '1.50']);
    assert.deepEqual(await page.$$eval('leave-employee-detail tbody tr', rows =>
      rows.map(row => [...row.cells].map(cell => cell.textContent))
    ), [
      ['000073 - Ww', 'BFT & COM.EXECUTIVE', '0.50'],
      ['M5545 - Juni Bte Razak', 'MANAGEMENT EXECUTIVE', '0.00'],
      ['TEST6 - Test', 'FRONT DESK AGENT', '1.00']
    ]);
    await page.click('#view-leave-detail [aria-label="Back"]');
    assert.equal(await page.evaluate(() => document.activeElement.closest('tr').querySelector('th').textContent), 'Medical Leave');
    await page.click('#view-leave-summary [aria-label="Back"]');
    await page.click('.planning-filter');
    await page.type('#calendarFilterSearchKeyword', '000073');
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    await page.click('#calSummaryCard [data-kind="leave"]');
    assert.equal(await page.$eval('leave-summary [data-headcount]', el => el.textContent), '1', 'The selected employee counts once across leave types');
    assert.deepEqual(await page.$$eval('leave-summary tbody td', cells => cells.map(el => el.textContent)), ['1', '1', '1']);
    await page.click('leave-summary tbody tr:last-child button');
    assert.deepEqual(await page.$$eval('leave-employee-detail tbody th', nodes => nodes.map(el => el.textContent)), ['000073 - Ww']);
    assert.equal(await page.$eval('leave-employee-detail [data-leave-days]', node => node.textContent), '0.50');

    await page.click('#view-leave-detail [aria-label="Back"]');
    await page.click('#view-leave-summary [aria-label="Back"]');
    await page.click('.planning-filter');
    await page.$eval('#calendarFilterSearchKeyword', input => { input.value = '000016'; });
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    await page.click('#calSummaryCard [data-kind="ot"]');
    assert.deepEqual(await page.$$eval('ot-plan-summary dd', nodes => nodes.map(el => el.textContent)), ['03 Sep 2026', '1', '2.00']);
    await page.click('ot-plan-summary tbody tr:last-child th');
    assert.deepEqual(await page.$$eval('ot-plan-employee-detail tbody th', nodes => nodes.map(el => el.textContent)), ['000016 - Raju Kumar']);

    assert.deepEqual(errors, []);
    console.log('PASS: OT Plan cards and grouped Leave Summary open the correct employee details for the selected date and filters.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
