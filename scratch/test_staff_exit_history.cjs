const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/history.html')).href;
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
      await page.setViewport({ width, height: 900 });
      await page.goto(url + '?category=staff-exit&theme=' + theme, { waitUntil: 'load' });
      assert.deepEqual(await page.$$eval('#teamHistoryList .history-card-item', cards => cards.map(card => ({
        name: card.querySelector('.team-history-employee-name').textContent.trim(),
        id: card.querySelector('.team-history-employee-name + .team-history-employee-id').textContent.trim(),
        position: card.querySelector('.team-history-employee-position')?.textContent.trim(),
        status: card.querySelector('.status-pill').textContent.trim(),
        fields: [...card.querySelectorAll('.history-card-row')].map(row => [...row.children].map(node => node.textContent.trim()))
      }))), [
        { name: 'Daniel Wong', id: '#EBB02', position: 'Product Designer', status: 'Pending', fields: [['Notice Date', '2 Oct 2026'], ['Last Paid Date', '31 Oct 2026'], ['Reason', 'Career Opportunity']] },
        { name: 'Nur Izzati', id: '#EBB03', position: 'Finance Analyst', status: 'Approved', fields: [['Notice Date', '15 Sept 2026'], ['Last Paid Date', '30 Sept 2026'], ['Reason', 'Contract Completed']] }
      ]);
      assert.equal(await page.$eval('#teamExitFilterBar', node => node.hidden), false);
      assert.equal(await page.$eval('#teamConfirmationFilterBar', node => node.hidden), true);
      const firstExit = '[data-exit-id="SE-2026-0008"]';
      assert.ok(await page.$(firstExit), 'Staff Exit cards are accessible detail buttons');
      await page.evaluate(() => Object.assign(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-exit'][0], {
        reference: 'SE-REF-0008', submittedDate: '2026-10-03', lastServiceDate: '2026-10-29', replacementDeadline: '2026-10-25',
        recommendedAction: 'Replace Position', isBlacklist: false, remarks: 'Handover in progress.\nReturn company assets.', hrRemarks: 'Final review pending.',
        attachments: [{ name: 'resignation.pdf', url: 'https://example.com/resignation.pdf' }, { name: 'handover.txt', url: 'javascript:alert(1)' }]
      }));
      const originalData = await page.evaluate(() => JSON.stringify(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-exit']));
      await page.click(firstExit);
      assert.equal(await page.$eval('#teamExitDetailsTitle', node => node.textContent.trim()), 'Staff Exit Details');
      assert.deepEqual(await page.$$eval('#teamExitDetailsRows th', nodes => nodes.map(node => node.textContent.trim())), ['Reference #', 'Status', 'Emp #', 'Name', 'Position', 'Submit Date', 'Notice Date', 'Last Service Date', 'Replacement Deadline', 'Recommended Action', 'Is Blacklist', 'Exit Type', 'Reason', 'Remarks', 'HR Remarks', 'Attachment']);
      assert.deepEqual(await page.$$eval('#teamExitDetailsRows td', nodes => nodes.slice(0, 15).map(node => node.textContent.trim())), ['SE-REF-0008', 'Pending', '#EBB02', 'Daniel Wong', 'Product Designer', '3 Oct 2026', '2 Oct 2026', '29 Oct 2026', '25 Oct 2026', 'Replace Position', 'No', 'Resignation', 'Career Opportunity', 'Handover in progress.\nReturn company assets.', 'Final review pending.']);
      assert.equal(await page.$$eval('#teamExitDetailsRows tr:last-child a', nodes => nodes.length), 1, 'Unsafe attachment URLs remain plain text');
      assert.ok(await page.$eval('#teamExitDetailsRows tr:last-child', node => node.textContent.includes('resignation.pdf') && node.textContent.includes('handover.txt')));
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#teamExitDetailsOverlay', node => node.hidden), true);
      assert.ok(await page.$eval(firstExit, node => document.activeElement === node), 'Closing restores focus to the original card');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#teamExitDetailsOverlay', node => node.hidden), false, 'Keyboard activation opens details');
      await page.click('#teamExitCloseDetails');
      await page.click('[data-exit-id="SE-2026-0007"]');
      const missing = await page.$$eval('#teamExitDetailsRows td', nodes => nodes.map(node => node.textContent.trim()));
      assert.deepEqual(missing.slice(0, 8), ['SE-2026-0007', 'Approved', '#EBB03', 'Nur Izzati', 'Finance Analyst', '—', '15 Sept 2026', '—'], 'Missing Submit Date and Last Service Date do not reuse unrelated dates');
      assert.equal(missing.at(-1), 'No attachments');
      await page.setViewport({ width, height: 640 });
      assert.ok(await page.$eval('#teamExitDetailsOverlay .detail-popout-panel', node => {
        const bounds = node.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= innerHeight && node.scrollWidth <= node.clientWidth + 1;
      }), 'Details fit short phone screens');
      await page.$eval('#teamExitDetailsOverlay .detail-popout-body', node => { node.scrollTop = node.scrollHeight; });
      assert.ok(await page.$eval('#teamExitDetailsRows tr:last-child', row => {
        const rowBounds = row.getBoundingClientRect();
        const bodyBounds = row.closest('.detail-popout-body').getBoundingClientRect();
        return rowBounds.top >= bodyBounds.top - 1 && rowBounds.bottom <= bodyBounds.bottom + 1;
      }), 'Attachment remains reachable at the bottom of the scrollable table');
      await page.click('#teamExitCloseDetails');
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.evaluate(() => JSON.stringify(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-exit'])), originalData, 'Viewing details preserves exit data');
      const apply = async values => {
        await page.click('#teamExitFilterTrigger');
        await page.evaluate(values => {
          for (const [key, id] of Object.entries({ keyword: 'teamExitKeyword', startDate: 'teamExitStartDate', endDate: 'teamExitEndDate', status: 'teamExitStatus' })) document.getElementById(id).value = values[key] || '';
        }, values);
        await page.click('#teamExitApplyFilter');
      };
      const names = () => page.$$eval('#teamHistoryList .team-history-employee-name', nodes => nodes.map(node => node.textContent.trim()));
      await apply({ keyword: '#ebb02' });
      assert.deepEqual(await names(), ['Daniel Wong'], 'Keyword supports employee IDs including #');
      await apply({ keyword: 'FINANCE ANALYST' });
      assert.deepEqual(await names(), ['Nur Izzati'], 'Keyword supports position and ignores case');
      await apply({ status: 'Approved' });
      assert.deepEqual(await names(), ['Nur Izzati']);
      await apply({ status: 'Submitted' });
      assert.deepEqual(await names(), ['Daniel Wong']);
      await apply({ startDate: '2026-09-15', endDate: '2026-09-15' });
      assert.deepEqual(await names(), ['Nur Izzati'], 'Notice Date filtering includes both date boundaries');
      await apply({ keyword: 'career opportunity', startDate: '2026-10-02', endDate: '2026-10-02', status: 'Submitted' });
      assert.deepEqual(await names(), ['Daniel Wong'], 'Keyword, dates and status combine');
      await page.click('[data-team-history-kind="staff-confirmation"]');
      assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '2', 'Exit filters do not affect Staff Confirmation');
      await page.click('[data-team-history-kind="staff-exit"]');
      assert.deepEqual(await names(), ['Daniel Wong'], 'Exit filters survive switching tabs');
      await page.click('#teamExitFilterTrigger');
      await page.$eval('#teamExitKeyword', node => { node.value = 'unapplied'; });
      await page.keyboard.press('Escape');
      assert.deepEqual(await names(), ['Daniel Wong'], 'Closing does not apply draft filter edits');
      await apply({ startDate: '2026-10-31', endDate: '2026-10-01' });
      assert.equal(await page.$eval('#teamExitFilterOverlay', node => node.hidden), false);
      assert.equal(await page.$eval('#teamExitFilterError', node => node.hidden), false);
      assert.deepEqual(await names(), ['Daniel Wong'], 'Invalid date ranges leave applied filters unchanged');
      await page.click('#teamExitResetFilter');
      assert.equal(await page.$eval('#teamExitFilterOverlay', node => node.hidden), true);
      assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '2');
      await apply({ keyword: 'Daniel', status: 'Approved' });
      assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '0');
      assert.equal(await page.$eval('#teamHistoryEmpty', node => node.hidden), false);
      await page.click('#teamExitFilterTrigger');
      assert.deepEqual(await page.$$eval('#teamExitStatus option', nodes => nodes.map(node => node.textContent.trim())), ['All Status', 'Approved', 'Pending']);
      await page.click('#teamExitResetFilter');
      assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
      assert.ok(await page.$$eval('#teamHistoryList .history-card-item', cards => cards.every(card => card.scrollWidth <= card.clientWidth + 1)));
      await page.screenshot({ path: path.join(__dirname, `staff-exit-history-${theme}-${width}.png`) });
      assert.deepEqual(errors, []);
      await page.close();
      console.log('PASS: Staff Exit cards and independent keyword/date/status filters, ' + theme + ' ' + width);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
