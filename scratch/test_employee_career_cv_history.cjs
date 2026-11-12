const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const historyUrl = pathToFileURL(path.resolve('modules/employee-career/options/history.html')).href;
const requests = [
  { id: 'REQ-CV-2026-10', submittedAt: '2026-10-11T17:00:00.000Z', status: 'Pending HR Approval', changes: [
    { label: 'Personal Email', oldVal: 'old@example.com', newVal: 'new@example.com' },
    { label: 'Major / Field of Study', oldVal: 'ACCOUNTING', newVal: 'LAW' },
    { label: 'Bank Name', oldVal: 'CIMB', newVal: 'MAYBANK' },
    { label: 'Mobile Phone #', oldVal: '0123456789', newVal: '0191122334' },
    { label: 'Delete family member', oldVal: 'REMOVED FAMILY MEMBER', newVal: 'Removed' }
  ] },
  { id: 'REQ-CV-2026-09', reference: 'CV-2026-009', submittedAt: '2026-09-05T01:00:00.000Z', status: 'Approved', changes: [{ label: 'Mobile Number', oldVal: '0123456789', newVal: '0198765432' }] }
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      await page.emulateTimezone('Asia/Kuala_Lumpur');
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(historyUrl + '?theme=' + theme, { waitUntil: 'load' });
      assert.deepEqual(await page.$$eval('[data-history-kind]', nodes => nodes.map(node => node.textContent.trim())), ['Feedback', 'Whereabout', 'CV Change Request']);
      await page.evaluate(() => localStorage.removeItem('pq_change_request_history'));
      await page.goto(historyUrl + '?category=cv-change-request&theme=' + theme, { waitUntil: 'load' });
      assert.equal(await page.$eval('[data-history-kind="cv-change-request"]', node => node.getAttribute('aria-pressed')), 'true');
      assert.equal(await page.$eval('#historyCategoryTitle', node => node.textContent), 'CV Change Request History');
      assert.equal(await page.$eval('#historyFilterSummary', node => node.textContent), 'All CV Change Requests');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '10');
      assert.equal(await page.$eval('#historyEmptyState', node => node.hidden), true);
      await page.evaluate(rows => localStorage.setItem('pq_change_request_history', JSON.stringify(rows)), requests);
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '12');
      assert.deepEqual(await page.$$eval('[data-record-id^="REQ-CV"] .history-card-heading', nodes => nodes.map(node => node.textContent.trim())), ['REQ-CV-2026-10', 'CV-2026-009']);
      assert.deepEqual(await page.$$eval('[data-record-id^="REQ-CV"] .status-pill', nodes => nodes.map(node => node.textContent.trim())), ['Pending HR Approval', 'Approved']);
      await page.click('[data-record-id="REQ-CV-2026-10"]');
      assert.equal(await page.$eval('#historyDetailTitle', node => node.textContent), 'CV Change Request Details');
      const details = await page.$eval('#historyDetailBody', node => node.textContent);
      for (const text of ['Personal Email', 'old@example.com', 'new@example.com', 'REQ-CV-2026-10']) assert.ok(details.includes(text), text);
      for (const [tab, value] of [['qualification', 'LAW'], ['payroll', 'MAYBANK'], ['contacts', '0191122334'], ['family', 'REMOVED FAMILY MEMBER']]) {
        await page.click('[data-cv-tab="' + tab + '"]');
        assert.ok((await page.$eval('#cv-panel-' + tab, node => node.textContent)).includes(value), 'Saved changes belong in ' + tab);
      }
      assert.ok((await page.$eval('#cv-panel-personal', node => node.textContent)).includes('12 Oct 2026'), 'UTC timestamps display the local Malaysian date');
      assert.equal((await page.$eval('#cv-panel-personal', node => node.textContent)).includes('REMOVED FAMILY MEMBER'), false);
      await page.keyboard.press('Escape');
      await page.click('#historyFilterTrigger');
      assert.equal(await page.$eval('#historyFilterTitle', node => node.textContent), 'Filter');
      assert.equal(await page.$eval('#feedbackHistoryFields', node => node.hidden), true);
      assert.equal(await page.$eval('#whereaboutHistoryFields', node => node.hidden), true);
      await page.$eval('#cvHistoryDateFrom', node => {node.value = '2026-09-01';});
      await page.$eval('#cvHistoryDateTo', node => {node.value = '2026-09-30';});
      await page.select('#cvHistoryStatus', 'approved');
      await page.click('#applyHistoryFilter');
      assert.deepEqual(await page.$$eval('.history-card-item', nodes => nodes.map(node => node.dataset.recordId)), ['REQ-CV-2026-09']);
      await page.click('#historyFilterTrigger');
      await page.select('#cvHistoryStatus', 'cancelled');
      await page.click('#closeHistoryFilter');
      await page.click('[data-history-kind="feedback"]');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '3');
      await page.click('[data-history-kind="whereabout"]');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '1');
      await page.click('[data-history-kind="cv-change-request"]');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '1', 'CV date filters survive tab switching');
      assert.ok((await page.$eval('#historyFilterSummary', node => node.textContent)).includes('Approved'), 'Cancelled filter drafts must not change the applied summary');
      await page.click('#historyFilterTrigger');
      await page.click('#resetHistoryFilter');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '12');
      await page.click('#historyFilterTrigger');
      await page.$eval('#cvHistoryDateFrom', node => {node.value = '2026-10-12';});
      await page.$eval('#cvHistoryDateTo', node => {node.value = '2026-10-12';});
      await page.select('#cvHistoryStatus', 'submitted');
      await page.click('#applyHistoryFilter');
      assert.deepEqual(await page.$$eval('.history-card-item', nodes => nodes.map(node => node.dataset.recordId)), ['REQ-CV-2026-10'], 'Local dates drive inclusive filtering');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), 'History fits mobile width ' + width);
        await page.click('[data-history-kind="cv-change-request"]');
        assert.ok(await page.$eval('[data-history-kind="cv-change-request"]', node => {
          const tab = node.getBoundingClientRect();
          const container = node.closest('.me-jump-bar').getBoundingClientRect();
          return tab.left >= container.left - 1 && tab.right <= container.right + 1;
        }), 'CV tab can be brought fully into view');
      }
      await page.screenshot({ path: 'scratch/employee-career-cv-history-' + theme + '.png' });
      await page.evaluate(() => localStorage.setItem('pq_change_request_history', '{invalid'));
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '10');
      await page.goto(pathToFileURL(path.resolve('change-request.html')).href + '?theme=' + theme, {waitUntil: 'load'});
      await page.evaluate(() => {
        localStorage.removeItem('pq_change_request_history');
        for (const [field, value] of [['qual_major', 'DATA SCIENCE'], ['bank', 'PUBLIC BANK'], ['fam_birthdate', '01/01/2001']]) {
          const input = document.querySelector('[data-field-id="' + field + '"]');
          input.value = value;
          input.dispatchEvent(new Event('input', {bubbles: true}));
        }
        deleteFamilyRecord('ANOTHER REMOVED MEMBER');
        confirmSubmitRequest();
      });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_change_request_history'))[0]);
      for (const [field, section] of [['qual_major', 'qualification'], ['bank', 'payroll'], ['fam_birthdate', 'family']]) {
        assert.equal(saved.changes.find(change => change.fieldId === field)?.section, section, 'The producer preserves the field owner');
      }
      await page.goto(pathToFileURL(path.resolve('modules/employee-career/options/history.html')).href + '?category=cv-change-request&theme=' + theme, {waitUntil: 'load'});
      await page.click('[data-record-id="' + saved.id + '"]');
      await page.click('[data-cv-tab="family"]');
      const family = await page.$eval('#cv-panel-family', node => node.textContent);
      assert.ok(family.includes('01/01/2001'));
      assert.ok(family.includes('ANOTHER REMOVED MEMBER'));
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: CV history tab, direct navigation, saved requests, details, independent filters, reset, empty storage, both themes and mobile widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
