# BeSpoke showcase polish: design

- **Date:** 2026-10-19
- **Status:** approved by Britt on 2026-10-19. Builder check done; its answers are marked "My call, from the builder check".
- **Base:** PR #56 head `a8b73fc` (`claude/bespoke-simplify-choices-02762b`). Work happens on `claude/bespoke-showcase-polish`, which starts from that commit.
- **Approved mockups:** [Pick a look](../../bespoke/showcase-mockup-pick-a-look-2026-10-19.html) (option A) and [Make it yours, Send, After Send](../../bespoke/showcase-mockup-flow-2026-10-19.html). They are static pictures. Where this spec and a mockup disagree, this spec wins.
- **Critique this answers:** `.impeccable/critique/2026-10-19T15-43-48Z__bespoke-index-html.md` (22/40, findings F1 to F6).

## Problem

Britt's words: the flow and design are "still very rigid. Very cookie cutter." Teams like starting from a preset and finishing from it, and that stays. What has to change is how the tool treats their choice. Today a team picks one of twelve identical-looking cards, the screen jumps to a settings panel, the name of the look they chose disappears, and the flow ends on a long list of settings. Nothing on screen says "this is ours."

The audience is a team of four or so teachers on a Teams call. One spokesperson shares their screen and drives. Everyone else sees a compressed copy of that screen and talks about it. Whatever the spokesperson does has to be visible, readable at reduced resolution, and easy to talk about ("try the berry one").

Britt chose the bolder showcase direction: the slides become the biggest thing on screen at every stage, and the controls get quieter around them. She chose all six critique findings in one pass.

## Constraints

### Files that must not change

`scripts/bespoke-stage-service.mjs` lists what the Netlify service is built from. Its list is the authority. At the base commit it includes `bespoke/builder-model.mjs`, `bespoke/builder-catalog.json`, `bespoke/catalog.json`, both selection schemas, the library catalog under `SPOKES Builder/`, and everything under `netlify/`. None of these may change. The check is in Acceptance.

### Decisions that stay

From `docs/bespoke/decisions.md` and the PR #56 commits:

- Four stages, Lesson & team first (October 9). This spec renames three of them and keeps their order and internal ids (`team`, `start`, `slides`, `review`).
- Twelve editable presets (October 15). Every choice stays editable after a pick.
- A color picked in the toolbar or in Guide me applies to every slide that shares that color. The Only this slide switch keeps a color on one slide (October 7, `82bd860`). The switch lives in the Slide options drawer, not the floating toolbar (`a8b73fc`).
- Send is receipt-confirmed and goes to Britt. A design is a suggestion. Britt and the program administrator make the final design.
- The local preview (`scripts/bespoke-dev-server.mjs`) uses synthetic storage and blocks Send.
- Undo, Redo, Try another version, Compare A and B, Present, browser recovery and downloadable backups all stay.

### Builder chrome rules that stay

- 44px minimum target for every control in the chrome. This includes the four stage pills, which are 36px today and must grow.
- Visible keyboard focus, keyboard operation of every new control, and the visual order of each toolbar and strip matching its tab order.
- `prefers-reduced-motion: reduce` turns off every animation this spec adds.
- Outfit for all chrome text. Lesson fonts only appear inside slide renders and as the displayed name of a look.

### Screen sizes

Designed at 1440x900 and 1280x800, which match school laptops. Must work at 1024x768 with nothing overlapping and no control off screen. At 760px and narrower the existing stacked layout stays. It must still function with the renamed stages and new pieces, and does not need the showcase layout.

## Solution

### Goals

1. Picking a look is something the team watches happen. The chosen look fills a large stage with its name, and the team can preview other looks before committing.
2. The team's choice stays visible as theirs through to the end: "Starting from Midnight & gold · 2 changes" in Make it yours, "Midnight & gold, made yours" at Send.
3. In Make it yours, the controls for whatever the spokesperson clicked are always next to the slide and fully on screen, and the tool says in plain words which other slides a change touches.
4. Send ends on a picture of the deck the team is suggesting and a confirmation screen the whole call can see.
5. One name for each thing, in the words a teacher would use.

### Non-goals

- No change to what a design can contain. The saved design format, the model, the catalog of presets and colors, and the service stay exactly as PR #56 leaves them.
- No change to the tablet and phone layouts (760px and narrower) beyond keeping them working.
- No redesign of Guide me's question flow. It keeps its questions and its place behind a button.
- No new presets, colors or fonts.

### Anti-goals

Any of these makes the work a failure even if everything else passes:

