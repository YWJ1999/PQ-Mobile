const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pageUrl = (theme) => pathToFileURL(path.join(root, 'modules/performance/options/goal-plan.html')).href + `?theme=${theme}&section=goals`;
const formPageUrl = (theme) => pathToFileURL(path.join(root, 'modules/performance/options/performance-goal.html')).href + `?theme=${theme}&section=goals`;

async function clickAndExpectFile(page, selector, filename) {
  await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click(selector);
  await page.waitForFunction(expected => location.pathname.endsWith(`/${expected}`), { timeout: 1500 }, filename).catch(() => {});
  assert.ok(new URL(page.url()).pathname.endsWith(`/${filename}`), `Expected navigation to ${filename}, received ${page.url()}`);
}

async function setField(page, selector, value) {
  await page.$eval(selector, (element, nextValue) => {
    element.value = nextValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));

    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844 });
        await page.goto(pageUrl(theme), { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => sessionStorage.removeItem('peoplehcm:performance:goal-plan:draft:v2'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.equal(await page.$eval('#goalPlanTitle', node => node.textContent.trim()), 'Performance Goal');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.deepEqual(await page.$$eval('#goalPlanCards .goal-plan-card-title', nodes => nodes.map(node => node.textContent)), ['Reduce Staff Attrition', 'Improve Staff Satisfaction']);
        assert.ok(await page.evaluate(() => {
          const main = document.querySelector('.goal-plan-content');
          return main.scrollWidth <= main.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth;
        }), `${theme} ${width}px has no horizontal overflow`);
      }
    }
    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844 });
        await page.goto(formPageUrl(theme), { waitUntil: 'domcontentloaded' });
        assert.equal(await page.$eval('#performanceGoalTitle', node => node.textContent.trim()), 'Performance Goal');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.deepEqual(await page.evaluate(() => {
          const content = document.querySelector('.performance-goal-content');
          const form = document.querySelector('.performance-goal-form');
          const formHeader = document.querySelector('.performance-goal-form-header');
          const body = document.querySelector('.goal-form-body');
          const footer = document.querySelector('.goal-form-footer');
          const buttons = [...footer.querySelectorAll('button')];
          const formStyle = getComputedStyle(form);
          const bodyStyle = getComputedStyle(body);
          const cancelStyle = getComputedStyle(buttons[0]);
          const buttonRects = buttons.map(button => button.getBoundingClientRect());
          return {
            hasInnerHeader: Boolean(formHeader),
            startsWithGoalTitle: form.firstElementChild === body && body.querySelector('.goal-form-field > label').textContent.replace('*', '').trim() === 'Goal Title',
            formIsPageCard: formStyle.borderRadius === '22px' && formStyle.borderBottomWidth === '1px' && formStyle.overflow === 'visible',
            bodyScrollsWithPage: bodyStyle.overflowY === 'visible',
            actions: buttons.map(button => button.textContent.trim()),
            actionsAreEqual: buttonRects.length === 2 && Math.abs(buttonRects[0].width - buttonRects[1].width) <= 1 && buttonRects.every(rect => rect.height >= 44),
            cancelUsesStandardStyle: buttons[0].classList.contains('form-cancel-btn')
              && cancelStyle.borderRadius === '999px'
              && cancelStyle.backgroundImage.includes('rgb(124, 58, 237)')
              && cancelStyle.backgroundImage.includes('rgb(109, 40, 217)')
              && cancelStyle.color === 'rgb(255, 255, 255)',
            noHorizontalOverflow: content.scrollWidth <= content.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth
          };
        }), {
          hasInnerHeader: false,
          startsWithGoalTitle: true,
          formIsPageCard: true,
          bodyScrollsWithPage: true,
          actions: ['Cancel', 'Save'],
          actionsAreEqual: true,
          cancelUsesStandardStyle: true,
          noHorizontalOverflow: true
        }, `${theme} ${width}px standalone form uses the page-card design without overflow`);
        await page.screenshot({ path: path.join(__dirname, `performance-goal-form-${theme}-${width}.png`) });
      }
    }

    await page.setViewport({ width: 420, height: 844 });
    await page.goto(pageUrl('dark'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$('#goalFormOverlay'), null, 'Goal Plan no longer keeps the legacy edit overlay');
    await page.click('#goalPlanCards .goal-plan-item-toggle');
    assert.equal(await page.$eval('#goalPlanCards .goal-plan-card-body', node => node.hidden), false, 'Item expands inline');
    assert.equal(await page.$eval('#goalPlanCards .goal-plan-item-field:first-child dd', node => node.textContent.trim()), 'Reduce Staff Attrition');
    await page.click('#goalPlanCards .goal-plan-item-toggle');

    await clickAndExpectFile(page, '#goalPlanAdd', 'performance-goal.html');
    assert.equal(await page.$eval('#performanceGoalTitle', node => node.textContent.trim()), 'Performance Goal');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'Add keeps the selected theme');
    assert.equal(await page.$('#goalFormOverlay'), null, 'Add uses a page instead of the Goal Plan overlay');
    assert.equal(await page.$$eval('.performance-header-row :is(button, .performance-info)', nodes => nodes.length), 0, 'The form header stays clean');
    assert.deepEqual(await page.$$eval('#goalForm .goal-form-field > label', nodes => nodes.filter(node => !node.closest('.goal-form-field').hidden).map(node => node.textContent.replace('*', '').trim())), [
      'Goal Title', 'Goal Type', 'Goal Description', 'Target Description', 'Deadline', 'Weightage', 'Budget Hours', 'Remark'
    ]);

    await setField(page, '#goalTitleInput', 'Discarded by Cancel');
    await clickAndExpectFile(page, '#goalFormCancel', 'goal-plan.html');
    assert.equal(await page.$$eval('#goalPlanCards .goal-plan-card', cards => cards.length), 2, 'Cancel returns without creating a goal');

    await clickAndExpectFile(page, '#goalPlanAdd', 'performance-goal.html');
    await setField(page, '#goalTitleInput', 'Discarded by Back');
    await clickAndExpectFile(page, '#performanceGoalBack', 'goal-plan.html');
    assert.equal(await page.$$eval('#goalPlanCards .goal-plan-card', cards => cards.length), 2, 'Back returns without creating a goal');

    await clickAndExpectFile(page, '#goalPlanAdd', 'performance-goal.html');
    await page.click('#goalFormSave');
    assert.equal(await page.$eval('#goalFormError', node => node.textContent.trim()), 'Goal Title is required.');

    await setField(page, '#goalTitleInput', 'Strengthen Succession Readiness');
    await setField(page, '#goalTypeInput', 'Learning & Growth');
    await setField(page, '#goalDescriptionInput', 'Build a ready-now successor pool for critical HR roles.');
    await setField(page, '#goalTargetInput', 'Base Target: 85%\nStretch Target: 95%');
    await setField(page, '#goalDeadlineInput', '2026-12-31');
    await setField(page, '#goalWeightageInput', '10');
    await setField(page, '#goalBudgetHoursInput', '24');
    await setField(page, '#goalRemarkInput', 'Quarterly talent review.');
    await clickAndExpectFile(page, '#goalFormSave', 'goal-plan.html');
    assert.equal(await page.$$eval('#goalPlanCards .goal-plan-card', cards => cards.length), 3, 'Save returns with one new goal card');
    assert.equal(await page.$eval('#goalPlanCards .goal-plan-card:last-child .goal-plan-card-title', node => node.textContent.trim()), 'Strengthen Succession Readiness', 'Saved goal data is handed back to Goal Plan');

    await clickAndExpectFile(page, '#goalPlanCards .goal-plan-card:last-child .goal-plan-card-update', 'performance-goal.html');
    assert.equal(await page.$eval('#performanceGoalTitle', node => node.textContent.trim()), 'Edit Performance Goal');
    assert.equal(await page.$('.performance-goal-form-header'), null, 'Update page has no inner purple header');
    assert.equal(await page.$eval('#goalFormSave span', node => node.textContent.trim()), 'Save');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'Update keeps the selected theme');
    assert.equal(await page.$eval('#goalTitleInput', node => node.value), 'Strengthen Succession Readiness');
    assert.equal(await page.$eval('#goalTypeInput', node => node.value), 'Learning & Growth');
    assert.equal(await page.$eval('#goalWeightageInput', node => node.value), '10');
    await setField(page, '#goalTitleInput', 'Discarded Update');
    await clickAndExpectFile(page, '#goalFormCancel', 'goal-plan.html');
    assert.equal(await page.$$eval('#goalPlanCards .goal-plan-card', cards => cards.length), 3, 'Cancel edit keeps the same number of goals');
    assert.equal(await page.$eval('#goalPlanCards .goal-plan-card:last-child .goal-plan-card-title', node => node.textContent.trim()), 'Strengthen Succession Readiness', 'Cancel edit keeps the original goal');

    await clickAndExpectFile(page, '#goalPlanCards .goal-plan-card:last-child .goal-plan-card-update', 'performance-goal.html');
    await setField(page, '#goalTitleInput', 'Strengthen Leadership Pipeline');
    await clickAndExpectFile(page, '#goalFormSave', 'goal-plan.html');
    assert.equal(await page.$$eval('#goalPlanCards .goal-plan-card', cards => cards.length), 3, 'Update replaces the goal without adding a duplicate');
    assert.equal(await page.$eval('#goalPlanCards .goal-plan-card:last-child .goal-plan-card-title', node => node.textContent.trim()), 'Strengthen Leadership Pipeline', 'Update page changes the original card');

    await page.click('#goalPlanCards .goal-plan-card:last-child .goal-plan-card-delete');
    await page.click('#goalDeleteConfirm');
    assert.equal(await page.$$eval('#goalPlanCards .goal-plan-card', cards => cards.length), 2, 'Delete removes the goal');

    await page.click('#goalPlanBack');
    await page.click('#goalPlanSaveDraft');
    assert.ok(await page.$eval('#goalPlanToast', node => node.classList.contains('show') && node.textContent.includes('draft')));
    await page.click('#goalPlanSubmit');
    assert.ok(await page.$eval('#goalPlanToast', node => node.classList.contains('show') && node.textContent.includes('submitted')));

    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: Goal Plan cards, standalone add/update forms, employee details, CRUD, draft, submit, themes and responsive layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
