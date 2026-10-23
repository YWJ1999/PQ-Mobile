/**
 * ========================================================
 * PEOPLEHCM PAYROLL MODULE CONFIGURATION & MOCK DATA
 * Scope: Individual (Payslip, EA) & Team (Tax Relief)
 * ========================================================
 */

window.PAYROLL_CONFIG = {
  employee: {
    name: 'Sarah Jenkins',
    empNo: 'EBB01',
    dept: 'Product & Design',
    role: 'Senior Product Designer',
    email: 'sarah.j@peoplequest.com',
    joinDate: '15 Mar 2021',
    nric: '920415-14-5892',
    taxNumber: 'SG 20984128030',
    epfNumber: 'EPF-88192031',
    socsoNumber: 'SOC-920415145892',
    bankName: 'Maybank Berhad',
    bankAccount: '•••• •••• 6821'
  },

  // Sample tax records for the Individual tax information views.
  taxInformation: {
    profile: {
      maritalStatus: 'Married',
      handicap: false,
      taxReliefChildren: 1,
      taxExemptChildren: 1,
      taxBranch: '',
      spouseName: 'Daniel Jenkins',
      spouseWorking: false,
      spouseTaxNumber: '',
      spouseTaxBranch: ''
    },
    dependants: [
      {
        name: 'Sophie Jenkins',
        relation: 'Daughter (Female)',
        dateOfBirth: '2022-04-01',
        birthCertificate: 'BC-2022-00418',
        identityNumber: '',
        taxStatus: 'Child ≤ 18'
      }
    ]
  },

  // 1. INDIVIDUAL: QUICK OPTIONS
  individualOptions: [
    {
      id: 'prior_pay',
      name: 'Prior Pay Data',
      desc: 'Previous payroll records',
      icon: '<i class="fa-solid fa-clock-rotate-left"></i>',
      link: 'options/prior-pay-data.html'
    },
    {
      id: 'tax_relief',
      name: 'Tax Relief',
      desc: 'Personal tax relief records',
      icon: '<i class="fa-solid fa-file-circle-check"></i>',
      link: 'options/tax-relief-request.html'
    },
    {
      id: 'deduction_request',
      name: 'Deduction Request',
      desc: 'Submit a payroll deduction',
      icon: '<i class="fa-solid fa-file-circle-plus"></i>',
      link: 'options/deduction-request.html'
    },
    {
      id: 'payslip',
      name: 'Payslip',
      desc: 'Monthly salary statements',
      icon: '<i class="fa-solid fa-file-invoice-dollar"></i>',
      link: 'options/payslip.html'
    },
    {
      id: 'ea',
      name: 'EA',
      desc: 'Annual tax statement',
      icon: '<i class="fa-solid fa-file-contract"></i>',
      link: 'options/ea-form.html'
    },
    {
      id: 'history',
      name: 'History',
      desc: 'Payroll activity records',
      icon: '<i class="fa-solid fa-rectangle-list"></i>',
      link: 'options/history.html'
    }
  ],

  // 2. TEAM: QUICK OPTIONS (User: team 有的是 tax relief 而已)
  teamOptions: [
    {
      id: 'tax_relief',
      name: 'Tax Relief',
      desc: 'Review & approve staff tax relief claims',
      icon: '<i class="fa-solid fa-hand-holding-dollar"></i>',
      color: 'var(--purple-primary)',
      bg: 'rgba(124, 58, 237, 0.1)',
      link: 'options/tax-relief.html',
      badge: '4 Pending'
    }
  ],

  // 3. INDIVIDUAL: PAYSLIP DATA BY MONTH
  payslips: {
    '2025-12': {
      monthKey: '2025-12',
      monthLabel: 'December 2025',
      shortLabel: 'Dec 2025',
      payDate: '31 Dec 2025',
      status: 'Paid',
      company: 'PEOPLE QUEST SDN BHD',
      payrollCycle: 'MONTH END',
      bankBranch: 'CIMB',
      accountNumber: '10447856855254',
      grossPay: 10618.00,
      totalDeductions: 1722.85,
      netPay: 8895.15,
      earnings: [
        { name: 'BASIC PAY', amount: 9400.00 },
        { name: 'CAR PETROL ALLOWANCE', amount: 600.00 },
        { name: 'COLA', amount: 300.00 },
        { name: 'HOME GOING ALLOWANCE', amount: 60.00 },
        { name: 'INCONVENIENCE', amount: 28.00 },
        { name: 'SENIORITY ALLOWANCE', amount: 30.00 },
        { name: 'TOLL ALLOWANCE', amount: 200.00 }
      ],
      deductions: [
        { name: 'HOUSING LOAN', amount: 500.00 },
        { name: 'EMPLOYEE EPF', amount: 1166.00 },
        { name: 'EMPLOYEE SOCSO', amount: 24.75 },
        { name: 'EMPLOYEE TAX', amount: 32.10 }
      ],
      employerStatutory: [
        { name: 'EMPLOYER EPF', amount: 1272.00 },
        { name: 'EMPLOYER SOCSO', amount: 86.65 }
      ],
      statutoryBases: [
        { name: 'EPF BASE', amount: 10558.00 },
        { name: 'HRD BASE', amount: 9730.00 },
        { name: 'SIP BASE', amount: 9958.00 },
        { name: 'SOCSO BASE', amount: 9958.00 },
        { name: 'CP39 BASE', amount: 10590.00 }
      ],
      otherInformation: [
        { name: 'WORK DAYS', value: '23.00' }
      ],
      pdfFile: 'Payslip_Dec_2025_Sarah_Jenkins.pdf'
    },
    '2026-09': {
      monthKey: '2026-09',
      monthLabel: 'September 2026',
      shortLabel: 'Sep 2026',
      payDate: '25 Sep 2026',
      status: 'Paid',
      grossPay: 7500.00,
      totalDeductions: 1017.50,
      netPay: 6482.50,
      earnings: [
        { name: 'Basic Salary', amount: 6500.00, tag: 'Fixed' },
        { name: 'Fixed Transport Allowance', amount: 500.00, tag: 'Allowance' },
        { name: 'Mobile & Data Allowance', amount: 200.00, tag: 'Allowance' },
        { name: 'Performance Incentive', amount: 300.00, tag: 'Variable' }
      ],
      deductions: [
        { name: 'EPF Employee (11%)', amount: 825.00, note: 'Statutory' },
        { name: 'SOCSO Employee (0.5%)', amount: 36.75, note: 'Statutory' },
        { name: 'EIS Employee (0.2%)', amount: 14.70, note: 'Statutory' },
        { name: 'PCB / Monthly Tax Deduction', amount: 141.05, note: 'LHDN Tax' }
      ],
      employerStatutory: [
        { name: 'EPF Employer (13%)', amount: 975.00 },
        { name: 'SOCSO Employer (1.75%)', amount: 128.65 },
        { name: 'EIS Employer (0.2%)', amount: 14.70 },
        { name: 'HRD Corp Levy (1%)', amount: 75.00 }
      ],
      ytd: {
        gross: 67500.00,
        epf: 7425.00,
        socso: 330.75,
        eis: 132.30,
        pcb: 1269.45,
        net: 58342.50
      },
      pdfFile: 'Payslip_Sep_2026_Sarah_Jenkins.pdf'
    },
    '2026-08': {
      monthKey: '2026-08',
      monthLabel: 'August 2026',
      shortLabel: 'Aug 2026',
      payDate: '25 Aug 2026',
      status: 'Paid',
      grossPay: 7200.00,
      totalDeductions: 984.50,
      netPay: 6215.50,
      earnings: [
        { name: 'Basic Salary', amount: 6500.00, tag: 'Fixed' },
        { name: 'Fixed Transport Allowance', amount: 500.00, tag: 'Allowance' },
        { name: 'Mobile & Data Allowance', amount: 200.00, tag: 'Allowance' }
      ],
      deductions: [
        { name: 'EPF Employee (11%)', amount: 792.00, note: 'Statutory' },
        { name: 'SOCSO Employee (0.5%)', amount: 35.25, note: 'Statutory' },
        { name: 'EIS Employee (0.2%)', amount: 14.10, note: 'Statutory' },
        { name: 'PCB / Monthly Tax Deduction', amount: 143.15, note: 'LHDN Tax' }
      ],
      employerStatutory: [
        { name: 'EPF Employer (13%)', amount: 936.00 },
        { name: 'SOCSO Employer (1.75%)', amount: 123.40 },
        { name: 'EIS Employer (0.2%)', amount: 14.10 },
        { name: 'HRD Corp Levy (1%)', amount: 72.00 }
      ],
      ytd: {
        gross: 60000.00,
        epf: 6600.00,
        socso: 294.00,
        eis: 117.60,
        pcb: 1128.40,
        net: 51860.00
      },
      pdfFile: 'Payslip_Aug_2026_Sarah_Jenkins.pdf'
    },
    '2026-07': {
      monthKey: '2026-07',
      monthLabel: 'July 2026',
      shortLabel: 'Jul 2026',
      payDate: '25 Jul 2026',
      status: 'Paid',
      grossPay: 7200.00,
      totalDeductions: 984.50,
      netPay: 6215.50,
      earnings: [
        { name: 'Basic Salary', amount: 6500.00, tag: 'Fixed' },
        { name: 'Fixed Transport Allowance', amount: 500.00, tag: 'Allowance' },
        { name: 'Mobile & Data Allowance', amount: 200.00, tag: 'Allowance' }
      ],
      deductions: [
        { name: 'EPF Employee (11%)', amount: 792.00, note: 'Statutory' },
        { name: 'SOCSO Employee (0.5%)', amount: 35.25, note: 'Statutory' },
        { name: 'EIS Employee (0.2%)', amount: 14.10, note: 'Statutory' },
        { name: 'PCB / Monthly Tax Deduction', amount: 143.15, note: 'LHDN Tax' }
      ],
      employerStatutory: [
        { name: 'EPF Employer (13%)', amount: 936.00 },
        { name: 'SOCSO Employer (1.75%)', amount: 123.40 },
        { name: 'EIS Employer (0.2%)', amount: 14.10 },
        { name: 'HRD Corp Levy (1%)', amount: 72.00 }
      ],
      ytd: {
        gross: 52800.00,
        epf: 5808.00,
        socso: 258.75,
        eis: 103.50,
        pcb: 985.25,
        net: 45644.50
      },
      pdfFile: 'Payslip_Jul_2026_Sarah_Jenkins.pdf'
    },
    '2026-06': {
      monthKey: '2026-06',
      monthLabel: 'June 2026',
      shortLabel: 'Jun 2026',
      payDate: '25 Jun 2026',
      status: 'Paid',
      grossPay: 8200.00,
      totalDeductions: 1112.50,
      netPay: 7087.50,
      earnings: [
        { name: 'Basic Salary', amount: 6500.00, tag: 'Fixed' },
        { name: 'Fixed Transport Allowance', amount: 500.00, tag: 'Allowance' },
        { name: 'Mobile & Data Allowance', amount: 200.00, tag: 'Allowance' },
        { name: 'Mid-Year Bonus', amount: 1000.00, tag: 'Bonus' }
      ],
      deductions: [
        { name: 'EPF Employee (11%)', amount: 902.00, note: 'Statutory' },
        { name: 'SOCSO Employee (0.5%)', amount: 39.75, note: 'Statutory' },
        { name: 'EIS Employee (0.2%)', amount: 15.90, note: 'Statutory' },
        { name: 'PCB / Monthly Tax Deduction', amount: 154.85, note: 'LHDN Tax' }
      ],
      employerStatutory: [
        { name: 'EPF Employer (13%)', amount: 1066.00 },
        { name: 'SOCSO Employer (1.75%)', amount: 139.10 },
        { name: 'EIS Employer (0.2%)', amount: 15.90 },
        { name: 'HRD Corp Levy (1%)', amount: 82.00 }
      ],
      ytd: {
        gross: 45600.00,
        epf: 5016.00,
        socso: 223.50,
        eis: 89.40,
        pcb: 842.10,
        net: 39429.00
      },
      pdfFile: 'Payslip_Jun_2026_Sarah_Jenkins.pdf'
    }
  },

  // 4. INDIVIDUAL: BORANG EA (FORM C.P.8A) DATA
  eaForms: {
    '2025': {
      year: '2025',
      taxRef: 'T01 (TAX)',
      formType: 'C.P.8A [Pin. 2025]',
      serialNo: 'EA-2025-004128',
      employer: {
        name: 'PEOPLEQUEST TECHNOLOGIES SDN BHD',
        eNumber: 'E 9128374-02',
        address: 'Level 28, Menara PQ, KL Sentral, 50470 Kuala Lumpur'
      },
      partA: {
        name: 'SARAH JENKINS',
        empNo: '#EBB01',
        designation: 'Senior Product Designer',
        nric: '920415-14-5892',
        passportNo: '-',
        itn: 'SG 20984128030',
        epfNo: 'EPF-88192031',
        socsoNo: 'SOC-920415145892',
        childrenCount: 0
      },
      partB: {
        grossSalary: 86400.00,
        bonus: 10500.00,
        feesPerquisites: 8400.00,
        gratuity: 0.00,
        bik: 1200.00, // Benefits-in-kind
        vola: 0.00,   // Value of living accommodation
        refundFromUnapprovedFund: 0.00,
        compensationForLossOfEmployment: 0.00,
        totalGross: 106500.00
      },
      partC: {
        pension: 0.00,
        annuities: 0.00
      },
      partD: {
        monthlyTaxDeductionPCB: 7420.00,
        cp38Deduction: 0.00,
        zakatPaidViaPayroll: 0.00,
        totalTaxDeductions: 7420.00
      },
      partE: {
        epfTotalContribution: 11715.00,
        socsoTotalContribution: 423.00,
        eisTotalContribution: 169.20
      },
      partF: {
        exemptAllowances: 2400.00 // Petrol / travel exemption
      },
      generatedDate: '28 Feb 2026',
      officerName: 'Amanda Loo (Head of Payroll)',
      officerPhone: '+603-2788 9000'
    },
    '2024': {
      year: '2024',
      taxRef: 'T01 (TAX)',
      formType: 'C.P.8A [Pin. 2024]',
      serialNo: 'EA-2024-003891',
      employer: {
        name: 'PEOPLEQUEST TECHNOLOGIES SDN BHD',
        eNumber: 'E 9128374-02',
        address: 'Level 28, Menara PQ, KL Sentral, 50470 Kuala Lumpur'
      },
      partA: {
        name: 'SARAH JENKINS',
        empNo: '#EBB01',
        designation: 'Product Designer',
        nric: '920415-14-5892',
        passportNo: '-',
        itn: 'SG 20984128030',
        epfNo: 'EPF-88192031',
        socsoNo: 'SOC-920415145892',
        childrenCount: 0
      },
      partB: {
        grossSalary: 78000.00,
        bonus: 8000.00,
        feesPerquisites: 7200.00,
        gratuity: 0.00,
        bik: 800.00,
        vola: 0.00,
        refundFromUnapprovedFund: 0.00,
        compensationForLossOfEmployment: 0.00,
        totalGross: 94000.00
      },
      partC: {
        pension: 0.00,
        annuities: 0.00
      },
      partD: {
        monthlyTaxDeductionPCB: 5880.00,
        cp38Deduction: 0.00,
        zakatPaidViaPayroll: 0.00,
        totalTaxDeductions: 5880.00
      },
      partE: {
        epfTotalContribution: 10340.00,
        socsoTotalContribution: 382.50,
        eisTotalContribution: 153.00
      },
      partF: {
        exemptAllowances: 2400.00
      },
      generatedDate: '28 Feb 2025',
      officerName: 'Amanda Loo (Head of Payroll)',
      officerPhone: '+603-2788 9000'
    }
  },

  teamPayroll: {
    monthKey: '2026-09',
    monthLabel: 'September 2026',
    pendingApprovalCount: 20,
    summaryGroups: [
      {
        key: 'payments',
        title: 'Payments',
        icon: 'fa-wallet',
        items: [
          { name: 'Basic Pay', amount: 392136.02 },
          { name: 'Hourly Pay', amount: 141128.00 }
        ]
      },
      {
        key: 'deductions',
        title: 'Employee Deductions',
        icon: 'fa-file-invoice-dollar',
        items: [
          { name: 'Employee EPF', amount: 34142.00 },
          { name: 'Employee Tax', amount: 39771.25 }
        ]
      },
      {
        key: 'employer',
        title: 'Employer Contributions',
        icon: 'fa-building-columns',
        items: [
          { name: 'Employer EPF', amount: 37245.00 },
          { name: 'Employer SOCSO', amount: 3362.00 }
        ]
      }
    ],
    breakdown: {
      payments: [
        { name: 'Basic Pay', amount: 392136.02 },
        { name: 'Hourly Pay', amount: 141128.00 },
        { name: 'Attendance Allowance', amount: 16400.00 },
        { name: 'Car Petrol Allowance', amount: 13600.00 },
        { name: 'House Allowance', amount: 3231.00 },
        { name: 'Attendance Incentive', amount: 3160.00 },
        { name: 'COLA', amount: 3000.00 },
        { name: 'Meal Allowance', amount: 1951.67 },
        { name: 'Allowance', amount: 200.00 },
        { name: 'Inconvenience Allowance', amount: 28.00 },
        { name: 'Overtime Payment', amount: 0.00 }
      ],
      deductions: [
        { name: 'Employee EPF', amount: 34142.00 },
        { name: 'Employee Tax', amount: 39771.25 },
        { name: 'Employee SOCSO', amount: 7284.40 },
        { name: 'Employee EIS', amount: 1456.88 },
        { name: 'Zakat', amount: 0.00 }
      ],
      employer: [
        { name: 'Employer EPF', amount: 37245.00 },
        { name: 'Employer SOCSO', amount: 3362.00 },
        { name: 'Employer EIS', amount: 1681.00 },
        { name: 'HRD Levy', amount: 3921.36 }
      ]
    }
  },

  // 5. TEAM: TAX RELIEF OVERVIEW & SUBMISSIONS LIST
  teamTaxRelief: {
    year: '2026',
    totalStaff: 12,
    totalClaims: 18,
    pendingCount: 4,
    approvedCount: 13,
    rejectedCount: 1,
    totalReliefClaimed: 48250.00,
    submissions: [
      {
        id: 'TR-2026-001',
        userName: 'Aisha Tan',
        empNo: '0000101',
        dept: 'Product Design • UI/UX Team',
        avatar: 'AT',
        avatarBg: 'rgba(236, 72, 153, 0.15)',
        avatarColor: '#ec4899',
        category: 'Lifestyle',
        subCategory: 'Personal Computer / Tablet / Smartphone',
        itemTitle: 'iPad Pro 11-inch M4 for Design Work & Digital Sketching',
        amount: 2500.00,
        maxStatutoryCap: 2500.00,
        claimDate: '18 Sep 2026',
        submitDate: '19 Sep 2026',
        status: 'pending',
        receiptNumber: 'Apple Store Invoice #MY-99120',
        receiptFileName: 'Apple_Store_Invoice_Aisha.pdf',
        notes: 'Submitted for Individual Lifestyle relief (self/spouse/child).'
      },
      {
        id: 'TR-2026-002',
        userName: 'Marcus Tan',
        empNo: '004177',
        dept: 'Senior Frontend Engineer',
        avatar: 'MT',
        avatarBg: 'rgba(16, 185, 129, 0.15)',
        avatarColor: '#10b981',
        category: 'Education Fees',
        subCategory: 'Self (Postgraduate / Technical / Degree)',
        itemTitle: 'Master of Computer Science (AI & Architecture) Semester 2 Tuition',
        amount: 4200.00,
        maxStatutoryCap: 7000.00,
        claimDate: '15 Sep 2026',
        submitDate: '16 Sep 2026',
        status: 'pending',
        receiptNumber: 'Universiti Malaya Official Receipt #UM-202609',
        receiptFileName: 'UM_Tuition_Receipt_Marcus.pdf',
        notes: 'Recognized tertiary institution by Ministry of Higher Education.'
      },
      {
        id: 'TR-2026-003',
        userName: 'Daniel Lee',
        empNo: '000582',
        dept: 'Operations Specialist • Logistics',
        avatar: 'DL',
        avatarBg: 'rgba(59, 130, 246, 0.15)',
        avatarColor: '#3b82f6',
        category: 'Medical Expenses',
        subCategory: 'Medical Treatment for Parents',
        itemTitle: 'Orthopedic Joint Care & Physiotherapy Sessions for Father',
        amount: 3800.00,
        maxStatutoryCap: 8000.00,
        claimDate: '12 Sep 2026',
        submitDate: '13 Sep 2026',
        status: 'pending',
        receiptNumber: 'Pantai Hospital Receipt #HP-44120',
        receiptFileName: 'Pantai_Hospital_Bill_Daniel.pdf',
        notes: 'Includes registered medical practitioner clinical diagnosis cert.'
      },
      {
        id: 'TR-2026-004',
        userName: 'Kevin Lim',
        empNo: '002774',
        dept: 'Infrastructure Engineer',
        avatar: 'KL',
        avatarBg: 'rgba(20, 184, 166, 0.15)',
        avatarColor: '#14b8a6',
        category: 'Lifestyle',
        subCategory: 'Sports Equipment & Gym Membership',
        itemTitle: 'Annual Fitness First Gym Membership & Running Footwear',
        amount: 850.00,
        maxStatutoryCap: 1000.00,
        claimDate: '10 Sep 2026',
        submitDate: '11 Sep 2026',
        status: 'pending',
        receiptNumber: 'Fitness First Tax Invoice #FF-3302',
        receiptFileName: 'Fitness_First_Receipt_Kevin.pdf',
        notes: 'Includes gym subscription under Sports Development Act 1997.'
      },
      {
        id: 'TR-2026-005',
        userName: 'Sarah Chen',
        empNo: 'EBB01',
        dept: 'Marketing Lead • Digital Team',
        avatar: 'SC',
        avatarBg: 'rgba(124, 58, 237, 0.15)',
        avatarColor: '#7c3aed',
        category: 'Medical Expenses',
        subCategory: 'Complete Medical Examination',
        itemTitle: 'Full Comprehensive Executive Health Screening & Blood Profile',
        amount: 1000.00,
        maxStatutoryCap: 1000.00,
        claimDate: '05 Sep 2026',
        submitDate: '06 Sep 2026',
        status: 'approved',
        receiptNumber: 'Prince Court Medical Center #PC-1082',
        receiptFileName: 'Prince_Court_Receipt_Sarah.pdf',
        notes: 'Approved under complete medical examination for self/spouse.'
      },
      {
        id: 'TR-2026-006',
        userName: 'Ahmad Razali',
        empNo: '001290',
        dept: 'Enterprise Sales & Account Management',
        avatar: 'AR',
        avatarBg: 'rgba(245, 158, 11, 0.15)',
        avatarColor: '#f59e0b',
        category: 'Insurance & EPF',
        subCategory: 'Life Insurance & Takaful',
        itemTitle: 'Annual Prudential Life Insurance Policy Premium',
        amount: 3000.00,
        maxStatutoryCap: 3000.00,
        claimDate: '02 Sep 2026',
        submitDate: '03 Sep 2026',
        status: 'approved',
        receiptNumber: 'Prudential Annual Statement #PRU-9901',
        receiptFileName: 'Prudential_Policy_Ahmad.pdf',
        notes: 'Verified policy owner and premium proof.'
      },
      {
        id: 'TR-2026-007',
        userName: 'Emily Wong',
        empNo: '003319',
        dept: 'UX Research & Customer Insights',
        avatar: 'EW',
        avatarBg: 'rgba(59, 130, 246, 0.15)',
        avatarColor: '#3b82f6',
        category: 'Lifestyle',
        subCategory: 'Books, Journals & Periodicals',
        itemTitle: 'Kinokuniya Design Leadership & Technical Reference Books',
        amount: 450.00,
        maxStatutoryCap: 2500.00,
        claimDate: '28 Aug 2026',
        submitDate: '29 Aug 2026',
        status: 'approved',
        receiptNumber: 'Kinokuniya Official Tax Invoice #KN-8831',
        receiptFileName: 'Kinokuniya_Invoice_Emily.pdf',
        notes: 'Printed books and reference materials qualified under lifestyle relief.'
      },
      {
        id: 'TR-2026-008',
        userName: 'Jason Ng',
        empNo: '001552',
        dept: 'DevOps & Cloud Systems',
        avatar: 'JN',
        avatarBg: 'rgba(239, 68, 68, 0.15)',
        avatarColor: '#ef4444',
        category: 'Lifestyle',
        subCategory: 'Sports & Smart Devices',
        itemTitle: 'Luxury Smartwatch Decorative Leather Strap & Case',
        amount: 220.00,
        maxStatutoryCap: 1000.00,
        claimDate: '20 Aug 2026',
        submitDate: '21 Aug 2026',
        status: 'rejected',
        receiptNumber: 'Shopee Official Store Invoice #SP-109284',
        receiptFileName: 'Shopee_Order_Jason.pdf',
        notes: 'Disallowed: Watch accessories and aesthetic straps are excluded from LHDN lifestyle equipment deduction.'
      }
    ]
  }
};

