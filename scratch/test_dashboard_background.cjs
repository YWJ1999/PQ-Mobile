const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

async function waitForFade(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector('.dashboard-page > .main-content');
    const intro = main.querySelector(main.parentElement.dataset.dashboardIntro || '.insights-card, .shortcuts-grid');
    const prefix = main.closest('.dashboard-home') ? 'home' : 'apps';
    const end = parseFloat(getComputedStyle(main).getPropertyValue('--' + prefix + '-fade-end'));
    return Math.abs(end - (intro.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop + 8)) < 1;
  });
}

async function checkHomeEdge(page) {
  const bounds = await page.$eval('.greeting-header-box', async greeting => {
    const phone = greeting.closest('.phone-container');
    // The drawer's closing transition briefly tints the page beneath it.
    const transitions = phone.getAnimations({ subtree: true }).filter(animation => animation instanceof CSSTransition);
    await Promise.allSettled(transitions.map(transition => transition.finished));
    const { left, right, top, bottom } = greeting.getBoundingClientRect();
    const surface = getComputedStyle(phone).backgroundColor;
    return {
      left, right, top, bottom,
      subtitleBottom: greeting.querySelector('.greeting-sub').getBoundingClientRect().bottom,
      surface: surface.match(/\d+/g).slice(0, 3).map(Number),
      corner: parseFloat(getComputedStyle(greeting).borderBottomLeftRadius)
    };
  });
  // A full viewport capture preserves the pixel alignment of the centered desktop preview.
  const screenshot = await page.screenshot({ encoding: 'base64' });
  const levels = await page.evaluate(async (source, bounds) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + source;
    await image.decode();
    const { width, height } = image;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    const scaleX = width / innerWidth;
    const scaleY = height / innerHeight;
    const center = (bounds.left + bounds.right) / 2;
    function distanceToPage(x, y) {
      const sample = (Math.round(y * scaleY) * width + Math.round(x * scaleX)) * 4;
      return Math.max(...bounds.surface.map((value, channel) => Math.abs(pixels[sample + channel] - value)));
    }
    function lineContrast(x, y, dx, dy) {
      const stride = 4 * (dy * width + dx);
      let peak = 0;
      for (let offset = -2; offset <= 2; offset++) {
        const sample = (y * width + x) * 4 + offset * stride;
        for (let channel = 0; channel < 3; channel++) {
          const i = sample + channel;
          const neighbours = (pixels[i - 2 * stride] + pixels[i + 2 * stride]) / 2;
          peak = Math.max(peak, Math.abs(pixels[i] - neighbours));
        }
      }
      return peak;
    }
    // Sample outside the antialiased outline on both sides of the quarter circles.
    const { left, right, bottom, corner } = bounds;
    const outside = [distanceToPage(center, bottom + 3)];
    for (const inset of [3, 8, 16]) {
      const outsideY = bottom - corner + Math.sqrt((corner + 3) ** 2 - (corner - inset) ** 2);
      outside.push(distanceToPage(left + inset, outsideY), distanceToPage(right - inset, outsideY));
    }
    const midY = Math.round((bounds.subtitleBottom + bottom) / 2 * scaleY);
    return {
      artworkAtEdge: distanceToPage(center, bottom - 3) / distanceToPage(center, bounds.subtitleBottom + 2),
      outside: Math.max(...outside),
      topLine: lineContrast(Math.round(center * scaleX), Math.round(bounds.top * scaleY), 0, 1),
      leftLine: lineContrast(Math.round((left + corner) * scaleX), midY, 1, 0),
      rightLine: lineContrast(Math.round((right - corner) * scaleX), midY, 1, 0)
    };
  }, screenshot, bounds);
  assert.ok(levels.artworkAtEdge > .85, 'Home artwork stays purple up to the lower edge');
  assert.ok(levels.outside <= 1, 'Both corners and the area below the header match the page background');
  assert.ok(Math.max(levels.topLine, levels.leftLine, levels.rightLine) < 8, 'Home greeting has no hairline seams: ' + JSON.stringify(levels));
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
        if (isHome) await checkHomeEdge(page);
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
              const main = node.getBoundingClientRect();
              const greeting = node.querySelector('.greeting-header-box');
              const edge = greeting.getBoundingClientRect();
              const corners = getComputedStyle(greeting);
              const origin = main.top - node.scrollTop;
              const fadeStart = origin + parseFloat(style.getPropertyValue('--home-fade-start'));
              const canvasTop = origin + parseFloat(style.getPropertyValue('--home-fade-end'));
              const sections = node.querySelectorAll('.home-overview > *, :scope > .section-header, :scope > .updates-list');
              return {
                local: style.backgroundAttachment === 'local',
                fullWidth: Math.abs(edge.left - main.left) < 1 && Math.abs(edge.right - main.right) < 1,
                radii: [corners.borderBottomLeftRadius, corners.borderBottomRightRadius],
                edgeBelowGreeting: edge.bottom > greeting.querySelector('.greeting-sub').getBoundingClientRect().bottom,
                artworkReachesEdge: fadeStart >= edge.bottom,
                feedOnPlainCanvas: Array.from(sections).every(section => section.getBoundingClientRect().top > canvasTop)
              };
            });
            assert.deepEqual(canvas, {
              local: true, fullWidth: true, radii: ['24px', '24px'], edgeBelowGreeting: true, artworkReachesEdge: true, feedOnPlainCanvas: true
            }, file + ': rounded greeting above the feed');
          }
        }
        await page.click('.burger-btn');
        assert.equal(await page.$eval('#profileDrawerOverlay', node => node.classList.contains('active')), true);
        await page.locator('#profileDrawerOverlay .drawer-close-btn').click();
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
          await page.$eval('.main-content', node => { node.scrollTop = 0; });
          await page.waitForFunction(() => !document.querySelector('.dashboard-home').classList.contains('is-header-compact'));
          await waitForFade(page);
          const previousEnd = await page.$eval('.dashboard-home', node => parseFloat(node.style.getPropertyValue('--home-fade-end')));
          await page.$eval('.greeting-sub', node => { node.style.minHeight = (node.getBoundingClientRect().height + 40) + 'px'; });
          await waitForFade(page);
          assert.ok(await page.$eval('.dashboard-home', node => parseFloat(node.style.getPropertyValue('--home-fade-end'))) > previousEnd);
          await page.$eval('.greeting-sub', node => { node.style.removeProperty('min-height'); });
          await waitForFade(page);
        }
        await page.$eval('.main-content', node => { node.scrollTop = 0; });
        console.log('PASS ' + file + ' ' + width + 'px: compact toolbar, menu access, stationary artwork and mobile layout');
      }
      if (isHome) {
        await page.setViewport({ width: 1005, height: 900, deviceScaleFactor: .9375 });
        await waitForFade(page);
        await checkHomeEdge(page);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
