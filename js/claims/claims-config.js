/**
 * PeopleHCM - Claims Options Schema & Configuration
 * Full datasets matching Individual & Team dashboard screenshots.
 */

window.CURRENCIES = [
  'MALAYSIAN RINGGIT (MYR)',
  'US DOLLAR (USD)',
  'SINGAPORE DOLLAR (SGD)',
  'EURO (EUR)'
];

window.CLAIM_PERIOD_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Donut breakdown datasets for Individual & Team views
window.CLAIM_BREAKDOWN_DATA = {
  individual: {
    benefits: {
      total: 'RM2,000',
      label: 'Approved amount',
      items: [
        { category: 'Consultation', amount: 'RM600', share: '40%', color: '#3b82f6', value: 600 },
        { category: 'Dental', amount: 'RM400', share: '20%', color: '#8b5cf6', value: 400 },
        { category: 'Optical', amount: 'RM300', share: '15%', color: '#14b8a6', value: 300 },
        { category: 'Pharmacy', amount: 'RM200', share: '10%', color: '#f59e0b', value: 200 },
        { category: 'Wellness', amount: 'RM100', share: '5%', color: '#ec4899', value: 100 },
        { category: 'Others (7)', amount: 'RM200', share: '10%', color: '#94a3b8', value: 200 }
      ]
    },
    claims: {
      total: 'RM1,850',
      label: 'Approved amount',
      items: [
        { category: 'Travel Mileage', amount: 'RM750', share: '40.5%', color: '#3b82f6', value: 750 },
        { category: 'Medical Claim', amount: 'RM450', share: '24.3%', color: '#8b5cf6', value: 450 },
        { category: 'Entertainment', amount: 'RM350', share: '18.9%', color: '#14b8a6', value: 350 },
        { category: 'Office Expenses', amount: 'RM200', share: '10.8%', color: '#f59e0b', value: 200 },
        { category: 'Others', amount: 'RM100', share: '5.5%', color: '#94a3b8', value: 100 }
      ]
    }
  },
  team: {
    benefits: {
      total: 'RM7,090',
      label: 'Approved amount',
      items: [
        { category: 'Consultation', amount: 'RM3,000', share: '42.3%', color: '#3b82f6', value: 3000 },
        { category: 'Dental', amount: 'RM1,370', share: '19.3%', color: '#8b5cf6', value: 1370 },
        { category: 'Optical', amount: 'RM1,140', share: '16.1%', color: '#14b8a6', value: 1140 },
        { category: 'Pharmacy', amount: 'RM740', share: '10.4%', color: '#f59e0b', value: 740 },
        { category: 'Wellness', amount: 'RM430', share: '6.1%', color: '#ec4899', value: 430 },
        { category: 'Others (7)', amount: 'RM410', share: '5.8%', color: '#94a3b8', value: 410 }
      ]
    },
    claims: {
      total: 'RM12,450',
      label: 'Approved amount',
      items: [
        { category: 'Overseas Travel', amount: 'RM5,200', share: '41.8%', color: '#3b82f6', value: 5200 },
        { category: 'Staff Medical', amount: 'RM3,100', share: '24.9%', color: '#8b5cf6', value: 3100 },
        { category: 'Client Entertainment', amount: 'RM2,350', share: '18.9%', color: '#14b8a6', value: 2350 },
        { category: 'Mileage & Parking', amount: 'RM1,100', share: '8.8%', color: '#f59e0b', value: 1100 },
        { category: 'Equipment & Supplies', amount: 'RM700', share: '5.6%', color: '#94a3b8', value: 700 }
      ]
    }
  }
};

// Travel calendar dates data
window.INDIVIDUAL_TRAVEL_DATA = {
  month: 'September 2026',
  travelDays: [28, 29, 30],
  selectedDay: 28,
  selectedDayLabel: 'Monday, 28 September 2026',
  trips: [
    {
      id: 'my-penang-client-visit',
      empNo: 'EBB12',
      route: 'Kuala Lumpur ➔ Penang',
      origin: 'Kuala Lumpur',
      destination: 'Penang Branch',
      travelDateFrom: '2026-09-28',
      travelDateTo: '2026-09-30',
      dateToDate: '28 Sep 2026 – 30 Sep 2026',
      dates: '28–30 Sep 2026 • 3 days',
      duration: '3 days',
      reason: 'Official Outstation Travel',
      purpose: 'Client visit',
      status: 'Approved'
    }
  ]
};

window.TEAM_TRAVEL_DATA = {
  month: 'September 2026',
  staffCount: 6,
  tripsCount: 8,
  travelBadges: {
    7: 1, 8: 1, 10: 1, 11: 1, 14: 1, 15: 1, 16: 1, 25: 1, 26: 1, 28: 4, 29: 4, 30: 3
  },
  selectedDay: 28,
  selectedDayLabel: 'Monday 28 September - 4 staff',
  staffTrips: [
    {
      name: 'Sarah Jenkins',
      empNo: 'EBB01',
      dept: 'Marketing Manager',
      trip: 'Penang • Client visit',
      dates: '28-30 Sep 2026',
      status: 'Approved'
    },
    {
      name: 'Marcus Tan',
      empNo: '004177',
      dept: 'Senior Engineer',
      trip: 'Penang • Client visit',
      dates: '28-30 Sep 2026',
      status: 'Approved'
    },
    {
      name: 'Daniel Lee',
      empNo: '000582',
      dept: 'Operations Specialist',
      trip: 'Singapore • Tech Conference',
      dates: '28-29 Sep 2026',
      status: 'Pending'
    },
    {
      name: 'Aisha Omar',
      empNo: '0000101',
      dept: 'Lead Designer',
      trip: 'Penang • Client visit',
      dates: '28-30 Sep 2026',
      status: 'Approved'
    }
  ]
};

