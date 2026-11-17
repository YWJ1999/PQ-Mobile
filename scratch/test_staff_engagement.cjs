const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = file => pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/', file)).href;

async function formAppearance(page) {
  return page.evaluate(() => {
    const card = getComputedStyle(document.querySelector('.employee-career-form-card'));
    const field = getComputedStyle(document.querySelector('select.employee-career-control'));
    const accent = getComputedStyle(document.querySelector('.form-section-heading'), '::before');
    return {
      card: [card.backgroundColor, card.borderRadius, card.padding],
      field: [field.backgroundColor, field.borderRadius, field.padding, field.fontSize],
      accent: [accent.width, accent.height, accent.backgroundColor]
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url('confirm-staff.html') + '?theme=' + theme, { waitUntil: 'load' });
      const appearance = await formAppearance(page);
      await page.goto(url('staff-engagement.html') + '?theme=' + theme, { waitUntil: 'load' });
      assert.ok(await page.$('#staffEngagementForm'), 'Staff Engagement must contain its working form');
      assert.deepEqual(await formAppearance(page), appearance, 'Staff Engagement reuses the Confirm Staff form design');
      assert.deepEqual(await page.$$eval('#staffEngagementForm label', nodes => nodes.map(node => node.textContent.replace('*', '').trim())), ['Employee #', 'Name', 'Position', 'Interviewee #', 'Interviewee Position', 'Interview Date', 'Positive Feedback', 'Negative Feedback', 'Flight Risk', 'Recommendation', 'Mitigation Action', 'Remarks']);
      await page.click('#engagementSubmit');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'engagementEmployee');
      assert.equal(await page.$eval('#employeeCareerToast', node => node.textContent), '');
      await page.select('#engagementEmployee', 'EBB02');
      assert.equal(await page.$eval('#engagementName', node => node.value), 'Daniel Wong');
      assert.equal(await page.$eval('#engagementPosition', node => node.value), 'Product Designer');
      assert.equal(await page.$eval('#engagementEmployeeId', node => node.textContent), '#EBB02');
      assert.ok(await page.$eval('#engagementName', node => node.readOnly));
      assert.ok(await page.$eval('#engagementPosition', node => node.readOnly));
      await page.select('#engagementEmployee', '');
      assert.equal(await page.$eval('#engagementName', node => node.value), '');
      assert.equal(await page.$eval('#engagementPosition', node => node.value), '');
      assert.ok(await page.$eval('#engagementEmployeeId', node => node.hidden));
      await page.select('#engagementEmployee', 'EBB01');
      const applicantIds = await page.$$eval('#engagementEmployee option', options => options.map(option => option.value));
      const intervieweeIds = await page.$$eval('#engagementInterviewee option', options => options.map(option => option.value).filter(Boolean));
      assert.deepEqual(intervieweeIds.filter(id => applicantIds.includes(id)), [], 'Interviewees are different people from the applicants');
      await page.select('#engagementInterviewee', 'EBB47');
      assert.equal(await page.$eval('#engagementIntervieweePosition', node => node.value), 'Training Coordinator');
      assert.equal(await page.$eval('#engagementIntervieweePosition', node => node.readOnly), true);
      await page.select('#engagementInterviewee', '');
      assert.equal(await page.$eval('#engagementIntervieweePosition', node => node.value), '');
      await page.select('#engagementInterviewee', 'EBB48');
      const identities = await page.$eval('#staffEngagementForm', form => {
        const fields = new FormData(form);
        return ['employee', 'position', 'intervieweeNo', 'intervieweePosition'].map(key => fields.get(key));
      });
      assert.deepEqual(identities, ['EBB01', 'People Operations Executive', 'EBB48', 'Operations Analyst']);
      assert.equal(await page.$eval('#engagementInterviewDate', node => node.type), 'date');
      assert.match(await page.$eval('#engagementInterviewDate', node => node.value), /^\d{4}-\d{2}-\d{2}$/);
      await page.$eval('#engagementInterviewDate', node => { node.value = '2026-10-12'; });
      await page.type('#engagementPositiveFeedback', 'Supportive team and clear responsibilities.');
      await page.type('#engagementNegativeFeedback', 'Limited opportunities for progression.');
      await page.select('#engagementFlightRisk', 'medium');
      await page.select('#engagementRecommendation', 'career-development');
      await page.type('#engagementMitigationAction', 'Arrange a career planning discussion.');
      await page.type('#engagementRemarks', 'Review progress at the next interview.');
      await (await page.$('#engagementFiles')).uploadFile(path.resolve(__dirname, '../package.json'));
      assert.equal(await page.$eval('#engagementAttachments .form-attachment-file-name', node => node.textContent), 'package.json');
      assert.equal(await page.$eval('#engagementCamera', node => node.getAttribute('capture')), 'environment');
      await page.$eval('#engagementAttachments .form-attachment-remove', node => node.scrollIntoView({ block: 'center' }));
      await page.click('#engagementAttachments .form-attachment-remove');
      assert.ok(new URL(page.url()).pathname.endsWith('/staff-engagement.html'), 'Attachment removal stays on the form');
      assert.equal(await page.$$eval('#engagementAttachments .form-attachment-item', nodes => nodes.length), 0);
      await page.click('#engagementSubmit');
      assert.match(await page.$eval('#employeeCareerToast', node => node.textContent), /ready for submission/i);
      for (const width of [360, 390, 420]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
        assert.ok(await page.$$eval('.employee-career-control', nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)), 'Fields fit mobile widths');
        assert.ok(await page.$eval('#engagementEmployeeId', node => node.getBoundingClientRect().top >= document.getElementById('engagementName').getBoundingClientRect().bottom));
      }
      assert.equal(await page.$eval('#engagementCancel', node => new URL(node.href).searchParams.get('theme')), theme);
      await page.setViewport({ width: 390, height: 950 });
      await page.$eval('main', node => { node.scrollTop = 0; });
      await page.screenshot({ path: path.join(__dirname, 'staff-engagement-' + theme + '-top.png') });
      await page.$eval('#engagementFlightRisk', node => node.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(__dirname, 'staff-engagement-' + theme + '-bottom.png') });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Engagement matches the existing form design, autofills employees, selects date/risk/recommendation, handles attachments, validates required fields and fits both themes and mobile widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
