const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '..', 'modules/attendance/options/attendance.html')).href;
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function waitForModal(page, id, display) {
  await page.waitForFunction(
    (modalId, expectedDisplay) => getComputedStyle(document.getElementById(modalId)).display === expectedDisplay,
    {},
    id,
    display
  );
}

async function closeModal(page, id) {
  await page.evaluate(modalId => window.closeModal(modalId), id);
  await waitForModal(page, id, 'none');
}

async function readLateInFields(page) {
  return page.$eval('#feedbackDetailsForm', form => {
    const { lateInMinutes, lateReason } = form.elements;
    return {
      visible: [lateInMinutes, lateReason].every(control => control.getClientRects().length > 0),
      minutes: lateInMinutes.value,
      reason: lateReason.value
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 420]) {
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await page.goto(`${pageUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });
        await page.click('[data-period="this-month"]');

        const lateInCards = await page.$$eval('.attendance-record-card[data-exception="late-in"]', cards => cards.map(card => ({
          hasExceptionTheme: card.classList.contains('exception-theme'),
          hasLateInTheme: card.classList.contains('late-in-theme'),
          accentColor: getComputedStyle(card).borderLeftColor,
          background: getComputedStyle(card).backgroundImage,
          summaryBackground: getComputedStyle(card.querySelector('.attendance-record-summary-panel')).backgroundColor,
          summaryBorder: getComputedStyle(card.querySelector('.attendance-record-summary-panel')).borderColor,
          statusBackground: getComputedStyle(card.querySelector('.attendance-exception-status')).backgroundColor,
          statusBorder: getComputedStyle(card.querySelector('.attendance-exception-status')).borderColor,
          status: card.querySelector('.attendance-exception-status')?.textContent.replace(/\s+/g, ' ').trim(),
          reference: card.querySelector('.attendance-record-reference')?.textContent.trim(),
          detailLabels: Array.from(card.querySelectorAll('.attendance-record-detail > span'), label => label.textContent.trim()),
          actions: Array.from(card.querySelectorAll('.attendance-card-actions .card-action-btn'), button => button.textContent.trim()),
          hasVerify: Boolean(card.querySelector('.attendance-verify-button'))
        })));

        assert.equal(lateInCards.length, 1, `${theme} ${width}px has one Late In record`);
        assert.deepEqual({
          hasExceptionTheme: lateInCards[0].hasExceptionTheme,
          hasLateInTheme: lateInCards[0].hasLateInTheme,
          status: lateInCards[0].status,
          reference: lateInCards[0].reference,
          detailLabels: lateInCards[0].detailLabels,
          actions: lateInCards[0].actions,
          hasVerify: lateInCards[0].hasVerify
        }, {
          hasExceptionTheme: false,
          hasLateInTheme: true,
          status: 'Late In',
          reference: 'Date: Sun, 13 Sep 2026',
          detailLabels: ['Day Type', 'Clock Times', 'Normal Hours', 'OT Hours'],
          actions: ['Change Shift', 'Feedback'],
          hasVerify: true
        });
        assert.equal(lateInCards[0].accentColor, 'rgb(124, 58, 237)', 'Late In uses a purple card accent');
        for (const treatment of [
          lateInCards[0].background,
          lateInCards[0].summaryBackground,
          lateInCards[0].summaryBorder,
          lateInCards[0].statusBackground,
          lateInCards[0].statusBorder
        ]) {
          assert.match(treatment, /124, 58, 237/, 'Late In card surfaces use the purple exception treatment');
        }

        await page.$eval('.attendance-record-card[data-exception="late-in"] .btn-shift-change', button => {
          button.scrollIntoView({ block: 'center' });
          button.click();
        });
        await waitForModal(page, 'shiftChangeModalOverlay', 'flex');
        assert.equal(
          await page.$eval('#shiftChangeModalOverlay .attendance-form-header h3', heading => heading.textContent.trim()),
          'Shift Change Request',
          'Late In keeps the existing Change Shift flow'
        );
        await closeModal(page, 'shiftChangeModalOverlay');

        await page.$eval('.attendance-record-card[data-exception="late-in"] .btn-feedback', button => {
          button.scrollIntoView({ block: 'center' });
          button.click();
        });
        await waitForModal(page, 'feedbackModalOverlay', 'flex');

        const lateInFeedback = await page.$eval('#feedbackModalOverlay', overlay => {
          const feedbackHeading = Array.from(overlay.querySelectorAll('h4'))
            .find(heading => heading.textContent.trim() === 'Feedback Details');
          const detailsCard = feedbackHeading?.parentElement;
          const visibleLabels = Array.from(detailsCard?.querySelectorAll('label') || [])
            .filter(label => label.getClientRects().length > 0)
            .map(label => label.textContent.replace(/\s+/g, ' ').trim());
          return {
            minutes: overlay.querySelector('#fbLateInMinutes')?.value,
            reason: overlay.querySelector('#fbLateInReason')?.value,
            minutesReadonly: overlay.querySelector('#fbLateInMinutes')?.readOnly,
            reasonTag: overlay.querySelector('#fbLateInReason')?.tagName,
            reasonDisabled: overlay.querySelector('#fbLateInReason')?.disabled,
            reasonOptions: Array.from(overlay.querySelectorAll('#fbLateInReason option'), option => option.textContent.trim()),
            meta: Array.from(overlay.querySelectorAll('.feedback-meta-row'), row => ({
              label: row.querySelector('.label')?.textContent.trim(),
              value: row.querySelector('[data-feedback-meta-value]')?.textContent.replace(/\s+/g, ' ').trim()
            })),
            hasClockTimes: Boolean(overlay.querySelector('.attendance-feedback-clock-title')),
            visibleLabels,
            actions: Array.from(overlay.querySelectorAll('.attendance-feedback-actions button'), button => button.textContent.replace(/\s+/g, ' ').trim()),
            overflow: overlay.querySelector('.sheet-content').scrollWidth - overlay.querySelector('.sheet-content').clientWidth
          };
        });

        assert.equal(lateInFeedback.minutes, '12');
        assert.equal(lateInFeedback.reason, 'Traffic Congestion');
        assert.equal(lateInFeedback.minutesReadonly, true, 'Late In Minutes remains informational');
        assert.equal(lateInFeedback.reasonTag, 'SELECT', 'Late Reason uses a dropdown');
        assert.equal(lateInFeedback.reasonDisabled, false, 'Late Reason can be changed');
        assert.deepEqual(lateInFeedback.reasonOptions, [
          '- Select Late Reason -',
          'Traffic Congestion',
          'Public Transport Delay',
          'Weather Condition',
          'Emergency',
          'Other'
        ]);
        assert.deepEqual(lateInFeedback.meta.map(row => row.label), ['Original Shift', 'Date', 'Employee']);
        assert.equal(lateInFeedback.meta[1].value, 'Sun 13 Sep 2026');
        assert.equal(lateInFeedback.hasClockTimes, true, 'Existing Clock Times section remains');
        assert.deepEqual(
          lateInFeedback.visibleLabels,
          ['Amended Shift', 'Time Amend Reason', 'Late In Minutes', 'Late Reason', 'Early Out Minutes', 'Early Out Reason',
            'Time Off Minutes', 'Time Off Reason', 'Absent', 'Absent Reason', 'Leave Code', 'Remarks', 'Attachments'],
          'Feedback Details shows each field once in order'
        );
        assert.deepEqual(lateInFeedback.actions, ['Cancel', 'Draft', 'Submit']);
        assert.ok(lateInFeedback.overflow <= 1, `${theme} ${width}px Feedback has no horizontal overflow`);
        await closeModal(page, 'feedbackModalOverlay');

        for (const exception of ['none', 'unapproved-ot']) {
          await page.$eval(`.attendance-record-card[data-exception="${exception}"] .btn-feedback`, button => {
            button.scrollIntoView({ block: 'center' });
            button.click();
          });
          await waitForModal(page, 'feedbackModalOverlay', 'flex');
          assert.deepEqual(
            await readLateInFields(page),
            { visible: true, minutes: '', reason: '' },
            `${exception} Feedback displays empty fields for unrecorded values`
          );
          await closeModal(page, 'feedbackModalOverlay');
        }

        await page.$eval('.attendance-record-card[data-exception="late-in"] .btn-feedback', button => {
          button.scrollIntoView({ block: 'center' });
          button.click();
        });
        await waitForModal(page, 'feedbackModalOverlay', 'flex');
        assert.deepEqual(
          await readLateInFields(page),
          { visible: true, minutes: '12', reason: 'Traffic Congestion' },
          'Late In context repopulates after another record cleared it'
        );
        await closeModal(page, 'feedbackModalOverlay');

        await page.evaluate(() => openModal('filterModalOverlay'));
        await waitForModal(page, 'filterModalOverlay', 'flex');
        await page.select('#attendanceExceptionFilter', 'late-in');
        await page.click('#attendanceApplyFilter');
        assert.deepEqual(
          await page.$$eval('.attendance-record-card:not([hidden])', cards => cards.map(card => card.dataset.exception)),
          ['late-in'],
          'Late In filter shows only the new record'
        );
        await page.evaluate(() => openModal('filterModalOverlay'));
        await waitForModal(page, 'filterModalOverlay', 'flex');
        await page.click('#attendanceFilterReset');
        assert.equal(await page.$$eval('.attendance-record-card:not([hidden])', cards => cards.length), 3);

        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1),
          `${theme} ${width}px page has no horizontal overflow`
        );

        const linkedParams = new URLSearchParams({
          theme,
          feedbackFrom: 'hours-summary',
          feedbackSummary: 'Odd Clocking Days',
          feedbackDate: '2026-09-13',
          feedbackShift: '8.30AM–5.30PM (W01)',
          feedbackClockTimes: '08:42,17:30',
          feedbackEmployeeName: 'Farhan binti rahmat',
          feedbackEmployeeNo: 'EBB12'
        });
        await page.goto(`${pageUrl}?${linkedParams}`, { waitUntil: 'domcontentloaded' });
        await waitForModal(page, 'feedbackModalOverlay', 'flex');
        assert.deepEqual(
          await readLateInFields(page),
          { visible: true, minutes: '', reason: '' },
          'A direct link without recorded values opens the complete empty fields'
        );
        assert.deepEqual(pageErrors, [], `${theme} ${width}px has no JavaScript errors`);
        await page.close();
      }
    }

    console.log('PASS: Attendance Feedback shows all detail fields and fills them from the selected record.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
