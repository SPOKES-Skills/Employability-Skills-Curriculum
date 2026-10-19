import assert from 'node:assert/strict';
import test from 'node:test';
import { createTeamView, isShareHash, isSnapshotHash, viewBannerText, viewLinkToOpen } from '../bespoke/team-view.mjs';

const SAVED_AT = '2026-10-02T13:55:00.000Z';
const savedText = 'Saved ' + new Date(SAVED_AT).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

test('the banner names the team, the save and the builder after an open that found a design', () => {
  assert.equal(viewBannerText({ lesson: 'Money Management', savedAt: SAVED_AT, builder: 'Dana Builder', opened: true }),
    `Money Management team · View only · ${savedText} · Built by Dana Builder`);
});

test('the banner says nothing was saved, and names no builder, after an open that found no design', () => {
  assert.equal(viewBannerText({ lesson: 'Goal Setting', savedAt: null, builder: 'Sample Instructor', opened: true }),
    'Goal Setting team · View only · Nothing saved yet');
});

test('the banner says only the team and View only when the open failed', () => {
  assert.equal(viewBannerText({ lesson: 'Money Management', savedAt: null, builder: 'the Team Leader', opened: false }),
    'Money Management team · View only');
});

test('the banner says only View only when the link named no lesson', () => {
  assert.equal(viewBannerText({ lesson: '', savedAt: null, builder: 'the Team Leader', opened: false }), 'View only');
});

test('snapshot hashes are the v, s, c and retired e kinds, with or without the leading #', () => {
  for (const hash of ['#v=abc', '#s=abc', '#c=abc', '#e=abc', 'v=abc']) assert.equal(isSnapshotHash(hash), true, hash);
  for (const hash of ['', '#', '#stepPanel', '#team=a.b', '#view=a.b', '#vv=abc', '#=v']) assert.equal(isSnapshotHash(hash), false, hash);
});

test('share hashes are the snapshot kinds plus team and view links; the skip link is not one', () => {
  for (const hash of ['#team=a.b', '#view=a.b', '#v=abc', '#e=abc']) assert.equal(isShareHash(hash), true, hash);
  for (const hash of ['', '#stepPanel', '#teams=a.b', '#viewer=a.b']) assert.equal(isShareHash(hash), false, hash);
});

test('a builder link or a snapshot hash wins over every view link', () => {
  assert.equal(viewLinkToOpen({ hash: '', startupTeam: 'money-management.code', startupView: '', stored: 'money-management.view' }), '');
  assert.equal(viewLinkToOpen({ hash: '#v=abc', startupTeam: '', startupView: '', stored: 'money-management.view' }), '');
  assert.equal(viewLinkToOpen({ hash: 's=abc', startupTeam: '', startupView: 'money-management.new', stored: '' }), '');
});

test('a fresh view link wins over the stored one, and the stored one reopens on a bare load', () => {
  assert.equal(viewLinkToOpen({ hash: '', startupTeam: '', startupView: 'money-management.new', stored: 'money-management.old' }), 'money-management.new');
  assert.equal(viewLinkToOpen({ hash: '', startupTeam: '', startupView: '', stored: 'money-management.old' }), 'money-management.old');
  assert.equal(viewLinkToOpen({ hash: '#stepPanel', startupTeam: '', startupView: '', stored: '' }), '');
});

function fakeHost(overrides = {}) {
  const store = new Map();
  const host = {
    applied: [], notes: [], landed: 0, generationValue: 0, mode: 'edit', lessonId: '',
    request: async () => ({ ok: true, savedAt: SAVED_AT, selection: { lesson: { id: 'money-management' } } }),
    apply(selection) { host.applied.push(selection); host.generationValue++; },
    parseLink: value => { const [lessonId, editCode] = value.split('.'); return lessonId === 'money-management' && editCode?.length >= 20 ? { lessonId, editCode } : null; },
    generation: () => host.generationValue,
    lessonTitle: id => (id === 'money-management' ? 'Money Management' : ''),
    builder: () => 'Sample Instructor',
    enter(lessonId) { host.mode = 'view'; if (lessonId) host.lessonId = lessonId; },
    land() { host.landed++; },
    note(text) { host.notes.push(text); },
    render() {},
    storage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
    ...overrides
  };
  return host;
}
const LINK = 'money-management.' + 'v'.repeat(24);

