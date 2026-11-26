const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pageUrl = (file, query = '') => pathToFileURL(path.join(root, 'modules/performance', file)).href + query;
async function navigate(page, selector) {
  await page.$eval(selector, node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(selector)]);
}
async function setField(page, selector, value) {
  await page.$eval(selector, (node, next) => { node.value = next; node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
}
async function filter(page, values) {
  await page.click('#evaluationFilterTrigger');
  await page.$eval('#evaluationFilterForm', form => form.reset());
  for (const [key, value] of Object.entries(values)) await setField(page, `#evaluationFilterForm [name="${key}"]`, value);
  await page.click('#evaluationApplyFilter');
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1), 'Mobile screen has no horizontal overflow');
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 844 });
      await page.goto(pageUrl('index.html', `?scope=team&theme=${theme}`), { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('[data-option-id="performance-evaluation"]', node => node.tagName), 'A', 'Team Performance Evaluation opens its implemented list');
      await page.evaluate(() => sessionStorage.removeItem('pq_performance_evaluation_preview_v1'));
      await navigate(page, '[data-option-id="performance-evaluation"]');
      assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Performance Evaluation');
      assert.equal(await page.$eval('#evaluationTotalRecords', node => node.textContent), '4');
      assert.ok(await page.$('.record-summary-card .record-summary-metric .record-summary-value'), 'Uses the shared Total Records presentation');
      assert.deepEqual(await page.$$eval('.evaluation-card-header', nodes => nodes.map(node => ({
        name: node.querySelector('.evaluation-employee-name').textContent,
        ref: node.querySelector('.evaluation-reference').textContent,
        purple: getComputedStyle(node).backgroundImage.includes('124, 58, 237')
      }))), [
        { name: 'EBB12 - Farhan Binti Rahmat', ref: 'PE-2026-0012', purple: true },
        { name: 'EBB03 - Nur Izzati', ref: 'PE-2026-0003', purple: true },
        { name: 'EBB02 - Daniel Wong', ref: 'PE-2026-0002', purple: true },
        { name: 'EBB01 - Aina Rahman', ref: 'PE-2025-0001', purple: true }
      ]);
      assert.deepEqual(await page.$$eval('.evaluation-card:first-child dt', nodes => nodes.map(node => node.textContent)), ['Period', 'Type']);
      await noOverflow(page);
      await page.screenshot({ path: path.join(__dirname, `performance-evaluation-list-${theme}-${width}.png`) });
      await page.click('#evaluationFilterTrigger');
      assert.deepEqual(await page.$$eval('#evaluationFilterForm label', nodes => nodes.map(node => node.textContent)), ['Search Keyword', 'Company', 'Department', 'Job', 'Period', 'Type']);
      assert.equal(await page.$eval('#evaluationFilterOverlay', node => node.hidden), false);
      await noOverflow(page);
      await page.screenshot({ path: path.join(__dirname, `performance-evaluation-filter-${theme}-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'evaluationFilterTrigger');
      const cases = [
        [{ keyword: '  #ebb12  ' }, '1'], [{ keyword: 'PE-2026-0003' }, '1'],
        [{ company: 'PeopleHCM Malaysia' }, '3'], [{ department: 'Finance' }, '1'],
        [{ job: 'Product Designer' }, '1'], [{ period: 'FY 2026A' }, '3'],
        [{ type: 'Mid-Year Review' }, '1'], [{ company: 'PeopleHCM Services', department: 'Product' }, '0']
      ];
      for (const [values, count] of cases) {
        await filter(page, values);
        assert.equal(await page.$eval('#evaluationTotalRecords', node => node.textContent), count, `Filters and total agree for ${JSON.stringify(values)}`);
      }
      assert.equal(await page.$eval('#evaluationEmpty', node => node.hidden), false, 'No matches shows an empty state');
      await page.click('#evaluationFilterTrigger');
      await page.click('#evaluationResetFilter');
      await page.click('#evaluationApplyFilter');
      assert.equal(await page.$eval('#evaluationTotalRecords', node => node.textContent), '4');
      await filter(page, { keyword: 'Farhan', company: 'PeopleHCM Malaysia', department: 'Human Resource', job: 'Group HR Manager', period: 'FY 2026A', type: 'Annual Appraisal' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#evaluationTotalRecords', node => node.textContent), '1', 'Reload preserves filters');
      await navigate(page, '.evaluation-card .evaluation-update');
      assert.deepEqual(await page.$$eval('.evaluation-form-section h2', nodes => nodes.map(node => node.textContent)), ['General']);
      assert.deepEqual(await page.$$eval('[data-evaluation-details]', nodes => nodes.map(node => ({
        section: node.dataset.evaluationDetails,
        summary: node.querySelector('small').textContent,
        action: node.querySelector('.goal-plan-section-link').textContent.trim()
      }))), [
        { section: 'goals', summary: '2 items', action: 'Details' },
        { section: 'competencies', summary: '3 items', action: 'Details' }
      ]);
      await page.click('[data-evaluation-details="goals"]');
      assert.equal(await page.$eval('#evaluationGeneralView', node => node.hidden), true);
      assert.equal(await page.$eval('#evaluationListTitle', node => node.textContent), 'Goal');
      assert.equal(await page.$$eval('#evaluationSectionItems .evaluation-summary-item', nodes => nodes.length), 2);
      assert.equal(await page.$$eval('#evaluationSectionItems .evaluation-item-number', nodes => nodes.length), 0, 'Compact lists do not use numbering');
      await page.click('#evaluationBack');
      await page.click('[data-evaluation-details="competencies"]');
      assert.equal(await page.$eval('#evaluationListTitle', node => node.textContent), 'Competency');
      assert.equal(await page.$$eval('#evaluationSectionItems .evaluation-summary-item', nodes => nodes.length), 3);
      await page.click('#evaluationBack');
      assert.deepEqual(await page.$$eval('#evaluationGeneral label', nodes => nodes.map(node => node.textContent)), ['Evaluation Ref#', 'Status', 'Document Date', 'Name', 'Position', 'Department', 'Supervisor', 'Report To', 'Period', 'Type', 'Remark']);
      assert.equal(await page.$eval('#evaluationName', node => node.value), 'Farhan Binti Rahmat');
      assert.equal(await page.$eval('#evaluationSupervisor', node => node.value), 'Angeline Loren Alan');
      assert.equal(await page.$eval('#evaluationReportTo', node => node.value), 'Muhammad Ali Bin Man');
      assert.equal(await page.$eval('#evaluationStatus', node => node.value), 'In Progress');
      assert.equal(await page.$eval('#evaluationDocumentDate', node => node.value), '12 Jan 2026');
      assert.equal(await page.$eval('#evaluationRemark', node => node.value), 'Annual performance evaluation for FY 2026A.');
      assert.equal(await page.$$eval('#evaluationGeneral .self-evaluation-employee-id', nodes => nodes.length), 0, 'Performance Evaluation General does not display employee IDs');
      assert.ok(await page.$$eval('#evaluationDetailsForm input, #evaluationDetailsForm textarea', nodes => nodes.every(node => node.readOnly)), 'Overview remains read-only');
      assert.deepEqual(await page.$$eval('#evaluationDecisionActions button', nodes => nodes.map(node => node.textContent.trim())), ['Approve', 'Resubmit', 'Cancel', 'Reject']);
      assert.equal(await page.$eval('#evaluationDecisionActions', node => getComputedStyle(node).position), 'static', 'Decision actions scroll with the form');
      assert.equal(await page.$eval('#evaluationDecisionActions', node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 4, 'Decision actions stay in one row');
      assert.ok(await page.$$eval('#evaluationDecisionActions button', nodes => nodes.every(node => getComputedStyle(node).backgroundImage !== 'none' && getComputedStyle(node).color === 'rgb(255, 255, 255)')), 'All decision actions use the purple button treatment');
      await page.click('[data-evaluation-decision="Resubmit"]');
      assert.equal(await page.$eval('#evaluationStatus', node => node.value), 'Resubmit', 'Decision updates the General status');
      assert.equal(await page.$eval('#evaluationDecisionMessage', node => node.textContent), 'Performance Evaluation sent for resubmission.');
      assert.equal(await page.evaluate(() => PerformanceEvaluationStore.all().find(record => record.id === 'PE-2026-0012').status), 'Resubmit', 'Decision persists through the evaluation store');
      await noOverflow(page);
      await page.screenshot({ path: path.join(__dirname, `performance-evaluation-general-${theme}-${width}.png`) });
      for (const [kind, section, item] of [['goals', 'Goal', 'goal-2'], ['competencies', 'Competency', 'competency-3']]) {
        if (await page.$eval('#evaluationGeneralView', node => node.hidden)) await page.click('#evaluationBack');
        await page.click(`[data-evaluation-details="${kind}"]`);
        const selected = `#evaluationSectionItems [data-item-id="${item}"]`;
        const beforeAll = await page.evaluate(() => JSON.stringify(PerformanceEvaluationStore.all()));
        const beforeStorage = await page.evaluate(() => sessionStorage.getItem('pq_performance_evaluation_preview_v1'));
        await page.$eval(`#evaluationDetailView`, node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(__dirname, `performance-evaluation-${kind}-${theme}-${width}.png`) });
        await navigate(page, `${selected} .evaluation-update`);
        assert.equal(await page.$eval('#evaluationItemTitle', node => node.readOnly), true);
        assert.equal(await page.$eval('#evaluationItemWeightage', node => node.readOnly), true);
        assert.equal(await page.$eval('#evaluationItemRating', node => node.readOnly), false);
        assert.equal(await page.$eval('#evaluationItemRemark', node => node.readOnly), false);
        await setField(page, '#evaluationItemRating', '2');
        await setField(page, '#evaluationItemRemark', 'Should be cancelled');
        await navigate(page, '#evaluationItemCancel');
        assert.equal(await page.evaluate(() => JSON.stringify(PerformanceEvaluationStore.all())), beforeAll, 'Cancel leaves every record unchanged');
        assert.equal(await page.evaluate(() => sessionStorage.getItem('pq_performance_evaluation_preview_v1')), beforeStorage, 'Cancel does not write storage');
        await navigate(page, `${selected} .evaluation-update`);
        for (const bad of ['', '-1', '6']) {
          await setField(page, '#evaluationItemRating', bad);
          await page.click('#evaluationItemUpdate');
          assert.equal(await page.$eval('#evaluationItemError', node => node.hidden), false, 'Missing/out-of-range rating stays on the edit page');
          assert.equal(await page.evaluate(() => JSON.stringify(PerformanceEvaluationStore.all())), beforeAll);
        }
        await setField(page, '#evaluationItemRating', '4.5');
        await setField(page, '#evaluationItemRemark', `Updated ${kind}\nSpecific follow-up <b>plain text</b>.`);
        await noOverflow(page);
        await page.screenshot({ path: path.join(__dirname, `performance-evaluation-edit-${kind}-${theme}-${width}.png`) });
        // Even programmatic changes to read-only controls must never be included in the saved patch.
        await setField(page, '#evaluationItemTitle', 'Tampered title');
        await setField(page, '#evaluationItemWeightage', '999%');
        await navigate(page, '#evaluationItemUpdate');
        assert.equal(await page.$eval(`${selected} [data-field="rating"]`, node => node.textContent), '4.5 / 5');
        assert.equal(await page.$eval(`${selected} [data-field="remark"]`, node => node.textContent), `Updated ${kind}\nSpecific follow-up <b>plain text</b>.`);
        const expected = JSON.parse(beforeAll);
        const expectedItem = expected.find(record => record.id === 'PE-2026-0012')[kind].find(record => record.id === item);
        expectedItem.rating = 4.5;
        expectedItem.remark = `Updated ${kind}\nSpecific follow-up <b>plain text</b>.`;
        assert.deepEqual(await page.evaluate(() => PerformanceEvaluationStore.all()), expected, 'Update changes only the chosen record, section and item rating/remark');
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.equal(await page.$eval(`${selected} [data-field="rating"]`, node => node.textContent), '4.5 / 5', 'Saved edits survive reload');
      }
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      await page.click(`[data-set-theme="${nextTheme}"]`);
      if (await page.$eval('#evaluationGeneralView', node => node.hidden)) await page.click('#evaluationBack');
      await navigate(page, '#evaluationBack');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), nextTheme);
      assert.equal(await page.$eval('#evaluationTotalRecords', node => node.textContent), '1', 'Returning to list preserves all filters');
      await navigate(page, '#evaluationBack');
      assert.equal(await page.$eval('#performanceTabTeam', node => node.getAttribute('aria-selected')), 'true');
    }
    for (const [file, query] of [['performance-evaluation-form.html', '?evaluation=missing'], ['performance-evaluation-item.html', '?evaluation=PE-2026-0012&kind=goals&item=missing']]) {
      await page.goto(pageUrl(`options/${file}`, query), { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#evaluationNotFound', node => node.hidden), false, 'Invalid record/item never silently edits another employee');
    }
    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: Team evaluation filters/counts, purple employee cards, multiple goals/competencies, isolated edits, cancel, validation, persistence, navigation, themes and 360/420px layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
