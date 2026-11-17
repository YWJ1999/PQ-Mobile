(() => {
  const source = window.EMPLOYEE_CAREER_ORG_CHART;
  const $ = id => document.getElementById(id);
  const defaults = { keyword: '', unit: '', maximumLevel: '', skipVacant: 'no' };
  const state = { filters: { ...defaults }, marginX: 26, marginY: 14 };
  let activeSheet, sheetTrigger;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function flatten(node, rows = []) {
    if (!node) return rows;
    rows.push(node);
    (node.children || []).forEach(child => flatten(child, rows));
    return rows;
  }

  function matches(node, filters) {
    if (filters.skipVacant === 'yes' && node.status === 'vacant') return false;
    const unitMatches = !filters.unit || node.unit === filters.unit;
    return unitMatches && (!filters.keyword || node.empNo === filters.keyword);
  }

  function prune(node, level = 1) {
    const maximum = Number(state.filters.maximumLevel || Infinity);
    if (level > maximum) return null;
    const children = (node.children || []).map(child => prune(child, level + 1)).filter(Boolean);
    if (!matches(node, state.filters) && children.length === 0) return null;
    return { ...node, children };
  }

  function metric(text) {
    return element('span', 'org-chart-metric', text);
  }

  function renderNode(node, level) {
    const branch = element('li', 'org-chart-branch');
    branch.dataset.level = String(level);
    const card = element('article', `org-chart-node org-chart-node-card is-${node.status}${node.status === 'vacant' ? '' : ' org-chart-employee'}`);
    card.dataset.nodeId = node.id;
    card.setAttribute('aria-label', node.status === 'vacant' ? `Vacant ${node.position}` : `${node.name}, ${node.position}`);

    const avatar = element('span', 'org-chart-avatar', node.initials);
    avatar.dataset.tone = node.tone || 'violet';
    avatar.setAttribute('aria-hidden', 'true');
    const content = element('span', 'org-chart-card-content');
    content.append(element('strong', 'org-chart-name', node.name));
    if (node.empNo) content.append(element('span', 'org-chart-employee-id', `#${node.empNo}`));
    else content.append(element('span', 'org-chart-vacant-label', 'Vacant role'));
    content.append(element('span', 'org-chart-position', node.position));
    const metrics = element('span', 'org-chart-metrics');
    if (node.status === 'vacant') metrics.append(metric(node.unit));
    else metrics.append(metric(`${node.age} yrs old`), metric(`${Number(node.serviceYears).toFixed(1)} yrs service`));
    content.append(metrics);
    card.append(avatar, content);
    branch.append(card);

    if (node.children?.length) {
      const children = element('ul', 'org-chart-children');
      children.append(...node.children.map(child => renderNode(child, level + 1)));
      branch.append(children);
    }
    return branch;
  }

  function filterSummary() {
    const parts = [];
    if (state.filters.keyword) {
      const employee = flatten(source).find(node => node.empNo === state.filters.keyword);
      if (employee) parts.push(`Employee: ${employee.name}`);
    }
    if (state.filters.unit) parts.push(state.filters.unit);
    if (state.filters.maximumLevel) parts.push(`Max ${state.filters.maximumLevel} levels`);
    if (state.filters.skipVacant === 'yes') parts.push('Vacant roles hidden');
    return parts.join(' / ') || 'All organization units and levels';
  }

  function render() {
    const tree = prune(source);
    const visible = flatten(tree);
    $('orgChartTree').replaceChildren(...(tree ? [renderNode(tree, 1)] : []));
    $('orgChartVisibleCount').textContent = String(visible.length);
    $('orgChartFilterSummary').textContent = filterSummary();
    $('orgChartEmpty').hidden = visible.length > 0;
  }

  function setSpacing() {
    const tree = $('orgChartTree');
    tree.style.setProperty('--org-margin-x', `${state.marginX}px`);
    tree.style.setProperty('--org-margin-y', `${state.marginY}px`);
    $('orgChartMarginXValue').textContent = String(state.marginX);
    $('orgChartMarginYValue').textContent = String(state.marginY);
    $('orgChartMarginXDecrease').disabled = state.marginX <= 14;
    $('orgChartMarginXIncrease').disabled = state.marginX >= 40;
    $('orgChartMarginYDecrease').disabled = state.marginY <= 8;
    $('orgChartMarginYIncrease').disabled = state.marginY >= 28;
  }

  function changeSpacing(axis, amount) {
    const key = axis === 'x' ? 'marginX' : 'marginY';
    const minimum = axis === 'x' ? 14 : 8;
    const maximum = axis === 'x' ? 40 : 28;
    state[key] = Math.max(minimum, Math.min(maximum, state[key] + amount));
    setSpacing();
  }

  function populateUnits() {
    const units = [...new Set(flatten(source).map(node => node.unit).filter(Boolean))].sort();
    for (const unit of units) {
      const option = element('option', '', unit);
      option.value = unit;
      $('orgChartFilterUnit').append(option);
    }
  }

  function populateEmployees() {
    const employees = flatten(source)
      .filter(node => node.empNo && node.status !== 'vacant')
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const employee of employees) {
      const option = element('option', '', employee.name);
      option.value = employee.empNo;
      $('orgChartFilterKeyword').append(option);
    }
  }

  function setControls(filters) {
    $('orgChartFilterKeyword').value = filters.keyword;
    $('orgChartFilterUnit').value = filters.unit;
    $('orgChartFilterLevel').value = filters.maximumLevel;
    $('orgChartFilterSkipVacant').value = filters.skipVacant;
  }

  function setBackgroundInert(inert) {
    document.querySelector('.employee-career-header').inert = inert;
    document.querySelector('.employee-career-content').inert = inert;
    document.querySelector('phone-bottom-nav').inert = inert;
  }

  function openSheet(trigger, initialFocus) {
    if (activeSheet) return;
    activeSheet = $(trigger.getAttribute('aria-controls'));
    sheetTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    activeSheet.hidden = false;
    activeSheet.classList.add('is-open');
    setBackgroundInert(true);
    initialFocus.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!activeSheet) return;
    activeSheet.hidden = true;
    activeSheet.classList.remove('is-open');
    activeSheet = null;
    setBackgroundInert(false);
    sheetTrigger.setAttribute('aria-expanded', 'false');
    sheetTrigger.focus({ preventScroll: true });
    sheetTrigger = null;
  }

  function applyFilter(event) {
    event.preventDefault();
    state.filters = {
      keyword: $('orgChartFilterKeyword').value.trim(),
      unit: $('orgChartFilterUnit').value,
      maximumLevel: $('orgChartFilterLevel').value,
      skipVacant: $('orgChartFilterSkipVacant').value
    };
    render();
    closeSheet();
  }

  function init() {
    if (!source || !$('orgChartTree')) return;
    populateEmployees();
    populateUnits();
    setControls(defaults);
    setSpacing();
    render();
    $('orgChartFilterTrigger').addEventListener('click', event => {
      setControls(state.filters);
      openSheet(event.currentTarget, $('orgChartFilterKeyword'));
    });
    $('orgChartLayoutTrigger').addEventListener('click', event => openSheet(event.currentTarget, $('orgChartLayoutTitle')));
    document.querySelectorAll('.org-chart-sheet').forEach(sheet => sheet.addEventListener('click', event => {
      if (event.target === sheet || event.target.closest('[data-close-chart-sheet]')) closeSheet();
    }));
    $('orgChartResetFilter').addEventListener('click', () => setControls(defaults));
    $('orgChartFilterForm').addEventListener('submit', applyFilter);
    $('orgChartMarginXDecrease').addEventListener('click', () => changeSpacing('x', -2));
    $('orgChartMarginXIncrease').addEventListener('click', () => changeSpacing('x', 2));
    $('orgChartMarginYDecrease').addEventListener('click', () => changeSpacing('y', -2));
    $('orgChartMarginYIncrease').addEventListener('click', () => changeSpacing('y', 2));
    document.addEventListener('keydown', event => {
      if (!activeSheet) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSheet();
      } else if (event.key === 'Tab') {
        const controls = activeSheet.querySelectorAll('button:enabled, select:enabled');
        const first = controls[0], last = controls[controls.length - 1];
        const focused = document.activeElement;
        if (!activeSheet.contains(focused) || (event.shiftKey ? focused === first || focused.tabIndex < 0 : focused === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
