const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/manpower-stats.html')).href;

// Catch mismatched chart totals, ignored organization filters, and date boundary errors.
const fixture = [
  { company: 'Alpha', branch: 'HQ', department: 'Finance', jobType: 'ACCOUNT EXECUTIVE', headcount: 4, effectiveFrom: '2026-10-01' },
  { company: 'Alpha', branch: 'North', department: 'Finance', jobType: 'ACCOUNT EXECUTIVE', headcount: 2, effectiveFrom: '2026-10-05' },
  { company: 'Beta', branch: 'HQ', department: 'Administration', jobType: 'ADMIN MANAGER', headcount: 3, effectiveFrom: '2026-09-01', effectiveTo: '2026-10-04' },
  { company: 'Beta', branch: 'South', department: 'Operations', jobType: 'TECHNICIAN', headcount: 7, effectiveFrom: '2026-10-05' }
];
const statisticsLabels = [
  'Description', 'Headcount', 'Average Age', 'Average Service Years',
  'Average Competency Points', 'Average Competency Match %', 'Average Basic Pay',
  'Median Basic Pay', 'Minimum Basic Pay', 'Maximum Basic Pay',
  'Average Increment %', 'Average Bonus Factor', 'Attendance %',
  'Average Monthly OT Hours', 'Average Training Cost',
  'Average Performance Score', 'Annual Attrition %'
];
const employeeDetailLabels = [
  'Employee No.', 'Name', 'Position', 'Superior', 'Job', 'Company', 'Branch',
  'Base', 'Division', 'Department', 'Section', 'Cost Center', 'Line', 'Service Years'
];
const controlledAggregate = [
  { company: 'Alpha', branch: 'HQ', department: 'Finance', jobType: 'ACCOUNT EXECUTIVE', headcount: 2, effectiveFrom: '2026-01-01' }
];
const controlledStaff = [
  {
    empNo: '000001', name: 'Aina', position: 'ACCOUNT EXECUTIVE', superior: 'FINANCE MANAGER',
    job: 'ACCOUNT EXECUTIVE', jobType: 'ACCOUNT EXECUTIVE', company: 'Alpha', branch: 'HQ',
    base: 'KUALA LUMPUR', division: 'CORPORATE SERVICES', department: 'Finance', section: 'ACCOUNTS',
    costCenter: 'FINANCE', line: 'GENERAL', hireDate: '2016-10-05', birthDate: '1996-10-05',
    category: 'Executive', gender: 'Female', grade: 'G2', skillGroup: 'Finance', talentGroup: 'High Potential',
    competencyPoints: 6, competencyMatchPercent: 80, basicPay: 2000, incrementPercent: 2,
    bonusFactor: 1, attendancePercent: 90, monthlyOtHours: 2, trainingCost: 200,
    performanceScore: 80, annualAttritionPercent: 1, effectiveFrom: '2026-01-01'
  },
  {
    empNo: '000002', name: 'Ben', position: 'ACCOUNT EXECUTIVE', superior: 'FINANCE MANAGER',
    job: 'ACCOUNT EXECUTIVE', jobType: 'ACCOUNT EXECUTIVE', company: 'Alpha', branch: 'HQ',
    base: 'KUALA LUMPUR', division: 'CORPORATE SERVICES', department: 'Finance', section: 'ACCOUNTS',
    costCenter: 'FINANCE', line: 'GENERAL', hireDate: '2021-10-05', birthDate: '1986-10-05',
    category: 'Executive', gender: 'Male', grade: 'G3', skillGroup: 'Finance', talentGroup: 'Core Talent',
    competencyPoints: 8, competencyMatchPercent: 90, basicPay: 4000, incrementPercent: 4,
    bonusFactor: 2, attendancePercent: 100, monthlyOtHours: 4, trainingCost: 400,
    performanceScore: 90, annualAttritionPercent: 3, effectiveFrom: '2026-01-01'
  }
];
const missingValueAggregate = [
  { company: 'Alpha', branch: 'HQ', department: 'Finance', jobType: 'ACCOUNT EXECUTIVE', headcount: 1, effectiveFrom: '2026-01-01' }
];
const missingValueStaff = [{
  ...controlledStaff[0],
  base: '',
  line: null,
  photo: ''
}];

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const table = () => page.$$eval('#manpowerTable tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent)));
    const apply = async values => {
      await page.click('#manpowerFilterTrigger');
      for (const [id, value] of Object.entries(values)) {
        await page.$eval('#' + id, (element, next) => { element.value = next; element.dispatchEvent(new Event('change', { bubbles: true })); }, value);
      }
      await page.click('#manpowerApplyFilter');
    };
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'load' });
      assert.equal(await page.$eval('#manpowerTotalRecords', n => n.textContent), '34');
      assert.equal(await page.$eval('#manpowerTotalHeadcount', n => n.textContent), '282');
      assert.equal(await page.$('#manpowerDateSummary'), null, 'Effective Date is not repeated in the summary card');
      assert.equal(await page.$eval('.staff-list-action-summary', n => n.textContent.includes('Effective Date')), false);
      assert.deepEqual((await table()).slice(0, 6), [
        ['ACCOUNT EXECUTIVE', '48'], ['ACCOUNT MANAGER', '12'], ['ADMIN EXECUTIVE', '17'],
        ['ADMIN MANAGER', '10'], ['BANK TELLER OFFICER', '10'], ['BARISTA', '12']
      ]);
      assert.equal(await page.$$eval('#manpowerTable tbody td:first-child button', buttons => buttons.length), 34);
      assert.equal(await page.$eval('#manpowerTable tbody td:first-child button', button => button.getAttribute('aria-label')), 'View statistics for ACCOUNT EXECUTIVE');
      await page.click('#manpowerTable tbody td:first-child button');
      assert.ok(await page.$eval('#manpowerStatisticsOverlay', overlay => !overlay.hidden));
      assert.equal(await page.$eval('#manpowerStatisticsDialogTitle', title => title.textContent), 'Manpower Statistics');
      assert.deepEqual(await page.$$eval('#manpowerStatisticsDetails th', cells => cells.map(cell => cell.textContent)), statisticsLabels);
      await page.click('#manpowerStatisticsClose');
      assert.equal(await page.$$eval('#manpowerTable tbody td:last-child button', buttons => buttons.length), 34);
      assert.equal(await page.$eval('#manpowerTable tbody td:last-child button', button => button.getAttribute('aria-label')), 'View 48 staff records for ACCOUNT EXECUTIVE');
      const tableScroll = await page.$eval('main', main => {
        main.scrollTop = 240;
        return main.scrollTop;
      });
      await page.click('#manpowerTable tbody td:last-child button');
      assert.ok(await page.$eval('#manpowerStaffView', section => !section.hidden));
      assert.ok(await page.$eval('#manpowerTableView', section => section.hidden));
      assert.ok(await page.$eval('#manpowerChartView', section => section.hidden));
      assert.equal(await page.$eval('#manpowerTitle', title => title.textContent), 'ACCOUNT EXECUTIVE Staff Records');
      assert.equal(await page.$eval('#manpowerStaffTotalRecords', value => value.textContent), '48');
      assert.equal(await page.$$eval('#manpowerStaffList .manpower-employee-card', cards => cards.length), 48);
      assert.ok(await page.$$eval('#manpowerStaffList .manpower-employee-card', cards => cards.every(card => {
        const header = card.querySelector('.manpower-employee-identity');
        const details = card.querySelector('.manpower-employee-card-details');
        const name = header?.querySelector('.employee-name');
        return header && details
          && name && /^[^\s#]+ - .+/.test(name.textContent)
          && details.textContent.includes('Position') && details.textContent.includes('Department')
          && !card.querySelector('.fa-chevron-right');
      })), 'Every staff card separates its purple identity header from the Position and Department body');
      const employeeCardVisuals = await page.$eval('#manpowerStaffList .manpower-employee-card', card => {
        const header = card.querySelector('.manpower-employee-identity');
        const name = header.querySelector('.employee-name');
        const details = card.querySelector('.manpower-employee-card-details');
        const cardStyle = getComputedStyle(card);
        const headerStyle = getComputedStyle(header);
        const nameStyle = getComputedStyle(name);
        const detailsStyle = getComputedStyle(details);
        const cardRect = card.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const detailsRect = details.getBoundingClientRect();
        const detailRows = [...details.querySelectorAll('.manpower-employee-card-row')];
        const rowRects = detailRows.map(row => row.getBoundingClientRect());
        const rowStyles = detailRows.map(row => getComputedStyle(row));
        const headerBackground = headerStyle.backgroundImage + ' ' + headerStyle.backgroundColor;
        return {
          noLeftAccent: cardStyle.borderLeftWidth === cardStyle.borderRightWidth
            && cardStyle.borderLeftStyle === cardStyle.borderRightStyle
            && cardStyle.borderLeftColor === cardStyle.borderRightColor,
          borderLeftWidth: cardStyle.borderLeftWidth,
          borderRadius: cardStyle.borderRadius,
          padding: cardStyle.padding,
          overflow: cardStyle.overflow,
          noOuterTint: cardStyle.backgroundImage === 'none',
          headerIsPurple: headerBackground.includes('rgb(109, 40, 217)')
            && headerBackground.includes('rgb(124, 58, 237)'),
          headerMatchesCardEdges: Math.abs(headerRect.left - cardRect.left) <= 2
            && Math.abs(headerRect.right - cardRect.right) <= 2,
          bodyFollowsHeader: detailsRect.top >= headerRect.bottom,
          nameIsWhite: nameStyle.color === 'rgb(255, 255, 255)',
          detailsUseTwoColumns: rowRects.length === 2
            && Math.abs(rowRects[0].top - rowRects[1].top) <= 1
            && rowRects[0].right < rowRects[1].left,
          detailsBorder: detailsStyle.borderWidth,
          detailsBackground: detailsStyle.backgroundColor,
          detailsPadding: detailsStyle.padding,
          detailsMargin: detailsStyle.margin,
          rowBorders: rowStyles.map(style => style.border),
          rowRadii: rowStyles.map(style => style.borderRadius),
          rowPadding: rowStyles.map(style => style.padding),
          rowBackgrounds: rowStyles.map(style => style.backgroundColor),
          rowDirections: rowStyles.map(style => style.flexDirection),
          valuesAlignLeft: detailRows.every(row => getComputedStyle(row.querySelector('strong')).textAlign === 'left')
        };
      });
      assert.deepEqual(employeeCardVisuals, {
        noLeftAccent: true,
        borderLeftWidth: '1px',
        borderRadius: '18px',
        padding: '0px',
        overflow: 'hidden',
        noOuterTint: true,
        headerIsPurple: true,
        headerMatchesCardEdges: true,
        bodyFollowsHeader: true,
        nameIsWhite: true,
        detailsUseTwoColumns: true,
        detailsBorder: '0px',
        detailsBackground: 'rgba(0, 0, 0, 0)',
        detailsPadding: '12px 14px 14px',
        detailsMargin: '0px',
        rowBorders: Array(2).fill(theme === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : '1px solid rgb(226, 232, 240)'),
        rowRadii: Array(2).fill('12px'),
        rowPadding: Array(2).fill('10px 11px'),
        rowBackgrounds: Array(2).fill(theme === 'dark' ? 'rgba(30, 27, 65, 0.85)' : 'rgb(248, 250, 252)'),
        rowDirections: Array(2).fill('column'),
        valuesAlignLeft: true
      }, 'Staff records place Position and Department in two individually bordered fields');
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        const staffCardLayout = await page.$eval('#manpowerStaffList', list => {
          const listRect = list.getBoundingClientRect();
          const cards = [...list.querySelectorAll('.manpower-employee-card')];
          const main = document.querySelector('main');
          return {
            mainFits: main.scrollWidth <= main.clientWidth + 1,
            cardsFit: cards.every(card => {
              const cardRect = card.getBoundingClientRect();
              const header = card.querySelector('.manpower-employee-identity');
              const details = card.querySelector('.manpower-employee-card-details');
              return card.scrollWidth <= card.clientWidth + 1
                && header.scrollWidth <= header.clientWidth + 1
                && details.scrollWidth <= details.clientWidth + 1
                && cardRect.left >= listRect.left - 1
                && cardRect.right <= listRect.right + 1;
            })
          };
        });
        assert.deepEqual(staffCardLayout, { mainFits: true, cardsFit: true }, width + 'px staff cards do not overflow horizontally');
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.click('#manpowerStaffList .manpower-employee-card[data-emp-no="000031"]');
      assert.ok(await page.$eval('#manpowerEmployeeOverlay', overlay => !overlay.hidden));
      assert.deepEqual(await page.$$eval('#manpowerEmployeeDetails th', cells => cells.map(cell => cell.textContent)), employeeDetailLabels);
      const employeeDetails = await page.$$eval('#manpowerEmployeeDetails tr', rows => Object.fromEntries(rows.map(row => [
        row.querySelector('th').textContent,
        row.querySelector('td').textContent
      ])));
      assert.equal(employeeDetails['Employee No.'], '000031');
      assert.equal(employeeDetails.Name, 'Navin');
      assert.equal(employeeDetails.Position, 'ACCOUNT EXECUTIVE');
      assert.equal(employeeDetails.Job, 'ACCOUNT EXECUTIVE');
      assert.match(employeeDetails['Service Years'], /^\d+\.\d{2}$/);
      assert.equal(await page.$eval('#manpowerEmployeeAvatar', avatar => avatar.textContent), 'N');
      assert.equal(await page.$('#manpowerEmployeeOverlay img'), null);
      await page.keyboard.press('Escape');
      assert.ok(await page.$eval('#manpowerEmployeeOverlay', overlay => overlay.hidden));
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.empNo), '000031');
      await page.click('#manpowerBack');
      assert.ok(await page.$eval('#manpowerTableView', section => !section.hidden));
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'View 48 staff records for ACCOUNT EXECUTIVE');
      assert.equal(await page.$eval('main', main => main.scrollTop), tableScroll);
      await page.screenshot({ path: path.join(__dirname, 'employee_career_manpower_statistics_' + theme + '.png') });
      await page.click('#manpowerViewChart');
      assert.deepEqual(await page.$$eval('#manpowerChartMetric option', options => options.map(option => option.textContent)), ['Category', 'Gender', 'Grade', 'Job Type', 'Skill Group', 'Talent Group']);
      for (const metric of ['category', 'gender', 'grade', 'jobType', 'skillGroup', 'talentGroup']) {
        await page.select('#manpowerChartMetric', metric);
        assert.equal(await page.$eval('#manpowerChartTotal', n => n.textContent), '282', metric + ' conserves the total headcount');
        assert.equal(await page.$$eval('#manpowerChartLegend [data-count]', nodes => nodes.reduce((total, n) => total + Number(n.dataset.count), 0)), 282);
        assert.ok(await page.$$eval('#manpowerChartLegend .staff-list-legend-name span', nodes => nodes.length > 1 && nodes.every(node => node.textContent !== '—')), metric + ' has populated categories');
      }
      await page.select('#manpowerChartMetric', 'jobType');
      assert.equal(await page.$eval('#manpowerChartTotal', n => n.textContent), '282');
      assert.equal(await page.$$eval('#manpowerChartLegend [data-count]', nodes => nodes.reduce((total, n) => total + Number(n.dataset.count), 0)), 282);
      assert.equal(await page.$$eval('#manpowerChartLegend .staff-list-legend-row', nodes => nodes.length), 6);
      await page.screenshot({ path: path.join(__dirname, 'employee_career_manpower_statistics_chart_' + theme + '.png') });
      await page.click('#manpowerChartViewAll');
      assert.equal(await page.$$eval('#manpowerChartLegend .staff-list-legend-row', nodes => nodes.length), 34);
      assert.equal(await page.$$eval('#manpowerChartLegend [data-count]', nodes => nodes.reduce((total, n) => total + Number(n.dataset.count), 0)), 282);
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1));
      }
      await page.click('#manpowerBack');
      assert.ok(await page.$eval('#manpowerTableView', n => !n.hidden));
      assert.ok(!(await page.$eval('main', n => n.textContent)).includes('View Trend'));
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1));
        assert.ok(await page.$eval('#manpowerTable th:last-child', n => n.scrollWidth <= n.clientWidth + 1), 'Headcount heading fits');
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.click('#manpowerFilterTrigger');
      assert.equal(await page.$$eval('#manpowerFilterForm label', nodes => nodes.length), 6);
      assert.equal(await page.$eval('#manpowerEffectiveDate', n => n.value), '2026-10-05', 'Effective Date remains available as a filter');
      await page.screenshot({ path: path.join(__dirname, 'employee_career_manpower_statistics_filter_' + theme + '.png') });
      await page.$eval('#manpowerApplyFilter', n => n.focus());
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'manpowerResetFilter');
      await page.$eval('#manpowerEffectiveDate', n => { n.value = ''; });
      await page.click('#manpowerApplyFilter');
      assert.ok(await page.$eval('#manpowerFilterOverlay', n => !n.hidden));
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('main', n => n.inert), false);
    }
    await page.evaluateOnNewDocument(records => { window.MANPOWER_STATISTICS_DATA = records; }, fixture);
    await page.goto(url, { waitUntil: 'load' });
    assert.deepEqual(await table(), [['ACCOUNT EXECUTIVE', '6'], ['TECHNICIAN', '7']]);
    assert.equal(await page.$eval('#manpowerTotalHeadcount', n => n.textContent), '13');
    await page.click('button[aria-label="View 6 staff records for ACCOUNT EXECUTIVE"]');
    assert.equal(await page.$eval('#manpowerStaffTotalRecords', node => node.textContent), '6');
    assert.equal(await page.$$eval('#manpowerStaffList .manpower-employee-card', nodes => nodes.length), 6);
    await page.click('#manpowerBack');
    await page.click('#manpowerViewChart');
    await page.select('#manpowerChartMetric', 'jobType');
    assert.deepEqual(await page.$$eval('#manpowerChartLegend .staff-list-legend-row', rows => rows.map(row => [row.querySelector('.staff-list-legend-name span').textContent, row.querySelector('strong').textContent])), [['TECHNICIAN', '7'], ['ACCOUNT EXECUTIVE', '6']]);
    await page.click('#manpowerBack');
    await apply({ manpowerCompany: 'Alpha', manpowerBranch: 'North', manpowerDepartment: 'Finance' });
    assert.deepEqual(await table(), [['ACCOUNT EXECUTIVE', '2']]);
    await page.click('button[aria-label="View 2 staff records for ACCOUNT EXECUTIVE"]');
    assert.equal(await page.$$eval('#manpowerStaffList .manpower-employee-card', nodes => nodes.length), 2);
    await page.click('#manpowerBack');
    await page.click('#manpowerViewChart');
    assert.equal(await page.$eval('#manpowerChartTotal', n => n.textContent), '2');
    for (const metric of ['category', 'gender', 'grade', 'skillGroup', 'talentGroup']) {
      await page.select('#manpowerChartMetric', metric);
      assert.equal(await page.$eval('#manpowerChartTotal', node => node.textContent), '2', metric + ' retains the active organization filter');
    }
    await page.click('#manpowerBack');
    await page.click('#manpowerFilterTrigger');
    await page.click('#manpowerResetFilter');
    assert.equal(await page.$eval('#manpowerTotalHeadcount', n => n.textContent), '13');
    await apply({ manpowerSummaryBy: 'company' });
    assert.deepEqual(await table(), [['Alpha', '6'], ['Beta', '7']]);
    await page.click('button[aria-label="View 6 staff records for Alpha"]');
    assert.equal(await page.$eval('#manpowerStaffTotalRecords', node => node.textContent), '6');
    await page.click('#manpowerBack');
    await apply({ manpowerSummaryBy: 'branch' });
    assert.deepEqual(await table(), [['HQ', '4'], ['North', '2'], ['South', '7']]);
    await page.click('button[aria-label="View 4 staff records for HQ"]');
    assert.equal(await page.$$eval('#manpowerStaffList .manpower-employee-card', nodes => nodes.length), 4);
    await page.click('#manpowerBack');
    await apply({ manpowerSummaryBy: 'department' });
    assert.deepEqual(await table(), [['Finance', '6'], ['Operations', '7']]);
    await page.click('button[aria-label="View 6 staff records for Finance"]');
    assert.equal(await page.$$eval('#manpowerStaffList .manpower-employee-card', nodes => nodes.length), 6);
    await page.click('#manpowerBack');
    await apply({ manpowerSummaryBy: 'jobType', manpowerEffectiveDate: '2026-10-04' });
    assert.deepEqual(await table(), [['ACCOUNT EXECUTIVE', '4'], ['ADMIN MANAGER', '3']]);
    assert.equal(await page.$eval('#manpowerTotalHeadcount', n => n.textContent), '7');
    await page.click('button[aria-label="View 3 staff records for ADMIN MANAGER"]');
    assert.equal(await page.$$eval('#manpowerStaffList .manpower-employee-card', nodes => nodes.length), 3);
    await page.click('#manpowerBack');
    await apply({ manpowerEffectiveDate: '2026-08-31' });
    assert.deepEqual(await table(), []);
    assert.equal(await page.$eval('#manpowerTotalHeadcount', n => n.textContent), '0');
    assert.ok(await page.$eval('#manpowerEmpty', n => !n.hidden));
    assert.equal(await page.$$eval('#manpowerTable tbody button', buttons => buttons.length), 0);
    assert.ok(await page.$eval('#manpowerStaffView', section => section.hidden));
    await page.click('#manpowerViewChart');
    assert.equal(await page.$$eval('#manpowerChartSegments circle', nodes => nodes.length), 0);
    assert.ok(await page.$eval('#manpowerChartNote', n => n.textContent.includes('No records')));
    await page.evaluateOnNewDocument(({ aggregates, staff }) => {
      window.MANPOWER_STATISTICS_DATA = aggregates;
      window.MANPOWER_STATISTICS_STAFF = staff;
    }, { aggregates: controlledAggregate, staff: controlledStaff });
    await page.goto(url, { waitUntil: 'load' });
    await page.click('#manpowerViewChart');
    for (const [metric, expected] of [
      ['category', [['Executive', '2']]],
      ['gender', [['Female', '1'], ['Male', '1']]],
      ['grade', [['G2', '1'], ['G3', '1']]],
      ['jobType', [['ACCOUNT EXECUTIVE', '2']]],
      ['skillGroup', [['Finance', '2']]],
      ['talentGroup', [['Core Talent', '1'], ['High Potential', '1']]]
    ]) {
      await page.select('#manpowerChartMetric', metric);
      assert.deepEqual(await page.$$eval('#manpowerChartLegend .staff-list-legend-row', rows => rows.map(row => [row.querySelector('.staff-list-legend-name span').textContent, row.querySelector('strong').textContent])), expected, metric + ' counts the filtered employees');
      assert.equal(await page.$eval('#manpowerChartTotal', node => node.textContent), '2');
    }
    await page.click('#manpowerBack');
    await page.click('#manpowerTable tbody td:first-child button');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'manpowerStatisticsClose');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'manpowerStatisticsClose');
    const statistics = await page.$$eval('#manpowerStatisticsDetails tr', rows => Object.fromEntries(rows.map(row => [
      row.querySelector('th').textContent,
      row.querySelector('td').textContent
    ])));
    assert.deepEqual(statistics, {
      Description: 'ACCOUNT EXECUTIVE',
      Headcount: '2',
      'Average Age': '35.00',
      'Average Service Years': '7.50',
      'Average Competency Points': '7.00',
      'Average Competency Match %': '85.00',
      'Average Basic Pay': '3,000.00',
      'Median Basic Pay': '3,000.00',
      'Minimum Basic Pay': '2,000.00',
      'Maximum Basic Pay': '4,000.00',
      'Average Increment %': '3.00',
      'Average Bonus Factor': '1.50',
      'Attendance %': '95.00',
      'Average Monthly OT Hours': '3.00',
      'Average Training Cost': '300.00',
      'Average Performance Score': '85.00',
      'Annual Attrition %': '2.00'
    });
    await page.$eval('#manpowerTable tbody td:first-child button', button => button.remove());
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'manpowerFilterTrigger');
    await page.evaluate(() => { window.MANPOWER_STATISTICS_STAFF.length = 0; });
    await page.click('#manpowerFilterTrigger');
    await page.click('#manpowerApplyFilter');
    await page.click('#manpowerTable tbody td:last-child button');
    assert.ok(await page.$eval('#manpowerTableView', section => !section.hidden));
    assert.ok(await page.$eval('#manpowerStaffView', section => section.hidden));
    assert.match(await page.$eval('#manpowerDrilldownStatus', status => status.textContent), /unavailable|refresh/i);
    await page.evaluateOnNewDocument(({ aggregates, staff }) => {
      window.MANPOWER_STATISTICS_DATA = aggregates;
      window.MANPOWER_STATISTICS_STAFF = staff;
    }, { aggregates: missingValueAggregate, staff: missingValueStaff });
    await page.goto(url, { waitUntil: 'load' });
    await page.click('button[aria-label="View 1 staff records for ACCOUNT EXECUTIVE"]');
    await page.click('#manpowerStaffList .manpower-employee-card');
    const missingDetails = await page.$$eval('#manpowerEmployeeDetails tr', rows => Object.fromEntries(rows.map(row => [
      row.querySelector('th').textContent,
      row.querySelector('td').textContent
    ])));
    assert.equal(missingDetails.Base, '—');
    assert.equal(missingDetails.Line, '—');
    assert.equal(await page.$eval('#manpowerEmployeeAvatar', avatar => avatar.textContent), 'A');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'manpowerEmployeeClose');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'manpowerEmployeeClose');
    await page.evaluate(() => document.getElementById('manpowerFilterForm').requestSubmit());
    assert.ok(await page.$eval('#manpowerEmployeeOverlay', overlay => overlay.hidden));
    assert.ok(await page.$eval('#manpowerTableView', section => !section.hidden));
    for (const width of [360, 390, 420]) {
      await page.setViewport({ width, height: 950 });
      assert.ok(await page.$eval('main', main => main.scrollWidth <= main.clientWidth + 1));
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Manpower table, 34/282 sample, organization filters, inclusive effective dates, grouping, chart conservation, empty state, navigation, themes and mobile widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
