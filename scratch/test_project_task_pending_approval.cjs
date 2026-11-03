const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = theme => pathToFileURL(
  path.resolve(__dirname, '..', 'modules/project-task/options/pending-approval.html')
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
          date: card.querySelector('[data-field="date"] strong').textContent.trim(),
          normalHours: card.querySelector('[data-field="normal-hours"] strong').textContent.trim(),
          otHours: card.querySelector('[data-field="ot-hours"] strong').textContent.trim(),
          actions: [...card.querySelectorAll('.project-approval-actions button')].map(button => button.textContent.trim())
        }))),
        [
          { name: 'Farhan binti rahmat', employeeId: '#EBB12', status: 'Pending', date: '30 Sep 2026', normalHours: '7.50 hrs', otHours: '1.00 hrs', actions: ['Approve', 'Backup', 'Resubmit', 'Reject'] },
          { name: 'Aina Rahman', employeeId: '#EBB27', status: 'Pending', date: '29 Sep 2026', normalHours: '8.00 hrs', otHours: '0.00 hrs', actions: ['Approve', 'Backup', 'Resubmit', 'Reject'] },
          { name: 'Daniel Lee', employeeId: '#EBB41', status: 'Pending', date: '28 Sep 2026', normalHours: '6.50 hrs', otHours: '2.00 hrs', actions: ['Approve', 'Backup', 'Resubmit', 'Reject'] }
        ]
      );

      assert.equal(await page.$$eval('.project-approval-card-banner .approval-card-checkbox', boxes => boxes.length), 3);
      const actionStyles = await page.$$eval('.project-approval-card:first-of-type .project-approval-actions button', buttons => buttons.map(button => ({
        background: getComputedStyle(button).backgroundColor,
        radius: getComputedStyle(button).borderRadius,
        minHeight: getComputedStyle(button).minHeight
      })));
      assert.equal(new Set(actionStyles.map(style => style.background)).size, 1);
      assert.deepEqual([...new Set(actionStyles.map(style => style.radius))], ['12px']);
      assert.deepEqual([...new Set(actionStyles.map(style => style.minHeight))], ['40px']);
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
      assert.equal(await page.$eval('#projectApprovalDetailsTitle', node => node.textContent.trim()), 'Timesheet Details');
      assert.equal(await page.$eval('#projectApprovalDetailsSubtitle', node => node.textContent.trim()), 'Review timesheet request details');
      assert.deepEqual(
        await page.$$eval('.project-approval-detail-section-title', titles => titles.map(title => title.textContent.trim())),
        ['General', 'Work Activity']
      );
      assert.deepEqual(
        await page.$$eval('#projectApprovalDetailsTable tr', rows => rows.map(row => [
          row.querySelector('th').textContent.trim(),
          row.querySelector('td').textContent.trim()
        ])),
        [
          ['Document Reference', 'ETS00000002819'],
          ['Document Status', 'Pending'],
          ['Employee', 'Farhan binti rahmat #EBB12'],
          ['Timesheet Date', '30 Sep 2026'],
          ['Clock Times', '08:30 – 17:30'],
          ['Normal Work Hours', '7.50 hrs'],
          ['Overtime Hours', '1.00 hrs'],
          ['Remark', 'Client portal sprint progress update.']
        ]
      );
      assert.deepEqual(
        await page.$$eval('#projectApprovalWorkActivityTable tr', rows => rows.map(row => [
          row.querySelector('th').textContent.trim(),
          row.querySelector('td').textContent.trim()
        ])),
        [
          ['Time', '09:00 – 12:00'],
          ['Title', 'Portal accessibility review'],
          ['Project', 'Client Portal Upgrade'],
          ['Task', 'Accessibility Sprint']
        ]
      );
      assert.equal(await page.$eval('#projectApprovalDetailEmployeeName + #projectApprovalDetailEmployeeId', node => node.textContent.trim()), '#EBB12');
      assert.equal(await page.$eval('#projectApprovalCommentsTitle', node => node.textContent.trim()), 'Approver Action Comments');
      assert.equal(await page.$eval('#projectApprovalApproverComments', node => node.tagName), 'INPUT');
      assert.equal(await page.$eval('#projectApprovalApproverComments', node => node.placeholder), 'Add approver action comments (optional)...');
      assert.equal(await page.$$eval('.project-approval-detail-section', sections => sections.length), 2);
      assert.equal(await page.$eval('.project-approval-comments-card', node => getComputedStyle(node).borderRadius), '16px');
      assert.deepEqual(
        await page.$$eval('.project-approval-details-footer button', buttons => buttons.map(button => button.textContent.trim())),
        ['Approve', 'Resubmit', 'Reject']
      );
      assert.deepEqual(
        await page.evaluate(() => {
          const overlayStyle = getComputedStyle(document.querySelector('.project-approval-details-overlay'));
          const sheetStyle = getComputedStyle(document.querySelector('.project-approval-details-sheet'));
          return {
            alignment: overlayStyle.alignItems,
            topRadius: sheetStyle.borderTopLeftRadius,
            bottomRadius: sheetStyle.borderBottomLeftRadius
          };
        }),
        { alignment: 'center', topRadius: '18px', bottomRadius: '18px' }
      );
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.project-approval-details-sheet', node => node.scrollWidth > node.clientWidth + 1), false);
      }
      await page.click('#projectApprovalDetails .detail-popout-close');
      assert.equal(await page.$eval('#projectApprovalDetails', node => node.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-project-approval-menu')), true);
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
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#projectApprovalWorkflow', node => node.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-project-approval-menu')), true);

      const layout = await page.evaluate(() => {
        const card = document.querySelector('.project-approval-card');
        return {
          radius: getComputedStyle(card).borderRadius,
          leftBorder: getComputedStyle(card).borderLeftWidth,
          overflow: getComputedStyle(card).overflow,
          bannerBackground: getComputedStyle(card.querySelector('.project-approval-card-banner')).backgroundImage,
          gridColumns: getComputedStyle(card.querySelector('.project-approval-metrics')).gridTemplateColumns.split(' ').length,
          actionColumns: getComputedStyle(card.querySelector('.project-approval-actions')).gridTemplateColumns.split(' ').length,
          backFile: new URL(document.querySelector('.project-back').href).pathname.split('/').slice(-2).join('/'),
          backScope: new URL(document.querySelector('.project-back').href).searchParams.get('scope'),
          phoneOverflow: document.querySelector('.phone-container').scrollWidth > document.querySelector('.phone-container').clientWidth + 1
        };
      });
      assert.equal(layout.radius, '20px');
      assert.equal(layout.leftBorder, '1px');
      assert.equal(layout.overflow, 'hidden');
      assert.match(layout.bannerBackground, /linear-gradient/);
      assert.equal(layout.gridColumns, 2);
      assert.equal(layout.actionColumns, 4);
      assert.equal(layout.backFile, 'project-task/index.html');
      assert.equal(layout.backScope, 'team');
      assert.equal(layout.phoneOverflow, false);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        assert.equal(await page.$eval('.project-approval-card', node => node.scrollWidth > node.clientWidth + 1), false);
      }
    }

    assert.deepEqual(faults, []);
    console.log('PASS: Project & Task Pending Approval contains Timesheet requests only.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
