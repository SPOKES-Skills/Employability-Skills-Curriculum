#!/usr/bin/env node
// Solid background structures replace the textures; retired textures keep rendering for old designs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRUCTURE_IDS, RETIRED_IDS, structureInk, structureLayers } from '../bespoke/background-structures.mjs';
import { allBackgroundIds, applyPreset, backgroundEntry, cssForDesign, designSchema, inkFor, patternBackground, patternFor, roleBackgroundCss, roleStylesSchema, setRoleStyle, structuralErrors } from '../bespoke/builder-model.mjs';
import { selectionErrors } from '../netlify/functions/_shared/selection.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/builder-catalog.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/retired-backgrounds.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
const SURFACES = ['titleBackground', 'dividerBackground', 'contentBackground'];
const paletteHexes = catalog.palette.map(color => color.hex);
const hex = id => catalog.palette.find(color => color.id === id).hex;

// Paper & berry is the 'professional' starting point.
const paperAndBerry = background => ({ ...applyPreset(catalog, 'professional'), background });
// Same construction as the one-off capture script that produced the fixture.
function retiredDesign(id) {
  let design = paperAndBerry(id);
  design = setRoleStyle(catalog, design, 'title', 'backgroundMode', 'gradient');
  design = setRoleStyle(catalog, design, 'title', 'pattern', id);
  design = setRoleStyle(catalog, design, 'title', 'patternStrength', 'bold');
  design = setRoleStyle(catalog, design, 'cards', 'primary', 'mauve');
  design = setRoleStyle(catalog, design, 'cards', 'pattern', id);
  design = setRoleStyle(catalog, design, 'cards', 'patternStrength', 'subtle');
  return design;
}

test('offered backgrounds are plain and the three structures', () => {
  assert.deepEqual(catalog.backgrounds.map(item => item.id), ['plain', 'color-block', 'edge-rail', 'frame']);
  assert.deepEqual(STRUCTURE_IDS, ['color-block', 'edge-rail', 'frame']);
  assert.deepEqual(catalog.retiredBackgrounds.map(item => item.id), RETIRED_IDS);
  assert.deepEqual(RETIRED_IDS, ['dot-grid', 'diagonal', 'crosshatch', 'soft-gradient']);
  assert.deepEqual(catalog.retiredBackgrounds.map(item => item.label), ['Dot grid', 'Diagonal', 'Crosshatch', 'Soft wash']);
  assert.deepEqual(allBackgroundIds(catalog), [...catalog.backgrounds, ...catalog.retiredBackgrounds].map(item => item.id));
});

