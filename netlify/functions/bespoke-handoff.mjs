/** Durable, team-authorized Bespoke drafts. No writes to main and no lesson builds. */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { LESSON_IDS, selectionErrors, semanticDigest, digest, submissionId } from './_shared/selection.mjs';
export { LESSON_IDS, submissionId };
export const DRAFT_BRANCH = 'bespoke-drafts';
export const WORKFLOW_FILE = 'spoke-signals.yml';
export const REPO = 'doclegg05/Curriculum-Employability-Skills';
export const WRONG_CODE = 'That team access code is not right. Check the code from Britt.';
export const VIEW_ONLY = 'This link can view the design but cannot change it. Ask your Team Leader for the builder link.';
export const SETUP_MESSAGE = 'Saving is not connected yet. Ask Britt to finish the connection.';
export const config = { path: '/api/bespoke', rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 120 } };
const MAX_BODY_BYTES = 80000;
const MAX_SELECTION_BYTES = 60000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{40}$/;
const RECEIPT = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{16}$/;
const fail = (status, error, message, details = {}) => ({ status, body: { ok: false, error, message, ...details } });
const ok = body => ({ status: 200, body: { ok: true, ...body } });
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function hashEditCode(code) { return createHash('sha256').update(String(code).trim(), 'utf8').digest('base64url'); }
// A distinct prefix keeps the tables apart: a view table pasted into BESPOKE_TEAM_KEYS grants nothing.
export function hashViewCode(code) { return createHash('sha256').update('view:' + String(code).trim(), 'utf8').digest('base64url'); }
export function hashesMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function keyBytes(key) {
  if (Buffer.isBuffer(key) && key.length === 32) return key;
  if (typeof key !== 'string') throw new Error('Invalid draft key');
  const result = Buffer.from(key, 'base64');
  if (result.length !== 32 || result.toString('base64') !== key) throw new Error('Invalid draft key');
  return result;
}
const TEAM_HASH = /^(?:[A-Za-z0-9_-]{43}|[a-fA-F0-9]{64})$/;
const VIEW_HASH = /^[A-Za-z0-9_-]{43}$/;
const VIEW_TABLE_WARNING = 'BESPOKE_VIEW_KEYS is not a valid table; team view links are disabled.';
function accessKeys(raw, hashFormat = TEAM_HASH) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!object(value) || Object.keys(value).length === 0) throw new Error('Missing team configuration');
  for (const [lesson, hash] of Object.entries(value)) {
    if (!LESSON_IDS.includes(lesson) || typeof hash !== 'string' || !hashFormat.test(hash)) throw new Error('Invalid team configuration');
  }
  return value;
}
// The view table never decides edit access, so a broken one turns off view links, not the service.
function viewTable(raw) {
  if (!raw) return {};
  try { return accessKeys(raw, VIEW_HASH); }
  catch { console.warn(VIEW_TABLE_WARNING); return {}; }
}
// Comparisons are constant-time over fixed-length digests, so timing does not show how close a guess is.
function holdsEdit(table, lessonId, code) {
  const expected = table[lessonId];
  if (!expected) return false;
  // Older team tables hold a hex SHA-256 digest of the bare code.
  if (expected.length === 64) return hashesMatch(createHash('sha256').update(code, 'utf8').digest('hex'), expected.toLowerCase());
  return hashesMatch(hashEditCode(code), expected);
}
function holdsView(table, lessonId, code) {
  const expected = table[lessonId];
  return Boolean(expected) && hashesMatch(hashViewCode(code), expected);
}
function aad(envelope) { return Buffer.from(JSON.stringify([envelope.schema, envelope.lessonId, envelope.savedAt]), 'utf8'); }
export function seal(key, payload, lessonId, savedAt = new Date().toISOString()) {
  const envelope = { schema: 'bespoke-cloud-draft/v2', lessonId, savedAt };
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), nonce);
  cipher.setAAD(aad(envelope));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return { ...envelope, nonce: nonce.toString('base64url'), box: Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64url') };
}
export function openBox(key, envelope) {
  try {
    if (!envelope || envelope.schema !== 'bespoke-cloud-draft/v2' || !LESSON_IDS.includes(envelope.lessonId)) return null;
    const nonce = Buffer.from(envelope.nonce, 'base64url'), box = Buffer.from(envelope.box, 'base64url');
    if (nonce.length !== 12 || box.length < 17) return null;
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), nonce);
    decipher.setAAD(aad(envelope));
    decipher.setAuthTag(box.subarray(-16));
    const inner = JSON.parse(Buffer.concat([decipher.update(box.subarray(0, -16)), decipher.final()]).toString('utf8'));
    if (!object(inner) || inner.selection?.lesson?.id !== envelope.lessonId || !Array.isArray(inner.receipts)) return null;
    return inner;
  } catch { return null; }
}
export function assertDraftWrite(branch, lessonId) {
  if (branch !== DRAFT_BRANCH) throw new Error('refusing to write outside bespoke-drafts');
  if (!LESSON_IDS.includes(lessonId)) throw new Error('refusing an unknown lesson');
}
function openedDraft(existing, lessonId, key) {
  if (!existing) return null;
  const inner = openBox(key, existing.envelope);
  if (!inner || existing.envelope.lessonId !== lessonId) throw new Error('Saved design cannot be decrypted');
  return { ...existing, inner };
}
function view(draft) { return draft ? { revision: draft.sha, savedAt: draft.envelope.savedAt, selection: draft.inner.selection } : { revision: null, savedAt: null, selection: null }; }
// View links are shared widely and never expire, so they leave out contact details, review notes and the archived original.
function viewerView(draft) {
  const answer = view(draft);
  if (!answer.selection) return answer;
  const { unspoken, legacySelection, ...shared } = answer.selection;
  const { email, ...spokesperson } = shared.team.spokesperson;
  return { ...answer, selection: { ...shared, team: { ...shared.team, spokesperson } } };
}
function conflict(draft) { const { revision, savedAt } = view(draft); return fail(409, 'conflict', 'A newer design is saved. Open the latest design before replacing it. Your working copy has not been changed.', { revision, savedAt }); }
function validRevision(body) { return Object.hasOwn(body, 'expectedRevision') && (body.expectedRevision === null || (typeof body.expectedRevision === 'string' && SHA.test(body.expectedRevision))); }
function checkSelection(selection, lessonId, forSend = true) {
  if (!object(selection) || Buffer.byteLength(JSON.stringify(selection), 'utf8') > MAX_SELECTION_BYTES) return fail(400, 'selection', 'The design is missing or too large. Keep source files in your shared lesson folder.');
  const errors = selectionErrors(selection, lessonId, forSend);
  return errors.length ? fail(400, 'selection', 'Check the lesson, spokesperson and design choices before saving.', { details: errors.slice(0, 12) }) : null;
}
function replay(draft, mutationId, requestDigest) {
  const receipt = draft && (draft.inner.mutationId === mutationId
    ? { mutationId, requestDigest: draft.inner.requestDigest, revision: draft.sha, savedAt: draft.envelope.savedAt }
    : draft.inner.receipts.find(item => item.mutationId === mutationId));
  if (!receipt) return null;
  if (receipt.requestDigest !== requestDigest) return fail(409, 'mutation', 'This save request was already used for different changes. Keep your work and start a new save.');
  return ok({ revision: receipt.revision, savedAt: receipt.savedAt, replayed: true });
}
const runName = (lessonId, receipt) => `Bespoke receipt ${lessonId} ${receipt}`;
async function receiptStatus(github, lessonId, receipt, runId) {
  const proposal = await github.findProposal(lessonId, receipt);
  if (proposal) return { submissionId: receipt, status: 'received', url: proposal.url };
  const run = await github.findRun(lessonId, receipt, runId);
  if (!run) return { submissionId: receipt, status: 'processing' };
  const base = { submissionId: receipt, runId: run.id };
  if (run.status !== 'completed') return { ...base, status: 'processing' };
  if (run.conclusion !== 'success') return { ...base, status: 'failed', message: 'The review package could not be created. Ask Britt to check the submission run; your saved design is safe.' };
  if (run.updatedAt && Date.now() - Date.parse(run.updatedAt) < 60000) return { ...base, status: 'processing' };
  return { ...base, status: 'failed', message: 'The submission run finished without a review package. Ask Britt to check it; your saved design is safe.' };
}

