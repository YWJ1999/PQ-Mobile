// Backup assignments are local to a request in the mobile preview, separate from approval decisions.
const PendingApprovalBackup = (() => {
  const approvers = [
    { name: 'Angeline Loren Alan', empNo: 'EBB04', role: 'HR Manager' },
    { name: 'Jason Tan', empNo: 'EBB52', role: 'Team Lead' }
  ];
  const key = (scope, id) => 'peoplehcm:approval-backup:' + scope + ':' + id;
  function assigned(scope, id) {
    try {
      return JSON.parse(localStorage.getItem(key(scope, id)) || 'null');
    } catch {
      return null;
    }
  }

  function choose({ scope, id, empNo, reference = id, pool = approvers, isPending }, onSave) {
    const dialog = document.createElement('dialog');
    dialog.className = 'approval-backup-dialog';
    dialog.setAttribute('aria-label', 'Assign backup approver');
    dialog.innerHTML = `<form>
      <h2>Assign backup approver</h2><p class="approval-backup-reference"></p>
      <label>Backup approver<select required><option value="">Select an approver</option></select></label>
      <p class="approval-backup-error" role="alert" hidden></p>
      <footer><button type="button">Cancel</button><button type="submit">Assign backup</button></footer>
    </form>`;
    dialog.querySelector('.approval-backup-reference').textContent = reference;
    const select = dialog.querySelector('select');
    const eligible = pool.filter(person => person.empNo !== String(empNo).replace(/^#/, ''));
    for (const person of eligible) select.add(new Option(person.name, person.empNo));
    select.value = assigned(scope, id)?.empNo || '';
    const error = dialog.querySelector('[role="alert"]');
    function showError(message) { error.textContent = message; error.hidden = false; }
    if (!eligible.length) {
      showError('No backup approvers are available for this request.');
      dialog.querySelector('[type="submit"]').disabled = true;
    }
    dialog.querySelector('[type="button"]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const person = eligible.find(candidate => candidate.empNo === select.value);
      if (!person) return;
      try {
        if (!isPending()) { showError('This request is no longer pending.'); return; }
        localStorage.setItem(key(scope, id), JSON.stringify(person));
      } catch {
        showError('Unable to save the assignment. Please try again.');
        return;
      }
      onSave(person);
      dialog.close();
    };
    document.querySelector('.phone-container').append(dialog);
    dialog.showModal();
  }

  function addButton(grid, options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-btn-backup';
    button.textContent = 'Backup';
    grid.querySelector('.action-btn-approve, .btn-approve').after(button);
    grid.classList.add('pending-card-backup-actions');
    grid.dataset.actionCount = grid.children.length;
    grid.style.setProperty('--card-action-count', grid.children.length);
    const note = document.createElement('p');
    note.className = 'approval-backup-assignment';
    note.setAttribute('role', 'status');
    grid.before(note);
    function showAssignment(person) {
      note.hidden = !person;
      note.textContent = person ? 'Backup approver · ' + person.name : '';
    }
    showAssignment(assigned(options.scope, options.id));
    button.addEventListener('click', () => choose(options, showAssignment));
  }
  return { approvers, assigned, choose, addButton };
})();
