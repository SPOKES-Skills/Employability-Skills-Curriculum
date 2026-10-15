#!/usr/bin/env node
/** Local-only BeSpoke preview and synthetic draft store. Never uses a GitHub adapter. */
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { handleRequest, hashEditCode, hashViewCode, LESSON_IDS, openBox } from '../netlify/functions/bespoke-handoff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BODY_LIMIT = 80000;
export const LOCAL_PREVIEW_CODE = 'bespoke-local-preview-synthetic';
export const LOCAL_PREVIEW_VIEW_CODE = 'bespoke-local-preview-view-only';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const inside = (base, target) => target === base || target.startsWith(base + path.sep);
const clone = value => structuredClone(value);

async function canonicalDestination(target) {
  const suffix = [];
  let existing = path.resolve(target);
  while (true) {
    try { return path.join(await fs.realpath(existing), ...suffix.reverse()); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw error;
      suffix.push(path.basename(existing)); existing = parent;
    }
  }
}

async function runtimeLocation(raw) {
  if (!raw) return null;
  const directory = await canonicalDestination(raw);
  if (inside(await fs.realpath(ROOT), directory)) throw new Error('Local runtime data must be outside the repository.');
  // Also prevent accidentally placing synthetic drafts in another saved checkout.
  for (let ancestor = directory; ; ancestor = path.dirname(ancestor)) {
    try { await fs.lstat(path.join(ancestor, '.git')); throw new Error('Local runtime data must be outside every Git checkout.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (path.dirname(ancestor) === ancestor) break;
  }
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, 'bespoke-local-state.json');
  try { if ((await fs.lstat(filename)).isSymbolicLink()) throw new Error('Local runtime state must not be a symbolic link.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return filename;
}

async function createStore(runtimeDir) {
  const filename = await runtimeLocation(runtimeDir);
  let state = { schema: 'bespoke-local-runtime/v1', draftKey: randomBytes(32).toString('base64'), lessons: {} };
  if (filename) {
    try {
      const stat = await fs.stat(filename);
      if (stat.size > 20 * 1024 * 1024) throw new Error('Local runtime state is too large to open safely.');
      state = JSON.parse(await fs.readFile(filename, 'utf8'));
      if (state.schema !== 'bespoke-local-runtime/v1' || !state.lessons || Array.isArray(state.lessons) || typeof state.lessons !== 'object') throw new Error('Unexpected local runtime format.');
      const key = Buffer.from(state.draftKey || '', 'base64');
      if (key.length !== 32 || key.toString('base64') !== state.draftKey) throw new Error('Invalid local runtime key.');
      for (const [lesson, revisions] of Object.entries(state.lessons)) {
        if (!LESSON_IDS.includes(lesson) || !Array.isArray(revisions)) throw new Error('Invalid local runtime lesson.');
        for (const item of revisions) {
          if (!/^[a-f0-9]{40}$/.test(item.sha || '') || item.envelope?.lessonId !== lesson || !openBox(state.draftKey, item.envelope)) throw new Error('Invalid local runtime revision.');
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot open existing local preview data; preserve the file and choose a new runtime directory.', { cause: error });
    }
  }
  let queue = Promise.resolve();
  async function persist(next) {
    if (!filename) return;
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      const file = await fs.open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(next) + '\n'); await file.sync(); }
      finally { await file.close(); }
      await fs.rename(temporary, filename);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  const adapter = {
    async readDraft(lesson) { return clone(state.lessons[lesson]?.[0] || null); },
    async writeDraft(lesson, envelope, expected) {
      const write = queue.then(async () => {
        if (!LESSON_IDS.includes(lesson) || envelope.lessonId !== lesson) throw new Error('Unknown synthetic lesson.');
        const history = state.lessons[lesson] || [];
        if ((history[0]?.sha || null) !== expected) throw Object.assign(new Error('Revision conflict'), { status: 409 });
        const sha = createHash('sha1').update(JSON.stringify(envelope)).digest('hex');
        const next = { ...state, lessons: { ...state.lessons, [lesson]: [{ sha, envelope: clone(envelope) }, ...history] } };
        await persist(next);
        state = next;
        return sha;
      });
      queue = write.catch(() => {});
      return write;
    },
    async readDraftRevision(lesson, revision) { return clone(state.lessons[lesson]?.find(item => item.sha === revision) || null); },
    async listDraftHistory(lesson, limit) { return clone((state.lessons[lesson] || []).slice(0, limit)); },
    async findProposal() { throw new Error('Review operations are disabled in local preview.'); },
    async findRun() { throw new Error('Review operations are disabled in local preview.'); },
    async dispatchSpokeSignal() { throw new Error('Sending is disabled in local preview.'); },
  };
  return { adapter, draftKey: state.draftKey, flush: () => queue, filename };
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(body));
}

async function requestBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function allowedStatic(relative) {
  if (relative.split(path.sep).some(part => part.startsWith('.'))) return false;
  if (!MIME[path.extname(relative)]) return false;
  return relative.startsWith('bespoke' + path.sep) || relative.startsWith('fonts' + path.sep)
    || relative === 'SPOKES-Logo.png' || ['bespoke-library-catalog.json', 'theme-options.json'].some(file => relative === path.join('SPOKES Builder', file));
}

export async function createDevServer({ port = 0, runtimeDir } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  const store = await createStore(runtimeDir);
  let env = {
    BESPOKE_GITHUB_TOKEN: 'local-preview-synthetic-token-no-network',
    BESPOKE_DRAFT_KEY: store.draftKey,
    BESPOKE_TEAM_KEYS: JSON.stringify(Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(LOCAL_PREVIEW_CODE)]))),
    BESPOKE_VIEW_KEYS: JSON.stringify(Object.fromEntries(LESSON_IDS.map(id => [id, hashViewCode(LOCAL_PREVIEW_VIEW_CODE)]))),
    BESPOKE_VIEW_KEYS: JSON.stringify(Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(LOCAL_PREVIEW_VIEW_CODE)]))),
  };
  let baseUrl;
  const server = http.createServer(async (req, res) => {
    try {
      const localPort = server.address().port;
      const allowedOrigins = new Set([`http://127.0.0.1:${localPort}`, `http://localhost:${localPort}`]);
      if (!allowedOrigins.has(`http://${req.headers.host}`)) return json(res, 403, { ok: false, error: 'host', message: 'Use this local preview origin.' });
      if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) return json(res, 403, { ok: false, error: 'origin', message: 'Only this local preview can access its test drafts.' });
      const url = new URL(req.url, baseUrl);
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/api/bespoke') {
        const raw = req.method === 'OPTIONS' ? Buffer.alloc(0) : await requestBody(req);
        let body;
        try { body = raw.length ? JSON.parse(raw.toString('utf8')) : null; } catch { /* The real handler returns the normal malformed-body response. */ }
        if (body?.action === 'send' || body?.action === 'status') return json(res, 403, { ok: false, error: 'local-preview', message: 'This local preview cannot send review requests or contact the hosted service. Test designs stay on this Mac.' });
        const request = new Request(baseUrl + '/api/bespoke', { method: req.method, headers: req.headers, ...(raw.length && !['GET', 'HEAD'].includes(req.method) ? { body: raw } : {}) });
        // Explicit synthetic adapter: handleRequest can never construct its remote adapter.
        const result = await handleRequest(request, env, { github: store.adapter });
        const headers = Object.fromEntries(result.headers);
        delete headers['access-control-allow-origin'];
        if (req.headers.origin) headers['access-control-allow-origin'] = req.headers.origin;
        res.writeHead(result.status, headers); res.end(Buffer.from(await result.arrayBuffer())); return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { ok: false, error: 'method', message: 'Use GET or HEAD for preview files.' });
      if (pathname === '/bespoke/handoff-config.json') return json(res, 200, { apiBase: baseUrl + '/api/bespoke', localPreview: true });
      if (pathname === '/' || pathname === '/bespoke') { res.writeHead(302, { Location: '/bespoke/' }); res.end(); return; }
      if (pathname.includes('\\') || pathname.includes('\0')) return json(res, 404, { ok: false, error: 'file' });
      const target = path.resolve(ROOT, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
      const relative = path.relative(ROOT, target);
      if (!inside(ROOT, target) || !allowedStatic(relative)) return json(res, 404, { ok: false, error: 'file' });
      const real = await fs.realpath(target);
      if (!inside(ROOT, real) || !allowedStatic(path.relative(ROOT, real))) return json(res, 404, { ok: false, error: 'file' });
      const stat = await fs.stat(real);
      if (!stat.isFile()) return json(res, 404, { ok: false, error: 'file' });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(real)] + (/\.(?:html|css|m?js|json)$/.test(real) ? '; charset=utf-8' : ''), 'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') res.end();
      else createReadStream(real).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (!res.headersSent) json(res, error.status || (['ENOENT', 'ENOTDIR', 'URIError'].includes(error.code || error.name) ? 404 : 500), { ok: false, error: 'local-preview', message: 'The local preview request could not be completed.' });
      else res.destroy();
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    server, baseUrl, runtimeFile: store.filename,
    // Test support: act like an administrator replacing every team's edit code.
    replaceEditCode(code) { env = { ...env, BESPOKE_TEAM_KEYS: JSON.stringify(Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(code)]))) }; },
    async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await store.flush(); }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); let port = 8766, runtimeDir;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--port' && args[index + 1]) port = Number(args[++index]);
    else if (args[index] === '--runtime-dir' && args[index + 1]) runtimeDir = args[++index];
    else throw new Error('Usage: node scripts/bespoke-dev-server.mjs [--port 8766] [--runtime-dir /outside-repo/path]');
  }
  const app = await createDevServer({ port, runtimeDir });
  console.log(`BeSpoke local preview: ${app.baseUrl}/bespoke/`);
  console.log(runtimeDir ? 'Synthetic test drafts persist in the chosen external runtime directory.' : 'Synthetic test drafts live in memory until this server stops.');
  console.log('Loopback only. Review sending and hosted-service access are disabled.');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
