const assert = require('assert').strict;
const path = require('path');
const puppeteer = require('puppeteer');

const pageUrl = `file:///${path.resolve(__dirname, '../modules/payroll/options/tax-relief.html').replace(/\\/g, '/')}`;

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.tax-relief-record-card');

    const initial = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.tax-relief-record-card')];
      return {
        title: document.querySelector('.tax-relief-header h1')?.textContent.trim(),
        references: cards.map(card => card.dataset.reference),
        statuses: cards.map(card => card.dataset.status),
        text: cards.map(card => card.innerText.replace(/\s+/g, ' ').trim()),
        fieldLabels: cards.map(card => [...card.querySelectorAll('.tax-relief-stat-label')].map(label => label.textContent.trim())),
        ids: cards.map(card => card.querySelector('.tax-relief-employee-id')?.textContent.trim()),
        idsBelowNames: cards.every(card => card.querySelector('.tax-relief-employee-name')?.nextElementSibling === card.querySelector('.tax-relief-employee-id')),
        hasViewDetailsCopy: cards.some(card => /view details/i.test(card.textContent)),
        hasLegacyFooter: cards.some(card => card.querySelector('.tax-relief-card-foot')),
        headerChevrons: cards.map(card => card.querySelectorAll('.tax-relief-card-head > .tax-relief-card-chevron').length),
        cardGeometry: (() => {
          const card = cards[0];
          const head = card.querySelector('.tax-relief-card-head');
          const stat = card.querySelector('.tax-relief-stat');
          return {
            radius: getComputedStyle(card).borderRadius,
            headPadding: getComputedStyle(head).padding,
            statRadius: stat ? getComputedStyle(stat).borderRadius : null
          };
        })(),
        filterTriggerStyle: (() => {
          const trigger = document.getElementById('taxReliefFilterTrigger');
          const icon = trigger.querySelector(':scope > i');
          const kicker = trigger.querySelector('small');
          const summary = trigger.querySelector('strong');
          return {
            height: trigger.getBoundingClientRect().height,
            padding: getComputedStyle(trigger).padding,
            radius: getComputedStyle(trigger).borderRadius,
            shadow: getComputedStyle(trigger).boxShadow,
            iconWidth: getComputedStyle(icon).width,
            iconHeight: getComputedStyle(icon).height,
            iconRadius: getComputedStyle(icon).borderRadius,
            iconFontSize: getComputedStyle(icon).fontSize,
            kickerFontSize: getComputedStyle(kicker).fontSize,
            summaryFontSize: getComputedStyle(summary).fontSize
          };
        })(),
        hasLegacyOverview: !!document.querySelector('.tax-relief-overview, .status-tab-group, .filter-pills-scroll, .action-btn-approve, .action-btn-reject'),
        horizontalOverflow: document.querySelector('.tax-relief-phone').scrollWidth > document.querySelector('.tax-relief-phone').clientWidth + 1
      };
    });

    assert.equal(initial.title, 'Team Tax Relief');
    assert.deepEqual(initial.references, ['RBT000000000039', 'RBT000000000049', 'RBT000000000050']);
    assert.deepEqual(initial.statuses, ['submitted', 'submitted', 'submitted']);
    assert.deepEqual(initial.ids, ['#EBB12', '#EBB12', '#EBB12']);
    assert.equal(initial.idsBelowNames, true);
    assert.equal(initial.hasViewDetailsCopy, false);
    assert.equal(initial.hasLegacyFooter, false);
    assert.deepEqual(initial.headerChevrons, [1, 1, 1]);
    assert.deepEqual(initial.cardGeometry, {
      radius: '20px',
      headPadding: '15px 16px',
      statRadius: '12px'
    });
    assert.deepEqual(initial.filterTriggerStyle, {
      height: 70,
      padding: '13px 14px',
      radius: '18px',
      shadow: 'none',
      iconWidth: '42px',
      iconHeight: '42px',
      iconRadius: '14px',
      iconFontSize: '15px',
      kickerFontSize: '10px',
      summaryFontSize: '12.5px'
    });
    assert.equal(initial.hasLegacyOverview, false, 'Legacy approval dashboard controls must be removed');
    assert.equal(initial.horizontalOverflow, false);
    for (const label of ['Position', 'Date', 'Rebate Item', 'Amount', 'Period / Cycle']) {
      assert.ok(initial.text[0].includes(label), `Card must include ${label}`);
    }
    assert.ok(initial.fieldLabels[0].includes('Date'));
    assert.ok(!initial.fieldLabels[0].includes('Transaction Date'));
    assert.ok(initial.text[0].includes('GROUP HR MANAGER') && initial.text[0].includes('14 Aug 2025') && initial.text[0].includes('TXR02 – BASIC SUPPORTING EQUIPMENT') && initial.text[0].includes('RM 100.00'));
    assert.ok(initial.text[1].includes('19 Mar 2026') && initial.text[1].includes('RM 12.00'));
    assert.ok(initial.text[2].includes('TXR05 – COMPLETE MEDICAL EXAMINATION') && initial.text[2].includes('RM 14.00'));

    await page.click('#taxReliefFilterTrigger');
    await wait(180);
    const filter = await page.evaluate(() => ({
      open: document.getElementById('taxReliefFilterModal').classList.contains('is-open'),
      labels: [...document.querySelectorAll('#taxReliefFilterModal label')].map(label => label.textContent.trim()),
      values: {
        start: document.getElementById('taxReliefStartDate').value,
        end: document.getElementById('taxReliefEndDate').value
      },
      helperCopy: document.querySelector('#taxReliefFilterModal .history-filter-help, #taxReliefFilterModal .tax-relief-filter-help')?.textContent.trim() || '',
      actions: [...document.querySelectorAll('#taxReliefFilterModal button')].map(button => button.textContent.trim()).filter(Boolean)
    }));
    assert.equal(filter.open, true);
    assert.deepEqual(filter.labels, ['Search Keyword', 'Start Date', 'End Date', 'Rebate Item', 'Status', 'Description']);
    assert.deepEqual(filter.values, { start: '2026-01-01', end: '2026-10-03' });
    assert.equal(filter.helperCopy, '');
    assert.ok(filter.actions.includes('Reset') && filter.actions.includes('Search'));
    await page.click('#taxReliefFilterModal [data-filter-close]');

    await page.click('[data-reference="RBT000000000039"]');
    await wait(180);
    const detail = await page.evaluate(() => {
      const modal = document.getElementById('taxReliefDetailModal');
      const rows = [...modal.querySelectorAll('[data-detail-key]')];
      return {
        open: modal.classList.contains('is-open'),
        title: modal.querySelector('h2').textContent.trim(),
        keys: rows.map(row => row.dataset.detailKey),
        values: Object.fromEntries(rows.map(row => [row.dataset.detailKey, row.querySelector('strong').textContent.replace(/\s+/g, ' ').trim()])),
        actions: [...modal.querySelectorAll('.tax-relief-detail-actions button')].map(button => button.textContent.trim())
      };
    });
    assert.equal(detail.open, true);
    assert.equal(detail.title, 'Tax Relief Detail');
    assert.deepEqual(detail.keys, ['Reference #', 'Emp #', 'Name', 'Status', 'Submit Date', 'Rebate Item', 'Transaction Date', 'Description', 'Receipt #', 'Amount', 'Process', 'Period', 'Cycle', 'Approval Date', 'Approver Remarks', 'Attachments']);
    assert.equal(detail.values['Reference #'], 'RBT000000000039');
    assert.equal(detail.values['Emp #'], '#EBB12');
    assert.equal(detail.values.Name, 'Farhan binti rahmat');
    assert.equal(detail.values.Status, 'Pending');
    assert.equal(detail.values['Submit Date'], '7 Jan 2026');
    assert.equal(detail.values['Rebate Item'], 'BASIC SUPPORTING EQUIPMENT');
    assert.equal(detail.values['Transaction Date'], '14 Aug 2025');
    assert.equal(detail.values.Description, 'Medical Relief');
    assert.equal(detail.values.Amount, 'RM 100.00');
    assert.ok(detail.values.Attachments.includes('Invoice.docx'));
    assert.equal(detail.values.Process, 'No');
    assert.equal(detail.values['Approval Date'], '1 Jan 1');
    assert.equal(detail.values['Approver Remarks'], 'Reason required');
    assert.deepEqual(detail.actions, [], 'Team Tax Relief details are informational and must not show approval actions');
    await page.click('#taxReliefDetailModal [data-detail-close]');

    await page.click('#taxReliefFilterTrigger');
    await page.type('#taxReliefSearch', 'RBT000000000049');
    await page.click('#taxReliefFilterModal .standard-filter-apply');
    await wait(100);
    assert.deepEqual(await page.$$eval('.tax-relief-record-card', cards => cards.map(card => card.dataset.reference)), ['RBT000000000049']);

    await page.click('#taxReliefFilterTrigger');
    await page.click('#taxReliefFilterModal [data-filter-reset]');
    await page.select('#taxReliefItem', 'TXR05');
    await page.click('#taxReliefFilterModal .standard-filter-apply');
    await wait(100);
    assert.deepEqual(await page.$$eval('.tax-relief-record-card', cards => cards.map(card => card.dataset.reference)), ['RBT000000000050']);

    await page.click('#taxReliefFilterTrigger');
    await page.click('#taxReliefFilterModal [data-filter-reset]');
    await page.type('#taxReliefDescription', 'medical relief');
    await page.click('#taxReliefFilterModal .standard-filter-apply');
    await wait(100);
    assert.deepEqual(await page.$$eval('.tax-relief-record-card', cards => cards.map(card => card.dataset.reference)), ['RBT000000000039']);

    await page.click('#taxReliefFilterTrigger');
    await page.click('#taxReliefFilterModal [data-filter-reset]');
    await page.click('#taxReliefFilterModal .standard-filter-apply');
    assert.equal(await page.$$eval('.tax-relief-record-card', cards => cards.length), 3);

    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => window.setTheme(value), theme);
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 844 });
        const overflow = await page.evaluate(() => [...document.querySelectorAll('.tax-relief-phone, .tax-relief-content, .tax-relief-filter-panel, .tax-relief-detail-modal')]
          .filter(node => node.getClientRects().length && node.scrollWidth > node.clientWidth + 1)
          .map(node => node.className));
        assert.deepEqual(overflow, [], `${theme} ${width}px must not overflow horizontally`);
      }
      await page.setViewport({ width: 390, height: 844 });
      await page.evaluate(async () => {
        getComputedStyle(document.body).backgroundColor;
        await Promise.all(document.body.getAnimations().map(animation => animation.finished.catch(() => {})));
      });
      await page.screenshot({ path: path.join(__dirname, `team_tax_relief_redesign_${theme}.png`) });
    }

    assert.deepEqual(errors, []);
    console.log('PASS: Team Tax Relief screenshot data, filter, cards, details and responsive themes.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
