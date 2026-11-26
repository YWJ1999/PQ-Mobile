const assert = require('assert').strict;
const path = require('path');
const puppeteer = require('puppeteer');

const pageUrl = `file:///${path.resolve(__dirname, '../leave.html').replace(/\\/g, '/')}`;

async function firstCardSnapshot(page) {
  return page.$eval('#myHistoryCardsList .history-item-card', card => {
    const detailBox = card.querySelector('.card-details-box');
    const employeeName = card.querySelector('.history-employee-name');
    const employeeId = card.querySelector('.history-employee-id');
    return {
      cardText: card.textContent.replace(/\s+/g, ' ').trim(),
      detailsText: detailBox?.textContent.replace(/\s+/g, ' ').trim() || '',
      hasStatusBadge: Boolean(card.querySelector('.card-status-badge')),
      employeeName: employeeName?.textContent.trim() || '',
      employeeId: employeeId?.textContent.trim() || '',
      employeeIdDirectlyBelowName: Boolean(
        employeeName
        && employeeId
        && employeeName.nextElementSibling === employeeId
      )
    };
  });
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

    await page.evaluate(() => switchHistoryTab('leave'));
    const leave = await firstCardSnapshot(page);
    assert.equal(leave.hasStatusBadge, true, 'Leave cards must retain the current status badge design');
    assert.match(leave.detailsText, /Days \/ Hours/);
    assert.doesNotMatch(leave.detailsText, /Submit Date|Approver/);

    const readFields = ref => page.$eval(`#myHistoryCardsList [data-ref="${ref}"] .card-details-box`, box =>
      Object.fromEntries([...box.children].map(field => [field.firstElementChild.textContent.trim(), field.lastElementChild.textContent.trim()])));
    for (const [ref, dates, duration, reason] of [
      ['LV-2026-0055', '25/09/2026 To 25/09/2026', 'Full Day', 'Draft application'],
      ['LV-2026-0041', '10/09/2026 To 11/09/2026', '2.0 Days', 'Personal / Family Event'],
      ['LV-2026-0047', '22/09/2026 To 22/09/2026', 'Half Day (4.0 Hours PM)', 'Personal Appointment']
    ]) {
      const fields = await readFields(ref);
      assert.deepEqual([fields.Dates, fields.Duration, fields.Reason], [dates, duration, reason], ref);
    }
    await page.evaluate(() => {
      localStorage.setItem(LeaveRequest.storageKey, JSON.stringify([{ status: 'approved', request: {
        docRef: 'LV-SAVED-RANGE', type: 'Annual Leave', fromDate: '31 Dec 2026', toDate: '2 Jan 2027',
        duration: 'Full Day', reason: 'Family <visit> & travel', leaveDays: '3', submitDate: '2026-12-01'
      } }]));
      renderHistoryCards();
    });
    const saved = await readFields('LV-SAVED-RANGE');
    assert.deepEqual([saved.Dates, saved.Duration, saved.Reason], ['31/12/2026 To 02/01/2027', 'Full Day', 'Family <visit> & travel']);

    await page.evaluate(() => switchHistoryTab('credit'));
    const credit = await firstCardSnapshot(page);
    assert.equal(credit.hasStatusBadge, true, 'Leave Credit cards must retain the current status badge design');
    assert.match(credit.cardText, /Replacement Leave/i);
    assert.match(credit.detailsText, /Effective Date/);
    assert.match(credit.detailsText, /Expiry Date/);
    assert.match(credit.detailsText, /Days \/ Hours/);
    assert.doesNotMatch(credit.detailsText, /Credit Year|Amount|Reason/);

    await page.evaluate(() => switchHistoryTab('offtime'));
    const timeOff = await firstCardSnapshot(page);
    assert.equal(timeOff.hasStatusBadge, true, 'Time Off cards must retain the current status badge design');
    assert.equal(timeOff.employeeName, '');
    assert.equal(timeOff.employeeId, '');
    assert.doesNotMatch(timeOff.cardText, /Farhan binti rahmat|EBB12/);
    assert.match(timeOff.cardText, /Ref: OT-2026-0008/);
    assert.doesNotMatch(timeOff.cardText, /Late Start|Early Leave|Outstation/);
    assert.match(timeOff.detailsText, /Event Date/);
    assert.match(timeOff.detailsText, /Reason/);
    for (const [ref, time, hours] of [
      ['OT-2026-0008', '10:00 AM - 12:00 PM', '2.00'],
      ['OT-2026-0006', '4:00 PM - 6:00 PM', '2.00'],
      ['OT-2026-0004', '9:00 AM - 1:00 PM', '4.00']
    ]) {
      const fields = await readFields(ref);
      assert.deepEqual([fields.Time, fields.Hours], [time, hours], ref);
    }

    await page.click('#myHistoryCardsList [data-ref="OT-2026-0004"] h3');
    await page.waitForSelector('#historyDetailsTableBody tr', { visible: true });
    const detail = await page.$$eval('#historyDetailsTableBody tr', rows =>
      Object.fromEntries(rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))));
    assert.deepEqual([detail['Start Time'], detail['End Time'], detail.Hours], ['9:00 AM', '1:00 PM', '4.00']);

    assert.deepEqual(errors, []);
    console.log('PASS: Leave history cards show the required fields while retaining the existing card design.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
