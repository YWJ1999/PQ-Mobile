const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '..', 'modules/attendance/options/attendance.html')).href;
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

    assert.deepEqual(
      await page.$$eval('.me-jump-pill', nodes => nodes.map(node => node.textContent.trim())),
      ['This Week', 'Last Week', 'This Month', 'Last Month'],
      'Attendance period tabs do not show parenthesized counts'
    );

    assert.equal(await page.$('.enterprise-toast-dot'), null, 'Current Filter has no leading dot');
    assert.equal(
      await page.$eval('#attendanceCurrentFilterValue', node => node.textContent.trim()),
      'All Exceptions'
    );
    assert.equal(await page.$('#attendanceFilterStartDate'), null);
    assert.equal(await page.$('#attendanceFilterEndDate'), null);

    const exceptionOptions = await page.$$eval('#attendanceExceptionFilter option', nodes => nodes.map(node => node.textContent.trim()));
    assert.deepEqual(exceptionOptions, ['All Exceptions', 'No Exception', 'Missing Clock', 'Unapproved OT', 'Late In', 'Early Out']);

    const meta = await page.$eval('#attendanceMetaBar', node => {
      const children = Array.from(node.children);
      return {
        count: children.length,
        firstTop: children[0].getBoundingClientRect().top,
        secondTop: children[1].getBoundingClientRect().top,
        text: children.map(child => child.textContent.replace(/\s+/g, ' ').trim())
      };
    });
    assert.equal(meta.count, 2);
    assert.ok(meta.secondTop > meta.firstTop, 'Supervisor appears below Shift Group');
    assert.deepEqual(meta.text, ['Shift Group: GROUP A', 'Supervisor: EBB04']);

    assert.equal(await page.$eval('#attendanceTotalHoursLabel', node => node.textContent.trim()), 'Total Hours');
    assert.equal(await page.$eval('#attendanceTotalHoursValue', node => node.textContent.trim()), '8.00/2.00');

    await page.click('[data-period="this-month"]');
    const cards = await page.$$eval('.attendance-record-card', nodes => nodes.map(node => ({
      exception: node.dataset.exception,
      historyClass: node.classList.contains('history-card-item'),
      radius: getComputedStyle(node).borderRadius,
      background: getComputedStyle(node).backgroundImage,
      hasTitle: Boolean(node.querySelector('.history-time-row')),
      hasDetails: node.querySelectorAll('.attendance-record-detail').length,
      hasDateBadge: Boolean(node.querySelector('.history-date-badge')),
      detailsTriggerTag: node.querySelector('.attendance-card-details-trigger')?.tagName,
      verifyTag: node.querySelector('.attendance-verify-button')?.tagName,
      accentWidth: parseFloat(getComputedStyle(node).borderLeftWidth),
      accentColor: getComputedStyle(node).borderLeftColor,
      hasSummaryPanel: Boolean(node.querySelector('.attendance-record-summary-panel')),
      summaryBackground: getComputedStyle(node.querySelector('.attendance-record-summary-panel')).backgroundColor,
      summaryBorderColor: getComputedStyle(node.querySelector('.attendance-record-summary-panel')).borderColor,
      reference: node.querySelector('.attendance-record-reference')?.textContent.trim(),
      hasVerifyCheckbox: Boolean(node.querySelector('.attendance-verify-button .verify-checkbox-box')),
      hasStatusPill: node.querySelector('.attendance-verify-button')?.classList.contains('attendance-status-pill'),
      detailLabels: Array.from(node.querySelectorAll('.attendance-record-detail > span')).map(label => label.textContent.trim()),
      dayType: node.querySelector('.attendance-record-detail:first-child strong')?.textContent.trim(),
      timeValue: node.querySelector('.attendance-record-detail:nth-child(2) strong')?.textContent.trim(),
      exceptionStatus: node.querySelector('.attendance-exception-status')?.textContent.replace(/\s+/g, ' ').trim(),
      statusInTopControls: Boolean(node.querySelector('.attendance-record-top .attendance-record-controls .attendance-exception-status')),
      verifyBeforeStatus: (() => {
        const controls = node.querySelector('.attendance-record-controls');
        const verify = controls?.querySelector('.attendance-verify-button');
        const status = controls?.querySelector('.attendance-exception-status');
        return Boolean(verify && status && verify.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING
          && status.getBoundingClientRect().top > verify.getBoundingClientRect().top);
      })(),
      hasActions: Boolean(node.querySelector('.attendance-card-actions')),
      actions: Array.from(node.querySelectorAll('.attendance-card-actions .card-action-btn'), button => button.textContent.trim())
    })));
    assert.equal(cards.length, 3);
    const cardTreatments = {
      none: { accent: 'rgb(16, 185, 129)', rgb: /16, 185, 129/ },
      'unapproved-ot': { accent: 'rgb(245, 158, 11)', rgb: /245, 158, 11/ },
      'late-in': { accent: 'rgb(124, 58, 237)', rgb: /124, 58, 237/ }
    };
    cards.forEach(card => {
      const treatment = cardTreatments[card.exception];
      assert.equal(card.historyClass, true, 'Attendance record uses History Card container');
      assert.equal(card.radius, '18px');
      assert.match(card.background, /linear-gradient/);
      assert.equal(card.hasTitle, true);
      assert.equal(card.hasDetails, 4);
      assert.equal(card.hasDateBadge, false, 'Attendance History Card has no left date badge');
      assert.equal(card.detailsTriggerTag, 'BUTTON');
      assert.equal(card.verifyTag, 'BUTTON');
      assert.ok(card.accentWidth >= 4, 'Attendance card has the reference left accent');
      assert.equal(card.accentColor, treatment.accent);
      assert.match(card.background, treatment.rgb);
      assert.equal(card.hasSummaryPanel, true, 'Attendance card has an inset summary panel');
      assert.match(card.summaryBackground, treatment.rgb);
      assert.match(card.summaryBorderColor, treatment.rgb);
      assert.match(card.reference, /^Date: /);
      assert.equal(card.hasVerifyCheckbox, true, 'Verify uses a square checkbox');
      assert.equal(card.hasStatusPill, false, 'Verify is not presented as a status pill');
      assert.deepEqual(card.detailLabels, ['Day Type', 'Clock Times', 'Normal Hours', 'OT Hours']);
      assert.equal(card.dayType, 'Work Day');
      assert.equal(card.statusInTopControls, true, 'Exception status uses the History Card top-right placement');
      assert.equal(card.verifyBeforeStatus, true, 'Verify checkbox appears above exception status');
      assert.equal(card.hasActions, true);
    });
    assert.deepEqual(cards.map(card => card.exceptionStatus), ['No Exception', 'Unapproved OT', 'Late In']);
    assert.deepEqual(
      cards.map(card => card.timeValue),
      ['07:38', '08:09, 19:40', '08:42, 17:30'],
      'Attendance cards show comma-separated clock times'
    );
    assert.deepEqual(
      cards.map(card => ({ exception: card.exception, actions: card.actions })),
      [
        { exception: 'none', actions: ['Change Shift', 'Feedback'] },
        { exception: 'unapproved-ot', actions: ['Change Shift', 'Feedback'] },
        { exception: 'late-in', actions: ['Change Shift', 'Feedback'] }
      ],
      'Every Attendance record, including Unapproved OT, keeps both card actions'
    );
    assert.equal(await page.$eval('#verifyAllBtn', node => node.tagName), 'BUTTON');
    assert.deepEqual(
      await page.$eval('#attendanceUpdateBtn', node => ({ disabled: node.disabled, hidden: node.hidden })),
      { disabled: true, hidden: true },
      'Update starts disabled and hidden'
    );

    const actionColors = await page.$eval('.attendance-record-card', node => {
      const shift = getComputedStyle(node.querySelector('.btn-shift-change'));
      const feedback = getComputedStyle(node.querySelector('.btn-feedback'));
      const applyStyle = getComputedStyle(document.getElementById('attendanceUpdateBtn'));
      return {
        applyBackground: applyStyle.backgroundImage,
        shift: [shift.backgroundImage, shift.backgroundColor, shift.borderColor, shift.color],
        feedback: [feedback.backgroundImage, feedback.backgroundColor, feedback.borderColor, feedback.color]
      };
    });
    assert.deepEqual(actionColors.feedback, actionColors.shift, 'Change Shift and Feedback use the same purple treatment');
    assert.equal(actionColors.shift[0], actionColors.applyBackground, 'Card actions use the same bright purple gradient as Apply');
    assert.equal(actionColors.shift[3], 'rgb(255, 255, 255)', 'Card action text is white');
    assert.equal(
      await page.$$eval('.attendance-card-actions .card-action-btn i', nodes => nodes.length),
      0,
      'Attendance card action buttons use text without icons'
    );
    assert.equal(await page.$$eval('.main-content .attendance-record-card', nodes => nodes.length), 3, 'Attendance cards stay inside main content');
    assert.ok(await page.$eval('phone-bottom-nav .bottom-nav', node => node.getBoundingClientRect().height) > 0, 'Bottom navigation keeps its rendered height');

    await page.focus('.attendance-card-details-trigger');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#attendanceDetailsModalOverlay', node => getComputedStyle(node).display), 'flex');
    const attendanceDetailSections = await page.evaluate(() => {
      const mainDetails = document.querySelector('#attendanceDetailsModalOverlay .attendance-details-main');
      return {
        mainLabels: [...mainDetails.children].map(row => row.firstElementChild?.textContent.trim()),
        outsideLabels: [...document.querySelectorAll('#attendanceDetailsModalOverlay .attendance-details-empty-label')]
          .map(node => node.textContent.trim()),
        allOutsideMain: [...document.querySelectorAll('#attendanceDetailsModalOverlay .attendance-details-empty-label')]
          .every(node => !mainDetails.contains(node))
      };
    });
    assert.equal(attendanceDetailSections.mainLabels.at(-1), 'Document #');
    assert.equal(attendanceDetailSections.mainLabels.includes('Leave Info'), false);
    assert.equal(attendanceDetailSections.mainLabels.includes('Overtime Info'), false);
    assert.deepEqual(attendanceDetailSections.outsideLabels, ['Leave Info', 'Overtime Info']);
    assert.equal(attendanceDetailSections.allOutsideMain, true);
    await page.evaluate(() => closeModal('attendanceDetailsModalOverlay'));
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));

    await page.focus('.attendance-verify-button');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('.attendance-verify-button', node => node.getAttribute('aria-pressed')), 'true');
    assert.deepEqual(
      await page.$eval('#attendanceUpdateBtn', node => ({ disabled: node.disabled, hidden: node.hidden })),
      { disabled: false, hidden: false },
      'A checkbox change reveals Update'
    );

    await page.$eval('#verifyAllBtn', button => button.scrollIntoView({ block: 'start' }));
    await page.click('#verifyAllBtn');
    assert.equal(await page.$eval('#attendanceUpdateBtn', node => node.disabled), false, 'Verify All enables Update');
    assert.deepEqual(
      await page.$$eval('.attendance-verify-button', buttons => buttons.map(button => button.getAttribute('aria-pressed'))),
      ['true', 'true', 'true']
    );
    await page.click('#attendanceUpdateBtn');
    assert.deepEqual(
      await page.$eval('#attendanceUpdateBtn', node => ({ disabled: node.disabled, hidden: node.hidden })),
      { disabled: true, hidden: true },
      'Update hides after saving'
    );

    await page.$eval('.attendance-record-card[data-exception="unapproved-ot"] .btn-shift-change', node => {
      node.scrollIntoView({ block: 'center' });
      node.click();
    });
    assert.equal(await page.$eval('#shiftChangeModalOverlay', node => getComputedStyle(node).display), 'flex');
    const shiftForm = await page.$eval('#shiftChangeModalOverlay', overlay => {
      const header = overlay.querySelector('.attendance-form-header');
      const pageHeader = document.querySelector('.cal-top-header');
      const form = overlay.querySelector('#shiftChangeRequestForm');
      const titleBlock = header?.querySelector('.attendance-form-header-title');
      const headerBox = header?.getBoundingClientRect();
      const titleBox = titleBlock?.getBoundingClientRect();
      const primaryReference = document.createElement('span');
      primaryReference.style.color = 'var(--text-primary)';
      overlay.appendChild(primaryReference);
      const primaryColor = getComputedStyle(primaryReference).color;
      primaryReference.remove();
      return {
        hasStatusBar: Boolean(header?.querySelector('phone-status-bar')),
        hasBackButton: Boolean(header?.querySelector('[data-shift-change-back]')),
        title: header?.querySelector('h3')?.textContent.trim(),
        subtitle: header?.querySelector('.attendance-form-header-subtitle')?.textContent.trim(),
        titleCenterDelta: headerBox && titleBox
          ? Math.abs((titleBox.left + titleBox.width / 2) - (headerBox.left + headerBox.width / 2))
          : 999,
        headerRadius: header ? getComputedStyle(header).borderBottomLeftRadius : '',
        headerBackground: header ? getComputedStyle(header).backgroundImage : '',
        pageHeaderBackground: getComputedStyle(pageHeader).backgroundImage,
        formTag: form?.tagName,
        labels: Array.from(form?.querySelectorAll('label') || []).map(label => ({
          text: label.textContent.trim(),
          forId: label.htmlFor,
          hasControl: Boolean(label.htmlFor && form.querySelector('#' + label.htmlFor)),
          color: getComputedStyle(label).color,
          fontWeight: getComputedStyle(label).fontWeight
        })),
        primaryColor,
        hasSummary: Boolean(form?.querySelector('.attendance-form-summary')),
        hasFormCard: Boolean(form?.querySelector('.attendance-form-card')),
        hasCancel: Boolean(form?.querySelector('.attendance-form-cancel')),
        hasSubmit: Boolean(form?.querySelector('.attendance-form-submit')),
        actions: Array.from(form?.querySelectorAll('.attendance-form-actions button') || []).map(button => ({
          text: button.textContent.replace(/\s+/g, ' ').trim(),
          hasIcon: Boolean(button.querySelector('i')),
          radius: getComputedStyle(button).borderRadius
        })),
        hasBottomNav: Boolean(overlay.querySelector('phone-bottom-nav .bottom-nav'))
      };
    });
    assert.equal(shiftForm.hasStatusBar, true, 'Shift Change uses the standard phone form header');
    assert.equal(shiftForm.hasBackButton, true, 'Shift Change header uses a back control');
    assert.equal(shiftForm.title, 'Shift Change Request');
    assert.equal(shiftForm.subtitle, undefined, 'Shift Change header has no secondary title');
    assert.ok(shiftForm.titleCenterDelta <= 2, 'Shift Change title block is centered like Leave');
    assert.equal(shiftForm.headerRadius, '24px');
    assert.equal(shiftForm.headerBackground, shiftForm.pageHeaderBackground, 'Shift Change header matches Attendance header');
    assert.equal(shiftForm.formTag, 'FORM');
    assert.deepEqual(shiftForm.labels.map(label => label.text), ['New Shift', 'Reason', 'Remarks']);
    assert.equal(shiftForm.labels.every(label => label.hasControl), true, 'Every Shift Change label is connected to its control');
    assert.equal(shiftForm.labels.every(label => label.color === shiftForm.primaryColor), true, 'Shift Change labels match the form values');
    assert.equal(shiftForm.labels.every(label => label.fontWeight === '700'), true, 'Shift Change labels use the Leave form weight');
    assert.equal(shiftForm.hasSummary, true);
    assert.equal(shiftForm.hasFormCard, true, 'Shift Change fields use the Leave-style white form card');
    assert.equal(shiftForm.hasCancel, true);
    assert.equal(shiftForm.hasSubmit, true);
    assert.deepEqual(shiftForm.actions.map(action => action.text), ['Cancel', 'Draft', 'Submit']);
    assert.deepEqual(shiftForm.actions.map(action => action.hasIcon), [false, true, true]);
    assert.equal(shiftForm.actions.every(action => action.radius === '999px'), true, 'Shift Change actions use pill buttons');
    assert.equal(shiftForm.hasBottomNav, true, 'Shift Change form keeps the standard bottom navigation');

    await page.select('#shiftChangeNewShift', 'W02');
    assert.deepEqual(
      await page.$$eval('#shiftChangeStart, #shiftChangeEnd', nodes => nodes.map(node => node.textContent.trim())),
      ['9.00AM', '6.00PM']
    );
    await page.click('.attendance-form-submit');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));
    assert.equal(await page.$eval('#shiftChangeModalOverlay', node => getComputedStyle(node).display), 'none');

    await page.$eval('.attendance-record-card .btn-feedback', node => {
      node.scrollIntoView({ block: 'center' });
      node.click();
    });
    assert.equal(await page.$eval('#feedbackModalOverlay', node => getComputedStyle(node).display), 'flex');
    const feedbackDetails = await page.$eval('#feedbackModalOverlay', overlay => {
      const heading = Array.from(overlay.querySelectorAll('h4')).find(node => node.textContent.trim().includes('Feedback Details'));
      const card = heading?.parentElement;
      const reasonLabel = Array.from(card?.querySelectorAll('label') || [])
        .find(label => label.textContent.trim() === 'Time Amend Reason');
      const attachmentActions = Array.from(card?.querySelectorAll('[onclick^="triggerFbFileUpload"]') || []);
      const feedbackBack = overlay.querySelector('[data-feedback-back]');
      const attendanceBack = document.querySelector('.cal-top-header .header-btn');
      const buttonAppearance = button => {
        if (!button) return null;
        const style = getComputedStyle(button);
        return {
          width: style.width,
          height: style.height,
          borderRadius: style.borderRadius,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          iconSize: getComputedStyle(button.querySelector('i')).fontSize
        };
      };
      return {
        hasHeaderRightIcon: Boolean(overlay.querySelector('[aria-label="Information Guide"]')),
        hasDetailsHeadingIcon: Boolean(heading?.querySelector('i')),
        hasOptionalText: card?.textContent.includes('(Optional)') || false,
        hasReasonRequiredMarker: Array.from(reasonLabel?.parentElement?.querySelectorAll('span') || [])
          .some(span => span.textContent.trim() === '*'),
        attachmentButtons: attachmentActions.map(action => {
          const visual = action.firstElementChild;
          const style = getComputedStyle(visual);
          return {
            width: style.width,
            height: style.height,
            borderRadius: style.borderRadius,
            iconSize: getComputedStyle(visual.querySelector('i')).fontSize
          };
        }),
        actions: Array.from(overlay.querySelectorAll('.attendance-feedback-actions button'))
          .map(button => button.textContent.replace(/\s+/g, ' ').trim()),
        metaRows: Array.from(overlay.querySelectorAll('.feedback-meta-row')).map(row => {
          const rect = row.getBoundingClientRect();
          return {
            label: row.querySelector('.label')?.textContent.trim(),
            value: row.querySelector('[data-feedback-meta-value]')?.textContent.trim(),
            valueColor: getComputedStyle(row.querySelector('[data-feedback-meta-value]')).color,
            top: rect.top,
            bottom: rect.bottom
          };
        }),
        feedbackBack: buttonAppearance(feedbackBack),
        attendanceBack: buttonAppearance(attendanceBack),
        labels: Array.from(card?.querySelectorAll('label') || [])
          .filter(label => label.getClientRects().length > 0)
          .map(label => label.textContent.replace(/\s+/g, ' ').trim())
      };
    });
    assert.equal(feedbackDetails.hasHeaderRightIcon, false, 'Attendance Feedback header has no right-side info icon');
    assert.equal(feedbackDetails.hasDetailsHeadingIcon, false, 'Feedback Details heading has no left icon');
    assert.equal(feedbackDetails.hasOptionalText, false, 'Amended Shift has no Optional text');
    assert.deepEqual(feedbackDetails.feedbackBack, feedbackDetails.attendanceBack, 'Feedback back button matches the Attendance header control');
    assert.deepEqual(
      feedbackDetails.metaRows.map(row => row.label),
      ['Original Shift', 'Date', 'Employee'],
      'Feedback summary shows Original Shift, Date, and the existing Employee row'
    );
    assert.ok(feedbackDetails.metaRows[0].value, 'Original Shift has a value');
    assert.equal(feedbackDetails.metaRows[1].value, 'Tue 15 Sep 2026');
    assert.equal(feedbackDetails.metaRows[1].valueColor, feedbackDetails.metaRows[0].valueColor, 'Date uses the Original Shift text color');
    assert.ok(feedbackDetails.metaRows[1].top >= feedbackDetails.metaRows[0].bottom, 'Date row is below Original Shift');
    assert.equal(feedbackDetails.hasReasonRequiredMarker, false, 'Time Amend Reason has no required marker');
    assert.deepEqual(
      feedbackDetails.attachmentButtons,
      [
        { width: '54px', height: '54px', borderRadius: '50%', iconSize: '18px' },
        { width: '54px', height: '54px', borderRadius: '50%', iconSize: '18px' }
      ],
      'Attendance Feedback attachment actions match the shared Leave form controls'
    );
    assert.deepEqual(
      feedbackDetails.labels,
      ['Amended Shift', 'Time Amend Reason', 'Late In Minutes', 'Late Reason', 'Early Out Minutes', 'Early Out Reason',
        'Time Off Minutes', 'Time Off Reason', 'Absent', 'Absent Reason', 'Leave Code', 'Remarks', 'Attachments'],
      'Feedback Details contains only the requested fields'
    );
    assert.deepEqual(feedbackDetails.actions, ['Cancel', 'Draft', 'Submit'], 'Attendance Feedback has the complete form action set');
    await page.click('.attendance-feedback-actions .attendance-form-cancel');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('feedbackModalOverlay')).display === 'none');
    await page.evaluate(() => openFeedbackModal('15 Sep 2026', '8.30AM�5.30PM (W01)', ''));
    await page.waitForFunction(() => getComputedStyle(document.getElementById('feedbackModalOverlay')).display === 'flex');
    await page.select('#fbAmendReasonSelect', '');
    await page.evaluate(() => submitFbForm());
    await page.waitForFunction(() => getComputedStyle(document.getElementById('feedbackModalOverlay')).display === 'none');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 400)));

    await page.evaluate(() => openModal('filterModalOverlay'));
    await page.waitForFunction(() => getComputedStyle(document.getElementById('filterModalOverlay')).display === 'flex');
    await page.select('#attendanceExceptionFilter', 'unapproved-ot');
    await page.click('#attendanceApplyFilter');
    assert.match(
      await page.$eval('#attendanceCurrentFilterValue', node => node.textContent.trim()),
      /^Unapproved OT$/
    );
    assert.deepEqual(
      await page.$$eval('.attendance-record-card:not([hidden])', nodes => nodes.map(node => node.dataset.exception)),
      ['unapproved-ot']
    );
    assert.deepEqual(
      await page.$$eval('.attendance-record-card', nodes => nodes.map(node => ({
        exception: node.dataset.exception,
        hidden: node.hidden,
        display: getComputedStyle(node).display
      }))),
      [
        { exception: 'none', hidden: true, display: 'none' },
        { exception: 'unapproved-ot', hidden: false, display: 'flex' },
        { exception: 'late-in', hidden: true, display: 'none' }
      ]
    );

    await page.evaluate(() => openModal('filterModalOverlay'));
    await page.waitForFunction(() => getComputedStyle(document.getElementById('filterModalOverlay')).display === 'flex');
    await page.click('#attendanceFilterReset');
    assert.equal(await page.$eval('#attendanceExceptionFilter', node => node.value), 'all');
    assert.equal(await page.$eval('#attendanceCurrentFilterValue', node => node.textContent.trim()), 'All Exceptions');
    assert.equal(await page.$$eval('.attendance-record-card:not([hidden])', nodes => nodes.length), 3);

    for (const width of [360, 390, 420]) {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
      for (const theme of ['light', 'dark']) {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
        await page.evaluate(selectedTheme => { document.documentElement.dataset.theme = selectedTheme; }, theme);
        await page.click('#verifyAllBtn');
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          mainOverflow: document.querySelector('.main-content').scrollWidth - document.querySelector('.main-content').clientWidth,
          metaRows: new Set(Array.from(document.querySelector('#attendanceMetaBar').children).map(node => Math.round(node.getBoundingClientRect().top))).size,
          updateVisible: !document.getElementById('attendanceUpdateBtn').hidden
        }));
        assert.ok(layout.overflow <= 1, `${theme} ${width}px has no document overflow`);
        assert.ok(layout.mainOverflow <= 1, `${theme} ${width}px has no content overflow`);
        assert.equal(layout.metaRows, 2, `${theme} ${width}px keeps Supervisor below Shift Group`);
        assert.equal(layout.updateVisible, true, `${theme} ${width}px shows Update after Verify All`);

        await page.evaluate(() => openModal('shiftChangeModalOverlay'));
        await page.waitForFunction(() => getComputedStyle(document.getElementById('shiftChangeModalOverlay')).display === 'flex');
        const shiftLayout = await page.$eval('#shiftChangeModalOverlay', overlay => {
          const page = overlay.querySelector('.attendance-form-page');
          const actions = overlay.querySelector('.attendance-form-actions');
          return {
            overflow: page.scrollWidth - page.clientWidth,
            actionOverflow: actions.scrollWidth - actions.clientWidth,
            bottomNavHeight: overlay.querySelector('phone-bottom-nav .bottom-nav')?.getBoundingClientRect().height || 0
          };
        });
        assert.ok(shiftLayout.overflow <= 1, `${theme} ${width}px Shift Change has no page overflow`);
        assert.ok(shiftLayout.actionOverflow <= 1, `${theme} ${width}px Shift Change actions fit`);
        assert.ok(shiftLayout.bottomNavHeight > 0, `${theme} ${width}px Shift Change bottom navigation renders`);
      }
    }

    assert.deepEqual(pageErrors, [], `Attendance page should have no JavaScript errors: ${pageErrors.join('; ')}`);
    console.log('PASS: Attendance filter, meta row, total hours and History Card redesign.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
