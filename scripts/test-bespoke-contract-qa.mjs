#!/usr/bin/env node
// Adversarial boundary and cross-authority QA. Only synthetic, ephemeral data.
import { builderDestination } from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { browserType } from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import meta from '../bespoke/catalog.json' with { type: 'json' };
import { allBackgroundIds, contrastIssues, cssForDesign, migrateV1, renderSlide } from '../bespoke/builder-model.mjs';
import { selectionErrors, digest } from '../netlify/functions/_shared/selection.mjs';
import { handleAction, hashEditCode, LESSON_IDS } from '../netlify/functions/bespoke-handoff.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allBackgrounds = allBackgroundIds(catalog);
const payload = () => ({ schema: 'bespoke-selection/v2', date: '2026-09-24', lesson: { id: 'money-management', title: 'Synthetic boundary QA' }, team: { spokesperson: { name: 'Synthetic reviewer' } }, design: structuredClone(catalog.defaults) });
const pythonBatch = selections => JSON.parse(execFileSync('python3', ['-c', `
import json,sys
sys.path.insert(0, "scripts")
from bespoke_model import model_result
from bespoke_support import selection_digest
items=json.load(sys.stdin)
results=[]
for p in items:
    result=model_result(p, "design")
    if not result["errors"]: result["digest"]=selection_digest(p)
    results.append(result)
print(json.dumps(results))
`], { cwd: root, input: JSON.stringify(selections), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));

test('12 rotating designs preserve every brand color and independent font through Node and Python generation', () => {
  const selections = Array.from({ length: 12 }, (_, index) => {
    const p = payload();
    for (const [roleIndex, role] of catalog.roles.entries()) p.design.roles[role.id] = catalog.palette[(index + roleIndex) % 11].id;
    p.design.fonts = { heading: catalog.fonts[index].id, body: catalog.fonts[(index + 5) % 12].id };
    p.design.background = allBackgrounds[index % allBackgrounds.length];
    return p;
  });
  const before = structuredClone(selections), results = pythonBatch(selections);
  for (const [index, selection] of selections.entries()) {
    assert.deepEqual(selectionErrors(selection, selection.lesson.id), []);
    const result = results[index];
    assert.deepEqual(result.errors, []);
    assert.equal(result.digest, digest(selection));
    assert.equal(result.css, cssForDesign(catalog, selection.design));
    assert.deepEqual(result.warnings, contrastIssues(catalog, selection.design).map(issue => issue.message));
    for (const group of catalog.slideGroups) assert.equal(result.markup[group.id], renderSlide(catalog, selection.design, group.id));
    for (const role of catalog.roles) assert(result.css.includes(`--role-${role.id.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}: var(--${selection.design.roles[role.id]})`));
  }
  for (const role of catalog.roles) assert.equal(new Set(selections.map(p => p.design.roles[role.id])).size, 11);
  assert(results.some(result => result.warnings.length), 'Low contrast is covered and remains valid.');
  assert.deepEqual(selections, before, 'No boundary silently repairs selected values.');
});

function malformedCases() {
  const cases = [];
  const add = (name, mutate) => { const p = payload(); mutate(p); cases.push({ name, selection: p }); };
  const objects = [[], ['lesson'], ['team'], ['team', 'spokesperson'], ['design'], ['design', 'roles'], ['design', 'fonts'], ['design', 'slides'], ['design', 'slides', 'title'], ['design', 'samples']];
  for (const segments of objects) for (const key of ['__proto__', 'constructor', 'unexpected']) add(`${segments.join('.') || 'root'}/${key}`, p => {
    let target = p;
    for (const segment of segments) target = target[segment];
    Object.defineProperty(target, key, { value: { qaUnexpected: true }, enumerable: true });
  });
  add('lone-surrogate-title', p => { p.design.samples.title = 'Synthetic\ud800title'; });
  add('lone-surrogate-person', p => { p.team.spokesperson.name = 'Synthetic\udfffperson'; });
  add('invalid-calendar', p => { p.date = '2026-02-30'; });
  add('title-over-model-bound', p => { p.design.samples.title = '🎓'.repeat(150); });
  add('title-too-long', p => { p.design.samples.title = 'x'.repeat(catalog.sampleLimits.title + 1); });
  add('hidden-box-too-long', p => { p.design.slides.cards.count = '1'; p.design.samples.boxes[3] = 'x'.repeat(catalog.sampleLimits.box + 1); });
  add('extra-box', p => { p.design.samples.boxes.push('Unexpected fifth box'); });
  add('missing-box', p => { p.design.samples.boxes.pop(); });
  add('injected-css', p => { p.design.roles.body = 'red; background:url(https://example.invalid)'; });
  add('blank-lesson-title', p => { p.lesson.title = '  '; });
  const legacy = () => JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
  add('forged-legacy-reference', p => { p.legacySelection = legacy(); p.legacySelection.theme.catalogIds.colorLead = 'colorLeads.royal'; });
  add('blank-legacy-title', p => { p.legacySelection = legacy(); p.legacySelection.lesson.title = '  '; });
  return cases;
}

test('42 malformed or prototype-key payloads fail both service and Python authority without mutation', () => {
  const cases = malformedCases(), results = pythonBatch(cases.map(item => item.selection));
  assert.equal(cases.length, 42);
  for (const [index, item] of cases.entries()) {
    const before = JSON.stringify(item.selection);
    assert(selectionErrors(item.selection, item.selection.lesson.id).length, item.name);
    assert(results[index].errors.length, item.name);
    assert.equal(JSON.stringify(item.selection), before, item.name);
  }
  assert.equal(Object.prototype.qaUnexpected, undefined);
});

test('v1 migration preserves complete Unicode characters at all four sample limits', () => {
  const fields = [
    { name: 'title', limit: catalog.sampleLimits.title, put: (p, text) => { p.lesson.displayTitle = text; }, read: d => d.samples.title },
    { name: 'subtitle', limit: catalog.sampleLimits.subtitle, put: (p, text) => { p.lesson.subtitle = text; }, read: d => d.samples.subtitle },
    { name: 'bullets', limit: catalog.sampleLimits.box, put: (p, text) => { p.sampleContent = { ...p.sampleContent, bullets: text }; }, read: d => d.samples.boxes[0] },
    { name: 'mythReality', limit: catalog.sampleLimits.box, put: (p, text) => { p.sampleContent = { ...p.sampleContent, mythReality: text }; }, read: d => d.samples.boxes[1] },
  ];
  const selections = [];
  for (const field of fields) for (const crosses of [false, true]) {
    const legacy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
    const prefix = 'A'.repeat(field.limit - (crosses ? 1 : 2));
    field.put(legacy, prefix + '🎓' + 'continued sample');
    const original = structuredClone(legacy);
    assert.deepEqual(selectionErrors(legacy, legacy.lesson.id), [], field.name);
    const migrated = migrateV1(legacy, catalog, meta);
    assert.equal(field.read(migrated.design), prefix + (crosses ? '' : '🎓'), `${field.name}/${crosses ? 'crosses' : 'ends at'} limit`);
    assert.deepEqual(legacy, original, 'The complete original legacy source remains available.');
    const selection = { ...payload(), design: migrated.design, legacySelection: legacy };
    assert.deepEqual(selectionErrors(selection, selection.lesson.id), [], field.name);
    selections.push(selection);
  }
  const results = pythonBatch(selections);
  assert.equal(results.length, 8);
  for (const result of results) assert.deepEqual(result.errors, []);
});

test('generated text stays inert and renderer rejects executable logo, scope and font inputs', async () => {
  const design = structuredClone(catalog.defaults);
  const hostile = '<img src=x onerror="window.__qaExecuted=true"><script>window.__qaExecuted=true</script>&"\'';
  design.samples.title = hostile; design.samples.subtitle = hostile;
  design.samples.boxes = [hostile, hostile, hostile, hostile]; design.slides.cards.count = '4';
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const requests = [];
    await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
    for (const treatment of ['paragraph', 'bullets', 'numbered']) {
      design.slides.cards.treatment = treatment;
      await page.setContent(catalog.slideGroups.map(group => renderSlide(catalog, design, group.id)).join('\n'));
      assert.equal(await page.locator('script,img,iframe,video,a[href],form').count(), 0);
      assert.equal(await page.locator('[onerror],[onclick]').count(), 0);
      assert.equal(await page.evaluate(() => window.__qaExecuted), undefined);
      assert.equal(await page.locator('.slide-title-text').textContent(), hostile);
      assert.equal(await page.locator('.slide-card .slide-body').first().textContent(), hostile);
    }
    assert.deepEqual(requests, []);
  } finally { await browser.close(); }
  for (const logoUrl of ['javascript:alert(1)', 'https://example.invalid/logo.png', '//example.invalid/logo.svg', 'logo.png" onerror="alert(1)']) assert.throws(() => renderSlide(catalog, design, 'title', { logoUrl }));
  for (const scope of ['body', '.safe,body', '.safe{color:red}']) assert.throws(() => cssForDesign(catalog, design, { scope }));
  for (const fontBase of ['https://example.invalid', '../fonts");body{display:none}', 'data:text/plain,bad']) assert.throws(() => cssForDesign(catalog, design, { fontBase }));
});

