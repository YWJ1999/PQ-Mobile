/* Record routes share the list document so its filters, selection and scroll survive Back. */
const PendingApprovalPage = (() => {
  let config;
  let page;
  let opener;
  let listTitle;
  let returning = false;

  function href(view, id) {
    return '#approval/' + view + '/' + encodeURIComponent(id);
  }

  function link(id, content) {
    const anchor = document.createElement('a');
    anchor.href = href('details', id);
    anchor.className = 'approval-record-link';
    if (content) anchor.append(content);
    return anchor;
  }

  function hidePage() {
    if (!page) return;
    config.onLeave?.();
    page.hidden = true;
    page.closest('.phone-container').classList.remove('showing-approval-record');
    document.title = listTitle;
    page = null;
    document.dispatchEvent(new Event('approval-list-return'));
    const target = opener?.isConnected && opener.getClientRects().length
      ? opener
      : [...document.querySelectorAll('.approval-record-link, .filter-pill.active')].find(element => element.getClientRects().length);
    target?.focus({ preventScroll: true });
  }

  function showRoute() {
    returning = false;
    hidePage();
    const match = /^#approval\/(details|workflow)\/(.+)$/.exec(location.hash);
    if (!match) return;
    const view = match[1];
    let id;
    try { id = decodeURIComponent(match[2]); } catch { /* Invalid record URL. */ }
    if (!id || !config.render(view, id)) {
      history.replaceState(null, '', location.href.split('#')[0]);
      return;
    }
    page = document.querySelector('[data-approval-view="' + view + '"]');
    page.closest('.phone-container').classList.add('showing-approval-record');
    page.hidden = false;
    const title = page.querySelector('h1');
    document.title = 'PeopleHCM - ' + title.textContent;
    page.querySelectorAll('.approval-record-layout, .approval-record-layout > div').forEach(element => { element.scrollTop = 0; });
    title.focus({ preventScroll: true });
  }

  function open(view, id, trigger) {
    if (id == null) return;
    const hash = href(view, id);
    if (page && location.hash === hash) return;
    opener = trigger || document.activeElement;
    history.pushState({ approvalReturn: true }, '', hash);
    showRoute();
  }

  function back() {
    if (!page || returning) return;
    if (history.state?.approvalReturn) {
      returning = true;
      history.back();
    } else {
      history.replaceState(null, '', location.href.split('#')[0]);
      hidePage();
    }
  }

  function register(options) {
    config = options;
    listTitle = document.title;
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.target.closest('[data-approval-back]')) { back(); return; }
      const card = event.target.closest('[data-approval-id]');
      if (!card) return;
      const link = event.target.closest('.approval-record-link');
      if (!link && event.target.closest('button, a, input, label, select, textarea, [role="button"]')) return;
      event.preventDefault();
      open('details', card.dataset.approvalId, link || card.querySelector('.approval-record-link, button'));
    });
    window.addEventListener('popstate', showRoute);
    showRoute();
  }

  return { register, href, link, open, back, get active() { return Boolean(page); } };
})();
