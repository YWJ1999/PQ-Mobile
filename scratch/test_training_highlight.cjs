const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = (file, query = '') => pathToFileURL(path.join(root, 'modules/training-competency', file)).href + query;
async function apply(page, filters) {
  await page.click('#trainingHighlightFilterTrigger');
  await page.evaluate(filters => {
    const form = document.getElementById('trainingHighlightFilterForm');
    form.reset();
    Object.entries(filters).forEach(([key, value]) => { form.elements[key].value = value; });
  }, filters);
  await page.click('#trainingHighlightApplyFilter');
}
async function totals(page) {
  return page.evaluate(() => [document.getElementById('trainingHighlightTotalRecords').textContent, document.getElementById('trainingHighlightTotalDays').textContent]);
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
      assert.equal(await page.$eval('[data-option-id="training-highlight"]', node => node.tagName), 'A');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-option-id="training-highlight"]')]);
      assert.equal(await page.$eval('h1', node => node.textContent), 'Training Highlight');
      assert.deepEqual(await totals(page), ['4', '12.00']);
      assert.deepEqual(await page.$$eval('#trainingHighlightTable th', nodes => nodes.map(node => node.textContent)), ['Emp #', 'Name', 'Days', 'Branch', 'Department', 'Position']);
      assert.deepEqual(await page.$$eval('#trainingHighlightTable tbody tr:first-child td', nodes => nodes.map(node => node.textContent)), ['#EBB12', 'Farhan Binti Rahmat', '4.00', 'Kuala Lumpur', 'Human Resource', 'Group HR Manager']);
      assert.ok(await page.$('#trainingHighlightViewChart .fa-chart-simple'));
      assert.equal(await page.$eval('#trainingHighlightViewChart', node => node.textContent.trim()), 'Chart');
      assert.ok(await page.$('.record-summary-card .record-summary-value'));
      await page.screenshot({ path: path.join(__dirname, `training-highlight-report-${theme}-${width}.png`) });
      const reportUrl = page.url();
      await page.click('[data-training-employee="EBB12"]');
      assert.ok(await page.$('#trainingHighlightDetailsOverlay'), 'Days opens a detail popout');
      assert.equal(await page.$eval('#trainingHighlightDetailsOverlay', node => node.hidden), false);
      assert.equal(page.url(), reportUrl, 'Opening details keeps the current URL');
      assert.equal(await page.$eval('#trainingHighlightTitle', node => node.textContent), 'Training Highlight');
      assert.equal(await page.$eval('#trainingHighlightReportView', node => node.hidden), false, 'The report stays behind the popout');
      assert.equal(await page.$eval('main', node => node.inert), true);
      assert.deepEqual(await page.evaluate(() => [document.getElementById('trainingHighlightDetailRecords').textContent, document.getElementById('trainingHighlightDetailDays').textContent]), ['3', '4.00']);
      assert.deepEqual(await page.$$eval('#trainingHighlightDetailTable th', nodes => nodes.map(node => node.textContent)), ['Date', 'Course Title', 'Days']);
      assert.deepEqual(await page.$$eval('#trainingHighlightDetailTable tbody tr', nodes => nodes.map(node => [...node.cells].map(cell => cell.textContent))), [
        ['02 Oct 2026', 'Effective Crisis Management', '2.00'], ['18 Sep 2026', 'Bolt Fitment', '1.00'], ['12 Aug 2026', 'Channel Assembly', '1.00']
      ]);
      assert.deepEqual(await page.$eval('.training-highlight-person', node => [...node.children].map(child => child.textContent)), ['Farhan Binti Rahmat', '#EBB12']);
      await page.screenshot({ path: path.join(__dirname, `training-highlight-details-${theme}-${width}.png`) });
      await page.click('#trainingHighlightDetailsClose');
      assert.equal(await page.$eval('#trainingHighlightDetailsOverlay', node => node.hidden), true);
      assert.equal(await page.$eval('main', node => node.inert), false);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.trainingEmployee), 'EBB12', 'Closing restores the Days button focus');
      await page.keyboard.press('Enter');
      await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.getElementById('trainingHighlightDetailsOverlay').contains(document.activeElement)), true, 'Detail popout traps keyboard focus');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#trainingHighlightDetailsOverlay', node => node.hidden), true);
      await page.click('#trainingHighlightFilterTrigger');
      assert.deepEqual(await page.$$eval('#trainingHighlightFilterForm label', nodes => nodes.map(node => node.textContent)), ['Search Keyword', 'Start Date', 'End Date', 'Development Area', 'Course', 'Summary By', 'Days Range']);
      await page.screenshot({ path: path.join(__dirname, `training-highlight-filter-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      for (const [filters, expected] of [
        [{ keyword: ' #EBB12 ' }, ['1', '4.00']],
        [{ startDate: '2026-09-18', endDate: '2026-09-18' }, ['2', '2.50']],
        [{ developmentArea: 'Technical Skills' }, ['2', '4.00']],
        [{ course: 'Channel Assembly' }, ['2', '1.50']],
        [{ daysMin: '2.5', daysMax: '3' }, ['2', '6.00']],
        [{ keyword: 'Farhan', course: 'Microsoft' }, ['0', '0.00']]
      ]) { await apply(page, filters); assert.deepEqual(await totals(page), expected, JSON.stringify(filters)); }
      await page.click('#trainingHighlightViewChart');
      assert.equal(await page.$$eval('#trainingHighlightChartSegments circle', nodes => nodes.length), 0);
      await page.click('#trainingHighlightBack');
      for (const filters of [{ startDate: '2026-10-01', endDate: '2026-08-01' }, { daysMin: '5', daysMax: '1' }, { daysMin: '-1' }]) {
        await apply(page, filters);
        assert.equal(await page.$eval('#trainingHighlightFilterError', node => node.hidden), false);
        await page.keyboard.press('Escape');
      }
      await apply(page, { course: 'Channel Assembly' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.deepEqual(await totals(page), ['2', '1.50'], 'Reload retains applied filters');
      await page.click('[data-training-employee="EBB12"]');
      assert.equal(await page.$eval('#trainingHighlightDetailRecords', node => node.textContent), '1', 'Details use the filtered sessions only');
      assert.equal(await page.$eval('#trainingHighlightDetailDays', node => node.textContent), '1.00');
      await page.keyboard.press('Escape');
      await apply(page, { summaryBy: 'branch' });
      await page.click('#trainingHighlightViewChart');
      assert.equal(await page.$eval('#trainingHighlightChartTotal', node => node.textContent), '12.00');
      assert.equal(await page.$eval('#trainingHighlightChartMetric', node => node.value), 'branch');
      assert.deepEqual(await page.$$eval('#trainingHighlightChartLegend .attendance-report-legend-row', nodes => nodes.map(node => [node.dataset.category, node.dataset.days])), [['Kuala Lumpur', '7'], ['Penang', '3'], ['Johor Bahru', '2']]);
      await page.screenshot({ path: path.join(__dirname, `training-highlight-chart-${theme}-${width}.png`) });
      await page.click('#trainingHighlightChartLegend .attendance-report-legend-row');
      assert.equal(await page.$eval('#trainingHighlightAnalysisTotal', node => node.textContent), '7.00');
      await page.click('#trainingHighlightBack');
      await page.click('#trainingHighlightViewTrend');
      assert.equal(await page.$eval('#trainingHighlightTrendTotal', node => node.textContent), '12.00');
      assert.deepEqual(await page.$$eval('[data-training-month]', nodes => nodes.map(node => [node.dataset.trainingMonth, node.dataset.days])), [['2026-08', '1.5'], ['2026-09', '5.5'], ['2026-10', '5']]);
      await page.screenshot({ path: path.join(__dirname, `training-highlight-trend-${theme}-${width}.png`) });
      await page.click('[data-training-month="2026-09"]');
      assert.equal(await page.$eval('#trainingHighlightAnalysisTotal', node => node.textContent), '5.50');
      await page.screenshot({ path: path.join(__dirname, `training-highlight-analysis-${theme}-${width}.png`) });
      await page.click('#trainingHighlightBack');
      assert.equal(await page.$eval('#trainingHighlightTrendView', node => node.hidden), false);
      await page.click('#trainingHighlightTrendTotalCard');
      assert.equal(await page.$eval('#trainingHighlightAnalysisTotal', node => node.textContent), '12.00');
      await page.click('#trainingHighlightBack');
      await page.click('#trainingHighlightBack');
      await page.click('#trainingHighlightBack');
      await apply(page, { course: 'Channel Assembly' });
      const directory = path.join(__dirname, 'training-highlight-exports', `${theme}-${width}`);
      await fs.mkdir(directory, { recursive: true });
      const csvPath = path.join(directory, 'training-highlight.csv');
      await fs.rm(csvPath, { force: true });
      const cdp = await page.createCDPSession();
      await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
      await page.click('#trainingHighlightExportExcel');
      let csv;
      for (let attempt = 0; attempt < 40; attempt++) { try { csv = await fs.readFile(csvPath, 'utf8'); break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } }
      assert.ok(csv?.includes('Farhan Binti Rahmat') && csv.includes('Daniel Wong') && !csv.includes('Nur Izzati'));
      assert.ok(csv.includes('"Total Training Days",1.5'));
      await page.evaluate(() => { window.print = () => { window.trainingPrintCalled = true; }; });
      await page.click('#trainingHighlightExportPdf');
      assert.equal(await page.evaluate(() => window.trainingPrintCalled), true);
      await page.emulateMediaType('print');
      assert.equal(await page.$eval('phone-bottom-nav', node => getComputedStyle(node).display), 'none');
      await page.pdf({ path: path.join(directory, 'training-highlight.pdf'), landscape: true, format: 'A4', printBackground: true, preferCSSPageSize: true });
      await page.emulateMediaType('screen');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1));
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      await page.click(`[data-set-theme="${nextTheme}"]`);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#trainingHighlightBack')]);
      assert.equal(await page.$eval('#trainingCompetencyTabTeam', node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), nextTheme);
    }
    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: Training Highlight filters, grouped days, employee course details, charts/trends/analysis, exports, theme, navigation and 360/420px layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
