const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fileUrl = file => pathToFileURL(path.join(root, file)).href;

async function setTheme(page, theme) {
  await page.evaluate(value => {
    if (typeof window.setTheme === 'function') window.setTheme(value);
    else document.documentElement.dataset.theme = value;
  }, theme);
  await page.waitForFunction(value => document.documentElement.dataset.theme === value, {}, theme);
  await new Promise(resolve => setTimeout(resolve, 350));
}

async function assertHistoryTotal(page, options) {
  const result = await page.evaluate(({ listSelector, itemSelector }) => {
    const visible = node => {
      if (!node || !node.getClientRects().length) return false;
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    };
    const summaries = [...document.querySelectorAll('.history-total-records-card')].filter(visible);
    const list = document.querySelector(listSelector);
    const items = list ? [...list.querySelectorAll(itemSelector)].filter(visible) : [];
    const card = summaries[0];
    const label = card?.querySelector('.history-total-records-label');
    const value = card?.querySelector('.history-total-records-value');
    const cardStyle = card ? getComputedStyle(card) : null;
    const labelStyle = label ? getComputedStyle(label) : null;
    const valueStyle = value ? getComputedStyle(value) : null;
    const cardRect = card?.getBoundingClientRect();
    const listRect = list?.getBoundingClientRect();
    const main = card?.closest('.main-content, main') || document.querySelector('.main-content, main');
    const mainRect = main?.getBoundingClientRect();
    const topElement = cardRect
      ? document.elementFromPoint(cardRect.left + (cardRect.width / 2), cardRect.top + (cardRect.height / 2))
      : null;
    return {
      summaryCount: summaries.length,
      label: label?.textContent.trim(),
      value: value?.textContent.trim(),
      ariaLive: value?.getAttribute('aria-live'),
      iconCount: card?.querySelectorAll('i, svg').length,
      itemCount: items.length,
      backgroundColor: cardStyle?.backgroundColor,
      backgroundImage: cardStyle?.backgroundImage,
      labelColor: labelStyle?.color,
      valueColor: valueStyle?.color,
      bodyColor: getComputedStyle(document.body).color,
      beforeList: Boolean(cardRect && listRect && cardRect.top <= listRect.top),
      unobscured: Boolean(card && topElement && (topElement === card || card.contains(topElement))),
      fits: Boolean(cardRect && mainRect && cardRect.left >= mainRect.left - 1 && cardRect.right <= mainRect.right + 1 && card.scrollWidth <= card.clientWidth + 1)
    };
  }, options);

  assert.equal(result.summaryCount, 1, `${options.name}: exactly one Total Records card must be visible`);
  assert.equal(result.label, result.itemCount === 1 ? 'Record' : 'Records', `${options.name}: label`);
  assert.match(result.value || '', /^\d+$/, `${options.name}: value must contain digits only`);
  assert.equal(result.ariaLive, 'polite', `${options.name}: updated totals must be announced`);
  assert.equal(result.iconCount, 0, `${options.name}: total card must not use an icon`);
  assert.equal(Number(result.value), result.itemCount, `${options.name}: total must equal visible records`);
  if (options.expected !== undefined) assert.equal(result.itemCount, options.expected, `${options.name}: fixture count`);
  assert.equal(result.backgroundImage, 'linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(99, 102, 241, 0.05))', `${options.name}: shared lavender summary surface`);
  assert.equal(result.labelColor, options.dark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)', `${options.name}: muted summary label`);
  assert.equal(result.valueColor, options.dark ? 'rgb(192, 132, 252)' : 'rgb(124, 58, 237)', `${options.name}: purple record count`);
  assert.ok(result.beforeList, `${options.name}: total card must appear before the records`);
  assert.ok(result.unobscured, `${options.name}: total card must not be covered by a fixed or absolute header`);
  assert.ok(result.fits, `${options.name}: total card must fit the content width`);
  return result;
}

