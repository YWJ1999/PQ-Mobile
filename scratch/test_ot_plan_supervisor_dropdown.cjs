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
    await page.click('.ot-edit-link');

    const lightLabelStyles = await page.$$eval('#editOtDetailsModal .ot-form-label', labels => labels.map(label => ({
      text: label.textContent.trim(),
      color: getComputedStyle(label).color
    })));
    assert.deepEqual(lightLabelStyles.map(label => label.text), ['Supervisor', 'Shift', 'OT type', 'Start time', 'End time', 'Hours']);
    assert.equal(lightLabelStyles.every(label => label.color === 'rgb(124, 58, 237)'), true);

    assert.equal(await page.$eval('label[for="modalSupervisorSelect"]', node => node.textContent.trim()), 'Supervisor');
    assert.equal(
      await page.$eval('#modalSupervisorSelect', node => Boolean(node.compareDocumentPosition(document.getElementById('modalShiftSelect')) & Node.DOCUMENT_POSITION_FOLLOWING)),
      true
    );
    assert.deepEqual(
      await page.$$eval('#modalSupervisorSelect option', options => options.map(option => option.textContent.trim())),
      ['#EBB04 · Tech Lead', '#000234 · Kevin Lim', '#000450 · Jenny Koh']
    );
    assert.equal(await page.$eval('#modalSupervisorSelect', node => node.value), 'EBB04');

    await page.select('#modalSupervisorSelect', '000234');
    await page.click('#editOtDetailsModal [type="submit"]');
    await page.waitForSelector('#editOtDetailsModal', { hidden: true });
    assert.equal(await page.$eval('#otDetailSupervisor', node => node.textContent), '#000234 · Kevin Lim');
    await page.click('.ot-edit-link');
    assert.equal(await page.$eval('#modalSupervisorSelect', node => node.value), '000234');
    await page.select('#modalSupervisorSelect', '000450');
    await page.click('#editOtDetailsModal .sheet-footer [type="button"]');
    await page.waitForSelector('#editOtDetailsModal', { hidden: true });
    assert.equal(await page.$eval('#otDetailSupervisor', node => node.textContent), '#000234 · Kevin Lim');

    await page.goto(pageUrl + '?theme=dark', { waitUntil: 'load' });
    await page.click('.ot-edit-link');
    assert.equal(
      await page.$$eval('#editOtDetailsModal .ot-form-label', labels => labels.every(label => getComputedStyle(label).color === 'rgb(196, 181, 253)')),
      true
    );
    assert.deepEqual(errors, []);

    console.log('OT Plan supervisor dropdown checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
