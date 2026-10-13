#!/usr/bin/env node
// End-to-end checks use a fresh loopback-only server, synthetic people and memory drafts.
// Nothing here uses provisioned team codes, a hosted API, Send, or released lessons.
import {EDITOR_DESTINATIONS, builderDestination, clickMenuItem, recoveryMenu, switchSurface} from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserType, tabKey, reverseTabKey } from './bespoke-test-browser.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';
import { compareDesign } from '../bespoke/similarity.mjs';
import { contrast, setRoleStyle } from '../bespoke/builder-model.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'bespoke/builder-catalog.json'), 'utf8'));
const fingerprints = JSON.parse(await fs.readFile(path.join(root, 'bespoke/lesson-fingerprints.json'), 'utf8'));
const oldSelection = JSON.parse(await fs.readFile(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
const axeSource = await fs.readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const browser = await browserType.launch({ headless: true });
const failures = [], assets = [], pageErrors = [], externalRequests = [];
let passed = 0;

async function scenario(name, callback) {
  if (process.env.BESPOKE_BUILDER_SCENARIO && !name.includes(process.env.BESPOKE_BUILDER_SCENARIO)) return;
  const server = await createDevServer({ port: 0 });
  const contexts = [], actions = [];
  const makePage = async ({ mobile = false, autosave = { enabled: false }, remoteSelection, storageState, sessionStorageUnavailable = false } = {}) => {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, storageState });
    contexts.push(context);
    await context.addInitScript(settings => { window.__bespokeAutosave = settings; }, autosave);
    if(sessionStorageUnavailable)await context.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Unavailable','SecurityError');}});});
    await context.route(/^https?:/, route => {
      if (new URL(route.request().url()).origin === server.baseUrl) return route.continue();
      externalRequests.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage();
    if (remoteSelection) await page.route('**/api/bespoke', async route => {
      if (route.request().postDataJSON()?.action === 'open') return route.fulfill({ json: { ok: true, selection: remoteSelection, revision: 'a'.repeat(40), savedAt: '2026-09-24T12:00:00.000Z' } });
      return route.fallback();
    });

    page.on('pageerror', error => pageErrors.push(`${name}: ${error.message}`));
    page.on('dialog', dialog => dialog.accept());
    page.on('request', request => {
      if (request.url().endsWith('/api/bespoke') && request.method() === 'POST') {
        actions.push(request.postDataJSON());
      }
    });
    page.on('response', response => {
      if (!response.url().endsWith('/api/bespoke') && response.status() >= 400) assets.push({ url: response.url(), status: response.status() });
    });
    await page.goto(server.baseUrl + '/bespoke/');
    await ready(page);
    return page;
  };
  try {
    await callback({ server, makePage, actions });
    passed++; console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.stack || error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    for (const context of contexts) await context.close();
    await server.close();
  }
}

async function ready(page) {
  await page.locator('#stepList button').first().waitFor();
  await page.locator('#localPreviewNotice').waitFor({ state: 'visible' });
  await page.locator('#btnSave').filter({ hasText: 'Save test design' }).waitFor();
}
const go = builderDestination;
const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design = async page => (await draft(page)).design;
async function paint(page, role, color) {
  await go(page, 'Shared colors');
  await page.locator('#colorRole').selectOption(role);
  // These existing cases exercise the shared theme contract explicitly.
  if (await page.locator('#colorScope').count()) await page.locator('#colorScope').selectOption('shared');
  await page.locator(`[data-color="${color}"]`).click();
}
async function choose(page, decision, value) {
  const group = page.getByRole('group', { name: new RegExp(decision) });
  await group.locator(`[data-choice="${value}"]`).click();
}
async function fillTeam(page) {
  await go(page, 'Start');
  await page.locator('#teamName').fill('Synthetic review team');
  await page.locator('#spokespersonName').fill('Sample Instructor');
  await page.locator('#spokespersonEmail').fill('sample@example.org');
}
async function save(page) {
  const response = page.waitForResponse(response => response.url().endsWith('/api/bespoke') && response.request().postDataJSON()?.action === 'save');
  await page.locator('#btnSave').click();
  const result = await response;
  assert.equal(result.status(), 200, await result.text());
  await page.locator('#fileStatus').filter({ hasText: /Local test design saved|already up to date/ }).waitFor();
}
async function download(page, original = false) {
  const control = page.locator(original ? '#stepPanel button' : '#btnDownloadBackup').filter(original ? { hasText: 'Download original v1 design' } : {});
  if (!original && !await control.isVisible()) await page.locator('.more-menu > summary').click();
  const event = page.waitForEvent('download');
  await control.click();
  const file = await event;
  const buffer = await fs.readFile(await file.path());
  return { name: file.suggestedFilename(), buffer, payload: JSON.parse(buffer.toString('utf8')) };
}
async function upload(page, payload, name = 'synthetic-backup.json') {
  await page.locator('#teamFileInput').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await page.locator('#fileStatus').filter({ hasText: `Opened ${name}.` }).waitFor();
}
async function openService(server) {
  const response = await fetch(server.baseUrl + '/api/bespoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', lessonId: 'money-management', editCode: LOCAL_PREVIEW_CODE }) });
  assert.equal(response.status, 200);
  return response.json();
}
async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, html: document.documentElement.scrollWidth }));
  assert(metrics.body <= metrics.viewport + 1 && metrics.html <= metrics.viewport + 1, `${label}: ${JSON.stringify(metrics)}`);
}
async function axe(page, label, { excludePreview = false } = {}) {
  await page.addScriptTag({ content: axeSource });
  // Only faint decorative artwork is excluded. The named, focusable editor
  // wrapper and visible chapter label stay in the scan.
  const violations = await page.evaluate(async excludePreview => (await window.axe.run({ exclude: [['.slide-watermark[aria-hidden="true"]'], ['.slide-watermark > [aria-hidden="true"]'], ['.role-watermark > [aria-hidden="true"]'], ...(excludePreview ? [['#modelStage']] : [])] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, message: node.failureSummary })) })), excludePreview);
  assert.deepEqual(violations, [], `${label}: ${JSON.stringify(violations, null, 2)}`);
}

