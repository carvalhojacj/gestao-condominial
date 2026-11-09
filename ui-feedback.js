'use strict';

function showPageMessage(message, type = 'success') {
  const target = document.getElementById('message');
  target.textContent = message;
  target.className = type;
  target.setAttribute('role', type === 'notice' ? 'alert' : 'status');
  target.setAttribute('aria-live', type === 'notice' ? 'assertive' : 'polite');
}

function clearFieldError(input) {
  if (!input || !input.hasAttribute('data-error-id')) return;
  const errorId = input.getAttribute('data-error-id');
  document.getElementById(errorId)?.remove();
  input.removeAttribute('aria-invalid');
  const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(value => value && value !== errorId);
  if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
  else input.removeAttribute('aria-describedby');
  input.removeAttribute('data-error-id');
}

function clearFormErrors(form) {
  form.querySelectorAll('[data-error-id]').forEach(clearFieldError);
}

function showFormError(form, field, message) {
  showPageMessage(message, 'notice');
  if (!field) {
    document.getElementById('message').focus();
    return;
  }
  const input = form.elements.namedItem(field) || document.getElementById(field);
  if (!(input instanceof HTMLElement) || !form.contains(input)) return;
  clearFieldError(input);
  const label = input.closest('label');
  if (label) {
    const error = document.createElement('span');
    error.className = 'field-error';
    error.id = `${form.id || form.dataset.directory || 'form'}-${field}-error`;
    error.textContent = message;
    label.append(error);
    input.setAttribute('data-error-id', error.id);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
  }
  input.focus();
  input.scrollIntoView({behavior: 'smooth', block: 'center'});
}

document.addEventListener('input', event => {
  if (event.target instanceof HTMLElement) clearFieldError(event.target);
});
document.addEventListener('change', event => {
  if (event.target instanceof HTMLElement) clearFieldError(event.target);
});
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
  if (link && link.getAttribute('href') !== '#main-content') showPageMessage('');
});

window.uiFeedback = {showPageMessage, clearFormErrors, showFormError};
