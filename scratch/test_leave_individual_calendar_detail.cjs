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

    async function inspect(itemData) {
      return page.evaluate(data => {
        openCalEventSheet('2026-09-10', data);
        const card = document.querySelector('#calSheetEventsList .cal-leave-detail-card');
        const purpleHeader = card?.querySelector('.leave-highlight-detail-date');
        return {
          modalDate: document.getElementById('calSheetDateTitle')?.textContent.trim() || '',
          purpleHeaderText: purpleHeader?.textContent.replace(/\s+/g, ' ').trim() || '',
          headerTitle: purpleHeader?.querySelector('.cal-leave-detail-header-title')?.textContent.trim() || '',
          headerReference: purpleHeader?.querySelector('.cal-leave-detail-reference')?.textContent.trim() || '',
          headerHeight: purpleHeader ? Math.round(purpleHeader.getBoundingClientRect().height) : 0,
          contentTypeCount: card?.querySelectorAll('.cal-leave-detail-title').length || 0,
          submitDate: card?.querySelector('.record-submit-date > strong')?.textContent,
          bodyReferenceCount: card?.querySelectorAll('.cal-calendar-highlight-content .cal-leave-detail-reference').length || 0,
          labels: [...(card?.querySelectorAll('.leave-highlight-detail-label') || [])]
            .map(node => node.textContent.trim())
        };
      }, itemData);
    }

    const annual = await inspect({
      type: 'al', status: 'Approved', leaveType: 'Annual Leave',
      ref: 'LV-2026-0041', submittedDate: '05/09/2026', duration: 'Full Day'
    });
    const medical = await inspect({
      type: 'mc', status: 'Approved', leaveType: 'Medical Leave',
      ref: 'LV-2026-0044', submittedDate: '09/09/2026', duration: 'Full Day'
    });
    const holiday = await inspect({
      type: 'ph', status: 'Approved', phName: 'Malaysia Day',
      ref: 'PH-2026-0009', submittedDate: '-', duration: 'Full Day'
    });

    assert.equal(annual.modalDate, 'Thursday, Sep 10, 2026');
    assert.equal(annual.purpleHeaderText, 'Annual Leave Ref: LV-2026-0041');
    assert.equal(annual.headerTitle, 'Annual Leave');
    assert.equal(annual.headerReference, 'Ref: LV-2026-0041');
    assert.equal(annual.contentTypeCount, 0, 'Leave type must not repeat in the card body');
    assert.equal(annual.bodyReferenceCount, 0, 'Reference must not repeat in the card body');
    assert.deepEqual(annual.labels, ['Duration']);
    assert.equal(annual.submitDate, '05/09/2026');
    assert.equal(holiday.submitDate, undefined);
    assert.equal(medical.headerTitle, 'Medical Leave');
    assert.equal(medical.headerReference, 'Ref: LV-2026-0044');
    assert.equal(medical.bodyReferenceCount, 0);
    assert.equal(holiday.headerTitle, 'Malaysia Day');
    assert.equal(holiday.headerReference, 'Ref: PH-2026-0009');
    assert.equal(holiday.bodyReferenceCount, 0);
    assert.ok(annual.headerHeight >= 50 && annual.headerHeight <= 56, `Unexpected header height: ${annual.headerHeight}px`);
    assert.equal(medical.headerHeight, annual.headerHeight);
    assert.equal(holiday.headerHeight, annual.headerHeight);
    assert.deepEqual(pageErrors, []);

    console.log('PASS: Individual calendar detail uses leave type in the purple header without repeating the date or type.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
