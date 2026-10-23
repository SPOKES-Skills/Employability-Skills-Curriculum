#!/usr/bin/env node
// Per-slide and feature font controls offer the lesson's two fonts as slots; saved font ids keep working.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT_SLOTS, ROLE_FONT_FIELDS, resolveFont, fontSlotChoices, fontControl } from '../bespoke/font-slots.mjs';
import { ROLE_STYLE_KINDS, applyPreset, cssForDesign, effectiveFeatureStyle, effectiveRoleStyle, setFeatureStyle, setRoleStyle, structuralErrors, usedFontIds } from '../bespoke/builder-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/builder-catalog.json'), 'utf8'));
const labelOf = id => catalog.fonts.find(font => font.id === id).label;
const FEATURES = ['sidebar', 'button'];

test('a slide on the heading slot follows the lesson heading font', () => {
  let design = applyPreset(catalog, 'professional');
  assert.equal(design.fonts.heading, 'source-sans-3');
  design = setRoleStyle(catalog, design, 'cards', 'headingFont', 'heading');
  assert.equal(effectiveRoleStyle(catalog, design, 'cards').headingFont, 'source-sans-3');
  design = { ...design, fonts: { ...design.fonts, heading: 'bitter' } };
  assert.equal(effectiveRoleStyle(catalog, design, 'cards').headingFont, 'bitter');
  assert.match(cssForDesign(catalog, design), /font-family:"Bitter"/);
});

test('a slide on the body slot, a feature and a watermark follow the lesson fonts', () => {
  let design = applyPreset(catalog, 'professional');
  design = setRoleStyle(catalog, design, 'title', 'headingFont', 'body');
  design = setRoleStyle(catalog, design, 'divider', 'watermarkMode', 'text');
  design = setRoleStyle(catalog, design, 'divider', 'watermarkFont', 'body');
  design = setFeatureStyle(catalog, design, 'sidebar', 'font', 'heading');
  design = { ...design, fonts: { heading: 'outfit', body: 'work-sans' } };
  assert.equal(effectiveRoleStyle(catalog, design, 'title').headingFont, 'work-sans');
  assert.equal(effectiveRoleStyle(catalog, design, 'divider').watermarkFont, 'work-sans');
  assert.equal(effectiveFeatureStyle(catalog, design, 'sidebar').font, 'outfit');
});

test('a watermark that follows the heading follows a heading set to the body slot', () => {
  let design = applyPreset(catalog, 'professional');
  design = setRoleStyle(catalog, design, 'divider', 'watermarkMode', 'text');
  design = setRoleStyle(catalog, design, 'divider', 'headingFont', 'body');
  assert.equal(effectiveRoleStyle(catalog, design, 'divider').watermarkFont, design.fonts.body);
});

test('resolveFont maps slots to lesson fonts and leaves ids and inherit alone', () => {
  const design = applyPreset(catalog, 'modern');
  assert.deepEqual(FONT_SLOTS, ['heading', 'body']);
  assert.equal(resolveFont(design, 'heading'), design.fonts.heading);
  assert.equal(resolveFont(design, 'body'), design.fonts.body);
  assert.equal(resolveFont(design, 'inter'), 'inter');
  assert.equal(resolveFont(design, 'inherit'), 'inherit');
});

test('controls offer only the two lesson fonts', () => {
  const design = applyPreset(catalog, 'professional');
  const choices = fontSlotChoices(catalog, design);
  assert.deepEqual(choices.map(choice => choice.id), ['heading', 'body']);
  assert.deepEqual(choices.map(choice => choice.label), [`Heading font · ${labelOf(design.fonts.heading)}`, `Body font · ${labelOf(design.fonts.body)}`]);
});

test('a control can add Use shared font and keeps a saved font id selectable', () => {
  const design = applyPreset(catalog, 'professional');
  const shared = fontControl(catalog, design, { saved: 'inherit', slot: 'body', inherit: true });
  assert.deepEqual(shared.options.map(option => option.id), ['inherit', 'heading', 'body']);
  assert.equal(shared.options[0].label, `Use shared font · ${labelOf(design.fonts.body)}`);
  assert.equal(shared.value, 'inherit');
  const plain = fontControl(catalog, design, { saved: 'inherit', slot: 'heading' });
  assert.deepEqual(plain.options.map(option => option.id), ['heading', 'body']);
  assert.equal(plain.value, 'heading');
  assert.equal(fontControl(catalog, design, { saved: 'body', slot: 'heading' }).value, 'body');
  const retired = fontControl(catalog, design, { saved: 'inter', slot: 'heading' });
  assert.deepEqual(retired.options.map(option => option.id), ['heading', 'body', 'inter']);
  assert.equal(retired.value, 'inter');
  assert.match(retired.options[2].label, /^Inter/);
});

test('an inherited control shows the slot that matches the font it renders', () => {
  const design = applyPreset(catalog, 'professional');
  assert.equal(fontControl(catalog, design, { saved: 'inherit', slot: 'heading', effective: design.fonts.body }).value, 'body');
  assert.equal(fontControl(catalog, design, { saved: 'inherit', slot: 'heading', effective: design.fonts.heading }).value, 'heading');
});

test('no control-made design holds a third typeface', () => {
  for (const preset of catalog.presets) {
    const base = applyPreset(catalog, preset.id);
    for (const mode of ['heading', 'body', 'alternate']) {
      let design = base;
      let turn = 0;
      const pick = () => mode === 'alternate' ? FONT_SLOTS[turn++ % 2] : mode;
      for (const kind of ROLE_STYLE_KINDS) {
        design = setRoleStyle(catalog, design, kind, 'extraText', 'Extra words');
        design = setRoleStyle(catalog, design, kind, 'watermarkMode', 'text');
        for (const field of ROLE_FONT_FIELDS) design = setRoleStyle(catalog, design, kind, field, pick());
      }
      for (const feature of FEATURES) design = setFeatureStyle(catalog, design, feature, 'font', pick());
      assert.deepEqual(structuralErrors(catalog, design), [], preset.id);
      assert.ok(usedFontIds(catalog, design).length <= 2, `${preset.id} ${mode}: ${usedFontIds(catalog, design)}`);
    }
  }
});

test('font ids still validate and render', () => {
  let design = applyPreset(catalog, 'professional');
  design = setRoleStyle(catalog, design, 'cards', 'headingFont', 'inter');
  design = setFeatureStyle(catalog, design, 'button', 'font', 'raleway');
  assert.deepEqual(structuralErrors(catalog, design), []);
  assert.equal(effectiveRoleStyle(catalog, design, 'cards').headingFont, 'inter');
  assert.equal(effectiveFeatureStyle(catalog, design, 'button').font, 'raleway');
  const css = cssForDesign(catalog, design);
  assert.match(css, /font-family:"Inter"/);
  assert.match(css, /font-family:"Raleway"/);
  assert.ok(usedFontIds(catalog, design).includes('raleway'));
});

test('an unknown font value is still rejected', () => {
  const design = applyPreset(catalog, 'professional');
  assert.throws(() => setRoleStyle(catalog, design, 'cards', 'headingFont', 'comic-sans'), /invalid headingFont/);
  assert.throws(() => setFeatureStyle(catalog, design, 'sidebar', 'font', 'both'), /invalid font/);
});
