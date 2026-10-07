#!/usr/bin/env node
// Shared-model regression checks: no account, service, deployment or teacher data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPreset, colorAvailability, contrast, contrastIssues, cssForDesign, defaultDesign, designSchema, inkFor, migrateV1, patternFor, renderSlide, roleOptions, setSidebarText, sidebarInk, structuralErrors, validateDesign } from '../bespoke/builder-model.mjs';
import { compareDesign } from '../bespoke/similarity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/builder-catalog.json'), 'utf8'));
const fingerprints = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/lesson-fingerprints.json'), 'utf8'));
const oldCatalog = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/catalog.json'), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
let checked = 0;
function check(name, callback) { callback(); checked++; console.log(`PASS ${name}`); }

check('all 11 original palette colors and 12 existing families have local font assets', () => {
  assert.equal(catalog.palette.length, 11);
  assert.equal(catalog.fonts.length, 12);
  for (const pair of oldCatalog.fontPairings) for (const role of ['heading', 'body']) assert(catalog.fonts.some(font => font.family === pair[role]));
  for (const font of catalog.fonts) for (const source of font.sources) assert(fs.existsSync(path.join(root, 'fonts', source.file)), source.file);
  for (const color of catalog.palette) assert(contrast(color.hex, catalog.palette.find(c => c.id === inkFor(catalog, color.id)).hex) >= 4.5);
});

check('default and nine editable brand presets are valid and independent copies', () => {
  assert.deepEqual(validateDesign(catalog, defaultDesign(catalog)), []);
  assert.deepEqual(contrastIssues(catalog, defaultDesign(catalog)), []);
  for (const item of catalog.presets) {
    const design = applyPreset(catalog, item.id);
    assert.deepEqual(validateDesign(catalog, design), [], item.id);
    assert.deepEqual(contrastIssues(catalog, design), [], item.id);
    design.roles.sidebar = 'mauve';
    design.slides.cards.count = '1';
    assert.deepEqual(item.design, applyPreset(catalog, item.id));
  }
});

check('nine presets differ from each other and from the released lessons', () => {
  assert.deepEqual(catalog.presets.map(item => item.id), ['professional', 'modern', 'serious', 'light-hearted', 'fun', 'outspoken', 'open-air', 'gold-standard', 'slate']);
  const fields = d => [d.roles.titleBackground, d.roles.sidebar, d.roles.heading, d.fonts.heading, d.fonts.body, d.background, d.slides.title.layout, d.slides.divider.layout, d.slides.cards.count, d.slides.cards.look, d.slides.cards.layout, d.slides.video.layout, d.slides.activity.layout];
  const designs = catalog.presets.map(item => item.design);
  for (const [i, a] of designs.entries()) for (const b of designs.slice(i + 1)) {
    const different = fields(a).filter((value, k) => value !== fields(b)[k]).length;
    assert(different >= 7, `${a.startingPoint} and ${b.startingPoint} differ on only ${different} of 13 fields`);
  }
  assert.equal(new Set(designs.map(d => `${d.roles.titleBackground}+${d.roles.titleText}`)).size, 9, 'title background and title text pairs are unique');
  for (const item of catalog.presets) {
    assert.deepEqual(contrastIssues(catalog, item.design), [], item.id);
    const ranked = compareDesign(fingerprints, item.design, catalog);
    const near = ranked[0];
    const exact = ranked.find(result => result.shared === result.total);
    assert.equal(exact, undefined, `${item.id} is an exact match for ${exact?.title}`);
    console.log(`  ${item.id}: closest lesson ${near.title}, ${near.shared} of ${near.total}`);
  }
});

check('independent edits and preset changes preserve sample text and unrelated choices', () => {
  const design = applyPreset(catalog, 'professional');
  const before = clone(design);
  design.fonts.heading = 'inter';
  assert.equal(design.fonts.body, before.fonts.body);
  assert.deepEqual(design.roles, before.roles);
  assert.deepEqual(design.slides, before.slides);
  design.samples.boxes[3] = 'A recoverable fourth box.';
  design.slides.cards.count = '1';
  const reopened = JSON.parse(JSON.stringify(design));
  reopened.slides.cards.count = '4';
  assert.equal(reopened.samples.boxes[3], 'A recoverable fourth box.');
  assert.deepEqual(applyPreset(catalog, 'fun', reopened).samples, reopened.samples);
});

