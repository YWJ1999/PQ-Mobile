const assert = require('node:assert/strict');
const fs = require('node:fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 980, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file:///C:/Users/loong/PQ-Mobile/me.html?theme=light', { waitUntil: 'load' });
    const requiredFields = {
      'bento-work': ['Company', 'Branch', 'Department', 'Position', 'Years in position', 'Grade', 'Benefit scheme', 'Hire date', 'Years of service', 'Confirm date', 'Resign date', 'Reason', 'Shift group', 'Supervisor', 'Reporting to', 'Contract #', 'Contract start', 'Contract expiry', 'Work permit #', 'Work permit start', 'Work permit expiry'],
      'bento-personal': ['Name', 'NRIC #', 'Birth date', 'Age', 'Personal email', 'Gender', 'Marital status', 'Marriage date', 'Passport #', 'Passport expiry', 'Driving license', 'Driving license expiry', 'Key level'],
      'bento-family': ['ABU KARUDDIN', 'Husband', '17 Aug 1950', 'Daughter', '1 Apr 2022'],
      'bento-contact': ['Company email', 'Phone #', 'Mobile #', 'Correspondence address', 'Postal code', 'City', 'State', 'Country', 'Emergency contact #', 'Contact name', 'Contact address', 'Remarks', '40862', '01920', 'Puchong'],
      'bento-education': ['Qualification', 'Description', 'Major', 'Institute', 'Other institute name', 'CGPA', 'Certificate #', 'Year from', 'Year to', 'Highest', 'Notes'],
      'bento-finance': ['EPF #', 'Socso #', 'Tax #', 'Tabung Haji #', 'ASB #', 'Spouse EPF #', 'Spouse Tax #', 'Bank', 'Account #', 'Handicap?', 'Spouse handicap?', 'Spouse working?']
    };
    for (const [id, fields] of Object.entries(requiredFields)) {
      const text = (await page.$eval('#' + id, node => node.innerText)).toLowerCase();
      for (const field of fields) assert.ok(text.includes(field.toLowerCase()), `${id} must retain the reference field/value: ${field}`);
    }
    assert.equal(await page.$eval('.me-profile-header .me-emp-fullname', node => node.textContent), 'Sarah Jenkins');
    assert.equal(await page.$eval('.me-profile-header .me-emp-code', node => node.textContent), 'EBB01');
    assert.equal(await page.$$eval('#bento-career .profile-history-record', nodes => nodes.length), 5);
    assert.equal(await page.$$eval('#bento-performance .profile-history-record', nodes => nodes.length), 6);
    const performance = await page.$$eval('#bento-performance .profile-history-record', nodes => nodes.map(node => node.innerText));
    assert.equal(performance.filter(text => text.includes('FY 2026A')).length, 5);
    assert.equal(performance.filter(text => text.includes('37')).length, 2, 'Both score 37 records remain');
    assert.equal(await page.$$eval('#bento-competency .profile-history-record', nodes => nodes.length), 6);
    assert.equal(await page.$$eval('#dossierTrainingList .profile-history-record', nodes => nodes.length), 33);
    assert.equal(await page.$$eval('#bento-assets .profile-history-record', nodes => nodes.length), 4);
    assert.equal(await page.$$eval('#dossierLettersList .profile-history-record', nodes => nodes.length), 31);
    assert.match(await page.$eval('.profile-verification', node => node.innerText), /29 Jan 2024/);
    const training = await page.$$eval('#dossierTrainingList .profile-history-record', nodes => nodes.map(node => node.innerText));
    assert.equal(training.filter(text => text.includes('1 Aug 2019') && text.includes('3.00')).length, 1);
    assert.equal(training.filter(text => text.includes('1 Aug 2018') && text.includes('3.00')).length, 1);
    await page.$eval('#dossierTrainingSearch', node => { node.value = 'PROCESS IMPROVEMENT'; node.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$$eval('#dossierTrainingList .profile-history-record', nodes => nodes.length), 5);
    await page.$eval('#dossierTrainingSearch', node => { node.value = 'no matching course'; node.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.match(await page.$eval('#dossierTrainingList', node => node.innerText), /No training records/);
    await page.$eval('#dossierTrainingSearch', node => { node.value = ''; node.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$$eval('#dossierTrainingList .profile-history-record', nodes => nodes.length), 33);
    await page.$eval('.profile-account-toggle', node => node.click());
    assert.equal(await page.$eval('#cimbNumDisplay', node => node.textContent.replace(/\s/g, '')), '10447856855254');
    await page.$eval('.profile-account-toggle', node => node.click());
    assert.equal(await page.$eval('#cimbNumDisplay', node => node.dataset.masked), 'true');
    const before = fs.readFileSync('scratch/profile-details-before.html', 'utf8');
    const after = fs.readFileSync('me.html', 'utf8');
    const header = text => text.match(/<header class="cal-top-header me-profile-header"[^]*?<\/header>/)[0];
    const headerWithoutBack = header(after).replace(/          <button type="button" class="me-back-btn"[^]*?<\/button>\r?\n/, '');
    assert.equal(headerWithoutBack, header(before).replace('Senior Product Designer', 'Group HR Manager'), 'Header identity and structure stay intact alongside the added Back button; role matches the reference');
    assert.deepEqual(errors, []);
    console.log('PASS: reference fields, record counts, duplicates, CV date, search, masking and preserved Sarah identity.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