window.PAYROLL_DATA = window.PAYROLL_CONFIG;
// Compatibility view-models used by the redesigned payroll documents.
Object.values(window.PAYROLL_DATA.payslips || {}).forEach(payslip => {
  payslip.periodLabel = payslip.periodLabel || payslip.monthLabel;
  payslip.totalEarnings = payslip.totalEarnings ?? payslip.grossPay;
  payslip.employerContributions = payslip.employerContributions || payslip.employerStatutory || [];
  payslip.statutoryBase = payslip.statutoryBase || payslip.statutoryBases || [];
  payslip.otherInfo = payslip.otherInfo || payslip.otherInformation || [];
  [payslip.earnings, payslip.deductions, payslip.employerContributions, payslip.statutoryBase, payslip.otherInfo]
    .filter(Boolean)
    .forEach(rows => rows.forEach(row => { row.description = row.description || row.name; }));
});

Object.values(window.PAYROLL_DATA.eaForms || {}).forEach(form => {
  const employee = form.partA || {};
  const income = form.partB || {};
  const pension = form.partC || {};
  const deductions = form.partD || {};
  const contributions = form.partE || {};
  const exempt = form.partF || {};
  form.employee = form.employee || {
    name: employee.name,
    employeeId: employee.empNo,
    position: employee.designation,
    nric: employee.nric,
    employmentPeriod: `01 Jan – 31 Dec ${form.year}`
  };
  form.income = form.income || [
    { description: 'Gross Salary', amount: income.grossSalary },
    { description: 'Bonus', amount: income.bonus },
    { description: 'Fees, Commission & Perquisites', amount: income.feesPerquisites },
    { description: 'Gratuity', amount: income.gratuity },
    { description: 'Benefits-in-Kind', amount: income.bik },
    { description: 'Value of Living Accommodation', amount: income.vola },
    { description: 'Refund from Unapproved Fund', amount: income.refundFromUnapprovedFund },
    { description: 'Compensation for Loss of Employment', amount: income.compensationForLossOfEmployment }
  ];
  form.totalIncome = form.totalIncome ?? income.totalGross;
  form.pensionAnnuities = form.pensionAnnuities || [
    { description: 'Pension', amount: pension.pension },
    { description: 'Annuities', amount: pension.annuities }
  ];
  form.deductions = form.deductions || [
    { description: 'Monthly Tax Deduction (PCB)', amount: deductions.monthlyTaxDeductionPCB },
    { description: 'CP38 Deduction', amount: deductions.cp38Deduction },
    { description: 'Zakat Paid via Payroll', amount: deductions.zakatPaidViaPayroll }
  ];
  form.totalDeductions = form.totalDeductions ?? deductions.totalTaxDeductions;
  form.contributions = form.contributions || [
    { description: 'Employee EPF Contribution', amount: contributions.epfTotalContribution },
    { description: 'Employee SOCSO Contribution', amount: contributions.socsoTotalContribution },
    { description: 'Employee EIS Contribution', amount: contributions.eisTotalContribution }
  ];
  form.exemptAllowances = form.exemptAllowances || [
    { description: 'Tax-Exempt Allowances / Benefits', amount: exempt.exemptAllowances }
  ];
  form.certification = form.certification || { officer: form.officerName, date: form.generatedDate };
});
