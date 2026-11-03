(() => {
  const defaults = POLICY_FILTER_DEFAULTS;
  const records = Object.values(POLICY_DATABASE).sort((a, b) => a.title.localeCompare(b.title));
  const $ = id => document.getElementById(id);
  const form = $('policyFilterForm');
  const modal = $('policyFilterModal');
  const trigger = $('policyFilterTrigger');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014';
  const theme = () => document.documentElement.dataset.theme || 'dark';
  const readURL = () => {
    const params = new URLSearchParams(location.search);
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, params.get(key) ?? value]));
  };
  let filters = readURL();
  let inerted = [];

  function saveURL() {
    const url = new URL(location.href);
    Object.keys(defaults).forEach(key => {
      if (filters[key] === defaults[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, filters[key]);
    });
    url.searchParams.set('theme', theme());
    history.replaceState(null, '', url);
  }

  function matchesDates(record, kind) {
    const from = filters[kind + 'From'], to = filters[kind + 'To'];
    const file = record[kind];
    const value = file?.name?.trim() && file.date?.split('/').reverse().join('-');
    // A missing optional document is allowed until its date range is filtered explicitly.
    if (!value) return from === defaults[kind + 'From'] && to === defaults[kind + 'To'];
    return (!from || value >= from) && (!to || value <= to);
  }

  function render() {
    const rows = records.filter(record =>
      record.ref.toLowerCase().includes(filters.reference.toLowerCase().trim()) &&
      record.title.toLowerCase().includes(filters.title.toLowerCase().trim()) &&
      (!filters.department || record.dept === filters.department) &&
      ['policy', 'sop', 'guideline'].every(kind => matchesDates(record, kind))
    );
    const summary = [filters.department || 'All Departments', filters.title ? 'Title: ' + filters.title : '', filters.reference ? 'Ref: ' + filters.reference : ''];
    ['policy', 'sop', 'guideline'].forEach(kind => {
      if (filters[kind + 'From'] !== defaults[kind + 'From'] || filters[kind + 'To'] !== defaults[kind + 'To']) {
        summary.push((kind === 'sop' ? 'SOP' : kind[0].toUpperCase() + kind.slice(1)) + ' WEF: ' + (filters[kind + 'From'] ? date(filters[kind + 'From']) : 'Any') + ' – ' + (filters[kind + 'To'] ? date(filters[kind + 'To']) : 'Any'));
      }
    });
    if (summary.filter(Boolean).length === 1) summary.push('All Documents');
    $('policyFilterSummary').textContent = summary.filter(Boolean).join(' / ');
    $('policyEmptyState').hidden = rows.length > 0;
    $('policyList').innerHTML = rows.map(record => {
      const href = escape(workplacePolicyDetailsUrl(record.ref).href);
      const documents = policyDocuments(record);
      return `<article class="policy-card">
        <header class="policy-card-head">
          <a class="policy-card-title-link" href="${href}">
            <svg class="policy-card-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H5v20h15V8zM14 2v6h6M8 13h9M8 17h6"/></svg>
            <div><h3>${escape(record.title)}</h3><p>${escape(record.ref)} · <span>${escape(record.dept.toLowerCase())}</span></p></div>
          </a>
          <details class="policy-card-menu" name="policy-actions">
            <summary aria-label="Actions for ${escape(record.title)}"><span aria-hidden="true"></span></summary>
            <a href="${href}"><i class="fa-regular fa-eye" aria-hidden="true"></i>View details</a>
          </details>
        </header>
        <footer class="policy-card-footer">
          <div class="policy-card-badges">${documents.map(({ label }) => `<span>${label}</span>`).join('')}</div>
          <span class="policy-file-count">${policyFileCount(documents.length)}</span>
        </footer>
      </article>`;
    }).join('');
  }

  function fillForm(values) {
    Object.keys(defaults).forEach(key => { form.elements.namedItem(key).value = values[key]; });
    $('policyFilterError').hidden = true;
  }

  function closeFilter() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    inerted.forEach(node => { node.inert = false; });
    inerted = [];
    trigger.focus();
  }

  [...new Set(records.map(record => record.dept))].sort().forEach(department => $('policyDepartment').add(new Option(department, department)));
  document.addEventListener('click', event => {
    const open = $('policyList').querySelector('details[open]');
    if (open && !open.contains(event.target)) open.open = false;
  });
  trigger.addEventListener('click', () => {
    fillForm(filters);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    inerted = [...document.querySelector('.phone-container').children].filter(node => node !== modal && !node.inert);
    inerted.forEach(node => { node.inert = true; });
    form.scrollTop = 0;
    form.querySelector('.claim-filter-fields').scrollTop = 0;
    $('closePolicyFilter').focus();
  });
  $('closePolicyFilter').addEventListener('click', closeFilter);
  modal.addEventListener('click', event => { if (event.target === modal) closeFilter(); });
  $('resetPolicyFilter').addEventListener('click', () => fillForm(defaults));
  $('clearPolicyFilters').addEventListener('click', () => { filters = { ...defaults }; saveURL(); render(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = Object.fromEntries(Object.keys(defaults).map(key => [key, form.elements.namedItem(key).value.trim()]));
    for (const kind of ['policy', 'sop', 'guideline']) {
      if (next[kind + 'From'] && next[kind + 'To'] && next[kind + 'From'] > next[kind + 'To']) {
        $('policyFilterError').textContent = 'The start date must be on or before the end date.';
        $('policyFilterError').hidden = false;
        form.elements.namedItem(kind + 'From').focus();
        return;
      }
    }
    filters = next;
    saveURL();
    render();
    closeFilter();
  });
  document.addEventListener('keydown', event => {
    const open = $('policyList').querySelector('details[open]');
    if (open && event.key === 'Escape') {
      open.open = false;
      open.querySelector('summary').focus();
    }
    if (!modal.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeFilter();
    if (event.key === 'Tab') {
      const controls = [...form.querySelectorAll('button, input, select')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('popstate', () => { filters = readURL(); render(); });
  render();
})();
