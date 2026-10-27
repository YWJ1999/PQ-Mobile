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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const card = status => `[data-pending-status="${status}"]`;
    const labels = () => page.$$eval('.notification-status-tabs button', buttons => buttons.map(button => button.textContent.trim()));
    const groupCounts = () => page.$$eval('.group-count-badge', badges => badges.map(badge => Number(badge.textContent)));
    const settled = () => page.waitForFunction(() => {
      const overlay = document.getElementById('forYouOverlay');
      return getComputedStyle(overlay).opacity === '1'
        && new DOMMatrix(getComputedStyle(overlay.querySelector('.indicators-sheet')).transform).m42 === 0;
    });
    async function openCard(status, keyboard = false) {
      await page.$eval(card(status), element => {
        const main = element.closest('.main-content');
        main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 30;
        element.focus({ preventScroll: true });
      });
      if (keyboard) await page.keyboard.press('Enter');
      else await page.click(card(status));
      await settled();
      assert.equal(await page.$eval('.notification-status-tabs .active', element => element.dataset.forYouTab), status);
    }
    const close = () => page.click('#forYouOverlay .sheet-close-btn');
    async function openNotifications() {
      await page.click('.bottom-nav .nav-item:has(.fa-bell)');
      await settled();
      assert.equal(await page.$eval('.notification-status-tabs .active', element => element.dataset.forYouTab), 'pending_approval', 'Notification navigation always opens Pending Approval');
      assert.deepEqual(await groupCounts(), [1, 1, 1, 1]);
    }

    for (const theme of ['light', 'dark']) {
      for (const width of [320, 390, 420]) {
        await page.setViewport({ width, height: 844 });
        const url = pathToFileURL(path.resolve(__dirname, `../home${theme}.html`)).href;
        await page.goto(url, { waitUntil: 'networkidle0' });
        assert.deepEqual(await page.$$eval('[data-home-notifications] .fy-title', nodes => nodes.map(node => node.textContent)), ['Pending Approval', 'Pending Resubmit']);
        assert.equal(await page.$eval('[data-home-notifications]', element => element.scrollWidth <= element.clientWidth), true);

        await openCard('pending_approval', true);
        assert.equal(page.url(), url, 'Home cards open the notification sheet without leaving Home');
        assert.deepEqual(await groupCounts(), [1, 1, 1, 1]);
        assert.deepEqual(await labels(), ['Pending Approval (4)', 'Pending Resubmit (3)']);
        assert.equal(await page.$$eval('.notification-status-tabs .sheet-tag-badge', elements => elements.length), 0);
        assert.equal(await page.$eval('.notification-status-tabs', element => element.scrollWidth <= element.clientWidth), true);

        await close();
        await openNotifications();
        await close();
        await openCard('pending_approval');

        await page.click('#notificationFilterButton');
        await page.click('#notificationDocumentDialog input[value="Tax EA Form"]');
        await page.click('.notification-filter-apply');
        assert.deepEqual(await groupCounts(), [1]);
        await close();
        await openCard('pending_resubmit');
        assert.deepEqual(await groupCounts(), [1, 1, 1], 'Home shortcut clears stale document filters');
        assert.equal(await page.$eval('#notificationFilterSummary', element => element.hidden), true);
        await close();
        await openNotifications();
        await close();

        await page.click('.section-action[onclick="openForYouModal()"]');
        await settled();
        assert.deepEqual(await groupCounts(), [1, 1, 1, 1], 'Category badges show counts for Pending Approval');
        assert.equal(await page.$eval('.notification-status-tabs .active', element => element.dataset.forYouTab), 'pending_approval');

        await page.evaluate(() => { openApprovalDetailModal('notif_1'); actionApproveRequest(); });
        assert.deepEqual(await labels(), ['Pending Approval (3)', 'Pending Resubmit (3)']);
        assert.equal(await page.$eval(`${card('pending_approval')} .fy-description`, element => element.textContent), '3 requests are waiting for your approval');
        await page.evaluate(() => { NOTIFICATIONS_CATALOG = []; renderForYouSheetUI(); });
        await close();
        await openCard('pending_approval');
        assert.equal(await page.$eval('#forYouEmptyState', element => getComputedStyle(element).display), 'block');
        assert.deepEqual(await labels(), ['Pending Approval (0)', 'Pending Resubmit (0)']);
        console.log(`PASS ${theme} ${width}px: home shortcuts, Notification defaults to Pending Approval, two tabs, filter reset, live counts and empty state`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