- A readability, contrast or accessibility warning, gate or test on what a team picks for their slides. BeSpoke is advisory. The builder's own buttons, labels and focus still meet the accessibility rules below.
- A Netlify redeploy becomes necessary. That happens if any file the service stage copies changes (see Constraints).
- The tool hides or limits the twelve looks, the eleven colors or the twelve fonts.
- The tool reverses a recorded decision without Britt saying so (see Constraints).
- A lesson name typed by the team is saved into the design as sample text without the team doing it themselves.

### Design

#### Stage names

| Internal id | Today | New |
|---|---|---|
| `team` | Lesson & team | Lesson & team |
| `start` | Color & layout (heading "Start with color", button "Continue to starting looks") | Pick a look |
| `slides` | Customize | Make it yours |
| `review` | Review & save | Send |

Every place a stage is named uses the new name: stage pills, panel headings, Back and Continue buttons, How it works, `bespoke/team-guide.html`, `bespoke/DESIGN.md`, notices, and tests. Pills show a number and the name ("2 · Pick a look"), with a check mark on stages already passed, as in the mockups.

#### Pick a look

The stage has two parts. A large stage on top shows the current look. A filmstrip underneath holds the looks to choose from.

**The stage (left, about 60% of the width).** A large render of the current look's title slide, with the lesson name as its title (see Lesson name on slides) and the team's existing sample subtitle.

**Beside the stage (right column):**
- A small label: "Your starting look".
- The look's name (`colorLabel`, for example "Midnight & gold") in large display type.
- One line of plain detail: the layout name and the font pair, for example "Framed layout · DM Serif Display headings with Outfit text".
- The look's main colors as dots, each with its palette name as an accessible label and tooltip.
- Small renders of the other four slide types: divider, text boxes, video and activity.
- A primary button, **Make it ours →**, and an **Undo** link that appears after a look has been applied on this stage.

**The filmstrip.** A row of mood chips: All 12, Calm, Bold, Bright, Classic. Then the looks as small slide renders with their names underneath. The title on every render is the lesson's name. **Build my own** and **Guide me** sit as text buttons at the right end of the mood row.

- When the team arrives on Pick a look with a design of their own, the tool keeps a snapshot of it, and the first card is **Your design**, rendered from that snapshot with a dashed outline. A design of their own means `ui.meaningfulDesign` is true and the design matches none of the twelve looks. Clicking the card restores the snapshot as one undo step, and the remembered look becomes unknown. Teams arriving with no design of their own see no card. This replaces "Continue your current design", "Customize current design" and "Use current design". (My call, from the builder check.)
- **Build my own** is a thirteenth starting point. It applies the builder's default design with the team's sample words kept, as one undo step, and goes to Make it yours. The Your design card is how a team gets back to their own work. (My call, from the builder check.)
- Moods group the looks. Britt approved this grouping:

| Mood | Looks |
|---|---|
| Bold | Midnight & gold, Bold berry |
| Bright | Fresh green, Ocean blue, Botanical light |
| Calm | Graphite, Green & ink, Soft silver |
| Classic | Paper & berry, Warm gold, Berry on white, Golden light |

  The mood map lives in builder chrome code, keyed by preset id. It does not go in `builder-catalog.json`. A preset id missing from the map shows under All 12 only.

**Behavior:**
- **Hover or keyboard focus on a look previews it** in the stage and the side column without applying it, using the same quick preview Guide me uses (`updatePreview(trial, {quick: true})`). A preview is not an undo step and does not count as a change. Leaving the strip, or pressing Escape, returns the stage to the applied look. The stage's visible heading says "Previewing Ocean blue" while a preview shows, and a polite live region announces it.
- **Clicking a look or pressing Enter applies it** and stays on Pick a look. Applying records one undo step, as `applyPresetChoice` does today. Applying no longer opens the confirmation dialog (`#presetDialog` and its "don't ask again" checkbox go away). Undo is the safety net, and the Undo link sits next to Make it ours.
- **Make it ours** moves to Make it yours, scrolled to the top, with the title slide showing and focus on the stage heading.
- **Guide me** starts the guide exactly as today.
- The selected look in the strip has a gold outline. The applied look and the previewed look can differ, and both stay clear.
- With no applied look yet, the stage shows the current design and the side column reads "Choose a starting look", with Make it ours still available.

**Arrow keys** move along the filmstrip. Tab leaves it. On wide screens the strip shows all cards that fit and scrolls sideways for the rest. At 1024 wide the side column moves under the stage and the strip scrolls sideways.

#### Keeping the look's name

The tool remembers the id of the last look the team applied and counts changes since then. This is UI state, kept where other UI preferences are kept today (browser draft), not in the saved design.

