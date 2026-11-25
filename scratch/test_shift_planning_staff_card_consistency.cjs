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

    assert.equal(await page.$$eval('.staff-card', cards => cards.length), 6);
    assert.equal(await page.$$eval('.staff-card .fa-chevron-right', icons => icons.length), 0);
    assert.equal(await page.$$eval('.staff-card-top', rows => rows.length), 6);
    assert.equal(await page.$$eval('.staff-card-summary-panel', panels => panels.length), 6);

    const firstCard = await page.$eval('.staff-card', card => ({
      radius: getComputedStyle(card).borderRadius,
      idFollowsName: card.querySelector('.staff-name')?.nextElementSibling?.classList.contains('emp-id-label') || false,
      id: card.querySelector('.emp-id-label')?.textContent.trim(),
      labels: [...card.querySelectorAll('.staff-card-detail > span')].map(node => node.textContent.trim()),
      values: [...card.querySelectorAll('.staff-card-detail > strong')].map(node => node.textContent.trim()),
      checkboxOnLeft: card.querySelector('.staff-select-control').getBoundingClientRect().right < card.querySelector('.staff-name').getBoundingClientRect().left,
      columns: getComputedStyle(card.querySelector('.staff-card-summary-panel')).gridTemplateColumns.split(' ').length
    }));
    assert.equal(firstCard.radius, '18px');
    assert.equal(firstCard.idFollowsName, true);
    assert.equal(firstCard.id, '#000008');
    assert.deepEqual(firstCard.labels, ['Job Title', 'Shift Group', 'Current Shift', 'Day Type']);
    assert.deepEqual(firstCard.values, ['Admin Executive', 'Group G', 'W01', 'Workday']);
    assert.ok(firstCard.checkboxOnLeft);
    assert.equal(firstCard.columns, 2);
    assert.equal(await page.$$eval('.staff-status-badge', badges => badges.length), 0);

    const cardStyles = await page.$$eval('.staff-card', cards => cards.map(card => ({
      hasStatus: card.hasAttribute('data-status'),
      headerFill: getComputedStyle(card.querySelector('.history-card-header')).backgroundImage,
      cardFill: getComputedStyle(card).getPropertyValue('--record-header-fill').trim(),
      expectedFill: getComputedStyle(card).getPropertyValue(card.querySelector('input').disabled ? '--record-cancelled-surface' : '--record-approved-surface').trim()
    })));
    assert.ok(cardStyles.every(card => card.hasStatus === false));
    assert.ok(cardStyles.every(card => card.headerFill.startsWith('linear-gradient') && card.cardFill === card.expectedFill));

    const initiallySelected = await page.$eval('.staff-card', card => card.classList.contains('selected'));
    await page.click('.staff-card');
    const selectedAfterClick = await page.$eval('.staff-card', card => card.classList.contains('selected'));
    assert.notEqual(selectedAfterClick, initiallySelected);
    await page.focus('.staff-card input');
    await page.keyboard.press('Space');
    assert.equal(await page.$eval('.staff-card input', input => input === document.activeElement && !input.checked), true);
    assert.equal(await page.$eval('#selectedRecordsText', node => node.textContent), '0');
    assert.deepEqual(errors, []);
    console.log('PASS: Shift Planning staff cards use the Attendance layout and support pointer and keyboard selection.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
