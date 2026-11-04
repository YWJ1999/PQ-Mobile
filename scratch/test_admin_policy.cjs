const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve('modules/admin/options/policy-sop.html')).href;
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'load' });
      assert.ok(await page.$('#policyList .policy-card'), 'Policy option must display the reference document');
      assert.match(await page.$eval('#policyList', n => n.textContent), /CHECK TITLE/);
      assert.equal(await page.$eval('.policy-file-count', n => n.textContent), '3 files');
      assert.deepEqual(await page.$$eval('.policy-card:first-child .policy-card-document h4', nodes => nodes.map(n => n.textContent)), ['Policy', 'SOP', 'Guideline']);
      assert.ok(await page.$('.policy-card-title-link'), 'The policy title must open its document');
      const catalog = await page.$$eval('.policy-card', cards => cards.map(card => [
        new URL(card.querySelector('a').href).searchParams.get('policy'),
        card.querySelector('h3').textContent,
        [...card.querySelectorAll('.policy-card-document h4')].map(b => b.textContent),
        card.querySelector('.policy-file-count').textContent
      ]).sort());
      await page.goto(new URL('../../../company-updates.html?type=policy&theme=' + theme, url).href);
      const updates = await page.$$eval('.updates-entry[data-policy]', cards => cards.map(card => [
        card.dataset.policy, card.querySelector('strong').textContent,
        [...card.querySelectorAll('.policy-document-badge')].map(b => b.textContent),
        card.querySelector('.policy-summary').lastElementChild.textContent.split(' · ')[0]
      ]).sort());
      assert.deepEqual(updates, catalog, 'Company Updates must list the same policies and attachments as Workplace');
      await page.goto(new URL('../../../home' + theme + '.html', url).href);
      const home = await page.$eval('.update-card[data-category="policy"]', card => [
        new URL(card.href).searchParams.get('policy'), card.querySelector('.update-title').textContent,
        [...card.querySelectorAll('.policy-document-badge')].map(b => b.textContent),
        card.querySelector('.policy-summary').lastElementChild.textContent.split(' · ')[0]
      ]);
      assert.deepEqual(home, catalog.find(([ref]) => ref === home[0]));
      await page.goto(url + '?theme=' + theme);
      // Wait for the shared 300ms theme transition before taking the initial screenshot.
      await page.evaluate(() => Promise.all([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 350))]));
      await page.screenshot({ path: `scratch/admin_policy_${theme}.png` });
      await page.click('#policyFilterTrigger');
      assert.equal(await page.$eval('#policyFilterModal', n => n.getAttribute('aria-hidden')), 'false');
      await page.type('#policyReference', 'not-a-reference');
      await page.click('#applyPolicyFilter');
      assert.ok(await page.$eval('#policyEmptyState', n => !n.hidden), 'Unmatched reference must show an empty state');
      await page.click('#policyFilterTrigger');
      await page.click('#resetPolicyFilter');
      await page.$eval('#policyFrom', n => { n.value = '2025-01-01'; });
      await page.$eval('#policyTo', n => { n.value = '2024-01-01'; });
      await page.click('#applyPolicyFilter');
      assert.ok(await page.$eval('#policyFilterError', n => !n.hidden), 'Reversed date range must be rejected');
      await page.click('#resetPolicyFilter');
      await page.type('#policyReference', 'DE001');
      await page.$eval('#sopFrom', n => { n.value = '2025-01-01'; });
      await page.click('#applyPolicyFilter');
      assert.ok(await page.$eval('#policyEmptyState', n => !n.hidden), 'An earlier SOP cannot match an explicit SOP date filter');
      await page.click('#policyFilterTrigger');
      await page.click('#resetPolicyFilter');
      await page.type('#policyTitle', 'check');
      await page.select('#policyDepartment', 'ADMINISTRATION');
      await page.$eval('#policyFrom', n => { n.value = '2024-12-20'; });
      await page.$eval('#policyTo', n => { n.value = '2024-12-20'; });
      await page.click('#applyPolicyFilter');
      assert.equal(await page.$$('#policyList .policy-card').then(n => n.length), 1, 'Title, department and inclusive WEF filters must match');
      await page.click('#policyFilterTrigger');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'policyFilterTrigger');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1), 'Policy list must fit mobile widths');
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.screenshot({ path: `scratch/admin_policy_filtered_${theme}.png` });
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('.policy-card-title-link')]);
      assert.equal(new URL(page.url()).searchParams.get('policy'), 'DE001');
      assert.equal(await page.$eval('html', n => n.dataset.theme), theme);
      assert.equal(await page.$eval('.document-info h3', n => n.textContent), 'PeopleTime_UserGuide_v2.pdf');
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('.document-open')]);
      await page.waitForSelector('#pdfNativeReader:not([hidden])');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1), 'PDF preview must fit mobile widths');
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.screenshot({ path: `scratch/admin_policy_pdf_${theme}.png` });
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#updatesBack')]);
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#updatesBack')]);
      assert.equal(await page.$eval('html', n => n.dataset.theme), theme);
      await page.click('#policyFilterTrigger');
      assert.equal(await page.$eval('#policyTitle', n => n.value), 'check', 'Returning from PDF must preserve filters');
      await page.screenshot({ path: `scratch/admin_policy_filter_${theme}.png` });
      await page.keyboard.press('Escape');
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('[data-admin-back]')]);
      assert.match(page.url(), /admin\/index.html/);
      assert.equal(await page.$eval('html', n => n.dataset.theme), theme);
    }
    await page.goto(pathToFileURL(path.resolve('modules/admin/options/policy-document.html')).href + '?document=missing', { waitUntil: 'load' });
    assert.ok(await page.$eval('#policyDocumentUnavailable', n => !n.hidden), 'Unknown document must show an unavailable state');
    assert.deepEqual(errors, []);
    console.log('PASS: Policy reference card, filters, date validation, SOP date filtering, details and PDF navigation, preserved filters, unavailable document, both themes and mobile widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
