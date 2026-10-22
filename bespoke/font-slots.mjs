/** Two typefaces per lesson: per-slide and feature font fields name a slot, which resolves to a lesson font. No DOM or storage. */

// A slot is a saved font value that follows design.fonts, so changing a lesson font moves every slide on that slot.
// Font ids stay valid in saved designs (they still validate and render); the controls just stop offering them.
export const FONT_SLOTS = ['heading', 'body'];
export const ROLE_FONT_FIELDS = ['headingFont', 'bodyFont', 'extraFont', 'watermarkFont'];

const SLOT_LABELS = { heading: 'Heading font', body: 'Body font' };
const fontLabel = (catalog, id) => catalog.fonts.find(font => font.id === id)?.label ?? id;

/** A slot becomes the lesson font it names; a font id or 'inherit' passes through. */
export const resolveFont = (design, value) => FONT_SLOTS.includes(value) ? design.fonts[value] : value;

/** The only fonts a per-slide or feature control offers. */
export const fontSlotChoices = (catalog, design) => FONT_SLOTS.map(slot => ({ id: slot, label: `${SLOT_LABELS[slot]} · ${fontLabel(catalog, design.fonts[slot])}` }));

/**
 * Options and selected value for one font control.
 * saved: the stored value; slot: the slot an inherited value follows; effective: the font id it renders;
 * inherit: also offer Use shared font. A saved font id stays selectable so the control never shows a different font.
 */
export function fontControl(catalog, design, { saved, slot, effective, inherit = false }) {
  const choices = fontSlotChoices(catalog, design);
  const kept = catalog.fonts.some(font => font.id === saved) ? [{ id: saved, label: `${fontLabel(catalog, saved)} · saved choice` }] : [];
  const shared = inherit ? [{ id: 'inherit', label: `Use shared font · ${fontLabel(catalog, design.fonts[slot])}` }] : [];
  const rendered = [slot, ...FONT_SLOTS].find(candidate => design.fonts[candidate] === effective) ?? slot;
  const value = saved === 'inherit' ? (inherit ? 'inherit' : rendered) : saved;
  return { options: [...shared, ...choices, ...kept], value };
}
