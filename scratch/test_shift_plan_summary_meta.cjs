const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });

  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 900 });
      await page.goto(`${pageUrl}?theme=${theme}`, { waitUntil: 'load' });

      await page.click('#tabCalendarBtn');
      await page.click('#calSummaryCard [data-kind="work"]');
      const workLayout = await page.$eval('work-shift-summary', summary => {
        const box = selector => summary.querySelector(selector).getBoundingClientRect();
        const date = box('.work-shift-date');
        const count = box('.work-shift-count');
        const section = box('[data-section]');
        const costCenter = box('[data-cost-center]');
        const numbers = [...summary.querySelectorAll('.work-shift-metrics strong')].map(el => el.getBoundingClientRect());
        return {
          dateAndCount: date.right <= count.left && count.bottom > date.top,
          scopeColumns: section.top === costCenter.top && section.right <= costCenter.left,
          metricsAligned: numbers.length === 3 && numbers.every(rect => rect.top === numbers[0].top),
          radius: getComputedStyle(summary.querySelector('.history-card-item')).borderRadius,
          calendarIcon: !!summary.querySelector('.work-shift-date .fa-calendar-days'),
          scope: [...summary.querySelectorAll('.work-shift-scope dd')].map(el => el.textContent)
        };
      });
      assert.deepEqual(workLayout, {
        dateAndCount: true, scopeColumns: true, metricsAligned: true, radius: '18px', calendarIcon: true,
        scope: ['All companies', 'All sections', 'All cost centers']
      });

      await page.click('#view-work-shift-summary [aria-label="Back"]');
      await page.click('#calSummaryCard [data-kind="off"]');
      assert.deepEqual(await page.$$eval('no-work-summary .work-shift-scope dd', nodes => nodes.map(el => el.textContent)), workLayout.scope);
      assert.deepEqual(await page.$$eval('.no-work-table [scope="col"]', cells => cells.map(el => el.textContent)), ['Shift', 'Headcount']);
      assert.equal(await page.$eval('.no-work-table-card', el => getComputedStyle(el).borderRadius), workLayout.radius);
      assert.equal(await page.$eval('.no-work-table td', el => getComputedStyle(el).textAlign), 'end');

      await page.click('#view-no-work-summary [aria-label="Back"]');
      await page.click('#calSummaryCard [data-kind="leave"]');
      const leaveLayout = await page.$eval('leave-summary', summary => {
        const [date, total] = [...summary.querySelectorAll('dd')].map(el => el.getBoundingClientRect());
        return {
          labels: [...summary.querySelectorAll('dt')].map(el => el.textContent),
          sideBySide: date.right <= total.left && date.top === total.top,
          radius: getComputedStyle(summary.querySelector('details')).borderRadius,
          headcountAlignment: getComputedStyle(summary.querySelector('tbody td')).textAlign,
          headerColor: getComputedStyle(summary.querySelector('summary')).color
        };
      });
      assert.deepEqual(leaveLayout, {
        labels: ['Date', 'Total headcount'], sideBySide: true, radius: '18px', headcountAlignment: 'end', headerColor: 'rgb(255, 255, 255)'
      });

      await page.click('#view-leave-summary [aria-label="Back"]');
      await page.click('#calSummaryCard [data-kind="ot"]');
      const otLayout = await page.$eval('ot-plan-summary', summary => {
        const boxes = [...summary.querySelectorAll('dd')].map(el => el.getBoundingClientRect());
        return {
          labels: [...summary.querySelectorAll('dt')].map(el => el.textContent),
          aligned: boxes.every(box => box.top === boxes[0].top),
          columns: boxes[0].right <= boxes[1].left && boxes[1].right <= boxes[2].left,
          hoursAccent: getComputedStyle(summary.querySelector('[data-planned-hours]')).color !== getComputedStyle(summary.querySelector('[data-headcount]')).color,
          radius: getComputedStyle(summary.querySelector('details')).borderRadius
        };
      });
      assert.deepEqual(otLayout, {
        labels: ['Date', 'Total headcount', 'Total planned hours'], aligned: true, columns: true, hoursAccent: true, radius: '18px'
      });

      assert.deepEqual(errors, []);
      await page.close();
    }

    console.log('PASS: Work Shift Summary context and metrics, plus the other Shift Plan summary layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
