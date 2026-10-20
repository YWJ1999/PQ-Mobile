const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = file => pathToFileURL(path.resolve(file)).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await page.setViewport({ width: 420, height: 844 });
    await page.goto(url('homelight.html'), { waitUntil: 'load' });
    const homeHeight = await page.$eval('.phone-container', el => el.getBoundingClientRect().height);
    await page.click('.burger-btn');
    await page.$eval('#profileDrawerOverlay', async el => {
      await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    assert.equal(await page.$eval('.drawer-menu-item[onclick*="change_password"] .drawer-menu-desc', el => el.textContent), 'Update your login password');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.click('.drawer-menu-item[onclick*="change_password"]')
    ]);
    assert.ok(page.url().includes('change-password.html?theme=light'));
    assert.equal(await page.$eval('.phone-container', el => el.getBoundingClientRect().height), homeHeight);
    assert.equal(await page.$$eval('#changePasswordForm input', els => els.length), 3);
    assert.equal(await page.$eval('.password-submit', el => el.textContent.trim()), 'Update Password');
    console.log('PASS sidebar navigation, copy, three-field form and Home phone height');

    const storageBefore = await page.evaluate(() => ({ ...localStorage }));
    await page.click('.password-submit');
    assert.equal(await page.$$eval('.password-field.has-error', els => els.length), 3);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'currentPassword');
    await page.type('#currentPassword', 'preview-current-7');
    await page.type('#newPassword', 'preview-new-9 ');
    await page.type('#confirmPassword', 'preview-new-9');
    await page.click('.password-submit');
    assert.equal(await page.$eval('#confirmPasswordError', el => el.textContent), 'The new passwords do not match.');
    assert.equal(await page.$$eval('.password-field.has-error', els => els.length), 1);
    // Passwords are compared exactly: whitespace is not silently trimmed.
    await page.type('#confirmPassword', ' ');
    assert.equal(await page.$$eval('.password-field.has-error', els => els.length), 0);
    for (const id of ['currentPassword', 'newPassword', 'confirmPassword']) {
      await page.click('[aria-controls="' + id + '"]');
      assert.equal(await page.$eval('#' + id, el => el.type), 'text');
      assert.equal(await page.$eval('[aria-controls="' + id + '"]', el => el.getAttribute('aria-pressed')), 'true');
      await page.click('[aria-controls="' + id + '"]');
      assert.equal(await page.$eval('#' + id, el => el.type), 'password');
    }
    await page.focus('#confirmPassword');
    await page.keyboard.press('Enter');
    assert.match(await page.$eval('#passwordFeedback', el => el.textContent), /No password was changed/);
    assert.equal(await page.$$eval('#changePasswordForm input', els => els.every(el => el.value === '' && el.type === 'password')), true);
    assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), storageBefore);
    assert.deepEqual(writes, []);
    console.log('PASS required fields, matching confirmation, exact comparison, visibility and keyboard submit');
    console.log('PASS preview does not store or transmit passwords or claim an update');

    for (const theme of ['light', 'dark']) {
      for (const width of [320, 420]) {
        await page.setViewport({ width, height: width === 320 ? 568 : 844 });
        await page.goto(url('change-password.html') + '?theme=' + theme, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.$eval('html', el => el.dataset.theme), theme);
        assert.equal(await page.$eval('.main-content', el => el.scrollWidth <= el.clientWidth), true);
        assert.equal(await page.$eval('.phone-container', el => el.getBoundingClientRect().bottom <= innerHeight + 1), true);
        assert.equal(await page.$eval('.settings-toolbar h1', el => el.scrollWidth <= el.clientWidth), true);
        if (width === 420) await page.screenshot({ path: 'scratch/change-password-' + theme + '.png' });
        await page.$eval('.main-content', el => { el.scrollTop = el.scrollHeight; });
        assert.equal(await page.$eval('.password-submit', el => el.getBoundingClientRect().bottom <= document.querySelector('.main-content').getBoundingClientRect().bottom), true);
        await page.click('[aria-label="Open navigation menu"]');
        await page.$eval('#profileDrawerOverlay', async el => {
          await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
        });
        assert.equal(await page.$eval('.drawer-menu-item[aria-current="page"] .drawer-menu-label', el => el.textContent), 'Change Password');
        await page.click('.drawer-close-btn');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'load' }),
          page.click('[aria-label="Back"]')
        ]);
        assert.ok(page.url().includes(theme === 'light' ? 'homelight.html' : 'homedark.html'));
        console.log('PASS ' + theme + ' ' + width + 'px: layout, scrolling, active sidebar and Back');
      }
    }
    await page.goto(url('modules/attendance/index.html'));
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.evaluate(() => navTo('change_password'))
    ]);
    assert.ok(new URL(page.url()).pathname.endsWith('/PQ-Mobile/change-password.html'));
    await page.type('#currentPassword', 'another-preview-value');
    await page.click('[aria-controls="currentPassword"]');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.$eval('#currentPassword', el => el.value === '' && el.type === 'password'), true);
    assert.deepEqual(errors, []);
    console.log('PASS nested-module routing and password cleanup when leaving');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
