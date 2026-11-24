const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pages = [
  ...fs.readdirSync(root).filter(name => name.endsWith('.html')),
  ...fs.readdirSync(path.join(root, 'modules'), { recursive: true })
    .filter(name => name.endsWith('.html')).map(name => path.join('modules', name))
].sort();

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 850 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    page.on('dialog', dialog => dialog.dismiss());
    const failures = [];
    let iconCount = 0;
    for (const file of pages) {
      const url = pathToFileURL(path.join(root, file));
      await page.goto(url.href, { waitUntil: 'load' });
      await page.waitForFunction(() => Boolean(window.PeopleHcmIcons));
      const result = await page.evaluate(async () => {
        const styles = ['900 12px "Font Awesome 6 Free"', '400 12px "Font Awesome 6 Free"', '400 12px "Font Awesome 6 Brands"'];
        for (const style of styles) {
          const faces = await document.fonts.load(style);
          if (!faces.length) throw new Error('Missing bundled font ' + style);
        }
        const icons = [...document.querySelectorAll('i.fa-solid, i.fa-regular, i.fa-brands')]
          .filter(icon => icon.getClientRects().length && getComputedStyle(icon).visibility === 'visible');
        const missing = icons.filter(icon => {
          const glyph = getComputedStyle(icon, '::before');
          return !glyph.fontFamily.includes('Font Awesome') || ['none', 'normal', '""'].includes(glyph.content) ||
            !icon.getBoundingClientRect().width;
        }).map(icon => icon.className);
        return { count: icons.length, missing: [...new Set(missing)] };
      });
      iconCount += result.count;
      if (result.missing.length) failures.push(file + ' — ' + result.missing.join(', '));
    }
    assert.deepEqual(failures, [], failures.join('\n'));
    console.log('PASS: ' + iconCount + ' visible icons across ' + pages.length + ' app entry points with external requests blocked.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
