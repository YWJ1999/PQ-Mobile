const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

// Checks photo data, real Hours interactions, filtered totals and the complete
// report -> donut -> trend bars -> month analysis -> back navigation.
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      for (const kind of ['overtime', 'attendance']) {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(path.resolve(__dirname, `../modules/attendance/options/${kind}-highlight.html`)).href + `?theme=${theme}`, { waitUntil: 'domcontentloaded' });
        const body = `#${kind}HighlightTableBody`;
        assert.equal(await page.$eval(body + ' tr td:nth-child(2)', node => node.textContent.trim()), kind === 'overtime' ? 'Test2' : 'Aqilah Antasha', 'Employees must come from the provided photos');
        assert.deepEqual(await page.$$eval('.highlight-table-card th', nodes => nodes.map(node => node.textContent)), ['Emp #', 'Name', 'Hours', 'Branch', 'Department', 'Position']);
        assert.equal(await page.$eval('#highlightTotalRecords', node => node.textContent), kind === 'overtime' ? '8' : '6');
        assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), kind === 'overtime' ? '62.00' : '648.73');
        const metadata = await page.$$eval(body + ' tr', rows => rows.map(row => [row.cells[3].textContent.trim(), row.cells[4].textContent.trim(), row.cells[5].textContent.trim()]));
        assert.ok(metadata.every(values => values.every(value => value && value !== '—')), 'Highlight employees need branch, department and position preview data');
        assert.equal(await page.$$eval(body + ' .branch-pill', nodes => nodes.length), 0, 'Branch must be ordinary table text');
        assert.equal(await page.$eval(body + ' tr td:nth-child(4)', node => node.textContent), kind === 'overtime' ? 'TIMES SQ' : 'USJ 20');
        await page.screenshot({ path: path.resolve(__dirname, `${kind}-highlight-table-${theme}-${width}.png`) });
        await page.click(body + ' [data-highlight-hours]');
        await page.waitForSelector('#highlightDetailsModal', { visible: true });
        assert.equal(await page.$('#highlightDetailEmpNo'), null);
        assert.equal(await page.$$eval('.leave-highlight-detail-record', nodes => nodes.length), 5);
        if (kind === 'overtime') {
          assert.deepEqual(await page.$$eval('.leave-highlight-detail-record [data-field="hours"]', nodes => nodes.map(node => node.textContent)), ['2.50', '2.00', '0.50', '2.00', '0.50']);
          assert.equal(await page.$eval('#highlightDetailsTotal', node => node.textContent), '7.50');
          assert.match(await page.$eval('#highlightDetailsList', node => node.textContent), /OT 1.5 BEFORE WORK/);
        } else {
          assert.match(await page.$eval('.leave-highlight-detail-record', node => node.textContent), /17 Sep 2026.*Shift.*8.00AM–5.00PM.*Clock Times.*1957.*Hours.*8.00.*Exception.*Absent/s);
          assert.equal(await page.$$eval('[data-field="exception"]', nodes => nodes.length), 4, 'Do not invent an exception omitted from the cropped photo');
          const layout = await page.$eval('.leave-highlight-detail-record', card => {
            const rect = field => card.querySelector(`[data-field="${field}"]`).parentElement.getBoundingClientRect();
            const shift = rect('shift'), clock = rect('clockTimes'), hours = rect('hours'), exception = rect('exception');
            return { shift: shift.width, exception: exception.width, exceptionTop: exception.top, otherBottom: Math.max(clock.bottom, hours.bottom) };
          });
          assert.ok(Math.abs(layout.shift - layout.exception) < 1, 'Exception must span the full detail row like Shift');
          assert.ok(layout.exceptionTop >= layout.otherBottom, 'Exception sits below Clock Times and Hours');
        }
        await page.screenshot({ path: path.resolve(__dirname, `${kind}-highlight-details-${theme}-${width}.png`) });
        await page.click('#highlightDetailsModal [aria-label="Close details"]');
        await page.waitForSelector('#highlightDetailsModal', { hidden: true });
        await page.click('.view-chart-btn');
        assert.equal(await page.$$eval('#highlightChartView > section', nodes => nodes.length), 3);
        assert.equal(await page.$eval('#highlightCenterTotal', node => node.textContent), kind === 'overtime' ? '62.00' : '648.73');
        const chartSum = await page.$$eval('[data-chart-value]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.chartValue), 0));
        assert.ok(Math.abs(chartSum - (kind === 'overtime' ? 62 : 648.73)) < .001);
        await page.screenshot({ path: path.resolve(__dirname, `${kind}-highlight-chart-${theme}-${width}.png`) });
        await page.click('#highlightViewTrend');
        assert.equal(await page.$$eval('#highlightTrendView > section, #highlightTrendView > button', nodes => nodes.length), 3);
        assert.equal(await page.$eval('#trendTotalHours', node => node.textContent), kind === 'overtime' ? '7.50' : '40.50', 'Trend must only use dated records that actually exist');
        const bars = await page.$$eval('[data-highlight-trend-bar]', nodes => nodes.map(node => node.textContent.trim()));
        assert.equal(bars.length, kind === 'overtime' ? 2 : 1);
        assert.match(bars[0], kind === 'overtime' ? /Sep 2026.*7.00/s : /Sep 2026.*40.50/s);
        await page.screenshot({ path: path.resolve(__dirname, `${kind}-highlight-trend-${theme}-${width}.png`) });
        await page.click('[data-highlight-trend-bar]');
        assert.equal(await page.$eval('#highlightAnalysisCenterTotal', node => node.textContent), kind === 'overtime' ? '7.00' : '40.50');
        assert.equal(await page.$eval('#highlightAnalysisSubtitle', node => node.textContent), 'As At Sep 2026');
        assert.equal(await page.$$eval('#highlightAnalysisView > section', nodes => nodes.length), 3);
        await page.click('.header-btn-icon');
        assert.equal(await page.$eval('#highlightTrendView', node => node.hidden), false);
        await page.click('#trendTotalCard');
        assert.equal(await page.$eval('#highlightAnalysisCenterTotal', node => node.textContent), kind === 'overtime' ? '7.50' : '40.50');
        await page.click('.header-btn-icon');
        await page.click('.header-btn-icon');
        await page.click('.header-btn-icon');
        await page.click('#highlightFilterTrigger');
        await page.waitForSelector('#highlightFilterModal', { visible: true });
        assert.equal(await page.$$eval('#highlightFilterModal .standard-filter-header-actions button', nodes => nodes.length), 2);
        await page.$eval('#filterKeyword', (node, keyword) => { node.value = keyword; }, kind === 'overtime' ? '#1122333' : '#000008');
        await page.click('#highlightApplyFilter');
        await page.waitForSelector('#highlightFilterModal', { hidden: true });
        assert.equal(await page.$eval('#highlightTotalRecords', node => node.textContent), '1');
        assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), kind === 'overtime' ? '7.50' : '128.50');
        await page.click('#highlightFilterTrigger');
        await page.$eval('#filterFromDate', node => { node.value = '2026-09-23'; });
        await page.$eval('#filterToDate', node => { node.value = '2026-09-23'; });
        await page.click('#highlightApplyFilter');
        await page.waitForSelector('#highlightFilterModal', { hidden: true });
        assert.equal(await page.$eval('#highlightTotalRecords', node => node.textContent), kind === 'overtime' ? '1' : '0');
        assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), kind === 'overtime' ? '0.50' : '0.00');
        assert.match(await page.$eval('#highlightFilterSummaryText', node => node.textContent), /Available dated records/);
        await page.click('.view-chart-btn');
        assert.equal(await page.$eval('#highlightCenterTotal', node => node.textContent), kind === 'overtime' ? '0.50' : '0.00');
        assert.match(await page.$eval('#highlightChartNote', node => node.textContent), /available dated records/i);
        assert.equal(await page.$eval('.main-content', node => node.scrollWidth > node.clientWidth), false);
        await page.click('.header-btn-icon');
        await page.click('#highlightFilterTrigger');
        await page.$eval('#filterToDate', node => { node.value = '2026-09-01'; });
        await page.click('#highlightApplyFilter');
        assert.equal(await page.$eval('#highlightFilterModal', node => node.hidden), false, 'Reversed date range must be rejected');
        await page.click('#highlightResetFilter');
        await page.waitForSelector('#highlightFilterModal', { hidden: true });
        assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), kind === 'overtime' ? '62.00' : '648.73');
        assert.deepEqual(errors, []);
        console.log(`PASS ${kind} ${theme} ${width}: photo records, hours popup, filtered charts, real monthly trend and navigation`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
