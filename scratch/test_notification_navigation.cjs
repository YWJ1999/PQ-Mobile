const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const destinations = [
  ['Leave Requests', 'leave.html', '#viewTeamApprovals', { mode: 'team', view: 'approvals', tab: 'leave' }],
  ['Medical & Expense Claims', 'modules/claims/options/pending-approval.html', '#teamApprovalsQueue'],
  ['Overtime & Shift Requests', 'modules/attendance/options/team.html', '#viewPendingApprovalSection', { view: 'approvals' }],
  ['Tax & Official Documents', 'modules/payroll/options/pending-approval.html', '#payrollPendingQueue'],
  ['Performance & KPI Goals', 'modules/performance/options/pending-approval.html', '#performanceApprovalQueue']
];

async function openNotifications(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; openForYouModal(); });
  await page.waitForFunction(() => {
    const overlay = document.getElementById('forYouOverlay');
    return getComputedStyle(overlay).opacity === '1'
      && new DOMMatrix(getComputedStyle(overlay.querySelector('.indicators-sheet')).transform).m42 === 0;
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    for (const theme of ['light', 'dark']) {
      const url = pathToFileURL(path.resolve(`home${theme}.html`)).href;
      await page.setViewport({ width: 390, height: 844 });
      await openNotifications(page, url);
      for (const [tab, names, counts] of [
        [1, destinations.filter((_, i) => i !== 2).map(([name]) => name), [1, 1, 1, 1]],
        [2, destinations.slice(0, 3).map(([name]) => name), [1, 1, 1]]
      ]) {
        await page.click(`.notification-status-tabs button:nth-child(${tab})`);
        const cards = await page.$$eval('.notif-category-card', els => els.map(el => ({
          name: el.querySelector('.group-title-text').textContent,
          badge: el.querySelector('.group-count-badge').textContent,
          action: el.querySelector('.notif-category-action').textContent.trim()
        })));
        assert.deepEqual(cards.map(card => card.name), names);
        assert.deepEqual(cards.map(card => card.badge), counts.map(String));
        assert(cards.every(card => card.action === 'View Detail'));
        assert.equal(await page.$$eval('#forYouGroupedContainer .notif-group-body, #forYouGroupedContainer .sheet-item-card', els => els.length), 0);
      }
      await page.click('.notification-status-tabs button:first-child');
      const option = value => `#notificationDocumentDialog input[value="${value}"]`;
      const groupCount = () => page.$$eval('.notif-category-card', els => els.length);
      assert.equal(await page.$('#docTypeDropdownMenu'), null, 'Old dropdown removed');
      await page.click('#notificationFilterButton');
      await page.click(option('Leave Request'));
      assert.equal(await groupCount(), 4, 'Draft selection does not change notifications');
      await page.click('.notification-filter-cancel');
      assert.equal(await groupCount(), 4, 'Cancel keeps previous selection');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'notificationFilterButton', 'Focus returns to Filter');
      await page.click('#notificationFilterButton');
      assert.equal(await page.$eval(option('all'), el => el.checked), true);
      await page.click(option('Leave Request'));
      await page.click(option('Medical Claim'));
      await page.click('.notification-filter-apply');
      assert.equal(await page.$eval('#notificationDocumentDialog', el => el.open), false);
      assert.deepEqual(await page.$$eval('.notif-category-card .group-count-badge', els => els.map(el => el.textContent)), ['1', '1']);
      assert.equal(await page.$eval('#notificationFilterButton', el => el.getAttribute('aria-label')), 'Filter notifications: 2 document types selected');
      assert.equal(await page.$eval('#notificationFilterButton', el => el.textContent.trim()), '', 'Filter button is icon-only');
      await page.click('#notificationFilterButton');
      await page.click(option('Overtime'));
      await page.keyboard.press('Escape');
      assert.equal(await groupCount(), 2, 'Escape discards draft');
      await page.click('#notificationFilterButton');
      assert.equal(await page.$eval(option('Overtime'), el => el.checked), false);
      assert.equal(await page.$eval(option('Leave Request'), el => el.checked), true);
      await page.click('.notification-filter-options-heading button');
      assert.equal(await groupCount(), 2, 'Reset is draft-only until Apply');
      await page.click('#notificationDocumentDialog .sheet-close-btn');
      assert.equal(await groupCount(), 2, 'Close discards reset');
      await page.click('#notificationFilterButton');
      await page.click(option('Overtime'));
      await page.mouse.click(2, 2);
      assert.equal(await page.$eval('#notificationDocumentDialog', el => el.open), false, 'Backdrop dismisses');
      assert.equal(await groupCount(), 2, 'Backdrop discards draft');
      await page.click('#notificationFilterButton');
      await page.click('.notification-filter-options-heading button');
      await page.click('.notification-filter-apply');
      assert.equal(await groupCount(), 4, 'Apply reset restores all Pending Approval categories');
      assert.equal(await page.$eval('#notificationFilterButton', el => el.classList.contains('has-filter')), false);
      // Every document type applies independently, and the status tabs still combine with it.
      for (const [type, name, status] of [
        ['Leave Request', 'Leave Requests', 'pending_approval'], ['Medical Claim', 'Medical & Expense Claims', 'pending_approval'],
        ['Overtime', 'Overtime & Shift Requests', 'pending_resubmit'], ['Change Request', 'Medical & Expense Claims', 'pending_resubmit'],
        ['Tax EA Form', 'Tax & Official Documents', 'pending_approval'], ['Performance Goal', 'Performance & KPI Goals', 'pending_approval']
      ]) {
        await page.click(`[data-for-you-tab="${status}"]`);
        await page.click('#notificationFilterButton');
        await page.click('.notification-filter-options-heading button');
        await page.click(option(type));
        await page.click('.notification-filter-apply');
        assert.deepEqual(await page.$$eval('.notif-category-card', els => els.map(el => [el.querySelector('.group-title-text').textContent, el.querySelector('.group-count-badge').textContent])), [[name, '1']]);
      }
      await page.click('[data-for-you-tab="pending_resubmit"]');
      assert.equal(await groupCount(), 0);
      assert.equal(await page.$eval('#forYouEmptyState', el => el.getClientRects().length > 0), true);
      await page.click('.notification-status-tabs button:first-child');
      await page.click('#notificationFilterButton');
      await page.click('.notification-filter-options-heading button');
      await page.click('.notification-filter-apply');
      for (const width of [320, 360, 390, 420]) {
        await page.setViewport({ width, height: 844 });
        await page.waitForFunction(() => {
          const tabs = document.querySelector('.notification-status-tabs');
          return tabs.scrollWidth <= tabs.clientWidth;
        });
        const fits = await page.$$eval('.notif-category-card', els => els.every(el => {
          const bounds = el.getBoundingClientRect();
          return bounds.height >= 76 && el.scrollWidth <= el.clientWidth
            && [...el.querySelectorAll('span')].every(child => {
              const rect = child.getBoundingClientRect();
              return rect.right <= bounds.right && rect.left >= bounds.left;
            });
        }));
        assert(fits, `${theme} ${width}px cards fit`);
        assert.equal(await page.$eval('#forYouOverlay .sheet-header', el => el.scrollWidth <= el.clientWidth), true, 'Header filter button fits');
        await page.click('#notificationFilterButton');
        assert.equal(await page.$eval('#notificationDocumentDialog', el => {
          const bounds = el.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth && el.scrollWidth <= el.clientWidth;
        }), true, 'Dialog fits viewport');
        await page.click('.notification-filter-cancel');
      }
      await page.setViewport({ width: 320, height: 480 });
      await page.click('#notificationFilterButton');
      assert.equal(await page.$eval('#notificationDocumentDialog', el => el.open), true, 'Dialog opens on short screens');
      assert.equal(await page.$eval('.notification-filter-apply', el => {
        const bounds = el.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= innerHeight;
      }), true, 'Apply stays reachable on short screens');
      await page.click('.notification-filter-cancel');
      await page.setViewport({ width: 390, height: 844 });
      await page.mouse.move(0, 0);
      await page.evaluate(() => Promise.all([...document.querySelectorAll('.notif-category-card')].flatMap(el => el.getAnimations().map(animation => animation.finished.catch(() => {})))));
      await (await page.$('#forYouOverlay .indicators-sheet')).screenshot({ path: `scratch/notification-category-${theme}.png` });
      await page.click('#notificationFilterButton');
      await page.click(option('Leave Request'));
      await page.click(option('Medical Claim'));
      await (await page.$('#notificationDocumentDialog')).screenshot({ path: `scratch/notification-filter-dialog-${theme}.png` });
      await page.click('.notification-filter-cancel');
      for (let i = 0; i < destinations.length; i++) {
        if (i) await openNotifications(page, url);
        if (i === 2) await page.click('[data-for-you-tab="pending_resubmit"]');
        const card = `.notif-category-card[aria-label^="${destinations[i][0]},"]`;
        // Verify actual navigation, including native keyboard activation.
        if (i === 0) {
          await page.focus(card);
          await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.press('Enter')]);
        } else {
          await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(card)]);
        }
        const [, targetPath, approvalSelector, params = {}] = destinations[i];
        const targetUrl = new URL(page.url());
        assert(targetUrl.pathname.endsWith(`/${targetPath}`), `${destinations[i][0]} opens its approval page`);
        for (const [key, value] of Object.entries(params)) assert.equal(targetUrl.searchParams.get(key), value);
        await page.waitForSelector(approvalSelector, { visible: true });
        assert.equal(await page.$eval('html', el => el.dataset.theme), theme, 'Theme preserved on approval page');
        if (i === 0) {
          assert.equal(await page.$eval('#viewLeaveHub', el => el.getClientRects().length), 0, 'Leave landing page is hidden');
          assert.equal(await page.$eval('#tabApprovalLeave', el => el.classList.contains('active')), true, 'Leave approval tab is selected');
        }
        if (i === 2) assert.equal(await page.$eval('#viewMainDashboard', el => el.getClientRects().length), 0, 'Attendance landing page is hidden');
      }
      console.log(`PASS ${theme}: dialog draft/apply/cancel/reset/escape/backdrop, all document filters, five approval destinations, four widths and short-screen layout`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
