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
      accent: getComputedStyle(card).borderLeftColor,
      name: card.querySelector('.ot-staff-name')?.textContent.trim(),
      idFollowsName: card.querySelector('.ot-staff-name')?.nextElementSibling?.classList.contains('emp-id-label') || false,
      id: card.querySelector('.emp-id-label')?.textContent.trim(),
      labels: [...card.querySelectorAll('.ot-staff-detail > span')].map(node => node.textContent.trim()),
      otHours: card.querySelector('.ot-hours-value')?.textContent.trim()
    }));

    assert.equal(firstCard.radius, '18px');
    assert.equal(firstCard.accent, 'rgb(16, 185, 129)');
    assert.equal(firstCard.name, 'Aqilah Antasha');
    assert.equal(firstCard.idFollowsName, true);
    assert.equal(firstCard.id, '#000008');
    assert.deepEqual(firstCard.labels, ['Job Title', 'Hours', 'MTD OT']);
    assert.equal(firstCard.otHours, '2.5 h');
    assert.equal(await page.$$eval('.ot-hours-input', inputs => inputs.length), 0);
    assert.equal(await page.$eval('#otDetailHoursLabel', node => node.textContent.trim()), 'Hours: 2.5 h');

    await page.click('.ot-edit-link');
    assert.equal(await page.$eval('#editOtDetailsModal', node => getComputedStyle(node).display), 'flex');
    assert.equal(await page.$('#modalStartDateDisplay'), null);
    assert.equal(await page.$('#modalEndDateDisplay'), null);
    const modalCopy = await page.$eval('#editOtDetailsModal', node => node.textContent);
    assert.doesNotMatch(modalCopy, /Use Next day when OT ends after midnight/);
    assert.doesNotMatch(modalCopy, /Individual hours can be adjusted in the staff list/);
    assert.equal(await page.$eval('label[for="modalDefaultHours"]', node => node.textContent.trim()), 'Hours');
    await page.evaluate(() => closeModal('editOtDetailsModal'));
    await new Promise(resolve => setTimeout(resolve, 320));

    const initiallySelected = await page.$eval('.ot-staff-card', card => card.classList.contains('selected'));
    await page.$eval('.ot-staff-card .ot-staff-summary-panel', panel => panel.scrollIntoView({ block: 'center' }));
    await page.click('.ot-staff-card .ot-staff-summary-panel');
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
    await page.evaluate(() => closeModal('staffOtHistoryModal'));
    await new Promise(resolve => setTimeout(resolve, 320));

    await page.click('.ot-staff-card .custom-checkbox');
    const selectedAfterClick = await page.$eval('.ot-staff-card', card => card.classList.contains('selected'));
    assert.notEqual(selectedAfterClick, initiallySelected);
    assert.equal(await page.$eval('#staffOtHistoryModal', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('PASS: OT Plan staff cards match the Shift Planning teal card design.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
