(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const employee = window.STAFF_COMPETENCY_DATA.find(record => record.empNo === params.get('emp'));
  const source = window.COMPETENCY_SUMMARY_DATA;
  const definition = id => source.definitions.find(item => item.id === id);
  const assignments = source.records.filter(record => record.empNo === employee?.empNo);
  const fromHub = params.get('origin') === 'hub';
  const selectedGroup = fromHub ? params.get('skillGroup') || '' : assignments.length ? definition(assignments[0].competency).skillGroup : '';
  const skillGroup = selectedGroup || (fromHub ? 'All Skill Groups' : '—');

  function backUrl() {
    if (fromHub) {
      const context = new URLSearchParams(params.get('hubReturn') || 'tab=assessment');
      context.delete('hubReturn');
      context.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      return `staff-competency.html?${context}`;
    }
    const query = new URLSearchParams(params);
    const origin = query.get('origin') === 'summary' ? 'summary' : 'staff';
    query.delete('origin');
    query.set('theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    if (employee) return `${origin === 'summary' ? 'competency-summary-employee.html' : 'staff-competency-employee.html'}?${query}`;
    return `${origin === 'summary' ? 'competency-summary.html' : 'staff-competency.html'}?theme=${query.get('theme')}`;
  }

  function syncBack() { $('staffAssessBack').href = backUrl(); }
  syncBack();
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (!employee) {
    $('staffAssessUnavailable').hidden = false;
    $('staffAssessForm').hidden = true;
    return;
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function error(message) {
    $('staffAssessError').textContent = message;
    $('staffAssessError').hidden = !message;
  }

  function currentAssignments() { return assignments.filter(record => !selectedGroup || definition(record.competency).skillGroup === selectedGroup); }

  function renderCards() {
    const rows = currentAssignments();
    $('staffAssessTotalRecords').textContent = rows.length;
    $('staffAssessSubmit').disabled = rows.length === 0;
    $('staffAssessEmpty').hidden = rows.length > 0;
    error(source.loadError);
    $('staffAssessCards').replaceChildren(...rows.map(record => {
      const skill = definition(record.competency);
      const card = node('article', 'csa-card');
      const header = node('header', 'csa-card-header'); header.append(node('h2', '', skill.title));
      const details = node('dl', 'csa-card-details');
      const required = node('div', 'csa-card-detail'), last = node('div', 'csa-card-detail');
      required.append(node('dt', '', 'Required Level'), node('dd', '', skill.requiredLevel));
      last.append(node('dt', '', 'Last Level'), node('dd', '', record.level));
      const current = node('div', 'csa-card-detail');
      current.dataset.field = 'current-level';
      current.append(node('dt', '', 'Current Level'), node('dd', '', record.level));
      const gap = node('div', 'csa-card-detail'); gap.dataset.field = 'gap';
      const value = node('dd', '', record.level - skill.requiredLevel);
      gap.append(node('dt', '', 'Gap'), value);
      details.append(required, last, current, gap);
      card.append(header, details);
      return card;
    }));
  }

  $('staffAssessEmployee').textContent = employee.name;
  $('staffAssessEmployeeId').textContent = formatEmployeeNumber(employee.empNo);
  $('staffAssessDepartment').textContent = employee.department;
  $('staffAssessPosition').textContent = employee.position;
  $('staffAssessSkillGroup').textContent = skillGroup;
  $('staffAssessForm').addEventListener('submit', event => {
    event.preventDefault();
    try {
      source.submitAssessments(employee.empNo, currentAssignments().map(record => ({ competency: record.competency, level: record.level })));
      $('staffAssessSubmit').disabled = true;
      location.href = backUrl();
    } catch (failure) {
      error(source.loadError || `Unable to save the assessment. ${failure.message || 'Please check browser storage and try again.'}`);
      $('staffAssessError').scrollIntoView({ block: 'nearest' });
    }
  });
  renderCards();
})();
