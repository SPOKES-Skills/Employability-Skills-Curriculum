# BeSpoke Showcase Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the BeSpoke builder's chrome around the team's slides: a stage-and-filmstrip Pick a look, a Make it yours stage whose toolbar always sits above the slide and says what a change touches, a Send stage that shows the deck, and a Sent to Britt confirmation.

**Architecture:** New pure helpers live in `bespoke/showcase-model.mjs` and are unit tested in Node. Pick a look and Send render into a new full-width `#showcase` section through two new DOM modules, `bespoke/pick-a-look.mjs` and `bespoke/send-stage.mjs`, which talk to `builder-app.mjs` only through a host object. Make it yours keeps its current structure, with the toolbar changes in `preview-editor.mjs`, `canvas-toolbar.mjs` and `canvas-controls.mjs`. New styles go in `bespoke/showcase.css`. One new browser suite, `scripts/test-bespoke-showcase.mjs`, proves the behavior.

**Tech Stack:** Plain ES modules and CSS with no build step. Node 22 `node:assert` for unit tests. Playwright through `scripts/bespoke-test-browser.mjs` and `scripts/bespoke-dev-server.mjs` for browser tests.

**Spec:** `docs/superpowers/specs/2026-10-19-bespoke-showcase-polish-design.md` (approved by Britt 2026-10-19). Read it before Task 1. Where this plan and the spec disagree, the spec wins. Report the disagreement.

## Global Constraints

- Branch `claude/bespoke-showcase-polish`, base commit `a8b73fc`, the head of PR #56.
- Never edit `netlify/`, `bespoke/builder-model.mjs`, `bespoke/builder-catalog.json`, `bespoke/catalog.json`, `bespoke/selection.schema.json`, `bespoke/selection-v2.schema.json` or anything under `SPOKES Builder/`. Confirm this list against `scripts/bespoke-stage-service.mjs` before the first commit.
- Never add a readability, contrast or accessibility warning, gate or test on what a team picks for their slides.
- Stage names are exactly: `Lesson & team`, `Pick a look`, `Make it yours`, `Send`. Internal ids stay `team`, `start`, `slides`, `review`, and element ids `#stage-team`, `#stage-start`, `#stage-slides`, `#stage-review` stay.
- Mood groups are exactly: Calm `corner`, `plaque`, `light-hearted`; Bold `fun`, `outspoken`; Bright `modern`, `horizon`, `sidebar`; Classic `professional`, `serious`, `masthead`, `columns`. Chips are shown in the order All 12, Calm, Bold, Bright, Classic.
- Every chrome control is at least 44px tall. Keyboard focus is visible. Each toolbar's and strip's tab order matches its visual order.
- `prefers-reduced-motion: reduce` turns off every animation this plan adds.
- Chrome text uses Outfit only.
- Copy that the spec fixes is used word for word. It is quoted in the tasks below.
- Every task ends with `bash scripts/quality.sh` exiting 0 before its commit. The sandbox blocks Chromium. Run browser tests and `quality.sh` in the Terminal panel when the sandbox refuses them.
- Commits use `feat:`, `fix:`, `test:`, `docs:` or `refactor:` subjects, with no attribution trailers.

## Review Focus

1. **View-only sessions.** Someone opening a read-only team view link can hover looks to preview them, but cannot apply a look, Build my own, restore Your design, or press Make it ours. All four are disabled. The test belongs to Task 4.
2. **Look unknown after reopening.** A design opened from a shared save on another computer has no remembered look. Make it yours then says "Your design" and Send shows "Your design" with no Your changes row. No errors. The tests belong to Tasks 5 and 6.
3. **Long lesson titles.** The longest title in `state.meta.lessons` fits on every filmstrip and stage render without spilling outside the slide. The test belongs to Task 4.
4. **An emptied title.** A team that clears its title to empty or whitespace sees the lesson name, not a blank slide. The unit test belongs to Task 1.
5. **Phone width (390x844).** Pick a look stacks into one column. Make it ours is reachable and the page has no sideways scroll. The test belongs to Task 4.

---

### Task 1: Pure showcase helpers

**Files:**
- Create: `bespoke/showcase-model.mjs`
- Test: `scripts/test-bespoke-showcase-model.mjs`
- Modify: `scripts/quality.sh` (add the test after `node scripts/test-bespoke-similarity.mjs`)

