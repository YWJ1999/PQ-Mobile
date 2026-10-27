const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const moduleUrl = (file, query = '') => pathToFileURL(path.join(root, 'modules/training-competency', file)).href + query;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

    const open = url => page.goto(url, { waitUntil: 'domcontentloaded' });
    const click = async selector => {
      await page.waitForFunction(selector => {
        for (let node = document.querySelector(selector); node; node = node.parentElement) {
          if (node.getAnimations().some(animation => animation.playState === 'running')) return false;
        }
        return true;
      }, {}, selector);
      await page.$eval(selector, node => {
        // Scroll only the containing content area, not the phone or document.
        let scroller = node.parentElement;
        while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
        if (scroller) {
          const target = node.getBoundingClientRect(), bounds = scroller.getBoundingClientRect();
          scroller.scrollTop += target.top - bounds.top - (scroller.clientHeight - target.height) / 2;
        }
      });
      await page.click(selector);
    };
    const assertFrame = async label => {
      const frame = await page.evaluate(() => {
        const phone = document.querySelector('.phone-container');
        const header = document.querySelector('.training-competency-header');
        const nav = document.querySelector('.bottom-nav');
        return {
          phoneScroll: phone.scrollTop,
          bodyScroll: document.body.scrollTop,
          documentScroll: document.documentElement.scrollTop,
          headerOffset: Math.abs(header.getBoundingClientRect().top - phone.getBoundingClientRect().top),
          navOffset: Math.abs(nav.getBoundingClientRect().bottom - phone.getBoundingClientRect().bottom)
        };
      });
      assert.equal(frame.phoneScroll, 0, label);
      assert.equal(frame.bodyScroll, 0, label);
      assert.equal(frame.documentScroll, 0, label);
      assert.ok(frame.headerOffset < 1, label + ': header stays visible');
      assert.ok(frame.navOffset < 1, label + ': navigation stays at the bottom');
    };

    await open(moduleUrl('index.html', '?scope=individual&theme=dark'));
    assert.equal(fs.existsSync(path.join(root, 'modules/training-competency/options/training-calendar.html')), false, 'Training Calendar is embedded instead of using a standalone page');
    assert.deepEqual(await page.$eval('[data-option-id="training-calendar"]', node => ({ tag: node.tagName, href: node.getAttribute('href') })), { tag: 'BUTTON', href: null });
    assert.deepEqual(await page.$eval('#trainingCalendarSection', section => ({
      insideIndividual: section.parentElement.id,
      followsQuickOptions: section.previousElementSibling?.querySelector('#trainingCompetencyIndividualOptions') !== null,
      title: section.querySelector('.training-competency-section-title').textContent.trim(),
      titleIcon: section.querySelector('.training-competency-section-title .fa-calendar-days') !== null,
      leaveStyleCard: section.querySelector('.calendar-card.training-dashboard-calendar-card') !== null,
      subtitle: section.querySelector('.training-calendar-subtitle')?.textContent.trim() || null,
      info: section.querySelector('#trainingCalendarInfo')?.textContent.trim() || null,
      oldControls: section.querySelectorAll('.cal-view-switch, .cal-filter-btn, .training-calendar-active-filter, .training-calendar-status-legend').length
    })), {
      insideIndividual: 'trainingCompetencyIndividualPanel',
      followsQuickOptions: true,
      title: 'My Training Calendar',
      titleIcon: true,
      leaveStyleCard: true,
      subtitle: 'Training Activities',
      info: 'Info',
      oldControls: 0
    });

    await page.click('[data-view-all="trainingCompetencyIndividualOptions"]');
    await page.waitForSelector('#trainingCompetencyOptionsOverlay:not([hidden])');
    await page.click('[data-option-ref="training-calendar"]');
    await page.waitForFunction(() => document.activeElement?.id === 'trainingCalendarMonth');
    assert.equal(await page.$eval('#trainingCompetencyOptionsOverlay', node => node.hidden), true);
    await assertFrame('Calendar shortcut');

    assert.equal(await page.$eval('#trainingCalendarMonth', node => node.textContent.trim()), 'October 2026');
    assert.deepEqual(await page.$$eval('.training-calendar-weekdays span', nodes => nodes.map(node => node.textContent.trim())), ['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    assert.equal(await page.$$eval('#trainingCalendarGrid .cal-day-cell', nodes => nodes.length), 34, 'Leave-style calendar uses Monday-first leading dates plus current-month dates');
    assert.deepEqual(await page.$$eval('#trainingCalendarGrid .cal-day-cell.other-month', nodes => nodes.map(node => node.textContent.trim())), ['28', '29', '30']);
    assert.deepEqual(await page.$$eval('#trainingCalendarGrid .cal-day-cell[data-has-events="true"]', nodes => nodes.map(node => ({
      date: node.dataset.date,
      tag: node.querySelector('.cal-cell-tag')?.textContent.trim(),
      eventClass: node.classList.contains('status-event'),
      hasStatusDot: Boolean(node.querySelector('.cal-status-dot'))
    }))), [
      { date: '2026-10-20', tag: 'TRAIN', eventClass: true, hasStatusDot: false },
      { date: '2026-10-27', tag: 'TRAIN', eventClass: true, hasStatusDot: false }
    ]);

    await click('#trainingCalendarNext');
    assert.equal(await page.$eval('#trainingCalendarMonth', node => node.textContent.trim()), 'November 2026');
    await click('#trainingCalendarPrevious');
    assert.equal(await page.$eval('#trainingCalendarMonth', node => node.textContent.trim()), 'October 2026');

    await click('#trainingCalendarGrid .cal-day-cell[data-date="2026-10-20"]');
    await page.waitForSelector('#trainingCalendarSheet.is-open');
    assert.deepEqual(await page.$eval('#trainingCalendarSheet', node => ({
      hidden: node.getAttribute('aria-hidden'),
      modal: node.querySelector('[role="dialog"]').getAttribute('aria-modal'),
      title: node.querySelector('#trainingCalendarSheetDate').textContent.trim()
    })), { hidden: 'false', modal: 'true', title: '20 Oct 2026' });
    assert.equal(await page.$eval('main', node => node.inert), true);
    assert.deepEqual(await page.$$eval('.training-calendar-event-card', cards => cards.map(card => ({
      classCode: card.querySelector('.history-card-title')?.textContent.trim() || null,
      course: card.querySelector('.history-card-ref')?.textContent.trim() || null,
      status: card.querySelector('.card-status-badge')?.textContent.trim() || null,
      description: card.querySelector('[data-field="description"] strong')?.textContent.trim() || null,
      timeStarts: card.querySelector('.training-calendar-event-time strong').textContent.trim().startsWith('9:00 AM'),
      timeEnds: card.querySelector('.training-calendar-event-time strong').textContent.trim().endsWith('5:00 PM'),
      detailRows: card.querySelectorAll('.training-calendar-event-meta-row').length,
      rowLayouts: [...card.querySelectorAll('.training-calendar-event-meta-row')].map(row => ({
        display: getComputedStyle(row).display,
        justify: getComputedStyle(row).justifyContent
      })),
      dividerWidth: getComputedStyle(card.querySelector('.training-calendar-event-time')).borderTopWidth,
      action: card.querySelector('.training-calendar-detail').textContent.trim(),
      historyStyle: card.classList.contains('history-card-item'),
      statusTheme: card.dataset.status,
      actionTag: card.querySelector('.training-calendar-detail').tagName,
      actionHref: card.querySelector('.training-calendar-detail').getAttribute('href'),
      purpleHeader: card.querySelector('.training-calendar-event-header') !== null
    }))), [{
      classCode: 'A01',
      course: 'Course: Microsoft 365 Productivity',
      status: 'Approved',
      description: 'Hands-on productivity training covering collaboration, documents and workflow tools.',
      timeStarts: true,
      timeEnds: true,
      detailRows: 2,
      rowLayouts: [
        { display: 'flex', justify: 'space-between' },
        { display: 'flex', justify: 'space-between' }
      ],
      dividerWidth: '0px',
      action: 'Detail',
      historyStyle: true,
      statusTheme: 'approved',
      actionTag: 'A',
      actionHref: 'options/training-request-details.html?request=microsoft-365-productivity&date=2026-10-20&theme=dark',
      purpleHeader: false
    }]);

    await click('.training-calendar-event-card');
    await page.waitForSelector('#trainingClassDetailsModal.is-open');
    assert.deepEqual(await page.$eval('#trainingClassDetailsModal', modal => ({
      hidden: modal.getAttribute('aria-hidden'),
      title: modal.querySelector('#trainingClassDetailsTitle').textContent.trim(),
      labels: [...modal.querySelectorAll('.training-calendar-class-detail-row dt')].map(item => item.textContent.trim()),
      values: [...modal.querySelectorAll('.training-calendar-class-detail-row dd')].map(item => item.textContent.trim()),
      underlyingSheetInert: document.getElementById('trainingCalendarSheet').inert
    })), {
      hidden: 'false',
      title: 'Training Class Details',
      labels: ['Class', 'Description', 'Course Title', 'Class Status', 'Start', 'End', 'Venue', 'Closing Date', 'Trainer / Facilitator', 'Class / Capacity', 'Remark', 'Class Attachment'],
      values: [
        'A01',
        'Hands-on productivity training covering collaboration, documents and workflow tools.',
        'Microsoft 365 Productivity',
        'Scheduled',
        '20 Oct 2026, 9:00 AM',
        '20 Oct 2026, 5:00 PM',
        'Training Room 3A',
        '16 Oct 2026, 5:00 PM',
        'Alicia Tan',
        '24 Participants',
        'Please bring a company laptop for the practical exercises.',
        'Microsoft 365 Class Guide.pdf'
      ],
      underlyingSheetInert: true
    });
    await click('#trainingClassDetailsCancel');
    await page.waitForFunction(() => document.getElementById('trainingClassDetailsModal').getAttribute('aria-hidden') === 'true');
    assert.equal(await page.$eval('#trainingCalendarSheet', node => node.inert), false);
    assert.equal(await page.$eval('.training-calendar-event-card', node => document.activeElement === node), true);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.$eval('.training-calendar-detail', node => node.click())
    ]);
    assert.equal(await page.$eval('h1', node => node.textContent.trim()), 'Training Request Details');
    assert.deepEqual(await page.$$eval('.training-request-section > h2', nodes => nodes.map(node => node.textContent.trim())), ['Class Details', 'Request Details']);
    assert.deepEqual(await page.$$eval('#trainingClassDetails .training-request-field', rows => rows.map(row => ({
      label: row.querySelector('dt').textContent.trim(),
      value: row.querySelector('dd').textContent.trim()
    }))), [
      { label: 'Class', value: 'A01' },
      { label: 'Description', value: 'Hands-on productivity training covering collaboration, documents and workflow tools.' },
      { label: 'Course Title', value: 'Microsoft 365 Productivity' },
      { label: 'Class Status', value: 'Scheduled' },
      { label: 'Start', value: '20 Oct 2026, 9:00 AM' },
      { label: 'End', value: '20 Oct 2026, 5:00 PM' },
      { label: 'Venue', value: 'Training Room 3A' },
      { label: 'Trainer / Facilitator', value: 'Alicia Tan' },
      { label: 'Class Capacity', value: '24 Participants' },
      { label: 'Remark', value: 'Please bring a company laptop for the practical exercises.' }
    ]);
    assert.deepEqual(await page.$eval('#trainingRequestFields', section => ({
      reference: section.querySelector('[data-field="document-status"]').previousElementSibling.querySelector('dd').textContent.trim(),
      employee: section.querySelector('[data-field="employee"] .training-request-employee-name').textContent.trim(),
      employeeId: section.querySelector('[data-field="employee"] .training-request-employee-id').textContent.trim(),
      documentStatus: section.querySelector('[data-field="document-status"] dd').textContent.trim(),
      attendanceStatus: section.querySelector('[data-field="attendance-status"] dd').textContent.trim()
    })), {
      reference: 'TR-2026-0108',
      employee: 'Farhan Binti Rahmat',
      employeeId: '#EBB12',
      documentStatus: 'Approved',
      attendanceStatus: 'Registered'
    });
    assert.equal(await page.$eval('#trainingRequestCancel', node => node.getAttribute('href')), '../index.html?scope=individual&date=2026-10-20&theme=dark');
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), click('#trainingRequestCancel')]);
    await page.waitForSelector('#trainingCalendarSheet.is-open');
    assert.equal(await page.$eval('#trainingCalendarGrid .cal-day-cell.selected', node => node.dataset.date), '2026-10-20');
    await click('#trainingCalendarSheetCancel');
    await assertFrame('Return from request details and close date');
    await click('#trainingCalendarGrid .cal-day-cell[data-date="2026-10-27"]');
    await page.waitForSelector('#trainingCalendarSheet.is-open');
    assert.deepEqual(await page.$eval('.training-calendar-event-card', card => ({
      classCode: card.querySelector('.history-card-title').textContent.trim(),
      status: card.querySelector('.card-status-badge').textContent.trim(),
      statusTheme: card.dataset.status
    })), { classCode: 'A02', status: 'Submitted', statusTheme: 'submitted' });

    for (const theme of ['dark', 'light']) {
      for (const width of [360, 420]) {
        await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
        await open(moduleUrl('index.html', `?scope=individual&theme=${theme}`));
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
        assert.ok(await page.$eval('.main-content', node => node.scrollWidth - node.clientWidth <= 1), `${theme} Leave-style calendar fits at ${width}px`);
        assert.equal(await page.$eval('#trainingCalendarSection', node => node.getClientRects().length > 0), true);
        await click('#trainingCalendarGrid .cal-day-cell[data-date="2026-10-20"]');
        await page.waitForSelector('#trainingCalendarSheet.is-open');
        assert.ok(await page.$eval('#trainingCalendarSheet [role="dialog"]', node => node.scrollWidth - node.clientWidth <= 1), `${theme} sheet fits at ${width}px`);
        await click('.training-calendar-event-card');
        await page.waitForSelector('#trainingClassDetailsModal.is-open');
        assert.ok(await page.$eval('#trainingClassDetailsModal [role="dialog"]', node => node.scrollWidth - node.clientWidth <= 1), `${theme} class details fit at ${width}px`);
        await click('#trainingClassDetailsCancel');
        await click('#trainingCalendarSheetCancel');
        await assertFrame(`${theme} ${width}px after closing date details`);
        await open(moduleUrl('index.html', `?scope=individual&theme=${theme}&date=2026-10-20#trainingCalendarSection`));
        await page.waitForSelector('#trainingCalendarSheet.is-open');
        await click('#trainingCalendarSheetCancel');
        await assertFrame(`${theme} ${width}px legacy return link`);
      }
    }

    assert.deepEqual(pageErrors, []);
    console.log('PASS: Leave-style Training Calendar, Card popup, Detail request form, return flow and responsive themes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
