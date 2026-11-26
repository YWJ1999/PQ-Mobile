const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pageUrl = (file, query = '') => pathToFileURL(path.join(root, file)).href + query;

const dashboards = [
  {
    name: 'Attendance',
    url: pageUrl('modules/attendance/options/team.html'),
    prepare: async () => {},
    expectedCount: async page => page.evaluate(() => String(staffDatabase.pending_approval.length + staffDatabase.attendance_verification.length) + ' Tasks'),
    preserve: async page => {
      assert.equal(
        await page.$eval('.team-action-required-items', node => node.textContent.includes('Attendance Verification')),
        true,
        'Attendance Verification must remain in Quick Action'
      );
    }
  },
  {
    name: 'Claims',
    url: pageUrl('modules/claims/index.html'),
    prepare: async page => {
      await page.waitForFunction(() => window.ClaimsEngine);
      await page.evaluate(() => window.ClaimsEngine.switchClaimScope('team'));
    },
    expectedCount: '11 Tasks',
    preserve: async page => {
      assert.ok(await page.$('#managerOptionsGrid'), 'Claims team quick options must remain');
    }
  },
  {
    name: 'Leave',
    url: pageUrl('leave.html', '?mode=team'),
    prepare: async page => {
      await page.waitForSelector('#hubSectionTeam', { visible: true });
    },
    expectedCount: async page => page.evaluate(() => {
      const total = [...document.querySelectorAll('#teamApprovalsListContainer .approval-request-card')]
        .filter(card => card.dataset.handled !== 'true').length;
      return String(total) + ' Tasks';
    }),
    preserve: async page => {
      assert.equal(await page.$('#teamLeaveOverviewHeader, #teamOnLeaveMetric, #teamUpcomingMetric'), null);
      assert.ok(await page.$('#hubSectionTeam .team-action-required-card + #leaveTeamCalendarSectionTitle'));
    }
  },
  {
    name: 'Payroll',
    url: pageUrl('modules/payroll/index.html', '?scope=team'),
    prepare: async page => {
      await page.waitForSelector('#scopeTeamSection', { visible: true });
    },
    expectedCount: '20 Tasks',
    preserve: async page => {
      assert.ok(await page.$('#teamTaxReliefQuickAction'), 'Payroll Tax Relief quick action must remain');
    }
  },
  {
    name: 'Project & Task',
    url: pageUrl('modules/project-task/index.html', '?scope=team'),
    prepare: async page => {
      await page.waitForSelector('#projectPanel-team:not([hidden])');
    },
    expectedCount: '3 Tasks',
    preserve: async page => {
      assert.deepEqual(
        await page.$$eval('#projectTeamOptions .project-option-title', nodes => nodes.map(node => node.textContent.trim())),
        ['Work Assignment', 'Timesheet Highlight'],
        'Project & Task options must remain'
      );
    }
  }
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 950 });

    for (const dashboard of dashboards) {
      await page.goto(dashboard.url, { waitUntil: 'domcontentloaded' });
      await dashboard.prepare(page);

      assert.equal(
        await page.$$eval('.team-action-required-card', nodes => nodes.length),
        1,
        dashboard.name + ' must have one Action Required outer card'
      );
      assert.equal(
        await page.$eval('.team-action-required-title', node => node.textContent.trim()),
        'Action Required',
        dashboard.name + ' outer card title is incorrect'
      );
      assert.equal(
        await page.$eval('.team-action-required-badge', node => node.textContent.replace(/\s+/g, ' ').trim()),
        typeof dashboard.expectedCount === 'function' ? await dashboard.expectedCount(page) : dashboard.expectedCount,
        dashboard.name + ' task badge is incorrect'
      );
      assert.equal(
        await page.$$eval('.team-action-required-card .team-pending-approval-action', nodes => nodes.length),
        1,
        dashboard.name + ' Pending Approval must be inside Action Required'
      );
      assert.equal(
        await page.$eval('.team-pending-approval-title', node => node.textContent.trim()),
        'Pending Approval',
        dashboard.name + ' pending title is incorrect'
      );

      const styles = await page.$eval('.team-action-required-card', node => {
        const outer = getComputedStyle(node);
        const inner = getComputedStyle(node.querySelector('.team-pending-approval-action'));
        const icon = node.querySelector('.team-pending-approval-icon').getBoundingClientRect();
        return {
          outerRadius: outer.borderRadius,
          outerPadding: outer.padding,
          innerRadius: inner.borderRadius,
          innerPadding: inner.padding,
          iconWidth: icon.width,
          iconHeight: icon.height
        };
      });

      assert.equal(styles.outerRadius, '20px', dashboard.name + ' outer radius must match');
      assert.equal(styles.outerPadding, '16px', dashboard.name + ' outer padding must match');
      assert.equal(styles.innerRadius, '16px', dashboard.name + ' inner radius must match');
      assert.equal(styles.innerPadding, '14px 16px', dashboard.name + ' inner padding must match');
      assert.equal(styles.iconWidth, 40, dashboard.name + ' pending icon width must match');
      assert.equal(styles.iconHeight, 40, dashboard.name + ' pending icon height must match');
      assert.equal(
        await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1),
        false,
        dashboard.name + ' Team Dashboard must not overflow horizontally'
      );

      await dashboard.preserve(page);

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      const lightStyles = await page.$eval('.team-action-required-card', node => {
        const outer = getComputedStyle(node);
        const inner = getComputedStyle(node.querySelector('.team-pending-approval-action'));
        return {
          outerRadius: outer.borderRadius,
          outerPadding: outer.padding,
          innerRadius: inner.borderRadius,
          innerPadding: inner.padding
        };
      });
      assert.deepEqual(lightStyles, {
        outerRadius: '20px',
        outerPadding: '16px',
        innerRadius: '16px',
        innerPadding: '14px 16px'
      }, dashboard.name + ' light theme must keep the shared card geometry');
    }

    console.log('All Team Pending Approval cards match the shared Action Required design.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
