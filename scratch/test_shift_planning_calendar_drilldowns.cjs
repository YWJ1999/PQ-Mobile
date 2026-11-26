const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

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
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });

    await page.click('#tabCalendarBtn');
    await page.$$eval('#gridCalDays .grid-cal-cell', cells => {
      cells.find(cell => cell.querySelector('.grid-cal-date')?.textContent.trim() === '17').click();
    });
    assert.ok(await page.$('#view-work-shift-summary'));
    assert.match(await page.$eval('[onclick*="view-work-shift-summary"]', node => node.getAttribute('onclick')), /openSummaryViewFromCal/);
    await page.$eval('[onclick*="view-work-shift-summary"]', node => node.click());

    assert.equal(await page.$eval('#view-work-shift-summary', node => node.classList.contains('active')), true);
    assert.equal(await page.$eval('work-shift-summary [data-date]', node => node.textContent), '17 Sep 2026');
    assert.equal(await page.$eval('.work-shift-count', node => node.textContent), '1 record');
    assert.equal(await page.$$eval('.work-shift-card', cards => cards.length), 1);
    assert.equal(await page.$eval('.work-shift-card-header strong', node => node.textContent), '08:30 – 17:30');
    assert.deepEqual(await page.$$eval('.work-shift-metrics strong', nodes => nodes.map(node => node.textContent)), ['268', '2,144.00', '0.00']);
    assert.ok(await page.$('.work-shift-card-header .fa-chevron-right'));

    await page.click('.work-shift-card');
    await page.waitForSelector('#view-work-shift-detail.active');
    assert.equal(await page.$eval('.work-shift-detail-title', el => el.textContent), 'Shift · 08:30 – 17:30');
    assert.ok(await page.$('.work-shift-detail-title .fa-clock'));
    assert.deepEqual(await page.$$eval('.work-shift-overview .work-shift-label', labels => labels.map(el => el.textContent)), ['Headcount', 'Scheduled hours', 'Work hours']);
    assert.deepEqual(await page.$$eval('.work-shift-overview strong', values => values.map(el => el.textContent)), ['268', '2,144.00', '0.00']);
    assert.equal(await page.$eval('.work-shift-roster > h2', el => el.textContent), 'Employees');
    const firstEmployee = await page.$eval('.work-shift-employee-card', card => ({
      heading: card.querySelector('h3').textContent,
      role: card.querySelector('header p').textContent,
      hours: [...card.querySelectorAll('.work-shift-metrics strong')].map(el => el.textContent)
    }));
    assert.deepEqual(firstEmployee, { heading: '000008 - Aqilah Antasha', role: 'Admin Executive', hours: ['8.00', '0.00'] });
    assert.equal(await page.evaluate(() => document.activeElement.matches('#view-work-shift-detail h1')), true);

    await page.evaluate(() => goBackToCalendar());
    await page.$eval('[onclick*="view-no-work-summary"]', node => node.click());
    assert.equal(await page.$eval('no-work-summary [data-date]', el => el.textContent), '17 Sep 2026');
    assert.equal(await page.$eval('no-work-summary .work-shift-count', el => el.textContent), '1 record');
    assert.equal(await page.$eval('.no-work-table tbody th', el => el.textContent), 'Rest / Off Day');
    assert.equal(await page.$eval('.no-work-headcount', el => el.textContent), '13');
    await page.focus('.no-work-headcount');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#view-no-work-detail.active');
    assert.equal(await page.evaluate(() => document.activeElement.matches('#view-no-work-detail h1')), true);
    assert.deepEqual(await page.$$eval('.no-work-detail-overview dt', nodes => nodes.map(el => el.textContent)), ['Shift', 'Total headcount']);
    assert.deepEqual(await page.$$eval('.no-work-detail-overview dd', nodes => nodes.map(el => el.textContent)), ['Rest / Off Day', '13']);
    assert.deepEqual(await page.$$eval('.no-work-employee-table thead th[scope="col"]', cols => cols.map(el => el.textContent)), ['Emp No.', 'Name', 'Job title']);
    const roster = await page.$$eval('.no-work-employee-table tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent)));
    assert.equal(roster.length, 13);
    assert.deepEqual(roster.slice(0, 4), [
      ['00012345', 'TEST', 'Account Executive'],
      ['012345', 'hey', 'Bartender'],
      ['620578', 'Bhim Bahadur Tamang', 'Production Operator'],
      ['620657', 'Pritiman Gurung', 'Production Operator']
    ]);
    await page.click('#view-no-work-detail [aria-label="Back"]');
    assert.equal(await page.$eval('no-work-summary [data-date]', el => el.textContent), '17 Sep 2026');
    await page.click('#view-no-work-summary [aria-label="Back"]');
    await page.click('.planning-filter');
    await page.waitForSelector('#calendarFilterFields', { visible: true });
    await page.type('#calendarFilterSearchKeyword', '00012345');
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    await page.$eval('#calSummaryCard [data-kind="off"]', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('#calSummaryCard [data-kind="off"]');
    await page.click('.no-work-headcount');
    assert.equal(await page.$eval('.no-work-detail-overview [data-headcount]', el => el.textContent), '1');
    assert.deepEqual(await page.$$eval('.no-work-employee-table tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [roster[0]]);
    assert.deepEqual(errors, []);
    console.log('PASS: Calendar work shift cards and the no work table open the correct employee details.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
