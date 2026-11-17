const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const fileUrl = (file, theme) => pathToFileURL(path.join(root, file)).href + '?theme=' + theme;
async function fill(page, id, value) {
  await page.$eval('#' + id, (input, next) => {
    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function screenshot(page, name, bottom = false) {
  if (process.env.SKIP_SCREENSHOTS === '1') return;
  await page.mouse.move(0, 0);
  await page.$eval('.project-task-content', (node, atBottom) => { node.scrollTop = atBottom ? node.scrollHeight : 0; }, bottom);
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.constructor.name === 'CSSTransition').map(animation => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: path.join(__dirname, name + '.png') });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(fileUrl('modules/project-task/options/work-plan.html', theme), { waitUntil: 'domcontentloaded' });
      assert.ok(await page.$('#workPlanForm'), 'Work Plan must contain the requested form');
      await page.evaluate(() => ['pq_project_work_plans', 'pq_project_timesheets', 'pq_project_timesheet_draft'].forEach(key => localStorage.removeItem(key)));
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      await page.click('#submitWorkPlan');
      assert.equal(await page.evaluate(() => localStorage.getItem('pq_project_work_plans')), null);
      await fill(page, 'workPlanTitle', 'HCM release plan');
      await fill(page, 'workPlanDescription', 'Prepare and verify the next release.');
      await page.select('#workPlanProject', 'Project Alpha (HCM Rebrand)');
      await fill(page, 'workPlanMilestone', 'Release 1');
      await fill(page, 'workPlanScheduleFrom', '2026-10-02');
      await fill(page, 'workPlanScheduleTo', '2026-10-01');
      await fill(page, 'workPlanDeadline', '2026-10-05');
      await page.click('#submitWorkPlan');
      assert.equal(await page.evaluate(() => localStorage.getItem('pq_project_work_plans')), null, 'Reversed schedule must be rejected');
      await fill(page, 'workPlanScheduleTo', '2026-10-04');
      await page.select('#workPlanTaskCategory', 'Development');
      await page.select('#workPlanTask', 'System Deployment');
      await fill(page, 'workPlanPriority', '2');
      await fill(page, 'workPlanAllocatedHours', '16.5');
      await fill(page, 'workPlanRemarks', 'Coordinate with the release team.');
      const files = await page.$('#workPlanFiles');
      await files.uploadFile(path.join(root, 'AGENTS.md'), path.join(root, 'DESIGN.md'));
      assert.equal(await page.$$eval('.attachment-upload-item', nodes => nodes.length), 2);
      await page.click('.attachment-upload-remove');
      assert.equal(await page.$$eval('.attachment-upload-item', nodes => nodes.length), 1);
      assert.equal(await page.$eval('#workPlanCamera', node => node.getAttribute('capture')), 'environment');
      await page.click('#submitWorkPlan');
      const plans = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_project_work_plans')));
      assert.ok(plans, JSON.stringify({ faults, fields: await page.$$eval('#workPlanForm input, #workPlanForm textarea, #workPlanForm select', nodes => nodes.filter(node => !node.validity.valid).map(node => ({ id: node.id, value: node.value, error: node.validationMessage }))), feedback: await page.$eval('#workPlanFeedback', node => node.textContent) }));
      assert.equal(plans.length, 1);
      assert.equal(plans[0].title, 'HCM release plan');
      assert.equal(plans[0].allocatedHours, 16.5);
      assert.equal(plans[0].attachments[0].name, 'DESIGN.md');
      assert.match(await page.$eval('#workPlanFeedback', node => node.textContent), /saved/i);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        await screenshot(page, `project_work_plan_${theme}_${width}`);
      }
      await screenshot(page, `project_work_plan_${theme}_bottom`, true);

      await page.goto(fileUrl('modules/project-task/options/time-sheet.html', theme), { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#normalWorkHours', node => node.textContent), '0.00 Hours');
      await page.click('#submitTimesheet');
      assert.equal(await page.evaluate(() => localStorage.getItem('pq_project_timesheets')), null);
      await fill(page, 'timesheetDate', '2026-10-02');
      await fill(page, 'timesheetRemark', 'Release preparation');
      await page.click('#addWorkActivity');
      await fill(page, 'activityTitle', '<img src=x onerror=alert(1)> Release testing');
      await fill(page, 'activityDescription', 'Run the release checklist');
      await page.select('#activityProject', 'Project Alpha (HCM Rebrand)');
      await page.select('#activityTask', 'System Deployment');
      await fill(page, 'activityTimeFrom', '08:30');
      await fill(page, 'activityTimeTo', '08:30');
      await page.click('#saveWorkActivity');
      assert.equal(await page.$eval('#timesheet-entry-view', node => node.hidden), false, 'Zero length activity must be rejected');
      await fill(page, 'activityTimeTo', '12:00');
      await fill(page, 'activityCompletion', '25');
      await page.click('#saveWorkActivity');
      assert.equal(await page.$$eval('.project-activity-item', nodes => nodes.length), 1);
      assert.equal(await page.$$eval('.project-activity-item img', nodes => nodes.length), 0, 'Activity text must not become markup');
      assert.equal(await page.$eval('#normalWorkHours', node => node.textContent), '3.50 Hours');
      await page.click('#addWorkActivity');
      await fill(page, 'activityTitle', 'Deployment support');
      await page.click('#activityAdhoc');
      await page.click('#activityOvertime');
      await fill(page, 'activityTimeFrom', '22:30');
      await fill(page, 'activityTimeTo', '01:00');
      await fill(page, 'activityCompletion', '50');
      await screenshot(page, `project_timesheet_entry_${theme}`);
      await page.click('#saveWorkActivity');
      assert.equal(await page.$eval('#overtimeHours', node => node.textContent), '2.50 Hours');
      await page.click('[data-edit-activity="0"]');
      await fill(page, 'activityTimeTo', '13:00');
      await page.click('#cancelWorkActivity');
      assert.equal(await page.$eval('#normalWorkHours', node => node.textContent), '3.50 Hours', 'Cancelled edits must preserve the item');
      await page.click('[data-edit-activity="0"]');
      await fill(page, 'activityTitle', 'Release testing');
      await fill(page, 'activityTimeTo', '13:00');
      await page.click('#saveWorkActivity');
      assert.equal(await page.$eval('#normalWorkHours', node => node.textContent), '4.50 Hours');
      await page.click('[data-delete-activity="1"]');
      assert.equal(await page.$eval('#overtimeHours', node => node.textContent), '0.00 Hours');
      await page.click('#saveTimesheetDraft');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#timesheetRemark', node => node.value), 'Release preparation');
      assert.equal(await page.$eval('#normalWorkHours', node => node.textContent), '4.50 Hours');
      assert.equal(await page.$$eval('.project-activity-item', nodes => nodes.length), 1);
      await page.click('.project-activity-details-toggle');
      assert.match(await page.$eval('.project-activity-details', node => node.textContent), /Completion.*25%/s);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        await screenshot(page, `project_timesheet_${theme}_${width}`);
      }
      await screenshot(page, `project_timesheet_${theme}_bottom`, true);
      await page.locator('#submitTimesheet').click();
      await page.waitForFunction(() => document.querySelector('#timesheetFeedback').textContent === 'Timesheet saved.');
      const sheets = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_project_timesheets')));
      assert.equal(sheets.length, 1);
      assert.equal(sheets[0].date, '2026-10-02');
      assert.equal(sheets[0].normalMinutes, 270);
      assert.equal(sheets[0].overtimeMinutes, 0);
      assert.equal(sheets[0].activities[0].completion, 25);
      assert.equal(await page.evaluate(() => localStorage.getItem('pq_project_timesheet_draft')), null);
      assert.match(await page.$eval('#timesheetFeedback', node => node.textContent), /saved/i);
      console.log(`${theme}: required fields, schedule validation, attachments, activity add/edit/delete, overnight hours, draft restore and local submission passed.`);
    }
    assert.deepEqual(faults, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
