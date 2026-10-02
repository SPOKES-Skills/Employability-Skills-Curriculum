# BeSpoke Start Flow, Step Path and Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Team Leader fills a two-field intake form, picks scratch or preset, and either walks twelve one-decision screens or picks one of nine distinct presets, with the preview clickable throughout.

**Architecture:** The Guide me engine in `bespoke/guide/` keeps its one-question-per-screen loop and gets a new twelve-step question list. A new `bespoke/start.mjs` owns the Start stage. Sidebar text color is one optional field on the saved design, and the nine presets are generated into the catalog from one compact table. Two pull requests: PR 1 carries everything that changes the saved-design format, PR 2 carries the flow.

**Tech Stack:** Static ES modules, no build step. Node 22 for tests (`node:test`, Playwright, axe-core). Netlify function for shared Save, Open and Send.

**Spec:** `docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md`

## Global Constraints

- The saved format stays `bespoke-selection/v2`. No migration. Every design the old service accepted stays valid.
- All eleven brand colors stay selectable for every element. No swatch is ever disabled. Contrast is advice only.
- The Netlify service is redeployed before PR 1 merges. Claude stages it, Britt runs the deploy. The deploy command and post-deploy checks are in Claude's auto-memory `bespoke-netlify-deploy`. Never write the site ID, team links or secrets into the repo.
- No new file above 800 lines. After PR 2, `bespoke/builder-app.mjs` is no longer than 1,852 lines.
- No file nested more than 3 levels below the repo root.
- Screens in the step path show no role names, color codes or CSS terms. `FORBIDDEN` in `bespoke/guide/copy.mjs` enforces this.
- The builder says Team Leader, not Spokesperson. Saved field names (`team.spokesperson.name`) do not change.
- Fonts stay self-hosted. No external origins.
- Commit subjects use `feat|fix|refactor|docs|test|chore: `. No attribution trailers.
- Prose docs carry no em dashes.
- Never mutate a design passed into a function. Return a new one.

## Review Focus

1. A design saved before this work (no `sidebarText`, an old preset id) opens and renders exactly as before. Pinned in Task 1 and Task 2.
2. A leader picks a sidebar text color equal to the sidebar color. The design stays valid and saveable, and an advisory appears. Pinned in Task 1.
3. A browser draft holds an old Guide me position. The design opens intact with no path in progress and no error. Pinned in Task 6 and Task 7.
4. A Team Leader name of only spaces. Continue stays disabled. Pinned in Task 8.
5. A view-only session opens Start. No intake gate, no Start over, no path controls, and nothing is written. Pinned in Task 8.

## Facts this plan relies on

- `catalog.roles` has eleven required roles and is iterated in the model, the app, the schema generator and three tests. This plan leaves that list alone and adds `catalog.optionalRoles`, so those loops stay untouched.
- `scripts/generate-selection-v2-schema.mjs` writes the schema when run without `--check`.
- `bespoke/builder-catalog.json` round-trips through `JSON.stringify(value, null, 2) + '\n'`.
- All six current presets use `catalog.defaults.samples` as their sample words.
- `scripts/bespoke-write-submission.py` already falls back to the leader's name when the team name is empty.
- Browser tests run a loopback dev server in local preview mode, which is an editing session. Dialogs are auto-accepted.
- Guide state is `ui.guide` in the app, saved in the browser draft under `guide`.

## File structure

| File | Responsibility | PR |
|---|---|---|
| `bespoke/builder-catalog.json` | Adds `optionalRoles`; `presets` becomes nine | 1 |
| `bespoke/builder-model.mjs` | `sidebarInk`, `setSidebarText`, optional role in validation, schema, CSS, advisory | 1 |
| `scripts/generate-selection-v2-schema.mjs` | Optional role in the generated schema | 1 |
| `scripts/build-bespoke-presets.mjs` (new) | The preset table and its generator, with `--check` | 1 |
| `bespoke/preview-editor.mjs` | Sidebar element (PR 1); path clicks and Back to step (PR 2) | 1, 2 |
| `bespoke/guide/questions.mjs` | The twelve-step list and position functions | 2 |
| `bespoke/guide/answers.mjs` | Options, current value, apply, title ink rule, recap | 2 |
| `bespoke/guide/copy.mjs` | Step titles and prompts | 2 |
| `bespoke/guide/screens.mjs` | Step strip, option grids, count control, recap | 2 |
| `bespoke/guide/guide.mjs` | Actions and the host contract | 2 |
| `bespoke/guide/preview-map.mjs` (new) | Preview element to step id, pure | 2 |
| `bespoke/thumbs.mjs` (new) | Rendered slide thumbnails, shared by path and gallery | 2 |
| `bespoke/start.mjs` (new) | Start stage: team, choice, presets, returning | 2 |
| `bespoke/builder-app.mjs` | Wiring only. Loses `renderWelcome` and `renderTeam` | 1, 2 |

---

# Part 1: PR 1, format changes

### Task 1: Optional sidebar text color in the model

**Files:**
- Modify: `bespoke/builder-catalog.json` (after the `roles` array)
- Modify: `bespoke/builder-model.mjs:21-28, 151-166, 176-180, 270-289, 380-384`
- Test: `scripts/test-bespoke-builder-model.mjs`

**Interfaces:**
- Produces: `sidebarInk(catalog, design) -> colorId`, `setSidebarText(catalog, design, colorId | 'auto') -> design`. A contrast issue shaped `{ role: 'sidebarText', surface: 'sidebar', ratio, minimum: 4.5, related: ['sidebarText', 'sidebar'], message }`.

- [ ] **Step 1: Write the failing test**

In `scripts/test-bespoke-builder-model.mjs`, add `setSidebarText, sidebarInk` to the import from `../bespoke/builder-model.mjs`. Add this check before the final `console.log`:

```js
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node scripts/test-bespoke-builder-model.mjs`
Expected: FAIL with `does not provide an export named 'setSidebarText'`.

- [ ] **Step 3: Add the optional role to the catalog**

In `bespoke/builder-catalog.json`, insert this key directly after the closing `]` of `"roles"`:

```json
  "optionalRoles": [
    {
      "id": "sidebarText",
      "label": "Sidebar text",
      "note": "Chapter names and links in the sidebar. Automatic picks White or Royal, whichever reads better on the sidebar color.",
      "kind": "text"
    }
  ],
```

In the `sidebar` role's `note`, replace `Its text color is chosen for you.` with `Its text color is Automatic unless you choose one.`

- [ ] **Step 4: Implement in the model**

In `bespoke/builder-model.mjs`, after `inkFor` (line 28):

```js
const optionalRoles = catalog => catalog.optionalRoles || [];

/** Sidebar text is Automatic unless the design names a color. */
export function sidebarInk(catalog, design) {
  return design.roles.sidebarText || inkFor(catalog, design.roles.sidebar);
}

export function setSidebarText(catalog, design, colorId) {
  if (colorId !== 'auto' && !findColor(catalog, colorId)) throw new Error(`Unknown brand color: ${colorId}`);
  const { sidebarText, ...roles } = design.roles;
  return { ...clone(design), roles: colorId === 'auto' ? roles : { ...roles, sidebarText: colorId } };
}
```

In `designSchema`, directly before `schema.properties.roleStyles=roleStylesSchema(catalog);`:

```js
  // Added after record() computed `required`, so these stay optional.
  for (const role of optionalRoles(catalog)) schema.properties.roles.properties[role.id] = enumeration(catalog.palette.map(color => color.id));
```

In `structuralErrors`, replace the `design.roles` block (lines 178-180) with:

```js
  const optional = optionalRoles(catalog).map(role => role.id);
  if (keys(design.roles, [...catalog.roles.map(role => role.id), ...optional], 'Colors', optional)) {
    for (const role of catalog.roles) if (!findColor(catalog, design.roles[role.id])) errors.push(`${role.label}: choose a brand color.`);
    for (const role of optionalRoles(catalog)) if (own(design.roles, role.id) && !findColor(catalog, design.roles[role.id])) errors.push(`${role.label}: choose a brand color.`);
  }
```

In `contrastIssues`, directly before the `for(const kind of Object.keys(design.roleStyles||{}))` line:

```js
  if (design.roles.sidebarText) {
    const fg = color('sidebarText'), bg = color('sidebar'), ratio = contrast(fg.hex, bg.hex);
    if (ratio + 1e-9 < 4.5) issues.push({ role: 'sidebarText', surface: 'sidebar', ratio, minimum: 4.5, related: ['sidebarText', 'sidebar'], message: `Sidebar text: ${fg.name} on the sidebar (${bg.name}) is ${ratio.toFixed(1)} to 1. Aim for 4.5 to 1.` });
  }
```

In `cssForDesign`, replace the `if (role.ink)` line inside the roles loop with:

```js
    if (role.ink) vars.push(`--role-${kebab(role.id)}-ink: var(--${role.id === 'sidebar' ? sidebarInk(catalog, design) : inkFor(catalog, id)});`);
```

- [ ] **Step 5: Run the model tests**

Run: `node scripts/test-bespoke-builder-model.mjs && node scripts/test-bespoke-role-model.mjs && node scripts/test-bespoke-similarity.mjs`
Expected: all three exit 0. The new check prints `PASS sidebar text is optional, automatic by default and advisory when hard to read`.

- [ ] **Step 6: Commit**

```bash
git add bespoke/builder-catalog.json bespoke/builder-model.mjs scripts/test-bespoke-builder-model.mjs
git commit -m "feat: add an optional sidebar text color to the BeSpoke design model"
```

### Task 2: Schema and service accept the optional field

**Files:**
- Modify: `scripts/generate-selection-v2-schema.mjs:13`
- Regenerate: `bespoke/selection-v2.schema.json`
- Test: `scripts/test-bespoke-v2-contracts.mjs`

**Interfaces:**
- Consumes: `setSidebarText` from Task 1.
- Produces: a schema where `design.roles.sidebarText` is an optional color enum.

- [ ] **Step 1: Write the failing test**

In `scripts/test-bespoke-v2-contracts.mjs`, change the model import to `import { defaultDesign, applyPreset, setSidebarText } from '../bespoke/builder-model.mjs';` and add:

```js
test('the service accepts a design with or without a sidebar text color and rejects an unknown one', () => {
  const old = payload();
  assert.equal(Object.hasOwn(old.design.roles, 'sidebarText'), false);
  assert.deepEqual(selectionErrors(old, old.lesson.id), [], 'a design saved before this field stays valid');
  const chosen = payload();
  chosen.design = setSidebarText(catalog, chosen.design, 'gold');
  assert.deepEqual(selectionErrors(chosen, chosen.lesson.id), []);
  const unknown = payload();
  unknown.design.roles.sidebarText = 'teal';
  assert.notDeepEqual(selectionErrors(unknown, unknown.lesson.id), []);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test scripts/test-bespoke-v2-contracts.mjs`
Expected: FAIL. The first existing test reports `V2 schema is stale`, and the new test fails on the `gold` design because the committed schema has no `sidebarText`.

- [ ] **Step 3: Teach the generator the optional role**

In `scripts/generate-selection-v2-schema.mjs`, directly after the `const roles = object(...)` line:

```js
// Added after object() computed `required`, so optional roles stay optional.
for (const role of catalog.optionalRoles || []) roles.properties[role.id] = choice(catalog.colors.map(color => color.id));
```

- [ ] **Step 4: Regenerate and verify**

Run: `node scripts/generate-selection-v2-schema.mjs && node scripts/generate-selection-v2-schema.mjs --check && git diff --stat bespoke/selection-v2.schema.json`
Expected: exit 0, and the schema diff adds one `sidebarText` property under `design.roles` and nothing else. If anything else changed, stop and read the diff.

- [ ] **Step 5: Run the contract, handoff and Python tests**

