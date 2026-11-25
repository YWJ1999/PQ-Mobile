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
      cells.find(cell => cell.querySelector('.grid-cal-date')?.textContent.trim() === '17').click();
    });
    assert.ok(await page.$('#view-work-shift-summary'));
    assert.match(await page.$eval('[onclick*="view-work-shift-summary"]', node => node.getAttribute('onclick')), /openSummaryViewFromCal/);
    await page.$eval('[onclick*="view-work-shift-summary"]', node => node.click());

    assert.equal(await page.$eval('#view-work-shift-summary', node => node.classList.contains('active')), true);
    assert.match(await page.$eval('#view-work-shift-summary .shift-detail-info-date', node => node.textContent.replace(/\s+/g, ' ').trim()), /^Date: 17 Sep.* 2026$/);
    assert.match(await page.$eval('#wsSummaryDateFilter', node => node.textContent.trim()), /^17 Sep.* 2026$/);
    assert.equal(await page.$eval('#wsSummaryRecordCount', node => node.textContent.trim()), '1');
    assert.equal(await page.$$eval('#view-work-shift-summary .calendar-purple-card', cards => cards.length), 1);
    assert.equal(await page.$eval('#view-work-shift-summary .calendar-purple-card-title', node => node.textContent.trim()), '8.30:17.30W');
    assert.deepEqual(await page.$$eval('#view-work-shift-summary .calendar-purple-card .summary-value', nodes => nodes.map(node => node.textContent.trim())), ['268', '2,144.00', '0.00']);
    assert.ok(await page.$('#view-work-shift-summary .calendar-purple-card-header .fa-chevron-right'));

    await page.click('#view-work-shift-summary .calendar-purple-card');
    assert.equal(await page.$eval('#wsDetailHeadcount', node => node.textContent.trim()), '268');
    assert.equal(await page.$eval('#wsDetailScheduledHours', node => node.textContent.trim()), '2,144.00');
    assert.equal(await page.$eval('#wsDetailWorkHours', node => node.textContent.trim()), '0.00');
    const workDetailInfo = await readDetailInfoCard(page, '#view-work-shift-detail');
    assert.equal(workDetailInfo.iconCount, 0, 'Work Shift detail information must not show a date icon');
    assert.deepEqual(workDetailInfo.rows.map(row => row.label), ['Date:', 'Shift:', 'Total Headcount:', 'Total Scheduled Hours:', 'Total Work Hours:']);
    assert.match(workDetailInfo.rows[0].value, /^17 Sep.* 2026$/);
    assert.deepEqual(workDetailInfo.rows.slice(1).map(row => row.value), ['8.30:17.30W', '268', '2,144.00', '0.00']);
    assert.equal(workDetailInfo.rows.every(row => row.display === 'grid' && row.columnCount === 2 && row.valueAlign === 'right'), true, 'Work Shift detail labels and values must share aligned columns');
    assert.equal(workDetailInfo.rows.every(row => row.labelColor === 'rgb(100, 116, 139)'), true, 'Work Shift Date must use the same label color as every other field');
    assert.equal(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name', node => node.textContent.trim()), 'Aqilah Antasha');
    assert.equal(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name + .employee-card-id', node => node.textContent.trim()), '#000008');
    assert.equal(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child', node => getComputedStyle(node).flexDirection), 'column');
    assert.equal(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child .employee-purple-body', node => getComputedStyle(node).display), 'grid');
    assert.ok(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child .employee-purple-body', node => node.getBoundingClientRect().height >= 90));
    assert.ok(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child .employee-purple-body .summary-value', node => node.getBoundingClientRect().height > 0));
    assert.equal(await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child', node => node.clientHeight >= node.scrollHeight), true);
    const employeeCardColors = await page.$eval('#wsEmployeeCardsContainer .employee-purple-card:first-child', card => {
      const cardStyle = getComputedStyle(card);
      const headerStyle = getComputedStyle(card.querySelector('.employee-purple-header'));
      const detailStyle = getComputedStyle(card.querySelector('.calendar-purple-detail'));
      return {
        cardBackgroundImage: cardStyle.backgroundImage,
        cardBorderColor: cardStyle.borderTopColor,
        headerBackgroundImage: headerStyle.backgroundImage,
        headerBackgroundColor: headerStyle.backgroundColor,
        detailBorderColor: detailStyle.borderTopColor
      };
    });
    assert.equal(employeeCardColors.cardBackgroundImage, 'none');
    assert.equal(employeeCardColors.cardBorderColor, employeeCardColors.detailBorderColor);
    assert.equal(employeeCardColors.headerBackgroundImage, 'none');
    assert.notEqual(employeeCardColors.headerBackgroundColor, 'rgba(0, 0, 0, 0)');
    assert.equal(await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const backgroundImage = getComputedStyle(document.querySelector('#wsEmployeeCardsContainer .employee-purple-card:first-child')).backgroundImage;
      document.documentElement.setAttribute('data-theme', 'light');
      return backgroundImage;
    }), 'none');
    assert.equal(await page.$('#wsEmployeeCardsContainer .employee-purple-card .fa-chevron-right'), null);

    await page.evaluate(() => goBackToCalendar());
    await page.$eval('[onclick*="view-no-work-summary"]', node => node.click());
    assert.match(await page.$eval('#view-no-work-summary .shift-detail-info-date', node => node.textContent.replace(/\s+/g, ' ').trim()), /^Date: 17 Sep.* 2026$/);
    assert.equal(await page.$eval('#nwSummaryRecordCount', node => node.textContent.trim()), '1');
    assert.equal(await page.$eval('#view-no-work-summary .calendar-purple-card-title', node => node.textContent.trim()), 'Rest / Off Day');
    assert.equal(await page.$eval('#view-no-work-summary .summary-value', node => node.textContent.trim()), '13');
    assert.ok(await page.$('#view-no-work-summary .calendar-purple-card-header .fa-chevron-right'));
    await page.click('#view-no-work-summary .calendar-purple-card');
    assert.equal(await page.$$eval('#nwEmployeeCardsContainer .employee-purple-card', cards => cards.length), 13);
    assert.equal(await page.$eval('#nwEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name', node => node.textContent.trim()), 'TEST');
    assert.equal(await page.$eval('#nwEmployeeCardsContainer .employee-purple-card:first-child .employee-card-name + .employee-card-id', node => node.textContent.trim()), '#00012345');
    assert.equal(await page.$('#nwEmployeeCardsContainer .employee-purple-card .fa-chevron-right'), null);
    const noWorkDetailInfo = await readDetailInfoCard(page, '#view-no-work-detail');
    assert.equal(noWorkDetailInfo.iconCount, 0, 'No Work detail information must not show a date icon');
    assert.deepEqual(noWorkDetailInfo.rows.map(row => row.label), ['Date:', 'Shift:', 'Total Headcount:']);
    assert.match(noWorkDetailInfo.rows[0].value, /^17 Sep.* 2026$/);
    assert.deepEqual(noWorkDetailInfo.rows.slice(1).map(row => row.value), ['Rest / Off Day', '13']);
    assert.equal(noWorkDetailInfo.rows.every(row => row.display === 'grid' && row.columnCount === 2 && row.valueAlign === 'right'), true, 'No Work detail labels and values must share aligned columns');
    assert.equal(noWorkDetailInfo.rows.every(row => row.labelColor === 'rgb(100, 116, 139)'), true, 'No Work Date must use the same label color as every other field');
    assert.deepEqual(errors, []);
    console.log('PASS: Calendar Work Shift and No Work drill-downs use consistent purple cards and required data.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
