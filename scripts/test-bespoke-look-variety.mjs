#!/usr/bin/env node
// The twelve ready-made looks stay apart from the released lessons and from each other (Britt, 2026-10-22).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPreset, contrastIssues } from '../bespoke/builder-model.mjs';
import { CHARACTERISTICS, compareDesign } from '../bespoke/similarity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalog = read('bespoke/builder-catalog.json');
const fingerprints = read('bespoke/lesson-fingerprints.json');
const looks = catalog.presets.map(preset => ({ id: preset.id, label: preset.label, design: applyPreset(catalog, preset.id) }));

const MAX_SHARED_WITH_A_LESSON = 5;
const MAX_SHARED_BETWEEN_LOOKS = CHARACTERISTICS.length / 2;
const RETIRED = ['dot-grid', 'diagonal', 'crosshatch', 'soft-gradient'];
// Looks that cannot avoid a released lesson's palette color in the same role, as 'look id/lesson id/characteristic key': reason.
// Empty means every look keeps clear of every released lesson's colors.
const COLOR_EXCEPTIONS = {};

const get = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);
// The divider texts follow the title and subtitle colors, the same reading compareDesign takes.
const aliases = { 'dividerText.heading': 'roles.titleText', 'dividerText.supporting': 'roles.subtitle' };
const valueOf = (design, key) => get(design, aliases[key] ?? key);
const isColorKey = key => key.startsWith('roles.') || key.startsWith('dividerText.');

test('each look shares at most 5 choices with every released lesson', () => {
  for (const look of looks) {
    for (const lesson of compareDesign(fingerprints, look.design, catalog)) {
      assert.ok(lesson.shared <= MAX_SHARED_WITH_A_LESSON, `${look.id} shares ${lesson.shared} choices with ${lesson.title} (limit ${MAX_SHARED_WITH_A_LESSON})`);
    }
  }
});

test('any two looks share at most 16 of the 32 compared choices', () => {
  assert.equal(CHARACTERISTICS.length, 32);
  for (let first = 0; first < looks.length; first += 1) {
    for (let second = first + 1; second < looks.length; second += 1) {
      const shared = CHARACTERISTICS.filter(({ key }) => {
        const a = valueOf(looks[first].design, key), b = valueOf(looks[second].design, key);
        return a !== undefined && JSON.stringify(a) === JSON.stringify(b);
      });
      assert.ok(shared.length <= MAX_SHARED_BETWEEN_LOOKS, `${looks[first].id} and ${looks[second].id} share ${shared.length} choices (limit ${MAX_SHARED_BETWEEN_LOOKS}): ${shared.map(item => item.key).join(', ')}`);
    }
  }
});

test('looks share no color with a released lesson in the same role', () => {
  for (const look of looks) {
    for (const lesson of compareDesign(fingerprints, look.design, catalog)) {
      for (const match of lesson.matches.filter(item => isColorKey(item.key))) {
        const exception = COLOR_EXCEPTIONS[`${look.id}/${lesson.id}/${match.key}`];
        assert.ok(exception, `${look.id} uses ${match.designValue} for ${match.label}, as ${lesson.title} does`);
      }
    }
  }
  for (const [name, reason] of Object.entries(COLOR_EXCEPTIONS)) assert.ok(reason.length > 0, `${name} needs a reason`);
});

test('looks raise no readability notes', () => {
  for (const look of looks) {
    assert.deepEqual(contrastIssues(catalog, look.design).map(issue => issue.message), [], look.id);
  }
});

test('looks keep their identity', () => {
  const identity = {
    professional: ['Editorial', 'left'], modern: ['Split stage', 'split'], serious: ['Centered', 'center'], 'light-hearted': ['Grounded', 'bottom'],
    fun: ['Framed', 'frame'], outspoken: ['Headline', 'headline'], sidebar: ['Side rule', 'sidebar'], horizon: ['Horizon', 'horizon'],
    corner: ['Corner', 'corner'], masthead: ['Masthead', 'masthead'], columns: ['Two columns', 'columns'], plaque: ['Inset', 'plaque']
  };
  assert.deepEqual(looks.map(look => look.id), Object.keys(identity));
  for (const look of looks) assert.deepEqual([look.label, look.design.slides.title.layout], identity[look.id], look.id);
  assert.equal(new Set(looks.map(look => look.design.slides.title.layout)).size, 12);
  const offered = catalog.backgrounds.map(item => item.id);
  for (const look of looks) {
    assert.ok(offered.includes(look.design.background), `${look.id} background ${look.design.background} is not offered`);
    const patterns = [look.design.background, ...Object.values(look.design.roleStyles || {}).map(style => style.pattern)];
    assert.deepEqual(patterns.filter(id => RETIRED.includes(id)), [], `${look.id} uses a retired background`);
  }
});
