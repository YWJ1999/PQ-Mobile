const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const options = pathToFileURL(path.resolve(__dirname, '../modules/payroll/options') + path.sep);
async function verify(browser, kind, action) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
    await page.setViewport({ width: 360, height: 780 });
    const tax = kind === 'tax';
    const url = name => new URL(name, options).href;
    const pending = url('pending-approval.html?tab=' + kind);
    const history = url('history.html?category=' + kind);
    await page.goto(url(tax ? 'tax-relief-request.html' : 'deduction-request.html'));
    await page.waitForSelector('#payrollSubmit:enabled');
    const values = tax
      ? { transactionDate: '2026-09-10', rebateItem: 'Lifestyle', receiptNo: '00073', amount: '0.00', description: 'Work equipment', remarks: 'Submitted note <A> & B' }
      : { deductionType: 'HOUSING LOAN', requestType: 'Stop Deduction', stopPeriod: '202610', stopDate: '2026-10-05', stopCycle: 'MONTH END', accountNo: '000105', remarks: 'Please stop this deduction' };
    await page.evaluate(values => {
      for (const [key, value] of Object.entries(values)) {
        const field = document.getElementById(key);
        field.value = value;
        field.dispatchEvent(new Event('input', {bubbles: true}));
      }
      const files = new DataTransfer();
      files.items.add(new File(['Payroll proof'], 'proof.txt', {type: 'text/plain'}));
      const input = document.getElementById('payrollFiles');
      input.files = files.files;
      input.dispatchEvent(new Event('change'));
    }, values);
    await page.click('#payrollSubmit');
    await page.waitForFunction(() => document.getElementById('payrollFormStatus').textContent === 'Saved on this device');
    if (tax) {
      await page.goto(pending);
      await page.waitForSelector('.approval-request-card');
      assert.equal(await page.$$eval('.approval-request-card', els => els.length), 10);
      await page.goto(history);
      await page.waitForSelector('[data-reference="EBB01:tax"] [data-history-action="submit"]');
      await page.$eval('[data-reference="EBB01:tax"] [data-history-action="submit"]', el => el.click());
      await page.waitForFunction(() => document.querySelector('.history-card-item[data-reference^="RBT-"]')?.dataset.status === 'submitted');
    }
    await page.goto(pending);
    const card = await page.waitForSelector('.approval-request-card[data-item-id*="-"]');
    const id = await card.evaluate(el => el.dataset.itemId);
    if (action === 'cancel') {
      await page.goto(history);
      const cancel = '[data-reference="' + id + '"] [data-history-action="cancel"]';
      await page.waitForSelector(cancel);
      await page.$eval(cancel, el => el.click());
      await page.waitForSelector('[data-reference="' + id + '"][data-status="cancelled"]');
      await page.goto(pending);
      await page.waitForSelector('.approval-request-card');
      assert.equal(await page.$('[data-item-id="' + id + '"]'), null);
      assert.deepEqual(errors, []);
      console.log('PASS', kind, 'withdrawal removes the request from pending approvals');
      return;
    }
    await card.$eval('.approval-record-link', el => el.click());
    await page.waitForSelector('#payrollPendingDetails:not([hidden])');
    await page.reload();
    await page.waitForSelector('#payrollPendingDetails:not([hidden])');
    assert.equal(await page.$('#payrollPendingForm :is(input,select,textarea,button,table)'), null);
    const received = await page.$$eval('[data-payroll-field]', els => Object.fromEntries(els.map(el => [el.dataset.payrollField, el.textContent])));
    assert.deepEqual(received, tax ? { ...values, transactionDate: '10 Sept 2026', amount: 'RM 0.00' } : { ...values, stopDate: '5 Oct 2026' });
    assert.equal(await page.$eval('#payrollPendingForm a[download]', async el => (await fetch(el.href)).text()), 'Payroll proof');
    await page.click('#payrollPendingDetails [data-approval-back]');
    await page.waitForSelector('[data-item-id="' + id + '"]', {visible: true});
    await page.$eval('[data-item-id="' + id + '"] .approval-record-link', el => el.click());
    const comment = 'Payroll reviewed ' + action;
    await page.type('#payrollPendingApproverComments', comment);
    await page.click('#payrollPendingDetails [data-payroll-action="' + action + '"]');
    await page.waitForSelector('#payrollPendingDetails', {hidden: true});
    await page.reload();
    await page.waitForSelector('.approval-request-card');
    assert.equal(await page.$('[data-item-id="' + id + '"]'), null);
    await page.goto(history);
    const historyCard = await page.waitForSelector('[data-reference="' + id + '"]');
    assert.equal(await historyCard.evaluate(el => el.dataset.status), {approve:'approved', reject:'rejected', resubmit:'resubmit'}[action]);
    await historyCard.$eval('.history-card-main', el => el.click());
    assert.ok((await page.$eval('#historyDetailBody', el => el.textContent)).includes(comment));
    assert.deepEqual(errors, []);
    console.log('PASS', kind, action, 'submitted values, file contents, navigation and history');
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({headless: true, executablePath: process.env.CHROME_BIN || puppeteer.executablePath()});
  try {
    for (const [kind, action] of [['tax', 'resubmit'], ['deduction', 'reject'], ['tax', 'approve'], ['deduction', 'cancel']]) {
      await verify(browser, kind, action);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
