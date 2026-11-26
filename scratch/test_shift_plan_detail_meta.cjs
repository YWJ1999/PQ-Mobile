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
      await page.click('#view-work-shift-summary .work-shift-card');
      const shiftLayout = await page.$eval('#view-work-shift-detail.active work-shift-employee-detail', detail => {
        const overview = detail.querySelector('.work-shift-overview');
        const card = detail.querySelector('.work-shift-employee-card');
        const header = card.querySelector('header');
        const surface = document.createElement('span');
        surface.style.background = 'var(--record-approved-surface)';
        header.append(surface);
        const sharedGreen = getComputedStyle(surface).backgroundImage;
        surface.remove();
        const valuesAlign = region => {
          const boxes = [...region.querySelectorAll('.work-shift-metrics strong')].map(el => el.getBoundingClientRect());
          return boxes.every((box, index) => box.top === boxes[0].top && (index === 0 || box.left >= boxes[index - 1].right));
        };
        return {
          theme: document.documentElement.dataset.theme,
          totalColumns: overview.querySelectorAll('.work-shift-metrics strong').length,
          employeeColumns: card.querySelectorAll('.work-shift-metrics strong').length,
          totalsAligned: valuesAlign(overview),
          employeeHoursAligned: valuesAlign(card),
          greenHeader: sharedGreen !== 'none' && getComputedStyle(header).backgroundImage === sharedGreen,
          radius: getComputedStyle(card).borderRadius,
          fits: detail.scrollWidth <= detail.clientWidth && card.scrollWidth <= card.clientWidth
        };
      });
      assert.deepEqual(shiftLayout, {
        theme, totalColumns: 3, employeeColumns: 2, totalsAligned: true,
        employeeHoursAligned: true, greenHeader: true, radius: '18px', fits: true
      });

      await page.click('#view-work-shift-detail [aria-label="Back"]');
      await page.click('#view-work-shift-summary [aria-label="Back"]');
      await page.click('#calSummaryCard [data-kind="off"]');
      await page.click('.no-work-headcount');
      const noWorkLayout = await page.$eval('#view-no-work-detail.active no-work-employee-detail', detail => {
        const overview = detail.querySelector('dl');
        const [shift, headcount] = [...overview.querySelectorAll('dd')].map(el => el.getBoundingClientRect());
        const table = detail.querySelector('table');
        const [first, second] = table.tBodies[0].rows;
        const summaryHeader = document.querySelector('no-work-summary thead');
        const card = table.parentElement;
        detail.scrollTop = detail.scrollHeight;
        const lastRow = table.tBodies[0].lastElementChild.getBoundingClientRect();
        const viewport = detail.getBoundingClientRect();
        return {
          sideBySide: shift.top === headcount.top && shift.right <= headcount.left,
          rightAligned: ['right', 'end'].includes(getComputedStyle(overview.lastElementChild).textAlign),
          radius: getComputedStyle(card).borderRadius,
          matchingHeader: getComputedStyle(table.tHead).backgroundImage === getComputedStyle(summaryHeader).backgroundImage,
          striped: getComputedStyle(first).backgroundColor !== getComputedStyle(second).backgroundColor,
          allRowsReachable: card.scrollHeight <= card.clientHeight + 1 && lastRow.top >= viewport.top && lastRow.bottom <= viewport.bottom + 1,
          fits: detail.scrollWidth <= detail.clientWidth && table.scrollWidth <= table.clientWidth
        };
      });
      assert.deepEqual(noWorkLayout, {
        sideBySide: true, rightAligned: true, radius: '18px', matchingHeader: true, striped: true, allRowsReachable: true, fits: true
      });

      await page.click('#view-no-work-detail [aria-label="Back"]');
      await page.click('#view-no-work-summary [aria-label="Back"]');
      for (const [kind, report, metric] of [['ot', 'ot-plan', 'Total planned hours'], ['leave', 'leave', 'Total leave days']]) {
        await page.click(`#calSummaryCard [data-kind="${kind}"]`);
        await page.click(report + '-summary tbody button');
        const presentation = await page.$eval(report + '-employee-detail .shift-employee-overview', card => {
          const [headcount, duration] = [...card.querySelectorAll('dd')].map(el => el.getBoundingClientRect());
          return {
            labels: [...card.querySelectorAll('dt')].map(label => label.textContent),
            aligned: headcount.top === duration.top && headcount.right <= duration.left,
            dateIcon: Boolean(card.querySelector('.fa-calendar-days')),
            radius: getComputedStyle(card).borderRadius,
            sharedSurface: getComputedStyle(card).backgroundImage === getComputedStyle(document.querySelector('.list-header.record-summary-card')).backgroundImage
          };
        });
        assert.deepEqual(presentation, { labels: ['Total headcount', metric], aligned: true, dateIcon: true, radius: '18px', sharedSurface: true });
        await page.click(`#view-${report}-detail [aria-label="Back"]`);
        await page.click(`#view-${report}-summary [aria-label="Back"]`);
      }

      assert.deepEqual(errors, []);
      await page.close();
    }

    console.log('PASS: Shift totals, employee cards, No Work rosters and detail metadata align in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
