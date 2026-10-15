#!/usr/bin/env node
import {clickMenuItem, otherStartingPaths} from './bespoke-test-navigation.mjs';
// Independent acceptance of the three-stage workflow. All services are ephemeral,
// all browser contexts are new, and all names/content are synthetic. Never attaches
// to Safari, an existing browser, the persistent preview, or a hosted service.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserType, browserName } from './bespoke-test-browser.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';
import { defaultDesign, effectiveRoleStyle, roleStyleDefaults } from '../bespoke/builder-model.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const output = process.env.BESPOKE_REVIEW_DIR;
const only = process.env.BESPOKE_STREAMLINED_SCENARIO;
if (output) await fs.mkdir(output, { recursive: true });
const legacy = JSON.parse(await fs.readFile(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
const axeSource = await fs.readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const kinds = ['title', 'divider', 'cards', 'video', 'activity'];
const evidence = [], failures = [], errors = [], external = [], actions = [];
const browser = await browserType.launch({ headless: true });
let passed = 0;
const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design = async page => (await draft(page)).design;
const rgb = id => `rgb(${[1, 3, 5].map(i => parseInt(catalog.palette.find(c => c.id === id).hex.slice(i, i + 2), 16)).join(', ')})`;
const fontName = id => catalog.fonts.find(f => f.id === id).label;
const payload = d => ({ schema: 'bespoke-selection/v2', date: '2026-09-24', lesson: legacy.lesson, team: { name: 'Synthetic workflow team', spokesperson: { name: 'Sample Instructor', email: 'sample@example.org' } }, design: d });

async function scenario(name, run) {
  if (only && !only.split('|').some(part => name.includes(part))) return;
  const server = await createDevServer({ port: 0 });
  const contexts = [];
  const pages = [];
  async function makePage({ width = 1440, height = 1000, storedDraft } = {}) {
    const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, reducedMotion: 'reduce' });
    contexts.push(context);
    context.setDefaultTimeout(8000);
    await context.addInitScript(value => {
      window.__bespokeAutosave = { enabled: false };
      if (value) localStorage.setItem('bespoke-draft-v2', JSON.stringify(value));
    }, storedDraft);
    await context.route(/^https?:/, route => {
      if (new URL(route.request().url()).origin === server.baseUrl) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push({ scenario: name, message: error.message }));
    page.on('dialog', dialog => dialog.accept());
    page.on('request', request => {
      if (request.url().endsWith('/api/bespoke') && request.method() === 'POST') actions.push({ scenario: name, action: request.postDataJSON()?.action });
    });
    await page.goto(server.baseUrl + '/bespoke/');
    await ready(page);
    return page;
  }
  console.log(`START ${name}`);
  try { await run({ server, makePage }); passed++; console.log(`PASS ${name}`); }
  catch (error) {
    failures.push({ name, message: error.message, stack: error.stack });
    console.error(`FAIL ${name}\n${error.stack}`);
    if (output) for (const [i, page] of pages.entries()) if (!page.isClosed()) {
      await page.screenshot({ path: path.join(output, `${browserName}-failure-${name.replace(/[^a-z0-9]+/gi, '-')}-${i}.png`), fullPage: true }).catch(() => {});
    }
  } finally { for (const context of contexts) await context.close(); await server.close(); }
}
async function ready(page) {
  await page.locator('#localPreviewNotice').waitFor({ state: 'visible' });
  await page.locator('#btnSave').filter({ hasText: 'Save test design' }).waitFor();
  await page.locator('#stage-start').waitFor();
}
async function surface(page, name = 'design') {
  const button = page.locator('#surface-' + name);
  if (await button.isVisible()) await button.click();
}
async function stage(page, id) {
  await surface(page);
  await page.locator('#stage-' + id).click();
  assert.equal(await page.locator('#stage-' + id).getAttribute('aria-current'), 'step');
}
async function editor(page, kind) {
  await surface(page);
  if (!await page.locator('#roleEditorTabs').isVisible()) await stage(page, 'slides');
  if (!await page.locator('#roleEditorTabs').isVisible()) await page.locator('#btnMoreOptions').click();
  await page.locator('#editor-' + kind).click();
  assert.equal(await page.locator('#editor-' + kind).getAttribute('aria-selected'), 'true');
}
async function preview(page, kind) {
  await surface(page, 'preview');
  await page.locator(`#previewTabs [data-view="${kind}"]`).click();
  await page.evaluate(() => document.fonts.ready);
}
async function shared(page, open = true) {
  if(!await page.locator('#sharedTheme').count())await page.locator('#stage-slides').click();
  await surface(page);
  if (!await page.locator('#detailControls').isVisible()) await page.locator('#btnMoreOptions').click();
  const details = page.locator('#sharedTheme');
  if (await details.evaluate(el => el.open) !== open) await details.locator(':scope > summary').click();
}
async function paint(page, role, color) {
  await shared(page);
  await page.locator('#colorRole').selectOption(role);
  // Shared-theme journeys choose their scope; direct slide paint has its own suite.
  if (await page.locator('#colorScope').count()) await page.locator('#colorScope').selectOption('shared');
  await page.locator(`#paint-${role}-${color}`).click();
  assert.equal((await design(page)).roles[role], color);
}
async function field(page, kind, key) {
  await surface(page);
  const control = page.locator(`#role-${kind}-${key}`);
  const ancestors = control.locator('xpath=ancestor::details');
  for (let i = await ancestors.count() - 1; i >= 0; i--) {
    const item = ancestors.nth(i);
    if (!await item.evaluate(el => el.open)) await item.locator(':scope > summary').click();
  }
  await control.waitFor({ state: 'visible' });
  return control;
}
async function setField(page, kind, key, value) {
  const control = await field(page, kind, key);
  const type = await control.evaluate(el => el.tagName === 'SELECT' ? 'select' : el.type);
  if (type === 'select') await control.selectOption(String(value));
  else if (type === 'checkbox') await control.setChecked(value);
  else await control.fill(value);
}
async function team(page) {
  await stage(page, 'team');
  await page.locator('#teamName').fill('Synthetic workflow team');
  await page.locator('#spokespersonName').fill('Sample Instructor');
  await page.locator('#spokespersonEmail').fill('sample@example.org');
  // Callers carry on with the starting looks, which is the stage after Lesson & team.
  await stage(page, 'start');
}
async function startingLooks(page) {
  await stage(page, 'start');
  const change = page.locator('#btnChangeStartingLook');
  if (await change.isVisible() && await change.getAttribute('aria-expanded') !== 'true') await change.click();
}
async function save(page, status = 200) {
  const pending = page.waitForResponse(r => r.url().endsWith('/api/bespoke') && r.request().postDataJSON()?.action === 'save');
  await page.locator('#btnSave').click(); const response = await pending;
  assert.equal(response.status(), status, await response.text());
  if (status === 200) await page.locator('#fileStatus').filter({ hasText: /Local test design saved|already up to date/ }).waitFor();
  return response;
}
async function remote(server, action = 'open') {
  const reply = await fetch(server.baseUrl + '/api/bespoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, lessonId: 'money-management', editCode: LOCAL_PREVIEW_CODE }) });
  assert.equal(reply.status, 200); return reply.json();
}
async function upload(page, value, name = 'synthetic-workflow-design.json') {
  await page.locator('#teamFileInput').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await page.locator('#fileStatus').filter({ hasText: `Opened ${name}.` }).waitFor();
}
async function backup(page) {
  const menu = page.locator('.more-menu');
  if (!await menu.evaluate(el => el.open)) await menu.locator(':scope > summary').click();
  const pending = page.waitForEvent('download');
  await page.locator('#btnDownloadBackup').click();
  const value = JSON.parse(await fs.readFile(await (await pending).path(), 'utf8'));
  assert.equal(await menu.evaluate(el => el.open), false, 'Downloading a backup dismisses Files & recovery');
  return value;
}
async function shot(page, name) {
  if (output) {
    await page.screenshot({ path: path.join(output, browserName + '-' + name + '.png'), fullPage: true });
    await page.screenshot({ path: path.join(output, browserName + '-' + name + '-viewport.png') });
  }
}
async function axe(page, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    // Artwork remains configurable and advisory. Editor regions, preview tabs,
    // status messages, and all recovery controls are included with best practices.
    const scan = await window.axe.run({ exclude: [['#modelStage'], ['.button-color-sample']] });
    return { violations: scan.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })), regionChecked: scan.passes.some(r => r.id === 'region') };
  });
  evidence.push({ label, axe: result });
  assert(result.regionChecked, label + ': landmark best-practice rule must actually run');
  assert.deepEqual(result.violations, [], label + ': editor axe violations (only configurable artwork excluded)');
}

