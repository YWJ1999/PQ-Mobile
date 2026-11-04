(() => {
  const options = window.EMPLOYEE_CAREER_OPTIONS || { individual: [], team: [] };
  let activeScope = 'individual';
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
    returnFocus = document.activeElement;
    grid.innerHTML = options.team.map(cardMarkup).join('');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    inertedElements = Array.from(overlay.parentElement?.children || []).filter(element => element !== overlay && !element.inert);
    inertedElements.forEach(element => { element.inert = true; });
    clearTimeout(sheetFocusTimer);
    sheetFocusTimer = setTimeout(() => {
      if (overlay.classList.contains('active')) document.getElementById('employeeCareerCloseAll')?.focus({ preventScroll: true });
    }, 250);
  }

  function closeAllOptions() {
    const overlay = document.getElementById('employeeCareerAllOptions');
    if (!overlay || !overlay.classList.contains('active')) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    clearTimeout(sheetFocusTimer);
    sheetFocusTimer = null;
    inertedElements.forEach(element => { element.inert = false; });
    inertedElements = [];
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
    returnFocus = null;
  }

  function keepFocusInSheet(event) {
    const overlay = document.getElementById('employeeCareerAllOptions');
    if (event.key !== 'Tab' || !overlay?.classList.contains('active')) return;
    const focusable = Array.from(overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
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
    document.getElementById('employeeCareerCloseAll')?.addEventListener('click', closeAllOptions);
    document.getElementById('employeeCareerAllOptions')?.addEventListener('click', event => { if (event.target.id === 'employeeCareerAllOptions') closeAllOptions(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeAllOptions();
      keepFocusInSheet(event);
    });
    setScope(new URLSearchParams(location.search).get('scope'), false);
  }

  window.EmployeeCareerApp = { setScope, openAllOptions, closeAllOptions };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
