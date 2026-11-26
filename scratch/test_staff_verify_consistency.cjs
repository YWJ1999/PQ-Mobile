const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const controlProperties = ['display', 'flexDirection', 'alignItems', 'gap', 'padding', 'borderWidth', 'borderStyle', 'backgroundColor'];
const labelProperties = ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'textTransform', 'whiteSpace'];
const boxProperties = ['width', 'height', 'borderRadius', 'borderWidth', 'borderStyle', 'backgroundColor'];
const pageUrl = file => pathToFileURL(path.resolve(__dirname, `../modules/attendance/options/${file}`)).href;

async function snapshot(page, selectors) {
  return page.evaluate(({ selectors, controlProperties, labelProperties, boxProperties }) => {
    const styles = (selector, properties) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      return Object.fromEntries(properties.map(property => [property, style[property]]));
    };
    return {
      control: styles(selectors.control, controlProperties),
      label: styles(selectors.label, labelProperties),
      box: styles(selectors.box, boxProperties)
    };
  }, { selectors, controlProperties, labelProperties, boxProperties });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 390, 420]) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await page.goto(`${pageUrl('attendance.html')}?theme=${theme}`, { waitUntil: 'networkidle0' });
        const individual = {
          all: await snapshot(page, { control: '.verify-btn-all', label: '#verifyAllText', box: '.verify-all-box' }),
          single: await snapshot(page, { control: '.attendance-verify-button', label: '[data-verify-label]', box: '.verify-checkbox-box' })
        };

        await page.goto(`${pageUrl('staff-attendance.html')}?theme=${theme}`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('.staff-card-item .staff-verify-control');
        const staff = {
          all: await snapshot(page, { control: '.verify-all-wrap', label: '.verify-all-wrap > span:last-child', box: '.verify-all-wrap .staff-verify-box' }),
          single: await snapshot(page, { control: '.staff-verify-control', label: '.staff-verify-control .staff-verify-label', box: '.staff-verify-control .staff-verify-box' })
        };

        assert.deepEqual(staff.all, individual.all, `${theme} ${width}px: Staff Verify All matches Individual Attendance`);
        assert.deepEqual(staff.single, individual.single, `${theme} ${width}px: Staff Verify matches Individual Attendance`);
        assert.equal(await page.$eval('.staff-card-item', card => card.scrollWidth > card.clientWidth), false, `${theme} ${width}px: controls fit the card`);

        await page.click('.staff-card-item .staff-verify-control');
        assert.equal(await page.$eval('.staff-card-item .staff-verify-checkbox', node => node.checked), true, `${theme} ${width}px: Verify remains functional`);
        const checkboxLabel = await page.$eval('.staff-card-item .staff-verify-control', label => ({
          visibleText: label.textContent.trim(), accessibleName: label.control.getAttribute('aria-label')
        }));
        assert.deepEqual(checkboxLabel, { visibleText: '', accessibleName: 'Verify attendance for Aqilah antasha, 20 Sep 2026' });
        await page.click('.verify-all-wrap > span:last-child');
        assert.equal(await page.$$eval('.staff-card-item .staff-verify-checkbox', nodes => nodes.every(node => node.checked)), true, `${theme} ${width}px: Verify All remains functional`);
        assert.equal(await page.$eval('#staffVerifyAllText', node => node.textContent.trim()), 'Verified All', `${theme} ${width}px: verified-all label matches Individual Attendance`);
        await page.close();
      }
    }

    console.log('PASS: Staff verification controls match Individual Attendance without outer pills.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
