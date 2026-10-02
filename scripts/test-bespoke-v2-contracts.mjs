import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import { defaultDesign, applyPreset, setSidebarText } from '../bespoke/builder-model.mjs';
import { selectionErrors, digest, canonicalJson } from '../netlify/functions/_shared/selection.mjs';
import { handleAction, hashEditCode, LESSON_IDS, seal } from '../netlify/functions/bespoke-handoff.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json')));
const payload = () => ({ schema: 'bespoke-selection/v2', date: '2026-09-24', submittedAt: '2026-09-24T16:30:00.000Z', lesson: structuredClone(legacy.lesson), team: structuredClone(legacy.team), design: defaultDesign(catalog) });

test('committed v2 schema is current and v1 remains accepted', () => {
  execFileSync(process.execPath, ['scripts/generate-selection-v2-schema.mjs', '--check'], { cwd: root });
  assert.deepEqual(selectionErrors(legacy, legacy.lesson.id), []);
  for (const preset of catalog.presets) {
    const selection = payload(); selection.design = applyPreset(catalog, preset.id);
    assert.deepEqual(selectionErrors(selection, selection.lesson.id), [], preset.id);
  }
});

test('the service accepts a design with or without a sidebar text color and rejects an unknown one', () => {
  const old = payload();
  assert.equal(Object.hasOwn(old.design.roles, 'sidebarText'), false);
  assert.deepEqual(selectionErrors(old, old.lesson.id), [], 'a design saved before this field stays valid');
  const chosen = payload();
  chosen.design = setSidebarText(catalog, chosen.design, 'gold');
  assert.deepEqual(selectionErrors(chosen, chosen.lesson.id), []);
  const unknown = payload();
  unknown.design.roles.sidebarText = 'teal';
  assert.notDeepEqual(selectionErrors(unknown, unknown.lesson.id), []);
});

test('closed v2 authority rejects malformed arrays, unknown colors, fonts, styles and injected CSS', () => {
  const changes = [
    p => { p.design.samples.boxes.push('extra'); },
    p => { p.design.samples.boxes[0] = { html: '<script>' }; },
    p => { p.design.samples.boxes[0] = 'x'.repeat(catalog.sampleLimits.box + 1); },
    p => { p.design.roles.sidebar = '#ffffff'; },
    p => { p.design.fonts.body = 'Franklin Gothic Book'; },
    p => { p.design.slides.cards.count = 3; },
    p => { p.design.slides.cards.titleBar = 'false'; },
    p => { p.design.slides.cards.css = 'body{display:none}'; },
    p => { p.date = '2026-02-30'; },
    p => { p.design.samples.title = '\ud800'; },
    p => { p.legacySelection = { ...legacy, schema: 'bespoke-selection/v2' }; },
  ];
  for (const change of changes) {
    const selection = payload(); change(selection);
    assert.ok(selectionErrors(selection, selection.lesson.id).length, String(change));
  }
});

test('v2 preserves original v1 recovery and canonical Python/Node identity', () => {
  const selection = payload(); selection.legacySelection = structuredClone(legacy);
  selection.design.samples.boxes[3] = 'Recovered — café 🎓';
  selection.design.fonts.heading = 'outfit'; selection.design.fonts.body = 'merriweather';
  assert.deepEqual(selectionErrors(selection, selection.lesson.id), []);
  assert.deepEqual(JSON.parse(canonicalJson(selection)).legacySelection, legacy);
  const script = 'import sys,json;sys.path.insert(0,"scripts");from bespoke_support import selection_digest,require_valid_selection;p=json.load(sys.stdin);require_valid_selection(p);print(selection_digest(p))';
  assert.equal(execFileSync('python3', ['-c', script], { cwd: root, input: JSON.stringify(selection), encoding: 'utf8' }).trim(), digest(selection));
});

test('incomplete current draft stays unsendable, while original incomplete v1 recovery remains unchanged', () => {
  const selection = payload(); selection.team.spokesperson.name = '';
  assert.deepEqual(selectionErrors(selection, selection.lesson.id, false), []);
  assert.ok(selectionErrors(selection, selection.lesson.id, true).length);
  selection.legacySelection = structuredClone(legacy);
  selection.legacySelection.team.spokesperson.name = '';
  selection.team.spokesperson.name = 'Synthetic reviewer';
  assert.deepEqual(selectionErrors(selection, selection.lesson.id, true), []);
  assert.equal(selection.legacySelection.team.spokesperson.name, '');
});

