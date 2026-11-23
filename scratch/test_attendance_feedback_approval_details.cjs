const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const adviceLabels = ['Late In Minutes', 'Late Reason', 'Early Out Minutes', 'Early Out Reason', 'Time Off Minutes', 'Time Off Reason', 'Absent', 'Absent Reason', 'Leave Code'];
const labels = ['Employee', 'Employee Branch', 'Employee Department', 'Date', 'Shift', 'Submitter', 'Amended Shift', 'Amended Shift Reason', ...adviceLabels, 'Remarks', 'Approver Comments'];
const screenshotDir = process.env.PQ_SCREENSHOT_DIR || __dirname;
const options = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options') + path.sep);

async function checkHistoryFields(page, theme) {
  const supplied = {
    lateIn: '01:05', lateInReason: 'Train delay', earlyOutMinutes: 0, earlyOutReason: 'Recorded adjustment',
    timeOff: '15 minutes', timeOffReason: 'Appointment', absent: false, absentReason: '', leaveCode: '001'
  };
  for (const file of ['clocking-history', 'history', 'feedback-history']) {
    await page.goto(new URL(file + '.html?theme=' + theme, options).href);
    const pending = file === 'feedback-history';
    if (!pending) await page.click('#tabFeedback');
    const cards = await page.$$(pending ? '.pending-feedback-details-trigger' : '#viewFeedbackHistory .history-card-item');
    const rows = (pending ? '#pendingFeedbackAdviceFields' : '#modalFbkAdviceFields') + ' tr';
    const read = () => page.$$eval(rows, items => items.map(row => [...row.cells].map(cell => cell.textContent)));
    const back = async () => {
      await page.click('[data-history-page]:not([hidden]) [data-history-back]');
      await page.waitForSelector('[data-history-page]:not([hidden])', { hidden: true });
    };
    await cards[0].click();
    const recorded = ['0', 'Not applicable', pending ? '0' : 'Clock-out missing', pending ? 'Not applicable' : '-',
      '-', '-', 'No', 'Not applicable', '-'];
    assert.deepEqual(await read(), adviceLabels.map((label, i) => [label, recorded[i]]), file + ' original attendance record');
    await back();
    await cards[1].click();
    const nextRecord = pending
      ? ['0', 'Not applicable', 'Clock-out missing', '-', '-', '-', 'No', 'Not applicable', '-']
      : adviceLabels.map(() => '-');
    assert.deepEqual(await read(), adviceLabels.map((label, i) => [label, nextRecord[i]]), file + ' other employee or day');
    await back();
    if (pending) {
      await cards[0].evaluate((button, fields) => Object.assign(button.closest('article').dataset, fields), supplied);
    } else {
      await page.evaluate(fields => attendanceHistoryFields.feedback.ATT000000000432.push(fields), supplied);
    }
    await cards[0].click();
    const values = ['65', 'Train delay', '0', 'Recorded adjustment', '15', 'Appointment', 'No', 'Not applicable', '001'];
    assert.deepEqual(await read(), adviceLabels.map((label, i) => [label, values[i]]), file + ' explicitly supplied values');
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.setRequestInterception(true);
      page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
      await page.goto(new URL('team.html?view=pending&tab=feedback&theme=' + theme, options).href);
      const original = await page.evaluate(() => JSON.stringify(staffDatabase));
      await page.click('#pendingApprovalListContent .approval-request-card button[title="Options"]');
      await page.click('button[onclick="triggerAttendanceViewDetails()"]');
      await page.waitForSelector('#attendanceDetailsModalOverlay:not([hidden])', { visible: true });
      assert.ok(await page.$('#attFeedbackDetailsGroup'), 'Feedback must have its own reference field layout');
      const readClock = () => page.evaluate(() => {
        const panel = document.getElementById('attFeedbackClockAmendments');
        return panel && {
          beforeFields: Boolean(panel.compareDocumentPosition(document.querySelector('#attFeedbackDetailsGroup table')) & Node.DOCUMENT_POSITION_FOLLOWING),
          punches: [...panel.querySelectorAll('.feedback-approval-clock-card')].map(card => ({
            dates: [...card.querySelectorAll('time')].map(time => time.textContent),
            original: card.querySelector('.feedback-approval-clock-original').textContent,
            amended: card.querySelector('.feedback-approval-clock-amended').textContent,
            isNew: card.querySelector('.feedback-approval-clock-original').classList.contains('is-new'),
            green: getComputedStyle(card.querySelector('.feedback-approval-clock-bottom')).backgroundImage.includes('16, 185, 129'),
            editable: Boolean(card.querySelector('input, textarea, [contenteditable="true"]'))
          }))
        };
      });
      assert.deepEqual(await readClock(), {
        beforeFields: true,
        punches: [{ dates: ['24 Feb', '24 Feb'], original: '—', amended: '—', isNew: false, green: true, editable: false }]
      }, 'The top clock adjustment layout must preserve missing source times');
      const read = () => page.evaluate(() => ({
        rows: [...document.querySelectorAll('#attFeedbackDetailsGroup .record-detail-table tr')].map(row => ({ label: row.cells[0].textContent.trim().replace(/:$/, ''), value: row.cells[1].textContent.trim() })),
        legacyVisible: getComputedStyle(document.getElementById('attOtDetailsGroup')).display !== 'none',
        title: document.getElementById('attDetailHeaderTitle').textContent,
        employee: { name: document.querySelector('.feedback-approval-employee-name').textContent, id: document.querySelector('.feedback-approval-employee-id').textContent },
        comments: document.getElementById('attFeedbackActionComments').value,
        commentLabel: document.querySelector('label[for="attFeedbackActionComments"]').textContent,
        actions: [...document.querySelectorAll('#attendanceDetailsModalOverlay .pending-action-grid button')].filter(button => getComputedStyle(button).display !== 'none').map(button => button.textContent.trim()),
        overflow: document.getElementById('attFeedbackDetailsGroup').scrollWidth > document.getElementById('attFeedbackDetailsGroup').clientWidth
      }));
      let details = await read();
      assert.deepEqual(details.rows.map(row => row.label), labels);
      assert.equal(details.title, 'Attendance Advice Approval');
      assert.equal(details.legacyVisible, false);
      assert.deepEqual(details.employee, { name: 'Afifah Nasir', id: '#004177' });
      const value = label => details.rows.find(row => row.label === label).value;
      assert.equal(value('Employee Branch'), '—');
      assert.equal(value('Employee Department'), 'QA Manager');
      assert.equal(value('Date'), 'Tue, 24/02/2026');
      assert.equal(value('Shift'), '—', 'Missing original shift must not be replaced with the amended shift');
      assert.equal(value('Amended Shift'), '08:00 AM – 05:30 PM');
      assert.equal(value('Amended Shift Reason'), 'Missing Clock Out');
      assert.equal(value('Early Out Minutes'), 'Clock-out missing');
      assert.equal(value('Time Off Minutes'), '-');
      assert.equal(value('Remarks'), 'Turnstile reader offline at 17:05 PM during site exit. Verified by supervisor.');
      assert.equal(value('Approver Comments'), '—');
      assert.equal(details.comments, '');
      assert.equal(details.commentLabel, 'Approver Action Comments');
      assert.deepEqual(details.actions, ['Approve', 'Resubmit', 'Cancel', 'Reject']);
      assert.equal(details.overflow, false);
      await page.screenshot({ path: path.resolve(screenshotDir, `attendance-feedback-details-${theme}-${width}.png`) });
      // Verify supplied record fields rather than substituting screenshot values.
      await page.evaluate(() => {
        const supplied = {
          category: 'feedback', type: 'Attendance Feedback', name: 'Farhan binti rahmat', id: '#EBB12', docRef: 'ATT000000000006', docStatus: 'Final Approval', branch: 'USJ 20', department: 'HUMAN RESOURCE', date: '1 Nov 2011', shift: '8.00AM-5.00PM', submitter: { name: 'Farhan binti rahmat', empNo: 'EBB12' }, submitDate: '2 Dec 2011', amendedShift: '8.30AM-5.30PM (W01)', shiftChangeReason: 'Schedule Change', approverComments: '[Comment by AHMAD BIN MUSA (EBB02)]\n123'
        };
        Object.assign(supplied, {
          punches: [{ date: '2011-11-01', original: 'New', amended: '07:30' }],
          remarks: 'Changed work schedule.\nConfirmed with supervisor.',
          lateInMinutes: 0, lateReason: 'Recorded adjustment', earlyOut: '01:30', earlyOutReason: 'Appointment',
          timeOffMinutes: '45', timeOffReason: 'Family matter', absent: true, absentReason: 'Leave recorded', leaveCode: 'AL'
        });
        renderAttendanceApprovalDetails(supplied);
      });
      assert.deepEqual(await readClock(), {
        beforeFields: true,
        punches: [{ dates: ['01 Nov', '01 Nov'], original: 'New', amended: '07:30', isNew: true, green: true, editable: false }]
      });
      await page.screenshot({ path: path.resolve(screenshotDir, `attendance-feedback-clock-amendments-${theme}-${width}.png`) });
      details = await read();
      assert.equal(value('Employee Branch'), 'USJ 20');
      assert.equal(value('Employee Department'), 'HUMAN RESOURCE');
      assert.equal(value('Date'), '1 Nov 2011');
      assert.equal(value('Shift'), '8.00AM-5.00PM');
      assert.equal(value('Amended Shift'), '8.30AM-5.30PM (W01)');
      assert.equal(value('Amended Shift Reason'), 'Schedule Change');
      assert.deepEqual(adviceLabels.map(value), ['0', 'Recorded adjustment', '90', 'Appointment', '45', 'Family matter', 'Yes', 'Leave recorded', 'AL']);
      assert.equal(value('Remarks'), 'Changed work schedule.\nConfirmed with supervisor.');
      assert.equal(value('Approver Comments'), '[Comment by AHMAD BIN MUSA (EBB02)]\n123');
      assert.ok(value('Submitter').includes('Farhan binti rahmat') && value('Submitter').includes('#EBB12'));
      await page.type('#attFeedbackActionComments', 'Checked shift change');
      await page.click('#attendanceDetailsModalOverlay [data-approval-back]');
      await page.waitForSelector('#attendanceDetailsModalOverlay', { hidden: true });
      await page.click('#pendingApprovalListContent [data-approval-id*="001094"] .approval-record-link');
      details = await read();
      assert.equal(value('Late In Minutes'), '35');
      assert.equal(value('Late Reason'), 'Emergency server room dispatch at 06:30 AM before shift.');
      for (const category of ['final_ot', 'ot_plan', 'feedback']) {
        await page.evaluate(category => { currentAttendanceSelectedData = staffDatabase.pending_approval.find(item => item.category === category); triggerAttendanceViewDetails(); }, category);
        await page.waitForFunction(() => getComputedStyle(document.getElementById('attendanceDetailsModalOverlay')).opacity === '1');
        assert.equal(await page.$eval('#attFeedbackDetailsGroup', node => getComputedStyle(node).display !== 'none'), category === 'feedback');
        assert.equal(await page.$eval('#attOtDetailsGroup', node => getComputedStyle(node).display !== 'none'), category !== 'feedback');
      }
      assert.equal(await page.$eval('#attFeedbackActionComments', node => node.value), '', 'An action comment must not leak to another request');
      assert.equal(await page.evaluate(() => JSON.stringify(staffDatabase)), original);
      if (width === 360) await checkHistoryFields(page, theme);
      assert.deepEqual(errors, []);
      console.log(`Passed Attendance Advice field and navigation checks in ${theme} mode at ${width}px.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
