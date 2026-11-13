const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/admin/options/history.html')).href;
const historyKey = 'peoplehcm:workplace:history:v1';

const records = [
  {
    id: 'guest-0001',
    kind: 'guest-visit',
    title: 'Head Office',
    date: '2026-10-06',
    status: 'submitted',
    createdAt: '2026-10-06T09:30:00+08:00',
    fields: [
      ['Visit Date', '2026-10-06'],
      ['Time', '09:00 \u2013 10:00'],
      ['Total Guest', '1'],
      ['Location', 'Head Office'],
      ['Meal', 'Yes'],
      ['Guest 1', 'Jane Tan \u2022 Meranti Retail \u2022 Customer \u2022 Operations Manager'],
      ['Attendee 1', 'Farhan binti rahmat\n#EBB12\nHuman Resource \u2022 Group HR Manager'],
      ['Other Request', 'Floor Visit, Sitting Arrangement'],
      ['Attachments', 'visitor-list.pdf']
    ]
  },
  {
    id: 'letter-0005',
    kind: 'letter-request',
    title: 'Letter of Guarantee',
    date: '2026-10-05',
    status: 'approved',
    createdAt: '2026-10-05T11:20:00+08:00',
    fields: [
      ['Letter Type', 'Letter of Guarantee'],
      ['Description', 'Guarantee Letter'],
      ['1st Merge Text', 'Ward A'],
      ['2nd Merge Text', ''],
      ['3rd Merge Text', ''],
      ['Reason', 'To apply admission to Hospital'],
      ['Remarks', 'Urgent admission'],
      ['FileName', 'guarantee-letter.pdf'],
      ['Acknowledged On', '11 Jul 2026']
    ]
  }
];

