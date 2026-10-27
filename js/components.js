/* ========================================================
   PEOPLEHCM REUSABLE WEB COMPONENTS LIBRARY
   Zero build tool required. 100% offline & file:// compatible.
   ======================================================== */

// Presentation for legacy count captions. The source text and numeric value stay
// intact when forms refresh a caption with textContent or innerText.
window.PeopleHcmRecordSummary = (() => {
  const registered = new WeakSet();
  function enhance(element) {
    if (!element || registered.has(element)) return;
    registered.add(element);
    const observer = new MutationObserver(render);
    function render() {
      observer.disconnect();
      const match = element.textContent.trim().match(/^(Total\s+Records?(?:\s+Found)?\s*:\s*)([\d,]+)$/i);
      element.classList.toggle('record-summary-card', !!match);
      element.classList.toggle('record-summary-metric', !!match);
      if (match) {
        const label = document.createElement('span');
        label.className = 'record-summary-label';
        label.textContent = match[1];
        const value = document.createElement('strong');
        value.className = 'record-summary-value';
        value.textContent = match[2];
        element.replaceChildren(label, value);
      }
      observer.observe(element, { childList: true, characterData: true, subtree: true });
    }
    render();
  }
  function scan(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('[data-record-summary-count]')) enhance(root);
    root.querySelectorAll('[data-record-summary-count]').forEach(enhance);
  }
  function init() {
    scan(document.body);
    new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(scan);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  return { enhance };
})();

// 1. Desktop Preview Top Bar Component (Only Dark Mode & Light Mode buttons outside the phone)
// Resolve shared detail assets from this script so nested module pages and file:// previews work alike.
{
  const source = document.currentScript?.src;
  if (source) {
    if (
      !window.PeopleHcmIcons
      && !document.querySelector('script[src$="icon-system.js"], script[data-peoplehcm-icon-system]')
    ) {
      const icons = document.createElement('script');
      icons.src = new URL('icon-system.js', source).href;
      icons.async = false;
      icons.dataset.peoplehcmIconSystem = '';
      document.head.append(icons);
    }
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../css/detail-popout.css', source).href;
    document.head.append(stylesheet);
    const presentation = document.createElement('script');
    presentation.src = new URL('detail-popout.js', source).href;
    presentation.defer = true;
    document.head.append(presentation);
  }
}
class PreviewTopBar extends HTMLElement {
  connectedCallback() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    this.innerHTML = `
      <div class="theme-switch-bar">
        <button class="mode-btn theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-set-theme="dark" onclick="setTheme('dark')"><i class="fa-solid fa-moon" aria-hidden="true"></i><span>Dark Mode</span></button>
        <button class="mode-btn theme-btn ${currentTheme === 'light' ? 'active' : ''}" data-set-theme="light" onclick="setTheme('light')"><i class="fa-solid fa-sun" aria-hidden="true"></i><span>Light Mode</span></button>
      </div>
    `;
  }
}
customElements.define('preview-top-bar', PreviewTopBar);

// 2. Phone Status Bar Component
class PhoneStatusBar extends HTMLElement {
  connectedCallback() {
    const time = this.getAttribute('time') || '9:41';
    this.innerHTML = `
      <div class="status-bar">
        <span>${time}</span>
        <div class="status-icons">
          <i class="fa-solid fa-signal" style="font-size: 11px;"></i>
          <i class="fa-solid fa-wifi" style="font-size: 11px;"></i>
          <i class="fa-solid fa-battery-full" style="font-size: 12px;"></i>
        </div>
      </div>
    `;
  }
}
customElements.define('phone-status-bar', PhoneStatusBar);

