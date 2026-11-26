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
    const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-attrition.html')).href;
    const rows = () => page.$$eval('#staffListTable tbody tr', nodes => nodes.map(node => [...node.cells].map(cell => cell.textContent.trim())));
    const filter = async values => {
      await page.click('#staffListFilterTrigger');
      await page.evaluate(values => Object.entries(values).forEach(([key, value]) => { document.getElementById('staffListFilter' + key).value = value; }), values);
      await page.click('#staffListApplyFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
    };
    const reset = async () => { await page.click('#staffListFilterTrigger'); await page.click('#staffListResetFilter'); await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden); };
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.equal(await page.$('.employee-career-coming-card'), null, 'Staff Attrition must be implemented');
      assert.deepEqual(await page.$$eval('#staffListTable th', nodes => nodes.map(node => node.textContent.trim())), ['Emp No.', 'Name', 'Reason', 'Branch', 'Department', 'Position']);
      assert.deepEqual(await page.$$eval('#staffListFilterForm label', nodes => nodes.map(node => node.textContent.trim())), ['Search Keyword', 'Start Date', 'End Date', 'Branch', 'Department', 'Section', 'Job', 'Skill Group']);
      const all = await rows();
      assert.ok(all.length > 12 && all.every(row => row.length === 6 && /^#/.test(row[0]) && row.slice(1).every(Boolean)));
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_attrition_${theme}.png`) });
        await page.click('#staffListViewChart');
        assert.equal(await page.$eval('#staffListChartTotal', node => Number(node.textContent)), all.length);
        await page.select('#staffListChartMetric', 'reason');
        assert.match(await page.$eval('#staffListChartTitle', node => node.textContent), /reason/);
        assert.equal(await page.$$eval('#staffListChartSegments circle', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), all.length);
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_attrition_chart_${theme}.png`) });
        await page.click('#staffAttritionViewTrend');
        assert.equal(await page.$eval('#staffAttritionTrendView', node => node.hidden), false);
        const bars = await page.$$eval('[data-attrition-month]', nodes => nodes.map(node => ({ month: node.dataset.attritionMonth, count: Number(node.dataset.count) })));
        assert.equal(bars.length, 12);
        assert.equal(bars.reduce((sum, bar) => sum + bar.count, 0), all.length, 'Monthly totals must match the filtered table');
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_attrition_trend_${theme}.png`) });
        for (const selected of [bars.find(bar => bar.count > 0), bars.at(-1)]) {
          if (selected === bars.at(-1)) {
            await page.focus(`[data-attrition-month="${selected.month}"]`);
            await page.keyboard.press('Enter');
          } else await page.click(`[data-attrition-month="${selected.month}"]`);
          assert.equal(await page.$eval('#staffAttritionAnalysisView', node => node.hidden), false);
          assert.equal(await page.$eval('#staffAttritionAnalysisChartTotal', node => Number(node.textContent)), selected.count);
          assert.equal(await page.$eval('#staffAttritionAnalysisPeriod', node => node.textContent), new Date(selected.month + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }));
          assert.equal(await page.$eval('#staffAttritionAnalysisView', node => node.children.length), 3);
          assert.equal(await page.$eval('#staffAttritionAnalysisViewTrend', () => true).catch(() => false), false);
          for (const metric of ['branch', 'department', 'section', 'job', 'skillGroup', 'reason', 'yos', 'age']) {
            await page.select('#staffAttritionAnalysisChartMetric', metric);
            assert.equal(await page.$$eval('#staffAttritionAnalysisChartSegments circle', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), selected.count);
          }
          if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_attrition_analysis_${theme}.png`) });
          await page.click('#staffListBack');
          assert.equal(await page.$eval('#staffAttritionTrendView', node => node.hidden), false);
        }
        await page.click('#staffAttritionTrendTotal');
        assert.equal(await page.$eval('#staffAttritionAnalysisChartTotal', node => Number(node.textContent)), all.length);
        await page.click('#staffListBack');
        await page.click('#staffListBack');
        assert.equal(await page.$eval('#staffListChartView', node => node.hidden), false);
        await page.click('#staffListBack');
        assert.equal(await page.$eval('h1', node => node.textContent), 'Staff Attrition');
      }
      await page.click('#staffListFilterTrigger');
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_attrition_filter_${theme}.png`) });
      await page.keyboard.press('Escape');
      const event = await page.evaluate(() => window.EMPLOYEE_CAREER_ATTRITION_DATA.find(row => document.querySelector('#staffListTable tbody tr').textContent.includes(row.empNo)));
      await filter({ Start: event.exitDate, End: event.exitDate });
      const daily = await rows();
      assert.ok(daily.length > 0 && daily.some(row => row[0] === event.empNo), 'Date boundaries include exits on that day');
      await page.click('#staffListViewChart'); await page.click('#staffAttritionViewTrend');
      assert.equal(await page.$$eval('[data-attrition-month]', nodes => nodes.length), 1);
      await page.click('[data-attrition-month]');
      assert.equal(await page.$eval('#staffAttritionAnalysisChartTotal', node => Number(node.textContent)), daily.length);
      await page.click('#staffListBack'); await page.click('#staffListBack'); await page.click('#staffListBack');
      await reset();
      for (const [dimension, column] of [['Branch', 3], ['Department', 4], ['Job', 5]]) {
        await filter({ [dimension]: all[0][column] });
        assert.equal((await rows()).length, all.filter(row => row[column] === all[0][column]).length);
        await reset();
      }
      for (const dimension of ['Section', 'SkillGroup']) {
        await page.click('#staffListFilterTrigger');
        const value = await page.$eval('#staffListFilter' + dimension, node => node.options[1].value);
        await page.select('#staffListFilter' + dimension, value); await page.click('#staffListApplyFilter');
        assert.ok((await rows()).length > 0 && (await rows()).length < all.length);
        await reset();
      }
      await filter({ Keyword: all[0][0], Branch: all[0][3], Department: all[0][4], Job: all[0][5] });
      assert.equal((await rows()).length, 1);
      const csv = await page.evaluate(async () => {
        const original = URL.createObjectURL; let blob;
        URL.createObjectURL = value => { blob = value; return original(value); };
        document.getElementById('staffListExportExcel').click(); URL.createObjectURL = original; return blob.text();
      });
      assert.match(csv, /Emp No.,Name,Reason,Branch,Department,Position/);
      assert.equal(csv.trim().split(/\r?\n/).length, 2);
      await page.click('#staffListFilterTrigger');
      await page.$eval('#staffListFilterStart', node => { node.value = '2026-10-05'; });
      await page.$eval('#staffListFilterEnd', node => { node.value = '2026-01-01'; });
      await page.click('#staffListApplyFilter');
      assert.equal(await page.$eval('#staffListFilterOverlay', node => node.hidden), false);
      assert.equal(await page.$eval('#staffListFilterError', node => node.hidden), false);
      await page.keyboard.press('Escape');
      await filter({ Keyword: 'no-matching-employee' });
      assert.equal((await rows()).length, 0);
      await page.click('#staffListViewChart'); await page.click('#staffAttritionViewTrend');
      assert.equal(await page.$eval('#staffAttritionTrendTotalCount', node => node.textContent), '0');
      await page.click('[data-attrition-month]');
      assert.equal(await page.$eval('#staffAttritionAnalysisChartTotal', node => node.textContent), '0');
      await page.click('#staffListBack'); await page.click('#staffListBack'); await page.click('#staffListBack');
      await reset();
      assert.equal((await rows()).length, all.length);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Attrition eight filters, six columns, inclusive dates, chart/trend/month analysis consistency, navigation, empty states, both themes and three mobile widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
