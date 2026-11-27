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
    const expectedGuestDates = {
      'sample-guest-0001': '17/01/2024', 'sample-guest-0002': '29/01/2024', 'sample-guest-0003': '28/01/2024',
      'sample-guest-0006': '18/04/2024', 'sample-guest-0007': '06/06/2024', 'sample-guest-0008': '03/07/2024',
      'sample-guest-0009': '03/07/2024'
    };
    const workplaceDates = {
      'guest-visit': expectedGuestDates,
      'letter-request': {
        'sample-letter-0001': '15/10/2022', 'sample-letter-0002': '02/09/2019', 'sample-letter-0091': '09/08/2021',
        'sample-letter-0004': '04/09/2022', 'sample-letter-0005': '19/07/2022', 'sample-letter-0006': '15/10/2022'
      },
      'inventory-request': { 'sample-inventory-0064': '08/09/2026', 'sample-inventory-0065': '10/09/2026' }
    };
    async function checkWorkplaceDates(dateClass) {
      for (const [kind, expected] of Object.entries(workplaceDates)) {
        await page.click(`[data-history-kind="${kind}"]`);
        const selector = `.${dateClass}:not([hidden])`;
        await page.waitForFunction(selector => document.querySelector('#workplaceHistoryList ' + selector), {}, selector);
        const entries = await page.$$eval('#workplaceHistoryList [data-record-id]', (cards, selector) => cards.map(card => {
          const lines = card.querySelectorAll(selector);
          const line = lines[0];
          return [card.dataset.recordId, lines.length === 1 && line.getBoundingClientRect().width > 0
            && line.nextElementSibling.matches('.history-card-details') && line.querySelector('strong').textContent];
        }), selector);
        assert.deepEqual(Object.fromEntries(entries), expected, kind);
      }
    }
    const panels = '.history-card-details, .approval-card-details, .card-details-box, .project-history-card-details, .change-history-date, .leave-highlight-detail-body';
    const checkCards = async selector => {
      const types = ':is(.history-card-item, .history-item-card, .approval-request-card, .project-approval-card, .project-history-card, .change-history-item)';
      const cards = selector + types + ', ' + selector + ' ' + types;
      await page.waitForSelector(cards, { visible: true, timeout: 4000 });
      const dates = await page.$$eval(cards, (nodes, panels) => nodes.filter(card => card.getClientRects().length).map(card => {
        const line = card.querySelector('.card-submit-date:not([hidden])');
        if (!line) return { count: 0, record: card.innerText.slice(0, 120) };
        const header = card.querySelector('.history-card-header, .record-card-header, .project-history-card-top, .approval-record-header, .payroll-approval-card-header, .project-approval-card-banner, .change-history-title');
        const panel = card.querySelector(panels);
        const rect = line.getBoundingClientRect();
        const label = line.firstElementChild.getBoundingClientRect();
        const value = line.lastElementChild.getBoundingClientRect();
        return {
          text: line.textContent.trim(),
          outside: !line.closest(panels),
          beforePanel: !panel || line.nextElementSibling === panel,
          count: card.querySelectorAll('.record-submit-date:not([hidden])').length,
          laidOut: rect.width > 0 && label.right <= value.left && Math.abs(label.top - value.top) < 2 &&
            (!header || header.getBoundingClientRect().bottom <= rect.top + 1) &&
            (!panel || rect.bottom <= panel.getBoundingClientRect().top + 1)
        };
      }), panels);
      for (const line of dates) {
        const context = page.url() + ' ' + JSON.stringify(line);
        assert.equal(line.count, 1, context);
        assert.match(line.text, /^Submit Date: (?:\d{2}\/\d{2}\/\d{4}|—)$/, context);
        assert.ok(line.outside && line.beforePanel && line.laidOut, context);
      }
      assert.ok(dates.length > 0, page.url() + ' should have visible records');
    };
    const taxDates = {
      RBT000000000039: '07/01/2026', RBT000000000049: '19/03/2026', RBT000000000050: '19/03/2026'
    };
    async function checkTaxDates(container, dateClass) {
      const cards = container + ' [data-reference]';
      await page.waitForFunction((cards, field) =>
        [...document.querySelectorAll(cards)].some(card => card.querySelector(field)?.textContent === '19/03/2026'),
        { timeout: 4000 }, cards, '.' + dateClass + ' > strong');
      const dates = await page.$$eval(cards, (nodes, field) =>
        Object.fromEntries(nodes.map(card => [card.dataset.reference, card.querySelector(field)?.textContent])),
        '.' + dateClass + ' > strong');
      assert.deepEqual(dates, taxDates, container);
    }

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: theme === 'dark' ? 320 : 390, height: 810 });
      await go('modules/admin/options/history.html?category=guest-visit&theme=' + theme);
      const guest = '[data-record-id="sample-guest-0001"]';
      await checkCards('#workplaceHistoryList');
      assert.equal(await text(guest + ' .card-submit-date'), 'Submit Date: 17/01/2024');
      assert.match(await text(guest + ' .history-card-details'), /Visit Time\s*1111-2222/);
      await checkWorkplaceDates('card-submit-date');

      await go('modules/employee-career/options/history.html?theme=' + theme);
      const card = '[data-record-id="feedback-1"]';
      await checkCards(card);
      assert.equal(await text(card + ' .record-submit-date > strong'), '28/05/2026');
      const labels = await page.$$eval(card + ' .history-card-row > :first-child', nodes => nodes.map(node => node.textContent.trim()));
      assert.deepEqual(labels, ['Feedback Date :', 'Type :', 'Category :']);
      await page.click(card + ' [data-history-link]');
      assert.equal(await text('#historyDetailBody .history-detail-table .record-submit-date'), 'Submit Date: 28/05/2026');
      await page.click('#closeHistoryDetails');
      await page.waitForFunction(() => !HistoryRecordPage.active);
      await page.click('[data-history-kind="whereabout"]');
      assert.equal(await page.$('#careerHistoryList .record-submit-date:not([hidden])'), null);
      await page.click('[data-history-kind="cv-change-request"]');
      await checkCards('#careerHistoryList');
      assert.equal(await page.$('#careerHistoryList .history-card-details'), null);

      await go('leave.html?view=history&theme=' + theme);
      for (const [tab, ref, expected, fields] of [
        ['Leave', 'LV-2026-0052', '09/09/2026', ['Dates', 'Days / Hours', 'Duration', 'Reason']],
        ['Credit', 'CR-2026-0005', '01/09/2026', ['Effective Date', 'Expiry Date', 'Days / Hours']],
        ['OffTime', 'OT-2026-0008', '06/09/2026', ['Event Date', 'Reason', 'Time', 'Hours']]
      ]) {
        await page.click('#histTab' + tab);
        await checkCards('#myHistoryCardsList');
        const card = '#myHistoryCardsList [data-ref="' + ref + '"]';
        assert.equal(await text(card + ' .record-submit-date > strong'), expected);
        assert.deepEqual(await page.$$eval(card + ' .card-details-box > div > :first-child', nodes => nodes.map(n => n.textContent)), fields);
      }
      assert.equal(await text('[data-ref="OT-2026-0006"] .card-submit-date'), 'Submit Date: 02/09/2026');
      assert.match(await text('#myHistoryCardsList [data-ref="OT-2026-0008"] .card-details-box'), /10:00 AM - 12:00 PM/);
      await page.click('#myHistoryCardsList [data-ref="OT-2026-0008"]');
      await page.waitForSelector('.history-details-table #leaveHistorySubmitDate', { visible: true });
      assert.equal(await text('#leaveHistorySubmitDate'), 'Submit Date: 06/09/2026, 04:30 PM');
    }

    const pages = [
      ['modules/employee-career/options/pending-approval.html', '.approval-request-card'],
      ['modules/employee-career/options/team/history.html?category=staff-confirmation', '#teamHistoryList'],
      ['modules/employee-career/options/team/staff-feedback.html', '.staff-feedback-card'],
      ['modules/admin/options/history.html?category=letter-request', '#workplaceHistoryList'],
      ['modules/admin/options/pending-approval.html', '.approval-request-card'],
      ['modules/payroll/options/history.html?category=deduction', '#payrollHistoryList'],
      ['modules/payroll/options/tax-relief.html', '.tax-relief-record-card'],
      ['modules/payroll/options/pending-approval.html?tab=deduction', '.approval-request-card'],
      ['modules/performance/options/pending-approval.html', '.approval-request-card'],
      ['modules/claims/options/pending-approval.html', '.approval-request-card'],
      ['modules/training-competency/options/staff-tna.html', '.staff-tna-card'],
      ['modules/training-competency/options/training-feedback.html', '.training-feedback-card'],
      ['change-request.html#history/requests/all', '#changeRequestHistoryList'],
      ['leave.html?view=history', '.history-item-card']
    ];
    for (const [route, selector] of pages) {
      await go(route);
      await checkCards(':is(' + selector + ')');
    }
    assert.equal(await text('.history-item-card[data-status="draft"] .card-submit-date > strong'), '—');
    assert.equal(await text('[data-ref="LV-2026-0052"] .record-submit-date > strong'), '09/09/2026');
    for (const [route, list] of [['history.html', '#payrollHistoryList'], ['tax-relief.html', '#taxReliefRecords']]) {
      await go('modules/payroll/options/' + route);
      await checkCards(list);
      await checkTaxDates(list, 'card-submit-date');
    }
    await go('modules/employee-career/options/team/history.html');
    for (const kind of ['staff-confirmation', 'staff-exit', 'staff-request', 'staff-engagement']) {
      await page.click(`[data-team-history-kind="${kind}"]`);
      await checkCards('#teamHistoryList');
    }
    assert.equal(await text('[data-engagement-id="SEG-2026-0021"] .card-submit-date > strong'), '12/10/2026');
    await go('leave.html?view=approvals');
    for (const tab of ['Leave', 'Credit', 'Offtime']) {
      await page.click('#tabApproval' + tab);
      await checkCards('#teamApprovalsListContainer [data-category="' + tab.toLowerCase() + '"]');
    }
    await go('modules/attendance/options/history.html');
    await page.click('#tabFeedback');
    await checkCards('#viewFeedbackHistory');
    await page.click('#tabOt');
    await checkCards('#viewOtHistory');
    await page.$eval('#viewOtHistory article', card => card.click());
    assert.equal(await text('#modalOtSubmitDate dd'), '12/07/2024');
    await go('modules/attendance/options/clocking-history.html');
    await page.click('#tabOt');
    await checkCards('#viewOtHistory');
    const clockingOtDates = ['12/07/2024', '24/10/2023', '05/09/2026', '10/08/2026'];
    assert.deepEqual(await page.$$eval('#viewOtHistory .card-submit-date > strong', nodes => nodes.map(n => n.textContent)), clockingOtDates);
    await page.click('#viewOtHistory [href$="OTB000000001630"]');
    assert.equal(await text('#modalOtSubmitDate td'), '10/08/2026');
    await page.click('#otDetailsModal [data-history-back]');
    await page.waitForFunction(() => !HistoryRecordPage.active);
    await page.click('#tabFeedback');
    await checkCards('#viewFeedbackHistory');
    await page.$eval('#viewFeedbackHistory [data-history-link]', card => card.click());
    assert.equal(await text('#modalFbkSubmitDate'), 'Submit Date: 26/02/2026');
    assert.equal(await text('#modalFbkDate'), '31 Dec 2025');
    await go('modules/claims/options/history.html');
    for (const tab of await page.$$eval('.me-jump-pill[data-tab]', tabs => tabs.map(t => t.dataset.tab))) {
      await page.click(`[data-tab="${tab}"]`);
      await checkCards('#claimHistoryListContainer');
    }
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
    await checkCards('#projectTimesheetApprovalList');
    assert.equal(await text(timesheet + ' .record-submit-date > strong'), submitted);
    await page.click(timesheet + ' .approval-record-link');
    await page.waitForSelector('#projectApprovalRequest .form-card #projectApprovalSubmitDate:not([hidden])');
    assert.equal(await text('#projectApprovalSubmitDate > strong'), submitted);
    await go('modules/project-task/options/history.html');
    await page.evaluate(() => localStorage.setItem('pq_project_work_plans', JSON.stringify([{
      id: 'PLAN-DATE', title: 'Review', status: 'Submitted', createdAt: '2026-09-02T09:00:00'
    }])));
    await page.reload();
    await checkCards('#workPlanHistoryList');
    assert.equal(await text('[data-record-id="PLAN-DATE"] .card-submit-date'), 'Submit Date: 02/09/2026');
    const plan = '[data-record-id="WP-2026-0039"]';
    assert.equal(await text(plan + ' .card-submit-date > strong'), '—');
    await page.click(plan + ' [data-history-action="submit"]');
    const submittedDay = await page.evaluate(() => new Date().toLocaleDateString('en-GB'));
    assert.equal(await text(plan + ' .card-submit-date > strong'), submittedDay);
    await page.click(plan + ' [data-history-action="cancel"]');
    assert.equal(await text(plan + ' .card-submit-date > strong'), submittedDay);
    await page.click('#historyTab-timesheet');
    await checkCards('#timesheetHistoryList');

    const detailPages = [
      ['modules/admin/options/history.html?category=letter-request', '.history-card-main', '.history-detail-main-table .record-submit-date'],
      ['modules/admin/options/pending-approval.html', '.approval-record-link', '#visitPanel-general .claim-form-card .record-submit-date'],
      ['modules/employee-career/options/team/history.html?category=staff-confirmation', '[data-history-link]', '.detail-popout-table .record-submit-date'],
      ['modules/employee-career/options/team/staff-feedback.html', '.staff-feedback-details-trigger', '#staffFeedbackDetailsTable .record-submit-date'],
      ['modules/training-competency/options/staff-tna.html', '.staff-tna-card', '#staffTnaApplicationDetails .record-submit-date'],
      ['modules/payroll/options/history.html?category=deduction', '.history-card-main', '.history-detail-table .record-submit-date'],
      ['modules/payroll/options/pending-approval.html?tab=deduction', '.approval-record-link', '#payrollPendingForm .claim-form-card .record-submit-date'],
      ['modules/performance/options/pending-approval.html', '.approval-record-link', '.performance-request-review section .record-submit-date'],
      ['modules/claims/options/pending-approval.html', '.approval-record-link', '#claimDetailsDynamicBody section .record-submit-date']
    ];
    for (const [route, link, field] of detailPages) {
      await go(route);
      const selector = link + ':has(.record-submit-date:not([hidden]))';
      await page.waitForSelector(selector, { visible: true, timeout: 4000 });
      const timestamp = await text(selector + ' .record-submit-date > :last-child');
      await page.click(selector);
      await page.waitForSelector(field, { visible: true, timeout: 4000 });
      assert.equal(await text(field + ' > :last-child'), timestamp, route);
    }

    // The standalone web preview applies its desktop presentation to a frozen source snapshot.
    const preview = 'scratch/peoplehcm-web/public/';
    const adapter = file => path.resolve(__dirname, 'peoplehcm-web/public/web-adapter', file);
    const openPreview = async route => {
      await go(preview + 'workspace/' + route);
      await page.addStyleTag({ path: adapter('desktop.css') });
      await page.addScriptTag({ path: adapter('translations.js') });
      await page.addScriptTag({ url: pathToFileURL(adapter('bridge.js')).href });
    };
    async function checkPreviewDetail(trigger, panel, expected) {
      await page.click(trigger);
      await page.waitForSelector('.web-history-page .web-history-heading button', { visible: true, timeout: 4000 });
      await page.waitForFunction((panel, expected) => {
        const lines = document.querySelectorAll(panel + ' .web-record-submit-date');
        return lines.length === 1 && lines[0].lastElementChild.textContent === expected;
      }, { timeout: 4000 }, panel, expected);
      await page.click('.web-history-heading button');
      await page.waitForFunction(() => !document.querySelector('.web-history-page'));
    }
    await openPreview('modules/admin/options/history.html?category=guest-visit');
    await page.waitForSelector('#workplaceHistoryList .web-card-submit-date');
    await checkWorkplaceDates('web-card-submit-date');
    await checkPreviewDetail('[data-record-id="sample-inventory-0065"] .history-card-main', '#historyDetailBody', '10/09/2026');
    await page.click('[data-history-kind="letter-request"]');
    await checkPreviewDetail('[data-record-id="sample-letter-0091"] .history-card-main', '#historyDetailBody', '09/08/2021');
    await openPreview('modules/attendance/options/clocking-history.html');
    await page.click('#tabOt');
    await page.waitForSelector('#viewOtHistory .web-card-submit-date', { visible: true });
    assert.deepEqual(await page.$$eval('#viewOtHistory .web-card-submit-date > strong', nodes => nodes.map(n => n.textContent)), clockingOtDates);
    for (const [route, list] of [['history.html', '#payrollHistoryList'], ['tax-relief.html', '#taxReliefRecords']]) {
      await openPreview('modules/payroll/options/' + route);
      await checkTaxDates(list, 'web-card-submit-date');
      const card = list + ' [data-reference="RBT000000000049"]';
      const team = route === 'tax-relief.html';
      await checkPreviewDetail(team ? card : card + ' .history-card-main', team ? '#taxReliefDetailTable' : '#historyDetailBody', taxDates.RBT000000000049);
    }
    await openPreview('modules/employee-career/options/history.html');
    const desktopDate = '#careerHistoryList .web-record-submit-date';
    await page.waitForSelector(desktopDate);
    assert.equal(await text(desktopDate + ' > :first-child'), 'Submit Date:');
    assert.equal(await text(desktopDate + ' > :last-child'), '28/05/2026');
    assert.equal(await page.$eval(desktopDate, field => field.nextElementSibling.matches('.history-card-details') &&
      field.firstElementChild.getBoundingClientRect().right <= field.lastElementChild.getBoundingClientRect().left), true);
    await page.evaluate(() => PeopleHcmWebI18n.setLocale('zh'));
    assert.equal(await text(desktopDate + ' > :first-child'), '提交日期：');
    await page.evaluate(() => PeopleHcmWebI18n.setLocale('en'));
    assert.equal(await text(desktopDate + ' > :first-child'), 'Submit Date:');
    const originalDate = '#careerHistoryList [data-web-submit-source] > :last-child';
    for (const [value, expected] of [['02/09/2026, 09:00 AM', '02/09/2026'], ['2026-10-03T09:00:00', '03/10/2026']]) {
      await page.$eval(originalDate, (node, raw) => { node.textContent = raw; }, value);
      await page.waitForFunction((selector, date) => document.querySelector(selector).textContent === 'Submit Date: ' + date, {}, desktopDate, expected);
    }
    await page.click('[data-history-kind="whereabout"]');
    await page.waitForFunction(() => !document.querySelector('#careerHistoryList .web-record-submit-date'));
    await page.click('[data-history-kind="feedback"]');
    await page.waitForSelector(desktopDate);
    assert.equal(await page.$$eval(desktopDate, nodes => nodes.length), 3);
    assert.deepEqual(errors, []);
    console.log('PASS: Standalone, date-only submission lines across card views, both themes and the desktop preview.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