// 3. Hero Background Component (Deep Purple Glowing Constellation)
class PhoneHeroBg extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="hero-bg" style="background: url('hero-purple-mesh.jpg') center top / cover no-repeat, linear-gradient(178deg, #4c1d95 0%, #6d28d9 35%, #7c3aed 70%, #5b21b6 90%, transparent 100%);">
        <svg viewBox="0 0 420 520" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.85;">
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#e9d5ff" stop-opacity="0.6" />
              <stop offset="50%" stop-color="#c084fc" stop-opacity="0.75" />
              <stop offset="100%" stop-color="#a855f7" stop-opacity="0.5" />
            </linearGradient>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path d="M-30 110 Q 90 60 210 120 T 440 90" stroke="url(#waveGrad)" stroke-width="2.2" />
          <path d="M-10 160 Q 140 100 270 150 T 450 130" stroke="rgba(233, 213, 255, 0.5)" stroke-width="1.6" />
          <path d="M120 -10 Q 250 50 350 140 T 450 190" stroke="rgba(192, 132, 252, 0.4)" stroke-width="1.4" stroke-dasharray="3 3" />

          <line x1="250" y1="75" x2="330" y2="100" stroke="rgba(233, 213, 255, 0.55)" stroke-width="1.4" />
          <line x1="330" y1="100" x2="390" y2="140" stroke="rgba(233, 213, 255, 0.55)" stroke-width="1.4" />
          <line x1="250" y1="75" x2="280" y2="140" stroke="rgba(233, 213, 255, 0.45)" stroke-width="1.2" />
          <line x1="280" y1="140" x2="350" y2="160" stroke="rgba(233, 213, 255, 0.5)" stroke-width="1.4" />

          <circle cx="250" cy="75" r="7" fill="rgba(192, 132, 252, 0.4)" filter="url(#neonGlow)" />
          <circle cx="250" cy="75" r="3.5" fill="#ffffff" />
          <circle cx="330" cy="100" r="9" fill="rgba(192, 132, 252, 0.45)" filter="url(#neonGlow)" />
          <circle cx="330" cy="100" r="4.5" fill="#ffffff" />
          <circle cx="280" cy="140" r="6" fill="rgba(192, 132, 252, 0.35)" filter="url(#neonGlow)" />
          <circle cx="280" cy="140" r="3" fill="#e9d5ff" />
          <circle cx="350" cy="160" r="8" fill="rgba(192, 132, 252, 0.4)" filter="url(#neonGlow)" />
          <circle cx="350" cy="160" r="4" fill="#ffffff" />
        </svg>
      </div>
    `;
  }
}
customElements.define('phone-hero-bg', PhoneHeroBg);

// 4. App Header with Burger Menu, Logo, and Profile Avatar (No in-phone theme button)
class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="app-header">
        <div class="header-left">
          <!-- Burger Menu Button (Opens Left Profile & Nav Drawer) -->
          <button class="burger-btn" onclick="openProfileDrawer()" aria-label="Open Navigation Menu" title="Menu">
            <i class="fa-solid fa-bars"></i>
          </button>

          <!-- Brand Logo -->
          <div class="logo-container">
            <svg class="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="12" r="4.5" stroke="#ffffff" stroke-width="2.5" />
              <circle cx="22" cy="12" r="4.5" stroke="#ffffff" stroke-width="2.5" />
              <circle cx="10" cy="22" r="4.5" stroke="#c084fc" stroke-width="2.5" />
              <path d="M10 16.5V17.5M14.5 12H17.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            <div class="logo-text">
              <h1>PeopleHCM</h1>
              <span>by PeopleQuest</span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <!-- User Profile Avatar -->
          <div class="profile-wrap" title="Sarah Jenkins" onclick="openProfileDrawer()" style="cursor: pointer;">
            <img class="profile-img"
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Sarah">
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('app-header', AppHeader);

// 5. Left Profile Drawer Card Component (Slide-in Menu without inside theme button)
class LeftProfileDrawer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="profile-drawer-overlay drawer-overlay" id="profileDrawerOverlay" onclick="closeProfileDrawerModal(event)">
        <div class="profile-drawer-card drawer-card" onclick="event.stopPropagation()">
          <div class="profile-drawer-top">
            <button class="drawer-close-btn" onclick="closeProfileDrawerDirect()" aria-label="Close menu"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div class="drawer-user-box">
            <div class="drawer-avatar-wrap">
              <img class="drawer-avatar-img"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                alt="Sarah Jenkins">
              <div class="drawer-avatar-badge"></div>
            </div>
            <div class="drawer-user-info">
              <div class="drawer-user-name">Sarah Jenkins</div>
              <div class="drawer-employee-id">#EBB01</div>
              <div class="drawer-user-role">Senior Product Designer</div>
              <div class="drawer-user-email">sarah.j@peoplequest.com</div>
            </div>
          </div>

          <div class="drawer-badge-row">
            <span class="drawer-dept-badge">Product & Design</span>
          </div>

          <div class="drawer-divider"></div>

          <div class="drawer-nav-list">
            <!-- 1. Home -->
            <a class="drawer-menu-item ${window.location.pathname.includes('homedark.html') || window.location.pathname.includes('homelight.html') || window.location.pathname.includes('home-v1') ? 'active' : ''}" href="javascript:void(0)" onclick="navTo('home', event); closeProfileDrawerDirect();">
              <div class="drawer-menu-icon" style="background: rgba(168, 85, 247, 0.16); color: #c084fc;">
                <i class="fa-solid fa-house"></i>
              </div>
              <div class="drawer-menu-text">
                <div class="drawer-menu-label">Home</div>
                <div class="drawer-menu-desc">Main dashboard screen</div>
              </div>
              <span class="drawer-menu-arrow"><i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i></span>
            </a>

            <!-- 2. Settings -->
            <a class="drawer-menu-item ${window.location.pathname.endsWith('/settings.html') ? 'active' : ''}" ${window.location.pathname.endsWith('/settings.html') ? 'aria-current="page"' : ''} href="javascript:void(0)" onclick="navTo('settings', event); closeProfileDrawerDirect();">
              <div class="drawer-menu-icon" style="background: rgba(148, 163, 184, 0.16); color: #94a3b8;">
                <i class="fa-solid fa-gear"></i>
              </div>
              <div class="drawer-menu-text">
                <div class="drawer-menu-label">Settings</div>
                <div class="drawer-menu-desc">Clocking, location & language</div>
              </div>
              <span class="drawer-menu-arrow"><i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i></span>
            </a>

            <!-- 3. Change Password -->
            <a class="drawer-menu-item ${window.location.pathname.endsWith('/change-password.html') ? 'active' : ''}" ${window.location.pathname.endsWith('/change-password.html') ? 'aria-current="page"' : ''} href="javascript:void(0)" onclick="navTo('change_password', event); closeProfileDrawerDirect();">
              <div class="drawer-menu-icon" style="background: rgba(148, 163, 184, 0.16); color: #94a3b8;">
                <i class="fa-solid fa-key"></i>
              </div>
              <div class="drawer-menu-text">
                <div class="drawer-menu-label">Change Password</div>
                <div class="drawer-menu-desc">Update your login password</div>
              </div>
              <span class="drawer-menu-arrow"><i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i></span>
            </a>

            <!-- 4. Sign Out -->
            <a class="drawer-menu-item" href="javascript:void(0)" onclick="handleSignOut(); closeProfileDrawerDirect();">
              <div class="drawer-menu-icon" style="background: rgba(244, 63, 94, 0.16); color: #f43f5e;">
                <i class="fa-solid fa-right-from-bracket"></i>
              </div>
              <div class="drawer-menu-text">
                <div class="drawer-menu-label" style="color: #f43f5e;">Sign Out</div>
                <div class="drawer-menu-desc">Log out of account</div>
              </div>
              <span class="drawer-menu-arrow" style="color: #f43f5e;"><i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i></span>
            </a>
          </div>

          <div class="drawer-footer" style="padding-top: 18px;">
            <span style="display: block; font-size: 9.5px; color: var(--text-caption); text-align: center;">PEOPLEHCM V2.4 • PEOPLEQUEST</span>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('left-profile-drawer', LeftProfileDrawer);

// 6. Notification "For You" Bottom Sheet Component
class NotificationSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="indicators-overlay" id="forYouOverlay" onclick="closeForYouModal(event)">
        <div class="indicators-sheet" onclick="event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="sheet-header">
            <div class="sheet-title">
              <h3>For You (7)</h3>
              <p>Action Items & Reminders</p>
            </div>
            <div class="notification-header-actions">
              <button type="button" id="notificationFilterButton" class="notification-filter-button" onclick="openNotificationFilter()" aria-haspopup="dialog" aria-controls="notificationDocumentDialog" aria-label="Filter notifications" title="Filter notifications">
                <i class="fa-solid fa-sliders" aria-hidden="true"></i>
              </button>
              <button type="button" class="sheet-close-btn" onclick="closeForYouDirect()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>

          <!-- Pending Approval and Pending Resubmit -->
          <div class="sheet-filter-bar notification-status-tabs">
            <button class="sheet-filter-pill active" data-for-you-tab="pending_approval" onclick="filterForYouTab('pending_approval', this)">
              <span>Pending Approval (<span id="badgePendingApprovalCount">4</span>)</span>
            </button>
            <button class="sheet-filter-pill" data-for-you-tab="pending_resubmit" onclick="filterForYouTab('pending_resubmit', this)">
              <span>Pending Resubmit (<span id="badgePendingResubmitCount">3</span>)</span>
            </button>
          </div>

          <p id="notificationFilterSummary" class="notification-filter-summary" aria-live="polite" hidden></p>

          <div class="sheet-list-scroll" id="forYouListScroll">
            <!-- Category cards link to their own pages -->
            <div id="forYouGroupedContainer">
              <!-- Dynamically populated via renderForYouSheetUI() -->
            </div>

            <!-- Empty State when filtered results are 0 -->
            <div id="forYouEmptyState" style="display: none; text-align: center; padding: 36px 12px; color: var(--text-muted); font-size: 12.5px; font-weight: 600;">
              <div style="font-size: 26px; margin-bottom: 6px;"><i class="fa-solid fa-magnifying-glass"></i></div>
              No notifications match your selected filter.
            </div>
          </div>
        </div>
      </div>
      
      <dialog id="notificationDocumentDialog" class="notification-filter-dialog" aria-labelledby="notificationDocumentTitle" aria-describedby="notificationDocumentDescription" oncancel="event.preventDefault(); closeNotificationFilter()" onclick="dismissNotificationFilterBackdrop(event)">
        <div class="notification-filter-heading">
          <div>
            <h2 id="notificationDocumentTitle">Filter notifications</h2>
            <p id="notificationDocumentDescription">Choose the document types to show.</p>
          </div>
          <button type="button" class="sheet-close-btn" onclick="closeNotificationFilter()" aria-label="Close filter"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="notification-filter-options-heading">
          <span id="notificationDocumentOptionsLabel">Document type</span>
          <button type="button" onclick="resetNotificationFilter()">Reset</button>
        </div>
        <div class="notification-filter-options" role="group" aria-labelledby="notificationDocumentOptionsLabel">
          ${['all', 'Leave Request', 'Medical Claim', 'Overtime', 'Change Request', 'Tax EA Form', 'Performance Goal'].map(value => `
            <label class="notification-filter-option">
              <input type="checkbox" value="${value}" onchange="changeNotificationDocumentType(this.value, this.checked)">
              <span>${value === 'all' ? 'All document types' : value}</span>
            </label>
          `).join('')}
        </div>
        <div class="notification-filter-footer">
          <button type="button" class="notification-filter-cancel" onclick="closeNotificationFilter()">Cancel</button>
          <button type="button" class="notification-filter-apply" onclick="applyNotificationFilter()">Apply Filters</button>
        </div>
      </dialog>

      <!-- Integrated Approval Details Modal Sheet -->
      <approval-detail-sheet></approval-detail-sheet>
    `;
  }
}
customElements.define('notification-sheet', NotificationSheet);

