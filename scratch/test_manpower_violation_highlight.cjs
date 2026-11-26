const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (const file of ['daily-manpower', 'work-hour-violation']) {
          await page.goto(pathToFileURL(path.resolve(__dirname, `../modules/attendance/options/${file}.html`)).href + `?theme=${theme}`, { waitUntil: 'domcontentloaded' });
          if (file === 'work-hour-violation') {
            assert.equal(await page.$('.view-chart-btn'), null);
            assert.equal(await page.$('.attendance-report-summary'), null);
            assert.equal(await page.$$eval('#viewContinuous [data-violation-detail]', cards => cards.length), 4);
            await page.click('#boxRest');
            await page.click('.filter-trigger-btn');
            await page.waitForSelector('#filterModal', { visible: true });
            await page.$eval('#filterDateInput', el => { el.value = '2026-07-10'; });
            await page.click('#filterApplyButton');
            await page.waitForSelector('#filterModal', { hidden: true });
            assert.equal(await page.$$eval('#viewRest [data-violation-detail]', cards => cards.length), 3);
            await page.click('#viewRest [data-violation-detail]');
            await page.waitForSelector('#detailModal', { visible: true });
            assert.equal(await page.$$eval('#detailTableBody tr', rows => rows.length), 2);
            await page.keyboard.press('Escape');
            await page.waitForSelector('#detailModal', { hidden: true });
            await page.click('.filter-trigger-btn');
            await page.waitForSelector('#filterModal', { visible: true });
            await page.select('#filterDeptSelect', 'ACCOUNTS');
            await page.click('#filterApplyButton');
            await page.waitForSelector('#filterModal', { hidden: true });
            assert.equal(await page.$$eval('#viewRest [data-violation-detail]', cards => cards.length), 1);
            assert.equal(await page.$eval('.main-content', el => el.scrollWidth > el.clientWidth), false);
            assert.deepEqual(errors, []);
            await page.screenshot({ path: path.resolve(__dirname, `${file}-${theme}-${width}.png`) });
            console.log(`PASS ${file} ${theme} ${width}: no totals or charts, filtered cards, details and responsive layout`);
            continue;
          }
          await page.waitForSelector('.manpower-group-card');
          await page.click('.filter-trigger-btn');
          await page.waitForSelector('#filterModal.active');
          await new Promise(resolve => setTimeout(resolve, 350));
          await page.screenshot({ path: path.resolve(__dirname, `manpower-filter-${theme}-${width}.png`) });
          const filterLayout = await page.$eval('#filterModal', modal => {
            const button = modal.querySelector('.form-apply-btn');
            const body = button.parentElement;
            const buttonRect = button.getBoundingClientRect();
            const bodyRect = body.getBoundingClientRect();
            return {
              appearances: [...modal.querySelectorAll('select')].map(select => getComputedStyle(select).appearance),
              buttonVisible: buttonRect.top >= bodyRect.top && buttonRect.bottom <= bodyRect.bottom,
              buttonHeight: buttonRect.height,
              bottomGap: modal.getBoundingClientRect().bottom - buttonRect.bottom
            };
          });
          assert.ok(filterLayout.appearances.every(value => value === 'none'), 'Filter dropdowns must show only their custom arrow');
          assert.ok(filterLayout.buttonVisible && filterLayout.buttonHeight >= 48 && filterLayout.bottomGap >= 20, 'Apply Filter must be fully visible with space below');
          await page.click('#filterModal .standard-filter-close');
          await page.waitForSelector('#filterModal', { hidden: true });
          assert.equal(await page.$('.view-chart-btn'), null);
          assert.equal(await page.$('#manpowerSummaryTableContainer'), null);
          assert.equal(await page.$('#view-dashboard table'), null);
          assert.equal(await page.$$eval('.manpower-group-card', cards => cards.length), 5);
          assert.deepEqual(await page.$$eval('.manpower-summary-actions strong', values => values.map(value => value.textContent)), ['260', '18', '92', '6']);
          assert.deepEqual(await page.$$eval('.manpower-group-card:first-child .manpower-group-actions button span', labels => labels.map(label => label.textContent)), ['Work Shift', 'No Work', 'OT Plan', 'On Leave']);
          assert.deepEqual(await page.$$eval('.manpower-group-card:first-child .manpower-group-actions strong', values => values.map(value => value.textContent)), ['20', '0', '0', '0']);
          assert.ok(await page.$eval('.manpower-group-actions', actions => {
            const buttons = [...actions.children];
            return buttons.every(button => button.getBoundingClientRect().top === buttons[0].getBoundingClientRect().top && button.scrollWidth <= button.clientWidth);
          }), 'All four actions must fit together in one row');
          await new Promise(resolve => setTimeout(resolve, 400));
          await page.screenshot({ path: path.resolve(__dirname, `${file}-report-${theme}-${width}.png`) });
          await page.$eval('.main-content', node => { node.scrollTop = 300; });
          await page.screenshot({ path: path.resolve(__dirname, `${file}-table-${theme}-${width}.png`) });
          await page.$eval('.main-content', node => { node.scrollTop = 0; });
          for (const [type, title, employeeTitle, groupId, recordCount, employeeHeading] of [
            ['workShift', 'Work Shift Summary', 'Work Shift Employee Detail', 1, 5, '000054 - Anderson Ng'],
            ['noWork', 'No Work Summary', 'No Work Employee Detail', 3, 2, 'TEST'],
            ['otPlan', 'OT Plan Summary', 'OT Plan Employee Detail', 4, 2, '0000101 - Lee Soon Hock'],
            ['onLeave', 'Leave Summary', 'Leave Employee Detail', 5, 4, 'EBB226 - Azhar bin Omar']
          ]) {
            const employeeName = {
              workShift: '.work-shift-employee-header h3', noWork: '.no-work-employee-table tbody th[scope="row"]',
              otPlan: 'ot-plan-employee-detail tbody th[scope="row"]', onLeave: 'leave-employee-detail tbody th[scope="row"]'
            }[type];
            await page.click(`.manpower-group-card[data-group-id="${groupId}"] [data-manpower-type="${type}"]`);
            assert.equal(await page.evaluate(() => selectedManpowerGroup.id), groupId);
            assert.equal(await page.$eval('#headerTitle', el => el.textContent), title);
            assert.equal(await page.$eval('#view-details', el => getComputedStyle(el).display), 'block');
            const expectedTables = { noWork: 1, otPlan: 1, onLeave: 2 };
            assert.equal(await page.$$eval('#view-details table', tables => tables.length), expectedTables[type] || 0);
            if (type === 'workShift') {
              assert.equal(await page.$eval('.work-shift-count', el => el.textContent), '1 record');
              assert.equal(await page.$eval('work-shift-summary [data-date]', el => el.textContent), '20 Sep 2026');
              assert.deepEqual(await page.$$eval('.work-shift-scope dd', nodes => nodes.map(el => el.textContent)), ['GROUP OF COMPANIES (demoAPI)', 'Corporate', 'CC-101 Management']);
              assert.equal(await page.$eval('.work-shift-card-header strong', el => el.textContent), '07:00 – 15:00');
              assert.deepEqual(await page.$$eval('.work-shift-metrics strong', nodes => nodes.map(el => el.textContent)), ['20', '160.00', '0.00']);
            } else if (type === 'noWork') {
              assert.equal(await page.$eval('no-work-summary .work-shift-count', el => el.textContent), '2 records');
              assert.equal(await page.$eval('no-work-summary [data-date]', el => el.textContent), '20 Sep 2026');
              assert.deepEqual(await page.$$eval('.work-shift-scope dd', nodes => nodes.map(el => el.textContent)), ['KOZATO KIZAI (M) SDN. BHD.', 'Assembly', 'CC-301 Production']);
              assert.deepEqual(await page.$$eval('.no-work-table thead th', nodes => nodes.map(el => el.textContent)), ['Shift', 'Headcount']);
              assert.deepEqual(await page.$$eval('.no-work-table tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [['No Work', '13'], ['Rest Day', '5']]);
              await page.click('.no-work-table tbody tr:nth-child(2) th');
              assert.equal(await page.$eval('#headerTitle', el => el.textContent), employeeTitle);
              assert.deepEqual(await page.$$eval('.no-work-detail-overview dd', nodes => nodes.map(el => el.textContent)), ['Rest Day', '5']);
              assert.equal(await page.$eval('no-work-employee-detail .work-shift-empty', el => el.innerText), 'No employee details available.');
              assert.equal(await page.$('no-work-employee-detail tbody tr'), null);
              await page.keyboard.press('Escape');
              assert.equal(await page.evaluate(() => document.activeElement.dataset.detailId), 'rest-day');
            } else if (type === 'otPlan') {
              assert.deepEqual(await page.$$eval('ot-plan-summary dd', nodes => nodes.map(el => el.textContent)), ['20 Sep 2026', '92', '135.00']);
              assert.deepEqual(await page.$$eval('ot-plan-summary thead th', nodes => nodes.map(el => el.textContent)), ['OT type', 'Headcount', 'Planned hours']);
              assert.deepEqual(await page.$$eval('ot-plan-summary tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent))), [
                ['OT 1.5 Before Work', '30', '30.00'], ['1.5 OT', '62', '105.00']
              ]);
              await page.click('ot-plan-summary tbody tr:last-child td:last-child');
              assert.deepEqual(await page.$eval('ot-plan-employee-detail .shift-employee-overview', card =>
                [...card.querySelectorAll('h2, [data-date], [data-shift], dd')].map(el => el.textContent)
              ), ['1.5 OT', '20 Sep 2026', '8.30:17.30W', '62', '105.00']);
              await page.keyboard.press('Escape');
              assert.equal(await page.evaluate(() => document.activeElement.dataset.detailId), 'ot-15');
            } else if (type === 'onLeave') {
              assert.deepEqual(await page.$$eval('leave-summary dd', nodes => nodes.map(el => el.textContent)), ['20 Sep 2026', '6']);
              assert.deepEqual(await page.$$eval('leave-summary details', cards => cards.map(card => ({
                shift: card.querySelector('summary strong').textContent,
                open: card.open,
                rows: [...card.querySelectorAll('tbody tr')].map(row => [...row.cells].map(cell => cell.textContent))
              }))), [
                { shift: 'Shift · 8.30:17.30W', open: true, rows: [['Annual Leave', '1'], ['Unpaid Leave', '2']] },
                { shift: 'Shift · 14.00:22.00W', open: true, rows: [['Annual Leave', '2'], ['Medical Leave', '1']] }
              ]);
              await page.click('leave-summary details:first-child summary');
              await page.click('[data-detail-id="leave-afternoon-annual"]');
              assert.deepEqual(await page.$eval('leave-employee-detail .shift-employee-overview', card =>
                [...card.querySelectorAll('h2, [data-date], [data-shift], dd')].map(node => node.textContent)
              ), ['Annual Leave', '20 Sep 2026', '14.00:22.00W', '2', '—']);
              assert.equal(await page.$eval('leave-employee-detail .work-shift-empty', el => el.innerText), 'No employee details available.');
              await page.keyboard.press('Escape');
              assert.equal(await page.evaluate(() => document.activeElement.dataset.detailId), 'leave-afternoon-annual');
              assert.equal(await page.$eval('leave-summary details:first-child', card => card.open), false);
              await page.click('leave-summary details:first-child summary');
            }
            await page.click('#manpowerDetailList [data-detail-id]');
            assert.equal(await page.$eval('#headerTitle', el => el.textContent), employeeTitle);
            assert.equal(await page.$eval(employeeName, el => el.textContent), employeeHeading);
            if (type === 'workShift') {
              assert.equal(await page.$eval('.work-shift-detail-title', el => el.textContent), 'Shift · 07:00 – 15:00');
              assert.deepEqual(await page.$$eval('.work-shift-overview strong', nodes => nodes.map(el => el.textContent)), ['20', '160.00', '0.00']);
              const roster = await page.$$eval('.work-shift-employee-card', cards => cards.map(card => [
                card.querySelector('h3').textContent, card.querySelector('header p').textContent,
                ...[...card.querySelectorAll('.work-shift-metrics strong')].map(el => el.textContent)
              ]));
              assert.equal(roster.length, 7);
              assert.deepEqual(roster.slice(0, 2), [
                ['000054 - Anderson Ng', 'Account Executive', '8.00', '0.00'],
                ['000070 - Yee Seong Liew', 'Payables Executive', '8.00', '0.00']
              ]);
            } else if (type === 'noWork') {
              assert.deepEqual(await page.$$eval('.no-work-detail-overview dd', nodes => nodes.map(el => el.textContent)), ['—', '13']);
              const roster = await page.$$eval('.no-work-employee-table tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent)));
              assert.equal(roster.length, 7);
              assert.deepEqual(roster.slice(0, 4), [
                ['00012345', 'TEST', 'Account Executive'],
                ['012345', 'hey', 'Bartender'],
                ['620578', 'Bhim Bahadur Tamang', 'Production Operator'],
                ['620657', 'Pritiman Gurung', 'Production Operator']
              ]);
            } else if (type === 'otPlan') {
              assert.deepEqual(await page.$$eval('ot-plan-employee-detail .shift-employee-overview dd', nodes => nodes.map(el => el.textContent)), ['30', '30.00']);
              const roster = await page.$$eval('ot-plan-employee-detail tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent)));
              assert.equal(roster.length, 6);
              assert.deepEqual(roster.slice(0, 3), [
                ['0000101 - Lee Soon Hock', 'Account Manager', '1.00'],
                ['000020 - Tay Siow Kung', 'BFT & COM. Executive', '1.00'],
                ['000031 - Navin', 'Account Executive', '—']
              ]);
            } else if (type === 'onLeave') {
              assert.deepEqual(await page.$eval('leave-employee-detail .shift-employee-overview', card =>
                [...card.querySelectorAll('h2, [data-date], [data-shift], dd')].map(node => node.textContent)
              ), ['Annual Leave', '20 Sep 2026', '8.30:17.30W', '1', '1.00']);
              assert.deepEqual(await page.$$eval('leave-employee-detail thead th', nodes => nodes.map(node => node.textContent)), ['Employee', 'Job position', 'Leave days']);
              assert.deepEqual(await page.$$eval('leave-employee-detail tbody tr', rows =>
                rows.map(row => [...row.cells].map(cell => cell.textContent))
              ), [['EBB226 - Azhar bin Omar', 'Production Operator', '1.00']]);
            }
            await page.click('.header-btn-icon');
            assert.equal(await page.$eval('#headerTitle', el => el.textContent), title, 'Employee Back must return to the selected summary');
            assert.equal(await page.evaluate(() => document.activeElement.matches('#manpowerDetailList [data-detail-id]')), true);
            await page.click('.header-btn-icon');
            assert.equal(await page.$eval('#headerTitle', el => el.textContent), 'Daily Manpower Summary');
            await page.click(`.manpower-summary-actions [onclick="openKpiDetails('${type}')"]`);
            assert.equal(await page.evaluate(() => selectedManpowerGroup), null, 'Summary actions must represent all filtered groups');
            assert.equal(await page.$eval('#headerTitle', el => el.textContent), title);
            assert.equal(await page.$$eval('#manpowerDetailList [data-detail-id]', cards => cards.length), recordCount);
            assert.equal(await page.$eval('.main-content', el => el.scrollWidth > el.clientWidth), false);
            await page.screenshot({ path: path.resolve(__dirname, `manpower-${type}-summary-${theme}-${width}.png`) });
            await page.click('#manpowerDetailList [data-detail-id]');
            assert.equal(await page.$eval('#headerTitle', el => el.textContent), employeeTitle);
            assert.equal(await page.$eval(employeeName, el => el.textContent), employeeHeading);
            assert.equal(await page.$eval('.main-content', el => el.scrollWidth > el.clientWidth), false);
            await page.screenshot({ path: path.resolve(__dirname, `manpower-${type}-employees-${theme}-${width}.png`) });
            await page.click('.header-btn-icon');
            await page.click('.header-btn-icon');
          }
          assert.equal(await page.$eval('.main-content', el => el.scrollWidth > el.clientWidth), false);
          assert.equal(await page.$eval('#totalRecordsVal', el => el.textContent), '376');
          assert.equal(await page.$$eval('#manpowerListContainer .manpower-group-card', cards => cards.length), 5);
          await page.click('[aria-label="Next Day"]');
          assert.equal(await page.$eval('#totalRecordsVal', el => el.textContent), '368');
          assert.equal(await page.$eval('#kpiNoWork', el => el.textContent), '13');
          await page.click('#boxkpiOnLeave');
          assert.deepEqual(await page.$$eval('leave-summary dd', nodes => nodes.map(el => el.textContent)), ['21 Sep 2026', '3']);
          assert.equal(await page.$$eval('leave-summary details', cards => cards.length), 1);
          await page.click('.header-btn-icon');
          await page.click('#boxkpiNoWork');
          assert.equal(await page.$eval('no-work-summary .work-shift-count', el => el.textContent), '1 record');
          assert.deepEqual(await page.$$eval('.no-work-table tbody th', nodes => nodes.map(el => el.textContent)), ['No Work']);
          await page.click('.header-btn-icon');
          await page.click('[aria-label="Previous Day"]');
          await page.select('#filterCompanySelect', 'PEOPLE EDGE SDN BHD');
          assert.equal(await page.$eval('#totalRecordsVal', el => el.textContent), '376', 'Draft filters must not change rendered cards');
          await page.evaluate(() => applyFilterModal());
          assert.equal(await page.$eval('#totalRecordsVal', el => el.textContent), '337');
          assert.deepEqual(await page.$$eval('.manpower-summary-actions strong', values => values.map(value => value.textContent)), ['239', '0', '92', '6']);
          assert.equal(await page.$$eval('.manpower-group-card', cards => cards.length), 2);
          assert.deepEqual(await page.$$eval('.manpower-company-header', titles => titles.map(title => title.textContent)), ['PEOPLE EDGE SDN BHD', 'PEOPLE EDGE SDN BHD']);
          assert.deepEqual(await page.$$eval('.manpower-group-card .manpower-group-actions strong', values => values.map(value => value.textContent)), ['3', '0', '92', '0', '236', '0', '0', '6']);
          assert.deepEqual(await page.$$eval('.manpower-group-card [data-section]', fields => fields.map(field => field.textContent)), ['EXECUTIVE', 'FOREX']);
          await page.click('#boxkpiWorkShift');
          assert.equal(await page.$eval('.work-shift-scope [data-company]', el => el.textContent), 'PEOPLE EDGE SDN BHD');
          assert.equal(await page.$eval('.work-shift-count', el => el.textContent), '3 records');
          assert.deepEqual(await page.$$eval('.work-shift-card-header strong', titles => titles.map(el => el.textContent)), ['08:15 – 17:15', '08:30 – 17:30', '08:30 – 17:30']);
          assert.deepEqual(await page.$$eval('.work-shift-metrics [data-headcount]', values => values.map(el => el.textContent)), ['2', '1', '236'], 'Global summary must include only filtered company groups');
          await page.click('.header-btn-icon');
          await page.click('#boxkpiNoWork');
          assert.equal(await page.$eval('no-work-summary .work-shift-count', el => el.textContent), '0 records');
          assert.equal(await page.$eval('no-work-summary [data-company]', el => el.textContent), 'PEOPLE EDGE SDN BHD');
          assert.equal(await page.$eval('no-work-summary .work-shift-empty', el => el.innerText), 'No records match the current filter.');
          await page.click('.header-btn-icon');
          for (const [button, detailId, empty] of [
            ['boxkpiOtPlan', 'ot-15', 'ot-plan-employee-detail .work-shift-empty'],
            ['boxkpiOnLeave', 'leave-unpaid', 'leave-employee-detail .work-shift-empty']
          ]) {
            await page.click(`#${button}`);
            await page.click(`[data-detail-id="${detailId}"]`);
            assert.equal(await page.$eval(empty, el => el.innerText), 'No employee details available.');
            assert.equal(await page.$('#manpowerDetailList tbody tr'), null);
            await page.keyboard.press('Escape');
            assert.equal(await page.evaluate(() => document.activeElement.dataset.detailId), detailId, 'Back must restore focus to the selected summary record');
            await page.click('.header-btn-icon');
            assert.equal(await page.evaluate(() => document.activeElement.id), button);
          }
          await page.$eval('.main-content', node => { node.scrollTop = 0; });
          await page.screenshot({ path: path.resolve(__dirname, `${file}-cards-${theme}-${width}.png`) });
          await page.select('#filterCompanySelect', 'TECH HUB SOLUTIONS');
          await page.evaluate(() => applyFilterModal());
          assert.equal(await page.$eval('#totalRecordsVal', el => el.textContent), '0');
          assert.deepEqual(await page.$$eval('.manpower-summary-actions strong', values => values.map(value => value.textContent)), ['0', '0', '0', '0']);
          assert.equal(await page.$$eval('.manpower-group-card', cards => cards.length), 0);
          assert.equal(await page.$eval('#manpowerEmpty', el => el.hidden), false);
          await page.click('#boxkpiOtPlan');
          assert.deepEqual(await page.$$eval('ot-plan-summary dd', nodes => nodes.map(el => el.textContent)), ['20 Sep 2026', '0', '0.00']);
          assert.equal(await page.$eval('ot-plan-summary .work-shift-empty', el => el.textContent), 'No OT plan records match this selection.');
          await page.click('.header-btn-icon');
          await page.click('#boxkpiOnLeave');
          assert.equal(await page.$eval('leave-summary [data-headcount]', el => el.textContent), '0');
          assert.equal(await page.$eval('leave-summary .work-shift-empty', el => el.textContent), 'No leave records match this selection.');
          assert.equal(await page.$('leave-summary details'), null);
          await page.click('.header-btn-icon');
          await page.click('#boxkpiWorkShift');
          assert.equal(await page.$eval('.work-shift-scope [data-company]', el => el.textContent), 'TECH HUB SOLUTIONS');
          assert.equal(await page.$eval('.work-shift-count', el => el.textContent), '0 records');
          assert.equal(await page.$eval('.work-shift-empty', el => el.textContent), 'No records match the current filter.');
          await page.click('.header-btn-icon');
          assert.deepEqual(errors, []);
          await page.screenshot({ path: path.resolve(__dirname, `${file}-${theme}-${width}.png`) });
          console.log(`PASS ${file} ${theme} ${width}: card summaries and employee drill-down, scoped filters, totals, empty states, Back/Escape focus and mobile layout`);
        }
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