check('every role offers the full palette; a surface change warns without mutating other choices', () => {
  const design = defaultDesign(catalog);
  for (const role of catalog.roles) {
    assert.equal(roleOptions(catalog, design, role.id).length, 11);
    for (const color of catalog.palette) {
      assert.equal(colorAvailability(catalog, design, role.id, color.id).ok, true, `${role.id}/${color.id}`);
      assert.deepEqual(validateDesign(catalog, { ...design, roles: { ...design.roles, [role.id]: color.id } }), []);
    }
  }
  const white = colorAvailability(catalog, design, 'titleBackground', 'light');
  assert.equal(white.ok, true);
  assert(white.warnings.length);
  assert.equal(design.roles.titleText, 'light');
  const candidate = clone(design);
  candidate.roles.titleBackground = 'light';
  assert.deepEqual(structuralErrors(catalog, candidate), []);
  assert.deepEqual(validateDesign(catalog, candidate), []);
  assert(contrastIssues(catalog, candidate).some(issue => issue.message.includes('Title & divider headings')));
  assert.doesNotThrow(() => renderSlide(catalog, candidate, 'title'));
  assert.doesNotThrow(() => cssForDesign(catalog, candidate));
  candidate.roles.titleBackgroundEnd = 'light';
  candidate.roles.titleText = 'royal';
  candidate.roles.subtitle = 'royal';
  candidate.roles.dividerBackground = 'light';
  assert.deepEqual(validateDesign(catalog, candidate), []);
});

check('contrast guidance explains low contrast without prohibiting any brand text color', () => {
  const design = defaultDesign(catalog);
  for (const id of ['gold', 'accent']) {
    const choice = colorAvailability(catalog, design, 'body', id);
    assert.equal(choice.ok, true); assert.equal(choice.reason, '');
    assert(choice.warnings.some(message => message.includes('below the 4.5:1 guideline')));
  }
  assert.equal(colorAvailability(catalog, design, 'body', 'light').ok, true);
  assert.equal(colorAvailability(catalog, design, 'body', 'royal').ok, true);
  assert.equal(colorAvailability(catalog, design, 'sidebar', 'gold').ok, true);
  const invalid = clone(design);
  invalid.roles.subtitle = 'light'; invalid.roles.titleBackgroundEnd = 'light';
  assert.deepEqual(validateDesign(catalog, invalid), []);
  assert(contrastIssues(catalog, invalid).some(issue => issue.role === 'subtitle'));
  invalid.slides.title.colors = 'solid'; invalid.slides.title.layout = 'left';
  assert.deepEqual(contrastIssues(catalog, invalid), []);
});

check('White on Mauve-to-Green reports the measured gradient guideline and remains valid', () => {
  const design = defaultDesign(catalog);
  Object.assign(design.roles, { titleBackground: 'mauve', titleBackgroundEnd: 'accent', titleText: 'light' });
  design.background = 'plain'; design.slides.title.colors = 'gradient';
  const issue = contrastIssues(catalog, design).find(issue => issue.role === 'titleText' && issue.surface === 'titleBackground');
  assert.equal(issue.minimum, 3); assert.equal(issue.ratio.toFixed(2), '2.66');
  assert.match(issue.message, /Mauve to Green.*2.66:1.*3:1 guideline/);
  assert.deepEqual(validateDesign(catalog, design), []);
  assert.equal(design.roles.titleText, 'light');
});