Run: `node --test scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-handoff.mjs && python3 -m unittest discover -s scripts -p 'test_bespoke*.py'`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-selection-v2-schema.mjs bespoke/selection-v2.schema.json scripts/test-bespoke-v2-contracts.mjs
git commit -m "feat: accept the optional sidebar text color in the BeSpoke schema and service"
```

### Task 3: Nine presets from one table

**Files:**
- Create: `scripts/build-bespoke-presets.mjs`
- Modify: `bespoke/builder-catalog.json` (the `presets` array, generated)
- Regenerate: `bespoke/selection-v2.schema.json`
- Modify: `scripts/quality.sh:25` (add the `--check` line)
- Test: `scripts/test-bespoke-builder-model.mjs`, `scripts/test-bespoke-v2-contracts.mjs`, `scripts/test-bespoke-builder-browser.mjs:194`

**Interfaces:**
- Produces: preset ids `professional`, `modern`, `serious`, `light-hearted`, `fun`, `outspoken`, `open-air`, `gold-standard`, `slate`. `buildPresets(catalog) -> preset[]` exported from the script.

- [ ] **Step 1: Write the failing tests**

In `scripts/test-bespoke-builder-model.mjs`, add `import { compareDesign } from '../bespoke/similarity.mjs';`, load the fingerprints next to the catalog:

```js
const fingerprints = JSON.parse(fs.readFileSync(path.join(root, 'bespoke/lesson-fingerprints.json'), 'utf8'));
```

Rename the check `'default and six editable brand presets are valid and independent copies'` to say `nine`, and add:

```js
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
    const near = compareDesign(fingerprints, item.design, catalog)[0];
    assert(near.shared < near.total, `${item.id} is an exact match for ${near.title}`);
    console.log(`  ${item.id}: closest lesson ${near.title}, ${near.shared} of ${near.total}`);
  }
});
```

In `scripts/test-bespoke-v2-contracts.mjs`, add:

```js
test('all nine preset ids are accepted as a starting point', () => {
  assert.equal(catalog.presets.length, 9);
  for (const id of ['open-air', 'gold-standard', 'slate']) {
    const selection = payload();
    selection.design = applyPreset(catalog, id);
    assert.equal(selection.design.startingPoint, id);
    assert.deepEqual(selectionErrors(selection, selection.lesson.id), [], id);
  }
});
```

In `scripts/test-bespoke-builder-browser.mjs:194`, change `6` to `9`.

- [ ] **Step 2: Run them and watch them fail**

Run: `node scripts/test-bespoke-builder-model.mjs; node --test scripts/test-bespoke-v2-contracts.mjs`
Expected: the model test fails on the id list, the contract test fails with `Unknown starting point: open-air`.

- [ ] **Step 3: Write the generator**

Create `scripts/build-bespoke-presets.mjs`:

```js
#!/usr/bin/env node
/** The nine starting looks, as one table. Writes them into the builder catalog; --check only compares. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'bespoke/builder-catalog.json');
const ROLES = ['sidebar', 'titleBackground', 'titleBackgroundEnd', 'titleText', 'subtitle', 'contentBackground', 'heading', 'body', 'accent', 'button', 'dividerBackground'];
const roles = (...ids) => Object.fromEntries(ROLES.map((role, index) => [role, ids[index]]));
const slides = (title, divider, cards, video, activity) => ({
  title: { layout: title[0], logo: title[1], colors: title[2] },
  divider: { layout: divider[0], watermark: divider[1], colors: divider[2] },
  cards: { count: cards[0], titleBar: cards[1], treatment: cards[2], look: cards[3], layout: cards[4] },
  video: { layout: video[0], frame: video[1], titleStyle: video[2] },
  activity: { layout: activity[0], labelStyle: activity[1] }
});

// roles(): sidebar, title background, second color, title text, subtitle, content background, heading, body, accent, button, divider background.
export const PRESETS = [
  { id: 'professional', label: 'Professional', blurb: 'Navy and serif headings with a quiet gold accent.',
    roles: roles('dark', 'dark', 'primary', 'light', 'light', 'light', 'dark', 'royal', 'muted-gold', 'dark', 'dark'), fonts: ['merriweather', 'inter'], background: 'plain',
    slides: slides(['left', 'corner', 'gradient'], ['left', 'show', 'solid'], ['3', true, 'paragraph', 'rail', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'modern', label: 'Modern', blurb: 'Bright blue, clean type and a split title.',
    roles: roles('royal', 'primary', 'royal', 'light', 'light', 'light', 'primary', 'royal', 'primary', 'primary', 'royal'), fonts: ['outfit', 'source-sans-3'], background: 'diagonal',
    slides: slides(['split', 'corner', 'gradient'], ['left', 'hide', 'gradient'], ['2', false, 'bullets', 'outline', 'columns'], ['side', 'plain', 'large'], ['banner', 'pill']) },
  { id: 'serious', label: 'Serious', blurb: 'Royal and gray with numbered chapters.',
    roles: roles('gray', 'royal', 'gray', 'light', 'light', 'light', 'royal', 'royal', 'gray', 'royal', 'gray'), fonts: ['bitter', 'fira-sans'], background: 'plain',
    slides: slides(['center', 'above', 'solid'], ['number', 'show', 'solid'], ['3', true, 'numbered', 'band', 'rows'], ['stacked', 'plain', 'caps'], ['box', 'heading']) },
  { id: 'light-hearted', label: 'Light-hearted', blurb: 'Green and friendly, with four boxes in a grid.',
    roles: roles('accent', 'accent', 'dark', 'royal', 'royal', 'light', 'dark', 'royal', 'accent', 'dark', 'accent'), fonts: ['crimson-pro', 'outfit'], background: 'dot-grid',
    slides: slides(['center', 'corner', 'solid'], ['center', 'show', 'solid'], ['4', false, 'paragraph', 'filled', 'grid'], ['stacked', 'accent', 'regular'], ['callout', 'pill']) },
  { id: 'fun', label: 'Fun', blurb: 'Gold up front with mauve accents.',
    roles: roles('mauve', 'gold', 'muted-gold', 'royal', 'royal', 'light', 'mauve', 'royal', 'mauve', 'mauve', 'gold'), fonts: ['raleway', 'work-sans'], background: 'crosshatch',
    slides: slides(['bottom', 'corner', 'gradient'], ['band', 'show', 'solid'], ['2', true, 'bullets', 'band', 'rows'], ['side', 'accent', 'large'], ['side', 'pill']) },
  { id: 'outspoken', label: 'Outspoken', blurb: 'Bold mauve with strong bands.',
    roles: roles('royal', 'mauve', 'royal', 'light', 'light', 'light', 'mauve', 'royal', 'royal', 'mauve', 'mauve'), fonts: ['work-sans', 'merriweather'], background: 'diagonal',
    slides: slides(['split', 'above', 'gradient'], ['band', 'show', 'solid'], ['3', false, 'numbered', 'band', 'columns'], ['banner', 'accent', 'caps'], ['banner', 'caps']) },
  { id: 'open-air', label: 'Open Air', blurb: 'Light and open, with navy text on white.',
    roles: roles('muted', 'light', 'muted', 'dark', 'gray', 'light', 'primary', 'royal', 'primary', 'primary', 'muted'), fonts: ['dm-serif-display', 'outfit'], background: 'soft-gradient',
    slides: slides(['center', 'above', 'gradient'], ['center', 'hide', 'solid'], ['3', true, 'paragraph', 'outline', 'grid'], ['banner', 'plain', 'regular'], ['box', 'caps']) },
  { id: 'gold-standard', label: 'Gold Standard', blurb: 'Royal with gold lettering and a classic serif.', sidebarText: 'gold',
    roles: roles('royal', 'royal', 'dark', 'gold', 'light', 'light', 'royal', 'royal', 'muted-gold', 'royal', 'royal'), fonts: ['playfair-display', 'inter'], background: 'plain',
    slides: slides(['center', 'above', 'gradient'], ['center', 'show', 'gradient'], ['2', true, 'paragraph', 'rail', 'columns'], ['stacked', 'accent', 'large'], ['callout', 'heading']) },
  { id: 'slate', label: 'Slate', blurb: 'Cool gray with green accents.',
    roles: roles('gray', 'gray', 'royal', 'light', 'light', 'muted', 'gray', 'royal', 'accent', 'gray', 'gray'), fonts: ['vollkorn', 'fira-sans'], background: 'dot-grid',
    slides: slides(['bottom', 'corner', 'solid'], ['band', 'hide', 'solid'], ['4', false, 'bullets', 'band', 'columns'], ['side', 'plain', 'caps'], ['side', 'heading']) }
];

export function buildPresets(catalog) {
  return PRESETS.map(item => ({
    id: item.id, label: item.label, blurb: item.blurb,
    design: {
      version: '2',
      roles: item.sidebarText ? { ...item.roles, sidebarText: item.sidebarText } : item.roles,
      fonts: { heading: item.fonts[0], body: item.fonts[1] },
      slides: item.slides, background: item.background,
      samples: structuredClone(catalog.defaults.samples),
      startingPoint: item.id
    }
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = fs.readFileSync(target, 'utf8');
  const catalog = JSON.parse(raw);
  const text = JSON.stringify({ ...catalog, presets: buildPresets(catalog) }, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (text !== raw) throw new Error('Catalog presets are stale; run node scripts/build-bespoke-presets.mjs');
  } else fs.writeFileSync(target, text);
}
```

- [ ] **Step 4: Generate the presets and the schema**

Run: `node scripts/build-bespoke-presets.mjs && node scripts/build-bespoke-presets.mjs --check && node scripts/generate-selection-v2-schema.mjs && git diff --stat`
Expected: the catalog diff touches only the `presets` array. The schema diff adds the three new ids wherever `startingPoint` is listed, and nothing else.

- [ ] **Step 5: Add the check to the quality gate**

In `scripts/quality.sh`, directly after the `node scripts/generate-selection-v2-schema.mjs --check` line, add:

```bash
node scripts/build-bespoke-presets.mjs --check
```

- [ ] **Step 6: Run the unit tests**

Run: `node scripts/test-bespoke-builder-model.mjs && node --test scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-guide.mjs`
Expected: all pass, and the model test prints the closest lesson for each of the nine presets.

- [ ] **Step 7: Run the browser tests and repair preset literals**

Run each and read the failures:

```bash
node scripts/test-bespoke-builder-browser.mjs
node scripts/test-bespoke-streamlined-workflow.mjs
node scripts/test-bespoke-guided-browser.mjs
node scripts/test-bespoke-visual-qa.mjs
node scripts/test-bespoke-role-browser.mjs
```

A test that fails because it hard-codes an old preset's value (a font, color or layout literal next to a `[data-preset="..."]` or `#preset-...` click) is repaired by reading the value from the catalog. Replace the literal with `catalog.presets.find(p => p.id === '<id>').design.<path>`. Do not change what the test checks. A failure of any other kind is a bug in Tasks 1 to 3: stop and fix the code.

Expected after repair: all five exit 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/build-bespoke-presets.mjs scripts/quality.sh bespoke/builder-catalog.json bespoke/selection-v2.schema.json scripts/test-bespoke-*.mjs
git commit -m "feat: grow BeSpoke to nine distinct presets generated from one table"
```

### Task 4: Sidebar and sidebar text are editable in the builder

**Files:**
- Modify: `bespoke/preview-editor.mjs` (scope text, toolbar branch, `add`, two new targets)
- Modify: `bespoke/builder-app.mjs:1474` (Shared theme control), `:1807` (`more` handler)
- Test: `scripts/test-bespoke-preview-editor.mjs`

**Interfaces:**
- Consumes: `setSidebarText` from Task 1.
- Produces: preview targets `sidebar` and `sidebar-text`. Toolbar selects `#context-sidebar-color` and `#context-sidebar-text`. Shared theme select `#sidebarTextColor`.

- [ ] **Step 1: Write the failing test**

In `scripts/test-bespoke-preview-editor.mjs`, add this check after the existing `guide` check:

```js
 await check('sidebar',async()=>{
  const {page,done}=await fresh(1440);
  await page.locator('#btnEditSlide').click();
  await page.locator('#previewTabs [data-view="cards"]').click();
  await page.locator('#modelStage .slide-sidebar .sample-sidebar-title').click();
  assert.equal(await page.locator('#selectedElement').inputValue(),'sidebar-text');
  assert.match(await page.locator('#editScope').textContent(),/shared by every content slide/);
  await page.locator('#context-sidebar-text').selectOption('gold');
  assert.equal((await current(page)).roles.sidebarText,'gold');
  assert.equal(await page.locator('#modelStage .sample-sidebar-title').evaluate(el=>getComputedStyle(el).color),'rgb(211, 178, 87)');
  await page.locator('#context-sidebar-color').selectOption('royal');
  assert.equal((await current(page)).roles.sidebar,'royal');
  await page.locator('#context-sidebar-text').selectOption('royal');
  assert.equal((await current(page)).roles.sidebarText,'royal','a hard-to-read choice is kept');
  await page.locator('#stage-review').click();
  assert.match(await page.locator('#stepPanel').textContent(),/Sidebar text: .+ on the sidebar/,'Review lists the advisory');
  await page.locator('#stage-slides').click();
  await page.locator('#modelStage .slide-sidebar .sample-sidebar-title').click();
  await page.locator('#btnMoreOptions').click();
  await page.locator('#sidebarTextColor').selectOption('auto');
  assert.equal(Object.hasOwn((await current(page)).roles,'sidebarText'),false);
  await done();console.log('PASS sidebar color and sidebar text are editable from the preview and Shared theme');
 });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `BESPOKE_PREVIEW_WIDTHS='' node scripts/test-bespoke-preview-editor.mjs`
Expected: FAIL in `sidebar`: `#selectedElement` is `background`, not `sidebar-text`.

- [ ] **Step 3: Add the sidebar targets and toolbar fields**

In `bespoke/preview-editor.mjs`:

In `scope(kind,id)`, add as the first line after `const target=label(id);`:

```js
  if(id.startsWith('sidebar'))return `${target} selected · The sidebar is shared by every content slide.`;
```

In `renderToolbar`, change `if(selected.startsWith('heading')||selected.startsWith('body')){` to `else if(` and put this branch in front of it:

```js
  if(selected.startsWith('sidebar')){
   const palette=host.catalog.palette.map(c=>({id:c.id,label:c.name}));
   field('sidebar-color','Sidebar color',design.roles.sidebar,palette,v=>host.change('Sidebar color',d=>{d.roles.sidebar=v;}));
   field('sidebar-text','Sidebar text color',design.roles.sidebarText||'auto',[{id:'auto',label:'Automatic'},...palette],v=>host.change('Sidebar text color',d=>Object.assign(d,host.model.setSidebarText(host.catalog,d,v))));
  }else if(selected.startsWith('heading')||selected.startsWith('body')){
```

In `refresh`, in the `add` helper, change `node.matches('.bespoke-slide,.slide-card')` to `node.matches('.bespoke-slide,.slide-card,.slide-sidebar')`. After the `.slide-card` `forEach` line, add:

```js
  add('sidebar','Sidebar',stage.querySelector('.slide-sidebar'));
  add('sidebar-text','Sidebar text',stage.querySelector('.slide-sidebar .sample-sidebar-title'));
```

- [ ] **Step 4: Add the Shared theme control and the More options route**

In `bespoke/builder-app.mjs`, directly after the line `if(role.id==='button')panel.insertAdjacentHTML('beforeend',buttonColorSample('buttonColorInline'));`:

```js
 if(role.id==='sidebar'){
  const field=document.createElement('label');field.className='field';field.textContent='Sidebar text color';
  const select=document.createElement('select');select.id='sidebarTextColor';
  const auto=catalog.palette.find(c=>c.id===Model.inkFor(catalog,state.design.roles.sidebar)).name;
  for(const [id,name] of [['auto','Automatic · '+auto],...catalog.palette.map(c=>[c.id,c.name])]){const o=document.createElement('option');o.value=id;o.textContent=name;o.selected=id===(state.design.roles.sidebarText||'auto');select.append(o);}
  select.onchange=()=>changeDesign('Sidebar text: '+select.selectedOptions[0].textContent,d=>Object.assign(d,Model.setSidebarText(catalog,d,select.value)));
  field.append(select);panel.append(field);
 }
```

In `init`, replace the `more:target=>{...}` line of the `createPreviewEditor` call with:

```js
  more:target=>{ui.moreOptions=!ui.moreOptions;if(!ui.moreOptions){render(false);byId('btnMoreOptions').focus();return;}if(target.startsWith('sidebar')){ui.sharedThemeOpen=true;ui.activeRole='sidebar';ui.paintScope='shared';render(false);byId('colorRole')?.focus({preventScroll:true});return;}showRoleEditor(state.previewView,target==='background'?'background':target.startsWith('box')?'arrangement':'text',target.startsWith('body')?'bodyFont':target==='background'?'primary':'headingFont');},
```

- [ ] **Step 5: Run the preview editor test in both engines**

Run: `node scripts/test-bespoke-preview-editor.mjs && node scripts/test-bespoke-sidebar.mjs`
Expected: both exit 0, including `PASS sidebar color and sidebar text are editable from the preview and Shared theme`.

- [ ] **Step 6: Commit**

```bash
git add bespoke/preview-editor.mjs bespoke/builder-app.mjs scripts/test-bespoke-preview-editor.mjs
git commit -m "feat: edit sidebar color and sidebar text from the BeSpoke preview and Shared theme"
```

### Task 5: PR 1 docs, gate, service stage and pull request

**Files:**
- Modify: `docs/bespoke/decisions.md` (new section above "Current direction"), `docs/bespoke/builder-handoff.md`, `bespoke/README.md`

- [ ] **Step 1: Record the decisions**

Add this section at the top of `docs/bespoke/decisions.md`, under the H1:

```markdown
## Start flow, step path and presets: October 2, 2026

Britt approved the design in `docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md`. It replaces these earlier rows. Everything not listed here stands.

| Earlier decision | Now |
|---|---|
| Six presets (September 18) | Nine presets. Open Air, Gold Standard and Slate are new, and every preset is redesigned. `scripts/build-bespoke-presets.mjs` is the source. |
| Sidebar text color is chosen for you (September 24) | Optional choice saved as `design.roles.sidebarText`. Absent means Automatic. Advisory at 4.5 to 1. |
| Start is one page with Lesson & team, Build my own and six presets (September 24) | Two short screens, then scratch or preset. Ships in the second pull request. |
| Guide me walks slide by slide with four suggested colors (September 30) | Step by step walks twelve steps: colors, layout, fonts. Every color screen shows all eleven. Ships in the second pull request. |
| Guide me owns the preview while it runs (October 1) | A preview click opens the matching step or the preview editor. Ships in the second pull request. |

The saved format stays `bespoke-selection/v2`. The service is redeployed before the first pull request merges, because it bundles the schema and the catalog.
```

- [ ] **Step 2: Document the field for lesson builders**

In `docs/bespoke/builder-handoff.md`, in the section that lists the v2 design fields, add:

```markdown
- `design.roles.sidebarText` is optional. When present it is one of the eleven color ids and the generated CSS sets `--role-sidebar-ink` to it. When absent the model picks White or Royal for the sidebar text, as before. Do not add the field to a design that lacks it.
```

In `bespoke/README.md`, replace each mention of six presets with nine, and add one sentence under the color rules: `The sidebar text color is Automatic unless the Team Leader picks one.`

- [ ] **Step 3: Run the whole gate**

Run: `bash scripts/quality.sh`
Expected: exit code 0 and the last line `quality.sh: all checks passed`. Quote the tail of the output in the PR description.

- [ ] **Step 4: Check prose and line counts**

Run: `git diff origin/main -- docs/bespoke bespoke/README.md | grep '^+' | grep -c $'\xe2\x80\x94'; git diff --name-only origin/main | xargs wc -l | sort -n | tail -4`
Expected: `0` for the added lines, and no new file above 800 lines.

- [ ] **Step 5: Commit, push and open the PR**

```bash
git add docs/bespoke/decisions.md docs/bespoke/builder-handoff.md bespoke/README.md
git commit -m "docs: record the nine presets and the optional sidebar text color"
git push -u origin claude/bespoke-workflow-presets-fc20df
```

Open the PR with `gh pr create`. The description leads with the deploy order: service first, then merge. It carries a test plan with `- [ ]` items for the hosted checks.

- [ ] **Step 6: Stage the service and hand the deploy to Britt**

Run: `node scripts/bespoke-stage-service.mjs ~/bespoke-stages/2026-10-02-sidebar-text-$(git rev-parse --short HEAD)`
Expected: `Service-only deployment staged at ...`.

Give Britt the deploy command from auto-memory `bespoke-netlify-deploy`. After Britt deploys, run that memory's post-deploy checks and add the deploy id and results to the PR description. Britt reviews the nine presets in the local preview and merges.

---

# Part 2: PR 2, the flow

Start Part 2 from `origin/main` after PR 1 merges: `git fetch origin && git switch -c claude/bespoke-start-flow origin/main`.

### Task 6: The twelve-step list and its answers

**Files:**
- Rewrite: `bespoke/guide/questions.mjs`, `bespoke/guide/answers.mjs`, `bespoke/guide/copy.mjs`
- Create: `bespoke/guide/preview-map.mjs`
- Rewrite: `scripts/test-bespoke-guide.mjs`

**Interfaces:**
- Produces, from `questions.mjs`: `GROUPS`, `STEP_COUNT`, `buildQuestions()`, `byIdMap`, `startGuide(questions)`, `normalizeGuide(raw, all)`, `questionAt`, `guideMark`, `indexForMark`, `keepsGuide`, `advance`, `back`, `jumpToQuestion(guide, id)`, `markAnswered(guide, id)`, `stepsOf(guide, byId)`. Guide state is `{ ids, index, on, done, answered }`.
- Produces, from `answers.mjs`: `optionsFor(catalog, design, q) -> option[]`, `currentValue`, `applyAnswer`, `readableTitleInk`, `readabilityNote`, `boxCounts(catalog)`, `applyBoxCount(design, count)`, `recapLines`.
- Produces, from `copy.mjs`: `FORBIDDEN`, `questionCopy(q)`, `stepLabel(step)`.
- Produces, from `preview-map.mjs`: `stepForTarget(view, target) -> questionId | null`.
- Question ids: `color.primary`, `color.secondary`, `color.heading`, `color.body`, `color.sidebar`, `color.sidebarText`, `layout.title`, `layout.divider`, `layout.cards`, `layout.video`, `layout.activity`, `font.heading`, `font.body`, `recap`.

- [ ] **Step 1: Write the failing tests**

Replace `scripts/test-bespoke-guide.mjs` with:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as Model from '../bespoke/builder-model.mjs';
import { STEP_COUNT, advance, back, buildQuestions, byIdMap, guideMark, indexForMark, jumpToQuestion, keepsGuide, markAnswered, normalizeGuide, questionAt, startGuide, stepsOf } from '../bespoke/guide/questions.mjs';
import { applyAnswer, applyBoxCount, boxCounts, currentValue, optionsFor, readableTitleInk, readabilityNote, recapLines } from '../bespoke/guide/answers.mjs';
import { FORBIDDEN, questionCopy, stepLabel } from '../bespoke/guide/copy.mjs';
import { stepForTarget } from '../bespoke/guide/preview-map.mjs';

export const catalog = JSON.parse(fs.readFileSync(new URL('../bespoke/builder-catalog.json', import.meta.url), 'utf8'));
const all = buildQuestions();
const byId = byIdMap(all);
const fresh = () => Model.defaultDesign(catalog);
const IDS = ['color.primary', 'color.secondary', 'color.heading', 'color.body', 'color.sidebar', 'color.sidebarText', 'layout.title', 'layout.divider', 'layout.cards', 'layout.video', 'layout.activity', 'font.heading', 'font.body', 'recap'];

test('the path runs colors, layout, fonts, then a recap', () => {
  assert.deepEqual(all.map(q => q.id), IDS);
  assert.equal(STEP_COUNT, 12);
  assert.deepEqual(all.map(q => q.step), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, null]);
  assert.equal(new Set(IDS).size, IDS.length);
});

test('each color step sets the fields the spec names', () => {
  assert.deepEqual(byId.get('color.primary').roles, ['titleBackground', 'dividerBackground']);
  assert.deepEqual(byId.get('color.secondary').roles, ['titleBackgroundEnd', 'accent', 'button']);
  assert.deepEqual(byId.get('color.heading').roles, ['heading']);
  assert.deepEqual(byId.get('color.body').roles, ['body']);
  assert.deepEqual(byId.get('color.sidebar').roles, ['sidebar']);
});

test('start, advance and back walk the list, finish cleanly and never change their input', () => {
  let guide = startGuide(all);
  const frozen = JSON.stringify(guide);
  assert.equal(questionAt(guide, byId).id, 'color.primary');
  assert.equal(back(guide).index, 0);
  for (let i = 0; i < IDS.length - 1; i++) guide = advance(guide);
  assert.equal(questionAt(guide, byId).id, 'recap');
  const done = advance(guide);
  assert.equal(done.done, true);
  assert.equal(done.on, false);
  assert.equal(JSON.stringify(startGuide(all)), frozen);
});

test('any step opens from any other, including ones never visited', () => {
  const guide = jumpToQuestion(startGuide(all), 'font.body');
  assert.equal(questionAt(guide, byId).id, 'font.body');
  assert.equal(questionAt(jumpToQuestion(guide, 'color.secondary'), byId).id, 'color.secondary');
  assert.equal(jumpToQuestion(guide, 'no.such.step'), guide);
});

test('the strip lists twelve steps, marks the current one, and checks Fonts only when both fonts are answered', () => {
  let guide = jumpToQuestion(startGuide(all), 'font.body');
  let steps = stepsOf(guide, byId);
  assert.equal(steps.length, 12);
  assert.deepEqual(steps.map(s => s.step), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(steps.filter(s => s.current).map(s => s.step), [12]);
  assert.equal(steps[11].firstId, 'font.heading');
  guide = markAnswered(markAnswered(guide, 'font.heading'), 'color.primary');
  steps = stepsOf(guide, byId);
  assert.equal(steps[0].answered, true);
  assert.equal(steps[11].answered, false);
  assert.equal(stepsOf(markAnswered(guide, 'font.body'), byId)[11].answered, true);
  assert.equal(markAnswered(guide, 'color.primary'), guide, 'answering twice changes nothing');
  assert.deepEqual(stepsOf(jumpToQuestion(guide, 'recap'), byId).filter(s => s.current), []);
});

test('a saved position survives only for this exact step list', () => {
  const guide = { ...jumpToQuestion(startGuide(all), 'layout.cards'), answered: ['color.primary'] };
  assert.deepEqual(normalizeGuide(JSON.parse(JSON.stringify(guide)), all), guide);
  const oldGuideMe = { ids: ['team', 'preset', 'shared.fonts', 'title.layout'], index: 2, furthest: 3, on: true, done: false };
  assert.equal(normalizeGuide(oldGuideMe, all), null, 'an old Guide me position is dropped');
  assert.equal(normalizeGuide(null, all), null);
  assert.equal(normalizeGuide({ ids: 'x' }, all), null);
  assert.equal(normalizeGuide({ ...guide, index: 99 }, all).index, IDS.length - 1);
  assert.deepEqual(normalizeGuide({ ...guide, answered: ['bogus', 'color.body'] }, all).answered, ['color.body']);
});

test('an Undo mark names the question', () => {
  const guide = jumpToQuestion(startGuide(all), 'layout.cards');
  assert.equal(guideMark(guide), 'layout.cards');
  assert.equal(indexForMark(guide, 'layout.cards'), guide.index);
  assert.equal(indexForMark(guide, 'shared.fonts'), null);
  assert.equal(guideMark({ ...guide, on: false }), undefined);
});

test('the path survives only when neither the lesson nor the design changes', () => {
  const d = fresh();
  assert.equal(keepsGuide({ fromLesson: 'a', toLesson: 'a', fromDesign: d, toDesign: structuredClone(d) }), true);
  assert.equal(keepsGuide({ fromLesson: 'a', toLesson: 'b', fromDesign: d, toDesign: d }), false);
  assert.equal(keepsGuide({ fromLesson: 'a', toLesson: 'a', fromDesign: d, toDesign: { ...d, background: 'dot-grid' } }), false);
});

test('every option of every step yields a valid design, changes it when different, and never changes its input', () => {
  for (const q of all.filter(x => x.kind !== 'recap')) {
    const design = fresh(), before = JSON.stringify(design), current = currentValue(catalog, design, q);
    const options = optionsFor(catalog, design, q);
    assert(options.some(o => o.id === current), `${q.id} shows its current value`);
    for (const option of options) {
      const next = applyAnswer(catalog, design, q, option.id);
      assert.deepEqual(Model.validateDesign(catalog, next), [], `${q.id}/${option.id}`);
      assert.equal(JSON.stringify(design), before, `${q.id}/${option.id} left its input alone`);
      assert.equal(currentValue(catalog, next, q), option.id);
      if (option.id !== current) assert.notDeepEqual(next, design, `${q.id}/${option.id} changes the design`);
    }
  }
});

test('color steps offer all eleven colors; sidebar text adds Automatic first', () => {
  const palette = catalog.palette.map(c => c.id);
  for (const id of ['color.primary', 'color.secondary', 'color.heading', 'color.body', 'color.sidebar']) {
    assert.deepEqual(optionsFor(catalog, fresh(), byId.get(id)).map(o => o.id), palette, id);
  }
  assert.deepEqual(optionsFor(catalog, fresh(), byId.get('color.sidebarText')).map(o => o.id), ['auto', ...palette]);
  assert.equal(optionsFor(catalog, fresh(), byId.get('font.heading')).length, 12);
});

test('primary paints title and divider; secondary paints the blend, accents and buttons', () => {
  const a = applyAnswer(catalog, fresh(), byId.get('color.primary'), 'accent');
  assert.equal(a.roles.titleBackground, 'accent');
  assert.equal(a.roles.dividerBackground, 'accent');
  const b = applyAnswer(catalog, fresh(), byId.get('color.secondary'), 'gold');
  assert.deepEqual([b.roles.titleBackgroundEnd, b.roles.accent, b.roles.button], ['gold', 'gold', 'gold']);
  assert.equal(b.roles.heading, fresh().roles.heading, 'headings are their own step');
});

test('title text follows the readable ink until the leader picks one by hand', () => {
  const design = fresh();
  assert.equal(design.roles.titleText, readableTitleInk(catalog, design), 'the default counts as automatic');
  const gold = applyAnswer(catalog, design, byId.get('color.primary'), 'gold');
  assert.equal(gold.roles.titleText, readableTitleInk(catalog, gold));
  assert.equal(gold.roles.subtitle, readableTitleInk(catalog, gold));
  assert.notEqual(gold.roles.titleText, design.roles.titleText, 'gold needs dark text');
  const hand = { ...design, roles: { ...design.roles, titleText: 'gold' } };
  const kept = applyAnswer(catalog, hand, byId.get('color.primary'), 'accent');
  assert.equal(kept.roles.titleText, 'gold', 'a hand-picked color stays');
  assert.equal(kept.roles.subtitle, readableTitleInk(catalog, kept), 'the other role still follows');
});

test('text color notes agree with the model, and a hard-to-read choice stays valid', () => {
  for (const id of ['color.heading', 'color.body', 'color.sidebarText']) {
    const q = byId.get(id), role = id === 'color.sidebarText' ? 'sidebarText' : q.roles[0];
    for (const option of optionsFor(catalog, fresh(), q)) {
      const trial = applyAnswer(catalog, fresh(), q, option.id);
      const advised = Model.contrastIssues(catalog, trial).some(issue => issue.role === role);
      assert.equal(option.note.startsWith('Hard to read'), advised, `${id}/${option.id}`);
      assert.deepEqual(Model.validateDesign(catalog, trial), []);
    }
  }
  assert.equal(optionsFor(catalog, fresh(), byId.get('color.primary')).every(o => !o.note), true, 'background steps carry no note');
  assert.equal(readabilityNote(7, 4.5), 'Easy to read');
  assert.equal(readabilityNote(2.14, 4.5), 'Hard to read (2.1 to 1, aim for 4.5 to 1)');
});

test('sidebar text set to Automatic removes the saved field', () => {
  const q = byId.get('color.sidebarText');
  const gold = applyAnswer(catalog, fresh(), q, 'gold');
  assert.equal(gold.roles.sidebarText, 'gold');
  assert.equal(Object.hasOwn(applyAnswer(catalog, gold, q, 'auto').roles, 'sidebarText'), false);
});

test('the box count keeps all four sample lines', () => {
  assert.deepEqual(boxCounts(catalog), ['1', '2', '3', '4']);
  const design = fresh();
  const one = applyBoxCount(design, '1');
  assert.equal(one.slides.cards.count, '1');
  assert.deepEqual(one.samples.boxes, design.samples.boxes);
  assert.equal(design.slides.cards.count, fresh().slides.cards.count);
});

test('the recap names thirteen screens with their current choice', () => {
  const lines = recapLines(catalog, fresh(), all);
  assert.equal(lines.length, 13);
  assert.equal(lines[0].id, 'color.primary');
  assert.match(lines[0].text, /^Primary color: /);
  assert.match(lines[5].text, /^Sidebar text color: Automatic$/);
});

test('every screen has plain copy with no design jargon or color codes', () => {
  for (const q of all) {
    const copy = questionCopy(q);
    assert(copy.title.length > 2 && copy.prompt.length > 10, q.id);
    assert.doesNotMatch(`${copy.title} ${copy.prompt}`, FORBIDDEN, q.id);
    for (const option of q.kind === 'recap' ? [] : optionsFor(catalog, fresh(), q)) assert.doesNotMatch(`${option.label} ${option.detail || ''} ${option.note || ''}`, FORBIDDEN, `${q.id}/${option.id}`);
  }
  for (let step = 1; step <= 12; step++) assert.doesNotMatch(stepLabel(step), FORBIDDEN);
  assert.match('the headingColor role', FORBIDDEN);
  assert.match('#00133f', FORBIDDEN);
});

test('a preview click finds its step', () => {
  assert.equal(stepForTarget('title', 'background'), 'color.primary');
  assert.equal(stepForTarget('divider', 'background'), 'color.primary');
  assert.equal(stepForTarget('cards', 'sidebar'), 'color.sidebar');
  assert.equal(stepForTarget('video', 'sidebar-text'), 'color.sidebarText');
  assert.equal(stepForTarget('cards', 'heading-0'), 'color.heading');
  assert.equal(stepForTarget('activity', 'body-1'), 'color.body');
  assert.equal(stepForTarget('cards', 'box-2'), 'layout.cards');
  assert.equal(stepForTarget('cards', 'background'), null, 'the content background has no step');
  assert.equal(stepForTarget('title', 'heading-0'), null, 'title text opens the editor');
  assert.equal(stepForTarget('divider', 'body-0'), null);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test scripts/test-bespoke-guide.mjs`
Expected: FAIL with `does not provide an export named 'STEP_COUNT'`.

- [ ] **Step 3: Rewrite `bespoke/guide/questions.mjs`**

```js
export const GROUPS = Object.freeze([
  { id: 'colors', label: 'Colors' },
  { id: 'layout', label: 'Layout' },
  { id: 'fonts', label: 'Fonts' }
]);
export const STEP_COUNT = 12;
const SLIDES = ['title', 'divider', 'cards', 'video', 'activity'];

export function buildQuestions() {
  const color = (id, step, roles, view, extra = {}) => ({ id: `color.${id}`, step, group: 'colors', kind: 'color', roles, view, ...extra });
  return Object.freeze([
    color('primary', 1, ['titleBackground', 'dividerBackground'], 'title', { titleInk: true }),
    color('secondary', 2, ['titleBackgroundEnd', 'accent', 'button'], 'title', { titleInk: true }),
    color('heading', 3, ['heading'], 'cards', { text: true }),
    color('body', 4, ['body'], 'cards', { text: true }),
    color('sidebar', 5, ['sidebar'], 'cards'),
    { id: 'color.sidebarText', step: 6, group: 'colors', kind: 'sidebarText', text: true, view: 'cards' },
    ...SLIDES.map((slide, i) => ({ id: `layout.${slide}`, step: 7 + i, group: 'layout', kind: 'layout', slide, view: slide })),
    { id: 'font.heading', step: 12, group: 'fonts', kind: 'font', role: 'heading', view: 'title' },
    { id: 'font.body', step: 12, group: 'fonts', kind: 'font', role: 'body', view: 'cards' },
    { id: 'recap', step: null, group: null, kind: 'recap', view: 'title' }
  ].map(Object.freeze));
}

export const byIdMap = (questions) => new Map(questions.map((q) => [q.id, q]));

export const startGuide = (questions) => ({ ids: questions.map((q) => q.id), index: 0, on: true, done: false, answered: [] });

// A saved position only makes sense against this exact list, so an older Guide me list is dropped.
export function normalizeGuide(raw, allQuestions) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.ids)) return null;
  const ids = allQuestions.map((q) => q.id);
  if (raw.ids.length !== ids.length || raw.ids.some((id, i) => id !== ids[i])) return null;
  const index = Number.isInteger(raw.index) ? Math.min(Math.max(raw.index, 0), ids.length - 1) : 0;
  const answered = Array.isArray(raw.answered) ? ids.filter((id) => raw.answered.includes(id)) : [];
  return { ids, index, on: raw.on === true, done: raw.done === true, answered };
}

export const questionAt = (guide, byId) => byId.get(guide.ids[guide.index]);

// History marks the question by id, so Undo can return to it.
export const guideMark = (guide) => (guide?.on ? guide.ids[guide.index] : undefined);

export function indexForMark(guide, mark) {
  if (!guide) return null;
  const index = guide.ids.indexOf(mark);
  return index < 0 ? null : index;
}

// A path's answers describe one design; when the lesson or the design is replaced, they no longer apply.
export const keepsGuide = ({ fromLesson, toLesson, fromDesign, toDesign }) =>
  fromLesson === toLesson && JSON.stringify(fromDesign) === JSON.stringify(toDesign);

export function advance(guide) {
  if (guide.index >= guide.ids.length - 1) return { ...guide, on: false, done: true };
  return { ...guide, index: guide.index + 1 };
}

export const back = (guide) => ({ ...guide, index: Math.max(0, guide.index - 1) });

export function jumpToQuestion(guide, id) {
  const index = guide.ids.indexOf(id);
  return index < 0 ? guide : { ...guide, index };
}

export const markAnswered = (guide, id) => (guide.answered.includes(id) ? guide : { ...guide, answered: [...guide.answered, id] });

export function stepsOf(guide, byId) {
  const current = questionAt(guide, byId).step;
  const numbers = [...new Set(guide.ids.map((id) => byId.get(id).step).filter((step) => step !== null))];
  return numbers.map((step) => {
    const ids = guide.ids.filter((id) => byId.get(id).step === step);
    return { step, group: byId.get(ids[0]).group, firstId: ids[0], current: step === current, answered: ids.every((id) => guide.answered.includes(id)) };
  });
}
```

- [ ] **Step 4: Rewrite `bespoke/guide/copy.mjs`**

```js
export const FORBIDDEN = /\b([Rr]oles?|[Hh]ex|[Cc][Ss][Ss]|[Rr][Gg][Bb][Aa]?|[Tt]oken|[Ss]cope|[Ii]nherit|[Gg]radient stop)\b|#[0-9a-f]{3,6}\b|[a-z][A-Z][a-z]/;

const COPY = {
  'color.primary': ['Primary color', 'What is the main color of your lesson? It fills the title slide and chapter dividers.'],
  'color.secondary': ['Secondary color', 'What second color goes with it? It blends into the title slide and colors accents and buttons.'],
  'color.heading': ['Header text color', 'What color should slide headings be?'],
  'color.body': ['Body text color', 'What color should paragraphs and lists be?'],
  'color.sidebar': ['Sidebar color', 'What color should the lesson sidebar be?'],
  'color.sidebarText': ['Sidebar text color', 'What color should the words in the sidebar be?'],
  'layout.title': ['Title slide layout', 'Where should the title sit on the slide?'],
  'layout.divider': ['Chapter divider layout', 'How should chapter dividers be laid out?'],
  'layout.cards': ['Text boxes layout', 'How should the text boxes be arranged?'],
  'layout.video': ['Video slide layout', 'How should the video sit on the slide?'],
  'layout.activity': ['Activity layout', 'How should the activity box be laid out?'],
  'font.heading': ['Heading font', 'Which font should headings use?'],
  'font.body': ['Body font', 'Which font should paragraphs and lists use?'],
  recap: ['Your design', 'Here are your choices. Change any of them, or review and save.']
};
const STEPS = ['Primary color', 'Secondary color', 'Header text color', 'Body text color', 'Sidebar color', 'Sidebar text color',
  'Title slide layout', 'Chapter divider layout', 'Text boxes layout', 'Video slide layout', 'Activity layout', 'Fonts'];

export function questionCopy(q) {
  const copy = COPY[q.id];
  if (!copy) throw new Error(`No copy for question "${q.id}"`);
  return { title: copy[0], prompt: copy[1] };
}

export const stepLabel = (step) => STEPS[step - 1];
```

- [ ] **Step 5: Rewrite `bespoke/guide/answers.mjs`**

```js
import * as Model from '../builder-model.mjs';
import { questionCopy } from './copy.mjs';

const clone = (v) => structuredClone(v);
const color = (catalog, id) => catalog.palette.find((c) => c.id === id);
const decision = (catalog, slide, id) => catalog.slideGroups.find((g) => g.id === slide).decisions.find((d) => d.id === id);

export function readabilityNote(ratio, minimum) {
  if (!minimum) return '';
  return ratio + 1e-9 >= minimum ? 'Easy to read' : `Hard to read (${ratio.toFixed(1)} to 1, aim for ${minimum} to 1)`;
}

// White or Royal, whichever keeps the higher lowest contrast across the title and divider colors.
export function readableTitleInk(catalog, design) {
  const hex = (id) => color(catalog, id).hex;
  const { title, divider } = design.slides;
  const blended = title.colors === 'gradient' || title.layout === 'split' || divider.colors === 'gradient';
  const surfaces = [design.roles.titleBackground, design.roles.dividerBackground, ...(blended ? [design.roles.titleBackgroundEnd] : [])];
  const lowest = (ink) => Math.min(...surfaces.map((surface) => Model.contrast(hex(ink), hex(surface))));
  return lowest('light') >= lowest('royal') ? 'light' : 'royal';
}

export function currentValue(catalog, design, q) {
  switch (q.kind) {
    case 'color': return design.roles[q.roles[0]];
    case 'sidebarText': return design.roles.sidebarText || 'auto';
    case 'layout': return design.slides[q.slide].layout;
    case 'font': return design.fonts[q.role];
    default: return '';
  }
}

export function applyAnswer(catalog, design, q, id) {
  switch (q.kind) {
    case 'color': {
      const roles = { ...design.roles, ...Object.fromEntries(q.roles.map((role) => [role, id])) };
      const next = { ...clone(design), roles };
      if (!q.titleInk) return next;
      // Title text follows the readable ink only while it still holds the previous readable ink.
      const before = readableTitleInk(catalog, design), after = readableTitleInk(catalog, next);
      const followed = Object.fromEntries(['titleText', 'subtitle'].filter((role) => design.roles[role] === before).map((role) => [role, after]));
      return { ...next, roles: { ...roles, ...followed } };
    }
    case 'sidebarText': return Model.setSidebarText(catalog, design, id);
    case 'layout': return { ...clone(design), slides: { ...clone(design.slides), [q.slide]: { ...design.slides[q.slide], layout: id } } };
    case 'font': return { ...clone(design), fonts: { ...design.fonts, [q.role]: id } };
    default: throw new Error(`Question "${q.id}" has no answers`);
  }
}

// The model's own advisory decides, so the note never disagrees with the preview.
function textNote(catalog, design, q, id) {
  const role = q.kind === 'sidebarText' ? 'sidebarText' : q.roles[0];
  const issues = Model.contrastIssues(catalog, applyAnswer(catalog, design, q, id)).filter((issue) => issue.role === role);
  if (!issues.length) return 'Easy to read';
  const worst = issues.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  return readabilityNote(worst.ratio, worst.minimum);
}

export function optionsFor(catalog, design, q) {
  const swatch = (c) => ({ id: c.id, label: c.name, hex: c.hex, note: q.text ? textNote(catalog, design, q, c.id) : '' });
  switch (q.kind) {
    case 'color': return catalog.palette.map(swatch);
    case 'sidebarText': {
      const auto = color(catalog, Model.inkFor(catalog, design.roles.sidebar));
      return [{ id: 'auto', label: 'Automatic', detail: auto.name, hex: auto.hex, note: 'Easy to read' }, ...catalog.palette.map(swatch)];
    }
    case 'layout': return decision(catalog, q.slide, 'layout').options.map((o) => ({ id: o.id, label: o.label }));
    case 'font': return catalog.fonts.map((f) => ({ id: f.id, label: f.label, family: `"${f.family}", ${f.fallback}` }));
    default: return [];
  }
}

export const boxCounts = (catalog) => decision(catalog, 'cards', 'count').options.map((o) => String(o.id));

export const applyBoxCount = (design, count) => ({ ...clone(design), slides: { ...clone(design.slides), cards: { ...design.slides.cards, count: String(count) } } });

export function recapLines(catalog, design, questions) {
  return questions.filter((q) => q.kind !== 'recap').map((q) => {
    const value = currentValue(catalog, design, q);
    const hit = optionsFor(catalog, design, q).find((o) => o.id === value);
    return { id: q.id, text: `${questionCopy(q).title}: ${hit ? hit.label : 'Custom'}` };
  });
}
```

- [ ] **Step 6: Create `bespoke/guide/preview-map.mjs`**

```js
/** Which step, if any, owns a clicked preview element. Slide kind and target id in, question id out. */
const CONTENT = ['cards', 'video', 'activity'];

