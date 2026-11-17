window.EMPLOYEE_CAREER_PENDING_DATA = [{
  id: 'ECR00000000000000563',
  reference: 'ECR00000000000000563',
  employeeName: 'Farhan binti rahmat',
  empNo: 'EBB12',
  type: 'CV Change Request',
  approvalTitle: 'CV Change Request Approval',
  submitDate: '2026-10-13',
  status: 'pending',
  documentStatus: 'Submitted',
  summary: [['Document Status', 'Submitted']],
  profile: {
    personal: {
      'Name': { value: 'Farhan', changed: true },
      'Birth Date': { value: '22 Apr 1960', changed: true },
      'Age': 0,
      'Personal Email': 'ebb12@gmail.com',
      'Marital Status': { value: 'Married', changed: true },
      'Marriage Date': '18 Jul 1984',
      'Passport #': { value: 'A212222048', changed: true },
      'Passport Expiry': '25 Mar 2015',
      'Driving License': 'AX000234496',
      'Driving License Expiry': '12 Aug 2021',
      'Key Level': ''
    },
    qualifications: [{
      id: 'farhan-degree',
      'Qualification': "Bachelor's Degree",
      'Description': 'Bachelor of Business Administration',
      'Major': 'Human Resource Management',
      'Institute': 'Universiti Malaya',
      'Other Institute Name': '',
      'CGPA': '3.62',
      'Certificate #': 'DEMO-QUAL-001',
      'Year From': 2003,
      'Year To': 2006,
      'Highest': 'Yes',
      'Notes': 'Graduated with honours.'
    }, {
      id: 'farhan-diploma',
      'Qualification': { value: 'Diploma', changed: true },
      'Description': 'Diploma in Business Studies',
      'Major': { value: 'Business Administration', changed: true },
      'Institute': { value: 'Kolej Universiti Contoh', changed: true },
      'Other Institute Name': '',
      'CGPA': '3.45',
      'Certificate #': 'DEMO-QUAL-002',
      'Year From': 2001,
      'Year To': 2003,
      'Highest': 'No',
      'Notes': 'Completed before the degree programme.'
    }],
    payroll: {
      'EPF #': '636363636',
      'Socso #': '733773373',
      'Tax #': '377337373',
      'Tabung Haji #': '737585858',
      'ASB #': '747575757',
      'Spouse EPF #': '757686687',
      'Spouse Tax #': '988588585',
      'Bank': 'CIMB',
      'Account #': { value: '10447856855254', changed: true },
      'Handicap?': 'No',
      'Spouse Handicap?': { value: 'Yes', changed: true },
      'Spouse Working?': 'No'
    },
    contacts: {
      'Company Email': { value: 'yewweijiang123@gmail.com', changed: true },
      'Phone #': '0123456789',
      'Mobile #': { value: '0123456789', changed: true },
      'Address': '10, JALAN UPTOWN 2\n#05-33 JALAN 2228\nDAMANSARA KOTA',
      'Postal Code': '40862',
      'City': 'Damansara',
      'State': 'SELANGOR',
      'Country': 'MALAYSIA',
      'Emergency Contact #': { value: '04-6677778', changed: true },
      'Contact Name': 'RAZALI',
      'Contact Address': 'AS CORRESPONDENCE ADDRESS',
      'Contact Postal Code': '01920',
      'Contact City': 'Puchong',
      'Contact State': '',
      'Contact Country': 'MALAYSIA',
      'Remarks': 'FATHER'
    },
    family: {
      deleted: [],
      existing: [
        { name: 'ABU KARUDDIN BIN MAHMUD', relation: 'HUSBAND' },
        { name: 'a', relation: 'DAUGHTER', changed: true }
      ]
    }
  },
  changes: [],
  approverRemarks: ''
}, {
  id: 'SEG-2026-0021',
  reference: 'SEG-2026-0021',
  employeeName: 'Aina Rahman',
  empNo: 'EBB01',
  position: 'People Operations Executive',
  type: 'Staff Engagement',
  approvalTitle: 'Staff Engagement Approval',
  submitDate: '2026-10-12',
  status: 'pending',
  documentStatus: 'Submitted',
  interviewDate: '2026-10-08',
  positiveFeedback: 'Supportive colleagues and clear responsibilities within the team.',
  negativeFeedback: 'Would like more opportunities for career development and cross-team projects.',
  flightRisk: 'Low',
  recommendation: 'Continue Development Plan',
  mitigationAction: 'Arrange a career development discussion and identify a suitable training course within 30 days.',
  remarks: 'Follow up on the agreed development plan at the next monthly check-in.',
  attachments: [],
  approverRemarks: ''
}];

window.EMPLOYEE_CAREER_PENDING_CATEGORIES = ['CV Change Request', 'Staff Engagement'];
window.EMPLOYEE_CAREER_BACKUP_APPROVERS = [];

const submittedCVRequests = CVChangeRequests.all().filter(CVChangeRequests.isPending).map(row => ({
  ...row, type: 'CV Change Request', status: 'pending', documentStatus: 'Submitted',
  employeeName: row.name || row.employeeName || 'Employee', submitDate: row.submittedAt, savedCV: true
}));
window.EMPLOYEE_CAREER_PENDING_DATA.unshift(...submittedCVRequests);
