const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = (file, query) => pathToFileURL(path.resolve(__dirname, '..', file)).href + query;
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844 });
        const history = url('modules/employee-career/options/history.html', '?category=feedback&theme=' + theme);
        await page.goto(history, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.removeItem('pq_employee_career_feedback_edits'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.equal(await page.$$eval('#careerHistoryList [data-edit-feedback]', els => els.length), 3, 'Feedback cards have Edit');
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(__dirname, `feedback-history-edit-${theme}-${width}.png`) });
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-edit-feedback="feedback-2"]')]);
        assert.equal(await page.$eval('h1', el => el.textContent), 'Edit Feedback');
        assert.equal(await page.$eval('#feedbackTitle', el => el.value), 'Bank account number is wrong');
        assert.equal(await page.$eval('#feedbackType', el => el.value), 'Wrong Data');
        assert.equal(await page.$eval('#feedbackCategory', el => el.value), 'Personal Data');
        assert.equal(await page.$eval('#feedbackDate1', el => el.value), '2025-12-31');
        await page.$eval('#feedbackTitle', el => { el.value = 'Cancelled edit'; });
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('.form-cancel-btn')]);
        assert.ok((await page.$eval('[data-record-id="feedback-2"]', el => el.textContent)).includes('Bank account number is wrong'));
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-edit-feedback="feedback-1"]')]);
        assert.equal(await page.$eval('#feedbackTitle', el => el.value), 'abc');
        await page.$eval('#feedbackTitle', el => { el.value = 'Updated feedback'; });
        await page.$eval('#feedbackBody', el => { el.value = 'Updated suggestion'; });
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#feedbackSubmit')]);
        assert.ok(page.url().includes('category=feedback') && page.url().includes('theme=' + theme));
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.equal(await page.$eval('[data-record-id="feedback-1"] .history-card-title', el => el.textContent), 'Updated feedback');
        await page.click('[data-record-id="feedback-1"] .career-history-card-open');
        assert.ok((await page.$eval('#historyDetailBody', el => el.textContent)).includes('Updated suggestion'));
        assert.equal(await page.$eval('.career-history-employee-id', el => el.textContent), '#EBB12', 'Editing preserves employee identity');
        assert.equal(await page.$eval('#historyEditFeedback', el => el.textContent.trim()), 'Edit Feedback');
        assert.ok(await page.$('#historyEditFeedback > .fa-pen[aria-hidden="true"]'));
        assert.ok(await page.$eval('#historyEditFeedback', el => {
          const footer = el.parentElement;
          const style = getComputedStyle(footer);
          const contentWidth = footer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          const button = el.getBoundingClientRect();
          const icon = el.firstElementChild.getBoundingClientRect();
          const label = el.lastElementChild.getBoundingClientRect();
          return Math.abs(button.width - contentWidth) <= 1 && button.height >= 44
            && icon.right < label.left && Math.abs((icon.left + label.right) - (button.left + button.right)) <= 2;
        }), 'The pencil and label are centered in the full-width detail button');
        await page.screenshot({ path: path.join(__dirname, `feedback-detail-edit-${theme}-${width}.png`) });
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#historyEditFeedback')]);
        assert.equal(await page.$eval('#feedbackTitle', el => el.value), 'Updated feedback', 'Detail Edit opens its active record');
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('.form-cancel-btn')]);
        await page.click('#historyFilterTrigger');
        await page.select('#historyFeedbackType', 'Wrong Data');
        await page.click('#applyHistoryFilter');
        await page.evaluate(() => {
          window.EmployeeCareerFeedbackStore.update('feedback-1', { type: 'Compliment', title: 'Updated feedback', note: 'Updated suggestion' });
          window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        });
        await page.click('#historyFilterTrigger');
        assert.equal(await page.$eval('#historyFeedbackType', el => el.value), 'Wrong Data', 'Restoring History retains a valid filter');
        assert.ok(await page.$$eval('#historyFeedbackType option', els => els.some(el => el.value === 'Compliment')), 'Restored History includes edited types in the filter');
        await page.select('#historyFeedbackType', 'Compliment');
        await page.click('#applyHistoryFilter');
        assert.equal(await page.$$eval('#careerHistoryList .history-card-item', els => els.length), 1);
        await page.click('[data-history-kind="whereabout"]');
        assert.equal(await page.$$eval('[data-edit-feedback]', els => els.length), 0);
        assert.ok(await page.evaluate(() => document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1));
      }
    }
    await page.goto(url('modules/employee-career/options/individual/feedback.html', '?edit=missing&theme=light'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#feedbackSubmit', el => el.disabled), true, 'Unknown record cannot save');
    assert.deepEqual(errors, []);
    console.log('PASS: Feedback card Edit opens the correct form, preserves existing types, cancels safely, saves and reloads details, and fits both themes at 360/420px.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
