/* Record keys belong to the active workflow, independently of its filtered records. */
(() => {
  const headers = [
    '.history-card-item .history-card-header', '.history-card-item .summary-history-card-header',
    '.history-item-card .record-card-header', '.project-history-card .project-history-card-top',
    '.approval-record-header', '.payroll-approval-card-header', '.project-approval-card-banner'
  ].join(',');
  const badges = [
    '.card-status-badge', '.status-pill', '.project-history-status-badge', '.clocking-status-badge',
    '.approval-header-status', '.approval-status-badge', '.payroll-approval-status', '.project-approval-status'
  ].join(',');
  let dialog;

  function showLegend(content) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'record-key-dialog';
      dialog.id = 'recordColourLegend';
      dialog.setAttribute('aria-labelledby', 'recordKeyTitle');
      dialog.innerHTML = `<header><h2 id="recordKeyTitle">Info</h2>
        <form method="dialog"><button type="submit" class="record-key-close" aria-label="Close Info" autofocus></button></form></header>
        <div class="record-key-body"></div>`;
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
      });
      document.body.append(dialog);
    }
    dialog.querySelector('.record-key-body').replaceChildren(content);
    if (!dialog.open) dialog.showModal();
  }

  function* visibleEntries(view) {
    for (const header of view.querySelectorAll(headers)) {
      if (!header.getClientRects().length || header.closest('dialog, [role="dialog"], [hidden], [aria-hidden="true"]')) continue;
      // A rate band or a clocking label can have a more useful key than the individual value.
      const source = header.querySelector('[data-record-key-label]') || header.querySelector(badges);
      const label = header.dataset.recordKeyLabel || source?.dataset.recordKeyLabel || source?.textContent || view.dataset.recordKeyLabel;
      if (label?.trim()) yield { header, label: label.trim().replace(/\s+/g, ' ') };
    }
  }

  function appendEntries(content, view) {
    const list = document.createElement('ul');
    list.className = 'record-key-list record-key-headers';
    const seen = new Set();
    for (const { header, label } of visibleEntries(view)) {
      const style = getComputedStyle(header);
      const fill = style.backgroundImage === 'none' ? style.backgroundColor : style.backgroundImage;
      const key = JSON.stringify([label, fill]);
      if (seen.has(key)) continue;
      seen.add(key);
      const swatch = document.createElement('span');
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.background = fill;
      const row = document.createElement('li');
      row.append(swatch, label);
      list.append(row);
    }
    if (list.childElementCount) {
      const title = document.createElement('h3');
      title.textContent = view.dataset.recordColourView || 'Status';
      content.append(title, list);
    }
  }

  function appendWorkflowKey(content, view) {
    const definition = view.dataset.recordLegend;
    const entries = definition.startsWith('#')
      ? [...document.getElementById(definition.slice(1)).options]
        .filter(option => option.value && option.value !== 'all').map(option => [option.label, option.value])
      : Object.entries(JSON.parse(definition));
    const title = document.createElement('h3');
    title.textContent = view.dataset.recordColourView || 'Status';
    const list = document.createElement('ul');
    list.className = 'record-key-list record-key-headers';
    for (const [label, tone] of entries) {
      const row = document.createElement('li');
      row.className = 'record-key-status';
      if (tone.startsWith('theme-')) row.classList.add(tone);
      else row.dataset.status = tone;
      const swatch = document.createElement('span');
      swatch.setAttribute('aria-hidden', 'true');
      row.append(swatch, label);
      list.append(row);
    }
    content.append(title, list);
  }

  function init() {
    const pageKey = document.querySelector('template#recordColourKey');
    const pageTrigger = document.querySelector('button.record-key-trigger');
    if (pageTrigger && pageKey) {
      pageTrigger.addEventListener('click', () => showLegend(pageKey.content.cloneNode(true)));
      return;
    }

    const phone = document.querySelector('.phone-container');
    const main = phone?.querySelector(':scope > main, :scope > .main-content')
      || phone?.querySelector('[data-record-legend]')?.closest('main, .main-content');
    const workplace = document.body.classList.contains('admin-page');
    const row = phone?.querySelector('phone-status-bar')?.nextElementSibling;
    if (!main || !row?.querySelector('h1')) return;

    const button = pageTrigger || document.createElement('button');
    if (!pageTrigger) {
      button.type = 'button';
      button.className = 'record-key-trigger';
      button.textContent = '!';
      button.title = 'View Info';
      button.setAttribute('aria-label', 'View Info');
      button.setAttribute('aria-haspopup', 'dialog');
    }

    function activeViews() {
      const marked = main.querySelectorAll('[data-record-colour-view], [data-record-legend]');
      const views = marked.length ? [...marked] : [main];
      return views.filter(view => view.getClientRects().length && !view.closest('[hidden], [aria-hidden="true"]'));
    }

    function openLegend() {
      const views = activeViews();
      const content = document.createDocumentFragment();
      if (pageKey && views.length) content.append(pageKey.content.cloneNode(true));
      else for (const view of views) {
        if (view.dataset.recordLegend) appendWorkflowKey(content, view);
        else if (workplace) appendEntries(content, view);
      }
      if (content.childElementCount) showLegend(content);
      else if (dialog?.open) dialog.close();
    }
    button.addEventListener('click', openLegend);

    function update() {
      const visible = activeViews().some(view => pageKey || view.dataset.recordLegend || (workplace && !visibleEntries(view).next().done));
      button.toggleAttribute('hidden', !visible);
      if (visible && !button.isConnected) {
        const end = row.lastElementChild;
        if (end.matches('span:empty, div:empty')) {
          end.removeAttribute('aria-hidden');
          end.append(button);
        } else {
          row.append(button);
        }
      }
      if (dialog?.open) openLegend();
    }

    // Filters can replace records, hide individual cards, or switch an entire panel in place.
    const changes = new MutationObserver(update);
    changes.observe(main, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-record-colour-view', 'data-record-legend', 'data-record-key-label', 'data-status']
    });
    changes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const sizes = new ResizeObserver(update);
    sizes.observe(main);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
