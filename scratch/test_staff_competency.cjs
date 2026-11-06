const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = (file, query = '') => pathToFileURL(path.join(root, 'modules/training-competency', file)).href + query;
async function apply(page, values) {
  await page.click('#staffCompetencyFilterTrigger');
  await page.evaluate(values => {
    const form = document.getElementById('staffCompetencyFilterForm');
    form.reset();
    for (const [key, value] of Object.entries(values)) form.elements[key].value = value;
  }, values);
  await page.click('#staffCompetencyApplyFilter');
}
async function totals(page) {
  return page.evaluate(() => [document.getElementById('staffCompetencyTotalRecords').textContent, document.getElementById('staffCompetencyAverageMatch').textContent]);
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 844 });
      await page.goto(url('index.html', `?scope=team&theme=${theme}`), { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('[data-option-id="staff-competency"]', node => node.tagName), 'A', 'Staff Competency opens its report');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-option-id="staff-competency"]')]);
      assert.equal(await page.$eval('h1', node => node.textContent), 'Staff Competency');
      assert.deepEqual(await totals(page), ['6', '67.50%']);
      assert.deepEqual(await page.$$eval('#staffCompetencyTable th', nodes => nodes.map(node => node.textContent)), ['Emp #', 'Name', 'Match %', 'Branch', 'Department', 'Position']);
      assert.ok(await page.$('.record-summary-card record-chart-count .record-summary-value'));
      assert.equal(await page.$eval('#staffCompetencyViewChart', node => node.textContent.trim()), 'Chart');
      assert.ok(await page.$('#staffCompetencyViewChart .fa-chart-simple'));
      assert.equal(await page.$eval('#staffCompetencyViewChart', node => getComputedStyle(node).whiteSpace), 'nowrap');
      assert.ok(await page.$('#staffCompetencyExportPdf .fa-file-pdf'));
      assert.ok(await page.$('#staffCompetencyExportExcel .fa-file-excel'));
      assert.deepEqual(await page.$$eval('#staffCompetencyTable tbody tr:first-child td', nodes => nodes.map(node => node.textContent)), ['#EBB12', 'Farhan Binti Rahmat', '90.00%', 'Kuala Lumpur', 'Human Resource', 'Group HR Manager']);
      assert.equal(await page.$eval('.staff-competency-match', node => node.classList.contains('performance-highlight-score')), false, 'Match is ordinary text rather than a highlighted control');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#staffCompetencyTable tbody tr:first-child')]);
      assert.match(page.url(), /staff-competency-employee\.html/);
      assert.deepEqual(await page.$$eval('#csEmployeeSummary .cs-summary-field > span:first-child', nodes => nodes.map(node => node.textContent)), ['Name', 'Branch', 'Department', 'Position']);
      assert.deepEqual(await page.$$eval('#csEmployeeSummary .cs-summary-field strong', nodes => nodes.map(node => node.textContent)), ['Farhan Binti Rahmat', 'Kuala Lumpur', 'Human Resource', 'Group HR Manager']);
      assert.equal(await page.$eval('.cs-profile-employee-id', node => node.textContent), '#EBB12');
      assert.equal(await page.$eval('.cs-profile-employee-id', node => node.previousElementSibling.textContent), 'Farhan Binti Rahmat');
      assert.equal(await page.$eval('#staffCompetencyAssess', node => node.textContent), 'Assess');
      assert.deepEqual(await page.$$eval('#csTable th', nodes => nodes.map(node => node.textContent)), ['Competency', 'Level', 'Chge', 'Gap']);
      assert.equal(await page.$$('#csTable tbody tr[data-competency]').then(nodes => nodes.length), 3);
      await page.screenshot({ path: path.join(__dirname, `staff-competency-employee-${theme}-${width}.png`) });
      await page.click('#csTable tbody tr:first-child');
      assert.deepEqual(await page.$$eval('#csEmployeeDetails th', nodes => nodes.map(node => node.textContent)), ['Emp #', 'Name', 'Company', 'Branch', 'Department', 'Job Title']);
      assert.equal(await page.$$('.cs-assessment-record').then(nodes => nodes.length), 2);
      assert.deepEqual(await page.$$eval('.cs-assessment-record:first-child th', nodes => nodes.map(node => node.textContent)), ['Assess Date', 'Level', 'Remarks', 'Assessor']);
      await page.screenshot({ path: path.join(__dirname, `staff-competency-assessment-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#csModal', node => node.hidden), true);
      assert.equal(await page.$eval('main', node => node.inert), false);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#csBack')]);
      await page.focus('#staffCompetencyTable tbody tr:nth-child(2)');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.press('Enter')]);
      assert.equal(await page.$eval('#csEmployeeSummary .cs-profile-employee-id', node => node.textContent), '#EBB03', 'Keyboard activation opens the selected employee');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#csBack')]);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1));
      await page.screenshot({ path: path.join(__dirname, `staff-competency-table-${theme}-${width}.png`) });
      await page.click('#staffCompetencyFilterTrigger');
      assert.deepEqual(await page.$$eval('#staffCompetencyFilterForm label', nodes => nodes.map(node => node.textContent)), ['Search Keyword', 'Company', 'Branch', 'Department', 'Job', 'Match %']);
      await page.screenshot({ path: path.join(__dirname, `staff-competency-filter-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'staffCompetencyFilterTrigger');
      for (const [filters, expected] of [
        [{ keyword: ' #ebb03 ' }, ['1', '80.00%']], [{ company: 'PeopleHCM Services' }, ['2', '70.00%']],
        [{ branch: 'Kuala Lumpur' }, ['3', '63.33%']], [{ department: 'Finance' }, ['2', '40.00%']],
        [{ job: 'Product Designer' }, ['1', '75.00%']], [{ matchMin: '80', matchMax: '100' }, ['3', '90.00%']],
        [{ matchMin: '0', matchMax: '0' }, ['1', '0.00%']], [{ company: 'PeopleHCM Services', job: 'Product Designer' }, ['0', '—']]
      ]) {
        await apply(page, filters);
        assert.deepEqual(await totals(page), expected, JSON.stringify(filters));
      }
      assert.equal(await page.$eval('#staffCompetencyTable .attendance-report-empty', node => node.colSpan), 6);
      await page.click('#staffCompetencyViewChart');
      assert.equal(await page.$$eval('#staffCompetencyChartSegments circle', nodes => nodes.length), 0, 'Empty chart has no invented slices');
      await page.click('#staffCompetencyBack');
      for (const values of [{ matchMin: '90', matchMax: '20' }, { matchMin: '-1' }, { matchMax: '101' }]) {
        await apply(page, values);
        assert.equal(await page.$eval('#staffCompetencyFilterError', node => node.hidden), false, 'Invalid range keeps the filter open');
        await page.keyboard.press('Escape');
      }
      await apply(page, {});
      await page.click('#staffCompetencyViewChart');
      assert.equal(await page.$eval('#staffCompetencyChartAverage', node => node.textContent), '67.50%');
      assert.equal(await page.$$eval('#staffCompetencyChartSegments circle', nodes => nodes.length), 3);
      assert.deepEqual(await page.$$eval('#staffCompetencyChartLegend .attendance-report-legend-row', nodes => nodes.map(node => [node.dataset.category, node.dataset.records])), [['Kuala Lumpur', '3'], ['Penang', '2'], ['Johor Bahru', '1']]);
      await page.select('#staffCompetencyChartMetric', 'department');
      assert.equal(await page.$$eval('#staffCompetencyChartSegments circle', nodes => nodes.length), 5);
      await page.screenshot({ path: path.join(__dirname, `staff-competency-chart-${theme}-${width}.png`) });
      await page.click('#staffCompetencyBack');
      await apply(page, { company: 'PeopleHCM Services' });
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#staffCompetencyTable tbody tr:first-child')]);
      assert.match(page.url(), /company=PeopleHCM/);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#csBack')]);
      assert.deepEqual(await totals(page), ['2', '70.00%'], 'Returning from an employee preserves the list filter');
      const directory = path.join(__dirname, 'staff-competency-exports', `${theme}-${width}`);
      await fs.mkdir(directory, { recursive: true });
      const csvFile = path.join(directory, 'staff-competency.csv');
      await fs.rm(csvFile, { force: true });
      const cdp = await page.createCDPSession();
      await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
      await page.click('#staffCompetencyExportExcel');
      let csv;
      for (let attempt = 0; attempt < 40; attempt++) {
        try { csv = await fs.readFile(csvFile, 'utf8'); break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
      }
      assert.ok(csv?.includes('Nur Izzati') && csv.includes('Alex Tan') && !csv.includes('Farhan Binti Rahmat'), 'Excel export contains only filtered employees');
      assert.ok(csv.includes('"Average Match %",70'), 'Exported average uses the same filtered records');
      await page.evaluate(() => { window.print = () => { window.staffPrintCalled = true; }; });
      await page.click('#staffCompetencyExportPdf');
      assert.equal(await page.evaluate(() => window.staffPrintCalled), true);
      await page.emulateMediaType('print');
      assert.equal(await page.$eval('phone-bottom-nav', node => getComputedStyle(node).display), 'none');
      assert.equal(await page.$eval('#staffCompetencyExportPdf', node => getComputedStyle(node).display), 'none');
      assert.ok(await page.$eval('#staffCompetencyTable', node => node.scrollWidth <= document.querySelector('main').clientWidth + 1), 'PDF table fits the printable page');
      await page.pdf({ path: path.join(directory, 'staff-competency.pdf'), format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
      await page.emulateMediaType('screen');
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      await page.click(`[data-set-theme="${nextTheme}"]`);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#staffCompetencyBack')]);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), nextTheme);
      assert.equal(await page.$eval('#trainingCompetencyTabTeam', node => node.getAttribute('aria-selected')), 'true');
    }
    const override = await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'STAFF_COMPETENCY_DATA', { get: () => [
        { empNo: 'ZERO', name: 'Zero Match', matchPercent: 0 },
        { empNo: 'MISSING', name: 'Missing Match', matchPercent: null }
      ], set: () => {} });
    });
    await page.goto(url('options/staff-competency.html'), { waitUntil: 'domcontentloaded' });
    assert.deepEqual(await totals(page), ['2', '0.00%'], 'Missing matches are excluded from averages while zero remains valid');
    await apply(page, { matchMin: '0', matchMax: '0' });
    assert.deepEqual(await totals(page), ['1', '0.00%'], 'Explicit range excludes missing values');
    await page.removeScriptToEvaluateOnNewDocument(override.identifier);
    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: Staff Competency employee routing, plain match text, profile, Assess button, competency table, history details, filter restoration, charts, exports and responsive themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
