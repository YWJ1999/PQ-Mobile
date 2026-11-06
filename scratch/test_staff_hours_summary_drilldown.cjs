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
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/staff-hours-summary.html')).href, { waitUntil: 'networkidle0' });

    await page.click('.bento-group-work .summary-kpi-card');
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Scheduled Work Days Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim(),
      chart: overview.querySelector('.view-chart-btn').textContent.trim()
    })), { records: '8', totalLabel: 'Total Scheduled Days', total: '168.00', chart: 'Chart' });

    const employeeCards = await page.$$eval('#details-list-container .summary-history-card', cards => cards.map(card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.staff-name-text').nextElementSibling.textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim())
    })));
    assert.equal(employeeCards.length, 8);
    assert.equal(employeeCards[0].name, 'John Tan');
    assert.equal(employeeCards[0].id, '#EBB01');
    assert.deepEqual(employeeCards[0].rows, ['Job Title Senior Developer', 'Scheduled Days 22', 'Scheduled Hours 176.00']);
    assert.equal(await page.$$eval('#details-list-container .summary-history-card .fa-chevron-right', icons => icons.length), 0);

    await page.click('#details-list-container .summary-history-card');
    assert.notEqual(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Scheduled Work Days');
    assert.deepEqual(await page.$eval('#daily-list-overview', overview => ({
      records: overview.querySelector('#daily-record-count').textContent.trim(),
      total: overview.querySelector('#daily-total-hours').textContent.trim(),
      chart: overview.querySelector('.view-chart-btn').textContent.trim()
    })), { records: '22', total: '176.00', chart: 'Chart' });
    assert.equal(await page.$$eval('#daily-list-container .summary-history-card', cards => cards.length), 22);
    assert.equal(await page.$$eval('#daily-list-container .summary-history-card .fa-chevron-right', icons => icons.length), 0);
    assert.deepEqual(await page.$eval('#daily-list-container .summary-history-card', card => ({
      title: card.querySelector('.history-time-row').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim())
    })), {
      title: '8:30 AM - 5:30 PM (GROUP A)',
      date: 'Mon, 14 Sep 2026',
      rows: ['Clock Times 08:30 - 17:30', 'Scheduled Hours 8.00']
    });

    await page.click('#daily-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.equal(await page.$eval('#modal-attendance-details h3', node => node.textContent.trim()), 'Attendance Details');
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      date: document.getElementById('ad-date').textContent.trim(),
      shift: document.getElementById('ad-shift').textContent.trim(),
      clock: document.getElementById('ad-clock-times').textContent.trim()
    })), {
      employee: '#EBB01',
      name: 'John Tan',
      date: '14 Sep 2026',
      shift: '8:30 AM - 5:30 PM (GROUP A)',
      clock: '08:30 - 17:30'
    });
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.click('#daily-list-overview .view-chart-btn');
    assert.notEqual(await page.$eval('#view-chart', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Scheduled Work Days (Chart)');
    assert.equal(await page.$$eval('#view-chart .bar-fill', bars => bars.every(bar => {
      const background = getComputedStyle(bar).backgroundImage;
      return background.includes('rgb(124, 58, 237)') && background.includes('rgb(167, 139, 250)');
    })), true);
    await page.evaluate(() => goBack());
    assert.notEqual(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    await page.evaluate(() => goBack());
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');

    await page.click('#staff-list-overview .view-chart-btn');
    assert.notEqual(await page.$eval('#view-chart', node => getComputedStyle(node).display), 'none');
    assert.equal(await page.$$eval('#view-chart .bar-fill', bars => bars.every(bar => {
      const background = getComputedStyle(bar).backgroundImage;
      return background.includes('rgb(124, 58, 237)') && background.includes('rgb(167, 139, 250)');
    })), true);
    await page.evaluate(() => goBack());
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.evaluate(() => goBack());
    assert.notEqual(await page.$eval('#view-dashboard', node => getComputedStyle(node).display), 'none');

    await page.click('.bento-group-work .summary-kpi-card:nth-child(2)');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Normal Present Days Summary');
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'John Tan',
      rows: ['Job Title Senior Developer', 'Scheduled Days 22', 'Work Days 22', 'Attendance Rate 100%'],
      arrows: 0
    });

    await page.click('#details-list-container .summary-history-card');
    assert.deepEqual(await page.$eval('#daily-list-overview', overview => ({
      records: overview.querySelector('#daily-record-count').textContent.trim(),
      total: overview.querySelector('#daily-total-hours').textContent.trim()
    })), { records: '22', total: '176.00' });
    assert.deepEqual(await page.$eval('#daily-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      status: card.querySelector('.summary-history-card-end .summary-history-status').textContent.replace(/\s+/g, ' ').trim(),
      statusType: card.querySelector('.summary-history-card-end .summary-history-status').dataset.status,
      statusIcon: card.querySelector('.summary-history-card-end .summary-history-status i').classList.contains('fa-check'),
      statusColor: getComputedStyle(card.querySelector('.summary-history-card-end .summary-history-status')).color,
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'John Tan',
      id: '#EBB01',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 8:30 AM - 5:30 PM (GROUP A)',
        'Clock Times 08:30 - 17:30',
        'Normal Hours 08:00'
      ],
      status: 'Normal',
      statusType: 'normal',
      statusIcon: true,
      statusColor: 'rgb(5, 150, 105)',
      arrows: 0
    });

    await page.click('#daily-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      normalHours: document.getElementById('ad-normal-hours').textContent.trim(),
      absent: document.getElementById('ad-absent').textContent.trim(),
      exception: document.getElementById('ad-exception').textContent.trim()
    })), { employee: '#EBB01', normalHours: '08:00', absent: 'No', exception: '-' });
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    await page.click('#details-list-container .summary-history-card:nth-child(4)');
    assert.deepEqual(await page.$eval('#daily-list-container .summary-history-card', card => {
      const status = card.querySelector('.summary-history-card-end .summary-history-status');
      return {
        name: card.querySelector('.staff-name-text').textContent.trim(),
        id: card.querySelector('.summary-history-employee-id').textContent.trim(),
        date: card.querySelector('.summary-history-date').textContent.trim(),
        rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
        status: status.textContent.replace(/\s+/g, ' ').trim(),
        statusType: status.dataset.status,
        statusIcon: status.querySelector('i').classList.contains('fa-circle-exclamation'),
        statusColor: getComputedStyle(status).color,
        arrows: card.querySelectorAll('.fa-chevron-right').length
      };
    }), {
      name: 'Michael Chen',
      id: '#EBB04',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 8:30 AM - 5:30 PM (GROUP A)',
        'Clock Times 08:30 - 17:30',
        'Normal Hours 08:00'
      ],
      status: 'Unapproved OT',
      statusType: 'exception',
      statusIcon: true,
      statusColor: 'rgb(217, 119, 6)',
      arrows: 0
    });
    await page.click('#daily-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      unapprovedOt: document.getElementById('ad-unapproved-ot').textContent.trim(),
      exception: document.getElementById('ad-exception').textContent.trim(),
      exceptionColor: getComputedStyle(document.getElementById('ad-exception')).color
    })), {
      unapprovedOt: '12.00',
      exception: 'Unapproved OT',
      exceptionColor: 'rgb(245, 158, 11)'
    });
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => {
      goBack();
      goBack();
    });
    await page.click('.bento-group-work .summary-kpi-card:nth-child(4)');
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Odd Clocking Days Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '32',
      totalLabel: 'Total Hours',
      total: '256.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 32);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Sarah Lee',
      id: '#EBB02',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 9:00 AM - 6:00 PM (GROUP B)',
        'Clock Time 08:30 - 17:30',
        'Normal Hours 08:00'
      ],
      arrows: 0
    });
    assert.equal(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      exception: document.getElementById('ad-exception').textContent.trim()
    })), {
      employee: '#EBB02',
      name: 'Sarah Lee',
      exception: 'Odd Clocking'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    await page.click('.ot-grid-matrix .summary-kpi-card');
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Normal OT Hours Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '48',
      totalLabel: 'Total Hours',
      total: '96.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 48);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'John Tan',
      id: '#EBB01',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 8:30 AM - 5:30 PM (GROUP A)',
        'Clock Times 08:30 - 17:30',
        'Approved OT Hours 2.00'
      ],
      arrows: 0
    });
    assert.equal(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      approvedOt: document.getElementById('ad-approved-ot').textContent.trim()
    })), {
      employee: '#EBB01',
      name: 'John Tan',
      approvedOt: '2.00'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    await page.$eval('.ot-grid-matrix .summary-kpi-card:nth-child(3)', card => card.click());
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Unapproved OT Hours Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '7',
      totalLabel: 'Total Hours',
      total: '14.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 7);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Michael Chen',
      id: '#EBB04',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 8:30 AM - 5:30 PM (GROUP A)',
        'Clock Times 08:30 - 17:30',
        'Unapproved OT 2.00'
      ],
      arrows: 0
    });
    assert.equal(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      unapprovedOt: document.getElementById('ad-unapproved-ot').textContent.trim(),
      exception: document.getElementById('ad-exception').textContent.trim()
    })), {
      employee: '#EBB04',
      name: 'Michael Chen',
      unapprovedOt: '2.00',
      exception: 'Unapproved OT'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    await page.$eval('.ot-grid-matrix .summary-kpi-card:nth-child(4)', card => card.click());
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Planned OT Hours Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '9',
      totalLabel: 'Total Hours',
      total: '18.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 9);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Sarah Lee',
      id: '#EBB02',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 9:00 AM - 6:00 PM (GROUP B)',
        'Clock Time 08:30 - 17:30',
        'Plan Hours 2.00'
      ],
      arrows: 0
    });
    assert.equal(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      overtimeVisible: !document.getElementById('ad-overtime-info-table').hidden,
      overtimeDescription: document.getElementById('ad-ot-desc').textContent.trim(),
      overtimeHours: document.getElementById('ad-ot-hours').textContent.trim()
    })), {
      employee: '#EBB02',
      name: 'Sarah Lee',
      overtimeVisible: true,
      overtimeDescription: 'Planned OT Hours',
      overtimeHours: '2.00'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    assert.equal(await page.$eval('#statAbsentOt', node => node.textContent.trim()), '0.05');
    await page.$eval('.exceptions-bento-matrix .summary-kpi-card', card => card.click());
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Absent OT Hours Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '2',
      totalLabel: 'Total Hours',
      total: '0.05'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 2);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      theme: card.classList.contains('theme-purple'),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Sarah Lee',
      id: '#EBB02',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 9:00 AM - 6:00 PM (GROUP B)',
        'Clock Times 08:30 - 17:30',
        'Absent OT Hours 0.01'
      ],
      theme: true,
      arrows: 0
    });
    assert.equal(await page.$eval('#view-daily-list', node => getComputedStyle(node).display), 'none');
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      date: document.getElementById('ad-date').textContent.trim(),
      clockTimes: document.getElementById('ad-clock-times').textContent.trim()
    })), {
      employee: '#EBB02',
      name: 'Sarah Lee',
      date: '14 Sep 2026',
      clockTimes: '08:30 - 17:30'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    assert.equal(await page.$eval('#statAbsentDays', node => node.textContent.trim()), '39');
    await page.$eval('.exceptions-bento-matrix .summary-kpi-card:nth-child(2)', card => card.click());
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Absent Days Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '39',
      totalLabel: 'Total Hours',
      total: '312.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 39);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      theme: card.classList.contains('theme-purple'),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Sarah Lee',
      id: '#EBB02',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 9:00 AM - 6:00 PM (GROUP B)',
        'Clock Times -',
        'Absent Hours 8.00'
      ],
      theme: true,
      arrows: 0
    });
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      absent: document.getElementById('ad-absent').textContent.trim(),
      exception: document.getElementById('ad-exception').textContent.trim()
    })), {
      employee: '#EBB02',
      absent: 'Yes',
      exception: 'Absent'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    await page.$eval('.exceptions-bento-matrix .summary-kpi-card:nth-child(3)', card => card.click());
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Leave Hours Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '12',
      totalLabel: 'Total Hours',
      total: '24.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 12);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      theme: card.classList.contains('theme-purple'),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Sarah Lee',
      id: '#EBB02',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 9:00 AM - 6:00 PM (GROUP B)',
        'Clock Times 08:30 - 17:30',
        'Leave Description Annual Leave',
        'Leave Hours 2.00'
      ],
      theme: true,
      arrows: 0
    });
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      leaveVisible: !document.getElementById('ad-leave-info-table').hidden,
      leaveCode: document.getElementById('ad-leave-code').textContent.trim(),
      leaveDescription: document.getElementById('ad-leave-description').textContent.trim(),
      leaveHours: document.getElementById('ad-leave-hours').textContent.trim()
    })), {
      employee: '#EBB02',
      leaveVisible: true,
      leaveCode: 'AL',
      leaveDescription: 'Annual Leave',
      leaveHours: '2.00'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });

    await page.evaluate(() => goBack());
    await page.$eval('.exceptions-bento-matrix .summary-kpi-card:nth-child(4)', card => card.click());
    assert.equal(await page.$eval('#headerTitle', node => node.textContent.trim()), 'Staff Lost Hours Summary');
    assert.deepEqual(await page.$eval('#staff-list-overview', overview => ({
      records: overview.querySelector('#list-record-count').textContent.trim(),
      totalLabel: overview.querySelector('#staff-list-total-label').textContent.trim(),
      total: overview.querySelector('#staff-list-total-value').textContent.trim()
    })), {
      records: '2',
      totalLabel: 'Total Hours',
      total: '4.00'
    });
    assert.equal(await page.$$eval('#details-list-container .summary-history-card', cards => cards.length), 2);
    assert.deepEqual(await page.$eval('#details-list-container .summary-history-card', card => ({
      name: card.querySelector('.staff-name-text').textContent.trim(),
      id: card.querySelector('.summary-history-employee-id').textContent.trim(),
      date: card.querySelector('.summary-history-date').textContent.trim(),
      rows: [...card.querySelectorAll('.summary-history-detail')].map(row => row.textContent.replace(/\s+/g, ' ').trim()),
      theme: card.classList.contains('theme-purple'),
      arrows: card.querySelectorAll('.fa-chevron-right').length
    })), {
      name: 'Michael Chen',
      id: '#EBB04',
      date: 'Mon, 14 Sep 2026',
      rows: [
        'Shift 8:30 AM - 5:30 PM (GROUP A)',
        'Clock Times 08:30 - 17:30',
        'Lost Hours 2.00'
      ],
      theme: true,
      arrows: 0
    });
    await page.click('#details-list-container .summary-history-card');
    await page.waitForSelector('#modal-attendance-details', { visible: true });
    assert.deepEqual(await page.evaluate(() => ({
      employee: document.getElementById('ad-emp-no').textContent.trim(),
      name: document.getElementById('ad-name').textContent.trim(),
      clockTimes: document.getElementById('ad-clock-times').textContent.trim()
    })), {
      employee: '#EBB04',
      name: 'Michael Chen',
      clockTimes: '08:30 - 17:30'
    });
    assert.notEqual(await page.$eval('#view-list', node => getComputedStyle(node).display), 'none');
    await page.click('#modal-attendance-details .modal-close-round');
    await page.waitForSelector('#modal-attendance-details', { hidden: true });
    assert.deepEqual(errors, []);

    console.log('PASS: Staff Hours drills from staff totals to daily records, charts and attendance details.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
