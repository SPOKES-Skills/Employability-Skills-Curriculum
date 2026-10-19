/** Pure helpers for the BeSpoke showcase chrome. No DOM, storage or state; inputs are never changed. */

// Mood grouping approved for the Pick a look filmstrip. A preset id missing here shows under All only.
export const MOODS = {
  calm: ['corner', 'plaque', 'light-hearted'],
  bold: ['fun', 'outspoken'],
  bright: ['modern', 'horizon', 'sidebar'],
  classic: ['professional', 'serious', 'masthead', 'columns']
};
export const MOOD_ORDER = ['calm', 'bold', 'bright', 'classic'];
export const MOOD_LABELS = { calm: 'Calm', bold: 'Bold', bright: 'Bright', classic: 'Classic' };

export const moodOf = presetId => MOOD_ORDER.find(mood => MOODS[mood].includes(presetId)) ?? null;

/** The lesson's name shows on slides until the team types a title of their own. */
export function displayTitle(design, { lessonTitle, defaultTitle }) {
  const title = design.samples.title;
  return !title.trim() || title === defaultTitle ? lessonTitle : title;
}

export const slideOptions = (design, { lessonTitle, defaultTitle, logoUrl }) =>
  ({ title: displayTitle(design, { lessonTitle, defaultTitle }), subtitle: design.samples.subtitle, lessonTitle, logoUrl });

export function lookDetail(catalog, presetId) {
  const preset = catalog.presets.find(item => item.id === presetId);
  if (!preset) return null;
  const { roles, fonts } = preset.design;
  const label = id => catalog.fonts.find(font => font.id === id)?.label ?? id;
  const ids = [...new Set([roles.titleBackground, roles.accent, roles.heading, roles.contentBackground])];
  return {
    id: preset.id,
    name: preset.colorLabel,
    layout: `${preset.label} layout`,
    fonts: `${label(fonts.heading)} headings with ${label(fonts.body)} text`,
    colors: ids.map(id => { const { name, hex } = catalog.palette.find(color => color.id === id); return { id, name, hex }; })
  };
}

const KIND_SHORT = { title: 'Title', divider: 'Divider', cards: 'Text boxes', video: 'Video', activity: 'Activity' };
// Effective style fields a team can change on a slide. Fields that only follow another field (watermark and extra text) are left out.
const TRACKED = ['primary', 'secondary', 'headingColor', 'bodyColor', 'headingFont', 'bodyFont', 'pattern', 'direction', 'patternStrength', 'headingSize', 'bodySize'];
const FONT_KEYS = ['headingFont', 'bodyFont'];
const SETTING_LABELS = { secondary: 'second background', pattern: 'texture', patternStrength: 'texture strength', direction: 'gradient direction', headingSize: 'heading size', bodySize: 'text size' };

function partName(kind, key) {
  const part = { primary: 'background', headingColor: 'heading', headingFont: 'heading', bodyColor: 'text', bodyFont: 'text' }[key];
  if (kind !== 'title') return part && `${KIND_SHORT[kind]} ${part}`;
  return { background: 'Title background', heading: 'Title text', text: 'Subtitle' }[part];
}

function changeLabel(catalog, kind, key, value) {
  const part = partName(kind, key);
  if (!part) return `${KIND_SHORT[kind]} ${SETTING_LABELS[key] ?? key} changed`;
  if (FONT_KEYS.includes(key)) return `${part} font ${catalog.fonts.find(font => font.id === value)?.label ?? value}`;
  return `${part} in ${catalog.palette.find(color => color.id === value)?.name ?? value}`;
}

/** Plain labels for what differs from the named look, in slide order. Sample words are ignored. */
export function designChanges(catalog, Model, design, presetId) {
  const base = Model.applyPreset(catalog, presetId, design);
  return Model.ROLE_STYLE_KINDS.flatMap(kind => {
    const now = Model.effectiveRoleStyle(catalog, design, kind);
    const was = Model.effectiveRoleStyle(catalog, base, kind);
    return TRACKED.filter(key => now[key] !== was[key]).map(key => changeLabel(catalog, kind, key, now[key]));
  });
}

/** The other slide kinds that move when this kind's shared color changes, read from the model itself. */
export function sharedParts(catalog, Model, design, kind, key) {
  const current = Model.effectiveRoleStyle(catalog, design, kind)[key];
  const probe = catalog.palette.find(color => color.id !== current);
  if (!probe || FONT_KEYS.includes(key)) return [];
  const after = Model.setSharedColor(catalog, design, kind, key, probe.id);
  return Model.ROLE_STYLE_KINDS.filter(other => other !== kind
    && Model.effectiveRoleStyle(catalog, design, other)[key] !== Model.effectiveRoleStyle(catalog, after, other)[key]);
}

export const changedKinds = (catalog, Model, before, after) => Model.ROLE_STYLE_KINDS.filter(kind =>
  JSON.stringify(Model.effectiveRoleStyle(catalog, before, kind)) !== JSON.stringify(Model.effectiveRoleStyle(catalog, after, kind)));

// Sorted keys, so two designs with the same content give the same key however they were built.
const sorted = (_, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : value;
export const designKey = design => JSON.stringify(design, sorted);

export const sentState = (lastReceipt, currentKey) => !lastReceipt ? 'none' : lastReceipt.designKey === currentKey ? 'sent' : 'changed';
