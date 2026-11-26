const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/staff-events.html')).href;
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const titles = ['Active', 'Retirement Past Due', 'Birthday', 'Confirmation Past Due', 'Contract Expiry Past Due', 'Medical Check', 'Confirmation Due'];
    const counts = [282, 80, 28, 237, 29, 6, 2];
    const samples = [11, 11, 10, 11, 11, 6, 2];
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(url + '?theme=' + theme, { waitUntil: 'networkidle0' });
      assert.equal(await page.$('.employee-career-coming-card'), null);
      assert.deepEqual(await page.$$eval('#staffEventFilterForm label', nodes => nodes.map(n => n.textContent)), ['Search Keyword', 'Start Date', 'End Date', 'Event Type']);
      assert.deepEqual(await page.$$eval('[data-staff-event] .staff-event-title', nodes => nodes.map(n => n.textContent)), titles);
      assert.deepEqual(await page.$$eval('[data-staff-event] .staff-event-count', nodes => nodes.map(n => Number(n.textContent))), counts);
      for (const width of [360, 390, 450]) {
        await page.setViewport({ width, height: 950 });
        assert.ok(await page.$eval('main', n => n.scrollWidth <= n.clientWidth + 1));
        for (let i = 0; i < titles.length; i++) {
          const button = (await page.$$('[data-staff-event]'))[i];
          await button.click();
          await page.waitForSelector('#staffEventDetails', { visible: true });
          assert.equal(await page.$eval('#staffEventDetailsTitle', n => n.textContent), titles[i]);
          assert.equal(await page.$eval('#staffEventDetailsCount', n => Number(n.textContent)), counts[i]);
          assert.deepEqual(await page.$$eval('#staffEventDetails table thead th', nodes => nodes.map(n => ({ label: n.textContent.trim(), scope: n.scope }))), [
            { label: 'Employee', scope: 'col' },
            { label: 'Date', scope: 'col' }
          ], 'Each event category must expose Employee and Date as table column headers');
          assert.equal(await page.$$eval('#staffEventDetails table tbody tr', nodes => nodes.length), samples[i]);
          assert.ok(await page.$$eval('#staffEventDetails table tbody tr', nodes => nodes.every(n =>
            n.cells.length === 2 && n.cells[0].querySelector('.staff-event-person-name') && n.cells[1].querySelector('.staff-event-person-date')
          )), 'Employee identity and event date must occupy corresponding table cells');
          assert.equal(await page.$$eval('.staff-event-person', nodes => nodes.length), samples[i]);
          assert.ok(await page.$$eval('.staff-event-person', nodes => nodes.every(n => {
            const name = n.querySelector('.staff-event-person-name');
            const id = n.querySelector('.staff-event-person-id');
            return /^\w+$/.test(id.textContent) && id.getBoundingClientRect().top >= name.getBoundingClientRect().bottom - 1;
          })));
          assert.ok(await page.$eval('#staffEventDetails .detail-popout-body', n => n.scrollWidth <= n.clientWidth + 1));
          assert.equal(await page.$eval('main', n => n.inert), true);
          if (i === 6) assert.deepEqual(await page.$$eval('.staff-event-person-date', nodes => nodes.map(n => n.textContent)), ['12 Oct 2026', '13 Oct 2026']);
          if (i === 2) assert.equal(await page.$eval('.staff-event-person-date', n => n.textContent), '13 Oct 1966');
          if (width === 390 && [1, 2, 5, 6].includes(i)) await page.screenshot({ path: path.join(__dirname, `employee_career_staff_events_${i}_${theme}.png`) });
          if (i === 1) {
            const headerPositions = await page.evaluate(async () => {
              const body = document.querySelector('#staffEventDetails .detail-popout-body');
              const positions = [];
              for (const offset of [18, 45, 110, body.scrollHeight]) {
                body.scrollTop = offset;
                await new Promise(resolve => requestAnimationFrame(resolve));
                const header = body.querySelector('thead th').getBoundingClientRect();
                const bounds = body.getBoundingClientRect();
                positions.push({ gap: header.top - bounds.top, visible: header.bottom <= bounds.bottom });
              }
              return positions;
            });
            assert.ok(headerPositions.every(position => position.gap >= -1 && position.gap <= 1 && position.visible),
              `Sticky headers must meet the scroll area top without exposing rows above them: ${JSON.stringify(headerPositions)}`);
            if (width === 390) {
              await page.$eval('#staffEventDetails .detail-popout-body', body => { body.scrollTop = 45; });
              await page.screenshot({ path: path.join(__dirname, `employee_career_staff_events_scrolled_${theme}.png`) });
            }
          }
          await page.keyboard.press('Escape');
          assert.equal(await page.$eval('#staffEventDetails', n => n.hidden), true);
          assert.equal(await page.$eval('main', n => n.inert), false);
          assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-staff-event')), true);
        }
      }
      await page.setViewport({ width: 390, height: 950 });
      await page.$eval('main', n => { n.scrollTop = 0; });
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_events_${theme}.png`) });
      await page.click('#staffEventFilterTrigger');
      await page.type('#staffEventKeyword', '#EBB12');
      await page.click('#staffEventApplyFilter');
      assert.equal(await page.$eval('[data-staff-event="medical"] .staff-event-count', n => n.textContent), '1');
      await page.click('[data-staff-event="medical"]');
      assert.equal(await page.$eval('.staff-event-person-name', n => n.textContent), 'Farhan binti rahmat');
      await page.click('#staffEventCloseDetails');
      await page.click('#staffEventFilterTrigger');
      await page.$eval('#staffEventKeyword', n => { n.value = 'no matching employee'; });
      await page.click('#staffEventApplyFilter');
      await page.click('[data-staff-event="birthday"]');
      assert.ok(await page.$eval('#staffEventDetailsEmpty', n => !n.hidden));
      assert.equal(await page.$$eval('.staff-event-person', nodes => nodes.length), 0);
      await page.keyboard.press('Escape');
      await page.click('#staffEventFilterTrigger');
      await page.click('#staffEventResetFilter');
      assert.deepEqual(await page.$$eval('[data-staff-event] .staff-event-count', nodes => nodes.map(n => Number(n.textContent))), counts);
      const apply = async values => {
        await page.click('#staffEventFilterTrigger');
        await page.evaluate(values => {
          for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value;
        }, values);
        await page.click('#staffEventApplyFilter');
      };
      await apply({ staffEventKeyword: '#EBB12', staffEventStartDate: '2013-10-01', staffEventEndDate: '2013-10-01', staffEventType: 'medical' });
      assert.deepEqual(await page.$$eval('[data-staff-event] .staff-event-title', nodes => nodes.map(n => n.textContent)), ['Medical Check']);
      assert.equal(await page.$eval('[data-staff-event] .staff-event-count', n => n.textContent), '1');
      await page.click('[data-staff-event="medical"]');
      assert.equal(await page.$eval('.staff-event-person-date', n => n.textContent), '1 Oct 2013');
      await page.keyboard.press('Escape');
      await apply({ staffEventKeyword: '', staffEventStartDate: '2026-10-12', staffEventEndDate: '2026-10-13', staffEventType: 'confirmation' });
      assert.equal(await page.$eval('[data-staff-event] .staff-event-count', n => n.textContent), '2');
      await apply({ staffEventStartDate: '2026-10-13' });
      assert.equal(await page.$eval('[data-staff-event] .staff-event-count', n => n.textContent), '1');
      await apply({ staffEventStartDate: '2026-10-14', staffEventEndDate: '2026-10-15' });
      assert.equal(await page.$eval('[data-staff-event] .staff-event-count', n => n.textContent), '0');
      await page.click('[data-staff-event="confirmation"]');
      assert.ok(await page.$eval('#staffEventDetailsEmpty', n => !n.hidden));
      await page.keyboard.press('Escape');
      await apply({ staffEventStartDate: '2026-10-15', staffEventEndDate: '2026-10-12' });
      assert.equal(await page.$eval('#staffEventFilterOverlay', n => n.hidden), false);
      assert.ok(await page.$eval('#staffEventFilterError', n => !n.hidden));
      await page.click('#staffEventCloseFilter');
      await page.click('#staffEventFilterTrigger');
      assert.equal(await page.$eval('#staffEventStartDate', n => n.value), '2026-10-14');
      await page.click('#staffEventResetFilter');
      assert.deepEqual(await page.$$eval('[data-staff-event] .staff-event-count', nodes => nodes.map(n => Number(n.textContent))), counts);
      await page.click('#staffEventFilterTrigger');
      await page.screenshot({ path: path.join(__dirname, `employee_career_staff_events_filter_${theme}.png`) });
      await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
      assert.ok(await page.evaluate(() => !!document.activeElement.closest('#staffEventFilterOverlay')));
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#staffEventFilterOverlay', n => n.hidden), true);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: seven Staff Events category tables, column headers and cells, sticky headers, reference totals, names/IDs/dates, filtering, empty state, focus and back navigation, both themes and three mobile widths.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
