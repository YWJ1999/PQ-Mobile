const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const fills = {
  pending: 'rgb(179, 90, 13)',
  submitted: 'rgb(34, 129, 86)',
  approved: 'rgb(34, 129, 86)',
  cancelled: 'rgb(107, 114, 128)',
  resubmit: 'rgb(46, 109, 202)',
  draft: 'rgb(46, 109, 202)',
  rejected: 'rgb(220, 38, 38)'
};

async function checkBadge(page, container, status, label) {
  const selector = container + ' .record-detail-status';
  await page.waitForSelector(selector, { visible: true, timeout: 5000 });
  const badge = await page.$eval(selector, el => {
    const style = getComputedStyle(el);
    const icon = el.querySelector('i[aria-hidden="true"]');
    return {
      label: el.textContent.trim(),
      status: el.dataset.status,
      fill: style.backgroundColor,
      image: style.backgroundImage,
      ink: style.color,
      icon: icon && getComputedStyle(icon).color
    };
  });
  const white = 'rgb(255, 255, 255)';
  assert.deepEqual(badge, { label, status, fill: fills[status], image: 'none', ink: white, icon: white }, page.url() + ' ' + container);
  assert.equal(await page.$('.history-card-header .record-detail-status, .approval-card-header .record-detail-status, button.record-detail-status'), null);
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: theme === 'light' ? 390 : 360, height: 850 });
      const open = async (file, params = {}) => {
        const url = pathToFileURL(path.resolve(__dirname, '..', file));
        url.search = new URLSearchParams({ ...params, theme }).toString();
        await page.goto(url.href, { waitUntil: 'load' });
      };
      const click = selector => page.$eval(selector, el => el.click());
      const label = selector => page.$eval(selector, el => el.textContent.trim());

      await open('modules/employee-career/options/history.html', { category: 'feedback' });
      await click('.career-history-card-open');
      await checkBadge(page, '#historyDetailBody', 'pending', 'Pending');

      await open('modules/employee-career/options/team/staff-feedback.html');
      await click('.staff-feedback-details-trigger');
      await checkBadge(page, '#staffFeedbackDetailsTable', 'pending', 'Pending');

      for (const [category, id] of [['guest-visit', 'sample-guest-0001'], ['inventory-request', 'sample-inventory-0064']]) {
        await open('modules/admin/options/history.html', { category });
        const card = '[data-record-id="' + id + '"]';
        assert.equal(await label(card + ' .status-pill'), 'Pending');
        assert.equal(await label('#historyStatus [value="submitted"]'), 'Pending');
        await click(card + ' .history-card-main');
        await checkBadge(page, '#historyDetailBody', 'pending', 'Pending');
        assert.equal(await label('#historyDetailActions button'), 'Cancel');
      }

      await open('leave.html');
      await page.evaluate(() => { showLeaveSection('viewMyLeaveHistory'); switchHistoryTab('leave'); });
      for (const [ref, key, label] of [
        ['LV-2026-0052', 'pending', 'Pending'],
        ['LV-2026-0041', 'approved', 'Approved'],
        ['LV-2026-0032', 'rejected', 'Rejected'],
        ['LV-2026-0055', 'draft', 'Draft']
      ]) {
        await page.evaluate(ref => openHistoryDetailsModal(ref), ref);
        await checkBadge(page, '#historyDetailsTableBody', key, label);
      }

      await open('modules/claims/options/history.html');
      for (const tab of ['benefit', 'medical', 'ot', 'travel', 'travelRequest', 'entertainment', 'advance', 'expense']) {
        const record = await page.evaluate(tab => {
          switchClaimTab(tab);
          const records = HISTORY_DATA[tab];
          const record = records.find(item => item.status === 'submitted') || records.find(item => item.status === 'pending') || records[0];
          const card = [...document.querySelectorAll('#claimHistoryListContainer .history-card-item')].find(card => card.querySelector('.history-card-ref').textContent.includes(record.id));
          const header = card.querySelector('.status-pill').textContent.trim();
          card.click();
          const key = record.status === 'submitted' ? 'pending' : record.status;
          const label = record.status === 'submitted' ? 'Pending' : record.statusText || key[0].toUpperCase() + key.slice(1);
          return { key, label, header };
        }, tab);
        assert.equal(record.header, record.label, 'Claim history card: ' + tab);
        await checkBadge(page, '#claimDetailsModalContainer', record.key, record.label);
      }

      await open('modules/claims/options/pending-approval.html');
      assert.equal(await label('pending-approval-card[doc-status="Submitted"] .approval-header-status'), 'Pending');
      await page.evaluate(() => window.ClaimsEngine.triggerClaimViewDetails('1'));
      await checkBadge(page, '#claimDetailsModalOverlay', 'pending', 'Pending');

      await open('modules/project-task/options/history.html');
      assert.equal(await label('#workPlanHistoryList [data-record-id="WP-2026-0048"] .project-history-status-badge'), 'Pending');
      await click('#workPlanHistoryList [data-record-id="WP-2026-0048"]');
      await checkBadge(page, '#projectHistoryDetailContent', 'pending', 'Pending');

      for (const [module, actions, body, key, label] of [
        ['admin', ['.three-dots-btn', '#workplacePendingViewDetails'], '#workplaceApprovalDetails', 'pending', 'Pending'],
        ['payroll', ['.three-dots-btn', '#payrollPendingViewDetails'], '#payrollPendingDetailsTable', 'pending', 'Pending'],
        ['employee-career', ['.career-pending-review'], '#careerPendingDetails', 'pending', 'Pending'],
        ['project-task', ['[data-project-approval-menu]', '#projectApprovalViewDetails'], '#projectApprovalDetailDocumentStatus', 'pending', 'Pending'],
        ['performance', ['.three-dots-btn', '#performanceApprovalViewDetails'], '#approvalDetailsBody', 'pending', 'Pending Approval']
      ]) {
        await open('modules/' + module + '/options/pending-approval.html');
        for (const action of actions) await click(action);
        await checkBadge(page, body, key, label);
        if (module === 'admin') {
          await click('#workplaceApprovalDetails [data-close-workplace-approval]');
          await click('.three-dots-btn');
          await click('#workplacePendingViewWorkflow');
          await checkBadge(page, '#workplaceApprovalWorkflowBody .payroll-approval-workflow-step', 'submitted', 'Submitted');
        }
      }

      await open('modules/performance/options/performance-evaluation-form.html', { evaluation: 'PE-2026-0012' });
      for (const [key, label] of [['resubmit', 'Resubmit'], ['approved', 'Approved'], ['cancelled', 'Cancelled']]) {
        await click('[data-evaluation-decision="' + label + '"]');
        await checkBadge(page, '#evaluationStatus', key, label);
        assert.equal(await page.$eval('#evaluationStatus', el => el.value), label);
        assert.equal(await page.evaluate(() => PerformanceEvaluationStore.all().find(r => r.id === 'PE-2026-0012').status), label);
      }

      await open('modules/attendance/options/history.html');
      for (const [key, label] of [['pending', 'Pending Review'], ['resubmit', 'To Resubmit'], ['approved', 'Approved'], ['cancelled', 'Cancelled']]) {
        await page.evaluate(label => openFeedbackDetailsModal('TEST', label, 'EBB12 - Employee', 'Branch', 'Department', '14 Sep 2026', 'Shift', 'EBB12 - Submitter', '14/09/2026', ''), label);
        await checkBadge(page, '#modalFbkDocStatus', key, label);
        assert.equal(await page.$$eval('#modalFbkDocStatus .record-detail-status', nodes => nodes.length), 1);
      }

      await open('modules/training-competency/options/training-request-details.html', { request: 'microsoft-365-productivity', date: '2026-10-20' });
      await checkBadge(page, '[data-field="document-status"]', 'approved', 'Approved');
    }
    assert.deepEqual(errors, []);
    console.log('Record detail statuses passed in light and dark mode.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