**Interfaces:**
- Produces, all pure, no DOM, `Model` passed in as the `builder-model.mjs` namespace:
  - `MOODS: {calm: string[], bold: string[], bright: string[], classic: string[]}` and `MOOD_ORDER = ['calm','bold','bright','classic']`, `MOOD_LABELS = {calm:'Calm', bold:'Bold', bright:'Bright', classic:'Classic'}`
  - `moodOf(presetId: string): string | null`
  - `displayTitle(design, {lessonTitle: string, defaultTitle: string}): string`. Returns the lesson title when `design.samples.title` equals `defaultTitle` or is empty or whitespace. Otherwise returns the team's title.
  - `slideOptions(design, {lessonTitle, defaultTitle, logoUrl}): {title, subtitle, lessonTitle, logoUrl}`, with `title` taken from `displayTitle`.
  - `lookDetail(catalog, presetId): {id, name, layout, fonts, colors: {id,name,hex}[]} | null`. `name` is the preset's `colorLabel`, `layout` its `label` plus `" layout"`, and `fonts` reads like `"DM Serif Display headings with Outfit text"`.
  - `designChanges(catalog, Model, design, presetId): string[]`. Plain change labels in slide order (title, divider, cards, video, activity). Compare `design` with `Model.applyPreset(catalog, presetId, design)` given the same `samples`. Ignore sample words.
  - `sharedParts(catalog, Model, design, kind, key): string[]`. The other slide kinds whose effective `key` would change if this kind's shared color changed. Probe with `Model.setSharedColor` using any palette color that differs from the current one, and compare `Model.effectiveRoleStyle` per kind before and after. This guarantees the answer matches what the model actually does.
  - `changedKinds(catalog, Model, before, after): string[]`. Slide kinds whose `Model.effectiveRoleStyle` output differs.
  - `designKey(design): string`. A stable `JSON.stringify` of the design.
  - `sentState(lastReceipt, currentKey): 'none' | 'sent' | 'changed'`. Returns `'sent'` when `lastReceipt?.designKey === currentKey`, `'changed'` when a receipt exists with another key, and `'none'` when there is no receipt.

- [ ] **Step 1: Write the failing tests** in `scripts/test-bespoke-showcase-model.mjs`. Import `catalog` from `../bespoke/builder-catalog.json` (with `{type:'json'}`) and `* as Model` from `../bespoke/builder-model.mjs`. Print `ok - <name>` per case:
  - `every preset has exactly one mood`: each `catalog.presets` id is in exactly one `MOODS` list. Expect `Object.values(MOODS).flat().length === 12`.
  - `displayTitle uses the lesson name until the team types one`. With `def = Model.defaultDesign(catalog)`, `defaultTitle = def.samples.title`, and `lessonTitle: 'Money Management'`:
    - the default title gives `'Money Management'`;
    - `{...def, samples:{...def.samples, title:'Our budget'}}` gives `'Our budget'`;
    - a title of `'   '` gives `'Money Management'`.
  - `lookDetail names the look in plain words`: `lookDetail(catalog,'fun').name === 'Midnight & gold'`, `.layout === 'Framed layout'`, and `.fonts` matches `/ headings with .+ text$/`.
  - `designChanges lists a shared title color change on both slides`. With `d = Model.applyPreset(catalog,'fun',Model.defaultDesign(catalog))` and `e = Model.setSharedColor(catalog,d,'title','headingColor','gold')`, `designChanges(catalog,Model,e,'fun')` deep-equals `['Title text in Gold','Divider heading in Gold']`. `designChanges(catalog,Model,d,'fun')` deep-equals `[]`.
  - `sharedParts matches the model`: `sharedParts(catalog,Model,d,'title','headingColor')` deep-equals `['divider']`.
  - `changedKinds finds the divider`: `changedKinds(catalog,Model,d,e)` includes `'divider'` and `'title'`.
  - `sentState`: `sentState(null,'k') === 'none'`, `sentState({designKey:'k'},'k') === 'sent'`, `sentState({designKey:'j'},'k') === 'changed'`.

- [ ] **Step 2: Run to verify it fails**
  Run: `node scripts/test-bespoke-showcase-model.mjs`
  Expected: FAIL, cannot find module `../bespoke/showcase-model.mjs`.

- [ ] **Step 3: Implement `bespoke/showcase-model.mjs`** with the exports above. Change labels use these part names: title `headingColor` "Title text", `bodyColor` "Subtitle", `primary` "Title background"; other kinds `"<Kind short> heading"`, `"<Kind short> text"`, `"<Kind short> background"`, where Kind short is Divider, Text boxes, Video or Activity. Color values read `"in <palette name>"`. Fonts read `"<part> font <font label>"`. For anything else, use `FIELD_LABELS`-style wording, `"<part> <setting> changed"`.

- [ ] **Step 4: Run to verify it passes**
  Run: `node scripts/test-bespoke-showcase-model.mjs`
  Expected: seven `ok -` lines, exit 0.

- [ ] **Step 5: Add to `scripts/quality.sh`, run it, commit**
  Run: `bash scripts/quality.sh` → exit 0.
  ```bash
  git add bespoke/showcase-model.mjs scripts/test-bespoke-showcase-model.mjs scripts/quality.sh
  git commit -m "feat: add pure helpers for the BeSpoke showcase"
  ```

