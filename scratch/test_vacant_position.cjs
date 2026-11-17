const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const dashboard = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/index.html')).href;
const detailLabels = ['Job', 'Status', 'Grade', 'Last Incumbent', 'Since', 'Company', 'Department', 'Vacant Positions', 'Location', 'Access Code', 'Min Qualification', 'Opened On', 'Created On', 'Applicants'];

async function assertFits(page, context) {
  const overflow = await page.evaluate(() => ['html', '.phone-container', 'main'].map(selector => {
    const element = document.querySelector(selector);
    return element.scrollWidth - element.clientWidth;
  }));
  assert.ok(overflow.every(value => value <= 1), `${context}: no horizontal overflow (${overflow})`);
  if (!context.endsWith('details')) {
    assert.ok(await page.$eval('.bottom-nav', nav => nav.getBoundingClientRect().bottom <= innerHeight + 1), `${context}: bottom navigation stays within the phone viewport`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 920 });
      await page.goto(`${dashboard}?scope=team&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#employeeCareerVacantPositionTotal', node => node.textContent.trim()), '4', 'Dashboard counts open positions, excluding the closed HR vacancy');
      const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      await page.click('#employeeCareerVacantPosition');
      await navigation;
      assert.ok(page.url().includes('/vacant-position.html'));
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
      assert.equal(await page.$eval('#vacantPositionChartTotal', node => node.textContent.trim()), '4');
      assert.ok(await page.$('.active-headcount-chart-card .active-headcount-chart-heading #vacantPositionDetails'), 'View Details sits beside the title inside the chart card');
      assert.deepEqual(await page.$$eval('#vacantPositionChartLegend .staff-list-legend-row', rows => rows.map(row => [...row.children].map(cell => cell.textContent.trim()))), [
        ['ACCOUNT EXECUTIVE', '2', '50.00%'], ['SOFTWARE ENGINEER', '2', '50.00%']
      ], 'Chart aggregates duplicate job postings and counts positions rather than postings');
      await assertFits(page, `${theme} ${width} chart`);
      await page.screenshot({ path: path.resolve(__dirname, `vacant-position-chart-${theme}-${width}.png`) });
      await page.click('#vacantPositionDetails');
      assert.deepEqual(await page.$$eval('#vacantPositionSummaryView thead th', nodes => nodes.map(node => node.textContent.trim())), ['Job', 'Count']);
      assert.equal(await page.$eval('#vacantPositionSummaryView thead', node => getComputedStyle(node).color), 'rgb(255, 255, 255)');
      assert.equal(await page.$eval('#vacantPositionSummaryTotalRecords', node => node.textContent), '2');
      await assertFits(page, `${theme} ${width} summary`);
      await page.screenshot({ path: path.resolve(__dirname, `vacant-position-summary-${theme}-${width}.png`) });
      await page.click('[data-vacant-job="ACCOUNT EXECUTIVE"] td');
      assert.equal(await page.$eval('#vacantPositionRecordsView', node => node.hidden), false);
      assert.equal(await page.$eval('#vacantPositionRecordsTotal', node => node.textContent), '2');
      assert.deepEqual(await page.$$eval('[data-vacancy-id]', cards => cards.map(card => card.dataset.vacancyId)), ['vac-account-01', 'vac-account-02']);
      assert.deepEqual(await page.$eval('[data-vacancy-id="vac-account-01"]', card => ({
        title: card.querySelector('.employee-name').textContent.trim(),
        fields: [...card.querySelectorAll('.manpower-employee-card-row')].map(row => [...row.children].map(cell => cell.textContent.trim())),
        companyShown: card.textContent.includes('PEOPLE QUEST SDN BHD')
      })), {
        title: 'ACCOUNT EXECUTIVE',
        fields: [['Grade', 'G2-EXECUTIVE'], ['Last Incumbent', 'Lim Mei Ling'], ['Since', '02 Apr 2025']],
        companyShown: false
      }, 'Vacancy card shows the position title and grade, last incumbent and since date');
      assert.ok(await page.$$eval('[data-vacancy-id]', cards => cards.every(card => {
        const header = card.querySelector('.manpower-employee-identity');
        const title = header?.querySelector('.employee-name');
        const details = card.querySelector('.manpower-employee-card-details');
        const style = getComputedStyle(card);
        return Boolean(title)
          && getComputedStyle(title).color === 'rgb(255, 255, 255)'
          && getComputedStyle(header).backgroundImage.includes('linear-gradient')
          && style.borderLeftWidth === style.borderRightWidth
          && style.borderLeftColor === style.borderRightColor
          && details?.children.length === 3
          && [...details.children].every(row => parseFloat(getComputedStyle(row).borderWidth) >= 1);
      })), 'Vacancy cards use a purple title header and three bordered detail fields');
      await assertFits(page, `${theme} ${width} records`);
      await page.screenshot({ path: path.resolve(__dirname, `vacant-position-records-${theme}-${width}.png`) });
      await page.click('[data-vacancy-id="vac-account-01"]');
      assert.equal(await page.$eval('#vacantPositionDetailOverlay', node => node.hidden), false);
      assert.deepEqual(await page.$$eval('#vacantPositionDetailTable th', nodes => nodes.map(node => node.textContent.trim())), detailLabels);
      assert.deepEqual(await page.$$eval('#vacantPositionDetailTable tbody tr', rows => rows.slice(2, 5).map(row => row.querySelector('td').textContent.trim())), ['G2-EXECUTIVE', 'Lim Mei Ling', '02 Apr 2025'], 'Details and card show the same vacancy metadata');
      assert.equal(await page.$eval('main', node => node.inert), true);
      await assertFits(page, `${theme} ${width} details`);
      await page.screenshot({ path: path.resolve(__dirname, `vacant-position-detail-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.vacancyId), 'vac-account-01');
      assert.equal(await page.$eval('main', node => node.inert), false);
      await page.click('#vacantPositionBack');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.vacantJob), 'ACCOUNT EXECUTIVE');
      await page.focus('[data-vacant-job="SOFTWARE ENGINEER"]');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#vacantPositionRecordsTotal', node => node.textContent), '1');
      await page.click('[data-vacancy-id="vac-engineer-01"]');
      assert.equal(await page.$$eval('#vacantPositionDetailTable tbody tr', rows => rows.find(row => row.querySelector('th').textContent === 'Vacant Positions').querySelector('td').textContent), '2');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'vacantPositionDetailClose', 'Tab stays within vacancy details');
      await page.click('#vacantPositionDetailClose');
      await page.click('#vacantPositionBack');
      await page.keyboard.press('Space');
      assert.equal(await page.$eval('#vacantPositionRecordsTotal', node => node.textContent), '1', 'Space also opens the focused job');
      await page.click('#vacantPositionBack');
      await page.click('#vacantPositionBack');
      const changedTheme = theme === 'light' ? 'dark' : 'light';
      await page.click(`preview-top-bar [data-set-theme="${changedTheme}"]`);
      const backNavigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      await page.click('#vacantPositionBack');
      await backNavigation;
      assert.equal(new URL(page.url()).searchParams.get('theme'), changedTheme);
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'team');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: Vacant Position dashboard count, chart, job summary, vacancy details, keyboard, themes and mobile layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
