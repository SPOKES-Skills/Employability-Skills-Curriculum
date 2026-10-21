import assert from 'node:assert/strict';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import * as Model from '../bespoke/builder-model.mjs';
import { MOODS, MOOD_ORDER, MOOD_LABELS, moodOf, displayTitle, slideOptions, lookDetail, designChanges, sharedParts, changedKinds, designKey, sentState } from '../bespoke/showcase-model.mjs';

let failed = false;
const test = (name, fn) => {
  try { fn(); console.log(`ok - ${name}`); } catch (error) { failed = true; console.error(`not ok - ${name}\n${error.stack}`); }
};

const def = Model.defaultDesign(catalog);
// 'fun' already has gold title text, so setting gold on it changes nothing; 'professional' has mauve title text.
const d = Model.applyPreset(catalog, 'professional', def);
const e = Model.setSharedColor(catalog, d, 'title', 'headingColor', 'gold');

test('every preset has exactly one mood', () => {
  assert.equal(Object.values(MOODS).flat().length, 12);
  for (const { id } of catalog.presets) assert.equal(Object.values(MOODS).filter(ids => ids.includes(id)).length, 1, id);
  assert.deepEqual(MOOD_ORDER, ['calm', 'bold', 'bright', 'classic']);
  assert.equal(MOOD_LABELS.calm, 'Calm');
  assert.equal(moodOf('fun'), 'bold');
  assert.equal(moodOf('nope'), null);
});

test('displayTitle uses the lesson name until the team types one', () => {
  const options = { lessonTitle: 'Money Management', defaultTitle: def.samples.title };
  assert.equal(displayTitle(def, options), 'Money Management');
  assert.equal(displayTitle({ ...def, samples: { ...def.samples, title: 'Our budget' } }, options), 'Our budget');
  assert.equal(displayTitle({ ...def, samples: { ...def.samples, title: '   ' } }, options), 'Money Management');
  const slide = slideOptions(def, { ...options, logoUrl: 'logo.png' });
  assert.deepEqual(slide, { title: 'Money Management', subtitle: def.samples.subtitle, lessonTitle: 'Money Management', logoUrl: 'logo.png' });
});

test('lookDetail names the look in plain words', () => {
  const look = lookDetail(catalog, 'fun');
  assert.equal(look.name, 'Midnight & gold');
  assert.equal(look.layout, 'Framed layout');
  assert.match(look.fonts, / headings with .+ text$/);
  assert.ok(look.colors.length > 0 && look.colors.every(c => c.id && c.name && /^#/.test(c.hex)));
  assert.equal(lookDetail(catalog, 'nope'), null);
});

test('designChanges lists a shared title color change on both slides', () => {
  assert.deepEqual(designChanges(catalog, Model, e, 'professional'), ['Title text in Gold', 'Divider heading in Gold']);
  assert.deepEqual(designChanges(catalog, Model, d, 'professional'), []);
});

test('designChanges sees edits that are not colors or fonts, one label per edit', () => {
  const only = (design, ...labels) => assert.deepEqual(designChanges(catalog, Model, design, 'professional'), labels);
  only(Model.setRoleStyle(catalog, d, 'title', 'headingAlignment', 'right'), 'Title heading alignment changed');
  only(Model.setRoleStyle(catalog, d, 'cards', 'bodyPlacement', 'bottom'), 'Text boxes body placement changed');
  only(Model.setRoleStyle(catalog, d, 'divider', 'backgroundMode', 'gradient'), 'Divider background mode changed');
  only(Model.setRoleStyle(catalog, d, 'cards', 'labelVisible', false), 'Text boxes label visible changed');
  const layout = catalog.slideGroups.find(group => group.id === 'title').decisions.find(item => item.id === 'layout');
  const other = layout.options.find(option => option.id !== d.slides.title.layout).id;
  only({ ...d, slides: { ...d.slides, title: { ...d.slides.title, layout: other } } }, 'Title layout changed');
  only(Model.setFeatureStyle(catalog, d, 'sidebar', 'color', 'gold'), 'Sidebar color changed');
  // Sample words never count as a change.
  only({ ...d, samples: { ...d.samples, title: 'Our budget' } });
  only(Model.setRoleStyle(catalog, d, 'divider', 'headingText', 'Next steps'));
});

test('designChanges counts a watermark or extra text color only when the team set it', () => {
  const only = (design, ...labels) => assert.deepEqual(designChanges(catalog, Model, design, 'professional'), labels);
  only(Model.setRoleStyle(catalog, d, 'title', 'watermarkColor', 'gold'), 'Title watermark in Gold');
  only(Model.setRoleStyle(catalog, d, 'divider', 'watermarkFont', 'outfit'), 'Divider watermark font Outfit');
  only(Model.setRoleStyle(catalog, d, 'cards', 'extraColor', 'gold'), 'Text boxes extra text in Gold');
  only(Model.setRoleStyle(catalog, d, 'activity', 'extraFont', 'outfit'), 'Activity extra text font Outfit');
  // Other watermark and extra text settings read as plain "changed" labels, not as colors.
  only(Model.setRoleStyle(catalog, d, 'title', 'watermarkMode', 'text'), 'Title watermark mode changed');
  only(Model.setRoleStyle(catalog, d, 'title', 'extraSize', 'large'), 'Title extra size changed');
  only(Model.setRoleStyle(catalog, d, 'title', 'watermarkOpacity', 'high'), 'Title watermark opacity changed');
  only(Model.setRoleStyle(catalog, d, 'title', 'extraPlacement', 'top'), 'Title extra placement changed');
  // A heading color change moves the watermark that follows it, and is still one label per slide.
  only(Model.setRoleStyle(catalog, d, 'title', 'headingColor', 'gold'), 'Title text in Gold');
});

test('sharedParts matches the model', () => {
  assert.deepEqual(sharedParts(catalog, Model, d, 'title', 'headingColor'), ['divider']);
});

test('changedKinds finds the divider', () => {
  const kinds = changedKinds(catalog, Model, d, e);
  assert.ok(kinds.includes('divider') && kinds.includes('title'));
  assert.ok(!kinds.includes('cards'));
});

test('changedKinds counts the accent and shared features on every slide that shows them', () => {
  const other = catalog.palette.find(color => color.id !== d.roles.accent).id;
  const accent = { ...d, roles: { ...d.roles, accent: other } };
  assert.deepEqual(changedKinds(catalog, Model, d, accent), ['title', 'cards', 'video', 'activity'], 'the divider shows no accent');
  assert.deepEqual(changedKinds(catalog, Model, d, Model.setFeatureStyle(catalog, d, 'sidebar', 'color', 'gold')), ['cards', 'video', 'activity']);
  assert.deepEqual(changedKinds(catalog, Model, d, Model.setFeatureStyle(catalog, d, 'button', 'background', 'gold')), ['video', 'activity']);
});

test('sentState', () => {
  assert.equal(sentState(null, 'k'), 'none');
  assert.equal(sentState({ designKey: 'k' }, 'k'), 'sent');
  assert.equal(sentState({ designKey: 'j' }, 'k'), 'changed');
  assert.equal(designKey(d), designKey(structuredClone(d)));
});

if (failed) process.exit(1);
