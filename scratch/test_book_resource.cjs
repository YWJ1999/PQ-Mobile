const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const storageKey = 'peoplehcm:workplace:book-resource:v1';
const url = theme => pathToFileURL(path.resolve(__dirname, '../modules/admin/options/book-resource.html')).href + '?theme=' + theme;
async function screenshot(page, filename) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect.getComputedTiming().endTime)).map(animation => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: path.resolve(__dirname, filename) });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(url(theme), { waitUntil: 'domcontentloaded' });
      await page.evaluate(key => localStorage.removeItem(key), storageKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.ok(await page.$('#bookingAdd'), 'Current Records must offer an Add icon');
      assert.equal(await page.$eval('#bookingEditor', n => n.hidden), true);
      assert.equal(await page.$$eval('#bookingRecords .history-card-item', n => n.length), 1);
      assert.equal(await page.$$eval('#bookingRecords .fa-chevron-right', n => n.length), 0);
      assert.equal(await page.$eval('.history-total-records-label', n => n.textContent.trim()), 'Record');
      assert.equal(await page.$eval('#bookingRecordCount', n => n.textContent.trim()), '1');
      assert.ok(await page.$eval('.history-total-records-card', n => n.getBoundingClientRect().width >= n.parentElement.getBoundingClientRect().width - 1), 'Total Records must use the shared full-width summary card');
      assert.ok(await page.$eval('#bookingRecordCount', n => n.classList.contains('history-total-records-value')), 'Total Records value must use the shared summary typography');
      assert.equal(await page.$$eval('#bookingRecords .booking-employee-name, #bookingRecords .booking-employee-id', n => n.length), 0, 'Book Resource cards must not repeat employee identity');
      await screenshot(page, `book-resource-records-${theme}-${width}.png`);
      await page.click('#bookingAdd');
      assert.equal(await page.$eval('#bookingAdd', n => n.getAttribute('aria-expanded')), 'true');
      assert.equal(await page.$eval('.booking-list-heading', n => n.getBoundingClientRect().height), 0, 'Form must not show the Current Records heading or Add icon');
      assert.equal(await page.$eval('#bookingRecords', n => n.getBoundingClientRect().height), 0, 'Form must not show record cards below its fields');
      assert.equal(await page.$eval('#bookingFeedback', n => n.getBoundingClientRect().height), 0, 'Record feedback belongs only to the list');
      await page.click('#bookingPlan');
      assert.equal(await page.$$eval('#bookingRecords .history-card-item', n => n.length), 1, 'Invalid forms must not save');
      await page.evaluate(() => {
        document.getElementById('bookingStartTime').value = '10:00';
        document.getElementById('bookingEndTime').value = '09:00';
      });
      await page.select('#bookingResource', 'selangor-room');
      await page.select('#bookingTask', 'meeting');
      await page.click('#bookingPlan');
      assert.match(await page.$eval('#bookingFormFeedback', n => n.textContent), /End Time/);
      await page.$eval('#bookingEndTime', n => { n.value = '11:00'; n.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.type('#bookingPurpose', '<script>alert(1)</script> Team discussion');
      await page.type('#bookingMeetingRef', 'MEET-001');
      await page.type('#bookingRemarks', 'Bring agenda');
      await screenshot(page, `book-resource-form-${theme}-${width}.png`);
      await page.click('#bookingPlan');
      assert.equal(await page.$eval('#bookingEditor', n => n.hidden), true);
      assert.ok(await page.$eval('.booking-list-heading', n => n.getBoundingClientRect().height) > 0, 'Submitting returns to Current Records');
      assert.equal(await page.$$eval('[data-booking-status="plan"]', n => n.length), 1);
      assert.equal(await page.$$eval('[data-booking-status="plan"] [data-booking-action]', n => n.length), 2);
      assert.equal(await page.$$eval('#bookingRecords script', n => n.length), 0);
      assert.doesNotMatch(await page.$eval('[data-booking-status="plan"]', n => n.textContent), /Meeting Ref|MEET-001/i, 'Meeting reference must not appear on the record card');
      await page.click('[data-booking-status="plan"] .history-card-details');
      assert.equal(await page.$eval('#bookingDetailsDialog', n => !n.hidden), true, 'Clicking a record card must open its details');
      const detailDesign = await page.$eval('#bookingDetailsDialog', overlay => {
        const panel = overlay.querySelector('.detail-popout-panel');
        const header = overlay.querySelector('.detail-popout-header');
        const body = overlay.querySelector('.detail-popout-body');
        const firstLabel = overlay.querySelector('.detail-popout-label');
        return {
          tag: overlay.tagName,
          overlayDisplay: getComputedStyle(overlay).display,
          overlayAlign: getComputedStyle(overlay).alignItems,
          panelClass: panel?.classList.contains('detail-popout-panel'),
          headerBackground: header ? getComputedStyle(header).backgroundImage : '',
          bodyOverflow: body ? getComputedStyle(body).overflowY : '',
          labelBackground: firstLabel ? getComputedStyle(firstLabel).backgroundColor : '',
          valueBackground: firstLabel?.nextElementSibling ? getComputedStyle(firstLabel.nextElementSibling).backgroundColor : ''
        };
      });
      assert.equal(detailDesign.tag, 'DIV');
      assert.equal(detailDesign.overlayDisplay, 'flex');
      assert.equal(detailDesign.overlayAlign, 'center');
      assert.equal(detailDesign.panelClass, true);
      assert.match(detailDesign.headerBackground, /gradient/i);
      assert.match(detailDesign.bodyOverflow, /auto|scroll/);
      assert.notEqual(detailDesign.labelBackground, detailDesign.valueBackground);
      assert.deepEqual(await page.$$eval('#bookingDetailsContent .detail-popout-label', nodes => nodes.map(node => node.textContent.trim())), ['References', 'Emp #', 'Name', 'Booking Date', 'Start', 'End', 'Meeting Room #', 'Resource', 'Task', 'Status', 'Purpose', 'Remark']);
      const detailValues = await page.$$eval('#bookingDetailsContent .detail-popout-value', nodes => nodes.map(node => node.textContent.trim()));
      assert.equal(detailValues[0], 'MEET-001');
      assert.equal(detailValues[1], '#EBB12');
      assert.equal(detailValues[2], 'Farhan binti rahmat');
      assert.equal(detailValues[4], '10:00');
      assert.equal(detailValues[5], '11:00');
      assert.equal(detailValues[6], 'MR-01');
      assert.equal(detailValues[7], 'SELANGOR ROOM');
      assert.equal(detailValues[8], 'Meeting');
      assert.equal(detailValues[9], 'Plan');
      assert.match(detailValues[10], /Team discussion/);
      assert.equal(detailValues[11], 'Bring agenda');
      await screenshot(page, `book-resource-details-${theme}-${width}.png`);
      await page.click('#bookingDetailsClose');
      assert.equal(await page.$eval('#bookingDetailsDialog', n => n.hidden), true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$$eval('#bookingRecords .history-card-item', n => n.length), 2);
      assert.equal(await page.$eval('#bookingRecordCount', n => n.textContent.trim()), '2');
      await screenshot(page, `book-resource-plan-${theme}-${width}.png`);
      await page.click('[data-booking-action="confirm"]');
      assert.equal(await page.$eval('#bookingDetailsDialog', n => n.hidden), true, 'Card action buttons must not open details');
      assert.equal(await page.$$eval('[data-booking-action="confirm"]', n => n.length), 0);
      assert.equal(await page.$$eval('[data-booking-status="confirmed"]', n => n.length), 2);
      await page.click('#bookingAdd');
      await page.evaluate(() => {
        document.getElementById('bookingStartTime').value = '12:00';
        document.getElementById('bookingEndTime').value = '13:00';
      });
      await page.select('#bookingResource', 'selangor-room');
      await page.select('#bookingTask', 'meeting');
      await page.click('#bookingBook');
      assert.equal(await page.$$eval('[data-booking-status="confirmed"]', n => n.length), 3);
      assert.equal(await page.$$eval('[data-booking-action="confirm"]', n => n.length), 0);
      assert.ok(await page.$$eval('[data-booking-action="delete"]', buttons => buttons.length > 0 && buttons.every(button => button.classList.contains('history-submit-btn') && !button.classList.contains('history-cancel-btn'))), 'Card Delete buttons must use the shared purple action style');
      assert.equal(await page.$eval('.admin-content', n => n.scrollWidth > n.clientWidth), false);
      assert.equal(await page.$$eval('#bookingRecords .booking-employee-name, #bookingRecords .booking-employee-id', n => n.length), 0);
      while (await page.$('[data-booking-action="delete"]')) await page.click('[data-booking-action="delete"]');
      assert.equal(await page.$eval('#bookingEmpty', n => n.hidden), false);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$$eval('#bookingRecords .history-card-item', n => n.length), 0, 'Deleted records must not reseed');
      await page.click('#bookingAdd');
      assert.equal(await page.$eval('#bookingEmpty', n => n.getBoundingClientRect().height), 0, 'Empty list message must not appear on the form');
      await page.click('#bookingCancel');
      assert.equal(await page.$eval('#bookingEditor', n => n.hidden), true);
      assert.ok(await page.$eval('.booking-list-heading', n => n.getBoundingClientRect().height) > 0);
      await page.click('#bookingAdd');
      await page.click('.admin-back');
      assert.equal(page.url(), url(theme), 'Header Back exits the form before leaving Workplace');
      assert.equal(await page.$eval('#bookingEditor', n => n.hidden), true);
      await page.click('#bookingAdd');
      await page.evaluate(() => {
        document.getElementById('bookingStartTime').value = '10:00';
        document.getElementById('bookingEndTime').value = '11:00';
        window.originalBookingSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'peoplehcm:workplace:book-resource:v1') throw new Error('Storage full');
          return window.originalBookingSetItem.call(this, key, value);
        };
      });
      await page.select('#bookingResource', 'selangor-room');
      await page.select('#bookingTask', 'meeting');
      await page.type('#bookingPurpose', 'Keep this form');
      await page.click('#bookingPlan');
      assert.match(await page.$eval('#bookingFormFeedback', n => n.textContent), /Unable to save/);
      assert.equal(await page.$eval('#bookingPurpose', n => n.value), 'Keep this form');
      assert.equal(await page.$eval('#bookingEditor', n => n.hidden), false);
      assert.equal(await page.$$eval('#bookingRecords .history-card-item', n => n.length), 0);
      await page.evaluate(() => { Storage.prototype.setItem = window.originalBookingSetItem; });
      await page.click('#bookingPlan');
      assert.equal(await page.$$eval('[data-booking-status="plan"]', n => n.length), 1, 'Retry saves once');
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.click('#bookingAdd');
      assert.equal(await page.$eval('#bookingEditor', n => getComputedStyle(n).animationName), 'none');
      await page.click('#bookingCancel');
      await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.match(await page.$eval('#bookingFeedback', n => n.textContent), /Unable to load/);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '{broken', 'Corrupt records must not be overwritten');
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: Add, validation, Plan, Confirm, Book, Delete, persistence, safe text, identity removal, shared total card, layout, storage errors, save retry, reduced motion`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
