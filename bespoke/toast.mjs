// One short message in view, for good news. Warnings stay in the page-top strip.
// #toast stays rendered (never display:none) so screen readers announce text set into it.
const DEFAULT_MS = 4000;
let hideTimer = null;

function toastElement() {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('p');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  return toast;
}

export function showToast(message, {ms = DEFAULT_MS} = {}) {
  const toast = toastElement();
  clearTimeout(hideTimer);
  toast.classList.add('is-visible');
  toast.textContent = message;
  hideTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.textContent = '';
  }, ms);
}
