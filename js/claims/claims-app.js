/**
 * PeopleHCM - Claims Application Engine
 * Renders Individual & Team Dashboards matching screenshots 1 & 2.
 * Adheres strictly to AGENTS.md rules & DESIGN.md guidelines.
 */

(function () {
  let activeScope = 'individual'; // 'individual' or 'team'
  let activeBreakdownCategory = 'benefits'; // 'benefits' or 'claims'
  let activeOptionId = 'benefit';
  let activeSubCategoryObj = null;
  let isAttachmentUploaded = false;
  let teamQueue = window.MOCK_TEAM_APPROVALS ? [...window.MOCK_TEAM_APPROVALS] : [];
  let selectedIndividualCalendarDay = Number(window.INDIVIDUAL_TRAVEL_DATA?.selectedDay) || 28;
  let selectedTeamCalendarDay = Number(window.TEAM_TRAVEL_DATA?.selectedDay) || 28;

  function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    const toastText = document.getElementById('toastText');
    if (toast && toastText) {
      toastText.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2800);
    }
  }

  function initClaimsApp() {
    renderDashboardScope(activeScope);
    populateFormDropdowns();
  }

  /**
   * Switch between Individual and Team scope
   */
  function switchClaimScope(scope) {
    activeScope = scope;
    const tabIndiv = document.getElementById('tabClaimIndividual');
    const tabTeam = document.getElementById('tabClaimTeam');
    const secIndiv = document.getElementById('scopeIndividualSection');
    const secTeam = document.getElementById('scopeTeamSection');

    if (scope === 'team') {
      if (tabIndiv) tabIndiv.classList.remove('active');
      if (tabTeam) tabTeam.classList.add('active');
      if (secIndiv) secIndiv.style.display = 'none';
      if (secTeam) secTeam.style.display = 'block';
      renderTeamDashboard();
    } else {
      if (tabTeam) tabTeam.classList.remove('active');
      if (tabIndiv) tabIndiv.classList.add('active');
      if (secTeam) secTeam.style.display = 'none';
      if (secIndiv) secIndiv.style.display = 'block';
      renderIndividualDashboard();
    }
  }

  function renderDashboardScope(scope) {
    switchClaimScope(scope);
  }

  /**
   * ==========================================
   * 1. INDIVIDUAL DASHBOARD RENDERING
   * ==========================================
   */
  function renderIndividualDashboard() {
    document.querySelectorAll('.work-status-card[data-status]').forEach(card => {
      const status = card.dataset.status;
      const count = (window.CLAIM_STATUS_RECORDS || window.MOCK_MY_SUBMISSIONS || []).filter(item => item.status === status || (status === 'submitted' && item.status === 'pending')).length;
      const value = card.querySelector('strong');
      if (value) value.textContent = count;
    });
    renderBreakdownDonutChart('individual', activeBreakdownCategory);
    renderIndividualCalendar();
    renderOptionSquareGrid();
    renderMySubmissions('all');
  }

  /**
   * ==========================================
   * 2. TEAM DASHBOARD RENDERING
   * ==========================================
   */
  function renderTeamDashboard() {
    renderBreakdownDonutChart('team', activeBreakdownCategory);
    renderTeamCalendar();
    renderManagerSquareGrid();
    renderTeamQueue();
  }

  /**
   * ==========================================
   * DYNAMIC SVG DONUT CHART & LEGEND
   * ==========================================
   */
  function toggleBreakdownCategory(scope, cat) {
    activeBreakdownCategory = cat;
    
    // Update button states
    const benefitsBtn = document.getElementById(`${scope}-breakdown-benefits-btn`);
    const claimsBtn = document.getElementById(`${scope}-breakdown-claims-btn`);

    if (benefitsBtn && claimsBtn) {
      if (cat === 'benefits') {
        benefitsBtn.className = 'breakdown-toggle-pill active';
        claimsBtn.className = 'breakdown-toggle-pill';
      } else {
        benefitsBtn.className = 'breakdown-toggle-pill';
        claimsBtn.className = 'breakdown-toggle-pill active';
      }
    }

    renderBreakdownDonutChart(scope, cat);
  }

  function renderBreakdownDonutChart(scope, cat) {
    const dataSet = window.CLAIM_BREAKDOWN_DATA?.[scope]?.[cat];
    if (!dataSet) return;

    const chartContainer = document.getElementById(`${scope}-donut-svg-container`);
    const legendContainer = document.getElementById(`${scope}-breakdown-legend-container`);
    if (!chartContainer || !legendContainer) return;

    const items = dataSet.items;
    const totalVal = items.reduce((acc, i) => acc + i.value, 0);

    // SVG Donut calculation: Radius R=38, Center (50,50), Circumference = 2*PI*38 = 238.761
    const R = 38;
    const C = 238.761;
    let offset = 0;

    let circlesSvg = '';
    items.forEach(item => {
      const pct = item.value / totalVal;
      const dashLen = pct * C;
      const dashOffset = -offset;
      offset += dashLen;

      circlesSvg += `
        <circle 
          cx="50" cy="50" r="${R}" 
          fill="none" 
          stroke="${item.color}" 
          stroke-width="12" 
          stroke-dasharray="${dashLen.toFixed(2)} ${(C - dashLen).toFixed(2)}" 
          stroke-dashoffset="${dashOffset.toFixed(2)}"
          transform="rotate(-90 50 50)"
          style="transition: all 0.4s ease;"
        />
      `;
    });

    chartContainer.innerHTML = `
      <svg viewBox="0 0 100 100" style="width: 170px; height: 170px; display: block; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));">
        <circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--bg-input)" stroke-width="12" />
        ${circlesSvg}
        <text x="50" y="46" text-anchor="middle" font-size="9.5" font-weight="900" fill="var(--text-primary)">${dataSet.total}</text>
        <text x="50" y="57" text-anchor="middle" font-size="5" font-weight="700" fill="var(--text-muted)">${dataSet.label}</text>
      </svg>
    `;

    // Render Legend List
    legendContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; padding: 4px 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); margin-bottom: 8px;">
        <span>Category</span>
        <div style="display: flex; gap: 32px;">
          <span>Amount</span>
          <span>Share</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${items.map(item => `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; padding: 2px 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 3px; background: ${item.color}; display: inline-block;"></span>
              <span style="font-weight: 700; color: var(--text-primary);">${item.category}</span>
            </div>
            <div style="display: flex; gap: 24px; font-weight: 800;">
              <span style="color: var(--text-primary); text-align: right; min-width: 60px;">${item.amount}</span>
              <span style="color: var(--text-muted); text-align: right; min-width: 40px; font-weight: 700;">${item.share}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function openChartBreakdownSheet(scope) {
    const category = activeBreakdownCategory;
    const dataSet = window.CLAIM_BREAKDOWN_DATA?.[scope]?.[category];
    const overlay = document.getElementById('chartBreakdownModalOverlay');
    const context = document.getElementById('chartBreakdownContext');
    const rows = document.getElementById('chartBreakdownRows');
    if (!dataSet || !overlay || !context || !rows) return;

    const scopeLabel = scope === 'team' ? 'Team' : 'Individual';
    const categoryLabel = category === 'claims' ? 'Claims' : 'Benefits';
    context.textContent = `${scopeLabel} • ${categoryLabel}`;
    rows.innerHTML = dataSet.items.map(item => `
      <div class="chart-breakdown-grid chart-breakdown-row">
        <div class="chart-breakdown-category">
          <span class="chart-breakdown-dot" style="background: ${item.color};" aria-hidden="true"></span>
          <span>${item.category}</span>
        </div>
        <span class="chart-breakdown-amount">${item.amount}</span>
        <span class="chart-breakdown-share">${item.share}</span>
      </div>
    `).join('');

    overlay.classList.remove('active');
    overlay.style.display = 'flex';
    void overlay.offsetHeight;
    overlay.classList.add('active');
  }

  function closeChartBreakdownSheet() {
    const overlay = document.getElementById('chartBreakdownModalOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    window.setTimeout(() => {
      if (!overlay.classList.contains('active')) {
        overlay.style.display = '';
      }
    }, 300);
  }

  /**
   * ==========================================
   * INDIVIDUAL TRAVEL CALENDAR (Screenshot 1)
   * ==========================================
   */
  function formatCalendarDate(day) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(2026, 8, day));
  }

  function renderIndividualCalendar() {
    const gridContainer = document.getElementById('individual-calendar-grid');
    if (!gridContainer) return;

    const travelDays = window.INDIVIDUAL_TRAVEL_DATA?.travelDays || [28, 29, 30];
    const today = 24;

    let daysHtml = '';
    daysHtml += `<div class="cal-day empty" aria-hidden="true"></div>`;

    for (let d = 1; d <= 30; d++) {
      const isToday = d === today;
      const isTravel = travelDays.includes(d);
      const isSelected = d === selectedIndividualCalendarDay;
      const classes = ['cal-day'];

      if (isToday) classes.push('today');
      if (isTravel) classes.push('travel-highlight');
      if (isSelected) classes.push('active-pill');

      daysHtml += `
        <button type="button" class="${classes.join(' ')}" data-day="${d}" aria-label="${formatCalendarDate(d)}${isTravel ? ', travel date' : ''}${isToday ? ', today' : ''}" aria-pressed="${isSelected}"${isToday ? ' aria-current="date"' : ''} onclick="window.ClaimsEngine.selectIndividualCalendarDay(${d})">
          <span>${d}</span>
          ${isTravel ? '<span class="dot-indicator"></span>' : ''}
        </button>
      `;
    }

    gridContainer.innerHTML = daysHtml;
    updateIndividualTripDetail(selectedIndividualCalendarDay);
  }

  function selectIndividualCalendarDay(day, focusSelected = false) {
    selectedIndividualCalendarDay = Number(day);
    if (window.INDIVIDUAL_TRAVEL_DATA) window.INDIVIDUAL_TRAVEL_DATA.selectedDay = selectedIndividualCalendarDay;
    let selectedButton = null;
    document.querySelectorAll('#individual-calendar-grid button.cal-day').forEach(button => {
      const isSelected = Number(button.dataset.day) === selectedIndividualCalendarDay;
      button.classList.toggle('active-pill', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) selectedButton = button;
    });
    updateIndividualTripDetail(selectedIndividualCalendarDay);
    if (focusSelected) selectedButton?.focus({ preventScroll: true });
  }

  function updateIndividualTripDetail(day) {
    const detailBox = document.getElementById('individual-trip-detail-card');
    if (!detailBox) return;

    const travelDays = window.INDIVIDUAL_TRAVEL_DATA?.travelDays || [28, 29, 30];
    if (travelDays.includes(day)) {
      const trip = window.INDIVIDUAL_TRAVEL_DATA?.trips?.[0] || {
        route: 'Kuala Lumpur ➔ Penang',
        destination: 'Penang Branch',
        dateToDate: '28 Sep 2026 – 30 Sep 2026',
        dates: '28–30 Sep 2026 • 3 days',
        reason: 'Official Outstation Travel',
        purpose: 'Client visit',
        status: 'Approved'
      };

      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate(day)}
        </div>
        <div style="background: var(--bg-input); border-radius: 18px; padding: 14px 16px; border: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(124, 58, 237, 0.15); color: var(--purple-primary); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                <i class="fa-solid fa-plane-departure"></i>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 800; color: var(--text-primary);">${trip.route || 'Kuala Lumpur ➔ Penang'}</div>
                <div style="font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-top: 1px;">${trip.dates || '28–30 Sep 2026 • 3 days'}</div>
              </div>
            </div>
            <span style="font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 10px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
              ${trip.status || 'Approved'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 12px; border-top: 1px dashed var(--border-subtle); font-size: 11.5px;">
            <div>
              <span style="color: var(--text-muted); font-weight: 600;">Destination:</span>
              <div style="font-weight: 800; color: var(--text-primary); margin-top: 2px;">${trip.destination || 'Penang Branch'}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-weight: 600;">Date to Date:</span>
              <div style="font-weight: 800; color: var(--text-primary); margin-top: 2px;">${trip.dateToDate || '28 Sep 2026 – 30 Sep 2026'}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-weight: 600;">Reason:</span>
              <div style="font-weight: 800; color: var(--text-primary); margin-top: 2px;">${trip.reason || 'Official Outstation Travel'}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-weight: 600;">Purpose:</span>
              <div style="font-weight: 800; color: var(--purple-primary); margin-top: 2px;">${trip.purpose || 'Client visit'}</div>
            </div>
          </div>
        </div>
      `;
    } else if (day === 24) {
      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate(day)} (Today)
        </div>
        <div style="background: var(--bg-input); border-radius: 16px; padding: 12px 14px; border: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted);">
          No travel schedules for today. Office working day.
        </div>
      `;
    } else {
      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate(day)}
        </div>
        <div style="background: var(--bg-input); border-radius: 16px; padding: 12px 14px; border: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted);">
          No travel records for this date.
        </div>
      `;
    }
  }

  /**
   * ==========================================
   * TEAM TRAVEL CALENDAR (Screenshot 2)
   * ==========================================
   */
  function renderTeamCalendar() {
    const gridContainer = document.getElementById('team-calendar-grid');
    if (!gridContainer) return;

    const travelBadges = window.TEAM_TRAVEL_DATA?.travelBadges || {};
    const today = 24;

    let daysHtml = '';
    daysHtml += `<div class="cal-day empty" aria-hidden="true"></div>`;

    for (let d = 1; d <= 30; d++) {
      const isToday = d === today;
      const count = travelBadges[d] || 0;
      const isSelected = d === selectedTeamCalendarDay;
      const classes = ['cal-day'];

      if (isToday) classes.push('today');
      if (count > 0) classes.push('staff-travel-highlight');
      if (isSelected) classes.push('active-pill');

      daysHtml += `
        <button type="button" class="${classes.join(' ')}" data-day="${d}" aria-label="${formatCalendarDate(d)}${count ? `, ${count} staff travelling` : ''}${isToday ? ', today' : ''}" aria-pressed="${isSelected}"${isToday ? ' aria-current="date"' : ''} onclick="window.ClaimsEngine.selectTeamCalendarDay(${d})">
          <span>${d}</span>
          ${count > 0 ? `<span class="staff-count-badge">${count}</span>` : ''}
        </button>
      `;
    }

    gridContainer.innerHTML = daysHtml;
    updateTeamTripDetail(selectedTeamCalendarDay);
  }

  function selectTeamCalendarDay(day, focusSelected = false) {
    selectedTeamCalendarDay = Number(day);
    if (window.TEAM_TRAVEL_DATA) window.TEAM_TRAVEL_DATA.selectedDay = selectedTeamCalendarDay;
    let selectedButton = null;
    document.querySelectorAll('#team-calendar-grid button.cal-day').forEach(button => {
      const isSelected = Number(button.dataset.day) === selectedTeamCalendarDay;
      button.classList.toggle('active-pill', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) selectedButton = button;
    });
    updateTeamTripDetail(selectedTeamCalendarDay);
    if (focusSelected) selectedButton?.focus({ preventScroll: true });
  }

  function teamTripIncludesDay(trip, day) {
    const match = String(trip.dates || '').match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+Sep/i);
    if (!match) return false;
    return day >= Number(match[1]) && day <= Number(match[2]);
  }

  function updateTeamTripDetail(day) {
    const detailBox = document.getElementById('team-trip-detail-card');
    if (!detailBox) return;

    const data = window.TEAM_TRAVEL_DATA;
    if (!data) return;

    const staffList = data.staffTrips.filter(staff => teamTripIncludesDay(staff, day));
    if (staffList.length) {
      detailBox.innerHTML = `
        <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 10px;">
          ${formatCalendarDate(day)} · ${staffList.length} staff
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${staffList.map(s => `
            <div class="team-trip-record" style="background: var(--bg-input); border-radius: 14px; padding: 10px 12px; border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); line-height: 1.2;">${s.name}</div>
                <!-- AGENTS.md Employee ID Presentation Standard: Directly below name, leading # -->
                <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); opacity: 0.8; font-family: monospace, sans-serif; margin-bottom: 4px;">#${s.empNo.replace(/^#/, '')}</div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">${s.trip}</div>
              </div>
              <span style="font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 8px; ${s.status === 'Approved' ? 'background: rgba(16, 185, 129, 0.15); color: #10b981;' : 'background: rgba(245, 158, 11, 0.15); color: #f59e0b;'}">
                ${s.status}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      detailBox.innerHTML = `
        <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate(day)}${day === 24 ? ' (Today)' : ''}
        </div>
        <div style="background: var(--bg-input); border-radius: 16px; padding: 12px 14px; border: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted);">
          No staff travel scheduled for this date.
        </div>
      `;
    }
  }

  /**
   * ==========================================
   * RECENT SUBMISSIONS (INDIVIDUAL)
   * ==========================================
   */
  function renderMySubmissions(filterType = 'all') {
    const container = document.getElementById('mySubmissionsListContainer');
    const badge = document.getElementById('mySubmissionsCountBadge');
    if (!container) return;

    let items = window.MOCK_MY_SUBMISSIONS || [];
    if (filterType !== 'all') {
      items = items.filter(i => i.status === filterType);
    }

    if (badge) badge.textContent = `${items.length} Records`;

    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted);">
          No claim submissions found for this filter.
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'submission-card';
      card.style.cssText = 'background: var(--bg-card); border-radius: 18px; padding: 14px; border: 1px solid var(--border-subtle); margin-bottom: 10px; transition: transform 0.15s ease; cursor: pointer; display: flex; align-items: center; gap: 12px;';

      const statusClass = item.status === 'pending' ? 'pending' : (item.status === 'approved' ? 'approved' : 'rejected');

      card.innerHTML = `
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--bg-input); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
          ${item.icon || '🧾'}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.category}</div>
            <span class="status-badge ${statusClass}">${item.statusText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${item.merchant || item.optionName} • ${item.date}
            </div>
            <div style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); white-space: nowrap; margin-left: 8px;">
              RM ${item.amount.toFixed(2)}
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function filterMySubmissions(filterType, btnEl) {
    document.querySelectorAll('.audit-filter-pill').forEach(el => el.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderMySubmissions(filterType);
  }

  /**
   * ==========================================
   * QUICK OPTIONS GRID HUB
   * ==========================================
   */
  function renderOptionSquareGrid() {
    const container = document.getElementById('claimOptionsHubGrid');
    const badge = document.getElementById('claimModulesCountBadge');
    if (!container) return;

    container.innerHTML = '';
    const options = window.CLAIM_OPTIONS || [];

    if (badge) {
      badge.textContent = `${options.length} Modules`;
    }

    const fileMap = {
      benefit: 'options/benefit-claim.html',
      medical: 'options/medical-claim.html',
      ot: 'options/ot-claim.html',
      travel: 'options/travel-claim.html',
      travel_request: 'options/travel-request.html',
      entertainment: 'options/entertainment-claim.html',
      advance: 'options/advance-claim.html',
      expenses: 'options/expenses-claim.html',
      history: 'options/history.html',
      summary: 'options/summary.html'
    };

    const MAX_VISIBLE = 5;
    const shouldShowViewAll = options.length > 5;
    const displayOptions = shouldShowViewAll ? options.slice(0, MAX_VISIBLE) : options;

    displayOptions.forEach(opt => {
      const card = document.createElement('a');
      card.className = 'claim-square-card';
      card.style.textDecoration = 'none';
      card.href = fileMap[opt.id] || `options/${opt.id}.html`;

      card.innerHTML = `
        <div class="claim-square-icon-wrap">
          ${opt.icon}
        </div>
        <div class="claim-square-title">${opt.name}</div>
      `;

      container.appendChild(card);
    });

    if (shouldShowViewAll) {
      const viewAllCard = document.createElement('button');
      viewAllCard.type = 'button';
      viewAllCard.className = 'claim-square-card';
      viewAllCard.onclick = () => openAllClaimOptionsModal();

      viewAllCard.innerHTML = `
        <div class="claim-square-icon-wrap">
          <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
        </div>
        <div class="claim-square-title">View All</div>
      `;

      container.appendChild(viewAllCard);
    }
  }

  function renderManagerSquareGrid() {
    const container = document.getElementById('managerOptionsGrid');
    if (!container) return;

    container.innerHTML = '';
    const options = window.MANAGER_OPTIONS || [];

    const managerFileMap = {
      benefit_highlight: 'options/benefit-highlight.html',
      staff_entitlement: 'options/staff-entitlement.html',
      expenses_highlight: 'options/expenses-highlight.html',
      staff_summary: 'options/staff-summary.html'
    };

    const MAX_VISIBLE = 5;
    const shouldShowViewAll = options.length > 5;
    const displayOptions = shouldShowViewAll ? options.slice(0, MAX_VISIBLE) : options;

    displayOptions.forEach(opt => {
      const card = document.createElement('a');
      card.className = 'claim-square-card';
      card.style.textDecoration = 'none';
      card.href = opt.link || managerFileMap[opt.id] || `options/${opt.id}.html`;

      card.innerHTML = `
        <div class="claim-square-icon-wrap">
          ${opt.icon}
        </div>
        <div class="claim-square-title">${opt.name}</div>
      `;

      container.appendChild(card);
    });

    if (shouldShowViewAll) {
      const viewAllCard = document.createElement('button');
      viewAllCard.type = 'button';
      viewAllCard.className = 'claim-square-card';
      viewAllCard.onclick = () => openAllClaimOptionsModal();

      viewAllCard.innerHTML = `
        <div class="claim-square-icon-wrap">
          <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
        </div>
        <div class="claim-square-title">View All</div>
      `;

      container.appendChild(viewAllCard);
    }
  }

  function openAllClaimOptionsModal() {
    const modal = document.getElementById('allOptionsModalOverlay');
    const container = document.getElementById('allClaimOptionsModalGrid');
    const title = document.getElementById('allOptionsModalTitle');
    if (!modal || !container) return;

    const options = window.CLAIM_OPTIONS || [];
    if (title) title.textContent = `Quick Options (${options.length})`;

    const fileMap = {
      benefit: 'options/benefit-claim.html',
      medical: 'options/medical-claim.html',
      ot: 'options/ot-claim.html',
      travel: 'options/travel-claim.html',
      travel_request: 'options/travel-request.html',
      entertainment: 'options/entertainment-claim.html',
      advance: 'options/advance-claim.html',
      expenses: 'options/expenses-claim.html',
      history: 'options/history.html',
      summary: 'options/summary.html'
    };

    container.innerHTML = '';
    options.forEach(opt => {
      const card = document.createElement('a');
      card.className = 'claim-square-card';
      card.style.textDecoration = 'none';
      card.href = fileMap[opt.id] || `options/${opt.id}.html`;

      card.innerHTML = `
        <div class="claim-square-icon-wrap">
          ${opt.icon}
        </div>
        <div class="claim-square-title">${opt.name}</div>
      `;

      container.appendChild(card);
    });

    modal.classList.add('active');
  }

  function closeAllClaimOptionsModal() {
    const modal = document.getElementById('allOptionsModalOverlay');
    if (modal) modal.classList.remove('active');
  }

  /**
   * ==========================================
   * PENDING APPROVALS DEDICATED VIEW
   * ==========================================
   */
  let currentPendingTab = 'all';
  let pendingApprovalFilter = null;

  function getPendingApprovalFilter() {
    if (!pendingApprovalFilter && window.PendingApprovalFilter && document.getElementById('pendingApprovalFilterSummaryText')) {
      pendingApprovalFilter = window.PendingApprovalFilter.create('claimPendingFilter', {
        summaryId: 'pendingApprovalFilterSummaryText',
        onApply: renderTeamQueue
      });
    }
    return pendingApprovalFilter;
  }

  function openPendingApprovalFilter() {
    getPendingApprovalFilter()?.open();
  }

  function showTeamPendingApprovals() {
    const mainEl = document.getElementById('teamMainDashboard');
    const secEl = document.getElementById('teamPendingApprovalSection');
    const titleEl = document.getElementById('globalTopTitle');
    const switcherEl = document.getElementById('mainScopeSwitcher');
    
    if (mainEl) mainEl.style.display = 'none';
    if (secEl) secEl.style.display = 'block';
    
    if (titleEl) titleEl.innerHTML = 'Pending Approval';
    if (switcherEl) switcherEl.style.display = 'none';
    
    // Scroll to top
    const contentArea = document.querySelector('.main-content');
    if (contentArea) contentArea.scrollTop = 0;
  }

  function hideTeamPendingApprovals() {
    const mainEl = document.getElementById('teamMainDashboard');
    const secEl = document.getElementById('teamPendingApprovalSection');
    const titleEl = document.getElementById('globalTopTitle');
    const switcherEl = document.getElementById('mainScopeSwitcher');
    
    if (mainEl) mainEl.style.display = 'block';
    if (secEl) secEl.style.display = 'none';
    
    if (titleEl) titleEl.innerHTML = 'Claims &amp; Expenses';
    if (switcherEl) switcherEl.style.display = 'flex';
  }

  function switchPendingTab(tabName, btnElement) {
    currentPendingTab = tabName;
    if (btnElement) {
      const pills = btnElement.parentElement.querySelectorAll('.filter-pill');
      pills.forEach(p => p.classList.remove('active'));
      btnElement.classList.add('active');
    }
    renderTeamQueue();
  }

  /**
   * ==========================================
   * TEAM APPROVALS QUEUE (TEAM DASHBOARD)
   * ==========================================
   */
  function formatPendingClaimPeriod(period, claimDate) {
    const raw = String(period || '').trim();
    if (!raw) return '';

    const yearMonthMatch = raw.match(/^(\d{4})\D*(\d{1,2})$/);
    if (yearMonthMatch) {
      return `${yearMonthMatch[1]}${yearMonthMatch[2].padStart(2, '0')}`;
    }

    if (/^\d{4}$/.test(raw)) {
      const dateMatch = String(claimDate || '').match(/^\d{1,2}[\/-](\d{1,2})[\/-]\d{4}/);
      if (dateMatch) {
        return `${raw}${dateMatch[1].padStart(2, '0')}`;
      }
    }

    return raw;
  }

  function getPendingCardClaimDate(item) {
    const claimType = String(item.optionName || '').toLowerCase();
    const needsSingleDate = claimType.includes('entertainment')
      || claimType.includes('advance')
      || claimType.includes('expense');
    const rawDate = String(item.claimDate || item.date || '12 Sep 2026').trim();

    if (!needsSingleDate) return rawDate;
    if (item.claimDateFrom) return String(item.claimDateFrom).trim();
    return rawDate.split(/\s+(?:-|–|—|to)\s+/i)[0].trim();
  }

  function renderTeamQueue() {
    const container = document.getElementById('teamApprovalsQueue');
    const countVal = document.getElementById('teamPendingCountVal');
    const totalVal = document.getElementById('teamPendingTotalVal');
    const badgeCount = document.getElementById('teamPendingCountBadge');
    const dashCount = document.getElementById('teamDashboardPendingCount');
    const actionCount = document.getElementById('claimTeamActionRequiredCount');
    if (!container) return;

    container.innerHTML = '';
    const pendingCount = teamQueue.length;
    const totalAmt = teamQueue.reduce((acc, curr) => acc + curr.amount, 0);

    if (countVal) countVal.textContent = `${pendingCount} Requests`;
    if (totalVal) totalVal.textContent = `Total: RM ${totalAmt.toFixed(2)}`;
    if (dashCount) dashCount.textContent = pendingCount;
    if (actionCount) actionCount.textContent = pendingCount + ' ' + (pendingCount === 1 ? 'Task' : 'Tasks');

    let filteredQueue = teamQueue;
    if (currentPendingTab !== 'all') {
      filteredQueue = teamQueue.filter(item => {
        if (item.optionName === currentPendingTab) return true;
        const norm = str => (str || '').toLowerCase().replace(/claim/g, '').replace(/s\b/g, '').trim();
        const tabNorm = norm(currentPendingTab);
        const itemNorm = norm(item.optionName);
        return tabNorm && itemNorm && itemNorm === tabNorm;
      });
    }

    const filter = getPendingApprovalFilter();
    if (filter) {
      filteredQueue = filteredQueue.filter(item => {
        const dates = String(item.claimDate || item.date || '').split(/\s+(?:-|–|—|to)\s+/i);
        return filter.matches({
          keyword: [item.userName, item.empNo, `#${item.empNo || ''}`, item.dept, item.optionName, item.title, item.docRef].join(' '),
          startDate: item.claimDateFrom || dates[0],
          endDate: item.claimDateTo || dates[1] || dates[0],
          submittedAt: item.submitDate || item.date,
          outstandingDays: item.outstandingDays
        });
      });
    }

    if (badgeCount) badgeCount.textContent = filteredQueue.length;

    if (filteredQueue.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-subtle);">
          <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
          <div style="font-size: 14px; font-weight: 800; color: var(--text-primary);">No Pending Requests</div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">There are no requests requiring action for this category.</div>
        </div>
      `;
      return;
    }

    filteredQueue.forEach(item => {
      const card = document.createElement('pending-approval-card');
      card.id = `team-card-${item.id}`;
      
      const empIdFormatted = `#${(item.empNo || '004177').replace(/^#+/, '')}`;
      const claimType = item.optionName || 'Benefit Claim';
      const typeTitle = 'Benefit Type';

      const categoryVal = item.benefitType || item.advanceType || item.expenseType || item.medicalType || item.otType || item.travelType || item.subCatName || item.category || 'General';
      const claimDateVal = getPendingCardClaimDate(item);
      const submitDateVal = item.submitDate || item.date || '13 Sep 2026';
      const amountStr = typeof item.amount === 'number' ? `RM ${item.amount.toFixed(2)}` : (item.amount || 'RM 0.00');
      const hoursStr = item.hours || '';
      let amountHourVal = amountStr;
      if (hoursStr && hoursStr !== '0' && hoursStr !== '0.0 hrs' && hoursStr !== '-') {
        amountHourVal = `${amountStr} / ${hoursStr}`;
      }

      card.setAttribute('user-name', item.userName);
      card.setAttribute('emp-id', empIdFormatted);
      card.setAttribute('dept', item.dept);
      card.setAttribute('doc-status', item.docStatus || 'Submitted');
      card.setAttribute('claim-type', claimType);
      card.setAttribute('type-label', typeTitle);
      card.setAttribute('benefit-type', categoryVal);
      card.setAttribute('category', categoryVal);
      card.setAttribute('claim-date', claimDateVal);
      card.setAttribute('submit-date', submitDateVal);
      const isBenefitOrMed = claimType.toLowerCase().includes('benefit') || claimType.toLowerCase().includes('medical');
      card.setAttribute('period', isBenefitOrMed ? '' : formatPendingClaimPeriod(item.period || '202609', item.claimDate || item.date));
      card.setAttribute('amount', amountStr);
      card.setAttribute('hours', hoursStr);
      card.setAttribute('amount-hour', amountHourVal);
      card.setAttribute('receipt', item.receipt || '');
      card.setAttribute('purpose', item.purpose || item.title || '');
      card.setAttribute('title', item.title || '');
      card.setAttribute('item-id', item.id);

      container.appendChild(card);
      PendingApprovalBackup.showAssignment(card.querySelector('.pending-action-grid'), { scope: 'claims', id: item.id });
    });
  }

  function actionTeamClaim(id, action, userName, amount) {
    teamQueue = teamQueue.filter(item => item.id !== id);
    renderTeamQueue();

    if (action === 'approve') {
      showToast(`✔ Approved ${userName}'s claim of ${amount}`);
    } else if (action === 'resubmit') {
      showToast(`ℹ Sent back ${userName}'s claim for resubmission`);
    } else {
      showToast(`✕ Rejected ${userName}'s claim of ${amount}`);
    }
  }

  function toggleSelectAllTeamClaims(checked) {
    const checkboxes = document.querySelectorAll("#teamApprovalsQueue .approval-card-checkbox");
    checkboxes.forEach(cb => cb.checked = checked);
  }

  function approveAllTeamClaims() {
    teamQueue = [];
    renderTeamQueue();
    showToast('🎉 Approved all pending team claims!');
  }

  let currentSelectedClaimData = null;

  function openClaimThreeDotsMenu(btn, itemId) {
    let item = teamQueue.find(q => String(q.id) === String(itemId));
    const card = btn ? btn.closest('pending-approval-card, .approval-request-card') : null;
    
    if (!item && card) {
      const claimType = card.getAttribute('claim-type') || 'Benefit Claim';
      const hoursVal = card.getAttribute('hours') || '';
      const amountVal = card.getAttribute('amount') || 'RM 250.00';
      const amountHourVal = card.getAttribute('amount-hour') || amountVal;

      item = {
        id: itemId || card.getAttribute('item-id') || 1,
        userName: card.getAttribute('user-name') || 'Sarah Jenkins',
        empNo: (card.getAttribute('emp-id') || '#EBB01').replace(/^#+/, ''),
        dept: card.getAttribute('dept') || 'Marketing Lead • Digital Team',
        optionName: claimType,
        subCatName: card.getAttribute('category') || 'General',
        benefitType: card.getAttribute('category') || 'Optical & Wellness',
        medicalType: card.getAttribute('category') || 'General Consultation',
        period: card.getAttribute('period') || '2026-09',
        claimDate: card.getAttribute('claim-date') || '12 Sep 2026',
        submitDate: card.getAttribute('submit-date') || card.getAttribute('date') || '13 Sep 2026',
        date: card.getAttribute('submit-date') || card.getAttribute('date') || '13 Sep 2026',
        amount: amountVal,
        hours: hoursVal,
        amountHour: amountHourVal,
        purpose: card.getAttribute('purpose') || card.getAttribute('title') || 'General claim reimbursement request',
        receipt: card.getAttribute('receipt') || 'Official Receipt',
        docStatus: card.getAttribute('doc-status') || 'Submitted',
        status: card.getAttribute('doc-status') || 'Submitted'
      };
    } else if (item) {
      const amountStr = typeof item.amount === 'number' ? `RM ${item.amount.toFixed(2)}` : (item.amount || 'RM 0.00');
      const hoursStr = item.hours || '';
      let amtHour = amountStr;
      if (hoursStr && hoursStr !== '0' && hoursStr !== '0.0 hrs' && hoursStr !== '-') {
        amtHour = `${amountStr} / ${hoursStr}`;
      }
      item = {
        ...item,
        amount: amountStr,
        hours: hoursStr,
        amountHour: amtHour,
        claimDate: item.claimDate || item.date || '12 Sep 2026',
        submitDate: item.submitDate || item.date || '13 Sep 2026',
        period: item.period || '2026-09',
        purpose: item.purpose || item.title || 'General claim request',
        docStatus: item.docStatus || 'Submitted',
        status: item.docStatus || 'Submitted'
      };
    }

    currentSelectedClaimData = item;

    const titleEl = document.getElementById('claimThreeDotsName');
    if (titleEl && item) {
      titleEl.textContent = `${item.userName} - Claim Options`;
    }

    const overlay = document.getElementById('claimThreeDotsMenuOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.pointerEvents = 'auto';
      void overlay.offsetWidth;
      overlay.style.opacity = '1';
      const sheet = overlay.querySelector('.indicators-sheet');
      if (sheet) sheet.style.transform = 'translateY(0)';
    }
  }

  function closeClaimThreeDotsMenu(event) {
    if (event && event.target && event.target.id !== 'claimThreeDotsMenuOverlay' && !event.target.classList.contains('sheet-close-btn') && !event.target.closest('.sheet-close-btn')) {
      return;
    }
    const overlay = document.getElementById('claimThreeDotsMenuOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      const sheet = overlay.querySelector('.indicators-sheet');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
    }
  }

  let activeMedSubTab = 'general';

  function makeTableRow(label, valueHtml, isLast = false) {
    return `
      <tr>
        <td style="padding: 10px 14px; ${isLast ? 'border-bottom: none;' : 'border-bottom: 1px solid var(--border-subtle);'} border-right: 1px solid var(--border-subtle); font-weight: 700; color: var(--text-muted); background: var(--bg-input); width: 38%; vertical-align: top;">${label}</td>
        <td style="padding: 10px 14px; ${isLast ? 'border-bottom: none;' : 'border-bottom: 1px solid var(--border-subtle);'} color: var(--text-primary); width: 62%; font-weight: 600; line-height: 1.45;">${valueHtml}</td>
      </tr>
    `;
  }

  function makeClaimDetailSection(ariaLabel, title, rowGroups) {
    const groups = Array.isArray(rowGroups) ? rowGroups : [rowGroups];
    return `
      <section class="claim-detail-section" aria-label="${ariaLabel}" style="flex-shrink: 0;">
        ${title ? `
        <h4 class="claim-detail-section-title" style="display: flex; align-items: center; gap: 8px; margin: 2px 2px 9px; color: var(--text-primary); font-size: 13px; font-weight: 850; letter-spacing: -0.1px;">
          <span style="width: 3px; height: 15px; border-radius: 999px; background: var(--purple-primary); box-shadow: 0 0 8px rgba(124, 58, 237, 0.35);"></span>
          ${title}
        </h4>` : ''}
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${groups.map(rowsHtml => `
          <div class="claim-detail-table-grid" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`).join('')}
        </div>
      </section>
    `;
  }

  function renderClaimApproverComments() {
    return `
      <div class="claim-detail-approver-comments" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 12px 14px; flex-shrink: 0;">
        <label for="claimDetailApproverComments" style="display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 11.5px; font-weight: 800;">Approver Action Comments</label>
        <input type="text" id="claimDetailApproverComments" placeholder="Add approver action comments (optional)..." style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-input); color: var(--text-primary); font-size: 12px; font-weight: 500; outline: none; box-sizing: border-box;">
      </div>
    `;
  }

  function renderUnifiedClaimDetail(d) {
    if (!d) return '';

    const claimType = d.optionName || 'Benefit Claim';
    const optLower = claimType.toLowerCase();

    // Format amount (support numbers and strings)
    let amountFormatted = 'RM 0.00';
    if (typeof d.amount === 'number') {
      amountFormatted = `RM ${d.amount.toFixed(2)}`;
    } else if (d.amount) {
      const cleanAmt = String(d.amount).trim();
      amountFormatted = cleanAmt.startsWith('RM') ? cleanAmt : `RM ${cleanAmt}`;
    }

    // Format employee ID and details (conforming to AGENTS.md Employee ID presentation standard)
    const rawEmp = (d.empNo || '004177').replace(/^#+/, '');
    const empNo = rawEmp;
    const deptClean = d.dept || 'Operations • Quality Assurance';
    const docRef = d.docRef || (optLower.includes('medical') ? 'CMD000000000133' : optLower.includes('ot') ? 'BXT000000000283' : 'CBF000000000025');
    const docStatus = d.docStatus || 'Submitted';
    const receiptFile = d.receipt || (d.receiptNo ? `Receipt #${d.receiptNo}` : 'supporting_receipt_docs.pdf');

    const employeeHtml = `
      <div style="font-weight: 800; font-size: 13px; color: var(--text-primary);">${d.userName || 'Employee'}</div>
      <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); opacity: 0.8; font-family: monospace, sans-serif; margin-top: 2px;">#${empNo}</div>
    `;
    const cleanRemarks = String(d.remarks || d.purpose || '-')
      .replace(/\|?undefined/gi, ' ')
      .replace(/\s*\|\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim() || '-';

    if (optLower.includes('medical')) {
      const claimTotal = d.claimTotal;
      const totalText = typeof claimTotal === 'number' ? claimTotal.toFixed(2) : String(claimTotal ?? '').trim();
      const claimTotalFormatted = totalText ? (/^RM\s/i.test(totalText) ? totalText : `RM ${totalText}`) : amountFormatted;
      const periodStart = d.claimPeriodStart || d.period || '-';
      const periodEnd = d.claimPeriodEnd || periodStart;
      const claimPeriod = periodStart === periodEnd ? periodStart : `${periodStart} – ${periodEnd}`;
      const generalRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Benefit Year', d.benefitYear || '2026')}
        ${makeTableRow('Benefit Type', d.benefitType || d.medicalType || d.subCatName || '-')}
        ${makeTableRow('Entitled Balance', `<span style="font-family: monospace; font-weight: 800;">RM ${d.entitledBalance || '0.00'}</span>`)}
        ${makeTableRow('Usable Balance', `<span style="font-family: monospace; font-weight: 800;">RM ${d.usableBalance || '0.00'}</span>`)}
        ${makeTableRow('Claim Period', `<span style="font-family: monospace; font-weight: 800;">${claimPeriod}</span>`)}
        ${makeTableRow('Receipt Date', d.receiptDate || d.claimDate || '-')}
        ${makeTableRow('Receipt No.', d.receiptNo || '-')}
        ${makeTableRow('Claim Total', `<span style="font-family: monospace; font-weight: 850;">${claimTotalFormatted}</span>`)}
        ${makeTableRow('Remark', cleanRemarks, true)}
      `;
      const medicalRows = `
        ${makeTableRow('Patient Type', d.patientType || '-')}
        ${makeTableRow('Patient Name', d.patientName || d.userName || '-')}
        ${makeTableRow('Treatment Type', d.treatmentType || '-')}
        ${makeTableRow('Clinic Location', d.clinicLocation || '-')}
        ${makeTableRow('Clinic / Hospital', d.clinicName || '-')}
        ${makeTableRow('Sickness Type', d.sicknessType || '-', true)}
      `;
      const detailItems = Array.isArray(d.detailItems) && d.detailItems.length ? d.detailItems : [d];
      const detailRowGroups = detailItems.map(item => `
        ${makeTableRow('Receipt No.', item.receiptNo || d.receiptNo || '-')}
        ${makeTableRow('Expenses', item.expenses || item.detailExpenses || d.detailExpenses || '-')}
        ${makeTableRow('Amount', item.amount !== undefined && item !== d ? item.amount : (item.detailAmount || d.detailAmount || '0.00'))}
        ${makeTableRow('Currency', item.currency || item.detailCurrency || d.detailCurrency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Forex Rate', item.forexRate || item.detailForexRate || d.detailForexRate || '1.0000')}
        ${makeTableRow('Local Amount', item.localAmount || item.detailLocalAmount || d.detailLocalAmount || '0.00', true)}
      `);

      return `
        ${makeClaimDetailSection('General', 'General', generalRows)}
        ${makeClaimDetailSection('Medical', 'Medical', medicalRows)}
        ${makeClaimDetailSection('Details', 'Details', detailRowGroups)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('benefit')) {
      const benefitRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Document Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Entitlement Year', d.entitlementYear || '2026')}
        ${makeTableRow('Benefit Type', d.benefitType || d.subCatName || '-')}
        ${makeTableRow('Claim Period', `<span style="font-family: monospace; font-weight: 800;">${d.period || '-'}</span>`)}
        ${makeTableRow('Start Date', d.fromDate || d.claimDate || '-')}
        ${makeTableRow('End Date', d.toDate || d.claimDate || '-')}
        ${makeTableRow('Purpose', d.purpose || '-')}
        ${makeTableRow('Receipt #', d.receiptNo || '-')}
        ${makeTableRow('Other Ref.', d.otherRef || '-')}
        ${makeTableRow('Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Claim Amount', `<span style="font-family: monospace; font-weight: 850;">${amountFormatted}</span>`)}
        ${makeTableRow('Claim Quantity', d.claimQuantity !== undefined ? d.claimQuantity : '-')}
        ${makeTableRow('Remarks', cleanRemarks, true)}
      `;

      return `
        ${makeClaimDetailSection('Benefit claim details', '', benefitRows)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('ot') || optLower.includes('overtime')) {
      const otRows = `
        ${makeTableRow('Document #', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Claim Period', d.period || '-')}
        ${makeTableRow('Date', d.otDate || d.claimDate || '-')}
        ${makeTableRow('OT Type', d.otType || d.subCatName || '-')}
        ${makeTableRow('Start Time', d.startTime || '-')}
        ${makeTableRow('End Time', d.endTime || '-')}
        ${makeTableRow('OT Hours', d.otHours !== undefined ? d.otHours : (d.hours || '0'))}
        ${makeTableRow('Cross Day', d.crossDay || 'False')}
        ${makeTableRow('Break Hours', d.breakHours || '-')}
        ${makeTableRow('Break Minutes', d.breakMinutes || '-')}
        ${makeTableRow('Project', d.project || '-')}
        ${makeTableRow('Reason', d.reason || d.purpose || '-')}
        ${makeTableRow('Meal Allowance Amount', d.mealAllowanceAmount || '0')}
        ${makeTableRow('Meal Allowance', d.mealAllowance || '-')}
        ${makeTableRow('Transport', d.transport || '-')}
        ${makeTableRow('Distance', d.distance || '0')}
        ${makeTableRow('Way', d.way || '-')}
        ${makeTableRow('Mileage Amount', d.mileageAmount || '0')}
        ${makeTableRow('Remarks', cleanRemarks, true)}
      `;

      return `
        ${makeClaimDetailSection('OT claim details', '', otRows)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('travel request')) {
      const generalRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Traveling Period', d.period || '-')}
        ${makeTableRow('Travel Date', `${d.travelDateFrom || '-'} - ${d.travelDateTo || '-'}`)}
        ${makeTableRow('Training Reference', d.trainingReference || '-')}
        ${makeTableRow('Benefit Type', d.benefitType || '-')}
        ${makeTableRow('Travel Type', d.travelType || '-')}
        ${makeTableRow('Purpose', d.purpose || '-')}
        ${makeTableRow('Destination', d.destination || '-')}
        ${makeTableRow('Reason', d.reason || '-')}
        ${makeTableRow('Car Type', d.carType || '-')}
        ${makeTableRow('Selected Passenger(s)', d.passengers || '-')}
        ${makeTableRow('Charge To', d.chargeTo || '-')}
        ${makeTableRow('Accommodation', d.accommodation || 'No')}
        ${makeTableRow('Flight', d.flight || 'No')}
        ${makeTableRow('Remarks', cleanRemarks)}
        ${makeTableRow('Attachment', d.attachment || 'No Data of Attachments', true)}
      `;
      const taskItems = Array.isArray(d.taskItems) && d.taskItems.length ? d.taskItems : [{}];
      const taskGroups = taskItems.map(item => `
        ${makeTableRow('Task', item.task || '-')}
        ${makeTableRow('Purpose', item.purpose || '-')}
        ${makeTableRow('Location', item.location || '-')}
        ${makeTableRow('Dates', item.dates || '-', true)}
      `);
      const requestTravelItems = Array.isArray(d.requestTravelItems) && d.requestTravelItems.length ? d.requestTravelItems : [{}];
      const travelingGroups = requestTravelItems.map(item => `
        ${makeTableRow('Origin', item.origin || '-')}
        ${makeTableRow('Destination', item.destination || '-')}
        ${makeTableRow('Dates', item.dates || '-')}
        ${makeTableRow('Est. Cost', item.estimatedCost || '0.00', true)}
      `);
      const accommodationItems = Array.isArray(d.accommodationItems) && d.accommodationItems.length ? d.accommodationItems : [{}];
      const accommodationGroups = accommodationItems.map(item => `
        ${makeTableRow('Hotel', item.hotel || '-')}
        ${makeTableRow('Check In', item.checkIn || '-')}
        ${makeTableRow('Check Out', item.checkOut || '-', true)}
      `);

      return `
        ${makeClaimDetailSection('General', 'General', generalRows)}
        ${makeClaimDetailSection('Task', 'Task', taskGroups)}
        ${makeClaimDetailSection('Traveling', 'Traveling', travelingGroups)}
        ${makeClaimDetailSection('Accommodation', 'Accommodation', accommodationGroups)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('travel')) {
      const claimDateFrom = d.claimDateFrom || d.claimDate || '-';
      const claimDateTo = d.claimDateTo || d.claimDate || '-';
      const generalRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Claim Period', d.period || '-')}
        ${makeTableRow('Travelling Request #', d.travelRequestNo || '-')}
        ${makeTableRow('Benefit Type', d.benefitType || d.travelType || '-')}
        ${makeTableRow('Claim Date', `${claimDateFrom} - ${claimDateTo}`)}
        ${makeTableRow('Cost Centre', d.costCentre || '-')}
        ${makeTableRow('Charge To', d.chargeTo || '-')}
        ${makeTableRow('Purpose', d.purpose || '-')}
        ${makeTableRow('Project', d.project || '-')}
        ${makeTableRow('Claim Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Claim Total', d.claimTotal || amountFormatted)}
        ${makeTableRow('Remarks', cleanRemarks, true)}
      `;
      const mileageItems = Array.isArray(d.mileageItems) && d.mileageItems.length ? d.mileageItems : [d];
      const mileageGroups = mileageItems.map(item => `
        ${makeTableRow('Description', item.description || '-')}
        ${makeTableRow('Origin', item.origin || '-')}
        ${makeTableRow('Destination', item.destination || '-')}
        ${makeTableRow('Dates', item.dates || '-')}
        ${makeTableRow('Distance (KM)', item.distance || '0.00')}
        ${makeTableRow('Amount', item.amount || '0.00', true)}
      `);
      const travelItems = Array.isArray(d.travelItems) && d.travelItems.length ? d.travelItems : [d];
      const travelGroups = travelItems.map(item => `
        ${makeTableRow('Origin', item.origin || '-')}
        ${makeTableRow('Destination', item.destination || '-')}
        ${makeTableRow('Dates', item.dates || '-')}
        ${makeTableRow('Amount', item.amount || '0.00', true)}
      `);
      const expenseItems = Array.isArray(d.expenseItems) && d.expenseItems.length ? d.expenseItems : [d];
      const expenseGroups = expenseItems.map(item => `
        ${makeTableRow('Expense', item.expense || '-')}
        ${makeTableRow('Dates', item.dates || '-')}
        ${makeTableRow('Amount', item.amount || '0.00', true)}
      `);

      return `
        ${makeClaimDetailSection('General', 'General', generalRows)}
        ${makeClaimDetailSection('Mileage', 'Mileage', mileageGroups)}
        ${makeClaimDetailSection('Travel', 'Travel', travelGroups)}
        ${makeClaimDetailSection('Expense', 'Expense', expenseGroups)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('entertainment')) {
      const yesNo = value => (
        value === true || /^(?:yes|true)$/i.test(String(value || '').trim()) ? 'Yes' : 'No'
      );
      const generalRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Claim Period', d.period || '-')}
        ${makeTableRow('Travelling & Mileage Claim #', d.travellingMileageClaimNo || '-')}
        ${makeTableRow('Benefit Type', d.benefitType || '-')}
        ${makeTableRow('Claim Date', `${d.claimDateFrom || '-'} - ${d.claimDateTo || '-'}`)}
        ${makeTableRow('Cost Centre', d.costCentre || '-')}
        ${makeTableRow('Project', d.project || '-')}
        ${makeTableRow('Entertained Person / Org', d.entertainedPersonOrg || '-')}
        ${makeTableRow('Place Entertained', d.placeEntertained || '-')}
        ${makeTableRow('Purpose', d.purpose || '-')}
        ${makeTableRow('Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Total Amount', d.totalAmount || '0.00')}
        ${makeTableRow('No. of Internal Attendees', d.internalAttendeeCount ?? '0')}
        ${makeTableRow('No. of External Attendees', d.externalAttendeeCount ?? '0')}
        ${makeTableRow('Avg Per Pax', d.avgPerPax || '0.00')}
        ${makeTableRow('Board Approve', yesNo(d.boardApprove))}
        ${makeTableRow('Gift / Ent', yesNo(d.giftEnt))}
        ${makeTableRow('Trv / Hosp', yesNo(d.trvHosp))}
        ${makeTableRow('Remarks', cleanRemarks, true)}
      `;
      const detailItems = Array.isArray(d.entertainmentDetails) && d.entertainmentDetails.length ? d.entertainmentDetails : [{}];
      const detailGroups = detailItems.map(item => `
        ${makeTableRow('Expense', item.expense || '-')}
        ${makeTableRow('Date', item.date || '-')}
        ${makeTableRow('Amount', item.amount || '0.00', true)}
      `);
      const internalAttendees = Array.isArray(d.internalAttendees) && d.internalAttendees.length ? d.internalAttendees : [{}];
      const employeeGroups = internalAttendees.map(item => `
        ${makeTableRow('Employee', item.employee || '-')}
        ${makeTableRow('Position', item.position || '-')}
        ${makeTableRow('Company', item.company || '-')}
        ${makeTableRow('Department', item.department || '-', true)}
      `);
      const externalAttendees = Array.isArray(d.externalAttendees) && d.externalAttendees.length ? d.externalAttendees : [{}];
      const guestGroups = externalAttendees.map(item => `
        ${makeTableRow('Attendee', item.attendee || '-')}
        ${makeTableRow('Company', item.company || '-')}
        ${makeTableRow('Designation', item.designation || '-')}
        ${makeTableRow('Relationship', item.relationship || '-', true)}
      `);

      return `
        ${makeClaimDetailSection('General', 'General', generalRows)}
        ${makeClaimDetailSection('Detail', 'Detail', detailGroups)}
        ${makeClaimDetailSection('Employees', 'Employees', employeeGroups)}
        ${makeClaimDetailSection('Guest', 'Guest', guestGroups)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('advance')) {
      const claimTotal = d.claimTotal || (typeof d.amount === 'number' ? d.amount.toFixed(2) : (d.amount || '0.00'));
      const generalRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Claim Period', d.period || '-')}
        ${makeTableRow('Claim Date', `${d.claimDateFrom || d.claimDate || '-'} - ${d.claimDateTo || d.claimDate || '-'}`)}
        ${makeTableRow('Cost Centre', d.costCentre || '-')}
        ${makeTableRow('Project', d.project || '-')}
        ${makeTableRow('Claim Type', d.claimType || d.advanceType || '-')}
        ${makeTableRow('Benefit Type', d.benefitType || '-')}
        ${makeTableRow('Purpose', d.purpose || '-')}
        ${makeTableRow('Claim Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Claim Total', claimTotal)}
        ${makeTableRow('Remarks', cleanRemarks, true)}
      `;
      const expenseItems = Array.isArray(d.advanceExpenseItems) && d.advanceExpenseItems.length
        ? d.advanceExpenseItems
        : [{ expense: d.benefitType, description: d.subCatName || d.purpose, amount: claimTotal }];
      const expenseGroups = expenseItems.map(item => `
        ${makeTableRow('Expense', item.expense || '-')}
        ${makeTableRow('Description', item.description || '-')}
        ${makeTableRow('Amount', item.amount || '0.00', true)}
      `);

      return `
        ${makeClaimDetailSection('General', 'General', generalRows)}
        ${makeClaimDetailSection('Expense', 'Expense', expenseGroups)}
        ${renderClaimApproverComments()}
      `;
    }

    if (optLower.includes('expense')) {
      const displayValue = value => {
        const cleaned = String(value ?? '').trim();
        return !cleaned || /^-?\s*select\b/i.test(cleaned) ? '-' : cleaned;
      };
      const claimTotal = d.claimTotal || (typeof d.amount === 'number' ? d.amount.toFixed(2) : (d.amount || '0.00'));
      const generalRows = `
        ${makeTableRow('Document Reference', `<span style="font-family: monospace; font-weight: 800;">${docRef}</span>`)}
        ${makeTableRow('Status', docStatus)}
        ${makeTableRow('Employee', employeeHtml)}
        ${makeTableRow('Claim Period', d.period || '-')}
        ${makeTableRow('Start Date', d.claimDateFrom || d.claimDate || '-')}
        ${makeTableRow('End Date', d.claimDateTo || d.claimDate || '-')}
        ${makeTableRow('Benefit Year', d.benefitYear || '-')}
        ${makeTableRow('Benefit Type', displayValue(d.benefitType))}
        ${makeTableRow('Purpose', d.purpose || '-')}
        ${makeTableRow('Claim Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Claim Total', claimTotal)}
        ${makeTableRow('Project', displayValue(d.project))}
        ${makeTableRow('Cost Centre', d.costCentre || '-')}
        ${makeTableRow('Remarks', cleanRemarks, true)}
      `;
      const itemizedDetails = Array.isArray(d.itemizedDetails) && d.itemizedDetails.length
        ? d.itemizedDetails
        : [{ description: d.purpose || d.expenseType, amount: claimTotal }];
      const itemizedGroups = itemizedDetails.map(item => `
        ${makeTableRow('Description', item.description || '-')}
        ${makeTableRow('Amount', item.amount || '0.00', true)}
      `);

      return `
        ${makeClaimDetailSection('Expense claim details', '', generalRows)}
        ${makeClaimDetailSection('Itemized Details', 'Itemized Details', itemizedGroups)}
        ${renderClaimApproverComments()}
      `;
    }

    // Section 1: Specific Claim Rows based on Claim Type
    let specificRowsHtml = '';

    if (optLower.includes('medical')) {
      specificRowsHtml = `
        ${makeTableRow('Medical Type', `<span style="font-weight: 800; color: var(--purple-primary);">${d.subCatName || d.medicalType || 'General Consultation'}</span>`)}
        ${makeTableRow('Benefit Year', d.benefitYear || '2026')}
        ${makeTableRow('Patient Type', d.patientType || 'Employee')}
        ${makeTableRow('Patient Name', `<strong style="color: var(--text-primary);">${d.patientName || d.userName || 'Employee'}</strong>`)}
        ${makeTableRow('Treatment Type', d.treatmentType || 'Out Patient')}
        ${makeTableRow('Clinic / Hospital', `<strong style="color: var(--text-primary);">${d.clinicName || 'Qualitas Health Clinic KLCC'}</strong> ${d.clinicLocation ? `<div style="font-size: 11px; color: var(--text-muted);">${d.clinicLocation}</div>` : ''}`)}
        ${makeTableRow('Sickness Type', d.sicknessType || 'Acute Upper Respiratory Infection')}
        ${makeTableRow('Entitled Balance', `<span style="font-weight: 800; font-family: monospace;">RM ${d.entitledBalance || '800.00'}</span>`)}
        ${makeTableRow('Usable Balance', `<span style="font-weight: 800; color: #10b981; font-family: monospace;">RM ${d.usableBalance || '665.00'}</span>`)}
        ${makeTableRow('Receipt Date', d.receiptDate || d.claimDate || '07/09/2026')}
        ${makeTableRow('Receipt No.', `<span style="font-family: monospace; font-weight: 800;">${d.receiptNo || 'QC-5510'}</span>`)}
        ${makeTableRow('Expense Detail', d.detailExpenses || 'CONSULTATION & MEDICATION')}
        ${makeTableRow('Claim Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Currency', d.currency || d.detailCurrency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Remarks', d.remarks || d.purpose || 'Doctor consultation and prescribed medicine', true)}
      `;
    } else if (optLower.includes('ot') || optLower.includes('overtime')) {
      const otHours = d.hours || (d.otHours ? `${d.otHours} hrs` : '5.0 hrs');
      specificRowsHtml = `
        ${makeTableRow('OT Type', `<span style="font-weight: 800; color: #f59e0b;">${d.otType || d.subCatName || '1.5 OT'}</span>`)}
        ${makeTableRow('OT Date', d.otDate || d.claimDate || '15/04/2024')}
        ${makeTableRow('Shift', d.shift || '8.00AM - 5.30PM')}
        ${makeTableRow('OT Time Window', `<span style="font-family: monospace; font-weight: 800;">${d.startTime || '18:57:00'}</span> to <span style="font-family: monospace; font-weight: 800;">${d.endTime || '23:57:00'}</span>`)}
        ${makeTableRow('OT Hours', `<span style="font-size: 13.5px; font-weight: 800; color: var(--purple-primary);">${otHours}</span>`)}
        ${makeTableRow('Break Hours', d.breakHours || '1.0 hr')}
        ${makeTableRow('Cross Day', d.crossDay || 'False')}
        ${makeTableRow('Reason', d.reason || d.purpose || 'OTHERS')}
        ${makeTableRow('Meal Allowance', (d.mealAllowance && d.mealAllowance !== '- Select Meal Allowance -') ? `${d.mealAllowance} ${d.mealAllowanceAmount && d.mealAllowanceAmount !== '0' ? '(RM ' + d.mealAllowanceAmount + ')' : ''}` : 'None')}
        ${makeTableRow('Transport', (d.transport && d.transport !== '- Select Transport -') ? `${d.transport} ${d.distance && d.distance !== '0' ? '• ' + d.distance + ' km' : ''}` : 'Personal Transport')}
        ${makeTableRow('Total Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Remarks', d.remarks || 'Production maintenance & ad-hoc shift coverage', true)}
      `;
    } else if (optLower.includes('travel')) {
      specificRowsHtml = `
        ${makeTableRow('Travel Type', `<span style="font-weight: 800; color: var(--purple-primary);">${d.travelType || d.subCatName || 'Mileage Claim'}</span>`)}
        ${makeTableRow('Travel Date', d.claimDate || '13 Sep 2026')}
        ${makeTableRow('Destination', `<strong style="color: var(--text-primary);">${d.destination || 'Penang Logistics Hub & Northern Depot'}</strong>`)}
        ${makeTableRow('Transport Mode', d.transportMode || 'Personal Vehicle (Sedan)')}
        ${makeTableRow('Distance', `<span style="font-family: monospace; font-weight: 800;">${d.distance || '120 km'}</span>`)}
        ${makeTableRow('Mileage Rate', d.mileageRate || 'RM 0.80 / km')}
        ${makeTableRow('Mileage Amount', `RM ${d.mileageAmount || '96.00'}`)}
        ${makeTableRow('Toll / Parking', `RM ${d.tollsParking || '24.00'}`)}
        ${makeTableRow('Total Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Receipt / Log', d.receipt || 'GPS Log & Toll Receipt')}
        ${makeTableRow('Remarks', d.purpose || d.remarks || 'Site inspection and equipment servicing travel', true)}
      `;
    } else if (optLower.includes('entertainment')) {
      specificRowsHtml = `
        ${makeTableRow('Entertainment Type', `<span style="font-weight: 800; color: var(--purple-primary);">${d.subCatName || 'Client Lunch'}</span>`)}
        ${makeTableRow('Event Date', d.claimDate || '09 Sep 2026')}
        ${makeTableRow('Venue / Location', `<strong style="color: var(--text-primary);">${d.venue || 'Nobu Kuala Lumpur'}</strong>`)}
        ${makeTableRow('Attendees / Client', d.clientAttendees || 'Mr. Robert Tan (CEO, Alpha Corp) + 2 pax')}
        ${makeTableRow('Receipt No.', `<span style="font-family: monospace; font-weight: 800;">${d.receipt || 'Nobu Invoice #1029'}</span>`)}
        ${makeTableRow('Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Total Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Purpose', d.purpose || 'Quarterly review lunch with key enterprise stakeholders')}
        ${makeTableRow('Remarks', d.remarks || 'Annual enterprise SLA renewal discussion', true)}
      `;
    } else if (optLower.includes('advance')) {
      specificRowsHtml = `
        ${makeTableRow('Advance Type', `<span style="font-weight: 800; color: var(--purple-primary);">${d.advanceType || 'Overseas Travel Advance'}</span>`)}
        ${makeTableRow('Required Date', `<strong style="color: #f59e0b;">${d.requiredDate || '24 Sep 2026'}</strong>`)}
        ${makeTableRow('Settlement Date', `<strong style="color: var(--text-primary);">${d.settlementDate || '15 Oct 2026'}</strong>`)}
        ${makeTableRow('Other Reference', `<span style="font-family: monospace; font-weight: 800;">${d.otherRef || 'ADV-2026-0902'}</span>`)}
        ${makeTableRow('Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Requested Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Purpose / Reason', d.purpose || 'Tokyo Design Summit 2026 travel advance')}
        ${makeTableRow('Remarks', d.remarks || 'Advance requisition for flight and lodging booking', true)}
      `;
    } else if (optLower.includes('expense')) {
      specificRowsHtml = `
        ${makeTableRow('Expense Category', `<span style="font-weight: 800; color: var(--purple-primary);">${d.expenseType || 'Subscriptions & Software'}</span>`)}
        ${makeTableRow('Expense Date', d.claimDate || '20 Sep 2026')}
        ${makeTableRow('Merchant / Supplier', `<strong style="color: var(--text-primary);">${d.merchant || 'Digital Tools SaaS Inc.'}</strong>`)}
        ${makeTableRow('Receipt No.', `<span style="font-family: monospace; font-weight: 800;">${d.receiptNo || 'INV-29014'}</span>`)}
        ${makeTableRow('Tax Invoice', d.taxInvoice || 'Yes (SST 6%)')}
        ${makeTableRow('Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Total Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Purpose', d.purpose || 'Cloud development tools and sandbox subscriptions')}
        ${makeTableRow('Remarks', d.remarks || 'Standard department subscription reimbursement', true)}
      `;
    } else {
      // Default: Benefit Claim
      specificRowsHtml = `
        ${makeTableRow('Benefit Type', `<span style="font-weight: 800; color: var(--purple-primary);">${d.subCatName || d.benefitType || 'PERSONAL ALLOWANCE'}</span>`)}
        ${makeTableRow('Entitlement Year', d.entitlementYear || '2026')}
        ${makeTableRow('Claim Period', `<span style="font-family: monospace; font-weight: 800;">${d.period || '202609'}</span>`)}
        ${makeTableRow('Date Period', d.fromDate ? `${d.fromDate} <span style="color: var(--text-muted); margin: 0 4px;">to</span> ${d.toDate}` : (d.claimDate || '12 Sep 2026'))}
        ${makeTableRow('Claim Quantity', `${d.claimQuantity !== undefined ? d.claimQuantity : '1'} Unit`)}
        ${makeTableRow('Receipt No.', `<span style="font-family: monospace; font-weight: 800;">${d.receiptNo || d.receipt || 'FP-8891'}</span>`)}
        ${makeTableRow('Other Reference', d.otherRef || '-')}
        ${makeTableRow('Currency', d.currency || 'RINGGIT MALAYSIA')}
        ${makeTableRow('Claim Amount', `<span style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); font-family: monospace;">${amountFormatted}</span>`)}
        ${makeTableRow('Remarks', d.remarks || d.purpose || 'General benefit claim reimbursement', true)}
      `;
    }

    return `
      <!-- SECTION 1: CLAIM APPLICATION DETAILS -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 18px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); flex-shrink: 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <tbody>
            ${makeTableRow('Document Reference', `<span style="font-family: monospace; letter-spacing: 0.3px; font-weight: 800; color: var(--text-primary);">${docRef}</span>`)}
            ${makeTableRow('Document Status', `<span style="font-size: 10.5px; font-weight: 800; color: #7c3aed; background: rgba(124, 58, 237, 0.12); padding: 3px 9px; border-radius: 6px; border: 1px solid rgba(124, 58, 237, 0.25);">${docStatus}</span>`)}
            ${makeTableRow('Claim Type', `<span style="color: var(--purple-primary); font-weight: 800; font-size: 12.5px;">${claimType.toUpperCase()}</span>`)}
            ${specificRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- SECTION 2: EMPLOYEE & AUDIT RECORD -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 18px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); flex-shrink: 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <tbody>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); font-weight: 700; color: var(--text-muted); background: var(--bg-input); width: 38%; vertical-align: top;">Employee</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); width: 62%;">
                <div style="font-weight: 800; font-size: 13.5px; color: var(--text-primary);">${d.userName || 'Employee'}</div>
                <!-- AGENTS.md Employee ID Presentation Standard: directly BELOW name, leading #, subtle muted typography -->
                <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); opacity: 0.8; font-family: monospace, sans-serif; margin-top: 2px; margin-bottom: 2px;">#${empNo}</div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">${deptClean}</div>
              </td>
            </tr>
            ${makeTableRow('Department', deptClean)}
            ${makeTableRow('Submitter', d.userName || 'Employee')}
            ${makeTableRow('Submit Date', `<span style="font-family: monospace; font-weight: 700;">${d.submitDate || d.claimDate || '13 Sep 2026'}</span>`)}
            <tr>
              <td style="padding: 10px 14px; border-bottom: none; border-right: 1px solid var(--border-subtle); font-weight: 700; color: var(--text-muted); background: var(--bg-input); width: 38%; vertical-align: top;">Approval Stage</td>
              <td style="padding: 10px 14px; border-bottom: none; color: var(--text-primary); width: 62%;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span style="font-size: 11px; font-weight: 800; color: #7c3aed; background: rgba(124, 58, 237, 0.12); padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(124, 58, 237, 0.25);">Level 1 of 2</span>
                  <span style="font-size: 10.5px; font-weight: 700; color: #059669; background: rgba(16, 185, 129, 0.12); padding: 2px 7px; border-radius: 6px;">● Pending Your Action</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
                  Role: <strong style="color: var(--text-primary);">Line Manager Approval</strong>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 3: VERIFICATION & APPROVER ACTION -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 18px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); flex-shrink: 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <tbody>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); font-weight: 700; color: var(--text-muted); background: var(--bg-input); width: 38%; vertical-align: middle;">Supporting Doc</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); width: 62%;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                    <i class="fa-solid fa-paperclip" style="color: var(--purple-primary); font-size: 13px;"></i>
                    <span style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">${receiptFile}</span>
                  </div>
                  <button type="button" onclick="if (typeof window.ClaimsEngine.showToast === 'function') window.ClaimsEngine.showToast('Opening receipt preview: ${receiptFile.replace(/'/g, "\\'")}', 'info')" style="background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--purple-primary); padding: 4px 9px; border-radius: 7px; font-size: 10.5px; font-weight: 800; cursor: pointer; flex-shrink: 0;">
                    View ↗
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border-bottom: none; border-right: 1px solid var(--border-subtle); font-weight: 700; color: var(--text-muted); background: var(--bg-input); width: 38%; vertical-align: middle;">Comments</td>
              <td style="padding: 8px 12px; border-bottom: none; width: 62%;">
                <input type="text" id="claimDetailApproverComments" placeholder="Add approver action comments (optional)..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-input); color: var(--text-primary); font-size: 12px; font-weight: 500; outline: none; box-sizing: border-box;">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Backward-compatibility aliases
  function renderBenefitClaimDetail(d) { return renderUnifiedClaimDetail(d); }
  function renderMedicalClaimDetail(d) { return renderUnifiedClaimDetail(d); }
  function renderOTClaimDetail(d) { return renderUnifiedClaimDetail(d); }
  function renderTravelClaimDetail(d) { return renderUnifiedClaimDetail(d); }
  function renderEntertainmentClaimDetail(d) { return renderUnifiedClaimDetail(d); }
  function renderAdvanceClaimDetail(d) { return renderUnifiedClaimDetail(d); }
  function renderExpenseClaimDetail(d) { return renderUnifiedClaimDetail(d); }

  function triggerClaimViewDetails(itemId) {
    closeClaimThreeDotsMenu();

    if (itemId !== undefined && itemId !== null) {
      const found = teamQueue.find(q => String(q.id) === String(itemId)) ||
                    (window.MOCK_TEAM_APPROVALS || []).find(q => String(q.id) === String(itemId));
      if (found) {
        currentSelectedClaimData = found;
      }
    }

    if (!currentSelectedClaimData) return;
    const data = currentSelectedClaimData;

    const optName = data.optionName || 'Benefit Claim';
    const optLower = optName.toLowerCase();

    // Dynamically set header modal title matching claim type
    let headerTitleText = 'Benefit Claim Approval';
    if (optLower.includes('medical')) {
      headerTitleText = 'Medical Claim Approval';
    } else if (optLower.includes('ot') || optLower.includes('overtime')) {
      headerTitleText = 'OT Claim Approval';
    } else if (optLower.includes('travel request')) {
      headerTitleText = 'Travel Request Approval';
    } else if (optLower.includes('travel')) {
      headerTitleText = 'Travel Mileage Approval';
    } else if (optLower.includes('entertainment')) {
      headerTitleText = 'Entertainment Claim Approval';
    } else if (optLower.includes('advance')) {
      headerTitleText = 'Advance Request Approval';
    } else if (optLower.includes('expense')) {
      headerTitleText = 'Expense Claim Approval';
    }

    const titleEl = document.getElementById('claimDetailHeaderTitle');
    if (titleEl) titleEl.textContent = headerTitleText;
    const subTitleEl = document.getElementById('claimDetailHeaderSub');
    if (subTitleEl) subTitleEl.textContent = `Review ${headerTitleText.replace(' Approval', '').toLowerCase()} request details`;

    const bodyEl = document.getElementById('claimDetailsDynamicBody');
    if (bodyEl) {
      bodyEl.innerHTML = renderUnifiedClaimDetail(data);
    }

    const commentInput = document.getElementById('claimDetailApproverComments');
    if (commentInput) commentInput.value = '';

    const overlay = document.getElementById('claimDetailsModalOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      void overlay.offsetHeight;
      overlay.classList.add('active');
    }
  }

  function updateMedSubTabsUI(tabName) {
    // Kept for backward compatibility
  }

  function switchMedSubTab(tabName) {
    // Kept for backward compatibility
  }

  function closeClaimDetailsModal(event) {
    if (event && event.target && event.target.id !== 'claimDetailsModalOverlay' && !event.target.closest('#claimDetailBackBtn') && !event.target.classList.contains('sheet-close-btn') && !event.target.closest('.sheet-close-btn')) {
      return;
    }
    const overlay = document.getElementById('claimDetailsModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
    }
  }

  function actionTeamClaimFromModal(id, action) {
    const targetId = (id !== null && id !== undefined) ? id : (currentSelectedClaimData ? currentSelectedClaimData.id : null);
    if (!targetId) {
      closeClaimDetailsModal();
      return;
    }

    const item = teamQueue.find(q => String(q.id) === String(targetId)) || currentSelectedClaimData;
    const userName = item?.userName || 'Employee';
    const amountStr = typeof item?.amount === 'number' ? `RM ${Math.abs(item.amount).toFixed(2)}` : (item?.amount || 'RM 0.00');
    const commentInput = document.getElementById('claimDetailApproverComments');
    const commentText = commentInput ? commentInput.value.trim() : '';

    teamQueue = teamQueue.filter(q => String(q.id) !== String(targetId));
    renderTeamQueue();
    closeClaimDetailsModal();

    let toastMsg = '';
    if (action === 'approve') {
      toastMsg = `✔ Approved ${userName}'s claim of ${amountStr}`;
    } else if (action === 'resubmit') {
      toastMsg = `ℹ Sent back ${userName}'s claim for resubmission`;
    } else {
      toastMsg = `✕ Rejected ${userName}'s claim of ${amountStr}`;
    }
    if (commentText) {
      toastMsg += ` ("${commentText}")`;
    }
    showToast(toastMsg);
  }

  function openDetailMoreMenu() {
    triggerClaimViewWorkflow();
  }

  function triggerClaimViewWorkflow() {
    closeClaimThreeDotsMenu();
    setTimeout(() => {
      const overlay = document.getElementById('claimWorkflowModalOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        const sheet = overlay.querySelector('.indicators-sheet');
        if (sheet) sheet.style.transform = 'translateY(0)';
      }
    }, 200);
  }

  function closeClaimWorkflowModal(event) {
    if (event && event.target && event.target.id !== 'claimWorkflowModalOverlay' && !event.target.classList.contains('sheet-close-btn') && !event.target.closest('.sheet-close-btn')) {
      return;
    }
    const overlay = document.getElementById('claimWorkflowModalOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      const sheet = overlay.querySelector('.indicators-sheet');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
    }
  }

  /**
   * ==========================================
   * FORM DROPDOWNS & ATTACHMENTS
   * ==========================================
   */
  function populateFormDropdowns() {
    const monthSelect = document.getElementById('formPeriodMonth');
    const currSelect = document.getElementById('formCurrency');

    if (monthSelect) {
      monthSelect.innerHTML = '';
      (window.CLAIM_PERIOD_MONTHS || []).forEach(m => {
        const el = document.createElement('option');
        el.value = m;
        el.textContent = m;
        if (m === 'September') el.selected = true;
        monthSelect.appendChild(el);
      });
    }

    if (currSelect) {
      currSelect.innerHTML = '';
      (window.CURRENCIES || []).forEach(c => {
        const el = document.createElement('option');
        el.value = c;
        el.textContent = c;
        if (c.includes('MYR')) el.selected = true;
        currSelect.appendChild(el);
      });
    }
  }

  function handleGlobalBack() {
    const secEl = document.getElementById('teamPendingApprovalSection');
    if (secEl && secEl.style.display === 'block') {
      hideTeamPendingApprovals();
    } else {
      window.history.back();
    }
  }

  // Global Engine Export
  window.ClaimsEngine = {
    initClaimsApp,
    showToast,
    switchClaimScope,
    toggleBreakdownCategory,
    selectIndividualCalendarDay,
    selectTeamCalendarDay,
    renderMySubmissions,
    filterMySubmissions,
    renderTeamQueue,
    actionTeamClaim,
    approveAllTeamClaims,
    toggleSelectAllTeamClaims,
    openAllClaimOptionsModal,
    closeAllClaimOptionsModal,
    openChartBreakdownSheet,
    closeChartBreakdownSheet,
    showTeamPendingApprovals,
    hideTeamPendingApprovals,
    switchPendingTab,
    openPendingApprovalFilter,
    openClaimThreeDotsMenu,
    closeClaimThreeDotsMenu,
    triggerClaimViewDetails,
    closeClaimDetailsModal,
    switchMedSubTab,
    actionTeamClaimFromModal,
    openDetailMoreMenu,
    triggerClaimViewWorkflow,
    closeClaimWorkflowModal,
    handleGlobalBack
  };

  const selectAllPending = document.getElementById('claimsSelectAllPending');
  if (selectAllPending) {
    renderTeamQueue();
    mountPendingApprovalSelection(document.getElementById('teamApprovalsQueue'), selectAllPending, (action, boxes) => {
      const ids = new Set(boxes.map(box => box.closest('.approval-request-card').dataset.itemId));
      const message = formatBulkApprovalResult(action, ids.size, 'claim');
      if (!message) return;
      teamQueue = teamQueue.filter(item => !ids.has(String(item.id)));
      renderTeamQueue();
      showToast(message);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClaimsApp);
  } else {
    initClaimsApp();
  }
  window.addEventListener('load', initClaimsApp);
})();