try {
  await scenario('design history shortcuts preserve typing, cancellation, repeated actions and saved state', async ({ makePage }) => {
    const page = await makePage(); await fillTeam(page);
    const original = await design(page);
    await paint(page, 'sidebar', 'mauve');
    const painted = await design(page);
    const label = (await draft(page)).changes.at(-1).label;
    assert.equal(await page.locator('#btnUndo').getAttribute('aria-description'), 'Undo: '+label);
    // Focus a non-editor control: shortcuts act on the design, not typed words.
    await page.locator('#btnSave').focus();
    await page.keyboard.press('Control+z'); assert.deepEqual(await design(page), original);
    assert.equal(await page.locator('#btnRedo').getAttribute('aria-description'), 'Redo: '+label);
    await page.locator('#btnSave').focus(); await page.keyboard.press('Control+Shift+z');
    assert.deepEqual(await design(page), painted);
    await page.locator('#btnSave').focus(); await page.keyboard.press('Meta+z');
    assert.deepEqual(await design(page), original);
    await page.locator('#btnSave').focus(); await page.keyboard.press('Meta+Shift+z');
    assert.deepEqual(await design(page), painted);
    await page.locator('#btnSave').focus(); await page.keyboard.press('Control+z');
    await page.locator('#btnSave').focus(); await page.keyboard.press('Control+y');
    assert.deepEqual(await design(page), painted);
    const beforeRepeat = await draft(page);
    await page.locator('#btnSave').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', {key:'z',ctrlKey:true,repeat:true,bubbles:true,cancelable:true})));
    assert.deepEqual(await draft(page), beforeRepeat);
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    await page.locator('#presetDialog').waitFor({state:'visible'});
    await page.keyboard.press('Control+z'); assert.deepEqual(await design(page), painted);
    await page.keyboard.press('Escape'); assert.deepEqual(await design(page), painted);
    assert.equal(await page.locator('#presetDialog').isVisible(), false);
    await go(page, 'Title slide');
    await page.locator('#section-title-text > summary').click();
    const title = page.locator('#role-title-headingText');
    await title.fill('Synthetic edited title');
    const edited = await design(page), afterTyping = await draft(page);
    await page.keyboard.press('Control+z');
    assert.deepEqual((await draft(page)).changes, afterTyping.changes, 'Typing undo never consumes design history.');
    await title.fill('Synthetic edited title');
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), painted);
    const undone = await draft(page);
    // Browser input events with the same value must not discard Redo or materialize overrides.
    await page.locator('#role-title-headingText').dispatchEvent('input');
    assert.deepEqual(await draft(page), undone);
    await page.locator('#btnRedo').click(); assert.deepEqual(await design(page), edited);
    await go(page, 'Text boxes'); await page.locator('#section-cards-text > summary').click();
    await page.getByText('Try your own sample text', {exact:true}).click();
    const unchanged = await draft(page); await page.locator('#sample-box-0').dispatchEvent('input');
    assert.deepEqual(await draft(page), unchanged);
    await save(page); const saved = await draft(page);
    await page.reload(); await ready(page);
    assert.deepEqual(await design(page), edited);
    assert.deepEqual((await draft(page)).changes, saved.changes);
    await page.locator('#btnSave').focus(); await page.keyboard.press('Control+z');
    assert.deepEqual(await design(page), painted);
    await page.locator('#btnSave').focus(); await page.keyboard.press('Control+Shift+z');
    assert.deepEqual(await design(page), edited);
    await clickMenuItem(page, '#btnOpen');
    await page.locator('#fileStatus').filter({hasText:/opened|loaded/i}).waitFor();
    assert.deepEqual(await design(page), edited);
  });

  await scenario('cumulative colors, independent fonts, editable presets, history and v2 file recovery', async ({ makePage }) => {
    const page = await makePage();
    await go(page, 'Starting look');
    assert.equal(await page.locator('[data-preset]').count(), 12);
    await go(page, 'Starting look');await page.locator('[data-preset="professional"]').click();
    await go(page, 'Text boxes');
    if(!await page.locator('#section-cards-text').evaluate(el=>el.open))await page.locator('#section-cards-text > summary').click();
    await page.getByText('Try your own sample text', { exact: true }).click();
    await page.locator('#sample-box-3').fill('Keep this fourth sample even while it is hidden.');
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    await page.locator('#presetApply').click();
    assert.equal((await design(page)).samples.boxes[3], 'Keep this fourth sample even while it is hidden.');
    const beforePaint = await design(page);
    await go(page, 'Shared colors');
    for (const role of catalog.roles) {
      await page.locator('#colorRole').selectOption(role.id);
      assert.equal(await page.locator('.paint-chip').count(), 11, role.id);
      assert(await page.locator('[data-color="light"]').isVisible(), `${role.id}: White visible`);
    }
    await paint(page, 'sidebar', 'mauve');
    assert.equal((await design(page)).roles.sidebar, 'mauve');
    assert.equal(await page.locator('.slide-sidebar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(167, 37, 63)');
    const expectedRoles = { ...beforePaint.roles, sidebar: 'mauve' };
    assert.deepEqual((await design(page)).roles, expectedRoles);
    await paint(page, 'contentBackground', 'light');
    await page.locator('#colorRole').selectOption('body');
    await page.locator('#colorScope').selectOption('shared');
    const beforeUnsafe = await design(page);
    const gold = page.locator('[data-color="gold"]');
    assert.equal(await gold.getAttribute('aria-disabled'), null);
    await gold.focus(); await page.keyboard.press('Enter');
    assert.match(await page.locator('#colorHelp').textContent(), /below the 4.5:1 guideline/);
    assert.equal((await design(page)).roles.body, 'gold');
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), beforeUnsafe);
    await go(page, 'Text boxes');
    await go(page, 'Shared typography');
    assert.equal(await page.locator('#font-heading option').count(), 12);
    assert.equal(await page.locator('#font-body option').count(), 12);
    await page.locator('#font-heading').selectOption('bitter');
    assert.equal((await design(page)).fonts.body, beforePaint.fonts.body);
    await page.locator('#font-body').selectOption('crimson-pro');
    assert.deepEqual((await design(page)).fonts, { heading: 'bitter', body: 'crimson-pro' });
    const actualFonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return { heading: getComputedStyle(document.querySelector('.slide-card h3')).fontFamily, body: getComputedStyle(document.querySelector('.slide-card .slide-body')).fontFamily, headingLoaded: document.fonts.check('16px "Bitter"'), bodyLoaded: document.fonts.check('16px "Crimson Pro"') };
    });
    assert.match(actualFonts.heading, /Bitter/); assert.match(actualFonts.body, /Crimson Pro/);
    assert(actualFonts.headingLoaded && actualFonts.bodyLoaded, 'Both independently chosen local webfonts load.');
    await choose(page, 'Background pattern', 'crosshatch');
    await go(page, 'Title slide');
    await choose(page, 'Arrangement', 'bottom');
    const combined = await design(page);
    await go(page, 'Chapter divider'); await choose(page, 'Arrangement', 'number');
    await go(page, 'Text boxes');
    assert.deepEqual((await design(page)).roles, combined.roles);
    assert.deepEqual((await design(page)).fonts, combined.fonts);
    assert.equal((await design(page)).slides.title.layout, 'bottom');
    const expected = await design(page);
    const beforeHistory = (await draft(page)).changes;
    await page.reload(); await ready(page);
    assert.deepEqual(await design(page), expected);
    assert.deepEqual((await draft(page)).changes, beforeHistory);
    await page.locator('#btnUndo').click();
    assert.equal((await design(page)).slides.divider.layout, combined.slides.divider.layout);
    assert.equal((await design(page)).slides.title.layout, 'bottom');
    await page.locator('#btnRedo').click();
    assert.deepEqual(await design(page), expected);
    const closest = compareDesign(fingerprints, expected, catalog)[0];
    assert.match(await page.locator('#distinctMeter').textContent(), new RegExp(`${closest.shared}.*of ${closest.total}`));
    assert((await page.locator('#distinctMeter').textContent()).includes(closest.title));
    await page.locator('.similarity summary').click();
    assert.equal(await page.locator('#similarityDetails li').count(), 6);
    assert.match(await page.locator('#similarityDetails').textContent(), /not a perceptual percentage/);
    const backup = await download(page);
    assert.equal(backup.payload.schema, 'bespoke-selection/v2');
    assert.deepEqual(backup.payload.design, expected);
    assert(!backup.buffer.toString('utf8').includes(LOCAL_PREVIEW_CODE));
    const second = await makePage();
    await upload(second, backup.payload, backup.name);
    assert.deepEqual(await design(second), expected);
  });

  await scenario('preset confirmation opt-out lasts only for this editing session and never enters saved data', async ({ makePage, server, actions }) => {
    const key = 'bespoke-skip-preset-confirmation-session';
    const preference = page => page.evaluate(key => sessionStorage.getItem(key), key);
    const page = await makePage(); await fillTeam(page);
    const native = []; page.on('dialog', dialog => native.push(dialog.message()));
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="professional"]').click();
    await go(page, 'Text boxes'); if(!await page.locator('#section-cards-text').evaluate(el=>el.open))await page.locator('#section-cards-text > summary').click();
    await page.getByText('Try your own sample text', { exact: true }).click();
    await page.locator('#sample-box-3').fill('Retain my hidden sample after every preset.');
    await go(page, 'Starting look');
    const before = await draft(page);
    await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), false);
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetCancel').click();
    assert.deepEqual((await draft(page)).design, before.design); assert.deepEqual((await draft(page)).changes, before.changes);
    assert.equal(await preference(page), null);
    assert.equal(await page.evaluate(() => document.activeElement.id), (await draft(page)).stepId==='slides'?'selectedElement':'preset-modern');
    await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), false);
    await page.locator('#presetSkipConfirmation').check(); await page.keyboard.press('Escape');
    assert.deepEqual((await draft(page)).design, before.design); assert.deepEqual((await draft(page)).changes, before.changes);
    assert.equal(await preference(page), null);
    assert.equal(await page.evaluate(() => document.activeElement.id), (await draft(page)).stepId==='slides'?'selectedElement':'preset-modern');
    await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click(); await page.locator('#presetApply').click();
    assert.equal(await preference(page), null); assert.equal((await design(page)).startingPoint, 'modern');
    assert.deepEqual((await design(page)).samples, before.design.samples);
    assert.equal((await draft(page)).changes.length, before.changes.length + 1);
    assert.equal(await page.evaluate(() => document.activeElement.id), (await draft(page)).stepId==='slides'?'selectedElement':'preset-modern');
    await go(page, 'Starting look');await page.locator('[data-preset="serious"]').click();
    assert(await page.locator('#presetDialog').isVisible()); assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), false);
    await page.keyboard.press('Escape'); await page.locator('#btnUndo').click();
    assert.deepEqual(await design(page), before.design);
    await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetApply').click();
    assert.equal(await preference(page), '1');
    const modern = await design(page);
    await go(page,'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="fun"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#presetDialog').isVisible(), false);
    assert.equal((await design(page)).startingPoint, 'fun');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'selectedElement');
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), modern);
    await go(page, 'Shared typography'); await go(page, 'Starting look');
    await page.reload(); await ready(page); assert.equal(await preference(page), '1');
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="outspoken"]').click();
    assert.equal(await page.locator('#presetDialog').isVisible(), false);
    assert.equal((await design(page)).startingPoint, 'outspoken');
    assert.deepEqual((await design(page)).samples, before.design.samples);
    // Contrast advisories remain active while preset confirmations are suppressed.
    await paint(page, 'titleBackground', 'light');
    assert(await page.locator('#readabilityNotes').isVisible());
    const saves = actions.filter(a => a.action === 'save').length;
    await save(page);
    assert.equal(actions.filter(a => a.action === 'save').length, saves + 1);
    assert(await page.locator('#readabilityNotes').isVisible());
    await page.locator('#btnUndo').click(); await save(page);
    const backup = await download(page), remote = await openService(server);
    assert.deepEqual(backup.payload.design, remote.selection.design);
    const persistent = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
    for(const value of [backup.payload, remote, persistent, actions]) assert(!/skipPresetConfirmation|skip-preset-confirmation|pendingPreset|presetSkipConfirmation/.test(JSON.stringify(value)), 'Preference must not leak into durable records or requests.');
    // A fresh browser session retaining the same durable draft/team record asks again.
    const fresh = await makePage({ storageState: await page.context().storageState() });
    await go(fresh, 'Starting look');await fresh.locator('[data-preset="serious"]').click();
    assert(await fresh.locator('#presetDialog').isVisible()); assert.equal(await fresh.locator('#presetSkipConfirmation').isChecked(), false);
    await fresh.keyboard.press('Escape');
    // Starting another draft is explicit and its separate native confirmation is not suppressed.
    await recoveryMenu(page, true);
    await page.locator('#btnClear').click();
    await recoveryMenu(page, false);
    assert(native.some(message => message.startsWith('Start a new browser draft?')));
    assert.equal(await preference(page), null);
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="professional"]').click();
    await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), false);
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetApply').click();
    await go(page, 'Start'); await page.locator('#lessonSelect').selectOption('goal-setting');
    assert.equal(await preference(page), null, 'Changing teams/lessons starts a new confirmation session.');
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="serious"]').click();
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetApply').click();
    await clickMenuItem(page, '#btnLeaveSession'); await ready(page);
    assert(native.some(message => message.startsWith('Leave this session on this browser?')));
    assert.equal(await preference(page), null);
    await go(page, 'Starting look');await go(page, 'Starting look');await page.locator('[data-preset="professional"]').click();
    assert(await page.locator('#presetDialog').isVisible(), 'Returning saved design is protected even with cleared Undo history.');
    await page.locator('#presetApply').click();
    await go(page, 'Starting look');await page.locator('[data-preset="modern"]').click();
    assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), false);
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetApply').click();
    const context = page.context(); await page.close();
    const nextTab = await context.newPage(); nextTab.on('dialog', dialog => dialog.accept());
    await nextTab.goto(server.baseUrl+'/bespoke/'); await ready(nextTab);
    assert.equal(await preference(nextTab), null, 'A fresh tab does not inherit the closed tab’s opt-out.');
    await go(nextTab, 'Starting look');await nextTab.locator('[data-preset="serious"]').click();
    assert(await nextTab.locator('#presetDialog').isVisible()); assert.equal(await nextTab.locator('#presetSkipConfirmation').isChecked(), false);
    assert(!native.some(message => message.startsWith('Apply this preset')), 'Preset confirmation is no longer a native window.confirm.');
  });

  await scenario('preset dialog is accessible on desktop and phone with safe keyboard dismissal and storage fallback', async ({ makePage }) => {
    for (const mobile of [false, true]) {
      const page = await makePage({ mobile });
      await go(page, 'Starting look');await page.locator('[data-preset="professional"]').click();
      const before = await design(page);
      await go(page, 'Starting look');await page.locator('[data-preset="modern"]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'presetCancel');
      await page.keyboard.press(tabKey); assert.equal(await page.evaluate(() => document.activeElement.id), 'presetApply');
      await page.keyboard.press(tabKey);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'presetSkipConfirmation', 'Tab stays within the native modal.');
      await page.keyboard.press(reverseTabKey); assert.equal(await page.evaluate(() => document.activeElement.id), 'presetApply', 'Reverse Tab wraps within the dialog.');
      await page.keyboard.press(tabKey);
      await page.keyboard.press('Space'); assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), true);
      await page.keyboard.press('Escape');
      assert.deepEqual(await design(page), before);
      assert.equal(await page.evaluate(() => document.activeElement.id), (await draft(page)).stepId==='slides'?'selectedElement':'preset-modern');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#presetSkipConfirmation').isChecked(), false);
      await axe(page, 'Preset dialog '+(mobile?'phone':'desktop'));
      const bounds = await page.locator('#presetDialog').evaluate(el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};});
      assert(bounds.left >= 0 && bounds.right <= bounds.width && bounds.top >= 0 && bounds.bottom <= bounds.height);
      if(process.env.BESPOKE_REVIEW_DIR){await fs.mkdir(process.env.BESPOKE_REVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.BESPOKE_REVIEW_DIR,'preset-dialog-'+(mobile?'phone':'desktop')+'.png')});}
      await page.locator('#presetApply').focus(); await page.keyboard.press('Enter');
      assert.equal((await design(page)).startingPoint, 'modern');
      assert.equal(await page.evaluate(() => document.activeElement.id), (await draft(page)).stepId==='slides'?'selectedElement':'preset-modern');
    }
    const blocked = await makePage({ sessionStorageUnavailable: true });
    await go(blocked, 'Starting look');await blocked.locator('[data-preset="professional"]').click(); await go(blocked, 'Starting look');await blocked.locator('[data-preset="modern"]').click();
    await blocked.locator('#presetSkipConfirmation').check(); await blocked.locator('#presetApply').click();
    await go(blocked, 'Starting look');await blocked.locator('[data-preset="fun"]').click(); assert.equal((await design(blocked)).startingPoint,'fun');
    assert.equal(await blocked.locator('#presetDialog').isVisible(),false);
    await blocked.reload(); await ready(blocked); await go(blocked, 'Starting look');await blocked.locator('[data-preset="serious"]').click();
    assert(await blocked.locator('#presetDialog').isVisible()); assert.equal(await blocked.locator('#presetSkipConfirmation').isChecked(),false);
  });

  await scenario('Buttons exposes a live contextual sample without changing the chosen slide or other choices', async ({ makePage, actions }) => {
    const rgbHex = value => '#' + value.match(/\d+/g).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
    for (const mobile of [false, true]) {
      const page = await makePage({ mobile });
      await go(page, 'Text boxes');
      await go(page, 'Shared colors');
      const before = await design(page);
      await page.locator('#colorRole').selectOption('button');
      assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), 'cards');
      const swatch = page.locator('#paint-button-accent');
      await swatch.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'paint-button-accent');
      const sample = page.locator(mobile ? '#buttonColorInline button' : '#buttonColorSample button');
      assert(await sample.isVisible(), 'Button is visible immediately without switching preview surfaces.');
      const checkPaint = async (button, background, ink) => {
        const colors = await button.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color }));
        assert.equal(colors.background, background); assert.equal(colors.ink, ink);
        assert(contrast(rgbHex(colors.background), rgbHex(colors.ink)) >= 4.5);
      };
      await checkPaint(sample, 'rgb(55, 181, 80)', 'rgb(0, 19, 63)');
      assert.deepEqual(await design(page), { ...before, roles: { ...before.roles, button: 'accent' } });
      await page.locator('#paint-button-dark').click();
      await checkPaint(sample, 'rgb(0, 64, 113)', 'rgb(255, 255, 255)');
      await page.locator('#btnUndo').click();
      await checkPaint(sample, 'rgb(55, 181, 80)', 'rgb(0, 19, 63)');
      const saved = await draft(page), url = page.url(), actionCount = actions.length;
      let downloads = 0; page.on('download', () => downloads++);
      await sample.focus(); await page.keyboard.press('Enter');
      assert.equal(page.url(), url); assert.equal(actions.length, actionCount); assert.equal(downloads, 0);
      assert.deepEqual((await draft(page)).design, saved.design);
      await page.reload(); await ready(page);
      assert.equal(await page.locator('#colorRole').inputValue(), 'button');
      assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), 'cards');
      assert.deepEqual((await draft(page)).changes, saved.changes);
      await checkPaint(sample, 'rgb(55, 181, 80)', 'rgb(0, 19, 63)');
      assert.equal(await page.locator('#modelStage .slide-button').count(), 0, 'No permanent button added to text-box markup.');
      await axe(page, 'Button color controls '+(mobile?'mobile':'desktop'));
      if (mobile) await switchSurface(page,'preview');
      assert(await page.locator('#buttonColorSample button').isVisible());
      await assertNoOverflow(page, 'Button color preview');
      for (const view of ['title', 'divider', 'video', 'activity']) {
        await page.locator(`#previewTabs [data-view="${view}"]`).click();
        if (mobile) await switchSurface(page,'design');
        await page.locator('#colorRole').selectOption('button');
        assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), view);
        if (mobile) await switchSurface(page,'preview');
        const native = ['video', 'activity'].includes(view);
        const button = page.locator(native ? '#modelStage .slide-button' : '#buttonColorSample button');
        assert(await button.isVisible());
        await checkPaint(button, 'rgb(55, 181, 80)', 'rgb(0, 19, 63)');
        assert.equal(await page.locator('#buttonColorSample').count(), native ? 0 : 1);
        await button.click(); assert.equal(page.url(), url); assert.equal(downloads, 0);
      }
      // A non-default preview survives refresh, too; changing roles removes the contextual aid.
      await page.reload(); await ready(page);
      assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), 'activity');
      if (mobile) await switchSurface(page,'design');
      await page.locator('#colorRole').selectOption('sidebar');
      assert.equal(await page.locator('#buttonColorSample').count(), 0);
      assert.equal(await page.locator('#buttonColorInline').count(), 0);
      assert.deepEqual(await design(page), { ...before, roles: { ...before.roles, button: 'accent' } });
    }
  });

  await scenario('divider backgrounds retain explicit White text through controls, warnings, undo, refresh and shared reopen', async ({ makePage, actions }) => {
    const assertDivider = async (page, background) => {
      assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), 'divider');
      const colors = await page.locator('#modelStage [data-kind="divider"]').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, heading: getComputedStyle(el.querySelector('h2')).color, supporting: [...el.querySelectorAll('p')].map(p => getComputedStyle(p).color) }));
      assert.equal(colors.background, background);
      assert.equal(colors.heading, 'rgb(255, 255, 255)');
      assert.deepEqual(colors.supporting, ['rgb(255, 255, 255)', 'rgb(255, 255, 255)']);
    };
    for (const mobile of [false, true]) {
      const page = await makePage({ mobile }); await fillTeam(page);
      await paint(page, 'titleText', 'light'); await paint(page, 'subtitle', 'light');
      const before = await design(page);
      await go(page, 'Chapter divider');
      assert(await page.locator('#role-divider-primary').isVisible(), 'Local divider background is directly exposed.');
      for (const [id, rgb] of [['accent', 'rgb(55, 181, 80)'], ['light', 'rgb(255, 255, 255)']]) {
        await page.locator('#role-divider-primary').focus(); await page.locator('#role-divider-primary').selectOption(id);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'role-divider-primary');
        await assertDivider(page, rgb);
        assert.deepEqual(await design(page), setRoleStyle(catalog,before,'divider','primary',id));
        assert.match(await page.locator('#readabilityNotes').textContent(), /Chapter divider.*below the/);
        assert.equal(await page.locator('.readability-actions button').filter({hasText:/^Change divider colors$/}).count(),1);
        if (id === 'accent' && process.env.BESPOKE_REVIEW_DIR) {
          await fs.mkdir(process.env.BESPOKE_REVIEW_DIR, { recursive: true });
          if (mobile) await switchSurface(page,'preview');
          await page.screenshot({ path: path.join(process.env.BESPOKE_REVIEW_DIR, 'divider-green-'+(mobile?'mobile':'desktop')+'.png'), fullPage: true });
          if (mobile) await switchSurface(page,'design');
        }
      }
      const invalid = await draft(page), saves = actions.filter(a => a.action === 'save').length;
      await save(page);
      assert.equal(actions.filter(a => a.action === 'save').length, saves + 1);
      const backup = await download(page);
      const fromFile = await makePage({ mobile }); await upload(fromFile, backup.payload, 'divider-repair.json');
      assert.deepEqual(await design(fromFile), invalid.design);
      await page.reload(); await ready(page);
      assert.deepEqual(await draft(page).then(d => d.changes), invalid.changes);
      await assertDivider(page, 'rgb(255, 255, 255)');
      await page.locator('#btnUndo').click(); await assertDivider(page, 'rgb(55, 181, 80)');
      await page.locator('#btnRedo').click(); await assertDivider(page, 'rgb(255, 255, 255)');
      await go(page, 'Title slide'); await go(page, 'Chapter divider');
      await page.locator('#role-divider-primary').focus();await page.locator('#role-divider-primary').selectOption('dark');
      assert.equal(await page.locator('#role-divider-primary').evaluate(el=>el===document.activeElement),true,'Native color control retains focus after repaint.');
      await assertDivider(page, 'rgb(0, 64, 113)');
      assert.equal(await page.locator('#readabilityNotes').isVisible(), false);
      await page.locator('#section-divider-text > summary').click();
      await page.locator('#role-divider-headingColor').selectOption('offwhite');
      assert.equal(await page.locator('#modelStage h2').evaluate(el => getComputedStyle(el).color), 'rgb(209, 211, 212)');
      assert.equal(await page.locator('#modelStage p').first().evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
      await page.locator('#btnUndo').click();
      await assertDivider(page, 'rgb(0, 64, 113)');
      assert.deepEqual(await design(page), setRoleStyle(catalog,before,'divider','primary','dark'));
      assert.equal((await design(page)).roles.titleText,before.roles.titleText,'Local divider text does not mutate title theme color.');
      await axe(page, 'Divider controls '+(mobile?'mobile':'desktop')); await assertNoOverflow(page, 'Divider controls');
      if (mobile) await switchSurface(page,'preview');
      await axe(page, 'Divider preview '+(mobile?'mobile':'desktop')); await assertNoOverflow(page, 'Divider preview');
      await save(page);
      const saved = await draft(page);
      await page.reload(); await ready(page);
      assert.deepEqual((await draft(page)).changes, saved.changes);
      const reopened = await makePage({ mobile });
      assert.deepEqual(await design(reopened), saved.design);
      await go(reopened, 'Chapter divider'); await assertDivider(reopened, 'rgb(0, 64, 113)');
      // The all-colors step also keeps a chosen divider while changing shared text roles.
      await go(reopened, 'Shared colors');
      await reopened.locator('#colorRole').selectOption('dividerBackground');
      await reopened.locator('#colorRole').selectOption('subtitle');
      await assertDivider(reopened, 'rgb(0, 64, 113)');
    }
  });

  await scenario('earlier v2 shared designs open with their saved divider colors and repair warnings', async ({ makePage }) => {
    const source = await makePage(); await fillTeam(source);
    const backup = (await download(source)).payload;
    backup.design.roles.dividerBackground = 'accent';
    const page = await makePage({ remoteSelection: backup });
    assert.deepEqual(await design(page), backup.design);
    await go(page, 'Chapter divider');
    assert.match(await page.locator('#readabilityNotes').textContent(), /chapter divider background/);
    assert.equal(await page.locator('#modelStage h2').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    await page.reload(); await ready(page);
    assert.deepEqual(await design(page), backup.design);
    // An explicit open follows the same recovery boundary as startup.
    await clickMenuItem(page, '#btnOpen');
    await page.locator('#fileStatus').filter({ hasText: /Opened the latest shared design/ }).waitFor();
    assert.deepEqual(await design(page), backup.design);
  });

  await scenario('all patterns visibly update the current divider and preserve colors, fonts, layout and recovery', async ({ makePage }) => {
    for (const mobile of [false, true]) {
      const page = await makePage({ mobile }); await fillTeam(page);
      for (const role of ['titleBackground', 'titleBackgroundEnd', 'dividerBackground']) await paint(page, role, 'accent');
      for (const role of ['titleText', 'subtitle']) await paint(page, role, 'royal');
      await go(page, 'Shared typography');
      await page.locator('#font-heading').selectOption('raleway');
      await page.locator('#font-body').selectOption('source-sans-3');
      if (mobile) await switchSurface(page,'preview');
      await page.locator('#previewTabs [data-view="divider"]').click();
      if (mobile) await switchSurface(page,'design');
      assert.equal(await page.locator('.pattern-mini').count(), 5);
      await choose(page, 'Background pattern', 'plain');
      const original = await design(page), shots = new Map();
      for (const pattern of catalog.backgrounds) {
        const button = page.getByRole('group', { name: 'Background pattern' }).locator(`[data-choice="${pattern.id}"]`);
        await button.focus(); await page.keyboard.press('Enter');
        assert.equal(await button.evaluate(el => el === document.activeElement), true);
        assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), 'divider');
        assert.deepEqual(await design(page), { ...original, background: pattern.id });
        if (mobile) await switchSurface(page,'preview');
        shots.set(pattern.id, await page.locator('#modelStage .bespoke-slide').screenshot());
        if (mobile) await switchSurface(page,'design');
      }
      for (const pattern of catalog.backgrounds.slice(1)) {
        const pixels = await pixelDifference(page, shots.get('plain'), shots.get(pattern.id));
        assert(pixels.changedFraction > .018 && pixels.meanChannelDelta > .5, pattern.id+' must visibly change the actual UI preview.');
      }
      await page.locator('#btnUndo').click(); assert.equal((await design(page)).background, 'crosshatch');
      await page.locator('#btnRedo').click(); assert.equal((await design(page)).background, 'soft-gradient');
      const saved = await draft(page);
      await page.reload(); await ready(page);
      assert.deepEqual((await draft(page)).changes, saved.changes);
      assert.deepEqual(await design(page), saved.design);
      assert.equal(await page.locator('#previewTabs [aria-selected="true"]').getAttribute('data-view'), 'divider');
      await go(page, 'Text boxes'); await go(page, 'Shared typography');
      assert.equal((await design(page)).background, 'soft-gradient');
      await save(page);
      const reopened = await makePage({ mobile });
      assert.deepEqual(await design(reopened), saved.design);
      await go(reopened, 'Shared typography');
      await axe(reopened, 'Pattern miniatures '+(mobile?'phone':'desktop'));
      if(process.env.BESPOKE_REVIEW_DIR){await fs.mkdir(process.env.BESPOKE_REVIEW_DIR,{recursive:true});await reopened.screenshot({path:path.join(process.env.BESPOKE_REVIEW_DIR,'pattern-controls-'+(mobile?'phone':'desktop')+'.png'),fullPage:true});}
      await assertNoOverflow(reopened, 'Pattern choices');
      await choose(page, 'Background pattern', 'plain');
      assert.deepEqual(await design(page), original);
    }
  });

  await scenario('text boxes retain hidden words across every count, title bar and text treatment', async ({ makePage }) => {
    const page = await makePage();
    await go(page, 'Text boxes');
    if(!await page.locator('#section-cards-text').evaluate(el=>el.open))await page.locator('#section-cards-text > summary').click();
    await page.getByText('Try your own sample text', { exact: true }).click();
    await page.locator('#sample-box-0').fill('First meaningful point\nSecond meaningful point');
    await page.locator('#sample-box-3').fill('Recoverable fourth point.');
    for (const count of ['1', '2', '3', '4']) {
      await choose(page, 'Number of text boxes', count);
      assert.equal(await page.locator('.bespoke-box').count(), Number(count));
      assert.equal((await design(page)).samples.boxes[3], 'Recoverable fourth point.');
      for (const treatment of ['paragraph', 'bullets', 'numbered']) {
        await choose(page, 'Text treatment', treatment);
        assert.equal(await page.locator('.bespoke-box:first-child ul').count(), treatment === 'bullets' ? 1 : 0);
        assert.equal(await page.locator('.bespoke-box:first-child ol').count(), treatment === 'numbered' ? 1 : 0);
      }
    }
    await choose(page, 'One shared title bar', 'false');
    assert.equal(await page.locator('.bespoke-title-bar').count(), 0);
    await choose(page, 'One shared title bar', 'true');
    assert.equal(await page.locator('.bespoke-title-bar').count(), 1);
    await choose(page, 'Number of text boxes', '1');
    await page.reload(); await ready(page);
    assert.equal((await design(page)).samples.boxes[3], 'Recoverable fourth point.');
    await go(page, 'Text boxes'); await choose(page, 'Number of text boxes', '4');
    assert.match(await page.locator('.bespoke-box').nth(3).textContent(), /Recoverable fourth point/);
    for (const view of ['title', 'divider', 'video', 'activity', 'cards']) {
      await page.locator(`#previewTabs [data-view="${view}"]`).click();
      assert.equal(await page.locator('#modelStage .bespoke-slide').getAttribute('data-kind'), view);
      assert.equal((await design(page)).slides.cards.count, '4');
    }
  });

  await scenario('low-contrast text remains a team choice through preview, review, history and shared recovery', async ({ makePage, server }) => {
    for (const mobile of [false, true]) {
      const page = await makePage({ mobile }); await fillTeam(page);
      await go(page, 'Shared typography'); await choose(page, 'Background pattern', 'plain');
      await paint(page, 'titleBackground', 'mauve'); await paint(page, 'titleBackgroundEnd', 'accent');
      await paint(page, 'titleText', 'royal');
      const before = await design(page);
      await page.locator('[data-color="light"]').focus(); await page.keyboard.press('Enter');
      assert.equal((await design(page)).roles.titleText, 'light');
      assert.equal(await page.locator('.paint-chip').count(), 11);
      assert.equal(await page.locator('.paint-chip[aria-disabled="true"]').count(), 0);
      assert.equal(await page.locator('[data-color="light"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-color="light"] .paint-swatch').evaluate(el => getComputedStyle(el, '::after').content), 'none');
      const help = await page.locator('#colorHelp').textContent();
      assert.match(help, /Contrast is the difference between text and its background/);
      assert.match(help, /Mauve to Green.*2.66:1.*3:1 guideline/);
      assert.match(help, /team leader can keep this choice and save/);
      assert.match(await page.locator('#liveRegion').textContent(), /Contrast advisory/);
      const rendered = await page.locator('#modelStage [data-kind="title"]').evaluate(el => ({ color: getComputedStyle(el.querySelector('.slide-title-text')).color, background: getComputedStyle(el).backgroundImage }));
      assert.equal(rendered.color, 'rgb(255, 255, 255)');
      assert(rendered.background.includes('rgb(167, 37, 63)') && rendered.background.includes('rgb(55, 181, 80)'));
      // Intentionally low-contrast sample content is excluded; all editor controls and warnings remain accessible.
      await axe(page, 'Advisory editor '+(mobile?'phone':'desktop'), { excludePreview: true });
      await assertNoOverflow(page, 'Advisory editor');
      if(process.env.BESPOKE_REVIEW_DIR){await fs.mkdir(process.env.BESPOKE_REVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.BESPOKE_REVIEW_DIR,'contrast-advisory-'+(mobile?'phone':'desktop')+'.png'),fullPage:true});}
      await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), before);
      await page.locator('#btnRedo').click(); assert.equal((await design(page)).roles.titleText, 'light');
      for (const [role, color] of [['subtitle','light'], ['dividerBackground','accent'], ['heading','accent'], ['body','gold']]) await paint(page, role, color);
      const chosen = await design(page);
      assert.equal(await page.locator('#modelStage .slide-card .slide-body').first().evaluate(el => getComputedStyle(el).color), 'rgb(211, 178, 87)');
      await go(page, 'Review & save');
      assert.match(await page.locator('#stepPanel .readability-warning').textContent(), /team leader can keep/);
      await save(page); assert.deepEqual((await openService(server)).selection.design, chosen);
      const backup = await download(page), savedHistory = (await draft(page)).changes;
      assert.deepEqual(backup.payload.design, chosen);
      await page.reload(); await ready(page);
      assert.deepEqual(await design(page), chosen); assert.deepEqual((await draft(page)).changes, savedHistory);
      const reopened = await makePage({ mobile }); assert.deepEqual(await design(reopened), chosen);
      await go(reopened, 'Chapter divider');
      assert.equal(await reopened.locator('#modelStage h2').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
      assert.match(await reopened.locator('#readabilityNotes').textContent(), /chapter divider background.*below the 3:1/);
      const fromFile = await makePage({ mobile }); await upload(fromFile, backup.payload, 'advisory-design.json');
      assert.deepEqual(await design(fromFile), chosen);
      // Structural validation still rejects an unknown color and retains the current draft.
      const malformed = structuredClone(backup.payload); malformed.design.roles.body = 'not-a-brand-color';
      await fromFile.locator('#teamFileInput').setInputFiles({ name:'invalid.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(malformed)) });
      await fromFile.locator('#fileStatus').filter({ hasText: /Could not open/ }).waitFor();
      assert.deepEqual(await design(fromFile), chosen);
    }
  });

  await scenario('synthetic shared saves reopen exactly and stale writers retain a recoverable draft', async ({ makePage, server }) => {
    const first = await makePage(); await fillTeam(first); await paint(first, 'sidebar', 'mauve');
    await save(first);
    const saved = await design(first);
    const second = await makePage();
    assert.deepEqual(await design(second), saved);
    await paint(first, 'sidebar', 'royal'); await save(first);
    const newest = await design(first);
    await go(second, 'Shared typography'); await second.locator('#font-body').selectOption('inter');
    const staleLocal = await design(second);
    await second.locator('#btnSave').click();
    await second.locator('#fileStatus').filter({ hasText: 'Someone saved a newer shared version.' }).waitFor();
    assert.deepEqual(await design(second), staleLocal);
    assert.deepEqual((await openService(server)).selection.design, newest);
    const backup = await download(second);
    assert.deepEqual(backup.payload.design, staleLocal);
    await second.locator('#btnLoadLatest').click();
    await second.locator('#fileStatus').filter({ hasText: 'Opened the latest shared design.' }).waitFor();
    assert.deepEqual(await design(second), newest);
    const recovery = await second.evaluate(() => JSON.parse(localStorage.getItem('bespoke-previous-draft-v2')));
    assert.deepEqual(recovery.design, staleLocal);
  });

  await scenario('undo history survives a clean shared-save reload', async ({ makePage }) => {
    const page = await makePage(); await fillTeam(page); await paint(page, 'sidebar', 'mauve');
    await save(page);
    const saved = await draft(page);
    assert(saved.changes.length > 0);
    await page.reload(); await ready(page);
    assert.deepEqual((await draft(page)).changes, saved.changes, 'Reloading the same confirmed revision must not erase local undo history.');
    assert.equal(await page.locator('#btnUndo').isEnabled(), true);
  });

  await scenario('v1 conversion retains its exact original and stays paused through refresh until explicit save', async ({ makePage, actions, server }) => {
    const page = await makePage({ autosave: { enabled: true, idleMs: 120, stepMs: 120 } });
    await fillTeam(page); await save(page);
    const baseline = await openService(server);
    const before = actions.filter(action => action.action === 'save').length;
    await upload(page, oldSelection, 'original-v1.json');
    assert.deepEqual((await draft(page)).legacySelection, oldSelection);
    assert.match(await page.locator('#restoreNotice').textContent(), /original.*backup|older design/i);
    await go(page, 'Review & save');
    const original = await download(page, true);
    assert.deepEqual(original.payload, oldSelection);
    const converted = await download(page);
    assert.equal(converted.payload.schema, 'bespoke-selection/v2');
    assert.deepEqual(converted.payload.legacySelection, oldSelection);
    await page.waitForTimeout(400);
    assert.equal(actions.filter(action => action.action === 'save').length, before, 'Import requires an explicit save.');
    await page.reload(); await ready(page); await page.waitForTimeout(400);
    assert.equal(actions.filter(action => action.action === 'save').length, before, 'Reload must not release the conversion review pause.');
    assert.equal((await openService(server)).revision, baseline.revision);
    await save(page);
    assert.deepEqual((await openService(server)).selection.legacySelection, oldSelection);
  });

  await scenario('all desktop steps and mobile controls pass WCAG checks and keyboard navigation', async ({ makePage }) => {
    const desktop = await makePage();
    await go(desktop, 'Starting look');await desktop.locator('[data-preset="professional"]').focus();
    await desktop.keyboard.press('Enter');
    assert.equal(await desktop.locator('#selectedElement').evaluate(el => el === document.activeElement), true, 'Applying a preset moves focus into Customize.');
    await desktop.keyboard.press(tabKey);
    // Background mode is a segmented control on wide screens; its checked segment holds the tab stop.
    assert.equal(await desktop.evaluate(() => document.activeElement.closest('[role=radiogroup]')?.getAttribute('aria-label')), 'Background', 'Tab continues into the contextual controls.');
    await go(desktop, 'Title slide');
    await desktop.getByRole('group', { name: /Arrangement/ }).locator('[data-choice="bottom"]').focus();
    await desktop.keyboard.press('Enter');
    assert.equal(await desktop.getByRole('group', { name: /Arrangement/ }).locator('[data-choice="bottom"]').evaluate(el => el === document.activeElement), true, 'Layout focus survives a rerender.');
    await desktop.keyboard.press(tabKey);
    assert.equal(await desktop.getByRole('group', { name: /Arrangement/ }).locator('[data-choice="split"]').evaluate(el => el === document.activeElement), true, 'Tab continues to the next arrangement.');
    const labels = EDITOR_DESTINATIONS;
    for (const label of labels) {
      await go(desktop, label);
      await axe(desktop, `desktop ${label}`);
      await assertNoOverflow(desktop, `desktop ${label}`);
    }
    const mobile = await makePage({ mobile: true });
    await go(mobile, 'Shared colors');
    await mobile.locator('#colorRole').focus();
    assert.equal(await mobile.locator('#colorRole').evaluate(el => el === document.activeElement), true);
    await mobile.keyboard.press(tabKey);
    assert.equal(await mobile.evaluate(() => document.activeElement?.classList.contains('paint-chip')), true);
    await mobile.keyboard.press('Enter');
    assert.equal((await design(mobile)).roles.sidebar, 'primary');
    assert.equal(await mobile.locator('[data-color="primary"]').evaluate(el => el === document.activeElement), true, 'Paint focus survives a rerender.');
    await mobile.keyboard.press(tabKey);
    assert.equal(await mobile.locator('[data-color="dark"]').evaluate(el => el === document.activeElement), true, 'Tab continues to the next color.');
    await mobile.locator('[data-color="light"]').scrollIntoViewIfNeeded();
    const visible = await mobile.locator('[data-color="light"]').evaluate(el => {
      const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && (hit === el || el.contains(hit));
    });
    assert(visible, 'White swatch must be visible, reachable and unobscured on mobile.');
    await axe(mobile, 'mobile paint controls'); await assertNoOverflow(mobile, 'mobile controls');
    if(await mobile.locator('#surface-design').isVisible()){await mobile.locator('#surface-design').focus();await mobile.keyboard.press('ArrowRight');assert.equal(await mobile.locator('#workspace').getAttribute('data-active-surface'),'preview');}
    else assert.equal(await mobile.locator('#workspace').getAttribute('data-editor'),'true','The compact editor exposes controls and preview together');
    assert(await mobile.locator('#previewPane').isVisible());
    await mobile.locator('#previewTabs [data-view="cards"]').focus(); await mobile.keyboard.press('ArrowRight');
    assert.equal(await mobile.locator('#modelStage .bespoke-slide').getAttribute('data-kind'), 'video');
    await axe(mobile, 'mobile preview'); await assertNoOverflow(mobile, 'mobile preview');
  });
} finally {
  await browser.close();
}

if (!passed && !failures.length) failures.push({name:'scenario selection', message:'No builder scenario matched the requested filter.'});
if (pageErrors.length) failures.push({ name: 'runtime errors', message: JSON.stringify(pageErrors) });
if (assets.length) failures.push({ name: 'missing local assets', message: JSON.stringify(assets) });
if (externalRequests.length) failures.push({ name: 'unexpected external requests', message: JSON.stringify(externalRequests) });
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  console.error(`BeSpoke builder browser: ${passed} scenarios passed, ${failures.length} failed.`);
  process.exitCode = 1;
} else console.log(`BeSpoke builder browser: ${passed} scenarios passed; no runtime errors, missing assets, external requests or editor accessibility violations (decorative watermark and intentionally low-contrast previews excluded where documented).`);
