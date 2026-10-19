// Group profile destinations while keeping each dossier category directly accessible.
(function () {
  'use strict';

  const categories = [
    { id: 'bento-personal', label: 'Personal', icon: 'fa-user', count: false },
    { id: 'bento-education', label: 'Qualification', icon: 'fa-graduation-cap', count: false },
    { id: 'bento-family', label: 'Family', icon: 'fa-people-roof', count: true },
    { id: 'bento-contact', label: 'Contact Information', icon: 'fa-address-book', count: false },
    { id: 'bento-work', label: 'Work Information', icon: 'fa-building', count: false },
    { id: 'bento-finance', label: 'Payroll Information', icon: 'fa-wallet', count: false },
    { id: 'bento-career', label: 'Career Progression', icon: 'fa-arrow-trend-up', count: true },
    { id: 'bento-competency', label: 'Competencies', icon: 'fa-list-check', count: true },
    { id: 'bento-performance', label: 'Performance History', icon: 'fa-chart-column', count: true },
    { id: 'bento-training', label: 'Training History', icon: 'fa-book-open', count: true },
    { id: 'bento-compliance', label: 'Disciplinary History', icon: 'fa-list', count: true },
    { id: 'bento-assets', label: 'Asset Assignment', icon: 'fa-laptop', count: true },
    { id: 'bento-letters', label: 'HR Letters', icon: 'fa-file-lines', count: true }
  ];
  const byId = new Map(categories.map(category => [category.id, category]));
  const groups = [
    {
      id: 'work', label: 'Work', items: [
        { label: 'Job description', icon: 'fa-file-lines', action: 'job-description' },
        { label: 'Work trends', icon: 'fa-chart-line', href: 'work-behaviour.html' },
        { label: 'Subordinates', icon: 'fa-users', href: 'subordinates.html' },
        byId.get('bento-work'), byId.get('bento-compliance'), byId.get('bento-assets')
      ]
    },
    {
      id: 'pay', label: 'Pay & rewards', items: [
        { label: 'Salary history', icon: 'fa-money-bill-wave', href: 'salary-history.html' },
        { label: 'Bonus history', icon: 'fa-gift', href: 'bonus-history.html' },
        byId.get('bento-finance')
      ]
    },
    {
      id: 'career', label: 'Career & development', items: [
        byId.get('bento-career'), byId.get('bento-competency'),
        byId.get('bento-performance'), byId.get('bento-training')
      ]
    },
    {
      id: 'information', label: 'My information', items: [
        byId.get('bento-personal'), byId.get('bento-education'),
        byId.get('bento-family'), byId.get('bento-contact'), byId.get('bento-letters'),
        { label: 'Change requests', icon: 'fa-pen-to-square', href: 'change-request.html' }
      ]
    }
  ];

  categories.forEach(Object.freeze);
  groups.forEach(group => {
    group.items.forEach(Object.freeze);
    Object.freeze(group.items);
    Object.freeze(group);
  });
  window.PROFILE_CATEGORIES = Object.freeze(categories);
  window.PROFILE_NAV_GROUPS = Object.freeze(groups);

  let activeCategory = null;
  let directoryScrollTop = 0;
  let invokingRow = null;

  function createIcon(icon, className) {
    const element = document.createElement('i');
    element.className = 'fa-solid ' + icon + ' ' + className;
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function createRow(item) {
    const row = document.createElement(item.href ? 'a' : 'button');
    row.className = 'profile-nav-row';
    if (item.href) {
      row.href = item.href;
    } else {
      row.type = 'button';
    }
    if (item.id) {
      row.dataset.profileCategory = item.id;
      row.setAttribute('aria-controls', item.id);
      row.addEventListener('click', () => openProfileCategory(item.id, row));
    } else if (item.action === 'job-description') {
      row.dataset.profileAction = item.action;
      row.setAttribute('aria-haspopup', 'dialog');
      row.setAttribute('aria-controls', 'jdPaperModal');
      row.addEventListener('click', () => window.openJdModal());
    }
    const label = document.createElement('span');
    label.className = 'profile-nav-label';
    label.textContent = item.label;
    row.append(createIcon(item.icon, 'profile-nav-icon'), label);
    if (item.count) {
      const count = document.createElement('span');
      count.className = 'profile-nav-count';
      count.dataset.profileTotal = item.id;
      count.textContent = String(window.PROFILE_RECORD_COUNTS?.[item.id] ?? 0);
      row.append(count);
    }
    row.append(createIcon('fa-chevron-right', 'profile-nav-chevron'));
    return row;
  }

  function getSections() {
    return document.querySelectorAll('#meMainScroll > .profile-section');
  }

  function placeBackToTop(section) {
    const button = document.getElementById('scrollTopBtn');
    const defaultFooter = document.getElementById('profileFooterActions');
    if (!button || !defaultFooter) return;
    const footer = section?.querySelector(':scope > .profile-chart-footer') || defaultFooter;
    footer.append(button);
    defaultFooter.hidden = footer !== defaultFooter;
  }

  function openProfileCategory(id, row) {
    if (!byId.has(id)) return;
    const main = document.getElementById('meMainScroll');
    const directory = document.getElementById('profileDirectory');
    const detailNav = document.getElementById('profileDetailNav');
    const target = document.getElementById(id);
    if (!main || !directory || !detailNav || !target) return;

    if (!activeCategory) {
      directoryScrollTop = main.scrollTop;
      invokingRow = row || (directory.contains(document.activeElement) ? document.activeElement : null);
    }
    const changed = activeCategory !== id;
    activeCategory = id;
    directory.hidden = true;
    detailNav.hidden = false;
    getSections().forEach(section => { section.hidden = section !== target; });
    placeBackToTop(target);
    if (id === 'bento-training' && changed) {
      const search = document.getElementById('dossierTrainingSearch');
      if (search) search.value = '';
      if (typeof window.filterDossierTraining === 'function') window.filterDossierTraining('');
    }
    main.scrollTop = 0;
    detailNav.querySelector('button')?.focus({ preventScroll: true });
  }

  function showProfileDirectory() {
    const main = document.getElementById('meMainScroll');
    const directory = document.getElementById('profileDirectory');
    const detailNav = document.getElementById('profileDetailNav');
    if (!main || !directory || !detailNav) return;
    const wasOpen = activeCategory !== null;
    activeCategory = null;
    getSections().forEach(section => { section.hidden = true; });
    directory.hidden = false;
    detailNav.hidden = true;
    placeBackToTop(null);
    if (wasOpen) {
      main.scrollTop = directoryScrollTop;
      const focusTarget = invokingRow?.isConnected ? invokingRow : directory.querySelector('.profile-nav-row');
      focusTarget?.focus({ preventScroll: true });
    }
  }

  window.renderProfileNavigation = function () {
    const directory = document.getElementById('profileDirectory');
    if (!directory) return;
    const fragment = document.createDocumentFragment();
    groups.forEach(group => {
      const section = document.createElement('section');
      section.className = 'profile-nav-group';
      const heading = document.createElement('h2');
      heading.className = 'profile-nav-group-title';
      heading.id = 'profile-nav-' + group.id + '-heading';
      heading.textContent = group.label;
      section.setAttribute('aria-labelledby', heading.id);
      const list = document.createElement('div');
      list.className = 'profile-nav-list';
      group.items.forEach(item => list.append(createRow(item)));
      section.append(heading, list);
      fragment.append(section);
    });
    directory.replaceChildren(fragment);
    getSections().forEach(section => {
      section.removeAttribute('role');
      section.setAttribute('aria-labelledby', section.id + '-heading');
      section.hidden = section.id !== activeCategory;
    });
    directory.hidden = activeCategory !== null;
    const detailNav = document.getElementById('profileDetailNav');
    if (detailNav) detailNav.hidden = activeCategory === null;
  };

  window.openProfileCategory = openProfileCategory;
  window.showProfileDirectory = showProfileDirectory;
  window.isProfileCategoryOpen = function () { return activeCategory !== null; };
  window.scrollToBento = function (id) {
    if (id === 'all') showProfileDirectory();
    else openProfileCategory(id);
  };
})();
