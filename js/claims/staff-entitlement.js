(() => {
  const source = window.CLAIM_STAFF_ENTITLEMENT_RECORDS || [];
  const container = document.getElementById('staffEntitlementRecordCardsContainer');
  if (!container) return;
  const formatMoney = value => 'RM ' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function render(records) {
    container.innerHTML = records.map(record => `
      <article class="card" data-entitlement-record style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:20px;padding:16px 18px;box-shadow:var(--shadow-card);display:flex;flex-direction:column;gap:12px;margin-bottom:0;">
        <div class="entitlement-staff-header">
          <div><div style="font-weight:800;font-size:14.5px;color:#fff;line-height:1.2;">${employeeCardHeading.html(record.empNo, record.employeeName)}</div></div>
          <div class="entitlement-benefit-type"><div class="entitlement-benefit-value">${escapeHtml(record.categoryName)}</div></div>
        </div>
        <div class="entitlement-metrics">
          <div class="entitlement-metric"><div class="entitlement-metric-label">Claimed</div><div class="entitlement-metric-value" data-metric="claimed">${formatMoney(record.claimed)}</div></div>
          <div class="entitlement-metric"><div class="entitlement-metric-label">Pending</div><div class="entitlement-metric-value" data-metric="pending">${formatMoney(record.pending)}</div></div>
          <div class="entitlement-metric"><div class="entitlement-metric-label">Entitled</div><div class="entitlement-metric-value" data-metric="entitled">${formatMoney(record.entitled)}</div></div>
          <div class="entitlement-metric entitlement-metric--usable"><div class="entitlement-metric-label">Usable</div><div class="entitlement-metric-value" data-metric="usable">${formatMoney(record.usable)}</div></div>
        </div>
      </article>`).join('');
    document.getElementById('staffEntitlementRecordCount').textContent = records.length;
    document.getElementById('staffEntitlementClaimedTotal').textContent = formatMoney(records.reduce((sum, record) => sum + record.claimed, 0));
    document.getElementById('staffEntitlementUsableTotal').textContent = formatMoney(records.reduce((sum, record) => sum + record.usable, 0));
  }

  window.applyEntitlementFilter = () => {
    const keyword = document.getElementById('filterKeywordInput')?.value.trim().toLowerCase() || '';
    const year = document.getElementById('filterYearSelect')?.value || '2026';
    const type = document.getElementById('filterBenefitTypeSelect')?.value || 'All Benefit Types';
    const band = document.getElementById('filterUtilisationBandSelect')?.value || 'All Utilisation Bands';
    const filtered = source.filter(record => {
      const textMatches = !keyword || `${record.employeeName} #${record.empNo}`.toLowerCase().includes(keyword);
      const typeMatches = type === 'All Benefit Types' || record.categoryName.toLowerCase() === type.toLowerCase();
      const utilization = record.entitled ? ((record.claimed + record.pending) / record.entitled) * 100 : 0;
      const bandMatches = band === 'All Utilisation Bands'
        || (band === '0% - 25%' && utilization <= 25)
        || (band === '26% - 50%' && utilization > 25 && utilization <= 50)
        || (band === '51% - 75%' && utilization > 50 && utilization <= 75)
        || (band === '76% - 100%' && utilization > 75);
      return year === '2026' && textMatches && typeMatches && bandMatches;
    });
    render(filtered);
    const parts = [`Year ${year}`];
    if (keyword) parts.push(`"${document.getElementById('filterKeywordInput').value.trim()}"`);
    if (type !== 'All Benefit Types') parts.push(type);
    if (band !== 'All Utilisation Bands') parts.push(`Util: ${band}`);
    document.getElementById('currentFilterTextDisplay').textContent = parts.join(' • ');
    if (typeof closeEntitlementFilterModal === 'function') closeEntitlementFilterModal();
  };
  render(source);
})();