window.CLAIM_OPTIONS = [
  {
    id: 'benefit',
    name: 'Benefit Claim',
    icon: '<i class="fa-solid fa-gift" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'car_maint', name: 'CAR MAINTENANCE', entitled: 1000.00, claimed: 0.00, pending: 197.00, usable: 803.00 },
      { id: 'personal_allow', name: 'PERSONAL ALLOWANCE', entitled: 1000.00, claimed: 0.00, pending: 530.00, usable: 470.00 },
      { id: 'mobile_phone', name: 'MOBILE PHONE', entitled: 900.00, claimed: 0.00, pending: 120.00, usable: 780.00 },
      { id: 'optical_dental', name: 'OPTICAL & DENTAL', entitled: 1000.00, claimed: 250.00, pending: 0.00, usable: 750.00 }
    ]
  },
  {
    id: 'medical',
    name: 'Medical Claim',
    icon: '<i class="fa-solid fa-briefcase-medical" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'gp_clinic', name: 'OUTPATIENT GP CLINIC', entitled: 800.00, claimed: 300.00, pending: 0.00, usable: 500.00 },
      { id: 'specialist', name: 'SPECIALIST CONSULTATION', entitled: 500.00, claimed: 150.00, pending: 0.00, usable: 350.00 },
      { id: 'pharmacy', name: 'PHARMACY & MEDICATION', entitled: 300.00, claimed: 0.00, pending: 50.00, usable: 250.00 }
    ]
  },
  {
    id: 'ot',
    name: 'OT Claim',
    icon: '<i class="fa-solid fa-clock" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'ot_meal', name: 'OVERTIME MEAL ALLOWANCE', entitled: 400.00, claimed: 180.00, pending: 35.00, usable: 185.00 },
      { id: 'ot_transport', name: 'NIGHT TRANSPORT & TAXI', entitled: 400.00, claimed: 160.00, pending: 42.00, usable: 198.00 }
    ]
  },
  {
    id: 'travel',
    name: 'Travel Mileage',
    icon: '<i class="fa-solid fa-car" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'mileage', name: 'MILEAGE (RM0.80/KM)', entitled: 1000.00, claimed: 420.00, pending: 45.00, usable: 535.00 },
      { id: 'tolls_parking', name: 'PARKING & TOLL RECEIPTS', entitled: 300.00, claimed: 80.00, pending: 24.00, usable: 196.00 }
    ]
  },
  {
    id: 'travel_request',
    name: 'Travel Request',
    icon: '<i class="fa-solid fa-plane" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'travel_req', name: 'TRAVEL REQUEST', entitled: 5000.00, claimed: 1200.00, pending: 0.00, usable: 3800.00 }
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '<i class="fa-solid fa-utensils" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'client_dining', name: 'CLIENT DINING & LUNCH', entitled: 500.00, claimed: 110.00, pending: 0.00, usable: 390.00 }
    ]
  },
  {
    id: 'advance',
    name: 'Advance',
    icon: '<i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'travel_adv', name: 'OVERSEAS TRAVEL ADVANCE', entitled: 2000.00, claimed: 500.00, pending: 0.00, usable: 1500.00 }
    ]
  },
  {
    id: 'expenses',
    name: 'Expenses Claim',
    icon: '<i class="fa-solid fa-receipt" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: [
      { id: 'office_supplies', name: 'OFFICE SUPPLIES & PRINTING', entitled: 400.00, claimed: 120.00, pending: 0.00, usable: 280.00 }
    ]
  },
  {
    id: 'history',
    name: 'Claim History',
    icon: '<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: []
  },
  {
    id: 'summary',
    name: 'Claim Summary',
    icon: '<i class="fa-solid fa-chart-pie" aria-hidden="true"></i>',
    entitlementYear: '2026',
    subCategories: []
  }
];

window.MANAGER_OPTIONS = [
  { id: 'benefit_highlight', name: 'Benefit Highlight', icon: '<i class="fa-solid fa-star" aria-hidden="true"></i>', link: 'options/benefit-highlight.html' },
  { id: 'staff_entitlement', name: 'Staff Benefit Entitlement', icon: '<i class="fa-solid fa-id-card" aria-hidden="true"></i>', link: 'options/staff-entitlement.html' },
  { id: 'expenses_highlight', name: 'Expense Highlight', icon: '<i class="fa-solid fa-chart-line" aria-hidden="true"></i>', link: 'options/expenses-highlight.html' },
  { id: 'staff_summary', name: 'Staff Claim Summary', icon: '<i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>', link: 'options/staff-summary.html' }
];

window.MOCK_STAFF_ENTITLEMENTS = [
  { name: 'Sarah Jenkins', empNo: 'EBB01', dept: 'Marketing Lead', entitlement: 3800.00, used: 1250.00, balance: 2550.00, pct: '32.9%' },
  { name: 'Marcus Tan', empNo: '004177', dept: 'Senior Engineer', entitlement: 3800.00, used: 950.00, balance: 2850.00, pct: '25.0%' },
  { name: 'Aisha Omar', empNo: '0000101', dept: 'Product Designer', entitlement: 3800.00, used: 680.00, balance: 3120.00, pct: '17.8%' },
  { name: 'Daniel Lee', empNo: '000582', dept: 'Operations Specialist', entitlement: 3800.00, used: 1420.00, balance: 2380.00, pct: '37.4%' },
  { name: 'Ahmad Razali', empNo: '001290', dept: 'Account Manager', entitlement: 4500.00, used: 1890.00, balance: 2610.00, pct: '42.0%' }
];

