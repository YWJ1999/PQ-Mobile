const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;

async function inspectPage(browser, config, theme, width) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
  await page.goto(`${url(config.file)}?theme=${theme}`, { waitUntil: 'networkidle0' });

  assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
  assert.equal(await page.$$eval('.highlight-report-view', nodes => nodes.length), 1);
  assert.equal(await page.$$eval('.highlight-filter-card', nodes => nodes.length), 1);
  assert.equal(await page.$$eval('.highlight-summary-card', nodes => nodes.length), 1);
  assert.equal(await page.$$eval('.highlight-table-card', nodes => nodes.length), 1);
  if (config.noChart) {
    assert.equal(await page.$('.view-chart-btn'), null);
    assert.equal(await page.$('.highlight-chart-view'), null);
    assert.deepEqual(await page.$$eval('thead th', nodes => nodes.map(node => node.textContent.trim())), ['Date', 'Name', 'Amount']);
    assert.deepEqual(await page.evaluate(config.readSummary), config.expectedSummary);
    assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);
    await page.screenshot({ path: path.join(__dirname, `hours-costing-report-${theme}-${width}.png`) });
    const readTotals = () => page.evaluate(() => ({ records: document.getElementById('totalRecordsVal').textContent, cost: document.getElementById('totalCostVal').textContent }));
    const open = () => page.click('#highlightFilterTrigger');
    const fill = (id, value) => page.$eval(`#${id}`, (node, text) => { node.value = text; node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    const apply = () => page.click('#highlightApplyFilter');
    const reset = async () => { await open(); await page.click('#highlightResetFilter'); };
    await open();
    assert.deepEqual(await page.$$eval('.highlight-filter-form label', nodes => nodes.map(node => node.textContent)), ['Keywords', 'Start Date', 'End Date', 'Costing Type', 'Cost Center']);
    await page.screenshot({ path: path.join(__dirname, `hours-costing-filter-${theme}-${width}.png`) });
    await fill('filterKeywordInput', '#004101');
    await apply();
    assert.deepEqual(await readTotals(), { records: '1', cost: 'RM 192.00' });
    assert.equal(await page.$eval('#employeeCostingList .emp-card-name', node => node.textContent), 'Lee Soon Hock');
    await open();
    await fill('filterKeywordInput', 'Kelly');
    await page.click('.standard-filter-close');
    assert.deepEqual(await readTotals(), { records: '1', cost: 'RM 192.00' }, 'Closing a draft filter must preserve the applied report');
    await reset();
    assert.deepEqual(await readTotals(), { records: '19', cost: 'RM 3,351.90' });
    await open();
    await fill('filterCostCenterSelect', 'CC-102');
    await apply();
    assert.deepEqual(await readTotals(), { records: '4', cost: 'RM 605.36' });
    await reset();
    await open();
    await fill('filterKeywordInput', 'lee');
    await apply();
    assert.deepEqual(await readTotals(), { records: '2', cost: 'RM 288.00' });
    await reset();
    await open();
    await fill('filterStartDateInput', '2026-09-21');
    await fill('filterEndDateInput', '2026-09-20');
    await apply();
    assert.equal(await page.$eval('#highlightFilterModal', node => node.hidden), false);
    assert.equal(await page.$eval('#filterEndDateInput', node => node.validity.valid), false);
    await fill('filterEndDateInput', '2026-09-22');
    await apply();
    assert.deepEqual(await readTotals(), { records: '0', cost: 'RM 0.00' });
    assert.match(await page.$eval('#employeeCostingList', node => node.textContent), /No records match/);
    await reset();
    for (const type of ['Regular Work hours', 'Overtime hours']) {
      await open();
      await fill('filterCostingTypeSelect', type);
      await apply();
      assert.deepEqual(await readTotals(), { records: '0', cost: 'RM 0.00' });
    }
    await reset();
    await open();
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#highlightFilterModal', node => node.hidden), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'highlightFilterTrigger');
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.close();
    return;
  }
  assert.deepEqual(await page.$eval('.view-chart-btn', button => ({
    text: button.textContent.replace(/\s+/g, ' ').trim(),
    icon: button.querySelector('i')?.classList.contains('fa-chart-simple'),
    whiteSpace: getComputedStyle(button).whiteSpace
  })), { text: 'Chart', icon: true, whiteSpace: 'nowrap' });

  const summary = await page.evaluate(config.readSummary);
  assert.deepEqual(summary, config.expectedSummary);
  assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);

  await page.click('.view-chart-btn');
  assert.equal(await page.$eval('.highlight-report-view', node => getComputedStyle(node).display), 'none');
  assert.notEqual(await page.$eval('.highlight-chart-view', node => getComputedStyle(node).display), 'none');
  assert.equal(await page.$$eval('.highlight-chart-view > .highlight-analysis-card', nodes => nodes.length), 3);
  assert.equal(await page.$$eval('.highlight-chart-view .highlight-breakdown-select', nodes => nodes.length), 1);
  assert.equal(await page.$$eval('.highlight-chart-view svg', nodes => nodes.length), 1);
  assert.equal(await page.$$eval('.highlight-chart-view .highlight-legend-grid', nodes => nodes.length), 1);
  assert.equal(await page.$eval('.highlight-chart-view', node => node.scrollWidth <= node.clientWidth + 1), true);
  assert.equal(await page.$$eval('#hoursCostingChartModal', nodes => nodes.length), 0);

  await page.click('.header-btn-icon');
  assert.notEqual(await page.$eval('.highlight-report-view', node => getComputedStyle(node).display), 'none');
  assert.equal(errors.length, 0, errors.join('\n'));
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    const pages = [
      {
        file: 'modules/attendance/options/hours-costing.html',
        noChart: true,
        readSummary: () => ({
          title: document.querySelector('.cal-top-header h1').textContent.trim(),
          records: document.getElementById('totalRecordsVal').textContent.trim(),
          total: document.getElementById('totalCostVal').textContent.trim(),
          rows: document.querySelectorAll('#employeeCostingList tr').length,
          firstName: document.querySelector('#employeeCostingList .emp-card-name').textContent.trim(),
          employeeIdCount: document.querySelectorAll('#employeeCostingList .emp-card-id').length
        }),
        expectedSummary: {
          title: 'Hours Costing',
          records: '19',
          total: 'RM 3,351.90',
          rows: 19,
          firstName: 'Lee Soon Hock',
          employeeIdCount: 0
        }
      },
      {
        file: 'modules/attendance/options/clocking-summary.html',
        readSummary: () => ({
          title: document.getElementById('pageHeaderTitle').textContent.trim(),
          records: document.getElementById('totalRecordsVal').textContent.trim(),
          total: document.getElementById('totalCountVal').textContent.trim(),
          rows: document.querySelectorAll('#summaryTableBody .summary-table-row').length,
          firstRow: document.querySelector('#summaryTableBody .summary-table-row').textContent.replace(/\s+/g, ' ').trim()
        }),
        expectedSummary: {
          title: 'Clocking Summary',
          records: '2',
          total: '6',
          rows: 2,
          firstRow: 'BENEFITS MANAGEMENT 4'
        }
      }
    ];

    for (const config of pages) {
      for (const theme of ['light', 'dark']) {
        for (const width of [360, 430]) {
          await inspectPage(browser, config, theme, width);
        }
      }
    }

    console.log('PASS: Hours Costing uses the Highlight report, three-column table and five working filters without a chart; Clocking Summary remains consistent.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
