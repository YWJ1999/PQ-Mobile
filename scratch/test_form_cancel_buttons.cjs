const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cancelMarker = 'data-page-form-cancel';

const appCss = read('css/app.css');
expect(appCss.includes('.form-cancel-btn'), 'Shared form cancel button style is missing');
const cancelStyle = appCss.match(/\.form-cancel-btn:not\(\[disabled\]\)\s*\{([\s\S]*?)\}/)?.[1] || '';
expect(cancelStyle.includes('background: #171529'), 'Form Cancel must use the approved dark neutral background');
expect(cancelStyle.includes('border: 1px solid #302d46'), 'Form Cancel must use the approved dark neutral border');
expect(cancelStyle.includes('color: #f8fafc'), 'Form Cancel must use the approved light text color');
expect(!/margin-right\s*:\s*auto/i.test(cancelStyle), 'Form Cancel must stay grouped beside Draft and primary actions');
expect(!/(#f43f5e|251, 113, 133|190, 24, 93)/i.test(cancelStyle), 'Form Cancel must not use the red or pink danger palette');
const lightCancelSelector = '[data-theme="light"] .form-cancel-btn:not([disabled])';
const lightCancelStart = appCss.indexOf(lightCancelSelector);
const lightCancelStyle = lightCancelStart < 0 ? '' : appCss.slice(lightCancelStart, appCss.indexOf('}', lightCancelStart));
expect(lightCancelStyle.includes('background: var(--bg-card) !important'), 'Light Form Cancel must use the white theme card background');
expect(lightCancelStyle.includes('border-color: var(--border-subtle) !important'), 'Light Form Cancel must use the theme border');
expect(lightCancelStyle.includes('color: var(--text-primary) !important'), 'Light Form Cancel must use dark theme text');

const attachmentStyle = appCss.match(/\/\* FORM ATTACHMENT ACTIONS \*\/([\s\S]*?)\/\* END FORM ATTACHMENT ACTIONS \*\//)?.[1] || '';
expect(attachmentStyle.includes('width: 54px !important'), 'Form attachment icons must share a 54px width');
expect(attachmentStyle.includes('height: 54px !important'), 'Form attachment icons must share a 54px height');
expect(attachmentStyle.includes('font-size: 18px !important'), 'Form attachment glyphs must share an 18px size');
expect(attachmentStyle.includes('.project-upload-icon'), 'Project form attachment icons are not covered');
expect(attachmentStyle.includes('.payroll-upload-icon'), 'Payroll form attachment icons are not covered');
expect(attachmentStyle.includes('.prior-upload-icon'), 'Prior Pay form attachment icons are not covered');
expect(attachmentStyle.includes('[onclick^="triggerFileUpload"]'), 'Leave and Claim attachment icons are not covered');
expect(attachmentStyle.includes('[onclick^="triggerClaimFileUpload"]'), 'Benefit Claim attachment icons are not covered');
expect(attachmentStyle.includes('[onclick^="triggerTimeOffFileUpload"]'), 'Time Off attachment icons are not covered');

const leaveHtml = read('leave.html');
const leaveForms = [
  { name: 'Apply Leave', start: 'id="viewApplyLeaveForm"', end: 'id="viewCreditLeaveForm"', draft: true },
  { name: 'Credit Leave', start: 'id="viewCreditLeaveForm"', end: 'id="viewLeaveCredit"', draft: true },
  { name: 'Time Off', start: 'id="viewApplyOffTimeForm"', end: 'id="viewMyPersonalCalendar"', draft: false }
];

for (const form of leaveForms) {
  const start = leaveHtml.indexOf(form.start);
  const end = leaveHtml.indexOf(form.end, start + form.start.length);
  expect(start >= 0 && end > start, `${form.name} form region was not found`);
  const region = leaveHtml.slice(start, end);
  expect(region.includes(cancelMarker), `${form.name} is missing its page Cancel button`);
  expect(region.includes('>Cancel<') || region.includes('<span>Cancel</span>'), `${form.name} Cancel label is missing`);
  expect(region.includes('Draft') === form.draft, `${form.name} Draft button presence changed`);
}

const claimForms = [
  { path: 'modules/claims/options/advance-claim.html', name: 'Advance Request', multi: true, draft: true },
  { path: 'modules/claims/options/benefit-claim.html', name: 'Benefit Claim', multi: false, draft: false },
  { path: 'modules/claims/options/entertainment-claim.html', name: 'Entertainment Claim', multi: true, draft: true },
  { path: 'modules/claims/options/expenses-claim.html', name: 'Expense Claim', multi: true, draft: true },
  { path: 'modules/claims/options/medical-claim.html', name: 'Medical Claim', multi: true, draft: true },
  { path: 'modules/claims/options/ot-claim.html', name: 'OT Claim', multi: false, draft: true },
  { path: 'modules/claims/options/travel-claim.html', name: 'Travel Mileage Claim', multi: true, draft: true },
  { path: 'modules/claims/options/travel-request.html', name: 'Travel Request', multi: true, draft: true }
];

for (const form of claimForms) {
  const html = read(form.path);
  const cancelCount = html.split(cancelMarker).length - 1;
  expect(cancelCount === 1, `${form.name} must have exactly one page Cancel button`);
  const cancelButton = html.match(/<button\b[^>]*\bdata-page-form-cancel\b[^>]*>/)?.[0] || '';
  const cancelClasses = cancelButton.match(/class="([^"]*)"/)?.[1].split(/\s+/) || [];
  expect(cancelClasses.includes(form.multi ? 'btn-submit-primary' : 'form-cancel-btn'), `${form.name} Cancel has the wrong button style`);
  expect(html.includes('Save Draft') || html.includes('<span>Draft</span>') ? form.draft : !form.draft, `${form.name} Draft button presence changed`);

  if (form.multi) {
    const firstView = html.indexOf('id="view-1-main"');
    const laterViews = ['id="view-2-categories"', 'id="view-3-list"', 'id="view-4-entry"']
      .map(marker => html.indexOf(marker, firstView + 1))
      .filter(index => index >= 0);
    const nextView = Math.min(...laterViews);
    expect(firstView >= 0 && Number.isFinite(nextView), `${form.name} tab regions were not found`);
    expect(html.slice(firstView, nextView).includes(cancelMarker), `${form.name} Cancel must be on the first tab`);
    expect(!html.slice(nextView).includes(cancelMarker), `${form.name} has a page Cancel button after the first tab`);
  }
}

const payrollForms = [
  { path: 'modules/payroll/options/prior-pay-data.html', name: 'Prior Pay Data', draft: true },
  { path: 'modules/payroll/options/tax-relief-request.html', name: 'Tax Relief Request', draft: false },
  { path: 'modules/payroll/options/deduction-request.html', name: 'Deduction Request', draft: false }
];

for (const form of payrollForms) {
  const html = read(form.path);
  expect((html.split(cancelMarker).length - 1) === 1, `${form.name} must have exactly one page Cancel button`);
  expect(html.includes('btn-draft-bright') === form.draft, `${form.name} Draft button presence changed`);
}

const priorPayJs = read('js/payroll/prior-pay-data.js');
expect(priorPayJs.includes("$('priorCancel').hidden = index !== 0"), 'Prior Pay Cancel must only show on the first tab');
expect(priorPayJs.includes("$('priorCancel').addEventListener('click', goBack)"), 'Prior Pay Cancel does not return to the previous view');

const payrollRequestJs = read('js/payroll/payroll-request-forms.js');
expect(payrollRequestJs.includes("$('payrollCancel').addEventListener('click', cancelForm)"), 'Payroll request Cancel does not use the direct return handler');

const projectForms = [
  { path: 'modules/project-task/options/work-plan.html', name: 'Work Plan', draft: false },
  { path: 'modules/project-task/options/work-assignment.html', name: 'Work Assignment', draft: false },
  { path: 'modules/project-task/options/time-sheet.html', name: 'Time Sheet', draft: true }
];

for (const form of projectForms) {
  const html = read(form.path);
  expect((html.split(cancelMarker).length - 1) === 1, `${form.name} must have exactly one page Cancel button`);
  expect(html.includes('btn-draft-bright') === form.draft, `${form.name} Draft button presence changed`);
}

console.log('All 17 form Cancel button checks passed.');
