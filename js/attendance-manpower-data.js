// Local preview fixtures. Summary figures and the visible employee rows are
// transcribed from the supplied screenshots. Their assignment to the existing
// demo company groups is for preview navigation, not a production association.
// Screenshots show only part of some employee lists: headcount is the supplied
// total, not the number of visible employee rows.
const manpowerWorkEmployees = [
  ['000054', 'Anderson Ng', 'Account Executive'],
  ['000070', 'Yee Seong Liew', 'Payables Executive'],
  ['0099', 'Hanis', 'Admin Executive'],
  ['500007', 'Tony', 'HR Manager'],
  ['500012', 'Sim', 'Recruitment Officer'],
  ['EBB01', 'Muhammad ali bin man', 'Operation Director'],
  ['JOF0023', 'Safiq ahmad', 'Account Executive']
].map(([empNo, name, jobTitle]) => ({ empNo, name, jobTitle, scheduledHours: 8, workHours: 0 }));
const manpowerNoWorkEmployees = [
  ['00012345', 'TEST', 'Account Executive'],
  ['012345', 'hey', 'Bartender'],
  ['620578', 'Bhim Bahadur Tamang', 'Production Operator'],
  ['620657', 'Pritiman Gurung', 'Production Operator'],
  ['620675', 'HAFIZUR RAHMAN', 'Operation Director'],
  ['620717', 'MD SHOHEL', 'Production Operator'],
  ['620803', 'SHER BAHADUR THAPA MAGAR', 'Production Operator']
].map(([empNo, name, jobTitle]) => ({ empNo, name, jobTitle }));
const manpowerOtEmployees = [
  ['0000101', 'Lee Soon Hock', 'Account Manager', 1],
  ['000020', 'Tay Siow Kung', 'BFT & COM. Executive', 1],
  ['000031', 'Navin', 'Account Executive', null],
  ['000033', 'Philip', 'Account Executive', 1],
  ['000053', 'Tony stunk', 'Barista', 1],
  ['000072', 'Ang hin kee', 'Barista', 1]
].map(([empNo, name, jobTitle, hours]) => ({ empNo, name, jobTitle, hours }));

const manpowerPreviewDetails = {
  1: {
    workShift: [
      { id: 'shift-0700', shift: '0700:1500', headcount: 20, scheduledHours: 160, workHours: 0, employees: manpowerWorkEmployees }
    ]
  },
  2: {
    workShift: [
      { id: 'shift-0800', shift: '0800:1700(B)', headcount: 1, scheduledHours: 8, workHours: 0, employees: [
        { empNo: 'EBB02', name: 'Wong Kah Fai', jobTitle: 'HR Executive', scheduledHours: 8, workHours: 0 }
      ] }
    ]
  },
  3: {
    noWork: [
      { id: 'no-work', shift: 'No Work', headcount: 13, employees: manpowerNoWorkEmployees },
      { id: 'rest-day', date: '2026-09-20', shift: 'Rest Day', headcount: 5, employees: [] }
    ]
  },
  4: {
    workShift: [
      { id: 'shift-0815', shift: '0815:1715', headcount: 2, scheduledHours: 16, workHours: 0, employees: [
        { empNo: 'EBB05', name: 'David Miller', jobTitle: 'Manager', scheduledHours: 8, workHours: 0 },
        { empNo: 'EBB06', name: 'Jessica Taylor', jobTitle: 'Executive', scheduledHours: 8, workHours: 0 }
      ] },
      { id: 'shift-0830', shift: '0830:1730', headcount: 1, scheduledHours: 8, workHours: 0, employees: [
        { empNo: 'EBB04', name: 'Michael Chen', jobTitle: 'Executive', scheduledHours: 8, workHours: 0 }
      ] }
    ],
    otPlan: [
      { id: 'ot-before', shift: '8.30:17.30W', otType: 'OT 1.5 BEFORE WORK', headcount: 30, hours: 30, employees: manpowerOtEmployees },
      { id: 'ot-15', shift: '8.30:17.30W', otType: '1.5 OT', headcount: 62, hours: 105, employees: [] }
    ]
  },
  5: {
    workShift: [
      { id: 'shift-w01', shift: '8.30:17.30W', headcount: 236, scheduledHours: 1888, workHours: 0, employees: [
        { empNo: '0000101', name: 'Lee Soon Hock', jobTitle: 'Account Manager', scheduledHours: 8, workHours: 0 }
      ] }
    ],
    onLeave: [
      { id: 'leave-annual', shift: '8.30:17.30W', leaveType: 'ANNUAL LEAVE', headcount: 1, employees: [
        { empNo: 'EBB226', name: 'Azhar bin Omar', jobTitle: 'Production Operator', leaveType: 'ANNUAL LEAVE', leaveDay: 1 }
      ] },
      { id: 'leave-unpaid', shift: '8.30:17.30W', leaveType: 'UNPAID LEAVE', headcount: 2, employees: [] },
      { id: 'leave-afternoon-annual', date: '2026-09-20', shift: '14.00:22.00W', leaveType: 'ANNUAL LEAVE', headcount: 2, employees: [] },
      { id: 'leave-afternoon-medical', date: '2026-09-20', shift: '14.00:22.00W', leaveType: 'MEDICAL LEAVE', headcount: 1, employees: [] }
    ]
  }
};

function getManpowerPreviewRecords(groupId, type, dateKey) {
  return (manpowerPreviewDetails[groupId]?.[type] || []).filter(record => !record.date || record.date === dateKey);
}

function getManpowerPreviewCounts(groupId, dateKey) {
  return Object.fromEntries(['workShift', 'noWork', 'otPlan', 'onLeave'].map(type => [
    type, getManpowerPreviewRecords(groupId, type, dateKey).reduce((total, record) => total + record.headcount, 0)
  ]));
}
