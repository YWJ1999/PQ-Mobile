const assert = require('assert').strict;
const path = require('path');
const puppeteer = require('puppeteer');

const pageUrl = `file:///${path.resolve(__dirname, '../leave.html').replace(/\\/g, '/')}`;
const expectedLabels = [
  'Employee No.', 'Name', 'Leave Type', 'Leave Year', 'Full Enti', 'Entitled', 'B/Fwd',
  'Total', 'Adjustment', 'Credit', 'Excess Cut', 'Shared', 'S/N', 'Expired',
  'Final Total', 'Last Update'
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => showLeaveSection('viewStaffEntitlement'));

    const firstCard = '#staffEntitlementRecordCardsContainer .card';
    assert.equal(await page.$eval(firstCard, card => card.getAttribute('role')), 'button');
    await page.click(firstCard);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('staffEntitlementDetailsModal')).display !== 'none');

    const result = await page.evaluate(() => {
      const overlay = document.getElementById('staffEntitlementDetailsModal');
      const rows = [...document.querySelectorAll('#staffEntitlementDetailsRows .staff-entitlement-detail-row')];
      return {
        title: document.getElementById('staffEntitlementDetailsTitle').textContent.trim(),
        labels: rows.map(row => row.querySelector('dt').textContent.trim()),
        values: rows.map(row => row.querySelector('dd').textContent.trim()),
        alignItems: getComputedStyle(overlay).alignItems,
        justifyContent: getComputedStyle(overlay).justifyContent
      };
    });

    assert.equal(result.title, 'Staff Leave Entitlement Details');
    assert.deepEqual(result.labels, expectedLabels);
    assert.equal(result.values[0], '00035');
    assert.equal(result.values[1], 'George bill');
    assert.equal(result.values[2], 'ANNUAL LEAVE');
    assert.equal(result.values[3], '2026');
    assert.ok(result.values.every(Boolean), 'Every entitlement detail must have a value');
    assert.equal(result.alignItems, 'center');
    assert.equal(result.justifyContent, 'center');

    await page.evaluate(() => closeStaffEntitlementDetailsModal());
    await page.waitForFunction(() => getComputedStyle(document.getElementById('staffEntitlementDetailsModal')).display === 'none');
    console.log('PASS: Staff Leave Entitlement cards open the complete centered details modal.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
