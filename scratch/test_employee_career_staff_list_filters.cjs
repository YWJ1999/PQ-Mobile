const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve('modules/employee-career/options/team/staff-list.html')).href;
const labels = ['Search Keyword', 'Staff Category', 'Company', 'Branch', 'Division', 'Department', 'Section', 'Cost Center', 'Grade', 'Job', 'Skill Group', 'Hire Date', 'YOS', 'Type'];

(async () => {
  const browser = await puppeteer.launch({headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files']});
  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluateOnNewDocument(() => {
        const RealDate = Date;
        window.Date = class extends RealDate {
          constructor(...args) { super(...(args.length ? args : ['2026-10-12T12:00:00'])); }
          static now() { return new RealDate('2026-10-12T12:00:00').getTime(); }
        };
        const base = {birthDate: '1990-01-01', position: 'Executive', verified: true, approved: true};
        window.EMPLOYEE_CAREER_STAFF_LIST_RECORDS = [
          {...base, empNo: 'A', name: 'Alice', company: 'Alpha', branch: 'North', division: 'Technology', department: 'IT', section: 'Support', costCenter: 'CC-A', grade: 'G1', job: 'Engineer', skillGroup: 'Technical', type: 'Permanent', hireDate: '2020-10-12'},
          {...base, empNo: 'B', name: 'Ben', company: 'Alpha', branch: 'South', division: 'Operations', department: 'Operations', section: 'Delivery', costCenter: 'CC-B', grade: 'G2', job: 'Coordinator', skillGroup: 'Logistics', type: 'Contract', hireDate: '2023-10-12'},
          {...base, empNo: 'C', name: 'Chen', company: 'Beta', branch: 'North', division: 'Technology', department: 'IT', section: 'Support', costCenter: 'CC-A', grade: 'G1', job: 'Engineer', skillGroup: 'Technical', type: 'Permanent', hireDate: '2025-10-12'},
          {...base, empNo: 'D', name: 'Devi', company: 'Beta', branch: 'East', division: 'Corporate', department: 'Finance', section: 'Accounts', costCenter: 'CC-C', grade: 'G3', job: 'Accountant', skillGroup: 'Finance', employmentType: 'Permanent', hireDate: '2024-10-12'},
          {...base, empNo: 'E', name: 'Evan', company: 'Gamma', branch: 'East', division: 'Research', department: 'Research', section: 'Analysis', costCenter: 'CC-D', grade: 2, job: 'Analyst', skillGroup: 'Research', type: 'Contract', hireDate: '2020-03-11'}
        ];
      });
      await page.setViewport({width: 390, height: 950});
      await page.goto(url + '?theme=' + theme, {waitUntil: 'load'});
      const rows = () => page.$$eval('#staffListTable tbody tr', nodes => nodes.map(node => node.cells[0].textContent));
      const reset = async () => { await page.click('#staffListFilterTrigger'); await page.click('#staffListResetFilter'); };
      const apply = async values => {
        await page.click('#staffListFilterTrigger');
        await page.evaluate(values => {
          for (const [key, value] of Object.entries(values)) document.getElementById('staffListFilter' + key).value = value;
        }, values);
        await page.click('#staffListApplyFilter');
      };
      await page.click('#staffListFilterTrigger');
      assert.equal(await page.$eval('#staffListFilterTitle', node => node.textContent), 'Filter');
      assert.deepEqual(await page.$$eval('.staff-list-filter-fields label', nodes => nodes.map(node => node.textContent)), labels);
      assert.equal(await page.$$eval('[data-filter-range="hire-date"] input', nodes => nodes.length), 2);
      assert.equal(await page.$$eval('[data-filter-range="yos"] input', nodes => nodes.length), 2);
      await page.keyboard.press('Escape');
      const cases = [
        [{Company: 'Alpha'}, ['#A', '#B']], [{Branch: 'North'}, ['#A', '#C']],
        [{Division: 'Technology'}, ['#A', '#C']], [{Department: 'IT'}, ['#A', '#C']],
        [{Section: 'Support'}, ['#A', '#C']], [{CostCenter: 'CC-A'}, ['#A', '#C']],
        [{Grade: 'G1'}, ['#A', '#C']], [{Grade: '2'}, ['#E']],
        [{Job: 'Engineer'}, ['#A', '#C']], [{SkillGroup: 'Technical'}, ['#A', '#C']],
        [{Type: 'Permanent'}, ['#A', '#C', '#D']], [{Keyword: '#B'}, ['#B']],
        [{HireDateFrom: '2020-10-12', HireDateTo: '2023-10-12'}, ['#A', '#B']],
        [{YosFrom: '3', YosTo: '6'}, ['#A', '#B']], [{YosFrom: '6.59', YosTo: '6.59'}, ['#E']],
        [{Company: 'Alpha', Type: 'Permanent', HireDateFrom: '2020-10-12', HireDateTo: '2023-10-12', YosFrom: '3', YosTo: '6'}, ['#A']]
      ];
      for (const [filters, expected] of cases) {
        await reset();
        await apply(filters);
        assert.deepEqual(await rows(), expected, JSON.stringify(filters));
        assert.equal(await page.$eval('#staffListTotalRecords', node => Number(node.textContent)), expected.length);
      }
      await page.click('#staffListViewChart');
      assert.equal(await page.$eval('#staffListChartTotal', node => node.textContent), '1');
      await page.click('#staffListViewTrend');
      assert.equal(await page.$eval('#staffListTrendTotalCount', node => node.textContent), '1');
      await page.click('#staffListBack');
      await page.click('#staffListViewSummary');
      await page.click('[data-staff-category="active"]');
      assert.deepEqual(await rows(), ['#A'], 'Summary navigation keeps organization, date and service filters');
      await page.click('#staffListFilterTrigger');
      await page.select('#staffListFilterCompany', 'Beta');
      await page.keyboard.press('Escape');
      assert.deepEqual(await rows(), ['#A'], 'Closing the filter discards drafts');
      await reset();
      await apply({HireDateFrom: '2025-01-01', HireDateTo: '2020-01-01'});
      assert.equal(await page.$eval('#staffListFilterOverlay', node => node.hidden), false);
      assert.equal(await page.$eval('#staffListFilterError', node => node.hidden), false);
      await page.click('#staffListResetFilter');
      await apply({YosFrom: '7', YosTo: '2'});
      assert.equal(await page.$eval('#staffListFilterOverlay', node => node.hidden), false);
      assert.equal(await page.$eval('#staffListFilterError', node => node.hidden), false);
      await page.click('#staffListResetFilter');
      assert.deepEqual(await rows(), ['#A', '#B', '#C', '#D', '#E']);
      for (const width of [360, 390, 450]) {
        await page.setViewport({width, height: 640});
        await page.click('#staffListFilterTrigger');
        assert.ok(await page.$eval('.staff-list-filter-panel', node => node.scrollWidth <= node.clientWidth + 1), 'Filter fits mobile width');
        assert.ok(await page.$eval('.staff-list-filter-fields', node => node.scrollHeight > node.clientHeight), 'Long fields scroll within the sheet');
        await page.$eval('.staff-list-filter-fields', node => {node.scrollTop = node.scrollHeight;});
        assert.ok(await page.$eval('#staffListApplyFilter', node => node.getBoundingClientRect().bottom <= innerHeight + 1), 'Apply stays visible');
        if (width === 390) await page.screenshot({path: 'scratch/staff-list-filter-expanded-' + theme + '.png'});
        await page.keyboard.press('Escape');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: 14 staff filter labels, all organization dimensions, hire/YOS ranges and inclusive bounds, combined filters, validation/reset/cancel, chart/trend/summary consistency, both themes and short mobile screens.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
