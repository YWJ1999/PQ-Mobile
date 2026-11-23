/* Workplace approvals for the local Team preview. */
(() => {
  const key = 'peoplehcm:workplace:pending-approval:v1';
  const actionStatuses = { approve: 'approved', resubmit: 'resubmit', reject: 'rejected', cancel: 'cancelled' };
  const statuses = Object.freeze(['submitted', ...Object.values(actionStatuses)]);
  const initial = () => [
    {
      id: 'guest-visit-0013', reference: 'FGV0000000000013', kind: 'guest-visit',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12', status: 'submitted',
      submitDate: '2024-08-16', requestDate: '2024-08-16', visitDate: '2026-10-08',
      startTime: '00:00', endTime: '00:00', totalGuest: 0, location: '', meal: false,
      guests: [], attendees: [{ empNo: '000001', name: 'Ram chhabila', department: 'ACCOUNTS', position: 'ACCOUNT EXECUTIVE' }],
      otherRequests: [], attachments: [], approverComments: '',
      audit: [{ action: 'submitted', at: '2024-08-16', comments: '' }]
    },
    {
      id: 'inventory-request-0001', reference: 'IRQ0000000000064', kind: 'inventory-request',
      employeeName: 'Farhan binti rahmat', empNo: 'EBB12', status: 'submitted',
      position: 'GROUP HR MANAGER', department: 'HUMAN RESOURCE',
      submitDate: '2026-09-08', requestDate: '2026-09-08', requiredBy: '2026-09-08',
      itemGroup: 'OFFICE EQUIPMENT', requestItem: 'LOCKER 1000', itemType: 'Asset',
      survey: false, checklist: 'No', unitOfMeasure: 'Piece',
      quantity: 1, reason: 'Inventory Request Reason 1', remarks: '',
      guests: [], attendees: [], otherRequests: [], attachments: [], approverComments: '',
      audit: [{ action: 'submitted', at: '2026-09-08', comments: '' }]
    }
  ];
  function storedRows() {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      const rows = initial();
      localStorage.setItem(key, JSON.stringify(rows));
      return rows;
    }
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string'
      || typeof row.reference !== 'string' || !['guest-visit', 'inventory-request'].includes(row.kind)
      || typeof row.employeeName !== 'string' || typeof row.empNo !== 'string'
      || !statuses.includes(row.status) || !Array.isArray(row.guests) || !Array.isArray(row.attendees)
      || !Array.isArray(row.otherRequests) || !Array.isArray(row.attachments) || !Array.isArray(row.audit))) {
      throw new Error('Invalid Workplace approval data.');
    }
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate Workplace approval requests.');
    const inventorySeed = initial().find(row => row.kind === 'inventory-request');
    const inventoryIndex = rows.findIndex(row => row.id === inventorySeed.id);
    if (inventoryIndex < 0 && !rows.some(row => row.kind === 'inventory-request') && rows.some(row => row.id === 'guest-visit-0013')) {
      rows.push(inventorySeed);
      localStorage.setItem(key, JSON.stringify(rows));
    } else if (inventoryIndex >= 0) {
      const existing = rows[inventoryIndex];
      const upgraded = {
        ...existing,
        ...inventorySeed,
        status: existing.status,
        attachments: existing.attachments,
        approverComments: existing.approverComments,
        audit: existing.audit
      };
      if (JSON.stringify(existing) !== JSON.stringify(upgraded)) {
        rows[inventoryIndex] = upgraded;
        localStorage.setItem(key, JSON.stringify(rows));
      }
    }
    return rows;
  }
  function guestDecisions() {
    if (!localStorage.getItem(key)) return new Map();
    return new Map(storedRows().filter(row => row.guestRevision).map(row => [row.id, row]));
  }
  function list(stored = storedRows()) {
    const history = window.WorkplaceHistoryStore;
    if (!history) return stored;
    const decisions = new Map(stored.filter(row => row.guestRevision).map(row => [row.id, row]));
    const visits = history.list(decisions).filter(row => row.kind === 'guest-visit' && row.guestVisit).map(row => {
      const { revision, submittedAt, ...fields } = row.guestVisit;
      const decision = decisions.get(row.id);
      const current = decision?.guestRevision === revision ? decision : null;
      return {
        ...fields, id: row.id, kind: row.kind, reference: history.referenceNumber(row),
        guestRevision: revision, status: row.status,
        approverComments: current?.approverComments || '',
        audit: current?.audit || [...(decision?.audit || []), { action: 'submitted', at: submittedAt, comments: '' }]
      };
    });
    return [...visits, ...stored.filter(row => !row.guestRevision)];
  }
  function act(ids, action, options = {}) {
    if (!Object.hasOwn(actionStatuses, action)) throw new Error('Unsupported approval action.');
    const status = actionStatuses[action];
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw new Error('Please select a request.');
    const stored = storedRows();
    const rows = list(stored);
    const targets = ids.map(id => rows.find(row => row.id === id && row.status === 'submitted'));
    if (targets.some(row => !row)) throw new Error('This request is no longer pending.');
    if (options.guestRevision && targets.some(row => row.guestRevision !== options.guestRevision)) throw new Error('This request has changed. Reopen it before reviewing.');
    const comments = String(options.comments || '').trim();
    const at = new Date().toISOString();
    targets.forEach(row => {
      row.status = status;
      row.approverComments = comments;
      row.audit.push({ action, at, comments });
    });
    // Commit the decisions together. Unreviewed submissions are still owned by History.
    const saved = new Map(stored.map(row => [row.id, row]));
    targets.forEach(row => saved.set(row.id, row));
    localStorage.setItem(key, JSON.stringify([...saved.values()]));
    return targets.length;
  }
  window.WorkplacePendingStore = { statuses, list, getPending: () => list().filter(row => row.status === 'submitted'), act, guestDecisions };
})();
