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
    assert.equal(await page.$eval('#visitGuestListCount', node => node.textContent), '0 Records');
    assert.equal(await page.$eval('#visitGuestListCount', node => node.childElementCount), 0, 'Editable list headers keep one plain subtitle');
    await page.evaluate(() => {
      const node = document.createElement('span');
      node.id = 'insertedCount';
      node.dataset.recordSummaryCount = '';
      node.textContent = 'Total Records: 7';
      document.querySelector('.phone-container').append(node);
    });
    await page.waitForSelector('#insertedCount .record-summary-value');
    assert.equal(await page.$eval('#insertedCount', node => node.textContent), '7 Records');
    assert.equal(await page.$eval('#insertedCount', node => getComputedStyle(node).alignItems), 'baseline');
    for (const count of ['0', '1', '1,024']) {
      await page.$eval('#insertedCount', (node, count) => { node.textContent = count + ' Record'; }, count);
      await page.waitForSelector('#insertedCount .record-summary-value');
      assert.equal(await page.$eval('#insertedCount', node => node.firstElementChild.textContent), count);
      assert.equal(await page.$eval('#insertedCount', node => node.lastElementChild.textContent), count === '1' ? 'Record' : 'Records');
    }
    await page.$eval('#insertedCount', node => { node.textContent = 'Total Amount: RM 12.50'; });
    await page.waitForFunction(() => !document.querySelector('#insertedCount').classList.contains('record-summary-card'));
    assert.equal(await page.$eval('#insertedCount', node => node.textContent), 'Total Amount: RM 12.50');
    assert.deepEqual(errors, []);
    console.log('PASS: static and refreshed counts use the number-first Record format, including zero and grouped counts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
