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

async function checkScreen(page, [file, tabs, queue, selectAll], theme, filterBorder) {
  await open(page, file, theme);
  const results = await page.evaluate(async ({ tabs, queue, selectAll, filterBorder }) => {
    const bar = document.querySelector('.pending-selection-bar');
    const visible = el => el.getClientRects().length > 0;
    const results = [];
    const categories = tabs ? [...document.querySelectorAll(tabs)] : [null];
    for (const tab of categories) {
      tab?.click();
      const boxes = [...document.querySelectorAll(queue + ' .approval-card-checkbox')].filter(visible);
      if (!boxes.length) throw new Error('No test requests for ' + tab?.textContent);
      for (const box of boxes) {
        const card = box.closest('.approval-request-card, .project-approval-card');
        const buttons = [...card.querySelectorAll('.pending-action-grid button')].filter(visible);
        const expected = card.querySelector('.action-btn-resubmit') ? ['Resubmit', 'Reject', 'Approve'] : ['Reject', 'Approve'];
        const labels = buttons.map(button => button.textContent.trim());
        const bounds = buttons.map(button => button.getBoundingClientRect());
        if (labels.join(',') !== expected.join(',') || !bounds.every((rect, i) => i === 0
          || (rect.left >= bounds[i - 1].right && Math.abs(rect.top - bounds[0].top) <= 1))) {
          throw new Error('Incorrect card action order in ' + queue + ': ' + labels.join(', '));
        }
      }
      const all = document.querySelector(selectAll);
      const count = () => Number(bar.querySelector('span').textContent);
      function checkBulkActions() {
        const selected = [...document.querySelectorAll(queue + ' .approval-card-checkbox:checked')].filter(visible);
        const hasResubmit = selected.length > 0 && selected.every(box => {
          const card = box.closest('.approval-request-card, .project-approval-card');
          return [...card.querySelectorAll('button')].some(button =>
            visible(button) && !button.disabled && button.textContent.trim() === 'Resubmit');
        });
        const expected = hasResubmit ? ['Resubmit', 'Reject', 'Approve'] : ['Reject', 'Approve'];
        const buttons = [...bar.querySelectorAll('button')];
        const labels = buttons.map(button => button.textContent.trim());
        if (JSON.stringify(labels) !== JSON.stringify(expected)) {
          throw new Error(queue + ' expected ' + expected.join(', ') + ' but showed ' + labels.join(', '));
        }
        return buttons;
      }
      const scrollArea = all.closest('.main-content, .payroll-pending-content');
      const listBottom = scrollArea.getBoundingClientRect().bottom;
      const nav = document.querySelector('.bottom-nav');
      const navTop = nav.getBoundingClientRect().top;
      const standaloneNavBorder = getComputedStyle(nav).borderTop;
      boxes[0].click();
      const buttons = checkBulkActions();
      const bounds = bar.getBoundingClientRect();
      const style = getComputedStyle(bar);
      if (style.borderTop !== filterBorder.border || style.borderTopLeftRadius !== filterBorder.radius
        || style.borderTopRightRadius !== filterBorder.radius || style.borderBottomWidth !== '0px'
        || style.borderBottomLeftRadius !== '0px' || style.borderBottomRightRadius !== '0px' || style.boxShadow !== 'none') {
        throw new Error(queue + ' selection bar should have the Current Filter top edge and a flat join to the tabs');
      }
      const navStyle = getComputedStyle(nav);
      if (style.borderLeftWidth !== '0px' || style.borderRightWidth !== '0px'
        || navStyle.borderTopWidth !== '1px' || navStyle.borderTop !== standaloneNavBorder
        || style.backgroundColor !== navStyle.backgroundColor) {
        throw new Error(queue + ' selection actions and bottom tabs should meet at a single 1px divider with flush sides');
      }
      const navBounds = nav.getBoundingClientRect();
      if (Math.abs(bounds.bottom - navBounds.top) > 1 || Math.abs(bounds.left - navBounds.left) > 1
        || Math.abs(bounds.right - navBounds.right) > 1 || Math.abs(navBounds.top - navTop) > 1
        || Math.abs(scrollArea.getBoundingClientRect().bottom - bounds.top) > 1) {
        throw new Error(queue + ' selection bar should meet the list and bottom tabs edge to edge');
      }
      const left = bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      const right = bounds.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
      const badge = bar.querySelector('strong span').getBoundingClientRect();
      const actions = buttons.map(button => button.getBoundingClientRect());
      const first = actions[0];
      const fullWidth = Math.abs(badge.left - left) <= 1 && badge.bottom <= first.top
        && Math.abs(first.left - left) <= 1 && Math.abs(actions.at(-1).right - right) <= 1
        && actions.every((rect, index) => Math.abs(rect.width - first.width) <= 1 && Math.abs(rect.top - first.top) <= 1
          && (index === 0 || rect.left >= actions[index - 1].right));
      const labelsFit = buttons.every(button => button.scrollWidth <= button.clientWidth + 1);
      for (const button of buttons) {
        const label = button.textContent.trim();
        const style = getComputedStyle(button);
        if (style.borderRadius !== '12px' || button.offsetHeight < 40) throw new Error('Incorrect button dimensions for ' + label);
        if (style.backgroundColor !== 'rgb(124, 58, 237)' || style.backgroundImage !== 'none'
          || style.borderTopColor !== 'rgb(139, 92, 246)' || style.color !== 'rgb(255, 255, 255)') {
          throw new Error(queue + ' expected a purple button with white text for ' + label);
        }
      }
      const tappable = b => {
        const r = b.getBoundingClientRect();
        return !b.disabled &&
          b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      };
      const single = visible(bar) && count() === 1 && buttons.every(tappable);
      const originalScroll = scrollArea.scrollTop;
      scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'instant' });
      const lastCard = boxes.at(-1).closest('.approval-request-card, .project-approval-card');
      const lastAction = [...lastCard.querySelectorAll('.pending-action-grid button')].filter(visible).at(-1);
      if (Math.abs(bar.getBoundingClientRect().top - bounds.top) > 1 || !tappable(lastAction)
        || lastAction.getBoundingClientRect().bottom > bounds.top + 1
        || ![...nav.querySelectorAll('a,button')].every(tappable)) {
        throw new Error(queue + ' last request and navigation tabs must stay reachable while the selection bar is docked');
      }
      scrollArea.scrollTo({ top: originalScroll, behavior: 'instant' });
      if (!all.checked) all.click();
      checkBulkActions();
      const multiple = count() === boxes.length;
      all.click();
      const stillChecked = [...document.querySelectorAll(queue + ' .approval-card-checkbox:checked')].some(visible);
      const cleared = !visible(bar) && !stillChecked && Math.abs(scrollArea.getBoundingClientRect().bottom - listBottom) <= 1
        && getComputedStyle(nav).borderTop === standaloneNavBorder;
      results.push({ tab: tab?.textContent || 'Timesheet', fullWidth, labelsFit, single, multiple, cleared });
    }
    if (categories.length > 1) {
      categories[0].click();
      [...document.querySelectorAll(queue + ' .approval-card-checkbox')].find(visible).click();
      categories[1].click();
      await Promise.resolve(); // The new queue has been rendered.
      if (visible(bar)) throw new Error('Selection carried over to ' + categories[1].textContent);
    }
    return results;
  }, { tabs, queue, selectAll, filterBorder });
  for (const row of results) assert.ok(row.fullWidth && row.labelsFit && row.single && row.multiple && row.cleared, file + ' ' + JSON.stringify(row));
}