export function stepForTarget(view, target) {
  if (target === 'sidebar') return 'color.sidebar';
  if (target === 'sidebar-text') return 'color.sidebarText';
  if (target === 'background') return CONTENT.includes(view) ? null : 'color.primary';
  if (!CONTENT.includes(view)) return null;
  if (target.startsWith('heading')) return 'color.heading';
  if (target.startsWith('body')) return 'color.body';
  if (target.startsWith('box')) return 'layout.cards';
  return null;
}
```

- [ ] **Step 7: Run the unit tests**

Run: `node --test scripts/test-bespoke-guide.mjs`
Expected: 18 tests pass.

- [ ] **Step 8: Commit**

The screens still import the old names, so the builder page is broken until Task 7. Commit the pair of tasks together at the end of Task 7. Do not commit here.

### Task 7: Screens, the guide controller and the app host

**Files:**
- Create: `bespoke/thumbs.mjs`
- Rewrite: `bespoke/guide/screens.mjs`, `bespoke/guide/guide.mjs`
- Modify: `bespoke/guide.css`
- Modify: `bespoke/builder-app.mjs` (`guideHost`, `restoreStep` line 1228, the Start entry copy)
- Modify: `scripts/bespoke-test-navigation.mjs` (add `startPath`)
- Rewrite: `scripts/test-bespoke-guided-browser.mjs` (scenarios only; keep the harness, lines 1-56)

**Interfaces:**
- Consumes: everything Task 6 produces.
- Produces: `slideThumb({ Model, catalog, design, view, options }) -> span`, `fitThumbnails(panel)`, `THUMB_WIDTH` from `bespoke/thumbs.mjs`. `createGuide(host)` returning `{ allQuestions, normalize, start, resume, resumeLabel, jumpFromPreview, render }`. Host contract: `catalog`, `design`, `slideOptions(design)`, `getGuide()`, `setGuide(next)`, `change(label, edit)`, `preview(trial)`, `setView(view)`, `rerender()`, `openGuide()`, `finish()`, `exitToEditor(view)`, `announce(text)`, `appendScope(el, key)`, `hasCustom(key)`.
- DOM ids: `#btnGuideBack`, `#btnGuideNext`, `#btnGuideExit`, `#guide-choice-<id>`, `#guide-count-<n>`, `#guideStepMenu`, `.guide-section[data-step]`, `.guide-count`.

