const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const detailUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/daily-ot-details.html')).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });

  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 900 });
      await page.goto(`${detailUrl}?employee=000022&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      const isUpdateVisible = () => page.$eval('#dailyOtActions', node => node.getClientRects().length > 0);

      assert.equal(await isUpdateVisible(), false, 'Update must start hidden when no Void checkbox is selected');

      await page.click('#dailyOtVoid0');
      assert.equal(await page.$eval('#dailyOtUpdate', button => button.textContent), 'Void selected (1)');
      assert.equal(await isUpdateVisible(), true, 'Selecting one Void checkbox must show Update');

      await page.click('#dailyOtVoid1');
      assert.equal(await page.$eval('#dailyOtUpdate', button => button.textContent), 'Void selected (2)');
      await page.click('#dailyOtVoid0');
      assert.equal(await isUpdateVisible(), true, 'Update must remain visible while any Void checkbox is selected');

      await page.click('#dailyOtVoid1');
      assert.equal(await isUpdateVisible(), false, 'Clearing every Void checkbox must hide Update again');
      assert.deepEqual(errors, []);

      await page.close();
    }

    console.log('PASS: Daily OT Update visibility follows Void checkbox selection in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
