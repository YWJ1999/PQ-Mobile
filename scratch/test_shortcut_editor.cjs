const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const names = () => page.$$eval('.shortcuts-grid h4', elements => elements.map(element => element.textContent));
    const input = id => `#shortcutEditor input[value="${id}"]`;
    const isOpen = () => page.$eval('#shortcutEditor', dialog => dialog.open);
    const save = () => page.click('[data-shortcut-save]');
    const cancel = () => page.click('.notification-filter-cancel[data-shortcut-cancel]');
    const defaults = ['Benefit Highlight', 'Staff Benefit Entitlement', 'Travel Request', 'Daily OT', 'Clocking', 'Tax Relief'];
    const benefit = 'modules/claims/options/benefit-highlight.html';
    const root = path.resolve(__dirname, '..');
    const output = 'C:/Users/60182/.codex/visualizations/2026/10/27/01a17b22-c1b4-7bb1-bf84-a237020a2915';
    async function assertFitsPhone() {
      await page.waitForFunction(() => {
        const phone = document.querySelector('.phone-container').getBoundingClientRect();
        const editor = document.getElementById('shortcutEditor');
        const bounds = editor.getBoundingClientRect();
        const save = editor.querySelector('[data-shortcut-save]').getBoundingClientRect();
        return bounds.top >= Math.max(0, phone.top) + 23
          && bounds.bottom <= Math.min(innerHeight, phone.bottom) - 23
          && bounds.left >= phone.left + 15 && bounds.right <= phone.right - 15
          && bounds.height <= 640 && editor.scrollHeight <= editor.clientHeight
          && save.top >= bounds.top && save.bottom <= bounds.bottom;
      });
      const before = await page.$eval('[data-shortcut-save]', node => node.getBoundingClientRect().top);
      await page.$eval('.shortcut-options', node => { node.scrollTop = node.scrollHeight; });
      assert.equal(await page.$eval('[data-shortcut-save]', node => node.getBoundingClientRect().top), before, 'Save stays fixed while the options scroll');
      await page.$eval('.shortcut-options', node => { node.scrollTop = 0; });
    }

    for (const theme of ['light', 'dark']) {
      for (const width of [320, 420]) {
        await page.setViewport({ width, height: 844 });
        const url = pathToFileURL(path.join(root, `app${theme}.html`)).href;
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(() => localStorage.removeItem('peoplehcm_app_shortcuts'));
        await page.reload({ waitUntil: 'load' });
        assert.deepEqual(await names(), defaults);
        await page.focus('#editShortcutsButton');
        await page.keyboard.press('Enter');
        assert.equal(await isOpen(), true, 'Edit opens the shortcut editor with keyboard activation');
        await assertFitsPhone();
        assert.equal(page.url(), url, 'Edit stays on Apps rather than navigating to Settings');
        assert.equal(await page.$$eval('#shortcutEditor input:checked', nodes => nodes.length), 6);
        assert.equal(await page.$eval(input('module:leave'), node => node.disabled), true, 'Six shortcut limit');
        await page.click(input(benefit));
        assert.equal(await page.$eval(input('module:leave'), node => node.disabled), false);
        await page.click(input('module:leave'));
        assert.deepEqual(await names(), defaults, 'Editing is a draft until Save');
        await cancel();
        assert.equal(await isOpen(), false);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'editShortcutsButton');
        assert.deepEqual(await names(), defaults, 'Cancel discards edits');

        await page.click('#editShortcutsButton');
        await page.click(input(benefit));
        await page.click(input('module:leave'));
        await save();
        const customized = [...defaults.slice(1), 'Leave'];
        assert.deepEqual(await names(), customized);
        assert.equal(await isOpen(), false);
        await page.reload({ waitUntil: 'load' });
        assert.deepEqual(await names(), customized, 'Saved shortcuts survive reload');
        const opposite = theme === 'light' ? 'dark' : 'light';
        await page.goto(pathToFileURL(path.join(root, `app${opposite}.html`)).href, { waitUntil: 'load' });
        assert.deepEqual(await names(), customized, 'Selection is shared between themes');
        await page.goto(url, { waitUntil: 'load' });

        for (const href of await page.$$eval('.shortcuts-grid a', nodes => nodes.map(node => node.href))) {
          assert(fs.existsSync(fileURLToPath(href)), `Shortcut destination exists: ${href}`);
        }
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'load' }),
          page.click('[data-shortcut-id="module:leave"]')
        ]);
        assert(new URL(page.url()).pathname.endsWith('/leave.html'), 'Added shortcut opens its module');
        await page.goto(url, { waitUntil: 'load' });

        await page.click('#editShortcutsButton');
        await page.click('[data-shortcut-reset]');
        await page.keyboard.press('Escape');
        assert.deepEqual(await names(), customized, 'Escape discards Reset');
        await page.click('#editShortcutsButton');
        await page.mouse.click(1, 1);
        assert.equal(await isOpen(), true, 'Backdrop is confined to the phone');
        const backdropPoint = await page.$eval('.phone-container', node => {
          const rect = node.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + 12 };
        });
        await page.mouse.click(backdropPoint.x, backdropPoint.y);
        assert.equal(await isOpen(), false, 'Phone backdrop closes editor');
        await page.click('#editShortcutsButton');
        for (const id of await page.$$eval('#shortcutEditor input:checked', nodes => nodes.map(node => node.value))) {
          await page.click(input(id));
        }
        assert.equal(await page.$eval('[data-shortcut-save]', node => node.disabled), true, 'Keep at least one shortcut');
        await page.click('[data-shortcut-reset]');
        assert.equal(await page.$eval('[data-shortcut-save]', node => node.disabled), false);
        await page.setViewport({ width, height: 480 });
        await assertFitsPhone();
        assert.equal(await page.$eval('[data-shortcut-save]', node => {
          const bounds = node.getBoundingClientRect();
          return bounds.top >= 0 && bounds.bottom <= innerHeight;
        }), true, 'Save stays visible on short screens');
        assert.equal(await page.$eval('#shortcutEditor', node => {
          const bounds = node.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth && node.scrollWidth <= node.clientWidth;
        }), true, 'Editor fits the viewport');
        await save();
        assert.deepEqual(await names(), defaults, 'Reset restores the original shortcuts');
        await page.setViewport({ width, height: 844 });
        if (width === 420) {
          await page.click('#editShortcutsButton');
          assert.equal(await page.$eval('.shortcut-options', node => node.scrollTop), 0, 'Editor reopens at the start of the shortcut list');
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: path.join(output, `shortcut-editor-${theme}.png`) });
          await cancel();
        }
        await page.evaluate(() => localStorage.setItem('peoplehcm_app_shortcuts', '{invalid'));
        await page.reload({ waitUntil: 'load' });
        assert.deepEqual(await names(), defaults, 'Invalid saved data recovers to defaults');
        console.log(`PASS ${theme} ${width}px: Edit, save, cancel, reset, limits, persistence, theme switch, navigation and short-screen layout`);
      }
      await page.goto(pathToFileURL(path.join(root, `app${theme}.html`)).href, { waitUntil: 'load' });
      await page.click('#editShortcutsButton');
      for (const [width, height] of [[390, 844], [900, 1000], [1440, 1200], [740, 480]]) {
        await page.setViewport({ width, height });
        await assertFitsPhone();
        if (width === 900) await page.screenshot({ path: path.join(output, `shortcut-editor-contained-${theme}.png`) });
      }
      console.log(`PASS ${theme}: editor stays within the phone frame on mobile, desktop and landscape resize`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
