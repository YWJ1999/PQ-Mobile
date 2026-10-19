// Sample profile records follow the field order of the employee dossier.
(function () {
  'use strict';

  const records = {
    'bento-family': [
      { name: 'Daniel Jenkins', relation: 'Husband', birthDate: '1958-08-17' },
      { name: 'Emily Jenkins', relation: 'Daughter', birthDate: '1992-04-01' }
    ],
    'bento-career': [
      { date: '2017-01-01', movement: 'Increment', position: 'Group HR Manager' },
      { date: '2012-05-01', movement: 'Promotion', position: 'Group HR Manager' },
      { date: '2008-01-02', movement: 'Increment', position: 'HR Manager' },
      { date: '2006-11-12', movement: 'Confirmation', position: 'HR Manager' },
      { date: '2006-08-12', movement: 'Hired', position: 'HR Manager' }
    ],
    'bento-competency': [
      { description: 'Effective communication', level: 2, expiry: '2024-06-25' },
      { description: 'HR analytics', level: 5, expiry: '2024-05-30' },
      { description: 'Leadership', level: 3, expiry: '2027-09-12' },
      { description: 'Learning capability', level: 4, expiry: '2029-12-31' },
      { description: 'Change management', level: 1, expiry: '2031-09-18' },
      { description: 'Teamwork', level: 5, expiry: '2035-12-15' }
    ],
    'bento-performance': [
      { period: 'FY 2026 (TSH)', position: 'Group HR Manager', score: 'A+ (77)', rating: 'A+' },
      { period: 'FY 2026A', position: 'Group HR Manager', score: 'Excellent', rating: 'Excellent' },
      { period: 'FY 2026B', position: 'Group HR Manager', score: 'Excellent', rating: 'Excellent' },
      { period: 'FY 2012A', position: 'HR Manager', score: 'Excellent', rating: 'Excellent' },
      { period: 'FY 2011A', position: 'HR Manager', score: 'Excellent', rating: 'Excellent' },
      { period: 'FY 2010A', position: 'HR Manager', score: 'Excellent', rating: 'Excellent' }
    ],
    'bento-training': [
      { date: '2026-12-07', title: 'Strategic people management', days: 19 },
      { date: '2026-11-09', title: 'UiPath automation', days: 19 },
      { date: '2026-05-07', title: 'HR analytics programme', days: 9 },
      { date: '2026-05-07', title: 'Workforce planning', days: 9 },
      { date: '2025-12-02', title: 'Payroll update briefing', days: 0 },
      { date: '2025-11-28', title: 'Employee engagement', days: 1 },
      { date: '2025-11-28', title: 'Benefits administration webinar', days: 0 },
      { date: '2025-10-25', title: 'Conflict resolution', days: 1 },
      { date: '2025-10-24', title: 'PowerPoint for business', days: 1 },
      { date: '2025-10-01', title: 'PeopleKiosk essentials', days: 1 },
      { date: '2025-06-06', title: '5S workplace strategies', days: 1 },
      { date: '2025-06-05', title: 'Employment practices workshop', days: 1 },
      { date: '2025-06-01', title: 'SQL for beginners', days: 1 },
      { date: '2025-06-01', title: 'Microsoft Excel reporting', days: 2 },
      { date: '2025-06-01', title: 'Effective crisis response', days: 1 },
      { date: '2024-12-23', title: 'Personnel development', days: 1 },
      { date: '2024-11-03', title: 'HRD Corp administration', days: 4 },
      { date: '2024-11-01', title: 'Microsoft Teams briefing', days: 0 },
      { date: '2024-07-26', title: 'PowerShell fundamentals', days: 1 },
      { date: '2021-08-02', title: 'Digital HR fundamentals', days: 1 },
      { date: '2021-08-01', title: 'Process improvement: planning', days: 1 },
      { date: '2021-08-01', title: 'Process improvement: delivery', days: 1 },
      { date: '2021-07-14', title: 'Business reporting introduction', days: 1 },
      { date: '2021-07-12', title: 'Data quality workshop', days: 1 },
      { date: '2020-11-18', title: 'Microsoft 365 collaboration', days: 1 },
      { date: '2020-11-11', title: 'Microsoft Excel essentials', days: 1 },
      { date: '2020-06-14', title: 'Remote team management', days: 1 },
      { date: '2020-05-29', title: 'Business continuity planning', days: 1 },
      { date: '2020-05-29', title: 'Employee wellbeing', days: 1 },
      { date: '2019-12-24', title: 'Leadership development', days: 3 },
      { date: '2019-08-01', title: 'Process improvement advanced', days: 3 },
      { date: '2018-08-01', title: 'Process improvement essentials', days: 3 },
      { date: '2017-05-29', title: 'Continuous improvement', days: 2 }
    ],
    'bento-compliance': [],
    'bento-assets': [
      { date: '2019-01-01', description: 'Company vehicle · WRA 3262', value: 96000 },
      { date: '2017-05-27', description: 'Samsung Galaxy phone', value: 2000 },
      { date: '2015-07-27', description: 'MSI 17-inch laptop', value: 5000 },
      { date: '2013-01-01', description: 'Locker 003', value: 300 }
    ],
    'bento-letters': [
      { type: 'EA 2025', date: '2026-07-29', signed: null },
      { type: 'Employment Verification', date: '2026-05-18', signed: true },
      { type: 'Bonus Letter', date: '2022-09-05', signed: true },
      { type: 'Letter of Guarantee', date: '2022-09-04', signed: true },
      { type: 'Employment Verification', date: '2022-08-09', signed: true },
      { type: 'Employment Verification', date: '2021-08-09', signed: true },
      { type: 'Employment Verification', date: '2019-09-02', signed: true },
      { type: 'Letter of Guarantee', date: '2017-01-21', signed: true },
      { type: 'Employment Verification', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Employment Verification', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Employment Verification', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Employment Verification', date: null, signed: null },
      { type: 'Employment Verification', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'Letter of Guarantee', date: null, signed: null },
      { type: 'EA 2024', date: null, signed: null },
      { type: 'Bonus Letter', date: null, signed: null }
    ]
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const numberFormat = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const missing = '<span class="profile-record-missing" aria-label="Not recorded">&mdash;</span>';

  function escapeText(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function formatDate(value) {
    if (!value) return '';
    const parts = value.split('-').map(Number);
    return parts[2] + ' ' + months[parts[1] - 1] + ' ' + parts[0];
  }

  function dateCell(value) {
    return value ? '<time class="profile-record-date" datetime="' + escapeText(value) + '">' + escapeText(formatDate(value)) + '</time>' : missing;
  }

  function expiryCell(value) {
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const part = type => today.find(item => item.type === type).value;
    const dateOnly = part('year') + '-' + part('month') + '-' + part('day');
    const expired = value && value < dateOnly;
    return expired ? '<span class="profile-record-expired">' + dateCell(value) + '<small class="profile-expiry-state">Expired</small></span>' : dateCell(value);
  }

  const definitions = {
    'bento-family': {
      title: 'Family', headers: ['Name', 'Relation', 'Birth date'],
      cells: row => [escapeText(row.name), escapeText(row.relation), dateCell(row.birthDate)]
    },
    'bento-career': {
      title: 'Career Progression', headers: ['Date', 'Movement', 'Position'],
      cells: row => [dateCell(row.date), escapeText(row.movement), escapeText(row.position)]
    },
    'bento-competency': {
      title: 'Competencies', headers: ['Description', 'Level', 'Expiry'],
      cells: row => [escapeText(row.description), '<span class="profile-record-number">' + escapeText(row.level) + '</span>', expiryCell(row.expiry)]
    },
    'bento-performance': {
      title: 'Performance History', headers: ['Period', 'Position', 'Score'],
      cells: row => [escapeText(row.period), escapeText(row.position), escapeText(row.score)]
    },
    'bento-training': {
      title: 'Training History', headers: ['Date', 'Course title', 'Days'],
      cells: row => [dateCell(row.date), escapeText(row.title), '<span class="profile-record-number">' + escapeText(numberFormat.format(row.days)) + '</span>']
    },
    'bento-compliance': {
      title: 'Disciplinary History', headers: ['Date', 'Offence', 'Action'],
      cells: row => [dateCell(row.date), escapeText(row.offence), escapeText(row.action)],
      empty: 'No disciplinary records.'
    },
    'bento-assets': {
      title: 'Asset Assignment', headers: ['Assign date', 'Asset description', 'Value'],
      cells: row => [dateCell(row.date), escapeText(row.description), '<span class="profile-record-number" aria-label="' + escapeText(numberFormat.format(row.value)) + ' Malaysian ringgit">' + escapeText(numberFormat.format(row.value)) + '</span>']
    },
    'bento-letters': {
      title: 'HR Letters', headers: ['Letter type', 'Issue date', 'Signed?'],
      cells: row => [escapeText(row.type), dateCell(row.date), row.signed === true ? '<span class="profile-record-signed" role="img" aria-label="Signed"><i class="fa-solid fa-check" aria-hidden="true"></i></span>' : missing]
    }
  };

  window.PROFILE_RECORD_COUNTS = Object.freeze(Object.fromEntries(
    Object.entries(records).map(([id, rows]) => [id, rows.length])
  ));

  function renderTable(id, rows, emptyMessage) {
    const container = document.querySelector('[data-profile-records="' + id + '"]');
    const definition = definitions[id];
    if (!container || !definition) return;
    const heading = '<thead><tr>' + definition.headers.map(label => '<th scope="col">' + escapeText(label) + '</th>').join('') + '</tr></thead>';
    const body = rows.length ? rows.map(row => '<tr class="profile-reference-row">' + definition.cells(row).map(cell => '<td>' + cell + '</td>').join('') + '</tr>').join('') : '<tr><td class="profile-record-empty" colspan="3"><span role="status">' + escapeText(emptyMessage || definition.empty || 'No records available.') + '</span></td></tr>';
    container.innerHTML = '<table class="profile-reference-table" aria-label="' + escapeText(definition.title + (id === 'bento-assets' ? ' (values in Malaysian ringgit)' : '')) + '">' + heading + '<tbody>' + body + '</tbody></table>';
  }

  function updateCount(id, visibleCount) {
    const total = window.PROFILE_RECORD_COUNTS[id];
    const label = visibleCount == null ? String(total) : visibleCount + ' / ' + total;
    document.querySelectorAll('[data-profile-count="' + id + '"]').forEach(element => {
      element.textContent = label;
    });
    if (id === 'bento-training') {
      const trainingCount = document.getElementById('dossierTrainingCount');
      if (trainingCount) trainingCount.textContent = label;
    }
  }

  window.filterDossierTraining = function (query) {
    const text = String(query || '').trim().toLocaleLowerCase();
    const rows = records['bento-training'].filter(row => !text || (row.title + ' ' + formatDate(row.date) + ' ' + row.date).toLocaleLowerCase().includes(text));
    renderTable('bento-training', rows, 'No training records match your search.');
    updateCount('bento-training', text ? rows.length : null);
  };

  window.renderProfileRecordSections = function () {
    Object.entries(records).forEach(([id, rows]) => {
      renderTable(id, rows);
      updateCount(id);
    });
    const search = document.getElementById('dossierTrainingSearch');
    if (search && search.value) window.filterDossierTraining(search.value);
  };

  function aggregate(rows, key, value) {
    const totals = new Map();
    rows.forEach(row => {
      const label = key(row);
      totals.set(label, (totals.get(label) || 0) + (value ? value(row) : 1));
    });
    return Array.from(totals, ([label, amount]) => ({ label, amount }));
  }

  const chartDefinitions = {
    'bento-career': {
      heading: 'Career Progression', description: 'Career records by movement type.', unit: 'records',
      entries: () => aggregate(records['bento-career'], row => row.movement)
    },
    'bento-performance': {
      heading: 'Performance History', description: 'Performance reviews by rating.', unit: 'reviews',
      entries: () => aggregate(records['bento-performance'], row => row.rating)
    },
    'bento-training': {
      heading: 'Training History', description: 'Training days by course year, including scheduled courses.', unit: 'days',
      entries: () => aggregate(records['bento-training'], row => row.date.slice(0, 4), row => row.days)
    },
    'bento-compliance': {
      heading: 'Disciplinary History', description: 'Disciplinary records by action.', unit: 'records',
      entries: () => aggregate(records['bento-compliance'], row => row.action)
    }
  };

  let returnFocus = null;

  function getChartDialog() {
    let dialog = document.getElementById('profileRecordChart');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'profileRecordChart';
    dialog.className = 'profile-chart-dialog';
    dialog.setAttribute('aria-labelledby', 'profileRecordChartHeading');
    dialog.setAttribute('aria-describedby', 'profileRecordChartDescription');
    dialog.innerHTML = '<div class="profile-chart-header"><h2 class="profile-chart-heading" id="profileRecordChartHeading"></h2><button class="profile-chart-close" type="button" aria-label="Close chart" autofocus><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><p class="profile-chart-description" id="profileRecordChartDescription"></p><div class="profile-chart-content"></div>';
    dialog.querySelector('.profile-chart-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus();
      returnFocus = null;
    });
    document.body.append(dialog);
    return dialog;
  }

  window.openProfileChart = function (categoryId) {
    const definition = chartDefinitions[categoryId];
    if (!definition) return;
    const dialog = getChartDialog();
    const entries = definition.entries();
    const max = Math.max(1, ...entries.map(entry => entry.amount));
    dialog.querySelector('.profile-chart-heading').textContent = definition.heading;
    dialog.querySelector('.profile-chart-description').textContent = definition.description;
    dialog.querySelector('.profile-chart-content').innerHTML = entries.length ? entries.map(entry => {
      const value = definition.unit === 'days' ? numberFormat.format(entry.amount) : String(entry.amount);
      const unit = entry.amount === 1 && definition.unit !== 'days' ? definition.unit.slice(0, -1) : definition.unit;
      return '<div class="profile-chart-row"><span class="profile-chart-label">' + escapeText(entry.label) + '</span><span class="profile-chart-value">' + escapeText(value + ' ' + unit) + '</span><div class="profile-chart-track" aria-hidden="true"><div class="profile-chart-bar" style="width: ' + (entry.amount / max * 100).toFixed(2) + '%"></div></div></div>';
    }).join('') : '<p class="profile-record-empty">No disciplinary records to chart.</p>';
    if (!dialog.open) {
      returnFocus = document.activeElement;
      dialog.showModal();
    }
  };
})();
