/* Shared filtering for pending approval lists. Dates are calendar dates, not timestamps. */
(function () {
  const emptyState = () => ({ keyword: '', startDate: '', endDate: '', days: 'all', minDays: '', maxDays: '' });

  function parseDate(value) {
    const text = String(value || '').trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    let year, month, day;
    if (match) {
      [, year, month, day] = match.map(Number);
    } else if ((match = text.match(/(?:^|\s)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:$|\s)/))) {
      [, day, month, year] = match.map(Number);
    } else if ((match = text.match(/(?:^|\s)(\d{1,2})\s+([a-z]+)\s+(\d{4})(?:$|\s)/i))) {
      day = Number(match[1]);
      month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
      year = Number(match[3]);
    } else return null;
    const date = new Date(year, month - 1, day);
    return month > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  function toISO(value) {
    const date = parseDate(value);
    return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
  }

  function outstandingDays(record, today = new Date()) {
    if (record.outstandingDays !== undefined && record.outstandingDays !== null && record.outstandingDays !== '') {
      const days = Number(record.outstandingDays);
      if (Number.isFinite(days) && days >= 0) return days;
    }
    const submitted = parseDate(record.submittedAt);
    if (!submitted) return null;
    const calendarTime = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.max(0, Math.floor((calendarTime(today) - calendarTime(submitted)) / 86400000));
  }

  function matches(record, filters, today) {
    const keyword = filters.keyword.trim().toLowerCase();
    if (keyword && !String(record.keyword || '').toLowerCase().includes(keyword)) return false;
    const start = toISO(record.startDate);
    const end = toISO(record.endDate) || start;
    if (filters.startDate && (!end || end < filters.startDate)) return false;
    if (filters.endDate && (!start || start > filters.endDate)) return false;
    if (filters.days === 'all') return true;
    const days = outstandingDays(record, today);
    if (days === null) return false;
    if (filters.days === '1') return days === 1;
    if (filters.days === '2-3') return days >= 2 && days <= 3;
    if (filters.days === '4-5') return days >= 4 && days <= 5;
    if (filters.days === 'gt5') return days > 5;
    if (filters.days === 'custom') {
      const min = filters.minDays === '' ? 0 : Number(filters.minDays);
      const max = filters.maxDays === '' ? Infinity : Number(filters.maxDays);
      return days >= min && days <= max;
    }
    return true;
  }

  function summary(filters) {
    const parts = [];
    if (filters.keyword.trim()) parts.push(`"${filters.keyword.trim()}"`);
    if (filters.startDate || filters.endDate) parts.push(`${filters.startDate || 'Any start date'} – ${filters.endDate || 'Any end date'}`);
    const names = { '1': '1 Day', '2-3': '2–3 Days', '4-5': '4–5 Days', gt5: '>5 Days' };
    if (filters.days === 'custom') parts.push(`${filters.minDays || '0'}–${filters.maxDays || 'Any'} Days`);
    else if (names[filters.days]) parts.push(names[filters.days]);
    return parts.length ? parts.join(' • ') : 'All Requests • All Dates';
  }

  function create(id, options) {
    const host = options.host || document.querySelector('.phone-container');
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'approval-filter-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form class="approval-filter-panel" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="approval-filter-handle" aria-hidden="true"></div>
        <div class="approval-filter-header">
          <h2 id="${id}-title">Filter</h2>
          <div class="standard-filter-header-actions">
            <button type="button" class="standard-filter-reset" data-action="reset"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Reset</span></button>
            <button type="button" class="standard-filter-close" data-action="close" aria-label="Close filter"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="approval-filter-fields">
          <label for="${id}-keyword">Search keyword</label>
          <input id="${id}-keyword" name="keyword" type="search" placeholder="Employee name, ID or request type">
          <div class="approval-filter-date-row">
            <div><label for="${id}-startDate">Start date</label><input id="${id}-startDate" name="startDate" type="date"></div>
            <div><label for="${id}-endDate">End date</label><input id="${id}-endDate" name="endDate" type="date"></div>
          </div>
          <label for="${id}-days">Outstanding days</label>
          <select id="${id}-days" name="days">
            <option value="all">All Outstanding days</option>
            <option value="1">1 Day</option>
            <option value="2-3">2 – 3 Days</option>
            <option value="4-5">4 – 5 Days</option>
            <option value="gt5">&gt; 5 Days</option>
            <option value="custom">Custom Days Range</option>
          </select>
          <div class="approval-filter-date-row" data-custom-days hidden>
            <div><label for="${id}-minDays">Min days</label><input id="${id}-minDays" name="minDays" type="number" min="0" step="1"></div>
            <div><label for="${id}-maxDays">Max days</label><input id="${id}-maxDays" name="maxDays" type="number" min="0" step="1"></div>
          </div>
          <p class="approval-filter-error" role="alert" hidden></p>
        </div>
        <button type="submit" class="approval-filter-apply">Apply Filter</button>
      </form>`;
    host.appendChild(overlay);
    const form = overlay.querySelector('form');
    const controls = form.elements;
    const custom = form.querySelector('[data-custom-days]');
    const error = form.querySelector('[role="alert"]');
    let applied = emptyState();
    let returnFocus;
    const updateCustom = () => { custom.hidden = controls.days.value !== 'custom'; };
    const updateSummary = () => {
      const element = document.getElementById(options.summaryId);
      if (element) element.textContent = summary(applied);
    };
    function close() {
      overlay.hidden = true;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }
    function open() {
      returnFocus = document.activeElement;
      Object.keys(applied).forEach(key => { controls[key].value = applied[key]; });
      error.hidden = true;
      updateCustom();
      overlay.hidden = false;
      controls.keyword.focus({ preventScroll: true });
    }
    function reset() {
      applied = emptyState();
      Object.keys(applied).forEach(key => { controls[key].value = applied[key]; });
      updateCustom();
      error.hidden = true;
      updateSummary();
      options.onApply();
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const draft = Object.fromEntries(Object.keys(applied).map(key => [key, controls[key].value]));
      let message = '';
      if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) message = 'End date must be on or after Start date.';
      if (draft.days === 'custom' && draft.minDays !== '' && draft.maxDays !== '' && Number(draft.minDays) > Number(draft.maxDays)) message = 'Max days must be at least Min days.';
      if (message) {
        error.textContent = message;
        error.hidden = false;
        return;
      }
      applied = draft;
      updateSummary();
      options.onApply();
      close();
    });
    controls.days.addEventListener('change', updateCustom);
    form.querySelector('[data-action="reset"]').addEventListener('click', reset);
    form.querySelector('[data-action="close"]').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const focusable = [...form.querySelectorAll('input, select, button')].filter(node => node.getClientRects().length && !node.disabled);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    updateSummary();
    return { open, close, reset, matches: record => matches(record, applied), get state() { return { ...applied }; } };
  }

  window.PendingApprovalFilter = { parseDate, toISO, outstandingDays, matches, summary, create };
})();

