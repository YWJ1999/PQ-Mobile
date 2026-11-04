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
      const individual = '#workplaceTabIndividual';
      const team = '#workplaceTabTeam';
      assert.ok(await page.$(individual), 'Workplace must offer an Individual / Team switch');
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
      assert.equal(await page.$eval(individual, node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('#workplaceIndividualPanel', node => node.hidden), false);
      assert.equal(await page.$eval('#workplaceIndividualPanel #workplacePendingApprovalLink .team-pending-approval-title', node => node.textContent), 'Pending Approval');
      assert.equal(new URL(await page.$eval('#workplacePendingApprovalLink', node => node.href)).searchParams.get('theme'), theme);
      assert.equal(await page.$eval('#workplacePendingApprovalCount', node => node.textContent), '2', 'Dashboard totals Guest Visit and Inventory approvals');
      assert.equal(await page.$eval('#workplacePendingApprovalLink', node => node.getAttribute('aria-label')), 'Pending Approval: 2 requests awaiting review');
      await page.screenshot({ path: path.resolve(__dirname, `workplace-individual-${theme}-${width}.png`) });
      await page.click(team);
      assert.equal(await page.$eval(team, node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval(individual, node => node.tabIndex), -1);
      assert.equal(await page.$eval('#workplaceIndividualPanel', node => node.hidden), true);
      assert.equal(await page.$eval('#workplaceTeamPanel', node => node.hidden), false);
      assert.equal(await page.$eval('#workplaceTeamPanel', node => node.childElementCount), 0, 'Team must remain empty');
      assert.equal(await page.$eval('#workplaceTeamPanel', node => node.textContent.trim()), '');
      await page.screenshot({ path: path.resolve(__dirname, `workplace-team-${theme}-${width}.png`) });
      assert.equal(await page.$eval('#workplaceDocumentStatus', node => node.getClientRects().length), 0, 'My Document Status is personal');
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'team');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval(team, node => node.getAttribute('aria-selected')), 'true');
      await page.focus(team);
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'workplaceTabIndividual');
      assert.equal(await page.$eval(individual, node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('#workplaceIndividualPanel', node => node.hidden), false);
      assert.deepEqual(await page.$$eval('[data-document-status] strong', nodes => nodes.map(node => node.textContent)), counts);
      assert.equal(await page.evaluate(() => localStorage.getItem('peoplehcm:workplace:history:v1')), stored);
      assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth), false);
      assert.ok(await page.$$eval('#workplaceIndividualPanel a', nodes => nodes.every(node => new URL(node.href).searchParams.get('theme') === document.documentElement.dataset.theme)));
      for (const [scope, selector, title] of [
        ['individual', '[data-option-id="policy-sop"]', 'Policy/SOP'],
        ['individual', '[data-option-id="history"]', 'Guest Visit History'],
        ['individual', '[data-option-id="inventory-request"]', 'Inventory Request'],
        ['individual', '[data-option-id="asset-highlight"]', 'Asset Highlight'],
        ['individual', '#workplacePendingApprovalLink', 'Pending Approval']
      ]) {
        await page.click(scope === 'team' ? team : individual);
        const inAllOptions = /policy-sop|"history"|asset-highlight/.test(selector);
        if (inAllOptions) await page.click('[data-workplace-options-open]');
        const target = inAllOptions ? selector.replace('data-option-id', 'data-option-ref') : selector;
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(target)]);
        assert.equal(await page.$eval('.admin-heading h1', node => node.textContent), title);
        assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
        assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth), false);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-admin-back]')]);
        assert.equal(await page.$eval(scope === 'team' ? team : individual, node => node.getAttribute('aria-selected')), 'true', 'New options must return to their own scope');
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
      console.log(`PASS: Workplace Individual actions, live pending count, eight-option sheet, empty Team tab and return navigation, ${theme}, ${width}px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
