const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;
const summaries = [
  ['view-work-shift-summary', 'wsSummaryRecordCount'],
  ['view-no-work-summary', 'nwSummaryRecordCount'],
  ['view-ot-plan-summary', 'otSummaryRecordCount'],
  ['view-leave-summary', 'lvSummaryRecordCount']
];

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

      for (const [viewId, countId] of summaries) {
        await page.evaluate(id => switchView(id), viewId);
        await page.waitForSelector(`#${viewId} .summary-detail-info-card`);
        const layout = await page.$eval(`#${viewId}`, (view, currentCountId) => {
          const overview = view.querySelector('.summary-detail-info-card');
          const dateRow = overview.querySelector('.shift-detail-info-date');
          const countValue = document.getElementById(currentCountId);
          const countRow = countValue.closest('.shift-detail-info-row');
          const dateBox = dateRow.getBoundingClientRect();
          const countBox = countRow.getBoundingClientRect();
          const overviewStyle = getComputedStyle(overview);
          const detailStyle = getComputedStyle(document.querySelector('#view-work-shift-detail .shift-detail-info-card'));
          const countStyle = getComputedStyle(countRow);
          return {
            visibleIconCount: [...overview.querySelectorAll('i')].filter(icon => icon.getClientRects().length > 0).length,
            dateAboveTotal: dateBox.bottom <= countBox.top,
            rowsShareWidth: Math.abs(dateBox.left - countBox.left) <= 1 && Math.abs(dateBox.right - countBox.right) <= 1,
            dateLabelColor: getComputedStyle(dateRow.querySelector('.shift-detail-info-label')).color,
            totalLabelColor: getComputedStyle(countRow.querySelector('.shift-detail-info-label')).color,
            totalText: countRow.textContent.replace(/\s+/g, ' ').trim(),
            count: countValue.textContent,
            countAlignment: countStyle.alignItems,
            overviewBackgroundImage: overviewStyle.backgroundImage,
            detailBackgroundImage: detailStyle.backgroundImage,
            overviewRadius: overviewStyle.borderRadius,
            detailRadius: detailStyle.borderRadius,
            overviewShadow: overviewStyle.boxShadow,
            detailShadow: detailStyle.boxShadow,
            dividerWidth: getComputedStyle(dateRow).borderBottomWidth
          };
        }, countId);

        assert.equal(layout.visibleIconCount, 0, `${theme} ${viewId}: Date must not show an icon`);
        assert.equal(layout.dateAboveTotal, true, `${theme} ${viewId}: Date must occupy the first row and Total Records the second row`);
        assert.equal(layout.rowsShareWidth, true, `${theme} ${viewId}: Date and Total Records must each use a full row`);
        assert.equal(layout.dateLabelColor, layout.totalLabelColor, `${theme} ${viewId}: Date label must use the normal muted text color`);
        assert.equal(layout.totalText, layout.count + (layout.count === '1' ? ' Record' : ' Records'));
        assert.equal(layout.countAlignment, 'baseline');
        assert.equal(layout.overviewBackgroundImage, layout.detailBackgroundImage, `${theme} ${viewId}: Summary and detail metadata must share the same surface`);
        assert.equal(layout.overviewRadius, layout.detailRadius, `${theme} ${viewId}: Summary and detail metadata must share the same radius`);
        assert.equal(layout.overviewShadow, layout.detailShadow, `${theme} ${viewId}: Summary and detail metadata must share the same shadow`);
        assert.equal(layout.dividerWidth, '1px', `${theme} ${viewId}: Date must use a separator line above Total Records`);
      }

      assert.deepEqual(errors, []);
      await page.close();
    }

    console.log('PASS: Shift Plan summary metadata uses two normal-color rows without date icons.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
