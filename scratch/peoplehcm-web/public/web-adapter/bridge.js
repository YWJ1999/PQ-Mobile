/** Native document presentation boundary. Original business state and controls remain intact. */
(function () {
  'use strict';
  const html = document.documentElement;
  const hostOrigin = window.location.origin;
  const storageKey = 'peoplehcm.web.preferences';
  const inlineSeen = new WeakMap();
  const sheetSeen = new WeakMap();
  const individualDetailsOverlay = document.querySelector('.attendance-record-card') && document.getElementById('attendanceDetailsModalOverlay');
  // Keep the source field names as keys when the visible labels are localized.
  const individualDetailValues = new Map(
    Array.from(individualDetailsOverlay?.querySelectorAll('.attendance-details-main > div') || [],
      row => [row.firstElementChild.textContent.trim(), row.lastElementChild]),
  );
  const individualDayType = individualDetailValues.get('Day Type')?.textContent.trim();
  const individualClose = individualDetailsOverlay?.querySelector('.modal-close-round');
  let individualDetailsTrigger;
  if (individualClose) {
    const title = individualDetailsOverlay.querySelector('h3');
    title.id = 'attendanceDetailsTitle';
    const dialog = individualDetailsOverlay.querySelector('.popup-modal-content');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        individualClose.click();
      }
    });
  }
  let preferences = { theme: { primary: '#435875', mode: 'light' }, locale: 'en' };
  let pending = false;
  let stylesPending = true;
  let sourceInitialized = document.readyState === 'complete';
  const documentScrollers = new Set();
  let profileScrollAdapted = false;
  html.setAttribute('data-peoplehcm-web', '');
  html.setAttribute('data-web-native', '');
  const adapterSource = document.currentScript?.src;
  if (adapterSource && /\/(?:[\w-]*history|tax-relief|prior-pay-data|overtime|change-request|leave)\.html$/.test(location.pathname)) {
    const historyPages = document.createElement('script');
    historyPages.src = new URL('history-pages.js', adapterSource).href;
    document.head.append(historyPages);
  }

  function send(type, extra) {
    window.dispatchEvent(new CustomEvent(type, { detail: extra || {} }));
  }
  function route() {
    const prefix = '/workspace/';
    const index = window.location.pathname.indexOf(prefix);
    const path =
      index >= 0
        ? window.location.pathname.slice(index + prefix.length)
        : window.location.pathname.replace(/^\//, '');
    return path + window.location.search + window.location.hash;
  }
  function announceNavigation() {
    send('peoplehcm:navigation', { path: route(), title: document.title });
  }
  function rgb(hex) {
    return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  }
  function mix(hex, toward, ratio) {
    const a = rgb(hex),
      b = rgb(toward);
    return (
      '#' +
      a
        .map((channel, index) =>
          Math.round(channel + (b[index] - channel) * ratio)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  }
  function luminance(hex) {
    const channels = rgb(hex).map((value) => {
      const normalized = value / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  function readableForeground(hex) {
    return luminance(hex) > 0.179 ? '#000000' : '#ffffff';
  }
  function readableAccent(primary, dark) {
    const surface = dark ? '#252930' : '#eef0f3';
    const surfaceLuminance = luminance(surface);
    for (let ratio = 0; ratio <= 1; ratio += 0.1) {
      const candidate = mix(primary, dark ? '#ffffff' : '#263140', ratio);
      const candidateLuminance = luminance(candidate);
      if (
        (Math.max(surfaceLuminance, candidateLuminance) + 0.05) /
          (Math.min(surfaceLuminance, candidateLuminance) + 0.05) >=
        4.5
      )
        return candidate;
    }
    return dark ? '#ffffff' : '#263140';
  }
  function applyPreferences(next, persist) {
    if (next && typeof next === 'object') {
      const theme = next.theme || {};
      if (typeof theme.primary === 'string' && /^#[0-9a-f]{6}$/i.test(theme.primary))
        preferences.theme.primary = theme.primary;
      if (theme.mode === 'light' || theme.mode === 'dark') preferences.theme.mode = theme.mode;
      if (next.locale === 'en' || next.locale === 'zh') preferences.locale = next.locale;
    }
    const primary = preferences.theme.primary;
    const dark = preferences.theme.mode === 'dark';
    const primaryText = readableAccent(primary, dark);
    const values = {
      '--primary': primary,
      '--primary-text': primaryText,
      '--primary-text-rgb': rgb(primaryText).join(', '),
      '--accent-ink': primaryText,
      '--primary-rgb': rgb(primary).join(', '),
      '--primary-hover': mix(primary, '#000000', 0.18),
      '--primary-soft': mix(primary, dark ? '#252930' : '#eef0f3', dark ? 0.74 : 0.9),
      '--primary-border': mix(primary, dark ? '#252930' : '#eef0f3', 0.58),
      '--primary-on': readableForeground(primary),
      '--purple-primary': 'var(--primary)',
      '--purple-hover': 'var(--primary-hover)',
      '--purple-text': 'var(--primary-text)',
      '--purple-subtle': 'var(--primary-soft)',
      '--purple-border': 'var(--primary-border)',
      '--border-focus': 'var(--primary-text)',
      '--tag-violet-bg': 'var(--primary-soft)',
      '--tag-violet-text': 'var(--primary-text)',
      '--nav-item-active': 'var(--primary)',
      '--phone-toggle-active': 'var(--primary)',
    };
    Object.entries(values).forEach(([name, value]) => {
      if (html.style.getPropertyValue(name) !== value) html.style.setProperty(name, value);
    });
    if (html.getAttribute('data-theme') !== preferences.theme.mode)
      html.setAttribute('data-theme', preferences.theme.mode);
    html.lang = preferences.locale === 'zh' ? 'zh-CN' : 'en';
    if (document.body) {
      document.body.classList.toggle('light-mode', !dark);
      document.body.classList.toggle('dark-mode', dark);
    }
    if (sourceInitialized && window.PeopleHcmWebI18n)
      window.PeopleHcmWebI18n.setLocale(preferences.locale);
    if (persist) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(preferences));
      } catch (_) {
        /* Storage can be disabled by the browser. */
      }
    }
    schedule();
  }

  // Old screen styles contain literal brand colors. Map violet/indigo hues to tokens,
  // retaining red/amber/green/blue status colors and all alpha values.
  function isLegacyBrand(channels) {
    const [r, g, b] = channels.map((value) => value / 255);
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      delta = max - min;
    if (delta < 0.035) return false;
    const lightness = (max + min) / 2;
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (saturation < 0.12) return false;
    let hue;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
    return hue >= 230 && hue <= 305;
  }
  function replaceBrand(value) {
    return value.replace(
      /#[0-9a-f]{3,8}\b|rgba?\(\s*[\d.]+\s*[, ]\s*[\d.]+\s*[, ]\s*[\d.]+(?:\s*[,/]\s*[\d.]+)?\s*\)|(?<![\w-])(?:purple|violet|indigo)(?![\w-])/gi,
      (token) => {
        let channels, alpha;
        if (token[0] === '#') {
          let hex = token.slice(1);
          if (hex.length === 3 || hex.length === 4)
            hex = hex
              .split('')
              .map((character) => character + character)
              .join('');
          if (hex.length !== 6 && hex.length !== 8) return token;
          channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
          if (hex.length === 8) alpha = parseInt(hex.slice(6), 16) / 255;
        } else if (/^rgb/i.test(token)) {
          const numbers = token.match(/[\d.]+/g).map(Number);
          channels = numbers.slice(0, 3);
          alpha = numbers[3];
        } else return 'var(--primary)';
        if (!isLegacyBrand(channels)) return token;
        if (alpha !== undefined) return 'rgba(var(--primary-rgb), ' + alpha + ')';
        if (Math.min.apply(null, channels) > 190) return 'var(--primary-soft)';
        return 'var(--primary)';
      },
    );
  }
  function rewriteDeclaration(style) {
    const primaryBackground = ['background', 'background-color', 'background-image'].some((property) =>
      /var\(--(?:primary|purple-primary)\s*(?:\)|,)/.test(replaceBrand(style.getPropertyValue(property))),
    );
    for (let index = 0; index < style.length; index += 1) {
      const property = style[index],
        before = style.getPropertyValue(property);
      let after = replaceBrand(before);
      if (property === 'color') {
        after = after
          .replace(/var\(--primary\)/g, 'var(--primary-text)')
          .replace(/--purple-primary\b/g, '--purple-text')
          .replace(/--primary-rgb\b/g, '--primary-text-rgb');
        // A literal white foreground must follow a configurable filled brand color.
        // Semantic red/green/amber fills never enter this branch.
        if (primaryBackground) {
          if (/^(?:white|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i.test(after.trim()))
            after = 'var(--primary-on)';
          else {
            const translucentWhite = /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i.exec(after.trim());
            if (translucentWhite)
              after = 'color-mix(in srgb, var(--primary-on) ' + Number(translucentWhite[1]) * 100 + '%, transparent)';
          }
        }
      }
      if (before !== after) style.setProperty(property, after, style.getPropertyPriority(property));
    }
  }
  function rewriteRules(rules) {
    Array.from(rules).forEach((rule) => {
      if (rule.style) rewriteDeclaration(rule.style);
      if (rule.cssRules) rewriteRules(rule.cssRules);
    });
  }
  function adaptInlineStyles() {
    document.querySelectorAll('[style], [fill], [stroke], [stop-color]').forEach((element) => {
      const before = element.getAttribute('style') || '';
      if (inlineSeen.get(element) !== before) {
        rewriteDeclaration(element.style);
        inlineSeen.set(element, element.getAttribute('style') || '');
      }
      ['fill', 'stroke', 'stop-color'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value) return;
        const mapped = replaceBrand(value);
        if (mapped !== value) element.setAttribute(attribute, mapped);
      });
    });
  }
  function adaptStyles() {
    Array.from(document.styleSheets).forEach((sheet) => {
      if (sheet.href && sheet.href.includes('/web-adapter/')) return;
      try {
        const marker = sheet.ownerNode && sheet.ownerNode.textContent;
        if (sheetSeen.has(sheet) && sheetSeen.get(sheet) === marker) return;
        rewriteRules(sheet.cssRules);
        sheetSeen.set(sheet, marker);
      } catch (_) {
        /* External icon and font stylesheets are intentionally untouched. */
      }
    });
    adaptInlineStyles();
  }
  function addClass(element, name) {
    if (!element.classList.contains(name)) element.classList.add(name);
  }
  function adaptCards() {
    document
      .querySelectorAll(
        '.modal-overlay,.sheet-overlay,.bottom-sheet-overlay,.options-bottom-sheet-overlay,.payroll-approval-overlay,.history-detail-overlay,.project-modal-overlay,.resource-modal-overlay',
      )
      .forEach((overlay) => {
        addClass(overlay, 'web-viewport-dialog');
        const panel = Array.from(overlay.children).find(
          (child) => child.matches('div,section,article,form') && !child.matches('script,style'),
        );
        if (panel) addClass(panel, 'web-dialog-panel');
      });
    const candidates = document.querySelectorAll(
      '[id$="ListContainer"],[id$="List"],[id$="Records"],.history-list,.project-approval-list,.staff-list,.employee-list,.updates-list,.for-you-list',
    );
    candidates.forEach((container) => {
      if (container.closest('table') || /TABLE|TBODY|TR/.test(container.tagName)) return;
      const children = Array.from(container.children);
      const cards = children.filter((child) =>
        /(?:card|record-item|staff-item|employee-item|history-item)/.test(child.className || ''),
      );
      if (cards.length < 2) return;
      addClass(container, 'web-card-grid');
      children.forEach((child) => {
        if (!cards.includes(child)) addClass(child, 'web-span-all');
      });
    });
    document
      .querySelectorAll('.claim-form-stack, .form-card, .claim-form-card')
      .forEach((container) => {
        const fields = Array.from(container.children).filter((child) =>
          child.matches('.field-group,.claim-field,.form-group'),
        );
        if (fields.length < 3) return;
        addClass(container, 'web-form-grid');
        Array.from(container.children).forEach((child) => {
          if (
            !fields.includes(child) ||
            child.querySelector('textarea,input[type="file"],.project-upload-actions') ||
            child.matches('fieldset')
          )
            addClass(child, 'web-span-all');
        });
      });
    document.querySelectorAll('.main-content > .greeting-header-box').forEach((greeting) => {
      const container = greeting.parentElement;
      if (
        container.querySelector(
          '.insights-card,.insight-card,.insights-surface,.insights-container',
        )
      )
        addClass(container, 'web-home-grid');
    });
    document
      .querySelectorAll(
        '.summary-card,.work-shift-summary-card,.no-work-summary-card,.ot-plan-summary-card,.leave-summary-card',
      )
      .forEach((card) => {
        addClass(card, 'history-card-item');
        addClass(card, 'web-summary-card');
      });
  }
  // Keep the original cells in place: legacy detail dialogs update their values by ID.
  const submitDateLines = new Map();
  function adaptSubmitDates() {
    const current = new Set();
    function show(source, panel, raw, hideSource = true) {
      if (!panel) return;
      const text = raw.trim();
      const match = text.match(/^(?:[a-z]{3},?\s+)?(\d{1,2})[ /]([a-z]+|\d{1,2})[ /](\d{4})(.*)$/i);
      let formatted = '';
      if (match) {
        let [, day, month, year, suffix] = match;
        if (!/^\d+$/.test(month)) {
          const date = new Date(day + ' ' + month + ' ' + year + ' 12:00 UTC');
          if (Number.isNaN(date.getTime())) return;
          month = String(date.getUTCMonth() + 1);
        }
        formatted = day.padStart(2, '0') + '/' + month.padStart(2, '0') + '/' + year + suffix;
      } else if (!/^(?:[-–—]|not submitted)?$/i.test(text)) return;
      current.add(source);
      source.toggleAttribute('data-web-submit-source', hideSource);
      if (!formatted) {
        submitDateLines.get(source)?.remove();
        submitDateLines.set(source, null);
        return;
      }
      let line = submitDateLines.get(source);
      if (!line) {
        const tableRow = source.matches('tr');
        const definition = panel.matches('dl');
        line = document.createElement(tableRow ? 'tr' : definition ? 'div' : 'span');
        line.className = 'web-record-submit-date';
        const label = document.createElement(tableRow ? 'th' : definition ? 'dt' : 'span');
        const value = document.createElement(tableRow ? 'td' : definition ? 'dd' : 'strong');
        if (tableRow) label.scope = 'row';
        label.textContent = tableRow ? 'Submit Date:' : 'Submit Date';
        line.append(label, ' ', value);
        submitDateLines.set(source, line);
      }
      if (line.lastElementChild.textContent !== formatted) line.lastElementChild.textContent = formatted;
      if (line.localName === 'tr') {
        if (panel.firstElementChild !== line) panel.prepend(line);
      } else if (panel.lastElementChild !== line) {
        panel.append(line);
      }
    }
    const panels = '.history-card-details,.card-details-box,.payroll-approval-field-grid,.tax-relief-detail-table,.leave-highlight-detail-body';
    for (const label of document.querySelectorAll(
      '.history-card-row > :first-child,.history-card-details span:first-child,.attendance-history-fact dt,#myHistoryCardsList .card-details-box > div > span:first-child,' +
      'tr > :first-child,.payroll-approval-field > :first-child,.tax-relief-detail-row > :first-child,.leave-highlight-detail-label,.sheet-content div > span:first-child'
    )) {
      if (label.closest('.web-record-submit-date')) continue;
      const name = label.textContent.trim();
      if (name === 'Event Date' || name === window.PeopleHcmWebI18n?.t('Event Date')) {
        addClass(label.parentElement, 'web-record-event-date');
        continue;
      }
      if (!/^(?:submit date|submitted(?: date| on)?|submission date|提交日期)\s*[:：]?$/i.test(name)) continue;
      const value = label.nextElementSibling;
      const field = label.parentElement;
      const panel = field.matches('tr') ? field.parentElement : label.closest(panels) || field.parentElement;
      if (value) show(field, panel, value.textContent);
    }
    for (const source of document.querySelectorAll(
      '.payroll-approval-date,.approval-request-card span:has(>strong:only-child),.relief-card-body span:has(>strong:only-child),' +
      '.history-card-item div:not(:has(>*))'
    )) {
      if (source.closest('.web-record-submit-date') || source.parentElement.closest('.payroll-approval-date')) continue;
      const text = source.textContent.trim();
      const match = text.match(/^(?:submit date|submitted(?: date| on)?|提交日期)\s*[:=：]\s*(.+)$/i) ||
        (source.matches('.payroll-approval-date') && text.match(/^Request Date:\s*(.+)$/i));
      if (!match) continue;
      const field = source.previousElementSibling?.matches('i.fa-calendar-check') ? source.parentElement : source;
      const statusRow = source.closest('.payroll-approval-status-row') || (field !== source && field.parentElement);
      const panel = source.closest(panels) || statusRow?.nextElementSibling || source.closest('.history-card-item')?.querySelector(panels) || field.parentElement;
      show(field, panel, match[1]);
    }
    for (const note of document.querySelectorAll('#changeRequestHistoryList .change-history-date')) {
      const dated = note.textContent.trim().match(/^Submitted on (.+?)\s*•\s*(.+)$/i);
      const recent = note.textContent.trim().match(/^Submitted just now\s*\((.+)\)$/i);
      if (dated) {
        note.dataset.webSubmitDate = dated[1];
        note.textContent = dated[2];
      } else if (recent) {
        const id = note.closest('.change-history-item')?.querySelector('.change-history-id')?.textContent;
        try {
          const record = JSON.parse(localStorage.getItem('pq_change_request_history') || '[]').find(item => item.id === id);
          if (record?.submittedAt) {
            note.dataset.webSubmitDate = new Date(record.submittedAt).toLocaleDateString('en-GB');
            note.textContent = recent[1];
          }
        } catch { /* The original relative date stays visible when local history is unavailable. */ }
      }
      if (note.dataset.webSubmitDate) show(note, note, note.dataset.webSubmitDate, false);
    }
    for (const [source, line] of submitDateLines) {
      if (current.has(source)) continue;
      source.removeAttribute('data-web-submit-source');
      line?.remove();
      submitDateLines.delete(source);
    }
  }
  function adaptAttendanceDayTypes() {
    const panels = document.querySelectorAll('.attendance-record-card > .attendance-record-summary-panel, .staff-card-item > .attendance-record-summary-panel, .pending-feedback-record > .history-card-details');
    for (const panel of panels) {
      const first = panel.firstElementChild;
      if (!first || first.querySelector('[data-day-type]')) continue;
      const card = panel.parentElement;
      let dayType = individualDayType;
      if (card.matches('.staff-card-item')) {
        dayType = typeof masterStaffDataset === 'undefined' ? null : masterStaffDataset.find(item => item.cleanEmpNo === card.dataset.empNo)?.dayType;
      } else if (card.matches('.pending-feedback-record')) {
        dayType = typeof cardData === 'function' ? cardData(card).dayType : null;
      }
      const row = document.createElement('div');
      row.className = first.className;
      row.innerHTML = '<span>Day Type</span><strong data-day-type></strong>';
      row.lastElementChild.textContent = dayType || '–';
      panel.prepend(row);
    }
  }
  function adaptAttendanceSummaryButtons() {
    if (individualDetailsTrigger && individualDetailsOverlay.style.display === 'none') {
      individualDetailsTrigger.focus({ preventScroll: true });
      individualDetailsTrigger = null;
    }
    for (const panel of document.querySelectorAll(':is(.attendance-record-card, .staff-card-item) > div.attendance-record-summary-panel')) {
      const card = panel.parentElement;
      const header = card.querySelector('.attendance-card-details-trigger, .staff-card-details-trigger');
      const individual = card.matches('.attendance-record-card');
      const recordId = individual ? card.dataset.date : card.dataset.empNo;
      const summary = document.createElement('button');
      summary.type = 'button';
      summary.className = panel.className;
      header.id = 'attendance-header-' + recordId;
      summary.id = 'attendance-summary-' + recordId;
      summary.setAttribute('aria-labelledby', header.id + ' ' + summary.id);
      for (const trigger of [header, summary]) {
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', individual ? 'attendanceDetailsModalOverlay' : 'detailsModal');
      }
      for (const field of panel.children) {
        const row = document.createElement('span');
        row.className = field.className;
        row.append(...field.childNodes);
        summary.append(row);
      }
      panel.replaceWith(summary);
      summary.addEventListener('click', () => header.click());
      if (individual) {
        const [times, normalHours, otHours] = summary.querySelectorAll('.attendance-record-detail strong:not([data-day-type])');
        header.addEventListener('click', () => {
          individualDetailValues.get('Date').textContent = card.querySelector('.attendance-record-reference').textContent.replace(/^[^:：]*[:：]\s*/, '');
          individualDetailValues.get('Shift').textContent = card.querySelector('.history-time-row').textContent.trim();
          individualDetailValues.get('Clock Times').textContent = times.textContent;
          individualDetailValues.get('Normal Hours').textContent = normalHours.textContent;
          individualDetailValues.get('Unapproved OT Hours').textContent = card.dataset.exception === 'unapproved-ot' ? otHours.textContent : '0.00';
          individualDetailValues.get('Exception').textContent = card.querySelector('.attendance-exception-status').textContent.trim();
          individualDetailsTrigger = document.activeElement === summary ? summary : header;
          individualClose.focus({ preventScroll: true });
        });
      }
    }
  }
  function adaptEmployeeIds() {
    document
      .querySelectorAll(
        '[class*="employee-id"],[class*="staff-id"],[class*="emp-id"],[id$="EmpNo"]',
      )
      .forEach((id) => {
        if (id.closest('table') || id.matches('input,select,textarea') || id.children.length)
          return;
        const value = id.textContent.trim();
        if (!/^#?[a-z0-9][a-z0-9_-]{2,20}$/i.test(value)) return;
        if (!value.startsWith('#')) id.textContent = '#' + value;
        addClass(id, 'web-employee-id');
        const container = id.parentElement;
        const name =
          container &&
          container.querySelector(
            '[class*="employee-name"],[class*="staff-name"],[class*="person-name"]',
          );
        if (
          name &&
          name !== id &&
          !name.contains(id) &&
          name.parentElement === id.parentElement &&
          name.nextElementSibling !== id
        )
          name.insertAdjacentElement('afterend', id);
      });
  }
  function adaptChartButtons() {
    document.querySelectorAll('button,a').forEach((button) => {
      const label = [
        button.textContent,
        button.getAttribute('title'),
        button.getAttribute('aria-label'),
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
      const knownClass = /view-chart|chart-view|chart-pill/.test(button.className || '');
      if (!knownClass && !/\bView Chart\b|查看图表/i.test(label)) return;
      addClass(button, 'web-view-chart');
      let icon = button.querySelector('i');
      if (!icon) {
        icon = document.createElement('i');
        button.prepend(icon);
      }
      if (icon.className !== 'fa-solid fa-chart-pie') icon.className = 'fa-solid fa-chart-pie';
      icon.setAttribute('aria-hidden', 'true');
      if (
        !Array.from(button.childNodes).some(
          (node) => node.nodeType === 3 && node.textContent.trim(),
        ) &&
        !button.querySelector('span')
      ) {
        const span = document.createElement('span');
        span.textContent = 'View Chart';
        button.append(span);
      }
    });
  }
  function setActionLabel(button, label) {
    if (!button) return;
    const target = button.querySelector(':scope > span') || button;
    const current = target.textContent.trim();
    if (current === label || current === window.PeopleHcmWebI18n?.t(label)) return;
    // The source icon renderer can leave a separate text node for each letter.
    target.normalize();
    const text = Array.from(target.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (text) text.textContent = text.textContent.replace(text.textContent.trim(), label);
  }

  function adaptActionLabels() {
    const find = selector => document.querySelector(selector);
    const countIn = selector => Number.parseInt(find(selector)?.textContent, 10) || 0;
    const selected = (selector, action, count) => setActionLabel(find(selector), `${action} selected (${count})`);
    switch (location.pathname.split('/').pop()) {
      case 'attendance.html':
        selected('#attendanceUpdateBtn', 'Verify', document.querySelectorAll('.attendance-verify-button[aria-pressed="true"]').length);
        break;
      case 'staff-attendance.html':
        if (typeof masterStaffDataset !== 'undefined') {
          selected('#staffAttendanceUpdate', 'Verify', masterStaffDataset.filter(record => record.verified).length);
        }
        break;
      case 'shift-plan.html': {
        const count = countIn('#selectedCountText');
        const copying = find('#modeCopyDatesBtn')?.classList.contains('active');
        selected('#bottomMainActionBtn', copying ? 'Copy' : 'Review', count);
        selected('button[onclick="confirmApplyChanges()"]', 'Apply', count);
        selected('button[onclick="confirmReviewCopy()"]', 'Copy', count);
        break;
      }
      case 'ot-plan.html':
        selected('button[onclick="submitOtPlan()"]', 'Submit', countIn('#selectedCountAndHoursText'));
        break;
      case 'daily-ot-details.html': {
        const count = document.querySelectorAll('.daily-ot-void-checkbox:checked').length;
        setActionLabel(find('#dailyOtUpdate'), count ? `Void selected (${count})` : 'Save OT hours');
        break;
      }
      case 'pending-approval.html': {
        const count = countIn('#payrollPendingSelectedCount, #workplacePendingSelectedCount');
        document.querySelectorAll('#payrollPendingBulk [data-payroll-action], #workplacePendingBulk [data-approval-action]').forEach(button => {
          const action = button.dataset.payrollAction || button.dataset.approvalAction;
          setActionLabel(button, `${action[0].toUpperCase() + action.slice(1)} selected (${count})`);
        });
        break;
      }
      case 'leave.html': {
        const count = countIn('#floatingSelectedCountBadge');
        selected('#teamApprovalsFloatingBar [onclick="executeBatchReject()"]', 'Reject', count);
        selected('#teamApprovalsFloatingBar [onclick="executeBatchApprove()"]', 'Approve', count);
        break;
      }
      case 'team.html': {
        const approveAll = find('[onclick="window.ClaimsEngine.approveAllTeamClaims()"]');
        if (!approveAll) break;
        if (find('#teamApprovalsQueue:empty')) window.ClaimsEngine?.renderTeamQueue();
        const count = countIn('#teamPendingCountVal');
        setActionLabel(approveAll, `Approve all (${count})`);
        approveAll.disabled = count === 0;
        break;
      }
      case 'work-assignment.html':
        selected('#submitWorkAssignment', 'Assign', document.querySelectorAll('#workAssignmentAssigneeOptions input:checked').length);
        break;
      case 'prior-pay-data.html': {
        const save = find('#priorUpdate');
        if (!save?.querySelector('.fa-spinner')) setActionLabel(save, 'Save pay data');
        const help = find('#priorDialogText');
        if (help?.textContent.includes('Update on the final step')) {
          help.textContent = help.textContent.replace('Update on the final step saves all your changes.', 'Choose Save pay data on the final step to save your changes.');
        }
        break;
      }
    }
  }
  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function jumpToProfileSection(id, button, instant) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: instant || reducedMotion() ? 'auto' : 'smooth' });
    document.querySelectorAll('.me-jump-pill').forEach((pill) => {
      const selected = button ? pill === button : (pill.getAttribute('onclick') || '').includes(id);
      pill.classList.toggle('active', selected);
    });
  }
  function adaptNativeLayout() {
    const source = document.querySelector('.phone-container');
    if (!source) return;
    Array.from(source.children).forEach((element) => {
      if (!element.matches('header,.cal-top-header,.shift-top-header,.bonus-top-header,.project-header,.admin-header,.career-header,.employee-career-header,.payroll-header,.payroll-pending-header,.payroll-document-header,.leave-header,.claims-header,.app-header')) return;
      addClass(element, 'web-source-header');
      const chromeTitle = document.querySelector('.business-title h1');
      const sourceTitle = element.querySelector('h1');
      const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
      const duplicate = Boolean(sourceTitle && chromeTitle && normalize(sourceTitle.textContent) === normalize(chromeTitle.textContent));
      if (sourceTitle) sourceTitle.classList.toggle('native-duplicate-title', duplicate);
      const controls = Array.from(element.querySelectorAll('button,a[href],input,select,textarea,[onclick],[role="button"]'));
      const backOnly = controls.every((control) => {
        const description = [control.className,control.getAttribute('aria-label'),control.getAttribute('title'),control.getAttribute('onclick')].filter(Boolean).join(' ');
        return /(?:\bback\b|[-_]back(?:[-_]|\b)|history\.back\(|返回)/i.test(description);
      });
      const identity = element.querySelector('.me-emp-fullname,.employee-name,.staff-name,.web-employee-id,.me-emp-code,img');
      const textWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let extraText = false;
      for (let textNode = textWalker.nextNode(); textNode; textNode = textWalker.nextNode()) {
        if (!textNode.textContent.trim()) continue;
        const parent = textNode.parentElement;
        if (sourceTitle && sourceTitle.contains(textNode)) continue;
        if (parent && parent.closest('phone-status-bar,.status-bar,button,a,i,svg')) continue;
        extraText = true;
        break;
      }
      element.classList.toggle('native-redundant-header', duplicate && backOnly && !identity && !extraText);
    });
    const scrollers = document.querySelectorAll('.phone-container :is(.main-content,.admin-content,.project-task-content,.career-content,.payroll-pending-content,.payroll-document-main,.tax-relief-content,#priorMain),.native-business-content');
    scrollers.forEach((element) => {
      if (documentScrollers.has(element)) return;
      documentScrollers.add(element);
      // Preserve source scroll calls while the browser document owns vertical scrolling.
      Object.defineProperty(element, 'scrollTop', {
        configurable: true,
        get: () => window.scrollY,
        set: (top) => window.scrollTo({ top: Number(top) || 0, behavior: 'instant' }),
      });
      element.scrollTo = function (options, top) {
        if (typeof options === 'object') {
          window.scrollTo({ ...options, behavior: reducedMotion() ? 'instant' : options.behavior });
        } else window.scrollTo(Number(options) || 0, Number(top) || 0);
      };
    });
    if (!profileScrollAdapted && document.getElementById('meMainScroll') && typeof window.scrollToBento === 'function') {
      profileScrollAdapted = true;
      // The source formula assumes an inner scroller; native anchors use document geometry.
      window.scrollToBento = jumpToProfileSection;
      window.scrollToTop = function () {
        window.scrollTo({ top: 0, behavior: reducedMotion() ? 'instant' : 'smooth' });
        document.querySelectorAll('.me-jump-pill').forEach((pill, index) => pill.classList.toggle('active', index === 0));
      };
    }
  }
  window.addEventListener('scroll', () => {
    documentScrollers.forEach((element) => {
      if (element.isConnected) element.dispatchEvent(new Event('scroll'));
      else documentScrollers.delete(element);
    });
  }, { passive: true });
  function refresh() {
    pending = false;
    observer.disconnect();
    if (html.getAttribute('data-theme') !== preferences.theme.mode)
      html.setAttribute('data-theme', preferences.theme.mode);
    if (stylesPending) {
      adaptStyles();
      stylesPending = false;
    } else adaptInlineStyles();
    adaptCards();
    adaptAttendanceDayTypes();
    adaptAttendanceSummaryButtons();
    adaptSubmitDates();
    adaptEmployeeIds();
    adaptChartButtons();
    adaptActionLabels();
    adaptNativeLayout();
    if (sourceInitialized && window.PeopleHcmWebI18n)
      window.PeopleHcmWebI18n.translate(document.body);
    observe();
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(refresh);
  }
  document.addEventListener('change', event => {
    if (event.target.matches('.daily-ot-void-checkbox')) schedule();
  });
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.target === html && record.attributeName === 'data-theme') {
        if (html.getAttribute('data-theme') !== preferences.theme.mode) schedule();
      } else {
        if (record.target.closest && record.target.closest('head')) stylesPending = true;
        schedule();
      }
    }
  });
  function observe() {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'style',
        'class',
        'data-theme',
        'placeholder',
        'title',
        'aria-label',
        'fill',
        'stroke',
        'stop-color',
      ],
    });
  }
  let entryActionApplied = false;
  function applyEntryAction() {
    if (entryActionApplied) return;
    const query = new URLSearchParams(location.search),
      action = query.get('webAction');
    const section = query.get('webSection');
    const leaveViews = {
      'leave-apply': ['viewApplyLeave', 'individual'],
      'leave-history': ['viewMyLeaveHistory', 'individual'],
      'leave-team': ['viewLeaveHub', 'team'],
    };
    if (section && document.getElementById(section) && typeof window.showLeaveSection === 'function') {
      window.showLeaveSection(section, query.get('scope') === 'team' ? 'team' : 'individual');
      entryActionApplied = true;
    } else if (leaveViews[action] && typeof window.showLeaveSection === 'function') {
      window.showLeaveSection.apply(window, leaveViews[action]);
      entryActionApplied = true;
    } else if (
      action === 'leave-balance' &&
      typeof window.openAllLeaveBalancesDrawer === 'function'
    ) {
      window.openAllLeaveBalancesDrawer();
      entryActionApplied = true;
    } else if (action === 'indicators' && typeof window.openIndicatorsModal === 'function') {
      window.openIndicatorsModal(query.get('scope') === 'team' ? 'team' : 'my', true);
      entryActionApplied = true;
    } else if (action === 'notifications' && typeof window.openForYouModal === 'function') {
      window.openForYouModal();
      entryActionApplied = true;
    } else if (action === 'notifications' && typeof window.openNotifications === 'function') {
      window.openNotifications();
      entryActionApplied = true;
    } else if (action === 'updates' && typeof window.openUpdatesModal === 'function') {
      window.openUpdatesModal();
      entryActionApplied = true;
    } else if (action === 'profile-jd') {
      if (typeof window.openExecutiveFeatureModal === 'function') {
        window.openExecutiveFeatureModal('jd');
        entryActionApplied = true;
      } else if (typeof window.openJdModal === 'function') {
        window.openJdModal();
        entryActionApplied = true;
      }
    }
    const target = query.get('scroll');
    if (target && /^bento-[a-z-]+$/.test(target) && document.getElementById(target)) {
      if (typeof window.scrollToBento === 'function') window.scrollToBento(target, null, true);
      else document.getElementById(target).scrollIntoView({ block: 'start' });
      entryActionApplied = true;
    }
  }
  function finishInitialization() {
    if (!sourceInitialized) {
      sourceInitialized = true;
      applyPreferences(preferences, false);
    }
    adaptNativeLayout();
    applyEntryAction();
  }
  window.addEventListener('peoplehcm:preferences', (event) => {
    applyPreferences(event.detail, true);
  });
  window.addEventListener('peoplehcm:business-mounted', () => {
    adaptNativeLayout();
    const id = new URLSearchParams(location.search).get('scroll');
    if (id && /^bento-[a-z-]+$/.test(id)) jumpToProfileSection(id, null, true);
    schedule();
  });
  document.addEventListener(
    'click',
    (event) => {
      const anchor = event.target.closest && event.target.closest('a[href]');
      if (!anchor || anchor.hasAttribute('download')) return;
      let url;
      try {
        url = new URL(anchor.href, location.href);
      } catch (_) {
        return;
      }
      if (url.origin !== hostOrigin || !url.pathname.startsWith('/workspace/')) return;
      if (anchor.target === '_top' || anchor.target === '_parent') anchor.target = '_self';
    },
    true,
  );
  ['pushState', 'replaceState'].forEach((method) => {
    const original = history[method];
    history[method] = function () {
      const result = original.apply(this, arguments);
      announceNavigation();
      return result;
    };
  });
  window.addEventListener('popstate', announceNavigation);
  window.addEventListener('hashchange', announceNavigation);
  window.addEventListener('load', () => {
    stylesPending = true;
    setTimeout(() => {
      finishInitialization();
      // Claims initializes its default scope on load, after other source initializers.
      if (new URLSearchParams(location.search).get('scope') === 'team' && window.ClaimsEngine && typeof window.ClaimsEngine.switchClaimScope === 'function')
        window.ClaimsEngine.switchClaimScope('team');
    }, 0);
    schedule();
    announceNavigation();
    send('peoplehcm:ready', { path: route() });
  });
  // Some source initializers listen on window. A macrotask runs after the event
  // has bubbled through both document and window and every source initializer.
  document.addEventListener('DOMContentLoaded', () => setTimeout(finishInitialization, 0));
  document.addEventListener(
    'load',
    (event) => {
      if (event.target.tagName === 'LINK') {
        stylesPending = true;
        schedule();
      }
    },
    true,
  );
  try {
    const canonical = JSON.parse(localStorage.getItem('peoplehcm:web:preferences:v1') || 'null');
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (canonical)
      applyPreferences(
        { theme: { primary: canonical.primary, mode: canonical.mode }, locale: canonical.locale },
        false,
      );
    else if (saved) applyPreferences(saved, false);
  } catch (_) {
    /* Defaults are safe when old storage is malformed. */
  }
  applyPreferences(preferences, false);
  if (document.readyState === 'complete') setTimeout(finishInitialization, 0);
  observe();
  announceNavigation();
  send('peoplehcm:ready', { path: route() });
  window.PeopleHcmDesktop = Object.freeze({
    applyPreferences,
    refresh: schedule,
    getPreferences: () => JSON.parse(JSON.stringify(preferences)),
  });
})();
