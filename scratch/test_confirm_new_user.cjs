const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/confirm-new-user.html')).href;
const expectedRecords = [
  { name: 'ERNEST TAN', identity: '123', gender: 'Male', nationality: '', qualification: 'UPPER SECONDARY', mobile: '213', email: 'ad@ad.con' },
  { name: 'TAN SIOW WEI', identity: '858542719340', gender: 'Male', nationality: 'INDONESIAN', qualification: 'DIPLOMA', mobile: '012345687', email: 'johnrichard_111@gmail.com' },
  { name: 'GAN THIAM POH', identity: '858542676932', gender: 'Male', nationality: 'CHINESE', qualification: 'DIPLOMA', mobile: '012345687', email: 'johnrichard_649@gmail.com' },
  { name: 'Edward S.S', identity: '87527898273', gender: 'Male', nationality: 'MALAYSIAN', qualification: 'DEGREE', mobile: '0123391576', email: 'eds@gmail.com' },
  { name: 'Jake Tan', identity: '7483737373', gender: 'Male', nationality: 'CHINESE', qualification: 'DEGREE', mobile: '0182336112', email: 'jaketan@pq.com.my' },
  { name: 'NUR AINA BINTI YUSOF', identity: '900412105544', gender: 'Female', nationality: 'MALAYSIAN', qualification: 'DEGREE', mobile: '0126784451', email: 'aina.yusof@pq.com.my' },
  { name: 'LIM WEI JIAN', identity: '920728085167', gender: 'Male', nationality: 'MALAYSIAN', qualification: 'DIPLOMA', mobile: '0163349852', email: 'weijian.lim@pq.com.my' },
  { name: 'SITI NURFARAH', identity: '950309145863', gender: 'Female', nationality: 'MALAYSIAN', qualification: 'CERTIFICATE', mobile: '0172886403', email: 'sitifarrah@pq.com.my' },
  { name: 'MOHD AZLAN BIN RASHID', identity: '880615016392', gender: 'Male', nationality: 'MALAYSIAN', qualification: 'UPPER SECONDARY', mobile: '0195564178', email: 'azlan.rashid@pq.com.my' },
  { name: 'KOH YI XIN', identity: '970921085420', gender: 'Female', nationality: 'MALAYSIAN', qualification: 'DEGREE', mobile: '0149023561', email: 'yixin.koh@pq.com.my' },
  { name: 'RAJESH KUMAR', identity: '890115076528', gender: 'Male', nationality: 'MALAYSIAN', qualification: 'DIPLOMA', mobile: '0113562789', email: 'rajesh.kumar@pq.com.my' },
  { name: 'NURUL IZZATI', identity: '990430115796', gender: 'Female', nationality: 'MALAYSIAN', qualification: 'DEGREE', mobile: '0187219430', email: 'nurul.izzati@pq.com.my' },
  { name: 'ONG KAH MUN', identity: '930804086711', gender: 'Female', nationality: 'MALAYSIAN', qualification: 'DIPLOMA', mobile: '0124896157', email: 'kahmun.ong@pq.com.my' }
];
const expectedNames = expectedRecords.slice(0, 5).map(record => record.name);
const expectedLabels = ['Gender', 'Nationality', 'Qualification', 'Mobile #', 'Email'];
const themes = ['light', 'dark'];
const widths = [360, 390, 430];

const rgb = value => value.match(/\d+(?:\.\d+)?/g).map(Number);
const isPurple = value => {
  const [red, green, blue] = rgb(value);
  return red > 75 && red < 175 && green < 100 && blue > 140;
};
const isPaleRose = value => {
  const [red, green, blue] = rgb(value);
  return red > 220 && green > 190 && blue > 190 && red > green;
};
const isRoseBorder = value => {
  const [red, green, blue] = rgb(value);
  return red > 220 && green > 120 && green < 230 && blue > 130 && blue < 240 && red > green;
};

const parseColor = value => {
  const channels = value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return {
    red: channels[0] || 0,
    green: channels[1] || 0,
    blue: channels[2] || 0,
    alpha: channels.length > 3 ? channels[3] : 1
  };
};

