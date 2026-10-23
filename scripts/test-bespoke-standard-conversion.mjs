#!/usr/bin/env node
// Opening a saved design converts retired backgrounds and third typefaces to the design standard, without touching the input.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertAlternatives, convertDraft, convertToStandard, conversionNote } from '../bespoke/standard-conversion.mjs';
import { convertedOnOpen } from '../bespoke/converted-open.mjs';
import { applyPreset, setFeatureStyle, setRoleStyle, structuralErrors } from '../bespoke/builder-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/builder-catalog.json'), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const fonts = design => `${design.fonts.heading}/${design.fonts.body}`;

test('retired backgrounds become plain', () => {
  let design = { ...applyPreset(catalog, 'professional'), background: 'dot-grid' };
  design = setRoleStyle(catalog, design, 'cards', 'pattern', 'crosshatch');
  const { design: converted, changes } = convertToStandard(catalog, design);
  assert.equal(converted.background, 'plain');
  assert.equal(converted.roleStyles.cards.pattern, 'plain');
  assert.deepEqual(changes, ['Background Dot grid is now Plain.', 'Text boxes background detail Crosshatch is now Plain.']);
  assert.deepEqual(structuralErrors(catalog, converted), []);
});

test('every retired background converts and the offered structures stay', () => {
  for (const { id, label } of catalog.retiredBackgrounds) {
    const { design, changes } = convertToStandard(catalog, { ...applyPreset(catalog, 'professional'), background: id });
    assert.equal(design.background, 'plain');
    assert.deepEqual(changes, [`Background ${label} is now Plain.`]);
  }
  for (const { id } of catalog.backgrounds) {
    const kept = setRoleStyle(catalog, { ...applyPreset(catalog, 'professional'), background: id }, 'title', 'pattern', id);
    assert.deepEqual(convertToStandard(catalog, kept), { design: kept, changes: [] });
  }
});

test('font ids become slots', () => {
  const base = applyPreset(catalog, 'professional');
  const third = catalog.fonts.find(font => ![base.fonts.heading, base.fonts.body].includes(font.id));
  let design = base;
  design = setRoleStyle(catalog, design, 'title', 'headingFont', base.fonts.heading);
  design = setRoleStyle(catalog, design, 'title', 'bodyFont', base.fonts.body);
  design = setRoleStyle(catalog, design, 'cards', 'headingFont', third.id);
  design = setRoleStyle(catalog, design, 'cards', 'bodyFont', third.id);
  design = setRoleStyle(catalog, design, 'divider', 'watermarkMode', 'text');
  design = setRoleStyle(catalog, design, 'divider', 'watermarkFont', third.id);
  design = setRoleStyle(catalog, design, 'activity', 'extraText', 'Try it');
  design = setRoleStyle(catalog, design, 'activity', 'extraFont', third.id);
  design = setFeatureStyle(catalog, design, 'sidebar', 'font', third.id);
  design = setFeatureStyle(catalog, design, 'button', 'font', base.fonts.heading);
  const { design: converted, changes } = convertToStandard(catalog, design);
  assert.equal(converted.roleStyles.title.headingFont, 'heading');
  assert.equal(converted.roleStyles.title.bodyFont, 'body');
  assert.equal(converted.roleStyles.cards.headingFont, 'heading');
  assert.equal(converted.roleStyles.cards.bodyFont, 'body');
  assert.equal(converted.roleStyles.divider.watermarkFont, 'heading');
  assert.equal(converted.roleStyles.activity.extraFont, 'body');
  assert.equal(converted.featureStyles.sidebar.font, 'body');
  assert.equal(converted.featureStyles.button.font, 'heading');
  assert.equal(converted.roleStyles.cards.pattern, 'inherit');
  assert.deepEqual(changes, [
    `Text boxes heading font ${third.label} is now the lesson heading font.`,
    `Text boxes body font ${third.label} is now the lesson body font.`,
    `Chapter divider watermark font ${third.label} is now the lesson heading font.`,
    `Activity added text font ${third.label} is now the lesson body font.`,
    `Navigation sidebar font ${third.label} is now the lesson body font.`
  ]);
  assert.deepEqual(structuralErrors(catalog, converted), []);
});

test('a font id that matches a lesson font follows that slot without a notice', () => {
  const base = applyPreset(catalog, 'professional');
  const design = setRoleStyle(catalog, base, 'cards', 'bodyFont', base.fonts.heading);
  const { design: converted, changes } = convertToStandard(catalog, design);
  assert.equal(converted.roleStyles.cards.bodyFont, 'heading');
  assert.deepEqual(changes, []);
});

test('slots and inherited values are left alone', () => {
  let design = applyPreset(catalog, 'professional');
  design = setRoleStyle(catalog, design, 'cards', 'headingFont', 'body');
  design = setFeatureStyle(catalog, design, 'sidebar', 'font', 'heading');
  assert.deepEqual(convertToStandard(catalog, design), { design, changes: [] });
});

test('a compliant design is untouched', () => {
  for (const preset of catalog.presets) {
    const design = applyPreset(catalog, preset.id);
    assert.deepEqual(convertToStandard(catalog, design), { design, changes: [] }, `${preset.id} fonts ${fonts(design)}`);
  }
});

