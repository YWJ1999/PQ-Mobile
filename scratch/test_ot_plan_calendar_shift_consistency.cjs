const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const otPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;
const shiftPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

async function readCalendarStyles(page) {
  return page.evaluate(() => {
    const read = (selector, properties) => {
      const element = document.querySelector(selector);
      const styles = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, styles[property]]));
    };

    return {
      pageHeader: read('#view-main > .shift-top-header', ['height', 'padding']),
      statusBar: read('#view-main > .shift-top-header .status-bar', ['height', 'padding']),
      card: read('.grid-cal-card', ['padding', 'borderRadius', 'boxShadow']),
      header: read('.grid-cal-header', ['marginBottom', 'gap', 'alignItems']),
      legend: read('.grid-cal-legend', ['display', 'gap', 'marginTop']),
      staffDot: read('.grid-cal-legend .staff', ['width', 'backgroundColor']),
      hoursDot: read('.grid-cal-legend .hours', ['width', 'backgroundColor']),
      navigation: read('.grid-cal-nav-btn', ['width', 'height', 'borderRadius']),
      weekdays: read('.grid-cal-weekdays', ['marginBottom']),
      days: read('.grid-cal-days', ['gap', 'backgroundColor']),
      cell: read('.grid-cal-cell:not(.empty)', ['minHeight', 'borderRadius']),
      selected: read('.grid-cal-cell.selected', ['borderRadius', 'boxShadow']),
      summary: read('#calSummaryCard', ['padding', 'borderRadius', 'backgroundColor']),
      summaryHeader: read('.cal-summary-header', ['alignItems', 'justifyContent']),
      label: read('.cal-summary-stat-label', ['fontSize', 'color']),
      value: read('.cal-summary-stat-val', ['fontSize', 'color']),
      accent: read('.cal-summary-stat:is(.is-ot-plan, .is-total) .cal-summary-stat-val', ['color'])
    };
  });
}

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
    await page.setViewport({ width: 390, height: 900 });
    await page.goto(shiftPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabCalendarBtn');
    const shiftCalendarStyles = await readCalendarStyles(page);

    await page.goto(otPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabCalendarBtn');

    assert.ok(await page.$('#calendarTabView .grid-cal-month'));
    assert.deepEqual(await page.$$eval('.grid-cal-legend li', items => items.map(item => item.textContent)), ['Staff', 'Scheduled hours']);
    assert.deepEqual(await page.$$eval('.grid-cal-header button', buttons => buttons.map(button => button.getAttribute('aria-label'))), ['Previous month', 'Next month']);
    assert.deepEqual(
      await page.$$eval('#calendarTabView .grid-cal-weekday', days => days.map(day => day.textContent.trim())),
      ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    );
    assert.deepEqual(await readCalendarStyles(page), shiftCalendarStyles);
    assert.deepEqual(
      await page.$$eval('#calSummaryCard .cal-summary-stat-label', labels => labels.map(label => label.textContent.trim())),
      ['Approved OT', 'Pending OT', 'Total OT']
    );
    assert.deepEqual(await page.$$eval('#calSummaryCard .cal-summary-stat-val', values => values.map(value => value.textContent)), ['28 / 45.00', '45 / 82.00', '73 / 127.00']);
    assert.ok(await page.$$eval('#calSummaryCard .cal-summary-stat', buttons => buttons.every(button => {
      const label = button.querySelector('.cal-summary-stat-label').getBoundingClientRect();
      const value = button.querySelector('.cal-summary-stat-val').getBoundingClientRect();
      return label.bottom <= value.top;
    })));

    await page.click('#gridCalDays [aria-label^="5 September"]');
    assert.equal(await page.$eval('#calSummaryStaff', node => node.textContent), '78 staff');
    await page.click('[data-grid-month="next"]');
    assert.equal(await page.$eval('#gridCalTitle', node => node.textContent), 'October 2026');
    assert.equal(await page.$eval('#gridCalDays .selected .grid-cal-date', node => node.textContent), '5');
    await page.click('[aria-label="Next Date"]');
    assert.equal(await page.$eval('#calSummaryTitle', node => node.textContent), 'Tue, 06 Oct 2026');
    for (const [kind, dateId] of [['approved', 'approvedOtSummaryDateFilter'], ['pending', 'pendingOtSummaryDateFilter'], ['total', 'otSummaryDateFilter']]) {
      await page.click('#calSummaryCard .is-' + kind);
      assert.equal(await page.$eval('#' + dateId, node => node.textContent), '06 Oct 2026');
      await page.click('.view-container.active [aria-label="Back"]');
    }
    assert.equal(await page.$eval('#calSummaryStaff', node => node.textContent), '287 staff');
    assert.deepEqual(errors, []);

    console.log('OT Plan calendar matches Shift Plan calendar design.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