check('divider contrast checks selected text on solid and gradient backgrounds without repairing the draft', () => {
  const design = defaultDesign(catalog);
  for (const background of ['accent', 'light']) {
    design.roles.dividerBackground = background;
    const before = JSON.stringify(design);
    const issues = contrastIssues(catalog, design).filter(issue => issue.surface === 'dividerBackground');
    assert.deepEqual(issues.map(issue => issue.role), ['titleText', 'subtitle']);
    assert(issues.every(issue => issue.message.includes('chapter divider background')));
    assert.deepEqual(structuralErrors(catalog, design), []);
    assert.equal(colorAvailability(catalog, design, 'dividerBackground', background).ok, true);
    assert.doesNotThrow(() => cssForDesign(catalog, design));
    assert.equal(JSON.stringify(design), before);
  }
  design.roles.dividerBackground = 'dark';
  assert.deepEqual(validateDesign(catalog, design), []);
  design.slides.divider.colors = 'gradient';
  design.roles.titleBackgroundEnd = 'light';
  const issues = contrastIssues(catalog, design).filter(issue => issue.surface === 'dividerBackground');
  assert.equal(issues.length, 2);
  assert(issues.every(issue => issue.related.includes('titleBackgroundEnd')));
});

check('patterns retain roles and cover their rendered ink in title/divider contrast', () => {
  const design = defaultDesign(catalog);
  design.roles.titleBackground = design.roles.titleBackgroundEnd = design.roles.dividerBackground = 'primary';
  design.slides.title.colors = design.slides.divider.colors = 'solid';
  for (const pattern of catalog.backgrounds) {
    design.background = pattern.id;
    const before = JSON.stringify(design);
    assert.deepEqual(contrastIssues(catalog, design), [], 'White on Blue stays readable through adaptive decorative ink.');
    if (pattern.id !== 'plain') assert.equal(patternFor(catalog, design, 'dividerBackground').ink, '#00133f');
    assert.equal(JSON.stringify(design), before);
  }
  design.roles.dividerBackground = 'accent';
  assert(contrastIssues(catalog, design).some(issue => issue.surface === 'dividerBackground' && issue.related.includes('background')));
  assert.equal(design.roles.titleText, 'light'); assert.equal(design.roles.subtitle, 'light');
});

check('every current font works independently in both roles', () => {
  const design = defaultDesign(catalog);
  for (const font of catalog.fonts) for (const role of ['heading', 'body']) {
    const copy = clone(design); copy.fonts[role] = font.id;
    assert.deepEqual(validateDesign(catalog, copy), []);
    assert(cssForDesign(catalog, copy).includes(`--font-${role}: "${font.family}"`));
  }
});

check('1–4 boxes, title toggle and treatments drive markup without losing hidden copy', () => {
  const design = defaultDesign(catalog);
  design.samples.boxes = ['First\nSecond', 'Two', 'Three', 'Four'];
  for (const count of ['1', '2', '3', '4']) for (const titleBar of [true, false]) for (const treatment of ['paragraph', 'bullets', 'numbered']) {
    Object.assign(design.slides.cards, { count, titleBar, treatment });
    const html = renderSlide(catalog, design, 'cards');
    assert.equal((html.match(/class="slide-card bespoke-box"/g) || []).length, Number(count));
    assert.equal(html.includes('bespoke-title-bar'), titleBar);
    assert.equal(html.includes('<ul class="slide-body"'), treatment === 'bullets');
    assert.equal(html.includes('<ol class="slide-body"'), treatment === 'numbered');
    assert.deepEqual(design.samples.boxes, ['First\nSecond', 'Two', 'Three', 'Four']);
  }
});

check('untrusted sample copy is escaped and malformed saved designs are rejected', () => {
  const design = defaultDesign(catalog);
  design.samples.title = '<img src=x onerror="alert(1)">';
  design.samples.boxes[0] = '</p><script>bad()</script>';
  assert(!renderSlide(catalog, design, 'title').includes('<img'));
  assert(!renderSlide(catalog, design, 'cards').includes('<script'));
  for (const bad of [null, [], { ...design, injected: true }, { ...design, roles: null }, { ...design, slides: {} }, { ...design, samples: { ...design.samples, boxes: ['only one'] } }, { ...design, fonts: { heading: 'Franklin Gothic Book', body: 'outfit' } }]) assert(validateDesign(catalog, bad).length);
  const invalidCount = clone(design); invalidCount.slides.cards.count = 4;
  assert(structuralErrors(catalog, invalidCount).length);
  assert.throws(() => cssForDesign(catalog, design, { fontBase: 'https://example.org' }));
  assert.equal(designSchema(catalog).additionalProperties, false);
});

