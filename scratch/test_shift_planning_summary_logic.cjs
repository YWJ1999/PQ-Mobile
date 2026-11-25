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
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 950, hasTouch: true });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });
    await page.click('#tabSummaryBtn');

    assert.equal(await page.$('#kpiTotalHeadcount'), null);
    assert.equal(await page.$('#kpiShiftCount'), null);
    assert.ok(await page.$('#summaryChartInfoButton .fa-circle-info'));
    assert.equal(await page.$eval('#summaryChartInfoButton', button => button.textContent.trim()), '');
    assert.ok(await page.$('a#summaryChartCard[data-history-link][href^="#history/headcount/"]'));
    assert.equal(await page.$('#chartModal, #headcountDetailModal'), null);
    assert.equal(await page.$('#summaryLegendOff'), null);
    assert.equal(await page.$('#summaryLegendW02'), null);
    assert.equal(await page.$eval('#summaryChartCard', node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await page.$('#tableRecordCountBadge'), null);
    assert.equal(await page.$('#summaryTabView .summary-table-footer'), null);
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '287');
    assert.ok(await page.$('#summaryTabView .summary-table-card'));
    assert.equal(await page.$eval('#summaryChartCard', node => node.nextElementSibling?.classList.contains('summary-table-card')), true);
    assert.equal(await page.$eval('#summaryTabView', node => node.textContent.includes('Shift Breakdown Table')), false);
    assert.equal(await page.$$eval('#summaryTableRowsContainer .summary-table-row', rows => rows.length), 11);

    await page.click('#summaryChartInfoButton');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.equal(await page.title(), 'PeopleHCM - Headcount Details');
    assert.equal(await page.$eval('#view-main', main => getComputedStyle(main).display), 'none');
    assert.deepEqual(await page.$$eval('#headcountDetailPage dt', nodes => nodes.map(node => node.textContent)), ['Job title', 'Shift', 'Headcount']);
    assert.deepEqual(await page.$$eval('#headcountDetailPage dd', nodes => nodes.map(node => node.textContent)), ['Account Executive', 'N/A', '3']);
    assert.deepEqual(await page.$$eval('#headcountEmployeeRows tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
      ['#000008', 'Aqilah Antasha'], ['#000009', 'Chan Mee Ling'], ['#000100', 'Loh Siew Hong']
    ]);
    assert.equal(await page.$eval('#summaryChartOffDescription', node => node.textContent), 'Off day, 274 staff (95.5%)');
    assert.equal(await page.$eval('#summaryChartW02Description', node => node.textContent), 'W02 regular day, 13 staff (4.5%)');
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'summaryChartCard');

    const tapPoints = await page.$eval('#summaryChartCard', card => {
      const bounds = card.getBoundingClientRect();
      const ring = card.querySelector('.summary-chart-visual').getBoundingClientRect();
      return [
        { x: ring.left + ring.width * 0.86, y: ring.top + ring.height / 2 },
        { x: bounds.left + 8, y: bounds.top + bounds.height / 2 }
      ];
    });
    for (const point of tapPoints) {
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForSelector('#headcountDetailPage:not([hidden])');
      await page.click('#headcountDetailPage [data-history-back]');
      await page.waitForSelector('#headcountDetailPage', { hidden: true });
    }
    await page.tap('#summaryChartTitle');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    await page.goBack();
    await page.waitForSelector('#headcountDetailPage', { hidden: true });
    await page.focus('#summaryChartCard');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });

    const headcountLink = '#summaryTableRowsContainer .headcount-detail-trigger';
    const detailUrl = await page.$eval(headcountLink, link => link.href);
    await page.click(headcountLink);
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.equal(page.url(), detailUrl);
    assert.deepEqual(await page.$$eval('#headcountEmployeeTable thead th', nodes => nodes.map(node => node.textContent)), ['Emp #', 'Name']);
    assert.equal(await page.$eval('#headcountEmployeeTable th', cell => getComputedStyle(cell).color), 'rgb(255, 255, 255)');
    await page.click('#headcountFilterButton');
    await page.type('#headcountFilterKeyword', '#000100');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#headcountFilterDialog', { hidden: true });
    assert.deepEqual(await page.$$eval('#headcountEmployeeRows td', nodes => nodes.map(node => node.textContent)), ['#000100', 'Loh Siew Hong']);
    assert.equal(await page.$eval('#headcountDetailCount', node => node.textContent), '1');
    await page.click('#headcountFilterButton');
    await page.click('#headcountFilterDialog [type=reset]');
    await page.click('#headcountFilterDialog [type=submit]');
    await page.waitForSelector('#headcountFilterDialog', { hidden: true });
    assert.equal(await page.$eval('#headcountDetailCount', node => node.textContent), '3');
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });
    assert.equal(await page.$eval(headcountLink, link => link === document.activeElement), true);

    await page.evaluate(() => openFilterModal());
    assert.equal(await page.$eval('#staffChangeFilterFields', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#staffCopyFilterFields', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#calendarFilterFields', node => getComputedStyle(node).display), 'none');
    assert.notEqual(await page.$eval('#summaryFilterFields', node => getComputedStyle(node).display), 'none');
    assert.deepEqual(
      await page.$$eval('#summaryFilterFields .summary-filter-field > label', nodes => nodes.map(node => node.textContent.trim())),
      ['Date', 'Shift Type', 'Department', 'Branch', 'Section', 'Cost Centre']
    );
    assert.equal(
      await page.$$eval('#filterModal .standard-filter-reset', buttons => buttons.filter(button => getComputedStyle(button).display !== 'none').length),
      1
    );
    assert.equal(
      await page.$$eval('#filterModal .standard-filter-apply', buttons => buttons.filter(button => getComputedStyle(button).display !== 'none').length),
      1
    );

    await page.$eval('#summaryFilterDate', node => { node.value = '2026-09-25'; });
    await page.select('#summaryFilterShiftType', 'W02');
    await page.select('#summaryFilterDepartment', 'Finance');
    await page.select('#summaryFilterBranch', 'HQ');
    await page.select('#summaryFilterSection', 'Accounts');
    await page.select('#summaryFilterCostCenter', 'Management');
    await page.click('#applyFilterButton');
    await new Promise(resolve => setTimeout(resolve, 320));

    const filterText = await page.$eval('#currentFilterTextDisplay', node => node.textContent);
    assert.match(filterText, /25.*Sep.*2026/);
    assert.match(filterText, /W02/);
    assert.match(filterText, /Finance/);
    assert.match(filterText, /HQ/);
    assert.match(filterText, /Accounts/);
    assert.match(filterText, /Management/);
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '3');
    assert.equal(await page.$$eval('#summaryTableRowsContainer .summary-table-row', rows => rows.length), 1);
    assert.match(await page.$eval('#summaryTableRowsContainer .summary-table-row', row => row.textContent), /ACCOUNT EXECUTIVE/);

    await page.tap('#summaryChartTotal');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.equal(await page.$eval('#headcountDetailCount', node => node.textContent), '3');
    assert.equal(await page.$$eval('#headcountEmployeeRows tr', rows => rows.length), 3);
    assert.equal(await page.$eval('#summaryChartOffDescription', node => node.textContent), 'Off day, 0 staff (0.0%)');
    assert.equal(await page.$eval('#summaryChartW02Description', node => node.textContent), 'W02 regular day, 3 staff (100.0%)');
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });

    await page.click(headcountLink);
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.deepEqual(await page.$$eval('#headcountDetailPage dd', nodes => nodes.map(node => node.textContent)), ['Account Executive', 'N/A', '3']);
    await page.goBack();
    await page.waitForSelector('#headcountDetailPage', { hidden: true });
    assert.equal(await page.$eval('#currentFilterTextDisplay', node => node.textContent), filterText);

    await page.evaluate(() => openFilterModal());
    await page.click('#resetFilterButton');
    assert.equal(await page.$eval('#summaryFilterShiftType', node => node.value), 'all');
    assert.equal(await page.$eval('#summaryFilterDepartment', node => node.value), 'all');
    assert.equal(await page.$eval('#summaryFilterBranch', node => node.value), 'all');
    assert.equal(await page.$eval('#summaryFilterSection', node => node.value), 'all');
    assert.equal(await page.$eval('#summaryFilterCostCenter', node => node.value), 'all');
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '287');
    assert.equal(await page.$$eval('#summaryTableRowsContainer .summary-table-row', rows => rows.length), 11);

    await page.$eval('#summaryFilterDate', node => { node.value = '2026-10-01'; });
    await page.click('#applyFilterButton');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '0');
    assert.match(await page.$eval('#summaryTableRowsContainer', node => node.textContent), /No summary records/);
    assert.match(await page.$eval('#currentFilterTextDisplay', node => node.textContent), /01 Oct 2026/);
    await page.click('#summaryChartInfoButton');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.equal(await page.$eval('#headcountDetailCount', node => node.textContent), '0');
    assert.equal(await page.$$eval('#headcountEmployeeRows tr', items => items.length), 0);
    assert.equal(await page.$eval('#headcountEmpty', node => node.innerText), 'No employees match this selection.');
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });

    await page.evaluate(() => {
      closeModal('filterModal');
      openFilterModal();
    });
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.equal(await page.$eval('#filterModal', node => getComputedStyle(node).display), 'flex');
    assert.deepEqual(errors, []);
    console.log('PASS: Summary uses independent logical filters and synchronized chart, info, and table data.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
