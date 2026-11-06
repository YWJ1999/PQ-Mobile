const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/admin/index.html')).href + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.removeItem('peoplehcm:workplace:pending-approval:v1'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$('[aria-label="Workplace scope"]'), null);
      const counts = await page.$$eval('[data-document-status] strong', nodes => nodes.map(node => node.textContent));
      const stored = await page.evaluate(() => localStorage.getItem('peoplehcm:workplace:history:v1'));
      assert.deepEqual(await page.$$eval('#workplaceQuickOptions > .admin-option:not([hidden]) .admin-option-title', nodes => nodes.map(node => node.textContent.trim())), ['News', 'Book Resource', 'Letter Request', 'Guest Visit', 'Inventory Request', 'View All']);
      assert.equal(await page.$eval('#workplaceOptionsOverlay', node => node.hidden), true);
      await page.click('[data-workplace-options-open]');
      assert.deepEqual(await page.$$eval('#workplaceAllOptions .admin-option-title', nodes => nodes.map(node => node.textContent.trim())), ['News', 'Book Resource', 'Letter Request', 'Guest Visit', 'Inventory Request', 'History', 'Policy/SOP', 'Asset Highlight']);
      assert.equal(await page.$eval('[data-workplace-options-open]', node => node.getAttribute('aria-expanded')), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'workplaceOptionsClose');
      assert.equal(await page.$eval('main', node => node.inert), true);
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.optionRef), 'asset-highlight');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'workplaceOptionsClose');
      assert.equal(await page.$eval('#workplaceAllOptions', node => node.scrollWidth > node.clientWidth), false);
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#workplaceOptionsOverlay', node => node.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-workplace-options-open')), true);
      assert.equal(await page.$eval('main', node => node.inert), false);
      await page.click('[data-workplace-options-open]');
      await page.click('#workplaceOptionsClose');
      assert.equal(await page.$eval('[data-workplace-options-open]', node => node.getAttribute('aria-expanded')), 'false');
      assert.equal(await page.$eval('#workplacePendingApprovalLink .team-pending-approval-title', node => node.textContent), 'Pending Approval');
      assert.equal(new URL(await page.$eval('#workplacePendingApprovalLink', node => node.href)).searchParams.get('theme'), theme);
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.textContent), '2', 'Dashboard totals Guest Visit and Inventory approvals');
      assert.equal(await page.$eval('#workplacePendingApprovalLink', node => node.getAttribute('aria-label')), 'Pending Approval: 2 requests awaiting review');
      await page.goto(page.url() + '&scope=team', { waitUntil: 'domcontentloaded' });
      assert.ok(await page.$eval('#workplaceDocumentStatus', node => node.getClientRects().length), 'Older Team links open the Workplace dashboard');
      assert.deepEqual(await page.$$eval('[data-document-status] strong', nodes => nodes.map(node => node.textContent)), counts);
      assert.equal(await page.evaluate(() => localStorage.getItem('peoplehcm:workplace:history:v1')), stored);
      assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth), false);
      assert.ok(await page.$$eval('main a', nodes => nodes.every(node => new URL(node.href).searchParams.get('theme') === document.documentElement.dataset.theme)));
      for (const [selector, title] of [
        ['[data-option-id="policy-sop"]', 'Policy/SOP'],
        ['[data-option-id="history"]', 'Guest Visit History'],
        ['[data-option-id="inventory-request"]', 'Inventory Request'],
        ['[data-option-id="asset-highlight"]', 'Asset Highlight'],
        ['#workplacePendingApprovalLink', 'Pending Approval']
      ]) {
        const inAllOptions = /policy-sop|"history"|asset-highlight/.test(selector);
        if (inAllOptions) await page.click('[data-workplace-options-open]');
        const target = inAllOptions ? selector.replace('data-option-id', 'data-option-ref') : selector;
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(target)]);
        assert.equal(await page.$eval('.admin-heading h1', node => node.textContent), title);
        assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
        assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth), false);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-admin-back]')]);
        assert.ok(await page.$eval('#workplaceQuickOptions', node => node.getClientRects().length), 'Options return to the Workplace dashboard');
      }
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#workplacePendingApprovalLink')]);
      await page.click('#workplacePendingQueue .workplace-approval-review');
      await page.click('#workplaceApprovalDetails [data-approval-action="approve"]');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.textContent), '1', 'Browser Back refreshes the total after approval');
      assert.equal(await page.$eval('#workplacePendingApprovalLink', node => node.getAttribute('aria-label')), 'Pending Approval: 1 request awaiting review');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#workplacePendingApprovalLink')]);
      await page.click('[data-workplace-tab="inventory"]');
      await page.click('#workplacePendingQueue [data-approval-action="reject"]');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-admin-back]')]);
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.textContent), '0', 'Keep a visible zero when no approvals remain');
      assert.ok(await page.$eval('#workplacePendingApprovalCount', node => node.getClientRects().length));
      await page.evaluate(() => {
        const key = 'peoplehcm:workplace:pending-approval:v1';
        localStorage.setItem(key, '{bad');
        window.dispatchEvent(new StorageEvent('storage', { key }));
      });
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.textContent), '—', 'Unreadable data must not show a false zero');
      await page.evaluate(() => {
        const key = 'peoplehcm:workplace:pending-approval:v1';
        localStorage.removeItem(key);
        window.dispatchEvent(new StorageEvent('storage', { key }));
      });
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.textContent), '2', 'Storage changes refresh the count');
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.hasAttribute('title')), false);
      assert.deepEqual(errors, []);
      console.log(`PASS: Workplace actions, live pending count, eight-option sheet, legacy Team links and return navigation, ${theme}, ${width}px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
