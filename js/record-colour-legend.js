/* The coloured record headers are defined in css/record-card-contrast.css. */
(() => {
  const headings = [
    '.history-card-item .history-card-header', '.history-card-item .summary-history-card-header',
    '.history-item-card .record-card-header', '.project-history-card .project-history-card-top',
    '.incident-history-card .incident-history-card-header', '.active-headcount-employee-card .manpower-employee-identity',
    '.approval-record-header', '.payroll-approval-card-header', '.project-approval-card-banner'
  ].join(',');
  const cardSelector = '.history-card-item,.history-item-card,.project-history-card,.incident-history-card,.active-headcount-employee-card,.approval-request-card,.project-approval-card';
  const cardKey = [
    ['Draft / New / Resubmitted', 'var(--record-draft-surface)'],
    ['Submitted / Pending', 'var(--record-submitted-surface)'],
    ['Approved / Completed / Normal', 'var(--record-approved-surface)'],
    ['Rejected', 'var(--record-rejected-surface)'],
    ['Cancelled', 'var(--record-cancelled-surface)'],
    ['General record', 'var(--card-header-purple-background)']
  ];
  const dayKey = [
    ['Working Day', '#fff'], ['Holiday', '#ffa000'], ['Offday', '#feff99'],
    ['Restday', '#aaaaff'], ['Company shutdown', '#c0c0c0'], ['Today', 'transparent']
  ];
  const leaveKey = [
    ['Draft', '#7f3f00'], ['Submitted', '#000'], ['Pending For Next Approval', '#0055af'],
    ['Pending For Final Approval', '#008500'], ['Approved', '#00d600'], ['Rejected', '#f00'],
    ['Pending For Resubmission', '#f0f'], ['Cancelled', '#808080'],
    ['Submitted For Cancellation', '#808000'], ['Unplanned', '#f00068']
  ];
  let dialog;

  function legendList(entries, kind) {
    return '<ul class="record-key-list ' + kind + '">' + entries.map(([label, colour]) =>
      `<li><span aria-hidden="true" style="background:${colour}"></span>${label}</li>`
    ).join('') + '</ul>';
  }

  function openLegend() {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'record-key-dialog';
      dialog.id = 'recordColourLegend';
      dialog.setAttribute('aria-labelledby', 'recordKeyTitle');
      dialog.innerHTML = `<header><h2 id="recordKeyTitle">Info</h2>
        <form method="dialog"><button aria-label="Close Info" autofocus>×</button></form></header>
        <div class="record-key-body">
        <h3>Status</h3>${legendList(cardKey, 'record-key-headers')}
        ${document.getElementById('leaveCalendarInfo') ? `<details open><summary>Leave calendar legend</summary>
          <h3>Day types</h3>${legendList(dayKey, 'record-key-days')}
          <h3>Leave status dots</h3>${legendList(leaveKey, 'record-key-dots')}</details>` : ''}
        </div>`;
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
      });
      document.body.append(dialog);
    }
    dialog.showModal();
  }

  function init() {
    const phone = document.querySelector('.phone-container');
    const main = phone?.querySelector(':scope > main, :scope > .main-content');
    const row = phone?.querySelector('phone-status-bar')?.nextElementSibling;
    if (!main || !row?.querySelector('h1')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.hidden = true;
    button.className = 'record-key-trigger';
    button.textContent = '!';
    button.title = 'View Info';
    button.setAttribute('aria-label', 'View Info');
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', openLegend);

    const lists = new Set();
    function updateVisibility() {
      let visible = false;
      for (const list of lists) {
        if (!main.contains(list)) {
          sizes.unobserve(list);
          lists.delete(list);
        } else if (list.getClientRects().length) {
          visible = true;
        }
      }
      button.hidden = !visible;
    }
    const sizes = new ResizeObserver(updateVisibility);

    function register(node) {
      if (!main.contains(node)) return;
      const list = node.closest('[data-record-colour-view]') || node.closest(cardSelector)?.parentElement || node.parentElement;
      if (lists.has(list) || list.closest('dialog, [role="dialog"]')) return;
      lists.add(list);
      sizes.observe(list);
      if (!button.isConnected) {
        // Use the space opposite Back, without moving the page title or changing the cards.
        const end = row.lastElementChild;
        if (end.matches('span:empty, div:empty')) {
          end.removeAttribute('aria-hidden');
          end.append(button);
        } else {
          row.append(button);
        }
      }
    }

    const markedViews = [main, ...main.querySelectorAll('[data-record-colour-view]')].filter(node => node.hasAttribute('data-record-colour-view'));
    if (markedViews.length) {
      markedViews.forEach(register);
      updateVisibility();
      return;
    }

    const selector = headings + ',[data-record-colour-view]';
    function scan(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches(selector)) register(node);
      node.querySelectorAll(selector).forEach(register);
    }
    scan(main);
    updateVisibility();
    new MutationObserver(changes => {
      for (const change of changes) change.addedNodes.forEach(scan);
      if (lists.size) updateVisibility();
    }).observe(main, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
