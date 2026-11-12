const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-feedback.html')).href;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const apply = async (values) => {
      await page.click('#staffFeedbackFilterTrigger');
      await page.evaluate(values => {
        for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value;
      }, values);
      await page.click('#staffFeedbackApplyFilter');
    };
    const navigate = async selector => Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(selector)]);
    const reset = async () => { await page.click('#staffFeedbackFilterTrigger'); await page.click('#staffFeedbackResetFilter'); };
    const assertReviewControlVisible = async id => {
      assert.deepEqual(await page.evaluate(() => {
        const active = document.activeElement;
        const control = active.getBoundingClientRect();
        const body = document.querySelector('main').getBoundingClientRect();
        return { id: active.id, visible: control.top >= body.top - 1 && control.bottom <= body.bottom + 1 };
      }), { id, visible: true });
    };
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      await page.evaluate(() => ['pq_staff_feedback_reviews', 'pq_staff_feedback_review_selection', 'pq_staff_feedback_list_return'].forEach(key => sessionStorage.removeItem(key)));
      await page.reload({ waitUntil: 'networkidle0' });
     assert.equal(await page.$$eval('.staff-feedback-card', nodes => nodes.length), 60, 'The preview renders all 60 records');
      assert.equal(await page.$('.staff-feedback-list-heading'), null, 'The repeated Staff Feedback heading is removed');
     assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '60');
      const totalCardStyle = await page.$eval('.staff-feedback-overview', (card, theme) => {
        const label = card.querySelector('.record-summary-label');
        const value = card.querySelector('.record-summary-value');
        const cardStyle = getComputedStyle(card);
        const labelStyle = getComputedStyle(label);
        const valueStyle = getComputedStyle(value);
        const bodyColor = getComputedStyle(document.body).color;
        return {
          label: label.textContent.trim(),
          borderRadius: cardStyle.borderRadius,
          padding: cardStyle.padding,
          lightSurfaceIsWhite: theme === 'light' ? cardStyle.backgroundColor === 'rgb(255, 255, 255)' : null,
          borderColor: cardStyle.borderColor,
          borderToken: cardStyle.getPropertyValue('--border-subtle').trim(),
          labelColorIsNeutral: labelStyle.color === bodyColor,
          valueColorIsNeutral: valueStyle.color === bodyColor,
          labelSize: labelStyle.fontSize,
          valueSize: valueStyle.fontSize
        };
      }, theme);
      assert.deepEqual(totalCardStyle, {
        label: 'Records',
        borderRadius: '18px',
        padding: '16px',
        lightSurfaceIsWhite: theme === 'light' ? true : null,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgb(226, 232, 240)',
        borderToken: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
        labelColorIsNeutral: false,
        valueColorIsNeutral: false,
        labelSize: '13px',
        valueSize: '18px'
      }, 'Staff Feedback uses the shared record count and chart summary');
      const statusIcons = await page.$$eval('.staff-feedback-card .staff-feedback-status', badges => Object.fromEntries(badges.map(badge => [badge.textContent.trim(), badge.querySelector('i')?.className || ''])));
      assert.deepEqual(statusIcons, { Pending: 'fa-solid fa-clock', Responded: 'fa-solid fa-reply' });
      assert.deepEqual(
        await page.$$eval('#staffFeedbackStatus option', nodes => nodes.map(node => node.textContent.trim())),
        ['All Statuses', 'Pending', 'Responded']
      );
      assert.equal(await page.$$eval('.staff-feedback-details-trigger', nodes => nodes.length), 60, 'Every card has a separate keyboard-accessible details trigger');
      assert.equal(await page.$eval('.staff-feedback-card', node => node.getAttribute('role')), null, 'The card does not nest Review inside another button role');
      assert.equal(await page.$$eval('.staff-feedback-review-button', nodes => nodes.length), 60, 'Every feedback card provides Review');
      assert.deepEqual(await page.$eval('.staff-feedback-review-button', button => ({
        text: button.textContent.trim(),
        purple: getComputedStyle(button).backgroundImage.includes('linear-gradient'),
        singleLine: getComputedStyle(button).whiteSpace
      })), { text: 'Review', purple: true, singleLine: 'nowrap' });
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `No main overflow at ${width}px`);
        assert.ok(await page.$$eval('.staff-feedback-card', nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)));
        assert.ok(await page.$$eval('.staff-feedback-card', nodes => nodes.every(node => {
          const id = node.querySelector('.staff-feedback-emp-no');
          return id.textContent.startsWith('#') && id.getBoundingClientRect().top >= node.querySelector('.staff-feedback-name').getBoundingClientRect().bottom;
        })));
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_feedback_${theme}.png`) });
      await page.click('.staff-feedback-details-trigger');
     assert.equal(await page.$eval('#staffFeedbackDetailsOverlay', node => node.hidden), false);
      const detailStatus = await page.$$eval('#staffFeedbackDetailsTable tr', rows => {
        const row = rows.find(node => node.cells[0].textContent.trim() === 'Status');
        const badge = row.cells[1].querySelector('.record-detail-status');
        return { text: badge?.textContent.trim(), state: badge?.dataset.status };
      });
      assert.deepEqual(detailStatus, { text: 'Pending', state: 'pending' });
      assert.equal(await page.$eval('main', node => node.inert), true);
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_feedback_details_${theme}_top.png`) });
      await page.$eval('#staffFeedbackDetailsOverlay .detail-popout-body', node => { node.scrollTop = node.scrollHeight; });
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_feedback_details_${theme}_bottom.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('staff-feedback-details-trigger')), true);
      await page.setViewport({ width: 360, height: 667 });
      await navigate('.staff-feedback-card:first-child .staff-feedback-review-button');
      assert.ok(page.url().includes('/staff-feedback-review.html'), 'Review opens a separate form page');
      assert.equal(await page.$('#staffFeedbackReviewOverlay'), null, 'Review uses a page rather than an overlay');
      assert.equal(await page.$('[role=dialog][aria-modal=true]'), null, 'The review form is not a dialog');
      assert.deepEqual(await page.$$eval('.staff-feedback-review-actions a, .staff-feedback-review-actions button', nodes => nodes.map(node => node.textContent.trim())), ['Cancel', 'Submit']);
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(await page.evaluate(() => {
        const active = document.activeElement;
        const rect = active.getBoundingClientRect();
        return { id: active.id, visible: rect.top >= 0 && rect.bottom <= innerHeight };
      }), { id: 'staffFeedbackReviewTitle', visible: true }, 'A short viewport opens Review with visible non-scrolling focus');
      assert.ok(await page.$eval('#staffFeedbackReviewForm', node => {
        const rect = node.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
      }), 'Review form stays within a 360px viewport');
      assert.deepEqual(await page.$$eval('#staffFeedbackReviewForm input[readonly]', nodes => Object.fromEntries(nodes.map(node => [node.previousElementSibling.textContent.trim(), node.value]))), {
        'Employee ID': '#004177',
        'Name': 'AHMAD RAFY BIN ZULKIPLE',
        'Type': 'Suggestion',
        'Category': 'Policy',
        'Title': 'Flexible working hours',
        'Feedback Date 1': '5 Oct 2026',
        'Feedback Date 2': '—',
        'Reference 1': 'FB-0001'
      });
      assert.deepEqual(await page.$$eval('#staffFeedbackReviewForm input[readonly]', nodes => nodes.map(node => node.previousElementSibling.textContent.trim())), ['Employee ID', 'Name', 'Type', 'Category', 'Title', 'Feedback Date 1', 'Feedback Date 2', 'Reference 1'], 'Locked details follow the requested field order');
      assert.ok(await page.$$eval('.staff-feedback-review-section', nodes => nodes.every(node => {
        const style = getComputedStyle(node);
        return style.borderTopStyle === 'solid' && style.borderRadius === '16px';
      })), 'Each review form section uses the shared bordered form container');
      assert.deepEqual(await page.$$eval('#staffFeedbackReviewForm .staff-feedback-review-editable label', nodes => nodes.map(node => node.textContent.replace('*', '').trim())), ['Reward', 'Rating', 'Comments']);
      assert.deepEqual(await page.$$eval('#staffFeedbackReward option', nodes => nodes.map(node => node.textContent.trim())), ['Select Reward', 'No Reward', 'RM 20.00', 'RM 50.00', 'RM 100.00', 'Recognition Letter']);
      assert.deepEqual(await page.$$eval('#staffFeedbackRating option', nodes => nodes.map(node => node.textContent.trim())), ['Select Rating', '1 - Needs Improvement', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent']);
      await page.click('#staffFeedbackSubmitReview');
      assert.equal(await page.$eval('#staffFeedbackReviewError', node => node.textContent.trim()), 'Reward is required.');
      assert.equal(await page.$('#staffFeedbackReviewOverlay'), null, 'Review uses a page rather than an overlay');
      await assertReviewControlVisible('staffFeedbackReward');
      await page.select('#staffFeedbackReward', 'RM 50.00');
      await page.click('#staffFeedbackSubmitReview');
      assert.equal(await page.$eval('#staffFeedbackReviewError', node => node.textContent.trim()), 'Rating is required.');
      await assertReviewControlVisible('staffFeedbackRating');
      await page.select('#staffFeedbackRating', '4');
      await page.click('#staffFeedbackSubmitReview');
      assert.equal(await page.$eval('#staffFeedbackReviewError', node => node.textContent.trim()), 'Comments are required.');
      await assertReviewControlVisible('staffFeedbackComments');
      await page.type('#staffFeedbackComments', 'Reviewed and approved for follow-up.');
      await page.setViewport({ width: 390, height: 950 });
      assert.ok(await page.$eval('#staffFeedbackReviewName', node => node.scrollWidth <= node.clientWidth + 1), 'The employee name is fully readable at 390px');
      assert.ok(await page.evaluate(() => {
        const comments = document.getElementById('staffFeedbackComments').getBoundingClientRect();
        const body = document.querySelector('main').getBoundingClientRect();
        return comments.bottom <= body.bottom + 1;
      }), 'Focused Comments stays visible within the page');
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_feedback_review_${theme}.png`) });
      await navigate('#staffFeedbackSubmitReview');
      assert.equal(new URL(page.url()).pathname.endsWith('/staff-feedback.html'), true);
      assert.equal(await page.$eval('.staff-feedback-card:first-child .staff-feedback-status', node => node.textContent.trim()), 'Responded');
      await navigate('.staff-feedback-card:first-child .staff-feedback-review-button');
      assert.deepEqual(await page.evaluate(() => ({
        reward: document.getElementById('staffFeedbackReward').value,
        rating: document.getElementById('staffFeedbackRating').value,
        comments: document.getElementById('staffFeedbackComments').value
      })), { reward: 'RM 50.00', rating: '4', comments: 'Reviewed and approved for follow-up.' }, 'Reopening Review shows the values saved during this page visit');
      await page.type('#staffFeedbackComments', ' Unsaved draft');
      await navigate('#staffFeedbackCancelReview');
      assert.equal(new URL(page.url()).pathname.endsWith('/staff-feedback.html'), true);
      await navigate('.staff-feedback-card:first-child .staff-feedback-review-button');
      assert.equal(await page.$eval('#staffFeedbackComments', node => node.value), 'Reviewed and approved for follow-up.', 'Cancel does not save draft comments');
      await navigate('#staffFeedbackReviewBack');
      assert.equal(new URL(page.url()).pathname.endsWith('/staff-feedback.html'), true);
      await page.click('#staffFeedbackFilterTrigger');
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_feedback_filter_${theme}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'staffFeedbackFilterTrigger');
      await apply({ staffFeedbackKeyword: '#004177' });
      assert.equal(await page.$$eval('.staff-feedback-card', nodes => nodes.length), 6);
     await reset();
     await page.click('#staffFeedbackViewChart');
      assert.equal(await page.$eval('#staffFeedbackListView', node => node.hidden), true);
      assert.equal(await page.$eval('#staffFeedbackChartView', node => node.hidden), false);
      assert.equal(await page.$eval('#staffFeedbackPageTitle', node => node.textContent.trim()), 'Staff Feedback Analysis');
      assert.equal(await page.$('#staffFeedbackChartOverlay'), null, 'Chart is a page view, not an overlay');
      assert.ok(await page.$eval('phone-bottom-nav .bottom-nav', node => node.getBoundingClientRect().height > 0));
     assert.equal(await page.$eval('#staffFeedbackChartTotal', node => node.textContent), '60');
     assert.equal(await page.$$eval('.staff-feedback-legend-count', nodes => nodes.reduce((sum, node) => sum + Number(node.textContent), 0)), 60);
     assert.deepEqual(
       await page.$$eval('.staff-feedback-legend-name span:last-child', nodes => nodes.map(node => node.textContent.trim())),
       ['Pending', 'Responded']
     );
     assert.ok(await page.$$eval('.staff-feedback-legend-row', nodes => nodes.every(node => node.children.length === 3)));
      const benefitChartLayout = await page.evaluate(() => {
        const card = document.querySelector('.staff-feedback-chart-card');
        const title = document.getElementById('staffFeedbackChartTitle');
        const figure = document.querySelector('.staff-feedback-chart-figure');
        const svg = document.getElementById('staffFeedbackDonutSvg');
        const markers = [...document.querySelectorAll('.staff-feedback-legend-swatch')];
        return {
          cardRadius: getComputedStyle(card).borderRadius,
          titleSize: getComputedStyle(title).fontSize,
          figureWidth: figure.getBoundingClientRect().width,
          svgWidth: svg.getBoundingClientRect().width,
          segmentCount: svg.querySelectorAll('#staffFeedbackDonutCircles circle').length,
          strokeWidths: [...svg.querySelectorAll('#staffFeedbackDonutCircles circle')].map(circle => circle.getAttribute('stroke-width')),
          roundMarkers: markers.every(marker => getComputedStyle(marker).borderRadius === '50%')
        };
      });
      assert.deepEqual(benefitChartLayout, { cardRadius: '28px', titleSize: '17px', figureWidth: 195, svgWidth: 195, segmentCount: 2, strokeWidths: ['22', '22'], roundMarkers: true });
     assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
     await page.screenshot({ path: path.join(__dirname, `employee_career_staff_feedback_chart_${theme}.png`) });
      await page.click('#staffFeedbackBack');
      assert.equal(await page.$eval('#staffFeedbackListView', node => node.hidden), false);
      assert.equal(await page.$eval('#staffFeedbackChartView', node => node.hidden), true);
      assert.equal(await page.$eval('#staffFeedbackPageTitle', node => node.textContent.trim()), 'Staff Feedback');
     assert.equal(await page.evaluate(() => document.activeElement.id), 'staffFeedbackViewChart');
     assert.equal(await page.$eval('main', node => node.inert), false);
    }

    // Hand-picked records verify inclusive dates, combined filters and chart aggregation.
    await page.evaluateOnNewDocument(() => {
      window.EMPLOYEE_CAREER_STAFF_FEEDBACK_RECORDS = Object.freeze([
        Object.freeze({ empNo: '004177', name: 'Ahmad Rafy', date: '2026-09-02', title: 'Shift suggestion', feedback: 'Consider flexible starting hours.', type: 'Suggestion', category: 'Policy', status: 'Pending', feedbackDate1: '2026-09-02', feedbackDate2: '2026-09-03', feedbackNote: 'Start at 8 or 9 AM.', feedbackRemarks: 'For morning shifts.', submitDate: '2026-09-04', reviewerComment: 'Review next week.', reviewedBy: 'Sarah Tan', reviewedDate: '2026-09-05', rating: 0, reward: 0, attachments: [{ name: 'shift-note.txt', url: '../../assets/staff-feedback-sample-note.txt' }, { name: 'invalid.txt', url: 'javascript:alert(1)' }] }),
        Object.freeze({ empNo: '004177', name: 'Ahmad Rafy', date: '2026-09-18', title: 'Office chairs', feedback: 'Please replace worn chairs.', type: 'Suggestion', category: 'Facilities', status: 'Resolved', reviewerComment: 'New chairs delivered.', reviewedBy: 'Farah Hassan', reviewedDate: '2026-09-20', rating: 4, reward: 'RM 50.00', attachments: [] }),
        Object.freeze({ empNo: '000070', name: 'Yee seong liew', date: '2026-09-18', title: 'Shift suggestion', feedback: 'Add earlier shifts.', type: 'Suggestion', category: 'Policy', status: 'Pending' }),
        Object.freeze({ empNo: '000030', name: 'Andrew', date: '2026-10-05', title: '<img src=x onerror=alert(1)>', feedback: 'Thanks for the training.', type: 'Compliment', category: 'Management', status: 'Resolved' })
      ]);
    });
    await page.goto(url + '?theme=dark', { waitUntil: 'networkidle0' });
    await apply({ staffFeedbackKeyword: '#004177', staffFeedbackStartDate: '2026-09-02', staffFeedbackEndDate: '2026-09-18', staffFeedbackType: 'Suggestion', staffFeedbackCategory: 'Policy', staffFeedbackStatus: 'Pending' });
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '1');
    assert.match(await page.$eval('.staff-feedback-card', node => node.innerText), /Ahmad Rafy/);
    await page.click('.staff-feedback-details-trigger');
    const details = await page.$$eval('#staffFeedbackDetailsTable tr', rows => Object.fromEntries(rows.map(row => [row.cells[0].textContent.trim(), row.cells[1].textContent.trim()])));
    assert.deepEqual(details, {
      'Emp #': '#004177', 'Name': 'Ahmad Rafy', 'Type': 'Suggestion', 'Category': 'Policy', 'Title': 'Shift suggestion',
      'Feedback Date 1': '2 Sept 2026', 'Feedback Date 2': '3 Sept 2026', 'Feedback Note': 'Start at 8 or 9 AM.',
      'Feedback Remarks': 'For morning shifts.', 'Submit Date': '4 Sept 2026', 'Reviewer Comment': 'Review next week.',
      'Reviewed By': 'Sarah Tan', 'Reviewed Date': '5 Sept 2026', 'Rating': '0', 'Reward': '0', 'Status': 'Pending', 'Attachment': 'shift-note.txtinvalid.txt'
    }, 'The clicked filtered record supplies every detail field, including zero values');
    assert.equal(await page.$$eval('#staffFeedbackDetailsTable a', nodes => nodes.length), 1, 'Unsafe attachment URLs do not become links');
    assert.match(await page.$eval('#staffFeedbackDetailsTable a', node => node.href), /staff-feedback-sample-note\.txt$/);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'staffFeedbackCloseDetails', 'Tab wraps inside details');
    await page.keyboard.press('Escape');
   await page.click('#staffFeedbackViewChart');
   assert.equal(await page.$eval('#staffFeedbackChartTotal', node => node.textContent), '1');
    assert.deepEqual(await page.$$eval('.staff-feedback-legend-row', nodes => nodes.map(node => ({ label: node.children[0].textContent.trim(), count: node.children[1].textContent.trim(), percent: node.children[2].textContent.trim() }))), [{ label: 'Pending', count: '1', percent: '100.00%' }]);
   await page.select('#staffFeedbackChartMetric', 'category');
    assert.deepEqual(await page.$$eval('.staff-feedback-legend-row', nodes => nodes.map(node => ({ label: node.children[0].textContent.trim(), count: node.children[1].textContent.trim(), percent: node.children[2].textContent.trim() }))), [{ label: 'Policy', count: '1', percent: '100.00%' }]);
    await page.click('#staffFeedbackBack');
   await reset();
    await page.$eval('.staff-feedback-card:nth-child(2) .staff-feedback-details-trigger', node => node.focus());
    await page.keyboard.press('Enter');
    assert.match(await page.$eval('#staffFeedbackDetailsTable', node => node.innerText), /New chairs delivered/);
    assert.match(await page.$eval('#staffFeedbackDetailsTable', node => node.innerText), /Farah Hassan/);
    assert.equal(await page.$$eval('#staffFeedbackDetailsTable tr', rows => rows.find(row => row.cells[0].textContent.trim() === 'Status').cells[1].textContent.trim()), 'Responded');
    assert.equal(await page.$eval('#staffFeedbackDetailsTable tr:last-child td:last-child', node => node.textContent.trim()), 'No attachments');
    await page.click('#staffFeedbackCloseDetails');
    assert.equal(await page.evaluate(() => document.activeElement.matches('.staff-feedback-card:nth-child(2) .staff-feedback-details-trigger')), true);
    await page.$eval('.staff-feedback-card:nth-child(3) .staff-feedback-details-trigger', node => node.focus());
    await page.keyboard.press('Space');
    assert.match(await page.$eval('#staffFeedbackDetailsTable', node => node.innerText), /Yee seong liew/);
    assert.match(await page.$eval('#staffFeedbackDetailsTable', node => node.innerText), /Add earlier shifts/);
    assert.equal(await page.$eval('#staffFeedbackDetailsTable tr:nth-child(11) td:last-child', node => node.textContent.trim()), '—', 'Missing review data clears previous record values');
    await page.keyboard.press('Escape');
    await apply({ staffFeedbackStartDate: '2026-09-18', staffFeedbackEndDate: '2026-09-18' });
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '2', 'Date boundaries are inclusive');
    await apply({ staffFeedbackStartDate: '2026-10-05', staffFeedbackEndDate: '2026-09-02' });
    assert.equal(await page.$eval('#staffFeedbackFilterOverlay', node => node.hidden), false, 'Invalid date range keeps filter open');
    assert.equal(await page.$eval('#staffFeedbackFilterError', node => node.hidden), false);
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '2', 'Validation leaves applied filters unchanged');
    await page.keyboard.press('Escape');
    await reset();
    await apply({ staffFeedbackKeyword: 'no matching employee' });
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '0');
    assert.equal(await page.$eval('#staffFeedbackEmpty', node => node.hidden), false);
    await page.click('#staffFeedbackViewChart');
    assert.equal(await page.$eval('#staffFeedbackChartEmpty', node => node.hidden), false);
    await page.keyboard.press('Escape');
    await reset();
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '4');
    await apply({ staffFeedbackKeyword: '#004177', staffFeedbackType: 'Suggestion', staffFeedbackCategory: 'Policy', staffFeedbackStatus: 'Pending' });
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '1');
    await navigate('.staff-feedback-review-button');
    await page.select('#staffFeedbackReward', 'No Reward');
    await page.select('#staffFeedbackRating', '3');
    await navigate('#staffFeedbackSubmitReview');
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '0', 'A reviewed record leaves a Pending-only result set');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'staffFeedbackFilterTrigger', 'Focus falls back to Filter when saving removes the only visible card');
    await reset();
    assert.equal(await page.$eval('#staffFeedbackTotal', node => node.textContent), '4');
    assert.equal(await page.$('.staff-feedback-card img'), null, 'Feedback titles are rendered as text');
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Feedback history cards, clicked record details, all detail fields, safe attachments, zero and missing values, keyboard access, 60 records, six filters, charts, dates, responsive themes and focus restoration.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
