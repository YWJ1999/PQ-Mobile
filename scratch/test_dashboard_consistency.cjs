const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    for (const viewport of [{ width: 420, height: 844 }, { width: 320, height: 568 }, { width: 1000, height: 1100 }]) {
      await page.setViewport(viewport);
      let reference;
      for (const file of ['homelight.html', 'team.html', 'team-v2.html', 'light.html', 'no/home-v1.html', 'no/home-v2.html', 'no/homedark-v2.html', 'no/homelight-v2.html']) {
        await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
          const phone = document.querySelector('.dashboard-page');
          const main = phone.querySelector('.main-content');
          const intro = main.querySelector(phone.dataset.dashboardIntro || '.insights-card, .shortcuts-grid');
          return Math.abs(parseFloat(phone.style.getPropertyValue('--home-fade-end')) - (intro.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop + 8)) < 1;
        });
        const initial = await page.evaluate(() => {
          const phone = document.querySelector('.phone-container'), main = phone.querySelector('.main-content');
          const hero = phone.querySelector('.hero-bg');
          const end = parseFloat(phone.style.getPropertyValue('--home-fade-end'));
          return {
            phoneHeight: phone.getBoundingClientRect().height,
            phoneWidth: phone.getBoundingClientRect().width,
            top: phone.getBoundingClientRect().top,
            bottom: phone.getBoundingClientRect().bottom,
            mainOverflow: main.scrollWidth > main.clientWidth + 1,
            background: getComputedStyle(hero).backgroundImage.includes('hero-purple-frosted-glass.png'),
            hiddenArt: !hero.querySelector('svg') || getComputedStyle(hero.querySelector('svg')).display === 'none',
            heroHeight: hero.getBoundingClientRect().height,
            feedAfterFade: [...main.querySelectorAll(':scope > .section-header, :scope > .explore-header')].every(el => el.getBoundingClientRect().top - main.getBoundingClientRect().top > end),
            localFade: getComputedStyle(main).backgroundAttachment === 'local'
          };
        });
        if (file === 'homelight.html') reference = initial;
        assert.ok(Math.abs(initial.phoneHeight - reference.phoneHeight) < 2, file + ': same height as Home ' + JSON.stringify(initial));
        assert.equal(initial.phoneWidth, reference.phoneWidth);
        assert.ok(initial.top >= 0 && initial.bottom <= viewport.height + 1);
        if (initial.mainOverflow) console.log(await page.$eval('.main-content', main => [...main.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > main.getBoundingClientRect().right).map(el => ({ class: el.className, right: el.getBoundingClientRect().right })).slice(-16)));
        assert.equal(initial.mainOverflow, false, file + ': no horizontal content overflow');
        assert.equal(initial.background && initial.hiddenArt && initial.localFade && initial.feedAfterFade, true, file + ': consistent artwork and fade');
        if (viewport.width === 420) await page.screenshot({ path: 'scratch/' + file.replaceAll('/', '-').replace('.html', '') + '-updated-top.png' });
        const canCollapse = await page.$eval('.main-content', el => el.scrollHeight - el.clientHeight > 64);
        if (!canCollapse) {
          console.log('PASS ' + file + ' ' + viewport.width + 'x' + viewport.height + ' (content fits without scrolling)');
          continue;
        }
        await page.$eval('.main-content', el => { el.scrollTop = 240; });
        await page.waitForFunction(() => document.querySelector('.dashboard-page').classList.contains('is-header-compact'));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const compact = await page.evaluate(() => {
          const phone = document.querySelector('.phone-container');
          const header = phone.querySelector(':scope > app-header, :scope > .app-header');
          const status = phone.querySelector('.status-bar');
          const rect = header.getBoundingClientRect(), avatar = header.querySelector('.profile-img').getBoundingClientRect();
          return {
            height: rect.height,
            opaque: getComputedStyle(header).backgroundColor === 'rgb(43, 16, 82)',
            gap: Math.abs(avatar.top - status.querySelector('span').getBoundingClientRect().bottom - (rect.bottom - avatar.bottom)),
            heroHeight: phone.querySelector('.hero-bg').getBoundingClientRect().height,
            joinsContent: Math.abs(rect.bottom - phone.querySelector('.main-content').getBoundingClientRect().top) < 1
          };
        });
        assert.equal(compact.height, 56);
        assert.ok(compact.opaque && compact.joinsContent && compact.gap < 1, file + ': header spacing ' + JSON.stringify(compact));
        assert.equal(compact.heroHeight, initial.heroHeight, 'artwork remains stationary');
        if (viewport.width === 420) await page.screenshot({ path: 'scratch/' + file.replaceAll('/', '-').replace('.html', '') + '-updated-scroll.png' });
        await page.$eval('.main-content', el => { el.scrollTop = el.scrollHeight; });
        const bottomReached = await page.$eval('.main-content', el => el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
        assert.ok(bottomReached);
        await page.$eval('.main-content', el => { el.scrollTop = 0; });
        await page.waitForFunction(() => !document.querySelector('.dashboard-page').classList.contains('is-header-compact'));
        console.log('PASS ' + file + ' ' + viewport.width + 'x' + viewport.height);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
