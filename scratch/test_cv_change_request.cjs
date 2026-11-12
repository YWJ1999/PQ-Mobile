const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pageUrl = theme => pathToFileURL(path.join(root, 'change-request.html')).href + `?theme=${theme}`;

const rootProfile = fs.readFileSync(path.join(root, 'me.html'), 'utf8');
const moduleProfile = fs.readFileSync(path.join(root, 'modules', 'me', 'index.html'), 'utf8');

assert.ok(
  rootProfile.includes("if (featureKey === 'change')") &&
    rootProfile.includes("window.location.href = 'change-request.html'"),
  'The main Profile Change Request option opens the editable CV form'
);
assert.ok(
  moduleProfile.includes('href="../../change-request.html"') &&
    moduleProfile.includes('<div class="module-option-title">Change Request</div>'),
  'The module Profile Change Request option opens the same editable CV form'
);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 1 });
      await page.goto(pageUrl(theme), { waitUntil: 'load' });
      await page.evaluate(() => localStorage.removeItem('pq_change_request_history'));

      assert.equal(await page.title(), 'PeopleHCM - EBB12 CV Change Request');
      assert.equal(await page.$eval('.bonus-title-main', node => node.textContent.trim()), 'CV Change Request');
      assert.deepEqual(await page.evaluate(() => {
        const navigation = document.querySelector('.bonus-nav-bar').getBoundingClientRect();
        const title = document.querySelector('.bonus-title-wrap').getBoundingClientRect();
        return {
          hasOptionsButton: Boolean(document.querySelector('.bonus-nav-bar .me-options-btn')),
          titleCentered: Math.abs((title.left + title.width / 2) - (navigation.left + navigation.width / 2)) < 1
        };
      }), {
        hasOptionsButton: false,
        titleCentered: true
      }, 'CV Change Request header removes the overflow menu and keeps the title centered');
      assert.deepEqual(await page.evaluate(() => {
        const header = document.querySelector('.bonus-top-header').getBoundingClientRect();
        const categories = document.querySelector('.change-scroller-wrapper').getBoundingClientRect();
        const content = document.querySelector('.main-content').getBoundingClientRect();
        return {
          categoriesBelowHeader: categories.top >= header.bottom - 1,
          contentBelowCategories: content.top >= categories.bottom - 1,
          categoriesVisible: categories.height > 0 && getComputedStyle(document.querySelector('.change-scroller-wrapper')).visibility === 'visible'
        };
      }), {
        categoriesBelowHeader: true,
        contentBelowCategories: true,
        categoriesVisible: true
      }, 'Editable CV categories remain visible below the page header');
      assert.deepEqual(await page.evaluate(() => {
        const form = document.getElementById('cat-personal');
        const field = form.querySelector('.change-field-card');
        const formStyle = getComputedStyle(form);
        const fieldStyle = getComputedStyle(field);
        const actions = document.querySelector('.change-form-actions');
        const actionButtons = [...actions.querySelectorAll('button')].filter(button => !button.hidden);
        return {
          formRadius: parseFloat(formStyle.borderRadius),
          formHasSurface: formStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && formStyle.borderTopWidth === '1px',
          fieldIsFlat: fieldStyle.borderTopWidth === '0px' && fieldStyle.boxShadow === 'none',
          actionsInsideContent: actions.parentElement.classList.contains('main-content'),
          actionPosition: getComputedStyle(actions).position,
          actionLabels: actionButtons.map(button => button.textContent.trim().replace(/\s+/g, ' ')),
          actionRadii: actionButtons.map(button => getComputedStyle(button).borderRadius),
          actionHeights: actionButtons.map(button => button.getBoundingClientRect().height),
          hasDraftStatus: Boolean(actions.querySelector('.change-form-status')),
          nextHidden: document.getElementById('btnNextCategory')?.hidden ?? null,
          submitHidden: document.getElementById('btnReviewSubmit').hidden,
          updateDisabled: document.getElementById('btnReviewSubmit').disabled
        };
      }), {
        formRadius: 22,
        formHasSurface: true,
        fieldIsFlat: true,
        actionsInsideContent: true,
        actionPosition: 'static',
        actionLabels: ['Cancel', 'Next'],
        actionRadii: ['999px', '999px'],
        actionHeights: [44, 44],
        hasDraftStatus: false,
        nextHidden: false,
        submitHidden: true,
        updateDisabled: false
      }, 'CV editor uses the shared consistent form treatment');
      assert.deepEqual(
        await page.$$eval('.main-content > .change-form-container > :first-child .form-section-heading', nodes => nodes.map(node => node.textContent.trim())),
        ['Personal', 'Qualification', 'Payroll', 'Correspondence Contact', 'Family'],
        'CV category headings match their tab names'
      );
      assert.deepEqual(
        await page.$$eval('.change-cat-pill > span:first-child', nodes => nodes.map(node => node.textContent.trim().replace(/^[^A-Za-z]+/, ''))),
        ['Personal', 'Qualification', 'Payroll', 'Correspondence Contact', 'Family'],
        'CV tabs use the requested short category names'
      );
      assert.deepEqual(await page.evaluate(() => {
        const tabLabel = document.querySelector('#pill-contacts > span:first-child').textContent.trim().replace(/^[^A-Za-z]+/, '');
        const heading = document.querySelector('#cat-contacts .change-form-section-heading .form-section-heading').textContent.trim();
        const headingStyle = getComputedStyle(document.querySelector('#cat-contacts .change-form-section-heading .form-section-heading'));
        const sections = [...document.querySelectorAll('#cat-contacts .change-section-header')];
        return {
          tabLabel,
          heading,
          labels: sections.map(section => section.textContent.trim()),
          icons: sections.map(section => section.querySelector('i')?.className || ''),
          typographyMatchesContact: sections.every(section => {
            const style = getComputedStyle(section);
            return style.fontSize === headingStyle.fontSize &&
              style.fontWeight === headingStyle.fontWeight &&
              style.lineHeight === headingStyle.lineHeight &&
              style.letterSpacing === headingStyle.letterSpacing;
          }),
          accentsMatchContact: sections.every(section =>
            getComputedStyle(section, '::before').width ===
            getComputedStyle(document.querySelector('#cat-contacts .change-form-section-heading .form-section-heading'), '::before').width
          ),
          plainBackgrounds: (() => {
            const backgrounds = sections.map(section => getComputedStyle(section).backgroundColor);
            return backgrounds.every(background => ['transparent', 'rgba(0, 0, 0, 0)'].includes(background));
          })(),
          radii: sections.map(section => getComputedStyle(section).borderRadius),
          leftPadding: sections.map(section => getComputedStyle(section).paddingLeft)
        };
      }), {
        tabLabel: 'Correspondence Contact',
        heading: 'Correspondence Contact',
        labels: ['Emergency Contact & Address'],
        icons: [''],
        typographyMatchesContact: true,
        accentsMatchContact: true,
        plainBackgrounds: true,
        radii: ['0px'],
        leftPadding: ['0px']
      }, 'Correspondence Contact removes the duplicate address subsection heading');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('.change-expand-grid-btn');
      await page.waitForSelector('#catGridOverlay.active');
      await page.waitForFunction(() => {
        const sheet = document.querySelector('#catGridOverlay .profile-category-sheet');
        const transform = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
        return Math.abs(transform.m42) < 1;
      });
      assert.deepEqual(await page.evaluate(() => {
        const overlay = document.getElementById('catGridOverlay').getBoundingClientRect();
        const sheet = document.querySelector('#catGridOverlay .profile-category-sheet');
        const sheetBounds = sheet.getBoundingClientRect();
        const cards = [...sheet.querySelectorAll('.profile-category-card')];
        return {
          title: sheet.querySelector('.profile-category-title').textContent.trim(),
          subtitlePresent: Boolean(sheet.querySelector('.sheet-title p')),
          labels: cards.map(card => card.querySelector('.profile-category-name').textContent.trim()),
          countItems: sheet.querySelectorAll('.profile-category-count').length,
          icons: cards.map(card => card.querySelector('.profile-category-icon i').className),
          consistentPurpleIcons: (() => {
            const colors = [...new Set(cards.map(card => getComputedStyle(card.querySelector('.profile-category-icon')).color))];
            const channels = colors[0]?.match(/\d+/g)?.map(Number) || [];
            return colors.length === 1 && channels.length >= 3 && channels[2] > channels[0] && channels[0] > channels[1];
          })(),
          columns: getComputedStyle(sheet.querySelector('.profile-category-grid')).gridTemplateColumns.split(' ').length,
          familySpan: getComputedStyle(cards[4]).gridColumnEnd,
          compactHeight: sheetBounds.height / overlay.height > 0.25 && sheetBounds.height / overlay.height < 0.55,
          bottomAligned: Math.abs(sheetBounds.bottom - overlay.bottom) < 2,
          sheetRadius: getComputedStyle(sheet).borderTopLeftRadius
        };
      }), {
        title: 'Select Category',
        subtitlePresent: false,
        labels: ['Personal Details', 'Qualification', 'Payroll & Statutory', 'Correspondence Contact', 'Family Details'],
        countItems: 0,
        icons: ['fa-solid fa-user', 'fa-solid fa-graduation-cap', 'fa-solid fa-credit-card', 'fa-solid fa-location-dot', 'fa-solid fa-people-roof'],
        consistentPurpleIcons: true,
        columns: 2,
        familySpan: '3',
        compactHeight: true,
        bottomAligned: true,
        sheetRadius: '28px'
      }, 'View-all icon opens a compact bottom category picker');
      await page.click('[data-profile-category="contacts"]');
      assert.equal(await page.$eval('.change-cat-pill.active', pill => pill.id), 'pill-contacts');
      await page.click('#pill-personal');
      assert.deepEqual(await page.evaluate(() => {
        const section = document.getElementById('cat-personal');
        const heading = section.querySelector(':scope > :first-child .form-section-heading');
        const label = section.querySelector('.change-field-label');
        const input = section.querySelector('.change-input-box');
        return {
          headerText: section.firstElementChild.textContent.replace(/\s+/g, ' ').trim(),
          headingSize: getComputedStyle(heading).fontSize,
          labelSize: getComputedStyle(label).fontSize,
          inputSize: getComputedStyle(input).fontSize,
          hasHeaderCount: Boolean(section.firstElementChild.querySelector('.change-cat-count'))
        };
      }), {
        headerText: 'Personal',
        headingSize: '20px',
        labelSize: '13px',
        inputSize: '13.5px',
        hasHeaderCount: false
      }, 'CV form typography matches the Leave Details form reference');
      assert.deepEqual(
        await page.$$eval('.change-cat-count', nodes => nodes.slice(0, 5).map(node => node.textContent.trim())),
        ['10', '3', '12', '16', '2'],
        'CV editor category counts match the pending approval profile'
      );
      assert.equal(await page.$$eval('#catGridOverlay .profile-category-count', nodes => nodes.length), 0, 'Category picker stays concise');
      assert.equal(await page.$eval('#historyOverlay .sheet-title h3', node => node.textContent.trim()), 'CV Change Request History');

      assert.deepEqual(await page.evaluate(() => {
        const value = id => document.querySelector(`[data-field-id="${id}"]`)?.value;
        return {
          name: value('name'), birthdate: value('birthdate'), age: value('age'), email: value('email'),
          marital: value('marital'), marriageDate: value('marriagedate'), passport: value('passport'),
          passportExpiry: value('passportexpiry'), license: value('license'), licenseExpiry: value('licenseexpiry'),
          hasNric: Boolean(document.querySelector('[data-field-id="nric"]')),
          hasKeyLevel: Boolean(document.querySelector('[data-field-id="keylevel"]'))
        };
      }), {
        name: 'Farhan', birthdate: '22 Apr 1960', age: '0', email: 'ebb12@gmail.com',
        marital: 'Married', marriageDate: '18 Jul 1984', passport: 'A212222048',
        passportExpiry: '25 Mar 2015', license: 'AX000234496', licenseExpiry: '12 Aug 2021',
        hasNric: false, hasKeyLevel: false
      });

      for (const category of ['qualification', 'payroll', 'contacts', 'family']) {
        await page.click('#btnNextCategory');
        assert.equal(await page.$eval('.change-cat-pill.active', pill => pill.id), 'pill-' + category);
      }
      assert.deepEqual(
        await page.$$eval('.change-form-actions button', buttons => buttons.filter(button => !button.hidden).map(button => button.textContent.trim())),
        ['Cancel', 'Submit']
      );
      assert.equal(await page.$eval('#btnReviewSubmit', button => button.disabled), false);
      await page.click('#pill-personal');

      await page.click('#pill-qualification');
      assert.deepEqual(await page.evaluate(() => {
        const header = document.querySelector('#cat-qualification .qualification-manager-header');
        const addButton = document.getElementById('addQualificationButton');
        return {
          title: header.querySelector('.form-section-heading').textContent.trim(),
          count: document.getElementById('qualificationRecordCount').textContent.trim(),
          addIcon: addButton.querySelector('i').className,
          addSize: [addButton.getBoundingClientRect().width, addButton.getBoundingClientRect().height],
          headerHasDivider: getComputedStyle(header).borderBottomWidth
        };
      }), {
        title: 'Qualification',
        count: '3 Records',
        addIcon: 'fa-solid fa-plus',
        addSize: [40, 40],
        headerHasDivider: '1px'
      }, 'Qualification uses the OT Claim list header pattern');
      assert.equal(await page.$$eval('[data-qualification-index]', nodes => nodes.length), 3);
      assert.deepEqual(await page.$$eval('[data-qualification-index]', nodes => nodes.map(node => ({
        qualification: node.querySelector('[data-qualification-name]').textContent.trim(),
        description: node.querySelector('[data-qualification-description]').textContent.trim(),
        context: node.querySelector('[data-qualification-context]').textContent.trim(),
        years: node.querySelector('[data-qualification-years]').textContent.trim(),
        cgpa: node.querySelector('[data-qualification-cgpa]').textContent.trim(),
        highest: Boolean(node.querySelector('[data-qualification-highest]'))
      }))), [{
        qualification: "Bachelor's Degree", description: 'Bachelor of Business Administration',
        context: 'Human Resource Management • Universiti Malaya', years: '2003 - 2006', cgpa: '3.62', highest: true
      }, {
        qualification: 'Diploma', description: 'Diploma in Business Studies',
        context: 'Business Administration • Kolej Universiti Contoh', years: '2001 - 2003', cgpa: '3.45', highest: false
      }, {
        qualification: 'Professional Certificate', description: 'Certified Human Resources Professional',
        context: 'Human Resource Management • Malaysian Institute of Human Resource Management',
        years: '2024 - 2024', cgpa: '-', highest: false
      }]);

      await page.$eval('[data-qualification-index="1"] [data-edit-qualification]', button => button.click());
      assert.deepEqual(await page.evaluate(() => ({
        qualification: document.getElementById('input_qual_level').value,
        description: document.getElementById('input_qual_desc').value,
        major: document.getElementById('input_qual_major').value,
        institute: document.getElementById('input_qual_institute').value,
        cgpa: document.getElementById('input_qual_cgpa').value,
        certificate: document.getElementById('input_qual_cert').value,
        yearFrom: document.getElementById('input_qual_yearfrom').value,
        yearTo: document.getElementById('input_qual_yearto').value,
        highest: document.getElementById('qual_highest').checked,
        notes: document.getElementById('input_qual_notes').value
      })), {
        qualification: 'Diploma', description: 'Diploma in Business Studies', major: 'Business Administration',
        institute: 'Kolej Universiti Contoh', cgpa: '3.45', certificate: 'DEMO-QUAL-002',
        yearFrom: '2001', yearTo: '2003', highest: false, notes: 'Completed before the degree programme.'
      });
      await page.evaluate(() => toggleQualificationForm(false));

      await page.click('#pill-payroll');
      assert.deepEqual(await page.evaluate(() => {
        const value = id => document.querySelector(`[data-field-id="${id}"]`)?.value;
        return {
          epf: value('epf'), socso: value('socso'), tax: value('tax'), bank: value('bank'), account: value('account'),
          handicap: document.getElementById('handicap').checked,
          spouseHandicap: document.getElementById('spouse_handicap').checked,
          spouseWorking: document.getElementById('spouse_working').checked
        };
      }), {
        epf: '636363636', socso: '733773373', tax: '377337373', bank: 'CIMB', account: '10447856855254',
        handicap: false, spouseHandicap: true, spouseWorking: false
      });

      await page.click('#pill-contacts');
      assert.equal(await page.$$eval('#cat-contacts [data-field-id]', nodes => nodes.length), 16);
      assert.deepEqual(await page.evaluate(() => {
        const value = id => document.querySelector(`[data-field-id="${id}"]`)?.value;
        return {
          companyEmail: value('company_email'), phone: value('phone'), mobile: value('mobile'),
          address: value('address'), postalCode: value('postcode'), city: value('city'), state: value('state'), country: value('country'),
          emergencyPhone: value('em_phone'), contactName: value('em_name'), contactAddress: value('em_address'),
          contactPostalCode: value('em_postcode'), contactCity: value('em_city'), contactState: value('em_state'),
          contactCountry: value('em_country'), remarks: value('em_remarks')
        };
      }), {
        companyEmail: 'yewweijiang123@gmail.com', phone: '0123456789', mobile: '0123456789',
        address: '10, JALAN UPTOWN 2\n#05-33 JALAN 2228\nDAMANSARA KOTA', postalCode: '40862', city: 'Damansara',
        state: 'SELANGOR', country: 'MALAYSIA', emergencyPhone: '04-6677778', contactName: 'RAZALI',
        contactAddress: 'AS CORRESPONDENCE ADDRESS', contactPostalCode: '01920', contactCity: 'Puchong',
        contactState: '', contactCountry: 'MALAYSIA', remarks: 'FATHER'
      });
      assert.deepEqual(await page.$$eval('#cat-contacts [data-field-id^="em_"]', fields => fields.map(field => field.dataset.fieldId)), [
        'em_phone', 'em_name', 'em_address', 'em_postcode', 'em_city', 'em_state', 'em_country', 'em_remarks'
      ], 'Emergency contact fields follow the requested order with Remarks last');
      assert.deepEqual(await page.$$eval('#cat-contacts [data-field-id^="em_"]', fields => fields.map(field => field.closest('.change-field-card').querySelector('.change-field-label').textContent.trim())), [
        'Emergency Contact #', 'Contact Name', 'Contact Address', 'Postal Code', 'City', 'State', 'Country', 'Remarks'
      ], 'Emergency contact labels stay concise inside their scoped section');

      await page.click('#pill-family');
      assert.deepEqual(
        await page.$$eval('[data-family-name]', nodes => nodes.map(node => [node.dataset.familyName, node.dataset.familyRelation])),
        [['ABU KARUDDIN BIN MAHMUD', 'HUSBAND'], ['a', 'DAUGHTER']]
      );

      await page.click('#pill-contacts');
      await page.$eval('[data-field-id="mobile"]', input => {
        input.value = '0198765432';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.$eval('#btnReviewSubmit', button => button.disabled), false);
      assert.equal(await page.$eval('#btnReviewSubmit', button => button.hidden), true);
      await page.click('#btnNextCategory');
      assert.equal(await page.$eval('.change-cat-pill.active', pill => pill.id), 'pill-family');
      assert.equal(await page.$eval('#btnReviewSubmit', button => button.hidden), false);
      await page.click('#btnReviewSubmit');
      assert.equal(await page.$eval('#btnConfirmSubmit', button => getComputedStyle(button).backgroundImage !== 'none'), true);
      assert.match(await page.$eval('#diffSummaryList', node => node.textContent.replace(/\s+/g, ' ').trim()), /Mobile #.*0123456789.*0198765432/);
      await page.waitForFunction(() => {
        const sheet = document.querySelector('#reviewOverlay .indicators-sheet');
        const transform = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
        return Math.abs(transform.m42) < 1;
      });
      await page.click('#btnConfirmSubmit');
      assert.deepEqual(await page.evaluate(() => {
        const request = JSON.parse(localStorage.getItem('pq_change_request_history'))[0];
        return { status: request.status, changes: request.changes };
      }), {
        status: 'Pending HR Approval',
        changes: [{ fieldId: 'mobile', section: 'contacts', label: 'Mobile #', oldVal: '0123456789', newVal: '0198765432' }]
      });

      assert.ok(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), `${theme} CV Change Request fits a 390px viewport`);
    }

    assert.deepEqual(errors, [], `CV Change Request should have no JavaScript errors: ${errors.join('; ')}`);
    console.log('PASS: CV Change Request mirrors pending approval data and submits user edits.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