// 6.5 Approval Detail Sheet Web Component
class ApprovalDetailSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="approval-detail-overlay" id="approvalDetailOverlay" onclick="closeApprovalDetailDirect(event)">
        <div class="approval-detail-sheet" onclick="event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="sheet-header" style="margin-bottom: 12px;">
            <div class="sheet-title">
              <h3 id="approvalModalTitle">Approval Request Details</h3>
              <p id="approvalModalSubTitle">Review details & take action</p>
            </div>
            <button class="sheet-close-btn" onclick="closeApprovalDetailDirect()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Applicant Card -->
          <div class="approval-applicant-card" id="approvalApplicantCard">
            <!-- Populated via JS -->
          </div>

          <!-- Details Grid -->
          <div class="approval-meta-grid" id="approvalMetaGrid">
            <!-- Populated via JS -->
          </div>

          <!-- Action Buttons Bar -->
          <div class="approval-action-bar" id="approvalActionBar">
            <button class="btn-reject" onclick="actionRejectRequest()">
              <span><i class="fa-solid fa-xmark" style="margin-right: 5px;"></i> Reject / Request Info</span>
            </button>
            <button class="btn-approve" onclick="actionApproveRequest()">
              <span><i class="fa-solid fa-check" style="margin-right: 5px;"></i> Approve Request</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('approval-detail-sheet', ApprovalDetailSheet);

// 7. Phone Bottom Navigation Bar Component
class PhoneBottomNav extends HTMLElement {
  connectedCallback() {
    const active = this.getAttribute('active') || 'home';
    this.innerHTML = `
      <div class="bottom-nav">
        <!-- 1. Home -->
        <a class="nav-item ${active === 'home' ? 'active' : ''}" href="javascript:void(0)" onclick="navTo('home', event)">
          <div class="nav-icon">
            <i class="fa-solid fa-house"></i>
          </div>
          <span>Home</span>
        </a>

        <!-- 2. Notification -->
        <a class="nav-item ${active === 'notifications' || active === 'notification' ? 'active' : ''}" href="javascript:void(0)" onclick="openForYouModal()">
          <div class="nav-icon">
            <i class="fa-solid fa-bell"></i>
            <div class="nav-badge-red">2</div>
          </div>
          <span>Notification</span>
        </a>

        <!-- 3. Center Apps 4-Dots FAB (The App Icon!) -->
        <button class="fab-btn ${active === 'apps' ? 'active' : ''}" aria-label="App Shortcuts" onclick="navTo('nav_apps', event)" title="App Shortcuts">
          <i class="fa-solid fa-table-cells-large"></i>
        </button>

        <!-- 4. Favourite -->
        <a class="nav-item ${active === 'favourite' || active === 'fav' ? 'active' : ''}" href="javascript:void(0)" onclick="openFavouriteModal(event)">
          <div class="nav-icon">
            <i class="fa-solid fa-star"></i>
          </div>
          <span>Favourite</span>
        </a>

        <!-- 5. Me -->
        <a class="nav-item ${active === 'me' || active === 'more' ? 'active' : ''}" href="javascript:void(0)" onclick="navTo('me', event)">
          <div class="nav-icon">
            <i class="fa-solid fa-user"></i>
          </div>
          <span>Me</span>
        </a>

        <!-- Home Indicator Bar -->
        <div class="home-bar"></div>
      </div>
    `;
  }
}
customElements.define('phone-bottom-nav', PhoneBottomNav);

