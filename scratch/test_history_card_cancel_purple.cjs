const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const groups = [
  ['modules/admin/options/history.html', '[data-history-kind]', '#workplaceHistoryList'],
  ['modules/claims/options/history.html', '.me-jump-pill[data-tab]', '#claimHistoryListContainer'],
  ['modules/payroll/options/history.html', '[data-history-kind]', '#payrollHistoryList'],
  ['modules/project-task/options/history.html', '.project-history-tab', '.project-history-panel:not([hidden])'],
  ['leave.html', '#histTabLeave, #histTabCredit', '#myHistoryCardsList']
];

async function open(page, file, theme) {
  const url = pathToFileURL(path.join(root, file));
  url.searchParams.set('theme', theme);
  if (file === 'leave.html') url.searchParams.set('view', 'history');
  await page.goto(url.href, { waitUntil: 'load' });
  assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());

    for (const theme of ['light', 'dark']) {
      await open(page, 'modules/admin/options/guest-visit.html', theme);
      const expected = await page.$eval('#visitGuestAdd', button => {
        const { backgroundImage, color } = getComputedStyle(button);
        return { backgroundImage, color };
      });
      assert.match(expected.backgroundImage, /linear-gradient/);
      for (const [file, tabSelector, listSelector] of groups) {
        await open(page, file, theme);
        await page.waitForSelector(listSelector + ' button');
        const tabs = await page.$$(tabSelector);
        assert.ok(tabs.length, file + ' must expose history options');
        for (const tab of tabs) {
          const label = await tab.evaluate(button => { button.click(); return button.textContent.trim(); });
          const actions = await page.$$eval(listSelector + ' button', buttons => buttons
            .filter(button => /^(Cancel|Apply|Submit)$/.test(button.textContent.trim()))
            .map(button => {
              const { backgroundImage, color } = getComputedStyle(button);
              return { label: button.textContent.trim(), colours: { backgroundImage, color } };
            }));
          const context = [theme, file, label].join(' / ');
          assert.ok(actions.some(action => action.label === 'Cancel'), context + ' must exercise Cancel');
          for (const action of actions) assert.deepEqual(action.colours, expected, context + ' / ' + action.label);
        }
      }
    }
    console.log('PASS: History card Cancel matches Save Item across all five modules in light and dark themes.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
