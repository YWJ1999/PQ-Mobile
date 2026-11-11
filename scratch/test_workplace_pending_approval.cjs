const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const key = 'peoplehcm:workplace:pending-approval:v1';
const url = pathToFileURL(path.resolve(__dirname, '../modules/admin/options/pending-approval.html')).href;
async function shot(page, name) {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))); });
  await page.screenshot({ path: path.resolve(__dirname, name) });
}
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'load' });
      await page.evaluate(storageKey => localStorage.removeItem(storageKey), key);
      await page.reload({ waitUntil: 'load' });
      assert.deepEqual(await page.$$eval('[data-workplace-tab]', tabs => tabs.map(tab => ({
        text: tab.textContent.trim(),
        selected: tab.getAttribute('aria-selected')
      }))), [
        { text: 'Guest Visit', selected: 'true' },
        { text: 'Inventory', selected: 'false' }
      ]);
      assert.equal(await page.$$eval('#workplacePendingQueue .approval-request-card', n => n.length), 1);
      assert.match(await page.$eval('#workplacePendingQueue', n => n.textContent), /Farhan binti rahmat.*#EBB12.*Submitted.*16 Aug 2024.*FGV0000000000013/s);
      assert.equal(await page.$eval('.employee-id', n => n.previousElementSibling.textContent), 'Farhan binti rahmat');
      await shot(page, `workplace-pending-list-${theme}-${width}.png`);
      await page.focus('[data-workplace-tab="guest-visit"]');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval('[data-workplace-tab="inventory"]', n => n.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '1');
      assert.match(await page.$eval('#workplacePendingQueue', n => n.textContent), /Farhan binti rahmat.*#EBB12.*Quantity.*1.*Request Item.*LOCKER 1000.*Reason.*Inventory Request Reason 1/s);
      await shot(page, `workplace-pending-inventory-${theme}-${width}.png`);
      await page.click('#workplacePendingQueue .workplace-approval-review');
      assert.equal(await page.$eval('#workplaceApprovalDetailsTitle', n => n.textContent), 'Inventory Request Approval');
      assert.deepEqual(await page.$$eval('#workplaceApprovalDetails .claim-detail-section:not([hidden]) > h4', n => n.map(h => h.textContent)), ['Request Details']);
      assert.deepEqual(await page.$$eval('#approvalPanel-general .payroll-approval-table tr', rows => rows.map(row => [
        row.querySelector('th').textContent.trim(),
        row.querySelector('td').textContent.trim()
      ])), [
        ['Document Reference #', 'IRQ0000000000064'],
        ['Employee #', '#EBB12'],
        ['Name', 'Farhan binti rahmat'],
        ['Position', 'GROUP HR MANAGER'],
        ['Department', 'HUMAN RESOURCE'],
        ['Document Status', 'Submitted'],
        ['Submit Date', '8 Sep 2026'],
        ['Item Group', 'OFFICE EQUIPMENT'],
        ['Item', 'LOCKER 1000'],
        ['Item Type', 'Asset'],
        ['Required By', '8 Sep 2026'],
        ['Survey', 'No'],
        ['Checklist', 'No'],
        ['Unit of Measure', 'Piece'],
        ['Reason', 'Inventory Request Reason 1'],
        ['Quantity', '1'],
        ['Remarks', '—'],
        ['Attachment', 'None']
      ]);
      assert.deepEqual(await page.$eval('#workplaceApprovalComments', card => {
        const control = card.querySelector('input, textarea');
        return {
          label: card.querySelector('label').textContent.trim(),
          tag: control.tagName,
          type: control.type,
          placeholder: control.placeholder,
          height: getComputedStyle(control).height,
          cardRadius: getComputedStyle(card).borderRadius
        };
      }), {
        label: 'Approver Action Comments',
        tag: 'INPUT',
        type: 'text',
        placeholder: 'Add approver action comments (optional)...',
        height: '34px',
        cardRadius: '16px'
      });
      await page.keyboard.press('Escape');
      await page.click('#workplacePendingQueue .three-dots-btn');
      await page.click('#workplacePendingViewWorkflow');
      assert.match(await page.$eval('#workplaceApprovalWorkflow', n => n.textContent), /Farhan binti rahmat.*#EBB12.*RequestInventory Request/s);
      await page.keyboard.press('Escape');
      await page.click('[data-workplace-tab="guest-visit"]');
      await page.click('#workplacePendingFilterTrigger');
      await page.type('#workplacePendingFilter-keyword', 'no matching employee');
      await page.click('#workplacePendingFilter [type="submit"]');
      assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '0');
      await page.click('#workplacePendingFilterTrigger');
      await page.click('#workplacePendingFilter [data-action="reset"]');
      await page.$eval('#workplacePendingFilter-startDate', n => { n.value = '2024-08-16'; });
      await page.$eval('#workplacePendingFilter-endDate', n => { n.value = '2024-08-16'; });
      await page.click('#workplacePendingFilter [type="submit"]');
      assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '1');
      await page.click('.three-dots-btn');
      await page.click('#workplacePendingViewWorkflow');
      assert.match(await page.$eval('#workplaceApprovalWorkflow', n => n.textContent), /FGV0000000000013.*Farhan binti rahmat.*#EBB12.*Submitted.*Awaiting Approval/s);
      assert.equal(await page.$eval('#workplaceApprovalWorkflow .employee-id', n => getComputedStyle(n).fontSize), '11.5px', 'Workflow uses the same subtle employee ID typography');
      await page.keyboard.press('Escape');
      await page.click('.three-dots-btn');
      await page.click('#workplacePendingViewDetails');
      assert.match(await page.$eval('#workplaceApprovalDetailsTitle', n => n.textContent), /Guest Visit Request Approval/);
      assert.equal(await page.$$eval('#workplaceApprovalDetails .claim-detail-section input, #workplaceApprovalDetails .claim-detail-section select, #workplaceApprovalDetails .claim-detail-section textarea', n => n.length), 0, 'Submitted request data is displayed as read-only text');
      assert.match(await page.$eval('#approvalPanel-general', n => n.textContent), /Visit Date.*8 Oct 2026.*Visit Time.*00:00.*00:00.*Total Guest.*0.*Meal\?.*No/s);
      assert.equal(await page.$$eval('#workplaceApprovalDetails [role="tab"]', n => n.length), 0, 'Mileage-style approval details show continuous sections');
      assert.deepEqual(await page.$$eval('#workplaceApprovalDetails .claim-detail-section > h4', n => n.map(h => h.textContent)), ['General', 'Guest', 'Attendee', 'Other']);
      assert.ok(await page.$$eval('#workplaceApprovalDetails .claim-detail-section', n => n.every(section => !section.hidden)), 'All request sections are available in one scrollable detail view');
      await shot(page, `workplace-pending-general-${theme}-${width}.png`);
      assert.equal(await page.$eval('#approvalPanel-guest', n => /No guest/.test(n.textContent)), false);
      assert.match(await page.$eval('#approvalPanel-attendee', n => n.textContent), /Ram chhabila.*#000001.*ACCOUNTS.*ACCOUNT EXECUTIVE/s);
      await page.$eval('#approvalPanel-attendee', n => { const body = n.parentElement; body.scrollTop += n.getBoundingClientRect().top - body.getBoundingClientRect().top - 14; });
      await shot(page, `workplace-pending-attendee-${theme}-${width}.png`);
      assert.match(await page.$eval('#approvalPanel-other', n => n.textContent), /Floor VisitNo.*Sitting ArrangementNo.*Multiple RoomsNo.*NoneYes/s);
      await page.$eval('#approvalPanel-other', n => { const body = n.parentElement; body.scrollTop += n.getBoundingClientRect().top - body.getBoundingClientRect().top - 14; });
      await shot(page, `workplace-pending-other-${theme}-${width}.png`);
      const submitted = await page.evaluate(() => window.WorkplacePendingStore.list()[0]);
      await page.type('#approvalComments', '<script>review</script> Approved visit');
      await page.evaluate(() => { window.restoreWrite = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Storage full'); }; });
      await page.click('#workplaceApprovalDetails [data-approval-action="approve"]');
      assert.match(await page.$eval('#workplaceApprovalDetailFeedback', n => n.textContent), /Unable/);
      assert.equal(await page.evaluate(() => window.WorkplacePendingStore.getPending().length), 2);
      await page.evaluate(() => { Storage.prototype.setItem = window.restoreWrite; });
      await page.click('#workplaceApprovalDetails [data-approval-action="approve"]');
      assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '0');
      assert.equal(await page.evaluate(() => window.WorkplacePendingStore.list().find(item => item.kind === 'guest-visit').status), 'approved');
      const approved = await page.evaluate(() => window.WorkplacePendingStore.list().find(item => item.kind === 'guest-visit'));
      for (const field of ['visitDate', 'startTime', 'endTime', 'totalGuest', 'location', 'meal', 'otherRequests']) assert.deepEqual(approved[field], submitted[field]);
      assert.equal(approved.approverComments, '<script>review</script> Approved visit');
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '0', 'Decisions survive reload');
      for (const [action, status] of [['resubmit', 'resubmit'], ['reject', 'rejected']]) {
        await page.evaluate(storageKey => localStorage.removeItem(storageKey), key);
        await page.reload({ waitUntil: 'load' });
        await page.click('#workplacePendingSelectAll');
        await page.click(`#workplacePendingBulk [data-approval-action="${action}"]`);
        assert.equal(await page.evaluate(() => window.WorkplacePendingStore.list().find(item => item.kind === 'guest-visit').status), status);
        assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '0');
      }
      await page.evaluate(storageKey => localStorage.removeItem(storageKey), key);
      await page.reload({ waitUntil: 'load' });
      await page.evaluate(() => { window.restoreWrite = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Storage full'); }; });
      await page.click('#workplacePendingQueue .three-dots-btn');
      await page.click('#workplaceApprovalMenu [data-approval-action="cancel"]');
      assert.match(await page.$eval('#workplaceApprovalMenuFeedback', n => n.textContent), /Unable/);
      assert.equal(await page.evaluate(() => window.WorkplacePendingStore.getPending().length), 2, 'Failed cancellation retains the pending request');
      await page.evaluate(() => { Storage.prototype.setItem = window.restoreWrite; });
      await page.click('#workplaceApprovalMenu [data-approval-action="cancel"]');
      assert.equal(await page.$eval('#workplacePendingCount', n => n.textContent), '0');
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.evaluate(() => window.WorkplacePendingStore.list().find(item => item.kind === 'guest-visit').status), 'cancelled', 'Card cancellation survives reload');
      await page.evaluate(storageKey => { localStorage.setItem(storageKey, '{bad'); window.dispatchEvent(new StorageEvent('storage', { key: storageKey })); }, key);
      assert.equal(await page.$eval('#workplacePendingError', n => n.hidden), false);
      await page.setViewport({ width, height: 640 });
      await page.evaluate(storageKey => localStorage.removeItem(storageKey), key);
      await page.reload({ waitUntil: 'load' });
      await page.click('.three-dots-btn');
      await page.click('#workplacePendingViewDetails');
      assert.ok(await page.$eval('#workplaceApprovalDetails .payroll-approval-panel', n => n.scrollWidth <= n.clientWidth));
      assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth));
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: consistent approval cards, reference fields, filters, details, attendee, other requests, decisions, bulk actions, persistence and storage errors`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