export async function handleAction(body, { github, token, draftKey, teamKeys, viewKeys }) {
  let key, keys, views;
  try { if (!token || !github) throw new Error('Not configured'); key = keyBytes(draftKey); keys = accessKeys(teamKeys); views = viewTable(viewKeys); }
  catch { return fail(503, 'setup', SETUP_MESSAGE); }
  if (!object(body)) return fail(400, 'body', 'The request could not be read.');
  const { action, lessonId } = body;
  if (!['save', 'open', 'history', 'openRevision', 'send', 'status'].includes(action)) return fail(400, 'action', 'Choose Save, Open, History or Send to Britt.');
  if (!LESSON_IDS.includes(lessonId)) return fail(400, 'lesson', 'Choose one of the six lessons.');
  const code = typeof body.editCode === 'string' ? body.editCode.trim() : '';
  if (code.length < 20 || code.length > 128) return fail(403, 'code', WRONG_CODE);
  const mayEdit = holdsEdit(keys, lessonId, code), mayView = holdsView(views, lessonId, code);
  if (!mayEdit && !mayView) return fail(403, 'code', WRONG_CODE);
  if (!mayEdit && action !== 'open') return fail(403, 'view', VIEW_ONLY); // A view code opens the latest design: no history, status or writes.
  // Authorization has succeeded before the first repository read or write.
  try {
    if (action === 'history') {
      const versions = await github.listDraftHistory(lessonId, 10);
      const history = versions.map(item => { const draft = openedDraft(item, lessonId, key); return { revision: draft.sha, savedAt: draft.envelope.savedAt }; });
      return ok({ history });
    }
    if (action === 'openRevision') {
      if (typeof body.revision !== 'string' || !SHA.test(body.revision)) return fail(400, 'revision', 'Choose a saved version from History.');
      const old = openedDraft(await github.readDraftRevision(lessonId, body.revision), lessonId, key);
      return old ? ok(view(old)) : fail(404, 'missing', 'That saved version could not be found.');
    }
    if (action === 'status') {
      if (!RECEIPT.test(body.submissionId || '')) return fail(400, 'receipt', 'The submission receipt could not be read.');
      return ok(await receiptStatus(github, lessonId, body.submissionId, body.runId));
    }
    const current = openedDraft(await github.readDraft(lessonId), lessonId, key);
    if (action === 'open') return ok(mayEdit ? { ...view(current), access: 'edit' } : { ...viewerView(current), access: 'view' });
    if (!validRevision(body)) return fail(400, 'revision', 'Open the latest design before saving or sending.');
    const problem = checkSelection(body.selection, lessonId, action === 'send');
    if (problem) return problem;
    if (action === 'save') {
      if (!UUID.test(body.mutationId || '')) return fail(400, 'mutation', 'The save request needs a new request ID. Try Save again.');
      const requestDigest = digest({ expectedRevision: body.expectedRevision, selection: semanticDigest(body.selection) });
      const repeated = replay(current, body.mutationId, requestDigest);
      if (repeated) return repeated;
      if ((current?.sha || null) !== body.expectedRevision) return conflict(current);
      if (current && semanticDigest(current.inner.selection) === semanticDigest(body.selection)) return ok({ ...view(current), unchanged: true });
      const receipts = current ? [...current.inner.receipts, { mutationId: current.inner.mutationId, requestDigest: current.inner.requestDigest, revision: current.sha, savedAt: current.envelope.savedAt }] : [];
      const envelope = seal(key, { selection: body.selection, mutationId: body.mutationId, requestDigest, receipts }, lessonId);
      let revision;
      try { revision = await github.writeDraft(lessonId, envelope, current?.sha || null); }
      catch (err) {
        // A write conflict or a lost reply can mean THIS mutation succeeded.
        // Re-read only to recognize it; never retry a write over newer content.
        if (err.status === 409 || err.status === 422 || err.ambiguous) {
          const latest = openedDraft(await github.readDraft(lessonId), lessonId, key);
          const recognized = replay(latest, body.mutationId, requestDigest);
          if (recognized) return recognized;
          if (err.ambiguous && (latest?.sha || null) === body.expectedRevision) return fail(502, 'store', 'The save connection was interrupted. Keep this working copy and retry the same save request.');
          return conflict(latest);
        }
        throw err;
      }
      return ok({ revision, savedAt: envelope.savedAt, selection: body.selection });
    }
    if (!current || current.sha !== body.expectedRevision) return conflict(current);
    if (semanticDigest(current.inner.selection) !== semanticDigest(body.selection)) return fail(409, 'unsaved', 'Save these changes before sending them to Britt.', { revision: current.sha, savedAt: current.envelope.savedAt });
    const receipt = submissionId(current.inner.selection);
    const existing = await receiptStatus(github, lessonId, receipt);
    if (existing.status === 'received' || (existing.status === 'processing' && existing.runId)) return ok(existing);
    const run = await github.dispatchSpokeSignal(JSON.stringify(current.inner.selection), lessonId, receipt);
    return ok({ submissionId: receipt, status: 'processing', ...(run?.id ? { runId: run.id } : {}) });
  } catch (err) {
    return fail(502, 'store', 'The connected store could not complete this request. Keep your working copy and try again.');
  }
}

