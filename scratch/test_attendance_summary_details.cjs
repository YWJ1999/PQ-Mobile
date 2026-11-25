const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const individualDialog = '#attendanceDetailsModalOverlay';
const panel = 'button.attendance-record-summary-panel';

async function checkAttendance(browser, desktopUrl) {
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(8000);
    await page.setViewport(desktopUrl
      ? { width: 1440, height: 900, hasTouch: true }
      : { width: 390, height: 820, isMobile: true, hasTouch: true });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const external = /^https?:/.test(request.url()) && (!desktopUrl || new URL(request.url()).origin !== new URL(desktopUrl).origin);
      return external ? request.abort() : request.continue();
    });
    if (desktopUrl) {
      await page.goto(desktopUrl);
      await page.waitForSelector('.enterprise-shell');
    }
    async function openPage(name) {
      const file = 'modules/attendance/options/' + name + '.html';
      await page.goto(desktopUrl ? new URL('/workspace/' + file, desktopUrl).href : pathToFileURL(path.resolve(__dirname, '..', file)).href);
      if (desktopUrl) await page.waitForSelector('.business-outlet');
      await page.waitForSelector(panel, { visible: true });
    }
    async function details() {
      await page.waitForSelector(individualDialog, { visible: true });
      return page.$$eval(individualDialog + ' .attendance-details-main > div', rows =>
        Object.fromEntries(rows.map(row => [row.firstElementChild.textContent.trim(), row.lastElementChild.textContent.trim()])));
    }
    async function closeIndividual() {
      await page.click(individualDialog + ' .modal-close-round');
      await page.waitForSelector(individualDialog, { hidden: true });
    }
    await openPage('attendance');
    await page.click('#meJumpBar .me-jump-pill:nth-child(3)');
    const client = await page.createCDPSession();
    const { root } = await client.send('DOM.getDocument');
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: panel });
    const { nodes: [accessiblePanel] } = await client.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
    assert.equal(accessiblePanel.role.value, 'button');
    assert.match(accessiblePanel.name.value, /attendance details.*Clock Times.*07:38/i);
    await client.detach();
    if (!desktopUrl) {
      const start = await page.$eval(panel, node => {
        node.scrollIntoView({ block: 'center', behavior: 'instant' });
        const rect = node.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, scroll: node.closest('.main-content').scrollTop };
      });
      const touch = await page.touchscreen.touchStart(start.x, start.y);
      await touch.move(start.x, start.y - 40);
      await touch.move(start.x, start.y - 100);
      await touch.end();
      await page.waitForFunction(top => document.querySelector('.main-content').scrollTop > top, {}, start.scroll);
      await page.waitForSelector(individualDialog, { hidden: true });
      await page.waitForFunction(() => {
        const node = document.querySelector('.main-content');
        const top = node.scrollTop;
        return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(node.scrollTop === top))));
      });
    }
    const cards = await page.$$eval('.attendance-record-card', nodes => nodes.map(node => node.dataset.date));
    for (const date of cards) {
      const card = '.attendance-record-card[data-date="' + date + '"]';
      const summary = card + ' ' + panel;
      const expected = await page.$$eval(summary + ' strong', nodes => nodes.map(node => node.textContent.trim()));
      const status = await page.$eval(card + ' .attendance-exception-status', node => node.textContent.trim());
      const verified = await page.$eval(card + ' .attendance-verify-button', node => node.getAttribute('aria-pressed'));
      await page.tap(summary + ' .attendance-record-detail:nth-child(2) strong');
      const opened = await details();
      assert.deepEqual([opened['Day Type'], opened['Clock Times'], opened['Normal Hours'], opened.Exception], [...expected.slice(0, 3), status]);
      assert.ok(opened.Date.includes(Number(date.slice(-2)) + ' Sep 2026'));
      if (status === 'Unapproved OT') assert.equal(opened['Unapproved OT Hours'], expected[3]);
      if (status === 'Late In') assert.equal(opened['Late In'], '12 minutes');
      await closeIndividual();
      await page.focus(card + ' .attendance-card-details-trigger');
      await page.keyboard.press('Enter');
      assert.deepEqual(await details(), opened);
      await closeIndividual();
      assert.equal(await page.$eval(card + ' .attendance-verify-button', node => node.getAttribute('aria-pressed')), verified);
    }
    // The empty padding between the edge and the first field is part of the target.
    const point = await page.$eval(panel, node => {
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = node.getBoundingClientRect();
      return { x: rect.left + 5, y: rect.top + rect.height / 2 };
    });
    await page.touchscreen.tap(point.x, point.y);
    await details();
    await closeIndividual();
    await page.focus(panel);
    await page.keyboard.press('Space');
    await details();
    await page.keyboard.press('Escape');
    await page.waitForSelector(individualDialog, { hidden: true });
    await page.waitForFunction(selector => document.activeElement.matches(selector), {}, panel);
    const wasVerified = await page.$eval('.attendance-verify-button', node => node.getAttribute('aria-pressed'));
    await page.tap('.attendance-verify-button');
    assert.notEqual(await page.$eval('.attendance-verify-button', node => node.getAttribute('aria-pressed')), wasVerified);
    await page.waitForSelector(individualDialog, { hidden: true });
    const actionCard = '.attendance-record-card[data-exception="unapproved-ot"]';
    const date = await page.$eval(actionCard + ' time', node => node.textContent.replace(',', ''));
    const shift = await page.$eval(actionCard + ' .attendance-day-shift', node => node.textContent);
    for (const [action, dialog, dateField, shiftField] of [
      ['.btn-shift-change', '#shiftChangeModalOverlay', '#shiftMetaDate', '#shiftMetaOriginal'],
      ['.btn-feedback', '#feedbackModalOverlay', '#fbMetaDate', '#fbMetaShift']
    ]) {
      await page.tap(actionCard + ' ' + action);
      await page.waitForSelector(dialog, { visible: true });
      await page.waitForSelector(individualDialog, { hidden: true });
      assert.equal(await page.$eval(dateField, node => node.textContent.replace(',', '')), date);
      assert.equal(await page.$eval(shiftField, node => node.textContent), shift);
      await page.click(dialog + ' button[onclick*="closeModal"]');
      await page.waitForSelector(dialog, { hidden: true });
    }

    await openPage('staff-attendance');
    const second = '.staff-card-item[data-emp-no="000009"]';
    await page.tap(second + ' ' + panel);
    await page.waitForSelector('#detailsModal', { visible: true });
    const staff = await page.$$eval('#detailsModalTableBody tr', rows =>
      Object.fromEntries(rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))));
    assert.ok(staff['Employee #'].endsWith('000009'));
    assert.equal(staff['Clock Times'], '08:22');
    await page.click('#detailsModal .popout-close-btn');
    await page.waitForSelector('#detailsModal', { hidden: true });
    console.log('PASS ' + (desktopUrl ? 'Desktop' : 'Mobile') + ' attendance summary taps and record details');
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  try {
    await checkAttendance(browser);
    if (process.env.WEB_URL) await checkAttendance(browser, process.env.WEB_URL);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
