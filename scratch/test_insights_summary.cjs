const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const screenshotDir = path.join(require('node:os').tmpdir(), 'pq-insight-detail-verification');
require('node:fs').mkdirSync(screenshotDir, { recursive: true });

// Expected memberships are taken from the existing metric percentage changes.
// A negative metric improves when its value falls; a zero change is unchanged
// even when an existing badge happens to be colored green.
const expected = {
  my: {
    positive: {
      improved: ['Attendance%'],
      worsened: [],
      unchanged: ['Competency Match%', 'Goal Achievement%', 'Work Incident Points']
    },
    negative: {
      improved: [],
      worsened: ['Unauthorised OT Count'],
      unchanged: ['Odd Clocking Count', 'Late In Count', 'Absent Count', 'Emergency Leave Count', 'Medical Leave Count', 'OT Absent Count', 'Training Absent Count', 'Warning Letter Count', 'Unacknowledged Letter Count']
    }
  },
  team: {
    positive: {
      improved: ['Avg Competency Match%'],
      worsened: ['Avg Attendance%'],
      unchanged: ['Avg Goal Achievement%']
    },
    negative: {
      improved: ['Avg Odd Clocking Count', 'Avg Late In Count', 'Avg Absent Count', 'Avg Unauthorised OT Count'],
      worsened: ['Avg Medical Leave Count'],
      unchanged: ['Avg Emergency Leave Count', 'Avg OT Absent Count', 'Avg Training Absent Count', 'Avg Early Out Count']
    }
  }
};
const scopes = ['my', 'team'];
const groups = ['positive', 'negative'];
const trends = ['improved', 'worsened', 'unchanged'];
const namesFor = (scope, group) => Object.values(expected[scope][group]).flat().sort();
const allNames = scope => groups.flatMap(group => namesFor(scope, group)).sort();
const paneFor = scope => scope === 'my' ? '#paneMy' : '#paneTeam';
const pillFor = scope => scope === 'my' ? '#pillMy' : '#pillTeam';
const categoryButton = group => `#indicatorsOverlay .sheet-filter-pill[data-group="${group}"]`;
const trendButton = trend => `#indicatorsOverlay .insight-trend-filters .sheet-filter-pill[data-trend="${trend}"]`;

async function closeSheet(page) {
  await page.click('#indicatorsOverlay .sheet-close-btn');
  await page.waitForFunction(() => !document.getElementById('indicatorsOverlay').classList.contains('active'));
}

async function visibleNames(page, scope) {
  await page.waitForFunction(() => {
    const overlay = document.getElementById('indicatorsOverlay');
    const sheet = overlay.querySelector('.indicators-sheet');
    return overlay.classList.contains('active') && getComputedStyle(overlay).opacity === '1'
      && new DOMMatrix(getComputedStyle(sheet).transform).m42 === 0;
  });
  const focused = await page.$eval('#indicatorsOverlay', el => el.classList.contains('insight-detail-breakdown'));
  if (focused) return page.$$eval('#insightBreakdownCards .insight-detail-metric', cards => cards.map(card => card.dataset.metricName).sort());
  return page.$$eval(`#${scope}IndicatorsFeed .metric-feed-card`, cards => cards
    .filter(card => card.getClientRects().length > 0)
    .map(card => card.querySelector('h5').textContent.trim()).sort());
}

async function assertSummary(page, scope, context) {
  await page.click(pillFor(scope));
  await page.waitForFunction(selector => getComputedStyle(document.querySelector(selector)).opacity === '1', {}, paneFor(scope));
  assert.equal(await page.$eval('#insightCardTitle', el => el.textContent.trim()), scope === 'my' ? 'My Insights' : 'Team Insights', context);
  assert.equal(await page.$eval('#insightMetricCount', el => el.textContent.trim()), `${allNames(scope).length} metrics`, context);
  for (const other of scopes) {
    assert.equal(await page.$eval(pillFor(other), el => el.getAttribute('aria-pressed')), String(other === scope), context);
    assert.equal(await page.$eval(paneFor(other), el => el.hidden), other !== scope, context);
  }
  for (const group of groups) {
    const column = `${paneFor(scope)} .insight-metric-group[data-group="${group}"]`;
    assert.equal(await page.$eval(`${column} .insight-group-count`, el => Number(el.textContent)), namesFor(scope, group).length, context);
    for (const trend of trends) {
      assert.equal(await page.$eval(`${column} [data-trend="${trend}"] .insight-trend-count`, el => Number(el.textContent)), expected[scope][group][trend].length, `${context}: ${group} ${trend}`);
    }
  }
  const layout = await page.$eval('.insights-card', card => {
    const bounds = card.getBoundingClientRect();
    const visibleChildren = [...card.querySelectorAll('button, .insight-metric-group')].filter(el => el.getClientRects().length);
    return {
      overflow: card.scrollWidth > card.clientWidth + 1,
      clipped: visibleChildren.some(el => {
        const rect = el.getBoundingClientRect();
        return rect.left < bounds.left || rect.right > bounds.right || el.scrollWidth > el.clientWidth + 1;
      }),
      rows: card.querySelectorAll('.insight-tab-pane.active .insight-trend-row').length,
      mainOverflow: document.querySelector('.main-content').scrollWidth > document.querySelector('.main-content').clientWidth + 1
    };
  });
  assert.deepEqual(layout, { overflow: false, clipped: false, rows: 6, mainOverflow: false }, context);
}

