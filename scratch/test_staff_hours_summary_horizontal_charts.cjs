const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const cases = [
  { title: 'Scheduled Work Days', count: 8, first: '22 Days', days: true, daily: [22, '1 Day'] },
  { title: 'Normal Present Days', count: 8, first: '22 Days', days: true, daily: [22, '1 Day'] },
  { title: 'Normal Work Hours', count: 8, first: '176.00 Hrs', daily: [22, '8.00 Hrs'] },
  { title: 'Odd Clocking Days', count: 5, first: '1 Day', days: true },
  { title: 'Normal OT Hours', count: 4, first: '24.00 Hrs' },
  { title: 'Other OT Hours', count: 1, first: '12.00 Hrs', daily: [6, '2.00 Hrs'] },
  { title: 'Unapproved OT Hours', count: 2, first: '12.00 Hrs' },
  { title: 'Planned OT Hours', count: 2, first: '8.00 Hrs' },
  { title: 'Absent OT Hours', count: 2, first: '0.01 Hrs' },
  { title: 'Absent Days', count: 5, first: '3 Days', days: true },
  { title: 'Leave Hours', count: 2, first: '16.00 Hrs' },
  { title: 'Lost Hours', count: 1, first: '4.00 Hrs' }
];

async function inspectChart(page, expected, daily = false) {
  assert.ok(await page.$('#view-chart .summary-chart-category-heading'), 'Chart shows a labeled employee/date axis');
  await page.waitForFunction(() => [...document.querySelectorAll('#view-chart .bar-fill')].every(bar => bar.style.width === bar.dataset.width));
  const actual = await page.$eval('#view-chart', chart => {
    const rows = [...chart.querySelectorAll('.bar-chart-item')];
    const [first] = rows;
    const name = first?.querySelector('.name');
    const track = first?.querySelector('.bar-track');
    const value = first?.querySelector('.val');
    const centerY = node => { const rect = node.getBoundingClientRect(); return rect.top + rect.height / 2; };
    return {
      label: chart.querySelector('.summary-chart-category-heading')?.textContent,
      unit: chart.querySelector('.summary-chart-value-heading')?.textContent,
      axis: chart.querySelector('.summary-chart-axis-label')?.textContent,
      ticks: [...chart.querySelectorAll('.summary-chart-tick')].map(node => Number(node.textContent)),
      gridlines: chart.querySelectorAll('.summary-chart-gridline').length,
      count: rows.length,
      first: value?.textContent,
      employeeId: name?.querySelector('.summary-chart-employee-id')?.textContent,
      year: name?.querySelector('.summary-chart-year')?.textContent,
      horizontal: Boolean(name && track && value && name.getBoundingClientRect().right <= track.getBoundingClientRect().left && track.getBoundingClientRect().right <= value.getBoundingClientRect().left && Math.abs(centerY(name) - centerY(track)) < 1 && Math.abs(centerY(value) - centerY(track)) < 1),
      widths: rows.map(row => parseFloat(row.querySelector('.bar-fill').style.width)),
      values: rows.map(row => parseFloat(row.querySelector('.val').textContent)),
      overflow: document.querySelector('.main-content').scrollWidth - document.querySelector('.main-content').clientWidth
    };
  });
  const context = `${expected.title} ${daily ? 'daily' : 'staff'}`;
  assert.equal(actual.label, daily ? 'DATE' : 'EMPLOYEE', `${context}: y axis label`);
  assert.equal(actual.unit, expected.days ? 'DAYS' : 'HOURS', context);
  assert.equal(actual.axis, `Total ${expected.title}`, `${context}: x axis label`);
  assert.equal(actual.count, daily ? expected.daily[0] : expected.count, context);
  assert.equal(actual.first, daily ? expected.daily[1] : expected.first, context);
  assert.ok(actual.horizontal, `${context}: label, bar and value align in one row`);
  assert.ok(actual.overflow <= 1, `${context}: fits the phone width`);
  assert.equal(actual.ticks[0], 0, context);
  assert.ok(actual.ticks.length >= 2 && actual.ticks.every(Number.isFinite), context);
  assert.equal(actual.gridlines, actual.ticks.length, `${context}: grid matches the x axis`);
  if (expected.days) assert.ok(actual.ticks.every(Number.isInteger), context);
  if (daily) assert.equal(actual.year, '2026', context);
  else assert.match(actual.employeeId, /^EBB\d+$/, 'The chart legend preserves the employee number');
  const maximum = actual.ticks.at(-1);
  for (let index = 0; index < actual.widths.length; index++) {
    assert.ok(Math.abs(actual.widths[index] - actual.values[index] / maximum * 100) < 0.02, `${context}: bar length matches the scale`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 920 });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/staff-hours-summary.html')).href, { waitUntil: 'domcontentloaded' });
      await page.click(`preview-top-bar [data-set-theme="${theme}"]`);
      await page.waitForFunction(() => document.querySelector('.phone-container').getAnimations({ subtree: true }).every(animation => !(animation instanceof CSSTransition)), { timeout: 2000 });
      const sourceData = await page.evaluate(() => JSON.stringify(sampleStaffData));
      for (const [index, expected] of cases.entries()) {
        await page.$$eval('.summary-kpi-card', (cards, position) => cards[position].click(), index);
        await page.click('#staff-list-overview .view-chart-btn');
        await inspectChart(page, expected);
        if (expected.title === 'Normal Work Hours') await page.screenshot({ path: path.resolve(__dirname, `staff-hours-horizontal-chart-staff-${theme}-${width}.png`) });
        await page.evaluate(() => goBack());
        assert.equal(await page.$eval('#headerTitle', node => node.textContent), `Staff ${expected.title} Summary`);
        if (expected.daily) {
          await page.click('#details-list-container .summary-history-card');
          await page.click('#daily-list-overview .view-chart-btn');
          await inspectChart(page, expected, true);
          if (expected.title === 'Scheduled Work Days') {
            await page.screenshot({ path: path.resolve(__dirname, `staff-hours-horizontal-chart-daily-${theme}-${width}.png`) });
            await page.$eval('.main-content', node => { node.scrollTop = node.scrollHeight; });
            assert.ok(await page.$eval('.summary-chart-axis-label', node => node.getBoundingClientRect().bottom <= document.querySelector('.bottom-nav').getBoundingClientRect().top), 'Daily x axis is accessible above the bottom navigation');
            await page.screenshot({ path: path.resolve(__dirname, `staff-hours-horizontal-chart-axis-${theme}-${width}.png`) });
          }
          await page.evaluate(() => goBack());
          assert.equal(await page.$eval('#headerTitle', node => node.textContent), expected.title);
          await page.evaluate(() => goBack());
        }
        await page.evaluate(() => goBack());
      }
      await page.evaluate(() => { listActiveTitle = 'Normal Work Hours'; chartMode = 'staff'; currentStaffItems = [{ ...sampleStaffData[0], normalWorkHours: 0 }]; setView('chart'); });
      await page.waitForFunction(() => document.querySelector('#view-chart .bar-fill')?.style.width === '0%');
      assert.ok(await page.$$eval('.summary-chart-tick', nodes => nodes.every(node => Number.isFinite(Number(node.textContent)))), 'Zero hours still has a valid scale');
      await page.evaluate(() => { currentStaffItems = []; renderSummaryChart(); });
      assert.equal(await page.$eval('.summary-chart-empty', node => node.textContent), 'No records found.');
      assert.equal(await page.$$eval('#view-chart .bar-fill', nodes => nodes.length), 0);
      assert.equal(await page.evaluate(() => JSON.stringify(sampleStaffData)), sourceData, 'Chart rendering does not change any staff data');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: all 12 Staff Hours charts, daily charts, employee/date axes, correct days/hours, proportional bars, zero/empty states, back navigation, unchanged data and mobile themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
