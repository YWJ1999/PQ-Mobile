(() => {
  const report = window.EMPLOYEE_CAREER_ACTIVE_HEADCOUNT || { asAt: '2026-10-12', statuses: [], employees: [] };
  const $ = id => document.getElementById(id);
  const state = {
    view: 'chart',
    selectedStatus: null,
    statusTrigger: null,
    employeeTrigger: null,
    inertedElements: []
  };
  const total = report.statuses.reduce((sum, status) => sum + status.count, 0);

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }


  function formatDate(value) {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function renderChart() {
    const circumference = 2 * Math.PI * 70;
    let offset = 0;
    $('activeHeadcountChartTotal').textContent = String(total);
    $('activeHeadcountAsAt').textContent = 'As At ' + formatDate(report.asAt);
    $('activeHeadcountChartSegments').replaceChildren();
    $('activeHeadcountChartLegend').replaceChildren();

    report.statuses.forEach(status => {
      const length = total ? status.count / total * circumference : 0;
      const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      Object.entries({
        cx: 90,
        cy: 90,
        r: 70,
        fill: 'none',
        stroke: status.color,
        'stroke-width': 22,
        'stroke-dasharray': `${length} ${circumference - length}`,
        'stroke-dashoffset': -offset
      }).forEach(([key, value]) => segment.setAttribute(key, value));
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${status.label}: ${status.count} (${(status.count / total * 100).toFixed(2)}%)`;
      segment.append(title);
      $('activeHeadcountChartSegments').append(segment);
      offset += length;

      const row = node('div', 'staff-list-legend-row active-headcount-legend-grid');
      row.dataset.headcountChartStatus = status.id;
      const name = node('div', 'staff-list-legend-name');
      const swatch = node('i');
      swatch.style.background = status.color;
      swatch.setAttribute('aria-hidden', 'true');
      name.append(swatch, node('span', 'active-headcount-status-label', status.label));
      row.append(
        name,
        node('strong', 'active-headcount-status-count', String(status.count)),
        node('span', '', (status.count / total * 100).toFixed(2) + '%')
      );
      $('activeHeadcountChartLegend').append(row);
    });
  }

  function renderSummary() {
    $('activeHeadcountSummaryTotalRecords').textContent = String(report.statuses.length);
    const list = $('activeHeadcountSummaryList');
    list.replaceChildren();
    report.statuses.forEach(status => {
      const row = node('tr', 'active-headcount-summary-row');
      row.tabIndex = 0;
      row.dataset.headcountStatusSummary = status.id;
      row.setAttribute('aria-label', `View ${status.count} ${status.label} active staff records`);
      const label = node('th', 'active-headcount-status-label', status.label);
      label.scope = 'row';
      row.append(label, node('td', 'active-headcount-status-count', String(status.count)));
      row.addEventListener('click', () => showStaff(status, row));
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          showStaff(status, row);
        }
      });
      list.append(row);
    });
  }

  function renderStaff(status) {
    const employees = report.employees.filter(employee => employee.status === status.id);
    $('activeHeadcountStaffTotalRecords').textContent = String(employees.length);
    const list = $('activeHeadcountStaffList');
    list.replaceChildren();

    employees.forEach(employee => {
      const card = node('button', 'manpower-employee-card active-headcount-employee-card');
      card.type = 'button';
      card.dataset.empNo = employee.empNo;
      card.setAttribute('aria-label', `View employee details for ${employeeCardHeading.text(employee.empNo, employee.name)}`);

      const identity = node('span', 'manpower-employee-identity');
      identity.append(node('span', 'employee-name', employeeCardHeading.text(employee.empNo, employee.name)));
      const details = node('span', 'manpower-employee-card-details');
      const grade = node('span', 'manpower-employee-card-row');
      grade.append(node('span', '', 'Grade'), node('strong', 'active-headcount-employee-grade', employee.grade));
      const position = node('span', 'manpower-employee-card-row');
      position.append(node('span', '', 'Position'), node('strong', 'active-headcount-employee-position', employee.position));
      details.append(grade, position);
      card.append(identity, details);
      card.addEventListener('click', () => openEmployeeDetails(employee, card));
      list.append(card);
    });
  }

  function setPageInert(inert) {
    const overlay = $('activeHeadcountEmployeeOverlay');
    if (inert) {
      if (state.inertedElements.length) return;
      const previewBar = document.querySelector('preview-top-bar');
      const targets = [
        ...(previewBar ? [previewBar] : []),
        ...[...overlay.parentElement.children].filter(element => element !== overlay)
      ];
      state.inertedElements = targets.map(element => ({ element, inert: element.inert }));
      targets.forEach(element => { element.inert = true; });
      return;
    }
    state.inertedElements.forEach(({ element, inert: previous }) => {
      if (element.isConnected) element.inert = previous;
    });
    state.inertedElements = [];
  }

  function employeeInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '?';
  }

  function openEmployeeDetails(employee, trigger) {
    const values = [
      ['Employee No.', formatEmployeeNumber(employee.empNo)],
      ['Name', employee.name],
      ['Position', employee.position],
      ['Superior', employee.superior],
      ['Job', employee.job],
      ['Company', employee.company],
      ['Branch', employee.branch],
      ['Base', employee.base],
      ['Division', employee.division],
      ['Department', employee.department],
      ['Section', employee.section],
      ['Cost Center', employee.costCenter],
      ['Line', employee.line],
      ['Service Years', Number(employee.serviceYears).toFixed(2)]
    ];
    const body = $('activeHeadcountEmployeeDetails').tBodies[0];
    body.replaceChildren();
    values.forEach(([label, value]) => {
      const row = node('tr');
      const heading = node('th', '', label);
      heading.scope = 'row';
      row.append(heading, node('td', '', value || '—'));
      body.append(row);
    });

    const portrait = $('activeHeadcountEmployeePortrait');
    portrait.replaceChildren();
    if (employee.photo) {
      const image = node('img');
      image.src = employee.photo;
      image.alt = `${employee.name} portrait`;
      image.addEventListener('error', () => {
        const avatar = node('span', 'manpower-employee-avatar active-headcount-employee-avatar', employeeInitials(employee.name));
        avatar.setAttribute('aria-hidden', 'true');
        portrait.replaceChildren(avatar);
      }, { once: true });
      portrait.append(image);
    } else {
      const avatar = node('span', 'manpower-employee-avatar active-headcount-employee-avatar', employeeInitials(employee.name));
      avatar.setAttribute('aria-hidden', 'true');
      portrait.append(avatar);
    }

    state.employeeTrigger = trigger;
    const overlay = $('activeHeadcountEmployeeOverlay');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    setPageInert(true);
    $('activeHeadcountEmployeeClose').focus({ preventScroll: true });
  }

  function closeEmployeeDetails(restoreFocus = true) {
    const overlay = $('activeHeadcountEmployeeOverlay');
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    setPageInert(false);
    if (restoreFocus && state.employeeTrigger?.isConnected) {
      state.employeeTrigger.focus({ preventScroll: true });
    }
  }

  function showView(view) {
    state.view = view;
    $('activeHeadcountChartView').hidden = view !== 'chart';
    $('activeHeadcountSummaryView').hidden = view !== 'summary';
    $('activeHeadcountStaffView').hidden = view !== 'staff';
    $('activeHeadcountTitle').textContent = view === 'summary'
      ? 'Staff Summary By Status'
      : view === 'staff'
        ? `${state.selectedStatus.label} Active Staff Records`
        : 'Active Headcount';
    $('activeHeadcountBack').setAttribute('aria-label', view === 'chart' ? 'Back to Employee and Career' : 'Back to previous Active Headcount view');
    document.querySelector('main').scrollTop = 0;
  }

  function showStaff(status, trigger) {
    state.selectedStatus = status;
    state.statusTrigger = trigger;
    renderStaff(status);
    showView('staff');
    $('activeHeadcountStatus').textContent = `${status.count} ${status.label} active staff records shown.`;
  }

  function trapModalFocus(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEmployeeDetails();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...$('activeHeadcountEmployeeOverlay').querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
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

  function init() {
    renderChart();
    renderSummary();
    $('activeHeadcountDetails').addEventListener('click', () => {
      showView('summary');
      $('activeHeadcountStatus').textContent = 'Eight active staff status groups shown.';
    });
    $('activeHeadcountBack').addEventListener('click', event => {
      if (state.view === 'chart') {
        const dashboard = new URL('../../index.html', location.href);
        dashboard.searchParams.set('scope', 'team');
        dashboard.searchParams.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
        $('activeHeadcountBack').href = dashboard.href;
        return;
      }
      event.preventDefault();
      if (state.view === 'staff') {
        showView('summary');
        state.statusTrigger?.focus({ preventScroll: true });
      } else {
        showView('chart');
        $('activeHeadcountDetails').focus({ preventScroll: true });
      }
    });
    $('activeHeadcountEmployeeClose').addEventListener('click', () => closeEmployeeDetails());
    $('activeHeadcountEmployeeOverlay').addEventListener('click', event => {
      if (event.target === event.currentTarget) closeEmployeeDetails();
    });
    $('activeHeadcountEmployeeOverlay').addEventListener('keydown', trapModalFocus);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
