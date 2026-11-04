const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const output = process.env.OPTION_PREVIEW_DIR;
const pages = [
  { name: 'workplace', file: 'modules/admin/index.html', views: [
    { name: 'individual', grid: '#workplaceQuickOptions', count: 6 },
    { name: 'all', clicks: ['[data-workplace-options-open]'], grid: '#workplaceAllOptions', count: 8 },
    { name: 'team', clicks: ['#workplaceTabTeam'], empty: '#workplaceTeamPanel' }
  ] },
  { name: 'employee-career', file: 'modules/employee-career/index.html', views: [
    { name: 'individual', grid: '#employeeCareerOptions', count: 5 },
    { name: 'team', clicks: ['#employeeCareerTabTeam'], grid: '#employeeCareerOptions', count: 6 },
    { name: 'all', clicks: ['#employeeCareerTabTeam', '[data-action="view-all"]'], grid: '#employeeCareerAllOptionsGrid', count: 17 }
  ] },
  { name: 'training', file: 'modules/training-competency/index.html', views: [
    { name: 'individual', grid: '#trainingCompetencyIndividualOptions', count: 6 },
    { name: 'all', clicks: ['[data-view-all]'], grid: '#trainingCompetencyAllOptions', count: 8 },
    { name: 'team', clicks: ['#trainingCompetencyTabTeam'], grid: '#trainingCompetencyTeamOptions', count: 6 }
  ] },
  { name: 'performance', file: 'modules/performance/index.html', views: [
    { name: 'individual', grid: '#performanceIndividualPanel .performance-options', count: 5 },
    { name: 'team', clicks: ['#performanceTabTeam'], grid: '#performanceTeamPanel .performance-options', count: 6 }
  ] },
  { name: 'claims', file: 'modules/claims/index.html', views: [
    { name: 'individual', grid: '#claimOptionsHubGrid', count: 6 },
    { name: 'all', clicks: ['#claimOptionsHubGrid button'], grid: '#allClaimOptionsModalGrid', count: 10 },
    { name: 'team', clicks: ['#tabClaimTeam'], grid: '#managerOptionsGrid', count: 4 }
  ] },
  { name: 'payroll', file: 'modules/payroll/index.html', views: [
    { name: 'individual', grid: '#individualPayrollOptionsGrid', count: 6 },
    { name: 'team', clicks: ['#tabPayrollTeam'], grid: '#scopeTeamSection .payroll-options-grid', count: 1 }
  ] },
  { name: 'attendance', file: 'modules/attendance/index.html', views: [
    { name: 'individual', grid: '.attendance-quick-grid', count: 5 }
  ] },
  { name: 'attendance-alternate', file: 'modules/attendance/options/individual.html', views: [
    { name: 'individual', grid: '.attendance-quick-grid', count: 5 }
  ] },
  { name: 'attendance-team', file: 'modules/attendance/options/team.html', views: [
    { name: 'team', grid: '.attendance-team-options-grid', count: 6 },
    { name: 'all', clicks: ['button[onclick="openTeamOptionsModal()"]'], grid: '#TeamOptionsModalOverlay .attendance-team-options-grid', count: 13 }
  ] },
  { name: 'leave', file: 'leave.html', views: [
    { name: 'individual', grid: '#hubSectionIndividual .leave-dashboard-quick-grid', count: 4 },
    { name: 'team', clicks: ['#tabHubTeam'], grid: '#hubSectionTeam .leave-dashboard-quick-grid', count: 2 }
  ] },
  { name: 'project', file: 'modules/project-task/index.html', views: [
    { name: 'individual', grid: '#projectPanel-individual .project-dashboard-quick-grid', count: 3 },
    { name: 'team', clicks: ['#projectTab-team'], grid: '#projectTeamOptions', count: 2 }
  ] },
  // These legacy module shells are layout previews; the active routes use leave.html and me.html.
  { name: 'leave-module', file: 'modules/leave/index.html', visualOnly: true, views: [{ name: 'options', grid: '.module-option-grid', count: 4 }] },
  { name: 'profile-module', file: 'modules/me/index.html', visualOnly: true, views: [{ name: 'options', grid: '.module-option-grid', count: 6 }] }
];

