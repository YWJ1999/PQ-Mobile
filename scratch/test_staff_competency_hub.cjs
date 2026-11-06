const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = query => pathToFileURL(path.join(__dirname, '../modules/training-competency/options/staff-competency.html')).href + query;
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (!process.env.PQ_COMPETENCY_LIVE_ASSETS) {
      await page.setRequestInterception(true);
      page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    }
    const click = async selector => { await page.$eval(selector, node => node.scrollIntoView({ block: 'center' })); await page.click(selector); };
    const tab = name => click(`[data-competency-tab="${name}"]`);
    const filter = async values => {
      await click('#competencyHubFilterTrigger');
      await page.evaluate(values => { const form = document.getElementById('competencyHubFilterForm'); form.reset(); Object.entries(values).forEach(([key, value]) => { form.elements[key].value = value; }); }, values);
      await click('#competencyHubApplyFilter');
    };
    const navigate = async selector => { await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click(selector)]); };
    const staffFilter = async keyword => {
      await click('#staffCompetencyFilterTrigger');
      await page.$eval('#staffCompetencyKeyword', (input, value) => { input.value = value; }, keyword);
      await click('#staffCompetencyApplyFilter');
    };
    await page.setViewport({ width: 360, height: 900 });
    await page.goto(url('?theme=light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$$eval('[data-competency-tab]', nodes => nodes.length), 4, 'One option offers all four competency views');
    await page.evaluate(() => localStorage.removeItem('peoplehcm.competencyAssessments.v1'));
    await staffFilter('EBB03');
    await tab('search');
    await tab('staff');
    await staffFilter('EBB12');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#staffCompetencyTable tbody tr:first-child td:first-child', node => node.textContent), '#EBB03', 'Browser back restores Staff filters as well as hub filters');
    await staffFilter('');
    await tab('assessment');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '6');
    await filter({ keyword: '#EBB12', skillGroup: 'Technical Area', days: '0' });
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '1');
    await navigate('#competencyHubResults [data-assess]');
    assert.equal(await page.$eval('#staffAssessSkillGroup', node => node.textContent), 'Technical Area');
    assert.equal(await page.$eval('.csa-card-header', node => node.textContent.trim()), 'Tunnel Engineering');
    await navigate('#staffAssessBack');
    assert.equal(await page.$eval('[data-competency-tab="assessment"]', node => node.getAttribute('aria-selected')), 'true');
    assert.match(await page.$eval('#competencyHubFilterSummary', node => node.textContent), /Technical/);
    await tab('search');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '12');
    await filter({ competency: 'effective-communication', levelMin: '3', levelMax: '3' });
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '2');
    assert.equal(await page.$eval('.sch-employee-id', node => node.previousElementSibling.textContent), 'Nur Izzati');
    await navigate('#competencyHubResults [data-employee]');
    await navigate('#csBack');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '2', 'Employee return preserves search filters');
    await filter({ ageMin: '18' });
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '0', 'Missing age does not match numeric age filters');
    assert.match(await page.$eval('#competencyHubDataNote', node => node.textContent), /birth|age/i);
    await filter({ levelMin: '4', levelMax: '2' });
    assert.equal(await page.$eval('#competencyHubFilterError', node => node.hidden), false);
    await page.keyboard.press('Escape');
    await tab('gap');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '7');
    await click('[data-gap-skill="effective-communication"]');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '3');
    assert.equal(await page.$$eval('#competencyHubResults [data-employee]', nodes => nodes.length), 3);
    await navigate('#competencyHubResults [data-employee]');
    await navigate('#csBack');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '3');
    await click('#staffCompetencyBack');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '7');
    await click('[data-gap-sign="positive"]');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '0');
    assert.match(await page.$eval('#competencyHubResults', node => node.textContent), /No/);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('[data-gap-sign="negative"]', node => node.getAttribute('aria-pressed')), 'true', 'Browser back restores previous gap view');
    await tab('assessment');
    assert.match(await page.$eval('#competencyHubFilterSummary', node => node.textContent), /Technical/);
    await navigate('#competencyHubResults [data-assess]');
    await navigate('#staffAssessSubmit');
    assert.equal(await page.$eval('#competencyHubCount', node => node.textContent), '0', 'Submitted employee no longer exceeds zero days since assessment');
    await page.evaluate(() => localStorage.removeItem('peoplehcm.competencyAssessments.v1'));
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(url(`?theme=${theme}`), { waitUntil: 'domcontentloaded' });
      if (process.env.PQ_COMPETENCY_LIVE_ASSETS) await page.evaluate(() => document.fonts.ready);
      for (const name of ['staff', 'assessment', 'search', 'gap']) {
        await tab(name);
        assert.equal(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), true, `${name} fits ${width}px`);
        await page.screenshot({ path: path.join(__dirname, `competency-hub-${name}-${theme}-${width}.png`) });
        if (['search', 'gap'].includes(name)) {
          await click('#competencyHubViewChart');
          assert.equal(await page.$eval('#competencyHubChart', node => node.hidden), false);
          assert.ok(await page.$('#competencyHubViewChart .fa-chart-simple'));
          await click('#staffCompetencyBack');
        }
        if (name !== 'staff') {
          await click('#competencyHubFilterTrigger');
          assert.equal(await page.$eval('#competencyHubFilterForm', node => node.scrollWidth <= node.clientWidth + 1), true, 'Filter fits mobile width');
          await page.screenshot({ path: path.join(__dirname, `competency-hub-${name}-filter-${theme}-${width}.png`) });
          await page.keyboard.press('Escape');
        }
      }
    }
    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: four competency views, filters, assessment flow, search, gap counts/drilldown, browser back, charts and responsive themes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
