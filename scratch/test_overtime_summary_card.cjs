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
          const toolbar = document.querySelector('.ot-toolbar');
          const info = toolbar.querySelector('.record-key-trigger').getBoundingClientRect();
          const add = toolbar.querySelector('#overtimeAddRequest').getBoundingClientRect();
          const card = document.getElementById('overtimeSummaryCard');
          const hoursLabel = card.querySelector('.overtime-summary-hours > span');
          const hours = card.querySelector('#overtimeTotalHours');
          const count = card.querySelector('.overtime-summary-count');
          const labelRect = hoursLabel.getBoundingClientRect();
          const hoursRect = hours.getBoundingClientRect();
          const countRect = count.getBoundingClientRect();
          const records = [...document.querySelectorAll('#view-dashboard .ot-record-card')].filter(record => (
            !record.hidden && getComputedStyle(record).display !== 'none'
          ));
          const cardStyle = getComputedStyle(card);
          const cardRect = card.getBoundingClientRect();
          const firstRecordRect = records[0]?.getBoundingClientRect();
          const contentRect = document.querySelector('.main-content').getBoundingClientRect();
          const leafTotalHours = [...document.querySelectorAll('#view-dashboard *')].filter(node => (
            node.children.length === 0 && node.textContent.trim() === 'Total Hours'
          ));

          return {
            actionsFit: info.right < add.left && add.right <= toolbar.getBoundingClientRect().right + 1,
            cardCount: document.querySelectorAll('#overtimeSummaryCard').length,
            hoursLabel: hoursLabel.textContent,
            hours: hours.textContent,
            count: count.innerText,
            textSizes: [hoursLabel, hours, ...count.children].map(node => getComputedStyle(node).fontSize),
            visibleRecordCount: records.length,
            backgroundColor: cardStyle.backgroundColor,
            backgroundImage: cardStyle.backgroundImage,
            borderColor: cardStyle.borderTopColor,
            tabBorderColor: getComputedStyle(document.querySelector('.pill-tabs-container')).borderTopColor,
            hoursColor: getComputedStyle(hours).color,
            countColor: getComputedStyle(count).color,
            mutedColor: getComputedStyle(document.querySelector('#overtimeMeta dt')).color,
            textPrimaryColor: getComputedStyle(document.querySelector('#overtimeMeta dd')).color,
            hoursThenCount: labelRect.right <= hoursRect.left && hoursRect.right < countRect.left,
            oneLine: Math.abs(labelRect.top - countRect.top) <= 2 && cardRect.height <= 48,
            beforeRecords: Boolean(cardRect && firstRecordRect && cardRect.bottom <= firstRecordRect.top),
            fits: Boolean(cardRect && cardRect.left >= contentRect.left - 1 && cardRect.right <= contentRect.right + 1 && card.scrollWidth <= card.clientWidth + 1),
            totalHoursLeafCount: leafTotalHours.length,
            totalHoursInsideCard: leafTotalHours.length === 1 && card?.contains(leafTotalHours[0])
          };
        });

        assert.ok(summary.actionsFit, `${theme} ${width}px: Info and Add OT fit in the header`);
        assert.equal(summary.cardCount, 1, `${theme} ${width}px: exactly one overtime totals card is shown`);
        assert.equal(summary.hoursLabel, 'Total Hours');
        assert.equal(summary.hours, '2.00');
        assert.equal(summary.visibleRecordCount, 1);
        assert.equal(summary.count, '1 record');
        assert.deepEqual(summary.textSizes, Array(4).fill('16px'), `${theme} ${width}px: the hours label, value and record count use the same 16px size`);
        assert.equal(summary.backgroundImage, 'none', `${theme} ${width}px: totals card uses the neutral History surface`);
        if (theme === 'light') assert.equal(summary.backgroundColor, 'rgb(255, 255, 255)', `${width}px: light totals card is white`);
        else assert.notEqual(summary.backgroundColor, 'rgb(255, 255, 255)', `${width}px: dark totals card follows the dark surface`);
        assert.equal(summary.borderColor, summary.tabBorderColor, `${theme} ${width}px: totals card uses the page border color`);
        assert.equal(summary.hoursColor, summary.textPrimaryColor);
        assert.equal(summary.countColor, summary.mutedColor);
        assert.ok(summary.hoursThenCount && summary.oneLine, `${theme} ${width}px: hours lead and the count follows on one compact line`);
        assert.equal(summary.beforeRecords, true, `${theme} ${width}px: totals card appears before overtime records`);
        assert.equal(summary.fits, true, `${theme} ${width}px: totals card fits the mobile content width`);
        assert.equal(summary.totalHoursLeafCount, 1, `${theme} ${width}px: Total Hours is not duplicated outside the card`);
        assert.equal(summary.totalHoursInsideCard, true, `${theme} ${width}px: Total Hours stays inside the totals card`);

        await page.click('[data-period="this-month"]');
        assert.equal(
          await page.$eval('.overtime-summary-count', node => node.innerText),
          '2 records',
          `${theme} ${width}px: the count and its label follow the visible records`
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
