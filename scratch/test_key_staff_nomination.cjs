const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/key-staff-nomination.html')).href;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.ok(await page.$('#keyStaffNominationForm'), 'Key Staff Nomination must be an input form');
      await page.evaluate(() => localStorage.removeItem('peoplehcm:key-staff-nomination:draft:v1'));
      await page.reload({ waitUntil: 'networkidle0' });
      assert.equal(await page.$('.employee-career-coming-card'), null);
      assert.deepEqual(await page.$$eval('#keyStaffNominationForm label', nodes => nodes.map(n => n.textContent.replace('*', '').trim())),
        ['Employee No.', 'Name', 'Position', 'Nomination Date', 'Talent Pool', 'Key Staff Level', 'Justification', 'Remarks']);
      assert.deepEqual(await page.$$eval('#keyStaffNominationForm [required]', nodes => nodes.map(n => n.id)),
        ['nominationEmployee', 'nominationDate', 'nominationTalentPool', 'nominationKeyLevel', 'nominationJustification', 'nominationRemarks']);
      assert.equal(await page.$eval('#nominationName', n => n.readOnly), true);
      assert.equal(await page.$eval('#nominationPosition', n => n.readOnly), true);
      assert.match(await page.$eval('#nominationDate', n => n.value), /^\d{4}-\d{2}-\d{2}$/);
      await page.click('#nominationSubmit');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'nominationEmployee');
      await page.select('#nominationEmployee', 'EBB02');
      assert.equal(await page.$eval('#nominationName', n => n.value), 'Daniel Wong');
      assert.equal(await page.$eval('#nominationPosition', n => n.value), 'Product Designer');
      assert.equal(await page.$eval('#nominationEmployeeId', n => n.textContent), 'EBB02');
      await page.select('#nominationEmployee', '');
      assert.equal(await page.$eval('#nominationName', n => n.value), '');
      assert.equal(await page.$eval('#nominationPosition', n => n.value), '');
      await page.select('#nominationEmployee', 'EBB01');
      await page.select('#nominationTalentPool', 'leadership');
      await page.select('#nominationKeyLevel', '3');
      await page.type('#nominationJustification', 'Consistently leads the team and shares knowledge.');
      await page.type('#nominationRemarks', 'Recommend for the next review.');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1));
        assert.ok(await page.$$eval('.form-section-heading', nodes => nodes.length === 3 && nodes.every(n => {
          const accent = getComputedStyle(n, '::before');
          return accent.width === '3.5px' && accent.height === '15px' && accent.backgroundColor === 'rgb(168, 85, 247)';
        })));
        assert.ok(await page.$eval('#nominationEmployeeId', n => n.getBoundingClientRect().top >= document.getElementById('nominationName').getBoundingClientRect().bottom));
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.$eval('main', n => { n.scrollTop = 0; });
      await page.screenshot({ path: path.join(__dirname, `key_staff_nomination_${theme}_top.png`) });
      await page.click('#nominationSaveDraft');
      await page.reload({ waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('#nominationEmployee', n => n.value), 'EBB01');
      assert.equal(await page.$eval('#nominationName', n => n.value), 'Aina Rahman');
      assert.equal(await page.$eval('#nominationTalentPool', n => n.value), 'leadership');
      assert.equal(await page.$eval('#nominationKeyLevel', n => n.value), '3');
      assert.equal(await page.$eval('#nominationRemarks', n => n.value), 'Recommend for the next review.');
      const files = await page.$('#nominationFiles');
      await files.uploadFile(path.resolve(__dirname, '../package.json'));
      assert.equal(await page.$eval('#nominationAttachments .form-attachment-file-name', n => n.textContent), 'package.json');
      assert.equal(await page.$eval('#nominationCamera', n => n.getAttribute('capture')), 'environment');
      await page.click('#nominationSaveDraft');
      await page.reload({ waitUntil: 'networkidle0' });
      assert.match(await page.$eval('#nominationDraftStatus', n => n.textContent), /reattach/i);
      await page.$eval('#nominationRemarks', n => { n.value = 'Updated review notes'; });
      await page.click('#nominationSaveDraft');
      await page.reload({ waitUntil: 'networkidle0' });
      assert.match(await page.$eval('#nominationDraftStatus', n => n.textContent), /reattach/i,
        'Saving edited draft text must preserve the reminder for files that still need reattaching');
      await (await page.$('#nominationFiles')).uploadFile(path.resolve(__dirname, '../package.json'));
      await page.click('#nominationAttachments .form-attachment-remove');
      assert.equal(await page.$$eval('#nominationAttachments .form-attachment-item', nodes => nodes.length), 0);
      await page.click('#nominationSaveDraft');
      await page.reload({ waitUntil: 'networkidle0' });
      assert.doesNotMatch(await page.$eval('#nominationDraftStatus', n => n.textContent), /reattach/i,
        'Removing a reattached file must clear its saved reference');
      await page.$eval('#nominationJustification', n => { n.value = '   '; });
      await page.click('#nominationSubmit');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'nominationJustification');
      await page.$eval('#nominationJustification', n => { n.value = 'Strong performance'; n.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.click('#nominationSubmit');
      assert.match(await page.$eval('#employeeCareerToast', n => n.textContent), /ready for submission/i);
      await page.$eval('main', n => { n.scrollTop = n.scrollHeight; });
      await page.screenshot({ path: path.join(__dirname, `key_staff_nomination_${theme}_bottom.png`) });
      assert.equal(await page.$eval('[data-option-back]', n => new URL(n.href).searchParams.get('theme')), theme);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Key Staff Nomination fields, employee autofill, six required fields and whitespace validation, draft restoration, attachments/removal, purple headings, both themes and three widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
