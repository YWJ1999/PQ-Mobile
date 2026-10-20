const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

async function waitForFade(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector('.dashboard-page > .main-content');
    const card = main.querySelector('.insights-card, .shortcuts-grid');
    const prefix = main.closest('.dashboard-home') ? 'home' : 'apps';
    const end = parseFloat(getComputedStyle(main).getPropertyValue('--' + prefix + '-fade-end'));
    return Math.abs(end - (card.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop + 8)) < 1;
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const file of ['applight', 'appdark', 'homelight', 'homedark']) {
      const isHome = file.startsWith('home');
      await page.goto(pathToFileURL(path.resolve(file + '.html')).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 420]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await page.$eval('.main-content', node => { node.scrollTop = 0; });
        await page.waitForFunction(() => !document.querySelector('.dashboard-page').classList.contains('is-header-compact'));
        await waitForFade(page);
        const before = await page.$eval('.hero-bg', node => ({
          top: node.getBoundingClientRect().top,
          height: node.getBoundingClientRect().height,
          position: getComputedStyle(node).backgroundPosition,
          transform: getComputedStyle(node).transform
        }));
        assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);
        for (const scroll of [0, 240, 2000]) {
          await page.$eval('.main-content', (node, value) => { node.scrollTop = value; }, scroll);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await page.waitForFunction(compact => document.querySelector('.dashboard-page').classList.contains('is-header-compact') === compact, {}, scroll > 0);
          const toolbar = await page.$eval('.dashboard-page > app-header', node => {
            const main = document.querySelector('.main-content');
            return {
              height: node.getBoundingClientRect().height,
              joinsContent: Math.abs(node.getBoundingClientRect().bottom - main.getBoundingClientRect().top) < 1,
              background: getComputedStyle(node).backgroundColor,
              shadow: getComputedStyle(node).boxShadow !== 'none',
              subtitleOpacity: getComputedStyle(node.querySelector('.logo-text > span')).opacity,
              clipped: [...node.querySelectorAll('.burger-btn, .profile-img, .logo-text h1')].some(child => {
                const rect = child.getBoundingClientRect();
                const bounds = node.getBoundingClientRect();
                return rect.top < bounds.top || rect.bottom > bounds.bottom;
              })
            };
          });
          assert.deepEqual(toolbar, {
            height: scroll > 0 ? 56 : 58,
            joinsContent: true,
            background: scroll > 0 ? 'rgb(43, 16, 82)' : 'rgba(0, 0, 0, 0)',
            shadow: scroll > 0,
            subtitleOpacity: scroll > 0 ? '0' : '1',
            clipped: false
          }, file + ': compact toolbar stays above content');
          if (scroll > 0) {
            const balanced = await page.$eval('.app-header', node => {
              const bounds = node.getBoundingClientRect();
              const logo = node.querySelector('.logo-container').getBoundingClientRect();
              const menu = node.querySelector('.burger-btn').getBoundingClientRect();
              const avatar = node.querySelector('.profile-img').getBoundingClientRect();
              const status = document.querySelector('.status-bar > span').getBoundingClientRect();
              return Math.abs((logo.left + logo.right) / 2 - (bounds.left + bounds.right) / 2) < 1
                && Math.abs(menu.top - status.bottom - (bounds.bottom - menu.bottom)) < 1
                && Math.abs(menu.left - bounds.left - (bounds.right - avatar.right)) < 1
                && logo.left > menu.right && logo.right < avatar.left;
            });
            assert.equal(balanced, true, file + ': centered branding and symmetrical controls');
          }
          const after = await page.$eval('.hero-bg', node => ({
            top: node.getBoundingClientRect().top,
            height: node.getBoundingClientRect().height,
            position: getComputedStyle(node).backgroundPosition,
            transform: getComputedStyle(node).transform
          }));
          assert.deepEqual(after, before, file + ' artwork remains stationary');
          if (!isHome) {
            assert.equal(await page.$eval('.hero-bg', node => node.getBoundingClientRect().height === document.querySelector('.phone-container').clientHeight), true);
            assert.equal(await page.$eval('.main-content', node => {
              const end = parseFloat(getComputedStyle(node).getPropertyValue('--apps-fade-end'));
              return getComputedStyle(node).backgroundAttachment === 'local'
                && [...node.querySelectorAll('.recently-used-section, .explore-header')].every(section =>
                  section.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop > end);
            }), true, 'Apps sections remain on the plain canvas after the fade');
          } else {
            const canvas = await page.$eval('.main-content', node => {
              const style = getComputedStyle(node);
              const end = parseFloat(style.getPropertyValue('--home-fade-end'));
              const headings = [...node.querySelectorAll(':scope > .section-header')];
              return {
                local: style.backgroundAttachment === 'local',
                feedOnPlainCanvas: headings.every(heading => heading.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop > end),
                fadeLength: end - parseFloat(style.getPropertyValue('--home-fade-start'))
              };
            });
            assert.deepEqual(canvas, { local: true, feedOnPlainCanvas: true, fadeLength: 180 });
          }
        }
        await page.click('.burger-btn');
        assert.equal(await page.$eval('#profileDrawerOverlay', node => node.classList.contains('active')), true);
        await page.click('.drawer-close-btn');
        assert.equal(await page.$eval('#profileDrawerOverlay', node => node.classList.contains('active')), false);
        if (width === 420) {
          await page.$eval('.main-content', node => { node.scrollTop = 240; });
          await page.screenshot({ path: 'scratch/' + file + '-compact-header.png' });
        }
        if (isHome) {
          await page.$eval('.main-content', node => { node.scrollTop = 0; });
          await page.click('#pillTeam');
          await waitForFade(page);
          assert.equal(await page.$eval('#paneTeam', node => node.classList.contains('active')), true);
          await page.click('#pillMy');
          await waitForFade(page);
          const previousEnd = await page.$eval('.dashboard-home', node => parseFloat(node.style.getPropertyValue('--home-fade-end')));
          await page.$eval('.insights-card', node => { node.style.paddingBottom = '80px'; });
          await waitForFade(page);
          assert.ok(await page.$eval('.dashboard-home', node => parseFloat(node.style.getPropertyValue('--home-fade-end'))) > previousEnd);
          await page.$eval('.insights-card', node => { node.style.removeProperty('padding-bottom'); });
          await waitForFade(page);
        }
        await page.$eval('.main-content', node => { node.scrollTop = 0; });
        console.log('PASS ' + file + ' ' + width + 'px: compact toolbar, menu access, stationary artwork, fade and mobile layout');
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
