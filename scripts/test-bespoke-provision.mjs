import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { provision, reissue } from './bespoke-provision.mjs';
import { CODE_ALPHABET, hashAccessCode, newAccessCode } from '../netlify/functions/_shared/access-code.mjs';

const wizardUrl = 'https://example.test/bespoke/';
const CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;
const LESSONS = ['goal-setting', 'money-management', 'professionalism-and-diversity', 'knowing-your-rights', 'communicating-assertively', 'workplace-ethics'];
const readJson = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const mode = file => fs.statSync(file).mode & 0o777;
function withTmp(callback) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  try { return callback(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

test('new access codes are two groups of four characters with no look-alikes', () => {
  assert.equal(CODE_ALPHABET, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');
  const codes = Array.from({ length: 200 }, () => newAccessCode());
  for (const code of codes) assert.match(code, CODE);
  assert.ok(new Set(codes).size > 190);
});

test('a typed code matches whatever its case, spacing or dash', () => {
  const expected = hashAccessCode('K7QX-M3PD');
  for (const typed of ['K7QXM3PD', 'k7qx-m3pd', ' k7qx m3pd ', 'K7QX - M3PD']) assert.equal(hashAccessCode(typed), expected, typed);
  assert.notEqual(hashAccessCode('K7QX-M3PE'), expected);
});

test('older 32-character codes are still hashed exactly as given', () => {
  const legacy = 'aB3-dEf_ghIJklMNopQRstUVwxYZ0123';
  assert.equal(hashAccessCode(legacy), createHash('sha256').update(legacy).digest('base64url'));
  assert.notEqual(hashAccessCode(legacy.toLowerCase()), hashAccessCode(legacy));
});

test('provisioned links have independent credentials, matching hashes, and private files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  try {
    const output = provision({ output: path.join(tmp, 'private'), wizardUrl: 'https://example.test/bespoke/' });
    const env = JSON.parse(fs.readFileSync(path.join(output, 'server-env.json')));
    const access = JSON.parse(fs.readFileSync(path.join(output, 'team-access.json')));
    const hashes = JSON.parse(env.BESPOKE_TEAM_KEYS);
    assert.equal(Buffer.from(env.BESPOKE_DRAFT_KEY, 'base64').length, 32);
    assert.equal(new Set(Object.values(access).map(item => item.code)).size, 6);
    for (const [lesson, item] of Object.entries(access)) {
      assert.match(item.code, CODE);
      assert.equal(hashes[lesson], hashAccessCode(item.code));
      assert.equal(new URL(item.url).hash, `#team=${lesson}.${item.code}`);
      assert.equal(JSON.stringify(env).includes(item.code), false);
    }
    assert.ok(Object.values(access).every(item => fs.readFileSync(path.join(output, 'team-links.html'), 'utf8').includes(item.code)));
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(output, 'server-env.json')).mode & 0o777, 0o600);
    assert.throws(() => provision({ output, wizardUrl: 'https://example.test/bespoke/' }), /already exists/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'server-env.json'))).BESPOKE_DRAFT_KEY, env.BESPOKE_DRAFT_KEY);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('provisioning refuses repository paths and insecure or credential-bearing URLs', () => {
  assert.throws(() => provision({ output: path.resolve('.private-test'), wizardUrl: 'https://example.test/bespoke/' }), /outside this repository/);
  for (const wizardUrl of ['http://example.test/', 'https://a:b@example.test/', 'https://example.test/#secret', 'https://example.test/?code=secret']) {
    assert.throws(() => provision({ output: '/unused', wizardUrl }), /HTTPS/);
  }
});

test('reissuing all six writes a fresh team table and never the encryption key', () => withTmp(tmp => {
  const output = path.join(tmp, 'private');
  reissue({ output, wizardUrl, lesson: 'all', now: new Date('2026-10-13T15:30:00Z') });
  const env = readJson(output, 'team-env.json'), access = readJson(output, 'team-access.json');
  const hashes = JSON.parse(env.BESPOKE_TEAM_KEYS);
  assert.deepEqual(Object.keys(env), ['BESPOKE_TEAM_KEYS']);
  assert.deepEqual(Object.keys(hashes).sort(), [...LESSONS].sort());
  for (const [lesson, item] of Object.entries(access)) {
    assert.match(item.code, CODE);
    assert.equal(hashes[lesson], hashAccessCode(item.code));
    assert.equal(new URL(item.url).hash, `#team=${lesson}.${item.code}`);
  }
  assert.equal(fs.existsSync(path.join(output, 'server-env.json')), false);
  if (process.platform !== 'win32') {
    assert.equal(mode(output), 0o700);
    for (const name of ['team-env.json', 'team-access.json', 'team-links.html']) assert.equal(mode(path.join(output, name)), 0o600, name);
  }
}));

