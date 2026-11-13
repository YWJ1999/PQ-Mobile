const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = file => pathToFileURL(path.resolve(__dirname, '..', file)).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 1000 });
      const dashboard = url('modules/employee-career/index.html') + '?scope=team&theme=' + theme;
      await page.goto(dashboard, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#employeeCareerPendingCount', n => n.textContent.trim()), '2');
      assert.equal(await page.$eval('#employeeCareerTeamTaskCount', n => n.textContent.trim()), '2 Tasks');
      const target = await page.$eval('#employeeCareerPendingApproval', n => n.href);
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('h1', n => n.textContent.trim()), 'Pending Approval');
      assert.deepEqual(await page.$$eval('#careerPendingTabs [role="tab"]', nodes => nodes.map(node => node.textContent.trim())), ['CV Change Request', 'Staff Engagement'], 'Pending Approval separates CV and Staff Engagement requests');
      assert.equal(await page.$eval('#careerPendingCount', n => n.textContent), '1');
      assert.equal(await page.$eval('#careerPendingSelectAll', n => n.disabled), false);
      assert.equal(await page.$eval('#careerPendingEmpty', n => n.hidden), true);
      const card = await page.$eval('.approval-request-card', n => ({
        text: n.textContent.replace(/\s+/g, ' ').trim(),
        idBelowName: n.querySelector('.employee-name').nextElementSibling?.classList.contains('employee-id'),
        details: [...n.querySelectorAll('.career-pending-review .approval-card-details > div')].map(field => ({
          label: field.querySelector('dt')?.textContent.trim(),
          value: field.querySelector('dd')?.textContent.trim()
        })),
        hasStatusRow: Boolean(n.querySelector('.career-pending-review .payroll-approval-status-row')),
        hasBackupAssignment: Boolean(n.querySelector('.career-pending-backup-assignment')),
        actions: [...n.querySelectorAll('[data-career-approval-action]')].map(b => b.textContent.trim()),
        actionRows: new Set([...n.querySelectorAll('[data-career-approval-action]')].map(button => button.offsetTop)).size,
        icons: n.querySelectorAll('[data-career-approval-action] i, [data-career-approval-action] svg, [data-career-approval-action] img').length,
        colours: [...n.querySelectorAll('[data-career-approval-action]')].map(b => getComputedStyle(b).backgroundColor)
      }));
      for (const value of ['Farhan binti rahmat', '#EBB12', 'ECR00000000000000563', '13/10/2026']) {
        assert.ok(card.text.includes(value), 'Card includes ' + value);
      }
      assert.equal(card.idBelowName, true);
      assert.deepEqual(card.details, [
        { label: 'Submitted Date', value: '13/10/2026' },
        { label: 'Reference #', value: 'ECR00000000000000563' }
      ], 'The area below the purple header contains only Submitted Date and Reference #');
      assert.equal(card.hasStatusRow, false, 'The card no longer repeats a Pending Approval status row');
      assert.equal(card.hasBackupAssignment, false, 'The card details stay limited to the two requested fields');
      assert.equal((card.text.match(/13\/10\/2026/g) || []).length, 1);
      assert.deepEqual(card.actions, ['Resubmit', 'Reject', 'Approve']);
      assert.equal(card.actionRows, 1, 'The remaining approval actions share one row');
      assert.equal(card.icons, 0);
      assert.ok(card.colours.every(colour => colour === 'rgb(124, 58, 237)'));
      assert.equal(await page.$('.action-btn-backup'), null);
      await page.click('#careerPendingFilterTrigger');
      await page.waitForSelector('#careerPendingFilter', { visible: true });
      assert.deepEqual(await page.$$eval('#careerPendingFilter label', n => n.map(x => x.textContent.trim())), ['Search keyword', 'Start date', 'End date', 'Outstanding days', 'Min days', 'Max days']);
      await page.$eval('#careerPendingFilter-startDate', n => { n.value = '2026-10-15'; });
      await page.$eval('#careerPendingFilter-endDate', n => { n.value = '2026-10-10'; });
      await page.click('#careerPendingFilter [type=submit]');
      assert.equal(await page.$eval('#careerPendingFilter .approval-filter-error', n => n.hidden), false);
      await page.click('#careerPendingFilter [data-action=reset]');
      await page.keyboard.press('Escape');

      await page.click('.career-pending-review');
      await page.waitForSelector('#careerPendingDetails', { visible: true });
      assert.equal(await page.$eval('#careerPendingDetailsTitle', n => n.textContent.trim()), 'CV Change Request Approval');
      assert.deepEqual(
        await page.$$eval('[data-cv-tab]', n => n.map(x => x.textContent.trim())),
        ['Personal', 'Qualification', 'Payroll', 'Contacts', 'Family']
      );
      assert.ok(await page.$eval('#cv-panel-personal .cv-history-detail-employee', n => (
        n.textContent.includes('Farhan binti rahmat') &&
        n.querySelector('.history-employee-name').nextElementSibling?.textContent === '#EBB12'
      )));
      assert.ok(await page.$eval('#cv-panel-personal', n => (
        ['Pending', '13/10/2026', 'ECR00000000000000563', 'Farhan', '22 Apr 1960', '0', 'ebb12@gmail.com', 'Married', '18 Jul 1984', 'A212222048', '25 Mar 2015', 'AX000234496', '12 Aug 2021']
          .every(value => n.textContent.includes(value))
      )));
      assert.equal(await page.$eval('#cv-panel-personal [data-cv-field=Name]', n => n.classList.contains('cv-history-field-changed')), true);
      assert.deepEqual(await page.evaluate(() => ({
        personal: [...document.querySelectorAll('#cv-panel-personal [data-cv-field].cv-history-field-changed')].map(n => n.dataset.cvField),
        qualification: [...document.querySelectorAll('#cv-panel-qualification [data-cv-field].cv-history-field-changed')].map(n => n.dataset.cvField),
        payroll: [...document.querySelectorAll('#cv-panel-payroll [data-cv-field].cv-history-field-changed')].map(n => n.dataset.cvField),
        contacts: [...document.querySelectorAll('#cv-panel-contacts [data-cv-field].cv-history-field-changed')].map(n => n.dataset.cvField),
        family: [...document.querySelectorAll('#cv-panel-family tr.cv-history-field-changed')]
          .map(row => [...row.cells].map(cell => cell.textContent.trim()).join(' '))
      })), {
        personal: ['Name', 'Birth Date', 'Marital Status', 'Passport #'],
        qualification: ['Qualification', 'Major', 'Institute'],
        payroll: ['Account #', 'Spouse Handicap?'],
        contacts: ['Company Email', 'Mobile #', 'Emergency Contact #'],
        family: ['a DAUGHTER']
      }, 'Changed-field highlights are distributed across profile sections with meaningful data');
      assert.deepEqual(await page.$eval('#careerPendingComments', n => ({
        inLastTab: n.closest('.cv-history-detail-panel')?.id === 'cv-panel-family',
        visible: n.getClientRects().length > 0
      })), { inLastTab: true, visible: false }, 'Approver Remarks stay hidden until the last tab');

      await page.click('[data-cv-tab="qualification"]');
      const qualificationState = () => page.$eval('#cv-panel-qualification', panel => {
        const cards = [...panel.querySelectorAll('.cv-history-qualification-card')];
        const toggles = [...panel.querySelectorAll('[data-qualification-card-toggle]')];
        const records = [...panel.querySelectorAll('[data-qualification-card-panel]')];
        const active = records.find(record => !record.hidden);
        return {
          cardCount: cards.length,
          nestedTabs: panel.querySelectorAll('[role="tablist"], [data-qualification-tab]').length,
          summaries: toggles.map(toggle => toggle.textContent.replace(/\s+/g, ' ').trim()),
          counts: toggles.map(toggle => toggle.querySelector('.cv-history-qualification-count')?.textContent.trim() || ''),
          types: toggles.map(toggle => toggle.type),
          expanded: toggles.map(toggle => toggle.getAttribute('aria-expanded')),
          hidden: records.map(record => record.hidden),
          toggleIds: toggles.map(toggle => toggle.id),
          recordIds: records.map(record => record.id),
          reciprocalAria: toggles.map(toggle => {
            const record = document.getElementById(toggle.getAttribute('aria-controls'));
            return Boolean(toggle.id && record && record.getAttribute('role') === 'region' && record.getAttribute('aria-labelledby') === toggle.id);
          }),
          activeText: active?.textContent.replace(/\s+/g, ' ').trim() || '',
          changedFields: records.map(record => [...record.querySelectorAll('[data-cv-field].cv-history-field-changed')].map(field => field.dataset.cvField)),
          focused: toggles.indexOf(document.activeElement)
        };
      });
      const initialQualifications = await qualificationState();
      assert.equal(initialQualifications.nestedTabs, 0, 'Pending Approval uses expandable qualification cards, not nested tabs');
      assert.equal(initialQualifications.cardCount, 2);
      assert.deepEqual(initialQualifications.types, ['button', 'button']);
      assert.deepEqual(initialQualifications.counts, ['0 changes', '3 changes']);
      assert.deepEqual(initialQualifications.expanded, ['false', 'true'], 'The first changed qualification opens initially');
      assert.deepEqual(initialQualifications.hidden, [true, false]);
      assert.equal(new Set(initialQualifications.toggleIds).size, 2);
      assert.equal(new Set(initialQualifications.recordIds).size, 2);
      assert.ok(initialQualifications.toggleIds.every(Boolean));
      assert.ok(initialQualifications.recordIds.every(Boolean));
      assert.deepEqual(initialQualifications.reciprocalAria, [true, true], 'Qualification summaries and regions have reciprocal ARIA references');
      assert.deepEqual(initialQualifications.changedFields, [[], ['Qualification', 'Major', 'Institute']], 'Changed fields remain scoped to the changed qualification');
      assert.ok(initialQualifications.summaries[0].includes("Bachelor's Degree"));
      assert.ok(initialQualifications.summaries[0].includes('Universiti Malaya'));
      assert.ok(initialQualifications.summaries[1].includes('Diploma'));
      assert.ok(initialQualifications.summaries[1].includes('Kolej Universiti Contoh'));
      assert.ok(initialQualifications.activeText.includes('Diploma in Business Studies'));
      assert.equal(initialQualifications.activeText.includes("Bachelor's Degree"), false, 'The collapsed qualification never leaks into the expanded record');

      await page.click('[data-qualification-card-toggle="0"]');
      assert.deepEqual(await qualificationState().then(state => ({ expanded: state.expanded, hidden: state.hidden, focused: state.focused })), {
        expanded: ['true', 'false'], hidden: [false, true], focused: 0
      }, 'Clicking the first summary expands it and collapses the changed record');
      await page.click('[data-qualification-card-toggle="1"]');
      assert.deepEqual(await qualificationState().then(state => ({ expanded: state.expanded, hidden: state.hidden, focused: state.focused })), {
        expanded: ['false', 'true'], hidden: [true, false], focused: 1
      }, 'Clicking the second summary restores the changed record');

      await page.focus('[data-qualification-card-toggle="0"]');
      await page.keyboard.press('Enter');
      assert.deepEqual(await qualificationState().then(state => ({ expanded: state.expanded, hidden: state.hidden, focused: state.focused })), {
        expanded: ['true', 'false'], hidden: [false, true], focused: 0
      }, 'Enter natively activates the first qualification summary');
      await page.focus('[data-qualification-card-toggle="1"]');
      await page.keyboard.press('Space');
      assert.deepEqual(await qualificationState().then(state => ({ expanded: state.expanded, hidden: state.hidden, focused: state.focused })), {
        expanded: ['false', 'true'], hidden: [true, false], focused: 1
      }, 'Space natively activates the second qualification summary');
      assert.equal(await page.$eval('#careerPendingComments', n => n.getClientRects().length > 0), false, 'Approver Remarks remain hidden outside Family');

      const qualificationLayout = await page.$eval('#cv-panel-qualification', panel => {
        const cards = [...panel.querySelectorAll('.cv-history-qualification-card')];
        const toggles = [...panel.querySelectorAll('[data-qualification-card-toggle]')];
        const active = panel.querySelector('[data-qualification-card-panel]:not([hidden])');
        const panelBox = panel.getBoundingClientRect();
        const activeBox = active?.getBoundingClientRect();
        const sheet = panel.closest('.payroll-approval-panel');
        const cardTops = cards.map(card => Math.round(card.getBoundingClientRect().top));
        return {
          oneVisibleRecord: panel.querySelectorAll('[data-qualification-card-panel]:not([hidden])').length === 1,
          cardsStackVertically: cardTops.every((top, index) => index === 0 || top > cardTops[index - 1]),
          touchTargets: toggles.map(toggle => toggle.getBoundingClientRect().height),
          summariesInsidePanel: toggles.every(toggle => {
            const box = toggle.getBoundingClientRect();
            return box.left >= panelBox.left - 1 && box.right <= panelBox.right + 1;
          }),
          recordInsidePanel: Boolean(activeBox && activeBox.left >= panelBox.left - 1 && activeBox.right <= panelBox.right + 1),
          panelNoXOverflow: panel.scrollWidth <= panel.clientWidth + 1,
          sheetNoXOverflow: sheet.scrollWidth <= sheet.clientWidth + 1
        };
      });
      assert.equal(qualificationLayout.oneVisibleRecord, true);
      assert.equal(qualificationLayout.cardsStackVertically, true);
      assert.ok(qualificationLayout.touchTargets.every(height => height >= 44), 'Qualification summaries keep 44px touch targets');
      assert.equal(qualificationLayout.summariesInsidePanel, true);
      assert.equal(qualificationLayout.recordInsidePanel, true);
      assert.equal(qualificationLayout.panelNoXOverflow, true, 'Qualification details fit the narrow viewport');
      assert.equal(qualificationLayout.sheetNoXOverflow, true, 'Qualification cards do not widen the approval sheet');

      const expected = {
        payroll: ['636363636', '733773373', '377337373', '737585858', '747575757', '757686687', '988588585', 'CIMB', '10447856855254', 'Handicap?', 'No', 'Spouse Handicap?', 'Yes', 'Spouse Working?']
      };
      for (const [tab, values] of Object.entries(expected)) {
        await page.click('[data-cv-tab=' + tab + ']');
        const text = await page.$eval('#cv-panel-' + tab, n => n.textContent);
        values.forEach(value => assert.ok(text.includes(value), tab + ' includes ' + value));
      }

      await page.click('[data-cv-tab="contacts"]');
      assert.deepEqual(await page.$$eval('#cv-panel-contacts [data-cv-contact-group]', groups => groups.map(group => ({
        title: group.querySelector('h3').textContent.trim(),
        fields: [...group.querySelectorAll('[data-cv-field]')].map(field => field.dataset.cvField)
      }))), [
        { title: 'Correspondence Contact', fields: ['Company Email', 'Phone #', 'Mobile #', 'Address', 'Postal Code', 'City', 'State', 'Country'] },
        { title: 'Emergency Contact', fields: ['Emergency Contact #', 'Contact Name', 'Contact Address', 'Contact Postal Code', 'Contact City', 'Contact State', 'Contact Country', 'Remarks'] }
      ], 'Pending Approval keeps correspondence and emergency contact details separate');
      const contacts = await page.$eval('#cv-panel-contacts', n => n.textContent);
      for (const value of ['yewweijiang123@gmail.com', 'Phone #', 'Mobile #', '0123456789', '10, JALAN UPTOWN 2', '#05-33 JALAN 2228', 'DAMANSARA KOTA', '40862', 'Damansara', 'SELANGOR', 'MALAYSIA', '04-6677778', 'RAZALI', 'AS CORRESPONDENCE ADDRESS', '01920', 'Puchong', 'State', '—', 'FATHER']) {
        assert.ok(contacts.includes(value), 'Contacts includes ' + value);
      }
      await page.click('[data-cv-tab="family"]');
      assert.deepEqual(await page.$$eval('#cv-panel-family .cv-history-family-section', sections => sections.map(section => ({
        title: section.querySelector('h3').textContent.trim(),
        rows: [...section.querySelectorAll('tbody tr')].map(row => [...row.cells].map(cell => cell.textContent.trim()))
      }))), [
        { title: 'Deleted Family Member', rows: [['No deleted family members']] },
        { title: 'Existing Family Member', rows: [['ABU KARUDDIN BIN MAHMUD', 'HUSBAND'], ['a', 'DAUGHTER']] }
      ]);
      await page.screenshot({ path: path.resolve(__dirname, `employee-career-pending-family-${theme}-${width}.png`) });
      assert.equal(await page.$eval('#careerPendingComments', n => n.getAttribute('aria-label')), 'Approver Remarks');
      assert.equal(await page.$eval('#careerPendingComments', n => n.getClientRects().length > 0), true, 'Approver Remarks appear in the final Family tab');
      assert.deepEqual(await page.$$eval('#careerPendingDetailsActions [data-career-approval-action]', n => n.map(x => x.textContent.trim())), ['Approve', 'Resubmit', 'Reject']);
      assert.equal(await page.$$eval('#careerPendingDetailsActions button i, #careerPendingDetailsActions button svg, #careerPendingDetailsActions button img', n => n.length), 0);
      await page.click('[data-cv-tab="personal"]');
      const modernDetailLayout = await page.$eval('#careerPendingDetails', modal => {
        const overlayBox = modal.getBoundingClientRect();
        const panel = modal.querySelector('.payroll-approval-panel');
        const panelBox = panel.getBoundingClientRect();
        const navigation = modal.querySelector('.cv-history-navigation');
        const tabs = [...modal.querySelectorAll('[data-cv-tab]')];
        const tabBoxes = tabs.map(tab => tab.getBoundingClientRect());
        const personalRows = [...modal.querySelectorAll('#cv-panel-personal > .cv-history-fields > .cv-history-detail-row')]
          .slice(0, 3)
          .map(row => row.getBoundingClientRect());
        const footer = modal.querySelector('#careerPendingDetailsActions');
        return {
          panelInsideViewport: panelBox.top >= 0 && panelBox.bottom <= innerHeight && panel.scrollWidth <= panel.clientWidth + 1,
          panelAnchoredToBottom: Math.abs(panelBox.bottom - overlayBox.bottom) <= 1,
          navigationHeight: navigation.getBoundingClientRect().height,
          tabsShareOneRow: new Set(tabBoxes.map(box => Math.round(box.top))).size === 1,
          tabsFlowHorizontally: tabs.every(tab => getComputedStyle(tab).flexDirection === 'row'),
          tabsAreCompact: tabBoxes.every(box => box.height <= 44),
          tabRailScrollsHorizontally: navigation.querySelector('.cv-history-detail-tabs').scrollWidth > navigation.querySelector('.cv-history-detail-tabs').clientWidth,
          personalRowsAreGrouped: personalRows.length === 3 && personalRows.every((box, index) => index === 0 || box.top > personalRows[index - 1].top),
          actionHeights: [...footer.querySelectorAll('button')].map(button => button.getBoundingClientRect().height),
          closeUsesSimpleGlyph: modal.querySelector('.payroll-approval-details-header .payroll-approval-close i')?.classList.contains('fa-xmark') === true
        };
      });
      assert.equal(modernDetailLayout.panelInsideViewport, true);
      assert.equal(modernDetailLayout.panelAnchoredToBottom, true, 'Approval details use a bottom-anchored mobile sheet');
      assert.ok(modernDetailLayout.navigationHeight <= 78, 'Compact navigation leaves more room for request data');
      assert.equal(modernDetailLayout.tabsShareOneRow, true, 'Profile sections stay on a single horizontal rail');
      assert.equal(modernDetailLayout.tabsFlowHorizontally, true);
      assert.equal(modernDetailLayout.tabsAreCompact, true);
      assert.equal(modernDetailLayout.tabRailScrollsHorizontally, true);
      assert.equal(modernDetailLayout.personalRowsAreGrouped, true, 'Profile values use one grouped key-value list');
      assert.ok(modernDetailLayout.actionHeights.every(height => height >= 44), 'Approval actions keep touch-friendly targets');
      assert.equal(modernDetailLayout.closeUsesSimpleGlyph, true);
      await page.screenshot({ path: path.resolve(__dirname, 'employee-career-pending-detail-' + theme + '-' + width + '.png') });
      await page.click('#careerPendingDetails [data-close-career-sheet]');
      assert.equal(await page.$eval('#careerPendingDetails', n => n.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('career-pending-review')), true);
      await page.click('.three-dots-btn');
      await page.click('#careerPendingViewWorkflow');
      await page.waitForSelector('#careerPendingWorkflow', { visible: true });
      assert.ok(await page.$eval('#careerPendingWorkflowSteps', n => n.textContent.includes('No approval steps available.')));
      assert.ok(await page.$eval('#careerPendingWorkflowAudit', n => n.textContent.includes('No audit history available.')));
      await page.keyboard.press('Escape');
      await page.screenshot({ path: path.resolve(__dirname, 'employee-career-pending-' + theme + '-' + width + '.png') });
      assert.ok(await page.$eval('.phone-container', n => n.scrollWidth <= n.clientWidth + 1));
      await page.click('.career-pending-review');
      await page.click('[data-cv-tab="family"]');
      await page.type('#careerPendingComments', 'Discard this draft remark');
      await page.click('#careerPendingDetails [data-close-career-sheet]');
      assert.equal(await page.$eval('#careerPendingDetails', n => n.hidden), true, 'Close dismisses the review');
      assert.equal(await page.$eval('#careerPendingCount', n => n.textContent), '1', 'Close keeps the request pending');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('career-pending-review')), true);
      await page.click('.career-pending-review');
      assert.equal(await page.$eval('#careerPendingComments', n => n.value), '', 'Close does not save an unsubmitted remark');
      await page.click('#careerPendingDetails [data-close-career-sheet]');
      await page.click('.approval-request-card [data-career-approval-action="resubmit"]');
      assert.equal(await page.$eval('#careerPendingCount', n => n.textContent), '0');
      assert.equal(await page.$eval('#careerPendingEmpty', n => n.hidden), false);
      await page.click('#careerPendingBack');
      await page.waitForSelector('#employeeCareerTabTeam');
      assert.equal(new URL(page.url()).searchParams.get('scope'), 'team');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);

      assert.deepEqual(errors, []);
      console.log('PASS ' + theme + ' ' + width);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
