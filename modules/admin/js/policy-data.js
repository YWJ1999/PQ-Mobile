/* Workplace Policy/SOP catalog, also used by Home and Company Updates. */
// Shared demo attachment for catalog entries without their own sample PDF.
const POLICY_SAMPLE_PDF_URL = 'assets/policies/Workplace_Document_sample.pdf';
const POLICY_DATABASE = {
  'HR004': {
    ref: 'HR004',
    title: 'Hybrid & Remote Work Policy 2026',
    dept: 'ALL DEPARTMENTS',
    policy: {
      name: 'Remote_Work_Framework_2026.pdf',
      size: '2.5 KB',
      date: '15/01/2026',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    },
    sop: {
      name: 'SOP_WFH_Application_Approval.pdf',
      size: '2.5 KB',
      date: '18/01/2026',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    },
    guideline: {
      name: 'Remote_Work_Guideline_sample.pdf',
      size: '2.5 KB',
      date: '18/01/2026',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    }
  },
  'FN012': {
    ref: 'FN012',
    title: 'Medical & Travel Claims SOP',
    dept: 'FINANCE & ACCOUNTING',
    policy: {
      name: 'Staff_Expense_Reimbursement_Policy.pdf',
      size: '2.5 KB',
      date: '01/02/2026',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    },
    sop: {
      name: 'SOP_Overseas_Travel_Claims_v3.pdf',
      size: '2.5 KB',
      date: '05/02/2026',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    },
    guideline: {
      name: 'Mileage_Per_Diem_Rate_Card.pdf',
      size: '2.5 KB',
      date: '05/02/2026',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    }
  },
  'DE001': {
    ref: 'DE001',
    title: 'CHECK TITLE',
    dept: 'ADMINISTRATION',
    policy: {
      name: 'PeopleTime_UserGuide_v2.pdf',
      size: '46 KB',
      date: '20/12/2024',
      pdfUrl: 'assets/policies/PeopleTime_UserGuide_v2_sample.pdf',
      type: 'Sample PDF'
    },
    sop: {
      name: 'PeopleTime_SOP_sample.pdf',
      size: '2.5 KB',
      date: '20/12/2024',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    },
    guideline: {
      name: 'PeopleTime_Guideline_sample.pdf',
      size: '2.5 KB',
      date: '20/12/2024',
      pdfUrl: POLICY_SAMPLE_PDF_URL,
      type: 'Sample PDF'
    }
  }
};

function policyDocuments(record) {
  return ['Policy', 'SOP', 'Guideline']
    .map(label => ({ label, file: record[label.toLowerCase()] }))
    .filter(({ file }) => file?.name?.trim());
}

function policyFileCount(count) {
  return count + (count === 1 ? ' file' : ' files');
}

const POLICY_FILTER_DEFAULTS = {
  reference: '', title: '', department: '',
  policyFrom: '2016-09-01', policyTo: '2100-12-31',
  sopFrom: '2016-09-01', sopTo: '2100-12-31',
  guidelineFrom: '2016-09-01', guidelineTo: '2100-12-31'
};

function workplacePolicyDetailsUrl(ref) {
  const url = new URL('../../../company-updates.html', location.href);
  url.search = location.search;
  url.searchParams.delete('document');
  url.searchParams.set('theme', getCurrentTheme());
  url.searchParams.set('via', 'workplace');
  url.searchParams.set('policy', ref);
  return url;
}