function memoryService(existingSelection) {
  let current = null, writes = 0, dispatched = 0, proposal = null, run = null;
  const revisions = new Map();
  const api = {
    async readDraft() { return structuredClone(current); },
    async writeDraft(lessonId, envelope, expected) {
      assert.equal(current?.sha || null, expected); writes++;
      const sha = createHash('sha1').update(JSON.stringify(envelope)).digest('hex');
      current = { sha, envelope }; revisions.set(sha, structuredClone(current)); return sha;
    },
    async readDraftRevision(lesson, revision) { return revisions.get(revision); },
    async listDraftHistory() { return [...revisions.values()].reverse(); },
    async findProposal() { return proposal; },
    async findRun() { return run; },
    async dispatchSpokeSignal(raw) { dispatched++; assert.equal(JSON.parse(raw).schema, 'bespoke-selection/v2'); run = { id: 1, status: 'queued' }; return run; },
  };
  const code = 'synthetic-v2-team-access-code';
  const context = { github: api, token: 'synthetic', draftKey: Buffer.alloc(32, 4).toString('base64'), teamKeys: Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(code)])) };
  if (existingSelection) {
    const envelope = seal(context.draftKey, { selection: existingSelection, receipts: [] }, existingSelection.lesson.id);
    current = { sha: 'a'.repeat(40), envelope }; revisions.set(current.sha, structuredClone(current));
  }
  const request = (action, fields = {}) => handleAction({ action, lessonId: legacy.lesson.id, editCode: code, ...fields }, context);
  return { request, get writes() { return writes; }, get dispatched() { return dispatched; }, received() { proposal = { url: 'https://example.invalid/synthetic-review' }; } };
}

test('v2 synthetic save/open/revision conflict/retry and receipt remain lossless', async () => {
  const service = memoryService(), selection = payload();
  const first = { selection, expectedRevision: null, mutationId: randomUUID() };
  const saved = await service.request('save', first); assert.equal(saved.status, 200, JSON.stringify(saved));
  const retry = await service.request('save', first); assert.equal(retry.body.replayed, true); assert.equal(service.writes, 1);
  const opened = await service.request('open'); assert.deepEqual(opened.body.selection, selection);
  const revised = structuredClone(selection);
  revised.design.slides.cards = { ...revised.design.slides.cards, count: '1', titleBar: false, treatment: 'numbered' };
  revised.design.fonts.body = 'merriweather';
  revised.design.samples.boxes[3] = 'Retained while hidden';
  const second = { selection: revised, expectedRevision: saved.body.revision, mutationId: randomUUID() };
  const updated = await service.request('save', second); assert.equal(updated.status, 200, JSON.stringify(updated));
  const stale = await service.request('save', { ...first, mutationId: randomUUID() }); assert.equal(stale.status, 409);
  const old = await service.request('openRevision', { revision: saved.body.revision }); assert.deepEqual(old.body.selection, selection);
  assert.deepEqual((await service.request('open')).body.selection, revised);
  assert.equal((await service.request('send', { selection, expectedRevision: updated.body.revision })).status, 409);
  const sent = await service.request('send', { selection: revised, expectedRevision: updated.body.revision });
  assert.equal(sent.body.status, 'processing'); assert.equal(service.dispatched, 1);
  await service.request('send', { selection: revised, expectedRevision: updated.body.revision }); assert.equal(service.dispatched, 1);
  service.received();
  assert.equal((await service.request('status', { submissionId: sent.body.submissionId })).body.status, 'received');
});

test('low-contrast choices save and reopen unchanged while stale writes remain blocked', async () => {
  const selection = payload(); selection.design.roles.dividerBackground = 'accent';
  const service = memoryService(selection);
  assert.deepEqual((await service.request('open')).body.selection, selection);
  assert.deepEqual((await service.request('openRevision', { revision: 'a'.repeat(40) })).body.selection, selection);
  Object.assign(selection.design.roles, { titleBackground: 'mauve', titleBackgroundEnd: 'accent', titleText: 'light', subtitle: 'light', body: 'gold', heading: 'accent' });
  assert.deepEqual(selectionErrors(selection, selection.lesson.id), []);
  const saved = await service.request('save', { selection, expectedRevision: 'a'.repeat(40), mutationId: randomUUID() });
  assert.equal(saved.status, 200, JSON.stringify(saved));
  assert.deepEqual((await service.request('open')).body.selection, selection);
  assert.deepEqual((await service.request('openRevision', { revision: saved.body.revision })).body.selection, selection);
  assert.equal((await service.request('save', { selection, expectedRevision: 'b'.repeat(40), mutationId: randomUUID() })).status, 409);
});

test('staged service includes every v2 model authority dependency', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-stage-test-'));
  try {
    const stage = path.join(temp, 'service');
    execFileSync(process.execPath, ['scripts/bespoke-stage-service.mjs', stage], { cwd: root });
    const authority = await import(pathToFileURL(path.join(stage, 'netlify/functions/_shared/selection.mjs')));
    const selection = payload(); assert.deepEqual(authority.selectionErrors(selection, selection.lesson.id), []);
    assert.equal(fs.existsSync(path.join(stage, 'fonts')), false);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
