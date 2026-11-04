/* Keep Admin option and return links in the currently selected theme. */
document.addEventListener('DOMContentLoaded', () => {
  const optionsOverlay = document.getElementById('workplaceOptionsOverlay');
  let optionsTrigger = null;
  let inertedOptionsBackground = [];

  function closeOptions() {
    if (!optionsOverlay || optionsOverlay.hidden) return;
    optionsOverlay.hidden = true;
    optionsOverlay.setAttribute('aria-hidden', 'true');
    inertedOptionsBackground.forEach(({ element, previous }) => { element.inert = previous; });
    inertedOptionsBackground = [];
    optionsTrigger.setAttribute('aria-expanded', 'false');
    optionsTrigger.focus({ preventScroll: true });
  }

  function initQuickOptions() {
    const list = document.getElementById('workplaceQuickOptions');
    if (!list || !optionsOverlay) return;
    const options = [...list.querySelectorAll('a.admin-option')];
    if (options.length <= 6) return;
    options.slice(5).forEach(option => { option.hidden = true; });
    optionsTrigger = document.createElement('button');
    optionsTrigger.type = 'button';
    optionsTrigger.className = 'admin-option';
    optionsTrigger.dataset.workplaceOptionsOpen = '';
    optionsTrigger.setAttribute('aria-haspopup', 'dialog');
    optionsTrigger.setAttribute('aria-controls', 'workplaceOptionsOverlay');
    optionsTrigger.setAttribute('aria-expanded', 'false');
    optionsTrigger.innerHTML = '<span class="admin-option-icon"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></span><span class="admin-option-title">View All</span>';
    optionsTrigger.addEventListener('click', () => {
      const grid = document.getElementById('workplaceAllOptions');
      grid.replaceChildren(...options.map(source => {
        const option = source.cloneNode(true);
        option.hidden = false;
        if (option.dataset.optionId) {
          option.dataset.optionRef = option.dataset.optionId;
          option.removeAttribute('data-option-id');
        }
        option.addEventListener('click', closeOptions);
        return option;
      }));
      optionsOverlay.hidden = false;
      optionsOverlay.setAttribute('aria-hidden', 'false');
      optionsTrigger.setAttribute('aria-expanded', 'true');
      grid.scrollTop = 0;
      inertedOptionsBackground = [...optionsOverlay.parentElement.children, document.querySelector('preview-top-bar')]
        .filter(element => element && element !== optionsOverlay)
        .map(element => ({ element, previous: element.inert }));
      inertedOptionsBackground.forEach(({ element }) => { element.inert = true; });
      document.getElementById('workplaceOptionsClose').focus({ preventScroll: true });
    });
    list.append(optionsTrigger);
    document.getElementById('workplaceOptionsClose').addEventListener('click', closeOptions);
    optionsOverlay.addEventListener('click', event => { if (event.target === optionsOverlay) closeOptions(); });
    document.addEventListener('keydown', event => {
      if (optionsOverlay.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeOptions(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...optionsOverlay.querySelectorAll('a[href], button')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  initQuickOptions();

  const scopeTabs = [...document.querySelectorAll('.workplace-scope-tab')];
  function setScope(scope, updateUrl = true) {
    closeOptions();
    const activeScope = scope === 'team' ? 'team' : 'individual';
    scopeTabs.forEach(tab => {
      const selected = tab.id === (activeScope === 'team' ? 'workplaceTabTeam' : 'workplaceTabIndividual');
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('scope', activeScope);
      url.searchParams.set('theme', getCurrentTheme());
      history.replaceState({}, '', url);
    }
  }
  scopeTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setScope(index === 1 ? 'team' : 'individual'));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
      setScope(target === 1 ? 'team' : 'individual');
      scopeTabs[target].focus();
    });
  });
  if (scopeTabs.length) setScope(new URLSearchParams(location.search).get('scope'), false);
  function updateAdminLinks() {
    document.querySelectorAll('a.admin-option, .team-pending-approval-action, [data-admin-back], [data-document-status]').forEach(link => {
      const url = new URL(link.href, window.location.href);
      url.searchParams.set('theme', getCurrentTheme());
      link.href = url.href;
    });
  }
  updateAdminLinks();
  function updateDocumentStatus() {
    if (!document.getElementById('workplaceDocumentStatus')) return;
    try {
      const totals = window.WorkplaceHistoryStore.counts();
      document.querySelectorAll('[data-document-status]').forEach(link => {
        const count = totals[link.dataset.documentStatus];
        link.querySelector('strong').textContent = count;
        link.setAttribute('aria-label', `${link.querySelector('span').textContent}: ${count} documents. Open History`);
      });
      document.getElementById('workplaceStatusError').hidden = true;
    } catch {
      document.querySelectorAll('[data-document-status] strong').forEach(count => { count.textContent = '—'; });
      document.getElementById('workplaceStatusError').textContent = 'Unable to read saved History.';
      document.getElementById('workplaceStatusError').hidden = false;
    }
  }
  updateDocumentStatus();
  window.addEventListener('pageshow', updateDocumentStatus);
  window.addEventListener('storage', updateDocumentStatus);
  function updatePendingApprovalCount() {
    const badge = document.getElementById('workplacePendingApprovalCount');
    const link = document.getElementById('workplacePendingApprovalLink');
    if (!badge || !link) return;
    try {
      const count = window.WorkplacePendingStore.getPending().length;
      badge.textContent = count;
      badge.removeAttribute('title');
      link.setAttribute('aria-label', `Pending Approval: ${count} request${count === 1 ? '' : 's'} awaiting review`);
    } catch {
      badge.textContent = '—';
      badge.title = 'Unable to load pending approvals';
      link.setAttribute('aria-label', 'Pending Approval: count unavailable. Open pending approvals');
    }
  }
  updatePendingApprovalCount();
  window.addEventListener('pageshow', updatePendingApprovalCount);
  window.addEventListener('storage', event => {
    if (event.key === 'peoplehcm:workplace:pending-approval:v1' || event.key === null) updatePendingApprovalCount();
  });
  new MutationObserver(updateAdminLinks).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
});
