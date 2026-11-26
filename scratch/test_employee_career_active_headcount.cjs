const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const dashboardPath = path.resolve(__dirname, '../modules/employee-career/index.html');
const activeHeadcountSuffix = '/modules/employee-career/options/team/active-headcount.html';
const statusCounts = [
  ['other', 'Other', 108],
  ['due-to-retire', 'Due to Retire', 77],
  ['probation-overdue', 'Probation Overdue', 52],
  ['confirmed', 'Confirmed', 18],
  ['contract-due', 'Contract Due', 14],
  ['temporary', 'Temporary', 5],
  ['on-contract', 'On Contract', 4],
  ['on-probation', 'On Probation', 3]
];
const employeeDetailLabels = [
  'Employee No.', 'Name', 'Position', 'Superior', 'Job', 'Company', 'Branch',
  'Base', 'Division', 'Department', 'Section', 'Cost Center', 'Line', 'Service Years'
];

function normalizedPath(url) {
  return decodeURIComponent(new URL(url).pathname).replace(/\\/g, '/');
}

async function assertNoHorizontalOverflow(page, context) {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main');
    const phone = document.querySelector('.phone-container');
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      phone: phone ? phone.scrollWidth - phone.clientWidth : 0,
      main: main ? main.scrollWidth - main.clientWidth : 0
    };
  });
  for (const [surface, amount] of Object.entries(overflow)) {
    assert.ok(amount <= 1, `${context}: ${surface} must not overflow horizontally (overflow ${amount}px)`);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });

  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.setViewport({ width, height: 920 });
      await page.goto(`${pathToFileURL(dashboardPath).href}?scope=team&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.equal(
        await page.$eval('#employeeCareerActiveHeadcountTotal', node => node.textContent.trim()),
        '281',
        'The dashboard and Active Headcount report use the same total'
      );

      const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => null);
      await page.click('#employeeCareerActiveHeadcount');
      await navigation;
      assert.ok(
        normalizedPath(page.url()).endsWith(activeHeadcountSuffix),
        `${theme} ${width}px: Active Headcount must navigate to its chart page`
      );
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme, 'Active Headcount navigation preserves the theme');

      assert.equal(await page.$eval('#activeHeadcountChartView', node => node.hidden), false);
      assert.equal(await page.$eval('#activeHeadcountChartTotal', node => node.textContent.trim()), '281');
      assert.deepEqual(
        await page.$$eval('[data-headcount-chart-status]', rows => rows.map(row => [
          row.dataset.headcountChartStatus,
          row.querySelector('.active-headcount-status-label').textContent.trim(),
          Number(row.querySelector('.active-headcount-status-count').textContent.trim())
        ])),
        statusCounts,
        `${theme} ${width}px: the chart legend uses the eight approved status counts`
      );
      assert.equal(
        await page.$$eval('#activeHeadcountChartSegments circle', nodes => nodes.length),
        8,
        'The donut renders one segment per status'
      );
      await assertNoHorizontalOverflow(page, `${theme} ${width}px chart`);
      assert.equal(await page.$eval('#activeHeadcountDetails', button => button.textContent.trim()), 'View Details');
      assert.ok(await page.$('#activeHeadcountDetails .fa-list-ul'), 'View Details includes its list icon');
      assert.equal(await page.$eval('#activeHeadcountDetails', button => getComputedStyle(button).backgroundImage), 'none', 'View Details uses the Highlight action button surface');
      await page.screenshot({ path: path.resolve(__dirname, `active-headcount-view-details-${theme}-${width}.png`) });

      await page.click('#activeHeadcountDetails');
      assert.equal(await page.$eval('#activeHeadcountChartView', node => node.hidden), true);
      assert.equal(await page.$eval('#activeHeadcountSummaryView', node => node.hidden), false);
      assert.equal(await page.$eval('#activeHeadcountSummaryTotalRecords', node => node.textContent.trim()), '8');
      assert.deepEqual(
        await page.$$eval('#activeHeadcountSummaryView table thead th', cells => cells.map(cell => cell.textContent.trim())),
        ['Status', 'Count'],
        'Status summary is a table with Status and Count columns'
      );
      assert.deepEqual(
        await page.$$eval('[data-headcount-status-summary]', rows => rows.map(row => [
          row.dataset.headcountStatusSummary,
          row.querySelector('.active-headcount-status-label').textContent.trim(),
          Number(row.querySelector('.active-headcount-status-count').textContent.trim())
        ])),
        statusCounts,
        'Details shows all eight status summaries'
      );
      await assertNoHorizontalOverflow(page, `${theme} ${width}px status summary`);
      await page.screenshot({ path: path.resolve(__dirname, `active-headcount-status-table-${theme}-${width}.png`) });

      await page.click('[data-headcount-status-summary="other"] td');
      assert.equal(await page.$eval('#activeHeadcountStaffTotalRecords', node => node.textContent.trim()), '108');
      assert.equal(await page.$$eval('#activeHeadcountStaffList .active-headcount-employee-card', cards => cards.length), 108);
      await assertNoHorizontalOverflow(page, `${theme} ${width}px other active staff`);
      await page.screenshot({ path: path.resolve(__dirname, `active-headcount-staff-cards-${theme}-${width}.png`) });
      await page.click('#activeHeadcountBack');

      await page.click('[data-headcount-status-summary="confirmed"] td');
      assert.equal(await page.$eval('#activeHeadcountSummaryView', node => node.hidden), true);
      assert.equal(await page.$eval('#activeHeadcountStaffView', node => node.hidden), false);
      assert.equal(await page.$eval('#activeHeadcountStaffTotalRecords', node => node.textContent.trim()), '18');
      assert.equal(await page.$$eval('#activeHeadcountStaffList .active-headcount-employee-card', cards => cards.length), 18);
      assert.ok(await page.$$eval('#activeHeadcountStaffList .active-headcount-employee-card', cards => cards.every(card => {
        const name = card.querySelector('.employee-name');
        const grade = card.querySelector('.active-headcount-employee-grade');
        const position = card.querySelector('.active-headcount-employee-position');
        const header = card.querySelector('.manpower-employee-identity');
        const details = card.querySelector('.manpower-employee-card-details');
        const style = getComputedStyle(card);
        return /^[^\s#]+ - .+/.test(name?.textContent.trim() || '')
          && Boolean(grade?.textContent.trim())
          && Boolean(position?.textContent.trim())
          && header?.contains(name)
          && getComputedStyle(header).backgroundImage.includes('linear-gradient')
          && getComputedStyle(name).color === 'rgb(255, 255, 255)'
          && style.borderLeftWidth === style.borderRightWidth
          && style.borderLeftColor === style.borderRightColor
          && details?.children.length === 2
          && [...details.children].every(row => parseFloat(getComputedStyle(row).borderWidth) >= 1)
          && parseFloat(style.borderRadius) >= 18
          && !card.querySelector('.fa-chevron-right');
      })), 'Staff cards show name and #ID in a purple header, with bordered Grade and Position details below');
      await assertNoHorizontalOverflow(page, `${theme} ${width}px confirmed staff`);

      const firstEmployeeSelector = '#activeHeadcountStaffList .active-headcount-employee-card';
      await page.$eval('phone-bottom-nav', node => { node.inert = true; });
      await page.click(firstEmployeeSelector);
      assert.equal(await page.$eval('#activeHeadcountEmployeeOverlay', node => node.hidden), false);
      assert.equal(await page.$eval('preview-top-bar', node => node.inert), true, 'Modal makes the external theme controls inert');
      assert.ok(await page.$$eval('.phone-container > *:not(#activeHeadcountEmployeeOverlay)', nodes => nodes.every(node => node.inert)), 'Modal makes every phone background surface inert');
      assert.deepEqual(
        await page.$$eval('#activeHeadcountEmployeeDetails th', nodes => nodes.map(node => node.textContent.trim())),
        employeeDetailLabels,
        'Employee details preserve every required field'
      );
      assert.ok(await page.$$eval('#activeHeadcountEmployeeDetails td', nodes => nodes.every(node => node.textContent.trim().length > 0)));
      assert.ok(await page.$eval('#activeHeadcountEmployeePortrait', node => Boolean(node.querySelector('img, .active-headcount-employee-avatar'))), 'Employee details includes a portrait or initials fallback');
      const modalHeader = await page.$eval('#activeHeadcountEmployeeOverlay .active-headcount-detail-header', node => {
        const style = getComputedStyle(node);
        return { backgroundImage: style.backgroundImage, color: style.color };
      });
      assert.match(modalHeader.backgroundImage, /linear-gradient|rgb\(124, 58, 237\)|rgb\(109, 40, 217\)/, 'Employee detail header is purple');
      assert.equal(modalHeader.color, 'rgb(255, 255, 255)');
      await assertNoHorizontalOverflow(page, `${theme} ${width}px employee details`);

      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'activeHeadcountEmployeeClose', 'Tab remains trapped in the modal');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#activeHeadcountEmployeeOverlay', node => node.hidden), true);
      assert.equal(await page.evaluate(selector => document.activeElement === document.querySelector(selector), firstEmployeeSelector), true, 'Closing details restores employee-card focus');
      assert.equal(await page.$eval('preview-top-bar', node => node.inert), false, 'Closing details restores external controls');
      assert.equal(await page.$eval('phone-bottom-nav', node => node.inert), true, 'Closing details preserves a pre-existing inert state');
      await page.$eval('phone-bottom-nav', node => { node.inert = false; });

      await page.click(firstEmployeeSelector);
      await page.$eval('#activeHeadcountEmployeeOverlay', node => node.click());
      assert.equal(await page.$eval('#activeHeadcountEmployeeOverlay', node => node.hidden), true, 'Clicking the backdrop closes employee details');
      assert.equal(await page.evaluate(selector => document.activeElement === document.querySelector(selector), firstEmployeeSelector), true);

      await page.click('#activeHeadcountBack');
      assert.equal(await page.$eval('#activeHeadcountSummaryView', node => node.hidden), false);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.headcountStatusSummary), 'confirmed');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#activeHeadcountStaffTotalRecords', node => node.textContent.trim()), '18', 'Enter opens the focused status row');
      await page.click('#activeHeadcountBack');
      await page.keyboard.press('Space');
      assert.equal(await page.$eval('#activeHeadcountStaffView', node => node.hidden), false, 'Space opens the focused status row');
      await page.click('#activeHeadcountBack');
      await page.click('#activeHeadcountBack');
      assert.equal(await page.$eval('#activeHeadcountChartView', node => node.hidden), false);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'activeHeadcountDetails');

      const switchedTheme = theme === 'light' ? 'dark' : 'light';
      await page.click(`preview-top-bar [data-set-theme="${switchedTheme}"]`);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), switchedTheme);
      const dashboardNavigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      await page.click('#activeHeadcountBack');
      await dashboardNavigation;
      assert.ok(normalizedPath(page.url()).endsWith('/modules/employee-career/index.html'));
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'team');
      assert.equal(new URL(page.url()).searchParams.get('theme'), switchedTheme, 'Back navigation preserves a theme changed on the report page');
      assert.ok(await page.$('#employeeCareerActiveHeadcount'));

      assert.deepEqual(pageErrors, [], `${theme} ${width}px: no page errors`);
      await page.close();
    }

    console.log('PASS: Active Headcount chart, status summary, confirmed staff cards, employee details and back flow.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
