const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../leave.html')).href;
    const overlay = '#historyDetailsModalOverlay';
    const actions = '#historyDetailsActions';
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 844 });
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme;
        showLeaveSection('viewMyLeaveHistory');
      }, theme);
      for (const width of [320, 360, 390, 420]) {
        await page.setViewport({ width, height: 844 });
        for (const tab of ['leave', 'credit', 'offtime']) {
          await page.evaluate(tab => switchHistoryTab(tab), tab);
          const cards = await page.$$eval('#myHistoryCardsList .history-item-card', nodes => nodes.map(node => ({
            ref: node.dataset.ref,
            status: node.dataset.status,
            buttons: [...node.querySelectorAll('button')].map(button => button.textContent.trim())
          })));
          assert.ok(cards.length);
          for (const card of cards) {
            const expected = tab === 'offtime' || !['draft', 'submitted', 'approved'].includes(card.status)
              ? [] : card.status === 'draft' ? ['Apply', 'Cancel'] : ['Cancel'];
            assert.deepEqual(card.buttons, expected);
            await page.evaluate(ref => openHistoryDetailsModal(ref), card.ref);
            const detailLabels = expected.length === 2 ? ['Apply', 'Delete Record'] : expected;
            assert.deepEqual(await page.$$eval(`${actions} button`, buttons => buttons.map(button => button.textContent.trim())), detailLabels,
              `${theme}/${width}/${card.ref}: record detail actions`);
            assert.equal(await page.$eval(actions, node => node.hidden), !expected.length);
            if (expected.length) {
              const layout = await page.$eval(actions, node => {
                const panel = node.closest('.history-details-dialog');
                const body = panel.querySelector('.history-details-body');
                body.scrollTop = body.scrollHeight;
                const footerStyle = getComputedStyle(node);
                const remove = node.querySelector('button.record-primary-action');
                const style = getComputedStyle(remove);
                const width = node.clientWidth - parseFloat(footerStyle.paddingLeft) - parseFloat(footerStyle.paddingRight);
                const first = node.firstElementChild.getBoundingClientRect();
                const last = remove.getBoundingClientRect();
                return {
                  directChild: node.parentElement === panel,
                  outsideScrollableBody: !body.contains(node),
                  background: style.backgroundImage,
                  colour: style.color,
                  icon: remove.querySelector('i[aria-hidden="true"]')?.className,
                  fullWidth: Math.abs(remove.offsetWidth - width) <= 1,
                  compactPair: Math.abs(first.top - last.top) <= 1 && last.left >= first.right + 6
                    && Math.abs(first.width - last.width) <= 1 && last.width <= 132
                    && Math.abs(first.height - last.height) <= 1 && last.height >= 40,
                  fits: panel.scrollWidth <= panel.clientWidth + 1
                };
              });
              assert.ok(layout.directChild && layout.outsideScrollableBody && layout.fits);
              assert.match(layout.icon, expected.length === 1 ? /fa-ban/ : /fa-trash-can/);
              assert.ok(expected.length === 2 ? layout.compactPair : layout.fullWidth, `${theme}/${width}/${card.ref}: action layout`);
              assert.match(layout.background, /rgb\(124, 58, 237\).*rgb\(109, 40, 217\)/);
              assert.equal(layout.colour, 'rgb(255, 255, 255)');
              if (width === 390 && tab === 'leave' && ['draft', 'submitted'].includes(card.status)) {
                await page.screenshot({ path: path.join(__dirname, `leave_history_details_${card.status}_${theme}.png`) });
              }
            }
            await page.evaluate(() => closeHistoryDetailsModal());
          }
        }
      }
      await page.evaluate(() => {
        switchHistoryTab('leave');
        openHistoryDetailsModal('LV-2026-0055');
        const body = document.querySelector('.history-details-body');
        body.scrollTop = body.scrollHeight;
      });
      await page.click(`${actions} button:first-child`);
      await page.waitForFunction(() => HISTORY_LEAVE_DATA[0].status === 'submitted');
      assert.deepEqual(await page.$$eval(`${actions} button`, buttons => buttons.map(button => button.textContent.trim())), ['Cancel']);
      assert.match(await page.$eval('#historyDetailsTableBody', node => node.textContent), /Submitted/);
      assert.deepEqual(await page.$$eval('#myHistoryCardsList [data-ref="LV-2026-0055"] button', buttons => buttons.map(button => button.textContent.trim())), ['Cancel']);

      page.once('dialog', dialog => dialog.dismiss());
      await page.click(`${actions} button`);
      assert.equal(await page.evaluate(() => HISTORY_LEAVE_DATA[0].status), 'submitted');
      assert.equal(await page.$eval(overlay, node => getComputedStyle(node).display), 'flex');
      page.once('dialog', dialog => dialog.accept());
      await page.click(`${actions} button`);
      await page.waitForFunction(() => HISTORY_LEAVE_DATA[0].status === 'cancelled');
      assert.equal(await page.$$eval(`${actions} button`, nodes => nodes.length), 0);
      assert.equal(await page.$$eval('#myHistoryCardsList [data-ref="LV-2026-0055"] button', nodes => nodes.length), 0);
      assert.match(await page.$eval('#historyDetailsTableBody', node => node.textContent), /Cancelled/);

      // A delayed card action must never replace a different record opened meanwhile.
      await page.evaluate(() => {
        closeHistoryDetailsModal();
        cancelHistoryItem('LV-2026-0055', 'submitted');
        openHistoryDetailsModal('LV-2026-0041');
      });
      await page.waitForFunction(() => HISTORY_LEAVE_DATA[0].status === 'submitted');
      assert.match(await page.$eval('#historyDetailsTableBody', node => node.textContent), /LV-2026-0041/);

      await page.evaluate(() => {
        HISTORY_LEAVE_DATA[0].status = 'draft';
        renderHistoryCards();
        openHistoryDetailsModal('LV-2026-0055');
        window.__historyActionTimers = [];
        window.__historyActionOriginalSetTimeout = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) => {
          if (delay === 400) {
            window.__historyActionTimers.push(() => callback(...args));
            return 991;
          }
          return window.__historyActionOriginalSetTimeout(callback, delay, ...args);
        };
        cancelHistoryItem('LV-2026-0055', 'submitted');
        cancelHistoryItem('LV-2026-0055', 'submitted');
      });
      assert.equal(await page.evaluate(() => window.__historyActionTimers.length), 1, 'Duplicate Leave actions must schedule only one mutation');
      assert.equal(await page.$$eval(`${actions} button`, buttons => buttons.every(button => button.disabled)), true);
      assert.equal(await page.$$eval('#myHistoryCardsList [data-ref="LV-2026-0055"] button', buttons => buttons.every(button => button.disabled)), true);
      await page.evaluate(() => {
        window.__historyActionTimers.shift()();
        window.setTimeout = window.__historyActionOriginalSetTimeout;
      });
      assert.equal(await page.evaluate(() => HISTORY_LEAVE_DATA[0].status), 'submitted');
      assert.equal(await page.$$eval(`${actions} button`, buttons => buttons.every(button => !button.disabled)), true);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Leave History pairs share a compact row and single Cancel uses the full footer in both themes at four widths. Apply and cancellation update both views.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
