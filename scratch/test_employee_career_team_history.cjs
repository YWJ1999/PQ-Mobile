const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const historyPage = 'modules/employee-career/options/team/history.html';
const categories = [
  ['staff-confirmation', 'Staff Confirmation'],
  ['staff-exit', 'Staff Exit'],
  ['staff-request', 'Staff Request'],
  ['staff-engagement', 'Staff Engagement']
];

function fileUrl(relative, query = '') {
  return pathToFileURL(path.join(root, relative)).href + query;
}

async function open(page, relative, query = '') {
  await page.goto(fileUrl(relative, query), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState !== 'loading');
}

async function assertEmployeeCards(page, category) {
  const cards = await page.$$eval('#teamHistoryList .history-card-item', nodes => nodes.map(node => ({
    employee: node.querySelector('.team-history-employee-identity .history-employee-name')?.textContent.trim(),
    position: node.querySelector('.team-history-employee-identity + .team-history-employee-position')?.textContent.trim(),
    id: node.querySelector('.team-history-employee-id')?.textContent,
    hasDetails: Boolean(node.querySelector('.history-card-details')),
    status: node.querySelector('.status-pill')?.textContent.trim() || ''
  })));
  assert.equal(cards.length, 2, `${category} has two provisional records`);
  cards.forEach(card => {
    assert.ok(card.employee);
    assert.match(card.id, /^#[A-Z0-9-]+$/, `${category} shows the employee number below the name`);
    assert.ok(card.position && card.position !== '—', `${category} shows the employee's position below their name`);
    assert.equal(card.hasDetails, true, `${category} uses the bordered history detail block`);
    assert.notEqual(card.status, '', `${category} displays a status`);
  });
}

async function assertConfirmationCards(page) {
  const cards = await page.$$eval('#teamHistoryList .history-card-item', nodes => nodes.map(node => ({
    employee: node.querySelector('.team-history-employee-identity .history-employee-name')?.textContent.trim(),
    position: node.querySelector('.team-history-employee-identity + .team-history-employee-position')?.textContent.trim(),
    status: node.querySelector('.status-pill')?.textContent.trim() || '',
    tone: node.dataset.status || '',
    submitted: node.querySelector('.record-submit-date')?.textContent,
    labels: [...node.querySelectorAll('.history-card-row > span')].map(label => label.textContent.trim()),
    values: [...node.querySelectorAll('.history-card-row > strong')].map(value => value.textContent.trim())
  })));

  assert.deepEqual(cards, [
    {
      employee: 'Aina Rahman', position: 'People Operations Executive',
      status: 'To Resubmit', tone: 'resubmit',
      labels: ['Recommendation', 'Adjustment'],
      submitted: 'Submit Date: 04/10/2026',
      values: ['Confirm Employment', 'RM 300.00']
    },
    {
      employee: 'Daniel Wong', position: 'Product Designer',
      status: 'To Resubmit', tone: 'resubmit',
      labels: ['Recommendation', 'Adjustment'],
      submitted: 'Submit Date: 12/10/2026',
      values: ['Further Review', 'No Adjustment']
    }
  ], 'Staff Confirmation cards use the approved fields, employee ID placement and To Resubmit status');
}

async function setDateRange(page, startDate, endDate) {
  await page.evaluate(({ startDate: start, endDate: end }) => {
    const startInput = document.getElementById('teamConfirmationStartDate');
    const endInput = document.getElementById('teamConfirmationEndDate');
    startInput.value = start;
    endInput.value = end;
    startInput.dispatchEvent(new Event('input', { bubbles: true }));
    endInput.dispatchEvent(new Event('input', { bubbles: true }));
  }, { startDate, endDate });
}

async function confirmationDetailSnapshot(page) {
  return page.$$eval('#teamConfirmationDetailsRows tr', rows => rows.map(row => ({
    label: row.querySelector('.detail-popout-label')?.textContent.trim() || '',
    value: row.querySelector('.detail-popout-value')?.textContent.trim() || ''
  })));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  const pageErrors = [];

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    page.on('pageerror', error => pageErrors.push(error.message));

    await open(page, 'modules/employee-career/index.html', '?scope=team&theme=light');
    await page.click('[data-action=view-all]');
    const historyEntry = await page.$eval('#employeeCareerAllOptionsGrid [data-option-id=team-history]', node => ({
      tagName: node.tagName,
      disabled: node.disabled || false,
      href: node.getAttribute('href')
    }));
    assert.equal(historyEntry.tagName, 'A', 'Team History is an active navigation option');
    assert.equal(historyEntry.disabled, false);
    assert.match(historyEntry.href, /options\/team\/history\.html\?theme=light$/);

    await page.waitForFunction(() => document.activeElement.matches('#employeeCareerAllOptions .employee-career-sheet-close'), { polling: 50 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('#employeeCareerAllOptionsGrid [data-option-id=team-history]')
    ]);
    assert.ok(page.url().includes('/options/team/history.html'));
    const viewportContent = await page.$eval('meta[name=viewport]', node => node.content);
    assert.doesNotMatch(viewportContent, /user-scalable\s*=\s*no/i, 'Team History keeps browser zoom available');
    assert.doesNotMatch(viewportContent, /maximum-scale/i, 'Team History does not cap browser zoom');
    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'History');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    assert.deepEqual(
      await page.$$eval('[data-team-history-kind]', nodes => nodes.map(node => [node.dataset.teamHistoryKind, node.textContent.trim()])),
      categories
    );
    assert.equal(await page.$eval('[data-team-history-kind=staff-confirmation]', node => node.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '2');
    assert.equal(await page.$eval('#teamHistoryCategoryTitle', node => node.textContent.trim()), 'Staff Confirmation History');
    assert.equal(await page.$eval('#teamConfirmationFilterBar', node => node.hidden), false, 'Staff Confirmation displays its Submitted date filter');
    assert.equal(await page.$eval('#teamConfirmationFilterSummary', node => node.textContent.trim()), 'All Submission Dates');
    assert.deepEqual(
      await page.$$eval('#teamConfirmationFilterForm label', nodes => nodes.map(node => node.textContent.trim())),
      ['Start Date', 'End Date'],
      'Staff Confirmation filter contains the requested date controls'
    );
    assert.deepEqual(await page.$eval('#teamConfirmationFilterOverlay', node => ({
      hidden: node.hidden,
      ariaHidden: node.getAttribute('aria-hidden')
    })), { hidden: true, ariaHidden: 'true' }, 'Date filter starts closed');
    await assertConfirmationCards(page);
    assert.deepEqual(
      await page.$$eval('#teamHistoryList .history-card-item', cards => cards.map(card => ({
        tag: card.tagName,
        type: card.getAttribute('type'),
        recordId: card.dataset.confirmationId || '',
        hasPopup: card.getAttribute('aria-haspopup'),
        controls: card.getAttribute('aria-controls'),
        cursor: getComputedStyle(card).cursor
      }))),
      [
        { tag: 'BUTTON', type: 'button', recordId: 'SC-2026-0015', hasPopup: 'dialog', controls: 'teamConfirmationDetailsOverlay', cursor: 'pointer' },
        { tag: 'BUTTON', type: 'button', recordId: 'SC-2026-0016', hasPopup: 'dialog', controls: 'teamConfirmationDetailsOverlay', cursor: 'pointer' }
      ],
      'Staff Confirmation cards are native detail-dialog triggers'
    );

    await page.focus('#teamConfirmationFilterTrigger');
    await page.$eval('[data-confirmation-id="SC-2026-0015"]', card => card.click());
    assert.deepEqual(await page.$eval('#teamConfirmationDetailsOverlay', node => ({
      hidden: node.hidden,
      ariaHidden: node.getAttribute('aria-hidden')
    })), { hidden: false, ariaHidden: 'false' }, 'Clicking a confirmation card opens its detail popout');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationCloseDetails', 'Detail close button receives focus');
    assert.equal(await page.$$eval('.team-history-detail-overlay .detail-popout-header', headers =>
      headers.every(header => header.childElementCount === 2 && header.firstElementChild.matches('h2') && header.lastElementChild.matches('button'))
    ), true, 'Each Team History detail header contains its title and close button');
    assert.equal(await page.$eval('#teamConfirmationDetailsOverlay', overlay => [...overlay.parentElement.children]
      .filter(node => node !== overlay)
      .every(node => node.inert)), true, 'Detail popout makes background content inert');
    assert.deepEqual(await confirmationDetailSnapshot(page), [
      { label: 'Reference #', value: 'SC-2026-0015' },
      { label: 'Status', value: 'To Resubmit' },
      { label: 'Emp #', value: '#EBB01' },
      { label: 'Name', value: 'Aina Rahman' },
      { label: 'Position', value: 'People Operations Executive' },
      { label: 'Hire Date', value: '15 Jan 2026' },
      { label: 'Employment Type', value: 'Permanent' },
      { label: 'Confirm Due', value: '15 Jul 2026' },
      { label: 'Recommendation', value: 'Confirm Employment' },
      { label: 'Effective Date', value: '1 Oct 2026' },
      { label: 'Extension Months', value: '0' },
      { label: 'Adjustment', value: 'RM 300.00' },
      { label: 'Score', value: '92 / 100' },
      { label: 'Remark', value: 'Please update the salary adjustment approval and resubmit.' },
      { label: 'Attachment', value: 'Aina_Rahman_Confirmation.pdf' }
    ], 'Detail popout displays every requested Staff Confirmation field in order');
    assert.deepEqual(await page.$eval('#teamConfirmationDetailsRows tr:last-child .detail-popout-value', node => ({
      items: node.querySelectorAll('.team-history-detail-attachment').length,
      icons: node.querySelectorAll('.fa-paperclip').length,
      links: node.querySelectorAll('a').length
    })), { items: 1, icons: 1, links: 0 }, 'Provisional attachment is presented as a paperclip file item without a broken link');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationCloseDetails', 'Detail popout traps focus when close is its only control');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#teamConfirmationDetailsOverlay', node => node.hidden), true, 'Escape closes Staff Confirmation details');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.confirmationId), 'SC-2026-0015', 'Closing details restores focus to the card');

    await page.evaluate(() => {
      const record = window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-confirmation']
        .find(item => item.id === 'SC-2026-0015');
      record.attachments[0].url = 'https://files.example.test/Aina_Rahman_Confirmation.pdf';
    });
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#teamConfirmationDetailsOverlay', node => node.hidden), false, 'Enter activates the confirmation card');
    assert.deepEqual(await page.$eval('#teamConfirmationDetailsRows tr:last-child .team-history-detail-attachment', node => ({
      tag: node.tagName,
      href: node.getAttribute('href'),
      target: node.getAttribute('target'),
      rel: node.getAttribute('rel'),
      download: node.getAttribute('download'),
      ariaLabel: node.getAttribute('aria-label')
    })), {
      tag: 'A',
      href: 'https://files.example.test/Aina_Rahman_Confirmation.pdf',
      target: '_blank',
      rel: 'noopener noreferrer',
      download: 'Aina_Rahman_Confirmation.pdf',
      ariaLabel: 'Download attachment Aina_Rahman_Confirmation.pdf'
    }, 'A valid attachment URL becomes a safe labelled file link');
    await page.click('#teamConfirmationCloseDetails');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.confirmationId), 'SC-2026-0015', 'Close button restores focus to the card');
    await page.evaluate(() => {
      const record = window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-confirmation']
        .find(item => item.id === 'SC-2026-0015');
      record.attachments[0].url = 'javascript:alert(1)';
    });
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.$eval('#teamConfirmationDetailsRows tr:last-child .team-history-detail-attachment', node => ({
      tag: node.tagName,
      href: node.getAttribute('href')
    })), { tag: 'SPAN', href: null }, 'A rejected attachment protocol remains non-clickable plain text');
    await page.click('#teamConfirmationCloseDetails');
    await page.evaluate(() => {
      const record = window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-confirmation']
        .find(item => item.id === 'SC-2026-0015');
      record.attachments[0].url = '';
    });

    await page.click('[data-confirmation-id="SC-2026-0015"]');
    const detailsBackdropPoint = await page.$eval('#teamConfirmationDetailsOverlay', node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + (rect.width / 2), y: rect.top + 8 };
    });
    await page.mouse.click(detailsBackdropPoint.x, detailsBackdropPoint.y);
    assert.equal(await page.$eval('#teamConfirmationDetailsOverlay', node => node.hidden), true, 'Clicking the backdrop closes Staff Confirmation details');

    await page.click('#teamConfirmationFilterTrigger');
    assert.deepEqual(await page.$eval('#teamConfirmationFilterOverlay', node => ({
      hidden: node.hidden,
      open: node.classList.contains('is-open'),
      ariaHidden: node.getAttribute('aria-hidden')
    })), { hidden: false, open: true, ariaHidden: 'false' }, 'Date filter opens as the standard bottom sheet');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationStartDate', 'Start Date receives focus');
    assert.equal(await page.$eval('#teamConfirmationFilterOverlay', overlay => [...overlay.parentElement.children]
      .filter(node => node !== overlay)
      .every(node => node.inert)), true, 'Background content is inert while the filter is open');
    await page.focus('#teamConfirmationResetFilter');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationApplyFilter', 'Shift+Tab wraps from the first control to the last control');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationResetFilter', 'Tab wraps from the last control to the first control');
    await setDateRange(page, '2026-10-12', '2026-10-12');
    await page.click('#teamConfirmationApplyFilter');
    assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '1', 'Submitted date filter updates Total Records');
    assert.equal(await page.$eval('#teamConfirmationFilterSummary', node => node.textContent.trim()), '12 Oct 2026 - 12 Oct 2026');
    assert.deepEqual(
      await page.$$eval('#teamHistoryList .team-history-employee-identity .history-employee-name', nodes => nodes.map(node => node.textContent.trim())),
      ['Daniel Wong'],
      'Submitted date filter includes records that sit exactly on both boundaries'
    );
    await page.click('[data-confirmation-id="SC-2026-0016"]');
    const danielDetails = await confirmationDetailSnapshot(page);
    assert.deepEqual(danielDetails.filter((_, index) => [0, 1, 2, 3, 14].includes(index)), [
      { label: 'Reference #', value: 'SC-2026-0016' },
      { label: 'Status', value: 'To Resubmit' },
      { label: 'Emp #', value: '#EBB02' },
      { label: 'Name', value: 'Daniel Wong' },
      { label: 'Attachment', value: 'No attachments' }
    ], 'Filtered cards open the matching record without stale detail values');
    await page.click('#teamConfirmationCloseDetails');

    await page.click('#teamConfirmationFilterTrigger');
    await setDateRange(page, '2026-10-31', '2026-10-01');
    await page.click('#teamConfirmationApplyFilter');
    assert.equal(await page.$eval('#teamConfirmationFilterOverlay', node => node.hidden), false, 'Invalid date range keeps the filter open');
    assert.equal(await page.$eval('#teamConfirmationFilterError', node => node.hidden), false, 'Invalid date range displays an error');
    assert.equal(await page.$eval('#teamConfirmationFilterError', node => node.textContent.trim()), 'End Date must be on or after Start Date.');
    assert.equal(await page.$eval('#teamConfirmationEndDate', node => node.getAttribute('aria-invalid')), 'true');
    assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '1', 'Invalid range leaves applied results unchanged');
    await page.click('#teamConfirmationResetFilter');
    assert.equal(await page.$eval('#teamConfirmationFilterOverlay', node => node.hidden), true, 'Reset applies the cleared filter and closes the sheet');
    assert.equal(await page.$eval('#teamConfirmationFilterSummary', node => node.textContent.trim()), 'All Submission Dates');
    assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '2');

    await page.click('#teamConfirmationFilterTrigger');
    await setDateRange(page, '2027-01-01', '2027-01-31');
    await page.click('#teamConfirmationApplyFilter');
    assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '0');
    assert.equal(await page.$eval('#teamHistoryEmpty', node => node.hidden), false, 'A date range without records displays the empty state');
    assert.equal(await page.$eval('#teamHistoryEmptyCopy', node => node.textContent.trim()), 'No records match the selected submission dates.');
    await page.click('#teamConfirmationFilterTrigger');
    await page.click('#teamConfirmationResetFilter');

    await page.click('#teamConfirmationFilterTrigger');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#teamConfirmationFilterOverlay', node => node.hidden), true, 'Escape closes the filter sheet');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationFilterTrigger', 'Closing restores focus to the trigger');
    await page.click('#teamConfirmationFilterTrigger');
    const backdropPoint = await page.$eval('#teamConfirmationFilterOverlay', node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + (rect.width / 2), y: rect.top + 24 };
    });
    await page.mouse.click(backdropPoint.x, backdropPoint.y);
    assert.equal(await page.$eval('#teamConfirmationFilterOverlay', node => node.hidden), true, 'Clicking the backdrop closes the filter sheet');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'teamConfirmationFilterTrigger', 'Backdrop close restores focus to the trigger');

    for (const [key, label] of categories.slice(1)) {
      await page.click(`[data-team-history-kind=${key}]`);
      assert.equal(new URL(page.url()).searchParams.get('category'), key, `${label} is reflected in the URL`);
      assert.equal(await page.$eval(`[data-team-history-kind=${key}]`, node => node.getAttribute('aria-pressed')), 'true');
      assert.equal(await page.$eval('#teamHistoryRecordCount', node => node.textContent.trim()), '2');
      assert.equal(await page.$eval('#teamHistoryCategoryTitle', node => node.textContent.trim()), `${label} History`);
      assert.equal(await page.$eval('#teamConfirmationFilterBar', node => node.hidden), true, `${label} does not display the Staff Confirmation filter`);
      assert.equal(await page.$$eval('#teamHistoryList [data-confirmation-id]', nodes => nodes.length), 0, `${label} cards remain non-confirmation records`);

      await assertEmployeeCards(page, label);
      if (key === 'staff-engagement') {
        assert.equal(await page.$$eval('#teamHistoryList [data-engagement-id]', nodes => nodes.length), 2, 'Staff Engagement cards open their own details');
        assert.equal(await page.$eval('#teamEngagementFilterBar', node => node.hidden), false);
      }
    }

    const back = await page.$eval('[data-option-back]', node => node.getAttribute('href'));
    const backUrl = new URL(back, page.url());
    assert.equal(backUrl.searchParams.get('scope'), 'team');
    assert.equal(backUrl.searchParams.get('theme'), 'light');

    await open(page, historyPage, '?category=unknown&theme=dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    assert.equal(await page.$eval('[data-team-history-kind=staff-confirmation]', node => node.getAttribute('aria-pressed')), 'true', 'Unknown category falls back safely');
    assert.equal(new URL(page.url()).searchParams.get('category'), 'staff-confirmation');

    for (const width of [360, 420]) {
      for (const theme of ['light', 'dark']) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await open(page, historyPage, `?category=staff-engagement&theme=${theme}`);
        await page.waitForFunction(() => {
          const container = document.querySelector('.team-history-tabs');
          const active = container?.querySelector('.active');
          if (!container || !active || container.scrollLeft <= 0) return false;
          const containerRect = container.getBoundingClientRect();
          const activeRect = active.getBoundingClientRect();
          return activeRect.left >= containerRect.left - 1 && activeRect.right <= containerRect.right + 1;
        }, { timeout: 5000 });
        const layout = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cardOverflow: Array.from(document.querySelectorAll('.history-card-item')).some(card => card.scrollWidth > card.clientWidth + 1),
          tabs: (() => {
            const container = document.querySelector('.team-history-tabs');
            const active = container.querySelector('.active');
            const containerRect = container.getBoundingClientRect();
            const activeRect = active.getBoundingClientRect();
            return {
              hasOverflow: container.scrollWidth > container.clientWidth,
              overflowX: getComputedStyle(container).overflowX,
              scrolled: container.scrollLeft > 0,
              activeVisible: activeRect.left >= containerRect.left - 1 && activeRect.right <= containerRect.right + 1,
              scrollLeft: container.scrollLeft,
              scrollWidth: container.scrollWidth,
              clientWidth: container.clientWidth,
              containerLeft: containerRect.left,
              containerRight: containerRect.right,
              activeLeft: activeRect.left,
              activeRight: activeRect.right
            };
          })()
        }));
        assert.equal(layout.theme, theme);
        assert.ok(layout.overflow <= 1, `${theme} Team History has no page overflow at ${width}px`);
        assert.equal(layout.cardOverflow, false, `${theme} Team History cards fit at ${width}px`);
        assert.equal(layout.tabs.hasOverflow, true, `${theme} Team History tabs overflow inside their own bar at ${width}px`);
        assert.equal(layout.tabs.overflowX, 'auto', `${theme} Team History tab bar is horizontally scrollable at ${width}px`);
        assert.equal(layout.tabs.scrolled, true, `${theme} selected final tab is scrolled into view at ${width}px: ${JSON.stringify(layout.tabs)}`);
        assert.equal(layout.tabs.activeVisible, true, `${theme} selected final tab is visible at ${width}px: ${JSON.stringify(layout.tabs)}`);

        await page.setViewport({ width, height: 568, deviceScaleFactor: 1 });
        await open(page, historyPage, `?category=staff-confirmation&theme=${theme}`);
        await page.click('[data-confirmation-id="SC-2026-0015"]');
        const detailLayout = await page.evaluate(async () => {
          const overlay = document.querySelector('#teamConfirmationDetailsOverlay');
          const panel = overlay.querySelector('.detail-popout-panel');
          const body = overlay.querySelector('.detail-popout-body');
          const finalRow = body.querySelector('tr:last-child');
          const overlayRect = overlay.getBoundingClientRect();
          const panelRect = panel.getBoundingClientRect();
          const wasScrollable = body.scrollHeight > body.clientHeight;
          body.scrollTop = body.scrollHeight;
          await new Promise(resolve => requestAnimationFrame(resolve));
          const bodyRect = body.getBoundingClientRect();
          const finalRect = finalRow.getBoundingClientRect();
          return {
            theme: document.documentElement.dataset.theme,
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            panelContained: panelRect.left >= overlayRect.left - 1
              && panelRect.right <= overlayRect.right + 1
              && panelRect.top >= overlayRect.top - 1
              && panelRect.bottom <= overlayRect.bottom + 1,
            bodyOverflowX: body.scrollWidth - body.clientWidth,
            overflowY: getComputedStyle(body).overflowY,
            wasScrollable,
            scrolled: body.scrollTop > 0,
            finalLabel: finalRow.querySelector('.detail-popout-label')?.textContent.trim(),
            finalRowVisible: finalRect.top >= bodyRect.top - 1 && finalRect.bottom <= bodyRect.bottom + 1
          };
        });
        assert.equal(detailLayout.theme, theme);
        assert.ok(detailLayout.pageOverflow <= 1, `${theme} confirmation detail has no page overflow at ${width}px`);
        assert.equal(detailLayout.panelContained, true, `${theme} confirmation detail stays inside the phone at ${width}px`);
        assert.ok(detailLayout.bodyOverflowX <= 1, `${theme} confirmation detail has no horizontal body overflow at ${width}px`);
        assert.equal(detailLayout.overflowY, 'auto', `${theme} confirmation detail uses contained vertical scrolling at ${width}px`);
        assert.equal(detailLayout.wasScrollable, true, `${theme} confirmation detail scrolls on a 568px-high phone at ${width}px`);
        assert.equal(detailLayout.scrolled, true, `${theme} confirmation detail can scroll to its final row at ${width}px`);
        assert.equal(detailLayout.finalLabel, 'Attachment', `${theme} confirmation detail ends with Attachment at ${width}px`);
        assert.equal(detailLayout.finalRowVisible, true, `${theme} Attachment is reachable after scrolling at ${width}px`);
        await page.keyboard.press('Escape');
      }
    }

    if (process.argv.includes('--screenshots')) {
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      await open(page, historyPage, '?category=staff-confirmation&theme=light');
      await page.screenshot({ path: 'C:/tmp/team-history-confirmation-light.png', fullPage: true });
      await page.click('[data-confirmation-id="SC-2026-0015"]');
      await page.screenshot({ path: 'C:/tmp/team-history-confirmation-details-light.png', fullPage: true });
      await page.keyboard.press('Escape');
      await page.click('#teamConfirmationFilterTrigger');
      await page.screenshot({ path: 'C:/tmp/team-history-confirmation-filter-light.png', fullPage: true });
      await page.keyboard.press('Escape');
      await open(page, historyPage, '?category=staff-request&theme=dark');
      await page.screenshot({ path: 'C:/tmp/team-history-request-dark.png', fullPage: true });
    }

    assert.deepEqual(pageErrors, [], `Team History has no JavaScript errors: ${pageErrors.join('; ')}`);
    console.log('PASS: Team History entry, tabs, cards, employee IDs, themes and mobile layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
