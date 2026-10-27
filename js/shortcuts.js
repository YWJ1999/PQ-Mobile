// Customize the Apps dashboard without changing the separate Favourites list.
(function () {
  'use strict';
  const grid = document.querySelector('.dashboard-apps .shortcuts-grid');
  const editButton = document.getElementById('editShortcutsButton');
  if (!grid || !editButton) return;
  const phone = grid.closest('.phone-container');

  const storageKey = 'peoplehcm_app_shortcuts';
  const limit = 6;
  const template = grid.querySelector('.shortcut-card').cloneNode(true);
  const catalog = [...grid.querySelectorAll('.shortcut-card')].map(card => ({
    id: card.getAttribute('href'),
    href: card.getAttribute('href'),
    name: card.querySelector('h4').textContent.trim(),
    icon: card.querySelector('.shortcut-icon-box').innerHTML,
    iconClass: card.querySelector('.shortcut-icon-box').className,
    group: 'Quick actions'
  }));
  const defaultIds = catalog.map(item => item.id);
  const modules = [
    ['workplace', 'Workplace', 'fa-building-shield'],
    ['employee_career', 'Employee & Career', 'fa-id-card'],
    ['time_attendance', 'Attendance & OT', 'fa-clock'],
    ['leave', 'Leave', 'fa-calendar-minus'],
    ['claims_expenses', 'Benefit, Claim & Travel', 'fa-receipt'],
    ['payroll', 'Payroll', 'fa-wallet'],
    ['project_task', 'Project & Task', 'fa-list-check'],
    ['performance', 'Performance', 'fa-bullseye'],
    ['learning_dev', 'Training & Competency', 'fa-graduation-cap']
  ];
  modules.forEach(([route, name, icon]) => catalog.push({
    id: `module:${route}`, route, name,
    icon: `<i class="fa-solid ${icon}" aria-hidden="true"></i>`,
    iconClass: 'shortcut-icon-box purple', group: 'Modules'
  }));
  const byId = new Map(catalog.map(item => [item.id, item]));
  let selectedIds = [...defaultIds];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored)) {
      const validIds = [...new Set(stored)].filter(id => byId.has(id)).slice(0, limit);
      if (validIds.length) selectedIds = validIds;
    }
  } catch (_) {
    // Keep the default shortcuts if saved preferences cannot be read.
  }
  let draftIds = [];

  const dialog = document.createElement('dialog');
  dialog.id = 'shortcutEditor';
  dialog.className = 'notification-filter-dialog shortcut-editor';
  dialog.setAttribute('aria-labelledby', 'shortcutEditorTitle');
  dialog.setAttribute('aria-describedby', 'shortcutEditorDescription');
  dialog.innerHTML = `
    <div class="notification-filter-heading">
      <div>
        <h2 id="shortcutEditorTitle">Edit shortcuts</h2>
        <p id="shortcutEditorDescription">Choose up to six shortcuts for quick access.</p>
      </div>
      <button type="button" class="sheet-close-btn" data-shortcut-cancel aria-label="Close shortcut editor"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <div class="notification-filter-options-heading">
      <span id="shortcutSelectionCount" role="status"></span>
      <button type="button" data-shortcut-reset>Reset</button>
    </div>
    <p id="shortcutSelectionHint" class="shortcut-selection-hint"></p>
    <div class="notification-filter-options shortcut-options"></div>
    <p class="shortcut-save-error" role="alert" hidden></p>
    <div class="notification-filter-footer">
      <button type="button" class="notification-filter-cancel" data-shortcut-cancel>Cancel</button>
      <button type="button" class="notification-filter-apply" data-shortcut-save>Save shortcuts</button>
    </div>`;
  phone.appendChild(dialog);
  const options = dialog.querySelector('.shortcut-options');
  const saveButton = dialog.querySelector('[data-shortcut-save]');
  const error = dialog.querySelector('.shortcut-save-error');

  for (const group of ['Quick actions', 'Modules']) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = group;
    fieldset.appendChild(legend);
    catalog.filter(item => item.group === group).forEach(item => {
      const label = document.createElement('label');
      label.className = 'notification-filter-option shortcut-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.id;
      checkbox.setAttribute('aria-describedby', 'shortcutSelectionHint');
      const icon = document.createElement('span');
      icon.className = item.iconClass;
      icon.innerHTML = item.icon;
      icon.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span');
      title.textContent = item.name;
      label.append(checkbox, icon, title);
      fieldset.appendChild(label);
    });
    options.appendChild(fieldset);
  }

  function renderGrid() {
    grid.replaceChildren(...selectedIds.map(id => {
      const item = byId.get(id);
      const card = template.cloneNode(true);
      const route = item.route && APP_ROUTES[item.route];
      card.setAttribute('href', item.href || (typeof route === 'function' ? route() : route));
      card.dataset.shortcutId = id;
      card.querySelector('h4').textContent = item.name;
      const icon = card.querySelector('.shortcut-icon-box');
      icon.className = item.iconClass;
      icon.innerHTML = item.icon;
      return card;
    }));
  }

  function syncSelection() {
    options.querySelectorAll('input').forEach(input => {
      input.checked = draftIds.includes(input.value);
      input.disabled = !input.checked && draftIds.length >= limit;
    });
    dialog.querySelector('#shortcutSelectionCount').textContent = `${draftIds.length} of ${limit} selected`;
    dialog.querySelector('#shortcutSelectionHint').textContent = draftIds.length >= limit
      ? 'Remove a shortcut to add another.' : 'Select at least one shortcut.';
    saveButton.disabled = draftIds.length === 0;
    error.hidden = true;
  }

  // Native modal dialogs use viewport coordinates, even inside the phone frame.
  function fitEditorToPhone() {
    const bounds = phone.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.max(0, bounds.left);
    const top = Math.max(0, bounds.top);
    const right = Math.min(viewportWidth, bounds.right);
    const bottom = Math.min(viewportHeight, bounds.bottom);
    const geometry = {
      'center-x': (left + right) / 2,
      'center-y': (top + bottom) / 2,
      width: Math.min(356, right - left - 32),
      height: bottom - top - 48,
      'clip-top': top,
      'clip-right': viewportWidth - right,
      'clip-bottom': viewportHeight - bottom,
      'clip-left': left
    };
    Object.entries(geometry).forEach(([key, value]) => dialog.style.setProperty(`--shortcut-${key}`, `${value}px`));
    dialog.style.setProperty('--shortcut-radius', getComputedStyle(phone).borderTopLeftRadius);
  }
  const phoneObserver = new ResizeObserver(() => {
    if (dialog.open) fitEditorToPhone();
  });
  phoneObserver.observe(phone);
  window.addEventListener('resize', () => {
    if (dialog.open) fitEditorToPhone();
  });

  editButton.addEventListener('click', () => {
    draftIds = [...selectedIds];
    syncSelection();
    fitEditorToPhone();
    dialog.showModal();
    options.scrollTop = 0;
  });
  options.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('input[type="checkbox"]')) return;
    if (input.checked && draftIds.length < limit) draftIds.push(input.value);
    else draftIds = draftIds.filter(id => id !== input.value);
    syncSelection();
  });
  dialog.querySelector('[data-shortcut-reset]').addEventListener('click', () => {
    draftIds = [...defaultIds];
    syncSelection();
  });
  dialog.querySelectorAll('[data-shortcut-cancel]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => editButton.focus({ preventScroll: true }));
  saveButton.addEventListener('click', () => {
    if (!draftIds.length || draftIds.length > limit) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draftIds));
    } catch (_) {
      error.textContent = 'Could not save your shortcuts. Please try again.';
      error.hidden = false;
      return;
    }
    selectedIds = [...draftIds];
    renderGrid();
    dialog.close();
    showToast('Shortcuts saved');
  });
  renderGrid();
})();