### Task 2: Stage names and plain words

**Files:**
- Modify: `bespoke/builder-app.mjs` (`STEPS` labels at :29-34, `builderGuidance` at :1418-1425, the `'Match arrangement'` choice at :1652, the second-background review wording at :1739-1743, `updateTeamPill` text)
- Modify: `bespoke/preview-editor.mjs` (`'Selected element'` becomes `'Editing'`, `'Place in text area'` becomes `'Position'`)
- Modify: `bespoke/index.html` (`#btnSave` text `Save for the team`)
- Modify: `bespoke/team-guide.html` (stage names)
- Modify: `bespoke/builder.css` (stage pills at least 44px)
- Create: `scripts/test-bespoke-showcase.mjs` (browser suite; later tasks add cases)
- Modify: tests that assert the old words: `scripts/bespoke-test-navigation.mjs`, `scripts/test-bespoke-builder-browser.mjs`, `scripts/test-bespoke-visual-qa.mjs`, `scripts/test-bespoke-canvas-shell.mjs`, `scripts/test-bespoke-streamlined-workflow.mjs`. Find them with `git grep -nE "Color & layout|Color &amp; layout|Review & save|Customize|Start with color|starting looks|Selected element|Place in text area|Save shared design"`.

**Interfaces:**
- Produces: `scripts/test-bespoke-showcase.mjs`, built on the `open(width, height)`, `rect` and `pass` setup copied from `scripts/test-bespoke-canvas-shell.mjs:8-24`, with a `height` parameter added, `reducedMotion` as a parameter that defaults to `'reduce'`, and a helper `chromeControls(page)` that returns the visible `button, select, input, summary, [role=radio], [role=tab]` elements outside `.bespoke-slide` and outside shadow roots.

- [ ] **Step 1: Write the failing browser cases** in `scripts/test-bespoke-showcase.mjs`:
  - `stage pills use the new names`: at 1440x900, the texts of `#stage-team`, `#stage-start`, `#stage-slides` and `#stage-review` contain `Lesson & team`, `Pick a look`, `Make it yours` and `Send`.
  - `How it works matches the four stages`: open `#btnHelp`. `#builderHelp` text contains all four names and does not contain `Open Lesson & team when needed`, `editor sidebar` or `Files & recovery`.
  - `stage pills are tall enough`: every `#stepList button` measures at least 44px tall.
  - `toolbar words are plain`: on `#stage-slides`, click `#modelStage .slide-title-text`. The toolbar's labels include `Editing` and `Position`, and do not include `Selected element` or `Place in text area`.

- [ ] **Step 2: Run to verify it fails**
  Run: `node scripts/test-bespoke-showcase.mjs`
  Expected: FAIL on `stage pills use the new names`.

- [ ] **Step 3: Change the words.** `Match arrangement` becomes `Default`. The second-background review label becomes `Second color (not used by this layout)` when the layout does not use it. Rewrite `builderGuidance` as one numbered item per stage, using the spec's stage names and nothing about the drawer as a sidebar. Update `team-guide.html` to the same names. Do not change the local-preview labels set at `builder-app.mjs:1953`.

- [ ] **Step 4: Update the existing tests that assert the old words**, keeping what each one checks. List every changed expectation in a scratch note for the PR description.

- [ ] **Step 5: Run and commit**
  Run: `node scripts/test-bespoke-showcase.mjs`, then `bash scripts/quality.sh`.
  Expected: all `ok -` lines, exit 0.
  ```bash
  git add bespoke scripts
  git commit -m "feat: rename the BeSpoke stages and plain-word the toolbar"
  ```

### Task 3: Toast for success messages

**Files:**
- Create: `bespoke/toast.mjs`
- Create: `bespoke/showcase.css`, linked from `bespoke/index.html` after `canvas.css`
- Modify: `bespoke/builder-app.mjs`: add `successNotice(message)`. Route these through it: the preset-applied message in `applyPresetChoice` (:1396), the receipt message in `rememberReceipt` (:879), and the save-success and "already up to date" messages in `cloudSave` (find them with `git grep -n "up to date\|saved" bespoke/builder-app.mjs`). Leave every conflict, error and pending message on `fileNotice`.
- Test: `scripts/test-bespoke-showcase.mjs`

**Interfaces:**
- Produces: `showToast(message: string, {ms = 4000} = {}): void` in `bespoke/toast.mjs`. It reuses one `#toast` element with `role="status"` and `aria-live="polite"`, fixed near the top of the viewport. `successNotice(message)` in `builder-app.mjs` calls it.