- [ ] **Step 1: Write the failing browser scenarios**

In `scripts/bespoke-test-navigation.mjs`, add:

```js
// The one way tests enter the step path. Task 8 changes the clicks; callers do not change.
export async function startPath(page) {
  await page.locator('#stage-start').click();
  await page.locator('#btnGuideMe').click();
  await page.locator('.guide-count').waitFor();
}
```

In `scripts/test-bespoke-guided-browser.mjs`, keep lines 1-56 (imports, `scenario`, `draft`, `design`, `heading`, `count`), add `import { startPath } from './bespoke-test-navigation.mjs';`, delete everything from `async function startGuide` to the end, and append:

```js
const TITLES = ['Primary color', 'Secondary color', 'Header text color', 'Body text color', 'Sidebar color', 'Sidebar text color', 'Title slide layout', 'Chapter divider layout', 'Text boxes layout', 'Video slide layout', 'Activity layout', 'Heading font', 'Body font'];
const pick = (page, id) => page.locator(`#guide-choice-${id}`).click();
const next = (page) => page.locator('#btnGuideNext').click();

await scenario('from scratch walks twelve steps and every choice lands in the saved design', async ({ makePage }) => {
  const page = await makePage();
  await startPath(page);
  const picks = ['accent', 'gold', 'dark', 'gray', 'royal', 'gold', 'center', 'band', 'rows', 'side', 'banner', 'bitter', 'inter'];
  for (const [i, title] of TITLES.entries()) {
    assert.equal(await heading(page), title);
    assert.match(await count(page), new RegExp(`^Step ${Math.min(i + 1, 12)} of 12`));
    await pick(page, picks[i]);
    assert.equal(await page.locator(`#guide-choice-${picks[i]}`).getAttribute('aria-pressed'), 'true');
    await next(page);
  }
  assert.equal(await heading(page), 'Your design');
  assert.equal(await page.locator('.guide-recap li').count(), 13);
  const d = await design(page);
  assert.deepEqual([d.roles.titleBackground, d.roles.dividerBackground], ['accent', 'accent']);
  assert.deepEqual([d.roles.titleBackgroundEnd, d.roles.accent, d.roles.button], ['gold', 'gold', 'gold']);
  assert.deepEqual([d.roles.heading, d.roles.body, d.roles.sidebar, d.roles.sidebarText], ['dark', 'gray', 'royal', 'gold']);
  assert.deepEqual([d.slides.title.layout, d.slides.divider.layout, d.slides.cards.layout, d.slides.video.layout, d.slides.activity.layout], ['center', 'band', 'rows', 'side', 'banner']);
  assert.deepEqual(d.fonts, { heading: 'bitter', body: 'inter' });
  assert.deepEqual(Model.validateDesign(catalog, d), []);
  await next(page);
  assert.equal(await page.locator('#stage-review').getAttribute('aria-current'), 'step');
});

