const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const screens = [
  ['modules/attendance/options/team.html', '#staffTabFinalOT,#staffTabOTPlan,#staffTabFeedback', '#pendingApprovalListContent', '#selectAllPendingCheckbox'],
  ['leave.html', '#tabApprovalLeave,#tabApprovalCredit,#tabApprovalOfftime', '#teamApprovalsListContainer', '#selectAllApprovalsCheckbox'],
  ['modules/claims/options/pending-approval.html', 'button[onclick*="switchPendingTab"]', '#teamApprovalsQueue', '#claimsSelectAllPending'],
  ['modules/project-task/options/pending-approval.html', '', '#projectTimesheetApprovalList', '#projectApprovalSelectAll'],
  ['modules/payroll/options/pending-approval.html', '[data-payroll-tab]', '#payrollPendingQueue', '#payrollPendingSelectAll'],
  ['modules/admin/options/pending-approval.html', '[data-workplace-tab]', '#workplacePendingQueue', '#workplacePendingSelectAll'],
  ['modules/employee-career/options/pending-approval.html', '#careerPendingTabs button', '#careerPendingQueue', '#careerPendingSelectAll'],
  ['modules/performance/options/pending-approval.html', '[data-approval-tab]', '#performanceApprovalQueue', '#performanceApprovalSelectAll']
];

async function open(page, file, theme) {
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href + '?theme=' + theme);
  if (file.includes('attendance/')) await page.evaluate(() => showPendingApprovalPage());
  if (file === 'leave.html') await page.evaluate(() => showLeaveSection('viewTeamApprovals'));
}

async function checkScreen(page, [file, tabs, queue, selectAll], theme) {
  await open(page, file, theme);
  const results = await page.evaluate(async ({ tabs, queue, selectAll }) => {
    const bar = document.querySelector('.pending-selection-bar, #teamApprovalsFloatingBar');
    const visible = el => el.getClientRects().length > 0;
    const results = [];
    const categories = tabs ? [...document.querySelectorAll(tabs)] : [null];
    for (const tab of categories) {
      tab?.click();
      const boxes = [...document.querySelectorAll(queue + ' .approval-card-checkbox')].filter(visible);
      if (!boxes.length) throw new Error('No test requests for ' + tab?.textContent);
      for (const box of boxes) {
        const card = box.closest('.approval-request-card, .project-approval-card');
        const backup = card.querySelectorAll('.pending-action-grid .action-btn-backup');
        if (backup.length !== 1 || !visible(backup[0]) || backup[0].disabled) throw new Error('Missing Backup in ' + (tab?.textContent || queue));
      }
      const all = document.querySelector(selectAll);
      const count = () => Number(bar.querySelector('span').textContent);
      boxes[0].click();
      const buttons = [...bar.querySelectorAll('button')];
      const tappable = label => buttons.some(b => {
        const r = b.getBoundingClientRect();
        return b.textContent.trim().startsWith(label) && !b.disabled &&
          b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      });
      const single = visible(bar) && count() === 1 && tappable('Reject') && tappable('Approve Selected');
      if (!all.checked) all.click();
      const multiple = count() === boxes.length;
      all.click();
      const stillChecked = [...document.querySelectorAll(queue + ' .approval-card-checkbox:checked')].some(visible);
      results.push({ tab: tab?.textContent || 'Timesheet', single, multiple, cleared: !visible(bar) && !stillChecked });
    }
    if (categories.length > 1) {
      categories[0].click();
      [...document.querySelectorAll(queue + ' .approval-card-checkbox')].find(visible).click();
      categories[1].click();
      await Promise.resolve(); // The new queue has been rendered.
      if (visible(bar)) throw new Error('Selection carried over to ' + categories[1].textContent);
    }
    return results;
  }, { tabs, queue, selectAll });
  for (const row of results) assert.ok(row.single && row.multiple && row.cleared, file + ' ' + JSON.stringify(row));
}

async function checkDecisions(page, file, queue) {
  for (const action of ['approve', 'reject']) {
    await open(page, file, 'light');
    const cardSelector = queue + ' :is(.project-approval-card,.approval-request-card)';
    const cards = await page.$$(cardSelector);
    const last = cards.length - 1;
    assert.ok(last >= 2);
    const untouched = await cards[1].evaluate(card => card.textContent);
    await cards[0].$eval('input', box => box.click());
    await cards[last].$eval('input', box => box.click());
    await page.click('.pending-selection-bar [data-decision="' + action + '"]');
    assert.equal((await page.$$(cardSelector)).length, cards.length - 2);
    assert.equal(await page.$eval(cardSelector, card => card.textContent), untouched);
    assert.equal(await page.$eval('.pending-selection-bar', bar => bar.hidden), true);
    if (file.includes('project-task/')) {
      await page.reload();
      assert.equal((await page.$$(cardSelector)).length, cards.length - 2);
      await page.evaluate(() => localStorage.removeItem('pq_project_pending_decisions'));
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
    for (const [theme, width] of [['light', 360], ['dark', 320]]) {
      await page.setViewport({ width, height: 640 });
      for (const screen of screens) await checkScreen(page, screen, theme);
    }
    for (const index of [0, 2, 3]) await checkDecisions(page, screens[index][0], screens[index][2]);
    assert.deepEqual(errors, []);
    console.log('PASS: selection counts and tappable decisions on all 25 tabs in both themes; selected-only decisions on Attendance, Claims and Project & Task.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
