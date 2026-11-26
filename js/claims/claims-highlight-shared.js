/* Shared list, KPI, chart, filter and detail rendering for Benefit/Expense Highlight. */
(() => {
  const isBenefit = !!document.getElementById('benefitHighlightTableBody');
  const kind = isBenefit ? 'benefit' : 'expense';
  const source = window.CLAIM_HIGHLIGHT_DATA?.[kind] || [];
  const tableBody = document.getElementById(isBenefit ? 'benefitHighlightTableBody' : 'expensesHighlightTableBody');
  if (!tableBody) return;

  const formatMoney = value => 'RM ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseFilterDate = value => {
    const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return match ? match[3] + match[2].padStart(2, '0') : '';
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function chartDataset() {
    if (isBenefit && typeof benefitChartDataset !== 'undefined') return benefitChartDataset;
    if (!isBenefit && typeof expensesChartDataset !== 'undefined') return expensesChartDataset;
    return {};
  }

  function syncChart(records) {
    const totals = new Map();
    records.flatMap(record => record.details).forEach(detail => totals.set(detail.type, (totals.get(detail.type) || 0) + detail.amount));
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
    const items = [...totals].map(([name, value]) => ({
      name,
      val: formatMoney(value),
      pct: total ? value / total * 100 : 0,
      color: isBenefit ? '#7c3aed' : '#7c3aed'
    }));
    Object.values(chartDataset()).forEach(group => {
      group.total = formatMoney(total);
      group.items = items;
    });
  }

  function render(records) {
    tableBody.innerHTML = records.map((record, index) => `
      <tr style="background:${index % 2 ? 'var(--bg-card-hover)' : 'var(--bg-card)'};border-bottom:1px solid var(--border-subtle);">
        <td class="highlight-employee-id" style="padding:12px 14px;white-space:nowrap;font:700 11.5px monospace;color:var(--text-muted);opacity:.8;">
          ${escapeHtml(formatEmployeeNumber(record.empNo))}
        </td>
        <td class="highlight-employee-name" style="padding:12px 14px;font-weight:800;color:var(--text-primary);font-size:13px;">
          ${escapeHtml(record.name)}
        </td>
        <td style="padding:12px 14px;text-align:right;white-space:nowrap;cursor:pointer">
          <button type="button" class="${kind}-amount-pill" data-amount="${record.amount}" data-highlight-employee="${escapeHtml(record.empNo)}" style="border:0;cursor:pointer;">
            ${formatMoney(record.amount)} <i class="fa-solid fa-chevron-right" aria-hidden="true" style="font-size:9px;opacity:.7"></i>
          </button>
        </td>
      </tr>`).join('');
    const total = records.reduce((sum, record) => sum + record.amount, 0);
    const count = records.reduce((sum, record) => sum + record.details.length, 0);
    document.getElementById('highlightTotalRecords').textContent = count;
    document.getElementById('highlightMetricValue').textContent = formatMoney(total);
    syncChart(records);
  }

  function openDetails(empNo) {
    const record = source.find(item => item.empNo === empNo);
    if (!record) return;
    const prefix = isBenefit ? 'benefit' : 'expense';
    document.getElementById(isBenefit ? 'modalEmpNameText' : 'modalExpenseEmpNameText').textContent = record.name;
    document.getElementById(isBenefit ? 'benefitDetailsList' : 'expenseDetailsList').innerHTML = record.details.map(detail => `
      <article class="${prefix}-detail-record">
        <div class="${prefix}-detail-period-row"><span class="${prefix}-detail-period-value">${detail.period}</span></div>
        <div class="${prefix}-detail-fields">
          <div class="${prefix}-detail-field"><div class="${prefix}-detail-field-label">${isBenefit ? 'Benefit Type' : 'Expense'}</div><div class="${prefix}-detail-type">${escapeHtml(detail.type)}</div></div>
          <div class="${prefix}-detail-field"><div class="${prefix}-detail-field-label">Amount</div><div class="${prefix}-detail-amount">${formatMoney(detail.amount).replace(/^RM /, '')}</div></div>
        </div>
      </article>`).join('');
    document.getElementById(isBenefit ? 'modalTotalAmountDisplay' : 'modalExpenseTotalAmountDisplay').textContent = formatMoney(record.amount);
    const modal = document.getElementById(isBenefit ? 'benefitDetailsModal' : 'expenseDetailsModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.querySelector('.popout-dialog-card').style.transform = 'scale(1)';
    });
  }

  tableBody.addEventListener('click', event => {
    const button = event.target.closest('[data-highlight-employee]');
    if (button) openDetails(button.dataset.highlightEmployee);
  });
  if (isBenefit) window.openBenefitDetailsModal = empNo => openDetails(String(empNo).replace(/^#/, ''));
  else window.openExpenseDetailsModal = empNo => openDetails(String(empNo).replace(/^#/, ''));

  window.submitHighlightFilterModal = () => {
    const keyword = document.getElementById('filterKeyword')?.value.trim().toLowerCase() || '';
    const start = parseFilterDate(document.getElementById('filterStartPeriod')?.value);
    const end = parseFilterDate(document.getElementById('filterEndPeriod')?.value);
    const type = isBenefit ? (document.getElementById('filterHighlightType')?.value || 'All Benefit Types') : '';
    const min = Number(document.getElementById('filterMinAmount')?.value || 0);
    const maxValue = document.getElementById('filterMaxAmount')?.value;
    const max = maxValue ? Number(maxValue) : Infinity;
    const filtered = source.map(record => {
      let details = record.details.filter(detail => (!start || detail.period >= start) && (!end || detail.period <= end));
      if (isBenefit && type !== 'All Benefit Types') details = details.filter(detail => detail.type === type.toUpperCase());
      return { ...record, details, amount: details.reduce((sum, detail) => sum + detail.amount, 0) };
    }).filter(record => (!keyword || `${record.name} #${record.empNo}`.toLowerCase().includes(keyword)) && record.details.length && record.amount >= min && record.amount <= max);
    render(filtered);
    const summary = document.getElementById('highlightFilterSummaryText');
    if (summary) summary.textContent = keyword ? `"${document.getElementById('filterKeyword').value.trim()}"` : 'All Records';
    if (typeof closeHighlightFilterModal === 'function') closeHighlightFilterModal();
  };

  render(source);
})();
