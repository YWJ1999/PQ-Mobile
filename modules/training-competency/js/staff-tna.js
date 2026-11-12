(() => {
  const records = Array.isArray(window.STAFF_TNA_RECORDS) ? window.STAFF_TNA_RECORDS : [];
  const $ = id => document.getElementById(id);
  const defaults = Object.freeze({ keyword: '', periodStart: '', periodEnd: '', company: '', branch: '', department: '', job: '' });
  const state = { filters: { ...defaults } };
  const form = $('staffTnaFilterForm');
  const filterOverlay = $('staffTnaFilterOverlay');
  const detailOverlay = $('staffTnaDetailOverlay');
  const main = document.querySelector('main');
  let filterTrigger = null;
  let detailTrigger = null;
  let inerted = [];

  function node(tagName, className = '', text = '') {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== '') element.textContent = text;
    return element;
  }

  function employeeId(value) {
    const normalized = String(value || '').trim().replace(/^#/, '');
    return normalized ? `#${normalized}` : '—';
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const parsed = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function dateText(value, monthOnly = false) {
    if (!validDate(value)) return '—';
    return new Intl.DateTimeFormat('en-GB', monthOnly
      ? { month: 'short', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' }
    ).format(new Date(value + 'T00:00:00'));
  }

  function periodText(record) {
    return `${dateText(record.periodStart)} – ${dateText(record.periodEnd)}`;
  }

  function syncBack() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    $('staffTnaBack').href = `../index.html?scope=team&theme=${theme}`;
  }

  function syncUrl() {
    const url = new URL(location.href);
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    url.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    history.replaceState(null, '', url);
  }

  function matches(record) {
    const { keyword, periodStart, periodEnd, company, branch, department, job } = state.filters;
    const query = keyword.toLocaleLowerCase();
    const haystack = [record.reference, record.employee, record.empNo, employeeId(record.empNo), record.position, record.company, record.branch, record.department, record.job, record.name].join(' ').toLocaleLowerCase();
    return (!query || haystack.includes(query))
      && (!periodStart || record.periodEnd >= periodStart)
      && (!periodEnd || record.periodStart <= periodEnd)
      && (!company || record.company === company)
      && (!branch || record.branch === branch)
      && (!department || record.department === department)
      && (!job || record.job === job);
  }

  function cardDetail(label, value, valueId) {
    const detail = node('div', 'staff-tna-card-detail');
    const valueElement = node('strong', '', value);
    valueElement.id = valueId;
    detail.append(node('span', '', label), valueElement);
    return detail;
  }

  function createCard(record) {
    const card = node('article', 'history-item-card staff-tna-card');
    card.dataset.tnaId = record.id;
    card.dataset.status = 'submitted';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const ids = {
      name: `${record.id}-employee-name`,
      employeeId: `${record.id}-employee-id`,
      status: `${record.id}-status`,
      position: `${record.id}-position`,
      period: `${record.id}-period`
    };
    card.setAttribute('aria-labelledby', ids.name);
    card.setAttribute('aria-describedby', `${ids.employeeId} ${ids.status} ${ids.position} ${ids.period}`);

    const header = node('div', 'staff-tna-card-header record-card-header');
    const heading = node('div', 'staff-tna-card-heading');
    const name = node('h2', 'staff-tna-employee-name', record.employee);
    const empNo = node('span', 'staff-tna-employee-id', employeeId(record.empNo));
    name.id = ids.name;
    empNo.id = ids.employeeId;
    heading.append(name, empNo);
    const end = node('div', 'staff-tna-card-end');
    const status = node('span', 'card-status-badge', recordReviewStatusLabel(record.status));
    status.id = ids.status;
    status.dataset.status = 'submitted';
    status.dataset.tnaStatus = record.status;
    const statusIcon = node('i', 'fa-solid fa-hourglass-half');
    statusIcon.setAttribute('aria-hidden', 'true');
    status.prepend(statusIcon);
    end.append(status);
    header.append(heading, end);

    const details = node('div', 'card-details-box staff-tna-card-details');
    details.append(cardDetail('Position', record.position, ids.position), cardDetail('Period', periodText(record), ids.period));
    card.append(header, details);
    card.addEventListener('click', () => openDetails(record, card));
    card.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openDetails(record, card);
    });
    return card;
  }

  function filterSummary() {
    const parts = [];
    if (state.filters.keyword) parts.push(state.filters.keyword);
    if (state.filters.periodStart || state.filters.periodEnd) {
      const start = state.filters.periodStart ? dateText(state.filters.periodStart, true) : 'Any Start';
      const end = state.filters.periodEnd ? dateText(state.filters.periodEnd, true) : 'Any End';
      parts.push(`${start} – ${end}`);
    }
    ['company', 'branch', 'department', 'job'].forEach(key => {
      if (state.filters[key]) parts.push(state.filters[key]);
    });
    return parts.length ? parts.join(' · ') : 'All Staff TNA';
  }

  function render() {
    const filtered = records.filter(matches);
    $('staffTnaList').replaceChildren(...filtered.map(createCard));
    $('staffTnaTotalRecords').textContent = String(filtered.length);
    $('staffTnaFilterSummary').textContent = filterSummary();
    $('staffTnaEmpty').hidden = filtered.length > 0;
    syncUrl();
  }

  function detailRow(label, value, employee = false) {
    const row = node('div');
    const term = node('dt', '', label);
    const description = node('dd');
    if (employee) {
      description.append(node('span', 'staff-tna-detail-employee-name', value.employee));
      const id = node('span', 'staff-tna-detail-employee-id', employeeId(value.empNo));
      id.id = 'staffTnaDetailEmployeeId';
      description.append(id);
    } else {
      description.textContent = value || '—';
    }
    row.append(term, description);
    return row;
  }

  function renderDetails(record) {
    const rows = [
      ['Reference #', record.reference],
      ['Employee', record, true],
      ['Position', record.position],
      ['Submit By', record.submittedBy],
      ['Submit Date', dateText(record.submittedDate)],
      ['Name', record.name],
      ['Training Period', periodText(record)],
      ['Career Target', record.careerTarget],
      ['Weakness', record.weakness],
      ['Remarks', record.remarks],
      ['Approver Remarks', record.approverRemarks]
    ];
    $('staffTnaApplicationDetails').replaceChildren(...rows.map(([label, value, employee]) => detailRow(label, value, employee)));
    $('staffTnaDetailItems').replaceChildren(...record.details.map(item => {
      const article = node('article', 'staff-tna-detail-item');
      const list = node('dl');
      list.append(
        detailRow('Target Date', dateText(item.targetDate)),
        detailRow('Course', item.course),
        detailRow('Development Area', item.developmentArea),
        detailRow('Justification', item.justification)
      );
      article.append(list);
      return article;
    }));
  }

  function backgroundElements() {
    return [...document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, .phone-container > left-profile-drawer, .phone-container > notification-sheet, body > preview-top-bar')];
  }

  function setBackgroundInert(active) {
    if (active) {
      inerted = backgroundElements().filter(element => !element.inert);
      inerted.forEach(element => { element.inert = true; });
      return;
    }
    inerted.forEach(element => { element.inert = false; });
    inerted = [];
  }

  function openDetails(record, trigger) {
    detailTrigger = trigger;
    renderDetails(record);
    detailOverlay.hidden = false;
    detailOverlay.setAttribute('aria-hidden', 'false');
    setBackgroundInert(true);
    $('staffTnaDetailClose').focus({ preventScroll: true });
  }

  function closeDetails() {
    if (detailOverlay.hidden) return;
    detailOverlay.hidden = true;
    detailOverlay.setAttribute('aria-hidden', 'true');
    setBackgroundInert(false);
    if (detailTrigger?.isConnected) detailTrigger.focus({ preventScroll: true });
    detailTrigger = null;
  }

  function clearError() {
    $('staffTnaFilterError').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
  }

  function openFilter() {
    Object.entries(state.filters).forEach(([key, value]) => { form.elements[key].value = value; });
    clearError();
    filterTrigger = document.activeElement;
    filterOverlay.hidden = false;
    filterOverlay.classList.add('is-open');
    filterOverlay.setAttribute('aria-hidden', 'false');
    $('staffTnaFilterTrigger').setAttribute('aria-expanded', 'true');
    setBackgroundInert(true);
    $('staffTnaKeyword').focus({ preventScroll: true });
  }

  function closeFilter() {
    if (filterOverlay.hidden) return;
    filterOverlay.hidden = true;
    filterOverlay.classList.remove('is-open');
    filterOverlay.setAttribute('aria-hidden', 'true');
    $('staffTnaFilterTrigger').setAttribute('aria-expanded', 'false');
    setBackgroundInert(false);
    if (filterTrigger?.isConnected) filterTrigger.focus({ preventScroll: true });
    filterTrigger = null;
  }

  function applyFilter(event) {
    event.preventDefault();
    clearError();
    const start = form.elements.periodStart;
    const end = form.elements.periodEnd;
    const invalid = !start.validity.valid ? start : !end.validity.valid ? end : start.value && end.value && start.value > end.value ? end : null;
    if (invalid) {
      $('staffTnaFilterError').textContent = start.value && end.value && start.value > end.value
        ? 'End date must be on or after start date.'
        : 'Enter a valid training period.';
      $('staffTnaFilterError').hidden = false;
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
      return;
    }
    state.filters = Object.fromEntries(Object.keys(defaults).map(key => [key, form.elements[key].value.trim()]));
    render();
    closeFilter();
    main.scrollTop = 0;
  }

  function resetFilter() {
    form.reset();
    clearError();
    state.filters = { ...defaults };
    render();
    closeFilter();
    main.scrollTop = 0;
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab') return;
    const controls = [...container.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.disabled && element.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    Object.keys(defaults).forEach(key => {
      const value = params.get(key)?.trim();
      if (!value) return;
      if (['periodStart', 'periodEnd'].includes(key) && !validDate(value)) return;
      state.filters[key] = value;
    });
    if (state.filters.periodStart && state.filters.periodEnd && state.filters.periodStart > state.filters.periodEnd) {
      state.filters.periodStart = '';
      state.filters.periodEnd = '';
    }

    Object.entries({ company: 'company', branch: 'branch', department: 'department', job: 'job' }).forEach(([key, field]) => {
      [...new Set(records.map(record => record[field]).filter(Boolean))].sort().forEach(value => form.elements[key].append(new Option(value, value)));
    });

    $('staffTnaFilterTrigger').addEventListener('click', openFilter);
    $('staffTnaCloseFilter').addEventListener('click', closeFilter);
    $('staffTnaResetFilter').addEventListener('click', resetFilter);
    form.addEventListener('submit', applyFilter);
    form.addEventListener('input', clearError);
    filterOverlay.addEventListener('click', event => { if (event.target === filterOverlay) closeFilter(); });
    $('staffTnaDetailClose').addEventListener('click', closeDetails);
    $('staffTnaDetailCancel').addEventListener('click', closeDetails);
    detailOverlay.addEventListener('click', event => { if (event.target === detailOverlay) closeDetails(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!detailOverlay.hidden) { event.preventDefault(); closeDetails(); }
        else if (!filterOverlay.hidden) { event.preventDefault(); closeFilter(); }
        return;
      }
      if (!detailOverlay.hidden) trapFocus(event, detailOverlay);
      else if (!filterOverlay.hidden) trapFocus(event, filterOverlay);
    });
    render();
    syncBack();
  });

  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
