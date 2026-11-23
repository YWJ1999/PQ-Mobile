/* Local preview edits share the same reference records as Feedback History. */
(() => {
  const key = 'pq_employee_career_feedback_edits';
  const fields = ['type', 'category', 'title', 'feedbackDate1', 'feedbackDate2', 'reference1', 'reference2', 'note', 'remarks', 'attachments'];
  function saved() {
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(rows) ? rows.filter(row => row && typeof row.id === 'string') : [];
    } catch { return []; }
  }
  function editable(row) {
    return Object.fromEntries(fields.filter(field => Object.hasOwn(row, field) && (field === 'attachments' ? Array.isArray(row[field]) : typeof row[field] === 'string')).map(field => [field, row[field]]));
  }
  function all() {
    const edits = new Map(saved().map(row => [row.id, editable(row)]));
    return (window.EMPLOYEE_CAREER_HISTORY_DATA?.feedback || []).map(row => ({ ...row, ...edits.get(row.id) }));
  }
  function update(id, changes) {
    if (!all().some(row => row.id === id)) throw new Error('Feedback record not found.');
    const rows = saved().filter(row => row.id !== id);
    rows.push({ id, ...editable(changes) });
    localStorage.setItem(key, JSON.stringify(rows));
  }
  const statusTones = { Pending: 'submitted', Responded: 'draft' };
  function statusLabel(row) {
    const status = String(row.status || '').trim().toLowerCase();
    if (status) return ['responded', 'in progress', 'resolved'].includes(status) ? 'Responded' : 'Pending';
    return row.reviewedBy || row.reviewedDate || row.reviewerComment ? 'Responded' : 'Pending';
  }
  window.EmployeeCareerFeedbackStore = { all, update, statusLabel, statusTones };
})();
