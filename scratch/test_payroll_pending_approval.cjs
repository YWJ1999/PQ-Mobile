const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;
async function fill(page, selector, value) {
  await page.$eval(selector, (input, next) => {
    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function snapshot(page, name) {
  await page.mouse.move(0, 0);
  await page.$eval('.payroll-pending-content', node => { node.scrollTop = 0; });
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.constructor.name === 'CSSTransition').map(animation => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: path.join(__dirname, name + '.png') });
}
async function checkDetailsPopup(page, theme, category) {
  const selector = '#payrollPendingDetails';
  const before = await page.evaluate(() => ({ url: location.href, decisions: localStorage.getItem('pq_payroll_pending_decisions') }));
  const expectedActions = category === 'deduction' ? ['Approve', 'Reject'] : ['Approve', 'Resubmit', 'Cancel', 'Reject'];
  assert.deepEqual(await page.$$eval(`${selector} footer button`, nodes => nodes.map(node => node.textContent.trim())), expectedActions);
  for (const width of [360, 390, 450]) {
    await page.setViewport({ width, height: 950 });
    await snapshot(page, `payroll_pending_${category}_popup_${theme}_${width}`);
    const layout = await page.$eval(`${selector} [role="dialog"]`, panel => {
      const rect = panel.getBoundingClientRect();
      const phone = panel.closest('.phone-container').getBoundingClientRect();
      return {
        centered: Math.abs((rect.top + rect.bottom) / 2 - (phone.top + phone.bottom) / 2 + 39) < 2,
        inset: rect.left > phone.left + 8 && rect.right < phone.right - 8 && rect.top > phone.top + 8 && rect.bottom < phone.bottom - 8,
        rounded: parseFloat(getComputedStyle(panel).borderBottomLeftRadius) > 0,
        buttonsFit: [...panel.querySelectorAll('footer button')].every(button => button.scrollWidth <= button.clientWidth + 1),
        colors: [...panel.querySelectorAll('footer button')].map(button => getComputedStyle(button).backgroundColor)
      };
    });
    assert.ok(layout.centered && layout.inset && layout.rounded, 'View Details must use the reference popup position above the bottom navigation');
    assert.ok(layout.buttonsFit, 'Popup actions must fit on mobile');
    assert.deepEqual(layout.colors, Array(expectedActions.length).fill('rgb(124, 58, 237)'));
  }
  await page.setViewport({ width: 360, height: 720 });
  const scrollLayout = await page.$eval(`${selector} [role="dialog"]`, panel => {
    const body = panel.querySelector('.payroll-approval-details-body');
    body.scrollTop = body.scrollHeight;
    const bodyRect = body.getBoundingClientRect();
    const lastRow = body.querySelector('tr:last-child').getBoundingClientRect();
    const footer = panel.querySelector('footer').getBoundingClientRect();
    const phone = panel.closest('.phone-container').getBoundingClientRect();
    return { lastRowVisible: lastRow.top >= bodyRect.top && lastRow.bottom <= bodyRect.bottom + 1, footerVisible: footer.top >= bodyRect.bottom - 1 && footer.bottom <= phone.bottom - 8 };
  });
  assert.ok(scrollLayout.lastRowVisible && scrollLayout.footerVisible, 'Short screens must scroll to the final detail row while keeping all popup actions visible');
  await page.click(category === 'deduction' ? `${selector} .payroll-approval-close` : `${selector} .action-btn-cancel`);
  assert.equal(await page.$eval(selector, node => node.hidden), true);
  assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 10, 'Cancel must keep the request pending');
  assert.deepEqual(await page.evaluate(() => ({ url: location.href, decisions: localStorage.getItem('pq_payroll_pending_decisions') })), before, 'Cancel must close details without navigating or saving an approval decision');
  assert.equal(await page.$eval('.payroll-pending-content', node => node.inert), false);
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('three-dots-btn')), true);
  await page.setViewport({ width: 450, height: 950 });
}
async function checkWorkflow(page, theme, category, references) {
  const before = await page.evaluate(() => ({ url: location.href, decisions: localStorage.getItem('pq_payroll_pending_decisions'), count: window.PayrollPendingStore.getPending().length }));
  for (const [index, reference] of references.entries()) {
    await page.click(`[data-item-id="${reference}"] .three-dots-btn`);
    assert.deepEqual(await page.$$eval('#payrollPendingMenu .payroll-approval-menu-option', nodes => nodes.map(node => node.textContent.trim())), ['View Details', 'View Workflow']);
    await page.click('#payrollPendingViewWorkflow');
    assert.equal(await page.$eval('#payrollPendingMenu', node => node.hidden), true);
    assert.equal(await page.$eval('#payrollPendingWorkflow', node => node.hidden), false);
    const request = await page.evaluate(id => {
      const item = window.PayrollPendingStore.getPending().find(record => record.id === id);
      const [year, month, day] = (item.submitDate || item.requestDate).split('-');
      return { name: item.employeeName, empNo: item.empNo, date: `${day}/${month}/${year}` };
    }, reference);
    assert.equal(await page.$eval('#payrollPendingWorkflowTitle', node => node.textContent), `${category === 'tax' ? 'Tax Relief' : 'Deduction Request'} Workflow`);
    const workflowCopy = await page.$eval('#payrollPendingWorkflow', node => node.textContent);
    for (const value of [reference, request.name, '#' + request.empNo, request.date, 'Request Submitted', 'Payroll Approval', 'Awaiting Approval', 'Audit History']) assert.ok(workflowCopy.includes(value), value);
    assert.equal(await page.$eval('#payrollPendingWorkflowRequest .employee-name', node => node.nextElementSibling.classList.contains('employee-id')), true);
    assert.equal(await page.$$eval('#payrollPendingWorkflowAudit > li', nodes => nodes.length), 1, 'The audit history must use supplied submission data');
    if (index === 0) {
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        await snapshot(page, `payroll_pending_workflow_${category}_${theme}_${width}`);
        assert.equal(await page.$eval('#payrollPendingWorkflow [role="dialog"]', node => node.scrollWidth > node.clientWidth + 1), false);
        assert.equal(await page.$eval('.payroll-approval-workflow-body', node => node.scrollWidth > node.clientWidth + 1), false);
      }
      await page.setViewport({ width: 360, height: 720 });
      assert.equal(await page.$eval('#payrollPendingWorkflow .payroll-approval-workflow-footer button', node => {
        const rect = node.getBoundingClientRect();
        const phone = node.closest('.phone-container').getBoundingClientRect();
        return rect.top >= phone.top && rect.bottom <= phone.bottom;
      }), true, 'The workflow close button must stay visible on shorter phones');
      await page.focus('#payrollPendingWorkflow .payroll-approval-close');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.$eval('#payrollPendingWorkflow .payroll-approval-workflow-footer button', node => node === document.activeElement), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.$eval('#payrollPendingWorkflow .payroll-approval-close', node => node === document.activeElement), true);
      await page.click('#payrollPendingWorkflow .payroll-approval-workflow-footer button');
    } else {
      await page.keyboard.press('Escape');
    }
    assert.equal(await page.$eval('#payrollPendingWorkflow', node => node.hidden), true);
    assert.equal(await page.$eval('.payroll-pending-content', node => node.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.closest('.approval-request-card')?.dataset.itemId), reference);
    await page.setViewport({ width: 450, height: 950 });
  }
  assert.deepEqual(await page.evaluate(() => ({ url: location.href, decisions: localStorage.getItem('pq_payroll_pending_decisions'), count: window.PayrollPendingStore.getPending().length })), before, 'Viewing workflow must keep requests and approval decisions unchanged');
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const theme of ['dark', 'light']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const faults = [];
      page.on('pageerror', error => faults.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url('modules/payroll/index.html') + '?scope=team&theme=' + theme, { waitUntil: 'domcontentloaded' });
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#teamPendingApprovalCard')]);
      assert.ok(page.url().includes('/payroll/options/pending-approval.html'), 'Payroll Team must open the new Pending Approval page');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(await page.$$eval('[data-payroll-tab]', nodes => nodes.map(node => node.textContent.trim())), ['Tax Relief', 'Deduction Request']);
      assert.equal(await page.$$eval('#payrollPendingQueue .approval-request-card', nodes => nodes.length), 10);
      const firstTax = await page.$eval('#payrollPendingQueue .approval-request-card', node => node.textContent);
      for (const text of ['James yong xian', '#99104', 'TXR01', 'MEDICAL EXPENSES OF PARENTS', 'for parent', '06/09/2024', 'RM 500.00', 'Process', 'No']) assert.ok(firstTax.includes(text), text);
      assert.equal(firstTax.includes('Reference #'), false, 'Tax Relief cards must not show a reference field');
      assert.equal(firstTax.includes('RBT000000000032'), false, 'Tax Relief cards must keep their reference internal');
      assert.equal(await page.$('.payroll-approval-reference'), null);
      assert.equal(/Payroll Period|Payroll Cycle/.test(firstTax), false, 'Tax cards must keep the requested compact fields');
      assert.equal(await page.$eval('.employee-name', node => node.nextElementSibling.classList.contains('employee-id')), true);
      const actionColors = await page.$$eval('.approval-request-card:first-child .pending-action-grid button', nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
      assert.equal(new Set(actionColors).size, 1);
      assert.equal(actionColors[0], 'rgb(124, 58, 237)');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.some(node => node.scrollWidth > node.clientWidth + 1)), false);
        await snapshot(page, `payroll_pending_tax_${theme}_${width}`);
      }
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      assert.equal(await page.$eval('#payrollPendingDetailsTitle', node => node.textContent), 'Tax Relief Detail');
      await checkDetailsPopup(page, theme, 'tax');
      await checkWorkflow(page, theme, 'tax', ['RBT000000000032', 'RBT000000000035']);
      await page.click('[data-item-id="RBT000000000039"] .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      const fullTaxDetail = await page.$eval('#payrollPendingDetailsTable', table => Object.fromEntries([...table.rows].map(row => [row.cells[0].textContent, row.cells[1].textContent])));
      for (const label of ['Reference #', 'Name', 'Emp #', 'Status', 'Submit Date', 'Rebate Item', 'Transaction Date', 'Description', 'Receipt #', 'Amount', 'Process', 'Period', 'Cycle', 'Approval Date', 'Approver Remarks', 'Attachments']) assert.ok(Object.hasOwn(fullTaxDetail, label), `Missing original Tax Relief detail: ${label}`);
      assert.equal(fullTaxDetail['Reference #'], 'RBT000000000039');
      assert.equal(fullTaxDetail['Receipt #'], '-');
      assert.equal(fullTaxDetail['Approval Date'], '1 Jan 1');
      assert.equal(fullTaxDetail['Approver Remarks'], 'Reason required');
      assert.equal(fullTaxDetail.Attachments, 'Invoice.docx');
      assert.equal(await page.$eval('#payrollPendingDetailsTable tr:last-child th', node => node.textContent), 'Attachments');
      assert.equal(await page.$$eval('.payroll-approval-details-header button', nodes => nodes.length), 1, 'The reference popup has a title and one close button');
      assert.equal(await page.$('.payroll-approval-details-body h3'), null, 'The reference popup starts directly with its detail table');
      await page.setViewport({ width: 390, height: 950 });
      await snapshot(page, `payroll_pending_original_tax_details_${theme}`);
      await page.click('#payrollPendingDetails .action-btn-cancel');
      await page.setViewport({ width: 450, height: 950 });
      await page.click('#payrollPendingFilterTrigger');
      assert.deepEqual(await page.$$eval('#payrollPendingFilter .approval-filter-fields > label, #payrollPendingFilter .approval-filter-date-row:not([data-custom-days]) label', nodes => nodes.map(node => node.textContent)), ['Search Keyword', 'Start Date', 'End Date', 'Outstanding Days']);
      await snapshot(page, `payroll_pending_filter_${theme}`);
      await fill(page, '#payrollPendingFilter-keyword', 'James');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 1);
      await page.click('#payrollPendingFilterTrigger');
      await page.click('#payrollPendingFilter [data-action="reset"]');
      await fill(page, '#payrollPendingFilter-startDate', '2026-03-19');
      await fill(page, '#payrollPendingFilter-endDate', '2026-03-19');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 2, 'Tax date filter uses transaction dates');
      await page.click('#payrollPendingFilterTrigger');
      await page.click('#payrollPendingFilter [data-action="reset"]');
      await fill(page, '#payrollPendingFilter-startDate', '2026-10-03');
      await fill(page, '#payrollPendingFilter-endDate', '2026-10-02');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      assert.equal(await page.$eval('#payrollPendingFilter', node => node.hidden), false);
      assert.match(await page.$eval('#payrollPendingFilter .approval-filter-error', node => node.textContent), /End Date/);
      await page.click('#payrollPendingFilter [data-action="reset"]');
      await page.select('#payrollPendingFilter-days', 'custom');
      await fill(page, '#payrollPendingFilter-minDays', '0');
      await fill(page, '#payrollPendingFilter-maxDays', '0');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 0);
      await page.click('#payrollPendingFilterTrigger');
      await page.click('#payrollPendingFilter [data-action="reset"]');
      await page.keyboard.press('Escape');

      await page.click('[data-payroll-tab="deduction"]');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 10);
      const firstDeduction = await page.$eval('.approval-request-card', node => node.textContent);
      for (const text of ['#EBB12', 'HUMAN RESOURCE', '+ UNIFORM ALLOWANCE', 'Start Allowance', '01/07/2025', '31/07/2025', '31.00', 'RM 0.00', '202507', 'MONTH END', '03/07/2025']) assert.ok(firstDeduction.includes(text), text);
      assert.equal(firstDeduction.includes('Reference #'), false, 'Deduction Request cards must not show a reference field');
      assert.equal(firstDeduction.includes('PDR000000000062'), false, 'Deduction Request cards must keep their reference internal');
      assert.equal(await page.$('.payroll-approval-reference'), null);
      assert.deepEqual(await page.$$eval('.approval-request-card:first-child .pending-action-grid button', nodes => nodes.map(node => node.textContent.trim())), ['Reject', 'Approve']);
      await page.click('#payrollPendingSelectAll');
      assert.deepEqual(await page.$$eval('#payrollPendingBulk button', nodes => nodes.map(node => node.textContent.trim())), ['Reject', 'Approve']);
      await page.click('#payrollPendingSelectAll');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        await snapshot(page, `payroll_pending_deduction_${theme}_${width}`);
      }
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      assert.equal(await page.$eval('#payrollPendingDetailsTitle', node => node.textContent), 'Deduction Request Detail');
      const deductionRows = await page.$eval('#payrollPendingDetailsTable', table => [...table.rows].map(row => [row.cells[0].textContent, row.cells[1].textContent]));
      assert.deepEqual(deductionRows.map(([label]) => label), ['Document Reference', 'Document Status', 'Employee', 'Deduction Type', 'Request Type', 'Stop Period', 'Stop Date', 'Stop Cycle', 'Account #', 'Remarks', 'Attachment', 'Approver Action Comments']);
      const deductionDetail = Object.fromEntries(deductionRows);
      assert.equal(deductionDetail['Document Reference'], 'PDR000000000062');
      assert.equal(deductionDetail['Document Status'], 'Submitted');
      assert.ok(deductionDetail.Employee.includes('Farhan binti rahmat') && deductionDetail.Employee.includes('#EBB12'));
      assert.equal(await page.$eval('#payrollPendingDetailsTable .employee-name', node => node.nextElementSibling.classList.contains('employee-id')), true);
      for (const label of ['Stop Period', 'Stop Date', 'Stop Cycle', 'Account #', 'Remarks', 'Attachment']) assert.equal(deductionDetail[label], '-', `${label}: missing values must remain unknown rather than being copied from different fields`);
      assert.equal(await page.$eval('#payrollPendingApproverComments', node => node.tagName), 'TEXTAREA');
      await snapshot(page, `payroll_pending_details_${theme}`);
      await checkDetailsPopup(page, theme, 'deduction');
      await checkWorkflow(page, theme, 'deduction', ['PDR000000000062', 'PDR000000000063']);
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      await page.keyboard.press('Escape');
      await page.click('#payrollPendingFilterTrigger');
      await fill(page, '#payrollPendingFilter-startDate', '2025-07-08');
      await fill(page, '#payrollPendingFilter-endDate', '2025-07-08');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 1, 'Deduction date filtering must overlap the requested date range');
      await page.click('#payrollPendingFilterTrigger');
      await page.click('#payrollPendingFilter [data-action="reset"]');
      await page.keyboard.press('Escape');
      for (const [action, count] of [['approve', 9], ['reject', 8]]) {
        await page.click('.approval-request-card .three-dots-btn');
        await page.click('#payrollPendingViewDetails');
        await fill(page, '#payrollPendingApproverComments', `  Reviewed deduction: ${action}  `);
        await page.focus('#payrollPendingDetails [data-payroll-action="reject"]');
        await page.keyboard.press('Tab');
        assert.equal(await page.$eval('#payrollPendingDetails .payroll-approval-close', node => node === document.activeElement), true, 'Popup focus must wrap around visible controls');
        await page.keyboard.press('Tab');
        assert.equal(await page.$eval('#payrollPendingApproverComments', node => node === document.activeElement), true, 'The comments field must be part of the popup focus order');
        await page.click(`#payrollPendingDetails [data-payroll-action="${action}"]`);
        assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), count);
        assert.equal(await page.$eval('#payrollPendingDetails', node => node.hidden), true);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_payroll_pending_decisions')).at(-1));
        assert.equal(saved.action, action);
        assert.equal(saved.approverActionComments, `Reviewed deduction: ${action}`);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('[data-payroll-tab="deduction"]', node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 8);
      await page.click('[data-payroll-tab="tax"]');
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      assert.deepEqual(await page.$$eval('#payrollPendingDetails footer button', nodes => nodes.map(node => node.textContent.trim())), ['Approve', 'Resubmit', 'Cancel', 'Reject']);
      assert.equal(await page.$('#payrollPendingApproverComments'), null);
      await page.click('#payrollPendingDetails .action-btn-cancel');
      await page.click('[data-item-id="RBT000000000035"] [data-payroll-action="resubmit"]');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 9);
      await page.click('#payrollPendingFilterTrigger');
      await fill(page, '#payrollPendingFilter-keyword', 'James');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      await page.click('#payrollPendingSelectAll');
      assert.equal(await page.$$eval('.approval-card-checkbox:checked', nodes => nodes.length), 1);
      await page.click('#payrollPendingBulk [data-payroll-action="approve"]');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 0);
      assert.equal(await page.$eval('#payrollPendingBulk', node => node.hidden), true);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#payrollPendingBack')]);
      assert.equal(await page.$eval('#scopeTeamSection', node => getComputedStyle(node).display), 'block');
      assert.equal(await page.$eval('#teamPendingApprovalCount', node => node.textContent), '16');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(faults, []);
      console.log(`${theme}: per-request workflow, both menu entries, mobile sheets, focus, details, approval buttons, comments and filters passed.`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
