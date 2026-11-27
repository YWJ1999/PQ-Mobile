(() => {
  const records = Array.isArray(window.STAFF_TNA_RECORDS) ? window.STAFF_TNA_RECORDS : [];
  const $ = id => document.getElementById(id);
  const statusTones = { Pending: 'submitted', 'Next Approval': 'submitted', Resubmit: 'resubmit', Approved: 'approved', Rejected: 'rejected' };
  const defaults = Object.freeze({ keyword: '', periodStart: '', periodEnd: '', company: '', branch: '', department: '', job: '' });
  const state = { filters: { ...defaults } };
  const form = $('staffTnaFilterForm');
  const filterOverlay = $('staffTnaFilterOverlay');
  const detailOverlay = $('staffTnaDetailOverlay');
  const main = document.querySelector('main');
  let filterTrigger = null;
  let inerted = [];

  function node(tagName, className = '', text = '') {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== '') element.textContent = text;
    return element;
  }

  function employeeId(value) {
    return formatEmployeeNumber(value) || '—';
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
    history.replaceState(history.state, '', url);
  }

  function matches(record) {
    const { keyword, periodStart, periodEnd, company, branch, department, job } = state.filters;
    const query = formatEmployeeNumber(keyword).toLocaleLowerCase();
    const haystack = [record.reference, record.employee, formatEmployeeNumber(record.empNo), record.position, record.company, record.branch, record.department, record.job, record.name].join(' ').toLocaleLowerCase();
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
    const card = node('a', 'history-item-card staff-tna-card');
    card.href = HistoryRecordPage.href('training-need', record.id);
    card.dataset.historyLink = '';
    card.dataset.tnaId = record.id;
    const label = recordReviewStatusLabel(record.status);
    const tone = statusTones[label] || 'default';
    card.dataset.status = tone;
    const ids = {
      name: `${record.id}-employee-name`,
      status: `${record.id}-status`,
      position: `${record.id}-position`,
      period: `${record.id}-period`
    };
    card.setAttribute('aria-labelledby', ids.name);
    card.setAttribute('aria-describedby', `${ids.status} ${ids.position} ${ids.period}`);

    const header = node('div', 'staff-tna-card-header record-card-header');
    const heading = node('div', 'staff-tna-card-heading');
    const name = node('h2', 'staff-tna-employee-name', employeeCardHeading.text(record.empNo, record.employee));
    name.id = ids.name;
    heading.append(name);
    const end = node('div', 'staff-tna-card-end');
    const status = node('span', 'card-status-badge', label);
    status.id = ids.status;
    status.dataset.status = tone;
    status.dataset.tnaStatus = record.status;
    const icons = { approved: 'fa-check', resubmit: 'fa-rotate-left', rejected: 'fa-xmark' };
    const statusIcon = node('i', 'fa-solid ' + (icons[tone] || 'fa-hourglass-half'));
    statusIcon.setAttribute('aria-hidden', 'true');
    status.prepend(statusIcon);
    end.append(status);
    header.append(heading, end);

    const details = node('div', 'card-details-box staff-tna-card-details');
    details.append(
      cardDetail('Position', record.position, ids.position),
      cardDetail('Period', periodText(record), ids.period)
    );
    card.append(header, recordSubmitDate.cardLine(record.submittedDate), details);
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

  function detailField(label, value) {
    const field = node('div', 'field-group');
    field.append(node('span', 'field-label', label), node('div', 'form-ctrl', value || '—'));
    return field;
  }

  function detailItem(item) {
    const card = node('details', 'need-item');
    const header = node('summary', 'need-item-header');
    const toggle = node('span', 'need-item-toggle');
    const copy = node('span', 'need-item-copy');
    const targetDate = dateText(item.targetDate);
    copy.append(node('strong', '', item.course || '—'), node('small', '', `Target Date: ${targetDate}`));
    const arrow = node('i', 'fa-solid fa-chevron-down');
    arrow.setAttribute('aria-hidden', 'true');
    toggle.append(copy, arrow);
    header.append(toggle);

    const body = node('dl', 'need-item-body');
    for (const [label, value] of [
      ['Development Area', item.developmentArea],
      ['Course', item.course],
      ['Target Date', targetDate],
      ['Justification', item.justification]
    ]) {
      const row = node('div', 'need-data-row');
      row.append(node('dt', '', label), node('dd', '', value || '—'));
      body.append(row);
    }
    card.append(header, body);
    return card;
  }

  function renderDetails(record) {
    $('staffTnaDetailSummary').replaceChildren(
      node('h2', '', employeeCardHeading.text(record.empNo, record.employee)),
      recordDetailStatus.create(record.status)
    );

    const period = node('div', 'field-group');
    const periodDates = node('div', 'need-period-fields');
    periodDates.append(
      node('div', 'form-ctrl', dateText(record.periodStart)),
      node('div', 'form-ctrl', dateText(record.periodEnd))
    );
    period.append(node('span', 'field-label', 'Training Period'), periodDates);

    const fields = [];
    const submitted = recordSubmitDate.format(record.submittedDate, true);
    if (submitted) fields.push(detailField('Submit Date', submitted));
    if (record.reference) fields.push(detailField('Reference No.', record.reference));
    fields.push(
      detailField('Name', record.employee),
      detailField('Position', record.position),
      detailField('Department', record.department),
      detailField('Plan Name', record.name),
      period,
      detailField('Career Target', record.careerTarget),
      detailField('Weakness', record.weakness),
      detailField('Remarks', record.remarks)
    );
    if (record.approverRemarks) fields.push(detailField('Approver Remarks', record.approverRemarks));

    const application = $('staffTnaApplicationDetails');
    application.replaceChildren(...fields);
    const items = record.details || [];
    $('needItemCount').textContent = `Total Items: ${items.length}`;
    $('staffTnaDetailItems').replaceChildren(...items.map(detailItem));
    application.closest('.history-record-content').scrollTop = 0;
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
    setRecordLegend($('staffTnaList'), 'Training needs analysis status', statusTones);
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
    document.addEventListener('keydown', event => {
      if (filterOverlay.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeFilter(); }
      else trapFocus(event, filterOverlay);
    });
    HistoryRecordPage.register((kind, id) => {
      const record = kind === 'training-need' && records.find(row => row.id === id);
      if (!record) return;
      renderDetails(record);
      return detailOverlay;
    });
    render();
    syncBack();
  });

  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
