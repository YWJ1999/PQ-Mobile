const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const url = (file, theme) => pathToFileURL(path.join(root, 'modules/training-competency', file)).href + `?theme=${theme}`;

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
      await page.goto(url('index.html', theme), { waitUntil: 'domcontentloaded' });
      const entry = await page.$eval('[data-option-id="training-plan"]', node => ({ tag: node.tagName, href: node.href }));
      assert.equal(entry.tag, 'A', 'Training Plan opens its implemented page instead of a coming-soon toast');
      assert.ok(entry.href.includes(`theme=${theme}`), 'Training Plan entry preserves the active theme');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-option-id="training-plan"]')]);
      assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Training Plan');
      assert.equal(await page.$eval('#trainingPlanPosition', node => node.textContent), 'Group HR Manager');
      assert.deepEqual(await page.$$eval('.training-plan-summary-field > span', nodes => nodes.map(node => node.textContent)), ['Position', 'Supervisor', 'Reporting To']);
      assert.deepEqual(await page.$$eval('.training-plan-person', nodes => nodes.map(node => [...node.children].map(child => child.textContent))), [
        ['Angeline Loren Alan', '#EBB04'], ['Muhammad Ali Bin Man', '#EBB01']
      ], 'Employee IDs are directly below reporting names');
      assert.ok(await page.$('.record-summary-card .record-summary-metric .record-summary-value'), 'Total Records uses the shared design');
      assert.equal(await page.$eval('#trainingPlanTotalRecords', node => node.textContent), '2');
      assert.deepEqual(await page.$$eval('.training-plan-card-header h2', nodes => nodes.map(node => node.textContent)), ['Channel Assembly', 'Bolt Fitment']);
      assert.deepEqual(await page.$$eval('.training-plan-card-header .card-status-badge', nodes => nodes.map(node => node.textContent)), ['Not Attended', 'Completed']);
      assert.ok(await page.$$eval('.training-plan-card', nodes => nodes.every(node => JSON.stringify([...node.querySelectorAll('dt')].map(node => node.textContent)) === JSON.stringify(['Last Attended', 'Next Due Date', 'Remarks']))), 'Each course shows its details below the status header');
      assert.deepEqual(await page.$eval('[data-course-id="channel-assembly"]', card => [...card.querySelectorAll('dd')].map(node => node.textContent)), [
        'Not yet attended', '15 Nov 2026', 'Please enroll in this course as soon as possible.'
      ]);
      assert.deepEqual(await page.$eval('[data-course-id="bolt-fitment"]', card => [...card.querySelectorAll('dd')].map(node => node.textContent)), [
        '18 Sep 2026', '18 Sep 2027', 'You have completed this course.'
      ]);
      assert.deepEqual(await page.$$eval('.training-plan-card', nodes => nodes.map(node => ({
        remarksCount: node.querySelectorAll('[data-field="remarks"]').length,
        messageOccurrences: node.textContent.split(node.querySelector('[data-field="remarks"] dd').textContent).length - 1
      }))), [
        { remarksCount: 1, messageOccurrences: 1 },
        { remarksCount: 1, messageOccurrences: 1 }
      ], 'Enrollment and completion messages appear once as the course remarks');
      assert.equal(await page.$$eval('.training-plan-card :is(button, a, [role="button"])', nodes => nodes.length), 0, 'Course cards and their messages are informational');
      assert.equal(await page.$eval('#trainingPlanEmpty', node => node.hidden), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1), 'No horizontal overflow');
      await page.screenshot({ path: path.join(__dirname, `training-plan-summary-${theme}-${width}.png`) });
      await page.$eval('[data-course-id="channel-assembly"]', node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: path.join(__dirname, `training-plan-courses-${theme}-${width}.png`) });
      await page.$eval('[data-course-id="bolt-fitment"]', node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: path.join(__dirname, `training-plan-completed-${theme}-${width}.png`) });
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      await page.click(`[data-set-theme="${nextTheme}"]`);
      assert.ok((await page.$eval('#trainingPlanBack', node => node.href)).includes(`scope=individual&theme=${nextTheme}`));
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#trainingPlanBack')]);
      assert.equal(await page.$eval('#trainingCompetencyTabIndividual', node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), nextTheme);
    }
    // Exercise the rendered empty state rather than assuming preview records always exist.
    const override = await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'TRAINING_PLAN_DATA', { get: () => ({ employee: {}, courses: [] }), set: () => {} });
    });
    await page.goto(url('options/training-plan.html', 'light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#trainingPlanTotalRecords', node => node.textContent), '0');
    assert.equal(await page.$eval('#trainingPlanEmpty', node => node.hidden), false);
    assert.equal(await page.$$eval('.training-plan-card', nodes => nodes.length), 0);
    await page.removeScriptToEvaluateOnNewDocument(override.identifier);
    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: Training Plan routing, reporting information, record totals, purple course cards, attendance/reminders, empty state, themes and 360/420px layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