async function inspect(page, selector) {
  return page.$eval(selector, grid => {
    const properties = (node, keys) => {
      const style = getComputedStyle(node);
      return Object.fromEntries(keys.map(key => [key, style[key]]));
    };
    const cards = [...grid.querySelectorAll(':scope > a, :scope > button, :scope > .card, :scope > .claim-square-card, :scope > .leave-dashboard-quick-card, :scope > li > a, :scope > li > button')]
      .filter(node => node.getClientRects().length && node.getBoundingClientRect().width > 0);
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      gap: getComputedStyle(grid).gap,
      fits: grid.scrollWidth <= grid.clientWidth + 1,
      cards: cards.map(card => {
        const icon = card.firstElementChild;
        const title = card.querySelector('.project-option-title') || card.lastElementChild;
        const bounds = card.getBoundingClientRect();
        const iconBounds = icon.getBoundingClientRect();
        const titleBounds = title.getBoundingClientRect();
        const label = card.textContent.replace(/\s+/g, ' ').trim();
        return {
          label,
          tile: properties(card, ['display', 'flexDirection', 'alignItems', 'justifyContent', 'gap', 'minHeight', 'padding', 'borderRadius', 'borderWidth', 'borderColor', 'backgroundColor', 'boxShadow']),
          icon: properties(icon, ['width', 'height', 'borderRadius', 'borderWidth', 'backgroundColor', 'color', 'fontSize', 'margin']),
          title: properties(title, ['fontSize', 'fontWeight', 'lineHeight', 'color', 'textAlign']),
          iconClass: icon.querySelector('i')?.className || '',
          glyphSize: icon.querySelector('i') ? getComputedStyle(icon.querySelector('i')).fontSize : '',
          height: bounds.height,
          fits: card.scrollWidth <= card.clientWidth + 1 && title.scrollWidth <= title.clientWidth + 1
            && iconBounds.left >= bounds.left && iconBounds.right <= bounds.right + 1
            && titleBounds.left >= bounds.left - 1 && titleBounds.right <= bounds.right + 1
            && titleBounds.bottom <= bounds.bottom + 1,
          href: card.href || null
        };
      })
    };
  });
}

(async () => {
  if (output) fs.mkdirSync(output, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  let checks = 0;
  try {
    for (const theme of ['light', 'dark']) {
      await page.setViewport({ width: 390, height: 950 });
      await page.goto(pathToFileURL(path.join(root, 'modules/admin/index.html')).href + '?theme=' + theme, { waitUntil: 'load' });
      await page.mouse.move(0, 0);
      await page.evaluate(() => Promise.all([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 350))]));
      const reference = (await inspect(page, '#workplaceQuickOptions')).cards[0];
      for (const target of pages) for (const view of target.views) {
        await page.setViewport({ width: 390, height: 950 });
        await page.goto(pathToFileURL(path.join(root, target.file)).href + '?theme=' + theme, { waitUntil: 'load' });
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        for (const selector of view.clicks || []) await page.click(selector);
        await page.mouse.move(0, 0);
        await page.evaluate(() => Promise.all([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 350))]));
        if (view.empty) {
          assert.equal(await page.$eval(view.empty, node => node.childElementCount), 0, `${target.name}/${view.name}: empty panel`);
          assert.equal(await page.$eval(view.empty, node => node.hidden), false);
          continue;
        }
        for (const width of [320, 390, 420]) {
          await page.setViewport({ width, height: 950 });
          const context = `${target.name}/${view.name} ${theme} ${width}px`;
          const result = await inspect(page, view.grid);
          assert.equal(result.cards.length, view.count, context + ': option count');
          assert.equal(result.columns, 3, context + ': three columns');
          assert.equal(result.gap, '12px', context + ': grid spacing');
          assert.ok(result.fits, context + ': grid must fit');
          for (const card of result.cards) {
            for (const part of ['tile', 'icon', 'title']) assert.deepEqual(card[part], reference[part], context + ': ' + card.label + ' ' + part);
            assert.equal(card.glyphSize, '20px', context + ': icon glyph size');
            assert.ok(card.height >= 118 && card.fits, context + ': ' + card.label + ' must fit its tile');
            if (card.label === 'View All') assert.match(card.iconClass, /fa-ellipsis\b/, context + ': View All icon');
            if (!target.visualOnly && card.href?.startsWith('file:')) assert.ok(fs.existsSync(decodeURIComponent(new URL(card.href).pathname.slice(1))), context + ': local option destination exists');
          }
          checks += result.cards.length;
        }
        if (output) {
          await page.setViewport({ width: 390, height: 950 });
          if (!view.name.includes('all')) await page.$eval(view.grid, node => node.scrollIntoView({ block: 'center' }));
          await page.screenshot({ path: path.join(output, `${target.name}-${view.name}-${theme}.png`) });
        }
        console.log(`PASS ${target.name}/${view.name} ${theme}: ${view.count} options at 320/390/420px`);
      }
    }
    console.log(`PASS: ${checks} rendered tiles match Workplace across all module dashboards and All Options sheets.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
