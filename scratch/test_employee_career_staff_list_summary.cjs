const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-list.html')).href;
const labels = ['Active Staff', 'Probationary', 'Unapproved', 'Unverified', 'Permit Expiring', 'Contract Expiring', 'Exit Notice', 'Resigned', 'Blacklisted'];
const expected = [['#A', '#B'], ['#A'], ['#A'], ['#A'], ['#A'], ['#B'], ['#B'], ['#C'], ['#A']];
const openSummary = async page => {
  if (await page.$eval('#staffListTableView', n => !n.hidden)) await page.click('#staffListViewChart');
  if (await page.$eval('#staffListTrendView', n => !n.hidden)) await page.click('#staffListBack');
  await page.click('#staffListViewSummary');
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      const base = { birthDate: '1990-01-01', hireDate: '2020-01-01', department: 'Operations', position: 'Executive', verified: true, approved: true };
      window.EMPLOYEE_CAREER_STAFF_LIST_RECORDS = [
        { ...base, empNo: 'A', name: 'Alice', branch: 'North', probationary: true, keyLevel: 3, blacklisted: true, permitExpiring: true, verified: false, approved: false },
        { ...base, empNo: 'B', name: 'Ben', branch: 'South', keyLevel: 2, contractExpiring: true, exitNotice: true },
        { ...base, empNo: 'C', name: 'Chen', branch: 'North', keyLevel: 1, exitDate: '2026-09-30', employmentStatus: 'Resigned' }
      ];
    });
    const apply = async (values, trigger = '#staffListFilterTrigger') => {
      await page.click(trigger);
      await page.evaluate(values => { for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value; }, values);
      await page.click('#staffListApplyFilter');
    };
    for (const theme of ['dark', 'light']) {
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.ok(await page.$('#staffListViewSummary'), 'Staff List needs a View Summary action');
      assert.ok(await page.$('#staffListChartView .staff-list-chart-action-stack #staffListViewSummary'), 'View Summary belongs below View Trend in the chart header');
      assert.equal(await page.$('#staffListTrendView #staffListViewSummary'), null);
      assert.equal(await page.$('#staffListTableView #staffListViewSummary'), null);
      await page.click('#staffListViewChart');
      const actionLayout = await page.evaluate(() => {
        const trend = document.getElementById('staffListViewTrend').getBoundingClientRect();
        const summary = document.getElementById('staffListViewSummary').getBoundingClientRect();
        return { trendBottom: trend.bottom, summaryTop: summary.top, aligned: Math.abs(trend.left - summary.left) < 1 && Math.abs(trend.right - summary.right) < 1 };
      });
      assert.ok(actionLayout.summaryTop > actionLayout.trendBottom, 'View Summary must render underneath View Trend');
      assert.equal(actionLayout.aligned, true, 'View Trend and View Summary must share the same alignment');
      await page.click('#staffListBack');
      await apply({ staffListFilterAsAt: '2026-10-06' });
      for (const width of [320, 360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        await openSummary(page);
        assert.equal(await page.$eval('#staffListSummaryView', n => n.hidden), false);
        assert.equal(await page.$eval('#staffListTitle', n => n.textContent), 'Staff Overview');
        assert.equal(await page.$eval('#staffListSummaryAsAt', n => !n.hidden && n.textContent), 'As at 06 Oct 2026');
        assert.deepEqual(await page.$$eval('.staff-overview-group h2', nodes => nodes.map(n => n.textContent)), ['Workforce', 'Review & expiry', 'Other statuses']);
        assert.deepEqual(await page.$$eval('.staff-overview-group', nodes => nodes.map(n => n.querySelectorAll('button').length)), [2, 4, 3]);
        assert.equal(await page.$eval('.staff-overview-status', n => n.textContent), 'Needs review');
        assert.deepEqual(await page.$$eval('[data-staff-category] .staff-overview-label', nodes => nodes.map(n => n.textContent)), labels);
        assert.deepEqual(await page.$$eval('.staff-overview-count', nodes => nodes.map(n => Number(n.textContent))), [2, ...Array(8).fill(1)]);
        assert.deepEqual(await page.$$eval('.staff-overview-percent', nodes => nodes.map(n => n.textContent)), ['67%', ...Array(8).fill('33%')]);
        assert.ok(await page.$$eval('.staff-overview-row', nodes => nodes.every(n => n.getBoundingClientRect().height >= 44)));
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1));
        for (let i = 0; i < labels.length; i++) {
          const card = (await page.$$('[data-staff-category]'))[i];
          await card.click();
          assert.equal(await page.$eval('#staffListTableView', n => n.hidden), false);
          assert.equal(await page.$eval('#staffListTitle', n => n.textContent), 'Staff List');
          assert.equal(await page.$eval('#staffListSummaryAsAt', n => n.hidden), true);
          assert.deepEqual(await page.$$eval('#staffListTable tbody tr', nodes => nodes.map(n => n.cells[0].textContent)), expected[i]);
          assert.match(await page.$eval('#staffListFilterSummary', n => n.textContent), new RegExp(labels[i]));
          await page.click('#staffListViewChart');
          assert.equal(await page.$eval('#staffListChartTotal', n => Number(n.textContent)), expected[i].length);
          await page.click('#staffListBack');
          await openSummary(page);
        }
        assert.equal(await page.$('#staffListSummaryShowAll'), null, 'Summary does not need a Show All button');
        await page.click('[data-staff-category="active"]');
        assert.equal(await page.$$eval('#staffListTable tbody tr', nodes => nodes.length), 2);
        await openSummary(page);
        await page.click('#staffListBack');
        assert.equal(await page.$eval('#staffListChartView', n => n.hidden), false);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'staffListViewSummary');
        await page.click('#staffListBack');
      }
      for (const [level, employee] of [[1, '#C'], [2, '#B'], [3, '#A']]) {
        await apply({staffListFilterCategory: 'key-level-' + level});
        assert.deepEqual(await page.$$eval('#staffListTable tbody tr', nodes => nodes.map(n => n.cells[0].textContent)), [employee]);
      }
      await openSummary(page);
      await page.click('[data-staff-category="active"]');
      await apply({ staffListFilterBranch: 'North', staffListFilterCategory: '' });
      await openSummary(page);
      assert.equal(await page.$eval('#staffListSummaryView', n => n.hidden), false, 'Summary keeps filters chosen from Staff List');
      assert.deepEqual(await page.$$eval('[data-staff-category] .staff-overview-count', nodes => nodes.map(n => Number(n.textContent))), [1, 1, 1, 1, 1, 0, 0, 1, 1]);
      await page.click('[data-staff-category="contract-expiring"]');
      assert.equal(await page.$$eval('#staffListTable tbody tr', nodes => nodes.length), 0);
      assert.equal(await page.$eval('#staffListEmpty', n => n.hidden), false);
      await openSummary(page); await page.click('[data-staff-category="resigned"]');
      assert.deepEqual(await page.$$eval('#staffListTable tbody tr', nodes => nodes.map(n => n.cells[0].textContent)), ['#C'], 'Summary cards must preserve the organization filter');
      await apply({ staffListFilterKeyword: 'no staff' });
      await openSummary(page);
      assert.equal(await page.$('.staff-overview-status'), null, 'Empty results must not report All clear');
      assert.ok(await page.$$eval('[data-staff-category]', nodes => nodes.every(n => n.querySelector('.staff-overview-percent').textContent === '0%')));
    }
    const preview = await browser.newPage();
    preview.on('pageerror', error => errors.push(error.message));
    for (const theme of ['dark', 'light']) {
      await preview.setViewport({ width: 390, height: 950 });
      await preview.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      await preview.click('#staffListViewChart');
      await preview.screenshot({ path: path.join(__dirname, `employee_career_staff_list_summary_entry_${theme}.png`) });
      await openSummary(preview);
      assert.equal(await preview.$eval('.staff-overview-status', n => n.textContent), 'All clear');
      await preview.screenshot({ path: path.join(__dirname, `employee_career_staff_list_summary_${theme}.png`) });
      await preview.$eval('main', n => { n.scrollTop = n.scrollHeight; });
      await preview.screenshot({ path: path.join(__dirname, `employee_career_staff_list_summary_bottom_${theme}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Nine grouped staff statuses, counts, percentages, drill-downs, review badges, key-level filters and navigation passed in both themes at four widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
