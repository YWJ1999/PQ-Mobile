const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const moduleUrl = (file, query = '') => pathToFileURL(path.join(root, 'modules/training-competency', file)).href + query;
const storageKey = 'peoplehcm.staffLearningDevelopment.records.v1';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

    const click = async selector => {
      await page.$eval(selector, node => node.scrollIntoView({ block: 'center' }));
      await page.click(selector);
    };
    const fill = async (selector, value) => page.$eval(selector, (node, nextValue) => {
      node.value = nextValue;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const summaryValue = field => page.$eval(`[data-field="${field}"] strong`, node => node.textContent.trim());
    const summaryLabels = selector => page.$$eval(`${selector} .ld-summary-field > span`, nodes => nodes.map(node => node.textContent.trim()));

    await page.goto(moduleUrl('index.html', '?scope=team&theme=dark'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('[data-option-id="staff-learning-development-plan"]', node => node.tagName), 'A', 'Staff L&D Plan must open its page');
    assert.equal(await page.$eval('[data-option-id="staff-learning-development-plan"]', node => node.getAttribute('href')), 'options/staff-learning-development-plan.html?theme=dark');
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('[data-option-id="staff-learning-development-plan"]')]);

    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Staff L&D Plan');
    assert.equal(await page.$eval('#sldBack', node => node.getAttribute('href')), '../index.html?scope=team&theme=dark');
    assert.deepEqual(await summaryLabels('#sldPlanSummary'), ['Employee', 'Position', 'Period', 'Description', 'Records', 'Average Progress%']);
    assert.deepEqual(await page.$eval('[data-field="employee"] strong', node => {
      const name = node.querySelector('.sld-employee-name');
      const employeeId = node.querySelector('.sld-employee-id');
      const style = getComputedStyle(employeeId);
      return {
        name: name.textContent.trim(),
        employeeId: employeeId.textContent.trim(),
        directlyBelow: name.nextElementSibling === employeeId,
        display: style.display,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      };
    }), { name: 'Mei Ling', employeeId: '#EBB06', directlyBelow: true, display: 'block', fontSize: '11.5px', fontWeight: '700' });
    assert.equal(await summaryValue('position'), 'Accounts Assistant');
    assert.equal(await summaryValue('period'), '2026');
    assert.equal(await summaryValue('description'), 'Annual Learning & Development Plan');
    assert.equal(await summaryValue('total-records'), '2');
    assert.equal(await summaryValue('average-progress'), '40%');
    assert.equal(await page.$$('.sld-activity-card').then(nodes => nodes.length), 2);
    assert.deepEqual(await page.$$eval('.sld-activity-card', cards => cards.map(card => ({
      title: card.querySelector('.ld-card-header h2').textContent.trim(),
      labels: [...card.querySelectorAll('.ld-card-detail dt')].map(node => node.textContent.trim()),
      values: [...card.querySelectorAll('.ld-card-detail dd')].map(node => node.textContent.trim()),
      action: card.querySelector('.sld-update').textContent.trim(),
      hasArrow: Boolean(card.querySelector('.fa-chevron-right')),
      purpleHeader: getComputedStyle(card.querySelector('.ld-card-header')).backgroundImage.includes('linear-gradient')
    }))), [
      { title: 'Leadership & Crisis Management', labels: ['Budget Hours', 'Deadline', 'Review Month(s)', 'Progress%'], values: ['24', '31 Dec 2026', '3', '50%'], action: 'Update', hasArrow: false, purpleHeader: true },
      { title: 'HR Analytics & Reporting', labels: ['Budget Hours', 'Deadline', 'Review Month(s)', 'Progress%'], values: ['18', '30 Nov 2026', '1', '30%'], action: 'Update', hasArrow: false, purpleHeader: true }
    ]);

    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('.sld-update')]);
    await page.waitForSelector('#sldProgressSummary');
    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Staff L&D Progress');
    assert.deepEqual(await summaryLabels('#sldProgressSummary'), ['Activity', 'Deadline', 'Budget Hours', 'Review Due', 'Progress%', 'Records', 'Total Used Hours']);
    assert.equal(await summaryValue('activity'), 'Leadership & Crisis Management');
    assert.equal(await summaryValue('progress'), '50%');
    assert.equal(await summaryValue('total-records'), '2');
    assert.equal(await summaryValue('total-used-hours'), '14');
    assert.deepEqual(await page.$eval('#sldAddProgress', node => ({
      tag: node.tagName,
      label: node.getAttribute('aria-label'),
      icon: node.querySelector('i')?.classList.contains('fa-plus'),
      text: node.textContent.trim()
    })), { tag: 'A', label: 'Add progress record', icon: true, text: '' });
    assert.equal(await page.$$('.sld-record-card').then(nodes => nodes.length), 2);
    assert.equal(await page.$$('.sld-record-card .ld-card-footer').then(nodes => nodes.length), 2);
    assert.equal(await page.$$('.sld-record-action i').then(nodes => nodes.length), 0, 'Staff Edit and Delete actions are text only');
    assert.deepEqual(await page.$eval('.sld-record-card', card => {
      const actions = [...card.querySelectorAll('.sld-record-action')];
      const styles = actions.map(action => {
        const style = getComputedStyle(action);
        return { backgroundImage: style.backgroundImage, borderColor: style.borderColor, color: style.color, boxShadow: style.boxShadow };
      });
      return { labels: actions.map(action => action.textContent.trim()), sameStyle: JSON.stringify(styles[0]) === JSON.stringify(styles[1]) };
    }), { labels: ['Edit', 'Delete'], sameStyle: true }, 'Staff Edit and Delete actions use the same colour treatment');

    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldAddProgress')]);
    await page.waitForSelector('#sldEditForm');
    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Add L&D Progress');
    assert.deepEqual(await summaryLabels('#sldEditSummary'), ['Activity', 'Deadline', 'Budget Hours', 'Review Due', 'Progress%']);
    assert.deepEqual(await page.$$eval('#sldEditForm label', labels => labels.map(label => label.textContent.replace('*', '').trim())), ['Start', 'End', 'Progress%', 'Hours', 'Remarks']);
    assert.equal(await page.$eval('#sldSave', node => node.textContent.trim()), 'Add');
    assert.equal(await page.$eval('#sldCancel', node => node.textContent.trim()), 'Cancel');
    assert.deepEqual(await page.$$eval('#sldEditForm :is(input, textarea)', nodes => nodes.map(node => node.value)), ['', '', '', '', '']);

    await click('#sldSave');
    assert.match(await page.$eval('#sldEditError', node => node.textContent), /Start Date is required/);
    await fill('#sldStartInput', '2026-08-02');
    await fill('#sldEndInput', '2026-08-01');
    await click('#sldSave');
    assert.match(await page.$eval('#sldEditError', node => node.textContent), /End Date must be on or after Start Date/);
    await fill('#sldEndInput', '2026-08-03');
    await fill('#sldProgressInput', '101');
    await click('#sldSave');
    assert.match(await page.$eval('#sldEditError', node => node.textContent), /between 0 and 100/);
    await fill('#sldProgressInput', '68');
    await fill('#sldHoursInput', '-1');
    await click('#sldSave');
    assert.match(await page.$eval('#sldEditError', node => node.textContent), /Hours must be 0 or more/);
    await fill('#sldHoursInput', '5.5');
    await fill('#sldRemarksInput', 'Completed the management response exercise.');
    await click('#sldSave');
    await page.waitForSelector('#sldProgressSummary');
    assert.equal(await summaryValue('progress'), '68%');
    assert.equal(await summaryValue('total-records'), '3');
    assert.equal(await summaryValue('total-used-hours'), '19.5');
    assert.equal(await page.$$('.sld-record-card').then(nodes => nodes.length), 3);
    assert.deepEqual(await page.$$eval('.sld-record-card:last-child .ld-card-detail dd', nodes => nodes.map(node => node.textContent.trim())), ['02 Aug 2026', '03 Aug 2026', '5.5', '68%']);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await summaryValue('progress'), '68%', 'Staff progress persists after reload');
    assert.equal(await page.$$('.sld-record-card').then(nodes => nodes.length), 3);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldBack')]);
    await page.waitForSelector('#sldPlanSummary');
    assert.equal(await summaryValue('average-progress'), '49%');

    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('.sld-update')]);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldAddProgress')]);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldCancel')]);
    await page.waitForSelector('#sldProgressSummary');
    assert.equal(await page.$$('.sld-record-card').then(nodes => nodes.length), 3, 'Cancel keeps existing progress records');

    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('.sld-record-card:nth-child(2) .sld-edit')]);
    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Edit L&D Progress');
    assert.equal(await page.$eval('#sldSave', node => node.textContent.trim()), 'Update');
    assert.deepEqual(await page.$$eval('#sldEditForm :is(input, textarea)', nodes => nodes.map(node => node.value)), [
      '2026-06-15', '2026-06-16', '50', '8', 'Applied the crisis response framework in a team simulation.'
    ]);
    await fill('#sldProgressInput', '55');
    await fill('#sldHoursInput', '9');
    await fill('#sldRemarksInput', 'Updated after the manager review.');
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldSave')]);
    assert.equal(await summaryValue('progress'), '68%', 'Editing an earlier record keeps the latest progress');
    assert.equal(await summaryValue('total-records'), '3');
    assert.equal(await summaryValue('total-used-hours'), '20.5');
    await click('.sld-record-card:last-child .sld-delete');
    assert.equal(await page.$$('.sld-record-card').then(nodes => nodes.length), 2);
    assert.equal(await summaryValue('progress'), '55%');
    assert.equal(await summaryValue('total-records'), '2');
    assert.equal(await summaryValue('total-used-hours'), '15');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await summaryValue('progress'), '55%', 'Edited and deleted Staff records persist after reload');
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldBack')]);
    assert.equal(await summaryValue('average-progress'), '42.5%', 'Edit and delete update the Staff plan average');

    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await page.goto(moduleUrl('options/staff-learning-development-plan.html', `?theme=${theme}`), { waitUntil: 'domcontentloaded' });
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.ok(await page.$eval('.main-content', node => node.scrollWidth - node.clientWidth <= 1), `${theme} Staff L&D Plan fits at ${width}px`);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('.sld-update')]);
        assert.ok(await page.$eval('.main-content', node => node.scrollWidth - node.clientWidth <= 1), `${theme} Staff L&D Progress fits at ${width}px`);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldAddProgress')]);
        assert.ok(await page.$eval('.main-content', node => node.scrollWidth - node.clientWidth <= 1), `${theme} Staff L&D Add fits at ${width}px`);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#sldCancel')]);
      }
    }

    await page.goto(moduleUrl('options/staff-learning-development-update.html', '?activity=missing&theme=light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#sldUnavailable', node => node.hidden), false);
    await page.goto(moduleUrl('options/staff-learning-development-edit.html', '?activity=missing&theme=light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#sldEditForm', node => node.hidden), true);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ 'leadership-crisis': null })), storageKey);
    await page.goto(moduleUrl('options/staff-learning-development-plan.html', '?theme=light'), { waitUntil: 'domcontentloaded' });
    assert.match(await page.$eval('#sldStorageError', node => node.textContent), /could not be loaded/);
    assert.equal(await summaryValue('average-progress'), '40%', 'Invalid storage falls back to source records');

    assert.deepEqual(pageErrors, []);
    console.log('PASS: Staff L&D Plan routing, summaries, purple cards, update flow, add validation, persistence and responsive themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
