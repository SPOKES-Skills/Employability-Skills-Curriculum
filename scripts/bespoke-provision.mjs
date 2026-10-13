#!/usr/bin/env node
/** Administrator-only provisioning. Secrets are written outside the checkout, never printed. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { hashAccessCode, newAccessCode } from '../netlify/functions/_shared/access-code.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/catalog.json'), 'utf8')).lessons;
const TEAM_FILES = ['team-env.json', 'team-access.json', 'team-links.html'];
const USAGE = 'Usage: node scripts/bespoke-provision.mjs --output /private/path --wizard-url https://host/bespoke/ [--reissue all|<lesson-id>]';
const MISSING_RECORD = 'Point --output at the private folder that holds team-access.json, or use --reissue all with a new folder.';
const PROVISION_NOTE = 'Back up server-env.json in your protected secret store. Its encryption key must remain available when the GitHub token changes. No GitHub token is included here.';
const REISSUE_NOTE = 'Set BESPOKE_TEAM_KEYS in Netlify from team-env.json, then redeploy the service. The old links keep working until that deploy. The encryption key is not changed.';
const json = value => JSON.stringify(value, null, 2) + '\n';
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const writer = target => (name, value) => fs.writeFileSync(path.join(target, name), value, { mode: 0o600, flag: 'wx' });
const teamKeys = access => JSON.stringify(Object.fromEntries(Object.entries(access).map(([id, item]) => [id, hashAccessCode(item.code)])));

function teamLinksPage(access, note) {
  const items = Object.values(access).map(item => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a> <code>${escapeHtml(item.code)}</code></li>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Private BeSpoke team links</title><style>body{font:18px system-ui;max-width:760px;margin:3rem auto;line-height:1.6}li{margin:1rem 0}code{font-size:1.1em;margin-left:.5rem}</style><h1>Private BeSpoke team links</h1><p>For Britt. Share each link only with its teaching team and pin it in their Teams channel. Each link and its 8-character code grant editing access; a team without its link can type the code. Do not publish this page or commit these files.</p><ul>${items}</ul><p>${note}</p></html>`;
}

function pageUrl(wizardUrl) {
  const url = new URL(wizardUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use the HTTPS BeSpoke page URL without a query, access code, or fragment.');
  }
  return url;
}

function privateTarget(output) {
  const target = path.resolve(output);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const realTarget = path.join(fs.realpathSync(path.dirname(target)), path.basename(target));
  const realRoot = fs.realpathSync(root);
  if (realTarget === realRoot || realTarget.startsWith(realRoot + path.sep)) {
    throw new Error('Choose a private output directory outside this repository.');
  }
  return target;
}

/** One new random code and link for each given lesson. */
function issue(url, chosen) {
  return Object.fromEntries(chosen.map(lesson => {
    const code = newAccessCode();
    return [lesson.id, { title: lesson.title, code, url: `${url.href}#team=${lesson.id}.${code}` }];
  }));
}

export function provision({ output, wizardUrl }) {
  const url = pageUrl(wizardUrl);
  const target = privateTarget(output);
  if (fs.existsSync(target)) throw new Error('Output already exists. Reuse the existing keys; do not regenerate the encryption key.');
  fs.mkdirSync(target, { mode: 0o700 });
  const access = issue(url, lessons);
  const write = writer(target);
  write('server-env.json', json({ BESPOKE_DRAFT_KEY: randomBytes(32).toString('base64'), BESPOKE_TEAM_KEYS: teamKeys(access) }));
  write('team-access.json', json(access));
  write('team-links.html', teamLinksPage(access, PROVISION_NOTE));
  return target;
}

/** The current record, or null for a new folder. A one-lesson reissue needs every other lesson's entry. */
function currentAccess(target, all) {
  const file = path.join(target, 'team-access.json');
  if (!fs.existsSync(target) && all) return null;
  if (!fs.existsSync(file)) throw new Error(MISSING_RECORD);
  if (all) return {};
  let access;
  try { access = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('team-access.json could not be read. Use --reissue all instead.'); }
  const complete = lessons.every(({ id }) => typeof access?.[id]?.code === 'string' && typeof access[id].url === 'string');
  if (!complete) throw new Error('team-access.json does not list every lesson. Use --reissue all instead.');
  return access;
}

/** Moves the current team files aside, because they stay the live codes until the service is redeployed. */
function archive(target, now) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = path.join(target, `previous-${stamp}`);
  try { fs.mkdirSync(dir, { mode: 0o700 }); } catch (error) {
    if (error.code === 'EEXIST') throw new Error('A reissue already ran this second. Wait a second and run it again.');
    throw error;
  }
  for (const name of TEAM_FILES) {
    if (fs.existsSync(path.join(target, name))) fs.renameSync(path.join(target, name), path.join(dir, name));
  }
}

/** New codes for one lesson or all six. Never reads or writes server-env.json or the encryption key. */
export function reissue({ output, wizardUrl, lesson, now = new Date() }) {
  const url = pageUrl(wizardUrl);
  const all = lesson === 'all';
  const chosen = all ? lessons : lessons.filter(item => item.id === lesson);
  if (!chosen.length) throw new Error(`Use --reissue all or one of: ${lessons.map(item => item.id).join(', ')}.`);
  const target = privateTarget(output);
  const current = currentAccess(target, all);
  const access = all ? issue(url, chosen) : { ...current, ...issue(url, chosen) };
  if (current) archive(target, now);
  else fs.mkdirSync(target, { mode: 0o700 });
  const write = writer(target);
  write('team-env.json', json({ BESPOKE_TEAM_KEYS: teamKeys(access) }));
  write('team-access.json', json(access));
  write('team-links.html', teamLinksPage(access, REISSUE_NOTE));
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const value = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
    const reissuing = args.includes('--reissue');
    if (args.length !== (reissuing ? 6 : 4) || !value('--output') || !value('--wizard-url') || (reissuing && !value('--reissue'))) throw new Error(USAGE);
    if (reissuing) {
      const target = reissue({ output: value('--output'), wizardUrl: value('--wizard-url'), lesson: value('--reissue') });
      console.log(`Wrote team-env.json, team-access.json and team-links.html in ${target}. No codes were printed. ${REISSUE_NOTE}`);
    } else {
      const target = provision({ output: value('--output'), wizardUrl: value('--wizard-url') });
      console.log(`Created six private team links and server configuration in ${target}. No secrets were printed. Protect this directory and back up the encryption key before deployment.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
