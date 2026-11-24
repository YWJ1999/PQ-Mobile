const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

function measureSwitch(control) {
  const track = control.getBoundingClientRect();
  const thumb = control.querySelector('.modern-switch-thumb').getBoundingClientRect();
  const style = getComputedStyle(control);
  return {
    state: control.getAttribute('aria-checked'),
    background: style.backgroundColor,
    border: style.borderColor,
    size: [track.width, track.height],
    rightEdge: track.right,
    thumbSize: [thumb.width, thumb.height],
    thumbOnRight: thumb.left + thumb.width / 2 > track.left + track.width / 2
  };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/overtime.html')).href;

    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 360, height: 844, deviceScaleFactor: 1 });
      await page.goto(`${url}?theme=${theme}`, { waitUntil: 'networkidle0' });
      await page.click('#overtimeAddRequest');

      const initial = await page.evaluate(() => {
        const field = document.getElementById('otNeedTransportField');
        const control = document.getElementById('otNeedTransport');
        const label = document.getElementById(control?.getAttribute('aria-labelledby'));
        const creditControl = document.getElementById('otLeaveCredit');
        const credit = creditControl?.closest('.modern-form-group');
        const remarks = document.getElementById('otRemarks')?.closest('.modern-form-group');
        const main = document.querySelector('.main-content');

        if (!field || !label || !control || !credit || !remarks || !main) {
          return null;
        }

        const rowStyle = getComputedStyle(field);

        return {
          label: label.textContent.trim(),
          fieldText: field.innerText.trim(),
          role: control.getAttribute('role'),
          creditLabel: document.getElementById(creditControl.getAttribute('aria-labelledby')).textContent.trim(),
          creditRole: creditControl.getAttribute('role'),
          rowRadius: Number.parseFloat(rowStyle.borderRadius),
          rowHasBackground: rowStyle.backgroundColor !== 'rgba(0, 0, 0, 0)',
          afterCredit: Boolean(credit.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING),
          beforeRemarks: Boolean(field.compareDocumentPosition(remarks) & Node.DOCUMENT_POSITION_FOLLOWING),
          overflow: main.scrollWidth - main.clientWidth
        };
      });

      assert.ok(initial, `${theme}: Need Transport UI is present`);
      assert.equal(initial.fieldText, 'Transport required');
      assert.equal(initial.label, initial.fieldText);
      assert.equal(initial.role, 'switch');
      assert.equal(initial.creditLabel, 'Convert to Leave Credit');
      assert.equal(initial.creditRole, 'switch');
      assert.ok(initial.rowRadius >= 12, `${theme}: transport row has rounded corners`);
      assert.ok(initial.rowHasBackground, `${theme}: transport row has a visible surface`);
      assert.ok(initial.afterCredit && initial.beforeRemarks, `${theme}: transport UI sits between credit and remarks`);
      assert.equal(initial.overflow, 0, `${theme}: transport UI does not overflow at 360px`);

      const creditOff = await page.$eval('#otLeaveCredit', measureSwitch);
      const transportOn = await page.$eval('#otNeedTransport', measureSwitch);
      assert.equal(creditOff.state, 'false');
      assert.equal(creditOff.background, 'rgba(150, 150, 150, 0.25)');
      assert.equal(creditOff.thumbOnRight, false);
      assert.equal(transportOn.state, 'true');
      assert.equal(transportOn.background, 'rgb(16, 185, 129)');
      assert.equal(transportOn.thumbOnRight, true);
      for (const control of [creditOff, transportOn]) {
        assert.deepEqual(control.size, [46, 26]);
        assert.deepEqual(control.thumbSize, [18, 18]);
      }

      await page.focus('#otLeaveCredit');
      await page.keyboard.press('Space');
      assert.deepEqual(await page.$eval('#otLeaveCredit', measureSwitch), transportOn);
      await page.click('#otNeedTransport');
      assert.deepEqual(await page.$eval('#otNeedTransport', measureSwitch), creditOff);
      assert.deepEqual(await page.$eval('#otLeaveCredit', measureSwitch), transportOn);
    }

    assert.deepEqual(pageErrors, []);
    console.log('PASS: Both Request OT switches match in both states and toggle independently in light and dark themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
