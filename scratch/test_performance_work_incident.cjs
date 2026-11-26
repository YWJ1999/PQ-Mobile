const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = (file, query = '') => pathToFileURL(path.join(root, file)).href + query;
async function field(page, id, value) {
  await page.$eval('#' + id, (el, next) => { el.value = next; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
}
async function totals(page, count, points) {
  assert.equal(await page.$eval('#workIncidentTotalRecords', el => el.textContent), count);
  assert.equal(await page.$eval('#workIncidentTotalPoints', el => el.textContent), points);
  assert.equal(await page.$$eval('#workIncidentRows tr', els => els.length), Number(count));
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844 });
        await page.goto(url('modules/performance/index.html', '?theme=' + theme), { waitUntil: 'domcontentloaded' });
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-option-id="work-incident"]')]);
        assert.ok(page.url().includes('/performance/options/work-incident.html'), 'Work Incident opens from Performance');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        await totals(page, '6', '4');
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(__dirname, `work-incident-table-${theme}-${width}.png`) });
        await page.click('#workIncidentFilterTrigger');
        assert.equal(await page.$eval('.performance-content', el => el.inert), true);
        await page.screenshot({ path: path.join(__dirname, `work-incident-filter-${theme}-${width}.png`) });
        await page.select('#workIncidentFilterType', 'Attendance');
        await field(page, 'workIncidentFilterStart', '2026-09-01');
        await field(page, 'workIncidentFilterEnd', '2026-10-01');
        await page.click('#workIncidentApplyFilter');
        await totals(page, '1', '-3');
        await page.click('#workIncidentFilterTrigger');
        await field(page, 'workIncidentFilterStart', '2026-10-09');
        await field(page, 'workIncidentFilterEnd', '2026-10-09');
        await page.click('#workIncidentApplyFilter');
        await totals(page, '1', '-2');
        await page.click('#workIncidentRows tr');
        assert.equal(await page.$eval('#workIncidentDetailsRows tr:last-child td', el => el.textContent), 'No attachment');
        assert.equal(await page.$$eval('#workIncidentDetailsRows tr', els => els.find(el => el.querySelector('th').textContent === 'Is Closed?').querySelector('td').textContent), 'No');
        await page.keyboard.press('Escape');
        await page.click('#workIncidentFilterTrigger');
        await field(page, 'workIncidentFilterStart', '2026-10-10');
        await page.click('#workIncidentApplyFilter');
        assert.equal(await page.$eval('#workIncidentFilterError', el => el.hidden), false, 'Invalid range explains the error');
        await totals(page, '1', '-2');
        await page.keyboard.press('Escape');
        await page.click('#workIncidentFilterTrigger');
        await page.click('#workIncidentResetFilter');
        await field(page, 'workIncidentFilterStart', '2026-11-01');
        await field(page, 'workIncidentFilterEnd', '2026-11-30');
        await page.click('#workIncidentApplyFilter');
        await totals(page, '0', '0');
        assert.equal(await page.$eval('#workIncidentEmpty', el => el.hidden), false);
        await page.click('#workIncidentFilterTrigger');
        await page.click('#workIncidentResetFilter');
        await page.click('#workIncidentApplyFilter');
        await totals(page, '6', '4');
        await page.focus('#workIncidentRows tr:first-child');
        await page.keyboard.press('Enter');
        assert.equal(await page.$eval('#workIncidentDetailsOverlay', el => el.hidden), false);
        const labels = await page.$$eval('#workIncidentDetailsRows th', els => els.map(el => el.textContent));
        for (const label of ['Reference #', 'Name', 'Emp No.', 'Incident Date', 'Created Date', 'Incident Type', 'Incident Action', 'Measure Value', 'Merit', 'Value', 'Remarks', 'Is Closed?', 'Attachment']) assert.ok(labels.includes(label), label + ' appears in details');
        assert.equal(labels.indexOf('Emp No.'), labels.indexOf('Name') + 1, 'Employee ID follows the name');
        assert.equal(await page.$eval('[data-detail="empNo"]', el => el.textContent), 'EBB01');
        const attachment = await page.$eval('#workIncidentDetailsRows a[download]', el => el.href);
        assert.ok(require('node:fs').existsSync(require('node:url').fileURLToPath(attachment)), 'Attachment points to an actual file');
        await page.screenshot({ path: path.join(__dirname, `work-incident-details-${theme}-${width}.png`) });
        await page.$eval('#workIncidentDetailsOverlay .detail-popout-body', el => { el.scrollTop = el.scrollHeight; });
        await page.screenshot({ path: path.join(__dirname, `work-incident-details-bottom-${theme}-${width}.png`) });
        await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
        assert.equal(await page.evaluate(() => !!document.activeElement.closest('#workIncidentDetailsOverlay')), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('.performance-content', el => el.inert), false);
        assert.equal(await page.evaluate(() => document.activeElement.matches('#workIncidentRows tr:first-child')), true);
        await page.click('#workIncidentRows tr:first-child');
        await page.click('#workIncidentDetailsClose');
        assert.ok(await page.evaluate(() => document.querySelector('.performance-content').scrollWidth <= document.querySelector('.performance-content').clientWidth + 1));
        await page.click(`[data-set-theme="${theme === 'light' ? 'dark' : 'light'}"]`);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#workIncidentBack')]);
        assert.ok(page.url().includes('/performance/index.html') && page.url().includes('scope=individual'));
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme === 'light' ? 'dark' : 'light');
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Work Incident routing, combined/inclusive filters, totals, invalid and empty ranges, full details, attachments, focus, themes and 360/420px layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