- [ ] **Step 1: Write the failing case** `success messages are toasts`: on `#stage-slides` at 1440x900, scroll the window down 600px and click `#btnSave`. `#toast` becomes visible with a top edge between 0 and 120px of the viewport, and `#fileStatus` stays hidden. After 5 seconds, `#toast` is hidden.
- [ ] **Step 2: Run, expect FAIL** (`#toast` not found).
- [ ] **Step 3: Implement** `showToast` and `successNotice`, and move the listed call sites over. The toast styles go in `showcase.css`.
- [ ] **Step 4: Run** `node scripts/test-bespoke-showcase.mjs` and `bash scripts/quality.sh`. Expect PASS and exit 0. Existing tests that waited on `#fileStatus` for a success message now wait on `#toast`. Note each one.
- [ ] **Step 5: Commit** `feat: show BeSpoke success messages as toasts`

### Task 4: Pick a look

**Files:**
- Create: `bespoke/pick-a-look.mjs`
- Modify: `bespoke/index.html`: add `<section id="showcase" class="showcase" hidden></section>` as the last child of `#workspace`, and delete `#presetDialog`.
- Modify: `bespoke/builder-app.mjs`:
  - `renderPanel` (:1786) calls `renderPickALook` for `start`.
  - `render` sets `#showcase.hidden` and hides `#chromeRail` and `#previewPane` on `start` and `review` through `[data-stage]` CSS.
  - Delete `requestPreset`, `finishPresetConfirmation`, `resetPresetConfirmation`, `skipPresetConfirmation` and `renderWelcome`.
  - `applyPresetChoice` stays on the stage, sets `ui.appliedLook = presetId`, and calls `successNotice(presetName(preset) + ' applied.')`.
  - Add `ui.appliedLook` and `ui.lookSnapshot`. `serializeDraft` saves `appliedLook`, and `restoreStep` restores it, accepting only a known preset id.
  - Wire every `Model.renderSlide` call (:1809, :1864, :1904, and `review-tools.mjs:32` through its host context) to `slideOptions` from Task 1.
- Modify: `bespoke/showcase.css` (Pick a look layout)
- Test: `scripts/test-bespoke-showcase.mjs`, plus existing tests that clicked `#preset-<id>` and expected to land on Customize. Those now also click `#btnMakeItOurs`.

**Interfaces:**
- Consumes: `MOODS`, `MOOD_ORDER`, `MOOD_LABELS`, `lookDetail`, `slideOptions`, `designKey` (Task 1). `showToast` through `successNotice` (Task 3).
- Produces: `renderPickALook(root: HTMLElement, host: PickHost): void`, where `PickHost` is:
  `{catalog, Model, design(): Design, options(design): RenderOptions, appliedLook(): string|null, snapshot(): Design|null, editable(): boolean, preview(design|null): void, apply(presetId): void, applySnapshot(): void, buildOwn(): void, guideMe(): void, makeItOurs(): void, undoApply(): void, canUndoApply(): boolean}`.
  `preview` never records history. `applySnapshot` and `buildOwn` each record one undo step. `buildOwn` applies `Model.defaultDesign(catalog)` with the current `samples` kept, sets `ui.appliedLook = null`, and goes to `slides`. `makeItOurs` goes to `slides` and calls `window.scrollTo(0, 0)`.
- Element ids the tests rely on: `#lookStage` (the large render), `#lookStageHeading` (reads `Your starting look`, `Choose a starting look` or `Previewing <name>`), `#lookName`, `#lookSide`, `#btnMakeItOurs` with text `Make it ours →`, `#btnUndoLook` with text `Undo`, `#lookStrip` (role `listbox`, arrow keys move between options), each look `#preset-<id>` with `data-look="<id>"`, the Your design card `#lookYours`, mood chips `[data-mood="all|calm|bold|bright|classic"]`, `#btnBuildOwn` with text `Build my own`, `#btnGuideMe` with text `Guide me`.

