(() => {
  document.getElementById('performanceRequestFields').replaceWith(PerformanceRequestForm.appraisalFields(false));
  const source = window.PERFORMANCE_GOAL_PLAN;
  const $ = id => document.getElementById(id);
  const RETURN_TOKEN_PARAM = 'goalReturnToken';
  const SNAPSHOT_KEY_PREFIX = 'peoplehcm:performance:goal-plan:snapshot:';
  const RESULT_KEY_PREFIX = 'peoplehcm:performance:goal-plan:result:';
  const DRAFT_KEY = 'peoplehcm:performance:goal-plan:draft:v2';
  let section = new URLSearchParams(location.search).get('section');
  if (!['goals', 'competencies'].includes(section)) section = null;
  const isCompetency = () => section === 'competencies';
  const items = () => isCompetency() ? state.competencies : state.goals;
  const sectionName = () => isCompetency() ? 'Competency' : 'Performance Goal';
  const state = {
    status: source.status,
    goals: source.goals.map(goal => ({ ...goal })),
    competencies: source.competencies.map(item => ({ ...item })),
    selectedId: null
  };
  let activeOverlay = null;
  let returnFocus = null;
  let inerted = [];
  let toastTimer = null;

  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const icon = name => {
    const element = node('i', `fa-solid ${name}`);
    element.setAttribute('aria-hidden', 'true');
    return element;
  };
  const selectedGoal = () => items().find(goal => goal.id === state.selectedId);
  const currentTheme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const readSession = key => {
    try { return window.sessionStorage.getItem(key); } catch { return null; }
  };
  const writeSession = (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const removeSession = key => {
    try { window.sessionStorage.removeItem(key); } catch {}
  };
  const parseJson = value => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  };

  function syncBack() {
    $('goalPlanBack').href = section ? `goal-plan.html?theme=${currentTheme()}` : `../index.html?scope=individual&theme=${currentTheme()}`;
    $('goalPlanCancel').href = '../index.html?scope=individual&theme=' + currentTheme();
    $('goalPlanBack').setAttribute('aria-label', section ? 'Back to Goal Plan' : 'Back to Performance');
  }

  function persist() {
    writeSession(DRAFT_KEY, JSON.stringify({ status: state.status, goals: state.goals, competencies: state.competencies }));
  }

  function openGoalPage(goal = null) {
    persist();
    const token = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const stored = writeSession(`${SNAPSHOT_KEY_PREFIX}${token}`, JSON.stringify({
      token,
      status: state.status,
      goals: state.goals,
      competencies: state.competencies
    }));
    const params = new URLSearchParams({ theme: currentTheme(), [RETURN_TOKEN_PARAM]: token });
    if (isCompetency()) params.set('kind', 'competency');
    if (goal) {
      params.set('goalId', goal.id);
      if (!stored) params.set('goalSeed', JSON.stringify(goal));
    }
    window.location.assign(`performance-goal.html?${params.toString()}`);
  }

  function beginAddGoal() {
    if (isCompetency()) return;
    openGoalPage();
  }

  function consumeGoalReturn() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get(RETURN_TOKEN_PARAM);
    if (!token) return false;
    const snapshotKey = `${SNAPSHOT_KEY_PREFIX}${token}`;
    const resultKey = `${RESULT_KEY_PREFIX}${token}`;
    const snapshot = parseJson(readSession(snapshotKey));
    const result = parseJson(readSession(resultKey));
    removeSession(snapshotKey);
    removeSession(resultKey);

    if (snapshot?.token === token && Array.isArray(snapshot.goals)) {
      state.goals = snapshot.goals.map(goal => ({ ...goal }));
      state.status = snapshot.status || 'Draft';
      if (Array.isArray(snapshot.competencies)) state.competencies = snapshot.competencies.map(item => ({ ...item }));
    }

    let returnedGoal = result?.token === token ? result.goal : null;
    if (!returnedGoal && params.has('goalPayload')) returnedGoal = parseJson(params.get('goalPayload'));
    if (returnedGoal && typeof returnedGoal === 'object' && returnedGoal.id && returnedGoal.title) {
      const collection = items();
      const index = collection.findIndex(goal => goal.id === returnedGoal.id);
      if (index >= 0) {
        collection[index] = { ...collection[index], ...returnedGoal };
        state.status = 'Draft';
        persist();
        return 'updated';
      }
      collection.push({ ...returnedGoal });
      state.status = 'Draft';
      persist();
      return 'added';
    }
    return '';
  }

  function showToast(message) {
    const toast = $('goalPlanToast');
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function releaseOverlay(restoreFocus) {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay = null;
    inerted.forEach(element => { element.inert = false; });
    inerted = [];
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    if (restoreFocus) returnFocus = null;
  }

  function openOverlay(overlay, initialFocus) {
    const origin = returnFocus || document.activeElement;
    releaseOverlay(false);
    returnFocus = origin;
    activeOverlay = overlay;
    overlay.hidden = false;
    inerted = [...overlay.parentElement.children].filter(element => element !== overlay && !element.inert);
    inerted.forEach(element => { element.inert = true; });
    requestAnimationFrame(() => initialFocus?.focus({ preventScroll: true }));
  }

  function closeOverlay() {
    releaseOverlay(true);
  }

  function renderEmployee() {
    const employee = source.employee;
    $('goalPlanEmployeeName').value = employee.name;
    $('goalPlanPosition').value = employee.position;
    $('goalPlanDepartment').value = employee.department;
    $('goalPlanSupervisorName').value = employee.supervisor.name + '  #' + String(employee.supervisor.empNo).replace(/^#/, '');
    $('goalPlanReportingName').value = employee.reportingTo.name + '  #' + String(employee.reportingTo.empNo).replace(/^#/, '');
    $('goalPlanPeriod').value = source.period;
    $('goalPlanAppraisalType').value = source.appraisalType;
  }

  function renderCard(goal) {
    const card = PerformanceRequestForm.itemCard(goal, section, false);
    const actions = node('div', 'goal-plan-card-actions');
    const update = node('button', 'goal-plan-card-update');
    update.type = 'button';
    update.append(icon('fa-pen-to-square'));
    update.setAttribute('aria-label', `Edit ${goal.title}`);
    update.title = 'Edit';
    update.addEventListener('click', () => openGoalPage(goal));
    actions.append(update);
    if (!isCompetency()) {
      const remove = node('button', 'goal-plan-card-delete');
      remove.type = 'button';
      remove.append(icon('fa-trash-can'));
      remove.setAttribute('aria-label', 'Delete ' + goal.title);
      remove.title = 'Delete';
      remove.addEventListener('click', () => {
        state.selectedId = goal.id;
        openDelete();
      });
      actions.append(remove);
    }
    card.querySelector('header').append(actions);
    return card;
  }

  function totalWeightage(collection = items()) {
    return collection.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);
  }

  function render() {
    $('goalPlanGeneral').hidden = !!section;
    $('goalPlanDetailView').hidden = !section;
    document.querySelector('.goal-plan-footer').hidden = !!section;
    $('goalPlanTitle').textContent = section ? sectionName() : 'Goal Plan';
    $('goalPlanListTitle').textContent = sectionName();
    $('goalPlanAdd').hidden = isCompetency();
    $('goalPlanAdd').setAttribute('aria-label', `Add ${sectionName()}`);
    $('goalPlanEmptyMessage').textContent = 'Click "+" above to add your first record.';
    $('goalPlanListIcon').replaceChildren(icon(isCompetency() ? 'fa-award' : 'fa-bullseye'));
    $('goalPlanEmpty').querySelector('i').className = `fa-solid ${isCompetency() ? 'fa-award' : 'fa-bullseye'}`;
    $('goalPlanGoalsSummary').textContent = `${state.goals.length} items added`;
    $('goalPlanCompetenciesSummary').textContent = `${state.competencies.length} items added`;
    $('goalPlanCards').replaceChildren(...items().map(renderCard));
    $('goalPlanEmpty').hidden = items().length > 0;
    syncBack();
  }

  function openDelete() {
    if (isCompetency()) return;
    const goal = selectedGoal();
    if (!goal) return;
    $('goalDeleteTitle').textContent = isCompetency() ? 'Delete Competency?' : 'Delete Goal?';
    $('goalDeleteCancel').textContent = isCompetency() ? 'Keep Competency' : 'Keep Goal';
    $('goalDeleteMessage').textContent = `"${goal.title}" will be removed from your Goal Plan.`;
    openOverlay($('goalDeleteOverlay'), $('goalDeleteCancel'));
  }

  function submitPlan() {
    if (!state.goals.length) {
      showToast('Add at least one goal before submitting.');
      return;
    }
    if (!state.competencies.length) {
      showToast('Add at least one competency before submitting.');
      return;
    }
    if (Math.abs(totalWeightage(state.goals) - 100) > .001 || Math.abs(totalWeightage(state.competencies) - 100) > .001) {
      showToast('Performance Goal and Competency weightage must each equal 100.00% before submitting.');
      return;
    }
    try {
      PerformanceSubmissions.appraisal('goal-plan', source, state.goals, state.competencies);
    } catch {
      showToast('Unable to save the submission. Your goal plan is still here.');
      return;
    }
    state.status = 'Submitted';
    persist();
    render();
    showToast('Goal Plan submitted successfully.');
  }

  $('goalPlanAdd').addEventListener('click', beginAddGoal);

  $('goalDeleteCancel').addEventListener('click', closeOverlay);

  $('goalDeleteConfirm').addEventListener('click', () => {
    if (isCompetency()) return;
    const goal = selectedGoal();
    if (!goal) return;
    state.goals = state.goals.filter(item => item.id !== goal.id);
    state.selectedId = null;
    state.status = 'Draft';
    persist();
    render();
    closeOverlay();
    showToast(`${sectionName()} deleted.`);
  });

  $('goalPlanSaveDraft').addEventListener('click', () => {
    state.status = 'Draft';
    persist();
    render();
    showToast('Goal Plan draft saved.');
  });
  $('goalPlanSubmit').addEventListener('click', submitPlan);

  [$('goalDeleteOverlay')].forEach(overlay => {
    overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(); });
  });
  document.addEventListener('keydown', event => {
    if (!activeOverlay) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...activeOverlay.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.querySelectorAll('[data-plan-section]').forEach(button => button.addEventListener('click', () => {
    section = button.dataset.planSection;
    const url = new URL(location.href);
    url.searchParams.set('section', section);
    history.pushState(null, '', url);
    render();
    document.querySelector('.goal-plan-content').scrollTop = 0;
  }));
  $('goalPlanBack').addEventListener('click', event => {
    if (!section) return;
    event.preventDefault();
    section = null;
    const url = new URL(location.href);
    url.searchParams.delete('section');
    url.searchParams.delete(RETURN_TOKEN_PARAM);
    history.pushState(null, '', url);
    render();
    document.querySelector('.goal-plan-content').scrollTop = 0;
  });
  window.addEventListener('popstate', () => {
    const value = new URLSearchParams(location.search).get('section');
    section = ['goals', 'competencies'].includes(value) ? value : null;
    render();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const draft = parseJson(readSession(DRAFT_KEY));
    if (draft && Array.isArray(draft.goals) && Array.isArray(draft.competencies)) {
      state.goals = draft.goals;
      state.competencies = draft.competencies;
      state.status = draft.status || 'Draft';
    }
    const returnedAction = consumeGoalReturn();
    renderEmployee();
    syncBack();
    render();
    if (returnedAction) showToast(`${sectionName()} ${returnedAction}.`);
  });
})();
