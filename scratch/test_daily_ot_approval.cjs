const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const screenshotDir = process.env.PQ_SCREENSHOT_DIR || __dirname;
const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/daily-ot-details.html')).href;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 360, height: 900 });
      await page.goto(`${url}?employee=0000101&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.deepEqual(await page.$$eval('.daily-ot-entries-table th', nodes => nodes.map(node => node.textContent)), ['OT type', 'Actual', 'Approved']);
      assert.equal(await page.$$eval('.daily-ot-approval-input', nodes => nodes.length), 1);
      assert.equal(await page.$eval('.daily-ot-approval-input', node => node.value), '0030');
      assert.equal(await page.$eval('.record-readonly', node => node.textContent), '0030');
      await page.click('.approved-field i');
      assert.equal(await page.$eval('.daily-ot-approval-input', node => document.activeElement === node), true);
      const voidControl = await page.$('.daily-ot-void-checkbox');
      assert.ok(voidControl, 'Each OT item needs a Void control');
      await voidControl.click();
      assert.equal(await page.$eval('.daily-ot-approval-input', node => node.disabled), true);
      assert.equal(await page.evaluate(() => window.createDailyOtRecords()[0].approvedHours), '0.50', 'Void changes must remain unsaved until Update');
      await page.click('#dailyOtUpdate');
      const saved = await page.evaluate(() => window.createDailyOtRecords()[0]);
      assert.equal(saved.items[0].voided, true);
      assert.equal(saved.approvedHours, '0.00');
      assert.equal(saved.unapprovedHours, '0.50');
      assert.equal(saved.items[0].actual, '0030');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('.daily-ot-void-checkbox', node => node.checked), true);
      assert.equal(await page.$eval('#dailyOtTotal', node => node.value), '0.00');
      await page.click('.daily-ot-void-checkbox');
      await page.$eval('.daily-ot-approval-input', node => { node.value = '0015'; });
      await page.click('#dailyOtUpdate');
      const restored = await page.evaluate(() => window.createDailyOtRecords()[0]);
      assert.equal(restored.items[0].voided, false);
      assert.equal(restored.items[0].approve, '0015');
      assert.equal(restored.approvedHours, '0.25');
      assert.equal(restored.unapprovedHours, '0.25');
      await page.goto(`${url}?employee=000088&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.deepEqual(await page.$$eval('.daily-ot-approval-input', nodes => nodes.map(node => node.value)), Array(8).fill('0000'), 'Opening a record must preserve existing approved HHMM values');
      assert.equal(await page.$$eval('.daily-ot-void-checkbox', nodes => nodes.length), 8);
      await page.$$eval('.daily-ot-approval-input', nodes => {
        nodes[0].value = '0015';
        nodes[1].value = '0060';
        nodes[1].dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.$eval('#dailyOtTotal', node => node.value), '—');
      await page.click('#dailyOtUpdate');
      const invalid = await page.evaluate(() => window.createDailyOtRecords().find(record => record.id === '000088'));
      assert.equal(invalid.items[0].approve, '0000', 'An invalid time must prevent saving every pending change');
      assert.equal(invalid.approvedHours, '0.00');
      assert.equal(await page.$eval('#dailyOtApproved1', node => document.activeElement === node && node.validity.patternMismatch), true);
      await page.$eval('#dailyOtApproved1', node => {
        node.value = '0145';
        node.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.$eval('#dailyOtTotal', node => node.value), '2.00');
      await page.keyboard.press('Enter');
      const edited = await page.evaluate(() => window.createDailyOtRecords().find(record => record.id === '000088'));
      assert.equal(edited.approvedHours, '2.00', 'Valid hour edits must save without voiding an entry');
      assert.equal(edited.unapprovedHours, '5.75');
      assert.equal(edited.items[1].approve, '0145');
      assert.equal(await page.$eval('.daily-ot-detail-content', node => node.scrollWidth <= node.clientWidth), true);
      assert.deepEqual(errors, []);
      await page.goto(`${url}?employee=000022&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => sessionStorage.removeItem('peoplehcm-daily-ot-overrides'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 300));
      await page.screenshot({ path: path.resolve(screenshotDir, `daily-ot-approval-${theme}.png`) });
      const switchedTheme = theme === 'dark' ? 'light' : 'dark';
      await page.evaluate(nextTheme => window.setTheme(nextTheme), switchedTheme);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#dailyOtBack')]);
      assert.equal(new URL(page.url()).searchParams.get('theme'), switchedTheme, 'Back must keep the currently selected theme');
      await page.close();
      console.log(`PASS ${theme}: approved and unapproved records, exact HHMM values, Void, Update, reload persistence and mobile layout`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
