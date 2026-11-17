const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const pages = [
  {
    file: 'modules/claims/options/benefit-highlight.html',
    bodyId: 'benefitHighlightTableBody',
    expectedId: '#EBB01',
    expectedName: 'Sarah Jenkins',
    modalId: 'modalEmpIdBadge',
    modalName: 'modalEmpNameText'
  },
  {
    file: 'modules/claims/options/expenses-highlight.html',
    bodyId: 'expensesHighlightTableBody',
    expectedId: '#004177',
    expectedName: 'Marcus Tan',
    modalId: 'modalExpenseEmpIdBadge',
    modalName: 'modalExpenseEmpNameText'
  }
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 900 });

    for (const config of pages) {
      await page.goto(pathToFileURL(path.join(root, config.file)).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(bodyId => document.querySelector(`#${bodyId} tr`), {}, config.bodyId);

      const result = await page.evaluate(config => {
        const body = document.getElementById(config.bodyId);
        const row = body.querySelector('tr');
        const cells = [...row.children];
        const idRect = cells[0]?.getBoundingClientRect();
        const nameRect = cells[1]?.getBoundingClientRect();
        const button = row.querySelector('[data-highlight-employee]');
        button.click();

        return {
          headers: [...body.closest('table').querySelectorAll('thead th')].map(cell => cell.textContent.trim()),
          cellCount: cells.length,
          colSpans: cells.map(cell => cell.colSpan),
          employeeId: cells[0]?.textContent.trim(),
          employeeName: cells[1]?.textContent.trim(),
          columnsSeparated: Boolean(idRect && nameRect && nameRect.left >= idRect.right - 1),
          hasHeaderId: Boolean(document.getElementById(config.modalId)),
          modalName: document.getElementById(config.modalName)?.textContent.trim()
        };
      }, config);

      assert.deepEqual(result.headers, ['EMP#', 'NAME', 'AMOUNT']);
      assert.equal(result.cellCount, 3, `${config.file} should render three independent cells`);
      assert.deepEqual(result.colSpans, [1, 1, 1]);
      assert.equal(result.employeeId, config.expectedId);
      assert.equal(result.employeeName, config.expectedName);
      assert.equal(result.columnsSeparated, true);
      assert.equal(result.hasHeaderId, false);
      assert.equal(result.modalName, config.expectedName);
    }

    console.log('PASS: Benefit and Expense Highlight keep Employee ID and Name in separate table columns.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
