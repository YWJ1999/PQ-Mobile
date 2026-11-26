/* Local history for the Workplace preview's request types. */
(() => {
  const key = 'peoplehcm:workplace:history:v1';
  const sampleKey = 'peoplehcm:workplace:history:samples:v1';
  const submittedMigrationKey = 'peoplehcm:workplace:history:cancelled-to-submitted:v1';
  const kinds = ['guest-visit', 'letter-request', 'inventory-request'];
  const statuses = ['submitted', 'resubmit', 'approved', 'rejected', 'draft', 'cancelled'];
  const referencePrefixes = { 'guest-visit': 'FGV', 'letter-request': 'DRQ', 'inventory-request': 'IRQ' };
  const currentEmployee = { empNo: 'EBB12', name: 'Farhan binti rahmat' };
  function localDate(now) {
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }
  function referenceNumber(row, fields = Object.fromEntries(row.fields)) {
    const explicit = ['Reference #', 'Reference No.', 'Reference'].map(key => fields[key]).find(value => String(value || '').trim());
    if (explicit) return explicit;
    if (row.id.startsWith('sample-')) return '—';
    const seed = String(row.id || row.createdAt || row.date || row.title);
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index++) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const timestamp = Number.isFinite(Date.parse(row.createdAt)) ? String(Date.parse(row.createdAt)) : '';
    const digits = (timestamp + String(hash >>> 0).padStart(10, '0')).slice(-13).padStart(13, '0');
    return (referencePrefixes[row.kind] || 'REQ') + digits;
  }
  function validRecord(row) {
    return row && kinds.includes(row.kind) && statuses.includes(row.status)
      && typeof row.id === 'string' && typeof row.title === 'string' && typeof row.date === 'string'
      && Array.isArray(row.fields) && row.fields.every(field => Array.isArray(field) && field.length === 2 && field.every(value => typeof value === 'string'));
  }
  function list(guestDecisions) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error('Invalid Workplace history data.');
    const rows = records.filter(validRecord);
    if (rows.some(row => row.guestVisit && row.status === 'submitted')) {
      const decisions = guestDecisions || window.WorkplacePendingStore?.guestDecisions() || new Map();
      rows.forEach(row => {
        const decision = decisions.get(row.id);
        if (row.status === 'submitted' && decision && decision.guestRevision === row.guestVisit?.revision) row.status = decision.status;
      });
    }
    return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  function save(input) {
    if (!kinds.includes(input.kind)) throw new Error('Unsupported Workplace history category.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Array.isArray(input.fields)) throw new Error('Invalid Workplace history record.');
    const rows = list();
    const existing = rows.find(row => row.id === input.id && row.kind === input.kind);
    if (existing?.guestVisit && !['submitted', 'resubmit', 'draft'].includes(existing.status)) throw new Error('This visit has already been decided.');
    const record = {
      id: existing?.id || crypto.randomUUID(),
      kind: input.kind,
      title: String(input.title || ({ 'guest-visit': 'Guest Visit', 'letter-request': 'Letter Request', 'inventory-request': 'Inventory Request' }[input.kind])),
      date: input.date,
      status: 'submitted',
      createdAt: existing?.createdAt || new Date().toISOString(),
      fields: input.fields.map(([label, value]) => [String(label), String(value ?? '')])
    };
    if (input.kind === 'guest-visit' && input.guestVisit) {
      const now = new Date();
      record.guestVisit = { ...input.guestVisit, employeeName: currentEmployee.name, empNo: currentEmployee.empNo.replace(/^#/, ''),
        revision: crypto.randomUUID(), submitDate: localDate(now), submittedAt: now.toISOString() };
      record.fields.push(['Submit Date', record.guestVisit.submitDate]);
    } else if (!record.fields.some(([label, value]) => /^(?:Submit|Submitted) Date$/i.test(label.trim()) && value)) {
      record.fields.push(['Submit Date', localDate(new Date())]);
    }
    localStorage.setItem(key, JSON.stringify([record, ...rows.filter(row => row.id !== record.id)]));
    return record;
  }
  function counts() {
    const totals = Object.fromEntries(statuses.map(status => [status, 0]));
    list().forEach(row => totals[row.status]++);
    return totals;
  }
  function ensureSamples(samples) {
    if (localStorage.getItem(sampleKey)) return list();
    if (!Array.isArray(samples) || !samples.every(validRecord)) throw new Error('Invalid Workplace history samples.');
    const rows = list();
    const ids = new Set(rows.map(row => row.id));
    samples.forEach(row => {
      if (ids.has(row.id)) return;
      rows.push(row);
      ids.add(row.id);
    });
    // Commit records first so a failed marker write can safely retry by ID.
    localStorage.setItem(key, JSON.stringify(rows));
    localStorage.setItem(sampleKey, '1');
    return list();
  }
  function migrateCancelledToSubmitted() {
    if (localStorage.getItem(submittedMigrationKey)) return;
    const rows = list();
    let changed = false;
    rows.forEach(record => {
      if (record.status !== 'cancelled') return;
      record.status = 'submitted';
      changed = true;
    });
    // Apply this correction once; future user cancellations must stay cancelled.
    if (changed) localStorage.setItem(key, JSON.stringify(rows));
    localStorage.setItem(submittedMigrationKey, '1');
  }
  function setStatus(id, status) {
    const rows = list();
    const record = rows.find(row => row.id === id);
    if (!record) throw new Error('Workplace history record not found.');
    const allowed = status === 'submitted' ? ['draft', 'resubmit']
      : status === 'cancelled' ? ['draft', 'submitted', 'approved', 'resubmit'] : [];
    if (!allowed.includes(record.status)) throw new Error('Unsupported Workplace history status transition.');
    record.status = status;
    if (status === 'submitted') {
      const now = new Date();
      const submitDate = localDate(now);
      if (record.guestVisit) {
        record.guestVisit.revision = crypto.randomUUID();
        record.guestVisit.submittedAt = now.toISOString();
        record.guestVisit.submitDate = submitDate;
      }
      let hasSubmitDate = false;
      record.fields = record.fields.map(([label, value]) => {
        if (!['submit date', 'submitted date'].includes(label.trim().toLowerCase())) return [label, value];
        hasSubmitDate = true;
        return [label, submitDate];
      });
      if (!hasSubmitDate) record.fields.push(['Submit Date', submitDate]);
    }
    localStorage.setItem(key, JSON.stringify(rows));
    return record;
  }
  window.WorkplaceHistoryStore = { list, save, counts, ensureSamples, migrateCancelledToSubmitted, setStatus, currentEmployee, referenceNumber };
})();