- In Make it yours, a line under the top bar reads "Starting from **Midnight & gold** · 2 changes", with a **Swap starting look** link back to Pick a look. With no changes, it leaves the count out. When the tool cannot know the look, for example after opening a shared design on another computer, the line reads "Your design" with the Swap link.
- At Send the heading uses the same name (see Send).
- "Changes" means the number of design settings that differ from the starting look applied to the same sample words. It is the same comparison that builds Send's "Your changes" list, so the two always agree. Sample-word edits do not count. Undo lowers the count when it undoes a difference. (My call, from the builder check.)

#### Lesson name on slides

While the team has not typed their own slide title, every render in the builder shows the lesson's name as the title: Pick a look, the rail, Make it yours, Send and After Send. "Untouched" means `design.samples.title` still equals the catalog's default sample title. Renders pass the lesson name through `renderSlide`'s `options.title`. The toolbar's Sample text field shows the lesson name as its value in the same case. Nothing is written to `design.samples.title` until the team edits that field. Once they do, their words show everywhere. The saved design keeps the catalog default until then. (My call, from the builder check.)

#### Make it yours

The slide stays the largest thing on screen. The thumbnail rail of the five slide types stays where it is today on wide screens, labeled "Your slides".

**One toolbar position.** The toolbar sits in a reserved band directly above the slide. It never covers the slide, the rail, Present, Try another version or any other control, and never renders below the bottom of the window. At 1280 and wider it is one row. When it needs more room, the band grows and pushes the slide down rather than letting the toolbar float over things. The 761 to 1100 layout keeps its toolbar above the slide too, instead of turning it into a sidebar form. At 760 and narrower the current behavior stays.

**Toolbar fields for a text selection, in this order** (the mockup leaves out Sample text for space; it stays, because the October 7 decision keeps text editing next to the slide):
1. **Editing:** the selected part, for example "Title text". This is the existing element picker (`#selectedElement`), relabeled from "Selected element".
2. **Sample text**, as today.
3. **Font:** new in the toolbar. It writes the same field the drawer's font control writes for that part, with the drawer's default scope. Today `TEXT_FIELDS` in `canvas-toolbar.mjs` leaves font out.
4. **Size** (segmented control, as today).
5. **Color:** a named swatch and a popover of the eleven colors. Each swatch shows its palette name under the dot.
6. **Align** and **Position** (renamed from "Place in text area").
7. Today's Add text, Remove added text and Use shared defaults actions, where they apply.
8. **More options** at the right end, opening the Slide options drawer.

At 1280 and wider the toolbar uses one row when its fields fit. When they do not, the band grows to a second row. It never overlaps the slide. (My call, from the builder check.)

Non-text selections such as a background or an accent rule keep their current fields, in the same band and order logic.

**Saying what a change touches.** Under the toolbar, one plain line describes the scope of the selected part's color:
- When the color is shared: "Gold also changes the **Divider** heading, because they share a color." It lists the slide parts that share that color, and adds "and N more" after three. A link, **Change only this slide…**, opens the Slide options drawer and moves focus to the Only this slide switch.
- When Only this slide is on: "This color stays on the Title slide only."
- For the sidebar, accent and buttons, which are always shared: "Changes the sidebar on every slide." (and the same wording for the accent and buttons).

The `scope-badge` in `preview-editor.mjs` ("This slide type only" and its variants) goes away, because the line above replaces it and the badge contradicted the switch.

**Showing which slides changed.** When a change alters other slide types, their thumbnails in the rail glow gold for about one second and keep a small "changed" tag until the team leaves the stage. With reduced motion there is no glow, only the tag.

**Drawer clean-up.** The Slide options drawer keeps one visible close button (the pinned Hide options button), plus Escape and Ctrl/Cmd+Alt+O. The duplicate "Hide slide options" and "Close options" buttons and the repeated "Stage 3 of 4" counter inside the drawer go away.

**Readability notes.** The advisory readability notes stay in Make it yours, as the October 7 decision keeps them, but shrink to one line under the slide ("1 readability note") that opens to today's full text. They also appear in Send's See every setting. They never block anything. (My call, from the builder check.)

**Similarity meter.** It leaves Make it yours. Britt decided on 2026-10-19 that it becomes one line on Send (see Send). This replaces the September 24 "prominent advisory meter" placement. The comparison itself, its six reference lessons and its advisory wording do not change.

#### Messages

- Success messages, such as a look applied or a save finished, appear as a short toast at the top of the visible window (fixed position, not at the top of the page), disappear after about four seconds, and are also announced in the existing live region. They never go to the notice strip, so "Bold berry applied" cannot linger onto Send.
- Warnings, conflicts, pending sends and errors keep today's notice strip and today's rules for when it clears. A stage change does not clear them. (My call, from the builder check.)

