const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;
const number = text => Number(text.replace(/[^\d.-]/g, ''));
async function fill(page, selector, value) {
  await page.$eval(selector, (input, next) => { input.value = next; input.dispatchEvent(new Event('change', { bubbles: true })); }, value);
}
async function snap(page, name) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.constructor.name === 'CSSTransition').map(animation => animation.finished.catch(() => {}))); });
  await page.screenshot({ path: path.join(__dirname, name + '.png') });
}
async function total(page, selector) { return number(await page.$eval(selector, node => node.textContent)); }
async function downloadReport(page, theme) {
  const downloadPath = path.join(__dirname, 'timesheet-highlight-downloads', theme);
  await fs.mkdir(downloadPath, { recursive: true });
  const file = path.join(downloadPath, 'timesheet-highlight.csv');
  await fs.rm(file, { force: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });
  await page.click('#timesheetExportExcel');
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try { return await fs.readFile(file, 'utf8'); }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    throw new Error('The timesheet CSV did not download');
  } finally { await cdp.detach(); }
}
async function checkChart(page, prefix, expected) {
  assert.equal(await total(page, `#${prefix}Total`), expected);
  const rows = await page.$$eval(`#${prefix}Legend [data-group-hours]`, nodes => nodes.map(node => Number(node.dataset.groupHours)));
  assert.ok(Math.abs(rows.reduce((sum, value) => sum + value, 0) - expected) < 0.001, 'The breakdown must equal the filtered hours');
  assert.equal(await page.$eval(`#${prefix}Donut`, node => /NaN|Infinity/.test(node.outerHTML)), false);
}
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const theme of ['dark', 'light']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url('modules/project-task/index.html') + '?scope=team&theme=' + theme, { waitUntil: 'domcontentloaded' });
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#projectPanel-team a[href*="timesheet-highlight.html"]')]);
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.ok(await page.$('#timesheetHighlightTable'), 'The highlight must replace Coming soon with the employee table');
      assert.deepEqual(await page.$$eval('#timesheetHighlightTable th', nodes => nodes.map(node => node.textContent.trim())), ['Emp#', 'Name', 'Hours']);
      const base = await page.evaluate(() => ({ hours: window.TIMESHEET_HIGHLIGHT_DATA.reduce((sum, row) => sum + row.hours, 0), count: new Set(window.TIMESHEET_HIGHLIGHT_DATA.map(row => row.empNo)).size }));
      assert.equal(await total(page, '#timesheetTotalHours'), base.hours);
      assert.equal(await total(page, '#timesheetTotalRecords'), base.count);
      const tableHours = await page.$$eval('#timesheetHighlightTable tbody [data-employee-hours]', nodes => nodes.map(node => Number(node.dataset.employeeHours)));
      assert.equal(tableHours.reduce((sum, value) => sum + value, 0), base.hours);
      assert.equal(await page.$$eval('#timesheetHighlightTable tbody button', nodes => nodes.length), 0);
      assert.equal(await page.$$eval('#timesheetHighlightTable tbody [data-employee-hours]', nodes => nodes.every(node => node.tagName === 'SPAN')), true);
      assert.equal(await page.$('#timesheetEmployeeDetails'), null);
      assert.equal(await page.$eval('#timesheetViewChart', node => Boolean(node.querySelector('.fa-chart-simple')) && node.textContent.trim() === 'Chart'), true);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        await snap(page, `timesheet_highlight_table_${theme}_${width}`);
      }
      await page.click('#timesheetHighlightTable [data-employee-hours]');
      assert.equal(await page.$eval('[data-timesheet-view="table"]', node => node.hidden), false);

      await page.click('#timesheetFilterTrigger');
      assert.deepEqual(await page.$$eval('#timesheetFilterForm label', nodes => nodes.map(node => node.textContent.trim())), ['Search Keyword', 'Start Date', 'End Date', 'Project', 'Task']);
      assert.equal(await page.$$eval('#timesheetFilterForm button', nodes => nodes.filter(node => node.textContent.trim() === 'Reset').length), 1, 'Use one Reset action in the standard filter header');
      assert.equal(await page.$eval('#timesheetResetFilter', node => Boolean(node.closest('.standard-filter-header'))), true);
      await page.focus('#timesheetApplyFilter');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'timesheetResetFilter');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'timesheetApplyFilter');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('#timesheetFilterForm', node => node.scrollWidth > node.clientWidth + 1), false);
        await snap(page, `timesheet_highlight_filter_${theme}_${width}`);
      }
      await page.setViewport({ width: 360, height: 600 });
      assert.equal(await page.$eval('#timesheetApplyFilter', node => node.getBoundingClientRect().bottom <= document.querySelector('.phone-container').getBoundingClientRect().bottom), true, 'Apply stays reachable on short screens');
      await page.focus('#timesheetFilterTask');
      assert.equal(await page.$eval('#timesheetFilterTask', node => node.getBoundingClientRect().bottom <= document.querySelector('.timesheet-filter-fields').getBoundingClientRect().bottom + 1), true, 'The Task selector scrolls into view on short screens');
      await snap(page, `timesheet_highlight_filter_short_${theme}`);
      await page.setViewport({ width: 450, height: 950 });
      await snap(page, `timesheet_highlight_filter_${theme}`);
      await fill(page, '#timesheetFilterStart', '2026-10-02');
      await fill(page, '#timesheetFilterEnd', '2026-10-01');
      await page.click('#timesheetApplyFilter');
      assert.equal(await page.$eval('#timesheetDataFilter', node => node.hidden), false);
      assert.match(await page.$eval('#timesheetFilterError', node => node.textContent), /End Date/);
      await fill(page, '#timesheetFilterStart', '2026-10-01');
      await fill(page, '#timesheetFilterEnd', '2026-10-02');
      const project = await page.$eval('#timesheetFilterProject option:nth-child(2)', node => node.value);
      await page.select('#timesheetFilterProject', project);
      const task = await page.$eval('#timesheetFilterTask option:nth-child(2)', node => node.value);
      await page.select('#timesheetFilterTask', task);
      const matching = await page.evaluate(({ project, task }) => window.TIMESHEET_HIGHLIGHT_DATA.filter(row => row.date >= '2026-10-01' && row.date <= '2026-10-02' && row.project === project && row.task === task), { project, task });
      assert.ok(matching.length);
      await fill(page, '#timesheetFilterKeyword', '#' + matching[0].empNo);
      await page.click('#timesheetApplyFilter');
      const filteredHours = matching.filter(row => row.empNo === matching[0].empNo).reduce((sum, row) => sum + row.hours, 0);
      assert.equal(await total(page, '#timesheetTotalHours'), filteredHours);
      assert.equal(await total(page, '#timesheetTotalRecords'), 1);
      const filteredCsv = await downloadReport(page, theme);
      assert.equal(filteredCsv.split(/\r?\n/).length, 3, 'A one-employee filter exports one employee and its total');
      assert.ok(filteredCsv.includes('#' + matching[0].empNo) && filteredCsv.includes('TOTAL,,' + filteredHours.toFixed(2)));
      await page.click('#timesheetViewChart');
      await checkChart(page, 'timesheetChart', filteredHours);
      assert.equal(await page.$('#timesheetViewTrend'), null);
      assert.equal(await page.$$eval('[data-timesheet-view="trend"], [data-timesheet-view="analysis"]', nodes => nodes.length), 0);
      await page.click('#timesheetBack');
      assert.equal(await page.$eval('[data-timesheet-view="table"]', node => node.hidden), false);
      await page.click('#timesheetFilterTrigger');
      await fill(page, '#timesheetFilterKeyword', 'unsaved filter changes');
      await page.keyboard.press('Escape');
      assert.equal(await total(page, '#timesheetTotalHours'), filteredHours);
      await page.click('#timesheetFilterTrigger');
      assert.equal(await page.$eval('#timesheetFilterKeyword', node => node.value), '#' + matching[0].empNo);
      await fill(page, '#timesheetFilterKeyword', 'no-such-employee');
      await page.click('#timesheetApplyFilter');
      assert.equal(await total(page, '#timesheetTotalHours'), 0);
      assert.equal(await page.$eval('#timesheetEmpty', node => node.hidden), false);
      await page.click('#timesheetViewChart');
      await checkChart(page, 'timesheetChart', 0);
      await page.click('#timesheetBack');
      await page.click('#timesheetFilterTrigger');
      await page.click('#timesheetResetFilter');
      assert.equal(await total(page, '#timesheetTotalHours'), base.hours);

      await page.click('#timesheetViewChart');
      const metricOptions = await page.$$eval('#timesheetChartMetric option', nodes => nodes.map(node => node.textContent));
      assert.deepEqual(metricOptions, ['Project', 'Task', 'Branch', 'Department', 'Section', 'Grade', 'Supervisor']);
      assert.equal(await page.$$eval('#timesheetChartLegend [data-group-hours]', nodes => nodes.length), 6);
      await page.click('#timesheetChartViewAll');
      assert.ok(await page.$$eval('#timesheetChartLegend [data-group-hours]', nodes => nodes.length) > 6);
      for (const metric of ['project', 'task', 'branch', 'department', 'section', 'grade', 'supervisor']) {
        await page.select('#timesheetChartMetric', metric);
        await checkChart(page, 'timesheetChart', base.hours);
      }
      await page.select('#timesheetChartMetric', 'project');
      await page.$eval('.timesheet-highlight-content', node => { node.scrollTop = 0; });
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.timesheet-highlight-content', node => node.scrollWidth > node.clientWidth + 1), false);
        await snap(page, `timesheet_highlight_chart_${theme}_${width}`);
      }
      await page.click('#timesheetBack');

      const csv = await downloadReport(page, theme);
      assert.ok(csv && csv.includes('Employee #,Name,Hours') && csv.includes('TOTAL') && csv.includes(base.hours.toFixed(2)));
      await page.evaluate(() => { window.print = () => { window.timesheetPrintCalled = true; }; });
      await page.click('#timesheetExportPdf');
      assert.equal(await page.evaluate(() => window.timesheetPrintCalled), true);
      await page.emulateMediaType('print');
      assert.equal(await page.$eval('phone-bottom-nav', node => getComputedStyle(node).display), 'none');
      assert.equal(await page.$eval('#timesheetHighlightTable tbody tr', node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
      assert.equal(await page.$eval('#timesheetPageTitle', node => getComputedStyle(node).color), 'rgb(0, 0, 0)');
      assert.equal(await page.$eval('.timesheet-filter-date', node => getComputedStyle(node).color), 'rgb(85, 85, 85)');
      assert.equal(await page.$eval('#timesheetHighlightTable td:first-child', node => getComputedStyle(node).color), 'rgb(85, 85, 85)');
      await snap(page, `timesheet_highlight_print_${theme}`);
      await page.pdf({ path: path.join(__dirname, `timesheet_highlight_report_${theme}.pdf`), format: 'A4', printBackground: true });
      const pdf = await fs.readFile(path.join(__dirname, `timesheet_highlight_report_${theme}.pdf`));
      assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
      assert.ok(pdf.length > 1000);
      await page.emulateMediaType('screen');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#timesheetBack')]);
      assert.equal(await page.$eval('#projectTab-team', node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(errors, []);
      console.log(`${theme}: static hours, all filters, chart breakdowns, exports and navigation passed.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
