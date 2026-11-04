const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};
const near = (actual, expected, tolerance = 0.6) => Math.abs(actual - expected) <= tolerance;

const dashboards = [
  {
    name: 'Attendance',
    file: 'modules/attendance/index.html',
    title: '.cal-top-header h1',
    subtitle: '.cal-top-header h1 + div',
    tabs: '.view-mode-switcher',
    activeTab: '.view-mode-tab.active',
    statusTitle: '#attendanceWorkStatusTitle',
    statusCards: '.work-status-card',
    quickTitle: '.attendance-quick-title',
    quickGrid: '.attendance-quick-grid',
    quickCards: '.attendance-quick-card',
    quickIcons: '.attendance-quick-icon',
    quickCount: 5
  },
  {
    name: 'Claims',
    file: 'modules/claims/index.html',
    title: '#globalTopTitle',
    subtitle: '#headerSubtitleText',
    tabs: '#mainScopeSwitcher',
    activeTab: '#tabClaimIndividual',
    statusTitle: '#claimWorkStatusTitle',
    statusCards: '#scopeIndividualSection .work-status-card',
    quickTitle: '#claimQuickOptionsTitle',
    quickGrid: '#claimOptionsHubGrid',
    quickCards: '#claimOptionsHubGrid > .claim-square-card',
    quickIcons: '#claimOptionsHubGrid .claim-square-icon-wrap',
    quickCount: 6
  },
  {
    name: 'Leave',
    file: 'leave.html',
    title: '#headerTitleText',
    subtitle: '#headerSubtitleText',
    tabs: '#viewLeaveHub .view-mode-switcher',
    activeTab: '#tabHubIndividual',
    statusTitle: '#leaveWorkStatusTitle',
    statusCards: '#hubSectionIndividual .work-status-card',
    quickTitle: '.leave-dashboard-quick-title',
    quickGrid: '.leave-dashboard-quick-grid',
    quickCards: '#hubSectionIndividual .leave-dashboard-quick-card',
    quickIcons: '#hubSectionIndividual .leave-dashboard-quick-icon',
    quickCount: 4
  },
  {
    name: 'Payroll',
    file: 'modules/payroll/index.html',
    title: '#globalTopTitle',
    subtitle: '#headerSubtitleText',
    tabs: '#mainScopeSwitcher',
    activeTab: '#tabPayrollIndividual',
    statusTitle: '#myWorkStatusTitle',
    statusCards: '#scopeIndividualSection .request-metric',
    quickTitle: '.payroll-quick-options-heading',
    quickGrid: '#individualPayrollOptionsGrid',
    quickCards: '#individualPayrollOptionsGrid > .payroll-option-card',
    quickIcons: '#individualPayrollOptionsGrid .opt-icon-wrap',
    quickCount: 6
  },
  {
    name: 'Project & Task',
    file: 'modules/project-task/index.html',
    title: '.project-header h1',
    subtitle: '.project-header-scope',
    tabs: '.project-scope-tabs',
    activeTab: '#projectTab-individual',
    statusTitle: '#projectWorkStatusTitle',
    statusCards: '#projectPanel-individual .project-dashboard-status-card',
    quickTitle: '#projectQuickOptionsTitle',
    quickGrid: '#projectPanel-individual .project-dashboard-quick-grid',
    quickCards: '#projectPanel-individual .project-option',
    quickIcons: '#projectPanel-individual .project-option-icon',
    quickCount: 3
  }
];

const styleOf = (element) => {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return {
    text: element.textContent.replace(/\s+/g, ' ').trim(),
    width: rect.width,
    height: rect.height,
    fontSize: parseFloat(style.fontSize),
    fontWeight: style.fontWeight,
    marginBottom: parseFloat(style.marginBottom),
    paddingTop: parseFloat(style.paddingTop),
    paddingRight: parseFloat(style.paddingRight),
    radius: parseFloat(style.borderTopLeftRadius),
    gap: parseFloat(style.gap),
    backgroundImage: style.backgroundImage
  };
};

