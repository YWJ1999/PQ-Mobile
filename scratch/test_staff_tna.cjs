const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'modules/training-competency/options/staff-tna.html');
const pageUrl = theme => `${pathToFileURL(pagePath).href}?theme=${theme}`;
const hubPath = path.join(root, 'modules/training-competency/index.html');
const hubUrl = theme => `${pathToFileURL(hubPath).href}?scope=team&theme=${theme}`;

async function open(page, theme = 'dark') {
  await page.goto(pageUrl(theme), { waitUntil: 'domcontentloaded' });
}

async function visibleCardIds(page) {
  return page.$$eval('#staffTnaList .staff-tna-card', cards => cards.map(card => card.dataset.tnaId));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  const pageErrors = [];

  try {
    const page = await browser.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

    await page.goto(hubUrl('dark'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('[data-option-id="staff-tna"]', node => node.tagName), 'A');
    assert.equal(await page.$eval('[data-option-id="staff-tna"]', node => node.getAttribute('href')), 'options/staff-tna.html?theme=dark');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('[data-option-id="staff-tna"]')
    ]);

    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Staff TNA');
    assert.equal(await page.$eval('#staffTnaBack', node => node.getAttribute('href')), '../index.html?scope=team&theme=dark');
    assert.equal(await page.$eval('#staffTnaFilterSummary', node => node.textContent.trim()), 'All Staff TNA');
    assert.equal(await page.$eval('#staffTnaTotalRecords', node => node.textContent.trim()), '3');
    assert.deepEqual(await visibleCardIds(page), ['tna-2026-001', 'tna-2026-002', 'tna-2026-003']);

    assert.deepEqual(await page.$$eval('.staff-tna-card', cards => cards.map(card => ({
      historyCard: card.classList.contains('history-item-card'),
      oldHistoryCard: card.classList.contains('history-card-item'),
      detailsBox: card.querySelector('.staff-tna-card-details').classList.contains('card-details-box'),
      name: card.querySelector('.staff-tna-employee-name').textContent.trim(),
      labels: [...card.querySelectorAll('.staff-tna-card-detail span')].map(node => node.textContent.trim()),
      status: card.querySelector('[data-tna-status]').textContent.trim(),
      statusTheme: card.dataset.status,
      statusIcon: Boolean(card.querySelector('[data-tna-status] .fa-hourglass-half')),
      hasArrow: Boolean(card.querySelector('.fa-chevron-right')),
      actionCount: card.querySelectorAll('button').length,
      detailLink: card.matches('a[data-history-link][href]'),
      tabIndex: card.tabIndex
    }))), [
      { historyCard: true, oldHistoryCard: false, detailsBox: true, name: 'EBB12 - Farhan Binti Rahmat', labels: ['Position', 'Period'], status: 'Next Approval', statusTheme: 'submitted', statusIcon: true, hasArrow: false, actionCount: 0, detailLink: true, tabIndex: 0 },
      { historyCard: true, oldHistoryCard: false, detailsBox: true, name: 'EBB06 - Mei Ling', labels: ['Position', 'Period'], status: 'Next Approval', statusTheme: 'submitted', statusIcon: true, hasArrow: false, actionCount: 0, detailLink: true, tabIndex: 0 },
      { historyCard: true, oldHistoryCard: false, detailsBox: true, name: 'EBB02 - Daniel Wong', labels: ['Position', 'Period'], status: 'Next Approval', statusTheme: 'submitted', statusIcon: true, hasArrow: false, actionCount: 0, detailLink: true, tabIndex: 0 }
    ]);
    assert.deepEqual(await page.$$eval('[data-tna-id="tna-2026-001"] .staff-tna-card-detail', rows => rows.map(row => ({
      display: getComputedStyle(row).display,
      label: row.querySelector('span').textContent.trim(),
      value: row.querySelector('strong').textContent.trim(),
      valueAlign: getComputedStyle(row.querySelector('strong')).textAlign
    }))), [
      { display: 'flex', label: 'Position', value: 'Group HR Manager', valueAlign: 'left' },
      { display: 'flex', label: 'Period', value: '01 Jan 2026 – 31 Dec 2026', valueAlign: 'left' }
    ], 'Staff TNA keeps the remaining labels and values aligned in the details grid');
    assert.deepEqual(await page.$eval('[data-tna-id="tna-2026-001"]', card => {
      const labelledBy = card.getAttribute('aria-labelledby');
      const describedBy = card.getAttribute('aria-describedby');
      return {
        ariaLabel: card.getAttribute('aria-label'),
        labelledBy,
        describedBy,
        labelledText: document.getElementById(labelledBy)?.textContent.trim() || '',
        describedText: describedBy ? describedBy.split(/\s+/).map(id => document.getElementById(id)?.textContent.trim()).join(' ') : ''
      };
    }), {
      ariaLabel: null,
      labelledBy: 'tna-2026-001-employee-name',
      describedBy: 'tna-2026-001-status tna-2026-001-position tna-2026-001-period',
      labelledText: 'EBB12 - Farhan Binti Rahmat',
      describedText: 'Next Approval Group HR Manager 01 Jan 2026 – 31 Dec 2026'
    }, 'The card accessible name and description expose the same employee metadata shown visually');

    await page.click('#staffTnaFilterTrigger');
    assert.equal(await page.$eval('preview-top-bar', node => node.inert), true);
    assert.deepEqual(await page.$$eval('#staffTnaFilterForm [data-filter-field]', nodes => nodes.map(node => node.dataset.filterField)), [
      'keyword', 'training-period', 'company', 'branch', 'department', 'job'
    ]);
    assert.deepEqual(await page.$$eval('#staffTnaFilterForm label', nodes => nodes.map(node => node.textContent.trim())), [
      'Search Keyword', 'Training Period', 'Company', 'Branch', 'Department', 'Job'
    ]);
    assert.equal(await page.$$('#staffTnaTrainingPeriod input[type="date"]').then(nodes => nodes.length), 2);
    assert.deepEqual(await page.$eval('#staffTnaDepartment', select => [...select.options].map(option => option.textContent.trim())), [
      'All Departments', 'Engineering', 'Finance', 'Human Resource'
    ]);

    await page.$eval('#staffTnaPeriodStart', input => { input.value = '2026-09-01'; });
    await page.$eval('#staffTnaPeriodEnd', input => { input.value = '2026-08-01'; });
    await page.click('#staffTnaApplyFilter');
    assert.equal(await page.$eval('#staffTnaFilterOverlay', node => node.hidden), false);
    assert.match(await page.$eval('#staffTnaFilterError', node => node.textContent), /End date.*start date/i);

    await page.$eval('#staffTnaPeriodStart', input => { input.value = ''; });
    await page.$eval('#staffTnaPeriodEnd', input => { input.value = ''; });
    await page.type('#staffTnaKeyword', 'Mei');
    await page.click('#staffTnaApplyFilter');
    assert.deepEqual(await visibleCardIds(page), ['tna-2026-002']);
    assert.equal(await page.$eval('#staffTnaTotalRecords', node => node.textContent.trim()), '1');
    assert.equal(await page.$eval('#staffTnaFilterSummary', node => node.textContent.trim()), 'Mei');
    assert.equal(new URL(page.url()).searchParams.get('keyword'), 'Mei');

    await page.click('#staffTnaFilterTrigger');
    await page.click('#staffTnaResetFilter');
    assert.deepEqual(await visibleCardIds(page), ['tna-2026-001', 'tna-2026-002', 'tna-2026-003']);
    assert.equal(await page.$eval('#staffTnaFilterOverlay', node => node.hidden), true);
    assert.equal(new URL(page.url()).searchParams.has('keyword'), false);

    await page.click('#staffTnaFilterTrigger');
    await page.select('#staffTnaDepartment', 'Finance');
    await page.$eval('#staffTnaPeriodStart', input => { input.value = '2026-05-01'; });
    await page.$eval('#staffTnaPeriodEnd', input => { input.value = '2026-08-31'; });
    await page.click('#staffTnaApplyFilter');
    assert.deepEqual(await visibleCardIds(page), ['tna-2026-002']);
    assert.match(await page.$eval('#staffTnaFilterSummary', node => node.textContent.trim()), /Finance/);
    assert.match(await page.$eval('#staffTnaFilterSummary', node => node.textContent.trim()), /May 2026.*Aug 2026/);

    await page.click('#staffTnaFilterTrigger');
    await page.click('#staffTnaResetFilter');
    await page.click('#staffTnaFilterTrigger');
    await page.type('#staffTnaKeyword', '#EBB12');
    await page.click('#staffTnaApplyFilter');
    assert.deepEqual(await visibleCardIds(page), ['tna-2026-001'], 'Search accepts older employee numbers with a leading hash');
    await page.click('#staffTnaFilterTrigger');
    await page.click('#staffTnaResetFilter');
    const firstCard = await page.$('[data-tna-id="tna-2026-001"]');
    await firstCard.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#staffTnaDetailOverlay', node => node.hidden), false);
    assert.equal(await page.$eval('main', node => node.getClientRects().length), 0);
    assert.equal(await page.$eval('#staffTnaDetailTitle', node => node.textContent.trim()), 'Staff TNA Details');
    assert.equal(await page.$$('.staff-tna-detail-section-title').then(nodes => nodes.length), 0, 'Detail content must not add inner purple section headers');
    assert.deepEqual(await page.$$eval('.staff-tna-detail-section', sections => sections.map(section => ({
      label: section.getAttribute('aria-label'),
      labelledBy: section.getAttribute('aria-labelledby'),
      childIds: [...section.children].map(child => child.id)
    }))), [
      { label: 'Application Details', labelledBy: null, childIds: ['staffTnaApplicationDetails'] },
      { label: null, labelledBy: 'staffTnaDetailsHeading', childIds: ['staffTnaDetailsHeading', 'staffTnaDetailItems'] }
    ]);
    assert.deepEqual(await page.$eval('#staffTnaDetailsHeading', node => ({
      text: node.textContent.trim(),
      backgroundImage: getComputedStyle(node).backgroundImage,
      backgroundColor: getComputedStyle(node).backgroundColor,
      fontSize: getComputedStyle(node).fontSize
    })), { text: 'Details', backgroundImage: 'none', backgroundColor: 'rgba(0, 0, 0, 0)', fontSize: '12px' }, 'Details uses the plain History detail section label pattern');
    assert.deepEqual(await page.$eval('#staffTnaApplicationDetails', node => {
      const sectionStyle = getComputedStyle(node.closest('.staff-tna-detail-section'));
      return {
        sectionBorderWidth: sectionStyle.borderTopWidth,
        sectionBorderRadius: sectionStyle.borderTopLeftRadius,
        listBorderRadius: getComputedStyle(node).borderTopLeftRadius
      };
    }), { sectionBorderWidth: '0px', sectionBorderRadius: '0px', listBorderRadius: '0px' }, 'Application details starts as a direct square table without a card wrapper');
    assert.equal(await page.$eval('#staffTnaSubmitDate dd', node => node.textContent), '12/01/2026');
    assert.deepEqual(await page.$$eval('#staffTnaApplicationDetails dt', nodes => nodes.map(node => node.textContent.trim())), [
      'Submit Date', 'Reference #', 'Employee', 'Position', 'Submit By', 'Name', 'Training Period', 'Career Target', 'Weakness', 'Remarks', 'Approver Remarks'
    ]);
    assert.deepEqual(await page.$$eval('#staffTnaApplicationDetails dd', nodes => nodes.map(node => node.textContent.trim())), [
      '12/01/2026', 'TNA-2026-001', 'Farhan Binti RahmatEBB12', 'Group HR Manager', 'Aina Binti Salleh', 'Leadership Development Plan', '01 Jan 2026 – 31 Dec 2026', 'Build strategic leadership capability for regional HR operations.', 'Advanced change communication and workforce analytics.', 'Prioritise practical leadership and transformation programmes.', 'Pending review by the next approver.'
    ]);
    assert.equal(await page.$eval('#staffTnaApplicationDetails', list => {
      const section = list.closest('.staff-tna-detail-section').getBoundingClientRect();
      const finalRow = list.lastElementChild.getBoundingClientRect();
      return finalRow.bottom <= section.bottom + 1;
    }), true, 'Application Details must not clip Career Target, Weakness, Remarks, or Approver Remarks');
    assert.equal(await page.$eval('#staffTnaDetailEmployeeId', node => node.textContent.trim()), 'EBB12');
    assert.equal(await page.$$('.staff-tna-detail-item-title').then(nodes => nodes.length), 0, 'Detail tables must not display Training Need labels');
    assert.deepEqual(await page.$$eval('#staffTnaDetailItems article', items => items.map(item => item.firstElementChild.tagName)), ['DL', 'DL']);
    assert.deepEqual(await page.$$eval('#staffTnaDetailItems article', items => items.map(item => ({
      labels: [...item.querySelectorAll('dt')].map(node => node.textContent.trim()),
      values: [...item.querySelectorAll('dd')].map(node => node.textContent.trim()),
      leftAccent: getComputedStyle(item).borderLeftWidth,
      radius: getComputedStyle(item).borderTopLeftRadius
    }))), [
      { labels: ['Target Date', 'Course', 'Development Area', 'Justification'], values: ['30 Jun 2026', 'Leading Through Change', 'Leadership', 'Strengthen change leadership for upcoming organisation initiatives.'], leftAccent: '1px', radius: '10px' },
      { labels: ['Target Date', 'Course', 'Development Area', 'Justification'], values: ['30 Sept 2026', 'People Analytics Essentials', 'Functional', 'Improve data-led workforce planning and reporting decisions.'], leftAccent: '1px', radius: '10px' }
    ]);
    await page.click('#staffTnaDetailClose');
    await page.waitForSelector('#staffTnaDetailOverlay', { hidden: true });
    assert.equal(await page.$eval('[data-tna-id="tna-2026-001"]', node => document.activeElement === node), true);
    await page.click('[data-tna-id="tna-2026-001"]');
    assert.equal(await page.$eval('#staffTnaDetailTitle', node => node === document.activeElement), true);
    await page.goBack();
    await page.waitForSelector('#staffTnaDetailOverlay', { hidden: true });
    assert.equal(await page.$eval('[data-tna-id="tna-2026-001"]', node => document.activeElement === node), true);

    await page.click('#staffTnaFilterTrigger');
    await page.type('#staffTnaKeyword', 'No matching employee');
    await page.click('#staffTnaApplyFilter');
    assert.equal(await page.$eval('#staffTnaTotalRecords', node => node.textContent.trim()), '0');
    assert.equal(await page.$eval('#staffTnaEmpty', node => node.hidden), false);

    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await open(page, theme);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), `${theme} Staff TNA has no horizontal overflow at ${width}px`);
        assert.equal(await page.$eval('#staffTnaBack', node => node.getAttribute('href')), `../index.html?scope=team&theme=${theme}`);
        await page.click('#staffTnaFilterTrigger');
        assert.ok(await page.$eval('#staffTnaFilterForm', node => node.scrollWidth - node.clientWidth <= 1), `${theme} Staff TNA filter fits at ${width}px`);
        await page.click('#staffTnaCloseFilter');
        await page.click('[data-tna-id="tna-2026-001"]');
        assert.ok(await page.$eval('#staffTnaDetailPanel', node => node.scrollWidth - node.clientWidth <= 1), `${theme} Staff TNA details fit at ${width}px`);
        await page.click('#staffTnaDetailClose');
      }
    }

    await page.goto(pageUrl('dark') + '&periodStart=2026-99-99&periodEnd=not-a-date', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#staffTnaTotalRecords', node => node.textContent.trim()), '3');
    assert.equal(await page.$eval('#staffTnaFilterSummary', node => node.textContent.trim()), 'All Staff TNA');
    assert.equal(new URL(page.url()).searchParams.has('periodStart'), false);
    assert.equal(new URL(page.url()).searchParams.has('periodEnd'), false);

    assert.deepEqual(pageErrors, [], `Staff TNA pages should have no JavaScript errors: ${pageErrors.join('; ')}`);
    console.log('PASS: Staff TNA routing, filters, history cards, details and responsive layout.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
