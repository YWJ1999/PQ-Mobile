const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const key = 'peoplehcm:workplace:pending-approval:v1';
const file = path.resolve(__dirname, '../modules/admin/js/workplace-pending-store.js');
function openStore() {
  assert.ok(fs.existsSync(file), 'Workplace pending approval store is required');
  const data = new Map();
  const localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const browser = { window: {}, localStorage, Date, crypto: { randomUUID } };
  vm.createContext(browser);
  vm.runInContext(fs.readFileSync(file, 'utf8'), browser);
  return { store: browser.window.WorkplacePendingStore, data, localStorage, browser };
}
const plain = value => JSON.parse(JSON.stringify(value));
const validChanges = { visitDate: '2026-10-08', startTime: '09:00', endTime: '10:00', totalGuest: 0, location: 'Head Office', meal: true, otherRequests: ['floor-visit'] };
test('Review follows the submitted Guest Visit revision through resubmission and cancellation', () => {
  const { store, browser } = openStore();
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../modules/admin/js/workplace-history-store.js'), 'utf8'), browser);
  const history = browser.window.WorkplaceHistoryStore;
  const row = history.save({ kind: 'guest-visit', date: validChanges.visitDate, fields: [],
    guestVisit: { ...validChanges, guests: [], attendees: [], attachments: ['Visit notes.txt'] } });
  const original = store.getPending().find(item => item.id === row.id);
  store.act([row.id], 'resubmit', { guestRevision: original.guestRevision, comments: 'Please confirm attendees' });
  assert.equal(history.list()[0].status, 'resubmit');
  history.setStatus(row.id, 'submitted');
  const updated = store.getPending().find(item => item.id === row.id);
  assert.notEqual(updated.guestRevision, original.guestRevision);
  assert.deepEqual(plain(updated.attachments), ['Visit notes.txt']);
  assert.throws(() => store.act([row.id], 'approve', { guestRevision: original.guestRevision }), /changed/);
  store.act([row.id], 'approve', { guestRevision: updated.guestRevision });
  assert.deepEqual(plain(store.list().find(item => item.id === row.id).audit.map(event => event.action)), ['submitted', 'resubmit', 'submitted', 'approve']);
  assert.equal(history.list()[0].status, 'approved');
  history.setStatus(row.id, 'cancelled');
  assert.equal(store.list().find(item => item.id === row.id).status, 'cancelled');
  assert.equal(store.getPending().some(item => item.id === row.id), false);
});
test('Reference request seeds once with exact supplied employee and attendee details', () => {
  const { store } = openStore();
  const row = store.getPending().find(item => item.kind === 'guest-visit');
  assert.equal(row.reference, 'FGV0000000000013');
  assert.equal(row.employeeName, 'Farhan binti rahmat');
  assert.equal(row.empNo, 'EBB12');
  assert.equal(row.submitDate, '2024-08-16');
  assert.equal(row.visitDate, '2026-10-08');
  assert.equal(row.totalGuest, 0);
  assert.equal(row.location, '');
  assert.deepEqual(plain(row.attendees), [{ empNo: '000001', name: 'Ram chhabila', department: 'ACCOUNTS', position: 'ACCOUNT EXECUTIVE' }]);
  assert.equal(store.getPending().filter(item => item.kind === 'guest-visit').length, 1);
});
test('Inventory request seeds with the card facts required for team approval', () => {
  const { store } = openStore();
  const row = store.getPending().find(item => item.kind === 'inventory-request');
  assert.ok(row, 'Inventory request is available in the pending queue');
  assert.equal(row.reference, 'IRQ0000000000064');
  assert.equal(row.employeeName, 'Farhan binti rahmat');
  assert.equal(row.empNo, 'EBB12');
  assert.equal(row.position, 'GROUP HR MANAGER');
  assert.equal(row.department, 'HUMAN RESOURCE');
  assert.equal(row.submitDate, '2026-09-08');
  assert.equal(row.itemGroup, 'OFFICE EQUIPMENT');
  assert.equal(row.requestItem, 'LOCKER 1000');
  assert.equal(row.itemType, 'Asset');
  assert.equal(row.requiredBy, '2026-09-08');
  assert.equal(row.survey, false);
  assert.equal(row.checklist, 'No');
  assert.equal(row.unitOfMeasure, 'Piece');
  assert.equal(row.reason, 'Inventory Request Reason 1');
  assert.equal(row.quantity, 1);
});
test('Existing Guest Visit preview data receives the Inventory approval queue once', () => {
  const { store, data } = openStore();
  const guest = store.list().find(item => item.kind === 'guest-visit');
  data.set(key, JSON.stringify([guest]));
  assert.deepEqual(plain(store.getPending().map(item => item.kind)), ['guest-visit', 'inventory-request']);
  assert.equal(store.list().filter(item => item.kind === 'inventory-request').length, 1);
});
test('Existing Inventory preview data is upgraded without losing its approval decision', () => {
  const { store, data } = openStore();
  const guest = store.list().find(item => item.kind === 'guest-visit');
  const inventory = store.list().find(item => item.kind === 'inventory-request');
  const legacy = {
    ...inventory,
    reference: 'INV0000000000001',
    requestItem: 'IT Accessories',
    quantity: 2,
    reason: 'Replacement',
    requiredBy: '2026-10-16',
    status: 'approved',
    approverComments: 'Keep this approval decision'
  };
  for (const field of ['position', 'department', 'itemGroup', 'itemType', 'survey', 'checklist', 'unitOfMeasure']) delete legacy[field];
  data.set(key, JSON.stringify([guest, legacy]));
  const upgraded = store.list().find(item => item.kind === 'inventory-request');
  assert.equal(upgraded.reference, 'IRQ0000000000064');
  assert.equal(upgraded.requestItem, 'LOCKER 1000');
  assert.equal(upgraded.position, 'GROUP HR MANAGER');
  assert.equal(upgraded.department, 'HUMAN RESOURCE');
  assert.equal(upgraded.unitOfMeasure, 'Piece');
  assert.equal(upgraded.status, 'approved');
  assert.equal(upgraded.approverComments, 'Keep this approval decision');
});
test('Approve preserves submitted visit data and stores only the decision and approver comments', () => {
  const { store } = openStore();
  const row = store.getPending().find(item => item.kind === 'guest-visit');
  store.act([row.id], 'approve', { changes: validChanges, comments: 'Approved for team visit' });
  assert.equal(store.getPending().filter(item => item.kind === 'guest-visit').length, 0);
  const saved = store.list().find(item => item.id === row.id);
  assert.equal(saved.status, 'approved');
  assert.equal(saved.reference, row.reference);
  assert.equal(saved.submitDate, row.submitDate);
  for (const field of ['visitDate', 'startTime', 'endTime', 'totalGuest', 'location', 'meal', 'otherRequests', 'guests', 'attendees']) {
    assert.deepEqual(plain(saved[field]), plain(row[field]), `${field} remains the submitted value`);
  }
  assert.equal(saved.approverComments, 'Approved for team visit');
  assert.equal(saved.audit.at(-1).action, 'approve');
  assert.equal(store.getPending().filter(item => item.kind === 'guest-visit').length, 0, 'Decided requests cannot reseed');
});
test('Submitted requests can be approved without editing missing source fields', () => {
  const { store } = openStore();
  const row = store.getPending().find(item => item.kind === 'guest-visit');
  store.act([row.id], 'approve');
  assert.equal(store.list().find(item => item.id === row.id).status, 'approved');
  assert.equal(store.list().find(item => item.id === row.id).location, '');
});
test('Resubmit and Reject work without completing missing approval fields and persist decisions', () => {
  for (const [action, status] of [['resubmit', 'resubmit'], ['reject', 'rejected']]) {
    const { store } = openStore();
    const row = store.getPending().find(item => item.kind === 'guest-visit');
    store.act([row.id], action, { comments: '<script>review</script>' });
    const saved = store.list().find(item => item.id === row.id);
    assert.equal(saved.status, status);
    assert.equal(saved.approverComments, '<script>review</script>');
    assert.equal(store.getPending().filter(item => item.kind === 'guest-visit').length, 0);
  }
});
test('Unknown or stale requests and failed bulk writes cannot partially decide requests', () => {
  const { store, data, localStorage } = openStore();
  const row = store.getPending().find(item => item.kind === 'guest-visit');
  const inventory = store.getPending().find(item => item.kind === 'inventory-request');
  data.set(key, JSON.stringify([row, { ...row, id: 'second', reference: 'FGV-SECOND' }, inventory]));
  assert.throws(() => store.act([row.id, 'missing'], 'reject'), /request/i);
  assert.throws(() => store.act([], 'reject'), /request/i);
  assert.throws(() => store.act([row.id], 'other'), /action/i);
  const before = data.get(key);
  const write = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage full'); };
  assert.throws(() => store.act([row.id, 'second'], 'reject'), /Storage full/);
  assert.equal(data.get(key), before);
  localStorage.setItem = write;
  store.act([row.id, 'second'], 'reject');
  assert.equal(store.getPending().filter(item => item.kind === 'guest-visit').length, 0);
  assert.throws(() => store.act([row.id], 'approve', { changes: validChanges }), /request/i);
});
test('Inventory decisions preserve the submitted request details', () => {
  const { store } = openStore();
  const row = store.getPending().find(item => item.kind === 'inventory-request');
  store.act([row.id], 'approve', { comments: 'Approved replacement equipment' });
  const saved = store.list().find(item => item.id === row.id);
  for (const field of ['quantity', 'requestItem', 'reason', 'requiredBy', 'remarks', 'attachments']) {
    assert.deepEqual(plain(saved[field]), plain(row[field]), `${field} remains the submitted value`);
  }
  assert.equal(saved.status, 'approved');
  assert.equal(saved.approverComments, 'Approved replacement equipment');
});
