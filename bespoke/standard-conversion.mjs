/** Brings a saved design to the SPOKES design standard when it is opened. Page only: no DOM, storage or service use. */
import { RETIRED_IDS } from './background-structures.mjs';
import { FONT_SLOTS } from './font-slots.mjs';
import { backgroundEntry } from './builder-model.mjs';

// Where a font id goes when it matches neither lesson font: headings and marks take the heading slot, running text the body slot.
const ROLE_FONT_FIELDS = {
  headingFont: { slot: 'heading', name: 'heading font' },
  bodyFont: { slot: 'body', name: 'body font' },
  extraFont: { slot: 'body', name: 'added text font' },
  watermarkFont: { slot: 'heading', name: 'watermark font' }
};
const FEATURE_NAMES = { sidebar: 'Navigation sidebar', button: 'Action buttons' };
const clone = value => JSON.parse(JSON.stringify(value));
const isFontId = value => typeof value === 'string' && value !== 'inherit' && !FONT_SLOTS.includes(value);
const fontLabel = (catalog, id) => catalog.fonts.find(font => font.id === id)?.label ?? id;
const retired = value => RETIRED_IDS.includes(value);

/**
 * A copy of the design with every retired background set to Plain and every font id turned into a slot.
 * A font id that already matches a lesson font follows that slot silently, since nothing visible changes.
 * Returns {design, changes}; changes is empty when the team has nothing to review. The input is never mutated.
 */
export function convertToStandard(catalog, design) {
  const next = clone(design), changes = [];
  const slideLabel = kind => catalog.slideGroups.find(group => group.id === kind)?.label ?? kind;
  const lessonSlot = id => id === design.fonts.heading ? 'heading' : id === design.fonts.body ? 'body' : null;
  const toSlot = (owner, field, fallback, label) => {
    const matched = lessonSlot(owner[field]), target = matched || fallback;
    if (!matched) changes.push(`${label} ${fontLabel(catalog, owner[field])} is now the lesson ${target} font.`);
    owner[field] = target;
  };
  if (retired(next.background)) {
    changes.push(`Background ${backgroundEntry(catalog, next.background).label} is now Plain.`);
    next.background = 'plain';
  }
  for (const [kind, style] of Object.entries(next.roleStyles || {})) {
    if (retired(style.pattern)) {
      changes.push(`${slideLabel(kind)} background detail ${backgroundEntry(catalog, style.pattern).label} is now Plain.`);
      style.pattern = 'plain';
    }
    for (const [field, { slot, name }] of Object.entries(ROLE_FONT_FIELDS)) {
      if (isFontId(style[field])) toSlot(style, field, slot, `${slideLabel(kind)} ${name}`);
    }
  }
  for (const [feature, style] of Object.entries(next.featureStyles || {})) {
    if (isFontId(style.font)) toSlot(style, 'font', 'body', `${FEATURE_NAMES[feature] || feature} font`);
  }
  return { design: next, changes };
}

/** The strip text for a conversion, or an empty string when nothing changed. */
export const conversionNote = changes => changes.length ? `Updated this design to the SPOKES design standard: ${changes.join(' ')} Review it before saving.` : '';

/** The other option of a two-option design is converted the same way, so switching options never brings a retired value back. */
export function convertAlternatives(catalog, alternatives) {
  if (!alternatives) return { alternatives: null, changes: [] };
  const { design, changes } = convertToStandard(catalog, alternatives.otherDesign), letter = alternatives.active === 'A' ? 'B' : 'A';
  return { alternatives: { ...clone(alternatives), otherDesign: design }, changes: changes.map(change => `Option ${letter}: ${change}`) };
}
