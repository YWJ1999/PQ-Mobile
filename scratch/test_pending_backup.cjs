const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const queues = [
  ['modules/claims/options/pending-approval.html', '#teamApprovalsQueue .approval-request-card'],
  ['modules/claims/options/team.html', '#teamApprovalsQueue .approval-request-card'],
  ['modules/payroll/options/pending-approval.html', '#payrollPendingQueue .approval-request-card'],
  ['modules/admin/options/pending-approval.html', '#workplacePendingQueue .approval-request-card'],
  ['modules/project-task/options/pending-approval.html', '#projectTimesheetApprovalList .project-approval-card'],
  ['modules/employee-career/options/pending-approval.html', '#careerPendingQueue .approval-request-card'],
  ['modules/performance/options/pending-approval.html', '#performanceApprovalQueue .approval-request-card'],
  ['modules/attendance/options/team.html', '#pendingApprovalListContent .approval-request-card'],
  ['leave.html', '#teamApprovalsListContainer .approval-request-card'],
  ['team.html', '.approvals-scroll .approval-card']
];

async function verify(page, file, cards, theme) {
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href + '?theme=' + theme);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  if (file === 'modules/claims/options/team.html') await page.evaluate(() => ClaimsEngine.renderTeamQueue());
  if (file.includes('attendance/')) await page.evaluate(() => showPendingApprovalPage());
  if (file === 'leave.html') await page.evaluate(() => showLeaveSection('viewTeamApprovals'));
  assert.ok(await page.$(cards), file + ': seeded approvals render');
  const backupControls = await page.$$eval('button, [role="button"], a', nodes => nodes.filter(node => /backup/i.test(node.textContent) || /backup/i.test(node.getAttribute('onclick') || '')).map(node => node.outerHTML));
  assert.deepEqual(backupControls, [], file + ': no Backup control in cards, details or workflows');
  assert.equal(await page.$('.action-btn-backup'), null, file);
  const grids = await page.$$eval(cards + ' .pending-action-grid, ' + cards + ' .project-approval-actions', nodes => nodes.filter(node => node.getClientRects().length).map(node => ({
    actions: [...node.querySelectorAll('button')].map(button => button.textContent.trim()),
    alignment: getComputedStyle(node).justifyContent,
    overflow: node.scrollWidth > node.clientWidth + 1
  })));
  for (const grid of grids) {
    assert.ok(grid.actions.includes('Approve') && grid.actions.includes(file === 'team.html' ? 'Review' : 'Reject'), file);
    assert.equal(grid.alignment, 'center', file + ': actions are centered');
    assert.equal(grid.overflow, false, file + ': no action overflow');
  }
  if (file.includes('/admin/')) {
    const count = await page.$eval('#workplacePendingCount', node => node.textContent);
    await page.evaluate(() => localStorage.setItem('peoplehcm:approval-backup:workplace:guest-visit-0013', JSON.stringify({ name: 'Existing approver', empNo: 'EBB04' })));
    await page.reload();
    assert.equal(await page.$eval('.approval-backup-assignment', node => node.textContent), 'Backup approver · Existing approver');
    assert.equal(await page.$eval('#workplacePendingCount', node => node.textContent), count, 'Saved assignment history does not change pending requests');
    assert.equal(await page.$('.action-btn-backup'), null);
  }
  console.log(`PASS: no Backup controls and complete action rows: ${file}, ${theme}`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
    for (const [theme, width] of [['light', 390], ['dark', 320]]) {
      await page.setViewport({ width, height: 720 });
      for (const [file, cards] of queues) await verify(page, file, cards, theme);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
