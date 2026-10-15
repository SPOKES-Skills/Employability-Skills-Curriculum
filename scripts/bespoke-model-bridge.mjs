#!/usr/bin/env node
/** One model authority for Python intake, service validation and browser preview. */
import fs from 'node:fs';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import meta from '../bespoke/catalog.json' with { type: 'json' };
import { contrastIssues, cssForDesign, renderSlide, usedFontIds } from '../bespoke/builder-model.mjs';
import { selectionErrors } from '../netlify/functions/_shared/selection.mjs';

const selection = JSON.parse(fs.readFileSync(0, 'utf8'));
const errors = selectionErrors(selection, selection?.lesson?.id, true);
const warnings = !errors.length && selection.schema === 'bespoke-selection/v2' ? contrastIssues(catalog, selection.design).map(issue => issue.message) : [];
if (process.argv[2] === 'validate' || errors.length) {
  process.stdout.write(JSON.stringify({ errors, warnings }));
} else if (process.argv[2] === 'design') {
  const design = selection.design;
  const fontIds = usedFontIds(catalog, design);
  const fonts = catalog.fonts.filter(font => fontIds.includes(font.id));
  const markup = Object.fromEntries(['title', 'divider', 'cards', 'video', 'activity'].map(kind => [kind, renderSlide(catalog, design, kind)]));
  const reviewMarkup=Object.fromEntries(['title','divider','cards','video','activity'].map(kind=>[kind,renderSlide(catalog,design,kind,{logoUrl:'../SPOKES-Logo.png',lessonTitle:meta.lessons.find(l=>l.id===selection.lesson.id)?.title||selection.lesson.title})]));
  process.stdout.write(JSON.stringify({ errors, warnings, css: cssForDesign(catalog, design), fonts, markup, reviewMarkup }));
} else {
  throw new Error('Expected validate or design operation.');
}
