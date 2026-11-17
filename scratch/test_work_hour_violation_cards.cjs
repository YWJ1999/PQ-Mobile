const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

// Catches stale date/counts, filters leaking before Apply, and details opening
// with another employee's dates instead of the selected attendance records.
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/work-hour-violation.html')).href + `?theme=${theme}`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.$$eval('#viewContinuous .violation-card', cards => cards.length), 4, 'Cards must reflect the available filtered records');
        assert.equal(await page.$('.attendance-report-summary'), null);
        assert.equal(await page.$('.view-chart-btn'), null);
        await page.click('#viewContinuous [data-violation-detail]');
        await page.waitForSelector('#detailModal', { visible: true });
        assert.equal(await page.$eval('#detailName', el => el.textContent), 'LSH');
        assert.equal(await page.$('#detailEmpNo'), null);
        assert.deepEqual(await page.$$eval('#detailModal th', els => els.map(el => el.textContent)), ['Date', 'Shift', 'Clock Time']);
        assert.equal(await page.$$eval('#detailTableBody tr', els => els.length), 7);
        assert.match(await page.$eval('#detailTableBody', el => el.textContent), /10 Jan 2026/);
        assert.ok(await page.$eval('#detailModal .violation-close i', icon => icon.getBoundingClientRect().width >= 10), 'Popup Close must have a visible cross icon');
        await page.screenshot({ path: path.resolve(__dirname, `violation-continuous-popup-${theme}-${width}.png`) });
        await page.keyboard.press('Escape');
        await page.waitForSelector('#detailModal', { hidden: true });

        await page.click('#boxRest');
        assert.equal(await page.$eval('#boxRest', el => el.getAttribute('aria-selected')), 'true');
        assert.equal(await page.$eval('#currentDateDisplay', el => el.textContent), '25 Sep 2026', 'Initial tab switch must select the latest available example date');
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);
        assert.equal(await page.$eval('#viewRest .violation-card-footer', el => el.textContent), 'Below 30 rest hours at 25/09/2026');
        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        assert.deepEqual(await page.$$eval('#violationFilterForm .form-field label', labels => labels.map(label => label.textContent)), ['Date', 'Branch', 'Department']);
        assert.equal(await page.$$eval('#filterModal .filter-header-row button', buttons => buttons.length), 2, 'Shared filter initialization must retain one Reset and one Close');
        await page.screenshot({ path: path.resolve(__dirname, `violation-filter-${theme}-${width}.png`) });
        await page.$eval('#filterDateInput', el => { el.value = '2026-09-25'; });
        await page.click('#filterApplyButton');
        await page.waitForSelector('#filterModal', { hidden: true });
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);
        assert.equal(await page.$$eval('#viewContinuous .violation-card', cards => cards.length), 0);
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);
        assert.deepEqual(await page.$$eval('.hist-tab-btn', tabs => tabs.map(tab => tab.textContent)), ['Continuous Work', 'Below 30 Rest Hour']);
        await page.screenshot({ path: path.resolve(__dirname, `violation-cards-${theme}-${width}.png`) });
        await page.click('#viewRest [data-violation-detail]');
        await page.waitForSelector('#detailModal', { visible: true });
        assert.equal(await page.$eval('#detailName', el => el.textContent), 'Aqilah Antasha');
        assert.equal(await page.$eval('#detailRecordCount', el => el.textContent), '3');
        assert.equal(await page.$eval('#detailModal .violation-detail-meta', meta => {
          const summary = meta.querySelector('.record-summary-card');
          const metaBox = meta.getBoundingClientRect();
          const summaryBox = summary.getBoundingClientRect();
          return Math.abs(summaryBox.left - metaBox.left) <= 1 && Math.abs(summaryBox.right - metaBox.right) <= 1;
        }), true, 'Total Records card must span the full detail content width');
        assert.deepEqual(await page.$$eval('#detailTableBody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
          ['24 Sep 2026', 'OFF DAY', '0830, 1945'],
          ['25 Sep 2026', 'REST DAY', '0828, 1945'],
          ['26 Sep 2026', '8.30AM–5.30PM (W01)', '0825, 1925']
        ]);
        const fits = await page.evaluate(() => {
          const modal = document.querySelector('#detailModal .modal-content');
          const table = document.querySelector('#detailModal table');
          return table.getBoundingClientRect().right <= modal.getBoundingClientRect().right && modal.scrollHeight <= document.querySelector('.phone-container').clientHeight;
        });
        assert.ok(fits, 'Detail table must fit the phone');
        await page.screenshot({ path: path.resolve(__dirname, `violation-popup-${theme}-${width}.png`) });
        await page.click('#detailModal .violation-close');
        await page.waitForSelector('#detailModal', { hidden: true });
        await page.click('[aria-label="Previous Day"]');
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 0);
        await page.click('[aria-label="Next Day"]');
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);

        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        await page.$eval('#filterDateInput', el => { el.value = '2026-07-10'; });
        await page.click('#filterApplyButton');
        await page.waitForSelector('#filterModal', { hidden: true });
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 3);
        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        await page.select('#filterDeptSelect', 'ACCOUNTS');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#filterModal', { hidden: true });
        await page.click('#boxContinuous');
        await page.click('#boxRest');
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 3, 'Dismissed draft filter must not be committed by changing tabs');
        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        assert.equal(await page.$eval('#filterDeptSelect', el => el.value), 'all');
        await page.select('#filterDeptSelect', 'ACCOUNTS');
        await page.click('#filterApplyButton');
        await page.waitForSelector('#filterModal', { hidden: true });
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);
        await page.click('#viewRest [data-violation-detail]');
        await page.waitForSelector('#detailModal', { visible: true });
        assert.equal(await page.$eval('#detailName', el => el.textContent), 'Loh Siew Hong');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#detailModal', { hidden: true });
        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        await page.select('#filterBranchSelect', 'unspecified');
        await page.click('#filterApplyButton');
        await page.waitForSelector('#filterModal', { hidden: true });
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);
        assert.equal(await page.$eval('#filterSummaryText', el => el.textContent), 'Branch not specified • ACCOUNTS');
        assert.equal(await page.$eval('.main-content', el => el.scrollWidth > el.clientWidth), false);
        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        await page.click('#filterResetButton');
        await page.waitForSelector('#filterModal', { hidden: true });
        assert.equal(await page.$$eval('#viewContinuous .violation-card', cards => cards.length), 0);
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 1);
        await page.click('#boxContinuous');
        assert.equal(await page.$eval('#currentDateDisplay', el => el.textContent), '16 Jan 2026');
        assert.equal(await page.$$eval('#viewContinuous .violation-card', cards => cards.length), 4);
        await page.click('.filter-trigger-btn');
        await page.waitForSelector('#filterModal', { visible: true });
        await page.click('#filterApplyButton');
        await page.waitForSelector('#filterModal', { hidden: true });
        await page.click('#boxRest');
        assert.equal(await page.$eval('#currentDateDisplay', el => el.textContent), '16 Jan 2026', 'Explicitly applied dates must remain selected when switching tabs');
        assert.equal(await page.$$eval('#viewRest .violation-card', cards => cards.length), 0, 'Explicit Jan 16 filter must not show September records');
        await page.click('#boxContinuous');
        // Capture the final tab colors after the switcher transition settles.
        await new Promise(resolve => setTimeout(resolve, 250));
        await page.screenshot({ path: path.resolve(__dirname, `violation-continuous-${theme}-${width}.png`) });
        assert.deepEqual(errors, []);
        console.log(`PASS ${theme} ${width}: no totals or charts, date, committed filters, tabs without counts, employee details and mobile layout`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
