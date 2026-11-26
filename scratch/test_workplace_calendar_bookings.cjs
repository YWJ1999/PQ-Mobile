const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const key = 'peoplehcm:workplace:book-resource:v1';
const sampleKey = 'peoplehcm:workplace:book-resource:calendar-samples:v1';
const url = file => pathToFileURL(path.resolve(__dirname, '../modules/admin/' + file)).href;
const day = date => `#workplaceCalendarGrid [data-date="${date}"]`;
const modal = '#workplaceBookingDetails';

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.evaluateOnNewDocument(() => {
        const NativeDate = Date;
        window.Date = class extends NativeDate {
          constructor(...args) { super(...(args.length ? args : ['2026-10-08T12:00:00+08:00'])); }
        };
      });
      await page.goto(url('options/book-resource.html') + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      const ids = await page.evaluate((storageKey, marker) => {
        localStorage.setItem(storageKey, '[]');
        localStorage.setItem(marker, '1');
        const input = { date: '2026-10-08', startTime: '09:00', endTime: '10:00', resource: 'selangor-room', task: 'meeting', purpose: '<script>unsafe()</script> Team meeting', meetingRef: 'MEET-001', remarks: 'Bring agenda' };
        return [
          window.BookResourceStore.save(input, 'plan').id,
          window.BookResourceStore.save({ ...input, resource: 'projector', startTime: '11:00', endTime: '12:00' }, 'confirmed').id,
          window.BookResourceStore.save({ ...input, date: '2026-10-09', resource: 'meeting-room' }, 'plan').id
        ];
      }, key, sampleKey);
      await page.goto(url('index.html') + '?theme=' + theme, { waitUntil: 'load' });
      assert.equal(await page.$eval('#workplaceCalendarTitle', node => node.textContent.trim()), 'Book Resource Calendar');
      assert.equal(await page.$eval(day('2026-10-08') + ' .workplace-booking-count', n => n.textContent), '2', 'Calendar uses actual shared Book Resource records');
      assert.equal(await page.$eval(day('2026-10-09') + ' .workplace-booking-count', n => n.textContent), '1');
      assert.equal(await page.$(day('2026-10-10') + ' .workplace-booking-count'), null);
      await page.click('#workplaceCalendarFilterTrigger');
      assert.equal(await page.$eval('#workplaceCalendarFilterOverlay', node => node.hidden), false);
      assert.deepEqual(
        await page.$$eval('#workplaceCalendarFilterForm label', nodes => nodes.map(node => node.textContent.trim())),
        ['Resource', 'Start Time', 'End Time', 'Show']
      );
      assert.deepEqual(
        await page.$$eval('#workplaceCalendarFilterResource option', nodes => nodes.map(node => [node.value, node.textContent.trim()])),
        [['', 'All Resources'], ['selangor-room', 'SELANGOR ROOM'], ['meeting-room', 'MEETING ROOM'], ['projector', 'PROJECTOR']]
      );
      assert.deepEqual(
        await page.$$eval('#workplaceCalendarFilterShow option', nodes => nodes.map(node => [node.value, node.textContent.trim()])),
        [['', 'All Bookings'], ['plan', 'Plan'], ['confirmed', 'Confirmed']]
      );
      await page.select('#workplaceCalendarFilterResource', 'projector');
      await page.$eval('#workplaceCalendarFilterStartTime', node => { node.value = '10:30'; });
      await page.$eval('#workplaceCalendarFilterEndTime', node => { node.value = '12:30'; });
      await page.select('#workplaceCalendarFilterShow', 'confirmed');
      await page.click('#workplaceCalendarApplyFilter');
      assert.match(await page.$eval('#workplaceCalendarFilterSummary', node => node.textContent), /PROJECTOR.*10:30.*12:30.*Confirmed/);
      assert.equal(await page.$eval(day('2026-10-08') + ' .workplace-booking-count', n => n.textContent), '1');
      assert.equal(await page.$(day('2026-10-09') + ' .workplace-booking-count'), null);
      await page.$eval(day('2026-10-08'), node => node.scrollIntoView({ block: 'center' }));
      await page.click(day('2026-10-08') + ' .workplace-booking-count');
      assert.equal(await page.$$eval(modal + ' [data-record-id]', nodes => nodes.length), 1);
      assert.match(await page.$eval(modal, node => node.textContent), /PROJECTOR/);
      await page.keyboard.press('Escape');
      await page.click('#workplaceCalendarFilterTrigger');
      await page.click('#workplaceCalendarResetFilter');
      await page.click('#workplaceCalendarApplyFilter');
      assert.equal(await page.$eval('#workplaceCalendarFilterSummary', node => node.textContent.trim()), 'All Resources • All Times • All Bookings');
      assert.equal(await page.$eval(day('2026-10-08') + ' .workplace-booking-count', n => n.textContent), '2');
      assert.equal(await page.$eval(day('2026-10-09') + ' .workplace-booking-count', n => n.textContent), '1');
      const calendarStyle = await page.$$eval('#workplaceCalendarGrid button:not(.other-month)', nodes => nodes.map(n => {
        const date = n.querySelector('.cal-date-num');
        const cellBounds = n.getBoundingClientRect();
        return { today: n.classList.contains('is-today'), color: getComputedStyle(date).color, height: cellBounds.height, dateOffset: date.getBoundingClientRect().top - cellBounds.top };
      }));
      assert.equal(calendarStyle.find(cell => cell.today).color, 'rgb(255, 255, 255)', 'Today remains readable on its purple circle when selected and booked');
      assert.ok(Math.max(...calendarStyle.map(cell => cell.height)) - Math.min(...calendarStyle.map(cell => cell.height)) <= 1, 'Booking badges must not enlarge one calendar row');
      assert.ok(Math.max(...calendarStyle.map(cell => cell.dateOffset)) - Math.min(...calendarStyle.map(cell => cell.dateOffset)) <= 2, 'Dates align consistently with and without booking counts');
      await page.$eval('#workplaceCalendar', n => n.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.resolve(__dirname, `workplace-calendar-bookings-${theme}-${width}.png`) });
      await page.click(day('2026-10-08') + ' .workplace-booking-count');
      assert.equal(await page.$eval(modal, n => n.open), true);
      assert.equal(await page.$$eval(modal + ' [data-record-id]', n => n.length), 2);
      assert.match(await page.$eval(modal, n => n.textContent), /SELANGOR ROOM/);
      assert.match(await page.$eval(modal, n => n.textContent), /09:00.*10:00.*Meeting.*MEET-001.*Bring agenda/s);
      assert.equal(await page.$$eval(modal + ' dt', nodes => nodes.filter(node => node.textContent.trim() === 'Booking Date').length), 0, 'Detail cards must not repeat the date already shown by the sheet heading');
      assert.equal(await page.$$eval(modal + ' script, ' + modal + ' .fa-chevron-right', n => n.length), 0);
      assert.match(await page.$eval(modal + ' .booking-employee-name', n => n.textContent), /^EBB12 - .+/);
      const plan = `${modal} [data-record-id="${ids[0]}"]`;
      assert.equal(await page.$$eval(plan + ' button', n => n.map(button => button.textContent.trim()).join(',')), 'Confirm,Delete', 'Plan bookings offer both confirmation and deletion');
      const booked = `${modal} [data-record-id="${ids[1]}"]`;
      assert.equal(await page.$$eval(booked + ' button', n => n.map(button => button.textContent.trim()).join(',')), 'Delete');
      const deleteStyle = await page.$eval(booked + ' [data-booking-action="delete"]', button => {
        const style = getComputedStyle(button);
        return { backgroundImage: style.backgroundImage, color: style.color };
      });
      assert.match(deleteStyle.backgroundImage, /rgb\(124, 58, 237\).*rgb\(109, 40, 217\)/, 'Booking detail Delete uses the consistent purple action gradient');
      assert.equal(deleteStyle.color, 'rgb(255, 255, 255)');
      await page.screenshot({ path: path.resolve(__dirname, `workplace-calendar-booking-details-${theme}-${width}.png`) });

      await page.evaluate(() => {
        window.restoreStorageWrite = Storage.prototype.setItem;
        Storage.prototype.setItem = () => { throw new Error('Quota exhausted'); };
      });
      await page.click(plan + ' [data-booking-action="confirm"]');
      assert.match(await page.$eval('#workplaceBookingFeedback', n => n.textContent), /Unable/);
      assert.equal(await page.evaluate(id => window.BookResourceStore.list().find(row => row.id === id).status, ids[0]), 'plan');
      await page.click(plan + ' [data-booking-action="delete"]');
      assert.match(await page.$eval('#workplaceBookingFeedback', n => n.textContent), /Unable/);
      assert.equal(await page.evaluate(id => window.BookResourceStore.list().find(row => row.id === id).status, ids[0]), 'plan', 'Failed deletion preserves the Plan booking');
      await page.evaluate(() => { Storage.prototype.setItem = window.restoreStorageWrite; });
      await page.click(plan + ' [data-booking-action="confirm"]');
      assert.equal(await page.$$eval(plan + ' button', n => n.map(button => button.textContent.trim()).join(',')), 'Delete');
      assert.equal(await page.evaluate(id => window.BookResourceStore.list().find(row => row.id === id).status, ids[0]), 'confirmed');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval(modal, n => n.open), false);
      await page.waitForFunction(() => document.activeElement.dataset.date === '2026-10-08');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2026-10-08');

      await page.goto(url('options/book-resource.html') + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval(`[data-record-id="${ids[0]}"]`, n => n.dataset.bookingStatus), 'confirmed', 'Calendar confirmation updates Book Resource');
      await page.goto(url('index.html') + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      await page.$eval(day('2026-10-08'), node => node.scrollIntoView({ block: 'center' }));
      await page.click(day('2026-10-08'));
      const reopenedIds = await page.$$eval(modal + ' [data-record-id]', nodes => nodes.map(node => node.dataset.recordId));
      const storedIds = await page.evaluate(() => window.BookResourceStore.list().map(row => row.id));
      assert.ok(reopenedIds.includes(ids[0]), `Confirmed booking must reopen from Calendar details. Modal: ${reopenedIds.join(', ')}; store: ${storedIds.join(', ')}`);
      await page.click(plan + ' [data-booking-action="delete"]');
      assert.equal(await page.$eval(day('2026-10-08') + ' .workplace-booking-count', n => n.textContent), '1');
      await page.click(booked + ' [data-booking-action="delete"]');
      assert.equal(await page.$eval(modal, n => n.open), false, 'Deleting the final booking closes its detail sheet');
      assert.equal(await page.$(day('2026-10-08') + ' .workplace-booking-count'), null);
      await page.click(day('2026-10-08'));
      assert.equal(await page.$eval(modal, n => n.open), false, 'Empty dates do not show stale booking details');
      await page.click(day('2026-10-09'));
      await page.setViewport({ width, height: 640 });
      await page.waitForFunction(() => document.getElementById('workplaceBookingDetails').getBoundingClientRect().bottom <= window.innerHeight);
      assert.ok(await page.$eval(modal + ' .attendance-schedule-info-panel', n => n.scrollWidth <= n.clientWidth));
      assert.ok(await page.$eval(modal, n => n.getBoundingClientRect().bottom <= window.innerHeight));
      await page.click(`${modal} [data-booking-action="delete"]`);
      assert.equal(await page.evaluate(id => window.BookResourceStore.list().some(row => row.id === id), ids[2]), false, 'Plan bookings can be deleted directly without confirmation');
      assert.equal(await page.$eval(modal, n => n.open), false, 'Deleting the final Plan booking closes its detail sheet');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$$eval('#workplaceCalendarGrid .workplace-booking-count', n => n.length), 0, 'Deleted bookings remain deleted on reload');

      await page.evaluate(storageKey => {
        localStorage.setItem(storageKey, '{corrupt');
        window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
      }, key);
      assert.equal(await page.$eval('#workplaceCalendarError', n => n.hidden), false);
      await page.evaluate(storageKey => {
        localStorage.setItem(storageKey, '[]');
        window.BookResourceStore.save({ date: '2026-10-08', startTime: '10:00', endTime: '11:00', resource: 'projector', task: 'presentation' }, 'confirmed');
        window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
      }, key);
      assert.equal(await page.$eval(day('2026-10-08') + ' .workplace-booking-count', n => n.textContent), '1', 'Storage updates refresh booking counts');
      assert.equal(await page.$eval('#workplaceCalendarError', n => n.hidden), true);
      const existing = await page.evaluate(() => window.BookResourceStore.list()[0]);
      await page.evaluate((storageKey, marker) => {
        localStorage.removeItem(marker);
        window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
      }, key, sampleKey);
      assert.ok(await page.$$eval('#workplaceCalendarGrid .has-bookings:not(.other-month)', n => n.length) >= 8, 'Additional dates have real example bookings');
      assert.deepEqual(await page.evaluate(id => window.BookResourceStore.list().find(row => row.id === id), existing.id), existing);
      const populatedCount = await page.evaluate(() => window.BookResourceStore.list().length);
      await page.setViewport({ width, height: 950 });
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.evaluate(() => window.BookResourceStore.list().length), populatedCount, 'Reload does not duplicate examples');
      await page.$eval('#workplaceCalendar', n => n.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.resolve(__dirname, `workplace-calendar-populated-${theme}-${width}.png`) });
      await page.click(day('2026-10-09') + ' .workplace-booking-count');
      assert.equal(await page.$$eval(modal + ' [data-record-id]', n => n.length), 2);
      assert.equal(await page.$$eval(modal + ' [data-booking-action="confirm"]', n => n.length), 1);
      assert.equal(await page.$$eval(modal + ' [data-booking-action="delete"]', n => n.length), 2, 'Every booking card offers Delete regardless of status');
      await page.keyboard.press('Escape');
      await page.goto(url('options/book-resource.html') + '?theme=' + theme, { waitUntil: 'load' });
      assert.equal(await page.$$eval('#bookingRecords [data-record-id]', n => n.length), populatedCount, 'Calendar examples also appear in Book Resource');
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: booking counts, date details, Confirm/Delete, shared persistence, empty dates, write failures, storage refresh and mobile layout`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
