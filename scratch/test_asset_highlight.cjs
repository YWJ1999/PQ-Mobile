const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/admin/options/asset-highlight.html')).href;
const rows = page => page.$$eval('#assetTable tbody tr', nodes => nodes.map(row => [...row.cells].map(cell => cell.textContent.trim())));
async function tableTotals(page) {
  const data = await rows(page);
  return data.reduce((total, row) => ({ count: total.count + Number(row[2].replaceAll(',', '')), valueCents: total.valueCents + Math.round(Number(row[3].replaceAll(',', '')) * 100) }), { count: 0, valueCents: 0 });
}
async function filter(page, values) {
  await page.click('#assetFilterTrigger');
  await page.click('#assetResetFilter');
  for (const [name, value] of Object.entries(values)) {
    await page.$eval(`[name="${name}"]`, (node, text) => { node.value = text; node.dispatchEvent(new Event('change', { bubbles: true })); }, value);
  }
  await page.click('#assetApplyFilter');
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 900 });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/admin/index.html')).href + '?scope=individual&theme=' + theme, { waitUntil: 'networkidle0' });
      await page.click('[data-workplace-options-open]');
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('[data-option-ref="asset-highlight"]')]);
      assert.equal(new URL(page.url()).pathname, new URL(url).pathname);
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.ok(await page.$('#assetTable'), 'Asset Highlight must contain the employee asset report');
      assert.deepEqual(await page.$$eval('#assetTable th', nodes => nodes.map(node => node.textContent)), ['Emp#', 'Name', 'Count', 'Value']);
      assert.equal((await rows(page)).length, 8);
      assert.equal(await page.$eval('record-chart-count', node => node.textContent.trim()), '8 Records');
      assert.deepEqual((await rows(page)).find(row => row[0] === '#EBB01'), ['#EBB01', 'Muhammad ali bin man', '3', '5,170.00']);
      assert.equal(await page.$('#assetTotalCount'), null, 'Summary must omit Total Count');
      assert.equal(await page.$('#assetTotalValue'), null, 'Summary must omit Total Value');
      assert.deepEqual(await tableTotals(page), { count: 12, valueCents: 2967000 });
      assert.equal(await page.$eval('#assetViewChart', node => node.textContent.trim()), 'Chart');
      assert.ok(await page.$('#assetViewChart .fa-chart-simple'));
      assert.equal(await page.$eval('#assetViewChart', node => getComputedStyle(node).whiteSpace), 'nowrap');
      assert.ok(!(await page.$eval('body', node => node.textContent)).includes('View Trending'));
      assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth));
      await page.screenshot({ path: path.resolve(__dirname, `asset-highlight-${theme}-${width}.png`) });

      await page.click('#assetFilterTrigger');
      assert.deepEqual(await page.$$eval('#assetFilterForm label', nodes => nodes.map(node => node.textContent)), ['Search Keyword', 'Description', 'Asset Type', 'Effective Date', 'Company', 'Branch', 'Department']);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'assetKeyword');
      await page.type('#assetKeyword', 'discard me');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'assetFilterTrigger');
      assert.equal((await rows(page)).length, 8, 'Closing must not apply draft filters');

      await filter(page, { keyword: '#EBB01' });
      assert.equal((await rows(page)).length, 1);
      assert.equal(await page.$eval('record-chart-count', node => node.textContent.trim()), '1 Record');
      assert.equal((await tableTotals(page)).count, 3);
      await filter(page, { description: 'MONITOR' });
      assert.equal((await rows(page)).length, 3);
      assert.equal((await tableTotals(page)).valueCents, 225000);
      await filter(page, { assetType: 'Laptop' });
      assert.deepEqual(await tableTotals(page), { count: 8, valueCents: 2730000 });
      await filter(page, { effectiveDate: '2026-09-01' });
      assert.equal((await tableTotals(page)).count, 4);
      await filter(page, { company: 'PQ Services Sdn Bhd' });
      assert.equal((await rows(page)).length, 4);
      await filter(page, { branch: 'Penang' });
      assert.deepEqual((await rows(page)).map(row => row[0]), ['#99104', '#EBB41']);
      await filter(page, { department: 'Finance' });
      assert.deepEqual((await rows(page)).map(row => row[0]), ['#EBB27', '#EBB30']);
      await filter(page, { keyword: 'EBB01', assetType: 'Monitor', effectiveDate: '2026-10-01', company: 'PeopleHCM Sdn Bhd', branch: 'Headquarters (HQ)', department: 'IT Support & Systems' });
      assert.deepEqual(await tableTotals(page), { count: 1, valueCents: 85000 });
      await page.click('#assetViewChart');
      assert.equal(await page.$eval('#assetPageTitle', node => node.textContent), 'Asset Chart');
      assert.equal(await page.$eval('#assetChartTotal', node => node.textContent), '1');
      assert.equal(await page.$$eval('#assetChart select', nodes => nodes.length), 1, 'Chart must have just one dropdown');
      assert.deepEqual(await page.$$eval('#assetChartDimension option', nodes => nodes.map(node => [node.value, node.textContent])), [['branch', 'Branch']]);
      assert.equal(await page.$('#assetChartMeasure'), null, 'Chart must not include a Measure dropdown');
      assert.equal(await page.$eval('#assetChartTitle', node => node.textContent), 'Asset count by branch');
      assert.ok((await page.$eval('#assetChartLegend', node => node.textContent)).includes('Headquarters (HQ)'));
      assert.ok((await page.$eval('#assetChartLegend', node => node.textContent)).includes('100.0%'));
      await page.click('#assetBack');
      assert.equal((await rows(page)).length, 1, 'Returning from chart preserves filters');
      await filter(page, {});
      await page.click('#assetViewChart');
      assert.equal(await page.$eval('#assetChartTotal', node => node.textContent), '12');
      assert.equal(await page.$$eval('#assetChartSegments circle', nodes => nodes.length), 3);
      assert.deepEqual(await page.$$eval('#assetChartLegend .attendance-report-legend-row', nodes => nodes.map(node => [...node.children].map(cell => cell.textContent))), [['Headquarters (HQ)', '7', '58.3%'], ['Johor Bahru', '3', '25.0%'], ['Penang', '2', '16.7%']]);
      await page.screenshot({ path: path.resolve(__dirname, `asset-chart-${theme}-${width}.png`) });
      await page.click('#assetBack');
      await filter(page, { keyword: '<script>no employee</script>' });
      assert.equal((await rows(page)).length, 0);
      assert.equal(await page.$eval('record-chart-count', node => node.textContent.trim()), '0 Records');
      assert.equal(await page.$eval('#assetEmpty', node => node.hidden), false);
      await page.click('#assetViewChart');
      assert.equal(await page.$eval('#assetChartTotal', node => node.textContent), '0');
      assert.equal(await page.$$eval('#assetChartSegments circle', nodes => nodes.length), 0);
      await page.click('#assetBack');
      await filter(page, {});
      await page.setViewport({ width, height: 640 });
      await page.click('#assetFilterTrigger');
      await page.screenshot({ path: path.resolve(__dirname, `asset-filter-${theme}-${width}.png`) });
      await page.focus('#assetDepartment');
      assert.ok(await page.$eval('#assetDepartment', node => {
        const field = node.getBoundingClientRect();
        const footer = document.querySelector('#assetDataFilter footer').getBoundingClientRect();
        const header = document.querySelector('#assetDataFilter header').getBoundingClientRect();
        return field.top >= header.bottom && field.bottom <= footer.top;
      }), 'All seven filters must be reachable above the Apply button on short screens');
      await page.$eval('#assetApplyFilter', node => node.focus());
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'assetResetFilter', 'Tab must stay in the filter dialog');
      await page.keyboard.press('Escape');
      await page.click('#assetBack');
      await page.waitForFunction(() => location.pathname.endsWith('/admin/index.html'));
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'individual');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS Asset Highlight ${theme} ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
