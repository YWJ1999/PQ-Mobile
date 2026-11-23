const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = pathToFileURL(path.resolve(__dirname, '..') + path.sep);
const cases = [
  ['modules/admin/options/history.html', '#workplaceHistoryList .history-card-main'],
  ['modules/admin/options/history.html?category=letter-request', '#workplaceHistoryList .history-card-main'],
  ['modules/admin/options/history.html?category=inventory-request', '#workplaceHistoryList .history-card-main'],
  ['modules/employee-career/options/history.html', '[data-record-id="feedback-1"] .career-history-card-open'],
  ['modules/employee-career/options/history.html?category=whereabout', '#careerHistoryList [data-history-link]'],
  ['modules/employee-career/options/history.html?category=cv-change-request', '#careerHistoryList [data-history-link]'],
  ...['staff-confirmation', 'staff-exit', 'staff-request', 'staff-engagement'].map(kind =>
    ['modules/employee-career/options/team/history.html?category=' + kind, '#teamHistoryList [data-history-link]']),
  ...['tax', 'deduction'].map(kind => ['modules/payroll/options/history.html?category=' + kind, '#payrollHistoryList .history-card-main']),
  ['modules/payroll/options/tax-relief.html', '.tax-relief-record-card'],
  ['modules/payroll/options/prior-pay-data.html', '.prior-record-open'],
  ['modules/performance/options/history.html', '.incident-history-details-trigger'],
  ['modules/project-task/options/history.html', '#workPlanHistoryPanel .project-history-card'],
  ['modules/project-task/options/history.html', '#timesheetHistoryPanel .project-history-card', '#historyTab-timesheet'],
  ['modules/training-competency/options/staff-tna.html', '.staff-tna-card'],
  ['modules/claims/options/history.html', '#claimHistoryListContainer .history-card-item'],
  ['modules/claims/options/history.html', '#claimHistoryListContainer .history-card-item', '[data-tab="travelRequest"]'],
  ...['history', 'clocking-history'].flatMap(file => [
    ['modules/attendance/options/' + file + '.html', '#viewClockingHistory .history-card-item'],
    ['modules/attendance/options/' + file + '.html', '#viewOtHistory .history-card-item', '#tabOt'],
    ['modules/attendance/options/' + file + '.html', '#viewFeedbackHistory .history-card-item', '#tabFeedback']
  ]),
  ['modules/attendance/options/feedback-history.html', '.pending-feedback-details-trigger'],
  ['modules/attendance/options/ot-plan.html', '#staffCardsContainer [data-staff-id="000008"]'],
  ['modules/attendance/options/overtime.html', '.ot-record-card[data-status="approved"]'],
  ...['Leave', 'Credit', 'OffTime'].map(tab => ['leave.html?view=history', '#myHistoryCardsList .history-item-card', '#histTab' + tab]),
  ['salary-history.html', '.me-options-btn'],
  ['bonus-history.html', '.me-options-btn']
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const active = '[data-history-page]:not([hidden])';
    const wait = predicate => page.waitForFunction(predicate, { timeout: 3000, polling: 30 });
    const navigate = route => page.goto(new URL(route, root).href, { waitUntil: 'load' });
    for (const [route, selector, tab] of cases) {
      try {
        await navigate(route);
        if (tab) await page.click(tab);
        await page.waitForSelector(selector, { visible: true, timeout: 3000 });
        await page.$eval(selector, node => node.click());
        await page.waitForSelector(active, { visible: true, timeout: 3000 });
        const firstUrl = page.url();
        assert.match(firstUrl, /#history\//);
        const layout = await page.$eval(active, node => {
          const rect = node.getBoundingClientRect(), phone = node.closest('.phone-container').getBoundingClientRect();
          return { width: rect.width / phone.width, height: rect.height / phone.height,
            modal: !!node.querySelector('[aria-modal=true]'), title: node.querySelector('h1').textContent,
            header: node.querySelector('.approval-page-header').getBoundingClientRect().height };
        });
        assert.ok(layout.width > 0.92 && layout.height > 0.9 && layout.header > 48, JSON.stringify(layout));
        assert.ok(layout.title && !layout.modal);
        await page.click(active + ' [data-history-back]');
        await wait(() => !location.hash.startsWith('#history/'));
        assert.ok(await page.$eval(selector, node => !!node.getClientRects().length));
        await page.goForward();
        await page.waitForSelector(active, { visible: true, timeout: 3000 });
        await page.reload({ waitUntil: 'load' });
        await page.waitForSelector(active, { visible: true, timeout: 3000 });
        assert.equal(page.url(), firstUrl);
        await page.goBack();
        await wait(() => !document.querySelector('[data-history-page]:not([hidden])'));
      } catch (error) {
        throw new Error(route + ' ' + selector + ' — ' + error.message + ' ' + errors.join(', '));
      }
    }
    await navigate('modules/employee-career/options/history.html?theme=light#history/feedback/feedback-1');
    await page.click('#historyEditFeedback');
    assert.match(page.url(), /feedback\.html\?edit=feedback-1/);
    await page.goBack();
    await page.waitForSelector(active, { visible: true });
    await page.click(active + ' [data-history-back]');
    await wait(() => !location.hash);
    await navigate('modules/attendance/options/history.html#history/ot/OTB000000001604');
    assert.equal(await page.$eval('#modalOtRemarks', field => field.disabled), false);
    await page.click('[data-ot-form-cancel]');
    await wait(() => !HistoryRecordPage.active);
    await navigate('modules/employee-career/options/history.html?category=whereabout');
    await page.click('#careerHistoryList [data-history-link]');
    await page.click('#historyDeleteWhereabout');
    await page.click('#whereaboutDeleteCancel');
    assert.equal(await page.$eval(active, node => node.querySelector('h1').textContent), 'Whereabout History Details');
    await navigate('modules/admin/options/history.html#history/guest-visit/missing-record');
    assert.equal(await page.$(active), null);
    await navigate('change-request.html#history/requests/all');
    await page.click('#changeRequestHistoryList [data-history-link]');
    await page.waitForSelector('#changeHistoryDetails:not([hidden])');
    await page.click('#changeHistoryDetails [data-history-back]');
    await page.waitForSelector('#historyOverlay:not([hidden])');
    const backAppearance = button => {
      const style = getComputedStyle(button);
      return {
        width: button.offsetWidth, height: button.offsetHeight, radius: style.borderRadius,
        background: style.backgroundColor, border: style.borderTop,
        chevron: getComputedStyle(button, '::before').borderLeft
      };
    };
    for (const theme of ['light', 'dark']) {
      await navigate('modules/employee-career/options/pending-approval.html?theme=' + theme);
      await page.click('.approval-record-link');
      const approvalBack = '#careerPendingDetails:not([hidden]) [data-approval-back]';
      await page.waitForSelector(approvalBack, { visible: true });
      const expected = await page.$eval(approvalBack, backAppearance);
      await navigate('modules/employee-career/options/history.html?category=cv-change-request&theme=' + theme);
      await page.click('#careerHistoryList [data-history-link]');
      assert.deepEqual(await page.$eval('#closeHistoryDetails', backAppearance), expected, 'CV detail Back button in ' + theme);
      await page.click('[data-cv-tab="family"]');
      await page.click('[data-cv-family-member] button');
      await page.click('#historyFamilyDetails [data-history-back]');
      await page.waitForSelector('[data-cv-tab="family"][aria-selected="true"]');
      await page.click('#closeHistoryDetails');
      await page.waitForSelector('[data-history-kind="cv-change-request"][aria-pressed="true"]', { visible: true });
    }
    await navigate('leave.html?view=team-calendar#history/calendar/5%2F004177');
    await page.waitForSelector('#historyDetailsModalOverlay:not([hidden])');
    assert.match(await page.$eval('#historyDetailsTableBody', node => node.textContent), /AHMAD RAFY/);
    await navigate('modules/admin/options/history.html?category=letter-request');
    await page.click('#historyFilterTrigger');
    await page.select('#historyStatus', 'approved');
    await page.click('#applyHistoryFilter');
    const list = '.main-content';
    const scroll = await page.$eval(list, node => { node.scrollTop = 120; return node.scrollTop; });
    await page.$eval('#workplaceHistoryList [data-history-link]', node => node.click());
    await page.click('#closeHistoryDetails');
    await wait(() => !HistoryRecordPage.active);
    assert.equal(await page.$eval(list, node => node.scrollTop), scroll);
    assert.match(await page.$eval('#historyFilterSummary', node => node.textContent), /Approved/);

    const adapter = name => path.resolve(__dirname, 'peoplehcm-web/public/web-adapter', name);
    for (const [route, selector] of [
      ['modules/admin/options/history.html', '.history-card-main'],
      ['modules/employee-career/options/history.html', '#careerHistoryList [data-record-id]'],
      ['modules/claims/options/history.html', '#claimHistoryListContainer .history-card-item'],
      ['modules/project-task/options/history.html', '#workPlanHistoryPanel .project-history-card'],
      ['modules/attendance/options/clocking-history.html', '#viewClockingHistory .history-card-item'],
      ['change-request.html', '.me-options-btn[onclick*="toggleHistoryModal"]']
    ]) {
      await navigate('scratch/peoplehcm-web/public/workspace/' + route);
      await page.addStyleTag({ path: adapter('desktop.css') });
      await page.addScriptTag({ path: adapter('bridge.js') });
      await page.addScriptTag({ path: adapter('history-pages.js') });
      await page.$eval(selector, node => node.click());
      await page.waitForSelector('.web-history-page .web-history-heading', { visible: true, timeout: 3000 });
      assert.match(page.url(), /#history\//);
      assert.equal(await page.$eval('.web-history-page', node => getComputedStyle(node).position), 'static');
      await page.click('.web-history-heading button');
      await wait(() => !document.querySelector('.web-history-page'));
      await page.goForward();
      await page.waitForSelector('.web-history-page .web-history-heading', { visible: true, timeout: 3000 });
      if (route === 'change-request.html') {
        await page.click('#changeRequestHistoryList .change-history-item');
        await page.waitForSelector('.web-change-details .web-selected-change');
        await page.click('.web-history-heading button');
        await wait(() => !document.querySelector('.web-change-details'));
        assert.ok(await page.$('.web-history-page .web-history-heading'));
      }
    }
    assert.deepEqual(errors, []);
    console.log('Passed ' + cases.length + ' mobile history routes, six desktop routes, record actions, nested history, calendar, filters, scrolling and missing records.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
