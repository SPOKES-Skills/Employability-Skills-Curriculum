#!/usr/bin/env node
// Node checks for the Make it yours copy: the scope line, the parts list and the Starting from count.
import assert from 'node:assert/strict';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import * as Model from '../bespoke/builder-model.mjs';
import { scopeLine, listParts, startingFrom, SHARED_LINE_END } from '../bespoke/make-it-yours.mjs';

let failed = false;
const test = (name, fn) => {
  try { fn(); console.log(`ok - ${name}`); } catch (error) { failed = true; console.error(`not ok - ${name}\n${error.stack}`); }
};

const d = Model.applyPreset(catalog, 'professional', Model.defaultDesign(catalog));
const gold = Model.setSharedColor(catalog, d, 'title', 'headingColor', 'gold');
const line = (design, selected, key, extra = {}) => scopeLine({ catalog, Model, design, kind: 'title', selected, key, onlySlide: false, ...extra });

test('a shared color names the parts it also changes', () => {
  assert.equal(line(gold, 'heading-0', 'headingColor'), 'Gold also changes the Divider heading, because they share a color.');
  assert.ok(line(gold, 'heading-0', 'headingColor').endsWith(SHARED_LINE_END));
});

test('Only this slide keeps the color on one slide', () => {
  assert.equal(line(gold, 'heading-0', 'headingColor', { onlySlide: true }), 'This color stays on the Title slide only.');
});

test('sidebar, accent and buttons always change every slide', () => {
  assert.equal(line(d, 'sidebar'), 'Changes the sidebar on every slide.');
  assert.equal(line(d, 'accent'), 'Changes the accent on every slide.');
  assert.equal(line(d, 'button'), 'Changes the buttons on every slide.');
});

test('a part with no shared color says nothing', () => {
  assert.equal(line(d, 'extra', 'extraColor'), '');
  assert.equal(line(d, 'logo', null), '');
});

test('parts list stops at three, then counts the rest', () => {
  assert.equal(listParts(['A']), 'A');
  assert.equal(listParts(['A', 'B']), 'A and B');
  assert.equal(listParts(['A', 'B', 'C']), 'A, B and C');
  assert.equal(listParts(['A', 'B', 'C', 'D', 'E']), 'A, B, C and 2 more');
});

test('Starting from names the look and counts changes since', () => {
  assert.deepEqual(startingFrom(catalog, Model, d, 'professional'), { name: 'Paper & berry', count: 0 });
  assert.deepEqual(startingFrom(catalog, Model, gold, 'professional'), { name: 'Paper & berry', count: 2 });
  assert.deepEqual(startingFrom(catalog, Model, gold, null), { name: null, count: 0 });
  assert.deepEqual(startingFrom(catalog, Model, gold, 'not-a-look'), { name: null, count: 0 });
});

test('inputs are not changed', () => {
  const before = structuredClone(gold);
  line(gold, 'heading-0', 'headingColor');
  startingFrom(catalog, Model, gold, 'professional');
  assert.deepEqual(gold, before);
});

if (failed) process.exit(1);
