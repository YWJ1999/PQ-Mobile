const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pages = fs.globSync(['*.html', 'modules/**/*.html'], { cwd: root })
  .filter(file => /\bdraft\b/i.test(fs.readFileSync(path.join(root, file), 'utf8')));

async function checkDraftActions(page, file, theme) {
  await page.goto(pathToFileURL(path.join(root, file)).href + '?theme=' + theme, { waitUntil: 'load' });
  if (path.basename(file) === 'medical-claim.html') {
    // The treatment editor creates its action row when opened.
    await page.evaluate(() => {
      openMedicalClaimForm();
      openCategoryItems('treatment');
      openEntryForm('edit', 0);
    });
    await page.waitForSelector('#v4BottomActions button[onclick="saveDraft()"]', { visible: true });
  }

  const buttons = await page.$$eval('button, a, input[type="button"], input[type="submit"]', nodes => nodes
    .filter(node => !node.matches('.cal-filter-option-pill'))
    .filter(node => /^(?:save (?:as )?)?draft$/i.test((node.getAttribute('aria-label') || node.textContent || node.value || '').trim()))
    .map(node => {
      const style = getComputedStyle(node);
      return { id: node.id || node.getAttribute('onclick'), background: style.backgroundImage, fill: style.backgroundColor, text: style.color };
    }));
  if (path.basename(file) === 'guest-visit.html') assert.equal(buttons.length, 3);
  if (path.basename(file) === 'medical-claim.html') assert.equal(buttons.length, 2);
  if (buttons.length) assert.equal(await page.$eval('html', html => html.dataset.theme), theme, file);
  for (const button of buttons) {
    const label = `${file} ${theme} ${button.id || 'Save Draft'}`;
    if (button.background === 'none') {
      assert.equal(button.fill, 'rgb(124, 58, 237)', label);
    } else {
      assert.match(button.background, /^linear-gradient\(135deg, rgb\(124, 58, 237\)(?: 0%)?, rgb\(109, 40, 217\)(?: 100%)?\)$/, label);
    }
    assert.equal(button.text, 'rgb(255, 255, 255)', label);
  }
  return buttons.length;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    let count = 0, pageCount = 0;
    for (const file of pages) {
      const light = await checkDraftActions(page, file, 'light');
      assert.equal(await checkDraftActions(page, file, 'dark'), light, file);
      if (light) pageCount++;
      count += light;
    }
    console.log(`PASS: ${count} purple Draft and Save Draft actions on ${pageCount} pages in both themes.`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
