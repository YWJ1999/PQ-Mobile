const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = theme => pathToFileURL(
  path.resolve(__dirname, '..', 'modules/project-task/options/pending-approval.html')
).href + '?theme=' + theme;

async function checkSubmission(page, action, fromHistory = false) {
  const base = pageUrl('light');
  const route = name => new URL(name, base).href;
  const queue = route('pending-approval.html');
  const dashboard = route('../index.html?scope=team');
  await page.goto(route('time-sheet.html'));
  const fill = (selector, text) => page.$eval(selector, (el, value) => {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
  await fill('#timesheetDate', '2026-10-08');
  await fill('#timesheetRemark', 'October review <phase 2>\nQA & release');
  for (const [title, from, to, overtime, completion] of [
    ['Testing', '09:00', '12:30', false, '0'], ['Release support', '23:30', '01:15', true, '75']
  ]) {
    await page.click('#addWorkActivity');
    await fill('#activityTitle', title);
    await fill('#activityDescription', 'Details for ' + title);
    await page.select('#activityProject', 'Client Portal Upgrade');
    await page.select('#activityTask', 'Portal Upgrade');
    await fill('#activityTimeFrom', from);
    await fill('#activityTimeTo', to);
    if (overtime) await page.$eval('#activityOvertime', el => el.click());
    await fill('#activityCompletion', completion);
    await page.click('#saveWorkActivity');
  }
  const count = () => page.$$eval('.project-approval-card', cards => cards.length);
  if (fromHistory) {
    await page.click('#saveTimesheetDraft');
    await page.goto(queue);
    assert.equal(await count(), 3);
    await page.goto(route('history.html'));
    await page.click('#historyTab-timesheet');
    await page.$eval('[data-record-id="TS-DRAFT-LOCAL"] [data-history-action="submit"]', el => el.click());
    await page.waitForFunction(() => !localStorage.getItem('pq_project_timesheet_draft'));
  } else {
    await page.click('#submitTimesheet');
    await page.waitForFunction(() => document.querySelector('#timesheetFeedback').textContent.includes('saved'));
  }
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_project_timesheets')).at(-1).id);
  await page.goto(dashboard);
  assert.equal(await page.$eval('.team-pending-approval-count', el => el.textContent), '4');
  await Promise.all([page.waitForNavigation(), page.click('#projectTeamPendingApproval')]);
  const card = '[data-approval-id="' + id + '"]';
  await page.$eval(card + ' .approval-record-link', el => el.click());
  await page.reload();
  await page.waitForSelector('#projectApprovalDetails:not([hidden])');
  assert.equal(await page.$eval('#timesheetRemark', el => el.textContent), 'October review <phase 2>\nQA & release');
  assert.equal(await page.$eval('#normalWorkHours', el => el.textContent), '3.50 Hours');
  assert.equal(await page.$eval('#overtimeHours', el => el.textContent), '1.75 Hours');
  assert.equal(await page.$eval('#workActivityTotal', el => el.textContent), 'Total Hours: 5.25 hrs');
  assert.deepEqual(await page.$$eval('.project-activity-hours', els => els.map(el => el.textContent)), ['3.50 hrs', '1.75 hrs']);
  assert.equal(await page.$eval('#workActivityList', el => el.children.length), 2);
  assert.equal(await page.$('#projectApprovalRequest :is(input,textarea,select,[data-edit-activity],[data-delete-activity])'), null);
  const comment = 'Checked hours for ' + action;
  await fill('#projectApprovalApproverComments', comment);
  const activities = await page.$$('.project-activity-item');
  for (const [i, activity] of activities.entries()) {
    await activity.$eval('.project-activity-details-toggle', el => el.click());
    const fields = await activity.$$eval('.project-activity-data-row', rows =>
      Object.fromEntries(rows.map(row => [row.firstElementChild.textContent, row.lastElementChild.textContent])));
    assert.equal(fields.Description, 'Details for ' + (i ? 'Release support' : 'Testing'));
    assert.equal(fields['Completion %'], i ? '75%' : '0%');
    assert.equal(fields['Is Overtime?'], i ? 'Yes' : 'No');
    if (i) assert.match(await activity.$eval('.project-activity-time', el => el.textContent), /\(\+1 day\)/);
  }
  if (process.env.TIMESHEET_SCREENSHOTS) await page.screenshot({path: path.join(process.env.TIMESHEET_SCREENSHOTS, 'timesheet-review.png')});
  if (action === 'cancel') {
    await page.goto(route('history.html'));
    await page.click('#historyTab-timesheet');
    await page.$eval('[data-record-id="' + id + '"] [data-history-action="cancel"]', el => el.click());
    await page.waitForSelector('[data-record-id="' + id + '"][data-status="cancelled"]');
  } else {
    await page.click('#projectApprovalDetails [data-project-approval-action="' + action + '"]');
    await page.waitForSelector('#projectApprovalDetails', {hidden: true});
  }
  await page.goto(queue);
  assert.equal(await page.$(card), null);
  await page.goto(dashboard);
  assert.equal(await page.$eval('.team-pending-approval-count', el => el.textContent), '3');
  await page.goto(route('history.html'));
  await page.click('#historyTab-timesheet');
  const historyCard = await page.waitForSelector('[data-record-id="' + id + '"]');
  assert.equal(await historyCard.evaluate(el => el.dataset.status), {approve:'approved', reject:'rejected', resubmit:'resubmit', cancel:'cancelled'}[action]);
  if (action !== 'cancel') {
    await historyCard.evaluate(el => el.click());
    assert.ok((await page.$eval('#projectHistoryDetailContent', el => el.textContent)).includes(comment));
  }
  console.log('PASS timesheet', action, fromHistory ? 'from saved draft' : 'from application');
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.setDefaultTimeout(6000);
    await page.setRequestInterception(true);
    page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
    page.on('pageerror', error => faults.push(error.message));

    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(pageUrl(theme), { waitUntil: 'domcontentloaded' });

      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.equal(await page.$eval('.project-header h1', node => node.textContent.trim()), 'Pending Approval');
      assert.equal(await page.$eval('.project-approval-section-title', node => node.textContent.trim()), 'TIMESHEET APPROVALS');
      assert.equal(await page.$eval('#projectTimesheetApprovalCount', node => node.textContent.trim()), '3 Records');
      assert.equal(await page.$eval('body', node => node.classList.contains('unified-approval-actions')), true);
      assert.equal(await page.$$eval('.project-approval-tab', tabs => tabs.length), 0);
      assert.equal(await page.$$eval('.project-approval-card:not([data-type="timesheet"])', cards => cards.length), 0);
      assert.equal(await page.$$eval('.project-approval-employee-copy small', labels => labels.filter(label => label.textContent.trim() === 'Timesheet Request').length), 0);
      assert.equal(await page.$$eval('.project-approval-reference', rows => rows.length), 0);
      assert.deepEqual(
        await page.$$eval('.project-approval-card', cards => cards.map(card => ({
          name: card.querySelector('.project-approval-employee-name').textContent.trim(),
          employeeId: card.querySelector('.project-approval-employee-name + .project-approval-employee-id').textContent.trim(),
          status: card.querySelector('.project-approval-status').textContent.trim(),
          date: card.querySelector('[data-field="date"] dd').textContent.trim(),
          normalHours: card.querySelector('[data-field="normal-hours"] dd').textContent.trim(),
          otHours: card.querySelector('[data-field="ot-hours"] dd').textContent.trim(),
          actions: [...card.querySelectorAll('.project-approval-actions button')].map(button => button.textContent.trim())
        }))),
        [
          { name: 'Farhan binti rahmat', employeeId: '#EBB12', status: 'Pending', date: '30 Sep 2026', normalHours: '7.50 hrs', otHours: '1.00 hrs', actions: ['Resubmit', 'Reject', 'Approve'] },
          { name: 'Aina Rahman', employeeId: '#EBB27', status: 'Pending', date: '29 Sep 2026', normalHours: '8.00 hrs', otHours: '0.00 hrs', actions: ['Resubmit', 'Reject', 'Approve'] },
          { name: 'Daniel Lee', employeeId: '#EBB41', status: 'Pending', date: '28 Sep 2026', normalHours: '6.50 hrs', otHours: '2.00 hrs', actions: ['Resubmit', 'Reject', 'Approve'] }
        ]
      );

      assert.equal(await page.$$eval('.project-approval-card-banner .approval-card-checkbox', boxes => boxes.length), 3);
      const actionStyles = await page.$$eval('.project-approval-card:first-of-type .project-approval-actions button', buttons => buttons.map(button => ({
        background: getComputedStyle(button).backgroundColor,
        radius: getComputedStyle(button).borderRadius,
        minHeight: getComputedStyle(button).minHeight
      })));
      assert.equal(new Set(actionStyles.map(style => style.background)).size, 1);
      assert.equal(new Set(actionStyles.map(style => style.radius)).size, 1);
      assert.equal(new Set(actionStyles.map(style => style.minHeight)).size, 1);
      await page.click('#projectApprovalSelectAll');
      assert.equal(await page.$$eval('.project-approval-card-banner .approval-card-checkbox', boxes => boxes.every(box => box.checked)), true);
      await page.click('#projectApprovalSelectAll');
      assert.equal(await page.$$eval('.project-approval-card-banner .approval-card-checkbox', boxes => boxes.every(box => !box.checked)), true);
      assert.equal(await page.$$eval('[data-project-approval-menu]', buttons => buttons.length), 3);
      await page.click('[data-project-approval-menu]');
      assert.equal(await page.$eval('#projectApprovalMenu', node => node.hidden), false);
      assert.deepEqual(
        await page.$$eval('#projectApprovalMenu .project-approval-menu-option', buttons => buttons.map(button => button.textContent.trim())),
        ['View Details', 'View Workflow']
      );
      await page.click('#projectApprovalViewDetails');
      assert.equal(await page.$eval('#projectApprovalDetails', node => node.hidden), false);
      assert.equal(await page.$eval('#projectApprovalDetailsTitle', el => el.textContent), 'Timesheet Approval');
      assert.equal(await page.$('#projectApprovalRequest :is(input, textarea, select, table, [data-edit-activity], [data-delete-activity])'), null);
      const summary = await page.$$eval('#projectApprovalRequest .form-card h2', els => els.map(el => el.textContent));
      assert.deepEqual(summary, ['Timesheet Details', 'Work Activity']);
      for (const [id, expected] of Object.entries({ timesheetDate: '30 Sep 2026', timesheetClockTimes: '08:30 – 17:30', normalWorkHours: '7.50 Hours', overtimeHours: '1.00 Hours', timesheetRemark: 'Client portal sprint progress update.' })) {
        assert.equal(await page.$eval('#' + id, el => el.textContent), expected);
      }
      await page.click('.project-activity-details-toggle');
      assert.equal(await page.$eval('.project-activity-details-toggle', el => el.getAttribute('aria-expanded')), 'true');
      const fields = await page.$$eval('.project-activity-data-row', els => Object.fromEntries(els.map(el => [el.firstElementChild.textContent, el.lastElementChild.textContent])));
      assert.deepEqual(fields, { Title: 'Portal accessibility review', Description: '—', 'Is Adhoc Task?': '—', Project: 'Client Portal Upgrade',
        Task: 'Accessibility Sprint', 'Is Overtime?': '—', 'Time From': '09:00', 'Time To': '12:00', 'Completion %': '—' });
      assert.equal(await page.$eval('#projectApprovalCommentsTitle', node => node.textContent.trim()), 'Approver Action Comments');
      assert.equal(await page.$eval('#projectApprovalApproverComments', node => node.tagName), 'INPUT');
      assert.equal(await page.$eval('#projectApprovalApproverComments', node => node.placeholder), 'Add approver action comments (optional)...');
      assert.equal(await page.$eval('.project-approval-comments-card', node => getComputedStyle(node).borderRadius), '16px');
      assert.deepEqual(
        await page.$$eval('.project-approval-details-footer button', buttons => buttons.map(button => button.textContent.trim())),
        ['Approve', 'Resubmit', 'Reject']
      );
      for (const width of [320, 390, 450]) {
        await page.setViewport({width, height: 790});
        assert.ok(await page.$eval('#projectApprovalDetails .project-approval-details-body', el => el.scrollWidth <= el.clientWidth + 1));
      }
      await page.click('#projectApprovalDetails [data-approval-back]');
      await page.waitForSelector('#projectApprovalDetails', {hidden: true});
      assert.ok(await page.evaluate(() => document.activeElement.hasAttribute('data-project-approval-menu')));
      await page.click('[data-project-approval-menu]');
      await page.click('#projectApprovalViewWorkflow');
      assert.equal(await page.$eval('#projectApprovalWorkflow', node => node.hidden), false);
      assert.equal(await page.$eval('#projectApprovalWorkflowReference', node => node.textContent.trim()), 'ETS00000002819');
      assert.deepEqual(
        await page.$$eval('#projectApprovalWorkflowSteps .project-approval-workflow-step', steps => steps.map(step => ({
          title: step.querySelector('strong').textContent.trim(),
          status: step.querySelector('span').textContent.trim()
        }))),
        [
          { title: 'Submitted', status: 'Completed' },
          { title: 'Supervisor Approval', status: 'Pending' },
          { title: 'Timesheet Processing', status: 'Waiting' }
        ]
      );
      await page.click('#projectApprovalWorkflow [data-approval-back]');
      await page.waitForSelector('#projectApprovalWorkflow', {hidden: true});
      assert.equal(await page.$eval('#projectApprovalWorkflow', node => node.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-project-approval-menu')), true);

      const layout = await page.evaluate(() => {
        const card = document.querySelector('.project-approval-card');
        return {
          radius: getComputedStyle(card).borderRadius,
          leftBorder: getComputedStyle(card).borderLeftWidth,
          overflow: getComputedStyle(card).overflow,
          bannerBackground: getComputedStyle(card.querySelector('.project-approval-card-banner')).backgroundImage,
          fieldLabels: [...card.querySelectorAll('.approval-card-details dt')].map(el => el.textContent),
          backFile: new URL(document.querySelector('.project-back').href).pathname.split('/').slice(-2).join('/'),
          backScope: new URL(document.querySelector('.project-back').href).searchParams.get('scope'),
          phoneOverflow: document.querySelector('.phone-container').scrollWidth > document.querySelector('.phone-container').clientWidth + 1
        };
      });
      assert.equal(layout.radius, '18px');
      assert.equal(layout.leftBorder, '1px');
      assert.equal(layout.overflow, 'hidden');
      assert.match(layout.bannerBackground, /linear-gradient/);
      assert.deepEqual(layout.fieldLabels, ['Timesheet Date', 'Normal Hours', 'OT Hours']);
      assert.equal(layout.backFile, 'project-task/index.html');
      assert.equal(layout.backScope, 'team');
      assert.equal(layout.phoneOverflow, false);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        assert.equal(await page.$eval('.project-approval-card', node => node.scrollWidth > node.clientWidth + 1), false);
      }
    }

    for (const action of ['approve', 'reject', 'resubmit', 'cancel']) await checkSubmission(page, action, action === 'resubmit');
    await page.goto(pageUrl('light'));
    await page.click('#projectApprovalSelectAll');
    await page.click('.pending-selection-bar [data-decision="approve"]');
    await page.waitForSelector('#projectTimesheetApprovalList .project-activities-empty');
    await page.reload();
    assert.equal(await page.$eval('#projectTimesheetApprovalCount', node => node.textContent), '0 Records');
    assert.equal(await page.$eval('#projectApprovalSelectAll', node => node.disabled), true);
    await page.goto(new URL('../index.html?scope=team', pageUrl('light')).href);
    assert.equal(await page.$eval('.team-pending-approval-count', el => el.textContent), '0');
    assert.deepEqual(faults, []);
    console.log('PASS: Project & Task Pending Approval contains Timesheet requests only.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