// 8. Instant Favourite Bottom Sheet Component
class FavouriteSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="fav-sheet-overlay" id="favSheetOverlay" onclick="closeFavSheet(event)">
        <div class="fav-sheet-content" onclick="event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="fav-sheet-header">
            <div>
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;"><i class="fa-solid fa-star" style="color: #fbbf24; margin-right: 6px;"></i>My Favourites</h3>
              <p style="font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0 0;" id="favSheetSubtitle">Quick Access Shortcuts</p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="fav-edit-btn" id="favEditToggleBtn" onclick="toggleFavEditMode()"><i class="fa-solid fa-pen-to-square" style="margin-right: 5px;"></i>Customize</button>
              <button class="sheet-close-btn" onclick="closeFavSheetDirect()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>

          <!-- Mode 1: Quick Favourites Grid View (Default) -->
          <div class="fav-grid-view" id="favGridView">
            <!-- Dynamically populated via JS -->
          </div>

          <!-- Mode 2: Customize Catalog List View (Hidden by default) -->
          <div id="favEditView" style="display: none; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; padding-right: 4px;">
            <!-- Catalog with Star Toggles -->
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('favourite-sheet', FavouriteSheet);

// 8. Indicators Bottom Sheet Component (Team & Individual Indicators)
// 8. Indicators Bottom Sheet Component (Team & Individual Indicators - Card Design)
class IndicatorsSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="indicators-overlay" id="indicatorsOverlay" onclick="closeIndicatorsModal(event)">
        <div class="indicators-sheet" onclick="event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="sheet-header">
            <div class="sheet-title">
              <h3 id="indicatorsSheetTitle">Team Indicator</h3>
              <p id="indicatorsSheetSubtitle">Department Aggregated Metrics (12) • Breakdown</p>
            </div>
            <button class="sheet-close-btn" onclick="closeIndicatorsDirect()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Metric groups and change filters -->
          <div class="sheet-filter-bar" role="group" aria-label="Metric category">
            <button type="button" class="sheet-filter-pill active" data-group="all" aria-pressed="true" onclick="filterDrawerIndicators('all', this)">
              <span>All</span>
              <span class="sheet-tag-badge neutral" id="indicatorCountAll">12</span>
            </button>
            <button type="button" class="sheet-filter-pill" data-group="positive" aria-pressed="false" onclick="filterDrawerIndicators('positive', this)">
              <span>Positive</span>
              <span class="sheet-tag-badge green" id="indicatorCountPos">3</span>
            </button>
            <button type="button" class="sheet-filter-pill" data-group="negative" aria-pressed="false" onclick="filterDrawerIndicators('negative', this)">
              <span>Negative</span>
              <span class="sheet-tag-badge red" id="indicatorCountNeg">9</span>
            </button>
          </div>
          <div class="insight-trend-filters sheet-filter-bar" role="group" aria-label="Metric change">
            <button type="button" class="sheet-filter-pill active" data-trend="all" aria-pressed="true" onclick="filterIndicatorTrend('all')">All changes</button>
            <button type="button" class="sheet-filter-pill" data-trend="improved" aria-pressed="false" onclick="filterIndicatorTrend('improved')">Improved</button>
            <button type="button" class="sheet-filter-pill" data-trend="worsened" aria-pressed="false" onclick="filterIndicatorTrend('worsened')">Worsened</button>
            <button type="button" class="sheet-filter-pill" data-trend="unchanged" aria-pressed="false" onclick="filterIndicatorTrend('unchanged')">No change</button>
          </div>

          <!-- Scrollable Indicators Cards List -->
          <div class="sheet-list-scroll" id="indicatorsListContainer">
            <p class="insight-empty-state" id="indicatorEmptyState" role="status" hidden></p>
            <div id="feedCardsContainer">
              
              <!-- FEED: TEAM INDICATORS (Rich Card Design with Avg ... metrics) -->
              <div id="teamIndicatorsFeed">
                <!-- Positive Section (3) -->
                <div class="feed-section-label positive" data-group="positive">
                  <span><i class="fa-solid fa-thumbs-up" style="color: #10b981; margin-right: 6px;"></i>Positive Indicator (3)</span>
                </div>

                <!-- 1. Avg Competency Match% -->
                <div class="metric-feed-card" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-violet-bg); color: var(--tag-violet-text);"><i class="fa-solid fa-bullseye"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Competency Match%</h5>
                        <span>Department Skill Benchmark</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▲ +100.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">4.53</span>
                      <span class="feed-val-unit">pts</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Target achieved</span>
                  </div>
                </div>

                <!-- 2. Avg Goal Achievement% -->
                <div class="metric-feed-card" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-trophy"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Goal Achievement%</h5>
                        <span>Team Milestone OKR Progress</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">%</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Quarterly cycle active</span>
                  </div>
                </div>

                <!-- 3. Avg Attendance% (Alert Highlight) -->
                <div class="metric-feed-card highlight-alert" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-action-bg); color: var(--status-action-text);"><i class="fa-solid fa-calendar-days"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Attendance%</h5>
                        <span>Department Punctual Attendance</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill alert">▼ -1.04%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big" style="color: var(--status-action-text);">69.39</span>
                      <span class="feed-val-unit" style="color: var(--status-action-text); font-weight: 800;">%</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--status-action-text);">Below 70% threshold</span>
                  </div>
                </div>

                <!-- Negative Section (9) -->
                <div class="feed-section-label negative" data-group="negative">
                  <span><i class="fa-solid fa-thumbs-down" style="color: #f43f5e; margin-right: 6px;"></i>Negative Indicator (9)</span>
                </div>

                <!-- 4. Avg Odd Clocking Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-normal-bg); color: var(--text-secondary);"><i class="fa-solid fa-stopwatch"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Odd Clocking Count</h5>
                        <span>Irregular Punch Occurrences</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▼ -56.76%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.37</span>
                      <span class="feed-val-unit">avg</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Significant reduction</span>
                  </div>
                </div>

                <!-- 5. Avg Late In Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-clock"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Late In Count</h5>
                        <span>Morning Arrival Delays</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▼ -12.50%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">2.80</span>
                      <span class="feed-val-unit">times</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Punctuality improved</span>
                  </div>
                </div>

                <!-- 6. Avg Absent Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-normal-bg); color: var(--text-secondary);"><i class="fa-solid fa-user"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Absent Count</h5>
                        <span>Unscheduled Team Absences</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▼ -1.76%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">8.51</span>
                      <span class="feed-val-unit">days</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Mild decrease</span>
                  </div>
                </div>

                <!-- 7. Avg Emergency Leave Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-triangle-exclamation"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Emergency Leave Count</h5>
                        <span>Ad-hoc Emergency Requests</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">leaves</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">No emergency leaves</span>
                  </div>
                </div>

                <!-- 8. Avg Medical Leave Count (Alert Highlight) -->
                <div class="metric-feed-card highlight-alert" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-action-bg); color: var(--status-action-text);"><i class="fa-solid fa-hospital"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Medical Leave Count</h5>
                        <span>Clinic Medical Certs (MC)</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill alert">▲ +16.67%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big" style="color: var(--status-action-text);">0.30</span>
                      <span class="feed-val-unit" style="color: var(--status-action-text); font-weight: 800;">days</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--status-action-text);">Seasonal clinic visits up</span>
                  </div>
                </div>

                <!-- 9. Avg OT Absent Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-violet-bg); color: var(--tag-violet-text);"><i class="fa-solid fa-moon"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg OT Absent Count</h5>
                        <span>Overtime Attendance Failure</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">shifts</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">Overtime fully fulfilled</span>
                  </div>
                </div>

                <!-- 10. Avg Unauthorised OT Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-rose-bg); color: var(--tag-rose-text);"><i class="fa-solid fa-bolt"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Unauthorised OT Count</h5>
                        <span>Unapproved Extra Working Hours</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— -1.03%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">11.63</span>
                      <span class="feed-val-unit">hrs</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">Manager sign-off pending</span>
                  </div>
                </div>

                <!-- 11. Avg Training Absent Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-blue-bg); color: var(--tag-blue-text);"><i class="fa-solid fa-graduation-cap"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Training Absent Count</h5>
                        <span>Mandatory Training Absence</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">courses</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">100% training attendance</span>
                  </div>
                </div>

                <!-- 12. Avg Early Out Count -->
                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-door-open"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Avg Early Out Count</h5>
                        <span>Early Departures Before Shift End</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">early</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">Full work day maintained</span>
                  </div>
                </div>
              </div> <!-- /#teamIndicatorsFeed -->

              <!-- FEED: MY INDICATORS (Card Format for My tab) -->
              <div id="myIndicatorsFeed" style="display: none;">
                <!-- Positive Section (4) -->
                <div class="feed-section-label positive" data-group="positive">
                  <span><i class="fa-solid fa-thumbs-up" style="color: #10b981; margin-right: 6px;"></i>Positive Indicator (4)</span>
                </div>

                <div class="metric-feed-card" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-violet-bg); color: var(--tag-violet-text);"><i class="fa-solid fa-bullseye"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Competency Match%</h5>
                        <span>Job Role Skill Benchmark</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">67</span>
                      <span class="feed-val-unit">%</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--purple-text);">Target: 70%</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-trophy"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Goal Achievement%</h5>
                        <span>Quarterly OKRs & Milestone Progress</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">%</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Review cycle active</span>
                  </div>
                </div>

                <div class="metric-feed-card highlight-positive" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-green-bg); color: var(--tag-green-text);"><i class="fa-solid fa-calendar-days"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Attendance%</h5>
                        <span>Verified Monthly Punctual Punch</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▲ +4.21%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">95.00</span>
                      <span class="feed-val-unit">%</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Excellent compliance</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="positive">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-teal-bg); color: var(--tag-teal-text);"><i class="fa-solid fa-shield-halved"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Work Incident Points</h5>
                        <span>Safety & Disciplinary Compliance</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0.00</span>
                      <span class="feed-val-unit">pts</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-teal-text);">Clean record</span>
                  </div>
                </div>

                <!-- Negative Section (10) -->
                <div class="feed-section-label negative" data-group="negative">
                  <span><i class="fa-solid fa-thumbs-down" style="color: #f43f5e; margin-right: 6px;"></i>Negative Indicator (10)</span>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-normal-bg); color: var(--text-secondary);"><i class="fa-solid fa-stopwatch"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Odd Clocking Count</h5>
                        <span>Irregular Time Punch Log</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">times</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">No abnormal punches</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-clock"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Late In Count</h5>
                        <span>Morning Arrival Performance</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▼ 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">late</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">100% on time</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-action-bg); color: var(--status-action-text);"><i class="fa-solid fa-user"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Absent Count</h5>
                        <span>Unexcused Non-attendance Record</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▼ 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">days</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Zero absenteeism</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-triangle-exclamation"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Emergency Leave Count</h5>
                        <span>Ad-hoc Unplanned Leaves</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">req</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">All leaves planned</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-rose-bg); color: var(--tag-rose-text);"><i class="fa-solid fa-hospital"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Medical Leave Count</h5>
                        <span>Approved Doctor Clinic MC</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">1</span>
                      <span class="feed-val-unit">day</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">MC verified by clinic</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-violet-bg); color: var(--tag-violet-text);"><i class="fa-solid fa-moon"></i></div>
                      <div class="feed-card-title-group">
                        <h5>OT Absent Count</h5>
                        <span>Overtime Schedule Compliance</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">shifts</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">Full OT fulfilled</span>
                  </div>
                </div>

                <div class="metric-feed-card highlight-alert" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--status-action-bg); color: var(--status-action-text);"><i class="fa-solid fa-bolt"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Unauthorised OT Count</h5>
                        <span>Worked Without Supervisor Sign-off</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill alert">▲ +11.76%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big" style="color: var(--status-action-text);">17</span>
                      <span class="feed-val-unit" style="color: var(--status-action-text); font-weight: 800;">hrs</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--status-action-text);">Requires manager sign</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-blue-bg); color: var(--tag-blue-text);"><i class="fa-solid fa-graduation-cap"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Training Absent Count</h5>
                        <span>Mandatory Course Compliance</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">missed</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">Courses completed</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);"><i class="fa-solid fa-triangle-exclamation"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Warning Letter Count</h5>
                        <span>Formal HR Advisory Notices</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill neutral">— 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">letters</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">Exemplary conduct</span>
                  </div>
                </div>

                <div class="metric-feed-card" data-group="negative">
                  <div class="feed-card-header">
                    <div class="feed-card-left">
                      <div class="feed-icon-box" style="background: var(--tag-violet-bg); color: var(--tag-violet-text);"><i class="fa-solid fa-envelope"></i></div>
                      <div class="feed-card-title-group">
                        <h5>Unacknowledged Letter Count</h5>
                        <span>HR Circulars Pending Signature</span>
                      </div>
                    </div>
                    <span class="feed-badge-pill positive">▼ 0.00%</span>
                  </div>
                  <div class="feed-card-body">
                    <div class="feed-val-block">
                      <span class="feed-val-big">0</span>
                      <span class="feed-val-unit">pending</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--tag-green-text);">All docs signed</span>
                  </div>
                </div>
              </div> <!-- /#myIndicatorsFeed -->

            </div>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('indicators-sheet', IndicatorsSheet);

