#!/usr/bin/env node
// Node checks for the Make it yours fit: the slide shrinks only while it stays legible (Ruling R23).
import assert from 'node:assert/strict';
import test from 'node:test';
import {fitScale, MIN_SCALE, usesCanvas} from '../bespoke/canvas-fit.mjs';

test('the floor keeps a shrunk slide legible', () => {
  assert.ok(MIN_SCALE >= 0.45 && MIN_SCALE <= 0.5, `floor ${MIN_SCALE}`);
});

test('a slide that fits at a legible scale shrinks to end inside the window', () => {
  const scale = fitScale({top: 400, natural: 628, viewport: 768});
  assert.ok(scale >= MIN_SCALE && scale < 1, `scale ${scale}`);
  assert.ok(400 + 628 * scale <= 768, 'the scaled slide ends inside the window');
});

test('a slide that cannot fit even at the floor stays full size and the page scrolls', () => {
  assert.equal(fitScale({top: 400, natural: 2142, viewport: 1080}), 1);
  assert.equal(fitScale({top: 300, natural: 485, viewport: 390}), 1);
});

// Ruling R30: with room to spare the slide grows until the window height or its column stops it.
test('a slide with room to spare grows to fill the window or its column', () => {
  assert.ok(Math.abs(fitScale({top: 317, natural: 628, viewport: 1080, room: 1706}) - (1080 - 317 - 16) / 628) < 1e-9);
  assert.equal(fitScale({top: 100, natural: 300, viewport: 1080, room: 1200}), 1200 / 960);
});

test('enlarged text skips the fit', () => {
  assert.equal(fitScale({top: 400, natural: 628, viewport: 768, rootFont: 32}), 1);
  assert.ok(fitScale({top: 400, natural: 628, viewport: 768, rootFont: 16}) < 1);
});

test('a slide with no height is left alone', () => {
  assert.equal(fitScale({top: 0, natural: 0, viewport: 768}), 1);
});

// Ruling R24: no cliff at the floor. top 400 in a 768px window leaves 352px after the 16px gap.
test('just below the floor, a mostly visible slide holds at the floor', () => {
  // 352 / 0.44 = 800 natural: at 0.45 it is 360 tall and still ends 8px above the fold, inside the gap.
  assert.equal(fitScale({top: 400, natural: 352 / 0.44, viewport: 768}), MIN_SCALE);
  // 352 / 0.40 = 880 natural: at 0.45 it is 396 tall, 28px below the fold, under a fifth of it.
  assert.equal(fitScale({top: 400, natural: 352 / 0.40, viewport: 768}), MIN_SCALE);
});

test('0.46 fits as is and 0.44 holds at the floor', () => {
  assert.ok(Math.abs(fitScale({top: 400, natural: 352 / 0.46, viewport: 768}) - 0.46) < 1e-9);
  assert.equal(fitScale({top: 400, natural: 352 / 0.44, viewport: 768}), MIN_SCALE);
});

test('far below the floor, the slide stays full size', () => {
  // At 0.45 a 2000px slide is 900 tall and 532px of it would sit below the fold.
  assert.equal(fitScale({top: 400, natural: 2000, viewport: 768}), 1);
});

test('the floor holds until a fifth of the slide falls below the fold', () => {
  const natural = 1000, scaled = natural * MIN_SCALE;
  assert.equal(fitScale({top: 768 - scaled * 0.81, natural, viewport: 768}), MIN_SCALE);
  assert.equal(fitScale({top: 768 - scaled * 0.78, natural, viewport: 768}), 1);
});

// Ruling R26: the slide lays out on the 960 canvas, so the column width caps the scale as well as the height.
test('a slide on the 960 canvas never draws wider than its column', () => {
  assert.equal(fitScale({top: 100, natural: 628, viewport: 1080, room: 540}), 540 / 960);
  assert.equal(fitScale({top: 100, natural: 300, viewport: 1080, room: 1600}), 1600 / 960);
});

test('the smaller of the width fit and the height fit wins', () => {
  assert.ok(Math.abs(fitScale({top: 400, natural: 628, viewport: 768, room: 900}) - 352 / 628) < 1e-9);
  assert.equal(fitScale({top: 100, natural: 628, viewport: 1080, room: 600}), 600 / 960);
});

test('a slide too heavy for the floor still fits its column width', () => {
  assert.equal(fitScale({top: 400, natural: 2000, viewport: 768, room: 540}), 540 / 960);
});

test('a slide too heavy for the floor on a wide window keeps the 960 canvas at full size', () => {
  assert.equal(fitScale({top: 400, natural: 2000, viewport: 768, room: 1600}), 1);
});

// Ruling R31: the 960 canvas shows only where it can be at least the floor; narrower columns lay the slide out at their width.
test('the 960 canvas needs a column at least the floor of 960 wide', () => {
  assert.equal(usesCanvas(960 * MIN_SCALE), true);
  assert.equal(usesCanvas(541), true);
  assert.equal(usesCanvas(334), false);
});
