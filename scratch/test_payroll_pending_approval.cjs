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
  if (!process.env.PAYROLL_SCREENSHOTS) return;
  await page.mouse.move(0, 0);
  await page.$eval('.payroll-pending-content', node => { node.scrollTop = 0; });
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.constructor.name === 'CSSTransition').map(animation => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: path.join(process.env.PAYROLL_SCREENSHOTS, name + '.png') });
}
async function checkDetailsPage(page, theme, category) {
  const root = '#payrollPendingDetails';
  const actions = category === 'deduction' ? ['Approve', 'Reject'] : ['Approve', 'Resubmit', 'Cancel', 'Reject'];
  assert.deepEqual(await page.$$eval(root + ' footer button', nodes => nodes.map(el => el.textContent.trim())), actions);
  assert.equal(await page.$('#payrollPendingForm :is(input, select, textarea, button, table)'), null);
  for (const width of [320, 390, 450]) {
    await page.setViewport({ width, height: 740 });
    assert.ok(await page.$eval(root, el => {
      const body = el.querySelector('.payroll-approval-details-body');
      body.scrollTop = body.scrollHeight;
      const footer = el.querySelector('footer').getBoundingClientRect();
      return body.scrollWidth <= body.clientWidth + 1 && footer.bottom <= el.getBoundingClientRect().bottom + 1 &&
        el.querySelector('textarea').getBoundingClientRect().bottom <= footer.top;
    }));
    await page.$eval('.payroll-approval-details-body', el => { el.scrollTop = 0; });
    await snapshot(page, `payroll_${category}_review_${theme}_${width}`);
  }
  await page.click(root + ' [data-approval-back]');
  await page.waitForSelector(root, {hidden: true});
  assert.equal(await page.$$eval('.approval-request-card', els => els.length), 10);
  await page.setViewport({ width: 450, height: 950 });
}
async function checkWorkflow(page, theme, category, references) {
  const before = await page.evaluate(() => ({ url: location.href, decisions: localStorage.getItem('pq_payroll_pending_decisions'), count: window.PayrollPendingStore.getPending().length }));
  for (const [index, reference] of references.entries()) {
    await page.$eval(`[data-item-id="${reference}"] .three-dots-btn`, el => el.click());
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
    for (const value of [reference, request.name, request.empNo, request.date, 'Request Submitted', 'Payroll Approval', 'Awaiting Approval', 'Audit History']) assert.ok(workflowCopy.includes(value), value);
    assert.equal(await page.$eval('#payrollPendingWorkflowRequest .employee-name', node => node.textContent), `${request.empNo} - ${request.name}`);
    assert.equal(await page.$$eval('#payrollPendingWorkflowAudit > li', nodes => nodes.length), 1, 'The audit history must use supplied submission data');
    if (index === 0) {
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        await snapshot(page, `payroll_pending_workflow_${category}_${theme}_${width}`);
        assert.equal(await page.$eval('#payrollPendingWorkflow .approval-record-layout', node => node.scrollWidth > node.clientWidth + 1), false);
        assert.equal(await page.$eval('.payroll-approval-workflow-body', node => node.scrollWidth > node.clientWidth + 1), false);
      }
      await page.setViewport({ width: 360, height: 720 });
      assert.equal(await page.$eval('#payrollPendingWorkflow .payroll-approval-workflow-footer button', node => {
        const rect = node.getBoundingClientRect();
        const phone = node.closest('.phone-container').getBoundingClientRect();
        return rect.top >= phone.top && rect.bottom <= phone.bottom;
      }), true, 'The workflow close button must stay visible on shorter phones');
      await page.click('#payrollPendingWorkflow .payroll-approval-workflow-footer button');
    } else {
      await page.click('#payrollPendingWorkflow [data-approval-back]');
    }
    await page.waitForSelector('#payrollPendingWorkflow', {hidden: true});
    assert.equal(await page.$eval('#payrollPendingWorkflow', node => node.hidden), true);
    assert.equal(await page.$eval('.payroll-pending-content', node => node.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.closest('.approval-request-card')?.dataset.itemId), reference);
    await page.setViewport({ width: 450, height: 950 });
  }
  assert.deepEqual(await page.evaluate(() => ({ url: location.href, decisions: localStorage.getItem('pq_payroll_pending_decisions'), count: window.PayrollPendingStore.getPending().length })), before, 'Viewing workflow must keep requests and approval decisions unchanged');
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN || puppeteer.executablePath() });
  try {
    for (const theme of ['dark', 'light']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setRequestInterception(true);
      page.on('request', req => /^https?:/.test(req.url()) ? req.abort() : req.continue());
      const faults = [];
      page.on('pageerror', error => faults.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url('modules/payroll/index.html') + '?scope=team&theme=' + theme, { waitUntil: 'domcontentloaded' });
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#teamPendingApprovalCard')]);
      await page.waitForSelector('.approval-request-card');
      assert.ok(page.url().includes('/payroll/options/pending-approval.html'), 'Payroll Team must open the new Pending Approval page');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(await page.$$eval('[data-payroll-tab]', nodes => nodes.map(node => node.textContent.trim())), ['Tax Relief', 'Deduction Request']);
      assert.equal(await page.$$eval('#payrollPendingQueue .approval-request-card', nodes => nodes.length), 10);
      const firstTax = await page.$eval('#payrollPendingQueue .approval-request-card', node => node.textContent);
      for (const text of ['James yong xian', '99104', 'TXR01', 'MEDICAL EXPENSES OF PARENTS', 'for parent', '06/09/2024', 'RM 500.00', 'Process', 'No']) assert.ok(firstTax.includes(text), text);
      assert.equal(firstTax.includes('Reference #'), false, 'Tax Relief cards must not show a reference field');
      assert.equal(firstTax.includes('RBT000000000032'), false, 'Tax Relief cards must keep their reference internal');
      assert.equal(await page.$('.payroll-approval-reference'), null);
      assert.equal(/Payroll Period|Payroll Cycle/.test(firstTax), false, 'Tax cards must keep the requested compact fields');
      assert.match(await page.$eval('.employee-name', node => node.textContent), /^[^\s#]+ - .+/);
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
      assert.equal(await page.$eval('#payrollPendingDetailsTitle', node => node.textContent), 'Tax Relief Approval');
      await checkDetailsPage(page, theme, 'tax');
      await checkWorkflow(page, theme, 'tax', ['RBT000000000032', 'RBT000000000035']);
      await page.click('[data-item-id="RBT000000000039"] .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      assert.equal(await page.$eval('[data-payroll-field="description"]', el => el.textContent), 'Medical Relief');
      assert.equal(await page.$eval('[data-payroll-field="receiptNo"]', el => el.textContent), '—');
      assert.equal(await page.$eval('#payrollPendingForm .payroll-file-name', el => el.textContent), 'Invoice.docx');
      await page.setViewport({ width: 390, height: 950 });
      await snapshot(page, `payroll_pending_original_tax_details_${theme}`);
      await page.click('#payrollPendingDetails .action-btn-cancel');
      await page.setViewport({ width: 450, height: 950 });
      await page.click('#payrollPendingFilterTrigger');
      assert.deepEqual(await page.$$eval('#payrollPendingFilter .approval-filter-fields > label, #payrollPendingFilter .approval-filter-date-row:not([data-custom-days]) label', nodes => nodes.map(node => node.textContent.toLowerCase())), ['search keyword', 'start date', 'end date', 'outstanding days']);
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
      assert.match(await page.$eval('#payrollPendingFilter .approval-filter-error', node => node.textContent), /End date/i);
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
      for (const text of ['EBB12', 'HUMAN RESOURCE', '+ UNIFORM ALLOWANCE', 'Start Allowance', '01/07/2025', '31/07/2025', '31.00', 'RM 0.00', '202507', 'MONTH END', '03/07/2025']) assert.ok(firstDeduction.includes(text), text);
      assert.equal(firstDeduction.includes('Reference #'), false, 'Deduction Request cards must not show a reference field');
      assert.equal(firstDeduction.includes('PDR000000000062'), false, 'Deduction Request cards must keep their reference internal');
      assert.equal(await page.$('.payroll-approval-reference'), null);
      assert.deepEqual(await page.$$eval('.approval-request-card:first-child .pending-action-grid button', nodes => nodes.map(node => node.textContent.trim())), ['Reject', 'Approve']);
      await page.click('#payrollPendingSelectAll');
      assert.deepEqual(await page.$$eval('#payrollPendingBulk button', nodes => nodes.map(node => node.textContent.trim())), ['Reject selected (10)', 'Approve selected (10)']);
      await page.click('#payrollPendingSelectAll');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
        await snapshot(page, `payroll_pending_deduction_${theme}_${width}`);
      }
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      assert.equal(await page.$eval('#payrollPendingDetailsTitle', node => node.textContent), 'Deduction Request Approval');
      assert.equal(await page.$eval('[data-payroll-field="requestType"]', el => el.textContent), 'Start Allowance');
      assert.equal(await page.$eval('[data-payroll-field="period"]', el => el.textContent), '202507');
      assert.equal(await page.$eval('[data-payroll-field="amount"]', el => el.textContent), 'RM 0.00');
      assert.equal(await page.$eval('[data-payroll-field="accountNo"]', el => el.textContent), '—');
      assert.equal(await page.$eval('#payrollPendingApproverComments', node => node.tagName), 'TEXTAREA');
      await snapshot(page, `payroll_pending_details_${theme}`);
      await checkDetailsPage(page, theme, 'deduction');
      await checkWorkflow(page, theme, 'deduction', ['PDR000000000062', 'PDR000000000063']);
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      await page.click('#payrollPendingDetails [data-approval-back]');
      await page.waitForSelector('#payrollPendingDetails', {hidden: true});
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
        await page.click(`#payrollPendingDetails [data-payroll-action="${action}"]`);
        await page.waitForSelector('#payrollPendingDetails', {hidden: true});
        assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), count);
        assert.equal(await page.$eval('#payrollPendingDetails', node => node.hidden), true);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pq_payroll_pending_decisions')).at(-1));
        assert.equal(saved.action, action);
        assert.equal(saved.approverActionComments, `Reviewed deduction: ${action}`);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.approval-request-card');
      assert.equal(await page.$eval('[data-payroll-tab="deduction"]', node => node.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 8);
      await page.click('[data-payroll-tab="tax"]');
      await page.click('.approval-request-card .three-dots-btn');
      await page.click('#payrollPendingViewDetails');
      assert.deepEqual(await page.$$eval('#payrollPendingDetails footer button', nodes => nodes.map(node => node.textContent.trim())), ['Approve', 'Resubmit', 'Cancel', 'Reject']);
      assert.ok(await page.$('#payrollPendingApproverComments'));
      await page.click('#payrollPendingDetails .action-btn-cancel');
      await page.waitForSelector('#payrollPendingDetails', {hidden: true});
      const resubmit = '[data-item-id="RBT000000000035"] [data-payroll-action="resubmit"]';
      await page.$eval(resubmit, button => button.scrollIntoView({block: 'center'}));
      await page.click(resubmit);
      await page.waitForSelector(resubmit, {hidden: true});
      assert.equal(await page.$$eval('.approval-request-card', nodes => nodes.length), 9);
      await page.click('#payrollPendingFilterTrigger');
      await fill(page, '#payrollPendingFilter-keyword', 'James');
      await page.click('#payrollPendingFilter .approval-filter-apply');
      await page.click('#payrollPendingSelectAll');
      assert.equal(await page.$$eval('.approval-card-checkbox:checked', nodes => nodes.length), 1);
      await page.click('#payrollPendingBulk [data-payroll-action="approve"]');
      await page.waitForSelector('.approval-request-card', {hidden: true});
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
