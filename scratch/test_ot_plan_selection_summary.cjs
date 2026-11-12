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
    assert.deepEqual(
      await page.$$eval('#staffTabView .staff-record-label', labels => labels.map(label => label.textContent.trim())),
      ['Records', 'Selected Records']
    );
    assert.equal(await page.$eval('#listCounterText', node => node.textContent.trim()), '6');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent.trim()), '2');
    assert.equal(await page.$eval('#selectAllControl span', node => node.textContent.trim()), 'Select All');
    assert.equal(await page.$('#selectedCountAndHoursText'), null);
    assert.equal(await page.$('#stickySelectionBar .bar-clear-btn'), null);
    assert.equal(await page.$$eval('#stickySelectionBar .bar-summary-row', rows => rows.length), 1);
    assert.deepEqual(
      await page.$eval('#selectAllCheckbox', checkbox => ({ checked: checkbox.checked, disabled: checkbox.disabled })),
      { checked: false, disabled: false }
    );

    await page.click('#selectAllCheckbox');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent.trim()), '6');
    assert.equal(await page.$eval('#selectAllCheckbox', checkbox => checkbox.checked), true);
    assert.equal(await page.$$eval('.ot-staff-card.selected', cards => cards.length), 6);

    await page.click('#selectAllCheckbox');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent.trim()), '0');
    assert.equal(await page.$eval('#selectAllCheckbox', checkbox => checkbox.checked), false);
    assert.equal(await page.$$eval('.ot-staff-card.selected', cards => cards.length), 0);
    assert.deepEqual(errors, []);

    console.log('OT Plan selection summary consistency checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
