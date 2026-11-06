const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pageUrl = theme => pathToFileURL(path.join(root, 'modules/employee-career/options/team/ir-highlight.html')).href + `?theme=${theme}`;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 1 });
      await page.goto(pageUrl(theme), { waitUntil: 'load' });

      assert.equal(await page.$('.employee-career-coming-card'), null, 'IR Highlight replaces the Coming Soon page');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight');
      assert.equal(await page.$eval('#irHighlightTotalRecords', node => node.textContent.trim()), '7');
      assert.equal(await page.$eval('#irHighlightTotalCases', node => node.textContent.trim()), '14');
      assert.deepEqual(await page.$$eval('#irHighlightTable thead th', nodes => nodes.map(node => node.textContent.trim())), ['Emp #', 'Name', 'Cases']);
      assert.equal(await page.$$eval('#irHighlightTable tbody tr', nodes => nodes.length), 7);

      const firstRow = await page.$eval('#irHighlightTable tbody tr', row => ({
        empNo: row.cells[0].textContent.trim(),
        name: row.cells[1].textContent.trim(),
        cases: row.querySelector('.ir-highlight-cases-button')?.textContent.trim()
      }));
      assert.deepEqual(firstRow, { empNo: '#EBB12', name: 'Farhan Binti Rahmat', cases: '3' });

      assert.deepEqual(await page.$eval('#irHighlightViewChart', button => ({
        text: button.textContent.trim(),
        barIcon: button.querySelector('i')?.classList.contains('fa-chart-simple'),
        nowrap: getComputedStyle(button).whiteSpace
      })), { text: 'Chart', barIcon: true, nowrap: 'nowrap' });

      await page.click('#irHighlightTable tbody tr .ir-highlight-cases-button');
      assert.equal(await page.$eval('#irHighlightDetailsOverlay', node => node.hidden), false);
      assert.equal(await page.$eval('#irHighlightDetailName', node => node.textContent.trim()), 'Farhan Binti Rahmat');
      assert.equal(await page.$eval('#irHighlightDetailEmpNo', node => node.textContent.trim()), '#EBB12');
      assert.deepEqual(await page.$$eval('#irHighlightDetailsTable thead th', nodes => nodes.map(node => node.textContent.trim())), ['Date', 'Offence', 'Action']);
      assert.equal(await page.$$eval('#irHighlightDetailsTable tbody tr', nodes => nodes.length), 3);
      assert.deepEqual(await page.$eval('#irHighlightDetailsTable tbody tr', row => [...row.cells].map(cell => cell.textContent.trim())), ['14 Feb 2026', 'Late Attendance', 'Verbal Warning']);
      assert.ok(await page.$eval('.ir-highlight-details-scroll', node => node.scrollWidth <= node.clientWidth + 1), 'Case detail table fits inside the mobile dialog');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#irHighlightDetailsOverlay', node => node.hidden), true);

      await page.click('#irHighlightFilterTrigger');
      assert.equal(await page.$eval('#irHighlightFilterOverlay', node => node.hidden), false);
      for (const id of ['Keyword', 'StartDate', 'EndDate', 'OffenceType', 'ActionType', 'CasesMin', 'CasesMax']) {
        assert.ok(await page.$(`#irHighlightFilter${id}`), `Filter includes ${id}`);
      }
      assert.deepEqual(await page.$$eval('#irHighlightFilterOffenceType option', nodes => nodes.map(node => node.value)), ['', 'Absenteeism', 'Insubordination', 'Late Attendance', 'Misconduct', 'Negligence', 'Policy Breach', 'Safety Violation']);
      assert.deepEqual(await page.$$eval('#irHighlightFilterActionType option', nodes => nodes.map(node => node.value)), ['', 'Counselling', 'Final Warning', 'Show Cause Letter', 'Verbal Warning', 'Written Warning']);
      await page.type('#irHighlightFilterKeyword', 'Farhan');
      await page.select('#irHighlightFilterOffenceType', 'Late Attendance');
      await page.click('#irHighlightApplyFilter');
      assert.equal(await page.$eval('#irHighlightTotalRecords', node => node.textContent.trim()), '1');
      assert.equal(await page.$eval('#irHighlightTotalCases', node => node.textContent.trim()), '1');
      assert.match(await page.$eval('#irHighlightFilterSummary', node => node.textContent.trim()), /Farhan.*Late Attendance/);

      await page.click('#irHighlightFilterTrigger');
      await page.click('#irHighlightResetFilter');
      assert.deepEqual(await page.evaluate(() => ({
        keyword: document.getElementById('irHighlightFilterKeyword').value,
        start: document.getElementById('irHighlightFilterStartDate').value,
        end: document.getElementById('irHighlightFilterEndDate').value,
        min: document.getElementById('irHighlightFilterCasesMin').value,
        max: document.getElementById('irHighlightFilterCasesMax').value
      })), { keyword: '', start: '2026-01-01', end: '2026-10-13', min: '0', max: '99' });
      await page.$eval('#irHighlightFilterCasesMin', node => { node.value = '2'; });
      await page.$eval('#irHighlightFilterCasesMax', node => { node.value = '2'; });
      await page.click('#irHighlightApplyFilter');
      assert.equal(await page.$eval('#irHighlightTotalRecords', node => node.textContent.trim()), '5');
      assert.equal(await page.$eval('#irHighlightTotalCases', node => node.textContent.trim()), '10');

      await page.click('#irHighlightFilterTrigger');
      await page.$eval('#irHighlightFilterStartDate', node => { node.value = '2026-10-13'; });
      await page.$eval('#irHighlightFilterEndDate', node => { node.value = '2026-01-01'; });
      await page.click('#irHighlightApplyFilter');
      assert.equal(await page.$eval('#irHighlightFilterError', node => node.hidden), false);
      assert.equal(await page.$eval('#irHighlightFilterOverlay', node => node.hidden), false);
      await page.click('#irHighlightResetFilter');
      await page.click('#irHighlightCloseFilter');

      await page.click('#irHighlightViewChart');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight Analysis');
      assert.equal(await page.$eval('#irHighlightReportView', node => node.hidden), true);
      assert.equal(await page.$eval('#irHighlightChartView', node => node.hidden), false);
      assert.equal(await page.$eval('#irHighlightChartTotal', node => node.textContent.trim()), '14');
      assert.deepEqual(await page.$$eval('#irHighlightChartMetric option', nodes => nodes.map(node => node.value)), ['offence', 'action']);
      assert.ok(await page.$$eval('#irHighlightChartSegments circle', nodes => nodes.length) >= 5, 'Offence chart renders multiple donut segments');
      assert.equal(await page.$$eval('#irHighlightChartLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 14);
      await page.select('#irHighlightChartMetric', 'action');
      assert.match(await page.$eval('#irHighlightChartTitle', node => node.textContent.trim()), /action/i);
      assert.deepEqual(await page.$eval('#irHighlightViewTrend', button => ({
        text: button.textContent.trim(),
        lineIcon: button.querySelector('i')?.classList.contains('fa-chart-line')
      })), { text: 'View Trend', lineIcon: true });
      await page.click('#irHighlightViewTrend');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight Trend Analysis');
      assert.equal(await page.$eval('#irHighlightChartView', node => node.hidden), true);
      assert.equal(await page.$eval('#irHighlightTrendView', node => node.hidden), false);
      assert.equal(await page.$eval('#irHighlightTrendRange', node => node.textContent.trim()), '01 Jan 2026 - 13 Oct 2026');
      assert.equal(await page.$eval('#irHighlightTrendTotal', node => node.textContent.trim()), '14');
      assert.equal(await page.$$eval('#irHighlightTrendBars [data-ir-trend-month]', nodes => nodes.length), 10);
      assert.equal(await page.$$eval('#irHighlightTrendBars [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 14);

      await page.click('[data-ir-trend-month="2026-02"]');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight Analysis');
      assert.equal(await page.$eval('#irHighlightTrendView', node => node.hidden), true);
      assert.equal(await page.$eval('#irHighlightAnalysisView', node => node.hidden), false);
      assert.match(await page.$eval('#irHighlightAnalysisSubtitle', node => node.textContent.trim()), /Feb 2026.*2 cases/);
      assert.equal(await page.$eval('#irHighlightAnalysisTotal', node => node.textContent.trim()), '2');
      assert.equal(await page.$$eval('#irHighlightAnalysisLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 2);
      await page.click('#irHighlightBack');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight Trend Analysis');

      await page.click('#irHighlightTrendTotalCard');
      assert.equal(await page.$eval('#irHighlightAnalysisTotal', node => node.textContent.trim()), '14');
      assert.match(await page.$eval('#irHighlightAnalysisSubtitle', node => node.textContent.trim()), /01 Jan 2026.*13 Oct 2026.*14 cases/);
      await page.click('#irHighlightBack');
      await page.click('#irHighlightBack');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight Analysis');
      await page.click('#irHighlightBack');
      assert.equal(await page.$eval('#irHighlightTitle', node => node.textContent.trim()), 'IR Highlight');

      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} report fits ${width}px`);
        await page.click('#irHighlightViewChart');
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} chart fits ${width}px`);
        await page.click('#irHighlightViewTrend');
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} trend fits ${width}px`);
        await page.click('#irHighlightTrendBars [data-ir-trend-month]');
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} trend analysis fits ${width}px`);
        await page.click('#irHighlightBack');
        await page.click('#irHighlightBack');
        await page.click('#irHighlightBack');
      }
    }

    assert.deepEqual(errors, [], `IR Highlight has no JavaScript errors: ${errors.join('; ')}`);
    console.log('PASS: IR Highlight report, case details, filters, chart, trend drill-down, themes and responsive layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
