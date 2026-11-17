window.CVChangeRequests = (() => {
  const storageKey = 'pq_change_request_history';
  const isPending = row => /^(pending(?: (?:hr )?approval)?|submitted)$/i.test(String(row.status || '').trim());

  function read() {
    const rows = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(rows)) throw new Error('Invalid CV request history');
    return rows;
  }

  function all() {
    try { return read().filter(row => row && typeof row.id === 'string' && Array.isArray(row.changes)); }
    catch { return []; }
  }

  function submit(request) {
    const rows = read();
    rows.unshift(request);
    localStorage.setItem(storageKey, JSON.stringify(rows));
  }

  function decide(items, status) {
    const byId = new Map(items.map(item => [item.id, item]));
    const rows = read();
    const saved = new Set();
    for (const row of rows) {
      const item = byId.get(row?.id);
      if (!item || !isPending(row)) continue;
      row.status = status;
      row.approverRemarks = item.approverRemarks || '';
      saved.add(row.id);
    }
    if (saved.size) localStorage.setItem(storageKey, JSON.stringify(rows));
    return saved;
  }

  return { all, isPending, submit, decide };
})();