try {
  await scenario('custom journey and effective review', async ({ makePage, server }) => {
    const page = await makePage(); await team(page);
    assert.equal(await page.locator('#stepList button').count(), 4);
    await otherStartingPaths(page);await page.locator('#btnBuildOwn').click();
    assert.equal(await page.locator('#stage-slides').getAttribute('aria-current'), 'step');
    assert.equal(await page.locator('#roleEditorTabs [role=tab]').count(), 5);
    await shared(page);
    assert.equal(await page.locator('#colorRole option').count(), 11);
    assert.equal(await page.locator('#font-heading option').count(), 12);
    assert.equal(await page.locator('#font-body option').count(), 12);
    await paint(page, 'sidebar', 'royal');
    await page.locator('#themeScope').selectOption('shared');
    await page.locator('#font-heading').selectOption('merriweather');
    await page.locator('#font-body').selectOption('raleway');
    await shared(page, false);
    for (const [i, kind] of kinds.entries()) {
      await editor(page, kind);
      await setField(page, kind, 'backgroundMode', 'solid');
      await setField(page, kind, 'primary', ['primary', 'gold', 'light', 'dark', 'mauve'][i]);
      await setField(page, kind, 'headingFont', ['bitter', 'inter', 'playfair-display', 'work-sans', 'source-sans-3'][i]);
      await setField(page, kind, 'bodyVisible', true);
      await setField(page, kind, 'bodyFont', 'bitter');
      await setField(page, kind, 'headingText', 'Synthetic ' + kind + ' sample');
      await setField(page, kind, 'watermarkMode', 'text');
      await setField(page, kind, 'watermarkText', 'SAMPLE ' + i);
      await setField(page, kind, 'watermarkMode', 'off');
    }
    const selected = await design(page);
    assert.deepEqual(kinds.map(k => selected.roleStyles[k].watermarkText), kinds.map((k, i) => 'SAMPLE ' + i));
    const payloadBeforeNavigation = (await backup(page)).design;
    for (const kind of kinds) await preview(page, kind);
    await stage(page, 'review');
    assert.deepEqual(await design(page), payloadBeforeNavigation, 'Editor/preview/stage navigation cannot change design values');
    const review = await page.locator('#stepPanel').innerText();
    assert.match(review, /shared.*default|default.*shared/i, 'Shared typography must be identified as defaults');
    for (const kind of kinds) {
      const effective = effectiveRoleStyle(catalog, selected, kind);
      const row = page.locator(`[data-review-role="${kind}"]`);
      assert.equal(await row.locator('[data-review-field=headingFont]').textContent(), fontName(effective.headingFont) + ' · Custom', `${kind}: effective heading font is accurate`);
      assert.equal(await row.locator('[data-review-field=bodyFont]').textContent(), fontName(effective.bodyFont) + ' · Custom', `${kind}: effective body font is accurate`);
      assert.equal(await row.locator('[data-review-field=primary]').textContent(), catalog.palette.find(c => c.id === effective.primary).name + ' · Custom');
      await page.locator('#review-preview-' + kind).click();
      assert.equal(await page.locator(`#previewTabs [data-view="${kind}"]`).getAttribute('aria-selected'), 'true');
    }
    assert.match(review, /custom|exception/i);
    await page.locator('#reviewNotes').fill('Synthetic team agreement; design review only.');
    await shot(page, 'desktop-effective-review');
    await axe(page, 'effective Review');
    await save(page);
    const saved = await remote(server);
    assert.deepEqual(saved.selection.design, selected);
    for (const key of ['step', 'stepId', 'editorRole', 'sharedThemeOpen', 'previewView', 'meaningfulDesign']) assert(!Object.hasOwn(saved.selection, key), `${key} must not enter the selection payload`);
    const returning = await makePage();
    await returning.locator('#fileStatus').filter({ hasText: /Opened|up to date|loaded/i }).waitFor();
    assert.deepEqual(await design(returning), selected, 'Fresh-context shared reopen preserves all five independent designs');
    await stage(returning, 'start');
    assert(await returning.locator('#btnContinueEditing').isVisible());
    assert(await returning.locator('#btnQuickReview').isVisible());
    assert(await returning.locator('#preset-fun').isVisible(), 'Returning designs retain the gallery; applying a different look still requires confirmation');
    await returning.locator('#btnContinueEditing').click();
    assert.deepEqual(await design(returning), selected);
    await startingLooks(returning);
    await returning.locator('#preset-fun').click();
    assert(await returning.locator('#presetDialog').isVisible(), 'A fresh shared load must confirm preset replacement without relying on Undo history');
    assert.equal(await returning.evaluate(() => document.activeElement.id), 'presetCancel');
    await returning.keyboard.press('Escape');
    assert.deepEqual(await design(returning), selected);
    assert.equal(await returning.evaluate(() => document.activeElement.id), 'preset-fun');
    await returning.locator('#preset-fun').click(); await returning.locator('#presetCancel').click();
    assert.deepEqual(await design(returning), selected);
    evidence.push({ label: 'custom saved-reopened', effectiveFonts: Object.fromEntries(kinds.map(k => [k, effectiveRoleStyle(catalog, selected, k).headingFont])), revision: saved.revision });
  });

  await scenario('preset quick path and confirmation scope', async ({ makePage }) => {
    const page = await makePage(); await team(page);
    await startingLooks(page);await page.locator('#preset-modern').click();
    assert(!await page.locator('#presetDialog').isVisible(), 'An untouched new design does not require replacement confirmation');
    await page.locator('#stage-review').click();
    assert.equal(await page.locator('#stage-review').getAttribute('aria-current'), 'step');
    const quick = await design(page); await save(page);
    await startingLooks(page);
    await page.locator('#preset-fun').click();
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetCancel').click();
    assert.deepEqual(await design(page), quick);
    await page.locator('#preset-fun').click();
    assert(await page.locator('#presetDialog').isVisible(), 'Cancel cannot enable the opt-out checkbox');
    await page.locator('#presetSkipConfirmation').check(); await page.locator('#presetApply').click();
    const fun = await design(page);
    assert.equal(fun.startingPoint, 'fun');
    await startingLooks(page);await page.locator('#preset-modern').click();
    assert(!await page.locator('#presetDialog').isVisible(), 'Confirmed opt-out applies in the same tab session');
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), fun);
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), quick);
    const fresh = await makePage(); await startingLooks(fresh);
    await fresh.locator('#preset-fun').click();
    assert(await fresh.locator('#presetDialog').isVisible(), 'Preset opt-out cannot leak into another browser context');
    await fresh.keyboard.press('Escape');
    evidence.push({ label: 'preset quick path', unnecessaryEditorsVisited: 0, cancelOptOutIgnored: true, newContextConfirms: true });
  });

  await scenario('shared scope painted output and field resets', async ({ makePage }) => {
    const page = await makePage(); await team(page); await otherStartingPaths(page);await page.locator('#btnBuildOwn').click();
    await editor(page, 'title');
    await setField(page, 'title', 'backgroundMode', 'gradient');
    await setField(page, 'title', 'primary', 'gold');
    await setField(page, 'title', 'secondary', 'mauve');
    await setField(page, 'title', 'headingFont', 'bitter');
    await setField(page, 'title', 'headingText', 'Retain this synthetic title');
    await setField(page, 'title', 'watermarkMode', 'text');
    await setField(page, 'title', 'watermarkText', 'KEEP');
    await setField(page, 'title', 'watermarkColor', 'accent');
    await setField(page, 'title', 'watermarkMode', 'off');
    await setField(page, 'title', 'backgroundMode', 'solid');
    assert.match(await page.locator('#role-title-primary-help').textContent(), /^Custom/);
    const protectedDesign = await design(page);
    await paint(page, 'titleBackground', 'dark');
    const primaryScope = await page.locator('[data-shared-scope=titleBackground]').textContent();
    assert.match(primaryScope, /Custom, unchanged.*Title slide/);
    assert.equal((await design(page)).roleStyles.title.primary, 'gold');
    assert.equal(await page.locator('#modelStage .bespoke-slide').evaluate(el => getComputedStyle(el).backgroundColor), rgb('gold'));
    await page.locator('#themeScope').selectOption('shared');
    await page.locator('#font-heading').selectOption('inter');
    assert.match(await page.locator('[data-shared-scope=headingFont]').textContent(), /Custom, unchanged.*Title slide/);
    assert((await page.locator('#modelStage .slide-title-text').evaluate(el => getComputedStyle(el).fontFamily)).includes('Bitter'));
    await shared(page, false);
    await field(page, 'title', 'primary');
    const beforeReset = await design(page);
    await page.locator('[data-reset-shared=title-primary]').click();
    const expected = structuredClone(beforeReset); expected.roleStyles.title.primary = 'inherit';
    assert.deepEqual(await design(page), expected, 'Reset background changes only that field, preserving copy/layout/hidden second color/watermark');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'role-title-primary');
    assert.match(await page.locator('#role-title-primary-help').textContent(), /^Shared/);
    assert.equal(await page.locator('#modelStage .bespoke-slide').evaluate(el => getComputedStyle(el).backgroundColor), rgb('dark'));
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), beforeReset);
    await page.locator('#btnRedo').click(); assert.deepEqual(await design(page), expected);
    await field(page, 'title', 'headingFont');
    const beforeFontReset = await design(page);
    await page.locator('[data-reset-shared=title-headingFont]').click();
    const fontReset = structuredClone(beforeFontReset); fontReset.roleStyles.title.headingFont = 'inherit';
    assert.deepEqual(await design(page), fontReset);
    assert((await page.locator('#modelStage .slide-title-text').evaluate(el => getComputedStyle(el).fontFamily)).includes('Inter'));
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), beforeFontReset);
    assert.equal((await design(page)).roleStyles.title.secondary, protectedDesign.roleStyles.title.secondary);
    for (const role of ['sidebar', 'accent', 'button']) {
      await shared(page); await page.locator('#colorRole').selectOption(role);
      const scope = page.locator(`[data-shared-scope="${role}"]`);
      assert.match(await scope.textContent(), role==='accent'?/Shared only/:/Shared default/);
      assert.equal(await scope.locator('[data-scope-role]').count(), 0, `${role} cannot offer an unrelated local editor`);
      const kind = role === 'accent' ? 'title' : 'video';
      const newColor = (await design(page)).roles[role] === 'mauve' ? 'primary' : 'mauve';
      await preview(page, kind);
      const before = await page.locator('#modelStage').screenshot();
      await paint(page, role, newColor);
      await preview(page, kind);
      const after = await page.locator('#modelStage').screenshot();
      const delta = await pixelDifference(page, before, after);
      assert(delta.changedFraction > .00005, `${role} must visibly paint its supported sample element`);
      const target = role === 'sidebar' ? '.slide-video-frame > span' : role === 'accent' ? '.slide-accent' : '.slide-button';
      assert.equal(await page.locator('#modelStage ' + target).first().evaluate(el => getComputedStyle(el).backgroundColor), rgb(newColor));
      evidence.push({ label: role + ' shared-default visible paint', delta });
    }
    await editor(page, 'title'); await setField(page, 'title', 'bodyFont', 'bitter');
    await shared(page); await page.locator('#themeScope').selectOption('shared'); await page.locator('#font-body').selectOption('raleway');
    assert.match(await page.locator('[data-shared-scope=bodyFont]').textContent(), /Custom, unchanged.*Title slide/);
    await preview(page, 'title');
    assert((await page.locator('#modelStage .slide-subtitle').evaluate(el => getComputedStyle(el).fontFamily)).includes('Bitter'));
    await preview(page, 'video');
    for (const selector of ['.slide-sidebar', '.slide-button']) assert((await page.locator('#modelStage ' + selector).first().evaluate(el => getComputedStyle(el).fontFamily)).includes('Raleway'), 'Shared body font paints navigation and buttons despite a local text override');
    await shared(page); await page.locator('#colorRole').selectOption('heading');
    await page.locator('#colorScope').selectOption('shared');
    await page.locator('[data-shared-scope=heading] [data-scope-role=cards]').click();
    assert.equal(await page.locator('#editor-cards').getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'role-cards-headingColor', 'Shared Heading shortcut opens its matching field');
    await shot(page, 'shared-field-scope');
    await axe(page, 'shared/local scope editor');
  });

  await scenario('recovery dismissal focus and stale save recovery', async ({ makePage, server }) => {
    const first = await makePage(); await team(first); await save(first);
    const second = await makePage();
    await paint(first, 'sidebar', 'mauve'); await save(first);
    await paint(second, 'sidebar', 'accent');
    const local = await design(second); await save(second, 409);
    assert.deepEqual(await design(second), local, 'Stale save preserves the local design');
    const recovery = await backup(second);
    assert.deepEqual(recovery.design, local);
    assert.equal(await second.evaluate(() => document.activeElement.matches('.more-menu > summary')), true, 'File action returns focus to its trigger');
    const menu = second.locator('.more-menu'), trigger = menu.locator(':scope > summary');
    await trigger.click(); await second.keyboard.press('Escape');
    assert.equal(await menu.evaluate(el => el.open), false);
    assert.equal(await second.evaluate(() => document.activeElement.matches('.more-menu > summary')), true);
    await trigger.click(); await second.locator('#stage-review').click();
    assert.equal(await menu.evaluate(el => el.open), false, 'Clicking another control outside dismisses the menu');
    assert.equal(await second.locator('#stage-review').getAttribute('aria-current'), 'step', 'Outside control still performs its action');
    await clickMenuItem(second, '#btnHistory'); await second.locator('#historyPanel button').first().waitFor();
    assert.equal(await second.locator('#btnHistory').getAttribute('aria-expanded'), 'true', 'Previous versions is not intercepted by recovery overlay');
    await clickMenuItem(second, '#btnHistory');
    await second.locator('#btnLoadLatest').click();
    await second.locator('#fileStatus').filter({ hasText: 'Opened the latest shared design.' }).waitFor();
    assert.deepEqual(await design(second), (await remote(server)).selection.design);
    await upload(second, recovery);
    assert.equal((await draft(second)).autosavePaused, true, 'Recovered backup needs deliberate Save');
    await save(second);
    assert.deepEqual((await remote(server)).selection.design, local, 'Explicit recovery Save confirms the chosen local design');
    await backup(second); await clickMenuItem(second, '#btnHistory');
    await second.locator('#historyPanel button').first().waitFor();
    await shot(second, 'recovery-history-accessible');
    const history = (await remote(server, 'history')).history;
    assert(history.length >= 3, 'Recovery appends a revision and retains prior versions');
    evidence.push({ label: 'synthetic conflict/recovery', staleStatus: 409, historyCount: history.length, menuDismissal: ['file action', 'Escape', 'outside action'] });
  });

  await scenario('legacy UI steps and selection recovery', async ({ makePage }) => {
    const oldIds = ['welcome', 'team', 'colors', 'fonts', ...kinds, 'review'];
    const storedDesign = defaultDesign(catalog);
    storedDesign.roleStyles = { title: { ...roleStyleDefaults(catalog, storedDesign, 'title'), headingFont: 'bitter', primary: 'gold' } };
    for (const [index, oldId] of oldIds.entries()) {
      const saved = { step: index, stepId: oldId, previewView: 'activity', activeRole: 'sidebar', lessonId: 'money-management', teamName: 'Synthetic previous workflow', spokespersonName: 'Sample Instructor', spokespersonEmail: 'sample@example.org', unspoken: '', design: storedDesign, changes: [], redo: [] };
      const page = await makePage({ storedDraft: saved });
      // The old team step is the new Lesson & team stage; the old welcome step is the starting looks.
      const mapped = [...kinds,'colors','fonts'].includes(oldId) ? 'slides' : oldId === 'review' ? 'review' : oldId === 'team' ? 'team' : 'start';
      assert.equal(await page.locator('#stage-' + mapped).getAttribute('aria-current'), 'step', oldId + ' maps to the right stage');
      if (kinds.includes(oldId)) assert.equal(await page.locator('#editor-' + oldId).getAttribute('aria-selected'), 'true');
      if (['colors', 'fonts'].includes(oldId)) assert(await page.locator('#sharedTheme').evaluate(el => el.open));
      assert.deepEqual(await design(page), storedDesign, oldId + ' restores without model migration');
      assert.equal(await page.locator('#previewTabs [data-view=activity]').getAttribute('aria-selected'), 'true', 'Saved preview context survives old-step mapping');
      await page.context().close();
    }
    const numeric = await makePage({ storedDraft: { step: 7, lessonId: 'money-management', teamName: 'Synthetic numeric step', design: storedDesign, changes: [], redo: [] } });
    assert.equal(await numeric.locator('#editor-video').getAttribute('aria-selected'), 'true', 'Older numeric-only step maps to Video');
    assert.deepEqual(await design(numeric), storedDesign);
    const page = await makePage();
    const oldV2 = defaultDesign(catalog); delete oldV2.roleStyles;
    await upload(page, payload(oldV2)); assert.deepEqual(await design(page), oldV2);
    assert(!Object.hasOwn(await design(page), 'roleStyles'), 'Old v2 does not eagerly acquire local styles');
    const oldBackup = await backup(page); assert.deepEqual(oldBackup.design, oldV2);
    await upload(page, payload(storedDesign)); assert.deepEqual(await design(page), storedDesign);
    await upload(page, legacy, 'synthetic-v1.json');
    assert.match(await page.locator('#restoreNotice').textContent(), /older|convert/i);
    assert.deepEqual((await backup(page)).legacySelection, legacy, 'V1 archive survives conversion exactly');
    await stage(page, 'review');
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download original v1 design', exact: true }).click();
    const original = JSON.parse(await fs.readFile(await (await pending).path(), 'utf8'));
    assert.deepEqual(original, legacy);
    evidence.push({ label: 'legacy recovery', stepIds: oldIds, numericStep: 7, oldV2Unchanged: true, originalV1Exact: true });
  });

  await scenario('responsive editor keyboard and best-practice accessibility', async ({ makePage }) => {
    for (const [width, height, scale] of [[1440, 1000, 1], [1280, 720, 1], [390, 844, 1], [320, 720, 1], [390, 844, 2]]) {
      const page = await makePage({ width, height }); await team(page);
      if (scale === 2) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      const label = `${width}x${height}-${scale * 100}percent`;
      await axe(page, label + ' Start');
      await otherStartingPaths(page);await page.locator('#btnBuildOwn').click();
      await page.locator('#btnMoreOptions').click();
      await page.locator('#editor-title').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#editor-divider').getAttribute('aria-selected'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'editor-divider');
      await page.keyboard.press('End'); assert.equal(await page.locator('#editor-activity').getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home'); assert.equal(await page.locator('#editor-title').getAttribute('aria-selected'), 'true');
      const selected = await design(page);
      await field(page, 'title', 'headingFont');
      await shared(page);
      const measurements = await page.evaluate(() => {
        const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('details:not([open]) > :not(summary)');
        const controls = [...document.querySelectorAll('button, select, input, summary, a')].filter(el => visible(el) && !el.closest('#modelStage, .button-color-sample') && !(el.tagName === 'INPUT' && el.type === 'hidden'));
        const boxes = controls.map(el => { const target = el.matches('input[type=checkbox]') ? el.closest('label') : el; const r = target.getBoundingClientRect(); return { id: el.id, tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80), width: r.width, height: r.height }; });
        return { viewport: innerWidth, width: document.documentElement.scrollWidth, rootFont: getComputedStyle(document.documentElement).fontSize, boxes };
      });
      assert(measurements.width <= width + 1, label + ': editor has no horizontal page overflow');
      if (width <= 390) {
        const short = measurements.boxes.filter(b => b.height < 43.5 || b.width < 43.5);
        assert.deepEqual(short, [], label + ': phone editor targets meet the 44px ergonomic contract');
      }
      const font = await page.locator('#role-title-headingFont').boundingBox();
      assert(font.height >= 44, label + ': native heading select is at least 44px high');
      assert.deepEqual(await design(page), selected, label + ': responsive/keyboard/editor actions keep selected artwork');
      await shot(page, label + '-editor'); await axe(page, label + ' Shared theme and Title');
      await shared(page, false);
      await preview(page, 'title'); await page.locator('#previewTabs [data-view=title]').focus(); await page.keyboard.press('End');
      assert.equal(await page.locator('#previewTabs [data-view=activity]').getAttribute('aria-selected'), 'true');
      if (width <= 390) {
        await page.locator('#surface-preview').focus(); await page.keyboard.press('Home');
        assert.equal(await page.locator('#surface-design').getAttribute('aria-selected'), 'true');
      }
      await stage(page, 'review'); await shot(page, label + '-review'); await axe(page, label + ' Review');
      evidence.push({ label, measurements, nativeTitleSelect: font });
      await page.context().close();
    }
  });
} finally {
  await browser.close();
  if (output) await fs.writeFile(path.join(output, browserName + '-streamlined-results.json'), JSON.stringify({ browser: browserName, passed, failures, errors, external, actions, evidence }, null, 2));
}
assert.deepEqual(errors, [], 'No browser runtime errors');
assert.deepEqual(external, [], 'No external network request is permitted');
assert(!actions.some(a => ['send', 'status'].includes(a.action)), 'No Send or review-status request is allowed');
console.log(`${browserName}: ${passed} streamlined workflow scenarios passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
