(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const employees = window.STAFF_COMPETENCY_DATA;
  const source = window.COMPETENCY_SUMMARY_DATA;
  const reports = window.StaffCompetencyReports;
  const tabs = [...document.querySelectorAll('[data-competency-tab]')];
  const form = $('competencyHubFilterForm'), overlay = $('competencyHubFilterOverlay');
  const prefixes = { assessment: 'a', search: 's', gap: 'g' };
  const common = [
    { key: 'keyword', label: 'Search Keyword', type: 'search' },
    ...[['company', 'Company', 'company'], ['branch', 'Branch', 'branch'], ['department', 'Department', 'department'], ['job', 'Job', 'position']]
      .map(([key, label, field]) => ({ key, label, options: [...new Set(employees.map(item => item[field]).filter(Boolean))].sort().map(value => [value, value]) }))
  ];
  const group = { key: 'skillGroup', label: 'Skill Group', options: [...new Set(source.definitions.map(item => item.skillGroup))].sort().map(value => [value, value]) };
  const skill = { key: 'competency', label: 'Competency', options: source.definitions.map(item => [item.id, item.title]) };
  const schemas = {
    assessment: [...common, group, { key: 'days', label: 'Days Since Last Assessment >', type: 'number', max: 99999 }],
    search: [...common, skill, { key: 'level', label: 'Level', range: true, max: 5 },
      { key: 'age', label: 'Age', range: true, max: 130, hint: 'Requires an employee date of birth. Missing ages are excluded when this range is used.' },
      { key: 'yos', label: 'Years of Service', range: true, max: 80, hint: 'Requires an employee joining date. Missing service dates are excluded when this range is used.' }],
    gap: [...common, group, skill]
  };
  let params = new URLSearchParams(location.search), active = 'staff', rows = [], groups = [];
  let returnFocus = null, inerted = [];
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const icon = name => { const element = node('i', `fa-solid fa-${name}`); element.setAttribute('aria-hidden', 'true'); return element; };
  const keys = schema => schema.flatMap(field => field.range ? [`${field.key}Min`, `${field.key}Max`] : [field.key]);
  const paramKey = (tab, key) => `${prefixes[tab]}${key[0].toUpperCase()}${key.slice(1)}`;
  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  function filters(tab = active) {
    const values = Object.fromEntries(keys(schemas[tab]).map(key => [key, params.get(paramKey(tab, key)) || '']));
    schemas[tab].forEach(field => {
      if (field.options && values[field.key] && !field.options.some(([value]) => value === values[field.key])) values[field.key] = '';
      if (field.range || field.type === 'number') {
        const names = field.range ? [`${field.key}Min`, `${field.key}Max`] : [field.key];
        names.forEach(key => { if (values[key] && (!Number.isInteger(Number(values[key])) || Number(values[key]) < 0 || Number(values[key]) > field.max)) values[key] = ''; });
        if (field.range && values[names[0]] && values[names[1]] && Number(values[names[0]]) > Number(values[names[1]])) names.forEach(key => { values[key] = ''; });
      }
    });
    return values;
  }
  function change(values, focusResults = false) {
    params = new URLSearchParams(location.search);
    Object.entries(values).forEach(([key, value]) => { if (value === '' || value == null) params.delete(key); else params.set(key, value); });
    params.set('theme', theme());
    const url = new URL(location.href); url.search = params.toString();
    if (url.href !== location.href) history.pushState(null, '', url);
    render();
    document.querySelector('main').scrollTop = 0;
    if (focusResults) { $('competencyHubHeading').tabIndex = -1; $('competencyHubHeading').focus({ preventScroll: true }); }
  }
  function childUrl(file, employee, extras = {}) {
    const url = new URL(file, location.href), query = new URLSearchParams(location.search);
    query.set('theme', theme());
    url.search = new URLSearchParams({ emp: employee.empNo, theme: theme(), hubReturn: query.toString(), ...extras }).toString();
    return url.href;
  }
  function detail(list, label, value, className = '') {
    const row = node('div', 'sch-detail');
    row.append(node('dt', '', label), node('dd', className, value === '' || value == null ? '—' : value)); list.append(row);
  }
  function gapStatus(row) {
    if (row.gap == null) return ['sch-gap-unknown', 'Unavailable'];
    if (row.gap < 0) return ['sch-gap-negative', `${row.gap} · Below required`];
    if (row.gap > 0) return ['sch-gap-positive', `+${row.gap} · Above required`];
    return ['sch-gap-zero', '0 · Meets required'];
  }
  function employeeCard(row, assessment = false) {
    const card = node(assessment ? 'article' : 'a', 'sch-card');
    if (!assessment) { card.href = childUrl('staff-competency-employee.html', row); card.dataset.employee = row.empNo; }
    const header = node('div', 'sch-card-heading'), identity = node('div');
    identity.append(node('strong', '', row.name), node('span', 'sch-employee-id', `#${String(row.empNo).replace(/^#+/, '')}`));
    header.append(identity);
    if (!assessment) header.append(icon('chevron-right'));
    card.append(header);
    const list = node('dl', 'sch-card-details');
    detail(list, 'Department', row.department); detail(list, 'Position', row.position);
    if (assessment) {
      const dateLabel = row.lastAssessment ? new Date(`${row.lastAssessment}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not assessed';
      detail(list, 'Last Assessment', dateLabel);
      detail(list, 'Days Since Assessment', row.daysSince);
      detail(list, 'Competencies', row.assignmentCount);
      card.append(list);
      if (row.assignmentCount) {
        const action = node('div', 'sch-card-action'), link = node('a', 'sch-assess-link', 'Assess');
        link.href = childUrl('staff-competency-assess.html', row, { origin: 'hub', skillGroup: filters().skillGroup });
        link.dataset.assess = row.empNo; link.setAttribute('aria-label', `Assess ${row.name}`); link.append(icon('chevron-right'));
        action.append(link); card.append(action);
      } else card.append(node('p', 'sch-count-note', 'No competencies assigned.'));
    } else {
      card.append(node('p', 'sch-card-competency', row.title));
      detail(list, 'Required Level', row.requiredLevel); detail(list, 'Current Level', row.level);
      const [className, text] = gapStatus(row); detail(list, 'Gap', text, className);
      card.append(list);
    }
    return card;
  }
  function empty(title, message) {
    const element = node('div', 'sch-empty'); element.append(node('h3', '', title), node('p', '', message)); return element;
  }
  function filterSummary(values) {
    return schemas[active].flatMap(field => {
      if (field.range) {
        const min = values[`${field.key}Min`], max = values[`${field.key}Max`];
        return min || max ? [`${field.label}: ${min || '0'}–${max || 'Any'}`] : [];
      }
      if (!values[field.key]) return [];
      return [field.options ? field.options.find(([key]) => key === values[field.key])?.[1] || values[field.key]
        : field.key === 'days' ? `More than ${values.days} days / Not assessed` : values[field.key]];
    }).join(' · ') || (active === 'assessment' ? 'All Staff' : 'All Competencies');
  }
  function renderChart() {
    const chartOpen = params.get('hubChart') === '1' && active !== 'assessment';
    $('competencyHubChart').hidden = !chartOpen;
    $('competencyHubViewChart').setAttribute('aria-expanded', String(chartOpen));
    $('competencyHubViewChart').querySelector('span').textContent = chartOpen ? 'Hide Chart' : 'Chart';
    const breakdown = active === 'gap' ? groups.map(group => ({ title: group.title, count: group.count }))
      : source.definitions.map(skill => ({ title: skill.title, count: rows.filter(row => row.competency === skill.id).length })).filter(item => item.count);
    $('competencyHubChartTitle').textContent = active === 'gap' ? 'Employees by competency' : 'Records by competency';
    const max = Math.max(1, ...breakdown.map(item => item.count));
    $('competencyHubChartBars').replaceChildren(...breakdown.map(item => {
      const bar = node('div', 'sch-bar'), meter = node('meter');
      meter.min = 0; meter.max = max; meter.value = item.count;
      meter.setAttribute('aria-label', `${item.title}: ${item.count}`);
      bar.append(node('span', '', item.title), node('strong', '', item.count), meter); return bar;
    }));
    if (!breakdown.length) $('competencyHubChartBars').append(node('p', 'sch-count-note', 'No matching records to chart.'));
  }
  function render() {
    params = new URLSearchParams(location.search);
    active = tabs.some(tab => tab.dataset.competencyTab === params.get('tab')) ? params.get('tab') : 'staff';
    tabs.forEach(tab => { const selected = tab.dataset.competencyTab === active; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    $('competencyStaffPanel').hidden = active !== 'staff'; $('competencyHubPanel').hidden = active === 'staff';
    document.dispatchEvent(new CustomEvent('competency:tabchange', { detail: active }));
    if (active === 'staff') return;
    $('staffCompetencyTitle').textContent = 'Staff Competency';
    const current = tabs.find(tab => tab.dataset.competencyTab === active);
    $('competencyHubPanel').setAttribute('aria-labelledby', current.id);
    const values = filters(), gap = active === 'gap', sign = params.get('gapSign') === 'positive' ? 'positive' : 'negative';
    const selected = gap ? params.get('gapSkill') : '';
    $('competencyGapSwitch').hidden = !gap;
    document.querySelectorAll('[data-gap-sign]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.gapSign === sign)));
    $('competencyHubFilterSummary').textContent = filterSummary(values);
    $('competencyHubViewChart').hidden = active === 'assessment';
    $('competencyGapAll').hidden = !selected;
    rows = active === 'assessment' ? reports.assessmentRows(employees, source.records, source.definitions, values, today())
      : reports.searchRows(employees, source.records, source.definitions, values, today());
    let children;
    if (active === 'assessment') {
      $('competencyHubHeading').textContent = 'Competency Assessment';
      $('competencyHubDescription').textContent = 'Find employees to assess by skill group and time since their last assessment.';
      $('competencyHubCount').parentElement.setAttribute('unit', 'Employee');
      $('competencyHubCount').textContent = rows.length;
      $('competencyHubCountNote').textContent = 'Each employee is counted once. Employees not yet assessed are included.';
      children = rows.map(row => employeeCard(row, true));
    } else if (active === 'search') {
      $('competencyHubHeading').textContent = 'Competency Search';
      $('competencyHubDescription').textContent = 'Find employees by competency, level, age or years of service.';
      $('competencyHubCount').parentElement.removeAttribute('unit');
      $('competencyHubCount').textContent = rows.length;
      $('competencyHubCountNote').textContent = `${new Set(rows.map(row => row.empNo)).size} employees · An employee can have multiple competency records.`;
      children = rows.map(row => employeeCard(row));
    } else {
      groups = reports.gapGroups(rows, source.definitions, sign);
      const group = groups.find(item => item.competency === selected), selection = source.definitions.find(item => item.id === selected);
      const matching = selected ? group?.rows || [] : groups.flatMap(item => item.rows);
      $('competencyHubHeading').textContent = selected ? selection?.title || 'Competency unavailable' : `${sign === 'positive' ? 'Positive' : 'Negative'} Gap Summary`;
      $('competencyHubDescription').textContent = sign === 'positive' ? 'Current levels above the required level.' : 'Current levels below the required level.';
      $('competencyHubCount').parentElement.setAttribute('unit', selected ? 'Employee' : 'Gap Record');
      $('competencyHubCount').textContent = matching.length;
      $('competencyHubCountNote').textContent = selected ? 'Gap = Current Level − Required Level.'
        : `${new Set(matching.map(row => row.empNo)).size} employees across ${groups.length} competencies · Select a competency to view employees.`;
      children = selected ? matching.map(row => employeeCard(row)) : groups.map(item => {
        const card = node('button', 'sch-card'); card.type = 'button'; card.dataset.gapSkill = item.competency;
        const heading = node('div', 'sch-card-heading'); heading.append(node('strong', '', item.title), icon('chevron-right'));
        const count = node('span', 'sch-gap-count', item.count); count.append(node('small', '', item.count === 1 ? 'employee' : 'employees'));
        card.append(heading, count); return card;
      });
    }
    const demographicMissing = active === 'search' && employees.some(employee => !employee.dateOfBirth || !employee.dateJoined);
    $('competencyHubDataNote').hidden = !source.loadError && !demographicMissing;
    $('competencyHubDataNote').textContent = source.loadError || (demographicMissing ? 'Age and years of service are unavailable for employees without birth or joining dates. They are excluded when those ranges are used.' : '');
    $('competencyHubResults').replaceChildren(...(children.length ? children : [empty('No matching records', 'Try adjusting the filters or choosing another gap type.')]));
    renderChart();
    $('staffCompetencyBack').setAttribute('aria-label', selected ? 'Back to Gap Summary' : 'Back to Training and Competency Team');
  }
  function clearError() {
    $('competencyHubFilterError').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
  }
  function openFilter() {
    const values = filters(), fields = $('competencyHubFilterFields'); fields.replaceChildren(); clearError();
    $('competencyHubFilterTitle').textContent = `${active === 'gap' ? 'Gap Summary' : active === 'search' ? 'Competency Search' : 'Assessment'} Filter`;
    schemas[active].forEach(field => {
      const wrapper = node('div'), label = node('label', '', field.label), id = `hubFilter_${field.key}`;
      label.htmlFor = field.range ? `${id}Min` : id; wrapper.append(label);
      if (field.range) {
        const range = node('div', 'sch-filter-range');
        ['Min', 'Max'].forEach((suffix, index) => {
          if (index) range.append(node('span', '', '–'));
          const input = node('input'); input.id = `${id}${suffix}`; input.name = `${field.key}${suffix}`; input.type = 'number';
          input.min = '0'; input.max = field.max; input.step = '1'; input.placeholder = suffix; input.value = values[input.name];
          input.setAttribute('aria-label', `${suffix === 'Min' ? 'Minimum' : 'Maximum'} ${field.label.toLowerCase()}`); input.setAttribute('aria-describedby', 'competencyHubFilterError'); range.append(input);
        }); wrapper.append(range);
      } else {
        const input = node(field.options ? 'select' : 'input'); input.id = id; input.name = field.key;
        if (field.options) input.append(new Option(`All ${field.label === 'Company' ? 'Companies' : field.label === 'Competency' ? 'Competencies' : field.label === 'Branch' ? 'Branches' : `${field.label}s`}`, ''), ...field.options.map(([key, text]) => new Option(text, key)));
        else { input.type = field.type; if (field.type === 'number') { input.min = '0'; input.max = field.max; input.step = '1'; } else { input.maxLength = 200; input.placeholder = 'Employee name or ID'; } }
        input.value = values[field.key]; input.setAttribute('aria-describedby', 'competencyHubFilterError'); wrapper.append(input);
      }
      if (field.hint) wrapper.append(node('small', 'sch-filter-hint', field.hint));
      fields.append(wrapper);
    });
    returnFocus = document.activeElement;
    overlay.hidden = false; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false');
    $('competencyHubFilterTrigger').setAttribute('aria-expanded', 'true');
    inerted = [...document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, body > preview-top-bar')].filter(element => !element.inert);
    inerted.forEach(element => { element.inert = true; });
    form.querySelector('input,select').focus();
  }
  function closeFilter() {
    overlay.hidden = true; overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true');
    $('competencyHubFilterTrigger').setAttribute('aria-expanded', 'false');
    inerted.forEach(element => { element.inert = false; }); inerted = [];
    returnFocus?.focus({ preventScroll: true }); returnFocus = null;
  }
  function applyFilter(event) {
    event.preventDefault(); clearError();
    let invalid = [...form.querySelectorAll('input')].find(input => !input.validity.valid);
    let message = 'Enter a whole number within the displayed range.';
    schemas[active].filter(field => field.range).forEach(field => {
      const min = form.elements[`${field.key}Min`], max = form.elements[`${field.key}Max`];
      if (!invalid && min.value !== '' && max.value !== '' && Number(min.value) > Number(max.value)) { invalid = min; message = `${field.label}: minimum must be on or below maximum.`; }
    });
    if (invalid) { $('competencyHubFilterError').textContent = message; $('competencyHubFilterError').hidden = false; invalid.setAttribute('aria-invalid', 'true'); invalid.focus(); return; }
    const values = Object.fromEntries(keys(schemas[active]).map(key => [paramKey(active, key), form.elements[key].value.trim()]));
    closeFilter(); change({ ...values, gapSkill: null, hubChart: null });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => change({ tab: tab.dataset.competencyTab, hubChart: null }));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)
        ? (index + ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[event.key]) + 4) % 4 : null;
      if (next != null) { event.preventDefault(); tabs[next].focus(); tabs[next].click(); }
    });
  });
  document.querySelectorAll('[data-gap-sign]').forEach(button => button.addEventListener('click', () => change({ gapSign: button.dataset.gapSign, gapSkill: null, hubChart: null })));
  $('competencyHubResults').addEventListener('click', event => { const button = event.target.closest('[data-gap-skill]'); if (button) change({ gapSkill: button.dataset.gapSkill, hubChart: null }, true); });
  $('competencyGapAll').addEventListener('click', () => change({ gapSkill: null }, true));
  $('competencyHubViewChart').addEventListener('click', () => change({ hubChart: params.get('hubChart') === '1' ? null : '1' }));
  $('competencyHubFilterTrigger').addEventListener('click', openFilter);
  $('competencyHubCloseFilter').addEventListener('click', closeFilter);
  $('competencyHubResetFilter').addEventListener('click', () => { form.querySelectorAll('input,select').forEach(input => { input.value = ''; }); clearError(); });
  form.addEventListener('submit', applyFilter); form.addEventListener('input', clearError);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeFilter(); });
  $('staffCompetencyBack').addEventListener('click', event => {
    if (active === 'staff') return;
    if (params.get('hubChart') === '1' || (active === 'gap' && params.get('gapSkill'))) {
      event.preventDefault(); event.stopImmediatePropagation();
      change(params.get('hubChart') === '1' ? { hubChart: null } : { gapSkill: null }, true);
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overlay.hidden) { event.preventDefault(); closeFilter(); return; }
    if (event.key !== 'Tab' || overlay.hidden) return;
    const controls = [...form.querySelectorAll('button,input,select')].filter(control => !control.disabled && control.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  });
  window.addEventListener('popstate', () => { if (!overlay.hidden) closeFilter(); render(); });
  new MutationObserver(() => { if (active !== 'staff') render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('DOMContentLoaded', render);
})();
