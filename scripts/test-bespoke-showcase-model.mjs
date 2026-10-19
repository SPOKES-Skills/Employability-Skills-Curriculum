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

test('sharedParts matches the model', () => {
  assert.deepEqual(sharedParts(catalog, Model, d, 'title', 'headingColor'), ['divider']);
});

test('changedKinds finds the divider', () => {
  const kinds = changedKinds(catalog, Model, d, e);
  assert.ok(kinds.includes('divider') && kinds.includes('title'));
  assert.ok(!kinds.includes('cards'));
});

test('sentState', () => {
  assert.equal(sentState(null, 'k'), 'none');
  assert.equal(sentState({ designKey: 'k' }, 'k'), 'sent');
  assert.equal(sentState({ designKey: 'j' }, 'k'), 'changed');
  assert.equal(designKey(d), designKey(structuredClone(d)));
});

if (failed) process.exit(1);
