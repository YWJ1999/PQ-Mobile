const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'leave.html'), 'utf8');
const section = source.match(/<div id="viewLeaveHighlight"[\s\S]*?<div id="viewLeaveHighlightChart"/);

assert.ok(section, 'Leave Highlight section should exist');

const table = section[0].match(/<table[\s\S]*?<\/table>/);
assert.ok(table, 'Leave Highlight table should exist');

const cleanText = value => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const headers = [...table[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)]
  .map(match => cleanText(match[1]));

assert.deepEqual(headers, ['Emp No.', 'Name', 'Days', 'Branch', 'Department', 'Position']);

const rows = [...table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1);
assert.equal(rows.length, 4);

const expectedRows = [
  ['004177', 'AHMAD RAFY BIN ZULKIPLE', '2.00', 'HEADQUARTERS (HQ)', 'ADMINISTRATION DEPARTMENT', 'ADMIN MANAGER'],
  ['TEST69', 'TEST69 Test', '3.00', 'NORTHERN REGION BRANCH', 'FINANCE & ACCOUNTING DEPARTMENT', 'ACCOUNT EXECUTIVE'],
  ['007216', 'HAILIZAM BIN MOHAMED IKHSAN', '1.00', 'SOUTHERN REGION BRANCH', 'SALES & MARKETING DEPARTMENT', 'SALES REPRESENTATIVE'],
  ['006611', 'POR SUAT BEE', '5.00', 'HEADQUARTERS (HQ)', 'FINANCE & ACCOUNTING DEPARTMENT', 'PAYABLES EXECUTIVE']
];

rows.forEach((row, index) => {
  const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map(match => cleanText(match[1]));
  assert.deepEqual(cells, expectedRows[index], `Unexpected field order in Leave Highlight row ${index + 1}`);
});

console.log('PASS: Leave Highlight table fields follow the required order.');
