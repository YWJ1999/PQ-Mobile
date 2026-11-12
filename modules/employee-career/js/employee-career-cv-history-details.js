(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const sections = {
    personal: {title: 'Personal', icon: 'fa-user', fields: ['Name', 'Birth Date', 'Age', 'Personal Email', 'Marital Status', 'Marriage Date', 'Passport #', 'Passport Expiry', 'Driving License', 'Driving License Expiry']},
    qualification: {title: 'Qualification', icon: 'fa-graduation-cap', fields: ['Qualification', 'Description', 'Major', 'Institute', 'Other Institute Name', 'CGPA', 'Certificate #', 'Year From', 'Year To', 'Highest', 'Notes']},
    payroll: {title: 'Payroll', icon: 'fa-wallet', fields: ['EPF #', 'Socso #', 'Tax #', 'Tabung Haji #', 'ASB #', 'Spouse EPF #', 'Spouse Tax #', 'Bank', 'Account #', 'Handicap?', 'Spouse Handicap?', 'Spouse Working?']},
    contacts: {title: 'Contacts', icon: 'fa-address-book', fields: ['Company Email', 'Phone #', 'Mobile #', 'Address', 'Postal Code', 'City', 'State', 'Country', 'Emergency Contact #', 'Contact Name', 'Contact Address', 'Contact Postal Code', 'Contact City', 'Contact State', 'Contact Country', 'Remarks']},
    family: {title: 'Family', icon: 'fa-user-group', fields: []}
  };
  const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {
    fullname: 'Name', qualificationlevel: 'Qualification', majorfieldofstudy: 'Major',
    institutename: 'Institute', highestqualification: 'Highest', incometax: 'Tax #',
    bankname: 'Bank', bankaccount: 'Account #', bankaccountnumber: 'Account #', accountnumber: 'Account #',
    officephone: 'Phone #', phonenumber: 'Phone #', mobilephone: 'Mobile #', mobilenumber: 'Mobile #',
    passportnumber: 'Passport #', emergencycontactnumber: 'Emergency Contact #',
    emergencycontactname: 'Contact Name', emergencycontactremarks: 'Remarks',
    emergencycontactpostalcode: 'Contact Postal Code', emergencycontactcity: 'Contact City'
  };
  const familyLabels = new Set(['memberfullname', 'relation', 'status', 'rank', 'newnricbirthcert', 'taxstatus', 'allocation', 'beneficiary', 'deletefamilymember']);
  const deletion = change => String(change.fieldId || '').startsWith('family_delete_') || normalize(change.label) === 'deletefamilymember';
  function changeOwner(change) {
    const label = aliases[normalize(change.label)] || change.label;
    if (Object.hasOwn(sections, change.section)) return {section: change.section, label};
    const fieldId = String(change.fieldId || '');
    if (fieldId.startsWith('qual_')) return {section: 'qualification', label};
    if (/^(fam_|family_delete_)/.test(fieldId) || familyLabels.has(normalize(change.label))) return {section: 'family', label};
    if (/^addressline[123]$/.test(normalize(change.label))) return {section: 'contacts', label};
    const owner = Object.keys(sections).find(key => sections[key].fields.some(field => normalize(field) === normalize(label)));
    return {section: owner || 'personal', label};
  }
  const display = value => value === '' || value == null ? '\u2014' : escape(value);
  const employee = row => `<span class="cv-history-detail-employee"><span class="history-employee-name">${display(row.name || row.employeeName)}</span>${row.empNo ? `<span class="history-employee-id">#${escape(String(row.empNo).replace(/^#/, ''))}</span>` : ''}</span>`;
  const detailRow = (label, content, attributes = '', rowClass = '') => `<div class="cv-history-detail-row${rowClass ? ' ' + rowClass : ''}"><dt>${escape(label)}</dt><dd${attributes}>${content}</dd></div>`;

  function fieldRows(row, section, snapshot = row.profile?.[section] || {}, changes = row.changes || [], onlyChanges = false, includeField = () => true) {
    const values = new Map(onlyChanges ? [] : sections[section].fields.map(label => [label, snapshot[label]]));
    for (const change of changes) {
      if (!change || !change.label || deletion(change)) continue;
      const owner = changeOwner(change);
      if (owner.section !== section) continue;
      const label = sections[section].fields.find(field => normalize(field) === normalize(owner.label)) || owner.label;
      values.set(label, {value: change.newVal, previous: change.oldVal, changed: true});
    }
    return [...values].filter(([label]) => normalize(label) !== 'keylevel' && includeField(label)).map(([label, field]) => {
      const structured = field !== null && typeof field === 'object';
      const value = structured ? field.value : field;
      const changed = structured && field.changed;
      const displayLabel = section === 'contacts' && /^Contact (Postal Code|City|State|Country)$/.test(label) ? label.slice('Contact '.length) : label;
      return detailRow(displayLabel, `<span class="cv-history-field-value">${display(value)}</span>${structured && Object.hasOwn(field, 'previous') ? `<span class="cv-history-previous-value">Previous: ${display(field.previous)}</span>` : ''}`, ` data-cv-field="${escape(label)}"${changed ? ' class="cv-history-field-changed"' : ''}`);
    }).join('');
  }

  function contactDetails(row) {
    const emergencyFields = new Set(sections.contacts.fields.slice(8).map(normalize));
    const isEmergency = label => emergencyFields.has(normalize(label)) || /^(emergency|contact)/.test(normalize(label));
    const snapshot = row.profile?.contacts || {};
    const changes = row.changes || [];
    return [
      ['correspondence', 'Correspondence Contact', label => !isEmergency(label)],
      ['emergency', 'Emergency Contact', isEmergency]
    ].map(([key, title, includeField]) => {
      const heading = `cv-contact-${key}-heading`;
      const fields = fieldRows(row, 'contacts', snapshot, changes, false, includeField);
      return `<section class="cv-history-contact-group" data-cv-contact-group="${key}" aria-labelledby="${heading}"><h3 id="${heading}" class="cv-history-panel-title">${title}</h3><dl class="cv-history-fields">${fields}</dl></section>`;
    }).join('');
  }

  const qualificationFieldValue = field => field !== null && typeof field === 'object' && Object.hasOwn(field, 'value') ? field.value : field;

  function qualificationSummary(record, index, changes) {
    const fields = record?.fields || record || {};
    const changedLabels = new Set();
    Object.entries(fields).forEach(([label, field]) => {
      if (field !== null && typeof field === 'object' && field.changed) changedLabels.add(normalize(label));
    });
    changes.forEach(change => changedLabels.add(normalize(changeOwner(change).label)));
    const qualification = qualificationFieldValue(fields.Qualification) || `Qualification ${index + 1}`;
    const institute = qualificationFieldValue(fields.Institute);
    const yearFrom = qualificationFieldValue(fields['Year From']);
    const yearTo = qualificationFieldValue(fields['Year To']);
    const years = yearFrom && yearTo ? `${yearFrom}-${yearTo}` : yearFrom || yearTo || '';
    const highest = ['yes', 'true', '1'].includes(String(qualificationFieldValue(fields.Highest) ?? '').toLowerCase());
    return {qualification, institute, years, highest, changeCount: changedLabels.size};
  }

  function qualificationCardMeta(summary, number = null) {
    const meta = [summary.institute, summary.years].filter(Boolean)
      .map(value => `<span>${escape(value)}</span>`).join('');
    const details = meta ? `<span class=cv-history-qualification-meta>${meta}</span>` : '';
    const heading = number == null ? '' : `<strong class="cv-history-qualification-number">Qualification ${number}</strong>`;
    return `<span class=cv-history-qualification-summary>${heading}<strong class=cv-history-qualification-name>${escape(summary.qualification)}</strong>${details}</span>`;
  }

  function qualificationCardEnd(summary) {
    const highest = summary.highest ? '<span class=cv-history-qualification-highest>Highest</span>' : '';
    const word = summary.changeCount === 1 ? 'change' : 'changes';
    const count = `${summary.changeCount} ${word}`;
    const icon = `<i class='fa-solid fa-chevron-down cv-history-qualification-chevron' aria-hidden='true'></i>`;
    return `<span class='cv-history-qualification-card-end'>${highest}<span class='cv-history-qualification-count'>${count}</span>${icon}</span>`;
  }

  function qualificationCard(row, record, index, changes, expanded, numbered = false) {
    const summary = qualificationSummary(record, index, changes);
    const toggleId = `cv-qualification-card-toggle-${index + 1}`;
    const panelId = `cv-qualification-card-panel-${index + 1}`;
    const key = escape(record?.id ?? `qualification-${index + 1}`);
    const fields = fieldRows(row, 'qualification', record?.fields || record || {}, changes);
    const summaryMarkup = qualificationCardMeta(summary, numbered ? index + 1 : null);
    const endMarkup = qualificationCardEnd(summary);
    const toggle = `<button type='button' class='cv-history-qualification-card-toggle' id='${toggleId}' aria-expanded='${expanded}' aria-controls='${panelId}' data-qualification-card-toggle='${index}'>${summaryMarkup}${endMarkup}</button>`;
    const panel = `<div class='cv-history-qualification-card-panel' id='${panelId}' role='region' aria-labelledby='${toggleId}' data-qualification-card-panel='${index}'${expanded ? '' : ' hidden'}><dl class='cv-history-fields'>${fields}</dl></div>`;
    const cardClass = `cv-history-qualification-card${expanded ? ' is-expanded' : ''}`;
    return `<article class='${cardClass}' data-qualification-id='${key}'>${toggle}${panel}</article>`;
  }

  function qualificationCardList(row, records, assigned, numbered = false) {
    const summaries = records.map((record, index) => qualificationSummary(record, index, assigned[index]));
    const changedIndex = summaries.findIndex(summary => summary.changeCount > 0);
    const expandedIndex = changedIndex >= 0 ? changedIndex : 0;
    return records.map((record, index) => (
      qualificationCard(row, record, index, assigned[index], index === expandedIndex, numbered)
    )).join('');
  }

  function qualificationRecords(row, layout = 'tabs') {
    const snapshot = row.profile?.qualifications ?? row.profile?.qualification;
    const records = Array.isArray(snapshot) ? snapshot.filter(record => record && typeof record === 'object') : snapshot && typeof snapshot === 'object' ? [snapshot] : [];
    const assigned = records.map(() => []);
    const unscoped = [];
    for (const change of row.changes || []) {
      if (!change?.label || deletion(change) || changeOwner(change).section !== 'qualification') continue;
      const id = change.qualificationId ?? change.recordId;
      const fieldIndex = /^qual_(\d+)_/.exec(String(change.fieldId || ''));
      const index = Number.isInteger(change.qualificationIndex) ? change.qualificationIndex : fieldIndex ? Number(fieldIndex[1]) : null;
      let target = -1;
      if (id != null) {
        target = records.findIndex(record => record?.id != null && String(record.id) === String(id));
        if (target === -1) { target = records.length; records.push({id}); assigned.push([]); }
      } else if (index != null && index >= 0 && index < records.length) target = index;
      else if (index == null && records.length === 1) target = 0;
      if (target >= 0) assigned[target].push(change);
      else unscoped.push(change);
    }
    const multiple = records.length > 1;
    const recordKey = (record, index) => String(record?.id ?? `qualification-${index + 1}`);
    const tabs = multiple ? `<div class="cv-history-qualification-tabs" role="tablist" aria-label="Qualification records">${records.map((record, index) => {
      const key = recordKey(record, index);
      return `<button type="button" class="cv-history-qualification-tab${index === 0 ? ' active' : ''}" id="cv-qualification-tab-${index + 1}" role="tab" aria-selected="${index === 0}" aria-controls="cv-qualification-panel-${index + 1}" tabindex="${index === 0 ? '0' : '-1'}" data-qualification-tab="${escape(key)}">Qualification ${index + 1}</button>`;
    }).join('')}</div>` : '';
    const cards = records.map((record, index) => {
      const key = recordKey(record, index);
      const panelAttributes = multiple
        ? ` id="cv-qualification-panel-${index + 1}" role="tabpanel" aria-labelledby="cv-qualification-tab-${index + 1}" data-qualification-panel="${escape(key)}"${index === 0 ? '' : ' hidden'}`
        : '';
      return `<section class="cv-history-qualification-record${multiple ? ' cv-history-qualification-panel' : ''}" data-qualification-id="${escape(key)}"${panelAttributes}><dl class="cv-history-fields">${fieldRows(row, 'qualification', record?.fields || record || {}, assigned[index])}</dl></section>`;
    }).join('');
    const pending = unscoped.length ? `<section class="cv-history-qualification-unscoped"><h4>Requested Qualification Changes</h4><dl class="cv-history-fields">${unscoped.map(change => fieldRows(row, 'qualification', {}, [change], true)).join('')}</dl></section>` : '';
    if (layout === 'cards' || layout === 'numbered-cards') {
      const count = `<span class="cv-history-qualification-total">${window.PeopleHcmRecordSummary.formatCount(records.length)}</span>`;
      const heading = `<h3 class="cv-history-panel-title cv-history-qualification-heading"><span>Qualification details</span>${count}</h3>`;
      const cardList = qualificationCardList(row, records, assigned, layout === 'numbered-cards');
      const content = cardList ? `<div class="cv-history-qualification-list">${cardList}</div>` : (!pending ? '<p class="cv-history-empty-members">No qualification records</p>' : '');
      return `${heading}${content}${pending}`;
    }
    return `<h3 class="cv-history-panel-title">Qualification details</h3>${tabs}${cards || (!pending ? '<p class="cv-history-empty-members">No qualification records</p>' : '')}${pending}`;
  }

  function familyMembers(row) {
    const family = row.profile?.family || {};
    const removed = (row.changes || []).filter(change => change && deletion(change)).map(change => ({name: change.oldVal, relation: '', changed: true}));
    const deleted = [...(family.deleted || []), ...removed];
    const deletedNames = new Set(deleted.map(member => member.name));
    return { deleted, existing: (family.existing || []).filter(member => !deletedNames.has(member.name)) };
  }

  function familyTable(title, members, emptyText, group) {
    const rows = members.map((member, index) => `<tr data-cv-family-member="${group}" data-cv-family-index="${index}"${member.changed ? ' class="cv-history-field-changed"' : ''}><td><button type="button" class="cv-history-family-member-name" aria-haspopup="dialog" aria-label="View details for ${escape(member.name || 'family member')}"><span class="cv-history-field-value">${display(member.name)}</span></button></td><td><span class="cv-history-field-value">${display(member.relation)}</span></td></tr>`).join('');
    return `<section class="cv-history-family-section"><h3>${title}</h3><table class="history-detail-table cv-history-family-table"><thead><tr><th scope="col">Name</th><th scope="col">Relation</th></tr></thead><tbody>${rows || `<tr><td colspan="2" class="cv-history-empty-members">${emptyText}</td></tr>`}</tbody></table></section>`;
  }

  function openFamilyMember(row, trigger) {
    const group = trigger.dataset.cvFamilyMember;
    const index = Number(trigger.dataset.cvFamilyIndex);
    if (!['existing', 'deleted'].includes(group) || !Number.isInteger(index) || index < 0) return;
    const member = familyMembers(row)[group][index];
    if (member) window.EmployeeCareerCVFamilyDetails.open(member, trigger.querySelector('button'));
  }

  function render(row, statusMarkup, submittedDate, options = {}) {
    const tabs = Object.entries(sections).map(([key, section]) => `<button type="button" class="cv-history-detail-tab${key === 'personal' ? ' active' : ''}" id="cv-tab-${key}" role="tab" aria-selected="${key === 'personal'}" aria-controls="cv-panel-${key}" tabindex="${key === 'personal' ? '0' : '-1'}" data-cv-tab="${key}"><i class="fa-solid ${section.icon}" aria-hidden="true"></i><span>${section.title}</span></button>`).join('');
    const metadata = `<section class="cv-history-request-summary"><h3>Request overview</h3><dl class="cv-history-metadata cv-history-fields cv-history-overview">${[
      ['Employee', employee(row)], ['Document Status', statusMarkup],
      ['Submitted Date', submittedDate], ['Document Reference', display(row.reference || row.id)],
      ['Approver Remarks', display(row.approverRemarks)]
    ].map(([label, value]) => detailRow(label, value, '', `cv-history-overview-${normalize(label)}`)).join('')}</dl></section>`;
    const panels = Object.keys(sections).map(key => {
      let content;
      if (key === 'family') {
        const { deleted, existing } = familyMembers(row);
        const requested = fieldRows(row, 'family');
        content = familyTable('Deleted Family Member', deleted, 'No deleted family members', 'deleted') + familyTable('Existing Family Member', existing, 'No family members recorded', 'existing') + (requested ? `<section class="cv-history-family-section"><h3>Requested Family Changes</h3><dl class="cv-history-fields">${requested}</dl></section>` : '');
      } else if (key === 'qualification') content = qualificationRecords(row, options.qualificationLayout);
      else if (key === 'contacts') content = contactDetails(row);
      else content = (key === 'personal' ? metadata : '') + `<h3 class="cv-history-panel-title">${sections[key].title} details</h3><dl class="cv-history-fields">${fieldRows(row, key)}</dl>`;
      return `<section class="cv-history-detail-panel" id="cv-panel-${key}" role="tabpanel" aria-labelledby="cv-tab-${key}"${key === 'personal' ? '' : ' hidden'}>${content}</section>`;
    }).join('');
    return `<div class="cv-history-navigation"><div class="cv-history-detail-tabs" role="tablist" aria-label="CV details">${tabs}</div></div><div class="cv-history-detail-scroll">${panels}</div>`;
  }

  function selectTab(body, key, focus = false) {
    if (!Object.hasOwn(sections, key)) return;
    body.querySelectorAll('[data-cv-tab]').forEach(tab => {
      const active = tab.dataset.cvTab === key;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      body.querySelector('#cv-panel-' + tab.dataset.cvTab).hidden = !active;
      if (active) {
        if (focus) tab.focus({preventScroll: true});
        tab.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
      }
    });
    body.scrollTop = 0;
    const scroller = body.querySelector('.cv-history-detail-scroll');
    if (scroller) scroller.scrollTop = 0;
  }

  function selectQualificationTab(body, key, focus = false) {
    const tabs = [...body.querySelectorAll('[data-qualification-tab]')];
    const activeTab = tabs.find(tab => tab.dataset.qualificationTab === String(key));
    if (!activeTab) return;
    tabs.forEach(tab => {
      const active = tab === activeTab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    body.querySelectorAll('[data-qualification-panel]').forEach(panel => {
      panel.hidden = panel.dataset.qualificationPanel !== activeTab.dataset.qualificationTab;
    });
    activeTab.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
    if (focus) activeTab.focus({preventScroll: true});
  }

  function qualificationKeydown(event, body) {
    const tab = event.target.closest('[data-qualification-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[data-qualification-tab]')];
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    selectQualificationTab(body, tabs[next].dataset.qualificationTab, true);
  }

  function toggleQualificationCard(body, key, focus = false) {
    const toggles = [...body.querySelectorAll('[data-qualification-card-toggle]')];
    const target = toggles.find(toggle => toggle.dataset.qualificationCardToggle === String(key));
    if (!target) return;
    const expandTarget = target.getAttribute('aria-expanded') !== 'true';
    toggles.forEach(toggle => {
      const expanded = expandTarget && toggle === target;
      toggle.setAttribute('aria-expanded', String(expanded));
      const panel = body.querySelector(`#${toggle.getAttribute('aria-controls')}`);
      if (panel) panel.hidden = !expanded;
      toggle.closest('.cv-history-qualification-card')?.classList.toggle('is-expanded', expanded);
    });
    if (focus) target.focus({preventScroll: true});
  }

  function keydown(event, body) {
    const tab = event.target.closest('[data-cv-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const keys = Object.keys(sections);
    const index = keys.indexOf(tab.dataset.cvTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1
      : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + keys.length) % keys.length;
    event.preventDefault();
    selectTab(body, keys[next], true);
  }
  window.EmployeeCareerCVHistoryDetails = {render, selectTab, keydown, selectQualificationTab, qualificationKeydown, toggleQualificationCard, openFamilyMember};
})();