export function createGitHub(token, repository = REPO, fetchImpl = globalThis.fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const [owner, repo] = repository.split('/'), base = `/repos/${owner}/${repo}`;
  async function request(method, route, body) {
    let response;
    try { response = await fetchImpl(`https://api.github.com${route}`, { method, signal: AbortSignal.timeout(15000), headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'bespoke-handoff', 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
    catch { throw Object.assign(new Error('Repository connection interrupted'), { ambiguous: true }); }
    let text;
    try { text = await response.text(); } catch { throw Object.assign(new Error('Repository response interrupted'), { ambiguous: true }); }
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* report only sanitized status */ }
    return { status: response.status, data };
  }
  function requireStatus(res, statuses) { if (!statuses.includes(res.status)) throw Object.assign(new Error('Repository request failed'), { status: res.status }); return res.data; }
  const filename = lessonId => `drafts/${lessonId}.json`;
  async function readContent(lessonId, ref = DRAFT_BRANCH) {
    assertDraftWrite(DRAFT_BRANCH, lessonId);
    const res = await request('GET', `${base}/contents/${filename(lessonId)}?ref=${encodeURIComponent(ref)}`);
    if (res.status === 404) return null;
    let data = requireStatus(res, [200]);
    if (!data.content && data.sha) data = { ...requireStatus(await request('GET', `${base}/git/blobs/${data.sha}`), [200]), sha: data.sha };
    return { sha: data.sha, envelope: JSON.parse(Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')) };
  }
  return {
    readDraft: lessonId => readContent(lessonId),
    async readDraftRevision(lessonId, revision) {
      assertDraftWrite(DRAFT_BRANCH, lessonId);
      if (!SHA.test(revision)) return null;
      const res = await request('GET', `${base}/git/blobs/${revision}`);
      if (res.status === 404) return null;
      const data = requireStatus(res, [200]);
      const envelope = JSON.parse(Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8'));
      // Ciphertext is authenticated against the lesson; never return other blobs.
      return envelope.lessonId === lessonId ? { sha: revision, envelope } : null;
    },
    async listDraftHistory(lessonId, limit = 10) {
      assertDraftWrite(DRAFT_BRANCH, lessonId);
      const res = await request('GET', `${base}/commits?sha=${DRAFT_BRANCH}&path=${encodeURIComponent(filename(lessonId))}&per_page=${Math.min(10, limit)}`);
      if (res.status === 404 || res.status === 409) return [];
      const commits = requireStatus(res, [200]);
      const history = await Promise.all(commits.map(commit => readContent(lessonId, commit.sha)));
      return history.filter(Boolean).filter((item, index, all) => all.findIndex(other => other.sha === item.sha) === index);
    },
    async ensureDraftBranch() {
      const found = await request('GET', `${base}/git/ref/heads/${DRAFT_BRANCH}`);
      if (found.status === 200) return;
      requireStatus(found, [404]);
      const main = requireStatus(await request('GET', `${base}/git/ref/heads/main`), [200]);
      const created = await request('POST', `${base}/git/refs`, { ref: `refs/heads/${DRAFT_BRANCH}`, sha: main.object.sha });
      requireStatus(created, [201, 422]);
    },
    async writeDraft(lessonId, envelope, revision) {
      assertDraftWrite(DRAFT_BRANCH, lessonId);
      await this.ensureDraftBranch();
      const data = requireStatus(await request('PUT', `${base}/contents/${filename(lessonId)}`, { message: `chore(bespoke): save draft for ${lessonId}`, content: Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64'), branch: DRAFT_BRANCH, ...(revision ? { sha: revision } : {}) }), [200, 201]);
      if (!SHA.test(data?.content?.sha || '')) throw Object.assign(new Error('Missing write receipt'), { ambiguous: true });
      return data.content.sha;
    },
    async findProposal(lessonId, receipt) {
      const branch = `bespoke-signal/${lessonId}/${receipt}`;
      const data = requireStatus(await request('GET', `${base}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`), [200]);
      const proposal = data.find(pr => pr.head?.ref === branch && pr.head?.repo?.full_name?.toLowerCase() === repository.toLowerCase() && pr.base?.ref === 'main');
      return proposal ? { url: proposal.html_url, number: proposal.number } : null;
    },
    async findRun(lessonId, receipt, runId) {
      const title = runName(lessonId, receipt);
      // Prefer the newest matching run even if a browser still holds the ID
      // of a failed attempt. A safe retry uses the same proposal receipt.
      const data = requireStatus(await request('GET', `${base}/actions/workflows/${WORKFLOW_FILE}/runs?event=workflow_dispatch&per_page=100`), [200]);
      let run = data.workflow_runs.filter(item => item.display_title === title).sort((a, b) => b.id - a.id)[0];
      if (!run && Number.isSafeInteger(Number(runId)) && Number(runId) > 0) {
        const response = await request('GET', `${base}/actions/runs/${Number(runId)}`);
        if (response.status !== 404) {
          const candidate = requireStatus(response, [200]);
          if (candidate.display_title === title && candidate.path?.split('@')[0] === `.github/workflows/${WORKFLOW_FILE}`) run = candidate;
        }
      }
      return run ? { id: run.id, status: run.status, conclusion: run.conclusion, updatedAt: run.updated_at } : null;
    },
    async dispatchSpokeSignal(payloadJson, lessonId, receipt) {
      if (!LESSON_IDS.includes(lessonId) || !RECEIPT.test(receipt) || Buffer.byteLength(payloadJson, 'utf8') > MAX_SELECTION_BYTES) throw new Error('Invalid dispatch');
      const res = await request('POST', `${base}/actions/workflows/${WORKFLOW_FILE}/dispatches`, { ref: 'main', inputs: { payload_json: payloadJson, submission_id: receipt, lesson_id: lessonId } });
      const data = requireStatus(res, [200]);
      if (!Number.isSafeInteger(data?.workflow_run_id)) throw Object.assign(new Error('Missing dispatch receipt'), { ambiguous: true });
      return { id: data.workflow_run_id, url: data.html_url };
    }
  };
}

function jsonResponse(body, status) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { ...(status === 204 ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'X-Content-Type-Options': 'nosniff' } });
}
export async function handleRequest(req, env = process.env, deps = {}) {
  if (req.method === 'OPTIONS') return jsonResponse(null, 204);
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method', message: 'Use the Bespoke Save or Open controls.' }, 405);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return jsonResponse({ ok: false, error: 'size', message: 'The request is too large.' }, 400);
    let body;
    try { body = JSON.parse(raw); } catch { return jsonResponse({ ok: false, error: 'body', message: 'The request could not be read.' }, 400); }
    const token = env.BESPOKE_GITHUB_TOKEN;
    const github = deps.github || createGitHub(token, env.BESPOKE_GITHUB_REPOSITORY || REPO, deps.fetchImpl);
    const result = await handleAction(body, { github, token, draftKey: env.BESPOKE_DRAFT_KEY, teamKeys: env.BESPOKE_TEAM_KEYS, viewKeys: env.BESPOKE_VIEW_KEYS });
    return jsonResponse(result.body, result.status);
  } catch { return jsonResponse({ ok: false, error: 'store', message: 'The connected store could not complete this request. Keep your working copy and try again.' }, 502); }
}
export default async function handler(req) {
  const names = ['BESPOKE_GITHUB_TOKEN', 'BESPOKE_DRAFT_KEY', 'BESPOKE_TEAM_KEYS', 'BESPOKE_VIEW_KEYS', 'BESPOKE_GITHUB_REPOSITORY'];
  const env = Object.fromEntries(names.map(name => [name, globalThis.Netlify?.env?.get(name) ?? process.env[name]]));
  return handleRequest(req, env);
}
