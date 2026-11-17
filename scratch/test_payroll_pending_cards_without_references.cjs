const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/payroll/options/pending-approval.html')).href;

async function cardState(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.approval-request-card')];
    return {
      count: cards.length,
      hasReferenceElement: cards.some(card => card.querySelector('.payroll-approval-reference')),
      hasReferenceLabel: cards.some(card => card.textContent.includes('Reference #')),
      exposesInternalId: cards.some(card => card.textContent.includes(card.dataset.itemId)),
      firstId: cards[0]?.dataset.itemId || '',
      firstEmployeeMeta: cards[0]?.querySelector('.payroll-employee-dept')?.textContent.trim() || '',
      firstEmployeeMetaFollowsId: cards[0]?.querySelector('.employee-id')?.nextElementSibling?.classList.contains('payroll-employee-dept') || false
    };
  });
}

async function openFirstDetails(page) {
  await page.click('.approval-request-card .three-dots-btn');
  await page.click('#payrollPendingViewDetails');
  return new URL(page.url()).hash;
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(`${pageUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.approval-request-card');

      const tax = await cardState(page);
      assert.equal(tax.count, 10);
      assert.equal(tax.hasReferenceElement, false);
      assert.equal(tax.hasReferenceLabel, false);
      assert.equal(tax.exposesInternalId, false);
      assert.equal(tax.firstEmployeeMeta, 'HUMAN RESOURCE');
      assert.equal(tax.firstEmployeeMetaFollowsId, true);
      const taxDetails = await openFirstDetails(page);
      assert.equal(taxDetails, '#approval/details/' + tax.firstId);
      await page.click('#payrollPendingDetails .action-btn-cancel');

      await page.click('[data-payroll-tab="deduction"]');
      const deduction = await cardState(page);
      assert.equal(deduction.count, 10);
      assert.equal(deduction.hasReferenceElement, false);
      assert.equal(deduction.hasReferenceLabel, false);
      assert.equal(deduction.exposesInternalId, false);
      const deductionDetails = await openFirstDetails(page);
      assert.equal(deductionDetails, '#approval/details/' + deduction.firstId);

      assert.deepEqual(pageErrors, []);
      await page.close();
    }

    console.log('PASS: Payroll Tax Relief cards show position while both approval card types hide references.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