test('a real provisioned synthetic team code cannot authorize any action for another lesson', async () => {
  let accessCount = 0;
  const github = new Proxy({}, { get: () => async () => { accessCount++; throw new Error('Unauthorized store access'); } });
  const codes = Object.fromEntries(LESSON_IDS.map(id => [id, `synthetic-independent-team-code-${id}`]));
  const context = { github, token: 'synthetic-only', draftKey: Buffer.alloc(32, 13).toString('base64'), teamKeys: Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(codes[id])])) };
  for (const id of LESSON_IDS.slice(1)) for (const action of ['open', 'save', 'history', 'openRevision', 'send', 'status']) {
    const response = await handleAction({ action, lessonId: id, editCode: codes[LESSON_IDS[0]], selection: payload(), expectedRevision: null, mutationId: randomUUID() }, context);
    assert.equal(response.status, 403, `${id}/${action}`);
    assert.equal(JSON.stringify(response).includes(codes[LESSON_IDS[0]]), false);
  }
  assert.equal(accessCount, 0);
});

test('ephemeral HTTP server fails closed for malformed requests and exposes no saved cross-lesson revision', async () => {
  const app = await createDevServer({ port: 0 });
  const request = async fields => {
    const response = await fetch(app.baseUrl + '/api/bespoke', { method: 'POST', body: JSON.stringify({ action: 'open', lessonId: 'money-management', editCode: LOCAL_PREVIEW_CODE, ...fields }) });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return { status: response.status, body: await response.json() };
  };
  try {
    const saved = await request({ action: 'save', selection: payload(), expectedRevision: null, mutationId: randomUUID() });
    assert.equal(saved.status, 200);
    for (const id of LESSON_IDS.filter(id => id !== 'money-management')) {
      assert.equal((await request({ action: 'openRevision', lessonId: id, revision: saved.body.revision })).status, 404);
      assert.deepEqual((await request({ action: 'history', lessonId: id })).body.history, []);
    }
    for (const raw of ['{', 'null', '[]', '"not an action"']) {
      const response = await fetch(app.baseUrl + '/api/bespoke', { method: 'POST', body: raw });
      assert.equal(response.status, 400, raw);
    }
    const oversized = await fetch(app.baseUrl + '/api/bespoke', { method: 'POST', body: 'x'.repeat(80001) });
    assert.equal(oversized.status, 413);
    for (const route of ['/bespoke/%00', '/bespoke/%5c..%5c.env', '/bespoke/%', '/bespoke/.hidden.json', '/netlify/functions/bespoke-handoff.mjs']) assert.equal((await fetch(app.baseUrl + route)).status, 404, route);
    assert.deepEqual((await request({})).body.selection, payload(), 'Rejected requests did not replace the saved selection.');
  } finally { await app.close(); }
});

