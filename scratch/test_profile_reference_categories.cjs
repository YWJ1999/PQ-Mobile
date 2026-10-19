const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const categories = [
  ['personal', 'Personal'], ['education', 'Qualification'], ['family', 'Family'],
  ['contact', 'Contact Information'], ['work', 'Work Information'], ['finance', 'Payroll Information'],
  ['career', 'Career Progression'], ['competency', 'Competencies'], ['performance', 'Performance History'],
  ['training', 'Training History'], ['compliance', 'Disciplinary History'], ['assets', 'Asset Assignment'], ['letters', 'HR Letters']
];
const tables = {
  family: [2, ['Name', 'Relation', 'Birth date']],
  career: [5, ['Date', 'Movement', 'Position']],
  competency: [6, ['Description', 'Level', 'Expiry']],
  performance: [6, ['Period', 'Position', 'Score']],
  training: [33, ['Date', 'Course title', 'Days']],
  compliance: [0, ['Date', 'Offence', 'Action']],
  assets: [4, ['Assign date', 'Asset description', 'Value']],
  letters: [31, ['Letter type', 'Issue date', 'Signed?']]
};
const fields = {
  personal: ['Name', 'NRIC #', 'Birth date', 'Age', 'Personal email', 'Gender', 'Marital status', 'Marriage date', 'Passport #', 'Passport expiry', 'Driving license', 'Driving license expiry', 'Key level'],
  education: ['Qualification', 'Description', 'Major', 'Institute', 'Other institute name', 'CGPA', 'Certificate #', 'Year from', 'Year to', 'Highest', 'Notes'],
  contact: ['Company email', 'Phone #', 'Mobile #', 'Postal code', 'City', 'State', 'Country', 'Emergency contact #', 'Contact name', 'Contact address'],
  work: ['Company', 'Branch', 'Department', 'Position', 'Years in position', 'Grade', 'Benefit scheme', 'Hire date', 'Years of service', 'Confirm date', 'Resign date', 'Reason', 'Shift group', 'Supervisor', 'Reporting to', 'Contract #', 'Contract start', 'Contract expiry', 'Work permit #', 'Work permit start', 'Work permit expiry'],
  finance: ['EPF #', 'Socso #', 'Tax #', 'Tabung Haji #', 'ASB #', 'Spouse EPF #', 'Spouse Tax #', 'Bank', 'Account #', 'Handicap?', 'Spouse handicap?', 'Spouse working?']
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 420]) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(path.resolve('me.html')).href + '?theme=' + theme, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForSelector('.profile-reference-table');
        assert.deepEqual(await page.evaluate(() => PROFILE_CATEGORIES.map(item => [item.id.replace('bento-', ''), item.label])), categories);
        assert.equal(await page.$$('#meMainScroll > .profile-section').then(nodes => nodes.length), 13);
        assert.equal(await page.$$('#profileDirectory [data-profile-category]').then(nodes => nodes.length), 13);
        assert.equal(await page.$$('#profileDirectory .profile-nav-row').then(nodes => nodes.length), 19);
        assert.deepEqual(await page.$$eval('.profile-nav-group-title', nodes => nodes.map(node => node.textContent)), ['Work', 'Pay & rewards', 'Career & development', 'My information']);
        assert.equal(await page.$eval('#profileDirectory', node => node.hidden), false);
        assert.equal(await page.$eval('#profileDetailNav', node => node.hidden), true);
        assert.equal(await page.$$eval('#meMainScroll > .profile-section', nodes => nodes.every(node => node.hidden)), true);
        assert.equal(await page.$$('#meMainScroll [role="tab"], #meMainScroll [role="tabpanel"]').then(nodes => nodes.length), 0);
        const menuOverflow = await page.$$eval('#profileDirectory, .profile-nav-row, .profile-nav-label', nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent));
        assert.deepEqual(menuOverflow, [], 'directory overflow');
        assert.equal(await page.$$eval('.profile-nav-row', nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)), true);
        if (width === 420) {
          await page.screenshot({ path: 'scratch/profile-directory-' + theme + '-top.png' });
          await page.$eval('#meMainScroll', node => { node.scrollTop = 435; });
          await page.screenshot({ path: 'scratch/profile-directory-' + theme + '-middle.png' });
          await page.$eval('#meMainScroll', node => { node.scrollTop = node.scrollHeight; });
          await page.screenshot({ path: 'scratch/profile-directory-' + theme + '-bottom.png' });
        }
        for (const [key, required] of Object.entries(fields)) {
          const labels = await page.$$eval('#bento-' + key + ' dt, #bento-' + key + ' .profile-supervisor-label', nodes => nodes.map(node => node.textContent.trim()));
          required.forEach(label => assert.ok(labels.includes(label), key + ': missing ' + label));
        }
        for (const [key, [count, headers]] of Object.entries(tables)) {
          assert.equal(await page.$$('#bento-' + key + ' .profile-reference-row').then(nodes => nodes.length), count, key + ' count');
          assert.deepEqual(await page.$$eval('#bento-' + key + ' th', nodes => nodes.map(node => node.textContent.trim())), headers, key + ' schema');
        }
        assert.deepEqual(await page.$$eval('#profileDirectory a', nodes => nodes.map(node => node.getAttribute('href'))), ['work-behaviour.html', 'subordinates.html', 'salary-history.html', 'bonus-history.html', 'change-request.html']);
        await page.$eval('#meMainScroll', node => { node.scrollTop = 0; });
        await page.click('[data-profile-action="job-description"]');
        assert.equal(await page.$eval('#jdPaperModal', node => node.classList.contains('open')), true);
        await page.evaluate(() => closeJdModal());
        assert.equal(await page.$eval('#jdPaperModal', node => node.classList.contains('open')), false);
        for (const [key] of categories) {
          const rowSelector = '[data-profile-category="bento-' + key + '"]';
          await page.$eval(rowSelector, node => { const main = node.closest('main'); main.scrollTop += node.getBoundingClientRect().top - main.getBoundingClientRect().top - (main.clientHeight - node.offsetHeight) / 2; });
          const scrollBefore = await page.$eval('#meMainScroll', node => node.scrollTop);
          await page.click(rowSelector);
          await page.evaluate(() => document.getAnimations().forEach(animation => { if (animation.effect.getTiming().iterations !== Infinity) animation.finish(); }));
          assert.equal(await page.$eval('#profileDirectory', node => node.hidden), true);
          assert.equal(await page.$eval('.profile-directory-back', node => node === document.activeElement), true);
          assert.equal(await page.$eval('.phone-container', node => node.scrollTop), 0, 'phone frame stays fixed');
          assert.deepEqual(await page.$$eval('#meMainScroll > .profile-section', nodes => nodes.filter(node => !node.hidden).map(node => node.id)), ['bento-' + key]);
          const overflow = await page.evaluate(id => {
            const section = document.getElementById(id);
            const nodes = [document.getElementById('meMainScroll'), section, ...section.querySelectorAll('table, th, td, dd, .profile-chart-button')];
            return nodes.filter(node => node.clientWidth && node.scrollWidth > node.clientWidth + 1).map(node => ({ tag: node.tagName, text: node.textContent.trim(), width: node.clientWidth, scroll: node.scrollWidth }));
          }, 'bento-' + key);
          assert.deepEqual(overflow, [], theme + ' ' + width + ' ' + key + ' overflow');
          if (width === 420) await page.screenshot({ path: 'scratch/profile-schema-' + theme + '-' + key + '.png' });
          await page.click('.profile-directory-back');
          assert.equal(await page.$eval('#profileDirectory', node => node.hidden), false);
          assert.equal(await page.$eval(rowSelector, node => node === document.activeElement), true);
          assert.ok(Math.abs(await page.$eval('#meMainScroll', node => node.scrollTop) - scrollBefore) < 2, 'directory scroll restored');
        }
        await page.evaluate(() => openProfileCategory('bento-training'));
        await page.$eval('#dossierTrainingSearch', node => { node.value = 'PowerPoint'; node.dispatchEvent(new Event('input', { bubbles: true })); });
        assert.equal(await page.$$('#bento-training .profile-reference-row').then(nodes => nodes.length), 1);
        assert.equal(await page.$eval('#dossierTrainingCount', node => node.textContent), '1 / 33');
        assert.equal(await page.evaluate(() => PROFILE_RECORD_COUNTS['bento-training']), 33);
        await page.$eval('#dossierTrainingSearch', node => { node.value = 'no-such-course'; node.dispatchEvent(new Event('input', { bubbles: true })); });
        assert.match(await page.$eval('#bento-training .profile-record-empty', node => node.textContent), /No training records/);
        await page.evaluate(() => showProfileDirectory());
        assert.equal(await page.$eval('[data-profile-category="bento-training"] .profile-nav-count', node => node.textContent), '33');
        await page.evaluate(() => { openProfileCategory('bento-family'); openProfileCategory('bento-training'); });
        assert.equal(await page.$$('#bento-training .profile-reference-row').then(nodes => nodes.length), 33);
        for (const key of ['career', 'performance', 'training', 'compliance']) {
          await page.evaluate(id => openProfileCategory(id), 'bento-' + key);
          const selector = '#bento-' + key + ' .profile-chart-button';
          assert.equal(await page.$eval(selector, node => node.textContent.trim()), 'View Chart');
          assert.ok(await page.$(selector + ' .fa-chart-pie'));
          await page.click(selector);
          assert.equal(await page.$eval('#profileRecordChart', node => node.open), true);
          assert.equal(await page.$eval('#profileRecordChart', node => node.scrollWidth <= node.clientWidth + 1), true);
          if (key === 'compliance') assert.match(await page.$eval('.profile-chart-content', node => node.textContent), /No disciplinary records/);
          if (width === 420 && key === 'training') await page.screenshot({ path: 'scratch/profile-schema-' + theme + '-chart.png' });
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.getElementById('profileRecordChart').open);
          assert.equal(await page.$eval(selector, node => document.activeElement === node), true);
        }
        await page.evaluate(() => openProfileCategory('bento-personal'));
        const collapse = await page.$('.profile-group-personal-details .profile-collapse-toggle');
        await collapse.focus();
        await page.keyboard.press('Space');
        await page.waitForFunction(() => document.querySelector('.profile-group-personal-details .profile-collapse-body').getBoundingClientRect().height === 0);
        assert.equal(await page.$eval('.profile-group-personal-details .profile-collapse-body', node => node.inert), true);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('.profile-group-personal-details .profile-collapse-body').getBoundingClientRect().height > 100);
        await page.evaluate(() => openProfileCategory('bento-finance'));
        await page.click('.profile-account-toggle');
        assert.equal(await page.$eval('#cimbNumDisplay', node => node.dataset.masked), 'false');
        await page.click('.me-back-btn');
        assert.equal(await page.$eval('#profileDirectory', node => node.hidden), false);
        console.log('PASS: ' + theme + ' ' + width + 'px; grouped directory, 13 categories, schemas/counts, filtering, charts, keyboard collapse, masking, back navigation, no overflow');
      }
    }
    await page.setViewport({ width: 320, height: 568 });
    for (const row of await page.$$('.profile-nav-row')) {
      await row.evaluate(node => { const main = node.closest('main'); main.scrollTop += node.getBoundingClientRect().top - main.getBoundingClientRect().top - (main.clientHeight - node.offsetHeight) / 2; });
      assert.equal(await row.evaluate(node => { const rect = node.getBoundingClientRect(); const main = document.getElementById('meMainScroll').getBoundingClientRect(); return rect.top >= main.top && rect.bottom <= main.bottom; }), true, 'all menu rows reachable on short screens');
    }
    await page.goto(pathToFileURL(path.resolve('me.html')).href + '?theme=light&scroll=bento-letters', { waitUntil: 'load' });
    assert.deepEqual(await page.$$eval('#meMainScroll > .profile-section', nodes => nodes.filter(node => !node.hidden).map(node => node.id)), ['bento-letters']);
    await page.click('.profile-directory-back');
    assert.equal(await page.$eval('#profileDirectory', node => node.hidden), false);
    assert.deepEqual(errors, []);
    const before = fs.readFileSync('C:/Users/60182/.codex/visualizations/2026/10/19/01a1536b-e7f5-7951-b2d6-57560028497f/profile-categories-before.html', 'utf8');
    const after = fs.readFileSync('me.html', 'utf8');
    for (const pattern of [/<header class="cal-top-header me-profile-header"[\s\S]*?<\/header>/]) assert.equal(after.match(pattern)[0], before.match(pattern)[0]);
    console.log('PASS: short-screen category access, deep links, no page errors, approved identity header preserved');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
