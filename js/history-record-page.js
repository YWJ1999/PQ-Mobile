/* History records use the same full-page layout as approvals. The list stays mounted for Back. */
const HistoryRecordPage = (() => {
  let render, onLeave, page, currentHash, opener, listTitle;
  let goingBack = false;

  function href(kind, id) {
    return '#history/' + encodeURIComponent(kind) + '/' + encodeURIComponent(id);
  }

  function leave(restoreFocus) {
    if (!page) return;
    const phone = page.closest('.phone-container');
    page.hidden = true;
    phone.classList.remove('showing-history-record');
    document.title = listTitle;
    onLeave?.();
    page = null;
    if (restoreFocus) {
      const link = [...phone.querySelectorAll('[data-history-link]')].find(node =>
        node.getAttribute('href') === currentHash && node.getClientRects().length);
      const target = opener?.isConnected && opener.getClientRects().length ? opener : link;
      (target || phone.querySelector('main:not([hidden]) button, header a[href]'))?.focus({ preventScroll: true });
    }
    currentHash = null;
  }

  function sync() {
    goingBack = false;
    const hash = location.hash;
    if (page && hash === currentHash) return;
    const match = /^#history\/([^/]+)\/(.+)$/.exec(hash);
    if (!match) { leave(true); return; }
    let kind, id;
    try { kind = decodeURIComponent(match[1]); id = decodeURIComponent(match[2]); } catch { /* Invalid URL. */ }
    leave(false);
    const next = kind && id && render(kind, id);
    if (!next) {
      history.replaceState(null, '', location.href.split('#')[0]);
      return;
    }
    listTitle = document.title;
    page = next;
    currentHash = hash;
    page.closest('.phone-container').classList.add('showing-history-record');
    page.hidden = false;
    const heading = page.querySelector('.approval-page-heading h1');
    document.title = 'PeopleHCM - ' + heading.textContent;
    page.querySelector('.history-record-content').scrollTop = 0;
    heading.focus({ preventScroll: true });
  }

  function open(kind, id, trigger = document.activeElement) {
    const hash = href(kind, id);
    if (page && hash === currentHash) return;
    opener = trigger;
    history.pushState({ ...history.state, historyRecordReturn: true }, '', hash);
    sync();
  }

  function back() {
    if (!page || goingBack) return;
    if (history.state?.historyRecordReturn) {
      goingBack = true;
      history.back();
    } else {
      history.replaceState(null, '', page.dataset.historyParent || location.href.split('#')[0]);
      sync();
    }
  }

  function replace(kind, id) {
    if (!page) return;
    history.replaceState(history.state, '', href(kind, id));
    sync();
  }

  function register(renderRecord, leaveRecord) {
    render = renderRecord;
    onLeave = leaveRecord;
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.target.closest('[data-history-back]')) { event.preventDefault(); back(); return; }
      const link = event.target.closest('a[data-history-link]');
      if (!link) return;
      event.preventDefault();
      const [, kind, id] = link.hash.split('/');
      open(decodeURIComponent(kind), decodeURIComponent(id), link);
    });
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    sync();
  }

  return { href, open, replace, back, register, get active() { return Boolean(page); } };
})();
