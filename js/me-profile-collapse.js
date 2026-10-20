const profileCollapsePreferences = (() => {
  const storageKey = 'peoplehcm_profile_collapse_v1';
  const controls = new Map();
  let preferences = {};

  function read() {
    let stored;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {
      // Panels still work for this visit when browser storage is unavailable.
      return preferences;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, expanded]) => typeof expanded === 'boolean'));
    } catch {
      return {};
    }
  }

  preferences = read();

  // Keep another open profile tab in sync without overwriting its other choices.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preferences = read();
    controls.forEach((apply, key) => apply(preferences[key] !== false));
  });

  return {
    register(key, apply) {
      controls.set(key, apply);
      apply(preferences[key] !== false);
    },
    save(key, expanded) {
      preferences = { ...read(), [key]: expanded };
      try {
        localStorage.setItem(storageKey, JSON.stringify(preferences));
      } catch {
        // Retain the in-memory preference if saving is blocked or storage is full.
      }
    }
  };
})();

// Enhance each profile card without changing its fields or record renderers.
function initProfileCollapsibleCards() {
  document.querySelectorAll('#meMainScroll .profile-panel').forEach((panel, index) => {
    if (panel.classList.contains('profile-collapsible')) return;
    const header = panel.querySelector(':scope > :is(.profile-group-title, .profile-section-heading, .profile-subsection-heading)');
    if (!header) return;

    const title = header.matches('h2, h3') ? header : header.querySelector('h2, h3');
    if (!title) return;
    // Stable category/group identifiers survive reordered cards and theme changes.
    const group = [...panel.classList].find(name => name.startsWith('profile-group-'));
    const preferenceKey = panel.closest('.profile-section').id + ':' + (group || title.id || title.textContent.trim());
    if (!title.id) title.id = 'profile-card-title-' + index;

    const body = document.createElement('div');
    body.className = 'profile-collapse-body';
    body.id = 'profile-card-body-' + index;
    const inner = document.createElement('div');
    inner.className = 'profile-collapse-inner';
    const content = document.createElement('div');
    content.className = 'profile-collapse-content';
    while (header.nextSibling) content.append(header.nextSibling);
    inner.append(content);
    body.append(inner);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'profile-collapse-toggle';
    toggle.setAttribute('aria-labelledby', title.id);
    toggle.setAttribute('aria-controls', body.id);
    toggle.innerHTML = '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';
    function applyExpanded(expanded) {
      toggle.setAttribute('aria-expanded', String(expanded));
      panel.classList.toggle('is-collapsed', !expanded);
      // Keep hidden links, search and account controls out of keyboard navigation.
      body.inert = !expanded;
      body.setAttribute('aria-hidden', String(!expanded));
    }
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      applyExpanded(expanded);
      profileCollapsePreferences.save(preferenceKey, expanded);
    });

    header.classList.add('profile-collapse-header');
    header.append(toggle);
    panel.append(body);
    panel.classList.add('profile-collapsible');
    profileCollapsePreferences.register(preferenceKey, applyExpanded);
  });
}
