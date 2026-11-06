const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const listUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/daily-ot.html')).href;
const detailUrl = pathToFileURL(path.resolve(__dirname, '../modules/attendance/options/daily-ot-details.html')).href;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 390, 430]) {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(`${listUrl}?theme=${theme}`, { waitUntil: 'networkidle0' });

        assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
        const dateSwitcher = await page.$eval('#dailyOtDateSwitcher', node => ({
          text: node.querySelector('#dailyOtCurrentDate').textContent.trim(),
          previous: Boolean(node.querySelector('[data-daily-ot-date-shift="-1"]')),
          next: Boolean(node.querySelector('[data-daily-ot-date-shift="1"]')),
          calendar: Boolean(node.querySelector('.fa-calendar-check')),
          dropdownArrow: Boolean(node.querySelector('#dailyOtDateTrigger .fa-chevron-down')),
          beforeFilter: node.nextElementSibling?.classList.contains('filter-summary-bar'),
          radius: Number.parseFloat(getComputedStyle(node).borderRadius)
        }));
        assert.deepEqual(dateSwitcher, {
          text: '16 Sep 2026',
          previous: true,
          next: true,
          calendar: true,
          dropdownArrow: false,
          beforeFilter: true,
          radius: 18
        });
        await page.click('[data-daily-ot-date-shift="-1"]');
        assert.equal(await page.$eval('#dailyOtCurrentDate', node => node.textContent.trim()), '15 Sep 2026');
        assert.equal(await page.$eval('#filterDateInput', node => node.value), '15/09/2026');
        await page.click('[data-daily-ot-date-shift="1"]');
        assert.equal(await page.$eval('#dailyOtCurrentDate', node => node.textContent.trim()), '16 Sep 2026');
        await page.click('#dailyOtDateTrigger');
        assert.notEqual(await page.$eval('#filterModalOverlay', node => getComputedStyle(node).display), 'none');
        await page.evaluate(() => closeModalDirect('filterModalOverlay'));
        await page.waitForSelector('#filterModalOverlay', { hidden: true });
        assert.equal(await page.$$eval('.action-summary-bar .fa-users', nodes => nodes.length), 0, 'Total Records must not show a leading icon');
        assert.equal(await page.$eval('#kpiApprovedCostText', node => node.textContent.trim()), '773.86');
        const approvedCost = await page.$eval('#kpiApprovedCostText', node => node.parentElement.textContent.replace(/\s+/g, ' ').trim());
        assert.equal(approvedCost, 'Approve OT Cost 773.86');
        assert.doesNotMatch(approvedCost, /\b(?:MYR|RM)\b/);
        assert.deepEqual(await page.$eval('.view-chart-btn', node => ({
          text: node.textContent.trim(),
          icon: node.querySelector('i')?.classList.contains('fa-chart-simple'),
          color: getComputedStyle(node).color,
          whiteSpace: getComputedStyle(node).whiteSpace
        })), {
          text: 'Chart',
          icon: true,
          color: 'rgb(255, 255, 255)',
          whiteSpace: 'nowrap'
        });

        const cards = await page.$$eval('#employeeCardList .daily-ot-card', nodes => nodes.map(card => {
          const box = card.getBoundingClientRect();
          return {
            tag: card.tagName,
            href: card.getAttribute('href'),
            radius: Number.parseFloat(getComputedStyle(card).borderRadius),
            icons: card.querySelectorAll('i').length,
            statusText: card.querySelector('.card-status-badge')?.textContent.trim(),
            statusIcon: card.querySelector('.card-status-badge i')?.className,
            statusColor: getComputedStyle(card.querySelector('.card-status-badge')).color,
            accentColor: getComputedStyle(card).borderLeftColor,
            hints: /Click to (view|edit) details/i.test(card.textContent),
            name: card.querySelector('.daily-ot-card-name')?.textContent.trim(),
            employeeId: card.querySelector('.daily-ot-card-id')?.textContent.trim(),
            values: [...card.querySelectorAll('.daily-ot-detail-value')].map(node => node.textContent.trim()),
            fits: box.left >= -1 && box.right <= window.innerWidth + 1
          };
        }));
        assert.equal(cards.length, 6);
        const expectedStatusColors = theme === 'dark'
          ? { approved: 'rgb(52, 211, 153)', unapproved: 'rgb(251, 191, 36)' }
          : { approved: 'rgb(5, 150, 105)', unapproved: 'rgb(217, 119, 6)' };
        const expectedAccentColors = {
          approved: 'rgb(16, 185, 129)',
          unapproved: 'rgb(245, 158, 11)'
        };
        const records = await page.evaluate(() => window.createDailyOtRecords());
        cards.forEach((card, index) => {
          const record = records[index];
          assert.equal(card.name, record.name);
          assert.equal(card.employeeId, '#' + record.id);
          assert.deepEqual(card.values, [record.shift, record.clockTime, record.actualHours, record.approvedHours, record.unapprovedHours], 'Every original OT field must stay unchanged');
        });
        assert.equal(await page.$$eval('#employeeCardList .modern-emp-card', nodes => nodes.length), 0);
        cards.forEach((card, index) => {
          if (index < 3) {
            assert.equal(card.tag, 'BUTTON', 'Approved records must open a read-only popup');
          } else {
            assert.equal(card.tag, 'A');
            assert.match(card.href, /daily-ot-details\.html\?employee=/);
          }
          assert.equal(card.radius, 18);
          assert.equal(card.icons, 1, 'Daily OT cards must only contain the semantic status icon');
          assert.equal(card.statusText, index < 3 ? 'Approved' : 'Unapproved');
          assert.match(card.statusIcon, index < 3 ? /fa-circle-check/ : /fa-clock-rotate-left/);
          assert.equal(card.statusColor, index < 3 ? expectedStatusColors.approved : expectedStatusColors.unapproved);
          assert.equal(card.accentColor, index < 3 ? expectedAccentColors.approved : expectedAccentColors.unapproved);
          assert.equal(card.hints, false);
          assert.ok(card.name);
          assert.match(card.employeeId, /^#/);
          assert.equal(card.fits, true);
        });

        assert.equal(await page.$('#employeeDetailsModal'), null);
        assert.equal(await page.$('#approvalModal'), null);
        assert.equal(await page.$eval('.main-content', node => node.scrollWidth <= node.clientWidth + 1), true);

        assert.equal(await page.$('#chartModal'), null, 'Daily OT chart must be a Highlight-style page view, not a popup');
        const chartPageUrl = page.url();
        await page.click('.view-chart-btn');
        await page.waitForSelector('#dailyOtChartView:not([hidden])');
        assert.equal(page.url(), chartPageUrl, 'View Chart must stay within the Daily OT page flow');
        assert.equal(await page.$eval('#dailyOtListView', node => node.hidden), true);
        assert.equal(await page.$eval('#dailyOtPageTitle', node => node.textContent.trim()), 'Daily OT Analysis');
        const chartCards = await page.$$eval('#dailyOtChartView > .daily-ot-analytics-card', cards => cards.map(card => ({
          classes: card.className,
          radius: getComputedStyle(card).borderRadius,
          padding: getComputedStyle(card).padding
        })));
        assert.equal(chartCards.length, 3, 'Daily OT Analysis must match Leave Analysis with three separate cards');
        assert.match(chartCards[0].classes, /daily-ot-breakdown-card/);
        assert.match(chartCards[1].classes, /daily-ot-donut-card/);
        assert.match(chartCards[2].classes, /daily-ot-details-card/);
        assert.deepEqual(chartCards.map(card => [card.radius, card.padding]), [
          ['24px', '18px 18px 16px'],
          ['28px', '22px 20px 24px'],
          ['28px', '22px 18px 18px']
        ]);
        assert.equal(await page.$$eval('#dailyOtChartView > .daily-ot-view-nav', nodes => nodes.length), 0);
        assert.equal(await page.$eval('#dailyOtChartMetricSelect', node => node.closest('.daily-ot-breakdown-card').querySelector('label').textContent.trim()), 'BREAKDOWN BY');
        assert.equal(await page.$$eval('#dailyOtChartView .daily-ot-chart-donut', nodes => nodes.length), 1);
        assert.equal(await page.$eval('#dailyOtChartView', node => node.scrollWidth <= node.clientWidth + 1), true);
        assert.deepEqual(await page.$$eval('#dailyOtChartLegendHead > *', nodes => nodes.map(node => node.textContent.trim())), ['STATUS', 'HOURS', '% OF TOTAL']);
        assert.deepEqual(await page.$$eval('#dailyOtChartLegend .daily-ot-chart-legend-row', rows => rows.map(row => [...row.children].map(cell => cell.textContent.trim()))), [
          ['Approved OT', '37.50', '21.68%'],
          ['Unapproved OT', '135.50', '78.32%']
        ]);
        await page.select('#dailyOtChartMetricSelect', 'section');
        assert.equal(await page.$eval('#dailyOtChartTitle', node => node.textContent.trim()), 'OT hours by section');
        assert.equal(await page.$$eval('#dailyOtChartLegend .daily-ot-chart-legend-row', rows => rows.length), 3);
        await page.select('#dailyOtChartMetricSelect', 'status');
        await page.click('#dailyOtViewTrend');
        await page.waitForSelector('#dailyOtTrendView:not([hidden])');
        assert.equal(await page.$eval('#dailyOtChartView', node => node.hidden), true);
        assert.equal(await page.$eval('#dailyOtPageTitle', node => node.textContent.trim()), 'Daily OT Trend Analysis');
        const trendCards = await page.$$eval('#dailyOtTrendView > .daily-ot-analytics-card', cards => cards.map(card => ({
          radius: getComputedStyle(card).borderRadius,
          padding: getComputedStyle(card).padding
        })));
        assert.deepEqual(trendCards, [
          { radius: '20px', padding: '16px 20px' },
          { radius: '22px', padding: '20px 22px' },
          { radius: '24px', padding: '22px 20px 20px' }
        ]);
        const trendVisual = await page.$eval('#dailyOtTrendView', view => {
          const rangeLabel = view.querySelector('.daily-ot-range-card small');
          const rangeDate = view.querySelector('.daily-ot-range-date strong');
          const heading = view.querySelector('.daily-ot-trend-heading');
          const columnHead = view.querySelector('.daily-ot-trend-column-head');
          const bars = view.querySelector('.daily-ot-trend-bars');
          const row = bars.querySelector('.daily-ot-trend-row');
          const month = row.querySelector('.daily-ot-trend-month');
          const track = row.querySelector('.daily-ot-trend-track');
          const fill = row.querySelector('.daily-ot-trend-fill');
          const value = row.querySelector('.daily-ot-trend-value');
          return {
            rangeLabel: {
              fontSize: getComputedStyle(rangeLabel).fontSize,
              marginBottom: getComputedStyle(rangeLabel).marginBottom
            },
            rangeDate: rangeDate.textContent.trim(),
            heading: {
              titleSize: getComputedStyle(heading.querySelector('h2')).fontSize,
              titleMargin: getComputedStyle(heading.querySelector('h2')).margin,
              subtitleSize: getComputedStyle(heading.querySelector('p')).fontSize,
              marginBottom: getComputedStyle(heading).marginBottom
            },
            columnLabels: columnHead ? [...columnHead.children].map(node => node.textContent.trim()) : [],
            columnHead: columnHead ? {
              marginBottom: getComputedStyle(columnHead).marginBottom,
              padding: getComputedStyle(columnHead).padding,
              borderBottomWidth: getComputedStyle(columnHead).borderBottomWidth
            } : null,
            barsGap: getComputedStyle(bars).gap,
            row: {
              minHeight: getComputedStyle(row).minHeight,
              padding: getComputedStyle(row).padding,
              margin: getComputedStyle(row).margin
            },
            month: {
              width: getComputedStyle(month).width,
              fontSize: getComputedStyle(month).fontSize
            },
            track: {
              height: getComputedStyle(track).height,
              backgroundColor: getComputedStyle(track).backgroundColor
            },
            fill: {
              height: getComputedStyle(fill).height,
              backgroundImage: getComputedStyle(fill).backgroundImage
            },
            value: {
              width: getComputedStyle(value).width,
              fontSize: getComputedStyle(value).fontSize
            }
          };
        });
        assert.deepEqual(trendVisual, {
          rangeLabel: { fontSize: '11px', marginBottom: '10px' },
          rangeDate: '1 Oct 2025 – 30 Sep 2026',
          heading: {
            titleSize: '18px',
            titleMargin: '0px 0px 3px',
            subtitleSize: '12.5px',
            marginBottom: '20px'
          },
          columnLabels: ['MONTH', 'HOURS'],
          columnHead: {
            marginBottom: '12px',
            padding: '0px 4px 12px',
            borderBottomWidth: '1px'
          },
          barsGap: '10px',
          row: { minHeight: '28px', padding: '2px 4px', margin: '0px -4px' },
          month: { width: '80px', fontSize: '12px' },
          track: { height: '16px', backgroundColor: 'rgba(0, 0, 0, 0)' },
          fill: {
            height: '16px',
            backgroundImage: 'linear-gradient(90deg, rgb(139, 92, 246), rgb(167, 139, 250))'
          },
          value: { width: '60px', fontSize: '13.5px' }
        }, 'Daily OT trend must use the Leave Highlight trend layout with OT-specific content');
        if (width === 390) {
          await page.screenshot({ path: path.resolve(__dirname, `daily-ot-trend-${theme}.png`) });
        }
        assert.equal(await page.$$eval('#dailyOtTrendView > .daily-ot-view-nav', nodes => nodes.length), 0);
        assert.equal(await page.$$eval('#dailyOtTrendBars .daily-ot-trend-row', rows => rows.length), 12);
        assert.equal(await page.$$eval('#dailyOtTrendBars .daily-ot-trend-fill', fills => fills.every(fill => {
          const style = getComputedStyle(fill);
          return style.display === 'block' && fill.getBoundingClientRect().width > 8;
        })), true, 'Every monthly trend row must render a visible colored bar');
        assert.equal(await page.$eval('#dailyOtTrendView', node => node.scrollWidth <= node.clientWidth + 1), true);
        await page.click('#dailyOtTrendSummary');
        await page.waitForSelector('#dailyOtTrendDetailView:not([hidden])');
        assert.equal(await page.$eval('#dailyOtPageTitle', node => node.textContent.trim()), 'Daily OT Analysis');
        const analysisCards = await page.$$eval('#dailyOtTrendDetailView > .daily-ot-analytics-card', cards => cards.map(card => card.className));
        assert.equal(analysisCards.length, 3, 'Daily OT month analysis must match Leave Highlight with three separate cards');
        assert.match(analysisCards[0], /daily-ot-analysis-filter-card/);
        assert.match(analysisCards[1], /daily-ot-analysis-donut-card/);
        assert.match(analysisCards[2], /daily-ot-analysis-details-card/);
        assert.deepEqual(await page.$$eval('#dailyOtAnalysisMetricSelect option', options => options.map(option => option.textContent.trim())), ['Approval Status', 'Section', 'Job Title']);
        assert.equal(await page.$eval('#dailyOtAnalysisTitle', node => node.textContent.trim()), 'OT hours by approval status');
        assert.equal(await page.$eval('#dailyOtAnalysisSubtitle', node => node.textContent.trim()), 'As At Oct 2025 – Sep 2026');
        assert.equal(await page.$eval('#dailyOtAnalysisTotal', node => node.textContent.trim()), '1005.00');
        assert.equal(await page.$$eval('#dailyOtTrendDetailView table', nodes => nodes.length), 0, 'Daily OT analysis must use the same plain legend as Leave Highlight');
        assert.equal(await page.$$eval('#dailyOtTrendDetailView [id$="RecordCount"]', nodes => nodes.length), 0, 'Plain analysis legend must not show Total Records');
        const legendVisual = await page.$eval('.daily-ot-analysis-details-card', card => {
          const head = card.querySelector('#dailyOtAnalysisLegendHead');
          const list = card.querySelector('#dailyOtAnalysisLegend');
          const row = list.querySelector('.daily-ot-chart-legend-row');
          return {
            headers: [...head.children].map(node => node.textContent.trim()),
            headerPadding: getComputedStyle(head).padding,
            headerBorder: getComputedStyle(head).borderBottomWidth,
            listGap: getComputedStyle(list).gap,
            listPaddingTop: getComputedStyle(list).paddingTop,
            rowBackground: getComputedStyle(row).backgroundColor
          };
        });
        assert.deepEqual(legendVisual, {
          headers: ['STATUS', 'HOURS', '% OF TOTAL'],
          headerPadding: '0px 0px 12px',
          headerBorder: '1px',
          listGap: '16px',
          listPaddingTop: '16px',
          rowBackground: 'rgba(0, 0, 0, 0)'
        });
        assert.deepEqual(await page.$$eval('#dailyOtAnalysisLegend .daily-ot-chart-legend-row', rows => rows.map(row => [...row.children].map(cell => cell.textContent.trim()))), [
          ['Approved OT', '353.00', '35.12%'],
          ['Unapproved OT', '652.00', '64.88%']
        ]);
        assert.equal(await page.$$eval('#dailyOtAnalysisSegments circle', circles => circles.length), 2);
        assert.equal(await page.$$eval('#dailyOtTrendDetailView .daily-ot-month-grid', nodes => nodes.length), 0, 'The old four-KPI detail card must be removed');
        await page.select('#dailyOtAnalysisMetricSelect', 'section');
        assert.equal(await page.$eval('#dailyOtAnalysisTitle', node => node.textContent.trim()), 'OT hours by section');
        assert.equal(await page.$$eval('#dailyOtAnalysisLegend .daily-ot-chart-legend-row', rows => rows.length), 3);
        await page.click('#dailyOtBackButton');
        await page.waitForSelector('#dailyOtTrendView:not([hidden])');
        await page.click('#dailyOtTrendBars .daily-ot-trend-row');
        await page.waitForSelector('#dailyOtTrendDetailView:not([hidden])');
        assert.equal(await page.$eval('#dailyOtAnalysisSubtitle', node => node.textContent.trim()), 'As At Oct 2025');
        assert.equal(await page.$eval('#dailyOtAnalysisTotal', node => node.textContent.trim()), '56.00');
        assert.deepEqual(await page.$$eval('#dailyOtAnalysisLegend .daily-ot-chart-legend-row', rows => rows.map(row => [...row.children].map(cell => cell.textContent.trim()))), [
          ['Approved OT', '12.50', '22.32%'],
          ['Unapproved OT', '43.50', '77.68%']
        ]);
        if (width === 390) {
          await page.screenshot({ path: path.resolve(__dirname, `daily-ot-month-analysis-${theme}.png`) });
        }
        assert.equal(await page.$eval('#dailyOtTrendDetailView', node => node.scrollWidth <= node.clientWidth + 1), true);
        await page.click('#dailyOtBackButton');
        await page.waitForSelector('#dailyOtTrendView:not([hidden])');
        await page.click('#dailyOtBackButton');
        await page.waitForSelector('#dailyOtChartView:not([hidden])');
        await page.click('#dailyOtBackButton');
        await page.waitForSelector('#dailyOtListView:not([hidden])');

        const firstCard = await page.$('#employeeCardList .daily-ot-card');
        if (width === 390) {
          await firstCard.evaluate(node => node.scrollIntoView({ block: 'start' }));
          await page.screenshot({ path: path.resolve(__dirname, `daily-ot-history-${theme}.png`) });
        }
        const listPageUrl = page.url();
        await firstCard.click();
        await page.waitForSelector('#approvedOtDetailsModal', { visible: true });
        assert.equal(page.url(), listPageUrl, 'Approved card must keep the list page open');
        assert.deepEqual(await page.$$eval('#approvedOtDetailsModal thead th', nodes => nodes.map(node => node.textContent.trim())), ['Description', 'Actual', 'Approve']);
        const expectedHeaderStyle = theme === 'dark'
          ? { backgroundColor: 'rgba(168, 85, 247, 0.18)', color: 'rgb(192, 132, 252)' }
          : { backgroundColor: 'rgb(243, 232, 255)', color: 'rgb(124, 58, 237)' };
        assert.deepEqual(await page.$$eval('#approvedOtDetailsModal thead th', nodes => nodes.map(node => ({
          backgroundColor: getComputedStyle(node).backgroundColor,
          backgroundImage: getComputedStyle(node).backgroundImage,
          color: getComputedStyle(node).color,
          textAlign: getComputedStyle(node).textAlign
        }))), Array.from({ length: 3 }, () => ({
          ...expectedHeaderStyle,
          backgroundImage: 'none',
          textAlign: 'left'
        })), 'Approved OT table headers must match the light-purple reference design');
        assert.deepEqual(await page.$$eval('#approvedOtDetailsModal tbody tr', rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), [['OT 1.5 BEFORE WORK', '0030', '0030']]);
        assert.deepEqual(await page.$eval('#approvedOtDetailsModal .approved-ot-table', table => {
          const header = table.querySelector('th');
          const firstCell = table.querySelector('tbody td');
          const shell = table.parentElement;
          return {
            headerColumnLine: getComputedStyle(header).borderRightWidth,
            bodyColumnLine: getComputedStyle(firstCell).borderRightWidth,
            rowLine: getComputedStyle(firstCell).borderBottomWidth,
            shellBorder: getComputedStyle(shell).borderWidth,
            shellRadius: getComputedStyle(shell).borderRadius,
            shellShadow: getComputedStyle(shell).boxShadow
          };
        }), {
          headerColumnLine: '0px',
          bodyColumnLine: '0px',
          rowLine: '1px',
          shellBorder: '0px',
          shellRadius: '0px',
          shellShadow: 'none'
        }, 'Approved OT details must use flat rows without boxed grid lines');
        assert.equal(await page.$$eval('#approvedOtDetailsModal .approved-ot-record', nodes => nodes.length), 0, 'Approved details must use one table instead of record cards');
        assert.deepEqual(await page.$$eval('#approvedOtDetailsModal .approved-ot-value', nodes => nodes.map(node => node.textContent)), ['0030', '0030']);
        assert.equal(await page.$$eval('#approvedOtDetailsModal input', nodes => nodes.length), 0, 'Approved details must be read-only');
        assert.equal(await page.$eval('#approvedOtDetailsModal', node => node.scrollWidth <= node.clientWidth + 1), true);
        if (width === 390) {
          await new Promise(resolve => setTimeout(resolve, 350));
          await page.screenshot({ path: path.resolve(__dirname, `daily-ot-approved-popup-${theme}.png`) });
        }
        await page.click('#approvedOtDetailsClose');
        await page.waitForSelector('#approvedOtDetailsModal', { hidden: true });
        await page.click('#employeeCardList .daily-ot-card:nth-child(2)');
        await page.waitForSelector('#approvedOtDetailsModal', { visible: true });
        assert.deepEqual(await page.$$eval('#approvedOtDetailsModal .approved-ot-value', nodes => nodes.map(node => node.textContent)), ['0200', '0200']);
        await page.keyboard.press('Escape');
        await page.waitForSelector('#approvedOtDetailsModal', { hidden: true });
        const unapprovedCard = await page.$('#employeeCardList .daily-ot-card.unapproved');
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), unapprovedCard.click()]);
        assert.equal(new URL(page.url()).searchParams.get('employee'), '000022');
        assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
        assert.equal(await page.$eval('#dailyOtDetailTitle', node => node.textContent.trim()), 'Daily OT Approval');
        assert.equal(await page.$$eval('.daily-ot-detail-content i', nodes => nodes.length), 0, 'Daily OT detail content must not use decorative icons');
        assert.equal(await page.$$eval('.daily-ot-approval-input', nodes => nodes.length), 8, 'Unapproved card opens its approval form');
        assert.equal(await page.$$eval('.daily-ot-void-checkbox', nodes => nodes.length), 8, 'Every Unapproved record card must use a Void checkbox');
        assert.equal(await page.$$eval('.daily-ot-void-button', nodes => nodes.length), 0, 'The old Void button must not remain');
        assert.equal(await page.$eval('.daily-ot-detail-content', node => node.scrollWidth <= node.clientWidth + 1), true);
        assert.equal(errors.length, 0, errors.join('\n'));
        await page.close();
      }

      const editPage = await browser.newPage();
      await editPage.setViewport({ width: 390, height: 900, deviceScaleFactor: 1 });
      await editPage.goto(`${detailUrl}?employee=000022&theme=${theme}`, { waitUntil: 'networkidle0' });
      assert.equal(await editPage.$$eval('.daily-ot-approval-input', nodes => nodes.length), 8);
      assert.equal(await editPage.$$eval('.daily-ot-void-checkbox', nodes => nodes.length), 8);
      assert.deepEqual(await editPage.$$eval('.daily-ot-void-checkbox', nodes => nodes.map(node => ({ type: node.type, label: node.closest('label')?.textContent.trim() }))), Array.from({ length: 8 }, () => ({ type: 'checkbox', label: 'Void' })));
      const voidControlLayout = await editPage.$eval('.daily-ot-void-control', node => {
        const controlBox = node.getBoundingClientRect();
        const fieldBox = node.parentElement.querySelector('.record-field').getBoundingClientRect();
        return {
          direction: getComputedStyle(node).flexDirection,
          spansFullRow: controlBox.width > fieldBox.width * 1.8
        };
      });
      assert.deepEqual(voidControlLayout, { direction: 'row', spansFullRow: true }, 'Void must be a full-width horizontal checkbox row beneath the two OT fields');
      assert.equal(await editPage.$eval('#dailyOtApproved0', node => node.disabled), false);
      await editPage.click('#dailyOtVoid0');
      assert.equal(await editPage.$eval('#dailyOtVoid0', node => node.checked), true);
      assert.equal(await editPage.$eval('#dailyOtApproved0', node => node.disabled), true);
      await editPage.click('#dailyOtVoid0');
      assert.equal(await editPage.$eval('#dailyOtApproved0', node => node.disabled), false);
      assert.equal(await editPage.$eval('#dailyOtUpdate', node => node.textContent.trim()), 'Update');
      assert.equal(await editPage.$eval('#dailyOtUpdate', node => node.querySelectorAll('i').length), 0);
      const getUpdateGeometry = () => editPage.$eval('#dailyOtActions', actions => {
        const button = actions.querySelector('#dailyOtUpdate');
        const phone = actions.closest('.phone-container');
        const nav = phone.querySelector('.bottom-nav');
        const buttonBox = button.getBoundingClientRect();
        const phoneBox = phone.getBoundingClientRect();
        const navBox = nav.getBoundingClientRect();
        return {
          position: getComputedStyle(actions).position,
          directPhoneChild: actions.parentElement === phone,
          rightGap: Math.round(phoneBox.right - buttonBox.right),
          navGap: Math.round(navBox.top - buttonBox.bottom),
          left: Math.round(buttonBox.left),
          top: Math.round(buttonBox.top)
        };
      });
      const updateAtTop = await getUpdateGeometry();
      assert.deepEqual({
        position: updateAtTop.position,
        directPhoneChild: updateAtTop.directPhoneChild,
        rightGap: updateAtTop.rightGap,
        navGap: updateAtTop.navGap
      }, {
        position: 'absolute',
        directPhoneChild: true,
        rightGap: 16,
        navGap: 16
      }, 'Update must stay fixed to the phone bottom-right above the bottom navigation');
      const detailScrollTop = await editPage.$eval('.daily-ot-detail-content', node => {
        node.scrollTo({ top: node.scrollHeight, behavior: 'instant' });
        return node.scrollTop;
      });
      assert.ok(detailScrollTop > 0, 'Daily OT approval content must be scrollable for the fixed-button check');
      const updateAtBottom = await getUpdateGeometry();
      assert.deepEqual({ left: updateAtBottom.left, top: updateAtBottom.top }, {
        left: updateAtTop.left,
        top: updateAtTop.top
      }, 'Update must not move when the approval content scrolls');
      assert.equal(await editPage.$eval('#dailyOtBack', node => new URL(node.href).pathname.endsWith('/daily-ot.html')), true);
      assert.equal(await editPage.$eval('#dailyOtBack', node => new URL(node.href).searchParams.get('theme')), theme);
      await editPage.close();
    }

    console.log('PASS: Approved cards open read-only OT popups; Unapproved cards open the approval page. Both themes, mobile widths, original data and navigation verified.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
