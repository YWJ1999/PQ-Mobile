const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = file => pathToFileURL(path.resolve(file)).href;
const ref = number => 'ECR' + String(number).padStart(16, '0');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url('modules/employee-career/index.html') + '?scope=individual&theme=' + theme, { waitUntil: 'load' });
      const entry = '[data-option-id="history"]';
      assert.equal(await page.$('[data-option-id="cv-change-request-history"]'), null, 'CV changes belong inside History');
      await page.evaluate(() => localStorage.removeItem('pq_change_request_history'));
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click(entry)]);
      assert.equal(await page.$eval('h1', node => node.textContent), 'History');
      await page.click('[data-history-kind="cv-change-request"]');
      assert.equal(await page.$eval('#historyCategoryTitle', node => node.textContent), 'CV Change Request History');
      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '10', 'Count only the readable reference records');
      assert.deepEqual(await page.$$eval('#careerHistoryList .history-card-heading', nodes => nodes.map(node => node.textContent.trim())),
        [98, 99, 100, 101, 102, 103, 110, 104, 224, 225].map(ref));
      const apply = async (from, to, status) => {
        await page.click('#historyFilterTrigger');
        assert.equal(await page.$eval('#historyFilterTitle', node => node.textContent), 'Filter');
        assert.deepEqual(await page.$$eval('#cvHistoryFields label', nodes => nodes.map(node => node.textContent)), ['Start Date', 'End Date', 'Status']);
        await page.$eval('#cvHistoryDateFrom', (node, value) => { node.value = value; }, from);
        await page.$eval('#cvHistoryDateTo', (node, value) => { node.value = value; }, to);
        await page.select('#cvHistoryStatus', status);
        await page.click('#applyHistoryFilter');
      };
      await apply('2019-11-13', '2019-11-13', '');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '3', 'Both date bounds are inclusive');
      await apply('2019-11-13', '2019-11-13', 'approved');
      assert.deepEqual(await page.$$eval('.history-card-item', nodes => nodes.map(node => node.dataset.recordId)), [ref(100)]);
      await page.click('.history-card-item');
      assert.deepEqual(await page.$$eval('[data-cv-tab]', nodes => nodes.map(node => node.textContent)), ['Personal', 'Qualification', 'Payroll', 'Contacts', 'Family']);
      assert.equal(await page.$eval('.cv-history-detail-tabs', node => getComputedStyle(node).display), 'flex', 'CV sections use a horizontal tab bar');
      const expected = {
        personal: ['redo', ref(100), 'SITI NURHALIZA BTE RAHMAN', '22 Apr 1960', '17 Jul 1984', 'A212222048', '25 Mar 2015'],
        qualification: ['Description', 'Other Institute Name', 'CGPA', '0.00', 'Certificate #', 'Year From', 'Year To', 'Highest', 'No', 'Notes'],
        payroll: ['EPF #', 'Socso #', 'Spouse Tax #', 'CIMB', '10447856855254', 'Spouse Handicap?', 'Spouse Working?', 'Yes'],
        contacts: ['th.yew@peoplequest.com.my', '012-3512223', '02-79560000', '10, JALAN UPTOWN 2', '#05-33- JALAN 2228', 'DAMANSARA KOTA', '40860', 'Damansara', 'SELANGOR', 'MALAYSIA', '04-6677778', 'RAZALI', 'AS CORRESPONDENCE ADDRESS', 'FATHER'],
        family: ['Deleted Family Member', 'Existing Family Member', 'Name', 'Relation', 'TAI KIM CHUAN', 'BROTHER', 'ABU KADIR BIN MAHMUD', 'HUSBAND']
      };
      for (const width of [320, 360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$$eval('[data-cv-tab]', nodes => nodes.every(node => {
          const bounds = node.getBoundingClientRect();
          return bounds.height >= 44;
        })), 'All five sections retain touch targets at ' + width);
        for (const [tab, values] of Object.entries(expected)) {
          await page.click('[data-cv-tab="' + tab + '"]');
          assert.ok(await page.$eval('[data-cv-tab="' + tab + '"]', node => {
            const bounds = node.getBoundingClientRect();
            const bar = node.closest('.cv-history-detail-tabs').getBoundingClientRect();
            return bounds.left >= bar.left - 1 && bounds.right <= bar.right + 1;
          }), 'Selected section scrolls into view at ' + width);
          const text = await page.$eval('#cv-panel-' + tab, node => node.textContent);
          for (const value of values) assert.ok(text.includes(value), tab + ': ' + value);
          assert.equal(await page.$eval('#cv-panel-' + tab, node => node.hidden), false);
          assert.ok(await page.$eval('#historyDetailBody', node => node.scrollWidth <= node.clientWidth + 1), tab + ' fits ' + width);
          if (tab === 'family' && width === 390) await page.screenshot({ path: 'scratch/employee-career-cv-history-family-' + theme + '.png' });
        }
      }
      await page.setViewport({ width: 360, height: 640 });
      await page.click('[data-cv-tab="contacts"]');
      assert.deepEqual(await page.$$eval('#cv-panel-contacts [data-cv-contact-group]', groups => groups.map(group => ({
        title: group.querySelector('h3').textContent.trim(),
        fields: [...group.querySelectorAll('[data-cv-field]')].map(field => field.dataset.cvField)
      }))), [
        { title: 'Correspondence Contact', fields: ['Company Email', 'Phone #', 'Mobile #', 'Address', 'Postal Code', 'City', 'State', 'Country'] },
        { title: 'Emergency Contact', fields: ['Emergency Contact #', 'Contact Name', 'Contact Address', 'Contact Postal Code', 'Contact City', 'Contact State', 'Contact Country', 'Remarks'] }
      ], 'Contact information is split into correspondence and emergency groups without losing fields');
      const tabTop = await page.$eval('.cv-history-detail-tabs', node => node.getBoundingClientRect().top);
      await page.$eval('.cv-history-detail-scroll', node => { node.scrollTop = node.scrollHeight; });
      assert.equal(await page.$eval('.cv-history-detail-tabs', node => node.getBoundingClientRect().top), tabTop, 'Section navigation stays visible while details scroll');
      assert.ok(await page.$eval('.cv-history-detail-scroll', node => node.scrollTop > 0), 'Long mobile details scroll independently');
      assert.ok(await page.$eval('#closeHistoryDetails', node => node.getBoundingClientRect().height >= 44), 'Close has a mobile touch target');
      assert.ok(await page.$eval('#historyDetailsModal .history-detail-panel', node => {
        const bounds = node.getBoundingClientRect();
        return bounds.bottom <= window.innerHeight && bounds.top >= 0;
      }), 'The sheet fits a short phone viewport');
      await page.click('[data-cv-tab="family"]');
      await page.focus('[data-cv-tab="family"]');
      await page.keyboard.press('Home');
      assert.equal(await page.$eval('[data-cv-tab="personal"]', node => node.getAttribute('aria-selected')), 'true');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'closeHistoryDetails', 'Tab wraps inside the detail dialog');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.cvTab), 'personal');
      assert.ok(await page.$eval('#cv-panel-personal .cv-history-detail-employee', node => node.querySelector('.history-employee-name').nextElementSibling.classList.contains('history-employee-id')));
      assert.ok(await page.$eval('#cv-panel-personal [data-cv-field="Name"]', node => node.classList.contains('cv-history-field-changed')));
      await page.setViewport({ width: 390, height: 950 });
      await page.screenshot({ path: 'scratch/employee-career-cv-history-details-' + theme + '.png' });
      await page.keyboard.press('Escape');
      await apply('2019-11-13', '2019-11-13', 'cancelled');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '2');
      await apply('2030-01-01', '2030-12-31', '');
      assert.equal(await page.$eval('#historyEmptyState', node => node.hidden), false);
      await apply('2026-12-31', '2026-01-01', '');
      assert.equal(await page.$eval('#historyFilterError', node => node.hidden), false);
      assert.equal(await page.$eval('#historyFilterModal', node => node.classList.contains('is-open')), true);
      await page.click('#resetHistoryFilter');
      await page.screenshot({ path: 'scratch/employee-career-cv-history-filter-' + theme + '.png' });
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$eval('#historyRecordCount', node => node.textContent), '10');
      await page.screenshot({ path: 'scratch/employee-career-cv-history-reference-' + theme + '.png' });
      await page.click('#careerHistoryBack');
      await page.waitForSelector(entry);
      assert.equal(await page.$eval('#employeeCareerTabIndividual', node => node.getAttribute('aria-selected')), 'true');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: CV tab inside History, five visible mobile sections, pinned navigation, short phone layout, screenshot records, date/status filters, keyboard access, back navigation and both themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
