const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const teamUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/team.html')).href;

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
      await page.setViewport({ width: 320, height: 700 });
      await page.goto(`${teamUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(selectedTheme => window.setTheme(selectedTheme), theme);
      const dailyOtLink = 'a[href*="daily-ot.html"]';
      await page.$eval(dailyOtLink, link => link.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(dailyOtLink)]);
      const employeeCard = '.daily-ot-card.unapproved[href*="employee=000022"]';
      await page.$eval(employeeCard, link => link.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(employeeCard)]);
      assert.equal(await page.title(), 'PeopleHCM - Daily OT Approval');
      assert.equal(await page.$eval('.daily-ot-detail-content', node => node.scrollWidth <= node.clientWidth), true);
      const isUpdateVisible = () => page.$eval('#dailyOtActions', node => node.getClientRects().length > 0);
      const total = () => page.$eval('#dailyOtTotal', node => node.value);

      assert.equal(await isUpdateVisible(), true, 'Approvers can save the suggested hours immediately');
      assert.equal(await total(), '8.00');

      await page.click('#dailyOtVoid0');
      assert.equal(await total(), '7.50');

      await page.click('#dailyOtVoid1');
      assert.equal(await total(), '5.50');
      await page.click('#dailyOtVoid0');
      assert.equal(await total(), '6.00');

      await page.click('#dailyOtVoid1');
      assert.equal(await total(), '8.00');
      assert.equal(await isUpdateVisible(), true, 'Update stays available after restoring all entries');
      assert.equal(await page.$eval('#dailyOtUpdate', button => button.textContent), 'Update');
      await page.click('#dailyOtUpdate');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#dailyOtBack')]);
      assert.equal(await page.$eval(employeeCard + ' .daily-ot-detail-value.approved', node => node.textContent.trim()), '8.00');
      assert.deepEqual(errors, []);

      await page.close();
    }

    console.log('PASS: Daily OT keeps Update available and recalculates totals when entries are voided or restored in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