await scenario('any step opens from the strip, answered steps are checked, and a phone uses the menu', async ({ makePage }) => {
  const page = await makePage();
  await startPath(page);
  assert.equal(await page.locator('.guide-section').count(), 12);
  await page.locator('.guide-section[data-step="9"]').click();
  assert.equal(await heading(page), 'Text boxes layout');
  assert.equal(await page.locator('.guide-section[aria-current="step"]').getAttribute('data-step'), '9');
  await pick(page, 'grid');
  assert.equal(await page.locator('.guide-section[data-step="9"]').getAttribute('data-answered'), 'true');
  assert.equal(await page.locator('.guide-section[data-step="1"]').getAttribute('data-answered'), null);
  await page.locator('.guide-section[data-step="2"]').click();
  assert.equal(await heading(page), 'Secondary color');
  const phone = await makePage({ mobile: true });
  await startPath(phone);
  assert.equal(await phone.locator('.guide-section').first().isVisible(), false);
  await phone.locator('#guideStepMenu').selectOption('font.heading');
  assert.equal(await heading(phone), 'Heading font');
  assert.match(await count(phone), /^Step 12 of 12/);
});

await scenario('color steps show all eleven colors, none disabled, with advice on text colors only', async ({ makePage }) => {
  const page = await makePage();
  await startPath(page);
  assert.equal(await page.locator('.guide-sample').count(), 11);
  assert.equal(await page.locator('.guide-sample:disabled').count(), 0);
  assert.equal(await page.locator('.guide-note').count(), 0, 'a background step carries no readability note');
  await page.locator('.guide-section[data-step="3"]').click();
  assert.equal(await page.locator('.guide-sample').count(), 11);
  assert.equal(await page.locator('.guide-note').count(), 11);
  await pick(page, 'light');
  assert.equal((await design(page)).roles.heading, 'light', 'a hard-to-read color is still chosen');
  assert.match(await page.locator('#guide-choice-light .guide-note').innerText(), /^Hard to read/);
  await page.locator('.guide-section[data-step="6"]').click();
  assert.equal(await page.locator('.guide-sample').count(), 12);
  assert.equal(await page.locator('#guide-choice-auto').getAttribute('aria-pressed'), 'true');
});

await scenario('the text boxes layout step carries the box count, and pointing previews without choosing', async ({ makePage }) => {
  const page = await makePage();
  await startPath(page);
  await page.locator('.guide-section[data-step="9"]').click();
  await page.locator('#guide-count-4').click();
  assert.equal((await design(page)).slides.cards.count, '4');
  assert.equal(await page.locator('#guide-count-4').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#modelStage .slide-card').count(), 4);
  const before = await design(page);
  await page.locator('#guide-choice-rows').hover();
  assert.deepEqual(await design(page), before, 'pointing does not choose');
});

await scenario('undo returns to the step where the change was made, and the place survives leaving and reloading', async ({ makePage }) => {
  const page = await makePage();
  await startPath(page);
  await pick(page, 'accent');
  await next(page); await next(page);
  assert.equal(await heading(page), 'Header text color');
  await page.locator('#btnUndo').click();
  assert.equal(await heading(page), 'Primary color');
  assert.notEqual((await design(page)).roles.titleBackground, 'accent');
  await page.locator('.guide-section[data-step="8"]').click();
  await page.locator('#btnGuideExit').click();
  assert.equal(await page.locator('.guide-count').count(), 0);
  assert.equal(await page.locator('#workspace').getAttribute('data-editor'), 'true');
  await page.reload();
  await page.locator('#stepList button').first().waitFor();
  const guide = (await draft(page)).guide;
  assert.equal(guide.ids[guide.index], 'layout.divider');
  assert.equal(guide.on, false);
});

await scenario('an old Guide me position in the draft is dropped and the design is kept', async ({ makePage }) => {
  const seed = await makePage();
  await startPath(seed);
  await pick(seed, 'accent');
  const saved = await draft(seed);
  const state = await seed.context().storageState();
  for (const origin of state.origins) for (const item of origin.localStorage) {
    if (item.name === 'bespoke-draft-v2') item.value = JSON.stringify({ ...saved, guide: { ids: ['team', 'preset', 'shared.fonts'], index: 1, furthest: 2, on: true, done: false } });
  }
  const page = await makePage({ storageState: state });
  assert.equal(await page.locator('.guide-count').count(), 0, 'no path is in progress');
  assert.equal((await design(page)).roles.titleBackground, 'accent', 'the design is intact');
  assert.equal((await draft(page)).guide, null);
});

await scenario('no step shows design jargon, and color and layout screens pass axe', async ({ makePage }) => {
  const page = await makePage();
  await startPath(page);
  await page.addScriptTag({ content: axeSource });
  const jargon = /\b(roles?|hex|css|rgba?|token|inherit)\b|#[0-9a-f]{6}\b/i;
  for (let i = 0; i < TITLES.length; i++) {
    assert.doesNotMatch(await page.locator('#stepPanel').innerText(), jargon, TITLES[i]);
    if (i === 0 || i === 6 || i === 11) {
      const result = await page.evaluate(() => window.axe.run('#stepPanel', { runOnly: ['wcag2a', 'wcag2aa'] }));
      assert.deepEqual(result.violations.map(v => v.id), [], TITLES[i]);
    }
    await next(page);
  }
});

await browser.close();
if (pageErrors.length) failures.push({ name: 'page errors', message: pageErrors.join('\n') });
if (externalRequests.length) failures.push({ name: 'external requests', message: externalRequests.join('\n') });
if (failures.length) { for (const f of failures) console.error(`\n${f.name}\n${f.message}`); process.exit(1); }
console.log(`BeSpoke step path browser checks: ${passed} scenarios passed.`);
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node scripts/test-bespoke-guided-browser.mjs`
Expected: every scenario fails. The page reports an import error from `bespoke/guide/screens.mjs`.

- [ ] **Step 3: Create `bespoke/thumbs.mjs`**

Move the thumbnail code out of `screens.mjs`:

```js
/** A real slide drawn at a fixed 720 px width and scaled down to its cell. Inert: its buttons never become tab stops. */
export const THUMB_WIDTH = 720;
let serial = 0;

export function slideThumb({ Model, catalog, design, view, options }) {
  const id = `gt${(serial += 1)}`;
  const inner = document.createElement('span');
  inner.className = 'guide-thumb-inner';
  inner.innerHTML = Model.renderSlide(catalog, design, view, options).replace('class="bespoke-slide"', `class="bespoke-slide ${id}"`);
  const style = document.createElement('style');
  style.textContent = Model.cssForDesign(catalog, design, { scope: `.${id}`, fontBase: '../fonts', canonical: false });
  inner.prepend(style);
  const thumb = document.createElement('span');
  thumb.className = 'guide-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  thumb.inert = true;
  thumb.append(inner);
  return thumb;
}

// One observer for the current screen: it rescales a thumbnail whenever its cell changes width.
let observer = null;
const fit = (thumb) => thumb.style.setProperty('--s', String(thumb.clientWidth / THUMB_WIDTH));

export function fitThumbnails(panel) {
  observer?.disconnect();
  observer = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target)));
  panel.querySelectorAll('.guide-thumb').forEach((thumb) => { fit(thumb); observer.observe(thumb); });
}
```

- [ ] **Step 4: Rewrite `bespoke/guide/screens.mjs`**

```js
import { applyAnswer, boxCounts, currentValue, optionsFor, recapLines } from './answers.mjs';
import { questionCopy, stepLabel } from './copy.mjs';
import { GROUPS, STEP_COUNT, stepsOf } from './questions.mjs';
import { fitThumbnails, slideThumb } from '../thumbs.mjs';

export function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function strip(ctx) {
  const { guide, q, byId, actions } = ctx;
  const steps = stepsOf(guide, byId);
  const label = q.kind === 'recap' ? 'All twelve steps' : `Step ${q.step} of ${STEP_COUNT} · ${stepLabel(q.step)}`;
  const head = el('nav', { class: 'guide-head', 'aria-label': 'Steps' }, el('p', { class: 'guide-count' }, label));
  for (const group of GROUPS) {
    const list = el('ol', { class: 'guide-sections', 'aria-label': group.label });
    for (const s of steps.filter((x) => x.group === group.id)) {
      const b = el('button', { type: 'button', class: 'guide-section', 'data-step': s.step, 'data-answered': s.answered ? 'true' : false, 'aria-current': s.current ? 'step' : false },
        s.answered ? el('span', { 'aria-hidden': 'true' }, '✓ ') : null, stepLabel(s.step), s.answered ? el('span', { class: 'sr-only' }, ', answered') : null);
      b.addEventListener('click', () => actions.jump(s.firstId));
      list.append(el('li', {}, b));
    }
    head.append(el('div', { class: 'guide-group' }, el('span', { class: 'guide-group-name', 'aria-hidden': 'true' }, group.label), list));
  }
  // Phone width: the same twelve steps as one menu.
  const menu = el('select', { id: 'guideStepMenu', class: 'guide-step-menu', 'aria-label': 'Go to step' });
  for (const s of steps) menu.append(el('option', { value: s.firstId }, `${s.step}. ${stepLabel(s.step)}${s.answered ? ' ✓' : ''}`));
  menu.value = steps.find((s) => s.current)?.firstId || steps[0].firstId;
  menu.addEventListener('change', () => actions.jump(menu.value));
  head.append(menu);
  return head;
}

function face(ctx, option, trial) {
  const { q, catalog, host, Model } = ctx;
  if (q.kind === 'layout') return slideThumb({ Model, catalog, design: trial, view: q.view, options: host.slideOptions(trial) });
  if (q.kind === 'font') return el('span', { class: 'guide-font', style: `font-family:${option.family}`, 'aria-hidden': 'true' }, 'Aa Bb Cc');
  return el('span', { class: 'guide-swatch', style: `background:${option.hex}`, 'aria-hidden': 'true' });
}

function choiceButton(ctx, option, current) {
  const { host, actions, q, catalog } = ctx;
  const trial = applyAnswer(catalog, host.design, q, option.id);
  const b = el('button', { type: 'button', id: `guide-choice-${option.id}`, class: 'guide-sample' + (q.kind === 'layout' ? '' : ' guide-chip'), 'data-choice': option.id, 'aria-pressed': String(option.id === current) },
    face(ctx, option, trial),
    el('span', { class: 'guide-label' }, el('strong', {}, option.label),
      option.detail ? el('small', {}, option.detail) : null,
      option.note ? el('small', { class: 'guide-note' }, option.note) : null));
  b.addEventListener('click', () => actions.choose(option));
  b.addEventListener('pointerenter', () => host.preview(trial));
  b.addEventListener('focus', () => host.preview(trial));
  b.addEventListener('pointerleave', () => host.preview(null));
  b.addEventListener('blur', () => host.preview(null));
  return b;
}

// The font screens show every family in its own face, so all twelve are loaded here.
function fontFaces(catalog) {
  const style = document.createElement('style');
  style.textContent = catalog.fonts.flatMap((font) => font.sources.map((source) =>
    `@font-face{font-family:"${font.family}";src:url("../fonts/${source.file}") format("woff2");font-weight:${source.weight};font-style:normal;font-display:swap}`)).join('');
  return style;
}

