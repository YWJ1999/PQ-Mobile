const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const tabs = [
  { key: 'clocking', button: 'tabClocking', view: 'viewClockingHistory', modal: 'clockDetailsModal', ref: 'modalClkId', close: 'closeClockDetailsDirect', refs: ['CLK-910482', 'CLK-910481', 'CLK-910399', 'CLK-910398', 'CLK-909877', 'CLK-909876'] },
  { key: 'ot', button: 'tabOt', view: 'viewOtHistory', modal: 'otDetailsModal', ref: 'modalOtDocRef', close: 'closeOtDetailsDirect', refs: ['AXT000000000101', 'OTB000000001604', 'OTB000000001611'] },
  { key: 'feedback', button: 'tabFeedback', view: 'viewFeedbackHistory', modal: 'feedbackDetailsModal', ref: 'modalFbkDocRef', close: 'closeFeedbackDetailsDirect', refs: ['ATT000000000432', 'ATT000000000435'] }
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/history.html')).href;
    for (const theme of ['light', 'dark']) {
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        for (const tab of tabs) {
          await page.click('#' + tab.button);
          await page.waitForSelector('#' + tab.view, { visible: true });
          const cards = await page.$$eval('#' + tab.view + ' .history-card-item', nodes => nodes.map(node => {
            const rect = node.getBoundingClientRect();
            return {
              ref: node.querySelector('.history-card-ref')?.textContent.trim(),
              date: node.querySelector('.attendance-history-date')?.textContent.trim(),
              labels: [...node.querySelectorAll('dl dt')].map(node => node.textContent.trim()),
              title: node.querySelector('.history-card-title')?.textContent.trim(),
              badge: node.querySelector('.card-status-badge')?.textContent.trim(),
              statusAtRight: (() => {
                const heading = node.querySelector('.history-card-heading').getBoundingClientRect();
                const badge = node.querySelector('.history-card-header .card-status-badge');
                return !!badge && badge.getBoundingClientRect().left >= heading.right;
              })(),
              dateBadge: !!node.querySelector('.history-date-badge'),
              details: [...node.querySelectorAll('dl > div')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
              fits: node.scrollWidth <= node.clientWidth + 1 && [...node.querySelectorAll('.history-card-title,.card-status-badge,dl dd')].every(child => {
                const childRect = child.getBoundingClientRect();
                return childRect.right <= rect.right + 1 && childRect.left >= rect.left - 1;
              }),
              employees: [...node.querySelectorAll('.attendance-history-employee')].map(employee => ({ name: employee.firstElementChild?.textContent.trim(), id: employee.lastElementChild?.textContent.trim(), below: employee.lastElementChild?.getBoundingClientRect().top > employee.firstElementChild?.getBoundingClientRect().top }))
            };
          }));
          if (tab.key === 'clocking') {
            assert.deepEqual(cards.map(card => card.date), ['Thu 17 Sep 2026', 'Thu 17 Sep 2026', 'Wed 16 Sep 2026', 'Wed 16 Sep 2026', 'Sun 13 Sep 2026', 'Sun 13 Sep 2026']);
            cards.forEach(card => {
              assert.deepEqual(card.labels, ['Time', 'Cost Center']);
              assert.ok(card.statusAtRight, 'Excp uses the top-right History status slot');
            });
            assert.deepEqual(cards.map(card => card.title), ['Clock Out', 'Clock In', 'Clock Out', 'Clock In', 'Clock Out', 'Clock In']);
          } else {
            const prefix = tab.key === 'ot' ? 'Ref: ' : 'Document Reference: ';
            assert.deepEqual(cards.map(card => card.ref), tab.refs.map(ref => prefix + ref), `${theme} ${width}px ${tab.key}: all reference numbers remain visible`);
          }
          assert.ok(cards.every(card => card.title && card.badge && card.details.length && !card.dateBadge && card.fits), `${theme} ${width}px ${tab.key}: shared history layout fits`);
          cards.flatMap(card => card.employees).forEach(employee => { assert.match(employee.id, /^#/); assert.ok(employee.name && employee.below); });
          if (tab.key === 'clocking') {
            assert.deepEqual(cards.map(card => card.badge), ['Normal', 'Normal', 'Overtime (2.17 Hrs)', 'Normal', 'Early Out (15 mins)', 'Late In (12 mins)']);
          }
          if (tab.key === 'ot') {
            assert.deepEqual(await page.$$eval('#viewOtHistory .history-submit-btn', nodes => nodes.map(node => node.textContent.trim())), ['Submit', 'Submit', 'Submit']);
            assert.deepEqual(cards.map(card => card.title), ['Fri, 12 Jul 2024', 'Tue, 24 Oct 2023', 'Fri, 12 Jul 2024']);
            cards.forEach(card => {
              assert.ok(card.statusAtRight);
              assert.deepEqual(card.labels, ['OT Type', 'Submit Date', 'Plan Hours', 'Actual Hours']);
            });
            assert.ok(cards[2].details.some(detail => detail.includes('Actual Hours') && detail.includes('4.00 hrs')));
          }
          if (tab.key === 'feedback') {
            cards.forEach(card => assert.deepEqual(card.labels, ['Date']));
            assert.deepEqual(await page.$$eval('#viewFeedbackHistory .history-submit-btn', nodes => nodes.map(node => ({ text: node.textContent.trim(), disabled: node.disabled }))), [{ text: 'Submit', disabled: false }, { text: 'Submit', disabled: false }]);
            assert.equal(cards[1].badge, 'To Resubmit');
          }
          const overflow = await page.$eval('.main-content', node => node.scrollWidth - node.clientWidth);
          assert.ok(overflow <= 1, `${theme} ${width}px ${tab.key}: no content overflow`);
          // Open all records at 390px and each detail template at the other widths.
          {
            for (let index = 0; index < (width === 390 ? tab.refs.length : 1); index++) {
              if (tab.key === 'ot' || tab.key === 'feedback') {
                await page.$$eval('#' + tab.view + ' .history-submit-btn', (nodes, index) => nodes[index].focus(), index);
                await page.keyboard.press(width === 390 ? 'Enter' : 'Space');
              } else {
                await page.$$eval('#' + tab.view + ' .history-card-item', (nodes, index) => nodes[index].click(), index);
              }
              await page.waitForSelector('#' + tab.modal, { visible: true });
              await page.waitForFunction(id => document.getElementById(id).style.opacity === '1', {}, tab.modal);
              await page.evaluate(async id => {
                await Promise.all(document.getElementById(id).getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
              }, tab.modal);
              assert.equal(await page.$eval('#' + tab.ref, node => node.textContent.trim()), tab.refs[index]);
             const fits = await page.$eval('#' + tab.modal + ' .modal-content', node => {
                const body = node.querySelector('.attendance-history-form-body, .detail-popout-body');
                const rect = node.getBoundingClientRect();
                return node.scrollWidth <= node.clientWidth + 1 && body.scrollWidth <= body.clientWidth + 1 && [...node.querySelectorAll('input:not([hidden]),textarea,select,footer button:not([hidden])')].every(control => {
                  const controlRect = control.getBoundingClientRect();
                  return controlRect.left >= rect.left - 1 && controlRect.right <= rect.right + 1;
                });
              });
              assert.ok(fits, `${theme} ${width}px ${tab.key}: all detail fields fit`);
              if (tab.key === 'clocking') {
                assert.deepEqual(await page.$$eval('#clockDetailsModal .attendance-history-action-footer button', nodes => nodes.map(node => node.textContent.trim())), ['Cancel']);
                assert.deepEqual(await page.$eval('#clockDetailsModal .attendance-history-action-cancel', node => {
                  const style = getComputedStyle(node);
                  return { backgroundImage: style.backgroundImage, color: style.color, borderRadius: style.borderRadius };
                }), {
                  backgroundImage: 'linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(109, 40, 217) 100%)',
                  color: 'rgb(255, 255, 255)',
                  borderRadius: '20px'
                });
                const fields = await page.$$eval('#clockDetailsModal tr', rows => rows.map(row => [row.cells[0].textContent.trim(), row.cells[1].textContent.trim()]));
                assert.deepEqual(fields.map(([label]) => label), ['Date', 'Time', 'ID', 'Type', 'Location', 'Clock-In Zone', 'Cost Center', 'Is Voided', 'Is Invalid']);
                assert.equal(fields[0][1], ['17/09/2026', '17/09/2026', '16/09/2026', '16/09/2026', '13/09/2026', '13/09/2026'][index]);
                assert.equal(fields[3][1], cards[index].title);
                assert.equal(fields[5][1], '-');
                if (index === 0 && width === 390) await page.screenshot({ path: path.join(__dirname, `attendance_history_clocking_details_${theme}.png`) });
              }
              if (tab.key === 'ot') {
                const summaryLabels = await page.$$eval('#otDetailsModal .attendance-history-form-summary-list dt', nodes => nodes.map(node => node.textContent.trim()));
                const fieldLabels = await page.$$eval('#otDetailsModal .attendance-history-form-field > label:first-child, #otDetailsModal .attendance-history-credit-field > label:first-child', nodes => nodes.map(node => node.textContent.trim()));
                assert.deepEqual(summaryLabels, ['Submit Date', 'Document Reference', 'Plan Status', 'Employee', 'Supervisor', 'Shift', 'Clocking Times']);
                assert.deepEqual(fieldLabels, ['OT Date', 'Start Time', 'End Time', 'Break Hours', 'Plan Hours', 'Actual Hours', 'Approved Hours', 'Approval Method', 'OT Type', 'OT Reason', 'Task', 'Convert to Leave Credit', 'Need Transport', 'Remarks', 'Approver Comments']);
                assert.equal(await page.$eval('#otPlanFormTitle', node => node.textContent.trim()), 'OT Plan Details');
                assert.equal(await page.$eval('#otDetailsModal [data-ot-form-cancel]', node => node.textContent.trim()), 'Cancel');
                assert.deepEqual(await page.$$eval('#otDetailsModal .attendance-history-form-actions button', nodes => nodes.map(node => node.textContent.trim())), ['Cancel', 'Submit']);
                assert.equal(await page.$eval('#otDetailsModal [data-history-submit]', node => node.disabled), false);
                assert.equal(await page.$eval('#modalOtBreakHours', node => node.value), '0');
                assert.equal(await page.$eval('#modalOtCredit', node => node.checked), index === 2);
                assert.equal(await page.$eval('#modalOtTransport', node => node.checked), index !== 2);
                assert.equal(await page.$eval('#modalOtApproverComments', node => node.value.trim()), ['Please resubmit with signed supervisor logs', 'asd', 'Pending manager final signoff'][index]);
                assert.ok(await page.$eval('#modalOtApproverComments', node => node.readOnly && !node.closest('table') && !!node.closest('.attendance-history-form-field') && !node.closest('.detail-popout-comments')));
                assert.equal(await page.$eval('#modalOtCamera', node => node.getAttribute('capture')), 'environment');
              }
              if (tab.key === 'feedback') {
                const summaryLabels = await page.$$eval('#feedbackDetailsModal .attendance-history-form-summary-list dt', nodes => nodes.map(node => node.textContent.trim()));
                const fieldLabels = await page.$$eval('#feedbackDetailsModal .attendance-history-form-field > label:first-child', nodes => nodes.map(node => node.textContent.trim()));
                assert.deepEqual(summaryLabels, ['Submit Date', 'Document Reference', 'Document Status', 'Employee', 'Employee Branch', 'Employee Department', 'Date', 'Shift', 'Submitter']);
                assert.deepEqual(fieldLabels, ['Amended Shift', 'Amended Shift Reason', 'Time Amend Reason', 'Remarks', 'Approver Comments']);
                assert.equal(await page.$eval('#feedbackPlanFormTitle', node => node.textContent.trim()), 'Attendance Feedback');
                assert.equal(await page.$eval('#modalFbkSubmitDate dd', node => node.textContent.trim()), ['26/02/2026', '14/09/2026'][index]);
                assert.equal(await page.$eval('#modalFbkAmendedShift', node => node.value), '');
                assert.equal(await page.$eval('#modalFbkCamera', node => node.getAttribute('capture')), 'environment');
                assert.deepEqual(await page.$$eval('#feedbackDetailsModal .attendance-history-form-actions button', nodes => nodes.map(node => node.textContent.trim())), ['Cancel', 'Submit']);
                assert.equal(await page.$eval('#feedbackDetailsModal [data-history-submit]', node => node.hidden), false);
                assert.equal(await page.$eval('#feedbackDetailsModal [data-history-submit]', node => node.disabled), false);
                const punches = await page.$$eval('#modalFbkPunches [data-punch-row]', nodes => nodes.map(node => node.textContent.replace(/\s+/g, ' ').trim()));
                if (index === 0) {
                  assert.ok(punches.some(text => text.includes('07:02') && text.includes('06:02')));
                  assert.ok(punches.some(text => text.includes('New') && text.includes('10:00')));
                } else assert.deepEqual(punches, []);
             }
             if (tab.key !== 'clocking' && index === 0 && width === 390) {
                const modalBody = '#' + tab.modal + ' .attendance-history-form-body';
                await page.$eval(modalBody, node => { node.scrollTop = 0; });
                await page.screenshot({ path: path.join(__dirname, `attendance_history_${tab.key}_details_${theme}_top.png`) });
                await page.$eval(modalBody, node => { node.scrollTop = node.scrollHeight; });
                await page.screenshot({ path: path.join(__dirname, `attendance_history_${tab.key}_details_${theme}_bottom.png`) });
              }
              await page.evaluate(close => window[close](), tab.close);
              await page.waitForSelector('#' + tab.modal, { hidden: true });
            }
          }
          await page.$eval('.main-content', node => { node.scrollTop = 0; });
          if (width === 390) await page.screenshot({ path: path.join(__dirname, `attendance_history_${tab.key}_${theme}.png`) });
        }
      }
      // Attachments, amendments and saved edits must stay with their own record.
      await page.$$eval('#viewOtHistory .history-card-item', nodes => nodes[0].click());
      await page.waitForSelector('#otDetailsModal', { visible: true });
      await page.$eval('#modalOtFiles', input => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(['note'], 'ot-note.pdf', { type: 'application/pdf' }));
        transfer.items.add(new File(['record'], 'clocking.txt', { type: 'text/plain' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      assert.equal(await page.$$eval('#modalOtAttachments .attendance-history-attachment', nodes => nodes.length), 2);
      await page.$eval('#modalOtAttachments button', node => node.click());
      assert.equal(await page.$$eval('#modalOtAttachments .attendance-history-attachment', nodes => nodes.length), 1);
      await page.$eval('#modalOtRemarks', node => { node.value = 'Saved OT edit'; });
      await page.$eval('#otDetailsModal [data-history-submit]', node => node.click());
      await page.waitForSelector('#otDetailsModal', { hidden: true });
      await page.$$eval('#viewOtHistory .history-card-item', nodes => nodes[1].click());
      assert.equal(await page.$eval('#modalOtRemarks', node => node.value), 'Emergency material checking');
      assert.equal(await page.$$eval('#modalOtAttachments .attendance-history-attachment', nodes => nodes.length), 0);
      await page.evaluate(() => closeOtDetailsDirect());
      await page.waitForSelector('#otDetailsModal', { hidden: true });
      await page.$$eval('#viewOtHistory .history-card-item', nodes => nodes[0].click());
      assert.equal(await page.$eval('#modalOtRemarks', node => node.value), 'Saved OT edit');
      assert.equal(await page.$$eval('#modalOtAttachments .attendance-history-attachment', nodes => nodes.length), 1);
      await page.evaluate(() => closeOtDetailsDirect());
      await page.waitForSelector('#otDetailsModal', { hidden: true });
      await page.$$eval('#viewFeedbackHistory .history-card-item', nodes => nodes[0].click());
      await page.waitForSelector('#feedbackDetailsModal', { visible: true });
      await page.$eval('#modalFbkPunchDays button', node => node.click());
      assert.equal(await page.$$eval('#modalFbkPunches [data-punch-row]', nodes => nodes.length), 3);
      await page.$eval('#modalFbkPunches [data-punch-row]:last-child', node => node.click());
      await page.$eval('#modalFbkPunchDelete', node => node.click());
      assert.equal(await page.$$eval('#modalFbkPunches [data-punch-row]', nodes => nodes.length), 2);
      await page.$eval('#modalFbkRemarks', node => { node.value = 'Saved advice draft'; });
      await page.evaluate(() => saveHistoryDetailDraft('feedback'));
      await page.waitForSelector('#feedbackDetailsModal', { hidden: true });
      await page.$$eval('#viewFeedbackHistory .history-card-item', nodes => nodes[1].click());
      assert.equal(await page.$eval('#modalFbkRemarks', node => node.value), '');
      assert.equal(await page.$$eval('#modalFbkPunches [data-punch-row]', nodes => nodes.length), 0);
      assert.equal(await page.$eval('#modalFbkAmendedShift', node => node.disabled), false);
      await page.evaluate(() => closeFeedbackDetailsDirect());
      await page.waitForSelector('#feedbackDetailsModal', { hidden: true });
      await page.$$eval('#viewFeedbackHistory .history-card-item', nodes => nodes[0].click());
      assert.equal(await page.$eval('#modalFbkRemarks', node => node.value), 'Saved advice draft');
      await page.$eval('#feedbackDetailsModal [data-history-submit]', node => node.click());
      await page.waitForSelector('#feedbackDetailsModal', { hidden: true });
      await page.evaluate(() => openClockDetailsModal('CLK-ZONE', 'Clock In', '05/10/2026', '08:00:00', 'Main Entrance', 'CC-101 HQ Ops', 'Yes', 'Yes', 'Zone A'));
      assert.equal(await page.$eval('#modalClkZone', node => node.textContent.trim()), 'Zone A');
      assert.equal(await page.$eval('#modalClkIsVoided', node => node.textContent.trim()), 'Yes');
      assert.equal(await page.$eval('#modalClkIsInvalid', node => node.textContent.trim()), 'Yes');
      await page.evaluate(() => closeClockDetailsDirect());
      await page.waitForSelector('#clockDetailsModal', { hidden: true });
      await page.evaluate(() => openFilterModal());
      await page.waitForSelector('#filterModal', { visible: true });
      await page.$eval('#filterFromDate', node => { node.value = '2026-09-01'; });
      await page.$eval('#filterToDate', node => { node.value = '2026-09-30'; });
      await page.evaluate(() => applyFilterModal());
      await page.waitForSelector('#filterModal', { hidden: true });
      assert.match(await page.$eval('#filterSummaryTitle', node => node.textContent), /01\/09\/2026 - 30\/09\/2026/);
      await page.evaluate(() => resetFilterModal());
      assert.match(await page.$eval('#filterSummaryTitle', node => node.textContent), /16\/08\/2026 - 14\/09\/2026/);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Attendance history cards, reference detail fields, all 11 entries, attachments, amendments, record-specific drafts, submit actions, both themes and three mobile widths.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