- [ ] **Step 1: Write the failing cases** at 1440x900 unless stated otherwise:
  - `hover previews without an undo step`:
    1. On `#stage-start`, read `#changeList li` count `n`.
    2. Hover `#preset-horizon`. `#lookName` reads `Ocean blue`, `#lookStageHeading` reads `Previewing Ocean blue`, and the count is still `n`.
    3. Press Escape. `#lookName` returns to its earlier text.
  - `clicking applies without a dialog and stays`:
    1. Click `#preset-fun`. `#presetDialog` count is 0, `#workspace[data-stage]` is `start`, and `#lookName` reads `Midnight & gold`.
    2. Click `#btnUndoLook`. The design returns to its earlier state: read the saved draft JSON from `localStorage` (the value containing `"samples"`) and compare before and after.
  - `Make it ours lands at the top`: apply `fun`, scroll down 400px, and click `#btnMakeItOurs`. `data-stage` is `slides` and `window.scrollY === 0`.
  - `slides show the lesson name`: every `#showcase .slide-title-text` reads `Money Management`. The saved draft's `design.samples.title` still equals `defaultDesign(catalog).samples.title`.
  - `moods filter the strip`: click `[data-mood="bold"]`. The visible `[data-look]` ids are exactly `fun` and `outspoken`.
  - `arrow keys move and preview`: focus `#preset-professional` and press ArrowRight. Focus moves to the next visible look, and `#lookName` shows that look's name.
  - `Your design card`: apply `fun`, go to `slides`, change the Title heading color (any swatch), and return to `#stage-start`. `#lookYours` is visible. Click another look, then click `#lookYours`. The design equals the one before leaving `slides`.
  - `side column wraps at 1024`: at 1024x768, `rect('#lookSide').top >= rect('#lookStage').bottom`.
  - Review Focus 1, `view-only sessions cannot apply`: open the read-only view the way `scripts/test-bespoke-team-view.mjs` does. `#btnMakeItOurs`, `#btnBuildOwn`, `#lookYours` and every `[data-look]` are disabled or `aria-disabled="true"`. Hovering still updates `#lookName`.
  - Review Focus 3, `long lesson titles fit`: choose the lesson with the longest title in the lesson select on `#stage-team`. On `#stage-start`, every `#showcase .slide-title-text` has `scrollWidth <= clientWidth + 1` and stays inside its `.bespoke-slide` rect.
  - Review Focus 5, `phone width stacks`: at 390x844, `#btnMakeItOurs` is visible after `scrollIntoViewIfNeeded`, and `document.documentElement.scrollWidth <= 390`.
- [ ] **Step 2: Run, expect FAIL** (`#lookStage` not found).
- [ ] **Step 3: Implement** `pick-a-look.mjs`, its host in `builder-app.mjs`, the HTML and the CSS. Take the stage, side column and strip layout from `docs/bespoke/showcase-mockup-pick-a-look-2026-10-19.html`, option A. Thumbnails reuse the existing shadow-root render approach from the deleted `renderWelcome`. Take the snapshot for `#lookYours` when the team enters `start` with `ui.meaningfulDesign` true and a design that matches no preset.
- [ ] **Step 4: Update existing tests** that relied on the dialog or the jump to Customize. Run `node scripts/test-bespoke-showcase.mjs` and `bash scripts/quality.sh`. Expect PASS and exit 0.
- [ ] **Step 5: Commit** `feat: replace the BeSpoke gallery with the Pick a look stage`

### Task 5: Make it yours

**Files:**
- Modify: `bespoke/canvas-toolbar.mjs`: `TEXT_FIELDS = ['element','text','font','size','color','align','placement']`. Remove `computeToolbarPosition` if nothing else uses it.
- Modify: `bespoke/preview-editor.mjs`:
  - DOM order of the text-selection fields follows `TEXT_FIELDS`.
  - Delete the `scope-badge`.
  - Render `#scopeLine` under the toolbar from `host.scopeLine(kind, selected, key)`.
  - The Sample text field shows `displayTitle` for the title heading and writes only on input.
  - Add text, Remove added text and Use shared defaults stay in the toolbar after Position and before More options, appearing where they do today.
- Modify: `bespoke/canvas-controls.mjs`: each color-well swatch shows its palette name as visible text under the dot.
- Modify: `bespoke/canvas.css` and `bespoke/builder.css`: the toolbar is docked in normal flow inside `#previewToolbarMount` at every width above 760px. Remove the floating, absolute and sidebar-form variants and the CSS `order` hack at `canvas.css:98`.
- Modify: `bespoke/index.html` and `bespoke/builder-app.mjs`:
  - Delete `#btnCloseOptions` and the "Hide slide options" control, so `#btnHideDrawer` is the only visible close button.
  - Hide `#stepCount` while the drawer is open on `slides`.
  - Wrap `#readabilityNotes` in a `<details>` whose summary reads `<n> readability note` or `<n> readability notes`.
  - Hide `.similarity` on `slides`.
  - Add `#startingFrom` above the toolbar.
  - Track `ui.changedKinds` (a Set, cleared on stage change), filled from `changedKinds` in the change path, and render a `.changed-tag` reading `changed` on rail thumbnails, plus a `just-changed` class for 1 second.
- Test: `scripts/test-bespoke-showcase.mjs`. Update `scripts/test-bespoke-canvas-shell.mjs` (font is now in the toolbar; the toolbar is docked, not floating).

