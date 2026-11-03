// The checked boxes in the current queue are the source of truth, including after a filter or tab change.
function mountPendingApprovalSelection(queue, selectAll, decide) {
  const phone = queue.closest('.phone-container');
  const bar = document.createElement('aside');
  bar.className = 'pending-selection-bar';
  bar.setAttribute('aria-label', 'Selected requests');
  bar.hidden = true;
  bar.innerHTML = '<strong aria-live="polite"><span>0</span> Selected</strong><div><button type="button" data-decision="reject">Reject</button><button type="button" data-decision="approve">Approve Selected</button></div>';
  phone.append(bar);

  const boxes = () => [...queue.querySelectorAll('.approval-card-checkbox:not(:disabled)')].filter(box => box.getClientRects().length);
  function sync() {
    const available = boxes();
    const count = available.filter(box => box.checked).length;
    selectAll.disabled = !available.length;
    selectAll.checked = count > 0 && count === available.length;
    selectAll.indeterminate = count > 0 && count < available.length;
    bar.querySelector('strong span').textContent = count;
    bar.hidden = !count;
    phone.classList.toggle('has-pending-selection', count > 0);
  }
  selectAll.addEventListener('change', () => {
    boxes().forEach(box => { box.checked = selectAll.checked; });
    sync();
  });
  queue.addEventListener('change', sync);
  new MutationObserver(sync).observe(queue, { childList: true });
  bar.addEventListener('click', event => {
    const button = event.target.closest('button[data-decision]');
    const checked = boxes().filter(box => box.checked);
    if (button && checked.length) decide(button.dataset.decision, checked);
    sync();
  });
  sync();
  return sync;
}
