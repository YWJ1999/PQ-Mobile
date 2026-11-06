const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/admin/options/guest-visit.html')).href;
const draftKey = 'peoplehcm:guest-visit:draft:v1';

// Catch lost values across tabs/draft reloads, broken Add/Edit/Remove,
// hidden-tab validation failures, contradictory Other choices and mobile overflow.
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function click(selector) {
      await page.$eval(selector, n => n.scrollIntoView({ block: 'center' }));
      await page.click(selector);
    }
    async function tab(name) { await click(`[data-visit-tab="${name}"]`); }
    async function fill(values) {
      await page.evaluate(values => {
        for (const [id, value] of Object.entries(values)) {
          const field = document.getElementById(id);
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, values);
    }
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.ok(await page.$('#guestVisitForm'), 'Guest Visit must open a working form');
      await page.evaluate(key => localStorage.removeItem(key), draftKey);
      await page.reload({ waitUntil: 'load' });
      assert.deepEqual(await page.$$eval('[role="tab"] .visit-step-label', nodes => nodes.map(n => n.textContent)), ['General', 'Guest', 'Attendee', 'Other']);
      assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', n => n.dataset.visitTab), 'general');
      assert.deepEqual(await page.$$eval('.visit-page-actions a, .visit-page-actions button', nodes => nodes.filter(n => n.getClientRects().length).map(n => n.textContent.trim())), ['Cancel', 'Save Draft', 'Next'], 'General must offer Cancel, Save Draft and Next, without Submit');
      for (const category of ['guest', 'attendee']) {
        await tab(category);
        assert.deepEqual(await page.$$eval('.visit-page-actions a, .visit-page-actions button', nodes => nodes.filter(n => n.getClientRects().length).map(n => n.textContent.trim())), ['Back to Categories', 'Next'], 'List pages must match Mileage navigation');
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));
        await page.screenshot({ path: path.join(__dirname, `admin_guest_visit_${category}_empty_${theme}.png`) });
      }
      await tab('general');
      assert.match(await page.$eval('#visitDate', n => n.value), /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(await page.$$eval('.visit-choice input', nodes => nodes.length === 5 && nodes.every(n => n.getAttribute('role') === 'switch')), true, 'Form boolean choices must be exposed as switches');
      await page.$eval('#visitMeal', n => n.scrollIntoView({ block: 'center' }));
      await page.focus('#visitMeal');
      await page.keyboard.press('Space');
      assert.equal(await page.$eval('#visitMeal', n => n.checked), true, 'Meal switch must support keyboard activation');
      await page.keyboard.press('Space');
      assert.equal(await page.$eval('#visitMeal', n => n.checked), false);
      await click('#visitSummaryDetails');
      assert.equal(await page.$eval('#visitCategories', n => n.hidden), false, 'General Details must open the category summary');
      assert.deepEqual(await page.$$eval('[data-visit-category]', nodes => nodes.map(n => n.dataset.visitCategory)), ['guest', 'attendee', 'other']);
      await click('[data-visit-category="guest"]');
      assert.equal(await page.$eval('#visitGuestEditor', n => n.hidden), true, 'Guest tab must start with its list, not an inline entry form');
      assert.deepEqual(await page.$$eval('.visit-page-actions a, .visit-page-actions button', nodes => nodes.filter(n => n.getClientRects().length).map(n => n.textContent.trim())), ['Back to Categories', 'Next'], 'Lists must use Mileage Back to Categories and Next');
      await click('#visitOpenGuest');
      assert.equal(await page.$eval('#visitGuestEditor', n => n.hidden), false);
      await fill({ visitGuestName: 'Discard this unsaved entry' });
      await click('#visitGuestCancelEdit');
      assert.equal(await page.$eval('#visitGuestName', n => n.value), '', 'Cancel must discard an unsaved entry');
      await click('#visitPrevious');
      assert.equal(await page.$eval('#visitCategories', n => n.hidden), false, 'List Cancel must return to categories');
      await click('#visitCategoriesBack');
      assert.equal(await page.$eval('[aria-selected="true"]', n => n.dataset.visitTab), 'general');
      await click('#visitNext');
      await click('#visitOpenGuest');
      await fill({ visitGuestCompany: 'Unsaved company' });
      await click('.admin-header [data-admin-back]');
      assert.equal(await page.$eval('#visitGuestEditor', n => n.hidden), true, 'Header Back from an entry must return to its list');
      assert.equal(await page.$eval('#visitGuestCompany', n => n.value), '');
      await tab('general');
      await tab('other');
      await click('#visitSubmit');
      assert.equal(await page.$eval('[aria-selected="true"]', n => n.dataset.visitTab), 'general', 'Submit must reveal the invalid General field from another tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'visitEndTime');
      await fill({ visitDate: '2026-10-06', visitStartTime: '09:00', visitEndTime: '10:30', visitTotalGuest: '2', visitLocation: 'head-office' });
      await click('#visitMeal');
      await click('#visitNext');
      assert.equal(await page.$eval('[aria-selected="true"]', n => n.dataset.visitTab), 'guest');
      await click('#visitOpenGuest');
      await click('#visitGuestAdd');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'visitGuestCompany');
      await fill({ visitGuestCompany: 'Example <HQ>', visitGuestRelation: 'customer', visitGuestName: 'Chris Lee', visitGuestPosition: 'Director' });
      await click('#visitGuestAdd');
      assert.equal(await page.$$eval('#visitGuestList article', nodes => nodes.length), 1);
      assert.equal(await page.$eval('#visitGuestEditor', n => n.hidden), true, 'Save Item must return to the guest list');
      assert.equal(await page.$eval('#visitGuestSummaryCount', n => n.textContent), '1');
      await click('#visitGuestList [data-toggle-record]');
      assert.equal(await page.$eval('#visitGuestList [data-toggle-record]', n => n.getAttribute('aria-expanded')), 'true', 'A saved guest must have expandable details');
      assert.match(await page.$eval('#visitGuestList', n => n.textContent), /Example <HQ>/, 'Guest text must render literally');
      assert.equal(await page.$('#visitGuestList hq'), null);
      await click('#visitGuestList [data-edit-guest]');
      await fill({ visitGuestPosition: 'Regional Director' });
      await click('#visitGuestEditor [data-visit-save-draft]');
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.$eval('#visitGuestEditor', n => n.hidden), false, 'An editing draft must restore the independent entry view');
      assert.equal(await page.$eval('#visitGuestPosition', n => n.value), 'Regional Director');
      await click('#visitGuestAdd');
      assert.equal(await page.$$eval('#visitGuestList article', nodes => nodes.length), 1, 'Update must replace the same guest');
      assert.match(await page.$eval('#visitGuestList', n => n.textContent), /Regional Director/);
      await click('#visitGuestList [data-edit-guest]');
      await tab('other');
      await tab('guest');
      await click('#visitOpenGuest');
      await fill({ visitGuestCompany: 'New guest company', visitGuestRelation: 'supplier', visitGuestName: 'New Guest', visitGuestPosition: 'Consultant' });
      await click('#visitGuestAdd');
      assert.equal(await page.$$eval('#visitGuestList article', nodes => nodes.length), 2, 'Plus after leaving an edit must create a new guest, without replacing the original');
      assert.match(await page.$eval('#visitGuestList', n => n.textContent), /Regional Director/);
      await click('#visitGuestList [data-remove-guest="1"]');
      await click('#visitOpenGuest');
      await fill({ visitGuestCompany: 'Second Company', visitGuestRelation: 'partner', visitGuestName: 'Alex Tan', visitGuestPosition: 'Manager' });
      await click('#visitGuestAdd');
      await click('#visitGuestList [data-remove-guest="1"]');
      assert.equal(await page.$$eval('#visitGuestList article', nodes => nodes.length), 1);
      await tab('attendee');
      assert.equal(await page.$eval('#visitAttendeeEditor', n => n.hidden), true);
      await click('#visitOpenAttendee');
      await page.select('#visitStaff', 'EBB01');
      assert.equal(await page.$eval('#visitStaffDepartment', n => n.value), 'Human Resources');
      assert.equal(await page.$eval('#visitStaffPosition', n => n.value), 'People Operations Executive');
      await click('#visitAttendeeAdd');
      assert.match(await page.$eval('#visitAttendeeList', n => n.textContent), /Aina Rahman/);
      assert.equal(await page.$eval('#visitAttendeeList .visit-employee-id', n => n.textContent), '#EBB01');
      assert.ok(await page.$eval('#visitAttendeeList .visit-employee-id', n => n.previousElementSibling.textContent === 'Aina Rahman'));
      const attendeeToggle = '#visitAttendeeList [data-toggle-record]';
      assert.equal(await page.$eval(attendeeToggle, n => n.getAttribute('aria-expanded')), 'false');
      assert.equal(await page.$eval('#visitAttendeeList .visit-record-details', n => n.hidden), true);
      await page.focus(attendeeToggle);
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval(attendeeToggle, n => n.getAttribute('aria-expanded')), 'true');
      assert.equal(await page.$eval('#visitAttendeeList .visit-record-details', n => n.hidden), false);
      assert.deepEqual(
        await page.$$eval('#visitAttendeeList .visit-record-details dl > div', rows => rows.map(row => [
          row.querySelector('dt').textContent.trim(),
          row.querySelector('dd').textContent.trim()
        ])),
        [['Department', 'Human Resources'], ['Position', 'People Operations Executive']],
        'Expanded attendee rows show all saved details'
      );
      await page.keyboard.press('Space');
      assert.equal(await page.$eval('#visitAttendeeList .visit-record-details', n => n.hidden), true);
      await click('#visitAttendeeList [data-edit-attendee]');
      assert.equal(await page.$eval('#visitStaff', n => n.value), 'EBB01');
      await page.select('#visitStaff', 'EBB03');
      await click('#visitAttendeeAdd');
      assert.equal(await page.$$eval('#visitAttendeeList article', nodes => nodes.length), 1, 'Editing an attendee must replace the same record');
      assert.match(await page.$eval('#visitAttendeeList', n => n.textContent), /Nur Izzati/);
      await click('#visitAttendeeList [data-edit-attendee]');
      await page.select('#visitStaff', 'EBB01');
      await click('#visitAttendeeAdd');
      await click('#visitAttendeeList [data-edit-attendee]');
      await page.select('#visitStaff', '');
      await tab('other');
      await click('#visitSubmit');
      assert.equal(await page.$eval('#visitAttendeeEditor', n => n.hidden), false, 'Clearing Staff in a pending attendee edit must block submission and reveal the entry');
      assert.equal(await page.$eval('[aria-selected="true"]', n => n.dataset.visitTab), 'attendee');
      await click('#visitAttendeeCancelEdit');
      await click('#visitAttendeeList [data-edit-attendee]');
      await tab('other');
      await tab('attendee');
      await click('#visitOpenAttendee');
      await page.select('#visitStaff', 'EBB02');
      await click('#visitAttendeeAdd');
      assert.equal(await page.$$eval('#visitAttendeeList article', nodes => nodes.length), 2, 'Plus after an attendee edit must add a new employee');
      assert.match(await page.$eval('#visitAttendeeList', n => n.textContent), /#EBB01/);
      await click('#visitAttendeeList [data-remove-attendee="1"]');
      await click('#visitOpenAttendee');
      await page.select('#visitStaff', 'EBB01');
      await click('#visitAttendeeAdd');
      assert.equal(await page.$$eval('#visitAttendeeList article', nodes => nodes.length), 1, 'Duplicate attendee must not be added');
      await page.select('#visitStaff', '');
      assert.equal(await page.$eval('#visitStaffDepartment', n => n.value), '');
      await page.select('#visitStaff', 'EBB02');
      await click('#visitAttendeeAdd');
      await click('#visitAttendeeList [data-remove-attendee="1"]');
      assert.equal(await page.$$eval('#visitAttendeeList article', nodes => nodes.length), 1);
      await tab('other');
      assert.equal(await page.$eval('#visitRequestNone', n => n.checked), true);
      await click('#visitRequestFloor');
      await click('#visitRequestSitting');
      assert.equal(await page.$eval('#visitRequestNone', n => n.checked), false);
      assert.equal(await page.$eval('#visitRequestFloor', n => n.checked), true);
      await click('#visitRequestNone');
      assert.equal(await page.$$eval('[data-other-request]:checked', nodes => nodes.length), 0);
      await click('#visitRequestRooms');
      await click('#visitSaveDraft');
      assert.match(await page.$eval('#visitFeedback', n => n.textContent), /draft saved/i);
      await page.reload({ waitUntil: 'load' });
      await tab('general');
      assert.deepEqual(await page.evaluate(() => ['visitDate', 'visitStartTime', 'visitEndTime', 'visitTotalGuest', 'visitLocation'].map(id => document.getElementById(id).value)), ['2026-10-06', '09:00', '10:30', '2', 'head-office']);
      assert.equal(await page.$eval('#visitMeal', n => n.checked), true);
      await tab('guest');
      assert.match(await page.$eval('#visitGuestList', n => n.textContent), /Regional Director/);
      await tab('attendee');
      assert.match(await page.$eval('#visitAttendeeList', n => n.textContent), /#EBB01/);
      await tab('other');
      assert.equal(await page.$eval('#visitRequestRooms', n => n.checked), true);
      await click('#visitSubmit');
      assert.match(await page.$eval('#visitFeedback', n => n.textContent), /saved to History/i);
      await tab('general');
      await (await page.$('#visitFiles')).uploadFile(path.resolve(__dirname, '../package.json'));
      assert.match(await page.$eval('#visitAttachments', n => n.textContent), /package.json/);
      assert.equal(await page.$eval('#visitCamera', n => n.getAttribute('capture')), 'environment');
      await click('#visitSaveDraft');
      await page.reload({ waitUntil: 'load' });
      assert.match(await page.$eval('#visitAttachments', n => n.textContent), /reattach/i);
      await click('#visitSaveDraft');
      await page.reload({ waitUntil: 'load' });
      assert.match(await page.$eval('#visitAttachments', n => n.textContent), /package.json/);
      await tab('other');
      await click('#visitSubmit');
      assert.match(await page.$eval('#visitFeedback', n => n.textContent), /reattach|remove/i, 'Submit must not ignore missing restored files');
      await (await page.$('#visitFiles')).uploadFile(path.resolve(__dirname, '../package.json'));
      assert.equal(await page.$$eval('#visitAttachments .visit-attachment', nodes => nodes.length), 1, 'Reattachment must replace the pending file');
      await click('#visitAttachments [data-remove-attachment]');
      assert.equal(await page.$$eval('#visitAttachments .visit-attachment', nodes => nodes.length), 0);
      await click('#visitSaveDraft');
      await page.reload({ waitUntil: 'load' });
      assert.equal(await page.$$eval('#visitAttachments .visit-attachment', nodes => nodes.length), 0);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        for (const name of ['general', 'guest', 'attendee', 'other']) {
          await tab(name);
          assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1), `${name} must fit ${width}px`);
          assert.ok(await page.$$eval('[role="tabpanel"]:not([hidden]) .form-section-heading', nodes => nodes.length > 0 && nodes.every(n => {
            const bar = getComputedStyle(n, '::before');
            return bar.width === '3.5px' && bar.height === '15px' && bar.backgroundColor === 'rgb(168, 85, 247)';
          })));
          const want = name === 'general' ? ['Cancel', 'Save Draft', 'Next'] : name === 'other' ? ['Cancel', 'Save Draft', 'Submit'] : ['Back to Categories', 'Next'];
          assert.deepEqual(await page.$$eval('.visit-page-actions a, .visit-page-actions button', nodes => nodes.filter(n => n.getClientRects().length).map(n => n.textContent.trim())), want, name + ' must show the correct actions');
          const action = name === 'other' ? '#visitSubmit' : '#visitNext';
          await page.$eval(action, n => n.scrollIntoView({ block: 'center' }));
          assert.ok(await page.$eval(action, n => n.getBoundingClientRect().bottom <= document.querySelector('.bottom-nav').getBoundingClientRect().top + 1), 'Actions must be above the main navigation');
        }
        for (const category of ['guest', 'attendee']) {
          await tab(category);
          await click(category === 'guest' ? '#visitOpenGuest' : '#visitOpenAttendee');
          assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1), category + ' editor must fit ' + width + 'px');
          const save = category === 'guest' ? '#visitGuestAdd' : '#visitAttendeeAdd';
          await page.$eval(save, n => n.scrollIntoView({ block: 'center' }));
          assert.ok(await page.$eval(save, n => n.getBoundingClientRect().bottom <= document.querySelector('.bottom-nav').getBoundingClientRect().top + 1), 'Save Item must be reachable');
          await click(category === 'guest' ? '#visitGuestCancelEdit' : '#visitAttendeeCancelEdit');
        }
      }
      await page.setViewport({ width: 390, height: 950 });
      for (const name of ['general', 'guest', 'attendee', 'other']) {
        await tab(name);
        await page.$eval('main', n => { n.scrollTop = 0; });
        await page.screenshot({ path: path.join(__dirname, `admin_guest_visit_${name}_${theme}.png`) });
      }
      await tab('general');
      await page.$eval('main', n => { n.scrollTop = n.scrollHeight; });
      await page.screenshot({ path: path.join(__dirname, `admin_guest_visit_summary_${theme}.png`) });
      await click('#visitSummaryDetails');
      await page.screenshot({ path: path.join(__dirname, `admin_guest_visit_categories_${theme}.png`) });
      await click('[data-visit-category="guest"]');
      await click('#visitOpenGuest');
      await page.screenshot({ path: path.join(__dirname, `admin_guest_visit_guest_entry_${theme}.png`) });
      await click('#visitGuestCancelEdit');
      await tab('attendee');
      await click('#visitOpenAttendee');
      await page.select('#visitStaff', 'EBB01');
      await page.screenshot({ path: path.join(__dirname, `admin_guest_visit_attendee_entry_${theme}.png`) });
      await click('#visitAttendeeCancelEdit');
      await tab('general');
      await page.focus('[data-visit-tab="general"]');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.visitTab), 'guest');
      assert.equal(await page.$eval('[aria-selected="true"]', n => n.dataset.visitTab), 'guest');
      await page.keyboard.press('End');
      assert.equal(await page.$eval('[aria-selected="true"]', n => n.dataset.visitTab), 'other');
      await tab('general');
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), click('#visitCancel')]);
      assert.ok(page.url().includes('/modules/admin/index.html'));
      assert.equal(await page.$eval('html', n => n.dataset.theme), theme);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Guest Visit Mileage-style headers, expandable guests and attendees, navigation, editing, switches, validation, attachments and draft restoration in both themes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
