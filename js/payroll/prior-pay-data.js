/* Prior Pay Data preview: records and uploaded files are saved locally in IndexedDB.
   Source amounts and labels follow the supplied legacy screens, not a tax calculation. */
(() => {
  'use strict';
  const earningFields = [
    ['taxYear', 'Tax Year', null, 'year'],
    ['normalEarning', 'Normal Earning', 100], ['additionalEarning', 'Additional Earning', 10],
    ['epf', 'EPF', 0], ['pcb', 'PCB', 0], ['socso', 'SOCSO', 0], ['zakat', 'Zakat', 0]
  ];
  const taxYears = Array.from({ length: 57 }, (_, index) => String(2026 - index));
  const reliefFields = [
    ['medicalParents', 'Medical Expenses of Own Parents', 10],
    ['supportingEquipment', 'Basic Supporting Equipment', 10],
    ['higherEducation', 'Higher Education Fees', 10],
    ['seriousDiseases', 'Medical Expenses on Serious Diseases', 10],
    ['medicalExamination', 'Complete Medical Examination', 10],
    ['books', 'Purchase of Books/Magazines/Journals/Similar Publications', 10],
    ['personalComputer', 'Purchase of Personal Computer', 10],
    ['sspn', 'Net Deposit in Scheme Simpanan Pendidikan Nasional', 10],
    ['sportsEquipment', 'Purchase Sports Equipment', 10],
    ['alimony', 'Payment of Alimony to former Wife', 10],
    ['lifeInsurance', 'Life Insurance', 10],
    ['educationMedicalInsurance', 'Education and Medical Insurance', 10],
    ['deferredAnnuity', 'Deferred Annuity Life Style', 10],
    ['housingLoanInterest', 'Housing Loan Interest', 10],
    ['benefitInKind', 'Benefit in Kind', 1234],
    ['vola', 'VOLA', 1254],
    ['parentalCare', 'Parental Care', 10],
    ['socsoClaims', 'Socso Claims', 13],
    ['lifestyleSports', 'Life Style - Sports', 18],
    ['childcare', 'Childcare Fees', 19],
    ['breastfeeding', 'Breastfeeding Equipment', 110],
    ['tourism', 'Tourism', 10],
    ['gifts', 'Gifts', 10]
  ];
  const tabs = ['general', 'earnings', 'reliefs'];
  const generalFields = ['dateFrom', 'dateTo', 'company', 'position', 'reasonLeaving', 'lastPay', 'yearExperience', 'industry', 'payRate', 'jobExperience', 'address1', 'address2', 'address3', 'notes'];
  const $ = id => document.getElementById(id);
  const clone = value => structuredClone(value);
  const text = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const dateText = value => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : 'Not provided';
  const periodText = record => `${dateText(record.general.dateFrom)} – ${dateText(record.general.dateTo)}`;
  let db, records = [], activeRecord = null, activeTab = 'general', busy = false;
  let stagedAttachments = {}, dirty = new Set(), objectUrls = [], listScroll = 0, recordOpener = null;
  let drafts = new Map(), draftSaved = false, activeDraftRevision = null;
  let dialogCallback = null, dialogOpener = null;

  function seedRecords() {
    const make = (id, company, dateFrom, dateTo, position, industry, updated = '') => ({
      id, empNo: 'EBB12', updated, verified: '',
      general: { ...Object.fromEntries(generalFields.map(key => [key, ''])), company, dateFrom, dateTo, position, industry },
      earnings: Object.fromEntries(earningFields.map(([key]) => [key, null])),
      reliefs: Object.fromEntries(reliefFields.map(([key]) => [key, null])),
      attachments: { earnings: [], reliefs: [] }
    });
    const items = [
      make(1, 'PETRONAS BHD', '1984-07-30', '2005-06-29', 'MANAGER', 'HOSPITALITY'),
      make(2, 'EASTMAN CHEMICALS SDN BHD', '2005-07-01', '2006-07-31', 'HR DEVELOPMENT MANAGER', 'OIL AND GAS'),
      make(3, 'test', '1976-08-02', '1976-09-30', 'Test', ''),
      make(4, 'PQ', '1980-01-01', '1980-12-23', 'test', 'HOSPITALITY', '2025-10-06')
    ];
    Object.assign(items[0].general, { reasonLeaving: 'BETTER CAREER', lastPay: 12000, yearExperience: 0, payRate: 'Monthly', jobExperience: 'MARKETING', address1: 'test12', address2: 'test1', address3: 'test1', notes: 'test1' });
    items[0].earnings = Object.fromEntries(earningFields.map(([key, , value]) => [key, value]));
    items[0].reliefs = Object.fromEntries(reliefFields.map(([key, , value]) => [key, value]));
    // The screenshots supply names only. Never fabricate file contents or download links.
    items[0].attachments.earnings = [{ id: 'source-ytd', name: 'screenshot_20251231-152106.jpg', file: null }];
    items[0].attachments.reliefs = [{ id: 'source-tax', name: 'b82b6020d29a4b848b645eff66ed24cb.jpg', file: null }];
    return items;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('peoplehcm-prior-pay-preview-v1', 2);
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      const timer = setTimeout(() => fail(new Error('Local storage is taking too long to respond. Close other Prior Pay Data tabs, then try again.')), 8000);
      request.onupgradeneeded = () => {
        if (settled) { request.transaction.abort(); return; }
        if (!request.result.objectStoreNames.contains('records')) request.result.createObjectStore('records', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled = true;
        clearTimeout(timer);
        request.result.onversionchange = () => {
          request.result.close();
          if (db === request.result) db = null;
        };
        resolve(request.result);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error('Another Prior Pay Data tab is using the previous version. Close other Prior Pay Data tabs, then try again.'));
    });
  }
  function readRecords(store = 'records') {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store);
      const request = tx.objectStore(store).getAll();
      const timer = setTimeout(() => {
        tx.abort();
        reject(new Error('Local storage is taking too long to respond. Please try again.'));
      }, 8000);
      tx.oncomplete = () => { clearTimeout(timer); resolve(request.result); };
      tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Unable to read local records. Please try again.')); };
    });
  }
  function writeRecords(items) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      items.forEach(item => tx.objectStore('records').put(item));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Save cancelled'));
    });
  }
  function writeChanges(id, changes, attachments, updatedDate, consumedDraftRevision) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['records', 'drafts'], 'readwrite');
      const store = tx.objectStore('records');
      const request = store.get(id);
      let saved, remainingDraft;
      request.onsuccess = () => {
        saved = request.result;
        if (!saved) { tx.abort(); return; }
        Object.entries(changes).forEach(([section, values]) => {
          saved[section] = values;
          if (section !== 'general') saved.attachments[section] = attachments[section];
        });
        saved.updated = updatedDate;
        store.put(saved);
        const draftStore = tx.objectStore('drafts');
        const draftRequest = draftStore.get(id);
        draftRequest.onsuccess = () => {
          remainingDraft = draftRequest.result;
          if (remainingDraft && consumedDraftRevision && remainingDraft.revision === consumedDraftRevision) {
            draftStore.delete(id);
            remainingDraft = null;
          }
        };
      };
      tx.oncomplete = () => resolve({ saved, remainingDraft });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Record no longer available'));
    });
  }

  function renderList() {
    $('priorRecords').innerHTML = records.map(record => `
      <article class="history-card-item claim-summary-card prior-record" data-record="${record.id}">
        <button type="button" class="prior-record-open" aria-label="Open ${text(record.general.company || 'employment record')}">
          <div class="claim-summary-card-head"><div class="prior-record-head-copy"><h3 class="claim-summary-card-title">${text(record.general.company || 'Company not provided')}</h3><div class="claim-summary-card-subtitle">${text(periodText(record))}</div></div><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></div>
          <div class="claim-summary-card-body"><dl class="claim-summary-stat-grid prior-record-dl">
            <div class="claim-summary-stat"><dt class="claim-summary-stat-label">Position</dt><dd class="claim-summary-stat-value">${text(record.general.position || 'Not provided')}</dd></div>
            <div class="claim-summary-stat"><dt class="claim-summary-stat-label">Industry</dt><dd class="claim-summary-stat-value">${text(record.general.industry || 'Not provided')}</dd></div>
            <div class="claim-summary-stat prior-audit"><dt class="claim-summary-stat-label">Last Update</dt><dd class="claim-summary-stat-value">${record.updated ? text(dateText(record.updated)) : '—'}</dd></div>
            <div class="claim-summary-stat prior-audit"><dt class="claim-summary-stat-label">Last Verify</dt><dd class="claim-summary-stat-value">${record.verified ? text(dateText(record.verified)) : '—'}</dd></div>
          </dl></div>
        </button>
        <div class="prior-record-footer"><button type="button" class="prior-ytd" aria-label="YTD Earning Detail for ${text(record.general.company)}">YTD</button></div>
      </article>`).join('');
  }
  function createAmountFields(container, fields) {
    $(container).innerHTML = fields.map(([key, label, , fieldType]) => {
      const year = fieldType === 'year';
      if (year) {
        const options = taxYears.map(value => `<option value="${value}">${value}</option>`).join('');
        return `<div class="prior-field"><label for="prior-${key}">${text(label)}</label><select id="prior-${key}" name="${key}"><option value="">Select Tax Year</option>${options}</select></div>`;
      }
      return `<div class="prior-field"><label for="prior-${key}">${text(label)}</label><input id="prior-${key}" name="${key}" type="number" inputmode="decimal" min="0" step="0.01"></div>`;
    }).join('');
  }
  function setFormValues(section, data) {
    Object.entries(data).forEach(([name, value]) => {
      const field = $('panel-' + section).elements.namedItem(name);
      if (field) {
        field.value = value ?? '';
        field.setCustomValidity('');
      }
    });
  }
  function sectionValues(section) {
    const fields = section === 'general' ? generalFields : (section === 'earnings' ? earningFields : reliefFields).map(([key]) => key);
    return Object.fromEntries(fields.map(key => {
      const input = $('panel-' + section).elements.namedItem(key);
      const value = input.value.trim();
      return [key, input.type === 'number' ? (value === '' ? null : Number(value)) : value];
    }));
  }
  function openRecord(id, tab, opener) {
    const record = records.find(item => item.id === id);
    if (!record) return;
    activeRecord = clone(record);
    stagedAttachments = clone(record.attachments);
    dirty.clear();
    const draft = drafts.get(id);
    draftSaved = !!draft;
    activeDraftRevision = draft?.revision || null;
    recordOpener = opener;
    listScroll = $('priorMain').scrollTop;
    $('prior-general-empNo').value = record.empNo ? String(record.empNo).replace(/^#+/, '') : 'Not provided';
    tabs.forEach(section => {
      setFormValues(section, draft?.changes[section] || record[section]);
      if (draft?.changes[section]) {
        dirty.add(section);
        if (section !== 'general') stagedAttachments[section] = clone(draft.attachments[section]);
      }
    });
    $('priorSerialNo').value = String(record.id);
    $('priorDateTo').setCustomValidity('');
    $('priorPageTitle').textContent = 'Prior Pay Data Details';
    $('priorInfo').hidden = true;
    $('priorBack').setAttribute('aria-label', 'Back to prior pay records');
    $('priorListView').hidden = true;
    $('priorDetailView').hidden = false;
    $('priorDetailHeading').hidden = false;
    $('priorSaveBar').hidden = false;
    $('priorBottomNav').hidden = false;
    document.querySelector('.prior-phone').classList.add('is-detail');
    renderAttachments();
    activeTab = tab;
    switchTab(tab);
    $('tab-' + tab).focus({ preventScroll: true });
    updateSaveStatus();
  }
  function switchTab(tab) {
    if (busy) return;
    activeTab = tab;
    tabs.forEach(section => {
      $('panel-' + section).hidden = section !== tab;
      $('tab-' + section).setAttribute('aria-selected', String(section === tab));
      $('tab-' + section).tabIndex = section === tab ? 0 : -1;
      $('tab-' + section).classList.toggle('completed', tabs.indexOf(section) < tabs.indexOf(tab));
    });
    const index = tabs.indexOf(tab);
    $('priorCancel').hidden = index !== 0;
    $('priorDraft').hidden = index !== 0;
    $('priorPrevious').hidden = index === 0;
    $('priorNext').hidden = index === tabs.length - 1;
    $('priorUpdate').hidden = index !== tabs.length - 1;
    $('priorStepProgress').style.width = index === 0 ? '0px' : `calc(${index * 33.3333}% - ${index * 7}px)`;
    $('tab-' + tab).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    $('priorMain').scrollTop = 0;
    updateSaveStatus();
  }
  function updateSaveStatus() {
    const status = $('priorSaveStatus');
    const message = draftSaved ? 'Draft saved on this device' : dirty.size ? 'Unsaved changes' : '';
    status.textContent = message;
    status.hidden = !message;
  }
  function markDirty(section) {
    dirty.add(section);
    draftSaved = false;
    updateSaveStatus();
  }

  function renderAttachments() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
    for (const section of ['earnings', 'reliefs']) {
      const container = $(section + 'Attachments');
      container.replaceChildren();
      if (!stagedAttachments[section].length) {
        const empty = document.createElement('p');
        empty.className = 'prior-empty';
        empty.textContent = 'No attachments';
        container.appendChild(empty);
      }
      stagedAttachments[section].forEach(attachment => {
        const row = document.createElement('div');
        row.className = 'prior-file';
        row.innerHTML = '<span class="prior-file-icon"><i class="fa-solid fa-paperclip" aria-hidden="true"></i></span>';
        const label = document.createElement(attachment.file ? 'a' : 'span');
        label.className = 'prior-file-name';
        label.textContent = attachment.name;
        label.title = attachment.name;
        if (attachment.file) {
          const url = URL.createObjectURL(attachment.file);
          objectUrls.push(url);
          label.href = url;
          label.download = attachment.name;
        }
        row.appendChild(label);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.remove = attachment.id;
        remove.setAttribute('aria-label', 'Remove ' + attachment.name);
        remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        remove.addEventListener('click', () => {
          if (busy) return;
          stagedAttachments[section] = stagedAttachments[section].filter(file => file.id !== attachment.id);
          markDirty(section);
          renderAttachments();
        });
        row.appendChild(remove);
        container.appendChild(row);
      });
    }
  }
  function addAttachments(section, input) {
    if (busy || !activeRecord) return;
    const files = Array.from(input.files || []);
    let added = false;
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        window.showToast('Please choose files smaller than 10 MB.');
        continue;
      }
      stagedAttachments[section].push({ id: crypto.randomUUID(), name: file.name, file });
      added = true;
    }
    input.value = '';
    if (added) {
      markDirty(section);
      renderAttachments();
    }
  }
  function setBusy(value) {
    busy = value;
    document.querySelectorAll('#priorDetailView input, #priorDetailView select, #priorDetailView textarea, #priorDetailView button, #priorUpdate, #priorBack, .prior-tabs button').forEach(el => { el.disabled = value; });
    $('priorUpdate').innerHTML = value
      ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Saving</span>'
      : '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i><span>Save pay data</span>';
  }
  function collectChanges() {
    return Object.fromEntries([...dirty].map(section => [section, sectionValues(section)]));
  }
  async function saveDraft() {
    if (busy || !activeRecord) return;
    const draft = { id: activeRecord.id, revision: crypto.randomUUID(), changes: collectChanges(), attachments: clone(stagedAttachments) };
    setBusy(true);
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        tx.objectStore('drafts').put(draft);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      drafts.set(draft.id, draft);
      activeDraftRevision = draft.revision;
      draftSaved = true;
      updateSaveStatus();
      window.showToast('Prior Pay Data draft saved');
    } catch (error) {
      $('priorSaveStatus').textContent = 'Could not save draft. Your changes are still here.';
    } finally { setBusy(false); }
  }
  async function saveRecord() {
    if (busy || !activeRecord) return;
    for (const section of tabs) {
      const form = $('panel-' + section);
      if (section === 'general') {
        form.querySelectorAll('input[required]').forEach(input => {
          input.setCustomValidity(input.value.trim() ? '' : 'Please enter a value.');
        });
        const from = $('priorDateFrom').value;
        const to = $('priorDateTo').value;
        $('priorDateTo').setCustomValidity(from && to && to < from ? 'End Date must be on or after Start Date.' : '');
      }
      if (!form.checkValidity()) {
        switchTab(section);
        form.reportValidity();
        return;
      }
    }
    const changes = collectChanges();
    const attachments = clone(stagedAttachments);
    const today = new Date();
    const updatedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setBusy(true);
    $('priorSaveStatus').textContent = 'Saving changes…';
    try {
      const { saved: updated, remainingDraft } = await writeChanges(activeRecord.id, changes, attachments, updatedDate, activeDraftRevision);
      activeRecord = updated;
      records = records.map(record => record.id === updated.id ? clone(updated) : record);
      dirty.clear();
      if (remainingDraft) drafts.set(updated.id, remainingDraft);
      else drafts.delete(updated.id);
      draftSaved = false;
      renderList();
      returnToList();
      window.showToast('Prior Pay Data updated');
    } catch (error) {
      $('priorSaveStatus').textContent = 'Could not save. Your changes are still here.';
      window.showToast('Unable to save. Please check available browser storage and try again.');
    } finally {
      setBusy(false);
    }
  }

  function renderRecordDetails(id) {
    const record = records.find(item => item.id === id);
    if (!record || busy || activeRecord) return;
    const fields = [
      ['dateFrom', 'Start Date'], ['dateTo', 'End Date'], ['company', 'Company'],
      ['position', 'Position'], ['lastPay', 'Last Pay'], ['yearExperience', 'Year Exp'],
      ['industry', 'Industry'], ['reasonLeaving', 'Reason Leaving'], ['payRate', 'Pay Rate']
    ];
    $('priorRecordDetailsFields').replaceChildren(...fields.map(([key, label]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      const raw = record.general[key];
      term.textContent = label;
      value.dataset.detail = key;
      value.textContent = key === 'dateFrom' || key === 'dateTo' ? dateText(raw)
        : raw === '' || raw == null ? 'Not provided'
        : key === 'lastPay' ? new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(raw)
        : String(raw);
      row.append(term, value);
      return row;
    }));
    return $('priorRecordDetails');
  }
  function showDialog(title, message, callback = null) {
    dialogOpener = document.activeElement;
    dialogCallback = callback;
    $('priorDialogTitle').textContent = title;
    $('priorDialogText').textContent = message;
    $('priorDialogCancel').hidden = !callback;
    $('priorDialogConfirm').textContent = callback ? 'Discard changes' : 'Done';
    $('priorDialog').classList.add('active');
    $('priorDialog').setAttribute('aria-hidden', 'false');
    for (const child of document.querySelector('.prior-phone').children) {
      if (child !== $('priorDialog')) child.inert = true;
    }
    (callback ? $('priorDialogCancel') : $('priorDialogClose')).focus();
  }
  function closeDialog() {
    $('priorDialog').classList.remove('active');
    $('priorDialog').setAttribute('aria-hidden', 'true');
    for (const child of document.querySelector('.prior-phone').children) child.inert = false;
    if (dialogOpener?.isConnected) dialogOpener.focus({ preventScroll: true });
    dialogCallback = null;
  }
  function returnToList() {
    activeRecord = null;
    dirty.clear();
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
    $('priorPageTitle').textContent = 'Prior Pay Data';
    $('priorInfo').hidden = true;
    $('priorBack').setAttribute('aria-label', 'Back to Payroll');
    $('priorListView').hidden = false;
    $('priorDetailView').hidden = true;
    $('priorDetailHeading').hidden = true;
    $('priorSaveBar').hidden = true;
    $('priorBottomNav').hidden = false;
    document.querySelector('.prior-phone').classList.remove('is-detail');
    $('priorMain').scrollTop = listScroll;
    const replacement = recordOpener && $('priorRecords').querySelector(`[data-record="${recordOpener.id}"] ${recordOpener.selector}`);
    replacement?.focus({ preventScroll: true });
  }
  function goBack() {
    if (busy) return;
    if (!activeRecord) { window.location.href = '../index.html?scope=individual'; return; }
    if (dirty.size && !draftSaved) {
      showDialog('Discard changes?', 'You have changes that have not been updated. Keep editing to save them, or discard them to return to your records.', returnToList);
    } else returnToList();
  }

  async function init() {
    $('priorLoadError').hidden = true;
    $('priorRetry').disabled = true;
    try {
      if (!db) db = await openDatabase();
      records = await readRecords();
      drafts = new Map((await readRecords('drafts')).map(draft => [draft.id, draft]));
      if (!records.length) {
        records = seedRecords();
        await writeRecords(records);
      }
      renderList();
    } catch (error) {
      if (db) { db.close(); db = null; }
      $('priorRecords').replaceChildren();
      $('priorLoadError').querySelector('p').textContent = error.message || 'Prior pay records could not be loaded. Please try again.';
      $('priorLoadError').hidden = false;
    } finally {
      $('priorRetry').disabled = false;
    }
  }
  createAmountFields('earningsFields', earningFields);
  createAmountFields('reliefsFields', reliefFields);
  $('priorRecords').addEventListener('click', event => {
    const card = event.target.closest('[data-record]');
    if (!card) return;
    const id = Number(card.dataset.record);
    if (event.target.closest('.prior-ytd')) openRecord(id, 'general', { id, selector: '.prior-ytd' });
    else HistoryRecordPage.open('prior-pay', id, card.querySelector('.prior-record-open'));
  });
  tabs.forEach(tab => {
    $('tab-' + tab).addEventListener('click', () => switchTab(tab));
    $('panel-' + tab).addEventListener('submit', event => {
      event.preventDefault();
      if (activeTab === 'reliefs') saveRecord();
      else switchTab(tabs[tabs.indexOf(activeTab) + 1]);
    });
    $('panel-' + tab).addEventListener('input', event => {
      event.target.setCustomValidity?.('');
      if (tab === 'general') $('priorDateTo').setCustomValidity('');
      markDirty(tab);
    });
    $('panel-' + tab).addEventListener('change', event => {
      if (event.target.type !== 'file') markDirty(tab);
    });
  });
  document.querySelector('.prior-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(activeTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    switchTab(tabs[next]);
    $('tab-' + tabs[next]).focus({ preventScroll: true });
  });
  for (const section of ['earnings', 'reliefs']) {
    document.querySelector(`[data-upload="${section}"]`).addEventListener('click', () => $(section + 'Files').click());
    document.querySelector(`[data-camera="${section}"]`).addEventListener('click', () => $(section + 'Camera').click());
    $(section + 'Files').addEventListener('change', event => addAttachments(section, event.target));
    $(section + 'Camera').addEventListener('change', event => addAttachments(section, event.target));
  }
  $('priorBack').addEventListener('click', goBack);
  $('priorNext').addEventListener('click', () => switchTab(tabs[tabs.indexOf(activeTab) + 1]));
  $('priorPrevious').addEventListener('click', () => switchTab(tabs[tabs.indexOf(activeTab) - 1]));
  $('priorCancel').addEventListener('click', goBack);
  $('priorUpdate').addEventListener('click', saveRecord);
  $('priorDraft').addEventListener('click', saveDraft);
  $('priorInfo').addEventListener('click', () => showDialog('Prior Pay Data', 'Use Next and Back to move through General, YTD Earning Detail and Tax Reliefs. Save Draft keeps your progress. Choose Save pay data on the final step to save your changes. Records and drafts are stored on this device.'));
  $('priorRetry').addEventListener('click', init);
  $('priorDialogClose').addEventListener('click', closeDialog);
  $('priorDialogCancel').addEventListener('click', closeDialog);
  $('priorDialogConfirm').addEventListener('click', () => {
    const callback = dialogCallback;
    closeDialog();
    callback?.();
  });
  $('priorDialog').addEventListener('click', event => { if (event.target === $('priorDialog')) closeDialog(); });
  document.addEventListener('keydown', event => {
    const overlay = $('priorDialog');
    if (!overlay.classList.contains('active')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
    if (event.key === 'Tab') {
      const buttons = Array.from(overlay.querySelectorAll('button')).filter(button => !button.hidden);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('beforeunload', event => {
    if ((dirty.size && !draftSaved) || busy) { event.preventDefault(); event.returnValue = ''; }
  });
  init().then(() => HistoryRecordPage.register((kind, id) => kind === 'prior-pay' && renderRecordDetails(Number(id))));
})();
