/**
 * ========================================================
 * PEOPLEHCM PAYROLL APPLICATION ENGINE
 * Handles Individual & Team views, Payslip, EA Form, Tax Relief
 * ========================================================
 */

(function () {
  'use strict';

  let currentScope = 'individual';
  let isPrivacyHidden = false;
  let activeMonthKey = '2026-09';
  let activeEAYear = '2025';
  let currentReliefFilter = 'all';
  let activeTeamPayrollMonth = '';
  let teamPayrollFilterOpener = null;
  let teamPayrollFilterBackground = [];
  let teamPayrollBreakdownOpener = null;
  let teamPayrollBreakdownBackground = [];
  let teamPayrollBreakdownKeydownAttached = false;

  function initPayroll() {
    renderIndividualPayrollHub();
    renderTeamPayrollHub();
    document.querySelectorAll('.request-metric[href]').forEach(link => {
      link.addEventListener('click', () => {
        const target = new URL(link.href);
        target.searchParams.set('theme', getCurrentTheme());
        link.href = target.href;
      });
    });
    const pendingLink = document.getElementById('teamPendingApprovalCard');
    pendingLink?.addEventListener('click', () => {
      const target = new URL(pendingLink.href);
      target.searchParams.set('theme', getCurrentTheme());
      pendingLink.href = target.href;
    });

    // Check URL query / hash for initial scope
    const urlParams = new URLSearchParams(window.location.search);
    const scopeParam = urlParams.get('scope') || (window.location.hash.includes('team') ? 'team' : 'individual');
    if (scopeParam === 'team') {
      switchPayrollScope('team');
    } else {
      switchPayrollScope('individual');
    }
  }

  /**
   * ==========================================
   * 1. SCOPE SWITCHER (INDIVIDUAL vs TEAM)
   * ==========================================
   */
  function switchPayrollScope(scope) {
    currentScope = scope;
    const tabIndiv = document.getElementById('tabPayrollIndividual');
    const tabTeam = document.getElementById('tabPayrollTeam');
    const secIndiv = document.getElementById('scopeIndividualSection');
    const secTeam = document.getElementById('scopeTeamSection');
    const titleEl = document.getElementById('globalTopTitle');
    const switcherEl = document.getElementById('mainScopeSwitcher');

    if (scope === 'team') {
      if (tabIndiv) tabIndiv.classList.remove('active');
      if (tabTeam) tabTeam.classList.add('active');
      if (secIndiv) secIndiv.style.display = 'none';
      if (secTeam) secTeam.style.display = 'block';
      if (switcherEl) switcherEl.style.display = 'flex';
      if (titleEl) titleEl.textContent = 'Payroll';
    } else {
      if (tabTeam) tabTeam.classList.remove('active');
      if (tabIndiv) tabIndiv.classList.add('active');
      if (secTeam) secTeam.style.display = 'none';
      if (secIndiv) secIndiv.style.display = 'block';
      if (switcherEl) switcherEl.style.display = 'flex';
      if (titleEl) titleEl.textContent = 'Payroll';
    }

    // Scroll main content to top
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
  }

  /**
   * ==========================================
   * 2. PRIVACY TOGGLE (NET PAY EYE ICON)
   * ==========================================
   */
  function toggleSalaryPrivacy() {
    isPrivacyHidden = !isPrivacyHidden;
    const amountEls = document.querySelectorAll('.net-pay-masked-text');
    const iconEls = document.querySelectorAll('.privacy-toggle-icon');

    amountEls.forEach(el => {
      const original = el.getAttribute('data-original') || el.textContent;
      if (!el.getAttribute('data-original')) {
        el.setAttribute('data-original', original);
      }
      if (isPrivacyHidden) {
        el.textContent = '••••••••';
      } else {
        el.textContent = original;
      }
    });

    iconEls.forEach(icon => {
      if (isPrivacyHidden) {
        icon.className = 'fa-solid fa-eye-slash privacy-toggle-icon';
      } else {
        icon.className = 'fa-solid fa-eye privacy-toggle-icon';
      }
    });

    if (window.showToast) {
      window.showToast(isPrivacyHidden ? 'Salary figures masked' : 'Salary figures visible');
    }
  }

  /**
   * ==========================================
   * 3. INDIVIDUAL HUB RENDERING
   * ==========================================
   */
  function renderIndividualPayrollHub() {
    // Render the individual self-service entries.
    const optionsContainer = document.getElementById('individualPayrollOptionsGrid');
    if (optionsContainer && window.PAYROLL_CONFIG?.individualOptions) {
      optionsContainer.innerHTML = '';
      window.PAYROLL_CONFIG.individualOptions.forEach(opt => {
        const card = document.createElement(opt.link ? 'a' : 'button');
        card.className = 'payroll-option-card';
        card.dataset.payrollOption = opt.id;
        if (opt.link) {
          card.href = opt.link;
        } else {
          card.type = 'button';
          card.onclick = () => previewIndividualFeature(opt.action, opt.name);
        }

        card.innerHTML = `
          <div class="opt-icon-wrap" aria-hidden="true">
            ${opt.icon}
          </div>
          <span class="opt-card-title">${opt.name}</span>
        `;
        optionsContainer.appendChild(card);
      });
    }

    // Keep the existing statement renderer available to the Payslip page shell.
    const historyContainer = document.getElementById('individualRecentPayslipsList');
    if (historyContainer && window.PAYROLL_CONFIG?.payslips) {
      historyContainer.innerHTML = '';
      const list = Object.values(window.PAYROLL_CONFIG.payslips);
      list.forEach(item => {
        const row = document.createElement('div');
        row.className = 'recent-payslip-row';
        row.onclick = () => window.location.href = `options/payslip.html?month=${item.monthKey}`;

        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(124, 58, 237, 0.12); color: var(--purple-primary); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
              <i class="fa-regular fa-file-lines"></i>
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${item.monthLabel}</div>
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 2px;">
                Pay Date: ${item.payDate} • <span style="color: #10b981; font-weight: 700;">${item.status}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="net-pay-masked-text" data-original="RM ${item.netPay.toFixed(2)}" style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace, sans-serif;">
              RM ${item.netPay.toFixed(2)}
            </div>
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); margin-top: 2px;">Net Pay</div>
          </div>
        `;
        historyContainer.appendChild(row);
      });
    }
  }

  function previewIndividualFeature(action, label) {
    if (window.showToast) {
      window.showToast(action === 'payroll-history' ? 'Payroll history is coming soon.' : `${label} UI entry is ready for the next screen`);
    }
  }

  /**
   * ==========================================
   * 4. TEAM HUB RENDERING
   * ==========================================
   */
  function renderTeamPayrollHub() {
    const config = window.PAYROLL_CONFIG?.teamPayroll;
    const summaryContainer = document.getElementById('teamPayrollSummaryItems');
    const pendingCount = document.getElementById('teamPendingApprovalCount');
    const actionCount = document.getElementById('payrollTeamActionRequiredCount');
    if (!config || !summaryContainer) return;

    const pendingTotal = window.PayrollPendingStore ? window.PayrollPendingStore.getPending().length : config.pendingApprovalCount || 0;
    if (pendingCount) pendingCount.textContent = String(pendingTotal);
    if (actionCount) actionCount.textContent = pendingTotal + ' ' + (pendingTotal === 1 ? 'Task' : 'Tasks');
    if (!activeTeamPayrollMonth) activeTeamPayrollMonth = config.monthKey;
    updateTeamPayrollPeriodLabels();
    renderTeamPayrollSummary();
    renderTeamPayrollBreakdown();
  }

  function teamPayrollPeriodLabel() {
    const [year, month] = activeTeamPayrollMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  }

  function updateTeamPayrollPeriodLabels() {
    document.querySelectorAll('.team-payroll-month-label').forEach(label => {
      label.textContent = teamPayrollPeriodLabel();
    });
  }

  function hasTeamPayrollPeriodData() {
    return activeTeamPayrollMonth === window.PAYROLL_CONFIG?.teamPayroll?.monthKey;
  }

  function teamPayrollEmptyMessage() {
    return hasTeamPayrollPeriodData() ? 'No payroll components found' : `No payroll data for ${teamPayrollPeriodLabel()}`;
  }

  function renderTeamPayrollSummary() {
    const container = document.getElementById('teamPayrollSummaryItems');
    if (!container) return;
    const groups = hasTeamPayrollPeriodData() ? window.PAYROLL_CONFIG?.teamPayroll?.summaryGroups || [] : [];
    const items = groups.flatMap(group => group.items);

    container.innerHTML = items.length ? items.map(item => `
      <div class="team-summary-item">
        <span>${item.name}</span>
        <strong>${formatTeamPayrollAmount(item.amount)}</strong>
      </div>
    `).join('') : `<div class="team-payroll-empty">${teamPayrollEmptyMessage()}</div>`;
  }

  function setTeamPayrollFilterFields(monthKey) {
    const [year, month] = monthKey.split('-');
    document.getElementById('teamPayrollFilterYear').value = year;
    document.getElementById('teamPayrollFilterMonth').value = month;
  }

  function openTeamPayrollFilter(opener) {
    const sheet = document.getElementById('teamPayrollFilterSheet');
    if (!sheet || sheet.classList.contains('active')) return;
    const defaultYear = Number(window.PAYROLL_CONFIG.teamPayroll.monthKey.slice(0, 4));
    const yearSelect = document.getElementById('teamPayrollFilterYear');
    const monthSelect = document.getElementById('teamPayrollFilterMonth');
    yearSelect.replaceChildren(...[defaultYear + 1, defaultYear, defaultYear - 1, defaultYear - 2].map(year => new Option(String(year), String(year))));
    monthSelect.replaceChildren(...Array.from({ length: 12 }, (_, index) => new Option(new Date(defaultYear, index, 1).toLocaleDateString('en-MY', { month: 'long' }), String(index + 1).padStart(2, '0'))));
    setTeamPayrollFilterFields(activeTeamPayrollMonth);
    teamPayrollFilterOpener = opener || document.activeElement;
    sheet.classList.add('active');
    sheet.setAttribute('aria-hidden', 'false');
    document.getElementById('teamPayrollFilterClose').focus();
    teamPayrollFilterBackground = Array.from(sheet.parentElement.children).filter(el => el !== sheet).map(el => ({ el, inert: el.inert }));
    teamPayrollFilterBackground.forEach(({ el }) => { el.inert = true; });
    document.addEventListener('keydown', handleTeamPayrollFilterKeydown);
  }

  function closeTeamPayrollFilter() {
    const sheet = document.getElementById('teamPayrollFilterSheet');
    if (!sheet || !sheet.classList.contains('active')) return;
    teamPayrollFilterBackground.forEach(({ el, inert }) => { el.inert = inert; });
    teamPayrollFilterBackground = [];
    teamPayrollFilterOpener?.focus();
    sheet.classList.remove('active');
    sheet.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleTeamPayrollFilterKeydown);
  }

  function handleTeamPayrollFilterKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTeamPayrollFilter();
    } else if (event.key === 'Tab') {
      const controls = Array.from(document.querySelectorAll('#teamPayrollFilterSheet button, #teamPayrollFilterSheet select'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function resetTeamPayrollFilter() {
    setTeamPayrollFilterFields(window.PAYROLL_CONFIG.teamPayroll.monthKey);
  }

  function applyTeamPayrollFilter() {
    const year = document.getElementById('teamPayrollFilterYear').value;
    const month = document.getElementById('teamPayrollFilterMonth').value;
    activeTeamPayrollMonth = `${year}-${month}`;
    updateTeamPayrollPeriodLabels();
    renderTeamPayrollSummary();
    renderTeamPayrollBreakdown();
    closeTeamPayrollFilter();
  }

  function formatTeamPayrollAmount(amount) {
    return `RM ${Number(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function renderTeamPayrollBreakdown() {
    const rowsContainer = document.getElementById('teamBreakdownRows');
    const metricsContainer = document.getElementById('teamBreakdownMetrics');
    if (!rowsContainer || !metricsContainer) return;
    const config = window.PAYROLL_CONFIG?.teamPayroll;
    const groups = hasTeamPayrollPeriodData() ? config?.summaryGroups || [] : [];
    const metricLabels = { payments: 'Payments', deductions: 'Deductions', employer: 'Employer' };
    const populatedGroups = groups.map(group => {
      const items = (config.breakdown?.[group.key] || []).filter(item => Number(item.amount) !== 0);
      return {
        ...group,
        items,
        total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      };
    }).filter(group => group.items.length);

    metricsContainer.hidden = !populatedGroups.length;
    metricsContainer.innerHTML = populatedGroups.map(group => `
      <div class="team-breakdown-metric">
        <i class="fa-solid ${group.icon}" aria-hidden="true"></i>
        <span>${metricLabels[group.key] || group.title}</span>
        <strong>${formatTeamPayrollAmount(group.total)}</strong>
      </div>
    `).join('');

    rowsContainer.innerHTML = populatedGroups.length ? populatedGroups.map(group => `
      <section class="team-breakdown-group" data-payroll-group="${group.key}" aria-labelledby="teamBreakdownGroup-${group.key}">
        <header class="team-breakdown-group-header">
          <div class="team-breakdown-group-title">
            <span class="team-breakdown-group-icon" aria-hidden="true"><i class="fa-solid ${group.icon}"></i></span>
            <div>
              <small>Category</small>
              <h3 id="teamBreakdownGroup-${group.key}" class="team-summary-group-title">${group.title}</h3>
            </div>
          </div>
          <strong class="team-breakdown-group-total">${formatTeamPayrollAmount(group.total)}</strong>
        </header>
        <div class="team-breakdown-group-rows">
          ${group.items.map(item => `
            <div class="team-summary-item team-breakdown-row">
              <span>${item.name}</span>
              <strong>${formatTeamPayrollAmount(item.amount)}</strong>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('') : `
      <div class="team-breakdown-empty">${teamPayrollEmptyMessage()}</div>
    `;
  }

  function handleTeamPayrollBreakdownKeydown(event) {
    if (document.getElementById('teamPayrollFilterSheet')?.classList.contains('active')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hideTeamPayrollBreakdown();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(document.querySelectorAll('#teamPayrollBreakdownSection button, #teamPayrollBreakdownSection input')).filter(control => !control.disabled);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showTeamPayrollBreakdown() {
    const sheet = document.getElementById('teamPayrollBreakdownSection');
    if (!sheet || sheet.classList.contains('active')) return;
    teamPayrollBreakdownOpener = document.activeElement;
    renderTeamPayrollBreakdown();
    sheet.classList.add('active');
    sheet.setAttribute('aria-hidden', 'false');
    document.getElementById('teamPayrollBreakdownClose')?.focus();
    teamPayrollBreakdownBackground = Array.from(sheet.parentElement.children)
      .filter(element => element !== sheet)
      .map(element => ({ element, inert: element.inert }));
    teamPayrollBreakdownBackground.forEach(({ element }) => { element.inert = true; });
    if (!teamPayrollBreakdownKeydownAttached) {
      document.addEventListener('keydown', handleTeamPayrollBreakdownKeydown);
      teamPayrollBreakdownKeydownAttached = true;
    }
  }

  function hideTeamPayrollBreakdown() {
    const sheet = document.getElementById('teamPayrollBreakdownSection');
    if (!sheet || !sheet.classList.contains('active')) return;
    teamPayrollBreakdownBackground.forEach(({ element, inert }) => { element.inert = inert; });
    teamPayrollBreakdownBackground = [];
    sheet.classList.remove('active');
    sheet.setAttribute('aria-hidden', 'true');
    if (teamPayrollBreakdownKeydownAttached) {
      document.removeEventListener('keydown', handleTeamPayrollBreakdownKeydown);
      teamPayrollBreakdownKeydownAttached = false;
    }
    const opener = teamPayrollBreakdownOpener;
    teamPayrollBreakdownOpener = null;
    opener?.focus();
  }

  function renderTeamReliefList() {
    const listContainer = document.getElementById('teamTaxReliefQueue');
    const badgeEl = document.getElementById('teamReliefCountBadge');
    if (!listContainer || !window.PAYROLL_CONFIG?.teamTaxRelief?.submissions) return;

    const allItems = window.PAYROLL_CONFIG.teamTaxRelief.submissions;
    let filtered = allItems;
    if (currentReliefFilter !== 'all') {
      filtered = allItems.filter(item => item.category.toLowerCase().includes(currentReliefFilter.toLowerCase()));
    }

    const pendingOnly = filtered.filter(i => i.status === 'pending');
    if (badgeEl) badgeEl.textContent = pendingOnly.length;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-subtle);">
          <div style="font-size: 32px; margin-bottom: 8px;"><i class="fa-solid fa-box-open" aria-hidden="true"></i></div>
          <div style="font-size: 14px; font-weight: 800; color: var(--text-primary);">No Tax Relief Claims</div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">No claims found matching this category.</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'team-relief-card';
      card.id = `relief-card-${item.id}`;

      // AGENTS.md Employee ID Presentation Standard:
      // Employee ID MUST be placed directly BELOW employee name, with leading #, subtle muted typography
      const formattedEmpId = `#${(item.empNo || '000000').replace(/^#+/, '')}`;

      const isPending = item.status === 'pending';
      const statusBadge = isPending 
        ? `<span class="relief-status-pill pending"><i class="fa-solid fa-clock"></i> Pending Review</span>`
        : (item.status === 'approved' 
          ? `<span class="relief-status-pill approved"><i class="fa-solid fa-check"></i> Approved</span>`
          : `<span class="relief-status-pill rejected"><i class="fa-solid fa-xmark"></i> Rejected</span>`);

      card.innerHTML = `
        <!-- Top Banner Header -->
        <div class="relief-card-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="relief-avatar" style="background: ${item.avatarBg}; color: ${item.avatarColor};">
              ${item.avatar}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #ffffff;">${item.userName}</div>
              <!-- AGENTS.md Employee ID Standard: Directly BELOW name -->
              <div style="font-size: 11.5px; font-weight: 700; color: rgba(255, 255, 255, 0.7); opacity: 0.8; font-family: monospace, sans-serif; margin-bottom: 2px;">
                ${formattedEmpId}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.85);">${item.dept}</div>
            </div>
          </div>
          <button type="button" class="relief-menu-btn" onclick="window.PayrollEngine.openReliefReceiptModal('${item.id}')" title="View Proof Receipt">
            <i class="fa-solid fa-receipt"></i>
          </button>
        </div>

        <!-- Card Body -->
        <div class="relief-card-body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            ${statusBadge}
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <i class="fa-regular fa-calendar-check" style="color: var(--purple-primary);"></i>
              <span>Submitted: <strong style="color: var(--text-primary); font-family: monospace, sans-serif;">${item.submitDate}</strong></span>
            </div>
          </div>

          <!-- 2-Column Info Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 10px 12px;">
            <div>
              <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 3px;">Relief Category</div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary); line-height: 1.3;">${item.category}</div>
            </div>
            <div>
              <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 3px;">Claim Date</div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--purple-primary); line-height: 1.3; font-family: monospace, sans-serif;">
                <i class="fa-regular fa-calendar" style="font-size: 11px; margin-right: 3px;"></i>${item.claimDate}
              </div>
            </div>
          </div>

          <!-- Structured Amount & Statutory Limit Box -->
          <div style="background: var(--bg-input); border-radius: 14px; padding: 10px 12px; margin-bottom: 12px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; align-items: center;">
              <span style="color: var(--text-muted); font-weight: 700;">Sub-category:</span>
              <strong style="color: var(--text-primary); font-size: 11.5px; font-weight: 700; text-align: right; max-width: 60%;">${item.subCategory}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; border-top: 1px dashed var(--border-subtle); padding-top: 6px; align-items: center;">
              <span style="color: var(--text-muted); font-weight: 700;">Claim Amount / LHDN Cap:</span>
              <div style="text-align: right;">
                <strong style="color: #10b981; font-family: monospace, sans-serif; font-size: 14.5px; font-weight: 900;">RM ${item.amount.toFixed(2)}</strong>
                <span style="font-size: 11px; color: var(--text-muted); font-weight: 700; margin-left: 4px;">(Max RM ${item.maxStatutoryCap.toFixed(0)})</span>
              </div>
            </div>
          </div>

          <!-- Item Description Box -->
          <div style="background: var(--bg-input); border-radius: 12px; padding: 9px 12px; font-size: 12px; color: var(--text-primary); border: 1px solid var(--border-subtle); line-height: 1.4; margin-bottom: 14px;">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 2px;">Claim Description</div>
            ${item.itemTitle}
          </div>

          <!-- Receipt Reference Row -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-bottom: 14px; padding: 0 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-receipt" style="color: #10b981;"></i>
              <span style="font-weight: 600;">${item.receiptNumber}</span>
            </div>
            <button type="button" onclick="window.PayrollEngine.openReliefReceiptModal('${item.id}')" style="background: none; border: none; color: var(--purple-primary); font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <span>View Proof</span>
              <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 10px;"></i>
            </button>
          </div>

          <!-- Bottom Action Buttons (Only when Pending) -->
          ${isPending ? `
          <div class="pending-action-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="action-btn-reject" onclick="window.PayrollEngine.actionTeamRelief('${item.id}', 'reject', '${item.userName.replace(/'/g, "\\'")}', '${item.amount.toFixed(2)}')">
              <i class="fa-solid fa-xmark" style="font-size: 11.5px;"></i> Reject
            </button>
            <button type="button" class="action-btn-approve" onclick="window.PayrollEngine.actionTeamRelief('${item.id}', 'approve', '${item.userName.replace(/'/g, "\\'")}', '${item.amount.toFixed(2)}')">
              <i class="fa-solid fa-check" style="font-size: 11.5px;"></i> Approve Relief
            </button>
          </div>
          ` : `
          <div style="text-align: center; padding: 6px; font-size: 12px; font-weight: 700; color: ${item.status === 'approved' ? '#10b981' : '#ef4444'};">
            ${item.status === 'approved'
              ? '<i class="fa-solid fa-check" aria-hidden="true"></i> Claim Approved for LHDN Submission'
              : '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Claim Disapproved'}
          </div>
          `}
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  function filterTeamReliefCategory(category, btnEl) {
    currentReliefFilter = category;
    if (btnEl) {
      const pills = btnEl.parentElement.querySelectorAll('.filter-pill');
      pills.forEach(p => p.classList.remove('active'));
      btnEl.classList.add('active');
    }
    renderTeamReliefList();
  }

  function actionTeamRelief(id, action, userName, amount) {
    const list = window.PAYROLL_CONFIG?.teamTaxRelief?.submissions;
    if (!list) return;

    const item = list.find(i => String(i.id) === String(id));
    if (item) {
      item.status = action === 'approve' ? 'approved' : 'rejected';
      renderTeamReliefList();

      if (window.showToast) {
        if (action === 'approve') {
          window.showToast(`Approved ${userName}'s tax relief of RM ${amount}`);
        } else {
          window.showToast(`Rejected ${userName}'s tax relief claim`);
        }
      }
    }
  }

  /**
   * ==========================================
   * 5. RECEIPT / AUDIT PROOF MODAL
   * ==========================================
   */
  function openReliefReceiptModal(id) {
    const list = window.PAYROLL_CONFIG?.teamTaxRelief?.submissions;
    if (!list) return;
    const item = list.find(i => String(i.id) === String(id));
    if (!item) return;

    const overlay = document.getElementById('reliefReceiptModalOverlay');
    if (!overlay) return;

    const setEl = (elemId, text) => {
      const el = document.getElementById(elemId);
      if (el) el.textContent = text || '-';
    };

    setEl('receiptModalEmpName', item.userName);
    setEl('receiptModalEmpId', `#${item.empNo.replace(/^#+/, '')}`);
    setEl('receiptModalCategory', item.category);
    setEl('receiptModalSubCategory', item.subCategory);
    setEl('receiptModalAmount', `RM ${item.amount.toFixed(2)}`);
    setEl('receiptModalMaxCap', `RM ${item.maxStatutoryCap.toFixed(2)}`);
    setEl('receiptModalRef', item.receiptNumber);
    setEl('receiptModalFileName', item.receiptFileName);
    setEl('receiptModalNotes', item.notes);

    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
    const card = overlay.querySelector('.receipt-modal-card');
    if (card) card.style.transform = 'scale(1)';
  }

  function closeReliefReceiptModal(event) {
    if (event && event.target && event.target.id !== 'reliefReceiptModalOverlay' && !event.target.classList.contains('sheet-close-btn') && !event.target.closest('.sheet-close-btn')) {
      return;
    }
    const overlay = document.getElementById('reliefReceiptModalOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      const card = overlay.querySelector('.receipt-modal-card');
      if (card) card.style.transform = 'scale(0.95)';
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
    }
  }

  function handleGlobalBack() {
    const breakdownSection = document.getElementById('teamPayrollBreakdownSection');
    if (breakdownSection?.classList.contains('active')) {
      hideTeamPayrollBreakdown();
      return;
    }

    if (window.navTo) {
      window.navTo('home');
    } else {
      window.location.href = '../../homedark.html';
    }
  }

  function downloadMockFile(filename) {
    if (window.showToast) {
      window.showToast(`Preparing download: ${filename}...`);
    }
  }

  // Public Interface
  window.PayrollEngine = {
    init: initPayroll,
    switchPayrollScope,
    toggleSalaryPrivacy,
    filterTeamReliefCategory,
    actionTeamRelief,
    openReliefReceiptModal,
    closeReliefReceiptModal,
    handleGlobalBack,
    downloadMockFile,
    previewIndividualFeature,
    showTeamPayrollBreakdown,
    hideTeamPayrollBreakdown,
    openTeamPayrollFilter,
    closeTeamPayrollFilter,
    resetTeamPayrollFilter,
    applyTeamPayrollFilter
  };

  document.addEventListener('DOMContentLoaded', () => {
    initPayroll();
  });
  window.addEventListener('pageshow', () => {
    const count = document.getElementById('teamPendingApprovalCount');
    const actionCount = document.getElementById('payrollTeamActionRequiredCount');
    if (window.PayrollPendingStore) {
      const pendingTotal = window.PayrollPendingStore.getPending().length;
      if (count) count.textContent = String(pendingTotal);
      if (actionCount) actionCount.textContent = pendingTotal + ' ' + (pendingTotal === 1 ? 'Task' : 'Tasks');
    }
  });
})();
