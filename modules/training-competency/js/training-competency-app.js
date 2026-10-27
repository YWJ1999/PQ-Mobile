(() => {
  const tabs = [
    document.getElementById('trainingCompetencyTabIndividual'),
    document.getElementById('trainingCompetencyTabTeam')
  ];
  const panels = [
    document.getElementById('trainingCompetencyIndividualPanel'),
    document.getElementById('trainingCompetencyTeamPanel')
  ];
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const optionsOverlay = document.getElementById('trainingCompetencyOptionsOverlay');
  let optionsTrigger = null;
  let inertedOptionsBackground = [];

  function syncBackLink() {
    document.getElementById('trainingCompetencyBack').href = `../../app${theme()}.html`;
    document.querySelector('[data-option-id="competency"]').href = `options/competency.html?theme=${theme()}`;
    document.querySelector('[data-option-id="course-catalog"]').href = `options/course-catalog.html?theme=${theme()}`;
    document.querySelector('[data-option-id="training-need"]').href = `options/training-need.html?theme=${theme()}`;
    document.querySelector('[data-option-id="learning-development-plan"]').href = `options/learning-development-plan.html?theme=${theme()}`;
    document.querySelector('[data-option-id="training-plan"]').href = `options/training-plan.html?theme=${theme()}`;
    document.querySelector('[data-option-id="training-clocking"]').href = `options/training-clocking.html?theme=${theme()}`;
    document.querySelector('[data-option-id="staff-competency"]').href = `options/staff-competency.html?theme=${theme()}`;
    document.querySelector('[data-option-id="competency-summary"]').href = `options/competency-summary.html?theme=${theme()}`;
    document.querySelector('[data-option-id="skill-expiry"]').href = `options/skill-expiry.html?theme=${theme()}`;
    document.querySelector('[data-option-id="staff-tna"]').href = `options/staff-tna.html?theme=${theme()}`;
    document.querySelector('[data-option-id="staff-learning-development-plan"]').href = `options/staff-learning-development-plan.html?theme=${theme()}`;
    document.querySelector('[data-option-id="training-feedback"]').href = `options/training-feedback.html?theme=${theme()}`;
    document.querySelector('[data-option-id="training-highlight"]').href = `options/training-highlight.html?theme=${theme()}`;
    document.querySelectorAll('[data-option-ref][href]').forEach(link => {
      link.href = document.querySelector(`[data-option-id="${link.dataset.optionRef}"]`).href;
    });
  }

  function closeOptions() {
    if (optionsOverlay.hidden) return;
    optionsOverlay.hidden = true;
    optionsOverlay.setAttribute('aria-hidden', 'true');
    inertedOptionsBackground.forEach(({ element, previous }) => { element.inert = previous; });
    inertedOptionsBackground = [];
    optionsTrigger?.setAttribute('aria-expanded', 'false');
    if (optionsTrigger?.isConnected) optionsTrigger.focus({ preventScroll: true });
    optionsTrigger = null;
  }

  function openOptions(list, trigger) {
    const items = [...list.querySelectorAll('[data-option-id]')].map(source => {
      const item = document.createElement('li');
      const option = source.cloneNode(true);
      option.dataset.optionRef = source.dataset.optionId;
      option.removeAttribute('data-option-id');
      if (source.tagName === 'BUTTON') option.addEventListener('click', () => { closeOptions(); source.click(); });
      else option.addEventListener('click', closeOptions);
      item.append(option);
      return item;
    });
    document.getElementById('trainingCompetencyAllOptions').replaceChildren(...items);
    optionsTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    optionsOverlay.hidden = false;
    optionsOverlay.setAttribute('aria-hidden', 'false');
    document.getElementById('trainingCompetencyAllOptions').scrollTop = 0;
    inertedOptionsBackground = [...optionsOverlay.parentElement.children, document.querySelector('preview-top-bar')]
      .filter(element => element && element !== optionsOverlay)
      .map(element => ({ element, previous: element.inert }));
    inertedOptionsBackground.forEach(({ element }) => { element.inert = true; });
    document.getElementById('trainingCompetencyOptionsClose').focus({ preventScroll: true });
  }

  function initQuickOptions() {
    ['trainingCompetencyIndividualOptions'].forEach(id => {
      const list = document.getElementById(id);
      const items = [...list.children];
      if (items.length <= 5) return;
      items.slice(5).forEach(item => { item.hidden = true; });
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'training-competency-option';
      button.dataset.viewAll = id;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'trainingCompetencyOptionsOverlay');
      button.setAttribute('aria-expanded', 'false');
      const iconWrap = document.createElement('span');
      iconWrap.className = 'training-competency-option-icon';
      iconWrap.setAttribute('aria-hidden', 'true');
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-ellipsis';
      iconWrap.append(icon);
      const label = document.createElement('span');
      label.className = 'training-competency-option-title';
      label.textContent = 'View All';
      button.append(iconWrap, label);
      button.addEventListener('click', () => openOptions(list, button));
      item.append(button);
      list.append(item);
    });
  }

  function setScope(scope, updateUrl = true) {
    closeOptions();
    const activeIndex = scope === 'team' ? 1 : 0;
    tabs.forEach((tab, index) => {
      const active = index === activeIndex;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });

    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('scope', activeIndex === 1 ? 'team' : 'individual');
      url.searchParams.set('theme', theme());
      history.replaceState(null, '', url);
    }
    document.dispatchEvent(new CustomEvent('training:scopechange', { detail: activeIndex === 1 ? 'team' : 'individual' }));
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setScope(index === 1 ? 'team' : 'individual'));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
      setScope(nextIndex === 1 ? 'team' : 'individual');
      tabs[nextIndex].focus();
    });
  });

  document.querySelectorAll('button[data-option-id]').forEach(button => {
    if (button.dataset.optionId === 'training-calendar') {
      button.addEventListener('click', () => {
        const section = document.getElementById('trainingCalendarSection');
        section.dispatchEvent(new Event('training:showcalendar'));
      });
      return;
    }
    button.addEventListener('click', () => {
      const title = button.querySelector('.training-competency-option-title').textContent.trim();
      showToast(`${title} is coming soon`);
    });
  });

  document.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => showToast('Training history is coming soon'));
  });

  document.getElementById('trainingCompetencyOptionsClose').addEventListener('click', closeOptions);
  optionsOverlay.addEventListener('click', event => { if (event.target === optionsOverlay) closeOptions(); });
  document.addEventListener('keydown', event => {
    if (optionsOverlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeOptions(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...optionsOverlay.querySelectorAll('a,button')].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  window.addEventListener('popstate', () => setScope(new URLSearchParams(location.search).get('scope'), false));
  new MutationObserver(syncBackLink).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('DOMContentLoaded', () => {
    setScope(new URLSearchParams(location.search).get('scope'), false);
    syncBackLink();
    initQuickOptions();
  });
})();
