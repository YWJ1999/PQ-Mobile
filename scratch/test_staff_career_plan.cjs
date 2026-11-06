const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pageUrl = theme => pathToFileURL(path.join(root, 'modules/employee-career/options/team/staff-career-plan.html')).href + `?theme=${theme}`;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 1 });
      await page.goto(pageUrl(theme), { waitUntil: 'load' });

      assert.equal(await page.$('.employee-career-coming-card'), null, 'Staff Career Plan is implemented, not a Coming Soon page');
      assert.equal(await page.$eval('#staffCareerPlanTitle', node => node.textContent.trim()), 'Staff Career Plan');
      assert.equal(await page.$eval('#staffCareerPlanTotalRecords', node => node.textContent.trim()), '8');
      assert.equal(await page.$$eval('#staffCareerPlanCards .staff-career-plan-card', nodes => nodes.length), 8);
      assert.equal(await page.$eval('#staffCareerPlanEmpty', node => node.hidden), true);

      const firstCard = await page.$eval('#staffCareerPlanCards .staff-career-plan-card', card => {
        const name = card.querySelector('.staff-career-plan-name');
        const employeeId = card.querySelector('.staff-career-plan-employee-id');
        const identity = card.querySelector('.staff-career-plan-card-header');
        return {
          name: name.textContent.trim(),
          employeeId: employeeId.textContent.trim(),
          idBelowName: employeeId.getBoundingClientRect().top >= name.getBoundingClientRect().bottom,
          headerSpansCard: identity?.getBoundingClientRect().width >= card.getBoundingClientRect().width - 2,
          hasChevron: Boolean(card.querySelector('.fa-chevron-right')),
          detailTiles: card.querySelectorAll('.staff-career-plan-detail').length,
          path: new URL(card.href).pathname.replace(/\\/g, '/'),
          employee: new URL(card.href).searchParams.get('employee'),
          theme: new URL(card.href).searchParams.get('theme'),
          labels: [...card.querySelectorAll('dt')].map(node => node.textContent.trim()),
          values: [...card.querySelectorAll('dd')].map(node => node.textContent.trim())
        };
      });
      assert.deepEqual(firstCard, {
        name: 'Farhan Binti Rahmat',
        employeeId: '#EBB12',
        idBelowName: true,
        headerSpansCard: true,
        hasChevron: false,
        detailTiles: 5,
        path: '/C:/Users/loong/PQ-Mobile/me.html',
        employee: 'EBB12',
        theme,
        labels: ['Branch', 'Department', 'Position', 'Sex', 'Age'],
        values: ['Headquarters (HQ)', 'Human Resource', 'HR Executive', 'Female', '32']
      });

      assert.deepEqual(await page.$eval('#staffCareerPlanViewChart', button => ({
        text: button.textContent.trim(),
        barIcon: button.querySelector('i')?.classList.contains('fa-chart-simple'),
        nowrap: getComputedStyle(button).whiteSpace
      })), { text: 'Chart', barIcon: true, nowrap: 'nowrap' });

      await page.click('#staffCareerPlanViewChart');
      assert.equal(await page.$eval('#staffCareerPlanTitle', node => node.textContent.trim()), 'Staff Career Plan Analysis');
      assert.equal(await page.$eval('#staffCareerPlanListView', node => node.hidden), true);
      assert.equal(await page.$eval('#staffCareerPlanChartView', node => node.hidden), false);
      assert.equal(await page.$eval('#staffCareerPlanChartTotal', node => node.textContent.trim()), '8');
      assert.ok(await page.$$eval('#staffCareerPlanChartSegments circle', nodes => nodes.length) >= 4, 'Branch chart renders multiple donut segments');
      assert.equal(await page.$$eval('#staffCareerPlanChartLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 8);
      assert.deepEqual(await page.$$eval('#staffCareerPlanChartMetric option', nodes => nodes.map(node => node.value)), ['branch', 'department', 'careerPath']);
      assert.equal(await page.$eval('#staffCareerPlanChartPeriod', node => node.textContent.trim()), 'All Target Years');

      await page.select('#staffCareerPlanChartMetric', 'careerPath');
      assert.match(await page.$eval('#staffCareerPlanChartTitle', node => node.textContent.trim()), /career path/i);
      assert.equal(await page.$$eval('#staffCareerPlanChartLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 8);
      await page.click('#staffCareerPlanBack');
      assert.equal(await page.$eval('#staffCareerPlanTitle', node => node.textContent.trim()), 'Staff Career Plan');
      assert.equal(await page.$eval('#staffCareerPlanListView', node => node.hidden), false);

      await page.click('#staffCareerPlanFilterTrigger');
      assert.equal(await page.$eval('#staffCareerPlanFilterOverlay', node => node.hidden), false);
      const filterFields = ['Keyword', 'TargetYear', 'Branch', 'Department'];
      for (const suffix of filterFields) assert.ok(await page.$(`#staffCareerPlanFilter${suffix}`), `Filter includes ${suffix}`);
      for (const removed of ['CareerPath', 'NextPosition', 'StartDate', 'EndDate']) {
        assert.equal(await page.$('#staffCareerPlanFilter' + removed), null, 'Filter removes ' + removed);
      }
      assert.deepEqual(
        await page.$$eval('#staffCareerPlanFilterForm label', nodes => nodes.map(node => node.textContent.trim())),
        ['Search keyword', 'Target year', 'Branch', 'Department']
      );
      await page.type('#staffCareerPlanFilterKeyword', 'Farhan');
      await page.select('#staffCareerPlanFilterTargetYear', '2026');
      await page.click('#staffCareerPlanApplyFilter');
      assert.equal(await page.$eval('#staffCareerPlanTotalRecords', node => node.textContent.trim()), '1');
      assert.equal(await page.$$eval('#staffCareerPlanCards .staff-career-plan-card', nodes => nodes.length), 1);
      assert.match(await page.$eval('#staffCareerPlanFilterSummary', node => node.textContent.trim()), /Farhan.*2026/);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('#staffCareerPlanCards .staff-career-plan-card')
      ]);
      assert.ok(new URL(page.url()).pathname.replace(/\\/g, '/').endsWith('/PQ-Mobile/me.html'));
      assert.equal(new URL(page.url()).searchParams.get('employee'), 'EBB12');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
      await page.goBack({ waitUntil: 'load' });

      await page.click('#staffCareerPlanFilterTrigger');
      await page.click('#staffCareerPlanResetFilter');
      assert.deepEqual(await page.evaluate(() => ({
        keyword: document.getElementById('staffCareerPlanFilterKeyword').value,
        targetYear: document.getElementById('staffCareerPlanFilterTargetYear').value
      })), { keyword: '', targetYear: '' });
      await page.click('#staffCareerPlanCloseFilter');

      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} list fits ${width}px`);
        await page.click('#staffCareerPlanViewChart');
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} chart fits ${width}px`);
        await page.click('#staffCareerPlanBack');
      }
    }

    assert.deepEqual(errors, [], `Staff Career Plan has no JavaScript errors: ${errors.join('; ')}`);
    console.log('PASS: Staff Career Plan data, filters, CV navigation, responsive cards and highlight-style chart.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
