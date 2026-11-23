const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    const root = pathToFileURL(path.resolve(__dirname, '..') + path.sep);
    const go = route => page.goto(new URL(route, root).href, { waitUntil: 'load' });
    const text = selector => page.$eval(selector, node => node.textContent.trim());
    const grid = '.history-card-details, .approval-card-details, .card-details-box, .project-history-card-details, .history-detail-table';
    const checkCards = async selector => {
      await page.waitForSelector(selector + ' .record-submit-date:not([hidden])', { timeout: 4000 });
      const dates = await page.$$eval(selector + ' .record-submit-date:not([hidden])', (nodes, boxes) =>
        nodes.map(node => ({ date: node.textContent, boxed: !!node.closest(boxes) })), grid);
      for (const line of dates) {
        assert.match(line.date, /^Submit Date: \d{2}\/\d{2}\/\d{4}(?:,?\s.+)?$/, selector);
        assert.equal(line.boxed, false, selector);
      }
    };

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 375, height: 810 });
      await go('modules/employee-career/options/history.html?theme=' + theme);
      const card = '[data-record-id="feedback-1"]';
      await checkCards(card);
      assert.equal(await text(card + ' .record-submit-date'), 'Submit Date: 28/05/2026');
      const layout = await page.$eval(card, node => {
        const rect = selector => node.querySelector(selector).getBoundingClientRect();
        return {
          belowHeader: rect('.record-submit-date').top >= rect('.history-card-header').bottom,
          aboveBox: rect('.record-submit-date').bottom < rect('.history-card-details').top,
          labels: [...node.querySelectorAll('.history-card-row > :first-child')].map(label => label.textContent.trim())
        };
      });
      assert.equal(layout.belowHeader && layout.aboveBox, true);
      assert.deepEqual(layout.labels, ['Feedback Date :', 'Type :', 'Category :']);
      await page.click(card + ' [data-history-link]');
      assert.equal(await text('#historyDetailBody > .record-submit-date'), 'Submit Date: 28/05/2026');
      await page.click('#closeHistoryDetails');
      await page.waitForFunction(() => !HistoryRecordPage.active);
      await page.click('[data-history-kind="whereabout"]');
      assert.equal(await page.$('#careerHistoryList .record-submit-date:not([hidden])'), null);
      await page.click('[data-history-kind="cv-change-request"]');
      await checkCards('#careerHistoryList');
      assert.equal(await page.$('#careerHistoryList .history-card-details'), null);
    }

    const pages = [
      ['modules/employee-career/options/pending-approval.html', '.approval-request-card'],
      ['modules/employee-career/options/team/history.html?category=staff-confirmation', '#teamHistoryList'],
      ['modules/employee-career/options/team/staff-feedback.html', '.staff-feedback-card'],
      ['modules/admin/options/history.html?category=letter-request', '#workplaceHistoryList'],
      ['modules/admin/options/pending-approval.html', '.approval-request-card'],
      ['modules/attendance/options/history.html', '#viewOtHistory, #viewFeedbackHistory'],
      ['modules/attendance/options/clocking-history.html', '.history-card-item'],
      ['modules/payroll/options/history.html?category=deduction', '#payrollHistoryList'],
      ['modules/payroll/options/pending-approval.html?tab=deduction', '.approval-request-card'],
      ['modules/performance/options/pending-approval.html', '.approval-request-card'],
      ['modules/claims/options/pending-approval.html', '.approval-request-card'],
      ['modules/training-competency/options/staff-tna.html', '.staff-tna-card'],
      ['leave.html?view=history', '.history-item-card']
    ];
    for (const [route, selector] of pages) {
      await go(route);
      await checkCards(':is(' + selector + ')');
    }
    await checkCards('#teamApprovalsListContainer');
    assert.equal(await page.$('.history-item-card[data-status="draft"] .record-submit-date:not([hidden])'), null);
    assert.equal(await text('[data-ref="LV-2026-0052"] .record-submit-date'), 'Submit Date: 09/09/2026, 08:30 AM');
    await go('modules/attendance/options/history.html');
    await page.$eval('#viewOtHistory article', card => card.click());
    assert.equal(await text('#modalOtSubmitDate'), 'Submit Date: 12/07/2024');
    await go('modules/attendance/options/clocking-history.html');
    await page.$eval('#viewFeedbackHistory [data-history-link]', card => card.click());
    assert.equal(await text('#modalFbkSubmitDate'), 'Submit Date: 26/02/2026');
    assert.equal(await text('#modalFbkDate'), '31 Dec 2025');
    await go('modules/claims/options/history.html');
    await page.click('[data-tab="travelRequest"]');
    await checkCards('.history-card-item');
    await go('modules/attendance/options/team.html');
    for (const category of ['feedback', 'ot_plan', 'final_ot']) {
      await page.evaluate(tab => showPendingApprovalPage(tab), category);
      await checkCards('#pendingApprovalListContent');
    }
    await go('modules/project-task/options/pending-approval.html');
    const submitted = await page.evaluate(async () => {
      await TimesheetRequests.submit({ id: 'TEST-DATE', status: 'Submitted', date: '2020-01-10', activities: [] });
      return recordSubmitDate.format(TimesheetRequests.pending().find(item => item.id === 'TEST-DATE').submittedAt);
    });
    await page.reload();
    const timesheet = '[data-reference="TEST-DATE"]';
    assert.equal(await text(timesheet + ' .record-submit-date'), 'Submit Date: ' + submitted);
    await page.click(timesheet + ' .approval-record-link');
    await page.waitForSelector('#projectApprovalSubmitDate:not([hidden])');
    assert.equal(await text('#projectApprovalSubmitDate'), 'Submit Date: ' + submitted);

    // The standalone web preview applies its desktop presentation to a frozen source snapshot.
    const preview = 'scratch/peoplehcm-web/public/';
    await go(preview + 'workspace/modules/employee-career/options/history.html');
    const adapter = file => path.resolve(__dirname, 'peoplehcm-web/public/web-adapter', file);
    await page.addStyleTag({ path: adapter('desktop.css') });
    await page.addScriptTag({ path: adapter('translations.js') });
    await page.addScriptTag({ path: adapter('bridge.js') });
    const desktopDate = '#careerHistoryList .web-record-submit-date';
    await page.waitForSelector(desktopDate);
    assert.equal(await text(desktopDate), 'Submit Date: 28/05/2026');
    assert.equal(await page.$eval(desktopDate, line => line.nextElementSibling.matches('.history-card-details')), true);
    await page.evaluate(() => PeopleHcmWebI18n.setLocale('zh'));
    assert.match(await text(desktopDate), /提交日期：\s*28\/05\/2026/);
    await page.evaluate(() => PeopleHcmWebI18n.setLocale('en'));
    assert.equal(await text(desktopDate), 'Submit Date: 28/05/2026');
    await page.click('[data-history-kind="whereabout"]');
    await page.waitForFunction(() => !document.querySelector('#careerHistoryList .web-record-submit-date'));
    await page.click('[data-history-kind="feedback"]');
    await page.waitForSelector(desktopDate);
    assert.equal(await page.$$eval(desktopDate, nodes => nodes.length), 3);
    assert.deepEqual(errors, []);
    console.log('PASS: Record submit dates across modules, both themes, saved submissions, drafts, leave timestamps and the desktop preview.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
