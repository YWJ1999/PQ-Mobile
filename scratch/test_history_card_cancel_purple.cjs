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
  ['leave.html', '#histTabLeave, #histTabCredit', '#myHistoryCardsList'],
  ['modules/employee-career/options/history.html', '[data-history-kind="feedback"], [data-history-kind="whereabout"]', '#careerHistoryList'],
  ['modules/admin/options/book-resource.html', null, '#bookingRecords']
];

async function open(page, file, theme) {
  const url = pathToFileURL(path.join(root, file));
  url.searchParams.set('theme', theme);
  if (file === 'leave.html') url.searchParams.set('view', 'history');
  await page.goto(url.href, { waitUntil: 'load' });
  assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
}

async function checkList(page, listSelector, context) {
  const footers = await page.$$eval(listSelector + ' :is(.history-card-actions, .record-card-actions, .project-history-card-actions, .career-history-card-actions)', nodes => nodes.map(footer => {
    const style = getComputedStyle(footer);
    const right = footer.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
    return [...footer.querySelectorAll('button, a')].map(button => {
      const icon = button.querySelector('.record-card-action-icon[aria-hidden="true"]');
      const rect = button.getBoundingClientRect();
      return {
        label: button.textContent.trim(),
        cancelsRecord: button.dataset.historyAction === 'cancel' || button.dataset.claimHistoryAction === 'cancel' || button.classList.contains('record-card-cancel'),
        icon: icon?.className || '',
        rightInset: right - rect.right,
        width: rect.width,
        top: rect.top,
        background: getComputedStyle(button).backgroundImage,
        color: getComputedStyle(button).color
      };
    });
  }));
  for (const buttons of footers) {
    if (buttons.length === 1) {
      const [button] = buttons;
      if (button.cancelsRecord) assert.equal(button.label, 'Cancel', context);
      const icons = { Cancel: /fa-ban/, Delete: /fa-trash-can/, Edit: /fa-pencil/ };
      assert.ok(Object.hasOwn(icons, button.label), context);
      assert.match(button.icon, icons[button.label], context);
      assert.match(button.background, /rgb\(124, 58, 237\).*rgb\(109, 40, 217\)/, context);
      assert.equal(button.color, 'rgb(255, 255, 255)', context);
      assert.ok(Math.abs(button.rightInset) <= 1 && button.width >= 96 && button.width <= 120, context);
    } else {
      assert.ok(buttons.every(button => !button.icon && button.top === buttons[0].top), context);
      if (buttons.length === 2) {
        const [first, second] = buttons;
        assert.ok(first.width <= 132 && Math.abs(first.width - second.width) <= 1 && Math.abs(second.rightInset) <= 1, context);
      }
    }
  }
  return footers.length;
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());

    for (const theme of ['light', 'dark']) {
      for (const [file, tabSelector, listSelector] of groups) {
        await open(page, file, theme);
        await page.waitForSelector(listSelector);
        let count = 0;
        if (tabSelector) {
          const tabs = await page.$$(tabSelector);
          assert.ok(tabs.length, file);
          for (const tab of tabs) {
            const label = await tab.evaluate(button => { button.click(); return button.textContent.trim(); });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            count += await checkList(page, listSelector, [theme, file, label].join(' / '));
          }
        } else {
          count = await checkList(page, listSelector, theme + ' / ' + file);
        }
        assert.ok(count > 0, file + ' must exercise card actions');
      }
    }
    console.log('PASS: Standalone Cancel, Edit and Delete use the compact purple button across all seven lists in both themes. Grouped actions share a row.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
