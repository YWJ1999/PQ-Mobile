const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const options = pathToFileURL(path.resolve(__dirname, '../modules/claims/options') + path.sep);
const review = '#claimDetailsDynamicBody .claim-request-review';
const types = {
  medical: { page: 'medical-claim', seed: 2, title: 'Medical Claim Approval', submit: 'submitMedicalClaim',
    entries: [['#mPatientName', 'AHMAD BIN RAHMAT'], ['#detReceiptNoInput', 'Clinic receipt 84']], seedValues: ['2016', 'Out Patient', 'CONSULTATION'] },
  ot: { page: 'ot-claim', seed: 3, title: 'OT Claim Approval', submit: 'submitOTClaim',
    entries: [['#otRemarksInput', 'Night shift handover']], seedValues: ['2024', '18:57:00'] },
  travel: { page: 'travel-claim', seed: 6, title: 'Travel Mileage Approval', submit: 'goToNextTravelClaimStep',
    entries: [['#mDesc', 'Mileage to site'], ['#tReceiptNo', 'Rail ticket 48'], ['#eDesc', 'Parking receipt 21']],
    seedValues: ['FINANCE & ADMIN', '23/04/2024', '45.00', 'DAILY TRAVEL ALLOWANCE'] },
  travelRequest: { page: 'travel-request', seed: 12, title: 'Travel Request Approval', submit: 'goToNextTravelRequestStep',
    entries: [['#entryTaskLocation', 'Client site'], ['#entryTrvJustification', 'Site survey'], ['#entryAccRemarks', 'Late arrival']],
    seedValues: ['Testing submission', 'Ipoh', '1,000.00', 'WESTIN HOTEL'] },
  entertainment: { page: 'entertainment-claim', seed: 7, title: 'Entertainment Claim Approval', submit: 'goToNextEntertainmentStep',
    entries: [['#detailDescription', 'Client lunch'], ['#employeeSelect', 'EBB01'], ['#guestNameInput', 'Guest Ng']],
    seedValues: ['January', '678.00', 'BENEFITS & COMPENSATION EXECUTIVE', 'fdggsfdvg'] },
  advance: { page: 'advance-claim', seed: 8, title: 'Advance Request Approval', submit: 'submitAdvanceClaim',
    entries: [['#expenseDescription', 'Site advance']], seedValues: ['check item NOW', 'ITEM A'] },
  expense: { page: 'expenses-claim', seed: 10, title: 'Expense Claim Approval', submit: 'submitClaim',
    entries: [['#itemDescription', 'Printing charges']], seedValues: ['MANAGEMENT', '1,229.85'] }
};

async function click(page, selector) {
  await page.$eval(selector, el => el.click());
}

async function uploadMedical(page, target, name) {
  await page.evaluate((target, name) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['sample'], name));
    const el = document.getElementById('hiddenMedicalFileInput');
    formData.uploadTarget = target;
    el.files = transfer.files;
    el.dispatchEvent(new Event('change'));
  }, target, name);
}

