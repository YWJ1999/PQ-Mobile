const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 450, height: 950 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const url = 'file://' + path.resolve(__dirname, '../leave.html');
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const result = await page.evaluate(() => {
      const visible = id => {
        const element = document.getElementById(id);
        return Boolean(element && getComputedStyle(element).display !== 'none');
      };

      showLeaveSection('viewLeaveHighlight');
      const viewChartButton = [...document.querySelectorAll('#viewLeaveHighlight button')]
        .find(button => button.textContent.replace(/\s+/g, ' ').trim() === 'Chart');
      viewChartButton?.click();
      const chartStep = {
        visible: visible('viewLeaveHighlightChart'),
        title: document.getElementById('headerTitleText')?.textContent.trim() || ''
      };

      const viewTrendButton = [...document.querySelectorAll('#viewLeaveHighlightChart button')]
        .find(button => /View Trend/.test(button.textContent));
      viewTrendButton?.click();
      const trendStep = {
        visible: visible('viewLeaveHighlightTrend'),
        title: document.getElementById('headerTitleText')?.textContent.trim() || ''
      };

      const firstBar = document.querySelector('#viewLeaveHighlightTrend [data-leave-trend-bar]');
      firstBar?.click();
      const analysis = document.getElementById('viewLeaveHighlightAnalysis');
      const selector = document.getElementById('leaveAnalysisMetricSelect');
      const legendList = document.getElementById('leaveAnalysisLegendList');
      const legendHead = document.getElementById('leaveAnalysisColumnHeaderKey')?.parentElement;
      const analysisRows = legendList ? [...legendList.children] : [];
      const analysisStep = {
        barExists: Boolean(firstBar),
        visible: visible('viewLeaveHighlightAnalysis'),
        title: document.getElementById('headerTitleText')?.textContent.trim() || '',
        directCardCount: analysis?.children.length || 0,
        selectorLabel: analysis?.querySelector('label')?.textContent.trim() || '',
        selectorValue: selector?.value || '',
        hasDonut: Boolean(document.getElementById('leaveAnalysisDonutSvg')),
        hasDetails: Boolean(legendList),
        hasTable: Boolean(analysis?.querySelector('table')),
        hasRecordCount: Boolean(document.getElementById('leaveAnalysisRecordCount')),
        legendHeaders: legendHead ? [...legendHead.children].map(cell => cell.textContent.trim()) : [],
        legendRows: analysisRows.length,
        firstRow: analysisRows[0] ? [...analysisRows[0].children].map(cell => cell.textContent.trim()) : [],
        legendStyle: legendList && legendHead && analysisRows[0] ? {
          headerPadding: getComputedStyle(legendHead).padding,
          headerBorder: getComputedStyle(legendHead).borderBottomWidth,
          listGap: getComputedStyle(legendList).gap,
          listPaddingTop: getComputedStyle(legendList).paddingTop,
          rowBackground: getComputedStyle(analysisRows[0]).backgroundColor
        } : null,
        selectedPeriod: document.getElementById('leaveAnalysisSubtitle')?.textContent.trim() || '',
        selectedTotal: document.getElementById('leaveAnalysisCenterTotal')?.textContent.trim() || '',
        legacyOverlayVisible: visible('highlightTrendModalOverlay')
      };

      document.getElementById('headerBackButton')?.click();
      const backStep = {
        trendVisible: visible('viewLeaveHighlightTrend'),
        title: document.getElementById('headerTitleText')?.textContent.trim() || ''
      };

      return { chartStep, trendStep, analysisStep, backStep };
    });

    result.pageErrors = pageErrors;
    result.passed =
      result.chartStep.visible &&
      result.chartStep.title === 'Leave Days Analysis' &&
      result.trendStep.visible &&
      result.trendStep.title === 'Leave Days Trend Analysis' &&
      result.analysisStep.barExists &&
      result.analysisStep.visible &&
      result.analysisStep.title === 'Leave Days Analysis' &&
      result.analysisStep.directCardCount === 3 &&
      result.analysisStep.selectorLabel === 'BREAKDOWN BY' &&
      result.analysisStep.selectorValue === 'branch' &&
      result.analysisStep.hasDonut &&
      result.analysisStep.hasDetails &&
      !result.analysisStep.hasTable &&
      !result.analysisStep.hasRecordCount &&
      JSON.stringify(result.analysisStep.legendHeaders) === JSON.stringify(['BRANCH', 'DAYS', '% OF TOTAL']) &&
      result.analysisStep.legendRows === 10 &&
      JSON.stringify(result.analysisStep.firstRow) === JSON.stringify(['Times Square Branch', '37.77', '44.96%']) &&
      result.analysisStep.legendStyle?.headerPadding === '0px 0px 12px' &&
      result.analysisStep.legendStyle?.headerBorder === '1px' &&
      result.analysisStep.legendStyle?.listGap === '16px' &&
      result.analysisStep.legendStyle?.listPaddingTop === '16px' &&
      result.analysisStep.legendStyle?.rowBackground === 'rgba(0, 0, 0, 0)' &&
      result.analysisStep.selectedPeriod === 'As At Oct 2025' &&
      result.analysisStep.selectedTotal === '84.00' &&
      !result.analysisStep.legacyOverlayVisible &&
      result.backStep.trendVisible &&
      result.backStep.title === 'Leave Days Trend Analysis' &&
      pageErrors.length === 0;

    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
