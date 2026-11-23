(() => {
  const source = window.PERFORMANCE_GOAL_PROGRESS;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'peoplehcm:performance:goal-progress:v1';
  const state = {
    goals: source.goals.map(goal => ({ ...goal, records: [] })),
    selectedId: null,
    editingRecordId: null,
    drafts: {},
    workingRecords: [],
    status: 'Draft',
    filters: { period: '', evaluationType: '' }
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function icon(name) {
    const element = node('i', `fa-solid ${name}`);
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-MY', { maximumFractionDigits: 2 }).format(Number(value));
  }

  function formatDate(value) {
    if (!value) return 'No updates yet';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  function latestRecord(goal) {
    return goal.records.reduce((latest, record) => !latest || record.date >= latest.date ? record : latest, null);
  }

  function detail(label, value) {
    const item = node('div', 'goal-progress-detail');
    item.append(node('dt', '', label), node('dd', '', value));
    return item;
  }

  function achievedText(goal) {
    const latest = latestRecord(goal);
    return latest ? `${formatNumber(latest.achievedValue)} ${goal.unit} · ${formatNumber(latest.achievedPercent)}%` : `0 ${goal.unit} · 0%`;
  }

  function renderCard(goal) {
    const card = node('article', 'goal-progress-card');
    const header = node('header', 'goal-progress-card-header');
    const headerCopy = node('div');
    headerCopy.append(
      node('small', 'goal-progress-card-category', goal.category),
      node('h3', 'goal-progress-card-title', goal.title),
      node('span', 'goal-progress-card-context', `${goal.kra} · Unit: ${goal.unit}`)
    );
    header.append(headerCopy);

    const body = node('dl', 'goal-progress-card-body');
    const latest = latestRecord(goal);
    body.append(
      detail('Description', goal.description),
      detail('Target', goal.target),
      detail('Weightage', `${formatNumber(goal.weightage)}%`),
      detail('Deadline', formatDate(goal.deadline)),
      detail('Last Update', formatDate(latest?.date)),
      detail('Achieved', achievedText(goal))
    );

    const footer = node('footer', 'goal-progress-card-footer');
    const update = node('button', 'goal-progress-update', 'Edit progress');
    update.type = 'button';
    update.dataset.goalId = goal.id;
    update.addEventListener('click', () => showUpdate(goal.id));
    footer.append(update);
    card.append(header, body, footer);
    return card;
  }

  function filteredGoals() {
    const period = state.filters.period;
    const type = state.filters.evaluationType;
    return state.goals.filter(goal => (!period || goal.period === period) && (!type || goal.evaluationType === type));
  }

  function renderCards() {
    const goals = filteredGoals();
    $('goalProgressCards').replaceChildren(...goals.map(renderCard));
    $('goalProgressTotal').textContent = String(goals.length);
    $('goalProgressEmpty').hidden = goals.length > 0;
    $('goalProgressFilterSummary').textContent = `${state.filters.period || 'All Periods'} • ${state.filters.evaluationType || 'All Evaluation Types'}`;
  }

  function setFilterBackgroundInert(value) {
    document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, .phone-container > #goalProgressToast, body > preview-top-bar').forEach(element => { element.inert = value; });
  }
  function openFilter() {
    $('goalProgressPeriodFilter').value = state.filters.period;
    $('goalProgressEvaluationFilter').value = state.filters.evaluationType;
    $('goalProgressFilterModal').classList.add('active'); $('goalProgressFilterModal').setAttribute('aria-hidden', 'false');
    $('goalProgressFilterTrigger').setAttribute('aria-expanded', 'true'); setFilterBackgroundInert(true);
    $('goalProgressPeriodFilter').focus();
  }
  function closeFilter() {
    $('goalProgressFilterModal').classList.remove('active'); $('goalProgressFilterModal').setAttribute('aria-hidden', 'true');
    $('goalProgressFilterTrigger').setAttribute('aria-expanded', 'false'); setFilterBackgroundInert(false);
    $('goalProgressFilterTrigger').focus({ preventScroll: true });
  }

  function selectedGoal() {
    return state.goals.find(goal => goal.id === state.selectedId) || null;
  }

  function clearError() {
    $('goalProgressFormError').hidden = true;
    $('goalProgressForm').querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
  }

  function clearForm() {
    $('goalProgressForm').reset();
    state.editingRecordId = null;
    clearError();
  }

  function showError(message, field) {
    $('goalProgressFormError').textContent = message;
    $('goalProgressFormError').hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.focus({ preventScroll: true });
  }

  function formValues() {
    const numberValue = id => $(id).value === '' ? null : Number($(id).value);
    return {
      id: state.editingRecordId || `PROGRESS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: $('goalProgressDate').value,
      hours: numberValue('goalProgressHours'),
      achievedValue: numberValue('goalProgressAchievedValue'),
      achievedPercent: numberValue('goalProgressAchievedPercent'),
      remark: $('goalProgressRemark').value.trim()
    };
  }

  function validate(record) {
    if (!record.date) return ['Date is required.', $('goalProgressDate')];
    const date = new Date(`${record.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== record.date) return ['Enter a valid date.', $('goalProgressDate')];
    if (record.hours === null) return ['Hours Spent is required.', $('goalProgressHours')];
    if (!Number.isFinite(record.hours) || record.hours <= 0) return ['Hours Spent must be more than 0.', $('goalProgressHours')];
    if (record.achievedValue === null) return ['Achieved Value is required.', $('goalProgressAchievedValue')];
    if (!Number.isFinite(record.achievedValue) || record.achievedValue < 0) return ['Achieved Value cannot be negative.', $('goalProgressAchievedValue')];
    if (record.achievedPercent === null) return ['Achieved % is required.', $('goalProgressAchievedPercent')];
    if (!Number.isFinite(record.achievedPercent) || record.achievedPercent < 0 || record.achievedPercent > 100) return ['Achieved % must be between 0 and 100.', $('goalProgressAchievedPercent')];
    return null;
  }

  const copyRecords = records => records.map(record => ({ ...record }));

  function restoreSession() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== 'object') return;
      // Only restore complete, valid records belonging to known goals.
      const validRecords = records => Array.isArray(records) && records.every(record => record && typeof record.id === 'string' && typeof record.remark === 'string' && record.remark.length <= 500 && !validate(record)) && new Set(records.map(record => record.id)).size === records.length;
      state.goals.forEach(goal => {
        const savedGoal = saved[goal.id];
        if (validRecords(savedGoal?.records)) goal.records = copyRecords(savedGoal.records);
        if (validRecords(savedGoal?.draft)) state.drafts[goal.id] = copyRecords(savedGoal.draft);
      });
    } catch { /* An unavailable or invalid session starts with the source goals. */ }
  }

  function persist(records, drafts) {
    const saved = Object.fromEntries(state.goals.map(goal => [goal.id, {
      records: goal.id === state.selectedId ? records : goal.records,
      draft: drafts[goal.id] ?? null
    }]));
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return true;
    } catch {
      overviewError('Unable to save this session. Your progress is still on this page. Please try again.');
      return false;
    }
  }

  function overviewError(message) {
    $('goalProgressOverviewError').textContent = message;
    $('goalProgressOverviewError').hidden = false;
    $('goalProgressOverviewError').scrollIntoView({ block: 'nearest' });
  }

  function markChanged() {
    state.status = 'Unsaved';
    $('goalProgressOverviewError').hidden = true;
  }

  function renderHistory() {
    const goal = selectedGoal(), records = state.workingRecords;
    $('goalProgressEntries').replaceChildren(...records.map((record, index) => {
      const card = node('article', 'goal-progress-entry');
      const header = node('div', 'goal-progress-entry-header');
      const toggle = node('button', 'goal-progress-entry-toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', `progress-entry-${index}`);
      const glyph = node('span', 'goal-progress-section-icon'); glyph.append(icon('fa-chart-line'));
      const copy = node('span', 'goal-progress-entry-copy');
      copy.append(node('strong', '', formatDate(record.date)), node('small', '', `${formatNumber(record.hours)} hrs · ${formatNumber(record.achievedValue)} ${goal.unit}`));
      toggle.append(glyph, copy, node('strong', 'goal-progress-entry-percent', `${formatNumber(record.achievedPercent)}%`), icon('fa-chevron-down'));
      const body = node('dl', 'goal-progress-entry-body'); body.id = `progress-entry-${index}`; body.hidden = true;
      body.append(detail('Date', formatDate(record.date)), detail('Hours Spent', `${formatNumber(record.hours)} hrs`), detail('Achieved Value', `${formatNumber(record.achievedValue)} ${goal.unit}`), detail('Achieved %', `${formatNumber(record.achievedPercent)}%`), detail('Remark', record.remark || '—'));
      toggle.addEventListener('click', () => {
        body.hidden = !body.hidden;
        toggle.setAttribute('aria-expanded', String(!body.hidden));
      });
      const actions = node('div', 'goal-progress-row-actions');
      const edit = node('button', 'goal-progress-row-action goal-progress-edit');
      edit.type = 'button'; edit.title = 'Edit';
      edit.setAttribute('aria-label', `Edit progress from ${formatDate(record.date)}`);
      edit.append(icon('fa-pen-to-square'));
      edit.addEventListener('click', () => openEntry(record));
      const remove = node('button', 'goal-progress-row-action goal-progress-delete');
      remove.type = 'button'; remove.title = 'Delete';
      remove.setAttribute('aria-label', `Delete progress from ${formatDate(record.date)}`);
      remove.append(icon('fa-trash'));
      remove.addEventListener('click', () => {
        state.workingRecords = state.workingRecords.filter(item => item.id !== record.id);
        markChanged(); renderHistory();
        ($('goalProgressEntries').querySelectorAll('.goal-progress-delete')[Math.min(index, state.workingRecords.length - 1)] || $('goalProgressNew')).focus({ preventScroll: true });
      });
      actions.append(edit, remove); header.append(toggle, actions); card.append(header, body);
      return card;
    }));
    $('goalProgressHistoryEmpty').hidden = records.length > 0;
    const hours = records.reduce((sum, record) => sum + record.hours, 0);
    $('goalProgressHistoryCount').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'} · Total Hours: ${formatNumber(hours)} hrs`;
    $('goalProgressDraftStatus').textContent = state.status;
  }

  function resetScroll() { document.querySelector('.goal-progress-content').scrollTop = 0; }

  function openEntry(record = null) {
    clearForm();
    if (record) {
      state.editingRecordId = record.id;
      $('goalProgressDate').value = record.date;
      $('goalProgressHours').value = record.hours;
      $('goalProgressAchievedValue').value = record.achievedValue;
      $('goalProgressAchievedPercent').value = record.achievedPercent;
      $('goalProgressRemark').value = record.remark;
    }
    const title = `${record ? 'Edit' : 'Add'} Progress Details`;
    $('goalProgressEntryHeading').textContent = title;
    $('goalProgressEntryContext').textContent = `${selectedGoal().kra} · Unit: ${selectedGoal().unit}`;
    $('goalProgressTitle').textContent = title;
    $('goalProgressBack').setAttribute('aria-label', 'Back to Edit Goal Progress');
    $('goalProgressOverviewView').hidden = true;
    $('goalProgressEntryView').hidden = false;
    resetScroll();
    $('goalProgressDate').focus({ preventScroll: true });
  }

  function showOverview() {
    clearForm();
    $('goalProgressEntryView').hidden = true;
    $('goalProgressOverviewView').hidden = false;
    $('goalProgressTitle').textContent = 'Edit Goal Progress';
    $('goalProgressBack').setAttribute('aria-label', 'Back to Goal Progress');
    renderHistory(); resetScroll();
    $('goalProgressNew').focus({ preventScroll: true });
  }

  function showUpdate(goalId) {
    const goal = state.goals.find(item => item.id === goalId);
    if (!goal) return;
    state.selectedId = goalId;
    state.workingRecords = copyRecords(state.drafts[goalId] ?? goal.records);
    state.status = state.drafts[goalId] ? 'Draft' : goal.records.length ? 'Submitted' : 'Draft';
    $('goalProgressCategory').textContent = goal.category;
    $('goalProgressFormHeading').textContent = goal.kra;
    $('goalProgressUnit').textContent = `Unit: ${goal.unit}`;
    $('goalProgressValueUnit').textContent = goal.unit;
    $('goalProgressOverviewError').hidden = true;
    $('goalProgressListView').hidden = true;
    $('goalProgressUpdateView').hidden = false;
    showOverview();
  }

  function showList() {
    $('goalProgressUpdateView').hidden = true;
    $('goalProgressListView').hidden = false;
    $('goalProgressTitle').textContent = 'Goal Progress';
    $('goalProgressBack').setAttribute('aria-label', 'Back to Performance');
    renderCards();
    resetScroll();
    [...document.querySelectorAll('.goal-progress-update')].find(button => button.dataset.goalId === state.selectedId)?.focus({ preventScroll: true });
    state.workingRecords = []; clearForm();
  }

  function syncBack() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    $('goalProgressBack').href = `../index.html?scope=individual&theme=${theme}`;
  }

  function showToast(message) {
    const toast = $('goalProgressToast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    source.periods.forEach(period => $('goalProgressPeriodFilter').append(new Option(period, period)));
    source.evaluationTypes.forEach(type => $('goalProgressEvaluationFilter').append(new Option(type, type)));
    $('goalProgressFilterTrigger').addEventListener('click', openFilter);
    $('goalProgressCloseFilter').addEventListener('click', closeFilter);
    $('goalProgressResetFilter').addEventListener('click', () => $('goalProgressFilterForm').reset());
    $('goalProgressFilterForm').addEventListener('submit', event => {
      event.preventDefault();
      state.filters = { period: $('goalProgressPeriodFilter').value, evaluationType: $('goalProgressEvaluationFilter').value };
      renderCards(); closeFilter();
    });
    $('goalProgressFilterModal').addEventListener('click', event => { if (event.target === event.currentTarget) closeFilter(); });
    document.addEventListener('keydown', event => {
      const modal = $('goalProgressFilterModal'); if (!modal.classList.contains('active')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeFilter(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button,select')].filter(element => !element.disabled && element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    $('goalProgressBack').addEventListener('click', event => {
      if ($('goalProgressUpdateView').hidden) return;
      event.preventDefault();
      if (!$('goalProgressEntryView').hidden) showOverview();
      else showList();
    });
    $('goalProgressNew').addEventListener('click', () => openEntry());
    $('goalProgressEntryCancel').addEventListener('click', showOverview);
    $('goalProgressCancel').addEventListener('click', showList);
    $('goalProgressSaveDraft').addEventListener('click', () => {
      const drafts = { ...state.drafts, [state.selectedId]: copyRecords(state.workingRecords) };
      if (!persist(selectedGoal().records, drafts)) return;
      state.drafts = drafts; state.status = 'Draft';
      $('goalProgressOverviewError').hidden = true;
      renderHistory(); showToast('Progress draft saved.');
    });
    $('goalProgressSubmit').addEventListener('click', () => {
      if (!state.workingRecords.length) { overviewError('Add at least one progress item before submitting.'); return; }
      const records = copyRecords(state.workingRecords), drafts = { ...state.drafts };
      delete drafts[state.selectedId];
      if (!persist(records, drafts)) return;
      selectedGoal().records = records; state.drafts = drafts;
      showList(); showToast('Progress submitted.');
    });
    $('goalProgressForm').addEventListener('input', clearError);
    $('goalProgressForm').addEventListener('change', clearError);
    $('goalProgressForm').addEventListener('submit', event => {
      event.preventDefault();
      clearError();
      const record = formValues();
      const error = validate(record);
      if (error) {
        showError(...error);
        return;
      }
      const isEditing = state.editingRecordId !== null;
      if (isEditing) {
        const index = state.workingRecords.findIndex(item => item.id === state.editingRecordId);
        if (index < 0) { showError('Progress record not found. Clear the form and try again.', $('goalProgressDate')); return; }
        state.workingRecords[index] = record;
      } else state.workingRecords.push(record);
      markChanged(); showOverview();
      showToast(isEditing ? 'Progress updated.' : 'Progress added.');
    });
    syncBack();
    restoreSession();
    renderCards();
  });

  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
