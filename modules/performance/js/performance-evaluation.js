(() => {
  const $ = id => document.getElementById(id);
  const store = window.PerformanceEvaluationStore;
  const params = new URLSearchParams(location.search);
  const filterKeys = ['keyword', 'company', 'department', 'job', 'period', 'type'];
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const display = value => value === '' || value == null ? '—' : String(value);
  const employeeId = value => value ? `#${String(value).replace(/^#+/, '')}` : '';
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  function route(file, values = {}, remove = []) {
    const url = new URL(file, location.href);
    url.search = location.search;
    remove.forEach(key => url.searchParams.delete(key));
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    url.searchParams.set('theme', theme());
    return url.href;
  }

  function link(href, label, className = '') {
    const node = element('a', className, label);
    node.href = href;
    node.dataset.evaluationLink = '';
    return node;
  }

  function syncLinks() {
    document.querySelectorAll('a[data-evaluation-link]').forEach(node => {
      const url = new URL(node.href);
      url.searchParams.set('theme', theme());
      node.href = url.href;
    });
  }

  function field(id, labelText, value, multiline = false, key = '') {
    const wrapper = element('div', 'goal-form-field');
    const label = element('label', '', labelText);
    label.htmlFor = id;
    const control = element(multiline ? 'textarea' : 'input');
    control.id = id;
    control.readOnly = true;
    control.value = display(value);
    if (multiline) control.rows = 1;
    else control.type = 'text';
    if (key) control.dataset.field = key;
    wrapper.append(label, control);
    return wrapper;
  }

  function fitTextareas() {
    document.querySelectorAll('textarea[readonly]').forEach(control => {
      control.style.height = 'auto';
      control.style.height = `${control.scrollHeight + control.offsetHeight - control.clientHeight}px`;
    });
  }

  function observeForm() {
    fitTextareas();
    document.fonts.ready.then(fitTextareas);
    new ResizeObserver(fitTextareas).observe(document.querySelector('main'));
  }

  function notFound(formId, message) {
    $(formId).hidden = true;
    $('evaluationNotFound').hidden = false;
    $('evaluationNotFoundMessage').textContent = message;
  }

  function initList() {
    let filters = Object.fromEntries(filterKeys.map(key => [key, (params.get(key) || '').trim()]));
    $('evaluationBack').href = `../index.html?scope=team&theme=${theme()}`;
    const records = store.all();
    const metadata = { company: record => record.company, department: record => record.employee.department,
      job: record => record.employee.position, period: record => record.period, type: record => record.type };
    for (const [key, value] of Object.entries(metadata)) {
      [...new Set(records.map(value).filter(Boolean))].sort().forEach(text => {
        $('evaluationFilterForm').elements[key].append(new Option(text, text));
      });
    }

    function render() {
      const url = new URL(location.href);
      for (const key of filterKeys) {
        if (filters[key]) url.searchParams.set(key, filters[key]);
        else url.searchParams.delete(key);
      }
      url.searchParams.set('theme', theme());
      history.replaceState(null, '', url);
      const keyword = filters.keyword.toLowerCase();
      const visible = store.all().filter(record => (!keyword || [record.employee.name, employeeId(record.employee.empNo), record.evaluationRef,
        record.company, record.employee.department, record.employee.position, record.period, record.type].join(' ').toLowerCase().includes(keyword))
        && Object.entries(metadata).every(([key, value]) => !filters[key] || value(record) === filters[key]));
      $('evaluationCards').replaceChildren(...visible.map(record => {
        const card = element('article', 'evaluation-card');
        card.dataset.evaluationId = record.id;
        const header = element('header', 'evaluation-card-header');
        header.append(element('h2', 'evaluation-employee-name', display(record.employee.name)),
          element('span', 'evaluation-employee-id', employeeId(record.employee.empNo)),
          element('span', 'evaluation-reference', display(record.evaluationRef)));
        const details = element('dl', 'evaluation-card-details');
        for (const [label, value] of [['Period', record.period], ['Type', record.type]]) {
          const row = element('div');
          row.append(element('dt', '', label), element('dd', '', display(value)));
          details.append(row);
        }
        const footer = element('div', 'evaluation-card-footer');
        const update = link(route('performance-evaluation-form.html', { evaluation: record.id }, ['kind', 'item']), 'Update', 'evaluation-update');
        update.setAttribute('aria-label', `Update evaluation for ${record.employee.name}, ${record.evaluationRef}`);
        footer.append(update);
        card.append(header, details, footer);
        return card;
      }));
      $('evaluationTotalRecords').textContent = String(visible.length);
      $('evaluationEmpty').hidden = visible.length > 0;
      $('evaluationFilterSummary').textContent = filterKeys.map(key => filters[key]).filter(Boolean).join(' • ') || 'All Performance Evaluations';
    }

    let inerted = [];
    function closeFilter() {
      $('evaluationFilterOverlay').hidden = true;
      $('evaluationFilterOverlay').classList.remove('is-open');
      $('evaluationFilterTrigger').setAttribute('aria-expanded', 'false');
      inerted.forEach(node => { node.inert = false; });
      inerted = [];
      $('evaluationFilterTrigger').focus({ preventScroll: true });
    }
    $('evaluationFilterTrigger').addEventListener('click', () => {
      filterKeys.forEach(key => { $('evaluationFilterForm').elements[key].value = filters[key]; });
      $('evaluationFilterOverlay').hidden = false;
      $('evaluationFilterOverlay').classList.add('is-open');
      $('evaluationFilterTrigger').setAttribute('aria-expanded', 'true');
      inerted = [...document.querySelectorAll('.phone-container > header, .phone-container > main, .phone-container > phone-bottom-nav, body > preview-top-bar')].filter(node => !node.inert);
      inerted.forEach(node => { node.inert = true; });
      $('evaluationFilterKeyword').focus();
    });
    $('evaluationCloseFilter').addEventListener('click', closeFilter);
    $('evaluationResetFilter').addEventListener('click', () => $('evaluationFilterForm').reset());
    $('evaluationFilterOverlay').addEventListener('click', event => { if (event.target === $('evaluationFilterOverlay')) closeFilter(); });
    $('evaluationFilterForm').addEventListener('submit', event => {
      event.preventDefault();
      filters = Object.fromEntries(filterKeys.map(key => [key, $('evaluationFilterForm').elements[key].value.trim()]));
      render();
      closeFilter();
      document.querySelector('main').scrollTop = 0;
    });
    document.addEventListener('keydown', event => {
      if ($('evaluationFilterOverlay').hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeFilter(); }
      if (event.key !== 'Tab') return;
      const controls = [...$('evaluationFilterForm').querySelectorAll('button, input, select')].filter(node => !node.disabled && node.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    });
    window.addEventListener('popstate', () => {
      const query = new URLSearchParams(location.search);
      filters = Object.fromEntries(filterKeys.map(key => [key, query.get(key) || '']));
      render();
    });
    render();
  }

  function initDetails() {
    const record = store.all().find(record => record.id === params.get('evaluation'));
    $('evaluationBack').href = route('performance-evaluation.html', {}, ['evaluation', 'kind', 'item']);
    if (!record) { notFound('evaluationDetailsForm', 'This performance evaluation is unavailable. Return to the list to select a record.'); return; }

    const employee = record.employee;
    const general = $('evaluationGeneralFields');
    const period = element('div', 'goal-form-grid');
    period.append(field('evaluationPeriod', 'Period', record.period), field('evaluationType', 'Type', record.type));
    const documentFields = element('div', 'goal-form-grid');
    const statusField = element('div', 'goal-form-field');
    const statusLabel = element('label', '', 'Status');
    const statusValue = element('output');
    statusValue.id = 'evaluationStatus';
    statusLabel.htmlFor = statusValue.id;
    statusValue.append(recordDetailStatus.create(record.status));
    statusField.append(statusLabel, statusValue);
    documentFields.append(statusField, field('evaluationDocumentDate', 'Document Date', record.documentDate));
    general.replaceChildren(field('evaluationName', 'Name', employee.name), field('evaluationPosition', 'Position', employee.position),
      field('evaluationDepartment', 'Department', employee.department), field('evaluationSupervisor', 'Supervisor', employee.supervisor?.name),
      field('evaluationReportTo', 'Report To', employee.reportingTo?.name), field('evaluationRef', 'Evaluation Ref#', record.evaluationRef),
      period, documentFields, field('evaluationRemark', 'Remark', record.remark, true));

    $('evaluationGoalsSummary').textContent = (record.goals || []).length + ' items';
    $('evaluationCompetenciesSummary').textContent = (record.competencies || []).length + ' items';

    const decisionLabels = { Approved: 'approved', Resubmit: 'sent for resubmission', Cancelled: 'cancelled', Rejected: 'rejected' };
    document.querySelectorAll('[data-evaluation-decision]').forEach(button => button.addEventListener('click', () => {
      const status = button.dataset.evaluationDecision;
      store.setStatus(record.id, status);
      record.status = status;
      statusValue.replaceChildren(recordDetailStatus.create(status));
      $('evaluationDecisionMessage').textContent = 'Performance Evaluation ' + decisionLabels[status] + '.';
    }));
    let section = ['goals', 'competencies'].includes(params.get('kind')) ? params.get('kind') : null;
    let pendingDeleteId = null;
    const sectionTitle = () => section === 'competencies' ? 'Competency' : 'Goal';
    const sectionItems = () => section ? record[section] || [] : [];

    function detailRow(label, value, key) {
      const row = element('div', 'goal-plan-item-field');
      const output = element('dd', '', display(value));
      if (key) output.dataset.field = key;
      row.append(element('dt', '', label), output);
      return row;
    }

    function renderItem(item) {
      const title = sectionTitle();
      const card = element('article', 'goal-plan-card evaluation-summary-item');
      card.dataset.itemId = item.id;
      const header = element('header', 'goal-plan-card-header');
      const toggle = element('button', 'goal-plan-item-toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      const icon = element('span', 'goal-plan-item-icon');
      icon.append(element('i', 'fa-solid ' + (section === 'competencies' ? 'fa-award' : 'fa-bullseye')));
      const rating = item.rating == null ? '—' : item.rating + ' / 5';
      const chevron = element('i', 'fa-solid fa-chevron-down goal-plan-item-chevron');
      toggle.append(icon, element('strong', 'goal-plan-card-title', display(item.title)), element('strong', 'goal-plan-item-weight', rating), chevron);

      const actions = element('div', 'goal-plan-card-actions');
      const update = link(route('performance-evaluation-item.html', { evaluation: record.id, kind: section, item: item.id }), '', 'goal-plan-card-update evaluation-update');
      update.setAttribute('aria-label', 'Update ' + title.toLowerCase() + ': ' + item.title);
      update.append(element('i', 'fa-solid fa-pen-to-square'));
      actions.append(update);
      if (section === 'goals') {
        const remove = element('button', 'goal-plan-card-delete');
        remove.type = 'button';
        remove.title = 'Delete';
        remove.setAttribute('aria-label', 'Delete ' + item.title);
        remove.append(element('i', 'fa-solid fa-trash'));
        remove.addEventListener('click', () => {
          pendingDeleteId = item.id;
          $('evaluationDeleteMessage').textContent = '"' + item.title + '" will be removed from this Performance Evaluation.';
          $('evaluationDeleteOverlay').hidden = false;
          $('evaluationDeleteCancel').focus();
        });
        actions.append(remove);
      }
      header.append(toggle, actions);

      const details = element('div', 'goal-plan-card-body goal-plan-item-details');
      details.hidden = true;
      const fields = element('dl', 'goal-plan-item-fields');
      fields.append(detailRow('Title', item.title, 'title'), detailRow('Weightage', item.weightage == null ? '—' : item.weightage + '%', 'weightage'),
        detailRow('Rating', rating, 'rating'), detailRow('Remark', item.remark, 'remark'));
      details.append(fields);
      toggle.addEventListener('click', () => {
        details.hidden = !details.hidden;
        toggle.setAttribute('aria-expanded', String(!details.hidden));
      });
      card.append(header, details);
      return card;
    }

    function renderSection() {
      $('evaluationGeneralView').hidden = Boolean(section);
      $('evaluationDetailView').hidden = !section;
      if (!section) return;
      $('evaluationListTitle').textContent = sectionTitle();
      const icon = element('i', 'fa-solid ' + (section === 'competencies' ? 'fa-award' : 'fa-bullseye'));
      icon.setAttribute('aria-hidden', 'true');
      $('evaluationListIcon').replaceChildren(icon);
      $('evaluationAdd').hidden = section !== 'goals';
      $('evaluationSectionItems').replaceChildren(...sectionItems().map(renderItem));
      const selected = [...$('evaluationSectionItems').children].find(node => node.dataset.itemId === params.get('item'));
      selected?.querySelector('a')?.focus({ preventScroll: true });
      document.querySelector('main').scrollTop = 0;
    }

    function openSection(next) {
      section = next;
      const url = new URL(location.href);
      url.searchParams.set('kind', next);
      url.searchParams.delete('item');
      history.pushState(null, '', url);
      renderSection();
    }

    document.querySelectorAll('[data-evaluation-details]').forEach(button => button.addEventListener('click', () => openSection(button.dataset.evaluationDetails)));
    $('evaluationAdd').addEventListener('click', () => {
      if (section !== 'goals') return;
      location.assign(route('performance-evaluation-item.html', { evaluation: record.id, kind: 'goals', mode: 'add' }));
    });
    $('evaluationDeleteCancel').addEventListener('click', () => {
      pendingDeleteId = null;
      $('evaluationDeleteOverlay').hidden = true;
    });
    $('evaluationDeleteConfirm').addEventListener('click', () => {
      if (!pendingDeleteId) return;
      store.deleteGoal(record.id, pendingDeleteId);
      record.goals = record.goals.filter(item => item.id !== pendingDeleteId);
      pendingDeleteId = null;
      $('evaluationDeleteOverlay').hidden = true;
      $('evaluationGoalsSummary').textContent = record.goals.length + ' items';
      renderSection();
    });
    $('evaluationDeleteOverlay').addEventListener('click', event => {
      if (event.target !== event.currentTarget) return;
      pendingDeleteId = null;
      event.currentTarget.hidden = true;
    });
    $('evaluationBack').addEventListener('click', event => {
      if (!section) return;
      event.preventDefault();
      section = null;
      const url = new URL(location.href);
      url.searchParams.delete('kind');
      url.searchParams.delete('item');
      history.pushState(null, '', url);
      renderSection();
    });
    window.addEventListener('popstate', () => {
      const kind = new URLSearchParams(location.search).get('kind');
      section = ['goals', 'competencies'].includes(kind) ? kind : null;
      renderSection();
    });
    $('evaluationDetailsForm').addEventListener('submit', event => event.preventDefault());
    observeForm();
    renderSection();
  }

  function initItem() {
    const record = store.all().find(record => record.id === params.get('evaluation'));
    const kind = params.get('kind');
    const title = kind === 'competencies' ? 'Competency' : 'Goal';
    const adding = kind === 'goals' && params.get('mode') === 'add';
    const item = adding ? { title: '', weightage: '', rating: '', remark: '' }
      : ['goals', 'competencies'].includes(kind) ? record?.[kind]?.find(item => item.id === params.get('item')) : null;
    const returnUrl = () => record
      ? route('performance-evaluation-form.html', { evaluation: record.id, kind }, ['mode', 'item'])
      : route('performance-evaluation.html', {}, ['evaluation', 'kind', 'item', 'mode']);
    $('evaluationBack').href = returnUrl();
    $('evaluationItemCancel').href = returnUrl();
    if (!item) { notFound('evaluationItemForm', 'This evaluation item is unavailable. Return to the evaluation to select an item.'); return; }

    $('evaluationPageTitle').textContent = adding ? 'Add Goal' : 'Update ' + title;
    $('evaluationItemSectionTitle').textContent = title;
    $('evaluationItemContext').replaceChildren(element('strong', 'evaluation-context-name', record.employee.name),
      element('span', 'self-evaluation-employee-id', employeeId(record.employee.empNo)),
      element('span', 'evaluation-context-reference', record.evaluationRef));
    $('evaluationItemTitle').readOnly = !adding;
    $('evaluationItemWeightage').readOnly = !adding;
    $('evaluationItemTitle').value = adding ? '' : display(item.title);
    $('evaluationItemWeightage').type = adding ? 'number' : 'text';
    if (adding) {
      $('evaluationItemWeightage').min = '0.01';
      $('evaluationItemWeightage').max = '100';
      $('evaluationItemWeightage').step = '0.01';
    }
    $('evaluationItemWeightage').value = adding ? '' : item.weightage + '%';
    $('evaluationItemRating').value = item.rating ?? '';
    $('evaluationItemRemark').value = item.remark || '';
    $('evaluationItemUpdate').textContent = adding ? 'Add Goal' : 'Update';

    function clearError() {
      $('evaluationItemError').hidden = true;
      for (const control of [$('evaluationItemTitle'), $('evaluationItemWeightage'), $('evaluationItemRating'), $('evaluationItemRemark')]) control.removeAttribute('aria-invalid');
    }
    function error(message, control) {
      $('evaluationItemError').textContent = message;
      $('evaluationItemError').hidden = false;
      if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); }
    }
    $('evaluationItemForm').addEventListener('input', clearError);
    $('evaluationItemForm').addEventListener('submit', event => {
      event.preventDefault();
      clearError();
      const ratingControl = $('evaluationItemRating');
      const rating = Number(ratingControl.value);
      if (ratingControl.value.trim() === '' || !Number.isFinite(rating) || rating < 0 || rating > 5) {
        error('Enter a rating from 0 to 5.', ratingControl); return;
      }
      const remark = $('evaluationItemRemark').value.trim();
      if (remark.length > 2000) { error('Remark must be 2,000 characters or fewer.', $('evaluationItemRemark')); return; }
      try {
        if (adding) {
          const titleValue = $('evaluationItemTitle').value.trim();
          const weightage = Number($('evaluationItemWeightage').value);
          if (!titleValue) { error('Enter a goal title.', $('evaluationItemTitle')); return; }
          if (!Number.isFinite(weightage) || weightage <= 0 || weightage > 100) { error('Enter a weightage above 0 and up to 100.', $('evaluationItemWeightage')); return; }
          store.addGoal(record.id, { title: titleValue, weightage, rating, remark });
        } else store.update(record.id, kind, item.id, { rating, remark });
      } catch {
        error(adding ? 'Unable to add this goal. Please check the fields and try again.' : 'Unable to save this update. Please try again.');
        return;
      }
      location.assign(returnUrl());
    });
    observeForm();
  }
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.evaluationPage;
    if (page === 'list') initList();
    else if (page === 'details') initDetails();
    else if (page === 'item') initItem();
    syncLinks();
  });
  new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
