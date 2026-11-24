const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pendingUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/feedback-history.html')).href;

async function clickAndWaitForNavigation(page, selector) {
  await page.$eval(selector, button => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }),
    page.click(selector)
  ]);
}

async function assertFullPageForm(page, overlaySelector) {
  await page.waitForSelector(overlaySelector, { visible: true });
  const layout = await page.$eval(overlaySelector, overlay => {
    const sidePage = overlay.querySelector('.side-page-content');
    const overlayRect = overlay.getBoundingClientRect();
    const pageRect = sidePage?.getBoundingClientRect();
    return {
      hasSidePage: !!sidePage,
      fillsWidth: !!pageRect && Math.abs(pageRect.width - overlayRect.width) <= 1,
      fillsHeight: !!pageRect && Math.abs(pageRect.height - overlayRect.height) <= 1,
      hasBack: !!overlay.querySelector('[aria-label="Back"]')
    };
  });
  assert.deepEqual(layout, { hasSidePage: true, fillsWidth: true, fillsHeight: true, hasBack: true });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 950 });

    await page.goto(pendingUrl + '?theme=dark', { waitUntil: 'networkidle0' });
    await clickAndWaitForNavigation(page, '.pending-feedback-record:first-of-type .btn-feedback');
    assert.equal(new URL(page.url()).pathname.endsWith('/attendance.html'), true);
    assert.equal(await page.$eval('html', node => node.dataset.theme), 'dark');
    await assertFullPageForm(page, '#feedbackModalOverlay');
    assert.deepEqual(await page.evaluate(() => [
      document.getElementById('fbMetaDate').textContent.trim(),
      document.getElementById('fbMetaShift').textContent.trim(),
      document.getElementById('fbMetaEmployeeName').textContent.trim(),
      document.getElementById('fbMetaEmployeeNo').textContent.trim()
    ]), ['Mon 14 Sep 2026', '8.30AM–5.30PM (W01)', 'Farhan binti rahmat', '#EBB12']);
    const details = await page.$eval('#feedbackDetailsForm', form =>
      Array.from(form.querySelectorAll('label[for]'), label =>
        [label.textContent.trim(), label.control.value, label.control.getClientRects().length > 0]
      )
    );
    assert.deepEqual(details, [
      ['Amended Shift', ''], ['Time Amend Reason', ''],
      ['Late In Minutes', '0'], ['Late Reason', ''], ['Early Out Minutes', '0'], ['Early Out Reason', ''],
      ['Time Off Minutes', ''], ['Time Off Reason', ''], ['Absent', 'No'], ['Absent Reason', ''],
      ['Leave Code', ''], ['Remarks', '']
    ].map(([label, value]) => [label, value, true]));
    await clickAndWaitForNavigation(page, '[data-feedback-back]');
    assert.equal(new URL(page.url()).pathname.endsWith('/feedback-history.html'), true);

    const supplied = {
      lateIn: '00:12', lateReason: 'Traffic Congestion', earlyOut: '00:25', earlyOutReason: 'Medical',
      timeOff: '45 minutes', timeOffReason: 'Appointment & travel', absent: 'false',
      absentReason: '', leaveCode: '001', remarks: 'Checked with supervisor.'
    };
    const secondRecord = '.pending-feedback-record:nth-of-type(2)';
    await page.$eval(secondRecord, (card, fields) => Object.assign(card.dataset, fields), supplied);
    await clickAndWaitForNavigation(page, secondRecord + ' .btn-feedback');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#feedbackDetailsForm', { visible: true });
    const values = await page.$eval('#feedbackDetailsForm', form => Object.fromEntries(new FormData(form)));
    assert.deepEqual(values, {
      amendedShift: '', amendReason: '', lateInMinutes: '12', lateReason: 'Traffic Congestion',
      earlyOutMinutes: '25', earlyOutReason: 'Medical', timeOffMinutes: '45', timeOffReason: 'Appointment & travel',
      absent: 'No', absentReason: '', leaveCode: '001', remarks: 'Checked with supervisor.'
    });
    await clickAndWaitForNavigation(page, '[data-feedback-back]');

    await clickAndWaitForNavigation(page, '.pending-feedback-record:nth-of-type(2) .btn-shift-change');
    assert.equal(new URL(page.url()).pathname.endsWith('/attendance.html'), true);
    await assertFullPageForm(page, '#shiftChangeModalOverlay');
    assert.deepEqual(await page.evaluate(() => [
      document.getElementById('shiftMetaDate').textContent.trim(),
      document.getElementById('shiftMetaOriginal').textContent.trim()
    ]), ['15 Sep 2026', '8.30AM–5.30PM (W01)']);
    await clickAndWaitForNavigation(page, '[data-shift-change-back]');
    assert.equal(new URL(page.url()).pathname.endsWith('/feedback-history.html'), true);

    assert.deepEqual(errors, []);
    console.log('PASS: Pending Attendance Feedback opens the shared full-page Feedback and Change Shift forms and returns to the list.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