const detailLabels = () => [...document.querySelectorAll('#historyDetailBody .history-detail-main-table th')].map(node => node.textContent.trim());

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(pageUrl + '?category=guest-visit&theme=light', { waitUntil: 'load' });
    await page.click('[data-history-kind="inventory-request"]');
    assert.deepEqual(await page.$$eval('[data-record-id="sample-inventory-0064"] .history-card-row', rows =>
      rows.map(row => [row.querySelector('span').textContent, row.querySelector('strong').textContent])
    ), [
      ['Request Date', '8 Sep 2026'], ['Quantity', '1'],
      ['UOM', 'Piece'], ['Reason', 'Inventory Request Reason 1']
    ]);
    await page.click('[data-history-kind="guest-visit"]');
    await page.evaluate((key, seededRecords) => localStorage.setItem(key, JSON.stringify(seededRecords)), historyKey, records);
    await page.reload({ waitUntil: 'load' });

    assert.equal(await page.$eval('.history-card-item', node => getComputedStyle(node).borderRadius), '18px');
    assert.equal(await page.$eval('.history-card-title', node => node.textContent.trim()), 'Guest Visit');
    assert.match(await page.$eval('.history-card-ref', node => node.textContent.trim()), /^Ref: FGV\d{13}$/);
    assert.deepEqual(await page.$$eval('.history-card-item .history-card-row', rows => rows.map(row => [
      row.querySelector('span').textContent.replace(':', '').trim(),
      row.querySelector('strong').textContent.trim()
    ])), [
      ['Visit Date', '6 Oct 2026'],
      ['Visit Time', '09:00 \u2013 10:00'],
      ['Visitor', '1'],
      ['Location', 'Head Office']
    ]);
    assert.equal(await page.$eval('.history-card-item .status-pill', node => node.textContent.trim()), 'Pending');

    await page.click('.history-card-item');
    assert.equal(await page.$eval('#historyDetailTitle', node => node.textContent.trim()), 'Guest Visit Details');
    assert.deepEqual(await page.evaluate(detailLabels), [
      'Reference #', 'Emp #', 'Name', 'Visit Date', 'Visit Time', 'Visitor', 'Submit Date',
      'Location', 'Request Meal?', 'Floor Visit?', 'Sit Arrange?', 'Multi Room?', 'Remarks', 'Status'
    ]);
    assert.equal(await page.$eval('#historyDetailBody [data-detail-field="Emp #"]', node => node.textContent.trim()), '#EBB12');
    assert.deepEqual(await page.$$eval('.history-detail-section-title', nodes => nodes.map(node => node.textContent.trim())), [
      'Guest Information', 'Internal Attendee', 'Attachment'
    ]);
    assert.ok((await page.$eval('#historyDetailBody', node => node.textContent)).includes('Meranti Retail'));
    assert.ok((await page.$eval('#historyDetailBody', node => node.textContent)).includes('visitor-list.pdf'));

    await page.click('#closeHistoryDetails');
    await page.click('[data-history-kind="letter-request"]');
    assert.equal(await page.$eval('.history-card-title', node => node.textContent.trim()), 'Guarantee Letter');
    assert.deepEqual(await page.$$eval('.history-card-item .history-card-row', rows => rows.map(row => [
      row.querySelector('span').textContent.replace(':', '').trim(),
      row.querySelector('strong').textContent.trim()
    ])), [
      ['Submitted Date', '5 Oct 2026'],
      ['Type', 'Letter of Guarantee'],
      ['Acknowledged On', '11 Jul 2026'],
      ['Reason', 'To apply admission to Hospital']
    ]);

    await page.click('.history-card-item');
    assert.equal(await page.$eval('#historyDetailTitle', node => node.textContent.trim()), 'Letter Request Details');
    assert.deepEqual(await page.evaluate(detailLabels), [
      'Request Date', 'Reference #', 'Type', 'Status', 'Description', '1st Merge Text',
      '2nd Merge Text', '3rd Merge Text', 'Reason', 'Remark', 'FileName', 'Acknowledged On'
    ]);
    assert.equal(await page.$eval('#historyDetailBody [data-detail-field="FileName"]', node => node.textContent.trim()), 'guarantee-letter.pdf');
    await page.click('#closeHistoryDetails');
    await page.evaluate(key => {
      const rows = JSON.parse(localStorage.getItem(key));
      rows.push({ id: 'inventory-attachment', kind: 'inventory-request', title: 'Laptop', date: '2026-10-07', status: 'submitted', createdAt: '2026-10-07T10:00:00Z', fields: [['Request Item', 'Laptop'], ['Quantity', '1'], ['Attachment', 'laptop-quote.pdf']] });
      rows.push({ id: 'letter-draft-date', kind: 'letter-request', title: 'New letter', date: '2026-10-01', status: 'draft', createdAt: '2026-10-08T10:00:00Z', fields: [['Description', 'Reapplied letter'], ['Letter Type', 'Employment Verification Letter']] });
      localStorage.setItem(key, JSON.stringify(rows));
      window.dispatchEvent(new Event('pageshow'));
    }, historyKey);
    await page.click('[data-history-kind="inventory-request"]');
    await page.click('[data-record-id="inventory-attachment"] .history-card-main');
    assert.match(await page.$eval('#historyDetailBody', n => n.textContent), /laptop-quote.pdf/, 'Existing inventory attachments remain visible');
    await page.keyboard.press('Escape');
    await page.click('[data-history-kind="letter-request"]');
    assert.equal(await page.$eval('[data-record-id="letter-draft-date"] .history-card-row:last-child strong', n => n.textContent), '—');
    await page.click('[data-record-id="letter-draft-date"] [data-history-action="apply"]');
    const submitDate = await page.evaluate(() => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' Sept ', ' Sep '));
    assert.equal(await page.$eval('[data-record-id="letter-draft-date"] .history-card-row strong', n => n.textContent), submitDate, 'Reapplied letters display their new submit date');
    assert.equal(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), true, 'History page must fit the mobile viewport');
    assert.deepEqual(errors, []);
    console.log('PASS: Workplace History cards and grouped details use the consistent design.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
