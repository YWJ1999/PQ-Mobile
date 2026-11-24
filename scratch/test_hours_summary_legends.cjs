const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const present = ['Attendance status', 'Normal', 'Unapproved OT'];
const individualLegends = {
  'Scheduled Work Days': ['Attendance status', 'Normal', 'Unapproved OT', 'Absent'],
  'Normal Present Days': present,
  'Normal Work Hours': present,
  'Odd Clocking Days': ['Clocking exception', 'Odd Clocking', 'Missing Clock Out'],
  'Normal OT Hours': ['Overtime status', 'Approved OT'],
  'Other OT Hours': ['Overtime status', 'Approved OT'],
  'Unapproved OT Hours': ['Overtime status', 'Unapproved OT'],
  'Plan OT Hours': ['Overtime status', 'Planned OT'],
  'Absent OT Hours': ['Overtime status', 'Absent OT'],
  'Absent Days': ['Attendance status', 'Absent'],
  'Leave Hours': null,
  'Lost Hours': null
};
const individualColors = {
  Normal: 'theme-green', 'Unapproved OT': 'theme-orange', Absent: 'theme-red',
  'Odd Clocking': 'theme-orange', 'Missing Clock Out': 'theme-red', 'Missing Clock In': 'theme-blue',
  'Approved OT': 'theme-green',
  'Planned OT': 'theme-blue', 'Absent OT': 'theme-red'
};
const individualCardCounts = {
  'Scheduled Work Days': { Normal: 18, 'Unapproved OT': 3, Absent: 1 },
  'Normal Present Days': { Normal: 18, 'Unapproved OT': 3 },
  'Normal Work Hours': { Normal: 18, 'Unapproved OT': 3 },
  'Odd Clocking Days': { 'Odd Clocking': 7, 'Missing Clock Out': 1 },
  'Normal OT Hours': { 'Approved OT': 1 }, 'Other OT Hours': { 'Approved OT': 1 },
  'Unapproved OT Hours': { 'Unapproved OT': 7 }, 'Plan OT Hours': { 'Planned OT': 10 },
  'Absent OT Hours': { 'Absent OT': 2 }, 'Absent Days': { Absent: 9 },
  'Leave Hours': { '': 8 }, 'Lost Hours': { '': 8 }
};
const staffDailyAttendance = ['Attendance status', 'Normal', 'Odd Clocking', 'Unapproved OT'];
const staffLegends = {
  ...individualLegends,
  'Scheduled Work Days': ['Attendance status', 'Normal'],
  'Normal Present Days': ['Attendance rate', 'Over 90%', '60–90%', '30–59%', 'Below 30%'],
  'Normal Work Hours': ['Attendance status', 'Normal'],
  'Odd Clocking Days': ['Clocking exception', 'Odd Clocking'],
  'Leave Hours': ['Leave status', 'On Leave'],
  'Lost Hours': null
};