async function checkType(browser, tab) {
  const config = types[tab];
  const page = await browser.newPage();
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    page.setDefaultTimeout(6000);
    const theme = config.seed % 2 ? 'dark' : 'light';
    await page.setViewport({ width: theme === 'dark' ? 390 : 360, height: 800 });
    const pending = new URL('pending-approval.html?theme=' + theme, options).href;
    await page.goto(pending + '#approval/details/' + config.seed);
    await page.waitForSelector(review, { visible: true });
    assert.equal(await page.$eval('#claimDetailHeaderTitle', el => el.textContent), config.title);
    const contents = await page.$$eval(review + ' > .form-card', els => els.map(el => el.textContent));
    config.seedValues.forEach((text, i) => assert.ok(contents[i].includes(text), 'Existing record should show ' + text));
    await page.goto(new URL(config.page + '.html?theme=' + theme, options).href);
    if (tab === 'medical') await click(page, 'button[onclick="openMedicalClaimForm()"]');
    const steps = await page.$$eval('.stepper-label', els => els.map(el => el.textContent));
    const fieldKeys = await page.$$eval('#view-1-main [data-claim-field]', els => els.map(el => el.dataset.claimField));
    const marker = 'Review ' + tab + ' & details';
    if (tab !== 'ot') await page.$eval('[data-claim-field="remarks"]', (el, value) => { el.value = value; }, marker);
    if (tab === 'medical') await uploadMedical(page, 'main', 'visit-summary.pdf');
    if (tab === 'travelRequest') await page.select('#v1Passengers', 'Sarah Jenkins');
    if (tab === 'entertainment') await click(page, '#boardApproveCheck');
    for (const [i, [field, value]] of config.entries.entries()) {
      if (tab !== 'ot') await click(page, '#stepNode-' + (i + 2));
      if (!(tab === 'medical' && i === 0)) await click(page, '.view-container.active button[aria-label="Add Item"]');
      await page.$eval(field, (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      if (tab === 'medical' && i === 1) await uploadMedical(page, 'detail', 'receipt.pdf');
      await click(page, '.view-container.active button[onclick="saveSubItem()"]');
    }
    if (tab === 'expense') {
      await click(page, '.view-container.active button[aria-label="Add Item"]');
      await page.$eval('#itemDescription', el => { el.value = 'Second expense'; });
      await click(page, '.view-container.active button[onclick="saveSubItem()"]');
    }
    await Promise.all([page.waitForNavigation(), click(page, '.view-container.active button[onclick="' + config.submit + '()"]')]);
    await page.goto(pending);
    const claimType = await page.$eval('pending-approval-card[item-id="' + config.seed + '"]', el => el.getAttribute('claim-type'));
    await click(page, '.filter-pill[onclick*="\'' + claimType + '\'"]');
    assert.deepEqual(await page.$$eval('pending-approval-card', cards => [...new Set(cards.map(el => el.getAttribute('claim-type')))]), [claimType]);
    const id = await page.$eval('pending-approval-card', el => el.getAttribute('item-id'));
    assert.ok(Number(id) > 12);
    const link = '[data-approval-id="' + id + '"] .approval-record-link';
    await click(page, link);
    await page.waitForSelector(review, { visible: true });
    await click(page, '#claimDetailsModalOverlay [data-approval-back]');
    await page.waitForSelector(link, { visible: true });
    await click(page, link);
    await page.reload();
    await page.waitForSelector(review, { visible: true });
    assert.equal(await page.$(review + ' :is(table, input, select, textarea, [onclick], [contenteditable=true])'), null);
    assert.deepEqual(await page.$$eval(review + ' [data-claim-field]', els => els.map(el => el.dataset.claimField)), fieldKeys);
    assert.deepEqual(await page.$$eval(review + ' .claim-review-step', els => els.map(el => el.lastElementChild.textContent)), steps);
    if (tab !== 'ot') assert.equal(await page.$eval(review + ' [data-claim-field="remarks"]', el => el.textContent), marker);
    if (tab === 'medical') assert.equal(await page.$eval(review + ' .claim-review-files > div', el => el.textContent), 'visit-summary.pdf');
    if (tab === 'travelRequest') assert.equal(await page.$eval(review + ' [data-claim-field="passengers"]', el => el.textContent), 'Sarah Jenkins');
    if (tab === 'entertainment') assert.equal(await page.$eval(review + ' [data-claim-field="boardApprove"]', el => el.textContent), 'Yes');
    const comment = 'Checked ' + tab + ' submission.';
    await page.type('#claimDetailApproverComments', comment);
    for (const [i, [, value]] of config.entries.entries()) {
      if (steps.length) await click(page, review + ' nav button:nth-child(' + (i + 2) + ')');
      const panels = await page.$$(review + ' > .form-card');
      await panels[i + 1].$$eval('details:not([open]) > summary', summary => summary.forEach(el => el.click()));
      const content = await panels[i + 1].evaluate(el => ({
        visible: el.getClientRects().length, text: el.innerText, width: el.clientWidth, scroll: el.scrollWidth
      }));
      assert.ok(content.visible && content.width >= content.scroll - 1, JSON.stringify(content));
      assert.ok(content.text.includes(value), 'Submitted ' + tab + ' entry should include ' + value);
      if (value === 'Clinic receipt 84') assert.ok(content.text.includes('receipt.pdf'));
      if (tab === 'expense') {
        assert.ok((await panels[i + 1].$$('details')).length >= 2);
        assert.match(await panels[i + 1].evaluate(el => el.innerText), /Second expense/);
      }
    }
    assert.equal(await page.$eval('#claimDetailApproverComments', el => el.value), comment);
    const [decision, status] = [['approve', 'approved'], ['resubmit', 'resubmit'], ['reject', 'rejected']][config.seed % 3];
    await page.click('#claimDetailsModalOverlay .action-btn-' + decision);
    await page.waitForSelector('#claimDetailsModalOverlay', { hidden: true });
    await page.reload();
    assert.equal(await page.$(link), null);
    await page.goto(new URL('history.html', options).href);
    await page.evaluate(tab => switchClaimTab(tab), tab);
    const card = await page.waitForSelector('.history-card-item');
    assert.equal(await card.evaluate(el => el.dataset.status), status);
    await card.evaluate(el => el.click());
    const history = await page.$eval('[data-saved-claim-review]', el => el.textContent);
    assert.ok(history.includes(comment));
    for (const [, value] of config.entries) assert.ok(history.includes(value));
    assert.deepEqual(errors, []);
    console.log('PASS', config.title, 'existing record, application, read-only steps, decision, history');
  } finally {
    await page.close();
  }
}

async function run(tabs = Object.keys(types)) {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const tab of tabs) await checkType(browser, tab);
  } finally {
    await browser.close();
  }
}

module.exports = { checkType, run };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
