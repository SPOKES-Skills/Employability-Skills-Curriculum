#!/usr/bin/env node
// Synthetic workflow races only. An ephemeral loopback service and isolated browser
// contexts cannot access the user's preview, remembered team, or browser draft.
import {builderDestination, clickMenuItem, recoveryMenu} from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { browserType, browserName } from './bespoke-test-browser.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';

const browser = await browserType.launch({ headless: true });
const failures = [], errors = [], external = [];
let passed = 0;
async function scenario(name, run) {
  console.log(`START ${name}`);
  const server = await createDevServer({ port: 0 });
  const contexts = [];
  const makePage = async ({ context, autosave = { enabled: false } } = {}) => {
    if (!context) {
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
      contexts.push(context); context.setDefaultTimeout(10000);
      await context.addInitScript(value => { window.__bespokeAutosave = value; }, autosave);
      await context.route(/^https?:/, route => {
        if (new URL(route.request().url()).origin === server.baseUrl) return route.continue();
        external.push(route.request().url()); return route.abort();
      });
    }
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(server.baseUrl + '/bespoke/'); await ready(page);
    return page;
  };
  try { await run({ server, makePage }); console.log(`PASS ${name}`); passed++; }
  catch (error) { console.error(`FAIL ${name}\n${error.stack}`); failures.push(name); }
  finally { for (const context of contexts) await context.close(); await server.close(); }
}
async function ready(page) {
  await page.locator('#localPreviewNotice').waitFor({ state: 'visible' });
  await page.locator('#btnSave').filter({ hasText: 'Save test design' }).waitFor();
}
const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design = async page => (await draft(page)).design;
const go = builderDestination;
async function team(page) {
  await go(page, 'Start');
  await page.locator('#teamName').fill('Synthetic race review');
  await page.locator('#spokespersonName').fill('Sample Instructor');
  await page.locator('#spokespersonEmail').fill('sample@example.org');
}
async function paint(page, color) {
  await go(page, 'Shared colors'); await page.locator('#colorRole').selectOption('sidebar');
  await page.locator(`[data-color="${color}"]`).click();
}
async function save(page) {
  const reply = page.waitForResponse(response => response.url().endsWith('/api/bespoke') && response.request().postDataJSON()?.action === 'save');
  await page.locator('#btnSave').click(); const response = await reply;
  assert.equal(response.status(), 200); await page.locator('#fileStatus').filter({ hasText: /Local test design saved|already up to date/ }).waitFor();
}
async function api(server, action = 'open') {
  const response = await fetch(server.baseUrl + '/api/bespoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, lessonId: 'money-management', editCode: LOCAL_PREVIEW_CODE }) });
  assert.equal(response.status, 200); return response.json();
}
async function backup(page) {
  if (!await page.locator('#btnDownloadBackup').isVisible()) await page.locator('.more-menu > summary').click();
  const event = page.waitForEvent('download'); await page.locator('#btnDownloadBackup').click();
  return JSON.parse(await fs.readFile(await (await event).path(), 'utf8'));
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

try {
  await scenario('a later edit during a pending save stays local until the next confirmed save', async ({ makePage, server }) => {
    const page = await makePage(); await team(page); await save(page); await paint(page, 'mauve');
    const first = await design(page), pending = deferred(), release = deferred(); let intercepted = false;
    await page.route('**/api/bespoke', async route => {
      if (route.request().postDataJSON()?.action !== 'save' || intercepted) return route.fallback();
      intercepted = true; const response = await route.fetch(); pending.resolve(); await release.promise; await route.fulfill({ response });
    });
    await page.locator('#btnSave').click(); await pending.promise; await paint(page, 'accent');
    const latest = await design(page); release.resolve();
    await page.locator('#fileStatus').filter({ hasText: 'You made newer changes while it saved' }).waitFor();
    assert.deepEqual((await api(server)).selection.design, first);
    assert.deepEqual(await design(page), latest); assert.deepEqual((await backup(page)).design, latest);
    await save(page); assert.deepEqual((await api(server)).selection.design, latest);
  });

  await scenario('a lost save response retries the same mutation once without adding a revision', async ({ makePage, server }) => {
    const page = await makePage(); await team(page); await save(page); await paint(page, 'mauve');
    const expected = await design(page), requests = []; let lose = true;
    await page.route('**/api/bespoke', async route => {
      const payload = route.request().postDataJSON();
      if (payload?.action !== 'save') return route.fallback();
      requests.push(payload);
      if (lose) { lose = false; await route.fetch(); return route.abort('failed'); }
      return route.fallback();
    });
    await page.locator('#btnSave').click(); await page.locator('#fileStatus').filter({ hasText: /did not finish|not reach|could not|network/i }).waitFor();
    const saved = await api(server), before = (await api(server, 'history')).history;
    assert.deepEqual(saved.selection.design, expected);
    await save(page);
    assert.equal(requests.length, 2); assert.equal(requests[0].mutationId, requests[1].mutationId);
    assert.equal(requests[0].expectedRevision, requests[1].expectedRevision);
    assert.equal((await api(server)).revision, saved.revision);
    assert.equal((await api(server, 'history')).history.length, before.length);
  });

  await scenario('loading latest after another tab changes browser storage keeps this tab in recovery', async ({ makePage, server }) => {
    const first = await makePage(); await team(first); await save(first);
    const second = await makePage({ context: first.context() });
    // The second tab edits while the first retains its own in-memory draft.
    await paint(second, 'mauve'); const secondDesign = await design(second);
    await paint(first, 'accent'); const firstDesign = (await backup(first)).design;
    assert.notDeepEqual(firstDesign, secondDesign);
    assert.deepEqual(await design(first), secondDesign, 'The first tab must not overwrite newer browser storage.');
    await save(second);
    await clickMenuItem(first, '#btnOpen');
    await first.locator('#fileStatus').filter({ hasText: 'A newer shared version exists' }).waitFor();
    await first.locator('#btnLoadLatest').click();
    await first.locator('#fileStatus').filter({ hasText: 'Opened the latest shared design.' }).waitFor();
    const recovery = await first.evaluate(() => JSON.parse(localStorage.getItem('bespoke-previous-draft-v2')));
    assert.deepEqual(recovery.design, firstDesign, 'Recovery must retain the design being replaced in this tab, not a different tab’s storage.');
    assert.deepEqual(await design(first), (await api(server)).selection.design);
    if (!await first.locator('#btnRecoverDraft').isVisible()) await first.locator('.more-menu > summary').click();
    await first.locator('#btnRecoverDraft').click(); await ready(first);
    assert.deepEqual(await design(first), firstDesign, 'The saved recovery remains usable through the actual Restore action and reload.');
  });

  for (const replacement of ['new draft', 'imported backup']) await scenario(`replacement (${replacement}) during a save keeps its explicit autosave pause`, async ({ makePage, server }) => {
    const page = await makePage({ autosave: { enabled: true, idleMs: 250, stepMs: 250 } }); await team(page); await save(page);
    const pending = deferred(), release = deferred(); let intercepted = false;
    await page.route('**/api/bespoke', async route => {
      if (route.request().postDataJSON()?.action !== 'save' || intercepted) return route.fallback();
      intercepted = true; const response = await route.fetch(); pending.resolve(); await release.promise; await route.fulfill({ response });
    });
    await paint(page, 'mauve'); await page.locator('#btnSave').click(); await pending.promise;
    const saved = await api(server);
    if (replacement === 'new draft') {
      await page.locator('.more-menu > summary').click(); await page.locator('#btnClear').click();
    } else {
      const payload = await backup(page); payload.design.roles.sidebar = 'accent'; payload.design.samples.title = 'Synthetic imported review';
      await page.locator('#teamFileInput').setInputFiles({ name: 'synthetic-race-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
      await page.locator('#fileStatus').filter({ hasText: 'Opened synthetic-race-backup.json' }).waitFor();
    }
    const fresh = await draft(page); assert.equal(fresh.autosavePaused, true);
    release.resolve(); await page.waitForTimeout(1000);
    assert.equal((await api(server)).revision, saved.revision, 'Finishing the older save must not silently save the new draft.');
    assert.equal((await draft(page)).autosavePaused, true);
    assert.deepEqual(await design(page), fresh.design);
    await save(page); assert.equal((await draft(page)).autosavePaused, false);
    await page.reload(); await ready(page); assert.equal((await draft(page)).autosavePaused, false);
    const autosaved = page.waitForResponse(response => response.url().endsWith('/api/bespoke') && response.request().postDataJSON()?.action === 'save');
    await paint(page, 'royal'); assert.equal((await autosaved).status(), 200);
    assert.equal((await api(server)).selection.design.roles.sidebar, 'royal', 'Explicit Save releases the review pause across reload.');
  });

  await scenario('a delayed Load latest response cannot replace a newer browser draft', async ({ makePage, server }) => {
    const page = await makePage(); await team(page); await save(page);
    const other = await makePage(); await paint(other, 'mauve'); await save(other);
    await paint(page, 'accent'); await clickMenuItem(page, '#btnOpen');
    await page.locator('#fileStatus').filter({ hasText: 'A newer shared version exists' }).waitFor();
    const pending = deferred(), release = deferred(); let intercepted = false;
    await page.route('**/api/bespoke', async route => {
      if (route.request().postDataJSON()?.action !== 'open' || intercepted) return route.fallback();
      intercepted = true; const response = await route.fetch(); pending.resolve(); await release.promise; await route.fulfill({ response });
    });
    await page.locator('#btnLoadLatest').click(); await pending.promise;
    await page.locator('.more-menu > summary').click(); await page.locator('#btnClear').click();
    const current = await draft(page);
    const reply = page.waitForResponse(response => response.url().endsWith('/api/bespoke') && response.request().postDataJSON()?.action === 'open');
    release.resolve(); await reply; await page.waitForTimeout(50);
    assert.deepEqual(await design(page), current.design);
    assert.equal((await draft(page)).autosavePaused, true);
    assert.equal((await api(server)).selection.design.roles.sidebar, 'mauve');
  });

  await scenario('stale history requests collapse the panel and its accessible trigger together', async ({ makePage }) => {
    const page = await makePage(); await team(page); await save(page);
    const assertClosed = async () => {
      await page.locator('#historyPanel').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#btnHistory').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#btnHistory').textContent(), 'Previous versions');
    };
    const newDraft = async () => {
      if (!await page.locator('#btnClear').isVisible()) await page.locator('.more-menu > summary').click();
      await page.locator('#btnClear').click();
      await recoveryMenu(page, false);
    };
    // A list response arriving after replacement must restore the disclosure state.
    const pending = deferred(), release = deferred(); let held = false;
    await page.route('**/api/bespoke', async route => {
      if (route.request().postDataJSON()?.action !== 'history' || held) return route.fallback();
      held = true; const response = await route.fetch(); pending.resolve(); await release.promise; await route.fulfill({ response });
    });
    await clickMenuItem(page, '#btnHistory'); await pending.promise;
    await newDraft(); release.resolve(); await assertClosed();
    // Previously rendered revision buttons also become stale after replacement.
    await clickMenuItem(page, '#btnHistory'); await page.locator('#historyPanel button').first().waitFor();
    await newDraft(); await page.locator('#historyPanel button').first().click(); await assertClosed();
    // A revision response arriving after replacement preserves the new draft too.
    await clickMenuItem(page, '#btnHistory'); await page.locator('#historyPanel button').first().waitFor();
    const revisionPending = deferred(), revisionRelease = deferred();
    await page.route('**/api/bespoke', async route => {
      if (route.request().postDataJSON()?.action !== 'openRevision') return route.fallback();
      const response = await route.fetch(); revisionPending.resolve(); await revisionRelease.promise; await route.fulfill({ response });
    });
    await page.locator('#historyPanel button').first().click(); await revisionPending.promise;
    await newDraft(); const current = await design(page); revisionRelease.resolve(); await assertClosed();
    assert.deepEqual(await design(page), current);
  });
} finally { await browser.close(); }
assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);
assert.deepEqual(external, [], `External requests: ${external.join('; ')}`);
console.log(`${browserName}: ${passed} workflow race scenarios passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
