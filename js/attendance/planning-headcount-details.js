function matchesPlanningEmployee(employee, keyword) {
  const query = keyword.trim().toLowerCase();
  const id = query.replace(/^#/, '');
  return !query || employee.name.toLowerCase().includes(query) || (id.length > 0 && employee.id.toLowerCase().includes(id));
}

customElements.define('planning-headcount-details', class extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    this.innerHTML = `
      <header class="approval-page-header">
        <phone-status-bar time="9:41"></phone-status-bar>
        <div class="approval-page-heading">
          <button type="button" data-history-back aria-label="Back to planning summary"></button>
          <h1 id="headcountDetailTitle" tabindex="-1">Headcount Details</h1>
        </div>
      </header>
      <div class="history-record-content planning-detail-content">
        <button type="button" class="enterprise-toast-bar planning-filter" id="headcountFilterButton"
                aria-haspopup="dialog" aria-controls="headcountFilterDialog" aria-expanded="false">
          <span class="planning-filter-copy">
            <span class="enterprise-toast-label">Current filter</span>
            <span class="enterprise-toast-value" hidden><span id="headcountFilterText"></span></span>
          </span>
          <span class="enterprise-toast-btn filter-trigger-btn" aria-hidden="true"><i class="fa-solid fa-sliders"></i></span>
        </button>
        <dl class="history-card-item record-summary-card planning-detail-facts headcount-facts">
          <div><dt>Job title</dt><dd id="headcountDetailJobTitle"></dd></div>
          <div><dt>Shift</dt><dd id="headcountDetailShift"></dd></div>
          <div><dt>Headcount</dt><dd id="headcountDetailCount"></dd></div>
        </dl>
        <div class="summary-table-card">
          <table class="planning-detail-table headcount-employee-table" id="headcountEmployeeTable" aria-label="Employees in this headcount">
            <thead><tr><th scope="col">Emp No.</th><th scope="col">Name</th></tr></thead>
            <tbody id="headcountEmployeeRows"></tbody>
          </table>
          <p class="planning-detail-empty" id="headcountEmpty" hidden></p>
        </div>
      </div>
      <dialog class="planning-employee-filter" id="headcountFilterDialog" aria-labelledby="headcountFilterTitle">
        <form method="dialog">
          <div class="sheet-header">
            <h2 class="sheet-title" id="headcountFilterTitle">Filter</h2>
            <button type="button" class="sheet-close-btn" aria-label="Close filter"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sheet-body">
            <label for="headcountFilterKeyword">Employee name or ID</label>
            <input type="search" id="headcountFilterKeyword" autocomplete="off" enterkeyhint="search" autofocus>
          </div>
          <div class="sheet-footer">
            <button type="reset" class="btn-secondary">Reset</button>
            <button type="submit" class="btn-primary">Apply filter</button>
          </div>
        </form>
      </dialog>`;

    const filter = this.querySelector('#headcountFilterButton');
    const dialog = this.querySelector('dialog');
    const search = dialog.querySelector('input');
    filter.onclick = () => {
      search.value = this.keyword;
      filter.setAttribute('aria-expanded', 'true');
      dialog.showModal();
    };
    dialog.querySelector('.sheet-close-btn').onclick = () => dialog.close();
    dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
    dialog.onclose = () => filter.setAttribute('aria-expanded', 'false');
    const form = dialog.querySelector('form');
    form.onsubmit = () => this.filterEmployees(search.value);
    form.onreset = () => this.filterEmployees('');
  }

  static get observedAttributes() { return ['hidden']; }

  attributeChangedCallback() {
    if (this.hidden) this.querySelector('dialog[open]')?.close();
  }

  render({ jobTitle, shift, employees, headcount = employees.length }) {
    this.employees = employees;
    this.headcount = headcount;
    this.querySelector('#headcountDetailJobTitle').textContent = jobTitle;
    this.querySelector('#headcountDetailShift').textContent = shift;
    this.querySelector('#headcountFilterButton').disabled = employees.length === 0;
    this.filterEmployees('');
    return this;
  }

  filterEmployees(keyword) {
    this.keyword = keyword.trim();
    const employees = this.employees.filter(employee => matchesPlanningEmployee(employee, this.keyword));
    const rows = this.querySelector('tbody');
    rows.replaceChildren();
    for (const employee of employees) {
      const row = rows.insertRow();
      row.insertCell().textContent = formatEmployeeNumber(employee.id);
      row.insertCell().textContent = employee.name;
    }
    const missingRoster = this.headcount > 0 && this.employees.length === 0;
    this.querySelector('#headcountDetailCount').textContent = this.keyword ? employees.length : this.headcount;
    const empty = this.querySelector('#headcountEmpty');
    empty.hidden = employees.length > 0;
    empty.textContent = missingRoster ? 'Employee details are unavailable for this group.' : 'No employees match this selection.';
    const text = this.querySelector('#headcountFilterText');
    text.textContent = this.keyword;
    text.parentElement.hidden = !this.keyword;
    this.querySelector('#headcountFilterButton').classList.toggle('has-filters', Boolean(this.keyword));
  }
});
