const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/confirm-new-user-details.html')).href;
const listUrl = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/confirm-new-user.html')).href;
const dashboardUrl = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/index.html')).href;
const themes = ['light', 'dark'];
const widths = [320, 360, 390, 430];

const expectedPersonal = {
  name: 'TAN SIOW WEI', identity: '858542719340', birthDate: '27 Jul 1992', gender: 'Male',
  nationality: 'INDONESIAN', alias: 'johndoe', race: 'CHINESE', religion: 'HINDUISM',
  maritalStatus: 'Single', qualification: 'DIPLOMA'
};
const expectedEmployment = {
  newUserHireDate: '2026-10-06', newUserBasicPay: '0', newUserProbationMonths: '0', newUserProbationDays: '0'
};

async function valuesFor(page, expected) {
  return page.evaluate(ids => Object.fromEntries(ids.map(id => {
    const control = document.getElementById(id);
    return [id, control?.value ?? null];
  })), Object.keys(expected));
}

async function verifyAttachmentControl(page) {
  const attachmentUi = await page.evaluate(() => ({
    hasFileInput: Boolean(document.getElementById('newUserAttachments')),
    hasUploadButton: Boolean(document.querySelector('.new-user-upload-button')),
    emptyText: document.querySelector('.new-user-attachment-empty')?.textContent.trim()
  }));
  assert.equal(attachmentUi.hasFileInput, false, 'attachments must be a read-only file list');
  assert.equal(attachmentUi.hasUploadButton, false, 'details view must not show an upload action');
  assert.equal(attachmentUi.emptyText, 'No attachments');
}

