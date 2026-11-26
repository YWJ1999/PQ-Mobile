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
    const grid = '.history-card-details, .approval-card-details, .card-details-box, .project-history-card-details, .change-history-date';
    const checkCards = async selector => {
      const dateFields = selector + ' .record-submit-date:not([hidden])';
      await page.waitForSelector(dateFields, { visible: true, timeout: 4000 });
      const dates = await page.$$eval(dateFields, (nodes, boxes) =>
        nodes.map(node => {
          const panel = node.closest(boxes);
          const rect = node.getBoundingClientRect();
          const bounds = panel?.getBoundingClientRect();
          const label = node.firstElementChild;
          const value = node.lastElementChild;
          const fieldNamed = name => [...panel.children].find(field =>
            field.firstElementChild?.textContent.trim().replace(/\s*:\s*$/, '') === name);
          const typography = field => field && [field.firstElementChild, field.lastElementChild].map(element => {
            const { fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, fontVariantNumeric, color } = getComputedStyle(element);
            return { fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, fontVariantNumeric, color };
          });
          return {
            label: label?.textContent,
            date: value?.textContent,
            leaveValueWeights: panel.matches('.leave-history-details')
              ? ['Dates', 'Days / Hours', 'Duration', 'Reason'].map(name => typography(fieldNamed(name))?.[1].fontWeight)
              : null,
            submittedType: typography(node),
            reasonType: typography(fieldNamed('Reason')),
            creditExpiryType: panel.closest('#myHistoryCardsList') && typography(fieldNamed('Expiry Date')),
            eventType: typography(fieldNamed('Event Date')),
            boxed: !!panel,
            stacked: label && value && label !== value && (!rect.width ||
              label.getBoundingClientRect().bottom <= value.getBoundingClientRect().top),
            followsOtherFields: panel?.childElementCount === 1 || node.previousElementSibling !== null,
            fits: !rect.width || (bounds && rect.top >= bounds.top && rect.bottom <= bounds.bottom + 1
              && rect.left >= bounds.left && rect.right <= bounds.right + 1)
          };
        }), grid);
      for (const line of dates) {
        assert.equal(line.label, 'Submit Date', selector);
        if (line.reasonType) {
          const [label, value] = line.reasonType;
          if (line.leaveValueWeights) {
            assert.deepEqual(line.leaveValueWeights, ['800', '800', '800', '800'], 'Leave history value weights');
          }
          const weight = line.leaveValueWeights ? '600' : value.fontWeight;
          assert.deepEqual(line.submittedType, [label, { ...value, fontWeight: weight }], page.url() + ' Submit Date typography');
          if (line.eventType) assert.deepEqual(line.eventType, line.reasonType, page.url() + ' Event Date vs Reason');
        } else if (line.creditExpiryType) {
          assert.deepEqual(line.submittedType, line.creditExpiryType, 'Leave Credit Submit Date vs Expiry Date');
        } else {
          assert.deepEqual(line.submittedType.map(type => type.fontWeight), ['700', '600'], page.url() + ' ' + selector);
        }
        assert.match(line.date, /^\d{2}\/\d{2}\/\d{4}(?:,?\s.+)?$/, selector);
        assert.ok(line.boxed && line.fits && line.stacked && line.followsOtherFields, page.url() + ' ' + selector + ' ' + JSON.stringify(line));
      }
    };

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: theme === 'dark' ? 320 : 390, height: 810 });
      await go('modules/employee-career/options/history.html?theme=' + theme);
      const card = '[data-record-id="feedback-1"]';
      await checkCards(card);
      assert.equal(await text(card + ' .record-submit-date > strong'), '28/05/2026');
      const layout = await page.$eval(card, node => {
        const rect = selector => node.querySelector(selector).getBoundingClientRect();
        return {
          belowHeader: rect('.record-submit-date').top >= rect('.history-card-header').bottom,
          labels: [...node.querySelectorAll('.history-card-row > :first-child')].map(label => label.textContent.trim())
        };
      });
      assert.equal(layout.belowHeader, true);
      assert.deepEqual(layout.labels, ['Feedback Date :', 'Type :', 'Category :']);
      await page.click(card + ' [data-history-link]');
      assert.equal(await text('#historyDetailBody .history-detail-table .record-submit-date'), 'Submit Date: 28/05/2026');
      await page.click('#closeHistoryDetails');
      await page.waitForFunction(() => !HistoryRecordPage.active);
      await page.click('[data-history-kind="whereabout"]');
      assert.equal(await page.$('#careerHistoryList .record-submit-date:not([hidden])'), null);
      await page.click('[data-history-kind="cv-change-request"]');
      await checkCards('#careerHistoryList');
      assert.ok(await page.$('#careerHistoryList .history-card-details > .record-submit-date:only-child'));

      await go('leave.html?view=history&theme=' + theme);
      for (const [tab, ref, primaryLabel, timestamp] of [
        ['Leave', 'LV-2026-0052', 'Dates', '09/09/2026, 08:30 AM'],
        ['Credit', 'CR-2026-0005', 'Effective Date', '01/09/2026, 09:00 AM'],
        ['OffTime', 'OT-2026-0008', 'Event Date', '06/09/2026, 04:30 PM']
      ]) {
        await page.click('#histTab' + tab);
        const card = '#myHistoryCardsList [data-ref="' + ref + '"]';
        await checkCards('#myHistoryCardsList');
        await page.waitForSelector(card + ' .card-details-box > .record-submit-date', { visible: true });
        assert.equal(await text(card + ' .record-submit-date > strong'), timestamp);
        assert.equal(await page.$$eval(card + ' .record-submit-date', nodes => nodes.length), 1);
        const layout = await page.$eval(card + ' .card-details-box', panel => {
          const [primary, second, submitted] = panel.children;
          const rect = field => field.getBoundingClientRect();
          const type = element => {
            const { color, fontSize, lineHeight } = getComputedStyle(element);
            return [color, fontSize, lineHeight];
          };
          return {
            primaryLabel: primary.firstElementChild.textContent,
            primaryWeights: [...primary.children].map(element => getComputedStyle(element).fontWeight),
            dateGap: rect(submitted).top - rect(primary).bottom,
            belowSecond: rect(submitted).top >= rect(second).bottom,
            aligned: rect(submitted).left === rect(primary).left && rect(submitted).width === rect(primary).width,
            primaryType: [type(primary.firstElementChild), type(primary.lastElementChild)],
            submittedType: [type(submitted.firstElementChild), type(submitted.lastElementChild)]
          };
        });
        assert.equal(layout.primaryLabel, primaryLabel);
        if (tab === 'OffTime') {
          assert.deepEqual(layout.primaryWeights, ['700', '800']);
          assert.equal(layout.dateGap, 16, 'Submit Date has the same row spacing as Time and Hours');
          const longReasonLayout = await page.$eval(card + ' .time-off-history-details', panel => {
            const [event, reason, submitted, time, hours] = panel.children;
            const value = reason.lastElementChild;
            const original = value.textContent;
            value.textContent = (original + ' ').repeat(12);
            const dates = submitted.getBoundingClientRect();
            const description = reason.getBoundingClientRect();
            const timeBox = time.getBoundingClientRect();
            const hoursBox = hours.getBoundingClientRect();
            const gap = dates.top - event.getBoundingClientRect().bottom;
            const fitsBesideDates = description.left >= dates.right && description.bottom <= panel.getBoundingClientRect().bottom;
            const timingGap = Math.round(timeBox.top - Math.max(dates.bottom, description.bottom));
            const timingAligned = timeBox.top === hoursBox.top && timeBox.left === dates.left && hoursBox.left === description.left;
            value.textContent = original;
            return { gap, fitsBesideDates, timingGap, timingAligned };
          });
          assert.deepEqual(longReasonLayout, { gap: layout.dateGap, fitsBesideDates: true, timingGap: 16, timingAligned: true });
        } else {
          assert.ok(layout.belowSecond, theme + ' ' + tab);
        }
        assert.ok(layout.dateGap >= 0 && layout.aligned, theme + ' ' + tab);
        assert.deepEqual(layout.submittedType, layout.primaryType, theme + ' ' + tab);
      }
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
    assert.equal(await page.$('.history-item-card[data-status="draft"] .record-submit-date:not([hidden])'), null);
    assert.equal(await text('[data-ref="LV-2026-0052"] .record-submit-date > strong'), '09/09/2026, 08:30 AM');
    await go('leave.html?view=approvals');
    for (const tab of ['Leave', 'Credit', 'Offtime']) {
      await page.click('#tabApproval' + tab);
      await checkCards('#teamApprovalsListContainer [data-category="' + tab.toLowerCase() + '"]');
    }
    await go('modules/attendance/options/history.html');
    await page.click('#tabFeedback');
    await checkCards('#viewFeedbackHistory');
    await page.click('#tabOt');
    await page.$eval('#viewOtHistory article', card => card.click());
    assert.equal(await text('#modalOtSubmitDate dd'), '12/07/2024');
    await go('modules/attendance/options/clocking-history.html');
    const clockingDates = await page.$$eval('.history-card-item dt', labels => labels
      .filter(label => /^(Submit|Submitted) Date$/.test(label.textContent))
      .map(label => !!label.closest('.history-card-details') && !!label.nextElementSibling?.textContent &&
        [label, label.nextElementSibling].every(element => getComputedStyle(element).fontWeight === '600')));
    assert.ok(clockingDates.length && clockingDates.every(Boolean));
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
    await checkCards(timesheet);
    assert.equal(await text(timesheet + ' .record-submit-date dd'), submitted);
    await page.click(timesheet + ' .approval-record-link');
    await page.waitForSelector('#projectApprovalRequest .form-card #projectApprovalSubmitDate:not([hidden])');
    assert.equal(await text('#projectApprovalSubmitDate > strong'), submitted);
    await go('modules/project-task/options/history.html');
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
    await go(preview + 'workspace/modules/employee-career/options/history.html');
    const adapter = file => path.resolve(__dirname, 'peoplehcm-web/public/web-adapter', file);
    await page.addStyleTag({ path: adapter('desktop.css') });
    await page.addScriptTag({ path: adapter('translations.js') });
    await page.addScriptTag({ path: adapter('bridge.js') });
    const desktopDate = '#careerHistoryList .web-record-submit-date';
    await page.waitForSelector(desktopDate);
    assert.equal(await text(desktopDate + ' > :first-child'), 'Submit Date');
    assert.equal(await text(desktopDate + ' > :last-child'), '28/05/2026');
    assert.deepEqual(await page.$eval(desktopDate, field =>
      [...field.children].map(node => getComputedStyle(node).fontWeight)), ['600', '600']);
    assert.equal(await page.$eval(desktopDate, field => field.parentElement.matches('.history-card-details') &&
      field === field.parentElement.lastElementChild &&
      field.firstElementChild.getBoundingClientRect().bottom <= field.lastElementChild.getBoundingClientRect().top), true);
    await page.evaluate(() => PeopleHcmWebI18n.setLocale('zh'));
    assert.equal(await text(desktopDate + ' > :first-child'), '提交日期');
    await page.evaluate(() => PeopleHcmWebI18n.setLocale('en'));
    assert.equal(await text(desktopDate + ' > :first-child'), 'Submit Date');
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
