(() => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  function init() {
    document.querySelectorAll('[data-option-back]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      url.searchParams.set('theme', theme);
      link.href = url.href;
    });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
