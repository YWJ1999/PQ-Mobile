const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/feedback-history.html')).href;

async function waitForOverlay(page, selector, visible) {
  await page.waitForFunction(
    ({ selector, visible }) => {
      const node = document.querySelector(selector);
      return !!node && (getComputedStyle(node).display !== 'none') === visible;
    },
    {},
    { selector, visible }
  );
}

async function assertOverlayFitsAtWidths(page, selector) {
  for (const width of [360, 390, 420]) {
    await page.setViewport({ width, height: 950 });
    const fits = await page.$eval(selector, overlay => {
      const panel = overlay.querySelector('.approval-record-layout');
      const phone = document.querySelector('.phone-container');
      const panelRect = panel.getBoundingClientRect();
      const phoneRect = phone.getBoundingClientRect();
      return panel.scrollWidth <= panel.clientWidth + 1 &&
        panelRect.left >= phoneRect.left - 1 &&
        panelRect.right <= phoneRect.right + 1 &&
        panelRect.top >= phoneRect.top - 1 &&
        panelRect.bottom <= phoneRect.bottom + 1;
    });
    assert.equal(fits, true, selector + ' must fit at ' + width + 'px');
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(pageUrl + '?theme=' + theme, { waitUntil: 'networkidle0' });

      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.equal(await page.$eval('#pendingFeedbackTotal', node => node.textContent.trim()), '2 Records');
      const summarySurface = await page.$eval('.pending-feedback-summary', node => {
        const style = getComputedStyle(node);
        return {
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          borderColor: style.borderColor
        };
      });
      if (theme === 'light') {
        assert.deepEqual(summarySurface, {
          backgroundColor: 'rgb(255, 255, 255)',
          backgroundImage: 'none',
          borderColor: 'rgb(255, 255, 255)'
        });
      } else {
        assert.notEqual(summarySurface.backgroundColor, 'rgb(255, 255, 255)');
      }

      for (const width of [320, 360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        const layout = await page.evaluate(() => ({
          pageFits: document.querySelector('.main-content').scrollWidth <= document.querySelector('.main-content').clientWidth + 1,
          hasVerifyControls: document.querySelector('#verifyAllBtn, [data-verify-record]') !== null,
          hasAttendanceContext: document.querySelector('.pending-feedback-context') !== null,
          cards: [...document.querySelectorAll('.pending-feedback-record')].map(card => {
            const cardRect = card.getBoundingClientRect();
            const actions = [...card.querySelectorAll('.history-card-actions button')];
            const facts = card.querySelector('.attendance-day-facts');
            const [day, clock, normal, ot] = Array.from(facts.children, field => field.getBoundingClientRect());
            return {
              radius: getComputedStyle(card).borderRadius,
              padding: getComputedStyle(card).padding,
              date: card.querySelector('.history-card-title')?.textContent.trim(),
              shift: card.querySelector('.attendance-day-shift')?.textContent.trim(),
              times: card.querySelector('[data-clock-times]').textContent,
              labels: [...card.querySelectorAll('.attendance-history-detail > span')].map(node => node.textContent.trim()),
              status: card.querySelector('.card-status-badge')?.textContent.trim(),
              actions: actions.map(node => node.textContent.trim()),
              detailRadius: getComputedStyle(facts).borderRadius,
              twoByTwo: day.top === clock.top && normal.top === ot.top && day.bottom === normal.top && day.right === clock.left,
              columnDivider: getComputedStyle(facts.children[1]).borderInlineStartWidth,
              rowDivider: getComputedStyle(facts.children[2]).borderBlockStartWidth,
              actionsLayout: getComputedStyle(card.querySelector('.history-card-actions')).display,
              actionsAlignment: getComputedStyle(card.querySelector('.history-card-actions')).justifyContent,
              actionRadii: actions.map(button => getComputedStyle(button).borderRadius),
              compactActions: actions.every(button => button.getBoundingClientRect().width < 140),
              actionsStayOnOneRow: new Set(actions.map(button => Math.round(button.getBoundingClientRect().top))).size === 1,
              titleStaysOnOneLine: card.querySelector('.history-card-title').scrollHeight < parseFloat(getComputedStyle(card.querySelector('.history-card-title')).lineHeight) * 1.5,
              hasChevron: !!card.querySelector('.history-card-header .fa-chevron-right'),
              semanticDetailsButton: !card.hasAttribute('role') && card.querySelector('.pending-feedback-details-trigger')?.tagName === 'BUTTON',
              fits: card.scrollWidth <= card.clientWidth + 1 && actions.every(button => {
                const rect = button.getBoundingClientRect();
                return rect.left >= cardRect.left - 1 && rect.right <= cardRect.right + 1;
              })
            };
          })
        }));

        assert.equal(layout.pageFits, true, theme + '/' + width + 'px page must not overflow');
        assert.equal(layout.hasVerifyControls, false, 'Pending Attendance Feedback must not expose Verify controls');
        assert.equal(layout.cards.length, 2);
        assert.equal(layout.hasAttendanceContext, false, 'Pending Attendance Feedback must not show Shift Group or Supervisor');
        assert.deepEqual(layout.cards.map(card => card.date), ['Mon, 14 Sep 2026', 'Tue, 15 Sep 2026']);
        assert.deepEqual(layout.cards.map(card => card.times), ['08:09 → 19:40', '07:38 → —']);
        assert.deepEqual(layout.cards.map(card => card.status), ['Unapproved OT', 'Unpaired Clock Entry']);
        layout.cards.forEach((card, cardIndex) => {
          assert.equal(card.radius, '18px');
          assert.equal(card.padding, '18px');
          assert.equal(card.shift, '8.30AM–5.30PM (W01)');
          assert.deepEqual(card.labels, ['Day Type', 'Clock Times', 'Normal Hours', 'OT Hours']);
          assert.deepEqual(card.actions, ['Change Shift', 'Feedback']);
          assert.equal(card.detailRadius, '12px');
          assert.equal(card.twoByTwo, true);
          assert.equal(card.columnDivider, '1px');
          assert.equal(card.rowDivider, '1px');
          assert.equal(card.actionsLayout, 'grid');
          assert.equal(card.actionsAlignment, 'end');
          assert.equal(card.actionsStayOnOneRow, true);
          assert.equal(card.titleStaysOnOneLine, true, theme + '/' + width + 'px card ' + cardIndex + ' title must stay on one line');
          assert.deepEqual(card.actionRadii, ['12px', '12px']);
          assert.equal(card.compactActions, true);
          assert.equal(card.hasChevron, false);
          assert.equal(card.semanticDetailsButton, true);
          assert.equal(card.fits, true);
        });
      }

      await page.click('.pending-feedback-record:nth-of-type(2) .pending-feedback-details-trigger');
      await waitForOverlay(page, '#attendanceDetailsModalOverlay', true);
      await assertOverlayFitsAtWidths(page, '#attendanceDetailsModalOverlay');
      const details = await page.evaluate(() => ({
        title: document.querySelector('#attendanceDetailsModalOverlay h1')?.textContent.trim(),
        classes: document.querySelector('#attendanceDetailsModalOverlay').className,
        labels: [...document.querySelectorAll('#attendanceDetailsMainTable .detail-popout-label')].map(node => node.textContent.trim()),
        values: [...document.querySelectorAll('#attendanceDetailsMainTable .detail-popout-value')].map(node => node.textContent.trim()),
        hasLeaveSection: !!document.querySelector('[data-pending-detail-section="leave"]'),
        overtimeHidden: document.querySelector('[data-pending-detail-section="overtime"]')?.hidden ?? true,
        emptyMessages: [...document.querySelectorAll('.pending-feedback-detail-empty:not([hidden])')].map(node => node.textContent.trim()),
        overtimeTableHidden: document.querySelector('#detailOvertimeInfoTable')?.hidden ?? false,
        hasLeaveTable: !!document.querySelector('#detailLeaveInfoTable'),
        overtimeRows: [...document.querySelectorAll('#detailOvertimeInfoTable tr')].map(row => [...row.cells].map(cell => cell.textContent.trim()).join(' '))
      }));
      assert.equal(details.title, 'Attendance Advice Approval');
      assert.match(details.classes, /approval-record-page/);
      assert.deepEqual(details.labels, [
        'Employee No.', 'Name', 'Date', 'Shift', 'Day Type', 'Shift Group', 'Supervisor', 'Clock Times',
        'Normal Hours', 'Late In Minutes', 'Late Reason', 'Early Out Minutes', 'Early Out Reason',
        'Time Off Minutes', 'Time Off Reason', 'Absent', 'Absent Reason', 'Leave Code', 'Approved OT Hours',
        'Unapproved OT Hours', 'Exception', 'Document #'
      ]);
      assert.deepEqual(details.values, [
        'EBB12', 'Farhan binti rahmat', '15 Sep 2026', '8.30AM–5.30PM (W01)', 'Workday', 'GROUP A',
        'EBB04', '07:38', '0.00', '0', 'Not applicable', 'Clock-out missing', '-', '-',
        '-', 'No', 'Not applicable', '-', '0.00', '0.00', 'Missing Clock Out', '–'
      ]);
      assert.equal(details.hasLeaveSection, false);
      assert.equal(details.overtimeHidden, true);
      assert.deepEqual(details.emptyMessages, ['Leave Info', 'No overtime requests']);
      assert.equal(details.overtimeTableHidden, true);
      assert.equal(details.hasLeaveTable, false);
      assert.deepEqual(details.overtimeRows, ['OT Code –', 'Description –', 'OT Hours –', 'UOT –']);
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.$eval('#attendanceDetailsModalOverlay', overlay => overlay.contains(document.activeElement)), true);
      await page.click('#attendanceDetailsModalOverlay [data-history-back]');
      await waitForOverlay(page, '#attendanceDetailsModalOverlay', false);
      await page.waitForFunction(() => document.activeElement.classList.contains('pending-feedback-details-trigger'));
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('pending-feedback-details-trigger') && document.activeElement.closest('.pending-feedback-record').dataset.date === '15 Sep 2026'), true);

      await page.click('.pending-feedback-record:first-of-type .pending-feedback-details-trigger');
      await waitForOverlay(page, '#attendanceDetailsModalOverlay', true);
      assert.deepEqual(await page.evaluate(() => ({
        hasLeaveSection: !!document.querySelector('[data-pending-detail-section="leave"]'),
        overtimeHidden: document.querySelector('[data-pending-detail-section="overtime"]')?.hidden ?? true,
        emptyMessages: [...document.querySelectorAll('.pending-feedback-detail-empty:not([hidden])')].map(node => node.textContent.trim()),
        overtimeTableHidden: document.querySelector('#detailOvertimeInfoTable')?.hidden ?? true,
        matchingSectionHeadingStyles: (() => {
          const leaveStyle = getComputedStyle(document.querySelector('[data-pending-detail-empty="leave"]'));
          const overtimeStyle = getComputedStyle(document.querySelector('[data-pending-detail-section="overtime"] h4'));
          return ['color', 'fontSize', 'fontWeight', 'marginTop', 'marginBottom']
            .every(property => leaveStyle[property] === overtimeStyle[property]);
        })(),
        overtimeRows: [...document.querySelectorAll('#detailOvertimeInfoTable tr')].map(row => [...row.cells].map(cell => cell.textContent.trim()).join(' '))
      })), {
        hasLeaveSection: false,
        overtimeHidden: false,
        emptyMessages: ['Leave Info'],
        overtimeTableHidden: false,
        matchingSectionHeadingStyles: true,
        overtimeRows: ['OT Code –', 'Description Unapproved OT', 'OT Hours 2.00', 'UOT Yes']
      });
      await page.click('#attendanceDetailsModalOverlay [data-history-back]');
      await waitForOverlay(page, '#attendanceDetailsModalOverlay', false);

      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: Pending Attendance Feedback matches History cards and details behavior in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