function checkUnlabelledCard(metric, card) {
  assert.ok(!card.label, metric);
  if (metric === 'Lost Hours' || metric === 'Leave Hours') {
    assert.ok(card.purple, metric);
    assert.match(card.fill, /^linear-gradient\(/, metric);
  } else {
    assert.ok(card.neutral, metric);
    assert.equal(card.fill, 'none', metric);
  }
}

function checkIndividualCards(metric, { rows, cards }) {
  const counts = {};
  for (const row of rows) assert.equal(row.tone, individualColors[row.label], metric);
  for (const card of cards) {
    const label = card.label || '';
    counts[label] = (counts[label] || 0) + 1;
    if (label) assert.ok(!card.neutral, metric);
    else checkUnlabelledCard(metric, card);
  }
  assert.deepEqual(counts, individualCardCounts[metric], metric);
}

async function checkPresentDaySubsets(page, button, back) {
  const title = 'Normal Present Days';
  await page.evaluate(() => {
    const exceptions = sampleWorkDays.filter(day => day.exception !== '-');
    sampleWorkDays.splice(0, sampleWorkDays.length, ...exceptions);
  });
  await button.click();
  assert.equal(await checkLegend(page, '#details-list-container', title, ['Attendance status', 'Unapproved OT']), 3);
  await page.evaluate(() => {
    const absences = sampleWorkDays.filter(day => day.absent === 'Yes');
    sampleWorkDays.splice(0, sampleWorkDays.length, ...absences);
    renderDetailsList('Normal Present Days');
  });
  assert.equal(await checkLegend(page, '#details-list-container', title, null), 0);
  await page.click(back);
}

async function checkScheduledDayExamples(page, button) {
  const title = 'Scheduled Work Days';
  const examples = [
    ['Normal', { exception: 'No Exception', lateIn: '00:12', leaveInfo: 'Annual Leave' }],
    ['Normal', { approvedOt: '0.50', timeOff: '01:00' }],
    ['Absent', { absent: 'Yes' }]
  ];
  await page.evaluate(records => {
    sampleWorkDays.splice(0, sampleWorkDays.length, ...records.map(record => ({
      ...attendanceRecordDefaults, day: 'Mon', fullDate: '14 Sep 2026', ...record
    })));
  }, examples.map(([, record]) => record));
  await button.click();
  await checkLegend(page, '#details-list-container', title, ['Attendance status', 'Normal', 'Absent'], (_, { cards }) => {
    assert.deepEqual(cards.map(card => card.label), examples.map(([label]) => label));
  });
  await page.evaluate(() => {
    sampleWorkDays.length = 1;
    sampleWorkDays[0].exception = 'Late In';
    renderDetailsList('Scheduled Work Days');
  });
  await checkLegend(page, '#details-list-container', title, ['Attendance status', 'Late In']);
  await page.evaluate(() => {
    sampleWorkDays.length = 0;
    renderDetailsList('Scheduled Work Days');
  });
  assert.equal(await checkLegend(page, '#details-list-container', title, null), 0);
}

async function checkRemainingMetricEvidence(page, buttons, metrics, back) {
  async function checkOption(metric, expected, inspect) {
    await buttons[metrics.indexOf(metric)].click();
    await checkLegend(page, '#details-list-container', metric, expected, inspect);
    await page.click(back);
  }

  await page.evaluate(() => {
    function replace(records, fields) {
      records.splice(0, records.length, { ...attendanceRecordDefaults, day: 'Mon', fullDate: '14 Sep 2026', ...fields });
    }
    replace(sampleWorkDays, { unapprovedOt: '00:20' });
    replace(sampleOtherOtDays, { otherOt: '0.00', approvedOt: '2.00' });
    replace(sampleUnapprovedOtDays, { approvedOt: '2.00' });
    replace(samplePlanOtDays, { planHours: '0.00', approvedOt: '2.00' });
    replace(sampleAbsentOtDays, { absent: 'Yes', absentHours: '00:00' });
    replace(sampleAbsentDays, { leaveInfo: 'Annual Leave' });
    replace(sampleOddClockingDays, { exception: 'Unapproved OT' });
    replace(sampleLostDays, { lostHours: '2.00', exception: 'Unapproved OT', lateIn: '00:00' });
  });
  await checkOption('Normal Work Hours', ['Attendance status', 'Unapproved OT']);
  for (const metric of metrics.slice(3)) {
    await checkOption(metric, null, (_, { cards }) => cards.forEach(card => checkUnlabelledCard(metric, card)));
  }

  await page.evaluate(() => {
    Object.assign(sampleOddClockingDays[0], { exception: 'Odd Clocking', missingClockIn: true, missingClockOut: true });
    Object.assign(sampleLostDays[0], { earlyOut: '00:12', timeOff: '01:00', leaveInfo: 'Annual Leave' });
  });
  function checkMultipleLabels(_, { rows, cards }) {
    assert.equal(cards.length, 1);
    assert.equal(cards[0].label, 'Missing Clock In');
    assert.equal(cards[0].description, rows.map(row => row.label).join(', '));
    assert.equal(cards[0].badge, cards[0].description);
    assert.ok(cards[0].infoAtRight);
    for (const row of rows) assert.equal(row.tone, individualColors[row.label]);
  }
  await checkOption('Odd Clocking Days', ['Clocking exception', 'Missing Clock In', 'Missing Clock Out'], checkMultipleLabels);
  await checkOption('Lost Hours', null, (_, { cards }) => {
    assert.equal(cards.length, 1);
    checkUnlabelledCard('Lost Hours', cards[0]);
  });
  await checkOption('Leave Hours', ['Leave status', 'On Leave']);

  await page.evaluate(() => {
    for (const records of [sampleWorkDays, sampleOtherOtDays, sampleUnapprovedOtDays, samplePlanOtDays,
      sampleAbsentOtDays, sampleAbsentDays, sampleOddClockingDays, sampleLostDays]) records.length = 0;
  });
  for (const metric of metrics) {
    await checkOption(metric, null, (_, { cards }) => assert.equal(cards.length, 0, metric));
  }
}

async function checkLegend(page, container, metric, expected, checkColors) {
  const cards = await page.$$eval(container + ' .summary-history-card-header', headers => headers.map(header => {
    const style = getComputedStyle(header);
    const badge = header.querySelector('.summary-history-status');
    const end = header.querySelector('.summary-history-card-end');
    const infoIcon = end?.querySelector('i.fa-solid[aria-hidden="true"]');
    const badgeBox = end?.getBoundingClientRect();
    const headingBox = header.querySelector('.summary-history-card-heading')?.getBoundingClientRect();
    return {
      label: header.dataset.recordKeyLabel || badge?.textContent.trim(),
      badge: badge?.textContent.trim(),
      hasCardInfo: Boolean(end),
      hasHeaderIcon: Boolean(header.querySelector('i, svg')),
      glyph: infoIcon && [...infoIcon.classList].find(name => name.startsWith('fa-') && name !== 'fa-solid'),
      infoAtRight: Boolean(infoIcon?.getBoundingClientRect().width > 0 && headingBox &&
        badgeBox.left >= headingBox.right - 1 && badgeBox.right <= header.getBoundingClientRect().right &&
        badgeBox.top < headingBox.bottom && badgeBox.bottom > headingBox.top),
      description: header.title,
      neutral: header.parentElement.classList.contains('no-record-status'),
      purple: header.parentElement.classList.contains('theme-purple') &&
        style.getPropertyValue('--record-header-fill').trim() === style.getPropertyValue('--card-header-purple-background').trim(),
      fill: style.backgroundImage
    };
  }));
  for (const card of cards) {
    if (metric === 'Leave Hours') {
      assert.ok(card.purple, 'Leave Hours headers use the purple card theme');
      assert.match(card.fill, /^linear-gradient\(/, metric);
      assert.equal(card.hasHeaderIcon, false, 'Leave Hours headers omit icons');
      assert.equal(card.hasCardInfo, Boolean(card.label), metric);
      if (card.label) assert.equal(card.badge, 'On Leave', metric);
      continue;
    }
    if (metric === 'Lost Hours') {
      assert.equal(card.hasCardInfo, false, 'Lost Hours cards omit the info icon');
      checkUnlabelledCard(metric, card);
      continue;
    }
    assert.ok(card.infoAtRight, metric + ' header must show an icon to the right of the heading');
    if (card.label) {
      assert.equal(card.badge, card.description || card.label, metric);
      const expectedGlyph = { Normal: 'fa-check', 'Approved OT': 'fa-check', 'Planned OT': 'fa-calendar-check',
        'Absent OT': 'fa-clock-rotate-left', Absent: 'fa-user-xmark', 'On Leave': 'fa-plane-departure' }[card.label];
      assert.equal(card.glyph, expectedGlyph || (card.label.includes('%') ? 'fa-chart-pie' : 'fa-circle-exclamation'), metric);
    } else {
      assert.equal(card.glyph, 'fa-circle-info', metric);
    }
  }
  if (expected === null) {
    await page.waitForSelector('button.record-key-trigger', { hidden: true });
    assert.equal(await page.$('#recordColourLegend[open]'), null, metric);
    if (checkColors) await checkColors(page, { rows: [], cards });
    return cards.length;
  }
  await page.click('button.record-key-trigger');
  await page.waitForSelector('#recordColourLegend[open]', { visible: true });
  const result = await page.$eval('#recordColourLegend', dialog => {
    const bounds = dialog.getBoundingClientRect();
    return {
      heading: dialog.querySelector('h3').textContent,
      rows: Array.from(dialog.querySelectorAll('li'), row => ({
        label: row.textContent.trim(),
        tone: Array.from(row.classList).find(name => name.startsWith('theme-')) || row.dataset.status,
        plain: row.children.length === 1 && row.firstElementChild.matches('span[aria-hidden="true"]:empty')
          && row.lastChild.nodeType === Node.TEXT_NODE,
        fill: getComputedStyle(row.firstElementChild).backgroundImage
      })),
      fits: bounds.left >= 0 && bounds.right <= innerWidth && dialog.scrollWidth <= dialog.clientWidth
    };
  });
  const [heading, ...labels] = expected;
  assert.equal(result.heading, heading, metric);
  assert.deepEqual(result.rows.map(row => row.label), labels, metric);
  assert.ok(result.fits, metric);
  assert.ok(result.rows.every(row => row.plain), metric);
  assert.ok(result.rows.every(row => row.fill.startsWith('linear-gradient')), metric);
  const fills = new Map(result.rows.map(row => [row.label, row.fill]));
  const swatches = new Set(fills.values());
  if (metric === 'Odd Clocking Days') assert.equal(swatches.size, fills.size, 'Each clocking exception needs its own color');
  for (const card of cards) {
    if (card.label) assert.equal(card.fill, fills.get(card.label), metric);
    else if (card.neutral) assert.ok(!swatches.has(card.fill), metric);
    else assert.ok(swatches.has(card.fill), metric);
  }
  if (checkColors) await checkColors(page, { ...result, cards });
  await page.keyboard.press('Escape');
  return cards.length;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 740 });
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      for (const staff of [false, true]) {
        const file = staff ? 'staff-hours-summary.html' : 'hours-summary.html';
        const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options', file));
        url.searchParams.set('theme', theme);
        await page.goto(url.href, { waitUntil: 'load' });
        assert.ok(await page.evaluate(async () => (await document.fonts.load('900 12px "Font Awesome 6 Free"')).length > 0),
          'The page itself must load the shared icon font when external requests are blocked');
        const metrics = await page.$$eval('#view-dashboard .hours-metric-button', buttons => buttons.map(button => button.textContent.trim()));
        const legends = staff ? staffLegends : individualLegends;
        assert.deepEqual(metrics, Object.keys(legends));
        const buttons = await page.$$('#view-dashboard .hours-metric-button');
        const back = '.hours-header-button[aria-label="Back"]';
        for (const [index, metric] of metrics.entries()) {
          await buttons[index].click();
          const checkColors = !staff && ((_, result) => checkIndividualCards(metric, result));
          const count = await checkLegend(page, '#details-list-container', metric, legends[metric], checkColors);
          if (!staff && metric === 'Other OT Hours') assert.equal(count, 1);
          if (!staff && metric === 'Odd Clocking Days') {
            await page.click('#details-list-container .theme-red .summary-history-status .fa-circle-exclamation');
            await page.waitForSelector('#modal-attendance-details', { visible: true });
            assert.equal(await page.$eval('#ad-date', field => field.textContent.trim()), '31 Dec 2025');
            await page.click('#modal-attendance-details .modal-close-round');
            await page.waitForSelector('#modal-attendance-details', { hidden: true });
          }
          if (metric === 'Lost Hours' || metric === 'Leave Hours') {
            const header = '#details-list-container .summary-history-card-header';
            const date = await page.$eval(header + ' ' + (staff ? '.summary-history-date' : '.history-time-row'),
              heading => heading.textContent.split(', ')[1]);
            await page.click(header);
            await page.waitForSelector('#modal-attendance-details', { visible: true });
            assert.equal(await page.$eval('#ad-date', field => field.textContent.trim()), date);
            await page.click('#modal-attendance-details .modal-close-round');
            await page.waitForSelector('#modal-attendance-details', { hidden: true });
          }

          const employee = staff && await page.$('#details-list-container [onclick^="openStaffDailyDetails"]');
          if (employee) {
            await employee.click();
            await checkLegend(page, '#daily-list-container', metric,
              metric === 'Normal Present Days' ? staffDailyAttendance : legends[metric]);
            await page.click(back);
          }
          await page.click(back);
        }
        if (staff) {
          await page.click('.hours-header-filter');
          await page.type('#filterKeyword', 'no-matching-employee');
          await page.click('#filterModal .claim-filter-apply');
          await buttons[metrics.indexOf('Other OT Hours')].click();
          assert.equal(await checkLegend(page, '#details-list-container', 'Other OT Hours', legends['Other OT Hours']), 0);
        } else {
          await page.evaluate(() => {
            sampleOddClockingDays.push({ ...sampleOddClockingDays[0], missingClockIn: true });
            sampleLostDays[0].leaveInfo = 'Annual Leave';
            sampleLostDays[0].lateIn = '00:00';
          });
          await buttons[metrics.indexOf('Odd Clocking Days')].click();
          await checkLegend(page, '#details-list-container', 'Odd Clocking Days',
            [...legends['Odd Clocking Days'], 'Missing Clock In']);
          await page.click(back);
          await buttons[metrics.indexOf('Leave Hours')].click();
          await checkLegend(page, '#details-list-container', 'Leave Hours', ['Leave status', 'On Leave']);
          await page.click(back);
          await buttons[metrics.indexOf('Lost Hours')].click();
          await checkLegend(page, '#details-list-container', 'Lost Hours', null);
          await page.click(back);
          await checkPresentDaySubsets(page, buttons[metrics.indexOf('Normal Present Days')], back);
          await checkScheduledDayExamples(page, buttons[metrics.indexOf('Scheduled Work Days')]);
          await page.click(back);
          await checkRemainingMetricEvidence(page, buttons, metrics, back);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: All 12 Individual and Staff Hours Summary options, card icons, status labels and legends in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
