const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const screenshotDir = process.env.HIGHLIGHT_SCREENSHOT_DIR || __dirname;

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
        assert.deepEqual(await page.$$eval('.highlight-table-card th', nodes => nodes.map(node => node.textContent)), ['Emp No.', 'Name', 'Hours', 'Branch', 'Department', 'Position']);
        assert.equal(await page.$eval('#highlightTotalRecords', node => node.textContent), kind === 'overtime' ? '8' : '6');
        assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), kind === 'overtime' ? '62.00' : '648.73');
        const metadata = await page.$$eval(body + ' tr', rows => rows.map(row => [row.cells[3].textContent.trim(), row.cells[4].textContent.trim(), row.cells[5].textContent.trim()]));
        assert.ok(metadata.every(values => values.every(value => value && value !== '—')), 'Highlight employees need branch, department and position preview data');
        assert.equal(await page.$$eval(body + ' .branch-pill', nodes => nodes.length), 0, 'Branch must be ordinary table text');
        assert.equal(await page.$eval(body + ' tr td:nth-child(4)', node => node.textContent), kind === 'overtime' ? 'TIMES SQ' : 'USJ 20');
        await page.screenshot({ path: path.resolve(screenshotDir, `${kind}-highlight-table-${theme}-${width}.png`) });
        await page.click(body + ' [data-highlight-hours]');
        if (kind === 'overtime') {
          await page.waitForSelector('#overtimeDetailRows tr');
          assert.ok(new URL(page.url()).pathname.endsWith('/overtime-highlight-details.html'));
          assert.equal(await page.$('#highlightDetailsModal'), null);
          assert.equal(await page.$eval('#highlightDetailName', node => node.textContent), 'Test2');
          assert.equal(await page.$('#highlightDetailEmpNo'), null);
          assert.equal(await page.$eval('#overtimeDetailSubtitle', node => node.innerText), 'Overtime Detail');
          assert.equal(await page.$eval('#overtimeDetailCount', node => node.textContent), '5 Records');
          assert.equal(await page.$eval('#highlightDetailsTotal', node => node.textContent), '7.50');
          assert.deepEqual(await page.$$eval('.overtime-detail-table th', nodes => nodes.map(node => node.textContent)), ['Date', 'OT Type', 'Hours']);
          assert.deepEqual(await page.$$eval('#overtimeDetailRows tr', rows => rows.map(row => row.cells[2].textContent)), ['2.50', '2.00', '0.50', '2.00', '0.50']);
          assert.match(await page.$eval('#overtimeDetailRows', node => node.textContent), /23 Sep 2026OT 1.5 BEFORE WORK/);
        } else {
          await page.waitForSelector('.attendance-detail-record');
          assert.ok(new URL(page.url()).pathname.endsWith('/attendance-highlight-details.html'));
          assert.equal(await page.$eval('#highlightDetailName', node => node.textContent), 'Aqilah Antasha');
          assert.equal(await page.$eval('#highlightDetailName + p #highlightDetailEmpNo', node => node.textContent), '000008');
          assert.equal(await page.$eval('#attendanceDetailCount', node => node.textContent), '5 Records');
          assert.equal(await page.$eval('#highlightDetailsTotal', node => node.textContent), '40.50');
          assert.equal(await page.$eval('.attendance-detail-record time', node => node.textContent), 'Thu, 17 Sep 2026');
          assert.deepEqual(await page.$$eval('.attendance-detail-record:first-child dd', nodes => nodes.map(node => node.textContent)), ['—', '8:00 AM – 5:00 PM', '1957', '8.00']);
          assert.equal(await page.$$eval('.attendance-detail-exception:not([hidden])', nodes => nodes.length), 4);
          assert.equal(await page.$eval('.main-content', node => node.scrollWidth > node.clientWidth), false);
        }
        if (kind === 'overtime') await page.screenshot({ path: path.resolve(screenshotDir, `${kind}-highlight-details-${theme}-${width}.png`) });
        await page.click('#' + kind + 'DetailBack');
        await page.waitForSelector(body + ' tr');
        if (kind === 'attendance') {
          await page.click(body + ' [data-highlight-hours="000009"]');
          await page.waitForSelector('#attendanceDetailEmpty', { visible: true });
          assert.equal(await page.$eval('#highlightDetailName', node => node.textContent), 'Chan Mee Ling');
          assert.equal(await page.$eval('#attendanceDetailCount', node => node.textContent), '0 Records');
          assert.equal(await page.$eval('#highlightDetailsTotal', node => node.textContent), '0.00');
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await page.waitForSelector(body + ' tr');
        }
        await page.click('.view-chart-btn');
        assert.equal(await page.$$eval('#highlightChartView > section', nodes => nodes.length), 3);
        assert.equal(await page.$eval('#highlightCenterTotal', node => node.textContent), kind === 'overtime' ? '62.00' : '648.73');
        const chartSum = await page.$$eval('[data-chart-value]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.chartValue), 0));
        assert.ok(Math.abs(chartSum - (kind === 'overtime' ? 62 : 648.73)) < .001);
        await page.screenshot({ path: path.resolve(screenshotDir, `${kind}-highlight-chart-${theme}-${width}.png`) });
        await page.click('#highlightViewTrend');
        assert.equal(await page.$$eval('#highlightTrendView > section, #highlightTrendView > button', nodes => nodes.length), 3);
        assert.equal(await page.$eval('#trendTotalHours', node => node.textContent), kind === 'overtime' ? '7.50' : '40.50', 'Trend must only use dated records that actually exist');
        const bars = await page.$$eval('[data-highlight-trend-bar]', nodes => nodes.map(node => node.textContent.trim()));
        assert.equal(bars.length, kind === 'overtime' ? 2 : 1);
        assert.match(bars[0], kind === 'overtime' ? /Sep 2026.*7.00/s : /Sep 2026.*40.50/s);
        await page.screenshot({ path: path.resolve(screenshotDir, `${kind}-highlight-trend-${theme}-${width}.png`) });
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
        if (kind === 'attendance') {
          await page.click('#highlightFilterTrigger');
          await page.$eval('#filterFromDate', node => { node.value = '2026-09-17'; });
          await page.$eval('#filterToDate', node => { node.value = '2026-09-19'; });
          await page.click('#highlightApplyFilter');
          await page.waitForSelector('#highlightFilterModal', { hidden: true });
          await page.click(body + ' td.hours-number', { offset: { x: 2, y: 2 } });
          await page.waitForSelector('.attendance-detail-record');
          await page.reload({ waitUntil: 'domcontentloaded' });
          assert.equal(await page.$eval('#attendanceDetailCount', node => node.textContent), '3 Records');
          assert.equal(await page.$eval('#highlightDetailsTotal', node => node.textContent), '24.50');
          assert.deepEqual(await page.$$eval('[data-field="clockTimes"]', nodes => nodes.map(node => node.textContent)), ['1957', '0755 1202 1258 1731 1957', '0827 1159 1258 1510 1523 1738']);
          await page.screenshot({ path: path.resolve(screenshotDir, `${kind}-highlight-details-${theme}-${width}.png`) });
          await page.click('#attendanceDetailBack');
          await page.waitForSelector(body + ' tr');
          assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), '24.50');
          assert.match(await page.$eval('#highlightFilterSummaryText', node => node.textContent), /#000008/);
        }
        await page.click('#highlightFilterTrigger');
        await page.$eval('#filterFromDate', node => { node.value = '2026-09-23'; });
        await page.$eval('#filterToDate', node => { node.value = '2026-09-23'; });
        await page.click('#highlightApplyFilter');
        await page.waitForSelector('#highlightFilterModal', { hidden: true });
        assert.equal(await page.$eval('#highlightTotalRecords', node => node.textContent), kind === 'overtime' ? '1' : '0');
        assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), kind === 'overtime' ? '0.50' : '0.00');
        assert.match(await page.$eval('#highlightFilterSummaryText', node => node.textContent), /Available dated records/);
        if (kind === 'overtime') {
          await page.click(body + ' [data-highlight-hours]');
          await page.waitForSelector('#overtimeDetailRows tr');
          await page.reload({ waitUntil: 'domcontentloaded' });
          assert.equal(await page.$eval('#overtimeDetailCount', node => node.textContent), '1 Record');
          assert.equal(await page.$eval('#highlightDetailsTotal', node => node.textContent), '0.50');
          assert.equal(await page.$$eval('#overtimeDetailRows tr', nodes => nodes.length), 1);
          await page.click('#overtimeDetailBack');
          await page.waitForSelector(body + ' tr');
          assert.equal(await page.$eval('#highlightMetricValue', node => node.textContent), '0.50');
          assert.match(await page.$eval('#highlightFilterSummaryText', node => node.textContent), /#1122333/);
        }
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
        console.log(`PASS ${kind} ${theme} ${width}: photo records, hours details, filtered charts, real monthly trend and navigation`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
