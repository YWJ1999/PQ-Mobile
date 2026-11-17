const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pageUrl = theme => pathToFileURL(path.join(root, 'modules/employee-career/options/team/org-chart.html')).href + `?theme=${theme}`;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());

    for (const theme of ['dark', 'light']) {
      await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 1 });
      await page.goto(pageUrl(theme), { waitUntil: 'load' });

      assert.equal(await page.$('.employee-career-coming-card'), null, 'Organization Chart is implemented');
      assert.equal(await page.$eval('#orgChartTitle', node => node.textContent.trim()), 'Org Chart');
      assert.equal(await page.$$eval('#orgChartTree .org-chart-node', nodes => nodes.length), 11);
      assert.equal(await page.$('#orgChartLegend'), null, 'Status summary tabs are not rendered');

      const firstEmployee = await page.$eval('#orgChartTree .org-chart-employee', card => {
        const name = card.querySelector('.org-chart-name');
        const employeeId = card.querySelector('.org-chart-employee-id');
        return {
          name: name.textContent.trim(),
          employeeId: employeeId.textContent.trim(),
          idBelowName: employeeId.getBoundingClientRect().top >= name.getBoundingClientRect().bottom,
          active: card.classList.contains('is-active')
        };
      });
      assert.deepEqual(firstEmployee, { name: 'Alex Wong', employeeId: '#EBB01', idBelowName: true, active: true });

      assert.equal(await page.$eval('#orgChartVisibleCount', node => node.textContent), '11');
      assert.equal(await page.$eval('#orgChartSpacingControls', controls => controls.getClientRects().length), 0);
      await page.click('#orgChartLayoutTrigger');
      const layout = '#orgChartLayoutOverlay';
      await page.waitForSelector(layout + ':not([hidden])');
      assert.equal(await page.$eval('main', node => node.inert), true);
      assert.deepEqual(await page.$eval('#orgChartSpacingControls', controls => ({
        labels: [...controls.querySelectorAll('label')].map(node => node.textContent.trim()),
        x: controls.querySelector('#orgChartMarginXValue').textContent.trim(),
        y: controls.querySelector('#orgChartMarginYValue').textContent.trim()
      })), { labels: ['Mrg. X', 'Mrg. Y'], x: '26', y: '14' });
      await page.locator('#orgChartMarginXIncrease').click();
      await page.locator('#orgChartMarginYDecrease').click();
      await page.click('#orgChartLayoutDone');
      assert.equal(await page.$eval(layout, node => node.hidden), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orgChartLayoutTrigger');
      assert.deepEqual(await page.$eval('#orgChartTree', tree => ({
        x: getComputedStyle(tree).getPropertyValue('--org-margin-x').trim(),
        y: getComputedStyle(tree).getPropertyValue('--org-margin-y').trim()
      })), { x: '28px', y: '12px' });
      await page.click('#orgChartLayoutTrigger');
      assert.equal(await page.$eval('#orgChartMarginXValue', el => el.textContent), '28');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orgChartLayoutDone');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'orgChartMarginXDecrease');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('main', node => node.inert), false);

      await page.click('#orgChartFilterTrigger');
      assert.deepEqual(await page.$$eval('#orgChartFilterForm label', nodes => nodes.map(node => node.textContent.trim())), ['Search Keyword', 'Organization Unit', 'Maximum Level', 'Skip Vacant?']);
      assert.deepEqual(await page.$eval('#orgChartFilterKeyword', control => ({
        tag: control.tagName,
        value: control.value,
        placeholder: control.options?.[0].textContent.trim()
      })), { tag: 'SELECT', value: '', placeholder: 'Select Employee' });
      assert.deepEqual(await page.$$eval('#orgChartFilterKeyword option', options => options.slice(1).map(option => option.textContent.trim())), [
        'Ahmad Razak', 'Alex Wong', 'Danial Ariff', 'Kavitha A/P Gopal', 'Lee Jia Ling', 'Marcus Chen', 'Nur Aina', 'Nurul Aishah', 'Siti Nurhaliza', 'Tan Wei Lun'
      ], 'Dropdown lists employees alphabetically and excludes vacant positions');
      await page.select('#orgChartFilterKeyword', 'EBB19');
      await page.click('#orgChartApplyFilter');
      assert.deepEqual(await page.$$eval('#orgChartTree .org-chart-name', nodes => nodes.map(node => node.textContent.trim())), ['Alex Wong', 'Siti Nurhaliza', 'Kavitha A/P Gopal']);
      assert.equal(await page.$eval('#orgChartVisibleCount', node => node.textContent.trim()), '3');
      assert.equal(await page.$eval('#orgChartFilterSummary', node => node.textContent.trim()), 'Employee: Kavitha A/P Gopal');
      await page.click('#orgChartLayoutTrigger');
      await page.locator('#orgChartMarginYIncrease').click();
      await page.click(layout, { offset: { x: 80, y: 70 } });
      assert.equal(await page.$eval(layout, el => el.hidden), true);
      assert.equal(await page.$eval('#orgChartVisibleCount', el => el.textContent), '3');

      await page.click('#orgChartFilterTrigger');
      assert.equal(await page.$eval('#orgChartFilterKeyword', node => node.value), 'EBB19', 'Reopening retains selected employee');
      await page.click('#orgChartResetFilter');
      assert.equal(await page.$eval('#orgChartFilterKeyword', node => node.value), '', 'Reset restores Select Employee');
      await page.click('#orgChartApplyFilter');
      assert.equal(await page.$$eval('#orgChartTree .org-chart-node', nodes => nodes.length), 11);

      await page.click('#orgChartFilterTrigger');
      await page.select('#orgChartFilterUnit', 'Payroll');
      await page.click('#orgChartApplyFilter');
      assert.deepEqual(await page.$$eval('#orgChartTree .org-chart-node', nodes => nodes.map(node => node.dataset.nodeId)), ['alex', 'ahmad', 'lee', 'vacant-payroll']);

      await page.click('#orgChartFilterTrigger');
      await page.click('#orgChartResetFilter');
      await page.select('#orgChartFilterLevel', '2');
      await page.click('#orgChartApplyFilter');
      assert.equal(await page.$$eval('#orgChartTree .org-chart-node', nodes => nodes.length), 6, 'Maximum Level limits root and direct reports');

      await page.click('#orgChartFilterTrigger');
      await page.click('#orgChartResetFilter');
      await page.select('#orgChartFilterSkipVacant', 'yes');
      await page.click('#orgChartApplyFilter');
      assert.equal(await page.$$eval('#orgChartTree .org-chart-node', nodes => nodes.length), 10);
      assert.equal(await page.$('#orgChartTree .is-vacant'), null);

      await page.click('#orgChartFilterTrigger');
      await page.click('#orgChartResetFilter');
      await page.select('#orgChartFilterKeyword', 'EBB25');
      await page.select('#orgChartFilterUnit', 'Human Resource');
      await page.click('#orgChartApplyFilter');
      assert.equal(await page.$eval('#orgChartEmpty', node => node.hidden), false);
      assert.equal(await page.$eval('#orgChartVisibleCount', node => node.textContent), '0');

      await page.click('#orgChartLayoutTrigger');
      for (const [axis, min, max] of [['X', 14, 40], ['Y', 8, 28]]) {
        for (const [action, limit] of [['Decrease', min], ['Increase', max]]) {
          const control = '#orgChartMargin' + axis + action;
          await page.$eval(control, button => { for (let i = 0; i < 20; i++) button.click(); });
          assert.equal(await page.$eval(control, button => button.disabled), true);
          assert.equal(await page.$eval('#orgChartMargin' + axis + 'Value', output => Number(output.value)), limit);
        }
      }
      await page.locator('#orgChartLayoutDone').click();
      for (const width of [320, 360, 420]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), `Organization Chart fits ${width}px`);
        await page.click('#orgChartLayoutTrigger');
        assert.ok(await page.$eval(layout + ' [role="dialog"]', node => node.scrollWidth <= node.clientWidth + 1));
        assert.ok(await page.$eval('#orgChartSpacingControls', controls => {
          const [x, y] = controls.children;
          const box = el => el.getBoundingClientRect();
          return box(y).top >= box(x).bottom && box(x).left === box(y).left &&
            box(x.querySelector('output')).left === box(y.querySelector('output')).left;
        }), 'Spacing rows stack and their values align');
        await page.locator('#orgChartLayoutDone').click();
      }
    }

    assert.deepEqual(errors, [], `Organization Chart has no JavaScript errors: ${errors.join('; ')}`);
    console.log('PASS: Organization Chart hierarchy, filters, spacing controls, employee IDs, themes and responsive layouts.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
