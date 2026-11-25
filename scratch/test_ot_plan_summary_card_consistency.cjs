const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const otPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/ot-plan.html')).href;
const shiftPlanUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

async function readCardStyles(page) {
  return page.evaluate(() => {
    const card = document.querySelector('#view-ot-plan-summary .calendar-purple-card');
    const header = card.querySelector('.calendar-purple-card-header');
    const body = card.querySelector('.calendar-purple-card-body');
    const detail = card.querySelector('.calendar-purple-detail');
    const pick = (element, properties) => {
      const styles = getComputedStyle(element);
      return Object.fromEntries(properties.map(property => [property, styles[property]]));
    };

    return {
      card: pick(card, ['display', 'width', 'padding', 'overflow', 'borderRadius', 'backgroundColor']),
      header: pick(header, ['padding', 'backgroundColor', 'color']),
      body: pick(body, ['display', 'gridTemplateColumns', 'gap', 'padding']),
      detail: pick(detail, ['borderRadius', 'backgroundColor'])
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 900 });

    await page.goto(shiftPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabCalendarBtn');
    await page.click('#calSummaryCard [data-kind="ot"]');
    const shiftCardStyles = await readCardStyles(page);
    assert.equal(await page.$$eval('#view-ot-plan-summary .calendar-purple-card', cards => cards.length), 2);
    assert.equal(
      await page.$$eval(
        '#view-ot-plan-summary .calendar-purple-card',
        cards => cards.every(card => card.querySelector('.calendar-purple-card-header .fa-chevron-right'))
      ),
      true
    );

    await page.goto(otPlanUrl + '?theme=light', { waitUntil: 'domcontentloaded' });
    await page.click('#tabCalendarBtn');
    await page.click('#calSummaryCard .is-total');
    const cardSelector = [
      '#view-ot-plan-summary .history-card-item',
      '#view-approved-ot-summary .history-card-item',
      '#view-pending-ot-summary .history-card-item'
    ].join(', ');
    const cards = await page.$$(cardSelector);
    assert.equal(cards.length, 5);
    assert.equal(await page.$$eval(cardSelector, nodes => nodes.every(node => node.classList.contains('calendar-purple-card'))), true);
    assert.equal(await page.$$eval(cardSelector, nodes => nodes.some(node => node.classList.contains('ot-theme'))), false);
    assert.equal(
      await page.$$eval(cardSelector, nodes => nodes.every(node => node.querySelector('.calendar-purple-card-header .fa-chevron-right'))),
      true
    );
    assert.equal(await page.$$eval(cardSelector, nodes => nodes.every(node => node.querySelectorAll('.calendar-purple-detail').length === 3)), true);
    assert.equal(await page.$$eval(cardSelector, nodes => nodes.every(node => node.querySelector('.calendar-purple-detail.full-width'))), true);
    assert.equal(
      await page.$$eval(cardSelector, nodes => nodes.every(node =>
        JSON.stringify([...node.querySelectorAll('.calendar-purple-label')].map(label => label.textContent.trim())) ===
        JSON.stringify(['OT Type', 'Headcount', 'Hours'])
      )),
      true
    );
    assert.deepEqual(await readCardStyles(page), shiftCardStyles);

    await page.click('#view-ot-plan-summary .calendar-purple-card');
    assert.equal(await page.$eval('#view-ot-plan-detail', view => view.classList.contains('active')), true);
    assert.equal(await page.$eval('#otDetailShift', node => node.textContent.trim()), '8.30:17.30W');
    assert.deepEqual(errors, []);

    console.log('OT Plan summary cards use the Shift Planning layout and open employee details.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
