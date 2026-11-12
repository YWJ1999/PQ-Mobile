const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = (file, query = '') => pathToFileURL(path.join(root, 'modules/training-competency/options', file)).href + query;
const storageKey = 'peoplehcm.competencyAssessments.v1';

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const click = async selector => { await page.$eval(selector, node => node.scrollIntoView({ block: 'center' })); await page.click(selector); };
    const navigate = async (selector, ready) => { await click(selector); await page.waitForSelector(ready); };
    await page.setViewport({ width: 360, height: 900 });
    await page.goto(url('staff-competency-employee.html', '?emp=EBB12&theme=light&company=PeopleHCM+Malaysia'), { waitUntil: 'domcontentloaded' });
    await page.evaluate(key => localStorage.removeItem(key), storageKey);
    await navigate('#staffCompetencyAssess', '#staffAssessForm');
    assert.deepEqual(await page.$$eval('#staffAssessSummary > .cs-summary-field > span:first-of-type', nodes => nodes.map(node => node.textContent)), ['Employee', 'Department', 'Position', 'Skill Group', 'Record']);
    assert.equal(await page.$eval('#staffAssessTotalRecords', node => node.textContent), '1');
    assert.equal(await page.$eval('.csa-card-header', node => node.textContent.trim()), 'Effective Communication');
    assert.deepEqual(await page.$$eval('.csa-card-detail > label, .csa-card-detail > dt', nodes => nodes.map(node => node.textContent)), ['Required Level', 'Last Level', 'Current Level', 'Gap']);
    assert.equal(await page.$eval('#staffAssessSkillGroup', node => node.textContent), 'People Area');
    assert.equal(await page.$eval('[data-field="current-level"] dd', node => node.textContent), '4');
    assert.equal(await page.$eval('[data-field="gap"] dd', node => node.textContent), '0');
    assert.equal(await page.$$('#staffAssessForm select, #staffAssessForm input, #staffAssessForm [contenteditable="true"]').then(nodes => nodes.length), 0, 'Skill Group and Current Level are fixed data');
    await page.evaluate(key => {
      window.assessNativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) { if (name === key) throw new Error('Storage unavailable'); return window.assessNativeSetItem.call(this, name, value); };
    }, storageKey);
    await click('#staffAssessSubmit');
    assert.match(await page.$eval('#staffAssessError', node => node.textContent), /save/);
    assert.equal(await page.$eval('[data-field="current-level"] dd', node => node.textContent), '4');
    await page.evaluate(() => { Storage.prototype.setItem = window.assessNativeSetItem; });
    await navigate('#staffAssessSubmit', '#csEmployeeSummary');
    assert.deepEqual(await page.$$eval('#csTable tbody tr:first-child td', nodes => nodes.map(node => node.textContent)), ['Effective Communication', '4', '0', '0']);
    assert.match(page.url(), /company=PeopleHCM/);
    await click('#csTable tbody tr:first-child');
    assert.equal(await page.$$('.cs-assessment-record').then(nodes => nodes.length), 3);
    assert.equal(await page.$eval('.cs-assessment-record:first-child tr:nth-child(2) td', node => node.textContent), '4');
    await page.keyboard.press('Escape');
    await page.goto(url('competency-summary-levels.html', '?competency=effective-communication'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('tr[data-level="4"] td:last-child', node => node.textContent), '3', 'Submitting fixed levels keeps the competency distribution');
    await page.goto(url('staff-competency-employee.html', '?emp=EBB06&theme=light&company=PeopleHCM+Malaysia'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#staffCompetencyAssess', node => node.textContent.trim()), 'Assess');
    await navigate('#staffCompetencyAssess', '#staffAssessForm');
    assert.deepEqual(await page.$$eval('#staffAssessSummary .cs-summary-field', fields => fields.map(field => ({
      label: field.querySelector('span').textContent.trim(),
      value: [...field.querySelectorAll('strong')].map(node => node.textContent.trim()).join(' ')
    }))), [
      { label: 'Employee', value: 'Mei Ling' },
      { label: 'Department', value: 'Finance' },
      { label: 'Position', value: 'Accounts Assistant' },
      { label: 'Skill Group', value: 'People Area' },
      { label: 'Record', value: '1' }
    ]);
    assert.equal(await page.$eval('#staffAssessEmployeeId', node => node.textContent.trim()), '#EBB06');
    assert.equal(await page.$eval('.csa-card-header', node => node.textContent.trim()), 'Effective Communication');
    assert.deepEqual(await page.$$eval('.csa-card-detail dd', nodes => nodes.map(node => node.textContent.trim())), ['4', '2', '2', '-2']);
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(url('staff-competency-assess.html', `?emp=EBB12&theme=${theme}`), { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('[data-field="current-level"] dd', node => node.textContent), '4');
      assert.equal(await page.$eval('#staffAssessSkillGroup', node => node.textContent), 'People Area');
      assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);
      await page.screenshot({ path: path.join(__dirname, `staff-competency-assess-${theme}-${width}.png`) });
      await navigate('#staffAssessBack', '#csEmployeeSummary');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    }
    await page.goto(url('staff-competency-assess.html', '?emp=missing'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#staffAssessForm', node => node.hidden), true);
    await page.goto(url('staff-competency-assess.html', '?emp=EBB12'), { waitUntil: 'domcontentloaded' });
    const corrupt = '{invalid saved assessments';
    await page.evaluate(({ key, corrupt }) => localStorage.setItem(key, corrupt), { key: storageKey, corrupt });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await click('#staffAssessSubmit');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), corrupt);
    await page.evaluate(key => localStorage.removeItem(key), storageKey);
    assert.deepEqual(errors, []);
    console.log('PASS: Staff competency assessment fixed Skill Group and Current Level, submit/history, summary consistency, storage failure protection and responsive themes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
