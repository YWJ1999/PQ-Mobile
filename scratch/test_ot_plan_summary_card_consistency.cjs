const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const otPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;
const shiftPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;
const manpowerUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/daily-manpower.html')).href;

async function readCardStyles(page) {
  return page.evaluate(() => {
    const card = document.querySelector('#view-ot-plan-summary details');
    const header = card.querySelector('summary');
    const heading = card.querySelector('thead th');
    const value = card.querySelector('tbody td:last-child');
    const pick = (element, properties) => {
      const styles = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, styles[property]]));
    };

    return {
      card: pick(card, ['display', 'width', 'padding', 'overflow', 'borderRadius', 'backgroundColor']),
      header: pick(header, ['padding', 'backgroundColor', 'color']),
      columnHeader: pick(heading, ['padding', 'color', 'fontWeight']),
      hours: pick(value, ['fontSize', 'fontWeight', 'textAlign'])
    };
  });
}

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

    await page.goto(shiftPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabCalendarBtn');
    await page.click('#calSummaryCard [data-kind="ot"]');
    const shiftCardStyles = await readCardStyles(page);
    assert.equal(await page.$$eval('ot-plan-summary details[open]', cards => cards.length), 1);
    assert.equal(await page.$$eval('ot-plan-summary tbody tr', rows => rows.length), 2);
    assert.equal(await page.$$eval('ot-plan-summary summary .fa-chevron-right', icons => icons.length), 1);

    await page.goto(otPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabCalendarBtn');
    await page.click('#calSummaryCard .is-total');
    const view = '#view-ot-plan-summary';
    assert.deepEqual(await readCardStyles(page), shiftCardStyles);
    assert.deepEqual(await page.$$eval(view + ' summary strong', nodes => nodes.map(el => el.textContent)), [
      'Shift · 8.30:17.30W', 'Shift · 0700:1500'
    ]);
    assert.deepEqual(await page.$$eval(view + ' tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
      ['OT 1.5 Before Work', '28', '45.00'], ['OT 1.5 After Work', '35', '62.00'], ['OT 2.0 Rest Day', '10', '20.00']
    ]);
    await page.click(view + ' tbody tr:first-child th');
    assert.equal(await page.$eval('#view-ot-plan-detail', view => view.classList.contains('active')), true);
    assert.equal(await page.$eval('ot-plan-employee-detail [data-shift]', node => node.textContent), '8.30:17.30W');
    await page.goto(manpowerUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      manpowerPreviewDetails[1].otPlan = [
        { id: 'early-extra', shift: '8.30:17.30W', otType: 'OT 1.5 Before Work', headcount: 2, hours: 0.75, employees: [
          { empNo: '000002', name: 'Test employee', jobTitle: 'Executive', hours: 0.5 }
        ] },
        { id: 'late-extra', shift: '14.00:22.00W', otType: '1.5 OT', headcount: 1, hours: 1.25, employees: [] }
      ];
      renderManpowerList();
    });
    await page.click('#boxkpiOtPlan');
    assert.deepEqual(await page.$$eval('ot-plan-summary dd', nodes => nodes.map(el => el.textContent)), ['20 Sep 2026', '95', '137.00']);
    assert.deepEqual(await page.$$eval('ot-plan-summary tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
      ['OT 1.5 Before Work', '32', '30.75'], ['1.5 OT', '62', '105.00'], ['1.5 OT', '1', '1.25']
    ]);
    await page.click('[data-detail-id="early-extra"]');
    assert.deepEqual(await page.$$eval('ot-plan-employee-detail h2, ot-plan-employee-detail [data-shift], ot-plan-employee-detail dd', nodes => nodes.map(el => el.textContent)), ['OT 1.5 Before Work', '8.30:17.30W', '32', '30.75']);
    assert.deepEqual(await page.$$eval('ot-plan-employee-detail tbody th', nodes => nodes.slice(0, 2).map(el => el.textContent)), ['000002 - Test employee', '0000101 - Lee Soon Hock']);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.detailId), 'early-extra');
    assert.deepEqual(errors, []);

    console.log('OT Plan summary cards use the Shift Planning layout and open employee details.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
