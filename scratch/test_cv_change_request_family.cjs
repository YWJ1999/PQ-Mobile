const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pageUrl = pathToFileURL(path.join(root, 'change-request.html')).href + '?theme=light';

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
    await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 1 });
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.click('#pill-family');

    assert.deepEqual(await page.evaluate(() => {
      const header = document.querySelector('#cat-family .family-manager-header');
      const addButton = document.getElementById('addFamilyButton');
      return {
        title: header.querySelector('.form-section-heading').textContent.trim(),
        count: document.getElementById('familyRecordCount').textContent.trim(),
        addIcon: addButton.querySelector('i').className,
        addSize: [addButton.getBoundingClientRect().width, addButton.getBoundingClientRect().height],
        headerHasDivider: getComputedStyle(header).borderBottomWidth
      };
    }), {
      title: 'Family',
      count: '2 members',
      addIcon: 'fa-solid fa-plus',
      addSize: [40, 40],
      headerHasDivider: '1px'
    }, 'Family uses the OT Claim manager header');

    await page.click('[data-family-index="0"] [data-expand-family]');
    assert.deepEqual(await page.$eval('[data-family-index="0"]', card => {
      const details = card.querySelector('.family-record-details');
      return {
        expanded: details.hidden === false,
        surfaceMatchesCard: getComputedStyle(details).backgroundColor === getComputedStyle(card).backgroundColor,
        dividerStyle: getComputedStyle(details).borderTopStyle,
        details: [...card.querySelectorAll('.family-detail-row')].map(row => [
          row.querySelector('.family-detail-label').textContent.trim(),
          row.querySelector('.family-detail-value').textContent.trim()
        ])
      };
    }), {
      expanded: true,
      surfaceMatchesCard: true,
      dividerStyle: 'dashed',
      details: [
        ['Relationship', 'HUSBAND'],
        ['Birth Date', '18/07/1984'],
        ['Rank', '- Select Rank-'],
        ['New NRIC #', '880412-14-5589'],
        ['Birth Cert #', '-'],
        ['Member Employee #', '-'],
        ['Tax Status', 'Non-Deductible'],
        ['Allocation', '50.00%'],
        ['Beneficiary', 'Yes']
      ]
    }, 'Family cards expand to show the complete record');

    await page.click('#addFamilyButton');
    assert.deepEqual(await page.evaluate(() => {
      const phone = document.querySelector('.change-request-page');
      const editor = document.getElementById('familySheetOverlay');
      const sheet = editor.querySelector('.indicators-sheet');
      const firstField = editor.querySelector('.change-field-card');
      return {
        editorMode: phone.classList.contains('family-editor-open'),
        headerTitle: document.getElementById('changeRequestHeaderTitle').textContent.trim(),
        tabsHidden: getComputedStyle(document.querySelector('.change-scroller-wrapper')).display === 'none',
        listHidden: getComputedStyle(document.querySelector('.main-content')).display === 'none',
        editorDisplay: getComputedStyle(editor).display,
        editorPosition: getComputedStyle(editor).position,
        sheetTransform: getComputedStyle(sheet).transform,
        sheetRadius: getComputedStyle(sheet).borderRadius,
        handleHidden: getComputedStyle(editor.querySelector('.sheet-handle')).display === 'none',
        closeHidden: getComputedStyle(editor.querySelector('.sheet-close-btn')).display === 'none',
        fieldFlat: getComputedStyle(firstField).borderTopWidth === '0px' && getComputedStyle(firstField).boxShadow === 'none'
      };
    }), {
      editorMode: true,
      headerTitle: 'Add Family Member',
      tabsHidden: true,
      listHidden: true,
      editorDisplay: 'flex',
      editorPosition: 'relative',
      sheetTransform: 'none',
      sheetRadius: '22px',
      handleHidden: true,
      closeHidden: true,
      fieldFlat: true
    }, 'Add Family Member opens as a dedicated OT Claim-style page');

    await page.click('.bonus-back-btn');
    assert.deepEqual(await page.evaluate(() => ({
      editorMode: document.querySelector('.change-request-page').classList.contains('family-editor-open'),
      headerTitle: document.getElementById('changeRequestHeaderTitle').textContent.trim(),
      activeTab: document.querySelector('.change-cat-pill.active').id
    })), {
      editorMode: false,
      headerTitle: 'CV Change Request',
      activeTab: 'pill-family'
    }, 'Header back returns from the editor to the Family list');

    await page.click('[data-family-index="1"] [data-edit-family]');
    assert.equal(await page.$eval('#changeRequestHeaderTitle', node => node.textContent.trim()), 'Edit Family Member');
    assert.deepEqual(await page.$$eval('#familySheetOverlay .change-field-label', labels => labels.map(label => label.textContent.trim()).slice(0, 8)), [
      'Name', 'Relation', 'Status', 'Birth Date', 'Rank', 'New NRIC #', 'Birth Cert #', 'Member Employee #'
    ], 'Family editor uses Name and separates NRIC from Birth Cert');
    assert.deepEqual(await page.evaluate(() => ({
      name: document.getElementById('input_fam_name').value,
      relation: document.getElementById('input_fam_relation').value,
      status: document.getElementById('input_fam_status').value,
      nric: document.getElementById('input_fam_nric').value,
      birthCert: document.getElementById('input_fam_birthcert').value,
      memberEmployeeNo: document.getElementById('input_fam_employee_no').value,
      beneficiary: document.getElementById('fam_beneficiary').checked
    })), { name: 'a', relation: 'DAUGHTER', status: 'Single', nric: '', birthCert: '', memberEmployeeNo: '', beneficiary: false });
    assert.deepEqual(await page.$$eval('.family-editor-actions button', buttons => buttons.map(button => ({
      label: button.textContent.trim(),
      height: button.getBoundingClientRect().height,
      radius: getComputedStyle(button).borderRadius
    }))), [
      { label: 'Cancel', height: 44, radius: '999px' },
      { label: 'Save Item', height: 44, radius: '999px' }
    ], 'Family editor actions match the other forms');
    assert.deepEqual(await page.evaluate(() => {
      const section = document.querySelector('.family-attachment-section');
      const actions = [...section.querySelectorAll('.family-upload-action')];
      return {
        title: section.querySelector('.family-attachment-title').textContent.trim(),
        labels: actions.map(action => action.querySelector('.family-upload-label').textContent.trim()),
        icons: actions.map(action => action.querySelector('i').className),
        iconSizes: actions.map(action => {
          const icon = action.querySelector('.family-upload-icon');
          return [icon.getBoundingClientRect().width, icon.getBoundingClientRect().height, getComputedStyle(icon).borderRadius];
        }),
        inputsHidden: ['familyFiles', 'familyCamera'].every(id => document.getElementById(id).hidden)
      };
    }), {
      title: 'Upload Attachment',
      labels: ['Select File(s)', 'Take a Picture'],
      icons: ['fa-solid fa-file-arrow-up', 'fa-solid fa-camera'],
      iconSizes: [[54, 54, '50%'], [54, 54, '50%']],
      inputsHidden: true
    }, 'Family attachments use the OT Claim upload treatment');
    await page.$eval('#familyFiles', input => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['proof'], 'family-proof.pdf', { type: 'application/pdf' }));
      Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.$eval('#familyAttachments .form-attachment-file-name', node => node.textContent.trim()), 'family-proof.pdf');
    await page.$eval('#input_fam_name', input => { input.value = 'AISYAH'; });
    await page.$eval('#input_fam_employee_no', input => { input.value = 'EBB77'; });
    await page.click('#saveFamilyButton');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('familySheetOverlay')).display === 'none');
    assert.equal(await page.$eval('[data-family-index="1"] [data-family-record-name]', node => node.textContent.trim()), 'AISYAH');
    assert.equal(await page.$eval('[data-family-index="1"] [data-family-employee-id]', node => node.textContent.trim()), '#EBB77');
    await page.click('[data-family-index="1"] [data-edit-family]');
    assert.equal(await page.$eval('#familyAttachments .form-attachment-file-name', node => node.textContent.trim()), 'family-proof.pdf');
    await page.click('.family-editor-cancel');

    await page.click('#addFamilyButton');
    await page.$eval('#input_fam_name', input => { input.value = 'AMIR'; });
    await page.select('#input_fam_relation', 'SON');
    await page.select('#input_fam_status', 'Single');
    await page.click('#saveFamilyButton');
    assert.equal(await page.$eval('#familyRecordCount', node => node.textContent.trim()), '3 members');
    assert.equal(await page.$$eval('[data-family-index]', nodes => nodes.length), 3);
    assert.equal(await page.$eval('[data-family-index="2"] [data-family-record-name]', node => node.textContent.trim()), 'AMIR');

    await page.click('[data-family-index="2"] [data-delete-family]');
    assert.equal(await page.$eval('#familyRecordCount', node => node.textContent.trim()), '2 members');
    assert.equal(await page.$$eval('[data-family-index]', nodes => nodes.length), 2);
    assert.equal(await page.$eval('#btnReviewSubmit', button => button.disabled), false);
    assert.ok(await page.$eval('#cat-family', section => section.scrollWidth <= section.clientWidth + 1), 'Family cards fit the mobile viewport');
    assert.deepEqual(errors, [], 'Family flow should have no JavaScript errors: ' + errors.join('; '));
    console.log('PASS: Family follows the OT Claim add, expand, edit, and delete flow.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
