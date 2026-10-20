(function () {
  'use strict';
  const storageKey = 'peoplehcm_settings_v1';
  const defaults = Object.freeze({
    clockingMode: 'GPS',
    language: 'en-US',
    gpsTimeout: 10,
    gpsValidTime: 3,
    gpsRefreshRadius: 100,
    gpsTargetAccuracy: 10,
    gpsMaxAttempts: 5,
    gpsLastKnownLocation: false,
    beaconValidTime: 3,
    beaconDeveloperPanel: false
  });
  const form = document.getElementById('settingsForm');
  if (!form) return;
  const fields = Object.keys(defaults);
  const status = document.getElementById('settingsSaveStatus');
  const statusText = document.getElementById('settingsStatusText');
  let current = { ...defaults };
  let storageFailed = false;

  function validValue(key, value) {
    if (typeof defaults[key] === 'number') return Number.isSafeInteger(value) && value > 0;
    if (typeof defaults[key] === 'boolean') return typeof value === 'boolean';
    return [...form.elements.namedItem(key).options].some(option => option.value === value);
  }

  function showStatus(message, state = 'saved') {
    status.dataset.state = state;
    statusText.textContent = message;
    status.querySelector('i').className = state === 'error'
      ? 'fa-solid fa-circle-exclamation'
      : state === 'editing' ? 'fa-solid fa-pen' : 'fa-solid fa-circle-check';
  }

  function showFieldError(field, message = '') {
    const error = document.getElementById(field.name + 'Error');
    field.setAttribute('aria-invalid', String(Boolean(message)));
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
    field.closest('.settings-row').classList.toggle('has-error', Boolean(message));
  }

  function render() {
    fields.forEach(key => {
      const field = form.elements.namedItem(key);
      if (field.type === 'checkbox') field.checked = current[key];
      else field.value = current[key];
      showFieldError(field);
    });
  }

  function persist(next, message = 'Changes saved on this device') {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      current = next;
      storageFailed = false;
      showStatus(message);
      return true;
    } catch {
      storageFailed = true;
      showStatus('Unable to save. Allow browser storage and try again.', 'error');
      return false;
    }
  }

  function saveField(field) {
    const key = field.name;
    if (!fields.includes(key)) return;
    const value = field.type === 'checkbox' ? field.checked
      : field.type === 'number' ? field.valueAsNumber : field.value;
    if (!validValue(key, value)) {
      showFieldError(field, 'Enter a whole number greater than 0.');
      showStatus('Check the highlighted value. It has not been saved.', 'error');
      return;
    }
    showFieldError(field);
    // Invalid edits elsewhere never overwrite the last valid saved values.
    current = { ...current, [key]: value };
    if (persist(current) && form.querySelector('[aria-invalid="true"]')) {
      showStatus('Check the highlighted value. It has not been saved.', 'error');
    }
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid settings');
      let recovered = false;
      fields.forEach(key => {
        if (validValue(key, parsed[key])) current[key] = parsed[key];
        else recovered = true;
      });
      if (recovered) showStatus('Some saved values were invalid. Defaults are shown.', 'error');
    }
  } catch (error) {
    showStatus(error instanceof SyntaxError || error.message === 'Invalid settings'
      ? 'Saved settings could not be read. Defaults are shown.'
      : 'Browser storage is unavailable. Changes cannot be saved.', 'error');
  }
  render();

  form.addEventListener('change', event => saveField(event.target));
  form.addEventListener('input', event => {
    if (event.target.type !== 'number') return;
    // Keep temporary empty or incomplete input editable until the field is left.
    if (event.target.getAttribute('aria-invalid') === 'true') {
      showFieldError(event.target);
    }
    showStatus('Editing — changes save when you leave the field', 'editing');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    fields.forEach(key => saveField(form.elements.namedItem(key)));
  });

  document.getElementById('settingsReset').addEventListener('click', () => {
    if (persist({ ...defaults }, 'Default settings restored')) render();
  });

  document.getElementById('settingsBack').addEventListener('click', () => {
    const active = document.activeElement;
    if (form.contains(active) && active.name) saveField(active);
    const invalid = form.querySelector('[aria-invalid="true"]');
    if (invalid || storageFailed) {
      invalid?.focus();
      return;
    }
    // Returning Home is predictable for direct links and file:// previews alike.
    navTo('home');
  });
})();
