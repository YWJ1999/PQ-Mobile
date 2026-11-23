const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/staff-hours-summary.html')).href, { waitUntil: 'networkidle0' });

    const referencePage = await browser.newPage();
    await referencePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await referencePage.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/hours-summary.html')).href, { waitUntil: 'networkidle0' });
    const expectedSections = [
      ['Work & Attendance', ['Scheduled Work Days', 'Normal Present Days', 'Normal Work Hours', 'Odd Clocking Days']],
      ['Overtime Analytics', ['Normal OT Hours', 'Other OT Hours', 'Unapproved OT Hours', 'Plan OT Hours']],
      ['Exceptions & Leave', ['Absent OT Hours', 'Absent Days', 'Leave Hours', 'Lost Hours']]
    ];

    const readSections = target => target.$$eval('.hours-section', sections => sections.map(section => {
      const table = section.querySelector('table');
      const rows = [...table.tBodies[0].rows];
      const icon = rows[0].querySelector('.hours-metric-icon');
      return {
        title: section.querySelector('h2').textContent.trim(),
        columns: [...table.tHead.rows[0].cells].slice(1).map(cell => cell.textContent.trim()),
        names: rows.map(row => row.querySelector('button').textContent.trim()),
        cellsFit: rows.every(row => [...row.cells].every(cell => cell.scrollWidth <= cell.clientWidth + 1)),
        card: getComputedStyle(section.querySelector('.hours-metric-card')).backgroundColor,
        icon: getComputedStyle(icon).color,
        percent: getComputedStyle(rows[0].querySelector('.hours-metric-percent')).backgroundColor
      };
    }));

    for (const current of [page, referencePage]) {
      await current.addStyleTag({ content: '* { transition: none !important; animation: none !important; }' });
      assert.equal(await current.$eval('.hours-summary-header #filterSummaryText', el => el.textContent), '16 Aug – 14 Sep 2026');
      assert.equal(await current.$$eval('.hours-metric-percent', nodes => nodes.filter(node => node.textContent === '—').length), 2);
    }
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 390, 420]) {
        for (const current of [page, referencePage]) {
          await current.setViewport({ width, height: 844 });
          await current.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
        }
        const sections = await readSections(page);
        assert.deepEqual(sections, await readSections(referencePage), 'Both reports use the same table layout and colors');
        assert.deepEqual(sections.map(section => [section.title, section.names]), expectedSections);
        assert.ok(sections.every(section => section.cellsFit), 'Staff values fit at ' + width + 'px');
        sections.forEach(section => assert.deepEqual(section.columns, ['Total', '%']));
        assert.equal(new Set(sections.map(section => section.icon)).size, 3, 'Each group has a distinct icon color');
      }
    }
    await referencePage.close();

    assert.deepEqual(await page.evaluate(() => ({
      scheduled: document.getElementById('statScheduledDays').textContent.trim(),
      scheduledPct: document.getElementById('pctScheduledDays').textContent.trim(),
      present: document.getElementById('statPresentDays').textContent.trim(),
      presentPct: document.getElementById('pctPresentDays').textContent.trim(),
      normalHours: document.getElementById('statNormalWorkHours').textContent.trim(),
      odd: document.getElementById('statOddClocking').textContent.trim(),
      normalOt: document.getElementById('statNormalOt').textContent.trim(),
      unapprovedOt: document.getElementById('statUnapprovedOt').textContent.trim(),
      absentDays: document.getElementById('statAbsentDays').textContent.trim(),
      leaveHours: document.getElementById('statLeaveHours').textContent.trim(),
      lostHours: document.getElementById('statLostHours').textContent.trim()
    })), {
      scheduled: '168',
      scheduledPct: '100%',
      present: '135',
      presentPct: '80%',
      normalHours: '1,076.00',
      odd: '32',
      normalOt: '96.00',
      unapprovedOt: '14.00',
      absentDays: '39',
      leaveHours: '24.00',
      lostHours: '4.00'
    }, 'Dashboard totals must come from the active staff records');

    assert.deepEqual(await page.$$eval('#filterModal .claim-filter-fields > div', fields => fields.map(field => field.querySelector('label').textContent.trim())), [
      'Search keyword',
      'Start date',
      'End date',
      'Minimum present hours',
      'Company',
      'Cost centre'
    ]);

    await page.click('.bento-group-work .summary-kpi-card');
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#details-list-container .summary-history-card', node =>
      node.querySelector('.staff-name-text').nextElementSibling.textContent.trim()
    ), '#EBB01');
    await page.evaluate(() => goBack());

    await page.click('.staff-hours-filter-trigger');
    await page.select('#filterCompany', 'Tech Global Ltd');
    await page.click('#filterModal .claim-filter-apply');
    assert.deepEqual(await page.evaluate(() => ({
      scheduled: document.getElementById('statScheduledDays').textContent.trim(),
      present: document.getElementById('statPresentDays').textContent.trim(),
      normalHours: document.getElementById('statNormalWorkHours').textContent.trim(),
      planOt: document.getElementById('statPlannedOt').textContent.trim(),
      leaveHours: document.getElementById('statLeaveHours').textContent.trim()
    })), { scheduled: '42', present: '40', normalHours: '320.00', planOt: '8.00', leaveHours: '16.00' });
    assert.equal(await page.$eval('#hoursFilterDetails', node => node.innerText), 'Tech Global Ltd');
    assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.deepEqual(errors, []);

    console.log('PASS: Staff Hours Summary matches Hours Summary cards, metrics, filters and staff details.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
