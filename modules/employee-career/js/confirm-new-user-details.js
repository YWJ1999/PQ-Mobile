const requestedRecord = new URLSearchParams(location.search).get('record');
const profiles = window.confirmNewUserProfiles || [];
const profile = /^\d+$/.test(requestedRecord ?? '') ? profiles[Number(requestedRecord)] : null;
const listUrl = `confirm-new-user.html?theme=${document.documentElement.dataset.theme}`;

function displayBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function populateProfile() {
  const name = profile.name || 'New User';
  document.getElementById('newUserProfileAvatar').textContent = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
  document.getElementById('newUserProfileName').textContent = name;
  const id = profile.empNo || profile.identity;
  document.getElementById('newUserProfileId').textContent = id ? '#' + String(id).replace(/^#+/, '') : '—';

  const fields = {
    ...profile,
    birthDate: displayBirthDate(profile.birthDate),
    address: [profile.address1, profile.address2, profile.address3].filter(Boolean).join('\n'),
    emergencyAddress: [profile.emergencyAddress1, profile.emergencyAddress2, profile.emergencyAddress3].filter(Boolean).join('\n')
  };
  document.querySelectorAll('#employeePanel [data-field]').forEach(item => {
    const value = fields[item.dataset.field];
    item.textContent = value == null || value === '' ? '—' : value;
  });

  for (const control of document.getElementById('newUserDetailsForm').elements) {
    if (!control.name) continue;
    const value = String(profile[control.name] ?? '');
    if (control instanceof HTMLSelectElement && value && !Array.from(control.options).some(option => option.value === value)) {
      control.add(new Option(value, value));
    }
    control.value = value;
  }
  renderAttachments(profile.attachments);
}

function attachmentUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, document.baseURI);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
    if (location.protocol === 'file:' && url.protocol === 'file:' && !/^[a-z][\w+.-]*:|^[\\/]/i.test(value)) return url.href;
  } catch {
    // Keep the filename visible when the record has no usable document URL.
  }
  return null;
}

function renderAttachments(attachments) {
  const list = document.getElementById('newUserAttachmentList');
  const files = (Array.isArray(attachments) ? attachments : []).filter(file => typeof file === 'string' ? file.trim() : file?.name);
  document.getElementById('newUserAttachmentCount').textContent = files.length;
  if (!files.length) {
    const empty = document.createElement('li');
    empty.className = 'new-user-attachment-empty';
    empty.textContent = 'No attachments';
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...files.map(file => {
    const name = typeof file === 'string' ? file : file.name;
    const url = attachmentUrl(file.url);
    const item = document.createElement('li');
    const row = document.createElement(url ? 'a' : 'div');
    row.className = 'new-user-file';
    if (url) {
      row.href = url;
      row.target = '_blank';
      row.rel = 'noopener';
    }
    const icon = document.createElement('i');
    icon.className = 'fa-regular fa-file-lines';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = name;
    row.append(icon, label);
    item.append(row);
    return item;
  }));
}

function initTabs() {
  const tabs = Array.from(document.querySelectorAll('.new-user-tabs [role="tab"]'));
  function selectTab(selected) {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      switch (event.key) {
        case 'ArrowRight': next = tabs[(index + 1) % tabs.length]; break;
        case 'ArrowLeft': next = tabs[(index + tabs.length - 1) % tabs.length]; break;
        case 'Home': next = tabs[0]; break;
        case 'End': next = tabs[tabs.length - 1]; break;
        default: return;
      }
      event.preventDefault();
      selectTab(next);
      next.focus();
    });
  });
}

if (!profile) {
  location.replace(listUrl);
} else {
  document.getElementById('newUserBackLink').href = listUrl;
  document.getElementById('newUserCancel').href = listUrl;
  populateProfile();
  initTabs();
}
