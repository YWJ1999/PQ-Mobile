/* Reference announcements for the frontend preview. No server delivery is implied. */
(() => {
  'use strict';
  const records = [
    {
      id: 'covid-wfh',
      title: 'COVID-19: Stay Home & Work From Home',
      excerpt: 'Dear All, it is a tough time, but as a team we can make this happen.',
      paragraphs: [
        'Dear All,',
        'It is a tough time we are going through, but as a team we can make this happen! Let us do our best to ensure we all help each other and survive this crucial period together.',
        'Attached is a memo of our new working procedures.',
        'All the best, stay home and stay safe.',
        'Management.'
      ],
      acknowledgedAt: '2024-06-06T16:53:00+08:00',
      attachments: [{ name: 'lighthouse-clip-art-png.png', type: 'Image attachment' }]
    },
    {
      id: 'hari-raya-cmco',
      title: 'Hari Raya during CMCO',
      excerpt: 'Dear All, In light to COVID-19, CMCO has extended till 9 June 2020.',
      paragraphs: ['Dear All,', 'In light to COVID-19, CMCO has extended till 9 June 2020.'],
      partial: true
    },
    { id: 'lockdown-3', title: 'LOCKDOWN 3.0', excerpt: 'Lockdown 3.0 is coming this weekend', paragraphs: ['Lockdown 3.0 is coming this weekend'] },
    { id: 'return-to-work', title: 'COME BACK TO WORK', excerpt: 'PLEASE COME BACK TO WORK', paragraphs: ['PLEASE COME BACK TO WORK'] },
    { id: 'test-video', title: 'test video', excerpt: 'test', paragraphs: ['test'], video: true }
  ];
  const allRecords = [...records, ...COMPANY_NEWS];
  const params = new URLSearchParams(location.search);
  const storageKey = 'peoplehcm:workplace:news:v1';
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const theme = () => document.documentElement.dataset.theme || 'dark';
  const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const state = {};
      for (const record of allRecords) {
        const row = saved?.[record.id];
        if (!row || typeof row !== 'object') continue;
        state[record.id] = {
          read: row.read === true || row.bookmarked === true || validTime(row.acknowledgedAt) || Boolean(row.feedback),
          bookmarked: row.bookmarked === true,
          acknowledgedAt: validTime(row.acknowledgedAt) ? row.acknowledgedAt : null,
          feedback: typeof row.feedback === 'string' ? row.feedback.slice(0, 1000) : ''
        };
      }
      return state;
    } catch { return {}; }
  }

  function saveState(id, changes) {
    const state = readState();
    state[id] = { ...state[id], ...changes };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function renderList() {
    const query = $('newsSearch').value.trim();
    const needle = query.toLowerCase();
    const matching = records.filter(record => (record.title + ' ' + record.excerpt).toLowerCase().includes(needle));
    const state = readState();
    $('newsResultCount').textContent = query ? `${matching.length} ${matching.length === 1 ? 'result' : 'results'}` : '';
    $('newsEmpty').hidden = matching.length > 0;
    $('newsEmpty').querySelector('p').textContent = query ? 'Try another title or keyword.' : 'There are no announcements to display.';
    let lead = '';
    const rows = [];
    matching.forEach((record, index) => {
      const url = new URL('news-detail.html', location.href);
      url.searchParams.set('id', record.id);
      url.searchParams.set('theme', theme());
      if (query) url.searchParams.set('q', query);
      const attrs = `data-news-id="${escape(record.id)}" href="${escape(url.href)}"`;
      const read = state[record.id]?.read || record.acknowledgedAt;
      const status = read
        ? '<span class="news-read-state"><i class="fa-solid fa-check" aria-hidden="true"></i>Read</span>'
        : '<span class="news-read-state is-unread"><i class="fa-solid fa-circle" aria-hidden="true"></i>Unread</span>';
      if (!query && index === 0) {
        const count = record.attachments?.length || 0;
        const media = count ? `<span class="news-lead-media"><i class="fa-solid fa-paperclip" aria-hidden="true"></i>${count} ${count === 1 ? 'file' : 'files'}</span>` : '';
        lead = `<section class="news-lead" aria-labelledby="newsLatestTitle">
          <div class="news-lead-heading"><h2 id="newsLatestTitle">Latest news</h2>${status}</div>
          <a class="news-lead-link" ${attrs}><h3>${escape(record.title)}</h3><p>${escape(record.excerpt)}</p>${media}
            <span class="news-read-link">Read announcement <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
          </a></section>`;
      } else {
        rows.push(`<li><a class="news-update-row" ${attrs}>
          <i class="fa-regular ${record.video ? 'fa-circle-play' : 'fa-newspaper'}" aria-hidden="true"></i>
          <div class="news-update-copy"><h3>${escape(record.title)}</h3><p>${escape(record.excerpt)}</p>${status}</div>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a></li>`);
      }
    });
    $('newsList').innerHTML = lead + (rows.length ? `<section class="news-updates" aria-labelledby="newsUpdatesTitle"><h2 id="newsUpdatesTitle">${query ? 'Search results' : 'More updates'}</h2><ul>${rows.join('')}</ul></section>` : '');
  }

  function initList() {
    const toggle = $('newsSearchToggle'), panel = $('newsSearchPanel'), input = $('newsSearch');
    function setSearchOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close search' : 'Search news');
      toggle.querySelector('i').className = 'fa-solid ' + (open ? 'fa-xmark' : 'fa-magnifying-glass');
    }
    function updateQuery() {
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim());
      else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
      renderList();
    }
    input.value = params.get('q') || '';
    setSearchOpen(Boolean(input.value));
    toggle.addEventListener('click', () => {
      setSearchOpen(panel.hidden);
      if (panel.hidden) { input.value = ''; updateQuery(); toggle.focus(); }
      else input.focus();
    });
    input.addEventListener('input', updateQuery);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); toggle.click(); }
    });
    renderList();
  }

  function formatAcknowledgement(value) {
    const date = new Date(value);
    const options = { timeZone: 'Asia/Kuala_Lumpur' };
    return date.toLocaleDateString('en-GB', { ...options, day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + date.toLocaleTimeString('en-GB', { ...options, hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const record = allRecords.find(row => row.id === params.get('id'));
  function renderDetailState() {
    const row = readState()[record.id] || {};
    const acknowledgedAt = row.acknowledgedAt || record.acknowledgedAt;
    $('newsAckStatus').textContent = acknowledgedAt ? 'Acknowledged' : 'Acknowledgement required';
    $('newsActionHint').textContent = acknowledgedAt ? 'Acknowledgement saved on this device.' : 'Please acknowledge this announcement. Your response is saved on this device.';
    $('newsBookmark').setAttribute('aria-pressed', String(!!row.bookmarked));
    $('newsBookmark').querySelector('i').className = (row.bookmarked ? 'fa-solid' : 'fa-regular') + ' fa-bookmark';
    $('newsAcknowledged').hidden = !acknowledgedAt;
    $('newsAcknowledge').hidden = !!acknowledgedAt;
    $('newsFeedbackTrigger').classList.toggle('news-secondary-button', !acknowledgedAt);
    if (acknowledgedAt) {
      const time = $('newsAcknowledged').querySelector('time');
      time.dateTime = acknowledgedAt;
      time.textContent = formatAcknowledgement(acknowledgedAt);
    }
    $('newsSavedFeedback').hidden = !row.feedback;
    $('newsSavedFeedbackText').textContent = row.feedback || '';
    $('newsFeedbackTrigger').querySelector('span').textContent = row.feedback ? 'Edit feedback' : 'Feedback';
  }

  function updateBackLinks() {
    const via = params.get('via');
    const legacy = params.get('from') === 'legacy';
    let path = 'news.html', label = 'Back to News';
    if (via === 'home') {
      path = '../../../' + (legacy ? 'light.html' : APP_ROUTES.home());
      label = 'Back to Home';
    } else if (via === 'legacy-drawer') {
      path = '../../../light.html?updates=open';
      label = 'Back to Company Updates';
    } else if (via === 'updates') {
      path = '../../../company-updates.html';
      label = 'Back to Company Updates';
    }
    const url = new URL(path, location.href);
    url.searchParams.set('theme', theme());
    if (path === 'news.html' && params.get('q')) url.searchParams.set('q', params.get('q'));
    if (via === 'updates') {
      if (legacy) url.searchParams.set('from', 'legacy');
      if (params.has('type')) url.searchParams.set('type', params.get('type'));
    }
    $('newsDetailBack').href = url.href;
    $('newsDetailBack').setAttribute('aria-label', label);
    const returnLink = document.querySelector('[data-news-list-link]');
    returnLink.href = url.href;
    returnLink.textContent = label;
  }

  function initDetail() {
    updateBackLinks();
    if (!record) { $('newsUnavailable').hidden = false; return; }
    if (!record.acknowledgedAt && !readState()[record.id]?.read) {
      try { saveState(record.id, { read: true }); } catch { /* Reading is available when storage is disabled. */ }
    }
    document.title = `PeopleHCM - ${record.title}`;
    $('newsArticle').hidden = false;
    $('newsDetailActions').hidden = false;
    $('newsArticleTitle').textContent = record.title;
    $('newsDate').textContent = record.date || 'Management';
    $('newsBookmark').hidden = false;
    $('newsBookmark').addEventListener('click', () => {
      try {
        saveState(record.id, { bookmarked: !readState()[record.id]?.bookmarked });
        $('newsStorageError').hidden = true;
        renderDetailState();
      } catch {
        $('newsStorageError').hidden = false;
        $('newsStorageError').textContent = 'Bookmark could not be saved. Please allow browser storage and try again.';
      }
    });
    $('newsArticleBody').replaceChildren(...record.paragraphs.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    if (record.partial) {
      const note = document.createElement('p');
      note.className = 'news-reference-note';
      note.textContent = 'Only the excerpt shown in the reference is available.';
      $('newsArticleBody').append(note);
    }
    if (record.attachments?.length) {
      $('newsAttachmentSection').hidden = false;
      $('newsAttachments').innerHTML = record.attachments.map(file => {
        const copy = `<span class="news-file-icon"><i class="fa-regular fa-file-lines" aria-hidden="true"></i></span><span class="news-file-copy"><strong>${escape(file.name)}</strong><small>${escape(file.type)} · ${file.href ? 'Download' : 'File unavailable'}</small></span>`;
        return file.href
          ? `<a class="news-attachment" href="${escape(file.href)}" download>${copy}<i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>`
          : `<div class="news-attachment">${copy}</div>`;
      }).join('');
    }
    if (record.video) {
      $('newsMedia').hidden = false;
      $('newsMedia').innerHTML = '<div class="news-media-unavailable"><i class="fa-solid fa-video" aria-hidden="true"></i><strong>Video unavailable</strong><span>The original video file has not been provided.</span></div>';
    }
    renderDetailState();
    $('newsAcknowledge').addEventListener('click', () => {
      try {
        const current = readState()[record.id];
        if (!current?.acknowledgedAt && !record.acknowledgedAt) saveState(record.id, { acknowledgedAt: new Date().toISOString() });
        $('newsStorageError').hidden = true;
        renderDetailState();
        $('newsFeedbackTrigger').focus();
      } catch {
        $('newsStorageError').hidden = false;
        $('newsStorageError').textContent = 'Acknowledgement could not be saved. Please allow browser storage and try again.';
      }
    });

    const dialog = $('newsFeedbackDialog');
    const field = $('newsFeedbackText');
    const updateCount = () => { $('newsFeedbackCount').textContent = `${field.value.length} / 1,000`; };
    $('newsFeedbackTrigger').addEventListener('click', () => {
      field.value = readState()[record.id]?.feedback || '';
      field.setCustomValidity('');
      $('newsFeedbackError').hidden = true;
      updateCount();
      dialog.showModal();
      field.focus();
    });
    $('newsFeedbackClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => $('newsFeedbackTrigger').focus());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    field.addEventListener('input', () => { field.setCustomValidity(''); updateCount(); });
    $('newsFeedbackForm').addEventListener('submit', event => {
      event.preventDefault();
      const feedback = field.value.trim();
      if (!feedback || feedback.length > 1000) {
        field.setCustomValidity(!feedback ? 'Please enter your feedback.' : 'Please keep feedback within 1,000 characters.');
        field.reportValidity();
        return;
      }
      try {
        saveState(record.id, { feedback });
        renderDetailState();
        dialog.close();
        showToast('Feedback saved on this device');
      } catch {
        $('newsFeedbackError').hidden = false;
        $('newsFeedbackError').textContent = 'Feedback could not be saved. Please allow browser storage and try again.';
      }
    });
  }

  if ($('newsList')) {
    initList();
  } else if ($('newsArticle')) initDetail();

  function refresh() {
    if ($('newsList')) renderList();
    else if ($('newsArticle')) { updateBackLinks(); if (record) renderDetailState(); }
  }
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('popstate', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) refresh(); });
})();
