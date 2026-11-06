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
    const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-retention.html')).href;
    const rows = () => page.$$eval('#staffListTable tbody tr', nodes => nodes.map(node => [...node.cells].map(cell => cell.textContent.trim())));
    const apply = async values => {
      await page.click('#staffListFilterTrigger');
      await page.evaluate(values => {
        for (const [key, value] of Object.entries(values)) document.getElementById('staffListFilter' + key).value = value;
      }, values);
      await page.click('#staffListApplyFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
    };
    const reset = async () => {
      await page.click('#staffListFilterTrigger');
      await page.click('#staffListResetFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
    };
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.equal(await page.$('.employee-career-coming-card'), null, 'Staff Retention must be implemented');
      assert.equal(await page.$eval('h1', node => node.textContent), 'Staff Retention');
      assert.deepEqual(await page.$$eval('#staffListTable th', nodes => nodes.map(node => node.textContent.trim())), ['Emp#', 'Name', 'YOS', 'Branch', 'Department', 'Position']);
      assert.deepEqual(await page.$$eval('#staffListFilterForm label', nodes => nodes.map(node => node.textContent.trim())), ['Search Keyword', 'Service Years >=', 'Branch', 'Department', 'Section', 'Job', 'Skill Group']);
      const all = await rows();
      assert.ok(all.length >= 3);
      assert.ok(all.every(row => row.length === 6 && /^#\w+/.test(row[0]) && Number(row[2]) >= 0));
      assert.equal(await page.$eval('#staffListTotalRecords', node => Number(node.textContent)), all.length);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
        assert.ok(await page.$eval('.staff-list-table-scroll', node => node.scrollWidth > node.clientWidth));
        const chartButton = await page.$eval('#staffListViewChart', node => ({ icon: !!node.querySelector('.fa-solid.fa-chart-simple'), text: node.textContent.trim(), nowrap: getComputedStyle(node).whiteSpace }));
        assert.deepEqual(chartButton, { icon: true, text: 'Chart', nowrap: 'nowrap' });
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_retention_${theme}.png`) });
        await page.click('#staffListViewChart');
        assert.equal(await page.$eval('#staffListChartView', node => node.hidden), false);
        assert.doesNotMatch(await page.$eval('#staffListChartView', node => node.textContent), /View Trend/i);
        for (const metric of ['branch', 'department', 'section', 'job', 'skillGroup', 'yos']) {
          await page.select('#staffListChartMetric', metric);
          assert.equal(await page.$eval('#staffListChartTotal', node => Number(node.textContent)), all.length);
          assert.equal(await page.$$eval('#staffListChartSegments circle', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), all.length);
        }
        await page.select('#staffListChartMetric', 'branch');
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_retention_chart_${theme}.png`) });
        await page.click('#staffListChartViewAll');
        assert.equal(await page.$eval('#staffListChartViewAll', node => node.getAttribute('aria-expanded')), 'true');
        assert.ok(await page.$$eval('#staffListChartLegend > div', nodes => nodes.length > 5));
        await page.click('#staffListBack');
        assert.equal(await page.$eval('h1', node => node.textContent), 'Staff Retention');
      }
      await page.click('#staffListFilterTrigger');
      await page.waitForFunction(() => document.activeElement?.id === 'staffListFilterKeyword');
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_retention_filter_${theme}.png`) });
      await page.keyboard.press('Escape');
      await apply({ ServiceYears: '5' });
      const retained = await rows();
      assert.ok(retained.length > 0 && retained.length < all.length);
      assert.ok(retained.every(row => Number(row[2]) >= 5));
      assert.match(await page.$eval('#staffListFilterSummary', node => node.textContent), /Service Years >= 5/);
      await page.click('#staffListViewChart');
      assert.equal(await page.$eval('#staffListChartTotal', node => Number(node.textContent)), retained.length);
      await page.click('#staffListBack');
      await reset();
      for (const [dimension, column] of [['Branch', 3], ['Department', 4], ['Job', 5]]) {
        await apply({ [dimension]: all[0][column] });
        const result = await rows();
        assert.equal(result.length, all.filter(row => row[column] === all[0][column]).length);
        assert.ok(result.every(row => row[column] === all[0][column]));
        await reset();
      }
      for (const dimension of ['Section', 'SkillGroup']) {
        await page.click('#staffListFilterTrigger');
        const value = await page.$eval('#staffListFilter' + dimension, node => node.options[1].value);
        await page.select('#staffListFilter' + dimension, value);
        await page.click('#staffListApplyFilter');
        await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
        assert.ok((await rows()).length > 0 && (await rows()).length < all.length, dimension + ' filters staff');
        assert.ok((await page.$eval('#staffListFilterSummary', node => node.textContent)).includes(value));
        await reset();
      }
      await apply({ Keyword: all[0][0], Branch: all[0][3], Department: all[0][4], Job: all[0][5] });
      assert.equal((await rows()).length, 1, 'Search and organization filters combine');
      const csv = await page.evaluate(async () => {
        const original = URL.createObjectURL; let blob;
        URL.createObjectURL = value => { blob = value; return original(value); };
        document.getElementById('staffListExportExcel').click(); URL.createObjectURL = original; return blob.text();
      });
      assert.match(csv, /Emp#,Name,YOS,Branch,Department,Position/);
      assert.equal(csv.trim().split(/\r?\n/).length, 2);
      await apply({ ServiceYears: '999' });
      assert.equal((await rows()).length, 0);
      assert.equal(await page.$eval('#staffListEmpty', node => node.hidden), false);
      await page.click('#staffListViewChart');
      assert.equal(await page.$eval('#staffListChartTotal', node => node.textContent), '0');
      assert.equal(await page.$$eval('#staffListChartSegments circle', nodes => nodes.length), 0);
      await page.click('#staffListBack');
      await reset();
      assert.equal((await rows()).length, all.length);
      assert.equal(await page.$eval('[data-option-back]', node => new URL(node.href).searchParams.get('theme')), theme);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Retention six columns and seven filters, YOS minimum, combined filters, charts without View Trend, exports, empty states, both themes and three widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
