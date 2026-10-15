import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import { defaultDesign, applyPreset, setFeatureStyle, setRoleStyle, setSidebarText } from '../bespoke/builder-model.mjs';
import { selectionErrors, digest, canonicalJson } from '../netlify/functions/_shared/selection.mjs';
import { handleAction, hashEditCode, LESSON_IDS, seal, VIEW_ONLY } from '../netlify/functions/bespoke-handoff.mjs';
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

test('all twelve preset ids are accepted as a starting point', () => {
  assert.equal(catalog.presets.length, 12);
  for (const id of ['sidebar', 'horizon', 'corner', 'masthead', 'columns', 'plaque']) {
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
function memoryService(existingSelection) {
  let current = null, writes = 0, dispatched = 0, dispatchedPayload = null, proposal = null, run = null;
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
    async dispatchSpokeSignal(raw) { dispatchedPayload=JSON.parse(raw); dispatched++; assert.equal(JSON.parse(raw).schema, 'bespoke-selection/v2'); run = { id: 1, status: 'queued' }; return run; },
  };
  const code = 'synthetic-v2-team-access-code';
  const context = { github: api, token: 'synthetic', draftKey: Buffer.alloc(32, 4).toString('base64'), teamKeys: Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(code)])), viewKeys: JSON.stringify({ [legacy.lesson.id]: hashEditCode(VIEW_CODE) }) };
  if (existingSelection) {
    const envelope = seal(context.draftKey, { selection: existingSelection, receipts: [] }, existingSelection.lesson.id);
    current = { sha: 'a'.repeat(40), envelope }; revisions.set(current.sha, structuredClone(current));
  }
  const request = (action, fields = {}) => handleAction({ action, lessonId: legacy.lesson.id, editCode: code, ...fields }, context);
  const view = (action, fields = {}) => handleAction({ action, lessonId: legacy.lesson.id, editCode: VIEW_CODE, ...fields }, context);
  return { request, view, context, code, get writes() { return writes; }, get dispatched() { return dispatched; }, get dispatchedPayload() { return dispatchedPayload; }, received() { proposal = { url: 'https://example.invalid/synthetic-review' }; } };
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
  assert.deepEqual(opened.body.selection, selection);
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
  assert.equal((await handleAction({ action: 'open', lessonId: otherLesson, editCode: VIEW_CODE }, service.context)).status, 403, 'a view code opens only its own lesson');
});

test('view codes are optional, and a malformed table stops the service', async () => {
  const service = memoryService();
  const open = (viewKeys, editCode = service.code) => handleAction({ action: 'open', lessonId: legacy.lesson.id, editCode }, { ...service.context, viewKeys });
  assert.equal((await open(undefined)).status, 200, 'an edit code works with no view table');
  assert.equal((await open(undefined, VIEW_CODE)).status, 403, 'a view code is unknown when no view table is set');
  assert.equal((await open('{"not-a-lesson":"x"}')).status, 503);
  assert.equal((await open('not json')).status, 503);
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


test('A/B selection survives encrypted save, exact dispatch, immutable visual package and verified review', async () => {
  const selection=payload();
  selection.design=applyPreset(catalog,'outspoken');
  selection.design=setFeatureStyle(catalog,selection.design,'sidebar','font','bitter');
  selection.design=setFeatureStyle(catalog,selection.design,'sidebar','background','gold');
  selection.design=setRoleStyle(catalog,selection.design,'title','headingText','Chosen B — <script>never execute</script>');
  selection.design=setRoleStyle(catalog,selection.design,'title','extraText','A separate note');
  selection.alternatives={active:'B',otherDesign:applyPreset(catalog,'modern')};
  selection.alternatives.otherDesign.samples.boxes[3]='A remains recoverable';
  const service=memoryService(),saved=await service.request('save',{selection,expectedRevision:null,mutationId:randomUUID()});
  assert.equal(saved.status,200);assert.deepEqual((await service.request('open')).body.selection,selection);
  await service.request('send',{selection,expectedRevision:saved.body.revision});assert.deepEqual(service.dispatchedPayload,selection);
  const chosenA=structuredClone(selection);chosenA.design=selection.alternatives.otherDesign;chosenA.alternatives={active:'A',otherDesign:selection.design};
  const next=await service.request('save',{selection:chosenA,expectedRevision:saved.body.revision,mutationId:randomUUID()});assert.equal(next.status,200);
  assert.deepEqual((await service.request('open')).body.selection,chosenA);
  assert.deepEqual((await service.request('openRevision',{revision:saved.body.revision})).body.selection,selection);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bespoke-review-package-'));
  try {
    const file=path.join(tmp,'payload.json');fs.writeFileSync(file,JSON.stringify(service.dispatchedPayload));
    const out=execFileSync('python3',['scripts/bespoke-write-submission.py',file,'--repo-root',tmp],{cwd:root,encoding:'utf8'});
    const folder=out.trim().slice('Wrote '.length);
    const verified=JSON.parse(execFileSync('python3',['scripts/bespoke-review-package.py',folder],{cwd:root,encoding:'utf8'}));
    assert.equal(verified.selectionSha256,digest(selection));assert.equal(verified.chosenOption,'B');
    const contract=JSON.parse(fs.readFileSync(path.join(folder,'build-contract.json')));assert.deepEqual(contract.design,selection.design);
    const visual=fs.readFileSync(path.join(folder,'review.html'),'utf8');assert.match(visual,/data:font\/woff2;base64,/);assert.match(visual,/data:image\/png;base64,/);assert(!visual.includes('<base '));assert(!visual.includes('<script>'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder,'selection.json'))).alternatives,selection.alternatives);
    fs.appendFileSync(path.join(folder,'review.html'),'tampered');
    assert.throws(()=>execFileSync('python3',['scripts/bespoke-write-submission.py',file,'--repo-root',tmp],{cwd:root,stdio:'pipe'}),/Command failed/,'Retry does not overwrite tampered review artifacts');
    assert.throws(()=>execFileSync('python3',['scripts/bespoke-review-package.py',folder],{cwd:root,stdio:'pipe'}),/Command failed/);
    const malformed=structuredClone(selection);malformed.alternatives.otherDesign.roles.sidebar='malicious';assert(selectionErrors(malformed,selection.lesson.id).length);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
