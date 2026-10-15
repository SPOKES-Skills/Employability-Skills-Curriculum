import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../netlify/functions/_shared/selection.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import handler, { DRAFT_BRANCH, LESSON_IDS, REPO, WRONG_CODE, assertDraftWrite, createGitHub, handleAction, handleRequest, hashEditCode, openBox, seal, submissionId } from '../netlify/functions/bespoke-handoff.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const token = 'synthetic-token-not-a-secret';
const draftKey = Buffer.alloc(32, 42).toString('base64');
const code = 'synthetic-team-access-code-2026';
const lessonId = 'money-management';
const teamKeys = Object.fromEntries(LESSON_IDS.map(lesson => [lesson, hashEditCode(code)]));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
const sha = value => createHash('sha1').update(JSON.stringify(value)).digest('hex');
const clone = value => structuredClone(value);
const env = { BESPOKE_GITHUB_TOKEN: token, BESPOKE_DRAFT_KEY: draftKey, BESPOKE_TEAM_KEYS: JSON.stringify(teamKeys) };
const request = (action, fields = {}) => ({ action, lessonId, editCode: code, ...fields });
const savedRequest = (fields = {}) => request('save', { selection: clone(fixture), expectedRevision: null, mutationId: randomUUID(), ...fields });

function memoryGitHub() {
  const files = new Map(), revisions = new Map(), histories = new Map();
  const api = {
    reads: 0, writes: [], dispatches: [], proposal: null, run: null,
    async readDraft(lesson) { api.reads++; return clone(files.get(lesson) || null); },
    async writeDraft(lesson, envelope, expected) {
      assertDraftWrite(DRAFT_BRANCH, lesson);
      const existing = files.get(lesson);
      if ((existing?.sha || null) !== expected) throw Object.assign(new Error('Conflict'), { status: 409 });
      const next = { sha: sha(envelope), envelope: clone(envelope) };
      api.writes.push({ lesson, expected, branch: DRAFT_BRANCH });
      files.set(lesson, next); revisions.set(next.sha, next);
      histories.set(lesson, [next, ...(histories.get(lesson) || [])]);
      return next.sha;
    },
    async readDraftRevision(lesson, revision) { api.reads++; const old = revisions.get(revision); return old?.envelope.lessonId === lesson ? clone(old) : null; },
    async listDraftHistory(lesson, limit) { api.reads++; return clone((histories.get(lesson) || []).slice(0, limit)); },
    async findProposal() { api.reads++; return api.proposal; },
    async findRun() { api.reads++; return api.run; },
    async dispatchSpokeSignal(payload, lesson, receipt) {
      api.dispatches.push({ payload, lesson, receipt });
      api.run = { id: 42, status: 'queued', conclusion: null };
      return { id: 42 };
    }
  };
  return { api, files, revisions };
}
function context(api, more = {}) { return { github: api, token, draftKey, teamKeys, ...more }; }
async function initial(api, payload = clone(fixture)) {
  const body = savedRequest({ selection: payload });
  const result = await handleAction(body, context(api));
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return { body, result };
}

test('lesson authority matches the wizard catalog', () => {
  assert.deepEqual(LESSON_IDS, JSON.parse(fs.readFileSync(path.join(root, 'bespoke/catalog.json'), 'utf8')).lessons.map(lesson => lesson.id));
});

