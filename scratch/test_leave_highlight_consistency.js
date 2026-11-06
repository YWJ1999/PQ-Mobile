const path = require('path');
const puppeteer = require('puppeteer');

function compactText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

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
    await page.evaluate(() => showLeaveSection('viewLeaveHighlight'));

    const main = await page.evaluate(() => {
      const view = document.getElementById('viewLeaveHighlight');
      const table = view.querySelector('table');
      const rows = [...table.querySelectorAll('tbody tr')];
      const filter = document.getElementById('highlightFilterModalOverlay');
      const viewChart = [...view.querySelectorAll('button, [onclick]')]
        .find(element => (element.getAttribute('onclick') || '').includes("viewLeaveHighlightChart"));

      return {
        title: document.getElementById('headerTitleText').textContent.trim(),
        viewChartText: viewChart ? viewChart.textContent.replace(/\s+/g, ' ').trim() : '',
        viewChartHasBarIcon: Boolean(viewChart && viewChart.querySelector('.fa-chart-simple')),
        viewChartWhiteSpace: viewChart ? getComputedStyle(viewChart).whiteSpace : '',
        listHeading: [...view.children]
          .find(element => /Employee Leave Highlights Table/.test(element.textContent || ''))
          ?.textContent.replace(/\s+/g, ' ').trim() || '',
        columns: [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim()),
        rowCount: rows.length,
        firstRow: rows[0] ? rows[0].textContent.replace(/\s+/g, ' ').trim() : '',
        filterTitle: filter.querySelector('h3').textContent.trim(),
        filterLabels: [...filter.querySelectorAll('label')].map(label => label.textContent.trim()),
        filterValues: {
          start: filter.querySelector('#filterFromDate').value,
          end: filter.querySelector('#filterToDate').value,
          typeOptions: [...filter.querySelector('#filterHighlightType').options].map(option => option.textContent.trim()),
          min: filter.querySelector('#filterDaysMin').value,
          max: filter.querySelector('#filterDaysMax').value
        }
      };
    });

    await page.evaluate(() => showLeaveSection('viewLeaveHighlightChart'));
    const chart = await page.evaluate(() => {
      const view = document.getElementById('viewLeaveHighlightChart');
      const select = document.getElementById('highlightChartMetricSelect');
      let selectorCard = select;
      while (selectorCard && selectorCard.parentElement !== view) selectorCard = selectorCard.parentElement;
      const chartCard = document.getElementById('highlightDonutSvg').parentElement.parentElement;
      const detailsCard = document.getElementById('highlightChartLegendGrid').parentElement;
      return {
        directCardCount: view.children.length,
        cardsAreSeparate: selectorCard !== chartCard && chartCard !== detailsCard && selectorCard !== detailsCard,
        selectorLabel: selectorCard.querySelector('label').textContent.trim(),
        selectorHasDateHelper: /13 Aug|12 Sep|calendar-days/i.test(selectorCard.textContent + ' ' + selectorCard.innerHTML),
        chartTitle: document.getElementById('highlightChartMainTitle').textContent.trim(),
        detailsColumns: [...detailsCard.children[0].children].map(cell => cell.textContent.trim())
      };
    });

    await page.evaluate(() => showLeaveSection('viewLeaveHighlightTrend'));
    const trend = await page.evaluate(async () => {
      const view = document.getElementById('viewLeaveHighlightTrend');
      const cards = [...view.children];
      const styleKeys = ['borderRadius', 'padding', 'marginBottom'];
      const analysisView = document.getElementById('viewLeaveHighlightAnalysis');
      const trendTitle = document.getElementById('headerTitleText').textContent.trim();

      document.getElementById('trendTotalDays').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      const totalCardOpensDetails =
        getComputedStyle(analysisView).display === 'block' &&
        document.getElementById('headerTitleText').textContent.trim() === 'Leave Days Analysis';

      showLeaveSection('viewLeaveHighlightTrend');

      const firstBar = cards[2].querySelector('[data-leave-trend-bar]');
      firstBar.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      const barChartOpensDetails =
        getComputedStyle(analysisView).display === 'block' &&
        document.getElementById('headerTitleText').textContent.trim() === 'Leave Days Analysis';

      return {
        title: trendTitle,
        cardCount: cards.length,
        cardStyles: cards.map(card => {
          const style = getComputedStyle(card);
          return Object.fromEntries(styleKeys.map(key => [key, style[key]]));
        }),
        metricTitleSize: getComputedStyle(cards[1].children[1].children[0]).fontSize,
        metricValueSize: getComputedStyle(document.getElementById('trendTotalDays')).fontSize,
        monthlyTitleSize: getComputedStyle(cards[2].querySelector('div:first-child')).fontSize,
        totalCardOpensDetails,
        barChartOpensDetails,
        detailsTitle: document.getElementById('headerTitleText').textContent.trim()
      };
    });

    const result = { main, chart, trend, pageErrors };
    result.passed =
      main.title === 'Leave Highlights' &&
      main.viewChartText === 'Chart' &&
      main.viewChartHasBarIcon &&
      main.viewChartWhiteSpace === 'nowrap' &&
      !main.listHeading &&
      JSON.stringify(main.columns) === JSON.stringify([
        'Emp No',
        'Employee Name',
        'Position',
        'Department Full Name',
        'Branch',
        'Total Leave Days'
      ]) &&
      main.rowCount === 4 &&
      main.firstRow.includes('004177') &&
      main.firstRow.includes('AHMAD RAFY BIN ZULKIPLE') &&
      main.filterTitle === 'Filter' &&
      JSON.stringify(main.filterLabels) === JSON.stringify([
        'Search Keyword',
        'Start Date',
        'End Date',
        'Highlight Type',
        'Days Range'
      ]) &&
      main.filterValues.start === '2026-08-13' &&
      main.filterValues.end === '2026-09-12' &&
      JSON.stringify(main.filterValues.typeOptions) === JSON.stringify([
        'Total Leave Days',
        'Total Unpaid Days',
        'Total MC Days'
      ]) &&
      main.filterValues.min === '0' &&
      main.filterValues.max === '99999999' &&
      chart.directCardCount === 3 &&
      chart.cardsAreSeparate &&
      chart.selectorLabel === 'BREAKDOWN BY' &&
      !chart.selectorHasDateHelper &&
      JSON.stringify(chart.detailsColumns) === JSON.stringify(['BRANCH', 'DAYS', '% OF TOTAL']) &&
      trend.title === 'Leave Days Trend Analysis' &&
      trend.cardCount === 3 &&
      trend.cardStyles[0].borderRadius === '20px' &&
      trend.cardStyles[0].padding === '16px 20px' &&
      trend.cardStyles[1].borderRadius === '22px' &&
      trend.cardStyles[1].padding === '20px 22px' &&
      trend.cardStyles[2].borderRadius === '24px' &&
      trend.cardStyles[2].padding === '22px 20px 20px' &&
      trend.metricTitleSize === '17px' &&
      trend.metricValueSize === '24px' &&
      trend.monthlyTitleSize === '18px' &&
      trend.totalCardOpensDetails &&
      trend.barChartOpensDetails &&
      trend.detailsTitle === 'Leave Days Analysis' &&
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
