const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const route = file => pathToFileURL(path.resolve(__dirname, '..', file)).href;

async function checkRow(page, selector, expectedLabels) {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewport({ width, height: 844 });
    const buttons = await page.$eval(selector, row => [...row.children]
      .filter(el => el.matches('button, a') && el.getClientRects().length)
      .map(el => {
        const box = el.getBoundingClientRect();
        return {
          label: el.textContent.trim(), width: box.width, height: box.height, top: box.top,
          fits: box.left >= 0 && box.right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1
        };
      }));
    assert.deepEqual(buttons.map(button => button.label), expectedLabels);
    for (const button of buttons) {
      assert.ok(button.fits && button.height >= 44, `${width}px: ${button.label} fits the footer`);
      assert.ok(Math.abs(button.width - buttons[0].width) < 1, `${width}px: equal widths`);
      assert.equal(button.height, buttons[0].height);
      assert.equal(button.top, buttons[0].top);
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    for (const theme of ['light', 'dark']) {
      await page.goto(route('modules/claims/options/benefit-claim.html') + '?theme=' + theme);
      await page.click('.claim-option-action');
      await checkRow(page, '#viewBenefitForm .form-action-row', ['Cancel', 'Submit']);
      await page.click('#viewBenefitForm [data-page-form-cancel]');
      await page.waitForSelector('#viewBenefitList', { visible: true });
      await page.click('.claim-option-action');
      await page.click('#viewBenefitForm .form-primary-btn');
      await page.waitForSelector('#viewBenefitList', { visible: true });

      await page.goto(route('modules/admin/options/guest-visit.html') + '?theme=' + theme);
      for (const [tab, labels] of [
        ['general', ['Cancel', 'Save Draft', 'Next']],
        ['guest', ['Back to Categories', 'Next']],
        ['other', ['Cancel', 'Save Draft', 'Submit']]
      ]) {
        await page.click(`[data-visit-tab="${tab}"]`);
        await checkRow(page, '#visitPageActions', labels);
      }
    }
    console.log('PASS: Equal action sizes, visible labels and Benefit Claim navigation in both themes at four phone widths.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
