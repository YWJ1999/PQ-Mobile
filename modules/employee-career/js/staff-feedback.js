(() => {
  // Preview data until the Staff Feedback service is connected.
  const employees = [
    ['004177', 'AHMAD RAFY BIN ZULKIPLE'], ['000070', 'YEE SEONG LIEW'],
    ['000030', 'ANDREW'], ['82828', 'EWI ROBERT'], ['A9999', 'ALI BIN AHMAD'],
    ['EBB204', 'JULIANA BINTI OTHMAN'], ['EBB01', 'NUR AISYAH BINTI AZMAN'],
    ['000101', 'TAN WEI MING'], ['000256', 'PRIYA A/P KUMAR'], ['EBB118', 'MUHAMMAD HAFIZ']
  ];
  const examples = [
    { title: 'Flexible working hours', feedback: 'Could we allow a flexible start time for the morning shift? This would help staff manage their daily commute.', type: 'Suggestion', category: 'Policy' },
    { title: 'Meeting room air conditioning', feedback: 'The air conditioning in Meeting Room 2 is not cooling properly. Please arrange a maintenance check.', type: 'Complaint', category: 'Facilities' },
    { title: 'Thank you for the onboarding support', feedback: 'The team made my first week much easier. The guidance and training were clear and helpful.', type: 'Compliment', category: 'Management' },
    { title: 'Improve shift handover notes', feedback: 'A shared checklist would help us record outstanding tasks and make each shift handover clearer.', type: 'Suggestion', category: 'Workplace' },
    { title: 'Update the staff notice board', feedback: 'Please keep the notice board updated with the latest team announcements and upcoming activities.', type: 'General', category: 'Other' },
    { title: 'Shared workspace noise', feedback: 'The shared workspace gets noisy during afternoon calls. Could we set aside a quiet area for focused work?', type: 'Complaint', category: 'Workplace' }
  ];
  const sampleRecords = Array.from({ length: 60 }, (_, index) => {
    const [empNo, name] = employees[index % employees.length];
    const date = new Date(Date.UTC(2026, 9, 5 - (index % 35)));
    const statuses = ['Pending', 'In Progress', 'Resolved', 'Pending', 'Resolved', 'In Progress', 'Pending'];
    const dateText = date.toISOString().slice(0, 10);
    const status = statuses[index % statuses.length];
    return {
      ...examples[index % examples.length], id: 'staff-feedback-' + (index + 1), empNo, name, date: dateText, status,
      feedbackDate1: dateText, feedbackDate2: '', feedbackNote: examples[index % examples.length].feedback,
      reference1: 'FB-' + String(index + 1).padStart(4, '0'),
      feedbackRemarks: index % 6 === 0 ? 'For consideration at the next team discussion.' : '',
      submitDate: dateText,
      reviewerComment: status === 'Resolved' ? 'Reviewed with the team. Follow-up has been completed.' : status === 'In Progress' ? 'The relevant team is reviewing this feedback.' : '',
      reviewedBy: status === 'Pending' ? '' : 'SARAH TAN',
      reviewedDate: status === 'Pending' ? '' : dateText,
      rating: status === 'Resolved' ? 4 : null,
      reward: status === 'Resolved' ? 'RM 50.00' : null,
      attachments: index === 0 ? [{ name: 'Flexible-hours-note.txt', url: '../../assets/staff-feedback-sample-note.txt' }] : []
    };
  });
  const sourceRecords = window.EMPLOYEE_CAREER_STAFF_FEEDBACK_RECORDS || sampleRecords;
  const reviewStorageKey = 'pq_staff_feedback_reviews';
  const selectionStorageKey = 'pq_staff_feedback_review_selection';
  const listStorageKey = 'pq_staff_feedback_list_return';
  function stored(key, fallback) {
    try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  const $ = id => document.getElementById(id);
  const filterIds = { keyword: 'staffFeedbackKeyword', startDate: 'staffFeedbackStartDate', endDate: 'staffFeedbackEndDate', type: 'staffFeedbackType', category: 'staffFeedbackCategory', status: 'staffFeedbackStatus' };
  const defaults = { keyword: '', startDate: '', endDate: '', type: '', category: '', status: '' };
  let applied = { ...defaults };
  let visibleRows = [];
  let currentView = 'list';
  let listScroll = 0;
  let activeOverlay = null;
  let activeReviewRecord = null;
  let returnFocus = null;
  let inerted = [];
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const formatDate = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const employeeNumber = row => '#' + String(row.empNo).replace(/^#/, '');
  const statusLabel = status => status === 'Pending' ? 'Pending' : 'Responded';
  const recordKey = row => String(row.id || [row.empNo, row.date, row.title].join('|'));
  const savedReviews = stored(reviewStorageKey, []);
  const reviewEdits = Array.isArray(savedReviews) ? savedReviews : [];
  const records = sourceRecords.map(record => {
    const edit = reviewEdits.find(item => item?.key === recordKey(record));
    return { ...record, ...(edit ? { reward: edit.reward, rating: edit.rating, reviewerComment: edit.reviewerComment, status: edit.status } : {}) };
  });
  const historyStatus = status => statusLabel(status) === 'Pending' ? 'submitted' : 'draft';
  const statusIcon = status => statusLabel(status) === 'Pending' ? 'fa-clock' : 'fa-reply';
  const statusBadge = status => {
    const badge = element('span', 'status-pill staff-feedback-status ' + historyStatus(status));
    const icon = element('i', 'fa-solid ' + statusIcon(status));
    icon.setAttribute('aria-hidden', 'true');
    badge.append(icon, document.createTextNode(statusLabel(status) || '—'));
    return badge;
  };

  function render() {
    const keyword = applied.keyword.toLowerCase().replace(/^#/, '');
    visibleRows = records.filter(row =>
      (!keyword || `${row.empNo} ${row.name} ${row.title} ${row.feedback}`.toLowerCase().includes(keyword)) &&
      (!applied.startDate || row.date >= applied.startDate) &&
      (!applied.endDate || row.date <= applied.endDate) &&
      (!applied.type || row.type === applied.type) &&
      (!applied.category || row.category === applied.category) &&
      (!applied.status || statusLabel(row.status) === applied.status)
    );
    const cards = visibleRows.map(row => {
      const card = element('article', 'history-card-item staff-feedback-card');
      card.dataset.status = historyStatus(row.status);
      const detailsTrigger = element('div', 'staff-feedback-details-trigger');
      detailsTrigger.tabIndex = 0;
      detailsTrigger.setAttribute('role', 'button');
      detailsTrigger.setAttribute('aria-haspopup', 'dialog');
      detailsTrigger.setAttribute('aria-controls', 'staffFeedbackDetailsOverlay');
      detailsTrigger.setAttribute('aria-label', `View feedback details for ${row.name}: ${row.title}`);
      const header = element('header', 'history-card-header staff-feedback-card-header');
      const identity = element('div', 'history-card-heading');
      identity.append(element('h3', 'history-card-title history-time-row staff-feedback-name', row.name), element('span', 'staff-feedback-emp-no', employeeNumber(row)));
      const end = element('div', 'staff-feedback-card-end');
      end.append(statusBadge(row.status));
      header.append(identity, end);
      const body = element('dl', 'history-card-details staff-feedback-card-body');
      [['Title', row.title, ''], ['Feedback', row.feedbackNote ?? row.feedback, 'is-feedback'], ['Type', row.type, ''], ['Category', row.category, '']].forEach(([label, value, extra]) => {
        const field = element('div', 'staff-feedback-field ' + extra);
        field.append(element('dt', '', label), element('dd', '', value || '-'));
        body.append(field);
      });
      const actions = element('footer', 'staff-feedback-card-actions');
      const reviewButton = element('button', 'staff-feedback-review-button');
      reviewButton.type = 'button';
      reviewButton.dataset.reviewKey = recordKey(row);
      reviewButton.setAttribute('aria-label', `Review feedback from ${row.name}: ${row.title}`);
      reviewButton.append(element('span', '', 'Review'));
      reviewButton.addEventListener('click', event => {
        event.stopPropagation();
        showReview(row);
      });
      reviewButton.addEventListener('keydown', event => event.stopPropagation());
      actions.append(reviewButton);
      detailsTrigger.append(header, body);
      card.append(detailsTrigger, actions);
      const show = () => { detailsTrigger.focus({ preventScroll: true }); showDetails(row); };
      detailsTrigger.addEventListener('click', show);
      detailsTrigger.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(); }
      });
      return card;
    });
    $('staffFeedbackRecords').replaceChildren(...cards);
    $('staffFeedbackTotal').textContent = visibleRows.length;
    $('staffFeedbackEmpty').hidden = visibleRows.length > 0;
    const summary = [];
    if (applied.keyword) summary.push(`Search: ${applied.keyword}`);
    if (applied.startDate && applied.endDate) summary.push(`${formatDate(applied.startDate)} – ${formatDate(applied.endDate)}`);
    else if (applied.startDate) summary.push(`From ${formatDate(applied.startDate)}`);
    else if (applied.endDate) summary.push(`Until ${formatDate(applied.endDate)}`);
    ['type', 'category', 'status'].forEach(key => { if (applied[key]) summary.push(key === 'status' ? statusLabel(applied[key]) : applied[key]); });
    $('staffFeedbackFilterSummary').textContent = summary.join(' · ') || 'All Feedback';
  }

  function attachmentUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      // Local preview attachments stay inside this module.
      const modulePath = new URL('../../', location.href).pathname;
      if (location.protocol === 'file:' && url.protocol === 'file:' && url.pathname.startsWith(modulePath)) return url.href;
    } catch { /* Unavailable attachments remain plain text. */ }
    return null;
  }

  function showDetails(record) {
    const fields = [
      ['Emp #', employeeNumber(record)], ['Name', record.name], ['Type', record.type], ['Category', record.category],
      ['Title', record.title], ['Feedback Date 1', formatDate(record.feedbackDate1 ?? record.date)],
      ['Feedback Date 2', formatDate(record.feedbackDate2)], ['Feedback Note', record.feedbackNote ?? record.feedback],
      ['Feedback Remarks', record.feedbackRemarks], ['Submit Date', formatDate(record.submitDate)],
      ['Reviewer Comment', record.reviewerComment], ['Reviewed By', record.reviewedBy],
      ['Reviewed Date', formatDate(record.reviewedDate)], ['Rating', record.rating], ['Reward', record.reward], ['Status', statusLabel(record.status)]
    ];
    const rows = fields.map(([label, value]) => {
      const row = element('tr', '');
      const cell = element('td', 'detail-popout-value');
      if (label === 'Status') cell.append(recordDetailStatus.create(value));
      else cell.textContent = value === '' || value == null ? '—' : String(value);
      row.append(element('td', 'detail-popout-label', label), cell);
      return row;
    });
    const attachmentRow = element('tr', '');
    const attachmentCell = element('td', 'detail-popout-value');
    if (!record.attachments?.length) attachmentCell.textContent = 'No attachments';
    else {
      const list = element('div', 'staff-feedback-attachments');
      record.attachments.forEach(attachment => {
        const url = attachmentUrl(attachment.url);
        const item = element(url ? 'a' : 'span', 'staff-feedback-attachment');
        if (url) {
          item.href = url;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
          item.download = attachment.name || 'attachment';
          item.setAttribute('aria-label', 'Download attachment ' + (attachment.name || 'Attachment'));
        }
        const icon = element('i', 'fa-solid fa-paperclip');
        icon.setAttribute('aria-hidden', 'true');
        item.append(icon, element('span', '', attachment.name || 'Attachment'));
        list.append(item);
      });
      attachmentCell.append(list);
    }
    attachmentRow.append(element('td', 'detail-popout-label', 'Attachment'), attachmentCell);
    rows.push(attachmentRow);
    $('staffFeedbackDetailsRows').replaceChildren(...rows);
    $('staffFeedbackDetailsOverlay').querySelector('.detail-popout-body').scrollTop = 0;
    openOverlay('staffFeedbackDetailsOverlay', 'staffFeedbackCloseDetails');
  }

  function clearReviewError() {
    $('staffFeedbackReviewError').hidden = true;
    $('staffFeedbackReviewError').textContent = '';
    ['staffFeedbackReward', 'staffFeedbackRating', 'staffFeedbackComments'].forEach(id => $(id).removeAttribute('aria-invalid'));
  }

  function showReview(record) {
    sessionStorage.setItem(selectionStorageKey, JSON.stringify({ key: recordKey(record), record }));
    sessionStorage.setItem(listStorageKey, JSON.stringify({ filters: applied, scroll: document.querySelector('main').scrollTop, key: recordKey(record) }));
    const query = new URLSearchParams({ record: recordKey(record), theme: document.documentElement.dataset.theme || 'dark' });
    window.location.href = `staff-feedback-review.html?${query}`;
  }

  function initReviewPage() {
    const requestedKey = new URLSearchParams(location.search).get('record');
    const selection = stored(selectionStorageKey, null);
    const record = selection?.key === requestedKey ? selection.record : records.find(row => recordKey(row) === requestedKey);
    const syncLinks = () => {
      const href = `staff-feedback.html?theme=${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`;
      $('staffFeedbackReviewBack').href = href;
      $('staffFeedbackCancelReview').href = href;
    };
    syncLinks();
    if (!record) { window.location.replace($('staffFeedbackReviewBack').href); return; }
    activeReviewRecord = record;
    const values = {
      staffFeedbackReviewEmployeeId: employeeNumber(record),
      staffFeedbackReviewName: record.name || '—',
      staffFeedbackReviewType: record.type || '—',
      staffFeedbackReviewCategory: record.category || '—',
      staffFeedbackReviewFeedbackTitle: record.title || '—',
      staffFeedbackReviewDate1: formatDate(record.feedbackDate1 ?? record.date),
      staffFeedbackReviewDate2: formatDate(record.feedbackDate2),
      staffFeedbackReviewReference1: record.reference1 || '—'
    };
    Object.entries(values).forEach(([id, value]) => { $(id).value = value; });
    $('staffFeedbackReward').value = record.reward || '';
    $('staffFeedbackRating').value = record.rating == null ? '' : String(record.rating);
    $('staffFeedbackComments').value = record.reviewerComment || '';
    clearReviewError();
    $('staffFeedbackReviewForm').addEventListener('submit', event => { event.preventDefault(); saveReview(); });
    ['staffFeedbackReward', 'staffFeedbackRating', 'staffFeedbackComments'].forEach(id => {
      $(id).addEventListener(id === 'staffFeedbackComments' ? 'input' : 'change', clearReviewError);
    });
    new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    $('staffFeedbackReviewTitle').focus({ preventScroll: true });
  }

  function showReviewError(control, message) {
    const error = $('staffFeedbackReviewError');
    error.textContent = message;
    error.hidden = false;
    control.setAttribute('aria-invalid', 'true');
    control.focus();
    control.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function saveReview() {
    if (!activeReviewRecord) return;
    const reward = $('staffFeedbackReward');
    const rating = $('staffFeedbackRating');
    const comments = $('staffFeedbackComments');
    clearReviewError();
    if (!reward.value) return showReviewError(reward, 'Reward is required.');
    if (!rating.value) return showReviewError(rating, 'Rating is required.');
    if (!comments.value.trim()) return showReviewError(comments, 'Comments are required.');

    const savedKey = recordKey(activeReviewRecord);
    const edits = reviewEdits.filter(item => item?.key !== savedKey);
    edits.push({ key: savedKey, reward: reward.value, rating: Number(rating.value), reviewerComment: comments.value.trim(), status: 'Resolved' });
    try { sessionStorage.setItem(reviewStorageKey, JSON.stringify(edits)); }
    catch { showReviewError(comments, 'Unable to submit review. Please try again.'); return; }
    sessionStorage.removeItem(selectionStorageKey);
    window.location.href = $('staffFeedbackReviewBack').href;
  }

  function renderChart() {
    const metric = $('staffFeedbackChartMetric').value;
    const metricCopy = {
      status: { title: 'Feedback by status', column: 'Status' },
      type: { title: 'Feedback by type', column: 'Feedback Type' },
      category: { title: 'Feedback by category', column: 'Feedback Category' }
    }[metric];
    const counts = new Map();
    visibleRows.forEach(row => {
      const value = row[metric] || 'Unspecified';
      const label = metric === 'status' ? statusLabel(value) : value;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const palette = ['#a78bfa', '#f59e0b', '#34d399', '#60a5fa', '#f472b6'];
    const statusColors = { Pending: '#f59e0b', Responded: '#7c3aed' };
    const orderedCounts = metric === 'status'
      ? [...counts].sort(([left], [right]) => ['Pending', 'Responded'].indexOf(left) - ['Pending', 'Responded'].indexOf(right))
      : [...counts];
    let currentOffset = 0;
    const circumference = 439.82;
    const legend = [];
    const chartSegments = [];
    orderedCounts.forEach(([label, count]) => {
      const color = metric === 'status' ? statusColors[label] || palette[legend.length % palette.length] : palette[legend.length % palette.length];
      const percentage = count / visibleRows.length * 100;
      const dashLength = percentage / 100 * circumference;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      [['cx', '90'], ['cy', '90'], ['r', '70'], ['fill', 'transparent'], ['stroke', color], ['stroke-width', '22'], ['stroke-dasharray', `${dashLength.toFixed(2)} ${(circumference - dashLength).toFixed(2)}`], ['stroke-dashoffset', (-currentOffset).toFixed(2)]].forEach(([name, value]) => circle.setAttribute(name, value));
      currentOffset += dashLength;
      chartSegments.push(circle);
      const row = element('li', 'staff-feedback-legend-row');
      const swatch = element('span', 'staff-feedback-legend-swatch');
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-hidden', 'true');
      const name = element('span', 'staff-feedback-legend-name');
      name.append(swatch, element('span', '', label));
      row.append(name, element('strong', 'staff-feedback-legend-count', count), element('span', 'staff-feedback-legend-percent', percentage.toFixed(2) + '%'));
      legend.push(row);
    });
    $('staffFeedbackChartTitle').textContent = metricCopy.title;
    $('staffFeedbackChartColumn').textContent = metricCopy.column;
    $('staffFeedbackDonutCircles').replaceChildren(...chartSegments);
    $('staffFeedbackDonutSvg').setAttribute('aria-label', `${visibleRows.length} feedback records. ${orderedCounts.map(([label, count]) => `${label}: ${count}`).join('. ')}`);
    $('staffFeedbackChartTotal').textContent = visibleRows.length;
    $('staffFeedbackChartLegend').replaceChildren(...legend);
    $('staffFeedbackChartEmpty').hidden = visibleRows.length > 0;
  }

  function showView(view) {
    const main = document.querySelector('main');
    if (view === 'chart' && currentView === 'list') listScroll = main.scrollTop;
    currentView = view;
    $('staffFeedbackListView').hidden = view !== 'list';
    $('staffFeedbackChartView').hidden = view !== 'chart';
    $('staffFeedbackPageTitle').textContent = view === 'chart' ? 'Staff Feedback Analysis' : 'Staff Feedback';
    $('staffFeedbackBack').setAttribute('aria-label', view === 'chart' ? 'Back to Staff Feedback' : 'Back to Employee and Career');
    main.scrollTop = view === 'chart' ? 0 : listScroll;
  }

  function openOverlay(id, focusId) {
    activeOverlay = $(id);
    returnFocus = document.activeElement;
    activeOverlay.hidden = false;
    activeOverlay.classList.add('is-open');
    activeOverlay.setAttribute('aria-hidden', 'false');
    inerted = [...activeOverlay.parentElement.children].filter(node => node !== activeOverlay && !node.inert);
    inerted.forEach(node => { node.inert = true; });
    $(focusId).focus({ preventScroll: true });
  }

  function closeOverlay() {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay.classList.remove('is-open');
    activeOverlay.setAttribute('aria-hidden', 'true');
    activeOverlay = null;
    inerted.forEach(node => { node.inert = false; });
    inerted = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function fillFilter(values) {
    Object.entries(filterIds).forEach(([key, id]) => { $(id).value = values[key]; });
    $('staffFeedbackFilterError').hidden = true;
    $('staffFeedbackStartDate').removeAttribute('aria-invalid');
    $('staffFeedbackEndDate').removeAttribute('aria-invalid');
  }

  function applyFilter() {
    const start = $('staffFeedbackStartDate');
    const end = $('staffFeedbackEndDate');
    const invalidRange = start.value && end.value && start.value > end.value;
    const invalidDate = !start.validity.valid ? start : !end.validity.valid ? end : null;
    if (invalidRange || invalidDate) {
      const field = invalidDate || end;
      $('staffFeedbackFilterError').textContent = invalidRange ? 'End Date must be on or after Start Date.' : 'Enter a valid date.';
      $('staffFeedbackFilterError').hidden = false;
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      return;
    }
    applied = Object.fromEntries(Object.entries(filterIds).map(([key, id]) => [key, $(id).value.trim()]));
    closeOverlay();
    render();
    document.querySelector('main').scrollTop = 0;
  }

  function init() {
    if ($('staffFeedbackReviewForm')) { initReviewPage(); return; }
    $('staffFeedbackFilterTrigger').addEventListener('click', () => { fillFilter(applied); openOverlay('staffFeedbackFilterOverlay', 'staffFeedbackKeyword'); });
    $('staffFeedbackCloseFilter').addEventListener('click', closeOverlay);
    $('staffFeedbackResetFilter').addEventListener('click', () => { fillFilter(defaults); applyFilter(); });
    $('staffFeedbackFilterForm').addEventListener('submit', event => { event.preventDefault(); applyFilter(); });
    $('staffFeedbackViewChart').addEventListener('click', () => { renderChart(); showView('chart'); $('staffFeedbackChartMetric').focus({ preventScroll: true }); });
    $('staffFeedbackBack').addEventListener('click', event => {
      if (currentView !== 'chart') return;
      event.preventDefault();
      showView('list');
      $('staffFeedbackViewChart').focus({ preventScroll: true });
    });
    $('staffFeedbackCloseDetails').addEventListener('click', closeOverlay);
    $('staffFeedbackChartMetric').addEventListener('change', renderChart);
    ['staffFeedbackFilterOverlay', 'staffFeedbackDetailsOverlay'].forEach(id => {
      $(id).addEventListener('click', event => { if (event.target === event.currentTarget) closeOverlay(); });
    });
    document.addEventListener('keydown', event => {
      if (!activeOverlay && currentView === 'chart' && event.key === 'Escape') {
        event.preventDefault();
        showView('list');
        $('staffFeedbackViewChart').focus({ preventScroll: true });
        return;
      }
      if (!activeOverlay) return;
      if (event.key === 'Escape') { event.preventDefault(); closeOverlay(); }
      else if (event.key === 'Tab') {
        const controls = [...activeOverlay.querySelectorAll('button, input, select, textarea, a[href]')].filter(node => !node.disabled && node.getClientRects().length);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    const listState = stored(listStorageKey, null);
    if (listState?.filters) applied = Object.fromEntries(Object.keys(defaults).map(key => [key, typeof listState.filters[key] === 'string' ? listState.filters[key] : '']));
    render();
    if (listState) {
      sessionStorage.removeItem(listStorageKey);
      requestAnimationFrame(() => {
        document.querySelector('main').scrollTop = Number(listState.scroll) || 0;
        const target = [...document.querySelectorAll('.staff-feedback-review-button')].find(button => button.dataset.reviewKey === listState.key) || $('staffFeedbackFilterTrigger');
        target.focus({ preventScroll: true });
      });
    }
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
