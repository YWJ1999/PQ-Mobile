const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const index = pathToFileURL(path.join(__dirname, '../modules/training-competency/index.html')).href;
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 420, height: 940 });
    await page.goto(`${index}?scope=team&theme=light`, { waitUntil: 'load' });
    const initialUrl = page.url();
    const initialScroll = await page.$eval('main', node => { node.scrollTop = 80; return node.scrollTop; });
    await page.click('[data-expired-competency="first-aid"]');
    assert.equal(page.url(), initialUrl, 'Opening a competency displays a popup without navigating away from the dashboard');
    assert.equal(await page.$eval('#trainingExpiredOverlay', node => node.hidden), false);
    assert.equal(await page.$eval('#trainingCompetencyTeamPanel', node => node.hidden), false, 'Dashboard remains behind the popup');
    assert.equal(await page.$eval('main', node => node.inert), true);
    assert.equal(await page.$eval('#trainingExpiredDetail', node => node.getAttribute('aria-modal')), 'true');
    assert.equal(await page.$eval('#trainingExpiredDetailTitle', node => node.textContent), 'First Aid');
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 4);
    assert.equal(await page.$eval('.tec-employee-name', node => node.textContent), 'E001234 - Ahmad Faizal');
    assert.equal(await page.$$('.tec-summary .fa-chevron-right, .tec-employee-card .fa-chevron-right').then(nodes => nodes.length), 0, 'Cards do not show chevrons');
    await page.click('[data-expired-level="2"]');
    assert.equal(page.url(), initialUrl);
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 2);
    assert.equal(await page.$eval('[data-expired-level="2"]', node => node.getAttribute('aria-current')), 'true');
    await page.focus('#trainingExpiredClose');
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    assert.ok(await page.$eval('#trainingExpiredDetail', node => node.contains(document.activeElement)), 'Focus stays inside the popup');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#trainingExpiredOverlay', node => node.hidden), true);
    assert.equal(await page.$eval('main', node => node.inert), false);
    assert.equal(await page.$eval('main', node => node.scrollTop), initialScroll, 'Closing retains the dashboard scroll position');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.expiredCompetency), 'first-aid');
    await page.click('[data-expired-competency="forklift-operation"]');
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 3);
    await page.click('#trainingExpiredClose');
    assert.equal(await page.$eval('#trainingExpiredOverlay', node => node.hidden), true);
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 940 });
      await page.goto(`${index}?scope=team&theme=${theme}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(__dirname, `training-expired-cards-${theme}-${width}.png`) });
      await page.click('[data-expired-competency="first-aid"]');
      const dimensions = await page.$eval('#trainingExpiredDetail', node => { const rect = node.getBoundingClientRect(), phone = document.querySelector('.phone-container').getBoundingClientRect(); return { fits: rect.left >= phone.left && rect.right <= phone.right + 1 && rect.top >= phone.top && rect.bottom <= phone.bottom + 1, overflow: node.scrollWidth > node.clientWidth + 1 }; });
      assert.equal(dimensions.fits, true); assert.equal(dimensions.overflow, false);
      await page.screenshot({ path: path.join(__dirname, `training-expired-popup-${theme}-${width}.png`) });
      const backdrop = await page.$eval('#trainingExpiredOverlay', node => { const rect = node.getBoundingClientRect(); return { x: rect.left + 6, y: rect.top + rect.height / 2 }; });
      await page.mouse.click(backdrop.x, backdrop.y);
      assert.equal(await page.$eval('#trainingExpiredOverlay', node => node.hidden), true, 'Backdrop closes the popup');
      const geometry = await page.evaluate(() => ({ scroll: document.querySelector('.phone-container').scrollTop,
        navBottom: document.querySelector('.bottom-nav').getBoundingClientRect().bottom, phoneBottom: document.querySelector('.phone-container').getBoundingClientRect().bottom }));
      assert.equal(geometry.scroll, 0); assert.ok(Math.abs(geometry.navBottom - geometry.phoneBottom) <= 1);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: in-place expired competency popup, level filtering, close/Escape/backdrop, focus containment/restoration, arrow-free cards and mobile themes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
