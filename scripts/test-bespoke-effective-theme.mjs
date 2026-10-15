#!/usr/bin/env node
// Regression for changing the visible effective fonts and texture with a local
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
const only = process.env.BESPOKE_THEME_SCENARIO;
if (output) await fs.mkdir(output, { recursive: true });
const kinds = ['title', 'divider', 'cards', 'video', 'activity'];
const evidence = [], failures = [], errors = [], external = [], requests = [];
const browser = await browserType.launch({ headless: true });
let passed = 0;
const draft = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design = async page => (await draft(page)).design;
const labels = { title: 'Title slide', divider: 'Chapter divider', cards: 'Text boxes', video: 'Video slide', activity: 'Activity' };
const payload = d => ({ schema: 'bespoke-selection/v2', date: '2026-09-24', lesson: { id: 'money-management', title: 'Money Management', displayTitle: 'Synthetic theme sample', subtitle: 'Synthetic only' }, team: { name: 'Synthetic effective theme team', spokesperson: { name: 'Sample Instructor', email: 'sample@example.org' } }, design: d });
function customFixture() {
  const d = defaultDesign(catalog); d.startingPoint = 'custom';
  d.slides.title.layout = 'left'; d.slides.divider.layout = 'left';
  d.roleStyles = Object.fromEntries(kinds.map((kind, i) => [kind, {
    ...roleStyleDefaults(catalog, d, kind), backgroundMode: 'gradient', primary: 'primary', secondary: 'muted', direction: 'diagonal', pattern: 'diagonal', patternStrength: ['subtle', 'bold', 'normal', 'bold', 'subtle'][i],
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
async function importDesign(page, d) {
  await page.locator('#teamFileInput').setInputFiles({ name: 'synthetic-effective-theme.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload(d))) });
  await page.locator('#fileStatus').filter({ hasText: 'Opened synthetic-effective-theme.json.' }).waitFor();
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

async function previewPixels(page) { await page.locator('#modelStage').scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready); return page.locator('#modelStage').screenshot(); }
const patterns = ['plain', 'dot-grid', 'diagonal', 'crosshatch', 'soft-gradient'];
const group = page => page.getByRole('group', { name: 'Background pattern', exact: true });
const patternButton = (page, id) => group(page).locator(`[data-choice="${id}"]`);
async function background(locator) {
  return locator.evaluate(el => { const s = getComputedStyle(el); return Object.fromEntries(['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'].map(k => [k, s[k]])); });
}
async function currentBackground(page) { return background(page.locator('#modelStage .bespoke-slide')); }
function textSelector(kind, key) { return key === 'heading' ? kind === 'title' ? '.slide-title-text' : '.slide-heading' : kind === 'title' ? '.slide-subtitle' : kind === 'cards' ? '.slide-card .slide-body' : '.slide-body'; }
async function fontComputed(page, kind, key) {
  return page.locator('#modelStage ' + textSelector(kind, key)).first().evaluate(el => getComputedStyle(el).fontFamily);
}
async function selectedTheme(page, kind, scope = 'slide') {
  const d = await design(page), effective = effectiveRoleStyle(catalog, d, kind);
  assert.equal(await page.locator('#themeScope').inputValue(), scope);
  assert.equal(await page.locator('#previewTabs [aria-selected=true]').getAttribute('data-view'), kind);
  if (scope === 'slide') assert((await page.locator('#themeScope option:checked').textContent()).includes(labels[kind]));
  assert.equal(await page.locator('#font-heading').inputValue(), scope === 'slide' ? effective.headingFont : d.fonts.heading);
  assert.equal(await page.locator('#font-body').inputValue(), scope === 'slide' ? effective.bodyFont : d.fonts.body);
  assert.equal(await group(page).locator('[aria-pressed=true]').count(), 1);
  assert.equal(await group(page).locator('[aria-pressed=true]').getAttribute('data-choice'), scope === 'slide' ? effective.pattern : d.background);
}
async function checkFont(page, kind, key, id) {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(effectiveRoleStyle(catalog, await design(page), kind)[key + 'Font'], id);
  const actual = await fontComputed(page, kind, key);
  assert(actual.includes(catalog.fonts.find(f => f.id === id).family), `${kind}/${key}: the rendered font follows the selected effective value`);
  return actual;
}
function noUiFields(selection) {
  for (const key of ['themeScope', 'colorScope', 'paintScope', 'activeRole', 'previewView']) {
    assert(!Object.hasOwn(selection, key) && !Object.hasOwn(selection.design, key), key + ' must remain UI-only');
  }
}
async function thumbnailMatches(page, pattern) {
  const thumbnail = await background(patternButton(page, pattern).locator('.pattern-mini')), actual = await currentBackground(page);
  assert.deepEqual(thumbnail, actual, 'The selected texture thumbnail uses the actual effective preview colors, gradient, direction and strength');
  return actual;
}

try {
  await scenario('reported divider Plain override persists with fonts and saved strength', async ({ makePage, server }) => {
    const page = await makePage(), before = customFixture(); before.background = 'plain';
    await importDesign(page, before); await start(page); await view(page, 'divider'); await shared(page);
    await selectedTheme(page, 'divider'); assert.match(await page.locator('#patternScopeHelp').textContent(), /Custom.*Stronger/s);
    const oldPixels = await previewPixels(page), oldBackground = await currentBackground(page);
    assert(oldBackground.backgroundImage.includes('repeating-linear-gradient'));
    await patternButton(page, 'plain').click();
    const expected = structuredClone(before); expected.roleStyles.divider.pattern = 'plain';
    assert.deepEqual(await design(page), expected, 'Plain changes only divider.pattern, keeping bold strength and all custom fields');
    await selectedTheme(page, 'divider'); const actual = await thumbnailMatches(page, 'plain');
    assert(!actual.backgroundImage.includes('repeating-linear-gradient') && !actual.backgroundImage.includes('radial-gradient'));
    assert(actual.backgroundImage.includes('135deg') && actual.backgroundImage.includes('rgb(0, 123, 175)') && actual.backgroundImage.includes('rgb(237, 243, 247)'), 'Plain keeps the Blue-to-Mist gradient');
    const delta = await pixelDifference(page, oldPixels, await previewPixels(page)); assert(delta.changedFraction > .005, 'Plain visibly removes the diagonal texture');
    await shot(page, 'divider-Plain');
    await page.locator('#btnUndo').click(); assert.deepEqual(await design(page), before); await selectedTheme(page, 'divider');
    await page.locator('#btnRedo').click(); assert.deepEqual(await design(page), expected);
    for (const [key, value] of [['heading', 'inter'], ['body', 'source-sans-3']]) {
      await page.locator('#font-' + key).selectOption(value); expected.roleStyles.divider[key + 'Font'] = value;
      assert.deepEqual(await design(page), expected); await checkFont(page, 'divider', key, value);
    }
    await page.locator('#btnUndo').click(); const undone = structuredClone(expected); undone.roleStyles.divider.bodyFont = before.roleStyles.divider.bodyFont; assert.deepEqual(await design(page), undone);
    await page.locator('#btnRedo').click(); assert.deepEqual(await design(page), expected);
    await page.reload(); await ready(page); assert.deepEqual(await design(page), expected); await selectedTheme(page, 'divider');
    await save(page); const saved = (await openRemote(server)).selection; assert.deepEqual(saved.design, expected); noUiFields(saved);
    const fresh = await makePage(); assert.deepEqual(await design(fresh), expected); await clickMenuItem(fresh, '#btnOpen');
    await fresh.locator('#fileStatus').filter({ hasText: /Opened|latest|up to date/i }).waitFor(); assert.deepEqual(await design(fresh), expected);
    const copied = await backup(fresh); assert.deepEqual(copied.design, expected); noUiFields(copied);
    await importDesign(fresh, before); await fresh.locator('#teamFileInput').setInputFiles({ name: 'synthetic-theme-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(copied)) });
    await fresh.locator('#fileStatus').filter({ hasText: 'Opened synthetic-theme-backup.json.' }).waitFor(); assert.deepEqual(await design(fresh), expected);
    evidence.push({ label: 'reported divider Plain', before: oldBackground, actual, delta, undoRedoReloadSaveOpenBackup: true });
  });

  await scenario('twenty-five local texture and ten font cases match the actual preview', async ({ makePage }) => {
    const page = await makePage(); await importDesign(page, customFixture()); await start(page);
    for (const kind of kinds) {
      await view(page, kind); await shared(page); await selectedTheme(page, kind);
      let plainPixels;
      for (const pattern of patterns) {
        const before = await design(page); await patternButton(page, pattern).click();
        const expected = structuredClone(before); expected.roleStyles[kind].pattern = pattern;
        assert.deepEqual(await design(page), expected, `${kind}/${pattern}: only the selected local pattern changes`);
        await selectedTheme(page, kind); const actual = await thumbnailMatches(page, pattern), pixels = await previewPixels(page);
        if (pattern === 'plain') plainPixels = pixels;
        const delta = pattern === 'plain' ? null : await pixelDifference(page, plainPixels, pixels);
        if (delta) assert(delta.changedFraction > .0001, `${kind}/${pattern}: texture visibly changes the rendered slide`);
        evidence.push({ label: 'local texture', kind, pattern, strength: expected.roleStyles[kind].patternStrength, actual, delta });
      }
      for (const [key, value] of [['heading', 'inter'], ['body', 'source-sans-3']]) {
        const before = await design(page), pixels = await previewPixels(page);
        await page.locator('#font-' + key).selectOption(value);
        const expected = structuredClone(before); expected.roleStyles[kind][key + 'Font'] = value;
        assert.deepEqual(await design(page), expected, `${kind}/${key}: only the selected local font changes`);
        await selectedTheme(page, kind); const actual = await checkFont(page, kind, key, value), delta = await pixelDifference(page, pixels, await previewPixels(page));
        assert(delta.changedFraction > .0001, `${kind}/${key}: changing the font changes actual rendered text`);
        if (key === 'body') assert((await page.locator('.font-sample').evaluate(el => getComputedStyle(el).fontFamily)).includes(catalog.fonts.find(f => f.id === value).family));
        evidence.push({ label: 'local font', kind, key, actual, delta });
      }
    }
    const beforeNavigation = await design(page);
    for (const kind of [...kinds].reverse()) { await view(page, kind); await shared(page); await selectedTheme(page, kind); await thumbnailMatches(page, 'soft-gradient'); assert.deepEqual(await design(page), beforeNavigation, 'Preview navigation does not alter any design'); }
    for (const [kind, layout] of [['title', 'split'], ['divider', 'band']]) {
      const special = customFixture(); special.slides[kind].layout = layout; special.roleStyles[kind].direction = 'down';
      await importDesign(page, special); await start(page); await view(page, kind); await shared(page);
      for (const pattern of ['plain', 'diagonal']) { await patternButton(page, pattern).click(); const actual = await thumbnailMatches(page, pattern); evidence.push({ label: 'special arrangement thumbnail', kind, layout, pattern, actual }); }
    }
  });

  await scenario('independent explicit shared scope preserves local fonts and textures', async ({ makePage }) => {
    const page = await makePage(), fixture = customFixture(); await importDesign(page, fixture); await start(page); await view(page, 'divider'); await shared(page);
    await page.locator('#colorRole').selectOption('dividerBackground'); await page.locator('#colorScope').selectOption('shared');
    await selectedTheme(page, 'divider'); await page.locator('#themeScope').selectOption('shared');
    await page.locator('#colorScope').selectOption('slide'); assert.equal(await page.locator('#themeScope').inputValue(), 'shared');
    const localBackground = await currentBackground(page), localHeading = await fontComputed(page, 'divider', 'heading'), localBody = await fontComputed(page, 'divider', 'body');
    for (const [field, value] of [['pattern', 'crosshatch'], ['headingFont', 'inter'], ['bodyFont', 'source-sans-3']]) {
      const before = await design(page); if (field === 'pattern') await patternButton(page, value).click(); else await page.locator('#font-' + (field === 'headingFont' ? 'heading' : 'body')).selectOption(value);
      const expected = structuredClone(before); if (field === 'pattern') expected.background = value; else expected.fonts[field === 'headingFont' ? 'heading' : 'body'] = value;
      assert.deepEqual(await design(page), expected, `Shared ${field} preserves every local record`); await selectedTheme(page, 'divider', 'shared');
      assert.deepEqual(await currentBackground(page), localBackground); assert.equal(await fontComputed(page, 'divider', 'heading'), localHeading); assert.equal(await fontComputed(page, 'divider', 'body'), localBody);
      assert.match(await page.locator(`[data-shared-scope="${field}"]`).textContent(), /custom.*unchanged/i);
    }
    const chosen = await design(page); await page.reload(); await ready(page); assert.deepEqual(await design(page), chosen); await selectedTheme(page, 'divider', 'shared'); assert.equal(await page.locator('#colorScope').inputValue(), 'slide');
    const sharedMini = await background(patternButton(page, 'crosshatch').locator('.pattern-mini'));
    assert.match(await page.locator('#patternScopeHelp').textContent(), /shared colors at Standard texture strength/);
    const inherited = structuredClone(chosen); delete inherited.roleStyles;
    await importDesign(page, inherited); await start(page); await view(page, 'divider'); await shared(page); await page.locator('#themeScope').selectOption('slide');
    await patternButton(page, 'crosshatch').click(); assert.deepEqual(await currentBackground(page), sharedMini, 'Shared thumbnail matches an actual slide using shared colors and standard texture strength');
    await checkFont(page, 'divider', 'heading', chosen.fonts.heading); await checkFont(page, 'divider', 'body', chosen.fonts.body);
    evidence.push({ label: 'explicit shared defaults', localOverridesPreserved: true, sharedMini, scopeReload: true, scopeIndependent: true });
  });

  await scenario('old-v2 navigation hidden body and phone keyboard accessibility', async ({ makePage }) => {
    const page = await makePage(390, 844), before = defaultDesign(catalog); delete before.roleStyles; await importDesign(page, before); await start(page);
    for (const kind of kinds) {
      await view(page, kind); await shared(page); await selectedTheme(page, kind);
      await page.locator('#themeScope').selectOption('shared'); await selectedTheme(page, kind, 'shared'); await page.locator('#themeScope').selectOption('slide');
      assert.deepEqual(await design(page), before, 'Old-v2 preview and scope navigation do not eagerly materialize role styles');
    }
    await view(page, 'video'); await shared(page); assert.match(await page.locator('#font-body-help').textContent(), /Shared.*hidden.*kept/s);
    await page.locator('#font-body').selectOption('source-sans-3');
    const expected = structuredClone(before); expected.startingPoint = 'custom'; expected.roleStyles = { video: { ...roleStyleDefaults(catalog, before, 'video'), bodyFont: 'source-sans-3' } };
    assert.deepEqual(await design(page), expected); assert.equal(await page.locator('#modelStage .slide-body').count(), 0, 'Changing a hidden font does not show text');
    assert.match(await page.locator('#font-body-help').textContent(), /Custom.*hidden.*kept/s);
    await page.locator('#stage-slides').click(); if (!await page.locator('#roleEditorTabs').isVisible()) await page.locator('#btnMoreOptions').click(); await page.locator('#editor-video').click();
    const text = page.locator('#section-video-text'); if (!await text.evaluate(el => el.open)) await text.locator(':scope > summary').click();
    await page.locator('#role-video-bodyVisible').check(); expected.roleStyles.video.bodyVisible = true; assert.deepEqual(await design(page), expected);
    await surface(page, 'preview'); await checkFont(page, 'video', 'body', 'source-sans-3'); await start(page);
    await page.locator('#themeScope').focus(); await page.keyboard.press(tabKey); assert.notEqual(await page.evaluate(() => document.activeElement.id), 'themeScope', 'Keyboard leaves the scope selector');
    await patternButton(page, 'diagonal').focus(); await page.keyboard.press('Space'); expected.roleStyles.video.pattern = 'diagonal'; assert.deepEqual(await design(page), expected);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'choice-background-pattern-diagonal', 'Keyboard texture activation retains focus after rerender');
    await selectedTheme(page, 'video'); await page.locator('#font-heading').focus(); await page.keyboard.press(tabKey); assert.notEqual(await page.evaluate(() => document.activeElement.id), 'font-heading');
    const heights = {};
    for (const selector of ['#themeScope', '#font-heading', '#font-body', '#choice-background-pattern-plain']) { const control = page.locator(selector); await control.scrollIntoViewIfNeeded(); heights[selector] = (await control.boundingBox()).height; assert(heights[selector] >= 44, 'Phone native controls and texture choices retain 44px targets'); }
    await page.locator('#themeScope').scrollIntoViewIfNeeded(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const source = await fs.readFile(path.resolve(import.meta.dirname, '../node_modules/axe-core/axe.min.js'), 'utf8'); await page.addScriptTag({ content: source });
    const scan = await page.evaluate(async () => { const r = await axe.run({ exclude: [['#modelStage'], ['.button-color-sample']] }); return { violations: r.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), region: r.passes.some(v => v.id === 'region') }; });
    assert.deepEqual(scan.violations, []); assert(scan.region);
    if (output) { await page.screenshot({ path: path.join(output, browserName + '-phone-theme-scope.png') }); await patternButton(page, 'plain').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, browserName + '-phone-textures.png') }); }
    evidence.push({ label: 'phone old-v2 hidden font', heights, scan, hiddenValueRestored: true, keyboardFocusRetained: true });
  });
} finally {
  await browser.close();
  if (output) await fs.writeFile(path.join(output, browserName + '-effective-theme.json'), JSON.stringify({ browser: browserName, passed, failures, errors, external, requests, evidence }, null, 2));
}
assert.deepEqual(errors, [], 'No browser runtime errors'); assert.deepEqual(external, [], 'No external requests');
assert(!requests.some(r => ['send', 'status'].includes(r.action)), 'No submission/status calls');
assert(passed + failures.length > 0, 'BESPOKE_THEME_SCENARIO did not match a scenario');
console.log(`${browserName}: ${passed} effective theme groups passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
