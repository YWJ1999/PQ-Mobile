/* Reference records supplied for the Payroll History preview. Unknown values stay empty. */
window.PAYROLL_HISTORY_DATA = {
  tax: [
    {
      id: 'RBT000000000039', employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      rebateCode: 'TXR02', rebateItem: 'BASIC SUPPORTING EQUIPMENT',
      transactionDate: '2025-08-14', submitDate: '2026-01-07',
      description: 'Medical Relief', receiptNo: '', amount: 100, status: 'submitted',
      attachments: [{ name: 'Invoice.docx' }],
      process: false, period: '', cycle: '', approvalDate: '', approvalDateLabel: '1 Jan 1', approverRemarks: 'Reason required'
    },
    {
      id: 'RBT000000000049', employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      rebateCode: 'TXR02', rebateItem: 'BASIC SUPPORTING EQUIPMENT',
      transactionDate: '2026-03-19', submitDate: '2026-03-19', description: '', receiptNo: '',
      amount: 12, status: 'submitted', attachments: [],
      process: false, period: '', cycle: '', approvalDate: '', approverRemarks: ''
    },
    {
      id: 'RBT000000000050', employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      rebateCode: 'TXR05', rebateItem: 'COMPLETE MEDICAL EXAMINATION',
      transactionDate: '2026-03-19', submitDate: '2026-03-19', description: '', receiptNo: '',
      amount: 14, status: 'submitted', attachments: [],
      process: false, period: '', cycle: '', approvalDate: '', approverRemarks: ''
    }
  ],
  deduction: [
    {
      id: 'PDR000000000004', reference: 'PDR000000000004',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      requestType: 'Start Deduction', deductionType: 'HOUSE DEDUCTION',
      period: '202007', submitDate: '2020-06-11', cycle: 'MONTH END',
      deductionDate: '2020-07-01', accountNo: '', amount: 200,
      status: 'draft', attachments: [{ name: 'test.txt' }]
    },
    {
      id: 'deduction-202008-asb', reference: '',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      requestType: '', deductionType: 'ASB DEDUCTION',
      period: '202008', submitDate: '2020-08-13', cycle: 'ALL CYCLES',
      deductionDate: '', accountNo: '', amount: 100,
      status: 'submitted', attachments: []
    },
    {
      id: 'deduction-202112-absent', reference: '',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      requestType: '', deductionType: 'ABSENT',
      period: '202112', submitDate: '2021-12-08', cycle: 'MONTH END',
      deductionDate: '', accountNo: '', amount: 23.90,
      status: 'submitted', attachments: []
    },
    {
      id: 'deduction-202205-advance', reference: '',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      requestType: '', deductionType: 'ADVANCE DEDUCTION',
      period: '202205', submitDate: '2024-09-26', cycle: 'MONTH END',
      deductionDate: '', accountNo: '', amount: 650,
      status: 'rejected', attachments: []
    },
    {
      id: 'deduction-202507-uniform', reference: '',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12',
      requestType: '', deductionType: 'UNIFORM ALLOWANCE',
      period: '202507', submitDate: '2025-07-03', cycle: 'MONTH END',
      deductionDate: '', accountNo: '', amount: 0,
      status: 'submitted', attachments: []
    }
  ]
};
