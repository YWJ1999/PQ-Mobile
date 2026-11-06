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
    const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-list.html')).href;
    for (const theme of ['light', 'dark']) {
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.equal(await page.$('.employee-career-coming-card'), null, 'Staff List must be implemented');
      assert.deepEqual(await page.$$eval('#staffListTable th', nodes => nodes.map(node => node.textContent.trim())), ['Emp#', 'Name', 'Age', 'YOS', 'Branch', 'Department', 'Position']);
      assert.equal(await page.$eval('[data-option-back]', node => new URL(node.href).searchParams.get('theme')), theme);
      assert.equal(await page.evaluate(() => typeof navTo), 'function');
      const fullCount = await page.$$eval('#staffListTable tbody tr', nodes => nodes.length);
      assert.ok(fullCount >= 3);
      assert.equal(await page.$eval('#staffListTotalRecords', node => Number(node.textContent)), fullCount);
      const records = await page.$$eval('#staffListTable tbody tr', nodes => nodes.map(node => [...node.cells].map(cell => cell.textContent.trim())));
      for (const record of records) {
        assert.equal(record.length, 7);
        assert.match(record[0], /^#\w+/);
        assert.ok(record[1] && Number(record[2]) > 0 && Number(record[3]) >= 0);
        assert.ok(record.slice(4).every(Boolean));
      }
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), 'The page must not overflow');
        assert.ok(await page.$eval('.staff-list-table-scroll', node => node.scrollWidth > node.clientWidth), 'Seven columns scroll within the table');
        const button = await page.$eval('#staffListViewChart', node => ({
          text: node.textContent.trim(), icon: !!node.querySelector('.fa-solid.fa-chart-simple'),
          nowrap: getComputedStyle(node).whiteSpace, isPill: node.offsetWidth > node.offsetHeight
        }));
        assert.equal(button.text, 'Chart');
        assert.ok(button.icon && button.nowrap === 'nowrap' && button.isPill);
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_list_${theme}.png`) });
        await page.click('#staffListViewChart');
        assert.equal(await page.$eval('#staffListChartView', node => node.hidden), false);
        assert.equal(await page.$eval('#staffListTableView', node => node.hidden), true);
        for (const metric of ['branch', 'department', 'position', 'age', 'yos']) {
          await page.select('#staffListChartMetric', metric);
          assert.equal(await page.$eval('#staffListChartTotal', node => Number(node.textContent)), fullCount);
          const sum = await page.$$eval('#staffListChartSegments circle', nodes => nodes.reduce((total, node) => total + Number(node.dataset.count), 0));
          assert.equal(sum, fullCount, 'Every breakdown must account for the filtered staff exactly once');
          assert.ok(await page.$eval('#staffListChartLegend', node => node.children.length > 0));
        }
        await page.select('#staffListChartMetric', 'branch');
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_chart_${theme}.png`) });
        await page.click('#staffListChartViewAll');
        assert.equal(await page.$eval('#staffListChartViewAll', node => node.getAttribute('aria-expanded')), 'true', `${theme}/${width}: View All expands categories`);
        assert.ok(await page.$$eval('#staffListChartLegend > div', nodes => nodes.length > 5));
        assert.equal(await page.$$eval('#staffListChartLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), fullCount);
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
        await page.click('#staffListBack');
        assert.equal(await page.$eval('#staffListTableView', node => node.hidden), false);
      }
      await page.click('#staffListFilterTrigger');
      await page.waitForFunction(() => document.activeElement?.id === 'staffListFilterKeyword');
      assert.equal(await page.$eval('main', node => node.inert), true);
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_filter_${theme}.png`) });
      await page.select('#staffListFilterBranch', records[0][4]);
      await page.click('#staffListApplyFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
      const expectedBranch = records.filter(record => record[4] === records[0][4]).length;
      assert.equal(await page.$eval('#staffListTotalRecords', node => Number(node.textContent)), expectedBranch);
      await page.click('#staffListViewChart');
      assert.equal(await page.$eval('#staffListChartTotal', node => Number(node.textContent)), expectedBranch);
      await page.click('#staffListBack');
      await page.click('#staffListFilterTrigger');
      await page.select('#staffListFilterBranch', '');
      await page.type('#staffListFilterKeyword', records[0][0]);
      await page.click('#staffListApplyFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
      assert.equal(await page.$eval('#staffListTotalRecords', node => Number(node.textContent)), 1);

      const exportText = await page.evaluate(async () => {
        const original = URL.createObjectURL;
        let blob;
        URL.createObjectURL = value => { blob = value; return original(value); };
        document.getElementById('staffListExportExcel').click();
        URL.createObjectURL = original;
        return blob.text();
      });
      assert.match(exportText, /Emp#,Name,Age,YOS,Branch,Department,Position/);
      assert.equal(exportText.trim().split(/\r?\n/).length, 2);
      assert.ok(exportText.includes(records[0][1]));
      assert.ok(await page.evaluate(() => { let called = false; window.print = () => { called = true; }; document.getElementById('staffListExportPdf').click(); return called; }));
      await page.click('#staffListFilterTrigger');
      await page.$eval('#staffListFilterKeyword', node => { node.value = 'no-such-staff'; });
      await page.click('#staffListApplyFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
      assert.equal(await page.$eval('#staffListEmpty', node => node.hidden), false);
      await page.click('#staffListViewChart');
      assert.equal(await page.$eval('#staffListChartTotal', node => node.textContent), '0');
      assert.equal(await page.$$eval('#staffListChartSegments circle', nodes => nodes.length), 0);
      await page.click('#staffListBack');
      await page.click('#staffListFilterTrigger');
      await page.click('#staffListResetFilter');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
      assert.equal(await page.$eval('#staffListTotalRecords', node => Number(node.textContent)), fullCount);
      await page.click('#staffListFilterTrigger');
      await page.$eval('#staffListFilterKeyword', node => { node.value = 'discard this edit'; });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.getElementById('staffListFilterOverlay').hidden);
      await page.click('#staffListFilterTrigger');
      assert.equal(await page.$eval('#staffListFilterKeyword', node => node.value), '');
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Staff List has seven columns, Leave Highlight layout, working filtered charts and View All, exports, empty states, responsive table scrolling and both themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
