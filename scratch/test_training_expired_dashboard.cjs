const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');
const index = pathToFileURL(path.join(__dirname, '../modules/training-competency/index.html')).href;
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 420, height: 940 });
    const click = selector => page.click(selector);
    const total = () => page.$eval('#trainingExpiredTotal', node => node.textContent);
    await page.goto(`${index}?scope=team&theme=light`, { waitUntil: 'domcontentloaded' });
    assert.ok(await page.$('#trainingExpiredCompetencies'), 'Team dashboard contains an expired competencies summary');
    assert.equal(await total(), '9');
    assert.match(await page.$eval('#trainingExpiredSummaryNote', node => node.textContent), /7 employees.*3 competencies/);
    assert.deepEqual(await page.$$eval('[data-expired-competency]', nodes => nodes.map(node => [node.dataset.expiredCompetency, node.querySelector('.tec-row-count').textContent])), [['first-aid', '4'], ['forklift-operation', '3'], ['electrical-safety', '2']]);
    assert.equal(await page.$eval('#trainingExpiredCompetencies', node => node.previousElementSibling.querySelector('h2').textContent), 'Quick Options');
    await click('[data-expired-competency="first-aid"]');
    assert.equal(await page.$eval('#trainingExpiredDetailTitle', node => node.textContent), 'First Aid');
    assert.equal(await page.$eval('#trainingCompetencyTeamPanel', node => node.hidden), false);
    assert.deepEqual(await page.$$eval('[data-expired-level]', nodes => nodes.map(node => [node.dataset.expiredLevel, node.textContent.trim()])), [['all', 'All4'], ['1', 'Level 12'], ['2', 'Level 22']]);
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 4);
    assert.deepEqual(await page.$$eval('.tec-employee-card time', nodes => nodes.map(node => node.dateTime)), ['2026-08-31', '2026-09-15', '2026-09-23', '2026-09-30']);
    assert.equal(await page.$eval('.tec-employee-name', node => node.textContent), 'E001234 - Ahmad Faizal');
    assert.ok(await page.$eval('.tec-overdue', node => /^\d+ days? overdue$/.test(node.textContent)));
    await click('[data-expired-level="2"]');
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 2);
    assert.equal(await page.$eval('[data-expired-level="2"]', node => node.getAttribute('aria-current')), 'true');
    await page.goto(`${index}?scope=team&theme=light&expiredSkill=first-aid&expiredLevel=2`, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 2);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await click('#trainingExpiredClose');
    assert.equal(await total(), '9');
    assert.equal(await page.$eval('#trainingCompetencyTabTeam', node => node.getAttribute('aria-selected')), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    assert.equal(await page.$eval('#trainingExpiredOverlay', node => node.hidden), true);
    for (const [skill, count] of [['forklift-operation', 3], ['electrical-safety', 2]]) {
      await page.goto(`${index}?scope=team&expiredSkill=${skill}&theme=light`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), count);
    }
    await page.goto(`${index}?scope=team&expiredSkill=missing`, { waitUntil: 'domcontentloaded' });
    assert.match(await page.$eval('#trainingExpiredEmployees', node => node.textContent), /unavailable/i);
    await page.goto(`${index}?scope=team&expiredSkill=first-aid&expiredLevel=5`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$$eval('.tec-employee-card', nodes => nodes.length), 0);
    assert.match(await page.$eval('#trainingExpiredEmployees', node => node.textContent), /No expired/);
    for (const theme of ['dark', 'light']) for (const width of [360, 420]) {
      await page.setViewport({ width, height: 940 });
      await page.goto(`${index}?scope=team&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(__dirname, `training-expired-dashboard-${theme}-${width}.png`) });
      assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
      await click('[data-expired-competency="first-aid"]');
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1));
      await page.screenshot({ path: path.join(__dirname, `training-expired-detail-${theme}-${width}.png`) });
    }
    await page.goto(`${index}?scope=individual`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.$eval('#trainingExpiredCompetencies', node => node.getClientRects().length), 0);
    assert.equal(await page.$eval('#trainingCalendarSection', node => node.getClientRects().length > 0), true);
    assert.deepEqual(errors, []);
    console.log('PASS: expired competency dashboard totals, drilldowns, level filters, oldest-first order, return/refresh, themes and responsive layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
