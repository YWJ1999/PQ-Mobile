const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/index.html')).href;
const summary = '#employeeCareerExpiry';
const details = '#employeeCareerExpiryDetails';
const expectedIcons = {
  License: 'fa-solid fa-id-card',
  Exam: 'fa-solid fa-graduation-cap',
  Event: 'fa-solid fa-calendar-days',
  Membership: 'fa-solid fa-people-group'
};
const groups = [
  { key: 'expired', label: 'Expired', count: 9 },
  { key: 'week', label: 'Due ≤7 days', count: 0 },
  { key: 'month', label: 'Due 8–30 days', count: 0 },
  { key: 'valid', label: 'Valid', count: 1 }
];

function iconAppearance(badge) {
  const box = getComputedStyle(badge);
  const glyph = getComputedStyle(badge.querySelector('i'));
  return [box.width, box.height, box.borderRadius, box.backgroundColor, glyph.color, glyph.fontSize,
    glyph.fontFamily, glyph.fontWeight, getComputedStyle(badge.parentElement).columnGap];
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 820, deviceScaleFactor: 1 });
      const home = pathToFileURL(path.resolve(__dirname, `../home${theme}.html`)).href;
      await page.goto(home, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => openInsightBreakdown('my', 'all'));
      const attendanceIcon = await page.$eval('[data-metric-name="Attendance%"] .insight-detail-metric-icon', iconAppearance);
      await page.goto(`${url}?scope=individual&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready.then(() => true));
      assert.equal(await page.$eval('.employee-career-quick', node => node.nextElementSibling.id), 'employeeCareerExpiry');
      assert.equal(await page.$eval(summary, node => node.hidden), false);
      assert.equal(await page.$eval(`${summary} > header`, node => node.textContent.trim()), 'Expiry Overview');
      assert.equal(await page.$eval(details, node => getComputedStyle(node).visibility), 'hidden');
      assert.equal(await page.$(`${summary} table`), null);
      assert.equal(await page.$$eval(`${summary} button`, buttons => buttons.every(button => button.scrollWidth <= button.clientWidth)), true);

      for (const { key, label, count } of groups) {
        const selector = `[data-expiry-group="${key}"]`;
        assert.equal(await page.$eval(`${selector} strong`, node => Number(node.textContent)), count);
        await page.$eval(selector, node => node.scrollIntoView({ block: 'center' }));
        await page.locator(selector).click();
        assert.equal(await page.$eval(details, node => node.getAttribute('aria-hidden')), 'false', `Open ${key} details`);
        await page.waitForFunction(() => document.activeElement.matches('#employeeCareerExpiryDetails .employee-career-sheet-close'));
        assert.equal(await page.$eval('#employeeCareerExpiryDetailTitle', node => node.textContent), label);
        assert.ok(await page.$eval(details, overlay => {
          const sheet = overlay.querySelector('[role="dialog"]').getBoundingClientRect();
          const phone = overlay.closest('.phone-container');
          const frame = phone.getBoundingClientRect();
          return sheet.top > frame.top && Math.abs(sheet.bottom - (frame.top + phone.clientTop + phone.clientHeight)) <= 1;
        }), 'The sheet stays anchored to the bottom of the phone');
        assert.equal(await page.$eval('#employeeCareerExpiryDetailCount', node => node.textContent), `Expiry overview · ${count} ${count === 1 ? 'record' : 'records'}`);
        const cards = await page.$$eval('#employeeCareerExpiryCards article', nodes => nodes.map(card => ({
          type: card.querySelector('.expiry-record-type').textContent,
          description: card.querySelector('h3').textContent,
          icon: card.querySelector('.insight-detail-metric-icon i').className,
          date: card.querySelector('time').textContent,
          days: card.querySelector('.expiry-record-days').textContent,
          daysLabel: card.querySelector('.insight-detail-change-column dt').textContent
        })));
        assert.equal(cards.length, count);
        for (const card of cards) {
          const [type] = card.type.split(' · ');
          assert.equal(card.icon, expectedIcons[type], `Icon for ${card.description} must match its ${type} type`);
        }
        for (const badge of await page.$$('#employeeCareerExpiryCards .insight-detail-metric-icon')) {
          assert.deepEqual(await badge.evaluate(iconAppearance), attendanceIcon, 'Match the Attendance rate icon style');
        }
        assert.equal(await page.$eval(`${details} .employee-career-expiry-empty`, node => node.hidden), count > 0);
        assert.equal(await page.$eval('#employeeCareerExpiryCards', node => node.hidden), count === 0);
        if (key === 'expired') {
          assert.deepEqual(cards[0], { type: 'License · Road transport', description: 'Driving license', icon: expectedIcons.License, date: '18 Jan 2012', days: '5,381', daysLabel: 'Days overdue' });
          assert.equal(cards[1].description, 'Forklift operator license');
          assert.ok(cards.every(card => card.daysLabel === 'Days overdue'));
          assert.ok(await page.$eval('#employeeCareerExpiryCards', list => {
            list.scrollTop = list.scrollHeight;
            return list.scrollTop > 0 && list.lastElementChild.getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom + 1;
          }), 'The last expired record is reachable within the sheet');
        }
        if (key === 'valid') assert.deepEqual(cards[0], { type: 'Membership', description: 'Other membership', icon: expectedIcons.Membership, date: '31 Dec 9998', days: '2,911,793', daysLabel: 'Days until expiry' });
        assert.ok(await page.$$eval('#employeeCareerExpiryCards dd', fields =>
          fields.every(field => field.scrollWidth <= field.clientWidth + 1)));
        if (key === 'expired') await page.keyboard.press('Escape');
        else await page.click(`${details} .employee-career-sheet-close`);
        assert.equal(await page.$eval(details, node => node.getAttribute('aria-hidden')), 'true');
        assert.equal(await page.$eval(selector, node => node === document.activeElement), true);
        // The fading backdrop must finish before Puppeteer starts the next tap.
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#employeeCareerExpiryDetails')).visibility === 'hidden');
      }

      await page.click('#employeeCareerTabTeam');
      assert.equal(await page.$eval(summary, node => node.hidden), true);
      await page.click('[data-action="view-all"]');
      await page.waitForFunction(() => document.activeElement.id === 'employeeCareerCloseAll');
      await page.click('#employeeCareerCloseAll');
      await page.click('#employeeCareerTabIndividual');
      assert.equal(await page.$eval(summary, node => node.hidden), false);
      await page.goto(`${url}?scope=team&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval(summary, node => node.hidden), true);
      assert.deepEqual(errors, []);
      console.log(`PASS ${theme} ${width}px: expiry counts, filtered details, empty states, focus and scope`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
