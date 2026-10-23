/** Pure helpers for the docked canvas toolbar. No DOM access, no state. */

// Text selections show these in this order, left to right; preview-editor.mjs builds them in the same order.
export const TEXT_FIELDS = ['element', 'text', 'font', 'size', 'color', 'align', 'placement'];

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

// A compact band (below 1101px, or squeezed by the drawer) sends these to the drawer so it keeps two rows.
const COMPACT_DRAWER = ['text', 'placement'];

const isTextSelection = selected => selected.startsWith('heading') || selected.startsWith('body') || selected === 'extra';

/** True when a control for the selected element belongs on the docked toolbar. */
export function isQuickField(selected, fieldId, { compact = false } = {}) {
  if (isTextSelection(selected)) return TEXT_FIELDS.includes(fieldId) && !(compact && COMPACT_DRAWER.includes(fieldId));
  const key = selected.startsWith('box') ? 'box' : selected;
  return (QUICK_FIELDS[key] ?? ['element']).includes(fieldId);
}
