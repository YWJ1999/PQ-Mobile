const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

async function verifyConnections(page) {
  await page.waitForFunction(() => {
    const tree = document.querySelector('.v-org-container');
    const origin = tree.getBoundingClientRect();
    const groups = [...tree.querySelectorAll('.v-branch-wrapper')];
    const paths = [...tree.querySelectorAll('.v-org-connectors path')];
    if (groups.length !== paths.length) return false;
    return groups.every((group, index) => {
      const manager = group.parentElement.querySelector(':scope > .v-node-card').getBoundingClientRect();
      const cards = [...group.querySelectorAll(':scope > .v-branch-item > .v-node-card')].map(node => node.getBoundingClientRect());
      const values = paths[index].getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      const trunkX = group.getBoundingClientRect().left - origin.left + parseFloat(getComputedStyle(group).paddingLeft) / 2;
      const expectedX = group.parentElement === tree ? manager.left - origin.left + manager.width / 2 : trunkX;
      const expectedY = manager.bottom - origin.top - (group.parentElement === tree ? 0 : 12);
      const close = (a, b) => Math.abs(a - b) < 0.5;
      return close(values[0], expectedX) && close(values[1], expectedY)
        && close(values[3], trunkX)
        && close(values[4], cards.at(-1).top - origin.top + cards.at(-1).height / 2)
        && cards.every((card, child) => close(values[5 + child * 3], trunkX)
          && close(values[6 + child * 3], card.top - origin.top + card.height / 2)
          && close(values[7 + child * 3], card.left - origin.left));
    });
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      await page.goto(pathToFileURL(path.resolve('subordinates.html')).href + '?theme=' + theme, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (const [width, height] of [[320, 568], [390, 844], [420, 900]]) {
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.$eval('.main-content', node => { node.scrollTop = 0; });
        await verifyConnections(page);
        const geometry = await page.evaluate(() => {
          const main = document.querySelector('.main-content');
          const header = document.querySelector('.bonus-top-header');
          const root = document.querySelector('.v-node-card');
          return {
            mainBelowHeader: main.getBoundingClientRect().top >= header.getBoundingClientRect().bottom,
            rootVisible: root.getBoundingClientRect().top >= main.getBoundingClientRect().top && root.getBoundingClientRect().bottom <= main.getBoundingClientRect().bottom,
            noOverflow: [main, ...document.querySelectorAll('.card-content-block, .v-metrics-row')].every(node => node.scrollWidth <= node.clientWidth + 1),
            phoneScroll: document.querySelector('.phone-container').scrollTop
          };
        });
        assert.deepEqual(geometry, { mainBelowHeader: true, rootVisible: true, noOverflow: true, phoneScroll: 0 });
        await page.$eval('.main-content', node => { node.scrollTop = node.scrollHeight; });
        assert.equal(await page.$eval('.main-content', main => {
          const last = main.querySelectorAll('.v-node-card');
          return last[last.length - 1].getBoundingClientRect().bottom <= main.getBoundingClientRect().bottom;
        }), true, 'last employee reachable');
        const mainBox = await page.$eval('.main-content', node => ({ x: node.getBoundingClientRect().left + 100, y: node.getBoundingClientRect().top + 100 }));
        await page.mouse.move(mainBox.x, mainBox.y);
        await page.mouse.wheel({ deltaY: -5000 });
        await page.waitForFunction(() => document.querySelector('.main-content').scrollTop === 0);
        await verifyConnections(page);
        if (width === 390) await page.screenshot({ path: 'scratch/subordinates-fixed-' + theme + '.png' });
        console.log('PASS ' + theme + ' ' + width + 'x' + height + ': top and bottom reachable, 8 reporting links attached, no overflow');
      }
      await page.$eval('.card-content-block > div', node => { node.style.fontSize = '28px'; node.textContent = 'Alex Wong — Group Human Resources Manager'; });
      await verifyConnections(page);
    }
    assert.deepEqual(errors, []);
    console.log('PASS connector redraw after live viewport and card-height changes; no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