test('browser rejects malformed backups before replacement and retains an editable draft', async () => {
  const app = await createDevServer({ port: 0 }), browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => { window.__bespokeAutosave = { enabled: false }; });
    const unexpected = [], pageErrors = [];
    await context.route(/^https?:/, route => {
      if (new URL(route.request().url()).origin === app.baseUrl) return route.continue();
      unexpected.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    // A rejected import must never reach replacement confirmation.
    let dialogCount = 0;
    page.on('dialog', async dialog => { dialogCount++; await dialog.dismiss(); });
    await page.goto(app.baseUrl + '/bespoke/');
    await page.locator('#stepList button').first().waitFor();
    const original = await page.evaluate(() => localStorage.getItem('bespoke-draft-v2'));
    const preview = await page.locator('#modelStage').innerHTML();
    const cases = malformedCases().filter(item => ['root/__proto__', 'team/constructor', 'lone-surrogate-title', 'lone-surrogate-person', 'invalid-calendar', 'title-over-model-bound', 'hidden-box-too-long', 'blank-lesson-title', 'forged-legacy-reference', 'blank-legacy-title'].includes(item.name));
    for (const item of cases) {
      await page.locator('input[type=file]').first().setInputFiles({ name: item.name.replaceAll('/', '-') + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(item.selection)) });
      await page.waitForFunction(() => document.querySelector('#fileStatus')?.textContent.startsWith('Could not open that team file.'));
      assert.equal(await page.evaluate(() => localStorage.getItem('bespoke-draft-v2')), original, item.name);
      assert.equal(await page.locator('#modelStage').innerHTML(), preview, item.name);
      assert.equal(dialogCount, 0, `${item.name}: invalid input reached replacement confirmation`);
    }
    await builderDestination(page, 'Title slide');
    const layout = page.getByRole('group', { name: 'Arrangement' });
    await layout.locator('[data-choice="left"]').click();
    assert.equal(await page.locator('#modelStage .bespoke-slide').getAttribute('data-layout'), 'left');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(unexpected, []);
    await context.close();
  } finally { await browser.close(); await app.close(); }
});
