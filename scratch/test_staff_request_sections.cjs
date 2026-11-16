const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-request.html')).href;
    for (const theme of ['light', 'dark']) {
      await page.goto(url + '?theme=' + theme, { waitUntil: 'load' });
      const picker = '#staffRequestForm .employee-career-form-select > select#requestManpowerPlan';
      const plan = await page.$eval(picker, select => ({
        label: select.labels[0].textContent,
        required: select.required,
        value: select.value,
        choices: Array.from(select.options, option => option.value).filter(Boolean)
      }));
      assert.equal(plan.label, 'Manpower Plan #');
      assert.equal(plan.required, false);
      assert.equal(plan.value, '');
      assert.ok(plan.choices.length > 0);
      await page.select(picker, plan.choices[0]);
      assert.equal(await page.$eval('#staffRequestForm', form => new FormData(form).get('manpowerPlanNo')), plan.choices[0]);
      await page.select(picker, '');
      assert.equal(await page.$eval(picker, select => select.value), '');
    }
    assert.equal(await page.$$eval('#staffRequestForm .employee-career-form-section', nodes => nodes.length), 1);
    assert.equal(await page.$eval('#requestOverviewHeading', node => node.textContent.trim()), 'Request Detail');
    assert.equal(await page.$('#requestPositionHeading'), null);
    assert.equal(
      await page.$eval('#requestCompany', node => node.closest('.employee-career-form-section')?.getAttribute('aria-labelledby')),
      'requestOverviewHeading'
    );
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Request uses one Request Detail section and an optional manpower plan pick list in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
