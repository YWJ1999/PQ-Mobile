const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = pathToFileURL(path.resolve(__dirname, '..') + path.sep);
const screens = [
  ['modules/attendance/options/attendance.html', '#meJumpBar', '.main-content'],
  ['modules/attendance/options/overtime.html', '.pill-tabs-container', '.main-content'],
  ['me-accordion.html', '.me-jump-bar-wrapper', '#meMainScroll'],
  ['modules/employee-career/options/team/staff-feedback-review.html?record=staff-feedback-1', '.staff-feedback-review-tabs', 'main'],
  ['calendar.html', '.cal-category-strip', '.main-content'],
  ['company-updates.html', '.updates-filters', '.updates-content'],
  ['modules/payroll/options/tax-profile.html', '.tax-tabs', '.payroll-document-main']
];

async function measureScroll(bar, contentSelector) {
  const content = document.querySelector(contentSelector);
  const start = bar.getBoundingClientRect();
  const edge = content.getBoundingClientRect().top;
  const initialScroll = content.scrollTop;
  content.scrollTo({ top: initialScroll + Math.ceil(start.bottom - edge) + 32, behavior: 'instant' });
  await new Promise(requestAnimationFrame);
  const end = bar.getBoundingClientRect();
  const distance = content.scrollTop - initialScroll;
  content.scrollTo({ top: initialScroll, behavior: 'instant' });
  await new Promise(requestAnimationFrame);
  return {
    distance,
    barTravel: start.top - end.top,
    outOfView: end.bottom <= edge,
    returnOffset: bar.getBoundingClientRect().top - start.top
  };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 560 });
    for (const theme of ['light', 'dark']) {
      for (const [route, bar, content] of screens) {
        const url = new URL(route, root);
        url.searchParams.set('theme', theme);
        await page.goto(url.href, { waitUntil: 'load' });
        await page.waitForSelector(bar, { visible: true });
        const scroll = await page.$eval(bar, measureScroll, content);
        const label = `${route} (${theme})`;
        assert.ok(scroll.distance > 0 && scroll.outOfView, `${label} tabs should scroll out of view`);
        assert.ok(Math.abs(scroll.barTravel - scroll.distance) <= 1, `${label} tabs should travel with the content`);
        assert.ok(Math.abs(scroll.returnOffset) <= 1, `${label} tabs should return to their original position`);
      }
    }
    console.log('Content tab scrolling passed on all seven screens in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