const compositeColor = (foreground, background) => {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return {
    red: (foreground.red * foreground.alpha + background.red * background.alpha * (1 - foreground.alpha)) / alpha,
    green: (foreground.green * foreground.alpha + background.green * background.alpha * (1 - foreground.alpha)) / alpha,
    blue: (foreground.blue * foreground.alpha + background.blue * background.alpha * (1 - foreground.alpha)) / alpha,
    alpha
  };
};

const contrastRatio = (foreground, backgroundLayers) => {
  const white = { red: 255, green: 255, blue: 255, alpha: 1 };
  let background = white;
  for (let index = backgroundLayers.length - 1; index >= 0; index -= 1) {
    background = compositeColor(parseColor(backgroundLayers[index]), background);
  }
  const renderedForeground = compositeColor(parseColor(foreground), background);
  const luminance = color => {
    const linear = [color.red, color.green, color.blue].map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const values = [luminance(renderedForeground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

async function getRenderedState(page) {
  return page.evaluate(() => ({
    summary: document.querySelector('.confirm-new-user-summary').textContent.replace(/\s+/g, ' ').trim(),
    total: document.querySelector('#confirmNewUserTotal').textContent.trim(),
    listHtml: document.querySelector('#confirmNewUserList').innerHTML,
    cards: [...document.querySelectorAll('.confirm-new-user-card')].map(card => ({
      className: card.className,
      text: card.textContent.replace(/\s+/g, ' ').trim(),
      fields: [...card.querySelectorAll('[data-field]')].map(node => ({ field: node.dataset.field, value: node.textContent.trim() })),
      actions: [...card.querySelectorAll('button')].map(button => ({
        className: button.className,
        text: button.textContent.trim(),
        type: button.type,
        ariaLabel: button.getAttribute('aria-label')
      }))
    })),
    sourceRecords: window.confirmNewUserRecords.map(record => ({ ...record }))
  }));
}

async function inspectScenario(browser, theme, width) {
  const page = await browser.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => {
    dialogs.push(dialog.type());
    dialog.dismiss();
  });
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(`${url}?theme=${theme}`, { waitUntil: 'networkidle0' });

  assert.equal(await page.$eval('meta[name="viewport"]', node => /maximum-scale|user-scalable/i.test(node.content)), false, `${theme}/${width}: viewport must allow browser zoom`);
  assert.equal(await page.$eval('html', node => node.dataset.theme), theme, `${theme}/${width}: requested theme was not applied`);
  const headerGradient = await page.$eval('.employee-career-header', node => getComputedStyle(node).backgroundImage);
  assert.match(headerGradient, /rgb\(76, 29, 149\)/, `${theme}/${width}: header must begin with the standard deep purple`);
  assert.match(headerGradient, /rgb\(109, 40, 217\)/, `${theme}/${width}: header must use the standard middle purple`);
  assert.match(headerGradient, /rgb\(124, 58, 237\)/, `${theme}/${width}: header must end with the standard brand purple`);
  assert.doesNotMatch(headerGradient, /rgb\(147, 51, 234\)/, `${theme}/${width}: header must not use the overly bright magenta endpoint`);
  assert.equal(await page.$eval('.confirm-new-user-summary-label', node => node.textContent.trim()), 'Total records');
  assert.equal(await page.$eval('#confirmNewUserTotal', node => node.textContent.trim()), '13');
  assert.equal(await page.$eval('#confirmNewUserTotal', node => node.getAttribute('aria-label')), null, `${theme}/${width}: visible total must remain available to assistive technology`);
  const totalMetrics = await page.$eval('.confirm-new-user-summary', summary => {
    const label = summary.querySelector('.confirm-new-user-summary-label').getBoundingClientRect();
    const total = summary.querySelector('#confirmNewUserTotal');
    const box = total.getBoundingClientRect();
    return {
      height: summary.getBoundingClientRect().height,
      fontSize: Number.parseFloat(getComputedStyle(total).fontSize),
      belowLabel: box.top >= label.bottom,
      aligned: Math.abs(box.left - label.left) < 1,
      color: getComputedStyle(total).color,
      primaryColor: getComputedStyle(summary).getPropertyValue('--text-primary').trim()
    };
  });
  assert.equal(totalMetrics.belowLabel && totalMetrics.aligned, true, `${theme}/${width}: total must appear directly below its label`);
  assert.equal(totalMetrics.color, await page.evaluate(color => { const probe = document.createElement('span'); probe.style.color = color; document.body.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; }, totalMetrics.primaryColor), `${theme}/${width}: total uses the original text color`);
  assert.ok(totalMetrics.height <= 80, `${theme}/${width}: stacked total summary should stay compact`);
  assert.ok(totalMetrics.fontSize <= 18, `${theme}/${width}: total number should not be oversized`);
  assert.equal(await page.$$eval('.confirm-new-user-card', nodes => nodes.length), 13);
  assert.deepEqual(await page.$$eval('.confirm-new-user-card .confirm-new-user-name', nodes => nodes.slice(0, 5).map(node => node.textContent.trim())), expectedNames);
  const cardContracts = await page.evaluate(() => [...document.querySelectorAll('.confirm-new-user-card')].map((card, index) => {
    const record = window.confirmNewUserRecords[index];
    const header = card.querySelector('header');
    const wrapper = header.querySelector('.confirm-new-user-identity');
    const name = wrapper?.querySelector('.confirm-new-user-name');
    const identity = wrapper?.querySelector('[data-field="identity"]');
    const labels = [...card.querySelectorAll('dt')].map(label => label.textContent.trim());
    const metadata = [...card.querySelectorAll('.confirm-new-user-meta')].map(item => ({
      label: item.querySelector('dt')?.textContent.trim(),
      value: item.querySelector('dd')?.textContent.trim(),
      field: item.querySelector('dd')?.dataset.field
    }));
    const actions = [...card.querySelectorAll('button')].map(button => ({ text: button.textContent.trim(), type: button.type, ariaLabel: button.getAttribute('aria-label') }));
    return {
      headerHasWrapper: Boolean(wrapper),
      headerOrder: [...header.children].map(node => node.className),
      name: name?.textContent.trim(),
      identity: identity?.textContent.trim(),
      labels,
      metadata,
      hasDuplicateNameLabel: labels.includes('Name'),
      hasDuplicateIdentityLabel: labels.includes('NRIC/Passport #'),
      actions,
      expectedName: record.name,
      expectedIdentity: record.identity || '\u2014'
    };
  }));
  cardContracts.forEach((card, index) => {
    assert.equal(card.headerHasWrapper, true, `${theme}/${width}: card ${index + 1} needs an identity wrapper`);
    assert.deepEqual(card.headerOrder, ['confirm-new-user-avatar', 'confirm-new-user-identity'], `${theme}/${width}: card ${index + 1} identity must sit beside the avatar`);
    assert.equal(card.name, card.expectedName, `${theme}/${width}: card ${index + 1} name must be in the header`);
    assert.equal(card.identity, card.expectedIdentity, `${theme}/${width}: card ${index + 1} NRIC/Passport must sit below the name`);
    assert.deepEqual(card.labels, expectedLabels, `${theme}/${width}: card ${index + 1} grid must contain only the remaining metadata`);
    assert.equal(card.metadata.length, 5, `${theme}/${width}: card ${index + 1} should use five metadata fields`);
    assert.deepEqual(card.metadata.map(item => item.label), expectedLabels, `${theme}/${width}: card ${index + 1} metadata blocks should preserve labels`);
    assert.equal(card.hasDuplicateNameLabel, false, `${theme}/${width}: card ${index + 1} must not duplicate Name in the grid`);
    assert.equal(card.hasDuplicateIdentityLabel, false, `${theme}/${width}: card ${index + 1} must not duplicate NRIC/Passport in the grid`);
    assert.deepEqual(card.actions, [
      { text: 'Reject', type: 'button', ariaLabel: `Reject ${card.expectedName}` },
      { text: 'Confirm', type: 'button', ariaLabel: `Confirm ${card.expectedName}` }
    ], `${theme}/${width}: card ${index + 1} actions need concise labels and record-specific accessible names`);
  });
  assert.equal(await page.$eval('.confirm-new-user-card:first-child [data-field="nationality"]', node => node.textContent.trim()), '\u2014');
  assert.ok(await page.$('a[data-option-back][href*="scope=team"]'));
  assert.ok(await page.$('phone-bottom-nav'));
  assert.deepEqual(await page.evaluate(() => ({
    records: window.confirmNewUserRecords.map(record => ({ ...record })),
    sourceFrozen: Object.isFrozen(window.confirmNewUserRecords),
    recordFrozen: window.confirmNewUserRecords.every(Object.isFrozen)
  })), { records: expectedRecords, sourceFrozen: true, recordFrozen: true });

  const layout = await page.evaluate(() => {
    const tokenProbe = document.createElement('span');
    tokenProbe.style.cssText = 'position:fixed;pointer-events:none;background:var(--bg-input);border:1px solid var(--border-subtle);color:var(--text-secondary)';
    document.body.append(tokenProbe);
    const tokenStyle = getComputedStyle(tokenProbe);
    const tokens = {
      inputBackground: tokenStyle.backgroundColor,
      subtleBorder: tokenStyle.borderTopColor,
      secondaryText: tokenStyle.color
    };
    tokenProbe.remove();
    const boundedFields = ['name', 'identity', 'mobile', 'email'];
    const cards = [...document.querySelectorAll('.confirm-new-user-card')].map(card => {
      const cardBox = card.getBoundingClientRect();
      const cardStyle = getComputedStyle(card);
      const phoneStyle = getComputedStyle(document.querySelector('.phone-container'));
      const bodyStyle = getComputedStyle(document.body);
      const values = boundedFields.map(field => {
        const node = field === 'name' ? card.querySelector('.confirm-new-user-name') : card.querySelector(`[data-field="${field}"]`);
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const canWrap = style.whiteSpace !== 'nowrap' && (style.overflowWrap !== 'normal' || style.wordBreak !== 'normal');
        return { inside: box.left >= cardBox.left - 1 && box.right <= cardBox.right + 1, fits: node.scrollWidth <= node.clientWidth + 1, canWrap };
      });
      const metadataTiles = [...card.querySelectorAll('.confirm-new-user-meta')].map(item => {
        const box = item.getBoundingClientRect();
        const style = getComputedStyle(item);
        return {
          inside: box.left >= cardBox.left - 1 && box.right <= cardBox.right + 1,
          fits: item.scrollWidth <= item.clientWidth + 1,
          borderWidth: Number.parseFloat(style.borderTopWidth),
          borderColor: style.borderTopColor,
          radius: Number.parseFloat(style.borderTopLeftRadius),
          background: style.backgroundColor,
          labelColor: getComputedStyle(item.querySelector('dt')).color,
          backgroundLayers: [style.backgroundColor, cardStyle.backgroundColor, phoneStyle.backgroundColor, bodyStyle.backgroundColor],
          padding: Number.parseFloat(style.paddingTop)
        };
      });
      return {
        withinViewport: cardBox.left >= -1 && cardBox.right <= window.innerWidth + 1,
        values,
        metadataTiles,
        radius: getComputedStyle(card).borderTopLeftRadius,
        hasChevron: Boolean(card.querySelector('.fa-chevron-right, .fa-angle-right, [class*="chevron"]'))
      };
    });
    const list = document.querySelector('#confirmNewUserList');
    const summary = document.querySelector('.confirm-new-user-summary');
    const card = document.querySelector('.confirm-new-user-card');
    const details = card.querySelector('dl');
    const avatar = card.querySelector('.confirm-new-user-avatar');
    const actions = card.querySelector('.confirm-new-user-actions');
    const firstButton = actions.querySelector('button');
    const name = card.querySelector('.confirm-new-user-name');
    const cardStyle = getComputedStyle(card);
    const detailsStyle = getComputedStyle(details);
    const avatarBox = avatar.getBoundingClientRect();
    const buttonStyle = getComputedStyle(firstButton);
    return {
      pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      listFits: list.scrollWidth <= list.clientWidth + 1,
      tokens,
      cards,
      modernCard: {
        headerBackground: getComputedStyle(card.querySelector('header')).backgroundImage,
        headerPadding: Number.parseFloat(getComputedStyle(card.querySelector('header')).paddingTop),
        detailsBorder: Number.parseFloat(detailsStyle.borderTopWidth),
        detailsBackground: detailsStyle.backgroundColor,
        avatarSize: Math.round(avatarBox.width),
        nameSize: Number.parseFloat(getComputedStyle(name).fontSize),
        actionRadius: Number.parseFloat(buttonStyle.borderTopLeftRadius),
        actionHeight: firstButton.getBoundingClientRect().height
      },
      palette: {
        summary: getComputedStyle(summary).backgroundColor,
        cardSurface: { backgroundColor: cardStyle.backgroundColor, backgroundImage: cardStyle.backgroundImage },
        details: getComputedStyle(details).backgroundColor,
        name: getComputedStyle(name).color
      }
    };
  });
  assert.equal(layout.pageFits, true, `${theme}/${width}: page overflows horizontally`);
  assert.equal(layout.listFits, true, `${theme}/${width}: list overflows horizontally`);
  assert.match(layout.modernCard.headerBackground, /rgb\(124, 58, 237\).*rgb\(76, 29, 149\)/, `${theme}/${width}: card header must match Pending Approval`);
  assert.ok(layout.modernCard.headerPadding >= 12, `${theme}/${width}: identity header needs comfortable spacing`);
  assert.equal(layout.modernCard.detailsBorder, 0, `${theme}/${width}: metadata must not sit inside a nested bordered table`);
  assert.equal(layout.modernCard.detailsBackground, 'rgba(0, 0, 0, 0)', `${theme}/${width}: metadata should use an open transparent layout`);
  assert.ok(layout.modernCard.avatarSize >= 72, `${theme}/${width}: portrait must be large enough to recognize the face`);
  assert.ok(await page.$$eval('.confirm-new-user-avatar img', images => images.length === 13 && images.every(image => image.complete && image.naturalWidth >= 100 && image.alt && getComputedStyle(image).objectFit === 'cover')), `${theme}/${width}: all user portraits must load clearly`);
  assert.ok(layout.modernCard.nameSize >= 15, `${theme}/${width}: employee name should have stronger hierarchy`);
  assert.ok(layout.modernCard.actionRadius >= 10 && layout.modernCard.actionRadius <= 16, `${theme}/${width}: actions should use modern rounded rectangles rather than pills`);
  assert.ok(layout.modernCard.actionHeight >= 44, `${theme}/${width}: actions need a comfortable touch target`);
  layout.cards.forEach((card, index) => {
    assert.equal(card.withinViewport, true, `${theme}/${width}: card ${index + 1} exceeds viewport`);
    card.values.forEach((value, fieldIndex) => {
      assert.equal(value.inside, true, `${theme}/${width}: key field ${fieldIndex + 1} escapes card ${index + 1}`);
      assert.equal(value.fits, true, `${theme}/${width}: key field ${fieldIndex + 1} has horizontal overflow in card ${index + 1}`);
      assert.equal(value.canWrap, true, `${theme}/${width}: key field ${fieldIndex + 1} must permit wrapping`);
    });
    assert.equal(card.metadataTiles.length, 5, `${theme}/${width}: card ${index + 1} keeps all five bordered metadata fields`);
    card.metadataTiles.forEach((tile, fieldIndex) => {
      assert.equal(tile.inside, true, `${theme}/${width}: metadata field ${fieldIndex + 1} escapes card ${index + 1}`);
      assert.equal(tile.fits, true, `${theme}/${width}: metadata field ${fieldIndex + 1} overflows card ${index + 1}`);
      assert.ok(tile.borderWidth >= 1, `${theme}/${width}: metadata field ${fieldIndex + 1} needs a visible border`);
      assert.equal(tile.borderColor, layout.tokens.subtleBorder, `${theme}/${width}: metadata field ${fieldIndex + 1} must use the shared subtle border token`);
      assert.ok(tile.radius >= 10 && tile.radius <= 14, `${theme}/${width}: metadata field ${fieldIndex + 1} needs the shared rounded detail-box shape`);
      assert.notEqual(tile.background, 'rgba(0, 0, 0, 0)', `${theme}/${width}: metadata field ${fieldIndex + 1} needs a distinct detail-box surface`);
      assert.equal(tile.background, layout.tokens.inputBackground, `${theme}/${width}: metadata field ${fieldIndex + 1} must use the shared input surface token`);
      assert.ok(contrastRatio(tile.labelColor, tile.backgroundLayers) >= 4.5, `${theme}/${width}: metadata field ${fieldIndex + 1} label needs at least 4.5:1 contrast`);
      assert.equal(tile.labelColor, layout.tokens.secondaryText, `${theme}/${width}: metadata field ${fieldIndex + 1} label must use the accessible secondary text token`);
      assert.ok(tile.padding >= 10, `${theme}/${width}: metadata field ${fieldIndex + 1} needs consistent inner spacing`);
    });
    assert.equal(card.radius, '20px', `${theme}/${width}: card ${index + 1} must match Pending Approval's radius`);
    assert.equal(card.hasChevron, false, `${theme}/${width}: card ${index + 1} must not show a chevron`);
  });

  const buttonStyles = await page.evaluate(() => {
    const actions = [...document.querySelectorAll('.confirm-new-user-actions button')];
    const styleFor = button => {
      const style = getComputedStyle(button);
      return { background: style.backgroundColor, color: style.color, border: style.borderTopColor, transitionDuration: style.transitionDuration, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, outlineOffset: style.outlineOffset, boxShadow: style.boxShadow };
    };
    return { confirm: styleFor(document.querySelector('.confirm-new-user-confirm')), reject: styleFor(document.querySelector('.confirm-new-user-reject')) };
  });
  assert.equal(isPurple(buttonStyles.confirm.background), true, `${theme}/${width}: Confirm needs a purple background`);
  assert.equal(buttonStyles.reject.background, buttonStyles.confirm.background, `${theme}/${width}: Confirm and Reject must use the same purple background`);
  assert.equal(rgb(buttonStyles.confirm.color).every(channel => channel > 220), true, `${theme}/${width}: Confirm needs white text`);
  assert.equal(rgb(buttonStyles.reject.color).every(channel => channel > 220), true, `${theme}/${width}: Reject needs white text`);
  await page.focus('.employee-career-back');
  for (const selector of ['.confirm-new-user-confirm', '.confirm-new-user-reject']) {
    await page.keyboard.press('Tab');
    const state = await page.$eval(selector, button => {
      const style = getComputedStyle(button);
      return { active: document.activeElement === button, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    assert.equal(state.active, true, `${theme}/${width}: keyboard focus order must reach ${selector}`);
    assert.notEqual(state.outlineStyle, 'none', `${theme}/${width}: ${selector} needs a keyboard-visible outline`);
    assert.ok(Number.parseFloat(state.outlineWidth) > 0, `${theme}/${width}: ${selector} needs a positive keyboard focus outline`);
  }

  const stateBeforeActions = await getRenderedState(page);
  const startUrl = page.url();
  for (let click = 1; click <= 2; click += 1) {
    await page.click('.confirm-new-user-reject');
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.deepEqual(await getRenderedState(page), stateBeforeActions, `${theme}/${width}: Reject click ${click} must not mutate cards, count, summary, or record data`);
  }
  assert.equal(page.url(), startUrl, `${theme}/${width}: Reject must not navigate`);
  assert.deepEqual(dialogs, [], `${theme}/${width}: Reject must not trigger dialogs`);
  assert.equal(await page.$$eval('[role="dialog"], .toast, [class*="toast"], [class*="overlay"]', nodes => nodes.length), 0, `${theme}/${width}: Reject must not create an overlay or toast`);

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const reducedMotion = await page.$$eval('.confirm-new-user-actions button', buttons => buttons.map(button => getComputedStyle(button).transitionDuration));
  reducedMotion.forEach((duration, index) => assert.equal(duration.split(',').every(value => Number.parseFloat(value) === 0), true, `${theme}/${width}: action ${index + 1} must remove transition timing for reduced motion`));

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('.confirm-new-user-confirm')
  ]);
  const detailUrl = new URL(page.url());
  assert.equal(detailUrl.pathname.endsWith('/confirm-new-user-details.html'), true, `${theme}/${width}: Confirm must open the details page`);
  assert.equal(detailUrl.searchParams.get('record'), '0', `${theme}/${width}: Confirm must identify the selected record`);
  assert.equal(detailUrl.searchParams.get('theme'), theme, `${theme}/${width}: Confirm must preserve the theme`);
  assert.deepEqual(errors, []);
  await page.close();
  return layout.palette;
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
      assert.notEqual(palettes.light[index].summary, palettes.dark[index].summary, `${width}px theme summary colors must differ between light and dark`);
      assert.equal(palettes.light[index].name, palettes.dark[index].name, `${width}px header names stay white in both themes`);
      assert.notDeepEqual(palettes.light[index].cardSurface, palettes.dark[index].cardSurface, `${width}px theme card surface background color/image must differ between light and dark`);
    });
    console.log('PASS: Confirm New User is responsive, themed, accessible, navigates from Confirm, and keeps Reject intentionally no-op.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