window.MOCK_TEAM_APPROVALS = [
  {
    id: 1,
    docRef: 'CBF000000000025',
    userName: 'Farhan binti rahmat',
    empNo: 'EBB12',
    dept: 'Operations • Quality Assurance',
    avatar: 'FR',
    avatarBg: 'rgba(124, 58, 237, 0.15)',
    avatarColor: '#7c3aed',
    title: 'Personal Allowance Claim',
    purpose: 'Purpose',
    optionName: 'Benefit Claim',
    subCatName: 'PERSONAL ALLOWANCE',
    benefitType: 'PERSONAL ALLOWANCE',
    entitlementYear: '2019',
    period: '201902',
    fromDate: '4 Sep 2019',
    toDate: '4 Sep 2019',
    receiptNo: 'Receipt',
    otherRef: 'Reference',
    currency: 'INDONESIAN RUPIAH',
    amount: -5.00,
    claimQuantity: '0',
    remarks: 'Remarks |undefined|undefined',
    claimDate: '4 Sep 2019',
    submitDate: '4 Sep 2019',
    date: '4 Sep 2019',
    hours: '0.0 hrs',
    receipt: 'Receipt #CBF-25',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 2,
    docRef: 'CMD000000000133',
    userName: 'Low chin hao',
    empNo: 'EBB05',
    dept: 'IT Support & Systems',
    avatar: 'LC',
    avatarBg: 'rgba(16, 185, 129, 0.15)',
    avatarColor: '#10b981',
    title: 'Outpatient Clinic Consultation',
    purpose: 'Outpatient clinic visit and doctor consultation',
    optionName: 'Medical Claim',
    subCatName: 'Select Benefit',
    benefitType: 'Select Benefit',
    medicalType: 'Select Benefit',
    benefitYear: '2016',
    entitledBalance: '0.00',
    usableBalance: '0.00',
    claimPeriodStart: '201601',
    claimPeriodEnd: '201601',
    receiptDate: '09/03/2016',
    receiptNo: '',
    claimTotal: '100.00',
    amount: 100.00,
    remarks: '',
    patientType: 'Employee',
    patientName: '',
    patientNameError: 'Please Select Patient Name',
    treatmentType: 'Out Patient',
    clinicLocation: '- Select Location -',
    clinicName: '- Select Clinic /Hospital -',
    sicknessType: '- Select Sickness -',
    detailExpenses: 'CONSULTATION',
    detailAmount: '0.00',
    detailCurrency: 'RINGGIT MALAYSIA',
    detailForexRate: '1.0000',
    detailLocalAmount: '100.00',
    claimDate: '09/03/2016',
    submitDate: '09/03/2016',
    date: '09/03/2016',
    period: '201601',
    hours: '1.0 hrs',
    receipt: 'Qualitas Medical Receipt #CMD-133',
    status: 'pending',
    docStatus: 'Final Approval'
  },
  {
    id: 3,
    docRef: 'BXT000000000283',
    userName: 'Farhan binti rahmat',
    empNo: 'EBB12',
    dept: 'Operations • Quality Assurance',
    avatar: 'FR',
    avatarBg: 'rgba(124, 58, 237, 0.15)',
    avatarColor: '#7c3aed',
    title: 'Overtime 1.5 OT Evening Session',
    purpose: 'OTHERS',
    optionName: 'OT Claim',
    subCatName: '1.5 OT',
    benefitType: '1.5 OT',
    otType: '1.5 OT',
    period: '2024',
    otDate: '15/04/2024',
    startTime: '18:57:00',
    endTime: '23:57:00',
    otHours: '0',
    crossDay: 'False',
    breakHours: '1 Hour',
    breakMinutes: '- Select Minute -',
    project: '- Select Project -',
    reason: 'OTHERS',
    mealAllowanceAmount: '0',
    mealAllowance: '- Select Meal Allowance -',
    transport: '- Select Transport -',
    distance: '0',
    way: '- Select Way -',
    mileageAmount: '0',
    remarks: 'check again for now',
    claimDate: '15/04/2024',
    submitDate: '15/04/2024',
    date: '15/04/2024',
    amount: 85.00,
    hours: '5.0 hrs',
    receipt: 'Overtime Log #BXT-283',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 4,
    docRef: 'CBF000000000029',
    userName: 'Sarah Jenkins',
    empNo: 'EBB01',
    dept: 'Marketing Lead • Digital Team',
    avatar: 'SC',
    avatarBg: 'rgba(124, 58, 237, 0.15)',
    avatarColor: '#7c3aed',
    title: 'Executive Optical & Health Checkup',
    purpose: 'Annual optical prescription & medical wellness checkup',
    optionName: 'Benefit Claim',
    subCatName: 'Optical & Wellness',
    benefitType: 'OPTICAL & WELLNESS',
    entitlementYear: '2026',
    period: '202609',
    fromDate: '12 Sep 2026',
    toDate: '12 Sep 2026',
    receiptNo: 'FP-8891',
    otherRef: 'OPT-2026',
    currency: 'RINGGIT MALAYSIA',
    amount: 250.00,
    claimQuantity: '1',
    remarks: 'Prescription lenses and optical examination at Focus Point',
    claimDate: '12 Sep 2026',
    submitDate: '13 Sep 2026',
    date: '13 Sep 2026',
    hours: '0.0 hrs',
    receipt: 'Focus Point Receipt #FP-8891',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 5,
    docRef: 'CMD000000000140',
    userName: 'Jessica Wong',
    empNo: '003891',
    dept: 'Regional Sales Director',
    avatar: 'JW',
    avatarBg: 'rgba(236, 72, 153, 0.15)',
    avatarColor: '#ec4899',
    title: 'Outpatient Clinic Consultation & Medication',
    purpose: 'Acute flu treatment and doctor consultation at panel clinic',
    optionName: 'Medical Claim',
    subCatName: 'General Consultation',
    benefitType: 'General Consultation',
    medicalType: 'General Consultation',
    benefitYear: '2026',
    entitledBalance: '800.00',
    usableBalance: '665.00',
    claimPeriodStart: '202609',
    claimPeriodEnd: '202609',
    receiptDate: '07/09/2026',
    receiptNo: 'QC-5510',
    claimTotal: '135.00',
    amount: 135.00,
    remarks: 'Medical consultation & prescribed antibiotics',
    patientType: 'Employee',
    patientName: 'Jessica Wong',
    patientNameError: '',
    treatmentType: 'Out Patient',
    clinicLocation: 'Kuala Lumpur',
    clinicName: 'Qualitas Health Clinic KLCC',
    sicknessType: 'Acute Upper Respiratory Infection',
    detailExpenses: 'CONSULTATION & MEDICATION',
    detailAmount: '135.00',
    detailCurrency: 'RINGGIT MALAYSIA',
    detailForexRate: '1.0000',
    detailLocalAmount: '135.00',
    claimDate: '07 Sep 2026',
    submitDate: '08 Sep 2026',
    date: '08 Sep 2026',
    period: '2026-09',
    hours: '1.5 hrs',
    receipt: 'Qualitas Clinic Receipt #QC-5510',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 6,
    docRef: 'CTR000000000088',
    userName: 'Daniel Lee',
    empNo: '000582',
    dept: 'Operations Specialist • Logistics',
    avatar: 'DL',
    avatarBg: 'rgba(59, 130, 246, 0.15)',
    avatarColor: '#3b82f6',
    title: 'Site Inspection Travel Mileage (120km)',
    purpose: 'Client facility inspection and business development travel',
    optionName: 'Travel Claim',
    subCatName: 'Mileage Claim',
    benefitType: 'Mileage Claim',
    travelType: 'Mileage Claim',
    claimDate: '13 Sep 2026',
    submitDate: '14 Sep 2026',
    date: '14 Sep 2026',
    period: '2026-09',
    amount: 96.00,
    hours: '3.5 hrs',
    destination: 'Penang Logistics Hub & Northern Depot',
    transportMode: 'Personal Vehicle (Sedan)',
    distance: '120 km',
    travelRequestNo: 'CTR000000000012',
    claimDateFrom: '01/02/2024',
    claimDateTo: '05/02/2024',
    costCentre: 'FINANCE & ADMIN',
    chargeTo: 'MYVI',
    project: '- Select Project -',
    currency: 'RINGGIT MALAYSIA',
    claimTotal: '96.00',
    mileageRate: 'RM 0.80 / km',
    mileageAmount: '96.00',
    tollsParking: '24.00',
    mileageItems: [
      { description: 'check item', origin: 'HOME', destination: 'HOME', dates: '23/04/2024 - 23/04/2024', distance: '20.00', amount: '2.00' },
      { description: 'check again', origin: 'HOME', destination: 'HOME', dates: '23/04/2024 - 23/04/2024', distance: '20.00', amount: '2.00' },
      { description: 'check again', origin: 'HOME', destination: 'HOME', dates: '23/04/2024 - 23/04/2024', distance: '20.00', amount: '2.00' }
    ],
    travelItems: [
      { origin: 'HOME', destination: 'HOME', dates: '23/04/2024 - 23/04/2024', amount: '45.00' },
      { origin: 'HOME', destination: 'HOME', dates: '23/04/2024 - 23/04/2024', amount: '35.00' },
      { origin: 'HOME', destination: 'HOME', dates: '23/04/2024 - 23/04/2024', amount: '45.00' }
    ],
    expenseItems: [
      { expense: 'DAILY TRAVEL ALLOWANCE', dates: '23/04/2024 - 23/04/2024', amount: '123.00' },
      { expense: 'DAILY TRAVEL ALLOWANCE', dates: '23/04/2024 - 23/04/2024', amount: '35.00' },
      { expense: 'DAILY TRAVEL ALLOWANCE', dates: '23/04/2024 - 23/04/2024', amount: '36.00' }
    ],
    receipt: 'GPS Log & Toll Receipt #TL-8821',
    remarks: 'Claim for travelling to client sites',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 12,
    docRef: 'CRT000000000094',
    userName: 'Low chin hao',
    empNo: 'EBB05',
    dept: 'Finance & Admin',
    avatar: 'LC',
    avatarBg: 'rgba(14, 165, 233, 0.15)',
    avatarColor: '#0ea5e9',
    title: 'Ipoh Business Travel Request',
    optionName: 'Travel Request',
    subCatName: 'Business Trip',
    benefitType: 'Select Benefit',
    travelType: '- Select Travel Type -',
    period: '202403',
    travelDateFrom: '17/03/2024',
    travelDateTo: '20/03/2024',
    claimDate: '17/03/2024 - 20/03/2024',
    submitDate: '17/03/2024',
    date: '17/03/2024',
    trainingReference: '- Select Training Ref -',
    destination: '',
    purpose: 'Business Trip',
    reason: '- Select Reason -',
    carType: 'Personal',
    passengers: '',
    chargeTo: 'MD',
    accommodation: 'No',
    flight: 'No',
    remarks: 'Testing submission',
    attachment: '42ffbd04-1b10-4bef-ac4d-47e2857c18f7.jpg',
    amount: 0,
    hours: '-',
    taskItems: [
      { task: '-', purpose: 'Testing submission', location: 'Ipoh', dates: '17/03/2024 - 20/03/2024' }
    ],
    requestTravelItems: [
      { origin: 'KL OFFICE', destination: 'IPOH', dates: '17/03/2024 - 20/03/2024', estimatedCost: '1,000.00' }
    ],
    accommodationItems: [
      { hotel: 'WESTIN HOTEL', checkIn: '17 Mar 2024', checkOut: '20 Mar 2024' }
    ],
    receipt: '42ffbd04-1b10-4bef-ac4d-47e2857c18f7.jpg',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 7,
    docRef: 'CET000000000022',
    userName: 'Farhan binti rahmat',
    empNo: 'EBB12',
    dept: 'Benefits & Compensation',
    avatar: 'FR',
    avatarBg: 'rgba(245, 158, 11, 0.15)',
    avatarColor: '#f59e0b',
    title: 'Entertainment Claim January 2025',
    purpose: '',
    optionName: 'Entertainment Claim',
    subCatName: 'Entertainment',
    benefitType: '',
    period: '202501',
    travellingMileageClaimNo: 'CTM000000000033, Amount 0.00',
    claimDateFrom: '16/09/2025',
    claimDateTo: '29/09/2025',
    claimDate: '16/09/2025 - 29/09/2025',
    submitDate: '16/09/2025',
    date: '16/09/2025',
    costCentre: 'ADMIN',
    project: 'HR/ESS Project',
    entertainedPersonOrg: '',
    placeEntertained: '',
    currency: 'RINGGIT MALAYSIA',
    totalAmount: '0.00',
    internalAttendeeCount: '0',
    externalAttendeeCount: '0',
    avgPerPax: '0.00',
    boardApprove: true,
    giftEnt: false,
    trvHosp: false,
    remarks: '',
    amount: 0,
    hours: '-',
    entertainmentDetails: [
      { expense: 'ENTERTAINMENT', date: '08/11/2024', amount: '678.00' }
    ],
    internalAttendees: [
      { employee: '', position: 'BENEFITS & COMPENSATION EXECUTIVE', company: 'PEOPLE QUEST SDN BHD', department: 'HUMAN RESOURCE' }
    ],
    externalAttendees: [
      { attendee: 'aidjcp;', company: 'fdggsfdvg', designation: 'sgvfc', relationship: '' }
    ],
    receipt: 'Entertainment supporting document',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 8,
    docRef: 'CAV000000000045',
    userName: 'Farhan binti rahmat',
    empNo: 'EBB12',
    dept: 'Benefits & Compensation',
    avatar: 'FR',
    avatarBg: 'rgba(236, 72, 153, 0.15)',
    avatarColor: '#ec4899',
    title: 'Employee Welfare Advance',
    purpose: 'check Item',
    optionName: 'Advance Claim',
    subCatName: 'Employee Welfare',
    benefitType: 'EMPLOYEE WELFARE',
    advanceType: 'Miscellaneous Claim',
    claimType: 'Miscellaneous Claim',
    claimDateFrom: '26/04/2024',
    claimDateTo: '26/04/2024',
    claimDate: '26/04/2024 - 26/04/2024',
    submitDate: '26/04/2024',
    date: '26/04/2024',
    period: '202404',
    amount: 180.00,
    hours: '-',
    costCentre: 'AEON CO.(M) BHD - IPOH',
    project: 'HR/ESS Project',
    currency: 'RINGGIT MALAYSIA',
    claimTotal: '180.00',
    remarks: 'check item NOW',
    advanceExpenseItems: [
      { expense: 'EMPLOYEE WELFARE', description: 'ITEM A', amount: '23.00' },
      { expense: 'EMPLOYEE WELFARE', description: 'Item B', amount: '45.00' },
      { expense: 'EMPLOYEE WELFARE', description: 'Item C', amount: '32.00' },
      { expense: 'EMPLOYEE WELFARE', description: 'Item D', amount: '12.00' },
      { expense: 'EMPLOYEE WELFARE', description: 'Item E', amount: '45.00' },
      { expense: 'EMPLOYEE WELFARE', description: 'Item F', amount: '23.00' }
    ],
    receipt: 'Advance supporting document',
    status: 'pending',
    docStatus: 'Final Approval'
  },
  {
    id: 9,
    docRef: 'CAD000000000021',
    userName: 'Daniel Lee',
    empNo: '000582',
    dept: 'Operations Specialist • Logistics',
    avatar: 'DL',
    avatarBg: 'rgba(59, 130, 246, 0.15)',
    avatarColor: '#3b82f6',
    title: 'Project OOP Equipment Setup Advance',
    purpose: 'Out of pocket advance for Penang warehouse IoT sensor installation and temporary tools setup',
    optionName: 'Advance Claim',
    subCatName: 'Project OOP Advance',
    benefitType: 'Project OOP Advance',
    advanceType: 'Project OOP Advance',
    claimDate: '25 Sep 2026',
    submitDate: '26 Sep 2026',
    date: '26 Sep 2026',
    period: '2026-09',
    amount: 850.00,
    hours: '-',
    requiredDate: '25 Sep 2026',
    settlementDate: '10 Oct 2026',
    otherRef: 'ADV-2026-0905',
    currency: 'RINGGIT MALAYSIA',
    receipt: 'Requisition Form #ADV-2026-0905',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 10,
    docRef: 'CLM000000000162',
    userName: 'Asmawi idris',
    empNo: 'EBB15',
    dept: 'Management',
    avatar: 'AI',
    avatarBg: 'rgba(16, 185, 129, 0.15)',
    avatarColor: '#10b981',
    title: 'Entertainment for Staff',
    purpose: 'Entertainment for Staff',
    optionName: 'Expense Claim',
    subCatName: 'General Expense',
    benefitType: '',
    expenseType: 'General Expense',
    claimDateFrom: '01/11/2022',
    claimDateTo: '01/11/2022',
    claimDate: '01/11/2022',
    submitDate: '01/11/2022',
    date: '01/11/2022',
    period: '202211',
    benefitYear: '2022',
    amount: 1229.85,
    hours: '-',
    project: '-',
    costCentre: 'MANAGEMENT',
    currency: 'RINGGIT MALAYSIA',
    claimTotal: '1,229.85',
    remarks: '',
    itemizedDetails: [
      { description: 'Entertainment for Staff', amount: '1,229.85' }
    ],
    receipt: 'Expense supporting document',
    status: 'pending',
    docStatus: 'Submitted'
  },
  {
    id: 11,
    docRef: 'CEX000000000062',
    userName: 'Ahmad Razali',
    empNo: '001290',
    dept: 'Enterprise Sales & Account Management',
    avatar: 'AR',
    avatarBg: 'rgba(245, 158, 11, 0.15)',
    avatarColor: '#f59e0b',
    title: 'Q3 Enterprise Proposal Printing & Presentation Kits',
    purpose: 'Bulk purchase of office stationery, colour printing paper and presentation folders for client tenders',
    optionName: 'Expense Claim',
    subCatName: 'Office Supplies & Stationery',
    benefitType: 'Office Supplies & Stationery',
    expenseType: 'Office Supplies & Stationery',
    claimDate: '22 Sep 2026',
    submitDate: '23 Sep 2026',
    date: '23 Sep 2026',
    period: '2026-09',
    amount: 380.00,
    hours: '-',
    merchant: 'Popular Bookstore',
    receiptNo: 'PB-88412',
    taxInvoice: 'Yes (SST 6%)',
    currency: 'RINGGIT MALAYSIA',
    receipt: 'Popular Bookstore Invoice #PB-88412',
    status: 'pending',
    docStatus: 'Submitted'
  }
];

