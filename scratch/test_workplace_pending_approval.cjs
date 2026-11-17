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
      assert.match(await page.$eval('#workplacePendingQueue', n => n.textContent), /Farhan binti rahmat.*#EBB12.*FGV0000000000013.*Pending.*16 Aug 2024/s);
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
        ['Document Status', 'Pending'],
        ['Employee #', '#EBB12'],
        ['Name', 'Farhan binti rahmat'],
        ['Position', 'GROUP HR MANAGER'],
        ['Department', 'HUMAN RESOURCE'],
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
      await page.click('#workplaceApprovalDetails [data-approval-back]');
      await page.waitForSelector('#workplaceApprovalDetails', { hidden: true });
      await page.click('#workplacePendingQueue .three-dots-btn');
      await page.click('#workplacePendingViewWorkflow');
      assert.match(await page.$eval('#workplaceApprovalWorkflow', n => n.textContent), /Farhan binti rahmat.*#EBB12.*RequestInventory Request/s);
      await page.click('#workplaceApprovalWorkflow [data-approval-back]');
      await page.waitForSelector('#workplaceApprovalWorkflow', { hidden: true });
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
      await page.click('#workplaceApprovalWorkflow [data-approval-back]');
      await page.waitForSelector('#workplaceApprovalWorkflow', { hidden: true });
      await page.click('.three-dots-btn');
      await page.click('#workplacePendingViewDetails');
      assert.match(await page.$eval('#workplaceApprovalDetailsTitle', n => n.textContent), /Guest Visit Request Approval/);
      const fields = '#workplaceGuestVisit guest-visit-fields[readonly]';
      assert.deepEqual(await page.$$eval(fields + ' [role="tab"]', tabs => tabs.map(tab => tab.textContent.trim().slice(1))), ['General', 'Guest', 'Attendee', 'Other']);
      assert.ok(await page.$$eval(fields + ' input, ' + fields + ' select', controls => controls.every(control => control.readOnly || control.disabled)));
      assert.deepEqual(await page.$$eval('#visitDate, #visitStartTime, #visitEndTime, #visitTotalGuest, #visitLocation', inputs => inputs.map(input => input.value)), ['8 Oct 2026', '00:00', '00:00', '0', '—']);
      assert.equal(await page.$eval('#visitMeal', field => field.checked), false);
      assert.match(await page.$eval('.visit-submission-meta', n => n.textContent), /FGV0000000000013.*Pending.*16 Aug 2024/);
      assert.equal(await page.$eval('#visitAttachments', n => n.textContent), 'No attachments');
      assert.equal(await page.$(fields + ' .visit-add-record, ' + fields + ' input[type="file"]'), null);
      await shot(page, `workplace-pending-general-${theme}-${width}.png`);
      await page.click('#visitSummaryDetails');
      await page.click('[data-visit-category="guest"]');
      assert.equal(await page.$eval('#visitGuestEmpty', n => n.hidden), false);
      await page.focus('#visitTab-guest');
      await page.keyboard.press('ArrowRight');
      await page.click('#visitAttendeeList [data-toggle-record]');
      assert.match(await page.$eval('#visitAttendeeList', n => n.innerText.replace(/\s+/g, ' ')), /Ram chhabila.*#000001.*ACCOUNTS.*ACCOUNT EXECUTIVE/);
      await shot(page, `workplace-pending-attendee-${theme}-${width}.png`);
      await page.click('#visitTab-other');
      assert.deepEqual(await page.$$eval('#visitPanel-other input', n => n.map(input => input.checked)), [false, false, false, true]);
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
      assert.ok(await page.$eval('#workplaceGuestVisit', n => n.scrollWidth <= n.clientWidth));
      assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth));
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: consistent approval cards, reference fields, filters, details, attendee, other requests, decisions, bulk actions, persistence and storage errors`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
