const ClaimRequestStore = (() => {
  // Keep the original storage key so existing benefit submissions remain available.
  const key = 'peoplehcm.benefit-claims.v1';
  const statuses = { approve: 'approved', reject: 'rejected', resubmit: 'resubmit', cancel: 'cancelled' };

  function records() {
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(items)) throw new Error('Invalid claim records');
    return items;
  }

  function list() {
    try { return records().map(item => ({ ...item, savedClaim: true })); } catch { return []; }
  }

  const types = {
    'Benefit Claim': ['benefit', 'CBF'], 'Medical Claim': ['medical', 'CMD'], 'OT Claim': ['ot', 'BXT'],
    'Travel Claim': ['travel', 'CTR'], 'Travel Request': ['travelRequest', 'CRT'], 'Entertainment Claim': ['entertainment', 'CET'],
    'Advance Claim': ['advance', 'CAV'], 'Expense Claim': ['expense', 'CEX']
  };

  function submit(fields, type = 'Benefit Claim') {
    const items = records();
    let id = Date.now();
    while (items.some(item => item.id === id)) id++;
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const [historyTab, prefix] = types[type];
    const firstOT = fields.otEntries?.[0];
    const fromDate = fields.fromDate ?? fields.claimDateFrom ?? fields.travelDateFrom ?? fields.receiptDate ?? firstOT?.date;
    const endDate = fields.toDate ?? fields.claimDateTo ?? fields.travelDateTo ?? fromDate;
    const amount = fields.claimTotal == null ? fields.amount : Number(String(fields.claimTotal).replace(/[^\d.-]/g, ''));
    const category = fields.benefitType || firstOT?.type || type;
    const hours = fields.otEntries?.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
    items.unshift({
      ...fields, id, docRef: prefix + id, savedClaim: true, savedBenefit: type === 'Benefit Claim', optionName: type, historyTab,
      userName: 'Farhan binti rahmat', empNo: 'EBB12', dept: 'Human Resource',
      category, title: category, date, submitDate: date, amount: Number.isFinite(amount) ? amount : null,
      hours: hours == null ? '' : hours + ' hrs', claimDate: fromDate, claimDateFrom: fromDate, claimDateTo: endDate,
      status: 'submitted', docStatus: 'Submitted'
    });
    localStorage.setItem(key, JSON.stringify(items));
  }

  function decide(ids, action, comment = '') {
    if (!ids.length) return;
    const items = records();
    const selected = ids.map(id => items.find(item => item.id === id));
    if (!statuses[action] || selected.some(item => !item || !(item.status === 'submitted' || (action === 'cancel' && item.status === 'approved')))) {
      throw new Error('Claim is no longer available for this action');
    }
    for (const item of selected) {
      item.status = statuses[action];
      if (action !== 'cancel') item.approverComment = comment;
    }
    localStorage.setItem(key, JSON.stringify(items));
  }

  return { key, list, submit, decide };
})();