// 9. Company Updates Bottom Sheet Component
class CompanyUpdatesSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="indicators-overlay" id="updatesOverlay" onclick="closeUpdatesModal(event)">
        <div class="indicators-sheet" onclick="event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="sheet-header">
            <div class="sheet-title">
              <h3>Company Updates (6)</h3>
              <p>News • Policy & SOP • Announcements</p>
            </div>
            <button class="sheet-close-btn" onclick="closeUpdatesDirect()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div class="sheet-filter-bar">
            <button class="sheet-filter-pill active" onclick="filterUpdates('all', this)">
              <span>All (6)</span>
            </button>
            <button class="sheet-filter-pill" onclick="filterUpdates('news', this)">
              <span>News (3)</span>
            </button>
            <button class="sheet-filter-pill" onclick="filterUpdates('policy', this)">
              <span>Policy & SOP (3)</span>
            </button>
          </div>

          <div class="sheet-list-scroll">
            <!-- 1. NEWS (Red = Unread) -->
            <div class="sheet-item-card" data-update="news" onclick="openNewsDetail(this, 'Town Hall')">
              <div class="item-left-box">
                <div class="item-icon-box" style="background: var(--tag-violet-bg); color: var(--tag-violet-text);" title="Company Uploaded Cover">
                  <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=100&auto=format&fit=crop&q=80" alt="Town Hall" class="item-thumb-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <span style="display:none;"><i class="fa-solid fa-bullhorn"></i></span>
                </div>
                <div class="item-info">
                  <h5>Town Hall this Friday: Q3 Strategy</h5>
                  <span>Leadership update at 3:00 PM • Today</span>
                </div>
              </div>
              <div class="item-right-box">
                <span class="sheet-tag-badge red">Unread</span>
              </div>
            </div>

            <!-- 2. NEWS (Green = Read / News) -->
            <div class="sheet-item-card" data-update="news" onclick="openNewsDetail(this, 'Industry Award')">
              <div class="item-left-box">
                <div class="item-icon-box" style="background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff;" title="Company/Dept Monogram">
                  <span class="dept-badge">PQ</span>
                </div>
                <div class="item-info">
                  <h5>PeopleQuest wins industry award</h5>
                  <span>Best Enterprise HCM Solution 2026 • Yesterday</span>
                </div>
              </div>
              <div class="item-right-box">
                <span class="sheet-tag-badge green">News</span>
              </div>
            </div>

            <!-- 3. NEWS (Green = Read / News, changed from grey) -->
            <div class="sheet-item-card" data-update="news" onclick="openNewsDetail(this, 'PeopleHCM 3.0')">
              <div class="item-left-box">
                <div class="item-icon-box" style="background: var(--tag-blue-bg); color: var(--tag-blue-text);" title="Smart Category Icon">
                  <i class="fa-solid fa-bell" style="font-size: 16px;"></i>
                </div>
                <div class="item-info">
                  <h5>PeopleHCM 3.0 Mobile Launch</h5>
                  <span>Instant leave approvals & AI insights • 3d ago</span>
                </div>
              </div>
              <div class="item-right-box">
                <span class="sheet-tag-badge green">News</span>
              </div>
            </div>

            <!-- 4. POLICY & SOP (DE001: PeopleTime User Guide v2) -->
            <div class="sheet-item-card" data-update="policy" onclick="openPolicyDetail('DE001')">
              <div class="item-left-box">
                <div class="item-icon-box" style="background: var(--tag-teal-bg); color: var(--tag-teal-text);" title="Document Policy">
                  <i class="fa-solid fa-file-lines" style="font-size: 16px;"></i>
                </div>
                <div class="item-info">
                  <h5>PeopleTime User Guide v2</h5>
                  <span>Attention to: ADMINISTRATION</span>
                </div>
              </div>
              <div class="item-right-box">
                <span class="sheet-tag-badge blue">DE001</span>
              </div>
            </div>

            <!-- 5. POLICY & SOP (HR004: Hybrid & Remote Work Policy) -->
            <div class="sheet-item-card" data-update="policy" onclick="openPolicyDetail('HR004')">
              <div class="item-left-box">
                <div class="item-icon-box" style="background: var(--tag-blue-bg); color: var(--tag-blue-text);" title="Company Policy">
                  <i class="fa-solid fa-building" style="font-size: 16px;"></i>
                </div>
                <div class="item-info">
                  <h5>Hybrid & Remote Work Policy 2026</h5>
                  <span>Attention to: ALL DEPARTMENTS</span>
                </div>
              </div>
              <div class="item-right-box">
                <span class="sheet-tag-badge green">HR004</span>
              </div>
            </div>

            <!-- 6. POLICY & SOP (FN012: Medical & Travel Claims SOP) -->
            <div class="sheet-item-card" data-update="policy" onclick="openPolicyDetail('FN012')">
              <div class="item-left-box">
                <div class="item-icon-box" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);" title="SOP Guide">
                  <i class="fa-solid fa-shield-halved" style="font-size: 16px;"></i>
                </div>
                <div class="item-info">
                  <h5>Medical & Travel Claims SOP</h5>
                  <span>Attention to: FINANCE & ACCOUNTING</span>
                </div>
              </div>
              <div class="item-right-box">
                <span class="sheet-tag-badge amber" style="background: var(--tag-amber-bg); color: var(--tag-amber-text);">FN012</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('company-updates-sheet', CompanyUpdatesSheet);

