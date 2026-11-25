const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

async function readDetailInfoCard(page, viewSelector) {
  return page.$eval(`${viewSelector} .shift-detail-info-card`, card => ({
    iconCount: card.querySelectorAll('i').length,
    rows: [...card.querySelectorAll('.shift-detail-info-row')].map(row => {
      const label = row.querySelector('.shift-detail-info-label');
      const value = row.querySelector('.shift-detail-info-value');
      const rowStyle = getComputedStyle(row);
      return {
        label: label?.textContent.trim() || '',
        value: value?.textContent.trim() || '',
        display: rowStyle.display,
        columnCount: rowStyle.gridTemplateColumns.split(' ').filter(Boolean).length,
        labelColor: label ? getComputedStyle(label).color : '',
        valueAlign: value ? getComputedStyle(value).textAlign : ''
      };
    })
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
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });

    await page.click('#tabCalendarBtn');
    await page.$$eval('#gridCalDays .grid-cal-cell', cells => {
      cells.find(cell => cell.querySelector('.grid-cal-date')?.textContent.trim() === '3').click();
    });

    await page.$eval('[onclick*="view-ot-plan-summary"]', node => node.click());
    assert.match(await page.$eval('#view-ot-plan-summary .shift-detail-info-date', node => node.textContent.replace(/\s+/g, ' ').trim()), /^Date: 03 Sep.* 2026$/);
    assert.equal(await page.$eval('#otSummaryRecordCount', node => node.textContent.trim()), '2');
    assert.equal(await page.$$eval('#view-ot-plan-summary .calendar-purple-card', cards => cards.length), 2);
    assert.deepEqual(
      await page.$$eval('#view-ot-plan-summary .calendar-purple-card', cards => cards.map(card => ({
        title: card.querySelector('.calendar-purple-card-title').textContent.trim(),
        values: [...card.querySelectorAll('.summary-value')].map(node => node.textContent.trim())
      }))),
      [
        { title: '8.30:17.30W', values: ['OT 1.5 BEFORE WORK', '26', '26.00'] },
        { title: '8.30:17.30W', values: ['1.5 OT', '55', '94.00'] }
      ]
    );
    assert.equal(await page.$$eval('#view-ot-plan-summary .calendar-purple-card-header .fa-chevron-right', icons => icons.length), 2);

    await page.click('#view-ot-plan-summary .calendar-purple-card');
    assert.equal(await page.$eval('#otDetailOtType', node => node.textContent.trim()), 'OT 1.5 BEFORE WORK');
    assert.equal(await page.$eval('#otDetailHeadcount', node => node.textContent.trim()), '26');
    assert.equal(await page.$eval('#otDetailTotalHours', node => node.textContent.trim()), '26.00');
    assert.equal(await page.$$eval('#otEmployeeCardsContainer .employee-purple-card', cards => cards.length), 26);
    assert.equal(await page.$eval('#otEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name', node => node.textContent.trim()), 'Raju Kumar');
    assert.equal(await page.$eval('#otEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name + .employee-card-id', node => node.textContent.trim()), '#000016');
    assert.deepEqual(
      await page.$$eval('#otEmployeeCardsContainer .employee-purple-card:first-child .summary-value', nodes => nodes.map(node => node.textContent.trim())),
      ['ACCOUNT EXECUTIVE', '1.00']
    );
    assert.equal(await page.$('#otEmployeeCardsContainer .employee-purple-card .fa-chevron-right'), null);
    const otDetailInfo = await readDetailInfoCard(page, '#view-ot-plan-detail');
    assert.equal(otDetailInfo.iconCount, 0, 'OT Plan detail information must not show a date icon');
    assert.deepEqual(otDetailInfo.rows.map(row => row.label), ['Date:', 'Shift:', 'OT Type:', 'Total Headcount:', 'Total Hours:']);
    assert.match(otDetailInfo.rows[0].value, /^03 Sep.* 2026$/);
    assert.deepEqual(otDetailInfo.rows.slice(1).map(row => row.value), ['8.30:17.30W', 'OT 1.5 BEFORE WORK', '26', '26.00']);
    assert.equal(otDetailInfo.rows.every(row => row.display === 'grid' && row.columnCount === 2 && row.valueAlign === 'right'), true, 'OT Plan detail labels and values must share aligned columns');
    assert.equal(otDetailInfo.rows.every(row => row.labelColor === 'rgb(100, 116, 139)'), true, 'OT Plan Date must use the same label color as every other field');
    assert.equal(await page.$eval('#otDetailOtType', node => getComputedStyle(node).color), 'rgb(124, 58, 237)', 'OT Type must keep its existing purple emphasis');

    await page.evaluate(() => switchView('view-leave-summary'));
    assert.match(await page.$eval('#view-leave-summary .shift-detail-info-date', node => node.textContent.replace(/\s+/g, ' ').trim()), /^Date: 03 Sep.* 2026$/);
    assert.equal(await page.$eval('#lvSummaryRecordCount', node => node.textContent.trim()), '3');
    assert.equal(await page.$$eval('#view-leave-summary .calendar-purple-card', cards => cards.length), 3);
    assert.deepEqual(
      await page.$$eval('#view-leave-summary .calendar-purple-card', cards => cards.map(card => ({
        title: card.querySelector('.calendar-purple-card-title').textContent.trim(),
        values: [...card.querySelectorAll('.summary-value')].map(node => node.textContent.trim())
      }))),
      [
        { title: '8.30:17.30W', values: ['ANNUAL LEAVE', '2.00'] },
        { title: '8.30:17.30W', values: ['MEDICAL LEAVE', '3.00'] },
        { title: '8.30:17.30W', values: ['UNPAID LEAVE', '1.00'] }
      ]
    );
    assert.equal(await page.$$eval('#view-leave-summary .calendar-purple-card-header .fa-chevron-right', icons => icons.length), 3);

    await page.click('#view-leave-summary .calendar-purple-card:nth-child(2)');
    assert.equal(await page.$eval('#lvDetailHeadcount', node => node.textContent.trim()), '3');
    assert.equal(await page.$$eval('#lvEmployeeCardsContainer .employee-purple-card', cards => cards.length), 3);
    assert.equal(await page.$eval('#lvEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name', node => node.textContent.trim()), 'Ww');
    assert.equal(await page.$eval('#lvEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name + .employee-card-id', node => node.textContent.trim()), '#000073');
    assert.deepEqual(
      await page.$$eval('#lvEmployeeCardsContainer .employee-purple-card:first-child .summary-value', nodes => nodes.map(node => node.textContent.trim())),
      ['BFT & COM.EXECUTIVE', 'MEDICAL LEAVE', '1.00']
    );
    assert.equal(await page.$('#lvEmployeeCardsContainer .employee-purple-card .fa-chevron-right'), null);
    const leaveDetailInfo = await readDetailInfoCard(page, '#view-leave-detail');
    assert.equal(leaveDetailInfo.iconCount, 0, 'Leave detail information must not show a date icon');
    assert.deepEqual(leaveDetailInfo.rows.map(row => row.label), ['Date:', 'Shift:', 'Total Headcount:']);
    assert.match(leaveDetailInfo.rows[0].value, /^03 Sep.* 2026$/);
    assert.deepEqual(leaveDetailInfo.rows.slice(1).map(row => row.value), ['8.30:17.30W', '3']);
    assert.equal(leaveDetailInfo.rows.every(row => row.display === 'grid' && row.columnCount === 2 && row.valueAlign === 'right'), true, 'Leave detail labels and values must share aligned columns');
    assert.equal(leaveDetailInfo.rows.every(row => row.labelColor === 'rgb(100, 116, 139)'), true, 'Leave Date must use the same label color as every other field');

    assert.deepEqual(errors, []);
    console.log('PASS: OT Plan and Leave drill-downs use consistent purple cards and supplied data.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
