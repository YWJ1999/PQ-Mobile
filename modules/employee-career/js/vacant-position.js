(() => {
  const report = window.EMPLOYEE_CAREER_VACANT_POSITION || { jobs: [], total: 0 };
  const $ = id => document.getElementById(id);
  const state = { view: 'chart', jobTrigger: null, recordTrigger: null, inerted: [] };
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function date(value) {
    return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }
  function showView(view, job) {
    state.view = view;
    ['chart', 'summary', 'records'].forEach(name => { $(`vacantPosition${name[0].toUpperCase() + name.slice(1)}View`).hidden = name !== view; });
    $('vacantPositionTitle').textContent = view === 'chart' ? 'Vacant Position' : view === 'summary' ? 'Vacancy Summary By Job' : job;
    $('vacantPositionBack').setAttribute('aria-label', view === 'chart' ? 'Back to Employee and Career' : 'Back to previous Vacant Position view');
    document.querySelector('main').scrollTop = 0;
  }
  function renderChart() {
    $('vacantPositionChartTotal').textContent = String(report.total);
    $('vacantPositionChartSegments').replaceChildren();
    $('vacantPositionChartLegend').replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    report.jobs.forEach(group => {
      const percent = report.total ? group.count / report.total * 100 : 0;
      const length = percent / 100 * circumference;
      const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: group.color, 'stroke-width': 22, 'stroke-dasharray': `${length} ${circumference - length}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => segment.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${group.job}: ${group.count} (${percent.toFixed(2)}%)`;
      segment.append(title);
      $('vacantPositionChartSegments').append(segment);
      offset += length;
      const row = node('div', 'staff-list-legend-row active-headcount-legend-grid');
      const name = node('div', 'staff-list-legend-name');
      const swatch = node('i');
      swatch.style.background = group.color;
      swatch.setAttribute('aria-hidden', 'true');
      name.append(swatch, node('span', '', group.job));
      row.append(name, node('strong', 'active-headcount-status-count', String(group.count)), node('span', '', `${percent.toFixed(2)}%`));
      $('vacantPositionChartLegend').append(row);
    });
    $('vacantPositionLegend').hidden = !report.jobs.length;
    $('vacantPositionEmpty').hidden = report.jobs.length > 0;
    $('vacantPositionDetails').disabled = !report.jobs.length;
  }
  function renderSummary() {
    $('vacantPositionSummaryTotalRecords').textContent = String(report.jobs.length);
    $('vacantPositionSummaryRows').replaceChildren();
    report.jobs.forEach(group => {
      const row = node('tr', 'active-headcount-summary-row');
      row.tabIndex = 0;
      row.dataset.vacantJob = group.job;
      row.setAttribute('aria-label', `View ${group.count} ${group.job} vacant positions`);
      const label = node('th', '', group.job);
      label.scope = 'row';
      row.append(label, node('td', 'active-headcount-status-count', String(group.count)));
      row.addEventListener('click', () => showRecords(group, row));
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showRecords(group, row); }
      });
      $('vacantPositionSummaryRows').append(row);
    });
  }
  function showRecords(group, trigger) {
    state.jobTrigger = trigger;
    $('vacantPositionRecordsTotal').textContent = String(group.records.length);
    $('vacantPositionRecords').replaceChildren();
    group.records.forEach(record => {
      const card = node('button', 'manpower-employee-card active-headcount-employee-card');
      card.type = 'button';
      card.dataset.vacancyId = record.id;
      card.setAttribute('aria-label', `View vacancy details for ${record.job}, vacant since ${date(record.since)}`);
      const identity = node('span', 'manpower-employee-identity');
      identity.append(node('span', 'employee-name', record.job));
      const details = node('span', 'manpower-employee-card-details');
      [['Grade', record.grade || '—'], ['Last Incumbent', record.lastIncumbent || '—'], ['Since', date(record.since)]].forEach(([label, value]) => {
        const row = node('span', 'manpower-employee-card-row');
        row.append(node('span', '', label), node('strong', '', value));
        details.append(row);
      });
      card.append(identity, details);
      card.addEventListener('click', () => openDetails(record, card));
      $('vacantPositionRecords').append(card);
    });
    showView('records', group.job);
    $('vacantPositionStatus').textContent = `${group.count} vacant positions in ${group.records.length} vacancy records shown.`;
  }
  function openDetails(record, trigger) {
    state.recordTrigger = trigger;
    const fields = [['Job', record.job], ['Grade', record.grade], ['Last Incumbent', record.lastIncumbent], ['Since', date(record.since)], ['Company', record.company], ['Department', record.department], ['Status', record.status], ['Vacant Positions', record.vacancies], ['Location', record.location], ['Access Code', record.accessCode], ['Min Qualification', record.qualification], ['Opened On', date(record.openedOn)], ['Created On', date(record.createdOn)], ['Applicants', record.applicants?.length || 0]];
    const body = $('vacantPositionDetailTable').tBodies[0];
    body.replaceChildren();
    fields.forEach(([label, value]) => {
      const row = node('tr');
      const heading = node('th', '', label);
      heading.scope = 'row';
      const cell = node('td');
      cell.append(label === 'Status' ? recordDetailStatus.create(value) : String(value ?? '—'));
      row.append(heading, cell);
      body.append(row);
    });
    const overlay = $('vacantPositionDetailOverlay');
    const targets = [document.querySelector('preview-top-bar'), ...[...overlay.parentElement.children].filter(element => element !== overlay)].filter(Boolean);
    state.inerted = targets.map(element => ({ element, inert: element.inert }));
    targets.forEach(element => { element.inert = true; });
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('.manpower-detail-body').scrollTop = 0;
    $('vacantPositionDetailClose').focus({ preventScroll: true });
  }
  function closeDetails() {
    $('vacantPositionDetailOverlay').hidden = true;
    $('vacantPositionDetailOverlay').setAttribute('aria-hidden', 'true');
    state.inerted.forEach(({ element, inert }) => { if (element.isConnected) element.inert = inert; });
    state.inerted = [];
    state.recordTrigger?.focus({ preventScroll: true });
  }
  function init() {
    renderChart();
    renderSummary();
    $('vacantPositionDetails').addEventListener('click', () => {
      showView('summary');
      $('vacantPositionStatus').textContent = `${report.jobs.length} job groups shown.`;
    });
    $('vacantPositionBack').addEventListener('click', event => {
      if (state.view === 'chart') {
        const url = new URL('../../index.html', location.href);
        url.searchParams.set('scope', 'team');
        url.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
        event.currentTarget.href = url.href;
        return;
      }
      event.preventDefault();
      if (state.view === 'records') { showView('summary'); state.jobTrigger?.focus({ preventScroll: true }); }
      else { showView('chart'); $('vacantPositionDetails').focus({ preventScroll: true }); }
    });
    $('vacantPositionDetailClose').addEventListener('click', closeDetails);
    $('vacantPositionDetailOverlay').addEventListener('click', event => { if (event.target === event.currentTarget) closeDetails(); });
    $('vacantPositionDetailOverlay').addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeDetails(); }
      if (event.key === 'Tab') { event.preventDefault(); $('vacantPositionDetailClose').focus({ preventScroll: true }); }
    });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
