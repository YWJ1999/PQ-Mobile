const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const labels = ['Document Reference', 'Document Status', 'Employee', 'Employee Branch', 'Employee Department', 'Date', 'Shift', 'Submitter', 'Submit Date', 'Amended Shift', 'Shift Change Reason', 'Remarks', 'Approver Comments'];

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/team.html')).href + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      const original = await page.evaluate(() => JSON.stringify(staffDatabase));
      await page.evaluate(() => showPendingApprovalPage('feedback'));
      await page.click('#pendingApprovalListContent .approval-request-card button[title="Options"]');
      await page.evaluate(() => triggerAttendanceViewDetails());
      await page.waitForFunction(() => getComputedStyle(document.getElementById('attendanceDetailsModalOverlay')).opacity === '1');
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
        overflow: document.querySelector('.detail-popout-body').scrollWidth > document.querySelector('.detail-popout-body').clientWidth
      }));
      let details = await read();
      assert.deepEqual(details.rows.map(row => row.label), labels);
      assert.equal(details.title, 'Attendance Advice Approval');
      assert.equal(details.legacyVisible, false);
      assert.deepEqual(details.employee, { name: 'Afifah Nasir', id: '#004177' });
      const value = label => details.rows.find(row => row.label === label).value;
      assert.equal(value('Document Status'), 'Pending');
      assert.equal(value('Employee Branch'), '—');
      assert.equal(value('Employee Department'), 'QA Manager');
      assert.equal(value('Date'), 'Tue, 24/02/2026');
      assert.equal(value('Shift'), '—', 'Missing original shift must not be replaced with the amended shift');
      assert.equal(value('Amended Shift'), '08:00 AM – 05:30 PM');
      assert.equal(value('Shift Change Reason'), 'Missing Clock Out');
      assert.equal(value('Remarks'), 'Turnstile reader offline at 17:05 PM during site exit. Verified by supervisor.');
      assert.equal(value('Approver Comments'), '—');
      assert.equal(details.comments, '');
      assert.equal(details.commentLabel, 'Approver Action Comments');
      assert.deepEqual(details.actions, ['Approve', 'Resubmit', 'Cancel', 'Reject']);
      assert.equal(details.overflow, false);
      await page.screenshot({ path: path.resolve(__dirname, `attendance-feedback-details-${theme}-${width}.png`) });
      // Verify supplied record fields rather than substituting screenshot values.
      await page.evaluate(() => {
        currentAttendanceSelectedData = {
          category: 'feedback', type: 'Attendance Feedback', name: 'Farhan binti rahmat', id: '#EBB12', docRef: 'ATT000000000006', docStatus: 'Final Approval', branch: 'USJ 20', department: 'HUMAN RESOURCE', date: '1 Nov 2011', shift: '8.00AM-5.00PM', submitter: { name: 'Farhan binti rahmat', empNo: 'EBB12' }, submitDate: '2 Dec 2011', amendedShift: '8.30AM-5.30PM (W01)', shiftChangeReason: 'Schedule Change', approverComments: '[Comment by AHMAD BIN MUSA (EBB02)]\n123'
        };
        currentAttendanceSelectedData.punches = [{ date: '2011-11-01', original: 'New', amended: '07:30' }];
        currentAttendanceSelectedData.remarks = 'Changed work schedule.\nConfirmed with supervisor.';
        triggerAttendanceViewDetails();
      });
      assert.deepEqual(await readClock(), {
        beforeFields: true,
        punches: [{ dates: ['01 Nov', '01 Nov'], original: 'New', amended: '07:30', isNew: true, green: true, editable: false }]
      });
      await page.screenshot({ path: path.resolve(__dirname, `attendance-feedback-clock-amendments-${theme}-${width}.png`) });
      details = await read();
      assert.equal(value('Document Reference'), 'ATT000000000006');
      assert.equal(value('Document Status'), 'Final Approval');
      assert.equal(value('Employee Branch'), 'USJ 20');
      assert.equal(value('Employee Department'), 'HUMAN RESOURCE');
      assert.equal(value('Date'), '1 Nov 2011');
      assert.equal(value('Shift'), '8.00AM-5.00PM');
      assert.equal(value('Submit Date'), '2 Dec 2011');
      assert.equal(value('Amended Shift'), '8.30AM-5.30PM (W01)');
      assert.equal(value('Shift Change Reason'), 'Schedule Change');
      assert.equal(value('Remarks'), 'Changed work schedule.\nConfirmed with supervisor.');
      assert.equal(value('Approver Comments'), '[Comment by AHMAD BIN MUSA (EBB02)]\n123');
      assert.ok(value('Submitter').includes('Farhan binti rahmat') && value('Submitter').includes('#EBB12'));
      await page.type('#attFeedbackActionComments', 'Checked shift change');
      await page.click('#attendanceDetailsModalOverlay .detail-popout-cancel');
      assert.equal(await page.$eval('#attendanceDetailsModalOverlay', node => node.style.opacity), '0');
      for (const category of ['final_ot', 'ot_plan', 'feedback']) {
        await page.evaluate(category => { currentAttendanceSelectedData = staffDatabase.pending_approval.find(item => item.category === category); triggerAttendanceViewDetails(); }, category);
        await page.waitForFunction(() => getComputedStyle(document.getElementById('attendanceDetailsModalOverlay')).opacity === '1');
        assert.equal(await page.$eval('#attFeedbackDetailsGroup', node => getComputedStyle(node).display !== 'none'), category === 'feedback');
        assert.equal(await page.$eval('#attOtDetailsGroup', node => getComputedStyle(node).display !== 'none'), category !== 'feedback');
      }
      assert.equal(await page.$eval('#attFeedbackActionComments', node => node.value), '', 'An action comment must not leak to another request');
      assert.equal(await page.evaluate(() => JSON.stringify(staffDatabase)), original);
      assert.deepEqual(errors, []);
      console.log(`PASS: Attendance Feedback reference fields, original data and tab switching: ${theme}, ${width}px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