**Interfaces:**
- Consumes: `sharedParts`, `changedKinds`, `designChanges`, `displayTitle` (Task 1).
- Produces:
  - `host.scopeLine(kind, selected, key): string` in the preview-editor host. Its exact copy:
    - shared: `"<Color> also changes the <Part>, because they share a color."`, listing up to three parts and then `"and N more"`, followed by a `Change only this slide…` button (`#btnOnlyThisSlide`) that opens the drawer and focuses `#context-only-slide`;
    - only-slide on: `"This color stays on the <Slide name> only."`;
    - sidebar, accent and buttons: `"Changes the sidebar on every slide."`, `"Changes the accent on every slide."`, `"Changes the buttons on every slide."`.
  - `#startingFrom` text: `Starting from <name> · <n> changes`, with the count left out when `n` is 0, or `Your design` when `ui.appliedLook` is null. It also holds a `Swap starting look` button, `#btnSwapLook`, that goes to `start`.

- [ ] **Step 1: Write the failing cases**:
  - `toolbar stays above the slide and on screen`:
    1. For each size 1440x900, 1280x800 and 1024x768, and for each of the drawer closed and the drawer open (`#btnMoreOptions`), select `#modelStage .slide-title-text` on Title.
    2. Expect `rect('#contextToolbar').bottom <= rect('#modelStage .bespoke-slide').top` and `rect('#contextToolbar').bottom <= innerHeight`.
    3. Expect no overlap between `#contextToolbar` and any of `#btnPresent`, the Try another version button, or `.similarity`.
    4. Repeat with a box text on Text boxes.
  - `font is in the toolbar`: `#contextToolbar #context-font` is visible for a text selection. The focus order of the toolbar's fields matches their left-to-right order.
  - `swatches carry names`: open the color well. Each swatch's visible text equals its `catalog.palette` name.
  - `scope line names the divider`:
    1. Apply `fun` and Make it ours, select the Title heading, and choose Gold.
    2. `#scopeLine` reads `Gold also changes the Divider heading, because they share a color.`
    3. `[data-rail-kind="divider"] .changed-tag` is visible.
    4. On the Divider tab, the heading's computed color is `rgb(211, 178, 87)`.
    5. `#startingFrom` reads `Starting from Midnight & gold · 2 changes`.
  - `only this slide line`: click `#btnOnlyThisSlide`. Focus is on `#context-only-slide`. Check it. `#scopeLine` reads `This color stays on the Title slide only.`
  - `one close button in the drawer`: with the drawer open, the only visible buttons in `#chromeRail` whose text matches `/hide|close/i` are `#btnHideDrawer`.
  - Review Focus 2, `unknown look reads Your design`: remove `appliedLook` from the saved draft in `localStorage` and reload. `#startingFrom` reads `Your design`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the changes listed under Files. Take the band layout from `docs/bespoke/showcase-mockup-flow-2026-10-19.html`, screen 3.
- [ ] **Step 4: Run** `node scripts/test-bespoke-showcase.mjs`, `node scripts/test-bespoke-canvas-shell.mjs` and `bash scripts/quality.sh`. Expect PASS and exit 0.
- [ ] **Step 5: Commit** `feat: dock the BeSpoke toolbar and say what a change touches`

### Task 6: Send

**Files:**
- Create: `bespoke/send-stage.mjs`
- Modify: `bespoke/builder-app.mjs`:
  - `renderPanel` calls `renderSendStage` for `review`.
  - `renderReview` and the Shared theme render into the See every setting body that the host provides.
  - `updateSimilarity` also fills `#sendSimilarity`.
  - Add `sendFeedback(message)`, which writes into `#sendFeedback` when on `review`. `cloudSave` and `cloudSend` call it for success and pending states.
- Modify: `bespoke/showcase.css` (Send layout; `.editor-selected` gets no outline inside `#showcase`)
- Test: `scripts/test-bespoke-showcase.mjs`

**Interfaces:**
- Consumes: `lookDetail`, `designChanges`, `slideOptions` (Task 1).
- Produces: `renderSendStage(root, host: SendHost)`, where `SendHost` is:
  `{catalog, Model, design(), options(design), look(): LookDetail|null, changes(): string[], similarity(): {shared:number,total:number}|null, fillSimilarityDetails(el): void, fillAllSettings(el): void, notesField(): HTMLElement, save(): void, send(): void, localPreview: boolean, openKind(kind): void}`.
- Element ids and fixed copy:
  - `#sendDeck`: five renders; clicking one calls `openKind`.
  - `#sendPanel`.
  - `#sendHeading`: `<name>, made yours`, or `Your design`.
  - `#sendLook`, `#sendFonts`, `#sendChanges`: up to three changes joined with ` · `, then `and N more`. The row is absent when the look is unknown or the list is empty.
  - Notes label `Anything Britt should know?`.
  - `#btnSendSave`: `Save for the team`, or the local label `Save test design`.
  - `#btnSendToBritt`: `Send to Britt →`, hidden in the local preview like today's `#btnSend`.
  - `#sendSimilarity`: `Shares <shared> of <total> choices with the released lessons`, followed by a `See the comparison` button that toggles today's details.
  - The small print `This is a suggestion. Britt and the program administrator choose the final design.`
  - `#sendFeedback`.
  - `#allSettings`: a closed `<details>` with summary `See every setting`.

