const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const newsUrl = pathToFileURL(path.resolve(__dirname, '../modules/admin/options/news.html')).href;
const detailUrl = pathToFileURL(path.resolve(__dirname, '../modules/admin/options/news-detail.html')).href;
const key = 'peoplehcm:workplace:news:v1';
const titles = page => page.$$eval('#newsList a[data-news-id] h3', nodes => nodes.map(node => node.textContent));
async function screenshot(page, name) {
  // Theme colors transition on load; capture the settled UI rather than an intermediate frame.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));
  await page.screenshot({ path: path.resolve(__dirname, name) });
}
async function fits(page) {
  assert.ok(await page.$eval('main', node => node.scrollWidth <= node.clientWidth + 1), 'News must fit the mobile viewport');
  assert.ok(await page.$eval('.admin-heading h1', node => node.getBoundingClientRect().height < 30), 'Page header must stay on one line');
}

async function checkCompanyNews(page, theme) {
  const updates = new URL('../../../company-updates.html?type=news&theme=' + theme, newsUrl);
  await page.goto(updates.href);
  const entries = await page.$$eval('.updates-entry[data-story]', links => links.map(link => [link.dataset.story, link.querySelector('strong').textContent]));
  assert.equal(entries.length, 3);
  const follow = selector => Promise.all([page.waitForNavigation(), page.click(selector)]);
  for (const [id, title] of entries) {
    await follow(`.updates-entry[data-story="${id}"]`);
    assert.equal(await page.$eval('#newsArticleTitle', node => node.textContent), title);
    assert.equal(await page.$eval('#newsAckStatus', node => node.textContent), 'Acknowledgement required');
    assert.equal(await page.$eval('#newsBookmark', node => node.getAttribute('aria-pressed')), 'false');
    await page.click('#newsBookmark');
    await page.click('#newsAcknowledge');
    await page.reload();
    assert.equal(await page.$eval('#newsBookmark', node => node.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('#newsAckStatus', node => node.textContent), 'Acknowledged');
    await follow('#newsDetailBack');
    assert.equal(await page.$eval('.updates-filters [aria-pressed="true"]', node => node.dataset.type), 'news');
  }
  const home = new URL('../../../home' + theme + '.html', newsUrl);
  await page.goto(home.href);
  await follow('.update-card[data-category="news"]');
  assert.equal(await page.$eval('#newsArticleTitle', node => node.textContent), 'Town Hall this Friday');
  await follow('#newsDetailBack');
  assert.equal(new URL(page.url()).pathname, home.pathname);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  try {
    for (const theme of ['light', 'dark']) for (const width of [360, 420]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 950 });
      await page.goto(newsUrl + '?theme=' + theme + '&filter=unread', { waitUntil: 'domcontentloaded' });
      await page.evaluate(storageKey => localStorage.removeItem(storageKey), key);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal((await titles(page)).length, 5);
      assert.equal(await page.$eval('.news-lead-link', node => node.dataset.newsId), 'covid-wfh');
      assert.equal(await page.$eval('.news-lead-heading .news-read-state', node => node.textContent), 'Read');
      assert.equal(await page.$$eval('.news-update-row', nodes => nodes.length), 4);
      assert.equal(await page.$('.news-filters, [data-news-filter], #newsList [role="tab"]'), null);
      assert.equal(await page.$eval('#newsSearchPanel', node => node.hidden), true);
      await fits(page);
      await screenshot(page, `workplace-news-${theme}-${width}.png`);

      await page.click('#newsSearchToggle');
      await page.type('#newsSearch', 'no matching announcement');
      assert.equal(await page.$eval('#newsEmpty', node => node.hidden), false);
      await page.$eval('#newsSearch', node => { node.value = 'lockdown'; node.dispatchEvent(new Event('input')); });
      assert.deepEqual(await titles(page), ['LOCKDOWN 3.0']);
      const readLabel = '[data-news-id="lockdown-3"] .news-read-state';
      assert.equal(await page.$eval(readLabel, node => node.textContent), 'Unread');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-news-id="lockdown-3"]')]);
      assert.equal(new URL(page.url()).searchParams.get('theme'), theme);
      assert.equal(await page.$eval('#newsArticleTitle', node => node.textContent), 'LOCKDOWN 3.0');
      assert.equal(await page.$eval('#newsAcknowledged', node => node.hidden), true, 'Opening a news item must not acknowledge it');
      assert.ok((await page.$eval('#newsDetailActions', node => node.textContent)).includes('this device'), 'Local acknowledgement must not imply it was delivered to a server');
      assert.equal(await page.$eval('#newsAcknowledge', node => node.hidden), false);
      await Promise.all([page.waitForNavigation(), page.click('#newsDetailBack')]);
      assert.equal(await page.$eval('#newsSearch', node => node.value), 'lockdown');
      assert.equal(await page.$eval(readLabel, node => node.textContent), 'Read');
      await page.focus('#newsSearch');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#newsSearchPanel', node => node.hidden), true);
      await Promise.all([page.waitForNavigation(), page.click('[data-news-id="lockdown-3"]')]);
      await page.click('#newsAcknowledge');
      assert.equal(await page.$eval('#newsAcknowledged', node => node.hidden), false);
      const acknowledgedTime = await page.$eval('#newsAcknowledged time', node => node.dateTime);
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#newsAcknowledged time', node => node.dateTime), acknowledgedTime, 'Acknowledgement timestamp must persist');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#newsDetailBack')]);
      assert.equal((await titles(page)).length, 5, 'Acknowledgement must not hide an announcement from the list');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-news-id="return-to-work"]')]);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#newsDetailBack')]);
      assert.equal((await titles(page)).length, 5, 'Viewing an announcement must not change which announcements are shown');
      assert.equal(await page.$eval('[data-news-id="return-to-work"] .news-read-state', node => node.textContent), 'Read');

      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-news-id="covid-wfh"]')]);
      assert.ok((await page.$eval('#newsArticleBody', node => node.textContent)).includes('Attached is a memo of our new working procedures.'));
      assert.equal(await page.$eval('#newsAcknowledged time', node => node.textContent), '06 Jun 2024, 16:53');
      assert.ok((await page.$eval('#newsAttachments', node => node.textContent)).includes('lighthouse-clip-art-png.png'));
      assert.ok((await page.$eval('#newsAttachments', node => node.textContent)).includes('File unavailable'), 'Missing source attachments must not offer a broken download');
      assert.equal(await page.$('#newsAttachments .fa-lock'), null, 'Unavailable attachments must not look permission-locked');
      await fits(page);
      await screenshot(page, `workplace-news-detail-${theme}-${width}.png`);
      await page.$eval('main', node => { node.scrollTop = node.scrollHeight; });
      await screenshot(page, `workplace-news-detail-bottom-${theme}-${width}.png`);

      await page.click('#newsFeedbackTrigger');
      assert.equal(await page.$eval('#newsFeedbackDialog', node => node.open), true);
      await page.type('#newsFeedbackText', '   ');
      await page.click('#newsFeedbackSave');
      assert.equal(await page.$eval('#newsFeedbackDialog', node => node.open), true, 'Whitespace-only feedback must not be saved');
      await page.$eval('#newsFeedbackText', node => { node.value = ''; });
      await page.type('#newsFeedbackText', '<script>unsafe</script> Thank you for the update.');
      await screenshot(page, `workplace-news-feedback-${theme}-${width}.png`);
      await page.click('#newsFeedbackSave');
      assert.equal(await page.$eval('#newsFeedbackDialog', node => node.open), false);
      assert.equal(await page.$eval('#newsSavedFeedbackText', node => node.textContent), '<script>unsafe</script> Thank you for the update.');
      assert.equal(await page.$('#newsSavedFeedback script'), null, 'Feedback must render as text');
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#newsSavedFeedbackText', node => node.textContent), '<script>unsafe</script> Thank you for the update.');
      await page.click('#newsFeedbackTrigger');
      await page.$eval('#newsFeedbackText', node => { node.value = 'Updated feedback'; });
      await page.click('#newsFeedbackSave');
      assert.equal(await page.$eval('#newsSavedFeedbackText', node => node.textContent), 'Updated feedback', 'Editing feedback must update the existing saved feedback');
      await page.click('#newsFeedbackTrigger');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#newsFeedbackDialog', node => node.open), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'newsFeedbackTrigger');
      await page.click(`[data-set-theme="${theme === 'light' ? 'dark' : 'light'}"]`);
      assert.equal(new URL(await page.$eval('#newsDetailBack', node => node.href)).searchParams.get('theme'), theme === 'light' ? 'dark' : 'light');

      await page.goto(detailUrl + '?id=missing&theme=' + theme, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.$eval('#newsUnavailable', node => node.hidden), false);
      assert.equal(await page.$eval('#newsDetailActions', node => node.hidden), true);
      await page.evaluate(storageKey => localStorage.setItem(storageKey, '{broken'), key);
      await page.goto(newsUrl + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
      assert.equal((await titles(page)).length, 5, 'Corrupt saved state must not make the announcements disappear');
      await page.goto(detailUrl + '?id=hari-raya-cmco&theme=' + theme, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); }; });
      await page.click('#newsAcknowledge');
      assert.equal(await page.$eval('#newsAcknowledged', node => node.hidden), true, 'A failed save must not claim acknowledgement succeeded');
      assert.equal(await page.$eval('#newsStorageError', node => node.hidden), false);
      await page.click('#newsFeedbackTrigger');
      await page.type('#newsFeedbackText', 'Keep this draft if saving fails.');
      await page.click('#newsFeedbackSave');
      assert.equal(await page.$eval('#newsFeedbackDialog', node => node.open), true);
      assert.equal(await page.$eval('#newsFeedbackError', node => node.hidden), false);
      assert.equal(await page.$eval('#newsFeedbackText', node => node.value), 'Keep this draft if saving fails.');
      await page.setViewport({ width, height: 640 });
      assert.ok(await page.$eval('#newsFeedbackDialog', node => node.scrollWidth <= node.clientWidth + 1), 'Feedback must fit a short mobile viewport');
      await page.keyboard.press('Escape');
      await fits(page);
      if (width === 420) await checkCompanyNews(page, theme);
      assert.deepEqual(errors, []);
      console.log(`PASS: Simple News cards, navigation, explicit acknowledgement, safe persisted feedback, unavailable states, ${theme}, ${width}px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