test('the input is not mutated', () => {
  const base = applyPreset(catalog, 'professional');
  const third = catalog.fonts.find(font => ![base.fonts.heading, base.fonts.body].includes(font.id)).id;
  let design = { ...base, background: 'soft-gradient' };
  design = setRoleStyle(catalog, design, 'title', 'pattern', 'diagonal');
  design = setRoleStyle(catalog, design, 'title', 'headingFont', third);
  design = setFeatureStyle(catalog, design, 'button', 'font', third);
  const before = clone(design);
  const { design: converted, changes } = convertToStandard(catalog, design);
  assert.deepEqual(design, before);
  assert.equal(changes.length, 4);
  converted.roleStyles.title.pattern = 'changed';
  converted.fonts.heading = 'changed';
  assert.deepEqual(design, before);
});

test('the notice names the standard and asks for a review', () => {
  assert.equal(conversionNote([]), '');
  assert.equal(
    conversionNote(['Background Dot grid is now Plain.', 'Text boxes heading font Bitter is now the lesson heading font.']),
    'Updated this design to the SPOKES design standard: Background Dot grid is now Plain. Text boxes heading font Bitter is now the lesson heading font. Review it before saving.'
  );
});

test('the other option is converted and named in the changes', () => {
  const other = { ...applyPreset(catalog, 'professional'), background: 'diagonal' };
  const alternatives = { active: 'A', otherDesign: other };
  const before = clone(alternatives);
  const result = convertAlternatives(catalog, alternatives);
  assert.equal(result.alternatives.active, 'A');
  assert.equal(result.alternatives.otherDesign.background, 'plain');
  assert.deepEqual(result.changes, ['Option B: Background Diagonal is now Plain.']);
  assert.deepEqual(alternatives, before);
  assert.deepEqual(convertAlternatives(catalog, null), { alternatives: null, changes: [] });
  assert.equal(convertAlternatives(catalog, { active: 'B', otherDesign: other }).changes[0].slice(0, 9), 'Option A:');
});

test('a restored draft converts its design, other option and undo history', () => {
  const base = applyPreset(catalog, 'professional');
  const third = catalog.fonts.find(font => ![base.fonts.heading, base.fonts.body].includes(font.id));
  const retired = setRoleStyle(catalog, { ...base, background: 'dot-grid' }, 'cards', 'headingFont', third.id);
  const older = { ...base, background: 'crosshatch' };
  const draft = {
    design: retired,
    alternatives: { active: 'A', otherDesign: { ...base, background: 'diagonal' } },
    changes: [{ label: 'Background', design: older, alternatives: null, look: null }],
    redo: [{ label: 'Texture', design: retired, alternatives: { active: 'B', otherDesign: older } }]
  };
  const before = clone(draft);
  const result = convertDraft(catalog, draft);
  assert.deepEqual(draft, before, 'the draft is not mutated');
  assert.equal(result.design.background, 'plain');
  assert.equal(result.design.roleStyles.cards.headingFont, 'heading');
  assert.equal(result.alternatives.otherDesign.background, 'plain');
  assert.equal(result.changes[0].design.background, 'plain');
  assert.equal(result.changes[0].alternatives, null);
  assert.equal(result.changes[0].label, 'Background');
  assert.equal(result.redo[0].design.roleStyles.cards.headingFont, 'heading');
  assert.equal(result.redo[0].alternatives.otherDesign.background, 'plain');
  assert.deepEqual(result.notes, [
    'Background Dot grid is now Plain.',
    `Text boxes heading font ${third.label} is now the lesson heading font.`,
    'Option B: Background Diagonal is now Plain.'
  ]);
  const clean = { design: base, alternatives: null, changes: [], redo: [] };
  assert.deepEqual(convertDraft(catalog, clean), { ...clean, notes: [] });
});

test('only a stored v2 design that changed in conversion counts as converted on open', () => {
  const base = applyPreset(catalog, 'professional');
  const keyOf = payload => JSON.stringify(payload);
  const stored = design => ({ schema: 'bespoke-selection/v2', design, alternatives: null });
  assert.equal(convertedOnOpen(catalog, stored({ ...base, background: 'dot-grid' }), keyOf, 'other'), true);
  assert.equal(convertedOnOpen(catalog, { ...stored(base), alternatives: { active: 'A', otherDesign: { ...base, background: 'diagonal' } } }, keyOf, 'other'), true);
  assert.equal(convertedOnOpen(catalog, stored(base), keyOf, 'other'), false, 'a design with nothing retired is not converted, even when its saved shape differs from the page');
  assert.equal(convertedOnOpen(catalog, stored({ ...base, background: 'dot-grid' }), keyOf, keyOf(stored({ ...base, background: 'dot-grid' }))), false, 'the same design as the page is not converted');
  assert.equal(convertedOnOpen(catalog, { ...stored({ ...base, background: 'dot-grid' }), schema: 'bespoke-selection/v1' }, keyOf, 'other'), false, 'a v1 design is already unsaved by its own key');
  assert.equal(convertedOnOpen(catalog, null, keyOf, 'other'), false);
});
