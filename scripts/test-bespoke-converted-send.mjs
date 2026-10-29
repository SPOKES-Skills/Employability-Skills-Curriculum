#!/usr/bin/env node
// Send right after opening a design that needed conversion. Opening converts without saving (nothing is an edit), so the
// shared copy still holds the older values. The status says so, and Send saves first and then sends instead of failing
// with the store's "Save these changes" refusal. Fully intercepted synthetic origin: no production requests.
import assert from 'node:assert/strict';
import { createDevServer } from './bespoke-dev-server.mjs';
import { browserType } from './bespoke-test-browser.mjs';
import { submissionId } from '../netlify/functions/bespoke-handoff.mjs';
import { defaultDesign, roleStyleDefaults } from '../bespoke/builder-model.mjs';
import { CONVERTED_STATUS } from '../bespoke/converted-open.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };

const LESSON = { id: 'money-management', title: 'Money Management' };
const base = defaultDesign(catalog);
const third = catalog.fonts.find(font => ![base.fonts.heading, base.fonts.body].includes(font.id));
const retired = { ...base, background: 'dot-grid', roleStyles: { cards: { ...roleStyleDefaults(catalog, base, 'cards'), headingFont: third.id } } };
const stored = { schema: 'bespoke-selection/v2', date: '2026-10-22', submittedAt: '2026-10-22T10:00:00.000Z', lesson: { ...LESSON, displayTitle: base.samples.title || LESSON.title, subtitle: base.samples.subtitle }, team: { name: 'Synthetic team', spokesperson: { name: 'Synthetic reviewer', email: 'synthetic@example.org' } }, design: retired, unspoken: '' };
const url = 'https://github.com/doclegg05/Curriculum-Employability-Skills/pull/123';
const artifactUrl = 'https://github.com/doclegg05/Curriculum-Employability-Skills/blob/' + 'a'.repeat(40) + '/design.html';

const server = await createDevServer({ port: 0 });
const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [], calls = [], refusals = [];
let shared = { revision: 'b'.repeat(40), savedAt: '2026-10-22T10:00:00Z', selection: stored };
try {
  await context.addInitScript(() => {
    window.__bespokeAutosave = { enabled: true, idleMs: 300, stepMs: 300 };
    if (!localStorage.getItem('bespoke-team-session-v2')) localStorage.setItem('bespoke-team-session-v2', JSON.stringify({ lessonId: 'money-management', editCode: 'synthetic-converted-send-access-code', revision: null, savedAt: null, baseSelectionKey: null, pendingSave: null }));
  });
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    assert.equal(u.origin, 'https://bespoke.test', 'Only the synthetic origin is allowed');
    if (u.pathname === '/bespoke/handoff-config.json') return route.fulfill({ json: { apiBase: 'https://bespoke.test/api/bespoke' } });
    if (u.pathname === '/api/bespoke') {
      const body = route.request().postDataJSON();
      calls.push(body.action);
      if (body.action === 'open') return route.fulfill({ json: { ok: true, ...shared } });
      if (body.action === 'save') {
        shared = { revision: 'c'.repeat(40), savedAt: '2026-10-22T11:00:00Z', selection: body.selection };
        return route.fulfill({ json: { ok: true, ...shared } });
      }
      if (body.action === 'send') {
        // The store refuses a send whose design differs from the saved one.
        if (JSON.stringify(shared.selection.design) !== JSON.stringify(body.selection.design)) {
          refusals.push(body.selection.design.background);
          return route.fulfill({ status: 409, json: { ok: false, error: 'unsaved', message: 'Save these changes before sending them to Britt.', revision: shared.revision, savedAt: shared.savedAt } });
        }
        return route.fulfill({ json: { ok: true, status: 'processing', submissionId: submissionId(shared.selection), runId: 12, url, artifactUrl, revision: 'a'.repeat(40) } });
      }
      if (body.action === 'status') return route.fulfill({ json: { ok: true, status: 'processing', submissionId: submissionId(shared.selection), runId: 12, url, artifactUrl, revision: 'a'.repeat(40) } });
      throw new Error('Unexpected synthetic action: ' + body.action);
    }
    return route.fulfill({ response: await route.fetch({ url: server.baseUrl + u.pathname + u.search, headers: { ...route.request().headers(), origin: server.baseUrl } }) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://bespoke.test/bespoke/');
  await page.locator('#restoreNotice').filter({ hasText: 'Background Dot grid is now Plain.' }).waitFor();
  assert.equal(await page.locator('#saveStatus').textContent(), CONVERTED_STATUS, 'the status says the converted design is not saved yet');
  assert.match(await page.locator('#teamSessionStatus').textContent(), /updated to the design standard and is not saved yet/);
  // Longer than the idle delay, so an automatic save would have run. Opening changes nothing in the store.
  await page.waitForTimeout(1200);
  assert.deepEqual(calls, ['open'], 'opening a converted design saves nothing by itself');
  assert.equal(shared.selection.design.background, 'dot-grid', 'the shared copy still holds the older design');

  await page.locator('#stage-review').click();
  await page.locator('#coordinatorAgree').check();
  await page.locator('#btnSendToBritt').click();
  await page.locator('#sentView, #sendFeedback').first().waitFor();
  await page.waitForFunction(() => document.querySelector('#sentView') || /Sending to Britt/.test(document.querySelector('#sendFeedback')?.textContent || ''));
  assert.deepEqual(calls.slice(0, 3), ['open', 'save', 'send'], 'Send saved the converted design, then sent it');
  assert.deepEqual(refusals, [], 'the store never refused the send');
  assert.equal(shared.selection.design.background, 'plain', 'the saved design is the converted one');
  assert.equal(await page.locator('#toast').filter({ hasText: 'Save these changes' }).count(), 0, 'no unsaved refusal is shown');
  assert.deepEqual(errors, []);
  console.log('PASS Send right after a converted open saves first, then sends; the status shows the not-saved state before Send');
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
