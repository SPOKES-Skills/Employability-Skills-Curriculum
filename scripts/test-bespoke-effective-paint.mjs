#!/usr/bin/env node
// Regression for painting the visible effective element when it has a local
// override. Isolated browsers + in-memory loopback services only; no user state.
import assert from 'node:assert/strict';
import {clickMenuItem} from './bespoke-test-navigation.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserName, browserType, tabKey } from './bespoke-test-browser.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';
import { defaultDesign, effectiveRoleStyle, roleStyleDefaults } from '../bespoke/builder-model.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };

const output = process.env.BESPOKE_REVIEW_DIR;
const only = process.env.BESPOKE_PAINT_SCENARIO;
if (output) await fs.mkdir(output, { recursive: true });
const kinds = ['title', 'divider', 'cards', 'video', 'activity'];
const evidence = [], failures = [], errors = [], external = [], requests = [];
const browser = await browserType.launch({ headless: true });
let passed = 0;
const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design = async page => (await draft(page)).design;
const rgb = id => `rgb(${[1, 3, 5].map(i => parseInt(catalog.palette.find(c => c.id === id).hex.slice(i, i + 2), 16)).join(', ')})`;
const colorName = id => catalog.palette.find(c => c.id === id).name;
const labels = { title: 'Title slide', divider: 'Chapter divider', cards: 'Text boxes', video: 'Video slide', activity: 'Activity' };
const colorRole = (kind, field) => field === 'primary' ? ({ title: 'titleBackground', divider: 'dividerBackground' }[kind] || 'contentBackground') : field === 'secondary' ? 'titleBackgroundEnd' : ['title', 'divider'].includes(kind) ? field === 'headingColor' ? 'titleText' : 'subtitle' : field === 'headingColor' ? 'heading' : 'body';
const payload = d => ({ schema: 'bespoke-selection/v2', date: '2026-09-24', lesson: { id: 'money-management', title: 'Money Management', displayTitle: 'Synthetic paint sample', subtitle: 'Synthetic only' }, team: { name: 'Synthetic effective paint team', spokesperson: { name: 'Sample Instructor', email: 'sample@example.org' } }, design: d });
function customFixture() {
  const d = defaultDesign(catalog); d.startingPoint = 'custom';
  d.slides.title.layout = 'left'; d.slides.divider.layout = 'left';
  d.roleStyles = Object.fromEntries(kinds.map((kind, i) => [kind, {
    ...roleStyleDefaults(catalog, d, kind), backgroundMode: 'gradient', primary: 'primary', secondary: 'muted', direction: 'diagonal', pattern: 'diagonal', patternStrength: 'bold',
    headingColor: 'muted-gold', bodyColor: 'royal', headingFont: 'bitter', bodyFont: 'raleway', bodyVisible: true,
    watermarkMode: 'text', watermarkText: 'SAMPLE ' + i, watermarkColor: 'muted-gold', watermarkPlacement: 'bottom-right', watermarkSize: 'small', watermarkOpacity: 'medium'
  }]));
  return d;
}
async function scenario(name, run) {
  if (only && !only.split('|').some(fragment => name.includes(fragment))) return;
  const server = await createDevServer({ port: 0 });
  const contexts = [], pages = [];
  async function makePage(width = 1440, height = 1000) {
    const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, reducedMotion: 'reduce' }); contexts.push(context); context.setDefaultTimeout(10000);
    await context.addInitScript(() => window.__bespokeAutosave = { enabled: false });
    await context.route(/^https?:/, route => { if (new URL(route.request().url()).origin === server.baseUrl) return route.continue(); external.push(route.request().url()); return route.abort(); });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push({ scenario: name, message: error.message })); page.on('dialog', dialog => dialog.accept());
    page.on('request', r => { if (r.url().endsWith('/api/bespoke') && r.method() === 'POST') requests.push({ scenario: name, action: r.postDataJSON()?.action }); });
    await page.goto(server.baseUrl + '/bespoke/'); await ready(page); return page;
  }
  console.log('START ' + name);
  try { await run({ makePage, server }); passed++; console.log('PASS ' + name); }
  catch (error) {
    failures.push({ name, error: error.stack }); console.error('FAIL ' + name + '\n' + error.stack);
    if (output) for (const [i, page] of pages.entries()) if (!page.isClosed()) await page.screenshot({ path: path.join(output, `${browserName}-failed-${name.replace(/\W+/g, '-')}-${i}.png`) }).catch(() => {});
  } finally { for (const context of contexts) await context.close(); await server.close(); }
}
async function ready(page) { await page.locator('#localPreviewNotice').waitFor(); await page.locator('#btnSave').filter({ hasText: 'Save test design' }).waitFor(); }
async function surface(page, view) { const tab = page.locator('#surface-' + view); if (await tab.isVisible()) await tab.click(); }
async function shared(page) {
  if(!await page.locator('#sharedTheme').count())await page.locator('#stage-slides').click();
  if(!await page.locator('#detailControls').isVisible())await page.locator('#btnMoreOptions').click();
  await surface(page, 'design');
  const d = page.locator('#sharedTheme'); if (!await d.evaluate(el => el.open)) await d.locator(':scope > summary').click();
}
async function start(page) { await surface(page, 'design'); await page.locator('#stage-start').click(); await shared(page); }
async function view(page, kind) {if(['team','start'].includes(await page.locator('#workspace').getAttribute('data-stage'))){await page.locator('#stage-slides').click();if(!await page.locator('#detailControls').isVisible())await page.locator('#btnMoreOptions').click();} await surface(page, 'preview'); await page.locator(`#previewTabs [data-view="${kind}"]`).click(); await page.evaluate(() => document.fonts.ready); }
async function element(page, role) { await shared(page); await page.locator('#colorRole').selectOption(role); }
async function importDesign(page, d) {
  await page.locator('#teamFileInput').setInputFiles({ name: 'synthetic-effective-paint.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload(d))) });
  await page.locator('#fileStatus').filter({ hasText: 'Opened synthetic-effective-paint.json.' }).waitFor();
}
async function selected(page, role, color, scope = 'slide', kind) {
  assert.equal(await page.locator('.paint-chip[aria-pressed=true]').count(), 1, 'Exactly one current color is selected');
  assert.equal(await page.locator('.paint-chip[aria-pressed=true]').getAttribute('id'), `paint-${role}-${color}`);
  assert((await page.locator('.paint-chip[aria-pressed=true]').getAttribute('aria-label')).includes(colorName(color)));
  if (scope === 'global-only') { assert.equal(await page.locator('#colorScope').count(), 0); return; }
  assert.equal(await page.locator('#colorScope').inputValue(), scope);
  if (scope === 'slide') {
    assert((await page.locator('#colorScope option:checked').textContent()).includes(labels[kind]));
    assert((await page.locator('#colorScopeHelp').textContent()).includes(labels[kind]), 'Scope explanation identifies the actual slide');
  }
}
async function paint(page, role, color) { await page.locator(`#paint-${role}-${color}`).click(); }
async function computed(page, kind, field) {
  if (field === 'primary' || field === 'secondary') return page.locator('#modelStage .bespoke-slide').evaluate(el => ({ color: getComputedStyle(el).backgroundColor, image: getComputedStyle(el).backgroundImage }));
  const selector = field === 'headingColor' ? kind === 'title' ? '.slide-title-text' : '.slide-heading' : kind === 'title' ? '.slide-subtitle' : kind === 'cards' ? '.slide-card .slide-body' : '.slide-body';
  return page.locator('#modelStage ' + selector).first().evaluate(el => getComputedStyle(el).color);
}
async function checkPaint(page, kind, field, color) {
  const d = await design(page), effective = effectiveRoleStyle(catalog, d, kind);
  assert.equal(effective[field], color);
  const actual = await computed(page, kind, field);
  if (field === 'primary') { assert.equal(actual.color, rgb(color)); assert(actual.image.includes(rgb(color))); }
  else if (field === 'secondary') assert(actual.image.includes(rgb(color)));
  else assert.equal(actual, rgb(color));
  return actual;
}
async function save(page) {
  const reply = page.waitForResponse(r => r.url().endsWith('/api/bespoke') && r.request().postDataJSON()?.action === 'save'); await page.locator('#btnSave').click(); assert.equal((await reply).status(), 200);
  await page.locator('#fileStatus').filter({ hasText: /Local test design saved|already up to date/ }).waitFor();
}
async function openRemote(server) { const response = await fetch(server.baseUrl + '/api/bespoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', lessonId: 'money-management', editCode: LOCAL_PREVIEW_CODE }) }); assert.equal(response.status, 200); return response.json(); }
async function backup(page) {
  const menu = page.locator('.more-menu'); if (!await menu.evaluate(el => el.open)) await menu.locator(':scope > summary').click();
  const pending = page.waitForEvent('download'); await page.locator('#btnDownloadBackup').click(); return JSON.parse(await fs.readFile(await (await pending).path(), 'utf8'));
}
async function shot(page, name) { if (output) { await page.screenshot({ path: path.join(output, browserName + '-' + name + '.png') }); await page.locator('#modelStage').screenshot({ path: path.join(output, browserName + '-' + name + '-preview.png') }); } }

