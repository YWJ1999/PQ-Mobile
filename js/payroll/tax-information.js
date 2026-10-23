/* Read-only tax records, shared by the Payroll hub and its detail pages. */
(function () {
  'use strict';

  const config = window.PAYROLL_CONFIG || {};
  const information = config.taxInformation;
  const profile = information?.profile;
  const dependants = Array.isArray(information?.dependants) ? information.dependants : null;
  const text = value => value === null || value === undefined || String(value).trim() === '' ? 'Not provided' : String(value);
  const yesNo = value => value === true ? 'Yes' : value === false ? 'No' : 'Not provided';
  const count = value => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : text(value);

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderFields(id, fields) {
    const container = typeof id === 'string' ? document.getElementById(id) : id;
    if (!container) return;
    container.replaceChildren();
    fields.forEach(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = text(value);
      if (detail.textContent === 'Not provided') detail.className = 'tax-field-missing';
      row.append(term, detail);
      container.append(row);
    });
  }

  function formatDate(value) {
    if (!value) return 'Not provided';
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? 'Not provided' : new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(date);
  }

  function syncLinks() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    document.querySelectorAll('[data-tax-link]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('theme', theme);
      link.href = url.href;
    });
  }

  syncLinks();
  new MutationObserver(syncLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  setText('taxProfileSummary', profile?.maritalStatus ? `${profile.maritalStatus} · View tax details` : 'View tax details');
  setText('taxDependantsSummary', dependants ? `${dependants.length} registered ${dependants.length === 1 ? 'dependant' : 'dependants'}` : 'View registered dependants');

  const tabs = [...document.querySelectorAll('[data-tax-tab]')];
  function selectTab(name, updateUrl = true) {
    const activeName = name === 'dependants' ? 'dependants' : 'profile';
    tabs.forEach(tab => {
      const selected = tab.dataset.taxTab === activeName;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    const main = document.querySelector('.payroll-document-main');
    if (main) main.scrollTop = 0;
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeName);
      window.history.replaceState(window.history.state, '', url);
    }
  }

  if (tabs.length) {
    selectTab(new URLSearchParams(window.location.search).get('tab'), false);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab.dataset.taxTab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[next].dataset.taxTab);
        tabs[next].focus();
      });
    });
    window.addEventListener('popstate', () => selectTab(new URLSearchParams(window.location.search).get('tab'), false));
  }

  if (document.getElementById('taxPersonalFields')) {
    renderFields('taxPersonalFields', [
      ['Marital Status', profile?.maritalStatus],
      ['Handicap?', yesNo(profile?.handicap)],
      ['Tax Relief Children', count(profile?.taxReliefChildren)],
      ['Tax Exempt Children', count(profile?.taxExemptChildren)],
      ['Tax Number', config.employee?.taxNumber],
      ['Tax Branch', profile?.taxBranch]
    ]);
    renderFields('taxSpouseFields', [
      ['Spouse Name', profile?.spouseName],
      ['Spouse Working?', yesNo(profile?.spouseWorking)],
      ['Spouse Tax Number', profile?.spouseTaxNumber],
      ['Spouse Tax Branch', profile?.spouseTaxBranch]
    ]);
  }

  if (document.getElementById('taxDependantsList')) {
    const list = document.getElementById('taxDependantsList');
    setText('taxRecordCount', dependants ? `Total Records: ${dependants.length}` : 'Records unavailable');
    if (!dependants || !dependants.length) {
      const empty = document.createElement('div');
      empty.className = 'tax-empty';
      const heading = document.createElement('h2');
      const description = document.createElement('p');
      heading.textContent = dependants ? 'No registered dependants' : 'Dependant records unavailable';
      description.textContent = dependants ? 'Your registered dependants will appear here.' : 'Please try opening this page again later.';
      empty.append(heading, description);
      list.append(empty);
      return;
    }
    dependants.forEach((dependant, index) => {
      const card = document.createElement('article');
      card.className = 'tax-detail-card';
      const heading = document.createElement('h2');
      heading.id = `taxDependant${index}`;
      heading.textContent = text(dependant.name);
      card.setAttribute('aria-labelledby', heading.id);
      const fields = document.createElement('dl');
      fields.className = 'tax-detail-fields';
      renderFields(fields, [
        ['Relation', dependant.relation],
        ['Date of Birth', formatDate(dependant.dateOfBirth)],
        ['Birth Certificate', dependant.birthCertificate],
        ['NRIC / Passport', dependant.identityNumber],
        ['Tax Status', dependant.taxStatus]
      ]);
      card.append(heading, fields);
      list.append(card);
    });
  }
})();
