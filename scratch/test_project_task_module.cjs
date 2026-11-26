const assert = require('node:assert/strict');
const path = require('node:path');
const puppeteer = require('puppeteer');

const fileUrl = file => `file:///${path.resolve(__dirname, '..', file).replace(/\\/g, '/')}`;
async function screenshotAfterTransitions(page, file) {
  if (process.env.SKIP_SCREENSHOTS === '1') return;
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.constructor.name === 'CSSTransition').map(animation => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: path.resolve(__dirname, file) });
}
const expected = {
  individual: [['Work Plan', 'work-plan.html'], ['Time Sheet', 'time-sheet.html'], ['History', 'history.html']],
  team: [
    ['Pending Approval', 'pending-approval.html'],
    ['Work Assignment', 'work-assignment.html'],
    ['Timesheet Highlight', 'timesheet-highlight.html']
  ]
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));
    for (const [theme, app] of [['dark', 'appdark.html'], ['light', 'applight.html']]) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(fileUrl(app), { waitUntil: 'domcontentloaded' });
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.evaluate(() => {
        const row = [...document.querySelectorAll('.explore-row')].find(node => node.querySelector('h4')?.textContent.trim() === 'Project & Task');
        row.click();
      })]);
      await page.waitForFunction(() => location.pathname.endsWith('/modules/project-task/index.html'), { timeout: 2000 });
      assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Project & Task Dashboard');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      for (const scope of ['individual', 'team']) {
        await page.click(`#projectTab-${scope}`);
        assert.equal(await page.$eval(`#projectTab-${scope}`, node => node.getAttribute('aria-selected')), 'true');
        const linkSelector = scope === 'team'
          ? '#projectTeamPendingApproval, #projectPanel-team .project-option'
          : '#projectPanel-individual .project-option';
        const visibleOptions = await page.$$eval(linkSelector, nodes => nodes.map(node => [
          node.querySelector(node.id === 'projectTeamPendingApproval' ? '.team-pending-approval-title' : '.project-option-title').textContent,
          new URL(node.href).pathname.split('/').pop()
        ]));
        assert.deepEqual(visibleOptions, expected[scope]);
        if (scope === 'team') {
          assert.equal(await page.$eval('#projectTeamOptions', node => node.childElementCount), 2);
          assert.equal(await page.$eval('#projectTeamOptions + #projectCurrentProjectTitle', node => node.id), 'projectCurrentProjectTitle');
          assert.equal(await page.$eval('#projectCurrentProjectTitle + #projectTeamProjectOverview', node => node.id), 'projectTeamProjectOverview');
          assert.deepEqual(
            await page.$$eval('#projectTeamProjectOverview thead th', cells => cells.map(cell => cell.textContent.trim())),
            ['Project', 'Deadline', 'Completion %', 'Pending Tasks']
          );
          assert.deepEqual(
            await page.$$eval('#projectTeamProjectOverview tbody tr', rows => rows.map(row => ({
              project: row.querySelector('.project-team-project-name').textContent.trim(),
              deadline: row.querySelector('.project-team-project-deadline').textContent.trim(),
              completion: row.querySelector('.project-team-project-completion').textContent.trim(),
              pending: row.querySelector('.project-team-project-pending').textContent.trim()
            }))),
            [
              { project: 'BANGI BANGALOW', deadline: '01/01/2019', completion: '60%', pending: '1' },
              { project: 'PAYROLL TRAINING', deadline: '31/12/2021', completion: '0%', pending: '2' },
              { project: 'HRDF TRAINING', deadline: '31/12/2021', completion: '0%', pending: '4' },
              { project: 'PROJECT HUMAN', deadline: 'TBC', completion: '0%', pending: '1' },
              { project: 'MOBILE APP FOR TIMESHEET', deadline: '31/12/2017', completion: '67%', pending: '19' },
              { project: 'HR/ESS Project', deadline: '01/01/2011', completion: '80%', pending: '1' },
              { project: 'ISO 9000', deadline: '31/03/2016', completion: '75%', pending: '6' },
              { project: 'KLCC PROJECT', deadline: '31/05/2022', completion: '90%', pending: '6' },
              { project: 'KOTA KEMUNING SEMI-D', deadline: '01/01/2017', completion: '55%', pending: '1' },
              { project: 'PEOPLE MOBILE PROJECT', deadline: 'TBC', completion: '0%', pending: '2' }
            ]
          );
          assert.match(await page.$eval('#projectTeamProjectOverview thead', node => getComputedStyle(node).backgroundImage), /linear-gradient/);
          assert.equal(await page.$$eval('#projectTeamProjectOverview progress', nodes => nodes.length), 0);
          assert.equal(await page.$$eval('#projectTeamProjectOverview tbody tr[role="button"][tabindex="0"]', rows => rows.length), 10);
          const overviewBodyColors = await page.evaluate(() => {
            const probe = document.createElement('span');
            probe.style.color = 'var(--purple-text)';
            document.body.appendChild(probe);
            const purple = getComputedStyle(probe).color;
            probe.remove();
            return {
              colors: [...new Set([...document.querySelectorAll('#projectTeamProjectOverview tbody td')].map(cell => getComputedStyle(cell).color))],
              purple
            };
          });
          assert.equal(overviewBodyColors.colors.length, 1);
          assert.notEqual(overviewBodyColors.colors[0], overviewBodyColors.purple);
          await page.click('#projectTeamProjectOverview tbody tr:nth-child(5)');
          assert.equal(await page.$eval('#projectTeamProjectDetails', node => node.hidden), false);
          assert.equal(await page.$eval('#projectTeamProjectDetailsTitle', node => node.textContent.trim()), 'Pending Tasks for Project');
          assert.equal(await page.$eval('#projectTeamProjectDetailsSubtitle', node => node.textContent.trim()), 'MOBILE APP FOR TIMESHEET · 19 Tasks');
          assert.deepEqual(
            await page.$$eval('#projectTeamPendingTaskTable thead th', cells => cells.map(cell => cell.textContent.trim())),
            ['Task', 'Employee', 'Deadline', 'Completion %']
          );
          assert.match(await page.$eval('#projectTeamPendingTaskTable thead', node => getComputedStyle(node).backgroundImage), /linear-gradient/);
          assert.equal(await page.$$eval('#projectTeamPendingTaskTable tbody tr:not(.project-team-task-empty-row)', rows => rows.length), 19);
          const taskBodyColors = await page.evaluate(() => {
            const probe = document.createElement('span');
            probe.style.color = 'var(--purple-text)';
            document.body.appendChild(probe);
            const purple = getComputedStyle(probe).color;
            probe.remove();
            return {
              colors: [...new Set([...document.querySelectorAll('#projectTeamPendingTaskTable tbody td')].map(cell => getComputedStyle(cell).color))],
              purple
            };
          });
          assert.equal(taskBodyColors.colors.length, 1);
          assert.notEqual(taskBodyColors.colors[0], taskBodyColors.purple);
          assert.equal(
            await page.$$eval('#projectTeamPendingTaskTable tbody tr', rows => rows.every(row => {
              const cells = [...row.cells];
              return cells.length === 4 && cells.every(cell => cell.textContent.trim().length > 0);
            })),
            true
          );
          assert.deepEqual(
            await page.$eval('#projectTeamPendingTaskTable', table => {
              const header = table.querySelector('th');
              const task = table.querySelector('.project-team-task-title');
              const deadline = table.querySelector('.project-team-task-deadline');
              const completionHeader = table.querySelector('th:nth-child(4)');
              const scroll = table.parentElement;
              return {
                headerFontSize: getComputedStyle(header).fontSize,
                bodyFontSize: getComputedStyle(task).fontSize,
                deadlineFontSize: getComputedStyle(deadline).fontSize,
                deadlineWhiteSpace: getComputedStyle(deadline).whiteSpace,
                completionOverflowWrap: getComputedStyle(completionHeader).overflowWrap,
                completionLines: completionHeader.querySelectorAll('span').length,
                horizontalOverflow: scroll.scrollWidth > scroll.clientWidth + 1
              };
            }),
            {
              headerFontSize: '9.5px',
              bodyFontSize: '9.5px',
              deadlineFontSize: '9px',
              deadlineWhiteSpace: 'nowrap',
              completionOverflowWrap: 'normal',
              completionLines: 2,
              horizontalOverflow: false
            }
          );
          assert.equal(await page.$$eval('#projectTeamProjectDetails .project-approval-detail-section', nodes => nodes.length), 0);
          assert.deepEqual(
            await page.$$eval('#projectTeamPendingTaskTable tbody tr', rows => [rows[0], rows.at(-1)].map(row => ({
              task: row.querySelector('.project-team-task-title').textContent.trim(),
              employee: row.querySelector('.project-team-task-employee').textContent.trim(),
              deadline: row.querySelector('.project-team-task-deadline').textContent.trim(),
              completion: row.querySelector('.project-team-task-completion').textContent.trim()
            }))),
            [
              { task: 'RISDA HR DEMO', employee: 'Farhan binti rahmat', deadline: '25/02/2016', completion: '0' },
              { task: 'Test', employee: 'Asmawi idris', deadline: '31/01/2023', completion: '0' }
            ]
          );
          assert.equal(await page.$$eval('#projectTeamProjectDetails .project-approval-details-footer', nodes => nodes.length), 0);
          for (const width of [360, 390, 450]) {
            await page.setViewport({ width, height: 950 });
            assert.equal(await page.$eval('#projectTeamProjectDetails .project-approval-details-sheet', node => node.scrollWidth > node.clientWidth + 1), false);
            assert.equal(await page.$eval('.project-team-task-table-scroll', node => node.scrollWidth > node.clientWidth + 1), false);
          }
          await page.click('#projectTeamProjectDetails [data-close-project-detail]');
          assert.equal(await page.$eval('#projectTeamProjectDetails', node => node.hidden), true);
          assert.equal(await page.evaluate(() => document.activeElement.matches('#projectTeamProjectOverview tbody tr:nth-child(5)')), true);
          await page.focus('#projectTeamProjectOverview tbody tr:first-child');
          await page.keyboard.press('Enter');
          assert.equal(await page.$eval('#projectTeamProjectDetailsSubtitle', node => node.textContent.trim()), 'BANGI BANGALOW · 1 Task');
          await page.keyboard.press('Escape');
          assert.equal(await page.$eval('#projectTeamProjectDetails', node => node.hidden), true);
          assert.equal(await page.evaluate(() => document.activeElement.matches('#projectTeamProjectOverview tbody tr:first-child')), true);
          for (let rowIndex = 1; rowIndex <= 10; rowIndex += 1) {
            await page.$eval(`#projectTeamProjectOverview tbody tr:nth-child(${rowIndex})`, row => row.click());
            const taskState = await page.evaluate(() => {
              const rows = [...document.querySelectorAll('#projectTeamPendingTaskList tr')];
              return {
                count: rows.length,
                emptyRows: rows.filter(row => row.classList.contains('project-team-task-empty-row')).length,
                completeRows: rows.every(row => row.cells.length === 4 && [...row.cells].every(cell => cell.textContent.trim().length > 0))
              };
            });
            assert.ok(taskState.count > 0);
            assert.equal(taskState.emptyRows, 0);
            assert.equal(taskState.completeRows, true);
            await page.$eval('#projectTeamProjectDetails [data-close-project-detail]', button => button.click());
          }
        } else {
          assert.equal(await page.$$eval('#projectPanel-individual .project-dashboard-status-card', cards => cards.length), 4);
          assert.equal(await page.$$eval('#projectPanel-individual .project-calendar-day', days => days.length), 35);
        }
        assert.equal(await page.$$eval('.project-option p', nodes => nodes.length), 0);
        for (let index = 0; index < expected[scope].length; index++) {
          const [title, file] = expected[scope][index];
          const target = scope === 'individual'
            ? `#projectPanel-${scope} .project-option:nth-child(${index + 1})`
            : file === 'pending-approval.html'
              ? '#projectTeamPendingApproval'
              : `#projectTeamOptions .project-option:nth-child(${index})`;
          await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(target)]);
          await page.waitForFunction(file => location.pathname.endsWith('/' + file), {}, file);
          await page.waitForSelector('h1');
          assert.equal(await page.$eval('h1', node => node.textContent.trim()), title);
          assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
          if (file === 'work-plan.html') assert.ok(await page.$('#workPlanForm'));
          else if (file === 'work-assignment.html') assert.ok(await page.$('#workAssignmentForm'));
          else if (file === 'time-sheet.html') assert.ok(await page.$('#timesheetForm'));
          else if (file === 'history.html') {
            assert.ok(await page.$('#workPlanHistoryPanel'));
            assert.equal(await page.$$eval('.project-history-tab', tabs => tabs.length), 2);
          }
          else if (file === 'pending-approval.html') assert.equal(await page.$$eval('.project-approval-card', cards => cards.length), 3);
          await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('.project-back')]);
          await page.waitForSelector(`#projectTab-${scope}[aria-selected="true"]`);
        }
      }
      await page.focus('#projectTab-team');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.$eval('#projectTab-individual', node => node.getAttribute('aria-selected')), 'true');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval('#projectTab-team', node => node.getAttribute('aria-selected')), 'true');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#projectTab-team', node => node.getAttribute('aria-selected')), 'true');
      const otherTheme = theme === 'dark' ? 'light' : 'dark';
      await page.click(`[data-set-theme="${otherTheme}"]`);
      await page.waitForFunction(expectedTheme => document.documentElement.dataset.theme === expectedTheme, {}, otherTheme);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#projectTeamPendingApproval')]);
      await page.waitForSelector('.project-back');
      assert.equal(await page.$eval('html', node => node.dataset.theme), otherTheme);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('.project-back')]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('html', node => node.dataset.theme), otherTheme);
      await page.click(`[data-set-theme="${theme}"]`);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        assert.equal(await page.$eval('#projectTeamProjectOverview', node => node.scrollWidth > node.clientWidth + 1), false);
        await screenshotAfterTransitions(page, `project_task_team_${theme}_${width}.png`);
      }
      await page.click('#projectTab-individual');
      await screenshotAfterTransitions(page, `project_task_individual_${theme}.png`);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('.project-back')]);
      await page.waitForFunction(app => location.pathname.endsWith('/' + app), {}, app);
      console.log(`${theme}: home navigation, scope switching, dashboard entries, back navigation, keyboard controls and mobile widths passed.`);
    }
    assert.deepEqual(faults, []);
    console.log('Project & Task module passed without browser script errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
