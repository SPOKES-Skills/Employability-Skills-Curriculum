/**
 * Pick a look: a large stage with the current look, a side column naming it, and a filmstrip of the
 * twelve starting looks grouped by mood. Hover or focus previews a look; click or Enter applies it.
 * Talks to the builder only through its PickHost. Designs from the host are never changed here.
 */
import { MOODS, MOOD_ORDER, MOOD_LABELS, lookDetail } from './showcase-model.mjs';
import { CANVAS, frameSizer } from './slide-frame.mjs';
import { COORDINATOR_NOTE } from './coordinator-note.mjs';

const DECK = { divider: 'Divider', cards: 'Text boxes', video: 'Video', activity: 'Activity' };
const NEXT_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
// The cross-fade runs 200ms in CSS; the leaving copy is removed after this even if no animationend arrives.
const SWAP_FALLBACK_MS = 300;
// The chosen mood chip outlives a redraw within this page.
let mood = 'all';
let active = null;

const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

function button(id, cls, text, onClick, enabled) {
  const node = make('button', cls, text);
  node.type = 'button';
  node.id = id;
  node.disabled = !enabled;
  node.onclick = onClick;
  return node;
}

// Each render is drawn at one size and scaled to its box, so every slide keeps its real layout.
const sizer = frameSizer('--look-scale');
// Render styles inside shadow roots: the showcase canvas, as .look-frame > .bespoke-slide has in showcase.css.
const SHADOW_SLIDE = `.bespoke-slide{width:${CANVAS}px!important;max-width:none!important;min-height:calc(var(--show-h) * 1px)!important;margin:0!important;transform:scale(var(--look-scale,.16));transform-origin:top left}`;

// Stop sizing renders that are about to leave the page.
const forget = container => container.querySelectorAll('.look-frame, .look-thumb').forEach(node => sizer.forget(node));

function frame(cls, markup) {
  const box = make('div', 'look-frame ' + cls);
  box.innerHTML = markup;
  box.inert = true;
  sizer.observe(box);
  return box;
}

// Strip thumbnails carry their own look's styles, so they sit in their own shadow roots.
function thumbnail(host, design) {
  const box = make('span', 'look-thumb');
  box.setAttribute('aria-hidden', 'true');
  box.inert = true;
  const css = host.Model.cssForDesign(host.catalog, design, { canonical: false });
  box.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:block;aspect-ratio:var(--show-w) / var(--show-h);overflow:hidden}'
    + css + SHADOW_SLIDE + '</style>'
    + host.Model.renderSlide(host.catalog, design, 'title', host.options(design));
  sizer.observe(box);
  return box;
}

function appliedView(host) {
  const id = host.appliedLook();
  const detail = id ? lookDetail(host.catalog, id) : null;
  return { design: host.design(), detail, name: detail?.name ?? 'Your design', heading: detail ? 'Your starting look' : 'Choose a starting look' };
}

function fontOf(host, detail) {
  const preset = detail && host.catalog.presets.find(item => item.id === detail.id);
  const font = preset && host.catalog.fonts.find(item => item.id === preset.design.fonts.heading);
  return font ? `"${font.family}", ${font.fallback}` : '';
}

function fillSide(parts, host, view) {
  parts.heading.textContent = view.heading;
  parts.name.textContent = view.name;
  parts.name.style.fontFamily = fontOf(host, view.detail);
  parts.detail.textContent = view.detail ? `${view.detail.layout} · ${view.detail.fonts}` : 'Every choice stays editable.';
  parts.colors.replaceChildren(...(view.detail?.colors ?? []).map(color => {
    const item = make('li');
    const dot = make('span', 'look-dot');
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', color.name);
    dot.title = color.name;
    dot.style.background = color.hex;
    item.append(dot);
    return item;
  }));
  // Kept in the layout either way, so the strip below never moves under the pointer.
  parts.colors.style.visibility = view.detail ? '' : 'hidden';
}

// What a stage shows now, so the next swap can fade it out: its design, render scale and shape.
const shownOn = stage => {
  const hero = stage?.querySelector('.look-hero');
  return stage?.shown && { design: stage.shown, scale: hero?.style.getPropertyValue('--look-scale'), ratio: hero?.style.aspectRatio };
};

// The look leaving the stage. Slide styles on the page already show the new look, so this copy
// carries its own styles in a shadow root, the way strip thumbnails do.
function leavingLayer(host, previous) {
  const layer = make('div', 'look-frame look-hero look-leaving');
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  layer.style.setProperty('--look-scale', previous.scale || '.5');
  if (previous.ratio) layer.style.aspectRatio = previous.ratio;
  const css = host.Model.cssForDesign(host.catalog, previous.design, { canonical: false });
  layer.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:block}' + css + SHADOW_SLIDE + '</style>'
    + host.Model.renderSlide(host.catalog, previous.design, 'title', host.options(previous.design));
  return layer;
}

