const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = (file = 'skill-expiry.html', query = '') => pathToFileURL(path.join(root, 'modules/training-competency/options', file)).href + query;

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 360, height: 900 });
    const click = async selector => { await page.$eval(selector, node => node.scrollIntoView({ block: 'center' })); await page.click(selector); };
    const navigate = async (selector, ready) => { await click(selector); await page.waitForSelector(ready); };
    const total = () => page.$eval('#csTotalRecords', node => node.textContent);
    async function apply(values) {
      await click('#csFilterTrigger');
      await page.evaluate(values => {
        const form = document.getElementById('csFilterForm'); form.reset();
        Object.entries(values).forEach(([key, value]) => { form.elements.namedItem(key).value = value; });
      }, values);
      await click('#csApplyFilter');
    }
    const hub = pathToFileURL(path.join(root, 'modules/training-competency/index.html')).href;
    await page.goto(hub + '?scope=team&theme=dark', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('[data-option-id="skill-expiry"]', node => node.tagName), 'A', 'Skill Expiry must open its report');
    await navigate('[data-option-id="skill-expiry"]', '#csTable');
    assert.equal(await total(), '12');
    assert.deepEqual(await page.$$eval('#csTable th', nodes => nodes.map(node => node.textContent)), ['Competency', 'Count']);
    assert.equal(await page.$$('.cs-pdf-link').then(nodes => nodes.length), 0);
    await click('#csViewChart');
    assert.equal(await page.$eval('#csChartTotal', node => node.textContent), '12');
    assert.equal(await page.$$eval('#csChartLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 12);
    await click('#csBack');
    await navigate('tr[data-competency="effective-communication"] .cs-row-link', '#csTable[data-kind="levels"]');
    assert.equal(await total(), '6');
    assert.deepEqual(await page.$$eval('#csTable th', nodes => nodes.map(node => node.textContent)), ['Competency', 'Level', 'Count']);
    await click('#csViewChart');
    assert.equal(await page.$eval('#csChartTotal', node => node.textContent), '6');
    await click('#csBack');
    await navigate('tr[data-level="4"] .cs-row-link', '#csEmployeeCards');
    assert.equal(await total(), '3');
    assert.deepEqual(await page.$$eval('#csSelectionSummary .cs-summary-field strong', nodes => nodes.map(node => node.textContent)), ['Effective Communication', '4']);
    assert.equal(await page.$eval('.cs-employee-id', node => node.textContent), '#EBB12');
    assert.equal(await page.$eval('.cs-employee-id', node => node.previousElementSibling.textContent), 'Farhan Binti Rahmat');
    assert.deepEqual(await page.$$eval('.cs-employee-card:first-child dt', nodes => nodes.map(node => node.textContent)), ['Department', 'Position', 'Competency', 'Level', 'Expiry Date']);
    assert.deepEqual(await page.$$eval('.cs-employee-card:first-child dd', nodes => nodes.map(node => node.textContent)), ['Human Resource', 'Group HR Manager', 'Effective Communication', '4', '14 Sept 2027']);
    await click('#csViewChart');
    assert.equal(await page.$eval('#csChartTotal', node => node.textContent), '3');
    await click('#csBack');
    await navigate('.cs-employee-card', '.me-profile-heading');
    assert.ok(new URL(page.url()).pathname.endsWith('/me.html'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.goto(url(), { waitUntil: 'domcontentloaded' });
    await click('#csFilterTrigger');
    assert.deepEqual(await page.$$eval('#csFilterForm .performance-highlight-filter-fields > div > label', nodes => nodes.map(node => node.textContent)), ['Search Keyword', 'Company', 'Branch', 'Department', 'Line', 'Competency', 'Expiry Date']);
    assert.equal(await page.$$('#csFilterForm input[type="date"]').then(nodes => nodes.length), 2);
    await page.keyboard.press('Escape');
    for (const [filters, expected] of [
      [{ keyword: '#EBB12' }, '3'], [{ company: 'PeopleHCM Services' }, '4'], [{ branch: 'Kuala Lumpur' }, '6'],
      [{ department: 'Finance' }, '3'], [{ line: 'GENERAL' }, '12'], [{ competency: 'effective-communication' }, '6'],
      [{ expiryFrom: '2026-11-30', expiryTo: '2026-11-30' }, '2'], [{ expiryTo: '2026-11-30' }, '2'], [{ expiryFrom: '2027-09-14' }, '10']
    ]) { await apply(filters); assert.equal(await total(), expected, JSON.stringify(filters)); }
    await apply({ expiryFrom: '2027-10-01', expiryTo: '2026-10-01' });
    assert.equal(await page.$eval('#csFilterOverlay', node => node.hidden), false);
    assert.match(await page.$eval('#csFilterError', node => node.textContent), /on or after/);
    await click('#csResetFilter');
    assert.equal(await page.$eval('#csFilterError', node => node.hidden), true, 'Reset clears the previous date error');
    await page.keyboard.press('Escape');
    const combined = { company: 'PeopleHCM Services', branch: 'Penang', department: 'Operations', line: 'GENERAL', competency: 'effective-communication', expiryFrom: '2026-11-30', expiryTo: '2026-11-30' };
    await apply(combined);
    assert.equal(await total(), '1');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await total(), '1');
    await navigate('.cs-count', '#csTable[data-kind="levels"]');
    assert.equal(await total(), '1');
    await navigate('tr[data-level="3"] .cs-row-link', '#csEmployeeCards');
    assert.equal(await total(), '1');
    assert.equal(await page.$eval('.cs-employee-name', node => node.textContent), 'Alex Tan');
    for (const [key, value] of Object.entries(combined)) assert.equal(new URL(page.url()).searchParams.get(key), value);
    await navigate('#csBack', '#csTable[data-kind="levels"]');
    await navigate('#csBack', '#csTable[data-kind="summary"]');
    await click('#csFilterTrigger'); await click('#csResetFilter'); await click('#csApplyFilter');
    assert.equal(await total(), '12');
    await apply({ keyword: 'No matching employee' });
    assert.equal(await total(), '0');
    await click('#csViewChart');
    assert.equal(await page.$$('#csChartSegments circle').then(nodes => nodes.length), 0);
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(url('skill-expiry.html', `?theme=${theme}`), { waitUntil: 'domcontentloaded' });
      const capture = async name => {
        assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true, `${name} ${theme} ${width}: no page overflow`);
        assert.equal(await page.$eval('#csViewChart', node => node.textContent.trim()), 'Chart');
        assert.ok(await page.$('#csViewChart .fa-chart-simple'));
        assert.equal(await page.$eval('#csViewChart', node => getComputedStyle(node).whiteSpace), 'nowrap');
        await page.screenshot({ path: path.join(__dirname, `skill-expiry-${name}-${theme}-${width}.png`) });
      };
      await capture('summary');
      await click('#csFilterTrigger'); await capture('filter'); await click('#csCloseFilter');
      await click('#csViewChart'); await capture('chart'); await click('#csBack');
      await navigate('.cs-row-link', '#csTable[data-kind="levels"]'); await capture('levels');
      await navigate('tr[data-level="4"] .cs-row-link', '#csEmployeeCards'); await capture('employees');
      await navigate('.cs-employee-card', '.me-profile-heading');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    }
    await page.goto(url('skill-expiry-levels.html', '?skill=missing'), { waitUntil: 'domcontentloaded' });
    assert.equal(await total(), '0');
    await page.goto(url('skill-expiry-employees.html', '?skill=effective-communication&level=99'), { waitUntil: 'domcontentloaded' });
    assert.equal(await total(), '0');
    assert.match(await page.$eval('#csEmployeeCards', node => node.textContent), /No records/);
    assert.deepEqual(errors, []);
    console.log('PASS: Skill Expiry 7 filters, inclusive date range, chart totals, 3-level drilldown, employee cards, me.html navigation, URL state and responsive themes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
