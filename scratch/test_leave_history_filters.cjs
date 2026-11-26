const assert = require('assert').strict;
const path = require('path');
const puppeteer = require('puppeteer');

const pageUrl = `file:///${path.resolve(__dirname, '../leave.html').replace(/\\/g, '/')}`;

async function visibleLabels(page) {
  return page.$$eval('#historyFilterModalOverlay label', labels => labels
    .filter(label => label.getClientRects().length > 0)
    .map(label => label.textContent.replace(/\s+/g, ' ').trim()));
}

async function visibleReferences(page) {
  return page.$$eval('#myHistoryCardsList .history-item-card', cards => cards
    .filter(card => getComputedStyle(card).display !== 'none')
    .map(card => card.dataset.ref));
}

async function openFilter(page) {
  await page.evaluate(() => openHistoryFilterModal());
  await page.waitForFunction(() => getComputedStyle(document.getElementById('historyFilterModalOverlay')).display !== 'none');
}

async function closeFilter(page) {
  await page.evaluate(() => closeHistoryFilterModal());
  await page.waitForFunction(() => getComputedStyle(document.getElementById('historyFilterModalOverlay')).display === 'none');
}

async function switchTab(page, tab) {
  await page.evaluate(value => switchHistoryTab(value), tab);
  await openFilter(page);
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => showLeaveSection('viewMyLeaveHistory'));

    await page.evaluate(() => filterMyHistory('rejected'));
    assert.deepEqual(await visibleReferences(page), ['LV-2026-0032'], 'Rejected dashboard status must show its matching leave card');
    const rejectedCardText = await page.$eval('[data-ref="LV-2026-0032"]', card => card.textContent.replace(/\s+/g, ' ').trim());
    assert.match(rejectedCardText, /Annual Leave/);
    assert.match(rejectedCardText, /Rejected/);
    assert.match(rejectedCardText, /03\/09\/2026 To 03\/09\/2026/);
    assert.match(rejectedCardText, /1\.0 Days \/ 0\.0 Hours/);
    assert.match(rejectedCardText, /Rejection Reason: Insufficient team coverage/);

    await switchTab(page, 'leave');
    assert.deepEqual(await visibleLabels(page), ['Reference #', 'Start Date', 'End Date', 'Leave Type', 'Status']);
    assert.deepEqual(await page.$$eval('#modalHistoryBranchGroup, #modalHistoryDeptGroup, #modalHistoryCostCenterGroup, #modalHistoryJobGroup', groups => groups.map(group => getComputedStyle(group).display)), ['none', 'none', 'none', 'none']);
    await page.type('#modalHistoryRefInput', 'LV-2026-0041');
    await page.$eval('#modalHistoryFromDate', input => { input.value = '2026-09-10'; });
    await page.$eval('#modalHistoryToDate', input => { input.value = '2026-09-11'; });
    await page.select('#modalHistoryLeaveTypeSelect', 'annual');
    await page.select('#modalHistoryStatusSelect', 'approved');
    await page.evaluate(() => submitHistoryFilterModal());
    assert.deepEqual(await visibleReferences(page), ['LV-2026-0041']);

    await switchTab(page, 'credit');
    assert.deepEqual(await visibleLabels(page), ['Reference #', 'Start Date', 'End Date', 'Leave Type', 'Status']);
    assert.deepEqual(await page.evaluate(() => ({
      reference: document.getElementById('modalHistoryRefInput').value,
      from: document.getElementById('modalHistoryFromDate').value,
      to: document.getElementById('modalHistoryToDate').value,
      type: document.getElementById('modalHistoryLeaveTypeSelect').value,
      status: document.getElementById('modalHistoryStatusSelect').value
    })), { reference: '', from: '', to: '', type: 'all', status: 'all' }, 'Changing history tabs must not retain another tab\'s filters');
    await page.type('#modalHistoryRefInput', 'CR-2026-0003');
    await page.$eval('#modalHistoryFromDate', input => { input.value = '2026-09-16'; });
    await page.$eval('#modalHistoryToDate', input => { input.value = '2026-09-16'; });
    await page.select('#modalHistoryLeaveTypeSelect', 'replacement');
    await page.select('#modalHistoryStatusSelect', 'submitted');
    await page.evaluate(() => submitHistoryFilterModal());
    assert.deepEqual(await visibleReferences(page), ['CR-2026-0003']);

    await switchTab(page, 'offtime');
    assert.deepEqual(await visibleLabels(page), ['Search Keyword', 'Start Date', 'End Date']);
    assert.equal(await page.$eval('#modalHistoryLeaveTypeGroup', group => getComputedStyle(group).display), 'none');
    assert.equal(await page.$eval('#modalHistoryStatusGroup', group => getComputedStyle(group).display), 'none');
    assert.equal(await page.$eval('#modalHistoryRefInput', input => input.placeholder), 'e.g. Late Start, Outstation, OT...');
    await page.type('#modalHistoryRefInput', 'Outstation');
    await page.$eval('#modalHistoryFromDate', input => { input.value = '2026-09-15'; });
    await page.$eval('#modalHistoryToDate', input => { input.value = '2026-09-15'; });
    await page.evaluate(() => submitHistoryFilterModal());
    assert.deepEqual(await visibleReferences(page), ['OT-2026-0004']);

    await openFilter(page);
    await page.evaluate(() => resetHistoryFilterModal());
    assert.deepEqual(await visibleReferences(page), ['OT-2026-0008', 'OT-2026-0006', 'OT-2026-0004']);
    await closeFilter(page);

    assert.deepEqual(errors, []);
    console.log('PASS: Leave, Leave Credit and Time Off history filters expose and apply the correct tab-specific fields.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
