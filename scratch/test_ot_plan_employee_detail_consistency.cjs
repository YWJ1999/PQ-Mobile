const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const reports = [
  { file: 'daily-manpower', action: '#boxkpiOtPlan', rowCount: 6, firstEmployee: '0000101 - Lee Soon Hock' },
  { file: 'shift-plan', action: '#calSummaryCard [data-kind="ot"]', rowCount: 26, firstEmployee: '000016 - Raju Kumar' },
  { file: 'ot-plan', action: '#calSummaryCard .is-approved', rowCount: 28, firstEmployee: '000023 - Jason ling soon kam' }
];

async function checkReport(page, report, theme) {
  const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options', report.file + '.html'));
  url.searchParams.set('theme', theme);
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  const isManpower = report.file === 'daily-manpower';
  if (!isManpower) await page.click('#tabCalendarBtn');
  await page.click(report.action);
  const summary = isManpower ? 'ot-plan-summary' : '.view-container.active ot-plan-summary';
  const selection = await page.$eval(summary, el => {
    const [type, count, hours] = [...el.querySelector('tbody tr').cells].map(cell => cell.textContent);
    return [type, el.querySelector('[data-date]').textContent, el.querySelector('summary strong').textContent.replace('Shift · ', ''), count, hours];
  });
  await page.click(summary + ' tbody button');
  const actual = await page.$eval('ot-plan-employee-detail', el => ({
    overview: [...el.querySelectorAll('h2, [data-date], [data-shift], dd')].map(node => node.textContent),
    columns: [...el.querySelectorAll('thead th[scope="col"]')].map(node => node.textContent),
    names: [...el.querySelectorAll('tbody th[scope="row"]')].map(node => node.textContent),
    focusedTitle: document.activeElement.textContent
  }));
  assert.deepEqual(actual.overview, selection);
  assert.deepEqual(actual.columns, ['Employee', 'Job position', 'Planned hours']);
  assert.equal(actual.focusedTitle, 'OT Plan Employee Detail');
  assert.equal(actual.names.length, report.rowCount);
  assert.equal(actual.names[0], report.firstEmployee);

  for (const width of [320, 360, 390, 420]) {
    await page.setViewport({ width, height: 900 });
    const layout = await page.$eval('ot-plan-employee-detail', el => {
      const overview = el.querySelector('.shift-employee-overview');
      const table = el.querySelector('table');
      const card = table.parentElement;
      const [first, second] = table.tBodies[0].rows;
      const [headcount, hours] = [...overview.querySelectorAll('dd')].map(node => node.getBoundingClientRect());
      const firstName = first.cells[0];
      const number = firstName.querySelector('.shift-employee-number');
      const fits = [el, overview, card, ...table.querySelectorAll('th, td')].every(node => node.scrollWidth <= node.clientWidth + 1);
      return {
        fits, striped: getComputedStyle(first).backgroundColor !== getComputedStyle(second).backgroundColor,
        metricsAligned: headcount.top === hours.top && headcount.right <= hours.left,
        endAligned: ['end', 'right'].includes(getComputedStyle(first.cells[2]).textAlign),
        mutedNumber: getComputedStyle(number).color !== getComputedStyle(firstName).color,
        radius: [overview, card].map(node => getComputedStyle(node).borderRadius),
        purpleHeader: getComputedStyle(table.tHead).backgroundImage.includes('linear-gradient')
      };
    });
    assert.deepEqual(layout, {
      fits: true, striped: true, metricsAligned: true, endAligned: true, mutedNumber: true, radius: ['18px', '18px'], purpleHeader: true
    }, report.file + ' ' + theme + ' ' + width);
  }

  if (!isManpower) {
    const lastRowVisible = await page.$eval('ot-plan-employee-detail', el => {
      el.scrollTop = el.scrollHeight;
      const row = el.querySelector('tbody tr:last-child').getBoundingClientRect();
      const viewport = el.getBoundingClientRect();
      return row.bottom <= viewport.bottom + 1 && row.top >= viewport.top;
    });
    assert.equal(lastRowVisible, true);
  }
  await page.click(isManpower ? '.header-btn-icon' : '#view-ot-plan-detail [aria-label="Back"]');
  assert.equal(await page.evaluate(() => document.activeElement.closest('tr')?.cells[0].textContent), selection[0]);
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
    for (const theme of ['light', 'dark']) {
      for (const report of reports) await checkReport(page, report, theme);
    }
    const rows = await page.evaluate(() => {
      const detail = document.createElement('ot-plan-employee-detail');
      detail.render({
        date: new Date(2026, 8, 20), employees: [
          { id: '#00A07', name: 'Sample employee', hours: 0 },
          { empNo: '007', hours: null },
          { name: 'Name only' }
        ]
      });
      return [...detail.querySelectorAll('tbody tr')].map(row => [...row.cells].map(cell => cell.textContent));
    });
    assert.deepEqual(rows, [
      ['00A07 - Sample employee', '—', '0.00'], ['007', '—', '—'], ['Name only', '—', '—']
    ]);
    assert.deepEqual(errors, []);
    console.log('OT Plan employee detail passed on all three reports, both themes and four phone widths.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
