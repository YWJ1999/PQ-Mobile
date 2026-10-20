const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = file => pathToFileURL(path.resolve(file)).href;
const key = 'peoplehcm_settings_v1';
const defaults = {
  clockingMode: 'GPS', language: 'en-US', gpsTimeout: 10, gpsValidTime: 3,
  gpsRefreshRadius: 100, gpsTargetAccuracy: 10, gpsMaxAttempts: 5,
  gpsLastKnownLocation: false, beaconValidTime: 3, beaconDeveloperPanel: false
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 420, height: 844 });
    await page.goto(url('homelight.html'), { waitUntil: 'load' });
    const homeHeight = await page.$eval('.phone-container', el => el.getBoundingClientRect().height);
    await page.click('.burger-btn');
    await page.waitForFunction(() => document.querySelector('.drawer-menu-item[onclick*="settings"]').getBoundingClientRect().left >= document.querySelector('.phone-container').getBoundingClientRect().left);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.click('.drawer-menu-item[onclick*="settings"]')
    ]);
    assert.ok(page.url().includes('settings.html?theme=light'));
    assert.equal(await page.$eval('.phone-container', el => el.getBoundingClientRect().height), homeHeight);
    const readForm = () => page.$eval('#settingsForm', form => Object.fromEntries([...form.elements].filter(el => el.name).map(el => [el.name, el.type === 'checkbox' ? el.checked : el.type === 'number' ? el.valueAsNumber : el.value])));
    assert.deepEqual(await readForm(), defaults);
    assert.deepEqual(await page.$$eval('#clockingMode option', els => els.map(el => el.textContent)), ['GPS', 'GPSPhoto', 'QR', 'QRPhoto']);
    assert.deepEqual(await page.$$eval('#language option', els => els.map(el => el.textContent)), ['English', 'Mandarin', 'Indonesia', 'Bahasa melayu', 'Japanese', 'Nepali', 'Bangladesh', 'Vietnam', 'Pakistan']);
    console.log('PASS sidebar route, Home-sized frame, all defaults and choices');

    async function editNumber(name, value) {
      await page.$eval('#' + name, el => el.scrollIntoView({ block: 'center' }));
      await page.click('#' + name);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      if (value !== '') await page.keyboard.type(String(value));
      await page.keyboard.press('Tab');
    }
    await editNumber('gpsTimeout', 15);
    await editNumber('gpsValidTime', 6);
    await editNumber('gpsRefreshRadius', 150);
    await editNumber('gpsTargetAccuracy', 20);
    await editNumber('gpsMaxAttempts', 8);
    await editNumber('beaconValidTime', 4);
    await page.select('#clockingMode', 'QRPhoto');
    await page.select('#language', 'ms-MY');
    await page.$eval('#gpsLastKnownLocation', el => el.scrollIntoView({ block: 'center' }));
    await page.click('#gpsLastKnownLocation');
    await page.$eval('#beaconDeveloperPanel', el => el.scrollIntoView({ block: 'center' }));
    await page.focus('#beaconDeveloperPanel');
    await page.keyboard.press('Space');
    const changed = await readForm();
    assert.equal(changed.gpsLastKnownLocation, true);
    assert.equal(changed.beaconDeveloperPanel, true);
    assert.deepEqual(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key), changed);
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await readForm(), changed);
    console.log('PASS all settings save and reload, mouse and keyboard switches');

    for (const invalid of ['', '0', '-1', '2.5']) {
      await editNumber('gpsTimeout', invalid);
      assert.equal(await page.$eval('#gpsTimeout', el => el.getAttribute('aria-invalid')), 'true');
      assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).gpsTimeout, key), 15);
    }
    await page.select('#language', 'ja-JP');
    assert.equal(await page.$eval('#settingsSaveStatus', el => el.dataset.state), 'error');
    await editNumber('gpsTimeout', 12);
    assert.equal(await page.$eval('#settingsSaveStatus', el => el.dataset.state), 'saved');
    console.log('PASS invalid edits keep last saved value and show field feedback');

    // Storage failures must be visible, and a later retry includes the pending edit.
    await page.evaluate(() => {
      window.originalStorageSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new Error('Test storage unavailable'); };
    });
    await editNumber('gpsTimeout', 18);
    assert.equal(await page.$eval('#settingsSaveStatus', el => el.dataset.state), 'error');
    await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; });
    await page.select('#clockingMode', 'GPSPhoto');
    assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).gpsTimeout, key), 18);
    await page.$eval('#settingsReset', el => el.scrollIntoView({ block: 'center' }));
    await page.click('#settingsReset');
    assert.deepEqual(await readForm(), defaults);
    assert.deepEqual(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key), defaults);
    console.log('PASS storage error feedback, retry and restore defaults');

    for (const theme of ['light', 'dark']) {
      for (const width of [320, 420]) {
        await page.setViewport({ width, height: width === 320 ? 568 : 844 });
        await page.goto(url('settings.html') + '?theme=' + theme, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.$eval('html', el => el.dataset.theme), theme);
        const geometry = await page.evaluate(() => {
          const phone = document.querySelector('.phone-container'), main = document.querySelector('.main-content');
          const header = document.querySelector('.settings-header'), footer = document.querySelector('.settings-save-status');
          return {
            fits: phone.getBoundingClientRect().top >= 0 && phone.getBoundingClientRect().bottom <= innerHeight + 1,
            noOverflow: main.scrollWidth <= main.clientWidth,
            headerAboveContent: header.getBoundingClientRect().bottom <= main.getBoundingClientRect().top,
            footerBelowContent: footer.getBoundingClientRect().top >= main.getBoundingClientRect().bottom
          };
        });
        assert.deepEqual(geometry, { fits: true, noOverflow: true, headerAboveContent: true, footerBelowContent: true });
        if (width === 420) await page.screenshot({ path: 'scratch/settings-' + theme + '-top.png' });
        await page.$eval('.main-content', el => { el.scrollTop = el.scrollHeight; });
        assert.ok(await page.$eval('#settingsReset', el => el.getBoundingClientRect().bottom <= document.querySelector('.main-content').getBoundingClientRect().bottom));
        if (width === 420) await page.screenshot({ path: 'scratch/settings-' + theme + '-bottom.png' });
        await page.click('[aria-label="Open navigation menu"]');
        await page.$eval('#profileDrawerOverlay', async el => {
          await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
        });
        assert.equal(await page.$eval('.drawer-menu-item[aria-current="page"] .drawer-menu-label', el => el.textContent), 'Settings');
        await page.click('.drawer-close-btn');
        await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#settingsBack')]);
        assert.ok(page.url().includes(theme === 'light' ? 'homelight.html' : 'homedark.html'));
        console.log('PASS ' + theme + ' ' + width + 'px: scroll, fixed header/footer, active sidebar and Back');
      }
    }
    await page.goto(url('settings.html'));
    await page.evaluate(k => localStorage.setItem(k, '{broken JSON'), key);
    await page.reload();
    assert.deepEqual(await readForm(), defaults);
    assert.equal(await page.$eval('#settingsSaveStatus', el => el.dataset.state), 'error');
    await page.goto(url('modules/attendance/index.html'));
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.evaluate(() => navTo('settings'))]);
    assert.ok(new URL(page.url()).pathname.endsWith('/PQ-Mobile/settings.html'));
    assert.deepEqual(errors, []);
    console.log('PASS corrupted storage recovery and navigation from a nested module');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
