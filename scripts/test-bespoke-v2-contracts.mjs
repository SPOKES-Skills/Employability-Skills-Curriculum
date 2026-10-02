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
import { handleAction, hashEditCode, hashViewCode, LESSON_IDS, seal, VIEW_ONLY } from '../netlify/functions/bespoke-handoff.mjs';
import { createDevServer, LOCAL_PREVIEW_VIEW_CODE } from './bespoke-dev-server.mjs';
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

test('all nine preset ids are accepted as a starting point', () => {
  assert.equal(catalog.presets.length, 9);
  for (const id of ['open-air', 'gold-standard', 'slate']) {
    const selection = payload();
    selection.design = applyPreset(catalog, id);
    assert.equal(selection.design.startingPoint, id);
    assert.deepEqual(selectionErrors(selection, selection.lesson.id), [], id);
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

test('a builder name is optional, bounded, and round-trips through save and open', async () => {
  const plain = payload();
  assert.equal(Object.hasOwn(plain.team, 'builder'), false);
  assert.deepEqual(selectionErrors(plain, plain.lesson.id), [], 'no builder means the Team Leader builds');
  const named = payload();
  named.team.builder = { name: 'Dana Builder' };
  assert.deepEqual(selectionErrors(named, named.lesson.id), []);
  for (const bad of [{}, { name: '' }, { name: 'x'.repeat(201) }, { name: 'Dana', role: 'admin' }, 'Dana']) {
    const broken = payload();
    broken.team.builder = bad;
    assert.notDeepEqual(selectionErrors(broken, broken.lesson.id), [], JSON.stringify(bad));
  }
  const service = memoryService();
  const saved = await service.request('save', { selection: named, expectedRevision: null, mutationId: randomUUID() });
  assert.equal(saved.status, 200, JSON.stringify(saved));
  assert.equal((await service.request('open')).body.selection.team.builder.name, 'Dana Builder');
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

const VIEW_CODE = 'synthetic-team-view-code-000001';
const viewerCopy = ({ unspoken, legacySelection, ...shared }) => {
  const { email, ...leader } = shared.team.spokesperson;
  return { ...shared, team: { ...shared.team, spokesperson: leader } };
};
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
  const context = { github: api, token: 'synthetic', draftKey: Buffer.alloc(32, 4).toString('base64'), teamKeys: Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(code)])), viewKeys: JSON.stringify({ [legacy.lesson.id]: hashViewCode(VIEW_CODE) }) };
  if (existingSelection) {
    const envelope = seal(context.draftKey, { selection: existingSelection, receipts: [] }, existingSelection.lesson.id);
    current = { sha: 'a'.repeat(40), envelope }; revisions.set(current.sha, structuredClone(current));
  }
  const request = (action, fields = {}) => handleAction({ action, lessonId: legacy.lesson.id, editCode: code, ...fields }, context);
  const view = (action, fields = {}) => handleAction({ action, lessonId: legacy.lesson.id, editCode: VIEW_CODE, ...fields }, context);
  return { request, view, context, code, get writes() { return writes; }, get dispatched() { return dispatched; }, received() { proposal = { url: 'https://example.invalid/synthetic-review' }; } };
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

test('a view code opens the latest design and can do nothing else', async () => {
  const service = memoryService(), selection = payload();
  const empty = await service.view('open');
  assert.equal(empty.status, 200);
  assert.equal(empty.body.access, 'view');
  assert.equal(empty.body.selection, null, 'opening before the first save works');
  const saved = await service.request('save', { selection, expectedRevision: null, mutationId: randomUUID() });
  const opened = await service.view('open');
  assert.equal(opened.body.access, 'view');
  assert.deepEqual(opened.body.selection, viewerCopy(selection));
  assert.equal(opened.body.revision, saved.body.revision);
  assert.equal((await service.request('open')).body.access, 'edit');
  const attempts = [
    ['save', { selection, expectedRevision: saved.body.revision, mutationId: randomUUID() }],
    ['send', { selection, expectedRevision: saved.body.revision }],
    ['history', {}],
    ['openRevision', { revision: saved.body.revision }],
    ['status', { submissionId: 'anything' }]
  ];
  for (const [action, fields] of attempts) {
    const refused = await service.view(action, fields);
    assert.equal(refused.status, 403, action);
    assert.equal(refused.body.error, 'view', action);
    assert.equal(refused.body.message, VIEW_ONLY, action);
  }
  assert.equal(service.writes, 1, 'a view code never writes');
  assert.equal(service.dispatched, 0, 'a view code never sends');
  const otherLesson = LESSON_IDS.find(id => id !== legacy.lesson.id);
  const elsewhere = await handleAction({ action: 'open', lessonId: otherLesson, editCode: VIEW_CODE }, service.context);
  assert.equal(elsewhere.status, 403, 'a view code opens only its own lesson');
  assert.equal(elsewhere.body.error, 'code');
});

test('a view code sees the design without contact details, review notes or the archived original', async () => {
  const service = memoryService(), selection = payload();
  selection.team.builder = { name: 'Synthetic Builder' };
  selection.unspoken = 'Synthetic note for the design review only.';
  selection.legacySelection = structuredClone(legacy);
  assert.ok(selection.team.spokesperson.email, 'the fixture has a leader email');
  const saved = await service.request('save', { selection, expectedRevision: null, mutationId: randomUUID() });
  assert.equal(saved.status, 200, JSON.stringify(saved));
  assert.deepEqual((await service.request('open')).body.selection, selection, 'an edit code sees everything');
  const viewed = (await service.view('open')).body.selection;
  assert.equal(Object.hasOwn(viewed.team.spokesperson, 'email'), false);
  assert.equal(Object.hasOwn(viewed, 'unspoken'), false);
  assert.equal(Object.hasOwn(viewed, 'legacySelection'), false);
  assert.equal(viewed.team.spokesperson.name, selection.team.spokesperson.name);
  assert.deepEqual(viewed, viewerCopy(selection), 'everything else is unchanged, including the builder and team name');
  assert.deepEqual(selectionErrors(viewed, viewed.lesson.id, false), [], 'the viewer copy is still a valid selection');
  assert.deepEqual((await service.request('open')).body.selection, selection, 'the stored draft was not changed');
  assert.equal(service.writes, 1);
});

test('the edit table and the view table stay apart', async () => {
  const service = memoryService(), lesson = legacy.lesson.id;
  const call = (action, editCode, tables) => handleAction({ action, lessonId: lesson, editCode }, { ...service.context, ...tables });
  const viewTableInTeamKeys = { teamKeys: { [lesson]: hashViewCode(VIEW_CODE) }, viewKeys: undefined };
  for (const action of ['open', 'history']) {
    const refused = await call(action, VIEW_CODE, viewTableInTeamKeys);
    assert.equal(refused.status, 403, action);
    assert.equal(refused.body.error, 'code', action);
  }
  const teamTableInViewKeys = { viewKeys: JSON.stringify({ [lesson]: hashEditCode(service.code) }) };
  const edit = await call('open', service.code, teamTableInViewKeys);
  assert.equal(edit.status, 200);
  assert.equal(edit.body.access, 'edit', 'the edit code is not treated as view-only');
  assert.equal((await call('history', service.code, teamTableInViewKeys)).status, 200);
  const replacedTeamKeys = { ...teamTableInViewKeys, teamKeys: { [lesson]: hashEditCode('synthetic-replacement-team-code-01') } };
  for (const [editCode, tables] of [[VIEW_CODE, teamTableInViewKeys], [service.code, replacedTeamKeys]]) {
    const refused = await call('open', editCode, tables);
    assert.equal(refused.status, 403, 'an edit hash in the view table opens nothing');
    assert.equal(refused.body.error, 'code');
  }
});

test('the local preview view code opens the latest design read-only', async () => {
  const app = await createDevServer({ port: 0 });
  const call = async action => {
    const response = await fetch(app.baseUrl + '/api/bespoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, lessonId: legacy.lesson.id, editCode: LOCAL_PREVIEW_VIEW_CODE }) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const opened = await call('open');
    assert.equal(opened.status, 200);
    assert.equal(opened.body.access, 'view');
    const refused = await call('history');
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error, 'view');
  } finally { await app.close(); }
});

test('view codes are optional, and a broken view table disables only the view links', async () => {
  const service = memoryService();
  const open = (viewKeys, editCode = service.code) => handleAction({ action: 'open', lessonId: legacy.lesson.id, editCode }, { ...service.context, viewKeys });
  const warning = 'BESPOKE_VIEW_KEYS is not a valid table; team view links are disabled.';
  const hexViewTable = JSON.stringify({ [legacy.lesson.id]: createHash('sha256').update(VIEW_CODE).digest('hex') });
  const cases = [[undefined, false], ['', false], ['{"not-a-lesson":"x"}', true], ['not json', true], ['{}', true], ['null', true], ['[]', true], [hexViewTable, true]];
  const original = console.warn;
  try {
    for (const [viewKeys, broken] of cases) {
      const warnings = [];
      console.warn = (...args) => { warnings.push(args); };
      const edit = await open(viewKeys), viewed = await open(viewKeys, VIEW_CODE);
      console.warn = original;
      assert.equal(edit.status, 200, `the edit code opens with ${viewKeys}`);
      assert.equal(viewed.status, 403, `the view code is refused with ${viewKeys}`);
      assert.equal(viewed.body.error, 'code', String(viewKeys));
      assert.deepEqual(warnings, broken ? [[warning], [warning]] : [], `one warning per request with ${viewKeys}`);
    }
  } finally { console.warn = original; }
  const brokenTeamKeys = await handleAction({ action: 'open', lessonId: legacy.lesson.id, editCode: VIEW_CODE }, { ...service.context, teamKeys: 'not json' });
  assert.equal(brokenTeamKeys.status, 503, 'a broken team table still stops the service');
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
