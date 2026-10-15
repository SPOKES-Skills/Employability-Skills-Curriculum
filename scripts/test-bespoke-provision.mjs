import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { provision, provisionViewLinks, rotateTeamCodes } from './bespoke-provision.mjs';
import { hashEditCode, hashViewCode } from '../netlify/functions/bespoke-handoff.mjs';

function assertTeamLinksWording(page) {
  assert.match(page, /For Britt only\./);
  assert.match(page, /Send each link privately to that team's Team Leader, who passes it to the one person building\./);
  assert.match(page, /Each link grants editing access\./);
  assert.match(page, /Pin the team view link in the channel, not this one\./);
  assert.doesNotMatch(page, /pin it in their Teams channel/i, 'the old instruction to pin edit links is gone');
}
import { pathToFileURL } from 'node:url';
import { provision, provisionViewLinks, reissue } from './bespoke-provision.mjs';
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
    assertTeamLinksWording(fs.readFileSync(path.join(output, 'team-links.html'), 'utf8'));
    assert.throws(() => provision({ output, wizardUrl: 'https://example.test/bespoke/' }), /already exists/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'server-env.json'))).BESPOKE_DRAFT_KEY, env.BESPOKE_DRAFT_KEY);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

const VIEW_FILES = ['view-env.json', 'view-access.json', 'view-links.html'];
const TEAM_FILES = ['server-env.json', 'team-access.json', 'team-links.html'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-10-02T17:04:05.678Z');
const ROTATED = ['team-env-20261002-170405.json', 'team-access-20261002-170405.json', 'team-links-20261002-170405.html'];
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir).sort().map(name => [name, fs.readFileSync(path.join(dir, name))]));

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
      assert.equal(hashes[lesson], hashViewCode(item.code), 'the provisioner and the service hash view codes the same way');
      assert.equal(new URL(item.url).hash, `#view=${lesson}.${item.code}`);
      assert.equal(JSON.stringify(env).includes(item.code), false);
    }
    const page = fs.readFileSync(path.join(output, 'view-links.html'), 'utf8');
    assert.match(page, /#view=/);
    assert.match(page, /For Britt only\. Do not publish, forward or commit this page\./);
    assert.match(page, /Each link is for one team only\./);
    assert.match(page, /This is the link to pin in that team's channel\./);
    if (process.platform !== 'win32') for (const name of VIEW_FILES) assert.equal(fs.statSync(path.join(output, name)).mode & 0o777, 0o600, name);
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

test('adding view links checks that team-access.json exists without reading it', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  const marker = 'Not JSON. Adding view links must not open this file.\n';
  try {
    const output = path.join(tmp, 'private');
    fs.mkdirSync(output, { mode: 0o700 });
    fs.writeFileSync(path.join(output, 'team-access.json'), marker);
    provisionViewLinks({ output, wizardUrl: 'https://example.test/bespoke/' });
    for (const name of VIEW_FILES) assert.ok(fs.existsSync(path.join(output, name)), name);
    assert.equal(fs.readFileSync(path.join(output, 'team-access.json'), 'utf8'), marker);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('adding view links refuses, and names the file, when any view file already exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  const wizardUrl = 'https://example.test/bespoke/';
  const leftover = '{"note":"synthetic leftover file"}\n';
  try {
    for (const name of VIEW_FILES) {
      const output = provision({ output: path.join(tmp, `private-${name}`), wizardUrl });
      fs.writeFileSync(path.join(output, name), leftover, { mode: 0o600 });
      assert.throws(() => provisionViewLinks({ output, wizardUrl }), new RegExp(`View links already exist here.*${name.replace('.', '\\.')}`));
      assert.equal(fs.readFileSync(path.join(output, name), 'utf8'), leftover, `${name} is unchanged`);
      for (const other of VIEW_FILES.filter(item => item !== name)) assert.equal(fs.existsSync(path.join(output, other)), false, `${other} was not written`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('a repository path typed in another case is refused before anything is written', t => {
  const upper = root.toUpperCase();
  if (upper === root || !fs.existsSync(upper)) return t.skip('the file system is case-sensitive');
  const wizardUrl = 'https://example.test/bespoke/';
  const scripts = path.join(root, 'scripts');
  const written = () => [root, scripts].flatMap(dir => [...TEAM_FILES, ...VIEW_FILES, ...ROTATED].filter(name => fs.existsSync(path.join(dir, name))).map(name => path.join(dir, name)));
  assert.deepEqual(written(), [], 'precondition: no provisioning files in the checkout');
  // Only places where even a build that missed the case change cannot write: two existing directories, and a path under a file.
  for (const output of [upper, path.join(upper, 'SCRIPTS'), path.join(upper, 'SCRIPTS', 'TEST-BESPOKE-PROVISION.MJS', 'private')]) {
    assert.throws(() => provision({ output, wizardUrl }), /outside this repository/, output);
    assert.throws(() => provisionViewLinks({ output, wizardUrl }), /outside this repository/, output);
    assert.throws(() => rotateTeamCodes({ output, wizardUrl, now: NOW }), /outside this repository/, output);
  }
  assert.deepEqual(written(), [], 'no file was created');
  assert.equal(fs.existsSync(path.join(scripts, 'test-bespoke-provision.mjs', 'private')), false);
});

test('replacing the team codes writes new dated files and leaves the old ones alone', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  const wizardUrl = 'https://example.test/bespoke/';
  try {
    const output = provision({ output: path.join(tmp, 'private'), wizardUrl });
    const before = snapshot(output);
    const old = JSON.parse(before['team-access.json']);
    assert.deepEqual(rotateTeamCodes({ output, wizardUrl, now: NOW }), { directory: output, files: ROTATED });
    const after = snapshot(output);
    for (const name of TEAM_FILES) assert.deepEqual(after[name], before[name], `${name} is byte-identical`);
    assert.deepEqual(Object.keys(after), [...TEAM_FILES, ...ROTATED].sort());
    const env = JSON.parse(after[ROTATED[0]]), access = JSON.parse(after[ROTATED[1]]), page = after[ROTATED[2]].toString();
    assert.deepEqual(Object.keys(env), ['BESPOKE_TEAM_KEYS']);
    const hashes = JSON.parse(env.BESPOKE_TEAM_KEYS);
    assert.deepEqual(Object.keys(access), Object.keys(old));
    assert.deepEqual(Object.keys(hashes), Object.keys(old));
    assert.equal(new Set(Object.values(access).map(item => item.code)).size, 6);
    for (const [lesson, item] of Object.entries(access)) {
      assert.equal(item.code.length, 32);
      assert.notEqual(item.code, old[lesson].code);
      assert.equal(item.title, old[lesson].title);
      assert.equal(hashes[lesson], hashEditCode(item.code), 'the provisioner and the service hash edit codes the same way');
      assert.ok(item.url.startsWith(wizardUrl));
      assert.equal(new URL(item.url).hash, `#team=${lesson}.${item.code}`);
      assert.ok(page.includes(item.url));
      assert.equal(after[ROTATED[0]].toString().includes(item.code), false);
    }
    const shell = html => html.replace(/<ul>.*<\/ul>/s, '<ul></ul>');
    assert.equal(shell(page), shell(before['team-links.html'].toString()), 'same content and warnings as team-links.html');
    assertTeamLinksWording(page);
    if (process.platform !== 'win32') for (const name of ROTATED) assert.equal(fs.statSync(path.join(output, name)).mode & 0o777, 0o600, name);
    assert.throws(() => rotateTeamCodes({ output, wizardUrl, now: NOW }), /already exist.*team-env-20261002-170405\.json/);
    assert.deepEqual(snapshot(output), after, 'a second call with the same time changes nothing');
    const empty = path.join(tmp, 'empty');
    fs.mkdirSync(empty);
    assert.throws(() => rotateTeamCodes({ output: empty, wizardUrl, now: NOW }), /server-env\.json/);
    assert.deepEqual(fs.readdirSync(empty), []);
    assert.throws(() => rotateTeamCodes({ output, wizardUrl: 'http://example.test/bespoke/', now: NOW }), /HTTPS/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('replacing the team codes never opens the encryption key or the old codes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  const marker = 'Not JSON. Replacing the team codes must not open this file.\n';
  try {
    const output = path.join(tmp, 'private');
    fs.mkdirSync(output, { mode: 0o700 });
    for (const name of ['server-env.json', 'team-access.json']) fs.writeFileSync(path.join(output, name), marker);
    rotateTeamCodes({ output, wizardUrl: 'https://example.test/bespoke/', now: NOW });
    for (const name of ['server-env.json', 'team-access.json']) assert.equal(fs.readFileSync(path.join(output, name), 'utf8'), marker, name);
    for (const name of ROTATED) assert.ok(fs.existsSync(path.join(output, name)), name);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('the command line prints no code, hash or link, and refuses both modes at once', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bespoke-provision-'));
  const wizardUrl = 'https://example.test/bespoke/';
  const run = (...args) => execFileSync(process.execPath, ['scripts/bespoke-provision.mjs', '--output', output, '--wizard-url', wizardUrl, ...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  let output;
  try {
    output = provision({ output: path.join(tmp, 'private'), wizardUrl });
    const printed = run('--rotate-team-codes');
    const created = fs.readdirSync(output).filter(name => !TEAM_FILES.includes(name));
    assert.equal(created.length, 3);
    assert.ok(printed.includes(output));
    for (const name of created) assert.ok(printed.includes(name), name);
    const secrets = created.flatMap(name => {
      const text = fs.readFileSync(path.join(output, name), 'utf8');
      if (name.startsWith('team-access-')) return Object.values(JSON.parse(text)).flatMap(item => [item.code, item.url]);
      if (name.startsWith('team-env-')) return Object.values(JSON.parse(JSON.parse(text).BESPOKE_TEAM_KEYS));
      return [];
    });
    assert.equal(secrets.length, 18);
    for (const secret of secrets) assert.equal(printed.includes(secret), false);
    assert.doesNotMatch(printed, /#team=/);
    const before = snapshot(output);
    assert.throws(() => run('--add-view-links', '--rotate-team-codes'), error => /not both/.test(error.stderr));
    assert.deepEqual(snapshot(output), before);
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

test('the view-link command prints no codes and will not run together with a reissue', () => withTmp(tmp => {
  const output = path.join(tmp, 'private');
  const run = (...args) => execFileSync(process.execPath, ['scripts/bespoke-provision.mjs', ...args, '--output', output, '--wizard-url', wizardUrl], { encoding: 'utf8', stdio: 'pipe' });
  run('--reissue', 'all');
  const stdout = run('--add-view-links');
  for (const item of Object.values(readJson(output, 'view-access.json'))) assert.equal(stdout.includes(item.code), false);
  assert.match(stdout, /view links/);
  assert.throws(() => run('--reissue', 'all', '--add-view-links'), /Usage/);
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