// Cross-fade: the new look sits underneath while the old one fades out on top (CSS, 200ms).
// Without motion, or when nothing changed, the stage simply shows the new look.
function showOnStage(host, stage, hero, design, previous) {
  stage.replaceChildren(hero);
  stage.shown = design;
  const changed = previous && JSON.stringify(previous.design) !== JSON.stringify(design);
  if (!changed || !matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const layer = leavingLayer(host, previous);
  const done = () => layer.remove();
  layer.addEventListener('animationend', done, { once: true });
  setTimeout(done, SWAP_FALLBACK_MS);
  stage.append(layer);
}

function fillStage(parts, host, view, previous = shownOn(parts.stage)) {
  const { Model, catalog } = host;
  const slide = kind => Model.renderSlide(catalog, view.design, kind, host.options(view.design));
  forget(parts.stage);
  forget(parts.deck);
  showOnStage(host, parts.stage, frame('look-hero', slide('title')), view.design, previous);
  parts.deck.replaceChildren(...Object.entries(DECK).map(([kind, label]) => {
    const mini = frame('look-mini', slide(kind));
    mini.title = label;
    return mini;
  }));
  fillSide(parts, host, view);
}

function buildSide(host) {
  const side = make('div', 'look-side');
  side.id = 'lookSide';
  const heading = make('h1', 'look-kicker');
  heading.id = 'lookStageHeading';
  heading.tabIndex = -1;
  const name = make('p', 'look-name');
  name.id = 'lookName';
  const detail = make('p', 'look-detail');
  const colors = make('ul', 'look-colors');
  colors.setAttribute('aria-label', 'Main colors');
  const deck = make('div', 'look-deck');
  deck.setAttribute('aria-hidden', 'true');
  const actions = make('div', 'look-actions');
  const undo = button('btnUndoLook', 'text-link', 'Undo', () => host.undoApply(), host.editable());
  undo.hidden = !host.canUndoApply();
  actions.append(button('btnMakeItOurs', 'btn btn-primary look-go', 'Make it ours →', () => host.makeItOurs(), host.editable()), undo);
  const live = make('p', 'sr-only');
  live.setAttribute('aria-live', 'polite');
  // Sets the expectation before design work starts; the team ticks it on Send.
  const note = make('p', 'coordinator-note look-coordinator', COORDINATOR_NOTE);
  note.id = 'lookCoordinator';
  side.append(heading, name, detail, note, colors, deck, actions, live);
  return { side, heading, name, detail, colors, deck, live };
}

function option(host, { id, look, label, design, selected, onApply }) {
  const card = make('div', 'look-card');
  card.id = id;
  if (look) card.dataset.look = look;
  card.setAttribute('role', 'option');
  card.setAttribute('aria-selected', String(selected));
  card.setAttribute('aria-label', label);
  if (!host.editable()) card.setAttribute('aria-disabled', 'true');
  card.tabIndex = -1;
  card.append(thumbnail(host, design), make('span', 'look-card-name', label));
  card.preview = { design, name: label, look };
  card.apply = () => { if (host.editable()) onApply(); };
  return card;
}

function buildCards(host) {
  const design = host.design(), applied = host.appliedLook(), snapshot = host.snapshot();
  const cards = [];
  if (snapshot) {
    const yours = option(host, { id: 'lookYours', label: 'Your design', design: snapshot, selected: !applied, onApply: () => host.applySnapshot() });
    yours.classList.add('look-yours');
    cards.push(yours);
  }
  for (const preset of host.catalog.presets) {
    const trial = host.Model.applyPreset(host.catalog, preset.id, design);
    cards.push(option(host, { id: 'preset-' + preset.id, look: preset.id, label: preset.colorLabel, design: trial, selected: preset.id === applied, onApply: () => host.apply(preset.id) }));
  }
  return cards;
}

const visibleCards = strip => [...strip.children].filter(card => !card.hidden);

function setRoving(strip) {
  const cards = visibleCards(strip);
  const current = cards.find(card => card.tabIndex === 0) ?? cards.find(card => card.getAttribute('aria-selected') === 'true') ?? cards[0];
  for (const card of strip.children) card.tabIndex = card === current ? 0 : -1;
}

function filterStrip(strip, chips) {
  for (const card of strip.children) card.hidden = mood !== 'all' && Boolean(card.dataset.look) && !MOODS[mood]?.includes(card.dataset.look);
  for (const chip of chips.querySelectorAll('[data-mood]')) chip.setAttribute('aria-pressed', String(chip.dataset.mood === mood));
  for (const card of strip.children) if (card.hidden) card.tabIndex = -1;
  setRoving(strip);
}

function buildMoods(host, strip) {
  const row = make('div', 'look-moods');
  const chips = make('div', 'look-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Moods');
  for (const [id, label] of [['all', `All ${host.catalog.presets.length}`], ...MOOD_ORDER.map(id => [id, MOOD_LABELS[id]])]) {
    const chip = button('', 'look-chip', label, () => { mood = id; filterStrip(strip, chips); }, true);
    chip.removeAttribute('id');
    chip.dataset.mood = id;
    chips.append(chip);
  }
  const paths = make('div', 'look-paths');
  paths.append(button('btnBuildOwn', 'text-link', 'Build my own', () => host.buildOwn(), host.editable()),
    button('btnGuideMe', 'text-link', 'Guide me', () => host.guideMe(), host.editable()));
  if (host.canResumeGuide()) paths.append(button('btnGuideContinue', 'text-link', 'Continue guide', () => host.resumeGuide(), host.editable()));
  row.append(chips, paths);
  return { row, chips };
}

function stripKeys(event, strip) {
  const card = event.target.closest('[role=option]');
  if (!card) return;
  const cards = visibleCards(strip), at = cards.indexOf(card);
  const target = event.key in NEXT_KEYS ? cards[at + NEXT_KEYS[event.key]] : event.key === 'Home' ? cards[0] : event.key === 'End' ? cards.at(-1) : null;
  if (target) {
    event.preventDefault();
    card.tabIndex = -1;
    target.tabIndex = 0;
    target.focus();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    card.apply();
  }
}

function wireStrip(strip, controller) {
  const card = event => event.target.closest?.('[role=option]');
  // Only a moving pointer previews. A preview can resize the side column and slide the strip under a resting
  // pointer; answering those layout-made pointerover events would flip between two looks every frame.
  strip.addEventListener('pointermove', event => { if (card(event)) controller.show(card(event)); });
  strip.addEventListener('focusin', event => { if (card(event)) controller.show(card(event)); });
  // Leaving the strip ends a hover preview. Focus can still sit on a card (a click puts it there), so the
  // stage goes back to that card, which is the applied look itself after a click-apply.
  strip.addEventListener('pointerleave', () => {
    const focused = strip.contains(document.activeElement) ? document.activeElement.closest('[role=option]') : null;
    if (focused) controller.show(focused);
    else controller.restore();
  });
  strip.addEventListener('focusout', event => { if (!strip.contains(event.relatedTarget)) controller.restore(); });
  strip.addEventListener('click', event => card(event)?.apply());
  strip.addEventListener('keydown', event => stripKeys(event, strip));
}

function previewController(parts, host, strip) {
  let showing = null;
  const mark = shown => { for (const item of strip.children) item.classList.toggle('is-previewing', item === shown); };
  return {
    show(card) {
      const same = card.dataset.look ? card.dataset.look === host.appliedLook() : !host.appliedLook();
      if (same) { this.restore(); return; }
      if (showing === card) return;
      showing = card;
      host.preview(card.preview.design);
      const detail = card.preview.look ? lookDetail(host.catalog, card.preview.look) : null;
      fillStage(parts, host, { design: card.preview.design, detail, name: card.preview.name, heading: 'Previewing ' + card.preview.name });
      parts.live.textContent = 'Previewing ' + card.preview.name;
      mark(card);
    },
    restore() {
      if (!showing) return;
      showing = null;
      host.preview(null);
      fillStage(parts, host, appliedView(host));
      parts.live.textContent = '';
      mark(null);
    }
  };
}

// One Escape handler for the page; it acts on whichever Pick a look is on screen.
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || event.defaultPrevented || !active?.root.isConnected || active.root.hidden) return;
  active.restore();
});

