import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { provision, provisionViewLinks } from './bespoke-provision.mjs';

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
      assert.equal(item.code.length, 32);
      assert.equal(hashes[lesson], createHash('sha256').update(item.code).digest('base64url'));
      assert.equal(new URL(item.url).hash, `#team=${lesson}.${item.code}`);
      assert.equal(JSON.stringify(env).includes(item.code), false);
    }
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(output, 'server-env.json')).mode & 0o777, 0o600);
    assert.throws(() => provision({ output, wizardUrl: 'https://example.test/bespoke/' }), /already exists/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'server-env.json'))).BESPOKE_DRAFT_KEY, env.BESPOKE_DRAFT_KEY);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('view links are added beside existing team links without touching them', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  const wizardUrl = 'https://example.test/bespoke/';
  try {
    const output = provision({ output: path.join(tmp, 'private'), wizardUrl });
    const names = ['server-env.json', 'team-access.json', 'team-links.html'];
    const before = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(output, name), 'utf8')]));
    provisionViewLinks({ output, wizardUrl });
    for (const name of names) assert.equal(fs.readFileSync(path.join(output, name), 'utf8'), before[name], `${name} is unchanged`);
    const team = JSON.parse(before['team-access.json']);
    const access = JSON.parse(fs.readFileSync(path.join(output, 'view-access.json')));
    const env = JSON.parse(fs.readFileSync(path.join(output, 'view-env.json')));
    const hashes = JSON.parse(env.BESPOKE_VIEW_KEYS);
    assert.deepEqual(Object.keys(env), ['BESPOKE_VIEW_KEYS']);
    assert.equal(new Set(Object.values(access).map(item => item.code)).size, 6);
    for (const [lesson, item] of Object.entries(access)) {
      assert.equal(item.code.length, 32);
      assert.notEqual(item.code, team[lesson].code, 'a view code is never the edit code');
      assert.equal(hashes[lesson], createHash('sha256').update(item.code).digest('base64url'));
      assert.equal(new URL(item.url).hash, `#view=${lesson}.${item.code}`);
      assert.equal(JSON.stringify(env).includes(item.code), false);
    }
    assert.match(fs.readFileSync(path.join(output, 'view-links.html'), 'utf8'), /#view=/);
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(output, 'view-access.json')).mode & 0o777, 0o600);
    assert.throws(() => provisionViewLinks({ output, wizardUrl }), /already exist/);
    assert.throws(() => provisionViewLinks({ output: path.join(tmp, 'empty'), wizardUrl }), /existing private provisioning directory/);
    assert.throws(() => provisionViewLinks({ output, wizardUrl: 'http://example.test/bespoke/' }), /HTTPS/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('provisioning refuses repository paths and insecure or credential-bearing URLs', () => {
  assert.throws(() => provision({ output: path.resolve('.private-test'), wizardUrl: 'https://example.test/bespoke/' }), /outside this repository/);
  for (const wizardUrl of ['http://example.test/', 'https://a:b@example.test/', 'https://example.test/#secret', 'https://example.test/?code=secret']) {
    assert.throws(() => provision({ output: '/unused', wizardUrl }), /HTTPS/);
  }
});

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
