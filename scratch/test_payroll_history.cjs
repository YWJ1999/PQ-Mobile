const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const { execFileSync } = require('node:child_process');

const url = file => pathToFileURL(path.resolve(__dirname, '../modules/payroll', file)).href;
async function shown(page, selector) {
  return page.$eval(selector, node => node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none');
}
async function filter(page, values) {
  await page.click('#historyFilterTrigger');
  for (const [id, value] of Object.entries(values)) {
    await page.$eval(`#${id}`, (node, next) => { node.value = next; }, value);
  }
  await page.click('#applyHistoryFilter');
}
async function refs(page) {
  return page.$$eval('.history-card-item', nodes => nodes.map(node => node.dataset.reference));
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(url('index.html'), { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-payroll-option="history"]');
    await page.click('[data-payroll-option="history"]');
    await page.waitForFunction(() => location.pathname.endsWith('/options/history.html'), { timeout: 4000 });
    await page.waitForSelector('.history-card-item');
    assert.deepEqual(await refs(page), ['RBT000000000039', 'RBT000000000049', 'RBT000000000050']);
    assert.equal(await shown(page, '#historyFilterModal'), false, 'Filter must stay closed on entry');
    assert.equal(await shown(page, '#historyDetailsModal'), false, 'Details must stay closed on entry');
    const categoryTabs = await page.$$eval('.history-categories .me-jump-pill', tabs => tabs.map(tab => {
      const style = getComputedStyle(tab);
      return { flexGrow: style.flexGrow, background: style.backgroundImage, backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, boxShadow: style.boxShadow, color: style.color, width: tab.getBoundingClientRect().width };
    }));
    assert.deepEqual(categoryTabs.map(tab => tab.flexGrow), ['1', '1'], 'Payroll History tabs must share the row evenly');
    assert.ok(Math.abs(categoryTabs[0].width - categoryTabs[1].width) < 1, 'Payroll History tabs must have equal widths');
    assert.equal(categoryTabs[0].background, 'linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(109, 40, 217) 100%)', 'The selected Payroll History tab must use the exact Claim History purple');
    assert.ok(categoryTabs[0].boxShadow.includes('rgba(124, 58, 237, 0.4)') && categoryTabs[0].color === 'rgb(255, 255, 255)', 'The selected Payroll History tab must use the Claim History purple glow');
    assert.notEqual(categoryTabs[1].backgroundColor, 'rgba(0, 0, 0, 0)', 'The inactive Payroll History tab must keep a dark pill surface');
    assert.equal(categoryTabs[1].borderRadius, '999px', 'Payroll History tabs must use fully rounded pill corners');
    const cards = await page.$$eval('.history-card-item', nodes => nodes.map(node => node.textContent.replace(/\s+/g, ' ')));
    assert.ok(cards[0].includes('14 Aug 2025') && cards[0].includes('RM 100.00'));
    assert.ok(cards[1].includes('19 Mar 2026') && cards[1].includes('RM 12.00'));
    assert.ok(cards[2].includes('TXR05') && cards[2].includes('RM 14.00'));
    assert.deepEqual(await page.$$eval('.history-card-item', nodes => nodes.map(node => node.dataset.status)), ['submitted', 'submitted', 'submitted'], 'Tax Relief History must match the three Submitted screenshot records');
    const submittedActions = await page.$eval('[data-reference="RBT000000000039"]', card => [...card.querySelectorAll('.history-card-action')].map(button => button.textContent.trim()));
    assert.deepEqual(submittedActions, ['Cancel'], 'Submitted history cards expose Cancel');
    const remainingSubmittedActions = await page.$$eval('[data-reference="RBT000000000049"], [data-reference="RBT000000000050"]', cards => cards.map(card => [...card.querySelectorAll('.history-card-action')].map(button => button.textContent.trim())));
    assert.deepEqual(remainingSubmittedActions, [['Cancel'], ['Cancel']], 'Submitted Tax Relief cards expose Cancel');
    const cancelPresentation = await page.$eval('[data-reference="RBT000000000039"] .history-card-action', button => {
      const rect = button.getBoundingClientRect();
      const footer = button.parentElement;
      const footerStyle = getComputedStyle(footer);
      return {
        width: rect.width,
        available: footer.clientWidth - parseFloat(footerStyle.paddingLeft) - parseFloat(footerStyle.paddingRight),
        rightInset: footer.getBoundingClientRect().right - rect.right - parseFloat(footerStyle.paddingRight)
      };
    });
    assert.ok(cancelPresentation.width < cancelPresentation.available / 2 && Math.abs(cancelPresentation.rightInset) <= 1,
      'Submitted card Cancel is compact and right-aligned');
    await page.click('#historyFilterTrigger');
    const taxFilterLabels = await page.evaluate(() => ({
      from: document.getElementById('historyDateFromLabel').textContent.trim(),
      to: document.getElementById('historyDateToLabel').textContent.trim()
    }));
    assert.deepEqual(taxFilterLabels, { from: 'Start Date', to: 'End Date' }, 'Tax Relief filter must use Start Date and End Date');
    assert.equal(await page.$('.history-filter-help'), null, 'Tax Relief filter must not show explanatory date copy');
    await page.keyboard.press('Escape');
    await page.click('[data-reference="RBT000000000039"] .history-card-main');
    await page.waitForFunction(() => document.activeElement?.id === 'closeHistoryDetails');
    const detail = await page.$eval('#historyDetailsModal', node => node.textContent.replace(/\s+/g, ' '));
    for (const expected of ['Tax Relief Detail', 'Farhan binti rahmat', '#EBB12', '7 Jan 2026', 'Medical Relief', 'Invoice.docx', 'Process', 'No', 'Approval Date', 'Approver Remarks', 'Reason required']) {
      assert.ok(detail.includes(expected), `Details must preserve ${expected}`);
    }
    const taxRows = await page.$$eval('#historyDetailBody tr', rows => Object.fromEntries(rows.map(row => [row.querySelector('th').textContent.trim(), row.querySelector('td').textContent.replace(/\s+/g, ' ').trim()])));
    assert.deepEqual(await page.$$eval('#historyDetailActions [data-history-action]', nodes => nodes.map(node => node.textContent.trim())), ['Cancel']);
    assert.equal(taxRows['Emp #'], '#EBB12');
    assert.equal(taxRows.Name, 'Farhan binti rahmat');
    assert.equal(taxRows['Rebate Item'], 'BASIC SUPPORTING EQUIPMENT');
    assert.equal(taxRows['Approval Date'], '1 Jan 1');
    await page.keyboard.press('Escape');
    assert.equal(await shown(page, '#historyDetailsModal'), false);
    assert.equal(await page.$eval('[data-reference="RBT000000000039"] .history-card-main', node => node === document.activeElement), true);
    await filter(page, { historyRebateItem: 'TXR05' });
    assert.deepEqual(await refs(page), ['RBT000000000050']);
    await page.click('#historyFilterTrigger');
    await page.click('#resetHistoryFilter');
    await page.click('#applyHistoryFilter');
    assert.equal((await refs(page)).length, 3);
    await filter(page, { historyDateFrom: '2026-01-07', historyDateTo: '2026-01-07' });
    assert.deepEqual(await refs(page), ['RBT000000000039'], 'Date filter must use submission date for the 2025 transaction submitted in 2026');
    await page.click('#historyFilterTrigger');
    await page.click('#resetHistoryFilter');
    await page.$eval('#historyDescription', node => { node.value = 'mEdIcAl ReLiEf'; });
    await page.click('#applyHistoryFilter');
    assert.deepEqual(await refs(page), ['RBT000000000039']);
    await filter(page, { historyStatus: 'approved' });
    assert.equal((await refs(page)).length, 0);
    assert.ok(await shown(page, '#historyEmptyState'));
    await page.click('#historyFilterTrigger');
    await page.click('#resetHistoryFilter');
    await page.$eval('#historyDateFrom', node => { node.value = '2026-10-02'; });
    await page.$eval('#historyDateTo', node => { node.value = '2026-01-01'; });
    await page.click('#applyHistoryFilter');
    assert.equal(await shown(page, '#historyFilterModal'), true, 'Invalid range must leave filter open');
    assert.ok(await shown(page, '#historyFilterError'));
    await page.click('#resetHistoryFilter');
    await page.click('#applyHistoryFilter');
    assert.equal((await refs(page)).length, 3);
    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => window.setTheme(value), theme);
      for (const width of [360, 390, 420, 1280]) {
        await page.setViewport({ width, height: width === 1280 ? 1000 : 844 });
        for (const state of ['list', 'filter', 'details']) {
          if (state === 'filter') await page.click('#historyFilterTrigger');
          if (state === 'details') await page.click('[data-reference="RBT000000000039"] .history-card-main');
          const overflow = await page.evaluate(() => [...document.querySelectorAll('.phone-container, main, .claim-filter-panel, .history-detail-panel')]
            .filter(node => node.getClientRects().length && node.scrollWidth > node.clientWidth + 1)
            .map(node => node.className));
          assert.deepEqual(overflow, [], `${theme} ${width}px ${state} must fit horizontally`);
          if (width === 390) await page.screenshot({ path: path.join(__dirname, `payroll_history_${state}_${theme}.png`) });
          if (state !== 'list') await page.keyboard.press('Escape');
        }
      }
    }
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await shown(page, '#historyFilterModal'), false);
    await page.click('[data-history-kind="deduction"]');
    assert.deepEqual(await refs(page), ['PDR000000000004', 'deduction-202008-asb', 'deduction-202112-absent', 'deduction-202205-advance', 'deduction-202507-uniform']);
    const deductionCards = await page.$$eval('.history-card-item', cards => cards.map(card => card.textContent.replace(/\s+/g, ' ')));
    for (const expected of ['HOUSE DEDUCTION', '202007', '11 Jun 2020', 'MONTH END', 'RM 200.00', 'Draft']) assert.ok(deductionCards[0].includes(expected));
    const draftLayout = await page.$$eval('[data-reference="PDR000000000004"] .history-card-action', buttons => buttons.map(button => {
      const { top, width } = button.getBoundingClientRect();
      return { top, width, label: button.textContent.trim() };
    }));
    assert.deepEqual(draftLayout.map(button => button.label), ['Submit', 'Cancel']);
    assert.equal(draftLayout[0].top, draftLayout[1].top, 'Draft card actions share a row');
    assert.ok(Math.abs(draftLayout[0].width - draftLayout[1].width) <= 1, 'Draft card actions have equal widths');
    await page.click('[data-reference="PDR000000000004"] .history-card-main');
    assert.deepEqual(await page.$$eval('#historyDetailActions [data-history-action]', nodes => nodes.map(node => node.textContent.trim())), ['Submit', 'Delete Record']);
    const deductionRows = await page.$$eval('#historyDetailBody tr', rows => Object.fromEntries(rows.map(row => [row.querySelector('th').textContent.trim(), row.querySelector('td').textContent.replace(/\s+/g, ' ').trim()])));
    assert.deepEqual(Object.keys(deductionRows), ['Reference #', 'Emp #', 'Name', 'Status', 'Submit Date', 'Request Type', 'Deduction Type', 'Period', 'Cycle', 'Deduction Date', 'Account No', 'Amount', 'Attachments']);
    assert.equal(deductionRows['Reference #'], 'PDR000000000004');
    assert.equal(deductionRows['Emp #'], '#EBB12');
    assert.equal(deductionRows.Name, 'Farhan binti rahmat');
    assert.equal(deductionRows['Request Type'], 'Start Deduction');
    assert.equal(deductionRows['Deduction Date'], '1 Jul 2020');
    assert.ok(deductionRows.Attachments.includes('test.txt'));
    await page.keyboard.press('Escape');
    await page.click('#historyFilterTrigger');
    const deductionFilter = await page.evaluate(() => ({
      fromLabel: document.querySelector('label[for="historyDateFrom"]').textContent.trim(),
      toLabel: document.querySelector('label[for="historyDateTo"]').textContent.trim(),
      fromType: document.getElementById('historyDateFrom').type,
      toType: document.getElementById('historyDateTo').type,
      itemLabel: document.getElementById('historyItemLabel').textContent.trim(),
      statusHidden: document.getElementById('historyStatusField').hidden,
      descriptionHidden: document.getElementById('historyDescriptionField').hidden
    }));
    assert.deepEqual(deductionFilter, { fromLabel: 'Start Period', toLabel: 'End Period', fromType: 'month', toType: 'month', itemLabel: 'Deduction Type', statusHidden: true, descriptionHidden: true });
    assert.equal(await page.$('.history-filter-help'), null, 'Deduction filter must not show explanatory period copy');
    await page.click('#resetHistoryFilter');
    await page.click('#applyHistoryFilter');
    assert.equal(await page.$eval('#historyCreateRequest', node => node.getAttribute('href')), 'deduction-request.html');
    await page.goto(url('options/deduction-request.html'), { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('#payrollSubmit')?.disabled === false);
    await page.select('#deductionType', 'HOUSING LOAN');
    await page.type('#accountNo', '001235');
    await page.type('#remarks', 'Please stop the housing loan deduction.');
    await page.evaluate(() => {
      const files = new DataTransfer();
      files.items.add(new File(['Payroll deduction attachment'], 'deduction.txt', { type: 'text/plain' }));
      const input = document.getElementById('payrollFiles');
      input.files = files.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.click('#payrollSubmit');
    await page.waitForFunction(() => document.querySelector('#payrollFormStatus')?.textContent === 'Saved on this device');
    await page.goto(`${url('options/history.html')}?category=deduction`, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForSelector('.history-card-item');
    assert.deepEqual(await refs(page), ['PDR000000000004', 'deduction-202008-asb', 'deduction-202112-absent', 'deduction-202205-advance', 'deduction-202507-uniform', 'EBB01:deduction']);
    const deduction = await page.$eval('[data-reference="EBB01:deduction"]', node => node.textContent);
    for (const expected of ['HOUSING LOAN', 'Draft', '202610', 'MONTH END', 'RM 0.00']) assert.ok(deduction.includes(expected));
    const draftActions = await page.$eval('[data-reference="EBB01:deduction"]', card => [...card.querySelectorAll('.history-card-action')].map(button => button.textContent.trim()));
    assert.deepEqual(draftActions, ['Submit', 'Cancel'], 'Draft history cards expose Submit and Cancel');
    await page.click('[data-reference="EBB01:deduction"] .history-card-main');
    const savedDetail = await page.$eval('#historyDetailBody', node => node.textContent);
    assert.deepEqual(await page.$$eval('#historyDetailActions [data-history-action]', nodes => nodes.map(node => node.textContent.trim())), ['Submit', 'Delete Record']);
    assert.equal(await page.$eval('#historyDetailActions [data-history-detail-aux]', node => node.textContent.trim()), 'Edit Deduction Request');
    assert.ok(await page.$('#historyDetailActions [data-history-detail-aux] > .fa-pen[aria-hidden="true"]'));
    assert.ok(await page.$eval('#historyDetailActions', footer => {
      const [submit, remove, edit] = [...footer.children].map(action => action.getBoundingClientRect());
      const css = getComputedStyle(footer);
      const width = footer.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      return remove.top >= submit.bottom && edit.top >= remove.bottom
        && Math.abs(remove.width - width) <= 1 && Math.abs(edit.width - width) <= 1;
    }), 'Delete Record and Edit occupy their own full-width rows');
    for (const expected of ['Sarah Jenkins', '#EBB01', 'Stop Deduction', '202610', '1 Oct 2026', 'MONTH END', '001235', 'deduction.txt']) assert.ok(savedDetail.includes(expected));
    assert.equal(savedDetail.includes('Please stop the housing loan deduction.'), false, 'Deduction details must only show fields supplied by the history schema');
    assert.equal(await page.$eval('.history-attachment', async link => (await fetch(link.href)).text()), 'Payroll deduction attachment', 'Saved attachments must retain their actual file contents');
    await page.screenshot({ path: path.join(__dirname, 'payroll_history_deduction_details_light.png') });
    await page.keyboard.press('Escape');
    await filter(page, { historyDateFrom: '2026-10', historyDateTo: '2026-10', historyRebateItem: 'HOUSING LOAN' });
    assert.equal((await refs(page)).length, 1);
    await page.screenshot({ path: path.join(__dirname, 'payroll_history_deduction_list_light.png') });
    await page.click('[data-reference="EBB01:deduction"] .history-card-main');
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('peoplehcm-payroll-forms', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('requests', 'readwrite');
        const store = transaction.objectStore('requests');
        const request = store.get('EBB01:deduction');
        request.onsuccess = () => {
          const record = request.result;
          record.values.accountNo = '007777';
          record.attachments = [{ name: 'updated.txt', file: new File(['Updated attachment'], 'updated.txt', { type: 'text/plain' }) }];
          store.put(record);
        };
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    assert.equal(await shown(page, '#historyDetailsModal'), false, 'A restored page must close stale details after a request was edited');
    await page.waitForFunction(() => document.getElementById('payrollHistoryList').getAttribute('aria-busy') === 'false');
    assert.equal((await refs(page)).length, 1, 'Restoring History must replace saved drafts without duplicating records');
    await page.click('[data-reference="EBB01:deduction"] .history-card-main');
    assert.ok(await page.$eval('#historyDetailBody', node => node.textContent.includes('007777')));
    assert.equal(await page.$eval('.history-attachment', async link => (await fetch(link.href)).text()), 'Updated attachment');
    await page.keyboard.press('Escape');
    await page.click('[data-history-kind="tax"]');
    assert.equal((await refs(page)).length, 3, 'Each category must retain its own filters');

    // Compare Claims against its original card CSS to protect the shared-style extraction.
    const baselineStyles = execFileSync('git', ['show', 'HEAD:css/history-cards.css'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/claims/options/history.html')).href, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.history-card-item');
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
    const cardAppearance = () => page.evaluate(() => ['.history-card-item', '.history-card-title', '.history-card-ref', '.history-card-details', '.status-pill'].map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return Object.fromEntries(['color', 'background', 'border', 'border-radius', 'padding', 'font-size', 'font-weight', 'display', 'gap'].map(property => [property, style.getPropertyValue(property)]));
    }));
    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => window.setTheme(value), theme);
      const shared = await cardAppearance();
      const baseline = await page.addStyleTag({ content: baselineStyles });
      assert.deepEqual(await cardAppearance(), shared, `${theme}: Claims history appearance must match its original styles`);
      await baseline.evaluate(node => node.remove());
    }
    assert.deepEqual(faults, []);
    console.log('PASS: Payroll History navigation, screenshot records, full details, filtering, empty/invalid states, modal focus, dark/light and responsive layouts.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
