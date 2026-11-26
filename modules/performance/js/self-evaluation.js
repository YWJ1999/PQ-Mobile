(() => {
  document.getElementById('performanceRequestFields').replaceWith(PerformanceRequestForm.appraisalFields(true));
  const store = window.SelfEvaluationStore;
  const source = store?.get() || window.PERFORMANCE_SELF_EVALUATION || {};
  const $ = id => document.getElementById(id);
  let section = new URLSearchParams(location.search).get('kind');
  if (!['goals', 'competencies'].includes(section)) section = null;
  let toastTimer;

  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const title = () => section === 'competencies' ? 'Competency' : 'Goal';
  const items = () => section ? source[section] || [] : [];
  const icon = name => { const node = document.createElement('i'); node.className = 'fa-solid ' + name; node.setAttribute('aria-hidden', 'true'); return node; };
  const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };

  function syncLinks() {
    const home = '../index.html?scope=individual&theme=' + theme();
    $('selfEvaluationCancel').href = home;
    $('selfEvaluationBack').href = section ? 'self-evaluation.html?theme=' + theme() : home;
    $('selfEvaluationBack').setAttribute('aria-label', section ? 'Back to Self Evaluation' : 'Back to Performance');
    document.querySelectorAll('[data-self-evaluation-link]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('theme', theme());
      link.href = url.href;
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    $('selfEvaluationToast').textContent = message;
    $('selfEvaluationToast').classList.add('show');
    toastTimer = setTimeout(() => $('selfEvaluationToast').classList.remove('show'), 2400);
  }

  function renderCard(item) {
    const card = PerformanceRequestForm.itemCard(item, section, true);
    const update = element('a', 'goal-plan-card-update self-evaluation-update');
    update.href = 'self-evaluation-item.html?kind=' + encodeURIComponent(section) + '&item=' + encodeURIComponent(item.id) + '&theme=' + theme();
    update.dataset.selfEvaluationLink = '';
    update.setAttribute('aria-label', 'Edit ' + item.title);
    update.append(icon('fa-pen-to-square'));
    const actions = element('div', 'goal-plan-card-actions');
    actions.append(update);
    card.querySelector('header').append(actions);
    return card;
  }

  function render() {
    $('selfEvaluationGeneralView').hidden = Boolean(section);
    $('selfEvaluationDetailView').hidden = !section;
    $('selfEvaluationPageTitle').textContent = section ? title() : 'Self Evaluation';
    if (section) {
      $('selfEvaluationListTitle').textContent = title();
      $('selfEvaluationListIcon').replaceChildren(icon(section === 'competencies' ? 'fa-award' : 'fa-bullseye'));
      $('selfEvaluationAdd').hidden = section === 'competencies';
      $('selfEvaluationCards').replaceChildren(...items().map(renderCard));
    }
    syncLinks();
    document.querySelector('.self-evaluation-content')?.scrollTo({ top: 0, behavior: 'instant' });
  }

  function openSection(next) {
    section = next;
    const url = new URL(location.href);
    url.searchParams.set('kind', section);
    url.searchParams.delete('item');
    history.pushState(null, '', url);
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const employee = source.employee || {};
    $('selfEvaluationName').value = employee.name || '—';
    $('selfEvaluationPosition').value = employee.position || '—';
    $('selfEvaluationDepartment').value = employee.department || '—';
    $('selfEvaluationSupervisor').value = (employee.supervisor?.name || '—') + (employee.supervisor?.empNo ? '  ' + formatEmployeeNumber(employee.supervisor.empNo) : '');
    $('selfEvaluationReportTo').value = (employee.reportingTo?.name || '—') + (employee.reportingTo?.empNo ? '  ' + formatEmployeeNumber(employee.reportingTo.empNo) : '');
    $('selfEvaluationRef').value = source.evaluationRef || '—';
    $('selfEvaluationPeriod').value = source.period || '—';
    $('selfEvaluationType').value = source.type || '—';
    $('selfEvaluationGoalsSummary').textContent = (source.goals?.length || 0) + ' items';
    $('selfEvaluationCompetenciesSummary').textContent = (source.competencies?.length || 0) + ' items';
    document.querySelectorAll('[data-evaluation-section]').forEach(button => button.addEventListener('click', () => openSection(button.dataset.evaluationSection)));
    $('selfEvaluationAdd').addEventListener('click', () => {
      if (section !== 'goals') return;
      location.assign('self-evaluation-item.html?kind=goals&mode=add&theme=' + theme());
    });
    $('selfEvaluationBack').addEventListener('click', event => { if (!section) return; event.preventDefault(); section = null; history.pushState(null, '', 'self-evaluation.html?theme=' + theme()); render(); });
    $('selfEvaluationDraft').addEventListener('click', () => { sessionStorage.setItem('pq_self_evaluation_status_v1', 'Draft'); showToast('Self Evaluation draft saved.'); });
    $('selfEvaluationSubmit').addEventListener('click', () => {
      try {
        PerformanceSubmissions.appraisal('self-evaluation', source, source.goals, source.competencies);
        sessionStorage.setItem('pq_self_evaluation_status_v1', 'Submitted');
        showToast('Self Evaluation submitted successfully.');
      } catch {
        showToast('Unable to save the submission. Your evaluation is still here.');
      }
    });
    window.addEventListener('popstate', () => { const value = new URLSearchParams(location.search).get('kind'); section = ['goals', 'competencies'].includes(value) ? value : null; render(); });
    render();
  });
  new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
