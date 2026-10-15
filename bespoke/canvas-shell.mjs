/**
 * The top bar is static markup in index.html. The one control that changes with
 * the stage is Send to Britt: a menu item while designing, the primary button
 * beside Save on Review. Moving the node keeps its id and its handler.
 */
export function syncStageChrome(stageId, doc = document) {
  const bar = doc.getElementById('barEnd');
  const save = doc.getElementById('btnSave');
  const send = doc.getElementById('btnSend');
  const menuAnchor = doc.getElementById('btnOpen');
  if (!bar || !save || !send || !menuAnchor) return;
  const onReview = stageId === 'review';
  if (onReview && send.parentElement !== bar) save.after(send);
  if (!onReview && send.parentElement === bar) menuAnchor.after(send);
  save.classList.toggle('btn-primary', !onReview);
  save.classList.toggle('btn-secondary', onReview);
  send.classList.toggle('btn-primary', onReview);
}
