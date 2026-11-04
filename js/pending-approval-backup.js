// Preserve saved backup assignments as read-only approval history.
const PendingApprovalBackup = (() => {
  const approvers = [
    { name: 'Angeline Loren Alan', empNo: 'EBB04', role: 'HR Manager' },
    { name: 'Jason Tan', empNo: 'EBB52', role: 'Team Lead' }
  ];
  const key = (scope, id) => 'peoplehcm:approval-backup:' + scope + ':' + id;
  function assigned(scope, id) {
    try {
      return JSON.parse(localStorage.getItem(key(scope, id)) || 'null');
    } catch {
      return null;
    }
  }

  function showAssignment(grid, { scope, id }) {
    const person = assigned(scope, id);
    if (!person) return;
    const note = document.createElement('p');
    note.className = 'approval-backup-assignment';
    note.textContent = 'Backup approver · ' + person.name;
    grid.before(note);
  }
  return { approvers, assigned, showAssignment };
})();
