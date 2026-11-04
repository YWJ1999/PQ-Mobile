const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 950 });

    await page.goto(url('leave.html') + '?mode=team', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hubSectionTeam', { visible: true });

    await check('leave approvals have no Backup controls', async () => {
      assert.equal(await page.$('.action-btn-backup, #selectBackupApproverModalOverlay'), null);
    });

    await check('leave card Resubmit handles the request and synchronizes dashboard counts', async () => {
      const exists = await page.evaluate(() => typeof singleResubmitCard === 'function');
      assert.equal(exists, true);
      const before = await page.$eval('#teamApprovalsListContainer', node => [...node.querySelectorAll('.approval-request-card')].filter(card => card.dataset.handled !== 'true').length);
      await page.evaluate(() => singleResubmitCard('approvalCard2', 'Hailizam'));
      const after = await page.evaluate(() => ({
        handled: document.getElementById('approvalCard2').dataset.handled,
        display: getComputedStyle(document.getElementById('approvalCard2')).display,
        tasks: document.getElementById('leaveTeamActionRequiredCount').textContent.trim()
      }));
      assert.equal(after.handled, 'true');
      assert.equal(after.display, 'none');
      assert.equal(after.tasks, `${before - 1} Tasks`);
    });

    await page.goto(url('modules/attendance/options/daily-manpower.html'), { waitUntil: 'domcontentloaded' });
    await check('daily manpower View Chart opens a visible data-backed chart analysis', async () => {
      assert.equal(await page.evaluate(() => typeof openChartModal), 'function');
      await page.click('.view-chart-btn');
      const chart = await page.$eval('.attendance-report-chart', node => ({
        display: getComputedStyle(node).display,
        values: [...node.querySelectorAll('[data-chart-value]')].map(el => Number(el.dataset.chartValue)),
        total: Number(node.dataset.total)
      }));
      assert.notEqual(chart.display, 'none');
      assert.equal(chart.values.reduce((sum, value) => sum + value, 0), chart.total);
      assert.equal(chart.total, Number(await page.$eval('#totalRecordsVal', node => node.textContent)));
    });

    await page.goto(url('modules/attendance/options/hours-costing.html'), { waitUntil: 'domcontentloaded' });
    await check('hours costing View Chart opens a visible chart matching the filtered total', async () => {
      assert.equal(await page.evaluate(() => typeof openChartModal), 'function');
      await page.click('.view-chart-btn');
      const chart = await page.$eval('#hoursCostingChartView', node => ({
        display: getComputedStyle(node).display,
        total: node.querySelector('#hoursCostingChartTotal').textContent.trim(),
        slices: node.querySelectorAll('#hoursCostingDonutCircles circle').length,
        cards: node.querySelectorAll(':scope > .highlight-analysis-card').length
      }));
      assert.notEqual(chart.display, 'none');
      assert.match(chart.total, /^RM /);
      assert.ok(chart.slices > 0);
      assert.equal(chart.cards, 3);
    });

    await page.goto(url('modules/attendance/options/shift-summary.html'), { waitUntil: 'domcontentloaded' });
    await check('shift type clear control resets the filter and rerenders', async () => {
      assert.equal(await page.evaluate(() => typeof resetShiftTypeFilter), 'function');
      await page.select('#filterShiftType', 'OFF DAY');
      const filtered = await page.$eval('#filterSummaryText', node => node.textContent.trim());
      await page.evaluate(() => resetShiftTypeFilter());
      const result = await page.evaluate(() => ({
        value: document.getElementById('filterShiftType').value,
        count: document.getElementById('filterSummaryText').textContent.trim()
      }));
      assert.equal(result.value, 'all');
      assert.notEqual(result.count, filtered);
      assert.match(result.count, /All Shift Types/);
    });

    await page.goto(url('modules/attendance/options/team.html'), { waitUntil: 'domcontentloaded' });
    await check('attendance approvals have no Backup controls', async () => {
      assert.equal(await page.$('.action-btn-backup, #attendanceBackupApproverModalOverlay'), null);
    });
  } finally {
    await browser.close();
  }

  if (failures.length) throw new Error(`\n${failures.join('\n')}`);
  console.log('Attendance/Leave action fixes verified.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

