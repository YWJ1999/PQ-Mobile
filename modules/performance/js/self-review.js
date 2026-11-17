(() => {
  const $ = id => document.getElementById(id);
  $('selfReviewFields').replaceWith(PerformanceRequestForm.selfReviewCard());
  const form = $('selfReviewForm');
  let attachments = [];

  function syncBack() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const href = `../index.html?scope=individual&theme=${theme}`;
    $('selfReviewBack').href = href;
    $('selfReviewCancel').href = href;
  }

  function renderAttachments() {
    const list = $('selfReviewAttachments');
    list.replaceChildren();
    attachments.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'form-attachment-item';
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-paperclip form-attachment-file-icon';
      icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'form-attachment-file-name';
      name.textContent = file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'form-attachment-remove';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      const close = document.createElement('i');
      close.className = 'fa-solid fa-xmark';
      close.setAttribute('aria-hidden', 'true');
      remove.append(close);
      remove.addEventListener('click', () => {
        attachments.splice(index, 1);
        renderAttachments();
        $('selfReviewStatus').hidden = true;
        (list.querySelectorAll('button')[Math.min(index, attachments.length - 1)] || form.querySelector('[data-file-picker]')).focus();
      });
      row.append(icon, name, remove);
      list.append(row);
    });
  }

  form.querySelectorAll('[data-file-picker]').forEach(button => {
    const input = $(button.dataset.filePicker);
    button.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      attachments.push(...input.files);
      input.value = '';
      renderAttachments();
      $('selfReviewStatus').hidden = true;
    });
  });
  form.addEventListener('input', () => { $('selfReviewStatus').hidden = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const review = Object.fromEntries(new FormData(form));
    review.empNo = review.empNo.replace(/^#+/, '');
    review.comments = review.comments.trim();
    review.attachments = [...attachments];
    const submit = $('selfReviewSubmit');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      const files = await Promise.all(review.attachments.map(PerformanceSubmissions.attachment));
      PerformanceSubmissions.submit('self-review', {
        ...review, employeeCategory: review.category, appraisalStatus: review.status,
        supervisorComments: review.comments, attachments: files
      });
      form.dispatchEvent(new CustomEvent('selfreview:ready', { bubbles: true, detail: review }));
      $('selfReviewStatus').textContent = 'Self Review submitted successfully.';
    } catch {
      $('selfReviewStatus').textContent = 'Unable to save the submission. Your comments and attachments are still here.';
    } finally {
      submit.disabled = false;
    }
    $('selfReviewStatus').hidden = false;
  });
  new MutationObserver(syncBack).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  syncBack();
})();
