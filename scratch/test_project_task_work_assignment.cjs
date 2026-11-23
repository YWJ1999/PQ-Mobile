const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = theme => pathToFileURL(
  path.resolve(__dirname, '..', 'modules/project-task/options/work-assignment.html')
).href + '?theme=' + theme;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));

    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(pageUrl(theme), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.removeItem('pq_project_work_assignments'));

      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.equal(await page.$eval('.project-header h1', node => node.textContent.trim()), 'Work Assignment');
      assert.ok(await page.$('#workAssignmentForm'));
      assert.deepEqual(
        await page.$$eval('#workAssignmentForm .field-label', labels => labels.map(label => label.textContent.replace(/\s+/g, ' ').trim())),
        ['Title *', 'Description *', 'Project', 'Milestone', 'Schedule', 'Deadline *', 'Task Category', 'Main Task', 'Priority', 'Remarks', 'Assignee(s)', 'Upload Attachments']
      );

      assert.deepEqual(
        await page.$$eval('#workAssignmentForm [required]', controls => controls.map(control => control.id)),
        ['workAssignmentTitle', 'workAssignmentDescription', 'workAssignmentDeadline']
      );
      assert.deepEqual(
        await page.$$eval('#workAssignmentProject option', options => options.map(option => option.textContent.trim())),
        ['- Select Project -', 'Project Alpha (HCM Rebrand)', 'Internal System Maintenance', 'Client Portal Upgrade']
      );
      assert.deepEqual(
        await page.$$eval('#workAssignmentTaskCategory option', options => options.map(option => option.textContent.trim())),
        ['- Select Task Category -', 'Development', 'Maintenance', 'Support']
      );
      assert.deepEqual(
        await page.$$eval('#workAssignmentTask option', options => options.map(option => option.textContent.trim())),
        ['- Select Task -', 'System Deployment', 'System Maintenance', 'Portal Upgrade']
      );

      await page.click('#workAssignmentAssigneeTrigger');
      assert.equal(await page.$eval('#workAssignmentAssigneeTrigger', button => button.getAttribute('aria-expanded')), 'true');
      assert.deepEqual(
        await page.$$eval('.project-assignee-option', options => options.map(option => ({
          name: option.querySelector('.project-assignee-name').textContent.trim(),
          employeeId: option.querySelector('.project-assignee-name + .project-assignee-id').textContent.trim()
        }))),
        [
          { name: 'Farhan binti rahmat', employeeId: '#EBB12' },
          { name: 'Aina Rahman', employeeId: '#EBB27' },
          { name: 'Daniel Lee', employeeId: '#EBB41' },
          { name: 'Nur Izzati', employeeId: '#EBB36' }
        ]
      );
      await page.click('#workAssignmentAssignee-EBB12');
      await page.click('#workAssignmentAssignee-EBB27');
      assert.equal(await page.$eval('#workAssignmentAssigneeSummary', node => node.textContent.trim()), '2 assignees selected');
      assert.equal(await page.$eval('#submitWorkAssignment', button => button.textContent.trim()), 'Assign selected (2)');
      assert.deepEqual(
        await page.$$eval('#workAssignmentAssigneeSelection .project-assignee-chip', chips => chips.map(chip => chip.textContent.trim())),
        ['Farhan binti rahmat', 'Aina Rahman']
      );
      await page.click('#workAssignmentAssigneeTrigger');

      await page.evaluate(() => {
        const input = document.getElementById('workAssignmentFiles');
        const transfer = new DataTransfer();
        transfer.items.add(new File(['project brief'], 'project-brief.pdf', { type: 'application/pdf', lastModified: 1 }));
        Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      assert.equal(await page.$eval('#workAssignmentAttachments .attachment-upload-name', node => node.textContent.trim()), 'project-brief.pdf');

      await page.type('#workAssignmentTitle', 'Client portal sprint');
      await page.type('#workAssignmentDescription', 'Complete the client portal accessibility sprint.');
      await page.select('#workAssignmentProject', 'Client Portal Upgrade');
      await page.type('#workAssignmentMilestone', 'Accessibility Sprint');
      await page.$eval('#workAssignmentScheduleFrom', input => { input.value = '2026-10-20'; });
      await page.$eval('#workAssignmentScheduleTo', input => { input.value = '2026-10-05'; });
      await page.$eval('#workAssignmentDeadline', input => { input.value = '2026-10-22'; });
      await page.select('#workAssignmentTaskCategory', 'Development');
      await page.select('#workAssignmentTask', 'Portal Upgrade');
      await page.$eval('#workAssignmentPriority', input => { input.value = '2'; });
      await page.type('#workAssignmentRemarks', 'Review progress during the weekly project meeting.');
      await page.click('#submitWorkAssignment');
      assert.equal(
        await page.$eval('#workAssignmentScheduleTo', input => input.validationMessage),
        'Schedule To must be on or after Schedule From.'
      );
      assert.equal(await page.evaluate(() => localStorage.getItem('pq_project_work_assignments')), null);

      await page.$eval('#workAssignmentScheduleTo', input => {
        input.value = '2026-10-20';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.click('#submitWorkAssignment');
      assert.equal(await page.$eval('#workAssignmentFeedback', node => node.textContent.trim()), 'Work assignment submitted.');
      assert.deepEqual(
        await page.evaluate(() => {
          const record = JSON.parse(localStorage.getItem('pq_project_work_assignments'))[0];
          return {
            title: record.title,
            description: record.description,
            project: record.project,
            milestone: record.milestone,
            scheduleFrom: record.scheduleFrom,
            scheduleTo: record.scheduleTo,
            deadline: record.deadline,
            taskCategory: record.taskCategory,
            task: record.task,
            priority: record.priority,
            remarks: record.remarks,
            assignees: record.assignees,
            attachments: record.attachments.map(file => file.name),
            status: record.status
          };
        }),
        {
          title: 'Client portal sprint',
          description: 'Complete the client portal accessibility sprint.',
          project: 'Client Portal Upgrade',
          milestone: 'Accessibility Sprint',
          scheduleFrom: '2026-10-20',
          scheduleTo: '2026-10-20',
          deadline: '2026-10-22',
          taskCategory: 'Development',
          task: 'Portal Upgrade',
          priority: 2,
          remarks: 'Review progress during the weekly project meeting.',
          assignees: ['EBB12', 'EBB27'],
          attachments: ['project-brief.pdf'],
          status: 'Assigned'
        }
      );

      const styles = await page.evaluate(() => {
        const card = document.querySelector('.form-card');
        const control = document.querySelector('.form-ctrl');
        const upload = document.querySelector('.project-upload-icon');
        const submit = document.getElementById('submitWorkAssignment');
        return {
          cardRadius: getComputedStyle(card).borderRadius,
          controlHeight: getComputedStyle(control).minHeight,
          uploadWidth: getComputedStyle(upload).width,
          uploadRadius: getComputedStyle(upload).borderRadius,
          submitRadius: getComputedStyle(submit).borderRadius,
          overflow: document.querySelector('.phone-container').scrollWidth > document.querySelector('.phone-container').clientWidth + 1
        };
      });
      assert.deepEqual(styles, {
        cardRadius: '22px',
        controlHeight: '44px',
        uploadWidth: '50px',
        uploadRadius: '50%',
        submitRadius: '999px',
        overflow: false
      });
    }

    assert.deepEqual(faults, []);
    console.log('PASS: Team Work Assignment uses the approved form fields, multi-assignee flow, attachments and submission logic.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
