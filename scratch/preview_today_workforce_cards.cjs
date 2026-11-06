const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/team.html')).href + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      const originalDatabase = await page.evaluate(() => JSON.stringify(staffDatabase));
      for (const [type, title, count] of [['scheduled', 'Scheduled to Work Today', 10], ['ot', 'OT Planned Today', 12], ['present', 'Present Today', 9], ['noshow', 'No Show Today', 5], ['attendance_verification', 'Attendance Verification', 8]]) {
        await page.evaluate((title, type) => openStaffListModal(title, type), title, type);
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.staff-list-bottom-sheet')).transform === 'matrix(1, 0, 0, 1, 0, 0)');
        const source = await page.evaluate(type => staffDatabase[type].map(item => ({ name: item.name, id: '#' + item.id.replace(/^#+/, ''), values: [item.statusText, item.dept + (item.branch ? ' • ' + item.branch : '')] })), type);
        const cards = await page.$$eval('.workforce-employee-card', nodes => nodes.map(card => {
          const header = card.querySelector('.workforce-employee-header');
          const name = card.querySelector('.workforce-employee-name');
          const id = card.querySelector('.workforce-employee-id');
          const fields = [...card.querySelectorAll('.workforce-employee-field')];
          return { name: name.textContent, id: id.textContent, idBelowName: id.getBoundingClientRect().top >= name.getBoundingClientRect().bottom, gradient: getComputedStyle(header).backgroundImage, radius: getComputedStyle(card).borderRadius, labels: fields.map(field => field.querySelector('dt').textContent), values: fields.map(field => field.querySelector('dd').textContent), sameRow: fields[0].getBoundingClientRect().top === fields[1].getBoundingClientRect().top, overflow: card.scrollWidth > card.clientWidth };
        }));
        assert.equal(cards.length, count);
        assert.equal(cards[0].name, ['noshow', 'attendance_verification'].includes(type) ? 'Amanda Lee' : 'Alex Tan');
        assert.equal(cards[0].id, type === 'attendance_verification' ? '#001066' : type === 'noshow' ? '#EMP-1066' : '#EMP-1002');
        for (const [index, card] of cards.entries()) {
          assert.equal(card.name, source[index].name);
          assert.equal(card.id, source[index].id);
          assert.deepEqual(card.values, source[index].values, 'Original employee data must remain visible');
          assert.deepEqual(card.labels, [{ scheduled: 'Shift', ot: 'OT Plan', present: 'Clocking', noshow: 'Attendance', attendance_verification: 'Verification' }[type], 'Department']);
          assert.ok(card.idBelowName && card.sameRow && !card.overflow);
          assert.match(card.gradient, /linear-gradient/);
          assert.equal(card.radius, '18px');
        }
        await page.$('.staff-list-bottom-sheet').then(sheet => sheet.screenshot({ path: path.resolve(__dirname, `today-workforce-${type}-${theme}-${width}.png`) }));
        await page.evaluate(keyword => { document.getElementById('staffFilterKeywordInput').value = keyword; filterStaffList(); }, ['noshow', 'attendance_verification'].includes(type) ? 'Amanda' : 'Alex');
        assert.equal(await page.$$eval('.workforce-employee-card', nodes => nodes.length), 1);
        await page.evaluate(() => { document.getElementById('staffFilterKeywordInput').value = 'no-such-employee'; filterStaffList(); });
        assert.match(await page.$eval('#staffListContent', node => node.textContent), /No employee matching filter/);
        await page.evaluate(() => { document.getElementById('staffFilterKeywordInput').value = ''; filterStaffList(); });
        assert.equal(await page.$$eval('.workforce-employee-card', nodes => nodes.length), count);
        console.log(`Verified ${title}: ${count} cards, ${theme}, ${width}px`);
      }
      await page.evaluate(() => openStaffListModal('Attendance Requiring Attention', 'attention'));
      assert.equal(await page.$('.workforce-employee-card'), null);
      assert.equal(await page.$$eval('#staffListContent .staff-card-item', nodes => nodes.length), 5);
      await page.evaluate(() => { closeStaffListModal(); showPendingApprovalPage('final_ot'); });
      const hours = await page.evaluate(() => {
        const records = staffDatabase.pending_approval.filter(item => item.category === 'final_ot');
        return [...document.querySelectorAll('#pendingApprovalListContent .approval-card-details')].map((list, index) => {
          const fields = [...list.children].filter(row => row.querySelector('dt').textContent.endsWith('Hours'));
          return {
            labels: fields.map(row => row.querySelector('dt').textContent),
            values: fields.map(row => row.querySelector('dd').textContent),
            original: [records[index].claimHours ?? records[index].duration, records[index].actualHours, records[index].approvedHours],
            separateRows: new Set(fields.map(row => row.offsetTop)).size === fields.length,
            overflow: list.scrollWidth > list.clientWidth
          };
        });
      });
      assert.equal(hours.length, 5);
      for (const row of hours) {
        assert.deepEqual(row.labels, ['Claim Hours', 'Actual Hours', 'Approved Hours']);
        assert.deepEqual(row.values, row.original);
        assert.ok(row.separateRows && !row.overflow);
      }
      await page.screenshot({ path: path.resolve(__dirname, `final-ot-claim-hours-${theme}-${width}.png`) });
      for (const tab of ['ot_plan', 'feedback']) {
        await page.evaluate(tab => switchStaffApprovalTab(tab), tab);
        const primary = await page.evaluate(() => [...document.querySelectorAll('#pendingApprovalListContent .approval-request-card')].map(card => ({
          label: card.querySelector('.approval-card-details > div:nth-child(2) dt').textContent,
          value: card.querySelector('.approval-card-details > div:nth-child(2) dd').textContent,
          labels: [...card.querySelectorAll('.approval-card-details dt')].map(node => node.textContent.trim()),
          overflow: card.scrollWidth > card.clientWidth
        })));
        const expected = await page.evaluate(tab => staffDatabase.pending_approval.filter(item => item.category === tab).map(item => tab === 'feedback' ? item.amendedShift : item.type), tab);
        assert.deepEqual(primary.map(field => field.value), expected);
        for (const field of primary) {
          assert.equal(field.label, tab === 'feedback' ? 'Amended Shift' : 'Type');
          assert.equal(field.overflow, false);
          if (tab === 'feedback') {
            assert.equal(field.labels.filter(label => label === 'Amended Shift').length, 1);
            assert.equal(field.labels.includes('Shift'), false);
            assert.equal(field.labels.includes('Type'), false);
            assert.ok(field.labels.includes('Clock Time'));
          }
        }
        if (tab === 'feedback') {
          await page.waitForFunction(() => getComputedStyle(document.getElementById('StaffListModalOverlay')).display === 'none');
          await page.screenshot({ path: path.resolve(__dirname, `attendance-feedback-amended-shift-${theme}-${width}.png`) });
        }
      }
      for (const category of ['ot_plan', 'final_ot', 'feedback', 'ot_plan']) {
        await page.evaluate(category => {
          currentAttendanceSelectedData = staffDatabase.pending_approval.find(item => item.category === category);
          triggerAttendanceViewDetails();
        }, category);
        await page.waitForFunction(() => getComputedStyle(document.getElementById('attendanceDetailsModalOverlay')).opacity === '1');
        const fields = await page.evaluate(() => ['attFieldFinalStatus', 'attFieldApprovalMethod', 'attFieldActionApprovalMethod'].map(id => {
          const row = document.getElementById(id).closest('tr');
          return { hidden: row.hidden, visible: row.getClientRects().length > 0 };
        }));
        for (const field of fields) {
          assert.equal(field.hidden, category === 'ot_plan');
          assert.equal(field.visible, category === 'final_ot');
        }
        const expectedTitle = { ot_plan: 'OT Plan Approval', final_ot: 'Final OT Approval', feedback: 'Attendance Advice Approval' }[category];
        assert.equal(await page.$eval('#attDetailHeaderTitle', node => node.textContent), expectedTitle);
        await page.evaluate(() => closeAttendanceDetailsModal());
      }
      console.log(`Verified OT Plan hides Final Status, Approval Method and Action Approval Method; other approval tabs retain them: ${theme}, ${width}px`);
      console.log(`Verified Claim Hours before Actual Hours with original values: ${theme}, ${width}px`);
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => JSON.stringify(staffDatabase)), originalDatabase, 'Changing the card presentation must not modify employee data');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
