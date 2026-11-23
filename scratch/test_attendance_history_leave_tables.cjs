const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

// Leave History cards use a quiet key/value list, while detail dialogs retain
// the shared table. Attendance list cards must follow that same separation.
function snapshot(table) {
  const properties = ['padding', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderLeftWidth', 'borderRadius', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'verticalAlign', 'color', 'backgroundColor'];
  const styles = node => Object.fromEntries(properties.map(property => [property, getComputedStyle(node)[property]]));
  const row = [...table.rows].find(row => row.cells.length === 2);
  const tableStyles = getComputedStyle(table);
  return {
    table: Object.fromEntries(['borderCollapse', 'tableLayout', 'borderRadius', 'fontFamily', 'fontSize', 'lineHeight', 'backgroundColor'].map(property => [property, tableStyles[property]])),
    label: styles(row.cells[0]),
    value: styles(row.cells[1]),
    ratio: row.cells[0].getBoundingClientRect().width / table.getBoundingClientRect().width,
    fits: table.scrollWidth <= table.clientWidth + 1
  };
}

function cardSnapshot(card, selectors) {
  const style = (node, properties) => Object.fromEntries(properties.map(property => [property, getComputedStyle(node)[property]]));
  const details = card.querySelector(selectors.details);
  const row = details.querySelector(selectors.row);
  const badge = card.querySelector('.card-status-badge');
  const label = row.querySelector(selectors.label);
  const value = row.querySelector(selectors.value);
  return {
    card: style(card, ['padding', 'borderRadius', 'borderLeftWidth']),
    details: style(details, ['padding', 'borderRadius', 'marginTop', 'display', 'gap']),
    row: style(row, ['display', 'paddingTop', 'paddingBottom', 'borderBottomWidth']),
    label: style(label, ['fontSize', 'fontWeight', 'lineHeight', 'color']),
    value: style(value, ['fontSize', 'fontWeight', 'lineHeight', 'color']),
    badge: style(badge, ['paddingLeft', 'paddingRight', 'borderRadius', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'borderColor']),
    hasChevron: Boolean(card.querySelector('.fa-chevron-right:not([style*="display: none"])')) && getComputedStyle(card.querySelector('.fa-chevron-right')).display !== 'none'
  };
}

function modalSnapshot(root) {
  const style = (node, properties) => Object.fromEntries(properties.map(property => [property, getComputedStyle(node)[property]]));
  const panel = root.querySelector('.detail-popout-panel');
  const header = panel.querySelector('.detail-popout-header');
  const title = header.querySelector('.detail-popout-title');
  const close = header.querySelector('.detail-popout-close');
  const body = panel.querySelector('.detail-popout-body');
  const table = body.querySelector('.detail-popout-table');
  return {
    overlay: style(root, ['padding', 'backgroundColor', 'backdropFilter', 'alignItems', 'justifyContent', 'borderRadius']),
    panel: style(panel, ['maxWidth', 'maxHeight', 'borderRadius', 'borderWidth', 'backgroundColor', 'boxShadow', 'overflow']),
    header: style(header, ['height', 'padding', 'backgroundImage', 'borderRadius', 'boxShadow']),
    title: style(title, ['fontSize', 'fontWeight', 'lineHeight', 'textTransform', 'letterSpacing', 'color']),
    close: style(close, ['width', 'height', 'padding', 'borderRadius', 'backgroundColor', 'borderWidth', 'color']),
    body: style(body, ['padding', 'backgroundColor', 'overflowX', 'overflowY', 'scrollbarColor']),
    table: style(table, ['borderCollapse', 'tableLayout'])
  };
}

function actionSnapshot(button) {
  const style = getComputedStyle(button);
  return Object.fromEntries([
    'height',
    'padding',
    'borderRadius',
    'fontSize',
    'fontWeight',
    'color',
    'backgroundColor',
    'backgroundImage',
    'borderColor',
    'borderWidth'
  ].map(property => [property, style[property]]));
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(pathToFileURL(path.resolve(__dirname, '../leave.html')).href + '?theme=' + theme, { waitUntil: 'networkidle0' });
      await page.evaluate(() => { showLeaveSection('viewMyLeaveHistory'); switchHistoryTab('leave'); });
      const leaveCardReferences = {};
      for (const status of ['approved', 'submitted']) {
        leaveCardReferences[status] = await page.$eval(
          `#myHistoryCardsList .history-item-card[data-status="${status}"]`,
          cardSnapshot,
          { details: '.card-details-box', row: '.card-details-box > div', label: 'span', value: 'strong' }
        );
      }
      await page.evaluate(() => openHistoryDetailsModal('LV-2026-0052'));
      await page.waitForSelector('#historyDetailsModalOverlay .detail-popout-table', { visible: true });
      const reference = await page.$eval('#historyDetailsModalOverlay .detail-popout-table', snapshot);
      const modalReference = await page.$eval('#historyDetailsModalOverlay', modalSnapshot);
      await page.evaluate(() => openHistoryDetailsModal('LV-2026-0055'));
      const leavePrimaryAction = await page.$eval('#historyDetailsActions button:first-of-type', actionSnapshot);
      const leaveCancelAction = await page.$eval('#historyDetailsActions button:last-of-type', actionSnapshot);
      await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/history.html')).href + '?theme=' + theme, { waitUntil: 'networkidle0' });
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        for (const [tab, view, modal, close] of [
          ['clocking', 'viewClockingHistory', 'clockDetailsModal', 'closeClockDetailsDirect'],
          ['ot', 'viewOtHistory', 'otDetailsModal', 'closeOtDetailsDirect'],
          ['feedback', 'viewFeedbackHistory', 'feedbackDetailsModal', 'closeFeedbackDetailsDirect']
        ]) {
          await page.evaluate(tab => switchMainTab(tab), tab);
          const cards = await page.$$eval('#' + view + ' .history-card-item', nodes => nodes.map(card => ({
            hasTable: Boolean(card.querySelector('.history-card-details table')),
            hasFacts: Boolean(card.querySelector('.attendance-history-facts')),
            labels: [...card.querySelectorAll('.attendance-history-fact-label')].map(node => node.textContent.trim()),
            values: [...card.querySelectorAll('.attendance-history-fact-value')].map(node => node.textContent.trim()),
            fits: card.scrollWidth <= card.clientWidth + 1
              && [...card.querySelectorAll('.attendance-history-fact')].every(row => row.scrollWidth <= row.clientWidth + 1)
          })));
          const renderedCard = await page.$eval(
            '#' + view + ' .history-card-item',
            cardSnapshot,
            { details: '.history-card-details', row: '.attendance-history-fact', label: '.attendance-history-fact-label', value: '.attendance-history-fact-value' }
          );
          const leaveCardReference = leaveCardReferences[tab === 'clocking' ? 'approved' : 'submitted'];
          for (const key of ['card', 'details', 'row', 'label', 'value', 'badge']) {
            assert.deepEqual(renderedCard[key], leaveCardReference[key], `${theme} ${width}px ${tab}: ${key} matches Leave History`);
          }
          assert.equal(renderedCard.hasChevron, leaveCardReference.hasChevron, `${theme} ${width}px ${tab}: chevron treatment matches Leave History`);
          const expectedLabels = tab === 'clocking'
            ? ['Time', 'Cost Center']
            : tab === 'ot'
              ? ['Date', 'Plan Hours', 'Actual Hours']
              : ['Date'];
          assert.equal(cards.length, tab === 'clocking' ? 6 : tab === 'ot' ? 3 : 2);
          cards.forEach(card => {
            assert.equal(card.hasTable, false, `${theme} ${width}px ${tab}: list cards must not look like tables`);
            assert.equal(card.hasFacts, true, `${theme} ${width}px ${tab}: list cards use Leave-style facts`);
            assert.deepEqual(card.labels, expectedLabels);
            assert.ok(card.values.every(Boolean) && card.fits, `${theme} ${width}px ${tab}: facts remain readable and fit`);
          });
          await page.$$eval('#' + view + ' .history-card-item', nodes => nodes[0].click());
          await page.waitForSelector('#' + modal, { visible: true });
          const modalShell = await page.$eval('#' + modal, modalSnapshot);
          for (const key of ['overlay', 'panel', 'header', 'title', 'close', 'body', 'table']) {
            assert.deepEqual(modalShell[key], modalReference[key], `${theme} ${width}px ${tab}: complete detail ${key} matches Leave`);
          }
          const detail = await page.$eval('#' + modal + ' .detail-popout-table', snapshot);
          for (const key of ['table', 'label', 'value']) assert.deepEqual(detail[key], reference[key], `${theme} ${width}px ${tab} detail ${key} matches Leave`);
          assert.ok(Math.abs(detail.ratio - .42) < .01 && detail.fits);
          if (tab !== 'clocking') {
            const footer = await page.$eval('#' + modal + ' .attendance-history-modal-footer', node => {
              const style = getComputedStyle(node);
              return {
                borderTopWidth: style.borderTopWidth,
                backgroundColor: style.backgroundColor,
                justifyContent: style.justifyContent,
                gap: style.gap
              };
            });
            assert.deepEqual(footer, {
              borderTopWidth: '0px',
              backgroundColor: modalReference.body.backgroundColor,
              justifyContent: 'center',
              gap: '8px'
            }, `${theme} ${width}px ${tab}: action area continues the Leave detail surface`);
            const footerGeometry = await page.$eval('#' + modal, root => {
              const panel = root.querySelector('.detail-popout-panel');
              const body = panel.querySelector('.detail-popout-body');
              const actionFooter = panel.querySelector('.attendance-history-modal-footer');
              const panelRect = panel.getBoundingClientRect();
              const bodyRect = body.getBoundingClientRect();
              const beforeTop = actionFooter.getBoundingClientRect().top;
              const beforeScroll = body.scrollTop;
              body.scrollTop = body.scrollHeight;
              const footerRect = actionFooter.getBoundingClientRect();
              const result = {
                directPanelChild: actionFooter.parentElement === panel && actionFooter.previousElementSibling === body,
                bodyActuallyScrolled: body.scrollTop > beforeScroll,
                footerStayedFixed: Math.abs(footerRect.top - beforeTop) < .5,
                footerInsidePanel: footerRect.top >= panelRect.top - .5 && footerRect.bottom <= panelRect.bottom + .5,
                bodyEndsAtFooter: bodyRect.bottom <= footerRect.top + .5
              };
              body.scrollTop = beforeScroll;
              return result;
            });
            assert.deepEqual(footerGeometry, { directPanelChild: true, bodyActuallyScrolled: true, footerStayedFixed: true, footerInsidePanel: true, bodyEndsAtFooter: true }, `${theme} ${width}px ${tab}: action footer remains visible while details scroll`);
            const primary = await page.$eval('#' + modal + ' .attendance-history-modal-footer .primary', actionSnapshot);
            assert.deepEqual(primary, leavePrimaryAction, `${theme} ${width}px ${tab}: Submit matches Leave Apply action`);
            if (tab === 'feedback') {
              const cancel = await page.$eval('#' + modal + ' .attendance-history-modal-footer button:first-child', actionSnapshot);
              assert.deepEqual(cancel, leaveCancelAction, `${theme} ${width}px feedback: Cancel matches Leave action`);
              const saveDraft = await page.$eval('#feedbackDetailsModal .attendance-history-modal-footer button:nth-child(2)', actionSnapshot);
              const saveDraftVisible = await page.$eval('#feedbackDetailsModal .attendance-history-modal-footer button:nth-child(2)', node => !node.hidden && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0);
              assert.equal(saveDraftVisible, true, `${theme} ${width}px feedback: Save Draft remains visible for editable records`);
              const expectedSaveDraft = {
                height: '33px',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                color: theme === 'dark' ? 'rgb(196, 181, 253)' : 'rgb(124, 58, 237)',
                backgroundColor: theme === 'dark' ? 'rgba(124, 58, 237, 0.16)' : 'rgba(124, 58, 237, 0.08)',
                backgroundImage: 'none',
                borderColor: theme === 'dark' ? 'rgba(196, 181, 253, 0.32)' : 'rgba(124, 58, 237, 0.35)',
                borderWidth: '1px'
              };
              assert.deepEqual(saveDraft, expectedSaveDraft, `${theme} ${width}px feedback: Save Draft uses the intended secondary action styling`);
              assert.notDeepEqual(saveDraft, primary, `${theme} ${width}px feedback: Save Draft differs from Submit`);
              assert.notDeepEqual(saveDraft, cancel, `${theme} ${width}px feedback: Save Draft differs from Cancel`);
            }
          }
          await page.waitForFunction(id => document.getElementById(id).style.opacity === '1', {}, modal);
          await page.evaluate(async id => { await Promise.all(document.getElementById(id).getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))); }, modal);
          if (width === 390) await page.screenshot({ path: path.join(__dirname, `attendance_history_${tab}_leave_table_${theme}.png`) });
          await page.evaluate(close => window[close](), close);
          await page.waitForSelector('#' + modal, { hidden: true });
          if (width === 390) await page.screenshot({ path: path.join(__dirname, `attendance_history_${tab}_leave_list_${theme}.png`) });
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: All Attendance History cards and all three complete detail pop-outs match Leave History in both themes at three phone widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
