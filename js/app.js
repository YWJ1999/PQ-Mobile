/* ========================================================
   PEOPLEHCM MOBILE APP LOGIC & ROUTER
   ======================================================== */

// 1. Central Navigation Route Configuration
// Edit this object to change where any icon or module points!
// Helper: Get Current Theme
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || localStorage.getItem('peoplehcm_theme') || 'dark';
}

// 1. Central Navigation Route Configuration
// Dynamic routing ensures correct light/dark file is opened based on active theme
const APP_ROUTES = {
  // Navigation & Screen Variants (Resolved dynamically in navTo)
  'home': () => getCurrentTheme() === 'light' ? 'homelight.html' : 'homedark.html',
  'home_v1': () => getCurrentTheme() === 'light' ? 'homelight.html' : 'homedark.html',
  'home_v2': () => getCurrentTheme() === 'light' ? 'applight.html' : 'appdark.html',
  'app': () => getCurrentTheme() === 'light' ? 'applight.html' : 'appdark.html',
  'leave': 'leave.html',
  'team': 'team.html',
  'me': 'me.html',

  // Top Header / Drawer
  'my_profile': 'me.html',
  'settings': () => `settings.html?theme=${getCurrentTheme()}`,
  'change_password': () => `change-password.html?theme=${getCurrentTheme()}`,
  'help_support': '#help-support',
  'sign_out': 'index.html',

  // V1 Quick Actions
  'apply_leave': 'leave.html',
  'payslip': 'modules/payroll/index.html',
  'payroll': 'modules/payroll/index.html',
  'claim': 'modules/claims/index.html',
  'more': () => getCurrentTheme() === 'light' ? 'applight.html' : 'appdark.html',

  // V2 6 Primary Shortcuts
  'attendance': 'modules/attendance/index.html',
  'payslip': 'modules/payroll/index.html',
  'payroll': 'modules/payroll/index.html',
  'claim': 'modules/claims/index.html',
  'benefits': '#benefits-portal',
  'documents': '#company-documents',
  'overtime': '#overtime-form',
  'shiftswap': '#shift-swap',
  'taxform': 'modules/payroll/options/ea-form.html',

  // Explore PeopleHCM Modules
  'time_attendance': 'modules/attendance/index.html',
  'leave_holidays': 'leave.html',
  'claims_expenses': 'modules/claims/index.html',
  'employee_career': () => `modules/employee-career/index.html?scope=individual&theme=${getCurrentTheme()}`,
  'project_task': () => `modules/project-task/index.html?theme=${getCurrentTheme()}`,
  'workplace': () => `modules/admin/index.html?theme=${getCurrentTheme()}`,
  'payroll': 'modules/payroll/index.html',
  'payroll_compensation': 'modules/payroll/index.html',
  'payslip_detail': 'modules/payroll/options/payslip.html',
  'ea_form': 'modules/payroll/options/ea-form.html',
  'tax_relief': 'modules/payroll/options/tax-relief.html',
  'performance': () => `modules/performance/index.html?scope=individual&theme=${getCurrentTheme()}`,
  'performance_goals': () => `modules/performance/index.html?scope=individual&theme=${getCurrentTheme()}`,
  'learning_dev': () => `modules/training-competency/index.html?scope=individual&theme=${getCurrentTheme()}`,
  'people_documents': 'team.html',
  'work_behaviour': 'work-behaviour.html',
  'change_request': 'change-request.html',
  'bonus_history': 'bonus-history.html',
  'subordinates': 'subordinates.html',

  // Bottom Navigation & Favourite Shortcut
  'calendar': 'calendar.html',
  'favourite': 'favourite.html',
  'fav': 'favourite.html',
  'nav_home': () => getCurrentTheme() === 'light' ? 'homelight.html' : 'homedark.html',
  'nav_calendar': 'calendar.html',
  'nav_favourite': 'favourite.html',
  'nav_apps': () => getCurrentTheme() === 'light' ? 'applight.html' : 'appdark.html',
  'nav_me': 'me.html'
};

// 2. Safe Navigation Handler
function navTo(routeKey, event) {
  if (event) event.preventDefault();

  let target = APP_ROUTES[routeKey];
  if (typeof target === 'function') {
    target = target();
  }

  if (!target) {
    showToast(`Clicked: ${routeKey}`);
    return;
  }

  // If it's a placeholder hashtag route, show user feedback
  if (target.startsWith('#')) {
    const routeName = routeKey.replace(/_/g, ' ').toUpperCase();
    showToast(`📍 [${routeName}] Ready to connect (${target})`);
  } else {
    // Dynamically calculate relative base path if we are currently inside a module folder
    // E.g., if we are in /modules/claims/index.html, and target is homedark.html, we need ../../homedark.html
    // If target is modules/attendance/index.html, we need ../../modules/attendance/index.html
    const path = window.location.pathname;
    const isInsideModule = path.includes('/modules/') || path.includes('\\modules\\');
    
    if (isInsideModule && !target.startsWith('http')) {
      // Assuming modules are 2 levels deep (modules/module_name/index.html) or 3 levels deep (modules/module_name/options/x.html)
      const segments = path.split(/[\/\\]/);
      const modulesIndex = segments.indexOf('modules');
      const depth = segments.length - 1 - modulesIndex;
      
      let prefix = '';
      for(let i = 0; i < depth; i++) {
        prefix += '../';
      }
      target = prefix + target;
    }
    
    window.location.href = target;
  }
}

// 3. Sleek Mobile Toast Notification
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast';
    document.querySelector('.phone-container')?.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// 4. Desktop Top Bar Theme Switcher (Dark / Light)
