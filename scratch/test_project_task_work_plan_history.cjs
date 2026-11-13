const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const historyUrl = theme => pathToFileURL(
  path.resolve(__dirname, '..', 'modules/project-task/options/history.html')
).href + '?theme=' + theme;

async function setValue(page, selector, value) {
  await page.$eval(selector, (input, nextValue) => {
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function visibleCardIds(page) {
  return page.$$eval('#workPlanHistoryList .project-history-card', cards => cards
    .filter(card => card.getClientRects().length)
    .map(card => card.dataset.recordId));
}

async function waitForFilterOpen(page) {
  await page.waitForSelector('#workPlanHistoryFilterOverlay.is-open');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('workPlanHistoryFilterOverlay');
    const sheet = overlay?.querySelector('.project-history-filter-sheet');
    if (!overlay || !sheet) return false;
    return Math.abs(sheet.getBoundingClientRect().bottom - overlay.getBoundingClientRect().bottom) < 1;
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));

    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(historyUrl(theme), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.documentElement.dataset.projectHistoryReady === 'true');

      assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
      assert.deepEqual(
        await page.$$eval('.project-history-tab', tabs => tabs.map(tab => tab.textContent.trim())),
        ['Work Plan', 'Timesheet']
      );
      assert.equal(await page.$eval('#historyTab-workPlan', tab => tab.getAttribute('aria-selected')), 'true');
      assert.ok(await page.$('#openWorkPlanHistoryFilter[aria-label="Filter Work Plan History"]'));

      await page.click('#openWorkPlanHistoryFilter');
      await waitForFilterOpen(page);
      assert.equal(await page.$$eval('#resetWorkPlanHistoryFilter', buttons => buttons.length), 1);
      assert.equal(await page.$$eval('#closeWorkPlanHistoryFilter', buttons => buttons.length), 1);
      assert.equal(await page.$eval('.project-history-filter-sheet', sheet => sheet.scrollWidth > sheet.clientWidth + 1), false);
      assert.deepEqual(
        await page.$$eval('#workPlanHistoryFilterForm > .project-history-filter-field > label:not(.project-history-checkbox), #workPlanHistoryFilterForm > .project-history-filter-field > .project-history-filter-label', labels => labels.map(label => label.textContent.replace(/\s+/g, ' ').trim())),
        ['Title', 'Description', 'Deadline', 'Scheduled', 'Status', 'Is Overdue']
      );
      assert.equal(
        await page.$$eval('#workPlanHistoryFilterOverlay label', labels => labels.some(label => /^(Start|End)$/.test(label.textContent.trim()))),
        false,
        'Deadline and Scheduled ranges must not show Start or End labels'
      );
      assert.equal(await page.$$eval('#workPlanHistoryFilterOverlay input[type="date"]', inputs => inputs.length), 4);
      assert.equal(await page.$eval('#workPlanFilterOverdue', input => input.type), 'checkbox');
      assert.equal(
        await page.$eval('.project-history-checkbox > span:last-child', label => label.textContent.trim()),
        'Show overdue work plans only'
      );
      const overdueCheckboxStyle = await page.$eval('.project-history-checkbox', checkbox => {
        const style = getComputedStyle(checkbox);
        return {
          display: style.display,
          width: Math.round(checkbox.getBoundingClientRect().width),
          parentWidth: Math.round(checkbox.parentElement.getBoundingClientRect().width),
          minHeight: style.minHeight,
          radius: style.borderRadius,
          background: style.backgroundColor
        };
      });
      assert.equal(overdueCheckboxStyle.display, 'flex');
      assert.ok(Math.abs(overdueCheckboxStyle.width - overdueCheckboxStyle.parentWidth) <= 1);
      assert.equal(overdueCheckboxStyle.minHeight, '48px');
      assert.equal(overdueCheckboxStyle.radius, '16px');
      assert.notEqual(overdueCheckboxStyle.background, 'rgba(0, 0, 0, 0)');

      await setValue(page, '#workPlanFilterTitle', 'Client portal');
      await setValue(page, '#workPlanFilterDescription', 'accessibility');
      await setValue(page, '#workPlanFilterDeadlineFrom', '2026-10-20');
      await setValue(page, '#workPlanFilterDeadlineTo', '2026-10-25');
      await setValue(page, '#workPlanFilterScheduledFrom', '2026-10-01');
      await setValue(page, '#workPlanFilterScheduledTo', '2026-10-31');
      await page.select('#workPlanFilterStatus', 'submitted');
      await page.$eval('#applyWorkPlanHistoryFilter', button => button.click());
      assert.deepEqual(await visibleCardIds(page), ['WP-2026-0048']);
      assert.match(await page.$eval('#workPlanHistoryFilterSummary', node => node.textContent), /Client portal/);
      assert.match(await page.$eval('#workPlanHistoryFilterSummary', node => node.textContent), /Pending/);

      await page.click('#openWorkPlanHistoryFilter');
      await waitForFilterOpen(page);
      await page.$eval('#resetWorkPlanHistoryFilter', button => button.click());
      assert.equal((await visibleCardIds(page)).length, 2);
      await page.click('#closeWorkPlanHistoryFilter');

      await page.click('#historyTab-timesheet');
      assert.equal(await page.$eval('#historyTab-timesheet', tab => tab.getAttribute('aria-selected')), 'true');
      assert.equal(await page.$eval('#timesheetHistoryPanel', panel => panel.hidden), false);
      assert.equal(await page.$eval('#workPlanHistoryPanel', panel => panel.hidden), true);
      await page.click('#historyTab-workPlan');
      assert.equal(await page.$eval('#workPlanHistoryPanel', panel => panel.hidden), false);

      assert.equal(await page.$eval('.phone-container', node => node.scrollWidth > node.clientWidth + 1), false);
    }

    assert.deepEqual(faults, []);
    console.log('PASS: Work Plan History exposes the requested filter fields and applies every filter.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
