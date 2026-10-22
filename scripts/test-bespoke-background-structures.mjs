#!/usr/bin/env node
// Solid background structures replace the textures; retired textures keep rendering for old designs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRUCTURE_IDS, RETIRED_IDS, STRUCTURE_MARGIN, structureInk, structureLayers } from '../bespoke/background-structures.mjs';
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
  for (const id of STRUCTURE_IDS) {
    const layers = structureLayers(id, ink, 'normal');
    for (const key of ['images', 'sizes', 'positions', 'repeats']) assert.equal(layers[key].length, layers.images.length, `${id} ${key}`);
    assert(layers.repeats.every(value => value === 'no-repeat'));
  }
});

test('the color block never exceeds the surface margin and sits in the bottom-right corner', () => {
  assert.deepEqual(STRUCTURE_MARGIN, { title: 24, divider: 20, content: 20 });
  for (const [kind, margin] of Object.entries(STRUCTURE_MARGIN)) {
    const sizes = ['subtle', 'normal', 'bold'].map(strength => {
      const layers = structureLayers('color-block', hex('mauve'), strength, kind);
      assert.equal(layers.images.length, 1);
      assert.equal(layers.positions[0], 'right bottom');
      const [width, height] = layers.sizes[0].split(' ').map(value => Number(value.replace('px', '')));
      assert.equal(width, height);
      assert(width <= margin, `${kind} ${strength}: ${width}px fits the ${margin}px margin`);
      return width;
    });
    assert.deepEqual(sizes, [0.5, 0.75, 1].map(share => Math.round(margin * share)), kind);
  }
});

test('rails and frames stay inside the surface margin at every strength', () => {
  for (const [kind, margin] of Object.entries(STRUCTURE_MARGIN)) for (const strength of ['subtle', 'normal', 'bold']) {
    const rail = structureLayers('edge-rail', hex('mauve'), strength, kind);
    assert(Number(rail.sizes[0].split(' ')[0].replace('px', '')) <= margin, `${kind} ${strength} rail`);
    assert.equal(rail.positions[0], 'right top');
    const frame = structureLayers('frame', hex('mauve'), strength, kind);
    assert.equal(frame.images.length, 4);
    const thickness = Number(frame.sizes[0].split(' ').pop().replace('px', ''));
    const inset = Number(frame.positions[0].match(/top (\d+)px/)[1]);
    assert(inset >= 0 && inset + thickness <= margin, `${kind} ${strength} frame ring ends at the margin`);
  }
});

// The rule that paints a structure: the first CSS block whose selector matches and whose body has a background-image.
const paintingRule = (css, selector) => css.split('\n').find(line => line.startsWith(selector) && line.includes('background-image:linear-gradient'));

test('on the preview, content-slide structures are painted beside the sidebar column, not under it', () => {
  for (const id of STRUCTURE_IDS) {
    const design = paperAndBerry(id);
    const preview = cssForDesign(catalog, design, { canonical: false });
    // The sample slide is a grid: a sidebar column of min(280px, 100%), then the content area.
    assert(preview.includes('grid-template-columns:min(280px,100%) minmax(0,1fr)'));
    const content = paintingRule(preview, '.bespoke-slide .slide-content');
    assert(content, `${id}: the content area carries the structure`);
    assert.equal((content.match(/linear-gradient\(#/g) || []).length, id === 'frame' ? 4 : 1);
    for (const kind of ['cards', 'video', 'activity']) assert(!paintingRule(preview, `.bespoke-slide[data-kind="${kind}"]`), `${id}: the slide root under the sidebar is left plain`);
    // Title and divider slides have no sidebar, so they keep the structure on the slide itself.
    assert(paintingRule(preview, '.bespoke-slide[data-kind="title"]') && paintingRule(preview, '.bespoke-slide[data-kind="divider"]'));
    // Lessons have no sidebar inside the slide: the structure goes on the slide.
    const lesson = cssForDesign(catalog, design);
    assert(lesson.split('\n').some(line => line.includes('.slide:not(.slide-title):not(.slide-section)') && line.includes('background-image:linear-gradient(#')), `${id}: canonical content slide`);
  }
});

test('a local content-slide structure follows the same sidebar rule', () => {
  const design = setRoleStyle(catalog, setRoleStyle(catalog, paperAndBerry('plain'), 'cards', 'pattern', 'frame'), 'cards', 'patternStrength', 'bold');
  const preview = cssForDesign(catalog, design, { canonical: false });
  const content = paintingRule(preview, '.bespoke-slide[data-kind="cards"] .slide-content');
  assert(content && (content.match(/linear-gradient\(#/g) || []).length === 4 && content.includes('!important'));
  assert(!paintingRule(preview, '.bespoke-slide[data-kind="cards"]{') && !paintingRule(preview, '.bespoke-slide[data-kind="cards"] {'), 'root of the cards slide is not painted');
});

test('a local plain or retired texture on a content slide clears the shared structure', () => {
  for (const pattern of ['plain', 'dot-grid']) {
    const design = setRoleStyle(catalog, paperAndBerry('frame'), 'cards', 'pattern', pattern);
    const preview = cssForDesign(catalog, design, { canonical: false });
    const own = preview.split('\n').filter(line => line.startsWith('.bespoke-slide[data-kind="cards"] .slide-content{'));
    assert(own.length > 0 && own.every(line => line.includes('background-image:none!important')), `cards/${pattern}: the shared frame is cleared on the content area`);
    assert(!own.some(line => line.includes('linear-gradient(#')), `cards/${pattern}: no frame bars remain`);
    // Slides that inherit the shared frame still carry it.
    assert(paintingRule(preview, '.bespoke-slide .slide-content'), `${pattern}: other content slides keep the shared frame`);
    // The retired texture still paints on the slide root, as before.
    if (pattern === 'dot-grid') assert(preview.split('\n').some(line => line.startsWith('.bespoke-slide[data-kind="cards"]{') && line.includes('radial-gradient')));
  }
});

test('structure ink checks the accent against every gradient sample', () => {
  const design = paperAndBerry('edge-rail');
  design.slides.title.colors = 'gradient';
  design.roles = { ...design.roles, accent: 'mauve', titleBackground: 'light', titleBackgroundEnd: 'mauve' };
  // Start color alone would accept the accent.
  assert.equal(structureInk(catalog, design, hex('light')), hex('mauve'));
  assert.notEqual(structureInk(catalog, design, [hex('light'), hex('primary'), hex('mauve')]), hex('mauve'));
  // The real path samples the whole gradient, so the accent is rejected where it matches the end color.
  assert.notEqual(patternFor(catalog, design, 'titleBackground').ink, hex('mauve'));
  // A solid surface keeps the accent.
  design.slides.title.colors = 'solid'; design.slides.title.layout = 'left';
  assert.equal(patternFor(catalog, design, 'titleBackground').ink, hex('mauve'));
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

test('user-facing copy says background detail, not texture', () => {
  for (const file of ['bespoke/team-guide.html', 'bespoke/guide/copy.mjs', 'bespoke/similarity.mjs', 'bespoke/showcase-model.mjs']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /textur/i, file);
  }
  assert.match(fs.readFileSync(path.join(root, 'bespoke/guide/copy.mjs'), 'utf8'), /'shared\.pattern': \['Background detail'/);
  assert.match(fs.readFileSync(path.join(root, 'bespoke/team-guide.html'), 'utf8'), /Fonts &amp; background detail/);
});