/** Draws Pick a look into root. Redrawing replaces everything inside root. */
export function renderPickALook(root, host) {
  const parts = buildSide(host);
  const stage = make('div', 'look-stage');
  stage.id = 'lookStage';
  const top = make('div', 'look-top');
  top.append(stage, parts.side);
  const strip = make('div', 'look-strip-cards');
  strip.id = 'lookStrip';
  strip.setAttribute('role', 'listbox');
  strip.setAttribute('aria-label', 'Starting looks');
  strip.setAttribute('aria-orientation', 'horizontal');
  strip.append(...buildCards(host));
  const moods = buildMoods(host, strip);
  const bottom = make('div', 'look-strip');
  bottom.append(moods.row, strip);
  parts.stage = stage;
  // An apply redraws the whole stage, so the look on the old stage is the one that fades out.
  fillStage(parts, host, appliedView(host), shownOn(root.querySelector('#lookStage')));
  const controller = previewController(parts, host, strip);
  wireStrip(strip, controller);
  filterStrip(strip, moods.chips);
  forget(root);
  root.replaceChildren(top, bottom);
  active = { root, restore: () => controller.restore() };
}

/** Empties root when the team leaves Pick a look. */
export function closePickALook(root) {
  forget(root);
  root.replaceChildren();
  active = null;
}