window.MOCK_MY_SUBMISSIONS = [
  {
    id: 'CLM-2026-0915',
    category: 'OVERSEAS TRAVEL ADVANCE',
    optionName: 'Advance Claim',
    date: '24 Sep 2026',
    amount: 1500.00,
    status: 'pending',
    statusText: 'Pending Approval',
    merchant: 'Finance Advance Desk',
    receipt: 'Requisition #ADV-2026-0902',
    icon: '💵'
  },
  {
    id: 'CLM-2026-0910',
    category: 'OFFICE SUPPLIES',
    optionName: 'Expense Claim',
    date: '22 Sep 2026',
    amount: 380.00,
    status: 'pending',
    statusText: 'Pending Approval',
    merchant: 'Popular Bookstore',
    receipt: 'Invoice #PB-88412',
    icon: '🧾'
  },
  {
    id: 'CLM-2026-0901',
    category: 'CAR MAINTENANCE',
    optionName: 'Benefit Claim',
    date: '12 Sep 2026',
    amount: 197.00,
    status: 'pending',
    statusText: 'Pending Approval',
    merchant: 'Teo Seng Car Workshop',
    receipt: 'Receipt #9821',
    icon: '🚗'
  },
  {
    id: 'CLM-2026-0888',
    category: 'OPTICAL & DENTAL',
    optionName: 'Benefit Claim',
    date: '05 Sep 2026',
    amount: 250.00,
    status: 'approved',
    statusText: 'Approved',
    merchant: 'Owndays Optical Store',
    receipt: 'Inv #OW-5510',
    icon: '👓'
  },
  {
    id: 'CLM-2026-0850',
    category: 'TRAVEL MILEAGE',
    optionName: 'Travel Mileage',
    date: '01 Sep 2026',
    amount: 85.50,
    status: 'approved',
    statusText: 'Approved',
    merchant: 'PLUS Expressway Toll',
    receipt: 'Touch n Go e-Wallet Statement',
    icon: '🚗'
  },
  {
    id: 'CLM-2026-0820',
    category: 'OUTPATIENT GP CLINIC',
    optionName: 'Medical Claim',
    date: '28 Aug 2026',
    amount: 120.00,
    status: 'approved',
    statusText: 'Approved',
    merchant: 'Qualitas Clinic Cyberjaya',
    receipt: 'Rec #QC-1120',
    icon: '🏥'
  },
  {
    id: 'CLM-2026-0790',
    category: 'CLIENT DINING',
    optionName: 'Entertainment',
    date: '20 Aug 2026',
    amount: 350.00,
    status: 'rejected',
    statusText: 'Rejected',
    merchant: 'The Steakhouse KL',
    receipt: 'Rec #SH-9012',
    icon: '🍽️',
    rejectReason: 'Exceeded maximum entertainment limit without pre-approval.'
  }
];