function boxCount(ctx) {
  const { host, catalog, actions } = ctx;
  const current = String(host.design.slides.cards.count);
  const group = el('div', { class: 'guide-count-control', role: 'group', 'aria-label': 'Number of boxes' }, el('span', {}, 'Number of boxes'));
  for (const count of boxCounts(catalog)) {
    const b = el('button', { type: 'button', id: `guide-count-${count}`, class: 'guide-count-choice', 'aria-pressed': String(count === current) }, count);
    b.addEventListener('click', () => actions.setCount(count));
    group.append(b);
  }
  return group;
}

function questionBody(ctx) {
  const { host, q, catalog } = ctx;
  const copy = questionCopy(q);
  const current = currentValue(catalog, host.design, q);
  const grid = el('div', { class: 'guide-samples' + (q.kind === 'layout' ? '' : ' guide-swatches'), role: 'group', 'aria-label': `${copy.title} choices` });
  for (const option of optionsFor(catalog, host.design, q)) grid.append(choiceButton(ctx, option, current));
  const body = [el('h1', { tabindex: '-1' }, copy.title), el('p', { class: 'panel-lead' }, copy.prompt), grid];
  if (q.kind === 'font') body.push(fontFaces(catalog));
  if (q.id === 'layout.cards') body.push(boxCount(ctx));
  // A slide type with its own value keeps it; say so only when that is the case.
  const keys = q.kind === 'color' ? q.roles : q.kind === 'font' ? [`${q.role}Font`] : [];
  const custom = keys.filter((key) => host.hasCustom(key));
  if (custom.length) {
    const scope = el('div', { class: 'guide-scope' });
    custom.forEach((key) => host.appendScope(scope, key));
    body.push(scope);
  }
  return body;
}

function recapBody(ctx) {
  const { host, q, catalog, byId, guide, actions } = ctx;
  const copy = questionCopy(q);
  const list = el('ul', { class: 'guide-recap' });
  for (const line of recapLines(catalog, host.design, guide.ids.map((id) => byId.get(id)))) {
    const change = el('button', { type: 'button', class: 'text-link', 'data-change': line.id }, `Change ${line.text.split(':')[0].toLowerCase()}`);
    change.addEventListener('click', () => actions.jump(line.id));
    list.append(el('li', {}, line.text, ' ', change));
  }
  return [el('h1', { tabindex: '-1' }, copy.title), el('p', { class: 'panel-lead' }, copy.prompt), list];
}

function nav(ctx) {
  const { guide, q, actions } = ctx;
  const button = (id, cls, text, fn, disabled = false) => {
    const b = el('button', { type: 'button', id, class: cls, disabled }, text);
    b.addEventListener('click', fn);
    return b;
  };
  const recap = q.kind === 'recap';
  return el('div', { class: 'panel-nav guide-nav' },
    button('btnGuideBack', 'btn btn-secondary', 'Back', actions.back, guide.index === 0),
    button('btnGuideNext', 'btn btn-primary', recap ? 'Review & save' : 'Next', actions.next),
    button('btnGuideExit', 'text-link', recap ? 'Keep editing' : 'Leave step by step', actions.exit));
}

export function renderGuide(panel, ctx) {
  panel.replaceChildren(strip(ctx), ...(ctx.q.kind === 'recap' ? recapBody(ctx) : questionBody(ctx)), nav(ctx));
  fitThumbnails(panel);
}
```

- [ ] **Step 5: Rewrite `bespoke/guide/guide.mjs`**

```js
import * as Model from '../builder-model.mjs';
import { questionCopy, stepLabel } from './copy.mjs';
import { advance, back, buildQuestions, byIdMap, jumpToQuestion, markAnswered, normalizeGuide, questionAt, startGuide } from './questions.mjs';
import { applyAnswer, applyBoxCount } from './answers.mjs';
import { stepForTarget } from './preview-map.mjs';
import { renderGuide } from './screens.mjs';

export function createGuide(host) {
  const catalog = host.catalog;
  const all = buildQuestions();
  const byId = byIdMap(all);
  let lastIndex = -1;
  let focusHeading = false;

  const get = () => host.getGuide();
  const set = (guide) => host.setGuide(guide);
  const here = () => questionAt(get(), byId);
  const afterMove = (guide) => {
    set(guide);
    if (guide.done) host.finish();
    else host.rerender();
  };

  const actions = {
    next: () => afterMove(advance(get())),
    back: () => { focusHeading = true; afterMove(back(get())); },
    jump: (id) => { focusHeading = true; afterMove(jumpToQuestion(get(), id)); },
    exit: () => { const q = here(); set({ ...get(), on: false }); host.exitToEditor(q.view); },
    choose: (option) => {
      const q = here();
      set(markAnswered(get(), q.id));
      host.change(`${questionCopy(q).title}: ${option.label}`, (d) => Object.assign(d, applyAnswer(catalog, host.design, q, option.id)));
    },
    setCount: (count) => host.change(`Number of boxes: ${count}`, (d) => Object.assign(d, applyBoxCount(host.design, count)))
  };

  return {
    allQuestions: all,
    normalize: (raw) => normalizeGuide(raw, all),
    start() { lastIndex = -1; set(startGuide(all)); host.openGuide(); },
    resume() { lastIndex = -1; set({ ...get(), on: true }); host.openGuide(); },
    // The label for the way back, or null when no path is waiting.
    resumeLabel() {
      const guide = get();
      if (!guide || guide.on || guide.done) return null;
      const q = byId.get(guide.ids[guide.index]);
      return q.kind === 'recap' ? 'Back to your recap' : `Back to step ${q.step}: ${stepLabel(q.step)}`;
    },
    jumpFromPreview(view, target) {
      const id = stepForTarget(view, target);
      if (!id) return false;
      actions.jump(id);
      return true;
    },
    render(panel) {
      const guide = get();
      const q = byId.get(guide.ids[guide.index]);
      const moved = lastIndex !== guide.index;
      lastIndex = guide.index;
      // Show the step's own slide when the step changes; after that the leader may browse other slides.
      if (moved) host.setView(q.view);
      renderGuide(panel, { guide, q, byId, catalog, host, actions, Model });
      if (focusHeading) { focusHeading = false; panel.querySelector('h1')?.focus({ preventScroll: true }); }
      if (moved) setTimeout(() => host.announce(q.kind === 'recap' ? 'Your design: all twelve steps' : `Step ${q.step} of 12: ${questionCopy(q).title}`), 60);
    }
  };
}
```

- [ ] **Step 6: Update the styles**

In `bespoke/guide.css`, delete the three `.guide-entry` rules and the `.guide-more` rule, and append:

```css
.guide-group { display: flex; gap: 8px; align-items: center; margin-bottom: 6px }
.guide-group-name { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); min-width: 4.5em }
.guide-step-menu { display: none; width: 100%; min-height: 44px; font: inherit }
.guide-swatches { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)) }
.guide-label { display: flex; flex-direction: column; gap: 2px }
.guide-font { font-size: 1.5rem; line-height: 1.2; min-width: 5.5em }
.guide-count-control { display: flex; gap: 8px; align-items: center; margin-top: 8px }
.guide-count-choice { min-width: 44px; min-height: 44px; border: 2px solid var(--line); border-radius: 8px; background: #fff; font: inherit; color: var(--navy); cursor: pointer }
.guide-count-choice[aria-pressed="true"] { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue) }
.guide-count-choice:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px }
@media (max-width: 760px) { .guide-group { display: none } .guide-step-menu { display: block } }
```

- [ ] **Step 7: Update the app host**

In `bespoke/builder-app.mjs`:

- Line 6: keep the import, and change `restoreStep`'s last line to `ui.guide=normalizeGuide(saved.guide,buildQuestions());`.
- In `guideHost()`, delete `teamComplete`, `requestPreset`, `renderTeam` and `renderBoxSamples`. Add `hasCustom:key=>sharedBindings(key).some(([kind,field])=>savedRoleStyle(kind)[field]!=='inherit'),`. Replace `exitToEditor` with `exitToEditor:kind=>{ui.moreOptions=false;ui.editorRole=kind;state.previewView=kind;goStage('slides');},`.
- In `renderWelcome`, change the entry text to `<h2>Build it step by step</h2><p class="helper">Twelve short steps, one choice at a time: colors, then layout, then fonts. Leave whenever you like. Your choices are kept.</p>` and the button labels to `Step by step`, `Continue step by step` and `Start again`. Keep the ids `btnGuideMe`, `btnGuideContinue`, `btnGuideRestart`. Task 8 replaces this function.
- In `builderGuidance`, replace `Guide me` wording with `Step by step`.

- [ ] **Step 8: Run the unit and browser tests**

Run: `node --test scripts/test-bespoke-guide.mjs && node scripts/test-bespoke-guided-browser.mjs`
Expected: 18 unit tests pass and the output ends `BeSpoke step path browser checks: 7 scenarios passed.`

- [ ] **Step 9: Commit Tasks 6 and 7 together**

```bash
git add bespoke/guide bespoke/thumbs.mjs bespoke/guide.css bespoke/builder-app.mjs scripts/test-bespoke-guide.mjs scripts/test-bespoke-guided-browser.mjs scripts/bespoke-test-navigation.mjs
git commit -m "feat: replace Guide me with a twelve-step path through colors, layout and fonts"
```

### Task 8: The Start screens and the preset gallery

**Files:**
- Create: `bespoke/start.mjs`
- Modify: `bespoke/builder-app.mjs` (delete `renderTeam` lines 279-336 and `renderWelcome` lines 1375-1408; wire `start`; `applyPresetChoice`; `lockViewControls`; `goStage`)
- Modify: `bespoke/builder.css` (start cards, preset slides; remove `.custom-path` and `.getting-started`)
- Modify: `scripts/bespoke-test-navigation.mjs` (`startPath`, `teamForm`, `presetGallery`, `builderDestination`)
- Test: `scripts/test-bespoke-streamlined-workflow.mjs` (new scenario `start screens`)

**Interfaces:**
- Consumes: `slideThumb`, `fitThumbnails` from `bespoke/thumbs.mjs`; `el` from `bespoke/guide/screens.mjs`; `guide.start()`, `guide.resume()`.
- Produces: `createStart(host) -> { render(panel), reset() }`. Host contract: `catalog`, `Model`, `lessons`, `lessonId`, `leaderName`, `design`, `isLead()`, `lessonLocked()`, `meaningful()`, `pathWaiting()`, `setLeaderName(value)`, `setLesson(id)`, `startScratch()`, `stepByStep()`, `requestPreset(id)`, `goStage(id)`, `slideOptions(design)`, `closestLesson(design)`, `rerender()`.
- DOM ids: `#spokespersonName`, `#lessonSelect`, `#btnTeamContinue`, `#btnStartScratch`, `#btnStartPreset`, `#btnStartBack`, `#preset-<id>` with `data-preset`, `#btnContinueEditing`, `#btnStepByStep`, `#btnQuickReview`, `#btnChangeStartingLook`, `#btnEditTeam`. `#stepPanel[data-start-screen]` is `team`, `choice`, `presets` or `returning`.

- [ ] **Step 1: Write the failing scenario**

In `scripts/test-bespoke-streamlined-workflow.mjs`, add this scenario before `custom journey and effective review`:

```js
  await scenario('start screens', async ({ makePage }) => {
    const page = await makePage();
    const panel = page.locator('#stepPanel');
    assert.equal(await panel.getAttribute('data-start-screen'), 'team');
    assert.equal(await page.locator('#teamName').count(), 0, 'the team name field is gone');
    assert.equal(await page.locator('#spokespersonEmail').count(), 0, 'the email field is gone');
    assert.equal(await page.locator('label:has(#spokespersonName)').innerText().then(t => t.trim()), 'Team Leader name');
    assert.equal(await page.locator('#btnTeamContinue').isDisabled(), true);
    await page.locator('#spokespersonName').fill('   ');
    assert.equal(await page.locator('#btnTeamContinue').isDisabled(), true, 'spaces are not a name');
    await page.locator('#spokespersonName').fill('Sample Leader');
    await page.locator('#btnTeamContinue').click();
    assert.equal(await panel.getAttribute('data-start-screen'), 'choice');
    assert.equal(await panel.locator('button.start-card').count(), 2);
    assert.equal(await page.locator('#btnNext').count(), 0, 'Start has no shortcut past the choice');
    await page.locator('#btnStartPreset').click();
    assert.equal(await panel.getAttribute('data-start-screen'), 'presets');
    assert.equal(await page.locator('[data-preset]').count(), 9);
    assert.equal(await page.locator('[data-preset] .guide-thumb').count(), 18, 'two rendered slides per preset');
    assert.equal(await page.locator('[data-preset] button, [data-preset] a').count(), 0, 'thumbnails add no tab stops');
    await page.locator('#preset-slate').click();
    assert.equal((await design(page)).startingPoint, 'slate');
    assert.equal(await page.locator('#stage-slides').getAttribute('aria-current'), 'step', 'a preset opens Slide designs');
    assert.match(await page.locator('#fileStatus').innerText(), /Slate applied/);
    await page.locator('#stage-start').click();
    assert.equal(await panel.getAttribute('data-start-screen'), 'returning');
    assert.match(await panel.innerText(), /Sample Leader/);
    for (const id of ['btnContinueEditing', 'btnStepByStep', 'btnQuickReview', 'btnChangeStartingLook', 'btnEditTeam']) assert.equal(await page.locator('#' + id).isVisible(), true, id);
    await page.locator('#btnChangeStartingLook').click();
    await page.locator('#btnStartScratch').click();
    assert.equal(await page.locator('.guide-count').innerText().then(t => t.startsWith('Step 1 of 12')), true);
    assert.equal((await design(page)).startingPoint, 'custom', 'scratch replaced the preset after the confirmation');
    assert.equal((await draft(page)).spokespersonName, 'Sample Leader');
    assert.equal((await draft(page)).teamName, '', 'a new design saves an empty team name');
  });
```

A view-only session is reached with a snapshot link, and `scripts/test-bespoke-preview-editor.mjs` already opens one near line 149. In that block, replace `await view.locator('body[data-access=view]').waitFor();await view.locator('#stage-slides').click();` with:

```js
 await view.locator('body[data-access=view]').waitFor();
 await view.locator('#stage-start').click();
 assert.equal(await view.locator('#stepPanel').getAttribute('data-start-screen'),'returning','a viewer skips the intake form');
 for(const id of ['btnStepByStep','btnChangeStartingLook','btnEditTeam','spokespersonName','btnStartScratch'])assert.equal(await view.locator('#'+id).count(),0,id+' is not offered to a viewer');
 assert.equal(await view.locator('#btnContinueEditing').isVisible(),true);
 await view.locator('#stage-slides').click();
```

- [ ] **Step 2: Run it and watch it fail**

