const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const historyUrl = theme => pathToFileURL(
  path.resolve(__dirname, '..', 'modules/project-task/options/history.html')
).href + '?theme=' + theme;

async function waitForReady(page) {
  await page.waitForFunction(() => document.documentElement.dataset.projectHistoryReady === 'true');
}

async function openCard(page, selector) {
  await page.$eval(selector, card => card.click());
  await page.waitForSelector('#projectHistoryDetailOverlay.is-open');
}

async function closeDetails(page) {
  await page.$eval('#closeProjectHistoryDetails', button => button.click());
  await page.waitForFunction(() => document.getElementById('projectHistoryDetailOverlay').hidden);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const faults = [];
    page.on('pageerror', error => faults.push(error.message));
    await page.setViewport({ width: 390, height: 950 });

    for (const theme of ['dark', 'light']) {
      await page.goto(historyUrl(theme), { waitUntil: 'domcontentloaded' });
      await waitForReady(page);

      assert.equal(await page.$$eval('.project-history-tab i', icons => icons.length), 0);
      const tabStyles = await page.evaluate(() => {
        const switcher = getComputedStyle(document.querySelector('.project-history-tabs'));
        const active = getComputedStyle(document.querySelector('.project-history-tab[aria-selected="true"]'));
        const inactive = getComputedStyle(document.querySelector('.project-history-tab[aria-selected="false"]'));
        return {
          switcherRadius: switcher.borderRadius,
          switcherPadding: switcher.padding,
          switcherBackground: switcher.backgroundColor,
          switcherBorder: switcher.borderTopWidth,
          tabRadius: active.borderRadius,
          activeBackground: active.backgroundImage,
          activeColor: active.color,
          inactiveBackground: inactive.backgroundColor
        };
      });
      assert.equal(tabStyles.switcherRadius, '0px');
      assert.equal(tabStyles.switcherPadding, '0px');
      assert.equal(tabStyles.switcherBackground, 'rgba(0, 0, 0, 0)');
      assert.equal(tabStyles.switcherBorder, '0px');
      assert.equal(tabStyles.tabRadius, '22px');
      assert.match(tabStyles.activeBackground, /linear-gradient/);
      assert.equal(tabStyles.activeColor, 'rgb(255, 255, 255)');
      assert.notEqual(tabStyles.inactiveBackground, 'rgba(0, 0, 0, 0)');
      assert.deepEqual(
        await page.$$eval('.project-history-list-heading h2', headings => headings.map(heading => heading.textContent.trim())),
        ['Work Plan History', 'Timesheet History']
      );
      assert.equal(await page.$eval('#workPlanHistoryCount', count => count.textContent.trim()), '2');
      assert.equal(await page.$('#workPlanHistoryEmpty'), null);
      assert.equal(await page.$('#timesheetHistoryEmpty'), null);
      assert.deepEqual(
        await page.$$eval('#workPlanHistoryList .project-history-status-badge', badges => [...new Set(badges.map(badge => badge.textContent.trim()))].sort()),
        ['Draft', 'Pending']
      );
      assert.deepEqual(
        await page.$$eval('#workPlanFilterStatus option', options => options.map(option => option.textContent.trim())),
        ['All Status', 'Pending', 'Draft']
      );

      assert.equal(await page.$$eval('#workPlanHistoryList .project-history-card', cards => cards.length), 2);

      const pendingCardSelector = '#workPlanHistoryList [data-record-id="WP-2026-0048"]';
      assert.match(
        await page.$eval(pendingCardSelector + ' .project-history-status-badge i', icon => icon.className),
        /fa-paper-plane/
      );
      assert.deepEqual(
        await page.$$eval(pendingCardSelector + ' .project-history-card-action', buttons => buttons.map(button => button.textContent.trim())),
        ['Cancel']
      );

      const draftCardSelector = '#workPlanHistoryList [data-record-id="WP-2026-0039"]';
      assert.match(
        await page.$eval(draftCardSelector + ' .project-history-status-badge i', icon => icon.className),
        /fa-floppy-disk/
      );
      assert.deepEqual(
        await page.$$eval(draftCardSelector + ' .project-history-card-action', buttons => buttons.map(button => button.textContent.trim())),
        ['Submit', 'Cancel']
      );
      const actionStyles = await page.evaluate(selector => {
        const card = document.querySelector(selector);
        const primary = getComputedStyle(card.querySelector('.project-history-card-action-primary'));
        const danger = getComputedStyle(card.querySelector('.project-history-card-action-danger'));
        return {
          primaryBackground: primary.backgroundImage,
          primaryColor: primary.color,
          dangerBackground: danger.backgroundImage,
          dangerColor: danger.color
        };
      }, draftCardSelector);
      assert.match(actionStyles.primaryBackground, /linear-gradient/);
      assert.equal(actionStyles.primaryColor, 'rgb(255, 255, 255)');
      assert.match(actionStyles.dangerBackground, /linear-gradient/);
      assert.equal(actionStyles.dangerColor, 'rgb(255, 255, 255)');
      await page.hover(draftCardSelector + ' .project-history-card-action-primary');
      await new Promise(resolve => setTimeout(resolve, 220));
      assert.equal(
        await page.$eval(draftCardSelector + ' .project-history-card-action-primary', button => getComputedStyle(button).filter),
        'none'
      );
      await page.$eval(draftCardSelector + ' .project-history-card-action-primary', button => button.click());
      assert.equal(await page.$eval('#projectHistoryDetailOverlay', overlay => overlay.hidden), true);

      const workPlanCardSelector = '#workPlanHistoryList [data-record-id="WP-2026-0048"]';
      const cardBeforeHover = await page.$eval(workPlanCardSelector, card => ({
        background: getComputedStyle(card).backgroundImage,
        transform: getComputedStyle(card).transform
      }));
      await page.hover(workPlanCardSelector);
      await new Promise(resolve => setTimeout(resolve, 220));
      assert.deepEqual(
        await page.$eval(workPlanCardSelector, card => ({
          background: getComputedStyle(card).backgroundImage,
          transform: getComputedStyle(card).transform
        })),
        cardBeforeHover
      );
      assert.deepEqual(
        await page.$$eval(workPlanCardSelector + ' .project-history-data-row > span', labels => labels.map(label => label.textContent.trim())),
        ['Scheduled', 'Deadline']
      );
      assert.equal(await page.$eval(workPlanCardSelector + ' .project-history-status-badge', badge => badge.textContent.trim()), 'Pending');

      await openCard(page, workPlanCardSelector);
      assert.equal(await page.$eval('#projectHistoryDetailTitle', title => title.textContent.trim()), 'Work Plan Details');
      const detailModalLayout = await page.evaluate(() => {
        const overlay = document.getElementById('projectHistoryDetailOverlay');
        const sheet = overlay.querySelector('.project-history-detail-sheet');
        const header = overlay.querySelector('.project-history-detail-header');
        const handle = overlay.querySelector('.project-history-sheet-handle');
        const overlayRect = overlay.getBoundingClientRect();
        const sheetRect = sheet.getBoundingClientRect();
        return {
          alignItems: getComputedStyle(overlay).alignItems,
          zIndex: getComputedStyle(overlay).zIndex,
          overlayOpacity: getComputedStyle(overlay).opacity,
          sheetOpacity: getComputedStyle(sheet).opacity,
          topGap: Math.round(sheetRect.top - overlayRect.top),
          bottomGap: Math.round(overlayRect.bottom - sheetRect.bottom),
          verticalCenterOffset: Math.round(
            (sheetRect.top + (sheetRect.height / 2))
            - (overlayRect.top + (overlayRect.height / 2))
          ),
          sheetRadius: getComputedStyle(sheet).borderRadius,
          headerBackground: getComputedStyle(header).backgroundImage,
          headerTextTransform: getComputedStyle(document.getElementById('projectHistoryDetailTitle')).textTransform,
          handleDisplay: getComputedStyle(handle).display
        };
      });
      assert.equal(detailModalLayout.alignItems, 'center');
      assert.equal(detailModalLayout.zIndex, '1200');
      assert.equal(detailModalLayout.overlayOpacity, '1');
      assert.equal(detailModalLayout.sheetOpacity, '1');
      assert.ok(detailModalLayout.topGap >= 16);
      assert.ok(detailModalLayout.bottomGap >= 16);
      assert.ok(Math.abs(detailModalLayout.verticalCenterOffset) <= 2);
      assert.equal(detailModalLayout.sheetRadius, '18px');
      assert.match(detailModalLayout.headerBackground, /linear-gradient/);
      assert.equal(detailModalLayout.headerTextTransform, 'uppercase');
      assert.equal(detailModalLayout.handleDisplay, 'none');
      assert.deepEqual(
        await page.$$eval('[data-detail-section="work-plan"] .project-history-detail-row > span:first-child', labels => labels.map(label => label.textContent.trim())),
        [
          'Reference #', 'Task Category', 'Sub Task', 'Project', 'Milestone',
          'Schedule From', 'Schedule To', 'Status', 'Assignee', 'Est. Complete',
          'Act. Complete', 'Allocated Hour', 'Actual Hour', 'Priority',
          'Completion %', 'Remarks', 'Hours', 'OT Hours', 'Reassign?',
          'Reassign Remarks', 'Reassign To', 'Reassign Date', 'Attachments'
        ]
      );
      await closeDetails(page);

      await page.$eval('#historyTab-timesheet', tab => tab.click());
      assert.ok(await page.$('#openTimesheetHistoryFilter[aria-label="Filter Timesheet History"]'));
      assert.equal(await page.$$eval('#timesheetHistoryList .project-history-card', cards => cards.length), 2);
      assert.deepEqual(
        await page.$$eval('#timesheetHistoryList .project-history-status-badge', badges => [...new Set(badges.map(badge => badge.textContent.trim()))].sort()),
        ['Draft', 'Pending']
      );

      const timesheetCardSelector = '#timesheetHistoryList [data-record-id="TS-2026-0102"]';
      assert.deepEqual(
        await page.$$eval(timesheetCardSelector + ' .project-history-data-row > span', labels => labels.map(label => label.textContent.trim())),
        ['Normal Hours', 'OT Hours']
      );
      assert.equal(await page.$eval(timesheetCardSelector + ' .project-history-status-badge', badge => badge.textContent.trim()), 'Pending');
      assert.deepEqual(
        await page.$$eval(timesheetCardSelector + ' .project-history-card-action', buttons => buttons.map(button => button.textContent.trim())),
        ['Cancel']
      );

      await openCard(page, timesheetCardSelector);
      assert.equal(await page.$eval('#projectHistoryDetailTitle', title => title.textContent.trim()), 'Timesheet Details');
      assert.deepEqual(
        await page.$$eval('[data-detail-section="timesheet-summary"] .project-history-detail-row > span:first-child', labels => labels.map(label => label.textContent.trim())),
        ['Reference #', 'Date', 'Remark', 'Status', 'Normal Hours', 'OT Hours']
      );
      assert.equal(await page.$eval('.project-history-detail-subtitle', title => title.textContent.trim()), 'Work Details');
      assert.deepEqual(
        await page.$$eval('[data-detail-activity="0"] .project-history-detail-row > span:first-child', labels => labels.map(label => label.textContent.trim())),
        ['Title', 'Description', 'Project', 'Is AdHocTask?', 'Task', 'Is Overtime?', 'Time From', 'Completion %', 'Time To']
      );
      await closeDetails(page);

      await page.setViewport({ width: 574, height: 950 });
      await page.$eval('#openTimesheetHistoryFilter', button => button.click());
      await page.waitForSelector('#timesheetHistoryFilterOverlay.is-open');
      await page.waitForFunction(() => {
        const overlay = document.getElementById('timesheetHistoryFilterOverlay');
        const sheet = overlay?.querySelector('.project-history-filter-sheet');
        if (!overlay || !sheet) return false;
        return Math.abs(sheet.getBoundingClientRect().bottom - overlay.getBoundingClientRect().bottom) < 1;
      });
      assert.deepEqual(
        await page.$$eval('#timesheetHistoryFilterForm > .project-history-filter-field > label', labels => labels.map(label => label.textContent.trim())),
        ['Year', 'Month']
      );
      const timesheetFilterLayout = await page.evaluate(() => {
        const overlay = document.getElementById('timesheetHistoryFilterOverlay');
        const form = document.getElementById('timesheetHistoryFilterForm');
        const fields = [...form.querySelectorAll(':scope > .project-history-filter-field')];
        const apply = document.getElementById('applyTimesheetHistoryFilter');
        const bottomNav = document.querySelector('.bottom-nav');
        const formRect = form.getBoundingClientRect();
        return {
          overlayZ: Number(getComputedStyle(overlay).zIndex),
          bottomNavZ: Number(getComputedStyle(bottomNav).zIndex),
          formClassName: form.className,
          firstFieldClassName: fields[0].className,
          formBackground: getComputedStyle(form).backgroundColor,
          formAlignItems: getComputedStyle(form).alignItems,
          fieldWidths: fields.map(field => Math.round(field.getBoundingClientRect().width)),
          fieldLefts: fields.map(field => Math.round(field.getBoundingClientRect().left)),
          formWidth: Math.round(formRect.width),
          formLeft: Math.round(formRect.left),
          applyWidth: Math.round(apply.getBoundingClientRect().width),
          applyIsTopLayer: (() => {
            const rect = apply.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
            return hit === apply || apply.contains(hit);
          })()
        };
      });
      assert.ok(timesheetFilterLayout.overlayZ > timesheetFilterLayout.bottomNavZ);
      assert.equal(timesheetFilterLayout.formClassName, '');
      assert.equal(timesheetFilterLayout.firstFieldClassName, 'project-history-filter-field');
      assert.equal(timesheetFilterLayout.formBackground, 'rgba(0, 0, 0, 0)');
      assert.equal(timesheetFilterLayout.formAlignItems, 'stretch');
      assert.deepEqual(timesheetFilterLayout.fieldWidths, [timesheetFilterLayout.formWidth, timesheetFilterLayout.formWidth]);
      assert.deepEqual(timesheetFilterLayout.fieldLefts, [timesheetFilterLayout.formLeft, timesheetFilterLayout.formLeft]);
      assert.equal(timesheetFilterLayout.applyWidth, timesheetFilterLayout.formWidth);
      assert.equal(timesheetFilterLayout.applyIsTopLayer, true);
      await page.select('#timesheetFilterYear', '2026');
      await page.select('#timesheetFilterMonth', '9');
      await page.$eval('#applyTimesheetHistoryFilter', button => button.click());
      assert.deepEqual(
        await page.$$eval('#timesheetHistoryList .project-history-card', cards => cards.map(card => card.dataset.recordId)),
        ['TS-2026-0094']
      );

      assert.equal(await page.$eval('.phone-container', phone => phone.scrollWidth > phone.clientWidth + 1), false);
    }

    assert.deepEqual(faults, []);
    console.log('PASS: Project & Task history cards and detail sheets expose the required Work Plan and Timesheet data.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
