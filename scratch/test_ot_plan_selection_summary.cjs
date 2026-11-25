const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;

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
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });

    assert.ok(await page.$('#staffTabView .list-header.record-summary-card'));
    assert.equal(await page.$eval('.staff-record-total', node => node.innerText.trim()), '6 records');
    assert.equal(await page.$eval('.staff-selection-count', node => node.innerText.trim()), '2 selected');
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 86.40');
    assert.equal(await page.$eval('#submitOtPlanButton', node => node.textContent.trim()), 'Submit OT plan');
    assert.equal(await page.$eval('#selectAllControl span', node => node.textContent.trim()), 'Select all');
    assert.equal(await page.$('#selectedCountAndHoursText'), null);
    assert.equal(await page.$('#stickySelectionBar .bar-clear-btn'), null);
    assert.equal(await page.$$eval('#stickySelectionBar .bar-summary-row', rows => rows.length), 1);
    assert.deepEqual(
      await page.$eval('#selectAllCheckbox', box => [box.checked, box.indeterminate, box.disabled]),
      [false, true, false]
    );
    await page.click('#submitOtPlanButton');
    assert.equal(await page.$eval('#appToast.show', node => node.textContent), 'OT plan submitted successfully!');

    await page.click('#selectAllCheckbox');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent.trim()), '6');
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 278.35');
    assert.equal(await page.$eval('#submitOtPlanButton', node => node.disabled), false);
    assert.equal(await page.$eval('#selectAllCheckbox', checkbox => checkbox.checked), true);
    assert.equal(await page.$$eval('.ot-staff-card.selected', cards => cards.length), 6);

    await page.click('#selectAllCheckbox');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent.trim()), '0');
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 0.00');
    assert.equal(await page.$eval('#submitOtPlanButton', node => node.disabled), true);
    assert.equal(await page.$eval('#selectAllCheckbox', checkbox => checkbox.checked), false);
    assert.equal(await page.$eval('#selectAllCheckbox', checkbox => checkbox.indeterminate), false);
    assert.equal(await page.$$eval('.ot-staff-card.selected', cards => cards.length), 0);

    await page.click('.ot-staff-card .staff-verify-checkbox');
    await page.click('#planningFilterButton');
    await page.select('#staffFilterSection', 'Account');
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('#listCounterText', node => node.textContent), '2');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent), '1');
    await page.click('#selectAllCheckbox');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent), '3');
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 141.40');

    await page.click('#planningFilterButton');
    await page.select('#staffFilterSection', 'HR');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#filterModal', { hidden: true });
    await page.click('[aria-label="Next Date"]');
    assert.match(await page.$eval('#currentFilterTextDisplay', node => node.textContent), /24 Sept 2026.*Account/);
    await page.click('#planningFilterButton');
    assert.equal(await page.$eval('#staffFilterSection', select => select.value), 'Account');
    await page.type('#staffFilterSearchKeyword', 'no match');
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('#listCounterText', node => node.textContent), '0');
    assert.equal(await page.$eval('#selectAllCheckbox', box => box.disabled), true);
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 141.40');
    await page.click('.ot-staff-empty button');
    assert.equal(await page.$eval('#listCounterText', node => node.textContent), '6');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent), '3');
    assert.deepEqual(errors, []);

    console.log('OT Plan selection summary consistency checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