window.CLAIM_STATUS_RECORDS = window.MOCK_MY_SUBMISSIONS;

/* Shared Claims domain data. All current mobile routes derive identity, totals and drill-downs from these records. */
window.CLAIM_EMPLOYEES = {
  EBB01: { name: 'Sarah Jenkins', empNo: 'EBB01' },
  '004177': { name: 'Marcus Tan', empNo: '004177' },
  '0000101': { name: 'Aisha Omar', empNo: '0000101' },
  '000582': { name: 'Daniel Lee', empNo: '000582' },
  '001290': { name: 'Ahmad Razali', empNo: '001290' },
  EBB12: { name: 'Farhan binti rahmat', empNo: 'EBB12' },
  EBB05: { name: 'Low chin hao', empNo: 'EBB05' },
  '003891': { name: 'Jessica Wong', empNo: '003891' },
  EBB15: { name: 'Asmawi idris', empNo: 'EBB15' },
  '007216': { name: 'Hailizam Bin Mohamed Ikhsan', empNo: '007216' },
  '006611': { name: 'Por Suat Bee', empNo: '006611' },
  '008004': { name: 'Nurfarhana Binti Mohamad', empNo: '008004' },
  '009102': { name: 'Alex Tan Chin Hock', empNo: '009102' }
};