try {
  await scenario('reported divider override paints visible Green and persists exactly', async ({ makePage, server }) => {
    const page = await makePage(), before = customFixture(); before.roles.dividerBackground = 'accent';
    await importDesign(page, before); await start(page); await element(page, 'dividerBackground');
    assert.equal(await page.locator('#previewTabs [data-view=divider]').getAttribute('aria-selected'), 'true');
    await selected(page, 'dividerBackground', 'primary', 'slide', 'divider');
    assert.match(await page.locator('#colorScopeHelp').textContent(), /custom/i);
    const oldPixels = await page.locator('#modelStage').screenshot(); await paint(page, 'dividerBackground', 'accent');
    const expected = structuredClone(before); expected.roleStyles.divider.primary = 'accent';
    assert.deepEqual(await design(page), expected, 'Only divider.primary changes, preserving global defaults, every other role and every other local field');
    const visible = await checkPaint(page, 'divider', 'primary', 'accent');
    assert(visible.image.includes(rgb('muted')) && visible.image.includes('135deg'), 'Pale secondary and diagonal gradient remain');
    assert(visible.image.includes('repeating-linear-gradient'), 'Diagonal texture remains');
    assert.equal(await computed(page, 'divider', 'headingColor'), rgb('muted-gold'));
    await selected(page, 'dividerBackground', 'accent', 'slide', 'divider');
    const delta = await pixelDifference(page, oldPixels, await page.locator('#modelStage').screenshot()); assert(delta.changedFraction > .01, 'The requested color visibly changes the actual sample');
    await shot(page, 'divider-Green');
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), before); await selected(page, 'dividerBackground', 'primary', 'slide', 'divider');
    await page.locator('#btnRedo').click(); assert.deepEqual(await design(page), expected);
    await page.reload(); await ready(page); assert.deepEqual(await design(page), expected); await selected(page, 'dividerBackground', 'accent', 'slide', 'divider');
    await save(page); const saved = (await openRemote(server)).selection; assert.deepEqual(saved.design, expected);
    for (const key of ['colorScope', 'paintScope', 'activeRole', 'previewView']) assert(!Object.hasOwn(saved, key), 'UI-only paint scope must not enter saved selection');
    const fresh = await makePage(); assert.deepEqual(await design(fresh), expected, 'Fresh-context automatic Open preserves exact painted design');
    await clickMenuItem(fresh, '#btnOpen'); await fresh.locator('#fileStatus').filter({ hasText: /Opened|latest|up to date/i }).waitFor(); assert.deepEqual(await design(fresh), expected);
    const copied = await backup(fresh); assert.deepEqual(copied.design, expected);
    for (const key of ['colorScope', 'paintScope', 'activeRole', 'previewView']) assert(!Object.hasOwn(copied, key), 'UI-only paint scope must not enter backup selection');
    await importDesign(fresh, before); await fresh.locator('#teamFileInput').setInputFiles({ name: 'synthetic-painted-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(copied)) });
    await fresh.locator('#fileStatus').filter({ hasText: 'Opened synthetic-painted-backup.json.' }).waitFor(); assert.deepEqual(await design(fresh), expected);
    evidence.push({ label: 'reported divider reproduction', intendedDifference: 'roleStyles.divider.primary: primary → accent', visible, delta, undoReloadSaveOpenBackup: true });
  });

  await scenario('twenty analogous visible color targets remain isolated', async ({ makePage }) => {
    const page = await makePage(); await importDesign(page, customFixture()); await start(page);
    for (const kind of kinds) for (const field of ['primary', 'secondary', 'headingColor', 'bodyColor']) {
      await view(page, kind); const role = colorRole(kind, field); await element(page, role);
      assert.equal(await page.locator(`#previewTabs [data-view="${kind}"]`).getAttribute('aria-selected'), 'true', 'Compatible current preview stays the actual target');
      const before = await design(page), current = effectiveRoleStyle(catalog, before, kind)[field]; await selected(page, role, current, 'slide', kind);
      const color = current === 'accent' ? 'mauve' : 'accent'; await paint(page, role, color);
      const expected = structuredClone(before); expected.roleStyles[kind][field] = color;
      assert.deepEqual(await design(page), expected, `${kind}/${field}: only selected local color changes`);
      const actual = await checkPaint(page, kind, field, color); await selected(page, role, color, 'slide', kind);
      evidence.push({ label: 'analogous visible paint', kind, field, color, actual });
    }
    for (const field of ['primary', 'secondary', 'headingColor', 'bodyColor']) {
      await view(page, 'title'); await element(page, colorRole('title', field));
      const before = await design(page);
      for (const kind of ['divider', 'cards', 'video', 'activity', 'title']) {
        await view(page, kind); await shared(page);
        const role = colorRole(kind, field), current = effectiveRoleStyle(catalog, before, kind)[field];
        assert.equal(await page.locator('#colorRole').inputValue(), role, `Preview change maps the same ${field} element to ${kind}`);
        await selected(page, role, current, 'slide', kind);
        assert.deepEqual(await design(page), before, 'Preview/element/scope selection never changes design values');
      }
    }
  });

  await scenario('explicit shared defaults and global-only colors keep local exceptions', async ({ makePage }) => {
    const page = await makePage(); await importDesign(page, customFixture()); await start(page);
    const roles = [...new Set(kinds.flatMap(kind => ['primary', 'secondary', 'headingColor', 'bodyColor'].map(field => colorRole(kind, field))))];
    for (const role of roles) {
      await element(page, role); await page.locator('#colorScope').selectOption('shared');
      const before = await design(page); await selected(page, role, before.roles[role], 'shared');
      const color = before.roles[role] === 'accent' ? 'mauve' : 'accent'; await paint(page, role, color);
      const expected = structuredClone(before); expected.roles[role] = color;
      assert.deepEqual(await design(page), expected, role + ': explicit Shared default changes no local field');
      await selected(page, role, color, 'shared');
      assert.match(await page.locator(`[data-shared-scope="${role}"]`).textContent(), /custom.*unchanged/i);
    }
    const chosen = await design(page), role = await page.locator('#colorRole').inputValue(); await page.reload(); await ready(page);
    assert.deepEqual(await design(page), chosen); await selected(page, role, chosen.roles[role], 'shared');
    await element(page, 'dividerBackground'); assert.equal(await page.locator('#colorScope').inputValue(), 'slide', 'Choosing an element deliberately returns to visible-slide painting');
    for (const [role, kind, selector, property] of [['sidebar', 'video', '.slide-video-frame > span', 'backgroundColor'], ['accent', 'title', '.slide-accent', 'backgroundColor'], ['button', 'video', '.slide-button', 'backgroundColor']]) {
      await view(page, kind); await element(page, role);
      const before = await design(page), color = before.roles[role] === 'accent' ? 'mauve' : 'accent';
      await selected(page, role, before.roles[role], 'global-only'); await paint(page, role, color);
      const expected = structuredClone(before); expected.roles[role] = color; assert.deepEqual(await design(page), expected);
      await view(page, kind); assert.equal(await page.locator('#modelStage ' + selector).first().evaluate((el, property) => getComputedStyle(el)[property], property), rgb(color));
    }
    evidence.push({ label: 'explicit shared defaults', sharedRoles: roles, globalOnly: ['sidebar', 'accent', 'button'], localRecordsPreserved: true });
  });

  await scenario('inherited old-v2 painting and phone control scope', async ({ makePage }) => {
    const page = await makePage(390, 844), before = defaultDesign(catalog); delete before.roleStyles; await importDesign(page, before); await start(page); await element(page, 'dividerBackground');
    assert.deepEqual(await design(page), before, 'Opening paint controls and choosing an element does not eagerly migrate old v2');
    await selected(page, 'dividerBackground', before.roles.dividerBackground, 'slide', 'divider'); assert.match(await page.locator('#colorScopeHelp').textContent(), /shared/i);
    await page.locator('#colorScope').focus(); await page.keyboard.press(tabKey);
    assert.notEqual(await page.evaluate(() => document.activeElement.id), 'colorScope', 'Keyboard can leave scope selector');
    await page.locator('#paint-dividerBackground-accent').focus(); await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'paint-dividerBackground-accent', 'Keyboard paint retains focus after rerender');
    const expected = structuredClone(before); expected.startingPoint = 'custom'; expected.roleStyles = { divider: { ...roleStyleDefaults(catalog, before, 'divider'), primary: 'accent' } };
    assert.deepEqual(await design(page), expected, 'Painting inherited old-v2 creates only the selected role record and field override');
    await selected(page, 'dividerBackground', 'accent', 'slide', 'divider');
    await surface(page, 'preview'); assert.equal((await computed(page, 'divider', 'primary')).color, rgb('accent'));
    await surface(page, 'design'); const scope = page.locator('#colorScope'); await scope.scrollIntoViewIfNeeded();
    const box = await scope.boundingBox(); assert(box.height >= 44, 'Phone scope selector keeps 44px target');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Scope selector causes no phone overflow');
    const source = await fs.readFile(path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js'), 'utf8'); await page.addScriptTag({ content: source });
    const scan = await page.evaluate(async () => { const r = await axe.run({ exclude: [['#modelStage'], ['.button-color-sample']] }); return { violations: r.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), region: r.passes.some(v => v.id === 'region') }; });
    assert.deepEqual(scan.violations, []); assert(scan.region);
    if (output) await page.screenshot({ path: path.join(output, browserName + '-phone-paint-scope.png') });
    evidence.push({ label: 'phone inherited old-v2', scopeHeight: box.height, scan });
  });
} finally {
  await browser.close();
  if (output) await fs.writeFile(path.join(output, browserName + '-effective-paint.json'), JSON.stringify({ browser: browserName, passed, failures, errors, external, requests, evidence }, null, 2));
}
assert.deepEqual(errors, [], 'No browser runtime errors'); assert.deepEqual(external, [], 'No external requests');
assert(!requests.some(r => ['send', 'status'].includes(r.action)), 'No submission/status calls');
assert(passed + failures.length > 0, 'BESPOKE_PAINT_SCENARIO did not match a scenario');
console.log(`${browserName}: ${passed} effective paint groups passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