- [ ] **Step 1: Write the failing cases**:
  - `send shows the deck and a plain summary`:
    1. Apply `fun`, Make it ours, set the Title heading to Gold, and go to `#stage-review`.
    2. `#sendDeck .bespoke-slide` count is 5.
    3. `#sendHeading` reads `Midnight & gold, made yours`.
    4. `#sendChanges` reads `Title text in Gold · Divider heading in Gold`.
    5. `#showcase .editor-selected` count is 0.
    6. `#sendSimilarity` matches `/^Shares \d+ of \d+ choices with the released lessons/`.
    7. `#allSettings` is closed and contains `#effectiveDesignSummary`.
  - `send actions stay in view`: at 1280x800 on `#stage-review`, `#btnSendSave` lies inside the viewport without scrolling. Click it. `#sendFeedback` gains text and `#fileStatus` stays hidden.
  - `clicking a deck slide opens it`: click the third slide in `#sendDeck`. `data-stage` is `slides` and `#previewName` reads `Text boxes`.
  - Review Focus 2, `unknown look on Send`: with `appliedLook` removed as in Task 5, `#sendHeading` reads `Your design` and `#sendChanges` count is 0.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** using screen 4 of the flow mockup. The panel is `position: sticky` from 1101px up.
- [ ] **Step 4: Run** the suite and `bash scripts/quality.sh`. Expect PASS and exit 0. Update any test that read Review rows from the old panel position.
- [ ] **Step 5: Commit** `feat: turn BeSpoke Review & save into the Send stage`

### Task 7: Sent to Britt

**Files:**
- Modify: `bespoke/send-stage.mjs`: add `renderSentView(root, host)`.
- Modify: `bespoke/builder-app.mjs`:
  - `rememberReceipt` (:873) stores `designKey: designKey(state.design)` on `ui.teamSession.lastReceipt`.
  - The Send render chooses with `sentState(ui.teamSession?.lastReceipt, designKey(state.design))`: `'sent'` renders the sent view, `'changed'` adds `#sentChangedNote` above the summary.
  - A pending submission shows `Sending to Britt…` in `#sendFeedback`.
  - A send confirmed on another stage calls `successNotice('Sent to Britt.')`.
- Modify: `bespoke/showcase.css` (fan layout and its settle animation)
- Modify: `scripts/test-bespoke-review-delivery-browser.mjs`

**Interfaces:**
- Consumes: `sentState`, `designKey` (Task 1). `SendHost` (Task 6), plus `host.receipt(): {url?:string, receivedAt:string}|null`, `host.lessonTitle(): string`, `host.keepEditing(): void` and `host.downloadCopy(): void`, which calls the existing backup download.
- Fixed copy:
  - `#sentView` heading: `Sent to Britt`.
  - Body: `Your <lesson> suggestion, <design name>, is on its way. Britt and the program administrator will use it when they make the final design.` `<design name>` is `<name>, made yours`, or `your design` when the look is unknown.
  - Buttons `#btnKeepEditing` (`Keep editing`) and `#btnDownloadCopy` (`Download a copy`).
  - A closed `<details id="sentDetails">` with summary `Details` that holds the receipt link.
  - `#sentChangedNote`: `Sent to Britt on <date>. You have changed it since.`, with `<date>` from `toLocaleDateString()`.

- [ ] **Step 1: Extend the failing test** in `scripts/test-bespoke-review-delivery-browser.mjs`, after the existing reload check:
  1. Click `#stage-review`. `#sentView` is visible and contains `Sent to Britt`, and `#sentDetails a` has `href === url` while `#sentDetails` is closed.
  2. Reload and click `#stage-review` again. `#sentView` is still visible.
  3. Go to `#stage-slides`, change one color, and return. `#sentView` is absent and `#sentChangedNote` reads `/^Sent to Britt on .+\. You have changed it since\.$/`.
  The existing `#lastReviewReceipt` assertions stay as they are.
- [ ] **Step 2: Run** `node scripts/test-bespoke-review-delivery-browser.mjs`. Expect FAIL (`#sentView` not found).
- [ ] **Step 3: Implement.** Take the layout from screen ✓ of the flow mockup.
- [ ] **Step 4: Run** it and `bash scripts/quality.sh`. Expect PASS and exit 0.
- [ ] **Step 5: Commit** `feat: show a Sent to Britt confirmation on the Send stage`

### Task 8: Motion, type scale and design record

