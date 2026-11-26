(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const data = window.TRAINING_FEEDBACK_DATA || { records: [], criteria: [] };
  const employeeId = window.TRAINING_COMPETENCY_INDIVIDUAL?.employee?.empNo || 'current-user';
  const storageKey = `peoplehcm.trainingFeedback.responses.v1.${employeeId}`;
  const page = document.body.dataset.trainingFeedbackPage;
  const params = new URLSearchParams(location.search);
  const phone = document.querySelector('.phone-container');
  const maxAttachmentBytes = 1.5 * 1024 * 1024;
  const maxTotalAttachmentBytes = 2.5 * 1024 * 1024;
  let responses = loadResponses();

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function theme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  function dateText(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function validAttachment(attachment) {
    return attachment
      && typeof attachment.name === 'string'
      && typeof attachment.type === 'string'
      && Number.isFinite(attachment.size)
      && typeof attachment.dataUrl === 'string'
      && /^data:[^,]*;base64,/.test(attachment.dataUrl);
  }

  function validResponse(response) {
    return response
      && typeof response.remark === 'string'
      && response.remark.trim().length > 0
      && response.remark.length <= 2000
      && response.ratings
      && typeof response.ratings === 'object'
      && data.criteria.every(criterion => Number.isInteger(response.ratings[criterion.id]) && response.ratings[criterion.id] >= 1 && response.ratings[criterion.id] <= 5)
      && Array.isArray(response.attachments)
      && response.attachments.every(validAttachment);
  }

  function loadResponses() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      return Object.fromEntries(Object.entries(saved).filter(([recordId, response]) =>
        data.records.some(record => record.id === recordId) && validResponse(response)
      ));
    } catch {
      return {};
    }
  }

  function saveResponses() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(responses));
      return true;
    } catch {
      return false;
    }
  }

  function attachmentBytes(responseMap, excludedRecordId = '') {
    return Object.entries(responseMap).reduce((total, [recordId, response]) => {
      if (recordId === excludedRecordId || !Array.isArray(response?.attachments)) return total;
      return total + response.attachments.reduce((responseTotal, attachment) => responseTotal + (Number(attachment.size) || 0), 0);
    }, 0);
  }

  function recordStatus(record) {
    return responses[record.id] || validResponse(record.response) ? 'Completed' : 'Pending';
  }

  function responseUrl(recordId) {
    const query = new URLSearchParams({ theme: theme(), feedback: recordId });
    return `training-feedback-form.html?${query}`;
  }

  function createDetail(label, value, field) {
    const detail = element('div', 'training-feedback-card-detail');
    detail.dataset.field = field;
    const content = element('strong', field === 'status' ? 'training-feedback-status' : '', value);
    if (field === 'status') content.dataset.feedbackStatus = '';
    detail.append(element('span', '', label), content);
    return detail;
  }

  function createCard(record) {
    const status = recordStatus(record);
    const statusTheme = status.toLowerCase();
    const card = element('article', 'training-feedback-card history-card-item');
    card.dataset.feedbackId = record.id;
    card.dataset.status = statusTheme;
    const title = element('h2', 'history-card-title', 'Feedback');
    title.id = `trainingFeedbackTitle-${record.id}`;
    const reference = element('div', 'history-card-ref', dateText(record.trainingDate));
    const heading = element('div', 'history-card-heading');
    heading.append(title, reference);
    const badge = element('span', 'card-status-badge');
    badge.dataset.status = statusTheme;
    badge.dataset.feedbackStatus = '';
    const statusIcon = element('i', status === 'Completed' ? 'fa-solid fa-check' : 'fa-solid fa-clock');
    statusIcon.setAttribute('aria-hidden', 'true');
    badge.append(statusIcon, document.createTextNode(status));
    const end = element('div', 'training-feedback-card-end');
    end.append(badge);
    const header = element('header', 'training-feedback-card-header history-card-header');
    header.append(heading, end);
    card.setAttribute('aria-labelledby', title.id);
    const details = element('div', 'training-feedback-card-details history-card-details');
    const response = responses[record.id] || record.response;
    details.append(createDetail('Description', record.description, 'description'));
    recordSubmitDate.append(details, response?.submittedAt);
    const footer = element('footer', 'training-feedback-card-footer history-card-actions');
    const action = element('a', 'training-feedback-action', 'Feedback');
    action.href = responseUrl(record.id);
    action.setAttribute('aria-label', `Provide feedback for ${record.course}`);
    footer.append(action);
    card.append(header, details, footer);
    return card;
  }

  function listPage() {
    const defaults = { startDate: '', endDate: '', status: '' };
    const state = { filters: { ...defaults } };
    let inertElements = [];
    let returnFocus = null;

    function filteredRecords() {
      const filters = state.filters;
      return data.records.filter(record =>
        (!filters.startDate || record.trainingDate >= filters.startDate)
        && (!filters.endDate || record.trainingDate <= filters.endDate)
        && (!filters.status || recordStatus(record) === filters.status)
      );
    }

    function summaryText() {
      const filters = state.filters;
      const parts = [];
      if (filters.startDate || filters.endDate) parts.push(`${filters.startDate ? dateText(filters.startDate) : 'Any Date'} – ${filters.endDate ? dateText(filters.endDate) : 'Any Date'}`);
      if (filters.status) parts.push(filters.status);
      return parts.length ? parts.join(' • ') : 'All Training Feedback';
    }

    function syncLinks() {
      $('trainingFeedbackBack').href = `../index.html?scope=individual&theme=${theme()}`;
      document.querySelectorAll('.training-feedback-action').forEach(link => {
        link.href = responseUrl(link.closest('.training-feedback-card').dataset.feedbackId);
      });
    }

    function render() {
      const records = filteredRecords();
      $('trainingFeedbackList').replaceChildren(...records.map(createCard));
      $('trainingFeedbackEmpty').hidden = records.length > 0;
      $('trainingFeedbackTotalRecords').textContent = String(records.length);
      $('trainingFeedbackFilterSummary').textContent = summaryText();
      syncLinks();
    }

    function populateFilter() {
      $('trainingFeedbackFilterStart').value = state.filters.startDate;
      $('trainingFeedbackFilterEnd').value = state.filters.endDate;
      $('trainingFeedbackFilterStatus').value = state.filters.status;
      $('trainingFeedbackFilterError').hidden = true;
    }

    function openFilter() {
      const overlay = $('trainingFeedbackFilterOverlay');
      populateFilter();
      returnFocus = document.activeElement;
      inertElements = [...phone.children, document.querySelector('preview-top-bar')]
        .filter(node => node && node !== overlay)
        .map(node => ({ node, previous: node.inert }));
      inertElements.forEach(({ node }) => { node.inert = true; });
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      $('trainingFeedbackFilterTrigger').setAttribute('aria-expanded', 'true');
      void overlay.offsetHeight;
      overlay.classList.add('active');
      $('trainingFeedbackResetFilter').focus({ preventScroll: true });
    }

    function closeFilter() {
      const overlay = $('trainingFeedbackFilterOverlay');
      overlay.classList.remove('active');
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      $('trainingFeedbackFilterTrigger').setAttribute('aria-expanded', 'false');
      inertElements.forEach(({ node, previous }) => { node.inert = previous; });
      inertElements = [];
      returnFocus?.focus({ preventScroll: true });
    }

    function applyFilter(filters) {
      state.filters = filters;
      render();
      closeFilter();
      document.querySelector('.training-feedback-content').scrollTop = 0;
    }

    $('trainingFeedbackFilterTrigger').addEventListener('click', openFilter);
    $('trainingFeedbackCloseFilter').addEventListener('click', closeFilter);
    $('trainingFeedbackFilterForm').addEventListener('submit', event => {
      event.preventDefault();
      const filters = {
        startDate: $('trainingFeedbackFilterStart').value,
        endDate: $('trainingFeedbackFilterEnd').value,
        status: $('trainingFeedbackFilterStatus').value
      };
      if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) {
        $('trainingFeedbackFilterError').textContent = 'End Date must be on or after Start Date.';
        $('trainingFeedbackFilterError').hidden = false;
        $('trainingFeedbackFilterEnd').focus();
        return;
      }
      applyFilter(filters);
    });
    $('trainingFeedbackResetFilter').addEventListener('click', () => applyFilter({ ...defaults }));
    $('trainingFeedbackFilterOverlay').addEventListener('click', event => {
      if (event.target === event.currentTarget) closeFilter();
    });
    document.addEventListener('keydown', event => {
      if ($('trainingFeedbackFilterOverlay').hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeFilter();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...$('trainingFeedbackFilterOverlay').querySelectorAll('button,input,select')].filter(node => !node.disabled);
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
        event.preventDefault();
        controls[0].focus();
      }
    });
    new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    render();
  }

  function formPage() {
    const record = data.records.find(item => item.id === params.get('feedback'));
    let ratingTrigger = null;
    let editingCriterion = null;
    let selectedRating = 0;
    let inertElements = [];
    const response = record ? responses[record.id] || (validResponse(record.response) ? record.response : null) : null;
    recordSubmitDate.set($('trainingFeedbackSubmitDate'), response?.submittedAt);
    const ratings = Object.fromEntries(data.criteria.map(criterion => [criterion.id, response?.ratings[criterion.id] || 0]));
    let attachments = response ? response.attachments.map(attachment => ({ ...attachment })) : [];
    let attachmentProcessing = Promise.resolve();
    let pendingAttachmentChanges = 0;

    function syncLinks() {
      const href = `training-feedback.html?theme=${theme()}`;
      $('trainingFeedbackFormBack').href = href;
      $('trainingFeedbackUnavailableBack').href = href;
    }

    function showError(message) {
      $('trainingFeedbackFormError').textContent = message;
      $('trainingFeedbackFormError').hidden = !message;
      if (message) $('trainingFeedbackFormError').scrollIntoView({ block: 'nearest' });
    }

    function renderAttachments() {
      $('trainingFeedbackAttachments').replaceChildren(...attachments.map((attachment, index) => {
        const row = element('div', 'training-feedback-attachment');
        const link = element('a', 'training-feedback-attachment-link');
        link.href = attachment.dataUrl;
        link.download = attachment.name;
        link.setAttribute('aria-label', `Download ${attachment.name}`);
        const icon = element('span', 'training-feedback-attachment-icon');
        const iconSymbol = element('i', 'fa-solid fa-paperclip');
        iconSymbol.setAttribute('aria-hidden', 'true');
        icon.append(iconSymbol);
        link.append(icon, element('span', 'training-feedback-attachment-name', attachment.name));
        const remove = element('button', 'training-feedback-attachment-remove');
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${attachment.name}`);
        const removeIcon = element('i', 'fa-solid fa-xmark');
        removeIcon.setAttribute('aria-hidden', 'true');
        remove.append(removeIcon);
        remove.addEventListener('click', () => {
          attachments.splice(index, 1);
          renderAttachments();
          showError('');
        });
        row.append(link, remove);
        return row;
      }));
    }

    function setGeneralExpanded(expanded) {
      const toggle = $('trainingFeedbackGeneralToggle');
      $('trainingFeedbackGeneralBody').hidden = !expanded;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} General Feedback`);
      toggle.querySelector('i').className = `fa-solid fa-chevron-${expanded ? 'down' : 'right'}`;
    }

    function setAttachmentBusy(isBusy) {
      $('trainingFeedbackForm').setAttribute('aria-busy', String(isBusy));
      $('trainingFeedbackSubmit').disabled = isBusy;
    }

    function jpegName(fileName) {
      const extensionIndex = fileName.lastIndexOf('.');
      const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
      return `${baseName || 'attachment'}.jpg`;
    }

    function optimizeImage(file) {
      if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size <= maxAttachmentBytes) return Promise.resolve(file);
      return new Promise((resolve, reject) => {
        const image = new Image();
        const source = URL.createObjectURL(file);
        image.addEventListener('error', () => {
          URL.revokeObjectURL(source);
          reject(new Error('Unable to optimize this image. Please choose another file.'));
        }, { once: true });
        image.addEventListener('load', () => {
          const scale = Math.min(1, 1280 / image.naturalWidth, 1280 / image.naturalHeight);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(source);
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Unable to optimize this image. Please choose another file.'));
              return;
            }
            resolve(new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified }));
          }, 'image/jpeg', .72);
        }, { once: true });
        image.src = source;
      });
    }

    async function readAttachment(file) {
      const optimized = await optimizeImage(file);
      if (optimized.size > maxAttachmentBytes) throw new Error('Each attachment must be 1.5 MB or less.');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('error', () => reject(new Error('Unable to read attachment.')), { once: true });
        reader.addEventListener('load', () => resolve({
          name: optimized.name,
          type: optimized.type || 'application/octet-stream',
          size: optimized.size,
          lastModified: optimized.lastModified,
          dataUrl: String(reader.result)
        }), { once: true });
        reader.readAsDataURL(optimized);
      });
    }

    function renderRatingValue(criterionId) {
      const value = document.querySelector(`[data-rating-value="${criterionId}"]`);
      if (value) value.textContent = String(ratings[criterionId]);
    }

    function closeRating() {
      const overlay = $('trainingFeedbackRatingOverlay');
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      inertElements.forEach(({ node, previous }) => { node.inert = previous; });
      inertElements = [];
      ratingTrigger?.focus({ preventScroll: true });
      ratingTrigger = null;
      editingCriterion = null;
    }

    function configureRatingOptions(focusValue) {
      document.querySelectorAll('[data-rating-option]').forEach(button => {
        const value = Number(button.dataset.ratingOption);
        const selected = value === selectedRating;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-checked', String(selected));
        button.tabIndex = value === focusValue ? 0 : -1;
      });
    }

    function chooseRating(value) {
      selectedRating = value;
      configureRatingOptions(value);
      document.querySelector(`[data-rating-option="${value}"]`).focus({ preventScroll: true });
    }

    function openRating(criterion, trigger) {
      editingCriterion = criterion;
      ratingTrigger = trigger;
      selectedRating = ratings[criterion.id];
      $('trainingFeedbackRatingCriterion').textContent = criterion.text;
      const focusValue = selectedRating || 1;
      configureRatingOptions(focusValue);
      const overlay = $('trainingFeedbackRatingOverlay');
      inertElements = [...phone.children, document.querySelector('preview-top-bar')]
        .filter(node => node && node !== overlay)
        .map(node => ({ node, previous: node.inert }));
      inertElements.forEach(({ node }) => { node.inert = true; });
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      document.querySelector(`[data-rating-option="${focusValue}"]`).focus({ preventScroll: true });
    }

    function createRatingRow(criterion) {
      const row = element('tr', 'training-feedback-rating-row');
      const ratingCell = element('td');
      const rating = element('span', '', ratings[criterion.id]);
      rating.dataset.ratingValue = criterion.id;
      ratingCell.append(rating);
      const editCell = element('td');
      const edit = element('button', 'training-feedback-edit-rating', 'Edit');
      edit.type = 'button';
      edit.setAttribute('aria-label', `Edit rating for ${criterion.text}`);
      edit.addEventListener('click', () => openRating(criterion, edit));
      editCell.append(edit);
      row.append(element('td', '', criterion.text), ratingCell, editCell);
      return row;
    }

    if (!record) {
      $('trainingFeedbackUnavailable').hidden = false;
      $('trainingFeedbackForm').hidden = true;
      syncLinks();
      return;
    }

    $('trainingFeedbackCourse').textContent = record.course;
    $('trainingFeedbackStartDate').textContent = dateText(record.startDate);
    $('trainingFeedbackEndDate').textContent = dateText(record.endDate);
    $('trainingFeedbackRemark').value = response?.remark || '';
    $('trainingFeedbackRatingRows').replaceChildren(...data.criteria.map(createRatingRow));
    renderAttachments();
    $('trainingFeedbackGeneralToggle').addEventListener('click', () => {
      setGeneralExpanded($('trainingFeedbackGeneralToggle').getAttribute('aria-expanded') !== 'true');
    });

    document.querySelectorAll('[data-file-target]').forEach(button => {
      button.addEventListener('click', () => $(button.dataset.fileTarget).click());
    });
    ['trainingFeedbackFiles', 'trainingFeedbackCamera'].forEach(id => {
      $(id).addEventListener('change', event => {
        const files = [...event.target.files];
        event.target.value = '';
        if (!files.length) return;
        pendingAttachmentChanges += 1;
        setAttachmentBusy(true);
        attachmentProcessing = attachmentProcessing.then(async () => {
          try {
            const added = await Promise.all(files.map(readAttachment));
            const currentBytes = [...attachments, ...added].reduce((total, attachment) => total + attachment.size, 0);
            const totalBytes = attachmentBytes(responses, record.id) + currentBytes;
            if (totalBytes > maxTotalAttachmentBytes) throw new Error('Combined attachments across all feedback responses must be 2.5 MB or less.');
            attachments = [...attachments, ...added];
            renderAttachments();
            showError('');
          } catch (error) {
            showError(error.message || 'Unable to read the selected attachment. Please choose another file.');
          }
        }).finally(() => {
          pendingAttachmentChanges -= 1;
          setAttachmentBusy(pendingAttachmentChanges > 0);
        });
      });
    });
    $('trainingFeedbackCloseRating').addEventListener('click', closeRating);
    $('trainingFeedbackRatingOverlay').addEventListener('click', event => {
      if (event.target === event.currentTarget) closeRating();
    });
    document.querySelectorAll('[data-rating-option]').forEach(button => {
      button.addEventListener('click', () => chooseRating(Number(button.dataset.ratingOption)));
      button.addEventListener('keydown', event => {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const current = Number(button.dataset.ratingOption);
        const next = event.key === 'Home' ? 1
          : event.key === 'End' ? 5
            : ['ArrowRight', 'ArrowDown'].includes(event.key) ? current % 5 + 1
              : (current + 3) % 5 + 1;
        chooseRating(next);
      });
    });
    $('trainingFeedbackSaveRating').addEventListener('click', () => {
      if (!editingCriterion || !selectedRating) return;
      ratings[editingCriterion.id] = selectedRating;
      renderRatingValue(editingCriterion.id);
      showError('');
      closeRating();
    });
    $('trainingFeedbackRemark').addEventListener('input', () => showError(''));
    $('trainingFeedbackForm').addEventListener('submit', async event => {
      event.preventDefault();
      await attachmentProcessing;
      const remark = $('trainingFeedbackRemark').value.trim();
      if (!remark) {
        setGeneralExpanded(true);
        showError('Remark is required.');
        $('trainingFeedbackRemark').focus();
        return;
      }
      if (data.criteria.some(criterion => !ratings[criterion.id])) {
        showError('Please rate every feedback criterion before submitting.');
        document.querySelector('.training-feedback-edit-rating').focus();
        return;
      }
      const nextResponses = {
        ...responses,
        [record.id]: {
          remark,
          ratings: Object.fromEntries(data.criteria.map(criterion => [criterion.id, ratings[criterion.id]])),
          attachments,
          submittedAt: new Date().toISOString()
        }
      };
      if (attachmentBytes(nextResponses) > maxTotalAttachmentBytes) {
        showError('Combined attachments across all feedback responses must be 2.5 MB or less.');
        return;
      }
      responses = nextResponses;
      if (!saveResponses()) {
        showError('Unable to save the feedback. Please check browser storage and try again.');
        return;
      }
      location.href = `training-feedback.html?theme=${theme()}`;
    });
    document.addEventListener('keydown', event => {
      if ($('trainingFeedbackRatingOverlay').hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRating();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...$('trainingFeedbackRatingOverlay').querySelectorAll('button')]
        .filter(button => button.tabIndex >= 0 && button.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
        event.preventDefault();
        controls[0].focus();
      }
    });
    new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    syncLinks();
  }

  if (page === 'form') formPage();
  else listPage();
})();
