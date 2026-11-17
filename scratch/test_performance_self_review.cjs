const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');

// Catch broken Individual navigation and lost comments/files in the prepared review.
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
      await page.setViewport({ width, height: 844 });
      await page.goto(pathToFileURL(path.join(root, 'modules/performance/index.html')).href + `?scope=individual&theme=${theme}`, { waitUntil: 'load' });
      assert.ok(await page.$('#performanceIndividualPanel [data-option-id="self-review"]'), 'Individual exposes Self Review');
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('[data-option-id="self-review"]')]);
      assert.equal(await page.$eval('h1', el => el.textContent), 'Self Review');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
      const fields = await page.$$eval('#selfReviewForm input[name]', els => Object.fromEntries(els.map(el => [el.name, el.value])));
      assert.equal(fields.empNo, '#EBB12');
      assert.equal(fields.reference, 'APP000000000233');
      assert.equal(fields.createdDate, '21/01/2009');
      assert.equal(fields.period, 'FY 2026A - Review 01');
      assert.equal(fields.confirmationDueDate, '12/11/2006');
      assert.equal(fields.assessmentFrom, '01/01/2008');
      assert.equal(fields.assessmentTo, '31/12/2008');
      assert.equal(fields.validFrom, '01/01/2026');
      assert.equal(fields.validTo, '31/12/2026');
      assert.equal(fields.name, 'Farhan Binti Rahmat');
      assert.ok(await page.$eval('#selfReviewEmployee', el => el.closest('.employee-career-field').previousElementSibling.contains(document.querySelector('#selfReviewName'))), 'Employee ID sits below name');
      if (width === 420) await page.screenshot({ path: path.join(os.tmpdir(), `pq-self-review-${theme}-top.png`) });
      await page.type('#selfReviewComments', 'Reviewed progress.\nAgreed next steps.');
      await (await page.$('#selfReviewFiles')).uploadFile(path.join(root, 'assets/performance/handover-notes.txt'));
      assert.equal(await page.$eval('#selfReviewAttachments .form-attachment-file-name', el => el.textContent), 'handover-notes.txt');
      await page.click('#selfReviewAttachments button');
      assert.equal(await page.$('#selfReviewAttachments .form-attachment-item'), null);
      await (await page.$('#selfReviewFiles')).uploadFile(path.join(root, 'assets/performance/handover-notes.txt'));
      await page.evaluate(() => document.querySelector('#selfReviewForm').addEventListener('selfreview:ready', event => {
        window.capturedReview = { ...event.detail, attachments: event.detail.attachments.map(file => ({ name: file.name, realFile: file instanceof File })) };
      }));
      await page.click('#selfReviewSubmit');
      await page.waitForFunction(() => window.capturedReview);
      const captured = await page.evaluate(() => window.capturedReview);
      assert.equal(captured.empNo, 'EBB12');
      assert.equal(captured.reference, 'APP000000000233');
      assert.equal(captured.comments, 'Reviewed progress.\nAgreed next steps.');
      assert.deepEqual(captured.attachments, [{ name: 'handover-notes.txt', realFile: true }]);
      assert.equal(await page.$eval('#selfReviewStatus', el => el.hidden), false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.setViewport({ width, height: 568 });
      await page.$eval('main', el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await page.$eval('#selfReviewSubmit', el => { const button = el.getBoundingClientRect(), nav = document.querySelector('phone-bottom-nav').getBoundingClientRect(); return button.bottom <= nav.top && button.top >= 0; }), 'Form actions remain reachable above navigation');
      if (width === 420) await page.screenshot({ path: path.join(os.tmpdir(), `pq-self-review-${theme}-bottom.png`) });
      await page.click(`[data-set-theme="${theme === 'light' ? 'dark' : 'light'}"]`);
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#selfReviewCancel')]);
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'individual');
      assert.equal(await page.$eval('#performanceIndividualPanel', el => el.hidden), false);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme === 'light' ? 'dark' : 'light');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS: Self Review navigation, supplied data, comments, files and mobile layout; ${theme} ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