Run: `BESPOKE_STREAMLINED_SCENARIO='start screens' node scripts/test-bespoke-streamlined-workflow.mjs; BESPOKE_PREVIEW_WIDTHS='' node scripts/test-bespoke-preview-editor.mjs`
Expected: both FAIL: `data-start-screen` is `null`.

- [ ] **Step 3: Create `bespoke/start.mjs`**

```js
import { el } from './guide/screens.mjs';
import { fitThumbnails, slideThumb } from './thumbs.mjs';

/** The Start stage: team form, scratch-or-preset choice, preset gallery, and the returning-team view. */
export function createStart(host) {
  // null means "work it out"; once a screen is shown it stays until the leader moves on.
  let screen = null;
  let focusHeading = false;
  const go = (next) => { screen = next; focusHeading = true; host.rerender(); };
  const button = (id, cls, text, fn, disabled = false) => {
    const b = el('button', { type: 'button', id, class: cls, disabled }, text);
    b.addEventListener('click', fn);
    return b;
  };
  const heading = (title, lead) => [el('h1', { tabindex: '-1' }, title), el('p', { class: 'panel-lead' }, lead)];

  function teamScreen() {
    const name = el('input', { id: 'spokespersonName', type: 'text', autocomplete: 'name', required: true, maxlength: '200', placeholder: 'Your name' });
    name.value = host.leaderName;
    const lesson = el('select', { id: 'lessonSelect' });
    for (const item of host.lessons) lesson.append(el('option', { value: item.id }, item.note ? `${item.title} (${item.note})` : item.title));
    lesson.value = host.lessonId;
    if (host.lessonLocked()) {
      lesson.disabled = true;
      lesson.title = 'This private team link is set to its lesson team.';
    }
    const proceed = button('btnTeamContinue', 'btn btn-primary', 'Continue', () => go(host.meaningful() ? 'returning' : 'choice'), !host.leaderName.trim());
    name.addEventListener('input', () => { host.setLeaderName(name.value); proceed.disabled = !name.value.trim(); });
    lesson.addEventListener('change', () => host.setLesson(lesson.value));
    return [...heading('Your team', 'One Team Leader saves the team’s design choices.'),
      el('div', { class: 'field-grid two' }, el('label', { class: 'field' }, 'Team Leader name', name), el('label', { class: 'field' }, 'Lesson team', lesson)),
      el('div', { class: 'start-actions' }, proceed)];
  }

  function choiceScreen() {
    const card = (id, title, text, fn) => {
      const b = el('button', { type: 'button', id, class: 'start-card' }, el('strong', {}, title), el('span', {}, text));
      b.addEventListener('click', fn);
      return b;
    };
    return [...heading('How do you want to start?', 'Either way, every choice stays editable.'),
      el('div', { class: 'start-cards' },
        card('btnStartScratch', 'Start from scratch', 'Twelve short steps, one choice at a time: colors, then layout, then fonts.', () => host.startScratch()),
        card('btnStartPreset', 'Start from a preset', 'Pick one of nine finished looks, then change anything you like.', () => go('presets'))),
      button('btnStartBack', 'text-link', host.meaningful() ? 'Back' : 'Back to your team', () => go(host.meaningful() ? 'returning' : 'team'))];
  }

  function presetScreen() {
    const grid = el('div', { class: 'preset-grid' });
    for (const preset of host.catalog.presets) {
      const thumb = (view) => slideThumb({ Model: host.Model, catalog: host.catalog, design: preset.design, view, options: host.slideOptions(host.design) });
      const b = el('button', { type: 'button', id: `preset-${preset.id}`, class: 'preset-choice', 'data-preset': preset.id, 'aria-pressed': String(host.design.startingPoint === preset.id) },
        el('span', { class: 'preset-slides' }, thumb('title'), thumb('cards')),
        el('strong', {}, preset.label), el('span', {}, preset.blurb), el('small', {}, host.closestLesson(preset.design)));
      b.addEventListener('click', () => host.requestPreset(preset.id));
      grid.append(b);
    }
    return [...heading('Choose a preset', 'Each one is a finished design. You can change anything afterward.'), grid,
      button('btnStartBack', 'text-link', 'Back', () => go('choice'))];
  }

  function returningScreen() {
    const lesson = host.lessons.find((item) => item.id === host.lessonId)?.title || '';
    const lead = host.isLead();
    return [...heading('Continue your design', `${host.leaderName.trim() || 'Team Leader not named yet'} · ${lesson} team`),
      el('p', { class: 'helper' }, 'Your choices are kept. Click anything on a slide to change it.'),
      el('div', { class: 'start-actions' },
        button('btnContinueEditing', 'btn btn-secondary', 'Continue editing', () => host.goStage('slides')),
        lead ? button('btnStepByStep', 'btn btn-secondary', host.pathWaiting() ? 'Continue step by step' : 'Step by step', () => host.stepByStep()) : null,
        button('btnQuickReview', 'btn btn-primary', 'Review & save', () => host.goStage('review'))),
      lead ? el('div', { class: 'start-links' },
        button('btnChangeStartingLook', 'text-link', 'Start over', () => go('choice')),
        button('btnEditTeam', 'text-link', 'Edit team', () => go('team'))) : null];
  }

  return {
    reset() { screen = null; },
    render(panel) {
      if (!host.isLead()) screen = 'returning';
      else if (!screen) screen = host.meaningful() ? 'returning' : host.leaderName.trim() ? 'choice' : 'team';
      const body = { team: teamScreen, choice: choiceScreen, presets: presetScreen, returning: returningScreen }[screen]();
      panel.replaceChildren(...body.filter(Boolean));
      panel.dataset.startScreen = screen;
      fitThumbnails(panel);
      if (focusHeading) { focusHeading = false; panel.querySelector('h1')?.focus({ preventScroll: true }); }
    }
  };
}
```

- [ ] **Step 4: Wire it into the app**

In `bespoke/builder-app.mjs`:

1. Add `import { createStart } from './start.mjs';` and `let start = null;` beside `let guide = null;`.
2. Delete `renderTeam` (lines 279-336) and `renderWelcome` (lines 1375-1408).
3. Add this function where `renderWelcome` was:

```js
function startHost(){
 return {
  catalog,Model,
  get lessons(){return state.meta.lessons;},get lessonId(){return state.lessonId;},get leaderName(){return state.spokespersonName||'';},get design(){return state.design;},
  isLead:()=>isLeadSession(),
  lessonLocked:()=>Boolean(ui.teamSession)&&!ui.localPreview,
  meaningful:()=>ui.meaningfulDesign,
  pathWaiting:()=>Boolean(ui.guide&&!ui.guide.done),
  setLeaderName:value=>{state.spokespersonName=value;saveDraft();updatePreview();},
  setLesson:id=>{if(ui.teamSession&&!ui.localPreview)return;if(ui.localPreview){installTeamSession(id,'bespoke-local-preview-synthetic');ui.autosavePaused=true;}resetPresetConfirmation();state.lessonId=id;saveDraft();updatePreview();},
  startScratch:()=>{
   if(!isLeadSession())return;
   if(ui.meaningfulDesign){
    if(!confirm('Start from scratch? Your current look is replaced. Sample words stay, and Undo can restore it.'))return;
    const samples=clone(state.design.samples);recordChange('Started from scratch',clone(state.design));state.design={...Model.defaultDesign(catalog),samples};
   }
   ui.meaningfulDesign=true;start.reset();guide.start();
  },
  stepByStep:()=>{start.reset();if(ui.guide&&!ui.guide.done)guide.resume();else guide.start();},
  requestPreset:id=>requestPreset(id),
  goStage:id=>goStage(id),
  slideOptions:design=>({title:design.samples.title,subtitle:design.samples.subtitle,lessonTitle:state.meta.lessons.find(l=>l.id===state.lessonId)?.title,logoUrl:'../SPOKES-Logo.png'}),
  closestLesson:design=>{const near=compareDesign(fingerprints,design,catalog)[0];return near?`${near.shared} of ${near.total} comparable choices match ${near.title}`:'';},
  rerender:()=>render(false)
 };
}
```

4. In `init`, after `guide=createGuide(guideHost());` add `start=createStart(startHost());`.
5. In `renderPanel`, the first three lines become:

```js
 const panel=byId('stepPanel'),id=STEPS[state.step].id;
 if(id!=='start')delete panel.dataset.startScreen;
 if(id==='slides'&&ui.guide?.on){guide.render(panel);return;}
 // Start draws its own screens: no Shared theme and no Back or Continue bar under an intake form.
 if(id==='start'){start.render(panel);return;}
 if(id==='review')renderReview(panel);else renderEditors(panel);
```

6. Replace `goStage` with: `function goStage(id){if(ui.guide?.on&&id!=='slides')ui.guide={...ui.guide,on:false};start?.reset();state.step=stepIndex(id);render();}`
7. In `applyPresetChoice`, replace the last line with: `start?.reset();ui.moreOptions=false;state.step=stepIndex('slides');render();fileNotice(preset.label+' applied. Click anything on the slide to change it, or use Step by step on Start.');return true;`
8. In `finishPresetConfirmation`, the trailing `byId('preset-'+id)?.focus(...)` stays: it is a no-op once the gallery is gone.
9. In `resetDesignForLesson` and `applySelectionPayload`, add `start?.reset();` as the first statement.
10. In `lockViewControls`, replace `"btnBuildOwn","btnChangeStartingLook"` with nothing. The exempt list becomes `["btnBack","btnNext","btnNextRole","btnContinueEditing","btnQuickReview"]`.
11. In the cloud Send guard near line 865, change the message to `Add the Team Leader's name on Start before sending.`
12. In `builderGuidance`, rewrite step 1 to: `<strong>Start.</strong> Name the Team Leader and confirm the lesson team. Then start from scratch, one choice at a time, or pick one of nine presets.`
13. In `scripts/test-bespoke-guide.mjs`, add this test, which replaces the old source check for view-only sessions:

```js
test('an editing session is the only thing that saves path state, and Start offers a viewer no way in', () => {
  const app = fs.readFileSync(new URL('../bespoke/builder-app.mjs', import.meta.url), 'utf8');
  const startSource = fs.readFileSync(new URL('../bespoke/start.mjs', import.meta.url), 'utf8');
  assert.match(app, /setGuide:next=>\{ui\.guide=next;if\(isLeadSession\(\)\)saveDraft\(\);\}/);
  assert.match(startSource, /if \(!host\.isLead\(\)\) screen = 'returning';/);
  assert.doesNotMatch(app.slice(app.indexOf('function lockViewControls()'), app.indexOf('function fileNotice')), /btnGuide|guide-choice|btnStart/);
});
```

- [ ] **Step 5: Add the styles**

In `bespoke/builder.css`, delete the `.custom-path` rules (line 107) and the `.getting-started` rules (line 152), and append:

```css
.start-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:20px 0}
.start-card{display:flex;flex-direction:column;gap:8px;text-align:left;padding:20px;border:2px solid var(--line);border-radius:8px;background:#fff;color:var(--navy);font:inherit;cursor:pointer;min-height:44px}
.start-card strong{font-size:1.12rem;font-weight:500}
.start-card:hover{border-color:var(--blue)}
.start-card:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.start-links{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}
.preset-slides{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}
```

Remove the `.preset-sample` rules if nothing else uses them: `grep -n "preset-sample" bespoke/*.css bespoke/*.mjs`.

- [ ] **Step 6: Update the test navigation helper**

In `scripts/bespoke-test-navigation.mjs`, replace `startPath` and the `Start` branch of `builderDestination`, and add two helpers:

```js
// Start has four screens. These helpers reach one of them from any state, by clicking only.
export async function teamForm(page, name = 'Sample Instructor') {
  await page.locator('#stage-start').click();
  if (await page.locator('#btnEditTeam').isVisible()) await page.locator('#btnEditTeam').click();
  else if (await page.locator('#btnStartBack').isVisible() && !await page.locator('#spokespersonName').isVisible()) {
    while (!await page.locator('#spokespersonName').isVisible()) await page.locator('#btnStartBack').click();
  }
  if (name !== null) await page.locator('#spokespersonName').fill(name);
}

async function choiceScreen(page) {
  await page.locator('#stage-start').click();
  const screen = await page.locator('#stepPanel').getAttribute('data-start-screen');
  if (screen === 'team') {
    if (!(await page.locator('#spokespersonName').inputValue()).trim()) await page.locator('#spokespersonName').fill('Sample Instructor');
    await page.locator('#btnTeamContinue').click();
  }
  if (await page.locator('#btnChangeStartingLook').isVisible()) await page.locator('#btnChangeStartingLook').click();
  if (await page.locator('#stepPanel').getAttribute('data-start-screen') === 'presets') await page.locator('#btnStartBack').click();
}

export async function presetGallery(page) {
  await choiceScreen(page);
  await page.locator('#btnStartPreset').click();
  await page.locator('[data-preset]').first().waitFor();
}

export async function startPath(page) {
  await page.locator('#stage-start').click();
  if (await page.locator('#btnStepByStep').isVisible()) await page.locator('#btnStepByStep').click();
  else { await choiceScreen(page); await page.locator('#btnStartScratch').click(); }
  await page.locator('.guide-count').waitFor();
}
```

In `builderDestination`, replace the `Start` branch body with:

```js
    if (destination === 'Starting look') await presetGallery(page);
    else await page.locator('#stage-start').click();
    return;
```

- [ ] **Step 7: Run the new scenarios and the path tests**

Run: `BESPOKE_STREAMLINED_SCENARIO='start screens' node scripts/test-bespoke-streamlined-workflow.mjs && BESPOKE_PREVIEW_WIDTHS='' node scripts/test-bespoke-preview-editor.mjs && node scripts/test-bespoke-guided-browser.mjs && node --test scripts/test-bespoke-guide.mjs && wc -l bespoke/builder-app.mjs bespoke/start.mjs`
Expected: the `start screens` scenario passes, the read-only snapshot check passes, the seven path scenarios pass, 19 unit tests pass, `builder-app.mjs` is under 1,852 lines and `start.mjs` is under 200.

- [ ] **Step 8: Commit**

```bash
git add bespoke/start.mjs bespoke/builder-app.mjs bespoke/builder.css scripts/bespoke-test-navigation.mjs scripts/test-bespoke-streamlined-workflow.mjs scripts/test-bespoke-preview-editor.mjs scripts/test-bespoke-guide.mjs
git commit -m "feat: open BeSpoke on a two-field intake form, then scratch or a preset gallery"
```

### Task 9: Preview clicks during the path

**Files:**
- Modify: `bespoke/preview-editor.mjs` (`renderToolbar`, `refresh`, the two stage listeners)
- Modify: `bespoke/builder-app.mjs` (`createPreviewEditor` host in `init`)
- Test: `scripts/test-bespoke-preview-editor.mjs` (replace the `guide` check and the Guide me lines near 125)

