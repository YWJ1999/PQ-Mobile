/* Give the archived business documents record routes while retaining their original data and actions. */
(() => {
  const path = location.pathname.split('/workspace/').pop();
  const attendance = ['.history-card-item', '#clockDetailsModal,#otDetailsModal,#feedbackDetailsModal'];
  const config = {
    'modules/admin/options/history.html': ['#workplaceHistoryList [data-record-id]', '#historyDetailsModal', '.history-card-main'],
    'modules/employee-career/options/history.html': ['#careerHistoryList [data-record-id]', '#historyDetailsModal'],
    'modules/payroll/options/history.html': ['#payrollHistoryList [data-reference]', '#historyDetailsModal', '.history-card-main'],
    'modules/payroll/options/tax-relief.html': ['.tax-relief-record-card', '#taxReliefDetailModal'],
    'modules/payroll/options/prior-pay-data.html': ['.prior-record', '#priorRecordDetails', '.prior-record-open'],
    'modules/project-task/options/history.html': ['.project-history-card', '#projectHistoryDetailOverlay'],
    'modules/claims/options/history.html': ['#claimHistoryListContainer .history-card-item', '#detailsModalOverlay'],
    'modules/attendance/options/history.html': attendance,
    'modules/attendance/options/clocking-history.html': attendance,
    'modules/attendance/options/feedback-history.html': ['.pending-feedback-record', '#attendanceDetailsModalOverlay', '.pending-feedback-details-trigger'],
    'modules/attendance/options/overtime.html': ['.ot-record-card', '#modal-ot-details'],
    'leave.html': ['#myHistoryCardsList .history-item-card', '#historyDetailsModalOverlay'],
    'salary-history.html': ['[onclick="openAuditLog()"]', '#historyAuditDialog'],
    'bonus-history.html': ['[onclick="openAuditLog()"]', '#historyAuditDialog'],
    'change-request.html': ['[onclick*="toggleHistoryModal(true)"]', '#historyOverlay']
  }[path];
  if (!config) return;
  const [cards, panels, trigger] = config;
  const tabs = '[data-history-kind],.me-jump-pill[data-tab],.hist-tab-btn,.project-history-tab,#histTabLeave,#histTabCredit,#histTabOffTime';
  const phone = document.querySelector('.phone-container');
  let active, pending, restoring = false, returning = false;
  const tabId = tab => tab && (tab.dataset.historyKind || tab.dataset.tab || tab.id);
  function key(card) {
    const data = card.dataset;
    return data.recordId || data.reference || data.record || data.ref || data.date ||
      card.getAttribute('onclick')?.match(/open(?:Clock|Ot|Feedback)DetailsModal\(\s*'([^']+)'/)?.[1] ||
      card.querySelector('.history-card-ref')?.textContent.trim().replace(/^Ref:\s*/i, '') ||
      data.status || 'log';
  }
  function route(tab, id) {
    return '#history/' + encodeURIComponent(tab || 'record') + '/' + encodeURIComponent(id);
  }
  function opened() {
    return [...document.querySelectorAll(panels)].find(node => !node.hidden &&
      node.getAttribute('aria-hidden') !== 'true' && getComputedStyle(node).display !== 'none' &&
      (node.getClientRects().length > 0) &&
      (!node.matches('.history-detail-overlay,.project-history-detail-overlay,.tax-relief-detail-overlay,.prior-overlay') ||
       node.matches('.is-open,.active,[aria-hidden="false"]')));
  }
  function exit() {
    if (!active) return;
    const { panel, close, heading, chrome, previousTitle, semantics } = active;
    selectChange(null);
    active = null;
    panel.classList.remove('web-history-page');
    phone.classList.remove('web-showing-history');
    chrome.remove();
    heading?.classList.remove('web-history-old-heading');
    for (const [node, attribute, value] of semantics) {
      if (value === null) node.removeAttribute(attribute);
      else node.setAttribute(attribute, value);
    }
    close?.click();
    document.title = previousTitle;
  }
  function back() {
    if (returning) return;
    if (history.state?.webHistoryReturn) { returning = true; history.back(); }
    else if (active?.change) {
      history.replaceState(null, '', route('record', 'log'));
      restore();
    }
    else {
      history.replaceState(null, '', location.href.split('#')[0]);
      exit();
    }
  }
  function selectChange(id) {
    if (active?.panel.id !== 'historyOverlay') return;
    const rows = [...active.panel.querySelectorAll('#changeRequestHistoryList .change-history-item')];
    const selected = rows.find(row => row.querySelector('.change-history-id')?.textContent.trim() === id);
    for (const row of rows) {
      row.classList.toggle('web-selected-change', row === selected);
    }
    active.panel.classList.toggle('web-change-details', Boolean(selected));
    active.change = selected;
    const name = active.chrome.querySelector('h1');
    name.textContent = selected ? 'CV Change Request Details' : active.heading.querySelector('h3').textContent;
    document.title = 'PeopleHCM - ' + name.textContent;
  }
  function display() {
    if (active || !pending) return;
    const panel = opened();
    if (!panel) return;
    const { tab, id } = pending;
    pending = null;
    const sheet = [...panel.children].find(node => node.matches('section,form,div'));
    const title = sheet?.querySelector('h1,h2,h3,.sheet-title');
    if (!title) return;
    let heading = title;
    while (heading.parentElement !== sheet) heading = heading.parentElement;
    const close = heading.querySelector('button') || sheet.querySelector('button');
    const chrome = document.createElement('header');
    chrome.className = 'web-history-heading';
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Back to history'; button.addEventListener('click', back);
    const name = document.createElement('h1');
    name.id = 'webHistoryPageTitle'; name.tabIndex = -1; name.textContent = title.textContent;
    chrome.append(button, name);
    const semantics = [panel, sheet].flatMap(node =>
      ['role', 'aria-modal', 'aria-labelledby'].map(attribute => [node, attribute, node.getAttribute(attribute)]));
    active = { panel, close, heading, chrome, previousTitle: document.title, semantics };
    heading.classList.add('web-history-old-heading');
    if (panel.parentElement !== phone) phone.append(panel);
    panel.prepend(chrome);
    panel.setAttribute('role', 'main');
    panel.setAttribute('aria-labelledby', name.id);
    for (const node of [panel, sheet]) {
      node.removeAttribute('aria-modal');
      if (node.getAttribute('role') === 'dialog') node.removeAttribute('role');
    }
    panel.classList.add('web-history-page');
    phone.classList.add('web-showing-history');
    document.title = 'PeopleHCM - ' + name.textContent;
    const hash = route(tab, id);
    if (path === 'change-request.html' && location.hash.startsWith('#history/change/')) {
      selectChange(id);
    } else if (location.hash !== hash) history.pushState({ ...history.state, webHistoryReturn: true }, '', hash);
    name.focus({ preventScroll: true });
  }
  function restore() {
    returning = false;
    const match = /^#history\/([^/]+)\/(.+)$/.exec(location.hash);
    if (!match) { pending = null; exit(); return; }
    if (restoring || pending) return;
    let tab, id;
    try { tab = decodeURIComponent(match[1]); id = decodeURIComponent(match[2]); } catch { return; }
    if (active) { selectChange(tab === 'change' ? id : null); return; }
    if (path === 'leave.html' && !document.querySelector(cards)) window.showLeaveSection('viewMyLeaveHistory');
    const selected = [...document.querySelectorAll(tabs)].find(node => tabId(node) === tab);
    restoring = true;
    if (selected && !selected.matches('.active,[aria-selected="true"]')) selected.click();
    const card = [...document.querySelectorAll(cards)].find(node =>
      (path === 'change-request.html' && tab === 'change') || key(node) === id);
    if (card) {
      pending = { tab, id };
      (trigger ? card.querySelector(trigger) : card)?.click();
      requestAnimationFrame(display);
    }
    restoring = false;
  }
  document.addEventListener('click', event => {
    const change = active?.panel.id === 'historyOverlay' && event.target.closest('#changeRequestHistoryList .change-history-item');
    if (change) {
      event.preventDefault();
      event.stopPropagation();
      if (active.change === change) return;
      const id = change.querySelector('.change-history-id')?.textContent.trim();
      if (id) {
        history.pushState({ ...history.state, webHistoryReturn: true }, '', route('change', id));
        selectChange(id);
        active.chrome.querySelector('h1').focus();
      }
      return;
    }
    if (active || restoring) return;
    const card = event.target.closest(cards);
    if (!card || event.target.closest('.history-card-actions,.project-history-card-actions,.prior-ytd')) return;
    const selected = [...document.querySelectorAll(tabs)].find(node => node.matches('.active,[aria-selected="true"]'));
    pending = { tab: tabId(selected) || 'record', id: key(card) };
    requestAnimationFrame(display);
  }, true);
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  const observer = new MutationObserver(() => {
    if (pending) display();
    else if (active && (!active.panel.isConnected || !opened())) back();
    else if (!active && location.hash.startsWith('#history/')) restore();
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden', 'style'] });
  if (document.readyState === 'complete') restore();
  else window.addEventListener('load', restore, { once: true });
})();
