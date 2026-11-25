const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;
const shiftPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

async function readChartStyles(page) {
  return page.evaluate(() => {
    const read = (selector, properties) => {
      const styles = getComputedStyle(document.querySelector(selector));
      return Object.fromEntries(properties.map(property => [property, styles[property]]));
    };
    return {
      card: read('#summaryChartCard', ['backgroundColor', 'borderRadius', 'padding', 'boxShadow', 'flexDirection', 'gap']),
      title: read('#summaryChartTitle', ['fontSize', 'fontWeight']),
      info: read('#summaryChartInfoButton', ['width', 'height', 'borderRadius']),
      visual: read('.summary-chart-visual', ['width', 'height'])
    };
  });
}

async function readSummaryTableHeaderStyles(page) {
  return page.$eval('#summaryTabView .summary-table-hdr', node => {
    const styles = getComputedStyle(node);
    return {
      backgroundImage: styles.backgroundImage,
      color: styles.color,
      borderBottomColor: styles.borderBottomColor
    };
  });
}

async function readSummary(page) {
  return page.evaluate(() => ({
    chartTotal: document.getElementById('summaryChartTotal').textContent.trim(),
    chartTitle: document.getElementById('summaryChartTitle').textContent.trim(),
    chartDescriptions: [...document.querySelectorAll('#summaryChartCard circle title')].map(title => title.textContent),
    tableRows: document.querySelectorAll('#summaryOtTableRows .summary-table-row').length,
    selectedRows: document.querySelectorAll('#summaryOtTableRows .summary-table-row.is-chart-selected').length,
    refreshCount: Number(document.getElementById('summaryChartCard').dataset.refreshCount || 0)
  }));
}

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
    await page.setViewport({ width: 390, height: 900, hasTouch: true });
    await page.goto(shiftPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabSummaryBtn');
    const shiftChartStyles = await readChartStyles(page);
    const shiftTableHeaderStyles = await readSummaryTableHeaderStyles(page);

    await page.goto(pageUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabSummaryBtn');
    assert.deepEqual(await readChartStyles(page), shiftChartStyles);
    assert.ok(await page.$('a#summaryChartCard[data-history-link][href^="#history/headcount/"]'));
    assert.equal(await page.$('#summaryChartCard button'), null);
    assert.equal(await page.$('#chartModal'), null);
    assert.deepEqual(await readSummaryTableHeaderStyles(page), shiftTableHeaderStyles);
    assert.equal(await page.$('#hoursTypeSelect'), null);
    assert.equal(await page.$('#summaryKpiCard'), null);
    assert.equal(
      await page.$eval('#summaryTabView', view =>
        !view.textContent.includes('OT Cost Breakdown') &&
        !view.textContent.includes('Total Planned Overtime')
      ),
      true
    );

    const planned = await readSummary(page);
    assert.equal(planned.chartTotal, '5.0h');
    assert.equal(planned.chartTitle, 'Planned Hours by OT Type');
    assert.equal(await page.$('#chartSubtotalText'), null);
    assert.equal(await page.$('#summaryLegendBefore'), null);
    assert.equal(await page.$('#summaryLegendAfter'), null);
    assert.equal(await page.$('#summaryLegendRest'), null);
    assert.equal(await page.$('#summaryOtTableRecordCount'), null);
    assert.equal(await page.$('#summaryOtTableTotal'), null);
    assert.equal(await page.$('#summaryTabView .summary-table-footer'), null);
    assert.equal(await page.$eval('#summaryTabView', view => view.textContent.includes('OT Breakdown Table')), false);
    assert.deepEqual(planned.chartDescriptions, ['OT 1.5 · Before work, 2.5 h (50.0%)', 'OT 1.5 · After work, 2.5 h (50.0%)', 'OT 2.0 · Rest day, 0.0 h (0.0%)']);
    assert.equal(await page.$eval('#headcountDetailPage', page => page.hidden), true);
    assert.equal(planned.tableRows, 2);
    assert.equal(await page.$eval('#summaryTabView', view => view.textContent.includes('127.0h')), false);

    const points = await page.$eval('#summaryChartCard', card => {
      card.scrollIntoView({ block: 'center' });
      const bounds = card.getBoundingClientRect();
      const ring = card.querySelector('.summary-chart-visual').getBoundingClientRect();
      return [
        { x: ring.left + ring.width / 2, y: ring.top + ring.height / 2 },
        { x: ring.left + ring.width * .86, y: ring.top + ring.height / 2 },
        { x: bounds.left + 7, y: bounds.top + bounds.height / 2 }
      ];
    });
    for (const point of points) {
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForSelector('#headcountDetailPage:not([hidden])');
      assert.equal(await page.title(), 'PeopleHCM - Headcount Details');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'headcountDetailTitle');
      assert.deepEqual(await page.$$eval('#headcountDetailPage dd', nodes => nodes.map(node => node.textContent)), ['All job titles', 'W01', '2']);
      assert.deepEqual(await page.$$eval('#headcountEmployeeRows tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
        ['#000008', 'Aqilah Antasha'], ['#000009', 'Chan Mee Ling']
      ]);
      await page.click('#headcountDetailPage [data-history-back]');
      await page.waitForSelector('#headcountDetailPage', { hidden: true });
      assert.equal(await page.evaluate(() => document.activeElement.id), 'summaryChartCard');
    }
    await page.tap('#summaryChartTitle');
    await page.click('#headcountFilterButton');
    await page.type('#headcountFilterKeyword', 'cHaN');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#headcountFilterDialog', { hidden: true });
    assert.equal(await page.$eval('#headcountDetailCount', node => node.textContent), '1');
    assert.equal(await page.$eval('#headcountEmployeeRows td', node => node.textContent), '#000009');
    await page.goBack();
    await page.waitForSelector('#headcountDetailPage', { hidden: true });

    const firstHours = '#summaryOtTableRows .ot-hours-detail-trigger';
    const firstDetailsUrl = await page.$eval(firstHours, link => link.href);
    const cellEdge = await page.$eval(firstHours, link => {
      link.scrollIntoView({ block: 'center' });
      const bounds = link.getBoundingClientRect();
      return { x: bounds.right - 3, y: bounds.top + 3 };
    });
    await page.touchscreen.tap(cellEdge.x, cellEdge.y);
    await page.waitForSelector('#otHoursDetailPage:not([hidden])');
    assert.equal(page.url(), firstDetailsUrl);
    assert.equal(await page.title(), 'PeopleHCM - OT Hours Details');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'otHoursDetailTitle');
    assert.equal(await page.$eval('#view-main', main => getComputedStyle(main).display), 'none');
    assert.deepEqual(
      await page.$$eval('#otHoursDetailPage dd', cells => cells.map(cell => cell.textContent)),
      ['Admin Executive', 'W01', '1', '2.50', '2.00']
    );
    assert.deepEqual(
      await page.$$eval('#otHoursScheduleTable thead th', cells => cells.map(cell => cell.textContent.trim())),
      ['Emp #', 'Name', 'Planned', 'Approved']
    );
    assert.deepEqual(
      await page.$$eval('#otHoursScheduleRows tr:first-child td', cells => cells.map(cell => cell.textContent.trim())),
      ['#000008', 'Aqilah Antasha', '2.50', '2.00']
    );
    await page.click('#otHoursFilterButton');
    await page.type('#otHoursFilterKeyword', 'Chan');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('#otHoursEmpty', node => node.hidden), false);
    assert.deepEqual(await page.$$eval('.ot-hours-totals dd', nodes => nodes.map(node => node.textContent)), ['0', '0.00', '0.00']);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'otHoursFilterButton');
    await page.click('#otHoursFilterButton');
    await page.focus('#filterModal .sheet-header button');
    await page.keyboard.press('Enter');
    await page.type('#otHoursFilterKeyword', '#000008');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#filterModal', { hidden: true });
    assert.equal(await page.$eval('#otHoursDetailRecords', node => node.textContent), '1');
    assert.equal(await page.$eval('#otHoursFilterText', node => node.textContent), '#000008');
    await page.click('#otHoursDetailPage [data-history-back]');
    await page.waitForSelector('#otHoursDetailPage', { hidden: true });
    assert.equal(await page.evaluate(() => document.activeElement.href), firstDetailsUrl);
    const secondHours = '#summaryOtTableRows .summary-table-row:nth-child(2) a';
    await page.focus(secondHours);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#otHoursDetailPage:not([hidden])');
    assert.equal(await page.$eval('#otHoursDetailJobTitle', node => node.textContent), 'Barista Operations');
    assert.deepEqual(await page.$$eval('#otHoursScheduleRows td', nodes => nodes.map(node => node.textContent)), ['#000009', 'Chan Mee Ling', '2.50', '2.00']);
    assert.equal(await page.$eval('#otHoursFilterText', node => node.textContent), '');
    await page.goBack();
    await page.waitForSelector('#otHoursDetailPage', { hidden: true });
    assert.equal(await page.$eval(secondHours, link => document.activeElement === link), true);
    assert.equal((await readSummary(page)).selectedRows, 0);

    await page.$eval('#summaryOtTableRows .summary-table-row', row => row.scrollIntoView({ block: 'center' }));
    await page.click('#summaryOtTableRows .summary-table-row');
    const selected = await readSummary(page);
    assert.equal(selected.chartTotal, '2.5h');
    assert.equal(selected.selectedRows, 1);
    assert.ok(selected.refreshCount > planned.refreshCount);

    await page.click('#summaryChartInfoButton');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.deepEqual(await page.$$eval('#headcountDetailPage dd', nodes => nodes.map(node => node.textContent)), ['Admin Executive', 'W01', '1']);
    assert.deepEqual(await page.$$eval('#headcountEmployeeRows td', nodes => nodes.map(node => node.textContent)), ['#000008', 'Aqilah Antasha']);
    assert.equal(await page.$eval('#headcountFilterText', node => node.textContent), '');
    assert.deepEqual(selected.chartDescriptions, ['OT 1.5 · Before work, 2.5 h (100.0%)', 'OT 1.5 · After work, 0.0 h (0.0%)', 'OT 2.0 · Rest day, 0.0 h (0.0%)']);
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });
    assert.equal((await readSummary(page)).selectedRows, 1);

    await page.click('#tabStaffBtn');
    await page.click('#selectAllCheckbox');
    await page.click('#selectAllCheckbox');
    await page.click('#tabSummaryBtn');
    await page.focus('#summaryChartCard');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.equal(await page.$eval('#headcountDetailCount', node => node.textContent), '0');
    assert.equal(await page.$eval('#headcountEmpty', node => node.hidden), false);
    assert.equal(await page.$('#headcountEmployeeRows tr'), null);
    assert.deepEqual(errors, []);

    console.log('OT Planning chart, Headcount Details and OT Hours Details match their selected staff.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