// 10. Policy & SOP Detail Bottom Sheet Modal Component
class PolicyDetailSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="indicators-overlay policy-detail-overlay" id="policyDetailOverlay" onclick="closePolicyDetailModal(event)">
        <div class="indicators-sheet policy-detail-sheet" onclick="event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="policy-sheet-header">
            <div class="policy-ref-badge" id="policyRefBadge">REF: DE001</div>
            <button class="sheet-close-btn" onclick="closePolicyDetailDirect()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div class="policy-title-section">
            <h3 class="policy-detail-title" id="policyDetailTitle">PeopleTime User Guide v2</h3>
            <div class="policy-dept-banner" id="policyDeptBanner">
              <i class="fa-solid fa-building" style="font-size: 13px; margin-right: 4px;"></i>
              <span id="policyDeptText">Attention to: ADMINISTRATION</span>
            </div>
          </div>

          <div class="policy-scroll-content">
            <!-- 1. Policy Document -->
            <div class="policy-doc-card">
              <div class="doc-card-header">
                <span class="doc-type-pill policy">1. Policy Document</span>
                <span class="doc-date-pill" id="policyDatePill">Effective: 20/12/2024</span>
              </div>
              <div class="doc-file-row" id="policyFileRow">
                <div class="doc-file-icon pdf">
                  <i class="fa-solid fa-file-pdf" style="font-size: 20px; color: #ef4444;"></i>
                </div>
                <div class="doc-file-info">
                  <div class="doc-file-name" id="policyFileName">PeopleTime_UserGuide_v2.pdf</div>
                  <div class="doc-file-meta" id="policyFileMeta">3.91 MB • PDF Document</div>
                </div>
                <button class="doc-view-btn" onclick="previewPolicyDoc('PeopleTime_UserGuide_v2.pdf')" title="View Document" aria-label="View Document">
                  <i class="fa-solid fa-eye" style="font-size: 14px;"></i>
                </button>
              </div>
            </div>

            <!-- 2. SOP Document -->
            <div class="policy-doc-card">
              <div class="doc-card-header">
                <span class="doc-type-pill sop">2. Standard Operating Procedure (SOP)</span>
                <span class="doc-date-pill" id="sopDatePill">Effective: N/A</span>
              </div>
              <div class="doc-file-row" id="sopFileRow">
                <div class="doc-file-empty-text">No SOP document uploaded (N/A)</div>
              </div>
            </div>

            <!-- 3. Guideline Document -->
            <div class="policy-doc-card">
              <div class="doc-card-header">
                <span class="doc-type-pill guideline">3. Operational Guideline</span>
                <span class="doc-date-pill" id="guidelineDatePill">Effective: N/A</span>
              </div>
              <div class="doc-file-row" id="guidelineFileRow">
                <div class="doc-file-empty-text">No Guideline document uploaded (N/A)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('policy-detail-sheet', PolicyDetailSheet);

