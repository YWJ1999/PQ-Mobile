(() => {
  function renderPolicySummary(summary, record) {
    const documents = policyDocuments(record);
    const department = document.createElement('span');
    department.textContent = record.dept;
    summary.replaceChildren(department);
    if (documents.length) {
      const badges = document.createElement('span');
      badges.className = 'policy-document-badges';
      for (const { label } of documents) {
        const badge = document.createElement('span');
        badge.className = 'policy-document-badge';
        badge.textContent = label;
        badges.append(badge);
      }
      summary.append(badges);
    }
    const meta = document.createElement('span');
    meta.textContent = policyFileCount(documents.length);
    if (record.policy?.name?.trim() && record.policy.date) meta.textContent += ' · Effective ' + record.policy.date;
    summary.append(meta);
  }

  const [featuredPolicy, ...otherPolicies] = Object.values(POLICY_DATABASE);
  for (const card of document.querySelectorAll('a.update-card[data-category="policy"]')) {
    if (!featuredPolicy) {
      card.remove();
      continue;
    }
    const target = new URL(card.href);
    target.searchParams.set('policy', featuredPolicy.ref);
    card.href = target.href;
    card.querySelector('.update-title').textContent = featuredPolicy.title;
    renderPolicySummary(card.querySelector('.policy-summary'), featuredPolicy);
  }

  const list = document.getElementById('companyUpdatesList');
  if (!list) return;
  const filters = document.querySelector('.updates-filters');
  const back = document.getElementById('updatesBack');
  const params = new URLSearchParams(location.search);
  const theme = params.get('theme') || getCurrentTheme();
  function newsDetailUrl(id, context) {
    const url = new URL('modules/admin/options/news-detail.html', location.href);
    url.searchParams.set('id', id);
    url.searchParams.set('theme', theme);
    url.searchParams.set('via', context.get('via') === 'home' ? 'home' : 'updates');
    if (context.get('from') === 'legacy') url.searchParams.set('from', 'legacy');
    if (context.has('type')) url.searchParams.set('type', context.get('type'));
    return url.href;
  }
  back.href = params.get('from') === 'legacy' ? 'light.html' : theme === 'dark' ? 'homedark.html' : 'homelight.html';
  const policy = Object.hasOwn(POLICY_DATABASE, params.get('policy')) && POLICY_DATABASE[params.get('policy')];
  if (!policy && params.has('story')) {
    location.replace(newsDetailUrl(params.get('story'), params));
    return;
  }
  if (policy) {
    filters.hidden = list.hidden = true;
    if (params.has('pdf')) {
      if (params.get('via') === 'workplace' && params.get('pdfFrom') === 'catalog') {
        setWorkplaceBack();
      } else {
        const detailUrl = new URL(location.href);
        detailUrl.searchParams.delete('pdf');
        back.href = detailUrl.href;
        back.setAttribute('aria-label', 'Back to policy documents');
      }
      document.querySelector('.updates-header h1').textContent = 'PDF viewer';
      const selected = policyDocuments(policy).find(({ label }) => label.toLowerCase() === params.get('pdf'));
      showCompanyPolicyPdf(selected?.file);
      return;
    }
    if (params.get('via') === 'workplace') {
      setWorkplaceBack();
    } else if (params.get('via') !== 'home') {
      const url = new URL(location.href);
      url.searchParams.delete('story');
      url.searchParams.delete('policy');
      back.href = url.href;
      back.setAttribute('aria-label', 'Back to Company Updates');
    }
    renderPolicy(policy);
    document.title = policy.title + ' · PeopleHCM';
    return;
  }

  function setWorkplaceBack() {
    const catalog = new URL('modules/admin/options/policy-sop.html', location.href);
    catalog.searchParams.set('theme', theme);
    for (const key of ['source', 'from', 'type', ...Object.keys(POLICY_FILTER_DEFAULTS)]) {
      if (params.has(key)) catalog.searchParams.set(key, params.get(key));
    }
    back.href = catalog.href;
    back.setAttribute('aria-label', 'Back to Policy/SOP');
  }

  function renderPolicy(record) {
    const screen = document.getElementById('companyPolicyScreen').content.cloneNode(true);
    back.className = 'admin-back';
    screen.querySelector('.admin-header-row').prepend(back);
    document.body.classList.add('admin-page', 'policy-page');
    document.querySelector('.company-updates-page').replaceWith(screen);
    const detail = document.getElementById('companyPolicyDetail');
    document.getElementById('companyPolicyTitle').textContent = record.title;
    document.getElementById('companyPolicyRef').textContent = record.ref;
    document.getElementById('companyPolicyDept').textContent = record.dept.toLowerCase();
    const documents = detail.querySelector('.updates-documents');
    const template = document.getElementById('companyDocumentCard');
    for (const { label, file } of policyDocuments(record)) {
      const card = template.content.firstElementChild.cloneNode(true);
      card.querySelector('.document-kind').textContent = label;
      card.querySelector('h3').textContent = file.name;
      card.querySelector('.document-meta').textContent = [file.type, file.size].filter(Boolean).join(' · ');
      card.querySelector('.document-effective').textContent = 'Effective: ' + policyEffectiveDate(file);
      if (file.pdfUrl) {
        const target = new URL(location.href);
        target.searchParams.set('pdf', label.toLowerCase());
        const open = card.querySelector('.document-open');
        open.href = target.href;
        open.setAttribute('aria-label', 'Open PDF: ' + file.name);
        open.hidden = false;
      } else {
        card.querySelector('.policy-card-unavailable').hidden = false;
      }
      documents.append(card);
    }
    document.getElementById('companyDocumentsTitle').textContent = 'Documents (' + documents.childElementCount + ')';

    // Keep the catalog return path and PDF links in the theme chosen on this screen.
    new MutationObserver(() => {
      for (const link of [back, ...documents.querySelectorAll('a[href]')]) {
        const homeReturn = link === back && params.get('via') === 'home' && params.get('from') !== 'legacy';
        const url = new URL(homeReturn ? APP_ROUTES.home() : link.href, location.href);
        url.searchParams.set('theme', getCurrentTheme());
        link.href = url.href;
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function addEntry(category, record) {
    const isNews = category === 'news';
    const li = document.createElement('li');
    li.dataset.category = category;
    const entry = document.createElement('a');
    entry.className = 'updates-entry';
    entry.dataset.category = category;
    entry.dataset[isNews ? 'story' : 'policy'] = isNews ? record.id : record.ref;
    entry.innerHTML = `<span class="entry-icon"><i class="fa-solid ${isNews ? 'fa-bullhorn' : 'fa-clipboard-list'}" aria-hidden="true"></i></span>
      <span class="entry-copy"><span class="updates-type"></span><strong></strong><span class="${isNews ? 'updates-date' : 'policy-summary'}"></span></span>
      <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>`;
    entry.querySelector('.updates-type').textContent = isNews ? 'News' : 'Policy & SOP';
    entry.querySelector('strong').textContent = record.title;
    if (isNews) entry.querySelector('.updates-date').textContent = record.date;
    else renderPolicySummary(entry.querySelector('.policy-summary'), record);
    li.append(entry);
    list.append(li);
  }
  const [firstStory, ...otherStories] = COMPANY_NEWS;
  if (firstStory) addEntry('news', firstStory);
  if (featuredPolicy) addEntry('policy', featuredPolicy);
  otherStories.forEach(story => addEntry('news', story));
  otherPolicies.forEach(policy => addEntry('policy', policy));
  function selectType(type) {
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === type)));
    const url = new URL(location.href);
    if (type === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', type);
    if (url.href !== location.href) history.replaceState(history.state, '', url);
    for (const li of list.children) li.hidden = type !== 'all' && li.dataset.category !== type;
    const detail = new URL('company-updates.html', location.href);
    detail.searchParams.set('theme', theme);
    if (type !== 'all') detail.searchParams.set('type', type);
    if (params.get('from') === 'legacy') detail.searchParams.set('from', 'legacy');
    for (const link of list.querySelectorAll('a')) {
      if (link.dataset.story) {
        link.href = newsDetailUrl(link.dataset.story, detail.searchParams);
        continue;
      }
      const target = new URL(detail);
      target.searchParams.set('policy', link.dataset.policy);
      link.href = target.href;
    }
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-type]');
    if (button) selectType(button.dataset.type);
  });
  selectType(['news', 'policy'].includes(params.get('type')) ? params.get('type') : 'all');

})();
