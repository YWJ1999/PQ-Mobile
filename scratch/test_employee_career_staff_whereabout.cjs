const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-whereabout.html')).href;
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const apply = async values => {
      await page.click('#staffWhereaboutFilterTrigger');
      await page.evaluate(values => { for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value; }, values);
      await page.click('#staffWhereaboutApplyFilter');
    };
    const reset = async () => { await page.click('#staffWhereaboutFilterTrigger'); await page.click('#staffWhereaboutResetFilter'); };
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.equal(await page.$('.employee-career-coming-card'), null);
      assert.deepEqual(await page.$$eval('.staff-whereabout-name', nodes => nodes.map(n => n.textContent)), ['Andrew', 'Yee seong liew', 'Ewi robert', 'Ali bin ahmad', 'Juliana binti othman']);
      assert.deepEqual(await page.$$eval('.staff-whereabout-emp-no', nodes => nodes.map(n => n.textContent)), ['#000030', '#000070', '#82828', '#A9999', '#EBB204']);
      assert.deepEqual(await page.$$eval('#staffWhereaboutFilterForm label', nodes => nodes.map(n => n.textContent)), ['Date', 'Search Keyword', 'Branch', 'Department', 'Whereabout']);
      assert.equal(await page.$eval('#staffWhereaboutCurrentDate', n => n.textContent), '05 Oct 2026');
      assert.equal(await page.$eval('.staff-whereabout-date-switcher', n => n.nextElementSibling.classList.contains('staff-whereabout-filter-summary')), true);
      assert.equal(await page.$eval('.history-total-records-label', n => n.textContent), 'Records');
      assert.equal(await page.$eval('#staffWhereaboutTotal', n => n.textContent), '5');
      assert.equal(await page.$$eval('main h2', nodes => nodes.some(n => n.textContent === 'Staff Whereabout')), false);
      await page.click('#staffWhereaboutPreviousDate');
      assert.equal(await page.$eval('#staffWhereaboutCurrentDate', n => n.textContent), '04 Oct 2026');
      assert.equal(await page.$eval('#staffWhereaboutTotal', n => n.textContent), '0');
      assert.equal(await page.$eval('#staffWhereaboutEmpty', n => n.hidden), false);
      await page.click('#staffWhereaboutNextDate');
      assert.equal(await page.$eval('#staffWhereaboutTotal', n => n.textContent), '5');
      assert.deepEqual(await page.$$eval('.staff-whereabout-card:first-child .staff-whereabout-field', nodes => nodes.map(n => n.innerText.replace(/\s+/g, ' ').trim())), ['Whereabout Annual Leave', 'Time -', 'Project -', 'Task -']);
      assert.ok(await page.$$eval('.staff-whereabout-card', nodes => nodes.every(n => {
        const description = document.getElementById(n.getAttribute('aria-describedby'));
        return description?.contains(n.querySelector('.staff-whereabout-field'));
      })), 'Clickable cards must keep their whereabouts and time available as accessible descriptions');
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1));
        assert.ok(await page.$$eval('.staff-whereabout-card', nodes => nodes.every(n => n.scrollWidth <= n.clientWidth + 1)));
        assert.ok(await page.$$eval('.staff-whereabout-card', nodes => nodes.every(n => n.querySelector('.staff-whereabout-emp-no').getBoundingClientRect().top >= n.querySelector('.staff-whereabout-name').getBoundingClientRect().bottom)));
        await page.click('.staff-whereabout-card');
        assert.ok(await page.$('#staffWhereaboutDetails'), 'Staff Whereabout needs a card details popup');
        assert.equal(await page.$eval('#staffWhereaboutDetails', n => n.hidden), false, 'Clicking a staff card must open its details');
        assert.deepEqual(await page.$$eval('#staffWhereaboutDetails .detail-popout-label', nodes => nodes.map(n => n.textContent)),
          ['Name', 'Branch', 'Department', 'Project', 'Task', 'State', 'Date', 'Description', 'Status', 'Remark']);
        assert.deepEqual(await page.$$eval('#staffWhereaboutDetails .detail-popout-value', nodes => nodes.map(n => n.textContent)),
          ['Andrew', '-', '-', '-', '-', '-', '5 Oct 2026', '-', '-', '-']);
        assert.equal(await page.$('#staffWhereaboutDetails .staff-whereabout-detail-id'), null);
        assert.ok(await page.$eval('#staffWhereaboutDetails .detail-popout-body', n => n.scrollWidth <= n.clientWidth + 1));
        assert.ok(await page.$eval('#staffWhereaboutDetails', n => {
          const overlay = n.getBoundingClientRect();
          const panel = n.querySelector('.detail-popout-panel').getBoundingClientRect();
          return Math.abs((panel.top + panel.bottom) / 2 - (overlay.top + overlay.bottom) / 2) < 1;
        }), 'The details popup must be centered within the phone');
        assert.equal(await page.$eval('main', n => n.inert), true);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'staffWhereaboutCloseDetails');
        if (width === 390) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_whereabout_details_${theme}.png`) });
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('#staffWhereaboutDetails', n => n.hidden), true);
        assert.equal(await page.$eval('main', n => n.inert), false);
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('staff-whereabout-card')), true);
      }
      for (const key of ['Enter', 'Space']) {
        await page.keyboard.press(key);
        assert.equal(await page.$eval('#staffWhereaboutDetails', n => n.hidden), false);
        await page.click('#staffWhereaboutCloseDetails');
      }
      const cards = await page.$$('.staff-whereabout-card');
      for (let i = 0; i < cards.length; i++) {
        await cards[i].click();
        assert.equal(await page.$eval('#staffWhereaboutDetails .staff-whereabout-detail-name', n => n.textContent),
          ['Andrew', 'Yee seong liew', 'Ewi robert', 'Ali bin ahmad', 'Juliana binti othman'][i]);
        await page.click('#staffWhereaboutCloseDetails');
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.$eval('main', n => { n.scrollTop = 0; });
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_whereabout_${theme}.png`) });
      await apply({ staffWhereaboutKeyword: '#000030' });
      assert.equal(await page.$$eval('.staff-whereabout-card', nodes => nodes.length), 1);
      assert.equal(await page.$eval('.staff-whereabout-name', n => n.textContent), 'Andrew');
      await reset();
      await apply({ staffWhereaboutType: 'Medical Leave' });
      assert.equal(await page.$$eval('.staff-whereabout-card', nodes => nodes.length), 3);
      await page.click('#staffWhereaboutNextDate');
      assert.equal(await page.$eval('#staffWhereaboutCurrentDate', n => n.textContent), '06 Oct 2026');
      await page.click('#staffWhereaboutPreviousDate');
      assert.equal(await page.$$eval('.staff-whereabout-card', nodes => nodes.length), 3, 'Changing days preserves the Whereabout filter');
      await apply({ staffWhereaboutDate: '2026-10-31' });
      await page.click('#staffWhereaboutNextDate');
      assert.equal(await page.$eval('#staffWhereaboutCurrentDate', n => n.textContent), '01 Nov 2026');
      await page.click('#staffWhereaboutPreviousDate');
      assert.equal(await page.$eval('#staffWhereaboutCurrentDate', n => n.textContent), '31 Oct 2026');
      await reset();
      await apply({ staffWhereaboutDate: '2026-10-06' });
      assert.ok(await page.$eval('#staffWhereaboutEmpty', n => !n.hidden));
      await apply({ staffWhereaboutDate: '2026-10-05' });
      assert.equal(await page.$$eval('.staff-whereabout-card', nodes => nodes.length), 5);
      await page.click('#staffWhereaboutFilterTrigger');
      await page.$eval('#staffWhereaboutDate', n => { n.value = ''; });
      await page.click('#staffWhereaboutApplyFilter');
      assert.equal(await page.$eval('#staffWhereaboutFilterOverlay', n => n.hidden), false);
      assert.ok(await page.$eval('#staffWhereaboutFilterError', n => !n.hidden));
      await page.keyboard.press('Escape');
      await page.click('#staffWhereaboutFilterTrigger');
      assert.equal(await page.$eval('#staffWhereaboutDate', n => n.value), '2026-10-05');
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_whereabout_filter_${theme}.png`) });
      await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
      assert.ok(await page.evaluate(() => !!document.activeElement.closest('#staffWhereaboutFilterOverlay')));
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('main', n => n.inert), false);
    }
    const fixturePage = await browser.newPage();
    fixturePage.on('pageerror', e => errors.push(e.message));
    await fixturePage.evaluateOnNewDocument(() => {
      window.EMPLOYEE_CAREER_STAFF_WHEREABOUT_RECORDS = [
        { date: '2026-10-05', empNo: '000030', name: 'Andrew', whereabout: 'Annual Leave', time: '-', project: '-', task: '-', branch: 'HQ', department: 'HR' },
        { date: '2026-10-05', empNo: '000070', name: 'Yee seong liew', whereabout: 'Medical Leave', time: '09:00 – 17:00', project: 'PeopleHub Rollout', task: 'Review', branch: 'HQ', department: 'Operations', state: 'Selangor', description: 'On-site review\nDiscuss <handover> & next steps', status: 'Approved', remark: 'Bring the project documents.' },
        { date: '2026-10-05', empNo: '82828', name: 'Ewi robert', whereabout: 'Medical Leave', time: '-', project: '-', task: '-', branch: 'South', department: 'HR' }
      ];
    });
    await fixturePage.goto(url + '?theme=light', { waitUntil: 'networkidle0' });
    await fixturePage.click('#staffWhereaboutFilterTrigger');
    await fixturePage.select('#staffWhereaboutBranch', 'HQ');
    await fixturePage.select('#staffWhereaboutDepartment', 'Operations');
    await fixturePage.select('#staffWhereaboutType', 'Medical Leave');
    await fixturePage.click('#staffWhereaboutApplyFilter');
    assert.equal(await fixturePage.$$eval('.staff-whereabout-card', nodes => nodes.length), 1);
    assert.match(await fixturePage.$eval('.staff-whereabout-card', n => n.innerText), /PeopleHub Rollout/);
    assert.match(await fixturePage.$eval('.staff-whereabout-card', n => n.innerText), /Review/);
    await fixturePage.click('.staff-whereabout-card');
    assert.deepEqual(await fixturePage.$$eval('#staffWhereaboutDetails .detail-popout-value', nodes => nodes.map(n => n.textContent)),
      ['Yee seong liew', 'HQ', 'Operations', 'PeopleHub Rollout', 'Review', 'Selangor', '5 Oct 2026', 'On-site review\nDiscuss <handover> & next steps', 'Approved', 'Bring the project documents.']);
    assert.equal(await fixturePage.$('#staffWhereaboutDetails .staff-whereabout-detail-id'), null);
    const overlay = await fixturePage.$('#staffWhereaboutDetails');
    const overlayBounds = await overlay.boundingBox();
    await overlay.click({ offset: { x: 8, y: overlayBounds.height / 2 } });
    assert.equal(await fixturePage.$eval('#staffWhereaboutDetails', n => n.hidden), true);
    assert.deepEqual(errors, []);
    console.log('PASS: Staff Whereabout card details with ten fields, record values and blank fallbacks, keyboard and close controls, focus restoration, existing filters, both themes and three widths.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
