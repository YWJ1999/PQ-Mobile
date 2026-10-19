const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Keep verification independent of external fonts and icons being online.
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith('http') ? request.abort() : request.continue());
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 900 });
        await page.goto(pathToFileURL(path.resolve('me.html')).href + '?theme=' + theme, { waitUntil: 'load' });
        await page.waitForSelector('.profile-collapse-toggle');
        const panels = await page.$$('.profile-panel');
        assert.equal(await page.$$('.profile-collapse-toggle').then(nodes => nodes.length), panels.length);
        for (const panel of panels) {
          const state = await panel.evaluate(node => {
            const button = node.querySelector('.profile-collapse-toggle');
            return { expanded: button.getAttribute('aria-expanded'), linked: document.getElementById(button.getAttribute('aria-controls')) === node.querySelector('.profile-collapse-body') };
          });
          assert.deepEqual(state, { expanded: 'true', linked: true });
          await panel.$eval('.profile-collapse-toggle', node => node.click());
        }
        await page.waitForFunction(() => [...document.querySelectorAll('.profile-collapse-body')].every(node => node.getBoundingClientRect().height < 1));
        assert.equal(await page.$$eval('.profile-collapse-body', nodes => nodes.every(node => node.inert)), true);
        assert.equal(await page.$eval('.profile-group-personal-details .profile-collapse-toggle > i', node => getComputedStyle(node).transform), 'matrix(-1, 0, 0, -1, 0, 0)');
        await page.$eval('#profile-tab-bento-personal', node => node.click());
        const button = await page.$('.profile-group-personal-details .profile-collapse-toggle');
        await button.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('.profile-group-personal-details .profile-collapse-body').getBoundingClientRect().height > 100);
        await page.waitForFunction(() => !document.querySelector('.profile-group-personal-details .profile-collapse-body').getAnimations().length);
        const openHeight = await page.$eval('.profile-group-personal-details .profile-collapse-body', node => node.getBoundingClientRect().height);
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 100));
        const midHeight = await page.$eval('.profile-group-personal-details .profile-collapse-body', node => node.getBoundingClientRect().height);
        assert.ok(midHeight > 0 && midHeight < openHeight, 'Collapse must animate between open and closed heights');
        // Rapid taps should reverse an ongoing animation and leave the correct state.
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !document.querySelector('.profile-group-personal-details .profile-collapse-body').getAnimations().length);
        assert.equal(await button.evaluate(node => node.getAttribute('aria-expanded')), 'true');
        assert.equal(await page.$eval('.profile-group-family-status .profile-collapse-toggle', node => node.getAttribute('aria-expanded')), 'false');
        await page.screenshot({ path: 'scratch/profile-collapse-' + theme + '-' + width + '.png' });
        await page.$eval('#profile-tab-all', node => node.click());
        for (const panel of panels) await panel.$eval('.profile-collapse-toggle', node => { if (node.getAttribute('aria-expanded') === 'false') node.click(); });
        await page.waitForFunction(() => [...document.querySelectorAll('.profile-collapse-body')].every(node => !node.getAnimations().length));
        await page.$eval('#dossierTrainingSearch', node => { node.value = 'PROCESS IMPROVEMENT'; node.dispatchEvent(new Event('input', { bubbles: true })); });
        assert.equal(await page.$$('#dossierTrainingList article').then(nodes => nodes.length), 5);
        await page.$eval('.profile-account-toggle', node => node.click());
        assert.equal(await page.$eval('#cimbNumDisplay', node => node.dataset.masked), 'false');
        assert.equal(await page.$eval('#meMainScroll', node => node.scrollWidth <= node.clientWidth), true);
        console.log(`PASS: ${theme} ${width}px, ${panels.length} cards, keyboard, animation, reversal, search, masking and no horizontal overflow`);
      }
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.$eval('.profile-group-personal-details .profile-collapse-toggle', node => node.click());
    assert.equal(await page.$eval('.profile-group-personal-details .profile-collapse-body', node => node.getBoundingClientRect().height), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: reduced motion and no page errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
