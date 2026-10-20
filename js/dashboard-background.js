// Fade below the introductory cards while preserving each dashboard's layout.
(function () {
  'use strict';
  const page = document.querySelector('.dashboard-page');
  const main = page?.querySelector(':scope > .main-content');
  const intro = main?.querySelector(page.dataset.dashboardIntro || '.insights-card, .shortcuts-grid');
  const greeting = main?.querySelector('.greeting-header-box');
  if (!main || !intro) return;
  const prefix = page.classList.contains('dashboard-home') ? 'home' : 'apps';
  const header = page.querySelector(':scope > app-header, :scope > .app-header');
  const expandedHeaderHeight = header?.getBoundingClientRect().height || 0;

  function syncHeader() {
    const compact = page.classList.contains('is-header-compact');
    // Separate thresholds prevent flicker during small movements near the top.
    const next = compact ? main.scrollTop > 12 : main.scrollTop > 64;
    if (compact !== next) {
      page.classList.toggle('is-header-compact', next);
      scheduleFade();
    }
  }

  let scrollFrame = 0;
  main.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      syncHeader();
    });
  }, { passive: true });

  function syncFade() {
    const mainBox = main.getBoundingClientRect();
    const end = Math.round(intro.getBoundingClientRect().bottom - mainBox.top + main.scrollTop + 8);
    const start = page.dataset.dashboardFade === 'intro'
      ? Math.round(intro.getBoundingClientRect().top - mainBox.top + main.scrollTop)
      : Math.max(0, end - 180);
    page.style.setProperty(`--${prefix}-fade-start`, start + 'px');
    page.style.setProperty(`--${prefix}-fade-end`, end + 'px');
    if (prefix === 'home') {
      const headerReduction = expandedHeaderHeight - (header?.getBoundingClientRect().height || 0);
      page.style.setProperty('--home-hero-height', Math.ceil(mainBox.top - page.getBoundingClientRect().top + end + headerReduction) + 'px');
    }
  }

  let frame = 0;
  function scheduleFade() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(syncFade);
  }
  const observer = new ResizeObserver(scheduleFade);
  [main, intro, greeting].filter(Boolean).forEach(node => observer.observe(node, { box: 'border-box' }));
  document.fonts.ready.then(scheduleFade);
  window.addEventListener('resize', scheduleFade);
  syncFade();
  syncHeader();
})();
