(() => {
  const options = window.EMPLOYEE_CAREER_OPTIONS || { individual: [], team: [] };
  const expiryRecords = [
    { description: 'Driving license', type: 'License', category: 'Road transport', dueDays: -5381, expiry: '2012-01-18' },
    { description: 'Forklift operator license', type: 'License', category: 'Warehouse operations', dueDays: -5321, expiry: '2012-03-18' },
    { description: 'Six Sigma Black Belt', type: 'Exam', category: 'Quality management', dueDays: -3207, expiry: '2017-12-31' },
    { description: 'Pilot license', type: 'License', category: 'Aviation', dueDays: -2842, expiry: '2018-12-31' },
    { description: 'Firearm license', type: 'License', category: 'Firearms', dueDays: -2111, expiry: '2020-12-31' },
    { description: 'Typhoid vaccine booster', type: 'Event', category: 'Vaccination', dueDays: -1333, expiry: '2023-02-17' },
    { description: 'Passport expiry', type: 'Event', category: 'Travel documents', dueDays: -214, expiry: '2026-03-12' },
    { description: 'Contract expiry', type: 'Event', category: 'Employment', dueDays: -211, expiry: '2026-03-15' },
    { description: 'Medical checkup', type: 'Event', category: 'Health screening', dueDays: -205, expiry: '2026-03-21' },
    { description: 'Other membership', type: 'Membership', dueDays: 2911793, expiry: '9998-12-31' }
  ];
  const expiryIcons = {
    License: 'fa-id-card',
    Exam: 'fa-graduation-cap',
    Event: 'fa-calendar-days',
    Membership: 'fa-people-group'
  };
  const expiryDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  let activeScope = 'individual';
  let activeSheet = null;
  let returnFocus = null;
  let inertedElements = [];
  let sheetFocusTimer = null;
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const cardContents = item => `<span class="employee-career-option-icon ${item.tone}" aria-hidden="true"><i class="fa-solid ${item.icon}"></i></span><span class="employee-career-option-title">${item.title}</span>`;
  const cardMarkup = item => item.href
    ? `<a class="employee-career-option" href="${item.href}?theme=${theme()}" role="listitem" data-option-id="${item.id}">${cardContents(item)}</a>`
    : `<button type="button" class="employee-career-option" role="listitem" data-option-id="${item.id}" disabled>${cardContents(item)}</button>`;
  const viewAllMarkup = () => `<button type="button" class="employee-career-option" data-action="view-all" role="listitem"><span class="employee-career-option-icon view-all" aria-hidden="true"><i class="fa-solid fa-ellipsis"></i></span><span class="employee-career-option-title">View All</span></button>`;

  function render() {
    const grid = document.getElementById('employeeCareerOptions');
    const items = options[activeScope] || [];
    if (!grid) return;
    const documentStatus = document.getElementById('employeeCareerDocumentStatus');
    document.querySelectorAll('[data-career-scope="team"]').forEach(section => { section.hidden = activeScope !== 'team'; });
    const pending = document.getElementById('employeeCareerPendingApproval');
    if (pending) pending.href = `options/pending-approval.html?scope=team&theme=${theme()}`;
    const expiry = document.getElementById('employeeCareerExpiry');
    if (expiry) expiry.hidden = activeScope !== 'individual';
    if (documentStatus) {
      documentStatus.hidden = activeScope !== 'individual';
      documentStatus.querySelectorAll('[data-document-status]').forEach(link => {
        link.href = `options/history.html?theme=${theme()}`;
      });
    }
    grid.innerHTML = activeScope === 'team' ? items.slice(0, 5).map(cardMarkup).join('') + viewAllMarkup() : items.map(cardMarkup).join('');
  }

  function setScope(scope, updateUrl = true) {
    activeScope = scope === 'team' ? 'team' : 'individual';
    const individualTab = document.getElementById('employeeCareerTabIndividual');
    const teamTab = document.getElementById('employeeCareerTabTeam');
    const individualActive = activeScope === 'individual';
    individualTab?.classList.toggle('active', individualActive);
    teamTab?.classList.toggle('active', !individualActive);
    individualTab?.setAttribute('aria-selected', String(individualActive));
    teamTab?.setAttribute('aria-selected', String(!individualActive));
    if (individualTab) individualTab.tabIndex = individualActive ? 0 : -1;
    if (teamTab) teamTab.tabIndex = individualActive ? -1 : 0;
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('scope', activeScope);
      url.searchParams.set('theme', theme());
      history.replaceState({}, '', url);
    }
    render();
  }

  function openAllOptions() {
    const overlay = document.getElementById('employeeCareerAllOptions');
    const grid = document.getElementById('employeeCareerAllOptionsGrid');
    if (!overlay || !grid) return;
    grid.innerHTML = options.team.map(cardMarkup).join('');
    openSheet(overlay, document.activeElement);
  }

  function expiryGroup(days) {
    if (days < 0) return 'expired';
    if (days <= 7) return 'week';
    if (days <= 30) return 'month';
    return 'valid';
  }

  function renderExpiryCard({ type, category, description, expiry, dueDays }) {
    const card = document.getElementById('employeeCareerExpiryCard').content.firstElementChild.cloneNode(true);
    card.querySelector('i').classList.add(expiryIcons[type] || 'fa-file-lines');
    card.querySelector('h3').textContent = description;
    card.querySelector('.expiry-record-type').textContent = category ? `${type} · ${category}` : type;
    const date = card.querySelector('time');
    date.dateTime = expiry;
    date.textContent = expiryDateFormat.format(new Date(expiry));
    card.querySelector('.insight-detail-change-column dt').textContent = dueDays < 0 ? 'Days overdue' : 'Days until expiry';
    card.querySelector('.expiry-record-days').textContent = Math.abs(dueDays).toLocaleString('en-US');
    card.classList.toggle('is-overdue', dueDays < 0);
    return card;
  }

  function initExpiryOverview() {
    const overlay = document.getElementById('employeeCareerExpiryDetails');
    const buttons = document.querySelectorAll('#employeeCareerExpiry [data-expiry-group]');
    const cards = document.getElementById('employeeCareerExpiryCards');
    const recordCount = count => `${count} ${count === 1 ? 'record' : 'records'}`;
    for (const button of buttons) {
      const group = button.dataset.expiryGroup;
      const matching = expiryRecords.filter(record => expiryGroup(record.dueDays) === group);
      const count = matching.length;
      const label = button.querySelector('span').textContent;
      button.querySelector('strong').textContent = count;
      button.classList.toggle('is-current', group === 'expired');
      button.classList.toggle('is-empty', count === 0);
      button.setAttribute('aria-label', `${label}, ${recordCount(count)}`);
      button.addEventListener('click', () => {
        for (const tab of buttons) tab.classList.toggle('is-current', tab === button);
        cards.replaceChildren(...matching.map(renderExpiryCard));
        cards.hidden = count === 0;
        cards.scrollTop = 0;
        overlay.querySelector('.employee-career-expiry-empty').hidden = count > 0;
        document.getElementById('employeeCareerExpiryDetailTitle').textContent = label;
        document.getElementById('employeeCareerExpiryDetailCount').textContent = `Expiry overview · ${recordCount(count)}`;
        openSheet(overlay, button);
      });
    }
  }

  function openSheet(overlay, trigger) {
    if (activeSheet) return;
    returnFocus = trigger;
    activeSheet = overlay;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('.employee-career-sheet').scrollTop = 0;
    inertedElements = Array.from(overlay.parentElement?.children || []).filter(element => element !== overlay && !element.inert);
    inertedElements.forEach(element => { element.inert = true; });
    clearTimeout(sheetFocusTimer);
    sheetFocusTimer = setTimeout(() => {
      if (activeSheet === overlay) overlay.querySelector('.employee-career-sheet-close').focus({ preventScroll: true });
    }, 250);
  }

  function closeSheet() {
    const overlay = activeSheet;
    if (!overlay) return;
    activeSheet = null;
    overlay.classList.remove('active');
    clearTimeout(sheetFocusTimer);
    sheetFocusTimer = null;
    inertedElements.forEach(element => { element.inert = false; });
    inertedElements = [];
    if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
    overlay.setAttribute('aria-hidden', 'true');
  }

  function closeAllOptions() {
    if (activeSheet?.id === 'employeeCareerAllOptions') closeSheet();
  }

  function keepFocusInSheet(event) {
    const overlay = activeSheet;
    if (event.key !== 'Tab' || !overlay) return;
    const focusable = Array.from(overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(node => node.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function init() {
    const requestedTheme = new URLSearchParams(location.search).get('theme');
    if (requestedTheme === 'light' || requestedTheme === 'dark') document.documentElement.dataset.theme = requestedTheme;
    const back = document.getElementById('employeeCareerBack');
    if (back) back.href = `../../app${theme()}.html`;
    document.getElementById('employeeCareerTabIndividual')?.addEventListener('click', () => setScope('individual'));
    document.getElementById('employeeCareerTabTeam')?.addEventListener('click', () => setScope('team'));
    document.getElementById('employeeCareerOptions')?.addEventListener('click', event => { if (event.target.closest('[data-action="view-all"]')) openAllOptions(); });
    initExpiryOverview();
    document.querySelectorAll('.employee-career-sheet-overlay').forEach(overlay => {
      overlay.querySelector('.employee-career-sheet-close').addEventListener('click', closeSheet);
      overlay.addEventListener('click', event => { if (event.target === overlay) closeSheet(); });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSheet();
      keepFocusInSheet(event);
    });
    setScope(new URLSearchParams(location.search).get('scope'), false);
  }

  window.EmployeeCareerApp = { setScope, openAllOptions, closeAllOptions };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
