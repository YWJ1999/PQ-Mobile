const assert = require('node:assert/strict');
const path = require('node:path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`file://${path.resolve(__dirname, '../leave.html')}`, {
      waitUntil: 'domcontentloaded'
    });

    const result = await page.evaluate(() => {
      showLeaveSection('viewTeamApprovals');
      switchApprovalCategory('credit');
      const inspect = id => {
        const card = document.getElementById(id);
        const text = card?.textContent.replace(/\s+/g, ' ').trim() || '';
        return {
          visible: card ? getComputedStyle(card).display !== 'none' : false,
          text,
          creditLeaveLabels: [...(card?.querySelectorAll('[data-credit-leave-label]') || [])]
            .map(node => node.textContent.replace(/\s+/g, ' ').trim()),
          creditLeaveValues: [...(card?.querySelectorAll('[data-credit-leave-value]') || [])]
            .map(node => node.textContent.replace(/\s+/g, ' ').trim()),
          creditLeaveValueColor: card?.querySelector('[data-credit-leave-value]')
            ? getComputedStyle(card.querySelector('[data-credit-leave-value]')).color
            : '',
          creditTypeValueColor: card?.querySelector('[data-credit-leave-summary]')?.previousElementSibling?.querySelector('dd')
            ? getComputedStyle(card.querySelector('[data-credit-leave-summary]').previousElementSibling.querySelector('dd')).color
            : ''
        };
      };
      return {
        first: inspect('approvalCardCredit1'),
        second: inspect('approvalCardCredit2')
      };
    });

    assert.equal(result.first.visible, true);
    assert.equal(result.second.visible, true);

    assert.match(result.first.text, /Credit Type Working on Public Holiday/);
    assert.doesNotMatch(result.first.text, /\(\+1\.000 Day \/ Replacement\)/);
    assert.deepEqual(result.first.creditLeaveLabels, ['Credit Leave']);
    assert.deepEqual(result.first.creditLeaveValues, ['Replacement Leave']);
    assert.equal(result.first.creditLeaveValueColor, result.first.creditTypeValueColor);
    assert.doesNotMatch(result.first.text, /Credit Leave:/);
    assert.match(result.first.text, /\+1\.000 Day/, 'Credit timeline amount must remain');

    assert.match(result.second.text, /Credit Type Holiday Standby Credit/);
    assert.doesNotMatch(result.second.text, /\(\+8\.0h \/ \+1\.0 Day\)/);
    assert.deepEqual(result.second.creditLeaveLabels, ['Credit Leave']);
    assert.deepEqual(result.second.creditLeaveValues, ['Replacement Leave']);
    assert.equal(result.second.creditLeaveValueColor, result.second.creditTypeValueColor);
    assert.doesNotMatch(result.second.text, /Credit Leave:/);
    assert.match(result.second.text, /\+8\.0 Hours/, 'Credit timeline amount must remain');

    const secondDetails = await page.evaluate(async () => {
      document.querySelector('#approvalCardCredit2 button[title="Options"]').click();
      triggerViewDetailsFromMenu();
      await new Promise(resolve => setTimeout(resolve, 350));
      const text = id => document.getElementById(id)?.textContent.trim() || '';
      return {
        header: text('approvalDetailsModalHeaderTitle'),
        creditLeave: text('lcDetailsCreditLeave'),
        creditType: text('lcDetailsCreditType'),
        submitDate: text('lcDetailsSubmitDate'),
        fromDate: text('lcDetailsFromDate'),
        toDate: text('lcDetailsToDate'),
        creditDays: text('lcDetailsCreditDays'),
        effectiveDateLabel: text('lcDetailsEffectiveDateLabel'),
        effectiveDate: text('lcDetailsEffectiveDate'),
        reason: text('lcDetailsReason'),
        remark: text('lcDetailsRemark')
      };
    });

    assert.deepEqual(secondDetails, {
      header: 'Leave Credit Approval',
      creditLeave: 'REPLACEMENT LEAVE',
      creditType: 'Holiday Standby Credit',
      submitDate: '01 May 2026',
      fromDate: '01 May 2026',
      toDate: '01 May 2026',
      creditDays: '1.000',
      effectiveDateLabel: 'Credit Expiry:',
      effectiveDate: '31 Dec 2026',
      reason: 'Holiday Cloud Standby',
      remark: 'Labor Day holiday standby and emergency cluster failover monitoring.'
    });

    const firstEffectiveDateLabel = await page.evaluate(async () => {
      document.querySelector('#approvalCardCredit1 button[title="Options"]').click();
      triggerViewDetailsFromMenu();
      await new Promise(resolve => setTimeout(resolve, 350));
      return document.getElementById('lcDetailsEffectiveDateLabel')?.textContent.trim() || '';
    });
    assert.equal(firstEffectiveDateLabel, 'Effective Date:');

    assert.deepEqual(pageErrors, []);
    console.log('PASS: Leave Credit approval cards show Credit Leave without shorthand amount/type text.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
