const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/attendance.html')).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    for (const theme of ['light', 'dark']) {
      for (const [width, height] of [[360, 844], [420, 844], [360, 640]]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height });
      await page.goto(pageUrl + '?theme=' + theme, { waitUntil: 'domcontentloaded' });

      assert.deepEqual(
        await page.$eval('#attendanceUpdateBtn', node => ({
          hidden: node.hidden,
          disabled: node.disabled,
          rendered: node.getClientRects().length > 0
        })),
        { hidden: true, disabled: true, rendered: false },
        'Update stays hidden until a verification changes'
      );
      assert.ok(
        await page.evaluate(() => {
          const list = document.querySelector('.attendance-list-view').getBoundingClientRect();
          const content = document.querySelector('.main-content').getBoundingClientRect();
          return Math.abs(list.bottom - content.bottom) <= 1;
        }),
        'Hidden Update leaves no blank action-card reserve above the bottom navigation'
      );
      await page.click('.attendance-verify-button');
      assert.deepEqual(
        await page.$eval('#attendanceUpdateBtn', node => ({
          hidden: node.hidden,
          disabled: node.disabled,
          rendered: node.getClientRects().length > 0
        })),
        { hidden: false, disabled: false, rendered: true },
        'Selecting a Verify checkbox reveals Update'
      );

      const layout = await page.evaluate(() => {
        const bar = document.querySelector('.attendance-total-bar');
        const summaryRow = bar.querySelector('.attendance-total-summary-row');
        const updateButton = document.getElementById('attendanceUpdateBtn');
        const buttonRect = updateButton.getBoundingClientRect();
        const frameRect = document.querySelector('.phone-container').getBoundingClientRect();
        const navRect = document.querySelector('.phone-container > phone-bottom-nav .bottom-nav').getBoundingClientRect();
        return {
          outsideScroller: !document.querySelector('.main-content').contains(updateButton),
          verifyInsideSummaryRow: summaryRow.contains(document.getElementById('verifyAllBtn')),
          rightGap: frameRect.right - buttonRect.right,
          navGap: navRect.top - buttonRect.bottom,
          actionReserve: Math.round(document.querySelector('.attendance-list-view').getBoundingClientRect().bottom - document.querySelector('.main-content').getBoundingClientRect().bottom),
          radius: getComputedStyle(updateButton).borderRadius,
          top: buttonRect.top,
          fits: updateButton.scrollWidth <= updateButton.clientWidth + 1
        };
      });

      assert.equal(layout.outsideScroller, true);
      assert.equal(layout.verifyInsideSummaryRow, true);
      assert.ok(Math.abs(layout.rightGap - 20) <= 1 && Math.abs(layout.navGap - 20) <= 1, 'Update sits at bottom right above bottom navigation');
      assert.equal(layout.actionReserve, 80, 'Visible Update reserves its action area above the bottom navigation');
      assert.equal(layout.radius, '999px');
      assert.equal(layout.fits, true);
      await page.hover('.main-content');
      await page.mouse.wheel({ deltaY: 450 });
      await page.waitForFunction(() => document.querySelector('.main-content').scrollTop > 0);
      await page.$eval('.main-content', node => { node.scrollTop = node.scrollHeight; });
      assert.equal(await page.$eval('#attendanceUpdateBtn', node => node.getBoundingClientRect().top), layout.top, 'Update remains stationary while scrolling');
      assert.ok(await page.$$eval('.attendance-record-card:not([hidden])', cards => cards.at(-1).getBoundingClientRect().bottom <= document.getElementById('attendanceUpdateBtn').getBoundingClientRect().top), 'Last visible card and its Feedback button stay above Update');
      await page.screenshot({ path: path.resolve(__dirname, `individual-attendance-fixed-update-${theme}-${width}-${height}.png`) });

      await page.click('#attendanceUpdateBtn');
      assert.deepEqual(
        await page.$eval('#attendanceUpdateBtn', node => ({
          hidden: node.hidden,
          disabled: node.disabled,
          rendered: node.getClientRects().length > 0
        })),
        { hidden: true, disabled: true, rendered: false },
        'Saving hides Update again'
      );
      assert.ok(
        await page.evaluate(() => {
          const list = document.querySelector('.attendance-list-view').getBoundingClientRect();
          const content = document.querySelector('.main-content').getBoundingClientRect();
          return Math.abs(list.bottom - content.bottom) <= 1;
        }),
        'Saving removes the Update action-card reserve'
      );
      await page.$eval('.main-content', node => { node.scrollTop = 0; });
      await page.click('.attendance-verify-button');
      assert.deepEqual(
        await page.$eval('#attendanceUpdateBtn', node => ({
          hidden: node.hidden,
          disabled: node.disabled,
          rendered: node.getClientRects().length > 0
        })),
        { hidden: false, disabled: false, rendered: true },
        'Changing a saved checkbox reveals Update again'
      );
      assert.deepEqual(errors, []);
      await page.close();
      }
    }

    console.log('PASS: Individual Attendance Update and its reserved action area appear only for unsaved checkbox changes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