async function inspectScenario(browser, theme, width) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });
  await page.goto(`${url}?record=1&theme=${theme}`, { waitUntil: 'networkidle0' });

  assert.equal(await page.$eval('meta[name="viewport"]', node => /maximum-scale|user-scalable/i.test(node.content)), false, `${theme}/${width}: viewport must allow browser zoom`);
  assert.equal(await page.$eval('html', node => node.dataset.theme), theme);
  assert.equal(await page.$eval('.employee-career-heading h1', node => node.textContent.trim()), 'Confirm New User');
  assert.equal(await page.$eval('#employeeTab', tab => tab.getAttribute('aria-selected')), 'true');
  assert.equal(await page.$eval('#employmentPanel', panel => panel.hidden), true);
  assert.equal(await page.$$eval('#employeePanel input, #employeePanel select, #employeePanel textarea', controls => controls.length), 0);
  const summaries = '#employeePanel details > summary';
  assert.deepEqual(await page.$$eval(summaries, items => items.map(item => item.firstChild.textContent.trim())), [
    'Personal details', 'Contact details', 'Emergency contact', 'Payment details', 'Attachments'
  ]);
  assert.equal(await page.$$eval('details[open]', items => items.length), 0);

  for (let index = 0; index < 5; index++) {
    const selector = `#employeePanel details:nth-of-type(${index + 1})`;
    await page.click(selector + ' > summary');
    assert.equal(await page.$$eval('#employeePanel details[open]', items => items.length), 1);
    assert.equal(await page.$eval(selector, section => section.open), true);
    const facts = await page.$$eval(selector + ' [data-field]', entries =>
      Object.fromEntries(entries.map(entry => [entry.dataset.field, entry.textContent])));
    if (index === 0) assert.deepEqual(facts, expectedPersonal);
    if (index === 1) assert.deepEqual(facts, {
      name: 'TAN SIOW WEI', mobile: '012345687', email: 'johnrichard_111@gmail.com',
      address: '11 Street\nPJ Square\nPetaling Jaya', postCode: '47301'
    });
    if (index === 2 || index === 3) assert.ok(Object.values(facts).every(value => value === '—'));
  }
  await verifyAttachmentControl(page);
  assert.equal(await page.$eval('#newUserAttachmentCount', item => item.textContent), '0');
  await page.click('#employmentTab');
  assert.equal(await page.$eval('#employeePanel', panel => panel.hidden), true);
  assert.deepEqual(await valuesFor(page, expectedEmployment), expectedEmployment);
  await page.type('#newUserJobPosition', 'Operations Assistant');
  await page.focus('#employmentTab');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.$eval('#employeeTab', tab => tab === document.activeElement && tab.getAttribute('aria-selected') === 'true'), true);
  await page.keyboard.press('End');
  assert.equal(await page.$eval('#newUserJobPosition', field => field.value), 'Operations Assistant');

  const layout = await page.evaluate(() => {
    const main = document.querySelector('main');
    const phone = document.querySelector('.phone-container');
    const footer = document.querySelector('.new-user-footer');
    const top = footer.getBoundingClientRect().top;
    main.scrollTop = main.scrollHeight;
    return {
      pageFits: document.documentElement.scrollWidth <= innerWidth && main.scrollWidth <= main.clientWidth,
      fieldsFit: [...document.querySelectorAll('.new-user-details-control')].every(item => {
        const box = item.getBoundingClientRect();
        return box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1;
      }),
      footerFits: footer.getBoundingClientRect().top === top &&
        footer.getBoundingClientRect().bottom <= phone.getBoundingClientRect().bottom + 1 &&
        main.getBoundingClientRect().bottom <= top + 1,
      palette: {
        card: getComputedStyle(document.querySelector('.new-user-section')).backgroundColor,
        control: getComputedStyle(document.querySelector('.new-user-details-control')).backgroundColor,
        text: getComputedStyle(document.querySelector('.new-user-profile-name')).color
      }
    };
  });
  assert.ok(layout.pageFits && layout.fieldsFit && layout.footerFits, `${theme}/${width}: both panels and the fixed action row fit the phone`);

  assert.equal(await page.$eval('#newUserSubmit', node => node.tagName), 'A');
  assert.equal(new URL(await page.$eval('#newUserSubmit', node => node.href)).searchParams.get('scope'), 'team');
  assert.ok(await page.$('#newUserCancel[href*="confirm-new-user.html"]'));
  assert.equal(await page.$('#employeeCareerToast'), null, 'Submit must not use a success toast');
  assert.deepEqual(await page.$$eval('#newUserCancel, #newUserSubmit', buttons => buttons.map(button => ({
    id: button.id,
    text: button.textContent.trim(),
    icon: button.querySelector('i')?.className || '',
    pill: Number.parseFloat(getComputedStyle(button).borderRadius) >= button.getBoundingClientRect().height / 2
  }))), [
    { id: 'newUserCancel', text: 'Cancel', icon: 'fa-solid fa-xmark', pill: true },
    { id: 'newUserSubmit', text: 'Submit', icon: 'fa-solid fa-paper-plane', pill: true }
  ]);
  const [cancel, submit] = await page.$$eval('#newUserCancel, #newUserSubmit', buttons => buttons.map(button => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return {
      background: style.backgroundImage, color: style.color, shadow: style.boxShadow,
      radius: style.borderRadius, fontSize: style.fontSize, padding: style.padding,
      height: rect.height, width: Math.round(rect.width), top: rect.top
    };
  }));
  assert.match(submit.background, /linear-gradient\(135deg, rgb\(124, 58, 237\).*rgb\(109, 40, 217\)/);
  assert.equal(submit.color, 'rgb(255, 255, 255)');
  assert.ok(submit.height >= 44);
  assert.deepEqual(cancel, submit, `${theme}/${width}: Cancel and Submit must share the purple team form style and sit on one row`);
  assert.deepEqual(await page.$$eval('[required]', nodes => nodes.map(node => node.name)), [
    'hireDate', 'basicPay', 'company', 'branch', 'department', 'jobType', 'jobPosition', 'reportingGroup', 'supervisor', 'shiftGroup'
  ]);

  assert.equal(await page.$eval('.new-user-profile-name', node => node.textContent.trim()), 'TAN SIOW WEI');
  assert.equal(await page.$eval('.new-user-profile-id', node => node.textContent.trim()), '#858542719340');

  assert.deepEqual(errors, []);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#newUserSubmit')]);
  assert.equal(page.url(), `${dashboardUrl}?scope=team`, `${theme}/${width}: Submit must return to the Team option dashboard`);
  await page.close();
  return layout.palette;
}

