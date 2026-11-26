const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const members = [
  { name: 'Ahmad Rahmat', relation: 'HUSBAND', birthDate: '1980-05-17', status: 'Active', rank: 1,
    newNric: '800517-01-1234', birthCert: 'BC-001', taxStatus: 'Dependent', memberEmployeeNo: 'EBB99',
    beneficiary: false, allocation: 0, attachments: [{ name: 'family-proof.pdf' }, { name: 'birth-certificate.png' }] },
  { name: 'Nur Aina', relation: 'DAUGHTER' }
];
const labels = ['Name', 'Relation', 'Birth Date', 'Status', 'Rank', 'New NRIC', 'Birth Cert', 'Tax Status', 'Member Employee No.', 'Beneficiary', 'Allocation%', 'Attachment'];
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    for (const context of ['history', 'pending-approval']) for (const theme of ['light', 'dark']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
      await page.setViewport({ width: 360, height: 740 });
      const file = path.resolve(__dirname, '../modules/employee-career/options/' + context + '.html');
      await page.goto(pathToFileURL(file).href + '?category=cv-change-request&theme=' + theme, { waitUntil: 'load' });
      await page.evaluate(({ context, members }) => {
        const row = context === 'history' ? window.EMPLOYEE_CAREER_CV_HISTORY_DATA[0] : window.EMPLOYEE_CAREER_PENDING_DATA[0];
        row.profile.family = { existing: members, deleted: [{ name: 'Removed Member', relation: 'SON' }] };
      }, { context, members });
      await page.click(context === 'history' ? '#careerHistoryList [data-record-id]' : '.career-pending-review');
      await page.click('[data-cv-tab="family"]');
      const original = await page.evaluate(context => JSON.stringify((context === 'history' ? window.EMPLOYEE_CAREER_CV_HISTORY_DATA[0] : window.EMPLOYEE_CAREER_PENDING_DATA[0]).profile.family), context);
      const first = '[data-cv-family-member="existing"][data-cv-family-index="0"]';
      assert.ok(await page.$(first), 'Family members expose an accessible detail action');
      await page.click(first);
      await page.waitForSelector('.cv-family-member-dialog[open]');
      assert.deepEqual(await page.$$eval('.cv-family-member-dialog th', rows => rows.map(row => row.textContent.trim())), labels);
      assert.deepEqual(await page.$$eval('.cv-family-member-dialog td', rows => rows.slice(0, 11).map(row => row.textContent.trim())), ['Ahmad Rahmat', 'HUSBAND', '17 May 1980', 'Active', '1', '800517-01-1234', 'BC-001', 'Dependent', 'EBB99', 'No', '0']);
      assert.deepEqual(await page.$$eval('.cv-family-member-dialog tr:last-child li', rows => rows.map(row => row.textContent.trim())), ['family-proof.pdf', 'birth-certificate.png']);
      assert.ok(await page.$eval('.cv-family-member-dialog', dialog => {
        const bounds = dialog.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight && dialog.scrollWidth <= dialog.clientWidth + 1;
      }), 'Member details fit a small phone screen');
      await page.screenshot({ path: path.join(__dirname, `cv-family-member-${context}-${theme}.png`) });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.cv-family-member-dialog'));
      assert.equal(await page.$('.cv-family-member-dialog'), null);
      assert.equal(await page.$eval(context === 'history' ? '#historyDetailsModal' : '#careerPendingDetails', (node, context) => context === 'history' ? node.classList.contains('is-open') : !node.hidden, context), true, 'Escape preserves the parent CV details');
      assert.ok(await page.$eval(first + ' button', node => node === document.activeElement), 'Focus returns to the member name');
      await page.keyboard.press('Enter');
      await page.waitForSelector('.cv-family-member-dialog[open]');
      await page.click('.cv-family-member-dialog .detail-popout-close');
      await page.waitForFunction(() => !document.querySelector('.cv-family-member-dialog'));
      await page.click('[data-cv-family-member="existing"][data-cv-family-index="1"]');
      assert.deepEqual(await page.$$eval('.cv-family-member-dialog td', cells => cells.slice(0, 4).map(cell => cell.textContent.trim())), ['Nur Aina', 'DAUGHTER', '—', '—']);
      assert.equal(await page.$eval('.cv-family-member-dialog tr:last-child td', node => node.textContent.trim()), 'No attachments');
      await page.mouse.click(3, 3);
      await page.waitForFunction(() => !document.querySelector('.cv-family-member-dialog'));
      assert.equal(await page.$('.cv-family-member-dialog'), null, 'Backdrop dismisses the child popout');
      await page.click('[data-cv-family-member="deleted"][data-cv-family-index="0"]');
      assert.equal(await page.$eval('.cv-family-member-dialog td', node => node.textContent.trim()), 'Removed Member');
      await page.click('.cv-family-member-dialog .detail-popout-close');
      await page.waitForFunction(() => !document.querySelector('.cv-family-member-dialog'));
      assert.equal(await page.evaluate(context => JSON.stringify((context === 'history' ? window.EMPLOYEE_CAREER_CV_HISTORY_DATA[0] : window.EMPLOYEE_CAREER_PENDING_DATA[0]).profile.family), context), original, 'Viewing details leaves member data unchanged');
      assert.deepEqual(errors, []);
      await page.close();
      console.log('PASS: family detail flow, ' + context + ' ' + theme);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
