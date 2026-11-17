(() => {
  const $ = id => document.getElementById(id);
  const data = Array.isArray(window.EMPLOYEE_CAREER_STAFF_PLAN_DATA) ? window.EMPLOYEE_CAREER_STAFF_PLAN_DATA : [];
  const colors = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];
  const organizationFields = ['company', 'branch', 'department', 'costCenter'];
  const filterKeys = ['keyword', ...organizationFields];
  const query = new URLSearchParams(location.search);
  const savedFilters = history.state?.careerPlanList?.filters;
  const state = {
    filters: Object.fromEntries(filterKeys.map(key => [key, savedFilters?.[key] ?? query.get(key) ?? ''])),
    rows: [...data], metric: 'branch', view: 'list'
  };
  const metrics = {
    branch: { label: 'Branch', value: row => row.branch },
    department: { label: 'Department', value: row => row.department },
    careerPath: { label: 'Career Path', value: row => row.careerPath }
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function unique(key, rows = data) {
    return [...new Set(rows.map(row => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function targetYear(row) {
    return String(row.targetYear || row.targetDate || '').slice(0, 4);
  }

  function planKey(row) {
    return String(row.id ?? `${row.empNo}:${row.planDate}`);
  }

  function pageUrl(file) {
    const url = new URL(file, location.href);
    url.searchParams.set('theme', document.documentElement.dataset.theme);
    Object.entries(state.filters).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
    return url;
  }

  function detail(label, value) {
    const item = node('div', 'staff-career-plan-detail');
    item.append(node('dt', '', label), node('dd', '', value));
    return item;
  }

  function renderCards() {
    const cards = $('staffCareerPlanCards');
    cards.replaceChildren();
    state.rows.forEach(row => {
      const card = node('a', 'history-card-item staff-career-plan-card');
      const key = planKey(row);
      const url = pageUrl('staff-career-plan-details.html');
      url.searchParams.set('record', key);
      card.href = url.href;
      card.id = 'plan-' + key;
      card.setAttribute('aria-label', `View career plan for ${row.name}, #${row.empNo}`);
      card.addEventListener('click', event => {
        history.replaceState({ careerPlanList: { filters: state.filters, cardId: card.id, scroll: document.querySelector('main').scrollTop, keyboard: event.detail === 0 } }, '');
      });

      const header = node('span', 'staff-career-plan-card-header');
      const subtitle = node('span', 'staff-career-plan-subtitle', row.position);
      subtitle.append(' · ', node('span', 'staff-career-plan-employee-id', `#${row.empNo}`));
      header.append(node('strong', 'staff-career-plan-name', row.name), subtitle);

      const details = node('dl', 'staff-career-plan-details');
      details.append(
        detail('Department', row.department),
        detail('Branch', row.branch),
        detail('Sex', row.sex),
        detail('Age', String(row.age))
      );
      card.append(header, details);
      cards.append(card);
    });
    $('staffCareerPlanTotalRecords').textContent = state.rows.length;
    $('staffCareerPlanEmpty').hidden = state.rows.length > 0;
  }

  function filterSummary() {
    const summary = Object.values(state.filters).filter(Boolean).join(' · ') || 'All staff';
    $('staffCareerPlanFilterSummary').textContent = summary;
    $('staffCareerPlanChartFilterSummary').textContent = summary;
  }

  function applyRows() {
    const keyword = state.filters.keyword.toLowerCase().replace(/^#/, '');
    state.rows = data.filter(row => (
      (!keyword || `${row.empNo} ${row.name}`.toLowerCase().includes(keyword)) &&
      organizationFields.every(key => !state.filters[key] || row[key] === state.filters[key])
    ));
    renderCards();
    filterSummary();
    renderChart();
  }

  function chartGroups() {
    const metric = metrics[state.metric];
    const counts = new Map();
    state.rows.forEach(row => {
      const label = metric.value(row);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function renderChart() {
    const metric = metrics[state.metric];
    const groups = chartGroups();
    const total = state.rows.length;
    $('staffCareerPlanChartTitle').textContent = `Career plans by ${metric.label.toLowerCase()}`;
    $('staffCareerPlanChartColumn').textContent = metric.label;
    $('staffCareerPlanChartTotal').textContent = total;
    $('staffCareerPlanChartNote').textContent = total ? `Distribution of ${total} filtered career ${total === 1 ? 'plan' : 'plans'}` : 'No career plans match the current filter';
    $('staffCareerPlanChartSegments').replaceChildren();
    $('staffCareerPlanChartLegend').replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    groups.forEach((group, index) => {
      const color = colors[index % colors.length];
      const length = total ? group.count / total * circumference : 0;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const attributes = { cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${length} ${circumference - length}`, 'stroke-dashoffset': -offset };
      Object.entries(attributes).forEach(([key, value]) => circle.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${group.label}: ${group.count} (${(group.count / total * 100).toFixed(1)}%)`;
      circle.append(title);
      $('staffCareerPlanChartSegments').append(circle);
      offset += length;

      const row = node('div', 'staff-list-legend-row');
      const name = node('div', 'staff-list-legend-name');
      const swatch = node('i');
      swatch.style.background = color;
      swatch.setAttribute('aria-hidden', 'true');
      name.append(swatch, node('span', '', group.label));
      const count = node('strong', '', group.count);
      count.dataset.count = group.count;
      row.append(name, count, node('span', '', `${(group.count / total * 100).toFixed(1)}%`));
      $('staffCareerPlanChartLegend').append(row);
    });
    $('staffCareerPlanChartEmpty').hidden = total > 0;
  }

  function showView(view) {
    state.view = view;
    $('staffCareerPlanListView').hidden = view !== 'list';
    $('staffCareerPlanChartView').hidden = view !== 'chart';
    $('staffCareerPlanTitle').textContent = view === 'chart' ? 'Staff Career Plan Analysis' : 'Staff Career Plan';
    $('staffCareerPlanBack').setAttribute('aria-label', view === 'chart' ? 'Back to Staff Career Plan' : 'Back to Employee and Career');
    document.querySelector('main').scrollTop = 0;
  }

  function setFilterControls(filters) {
    const controls = $('staffCareerPlanFilterForm').elements;
    for (const key of filterKeys) controls.namedItem(key).value = filters[key];
  }

  function setBackgroundInert(inert) {
    document.querySelector('main').inert = inert;
    document.querySelector('.employee-career-header').inert = inert;
    document.querySelector('phone-bottom-nav').inert = inert;
  }

  function initDetails() {
    const row = data.find(plan => planKey(plan) === query.get('record'));
    const back = $('staffCareerPlanDetailsBack');
    const url = pageUrl('staff-career-plan.html');
    if (!row) { location.replace(url.href); return; }
    url.searchParams.set('selected', planKey(row));
    back.href = url.href;
    const nav = window.navigation;
    const source = nav?.currentEntry ? nav.entries()[nav.currentEntry.index - 1]?.url : document.referrer;
    const previous = source && new URL(source);
    if (previous && previous.origin === url.origin && previous.pathname === url.pathname && history.length > 1) {
      back.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if ((previous.searchParams.get('theme') || 'dark') !== document.documentElement.dataset.theme) return;
        event.preventDefault();
        history.back();
      });
    }
    const names = String(row.name || '').trim().split(/\s+/);
    $('staffCareerPlanInitials').textContent = (names[0].slice(0, 1) + (names.length > 1 ? names.at(-1).slice(0, 1) : '')).toUpperCase();
    $('staffCareerPlanDetailName').textContent = row.name;
    $('staffCareerPlanDetailEmployeeId').textContent = `#${row.empNo}`;
    $('staffCareerPlanDetailPosition').textContent = row.position || '—';
    $('staffCareerPlanDetailDepartment').textContent = row.department || '—';
    $('staffCareerPlanDetailJob').textContent = row.nextPosition || '—';
    $('staffCareerPlanDetailYear').textContent = targetYear(row) || '—';
    $('staffCareerPlanDetailGoal').textContent = row.careerGoal || 'Not provided';
    $('staffCareerPlanDetailNotes').textContent = row.developmentNotes || row.developmentNeeds || 'Not provided';
    document.title = `Career Plan – ${row.name} | PeopleHCM`;
  }

  function openFilter() {
    setFilterControls(state.filters);
    $('staffCareerPlanFilterOverlay').hidden = false;
    $('staffCareerPlanFilterOverlay').classList.add('is-open');
    setBackgroundInert(true);
    $('staffCareerPlanFilterKeyword').focus();
  }

  function closeFilter() {
    $('staffCareerPlanFilterOverlay').hidden = true;
    $('staffCareerPlanFilterOverlay').classList.remove('is-open');
    setBackgroundInert(false);
    $('staffCareerPlanFilterTrigger').focus();
  }

  function applyFilter(event) {
    event.preventDefault();
    const filters = Object.fromEntries(new FormData(event.currentTarget));
    filters.keyword = filters.keyword.trim();
    state.filters = filters;
    history.replaceState({ careerPlanList: { filters } }, '');
    applyRows();
    closeFilter();
  }

  function init() {
    new MutationObserver(() => {
      document.querySelectorAll('.staff-career-plan-card, #staffCareerPlanDetailsBack').forEach(link => {
        const url = new URL(link.href);
        url.searchParams.set('theme', document.documentElement.dataset.theme);
        link.href = url.href;
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if ($('staffCareerPlanDetailsBack')) { initDetails(); return; }
    const previous = history.state?.careerPlanList;
    const form = $('staffCareerPlanFilterForm');
    for (const key of organizationFields) {
      const select = form.elements.namedItem(key);
      for (const value of unique(key)) select.add(new Option(value, value));
    }
    setFilterControls(state.filters);
    applyRows();
    const selected = $(previous?.cardId || 'plan-' + query.get('selected'));
    if (selected) {
      const list = document.querySelector('main');
      if (previous) {
        list.scrollTop = previous.scroll;
        if (previous.keyboard) selected.focus({ preventScroll: true });
      } else {
        list.scrollTop += Math.max(0, selected.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom);
      }
    }

    $('staffCareerPlanFilterTrigger').addEventListener('click', openFilter);
    $('staffCareerPlanCloseFilter').addEventListener('click', closeFilter);
    $('staffCareerPlanResetFilter').addEventListener('click', () => form.reset());
    form.addEventListener('submit', applyFilter);
    $('staffCareerPlanFilterOverlay').addEventListener('click', event => { if (event.target === event.currentTarget) closeFilter(); });
    $('staffCareerPlanViewChart').addEventListener('click', () => { renderChart(); showView('chart'); $('staffCareerPlanChartMetric').focus(); });
    $('staffCareerPlanChartMetric').addEventListener('change', event => { state.metric = event.target.value; renderChart(); });
    $('staffCareerPlanBack').addEventListener('click', event => {
      if (state.view !== 'chart') return;
      event.preventDefault();
      showView('list');
      $('staffCareerPlanViewChart').focus();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!$('staffCareerPlanFilterOverlay').hidden) closeFilter();
      else if (state.view === 'chart') showView('list');
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
