/** Make it yours copy and rail marks: what a change touches, where the design started, which slides moved. */
import {sharedParts, partName, designChanges, KIND_SHORT} from './showcase-model.mjs';

const SLIDE_NAMES = {title: 'Title slide', divider: 'Chapter divider', cards: 'Text boxes', video: 'Video slide', activity: 'Activity'};
// These parts are one shared setting on every slide that has them.
const ALWAYS_SHARED = {sidebar: 'sidebar', accent: 'accent', button: 'buttons'};
const SHARED_KEYS = ['primary', 'secondary', 'headingColor', 'bodyColor'];
export const SHARED_LINE_END = ', because they share a color.';
const MAX_PARTS = 3;

// The parts with their separators: "A", "A and B", "A, B and C", or "A, B, C and 2 more".
function listItems(parts) {
  const shown = parts.slice(0, MAX_PARTS), more = parts.length - shown.length;
  const before = i => (i === 0 ? [] : [more || i < shown.length - 1 ? ', ' : ' and ']);
  return [...shown.flatMap((part, i) => [...before(i), part]), ...(more ? [` and ${more} more`] : [])];
}

export const listParts = parts => listItems(parts).join('');

const partLabel = (kind, key) => partName(kind, key) ?? `${KIND_SHORT[kind]} second color`;

// The slide name in a part is bold: "Divider heading" becomes [{strong: 'Divider'}, ' heading'].
function partParts(kind, key) {
  const label = partLabel(kind, key), short = KIND_SHORT[kind];
  return label.startsWith(`${short} `) ? [{strong: short}, label.slice(short.length)] : [{strong: label}];
}

/**
 * One plain line about the selected part's color, as strings and {strong} slide names. Empty when the color
 * reaches no other slide.
 */
export function scopeLineParts({catalog, Model, design, kind, selected, key, onlySlide}) {
  if (ALWAYS_SHARED[selected]) return [`Changes the ${ALWAYS_SHARED[selected]} on every slide.`];
  if (!SHARED_KEYS.includes(key)) return [];
  if (onlySlide) return [`This color stays on the ${SLIDE_NAMES[kind]} only.`];
  const others = sharedParts(catalog, Model, design, kind, key);
  if (!others.length) return [];
  const value = Model.effectiveRoleStyle(catalog, design, kind)[key];
  const color = catalog.palette.find(item => item.id === value)?.name ?? value;
  return [`${color} also changes the `, ...listItems(others.map(other => partParts(other, key))).flat(), SHARED_LINE_END];
}

const partText = part => (typeof part === 'string' ? part : part.strong);

/** The scope line as plain text. */
export const scopeLine = args => scopeLineParts(args).map(partText).join('');

/** Fills a node with scope line parts, slide names in <strong>. Returns the plain text. */
export function renderScopeParts(node, parts) {
  node.replaceChildren(...parts.map(part => {
    if (typeof part === 'string') return part;
    const strong = document.createElement('strong');
    strong.textContent = part.strong;
    return strong;
  }));
  return parts.map(partText).join('');
}

/** The applied look's name and the number of settings changed since; no name when the look is unknown. */
export function startingFrom(catalog, Model, design, look) {
  const preset = catalog.presets.find(item => item.id === look);
  if (!preset) return {name: null, count: 0};
  return {name: preset.colorLabel, count: designChanges(catalog, Model, design, preset.id).length};
}

/** Fills the text part of the Starting from line. The Swap button beside it is static markup. */
export function renderStartingFrom(node, {name, count}) {
  if (!name) return void node.replaceChildren('Your design');
  const strong = document.createElement('b');
  strong.textContent = name;
  const tail = count ? ` · ${count} ${count === 1 ? 'change' : 'changes'}` : '';
  node.replaceChildren('Starting from ', strong, tail);
}

/** Tags rail thumbnails whose slide changed during this visit to the stage. */
export function markRail(rail, kinds) {
  for (const button of rail.querySelectorAll('[data-rail-kind]')) {
    const tag = button.querySelector('.changed-tag');
    if (!kinds.has(button.dataset.railKind)) { tag?.remove(); continue; }
    if (tag) continue;
    const next = document.createElement('span');
    next.className = 'changed-tag';
    next.textContent = 'changed';
    button.append(next);
  }
}

/** A one-second glow on thumbnails that just changed; CSS turns the glow off under reduced motion. */
export function pulseRail(rail, kinds, ms = 1000) {
  for (const kind of kinds) {
    const button = rail.querySelector(`[data-rail-kind="${kind}"]`);
    if (!button) continue;
    button.classList.add('just-changed');
    setTimeout(() => button.classList.remove('just-changed'), ms);
  }
}