function setTheme(theme) {
  localStorage.setItem('peoplehcm_theme', theme);
  const currentPath = window.location.pathname.toLowerCase();

  // If currently on paired dark/light pages, navigate to corresponding file
  if (theme === 'light') {
    if (currentPath.includes('appdark.html') || currentPath.includes('app.html') || currentPath.includes('homedark-v2.html') || currentPath.includes('home-v2.html')) {
      window.location.href = 'applight.html';
      return;
    } else if (currentPath.includes('homedark.html') || currentPath.includes('home-v1.html')) {
      window.location.href = 'homelight.html';
      return;
    }
  } else if (theme === 'dark') {
    if (currentPath.includes('applight.html') || currentPath.includes('homelight-v2.html')) {
      window.location.href = 'appdark.html';
      return;
    } else if (currentPath.includes('homelight.html')) {
      window.location.href = 'homedark.html';
      return;
    }
  }

  // For other pages (or in-place switches)
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  const themeUrl = new URL(window.location.href);
  themeUrl.searchParams.set('theme', theme);
  window.history.replaceState(null, '', themeUrl);

  // Update top switcher bar buttons (Dark Mode / Light Mode only)
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.getAttribute('data-set-theme') === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

function initTheme() {
  const path = window.location.pathname.toLowerCase();
  let defaultTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('theme')) {
    defaultTheme = urlParams.get('theme');
  } else if (path.includes('light')) {
    defaultTheme = 'light';
  } else if (path.includes('dark')) {
    defaultTheme = 'dark';
  } else {
    defaultTheme = localStorage.getItem('peoplehcm_theme') || defaultTheme;
  }

  document.documentElement.setAttribute('data-theme', defaultTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.getAttribute('data-set-theme') === defaultTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 5. Left Profile Drawer Card Controls
function openProfileDrawer() {
  const overlay = document.getElementById('profileDrawerOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeProfileDrawerDirect() {
  const overlay = document.getElementById('profileDrawerOverlay');
  if (overlay) overlay.classList.remove('active');
}

function closeProfileDrawerModal(e) {
  if (e.target.id === 'profileDrawerOverlay' || e.target.classList.contains('profile-drawer-overlay') || e.target.classList.contains('drawer-overlay')) {
    closeProfileDrawerDirect();
  }
}

function handleSignOut() {
  if (confirm('Are you sure you want to sign out?')) {
    window.location.href = APP_ROUTES.sign_out || 'index.html';
  }
}

// 6. Notification (For You) Bottom Sheet Drawer Controls
function openForYouModal() {
  renderForYouSheetUI();
  const overlay = document.getElementById('forYouOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeForYouDirect() {
  const overlay = document.getElementById('forYouOverlay');
  if (overlay) overlay.classList.remove('active');
}

function closeForYouModal(e) {
  if (e.target.id === 'forYouOverlay') closeForYouDirect();
}

let currentForYouTab = 'all';
let selectedDocTypes = ['all'];

function filterForYou(category, btnElement) {
  filterForYouTab(category, btnElement);
}

function filterForYouTab(tabCategory, btnElement) {
  currentForYouTab = tabCategory;
  if (btnElement && btnElement.parentElement) {
    const tabs = btnElement.parentElement.querySelectorAll('.sheet-filter-pill');
    tabs.forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
  }
  applyForYouFilters();
}

function filterForYouDocType(docType) {
  selectedDocTypes = [docType];
  updateMultiSelectUI();
  applyForYouFilters();
}

function toggleDocTypeDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('docTypeDropdownMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

function toggleMultiSelectDocType(value, itemElem, e) {
  if (e) e.stopPropagation();

  if (value === 'all') {
    selectedDocTypes = ['all'];
  } else {
    const allIdx = selectedDocTypes.indexOf('all');
    if (allIdx !== -1) {
      selectedDocTypes.splice(allIdx, 1);
    }

    const idx = selectedDocTypes.indexOf(value);
    if (idx !== -1) {
      selectedDocTypes.splice(idx, 1);
    } else {
      selectedDocTypes.push(value);
    }

    if (selectedDocTypes.length === 0) {
      selectedDocTypes = ['all'];
    }
  }

  updateMultiSelectUI();
  applyForYouFilters();
}

const docTypeIconMap = {
  'Leave Request': 'Leave Request',
  'Medical Claim': 'Medical Claim',
  'Overtime': 'Overtime',
  'Change Request': 'Change Request',
  'Tax EA Form': 'Tax EA Form',
  'Performance Goal': 'Performance Goal'
};

function removeDocTypePill(value) {
  const idx = selectedDocTypes.indexOf(value);
  if (idx !== -1) {
    selectedDocTypes.splice(idx, 1);
  }
  if (selectedDocTypes.length === 0) {
    selectedDocTypes = ['all'];
  }
  updateMultiSelectUI();
  applyForYouFilters();
}

function clearAllDocTypePills() {
  selectedDocTypes = ['all'];
  updateMultiSelectUI();
  applyForYouFilters();
}

function updateMultiSelectUI() {
  const menu = document.getElementById('docTypeDropdownMenu');
  if (!menu) return;

  const items = menu.querySelectorAll('.dropdown-item');
  const isAll = selectedDocTypes.includes('all');

  items.forEach(item => {
    const val = item.getAttribute('data-value');
    const chk = item.querySelector('input[type="checkbox"]');

    if (isAll) {
      if (val === 'all') {
        item.classList.add('active');
        if (chk) chk.checked = true;
      } else {
        item.classList.remove('active');
        if (chk) chk.checked = false;
      }
    } else {
      if (selectedDocTypes.includes(val)) {
        item.classList.add('active');
        if (chk) chk.checked = true;
      } else {
        item.classList.remove('active');
        if (chk) chk.checked = false;
      }
    }
  });

  const label = document.getElementById('selectedDocTypeLabel');
  if (label) {
    if (isAll || selectedDocTypes.length === 0) {
      label.innerHTML = '<span class="doctype-placeholder">Document Type</span>';
      label.title = 'Document Type';
    } else {
      let html = selectedDocTypes.map(val => {
        const titleText = docTypeIconMap[val] || val;
        return `
          <div class="inline-active-pill" onclick="removeDocTypePill('${val}'); event.stopPropagation();">
            <span>${titleText}</span>
          </div>
        `;
      }).join('');
      label.innerHTML = `<div class="inline-pills-container">${html}</div>`;
      label.title = selectedDocTypes.join(', ');
    }
  }

  // Hide the old separate pills row as we now render inline
  const pillsRow = document.getElementById('activeFilterPillsRow');
  if (pillsRow) {
    pillsRow.style.display = 'none';
  }
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('docTypeDropdownMenu');
  if (menu && menu.classList.contains('show')) {
    if (!e.target.closest('.custom-dropdown-container')) {
      menu.classList.remove('show');
    }
  }
});

// Notifications Catalog Data with Grouping by File Type & Rich Details
let NOTIFICATIONS_CATALOG = [
  // Leave Requests Group
  {
    id: 'notif_1',
    doctype: 'Leave Request',
    typeCategory: 'Leave Requests',
    fy: 'pending_approval',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Approval needed: Alex Tan',
    subtitle: 'Annual Leave 2 Days (Oct 12-13)',
    applicant: 'Alex Tan',
    applicantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    role: 'Senior UI/UX Designer • Product Team',
    details: [
      { label: 'Leave Type', val: 'Annual Leave (Paid)' },
      { label: 'Duration', val: '2 Days (Oct 12 - Oct 13, 2026)' },
      { label: 'Balance Left', val: '10.5 / 14 Days Remaining' },
      { label: 'Reason', val: 'Family personal matter & medical appointment.' }
    ],
    status: 'Pending Manager Approval',
    badgeColor: 'amber'
  },
  {
    id: 'notif_2',
    doctype: 'Leave Request',
    typeCategory: 'Leave Requests',
    fy: 'pending_resubmit',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Resubmit required: Emergency Leave',
    subtitle: 'Supporting document attachment required',
    applicant: 'Sarah Jenkins (You)',
    applicantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    role: 'Lead Frontend Developer',
    details: [
      { label: 'Leave Type', val: 'Emergency Medical Leave' },
      { label: 'Duration', val: '1 Day (Sep 28, 2026)' },
      { label: 'HR Remark', val: 'Please attach doctor medical certificate (MC).' }
    ],
    status: 'Pending Resubmit',
    badgeColor: 'amber'
  },

  // Medical & Expense Claim Group
  {
    id: 'notif_3',
    doctype: 'Medical Claim',
    typeCategory: 'Medical & Expense Claims',
    fy: 'pending_approval',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Approval needed: Emily Wong',
    subtitle: 'Medical Claim $85.50 (Panacea Clinic)',
    applicant: 'Emily Wong',
    applicantAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    role: 'Marketing Executive • Growth Team',
    details: [
      { label: 'Claim Type', val: 'Outpatient Medical Receipt' },
      { label: 'Claim Amount', val: '$85.50 SGD' },
      { label: 'Clinic Name', val: 'Panacea Medical Clinic Orchard' },
      { label: 'Attachment', val: 'Receipt_2026_0904.pdf (Verified)' }
    ],
    status: 'Pending Manager Approval',
    badgeColor: 'amber'
  },
  {
    id: 'notif_4',
    doctype: 'Change Request',
    typeCategory: 'Medical & Expense Claims',
    fy: 'pending_resubmit',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Resubmit required: Bank Account',
    subtitle: 'Bank Statement attachment missing',
    applicant: 'Sarah Jenkins (You)',
    applicantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    role: 'Lead Frontend Developer',
    details: [
      { label: 'Change Request', val: 'Salary Direct Deposit Bank Account' },
      { label: 'Bank Name', val: 'DBS Bank Ltd' },
      { label: 'Finance Note', val: 'Bank statement header is missing. Please upload clear scan.' }
    ],
    status: 'Pending Resubmit',
    badgeColor: 'blue'
  },

  // Overtime Group
  {
    id: 'notif_5',
    doctype: 'Overtime',
    typeCategory: 'Overtime & Shift Requests',
    fy: 'pending_resubmit',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Resubmit required: Overtime',
    subtitle: 'OT Claim Sep 02 (Correction needed)',
    applicant: 'David Chen',
    applicantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    role: 'DevOps Engineer',
    details: [
      { label: 'OT Date', val: 'Sep 02, 2026 (18:00 - 21:30)' },
      { label: 'Hours Claimed', val: '3.5 Hours (Rate 1.5x)' },
      { label: 'Project', val: 'System Migration Sprint' }
    ],
    status: 'Pending Correction',
    badgeColor: 'rose'
  },

  // Tax & Official Documents Group
  {
    id: 'notif_6',
    doctype: 'Tax EA Form',
    typeCategory: 'Tax & Official Documents',
    fy: 'pending_approval',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Approval needed: EA Form 2025',
    subtitle: 'Official income tax return statement',
    applicant: 'Payroll & Compliance Dept',
    applicantAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    role: 'Group HR Compliance',
    details: [
      { label: 'Document Type', val: 'EA Tax Return Form 2025' },
      { label: 'Total Earnings', val: '$78,400.00 SGD' },
      { label: 'Action Needed', val: 'Digitally Sign & Confirm Declaration' }
    ],
    status: 'Pending Signature',
    badgeColor: 'violet'
  },

  // Performance & KPI Goals Group
  {
    id: 'notif_7',
    doctype: 'Performance Goal',
    typeCategory: 'Performance & KPI Goals',
    fy: 'pending_approval',
    icon: '',
    iconBg: 'transparent',
    iconColor: 'inherit',
    title: 'Approval needed: Q3 KPI',
    subtitle: 'Performance Goal submission',
    applicant: 'Michael Chang',
    applicantAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    role: 'QA Engineering Lead',
    details: [
      { label: 'Goal Title', val: 'Automated E2E Test Suite Coverage 90%' },
      { label: 'Target Date', val: 'Q3 2026 (Oct 30, 2026)' },
      { label: 'Weightage', val: '35% Score Weight' }
    ],
    status: 'Pending Lead Review',
    badgeColor: 'teal'
  }
];

let activeNotifItem = null;

function toggleNotifGroupAccordion(groupId) {
  const groupEl = document.getElementById(groupId);
  if (groupEl) {
    groupEl.classList.toggle('collapsed');
  }
}

function applyForYouFilters() {
  renderForYouSheetUI();
}

function renderForYouSheetUI() {
  const groupedContainer = document.getElementById('forYouGroupedContainer');
  const emptyEl = document.getElementById('forYouEmptyState');

  if (!groupedContainer) return;

  // Filter Catalog Items
  const filteredList = NOTIFICATIONS_CATALOG.filter(item => {
    const matchTab = (currentForYouTab === 'all' || item.fy === currentForYouTab);
    const isAllDocs = selectedDocTypes.includes('all');
    const matchDocType = isAllDocs || selectedDocTypes.includes(item.doctype);
    return matchTab && matchDocType;
  });

  if (emptyEl) emptyEl.style.display = filteredList.length === 0 ? 'block' : 'none';

  groupedContainer.style.display = 'block';

  // Group items by typeCategory (File Type / Request Module)
  const grouped = {};
  filteredList.forEach(item => {
    if (!grouped[item.typeCategory]) grouped[item.typeCategory] = [];
    grouped[item.typeCategory].push(item);
  });

  if (Object.keys(grouped).length === 0) {
    groupedContainer.innerHTML = '';
    return;
  }

  groupedContainer.innerHTML = Object.keys(grouped).map((catTitle, idx) => {
    const items = grouped[catTitle];
    const groupDomId = `notif_grp_${idx}`;
    return `
      <div class="notif-group-card" id="${groupDomId}">
        <div class="notif-group-header" onclick="toggleNotifGroupAccordion('${groupDomId}')">
          <div class="group-title-box">
            <span class="group-title-text">${catTitle}</span>
            <span class="group-count-badge">${items.length} Request${items.length > 1 ? 's' : ''}</span>
          </div>
          <span class="group-chevron">▼</span>
        </div>

        <div class="notif-group-body">
          ${items.map(item => `
            <div class="sheet-item-card" onclick="openApprovalDetailModal('${item.id}', event)">
              <div class="item-left-box">
                <div class="item-info">
                  <h5>${item.title}</h5>
                  <span>${item.subtitle}</span>
                </div>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">Details ›</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Approval Details Sheet Modal Controls
function openApprovalDetailModal(notifId, event) {
  if (event) event.stopPropagation();
  const item = NOTIFICATIONS_CATALOG.find(n => n.id === notifId);
  if (!item) return;

  activeNotifItem = item;

  const applicantCard = document.getElementById('approvalApplicantCard');
  const metaGrid = document.getElementById('approvalMetaGrid');
  const modalTitle = document.getElementById('approvalModalTitle');
  const modalSubTitle = document.getElementById('approvalModalSubTitle');

  if (modalTitle) modalTitle.innerText = item.title;
  if (modalSubTitle) modalSubTitle.innerText = `Type: ${item.typeCategory} • Status: ${item.status}`;

  if (applicantCard) {
    applicantCard.innerHTML = `
      <img src="${item.applicantAvatar}" class="approval-avatar" alt="Avatar">
      <div>
        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">${item.applicant}</h4>
        <p style="font-size: 11px; color: var(--text-muted); margin: 0;">${item.role}</p>
      </div>
    `;
  }

  if (metaGrid) {
    metaGrid.innerHTML = item.details.map(d => `
      <div class="approval-meta-row">
        <span class="approval-meta-label">${d.label}</span>
        <span class="approval-meta-val">${d.val}</span>
      </div>
    `).join('');
  }

  const overlay = document.getElementById('approvalDetailOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeApprovalDetailDirect(event) {
  if (event && event.target && event.target.id !== 'approvalDetailOverlay') return;
  const overlay = document.getElementById('approvalDetailOverlay');
  if (overlay) overlay.classList.remove('active');
}

function actionApproveRequest() {
  if (!activeNotifItem) return;
  const name = activeNotifItem.applicant;
  const id = activeNotifItem.id;

  // Remove approved item from catalog
  NOTIFICATIONS_CATALOG = NOTIFICATIONS_CATALOG.filter(n => n.id !== id);

  closeApprovalDetailDirect();
  if (typeof showToast === 'function') showToast(`✅ Approved [${name}]'s request!`);
  renderForYouSheetUI();
}

function actionRejectRequest() {
  if (!activeNotifItem) return;
  const name = activeNotifItem.applicant;
  const id = activeNotifItem.id;

  NOTIFICATIONS_CATALOG = NOTIFICATIONS_CATALOG.filter(n => n.id !== id);

  closeApprovalDetailDirect();
  if (typeof showToast === 'function') showToast(`❌ Rejected [${name}]'s request.`);
  renderForYouSheetUI();
}

// 7. V1 Insights Tab Switcher (My vs Team)
function switchInsightTab(tab) {
  const pillMy = document.getElementById('pillMy');
  const pillTeam = document.getElementById('pillTeam');
  const paneMy = document.getElementById('paneMy');
  const paneTeam = document.getElementById('paneTeam');
  const title = document.getElementById('insightCardTitle');

  if (tab === 'my') {
    if (pillMy) pillMy.classList.add('active');
    if (pillTeam) pillTeam.classList.remove('active');
    if (paneMy) paneMy.classList.add('active');
    if (paneTeam) paneTeam.classList.remove('active');
    if (title) title.textContent = 'My Insights';
  } else {
    if (pillTeam) pillTeam.classList.add('active');
    if (pillMy) pillMy.classList.remove('active');
    if (paneTeam) paneTeam.classList.add('active');
    if (paneMy) paneMy.classList.remove('active');
    if (title) title.textContent = 'Team Insights';
  }
}

// 8. V1 Indicators Bottom Sheet Drawer Controls (Team & Individual)
function toggleTeamSection(sectionId) {
  const sec = document.getElementById(sectionId);
  if (sec) {
    sec.classList.toggle('collapsed');
  }
}

function openIndicatorsModal(scope = null, instant = false) {
  // If scope not provided, detect from active tab on the home screen
  if (!scope) {
    const isTeam = document.getElementById('paneTeam')?.classList.contains('active');
    scope = isTeam ? 'team' : 'my';
  }

  const titleEl = document.getElementById('indicatorsSheetTitle');
  const subEl = document.getElementById('indicatorsSheetSubtitle');
  const myFeed = document.getElementById('myIndicatorsFeed');
  const teamFeed = document.getElementById('teamIndicatorsFeed');

  if (scope === 'team') {
    if (titleEl) titleEl.innerText = 'Team Indicator';
    if (subEl) subEl.innerText = 'Department Aggregated Metrics (12) • Breakdown';
    if (myFeed) myFeed.style.display = 'none';
    if (teamFeed) teamFeed.style.display = 'block';
    const cAll = document.getElementById('indicatorCountAll');
    const cPos = document.getElementById('indicatorCountPos');
    const cNeg = document.getElementById('indicatorCountNeg');
    if (cAll) cAll.innerText = '12';
    if (cPos) cPos.innerText = '3';
    if (cNeg) cNeg.innerText = '9';
  } else {
    if (titleEl) titleEl.innerText = 'My Indicators';
    if (subEl) subEl.innerText = 'Personal Work & HR Metrics (14) • Breakdown';
    if (myFeed) myFeed.style.display = 'block';
    if (teamFeed) teamFeed.style.display = 'none';
    const cAll = document.getElementById('indicatorCountAll');
    const cPos = document.getElementById('indicatorCountPos');
    const cNeg = document.getElementById('indicatorCountNeg');
    if (cAll) cAll.innerText = '14';
    if (cPos) cPos.innerText = '4';
    if (cNeg) cNeg.innerText = '10';
  }

  // Reset filter pills to All
  const filterPills = document.querySelectorAll('.sheet-filter-bar .sheet-filter-pill');
  filterPills.forEach((p, idx) => {
    if (idx === 0) p.classList.add('active');
    else p.classList.remove('active');
  });

  const activeContainer = scope === 'team' ? teamFeed : myFeed;
  if (activeContainer) {
    activeContainer.querySelectorAll('.metric-feed-card, .feed-section-label').forEach(el => {
      el.style.display = 'flex';
    });
  }

  const overlay = document.getElementById('indicatorsOverlay');
  if (overlay) {
    if (instant) {
      overlay.classList.add('instant');
      setTimeout(() => overlay.classList.remove('instant'), 300);
    }
    overlay.classList.add('active');
  }
}

function closeIndicatorsDirect() {
  const overlay = document.getElementById('indicatorsOverlay');
  if (overlay) overlay.classList.remove('active');
}

function closeIndicatorsModal(e) {
  if (e.target.id === 'indicatorsOverlay') closeIndicatorsDirect();
}

function filterDrawerIndicators(group, btnElement) {
  const tabs = btnElement.parentElement.querySelectorAll('.sheet-filter-pill');
  tabs.forEach(tab => tab.classList.remove('active'));
  btnElement.classList.add('active');

  const teamFeed = document.getElementById('teamIndicatorsFeed');
  const myFeed = document.getElementById('myIndicatorsFeed');
  const activeFeed = (teamFeed && teamFeed.style.display !== 'none') ? teamFeed : myFeed;
  if (!activeFeed) return;

  const cards = activeFeed.querySelectorAll('.metric-feed-card');
  cards.forEach(card => {
    if (group === 'all' || card.getAttribute('data-group') === group) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });

  const sectionLabels = activeFeed.querySelectorAll('.feed-section-label');
  sectionLabels.forEach(lbl => {
    if (group === 'all' || lbl.getAttribute('data-group') === group) {
      lbl.style.display = 'flex';
    } else {
      lbl.style.display = 'none';
    }
  });
}

// 9. V1 Company Updates Bottom Sheet Drawer Controls
function openUpdatesModal() {
  const overlay = document.getElementById('updatesOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeUpdatesDirect() {
  const overlay = document.getElementById('updatesOverlay');
  if (overlay) overlay.classList.remove('active');
}

function closeUpdatesModal(e) {
  if (e.target.id === 'updatesOverlay') closeUpdatesDirect();
}

function filterUpdates(category, btnElement) {
  const tabs = btnElement.parentElement.querySelectorAll('.sheet-filter-pill');
  tabs.forEach(tab => tab.classList.remove('active'));
  btnElement.classList.add('active');

  const cards = document.querySelectorAll('#updatesOverlay .sheet-item-card');
  cards.forEach(card => {
    if (category === 'all' || card.getAttribute('data-update') === category) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function openNewsDetail(cardEl, title) {
  if (cardEl) {
    const badge = cardEl.querySelector('.sheet-tag-badge');
    if (badge && badge.classList.contains('red')) {
      badge.classList.remove('red');
      badge.classList.add('green');
      badge.textContent = 'News';
      showToast(`Marked as read: ${title || 'News'}`);
      return;
    }
  }
  showToast(`Opening: ${title || 'News'}`);
}

// 10. Policy & SOP Detail Data & Controller
const POLICY_DATABASE = {
  'DE001': {
    ref: 'DE001',
    title: 'PeopleTime User Guide v2',
    dept: 'ADMINISTRATION',
    policy: {
      name: 'PeopleTime_UserGuide_v2.pdf',
      size: '3.91 MB',
      date: '20/12/2024',
      type: 'PDF Document'
    },
    sop: null,
    guideline: null
  },
  'HR004': {
    ref: 'HR004',
    title: 'Hybrid & Remote Work Policy 2026',
    dept: 'ALL DEPARTMENTS',
    policy: {
      name: 'Remote_Work_Framework_2026.pdf',
      size: '1.45 MB',
      date: '15/01/2026',
      type: 'PDF Document'
    },
    sop: {
      name: 'SOP_WFH_Application_Approval.pdf',
      size: '820 KB',
      date: '18/01/2026',
      type: 'PDF Document'
    },
    guideline: null
  },
  'FN012': {
    ref: 'FN012',
    title: 'Medical & Travel Claims SOP',
    dept: 'FINANCE & ACCOUNTING',
    policy: {
      name: 'Staff_Expense_Reimbursement_Policy.pdf',
      size: '2.10 MB',
      date: '01/02/2026',
      type: 'PDF Document'
    },
    sop: {
      name: 'SOP_Overseas_Travel_Claims_v3.pdf',
      size: '1.15 MB',
      date: '05/02/2026',
      type: 'PDF Document'
    },
    guideline: {
      name: 'Mileage_Per_Diem_Rate_Card.pdf',
      size: '450 KB',
      date: '05/02/2026',
      type: 'PDF Document'
    }
  }
};

function renderFileRow(fileObj, typeName) {
  if (!fileObj) {
    return `<div class="doc-file-empty-text">No ${typeName} document uploaded (N/A)</div>`;
  }
  return `
    <div class="doc-file-icon pdf">
      <i class="fa-solid fa-file-pdf" style="font-size: 18px;"></i>
    </div>
    <div class="doc-file-info" onclick="previewPolicyDoc('${fileObj.name}')" style="cursor: pointer;">
      <div class="doc-file-name">${fileObj.name}</div>
      <div class="doc-file-meta">${fileObj.size} • ${fileObj.type || 'PDF Document'}</div>
    </div>
    <button class="doc-view-btn" onclick="previewPolicyDoc('${fileObj.name}')" title="View Document" aria-label="View Document">
      <i class="fa-solid fa-eye" style="font-size: 14px;"></i>
    </button>
  `;
}

function openPolicyDetail(refId) {
  const item = POLICY_DATABASE[refId] || POLICY_DATABASE['DE001'];
  
  const refBadge = document.getElementById('policyRefBadge');
  const titleEl = document.getElementById('policyDetailTitle');
  const deptText = document.getElementById('policyDeptText');
  const policyDate = document.getElementById('policyDatePill');
  const policyFileRow = document.getElementById('policyFileRow');
  const sopDate = document.getElementById('sopDatePill');
  const sopFileRow = document.getElementById('sopFileRow');
  const guidelineDate = document.getElementById('guidelineDatePill');
  const guidelineFileRow = document.getElementById('guidelineFileRow');

  if (refBadge) refBadge.innerText = 'REF: ' + item.ref;
  if (titleEl) titleEl.innerText = item.title;
  if (deptText) deptText.innerText = 'Attention to: ' + item.dept;

  if (policyDate) policyDate.innerText = 'Effective: ' + (item.policy ? item.policy.date : 'N/A');
  if (policyFileRow) policyFileRow.innerHTML = renderFileRow(item.policy, 'Policy');

  if (sopDate) sopDate.innerText = 'Effective: ' + (item.sop ? item.sop.date : 'N/A');
  if (sopFileRow) sopFileRow.innerHTML = renderFileRow(item.sop, 'SOP');

  if (guidelineDate) guidelineDate.innerText = 'Effective: ' + (item.guideline ? item.guideline.date : 'N/A');
  if (guidelineFileRow) guidelineFileRow.innerHTML = renderFileRow(item.guideline, 'Guideline');

  const overlay = document.getElementById('policyDetailOverlay');
  if (overlay) overlay.classList.add('active');
}

function closePolicyDetailDirect() {
  const overlay = document.getElementById('policyDetailOverlay');
  if (overlay) overlay.classList.remove('active');
}

function closePolicyDetailModal(e) {
  if (e.target.id === 'policyDetailOverlay') closePolicyDetailDirect();
}

function previewPolicyDoc(fileName) {
  showToast(`📄 Viewing ${fileName}`);
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('drawer') === 'open' || urlParams.get('openDrawer') === 'true') {
    setTimeout(openProfileDrawer, 100);
  }
  if (urlParams.get('updates') === 'open' || urlParams.get('openUpdates') === 'true') {
    setTimeout(openUpdatesModal, 100);
  }
  if (urlParams.get('tab') === 'team') {
    switchInsightTab('team');
  }
  if (urlParams.get('policy')) {
    setTimeout(() => openPolicyDetail(urlParams.get('policy')), 150);
  }
  if (urlParams.get('indicators') === 'team') {
    setTimeout(() => openIndicatorsModal('team', true), 50);
  } else if (urlParams.get('indicators') === 'open' || urlParams.get('indicators') === 'my') {
    setTimeout(() => openIndicatorsModal('my', true), 50);
  }
  if (urlParams.get('tab')) {
    const t = urlParams.get('tab');
    const btn = document.querySelector(`.me-tab-pill[data-tab="${t}"]`);
    if (btn) switchMeTab(t, btn);
  }
});

// 11. Me Profile Page Logic
function switchMeTab(tabId, btnEl) {
  const allBtns = document.querySelectorAll('.me-tab-pill');
  allBtns.forEach(btn => btn.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const allPanes = document.querySelectorAll('.me-tab-pane');
  allPanes.forEach(pane => pane.classList.remove('active'));
  const targetPane = document.getElementById('mePane_' + tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }
}

function toggleAccountMask(btnEl) {
  const accountSpan = document.getElementById('cimbAccountVal');
  if (!accountSpan) return;
  const isMasked = accountSpan.getAttribute('data-masked') === 'true';
  if (isMasked) {
    accountSpan.textContent = accountSpan.getAttribute('data-raw');
    accountSpan.setAttribute('data-masked', 'false');
    if (btnEl) btnEl.textContent = '🔒 Hide';
  } else {
    accountSpan.textContent = '•••• •••• ' + accountSpan.getAttribute('data-raw').slice(-4);
    accountSpan.setAttribute('data-masked', 'true');
    if (btnEl) btnEl.textContent = '👁️ Show';
  }
}

function copyText(text, label) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
  showToast(`Copied ${label || 'text'} to clipboard!`);
}

function searchTrainingCourses(query) {
  const q = (query || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.training-row-card');
  let matchCount = 0;
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = 'flex';
      matchCount++;
    } else {
      row.style.display = 'none';
    }
  });
  const countBadge = document.getElementById('trainingCountBadge');
  if (countBadge) {
    countBadge.textContent = q ? `${matchCount} / 33` : '33';
  }
}

function filterLetters(category, btnEl) {
  const tabs = document.querySelectorAll('.letter-filter-pill');
  tabs.forEach(t => t.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const rows = document.querySelectorAll('.hr-letter-row');
  let visibleCount = 0;
  rows.forEach(row => {
    const status = row.getAttribute('data-status');
    const type = row.getAttribute('data-type');
    let match = false;
    if (category === 'all') match = true;
    else if (category === 'pending' && status === 'pending') match = true;
    else if (category === 'signed' && status === 'signed') match = true;
    else if (category === type) match = true;

    if (match) {
      row.style.display = 'flex';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  const countBadge = document.getElementById('lettersCountBadge');
  if (countBadge) {
    countBadge.textContent = category === 'all' ? '31' : `${visibleCount} / 31`;
  }
}

function previewLetterDoc(letterName) {
  showToast(`📄 Document: ${letterName}`);
}

function signLetterAction(letterName) {
  showToast(`✍️ Opening digital signing pad for ${letterName}`);
}

// ========================================================
// INSTANT FAVOURITE BOTTOM SHEET DRAWER LOGIC
// ========================================================
const SYSTEM_FAV_CATALOG = [
  // 📝 Apply Module
  { id: 'leave', category: '📝 Apply Module', name: 'Leave Application', icon: '🌴', color: '#f97316', bg: 'rgba(249, 115, 22, 0.16)', target: 'leave' },
  { id: 'overtime', category: '📝 Apply Module', name: 'Overtime Request', icon: '⏰', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.16)', target: 'work_behaviour' },
  { id: 'shift_swap', category: '📝 Apply Module', name: 'Shift Exchange Request', icon: '🔄', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.16)', target: 'work_behaviour' },

  // 🧾 Claim & Expense Module
  { id: 'claims', category: '🧾 Claim & Expense Module', name: 'Medical & Outpatient Claim', icon: '🧾', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.16)', target: 'claims_expenses' },
  { id: 'travel_claim', category: '🧾 Claim & Expense Module', name: 'Travel & Allowance Expense', icon: '✈️', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.16)', target: 'change_request' },

  // 💰 Payroll & Personal Module
  { id: 'payslip', category: '💰 Payroll & Personal Module', name: 'Payslip & EA Form', icon: '💰', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', target: 'payslip' },
  { id: 'bonus', category: '💰 Payroll & Personal Module', name: 'Bonus & Dividend History', icon: '🎁', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.16)', target: 'bonus_history' },
  { id: 'calendar', category: '💰 Payroll & Personal Module', name: 'My Work Calendar', icon: '📅', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.16)', target: 'calendar' },

  // 👥 Team & Manager Module
  { id: 'team', category: '👥 Team & Manager Module', name: 'Team Directory & Contact', icon: '👥', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.16)', target: 'team' },
  { id: 'subordinates', category: '👥 Team & Manager Module', name: 'Subordinates Roster & Approval', icon: '👔', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.16)', target: 'subordinates' },

  // 🎯 Performance & Growth Module
  { id: 'performance', category: '🎯 Performance & Growth Module', name: 'KPI Review & Goals', icon: '🎯', color: '#eab308', bg: 'rgba(234, 179, 8, 0.16)', target: 'performance_goals' }
];

let userFavStarredIds = JSON.parse(localStorage.getItem('peoplehcm_starred_list') || '["leave", "payslip", "team", "calendar", "claims", "overtime"]');
let favEditMode = false;

function openFavouriteModal(event) {
  if (event) event.preventDefault();

  let favSheet = document.querySelector('favourite-sheet');
  if (!favSheet) {
    favSheet = document.createElement('favourite-sheet');
    document.querySelector('.phone-container')?.appendChild(favSheet);
  }

  favEditMode = false;
  renderFavSheetUI();

  const overlay = document.getElementById('favSheetOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeFavSheetDirect() {
  const overlay = document.getElementById('favSheetOverlay');
  if (overlay) overlay.classList.remove('active');
}

function closeFavSheet(event) {
  if (event && event.target && event.target.id === 'favSheetOverlay') {
    closeFavSheetDirect();
  }
}

function toggleFavEditMode() {
  favEditMode = !favEditMode;
  renderFavSheetUI();
}

function toggleFavStarInModal(modId, event) {
  if (event) event.stopPropagation();
  const idx = userFavStarredIds.indexOf(modId);
  const mod = SYSTEM_FAV_CATALOG.find(m => m.id === modId);

  if (idx > -1) {
    if (userFavStarredIds.length <= 1) {
      showToast('⚠️ Keep at least 1 favourite starred!');
      return;
    }
    userFavStarredIds.splice(idx, 1);
    if (typeof showToast === 'function') showToast(`Removed [${mod ? mod.name : modId}]`);
  } else {
    userFavStarredIds.push(modId);
    if (typeof showToast === 'function') showToast(`⭐ Added [${mod ? mod.name : modId}]!`);
  }

  localStorage.setItem('peoplehcm_starred_list', JSON.stringify(userFavStarredIds));
  renderFavSheetUI();
}

function renderFavSheetUI() {
  const gridView = document.getElementById('favGridView');
  const editView = document.getElementById('favEditView');
  const toggleBtn = document.getElementById('favEditToggleBtn');
  const subTitle = document.getElementById('favSheetSubtitle');

  if (!gridView || !editView) return;

  if (favEditMode) {
    gridView.style.display = 'none';
    editView.style.display = 'flex';
    if (toggleBtn) toggleBtn.innerHTML = '✅ Done';
    if (subTitle) subTitle.innerText = 'Grouped by Module • Tap ⭐ to toggle';

    // Group catalog by module category
    const grouped = {};
    SYSTEM_FAV_CATALOG.forEach(mod => {
      if (!grouped[mod.category]) grouped[mod.category] = [];
      grouped[mod.category].push(mod);
    });

    editView.innerHTML = Object.keys(grouped).map(catName => `
      <div style="margin-top: 4px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); padding: 4px 2px 6px 2px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>${catName}</span>
          <span style="font-size: 10px; font-weight: 600; opacity: 0.7;">${grouped[catName].length} Modules</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${grouped[catName].map(mod => {
            const isStarred = userFavStarredIds.includes(mod.id);
            return `
              <div style="background: var(--bg-card); border: 1px solid ${isStarred ? 'rgba(234, 179, 8, 0.3)' : 'var(--border-subtle)'}; border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 34px; height: 34px; border-radius: 10px; background: ${mod.bg}; color: ${mod.color}; display: flex; align-items: center; justify-content: center; font-size: 17px;">${mod.icon}</div>
                  <span style="font-size: 12.5px; font-weight: 700; color: var(--text-primary);">${mod.name}</span>
                </div>
                <button onclick="toggleFavStarInModal('${mod.id}', event)" style="background: ${isStarred ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-card-hover)'}; border: 1px solid ${isStarred ? 'rgba(234, 179, 8, 0.4)' : 'var(--border-subtle)'}; color: ${isStarred ? '#eab308' : 'var(--text-muted)'}; width: 32px; height: 32px; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s ease;">
                  ${isStarred ? '★' : '☆'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  } else {
    gridView.style.display = 'grid';
    editView.style.display = 'none';
    if (toggleBtn) toggleBtn.innerHTML = '✏️ Customize';
    if (subTitle) subTitle.innerText = `${userFavStarredIds.length} Starred Shortcuts`;

    const starredMods = SYSTEM_FAV_CATALOG.filter(m => userFavStarredIds.includes(m.id));

    gridView.innerHTML = starredMods.map(mod => `
      <div class="fav-grid-item" onclick="closeFavSheetDirect(); navTo('${mod.target}', event);">
        <div class="fav-grid-icon-box" style="background: ${mod.bg}; color: ${mod.color};">${mod.icon}</div>
        <span class="fav-grid-label">${mod.name}</span>
      </div>
    `).join('');
  }
}

// 6. Dynamic Explore Header Scroll Color Controller
function initExploreScrollListener() {
  const mainScroll = document.querySelector('.main-content');
  const exploreTitle = document.querySelector('.explore-title');
  if (!mainScroll || !exploreTitle) return;
  // Dashboard headings stay on the plain surface below the fixed artwork.
  if (mainScroll.closest('.dashboard-page')) {
    exploreTitle.style.removeProperty('color');
    exploreTitle.style.removeProperty('text-shadow');
    return;
  }

  function handleExploreScroll() {
    const isLight = (document.documentElement.getAttribute('data-theme') || 'dark') === 'light';
    if (!isLight) {
      exploreTitle.style.color = '#ffffff';
      exploreTitle.style.textShadow = 'none';
      return;
    }

    // Measure scroll position relative to purple hero background
    const scrollTop = mainScroll.scrollTop;
    if (scrollTop > 80) {
      // Scrolled up into purple hero background area -> switch font to pure white
      exploreTitle.style.color = '#ffffff';
      exploreTitle.style.textShadow = '0 1px 4px rgba(0, 0, 0, 0.4)';
    } else {
      // Original position on white page background -> switch font to dark slate (#0f172a)
      exploreTitle.style.color = '#0f172a';
      exploreTitle.style.textShadow = 'none';
    }
  }

  mainScroll.removeEventListener('scroll', handleExploreScroll);
  mainScroll.addEventListener('scroll', handleExploreScroll, { passive: true });
  handleExploreScroll();
}

/*
 * Canonical filter helpers. Attendance contains several generations of
 * filter markup, so the shared layer normalizes presentation while leaving
 * each page's fields and filtering functions intact.
 */
function formatStandardFilterLabel(label) {
  return label
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s(\/-])([a-z])/g, (match, prefix, character) => `${prefix}${character.toUpperCase()}`)
    .replace(/\bRm\b/g, 'RM')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bOt\b/g, 'OT');
}

function closeStandardFilterOverlay(overlay) {
  if (!overlay) return;
  if (overlay.id === 'sharedInlineFilterSheet') {
    overlay.classList.remove('is-open');
    return;
  }

  // Existing pages already know how to close and animate their own overlay.
  // Clicking the backdrop calls that original handler with the correct target.
  if (overlay.getAttribute('onclick')) {
    overlay.click();
    return;
  }

  const panel = overlay.querySelector('.standard-filter-panel');
  if (panel) panel.style.transform = 'translateY(100%)';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  window.setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

function findStandardFilterPanel(overlay) {
  if (!overlay || overlay.id === 'filterBodyContainer') return null;
  const position = window.getComputedStyle(overlay).position;
  const overlayLike = overlay.matches('.modal-overlay, .indicators-overlay, .bottom-sheet, .claim-filter-sheet')
    || /(?:modal|overlay|sheet)$/i.test(overlay.id)
    || position === 'fixed'
    || position === 'absolute';
  if (!overlayLike) return null;

  return Array.from(overlay.children).find((child) => child.querySelector?.('input, select, textarea')) || null;
}

function initStandardFilterSheets() {
  const filterOverlays = document.querySelectorAll('[id*="filter" i]');

  filterOverlays.forEach((overlay) => {
    if (overlay.classList.contains('claim-filter-sheet')) return;

    const panel = findStandardFilterPanel(overlay);
    if (!panel || panel.dataset.standardFilterReady === 'true') return;
    panel.dataset.standardFilterReady = 'true';

    overlay.classList.add('standard-filter-sheet');
    panel.classList.add('standard-filter-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Filter');

    let handle = panel.querySelector('.standard-filter-handle, .claim-filter-handle, .drag-handle, .sheet-handle');
    if (!handle) {
      const firstChild = panel.firstElementChild;
      if (firstChild && !firstChild.querySelector('input, select, textarea, button')) {
        const firstStyle = window.getComputedStyle(firstChild);
        if (parseFloat(firstStyle.width) <= 48 && parseFloat(firstStyle.height) <= 10) handle = firstChild;
      }
    }
    if (!handle) {
      handle = document.createElement('div');
      panel.prepend(handle);
    }
    handle.classList.add('standard-filter-handle');
    handle.setAttribute('aria-hidden', 'true');

    const title = panel.querySelector('h2, h3, .sheet-title, .filter-modal-title');
    if (title) {
      title.textContent = 'Filter';

      let header = title.parentElement;
      let ancestor = title.parentElement;
      while (ancestor && ancestor !== panel) {
        if (Array.from(ancestor.children).some((child) => child.matches?.('button'))) {
          header = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      header.classList.add('standard-filter-header');

      header.querySelectorAll('p, small, .filter-subtitle, [class*="subtitle" i], [class*="description" i]')
        .forEach((element) => element.classList.add('standard-filter-subtitle'));

      let actions = header.querySelector('.standard-filter-header-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'standard-filter-header-actions';
        Array.from(header.querySelectorAll(':scope > button')).forEach((button) => actions.appendChild(button));
        header.appendChild(actions);
      }

      const actionButtons = Array.from(actions.querySelectorAll('button'));
      let resetButton = actionButtons.find((button) => /reset/i.test(button.textContent));
      let closeButton = actionButtons.find((button) => {
        const descriptor = [
          button.textContent,
          button.getAttribute('aria-label'),
          button.getAttribute('title'),
          button.getAttribute('onclick')
        ].filter(Boolean).join(' ');
        return /close|dismiss/i.test(descriptor) && !/reset/i.test(descriptor);
      });

      if (!resetButton) {
        resetButton = document.createElement('button');
        resetButton.type = 'button';
        actions.appendChild(resetButton);
      }
      resetButton.classList.add('standard-filter-reset');
      resetButton.innerHTML = '<i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Reset</span>';
      resetButton.setAttribute('aria-label', 'Reset filter');

      if (!closeButton) {
        closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeStandardFilterOverlay(overlay);
        });
        actions.appendChild(closeButton);
      }
      closeButton.classList.add('standard-filter-close');
      closeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      closeButton.setAttribute('aria-label', 'Close filter');

      // The order is part of the filter standard: Reset first, Close last.
      actions.appendChild(resetButton);
      actions.appendChild(closeButton);
    }

    const fields = Array.from(panel.querySelectorAll('input, select, textarea'));
    const initialValues = fields.map((field) => ({
      field,
      value: field.value,
      checked: field.checked
    }));

    panel.querySelectorAll('label').forEach((label) => {
      if (label.querySelector('input, select, textarea')) return;
      const labelText = label.textContent.replace(/\s+/g, ' ').trim();
      if (labelText) label.textContent = formatStandardFilterLabel(labelText);
    });

    panel.querySelectorAll('button').forEach((button) => {
      const label = button.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      if (label.includes('reset')) button.classList.add('standard-filter-reset');
      if (label.includes('apply') && label.includes('filter')) {
        button.classList.add('standard-filter-apply');
        button.textContent = 'Apply Filter';
      }
    });

    panel.querySelectorAll('.standard-filter-reset').forEach((button) => {
      if (button.dataset.standardResetReady === 'true') return;
      button.dataset.standardResetReady = 'true';
      button.addEventListener('click', () => {
        initialValues.forEach(({ field, value, checked }) => {
          field.value = value;
          if (field.type === 'checkbox' || field.type === 'radio') field.checked = checked;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  });
}

/*
 * Legacy summary pages put the real filter controls in an accordion. Move
 * them into the standard sheet, unless the page already has a functional
 * bottom sheet; in that case the accordion becomes only its trigger.
 */
function initInlineFilterSheet() {
  const inlineBody = document.getElementById('filterBodyContainer');
  const inlineHeader = document.getElementById('filterHeaderBar');
  if (!inlineBody || !inlineHeader || document.getElementById('sharedInlineFilterSheet')) return;

  const existingFilterSheets = Array.from(document.querySelectorAll('[id*="filter" i]'))
    .filter((element) => element !== inlineBody && findStandardFilterPanel(element));
  const functionalSheet = existingFilterSheets.find((overlay) => {
    const panel = findStandardFilterPanel(overlay);
    const applyButton = Array.from(panel.querySelectorAll('button')).find((button) => /apply filter/i.test(button.textContent));
    return /apply|submit/i.test(applyButton?.getAttribute('onclick') || '');
  });

  const openExistingSheet = () => {
    if (typeof window.openFilterModal === 'function') {
      window.openFilterModal();
      return;
    }
    if (!functionalSheet) return;
    functionalSheet.style.display = 'flex';
    functionalSheet.style.opacity = '1';
    functionalSheet.style.pointerEvents = 'auto';
    const panel = findStandardFilterPanel(functionalSheet);
    if (panel) panel.style.transform = 'translateY(0)';
  };

  const makeTrigger = (open) => {
    inlineHeader.classList.add('standard-filter-inline-trigger');
    inlineHeader.removeAttribute('onclick');
    inlineHeader.querySelectorAll('span').forEach((span) => {
      if (/data filter|filter history/i.test(span.textContent)) span.textContent = 'Filter';
    });
    inlineHeader.addEventListener('click', open);
    const toggleButton = document.getElementById('btnToggleFilter');
    if (toggleButton) {
      toggleButton.removeAttribute('onclick');
      toggleButton.addEventListener('click', open);
    }
  };

  if (functionalSheet) {
    inlineBody.style.display = 'none';
    inlineBody.setAttribute('aria-hidden', 'true');
    makeTrigger(openExistingSheet);
    return;
  }

  existingFilterSheets.forEach((overlay) => overlay.classList.add('standard-filter-unused'));

  const initialValues = Array.from(inlineBody.querySelectorAll('input, select, textarea')).map((field) => ({
    field,
    value: field.value,
    checked: field.checked
  }));

  const sheet = document.createElement('div');
  sheet.id = 'sharedInlineFilterSheet';
  sheet.className = 'modal-overlay standard-filter-sheet';
  sheet.innerHTML = `
    <div class="standard-filter-panel" role="dialog" aria-modal="true" aria-label="Filter">
      <div class="standard-filter-handle" aria-hidden="true"></div>
      <div class="standard-filter-header">
        <h2>Filter</h2>
        <div class="standard-filter-header-actions">
          <button type="button" class="standard-filter-reset"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Reset</span></button>
          <button type="button" class="standard-filter-close" aria-label="Close filter"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="standard-filter-inline-body"></div>
      <div class="standard-filter-footer">
        <button type="button" class="standard-filter-apply">Apply Filter</button>
      </div>
    </div>
  `;

  const panel = sheet.querySelector('.standard-filter-panel');
  const body = sheet.querySelector('.standard-filter-inline-body');
  const resetButton = sheet.querySelector('.standard-filter-reset');
  const closeButton = sheet.querySelector('.standard-filter-close');
  const applyButton = sheet.querySelector('.standard-filter-apply');
  body.appendChild(inlineBody);
  const sheetHost = document.querySelector('.phone-container') || document.body;
  sheetHost.appendChild(sheet);

  inlineBody.querySelectorAll('label').forEach((label) => {
    label.textContent = formatStandardFilterLabel(label.textContent);
  });
  inlineBody.querySelectorAll('button').forEach((button) => {
    const label = button.textContent.replace(/\s+/g, ' ').trim();
    if (/^(reset|search|apply filter)$/i.test(label)) button.classList.add('standard-filter-legacy-action');
  });

  const close = () => sheet.classList.remove('is-open');
  const open = () => sheet.classList.add('is-open');
  const apply = () => {
    if (typeof window.applyFilters === 'function') window.applyFilters();
    close();
  };

  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) close();
  });
  panel.addEventListener('click', (event) => event.stopPropagation());
  closeButton.addEventListener('click', close);
  resetButton.addEventListener('click', () => {
    if (typeof window.resetFilters === 'function') {
      window.resetFilters();
      return;
    }
    initialValues.forEach(({ field, value, checked }) => {
      field.value = value;
      if (typeof checked === 'boolean') field.checked = checked;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  applyButton.addEventListener('click', apply);
  makeTrigger(open);
}

const STANDARD_FILTER_SUMMARY_SELECTOR = [
  '.filter-summary-bar',
  '.staff-filter-summary-bar',
  '.approval-filter-summary',
  '.claim-filter-bar',
  '.payroll-filter-trigger',
  '.project-history-filter-bar',
  '.timesheet-filter-summary',
  '.enterprise-toast-bar'
].join(',');

function getStandardFilterLabel(card) {
  const labelPattern = /^(current filter|payroll period|years*(?:&|and)s*tax relief)$/i;
  return Array.from(card.querySelectorAll('small, span, div'))
    .find((element) => labelPattern.test(element.textContent.replace(/s+/g, ' ').trim())) || null;
}

function findStandardFilterCard(label) {
  const knownCard = label.closest(STANDARD_FILTER_SUMMARY_SELECTOR);
  if (knownCard) return knownCard;

  let current = label.parentElement;
  for (let depth = 0; current && current !== document.body && depth < 6; depth += 1) {
    const directTrigger = current.querySelector(':scope > button, :scope > [role="button"]');
    if (directTrigger && directTrigger.querySelector('.fa-sliders')) return current;
    current = current.parentElement;
  }
  return null;
}

function findStandardFilterValue(card, label) {
  const explicitValue = card.querySelector([
    '.filter-bar-value',
    '.claim-filter-value',
    '.payroll-pending-summary-value',
    '.enterprise-toast-value',
    '[id*="filterSummary" i]',
    '[id*="currentFilterText" i]'
  ].join(','));
  if (explicitValue) return explicitValue;

  let current = label;
  while (current && current !== card) {
    const sibling = current.nextElementSibling;
    if (sibling && !sibling.matches('button, [role="button"]')) return sibling;
    current = current.parentElement;
  }

  if (card.matches('.payroll-filter-trigger')) return card.querySelector('strong');
  return null;
}

function normalizeStandardFilterValue(value) {
  if (!value) return;
  value.classList.add('standard-filter-summary-value');

  const valueRow = value.parentElement;
  if (valueRow) {
    Array.from(valueRow.children).forEach((element) => {
      if (element === value || element.matches('button, [role="button"]')) return;

      const isDirectIcon = element.matches('i, svg, img');
      const isCompactGlyph = element.tagName === 'SPAN' && !element.id && (() => {
        const glyph = element.textContent.replace(/\s+/g, '');
        const hasOnlyIconChild = element.children.length === 1
          && element.firstElementChild.matches('i, svg, img');
        return hasOnlyIconChild || (glyph.length > 0 && Array.from(glyph).length <= 3);
      })();

      if (isDirectIcon || isCompactGlyph) element.remove();
    });
  }

  let icon = value.querySelector(':scope > .standard-filter-summary-icon');
  if (icon) {
    icon.className = 'fa-solid fa-filter standard-filter-summary-icon';
    icon.setAttribute('aria-hidden', 'true');
    return;
  }

  value.querySelectorAll(':scope > i').forEach((legacyIcon) => legacyIcon.remove());
  const firstChild = value.firstElementChild;
  if (
    firstChild &&
    firstChild.tagName === 'SPAN' &&
    !firstChild.id &&
    value.children.length > 1 &&
    firstChild.textContent.replace(/s+/g, '').length <= 3
  ) {
    firstChild.remove();
  }

  icon = document.createElement('i');
  icon.className = 'fa-solid fa-filter standard-filter-summary-icon';
  icon.setAttribute('aria-hidden', 'true');
  value.prepend(icon);
}

function normalizeStandardFilterTrigger(card, value) {
  const triggerCandidates = Array.from(card.querySelectorAll('button, .claim-icon-button, .filter-trigger-btn, .standard-filter-summary-trigger'));
  let trigger = triggerCandidates.find((element) => !value?.contains(element) && element.querySelector('i'));
  let triggerIcon = trigger?.querySelector('i') || null;

  if (!triggerIcon) {
    const existingSliders = Array.from(card.querySelectorAll('i.fa-sliders'))
      .find((icon) => !value?.contains(icon));
    if (existingSliders) {
      triggerIcon = existingSliders;
      if (existingSliders.parentElement !== card) trigger = existingSliders.parentElement;
    }
  }

  if (!triggerIcon) {
    const directIcon = Array.from(card.children).find((element) => element.matches?.('i'));
    if (directIcon) triggerIcon = directIcon;
  }

  if (!triggerIcon) {
    if (card.matches('button')) {
      triggerIcon = document.createElement('i');
      card.appendChild(triggerIcon);
    } else {
      trigger = document.createElement('span');
      trigger.className = 'standard-filter-summary-trigger';
      trigger.setAttribute('aria-hidden', 'true');
      triggerIcon = document.createElement('i');
      trigger.appendChild(triggerIcon);
      card.appendChild(trigger);
    }
  }

  triggerIcon.className = 'fa-solid fa-sliders standard-filter-summary-trigger-glyph';
  triggerIcon.setAttribute('aria-hidden', 'true');
  if (trigger && trigger !== card) trigger.classList.add('standard-filter-summary-trigger');
}

function initStandardFilterSummaries(root = document) {
  const cards = new Set();
  const queryRoot = root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument || document;

  if (root.matches?.(STANDARD_FILTER_SUMMARY_SELECTOR)) cards.add(root);
  root.querySelectorAll?.(STANDARD_FILTER_SUMMARY_SELECTOR).forEach((card) => cards.add(card));

  queryRoot.querySelectorAll('small, span, div').forEach((label) => {
    if (!/^current filter$/i.test(label.textContent.replace(/s+/g, ' ').trim())) return;
    const card = findStandardFilterCard(label);
    if (card && (root === document || root.contains?.(card) || card.contains(root))) cards.add(card);
  });

  cards.forEach((card) => {
    const label = getStandardFilterLabel(card);
    if (!label && !card.matches('.payroll-filter-trigger')) return;
    const value = findStandardFilterValue(card, label || card.querySelector('small'));
    if (!value) return;

    card.classList.add('standard-filter-summary-card');
    card.dataset.standardFilterSummary = 'true';
    normalizeStandardFilterValue(value);
    normalizeStandardFilterTrigger(card, value);
  });
}

function observeStandardFilterSummaries() {
  if (document.documentElement.dataset.filterSummaryObserver === 'true') return;
  document.documentElement.dataset.filterSummaryObserver = 'true';
  let updateQueued = false;
  const observer = new MutationObserver(() => {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(() => {
      updateQueued = false;
      initStandardFilterSummaries();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

const PENDING_APPROVAL_ACTION_BUTTON_SELECTOR = '.pending-action-grid button[class*=action-btn-]';
const PENDING_APPROVAL_ICON_GLYPH_PATTERN = /[✓✔☑✕×↩⟳↻]/gu;

function normalizePendingApprovalActionButtons(root = document) {
  const buttons = new Set();

  if (root.matches?.(PENDING_APPROVAL_ACTION_BUTTON_SELECTOR)) buttons.add(root);
  root.querySelectorAll?.(PENDING_APPROVAL_ACTION_BUTTON_SELECTOR).forEach((button) => buttons.add(button));

  buttons.forEach((button) => {
    button.querySelectorAll('i, svg, img').forEach((icon) => icon.remove());

    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((textNode) => {
      textNode.nodeValue = textNode.nodeValue.replace(PENDING_APPROVAL_ICON_GLYPH_PATTERN, '').replace(/\s+/g, ' ');
    });

    button.classList.add('pending-action-text-only');
  });
}

function observePendingApprovalActionButtons() {
  if (document.documentElement.dataset.pendingActionObserver === 'true') return;
  document.documentElement.dataset.pendingActionObserver = 'true';

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) normalizePendingApprovalActionButtons(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExploreScrollListener);
  document.addEventListener('DOMContentLoaded', initStandardFilterSheets);
  document.addEventListener('DOMContentLoaded', initInlineFilterSheet);
  document.addEventListener('DOMContentLoaded', initStandardFilterSummaries);
  document.addEventListener('DOMContentLoaded', observeStandardFilterSummaries);
  document.addEventListener('DOMContentLoaded', normalizePendingApprovalActionButtons);
  document.addEventListener('DOMContentLoaded', observePendingApprovalActionButtons);
} else {
  initExploreScrollListener();
  initStandardFilterSheets();
  initInlineFilterSheet();
  initStandardFilterSummaries();
  observeStandardFilterSummaries();
  normalizePendingApprovalActionButtons();
  observePendingApprovalActionButtons();
}
window.addEventListener('load', initExploreScrollListener);

// Share desktop swipe support with standalone dashboard previews as well.
{
  const source = document.currentScript?.src;
  if (source && !document.querySelector('script[data-mouse-swipe], script[src$="/mouse-swipe.js"]')) {
    const script = document.createElement('script');
    script.src = new URL('mouse-swipe.js', source).href;
    script.dataset.mouseSwipe = '';
    script.async = false;
    document.head.append(script);
  }
}
