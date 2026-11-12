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
        assert.deepEqual(await page.$$eval('.main-content h2, .home-shift-label', nodes => nodes.map(node => node.textContent)), [
          'Good morning, Sarah', "Today's Shift", 'Action Required', 'Today', 'My Insights', 'Company Updates'
        ]);
        assert.equal(await page.$('.main-content :is(.shortcuts-grid, .home-shift button, .home-shift hr)'), null);
        assert.equal(await page.$eval('.home-shift-time', el => el.textContent), '09:00–18:00');
        assert.equal(await page.$eval('.greeting-sub', el => el.textContent), "Here's what matters today.");
        assert.deepEqual(await page.$$eval('[data-pending-status] .fy-title', nodes => nodes.map(node => node.textContent)), ['To approve', 'To update']);
        assert.deepEqual(await page.$$eval('[data-home-count]', nodes => nodes.map(node => Number(node.textContent))), [4, 3]);
        assert.ok(await page.$eval('.main-content', main => Math.abs(main.getBoundingClientRect().bottom
          - document.querySelector('.bottom-nav').getBoundingClientRect().top) <= 1), 'Home links scroll above the bottom tabs');
        assert.deepEqual(await page.$$eval('[data-reminder-type] .fy-description', nodes => nodes.map(node => node.textContent)), [
          '09:00–17:00', '18:00–20:00 · 2 hours'
        ]);
        assert.equal(await page.$eval('[data-home-notifications]', element => element.scrollWidth <= element.clientWidth), true);
        assert.deepEqual(await page.$$eval('[data-reminder-type]', nodes => nodes.map(node => [node.dataset.reminderType, node.tagName, !!node.querySelector('.update-chevron')])), [
          ['clocking', 'A', true], ['training', 'BUTTON', true], ['ot-plan', 'ARTICLE', false]
        ], 'OT is informational, Training opens a dialog, and Clocking navigates');
        assert.equal(await page.$$eval('[data-reminder-type] .fy-description', nodes => nodes.every(node => node.scrollWidth <= node.clientWidth)), true, 'Reminder copy fits beside the navigation chevrons');
        await page.$eval('[data-reminder-type="ot-plan"]', element => {
          const main = element.closest('.main-content');
          main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 30;
        });
        await page.click('[data-reminder-type="ot-plan"]');
        assert.equal(page.url(), url, 'OT Plan Reminder must not navigate');
        assert.equal(await page.$eval('[data-reminder-type="ot-plan"]', element => element.tabIndex), -1);
        assert.equal(await page.$eval('[data-reminder-type="ot-plan"]', element => getComputedStyle(element).cursor), 'default');

        const trainingReminder = '[data-reminder-type="training"]';
        await page.$eval(trainingReminder, element => {
          const main = element.closest('.main-content');
          main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 50;
          element.focus({ preventScroll: true });
        });
        const homeState = await page.evaluate(() => ({ historyLength: history.length, scrollTop: document.querySelector('.main-content').scrollTop }));
        const scheduleSettled = () => page.waitForFunction(() => {
          const sheet = document.querySelector('#trainingCalendarSheet .training-calendar-sheet');
          return sheet.parentElement.classList.contains('is-open')
            && !sheet.getAnimations().some(animation => animation.playState === 'running')
            && document.activeElement.id === 'trainingCalendarSheetClose';
        });
        const assertHomeRestored = async () => {
          assert.equal(page.url(), url, 'Training Schedule must stay on Home');
          const state = await page.evaluate(() => ({ historyLength: history.length, scrollTop: document.querySelector('.main-content').scrollTop, inert: document.querySelector('.main-content').inert, focusedReminder: document.activeElement.dataset.reminderType }));
          assert.equal(state.historyLength, homeState.historyLength);
          assert.ok(Math.abs(state.scrollTop - homeState.scrollTop) < 1, 'Closing preserves Home scroll position');
          assert.equal(state.inert, false);
          assert.equal(state.focusedReminder, 'training');
          assert.equal(await page.$eval('#trainingCalendarSheet', element => element.getAttribute('aria-hidden')), 'true');
        };
        await page.click(trainingReminder);
        await scheduleSettled();
        assert.equal(page.url(), url, 'Opening Training Schedule must not navigate');
        assert.equal(await page.$eval('#trainingCalendarSheetDate', element => element.textContent), '20 Oct 2026');
        assert.equal(await page.$eval('#trainingCalendarEvents .history-card-title', element => element.textContent), 'A01');
        assert.equal(await page.$eval('#trainingCalendarEvents .history-card-ref', element => element.textContent), 'Course: Microsoft 365 Productivity');
        assert.equal(await page.$eval('#trainingCalendarEvents .training-calendar-event-time strong', element => element.textContent), '9:00 AM – 5:00 PM');
        assert.equal(await page.$('#trainingCalendarSheetCancel'), null);
        assert.equal(await page.$eval('.main-content', element => element.inert), true);
        assert.equal(await page.$eval('phone-bottom-nav', element => element.inert), true);
        assert.equal(await page.$eval('.training-calendar-sheet', element => element.scrollWidth <= element.clientWidth), true);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'trainingCalendarSheetClose');
        await page.keyboard.down('Shift');
        await page.keyboard.press('Tab');
        await page.keyboard.up('Shift');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('training-calendar-detail')), true);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'trainingCalendarSheetClose');
        await page.click('#trainingCalendarSheetClose');
        await assertHomeRestored();
        await page.keyboard.press('Enter');
        await scheduleSettled();
        await page.keyboard.press('Escape');
        await assertHomeRestored();
        await page.keyboard.press('Space');
        await scheduleSettled();
        const backdrop = await page.$eval('#trainingCalendarSheet', element => { const rect = element.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + 40 }; });
        await page.mouse.click(backdrop.x, backdrop.y);
        await assertHomeRestored();

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

        await openCard('pending_approval');
        assert.deepEqual(await groupCounts(), [1, 1, 1, 1], 'Category badges show counts for Pending Approval');
        assert.equal(await page.$eval('.notification-status-tabs .active', element => element.dataset.forYouTab), 'pending_approval');

        await page.evaluate(() => { openApprovalDetailModal('notif_1'); actionApproveRequest(); });
        assert.deepEqual(await labels(), ['Pending Approval (3)', 'Pending Resubmit (3)']);
        assert.equal(await page.$eval(`${card('pending_approval')} [data-home-count]`, element => element.textContent), '3');
        assert.equal(await page.$$eval('[data-reminder-type]', nodes => nodes.length), 3, 'Reminders stay visible when pending counts change');
        await page.evaluate(() => { NOTIFICATIONS_CATALOG = []; renderForYouSheetUI(); });
        await close();
        await openCard('pending_approval');
        assert.equal(await page.$eval('#forYouEmptyState', element => getComputedStyle(element).display), 'block');
        assert.deepEqual(await labels(), ['Pending Approval (0)', 'Pending Resubmit (0)']);
        console.log(`PASS ${theme} ${width}px: shift, action counts, today's schedule, notification tabs, filter reset and empty state`);
      }
      await page.setViewport({ width: 390, height: 844 });
      for (const [type, destination, headingSelector, heading] of [
        ['clocking', 'modules/attendance/options/clocking.html', '.cal-top-header h1', 'Clocking']
      ]) {
        const url = pathToFileURL(path.resolve(__dirname, `../home${theme}.html`)).href;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const reminder = `[data-reminder-type="${type}"]`;
        await page.$eval(reminder, element => {
          element.scrollIntoView({ block: 'center' });
          element.focus({ preventScroll: true });
        });
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          theme === 'dark' ? page.keyboard.press('Enter') : page.click(reminder)
        ]);
        assert.ok(new URL(page.url()).pathname.endsWith('/' + destination));
        assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
        assert.equal(await page.$eval(headingSelector, element => element.textContent.trim()), heading);
        assert.equal(await page.$eval('html', element => element.dataset.theme), theme);
        await page.goBack({ waitUntil: 'domcontentloaded' });
        assert.equal(page.url(), url);
        assert.equal(await page.$$eval('[data-reminder-type]', nodes => nodes.length), 3);
        console.log(`PASS ${theme}: ${type} reminder opens ${heading} via ${theme === 'dark' ? 'keyboard' : 'click'}, preserves theme and supports browser Back`);
      }
      // Detail remains an explicit link after opening the schedule on Home.
      await page.goto(pathToFileURL(path.resolve(__dirname, `../home${theme}.html`)).href, { waitUntil: 'domcontentloaded' });
      await page.$eval('[data-reminder-type="training"]', element => element.scrollIntoView({ block: 'center' }));
      await page.click('[data-reminder-type="training"]');
      await page.waitForFunction(() => document.getElementById('trainingCalendarSheet').classList.contains('is-open') && !document.querySelector('.training-calendar-sheet').getAnimations().some(animation => animation.playState === 'running'));
      await page.focus('.training-calendar-detail');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.press('Enter')]);
      assert.ok(new URL(page.url()).pathname.endsWith('/modules/training-competency/options/training-request-details.html'));
      assert.equal(new URL(page.url()).searchParams.get('request'), 'microsoft-365-productivity');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
