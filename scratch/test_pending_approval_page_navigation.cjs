const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const queues = [
  ['employee-career', 'careerPendingView', '.three-dots-btn'],
  ['admin', 'workplacePendingView', '.three-dots-btn'],
  ['payroll', 'payrollPendingView', '.three-dots-btn'],
  ['performance', 'performanceApprovalView', '.three-dots-btn'],
  ['project-task', 'projectApprovalView', '[data-project-approval-menu]'],
  ['claims', 'triggerClaimView', '.three-dots-btn'],
  ['attendance', 'triggerAttendanceView', '[title="Options"]'],
  ['leave', 'triggerView', '[title="Options"]']
];

const categories = {
  'employee-career': [['[data-career-pending-type="Staff Engagement"]', 'Staff Engagement Approval']],
  attendance: [['#staffTabOTPlan', 'OT Plan Approval'], ['#staffTabFinalOT', 'Final OT Approval'], ['#staffTabFeedback', 'Attendance Advice Approval']],
  leave: [['#tabApprovalCredit', 'Leave Credit Approval'], ['#tabApprovalOfftime', 'Time Off Approval']],
  admin: [['#workplacePendingTab-inventory', 'Inventory Request Approval']],
  payroll: [['#payrollPendingTab-deduction', 'Deduction Request Detail']],
  performance: [['[data-approval-tab="self-evaluation"]', 'Self Evaluation Approval'], ['[data-approval-tab="self-review"]', 'Self Review Approval']]
};

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    for (const [module, menuAction, options] of queues) {
      const page = await browser.newPage();
      try {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.setDefaultTimeout(5000);
        await page.setRequestInterception(true);
        page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
        const dark = process.argv.includes('--dark');
        await page.setViewport(dark ? { width: 360, height: 740 } : { width: 390, height: 844 });
        const source = module === 'leave' ? 'leave.html' : 'modules/' + module + '/options/' + (module === 'attendance' ? 'team' : 'pending-approval') + '.html';
        const url = pathToFileURL(path.resolve(__dirname, '..', source));
        url.search = 'view=approvals&theme=' + (dark ? 'dark' : 'light');
        await page.goto(url.href, { waitUntil: 'load' });
        const link = await page.waitForSelector('[data-approval-id] .approval-record-link', { visible: true });
        const id = await link.evaluate(el => el.closest('[data-approval-id]').dataset.approvalId);
        const card = '[data-approval-id="' + id + '"]';
        const check = card + ' .approval-card-checkbox';
        await page.click(check);
        assert.equal(new URL(page.url()).hash, '');
        await link.click();
        const details = '[data-approval-view="details"]:not([hidden])';
        await page.waitForSelector(details, { visible: true });
        assert.equal(new URL(page.url()).hash, '#approval/details/' + encodeURIComponent(id));
        const layout = await page.$eval(details, record => {
          const frame = record.closest('.phone-container');
          const main = record.querySelector('.approval-record-layout').getBoundingClientRect();
          return { title: record.querySelector('h1').textContent, titleVisible: !!record.querySelector('h1').offsetHeight,
            width: main.width, height: main.height, frameWidth: frame.clientWidth, frameHeight: frame.clientHeight,
            listVisible: !!frame.querySelector('[data-approval-id]').getClientRects().length,
            dialog: !!record.querySelector('[aria-modal="true"]') };
        });
        assert.ok(layout.title && layout.titleVisible);
        assert.ok(layout.width >= layout.frameWidth - 2 && layout.height >= layout.frameHeight - 2, JSON.stringify(layout));
        assert.equal(layout.listVisible, false);
        assert.equal(layout.dialog, false);
        if (module === 'employee-career') {
          await page.click('[data-cv-tab="qualification"]');
          assert.equal(await page.$eval('#cv-panel-qualification', el => el.hidden), false);
        }
        if (module === 'leave') {
          assert.equal(await page.$eval('#detailsDocRef', el => el.textContent), id);
          assert.match(await page.$eval('#standardLeaveDetailsView', el => el.textContent), /Afifah Nasir/);
        }
        await page.goBack();
        await page.waitForSelector(check, { visible: true });
        assert.equal(await page.$eval(check, el => el.checked), true);
        await page.goForward();
        await page.waitForSelector(details, { visible: true });
        await page.reload({ waitUntil: 'load' });
        await page.waitForSelector(details, { visible: true });
        await page.click(details + ' [data-approval-back]');
        await page.waitForSelector(check, { visible: true });
        for (const view of ['Details', 'Workflow']) {
          await page.click(card + ' ' + options);
          const item = menuAction.startsWith('trigger') ? 'button[onclick*="' + menuAction + view + '"]' : '#' + menuAction + view;
          await page.locator(item).click();
          const record = '[data-approval-view="' + view.toLowerCase() + '"]:not([hidden])';
          await page.waitForSelector(record, { visible: true });
          assert.equal(new URL(page.url()).hash, '#approval/' + view.toLowerCase() + '/' + encodeURIComponent(id));
          await page.click(record + ' [data-approval-back]');
          await page.waitForSelector(check, { visible: true });
        }
        const pendingCount = () => page.$$eval('[data-approval-id]', cards => cards.filter(el => el.getClientRects().length).length);
        const before = await pendingCount();
        await page.click(card + ' .approval-record-link');
        await page.click(details + ' .action-btn-reject');
        if (module === 'performance') {
          await page.waitForSelector('#approvalConfirm:not([hidden])');
          await page.click('#approvalConfirmSubmit');
        }
        await page.waitForFunction(() => !PendingApprovalPage.active && !location.hash);
        assert.equal(await pendingCount(), before - 1);
        assert.ok(!await page.$eval('body', (body, selector) => !!body.querySelector(selector)?.getClientRects().length, card));
        await page.goForward();
        assert.equal(await page.evaluate(() => PendingApprovalPage.active), false, 'A handled record cannot be reopened');
        for (const [tab, heading] of categories[module] || []) {
          await page.click(tab);
          const linkSelector = await page.evaluate(() => {
            const link = [...document.querySelectorAll('.approval-record-link')].find(el => el.getClientRects().length);
            return '[data-approval-id="' + CSS.escape(link.closest('[data-approval-id]').dataset.approvalId) + '"] .approval-record-link';
          });
          await page.click(linkSelector);
          assert.equal(await page.$eval(details + ' h1', el => el.textContent), heading);
          await page.click(details + ' [data-approval-back]');
          await page.waitForSelector(linkSelector, { visible: true });
          assert.ok(await page.$eval(tab, el => el.classList.contains('active')));
        }
        assert.deepEqual(errors, []);
        console.log(module + ' passed');
      } catch (error) {
        throw new Error(module + ': ' + error.message, { cause: error });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
