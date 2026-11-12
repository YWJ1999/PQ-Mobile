const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '..', 'modules/attendance/options/overtime.html')).href;
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const viewports = [320, 360, 390, 420];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const theme of ['light', 'dark']) {
      for (const width of viewports) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(`${pageUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });

        const summary = await page.evaluate(() => {
          const card = document.getElementById('overtimeSummaryCard');
          const metrics = card ? [...card.querySelectorAll('.overtime-summary-metric')] : [];
          const labels = card ? [...card.querySelectorAll('.history-total-records-label')] : [];
          const values = card ? [...card.querySelectorAll('.history-total-records-value')] : [];
          const records = [...document.querySelectorAll('#view-dashboard .ot-record-card')].filter(record => (
            !record.hidden && getComputedStyle(record).display !== 'none'
          ));
          const cardStyle = card ? getComputedStyle(card) : null;
          const cardRect = card?.getBoundingClientRect();
          const firstRecordRect = records[0]?.getBoundingClientRect();
          const contentRect = document.querySelector('.main-content').getBoundingClientRect();
          const leafTotalHours = [...document.querySelectorAll('#view-dashboard *')].filter(node => (
            node.children.length === 0 && node.textContent.trim() === 'Total Hours'
          ));

          return {
            cardCount: document.querySelectorAll('#overtimeSummaryCard').length,
            labels: labels.map(label => label.textContent.trim()),
            values: values.map(value => value.textContent.replace(/\s+/g, ' ').trim()),
            visibleRecordCount: records.length,
            backgroundColor: cardStyle?.backgroundColor,
            backgroundImage: cardStyle?.backgroundImage,
            borderColor: cardStyle?.borderTopColor,
            tabBorderColor: getComputedStyle(document.querySelector('.pill-tabs-container')).borderTopColor,
            labelColors: labels.map(label => getComputedStyle(label).color),
            valueColors: values.map(value => getComputedStyle(value).color),
            unitColor: getComputedStyle(document.querySelector('.overtime-summary-unit')).color,
            mutedColor: getComputedStyle(document.querySelector('.hero-stat .label')).color,
            textPrimaryColor: getComputedStyle(document.querySelector('.hero-stat .value')).color,
            metricTops: metrics.map(metric => metric.getBoundingClientRect().top),
            beforeRecords: Boolean(cardRect && firstRecordRect && cardRect.bottom <= firstRecordRect.top),
            fits: Boolean(cardRect && cardRect.left >= contentRect.left - 1 && cardRect.right <= contentRect.right + 1 && card.scrollWidth <= card.clientWidth + 1),
            totalHoursLeafCount: leafTotalHours.length,
            totalHoursInsideCard: leafTotalHours.length === 1 && card?.contains(leafTotalHours[0])
          };
        });

        assert.equal(summary.cardCount, 1, `${theme} ${width}px: exactly one overtime totals card is shown`);
        assert.deepEqual(summary.labels, ['Records', 'Total Hours'], `${theme} ${width}px: both totals share one card`);
        assert.equal(Number(summary.values[0]), summary.visibleRecordCount, `${theme} ${width}px: Total Records matches visible overtime cards`);
        assert.equal(summary.values[1], '2.00 HRS', `${theme} ${width}px: existing Total Hours value stays in the summary`);
        assert.equal(summary.backgroundImage, 'none', `${theme} ${width}px: totals card uses the neutral History surface`);
        if (theme === 'light') assert.equal(summary.backgroundColor, 'rgb(255, 255, 255)', `${width}px: light totals card is white`);
        else assert.notEqual(summary.backgroundColor, 'rgb(255, 255, 255)', `${width}px: dark totals card follows the dark surface`);
        assert.equal(summary.borderColor, summary.tabBorderColor, `${theme} ${width}px: totals card uses the page border color`);
        assert.deepEqual(summary.labelColors, [summary.textPrimaryColor, summary.textPrimaryColor], `${theme} ${width}px: labels keep the original text color`);
        assert.equal(summary.valueColors[0], summary.textPrimaryColor, `${theme} ${width}px: Total Records keeps the original text color`);
        assert.equal(summary.valueColors[1], 'rgb(167, 139, 250)', `${theme} ${width}px: Total Hours keeps its violet emphasis`);
        assert.equal(summary.unitColor, summary.mutedColor, `${theme} ${width}px: HRS keeps the muted unit color`);
        assert.ok(Math.max(...summary.metricTops) - Math.min(...summary.metricTops) <= 1, `${theme} ${width}px: both totals align in one row`);
        assert.equal(summary.beforeRecords, true, `${theme} ${width}px: totals card appears before overtime records`);
        assert.equal(summary.fits, true, `${theme} ${width}px: totals card fits the mobile content width`);
        assert.equal(summary.totalHoursLeafCount, 1, `${theme} ${width}px: Total Hours is not duplicated outside the card`);
        assert.equal(summary.totalHoursInsideCard, true, `${theme} ${width}px: Total Hours stays inside the totals card`);

        await page.evaluate(() => {
          document.querySelector('#view-dashboard .ot-record-card').hidden = true;
          window.updateOvertimeSummary();
        });
        assert.equal(
          await page.$eval('#overtimeTotalRecords', node => node.textContent.trim()),
          '1',
          `${theme} ${width}px: Total Records recalculates from visible records`
        );
      }
    }

    assert.deepEqual(pageErrors, [], 'Overtime totals card renders without page errors');
    console.log('Overtime totals card checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
