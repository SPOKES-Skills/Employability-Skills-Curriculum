/** Pure helpers for the floating canvas toolbar. No DOM access, no state. */

/**
 * Place a toolbar next to an anchor. Rects use one shared coordinate space whose
 * origin is the canvas's top-left corner. Prefers above the anchor, then below,
 * then pinned to the top margin; always clamped horizontally inside the canvas.
 */
export function computeToolbarPosition({anchor, canvas, toolbar, gap = 10, margin = 8}) {
  const maxLeft = Math.max(margin, canvas.width - toolbar.width - margin);
  const centered = anchor.left + anchor.width / 2 - toolbar.width / 2;
  const left = Math.min(Math.max(centered, margin), maxLeft);
  const above = anchor.top - toolbar.height - gap;
  const below = anchor.top + anchor.height + gap;
  if (above >= margin) return {left, top: above, placement: 'above'};
  if (below + toolbar.height <= canvas.height - margin) return {left, top: below, placement: 'below'};
  return {left, top: margin, placement: 'top'};
}

const TEXT_FIELDS = ['element', 'text', 'color', 'size', 'align', 'placement'];

// Field ids match the ids preview-editor.mjs gives each control. Everything not
// listed here lives in the Slide options drawer.
const QUICK_FIELDS = {
  background: ['element', 'finish', 'background', 'second'],
  box: ['element', 'background'],
  sidebar: ['element', 'background', 'color'],
  button: ['element', 'background', 'color'],
  accent: ['element', 'color'],
  logo: ['element', 'logo'],
  video: ['element', 'background'],
  activity: ['element', 'background'],
  titlebar: ['element', 'background'],
  watermark: ['element', 'watermark-text', 'color']
};

const isTextSelection = selected => selected.startsWith('heading') || selected.startsWith('body') || selected === 'extra';

/** True when a control for the selected element belongs on the floating toolbar. */
export function isQuickField(selected, fieldId) {
  if (isTextSelection(selected)) return TEXT_FIELDS.includes(fieldId);
  const key = selected.startsWith('box') ? 'box' : selected;
  return (QUICK_FIELDS[key] ?? ['element']).includes(fieldId);
}
