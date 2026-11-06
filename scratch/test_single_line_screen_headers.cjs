const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'scratch', 'no']);

function collectHtmlFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) collectHtmlFiles(path.join(directory, entry.name), files);
      continue;
    }
    if (entry.name.endsWith('.html')) files.push(path.join(directory, entry.name));
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

const internalHeaderCases = [
  {
    file: 'modules/attendance/options/attendance.html',
    selector: '.attendance-form-header-title h3',
    titles: ['Shift Change Request']
  },
  {
    file: 'modules/attendance/options/history.html',
    selector: '.attendance-history-form-heading h3',
    titles: ['OT Plan Details', 'Attendance Feedback']
  }
];

const scopeCases = [
  ['attendance.html', '#tabTeam', '#headerTitleText', 'Attendance & OT'],
  ['leave.html', '#tabHubTeam', '#headerTitleText', 'Leave Dashboard'],
  ['modules/claims/index.html', '#tabClaimTeam', '#globalTopTitle', 'Claims & Expenses'],
  ['modules/payroll/index.html', '#tabPayrollTeam', '#globalTopTitle', 'Payroll'],
  ['modules/project-task/index.html', '#projectTab-team', '.project-header-title h1', 'Project & Task Dashboard'],
  ['modules/employee-career/index.html', '#employeeCareerTabTeam', '.employee-career-heading h1', 'Employee & Career']
];

function getTitleContainers(headings) {
  const textTags = /^(H[1-6]|P|DIV|SPAN|SMALL)$/;
  return headings.map(heading => {
    const container = heading.parentElement;
    const lines = [...container.children]
      .filter(child => child.getAttribute('aria-hidden') !== 'true')
      .filter(child => textTags.test(child.tagName))
      .map(child => child.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return {
      title: heading.textContent.replace(/\s+/g, ' ').trim(),
      lines
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('http://') || url.startsWith('https://')) request.abort();
      else request.continue();
    });

    const violations = [];
    const htmlFiles = collectHtmlFiles(root);
    for (const file of htmlFiles) {
      await page.goto(pathToFileURL(file).href, { waitUntil: 'domcontentloaded' });
      const headers = await page.$$eval('h1, .cal-top-header h2, .bonus-top-header h2, .shift-top-header h2, .wb-header-wrapper h2, .app-header h2, .admin-header h2, .employee-career-header h2, .project-header h2', headings => {
        const candidates = headings.filter(heading => {
          const title = heading.textContent.replace(/\s+/g, ' ').trim();
          return title !== 'PeopleHCM' && !heading.matches('.jd-paper-h1') && !heading.closest('.jd-paper-header, .me-pass-info');
        });
        const textTags = /^(H[1-6]|P|DIV|SPAN|SMALL)$/;
        return candidates.map(heading => {
          const lines = [...heading.parentElement.children]
            .filter(child => child.getAttribute('aria-hidden') !== 'true')
            .filter(child => textTags.test(child.tagName))
            .map(child => child.textContent.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
          return { title: heading.textContent.replace(/\s+/g, ' ').trim(), lines };
        });
      });
      for (const header of headers) {
        if (header.lines.length !== 1 || header.lines[0] !== header.title) {
          violations.push(`${relative(file)} :: ${header.title} => ${header.lines.join(' | ')}`);
        }
      }
    }
    assert.deepEqual(violations, [], `Screen headers must contain only their main title:\n${violations.join('\n')}`);

    for (const testCase of internalHeaderCases) {
      await page.goto(pathToFileURL(path.join(root, testCase.file)).href, { waitUntil: 'domcontentloaded' });
      const headers = await page.$$eval(testCase.selector, getTitleContainers);
      assert.deepEqual(headers.map(header => header.title), testCase.titles, `${testCase.file}: expected internal screen titles`);
      assert.deepEqual(headers.map(header => header.lines), testCase.titles.map(title => [title]), `${testCase.file}: internal headers use one title line`);
    }

    for (const [file, tabSelector, titleSelector, expectedTitle] of scopeCases) {
      const errors = [];
      const onPageError = error => errors.push(error.message);
      page.on('pageerror', onPageError);
      const url = pathToFileURL(path.join(root, file));
      url.search = new URLSearchParams({ theme: 'light' });
      await page.goto(url.href, { waitUntil: 'domcontentloaded' });
      await page.click(tabSelector);
      const header = await page.$eval(titleSelector, heading => {
        const textTags = /^(H[1-6]|P|DIV|SPAN|SMALL)$/;
        const lines = [...heading.parentElement.children]
          .filter(child => child.getAttribute('aria-hidden') !== 'true')
          .filter(child => textTags.test(child.tagName))
          .map(child => child.textContent.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        return { title: heading.textContent.replace(/\s+/g, ' ').trim(), lines };
      });
      page.off('pageerror', onPageError);
      assert.equal(header.title, expectedTitle, `${file}: scope switching keeps the main title`);
      assert.deepEqual(header.lines, [expectedTitle], `${file}: scope switching does not add a subtitle`);
      assert.deepEqual(errors, [], `${file}: scope switching should not throw`);
    }

    await page.close();
    console.log(`PASS: ${htmlFiles.length} production HTML files keep single-title screen headers.`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
