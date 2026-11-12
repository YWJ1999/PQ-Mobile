(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const date = value => {
    if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const periodLabel = value => {
    const period = String(value || '').replace('-', '');
    if (!/^\d{6}$/.test(period)) return '—';
    return new Date(Number(period.slice(0, 4)), Number(period.slice(4, 6)) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };
  const money = value => `RM ${Number(value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const defaults = category => category === 'deduction'
    ? { from: '2016-10', to: '2026-10', item: 'all', status: 'all', description: '' }
    : { from: '2026-01-01', to: '2026-10-03', item: 'all', status: 'all', description: '' };
  const filters = { tax: defaults('tax'), deduction: defaults('deduction') };
  const records = { tax: [...window.PAYROLL_HISTORY_DATA.tax], deduction: [...window.PAYROLL_HISTORY_DATA.deduction] };
  const categories = {
    tax: { title: 'Tax Relief History', detail: 'Tax Relief Detail', label: 'Rebate Item', all: 'All Rebate Items', description: 'Description', file: 'tax-relief-request.html', name: 'Tax Relief' },
    deduction: { title: 'Deduction Request History', detail: 'Deduction Request Detail', label: 'Deduction Type', all: 'All Deduction Types', description: 'Remarks', file: 'deduction-request.html', name: 'Deduction Request' }
  };
  const statuses = { submitted: 'Pending', draft: 'Draft', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
  const statusIcons = { submitted: 'fa-paper-plane', draft: 'fa-floppy-disk', approved: 'fa-circle-check', rejected: 'fa-circle-xmark', cancelled: 'fa-ban' };
  let kind = new URLSearchParams(location.search).get('category') === 'deduction' ? 'deduction' : 'tax';
  let currentModal = null, opener = null;
  let attachmentUrls = [];
  let activeDetail = null;
  const typeKey = record => kind === 'tax' ? (record.rebateCode || record.rebateItem) : record.deductionType;
  const typeLabel = record => kind === 'tax' ? [record.rebateCode, record.rebateItem].filter(Boolean).join(' - ') : record.deductionType;
  const reference = record => record.localDraft ? 'Saved draft' : (record.reference ?? record.id);
  const deductionPeriod = record => record.period || record.stopPeriod || '';
  const deductionCycle = record => record.cycle || record.stopCycle || '';
  const deductionDate = record => record.deductionDate || record.stopDate || '';
  const recordDate = record => record.submitDate || record.savedDate || record.transactionDate || '';
  const row = (label, value, markup = false) => `<tr><th scope="row">${escape(label)}</th><td>${markup ? value : escape(value === '' || value == null ? '—' : value)}</td></tr>`;
  const getHistoryActions = record => {
    if (record.status === 'draft') {
      return [
        { key: 'submit', label: 'Submit', className: 'history-card-action-primary' },
        { key: 'discard', label: 'Cancel', className: 'history-card-action-danger' }
      ];
    }
    if (record.status === 'submitted') {
      return [{ key: 'cancel', label: 'Cancel', className: 'history-card-action-danger' }];
    }
    return [];
  };
  const renderCardActions = record => {
    const actions = getHistoryActions(record);
    if (!actions.length) return '';
    const buttons = actions.map(action => {
      const label = action.key === 'cancel' ? recordCancelButtonHTML(actions.length) : action.label;
      return `<button type="button" class="history-card-action ${action.className}" data-history-action="${action.key}">${label}</button>`;
    });
    return `<div class="history-card-actions" aria-label="${statuses[record.status]} actions">${buttons.join('')}</div>`;
  };

  function selectCardAction(event) {
    event.stopPropagation();
    const action = event.currentTarget.dataset.historyAction;
    const card = event.currentTarget.closest('.history-card-item');
    executeHistoryAction(card?.dataset.kind || kind, card?.dataset.reference, action, 'card');
  }

  function releaseAttachmentUrls() {
    attachmentUrls.forEach(url => URL.revokeObjectURL(url));
    attachmentUrls = [];
  }

  function executeHistoryAction(recordKind, recordId, action, source = 'card') {
    const list = records[recordKind] || [];
    const index = list.findIndex(record => record.id === recordId);
    if (index < 0) {
      if (source === 'detail' && currentModal?.id === 'historyDetailsModal') closeModal();
      render();
      window.showToast?.('Request is no longer available');
      return;
    }
    const openSameRecord = activeDetail?.kind === recordKind && activeDetail?.id === recordId;
    if (action === 'discard') {
      if (openSameRecord && currentModal?.id === 'historyDetailsModal') closeModal();
      list.splice(index, 1);
      render();
      window.showToast?.('Draft discarded');
      return;
    }
    list[index].status = action === 'submit' ? 'submitted' : 'cancelled';
    render();
    if (source === 'detail' && openSameRecord) {
      renderDetail(list[index], recordKind);
      ($('historyDetailActions').querySelector('.history-detail-action:not([data-history-detail-aux])')
        || $('closeHistoryDetails')).focus({ preventScroll: true });
    } else {
      const card = [...document.querySelectorAll('.history-card-item')].find(node => node.dataset.reference === recordId);
      card?.querySelector('.history-card-main')?.focus({ preventScroll: true });
    }
    window.showToast?.(action === 'submit' ? 'Request submitted' : 'Request cancelled');
  }

  function showModal(modal, button) {
    opener = document.activeElement;
    currentModal = modal;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.querySelectorAll('.payroll-history-phone > :not(.claim-filter-sheet):not(.history-detail-overlay)').forEach(node => { node.inert = true; });
    button.focus();
  }

  function closeModal() {
    if (!currentModal) return;
    const closingDetails = currentModal.id === 'historyDetailsModal';
    currentModal.classList.remove('is-open');
    currentModal.setAttribute('aria-hidden', 'true');
    currentModal = null;
    if (closingDetails) activeDetail = null;
    document.querySelectorAll('.payroll-history-phone > [inert]').forEach(node => { node.inert = false; });
    opener?.focus();
    releaseAttachmentUrls();
  }

  function render() {
    const category = categories[kind], active = filters[kind];
    document.querySelectorAll('[data-history-kind]').forEach(button => {
      const selected = button.dataset.historyKind === kind;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $('historyCategoryTitle').textContent = category.title;
    const selectedType = records[kind].find(record => typeKey(record) === active.item);
    $('historyFilterSummary').textContent = [
      kind === 'tax' ? `${date(active.from)} – ${date(active.to)}` : `${periodLabel(active.from)} – ${periodLabel(active.to)}`,
      selectedType ? typeLabel(selectedType) : category.all,
      active.status === 'all' ? '' : statuses[active.status], active.description ? `“${active.description}”` : ''
    ].filter(Boolean).join(' · ');
    const matching = records[kind].filter(record => {
      const when = kind === 'tax' ? recordDate(record).slice(0, 10) : deductionPeriod(record).replace('-', '');
      const from = kind === 'tax' ? active.from : active.from.replace('-', '');
      const to = kind === 'tax' ? active.to : active.to.replace('-', '');
      return when >= from && when <= to
        && (active.item === 'all' || active.item === typeKey(record))
        && (active.status === 'all' || active.status === record.status)
        && (record.description || record.remarks || '').toLocaleLowerCase().includes(active.description.toLocaleLowerCase());
    });
    $('historyRecordCount').textContent = String(matching.length);
    $('historyEmptyState').hidden = matching.length > 0;
    $('historyEmptyText').textContent = records[kind].length ? 'Try another date range or filter.' : 'Your saved deduction requests will appear here.';
    const createRequest = $('historyCreateRequest');
    createRequest.href = category.file;
    createRequest.replaceChildren(document.createTextNode(`Create ${category.name}${kind === 'tax' ? ' Request' : ''} `));
    const createRequestIcon = document.createElement('i');
    createRequestIcon.className = 'fa-solid fa-arrow-right';
    createRequestIcon.setAttribute('aria-hidden', 'true');
    createRequest.append(createRequestIcon);
    $('payrollHistoryList').replaceChildren();
    matching.forEach(record => {
      const card = document.createElement('article');
      card.className = 'history-card-item';
      card.dataset.reference = record.id;
      card.dataset.status = record.status;
      card.dataset.kind = kind;
      const fields = kind === 'tax'
        ? [['Transaction Date', date(record.transactionDate)], ['Amount', money(record.amount)], ['Process (Period/Cycle)', [record.period, record.cycle].filter(Boolean).join(' / ') || '—']]
        : [['Period', deductionPeriod(record)], ['Submit Date', date(record.submitDate || record.savedDate)], ['Cycle', deductionCycle(record)], ['Amount', money(record.amount)]];
      const referenceLine = kind === 'tax'
        ? `<div class="history-card-ref">${record.localDraft ? 'Saved draft' : `Ref: ${escape(reference(record))}`}</div>`
        : '';
      card.innerHTML = `<div class="history-card-main" role="button" tabindex="0" aria-haspopup="dialog" aria-label="View ${escape(typeLabel(record))} details"><div class="history-card-header"><div class="history-card-heading"><div class="history-card-title-row"><h3 class="history-card-title">${escape(typeLabel(record))}</h3></div>${referenceLine}</div><span class="status-pill ${escape(record.status)}"><i class="fa-solid ${statusIcons[record.status] || 'fa-circle'}" aria-hidden="true"></i>${escape(statuses[record.status] || record.status)}</span></div><div class="history-card-details">${fields.map(([label, value]) => `<div class="history-card-row"><span>${escape(label)}</span><strong class="${label === 'Amount' ? 'history-card-amount' : ''}">${escape(value || '—')}</strong></div>`).join('')}</div>${record.localDraft ? `<p class="history-draft-note">Saved on this device · ${escape(date(record.savedDate))}</p>` : ''}</div>${renderCardActions(record)}`;
      const main = card.querySelector('.history-card-main');
      main.addEventListener('click', () => openDetails(record));
      main.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openDetails(record);
      });
      card.querySelectorAll('[data-history-action]').forEach(button => button.addEventListener('click', selectCardAction));
      $('payrollHistoryList').append(card);
    });
    $('payrollHistoryList').setAttribute('aria-busy', 'false');
  }

  function renderDetailActions(record, recordKind) {
    const footer = $('historyDetailActions');
    footer.replaceChildren();
    const actions = getHistoryActions(record);
    const actionCount = actions.length + (record.localDraft ? 1 : 0);
    actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-detail-action';
      button.dataset.historyAction = action.key;
      if (action.key === 'cancel') setRecordCancelButton(button, actionCount, true);
      else if (action.key === 'discard') setRecordDeleteButton(button);
      else button.textContent = action.label;
      button.addEventListener('click', event => {
        event.stopPropagation();
        executeHistoryAction(recordKind, record.id, action.key, 'detail');
      });
      footer.append(button);
    });
    if (record.localDraft) {
      const edit = document.createElement('a');
      edit.className = 'record-primary-action';
      edit.dataset.historyDetailAux = '';
      edit.href = categories[recordKind].file;
      edit.innerHTML = `<i class="fa-solid fa-pen" aria-hidden="true"></i><span>Edit ${categories[recordKind].name}</span>`;
      footer.append(edit);
    }
    footer.hidden = !footer.childElementCount;
  }

  function renderDetail(record, recordKind) {
    releaseAttachmentUrls();
    const employeeName = `<span class="history-employee-name">${escape(record.employeeName || '—')}</span>`;
    const employeeId = `<span class="history-employee-id">${record.empNo ? `#${escape(String(record.empNo).replace(/^#/, ''))}` : '—'}</span>`;
    const attachments = (record.attachments || []).map(attachment => {
      const icon = /\.docx?$/i.test(attachment.name) ? 'fa-file-word' : 'fa-file-lines';
      if (attachment.file instanceof Blob) {
        const url = URL.createObjectURL(attachment.file);
        attachmentUrls.push(url);
        return `<a class="history-attachment" href="${escape(url)}" download="${escape(attachment.name)}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${escape(attachment.name)}</span></a>`;
      }
      return `<span class="history-attachment"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${escape(attachment.name)}<small class="history-attachment-note">Original file unavailable</small></span></span>`;
    }).join('') || '—';
    const body = [
      row('Reference #', reference(record)),
      row('Emp #', employeeId, true),
      row('Name', employeeName, true),
      row('Status', recordDetailStatus.html(statuses[record.status]), true),
      row('Submit Date', date(record.submitDate || record.savedDate))
    ];
    if (recordKind === 'tax') {
      body.push(
        row('Rebate Item', record.rebateItem),
        row('Transaction Date', date(record.transactionDate)),
        row('Description', record.description),
        row('Receipt #', record.receiptNo),
        row('Amount', money(record.amount)),
        row('Attachments', attachments, true),
        row('Process', record.process ? 'Yes' : 'No'),
        row('Period', record.period),
        row('Cycle', record.cycle),
        row('Approval Date', record.approvalDateLabel || date(record.approvalDate)),
        row('Approver Remarks', record.approverRemarks)
      );
    } else {
      body.push(
        row('Request Type', record.requestType),
        row('Deduction Type', record.deductionType),
        row('Period', deductionPeriod(record)),
        row('Cycle', deductionCycle(record)),
        row('Deduction Date', date(deductionDate(record))),
        row('Account No', record.accountNo),
        row('Amount', money(record.amount)),
        row('Attachments', attachments, true)
      );
    }
    $('historyDetailTitle').textContent = categories[recordKind].detail;
    $('historyDetailBody').innerHTML = `<table class="history-detail-table"><tbody>${body.join('')}</tbody></table>`;
    $('historyDetailBody').scrollTop = 0;
    renderDetailActions(record, recordKind);
  }

  function openDetails(record) {
    activeDetail = { kind, id: record.id };
    renderDetail(record, kind);
    showModal($('historyDetailsModal'), $('closeHistoryDetails'));
  }

  function populateFilter(values) {
    const periodFilter = kind === 'deduction';
    $('historyDateFrom').type = periodFilter ? 'month' : 'date';
    $('historyDateTo').type = periodFilter ? 'month' : 'date';
    $('historyDateFromLabel').textContent = periodFilter ? 'Start Period' : 'Start Date';
    $('historyDateToLabel').textContent = periodFilter ? 'End Period' : 'End Date';
    $('historyDateFrom').value = values.from;
    $('historyDateTo').value = values.to;
    $('historyStatus').value = values.status;
    $('historyDescription').value = values.description;
    $('historyStatusField').hidden = periodFilter;
    $('historyDescriptionField').hidden = periodFilter;
    const category = categories[kind];
    $('historyItemLabel').textContent = category.label;
    $('historyDescriptionLabel').textContent = category.description;
    $('historyDescription').placeholder = `Search ${category.description.toLowerCase()}`;
    const select = $('historyRebateItem');
    select.replaceChildren(new Option(category.all, 'all'));
    const seen = new Set();
    records[kind].forEach(record => {
      const key = typeKey(record);
      if (!key || seen.has(key)) return;
      seen.add(key);
      select.add(new Option(typeLabel(record), key));
    });
    select.value = values.item;
    $('historyFilterError').hidden = true;
  }

  async function loadSavedDrafts() {
    // The current forms store one saved draft per employee and request kind.
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('peoplehcm-payroll-forms', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('requests', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Saved requests are busy'));
    });
    try {
      const drafts = await new Promise((resolve, reject) => {
        const transaction = db.transaction('requests', 'readonly');
        const request = transaction.objectStore('requests').getAll();
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      const employee = window.PAYROLL_CONFIG.employee;
      Object.keys(records).forEach(category => {
        records[category] = records[category].filter(record => !record.localDraft);
      });
      drafts.filter(draft => draft.employeeId === employee.empNo && Object.hasOwn(records, draft.kind)).forEach(draft => {
        const values = draft.values || {};
        const normalizedValues = draft.kind === 'deduction' ? {
          ...values,
          period: values.period || values.stopPeriod || '',
          cycle: values.cycle || values.stopCycle || '',
          deductionDate: values.deductionDate || values.stopDate || '',
          amount: Number(values.amount || 0)
        } : values;
        records[draft.kind].push({
          ...normalizedValues, id: draft.id, localDraft: true, status: 'draft',
          employeeName: employee.name, empNo: employee.empNo, savedDate: draft.savedAt,
          attachments: draft.attachments || []
        });
      });
    } finally { db.close(); }
  }

  document.querySelectorAll('[data-history-kind]').forEach(button => button.addEventListener('click', () => {
    kind = button.dataset.historyKind;
    const url = new URL(location.href);
    url.searchParams.set('category', kind);
    history.replaceState(null, '', url);
    render();
  }));
  $('historyFilterTrigger').addEventListener('click', () => { populateFilter(filters[kind]); showModal($('historyFilterModal'), $('closeHistoryFilter')); });
  $('resetHistoryFilter').addEventListener('click', () => populateFilter(defaults(kind)));
  $('closeHistoryFilter').addEventListener('click', closeModal);
  $('closeHistoryDetails').addEventListener('click', closeModal);
  $('historyFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    const from = $('historyDateFrom').value, to = $('historyDateTo').value;
    if (from > to) {
      $('historyFilterError').textContent = kind === 'deduction' ? 'End Period must be on or after Start Period.' : 'End Date must be on or after Start Date.';
      $('historyFilterError').hidden = false;
      $('historyDateTo').focus();
      return;
    }
    filters[kind] = {
      from,
      to,
      item: $('historyRebateItem').value,
      status: kind === 'deduction' ? 'all' : $('historyStatus').value,
      description: kind === 'deduction' ? '' : $('historyDescription').value.trim()
    };
    render();
    closeModal();
  });
  [$('historyFilterModal'), $('historyDetailsModal')].forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModal(); }));
  document.addEventListener('keydown', event => {
    if (!currentModal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...currentModal.querySelectorAll('button, a[href], input, select')].filter(node => !node.disabled && node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  function refreshSavedDrafts() {
    $('payrollHistoryList').setAttribute('aria-busy', 'true');
    $('historyStorageNotice').hidden = true;
    return loadSavedDrafts().catch(() => {
      $('historyStorageNotice').textContent = 'Unable to load saved requests on this device. Refresh to try again.';
      $('historyStorageNotice').hidden = false;
    }).finally(render);
  }
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    closeModal();
    refreshSavedDrafts();
  });
  refreshSavedDrafts();
})();
