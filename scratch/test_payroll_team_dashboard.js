const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('node:assert/strict');

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewport({ width: 450, height: 950 });

    const url = `file:///${path.resolve(__dirname, '../modules/payroll/index.html').replace(/\\/g, '/')}?scope=team`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#scopeTeamSection', { visible: true });
    assert.equal(await page.$('#dynamic-header .privacy-toggle-icon'), null, 'Payroll header must not show the salary eye icon');
    assert.equal(await page.$('#scopeTeamSection .team-month-nav'), null, 'Month arrows must be replaced by Filter');
    assert.equal(await page.$('#teamPayrollDashboardSearch, .team-dashboard-search'), null, 'Payroll Summary must not show a search bar');
    const summaryNames = await page.$$eval('#teamPayrollSummaryItems .team-summary-item span', els => els.map(el => el.textContent.trim()));
    assert.deepEqual(summaryNames, ['Basic Pay', 'Hourly Pay', 'Employee EPF', 'Employee Tax', 'Employer EPF', 'Employer SOCSO']);
    assert.deepEqual(await page.$$eval('#teamPayrollSummaryItems .team-summary-group-title', els => els.map(el => el.textContent.trim())), []);
    await page.click('#teamPayrollDashboardFilter');
    await page.waitForSelector('#teamPayrollFilterSheet.active');
    await page.$eval('#teamPayrollFilterApply', el => el.focus());
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'teamPayrollFilterReset');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'teamPayrollFilterApply');
    await page.select('#teamPayrollFilterMonth', '07');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'teamPayrollDashboardFilter');
    assert.match(await page.$eval('#scopeTeamSection .team-payroll-month-label', el => el.textContent), /September 2026/);
    await page.click('#teamPayrollDashboardFilter');
    assert.equal(await page.$eval('#teamPayrollFilterMonth', el => el.value), '09', 'Cancelled changes are discarded');
    await page.select('#teamPayrollFilterMonth', '08');
    await page.click('#teamPayrollFilterApply');
    assert.match(await page.$eval('#scopeTeamSection .team-payroll-month-label', el => el.textContent), /August 2026/);
    assert.match(await page.$eval('#teamPayrollSummaryItems', el => el.textContent), /No payroll data/);
    await page.click('#teamPayrollDashboardFilter');
    await page.click('#teamPayrollFilterReset');
    await page.click('#teamPayrollFilterApply');

    const dashboard = await page.evaluate(() => ({
      title: document.getElementById('globalTopTitle')?.textContent.trim(),
      subtitle: document.getElementById('headerSubtitleText')?.textContent.trim(),
      actionTitle: document.querySelector('#teamPendingApprovalCard .team-pending-approval-title')?.textContent.trim(),
      actionCount: document.getElementById('teamPendingApprovalCount')?.textContent.trim(),
      quickAction: document.querySelector('#teamTaxReliefQuickAction .opt-card-title')?.textContent.trim(),
      quickActionIcon: document.querySelector('#teamTaxReliefQuickAction .opt-icon-wrap i')?.className,
      summaryGroups: [...document.querySelectorAll('#teamPayrollSummaryCard .team-summary-group-title')].map(el => el.textContent.trim()),
      hasSearch: Boolean(document.querySelector('#teamPayrollDashboardSearch, .team-dashboard-search')),
      hasOldInlineQueue: Boolean(document.querySelector('#scopeTeamSection #teamTaxReliefQueue')),
      headerIsCentered: (() => {
        const title = document.getElementById('globalTopTitle').getBoundingClientRect();
        const phone = document.querySelector('.phone-container').getBoundingClientRect();
        return Math.abs(title.left + title.width / 2 - (phone.left + phone.width / 2)) < 2;
      })()
    }));

    await page.$eval('#teamViewFullBreakdown', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('#teamViewFullBreakdown');
    await page.waitForSelector('#teamPayrollBreakdownSection.active');
    await page.waitForFunction(() => document.activeElement?.id === 'teamPayrollBreakdownClose');
    await page.evaluate(() => Promise.all(document.getElementById('teamPayrollBreakdownSection').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));

    const payments = await page.evaluate(() => ({
      title: document.getElementById('globalTopTitle')?.textContent.trim(),
      subtitle: document.getElementById('headerSubtitleText')?.textContent.trim(),
      scopeSwitcherDisplay: getComputedStyle(document.getElementById('mainScopeSwitcher')).display,
      sheetOpen: document.getElementById('teamPayrollBreakdownSection').getAttribute('aria-hidden') === 'false',
      teamDashboardVisible: getComputedStyle(document.getElementById('scopeTeamSection')).display !== 'none',
      dialogTitle: document.getElementById('teamPayrollBreakdownTitle')?.textContent.trim(),
      period: document.getElementById('teamPayrollBreakdownPeriod')?.textContent.trim(),
      panelAnchoredToPhoneBottom: Math.abs(document.querySelector('.team-payroll-breakdown-panel').getBoundingClientRect().bottom - document.querySelector('.phone-container').getBoundingClientRect().bottom) < 2,
      groups: [...document.querySelectorAll('#teamBreakdownRows .team-summary-group-title')].map(el => el.textContent.trim()),
      metrics: [...document.querySelectorAll('#teamBreakdownMetrics .team-breakdown-metric')].map(metric => ({
        label: metric.querySelector('span')?.textContent.trim(),
        amount: metric.querySelector('strong')?.textContent.trim()
      })),
      highContrast: (() => {
        const hero = document.querySelector('.team-breakdown-hero');
        const group = document.querySelector('.team-breakdown-group');
        const row = document.querySelector('.team-breakdown-row');
        const groupBackground = getComputedStyle(group).backgroundColor;
        const rowColor = getComputedStyle(row).color;
        const amountColor = getComputedStyle(row.querySelector('strong')).color;
        return getComputedStyle(hero).backgroundImage !== 'none'
          && !['rgba(0, 0, 0, 0)', 'transparent'].includes(groupBackground)
          && rowColor !== groupBackground
          && amountColor !== groupBackground;
      })(),
      rows: [...document.querySelectorAll('#teamBreakdownRows .team-summary-item')].map(row => ({
        name: row.querySelector('span')?.textContent.trim(),
        amount: row.querySelector('strong')?.textContent.trim()
      }))
    }));

    assert.deepEqual(payments.groups, ['Payments', 'Employee Deductions', 'Employer Contributions']);
    assert.deepEqual(payments.metrics, [
      { label: 'Payments', amount: 'RM 574,834.69' },
      { label: 'Deductions', amount: 'RM 82,654.53' },
      { label: 'Employer', amount: 'RM 46,209.36' }
    ]);
    assert.equal(payments.period, 'September 2026');
    assert.equal(payments.highContrast, true, 'Breakdown must use strong themed surfaces and readable text');
    assert.equal(payments.rows.length, 18, 'Full breakdown includes all nonzero components across all categories');
    assert.ok(payments.rows.some(row => row.name === 'Employee EPF' && row.amount === 'RM 34,142.00'));
    assert.ok(payments.rows.some(row => row.name === 'HRD Levy' && row.amount === 'RM 3,921.36'));
    assert.equal(await page.$('#teamPayrollBreakdownSection input, #teamPayrollBreakdownSection .team-period-card, #teamPayrollBreakdownSection [role="tablist"]'), null, 'Breakdown is a simple list without filter controls');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'teamPayrollBreakdownClose', 'Focus stays inside the simplified dialog');
    await page.click('#teamPayrollBreakdownClose');
    await page.waitForFunction(() => !document.getElementById('teamPayrollBreakdownSection').classList.contains('active'));
    const returned = await page.evaluate(() => ({
      title: document.getElementById('globalTopTitle')?.textContent.trim(),
      subtitle: document.getElementById('headerSubtitleText')?.textContent.trim(),
      switcherVisible: getComputedStyle(document.getElementById('mainScopeSwitcher')).display !== 'none',
      focusReturned: document.activeElement?.id === 'teamViewFullBreakdown'
    }));
    await page.$eval('#teamViewFullBreakdown', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('#teamViewFullBreakdown');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#teamPayrollBreakdownSection', el => el.classList.contains('active')), false, 'Escape closes the breakdown sheet');

    await page.setViewport({ width: 360, height: 800 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    assert.ok(await page.$eval('#scopeTeamSection', el => el.scrollWidth <= el.clientWidth), 'Dashboard must fit a small screen');
    const summaryBelowMonth = await page.evaluate(() => {
      const period = document.querySelector('#scopeTeamSection .team-period-card').getBoundingClientRect();
      const summary = document.getElementById('teamPayrollSummaryCard').getBoundingClientRect();
      return summary.top >= period.bottom;
    });
    assert.ok(summaryBelowMonth, 'Payroll Summary card must sit directly below the selected period');
    await page.click('#teamPayrollDashboardFilter');
    assert.ok(await page.$eval('.claim-filter-panel', el => el.scrollWidth <= el.clientWidth), 'Filter must fit a small screen');
    await page.click('#teamPayrollFilterClose');
    await page.$eval('#teamViewFullBreakdown', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('#teamViewFullBreakdown');
    await page.evaluate(() => Promise.all(document.getElementById('teamPayrollBreakdownSection').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
    assert.ok(await page.$eval('.team-payroll-breakdown-panel', el => el.scrollWidth <= el.clientWidth), 'Breakdown must fit a small screen');
    assert.equal(await page.$eval('.team-breakdown-group', el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)'), true, 'Light mode breakdown groups must use a clear white surface');
    await page.keyboard.press('Escape');
    await page.click('#teamPayrollDashboardFilter');
    await page.select('#teamPayrollFilterMonth', '08');
    await page.click('#teamPayrollFilterApply');
    await page.$eval('#teamViewFullBreakdown', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('#teamViewFullBreakdown');
    assert.match(await page.$eval('#teamBreakdownRows', el => el.textContent), /No payroll data for August 2026/, 'Breakdown uses the period selected on the dashboard');
    await page.keyboard.press('Escape');

    const dashboardPassed = dashboard.title === 'Payroll'
      && dashboard.subtitle === undefined
      && dashboard.actionTitle === 'Pending Approval'
      && dashboard.actionCount === '20'
      && dashboard.quickAction === 'Tax Relief'
      && dashboard.quickActionIcon.includes('fa-file-invoice-dollar')
      && dashboard.summaryGroups.length === 0
      && dashboard.hasSearch === false
      && dashboard.hasOldInlineQueue === false
      && dashboard.headerIsCentered;

    const breakdownPassed = payments.title === 'Payroll'
      && payments.subtitle === undefined
      && payments.scopeSwitcherDisplay !== 'none'
      && payments.sheetOpen
      && payments.teamDashboardVisible
      && payments.dialogTitle === 'Payroll Breakdown'
      && payments.period === 'September 2026'
      && payments.panelAnchoredToPhoneBottom
      && payments.groups.length === 3
      && payments.metrics.length === 3
      && payments.highContrast
      && payments.rows.length === 18
      && payments.rows[0].name === 'Basic Pay'
      && payments.rows[0].amount === 'RM 392,136.02';

    const returnPassed = returned.title === 'Payroll'
      && returned.subtitle === undefined
      && returned.switcherVisible
      && returned.focusReturned;

    const passed = dashboardPassed && breakdownPassed && returnPassed && pageErrors.length === 0;
    console.log(JSON.stringify({ dashboard, payments, returned, pageErrors, dashboardPassed, breakdownPassed, returnPassed, passed }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
