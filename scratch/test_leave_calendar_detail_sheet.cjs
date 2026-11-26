const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const leaveUrl = pathToFileURL(path.resolve(__dirname, '..', 'leave.html')).href;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 900 });
    await page.goto(leaveUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof openCalEventSheet === 'function');

    const leaveTypes = [
      { type: 'al', leaveType: 'Annual Leave', ref: 'LV-2026-0047' },
      { type: 'mc', leaveType: 'Medical Leave', ref: 'LV-2026-0052' },
      { type: 'ph', leaveType: 'Public Holiday', ref: 'LV-2026-0060' }
    ];

    for (const leave of leaveTypes) {
      const detail = await page.evaluate(item => {
        openCalEventSheet('2026-09-22', {
          ...item,
          status: 'Approved',
          label: item.type.toUpperCase(),
          duration: 'Half Day',
          durationHours: '4.0 Hours (PM)',
          submittedDate: '18/09/2026'
        });

        const card = document.querySelector('#calSheetEventsList .cal-leave-detail-card');
        const dateHeader = card?.querySelector('.leave-highlight-detail-date');
        const footerButtons = [...document.querySelectorAll('#calEventSheetOverlay .cal-event-sheet-actions button')];
        return {
          title: card?.querySelector('.cal-leave-detail-title')?.textContent.trim(),
          reference: card?.querySelector('.cal-leave-detail-reference')?.textContent.trim(),
          submitDate: card?.querySelector('.record-submit-date > strong')?.textContent,
          rowLabels: [...card.querySelectorAll('.cal-leave-detail-label')].map(node => node.textContent.trim()),
          usesHighlightRecord: card?.classList.contains('leave-highlight-detail-record'),
          dateHeader: dateHeader?.textContent.trim(),
          dateHeaderBackground: dateHeader ? getComputedStyle(dateHeader).backgroundImage : '',
          detailTileCount: card?.querySelectorAll('.leave-highlight-detail-field').length,
          hasHeaderIcon: Boolean(card.querySelector('.cal-leave-detail-icon')),
          hasHeaderTag: Boolean(card.querySelector('.cal-leave-detail-tag')),
          footerLabels: footerButtons.map(button => button.textContent.trim()),
          hasPrimaryButton: Boolean(document.getElementById('calSheetPrimaryBtn'))
        };
      }, leave);

      assert.equal(detail.title, leave.leaveType);
      assert.equal(detail.reference, `Ref: ${leave.ref}`);
      assert.deepEqual(detail.rowLabels, ['Duration']);
      assert.equal(detail.submitDate, '18/09/2026');
      assert.equal(detail.usesHighlightRecord, true);
      assert.equal(detail.dateHeader, '22 Sep 2026');
      assert.match(detail.dateHeaderBackground, /linear-gradient/);
      assert.equal(detail.detailTileCount, 1);
      assert.equal(detail.hasHeaderIcon, false);
      assert.equal(detail.hasHeaderTag, false);
      assert.deepEqual(detail.footerLabels, ['Cancel']);
      assert.equal(detail.hasPrimaryButton, false);
    }

    console.log('PASS: Leave calendar details use the simplified consistent sheet design.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