(async () => {
  const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(chrome) ? chrome : undefined),
    args: ['--no-sandbox']
  });
  try {
    for (const dashboard of dashboards) {
      const page = await browser.newPage();
      await page.setViewport({ width: 600, height: 1000, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(path.join(root, dashboard.file)).href + '?theme=dark', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      await new Promise(resolve => setTimeout(resolve, 250));

      const result = await page.evaluate((dashboard, styleSource) => {
        const styleOf = new Function('element', `return (${styleSource})(element)`);
        const one = selector => {
          const element = document.querySelector(selector);
          return element ? styleOf(element) : null;
        };
        const many = selector => [...document.querySelectorAll(selector)].map(styleOf);
        return {
          title: one(dashboard.title),
          subtitle: one(dashboard.subtitle),
          tabs: one(dashboard.tabs),
          activeTab: one(dashboard.activeTab),
          statusTitle: one(dashboard.statusTitle),
          statusCards: many(dashboard.statusCards),
          quickTitle: one(dashboard.quickTitle),
          quickGrid: one(dashboard.quickGrid),
          quickCards: many(dashboard.quickCards),
          quickIcons: many(dashboard.quickIcons)
        };
      }, dashboard, styleOf.toString());

      expect(result.title?.fontSize === 17, `${dashboard.name}: header title must be 17px`);
      expect(result.subtitle?.text === 'Individual', `${dashboard.name}: header subtitle must show Individual`);
      expect(result.subtitle?.fontSize === 12, `${dashboard.name}: header subtitle must be 12px`);
      expect(near(result.tabs?.width || 0, 384), `${dashboard.name}: scope tabs must be 384px wide`);
      expect(near(result.tabs?.height || 0, 47), `${dashboard.name}: scope tabs must be 47px high`);
      expect(result.tabs?.radius === 20, `${dashboard.name}: scope tabs must use a 20px radius`);
      expect(result.activeTab?.radius === 16, `${dashboard.name}: active tab must use a 16px radius`);
      expect(result.activeTab?.backgroundImage.includes('linear-gradient'), `${dashboard.name}: active tab must use the purple gradient`);

      expect(result.statusTitle?.fontSize === 11.5, `${dashboard.name}: status heading must be 11.5px`);
      expect(result.statusTitle?.marginBottom === 10, `${dashboard.name}: status heading spacing must be 10px`);
      expect(result.statusCards.length === 4, `${dashboard.name}: must show four status cards`);
      expect(result.statusCards[0].text.includes('Submitted'), `${dashboard.name}: Submitted must be first`);
      expect(result.statusCards[1].text.includes('Pending Resubmit'), `${dashboard.name}: Pending Resubmit must be beside Submitted`);
      for (const card of result.statusCards) {
        expect(near(card.height, 80), `${dashboard.name}: status cards must be 80px high`);
        expect(card.radius === 16, `${dashboard.name}: status cards must use a 16px radius`);
        expect(card.paddingTop === 6 && card.paddingRight === 8, `${dashboard.name}: status card padding must be 6px 8px`);
      }

      expect(result.quickTitle?.fontSize === 11.5, `${dashboard.name}: Quick Options heading must be 11.5px`);
      expect(result.quickTitle?.marginBottom === 10, `${dashboard.name}: Quick Options heading spacing must be 10px`);
      expect(near(result.quickGrid?.width || 0, 384), `${dashboard.name}: Quick Options grid must be 384px wide`);
      expect(result.quickGrid?.gap === 12, `${dashboard.name}: Quick Options grid gap must be 12px`);
      expect(result.quickCards.length === dashboard.quickCount, `${dashboard.name}: Quick Options count changed`);
      for (const card of result.quickCards) {
        expect(card.height >= 118, `${dashboard.name}: Quick Options cards must be at least 118px high`);
        expect(card.radius === 18, `${dashboard.name}: Quick Options cards must use an 18px radius`);
        expect(card.paddingTop === 16 && card.paddingRight === 6, `${dashboard.name}: Quick Options card padding must be 16px 6px`);
      }
      for (const icon of result.quickIcons) {
        expect(near(icon.width, 44) && near(icon.height, 44), `${dashboard.name}: Quick Options icons must be 44px square`);
      }

      if (dashboard.name === 'Attendance') {
        expect(result.statusCards[0].text.startsWith('2 Submitted'), 'Attendance: first status must read Submitted');
      }
      if (dashboard.name === 'Payroll') {
        expect(result.statusCards[2].text.endsWith('Confirmed'), 'Payroll: approved helper must read Confirmed');
        expect(result.statusCards[3].text.endsWith('Declined'), 'Payroll: rejected helper must read Declined');
      }
      if (dashboard.name === 'Leave') {
        await page.click('#hubSectionIndividual [data-status="resubmit"]');
        expect(await page.$eval('#modalHistoryStatusSelect', node => node.value) === 'resubmit', 'Leave: Pending Resubmit opens the matching History filter');
        expect(await page.$eval('#historyFilterSummaryText', node => node.textContent.includes('Pending Resubmit')), 'Leave: History summary shows Pending Resubmit');
      }
      if (dashboard.name.startsWith('Attendance')) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          page.click('[data-status="resubmit"]')
        ]);
        expect(await page.$eval('#filterStatusSelect', node => node.value) === 'resubmit', `${dashboard.name}: matching History status filter`);
        expect(await page.$$eval('.history-card-item', nodes => nodes.every(node => getComputedStyle(node).display === 'none')), `${dashboard.name}: other statuses are excluded`);
      }
      await page.close();
    }

    const statusDashboards = [...dashboards, {
      name: 'Attendance alternate Individual page',
      file: 'modules/attendance/options/individual.html',
      statusCards: '.work-status-card'
    }];
    for (const dashboard of statusDashboards) {
      const page = await browser.newPage();
      for (const theme of ['dark', 'light']) {
        await page.goto(pathToFileURL(path.join(root, dashboard.file)).href + `?theme=${theme}`, {
          waitUntil: 'domcontentloaded'
        });
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        await page.evaluate(() => document.fonts.ready);
        for (const width of [320, 360, 390]) {
          await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
          const cards = await page.$$eval(dashboard.statusCards, nodes => nodes.map(node => {
            const rect = node.getBoundingClientRect();
            return {
              label: node.querySelector('span').textContent.trim(),
              x: rect.x, y: rect.y, right: rect.right,
              contentSizes: [...node.children].map(child => ({ text: child.textContent, width: child.clientWidth, scrollWidth: child.scrollWidth })),
              childrenFit: [...node.children].every(child => {
                const box = child.getBoundingClientRect();
                return child.scrollWidth <= child.clientWidth + 1
                  && box.left >= rect.left && box.right <= rect.right
                  && box.top >= rect.top && box.bottom <= rect.bottom;
              })
            };
          }));
          const context = `${dashboard.name}, ${theme}, ${width}px`;
          expect(cards.length === 4, `${context}: four status cards`);
          expect(cards[0].label === 'Submitted' && cards[1].label === 'Pending Resubmit', `${context}: status order`);
          expect(near(cards[1].y, cards[0].y) && cards[1].x > cards[0].x, `${context}: Pending Resubmit is beside Submitted`);
          if (width >= 360) expect(cards.every(card => near(card.y, cards[0].y)), `${context}: all status cards stay in one row`);
          else expect(cards[2].y > cards[0].y && near(cards[2].y, cards[3].y), `${context}: narrow screens use two rows`);
          expect(cards.every(card => card.childrenFit), `${context}: status labels must not clip or overflow: ${JSON.stringify(cards)}`);
          expect(cards[0].x >= 0 && cards[3].right <= width, `${context}: cards fit the viewport`);
          if (dashboard.name === 'Attendance' && width === 390) {
            await page.screenshot({ path: path.join(root, `scratch/pending_resubmit_attendance_${theme}.png`) });
          }
        }
      }
      await page.close();
    }

    const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    expect(appJs.includes("'apply_leave': 'leave.html'"), 'Apply Leave route must use the unified dashboard');
    expect(appJs.includes("'leave_holidays': 'leave.html'"), 'Leave & Holidays route must use the unified dashboard');
    console.log('All Individual dashboard consistency checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
