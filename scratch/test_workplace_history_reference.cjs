const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = theme => pathToFileURL(path.resolve(__dirname, '../modules/admin/options/history.html')).href + '?theme=' + theme;
const historyKey = 'peoplehcm:workplace:history:v1';
const sampleKey = 'peoplehcm:workplace:history:samples:v1';
const migrationKey = 'peoplehcm:workplace:history:cancelled-to-submitted:v1';
const screenshot = async (page, name) => {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))); });
  await page.screenshot({ path: path.resolve(__dirname, name) });
};
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(url(theme), { waitUntil: 'domcontentloaded' });
      await page.evaluate((key, marker, migration) => { localStorage.removeItem(key); localStorage.removeItem(marker); localStorage.removeItem(migration); }, historyKey, sampleKey, migrationKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 7, 'Show all seven screenshot Guest Visit records');
      assert.equal(await page.$$eval('#workplaceHistoryList .fa-chevron-right', n => n.length), 0);
      assert.equal(await page.$$eval('[data-history-action="apply"]', n => n.length), 1);
      const first = '[data-record-id="sample-guest-0001"]';
      assert.equal(await page.$eval(first, n => n.dataset.status), 'submitted');
      // Simulate an existing browser with the old screenshot statuses already saved.
      await page.evaluate((key, migration) => {
        const rows = JSON.parse(localStorage.getItem(key));
        rows.find(row => row.id === 'sample-guest-0001').status = 'cancelled';
        localStorage.setItem(key, JSON.stringify(rows));
        localStorage.removeItem(migration);
      }, historyKey, migrationKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval(first, n => n.dataset.status), 'submitted', 'Existing saved cancellations receive the correction');
      assert.match(await page.$eval(first, n => n.textContent), /FGV0000000000001.*17 Jan 2024.*1111-2222.*3/s);
      await screenshot(page, `workplace-history-reference-guest-${theme}-${width}.png`);
      await page.click(first + ' .history-card-main');
      assert.match(await page.$eval('#historyDetailBody', n => n.textContent), /444.*Guest Information.*55.*Customer.*66.*77.*Internal Attendee.*HUMAN RESOURCE.*GROUP HR MANAGER/s);
      assert.match(await page.$eval('#historyDetailBody [data-detail-field="Emp #"]', n => n.textContent), /^#EBB12$/);
      assert.deepEqual(await page.evaluate(() => {
        const countReferences = root => [...root.querySelectorAll('th')].filter(cell => cell.textContent.trim() === 'Reference #').length;
        const sections = [...document.querySelectorAll('#historyDetailBody .history-detail-section')];
        const section = title => sections.find(item => item.querySelector('.history-detail-section-title')?.textContent.trim() === title);
        return {
          main: countReferences(document.querySelector('#historyDetailBody .history-detail-main-table')),
          guestInformation: countReferences(section('Guest Information')),
          internalAttendee: countReferences(section('Internal Attendee'))
        };
      }), {
        main: 1,
        guestInformation: 0,
        internalAttendee: 0
      }, 'Only the main Guest Visit details table keeps Reference #');
      assert.equal(await page.$eval('#historyDetailsModal', n => n.getAttribute('aria-hidden')), 'false');
      await screenshot(page, `workplace-history-reference-guest-detail-${theme}-${width}.png`);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.closest('[data-record-id]')?.dataset.recordId), 'sample-guest-0001');
      await page.click('[data-history-action="apply"]');
      assert.equal(await page.$eval('[data-record-id="sample-guest-0006"]', n => n.dataset.status), 'submitted');
      assert.equal(await page.$eval('#historyDetailsModal', n => n.getAttribute('aria-hidden')), 'true', 'Apply must not open record details');
      await page.click('[data-record-id="sample-guest-0006"] [data-history-action="cancel"]');
      assert.equal(await page.$eval('[data-record-id="sample-guest-0006"]', n => n.dataset.status), 'cancelled');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('[data-record-id="sample-guest-0006"]', n => n.dataset.status), 'cancelled');
      await page.click('#historyFilterTrigger');
      assert.equal(await page.$eval('#historyStatus', n => n.getClientRects().length), 0, 'Guest Visit filters contain dates only');
      // A hidden status control must not restrict Guest Visit results.
      await page.select('#historyStatus', 'draft');
      await page.$eval('#historyDateFrom', n => { n.value = '2024-07-03'; });
      await page.$eval('#historyDateTo', n => { n.value = '2024-07-03'; });
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 2, 'Date ranges include both boundary records');
      await page.click('[data-history-kind="letter-request"]');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 6);
      const accessibleNames = await page.$$eval('#workplaceHistoryList .history-card-main', nodes => nodes.map(n => n.getAttribute('aria-label')));
      assert.equal(new Set(accessibleNames).size, 6, 'Letter detail buttons must have distinct accessible names');
      await screenshot(page, `workplace-history-reference-letter-${theme}-${width}.png`);
      await page.click('[data-record-id="sample-letter-0091"] .history-card-main');
      assert.match(await page.$eval('#historyDetailBody', n => n.textContent), /DRQ0000000000091.*gnfnngn.*fhcgh.*gfhnmghm.*fj ch.*gfnf.*SuratKebenaranvWJv1Jun2021.pdf.*22 Mar 2022/s);
      await screenshot(page, `workplace-history-reference-letter-detail-${theme}-${width}.png`);
      await page.keyboard.press('Escape');
      await page.click('#historyFilterTrigger');
      assert.ok(await page.$eval('#historyStatus', n => n.getClientRects().length), 'Letter status remains visible');
      assert.equal(await page.$eval('#historyTypeLabel', n => n.textContent), 'Letter Type');
      await page.select('#historyType', 'Letter of Guarantee');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 2);
      await page.click('[data-history-kind="inventory-request"]');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 2);
      await screenshot(page, `workplace-history-reference-inventory-${theme}-${width}.png`);
      await page.click('[data-record-id="sample-inventory-0064"] .history-card-main');
      assert.match(await page.$eval('#historyDetailBody', n => n.textContent), /IRQ0000000000064.*Pending.*8 Sep 2026.*LOCKER 1000.*Quantity.*1.*UOM.*Piece.*Inventory Request Reason 1.*#EBB12.*Is Assigned\?.*No/s);
      await screenshot(page, `workplace-history-reference-inventory-detail-${theme}-${width}.png`);
      await page.keyboard.press('Escape');
      await page.click('#historyFilterTrigger');
      assert.equal(await page.$eval('#historyTypeLabel', n => n.textContent), 'Request Item');
      await page.select('#historyType', 'Laptop');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 1);
      await page.click('[data-history-kind="letter-request"]');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 2, 'Each category retains its filter');
      await page.click('#historyFilterTrigger');
      await page.click('#resetHistoryFilter');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 6);
      await page.click('#historyFilterTrigger');
      await page.select('#historyStatus', 'draft');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$eval('#historyEmptyState', n => n.hidden), false);
      await page.click('#historyFilterTrigger');
      await page.click('#resetHistoryFilter');
      await page.$eval('#historyDateFrom', n => { n.value = '2026-10-08'; });
      await page.$eval('#historyDateTo', n => { n.value = '2025-01-01'; });
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$eval('#historyFilterError', n => n.hidden), false, 'Reversed date ranges cannot apply');
      await page.click('#resetHistoryFilter');
      await page.click('#applyHistoryFilter');
      await page.evaluate(() => {
        window.WorkplaceHistoryStore.save({ kind: 'letter-request', title: 'Custom letter', date: '2026-10-08', fields: [['Description', '<script>unsafe()</script>'], ['Reason', 'User record remains']] });
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      });
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 7, 'New form records coexist with screenshot data');
      assert.equal(await page.$$eval('#workplaceHistoryList script', n => n.length), 0, 'User text is rendered safely');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.click('[data-history-kind="letter-request"]');
      assert.equal(await page.$$eval('#workplaceHistoryList [data-record-id]', n => n.length), 7, 'Initialization cannot duplicate references or remove user records');
      assert.equal(await page.$eval('main', n => n.scrollWidth > n.clientWidth), false);
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: screenshot records, grouped details, per-category filters, Apply/Cancel persistence, no arrows, mobile layout`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
