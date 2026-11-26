document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const labels = { 'guest-visit': 'Guest Visit', 'letter-request': 'Letter Request', 'inventory-request': 'Inventory Request' };
  const statuses = {
    draft: ['Draft', 'fa-floppy-disk'],
    submitted: ['Pending', 'fa-paper-plane'],
    resubmit: ['Resubmit', 'fa-rotate-right'],
    approved: ['Approved', 'fa-check'],
    rejected: ['Rejected', 'fa-xmark'],
    cancelled: ['Cancelled', 'fa-ban']
  };
  const legend = $('recordColourKey').content;
  const legendRows = legend.querySelector('ul');
  const statusFilter = $('historyStatus');
  const { currentEmployee, referenceNumber } = window.WorkplaceHistoryStore;
  const requested = new URLSearchParams(location.search).get('category');
  let kind;
  const emptyFilter = () => ({ from: '', to: '', status: '', type: '' });
  const filters = { 'guest-visit': emptyFilter(), 'letter-request': emptyFilter(), 'inventory-request': emptyFilter() };
  let records = [];
  let modal = null;
  let opener = null;
  let inerted = [];
  let samplesReady = false;
  let activeDetailRecordId = null;
  const emptyValue = '\u2014';
  const date = value => {
    if (!value) return emptyValue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' Sept ', ' Sep ');
  };
  const fieldMap = row => Object.fromEntries(row.fields);
  const fieldValue = (fields, ...names) => names.map(name => fields[name]).find(value => String(value || '').trim()) || '';
  const employeeNumber = value => formatEmployeeNumber(value) || emptyValue;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function selectCategory(category) {
    kind = category;
    // Inventory enters the approval workflow as soon as its form is submitted.
    const supported = kind === 'inventory-request' ? window.WorkplacePendingStore.statuses : Object.keys(statuses);
    statusFilter.length = 1; // Keep the All Statuses option.
    legendRows.replaceChildren();
    for (const status of supported) {
      const [label] = statuses[status];
      statusFilter.add(new Option(label, status));
      const row = node('li', 'record-key-status');
      row.dataset.status = status;
      const swatch = node('span');
      swatch.setAttribute('aria-hidden', 'true');
      row.append(swatch, label);
      legendRows.append(row);
    }
    statusFilter.value = filters[kind].status;
  }

  function statusPill(status) {
    const [label, icon] = statuses[status] || [status || 'Unknown', 'fa-circle-info'];
    const pill = node('span', 'status-pill ' + (status || 'unknown'));
    const glyph = node('i', 'fa-solid ' + icon);
    glyph.setAttribute('aria-hidden', 'true');
    pill.append(glyph, document.createTextNode(label));
    return pill;
  }


  function submissionDate(row) {
    const fields = fieldMap(row);
    return fieldValue(fields, 'Submit Date', 'Submitted Date') || (row.kind === 'letter-request' && row.status !== 'draft' ? row.date : '');
  }

  function cardContent(row) {
    const fields = fieldMap(row);
    if (row.kind === 'guest-visit') {
      return {
        title: 'Guest Visit',
        rows: [
          ['Visit Date', date(fieldValue(fields, 'Visit Date') || row.date)],
          ['Visit Time', fieldValue(fields, 'Visit Time', 'Time') || emptyValue],
          ['Visitor', fieldValue(fields, 'Visitor', 'Total Guest') || emptyValue],
          ['Location', fieldValue(fields, 'Location') || emptyValue]
        ]
      };
    }
    if (row.kind === 'letter-request') {
      return {
        title: fieldValue(fields, 'Description') || row.title,
        rows: [
          ['Type', fieldValue(fields, 'Type', 'Letter Type') || row.title],
          ['Acknowledged On', date(fieldValue(fields, 'Acknowledged On'))],
          ['Reason', fieldValue(fields, 'Reason') || emptyValue]
        ]
      };
    }
    return {
      title: fieldValue(fields, 'Inventory Item', 'Request Item', 'Inventory Type') || row.title,
      rows: [
        ...(fields['Request Date'] ? [['Request Date', date(fields['Request Date'])]] : []),
        ['Quantity', fieldValue(fields, 'Quantity') || emptyValue],
        ['UOM', fieldValue(fields, 'UOM', 'Unit') || emptyValue],
        ['Reason', fieldValue(fields, 'Reason') || emptyValue]
      ]
    };
  }

  function appendTable(parent, rows, submitDate) {
    const table = node('table', 'history-detail-table history-detail-main-table');
    const tbody = table.createTBody();
    recordSubmitDate.append(tbody, submitDate);
    for (const [label, value] of rows) {
      const tr = tbody.insertRow();
      const th = node('th', '', label);
      th.scope = 'row';
      tr.append(th);
      const cell = tr.insertCell();
      cell.dataset.detailField = label;
      if (value instanceof Node) cell.append(value);
      else cell.textContent = String(value || emptyValue);
    }
    parent.append(table);
  }

  function splitDescription(value) {
    return String(value || '').split(/\s*(?:\u2022|\u00e2\u20ac\u00a2)\s*/).map(part => part.trim());
  }

  function guestSubmission(row, fields) {
    const saved = row.guestVisit || {};
    // Earlier visits store times, people and requests as display text.
    const [startTime, endTime] = fieldValue(fields, 'Visit Time', 'Time').split(/[-–—]/)
      .map(time => time.trim().replace(/^(\d{2})(\d{2})$/, '$1:$2'));
    const otherRequest = fieldValue(fields, 'Other Request');
    const yes = value => value.trim().toLowerCase() === 'yes';
    const people = pattern => row.fields.filter(([label]) => pattern.test(label)).map(([, value]) => value);
    return {
      submitDate: saved.submitDate ?? submissionDate(row),
      visitDate: saved.visitDate ?? (fieldValue(fields, 'Visit Date') || row.date),
      startTime: saved.startTime ?? startTime,
      endTime: saved.endTime ?? endTime,
      totalGuest: saved.totalGuest ?? fieldValue(fields, 'Visitor', 'Total Guest'),
      location: saved.location ?? fieldValue(fields, 'Location'),
      meal: saved.meal ?? yes(fieldValue(fields, 'Request Meal?', 'Meal')),
      remarks: saved.remarks ?? fieldValue(fields, 'Remarks', 'Remark'),
      guests: saved.guests ?? people(/^Guest \d+$/i).map(value => {
        const [name, company, relation, position] = splitDescription(value);
        return { name, company, relation, position };
      }),
      attendees: saved.attendees ?? people(/^Attendee \d+$/i).map(value => {
        const [name, empNo, description] = value.split(/\r?\n/);
        const [department, position] = splitDescription(description);
        return { name, empNo, department, position };
      }),
      otherRequests: saved.otherRequests ?? [
        ['floor-visit', 'Floor Visit?', /floor visit/i],
        ['sitting-arrangement', 'Sit Arrange?', /(?:sit|sitting|seating) arrange/i],
        ['multiple-rooms', 'Multi Room?', /multi(?:ple)? room/i]
      ].filter(([, label, pattern]) => fields[label]?.trim() ? yes(fields[label]) : pattern.test(otherRequest))
        .map(([request]) => request),
      attachments: saved.attachments ?? fieldValue(fields, 'Attachments', 'Attachment', 'FileName')
        .split(',').map(name => name.trim()).filter(name => name && name.toLowerCase() !== 'none')
    };
  }

  function guestDetail(row, body) {
    const fields = fieldMap(row);
    const empNo = row.guestVisit?.empNo || fieldValue(fields, 'Emp No.', 'Employee No.', 'Emp #', 'Employee #') || currentEmployee.empNo;
    const name = row.guestVisit?.employeeName || fieldValue(fields, 'Name', 'Employee Name') || currentEmployee.name;
    const form = node('guest-visit-fields', 'guest-visit-page');
    body.append(form);
    form.showSubmission(guestSubmission(row, fields), date, body, [
      ['Reference #', referenceNumber(row, fields)],
      ['Status', recordDetailStatus.create(statuses[row.status]?.[0] || row.status)],
      ['Requested by', employeeCardHeading.text(empNo, name)]
    ]);
  }

  function letterDetail(row, body) {
    const fields = fieldMap(row);
    appendTable(body, [
      ['Reference #', referenceNumber(row, fields)],
      ['Status', recordDetailStatus.create(statuses[row.status]?.[0] || row.status)],
      ['Request Date', date(fieldValue(fields, 'Request Date') || row.date)],
      ['Type', fieldValue(fields, 'Type', 'Letter Type') || row.title],
      ['Description', fieldValue(fields, 'Description') || row.title || emptyValue],
      ['1st Merge Text', fieldValue(fields, '1st Merge Text') || emptyValue],
      ['2nd Merge Text', fieldValue(fields, '2nd Merge Text') || emptyValue],
      ['3rd Merge Text', fieldValue(fields, '3rd Merge Text') || emptyValue],
      ['Reason', fieldValue(fields, 'Reason') || emptyValue],
      ['Remark', fieldValue(fields, 'Remark', 'Remarks') || emptyValue],
      ['FileName', fieldValue(fields, 'FileName', 'Attachment', 'Attachments') || emptyValue],
      ['Acknowledged On', date(fieldValue(fields, 'Acknowledged On'))]
    ], submissionDate(row));
  }

  function inventoryDetail(row, body) {
    const fields = fieldMap(row);
    const detailRows = [
      ['Reference #', referenceNumber(row, fields)],
      ['Status', recordDetailStatus.create(statuses[row.status]?.[0] || row.status)],
      ...(fields['Request Date'] ? [['Request Date', date(fields['Request Date'])]] : []),
      ['Required By', date(fieldValue(fields, 'Required By'))],
      ['Inventory Item', fieldValue(fields, 'Inventory Item', 'Request Item', 'Inventory Type') || row.title],
      ['Quantity', fieldValue(fields, 'Quantity') || emptyValue],
      ['UOM', fieldValue(fields, 'UOM', 'Unit') || emptyValue],
      ['Reason', fieldValue(fields, 'Reason') || emptyValue],
      ['Submitter', employeeNumber(fieldValue(fields, 'Submitter', 'Emp No.', 'Emp #') || currentEmployee.empNo)],
      ['Remark', fieldValue(fields, 'Remark', 'Remarks') || emptyValue],
      ['Approver Remark', fieldValue(fields, 'Approver Remark') || emptyValue],
      ['Is Assigned?', fieldValue(fields, 'Is Assigned?') || 'No']
    ];
    const attachment = fieldValue(fields, 'Attachment', 'Attachments', 'FileName');
    if (attachment && attachment.toLowerCase() !== 'none') detailRows.push(['Attachments', attachment]);
    appendTable(body, detailRows, submissionDate(row));
  }

  function recordType(row) {
    const fields = fieldMap(row);
    return row.kind === 'letter-request' ? fieldValue(fields, 'Type', 'Letter Type') || row.title
      : fieldValue(fields, 'Inventory Item', 'Request Item', 'Inventory Type') || row.title;
  }

  function historyActions(row) {
    if (['draft', 'resubmit'].includes(row.status)) {
      return [
        { key: 'apply', label: 'Apply', className: 'history-submit-btn' },
        { key: 'cancel', label: 'Cancel', className: 'history-cancel-btn' }
      ];
    }
    if (['submitted', 'approved'].includes(row.status)) {
      return [{ key: 'cancel', label: 'Cancel', className: 'history-cancel-btn' }];
    }
    return [];
  }

  function actionDescription(row) {
    const content = cardContent(row);
    const reference = referenceNumber(row);
    return `${content.title}, ${date(row.date)}, ${statuses[row.status]?.[0] || row.status}${reference !== emptyValue ? ', ' + reference : ''}`;
  }

  function appendHistoryActions(container, row, context = 'card') {
    container.replaceChildren();
    const description = actionDescription(row);
    const actions = historyActions(row);
    actions.forEach(action => {
      const button = node('button', context === 'detail' ? 'history-detail-action' : action.className, action.label);
      if (action.key === 'cancel') setRecordCancelButton(button, actions.length, context === 'detail');
      button.type = 'button';
      button.dataset.historyAction = action.key;
      button.setAttribute('aria-label', `${button.textContent} ${description}`);
      container.append(button);
    });
    if (context === 'detail') container.hidden = !container.childElementCount;
    return container.childElementCount;
  }

  function render() {
    try {
      if (!samplesReady) {
        window.WorkplaceHistoryStore.ensureSamples(window.WORKPLACE_HISTORY_DATA || []);
        window.WorkplaceHistoryStore.migrateCancelledToSubmitted();
        samplesReady = true;
      }
      records = window.WorkplaceHistoryStore.list();
      $('historyLoadError').hidden = true;
    } catch {
      records = [];
      $('historyLoadError').textContent = 'Unable to read saved History. Please try again.';
      $('historyLoadError').hidden = false;
    }
    document.querySelectorAll('[data-history-kind]').forEach(button => {
      const active = button.dataset.historyKind === kind;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const filter = filters[kind];
    const rows = records.filter(row => row.kind === kind
      && (!filter.from || row.date >= filter.from)
      && (!filter.to || row.date <= filter.to)
      && (!filter.status || row.status === filter.status)
      && (!filter.type || recordType(row) === filter.type));
    const categoryTitle = kind === 'inventory-request' ? 'Inventory' : labels[kind];
    document.querySelector('.admin-heading h1').textContent = categoryTitle + ' History';
    legend.querySelector('h3').textContent = categoryTitle + ' status';
    $('historyCategoryTitle').textContent = labels[kind] + ' History';
    $('historyRecordHeading').hidden = false;
    $('historyRecordCount').textContent = String(rows.length);
    const summary = [
      filter.from ? 'From ' + date(filter.from) : '',
      filter.to ? 'To ' + date(filter.to) : '',
      filter.status ? (statuses[filter.status]?.[0] || filter.status) : '',
      filter.type
    ].filter(Boolean);
    $('historyFilterSummary').textContent = summary.join(' / ') || 'All ' + labels[kind];
    $('historyEmptyState').hidden = !!rows.length || !$('historyLoadError').hidden;
    $('historyEmptyDescription').textContent = summary.length ? 'Try another filter.' : 'Saved ' + labels[kind] + ' requests will appear here.';
    const list = $('workplaceHistoryList');
    list.replaceChildren();
    for (const row of rows) {
      const content = cardContent(row);
      const card = node('article', 'history-card-item');
      card.dataset.recordId = row.id;
      card.dataset.status = row.status;
      const main = node('a', 'history-card-main');
      main.href = HistoryRecordPage.href(row.kind, row.id);
      main.dataset.historyLink = '';
      const reference = referenceNumber(row);
      const description = actionDescription(row);
      main.setAttribute('aria-label', `View ${labels[row.kind]} details: ${description}`);
      const header = node('span', 'history-card-header');
      const heading = node('span', 'history-card-heading');
      heading.append(node('span', 'history-card-title', content.title));
      if (reference !== emptyValue) heading.append(node('span', 'history-card-ref', 'Ref: ' + reference));
      header.append(heading, statusPill(row.status));
      const details = node('span', 'history-card-details');
      for (const [label, value] of content.rows) {
        const line = node('span', 'history-card-row');
        if (label === 'Reason') line.classList.add('record-reason-field');
        line.append(node('span', '', label), node('strong', '', value || emptyValue));
        details.append(line);
      }
      recordSubmitDate.append(details, submissionDate(row));
      main.append(header, details);
      card.append(main);
      const actions = node('div', 'history-card-actions');
      if (appendHistoryActions(actions, row, 'card')) card.append(actions);
      list.append(card);
    }
  }

  function openModal(id, focusId) {
    modal = $(id);
    opener = document.activeElement;
    inerted = [...document.querySelector('.phone-container').children].filter(child => child !== modal && !child.inert);
    inerted.forEach(child => { child.inert = true; });
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    $(focusId).focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    inerted.forEach(child => { child.inert = false; });
    inerted = [];
    modal = null;
    (opener?.isConnected ? opener : $('historyFilterTrigger')).focus();
  }

  function fillFilter() {
    const filter = filters[kind];
    $('historyFilterTitle').textContent = 'Filter';
    $('historyDateFrom').value = filter.from;
    $('historyDateTo').value = filter.to;
    statusFilter.value = filter.status;
    $('historyStatusField').hidden = kind === 'guest-visit';
    $('historyStatusLabel').textContent = kind === 'letter-request' ? 'Letter Status' : 'Status';
    $('historyTypeField').hidden = kind === 'guest-visit';
    $('historyTypeLabel').textContent = kind === 'letter-request' ? 'Letter Type' : 'Request Item';
    $('historyType').replaceChildren(new Option(kind === 'inventory-request' ? 'All Items' : 'All Types', ''));
    [...new Set(records.filter(row => row.kind === kind).map(recordType))].sort().forEach(type => $('historyType').add(new Option(type, type)));
    $('historyType').value = filter.type;
    $('historyFilterError').hidden = true;
  }

  function renderDetails(row) {
    $('historyDetailTitle').textContent = row.kind === 'inventory-request' ? 'Inventory Details' : labels[row.kind] + ' Details';
    const body = $('historyDetailBody');
    body.toggleAttribute('data-detail-form-layout', row.kind === 'guest-visit');
    body.replaceChildren();
    if (row.kind === 'guest-visit') guestDetail(row, body);
    else if (row.kind === 'letter-request') letterDetail(row, body);
    else inventoryDetail(row, body);
    appendHistoryActions($('historyDetailActions'), row, 'detail');
  }

  function showActionFeedback(message) {
    $('historyActionFeedback').textContent = message;
    $('historyActionFeedback').hidden = false;
  }

  function executeHistoryAction(row, actionKey, source = 'card') {
    try {
      const current = window.WorkplaceHistoryStore.list().find(record => record.id === row.id);
      if (!current) throw new Error('Workplace history record not found.');
      if (!historyActions(current).some(action => action.key === actionKey)) {
        throw new Error('Workplace history action is no longer available.');
      }
      window.WorkplaceHistoryStore.setStatus(current.id, actionKey === 'apply' ? 'submitted' : 'cancelled');
      render();
      showActionFeedback(actionKey === 'apply' ? 'Request submitted.' : 'Request cancelled.');
      const updatedRecord = records.find(record => record.id === current.id);
      if (source === 'detail' && activeDetailRecordId === current.id && updatedRecord) {
        renderDetails(updatedRecord);
        $('historyDetailBody').focus({ preventScroll: true });
      } else {
        const updatedCard = [...document.querySelectorAll('[data-record-id]')].find(card => card.dataset.recordId === current.id);
        (updatedCard?.querySelector('.history-card-main') || $('historyFilterTrigger')).focus({ preventScroll: true });
      }
    } catch {
      if (source === 'detail') HistoryRecordPage.back();
      render();
      showActionFeedback('Unable to update this request. Please try again.');
    }
  }

  document.querySelectorAll('[data-history-kind]').forEach(button => button.addEventListener('click', () => {
    selectCategory(button.dataset.historyKind);
    $('historyActionFeedback').hidden = true;
    const url = new URL(location.href);
    url.searchParams.set('category', kind);
    history.replaceState(null, '', url);
    render();
  }));
  $('workplaceHistoryList').addEventListener('click', event => {
    const card = event.target.closest('[data-record-id]');
    const record = card && records.find(row => row.id === card.dataset.recordId);
    if (!record) return;
    const action = event.target.closest('[data-history-action]');
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      executeHistoryAction(record, action.dataset.historyAction, 'card');
    }
  });
  $('historyDetailActions').addEventListener('click', event => {
    const action = event.target.closest('[data-history-action]');
    if (!action || !activeDetailRecordId) return;
    event.preventDefault();
    const record = window.WorkplaceHistoryStore.list().find(row => row.id === activeDetailRecordId)
      || { id: activeDetailRecordId };
    executeHistoryAction(record, action.dataset.historyAction, 'detail');
  });
  $('historyFilterTrigger').addEventListener('click', () => {
    fillFilter();
    openModal('historyFilterModal', 'closeHistoryFilter');
  });
  $('resetHistoryFilter').addEventListener('click', () => {
    filters[kind] = emptyFilter();
    fillFilter();
    render();
  });
  $('historyFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    const from = $('historyDateFrom').value;
    const to = $('historyDateTo').value;
    if (from && to && from > to) {
      $('historyFilterError').textContent = 'End Date must be on or after Start Date.';
      $('historyFilterError').hidden = false;
      $('historyDateTo').focus();
      return;
    }
    filters[kind] = { from, to, status: kind === 'guest-visit' ? '' : statusFilter.value, type: kind === 'guest-visit' ? '' : $('historyType').value };
    render();
    closeModal();
  });
  $('closeHistoryFilter').addEventListener('click', closeModal);
  $('historyFilterModal').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (!modal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('input,select,button,[tabindex="0"]')]
      .filter(control => !control.disabled && control.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) render();
  });
  window.addEventListener('storage', () => {
    render();
    if (!activeDetailRecordId) return;
    const current = records.find(record => record.id === activeDetailRecordId);
    if (!current) {
      HistoryRecordPage.back();
      return;
    }
    renderDetails(current);
  });
  selectCategory(Object.hasOwn(labels, requested) ? requested : 'guest-visit');
  render();
  HistoryRecordPage.register((category, id) => {
    const record = records.find(row => row.kind === category && row.id === id);
    if (!record) return;
    if (kind !== category) { selectCategory(category); render(); }
    activeDetailRecordId = id;
    renderDetails(record);
    return $('historyDetailsModal');
  }, () => { activeDetailRecordId = null; });
});
