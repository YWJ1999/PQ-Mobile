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
    await page.click('#pill-qualification');

    await page.click('#addQualificationButton');
    assert.deepEqual(await page.evaluate(() => {
      const phone = document.querySelector('.change-request-page');
      const editor = document.getElementById('qualSheetOverlay');
      const sheet = editor.querySelector('.indicators-sheet');
      const firstField = editor.querySelector('.change-field-card');
      return {
        editorMode: phone.classList.contains('qualification-editor-open'),
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
      headerTitle: 'Add Qualification',
      tabsHidden: true,
      listHidden: true,
      editorDisplay: 'flex',
      editorPosition: 'relative',
      sheetTransform: 'none',
      sheetRadius: '22px',
      handleHidden: true,
      closeHidden: true,
      fieldFlat: true
    }, 'Add Qualification opens as a dedicated OT Claim-style page');
    await page.click('.bonus-back-btn');
    assert.deepEqual(await page.evaluate(() => ({
      editorMode: document.querySelector('.change-request-page').classList.contains('qualification-editor-open'),
      headerTitle: document.getElementById('changeRequestHeaderTitle').textContent.trim(),
      activeTab: document.querySelector('.change-cat-pill.active').id
    })), {
      editorMode: false,
      headerTitle: 'CV Change Request',
      activeTab: 'pill-qualification'
    }, 'Header back returns from the editor to the Qualification list');

    await page.click('[data-qualification-index="0"] [data-expand-qualification]');
    assert.deepEqual(await page.$eval('[data-qualification-index="0"]', card => {
      const details = card.querySelector('.qualification-record-details');
      return {
      expanded: details.hidden === false,
      surfaceMatchesCard: getComputedStyle(details).backgroundColor === getComputedStyle(card).backgroundColor,
      dividerStyle: getComputedStyle(details).borderTopStyle,
      details: [...card.querySelectorAll('.qualification-detail-row')].map(row => [
        row.querySelector('.qualification-detail-label').textContent.trim(),
        row.querySelector('.qualification-detail-value').textContent.trim()
      ])
    }}), {
      expanded: true,
      surfaceMatchesCard: true,
      dividerStyle: 'dashed',
      details: [
        ['Description', 'Bachelor of Business Administration'],
        ['Major', 'Human Resource Management'],
        ['Institute', 'Universiti Malaya'],
        ['Certificate #', 'DEMO-QUAL-001'],
        ['Notes', 'Graduated with honours.'],
        ['Highest', 'Yes']
      ]
    }, 'Qualification cards expand to show the complete record');

    await page.click('[data-qualification-index="1"] [data-edit-qualification]');
    assert.equal(await page.$eval('#changeRequestHeaderTitle', node => node.textContent.trim()), 'Edit Qualification');
    assert.deepEqual(await page.$$eval('#qualSheetOverlay .change-field-label', labels => labels.map(label => label.textContent.trim()).slice(0, 5)), [
      'Qualification', 'Description', 'Major', 'Institute', 'CGPA'
    ], 'Qualification editor uses the requested field names without Other Institute Name');
    assert.equal(await page.$('#input_qual_other_institute'), null);
    assert.deepEqual(await page.$$eval('.qualification-editor-actions button', buttons => buttons.map(button => ({
      label: button.textContent.trim(),
      height: button.getBoundingClientRect().height,
      radius: getComputedStyle(button).borderRadius
    }))), [
      { label: 'Cancel', height: 44, radius: '999px' },
      { label: 'Save Item', height: 44, radius: '999px' }
    ], 'Qualification editor actions use the same pill button treatment');
    assert.deepEqual(await page.evaluate(() => {
      const section = document.querySelector('.qualification-attachment-section');
      const actions = [...section.querySelectorAll('.change-editor-upload-action')];
      return {
        title: section.querySelector('.change-editor-attachment-title').textContent.trim(),
        labels: actions.map(action => action.querySelector('.change-editor-upload-label').textContent.trim()),
        icons: actions.map(action => action.querySelector('i').className),
        iconSizes: actions.map(action => {
          const icon = action.querySelector('.change-editor-upload-icon');
          return [icon.getBoundingClientRect().width, icon.getBoundingClientRect().height, getComputedStyle(icon).borderRadius];
        }),
        inputsHidden: ['qualificationFiles', 'qualificationCamera'].every(id => document.getElementById(id).hidden)
      };
    }), {
      title: 'Upload Attachment',
      labels: ['Select File(s)', 'Take a Picture'],
      icons: ['fa-solid fa-file-arrow-up', 'fa-solid fa-camera'],
      iconSizes: [[54, 54, '50%'], [54, 54, '50%']],
      inputsHidden: true
    }, 'Qualification attachments match the Family and OT Claim treatment');
    await page.$eval('#qualificationFiles', input => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['certificate'], 'diploma-certificate.pdf', { type: 'application/pdf' }));
      Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.$eval('#qualificationAttachments .form-attachment-file-name', node => node.textContent.trim()), 'diploma-certificate.pdf');
    await page.$eval('#input_qual_desc', input => { input.value = 'Advanced Diploma in Business Studies'; });
    await page.click('#saveQualificationButton');
    assert.equal(await page.$eval('[data-qualification-index="1"] [data-qualification-description]', node => node.textContent.trim()), 'Advanced Diploma in Business Studies');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('qualSheetOverlay')).display === 'none');
    assert.equal(await page.$eval('#qualSheetOverlay', node => getComputedStyle(node).display), 'none');
    await page.click('[data-qualification-index="1"] [data-edit-qualification]');
    assert.equal(await page.$eval('#qualificationAttachments .form-attachment-file-name', node => node.textContent.trim()), 'diploma-certificate.pdf');
    await page.click('.qualification-editor-cancel');

    await page.click('#addQualificationButton');
    await page.$eval('#input_qual_level', input => { input.value = 'Postgraduate Certificate'; });
    await page.$eval('#input_qual_desc', input => { input.value = 'People Analytics'; });
    await page.$eval('#input_qual_major', input => { input.value = 'Workforce Analytics'; });
    await page.$eval('#input_qual_institute', input => { input.value = 'Asia School of Business'; });
    await page.$eval('#input_qual_yearfrom', input => { input.value = '2025'; });
    await page.$eval('#input_qual_yearto', input => { input.value = '2025'; });
    await page.click('#saveQualificationButton');
    assert.equal(await page.$eval('#qualificationRecordCount', node => node.textContent.trim()), '4 Records');
    assert.equal(await page.$$eval('[data-qualification-index]', nodes => nodes.length), 4);
    assert.equal(await page.$eval('[data-qualification-index="3"] [data-qualification-name]', node => node.textContent.trim()), 'Postgraduate Certificate');

    await page.click('[data-qualification-index="3"] [data-delete-qualification]');
    assert.equal(await page.$eval('#qualificationRecordCount', node => node.textContent.trim()), '3 Records');
    assert.equal(await page.$$eval('[data-qualification-index]', nodes => nodes.length), 3);
    assert.equal(await page.$eval('#btnReviewSubmit', button => button.disabled), false);
    assert.ok(await page.$eval('#cat-qualification', section => section.scrollWidth <= section.clientWidth + 1), 'Qualification cards fit the mobile viewport');
    assert.deepEqual(errors, [], 'Qualification flow should have no JavaScript errors: ' + errors.join('; '));
    console.log('PASS: Qualification follows the OT Claim add, expand, edit, and delete flow.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