function deferredRequest(host) {
  const waiting = [];
  host.request = () => new Promise(resolve => waiting.push(resolve));
  return answer => waiting.shift()(answer);
}

test('a late answer is dropped when the view session ended while it was waiting', async () => {
  const host = fakeHost(), release = deferredRequest(host), view = createTeamView(host);
  const opening = view.open(LINK);
  view.end();
  release({ ok: true, savedAt: SAVED_AT, selection: { lesson: { id: 'money-management' } } });
  assert.equal(await opening, false);
  assert.deepEqual(host.applied, []);
  assert.equal(host.landed, 0);
  assert.equal(view.active(), false);
});

test('a late answer is dropped when another design was opened while it was waiting', async () => {
  const host = fakeHost(), release = deferredRequest(host), view = createTeamView(host);
  const opening = view.open(LINK);
  host.generationValue++;
  release({ ok: true, savedAt: SAVED_AT, selection: { lesson: { id: 'money-management' } } });
  assert.equal(await opening, false);
  assert.deepEqual(host.applied, []);
});

test('only the first open lands on Review; a refresh keeps the viewer where they are', async () => {
  const host = fakeHost(), view = createTeamView(host);
  assert.equal(await view.open(LINK), true);
  assert.equal(host.landed, 1);
  await view.refresh();
  assert.equal(host.applied.length, 2);
  assert.equal(host.landed, 1);
});

test('a failed open keeps the service message for a wrong code and never mentions a browser draft', async () => {
  const wrong = fakeHost({ request: async () => ({ ok: false, error: 'code', message: 'That team access code is not right. Check the code from Britt.' }) });
  await createTeamView(wrong).open(LINK);
  assert.equal(wrong.notes.at(-1), 'That team access code is not right. Check the code from Britt.');
  const offline = fakeHost({ request: async () => ({ ok: false, error: 'network', message: 'Could not reach the shared store. Your browser draft is safe. Try again when you are online.' }) });
  await createTeamView(offline).open(LINK);
  assert.equal(offline.notes.at(-1), 'Could not open the team design. Try Refresh in a moment.');
  assert.equal(offline.notes.some(note => /draft/i.test(note)), false);
});

test('an open with no saved design notes it, stores the link and does not land on Review', async () => {
  const host = fakeHost({ request: async () => ({ ok: true, revision: null, savedAt: null, selection: null }) });
  const view = createTeamView(host);
  assert.equal(await view.open(LINK), true);
  assert.match(host.notes.at(-1), /has not saved a design yet/);
  assert.equal(host.landed, 0);
  assert.equal(view.stored(), LINK);
  assert.equal(host.mode, 'view');
});

test('a malformed link enters view mode with a notice, stores nothing and sends no request', async () => {
  let requests = 0;
  const host = fakeHost({ request: async () => { requests++; return { ok: true }; } });
  const view = createTeamView(host);
  assert.equal(await view.open('not-a-lesson.' + 'x'.repeat(24)), false);
  assert.equal(host.mode, 'view');
  assert.equal(view.active(), true);
  assert.equal(view.stored(), '');
  assert.equal(requests, 0);
  assert.match(host.notes.at(-1), /incomplete or out of date/);
});

test('ending the view session removes the stored link', async () => {
  const host = fakeHost(), view = createTeamView(host);
  await view.open(LINK);
  view.end();
  assert.equal(view.stored(), '');
  assert.equal(view.active(), false);
});

test('an answer the Open dialog already has is used without a second request', async () => {
  let requests = 0;
  const host = fakeHost({ request: async () => { requests++; return { ok: true }; } });
  const view = createTeamView(host);
  assert.equal(await view.open(LINK, { ok: true, savedAt: SAVED_AT, selection: { lesson: { id: 'money-management' } }, access: 'view' }), true);
  assert.equal(requests, 0);
  assert.equal(host.applied.length, 1);
});
