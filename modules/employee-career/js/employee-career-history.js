(() => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const data = window.EMPLOYEE_CAREER_HISTORY_DATA || {feedback: [], whereabout: []};
  const whereaboutDeletedKey = 'pq_employee_career_whereabout_deleted';
  function deletedWhereabouts() {
    try {
      const ids = JSON.parse(localStorage.getItem(whereaboutDeletedKey) || '[]');
      return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);
    } catch { return new Set(); }
  }
  function readWhereabouts() {
    const deleted = deletedWhereabouts();
    return data.whereabout.filter(row => !deleted.has(row.id)).map(row => ({ ...row }));
  }
  function readCVRequests() {
    const reference = window.EMPLOYEE_CAREER_CV_HISTORY_DATA || [];
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem('pq_change_request_history') || '[]');
    } catch { saved = []; }
    const rows = [...reference, ...(Array.isArray(saved) ? saved : [])].filter(row => row && typeof row.id === 'string' && typeof row.submittedAt === 'string' && Array.isArray(row.changes));
    return [...new Map(rows.map(row => [row.id, row])).values()];
  }
  const records = {feedback: window.EmployeeCareerFeedbackStore?.all() || data.feedback.map(row => ({...row})), whereabout: readWhereabouts(), 'career-plan': (data['career-plan'] || []).map(row => ({...row})), 'cv-change-request': readCVRequests()};
  const labels = {feedback: 'Feedback', whereabout: 'Whereabout', 'career-plan': 'Career Plan', 'cv-change-request': 'CV Change Request'};
  const cvStatusLabels = {draft: 'Draft', submitted: 'Pending', resubmit: 'Resubmit', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled'};
  const defaults = {
    feedback: {from: '', to: '', type: '', category: '', status: ''},
    whereabout: {year: '', month: ''},
    'career-plan': {from: '', to: '', status: ''},
    'cv-change-request': {from: '', to: '', status: ''}
  };
  const filters = Object.fromEntries(Object.entries(defaults).map(([category, values]) => [category, {...values}]));
  const initialKind = new URLSearchParams(location.search).get('category');
  let kind = [...document.querySelectorAll('[data-history-kind]')].some(button => button.dataset.historyKind === initialKind) ? initialKind : 'feedback';
  const isRequestKind = () => kind === 'career-plan' || kind === 'cv-change-request';
  let activeRecord = null;
  let modal = null;
  let opener = null;
  let inerted = [];
  let pendingWhereaboutDelete = null;
  const date = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : '\u2014';
  const months = Array.from({length:12}, (_, index) => new Date(2026,index,1).toLocaleDateString('en-GB',{month:'long'}));
  function statusPill(key, label, icon) {
    const statusKey = escape(key);
    return `<span class="status-pill record-status-badge ${statusKey}" data-status="${statusKey}"><i class="fa-solid ${icon}" aria-hidden="true"></i>${escape(label)}</span>`;
  }
  const status = statusPill('pending', 'Pending', 'fa-paper-plane');
  const whereaboutStatus = statusPill('approved', 'Pass', 'fa-check');
  const recordDate = row => {
    if (kind === 'career-plan') return row.submitDate || '';
    if (kind !== 'cv-change-request') return row.date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(row.submittedAt)) return row.submittedAt;
    const local = new Date(row.submittedAt);
    if (Number.isNaN(local.getTime())) return '';
    return [local.getFullYear(), String(local.getMonth() + 1).padStart(2, '0'), String(local.getDate()).padStart(2, '0')].join('-');
  };
  const statusAliases = new Map([['submit', 'submitted'], ['approve', 'approved'], ['cancel', 'cancelled'], ['canceled', 'cancelled']]);
  const cvStatusKey = row => {
    const value = String(row.status || 'Submitted').trim().toLowerCase();
    return value.startsWith('pending ') ? 'pending' : (statusAliases.get(value) || value);
  };
  // The legacy submitted filter key includes requests awaiting approval.
  const cvStatusGroup = row => {
    const key = cvStatusKey(row);
    return key === 'pending' ? 'submitted' : key;
  };
  const cvStatus = row => {
    const key = cvStatusKey(row);
    const icons = {draft: 'fa-file-pen', pending: 'fa-paper-plane', submitted: 'fa-paper-plane', resubmit: 'fa-rotate-left', approved: 'fa-check', rejected: 'fa-xmark', cancelled: 'fa-ban'};
    const label = recordReviewStatusLabel(row.status || 'Pending');
    return statusPill(key, label, icons[key] || 'fa-file-lines');
  };
  const summaryRow = (label,value) => `<span class="history-card-row"><span>${escape(label)} :</span><strong>${escape(value || '\u2014')}</strong></span>`;
  const detailRow = (label,value,markup = false) => `<tr><th scope="row">${escape(label)}</th><td>${markup ? value : escape(value === '' || value == null ? '\u2014' : value)}</td></tr>`;
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

  function render() {
    document.querySelectorAll('[data-history-kind]').forEach(button => {
      const active = button.dataset.historyKind === kind;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const label = labels[kind];
    $('historyCategoryTitle').textContent = label + ' History';
    const f = filters[kind];
    const rows = records[kind].filter(row => {
      if (isRequestKind()) return (!f.from || recordDate(row) >= f.from) && (!f.to || recordDate(row) <= f.to) && (!f.status || cvStatusGroup(row) === f.status);
      if (kind === 'whereabout') return (!f.year || row.date.slice(0,4) === f.year) && (!f.month || Number(row.date.slice(5,7)) === Number(f.month));
      return (!f.from || row.feedbackDate1 >= f.from) && (!f.to || row.feedbackDate1 <= f.to) &&
        (!f.type || row.type === f.type) && (!f.category || row.category === f.category) &&
        (!f.status || f.status === 'submitted');
    });
    const summary = kind === 'feedback'
      ? [f.from ? 'From ' + date(f.from) : '', f.to ? 'To ' + date(f.to) : '', f.type, f.category, f.status ? 'Pending' : '']
      : kind === 'whereabout' ? [f.year || 'All Years', f.month ? months[Number(f.month)-1] : 'All Months']
      : [f.from ? 'From ' + date(f.from) : '', f.to ? 'To ' + date(f.to) : '', f.status ? cvStatusLabels[f.status] : ''];
    $('historyFilterSummary').textContent = summary.filter(Boolean).join(' / ') || (kind === 'career-plan' ? 'All Career Plans' : kind === 'cv-change-request' ? 'All CV Change Requests' : 'All Feedback');
    $('historyRecordCount').textContent = String(rows.length);
    $('historyEmptyState').hidden = rows.length > 0;
    $('careerHistoryList').innerHTML = rows.map(row => {
      const title = kind === 'cv-change-request' ? (row.reference || row.id)
        : kind === 'feedback' ? row.title : row.description;
      const details = kind === 'feedback'
        ? summaryRow('Feedback Date',date(row.feedbackDate1)) + summaryRow('Submit Date',date(row.submitDate)) + summaryRow('Type',row.type) + summaryRow('Category',row.category)
        : kind === 'whereabout' ? summaryRow('Date',date(row.date)) + summaryRow('Time',`${row.startTime} - ${row.endTime}`) + summaryRow('Project',row.project) + summaryRow('Task',row.task)
        : kind === 'career-plan' ? summaryRow('Career Path',row.careerPath) + summaryRow('Next Position',row.nextPosition) + summaryRow('Target Date',date(row.targetDate)) + summaryRow('Submit Date',date(row.submitDate))
        : summaryRow('Submitted Date',date(recordDate(row)));
      const reference = kind === 'cv-change-request' ? '' : row.reference;
      const heading = kind === 'career-plan'
        ? `<span class="history-card-title-row"><span class="cv-history-card-employee history-card-title"><span class="history-employee-name">${escape(row.name || row.employeeName || '\u2014')}</span>${row.empNo ? `<span class="history-employee-id">#${escape(String(row.empNo).replace(/^#+/, ''))}</span>` : ''}</span></span>`
        : `<span class="history-card-title-row"><span class="history-card-title">${escape(title)}</span></span>`;
      const content = `
        <span class="history-card-header"><span class="history-card-heading">${heading}${reference ? `<span class="history-card-ref">Ref: ${escape(reference)}</span>` : ''}</span>${isRequestKind() ? cvStatus(row) : kind === 'whereabout' ? whereaboutStatus : status}</span>
        <span class="history-card-details career-history-card-rows">${details}</span>`;
      if (kind === 'feedback') {
        return `<article class="history-card-item career-history-feedback-card" data-status="submitted" data-record-id="${escape(row.id)}">
          <button type="button" class="career-history-card-open" aria-label="View ${escape(title)} feedback details" aria-haspopup="dialog" aria-controls="historyDetailsModal">${content}</button>
          <div class="career-history-card-actions"><a class="career-history-edit-btn" data-edit-feedback="${escape(row.id)}" href="individual/feedback.html?edit=${encodeURIComponent(row.id)}&theme=${theme()}" aria-label="Edit ${escape(title)} feedback">${recordCardActionLabels.edit}</a></div>
        </article>`;
      }
      if (kind === 'whereabout') {
        return `<article class="history-card-item career-history-whereabout-card" data-status="approved" data-record-id="${escape(row.id)}">
          <button type="button" class="career-history-card-open" aria-label="View ${escape(title)} Whereabout details" aria-haspopup="dialog" aria-controls="historyDetailsModal">${content}</button>
          <div class="career-history-card-actions"><button type="button" class="career-history-delete-btn" data-delete-whereabout="${escape(row.id)}" aria-label="Delete ${escape(title)} Whereabout" aria-haspopup="dialog" aria-controls="whereaboutDeleteOverlay">${recordCardActionLabels.delete}</button></div>
        </article>`;
      }
      return `<button type="button" class="history-card-item" data-status="${isRequestKind() ? escape(cvStatusGroup(row)) : 'approved'}" data-record-id="${escape(row.id)}" aria-haspopup="dialog" aria-controls="historyDetailsModal">${content}
      </button>`;
    }).join('');
  }

  function showModal(target,focusTarget) {
    opener = document.activeElement;
    modal = target;
    target.classList.add('is-open');
    target.setAttribute('aria-hidden','false');
    inerted = Array.from(document.querySelector('.career-history-phone').children).filter(node => node !== target && !node.inert);
    inerted.forEach(node => {node.inert = true;});
    focusTarget.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    modal = null;
    inerted.forEach(node => {node.inert = false;});
    inerted = [];
    if (opener?.isConnected) opener.focus();
    else (document.querySelector(`[data-history-kind="${kind}"]`) || $('historyFilterTrigger')).focus();
  }

  function requestWhereaboutDelete(row) {
    if (!row) return;
    const context = { row, trigger: document.activeElement, fromDetails: modal === $('historyDetailsModal'), detailOpener: opener };
    closeModal();
    pendingWhereaboutDelete = context;
    $('whereaboutDeleteMessage').textContent = `Delete "${row.description}" on ${date(row.date)}?`;
    $('whereaboutDeleteError').hidden = true;
    showModal($('whereaboutDeleteOverlay'), $('whereaboutDeleteCancel'));
  }

  function cancelWhereaboutDelete() {
    const context = pendingWhereaboutDelete;
    pendingWhereaboutDelete = null;
    closeModal();
    if (context?.fromDetails) {
      activeRecord = context.row;
      renderDetails();
      showModal($('historyDetailsModal'), $('historyDeleteWhereabout'));
      opener = context.detailOpener;
    } else if (context?.trigger?.isConnected) context.trigger.focus({ preventScroll: true });
  }

  function confirmWhereaboutDelete() {
    if (!pendingWhereaboutDelete) return;
    try {
      const deleted = deletedWhereabouts();
      deleted.add(pendingWhereaboutDelete.row.id);
      localStorage.setItem(whereaboutDeletedKey, JSON.stringify([...deleted]));
    } catch {
      $('whereaboutDeleteError').textContent = 'Unable to delete this record. Please try again.';
      $('whereaboutDeleteError').hidden = false;
      return;
    }
    records.whereabout = readWhereabouts();
    pendingWhereaboutDelete = null;
    activeRecord = null;
    render();
    closeModal();
  }

  function selectOptions(id,label,values) {
    const select = $(id);
    if (!select) return;
    select.replaceChildren(new Option(label,''));
    [...new Set(values)].sort().forEach(value => select.add(new Option(value,value)));
  }

  function refreshFeedbackFilters() {
    for (const [id, label, key] of [['historyFeedbackType', 'All Types', 'type'], ['historyFeedbackCategory', 'All Categories', 'category']]) {
      selectOptions(id, label, records.feedback.map(row => row[key]).filter(Boolean));
      const selected = filters.feedback[key];
      if (![...$(id).options].some(option => option.value === selected)) filters.feedback[key] = '';
      $(id).value = filters.feedback[key];
    }
  }

  function fillFilter() {
    for (const [id, category] of [['feedbackHistoryFields', 'feedback'], ['whereaboutHistoryFields', 'whereabout'], ['cvHistoryFields', 'cv-change-request']]) {
      if ($(id)) $(id).hidden = category === 'cv-change-request' ? !isRequestKind() : kind !== category;
    }
    $('historyFilterTitle').textContent = 'Filter';
    $('historyFilterError').hidden = true;
    const f = filters[kind];
    if (kind === 'feedback') {
      $('historyDateFrom').value = f.from;
      $('historyDateTo').value = f.to;
      $('historyFeedbackType').value = f.type;
      $('historyFeedbackCategory').value = f.category;
      $('historyStatus').value = f.status;
    } else if (kind === 'whereabout') {
      selectOptions('historyYear','All Years',records.whereabout.map(row => row.date.slice(0,4)));
      $('historyYear').value = f.year;
      $('historyMonth').value = f.month;
    } else {
      $('cvHistoryDateFrom').value = f.from;
      $('cvHistoryDateTo').value = f.to;
      $('cvHistoryStatus').value = f.status;
    }
  }

  function renderDetails() {
    const row = activeRecord;
    $('historyDetailActions').hidden = isRequestKind();
    $('historyEditFeedback').hidden = kind !== 'feedback';
    $('historyDeleteWhereabout').hidden = kind !== 'whereabout';
    if (kind === 'feedback') $('historyEditFeedback').href = `individual/feedback.html?edit=${encodeURIComponent(row.id)}&theme=${theme()}`;
    $('historyDetailsModal').classList.toggle('cv-history-mobile-sheet', kind === 'cv-change-request');
    $('historyDetailsModal').classList.toggle('career-plan-history-details', kind === 'career-plan');
    $('historyDetailTitle').textContent = kind === 'feedback' ? 'Feedback Detail' : kind === 'whereabout' ? 'Whereabout History Details' : kind === 'career-plan' ? 'Career Plan Details' : 'CV Change Request Details';
    if (kind === 'cv-change-request') {
      $('historyDetailBody').innerHTML = window.EmployeeCareerCVHistoryDetails.render(row, recordDetailStatus.html(row.status || 'Submitted'), date(recordDate(row)), {qualificationLayout: 'numbered-cards'});
      return;
    }
    let content = '';
    let fields;
    if (kind === 'feedback') {
      fields = [['Name',row.name],['Emp #',String(row.empNo).replace(/^#/, '')],['Type',row.type],['Category',row.category],['Title',row.title],['Feedback Date 1',date(row.feedbackDate1)],['Feedback Date 2',date(row.feedbackDate2)],['Feedback Note',row.note],['Feedback Remarks',row.remarks],['Submit Date',date(row.submitDate)],['Reviewer Comment',row.reviewerComment],['Reviewed By',row.reviewedBy],['Reviewed Date',date(row.reviewedDate)],['Rating',row.rating],['Reward',row.reward],['Status','Pending'],['Attachments',row.attachments?.length ? row.attachments.map(file=>file.name).join(', ') : 'No Data of Attachments']];
    } else if (kind === 'career-plan') {
      fields = [['Name',row.name],['Emp #',String(row.empNo || '').replace(/^#+/, '')],['Position',row.position],['Department',row.department],['Career Path',row.careerPath],['Next Position',row.nextPosition],['Target Date',date(row.targetDate)],['Justification',row.justification],['Action Plan',row.actionPlan],['Development Needs',row.developmentNeeds],['Remarks',row.remarks],['Submit Date',date(row.submitDate)],['Status',row.status || 'Submitted'],['Attachments',row.attachments?.length ? row.attachments.map(file=>file.name).join(', ') : 'No Data of Attachments']];
    } else {
      fields = [['Description',row.description],['Date',date(row.date)],['Time',`${row.startTime}-${row.endTime}`],['Status','Pass'],['Project',row.project],['Task',row.task],['State',row.state],['Remarks',row.remarks]];
    }
    $('historyDetailBody').innerHTML = content + `<table class="history-detail-table"><tbody>${fields.map(([key,value]) => {
      if (key === 'Emp #') return detailRow(key,`<span class="career-history-employee-id">#${escape(value)}</span>`,true);
      return detailRow(key,key === 'Status' ? recordDetailStatus.html(value) : value,key === 'Status');
    }).join('')}</tbody></table>`;
  }

  function init() {
    $('careerHistoryBack').href = `../index.html?scope=individual&theme=${theme()}`;
    new MutationObserver(() => {$('careerHistoryBack').href = `../index.html?scope=individual&theme=${theme()}`;}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    refreshFeedbackFilters();
    selectOptions('historyYear','All Years',records.whereabout.map(row=>row.date.slice(0,4)));
    months.forEach((month,index)=>$('historyMonth')?.add(new Option(month,String(index+1))));
    document.querySelectorAll('[data-history-kind]').forEach(button=>button.addEventListener('click',() => {
      kind = button.dataset.historyKind;
      const url = new URL(location.href);
      url.searchParams.set('category',kind);
      history.replaceState(null,'',url);
      render();
    }));
    $('careerHistoryList').addEventListener('click',event => {
      const deleteButton = event.target.closest('[data-delete-whereabout]');
      if (deleteButton && kind === 'whereabout') {
        requestWhereaboutDelete(records.whereabout.find(row => row.id === deleteButton.dataset.deleteWhereabout));
        return;
      }
      if (event.target.closest('[data-edit-feedback]')) {
        const link = event.target.closest('[data-edit-feedback]');
        const url = new URL(link.href);
        url.searchParams.set('theme', theme());
        link.href = url.href;
        return;
      }
      const card = event.target.closest('[data-record-id]');
      if (!card) return;
      activeRecord = records[kind].find(row=>row.id === card.dataset.recordId);
      renderDetails();
      showModal($('historyDetailsModal'),$('closeHistoryDetails'));
    });
    $('historyFilterTrigger').addEventListener('click',() => {fillFilter(); showModal($('historyFilterModal'),$('closeHistoryFilter'));});
    $('historyDeleteWhereabout').addEventListener('click', () => { if (kind === 'whereabout') requestWhereaboutDelete(activeRecord); });
    $('whereaboutDeleteConfirm').addEventListener('click', confirmWhereaboutDelete);
    [$('whereaboutDeleteCancel'), $('whereaboutDeleteClose')].forEach(button => button.addEventListener('click', cancelWhereaboutDelete));
    $('whereaboutDeleteOverlay').addEventListener('click', event => { if (event.target === $('whereaboutDeleteOverlay')) cancelWhereaboutDelete(); });
    $('historyEditFeedback').addEventListener('click', event => {
      if (kind !== 'feedback' || !activeRecord) { event.preventDefault(); return; }
      $('historyEditFeedback').href = `individual/feedback.html?edit=${encodeURIComponent(activeRecord.id)}&theme=${theme()}`;
      closeModal();
    });
    $('historyDetailBody').addEventListener('click', event => {
      const familyMember = event.target.closest('[data-cv-family-member]');
      if (familyMember) {
        window.EmployeeCareerCVHistoryDetails.openFamilyMember(activeRecord, familyMember);
        return;
      }
      const qualificationCard = event.target.closest('[data-qualification-card-toggle]');
      if (qualificationCard) {
        window.EmployeeCareerCVHistoryDetails.toggleQualificationCard($('historyDetailBody'), qualificationCard.dataset.qualificationCardToggle);
        return;
      }
      const qualificationTab = event.target.closest('[data-qualification-tab]');
      if (qualificationTab) {
        window.EmployeeCareerCVHistoryDetails.selectQualificationTab($('historyDetailBody'), qualificationTab.dataset.qualificationTab, true);
        return;
      }
      const tab = event.target.closest('[data-cv-tab]');
      if (tab) window.EmployeeCareerCVHistoryDetails.selectTab($('historyDetailBody'), tab.dataset.cvTab);
    });
    $('historyDetailBody').addEventListener('keydown', event => {
      if (event.target.closest('[data-qualification-tab]')) window.EmployeeCareerCVHistoryDetails.qualificationKeydown(event, $('historyDetailBody'));
      else window.EmployeeCareerCVHistoryDetails.keydown(event, $('historyDetailBody'));
    });
    $('resetHistoryFilter').addEventListener('click',() => {filters[kind] = {...defaults[kind]}; fillFilter(); render();});
    $('historyFilterForm').addEventListener('submit',event => {
      event.preventDefault();
      if (kind === 'feedback') {
        const from = $('historyDateFrom').value, to = $('historyDateTo').value;
        if (from && to && from > to) {
          $('historyFilterError').hidden = false;
          $('historyFilterError').textContent = 'End Date must be on or after Start Date.';
          $('historyDateTo').focus();
          return;
        }
        filters.feedback = {from,to,type:$('historyFeedbackType').value,category:$('historyFeedbackCategory').value,status:$('historyStatus').value};
      } else if (kind === 'whereabout') filters.whereabout = {year:$('historyYear').value,month:$('historyMonth').value};
      else {
        const from = $('cvHistoryDateFrom').value, to = $('cvHistoryDateTo').value;
        if (from && to && from > to) {
          $('historyFilterError').hidden = false;
          $('historyFilterError').textContent = 'End Date must be on or after Start Date.';
          $('cvHistoryDateTo').focus();
          return;
        }
        filters[kind] = {from, to, status: $('cvHistoryStatus').value};
      }
      render();
      closeModal();
    });
    $('closeHistoryFilter').addEventListener('click',closeModal);
    $('closeHistoryDetails').addEventListener('click',closeModal);
    [$('historyFilterModal'),$('historyDetailsModal')].forEach(overlay=>overlay.addEventListener('click',event=>{if(event.target === overlay) closeModal();}));
    document.addEventListener('keydown',event => {
      if (!modal) return;
      if (event.key === 'Escape') {event.preventDefault(); if (modal === $('whereaboutDeleteOverlay')) cancelWhereaboutDelete(); else closeModal();}
      if (event.key !== 'Tab' || !modal) return;
      const focusable = Array.from(modal.querySelectorAll('button, input, select, textarea, a[href]')).filter(node=>!node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    });
    render();
  }
  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (window.EmployeeCareerFeedbackStore) records.feedback = window.EmployeeCareerFeedbackStore.all();
    records.whereabout = readWhereabouts();
    refreshFeedbackFilters();
    render();
  });
})();
