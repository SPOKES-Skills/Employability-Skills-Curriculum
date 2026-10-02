#!/usr/bin/env node
/** Administrator-only provisioning. Secrets are written outside the checkout, never printed. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/catalog.json'), 'utf8')).lessons;

export function provision({ output, wizardUrl }) {
  const url = new URL(wizardUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use the HTTPS BeSpoke page URL without a query, access code, or fragment.');
  }
  const target = path.resolve(output);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const realTarget = path.join(fs.realpathSync(path.dirname(target)), path.basename(target));
  const realRoot = fs.realpathSync(root);
  if (realTarget === realRoot || realTarget.startsWith(realRoot + path.sep)) {
    throw new Error('Choose a private output directory outside this repository.');
  }
  if (fs.existsSync(target)) throw new Error('Output already exists. Reuse the existing keys; do not regenerate the encryption key.');
  fs.mkdirSync(target, { mode: 0o700 });
  const access = Object.fromEntries(lessons.map(lesson => {
    const code = randomBytes(24).toString('base64url');
    return [lesson.id, { title: lesson.title, code, url: `${url.href}#team=${lesson.id}.${code}` }];
  }));
  const hashes = Object.fromEntries(Object.entries(access).map(([lesson, value]) => [lesson, createHash('sha256').update(value.code).digest('base64url')]));
  const env = {
    BESPOKE_DRAFT_KEY: randomBytes(32).toString('base64'),
    BESPOKE_TEAM_KEYS: JSON.stringify(hashes)
  };
  const write = (name, value) => fs.writeFileSync(path.join(target, name), value, { mode: 0o600, flag: 'wx' });
  write('server-env.json', JSON.stringify(env, null, 2) + '\n');
  write('team-access.json', JSON.stringify(access, null, 2) + '\n');
  write('team-links.html', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Private BeSpoke team links</title><style>body{font:18px system-ui;max-width:760px;margin:3rem auto;line-height:1.6}li{margin:1rem 0}</style><h1>Private BeSpoke team links</h1><p>For Britt. Share each link only with its teaching team and pin it in their Teams channel. Each link grants editing access. Do not publish this page or commit these files.</p><ul>${Object.values(access).map(item => `<li><a href="${item.url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${item.title}</a></li>`).join('')}</ul><p>Back up server-env.json in your protected secret store. Its encryption key must remain available when the GitHub token changes. No GitHub token is included here.</p></html>`);
  return target;
}

/** Adds one read-only link per lesson to an existing private directory. Never touches the team codes or the encryption key. */
export function provisionViewLinks({ output, wizardUrl }) {
  const url = new URL(wizardUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use the HTTPS BeSpoke page URL without a query, access code, or fragment.');
  }
  const target = path.resolve(output);
  if (!fs.existsSync(path.join(target, 'team-access.json'))) throw new Error('Point --output at the existing private provisioning directory that holds team-access.json.');
  const realTarget = fs.realpathSync(target), realRoot = fs.realpathSync(root);
  if (realTarget === realRoot || realTarget.startsWith(realRoot + path.sep)) throw new Error('The private directory must be outside this repository.');
  if (fs.existsSync(path.join(target, 'view-access.json'))) throw new Error('View links already exist here. Reuse them; do not regenerate.');
  const team = JSON.parse(fs.readFileSync(path.join(target, 'team-access.json'), 'utf8'));
  const freshCode = lessonId => {
    const code = randomBytes(24).toString('base64url');
    return code === team[lessonId]?.code ? freshCode(lessonId) : code;
  };
  const access = Object.fromEntries(lessons.map(lesson => {
    const code = freshCode(lesson.id);
    return [lesson.id, { title: lesson.title, code, url: `${url.href}#view=${lesson.id}.${code}` }];
  }));
  const hashes = Object.fromEntries(Object.entries(access).map(([lesson, value]) => [lesson, createHash('sha256').update(value.code).digest('base64url')]));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const items = Object.values(access).map(item => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></li>`).join('');
  const write = (name, value) => fs.writeFileSync(path.join(target, name), value, { mode: 0o600, flag: 'wx' });
  write('view-env.json', JSON.stringify({ BESPOKE_VIEW_KEYS: JSON.stringify(hashes) }, null, 2) + '\n');
  write('view-access.json', JSON.stringify(access, null, 2) + '\n');
  write('view-links.html', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>BeSpoke team view links</title><style>body{font:18px system-ui;max-width:760px;margin:3rem auto;padding:0 1rem}</style><h1>BeSpoke team view links</h1><p>Each link opens that team's latest saved design, read-only. These are the links to pin in each team's channel.</p><ul>${items}</ul></html>\n`);
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const value = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
    const addViews = args.includes('--add-view-links');
    if (args.length !== (addViews ? 5 : 4) || !value('--output') || !value('--wizard-url')) throw new Error('Usage: node scripts/bespoke-provision.mjs --output /private/path --wizard-url https://host/bespoke/ [--add-view-links]');
    if (addViews) {
      const target = provisionViewLinks({ output: value('--output'), wizardUrl: value('--wizard-url') });
      console.log(`Added six team view links in ${target}. No secrets were printed. The team codes and the encryption key were not changed.`);
    } else {
      const target = provision({ output: value('--output'), wizardUrl: value('--wizard-url') });
      console.log(`Created six private team links and server configuration in ${target}. No secrets were printed. Protect this directory and back up the encryption key before deployment.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
