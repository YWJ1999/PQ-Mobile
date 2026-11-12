const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const moduleUrl = (file, query = '') => pathToFileURL(path.join(root, 'modules/training-competency', file)).href + query;
const storageKey = 'peoplehcm.learningDevelopment.records.v1';

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 360, height: 900 });
    const click = async selector => {
      await page.$eval(selector, node => node.scrollIntoView({ block: 'center' }));
      await page.click(selector);
    };
    const fill = async (selector, value) => page.$eval(selector, (node, value) => {
      node.value = value;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const value = field => page.$eval(`[data-field="${field}"] strong`, node => node.textContent.trim());
    await page.goto(moduleUrl('index.html', '?theme=dark'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('[data-option-id="learning-development-plan"]', node => node.tagName), 'A', 'L&D Plan must open its page');
    await click('[data-option-id="learning-development-plan"]');
    await page.waitForSelector('#ldPlanSummary');
    await page.evaluate(key => localStorage.removeItem(key), storageKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.deepEqual(await page.$$eval('#ldPlanSummary .ld-summary-field > span', nodes => nodes.map(node => node.textContent)), ['Employee Name', 'Position', 'Period', 'Description', 'Records', 'Average Progress%']);
    assert.equal(await value('employee-name'), 'Farhan Binti Rahmat');
    assert.equal(await value('total-records'), '2');
    assert.equal(await value('average-progress'), '40%');
    assert.equal(await page.$$('.ld-activity-card').then(nodes => nodes.length), 2);
    assert.match(await page.$eval('.ld-card-header', node => node.textContent), /Leadership & Crisis Management/);
    await click('.ld-update');
    await page.waitForSelector('#ldProgressSummary');
    assert.deepEqual(await page.$$eval('#ldProgressSummary .ld-summary-field > span', nodes => nodes.map(node => node.textContent)), ['Activity', 'Deadline', 'Budget Hours', 'Review Due', 'Progress%', 'Records', 'Total Used Hours']);
    assert.equal(await value('progress'), '50%');
    assert.equal(await value('total-records'), '2');
    assert.equal(await value('total-used-hours'), '14');
    assert.equal(await page.$$('.ld-record-card .ld-card-header .fa-chevron-right').then(nodes => nodes.length), 0, 'Progress cards do not show header arrows');
    assert.equal(await page.$$('.ld-record-action i').then(nodes => nodes.length), 0, 'Edit and Delete actions are text only');
    assert.deepEqual(await page.$eval('.ld-record-card', card => {
      const styles = [...card.querySelectorAll('.ld-record-action')].map(button => {
        const style = getComputedStyle(button);
        return {
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          borderColor: style.borderColor,
          boxShadow: style.boxShadow,
          color: style.color
        };
      });
      return { actionCount: styles.length, sameStyle: JSON.stringify(styles[0]) === JSON.stringify(styles[1]) };
    }), { actionCount: 2, sameStyle: true }, 'Edit and Delete actions use the same colour treatment');
    assert.deepEqual(await page.$eval('#ldAddProgress', button => ({
      tag: button.tagName,
      label: button.getAttribute('aria-label'),
      icon: button.querySelector('i')?.classList.contains('fa-plus'),
      visibleText: button.textContent.trim()
    })), { tag: 'A', label: 'Add progress record', icon: true, visibleText: '' }, 'Progress records provide an accessible add icon');
    await click('#ldAddProgress');
    await page.waitForSelector('#ldEditForm');
    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Add L&D Progress');
    assert.equal(await page.$eval('.form-section-heading', node => node.textContent.trim()), 'Progress Details');
    assert.equal(await page.$eval('#ldSave', node => node.textContent.trim()), 'Add');
    assert.deepEqual(await page.$$eval('#ldEditForm :is(input, textarea)', nodes => nodes.map(node => node.value)), ['', '', '', '', ''], 'Add opens the Edit-style form with empty fields');
    await click('#ldSave');
    assert.match(await page.$eval('#ldEditError', node => node.textContent), /Start Date is required/);
    await click('#ldCancel');
    await page.waitForSelector('#ldProgressSummary');
    assert.equal(await value('total-records'), '2', 'Cancelling Add keeps existing progress records');
    await click('.ld-record-open');
    await page.waitForSelector('#ldDetailsOverlay:not([hidden])');
    assert.deepEqual(await page.$$eval('#ldDetailsRows th', nodes => nodes.map(node => node.textContent)), ['Start Date', 'End Date', 'Progress', 'Hours', 'Remarks']);
    assert.equal(await page.$eval('main', node => node.inert), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.getElementById('ldDetailsOverlay').contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#ldDetailsOverlay', node => node.hidden), true);
    assert.equal(await page.$eval('main', node => node.inert), false);
    await click('.ld-record-card:last-child .ld-edit');
    await page.waitForSelector('#ldEditForm');
    assert.deepEqual(await page.$$eval('#ldEditSummary .ld-summary-field > span', nodes => nodes.map(node => node.textContent)), ['Activity', 'Deadline', 'Budget Hours', 'Review Due', 'Progress%']);
    assert.equal(await page.$eval('#ldProgressInput', node => node.value), '50');
    await fill('#ldProgressInput', '101');
    await click('#ldSave');
    assert.match(await page.$eval('#ldEditError', node => node.textContent), /0.*100/);
    await fill('#ldProgressInput', '70');
    await fill('#ldEndInput', '2026-01-01');
    await click('#ldSave');
    assert.match(await page.$eval('#ldEditError', node => node.textContent), /End.*Start/i);
    await fill('#ldEndInput', '2026-06-16');
    await fill('#ldHoursInput', '-1');
    await click('#ldSave');
    assert.match(await page.$eval('#ldEditError', node => node.textContent), /Hours/);
    await fill('#ldHoursInput', '10');
    await fill('#ldRemarksInput', 'Applied the crisis framework <img src=x onerror=alert(1)>');
    await page.evaluate(key => {
      window.ldTestNativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {
        if (name === key) throw new Error('Storage unavailable');
        return window.ldTestNativeSetItem.call(this, name, value);
      };
    }, storageKey);
    await click('#ldSave');
    assert.match(await page.$eval('#ldStorageError', node => node.textContent), /Unable to save/);
    assert.equal(await page.$eval('#ldProgressInput', node => node.value), '70', 'Failed save keeps the edit available');
    await page.evaluate(() => { Storage.prototype.setItem = window.ldTestNativeSetItem; });
    await click('#ldSave');
    await page.waitForSelector('#ldProgressSummary');
    assert.equal(await value('progress'), '70%');
    assert.equal(await value('total-used-hours'), '16');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await value('progress'), '70%');
    await click('.ld-record-card:last-child .ld-record-open');
    assert.match(await page.$eval('#ldDetailsRows', node => node.textContent), /Applied the crisis framework <img/);
    assert.equal(await page.$$('#ldDetailsRows img').then(nodes => nodes.length), 0);
    await click('#ldDetailsClose');
    await click('.ld-record-card:last-child .ld-edit');
    await page.waitForSelector('#ldEditForm');
    await fill('#ldProgressInput', '99');
    await click('#ldCancel');
    await page.waitForSelector('#ldProgressSummary');
    assert.equal(await value('progress'), '70%');
    await click('#ldBack');
    await page.waitForSelector('#ldPlanSummary');
    assert.equal(await value('average-progress'), '50%');

    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 900 });
        await page.goto(moduleUrl('options/learning-development-plan.html', `?theme=${theme}`), { waitUntil: 'domcontentloaded' });
        const check = async name => {
          assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true, `${name} ${theme} ${width}: no overflow`);
          await page.screenshot({ path: path.join(__dirname, `ld-${name}-${theme}-${width}.png`) });
        };
        await check('plan');
        await click('.ld-update');
        await page.waitForSelector('#ldProgressSummary');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        await check('progress');
        await click('.ld-record-open');
        await check('details');
        await click('#ldDetailsClose');
        await click('.ld-edit');
        await page.waitForSelector('#ldEditForm');
        await check('edit');
        await click('#ldCancel');
        await page.waitForSelector('#ldProgressSummary');
      }
    }
    await click('#ldAddProgress');
    await page.waitForSelector('#ldEditForm');
    await fill('#ldStartInput', '2026-08-01');
    await fill('#ldEndInput', '2026-08-02');
    await fill('#ldProgressInput', '80');
    await fill('#ldHoursInput', '4');
    await fill('#ldRemarksInput', 'Completed the follow-up leadership exercise.');
    await click('#ldSave');
    await page.waitForSelector('#ldProgressSummary');
    assert.equal(await value('total-records'), '3');
    assert.equal(await value('total-used-hours'), '20');
    assert.equal(await value('progress'), '80%');
    assert.deepEqual(await page.$$eval('.ld-record-card:last-child .ld-card-detail dd', nodes => nodes.map(node => node.textContent.trim())), ['01 Aug 2026', '02 Aug 2026', '4', '80%']);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await value('total-records'), '3', 'Added progress persists after reload');
    await click('.ld-record-card:last-child .ld-delete');
    assert.equal(await value('total-records'), '2');
    assert.equal(await value('total-used-hours'), '16');
    assert.equal(await value('progress'), '70%');
    await click('.ld-record-card:last-child .ld-delete');
    assert.equal(await value('total-records'), '1');
    assert.equal(await value('total-used-hours'), '6');
    assert.equal(await value('progress'), '25%');
    await click('.ld-delete');
    assert.equal(await value('total-records'), '0');
    assert.equal(await value('progress'), '0%');
    assert.equal(await page.$eval('#ldRecordsEmpty', node => node.hidden), false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await value('total-records'), '0');
    await page.goto(moduleUrl('options/learning-development-update.html', '?activity=missing&theme=light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#ldUnavailable', node => node.hidden), false);
    await page.goto(moduleUrl('options/learning-development-edit.html', '?activity=leadership-crisis&record=missing&theme=light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#ldEditForm', node => node.hidden), true);
    const corrupted = await page.evaluate(key => {
      const raw = JSON.stringify({ 'leadership-crisis': window.TRAINING_LEARNING_DEVELOPMENT.activities[0].records, 'hr-analytics': null });
      localStorage.setItem(key, raw);
      return raw;
    }, storageKey);
    await page.goto(moduleUrl('options/learning-development-update.html', '?activity=leadership-crisis&theme=light'), { waitUntil: 'domcontentloaded' });
    assert.match(await page.$eval('#ldStorageError', node => node.textContent), /could not be loaded/);
    await click('.ld-delete');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), corrupted, 'A load error must never overwrite the saved records');
    assert.equal(await value('total-records'), '2', 'A blocked deletion keeps the displayed records');
    await page.evaluate(key => localStorage.removeItem(key), storageKey);
    assert.deepEqual(errors, []);
    console.log('PASS: L&D Plan routing, summaries, purple cards, detail dialog, edit/cancel/delete, validation, persistence, aggregate updates and 4 mobile/theme combinations');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
