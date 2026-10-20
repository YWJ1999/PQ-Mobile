(function () {
  'use strict';
  const form = document.getElementById('changePasswordForm');
  if (!form) return;
  const fields = ['currentPassword', 'newPassword', 'confirmPassword'].map(id => document.getElementById(id));
  const feedback = document.getElementById('passwordFeedback');
  const visibilityButtons = [...form.querySelectorAll('.password-visibility')];
  let submitted = false;

  function setError(field, message) {
    const error = document.getElementById(field.id + 'Error');
    field.setAttribute('aria-invalid', String(Boolean(message)));
    field.closest('.password-field').classList.toggle('has-error', Boolean(message));
    error.hidden = !message;
    error.textContent = message;
  }

  function validate() {
    const [current, next, confirmation] = fields;
    setError(current, current.value.length ? '' : 'Enter your current password.');
    setError(next, next.value.length ? '' : 'Enter a new password.');
    setError(confirmation, !confirmation.value.length
      ? 'Re-enter your new password.'
      : confirmation.value !== next.value ? 'The new passwords do not match.' : '');
    return fields.find(field => field.getAttribute('aria-invalid') === 'true');
  }

  function concealPasswords() {
    fields.forEach(field => { field.type = 'password'; });
    visibilityButtons.forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Show ' + button.dataset.label);
      button.querySelector('i').className = 'fa-regular fa-eye';
    });
  }

  visibilityButtons.forEach(button => {
    button.addEventListener('click', () => {
      const field = document.getElementById(button.getAttribute('aria-controls'));
      const reveal = field.type === 'password';
      field.type = reveal ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(reveal));
      button.setAttribute('aria-label', (reveal ? 'Hide ' : 'Show ') + button.dataset.label);
      button.querySelector('i').className = reveal ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  });

  form.addEventListener('input', () => {
    if (submitted) validate();
    feedback.textContent = '';
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    submitted = true;
    const invalid = validate();
    if (invalid) {
      feedback.dataset.state = 'error';
      feedback.textContent = 'Please check the highlighted fields.';
      invalid.focus();
      return;
    }

    // This HTML prototype has no account API. Never store passwords, issue a
    // request, or claim a password update succeeded without that integration.
    form.reset();
    concealPasswords();
    submitted = false;
    feedback.dataset.state = 'preview';
    feedback.textContent = 'No password was changed. Password updates are not connected in this preview.';
  });

  window.addEventListener('pagehide', () => {
    form.reset();
    concealPasswords();
    fields.forEach(field => setError(field, ''));
    feedback.textContent = '';
    submitted = false;
  });
})();
