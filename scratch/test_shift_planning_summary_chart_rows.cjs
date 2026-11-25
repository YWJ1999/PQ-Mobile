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
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });
    await page.click('#tabSummaryBtn');

    const tableHeaderStyle = await page.$eval('#summaryTabView .summary-table-hdr', node => {
      const style = getComputedStyle(node);
      return { backgroundImage: style.backgroundImage, color: style.color };
    });
    assert.match(tableHeaderStyle.backgroundImage, /124, 58, 237/);
    assert.match(tableHeaderStyle.backgroundImage, /109, 40, 217/);
    assert.equal(tableHeaderStyle.color, 'rgb(255, 255, 255)');

    assert.equal(await page.$eval('#summaryChartTitle', node => node.textContent.trim()), 'Headcount by Shift');
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '287');

    await page.$$eval('#summaryTableRowsContainer .summary-table-row', rows => {
      const row = rows.find(item => item.textContent.includes('ACCOUNT EXECUTIVE') && item.textContent.includes('OFF DAY'));
      if (!row) throw new Error('ACCOUNT EXECUTIVE row not found');
      row.querySelector('.summary-job-title').click();
    });

    assert.equal(await page.$eval('#summaryChartCard', node => node.classList.contains('is-refreshing')), true);
    assert.equal(await page.$eval('#summaryChartCard', node => node.dataset.refreshCount), '1');
    assert.equal(await page.$eval('#summaryChartTitle', node => node.textContent.trim()), 'ACCOUNT EXECUTIVE by Shift');
    assert.equal(
      await page.$$eval('#summaryTableRowsContainer .summary-table-row.is-chart-selected', rows => rows.length),
      2
    );
    const selectedRowStyle = await page.$eval('#summaryTableRowsContainer .summary-table-row.is-chart-selected', node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, boxShadow: style.boxShadow };
    });
    assert.notEqual(selectedRowStyle.background, 'rgba(0, 0, 0, 0)');
    assert.match(selectedRowStyle.boxShadow, /124, 58, 237/);
    await page.waitForFunction(() => !document.getElementById('summaryChartCard').classList.contains('is-refreshing')
      && document.getElementById('summaryChartTotal').textContent === '18');
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '18');
    assert.equal(await page.$eval('#summaryChartOffDescription', node => node.textContent), 'Off day, 15 staff (83.3%)');
    assert.equal(await page.$eval('#summaryChartW02Description', node => node.textContent), 'W02 regular day, 3 staff (16.7%)');
    assert.equal(await page.$eval('#summaryChartCard', node => node.classList.contains('is-refreshing')), false);
    assert.equal(
      await page.$eval('#summaryChartCard', node => {
        const rect = node.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      }),
      true
    );

    await page.click('#summaryChartInfoButton');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.deepEqual(await page.$$eval('#headcountDetailPage dd', nodes => nodes.map(node => node.textContent)), ['Account Executive', 'OFF DAY', '15']);
    assert.equal(await page.$$eval('#headcountEmployeeRows tr', rows => rows.length), 0);
    assert.equal(await page.$eval('#headcountEmpty', node => node.innerText), 'Employee details are unavailable for this group.');
    await page.click('#headcountDetailPage [data-history-back]');
    await page.waitForSelector('#headcountDetailPage', { hidden: true });

    await page.$$eval('#summaryTableRowsContainer .summary-table-row', rows => {
      const row = rows.find(item => item.textContent.includes('BARTENDER'));
      if (!row) throw new Error('BARTENDER row not found');
      row.querySelector('.summary-job-title').click();
    });

    assert.equal(await page.$eval('#summaryChartCard', node => node.dataset.refreshCount), '2');
    assert.equal(await page.$eval('#summaryChartTitle', node => node.textContent.trim()), 'BARTENDER by Shift');
    await page.waitForFunction(() => document.getElementById('summaryChartTotal').textContent === '1');
    assert.equal(await page.$eval('#summaryChartTotal', node => node.textContent.trim()), '1');
    assert.equal(await page.$eval('#summaryChartOffDescription', node => node.textContent), 'Off day, 0 staff (0.0%)');
    assert.equal(await page.$eval('#summaryChartW02Description', node => node.textContent), 'W02 regular day, 1 staff (100.0%)');
    assert.equal(
      await page.$$eval('#summaryTableRowsContainer .summary-table-row.is-chart-selected', rows => rows.length),
      1
    );

    await page.click('#summaryTableRowsContainer .summary-table-row.is-chart-selected .headcount-detail-trigger');
    await page.waitForSelector('#headcountDetailPage:not([hidden])');
    assert.deepEqual(await page.$$eval('#headcountDetailPage dd', nodes => nodes.map(node => node.textContent)), ['Bartender', 'N/A', '1']);
    assert.equal(await page.$eval('#summaryChartTitle', node => node.textContent.trim()), 'BARTENDER by Shift');
    assert.deepEqual(errors, []);

    console.log('Shift Planning summary row chart refresh checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