test('reissuing one lesson replaces only its code and keeps the previous files', () => withTmp(tmp => {
  const output = provision({ output: path.join(tmp, 'private'), wizardUrl });
  const serverEnv = fs.readFileSync(path.join(output, 'server-env.json'));
  const before = readJson(output, 'team-access.json');
  const beforeHashes = JSON.parse(JSON.parse(serverEnv).BESPOKE_TEAM_KEYS);
  const now = new Date('2026-10-13T15:30:00Z');
  reissue({ output, wizardUrl, lesson: 'money-management', now });
  const after = readJson(output, 'team-access.json');
  const hashes = JSON.parse(readJson(output, 'team-env.json').BESPOKE_TEAM_KEYS);
  assert.notEqual(after['money-management'].code, before['money-management'].code);
  assert.match(after['money-management'].code, CODE);
  assert.equal(hashes['money-management'], hashAccessCode(after['money-management'].code));
  for (const lesson of LESSONS.filter(id => id !== 'money-management')) {
    assert.deepEqual(after[lesson], before[lesson], lesson);
    assert.equal(hashes[lesson], beforeHashes[lesson], lesson);
  }
  assert.deepEqual(readJson(path.join(output, 'previous-20261013-153000'), 'team-access.json'), before);
  assert.ok(fs.readFileSync(path.join(output, 'server-env.json')).equals(serverEnv));
  assert.throws(() => reissue({ output, wizardUrl, lesson: 'goal-setting', now }), /already/);
}));

test('reissue refuses unknown lessons, missing or incomplete records, and repository paths', () => withTmp(tmp => {
  assert.throws(() => reissue({ output: path.join(tmp, 'a'), wizardUrl, lesson: 'not-a-lesson' }), /goal-setting/);
  assert.throws(() => reissue({ output: path.join(tmp, 'missing'), wizardUrl, lesson: 'money-management' }), /team-access\.json/);
  fs.mkdirSync(path.join(tmp, 'empty'));
  assert.throws(() => reissue({ output: path.join(tmp, 'empty'), wizardUrl, lesson: 'all' }), /team-access\.json/);
  fs.mkdirSync(path.join(tmp, 'partial'));
  fs.writeFileSync(path.join(tmp, 'partial', 'team-access.json'), JSON.stringify({ 'money-management': { title: 'Money', code: 'K7QX-M3PD', url: wizardUrl } }));
  assert.throws(() => reissue({ output: path.join(tmp, 'partial'), wizardUrl, lesson: 'money-management' }), /every lesson/);
  assert.throws(() => reissue({ output: path.resolve('.private-test'), wizardUrl, lesson: 'all' }), /outside this repository/);
}));

test('provisioning refuses any git work tree and a symlink that leads into this repository', () => withTmp(tmp => {
  const repo = path.join(tmp, 'other-repo');
  execFileSync('git', ['init', '-q', repo]);
  assert.throws(() => provision({ output: path.join(repo, 'private'), wizardUrl }), /git/);
  assert.throws(() => reissue({ output: path.join(repo, 'private'), wizardUrl, lesson: 'all' }), /git/);
  const link = path.join(tmp, 'link');
  fs.symlinkSync(path.resolve('docs'), link);
  assert.throws(() => reissue({ output: link, wizardUrl, lesson: 'all' }), /outside this repository|git/);
}));

test('a one-lesson reissue keeps only real lessons in the team table', () => withTmp(tmp => {
  const output = provision({ output: path.join(tmp, 'private'), wizardUrl });
  const record = readJson(output, 'team-access.json');
  fs.writeFileSync(path.join(output, 'team-access.json'), JSON.stringify({ ...record, 'old-lesson': { title: 'Old', code: 'K7QX-M3PD', url: wizardUrl } }));
  reissue({ output, wizardUrl, lesson: 'goal-setting', now: new Date('2026-10-13T15:30:00Z') });
  assert.deepEqual(Object.keys(JSON.parse(readJson(output, 'team-env.json').BESPOKE_TEAM_KEYS)).sort(), [...LESSONS].sort());
  assert.deepEqual(Object.keys(readJson(output, 'team-access.json')).sort(), [...LESSONS].sort());
}));

test('the reissue command prints no codes', () => withTmp(tmp => {
  const output = path.join(tmp, 'private');
  const stdout = execFileSync(process.execPath, ['scripts/bespoke-provision.mjs', '--reissue', 'all', '--output', output, '--wizard-url', wizardUrl], { encoding: 'utf8' });
  for (const item of Object.values(readJson(output, 'team-access.json'))) assert.equal(stdout.includes(item.code), false);
  assert.match(stdout, /team-env\.json/);
}));

test('minimal deployment package loads the real function and its validation catalogs', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-stage-'));
  try {
    const target = path.join(tmp, 'service');
    execFileSync(process.execPath, ['scripts/bespoke-stage-service.mjs', target]);
    const { handleRequest } = await import(pathToFileURL(path.join(target, 'netlify/functions/bespoke-handoff.mjs')));
    const response = await handleRequest(new Request('http://test/api/bespoke', { method: 'OPTIONS' }), {});
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(fs.existsSync(path.join(target, 'lesson-interview-skills')), false);
    assert.equal(fs.existsSync(path.join(target, 'server-env.json')), false);
    assert.equal(fs.existsSync(path.join(target, 'team-access.json')), false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
