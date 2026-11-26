// Employee totals and daily records come from the supplied screenshots.
// Department, position and previously missing branch values are supplementary preview examples.
// Period totals cannot be distributed across dates without the missing records.
window.ATTENDANCE_HOURS_HIGHLIGHTS = {
  overtime: {
    title: 'Overtime Highlights', metric: 'Approved OT Hours',
    from: '2026-09-08', to: '2026-10-07',
    employees: [
      { empNo: '1122333', name: 'Test2', hours: 7.50, branch: 'TIMES SQ', department: 'Operations', position: 'Operations Executive', details: [
        { date: '2026-09-08', description: '1.5 OT', hours: 2.50 },
        { date: '2026-09-22', description: '1.5 OT', hours: 2.00 },
        { date: '2026-09-23', description: 'OT 1.5 BEFORE WORK', hours: 0.50 },
        { date: '2026-09-29', description: '1.5 OT', hours: 2.00 },
        { date: '2026-10-04', description: 'OT 1.5 BEFORE WORK', hours: 0.50 }
      ] },
      { empNo: 'EBB16', name: 'Justine Ee Su May', hours: 13.50, branch: 'TIMES SQ', department: 'Sales', position: 'Sales Executive', details: [] },
      { empNo: 'SBI064', name: 'Syarikah', hours: 9.00, branch: 'USJ 20', department: 'Retail Operations', position: 'Store Supervisor', details: [] },
      { empNo: '00041', name: 'Muazzin', hours: 4.50, branch: 'TIMES SQ', department: 'Customer Service', position: 'Customer Service Officer', details: [] },
      { empNo: '99107', name: 'Tahti Binti Tantu', hours: 5.00, branch: 'ALOR SETAR', department: 'Human Resources', position: 'HR Executive', details: [] },
      { empNo: 'EBB202', name: 'Mohd Adli Bin Yahya', hours: 9.00, branch: 'BANGI', department: 'Logistics', position: 'Logistics Coordinator', details: [] },
      { empNo: 'EBB55', name: 'Ahmad Bin Ali', hours: 9.50, branch: 'TIMES SQ', department: 'Retail Operations', position: 'Store Manager', details: [] },
      { empNo: 'EBB76', name: 'Paul Simon', hours: 4.00, branch: 'BANGI', department: 'Information Technology', position: 'IT Executive', details: [] }
    ]
  },
  attendance: {
    title: 'Attendance Highlights', metric: 'Total Lost Hours', detailTitle: 'Staff Attendance Details',
    from: '2026-09-08', to: '2026-10-07',
    employees: [
      { empNo: '000008', name: 'Aqilah Antasha', hours: 128.50, branch: 'USJ 20', department: 'Operations', position: 'Operations Executive', details: [
        { date: '2026-09-17', shift: '8:00 AM – 5:00 PM', clockTimes: ['1957'], hours: 8.00, exception: 'Absent' },
        { date: '2026-09-18', shift: '8:00 AM – 5:30 PM', clockTimes: ['0755', '1202', '1258', '1731', '1957'], hours: 8.50, exception: 'Absent' },
        { date: '2026-09-19', shift: '8:30 AM – 5:30 PM (W01)', clockTimes: ['0827', '1159', '1258', '1510', '1523', '1738'], hours: 8.00, exception: 'Absent' },
        { date: '2026-09-20', shift: '8:30 AM – 5:30 PM (W01)', clockTimes: ['1953'], hours: 8.00, exception: 'Absent' },
        { date: '2026-09-21', shift: '8:30 AM – 5:30 PM (W01)', clockTimes: ['1955'], hours: 8.00 }
      ] },
      { empNo: '000009', name: 'Chan Mee Ling', hours: 168.00, branch: 'TIMES SQ', department: 'Sales', position: 'Sales Executive', details: [] },
      { empNo: '0000100', name: 'Loh Siew Hong', hours: 168.00, branch: 'TIMES SQ', department: 'Retail Operations', position: 'Store Supervisor', details: [] },
      { empNo: '000101', name: 'Lee Soon Hock', hours: 8.00, branch: 'TIMES SQ', department: 'Human Resources', position: 'HR Executive', details: [] },
      { empNo: '000011', name: 'Jason Yew Tek Hong', hours: 168.00, branch: 'TIMES SQ', department: 'Retail Operations', position: 'Store Manager', details: [] },
      { empNo: '000053', name: 'Tony Stunk', hours: 8.23, branch: 'TIMES SQ', department: 'Information Technology', position: 'IT Executive', details: [] }
    ]
  }
};
