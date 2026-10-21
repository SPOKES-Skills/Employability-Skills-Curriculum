/**
 * The top bar is static markup in index.html. On Send the summary panel holds Save for the team and
 * Send to Britt, so the bar hides its Save there; Send to Britt always stays in the More menu.
 */
export function syncStageChrome(stageId, doc = document) {
  const save = doc.getElementById('btnSave');
  if (save) save.hidden = stageId === 'review';
}
