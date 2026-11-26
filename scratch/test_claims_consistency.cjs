const assert = require('assert');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const CLAIMS_URL = `file:///${path.join(ROOT, 'modules', 'claims').replace(/\\/g, '/')}`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function money(text) {
  return Number(String(text).replace(/[^0-9.-]/g, '')) || 0;
}

async function open(page, route) {
  await page.goto(`${CLAIMS_URL}/${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(resolve => setTimeout(resolve, 120));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });

  test('shared employee directory keeps EBB01 as Sarah Jenkins everywhere', async () => {
    await open(page, 'index.html');
    const employee = await page.evaluate(() => window.CLAIM_EMPLOYEES?.EBB01);
    assert.deepStrictEqual(employee, { name: 'Sarah Jenkins', empNo: 'EBB01' });
    await page.evaluate(() => window.ClaimsEngine.switchClaimScope('team'));
    const travelIdentity = await page.$eval('#team-trip-detail-card', el => el.innerText);
    assert.match(travelIdentity, /Sarah Jenkins\s+EBB01/);
  });

  test('Benefit Highlight uses singular title and no legacy table wording', async () => {
    await open(page, 'options/benefit-highlight.html');
    assert.strictEqual(await page.$eval('h1', el => el.innerText.trim()), 'Benefit Highlight');
    assert.doesNotMatch(await page.$eval('body', el => el.innerText), /Benefit Highlights Table/i);
  });

  test('all current View Chart pills use exact label and pie icon', async () => {
    await open(page, 'index.html');
    const buttons = await page.$$eval('.btn-view-chart-pill', els => els.map(el => ({ text: el.innerText.trim(), pie: !!el.querySelector('.fa-solid.fa-chart-pie'), nowrap: getComputedStyle(el).whiteSpace })));
    assert.strictEqual(buttons.length, 2);
    buttons.forEach(button => assert.deepStrictEqual(button, { text: 'View Chart', pie: true, nowrap: 'nowrap' }));
  });

  test('Benefit Highlight totals and details derive from visible rows', async () => {
    await open(page, 'options/benefit-highlight.html');
    const values = await page.evaluate(() => ({
      total: Number(highlightMetricValue.innerText.replace(/[^0-9.-]/g, '')),
      rows: [...document.querySelectorAll('#benefitHighlightTableBody [data-amount]')].map(el => Number(el.dataset.amount)),
      count: Number(highlightTotalRecords.innerText)
    }));
    assert.strictEqual(values.total, 13629.32);
    assert.strictEqual(values.rows.reduce((sum, value) => sum + value, 0), values.total);
    assert.strictEqual(values.count, 19);
  });

  test('Expense Highlight totals derive from visible rows', async () => {
    await open(page, 'options/expenses-highlight.html');
    const values = await page.evaluate(() => ({
      total: Number(highlightMetricValue.innerText.replace(/[^0-9.-]/g, '')),
      rows: [...document.querySelectorAll('#expensesHighlightTableBody [data-amount]')].map(el => Number(el.dataset.amount)),
      count: Number(highlightTotalRecords.innerText)
    }));
    assert.strictEqual(values.total, 12630);
    assert.strictEqual(values.rows.reduce((sum, value) => sum + value, 0), values.total);
    assert.strictEqual(values.count, 14);
  });

  test('manager highlight filters update rows, totals and counts', async () => {
    for (const route of ['options/benefit-highlight.html', 'options/expenses-highlight.html']) {
      await open(page, route);
      await page.evaluate(() => { filterKeyword.value = 'NO SUCH EMPLOYEE'; submitHighlightFilterModal(); });
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = await page.evaluate(() => ({
        visible: [...document.querySelectorAll('tbody tr')].filter(row => getComputedStyle(row).display !== 'none').length,
        total: highlightMetricValue.innerText,
        count: highlightTotalRecords.innerText
      }));
      assert.deepStrictEqual(result, { visible: 0, total: 'RM 0.00', count: '0' });
    }
  });

  test('Staff Benefit Entitlement derives KPI values and applies filters', async () => {
    await open(page, 'options/staff-entitlement.html');
    const before = await page.evaluate(() => ({
      claimed: staffEntitlementClaimedTotal.innerText,
      usable: staffEntitlementUsableTotal.innerText,
      colors: [...document.querySelectorAll('.entitlement-benefit-value')].map(el => getComputedStyle(el).color)
    }));
    assert.strictEqual(before.claimed, 'RM 700.00');
    assert.strictEqual(before.usable, 'RM 3,183.00');
    assert.strictEqual(new Set(before.colors).size, 1);
    await page.evaluate(() => { filterKeywordInput.value = 'NO SUCH EMPLOYEE'; applyEntitlementFilter(); });
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.strictEqual(await page.$$eval('#staffEntitlementRecordCardsContainer .card', els => els.filter(el => getComputedStyle(el).display !== 'none').length), 0);
  });

  test('benefit charts use one purple marker color', async () => {
    await open(page, 'index.html');
    const colors = await page.$$eval('#individual-donut-svg-container circle[stroke]:not(:first-child)', els => els.map(el => el.getAttribute('stroke')));
    assert.deepStrictEqual([...new Set(colors)], ['#7c3aed']);
    await open(page, 'options/benefit-highlight.html');
    await page.evaluate(() => showBenefitSection('chart'));
    const highlightColors = await page.$$eval('#benefitChartLegendGrid [data-marker-color]', els => els.map(el => el.dataset.markerColor));
    assert.deepStrictEqual([...new Set(highlightColors)], ['#7c3aed']);
  });

  test('highlight employee IDs sit directly below employee names', async () => {
    for (const route of ['options/benefit-highlight.html', 'options/expenses-highlight.html']) {
      await open(page, route);
      const identities = await page.$$eval('tbody .employee-identity', els => els.map(el => [...el.children].map(child => child.className)));
      assert.ok(identities.length >= 6);
      identities.forEach(children => assert.deepStrictEqual(children, ['employee-name', 'employee-id']));
    }
  });

  test('Benefit Claim exposes all four configured benefit types', async () => {
    await open(page, 'options/benefit-claim.html');
    assert.strictEqual(await page.$eval('#benefitTypeCountDisplay', el => el.innerText.trim()), '4 types');
    assert.ok(await page.$('[data-benefit-type="OPTICAL & DENTAL"]'));
    const options = await page.$$eval('#mainApplyBenefitTypeSelect option', els => els.map(el => el.value));
    assert.ok(options.includes('OPTICAL & DENTAL'));
  });

  test('Staff Claim Summary excludes pending while retaining status-bearing records', async () => {
    await open(page, 'options/staff-summary.html');
    await page.evaluate(() => { openStaffFilter(); staffIncludePending.checked = false; document.querySelector('#staffFilterModal form').requestSubmit(); });
    const result = await page.evaluate(() => ({ cards: document.querySelectorAll('.staff-summary-card').length, count: Number(staffTotalRecords.innerText), total: staffTotalAmount.innerText }));
    assert.ok(result.cards > 0);
    assert.strictEqual(result.count, 4);
    assert.strictEqual(result.total, 'RM 2670.00');
  });

  test('Work Status cards deep-link to matching shared History status records', async () => {
    await open(page, 'index.html');
    const links = await page.$$eval('.work-status-card', els => els.map(el => ({ status: el.dataset.status, href: el.getAttribute('href'), count: Number(el.querySelector('strong').innerText) })));
    links.forEach(link => assert.match(link.href, new RegExp(`[?&]status=${link.status}(?:&|$)`)));
    for (const link of links) {
      await open(page, link.href.replace('options/', 'options/'));
      const result = await page.evaluate(() => ({
        title: document.getElementById('activeCategoryHeaderTitle').innerText,
        count: document.querySelectorAll('#claimHistoryListContainer .history-card-item').length,
        statuses: [...document.querySelectorAll('#claimHistoryListContainer .history-card-item')].map(card => card.dataset.status)
      }));
      assert.strictEqual(result.count, link.count);
      assert.match(result.title.toLowerCase(), new RegExp(link.status));
      result.statuses.forEach(status => assert.ok(status === link.status || (link.status === 'submitted' && status === 'pending')));
    }
  });

  test('Claim Summary renders records from the same source merged into History', async () => {
    await open(page, 'options/summary.html');
    const summary = await page.evaluate(() => ({
      source: (window.CLAIM_SUMMARY_RECORDS || []).map(record => record.id),
      rendered: SUMMARY_CATEGORIES.flatMap(category => category.records).map(record => record.id)
    }));
    assert.ok(summary.source.length >= 7);
    assert.deepStrictEqual(summary.rendered.sort(), summary.source.sort());
    await open(page, 'options/history.html');
    const historyIds = await page.evaluate(() => Object.values(HISTORY_DATA).flat().map(record => record.id));
    summary.source.forEach(id => assert.ok(historyIds.includes(id), `history is missing ${id}`));
  });

  test('every Team travel badge opens the matching number of detail records', async () => {
    await open(page, 'index.html');
    await page.evaluate(() => window.ClaimsEngine.switchClaimScope('team'));
    const result = await page.evaluate(() => {
      window.ClaimsEngine.selectTeamCalendarDay(7);
      const badge = Number(document.querySelector('#team-calendar-grid [data-day="7"] .staff-count-badge')?.innerText || 0);
      return { badge, cards: document.querySelectorAll('#team-trip-detail-card .team-trip-record').length, text: document.getElementById('team-trip-detail-card').innerText };
    });
    assert.strictEqual(result.badge, 1);
    assert.strictEqual(result.cards, 1);
    assert.doesNotMatch(result.text, /No staff travel scheduled/);
  });

  test('Current Filter bars use a real filter icon instead of a stray text glyph', async () => {
    for (const route of ['options/benefit-highlight.html', 'options/expenses-highlight.html', 'options/staff-entitlement.html', 'options/pending-approval.html']) {
      await open(page, route);
      assert.ok(await page.$('.filter-summary-icon.fa-solid.fa-filter'));
    }
  });
  test('Pending Approval filter follows the shared Filter standard', async () => {
    await open(page, 'options/pending-approval.html');
    await page.click('[aria-label="Open pending approval filter"]');
    const sheet = await page.evaluate(() => {
      const panel = document.querySelector('.approval-filter-panel');
      const reset = panel.querySelector('[data-action="reset"]');
      const input = panel.querySelector('input');
      return {
        title: panel.querySelector('h2').innerText.trim(),
        resetText: reset.innerText.trim(),
        resetIcon: !!reset.querySelector('.fa-solid.fa-rotate-left'),
        inputHeight: getComputedStyle(input).minHeight,
        inputRadius: getComputedStyle(input).borderRadius,
        labels: [...panel.querySelectorAll('label')].map(label => label.innerText.trim())
      };
    });
    assert.strictEqual(sheet.title, 'Filter');
    assert.strictEqual(sheet.resetText, 'Reset');
    assert.ok(sheet.resetIcon);
    assert.strictEqual(sheet.inputHeight, '48px');
    assert.strictEqual(sheet.inputRadius, '16px');
    sheet.labels.forEach(label => assert.doesNotMatch(label, /^[A-Z ]+$/));
  });
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}\n  ${error.message}`);
    }
  }
  await browser.close();
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exitCode = failed ? 1 : 0;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});






