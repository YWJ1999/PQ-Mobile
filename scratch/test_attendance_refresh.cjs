const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/attendance.html'));
const scroller = '.attendance-list-view .main-content';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 700 });
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    let deferredScript;
    page.on('request', async request => {
      if (request.url().endsWith('/js/app.js')) await deferredScript;
      if (/^https?:/.test(request.url())) return request.abort();
      return request.continue();
    });
    await page.evaluateOnNewDocument(selector => {
      function firstVisibleFrame() {
        const list = document.querySelector(selector);
        const tabs = document.getElementById('meJumpBar');
        if (!tabs || !list || getComputedStyle(list).visibility !== 'visible') {
          requestAnimationFrame(firstVisibleFrame);
          return;
        }
        window.firstAttendanceFrame = {
          theme: document.documentElement.dataset.theme,
          top: list.scrollTop,
          tabsVisible: tabs.getBoundingClientRect().bottom > list.getBoundingClientRect().top
        };
      }
      requestAnimationFrame(firstVisibleFrame);
    }, scroller);

    async function checkReload(theme, offset) {
      const top = await page.$eval(scroller, (list, value) => {
        list.scrollTop = value;
        return list.scrollTop;
      }, offset);
      assert.equal(top, offset);
      const previousDocument = await page.evaluate(() => performance.timeOrigin);
      let resume;
      deferredScript = new Promise(resolve => { resume = resolve; });
      const loaded = page.reload({ waitUntil: 'load' });
      try {
        await page.waitForFunction(previous => performance.timeOrigin !== previous && window.firstAttendanceFrame, {}, previousDocument);
        const first = await page.evaluate(() => window.firstAttendanceFrame);
        assert.deepEqual(first, { theme, top, tabsVisible: top === 0 });
      } finally {
        resume();
        await loaded;
        deferredScript = undefined;
      }
    }

    await page.goto(url.href);
    await page.evaluate(() => localStorage.setItem('peoplehcm_theme', 'light'));
    await checkReload('light', 0);
    await checkReload('light', 400);
    // A fresh visit starts at the top and honors the explicit theme over the saved preference.
    await page.goto(url.href + '?theme=dark');
    await page.waitForFunction(() => window.firstAttendanceFrame);
    assert.deepEqual(await page.evaluate(() => window.firstAttendanceFrame), { theme: 'dark', top: 0, tabsVisible: true });
    await checkReload('dark', 400);
    await checkReload('dark', 0);
    console.log('Attendance first-frame theme and scroll position passed for fresh visits and reloads.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
