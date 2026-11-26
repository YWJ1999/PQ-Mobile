const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const base = pathToFileURL(path.resolve(__dirname, '../modules/performance/options/goal-plan.html')).href;

async function click(page, selector) {
  await page.$eval(selector, element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click(selector);
}

async function navigate(page, selector) {
  await page.$eval(selector, element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click(selector)]);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const theme of ['dark', 'light']) {
      await page.goto(`${base}?theme=${theme}`);
      assert.deepEqual(
        await page.$$eval('[data-plan-section] .goal-plan-section-name', elements => elements.map(element => element.textContent)),
        ['Performance Goal', 'Competency']
      );
      assert.ok(await page.$$eval('#goalPlanGeneral input', elements => elements.length >= 6 && elements.every(element => element.readOnly)));
      assert.equal(await page.$eval('label[for=goalPlanEmployeeName]', element => element.textContent.trim()), 'Name');
      assert.equal(await page.$('#goalPlanEmployeeId'), null);
      assert.ok(await page.$eval('#goalPlanGeneral', element => element.contains(document.querySelector('.goal-plan-footer'))));
      assert.deepEqual(await page.$$eval('.goal-plan-footer > * span', elements => elements.map(element => element.textContent.trim())), ['Cancel', 'Draft', 'Submit']);
      assert.match(await page.$eval('#goalPlanCancel', element => element.getAttribute('href')), /\.\.\/index\.html\?scope=individual&theme=/);
      assert.equal(await page.$eval('.goal-plan-footer', element => getComputedStyle(element).position), 'static');
      assert.deepEqual(await page.$eval('.goal-plan-footer', element => { const style = getComputedStyle(element); return [style.backgroundColor, style.borderTopWidth, style.boxShadow, style.paddingTop]; }), ['rgba(0, 0, 0, 0)', '0px', 'none', '0px']);
      assert.ok(await page.$eval('.goal-plan-content', element => { element.scrollTop = element.scrollHeight; const footer = document.querySelector('.goal-plan-footer').getBoundingClientRect(); const viewport = element.getBoundingClientRect(); return element.scrollTop > 0 && footer.bottom <= viewport.bottom - 70; }), 'Scrollable content reaches the complete action row');
      assert.equal(await page.$eval('#goalPlanSupervisorName', element => element.value), 'Angeline Loren Alan  EBB04');
      assert.equal(await page.$eval('#goalPlanReportingName', element => element.value), 'Muhammad Ali Bin Man  EBB01');
      assert.equal(await page.$('#goalPlanReportingId'), null);

      await click(page, '[data-plan-section="goals"]');
      assert.equal(await page.$eval('#goalPlanAdd', element => element.hidden), false);
      assert.equal(await page.$$eval('.goal-plan-card-delete', elements => elements.length), 2);
      await navigate(page, '#goalPlanAdd');
      assert.equal(await page.$eval('#performanceGoalTitle', element => element.textContent), 'Performance Goal');
      await navigate(page, '#goalFormCancel');
      await click(page, '#goalPlanBack');

      await click(page, '[data-plan-section="competencies"]');
      assert.equal(await page.$eval('#goalPlanAdd', element => element.hidden), true);
      assert.equal(await page.$$eval('.goal-plan-card-delete', elements => elements.length), 0);
      assert.equal(await page.$$eval('.goal-plan-card-update', elements => elements.length), 3);
      await navigate(page, '.goal-plan-card-update');
      assert.match(await page.$eval('#performanceGoalTitle', element => element.textContent), /Edit Competency/);
      await navigate(page, '#goalFormCancel');
    }

    assert.deepEqual(errors, []);
    console.log('PASS: Goal Plan employee details, goal CRUD entry points and competency edit-only behavior.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
