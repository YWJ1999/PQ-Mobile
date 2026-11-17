const puppeteer = require('puppeteer');
const path = require('path');

const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

const { checkType } = require('./claim_approval_checks.cjs');

async function openDetails(page, tabName, itemId) {
  if (await page.$('#claimDetailsModalOverlay:not([hidden])')) {
    await page.click('#claimDetailsModalOverlay [data-approval-back]');
    await page.waitForSelector('#claimDetailsModalOverlay', { hidden: true });
  }
  await page.evaluate((name) => {
    const tab = [...document.querySelectorAll('.filter-pill')]
      .find(button => button.textContent.trim() === name);
    if (!tab) throw new Error(`Missing tab: ${name}`);
    tab.click();
  }, tabName);

  const link = '[data-approval-id="' + itemId + '"] .approval-record-link';
  await page.$eval(link, el => el.scrollIntoView({ block: 'center' }));
  await page.locator(link).click();
  await page.waitForSelector('#claimDetailsModalOverlay:not([hidden])');
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.setDefaultTimeout(6000);
    await page.setViewport({ width: 360, height: 820 });
    await page.setRequestInterception(true);
    page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
    const url = pathToFileURL(path.resolve(__dirname, '../modules/claims/options/pending-approval.html')).href;
    await page.goto(url);
    await openDetails(page, 'Benefit', '1');
    const review = '#claimDetailsDynamicBody > .benefit-claim-fields';
    const fields = () => page.$$eval(review + ' [data-benefit-field]', els =>
      Object.fromEntries(els.map(el => [el.dataset.benefitField, el.textContent])));
    const benefit = await fields();
    assert.deepEqual(benefit, { entitlementYear: '2019', benefitType: 'PERSONAL ALLOWANCE',
      entitledBalance: '—', usableBalance: '—', periodYear: '2019', periodMonth: 'February',
      fromDate: '4 Sep 2019', toDate: '4 Sep 2019', purpose: 'Purpose', receiptNo: 'Receipt',
      otherRef: 'Reference', currency: 'INDONESIAN RUPIAH', amount: '-5.00', claimQuantity: '0', remarks: 'Remarks' });
    assert.equal(await page.$(review + ' :is(input, select, textarea, button, [onclick])'), null);
    assert.equal(await page.$eval('#claimDetailsDynamicBody', el => el.firstElementChild.querySelector('h2').textContent), 'Benefit Details');
    assert.ok(!/Document Reference|Submission details|Farhan binti rahmat/.test(await page.$eval(review, el => el.innerText)));
    for (const [theme, width, decision] of [['light', 360, 'approve'], ['dark', 420, 'resubmit'], ['dark', 360, 'reject']]) {
      await page.setViewport({ width, height: 820 });
      await page.goto(new URL('benefit-claim.html?theme=' + theme, url));
      await page.click('[data-benefit-type="MOBILE PHONE"] button');
      await page.select('#claimPeriodMonth', 'July');
      await page.select('#currencySelect', 'SGD');
      await page.type('#expenseAmountInput', '12.30');
      await page.type('#purposeInput', 'Work calls <project>');
      await page.type('#receiptNoInput', 'TX-18');
      await page.type('#remarksInput', 'Receipt & call list');
      await page.$eval('#hiddenClaimFileInput', el => {
        for (const name of ['bill.pdf', 'calls.txt']) {
          const transfer = new DataTransfer();
          transfer.items.add(new File(['sample'], name));
          el.files = transfer.files;
          el.dispatchEvent(new Event('change'));
        }
      });
      await page.click('#viewBenefitForm button[onclick="submitBenefitClaimForm()"]');
      await page.waitForSelector('#viewBenefitList', { visible: true });
      await page.goto(url + '?theme=' + theme);
      const id = await page.$eval('pending-approval-card', el => el.getAttribute('item-id'));
      await openDetails(page, 'Benefit', id);
      await page.reload();
      await page.waitForSelector(review);
      const data = await fields();
      for (const [key, value] of Object.entries({ benefitType: 'MOBILE PHONE', entitledBalance: '900.00', usableBalance: '780.00',
        periodMonth: 'July', currency: 'SGD - SINGAPORE DOLLAR', amount: '12.30', purpose: 'Work calls <project>', receiptNo: 'TX-18', remarks: 'Receipt & call list' })) assert.equal(data[key], value, key);
      assert.deepEqual(await page.$$eval(review + ' .attachment-upload-item', els => els.map(el => el.textContent)), ['bill.pdf', 'calls.txt']);
      assert.ok(await page.$eval(review, el => el.scrollWidth <= el.clientWidth + 1));
      await page.type('#claimDetailApproverComments', 'Checked receipts.');
      await page.click('#claimDetailsModalOverlay .action-btn-' + decision);
      await page.waitForSelector('#claimDetailsModalOverlay', { hidden: true });
      await page.reload();
      assert.equal(await page.$('[data-approval-id="' + id + '"]'), null);
      await page.goto(new URL('history.html', url));
      const historyCard = await page.waitForSelector('.history-card-item');
      assert.equal(await historyCard.evaluate(el => el.dataset.status), {approve:'approved', resubmit:'resubmit', reject:'rejected'}[decision]);
      await historyCard.click();
      const history = await page.$eval('#claimDetailsModalContainer', el => el.textContent);
      assert.match(history, /Checked receipts\./);
      assert.match(history, /Work calls <project>/);
      console.log('PASS Benefit Claim', theme, width, decision);
    }
    await page.goto(url);
    await openDetails(page, 'Medical', '5');
    const medicalFields = '#claimDetailsDynamicBody [data-claim-field=';
    assert.equal(await page.$eval(medicalFields + 'receiptNo]', el => el.textContent), 'QC-5510');
    assert.equal(await page.$eval(medicalFields + 'entitledBalance]', el => el.textContent), 'RM 800.00');
    for (const [amount, expected] of [[0, '0.00'], [250.5, '250.50'], [null, '100.00']]) {
      await page.evaluate(value => { window.MOCK_TEAM_APPROVALS.find(item => item.id === 2).claimTotal = value; }, amount);
      await openDetails(page, 'Medical', '2');
      assert.equal(await page.$eval(medicalFields + 'claimTotal]', el => el.textContent), expected);
    }
    await checkType(browser, 'medical');
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
