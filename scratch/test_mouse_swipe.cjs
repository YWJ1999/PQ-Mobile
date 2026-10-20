const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 844, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function drag(x, from, to) {
      await page.mouse.move(x, from);
      await page.mouse.down();
      await page.mouse.move(x, to, { steps: 12 });
      await page.mouse.up();
    }
    for (const file of ['homelight', 'homedark', 'applight', 'appdark', 'subordinates', 'team', 'team-v2', 'light']) {
      await page.goto(pathToFileURL(path.resolve(file + '.html')).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // Prevent navigation if a regression accidentally activates a real card.
      await page.evaluate(() => {
        window.testClicks = 0;
        document.querySelector('.main-content').addEventListener('click', e => {
          window.testClicks++;
          e.preventDefault();
          e.stopImmediatePropagation();
        }, true);
      });
      await drag(200, 520, 240);
      const down = await page.$eval('.main-content', el => el.scrollTop);
      assert.ok(down > 180, file + ': upward mouse swipe scrolls down');
      assert.equal(await page.evaluate(() => window.testClicks), 0, 'swipe does not activate a card');
      await drag(200, 240, 600);
      assert.ok(await page.$eval('.main-content', el => el.scrollTop) < down, 'downward swipe scrolls up');
      assert.equal(await page.$eval('html', el => el.classList.contains('is-mouse-swiping')), false);
      await page.mouse.click(200, 280);
      assert.equal(await page.evaluate(() => window.testClicks), 1, 'next normal click is not swallowed');
      console.log('PASS ' + file + ': swipe both directions, no accidental clicks, next click works');
    }

    await page.goto(pathToFileURL(path.resolve('homelight.html')).href, { waitUntil: 'load' });
    await page.evaluate(() => {
      const main = document.querySelector('.main-content');
      main.innerHTML = `<button id="testButton" style="display:block;width:100%;height:80px">Clickable card</button>
        <input id="testInput" aria-label="Test input" style="display:block;height:40px">
        <div id="nested" style="height:180px;overflow-y:auto">
          <div style="height:800px;background:#ddd">Nested scroll area</div>
        </div><div style="height:1600px">Main scroll area</div>`;
      window.buttonClicks = 0;
      document.querySelector('#testButton').onclick = () => window.buttonClicks++;
    });
    await page.click('#testButton');
    assert.equal(await page.evaluate(() => window.buttonClicks), 1);
    const button = await page.$eval('#testButton', el => ({ x: el.getBoundingClientRect().x + 80, y: el.getBoundingClientRect().y + 60 }));
    await drag(button.x, button.y, button.y - 65);
    assert.equal(await page.evaluate(() => window.buttonClicks), 1, 'dragging a button does not click it');
    await page.$eval('.main-content', el => { el.scrollTop = 0; });
    await page.click('#testInput');
    await page.keyboard.type('Mobile preview');
    assert.equal(await page.$eval('#testInput', el => el.value), 'Mobile preview');
    const nested = await page.$eval('#nested', el => ({ x: el.getBoundingClientRect().x + 100, y: el.getBoundingClientRect().y + 150 }));
    await drag(nested.x, nested.y, nested.y - 100);
    assert.ok(await page.$eval('#nested', el => el.scrollTop) >= 95);
    assert.equal(await page.$eval('.main-content', el => el.scrollTop), 0, 'nested scroll does not move parent');
    // Captured dragging continues outside the phone and always cleans up.
    await page.mouse.move(200, 600);
    await page.mouse.down();
    await page.mouse.move(200, 450, { steps: 5 });
    await page.mouse.move(419, 350, { steps: 5 });
    await page.mouse.up();
    assert.equal(await page.$eval('html', el => el.classList.contains('is-mouse-swiping')), false);
    // Native touch events must never enter mouse-drag mode.
    assert.equal(await page.evaluate(() => {
      const el = document.querySelector('.main-content');
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 42, button: 0, clientY: 500 }));
      const allowed = el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 42, buttons: 1, clientY: 300 }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 42 }));
      return allowed && !document.documentElement.classList.contains('is-mouse-swiping');
    }), true);
    assert.deepEqual(errors, []);
    console.log('PASS controls, nested scrolling, pointer capture cleanup, and native touch passthrough');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
