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

    const listPosition = () => page.evaluate(() => ({
      frame: document.querySelector('.phone-container').scrollTop,
      list: document.querySelector('main').scrollTop,
      headerTop: document.querySelector('.employee-career-header').getBoundingClientRect().top,
      navBottom: document.querySelector('.bottom-nav').getBoundingClientRect().bottom
    }));

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
        const identity = card.querySelector('.staff-career-plan-card-header');
        return {
          name: name.textContent.trim(),
          subtitle: card.querySelector('.staff-career-plan-subtitle').textContent,
          headerSpansCard: identity?.getBoundingClientRect().width >= card.getBoundingClientRect().width - 2,
          hasChevron: Boolean(card.querySelector('.fa-chevron-right')),
          uniformValueColor: new Set([...card.querySelectorAll('dd')].map(value => getComputedStyle(value).color)).size === 1,
          detailPage: new URL(card.href).pathname.split('/').pop(),
          labels: [...card.querySelectorAll('dt')].map(node => node.textContent.trim()),
          values: [...card.querySelectorAll('dd')].map(node => node.textContent.trim())
        };
      });
      assert.deepEqual(firstCard, {
        name: 'EBB12 - Farhan Binti Rahmat',
        subtitle: 'HR Executive',
        headerSpansCard: true,
        hasChevron: false,
        uniformValueColor: true,
        detailPage: 'staff-career-plan-details.html',
        labels: ['Department', 'Branch', 'Sex', 'Age'],
        values: ['Human Resource', 'Headquarters (HQ)', 'Female', '32']
      });

      const records = await page.evaluate(() => window.EMPLOYEE_CAREER_STAFF_PLAN_DATA);
      for (const index of [1, 6]) {
        const card = `.staff-career-plan-card:nth-child(${index})`;
        await page.evaluate(() => document.fonts.ready);
        await page.$eval(card, (link, first) => {
          const list = document.querySelector('main');
          list.scrollTop = first ? 0 : list.scrollTop + link.getBoundingClientRect().top - list.getBoundingClientRect().top - 40;
        }, index === 1);
        const before = await listPosition();
        assert.equal(before.frame, 0);
        assert.ok(before.headerTop >= 0 && before.navBottom <= page.viewport().height);
        await page.click(card);
        await page.waitForSelector('#staffCareerPlanDetailName');
        await Promise.all([page.waitForNavigation(), page.click('#staffCareerPlanDetailsBack')]);
        await page.evaluate(() => document.fonts.ready);
        assert.deepEqual(await listPosition(), before, 'Back restores the list scroll and keeps both navigation bars in place');
        assert.equal(await page.$eval(card, link => link.matches(':focus-visible')), false, 'A pointer return does not add a keyboard focus ring');
      }

      for (const [i, row] of records.entries()) {
        const card = `.staff-career-plan-card:nth-child(${i + 1})`;
        await page.focus(card);
        await page.keyboard.press('Enter');
        await page.waitForSelector('#staffCareerPlanDetailName');
        assert.equal(new URL(page.url()).pathname.split('/').pop(), 'staff-career-plan-details.html');
        const details = await page.$eval('main', main => ({
          headings: [...main.querySelectorAll('h2')].map(heading => heading.textContent),
          facts: [...main.querySelectorAll('dt')].map(term => [term.textContent, term.nextElementSibling.textContent])
        }));
        assert.deepEqual(details, { headings: [`${row.empNo} - ${row.name}`], facts: [
          ['Position', row.position], ['Department', row.department], ['Next Job', row.nextPosition],
          ['Target Year', row.targetDate.slice(0, 4)], ['Career Goal', row.careerGoal || 'Not provided'],
          ['Development Needs / Notes', row.developmentNotes || row.developmentNeeds || 'Not provided']
        ] });
        if (i % 2 === 0) await page.goBack();
        else await Promise.all([page.waitForNavigation(), page.click('#staffCareerPlanDetailsBack')]);
        assert.equal(await page.$eval(card, link => link === document.activeElement), true);
      }

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
      assert.equal(await page.$eval('#staffCareerPlanChartFilterSummary', node => node.textContent.trim()), 'All staff');

      await page.select('#staffCareerPlanChartMetric', 'careerPath');
      assert.match(await page.$eval('#staffCareerPlanChartTitle', node => node.textContent.trim()), /career path/i);
      assert.equal(await page.$$eval('#staffCareerPlanChartLegend [data-count]', nodes => nodes.reduce((sum, node) => sum + Number(node.dataset.count), 0)), 8);
      await page.click('#staffCareerPlanBack');
      assert.equal(await page.$eval('#staffCareerPlanTitle', node => node.textContent.trim()), 'Staff Career Plan');
      assert.equal(await page.$eval('#staffCareerPlanListView', node => node.hidden), false);

      await page.click('#staffCareerPlanFilterTrigger');
      assert.equal(await page.$eval('#staffCareerPlanFilterOverlay', node => node.hidden), false);
      assert.deepEqual(
        await page.$$eval('#staffCareerPlanFilterForm label', nodes => nodes.map(node => node.textContent.trim())),
        ['Search Keyword', 'Company', 'Branch', 'Department', 'Cost Centre']
      );
      await page.select('#staffCareerPlanFilterCostCenter', 'CC-IT');
      await page.click('#staffCareerPlanApplyFilter');
      assert.deepEqual(await page.$$eval('.staff-career-plan-name', nodes => nodes.map(node => node.textContent)), ['005712 - Lee Wei Ming', '009034 - Muhammad Hafiz']);
      await page.click('#staffCareerPlanViewChart');
      assert.equal(await page.$eval('#staffCareerPlanChartTotal', node => node.textContent), '2');
      assert.equal(await page.$eval('#staffCareerPlanChartFilterSummary', node => node.textContent), 'CC-IT');
      await page.click('#staffCareerPlanBack');

      await page.click('#staffCareerPlanFilterTrigger');
      await page.type('#staffCareerPlanFilterKeyword', 'Farhan');
      await page.select('#staffCareerPlanFilterCompany', records[0].company);
      await page.select('#staffCareerPlanFilterBranch', records[0].branch);
      await page.select('#staffCareerPlanFilterDepartment', records[0].department);
      await page.click('#staffCareerPlanApplyFilter');
      assert.equal(await page.$eval('#staffCareerPlanEmpty', node => node.hidden), false, 'Filters must match the same plan');
      await page.click('#staffCareerPlanFilterTrigger');
      await page.select('#staffCareerPlanFilterCostCenter', records[0].costCenter);
      await page.click('#staffCareerPlanApplyFilter');
      assert.equal(await page.$eval('#staffCareerPlanTotalRecords', node => node.textContent.trim()), '1');
      assert.equal(await page.$$eval('#staffCareerPlanCards .staff-career-plan-card', nodes => nodes.length), 1);
      const summary = ['Farhan', records[0].company, records[0].branch, records[0].department, records[0].costCenter].join(' · ');
      assert.equal(await page.$eval('#staffCareerPlanFilterSummary', node => node.textContent), summary);

      const withNotes = records.map((row, i) => i === 0 ? {
        ...row, careerGoal: 'Lead the HR team.', developmentNotes: 'Complete mentoring.\n' + 'Attend leadership training. '.repeat(200)
      } : row);
      const fixture = request => request.url().endsWith('/staff-career-plan-data.js')
        ? request.respond({ contentType: 'text/javascript', body: 'window.EMPLOYEE_CAREER_STAFF_PLAN_DATA = ' + JSON.stringify(withNotes) })
        : request.continue();
      page.on('request', fixture);
      await page.setRequestInterception(true);
      await page.setViewport({ width: 320, height: 568 });
      await page.click('.staff-career-plan-card .staff-career-plan-detail dd');
      await page.waitForSelector('#staffCareerPlanDetailName');
      await page.reload();
      assert.equal(new URL(page.url()).pathname.split('/').pop(), 'staff-career-plan-details.html');
      assert.equal(await page.$eval('#staffCareerPlanDetailGoal', node => node.textContent), 'Lead the HR team.');
      assert.equal(await page.$eval('#staffCareerPlanDetailNotes', node => node.textContent), 'Complete mentoring.\n' + 'Attend leadership training. '.repeat(200));
      assert.equal(await page.$eval('main', node => node.scrollHeight > node.clientHeight && node.scrollWidth <= node.clientWidth), true);
      await page.setRequestInterception(false);
      page.off('request', fixture);
      await Promise.all([page.waitForNavigation(), page.click('#staffCareerPlanDetailsBack')]);
      assert.equal(await page.$eval('#staffCareerPlanFilterSummary', node => node.textContent), summary);

      await page.click('#staffCareerPlanFilterTrigger');
      await page.click('#staffCareerPlanResetFilter');
      assert.deepEqual(await page.$eval('#staffCareerPlanFilterForm', form => Object.fromEntries(new FormData(form))),
        { keyword: '', company: '', branch: '', department: '', costCenter: '' });
      await page.click('#staffCareerPlanCloseFilter');
      assert.equal(await page.$eval('#staffCareerPlanFilterSummary', node => node.textContent), summary, 'Closing discards unapplied edits');
      await page.click('#staffCareerPlanFilterTrigger');
      await page.click('#staffCareerPlanResetFilter');
      await page.click('#staffCareerPlanApplyFilter');
      assert.equal(await page.$eval('#staffCareerPlanTotalRecords', node => node.textContent), '8');

      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} list fits ${width}px`);
        await page.click('#staffCareerPlanViewChart');
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `${theme} chart fits ${width}px`);
        await page.click('#staffCareerPlanBack');
      }
    }

    assert.deepEqual(errors, [], `Staff Career Plan has no JavaScript errors: ${errors.join('; ')}`);
    console.log('PASS: Staff Career Plan card details, filters, keyboard access, responsive cards and chart.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
