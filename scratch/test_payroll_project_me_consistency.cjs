const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fileUrl = file => pathToFileURL(path.join(root, file)).href;

(async () => {
  const failures = [];
  const check = async (name, fn) => {
    try { await fn(); }
    catch (error) { failures.push(`${name}: ${error.message}`); }
  };
  let browser;
  try {
    await check('shared identity is Sarah EBB01', () => {
      for (const file of ['me.html', 'bonus-history.html', 'salary-history.html']) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        assert.match(source, /Sarah Jenkins/);
        assert.doesNotMatch(source, /Farhan binti rahmat|EBB12/);
      }
      const payroll = fs.readFileSync(path.join(root, 'js/payroll/payroll-config.js'), 'utf8');
      assert.doesNotMatch(payroll, /Farhan_Binti_Rahmat/);
    });

    await check('all favourite targets resolve', () => {
      const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
      const routeKeys = new Set([...source.matchAll(/^\s*'([^']+)'\s*:/gm)].map(match => match[1]));
      const targets = [...source.matchAll(/target:\s*'([^']+)'/g)].map(match => match[1]);
      const missing = targets.filter(target => !routeKeys.has(target));
      assert.deepEqual(missing, []);
    });

    await check('team uses valid home navigation and shared approval color', () => {
      const source = fs.readFileSync(path.join(root, 'team.html'), 'utf8');
      assert.doesNotMatch(source, /home-v[12]\.html/);
      assert.match(source, /pq_team_approval_decisions/);
      assert.match(source, /#7c3aed/);
    });

    await check('history handlers mutate state', () => {
      const payroll = fs.readFileSync(path.join(root, 'js/payroll/payroll-history.js'), 'utf8');
      const project = fs.readFileSync(path.join(root, 'js/project-task/project-task-history.js'), 'utf8');
      assert.doesNotMatch(payroll, /action selected/);
      assert.doesNotMatch(project, /action selected/);
      assert.doesNotMatch(project, /\.map\(status => unique\.find/);
      assert.match(project, /pq_project_timesheet_draft/);
    });

    await check('employee ID blocks use hash directly after name', () => {
      const components = fs.readFileSync(path.join(root, 'js/components.js'), 'utf8');
      const me = fs.readFileSync(path.join(root, 'me.html'), 'utf8');
      const bonus = fs.readFileSync(path.join(root, 'bonus-history.html'), 'utf8');
      assert.match(components, /drawer-user-name[^]*drawer-employee-id[^]*EBB01/);
      assert.match(me, /me-emp-fullname[^]*me-emp-code[^]*EBB01/);
      assert.match(bonus, /bonus-user-name[^]*employee-id-standard[^]*EBB01/);
    });

    await check('EA print calls print and updates selected document year', () => {
      const source = fs.readFileSync(path.join(root, 'modules/payroll/options/ea-form.html'), 'utf8');
      assert.match(source, /eaFormPreview[^]*dataset\.year/);
      assert.match(source, /window\.print\(\)/);
    });

    await check('salary and bonus controls create real output', () => {
      for (const file of ['bonus-history.html', 'salary-history.html']) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        assert.match(source, /new Blob/);
        assert.match(source, /URL\.createObjectURL/);
        assert.match(source, /window\.print\(\)/);
        assert.match(source, /openAuditLog/);
        assert.doesNotMatch(source, /onclick="alert\(/);
      }
    });

    await check('filter sheets use shared titles and dimensions', () => {
      const pendingJs = fs.readFileSync(path.join(root, 'js/pending-approval-filter.js'), 'utf8');
      const pendingCss = fs.readFileSync(path.join(root, 'css/pending-approval-filter.css'), 'utf8');
      const project = fs.readFileSync(path.join(root, 'modules/project-task/options/history.html'), 'utf8');
      const projectCss = fs.readFileSync(path.join(root, 'css/project-task.css'), 'utf8');
      const tax = fs.readFileSync(path.join(root, 'modules/payroll/options/tax-relief.html'), 'utf8');
      const taxJs = fs.readFileSync(path.join(root, 'js/payroll/team-tax-relief.js'), 'utf8');
      assert.match(pendingJs, /<h2 id="\$\{id\}-title">Filter<\/h2>/);
      assert.match(pendingJs, /fa-rotate-left/);
      assert.match(pendingCss, /approval-filter-fields[^]*min-height:\s*48px[^]*border-radius:\s*16px/);
      assert.doesNotMatch(project, /Filter History|data-standard-filter-ready/);
      assert.match(projectCss, /project-history-filter-field select[^]*min-height:\s*48px[^]*border-radius:\s*16px/);
      assert.match(tax, />Apply Filter<\/button>/);
      assert.match(taxJs, /appliedFilters\.startDate/);
      assert.match(taxJs, /appliedFilters\.endDate/);
    });
    browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.setDefaultTimeout(5000);

    await check('salary and bonus export and audit are observable', async () => {
      for (const file of ['bonus-history.html', 'salary-history.html']) {
        await page.goto(fileUrl(file), { waitUntil: 'domcontentloaded' });
        await page.$eval('.me-options-btn', button => button.click());
        assert.equal(await page.$eval('#historyAuditDialog', node => node.getAttribute('role')), 'dialog');
        const result = await page.evaluate(() => {
          let printed = false; window.print = () => { printed = true; };
          URL.createObjectURL = blob => { window.__blobType = blob.type; return 'blob:mock'; };
          URL.revokeObjectURL = () => {};
          HTMLAnchorElement.prototype.click = function () { window.__download = this.download; };
          triggerExport('PDF'); triggerExport('Excel');
          return { printed, type: window.__blobType, download: window.__download };
        });
        assert.equal(result.printed, true);
        assert.equal(result.type, 'text/csv;charset=utf-8');
        assert.match(result.download, /EBB01_(Bonus|Salary)_History\.csv/);
      }
    });

    await check('filter standard is applied at runtime', async () => {
      await page.goto(fileUrl('modules/payroll/options/pending-approval.html'), { waitUntil: 'domcontentloaded' });
      await page.$eval('#payrollPendingFilterTrigger', button => button.click());
      const pending = await page.$eval('.approval-filter-panel', panel => {
        const input = panel.querySelector('input'); const reset = panel.querySelector('[data-action=reset]'); const style = getComputedStyle(input);
        return { title: panel.querySelector('h2').textContent.trim(), icon: Boolean(reset.querySelector('.fa-rotate-left')), height: style.minHeight, radius: style.borderRadius };
      });
      assert.deepEqual(pending, { title: 'Filter', icon: true, height: '48px', radius: '16px' });
      await page.goto(fileUrl('modules/project-task/options/history.html'), { waitUntil: 'domcontentloaded' });
      const project = await page.$eval('#workPlanHistoryFilterOverlay', overlay => {
        const input = overlay.querySelector('#workPlanFilterTitle'); const style = getComputedStyle(input);
        return { title: overlay.querySelector('h2').textContent.trim(), overdue: Boolean(overlay.querySelector('#workPlanFilterOverdue')), height: style.minHeight, radius: style.borderRadius };
      });
      assert.deepEqual(project, { title: 'Filter', overdue: true, height: '48px', radius: '16px' });
    });
    await check('team approval changes visible queue', async () => {
      await page.goto(fileUrl('team.html'), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.removeItem('pq_team_approval_decisions'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      const before = await page.$$eval('.approval-card', cards => cards.length);
      await page.$eval('.approval-card .btn-approve', button => button.click());
      assert.equal(await page.$$eval('.approval-card', cards => cards.length), before - 1);
      assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('pq_team_approval_decisions'))).length, 1);
    });
    await check('project approval changes pending queue', async () => {
      await page.goto(fileUrl('modules/project-task/options/pending-approval.html'), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.removeItem('pq_project_pending_decisions'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      const before = await page.$$eval('.project-approval-card', cards => cards.length);
      await page.$eval('[data-project-approval-action="approve"]', button => button.click());
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(await page.$$eval('.project-approval-card', cards => cards.length), before - 1);
      assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('pq_project_pending_decisions'))).length, 1);
    });

    await check('project history retains same-status records and real draft', async () => {
      await page.goto(fileUrl('modules/project-task/options/history.html'), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.setItem('pq_project_work_plans', JSON.stringify([
          { id: 'WP-A', title: 'Older submitted plan', status: 'Submitted', scheduleFrom: '2026-10-01', scheduleTo: '2026-10-01', deadline: '2026-10-02' },
          { id: 'WP-B', title: 'Newer submitted plan', status: 'Submitted', scheduleFrom: '2026-10-03', scheduleTo: '2026-10-03', deadline: '2026-10-04' }
        ]));
        localStorage.setItem('pq_project_timesheet_draft', JSON.stringify({ date: '2026-10-02', remark: 'Real draft', activities: [{ title: 'Draft activity', timeFrom: '09:00', timeTo: '10:00' }] }));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.projectHistoryReady === 'true');
      const text = await page.$eval('#workPlanHistoryList', node => node.textContent);
      assert.match(text, /Older submitted plan/);
      assert.match(text, /Newer submitted plan/);
      assert.match(await page.$eval('#timesheetHistoryList', node => node.textContent), /Draft/);
    });

    await check('payroll and project history actions change rendered state', async () => {
      await page.goto(fileUrl('modules/payroll/options/history.html'), { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#payrollHistoryList [data-history-action=cancel]');
      const payrollRef = await page.$eval('#payrollHistoryList [data-history-action=cancel]', button => button.closest('.history-card-item').dataset.reference);
      await page.$eval('#payrollHistoryList [data-history-action=cancel]', button => button.click());
      assert.equal(await page.$eval('.history-card-item[data-reference="' + payrollRef + '"]', card => card.dataset.status), 'cancelled');
      await page.goto(fileUrl('modules/project-task/options/history.html'), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.setItem('pq_project_timesheet_draft', JSON.stringify({ date: '2026-10-04', remark: 'Discard me', activities: [] })));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.projectHistoryReady === 'true');
      await page.$eval('#timesheetHistoryList [data-record-id="TS-DRAFT-LOCAL"] .project-history-card-action-danger', button => button.click());
      assert.equal(await page.$('#timesheetHistoryList [data-record-id="TS-DRAFT-LOCAL"]'), null);
      assert.equal(await page.evaluate(() => localStorage.getItem('pq_project_timesheet_draft')), null);
    });
    await check('calendar renders October 2027 accurately', async () => {
      await page.goto(fileUrl('calendar.html'), { waitUntil: 'domcontentloaded' });
      const result = await page.evaluate(() => {
        filterState.year = '2027'; filterState.month = 'October'; renderCalendar();
        const cells = [...document.querySelectorAll('.cal-day-cell:not(.other-month)')];
        cells.at(-1).click();
        return { count: cells.length, last: cells.at(-1).querySelector('.cal-date-num').textContent.trim(), title: document.getElementById('sheetDateTitle').textContent };
      });
      assert.deepEqual(result, { count: 31, last: '31', title: 'Sunday, Oct 31, 2027' });
    });

    await check('query theme persists after switch and reload', async () => {
      await page.goto(fileUrl('me.html') + '?theme=dark', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => setTheme('light'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('html', node => node.dataset.theme), 'light');
    });

    await check('change request tracks toggles and submitted history', async () => {
      await page.goto(fileUrl('change-request.html'), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => editFamilyRecord('SITI AISHAH BINTI FARHAN'));
      assert.equal(await page.$eval('#input_fam_name', node => node.value), 'SITI AISHAH BINTI FARHAN');
      await page.$eval('#handicap', node => { node.checked = !node.checked; node.dispatchEvent(new Event('change', { bubbles: true })); });
      assert.match(await page.$eval('#draftTitleText', node => node.textContent), /1 Field/);
      const before = await page.$$eval('#changeRequestHistoryList > .change-history-item', rows => rows.length);
      await page.evaluate(() => confirmSubmitRequest());
      assert.equal(await page.$$eval('#changeRequestHistoryList > .change-history-item', rows => rows.length), before + 1);
    });

    await check('EA print is observable', async () => {
      await page.goto(fileUrl('modules/payroll/options/ea-form.html'), { waitUntil: 'domcontentloaded' });
      const called = await page.evaluate(() => { let printed = false; window.print = () => { printed = true; }; openAndPrintEA(); return printed; });
      assert.equal(called, true);
    });
  } finally {
    if (browser) await browser.close();
  }
  if (failures.length) throw new Error(`Consistency regressions:\n- ${failures.join('\n- ')}`);
  console.log('PASS: Payroll, Project, Me, Calendar, Team and shared consistency regressions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
