const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 950 });

    await page.goto(url('modules/attendance/options/team.html'), { waitUntil: 'domcontentloaded' });

    await check('attendance approval details are sourced from the selected record', async () => {
      const actual = await page.evaluate(() => {
        const record = staffDatabase.pending_approval.find(item => item.id === '#001002');
        openAttendanceThreeDotsMenu(null, record.id);
        triggerAttendanceViewDetails();
        return {
          selected: {
            name: currentAttendanceSelectedData.name,
            reason: currentAttendanceSelectedData.reason,
            dates: currentAttendanceSelectedData.dates,
            duration: currentAttendanceSelectedData.duration,
            remark: currentAttendanceSelectedData.remark
          },
          expected: {
            name: record.name,
            reason: record.reason,
            dates: record.startDate,
            duration: record.duration,
            remark: record.remark
          }
        };
      });
      assert.deepEqual(actual.selected, actual.expected);
    });

    await check('attendance dashboard counts derive from the pending and verification datasets', async () => {
      const values = await page.evaluate(() => ({
        taskBadge: document.querySelector('.team-action-required-badge').textContent.trim(),
        pending: document.querySelector('.team-pending-approval-count').textContent.trim(),
        expectedPending: staffDatabase.pending_approval.length,
        expectedTasks: staffDatabase.pending_approval.length + staffDatabase.attendance_verification.length
      }));
      assert.equal(values.pending, String(values.expectedPending));
      assert.equal(values.taskBadge, `${values.expectedTasks} Tasks`);
    });

    await check('attendance staff cards put a normalized ID directly below the name', async () => {
      const identity = await page.evaluate(() => {
        renderStaffList(staffDatabase.scheduled.slice(0, 1));
        const card = document.querySelector('#staffListContent .staff-card-item');
        const name = [...card.querySelectorAll('div')].find(node => node.textContent.trim() === staffDatabase.scheduled[0].name);
        const id = name.nextElementSibling;
        const css = getComputedStyle(id);
        return { text: id.textContent.trim(), size: css.fontSize, weight: css.fontWeight, family: css.fontFamily };
      });
      assert.match(identity.text, /^#[A-Z0-9-]+$/);
      assert.equal(identity.size, '11.5px');
      assert.equal(identity.weight, '700');
      assert.match(identity.family.toLowerCase(), /mono/);
    });

    await page.goto(url('leave.html') + '?mode=team', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hubSectionTeam', { visible: true });

    await check('leave dashboard count matches all unhandled approval cards', async () => {
      const values = await page.evaluate(() => ({
        cards: [...document.querySelectorAll('#teamApprovalsListContainer .approval-request-card')]
          .filter(card => card.dataset.handled !== 'true').length,
        pending: document.getElementById('teamPendingCount').textContent.trim(),
        tasks: document.getElementById('leaveTeamActionRequiredCount').textContent.trim()
      }));
      assert.equal(values.pending, String(values.cards));
      assert.equal(values.tasks, `${values.cards} Tasks`);
    });

    await check('leave approval cards put a normalized employee ID directly below the name', async () => {
      const rows = await page.$$eval('#teamApprovalsListContainer .approval-request-card', cards => cards.map(card => {
        const id = card.querySelector('.employee-id-standard');
        if (!id) return { text: '', size: '', weight: '', family: '' };
        const css = getComputedStyle(id);
        return { text: id.textContent.trim(), size: css.fontSize, weight: css.fontWeight, family: css.fontFamily };
      }));
      assert.ok(rows.length >= 9);
      for (const row of rows) {
        assert.match(row.text, /^#[A-Z0-9-]+$/);
        assert.equal(row.size, '11.5px');
        assert.equal(row.weight, '700');
        assert.match(row.family.toLowerCase(), /mono/);
      }
    });

    await check('leave calendar, entitlement, and workflow cards use the standard ID line', async () => {
      const result = await page.evaluate(() => {
        openCalDateDetailsModal(5);
        openStaffEntitlementModal('004177');
        const collect = selector => [...document.querySelectorAll(selector)].map(node => {
          const css = getComputedStyle(node);
          return { text: node.textContent.trim(), size: css.fontSize, weight: css.fontWeight, family: css.fontFamily };
        });
        return {
          calendar: collect('#calModalStaffListContainer .employee-id-standard'),
          entitlement: collect('#entModalStaffContentContainer .employee-id-standard'),
          workflow: collect('#level1Approvers .employee-id-standard')
        };
      });
      assert.equal(result.calendar.length, 1);
      assert.equal(result.entitlement.length, 1);
      assert.ok(result.workflow.length >= 5);
      for (const row of [...result.calendar, ...result.entitlement, ...result.workflow]) {
        assert.match(row.text, /^#[A-Z0-9-]+$/);
        assert.equal(row.size, '11.5px');
        assert.equal(row.weight, '700');
        assert.match(row.family.toLowerCase(), /mono/);
      }
    });

    await page.goto(url('modules/attendance/options/hours-summary.html'), { waitUntil: 'domcontentloaded' });
    await check('hours summary cards show only the reference KPIs clearly', async () => {
      const cards = await page.$$eval('.summary-kpi-card', nodes => nodes.map(card => {
        const title = card.querySelector('.card-theme-title');
        const primary = card.querySelector('.summary-card-primary');
        const secondary = card.querySelector('.summary-card-secondary');
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const primaryRect = primary?.getBoundingClientRect();
        const secondaryRect = secondary?.getBoundingClientRect();
        return {
          title: title?.textContent.trim(),
          primary: primary?.textContent.trim(),
          secondary: secondary?.textContent.trim() || '',
          primarySize: primary ? Number.parseFloat(getComputedStyle(primary).fontSize) : 0,
          titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
          hasExtraCopy: Boolean(card.querySelector('.card-theme-sub, .work-card-unit, .work-card-status')),
          valuesCentered: Boolean(primaryRect) &&
            Math.abs((primaryRect.left + primaryRect.width / 2) - cardCenter) <= 2 &&
            (!secondaryRect || Math.abs((secondaryRect.left + secondaryRect.width / 2) - cardCenter) <= 2),
          fits: card.scrollWidth <= card.clientWidth + 1
        };
      }));
      assert.deepEqual(cards.map(({ title, primary, secondary }) => ({ title, primary, secondary })), [
        { title: 'Scheduled Work Days', primary: '22', secondary: '100%' },
        { title: 'Normal Present Days', primary: '22', secondary: '100%' },
        { title: 'Normal Work Hours', primary: '176.00', secondary: '100%' },
        { title: 'Odd Clocking Days', primary: '0', secondary: '0%' },
        { title: 'Normal OT Hours', primary: '4.50', secondary: '3%' },
        { title: 'Other OT Hours', primary: '0.00', secondary: '0%' },
        { title: 'Unapproved OT Hours', primary: '14.62', secondary: '8%' },
        { title: 'Plan OT Hours', primary: '0.00', secondary: '' },
        { title: 'Absent OT Hours', primary: '0.00', secondary: '' },
        { title: 'Absent Days', primary: '0', secondary: '0%' },
        { title: 'Leave Hours', primary: '0.00', secondary: '0%' },
        { title: 'Lost Hours', primary: '0.00', secondary: '0%' }
      ]);
      assert.ok(cards.every(card => card.primarySize > card.titleSize));
      assert.ok(cards.every(card => !card.hasExtraCopy));
      assert.ok(cards.every(card => card.valuesCentered));
      assert.ok(cards.every(card => card.fits));
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 950 });
        const responsiveCards = await page.$$eval('.summary-kpi-card', nodes => nodes.map(card => {
          const cardRect = card.getBoundingClientRect();
          const center = cardRect.left + cardRect.width / 2;
          return [...card.querySelectorAll('.summary-card-primary, .summary-card-secondary')].every(value => {
            const rect = value.getBoundingClientRect();
            return Math.abs((rect.left + rect.width / 2) - center) <= 2;
          }) && card.scrollWidth <= card.clientWidth + 1;
        }));
        assert.ok(responsiveCards.every(Boolean), 'KPI values stay centered and contained at ' + width + 'px');
      }
      await page.setViewport({ width: 390, height: 950 });
    });
    await page.evaluate(() => setView('list'));
    await check('hours summary section headings stay text only', async () => {
      const headings = await page.$$eval('.dashboard-section-header', nodes => nodes.map(node => ({
        title: node.querySelector('h2')?.textContent.replace(/\s+/g, ' ').trim(),
        iconCount: node.querySelectorAll('.section-title-icon, h2 i').length,
        badgeCount: node.querySelectorAll('.section-badge').length
      })));
      assert.deepEqual(headings, [
        { title: 'Work & Attendance', iconCount: 0, badgeCount: 0 },
        { title: 'Overtime Analytics', iconCount: 0, badgeCount: 0 },
        { title: 'Exceptions & Leave', iconCount: 0, badgeCount: 0 }
      ]);
    });
    await check('hours summary records use History Cards and open populated attendance details', async () => {
      await page.evaluate(() => openListDetails('Scheduled Work Days'));
      const scheduled = await page.evaluate(() => ({
        title: document.getElementById('headerTitle').textContent.trim(),
        count: document.getElementById('list-record-count').textContent.trim(),
        totalHours: document.getElementById('list-total-hours')?.textContent.trim(),
        summary: (() => {
          const overview = document.querySelector('.summary-list-overview');
          const rows = [...overview.querySelectorAll('.summary-list-row')];
          const chart = document.getElementById('btn-chart-toggle');
          const count = document.getElementById('list-record-count');
          const total = document.getElementById('list-total-hours');
          const overviewStyle = getComputedStyle(overview);
          const labelStyle = getComputedStyle(rows[0].querySelector('.summary-list-stat span'));
          const countStyle = getComputedStyle(count);
          const totalStyle = getComputedStyle(total);
          return {
            labels: rows.map(row => row.querySelector('.summary-list-stat span')?.textContent.trim()),
            chartInsideFirstRow: rows[0]?.contains(chart) || false,
            chartAfterCount: chart.getBoundingClientRect().left > count.getBoundingClientRect().right,
            secondRowBelowFirst: rows[1]?.getBoundingClientRect().top >= rows[0]?.getBoundingClientRect().bottom,
            headerHasChart: Boolean(document.querySelector('.cal-top-header #btn-chart-toggle')),
            exportButtons: overview.querySelectorAll('.fa-file-pdf, .fa-file-excel, [data-export]').length,
            radius: overviewStyle.borderRadius,
            padding: overviewStyle.padding,
            gap: overviewStyle.gap,
            marginBottom: overviewStyle.marginBottom,
            background: overviewStyle.backgroundImage,
            labelSize: labelStyle.fontSize,
            labelWeight: labelStyle.fontWeight,
            labelTransform: labelStyle.textTransform,
            countSize: countStyle.fontSize,
            countWeight: countStyle.fontWeight,
            countColor: countStyle.color,
            totalSize: totalStyle.fontSize,
            totalWeight: totalStyle.fontWeight,
            totalColor: totalStyle.color
          };
        })(),
        cards: [...document.querySelectorAll('#details-list-container .summary-history-card')].map(card => ({
          hasHistoryClass: card.classList.contains('history-card-item'),
          radius: getComputedStyle(card).borderRadius,
          hasDateBadge: Boolean(card.querySelector('.date-badge, .history-date-badge')),
          role: card.getAttribute('role'),
          tabIndex: card.tabIndex,
          title: card.querySelector('.history-time-row')?.textContent.replace(/\s+/g, ' ').trim(),
          date: card.querySelector('.summary-history-date')?.textContent.trim(),
          background: getComputedStyle(card).backgroundImage,
          borderTopColor: getComputedStyle(card).borderTopColor,
          borderLeftColor: getComputedStyle(card).borderLeftColor,
          detailsBackground: getComputedStyle(card.querySelector('.summary-history-details')).backgroundColor,
          labels: [...card.querySelectorAll('.summary-history-detail > span')].map(node => node.textContent.trim())
        }))
      }));
      assert.equal(scheduled.title, 'Scheduled Work Days');
      assert.equal(scheduled.count, '22');
      assert.equal(scheduled.totalHours, '176.00');
      assert.deepEqual(scheduled.summary, {
        labels: ['Records', 'Total Hours'],
        chartInsideFirstRow: true,
        chartAfterCount: true,
        secondRowBelowFirst: true,
        headerHasChart: false,
        exportButtons: 0,
        radius: '18px',
        padding: '16px',
        gap: '12px',
        marginBottom: '20px',
        background: scheduled.summary.background,
        labelSize: '13px',
        labelWeight: '700',
        labelTransform: 'none',
        countSize: '18px',
        countWeight: '800',
        countColor: scheduled.summary.countColor,
        totalSize: '15px',
        totalWeight: '800',
        totalColor: scheduled.summary.totalColor
      });
      assert.match(scheduled.summary.background, /124, 58, 237/, 'Summary uses the Leave Highlight lavender surface');
      assert.notEqual(scheduled.summary.countColor, scheduled.summary.totalColor, 'Total Records keeps the purple highlight value');
      assert.equal(scheduled.cards.length, 22);
      assert.ok(scheduled.cards.every(card => card.hasHistoryClass && card.radius === '18px' && !card.hasDateBadge));
      assert.ok(scheduled.cards.every(card => card.role === 'button' && card.tabIndex === 0));
      assert.equal(scheduled.cards[0].title, 'W01: 8.30AM\u20135.30PM');
      assert.doesNotMatch(scheduled.cards[0].title, /\uFFFD/, 'Shift time does not contain a broken encoding character');
      assert.equal(scheduled.cards[0].date, 'Mon, 14 Sep 2026');
      assert.match(scheduled.cards[0].background, /16, 185, 129/, 'Normal attendance matches the Approved Leave History surface');
      assert.equal(scheduled.cards[0].borderLeftColor, 'rgb(16, 185, 129)', 'Category color stays on the left accent');
      assert.notEqual(scheduled.cards[0].borderTopColor, scheduled.cards[0].borderLeftColor, 'Category accent does not recolor the full border');
      assert.match(scheduled.cards[0].detailsBackground, /16, 185, 129/, 'Inner details panel matches Approved Leave History');
      assert.deepEqual(scheduled.cards[0].labels, ['Clock Times', 'Scheduled Hours']);

      await page.click('#details-list-container .summary-history-card');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('modal-attendance-details')).display === 'flex');
      const details = await page.evaluate(() => ({
        title: document.querySelector('#modal-attendance-details .modal-header-purple h3').textContent.trim(),
        employee: document.getElementById('ad-emp-no').textContent.trim(),
        name: document.getElementById('ad-name').textContent.trim(),
        date: document.getElementById('ad-date').textContent.trim(),
        shift: document.getElementById('ad-shift').textContent.trim(),
        clockTimes: document.getElementById('ad-clock-times').textContent.trim(),
        normalHours: document.getElementById('ad-normal-hours').textContent.trim(),
        approvedOt: document.getElementById('ad-approved-ot').textContent.trim(),
        otCode: document.getElementById('ad-ot-code').textContent.trim()
      }));
      assert.deepEqual(details, {
        title: 'Attendance Details',
        employee: 'EBB12',
        name: 'Farhan binti rahmat',
        date: '14 Sep 2026',
        shift: '8.30AM\u20135.30PM (W01)',
        clockTimes: '0745 1750',
        normalHours: '08:00',
        approvedOt: '0.50',
        otCode: 'OB1'
      });
      const emptyLeaveSection = await page.evaluate(() => ({
        title: document.querySelector('[data-attendance-detail-section="leave"]')?.textContent.trim(),
        tableHidden: document.getElementById('ad-leave-info-table')?.hidden,
        valueInsideSeparatedTable: Boolean(document.getElementById('ad-leave-info-table')?.contains(document.getElementById('ad-leave-info')))
      }));
      assert.deepEqual(emptyLeaveSection, {
        title: 'Leave Info',
        tableHidden: true,
        valueInsideSeparatedTable: true
      });
      const overtimeTable = await page.evaluate(() => {
        const ids = ['ad-ot-code', 'ad-ot-desc', 'ad-ot-hours', 'ad-uot'];
        const nodes = ids.map(id => document.getElementById(id));
        const parents = nodes.map(node => node?.closest('.attendance-detail-subtable'));
        return {
          parentCount: new Set(parents).size,
          rows: parents[0]?.querySelectorAll('.attendance-detail-subrow').length,
          labels: [...(parents[0]?.querySelectorAll('.attendance-detail-subrow > :first-child') || [])]
            .map(node => node.textContent.trim())
        };
      });
      assert.deepEqual(overtimeTable, {
        parentCount: 1,
        rows: 4,
        labels: ['OT Code', 'Description', 'OT Hours', 'UOT']
      });

      await page.evaluate(() => openAttendanceDetails({
        ...sampleWorkDays[0],
        leaveInfo: 'Annual Leave � 1.00 Day'
      }));
      const populatedLeaveSection = await page.evaluate(() => ({
        tableHidden: document.getElementById('ad-leave-info-table').hidden,
        value: document.getElementById('ad-leave-info').textContent.trim()
      }));
      assert.deepEqual(populatedLeaveSection, {
        tableHidden: false,
        value: 'Annual Leave � 1.00 Day'
      });
      await page.evaluate(() => closeAttendanceDetails(true));
      await page.waitForFunction(() => getComputedStyle(document.getElementById('modal-attendance-details')).display === 'none');

      await page.evaluate(() => openListDetails('Normal Present Days'));
      const present = await page.evaluate(() => ({
        count: document.getElementById('list-record-count').textContent.trim(),
        totalHours: document.getElementById('list-total-hours').textContent.trim(),
        labels: [...document.querySelector('.summary-history-card').querySelectorAll('.summary-history-detail > span')]
          .map(node => node.textContent.trim()),
        statuses: [...document.querySelectorAll('.summary-history-card-header .card-status-badge')].slice(0, 2).map(node => node.textContent.trim())
      }));
      assert.deepEqual(present, {
        count: '21',
        totalHours: '168.00',
        labels: ['Clock Times', 'Normal Hours'],
        statuses: ['Normal', 'Unapproved OT']
      });
    });
    await check('hours summary View Chart is a compliant labeled pill', async () => {
      const button = await page.$eval('#btn-chart-toggle', node => {
        const rect = node.getBoundingClientRect();
        return {
          text: node.textContent.replace(/\s+/g, ' ').trim(),
          hasBarIcon: Boolean(node.querySelector('.fa-chart-simple')),
          whiteSpace: getComputedStyle(node).whiteSpace,
          width: rect.width,
          height: rect.height
        };
      });
      assert.equal(button.text, 'Chart');
      assert.equal(button.hasBarIcon, true);
      assert.equal(button.whiteSpace, 'nowrap');
      assert.ok(button.width > button.height);
    });

    await page.goto(url('modules/attendance/options/daily-ot.html'), { waitUntil: 'domcontentloaded' });
    await check('daily OT View Chart stays on one line', async () => {
      assert.equal(await page.$eval('.view-chart-btn', node => getComputedStyle(node).whiteSpace), 'nowrap');
    });
  } finally {
    await browser.close();
  }

  if (failures.length) {
    throw new Error(`\n${failures.join('\n')}`);
  }
  console.log('Attendance/Leave report fixes verified.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
