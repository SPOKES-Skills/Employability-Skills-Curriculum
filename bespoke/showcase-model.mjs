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

export const KIND_SHORT = { title: 'Title', divider: 'Divider', cards: 'Text boxes', video: 'Video', activity: 'Activity' };
// Effective style fields that are not compared: sample words. Watermark and extra-text colors and fonts follow the
// heading and body fields, so they count only when the team set them directly (see explicitFollowers).
const FOLLOWERS = ['watermarkColor', 'watermarkFont', 'extraColor', 'extraFont'];
const isTracked = key => key !== 'boxHeadings' && !FOLLOWERS.includes(key) && !key.endsWith('Text');
const isFont = key => key.endsWith('Font');
const SETTING_LABELS = { secondary: 'second background', pattern: 'background detail', patternStrength: 'detail size', direction: 'gradient direction', headingSize: 'heading size', bodySize: 'text size' };
const FEATURE_NAMES = { sidebar: 'Sidebar', button: 'Button', box: 'Text box', titlebar: 'Title bar', video: 'Video frame', activity: 'Activity box' };
const words = key => key.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`);

export function partName(kind, key) {
  if (FOLLOWERS.includes(key)) return `${KIND_SHORT[kind]} ${key.startsWith('watermark') ? 'watermark' : 'extra text'}`;
  const part = { primary: 'background', headingColor: 'heading', headingFont: 'heading', bodyColor: 'text', bodyFont: 'text' }[key];
  if (kind !== 'title') return part && `${KIND_SHORT[kind]} ${part}`;
  return { background: 'Title background', heading: 'Title text', text: 'Subtitle' }[part];
}

function changeLabel(catalog, kind, key, value) {
  const part = partName(kind, key);
  if (!part) return `${KIND_SHORT[kind]} ${SETTING_LABELS[key] ?? words(key)} changed`;
  if (isFont(key)) return `${part} font ${catalog.fonts.find(font => font.id === value)?.label ?? value}`;
  return `${part} in ${catalog.palette.find(color => color.id === value)?.name ?? value}`;
}

// A follower counts when the saved value on the slide differs from the look's; 'inherit' and absent both mean "follows".
const explicitFollowers = (design, base, kind) => FOLLOWERS.filter(key => {
  const saved = source => { const value = source.roleStyles?.[kind]?.[key]; return value === 'inherit' ? undefined : value; };
  return saved(design) !== saved(base);
});

const differing = (now = {}, was = {}) => [...new Set([...Object.keys(now), ...Object.keys(was)])].filter(key => JSON.stringify(now[key]) !== JSON.stringify(was[key]));

/** Plain labels for what differs from the named look, in slide order, then the shared parts. Sample words are ignored. */
export function designChanges(catalog, Model, design, presetId) {
  const base = Model.applyPreset(catalog, presetId, design);
  // Slide layout choices feed some effective fields, so read those with the look's own choices and report layout choices on their own.
  const isolated = { ...design, slides: base.slides };
  const slideChanges = Model.ROLE_STYLE_KINDS.flatMap(kind => {
    const layout = differing(design.slides?.[kind], base.slides?.[kind]).map(key => `${KIND_SHORT[kind]} ${words(key)} changed`);
    const now = Model.effectiveRoleStyle(catalog, isolated, kind);
    const was = Model.effectiveRoleStyle(catalog, base, kind);
    const changed = [...Object.keys(now).filter(key => isTracked(key) && now[key] !== was[key]), ...explicitFollowers(design, base, kind)];
    return [...layout, ...changed.map(key => changeLabel(catalog, kind, key, now[key]))];
  });
  const features = Object.keys(FEATURE_NAMES).flatMap(feature => {
    // A saved feature fills its other fields with 'inherit', so a missing field counts as 'inherit'.
    const saved = style => key => style?.[key] ?? 'inherit';
    const now = saved(design.featureStyles?.[feature]), was = saved(base.featureStyles?.[feature]);
    const keys = differing(design.featureStyles?.[feature], base.featureStyles?.[feature]).filter(key => now(key) !== was(key));
    return keys.map(key => `${FEATURE_NAMES[feature]} ${key} changed`);
  });
  return [...slideChanges, ...features];
}

/** The other slide kinds that move when this kind's shared color changes, read from the model itself. */
export function sharedParts(catalog, Model, design, kind, key) {
  const current = Model.effectiveRoleStyle(catalog, design, kind)[key];
  const probe = catalog.palette.find(color => color.id !== current);
  if (!probe || isFont(key)) return [];
  const after = Model.setSharedColor(catalog, design, kind, key, probe.id);
  return Model.ROLE_STYLE_KINDS.filter(other => other !== kind
    && Model.effectiveRoleStyle(catalog, design, other)[key] !== Model.effectiveRoleStyle(catalog, after, other)[key]);
}

// Shared parts and the slide classes that show them. A slide kind shows a part when its render holds one of these.
const FEATURE_CLASSES = { sidebar: 'slide-sidebar', button: 'slide-button', box: 'slide-card', titlebar: 'slide-title-bar', video: 'slide-video-frame', activity: 'slide-activity' };
const ACCENT_CLASSES = ['slide-accent', 'sample-chapter', 'sample-slide-name', 'slide-title-bar', 'slide-card', 'slide-video-frame', 'slide-activity'];
const classesOf = html => new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)));

// Everything that paints one slide kind: its own style and layout, plus the shared accent and features it shows.
function kindLook(catalog, Model, design, kind, shown) {
  const features = Object.keys(FEATURE_CLASSES).filter(feature => shown.has(FEATURE_CLASSES[feature]));
  return JSON.stringify({
    style: Model.effectiveRoleStyle(catalog, design, kind),
    slides: design.slides?.[kind],
    accent: ACCENT_CLASSES.some(name => shown.has(name)) ? design.roles.accent : null,
    features: features.map(feature => Model.effectiveFeatureStyle(catalog, design, feature))
  });
}

/** Slide kinds whose rendered look differs between two designs. */
export const changedKinds = (catalog, Model, before, after) => Model.ROLE_STYLE_KINDS.filter(kind => {
  const shown = new Set([...classesOf(Model.renderSlide(catalog, before, kind)), ...classesOf(Model.renderSlide(catalog, after, kind))]);
  return kindLook(catalog, Model, before, kind, shown) !== kindLook(catalog, Model, after, kind, shown);
});

// Sorted keys, so two designs with the same content give the same key however they were built.
const sorted = (_, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : value;
export const designKey = design => JSON.stringify(design, sorted);

export const sentState = (lastReceipt, currentKey) => !lastReceipt ? 'none' : lastReceipt.designKey === currentKey ? 'sent' : 'changed';

// The words a team types on slides. Model.applyPreset keeps the same fields when a look is applied.
const TYPED_WORDS = ['headingText', 'bodyText', 'labelText', 'watermarkText', 'extraText', 'boxHeadings'];

/** The base design with the team's sample words: their samples, and any typed slide words that differ from the defaults. */
export function withSampleWords(catalog, Model, base, current) {
  const next = { ...structuredClone(base), samples: structuredClone(current.samples) };
  for (const [kind, style] of Object.entries(current.roleStyles ?? {})) {
    const defaults = Model.roleStyleDefaults(catalog, base, kind);
    const words = TYPED_WORDS.filter(key => style[key] !== undefined && style[key] !== defaults[key])
      .map(key => [key, structuredClone(style[key])]);
    if (words.length) next.roleStyles = { ...next.roleStyles, [kind]: { ...defaults, ...base.roleStyles?.[kind], ...Object.fromEntries(words) } };
  }
  return next;
}
