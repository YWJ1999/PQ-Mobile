(function () {
  const records = [
    {
      reference: 'RBT000000000039',
      empNo: 'EBB12',
      name: 'Farhan binti rahmat',
      position: 'GROUP HR MANAGER',
      status: 'submitted',
      submitDate: '2026-01-07',
      rebateCode: 'TXR02',
      rebateItem: 'BASIC SUPPORTING EQUIPMENT',
      transactionDate: '2025-08-14',
      description: 'Medical Relief',
      receiptNo: '',
      amount: 100,
      attachments: ['Invoice.docx'],
      process: false,
      period: '',
      cycle: '',
      approvalDateLabel: '1 Jan 1',
      approverRemarks: 'Reason required'
    },
    {
      reference: 'RBT000000000049',
      empNo: 'EBB12',
      name: 'Farhan binti rahmat',
      position: 'GROUP HR MANAGER',
      status: 'submitted',
      submitDate: '',
      rebateCode: 'TXR02',
      rebateItem: 'BASIC SUPPORTING EQUIPMENT',
      transactionDate: '2026-03-19',
      description: '',
      receiptNo: '',
      amount: 12,
      attachments: [],
      process: false,
      period: '',
      cycle: '',
      approvalDateLabel: '',
      approverRemarks: ''
    },
    {
      reference: 'RBT000000000050',
      empNo: 'EBB12',
      name: 'Farhan binti rahmat',
      position: 'GROUP HR MANAGER',
      status: 'submitted',
      submitDate: '',
      rebateCode: 'TXR05',
      rebateItem: 'COMPLETE MEDICAL EXAMINATION',
      transactionDate: '2026-03-19',
      description: '',
      receiptNo: '',
      amount: 14,
      attachments: [],
      process: false,
      period: '',
      cycle: '',
      approvalDateLabel: '',
      approverRemarks: ''
    }
  ];

  const defaults = {
    keyword: '',
    startDate: '2026-01-01',
    endDate: '2026-10-03',
    item: 'all',
    status: 'all',
    description: ''
  };
  let appliedFilters = { ...defaults };
  let detailReturnFocus = null;

  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const formatMoney = amount => `RM ${Number(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = value => {
    if (!value) return '—';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  };
  const formatStatus = value => value.charAt(0).toUpperCase() + value.slice(1);
  const effectiveDate = record => record.submitDate || record.transactionDate;
  const periodCycle = record => [record.period, record.cycle].filter(Boolean).join(' / ') || '—';

  function matches(record) {
    const keyword = appliedFilters.keyword.trim().toLowerCase();
    const haystack = [record.reference, record.empNo, record.name, record.position, record.rebateCode, record.rebateItem].join(' ').toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
    const date = effectiveDate(record);
    if (appliedFilters.startDate && date < appliedFilters.startDate) return false;
    if (appliedFilters.endDate && date > appliedFilters.endDate) return false;
    if (appliedFilters.item !== 'all' && record.rebateCode !== appliedFilters.item) return false;
    if (appliedFilters.status !== 'all' && record.status !== appliedFilters.status) return false;
    const description = appliedFilters.description.trim().toLowerCase();
    if (description && !record.description.toLowerCase().includes(description)) return false;
    return true;
  }

  function cardMarkup(record) {
    return `
      <button class="tax-relief-record-card history-card-item" type="button" data-reference="${escapeHtml(record.reference)}" data-status="${escapeHtml(record.status)}" aria-label="Open tax relief record ${escapeHtml(record.reference)}">
        <span class="tax-relief-card-head history-card-header">
          <span class="tax-relief-card-person">
            <span class="tax-relief-employee-name">${escapeHtml(record.name)}</span>
            <span class="tax-relief-employee-id">#${escapeHtml(record.empNo.replace(/^#+/, ''))}</span>
            <span class="history-card-ref">Ref: ${escapeHtml(record.reference)}</span>
          </span>
          <span class="card-status-badge tax-relief-status ${escapeHtml(record.status)}">${escapeHtml(formatStatus(record.status))}</span>
          <i class="fa-solid fa-chevron-right tax-relief-card-chevron" aria-hidden="true"></i>
        </span>
        <span class="tax-relief-card-body history-card-details">
          <span class="tax-relief-stat-grid">
            <span class="tax-relief-stat tax-relief-stat-amount"><span class="tax-relief-stat-label">Amount</span><strong class="tax-relief-stat-value">${escapeHtml(formatMoney(record.amount))}</strong></span>
            <span class="tax-relief-stat"><span class="tax-relief-stat-label">Date</span><strong class="tax-relief-stat-value">${escapeHtml(formatDate(record.transactionDate))}</strong></span>
            <span class="tax-relief-stat tax-relief-stat-wide"><span class="tax-relief-stat-label">Rebate Item</span><strong class="tax-relief-stat-value">${escapeHtml(record.rebateCode)} – ${escapeHtml(record.rebateItem)}</strong></span>
            <span class="tax-relief-stat"><span class="tax-relief-stat-label">Position</span><strong class="tax-relief-stat-value">${escapeHtml(record.position)}</strong></span>
            <span class="tax-relief-stat"><span class="tax-relief-stat-label">Period / Cycle</span><strong class="tax-relief-stat-value">${escapeHtml(periodCycle(record))}</strong></span>
          </span>
        </span>
      </button>`;
  }

  function render() {
    const filtered = records.filter(matches);
    byId('taxReliefRecords').innerHTML = filtered.map(cardMarkup).join('');
    byId('taxReliefEmpty').hidden = filtered.length !== 0;
    byId('taxReliefRecordCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'Record' : 'Records'}`;
    byId('taxReliefFilterSummary').textContent = summaryText(filtered.length);
  }

  function summaryText(count) {
    const parts = [`${count} ${count === 1 ? 'record' : 'records'}`];
    if (appliedFilters.keyword.trim()) parts.push(appliedFilters.keyword.trim());
    if (appliedFilters.item !== 'all') parts.push(appliedFilters.item);
    if (appliedFilters.status !== 'all') parts.push(formatStatus(appliedFilters.status));
    if (appliedFilters.startDate || appliedFilters.endDate) parts.push(formatDate(appliedFilters.startDate) + '\u2013' + formatDate(appliedFilters.endDate));
    return parts.join(' · ');
  }

  function setFilterControls(filters) {
    byId('taxReliefSearch').value = filters.keyword;
    byId('taxReliefStartDate').value = filters.startDate;
    byId('taxReliefEndDate').value = filters.endDate;
    byId('taxReliefItem').value = filters.item;
    byId('taxReliefStatus').value = filters.status;
    byId('taxReliefDescription').value = filters.description;
  }

  function openFilter() {
    setFilterControls(appliedFilters);
    byId('taxReliefFilterError').hidden = true;
    byId('taxReliefFilterModal').classList.add('is-open');
    requestAnimationFrame(() => byId('taxReliefSearch').focus({ preventScroll: true }));
  }

  function closeFilter() {
    byId('taxReliefFilterModal').classList.remove('is-open');
    byId('taxReliefFilterTrigger').focus({ preventScroll: true });
  }

  function resetFilter() {
    appliedFilters = { ...defaults };
    setFilterControls(appliedFilters);
    byId('taxReliefFilterError').hidden = true;
    render();
  }

  function applyFilter(event) {
    event.preventDefault();
    const next = {
      keyword: byId('taxReliefSearch').value,
      startDate: byId('taxReliefStartDate').value,
      endDate: byId('taxReliefEndDate').value,
      item: byId('taxReliefItem').value,
      status: byId('taxReliefStatus').value,
      description: byId('taxReliefDescription').value
    };
    if (next.startDate && next.endDate && next.startDate > next.endDate) {
      const error = byId('taxReliefFilterError');
      error.textContent = 'End Date must be on or after Start Date.';
      error.hidden = false;
      byId('taxReliefEndDate').focus();
      return;
    }
    appliedFilters = next;
    render();
    closeFilter();
  }

  function detailRow(key, value, html = false) {
    return `<div class="tax-relief-detail-row" data-detail-key="${escapeHtml(key)}"><span>${escapeHtml(key)}</span><strong>${html ? value : escapeHtml(value || '—')}</strong></div>`;
  }

  function openDetail(reference, returnFocus) {
    const record = records.find(item => item.reference === reference);
    if (!record) return;
    detailReturnFocus = returnFocus;
    const attachments = record.attachments.length
      ? record.attachments.map(file => `<span class="tax-relief-file"><i class="fa-solid fa-file-word" aria-hidden="true"></i>${escapeHtml(file)}</span>`).join('')
      : '—';
    byId('taxReliefDetailTable').innerHTML = [
      detailRow('Reference #', record.reference),
      detailRow('Emp #', `#${record.empNo.replace(/^#+/, '')}`),
      detailRow('Name', record.name),
      detailRow('Status', formatStatus(record.status)),
      detailRow('Submit Date', formatDate(record.submitDate)),
      detailRow('Rebate Item', record.rebateItem),
      detailRow('Transaction Date', formatDate(record.transactionDate)),
      detailRow('Description', record.description),
      detailRow('Receipt #', record.receiptNo),
      detailRow('Amount', formatMoney(record.amount)),
      detailRow('Attachments', attachments, true),
      detailRow('Process', record.process ? 'Yes' : 'No'),
      detailRow('Period', record.period),
      detailRow('Cycle', record.cycle),
      detailRow('Approval Date', record.approvalDateLabel),
      detailRow('Approver Remarks', record.approverRemarks)
    ].join('');
    byId('taxReliefDetailModal').classList.add('is-open');
    requestAnimationFrame(() => byId('taxReliefDetailModal').querySelector('[data-detail-close]').focus({ preventScroll: true }));
  }

  function closeDetail() {
    byId('taxReliefDetailModal').classList.remove('is-open');
    if (detailReturnFocus?.isConnected) detailReturnFocus.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setFilterControls(appliedFilters);
    render();

    byId('taxReliefFilterTrigger').addEventListener('click', openFilter);
    byId('taxReliefFilterModal').querySelector('[data-filter-close]').addEventListener('click', closeFilter);
    byId('taxReliefFilterModal').querySelector('[data-filter-reset]').addEventListener('click', resetFilter);
    byId('taxReliefFilterModal').querySelector('form').addEventListener('submit', applyFilter);
    byId('taxReliefFilterModal').addEventListener('click', event => {
      if (event.target === byId('taxReliefFilterModal')) closeFilter();
    });
    byId('taxReliefRecords').addEventListener('click', event => {
      const card = event.target.closest('.tax-relief-record-card');
      if (card) openDetail(card.dataset.reference, card);
    });
    byId('taxReliefDetailModal').querySelector('[data-detail-close]').addEventListener('click', closeDetail);
    byId('taxReliefDetailModal').addEventListener('click', event => {
      if (event.target === byId('taxReliefDetailModal')) closeDetail();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (byId('taxReliefDetailModal').classList.contains('is-open')) closeDetail();
      else if (byId('taxReliefFilterModal').classList.contains('is-open')) closeFilter();
    });
  });
})();
