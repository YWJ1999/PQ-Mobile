const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const modules = [
  ['admin', '[data-workplace-tab]'],
  ['payroll', '[data-payroll-tab]'],
  ['employee-career', '[data-career-pending-type]'],
  ['performance', '[data-approval-tab]'],
  ['project-task'],
  ['claims']
];

async function checkCards(page, selector) {
  const cards = await page.$$eval(selector, nodes => nodes.filter(card => card.getClientRects().length).map(card => {
    const details = card.querySelector('.approval-card-details');
    const fields = [...(details?.children || [])];
    const actions = card.querySelector('.pending-action-grid');
    return {
      flatRows: fields.length > 0 && fields.every(row => {
        const term = row.querySelector('dt');
        const value = row.querySelector('dd');
        return term?.textContent.trim() && value?.textContent.trim()
          && term.getBoundingClientRect().right <= value.getBoundingClientRect().left + 1
          && getComputedStyle(value).textAlign === 'right';
      }) && [details, ...fields].every(node => {
        const style = getComputedStyle(node);
        return style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderTopWidth === '0px';
      }),
      fits: card.scrollWidth <= card.clientWidth + 1,
      actionsAligned: actions && getComputedStyle(actions).justifyContent === 'center'
    };
  }));
  assert.ok(cards.length, 'Expected approval cards on ' + page.url());
  for (const card of cards) {
    assert.ok(card.flatRows && card.fits && card.actionsAligned, page.url() + ' ' + JSON.stringify(card));
  }
  await checkActionSize(page, selector + ' .pending-action-grid');
}

async function checkActionSize(page, selector) {
  const groups = await page.$$eval(selector, rows => rows.filter(row => row.getClientRects().length).map(row => {
    const buttons = [...row.querySelectorAll(':scope > :is(button, a)')].filter(button => button.getClientRects().length);
    const lines = new Map();
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      const top = Math.round(rect.top);
      if (!lines.has(top)) lines.set(top, []);
      lines.get(top).push(rect);
    }
    const bounds = row.getBoundingClientRect();
    return {
      labels: buttons.map(button => button.textContent.trim()),
      centered: [...lines.values()].every(line => Math.abs((line[0].left - bounds.left) - (bounds.right - line.at(-1).right)) < 1.5),
      equalWidths: buttons.every(button => Math.abs(button.offsetWidth - buttons[0].offsetWidth) <= 1),
      contained: buttons.every(button => button.offsetHeight >= 44 && button.scrollWidth <= button.clientWidth + 1
        && button.getBoundingClientRect().left >= bounds.left - 1 && button.getBoundingClientRect().right <= bounds.right + 1),
      labelsFit: buttons.every(button => {
        if (button.textContent.trim().includes(' ')) return true;
        const range = document.createRange();
        range.selectNodeContents(button);
        return range.getBoundingClientRect().height <= parseFloat(getComputedStyle(button).lineHeight) + 2;
      }),
      columns: [...lines.values()].map(line => line.length)
    };
  }));
  assert.ok(groups.length, 'Expected visible action rows on ' + page.url());
  for (const group of groups) {
    assert.ok(group.labels.length && group.centered && group.equalWidths && group.contained && group.labelsFit, page.url() + ' ' + JSON.stringify(group));
    if (group.labels.length === 4) assert.ok(['4', '2,2'].includes(group.columns.join(',')));
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
    headless: true,
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const open = (file, theme) => page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href + '?theme=' + theme, { waitUntil: 'load' });
    for (const theme of ['light', 'dark']) for (const width of [320, 390, 420]) {
      await page.setViewport({ width, height: 880 });
      for (const [name, tabs] of modules) {
        await open('modules/' + name + '/options/pending-approval.html', theme);
        const selector = name === 'project-task' ? '.project-approval-card' : '.approval-request-card';
        await checkCards(page, selector);
        if (tabs) for (const tab of await page.$$(tabs)) {
          await tab.click();
          await checkCards(page, selector);
        }
      }
      await open('leave.html', theme);
      await page.evaluate(() => showLeaveSection('viewTeamApprovals'));
      for (const type of ['leave', 'credit', 'offtime']) {
        await page.evaluate(type => switchApprovalCategory(type), type);
        await checkCards(page, '#teamApprovalsListContainer .approval-request-card');
      }
      await open('modules/attendance/options/team.html', theme);
      for (const type of ['ot_plan', 'feedback', 'final_ot']) {
        await page.evaluate(type => showPendingApprovalPage(type), type);
        await checkCards(page, '#pendingApprovalListContent .approval-request-card');
      }
      for (const file of ['team.html', 'team-v2.html']) {
        await open(file, theme);
        await checkCards(page, '.team-approval-preview');
      }
      for (const [file, actions] of [
        ['modules/admin/options/book-resource.html', '.history-card-actions'],
        ['modules/admin/options/history.html', '.history-card-actions'],
        ['modules/attendance/options/feedback-history.html', '.history-card-actions'],
        ['modules/performance/options/goal-progress.html', '.goal-progress-card-footer'],
        ['modules/performance/options/performance-evaluation.html', '.evaluation-card-footer']
      ]) {
        await open(file, theme);
        const row = await page.waitForSelector(actions, { visible: true });
        assert.equal(await row.evaluate(element => getComputedStyle(element).justifyContent), 'flex-end', file);
      }
      console.log('Verified approval card layouts at ' + width + 'px in ' + theme + ' mode.');
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
