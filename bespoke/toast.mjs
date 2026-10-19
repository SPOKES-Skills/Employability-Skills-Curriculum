// One short message in view, for good news. Warnings stay in the page-top strip.
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
    toast.hidden = true;
    document.body.append(toast);
  }
  return toast;
}

export function showToast(message, {ms = DEFAULT_MS} = {}) {
  const toast = toastElement();
  clearTimeout(hideTimer);
  toast.hidden = false;
  toast.textContent = message;
  hideTimer = setTimeout(() => {
    toast.hidden = true;
    toast.textContent = '';
  }, ms);
}