async function verifyEdgeCases(browser) {
  const blankPage = await browser.newPage();
  await blankPage.goto(`${url}?record=0&theme=light`, { waitUntil: 'networkidle0' });
  assert.deepEqual(await valuesFor(blankPage, { newUserBasicPay: '', newUserProbationMonths: '', newUserProbationDays: '' }), { newUserBasicPay: '', newUserProbationMonths: '', newUserProbationDays: '' }, 'missing numeric values must remain blank for records without supplied details');
  await blankPage.evaluate(() => renderAttachments([
    'Information.pdf', { name: 'Supporting document.pdf', url: 'supporting.pdf' }
  ]));
  assert.equal(await blankPage.$eval('#newUserAttachmentCount', item => item.textContent), '2');
  assert.deepEqual(await blankPage.$$eval('.new-user-file', items => items.map(item => [item.tagName, item.textContent])), [
    ['DIV', 'Information.pdf'], ['A', 'Supporting document.pdf']
  ]);
  await blankPage.close();

  const invalidPage = await browser.newPage();
  await invalidPage.goto(`${url}?record=1abc&theme=dark`, { waitUntil: 'networkidle0' });
  assert.equal(new URL(invalidPage.url()).pathname.endsWith('/confirm-new-user.html'), true, 'invalid record parameters must return to the list instead of showing the wrong employee');
  await invalidPage.close();

  const stalePage = await browser.newPage();
  await stalePage.goto(`${url}?record=99&theme=light`, { waitUntil: 'networkidle0' });
  assert.equal(new URL(stalePage.url()).pathname.endsWith('/confirm-new-user.html'), true, 'out-of-range record parameters must return to the list');
  await stalePage.close();

  const integrationPage = await browser.newPage();
  await integrationPage.setViewport({ width: 390, height: 800, deviceScaleFactor: 1 });
  await integrationPage.goto(`${listUrl}?theme=light`, { waitUntil: 'networkidle0' });
  const secondConfirm = '.confirm-new-user-card:nth-child(2) .confirm-new-user-confirm';
  await integrationPage.$eval(secondConfirm, button => button.scrollIntoView({ block: 'center' }));
  await Promise.all([integrationPage.waitForNavigation({ waitUntil: 'domcontentloaded' }), integrationPage.click(secondConfirm)]);
  assert.equal(new URL(integrationPage.url()).searchParams.get('record'), '1');
  assert.equal(await integrationPage.$eval('.new-user-profile-name', node => node.textContent.trim()), 'TAN SIOW WEI');
  await Promise.all([integrationPage.waitForNavigation({ waitUntil: 'domcontentloaded' }), integrationPage.click('#newUserCancel')]);
  assert.equal(integrationPage.url(), `${listUrl}?theme=light`, 'Cancel must return to the new user list in the selected theme');
  await integrationPage.close();
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    const palettes = {};
    for (const theme of themes) {
      palettes[theme] = [];
      for (const width of widths) palettes[theme].push(await inspectScenario(browser, theme, width));
    }
    widths.forEach((width, index) => {
      for (const key of ['card', 'control', 'text']) assert.notEqual(palettes.light[index][key], palettes.dark[index][key], `${width}px ${key} must differ between light and dark themes`);
    });
    await verifyEdgeCases(browser);
    console.log('PASS: Confirm New User tabs, read-only sections, employment fields, navigation, and matching purple footer passed in both themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
