// Store the submitted version separately from the employee's editable draft in this preview session.
const PerformanceSubmissions = (() => {
  const key = 'performance-submitted-requests-v1';
  const decisionsKey = 'performance-pending-actions-v1';
  function storedRecords() {
    const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!Array.isArray(saved)) throw new Error('Invalid performance submission list');
    return saved;
  }

  function records() {
    try { return storedRecords(); } catch { return []; }
  }

  function submit(category, fields, submittedAt = new Date().toISOString()) {
    const requests = storedRecords();
    const decisions = JSON.parse(sessionStorage.getItem(decisionsKey) || '{}');
    const snapshot = { ...fields, category };
    const existing = requests.find(({ id, submittedAt, ...saved }) =>
      !decisions[id] && JSON.stringify(saved) === JSON.stringify(snapshot));
    if (existing) return existing.id;
    const id = 'PA-' + crypto.randomUUID();
    requests.unshift({ ...snapshot, id, submittedAt });
    sessionStorage.setItem(key, JSON.stringify(requests));
    return id;
  }

  function appraisal(category, source, goals, competencies, submittedAt) {
    const { employee } = source;
    return submit(category, {
      name: employee.name, empNo: employee.empNo, position: employee.position, department: employee.department,
      supervisor: employee.supervisor, reportingTo: employee.reportingTo?.name, reportingEmployee: employee.reportingTo,
      period: source.period, appraisalType: source.appraisalType || source.type,
      evaluationRef: source.evaluationRef, goals, competencies
    }, submittedAt);
  }

  // Earlier previews saved just the plan or evaluation and its submitted flag, without a submission date.
  function importPreviousAppraisals() {
    const imported = new Set(records().map(record => record.category));
    if (!imported.has('goal-plan')) {
      const saved = sessionStorage.getItem('peoplehcm:performance:goal-plan:draft:v2');
      let plan;
      try { plan = JSON.parse(saved); } catch { /* No readable saved plan. */ }
      if (plan?.status === 'Submitted' && Array.isArray(plan.goals) && Array.isArray(plan.competencies)) {
        appraisal('goal-plan', window.PERFORMANCE_GOAL_PLAN, plan.goals, plan.competencies, null);
      }
    }
    if (!imported.has('self-evaluation') && sessionStorage.getItem('pq_self_evaluation_status_v1') === 'Submitted') {
      const evaluation = window.SelfEvaluationStore.get();
      appraisal('self-evaluation', evaluation, evaluation.goals, evaluation.competencies, null);
    }
  }

  function attachment(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, base64: reader.result.split(',')[1] });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  return { records, submit, appraisal, attachment, importPreviousAppraisals };
})();