check('all decision values produce a serializable model and shared styles', () => {
  for (const group of catalog.slideGroups) for (const decision of group.decisions) for (const option of decision.options) {
    const design = defaultDesign(catalog);
    design.slides[group.id][decision.id] = option.id;
    assert.deepEqual(structuralErrors(catalog, JSON.parse(JSON.stringify(design))), []);
    assert(renderSlide(catalog, design, group.id).includes(`data-kind="${group.id}"`));
    assert(cssForDesign(catalog, design).includes('--role-body:'));
  }
  const css = cssForDesign(catalog, defaultDesign(catalog), { canonical: false });
  assert(!css.includes(', body {'));
  const canonical = cssForDesign(catalog, defaultDesign(catalog));
  for (const selector of ['.slide-title', '.sidebar', '.slide-section', '.card', '.activity-box', '.video-container']) assert(canonical.includes(selector));
});

check('v1 migration preserves independent fonts and sample copy and discloses approximations', () => {
  const old = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
  const original = JSON.stringify(old);
  const { design, warnings } = migrateV1(old, catalog, oldCatalog);
  assert.equal(design.fonts.heading, 'dm-serif-display');
  assert.equal(design.fonts.body, 'outfit');
  assert.equal(design.samples.title, old.lesson.displayTitle);
  assert.equal(design.samples.subtitle, old.lesson.subtitle);
  assert.equal(design.samples.boxes[0], old.sampleContent.bullets);
  assert.equal(design.samples.boxes[1], old.sampleContent.mythReality);
  assert(warnings.some(warning => warning.includes('chapter')));
  assert(warnings.some(warning => warning.includes('approximated')));
  assert.equal(JSON.stringify(old), original);
  assert.deepEqual(structuralErrors(catalog, design), []);
});

check('sidebar text is optional, automatic by default and advisory when hard to read', () => {
  const design = defaultDesign(catalog);
  const auto = inkFor(catalog, design.roles.sidebar);
  assert.equal(Object.hasOwn(design.roles, 'sidebarText'), false);
  assert.equal(sidebarInk(catalog, design), auto);
  assert(cssForDesign(catalog, design).includes(`--role-sidebar-ink: var(--${auto});`));

  const gold = setSidebarText(catalog, design, 'gold');
  assert.equal(Object.hasOwn(design.roles, 'sidebarText'), false, 'the input design is not changed');
  assert.deepEqual(validateDesign(catalog, gold), []);
  assert.equal(sidebarInk(catalog, gold), 'gold');
  assert(cssForDesign(catalog, gold).includes('--role-sidebar-ink: var(--gold);'));
  assert.deepEqual(contrastIssues(catalog, gold).filter(issue => issue.role === 'sidebarText'), []);

  const invisible = setSidebarText(catalog, design, design.roles.sidebar);
  assert.deepEqual(validateDesign(catalog, invisible), [], 'a hard-to-read choice stays valid');
  const issue = contrastIssues(catalog, invisible).find(item => item.role === 'sidebarText');
  assert.equal(issue.minimum, 4.5);
  assert(issue.ratio < 4.5);
  assert.deepEqual(issue.related, ['sidebarText', 'sidebar']);

  assert.deepEqual(setSidebarText(catalog, gold, 'auto'), design, 'Automatic removes the field');
  assert.throws(() => setSidebarText(catalog, design, 'teal'), /Unknown brand color/);
  assert.match(structuralErrors(catalog, { ...design, roles: { ...design.roles, sidebarText: 'teal' } }).join(' '), /Sidebar text: choose a brand color/);
  const roles = designSchema(catalog).properties.roles;
  assert.equal(roles.required.includes('sidebarText'), false);
  assert.deepEqual(roles.properties.sidebarText.enum, catalog.palette.map(color => color.id));
});

console.log(`BeSpoke builder model: ${checked} checks passed.`);