async function assertDrilldowns(page, scope, context) {
  await assertSummary(page, scope, context);
  for (const group of groups) {
    const column = `${paneFor(scope)} .insight-metric-group[data-group="${group}"]`;
    await page.click(`${column} .insight-group-header`);
    assert.deepEqual(await visibleNames(page, scope), namesFor(scope, group), `${context}: group header ${group}`);
    await closeSheet(page);
    for (const trend of trends) {
      await page.click(`${column} .insight-trend-row[data-trend="${trend}"]`);
      assert.equal(await page.$eval('#indicatorsOverlay', el => el.classList.contains('active')), true);
      assert.deepEqual(await visibleNames(page, scope), [...expected[scope][group][trend]].sort(), `${context}: ${group}/${trend} membership`);
      assert.equal(await page.$eval(categoryButton(group), el => el.classList.contains('active')), true, 'Selected category');
      assert.equal(await page.$eval(trendButton(trend), el => el.classList.contains('active')), true, 'Selected trend');
      assert.equal(await page.$eval('#indicatorEmptyState', el => el.getClientRects().length > 0), expected[scope][group][trend].length === 0, 'Empty state');
      const labels = await page.$$eval(`#${scope}IndicatorsFeed .feed-section-label`, els => els.filter(el => el.getClientRects().length).map(el => el.dataset.group));
      assert.deepEqual(labels, [], 'Focused sheet hides original section headings');
      {
        const count = expected[scope][group][trend].length;
        assert.equal(await page.$eval('#indicatorsSheetTitle', el => el.textContent), { improved: 'Improved', worsened: 'Worsened', unchanged: 'No change' }[trend]);
        assert.equal(await page.$eval('#indicatorsSheetSubtitle', el => el.textContent), `${scope === 'team' ? 'Team averages' : 'My'} · ${group === 'positive' ? 'Positive' : 'Negative'} · ${count} ${count === 1 ? 'metric' : 'metrics'}`);
        assert.equal(await page.$eval(categoryButton('all'), el => el.getClientRects().length), 0, 'Focused sheet hides category filters');
        for (const width of [320, 390, 420]) {
          await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
          const layout = await page.$eval('#indicatorsOverlay .indicators-sheet', sheet => ({
            overflow: sheet.scrollWidth > sheet.clientWidth,
            cardOverflow: [...sheet.querySelectorAll('.insight-detail-metric')].some(card => card.scrollWidth > card.clientWidth),
            scrolls: sheet.querySelector('.sheet-list-scroll').scrollHeight > sheet.querySelector('.sheet-list-scroll').clientHeight
          }));
          assert.equal(layout.overflow, false, `${width}: sheet fits`);
          assert.equal(layout.cardOverflow, false, `${width}: cards fit`);
          if (count >= 4) {
            assert.equal(layout.scrolls, true, 'Long list scrolls');
            assert.equal(await page.$eval('#indicatorsListContainer', list => {
              list.scrollTop = list.scrollHeight;
              const last = list.querySelector('.insight-detail-metric:last-child');
              const reachable = last.getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom + 1;
              list.scrollTop = 0;
              return reachable;
            }), true, 'Final metric is reachable');
          }
          if (width === 390 && count) await page.screenshot({ path: path.join(screenshotDir, `${scope}-insight-${context.split(' ')[0]}-${group}-${trend}.png`) });
        }
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
        if (scope === 'my' && group === 'positive' && trend === 'improved') {
          assert.equal(await page.$eval('.insight-detail-current', el => el.textContent), '95.00%');
          assert.equal(await page.$eval('.insight-detail-change strong', el => el.textContent), '+4.21%');
        }
        if (scope === 'my' && group === 'negative' && trend === 'worsened') {
          assert.equal(await page.$eval('.insight-detail-current', el => el.textContent), '17times');
          assert.equal(await page.$eval('.insight-detail-change strong', el => el.textContent), '+11.76%');
        }
        if (scope === 'team') {
          const teamDetails = {
            positive: {
              improved: [['Competency match', '4.53pts', '+100.00%']],
              worsened: [['Attendance rate', '69.39%', '-1.04%']],
              unchanged: [['Goal achievement', '0.00%', '0.00%']]
            },
            negative: {
              improved: [['Odd clocking', '0.37avg', '-56.76%'], ['Late arrivals', '2.80times', '-12.50%'], ['Absences', '8.51days', '-1.76%'], ['Unauthorised overtime', '11.63hrs', '-1.03%']],
              worsened: [['Medical leave', '0.30days', '+16.67%']],
              unchanged: [['Emergency leave', '0.00leaves', '0.00%'], ['Overtime absences', '0.00times', '0.00%'], ['Training absences', '0.00courses', '0.00%'], ['Early departures', '0.00early', '0.00%']]
            }
          };
          assert.deepEqual(await page.$$eval('#insightBreakdownCards article', cards => cards.map(card => [
            card.querySelector('h5').textContent,
            card.querySelector('.insight-detail-current').textContent,
            card.querySelector('.insight-detail-change strong').textContent
          ])), teamDetails[group][trend], 'Team card titles, values, units and changes match references');
          assert.equal(await page.$$eval('#insightBreakdownCards article', cards => cards.every(card => card.querySelector('.insight-detail-value-label').textContent === 'Team average')), true);
        }
        // Reopening the full feed restores its original presentation and filters.
        await closeSheet(page);
        await page.evaluate(scope => openIndicatorsModal(scope), scope);
        assert.equal(await page.$eval('#indicatorsOverlay', el => el.classList.contains('insight-detail-breakdown')), false);
      }
      // All must clear both filters, including a zero-match status.
      await page.click(categoryButton('all'));
      assert.deepEqual(await visibleNames(page, scope), allNames(scope), `${context}: All restores the full feed`);
      assert.equal(await page.$eval(trendButton('all'), el => el.classList.contains('active')), true);
      await closeSheet(page);
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(10000);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    for (const theme of ['light', 'dark']) {
      const url = pathToFileURL(path.resolve(`home${theme}.html`)).href;
      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 390, 420]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        for (const scope of scopes) {
          await assertSummary(page, scope, `${theme} ${width}px ${scope}`);
          if (width === 390) {
            await page.screenshot({ path: path.join(screenshotDir, `insights-${theme}-${scope}.png`) });
            const card = await page.$('.insights-card');
            await card.screenshot({ path: path.join(screenshotDir, `insights-card-${theme}-${scope}.png`) });
          }
        }
      }
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      for (const scope of scopes) await assertDrilldowns(page, scope, `${theme} ${scope}`);
      // Native buttons support keyboard activation for both scope and status.
      await page.focus('#pillMy');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#paneMy', el => el.hidden), false);
      await page.focus('#paneMy .insight-metric-group[data-group="positive"] .insight-trend-row[data-trend="improved"]');
      await page.keyboard.press('Enter');
      assert.deepEqual(await visibleNames(page, 'my'), ['Attendance%']);
      await closeSheet(page);
      // Existing callers must continue to open all metrics without stale filters.
      await page.evaluate(() => openIndicatorsModal('team'));
      assert.deepEqual(await visibleNames(page, 'team'), allNames('team'));
      await closeSheet(page);
      for (const scope of scopes) {
        await page.goto(`${url}?tab=${scope}&indicators=${scope}`, { waitUntil: 'load' });
        await page.waitForFunction(() => document.getElementById('indicatorsOverlay').classList.contains('active'));
        assert.deepEqual(await visibleNames(page, scope), allNames(scope), `${theme}: preserved ${scope} deep link`);
        await closeSheet(page);
        assert.equal(await page.$eval(pillFor(scope), el => el.getAttribute('aria-pressed')), 'true');
      }
      console.log(`PASS ${theme}: 320/390/420px layout, both scopes, all 12 status drill-downs, exact metric membership, empty state, reset, keyboard and deep links`);
    }
    assert.deepEqual(errors, [], 'No browser runtime errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
