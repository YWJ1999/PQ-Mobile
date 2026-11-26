const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

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
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const url = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/staff-attendance.html'));
        url.search = new URLSearchParams({ theme });
        await page.goto(url.href, { waitUntil: 'networkidle0' });
        await page.click('.staff-card-details-trigger');
        await page.waitForSelector('#detailsModal', { visible: true });

        const table = await page.$eval('#detailsModal .staff-details-table', node => {
          const firstRow = node.rows[0];
          const label = firstRow.cells[0];
          const value = firstRow.cells[1];
          const tableStyle = getComputedStyle(node);
          const labelStyle = getComputedStyle(label);
          const valueStyle = getComputedStyle(value);
          return {
            title: document.querySelector('#detailsModal .popout-hdr-title').textContent.trim(),
            bodyUsesSharedStyle: node.parentElement.classList.contains('detail-popout-body'),
            tableUsesSharedStyle: node.classList.contains('detail-popout-table'),
            rowCount: node.rows.length,
            labels: [...node.rows].map(row => row.cells[0].textContent.trim()),
            values: [...node.rows].map(row => row.cells[1].textContent.trim()),
            sections: [...document.querySelectorAll('#detailsModal .attendance-detail-section-title')].map(section => section.textContent.trim()),
            leaveHidden: document.getElementById('staffLeaveInfoTable')?.hidden ?? null,
            overtimeHidden: document.getElementById('staffOvertimeInfoTable')?.hidden ?? null,
            cellClasses: [label.className, value.className],
            inlineStyles: [...node.querySelectorAll('tr,td')].some(cell => cell.hasAttribute('style')),
            table: {
              borderCollapse: tableStyle.borderCollapse,
              tableLayout: tableStyle.tableLayout,
              fontSize: tableStyle.fontSize
            },
            label: {
              width: labelStyle.width,
              padding: labelStyle.padding,
              borderTopWidth: labelStyle.borderTopWidth,
              borderRightWidth: labelStyle.borderRightWidth,
              backgroundColor: labelStyle.backgroundColor,
              fontWeight: labelStyle.fontWeight
            },
            value: {
              padding: valueStyle.padding,
              borderTopWidth: valueStyle.borderTopWidth,
              borderRightWidth: valueStyle.borderRightWidth,
              backgroundColor: valueStyle.backgroundColor,
              fontWeight: valueStyle.fontWeight
            },
            ratio: label.getBoundingClientRect().width / node.getBoundingClientRect().width,
            fits: node.scrollWidth <= node.clientWidth + 1
          };
        });

        assert.equal(table.bodyUsesSharedStyle, true, `${theme} ${width}px: modal body uses shared detail surface`);
        assert.equal(table.tableUsesSharedStyle, true, `${theme} ${width}px: table uses shared detail table`);
        assert.equal(table.title, 'Attendance Details');
        assert.equal(table.rowCount, 17);
        assert.deepEqual(table.labels, ['Employee No.', 'Name', 'Date', 'Shift', 'Day Type', 'Shift Group', 'Supervisor', 'Clock Times', 'Normal Hours', 'Late In', 'Early Out', 'Time Off', 'Absent', 'Approved OT Hours', 'Unapproved OT Hours', 'Exception', 'Document #']);
        assert.deepEqual(table.values.slice(0, 2), ['000008', 'Aqilah antasha']);
        assert.deepEqual(table.sections, ['Leave Info', 'Overtime Info']);
        assert.equal(table.leaveHidden, true, `${theme} ${width}px: empty Leave Info table stays hidden`);
        assert.equal(table.overtimeHidden, true, `${theme} ${width}px: empty Overtime Info table stays hidden`);
        assert.deepEqual(table.cellClasses, ['detail-popout-label', 'detail-popout-value']);
        assert.equal(table.inlineStyles, false, `${theme} ${width}px: table presentation is not embedded in JavaScript`);
        assert.deepEqual(table.table, { borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11.5px' });
        assert.equal(table.label.padding, '7px 10px');
        assert.equal(table.value.padding, '7px 10px');
        assert.equal(table.label.borderTopWidth, '1px');
        assert.equal(table.label.borderRightWidth, '1px');
        assert.equal(table.value.borderTopWidth, '1px');
        assert.equal(table.value.borderRightWidth, '1px');
        assert.notEqual(table.label.backgroundColor, table.value.backgroundColor, `${theme} ${width}px: label column has its own shaded surface`);
        assert.equal(table.label.fontWeight, '700');
        assert.equal(table.value.fontWeight, '600');
        assert.ok(Math.abs(table.ratio - 0.42) < 0.02, `${theme} ${width}px: label column remains 42% wide`);
        assert.equal(table.fits, true);
        assert.deepEqual(errors, []);

        await page.evaluate(() => {
          const item = masterStaffDataset.find(record => record.cleanEmpNo === '000008');
          item.leaveInfo = 'Annual Leave - 1.00 Day';
          item.otInfo = 'Approved 1.5h OT';
          openDetailsModal('000008');
        });
        assert.deepEqual(await page.evaluate(() => ({
          leaveHidden: document.getElementById('staffLeaveInfoTable').hidden,
          leaveValue: document.getElementById('staffLeaveInfoValue').textContent.trim(),
          overtimeHidden: document.getElementById('staffOvertimeInfoTable').hidden,
          overtimeValue: document.getElementById('staffOvertimeInfoValue').textContent.trim()
        })), {
          leaveHidden: false,
          leaveValue: 'Annual Leave - 1.00 Day',
          overtimeHidden: false,
          overtimeValue: 'Approved 1.5h OT'
        });

        await page.click('#detailsModal .popout-close-btn');
        await page.waitForSelector('#detailsModal', { hidden: true });
        await page.close();
      }
    }

    console.log('PASS: Staff Attendance details use the shared two-column table design.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
