const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;

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

    assert.equal(await page.$$eval('.ot-staff-card', cards => cards.length), 6);
    assert.equal(await page.$$eval('.ot-staff-card .fa-chevron-right', icons => icons.length), 0);
    assert.equal(await page.$$eval('.ot-staff-card .staff-status-badge', badges => badges.length), 0);
    assert.equal(await page.$$eval('.ot-staff-card-top', rows => rows.length), 6);
    assert.equal(await page.$$eval('.ot-staff-summary-panel', panels => panels.length), 6);

    const firstCard = await page.$eval('.ot-staff-card', card => ({
      radius: getComputedStyle(card).borderRadius,
      headerBackground: getComputedStyle(card.querySelector('.history-card-header')).backgroundImage,
      name: card.querySelector('.ot-staff-name')?.textContent.trim(),
      labels: [...card.querySelectorAll('.ot-staff-detail > span')].map(node => node.textContent.trim()),
      job: card.querySelector('.ot-staff-job').textContent,
      otHours: card.querySelector('.ot-hours-input').value,
      mtd: card.querySelector('.ot-mtd-value').textContent
    }));

    assert.equal(firstCard.radius, '18px');
    assert.match(firstCard.headerBackground, /rgb\(21, 85, 63\).*rgb\(34, 129, 86\)/);
    assert.equal(firstCard.name, '000008 - Aqilah Antasha');
    assert.deepEqual(firstCard.labels, ['Planned OT', 'MTD OT']);
    assert.equal(firstCard.job, 'Admin Executive');
    assert.equal(firstCard.otHours, '2.5');
    assert.equal(firstCard.mtd, '7.5 h');
    assert.deepEqual(await page.$$eval('.ot-time-summary dd', nodes => nodes.map(node => node.innerText)), [
      '06:00 AM\nSame day', '08:30 AM\nSame day', '2.5 h'
    ]);

    await page.click('.ot-hours-field .fa-pen');
    assert.equal(await page.$eval('.ot-hours-input', input => input === document.activeElement), true);
    await page.keyboard.press('Home');
    await page.keyboard.down('Shift');
    await page.keyboard.press('End');
    await page.keyboard.up('Shift');
    await page.keyboard.type('3.25');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 99.36');
    assert.equal(await page.$eval('.ot-mtd-value', node => node.textContent), '7.5 h');
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent), '2');

    await page.click('.ot-edit-link');
    assert.equal(await page.$eval('#editOtDetailsModal', node => getComputedStyle(node).display), 'flex');
    assert.equal(await page.$('#modalStartDateDisplay'), null);
    assert.equal(await page.$('#modalEndDateDisplay'), null);
    const modalCopy = await page.$eval('#editOtDetailsModal', node => node.textContent);
    assert.doesNotMatch(modalCopy, /Use Next day when OT ends after midnight/);
    assert.doesNotMatch(modalCopy, /Individual hours can be adjusted in the staff list/);
    assert.equal(await page.$eval('label[for="modalDefaultHours"]', node => node.textContent.trim()), 'Hours');
    await page.$eval('#modalDefaultHours', input => { input.value = '4'; });
    await page.$eval('#modalStartTime', input => { input.value = '22:00'; });
    await page.$eval('#modalEndTime', input => { input.value = '02:00'; });
    await page.select('#modalEndDaySelect', 'Next day');
    await page.click('#editOtDetailsModal [type="submit"]');
    await page.waitForSelector('#editOtDetailsModal', { hidden: true });
    assert.deepEqual(await page.$$eval('.ot-time-summary dd', nodes => nodes.map(node => node.innerText)), [
      '10:00 PM\nSame day', '02:00 AM\nNext day', '4 h'
    ]);
    assert.deepEqual(await page.$$eval('.ot-hours-input', fields => fields.map(input => input.value)), ['3.25', '4', '4', '4', '4', '4']);
    assert.equal(await page.$eval('#estimatedCostText', node => node.textContent), 'RM 125.28');

    const initiallySelected = await page.$eval('.ot-staff-card', card => card.classList.contains('selected'));
    await page.click('.ot-staff-card .ot-mtd-value');
    await page.waitForSelector('#staffOtHistoryModal', { visible: true });
    assert.equal(await page.$eval('#staffOtHistoryModal', node => getComputedStyle(node).display), 'flex');
    assert.equal(await page.$eval('#staffHistoryEmployeeName', node => node.textContent.trim()), 'Aqilah Antasha');
    assert.equal(await page.$('#staffHistoryEmployeeId'), null);
    assert.equal(await page.$eval('#staffHistoryTotalRecords', node => node.textContent.trim()), '3');
    assert.equal(await page.$eval('#staffHistoryTotalHours', node => node.textContent.trim()), '7.50 h');
    assert.deepEqual(
      await page.$$eval('#staffHistoryTableHeader > span', cells => cells.map(cell => cell.textContent.trim())),
      ['Date', 'Shift', 'Hours']
    );
    assert.equal(await page.$$eval('#staffHistoryTableRows .staff-history-row', rows => rows.length), 3);
    assert.equal(
      await page.$$eval('#staffHistoryTableRows .staff-history-hours', cells => cells.reduce((total, cell) => total + Number.parseFloat(cell.textContent), 0)),
      7.5
    );
    assert.equal(await page.$eval('.ot-staff-card', card => card.classList.contains('selected')), initiallySelected);
    await page.click('#staffOtHistoryModal [data-history-back]');
    await page.waitForSelector('#staffOtHistoryModal', { hidden: true });

    await page.click('.ot-staff-card .custom-checkbox');
    const selectedAfterClick = await page.$eval('.ot-staff-card', card => card.classList.contains('selected'));
    assert.notEqual(selectedAfterClick, initiallySelected);
    assert.equal(await page.$eval('#staffOtHistoryModal', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('OT Plan staff cards show editable planned hours and open the matching MTD history.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
