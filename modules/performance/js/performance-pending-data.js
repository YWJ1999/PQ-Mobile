// Preview queue only. Replace this store with the approval service when connected.
(() => {
  const key = 'performance-pending-actions-v1';
  const backupKey = 'performance-pending-backups-v1';
  const backupApprovers = PendingApprovalBackup.approvers;
  const categories = ['goal-plan', 'self-evaluation', 'self-review'];
  const people = [
    { name: 'Aina Rahman', empNo: 'EBB01', position: 'People Operations Executive', company: 'PeopleHCM Malaysia', department: 'People Operations', branch: 'Kuala Lumpur' },
    { name: 'Daniel Wong', empNo: 'EBB02', position: 'Product Designer', company: 'PeopleHCM Malaysia', department: 'Product', branch: 'Kuala Lumpur' },
    { name: 'Nur Izzati', empNo: 'EBB03', position: 'Finance Analyst', company: 'PeopleHCM Services', department: 'Finance & Accounting', branch: 'Penang' }
  ];
  const records = categories.flatMap((category, stage) => people.map((person, index) => ({
    ...person, id: `PA-2026-${stage + 1}00${index + 1}`, category, period: 'FY 2026A', session: 'FY 2026A - Review 01',
    section: ['Employee Services', 'Product Design', 'Financial Reporting'][index],
    appraisalType: 'Annual Appraisal', submittedAt: `2026-10-${12 + index}`,
    startDate: '2026-01-01', endDate: '2026-12-31', reportingTo: 'Farhan Rahmat',
    goals: [
      { title: ['Improve employee onboarding', 'Improve product usability', 'Improve financial reporting accuracy'][index], weight: 60, target: ['95% onboarding satisfaction', '90% task completion rate', '99% reporting accuracy'][index] },
      { title: ['Complete people operations projects', 'Deliver design system updates', 'Complete monthly financial closing'][index], weight: 40, target: 'Complete all agreed milestones' }
    ],
    competencies: [
      { title: ['Employee Communication', 'Design Communication', 'Analytical Thinking'][index], weight: 60, target: 'Communicate findings clearly and follow through on agreed actions.' },
      { title: ['Planning & Organisation', 'Cross-team Collaboration', 'Attention to Detail'][index], weight: 40, target: 'Deliver accurate work and meet agreed deadlines.' }
    ],
    goalScore: ['92.00', '84.00', '88.00'][index], competencyScore: ['88.00', '80.00', '86.00'][index],
    overallScore: ['90.00', '82.00', '87.00'][index],
    scoreGrade: ['A', 'B', 'B'][index],
    achievements: ['Streamlined onboarding and completed the agreed HR projects.', 'Delivered the agreed product design milestones.', 'Improved reporting accuracy and completed monthly financial closing on schedule.'][index],
    development: 'Develop stakeholder communication and leadership skills.',
    review: 'Reviewed the appraisal results and discussed the development plan with my reporting manager.',
    remarks: 'Submitted for manager approval.', attachments: []
  })));
  let memory = {};
  let backupMemory = {};
  function actions() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || JSON.stringify(memory));
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return memory; }
  }
  function backups() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(backupKey) || JSON.stringify(backupMemory));
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return backupMemory; }
  }
  window.PerformancePendingStore = {
    getPending: () => {
      const completed = actions(), assigned = backups();
      return records.filter(record => !completed[record.id]).map(record => ({ ...record, backupApprover: assigned[record.id] || null }));
    },
    getBackupApprovers: () => backupApprovers.map(person => ({ ...person })),
    assignBackup(ids, empNo) {
      const approver = backupApprovers.find(person => person.empNo === empNo);
      if (!approver || !Array.isArray(ids)) return 0;
      const completed = actions(), assigned = backups();
      const pending = records.filter(record => ids.includes(record.id) && !completed[record.id] && record.empNo !== empNo);
      pending.forEach(record => { assigned[record.id] = { ...approver, assignedAt: new Date().toISOString() }; });
      // A backup assignment is separate from an approval decision and keeps the request pending.
      sessionStorage.setItem(backupKey, JSON.stringify(assigned));
      backupMemory = assigned;
      return pending.length;
    },
    act(ids, action, comments) {
      if (!Array.isArray(ids) || !['approve', 'resubmit', 'reject'].includes(action)) return 0;
      const completed = actions();
      const pending = records.filter(record => ids.includes(record.id) && !completed[record.id]);
      pending.forEach(record => {
        completed[record.id] = { action, comments, date: new Date().toISOString() };
      });
      sessionStorage.setItem(key, JSON.stringify(completed));
      memory = completed;
      return pending.length;
    }
  };
})();
