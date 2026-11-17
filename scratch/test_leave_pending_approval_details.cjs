const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '..', 'leave.html')).href;
const active = '[data-approval-view="details"]:not([hidden])';
const field = key => '[data-review-field="' + key + '"]';

async function verify(browser, theme, width, decision) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(5000);
  await page.setRequestInterception(true);
  page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
  await page.setViewport({ width, height: 820 });
  const queue = url + '?view=approvals&mode=team&theme=' + theme;
  const open = async ref => {
    await page.click('[data-approval-id="' + ref + '"] .approval-record-link');
    await page.waitForSelector(active);
  };
  const back = async () => {
    await page.click(active + ' [data-approval-back]');
    await page.waitForSelector(active, { hidden: true });
  };
  const value = selector => page.$eval(selector, el => el.textContent.trim());
  try {
    await page.goto(queue);
    await open('VLV000000000790');
    assert.equal(await value(active + ' h1'), 'Leave Approval');
    assert.equal(await page.$eval('#standardLeaveDetailsView', el => el.firstElementChild.id), 'leaveApprovalForm');
    assert.equal(await value(field('fromDate')), '23 Feb 2026');
    assert.equal(await value(field('leaveDays')), '3.000');
    assert.equal(await value(field('shortNotice')), 'Yes');
    assert.equal(await value(field('blockLeave')), '—');
    assert.match(await value(field('remark')), /home repair/);
    assert.equal(await page.$(field('mcChitNo')), null);
    assert.match(await value('#leaveApprovalForm [data-leave-heading]'), /^Leave Details/);
    await back();
    await page.click('#approvalCard1 button[title="Options"]');
    await page.locator('button[onclick*="triggerViewDetailsFromMenu"]').click();
    await page.waitForSelector(active, { visible: true });
    assert.ok(await page.$eval(active, el => {
      const frame = el.closest('.phone-container').getBoundingClientRect();
      const header = el.querySelector('header').getBoundingClientRect();
      const footer = el.querySelector('#approvalDetailsFooter').getBoundingClientRect();
      return Math.abs(header.top - frame.top) < 2 && Math.abs(footer.bottom - frame.bottom) < 2;
    }), 'The header and decision footer should fit the phone after opening the options menu');
    await back();

    for (const [tab, ref, title, table] of [
      ['#tabApprovalCredit', 'LVR000000000589', 'Leave Credit Approval', '#leaveCreditDetailsView table'],
      ['#tabApprovalOfftime', 'VOT000000000281', 'Time Off Approval', '#timeOffDetailsView table']
    ]) {
      await page.click(tab);
      await open(ref);
      assert.equal(await value(active + ' h1'), title);
      await page.waitForSelector(table, { visible: true });
      await back();
    }

    await page.goto(url + '?view=apply&theme=' + theme);
    await page.evaluate(() => openLeaveApplyModal('Medical Leave'));
    await page.select('#mainFormReasonSelect', 'medical');
    await page.select('#mainFormRelieverSelect', 'sarah');
    const form = '#viewApplyLeaveForm ';
    await page.type(form + '[data-leave-field="mcChitNo"]', 'MC-123');
    await page.type(form + '[data-leave-field="natureIllness"]', 'Fever');
    await page.select(form + '[data-leave-field="clinic"]', 'sjmc');
    await page.type(form + 'textarea', 'Rest <today> & tomorrow.');
    await page.click(form + '.duration-tab-btn:nth-child(3)');
    await page.click(form + '[data-leave-field="blockLeave"]');
    await page.evaluate(() => {
      const input = document.getElementById('hiddenLeaveFileInput');
      for (const name of ['certificate.pdf', 'receipt.png']) {
        const data = new DataTransfer();
        data.items.add(new File(['test'], name));
        input.files = data.files;
        input.dispatchEvent(new Event('change'));
      }
    });
    await page.click(form + 'button[onclick="submitLeaveApplicationForm()"]');
    const historyCard = await page.waitForSelector('#myHistoryCardsList .history-item-card', { visible: true });
    const ref = await historyCard.evaluate(el => el.dataset.ref);
    await page.goto(queue);
    await open(ref);
    await page.reload();
    await page.waitForSelector(active);
    for (const [key, expected] of Object.entries({ type: 'Medical Leave', leaveDays: '0.5', duration: '2nd Half',
      blockLeave: 'Yes', advanceLeave: 'No', reason: 'Medical / Illness', reliever: 'Sarah Wong (Team Lead)',
      remark: 'Rest <today> & tomorrow.', mcChitNo: 'MC-123', natureIllness: 'Fever', clinic: 'Subang Jaya Medical Centre (Hospital)' })) {
      assert.equal(await value(field(key)), expected, key);
    }
    assert.deepEqual(await page.$$eval('#leaveApprovalForm .form-attachment-file-name', els => els.map(el => el.textContent)), ['certificate.pdf', 'receipt.png']);
    assert.equal(await page.$('#leaveApprovalForm :is(input,select,textarea,button,[onclick],[contenteditable])'), null);
    assert.ok(await page.$eval('#leaveApprovalForm', el => el.scrollWidth <= el.clientWidth + 1));
    await page.type('#approvalActionCommentsInput', 'Reviewed the certificate.');
    await page.click('#approvalDetailsFooter .action-btn-' + decision);
    await page.waitForSelector(active, { hidden: true });
    await page.reload();
    assert.equal(await page.$('[data-approval-id="' + ref + '"]'), null);
    await page.goto(url + '?view=history&theme=' + theme);
    const entry = '#myHistoryCardsList [data-ref="' + ref + '"]';
    assert.equal(await page.$eval(entry, el => el.dataset.status), { approve: 'approved', reject: 'rejected', resubmit: 'resubmit' }[decision]);
    await page.click(entry + ' h3');
    const history = await value('#historyDetailsTableBody');
    assert.match(history, /Reviewed the certificate\./);
    assert.match(history, /Rest <today> & tomorrow\./);
    assert.deepEqual(errors, []);
    console.log('PASS ' + theme + ' ' + width + 'px: saved request, read-only review, ' + decision + ', history and adjacent approval types');
  } finally { await context.close(); }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  try {
    await verify(browser, 'light', 360, 'approve');
    await verify(browser, 'dark', 420, 'reject');
    await verify(browser, 'dark', 360, 'resubmit');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
