const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/attendance.html'));
const referenceUrl = new URL('../../claims/options/history.html', url);
const trigger = '.attendance-header-row button[aria-label="Attendance card legend"]';
const dialog = '#recordColourLegend';

function legendLayout(panel) {
  const bounds = panel.getBoundingClientRect();
  const parts = ['header', 'header button', 'h3', 'li', 'li > span'];
  return parts.map(selector => {
    const element = panel.querySelector(selector);
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return [rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height, style.fontSize, style.fontWeight];
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());

    for (const theme of ['light', 'dark']) {
      for (const width of [320, 390, 1280]) {
        await page.setViewport({ width, height: 700 });
        await page.goto(`${referenceUrl}?theme=${theme}`, { waitUntil: 'load' });
        await page.click('.record-key-trigger');
        const referenceLayout = await page.$eval(dialog, legendLayout);

        await page.goto(`${url}?theme=${theme}`, { waitUntil: 'load' });
        await page.click('.attendance-verify-button');
        const scrollTop = await page.$eval('.main-content', list => {
          list.scrollTop = 100;
          return list.scrollTop;
        });
        await page.focus(trigger);
        await page.keyboard.press('Enter');
        await page.waitForSelector(`${dialog}[open]`, { visible: true });

        const result = await page.$eval(dialog, panel => {
          const cards = Array.from(document.querySelectorAll('.attendance-record-card'), card => [
            card.querySelector('.attendance-exception-status').textContent.trim(),
            getComputedStyle(card.querySelector('.attendance-record-top')).backgroundImage
          ]);
          // Check the card styling for every filter option, including statuses with no current records.
          const probe = document.querySelector('.attendance-record-card').cloneNode(false);
          const header = document.querySelector('.attendance-record-top').cloneNode(false);
          probe.append(header);
          document.querySelector('.main-content').append(probe);
          const supported = Array.from(document.querySelectorAll('#attendanceExceptionFilter option:not([value="all"])'), option => {
            probe.dataset.exception = option.value;
            return [option.label, getComputedStyle(header).backgroundImage];
          });
          probe.remove();
          const legend = Array.from(panel.querySelectorAll('li'), row => [
            row.textContent.trim(), getComputedStyle(row.querySelector('span')).backgroundImage
          ]);
          const bounds = panel.getBoundingClientRect();
          return {
            cards, supported, legend, theme: document.documentElement.dataset.theme,
            title: document.getElementById(panel.getAttribute('aria-labelledby')).textContent,
            closeLabel: panel.querySelector('.record-key-close').getAttribute('aria-label'),
            closeStrokes: ['::before', '::after'].map(pseudo => {
              const stroke = getComputedStyle(panel.querySelector('.record-key-close'), pseudo);
              return [stroke.content, stroke.gridArea, stroke.borderTopWidth, Math.sign(new DOMMatrix(stroke.transform).b)];
            }),
            headings: Array.from(panel.querySelectorAll('h3'), heading => heading.textContent),
            plainSwatches: panel.querySelectorAll('.record-key-headers > li > span[aria-hidden="true"]:only-child:empty').length,
            fits: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight && panel.scrollWidth <= panel.clientWidth,
            closeFocused: document.activeElement === panel.querySelector('button')
          };
        });
        assert.equal(result.theme, theme);
        assert.equal(result.title, 'Info');
        assert.equal(result.closeLabel, 'Close Info');
        assert.deepEqual(result.closeStrokes, [['""', '1 / 1', '2px', 1], ['""', '1 / 1', '2px', -1]], 'Both close-icon strokes share a grid cell and cross without an icon font');
        assert.deepEqual(result.headings, ['Status']);
        assert.equal(result.plainSwatches, result.supported.length);
        assert.deepEqual(result.legend, result.supported, 'Every supported status has its card colour in the legend');
        const colours = new Map(result.legend);
        for (const [label, fill] of result.cards) assert.equal(colours.get(label), fill);
        assert.deepEqual(await page.$eval(dialog, legendLayout), referenceLayout, 'Attendance uses the standard Info dialog layout');
        assert.ok(result.legend.every(([, fill]) => fill.startsWith('linear-gradient')));
        assert.ok(result.fits && result.closeFocused);
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval(trigger, button => document.activeElement === button), true);
        assert.equal(await page.$eval('.main-content', list => list.scrollTop), scrollTop);
        assert.equal(await page.$eval('.attendance-verify-button', button => button.getAttribute('aria-pressed')), 'true');
      }
    }

    const statusLabels = await page.$$eval('#attendanceExceptionFilter option:not([value="all"])', options => options.map(option => option.label));
    for (const emptyFilter of ['missing-clock', 'early-out']) {
      await page.click('.enterprise-toast-btn');
      await page.select('#attendanceExceptionFilter', emptyFilter);
      await page.click('#attendanceApplyFilter');
      await page.waitForSelector('#filterModalOverlay', { hidden: true });
      assert.equal(await page.$('.attendance-record-card:not([hidden])'), null);
      await page.click(trigger);
      assert.deepEqual(await page.$$eval(`${dialog} li`, rows => rows.map(row => row.textContent.trim())), statusLabels);
      await page.click(`${dialog} header button`);
    }
    await page.click(trigger);
    await page.mouse.click(2, 2);
    assert.equal(await page.$(`${dialog}[open]`), null);
    assert.equal((await page.$$('.record-key-trigger')).length, 1);

    await page.goto(new URL('feedback-history.html', url).href, { waitUntil: 'load' });
    await page.click('.record-key-trigger');
    assert.equal(await page.$eval(`${dialog}[open] h3`, node => node.textContent), 'Attendance exceptions');
    assert.deepEqual(errors, []);
    console.log('Attendance lists every supported status with its card colour in both themes at all three widths. Layout, keyboard, empty filters and verification checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