// 19. Pending Approval Card Component
class PendingApprovalCard extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  setData(item) {
    this.setAttribute('user-name', item.userName || '');
    this.setAttribute('emp-id', item.empNo || '');
    this.setAttribute('dept', item.dept || '');
    this.setAttribute('doc-status', item.docStatus || item.status || 'Submitted');
    this.setAttribute('claim-date', item.claimDate || item.date || '');
    this.setAttribute('submit-date', item.submitDate || item.date || '');
    this.setAttribute('date', item.submitDate || item.date || '');
    this.setAttribute('claim-type', item.optionName || 'Benefit Claim');

    const bType = item.benefitType || item.advanceType || item.expenseType || item.medicalType || item.otType || item.travelType || item.subCatName || item.category || 'General';
    this.setAttribute('type-label', 'Benefit Type');
    this.setAttribute('benefit-type', bType);
    this.setAttribute('category', bType);
    this.setAttribute('period', item.period || '2026-09');
    
    const rawAmt = typeof item.amount === 'number' ? `RM ${item.amount.toFixed(2)}` : (item.amount || 'RM 0.00');
    this.setAttribute('amount', rawAmt);
    this.setAttribute('hours', item.hours || '');

    let amtHour = rawAmt;
    if (item.hours && item.hours !== '0' && item.hours !== '0.0 hrs' && item.hours !== '-') {
      amtHour = `${rawAmt} / ${item.hours}`;
    }
    this.setAttribute('amount-hour', amtHour);

