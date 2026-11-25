const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/shift-plan.html')).href;

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
    await page.setViewport({ width: 390, height: 950 });
    await page.goto(pageUrl + '?theme=light', { waitUntil: 'load' });
    await page.click('#tabCalendarBtn');

    assert.equal(await page.$('.grid-cal-title'), null);
    assert.equal(await page.$('.grid-cal-toggle'), null);
    assert.equal(await page.$('.grid-cal-today'), null);
    assert.equal(await page.$eval('#gridCalTitle', node => node.textContent.trim()), 'September 2026');
    assert.deepEqual(
      await page.$$eval('.grid-cal-header button', buttons => buttons.map(button => button.getAttribute('aria-label'))),
      ['Previous month', 'Next month']
    );
    assert.deepEqual(await page.$$eval('.grid-cal-legend li', items => items.map(item => item.textContent)), ['Staff', 'Scheduled hours']);
    assert.deepEqual(
      await page.$$eval('.grid-cal-legend .legend-dot', dots => dots.map(dot => getComputedStyle(dot).backgroundColor)),
      await page.$$eval('#gridCalDays .grid-cal-cell.selected [class^="grid-cal-stat-"]', values => values.map(value => getComputedStyle(value).color))
    );
    assert.deepEqual(await page.$$eval('.grid-cal-weekday', nodes => nodes.map(node => node.textContent.trim())), ['M', 'T', 'W', 'T', 'F', 'S', 'S']);

    const cells = await page.$$eval('#gridCalDays .grid-cal-cell', nodes => nodes.map(node => ({
      empty: node.classList.contains('empty'),
      selected: node.classList.contains('selected'),
      date: node.querySelector('.grid-cal-date')?.textContent.trim() || '',
      staff: node.querySelector('.grid-cal-stat-staff')?.textContent.trim() || '',
      hours: node.querySelector('.grid-cal-stat-hours')?.textContent.trim() || ''
    })));
    assert.equal(cells.length, 31);
    assert.deepEqual(cells[0], { empty: true, selected: false, date: '31', staff: '', hours: '' });
    assert.deepEqual(cells.find(cell => cell.date === '1'), { empty: false, selected: false, date: '1', staff: '287', hours: '2,192h' });
    assert.equal(cells.find(cell => cell.date === '23').selected, true);
    assert.equal(await page.$eval('#gridCalDays', node => getComputedStyle(node).gap), '5px');
    assert.equal(await page.$eval('#gridCalDays .grid-cal-cell:not(.empty)', node => getComputedStyle(node).borderRadius), '12px');
    assert.deepEqual(await page.$eval('#gridCalTitle', node => ({
      size: getComputedStyle(node).fontSize,
      weight: getComputedStyle(node).fontWeight
    })), { size: '15px', weight: '800' });
    assert.deepEqual(await page.$eval('.grid-cal-weekday', node => ({
      size: getComputedStyle(node).fontSize,
      weight: getComputedStyle(node).fontWeight
    })), { size: '11px', weight: '800' });
    assert.deepEqual(await page.$eval('#gridCalDays .grid-cal-cell:not(.empty):not(.selected) .grid-cal-date', node => ({
      size: getComputedStyle(node).fontSize,
      weight: getComputedStyle(node).fontWeight
    })), { size: '13.5px', weight: '700' });
    assert.deepEqual(await page.$eval('#gridCalDays .grid-cal-cell.selected .grid-cal-date', node => ({
      size: getComputedStyle(node).fontSize,
      weight: getComputedStyle(node).fontWeight
    })), { size: '14.5px', weight: '900' });
    assert.equal(await page.$eval('.grid-cal-stat-staff', node => getComputedStyle(node).fontSize), '9.5px');

    const summaryLayout = await page.$eval('#calSummaryCard', card => {
      const metrics = [...card.querySelectorAll('.cal-summary-stat')];
      const stats = card.querySelector('.cal-summary-stats');
      const title = card.querySelector('.cal-summary-title');
      const staff = card.querySelector('.cal-summary-staff');
      const dateBounds = title.getBoundingClientRect();
      const staffBounds = staff.getBoundingClientRect();
      const statsStyle = stats ? getComputedStyle(stats) : null;
      return {
        display: statsStyle?.display || 'missing',
        columnCount: statsStyle ? statsStyle.gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        titleColor: title ? getComputedStyle(title).color : '',
        staff: staff.textContent.trim(),
        staffBesideDate: staffBounds.left >= dateBounds.right && staffBounds.top < dateBounds.bottom && dateBounds.top < staffBounds.bottom,
        metrics: metrics.map((metric, index) => {
          const value = metric.querySelector('.cal-summary-stat-val');
          const label = metric.querySelector('.cal-summary-stat-label');
          const metricStyle = getComputedStyle(metric);
          const valueStyle = value ? getComputedStyle(value) : null;
          const labelStyle = label ? getComputedStyle(label) : null;
          return {
            element: metric.tagName,
            label: label?.textContent.trim() || '',
            value: value?.textContent.trim() || '',
            labelAboveValue: label.getBoundingClientRect().bottom <= value.getBoundingClientRect().top,
            valueBackground: valueStyle?.backgroundColor || '',
            valueBorderWidth: valueStyle?.borderWidth || '',
            valueColor: valueStyle?.color || '',
            labelColor: labelStyle?.color || '',
            dividerWidth: index === 0 ? '0px' : metricStyle.borderLeftWidth
          };
        })
      };
    });
    assert.equal(summaryLayout.display, 'grid', 'Selected-day summary must use the compact reference grid');
    assert.equal(summaryLayout.columnCount, 4);
    assert.deepEqual(summaryLayout.metrics.map(metric => metric.element), ['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON']);
    assert.equal(summaryLayout.staff, '287 staff');
    assert.ok(summaryLayout.staffBesideDate, 'The staff count belongs to the right of the date');
    assert.deepEqual(summaryLayout.metrics.map(metric => metric.label), ['Work Shift', 'No Work', 'OT Plan', 'On Leave']);
    assert.deepEqual(summaryLayout.metrics.map(metric => metric.value), ['269.00', '13', '73 / 127.00', '5.00']);
    assert.ok(summaryLayout.metrics.every(metric => metric.labelAboveValue), 'Each label sits above its value');
    assert.equal(summaryLayout.metrics.every(metric => metric.valueBackground === 'rgba(0, 0, 0, 0)' && metric.valueBorderWidth === '0px'), true, 'Values must not use pill backgrounds');
    assert.equal(summaryLayout.metrics.slice(1).every(metric => metric.dividerWidth === '1px'), true, 'Metrics must use the reference vertical separators');
    assert.equal(summaryLayout.titleColor, 'rgb(15, 23, 42)', 'Selected date must keep the normal title color');
    assert.deepEqual(summaryLayout.metrics.map(metric => metric.valueColor), [
      summaryLayout.titleColor, summaryLayout.titleColor, 'rgb(124, 58, 237)', summaryLayout.titleColor
    ]);
    assert.ok(summaryLayout.metrics.every(metric => metric.labelColor === 'rgb(100, 116, 139)'), 'Metric labels use the muted text color');

    assert.equal(
      await page.$eval('#gridCalDays .selected', cell => cell.getAttribute('aria-label')),
      '23 September 2026, 287 staff, 2,192 scheduled hours'
    );

    await page.$$eval('#gridCalDays .grid-cal-cell', nodes => nodes.find(node => node.querySelector('.grid-cal-date')?.textContent.trim() === '5').click());
    assert.equal(await page.$eval('#calSummaryStaff', node => node.textContent.trim()), '78 staff');
    assert.deepEqual(
      await page.$eval('#gridCalDays .grid-cal-cell.selected', cell => [
        cell.querySelector('.grid-cal-stat-staff').textContent.trim(),
        cell.querySelector('.grid-cal-stat-hours').textContent.trim(),
        cell.querySelector('.grid-cal-date').textContent.trim()
      ]),
      ['78', '132h', '5']
    );

    await page.$$eval('#gridCalDays .grid-cal-cell', nodes => nodes.find(node => node.querySelector('.grid-cal-date')?.textContent.trim() === '17').click());
    assert.equal(
      await page.$eval('#gridCalDays .selected', cell => cell.getAttribute('aria-label')),
      '17 September 2026, 287 staff, 8 scheduled hours'
    );

    await page.$$eval('#gridCalDays .grid-cal-cell', nodes => nodes.find(node => node.querySelector('.grid-cal-date')?.textContent.trim() === '24').click());
    assert.equal(await page.$eval('#gridCalDays .grid-cal-cell.selected .grid-cal-date', node => node.textContent.trim()), '24');
    assert.equal(await page.$eval('#calSummaryTitle', node => node.textContent.trim()), 'Thu, 24 Sept 2026');

    await page.click('[data-grid-month="next"]');
    assert.equal(await page.$eval('#gridCalTitle', node => node.textContent.trim()), 'October 2026');
    assert.equal(await page.$eval('#calSummaryTitle', node => node.textContent.trim()), 'Sat, 24 Oct 2026');
    await page.click('[data-grid-month="previous"]');
    assert.equal(await page.$eval('#gridCalTitle', node => node.textContent.trim()), 'September 2026');
    assert.equal(await page.$eval('#calSummaryTitle', node => node.textContent.trim()), 'Thu, 24 Sept 2026');
    assert.equal(await page.$eval('#calendarTabView', node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('PASS: Shift Calendar displays the inline legend and the selected date’s staff and scheduled hours.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
