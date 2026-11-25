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

    await page.click('[aria-label="Previous Date"]');
    await page.click('.planning-filter');
    await page.type('#changeFilterSearchKeyword', 'Siti');
    await page.click('#applyFilterButton');
    await new Promise(resolve => setTimeout(resolve, 320));

    await page.click('#tabCalendarBtn');
    await page.evaluate(() => openFilterModal());
    assert.equal(await page.$eval('#staffChangeFilterFields', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#staffCopyFilterFields', node => getComputedStyle(node).display), 'none');
    assert.notEqual(await page.$eval('#calendarFilterFields', node => getComputedStyle(node).display), 'none');
    assert.deepEqual(
      await page.$$eval('#calendarFilterFields .calendar-filter-field > label', nodes => nodes.map(node => node.textContent.trim())),
      ['Search Keyword', "Staff's Shift", "Staff's Job", "Staff's Skill"]
    );
    assert.equal(await page.$eval('#calendarFilterSearchKeyword', node => node.placeholder), 'Employee ID or name');

    await page.type('#calendarFilterSearchKeyword', 'Aqilah');
    await page.select('#calendarFilterStaffShift', 'W01');
    await page.select('#calendarFilterStaffJob', 'Admin Executive');
    await page.select('#calendarFilterStaffSkill', 'Administration');
    await page.click('#applyFilterButton');
    await new Promise(resolve => setTimeout(resolve, 320));
    const calendarSummary = await page.$eval('#currentFilterTextDisplay', node => node.textContent);
    assert.match(calendarSummary, /Aqilah/);
    assert.match(calendarSummary, /W01/);
    assert.match(calendarSummary, /Admin Executive/);
    assert.match(calendarSummary, /Administration/);
    assert.match(calendarSummary, /22 Sept 2026/);
    assert.deepEqual(await page.$$eval('.grid-cal-cell.selected > span', items => items.map(node => node.textContent)), ['22', '1', '8h']);
    assert.deepEqual(await page.$$eval('.cal-summary-stat-val', items => items.map(node => node.textContent)), ['1.00', '0', '0 / 0.00', '0.00']);
    await page.$eval('.cal-summary-stat.is-working', button => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('.cal-summary-stat.is-working');
    await page.waitForSelector('#view-work-shift-summary.active');
    await page.click('#view-work-shift-summary .calendar-purple-card');
    await page.waitForSelector('#view-work-shift-detail.active');
    assert.deepEqual(await page.$$eval('#wsEmployeeCardsContainer .employee-card-id', items => items.map(node => node.textContent)), ['#000008']);
    await page.click('#view-work-shift-detail [aria-label="Back"]');
    await page.click('#view-work-shift-summary [aria-label="Back"]');

    await page.click('#tabStaffBtn');
    await page.evaluate(() => openFilterModal());
    assert.equal(await page.$eval('#changeFilterSearchKeyword', node => node.value), 'Siti');
    assert.equal(await page.$eval('#calendarFilterFields', node => getComputedStyle(node).display), 'none');
    await page.evaluate(() => closeModal('filterModal'));
    await new Promise(resolve => setTimeout(resolve, 320));

    await page.click('#tabCalendarBtn');
    await page.evaluate(() => openFilterModal());
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.equal(await page.evaluate(() => currentMainTab), 'calendar');
    assert.equal(await page.$eval('#changeFilterSearchKeyword', node => node.value), 'Siti');
    assert.notEqual(await page.$eval('#resetFilterButton', node => getComputedStyle(node).display), 'none');
    await page.$eval('#calendarFilterSearchKeyword', node => { node.value = 'no-such-person'; });
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('.grid-cal-cell.selected .grid-cal-stat-staff', node => node.textContent), '0');
    assert.ok(await page.$eval('#calendarFilterEmpty', node => !node.hidden));
    await page.click('.planning-filter');
    await page.click('#resetFilterButton');
    assert.equal(await page.$eval('#calendarFilterSearchKeyword', node => node.value), '');
    assert.equal(await page.$eval('#calendarFilterStaffShift', node => node.value), 'all');
    assert.equal(await page.$eval('#calendarFilterStaffJob', node => node.value), 'all');
    assert.equal(await page.$eval('#calendarFilterStaffSkill', node => node.value), 'all');
    assert.equal(await page.$eval('.grid-cal-cell.selected .grid-cal-stat-staff', node => node.textContent), '287');
    assert.equal(await page.$eval('#changeFilterSearchKeyword', node => node.value), 'Siti');
    assert.deepEqual(errors, []);
    console.log('PASS: Calendar tab uses four dedicated filters with state isolated from Staff.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