**Interfaces:**
- Consumes: `guide.jumpFromPreview(view, target)`, `guide.resumeLabel()`, `guide.resume()` from Task 7.
- Produces: host additions `pathJump(view, target) -> boolean`, `resumePath()`, and `resume` (string or null) on `context()`. DOM id `#btnBackToStep`.

- [ ] **Step 1: Write the failing test**

In `scripts/test-bespoke-preview-editor.mjs`, add `import {startPath} from './bespoke-test-navigation.mjs';`, replace the whole `guide` check with the one below, and replace the `#btnGuideMe` clicks near line 125 with `await startPath(page);`.

```js
 await check('path',async()=>{
  const {page,done}=await fresh(1440);
  await startPath(page);
  const title=()=>page.locator('#stepPanel h1').first().innerText();
  assert.equal(await page.locator('#contextToolbar').isVisible(),false,'the formatting toolbar stays out of the way during the path');
  await page.locator('#modelStage .bespoke-slide').click({position:{x:8,y:8}});
  assert.equal(await title(),'Primary color','the title background is step 1');
  await page.locator('#previewTabs [data-view="cards"]').click();
  assert.equal(await title(),'Primary color','browsing slides does not move the path');
  await page.locator('#modelStage .slide-sidebar').click({position:{x:6,y:6}});
  assert.equal(await title(),'Sidebar color');
  await page.locator('#modelStage .slide-sidebar .sample-sidebar-title').click();
  assert.equal(await title(),'Sidebar text color');
  await page.locator('#modelStage .slide-heading').first().click();
  assert.equal(await title(),'Header text color');
  await page.locator('#modelStage .slide-card .slide-body').first().click();
  assert.equal(await title(),'Body text color');
  await page.locator('#modelStage .slide-card').first().click({position:{x:4,y:4}});
  assert.equal(await title(),'Text boxes layout');
  await page.locator('#previewTabs [data-view="title"]').click();
  await page.locator('#modelStage .slide-title-text').click();
  assert.equal(await page.locator('.guide-count').count(),0,'title text has no step, so the editor opens');
  assert.equal(await page.locator('#selectedElement').inputValue(),'heading-0');
  assert.equal(await page.locator('#btnBackToStep').innerText(),'Back to step 9: Text boxes layout');
  await page.locator('#btnBackToStep').click();
  assert.equal(await title(),'Text boxes layout','the path kept its place');
  await page.locator('#modelStage .slide-card').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await title(),'Text boxes layout','keyboard selection follows the same table');
  await done();console.log('PASS preview clicks open the matching step or the editor');
 });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `BESPOKE_PREVIEW_WIDTHS='' node scripts/test-bespoke-preview-editor.mjs`
Expected: FAIL in `path`: after the sidebar click the heading is still `Primary color`.

- [ ] **Step 3: Make targets selectable during the path**

In `bespoke/preview-editor.mjs`:

In `renderToolbar`, replace the three lines that handle `mode==='guide'` (the `toolbar.hidden` line, the `for(const id of ['editScope','selectionHelp'])` line and `if(mode==='guide')return;`) with:

```js
  toolbar.hidden=mode==='guide';
  document.getElementById('editScope').hidden=mode!=='edit';
  const help=document.getElementById('selectionHelp');help.hidden=mode==='browse';
  help.textContent=mode==='guide'?'Click part of the slide to open its step. Tab to an element and press Enter to do the same.':'Click an element to format it. Tab to an element and press Enter to select it; Escape selects the background. Sample words are edited in More options.';
  if(mode==='guide')return;
```

Directly after the `field('element', ...)` and `document.getElementById('context-element').id='selectedElement';` lines, add:

```js
  if(host.context().resume){
   const back=document.createElement('button');back.id='btnBackToStep';back.type='button';back.className='btn btn-primary';back.textContent=host.context().resume;
   back.onclick=()=>host.resumePath();toolbar.append(back);
  }
```

In `refresh`, change `const editing=host.context().mode==='edit';` to `const editing=host.context().mode!=='browse';`.

In `refreshSelection`, change `const on=t.id===selected;` to `const on=t.id===selected&&host.context().mode==='edit';`, so no selection ring shows while the path is running.

Replace both stage listeners with:

```js
 // In the path a target opens its step; with no matching step it opens the editor on that element.
 const choose=id=>{const {mode,kind}=host.context();if(mode==='guide'&&host.pathJump(kind,id))return;select(id,{focus:true});};
 stage.addEventListener('click',event=>{
  if(host.context().mode==='browse'||event.target.closest('summary,a,input,select,textarea,button'))return;
  const node=event.target.closest('[data-edit-target]');if(node)choose(node.dataset.editTarget);
 });
 stage.addEventListener('keydown',event=>{
  if(host.context().mode==='browse'||event.target.closest('summary,a,input,select,textarea,button'))return;
  if(event.key==='Escape'&&host.context().mode==='edit'){event.preventDefault();select('background',{focus:true});}
  else if(event.key==='Enter'||event.key===' '){const node=event.target.closest('[data-edit-target]');if(node){event.preventDefault();choose(node.dataset.editTarget);}}
 });
```

- [ ] **Step 4: Wire the host in the app**

In `bespoke/builder-app.mjs` `init`, in the `createPreviewEditor({...})` call, add `resume:guide.resumeLabel()` to the object `context` returns, and add two members:

```js
  pathJump:(view,target)=>guide.jumpFromPreview(view,target),
  resumePath:()=>guide.resume(),
```

- [ ] **Step 5: Run the preview tests**

Run: `node scripts/test-bespoke-preview-editor.mjs && node scripts/test-bespoke-guided-browser.mjs`
Expected: both exit 0, including `PASS preview clicks open the matching step or the editor`.

- [ ] **Step 6: Commit**

```bash
git add bespoke/preview-editor.mjs bespoke/builder-app.mjs scripts/test-bespoke-preview-editor.mjs
git commit -m "feat: open the matching step when the preview is clicked during the BeSpoke path"
```

### Task 10: Move the remaining browser tests to the new Start

The team form lost two fields and Start gained screens, so tests that typed into `#teamName` or clicked a preset from a fresh page fail. This task changes how those tests reach their starting state. It does not change what they check.

**Files:**
- Modify: `scripts/test-bespoke-browser.mjs`, `scripts/test-bespoke-builder-browser.mjs`, `scripts/test-bespoke-streamlined-workflow.mjs`, `scripts/test-bespoke-workflow-qa.mjs`, `scripts/test-bespoke-visual-qa.mjs`, `scripts/test-bespoke-sidebar.mjs`, `scripts/test-bespoke-role-browser.mjs`, `scripts/test-bespoke-preview-editor.mjs`

**Interfaces:**
- Consumes: `teamForm(page, name)`, `presetGallery(page)`, `startPath(page)`, `builderDestination(page, 'Starting look')` from Task 8.

- [ ] **Step 1: List every site**

Run: `grep -nE "#teamName|#spokespersonEmail|btnBuildOwn|btnGuideMe|btnNext'\)|\[data-preset|#preset-" scripts/test-bespoke-*.mjs | grep -v guided-browser`
Expected: about 90 lines across the eight files above.

- [ ] **Step 2: Apply these rules, one file at a time**

| Old | New |
|---|---|
| `#teamName` used as the field a test types into to make a change | `#spokespersonName`, reached with `await teamForm(page, null)` first. The Team Leader name is now the marker that round-trips through Save and Open. |
| A fill of `#teamName` followed by a fill of `#spokespersonName` | One `await teamForm(page, '<the value the test later asserts>')`. Drop the second fill. |
| A fill of `#spokespersonEmail` | Delete the line. |
| An assertion on `#teamName`'s value | The same assertion on `#spokespersonName`, after `await teamForm(page, null)`. |
| `#btnBuildOwn` click | `await page.locator('#stage-slides').click()` |
| `#btnNext` click from Start | `await page.locator('#stage-slides').click()` |
| A preset click from a fresh page or after another preset | `await presetGallery(page)` before each preset click, because applying a preset now opens Slide designs. |
| An assertion that a preset button is focused or pressed after applying it | Call `await presetGallery(page)` first, then keep the assertion. |
| Payload fixtures with `team: { name: '...', spokesperson: { name, email } }` | Leave them. Old designs keep their team name and email, and these fixtures prove it. |

- [ ] **Step 3: Run each file after editing it**

Run each command on its own and fix that file before the next:

```bash
node scripts/test-bespoke-browser.mjs
node scripts/test-bespoke-builder-browser.mjs
node scripts/test-bespoke-streamlined-workflow.mjs
node scripts/test-bespoke-workflow-qa.mjs
node scripts/test-bespoke-visual-qa.mjs
node scripts/test-bespoke-sidebar.mjs
node scripts/test-bespoke-role-browser.mjs
node scripts/test-bespoke-preview-editor.mjs
```

Expected: each exits 0. A failure that is not about reaching the starting state is a bug in Tasks 6 to 9. Stop and fix the code, not the test. If a test encoded a decision the spec replaces (for example, that Start shows presets and the team form on one page), say so in the commit body and rewrite that assertion to the spec's behavior.

- [ ] **Step 4: Confirm nothing references the removed ids**

Run: `grep -rnE "#teamName|spokespersonEmail'\)|btnBuildOwn|btnGuideMe|btnGuideContinue|btnGuideRestart" scripts/test-bespoke-*.mjs bespoke/*.mjs bespoke/guide/*.mjs`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add scripts/test-bespoke-*.mjs
git commit -m "test: reach the BeSpoke starting state through the new Start screens"
```

### Task 11: Docs, verification note, gate and PR 2

**Files:**
- Modify: `bespoke/README.md`, `bespoke/DESIGN.md`, `bespoke/team-guide.html`, `docs/bespoke/decisions.md`, `.claude/MEMORY.md`
- Create: `docs/bespoke/verification-2026-10-02-start-path.md` (use the date the checks run)

- [ ] **Step 1: Update the user-facing docs**

- `bespoke/team-guide.html`: rewrite the steps to match the builder. Step 1, type the Team Leader name and confirm the lesson team. Step 2, choose Start from scratch or Start from a preset. Step 3, for scratch, answer twelve short steps and jump between them from the strip; for a preset, click anything on the slide to change it. Step 4, Review & save. Replace every "spokesperson" with "Team Leader". Keep the sentence that one person operates the preview during a call.
- `bespoke/README.md`: replace the Start and Guide me sections with the same four steps, name `bespoke/start.mjs`, `bespoke/thumbs.mjs` and `bespoke/guide/preview-map.mjs`, and state that `scripts/build-bespoke-presets.mjs` is the source for presets.
- `bespoke/DESIGN.md`: under "Preview editor interaction", replace the rule that Guide me owns the preview with the click table from the spec. Add a "Start" section: one decision per screen, two fields on the intake form, two cards on the choice screen.
- `docs/bespoke/decisions.md`: in the October 2 section from Task 5, change the three rows that say "Ships in the second pull request" to say they shipped, with the PR number.

- [ ] **Step 2: Run the whole gate**

Run: `bash scripts/quality.sh`
Expected: exit code 0 and the last line `quality.sh: all checks passed`.

- [ ] **Step 3: Check the Definition of done from the spec**

Run:

```bash
grep -c $'\xe2\x80\x94' docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md
wc -l bespoke/builder-app.mjs
git diff --name-only origin/main | xargs wc -l | sort -n | tail -5
git diff -U0 origin/main | grep -nE 'catch *(\([^)]*\))? *\{ *\}' || true
```

Expected: `0`; `builder-app.mjs` at or under 1,852 lines; no new file above 800 lines; no new empty catch.

- [ ] **Step 4: Verify in the real builder**

Start the local preview with `preview_start` using the BeSpoke entry in `.claude/launch.json`. Walk the from-scratch path end to end, apply a preset, click the sidebar during the path, and check the phone width. Take one screenshot of the choice screen, one of a color step and one of the preset gallery.

- [ ] **Step 5: Write the verification note**

Create `docs/bespoke/verification-<date>-start-path.md` in the style of `docs/bespoke/verification-2026-09-30-guide.md`: what was run, the quoted tail of `quality.sh`, the browser engines, the three screenshots, and a plain list of what was not exercised (hosted Save, Open and Send with a real team link; a real Teams call).

- [ ] **Step 6: Update project memory**

In `.claude/MEMORY.md`, update Current Status and Last Session, add the October 2 rows to the decision log, and add to Open Items: the Money Management pilot now runs on the step path, and watch whether leaders click Next through the five layout steps. Add a Known Issues line: sidebar text can now be made hard to read, by design, and the advisory is the only guard.

- [ ] **Step 7: Commit, push and open PR 2**

```bash
git add bespoke/README.md bespoke/DESIGN.md bespoke/team-guide.html docs/bespoke .claude/MEMORY.md
git commit -m "docs: describe the BeSpoke intake form, step path and preset gallery"
git push -u origin claude/bespoke-start-flow
```

Open the PR with `gh pr create`. The description states there is no format change and no service deploy, quotes the gate output, and carries a `- [ ]` test plan: Britt walks the from-scratch path, Britt reviews the preset gallery, hosted round trip still open.

---

## Self-review

**Spec coverage.**

| Spec section | Task |
|---|---|
| Start: team screen, choice screen, returning teams, view-only | 8 |
| Team name and email leave the form; Team Leader wording | 8, 10, 11 |
| Step path table, rules for every screen, recap | 6, 7 |
| Step strip, phone menu, answered check marks | 6, 7 |
| Title slide text rule | 6 |
| Slide-level choices stay, scope note only when custom | 7 |
| Text boxes layout carries the box count | 6, 7 |
| Saved place; old Guide me position dropped | 6, 7 |
| Preview clicks during the path; Back to step N | 6, 9 |
| Sidebar text color: model, schema, service, Shared theme, preview editor, handoff doc | 1, 2, 4, 5 |
| Nine presets and the four preset rules | 3 |
| Preset gallery with two rendered slides | 8 |
| Deploy order and two pull requests | 5, 11 |
| Earlier decisions recorded | 5, 11 |
| Definition of done checks | 5, 11 |

**Two places where the plan refines the spec.** The spec said the catalog role entry carries `optional: true`. The plan puts the entry under a separate `optionalRoles` key, so the eleven-role loops in the model, app, generator and tests stay untouched. The spec said the team name falls back to the lesson title. `scripts/bespoke-write-submission.py` already falls back to the leader's name, and the plan keeps that. Both spec lines are updated to match.

**Type consistency.** `optionsFor` returns an array in Tasks 6 and 7. Guide state is `{ ids, index, on, done, answered }` in `questions.mjs`, the unit tests, and the browser draft assertion. Target ids `sidebar` and `sidebar-text` match between `preview-editor.mjs` (Task 4), `preview-map.mjs` (Task 6) and the tests. `startPath` has one definition per task and callers never change.

**Known soft spots.** Task 3 step 7 and Task 10 repair existing tests by rule, not by a line-by-line script, because the edits depend on what each test asserts. Each has an exact grep to find the sites, a rule table, and a per-file pass condition.
