const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      const navigate = selector => Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click(selector)
      ]);
      const readEvents = () => page.$$eval('[data-career-event-row]', links => links.map(link => [
        link.firstElementChild.textContent, Number(link.lastElementChild.textContent)
      ]));
      const expectedEvents = [
        ['Active', 281], ['Birthday', 44], ['Confirmation Due', 3], ['Retirement Due', 1],
        ['Medical Check', 6], ['Confirmation Past Due', 237], ['Retirement Past Due', 80], ['Contract Expiry Past Due', 29]
      ];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 1000 });
      const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/index.html')).href;
      await page.goto(`${url}?scope=team&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.ok(await page.$('#employeeCareerTeamActions .team-pending-approval-action'), 'Team needs the shared Pending Approval action');
      assert.deepEqual(await page.$$eval('main > [data-career-scope="team"], main > .employee-career-quick', nodes => nodes.map(node => node.id)), ['employeeCareerTeamActions', 'employeeCareerQuickOptions', 'employeeCareerHeadcountActions', 'employeeCareerStaffEvents']);
      assert.equal(await page.$eval('#employeeCareerDocumentStatus', node => node.hidden), true);
      assert.equal(await page.$eval('#employeeCareerExpiry', node => node.hidden), true);
      assert.equal(await page.$$eval('#employeeCareerStaffEvents summary, #employeeCareerStaffEvents .employee-career-expiry-chevron', nodes => nodes.length), 0, 'Staff Events has no collapse control');
      await page.click('#employeeCareerStaffEvents .employee-career-expiry-header');
      assert.ok(await page.$eval('#employeeCareerStaffEventRows', node => node.getBoundingClientRect().height > 0));
      assert.equal(await page.$eval('#employeeCareerStaffEventCount', node => node.textContent), '8');
      assert.equal(await page.$eval('#employeeCareerAllEvents', node => node.textContent), 'View all events (8)');
      assert.deepEqual(await page.$eval('#employeeCareerEventFilterTrigger', node => ({
        inHeader: node.parentElement.matches('#employeeCareerStaffEvents > .employee-career-expiry-header'),
        afterCount: node.previousElementSibling?.id === 'employeeCareerStaffEventCount',
        calendarBeforeTitle: !!node.parentElement.querySelector('.employee-career-expiry-icon + h2 + .employee-career-event-count'),
        rightmost: node.nextElementSibling === null,
        alignedRight: Math.abs(node.parentElement.getBoundingClientRect().right - node.getBoundingClientRect().right) <= 1,
        text: node.textContent.trim(),
        label: node.getAttribute('aria-label'),
        hasPopup: node.getAttribute('aria-haspopup'),
        controls: node.getAttribute('aria-controls'),
        expanded: node.getAttribute('aria-expanded'),
        icon: node.querySelector('i')?.classList.contains('fa-sliders'),
        hitWidth: Math.round(node.getBoundingClientRect().width),
        hitHeight: Math.round(node.getBoundingClientRect().height)
      })), {
        inHeader: true,
        afterCount: true,
        calendarBeforeTitle: true,
        rightmost: true,
        alignedRight: true,
        text: '',
        label: 'Open Staff Events filter. Current filter: All Events',
        hasPopup: 'dialog',
        controls: 'employeeCareerEventFilterOverlay',
        expanded: 'false',
        icon: true,
        hitWidth: 40,
        hitHeight: 40
      }, 'Staff Events exposes the consistent accessible filter icon on the far right');
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const filterBox = await page.$eval('#employeeCareerEventFilterTrigger', node => {
        const box = node.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      });
      await page.mouse.move(filterBox.x, filterBox.y);
      await page.mouse.down();
      assert.deepEqual(await page.$eval('#employeeCareerEventFilterTrigger', node => {
        const style = getComputedStyle(node);
        return { transitionDuration: style.transitionDuration, transform: style.transform };
      }), { transitionDuration: '0s', transform: 'none' }, 'Reduced motion disables the Staff Events filter animation and pressed scale');
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
      assert.equal(await page.$$eval('#employeeCareerOptions .employee-career-option', nodes => nodes.length), 6);
      await page.click('[data-action="view-all"]');
      await page.waitForFunction(() => document.activeElement.id === 'employeeCareerCloseAll');
      assert.equal(await page.$$eval('#employeeCareerAllOptionsGrid .employee-career-option', nodes => nodes.length), 17);
      assert.equal(
        await page.$$eval('#employeeCareerAllOptionsGrid .employee-career-option-title', nodes => nodes.some(node => node.textContent.trim() === 'Key Staff Nomination')),
        false
      );
      await page.keyboard.press('Escape');

      const activeNavigation = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => null);
      await page.click('#employeeCareerActiveHeadcount');
      await activeNavigation;
      assert.ok(page.url().replace(/\\/g, '/').includes('/modules/employee-career/options/team/active-headcount.html'), 'Active Headcount opens its chart page');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme, 'Active Headcount preserves the selected theme');
      await page.goBack({ waitUntil: 'domcontentloaded' });

      const vacantNavigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      await page.click('#employeeCareerVacantPosition');
      await vacantNavigation;
      assert.ok(page.url().includes('/vacant-position.html'), 'Vacant Position opens its chart page');
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#employeeCareerActiveHeadcountTotal', node => node.textContent.trim()), '281');
      assert.deepEqual(await readEvents(), expectedEvents.slice(0, 5));
      assert.ok(await page.$$eval('[data-career-event-row]', links => links.every(link =>
        link.matches('a[href]') && link.getBoundingClientRect().height >= 44 && link.scrollWidth <= link.clientWidth + 1
      )));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#employeeCareerAllOptions')).visibility === 'hidden');
      await page.screenshot({ path: path.resolve(process.env.SCREENSHOT_DIR || __dirname, `employee-career-team-dashboard-${theme}-${width}-overview.png`) });
      await page.$eval('main', node => { node.scrollTop = node.scrollHeight; });
      await page.screenshot({ path: path.resolve(process.env.SCREENSHOT_DIR || __dirname, `employee-career-team-dashboard-${theme}-${width}-events.png`) });

      await page.click('#employeeCareerEventFilterTrigger');
      await page.waitForSelector('#employeeCareerEventFilterOverlay', { visible: true });
      assert.equal(await page.$eval('#employeeCareerEventFilterOverlay', node => node.getAttribute('aria-hidden')), 'false');
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-expanded')), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'employeeCareerEventFilter', 'Opening the filter focuses Event Type');
      assert.equal(await page.$eval('main', node => node.inert), true, 'Opening the filter makes dashboard content inert');
      assert.equal(await page.$eval('preview-top-bar', node => node.inert), true, 'Opening the modal filter also makes the outer preview toolbar inert');
      await page.select('#employeeCareerEventFilter', 'birthday');
      await page.click('#employeeCareerEventFilterClose');
      assert.equal(await page.$eval('#employeeCareerEventFilterOverlay', node => node.hidden), true, 'Close dismisses the filter sheet');
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-label')), 'Open Staff Events filter. Current filter: All Events', 'Close discards an unapplied event');
      assert.equal(await page.$$eval('#employeeCareerStaffEventRows li', nodes => nodes.length), 5, 'Close preserves the applied event filter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'employeeCareerEventFilterTrigger', 'Close restores focus to the filter trigger');
      assert.equal(await page.$eval('main', node => node.inert), false, 'Closing the filter restores dashboard interaction');
      assert.equal(await page.$eval('preview-top-bar', node => node.inert), false, 'Closing the filter restores the outer preview toolbar');

      await page.click('#employeeCareerEventFilterTrigger');
      assert.equal(await page.$eval('#employeeCareerEventFilter', node => node.value), '', 'Opening restores the applied event value');
      await page.select('#employeeCareerEventFilter', 'birthday');
      await page.click('#employeeCareerEventFilterApply');
      assert.equal(await page.$$eval('#employeeCareerStaffEventRows li', nodes => nodes.length), 1);
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-label')), 'Open Staff Events filter. Current filter: Birthday');
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-expanded')), 'false');
      await page.click('#employeeCareerEventFilterTrigger');
      await page.select('#employeeCareerEventFilter', 'retirement-due');
      await page.click('#employeeCareerEventFilterClose');
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-label')), 'Open Staff Events filter. Current filter: Birthday', 'Close preserves a previously applied non-default event');
      assert.deepEqual(await readEvents(), [['Birthday', 44]]);
      await navigate('[data-career-event-row="birthday"]');
      assert.ok(page.url().includes('/staff-event-details.html?'));
      assert.equal(await page.$eval('#staffEventTitle', node => node.textContent), 'Birthday');
      assert.equal(await page.$eval('#staffEventAvailable', node => node.textContent), 'Showing 10 of 44 employee records.');
      assert.equal(await page.$eval('.career-event-person-date', node => node.dateTime), '1966-10-13');
      assert.ok(await page.$$eval('.career-event-person', nodes => nodes.length > 0 && nodes.every(node => {
        const name = node.querySelector('.career-event-person-name');
        return /^[^#\s]+ - .+/.test(name.textContent);
      })));
      await navigate('#staffEventBack');
      assert.deepEqual(await readEvents(), [['Birthday', 44]]);
      assert.equal(await page.$eval('#employeeCareerStaffEventCount', node => node.textContent), '1');
      assert.equal(await page.$eval('.phone-container', phone => phone.scrollTop), 0, 'The header stays in place on return');

      await page.click('#employeeCareerEventFilterTrigger');
      await page.select('#employeeCareerEventFilter', 'retirement-due');
      await page.click('#employeeCareerEventFilterApply');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.careerEventRow), 'retirement-due', 'Tab reaches the filtered Staff Events row');
      assert.deepEqual(await page.$eval('[data-career-event-row="retirement-due"]', node => {
        const style = getComputedStyle(node);
        return { cursor: style.cursor, outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
      }), { cursor: 'pointer', outlineStyle: 'solid', outlineWidth: 2 }, 'Focused Staff Events rows visibly communicate that they are interactive');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.press('Enter')]);
      assert.equal(await page.$eval('#staffEventEmpty', node => node.innerText), 'No employee details available for this event.');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      assert.deepEqual(await readEvents(), [['Retirement Due', 1]]);
      await page.click('#employeeCareerEventFilterTrigger');
      await page.click('#employeeCareerEventFilterReset');
      assert.equal(await page.$$eval('#employeeCareerStaffEventRows li', nodes => nodes.length), 5);
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-label')), 'Open Staff Events filter. Current filter: All Events', 'Reset applies the default event filter');

      await page.click('#employeeCareerEventFilterTrigger');
      await page.select('#employeeCareerEventFilter', 'birthday');
      await page.$eval('#employeeCareerEventFilterOverlay', node => node.click());
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-label')), 'Open Staff Events filter. Current filter: All Events', 'Backdrop close discards an unapplied event');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'employeeCareerEventFilterTrigger');

      await page.click('#employeeCareerEventFilterTrigger');
      await page.focus('#employeeCareerEventFilterApply');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'employeeCareerEventFilterReset', 'Tab wraps from the final filter control to Reset');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'employeeCareerEventFilterApply', 'Shift+Tab wraps from Reset to the final filter control');
      await page.select('#employeeCareerEventFilter', 'birthday');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#employeeCareerEventFilterTrigger', node => node.getAttribute('aria-label')), 'Open Staff Events filter. Current filter: All Events', 'Escape discards an unapplied event');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'employeeCareerEventFilterTrigger');

      await page.click('#employeeCareerTabIndividual');
      assert.equal(await page.$$eval('[data-career-scope="team"]', nodes => nodes.every(node => node.hidden)), true);
      assert.equal(await page.$eval('#employeeCareerExpiry', node => node.hidden), false);
      await page.click('#employeeCareerTabTeam');
      assert.equal(await page.$$eval('[data-career-scope="team"]', nodes => nodes.every(node => !node.hidden)), true);
      await page.setViewport({ width, height: 800 });
      await navigate('#employeeCareerAllEvents');
      assert.deepEqual(await readEvents(), expectedEvents);
      const allLinks = await page.$$eval('[data-career-event-row]', links => links.map(link => link.dataset.careerEventRow));
      for (const [index, id] of allLinks.entries()) {
        await navigate(`[data-career-event-row="${id}"]`);
        assert.equal(await page.$eval('#staffEventTitle', node => node.textContent), expectedEvents[index][0]);
        assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
        assert.ok(await page.$eval('main', node => node.clientWidth >= node.scrollWidth));
        await navigate('#staffEventBack');
        assert.deepEqual(await readEvents(), expectedEvents);
      }
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      await page.evaluate(value => setTheme(value), nextTheme);
      await navigate('#staffEventBack');
      assert.equal(await page.$eval('html', node => node.dataset.theme), nextTheme);
      assert.deepEqual(await readEvents(), expectedEvents.slice(0, 5));
      assert.equal(await page.$eval('.phone-container', phone => phone.scrollTop), 0);
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}: Team order, shared actions, toasts, event filter, details, focus and scope`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
