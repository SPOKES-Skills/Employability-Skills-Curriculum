#!/usr/bin/env node
// Node checks for the Make it yours fit: the slide shrinks only while it stays legible (Ruling R23).
import assert from 'node:assert/strict';
import test from 'node:test';
import {fitScale, MIN_SCALE} from '../bespoke/canvas-fit.mjs';

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

test('a slide that already fits is never enlarged', () => {
  assert.equal(fitScale({top: 100, natural: 300, viewport: 1080}), 1);
});

test('enlarged text skips the fit', () => {
  assert.equal(fitScale({top: 400, natural: 628, viewport: 768, rootFont: 32}), 1);
  assert.ok(fitScale({top: 400, natural: 628, viewport: 768, rootFont: 16}) < 1);
});

test('a slide with no height is left alone', () => {
  assert.equal(fitScale({top: 0, natural: 0, viewport: 768}), 1);
});
