const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const storageKey = 'peoplehcm_profile_collapse_v1';
const personal = '.profile-group-personal-details .profile-collapse-toggle';
const family = '.profile-group-family-status .profile-collapse-toggle';

function createServer() {
  return http.createServer(async (request, response) => {
    const filename = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
      response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
      response.end(await fs.readFile(filename));
    } catch {
      response.writeHead(404).end();
    }
  });
}

async function listen(server, port = 0) {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
}

async function closeServer(server) {
  const closed = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await closed;
}

async function snapshot(page) {
  return page.$$eval('.profile-collapsible', panels => panels.map(panel => {
    const button = panel.querySelector('.profile-collapse-toggle');
    const body = panel.querySelector('.profile-collapse-body');
    return {
      title: document.getElementById(button.getAttribute('aria-labelledby')).textContent.trim(),
      expanded: button.getAttribute('aria-expanded') === 'true',
      collapsed: panel.classList.contains('is-collapsed'),
      inert: body.inert,
      hidden: body.getAttribute('aria-hidden') === 'true',
      linked: document.getElementById(button.getAttribute('aria-controls')) === body
    };
  }));
}

function assertConsistent(states) {
  for (const state of states) {
    assert.equal(state.collapsed, !state.expanded, state.title);
    assert.equal(state.inert, !state.expanded, state.title);
    assert.equal(state.hidden, !state.expanded, state.title);
    assert.equal(state.linked, true, state.title);
  }
}

(async () => {
  let server = createServer();
  await listen(server);
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const url = origin + '/me.html?theme=light&scroll=bento-personal';
  let browser;
  const errors = [];
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      timeout: 15000
    });
    console.log('Chrome ready');
    async function newPage() {
      const page = await browser.newPage();
      await page.setViewport({ width: 420, height: 844 });
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => request.url().startsWith(origin) || request.url().startsWith('data:')
        ? request.continue() : request.abort());
      return page;
    }
    const page = await newPage();
    await page.goto(url, { waitUntil: 'load' });
    const defaults = await snapshot(page);
    assert.equal(defaults.length, 22);
    assert.ok(defaults.every(state => state.expanded), 'New visitors keep the existing expanded defaults');
    assertConsistent(defaults);

    // Real mouse and keyboard interactions save both collapsed and expanded states.
    await page.click(personal);
    await page.focus(personal);
    await page.keyboard.press('Enter');
    await page.click(family);
    const initial = await snapshot(page);
    assert.equal(initial.find(state => state.title === 'Personal details').expanded, true);
    assert.equal(initial.find(state => state.title === 'Family status').expanded, false);
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await snapshot(page), initial);
    console.log('PASS: mouse/keyboard preferences survive reload');

    // Set independent preferences across every category, including hidden panels.
    await page.evaluate(() => {
      document.querySelectorAll('.profile-collapsible').forEach((panel, index) => {
        const button = panel.querySelector('.profile-collapse-toggle');
        if ((button.getAttribute('aria-expanded') === 'true') !== (index % 2 === 0)) button.click();
      });
    });
    const expected = await snapshot(page);
    assertConsistent(expected);
    await page.evaluate(() => {
      openProfileCategory('bento-work');
      showProfileDirectory();
      openProfileCategory('bento-personal');
      initProfileCollapsibleCards();
    });
    assert.deepEqual(await snapshot(page), expected, 'Category navigation and repeated initialization preserve choices');
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await snapshot(page), expected, 'Every panel restores after reload');
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.ok(Object.keys(saved).length >= 11, 'Independent panels have separate saved choices');
    console.log('PASS: all categories restore independent preferences');

    const other = await newPage();
    await other.goto(url.replace('theme=light', 'theme=dark'), { waitUntil: 'load' });
    assert.deepEqual(await snapshot(other), expected, 'A new tab and theme share preferences');
    console.log('PASS: new tab restores preferences');
    await other.setViewport({ width: 320, height: 844 });
    await other.bringToFront();
    await other.click(personal);
    console.log('Second tab preference changed');
    await page.waitForFunction(selector => document.querySelector(selector).getAttribute('aria-expanded') === 'false', { polling: 100 }, personal);
    await page.bringToFront();
    await page.click(family);
    await other.waitForFunction(selector => document.querySelector(selector).getAttribute('aria-expanded') === 'true', { polling: 100 }, family);
    const updated = await snapshot(other);
    assert.deepEqual(await snapshot(page), updated, 'Open tabs stay synchronized');
    assertConsistent(updated);
    await other.close();
    console.log('PASS: cross-tab synchronization');

    await closeServer(server);
    server = createServer();
    await listen(server, port);
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await snapshot(page), updated, 'Stopping and restarting the local server retains preferences');
    await page.goto(origin + '/homelight.html', { waitUntil: 'load' });
    await page.goto(url, { waitUntil: 'load' });
    assert.deepEqual(await snapshot(page), updated, 'Leaving and reopening the profile retains preferences');
    console.log('PASS: all 22 panels, reload, category navigation, new tab, theme/width changes, cross-tab synchronization, server restart and returning from Home');

    for (const invalid of ['{broken', 'null', '[]', '"invalid"']) {
      await page.evaluate((key, value) => localStorage.setItem(key, value), storageKey, invalid);
      await page.reload({ waitUntil: 'load' });
      assert.deepEqual(await snapshot(page), defaults, 'Invalid saved data falls back to expanded defaults');
    }
    const savedKey = 'bento-personal:profile-group-family-status';
    await page.evaluate((key, validKey) => localStorage.setItem(key, JSON.stringify({
      [validKey]: false,
      'bento-personal:profile-group-personal-details': 'false'
    })), storageKey, savedKey);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.$eval(family, button => button.getAttribute('aria-expanded')), 'false');
    assert.equal(await page.$eval(personal, button => button.getAttribute('aria-expanded')), 'true');
    await page.click(family);
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await snapshot(page), defaults, 'Re-expanding a previously collapsed panel is saved');

    const blocked = await newPage();
    await blocked.evaluateOnNewDocument(key => {
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (name) {
        if (name === key) throw new DOMException('Storage unavailable', 'SecurityError');
        return getItem.call(this, name);
      };
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('Storage unavailable', 'SecurityError');
        return setItem.call(this, name, value);
      };
    }, storageKey);
    await blocked.goto(url, { waitUntil: 'load' });
    await blocked.click(personal);
    await blocked.click(family);
    await blocked.evaluate(() => {
      openProfileCategory('bento-training');
      openProfileCategory('bento-personal');
    });
    assert.equal(await blocked.$eval(personal, button => button.getAttribute('aria-expanded')), 'false');
    assert.equal(await blocked.$eval(family, button => button.getAttribute('aria-expanded')), 'false');
    assertConsistent(await snapshot(blocked));
    assert.deepEqual(errors, []);
    console.log('PASS: corrupt or invalid preferences, persisted re-expansion, unavailable storage fallback, accessibility state and no page errors');
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
    await closeServer(server);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
