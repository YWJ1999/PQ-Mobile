const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const cases = [
  { title: 'Scheduled Work Days', count: 22, first: '1 Day', unit: 'DAYS' },
  { title: 'Normal Present Days', count: 21, first: '1 Day', unit: 'DAYS' },
  { title: 'Normal Work Hours', count: 21, first: '8.00 Hrs', unit: 'HOURS' },
  { title: 'Odd Clocking Days', count: 8, first: '1 Day', unit: 'DAYS' },
  { title: 'Normal OT Hours', count: 1, first: '0.50 Hrs', unit: 'HOURS' },
  { title: 'Other OT Hours', count: 1, first: '1.50 Hrs', unit: 'HOURS' },
  { title: 'Unapproved OT Hours', count: 7, first: '0.50 Hrs', unit: 'HOURS' },
  { title: 'OT Plan Hours', count: 10, first: '0.04 Hrs', unit: 'HOURS' },
  { title: 'Absent OT Hours', count: 2, first: '0.01 Hrs', unit: 'HOURS' },
  { title: 'Absent Days', count: 9, first: '1 Day', unit: 'DAYS' },
  { title: 'Leave Hours', count: 8, first: '0.00 Hrs', unit: 'HOURS' },
  { title: 'Lost Hours', count: 8, first: '0.00 Hrs', unit: 'HOURS' }
];

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
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/hours-summary.html')).href;

    for (const theme of ['light', 'dark']) {
      await page.goto(`${url}?theme=${theme}`, { waitUntil: 'networkidle0' });
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844 });
        for (const [index, expected] of cases.entries()) {
          await page.$$eval('.summary-kpi-card', (cards, cardIndex) => cards[cardIndex].click(), index);
          const dateFirst = await page.$$eval('#details-list-container .summary-history-card-heading', headings =>
            headings.length === currentDetailItems.length && headings.every((heading, i) => {
              const [date, shift] = heading.children;
              const record = currentDetailItems[i];
              return date.matches('h3') && date.textContent.trim() === `${record.day}, ${record.fullDate}`
                && shift.matches('.summary-history-shift') && shift.textContent.trim() === record.shift;
            })
          );
          assert.ok(dateFirst, `${expected.title}: each card shows its date heading followed by its shift`);
          await page.$eval('#btn-chart-toggle', button => button.click());
          await page.waitForFunction(() => [...document.querySelectorAll('#view-chart .bar-fill')]
            .every(bar => bar.style.width === bar.dataset.width));
          const result = await page.evaluate(() => {
            const chart = document.getElementById('view-chart');
            const axis = chart.querySelector('.summary-chart-axis-label');
            const rows = [...chart.querySelectorAll('.bar-chart-item')];
            const first = rows[0];
            const date = first?.querySelector('.name');
            const track = first?.querySelector('.bar-track');
            const value = first?.querySelector('.val');
            const main = document.querySelector('.main-content');
            const centerY = node => { const rect = node.getBoundingClientRect(); return rect.top + rect.height / 2; };
            return {
              axis: axis?.textContent,
              unit: chart.querySelector('.summary-chart-value-heading')?.textContent,
              count: rows.length,
              first: value?.textContent,
              horizontal: Boolean(date && track && value &&
                date.getBoundingClientRect().right <= track.getBoundingClientRect().left &&
                track.getBoundingClientRect().right <= value.getBoundingClientRect().left &&
                Math.abs(centerY(date) - centerY(track)) < 1 &&
                Math.abs(centerY(value) - centerY(track)) < 1),
              overflow: main.scrollWidth - main.clientWidth,
              ticks: [...chart.querySelectorAll('.summary-chart-tick')].map(node => Number(node.textContent)),
              allZero: rows.every(row => row.querySelector('.bar-fill').style.width === '0%')
            };
          });
          const label = `${theme} ${width}px ${expected.title}`;
          assert.equal(result.axis, `Total ${expected.title}`, `${label}: metric-specific horizontal axis`);
          assert.equal(result.unit, expected.unit, label);
          assert.equal(result.count, expected.count, label);
          assert.equal(result.first, expected.first, `${label}: days are counts and hours use their own metric`);
          assert.ok(result.horizontal, `${label}: date, bar and value share one horizontal row`);
          assert.equal(result.overflow, 0, `${label}: chart fits the phone`);
          assert.equal(result.ticks[0], 0, `${label}: horizontal scale starts at zero`);
          assert.ok(result.ticks.length >= 2 && result.ticks.every(Number.isFinite), label);
          if (expected.unit === 'DAYS') assert.ok(result.ticks.every(Number.isInteger), label);
          if (expected.title === 'Leave Hours' || expected.title === 'Lost Hours') assert.ok(result.allZero, label);
          await page.evaluate(() => goBack());
          assert.equal(await page.$eval('#headerTitle', node => node.textContent), expected.title);
          await page.evaluate(() => goBack());
        }
      }
    }

    await page.evaluate(() => {
      openListDetails('Unapproved OT Hours');
      setView('chart');
    });
    await page.waitForFunction(() => [...document.querySelectorAll('#view-chart .bar-fill')]
      .every(bar => bar.style.width === bar.dataset.width));
    const widths = await page.$$eval('#view-chart .bar-fill', bars => bars.map(bar => Number.parseFloat(bar.style.width)));
    assert.ok(Math.abs(widths[5] / widths[0] - 5) < 0.001, '2.50 hours has a bar five times as long as 0.50 hours');

    await page.evaluate(() => { currentDetailItems = []; renderSummaryChart(); });
    assert.equal(await page.$eval('#view-chart .summary-chart-empty', node => node.textContent), 'No records found.');
    assert.equal(await page.$$eval('#view-chart .bar-fill', bars => bars.length), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: all 12 Hours Summary charts use date/bar/value rows, correct days/hours, scaled axes, proportional bars, empty/zero states, back navigation, both themes and 360/420px layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
