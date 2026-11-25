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
    await page.click('.planning-filter .filter-trigger-btn');
    assert.equal(await page.$eval('#changeFilterDate', node => node.value), '2026-09-22');
    assert.equal(await page.$eval('#filterModal', node => getComputedStyle(node).display), 'flex');
    assert.notEqual(await page.$eval('#staffChangeFilterFields', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#staffCopyFilterFields', node => getComputedStyle(node).display), 'none');
    assert.deepEqual(
      await page.$$eval('#staffChangeFilterFields .staff-change-filter-field > label', nodes => nodes.map(node => node.textContent.trim())),
      ['Date', "Staff's Shift", 'Search Keyword', 'Branch', 'Section', 'Job Title']
    );
    assert.equal(await page.$eval('#changeFilterDate', node => node.type), 'date');
    assert.equal(await page.$eval('#changeFilterSearchKeyword', node => node.placeholder), 'Employee ID or name');

    await page.type('#changeFilterSearchKeyword', '#000103');
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.equal(await page.$$eval('#staffCardsContainer .staff-card', cards => cards.length), 1);
    assert.equal(await page.$eval('#staffCardsContainer .staff-card', card => card.textContent.includes('Siti Nurhaliza')), true);
    assert.match(await page.$eval('#currentFilterTextDisplay', node => node.textContent), /22.*#000103/);
    await page.click('.planning-filter');
    await page.$eval('#changeFilterSearchKeyword', node => { node.value = 'unapplied'; });
    await page.click('#filterModal .standard-filter-close');
    await page.waitForSelector('#filterModal', { hidden: true });

    await page.click('#modeCopyDatesBtn');
    await page.evaluate(() => openFilterModal());
    assert.equal(await page.$eval('#staffChangeFilterFields', node => getComputedStyle(node).display), 'none');
    assert.notEqual(await page.$eval('#staffCopyFilterFields', node => getComputedStyle(node).display), 'none');
    assert.deepEqual(
      await page.$$eval('#staffCopyFilterFields .staff-copy-filter-field > label', nodes => nodes.map(node => node.textContent.trim())),
      ['Date', 'Search Keyword', 'Branch', 'Section', 'Job Title', "Staff's Shift"]
    );
    assert.equal(await page.$eval('#copyFilterSearchKeyword', node => node.value), '');
    await page.$eval('#copyFilterDate', node => { node.value = '2026-09-25'; });
    await page.type('#copyFilterSearchKeyword', 'Aqilah');
    await page.select('#copyFilterStaffShift', 'W01');
    await page.click('#applyFilterButton');
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.match(await page.$eval('#currentDateDisplay', node => node.textContent), /25.*Sep.*2026/);
    assert.equal(await page.$$eval('#staffCardsContainer .staff-card', cards => cards.length), 1);
    assert.match(await page.$eval('#currentFilterTextDisplay', node => node.textContent), /Aqilah/);

    await page.click('#modeChangeShiftBtn');
    await page.evaluate(() => openFilterModal());
    assert.equal(await page.$eval('#changeFilterSearchKeyword', node => node.value), '#000103');
    assert.equal(await page.$eval('#copyFilterSearchKeyword', node => node.value), 'Aqilah');
    await page.click('#resetFilterButton');
    assert.equal(await page.$eval('#changeFilterSearchKeyword', node => node.value), '');
    assert.equal(await page.$eval('#copyFilterSearchKeyword', node => node.value), 'Aqilah');
    assert.equal(await page.$$eval('#staffCardsContainer .staff-card', cards => cards.length), 6);
    await page.$eval('#changeFilterDate', node => { node.value = '2026-09-22'; });
    await page.type('#changeFilterSearchKeyword', '#000008');
    await page.select('#changeFilterBranch', 'HQ');
    await page.select('#changeFilterSection', 'Admin');
    await page.select('#changeFilterJobTitle', 'Executive');
    await page.select('#changeFilterStaffShift', 'W01');
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('#listCounterText', node => node.textContent), '1');
    await page.click('.staff-card input');
    await page.click('#bottomMainActionBtn');
    await page.click('#confirmShiftChanges');
    await page.waitForSelector('#reviewChangesModal', { hidden: true });
    assert.equal(await page.$eval('#listCounterText', node => node.textContent), '0', 'The dated shift change removes the employee from the W01 filter');
    await page.click('[aria-label="Next Date"]');
    assert.equal(await page.$eval('.staff-card .emp-id-label', node => node.textContent), '#000008', 'The next day still has the original shift');
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Change Shift and Copy to Dates use separate ordered filters and independent state.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