test('native OPTIONS is a real empty 204, without setup or JSON body errors', async () => {
  const response = await handleRequest(new Request('http://local/api/bespoke', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Max-Age'), '600');
});

test('production wrapper reads Netlify runtime env rather than treating context as env', async () => {
  const previous = globalThis.Netlify;
  const names = [];
  globalThis.Netlify = { env: { get(name) { names.push(name); return env[name]; } } };
  try {
    const response = await handler(new Request('http://local/api/bespoke', { method: 'POST', body: JSON.stringify(request('open', { editCode: 'wrong-but-long-enough-code' })) }), { platformContext: true });
    assert.equal(response.status, 403);
    assert.ok(names.includes('BESPOKE_DRAFT_KEY'));
    const options = await handler(new Request('http://local/api/bespoke', { method: 'OPTIONS' }));
    assert.equal(options.status, 204); assert.equal(await options.text(), '');
  } finally {
    if (previous === undefined) delete globalThis.Netlify;
    else globalThis.Netlify = previous;
  }
});

test('all actions authorize provisioned team access before any store read or write', async () => {
  const { api } = memoryGitHub();
  for (const action of ['save', 'open', 'history', 'openRevision', 'send', 'status']) {
    const result = await handleAction(request(action, { editCode: 'wrong-but-long-enough-team-code', selection: fixture }), context(api));
    assert.equal(result.status, 403);
    assert.equal(result.body.message, WRONG_CODE);
  }
  assert.equal((await handleAction(request('save', { editCode: 'short' }), context(api))).status, 403);
  assert.equal((await handleAction(request('open'), context(api, { teamKeys: { 'goal-setting': teamKeys['goal-setting'] } }))).status, 403);
  assert.equal(api.reads, 0); assert.equal(api.writes.length, 0);
});

test('8-character team codes open whatever their case, spacing or dash', async () => {
  const { api } = memoryGitHub();
  const keys = { ...teamKeys, [lessonId]: hashEditCode('K7QX-M3PD') };
  for (const typed of ['K7QX-M3PD', 'k7qxm3pd', ' k7qx m3pd ']) {
    assert.equal((await handleAction(request('open', { editCode: typed }), context(api, { teamKeys: keys }))).status, 200, typed);
  }
  assert.equal((await handleAction(request('open', { editCode: 'K7QX-M3PE' }), context(api, { teamKeys: keys }))).status, 403);
});

test('missing or malformed independent keys fail closed without repository access', async () => {
  const { api } = memoryGitHub();
  for (const settings of [{ token: '' }, { draftKey: token }, { draftKey: '' }, { teamKeys: {} }, { teamKeys: '{broken' }, { teamKeys: { [lessonId]: 'weak' } }]) {
    assert.equal((await handleAction(request('open'), context(api, settings))).status, 503);
  }
  assert.equal(api.reads, 0);
});

test('new lesson opens empty; first save returns durable revision and encrypted draft', async () => {
  const { api, files } = memoryGitHub();
  assert.deepEqual((await handleAction(request('open'), context(api))).body, { ok: true, revision: null, savedAt: null, selection: null });
  const { result } = await initial(api);
  assert.match(result.body.revision, /^[a-f0-9]{40}$/);
  const stored = files.get(lessonId);
  assert.equal(stored.envelope.schema, 'bespoke-cloud-draft/v2');
  assert.equal(JSON.stringify(stored.envelope).includes(fixture.team.name), false);
  assert.equal(JSON.stringify(stored.envelope).includes(code), false);
  assert.deepEqual(openBox(draftKey, stored.envelope).selection, fixture);
  const opened = await handleAction(request('open'), context(api));
  assert.deepEqual(opened.body.selection, fixture);
  assert.equal(opened.body.savedAt, stored.envelope.savedAt);
  assert.equal(opened.body.revision, result.body.revision);
});

test('rotating GitHub token preserves drafts, changing encryption key does not; metadata authenticated', async () => {
  const { api, files } = memoryGitHub(); await initial(api);
  const rotated = await handleAction(request('open'), context(api, { token: 'replacement-synthetic-token' }));
  assert.equal(rotated.status, 200); assert.deepEqual(rotated.body.selection, fixture);
  const badKey = await handleAction(request('open'), context(api, { draftKey: Buffer.alloc(32, 4).toString('base64') }));
  assert.equal(badKey.status, 502); assert.equal(badKey.body.selection, undefined);
  const envelope = clone(files.get(lessonId).envelope); envelope.savedAt = '1999-01-01';
  assert.equal(openBox(draftKey, envelope), null);
  assert.equal(api.writes.length, 1);
});

test('actual save requires revision and mutation id, and stale writes never overwrite', async () => {
  const { api } = memoryGitHub(); const { result } = await initial(api);
  const selection = { ...fixture, unspoken: 'Newer decision' };
  const update = await handleAction(savedRequest({ selection, expectedRevision: result.body.revision }), context(api));
  assert.equal(update.status, 200);
  const stale = await handleAction(savedRequest({ selection: { ...fixture, unspoken: 'Old browser' }, expectedRevision: result.body.revision }), context(api));
  assert.equal(stale.status, 409); assert.equal(stale.body.revision, update.body.revision);
  assert.equal(stale.body.savedAt, update.body.savedAt);
  const noRevision = savedRequest(); delete noRevision.expectedRevision;
  assert.equal((await handleAction(noRevision, context(api))).status, 400);
  assert.equal((await handleAction(savedRequest({ mutationId: 'not-a-uuid' }), context(api))).status, 400);
  assert.equal(api.writes.length, 2);
});

test('concurrent first saves produce one success and one conflict, no blind retry', async () => {
  const { api } = memoryGitHub();
  const results = await Promise.all([handleAction(savedRequest(), context(api)), handleAction(savedRequest({ selection: { ...fixture, unspoken: 'Other first writer' } }), context(api))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal(api.writes.length, 1);
});

test('lost response recognizes committed mutation; retry after later save returns original receipt', async () => {
  const { api } = memoryGitHub();
  const write = api.writeDraft;
  api.writeDraft = async (...args) => { await write(...args); api.writeDraft = write; throw Object.assign(new Error('Lost reply'), { ambiguous: true }); };
  const first = savedRequest();
  const response = await handleAction(first, context(api));
  assert.equal(response.status, 200); assert.equal(response.body.replayed, true);
  const newer = await handleAction(savedRequest({ expectedRevision: response.body.revision, selection: { ...fixture, unspoken: 'A later save' } }), context(api));
  assert.equal(newer.status, 200);
  const retry = await handleAction(first, context(api));
  assert.equal(retry.status, 200); assert.equal(retry.body.revision, response.body.revision); assert.equal(retry.body.replayed, true);
  assert.equal(api.writes.length, 2);
  const misuse = await handleAction({ ...first, selection: { ...fixture, unspoken: 'Different mutation payload' } }, context(api));
  assert.equal(misuse.status, 409); assert.equal(misuse.body.error, 'mutation');
});

test('interrupted uncommitted save stays retryable without claiming a newer revision', async () => {
  const { api } = memoryGitHub(); const write = api.writeDraft;
  api.writeDraft = async () => { api.writeDraft = write; throw Object.assign(new Error('Network interrupted'), { ambiguous: true }); };
  const pending = savedRequest();
  const interrupted = await handleAction(pending, context(api));
  assert.equal(interrupted.status, 502); assert.equal(api.writes.length, 0);
  const retry = await handleAction(pending, context(api));
  assert.equal(retry.status, 200); assert.equal(api.writes.length, 1);
});

test('semantic no-op ignores dates and timestamps and keeps canonical original selection', async () => {
  const { api } = memoryGitHub(); const { result } = await initial(api);
  const response = await handleAction(savedRequest({ expectedRevision: result.body.revision, selection: { ...fixture, submittedAt: '2027-03-01T12:00:00Z', date: '2027-03-01' } }), context(api));
  assert.equal(response.body.unchanged, true); assert.equal(response.body.revision, result.body.revision);
  assert.equal(response.body.savedAt, result.body.savedAt); assert.deepEqual(response.body.selection, fixture);
  assert.equal(api.writes.length, 1);
});

test('schema, catalog, calendar, variation and design-reference violations cannot enter storage', async () => {
  const badSelections = [];
  for (const mutation of [p => { p.theme = []; }, p => { p.extra = true; }, p => { p.theme.colorLead = 'off-brand'; }, p => { p.date = '2026-02-30'; }, p => { p.date = '0000-01-01'; }, p => { p.unspoken = '\ud800'; }, p => { p.theme.dividerStyle = 'split-panel'; }, p => { p.theme.cards.chapterStyles.I = p.theme.cards.chapterStyles.W; }, p => { p.theme.cards.chapterStyles.P1 = 'gradient-fill'; }, p => { p.theme.catalogIds.colorLead = 'colorLeads.mauve'; }, p => { p.lesson.id = 'time-management'; }]) {
    const selection = clone(fixture); mutation(selection); badSelections.push(selection);
  }
  const { api } = memoryGitHub();
  for (const selection of badSelections) assert.equal((await handleAction(savedRequest({ selection }), context(api))).status, 400, JSON.stringify(selection));
  assert.equal(api.writes.length, 0);
});

test('incomplete draft saves but cannot be sent until spokesperson is supplied and saved', async () => {
  const { api } = memoryGitHub(); const selection = clone(fixture); selection.team.spokesperson.name = '';
  const { result } = await initial(api, selection);
  const response = await handleAction(request('send', { selection, expectedRevision: result.body.revision }), context(api));
  assert.equal(response.status, 400); assert.equal(api.dispatches.length, 0);
});

test('history gives ten newest encrypted versions; recovered version remains old and conflicts on save', async () => {
  const { api } = memoryGitHub(); let revision = null; const versions = [];
  for (let index = 0; index < 12; index++) {
    const response = await handleAction(savedRequest({ expectedRevision: revision, selection: { ...fixture, unspoken: `Revision ${index}` } }), context(api));
    assert.equal(response.status, 200); revision = response.body.revision; versions.push(response.body);
  }
  const history = await handleAction(request('history'), context(api));
  assert.equal(history.body.history.length, 10); assert.equal(history.body.history[0].revision, revision);
  const old = await handleAction(request('openRevision', { revision: versions[4].revision }), context(api));
  assert.equal(old.body.revision, versions[4].revision); assert.equal(old.body.selection.unspoken, 'Revision 4');
  const conflict = await handleAction(savedRequest({ expectedRevision: old.body.revision, selection: old.body.selection }), context(api));
  assert.equal(conflict.status, 409); assert.equal(conflict.body.revision, revision);
});

test('canonical receipt ID matches Python with Unicode and original saved timestamps', () => {
  const unicode = clone(fixture); unicode.sampleContent.bullets = 'Résumé “team” café 😀\nLine 2';
  const expected = execFileSync('python3', ['-c', 'import json,hashlib,sys;p=json.load(sys.stdin);print(p["date"]+"-"+hashlib.sha256(json.dumps(p,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()[:16])'], { input: JSON.stringify(unicode), encoding: 'utf8' }).trim();
  assert.equal(submissionId(unicode), expected);
});

test('send uses canonical saved selection and returns processing, then exact received proposal receipt', async () => {
  const { api } = memoryGitHub(); const { result } = await initial(api);
  const body = request('send', { selection: { ...fixture, date: '2027-01-01', submittedAt: '2027-01-01T10:00:00Z' }, expectedRevision: result.body.revision });
  const sent = await handleAction(body, context(api));
  assert.equal(sent.status, 200); assert.equal(sent.body.status, 'processing'); assert.equal(sent.body.runId, 42);
  assert.equal(sent.body.submissionId, submissionId(fixture));
  assert.deepEqual(JSON.parse(api.dispatches[0].payload), fixture);
  assert.equal((await handleAction(body, context(api))).body.status, 'processing'); assert.equal(api.dispatches.length, 1);
  api.proposal = { url: 'https://github.com/doclegg05/Curriculum-Employability-Skills/pull/999' };
  const received = await handleAction(request('status', { submissionId: sent.body.submissionId, runId: 42 }), context(api));
  assert.equal(received.body.status, 'received'); assert.equal(received.body.url, api.proposal.url);
  assert.equal((await handleAction(body, context(api))).body.status, 'received'); assert.equal(api.dispatches.length, 1);
});

test('send rejects unsaved differences/stale revision, and failed workflow status never claims received', async () => {
  const { api } = memoryGitHub(); const { result } = await initial(api);
  assert.equal((await handleAction(request('send', { expectedRevision: null, selection: fixture }), context(api))).status, 409);
  assert.equal((await handleAction(request('send', { expectedRevision: result.body.revision, selection: { ...fixture, unspoken: 'Unsaved' } }), context(api))).body.error, 'unsaved');
  api.run = { id: 43, status: 'completed', conclusion: 'failure' };
  const status = await handleAction(request('status', { submissionId: submissionId(fixture) }), context(api));
  assert.equal(status.body.status, 'failed'); assert.equal(status.body.url, undefined);
  assert.match(status.body.message, /saved design is safe/);
});

test('failed submission can retry safely with the same canonical receipt', async () => {
  const { api } = memoryGitHub(); const { result } = await initial(api);
  api.run = { id: 41, status: 'completed', conclusion: 'failure' };
  const retried = await handleAction(request('send', { selection: fixture, expectedRevision: result.body.revision }), context(api));
  assert.equal(retried.body.status, 'processing');
  assert.equal(retried.body.submissionId, submissionId(fixture));
  assert.equal(retried.body.runId, 42);
  assert.equal(api.dispatches.length, 1);
});

test('old PAT-derived draft is not silently replaced', async () => {
  const { api, files } = memoryGitHub(); files.set(lessonId, { sha: 'a'.repeat(40), envelope: { schema: 'bespoke-cloud-draft/v1', box: 'old' } });
  assert.equal((await handleAction(savedRequest(), context(api))).status, 502); assert.equal(api.writes.length, 0);
});

test('HTTP injection path validates native requests, hides setup details and never echoes credentials', async () => {
  const { api } = memoryGitHub();
  const post = (body, settings = env) => handleRequest(new Request('http://local/api/bespoke', { method: 'POST', body: JSON.stringify(body) }), settings, { github: api });
  assert.equal((await post(request('open'), {})).status, 503);
  const saved = await post(savedRequest()); assert.equal(saved.status, 200);
  const wrong = await post(request('open', { editCode: 'different-long-enough-code' }));
  assert.equal(wrong.status, 403);
  const text = await wrong.text(); assert.equal(text.includes(token), false); assert.equal(text.includes(draftKey), false); assert.equal(text.includes(code), false);
  assert.equal((await handleRequest(new Request('http://local/api/bespoke', { method: 'POST', body: '{' }), env, { github: api })).status, 400);
});

// Exercise the production GitHub adapter, including documented 2026 dispatch
// responses, encoded refs, branch CAS and proposal/run identity filtering.
function fakeGitHubFetch() {
  const calls = [], files = new Map(), blobs = new Map(), commits = [];
  let branch = false, proposals = [], runs = [], artifacts = {"selection.json":JSON.stringify(fixture),"build-contract.json":JSON.stringify({selectionSha256:digest(fixture)})};
  const response = (status, data) => new Response(data === undefined ? null : JSON.stringify(data), { status });
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url), route = parsed.pathname, body = options.body ? JSON.parse(options.body) : null;
    calls.push({ route, query: parsed.searchParams, method: options.method, body, headers: options.headers });
    assert.equal(options.headers['X-GitHub-Api-Version'], '2026-03-10');
    assert.ok(options.signal instanceof AbortSignal);
    if (route.endsWith('/git/ref/heads/bespoke-drafts')) return response(branch ? 200 : 404, branch ? { object: { sha: 'a'.repeat(40) } } : {});
    if (route.endsWith('/git/ref/heads/main')) return response(200, { object: { sha: 'a'.repeat(40) } });
    if (route.endsWith('/git/refs')) { assert.equal(body.ref, 'refs/heads/bespoke-drafts'); branch = true; return response(201, {}); }
    if (route.includes('/contents/drafts/')) {
      if (options.method === 'PUT') {
        assert.equal(body.branch, DRAFT_BRANCH);
        if ((files.get(route)?.sha || null) !== (body.sha || null)) return response(409, {});
        const id = sha(body.content), stored = { sha: id, content: body.content };
        files.set(route, stored); blobs.set(id, stored); commits.unshift({ sha: sha(id), stored, route });
        return response(201, { content: { sha: id } });
      }
      const ref = parsed.searchParams.get('ref');
      const found = ref === DRAFT_BRANCH ? files.get(route) : commits.find(commit => commit.sha === ref && commit.route === route)?.stored;
      return found ? response(200, found) : response(404, {});
    }
    if (route.includes('/git/blobs/')) return blobs.has(route.split('/').at(-1)) ? response(200, blobs.get(route.split('/').at(-1))) : response(404, {});
    if (route.endsWith('/commits')) return response(200, commits.slice(0, Number(parsed.searchParams.get('per_page'))).map(({ sha }) => ({ sha })));
    if (route.includes('/contents/docs/phase-2/submissions/')) { const value=artifacts[route.split('/').at(-1)]; return value===undefined?response(404,{}):response(200,{content:Buffer.from(value).toString('base64'),encoding:'base64'}); }
    if (route.endsWith('/pulls')) return response(200, proposals);
    if (route.endsWith('/dispatches')) {
      assert.equal(body.ref, 'main');
      runs = [{ id: 501, display_title: `Bespoke receipt ${body.inputs.lesson_id} ${body.inputs.submission_id}`, path: '.github/workflows/spoke-signals.yml', status: 'queued', conclusion: null }];
      return response(200, { workflow_run_id: 501, run_url: 'https://api.github.com/run/501', html_url: `https://github.com/${REPO}/actions/runs/501` });
    }
    if (route.endsWith('/actions/runs/501')) return response(200, runs[0]);
    if (route.endsWith('/runs')) return response(200, { workflow_runs: runs });
    throw new Error('Unexpected test route: ' + route);
  };
  return { calls, fetchImpl, setArtifacts(value) { artifacts=value; }, setProposals(value) { proposals = value; }, setRuns(value) { runs = value; } };
}

test('real adapter uses draft branch only, blob revisions/history, 2026 dispatch receipt and exact PR identity', async () => {
  assert.throws(() => assertDraftWrite('main', lessonId), /bespoke-drafts/);
  const fake = fakeGitHubFetch(), github = createGitHub(token, REPO, fake.fetchImpl);
  const saved = await handleAction(savedRequest(), context(github)); assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const opened = await handleAction(request('open'), context(github)); assert.deepEqual(opened.body.selection, fixture);
  const history = await handleAction(request('history'), context(github)); assert.equal(history.body.history[0].revision, saved.body.revision);
  const old = await handleAction(request('openRevision', { revision: saved.body.revision }), context(github)); assert.deepEqual(old.body.selection, fixture);
  const sent = await handleAction(request('send', { selection: fixture, expectedRevision: saved.body.revision }), context(github));
  assert.equal(sent.body.status, 'processing'); assert.equal(sent.body.runId, 501);
  const receipt = sent.body.submissionId, branch = `bespoke-signal/${lessonId}/${receipt}`;
  fake.setProposals([{ head: { ref: 'another-branch', repo: { full_name: REPO } }, base: { ref: 'main' }, html_url: 'wrong' }]);
  assert.equal((await handleAction(request('status', { submissionId: receipt, runId: 501 }), context(github))).body.status, 'processing');
  fake.setProposals([{ head: { ref: branch, sha:'b'.repeat(40), repo: { full_name: REPO } }, base: { ref: 'main' }, html_url: `https://github.com/${REPO}/pull/321`, number: 321 }]);
  const received = await handleAction(request('status', { submissionId: receipt }), context(github)); assert.equal(received.body.status, 'received'); assert.match(received.body.url, /pull\/321$/);
  fake.setArtifacts({'selection.json':JSON.stringify({...fixture,unspoken:'tampered'})});
  assert.notEqual((await handleAction(request('status',{submissionId:receipt}),context(github))).body.status,'received','Matching branch alone cannot certify altered selection');
  assert.equal(fake.calls.some(call => call.method === 'PUT' && call.body.branch !== DRAFT_BRANCH), false);
  assert.equal(fake.calls.filter(call => call.route.endsWith('/dispatches')).length, 1);
});


test('status prefers newest matching run over a stale failed run ID', async () => {
  const fake = fakeGitHubFetch();
  const github = createGitHub(token, REPO, fake.fetchImpl);
  const receipt = submissionId(fixture);
  const title = `Bespoke receipt ${lessonId} ${receipt}`;
  fake.setRuns([
    { id: 502, display_title: title, status: 'queued', conclusion: null },
    { id: 501, display_title: title, status: 'completed', conclusion: 'failure' }
  ]);
  const status = await handleAction(request('status', { submissionId: receipt, runId: 501 }), context(github));
  assert.equal(status.body.runId, 502); assert.equal(status.body.status, 'processing');
});

test('v2 receipt verifies all artifact hashes at the exact PR commit', async () => {
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'bespoke/builder-catalog.json')));
  const selection={schema:'bespoke-selection/v2',date:'2026-10-07',lesson:fixture.lesson,team:fixture.team,design:catalog.defaults};
  const receipt=submissionId(selection),branch=`bespoke-signal/${lessonId}/${receipt}`,fake=fakeGitHubFetch();
  const contents={'selection.json':JSON.stringify(selection),'design.css':'/* synthetic */','build-contract.json':JSON.stringify({selectionSha256:digest(selection),design:selection.design}),'component-samples.html':'<p>sample</p>','review.html':'<p>self-contained sample</p>'};
  contents['review-package.json']=JSON.stringify({schema:'bespoke-review-package/v1',submissionId:receipt,selectionSha256:digest(selection),files:Object.fromEntries(Object.entries(contents).map(([name,text])=>[name,createHash('sha256').update(text).digest('hex')]))});
  fake.setArtifacts(contents);fake.setProposals([{head:{ref:branch,sha:'c'.repeat(40),repo:{full_name:REPO}},base:{ref:'main'},html_url:`https://github.com/${REPO}/pull/654`,number:654}]);
  const github=createGitHub(token,REPO,fake.fetchImpl),received=await github.findProposal(lessonId,receipt);
  assert.equal(received.selectionSha256,digest(selection));assert.match(received.artifactUrl,/\/cccccccccccccccccccccccccccccccccccccccc\//);
  assert(fake.calls.filter(c=>c.route.includes('/contents/docs/')).every(c=>c.query.get('ref')==='c'.repeat(40)));
  fake.setArtifacts({...contents,'review.html':'altered artifact'});assert.equal(await github.findProposal(lessonId,receipt),null);
  const stripped={...contents};delete stripped['review-package.json'];fake.setArtifacts(stripped);assert.equal(await github.findProposal(lessonId,receipt),null,'v2 requires its complete package');
});
