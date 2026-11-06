const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/admin/options/guest-visit.html')).href, { waitUntil: 'load' });
    for (const caption of ['Total Records: 0', 'Total Records: 12', 'Total Records: 1,024']) {
      await page.$eval('#visitGuestListCount', (node, text) => { node.innerText = text; }, caption);
      assert.equal(await page.$eval('#visitGuestListCount', node => node.textContent), caption);
      assert.equal(await page.$eval('#visitGuestListCount', node => node.matches('.record-summary-card') || node.childElementCount > 0), false, 'Editable list headers keep one plain subtitle');
    }
    await page.$eval('#visitGuestListCount', node => { node.textContent = 'Total Amount: RM 12.50'; });
    await page.waitForFunction(() => !document.querySelector('#visitGuestListCount').classList.contains('record-summary-card'));
    assert.equal(await page.$eval('#visitGuestListCount', node => node.textContent), 'Total Amount: RM 12.50', 'Amount captions keep their content and original presentation');
    await page.evaluate(() => {
      const node = document.createElement('span');
      node.id = 'insertedCount';
      node.dataset.recordSummaryCount = '';
      node.textContent = 'Total Records: 7';
      document.querySelector('.phone-container').append(node);
    });
    await page.waitForSelector('#insertedCount .record-summary-value');
    assert.equal(await page.$eval('#insertedCount', node => node.textContent), 'Total Records: 7', 'New form content receives the same presentation');
    assert.deepEqual(errors, []);
    console.log('PASS: refreshed and inserted record captions preserve zero, grouped counts, original text and amount states without duplication or JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
