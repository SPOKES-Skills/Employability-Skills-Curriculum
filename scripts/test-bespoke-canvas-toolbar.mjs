#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import {computeToolbarPosition, isQuickField} from '../bespoke/canvas-toolbar.mjs';

const canvas = {width: 1000, height: 700};
const toolbar = {width: 400, height: 64};
const rect = (left, top, width, height) => ({left, top, width, height});

test('floats above the anchor, centered on it', () => {
  const pos = computeToolbarPosition({anchor: rect(400, 300, 200, 60), canvas, toolbar});
  assert.deepEqual(pos, {left: 300, top: 226, placement: 'above'});
});

test('flips below when there is no room above', () => {
  const pos = computeToolbarPosition({anchor: rect(400, 40, 200, 60), canvas, toolbar});
  assert.equal(pos.placement, 'below');
  assert.equal(pos.top, 110);
});

test('pins to the top margin when it fits neither above nor below', () => {
  const pos = computeToolbarPosition({anchor: rect(0, 0, 1000, 700), canvas, toolbar});
  assert.deepEqual(pos, {left: 300, top: 8, placement: 'top'});
});

test('clamps horizontally inside the canvas', () => {
  const left = computeToolbarPosition({anchor: rect(0, 300, 40, 40), canvas, toolbar});
  const right = computeToolbarPosition({anchor: rect(960, 300, 40, 40), canvas, toolbar});
  assert.equal(left.left, 8);
  assert.equal(right.left, 592);
});

test('a toolbar wider than the canvas starts at the margin', () => {
  const pos = computeToolbarPosition({anchor: rect(10, 300, 40, 40), canvas: {width: 300, height: 700}, toolbar});
  assert.equal(pos.left, 8);
});

test('does not mutate its inputs', () => {
  const input = {anchor: rect(400, 300, 200, 60), canvas: {...canvas}, toolbar: {...toolbar}};
  const snapshot = structuredClone(input);
  computeToolbarPosition(input);
  assert.deepEqual(input, snapshot);
});

test('text selections keep the five editing controls quick', () => {
  for (const selected of ['heading-0', 'body-2', 'extra']) {
    for (const id of ['element', 'text', 'color', 'size', 'align', 'placement']) {
      assert.equal(isQuickField(selected, id), true, `${selected}:${id}`);
    }
    assert.equal(isQuickField(selected, 'font'), false, `${selected}:font`);
  }
});

test('background keeps finish and colors quick, texture and layout in the drawer', () => {
  for (const id of ['element', 'finish', 'background', 'second']) assert.equal(isQuickField('background', id), true, id);
  for (const id of ['pattern', 'layout']) assert.equal(isQuickField('background', id), false, id);
});

test('boxes share one rule, and other features expose their main color', () => {
  assert.equal(isQuickField('box-0', 'background'), true);
  assert.equal(isQuickField('box-3', 'border'), false);
  assert.equal(isQuickField('box-3', 'treatment'), false);
  assert.equal(isQuickField('sidebar', 'color'), true);
  assert.equal(isQuickField('sidebar', 'font'), false);
  assert.equal(isQuickField('accent', 'color'), true);
  assert.equal(isQuickField('logo', 'logo'), true);
  assert.equal(isQuickField('video', 'frame'), false);
  assert.equal(isQuickField('watermark', 'watermark-text'), true);
  assert.equal(isQuickField('watermark', 'opacity'), false);
});

test('an unknown selection still exposes the element picker', () => {
  assert.equal(isQuickField('mystery', 'element'), true);
  assert.equal(isQuickField('mystery', 'color'), false);
});
