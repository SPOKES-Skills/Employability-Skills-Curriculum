#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import {isQuickField, TEXT_FIELDS} from '../bespoke/canvas-toolbar.mjs';

test('text selections keep their editing controls quick, font included, in the spec order', () => {
  assert.deepEqual(TEXT_FIELDS, ['element', 'text', 'font', 'size', 'color', 'align', 'placement']);
  for (const selected of ['heading-0', 'body-2', 'extra']) {
    for (const id of TEXT_FIELDS) assert.equal(isQuickField(selected, id), true, `${selected}:${id}`);
    assert.equal(isQuickField(selected, 'only-slide'), false, `${selected}:only-slide waits in the drawer`);
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

test('a compact band sends Sample text and Position to the drawer and keeps the rest in order', () => {
  for (const selected of ['heading-0', 'body-2', 'extra']) {
    const quick = TEXT_FIELDS.filter(id => isQuickField(selected, id, {compact: true}));
    assert.deepEqual(quick, ['element', 'font', 'size', 'color', 'align'], selected);
  }
  assert.equal(isQuickField('background', 'finish', {compact: true}), true, 'other selections keep their quick fields');
});