const claimEmployee = empNo => window.CLAIM_EMPLOYEES[String(empNo).replace(/^#/, '')];
window.MOCK_STAFF_ENTITLEMENTS.forEach(record => {
  const employee = claimEmployee(record.empNo);
  if (employee) record.name = employee.name;
});
window.MOCK_TEAM_APPROVALS.forEach(record => {
  const employee = claimEmployee(record.empNo);
  if (employee) record.userName = employee.name;
});

window.CLAIM_HIGHLIGHT_DATA = {
  benefit: [
    { empNo: 'EBB01', details: [
      { period: '202105', type: 'ENTERTAINMENT', amount: 3588 },
      { period: '202105', type: 'PERSONAL ALLOWANCE', amount: 1400 },
      { period: '202106', type: 'HAND PHONE SUBSIDY', amount: 299.99 },
      { period: '202106', type: 'CAR MAINTENANCE', amount: 146 },
      { period: '202107', type: 'MOBILE PHONE', amount: 20.34 },
      { period: '202103', type: 'CAR MAINTENANCE', amount: 4.99 }
    ] },
    { empNo: '004177', details: [
      { period: '202609', type: 'CAR MAINTENANCE', amount: 1850 },
      { period: '202609', type: 'PERSONAL ALLOWANCE', amount: 850 },
      { period: '202608', type: 'MOBILE PHONE', amount: 340 },
      { period: '202608', type: 'ENTERTAINMENT', amount: 200 }
    ] },
    { empNo: '007216', details: [
      { period: '202609', type: 'OPTICAL & DENTAL', amount: 1200 },
      { period: '202607', type: 'OUTPATIENT GP CLINIC', amount: 450 },
      { period: '202605', type: 'MOBILE PHONE', amount: 300 }
    ] },
    { empNo: '006611', details: [
      { period: '202608', type: 'CAR MAINTENANCE', amount: 950 },
      { period: '202606', type: 'PERSONAL ALLOWANCE', amount: 500 }
    ] },
    { empNo: '008004', details: [
      { period: '202609', type: 'OUTPATIENT GP CLINIC', amount: 580 },
      { period: '202607', type: 'MOBILE PHONE', amount: 300 }
    ] },
    { empNo: '009102', details: [
      { period: '202609', type: 'SPECIALIST CONSULTATION', amount: 450 },
      { period: '202608', type: 'MOBILE PHONE', amount: 200 }
    ] }
  ],
  expense: [
    { empNo: '004177', details: [
      { period: '202609', type: 'CLIENT DINING & ENTERTAINMENT', amount: 2450 },
      { period: '202609', type: 'TRAVEL MILEAGE & TOLLS', amount: 1200 },
      { period: '202608', type: 'OFFICE SUPPLIES & PRINTING', amount: 600 }
    ] },
    { empNo: 'EBB01', details: [
      { period: '202105', type: 'CLIENT DINING', amount: 1850 },
      { period: '202105', type: 'NIGHT TRANSPORT & TAXI', amount: 830 },
      { period: '202106', type: 'TRAVEL MILEAGE', amount: 500 }
    ] },
    { empNo: '007216', details: [
      { period: '202609', type: 'TRAVEL MILEAGE & TOLLS', amount: 1620 },
      { period: '202607', type: 'OFFICE SUPPLIES & PRINTING', amount: 800 }
    ] },
    { empNo: '006611', details: [
      { period: '202608', type: 'CLIENT ENTERTAINMENT', amount: 750 },
      { period: '202606', type: 'NIGHT TRANSPORT & TAXI', amount: 400 }
    ] },
    { empNo: '008004', details: [
      { period: '202609', type: 'OFFICE SUPPLIES & PRINTING', amount: 620 },
      { period: '202607', type: 'TRAVEL MILEAGE', amount: 300 }
    ] },
    { empNo: '009102', details: [
      { period: '202609', type: 'NIGHT TRANSPORT & TAXI', amount: 410 },
      { period: '202608', type: 'TRAVEL MILEAGE', amount: 300 }
    ] }
  ]
};
Object.values(window.CLAIM_HIGHLIGHT_DATA).flat().forEach(record => {
  const employee = claimEmployee(record.empNo);
  record.name = employee ? employee.name : record.empNo;
  record.amount = record.details.reduce((sum, detail) => sum + detail.amount, 0);
});

const benefitTypes = window.CLAIM_OPTIONS.find(option => option.id === 'benefit').subCategories;
const medicalTypes = window.CLAIM_OPTIONS.find(option => option.id === 'medical').subCategories;
window.CLAIM_STAFF_ENTITLEMENT_RECORDS = [
  { empNo: 'EBB01', category: benefitTypes[0] },
  { empNo: 'EBB01', category: benefitTypes[2] },
  { empNo: '004177', category: benefitTypes[3] },
  { empNo: '0000101', category: medicalTypes[0] },
  { empNo: '000582', category: medicalTypes[1] }
].map(record => ({ empNo: record.empNo, employeeName: claimEmployee(record.empNo).name, categoryName: record.category.name, id: record.category.id, entitled: record.category.entitled, claimed: record.category.claimed, pending: record.category.pending, usable: record.category.usable }));

window.CLAIM_SUMMARY_RECORDS = [
  { id: 'SUM-2026-0501', tab: 'medical', dateRange: '01/05/2026 - 09/05/2026', isoDate: '2026-05-01', period: '202605', expense: 'PHARMACY', empNo: 'EBB12', merchant: 'Guardian Pharmacy KLCC', amount: 69.90, status: 'approved', statusText: 'Approved' },
  { id: 'SUM-2026-0510', tab: 'medical', dateRange: '10/05/2026 - 20/05/2026', isoDate: '2026-05-10', period: '202605', expense: 'PHARMACY', empNo: 'EBB12', merchant: 'Guardian Pharmacy KLCC', amount: 350, status: 'pending', statusText: 'Pending Approval' },
  { id: 'SUM-2026-0521', tab: 'medical', dateRange: '21/05/2026 - 25/05/2026', isoDate: '2026-05-21', period: '202605', expense: 'PHARMACY', empNo: 'EBB01', merchant: 'Watsons Mid Valley', amount: 70, status: 'rejected', statusText: 'Rejected' },
  { id: 'SUM-2026-0502', tab: 'benefit', dateRange: '01/05/2026 - 01/05/2026', isoDate: '2026-05-01', period: '202605', expense: 'MOBILE PHONE', empNo: 'EBB12', merchant: 'Maxis Mobile MY', amount: 120, status: 'approved', statusText: 'Approved' },
  { id: 'SUM-2026-0511', tab: 'benefit', dateRange: '10/05/2026 - 20/05/2026', isoDate: '2026-05-10', period: '202605', expense: 'CAR MAINTENANCE', empNo: 'EBB12', merchant: 'Teo Seng Car Workshop', amount: 350, status: 'pending', statusText: 'Pending Approval' },
  { id: 'SUM-2026-0512', tab: 'entertainment', dateRange: '12/05/2026 - 18/05/2026', isoDate: '2026-05-12', period: '202605', expense: 'CLIENT ENTERTAINMENT', empNo: 'EBB12', merchant: 'Naughty Nuri’s Pavilion', amount: 270.60, status: 'approved', statusText: 'Approved' },
  { id: 'SUM-2026-0520', tab: 'entertainment', dateRange: '20/05/2026 - 25/05/2026', isoDate: '2026-05-20', period: '202605', expense: 'CLIENT ENTERTAINMENT', empNo: 'EBB12', merchant: 'Chili’s KLCC', amount: 220, status: 'submitted', statusText: 'Submitted' }
].map(record => ({ ...record, empName: claimEmployee(record.empNo).name }));
window.CLAIM_HISTORY_RECORDS = window.CLAIM_SUMMARY_RECORDS.reduce((groups, record) => {
  (groups[record.tab] ||= []).push(record);
  return groups;
}, {});

const sharedTravelTrips = [
  { id: 'melaka-workshop', empNo: 'EBB01', dept: 'Senior Product Designer', destination: 'Melaka', purpose: 'Product workshop', travelDateFrom: '2026-09-07', travelDateTo: '2026-09-07', status: 'Approved' },
  { id: 'johor-site-inspection', empNo: '004177', dept: 'Senior Engineer', destination: 'Johor Bahru', purpose: 'Site inspection', travelDateFrom: '2026-09-08', travelDateTo: '2026-09-08', status: 'Approved' },
  { id: 'penang-user-research', empNo: '0000101', dept: 'Product Designer', destination: 'Penang', purpose: 'User research', travelDateFrom: '2026-09-10', travelDateTo: '2026-09-11', status: 'Approved' },
  { id: 'ipoh-vendor-audit', empNo: '000582', dept: 'Operations Specialist', destination: 'Ipoh', purpose: 'Vendor audit', travelDateFrom: '2026-09-14', travelDateTo: '2026-09-16', status: 'Pending' },
  { id: 'kuantan-client-meeting', empNo: '001290', dept: 'Account Manager', destination: 'Kuantan', purpose: 'Client meeting', travelDateFrom: '2026-09-25', travelDateTo: '2026-09-26', status: 'Approved' },
  { id: 'penang-branch-review', empNo: '007216', dept: 'Finance Executive', destination: 'Penang', purpose: 'Branch review', travelDateFrom: '2026-09-28', travelDateTo: '2026-09-28', status: 'Approved' },
  { id: 'penang-client-visit', empNo: 'EBB01', dept: 'Senior Product Designer', destination: 'Penang', purpose: 'Client visit', travelDateFrom: '2026-09-28', travelDateTo: '2026-09-30', status: 'Approved' },
  { id: 'singapore-tech-conference', empNo: '004177', dept: 'Senior Engineer', destination: 'Singapore', purpose: 'Tech conference', travelDateFrom: '2026-09-28', travelDateTo: '2026-09-30', status: 'Pending' }
].map(record => ({
  ...record, name: claimEmployee(record.empNo).name, trip: record.destination + ' • ' + record.purpose
}));
window.TEAM_TRAVEL_DATA.staffTrips = sharedTravelTrips;
window.TEAM_TRAVEL_DATA.staffCount = new Set(sharedTravelTrips.map(record => record.empNo)).size;
window.TEAM_TRAVEL_DATA.tripsCount = sharedTravelTrips.length;
window.TEAM_TRAVEL_DATA.travelBadges = {};
sharedTravelTrips.forEach(record => {
  for (let day = Number(record.travelDateFrom.slice(-2)); day <= Number(record.travelDateTo.slice(-2)); day += 1) {
    window.TEAM_TRAVEL_DATA.travelBadges[day] = (window.TEAM_TRAVEL_DATA.travelBadges[day] || 0) + 1;
  }
});





