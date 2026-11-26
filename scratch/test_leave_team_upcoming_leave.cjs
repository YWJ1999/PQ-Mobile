const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const leaveUrl = pathToFileURL(path.resolve(__dirname, '..', 'leave.html')).href + '?theme=dark';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(leaveUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => showLeaveSection('viewLeaveHub', 'team'));
    assert.equal(await page.$('#teamUpcomingMetric'), null);
    await page.evaluate(() => openTeamUpcomingLeaveSheet());
    await page.waitForFunction(() => document.getElementById('teamUpcomingLeaveSheetOverlay')?.classList.contains('open'));

    assert.equal(await page.$eval('#viewLeaveHub', node => getComputedStyle(node).display), 'block');
    assert.equal(await page.$eval('#headerTitleText', node => node.textContent.trim()), 'Leave Dashboard');
    assert.deepEqual(
      await page.$eval('#teamUpcomingLeaveSheetOverlay', node => ({
        display: getComputedStyle(node).display,
        bottomAligned: ['flex-end', 'flow-end'].includes(getComputedStyle(node).alignItems),
        open: node.classList.contains('open')
      })),
      { display: 'flex', bottomAligned: true, open: true }
    );
    assert.equal(await page.$eval('#teamUpcomingLeaveSheetTitle', node => node.textContent.trim()), 'Upcoming Leave');
    assert.equal(await page.$eval('#teamUpcomingLeaveSheetSubtitle', node => node.textContent.trim()), 'Approved • Next 14 days • 9 records');

    const cards = await page.$$eval('#teamUpcomingLeaveList .team-upcoming-leave-card', nodes => nodes.map(card => ({
      name: card.querySelector('.leave-highlight-detail-date .team-upcoming-employee-name')?.textContent.trim(),
      leaveType: card.querySelector('.cal-leave-detail-title')?.textContent.trim(),
      reference: card.querySelector('.cal-leave-detail-reference')?.textContent.trim(),
      usesHighlightRecord: card.classList.contains('leave-highlight-detail-record'),
      dateHeader: card.querySelector('.leave-highlight-detail-date')?.textContent.trim().replace(/\s+/g, ' '),
      contentOrder: [...card.querySelector('.cal-calendar-highlight-content').children].map(node => node.className),
      dateHeaderBackground: getComputedStyle(card.querySelector('.leave-highlight-detail-date')).backgroundImage,
      labels: [...card.querySelectorAll('.cal-leave-detail-label')].map(node => node.textContent.trim()),
      values: [...card.querySelectorAll('.cal-leave-detail-value')].map(node => node.textContent.trim())
    })));

    assert.equal(cards.length, 9);
    assert.deepEqual(cards[0], {
      name: '007216 - Hailizam Bin Mohamed Ikhsan',
      leaveType: 'Medical Leave',
      reference: 'Ref: LV-2026-0061',
      usesHighlightRecord: true,
      dateHeader: '007216 - Hailizam Bin Mohamed Ikhsan',
      contentOrder: ['cal-leave-detail-heading', 'leave-highlight-detail-body'],
      dateHeaderBackground: 'linear-gradient(135deg, rgb(76, 29, 149) 0%, rgb(109, 40, 217) 50%, rgb(124, 58, 237) 100%)',
      labels: ['Leave Date', 'Duration'],
      values: ['12 Sep 2026', 'Full Day']
    });
    assert.ok(cards.every(card => /^[^\s#]+ - .+/.test(card.name)));
    assert.ok(await page.$$eval('#teamUpcomingLeaveList .team-upcoming-leave-card', cards => cards.every(card => {
      const widths = [...card.querySelectorAll('.leave-highlight-detail-field')].map(field => field.getBoundingClientRect().width);
      return widths.length === 2 && Math.abs(widths[0] - widths[1]) <= 1;
    })));
    assert.equal(await page.$eval('#teamUpcomingLeaveList', node => node.scrollWidth > node.clientWidth + 1), false);

    await page.click('#teamUpcomingLeaveSheetClose');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('teamUpcomingLeaveSheetOverlay')).display === 'none');
    assert.equal(await page.$eval('#viewLeaveHub', node => getComputedStyle(node).display), 'block');
    console.log('PASS: Upcoming Leave opens a highlight-style employee bottom sheet.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
