(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = window.TRAINING_EXPIRED_COMPETENCY_DATA || { definitions: [], records: [] };
  const overlay = $('trainingExpiredOverlay');
  let selectedSkill = '', selectedLevel = '', returnSkill = '', returnScroll = 0, inerted = [];
  let ready = false;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const noun = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
  const levelLabel = level => level === 'unrated' ? 'Unrated' : `Level ${level}`;
  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  function renderSummary(summary) {
    $('trainingExpiredTotal').textContent = summary.totalRecords;
    $('trainingExpiredSummaryNote').textContent = `${noun(summary.totalEmployees, 'employee')} · ${noun(summary.groups.length, 'competency', 'competencies')}`;
    const rows = summary.groups.map(group => {
      const row = node('button', 'tec-summary-row');
      row.type = 'button'; row.dataset.expiredCompetency = group.competency;
      row.setAttribute('aria-haspopup', 'dialog'); row.setAttribute('aria-controls', 'trainingExpiredDetail');
      row.setAttribute('aria-expanded', String(selectedSkill === group.competency));
      row.setAttribute('aria-label', `${group.title}, ${noun(group.count, 'expired record')}, ${noun(group.levelCount, 'level')} affected. View employees.`);
      const copy = node('div');
      copy.append(node('strong', '', group.title), node('small', '', `${noun(group.levelCount, 'level')} affected`));
      row.append(copy, node('span', 'tec-row-count', group.count));
      return row;
    });
    $('trainingExpiredSummaryRows').replaceChildren(...(rows.length ? rows : [node('p', 'tec-empty', 'No expired competencies. All recorded expiries are up to date.')]));
  }
  function employeeCard(record) {
    const card = node('article', 'history-card-item claim-summary-card tec-employee-card');
    card.dataset.expiredEmployee = record.empNo;
    const heading = node('header', 'claim-summary-card-head tec-employee-header'), identity = node('div');
    identity.append(node('h3', 'claim-summary-card-title tec-employee-name', employeeCardHeading.text(record.empNo, record.name || 'Employee name unavailable')));
    heading.append(identity);
    const body = node('div', 'claim-summary-card-body');
    const fields = node('dl', 'claim-summary-stat-grid tec-employee-fields');
    [['Department', record.department], ['Position', record.position], ['Level', levelLabel(record.level)]].forEach(([label, value]) => {
      const row = node('div', 'claim-summary-stat'); row.append(node('dt', 'claim-summary-stat-label', label), node('dd', 'claim-summary-stat-value', value || '—')); fields.append(row);
    });
    const expiry = node('div', 'claim-summary-stat'); expiry.append(node('dt', 'claim-summary-stat-label', 'Expiry'));
    const date = node('time', '', new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${record.expiry}T00:00:00`)));
    date.dateTime = record.expiry;
    const expiryValue = node('dd', 'claim-summary-stat-value'); expiryValue.append(date); expiry.append(expiryValue); fields.append(expiry);
    const footer = node('footer', 'tec-expiry-footer'); footer.append(node('span', '', 'Expired'), node('span', 'tec-overdue', `${noun(record.overdueDays, 'day')} overdue`));
    body.append(fields, footer); card.append(heading, body);
    return card;
  }
  function renderDetail(summary, skillId, selectedLevel) {
    const definition = source.definitions.find(skill => skill.id === skillId);
    const group = summary.groups.find(item => item.competency === skillId);
    const records = group?.records || [];
    const rows = selectedLevel === '' ? records : records.filter(record => String(record.level) === selectedLevel);
    $('trainingExpiredDetailTitle').textContent = definition?.title || 'Competency unavailable';
    const levels = [...(group?.levels || [])];
    // A direct link to a currently empty level still shows which filter is active.
    if (selectedLevel && !levels.some(item => String(item.level) === selectedLevel)) levels.push({ level: selectedLevel, count: 0 });
    const chips = [{ level: '', count: records.length }, ...levels].map(item => {
      const link = node('button', 'tec-level'); link.type = 'button';
      link.dataset.expiredLevel = item.level === '' ? 'all' : item.level;
      link.setAttribute('aria-label', `${item.level === '' ? 'All levels' : levelLabel(item.level)}, ${noun(item.count, 'expired record')}`);
      if (String(item.level) === selectedLevel) link.setAttribute('aria-current', 'true');
      link.append(node('span', '', item.level === '' ? 'All' : levelLabel(item.level)), node('strong', '', item.count));
      return link;
    });
    $('trainingExpiredLevels').replaceChildren(...(definition ? chips : []));
    $('trainingExpiredEmployees').replaceChildren(...(rows.length ? rows.map(employeeCard)
      : [node('p', 'tec-empty', definition ? 'No expired records for this level. Select All to view every expired record for this competency.' : 'This competency is unavailable. Close this window to return to Training & Competency.')]));
  }
  function render() {
    if (!ready) return;
    const focusedSkill = document.activeElement?.dataset.expiredCompetency, focusedLevel = document.activeElement?.dataset.expiredLevel;
    const summary = window.TrainingExpiredCompetencies.summarize(source.definitions, source.records, today());
    renderSummary(summary);
    if (selectedSkill) renderDetail(summary, selectedSkill, selectedLevel);
    if (focusedLevel !== undefined && selectedSkill) levelButtons().find(button => button.dataset.expiredLevel === focusedLevel)?.focus({ preventScroll: true });
    else if (focusedSkill && !selectedSkill) summaryButtons().find(button => button.dataset.expiredCompetency === focusedSkill)?.focus({ preventScroll: true });
  }
  const summaryButtons = () => [...$('trainingExpiredSummaryRows').querySelectorAll('[data-expired-competency]')];
  const levelButtons = () => [...$('trainingExpiredLevels').querySelectorAll('[data-expired-level]')];
  function openPopup(skill, level = '') {
    if (!selectedSkill) {
      returnSkill = skill; returnScroll = document.querySelector('main').scrollTop;
      inerted = [...overlay.parentElement.children, document.querySelector('preview-top-bar')].filter(element => element && element !== overlay)
        .map(element => ({ element, previous: element.inert }));
      inerted.forEach(({ element }) => { element.inert = true; });
    }
    selectedSkill = skill; selectedLevel = level;
    overlay.hidden = false; overlay.setAttribute('aria-hidden', 'false');
    render(); overlay.querySelector('.tec-modal-scroll').scrollTop = 0;
    $('trainingExpiredClose').focus({ preventScroll: true });
  }
  function closePopup(focus = true) {
    if (overlay.hidden) return;
    selectedSkill = ''; selectedLevel = ''; overlay.hidden = true; overlay.setAttribute('aria-hidden', 'true');
    inerted.forEach(({ element, previous }) => { element.inert = previous; }); inerted = [];
    summaryButtons().forEach(button => button.setAttribute('aria-expanded', 'false'));
    const url = new URL(location.href);
    if (url.searchParams.has('expiredSkill') || url.searchParams.has('expiredLevel')) {
      url.searchParams.delete('expiredSkill'); url.searchParams.delete('expiredLevel'); history.replaceState(null, '', url);
    }
    document.querySelector('main').scrollTop = returnScroll;
    const trigger = summaryButtons().find(button => button.dataset.expiredCompetency === returnSkill);
    if (focus) (trigger?.getClientRects().length ? trigger : document.querySelector('.training-competency-scope-tab[aria-selected="true"]'))?.focus({ preventScroll: true });
  }
  $('trainingExpiredSummaryRows').addEventListener('click', event => {
    const button = event.target.closest('[data-expired-competency]'); if (button) openPopup(button.dataset.expiredCompetency);
  });
  $('trainingExpiredLevels').addEventListener('click', event => {
    const button = event.target.closest('[data-expired-level]'); if (!button) return;
    const value = button.dataset.expiredLevel; selectedLevel = value === 'all' ? '' : value; render();
    levelButtons().find(control => control.dataset.expiredLevel === value)?.focus({ preventScroll: true });
  });
  $('trainingExpiredClose').addEventListener('click', () => closePopup());
  overlay.addEventListener('click', event => { if (event.target === overlay) closePopup(); });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closePopup(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...$('trainingExpiredDetail').querySelectorAll('button,a,[tabindex="0"]')].filter(control => !control.disabled && control.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  });
  document.addEventListener('training:scopechange', () => { closePopup(false); render(); });
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  function recoverLegacyReturn() {
    // Old return links used a fragment that scrolled the overflow-hidden phone
    // frame as well as its content, displacing the header and absolute nav.
    if (location.hash === '#trainingExpiredCompetencies') {
      const url = new URL(location.href); url.hash = '';
      history.replaceState(null, '', url);
      document.querySelector('.phone-container').scrollTop = 0;
      document.querySelector('main').scrollTop = 0;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    ready = true; render(); recoverLegacyReturn();
    const params = new URLSearchParams(location.search), skill = params.get('expiredSkill'), rawLevel = params.get('expiredLevel') || '';
    if (skill && $('trainingCompetencyTabTeam').getAttribute('aria-selected') === 'true') openPopup(skill, /^(?:[0-5]|unrated)$/.test(rawLevel) ? rawLevel : '');
  });
  window.addEventListener('hashchange', recoverLegacyReturn);
  // Recompute elapsed days when returning to a tab or a restored browser page.
  window.addEventListener('pageshow', event => { if (event.persisted) render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();
