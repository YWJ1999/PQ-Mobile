// Keep form drafts and immutable copies of submitted requests in the existing payroll database.
const PayrollRequests = (() => {
  function transaction(mode, operation) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open('peoplehcm-payroll-forms', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('requests', { keyPath: 'id' });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('requests', mode);
        let result;
        tx.oncomplete = () => { db.close(); resolve(result?.result); };
        tx.onabort = () => { db.close(); reject(tx.error || new Error('Request changed')); };
        try { result = operation(tx.objectStore('requests')); }
        catch (error) { tx.abort(); reject(error); }
      };
    });
  }

  function today() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function snapshot(draft, employee) {
    const prefix = draft.kind === 'tax' ? 'RBT' : 'PDR';
    const serial = Array.from(crypto.getRandomValues(new Uint32Array(3)), part => part.toString(16).padStart(8, '0')).join('');
    return {
      ...draft.values, id: prefix + '-' + serial, category: draft.kind,
      empNo: employee.empNo, employeeName: employee.name, department: employee.dept,
      submitDate: today(), status: 'submitted', attachments: draft.attachments || []
    };
  }

  function save(draft, submit, employee) {
    const request = submit ? snapshot(draft, employee) : null;
    return transaction('readwrite', store => {
      if (request) store.add(request);
      return store.put({ ...draft, submittedId: request?.id });
    });
  }

  function updateDraft(record, employee, action) {
    return transaction('readwrite', store => {
      const read = store.get(record.id);
      read.onsuccess = () => {
        const draft = read.result;
        if (!draft || draft.submittedId || draft.savedAt !== record.savedDate) {
          store.transaction.abort();
        } else if (action === 'discard') {
          store.delete(draft.id);
        } else {
          const request = snapshot(draft, employee);
          store.add(request);
          store.put({ ...draft, submittedId: request.id });
        }
      };
    });
  }

  return {
    today, save, updateDraft,
    get: id => transaction('readonly', store => store.get(id)),
    all: () => transaction('readonly', store => store.getAll()),
    submitHistoryRecord: (item, category) => transaction('readwrite', store =>
      store.add({ ...item, category, status: 'submitted', submitDate: today() }))
  };
})();