    this.setAttribute('receipt', item.receipt || '');
    this.setAttribute('purpose', item.purpose || item.title || '');
    this.setAttribute('title', item.title || '');
    this.setAttribute('item-id', item.id || '');
    this.render();
  }

  render() {
    const userName = this.getAttribute('user-name') || 'Employee Name';
    const rawEmpId = this.getAttribute('emp-id') || '000000';
    const empId = rawEmpId.startsWith('#') ? rawEmpId : `#${rawEmpId}`;
    const dept = this.getAttribute('dept') || 'Department';
    const docStatus = this.getAttribute('doc-status') || 'Submitted';
    const claimDate = this.getAttribute('claim-date') || this.getAttribute('date') || 'DD/MM/YYYY';
    const submitDate = this.getAttribute('submit-date') || this.getAttribute('date') || 'DD/MM/YYYY';
    const period = this.getAttribute('period') || '2026-09';
    const claimType = this.getAttribute('claim-type') || 'Benefit Claim';
    const isBenefit = claimType.toLowerCase().includes('benefit');
    const isMedical = claimType.toLowerCase().includes('medical');
    const isBenefitOrMedical = isBenefit || isMedical;
    const showPeriod = !isBenefitOrMedical && Boolean(period);

    const category = this.getAttribute('category') || 'General';
    const rawAmount = this.getAttribute('amount') || 'RM 0.00';
    const amount = rawAmount.startsWith('RM') ? rawAmount : `RM ${parseFloat(rawAmount || 0).toFixed(2)}`;
    const hours = this.getAttribute('hours') || '';

    let amountHourDisplay = this.getAttribute('amount-hour');
    if (!amountHourDisplay) {
      if (hours && hours !== '0' && hours !== '0.0 hrs' && hours !== '0.00' && hours !== '-') {
        amountHourDisplay = `${amount} / ${hours}`;
      } else {
        amountHourDisplay = amount;
      }
    }

    const benefitTypeVal = this.getAttribute('benefit-type') || this.getAttribute('category') || 'General';
    const typeTitle = this.getAttribute('type-label') || 'Benefit Type';

    const purpose = this.getAttribute('purpose') || this.getAttribute('title') || this.getAttribute('description') || 'General claim reimbursement request';
    const itemId = this.getAttribute('item-id') || '';

    const badgeBg = 'rgba(59, 130, 246, 0.12)';
    const badgeBorder = '1px solid rgba(59, 130, 246, 0.3)';
    const badgeColor = '#3b82f6';
    const icon = '<i class="fa-solid fa-paper-plane"></i>';

    // 2-Column Grid: Benefit Type & Claim Date, followed by Period (non-benefit/medical) & Amount / Hour for cards
    const middleContentHtml = `
      <!-- 2-Column Grid: Benefit Type & Claim Date -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 10px 12px;">
        <div>
          <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 3px;">${typeTitle}</div>
          <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary); line-height: 1.3;">${benefitTypeVal}</div>
        </div>
        <div>
          <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 3px;">Claim Date</div>
          <div style="font-size: 12.5px; font-weight: 800; color: var(--purple-primary); line-height: 1.3; font-family: monospace, sans-serif;">
            <i class="fa-regular fa-calendar" style="font-size: 11px; margin-right: 3px;"></i>${claimDate}
          </div>
        </div>
      </div>

      <!-- Period & Amount / Hour Structured Box -->
      <div style="background: var(--bg-input); border-radius: 14px; padding: 10px 12px; margin-bottom: 14px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 6px;">
        ${showPeriod ? `
        <div style="display: flex; justify-content: space-between; font-size: 11.5px; align-items: center;">
          <span style="color: var(--text-muted); font-weight: 700;">Period:</span>
          <strong style="color: var(--text-primary); font-family: monospace, sans-serif; font-size: 12px; font-weight: 800;">${period}</strong>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 11.5px; ${showPeriod ? 'border-top: 1px dashed var(--border-subtle); padding-top: 6px;' : ''} align-items: center;">
          <span style="color: var(--text-muted); font-weight: 700;">Amount / Hour:</span>
          <strong style="color: var(--purple-primary); font-family: monospace, sans-serif; font-size: 14.5px; font-weight: 900;">${amountHourDisplay}</strong>
        </div>
      </div>
    `;

    this.innerHTML = `
      <div class="approval-request-card" data-item-id="${itemId}" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-card); transition: all 0.2s ease; text-align: left; margin-bottom: 14px;">
        <!-- 1. Executive Purple Header Banner (Identical to Attendance) -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%); padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; color: #ffffff;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer;" onclick="if (!event.target.closest('.approval-card-checkbox')) { window.ClaimsEngine && window.ClaimsEngine.triggerClaimViewDetails ? window.ClaimsEngine.triggerClaimViewDetails('${itemId}') : null; }">
            <div style="display: flex; align-items: center;">
              <input type="checkbox" class="approval-card-checkbox" style="width: 20px; height: 20px; accent-color: #ffffff; cursor: pointer; border-radius: 6px;">
            </div>
            <div>
              <div style="font-size: 14.5px; font-weight: 800; color: #ffffff;">${userName}</div>
              <!-- AGENTS.md Employee ID Presentation Standard: directly BELOW name, leading #, subtle muted typography -->
              <div style="font-size: 11.5px; font-weight: 700; color: rgba(255, 255, 255, 0.7); opacity: 0.8; font-family: monospace, sans-serif; margin-bottom: 2px;">${empId}</div>
              <div style="font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.85);">${dept}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="three-dots-btn" onclick="window.ClaimsEngine && window.ClaimsEngine.openClaimThreeDotsMenu ? window.ClaimsEngine.openClaimThreeDotsMenu(this, '${itemId}') : null" title="Options" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px);">
              <i class="fa-solid fa-ellipsis-vertical" style="font-size: 13px;"></i>
            </button>
          </div>
        </div>

        <!-- 2. Card Content Body -->
        <div style="padding: 14px; cursor: pointer;" onclick="if (!event.target.closest('.action-btn-approve, .action-btn-reject, .action-btn-resubmit, .approval-card-checkbox, .three-dots-btn')) { window.ClaimsEngine && window.ClaimsEngine.triggerClaimViewDetails ? window.ClaimsEngine.triggerClaimViewDetails('${itemId}') : null; }">
          <!-- Status Badge & Submit Date Row -->
          <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: inline-flex; align-items: center; gap: 6px; background: ${badgeBg}; border: ${badgeBorder}; color: ${badgeColor}; font-weight: 800; font-size: 11.5px; padding: 4.5px 11px; border-radius: 12px;">
              <span>${icon}</span>
              <span>${docStatus}</span>
            </div>
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <i class="fa-regular fa-calendar-check" style="color: var(--purple-primary);"></i>
              <span>Submit Date: <strong style="color: var(--text-primary); font-family: monospace, sans-serif;">${submitDate}</strong></span>
            </div>
          </div>

          <!-- Dynamic Middle Content (Benefit/Medical Grid vs Other Claims Box) -->
          ${middleContentHtml}

          <!-- Bottom Action Buttons Grid (Approve, Resubmit, Reject) matching Attendance -->
          <div class="pending-action-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
            <button type="button" class="action-btn-approve" onclick="window.ClaimsEngine ? window.ClaimsEngine.actionTeamClaim(${itemId}, 'approve', '${userName.replace(/'/g, "\\'")}', '${amount}') : null">
              <i class="fa-solid fa-check" style="font-size: 11.5px;"></i> Approve
            </button>
            <button type="button" class="action-btn-resubmit" onclick="window.ClaimsEngine ? window.ClaimsEngine.actionTeamClaim(${itemId}, 'resubmit', '${userName.replace(/'/g, "\\'")}', '${amount}') : null">
              <i class="fa-solid fa-rotate-left" style="font-size: 11px;"></i> Resubmit
            </button>
            <button type="button" class="action-btn-reject" onclick="window.ClaimsEngine ? window.ClaimsEngine.actionTeamClaim(${itemId}, 'reject', '${userName.replace(/'/g, "\\'")}', '${amount}') : null">
              <i class="fa-solid fa-xmark" style="font-size: 11.5px;"></i> Reject
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('pending-approval-card', PendingApprovalCard);
