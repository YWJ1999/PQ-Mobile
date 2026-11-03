const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const queues = [
  ['modules/claims/options/pending-approval.html', '#teamApprovalsQueue .approval-request-card'],
  ['modules/payroll/options/pending-approval.html', '#payrollPendingQueue .approval-request-card'],
  ['modules/admin/options/pending-approval.html', '#workplacePendingQueue .approval-request-card'],
  ['modules/project-task/options/pending-approval.html', '#projectTimesheetApprovalList .project-approval-card'],
  ['team.html', '.approvals-scroll .approval-card']
];

async function verify(page, file, cards, theme) {
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href + '?theme=' + theme);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const trigger = cards + ' .action-btn-backup';
  const note = cards + ' .approval-backup-assignment';
  const dialog = '.approval-backup-dialog[open]';
  async function openPicker() {
    await page.$eval(trigger, b => b.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click(trigger);
    await page.waitForSelector(dialog);
  }
  const count = (await page.$$(cards)).length;
  assert.ok(count > 0, file);
  assert.equal(await page.$eval(note, el => el.hidden), true);
  await openPicker();
  if (file.includes('claims/')) {
    const empNo = await page.$eval(cards, el => el.closest('pending-approval-card').getAttribute('emp-id').slice(1));
    const eligible = await page.$$eval(dialog + ' option', options => options.map(o => o.value));
    assert.ok(!eligible.includes(empNo));
    assert.equal(await page.$eval('#claimDetailsModalOverlay', el => el.classList.contains('active')), false);
  }
  await page.keyboard.press('Escape');
  await page.waitForSelector(dialog, { hidden: true });
  assert.equal(await page.$eval(note, el => el.hidden), true, 'Cancel must keep the request unchanged');

  await openPicker();
  const person = await page.$eval(dialog + ' option:nth-child(2)', o => ({ id: o.value, name: o.textContent }));
  await page.select(dialog + ' select', person.id);
  await page.click(dialog + ' [type="submit"]');
  await page.waitForSelector(dialog, { hidden: true });
  assert.equal((await page.$$(cards)).length, count);
  await page.reload();
  assert.equal((await page.$$(cards)).length, count, 'Assigned requests must remain pending');
  const assignments = await page.$$eval(note, notes => notes.filter(n => !n.hidden).map(n => n.textContent));
  assert.deepEqual(assignments, ['Backup approver · ' + person.name], 'Only the target request should have the assignment');
  await openPicker();
  assert.equal(await page.$eval(dialog + ' select', select => select.value), person.id);
  await page.click(dialog + ' [type="button"]');
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
    console.log('PASS: backup selection, cancel, request isolation, persistence and pending status on all new card entry points.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
