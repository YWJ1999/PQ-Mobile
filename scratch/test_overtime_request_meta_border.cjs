const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '..', 'modules/attendance/options/overtime.html')).href;
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const viewports = [320, 360, 390, 420];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const theme of ['light', 'dark']) {
      for (const width of viewports) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(`${pageUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });
        await page.click('#overtimeAddRequest');

        const summary = await page.evaluate(() => {
          const form = document.getElementById('otRequestForm');
          const sides = ['Top', 'Right', 'Bottom', 'Left'];
          return {
            header: document.getElementById('headerTitle').textContent.trim(),
            inputBorderColor: getComputedStyle(form.querySelector('.modern-input')).borderTopColor,
            cards: Array.from(form.querySelectorAll('.ot-form-meta'), card => {
              const style = getComputedStyle(card);
              const rect = card.getBoundingClientRect();
              return {
                label: card.querySelector('dt').textContent.trim(),
                value: card.querySelector('dd').textContent.trim(),
                top: rect.top,
                bottom: rect.bottom,
                borders: sides.map(side => style[`border${side}`]),
                borderRadius: parseFloat(style.borderTopLeftRadius),
                padding: sides.map(side => parseFloat(style[`padding${side}`])),
                overflow: card.scrollWidth - card.clientWidth,
                contentContained: Array.from(card.children).every(child => {
                  const box = child.getBoundingClientRect();
                  return box.left >= rect.left && box.right <= rect.right
                    && box.top >= rect.top && box.bottom <= rect.bottom;
                })
              };
            })
          };
        });

        assert.equal(summary.header, 'Request OT');
        assert.deepEqual(summary.cards.map(card => [card.label, card.value]), [
          ['Shift', '8.30AM - 5.30PM (W01)'],
          ['Supervisor', 'EBB04']
        ]);
        assert.ok(summary.cards[0].bottom < summary.cards[1].top, `${theme} ${width}px: the two cards have a visible gap`);
        for (const card of summary.cards) {
          const context = `${theme} ${width}px ${card.label}`;
          assert.deepEqual(card.borders, Array(4).fill(`1px solid ${summary.inputBorderColor}`), `${context}: full border matches form controls`);
          assert.ok(card.borderRadius >= 16, `${context}: rounded corners`);
          assert.ok(card.padding.every(value => value >= 14), `${context}: card padding`);
          assert.ok(card.overflow <= 1 && card.contentContained, `${context}: contents fit inside the card`);
        }
      }
    }

    assert.deepEqual(pageErrors, [], 'Request OT summary renders without page errors');
    console.log('PASS: Request OT shows separate Shift and Supervisor cards at all four mobile widths in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
