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
  const stories = {
    'town-hall': {
      title: 'Town Hall this Friday',
      date: 'Today', body: 'Join the leadership team this Friday at 3:00 PM for the quarterly company update on Q3 strategy.'
    },
    'industry-award': {
      title: 'PeopleQuest wins industry award',
      date: 'Yesterday', body: 'PeopleQuest won Best Enterprise HCM Solution 2026. This award celebrates the team behind the achievement.'
    },
    'mobile-launch': {
      title: 'PeopleHCM 3.0 Mobile Launch',
      date: '3 days ago', body: 'PeopleHCM 3.0 brings instant leave approvals and AI insights to the mobile app.'
    }
  };
  const theme = params.get('theme') || getCurrentTheme();
  back.href = params.get('from') === 'legacy' ? 'light.html' : theme === 'dark' ? 'homedark.html' : 'homelight.html';
  const article = Object.hasOwn(stories, params.get('story')) && stories[params.get('story')];
  const policy = Object.hasOwn(POLICY_DATABASE, params.get('policy')) && POLICY_DATABASE[params.get('policy')];
  if (article || policy) {
    filters.hidden = list.hidden = true;
    if (policy && params.has('pdf')) {
      const detailUrl = new URL(location.href);
      detailUrl.searchParams.delete('pdf');
      back.href = detailUrl.href;
      back.setAttribute('aria-label', 'Back to policy documents');
      document.querySelector('.updates-header h1').textContent = 'PDF viewer';
      const selected = policyDocuments(policy).find(({ label }) => label.toLowerCase() === params.get('pdf'));
      showCompanyPolicyPdf(selected?.file);
      return;
    }
    if (policy && params.get('via') === 'workplace') {
      const catalog = new URL('modules/admin/options/policy-sop.html', location.href);
      catalog.searchParams.set('theme', theme);
      for (const key of Object.keys(POLICY_FILTER_DEFAULTS)) {
        if (params.has(key)) catalog.searchParams.set(key, params.get(key));
      }
      back.href = catalog.href;
      back.setAttribute('aria-label', 'Back to Policy/SOP');
    } else if (params.get('via') !== 'home') {
      const url = new URL(location.href);
      url.searchParams.delete('story');
      url.searchParams.delete('policy');
      back.href = url.href;
      back.setAttribute('aria-label', 'Back to Company Updates');
    }
    if (policy) {
      document.querySelector('.updates-header h1').textContent = 'Company Policy / SOP';
      renderPolicy(policy);
    } else {
      const detail = document.getElementById('companyNewsDetail');
      detail.querySelector('h2').textContent = article.title;
      detail.querySelector('.updates-date').textContent = article.date;
      detail.querySelector('.updates-article-text').textContent = article.body;
      detail.hidden = false;
    }
    document.title = (policy || article).title + ' · PeopleHCM';
    return;
  }

  function renderPolicy(record) {
    const detail = document.getElementById('companyPolicyDetail');
    document.getElementById('companyPolicyTitle').textContent = record.title;
    document.getElementById('companyPolicyRef').textContent = record.ref;
    document.getElementById('companyPolicyDept').textContent = record.dept;
    const documents = detail.querySelector('.updates-documents');
    const template = document.getElementById('companyDocumentCard');
    for (const { label, file } of policyDocuments(record)) {
      const card = template.content.firstElementChild.cloneNode(true);
      card.querySelector('.document-kind').textContent = label;
      card.querySelector('h3').textContent = file.name;
      card.querySelector('.document-meta').textContent = [file.type, file.size].filter(Boolean).join(' · ');
      card.querySelector('.document-effective').textContent = 'Effective ' + file.date;
      if (file.pdfUrl) {
        const target = new URL(location.href);
        target.searchParams.set('pdf', label.toLowerCase());
        const open = card.querySelector('.document-open');
        open.href = target.href;
        open.setAttribute('aria-label', 'Open PDF: ' + file.name);
        open.hidden = false;
      } else {
        card.querySelector('.document-availability').hidden = false;
      }
      documents.append(card);
    }
    document.getElementById('companyDocumentsTitle').textContent = 'Documents (' + documents.childElementCount + ')';
    detail.hidden = false;
  }

  function addEntry(category, id) {
    const isNews = category === 'news';
    const record = isNews ? stories[id] : POLICY_DATABASE[id];
    const li = document.createElement('li');
    li.dataset.category = category;
    const entry = document.createElement('a');
    entry.className = 'updates-entry';
    entry.dataset.category = category;
    entry.dataset[isNews ? 'story' : 'policy'] = id;
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
  const [firstStory, ...otherStories] = Object.keys(stories);
  addEntry('news', firstStory);
  if (featuredPolicy) addEntry('policy', featuredPolicy.ref);
  otherStories.forEach(id => addEntry('news', id));
  otherPolicies.forEach(policy => addEntry('policy', policy.ref));
  function selectType(type) {
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === type)));
    const url = new URL(location.href);
    if (type === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', type);
    if (url.href !== location.href) history.replaceState(history.state, '', url);
    for (const li of list.children) li.hidden = type !== 'all' && li.dataset.category !== type;
    for (const link of list.querySelectorAll('a')) {
      const target = new URL(url);
      target.searchParams.delete('story');
      target.searchParams.delete('policy');
      const key = link.dataset.category === 'news' ? 'story' : 'policy';
      target.searchParams.set(key, link.dataset[key]);
      link.href = target.href;
    }
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-type]');
    if (button) selectType(button.dataset.type);
  });
  selectType(['news', 'policy'].includes(params.get('type')) ? params.get('type') : 'all');

})();