async function checkDecisions(page, file, queue) {
  for (const action of ['approve', 'reject', 'resubmit']) {
    await open(page, file, 'light');
    const cardSelector = queue + ' :is(.project-approval-card,.approval-request-card):not([style*="display: none"])';
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
    if (action === 'resubmit') {
      const toast = file.includes('claims/') ? '#toastText' : '#appToast';
      assert.match(await page.$eval(toast, node => node.textContent), /resubmission/i);
    }
    if (file.includes('project-task/')) {
      await page.reload();
      assert.equal((await page.$$(cardSelector)).length, cards.length - 2);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_project_pending_decisions')));
      assert.deepEqual(saved.map(decision => decision.action), [action, action]);
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
    for (const theme of ['light', 'dark']) {
      await open(page, 'modules/payroll/options/pending-approval.html', theme);
      const filterBorder = await page.$eval('.approval-filter-summary', filter => {
        const style = getComputedStyle(filter);
        return { border: style.border, radius: style.borderRadius };
      });
      for (const width of [320, 360, 390, 420]) {
        await page.setViewport({ width, height: 640 });
        for (const screen of screens) await checkScreen(page, screen, theme, filterBorder);
      }
    }
    for (const exitApprovals of [() => showLeaveSection('viewLeaveHub', 'team'), () => switchHubScope('team')]) {
      await open(page, 'leave.html', 'light');
      await page.$eval('#selectAllApprovalsCheckbox', box => box.click());
      await page.evaluate(exitApprovals);
      assert.ok(await page.$eval('#teamApprovalsFloatingBar', bar => bar.hidden), 'Leave dashboard should hide selection actions');
    }
    for (const index of [0, 1, 2, 3]) await checkDecisions(page, screens[index][0], screens[index][2]);
    assert.deepEqual(errors, []);
    console.log('PASS: docked selection bars, reachable tabs and requests, counts and decisions across all approval modules at four widths in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
