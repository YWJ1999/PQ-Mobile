const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const file = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/pending-approval.html')).href;

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    await page.goto(file, { waitUntil: 'domcontentloaded' });
    assert.deepEqual(await page.$$eval('#careerPendingTabs [role="tab"]', nodes => nodes.map(node => node.textContent)), ['CV Change Request', 'Staff Engagement'], 'Pending Approval exposes the new Staff Engagement tab');
    await page.click('[data-career-pending-type="Staff Engagement"]');
    assert.equal(await page.$eval('#careerPendingCount', node => node.textContent), '1', 'The sample engagement is visible without test injection');
    await page.click('.career-pending-review');
    assert.equal(await page.$eval('#careerPendingDetailsTable tr:last-child td', node => node.textContent), 'No attachments');

    // Exercise attachment handling and detailed values through the existing data boundary.
    await page.evaluateOnNewDocument(() => {
      let records;
      Object.defineProperty(window, 'EMPLOYEE_CAREER_PENDING_DATA', {
        get: () => records,
        set: value => { records = value.map(item => item.type !== 'Staff Engagement' ? item : {
          id: 'SEG-PENDING-001', reference: 'SEG-PENDING-001', type: 'Staff Engagement',
          employeeName: 'Aina Rahman', empNo: 'EBB01', position: 'People Operations Executive',
          submitDate: '2026-10-12', status: 'pending', approvalTitle: 'Staff Engagement Approval',
          interviewDate: '2026-10-12', positiveFeedback: 'Supportive team and clear responsibilities.',
          negativeFeedback: 'Limited opportunities for career progression.', flightRisk: 'Medium',
          recommendation: 'Manager Follow-up', mitigationAction: 'Agree a development plan within 30 days.',
          remarks: 'Discuss the development plan.',
          attachments: [{ name: 'Interview notes.pdf', url: 'https://example.com/interview-notes.pdf' }, { name: 'Unavailable file.pdf', url: 'javascript:alert(1)' }]
        }); }
      });
    });
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 844 });
      await page.goto(`${file}?scope=team&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#careerPendingCount', node => node.textContent), '1', 'Default tab contains only the CV request');
      await page.click('#careerPendingSelectAll');
      assert.equal(await page.$eval('#careerPendingSelectedCount', node => node.textContent), '1');
      await page.focus('[data-career-pending-type="CV Change Request"]');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval('[data-career-pending-type="Staff Engagement"]', node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('#careerPendingSelectedCount', node => node.textContent), '0', 'Switching types clears previous selections');
      assert.equal(await page.$eval('#careerPendingCount', node => node.textContent), '1');
      assert.deepEqual(await page.$$eval('#careerPendingQueue .employee-name', nodes => nodes.map(node => node.textContent)), ['Aina Rahman']);
      assert.ok(await page.$eval('#careerPendingQueue .employee-name', node => node.nextElementSibling.textContent === '#EBB01'));
      assert.deepEqual(await page.$$eval('#careerPendingQueue .approval-card-details > div', nodes => nodes.map(node => [node.querySelector('dt').textContent, node.querySelector('dd').textContent])), [['Interview Date', '12/10/2026'], ['Position', 'People Operations Executive']], 'Engagement cards show interview date and position');
      assert.equal(await page.$('#careerPendingQueue .payroll-approval-card-header .career-pending-note'), null, 'Position appears once in the card body');
      assert.ok(await page.$eval('#careerPendingPanel', node => node.getAttribute('aria-labelledby') === document.querySelector('#careerPendingTabs [aria-selected="true"]').id));
      await page.screenshot({ path: path.join(__dirname, `employee-career-pending-engagement-${theme}-${width}.png`) });
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('[data-career-pending-type="Staff Engagement"]', node => node.getAttribute('aria-selected')), 'true', 'Reload retains the selected request tab');
      await page.click('.three-dots-btn');
      await page.click('#careerPendingViewDetails');
      assert.equal(await page.$eval('#careerPendingDetailsTitle', node => node.textContent), 'Staff Engagement Approval');
      assert.equal(await page.$eval('#careerPendingDetails', node => node.classList.contains('detail-popout-overlay')), true, 'Engagement uses the shared Leave Approval detail design');
      assert.equal(await page.$('#careerPendingDetails .career-pending-general-heading'), null);
      assert.equal(await page.$eval('#careerPendingDetails .detail-popout-subtitle', node => node.textContent), 'Review staff engagement details');
      assert.deepEqual(await page.$$eval('#careerPendingDetailsActions button', nodes => nodes.map(node => node.textContent)), ['Approve', 'Resubmit', 'Cancel', 'Reject']);
      assert.deepEqual(await page.$$eval('#careerPendingDetailsTable th', nodes => nodes.map(node => node.textContent)), ['Employee #', 'Name', 'Position', 'Interview Date', 'Positive Feedback', 'Negative Feedback', 'Flight Risk', 'Recommendation', 'Mitigation Action', 'Remarks', 'Attachment']);
      assert.deepEqual(await page.$$eval('#careerPendingDetailsTable td', nodes => nodes.slice(0, 10).map(node => node.textContent)), ['#EBB01', 'Aina Rahman', 'People Operations Executive', '12/10/2026', 'Supportive team and clear responsibilities.', 'Limited opportunities for career progression.', 'Medium', 'Manager Follow-up', 'Agree a development plan within 30 days.', 'Discuss the development plan.']);
      assert.ok(await page.$eval('#careerPendingDetailsTable', node => node.textContent.includes('Manager Follow-up') && node.textContent.includes('Discuss the development plan.')));
      assert.equal(await page.$eval('#careerPendingDetailsTable a', node => node.href), 'https://example.com/interview-notes.pdf');
      assert.equal(await page.$$eval('#careerPendingDetailsTable a', nodes => nodes.length), 1, 'Unsafe attachment URLs remain plain text');
      assert.ok(await page.$eval('#careerPendingComments', node => Boolean(document.querySelector('#careerPendingDetailsTable').compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)), 'Approver Remarks follows the details table');
      assert.equal(await page.$$eval('#careerPendingDetails .payroll-approval-details-body input, #careerPendingDetails .payroll-approval-details-body select, #careerPendingDetails .payroll-approval-details-body textarea', nodes => nodes.length), 1, 'Only approver remarks is editable');
      assert.equal(await page.$eval('#careerPendingDetails .payroll-approval-details-body', node => getComputedStyle(node).overflowY), 'auto', 'Engagement detail fields remain scrollable');
      const layout = await page.$eval('#careerPendingDetails', overlay => {
        const panel = overlay.querySelector('[role="dialog"]');
        const header = panel.querySelector('.detail-popout-header');
        const body = panel.querySelector('.detail-popout-body');
        const footer = panel.querySelector('.detail-popout-footer');
        const label = body.querySelector('th'), value = body.querySelector('td');
        const box = panel.getBoundingClientRect(), parent = overlay.getBoundingClientRect();
        return { inset: box.top > parent.top && box.bottom < parent.bottom, radius: getComputedStyle(panel).borderRadius, headerHeight: header.getBoundingClientRect().height,
          labelBackground: getComputedStyle(label).backgroundColor, valueBackground: getComputedStyle(value).backgroundColor,
          footerBelowBody: footer.getBoundingClientRect().top >= body.getBoundingClientRect().bottom - 1,
          noOverflow: panel.scrollWidth <= panel.clientWidth + 1,
          handle: getComputedStyle(header, '::before').content };
      });
      assert.ok(layout.inset && layout.footerBelowBody && layout.noOverflow, 'Inset modal keeps its footer outside the scroll area');
      assert.equal(layout.radius, '18px');
      assert.equal(layout.headerHeight, 50);
      assert.equal(layout.handle, 'none', 'Shared approval header has no bottom-sheet handle');
      assert.notEqual(layout.labelBackground, layout.valueBackground, 'Labels use the same contrasting surface as Leave Approval');
      await page.type('#careerPendingComments', 'Unsubmitted draft');
      await page.click('#careerPendingDetails [data-close-career-sheet].action-btn-cancel');
      assert.equal(await page.$eval('#careerPendingDetails', node => node.hidden), true);
      assert.equal(await page.$eval('#careerPendingCount', node => node.textContent), '1', 'Cancel leaves the engagement pending');
      await page.click('.career-pending-review');
      assert.equal(await page.$eval('#careerPendingComments', node => node.value), '', 'Cancel discards the unsubmitted remark');
      await page.type('#careerPendingComments', 'Reviewed the engagement.');
      await page.evaluate(() => window.addEventListener('employee-career-approval-change', event => { window.lastApproval = event.detail; }));
      await page.screenshot({ path: path.join(__dirname, `employee-career-pending-engagement-details-${theme}-${width}.png`) });
      await page.click('#careerPendingDetails [data-career-approval-action="approve"]');
      assert.equal(await page.evaluate(() => window.lastApproval.records[0].approverRemarks), 'Reviewed the engagement.', 'Approval includes the approver remarks');
      assert.equal(await page.$eval('#careerPendingCount', node => node.textContent), '0');
      assert.equal(await page.$eval('#careerPendingEmpty', node => node.hidden), false, 'Approving the last engagement shows the empty state');
      await page.click('[data-career-pending-type="CV Change Request"]');
      assert.equal(await page.$eval('#careerPendingCount', node => node.textContent), '1', 'Engagement approval leaves the CV request pending');
      await page.click('.career-pending-review');
      assert.equal(await page.$eval('#careerPendingDetails', node => node.classList.contains('detail-popout-overlay')), false, 'Switching to CV restores its existing detail presentation');
      assert.equal(await page.$$eval('#careerPendingDetails [data-cv-tab]', nodes => nodes.length), 5);
      await page.click('#careerPendingDetails [data-close-career-sheet]');
      await page.focus('[data-career-pending-type="CV Change Request"]');
      await page.keyboard.press('End');
      assert.equal(await page.$eval('[data-career-pending-type="Staff Engagement"]', node => node.getAttribute('aria-selected')), 'true');
      await page.keyboard.press('Home');
      assert.equal(await page.$eval('[data-career-pending-type="CV Change Request"]', node => node.getAttribute('aria-selected')), 'true');
      assert.ok(await page.$eval('.phone-container', node => node.scrollWidth <= node.clientWidth + 1));
    }
    assert.deepEqual(errors, [], 'No browser JavaScript errors');
    console.log('PASS: Engagement approval tab, filtering by type, empty state, keyboard, isolated actions, selection, reload, details, themes and 360/420px layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