#### Send

Two columns, as in the mockup.

**Left: the deck.** The five slides of the team's design on one sheet: the title slide large (two columns by two rows), then divider, text boxes, video and activity. These are the existing model renders. Clicking one opens it in Make it yours.

**Right: the summary panel.** It stays in view while the left side scrolls.
- A small label "Your suggestion" and a heading: "**Midnight & gold**, made yours", or "Your design" when the look is unknown.
- Three short rows in plain words:
  - **Look:** look name and layout.
  - **Fonts:** heading and text fonts.
  - **Your changes:** what differs from the starting look, for example "Title text in Gold · Divider heading in Gold". List up to three, then "and N more". Leave the row out when the look is unknown or nothing changed.
- The existing review notes field, labeled "Anything Britt should know?".
- The two existing actions, renamed: **Save for the team** (today's shared save) and **Send to Britt →**. In the local preview they keep today's local labels and Send stays blocked.
- One line for the similarity comparison, for example "Shares 8 of 22 choices with the released lessons", with a **See the comparison** link that opens today's matches, differences and unknowns. No large number, no meter graphic.
- One line of small print: "This is a suggestion. Britt and the program administrator choose the final design."
- Save and send feedback appears inside this panel, next to the buttons, not at the top of the page.
- A **See every setting** disclosure, closed by default, holds today's full Review content (`renderReview`) unchanged: the per-slide rows, readability advice, notes on unused second colors and the rest.

The editing outline from Make it yours (`.editor-selected`) never shows on Send renders.

#### After Send

The confirmation view replaces the Send stage's content, never another stage's. It shows when the latest confirmed receipt (`lastReceipt`, already saved with the team session) matches the current saved design and nothing has been edited since. So it also shows after a reload or the next day. A send started from the More menu on another stage shows a toast, and the confirmation view waits on Send. Once the team edits after sending, Send returns to its normal layout with one line above the summary: "Sent to Britt on <date>. You have changed it since." A pending send shows "Sending to Britt…" inside the summary panel until the poll confirms. (My call, from the builder check.)

The confirmation view contains:
- three of the team's slides fanned out,
- a green check,
- "Sent to Britt",
- "Your Money Management suggestion, **Midnight & gold, made yours**, is on its way. Britt and the program administrator will use it when they make the final design." The tool fills in the lesson and design name.
- two buttons: **Keep editing** (returns to Make it yours) and **Download a copy** (today's backup download).

The draft pull request link that the current receipt shows goes into a small closed "Details" disclosure under the buttons, for Britt's troubleshooting. A failed or pending send keeps today's messages and retry behavior.

#### Words

Besides the stage names:

| Today | New |
|---|---|
| Selected element | Editing |
| Match arrangement | Default |
| Place in text area | Position |
| Second background (kept for two colors) | Second color (not used by this layout) |
| Customize current design / Use current design / Continue your current design | Your design (card) and Build my own (button) |
| Save shared design | Save for the team |

How it works (`builderGuidance` in `builder-app.mjs`) is rewritten for the four new stage names. It drops the references to "Open Lesson & team when needed", the "editor sidebar" and "Files & recovery". `bespoke/team-guide.html` gets the same stage names.

#### Motion

The builder has no motion today. This spec adds only:

| Moment | Motion |
|---|---|
| Stage swaps to a previewed or applied look | cross-fade, about 200ms |
| Changed thumbnails in the rail | gold glow, about 1s, once |
| Toast in and out | fade and short slide, about 180ms |
| After Send fan | slides settle into the fan, about 400ms, once |

All of it is off under reduced motion. Nothing loops.

#### Visual tidy-up

- The chrome's 21 font sizes collapse to a small named scale defined as CSS custom properties in `builder.css`, and the chrome uses only those. Slide renders are out of scope.
- The four colors the scan found outside DESIGN.md (`#44536a`, `#647487`, `#8191a3`, and the radius values flagged in the critique) either become documented tokens or are replaced by existing ones.
- `bespoke/DESIGN.md` is updated to match: stage names, Pick a look layout, toolbar position, scope line, named swatches, toast, Send layout, After Send, motion table, type scale. Its sections on the preset confirmation dialog and the scope badge are removed.

## Variables

| Name | Value |
|---|---|
| Base commit | `a8b73fc`, the head of PR #56 |
| Work branch | `claude/bespoke-showcase-polish` |
| Local preview | `node scripts/bespoke-dev-server.mjs --port 8790`, then `http://127.0.0.1:8790/bespoke/` |
| Check sizes | 1440x900, 1280x800, 1024x768 |
| Lesson used in checks | Money Management |
| Service file list | whatever `scripts/bespoke-stage-service.mjs` copies at check time |
| Critique target | 30/40 or better |

## Workflow

Each step ends with `bash scripts/quality.sh` passing before the next one starts.

1. Words and stage names: labels, How it works, team guide, existing tests updated to the new names. No layout change yet.
2. Pick a look: stage, side column, filmstrip, moods, hover preview, apply without the dialog, Undo, Make it ours, remembered look name.
3. Make it yours: toolbar band, Font in the toolbar, named swatches, scope line, changed thumbnails, drawer clean-up, the "Starting from" line.
4. Messages: toast for success, notice strip cleared on stage change.
5. Send and After Send.
6. Motion, then the visual tidy-up and the `bespoke/DESIGN.md` update.
7. New browser test `scripts/test-bespoke-showcase.mjs` covering the behavior checks below, added to `scripts/quality.sh`.
8. Fresh critique, decisions row, PR into `main` after PR #56 merges (or stacked on PR #56's branch if it has not merged yet). Britt merges.

## Deliverables

- Changed builder files under `bespoke/` (chrome only, see Constraints) and `bespoke/team-guide.html`.
- `scripts/test-bespoke-showcase.mjs`, wired into `scripts/quality.sh`, and updated existing BeSpoke browser tests.
- Updated `bespoke/DESIGN.md` and a dated row in `docs/bespoke/decisions.md` covering the stage names, the dialog replaced by Undo, the scope badge replaced by the scope line, and the similarity meter decision.
- A new critique file in `.impeccable/critique/`.
- A PR whose description lists every changed test expectation and a test plan.

## Definition of done

- The quality gate passes, with old-label tests updated rather than deleted.
  - Check: `bash scripts/quality.sh; echo exit=$?`
    Expected: `exit=0`.
  - Check: `git diff --diff-filter=D --name-only a8b73fc..HEAD -- scripts/`
    Expected: no output.
- No file the Netlify service is built from changed, so no redeploy is needed.
  - Check: `git diff a8b73fc..HEAD --stat -- netlify bespoke/builder-model.mjs bespoke/builder-catalog.json bespoke/catalog.json bespoke/selection.schema.json bespoke/selection-v2.schema.json "SPOKES Builder"` after confirming the list against `scripts/bespoke-stage-service.mjs`.
    Expected: no output.
- The showcase behaves as designed at all three sizes: hover and focus preview without an undo step, Escape restores, apply without a dialog, Undo works, Make it ours lands at the top of Make it yours, lesson name on every render while the title sample is untouched, with samples unchanged until the team edits the title, toolbar fully in the window and overlapping nothing (drawer open and closed, Title heading and a text box), the Gold scope line names the Divider heading and tags its thumbnail, both Send actions visible at 1280x800 with feedback beside them.
  - Check: `node scripts/test-bespoke-showcase.mjs`
    Expected: exit 0, with one passing line per behavior and size.
- After Send shows the confirmation view on a confirmed receipt.
  - Check: `node scripts/test-bespoke-review-delivery-browser.mjs`
    Expected: exit 0, including an assertion on the "Sent to Britt" view.
- Reduced motion turns off every new animation, keyboard order matches visual order, and every chrome control is at least 44px tall.
  - Check: `node scripts/test-bespoke-showcase.mjs`
    Expected: its reduced-motion, focus-order and target-size cases pass.
- No readability or contrast gate was added to team choices.
  - Check: `git diff a8b73fc..HEAD -- bespoke | grep -nE '^\+.*(disabled|block|prevent).*(contrast|readab)'`
    Expected: no output.
- The result was critiqued again and the score reported.
  - Check: `grep -h '^total_score' $(ls -t .impeccable/critique/*bespoke-index-html.md | head -1)`
    Expected: a score from a run dated after the work, also stated in the PR whether or not it reaches 30.
- The design reads as a showcase the team can call theirs.
  - Check: Britt reviews the three screens at 1280x800 in the local preview.
    Expected: approved.

## Left to the builder

These are the builder's calls, within the rules above:
- exact widths, spacing and the type scale values,
- how the "also changes" list is computed from the model (it must match what the model actually does on that change),
- how "Your changes" on Send is computed (comparing the design with the starting look applied to the same samples is one way),
- where the remembered look id and change count live in UI state,
- how the stage and filmstrip collapse between 1024 and 1280,
- splitting `builder-app.mjs` work into new modules, as long as each changed file stays under 800 lines where it already is, and no file grows past its current size by more than the new feature needs.
