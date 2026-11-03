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
      const individual = '#workplaceTabIndividual';
      const team = '#workplaceTabTeam';
      assert.ok(await page.$(individual), 'Workplace must offer an Individual / Team switch');
      const counts = await page.$$eval('[data-document-status] strong', nodes => nodes.map(node => node.textContent));
      const stored = await page.evaluate(() => localStorage.getItem('peoplehcm:workplace:history:v1'));
      assert.deepEqual(await page.$$eval('#workplaceIndividualPanel > section .admin-options > .admin-option .admin-option-title', nodes => nodes.map(node => node.textContent.trim())), ['News', 'Book Resource', 'Letter Request', 'Guest Visit', 'Inventory Request', 'History', 'Policy/SOP']);
      assert.equal(await page.$('[data-workplace-options-open]'), null);
      assert.equal(await page.$('#workplaceOptionsDialog'), null);
      assert.equal(await page.$eval(individual, node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('#workplaceIndividualPanel', node => node.hidden), false);
      await page.screenshot({ path: path.resolve(__dirname, `workplace-individual-${theme}-${width}.png`) });
      await page.click(team);
      assert.equal(await page.$eval(team, node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval(individual, node => node.tabIndex), -1);
      assert.equal(await page.$eval('#workplaceIndividualPanel', node => node.hidden), true);
      assert.equal(await page.$eval('#workplaceTeamPanel', node => node.hidden), false);
      assert.deepEqual(await page.$$eval('#workplaceTeamPanel .admin-option-title', nodes => nodes.map(node => node.textContent)), ['Asset Highlight']);
      assert.equal(await page.$eval('#workplaceTeamPendingApproval .team-pending-approval-title', node => node.textContent), 'Pending Approval');
      assert.equal(new URL(await page.$eval('#workplaceTeamPendingApproval', node => node.href)).searchParams.get('theme'), theme);
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
        ['team', '[data-option-id="asset-highlight"]', 'Asset Highlight'],
        ['team', '#workplaceTeamPendingApproval', 'Pending Approval']
      ]) {
        await page.click(scope === 'team' ? team : individual);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(selector)]);
        assert.equal(await page.$eval('.admin-heading h1', node => node.textContent), title);
        assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
        assert.equal(await page.$eval('main', node => node.scrollWidth > node.clientWidth), false);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-admin-back]')]);
        assert.equal(await page.$eval(scope === 'team' ? team : individual, node => node.getAttribute('aria-selected')), 'true', 'New options must return to their own scope');
      }
      assert.deepEqual(errors, []);
      console.log(`PASS: Workplace scope switching, seven-option landing grid and direct History navigation, ${theme}, ${width}px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
