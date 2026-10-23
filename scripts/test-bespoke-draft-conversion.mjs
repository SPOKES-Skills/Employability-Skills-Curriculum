#!/usr/bin/env node
// A restored browser draft that holds retired values converts on restore. With a persisted team session and automatic
// sharing on, converting must not make the tab look edited: no save request, no leave-page prompt, and the startup
// shared fetch still replaces the draft. All services are ephemeral and all content is synthetic.
import assert from 'node:assert/strict';
import { browserType } from './bespoke-test-browser.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';
import { defaultDesign, roleStyleDefaults } from '../bespoke/builder-model.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };

const LESSON = { id: 'money-management', title: 'Money Management' };
const TEAM = { name: 'Synthetic draft team', spokesperson: { name: 'Sample Instructor', email: 'sample@example.org' } };
const base = defaultDesign(catalog);
const third = catalog.fonts.find(font => ![base.fonts.heading, base.fonts.body].includes(font.id));
const retired = { ...base, background: 'dot-grid', roleStyles: { cards: { ...roleStyleDefaults(catalog, base, 'cards'), headingFont: third.id } } };
// The payload the app builds, so the session baseline is the key an earlier version stored for this design.
const payload = (design, extra = {}) => ({ schema: 'bespoke-selection/v2', ...extra, lesson: { ...LESSON, displayTitle: design.samples.title || LESSON.title, subtitle: design.samples.subtitle }, team: TEAM, design, unspoken: '' });
const keyOf = design => JSON.stringify(payload(design));
const call = (server, body) => fetch(server.baseUrl + '/api/bespoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: LESSON.id, editCode: LOCAL_PREVIEW_CODE, ...body }) }).then(reply => reply.json());

const browser = await browserType.launch({ headless: true });
const errors = [];
let passed = 0;

async function scenario(name, { reachable }) {
  const server = await createDevServer({ port: 0 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    const seeded = await call(server, { action: 'save', selection: payload(retired, { date: '2026-10-22', submittedAt: '2026-10-22T10:00:00.000Z' }), expectedRevision: null, mutationId: crypto.randomUUID() });
    assert.equal(seeded.ok, true, 'the service accepts the retired design');
    const draft = { step: 0, stepId: 'start', lessonId: LESSON.id, teamName: TEAM.name, spokespersonName: TEAM.spokesperson.name, spokespersonEmail: TEAM.spokesperson.email, unspoken: '', design: retired, changes: [], redo: [], meaningfulDesign: true, autosavePaused: false };
    const session = { lessonId: LESSON.id, editCode: LOCAL_PREVIEW_CODE, revision: seeded.revision, savedAt: seeded.savedAt, baseSelectionKey: keyOf(retired), pendingSave: null };
    await context.addInitScript(({ draft, session }) => {
      window.__bespokeAutosave = { enabled: true, idleMs: 300, stepMs: 300 };
      if (!localStorage.getItem('bespoke-draft-v2')) localStorage.setItem('bespoke-draft-v2', JSON.stringify(draft));
      if (!localStorage.getItem('bespoke-team-session-v2')) localStorage.setItem('bespoke-team-session-v2', JSON.stringify(session));
    }, { draft, session });
    if (!reachable) await context.route('**/api/bespoke', route => route.abort());
    const page = await context.newPage(), requests = [], dialogs = [];
    page.on('pageerror', error => errors.push({ name, message: error.message }));
    page.on('request', request => { if (request.url().endsWith('/api/bespoke') && request.method() === 'POST') requests.push(request.postDataJSON()?.action); });
    page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
    await page.goto(server.baseUrl + '/bespoke/');
    await page.locator('#localPreviewNotice').waitFor();
    await page.locator('#restoreNotice').filter({ hasText: 'Background Dot grid is now Plain.' }).waitFor();
    const text = (await page.locator('#restoreNotice').innerText()).trim();
    assert.match(text, /^Updated this design to the SPOKES design standard: Background Dot grid is now Plain\. Text boxes heading font .+ is now the lesson heading font\. Review it before saving\.$/);
    // Longer than the 300 ms idle delay and the 300 ms edit delay, so an automatic save would have run.
    await page.waitForTimeout(1500);
    assert.equal(requests.includes('save'), false, `${name}: converting a restored draft sends no save request`);
    assert.equal((await call(server, { action: 'open' })).revision, seeded.revision, `${name}: the shared design gained no revision`);
    if (reachable) assert(requests.includes('open'), `${name}: the startup shared fetch still runs`);
    await page.close({ runBeforeUnload: true });
    assert.deepEqual(dialogs, [], `${name}: an unedited converted draft does not prompt on leave`);
    assert.equal(requests.includes('save'), false, `${name}: leaving the page sends no save request`);
    passed++;
    console.log(`PASS ${name}`);
  } finally {
    await context.close();
    await server.close();
  }
}

try {
  await scenario('standard conversion of a restored draft with a team session and automatic sharing', { reachable: true });
  await scenario('standard conversion of a restored draft while the shared service is unreachable', { reachable: false });
} finally {
  await browser.close();
}
assert.deepEqual(errors, [], 'No browser runtime errors');
console.log(`${passed} restored-draft conversion scenarios passed.`);