async function openPage(page, file, readySelector, theme = 'light') {
  await page.goto(fileUrl(file), { waitUntil: 'domcontentloaded' });
  await setTheme(page, theme);
  await page.waitForSelector(readySelector, { visible: true });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(7000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const width of [360, 390, 420]) {
      await page.setViewport({ width, height: 900 });

      await openPage(page, 'bonus-history.html', '.bonus-data-table tbody > tr');
      await assertHistoryTotal(page, { name: `Bonus History ${width}px`, listSelector: '.bonus-data-table tbody', itemSelector: ':scope > tr', expected: 3 });

      await openPage(page, 'salary-history.html', '.bonus-data-table tbody > tr');
      await assertHistoryTotal(page, { name: `Salary History ${width}px`, listSelector: '.bonus-data-table tbody', itemSelector: ':scope > tr', expected: 5 });

      await openPage(page, 'modules/attendance/options/history.html', '#viewClockingHistory .history-card-item');
      for (const tab of [
        ['tabClocking', '#viewClockingHistory', 6],
        ['tabOt', '#viewOtHistory', 3],
        ['tabFeedback', '#viewFeedbackHistory', 2]
      ]) {
        await page.click(`#${tab[0]}`);
        await page.waitForSelector(`${tab[1]} .history-card-item`, { visible: true });
        await assertHistoryTotal(page, { name: `Attendance ${tab[0]} ${width}px`, listSelector: tab[1], itemSelector: ':scope > .history-card-item', expected: tab[2] });
      }
      await page.click('#tabOt');
      await page.evaluate(() => {
        document.getElementById('filterFromDate').value = '2020-01-01';
        document.getElementById('filterToDate').value = '2030-12-31';
        document.getElementById('filterStatusSelect').value = 'approved';
        window.applyFilterModal();
      });
      await page.waitForFunction(() => document.getElementById('attendanceHistoryTotalRecords')?.textContent.trim() === '0');
      await assertHistoryTotal(page, { name: `Attendance approved filter ${width}px`, listSelector: '#viewOtHistory', itemSelector: ':scope > .history-card-item', expected: 0 });

      await openPage(page, 'modules/attendance/options/clocking-history.html', '#viewClockingHistory .history-card-item');
      for (const tab of [
        ['tabClocking', '#viewClockingHistory', 6],
        ['tabOt', '#viewOtHistory', 4],
        ['tabFeedback', '#viewFeedbackHistory', 4]
      ]) {
        await page.click(`#${tab[0]}`);
        await page.waitForSelector(`${tab[1]} .history-card-item`, { visible: true });
        await assertHistoryTotal(page, { name: `Attendance legacy ${tab[0]} ${width}px`, listSelector: tab[1], itemSelector: ':scope > .history-card-item', expected: tab[2] });
      }
      await page.evaluate(() => {
        window.switchMainTab('ot');
        window.applyStatusFilter('approved');
      });
      await assertHistoryTotal(page, { name: `Attendance legacy approved filter ${width}px`, listSelector: '#viewOtHistory', itemSelector: ':scope > .history-card-item', expected: 1 });

      await openPage(page, 'leave.html', '.phone-container');
      await page.evaluate(() => window.showLeaveSection('viewMyLeaveHistory'));
      await page.waitForSelector('#viewMyLeaveHistory', { visible: true });
      for (const tab of [
        ['leave', 6],
        ['credit', 3],
        ['offtime', 3]
      ]) {
        await page.evaluate(value => window.switchHistoryTab(value), tab[0]);
        await page.waitForSelector('#myHistoryCardsList .history-item-card', { visible: true });
        await assertHistoryTotal(page, { name: `Leave ${tab[0]} ${width}px`, listSelector: '#myHistoryCardsList', itemSelector: ':scope > .history-item-card', expected: tab[1] });
      }
    }

    await page.setViewport({ width: 390, height: 900 });

    await openPage(page, 'modules/claims/options/history.html', '#claimHistoryListContainer .history-card-item');
    await assertHistoryTotal(page, { name: 'Claims Benefit', listSelector: '#claimHistoryListContainer', itemSelector: ':scope > .history-card-item', expected: 6 });
    await page.evaluate(() => window.switchClaimTab('medical'));
    await page.waitForSelector('#claimHistoryListContainer .history-card-item', { visible: true });
    await assertHistoryTotal(page, { name: 'Claims Medical', listSelector: '#claimHistoryListContainer', itemSelector: ':scope > .history-card-item' });

    await openPage(page, 'modules/project-task/options/history.html', '#workPlanHistoryList .project-history-card');
    await assertHistoryTotal(page, { name: 'Project Work Plan', listSelector: '#workPlanHistoryList', itemSelector: ':scope > .project-history-card', expected: 2 });
    await page.click('#historyTab-timesheet');
    await page.waitForSelector('#timesheetHistoryList .project-history-card', { visible: true });
    await assertHistoryTotal(page, { name: 'Project Timesheet', listSelector: '#timesheetHistoryList', itemSelector: ':scope > .project-history-card', expected: 2 });

    await openPage(page, 'modules/employee-career/options/history.html', '#careerHistoryList .history-card-item');
    await assertHistoryTotal(page, { name: 'Career Feedback', listSelector: '#careerHistoryList', itemSelector: ':scope > .history-card-item', expected: 3 });
    await page.click('[data-history-kind="whereabout"]');
    await page.waitForSelector('#careerHistoryList .history-card-item', { visible: true });
    await assertHistoryTotal(page, { name: 'Career Whereabout', listSelector: '#careerHistoryList', itemSelector: ':scope > .history-card-item', expected: 1 });

    await openPage(page, 'modules/admin/options/history.html', '#workplaceHistoryList .history-card-item');
    for (const category of [
      ['guest-visit', 7],
      ['letter-request', 6],
      ['inventory-request', 2]
    ]) {
      await page.click(`[data-history-kind="${category[0]}"]`);
      await page.waitForSelector('#workplaceHistoryList .history-card-item', { visible: true });
      await assertHistoryTotal(page, { name: `Workplace ${category[0]}`, listSelector: '#workplaceHistoryList', itemSelector: ':scope > .history-card-item', expected: category[1] });
    }

    await page.goto(fileUrl('modules/payroll/options/history.html'), { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await page.waitForFunction(() => document.getElementById('payrollHistoryList')?.getAttribute('aria-busy') === 'false');
    await assertHistoryTotal(page, { name: 'Payroll Tax Relief', listSelector: '#payrollHistoryList', itemSelector: ':scope > .history-card-item', expected: 3 });
    await page.click('[data-history-kind="deduction"]');
    await page.waitForSelector('#payrollHistoryList .history-card-item', { visible: true });
    await assertHistoryTotal(page, { name: 'Payroll Deduction', listSelector: '#payrollHistoryList', itemSelector: ':scope > .history-card-item', expected: 5 });

    for (const route of [
      ['bonus-history.html', '.bonus-data-table tbody > tr', '.bonus-data-table tbody', ':scope > tr', 3, 'Bonus History'],
      ['salary-history.html', '.bonus-data-table tbody > tr', '.bonus-data-table tbody', ':scope > tr', 5, 'Salary History'],
      ['modules/attendance/options/history.html', '#viewClockingHistory .history-card-item', '#viewClockingHistory', ':scope > .history-card-item', 6, 'Attendance History'],
      ['modules/attendance/options/clocking-history.html', '#viewClockingHistory .history-card-item', '#viewClockingHistory', ':scope > .history-card-item', 6, 'Attendance legacy History'],
      ['modules/claims/options/history.html', '#claimHistoryListContainer .history-card-item', '#claimHistoryListContainer', ':scope > .history-card-item', 6, 'Claims History'],
      ['modules/project-task/options/history.html', '#workPlanHistoryList .project-history-card', '#workPlanHistoryList', ':scope > .project-history-card', 2, 'Project History'],
      ['modules/employee-career/options/history.html', '#careerHistoryList .history-card-item', '#careerHistoryList', ':scope > .history-card-item', 3, 'Career History'],
      ['modules/admin/options/history.html', '#workplaceHistoryList .history-card-item', '#workplaceHistoryList', ':scope > .history-card-item', 7, 'Workplace History'],
      ['modules/payroll/options/history.html', '#payrollHistoryList .history-card-item', '#payrollHistoryList', ':scope > .history-card-item', 3, 'Payroll History']
    ]) {
      await openPage(page, route[0], route[1], 'dark');
      await assertHistoryTotal(page, { name: `${route[5]} dark theme`, listSelector: route[2], itemSelector: route[3], expected: route[4], dark: true });
    }

    await openPage(page, 'leave.html', '.phone-container', 'dark');
    await page.evaluate(() => window.showLeaveSection('viewMyLeaveHistory'));
    await page.waitForSelector('#myHistoryCardsList .history-item-card', { visible: true });
    await assertHistoryTotal(page, { name: 'Leave History dark theme', listSelector: '#myHistoryCardsList', itemSelector: ':scope > .history-item-card', expected: 6, dark: true });

    assert.deepEqual(pageErrors, []);
    console.log('PASS: every production History list has one lavender, responsive Total Records card synchronized to its active records.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
