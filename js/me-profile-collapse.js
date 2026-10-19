// Enhance each profile card without changing its fields or record renderers.
function initProfileCollapsibleCards() {
  document.querySelectorAll('#meMainScroll .profile-panel').forEach((panel, index) => {
    if (panel.classList.contains('profile-collapsible')) return;
    const header = panel.querySelector(':scope > :is(.profile-group-title, .profile-section-heading, .profile-subsection-heading)');
    if (!header) return;

    const title = header.matches('h2, h3') ? header : header.querySelector('h2, h3');
    if (!title) return;
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
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-controls', body.id);
    toggle.innerHTML = '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      panel.classList.toggle('is-collapsed', !expanded);
      // Keep hidden links, search and account controls out of keyboard navigation.
      body.inert = !expanded;
      body.setAttribute('aria-hidden', String(!expanded));
    });

    header.classList.add('profile-collapse-header');
    header.append(toggle);
    panel.append(body);
    panel.classList.add('profile-collapsible');
  });
}