**Files:**
- Modify: `bespoke/showcase.css`. All motion goes inside `@media (prefers-reduced-motion: no-preference)`, with exactly these durations:
  - stage cross-fade on preview and apply: 200ms;
  - rail glow: 1s, once;
  - toast fade and slide: 180ms;
  - sent fan settle: 400ms, once.
  Nothing loops.
- Modify: `bespoke/builder.css`, `bespoke/canvas.css`, `bespoke/guide.css`, `bespoke/showcase.css`:
  - Add a chrome type scale as `:root` custom properties `--fs-*`, at most 8 steps, and use only those for chrome `font-size`.
  - Replace or tokenize `#44536a`, `#647487` and `#8191a3`.
  - Bring the radius values the critique flagged onto the existing radius tokens.
- Modify: `bespoke/DESIGN.md`: stage names, Pick a look, toolbar band, scope line, named swatches, toast, Send, Sent to Britt, motion table, type scale. Remove the preset-dialog and scope-badge sections.
- Modify: `docs/bespoke/decisions.md`: add a row dated 2026-10-19 covering:
  - the stage names;
  - the dialog replaced by Undo;
  - the scope badge replaced by the scope line;
  - the similarity meter moving to one line on Send, which replaces the September 24 "prominent" placement.
- Test: `scripts/test-bespoke-showcase.mjs`

- [ ] **Step 1: Write the failing cases**:
  - `reduced motion stops new animation`: with `reducedMotion: 'reduce'`, after a hover preview, an apply, a color change on Make it yours and a toast, `document.getAnimations().length === 0`.
  - `motion runs when allowed`: with `reducedMotion: 'no-preference'`, the same apply produces at least one animation, and none has `iterations === Infinity`.
  - `chrome uses the type scale`: every computed chrome `font-size` (elements outside `.bespoke-slide` and shadow roots) is one of the `--fs-*` values read from `getComputedStyle(document.documentElement)`.
  - `chrome controls are at least 44px`: every element from `chromeControls(page)` on each of the four stages has a height of at least 44, or sits in a `label` that does.
- [ ] **Step 2: Run, expect FAIL** on `chrome uses the type scale`.
- [ ] **Step 3: Implement** the motion and the token changes, then update `DESIGN.md` and `decisions.md`.
- [ ] **Step 4: Run** the suite and `bash scripts/quality.sh`. Expect PASS and exit 0. Run `instruction-lint bespoke/DESIGN.md docs/bespoke/decisions.md` if the hook flags either file, and fix any FAIL.
- [ ] **Step 5: Commit** `feat: add BeSpoke showcase motion and a chrome type scale`

### Task 9: Gate, critique and pull request

**Files:**
- Modify: `scripts/quality.sh` (add `node scripts/test-bespoke-showcase.mjs` to the browser block after `test-bespoke-canvas-shell.mjs`, if that file is in the block; otherwise after `test-bespoke-sidebar.mjs`)
- Create: `.impeccable/critique/<timestamp>__bespoke-index-html.md` (written by the critique helper)

- [ ] **Step 1: Run the whole gate and the definition-of-done checks from the spec**
  Run: `bash scripts/quality.sh; echo exit=$?` → `exit=0`.
  Run: `git diff --diff-filter=D --name-only a8b73fc..HEAD -- scripts/` → no output.
  Run: `git diff a8b73fc..HEAD --stat -- netlify bespoke/builder-model.mjs bespoke/builder-catalog.json bespoke/catalog.json bespoke/selection.schema.json bespoke/selection-v2.schema.json "SPOKES Builder"` → no output.
  Run: `git diff a8b73fc..HEAD -- bespoke | grep -nE '^\+.*(disabled|block|prevent).*(contrast|readab)'` → no output.
- [ ] **Step 2: Run a fresh `impeccable critique`** of `bespoke/index.html` against the local preview, using the dual-agent method, and save the snapshot. Record the score whether or not it reaches 30/40.
- [ ] **Step 3: Commit** `test: run the BeSpoke showcase suite in the quality gate`, including the critique snapshot.
- [ ] **Step 4: Push and open the PR.** If PR #56 has merged, use base `main`; otherwise use base `claude/bespoke-simplify-choices-02762b`.
  - Push the branch as its own command: `git push -u origin claude/bespoke-showcase-polish`.
  - Open the PR with `gh pr create --repo doclegg05/Curriculum-Employability-Skills`.
  - The description lists every changed test expectation from Tasks 2 to 7, the critique score, a note that no Netlify redeploy is needed (with the Step 1 diff as proof), and a test plan with unchecked items for Britt's 1280x800 look at the three screens and a Safari run (`BESPOKE_BROWSER=webkit node scripts/test-bespoke-showcase.mjs`).
  - Britt merges. Do not merge.
