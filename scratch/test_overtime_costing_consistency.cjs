const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const screenshotDir = process.argv[2] || __dirname;

const money = text => Number(text.replace(/[^0-9.-]/g, ''));
const sum = values => Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
const tableTotal = async page => sum((await page.$$eval('#overtimeCostingTableBody td:nth-child(3)', nodes => nodes.map(node => node.textContent))).map(money));
const recordCount = page => page.$eval('record-chart-count', node => node.textContent.trim());
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < .001, `${message}: ${actual} != ${expected}`);

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/overtime-costing.html')).href + `?theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.ok(await page.$('link[href="../../../css/attendance-hours-highlight.css"]'), 'Costing must use the Highlight design');
      assert.deepEqual(await page.$$eval('.highlight-table-card th', nodes => nodes.map(node => node.textContent)), ['Date', 'Cost Centre', 'Amount']);
      const records = await page.$$eval('#overtimeCostingTableBody tr', nodes => nodes.map(node => [...node.cells].map(cell => cell.textContent)));
      assert.deepEqual(records, [
        ['23 May 2025', 'OTHERS', '276.84'],
        ['15 Aug 2025', '—', '1,284.48'],
        ['23 Nov 2022', 'MANAGEMENT', '509.59'],
        ['14 Jul 2026', 'HUMAN RESOURCES', '241.20'],
        ['18 Nov 2022', 'PRODUCTION', '693.36'],
        ['9 Dec 2022', 'HUMAN RESOURCES', '218.88'],
        ['23 Nov 2022', 'N/A', '262.80']
      ], 'Use exactly the complete visible screenshot records');
      assert.equal(await page.$$eval('#costingMetricValue, #costingSourceReference', nodes => nodes.length), 0);
      assert.doesNotMatch(await page.$eval('#highlightReportView', node => node.textContent), /Visible Records Cost|Source report total|Charts include visible records only/);
      const total = sum(records.map(row => money(row[2])));
      assert.equal(await recordCount(page), `${records.length} Records`);
      assert.equal(await page.$eval('.attendance-report-summary-row:first-child .record-chart-button', node => node.textContent), 'View Chart');
      assert.equal(await page.$eval('.attendance-report-summary-row:nth-child(2) .attendance-report-summary-label', node => node.textContent), 'Total Cost');
      assert.deepEqual(await page.$$eval('.attendance-report-summary-row:nth-child(2) .hours-highlight-exports button', buttons => buttons.map(button => button.getAttribute('aria-label'))), ['Export PDF', 'Export Excel']);
      close(money(await page.$eval('#costingTotalCost', node => node.textContent)), total, 'Summary cost');
      close(await tableTotal(page), total, 'Report sum');
      assert.equal(await page.$$eval('#overtimeCostingTableBody button, #overtimeCostingTableBody [onclick], #overtimeCostingTableBody a', nodes => nodes.length), 0, 'Table must have no drilldown');
      await page.click('#overtimeCostingTableBody td');
      assert.equal(await page.$eval('#highlightReportView', node => node.hidden), false);
      assert.equal(await page.$$eval('.modal-overlay:not([hidden])', nodes => nodes.length), 0);
      assert.equal(await page.$eval('.view-chart-btn', node => getComputedStyle(node).whiteSpace), 'nowrap');
      assert.ok(await page.$('.view-chart-btn .fa-chart-pie'));
      await page.screenshot({ path: path.resolve(screenshotDir, `overtime-costing-table-${theme}-${width}.png`) });
      await page.click('.view-chart-btn');
      assert.equal(await page.$$eval('#highlightChartView > section', nodes => nodes.length), 3);
      close(money(await page.$eval('#highlightCenterTotal', node => node.textContent)), total, 'Chart sum');
      assert.match(await page.$eval('#highlightChartNote', node => node.textContent), /Visible records only/);
      close(await page.$$eval('#highlightChartLegend [data-chart-value]', nodes => nodes.reduce((value, node) => value + Number(node.dataset.chartValue), 0)), total, 'Legend sum including Other');
      const viewAll = await page.$eval('#highlightViewAll', node => node.hidden);
      if (!viewAll) {
        await page.click('#highlightViewAll');
        close(await page.$$eval('#highlightChartLegend [data-chart-value]', nodes => nodes.reduce((value, node) => value + Number(node.dataset.chartValue), 0)), total, 'Expanded legend sum');
      }
      await page.select('#highlightMetricSelect', 'costCenter');
      close(money(await page.$eval('#highlightCenterTotal', node => node.textContent)), total, 'Dimension change keeps total');
      await page.screenshot({ path: path.resolve(screenshotDir, `overtime-costing-chart-${theme}-${width}.png`) });
      await page.click('#highlightViewTrend');
      close(money(await page.$eval('#trendTotalCost', node => node.textContent)), total, 'Trend sum');
      const months = await page.$$eval('[data-costing-trend-bar]', nodes => nodes.map(node => ({ month: node.dataset.costingTrendBar, total: Number(node.dataset.costingValue) })));
      assert.deepEqual(months, [
        { month: '2022-11', total: 1465.75 }, { month: '2022-12', total: 218.88 },
        { month: '2025-05', total: 276.84 }, { month: '2025-08', total: 1284.48 },
        { month: '2026-07', total: 241.20 }
      ], 'Trend must use screenshot dates and amounts');
      close(sum(months.map(month => month.total)), total, 'All months add to report');
      await page.screenshot({ path: path.resolve(screenshotDir, `overtime-costing-trend-${theme}-${width}.png`) });
      for (const month of months) {
        await page.click(`[data-costing-trend-bar="${month.month}"]`);
        assert.equal(await page.$eval('#highlightAnalysisView', node => node.hidden), false);
        close(money(await page.$eval('#highlightAnalysisCenterTotal', node => node.textContent)), month.total, 'Month drilldown total');
        close(await page.$$eval('#highlightAnalysisChartLegend [data-chart-value]', nodes => nodes.reduce((value, node) => value + Number(node.dataset.chartValue), 0)), month.total, 'Month breakdown sum');
        await page.select('#highlightAnalysisMetricSelect', 'status');
        close(money(await page.$eval('#highlightAnalysisCenterTotal', node => node.textContent)), month.total, 'Month dimension change');
        await page.click('.header-btn-icon');
        assert.equal(await page.$eval('#highlightTrendView', node => node.hidden), false);
      }
      await page.click('#trendTotalCard');
      close(money(await page.$eval('#highlightAnalysisCenterTotal', node => node.textContent)), total, 'Period drilldown');
      await page.screenshot({ path: path.resolve(screenshotDir, `overtime-costing-analysis-${theme}-${width}.png`) });
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      assert.equal(await page.$eval('#highlightReportView', node => node.hidden), false);

      // Draft filters are discarded on close. Applied filters drive every view.
      await page.click('#highlightFilterTrigger');
      await page.waitForSelector('#highlightFilterModal', { visible: true });
      const initialDate = await page.$eval('#filterFromDate', node => node.value);
      const centre = records[0][1];
      await page.select('#filterCostCenter', centre);
      await page.click('[aria-label="Close filter"]');
      await page.click('#highlightFilterTrigger');
      assert.equal(await page.$eval('#filterCostCenter', node => node.value), 'all');
      await page.select('#filterCostCenter', centre);
      await page.click('#highlightApplyFilter');
      await page.waitForSelector('#highlightFilterModal', { hidden: true });
      const expectedCentre = sum(records.filter(row => row[1] === centre).map(row => money(row[2])));
      close(await tableTotal(page), expectedCentre, 'Cost Centre filter');
      assert.equal(await recordCount(page), '1 Record');
      close(money(await page.$eval('#costingTotalCost', node => node.textContent)), expectedCentre, 'Filtered summary cost');
      await page.click('.view-chart-btn');
      close(money(await page.$eval('#highlightCenterTotal', node => node.textContent)), expectedCentre, 'Filtered chart');
      await page.click('#highlightViewTrend');
      close(money(await page.$eval('#trendTotalCost', node => node.textContent)), expectedCentre, 'Filtered trend');
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      await page.click('#highlightFilterTrigger');
      await page.$eval('#filterToDate', node => { node.value = '2020-01-01'; });
      await page.click('#highlightApplyFilter');
      assert.equal(await page.$eval('#highlightFilterModal', node => node.hidden), false, 'Reject reversed dates');
      await page.click('#highlightResetFilter');
      close(await tableTotal(page), total, 'Reset');
      assert.equal(await recordCount(page), `${records.length} Records`);
      // A date range with matching data must update the table and both chart paths.
      await page.click('#highlightFilterTrigger');
      await page.$eval('#filterFromDate', node => { node.value = '2022-11-23'; });
      await page.$eval('#filterToDate', node => { node.value = '2022-11-23'; });
      await page.click('#highlightApplyFilter');
      assert.equal(await page.$eval('#costingTotalCost', node => node.textContent), '772.39');
      close(await tableTotal(page), 772.39, 'Single date filter');
      await page.click('.view-chart-btn');
      close(money(await page.$eval('#highlightCenterTotal', node => node.textContent)), 772.39, 'Single date chart');
      await page.click('#highlightViewTrend');
      close(money(await page.$eval('#trendTotalCost', node => node.textContent)), 772.39, 'Single date trend');
      await page.click('[data-costing-trend-bar="2022-11"]');
      close(money(await page.$eval('#highlightAnalysisCenterTotal', node => node.textContent)), 772.39, 'Month analysis respects date filter');
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      await page.click('#highlightFilterTrigger');
      await page.click('#highlightResetFilter');
      await page.click('#highlightFilterTrigger');
      assert.equal(await page.$eval('#filterFromDate', node => node.value), initialDate);
      await page.$eval('#filterFromDate', node => { node.value = '2030-01-01'; });
      await page.$eval('#filterToDate', node => { node.value = '2030-01-31'; });
      await page.click('#highlightApplyFilter');
      assert.match(await page.$eval('#overtimeCostingTableBody', node => node.textContent), /No records/);
      assert.equal(await recordCount(page), '0 Records');
      assert.equal(await page.$eval('#costingTotalCost', node => node.textContent), '0.00');
      await page.click('.view-chart-btn');
      assert.equal(await page.$eval('#highlightCenterTotal', node => node.textContent), '0.00');
      assert.equal(await page.$$eval('#highlightDonutCircles circle', nodes => nodes.length), 0);
      await page.click('#highlightViewTrend');
      assert.equal(await page.$eval('#trendTotalCard', node => node.disabled), true);
      assert.equal(await page.$$eval('[data-costing-trend-bar]', nodes => nodes.length), 0);
      assert.equal(await page.$eval('.main-content', node => node.scrollWidth > node.clientWidth), false, 'No page overflow');
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      await page.click('#highlightFilterTrigger');
      await page.click('#highlightResetFilter');
      await page.click('#highlightFilterTrigger');
      assert.deepEqual(await page.$$eval('#filterStatus option', nodes => nodes.map(node => node.textContent)), ['All Statuses', 'Unspecified'], 'Do not invent approval statuses');
      await page.screenshot({ path: path.resolve(screenshotDir, `overtime-costing-filter-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#highlightFilterModal', node => node.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'highlightFilterTrigger', 'Close restores focus');
      await page.click('#highlightFilterTrigger');
      await page.focus('#highlightApplyFilter');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'highlightResetFilter', 'Trap focus in filter');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'highlightApplyFilter');
      await page.select('#filterStatus', 'Unspecified');
      await page.click('#highlightApplyFilter');
      const statusTotal = await tableTotal(page);
      await page.click('.view-chart-btn');
      close(money(await page.$eval('#highlightCenterTotal', node => node.textContent)), statusTotal, 'Status filter chart');
      await page.click('#highlightViewTrend');
      close(money(await page.$eval('#trendTotalCost', node => node.textContent)), statusTotal, 'Status filter trend');
      await page.click('.header-btn-icon');
      await page.click('.header-btn-icon');
      await page.emulateMediaType('print');
      assert.equal(await page.$eval('#highlightReportView', node => getComputedStyle(node).display !== 'none'), true);
      assert.equal(await page.$eval('.phone-container', node => getComputedStyle(node).overflow), 'visible');
      await page.emulateMediaType('screen');
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: table, chart, dimensions, real monthly drilldowns, applied filters, reset, empty state and navigation`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
