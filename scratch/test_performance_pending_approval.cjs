const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = (file, query = '') => pathToFileURL(path.resolve(__dirname, '..', file)).href + query;
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.emulateTimezone('Asia/Kuala_Lumpur');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844 });
        await page.goto(url('modules/performance/index.html', `?scope=team&theme=${theme}`));
        await page.evaluate(() => sessionStorage.removeItem('performance-pending-actions-v1'));
        await page.evaluate(() => sessionStorage.removeItem('performance-pending-backups-v1'));
        await page.reload();
        assert.equal(await page.$('#performanceTeamActionTitle'), null, 'Team Action removed');
        assert.equal(await page.$eval('#performancePendingCount', el => el.textContent), '9');
        await page.$eval('#performancePendingApproval', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await Promise.all([page.waitForNavigation(), page.click('#performancePendingApproval')]);
        assert.ok(page.url().includes('/performance/options/pending-approval.html'), page.url());
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.deepEqual(await page.$$eval('[data-approval-tab]', els => els.map(el => el.textContent.trim())), ['Goal Plan', 'Self Evaluation', 'Self Review']);
        for (const category of ['goal-plan', 'self-evaluation', 'self-review']) {
          await page.click(`[data-approval-tab="${category}"]`);
          assert.equal(await page.$$eval('.approval-request-card', els => els.length), 3);
          assert.ok(await page.$$eval('.employee-id', els => els.every(el => /^#/.test(el.textContent) && el.previousElementSibling.classList.contains('employee-name'))));
          await page.click('.three-dots-btn');
          assert.deepEqual(await page.$$eval('#performanceApprovalMenu .payroll-approval-menu-option', els => els.map(el => el.textContent.trim())), ['View Details', 'View Workflow']);
          await page.click('#performanceApprovalViewDetails');
          assert.equal(await page.$eval('#approvalDetailsTitle', el => el.textContent), `${{ 'goal-plan': 'Goal Plan', 'self-evaluation': 'Self Evaluation', 'self-review': 'Self Review' }[category]} Approval`);
          assert.ok(await page.$eval('#approvalDetailsBody', el => el.textContent.includes('FY 2026A')));
          assert.ok(await page.$eval('.payroll-pending-content', el => el.inert), 'Background stays inert during details');
          assert.deepEqual(await page.$$eval('#approvalDetailsActions button', els => els.map(el => el.textContent)), ['Approve', 'Resubmit', 'Cancel', 'Reject']);
          await page.type('#performanceApprovalComments', 'Check the development plan.');
          if (width === 420) await page.screenshot({ path: path.join(os.tmpdir(), `performance-${category}-details-${theme}.png`) });
          await page.click('#approvalDetailsActions [data-approval-action="resubmit"]');
          assert.equal(await page.$eval('#approvalComments', el => el.value), 'Check the development plan.', 'Detail comments carry into confirmation');
          await page.keyboard.press('Escape');
          assert.equal(await page.$eval('#approvalDetails', el => el.hidden), false, 'Cancelling confirmation returns to details');
          assert.equal(await page.$eval('#performanceApprovalComments', el => el.value), 'Check the development plan.');
          await page.setViewport({ width, height: 568 });
          await page.$eval('#approvalDetailsBody', el => { el.scrollTop = el.scrollHeight; });
          assert.ok(await page.$eval('#performanceApprovalComments', el => { const r = el.getBoundingClientRect(), body = el.closest('#approvalDetailsBody').getBoundingClientRect(); return r.bottom <= body.bottom + 1 && r.top >= body.top; }), 'Short screens reach approver comments');
          assert.ok(await page.$eval('#approvalDetailsActions', el => { const r = el.getBoundingClientRect(); return r.bottom <= innerHeight - 70 && r.top >= 0; }), 'Detail actions stay above navigation');
          await page.click('#approvalDetailsActions [data-close-approval]');
          assert.equal(await page.$eval('#approvalDetails', el => el.hidden), true);
          assert.equal(await page.$$eval('.approval-request-card', els => els.length), 3, 'Detail Cancel leaves request pending');
          assert.ok(await page.evaluate(() => document.activeElement.matches('.three-dots-btn')), 'Cancel restores focus to three dots');
          await page.setViewport({ width, height: 844 });
          await page.click('.three-dots-btn');
          await page.click('#performanceApprovalViewWorkflow');
          assert.ok(await page.$eval('#performanceApprovalWorkflow', el => el.textContent.includes('Request Submitted') && el.textContent.includes('Awaiting Approval')), 'Workflow shows supplied submission and pending approval');
          await page.keyboard.press('Escape');
          const decidingId = await page.$eval('.approval-request-card', el => el.dataset.requestId);
          await page.click('.three-dots-btn');
          await page.click('#performanceApprovalViewDetails');
          await page.click('#approvalDetailsActions [data-approval-action="approve"]');
          await page.click('#approvalConfirmSubmit');
          assert.equal(await page.$$eval('.approval-request-card', els => els.length), 2, 'Detail decision removes only the selected request');
          assert.deepEqual(await page.evaluate(id => {
            const decision = JSON.parse(sessionStorage.getItem('performance-pending-actions-v1'))[id];
            return { action: decision.action, comments: decision.comments };
          }, decidingId), { action: 'approve', comments: 'Check the development plan.' }, 'Detail decision saves its own remarks against the correct request');
        }
        await page.evaluate(() => sessionStorage.removeItem('performance-pending-actions-v1'));
        await page.reload();
        await page.click('[data-approval-tab="goal-plan"]');
        await page.focus('[data-approval-tab="goal-plan"]');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.$eval('[data-approval-tab="self-evaluation"]', el => el.getAttribute('aria-selected')), 'true');
        await page.click('[data-approval-tab="goal-plan"]');
        await page.click('.approval-request-card [data-approval-action="reject"]');
        await page.evaluate(() => {
          window.originalApprovalSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key === 'performance-pending-actions-v1') throw new Error('Storage unavailable');
            return window.originalApprovalSetItem.call(this, key, value);
          };
        });
        await page.click('#approvalConfirmSubmit');
        assert.equal(await page.$eval('#approvalConfirmError', el => el.hidden), false, 'Failed save stays open and reports the error');
        assert.equal(await page.$$eval('.approval-request-card', els => els.length), 3, 'Failed save leaves requests pending');
        await page.evaluate(() => { Storage.prototype.setItem = window.originalApprovalSetItem; delete window.originalApprovalSetItem; });
        await page.keyboard.press('Escape');
        assert.equal(await page.$$eval('.approval-request-card', els => els.length), 3, 'Cancel preserves request');
        await page.click('#performanceApprovalFilterTrigger');
        await page.type('#performanceApprovalFilter-keyword', 'Aina');
        await page.click('#performanceApprovalFilter .approval-filter-apply');
        assert.equal(await page.$$eval('.approval-request-card', els => els.length), 1);
        await page.click('#performanceApprovalSelectAll');
        assert.equal(await page.$eval('#performanceApprovalSelectedCount', el => el.textContent), '1');
        await page.click('#performanceApprovalBulk [data-approval-action="approve"]');
        await page.click('#approvalConfirmSubmit');
        assert.ok(await page.$('.payroll-pending-empty'));
        await page.reload();
        await page.click('#performanceApprovalFilterTrigger');
        await page.click('#performanceApprovalFilter [data-action="reset"]');
        await page.keyboard.press('Escape');
        assert.equal(await page.$$eval('.approval-request-card', els => els.length), 2, 'Action survives reload');
        assert.equal(await page.$('.action-btn-backup'), null);
        await page.evaluate(() => {
          const record = PerformancePendingStore.getPending()[0];
          PerformancePendingStore.assignBackup([record.id], 'EBB04');
        });
        await page.evaluate(() => {
          const saved = JSON.parse(sessionStorage.getItem('performance-pending-backups-v1'));
          saved[Object.keys(saved)[0]].assignedAt = '2026-10-15T16:30:00.000Z';
          sessionStorage.setItem('performance-pending-backups-v1', JSON.stringify(saved));
        });
        await page.reload();
        assert.ok(await page.$eval('.approval-request-card', el => el.textContent.includes('Angeline Loren Alan')), 'Existing backup history survives reload');
        await page.click('.three-dots-btn');
        await page.click('#performanceApprovalViewWorkflow');
        assert.ok(await page.$eval('#performanceApprovalWorkflowAudit li:last-child', el => el.textContent.includes('16 Oct 2026')), 'Backup audit formats the full timestamp in local time');
        await page.keyboard.press('Escape');
        for (const [category, action] of [['self-evaluation', 'resubmit'], ['self-review', 'reject']]) {
          await page.click(`[data-approval-tab="${category}"]`);
          await page.click(`.approval-request-card [data-approval-action="${action}"]`);
          await page.click('#approvalConfirmSubmit');
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.payroll-pending-content').scrollWidth <= document.querySelector('.payroll-pending-content').clientWidth + 1), 'No horizontal overflow');
        await page.screenshot({ path: path.resolve(__dirname, `performance-approval-${theme}-${width}.png`) });
        await Promise.all([page.waitForNavigation(), page.click('#performanceApprovalBack')]);
        assert.equal(await page.$eval('#performancePendingCount', el => el.textContent), '6', 'Only completed decisions reduce the dashboard count');
        assert.ok(page.url().includes('scope=team'));
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS Performance pending approval: tabs, filtering, details, all four actions, persistence, counts, themes and mobile widths');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
