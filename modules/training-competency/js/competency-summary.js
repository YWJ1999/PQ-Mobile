(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const { definitions, records } = window.COMPETENCY_SUMMARY_DATA;
  const page = document.body.dataset.csPage;
  const expiryReport = document.body.dataset.csReport === 'skill-expiry';
  const staffEmployee = page === 'employee' && document.body.dataset.csOrigin === 'staff';
  const params = new URLSearchParams(location.search);
  const filterKeys = expiryReport ? ['keyword', 'company', 'branch', 'department', 'line', 'competency', 'expiryFrom', 'expiryTo'] : ['keyword', 'company', 'branch', 'department', 'job'];
  const filters = Object.fromEntries(filterKeys.map(key => [key, (params.get(key) || '').trim()]));
  const metadata = expiryReport ? { company: 'company', branch: 'branch', department: 'department', line: 'line' } : { company: 'company', branch: 'branch', department: 'department', job: 'position' };
  const competency = params.get(expiryReport ? 'skill' : 'competency') || '';
  const selectedLevel = params.get('level') || '';
  const empNo = params.get('emp') || '';
  const definition = id => definitions.find(item => item.id === id);
  const titles = expiryReport ? { summary: 'Skill Expiry', levels: 'Skill Expiry Levels', employees: 'Skill Expiry Employees' } : { summary: 'Competency Summary', levels: 'Competency Levels', employees: 'Competency Employees', employee: 'Employee Competency' };
  const files = expiryReport ? { summary: 'skill-expiry.html', levels: 'skill-expiry-levels.html', employees: 'skill-expiry-employees.html' } : { summary: 'competency-summary.html', levels: 'competency-summary-levels.html', employees: 'competency-summary-employees.html', employee: 'competency-summary-employee.html' };
  const colors = ['#7c3aed', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4'];
  let filtered = [], scoped = [], chartOpen = false, activeOverlay = null, returnFocus = null, inerted = [];
  const formatDate = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (expiryReport) {
    ['expiryFrom', 'expiryTo'].forEach(key => { if (filters[key] && !validDate(filters[key])) filters[key] = ''; });
    if (filters.expiryFrom && filters.expiryTo && filters.expiryFrom > filters.expiryTo) { filters.expiryFrom = ''; filters.expiryTo = ''; }
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function icon(name) {
    const element = node('i', `fa-solid fa-${name}`);
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function route(kind, selection = {}) {
    const query = new URLSearchParams({ theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' });
    filterKeys.forEach(key => { if (filters[key]) query.set(key, filters[key]); });
    Object.entries(selection).forEach(([key, value]) => { if (value !== '') query.set(expiryReport && key === 'competency' ? 'skill' : key, value); });
    return `${files[kind]}?${query}`;
  }

  function link(label, className, kind, selection = {}) {
    const element = node('a', className, label);
    element.href = route(kind, selection);
    element.dataset.route = kind;
    Object.entries(selection).forEach(([key, value]) => { element.dataset[key] = value; });
    return element;
  }

  function syncLinks() {
    document.querySelectorAll('[data-route]').forEach(element => {
      const selection = Object.fromEntries(['competency', 'level', 'emp'].filter(key => element.dataset[key] !== undefined).map(key => [key, element.dataset[key]]));
      element.href = route(element.dataset.route, selection);
    });
    if (expiryReport) document.querySelectorAll('[data-profile-link]').forEach(element => {
      element.href = `../../../me.html?theme=${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`;
    });
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    $('csBack').href = page === 'summary' ? `../index.html?scope=team&theme=${theme}`
      : page === 'levels' ? route('summary') : page === 'employees' ? route('levels', { competency })
        : route('employees', { competency, level: selectedLevel });
    if (staffEmployee) {
      const query = new URLSearchParams({ theme });
      [...filterKeys, 'matchMin', 'matchMax'].forEach(key => {
        const value = filterKeys.includes(key) ? filters[key] : params.get(key);
        if (value !== null && value !== '') query.set(key, value);
      });
      $('csBack').href = `staff-competency.html?${query}`;
      if (params.has('hubReturn')) {
        const context = new URLSearchParams(params.get('hubReturn'));
        context.delete('hubReturn');
        context.set('theme', theme);
        $('csBack').href = `staff-competency.html?${context}`;
      }
    }
    $('csBack').setAttribute('aria-label', chartOpen ? `Back to ${titles[page]}` : page === 'summary' ? 'Back to Training and Competency Team' : 'Back to previous competency report');
    if (staffEmployee) $('csBack').setAttribute('aria-label', 'Back to Staff Competency');
    const current = new URL(location.href);
    current.searchParams.set('theme', theme);
    filterKeys.forEach(key => { if (filters[key]) current.searchParams.set(key, filters[key]); else current.searchParams.delete(key); });
    history.replaceState(null, '', current);
  }

  function filterRecords() {
    const keyword = filters.keyword.toLowerCase().replace(/^#+/, '');
    filtered = records.filter(record => {
      const text = [definition(record.competency)?.title, record.name, record.empNo, record.company, record.branch, record.department, record.position].join(' ').toLowerCase();
      return (!keyword || text.includes(keyword)) && Object.entries(metadata).every(([key, field]) => !filters[key] || record[field] === filters[key])
        && (!expiryReport || (!filters.competency || record.competency === filters.competency)
          && (!filters.expiryFrom || record.expiry >= filters.expiryFrom) && (!filters.expiryTo || record.expiry <= filters.expiryTo));
    });
    scoped = page === 'summary' ? filtered : filtered.filter(record => record.competency === competency && (page === 'levels' || String(record.level) === selectedLevel));
  }

  function summaryFields(container, fields) {
    $(container).replaceChildren(...fields.map(([label, value]) => {
      const row = node('div', 'cs-summary-field');
      row.append(node('span', '', label), node('strong', '', value));
      return row;
    }));
  }

  function clickableRow(row, control) {
    row.dataset.clickable = 'true';
    row.addEventListener('click', event => { if (!event.target.closest('a,button')) control.click(); });
  }

  function emptyTable(columns) {
    const row = node('tr'), cell = node('td', 'attendance-report-empty', 'No records match the current selection.');
    cell.colSpan = columns;
    row.append(cell);
    return row;
  }

  function renderSummaryTable() {
    const rows = definitions.map(item => ({ item, count: scoped.filter(record => record.competency === item.id).length })).filter(row => row.count > 0);
    $('csTable').tBodies[0].replaceChildren(...rows.map(({ item, count }) => {
      const row = node('tr');
      row.dataset.competency = item.id;
      const name = expiryReport ? link(item.title, 'cs-row-link', 'levels', { competency: item.id }) : node('button', 'cs-pdf-link', item.title);
      if (!expiryReport) {
        name.type = 'button';
        name.setAttribute('aria-haspopup', 'dialog');
        name.setAttribute('aria-controls', 'csModal');
        name.setAttribute('aria-label', `Preview ${item.title} PDF`);
        name.addEventListener('click', () => openPdf(item, name));
      }
      const nameCell = node('td'), countCell = node('td');
      const countLink = link(count, 'cs-count', 'levels', { competency: item.id });
      countLink.setAttribute('aria-label', `View ${count} ${item.title} records by level`);
      nameCell.append(name); countCell.append(countLink); row.append(nameCell, countCell);
      if (expiryReport) clickableRow(row, name);
      return row;
    }));
    if (!rows.length) $('csTable').tBodies[0].append(emptyTable(2));
    $('csFilterSummary').textContent = filterKeys.map(key => {
      if (!filters[key]) return '';
      if (expiryReport && key === 'competency') return definition(filters[key])?.title || filters[key];
      if (expiryReport && ['expiryFrom', 'expiryTo'].includes(key)) return `${key === 'expiryFrom' ? 'From' : 'To'} ${formatDate(filters[key])}`;
      return filters[key];
    }).filter(Boolean).join(' · ') || (expiryReport ? 'All Skill Expiries' : 'All Competencies');
  }

  function renderLevels() {
    const levels = [...new Set(scoped.map(record => record.level))].sort((left, right) => left - right);
    $('csTable').tBodies[0].replaceChildren(...levels.map(level => {
      const row = node('tr');
      row.dataset.level = level;
      const nameCell = node('td');
      const name = link(definition(competency).title, 'cs-row-link', 'employees', { competency, level: String(level) });
      name.setAttribute('aria-label', `View ${definition(competency).title} level ${level} employees`);
      nameCell.append(name);
      row.append(nameCell, node('td', '', level), node('td', '', scoped.filter(record => record.level === level).length));
      clickableRow(row, name);
      return row;
    }));
    if (!levels.length) $('csTable').tBodies[0].append(emptyTable(3));
  }

  function renderEmployees() {
    summaryFields('csSelectionSummary', [['Competency', definition(competency)?.title || 'Unavailable'], ['Level', selectedLevel || '—']]);
    $('csEmployeeCards').replaceChildren(...scoped.map(record => {
      const card = expiryReport ? node('a', 'cs-employee-card') : link('', 'cs-employee-card', 'employee', { competency, level: selectedLevel, emp: record.empNo });
      if (expiryReport) card.dataset.profileLink = 'true';
      card.dataset.emp = record.empNo;
      card.setAttribute('aria-label', expiryReport ? 'Open My Profile' : `View competency profile for ${record.name}, ${formatEmployeeNumber(record.empNo)}`);
      const heading = node('header', 'cs-employee-header');
      heading.append(node('strong', 'cs-employee-name', employeeCardHeading.text(record.empNo, record.name)));
      const details = node('dl', 'cs-employee-details');
      (expiryReport ? [
        ['Department', record.department, 'department'], ['Position', record.position, 'position'],
        ['Competency', definition(record.competency).title, 'competency'], ['Level', record.level, 'level'], ['Expiry Date', formatDate(record.expiry), 'expiry-date']
      ] : [
        ['Position', record.position, 'position'], ['First Certification', formatDate(record.firstCertification), 'first-certification'],
        ['Last Assessment', formatDate(record.lastAssessment), 'last-assessment'], ['Expiry', formatDate(record.expiry), 'expiry'],
        ['Due for Renewal', record.dueForRenewal ? 'Yes' : 'No', 'renewal']
      ]).forEach(([label, value, field]) => {
        const detail = node('div', 'cs-employee-detail');
        detail.dataset.field = field;
        detail.append(node('dt', '', label), node('dd', '', value));
        details.append(detail);
      });
      card.append(heading, details);
      return card;
    }));
    if (!scoped.length) {
      const empty = node('div', 'cs-empty');
      empty.append(node('h2', '', 'No records'), node('p', '', 'No employees match the selected competency and level.'));
      $('csEmployeeCards').append(empty);
    }
  }

  function renderEmployee() {
    const selected = staffEmployee ? window.STAFF_COMPETENCY_DATA.find(record => record.empNo === empNo) : scoped.find(record => record.empNo === empNo);
    if (!selected) {
      $('csReportView').hidden = true;
      $('csUnavailable').hidden = false;
      return;
    }
    summaryFields('csEmployeeSummary', [[staffEmployee ? 'Employee No.' : 'Emp No.', formatEmployeeNumber(selected.empNo)], ['Name', selected.name], ['Branch', selected.branch], ['Department', selected.department], ['Position', selected.position]]);
    if (staffEmployee) {
      summaryFields('csEmployeeSummary', [['Name', selected.name], ['Branch', selected.branch], ['Department', selected.department], ['Position', selected.position]]);
      const id = node('span', 'cs-profile-employee-id', formatEmployeeNumber(selected.empNo));
      id.setAttribute('aria-label', `Employee No. ${formatEmployeeNumber(selected.empNo)}`);
      $('csEmployeeSummary').firstElementChild.append(id);
    }
    const rows = records.filter(record => record.empNo === empNo);
    $('csTable').tBodies[0].replaceChildren(...rows.map(record => {
      const row = node('tr');
      row.dataset.competency = record.competency;
      const name = node('button', 'cs-row-link', definition(record.competency).title);
      name.type = 'button';
      name.setAttribute('aria-haspopup', 'dialog');
      name.setAttribute('aria-controls', 'csModal');
      name.setAttribute('aria-label', `View ${definition(record.competency).title} assessment history`);
      name.addEventListener('click', () => openAssessment(record, name));
      const previous = record.assessments[1]?.level ?? record.level;
      const change = record.level - previous;
      const cell = node('td'); cell.append(name);
      row.append(cell, node('td', '', record.level), node('td', '', change > 0 ? `+${change}` : change), node('td', '', record.level - definition(record.competency).requiredLevel));
      clickableRow(row, name);
      return row;
    }));
    if (!rows.length) $('csTable').tBodies[0].append(emptyTable(4));
  }

  function detailTable(fields, id) {
    const table = node('table', 'detail-popout-table');
    if (id) table.id = id;
    const body = node('tbody');
    fields.forEach(([label, value]) => {
      const row = node('tr'), heading = node('th', 'detail-popout-label', label);
      heading.scope = 'row';
      row.append(heading, node('td', 'detail-popout-value', value)); body.append(row);
    });
    table.append(body);
    return table;
  }

  function openOverlay(overlay, focus, trigger) {
    activeOverlay = overlay;
    returnFocus = trigger;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    if (overlay.id === 'csFilterOverlay') { overlay.classList.add('is-open'); $('csFilterTrigger').setAttribute('aria-expanded', 'true'); }
    inerted = [...overlay.parentElement.children, document.querySelector('preview-top-bar')].filter(element => element && element !== overlay).map(element => ({ element, previous: element.inert }));
    inerted.forEach(({ element }) => { element.inert = true; });
    focus.focus({ preventScroll: true });
  }

  function closeOverlay() {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay.setAttribute('aria-hidden', 'true');
    activeOverlay.classList.remove('is-open');
    if (activeOverlay.id === 'csFilterOverlay') $('csFilterTrigger').setAttribute('aria-expanded', 'false');
    inerted.forEach(({ element, previous }) => { element.inert = previous; });
    inerted = [];
    activeOverlay = null;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  function showModal(title, content, trigger, pdf = false) {
    $('csModalTitle').textContent = title;
    $('csModal').classList.toggle('cs-pdf-mode', pdf);
    $('csModalBody').replaceChildren(...content);
    $('csModalBody').scrollTop = 0;
    openOverlay($('csModal'), $('csModalClose'), trigger);
  }

  function openPdf(item, trigger) {
    const toolbar = node('div', 'cs-pdf-toolbar');
    toolbar.append(icon('file-pdf'), node('span', '', `${item.id}.pdf`), node('span', '', 'PDF Preview · 1 / 1'));
    const paper = node('article', 'cs-pdf-paper');
    paper.setAttribute('aria-label', `${item.title} demonstration PDF document`);
    paper.append(node('div', 'cs-pdf-brand', 'PeopleHCM'), node('p', 'cs-pdf-reference', `${item.reference} · Competency Standard · Revision 01`),
      node('h3', '', item.title), node('h4', '', 'Competency Definition'), node('p', '', item.description),
      node('h4', '', 'Assessment Evidence'), node('p', '', item.evidence), node('h4', '', 'Proficiency Levels'));
    const table = node('table', 'cs-pdf-levels');
    const head = node('thead'), headings = node('tr');
    headings.append(node('th', '', 'Level'), node('th', '', 'Description')); head.append(headings);
    const body = node('tbody');
    ['Awareness — understands the fundamentals.', 'Basic — applies skills with guidance.', 'Proficient — works independently.', 'Advanced — handles complex situations.', 'Expert — guides others and improves practice.'].forEach((description, index) => {
      const row = node('tr'); row.append(node('td', '', index + 1), node('td', '', description)); body.append(row);
    });
    table.append(head, body);
    paper.append(table, node('p', '', `Required Level: ${item.requiredLevel}`), node('p', 'cs-pdf-footer', 'Sample document for preview · Page 1 of 1'));
    showModal('Competency PDF', [toolbar, paper], trigger, true);
  }

  function openAssessment(record, trigger) {
    const employee = detailTable([['Emp No.', formatEmployeeNumber(record.empNo)], ['Name', record.name], ['Company', record.company], ['Branch', record.branch], ['Department', record.department], ['Job Title', record.position]], 'csEmployeeDetails');
    employee.setAttribute('aria-label', 'Employee details');
    const section = node('section', 'cs-assessment-section');
    section.append(node('h3', 'cs-assessment-title', 'Assessment History Details'));
    const list = node('div', 'cs-assessment-list');
    record.assessments.forEach(assessment => {
      const wrapper = node('article', 'cs-assessment-record');
      wrapper.setAttribute('aria-label', `Assessment on ${formatDate(assessment.date)}`);
      wrapper.append(detailTable([['Assess Date', formatDate(assessment.date)], ['Level', assessment.level], ['Remarks', assessment.remarks], ['Assessor', assessment.assessor]]));
      list.append(wrapper);
    });
    section.append(list);
    showModal('Competency Details', [employee, section], trigger);
  }

  function chartMetrics() {
    const common = expiryReport ? { company: 'Company', branch: 'Branch', department: 'Department', line: 'Line' } : { company: 'Company', branch: 'Branch', department: 'Department', position: 'Job' };
    return page === 'summary' ? { competency: 'Competency', ...common } : page === 'levels' ? { level: 'Level', ...common } : { ...common };
  }

  function renderChart() {
    const metric = $('csChartMetric').value;
    const label = chartMetrics()[metric];
    const groups = new Map();
    scoped.forEach(record => {
      const category = metric === 'competency' ? definition(record.competency).title : metric === 'level' ? `Level ${record.level}` : record[metric];
      groups.set(category, (groups.get(category) || 0) + 1);
    });
    $('csChartTitle').textContent = `Records by ${label.toLowerCase()}`;
    $('csChartDescription').textContent = page === 'summary' ? 'Employee competency assignments in the current filter' : definition(competency)?.title || 'Selected competency';
    $('csChartColumn').textContent = label;
    $('csChartTotal').textContent = scoped.length;
    $('csChartNote').textContent = scoped.length ? 'Chart and counts use the current report selection.' : 'No records match the current selection.';
    $('csChartDonut').setAttribute('aria-label', `${scoped.length} records by ${label.toLowerCase()}`);
    $('csChartSegments').replaceChildren(); $('csChartLegend').replaceChildren();
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    [...groups].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).forEach(([category, count], index) => {
      const fraction = count / scoped.length, color = colors[index % colors.length];
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${fraction * circumference} ${circumference}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); title.textContent = `${category}: ${count}`;
      circle.append(title); $('csChartSegments').append(circle); offset += fraction * circumference;
      const row = node('div', 'attendance-report-legend-row'); row.dataset.count = count;
      const copy = node('span', 'attendance-report-legend-label'), dot = node('i', 'attendance-report-dot'); dot.style.background = color;
      dot.setAttribute('aria-hidden', 'true'); copy.append(dot, node('span', '', category));
      row.append(copy, node('span', '', count), node('span', '', `${(fraction * 100).toFixed(1)}%`)); $('csChartLegend').append(row);
    });
  }

  function showChart(show) {
    chartOpen = show;
    $('csReportView').hidden = show;
    $('csChartView').hidden = !show;
    $('csPageTitle').textContent = show ? (expiryReport ? 'Skill Expiry Analysis' : 'Competency Analysis') : titles[page];
    document.querySelector('main').scrollTop = 0;
    if (show) { renderChart(); $('csChartMetric').focus({ preventScroll: true }); }
    else $('csViewChart').focus({ preventScroll: true });
    syncLinks();
  }

  function render() {
    filterRecords();
    if ($('csTotalRecords')) $('csTotalRecords').textContent = scoped.length;
    if (page === 'summary') renderSummaryTable();
    else if (page === 'levels') renderLevels();
    else if (page === 'employees') renderEmployees();
    else renderEmployee();
    syncLinks();
  }

  if (page === 'summary') {
    const form = $('csFilterForm');
    Object.entries(metadata).forEach(([key, field]) => {
      [...new Set(records.map(record => record[field]))].sort().forEach(value => form.elements.namedItem(key).add(new Option(value, value)));
      if (filters[key] && ![...form.elements.namedItem(key).options].some(option => option.value === filters[key])) form.elements.namedItem(key).add(new Option(filters[key], filters[key]));
    });
    if (expiryReport) {
      definitions.forEach(item => form.elements.namedItem('competency').add(new Option(item.title, item.id)));
      if (filters.competency && !definition(filters.competency)) form.elements.namedItem('competency').add(new Option(filters.competency, filters.competency));
    }
    const clearFilterError = () => { if (expiryReport) $('csFilterError').hidden = true; };
    const populate = () => {
      filterKeys.forEach(key => { form.elements.namedItem(key).value = filters[key]; });
      clearFilterError();
    };
    populate();
    $('csFilterTrigger').addEventListener('click', () => { populate(); openOverlay($('csFilterOverlay'), $('csKeyword'), $('csFilterTrigger')); });
    $('csCloseFilter').addEventListener('click', closeOverlay);
    $('csResetFilter').addEventListener('click', () => { form.reset(); clearFilterError(); });
    if (expiryReport) form.addEventListener('input', clearFilterError);
    $('csFilterOverlay').addEventListener('click', event => { if (event.target === event.currentTarget) closeOverlay(); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (expiryReport) {
        const from = form.elements.namedItem('expiryFrom'), to = form.elements.namedItem('expiryTo');
        $('csFilterError').hidden = true;
        const invalid = !from.validity.valid || from.value && !validDate(from.value) ? from : !to.validity.valid || to.value && !validDate(to.value) ? to : null;
        if (invalid || from.value && to.value && from.value > to.value) {
          $('csFilterError').textContent = invalid ? 'Enter a valid expiry date.' : 'Expiry Date To must be on or after From.';
          $('csFilterError').hidden = false;
          (invalid || to).focus();
          return;
        }
      }
      filterKeys.forEach(key => { filters[key] = form.elements.namedItem(key).value.trim(); });
      render(); closeOverlay(); document.querySelector('main').scrollTop = 0;
    });
  }
  if (page !== 'employee') {
    Object.entries(chartMetrics()).forEach(([key, value]) => $('csChartMetric').add(new Option(value, key)));
    $('csViewChart').addEventListener('click', () => showChart(true));
    $('csChartMetric').addEventListener('change', renderChart);
  }
  $('csBack').addEventListener('click', event => { if (chartOpen) { event.preventDefault(); showChart(false); } });
  $('csModalClose').addEventListener('click', closeOverlay);
  if (page === 'employee') $('staffCompetencyAssess').addEventListener('click', () => {
    const target = new URL(location.href);
    target.pathname = target.pathname.replace(/[^/]+$/, 'staff-competency-assess.html');
    target.searchParams.set('origin', staffEmployee ? 'staff' : 'summary');
    location.href = target.href;
  });
  $('csModal').addEventListener('click', event => { if (event.target === event.currentTarget) closeOverlay(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (activeOverlay) { event.preventDefault(); closeOverlay(); } else if (chartOpen) showChart(false); return; }
    if (event.key !== 'Tab' || !activeOverlay) return;
    const controls = [...activeOverlay.querySelectorAll('button,input,select,[tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  render();
})();
