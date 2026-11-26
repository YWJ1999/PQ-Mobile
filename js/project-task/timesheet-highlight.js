/* Team Timesheet Highlight: one filtered activity set drives every report view. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    if (!$('timesheetHighlightTable')) return;
    const data = window.TIMESHEET_HIGHLIGHT_DATA || [];
    const latestDate = data.reduce((latest, row) => row.date > latest ? row.date : latest, '');
    const defaults = { keyword: '', start: latestDate ? latestDate.slice(0, 4) + '-01-01' : '', end: latestDate, project: '', task: '' };
    const metrics = [['project', 'Project'], ['task', 'Task'], ['branch', 'Branch'], ['department', 'Department'], ['section', 'Section'], ['grade', 'Grade'], ['supervisor', 'Supervisor']];
    const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#94a3b8'];
    const state = { filters: { ...defaults }, records: [], employees: [], view: 'table', chartMetric: 'project', showAll: false };
    const main = document.querySelector('.timesheet-highlight-content');
    const phone = document.querySelector('.phone-container');
    let activeModal = null;
    let returnFocus = null;
    let inertElements = [];

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    const hours = value => Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sum = rows => rows.reduce((total, row) => total + row.hours, 0);
    const dateLabel = date => new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const metricLabel = key => metrics.find(metric => metric[0] === key)[1];
    const pluralMetric = key => key === 'branch' ? 'branches' : metricLabel(key).toLowerCase() + 's';
    const uniqueValues = (rows, key) => [...new Set(rows.map(row => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    function options(select, values, allLabel) {
      select.replaceChildren();
      if (allLabel) select.add(new Option(allLabel, ''));
      values.forEach(value => select.add(new Option(value, value)));
    }
    function populateTaskOptions(value = '') {
      const project = $('timesheetFilterProject').value;
      options($('timesheetFilterTask'), uniqueValues(data.filter(row => !project || row.project === project), 'task'), 'All Tasks');
      $('timesheetFilterTask').value = value;
      if ($('timesheetFilterTask').selectedIndex < 0) $('timesheetFilterTask').value = '';
    }
    function populateFilter() {
      $('timesheetFilterKeyword').value = state.filters.keyword;
      $('timesheetFilterStart').value = state.filters.start;
      $('timesheetFilterEnd').value = state.filters.end;
      $('timesheetFilterProject').value = state.filters.project;
      populateTaskOptions(state.filters.task);
      $('timesheetFilterError').hidden = true;
      $('timesheetFilterEnd').removeAttribute('aria-invalid');
    }
    function openModal(id, trigger) {
      if (activeModal) closeModal();
      activeModal = $(id);
      returnFocus = trigger || document.activeElement;
      inertElements = [...phone.children].filter(node => node !== activeModal && !node.inert);
      inertElements.forEach(node => { node.inert = true; });
      activeModal.hidden = false;
      // Reflow starts the same sheet / popup transition used by other highlights.
      void activeModal.offsetHeight;
      activeModal.classList.add('active');
      activeModal.querySelector('input, button, select')?.focus({ preventScroll: true });
    }
    function closeModal() {
      if (!activeModal) return;
      activeModal.classList.remove('active');
      activeModal.hidden = true;
      inertElements.forEach(node => { node.inert = false; });
      activeModal = null;
      inertElements = [];
      returnFocus?.focus({ preventScroll: true });
    }
    function aggregateEmployees(rows) {
      const grouped = new Map();
      rows.forEach(row => {
        if (!grouped.has(row.empNo)) grouped.set(row.empNo, { empNo: row.empNo, name: row.name, hours: 0 });
        grouped.get(row.empNo).hours += row.hours;
      });
      return [...grouped.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
    }
    function filterRecords() {
      const filter = state.filters;
      const keyword = filter.keyword.toLowerCase();
      state.records = data.filter(row =>
        (!filter.start || row.date >= filter.start) && (!filter.end || row.date <= filter.end) &&
        (!filter.project || row.project === filter.project) && (!filter.task || row.task === filter.task) &&
        (!keyword || [row.name, '#' + row.empNo, row.project, row.task].join(' ').toLowerCase().includes(keyword))
      );
      state.employees = aggregateEmployees(state.records);
    }
    function rangeLabel() {
      const { start, end } = state.filters;
      if (start && end) return dateLabel(start) + ' – ' + dateLabel(end);
      if (start) return 'From ' + dateLabel(start);
      if (end) return 'Up to ' + dateLabel(end);
      return 'All Dates';
    }
    function renderTable() {
      const tbody = $('timesheetHighlightTable').tBodies[0];
      tbody.replaceChildren();
      state.employees.forEach(employee => {
        const tr = element('tr');
        tr.append(element('td', '', formatEmployeeNumber(employee.empNo)), element('td', '', employee.name));
        const cell = element('td');
        const value = element('span', 'timesheet-hour-value', hours(employee.hours));
        value.dataset.employeeHours = employee.hours;
        cell.append(value);
        tr.append(cell);
        tbody.append(tr);
      });
      $('timesheetTotalRecords').textContent = state.employees.length;
      $('timesheetTotalHours').textContent = hours(sum(state.records)) + ' hrs';
      $('timesheetEmpty').hidden = state.records.length > 0;
      const filters = state.filters;
      const summary = [filters.keyword ? 'Search: ' + filters.keyword : 'All Employees', filters.project || 'All Projects', filters.task || 'All Tasks'];
      $('timesheetFilterSummary').replaceChildren(element('span', '', summary.join(' • ')), element('span', 'timesheet-filter-date', rangeLabel()));
    }
    function groupHours(rows, key) {
      const grouped = new Map();
      rows.forEach(row => {
        const label = row[key] || 'Unassigned';
        grouped.set(label, (grouped.get(label) || 0) + row.hours);
      });
      return [...grouped].map(([label, value]) => ({ label, hours: value })).sort((a, b) => b.hours - a.hours || a.label.localeCompare(b.label));
    }
    function drawBreakdown(prefix, groups, total) {
      const segments = $(prefix + 'Segments');
      const legend = $(prefix + 'Legend');
      segments.replaceChildren();
      legend.replaceChildren();
      $(prefix + 'Total').textContent = hours(total);
      $(prefix + 'Donut').setAttribute('aria-label', `${hours(total)} total hours. ${groups.length} groups.`);
      const circumference = 2 * Math.PI * 70;
      let offset = 0;
      groups.forEach((group, index) => {
        const color = colors[index % colors.length];
        const percent = total > 0 ? group.hours / total : 0;
        if (percent > 0) {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          const length = percent * circumference;
          Object.entries({ cx: 90, cy: 90, r: 70, fill: 'none', stroke: color, 'stroke-width': 22, 'stroke-dasharray': `${length} ${Math.max(0, circumference - length)}`, 'stroke-dashoffset': -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = `${group.label}: ${hours(group.hours)} hours (${(percent * 100).toFixed(2)}%)`;
          circle.append(title);
          segments.append(circle);
          offset += length;
        }
        const row = element('div', 'timesheet-legend-row');
        row.dataset.groupHours = group.hours;
        const label = element('div', 'timesheet-legend-name');
        const marker = element('i');
        marker.style.backgroundColor = color;
        marker.setAttribute('aria-hidden', 'true');
        label.append(marker, element('span', '', group.label));
        row.append(label, element('strong', '', hours(group.hours)), element('span', '', (percent * 100).toFixed(2) + '%'));
        legend.append(row);
      });
      if (!groups.length) legend.append(element('p', 'timesheet-empty', 'No hours match the current filters.'));
    }
    function renderChart() {
      const key = state.chartMetric;
      const groups = groupHours(state.records, key);
      let visible = groups;
      if (groups.length > 5 && !state.showAll) visible = [...groups.slice(0, 5), { label: 'Other', hours: sum(groups.slice(5)) }];
      drawBreakdown('timesheetChart', visible, sum(state.records));
      $('timesheetChartTitle').textContent = 'Timesheet hours by ' + metricLabel(key).toLowerCase();
      $('timesheetChartColumn').textContent = metricLabel(key);
      $('timesheetChartNote').textContent = !groups.length ? 'No timesheet hours in this selection' : groups.length > 5 && !state.showAll ? `Showing top 5 ${pluralMetric(key)} + Other` : `Showing all ${pluralMetric(key)}`;
      $('timesheetChartViewAllFooter').hidden = groups.length <= 5;
      $('timesheetChartViewAll').setAttribute('aria-expanded', String(state.showAll));
      $('timesheetChartViewAll').querySelector('span').textContent = state.showAll ? 'Show top 5' : 'View all ' + pluralMetric(key);
      $('timesheetChartViewAll').querySelector('i').className = 'fa-solid ' + (state.showAll ? 'fa-chevron-up' : 'fa-chevron-down');
    }
    function showView(view) {
      state.view = view;
      document.querySelectorAll('[data-timesheet-view]').forEach(section => { section.hidden = section.dataset.timesheetView !== view; });
      const titles = { table: 'Timesheet Highlight', chart: 'Timesheet Hours Analysis' };
      $('timesheetPageTitle').textContent = titles[view];
      $('timesheetBack').setAttribute('aria-label', view === 'table' ? 'Back to Project and Task' : 'Back to Timesheet Highlight');
      main.scrollTop = 0;
    }
    function applyFilters(filters) {
      state.filters = filters;
      state.showAll = false;
      filterRecords();
      renderTable();
      renderChart();
      closeModal();
      main.scrollTop = 0;
    }
    function exportCsv() {
      const escape = value => {
        let text = String(value);
        if (/^[=+@\-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const lines = ['Employee No.,Name,Hours'];
      state.employees.forEach(row => lines.push([escape(formatEmployeeNumber(row.empNo)), escape(row.name), row.hours.toFixed(2)].join(',')));
      lines.push('TOTAL,,' + sum(state.records).toFixed(2));
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const anchor = element('a');
      anchor.href = href;
      anchor.download = 'timesheet-highlight.csv';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }

    metrics.forEach(([key, label]) => $('timesheetChartMetric').add(new Option(label, key)));
    options($('timesheetFilterProject'), uniqueValues(data, 'project'), 'All Projects');
    populateFilter();
    $('timesheetFilterTrigger').addEventListener('click', event => { populateFilter(); openModal('timesheetDataFilter', event.currentTarget); });
    $('timesheetFilterProject').addEventListener('change', () => populateTaskOptions($('timesheetFilterTask').value));
    $('timesheetFilterForm').addEventListener('submit', event => {
      event.preventDefault();
      const filters = { keyword: $('timesheetFilterKeyword').value.trim(), start: $('timesheetFilterStart').value, end: $('timesheetFilterEnd').value, project: $('timesheetFilterProject').value, task: $('timesheetFilterTask').value };
      if (filters.start && filters.end && filters.end < filters.start) {
        $('timesheetFilterError').textContent = 'End Date must be on or after Start Date.';
        $('timesheetFilterError').hidden = false;
        $('timesheetFilterEnd').setAttribute('aria-invalid', 'true');
        $('timesheetFilterEnd').focus();
        return;
      }
      applyFilters(filters);
    });
    $('timesheetResetFilter').addEventListener('click', () => applyFilters({ ...defaults }));
    $('timesheetViewChart').addEventListener('click', () => { renderChart(); showView('chart'); });
    $('timesheetChartMetric').addEventListener('change', event => { state.chartMetric = event.target.value; state.showAll = false; renderChart(); });
    $('timesheetChartViewAll').addEventListener('click', () => { state.showAll = !state.showAll; renderChart(); });
    $('timesheetExportExcel').addEventListener('click', exportCsv);
    $('timesheetExportPdf').addEventListener('click', () => window.print());
    $('timesheetBack').addEventListener('click', () => {
      if (state.view === 'table') {
        const theme = typeof getCurrentTheme === 'function' ? getCurrentTheme() : document.documentElement.dataset.theme;
        location.href = '../index.html?scope=team&theme=' + encodeURIComponent(theme || 'dark');
      } else showView('table');
    });
    document.querySelectorAll('[data-timesheet-close]').forEach(button => button.addEventListener('click', closeModal));
    document.querySelectorAll('.timesheet-modal-overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); }));
    document.addEventListener('keydown', event => {
      if (!activeModal) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeModal(); }
      if (event.key === 'Tab') {
        const focusable = [...activeModal.querySelectorAll('button, input, select, a[href]')].filter(node => !node.disabled && node.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    applyFilters({ ...defaults });
  });
})();
