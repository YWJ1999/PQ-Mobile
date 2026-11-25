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
  let teamQueue = [...(window.MOCK_TEAM_APPROVALS || [])];
  function syncSavedClaimQueue() {
    const pending = ClaimRequestStore.list().filter(item => item.status === 'submitted');
    teamQueue = [...pending, ...teamQueue.filter(item => !item.savedClaim)];
  }
  syncSavedClaimQueue();
  const travelCalendars = {};

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
    renderDashboardScope(document.getElementById('approveAllTeamClaims') ? 'team' : activeScope);
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
    const submissions = [...ClaimRequestStore.list(), ...(window.CLAIM_STATUS_RECORDS || window.MOCK_MY_SUBMISSIONS || [])];
    document.querySelectorAll('.work-status-card[data-status]').forEach(card => {
      const status = card.dataset.status;
      const count = submissions.filter(item => item.status === status || (status === 'submitted' && item.status === 'pending')).length;
      const value = card.querySelector('strong');
      if (value) value.textContent = count;
    });
    renderBreakdownDonutChart('individual', activeBreakdownCategory);
    renderTravelCalendar('individual');
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
    renderTravelCalendar('team');
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
  function formatCalendarDate(scope, day) {
    return travelCalendars[scope].month.date(day).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function renderTravelCalendar(scope) {
    const grid = document.getElementById(scope + '-calendar-grid');
    if (!grid) return;
    const individual = scope === 'individual';
    const data = individual ? window.INDIVIDUAL_TRAVEL_DATA : window.TEAM_TRAVEL_DATA;
    const state = travelCalendars[scope] ??= { month: calendarMonth(2026, 8), day: Number(data.selectedDay) || 28 };
    const {month} = state;
    const hasData = month.label === data.month;
    document.getElementById(scope + 'TravelMonth').textContent = month.label;
    const count = hasData ? (individual ? data.trips.length : data.tripsCount) : 0;
    const staff = individual ? '' : (hasData ? data.staffCount : 0) + ' staff • ';
    document.getElementById(scope + 'TravelSummary').textContent = staff + count + (count === 1 ? ' trip' : ' trips') + ' this month';
    grid.replaceChildren();
    for (let i = 0; i < month.mondayOffset; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day empty';
      blank.setAttribute('aria-hidden', 'true');
      grid.append(blank);
    }
    for (let day = 1; day <= month.days; day++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day';
      cell.dataset.day = day;
      const number = document.createElement('span');
      number.textContent = day;
      cell.append(number);
      let label = formatCalendarDate(scope, day);
      const travel = hasData && (individual ? data.travelDays.includes(day) : data.travelBadges[day]);
      if (travel) {
        cell.classList.add(individual ? 'travel-highlight' : 'staff-travel-highlight');
        const marker = document.createElement('span');
        marker.className = individual ? 'dot-indicator' : 'staff-count-badge';
        if (!individual) marker.textContent = travel;
        cell.append(marker);
        label += individual ? ', travel date' : ', ' + travel + ' staff travelling';
      }
      if (month.key === '2026-09' && day === 24) {
        cell.classList.add('today');
        cell.setAttribute('aria-current', 'date');
        label += ', today';
      }
      cell.setAttribute('aria-label', label);
      cell.addEventListener('click', () => selectTravelDay(scope, day));
      grid.append(cell);
    }
    selectTravelDay(scope, state.day);
  }

  function selectTravelDay(scope, day, focusSelected = false) {
    const state = travelCalendars[scope];
    state.day = Number(day);
    const data = scope === 'individual' ? window.INDIVIDUAL_TRAVEL_DATA : window.TEAM_TRAVEL_DATA;
    if (state.month.label === data.month) data.selectedDay = state.day;
    document.querySelectorAll('#' + scope + '-calendar-grid button.cal-day').forEach(button => {
      const selected = Number(button.dataset.day) === state.day;
      button.classList.toggle('active-pill', selected);
      button.setAttribute('aria-pressed', String(selected));
      if (selected && focusSelected) button.focus({ preventScroll: true });
    });
    if (scope === 'individual') updateIndividualTripDetail(state.day);
    else updateTeamTripDetail(state.day);
  }

  function shiftTravelMonth(scope, offset) {
    const state = travelCalendars[scope];
    state.month = state.month.move(offset);
    state.day = Math.min(state.day, state.month.days);
    renderTravelCalendar(scope);
  }

  function resetTravelDay(scope) {
    const state = travelCalendars[scope];
    state.month = calendarMonth(2026, 8);
    state.day = 24;
    renderTravelCalendar(scope);
    document.querySelector('#' + scope + '-calendar-grid [aria-current="date"]')?.focus({ preventScroll: true });
  }

  function updateIndividualTripDetail(day) {
    const detailBox = document.getElementById('individual-trip-detail-card');
    if (!detailBox) return;

    const travelDays = window.INDIVIDUAL_TRAVEL_DATA?.travelDays || [28, 29, 30];
    const month = travelCalendars.individual.month;
    if (month.label === window.INDIVIDUAL_TRAVEL_DATA.month && travelDays.includes(day)) {
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
          ${formatCalendarDate('individual', day)}
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
            ${recordDetailStatus.html(trip.status || 'Approved')}
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
    } else if (month.key === '2026-09' && day === 24) {
      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate('individual', day)} (Today)
        </div>
        <div style="background: var(--bg-input); border-radius: 16px; padding: 12px 14px; border: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted);">
          No travel schedules for today. Office working day.
        </div>
      `;
    } else {
      detailBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate('individual', day)}
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

    const month = travelCalendars.team.month;
    const staffList = month.label === data.month ? data.staffTrips.filter(staff => teamTripIncludesDay(staff, day)) : [];
    if (staffList.length) {
      detailBox.innerHTML = `
        <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 10px;">
          ${formatCalendarDate('team', day)} · ${staffList.length} staff
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
              ${recordDetailStatus.html(s.status)}
            </div>
          `).join('')}
        </div>
      `;
    } else {
      detailBox.innerHTML = `
        <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
          ${formatCalendarDate('team', day)}${month.key === '2026-09' && day === 24 ? ' (Today)' : ''}
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

    let items = [...ClaimRequestStore.list(), ...(window.MOCK_MY_SUBMISSIONS || [])];
    if (filterType !== 'all') {
      const status = recordReviewStatusLabel(filterType).toLowerCase();
      items = items.filter(item => recordReviewStatusLabel(item.status).toLowerCase() === status);
    }

    if (badge) badge.textContent = window.PeopleHcmRecordSummary.formatCount(items.length);

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

      const statusClass = ['submitted', 'pending'].includes(item.status) ? 'pending' : (item.status === 'approved' ? 'approved' : 'rejected');

      card.innerHTML = `
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--bg-input); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
          ${item.icon || '🧾'}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.category}</div>
            <span class="status-badge ${statusClass}">${recordReviewStatusLabel(item.statusText || item.status)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${item.merchant || item.optionName} • ${item.date}
            </div>
            <div style="font-size: 14.5px; font-weight: 900; color: var(--purple-primary); white-space: nowrap; margin-left: 8px;">
              RM ${item.amount == null ? '—' : item.amount.toFixed(2)}
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
    const approveAllButton = document.getElementById('approveAllTeamClaims');
    if (approveAllButton) {
      approveAllButton.textContent = `Approve all (${pendingCount})`;
      approveAllButton.disabled = pendingCount === 0;
    }
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
      const submitDateVal = item.submitDate || item.date || '';
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

  function finishClaims(items, action, comment) {
    try {
      ClaimRequestStore.decide(items.filter(item => item.savedClaim).map(item => item.id), action, comment);
    } catch {
      refreshSavedClaims();
      showToast('Could not update the claim. Check its status and try again.');
      return false;
    }
    const handled = new Set(items.map(item => item.id));
    teamQueue = teamQueue.filter(item => !handled.has(item.id));
    return true;
  }

  function actionTeamClaim(id, action, userName, amount) {
    const item = teamQueue.find(record => String(record.id) === String(id));
    if (!item || !finishClaims([item], action)) return;
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
    if (!finishClaims(teamQueue, 'approve')) return;
    renderTeamQueue();
    showToast('🎉 Approved all pending team claims!');
  }

  let currentSelectedClaimData = null;

  function openClaimThreeDotsMenu(btn, itemId) {
    if (!document.getElementById('claimThreeDotsMenuOverlay')) {
      triggerClaimViewDetails(itemId);
      return;
    }
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
        submitDate: card.getAttribute('submit-date') || card.getAttribute('date') || '',
        date: card.getAttribute('submit-date') || card.getAttribute('date') || '',
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
        submitDate: item.submitDate || item.date || '',
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
      overlay.style.display = 'none';
    }
  }

  function renderClaimApproverComments() {
    return `
      <div class="claim-detail-approver-comments" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 12px 14px; flex-shrink: 0;">
        <label for="claimDetailApproverComments" style="display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 11.5px; font-weight: 800;">Approver Action Comments</label>
        <input type="text" id="claimDetailApproverComments" placeholder="Add approver action comments (optional)..." style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-input); color: var(--text-primary); font-size: 12px; font-weight: 500; outline: none; box-sizing: border-box;">
      </div>
    `;
  }

  function triggerClaimViewDetails(id = currentSelectedClaimData?.id) {
    if (id == null) return;
    if (document.getElementById('claimDetailsModalOverlay')) {
      PendingApprovalPage.open('details', id, document.getElementById('team-card-' + id)?.querySelector('.approval-record-link'));
    } else {
      const url = new URL('pending-approval.html', location.href);
      url.searchParams.set('theme', getCurrentTheme());
      url.hash = 'approval/details/' + encodeURIComponent(id);
      location.href = url.href;
    }
  }

  function renderClaimDetails(data) {
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

    const bodyEl = document.getElementById('claimDetailsDynamicBody');
    if (bodyEl) {
      bodyEl.innerHTML = renderClaimApproverComments();
      bodyEl.prepend(recordSubmitDate.create(data.submitDate), optLower.includes('benefit') ? BenefitClaimForm.create(data) : ClaimReview.create(data));
      bodyEl.closest('.phone-container').scrollTop = 0;
    }

    const commentInput = document.getElementById('claimDetailApproverComments');
    if (commentInput) commentInput.value = '';
  }

  function updateMedSubTabsUI(tabName) {
    // Kept for backward compatibility
  }

  function switchMedSubTab(tabName) {
    // Kept for backward compatibility
  }

  function closeClaimDetailsModal() {
    PendingApprovalPage.back();
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

    if (!item || !finishClaims([item], action, commentText)) return;
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
    const id = currentSelectedClaimData?.id;
    if (id != null) PendingApprovalPage.open('workflow', id, document.getElementById('team-card-' + id)?.querySelector('.three-dots-btn'));
  }

  function closeClaimWorkflowModal() {
    PendingApprovalPage.back();
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
    shiftTravelMonth,
    resetTravelDay,
    selectIndividualCalendarDay: (day, focus) => selectTravelDay('individual', day, focus),
    selectTeamCalendarDay: (day, focus) => selectTravelDay('team', day, focus),
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

  function refreshSavedClaims() {
    syncSavedClaimQueue();
    renderTeamQueue();
    if (currentSelectedClaimData?.savedClaim && typeof PendingApprovalPage !== 'undefined' && PendingApprovalPage.active &&
        !teamQueue.some(item => item.id === currentSelectedClaimData.id)) PendingApprovalPage.back();
  }
  window.addEventListener('storage', event => {
    if (event.key === ClaimRequestStore.key || event.key === null) {
      refreshSavedClaims();
      if (document.querySelector('.work-status-card')) renderIndividualDashboard();
    }
  });

  const selectAllPending = document.getElementById('claimsSelectAllPending');
  if (selectAllPending) {
    renderTeamQueue();
    PendingApprovalPage.register({
      render(view, id) {
        const item = teamQueue.find(record => String(record.id) === id);
        if (!item) return false;
        closeClaimThreeDotsMenu();
        currentSelectedClaimData = item;
        if (view === 'details') renderClaimDetails(item);
        return true;
      }
    });
    mountPendingApprovalSelection(document.getElementById('teamApprovalsQueue'), selectAllPending, (action, boxes) => {
      const ids = new Set(boxes.map(box => box.closest('.approval-request-card').dataset.itemId));
      const message = formatBulkApprovalResult(action, ids.size, 'claim');
      if (!message) return;
      if (!finishClaims(teamQueue.filter(item => ids.has(String(item.id))), action)) return;
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


