const path = require('path');
const puppeteer = require('puppeteer');

function inspectCards(page, viewId, chartSelector, detailsSelector) {
  return page.evaluate(({ viewId, chartSelector, detailsSelector }) => {
    const view = document.getElementById(viewId);
    const directCard = element => {
      let current = element;
      while (current && current.parentElement !== view) current = current.parentElement;
      return current;
    };
    const chartCard = directCard(document.querySelector(chartSelector));
    const detailsCard = directCard(document.querySelector(detailsSelector));
    return {
      count: view?.children.length || 0,
      separate: Boolean(chartCard && detailsCard && chartCard !== detailsCard)
    };
  }, { viewId, chartSelector, detailsSelector });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 450, height: 950 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const url = 'file://' + path.resolve(__dirname, '../modules/claims/options/expenses-highlight.html');
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const main = await page.evaluate(() => {
      const modal = document.getElementById('highlightFilterModal');
      return {
        title: document.getElementById('pageHeaderTitle')?.textContent.trim() || '',
        hasLegacyListHeading: /Employee Expenses Highlights Table|Total:\s*6 records/i.test(
          document.getElementById('viewExpensesHighlightTable')?.textContent || ''
        ),
        filterLabels: modal
          ? [...modal.querySelectorAll('label')].map(label => label.textContent.trim())
          : []
      };
    });

    await page.evaluate(() => showExpensesSection('chart'));
    const chartCards = await inspectCards(
      page,
      'viewExpensesHighlightChart',
      '#highlightDonutSvg',
      '#expensesChartLegendGrid'
    );
    const chartFilter = await page.evaluate(() => {
      const view = document.getElementById('viewExpensesHighlightChart');
      const select = document.getElementById('highlightChartMetricSelect');
      let card = select;
      while (card && card.parentElement !== view) card = card.parentElement;
      return {
        label: card?.querySelector('label')?.textContent.trim() || '',
        selectedValue: select?.value || '',
        hasShareDescription: /share of/i.test(card?.textContent || '')
      };
    });

    await page.evaluate(() => openAnalysis('Dec 2025', 'RM 14,200'));
    const analysisCards = await inspectCards(
      page,
      'viewExpensesAnalysis',
      '#expensesAnalysisDonutSvg',
      '#expensesAnalysisLegendList'
    );
    const analysisFilter = await page.evaluate(() => {
      const card = document.getElementById('expensesAnalysisBreakdownCard');
      const select = document.getElementById('expensesAnalysisMetricSelect');
      return {
        exists: Boolean(card && select),
        label: card?.querySelector('label')?.textContent.trim() || '',
        selectedValue: select?.value || '',
        optionLabels: select ? [...select.options].map(option => option.textContent.trim()) : [],
        hasShareDescription: /share of/i.test(card?.textContent || ''),
        title: document.getElementById('expensesAnalysisTitle')?.textContent.trim() || '',
        column: document.getElementById('expensesAnalysisColumnHeaderKey')?.textContent.trim() || '',
        firstDetail: document.getElementById('expensesAnalysisLegendList')?.firstElementChild?.textContent.replace(/\s+/g, ' ').trim() || ''
      };
    });

    let branchSelection = null;
    if (analysisFilter.exists) {
      await page.select('#expensesAnalysisMetricSelect', 'branch');
      branchSelection = await page.evaluate(() => ({
        title: document.getElementById('expensesAnalysisTitle')?.textContent.trim() || '',
        column: document.getElementById('expensesAnalysisColumnHeaderKey')?.textContent.trim() || '',
        firstDetail: document.getElementById('expensesAnalysisLegendList')?.firstElementChild?.textContent.replace(/\s+/g, ' ').trim() || ''
      }));
    }

    await page.evaluate(() => openExpenseDetailsModal('#004177', 'Marcus Tan'));
    const modal = await page.evaluate(() => {
      const name = document.getElementById('modalExpenseEmpNameText');
      const id = document.getElementById('modalExpenseEmpIdBadge');
      const header = name?.closest('div[style*="background: linear-gradient"]');
      const firstRecord = document.querySelector('.expense-detail-record');
      return {
        name: name?.textContent.trim() || '',
        hasHeaderId: Boolean(id),
        headerBackground: header ? getComputedStyle(header).backgroundImage : '',
        firstRecord: firstRecord?.textContent.replace(/\s+/g, ' ').trim() || '',
        period: firstRecord?.querySelector('.expense-detail-period-value')?.textContent.trim() || '',
        expense: firstRecord?.querySelector('.expense-detail-type')?.textContent.trim() || '',
        amount: firstRecord?.querySelector('.expense-detail-amount')?.textContent.trim() || ''
      };
    });

    const result = { main, chartCards, chartFilter, analysisCards, analysisFilter, branchSelection, modal, pageErrors };
    result.passed =
      main.title === 'Expense Highlights' &&
      !main.hasLegacyListHeading &&
      JSON.stringify(main.filterLabels) === JSON.stringify([
        'Search Keyword',
        'Start Period',
        'End Period',
        'Amount Range (RM)'
      ]) &&
      chartCards.separate &&
      chartFilter.label === 'BREAKDOWN BY' &&
      chartFilter.selectedValue === 'category' &&
      !chartFilter.hasShareDescription &&
      analysisCards.separate &&
      analysisFilter.exists &&
      analysisFilter.label === 'BREAKDOWN BY' &&
      analysisFilter.selectedValue === 'category' &&
      JSON.stringify(analysisFilter.optionLabels) === JSON.stringify([
        'Expense Category',
        'Branch',
        'Department',
        'Section',
        'Grade',
        'Supervisor'
      ]) &&
      !analysisFilter.hasShareDescription &&
      analysisFilter.title === 'Expense Spend by Category' &&
      analysisFilter.column === 'CATEGORY' &&
      analysisFilter.firstDetail.includes('CLIENT DINING & ENTERTAINMENT') &&
      branchSelection?.title === 'Expense Spend by Branch' &&
      branchSelection?.column === 'BRANCH' &&
      branchSelection?.firstDetail.includes('CLIENT DINING & ENTERTAINMENT') &&
      branchSelection?.firstDetail.includes('RM 2,450.00') &&
      modal.name === 'Marcus Tan' &&
      !modal.hasHeaderId &&
      modal.headerBackground.includes('rgb(76, 29, 149)') &&
      modal.headerBackground.includes('rgb(109, 40, 217)') &&
      modal.headerBackground.includes('rgb(124, 58, 237)') &&
      modal.period === '202609' &&
      modal.expense === 'CLIENT DINING & ENTERTAINMENT' &&
      modal.amount === '2,450.00' &&
      pageErrors.length === 0;

    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();



