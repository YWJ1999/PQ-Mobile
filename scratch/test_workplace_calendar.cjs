const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/admin/index.html')).href;
const cells = page => page.$$eval('#workplaceCalendarGrid button:not(.other-month)', nodes => nodes.map(node => node.dataset.date));
async function screenshot(page, name) {
  await page.$eval('#workplaceCalendar', node => node.scrollIntoView({ block: 'center' }));
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));
  await page.screenshot({ path: path.resolve(__dirname, name) });
}

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
          constructor(...args) { super(...(args.length ? args : ['2026-10-07T09:00:00+08:00'])); }
          static now() { return new NativeDate('2026-10-07T09:00:00+08:00').getTime(); }
        };
      });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      assert.ok(await page.$('#workplaceCalendar'), 'Workplace dashboard must include the Leave-style calendar');
      assert.equal(await page.$eval('#workplaceCalendarTitle', node => node.textContent.trim()), 'Book Resource Calendar', 'Calendar card must identify the booking feature it represents');
      assert.ok(await page.$eval('#workplaceCalendarTitle', node =>
        node.parentElement.id === 'workplaceCalendar'
        && node.nextElementSibling?.classList.contains('calendar-card')
        && node.parentElement.querySelector(':scope > .calendar-card')
        && !node.closest('.calendar-card')
      ), 'Book Resource Calendar title must sit outside the calendar card like My Leave Calendar');
      assert.equal(await page.$('.workplace-calendar-filter-summary'), null, 'Calendar must not have an external Current Filter card');
      assert.ok(await page.$eval('#workplaceCalendarFilterTrigger', node =>
        node.closest('.calendar-card')
        && node.parentElement.classList.contains('attendance-schedule-controls')
      ), 'Data Filter trigger must sit inside the Calendar controls');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'October 2026');
      assert.equal((await cells(page)).length, 31);
      assert.equal(await page.$eval('#workplaceCalendarGrid button:first-child', node => node.dataset.date), '2026-09-28', 'The calendar week begins on Monday');
      assert.equal(await page.$eval('#workplaceCalendarGrid .is-today', node => node.dataset.date), '2026-10-07');
      assert.equal(await page.$eval('#workplaceCalendarGrid .selected', node => node.dataset.date), '2026-10-07');
      assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth), 'Calendar must fit the mobile viewport');
      await screenshot(page, `workplace-calendar-${theme}-${width}.png`);

      await page.click('#workplaceCalendarNext');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'November 2026');
      assert.equal((await cells(page)).length, 30);
      await page.click('#workplaceCalendarNext');
      await page.click('#workplaceCalendarNext');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'January 2027', 'Month navigation must advance the year');
      await page.click('#workplaceCalendarPrevious');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'December 2026');
      for (let index = 0; index < 22; index++) await page.click('#workplaceCalendarPrevious');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'February 2025');
      assert.equal((await cells(page)).length, 28, 'February must not contain nonexistent dates');
      for (let index = 0; index < 12; index++) await page.click('#workplaceCalendarPrevious');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'February 2024');
      assert.equal((await cells(page)).length, 29, 'Leap-year February must include the 29th');
      await page.click('#workplaceCalendarGrid [data-date="2024-02-29"]');
      assert.equal(await page.$eval('#workplaceCalendarGrid .selected', node => node.dataset.date), '2024-02-29');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'March 2024');
      assert.equal(await page.$eval('#workplaceCalendarGrid .selected', node => node.dataset.date), '2024-03-01');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2024-03-01', 'Keyboard focus must follow date selection across a month boundary');
      await page.keyboard.press('ArrowUp');
      assert.equal(await page.$eval('#workplaceCalendarGrid .selected', node => node.dataset.date), '2024-02-23');
      await page.click('#workplaceCalendarGrid .other-month');
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'January 2024', 'Adjacent-month dates must open their own month');

      await page.click('#workplaceCalendarInfo');
      assert.equal(await page.$eval('#attendanceScheduleInfo', node => node.open), true);
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));
      await page.screenshot({ path: path.resolve(__dirname, `workplace-calendar-info-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('attendanceScheduleInfo').open);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'workplaceCalendarInfo');
      await page.click(`[data-set-theme="${theme === 'light' ? 'dark' : 'light'}"]`);
      assert.equal(await page.$eval('#workplaceCalendarMonth', node => node.textContent), 'January 2024', 'Theme switching must preserve calendar navigation');
      await page.setViewport({ width, height: 640 });
      await page.click('#workplaceCalendarGrid [data-date="2024-01-01"]');
      for (let index = 0; index < 4; index++) await page.keyboard.press('ArrowDown');
      assert.ok(await page.evaluate(() => {
        const focused = document.activeElement.getBoundingClientRect();
        const main = document.querySelector('main').getBoundingClientRect();
        const navigation = document.querySelector('.bottom-nav').getBoundingClientRect();
        return focused.top >= main.top && focused.bottom <= Math.min(main.bottom, navigation.top);
      }), 'Keyboard-selected dates must remain visible above the bottom navigation on short screens');
      await page.click('#workplaceCalendarInfo');
      assert.ok(await page.$eval('.attendance-schedule-info-panel', node => node.scrollWidth <= node.clientWidth), 'Info sheet fits short mobile viewports');
      await page.goto(url + '?scope=team&theme=' + theme, { waitUntil: 'domcontentloaded' });
      assert.ok(await page.$eval('#workplaceCalendar', node => node.getClientRects().length > 0));
      assert.deepEqual(errors, []);
      console.log(`PASS: Leave-style Workplace calendar, real month grid, year rollover, leap years, selection, keyboard navigation, Info, scope and theme, ${theme}, ${width}px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
