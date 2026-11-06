const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/organization-statistics.html')).href;
    const total = () => page.$eval('#orgStatisticsTotalRecords', node => Number(node.textContent));
    const apply = async values => {
      await page.click('#orgStatisticsFilterTrigger');
      await page.evaluate(values => { for (const [key, value] of Object.entries(values)) document.querySelector(`#orgStatisticsFilterForm [name="${key}"]`).value = value; }, values);
      await page.click('#orgStatisticsApplyFilter');
    };
    const reset = async () => {
      await page.click('#orgStatisticsFilterTrigger');
      await page.click('#orgStatisticsResetFilter');
      await page.click('#orgStatisticsApplyFilter');
    };
    const back = () => page.click('#orgStatisticsBack');
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 844 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$('.employee-career-coming-card'), null, 'Organization Statistics has a real report');
      assert.equal(await total(), 48);
      assert.deepEqual(await page.$$eval('#orgStatisticsCards h2', nodes => nodes.slice(0, 2).map(node => node.textContent)), ['ACCOUNTS', 'AUDIT']);
      assert.deepEqual(await page.$$eval('#orgStatisticsCards .org-statistics-card:first-child dt', nodes => nodes.map(node => node.textContent)), ['Period', 'Measure', 'Total Value', 'Average Value', 'Company Average']);
      assert.deepEqual(await page.$eval('#orgStatisticsViewChart', node => ({ text: node.textContent.trim(), icon: !!node.querySelector('.fa-chart-simple'), nowrap: getComputedStyle(node).whiteSpace })), { text: 'Chart', icon: true, nowrap: 'nowrap' });
      await page.click('#orgStatisticsFilterTrigger');
      assert.equal(await page.$$eval('#orgStatisticsFilterForm [name]', nodes => nodes.length), 9, 'Seven filters, with two controls in each period');
      assert.deepEqual(await page.$$eval('#orgStatisticsSummaryType option', nodes => nodes.map(node => node.textContent)), ['Month', 'Quarter', 'Year']);
      assert.deepEqual(await page.$$eval('#orgStatisticsMeasureType option', nodes => nodes.map(node => node.textContent)), ['MC Days', 'Overtime Hours', 'Late Hours', 'Absent Days', 'Absent for Overtime', 'Absent for Training']);
      for (const width of [840, 360, 390]) {
        await page.setViewport({ width, height: 844 });
        assert.ok(await page.evaluate(() => {
          const phone = document.querySelector('.phone-container').getBoundingClientRect();
          const overlay = document.getElementById('orgStatisticsFilterDialog').getBoundingClientRect();
          return overlay.left >= phone.left - 1 && overlay.right <= phone.right + 1 && overlay.top >= phone.top - 1 && overlay.bottom <= phone.bottom + 1;
        }), 'The filter stays inside the phone at desktop and mobile sizes');
        await page.$eval('#orgStatisticsMeasureType', node => node.scrollIntoView({ block: 'nearest' }));
        assert.ok(await page.evaluate(() => document.getElementById('orgStatisticsMeasureType').getBoundingClientRect().bottom <= document.querySelector('#orgStatisticsFilterForm .standard-filter-footer').getBoundingClientRect().top + 1), 'The last field scrolls above the Apply button');
      }
      assert.equal(await page.$eval('main', node => node.inert), true, 'Filter prevents interaction with the report behind it');
      await page.focus('#orgStatisticsApplyFilter');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orgStatisticsResetFilter', 'Tab stays within the filter');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orgStatisticsFilterTrigger');
      assert.equal(await page.$eval('main', node => node.inert), false);
      await apply({ keyword: 'accounts', startYear: '2026', startMonth: '10', endYear: '2026', endMonth: '10' });
      assert.equal(await total(), 1, 'Keyword and month boundaries filter the report');
      assert.deepEqual(await page.$$eval('#orgStatisticsCards dd', nodes => nodes.map(node => node.textContent)), ['Oct 2026', 'MC Days', '8.40', '0.70', '0.85']);
      await page.click('#orgStatisticsFilterTrigger');
      await page.evaluate(() => { document.querySelector('[name="startMonth"]').value = '11'; });
      await page.click('#orgStatisticsApplyFilter');
      assert.equal(await page.$eval('#orgStatisticsFilterDialog', node => !node.hidden), true);
      assert.equal(await page.$eval('#orgStatisticsFilterError', node => node.hidden), false, 'Reversed periods are rejected');
      await page.keyboard.press('Escape');
      await apply({ measureType: 'overtimeHours' });
      assert.deepEqual(await page.$$eval('#orgStatisticsCards dd', nodes => nodes.slice(2).map(node => node.textContent)), ['96.00', '8.00', '7.64']);
      for (const [measureType, expected] of [
        ['lateHours', ['18.00', '1.50', '1.73']],
        ['absentDays', ['3.60', '0.30', '0.36']],
        ['absentOvertime', ['2.40', '0.20', '0.23']],
        ['absentTraining', ['1.20', '0.10', '0.12']]
      ]) {
        await apply({ measureType });
        assert.deepEqual(await page.$$eval('#orgStatisticsCards dd', nodes => nodes.slice(2).map(node => node.textContent)), expected);
      }
      await reset();
      await apply({ summaryType: 'quarter' });
      assert.equal(await total(), 20, 'Quarter summaries group each unit and calendar quarter');
      await apply({ summaryType: 'year' });
      assert.equal(await total(), 8, 'Yearly summaries group each unit and year');
      await reset();
      await apply({ orgUnitType: 'Branch' });
      assert.equal(await total(), 24);
      await reset();
      await apply({ company: 'PEOPLE QUEST SERVICES SDN BHD' });
      assert.equal(await total(), 24, 'Company isolates its units');
      await reset();
      await apply({ keyword: 'no matching organization' });
      assert.equal(await total(), 0);
      await page.click('#orgStatisticsViewChart');
      assert.equal(await page.$eval('#orgStatisticsChartTotal', node => node.textContent), '0.00');
      await page.click('#orgStatisticsViewTrend');
      assert.ok(await page.$$eval('#orgStatisticsTrendBars button', nodes => nodes.every(node => node.disabled)), 'Empty months cannot open misleading analysis');
      await back(); await back(); await reset();
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 844 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
      }
      await page.setViewport({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(__dirname, `organization-statistics-${theme}.png`) });
      await page.click('#orgStatisticsFilterTrigger');
      await page.screenshot({ path: path.join(__dirname, `organization-statistics-filter-${theme}.png`) });
      await page.keyboard.press('Escape');
      await page.click('#orgStatisticsViewChart');
      const chartTotal = await page.$eval('#orgStatisticsChartTotal', node => Number(node.dataset.value));
      for (const metric of ['company', 'period', 'unit']) {
        await page.select('#orgStatisticsChartMetric', metric);
        assert.equal(await page.$eval('#orgStatisticsChartTotal', node => Number(node.dataset.value)), chartTotal, 'Changing breakdown keeps the same statistic total');
      }
      assert.ok(Math.abs(await page.$$eval('#orgStatisticsChartLegend [data-value]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.value), 0)) - chartTotal) < 0.000001, 'Chart legend agrees with total');
      await page.screenshot({ path: path.join(__dirname, `organization-statistics-chart-${theme}.png`) });
      await page.click('#orgStatisticsChartLegend button');
      assert.equal(await page.$eval('#orgStatisticsDetailView', node => node.hidden), false, 'Chart categories open their records');
      await back();
      await page.click('#orgStatisticsViewTrend');
      assert.equal(await page.$$eval('#orgStatisticsTrendBars button', nodes => nodes.length), 12);
      assert.ok(Math.abs(await page.$$eval('#orgStatisticsTrendBars button', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.value), 0)) - chartTotal) < 0.000001, 'Monthly bars agree with selected chart total');
      await page.screenshot({ path: path.join(__dirname, `organization-statistics-trend-${theme}.png`) });
      await page.click('#orgStatisticsTrendBars button[data-period="2026-10"]');
      assert.equal(await page.$eval('#orgStatisticsAnalysisTotal', node => node.textContent), '37.60');
      assert.match(await page.$eval('#orgStatisticsAnalysisSubtitle', node => node.textContent), /Oct 2026/);
      await page.$eval('#orgStatisticsAnalysisSegments [role="button"]', node => node.focus());
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#orgStatisticsDetailTotalRecords', node => node.textContent), '1');
      await back(); await back();
      assert.equal(await page.$eval('#orgStatisticsTrendView', node => node.hidden), false, 'Analysis returns to the trend');
      await page.click('#orgStatisticsTrendTotalCard');
      assert.equal(await page.$eval('#orgStatisticsAnalysisTotal', node => Number(node.dataset.value)), chartTotal);
      await page.keyboard.press('Escape'); await back(); await back();
      assert.equal(await total(), 48, 'View navigation preserves the applied filters');
      for (const summaryType of ['quarter', 'year']) {
        await apply({ summaryType });
        await page.click('#orgStatisticsViewChart');
        await page.select('#orgStatisticsChartMetric', 'period');
        await page.click('#orgStatisticsViewTrend');
        await page.click('#orgStatisticsTrendBars button[data-period="2026-10"]');
        assert.match(await page.$eval('#orgStatisticsAnalysisLegend', node => node.textContent), /Oct 2026/, 'Month drilldown labels the selected month independently of summary type');
        await page.click('#orgStatisticsAnalysisLegend button');
        assert.equal(await page.$eval('#orgStatisticsDetailCards dd', node => node.textContent), 'Oct 2026');
        await back(); await back(); await back(); await back();
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Organization Statistics filters, weighted values, purple cards, chart, trend bars, drilldowns, navigation and themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
