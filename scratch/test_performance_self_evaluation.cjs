const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const base = pathToFileURL(path.resolve(__dirname, '../modules/performance/options/self-evaluation.html')).href;

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 844 });
    await page.goto(`${base}?theme=light`);
    assert.deepEqual(await page.$$eval('[data-evaluation-section] .goal-plan-section-name', nodes => nodes.map(node => node.textContent.trim())), ['Goal', 'Competency']);
    assert.deepEqual(await page.$$eval('.self-evaluation-actions > * span', nodes => nodes.map(node => node.textContent.trim())), ['Cancel', 'Draft', 'Submit']);
    assert.equal(await page.$eval('#selfEvaluationDetailView', node => node.hidden), true);

    await page.$eval('[data-evaluation-section="goals"]', node => node.click());
    assert.equal(await page.$eval('#selfEvaluationGeneralView', node => node.hidden), true);
    assert.equal(await page.$$eval('#selfEvaluationCards .goal-plan-card', nodes => nodes.length), 2);
    assert.equal(await page.$eval('#selfEvaluationAdd', node => node.hidden), false);
    assert.equal(await page.$$eval('#selfEvaluationCards .goal-plan-card-delete', nodes => nodes.length), 0);
    await page.click('#selfEvaluationCards .goal-plan-item-toggle');
    assert.deepEqual(await page.$$eval('#selfEvaluationCards .goal-plan-card:first-child .goal-plan-item-field dt', nodes => nodes.map(node => node.textContent)), ['Title', 'Weightage', 'Rating', 'Remark']);
    assert.equal(await page.$$eval('#selfEvaluationCards .self-evaluation-update', nodes => nodes.length), 2);
    assert.ok(await page.$eval('#selfEvaluationCards .self-evaluation-update', node => { const action = node.getBoundingClientRect(); const card = node.closest('.goal-plan-card').getBoundingClientRect(); return action.left >= card.left && action.right <= card.right; }), 'Edit action stays inside the card');
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.$eval('#selfEvaluationAdd', node => node.click())]);
    assert.equal(await page.$eval('#selfEvaluationItemPageTitle', node => node.textContent.trim()), 'Add Goal');
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.$eval('#selfEvaluationItemCancel', node => node.click())]);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.$eval('#selfEvaluationAdd', node => node.click())]);
    await page.$eval('#selfEvaluationItemTitle', node => { node.value = 'New Evaluation Goal'; });
    await page.$eval('#selfEvaluationItemWeightage', node => { node.value = '10'; });
    await page.$eval('#selfEvaluationItemRating', node => { node.value = '4'; });
    await page.$eval('#selfEvaluationItemRemark', node => { node.value = 'New self evaluation goal.'; });
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.$eval('#selfEvaluationItemForm', form => form.requestSubmit())]);
    assert.equal(await page.$$eval('#selfEvaluationCards .goal-plan-card', nodes => nodes.length), 3);

    await page.$eval('#selfEvaluationBack', node => node.click());
    await page.$eval('[data-evaluation-section="competencies"]', node => node.click());
    assert.equal(await page.$$eval('#selfEvaluationCards .goal-plan-card', nodes => nodes.length), 3);
    assert.equal(await page.$eval('#selfEvaluationListTitle', node => node.textContent.trim()), 'Competency');
    assert.equal(await page.$eval('#selfEvaluationAdd', node => node.hidden), true);
    assert.ok(await page.$eval('.self-evaluation-content', node => { node.scrollTop = node.scrollHeight; return node.scrollTop >= 0 && node.scrollWidth <= node.clientWidth + 1; }));
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.$eval('#selfEvaluationCards .self-evaluation-update', node => node.click())]);
    assert.equal(await page.$eval('#selfEvaluationItemPageTitle', node => node.textContent.trim()), 'Edit Competency');
    await page.$eval('#selfEvaluationItemRating', node => { node.value = '4.5'; });
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.$eval('#selfEvaluationItemForm', form => form.requestSubmit())]);
    assert.equal(await page.$$eval('#selfEvaluationCards .goal-plan-card', nodes => nodes.length), 3);
    await page.$eval('#selfEvaluationBack', node => node.click());
    await page.$eval('#selfEvaluationDraft', node => node.click());
    assert.equal(await page.evaluate(() => sessionStorage.getItem('pq_self_evaluation_status_v1')), 'Draft');
    await page.$eval('#selfEvaluationSubmit', node => node.click());
    assert.equal(await page.evaluate(() => sessionStorage.getItem('pq_self_evaluation_status_v1')), 'Submitted');
    console.log('PASS: Self Evaluation uses Goal Plan section, list and action patterns.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