test('structures draw one palette color at full strength', () => {
  for (const id of STRUCTURE_IDS) {
    const design = paperAndBerry(id);
    for (const surface of SURFACES) {
      const pattern = patternFor(catalog, design, surface);
      assert.equal(pattern.peakAlpha, 0, `${id} ${surface}`);
      assert(pattern.images.length > 0, `${id} ${surface} draws something`);
      const text = pattern.images.join(' ');
      assert(!/rgba?\(/.test(text), `${id} ${surface} uses no rgba`);
      const colors = text.match(/#[0-9a-f]{6}\b/gi) || [];
      assert(colors.length > 0, `${id} ${surface} names a color`);
      for (const color of colors) assert(paletteHexes.includes(color.toLowerCase()), `${id} ${surface} ${color} is a palette color`);
      assert.equal(new Set(colors.map(color => color.toLowerCase())).size, 1, `${id} ${surface} draws one color`);
    }
  }
});

test('local slide backgrounds use the same palette-only structures', () => {
  for (const id of STRUCTURE_IDS) for (const strength of ['subtle', 'normal', 'bold']) {
    const design = setRoleStyle(catalog, setRoleStyle(catalog, paperAndBerry('plain'), 'cards', 'pattern', id), 'cards', 'patternStrength', strength);
    const css = roleBackgroundCss(catalog, design, 'cards');
    assert(!/rgba?\(/.test(css), `${id} ${strength}`);
    assert(css.includes('linear-gradient'), `${id} ${strength}`);
    assert.doesNotThrow(() => cssForDesign(catalog, design));
  }
});

test('structure ink falls back when it matches the surface', () => {
  const design = paperAndBerry('edge-rail');
  const same = { ...design, roles: { ...design.roles, accent: design.roles.contentBackground } };
  const base = hex(same.roles.contentBackground);
  assert.equal(structureInk(catalog, same, base), hex(inkFor(catalog, same.roles.contentBackground)));
  // A distinct accent is used as is.
  const distinct = { ...design, roles: { ...design.roles, accent: 'mauve', contentBackground: 'light' } };
  assert.equal(structureInk(catalog, distinct, hex('light')), hex('mauve'));
});

test('strength sets thickness', () => {
  const ink = hex('mauve');
  const widths = ['subtle', 'normal', 'bold'].map(strength => structureLayers('edge-rail', ink, strength).sizes[0].split(' ')[0]);
  assert.deepEqual(widths, ['6px', '12px', '20px']);
  const squares = ['subtle', 'normal', 'bold'].map(strength => structureLayers('color-block', ink, strength).sizes[0]);
  assert.deepEqual(squares, ['64px 64px', '96px 96px', '128px 128px']);
  for (const id of STRUCTURE_IDS) {
    const layers = structureLayers(id, ink, 'normal');
    for (const key of ['images', 'sizes', 'positions', 'repeats']) assert.equal(layers[key].length, layers.images.length, `${id} ${key}`);
    assert(layers.repeats.every(value => value === 'no-repeat'));
  }
});

test('structures stay inside a 20px outer margin', () => {
  // Content slides pad at least 20px; a rail or frame ring must fit in it at every strength.
  for (const strength of ['subtle', 'normal', 'bold']) {
    const frame = structureLayers('frame', hex('mauve'), strength);
    const thickness = Number(frame.sizes[0].split(' ').pop().replace('px', ''));
    const inset = Number(frame.positions[0].match(/top (\d+)px/)[1]);
    assert(inset + thickness <= 20, strength);
  }
});

test('retired textures render exactly as before', () => {
  for (const id of RETIRED_IDS) {
    const design = retiredDesign(id);
    const expected = fixture[id];
    for (const surface of SURFACES) assert.equal(patternBackground(catalog, design, surface, 'linear-gradient(#fff, #000)'), expected.patternBackground[surface], `${id} ${surface}`);
    for (const kind of ['title', 'cards']) assert.equal(roleBackgroundCss(catalog, design, kind), expected.roleBackgroundCss[kind], `${id} ${kind}`);
    assert.equal(cssForDesign(catalog, design), expected.css, `${id} css`);
  }
});

test('schema still accepts retired ids', () => {
  const background = designSchema(catalog).properties.background.enum;
  const pattern = roleStylesSchema(catalog).properties.title.properties.pattern.enum;
  for (const id of RETIRED_IDS) { assert(background.includes(id), id); assert(pattern.includes(id), id); }
  for (const id of STRUCTURE_IDS) { assert(background.includes(id), id); assert(pattern.includes(id), id); }
  assert.deepEqual(structuralErrors(catalog, retiredDesign('dot-grid')), []);
  const design = setRoleStyle(catalog, paperAndBerry('dot-grid'), 'title', 'pattern', 'crosshatch');
  assert.deepEqual(structuralErrors(catalog, design), []);
});

test('background labels resolve for offered and retired ids', () => {
  assert.equal(backgroundEntry(catalog, 'frame').label, 'Frame');
  assert.equal(backgroundEntry(catalog, 'dot-grid').label, 'Dot grid');
  assert.equal(backgroundEntry(catalog, 'nope'), undefined);
});

test('the service accepts an old proposal', () => {
  const selection = { schema: 'bespoke-selection/v2', date: '2026-09-24', submittedAt: '2026-09-24T16:30:00.000Z', lesson: structuredClone(legacy.lesson), team: structuredClone(legacy.team), design: retiredDesign('dot-grid') };
  assert.deepEqual(selectionErrors(selection, selection.lesson.id), []);
  const rail = { ...selection, design: paperAndBerry('edge-rail') };
  assert.deepEqual(selectionErrors(rail, rail.lesson.id), []);
});
