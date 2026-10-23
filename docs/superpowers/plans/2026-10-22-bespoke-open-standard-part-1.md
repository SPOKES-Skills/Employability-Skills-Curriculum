# BeSpoke open standard, Part 1: replace what the standard rules out

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BeSpoke stops offering texture backgrounds and third typefaces, offers solid background structures instead, converts saved designs on open, redesigns the 12 looks to the variety limits, and tells teams every design needs Britt's final approval.

**Architecture:** Retired values stay valid in the schema, the service and the build, and keep rendering exactly as before, so sent and approved designs still work. The page stops offering them and converts them when a design opens. Per-slide fonts become "heading" or "body" tokens that follow the lesson's two fonts. The 12 looks are retuned in their one table and gated by a new variety test.

**Tech Stack:** Static ES modules in `bespoke/`, Node 22 test scripts (`node:test` and the repo's check runners), Playwright browser suites, Python `unittest`.

**Spec:** `docs/superpowers/specs/2026-10-22-bespoke-open-standard-premium-design.md` (Part 1 and the cross-part sections).

## Global Constraints

- Retired values are accepted by the schema, the service and `scripts/bespoke_design.py`, and render as today. Only the controls stop offering them.
- Readability stays advisory. Add no gate, block or lock on color choices.
- Use only the 11 palette colors. CLR-04 `rgba()` of a palette color is allowed.
- `bespoke/builder-app.mjs` (2,048 lines) may grow by at most 20 lines net. Put new logic in modules. Every new file stays under 800 lines.
- Work test-first. Quote each new test's red run and its green run.
- Commit subjects use `feat:`, `fix:`, `test:`, `docs:` or `refactor:`. No attribution trailers. Never `git add -A`.
- Do not push, open a pull request, or run any Netlify command. Task 6 stages the service; Britt deploys.
- Prose (docs, comments, UI copy) has no em dashes and uses sentence case.
- Gate: `bash scripts/quality.sh`, run through the Terminal panel (Chromium cannot run in the sandbox).

## Review Focus

1. A team reopens a shared design that uses Dot grid and a third font: it opens, both are converted, one notice lists both, and nothing is lost (Task 3 test).
2. A slide set to "Heading font" keeps following the lesson heading font after the team changes it (Task 2 test).
3. A proposal sent before this change, holding Dot grid and a font id on a slide, still validates and builds its CSS unchanged (Task 1 test).
4. An edge rail or frame on a surface whose color equals the accent color stays visible (Task 1 test).
5. A view-only tab that opens a legacy design shows it converted but never saves it (Task 3 test).

---

### Task 1: Solid background structures, with retired textures kept for old designs

**Files:**
- Modify: `bespoke/builder-catalog.json` (`backgrounds`, new `retiredBackgrounds`)
- Modify: `bespoke/builder-model.mjs:43-84` (`patternFor`, `patternBackground`), `:117-127` (`roleStylesSchema` pattern enum), `:298-312` (`rolePattern`), `:220-239` (`designSchema` background enum)
- Create: `bespoke/background-structures.mjs`
- Modify: `scripts/generate-selection-v2-schema.mjs`, then regenerate `bespoke/selection-v2.schema.json`
- Modify: `bespoke/builder-app.mjs:1635`, `:1711-1713` (labels only)
- Test: `scripts/test-bespoke-background-structures.mjs` (new, `node --test`), add to the `node --test` line in `scripts/quality.sh`

**Interfaces:**
- Produces: `STRUCTURE_IDS = ['color-block', 'edge-rail', 'frame']`, `RETIRED_IDS = ['dot-grid', 'diagonal', 'crosshatch', 'soft-gradient']`, `structureInk(catalog, design, baseHex) -> hex`, `structureLayers(id, inkHex, strength) -> {images: string[], sizes: string[], positions: string[], repeats: string[]}` in `bespoke/background-structures.mjs`.
- Produces: `allBackgroundIds(catalog) -> string[]` exported from `bespoke/builder-model.mjs` (offered plus retired), used by both schema builders.

- [ ] **Step 1: Write the failing tests** in `scripts/test-bespoke-background-structures.mjs`:
  - `offered backgrounds are plain and the three structures`: `catalog.backgrounds.map(b => b.id)` equals `['plain', 'color-block', 'edge-rail', 'frame']`; `catalog.retiredBackgrounds.map(b => b.id)` equals `RETIRED_IDS`.
  - `structures draw one palette color at full strength`: for each structure id on a Paper & berry design, every color in `patternFor(...).images` is a palette hex (no `rgba`, no alpha), and `peakAlpha === 0`.
  - `structure ink falls back when it matches the surface`: with `roles.accent` equal to `roles.contentBackground`, `structureInk` returns `inkFor(catalog, roles.contentBackground)`'s hex.
  - `strength sets thickness`: `structureLayers('edge-rail', ink, 'subtle')`, `'normal'`, `'bold'` produce stripes of 6px, 12px and 20px at the 960 canvas.
  - `retired textures render exactly as before`: for each retired id, `patternBackground` and `cssForDesign` output for a design using it equals the output the unchanged code produces. Capture the four expected strings into `scripts/test-fixtures/bespoke/retired-backgrounds.json` with a one-off script run before Step 3 changes any code, and commit the fixture with the test.
  - `schema still accepts retired ids`: `designSchema(catalog)` and `roleStylesSchema(catalog)` enums include every retired id; a design with `background: 'dot-grid'` and a role style `pattern: 'crosshatch'` passes `structuralErrors`.
  - `the service accepts an old proposal`: `selectionErrors(selection, lessonId)` from `netlify/functions/_shared/selection.mjs`, given a v2 selection whose design uses `dot-grid`, returns `[]`.
- [ ] **Step 2: Run the tests and see them fail.** `node --test scripts/test-bespoke-background-structures.mjs`. Expected: FAIL (module not found, offered list mismatch).
- [ ] **Step 3: Implement.**
  - Catalog: `backgrounds` = `plain` "Plain", `color-block` "Color block", `edge-rail` "Edge rail", `frame` "Frame". `retiredBackgrounds` holds the four old entries with their old labels.
  - `structureInk`: the accent color when `contrast(accent, base) >= 1.5`, else `inkFor(catalog, base)`'s hex.
  - `structureLayers`: hard-stop `linear-gradient` layers in the ink color at full strength. Thickness by strength: 6, 12, 20 px. Color block is a corner square of 64, 96, 128 px. Every structure stays inside the slide's outer margin and never under text; choose the geometry within the 960 canvas.
  - `patternFor` and `rolePattern`: structure ids use `structureLayers` with `peakAlpha: 0`; retired ids keep today's recipes untouched; `plain` unchanged.
  - Both schema enums use `allBackgroundIds(catalog)`.
  - Labels in `builder-app.mjs`: "Background pattern" → "Background", "Texture" → "Background detail", "Background texture" → "Background detail", "Texture strength" → "Detail size" with Thin, Standard and Thick for subtle, normal and bold.
  - Regenerate the schema: `node scripts/generate-selection-v2-schema.mjs`.
- [ ] **Step 4: Run the tests and see them pass.** Same command, then `node scripts/generate-selection-v2-schema.mjs --check` (exit 0) and `node scripts/test-bespoke-builder-model.mjs`.
- [ ] **Step 5: Update browser tests that pick a retired value through a control.** List them with `grep -lE "dot-grid|crosshatch|soft-gradient" scripts/test-bespoke-*browser*.mjs scripts/test-bespoke-visual-qa.mjs scripts/test-bespoke-effective-*.mjs`. A test that clicks or selects a retired option switches to a structure; a test that renders a saved retired design stays. Run each changed suite once.
- [ ] **Step 6: Commit** `feat: replace BeSpoke background textures with solid structures and keep old textures rendering`.

### Task 2: Two typefaces per lesson

**Files:**
- Modify: `bespoke/builder-model.mjs` (`roleStylesSchema` font enum, `effectiveRoleStyle`, `effectiveFeatureStyle`, `featureStylesSchema`, `usedFontIds`, `roleStyleDefaults`)
- Create: `bespoke/font-slots.mjs`
- Modify: the controls that offer fonts: `bespoke/preview-editor.mjs` (context font fields), `bespoke/builder-app.mjs` role editor font selects (find with `grep -n "Font'" bespoke/builder-app.mjs`), feature font fields in `preview-editor.mjs`
- Test: `scripts/test-bespoke-font-slots.mjs` (new, `node --test`), add to `scripts/quality.sh`

**Interfaces:**
- Produces: `FONT_SLOTS = ['heading', 'body']`, `resolveFont(design, value) -> fontId` (`'heading'` → `design.fonts.heading`, `'body'` → `design.fonts.body`, a font id → itself), `fontSlotChoices(catalog, design) -> [{id: 'heading', label: 'Heading font · <name>'}, {id: 'body', label: 'Body font · <name>'}]` in `bespoke/font-slots.mjs`.
- Role style fields `headingFont`, `bodyFont`, `extraFont`, `watermarkFont` and feature `font` accept `'inherit'`, `'heading'`, `'body'`, and still accept every font id (retired path).

- [ ] **Step 1: Write the failing tests:**
  - `a slide on the heading slot follows the lesson heading font`: set cards `headingFont: 'heading'`, then change `design.fonts.heading` from `merriweather` to `bitter`; `effectiveRoleStyle(catalog, design, 'cards').headingFont === 'bitter'`.
  - `controls offer only the two lesson fonts`: `fontSlotChoices` returns exactly two entries whose labels name `design.fonts.heading` and `design.fonts.body`.
  - `no control-made design holds a third typeface`: for each of the 12 looks, set every font field on every slide kind and both features to each value `fontSlotChoices` offers; `usedFontIds(catalog, design)` has length at most 2.
  - `font ids still validate and render`: a role style with `headingFont: 'inter'` passes `structuralErrors` and `cssForDesign` names `inter`.
- [ ] **Step 2: Run and see them fail.** `node --test scripts/test-bespoke-font-slots.mjs`.
- [ ] **Step 3: Implement.** Resolve tokens wherever a font value is read (`effectiveRoleStyle`, `effectiveFeatureStyle`, `usedFontIds`, CSS). Every font control lists `fontSlotChoices`, plus "Use shared font" where `inherit` was offered. The shared font controls (the two lesson fonts) keep offering all 12 fonts in any combination; `fontPairings` stay as suggestions in Guide me.
- [ ] **Step 4: Run and see them pass**, plus `node scripts/test-bespoke-builder-model.mjs` and `node scripts/generate-selection-v2-schema.mjs` then `--check`.
- [ ] **Step 5: Update browser tests that select a font id in a per-slide control** (`grep -ln "headingFont\|context-font" scripts/test-bespoke-*browser*.mjs scripts/test-bespoke-preview-editor.mjs`) to select a slot. Run each changed suite once.
- [ ] **Step 6: Commit** `feat: limit BeSpoke designs to the lesson's heading and body fonts`.

### Task 3: Convert saved designs on open

**Files:**
- Create: `bespoke/standard-conversion.mjs`
- Modify: `bespoke/builder-app.mjs:1395-1408` (`applySelectionPayload`)
- Test: `scripts/test-bespoke-standard-conversion.mjs` (new, `node --test`), add to `scripts/quality.sh`; one browser case in `scripts/test-bespoke-streamlined-workflow.mjs`

**Interfaces:**
- Consumes: `RETIRED_IDS` (Task 1), `FONT_SLOTS` (Task 2).
- Produces: `convertToStandard(catalog, design) -> {design, changes: string[]}`. Pure; never mutates its input; `changes` is empty when nothing changed.

- [ ] **Step 1: Write the failing tests:**
  - `retired backgrounds become plain`: shared `background: 'dot-grid'` and a role `pattern: 'crosshatch'` both become `'plain'`; `changes` includes `"Background Dot grid is now Plain."` and `"Text boxes background detail Crosshatch is now Plain."`.
  - `font ids become slots`: a font id equal to `fonts.heading` becomes `'heading'`, equal to `fonts.body` becomes `'body'`; any other id becomes `'heading'` in `headingFont` and `watermarkFont`, `'body'` in `bodyFont`, `extraFont` and feature `font`; `changes` names each slide and the old font label.
  - `a compliant design is untouched`: a look straight from `applyPreset` returns the same object shape and `changes: []`.
  - `the input is not mutated`: deep-equal the input before and after.
  - Browser, streamlined suite: open a shared design holding Dot grid and a third font. Expected: the preview shows Plain, the notice strip lists both changes, the History panel still lists the earlier revision, and a view-only tab opening the same design shows the converted preview and sends no save request.
- [ ] **Step 2: Run and see them fail.** `node --test scripts/test-bespoke-standard-conversion.mjs`.
- [ ] **Step 3: Implement `convertToStandard`**, then call it in `applySelectionPayload` after the v1 migration branch. When `changes` is non-empty, set `ui.restoreNote` to `"Updated this design to the SPOKES design standard: "` followed by the changes joined with spaces, then `" Review it before saving."`. The earlier revision stays in the shared History; nothing else stores the original.
- [ ] **Step 4: Run and see them pass**, plus the streamlined scenario: `BESPOKE_STREAMLINED_SCENARIO='standard' node scripts/test-bespoke-streamlined-workflow.mjs`.
- [ ] **Step 5: Commit** `feat: convert saved BeSpoke designs to the design standard on open`.

### Task 4: Redesign the 12 looks to the variety limits

**Files:**
- Modify: `scripts/build-bespoke-presets.mjs` (`PRESETS` rows, `colorLabel`s), then regenerate presets into `bespoke/builder-catalog.json`
- Test: `scripts/test-bespoke-look-variety.mjs` (new, `node --test`), add to `scripts/quality.sh`

**Interfaces:**
- Consumes: `compareDesign(fingerprints, design, catalog)` and `CHARACTERISTICS` from `bespoke/similarity.mjs`; `contrastIssues` from `bespoke/builder-model.mjs`.

- [ ] **Step 1: Write the failing tests:**
  - `each look shares at most 5 choices with every released lesson`: for every look, every entry of `compareDesign(...)` has `shared <= 5`. The message names the look, the lesson and the count.
  - `any two looks share at most 16 of the 32 compared choices`: compare every pair on `CHARACTERISTICS` keys read from the designs.
  - `looks share no color with a released lesson in the same role`: count `matches` whose key starts with `roles.` or `dividerText.`; expected 0 for every look, except entries listed in a `COLOR_EXCEPTIONS` table in the test, each with a one-line reason. Start the table empty.
  - `looks raise no readability notes`: `contrastIssues(catalog, design)` is empty for every look.
  - `looks keep their identity`: 12 ids unchanged, 12 distinct title layouts, every row uses only offered backgrounds and no retired id.
- [ ] **Step 2: Run and see them fail.** `node --test scripts/test-bespoke-look-variety.mjs`. On `1e5ce9d` six looks exceed 5 shared choices and 44 pairs exceed 16; quote the failure.
- [ ] **Step 3: Retune the `PRESETS` rows.** Keep each look's `id`, `label`, `blurb` and title layout. Vary the text box, video and activity choices between rows (all 12 rows share them today), use the new background structures, spread heading and body fonts across the 12 fonts, and reassign colors away from the released lessons' role colors. Update each `colorLabel` to describe the new colors. A short search script in the scratchpad may propose rows; the table stays hand-readable.
- [ ] **Step 4: Regenerate and check.** `node scripts/build-bespoke-presets.mjs`, then `node scripts/build-bespoke-presets.mjs --check` (exit 0), then the variety test (PASS). If a look cannot reach zero color matches while staying readable, add it to `COLOR_EXCEPTIONS` with the reason and say so in the task report.
- [ ] **Step 5: Run the look-dependent suites:** `node scripts/test-bespoke-showcase-model.mjs` and `node scripts/test-bespoke-showcase.mjs`. The Pick a look moods are keyed by id; if a look's new colors no longer fit its mood chip, update the mood map and say so in the report.
- [ ] **Step 6: Commit** `feat: redesign the BeSpoke looks to the variety limits`.

### Task 5: Every design needs Britt's final approval

**Files:**
- Modify: `bespoke/send-stage.mjs:9`, `:259` and the Sent to Britt view copy
- Modify: `bespoke/team-guide.html`, `bespoke/DESIGN.md`, `docs/bespoke/decisions.md`
- Test: `scripts/test-bespoke-showcase.mjs` (one case)

- [ ] **Step 1: Write the failing browser case** `Send says Britt approves every design`: on Send the panel text contains "Britt gives final approval to every design before it is used in a lesson."; on Sent to Britt it contains "waiting for Britt's approval".
- [ ] **Step 2: Run and see it fail.** `node scripts/test-bespoke-showcase.mjs`.
- [ ] **Step 3: Replace the copy.** Line 9's "Britt and the program administrator choose the final design." and line 259's "...will use it when they make the final design." become the two sentences above, in the same places.
- [ ] **Step 4: Docs.** `docs/bespoke/decisions.md` gains an October 22, 2026 entry listing: BeSpoke follows the open design standard; textures replaced by structures; two typefaces per lesson; readability stays advisory with a person's review; two-color gradients stay; 12 looks within 5 shared choices of each released lesson and 16 of 32 between looks; every design needs Britt's final approval. It supersedes the October 7 line "The final design comes from Britt and the administrator" only where that line conflicts. `bespoke/DESIGN.md` describes the structures, the font slots and the conversion notice. `bespoke/team-guide.html` says designs use two fonts and Britt approves every design. Check each prose file: `grep -c $'\xe2\x80\x94' <file>` returns the same count as before the edit.
- [ ] **Step 5: Run and see it pass.** Same command.
- [ ] **Step 6: Commit** `feat: tell BeSpoke teams Britt approves every design`.

### Task 6: Gate and service stage

- [ ] **Step 1: Run the gate** through the Terminal panel: `bash scripts/quality.sh > "$TMPDIR/q.log" 2>&1; echo "exit=$?"`. Expected: `exit=0`. Quote the last line of the log.
- [ ] **Step 2: Check the size budget:** `wc -l bespoke/builder-app.mjs` is 2,068 or less, and every new file is under 800 lines.
- [ ] **Step 3: Stage the service** from a clean export of the branch head, as in auto-memory `bespoke-netlify-deploy`: `git archive <head> | tar -x --exclude='.claude' --exclude='*/.claude'` into a fresh directory under `$TMPDIR/bespoke-stages/`, then `node scripts/bespoke-stage-service.mjs <dir>` inside the export, then byte-compare the staged files with the branch (quote paths; `SPOKES Builder/` has a space). Report the stage directory and Britt's one deploy command. Do not deploy.
- [ ] **Step 4: Report** the commit list, the gate result, the stage directory and any `COLOR_EXCEPTIONS` entries.
