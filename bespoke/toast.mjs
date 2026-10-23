// One short message in view, for good news. Warnings stay in the page-top strip.
// #toast stays rendered (never display:none) so screen readers announce text set into it.
const DEFAULT_MS = 4000;
// Matches the 180ms toast transition in showcase.css.
const FADE_MS = 180;
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
    // The words stay while the toast fades out, then the region is emptied.
    hideTimer = setTimeout(() => { toast.textContent = ''; }, FADE_MS);
  }, ms);
}
