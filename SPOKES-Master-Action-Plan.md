# SPOKES Master Action Plan

Compiled from: 4 skill evaluations (design-system, accessibility, visual-design, project-planner), Gemini team review, and user direction.

**Date:** 2026-02-27 (last updated: 2026-04-03)
**Status:** Sprints 1-2 complete. Sprint 3 partially complete. Two new lessons built (Communicating with the Public, Controlling Anger) — in QA.

---

## Issues Register (All Sources Combined)

### CRITICAL — Must fix before any lesson ships

**All critical issues resolved as of 2026-03-01.** All 3 lessons release-approved with 5/5 quality gates passing.

| #   | Issue                                           | Status       | Resolution                                                     |
| --- | ----------------------------------------------- | ------------ | -------------------------------------------------------------- |
| C1  | Theme override ordering (TM + IS)               | **RESOLVED** | Theme-override blocks moved after main CSS in both lessons     |
| C2  | Zero ARIA attributes                            | **RESOLVED** | ARIA attributes added across all lessons                       |
| C3  | Navigation elements are `<span>` not `<button>` | **RESOLVED** | Replaced with proper `<button>` elements                       |
| C4  | No `prefers-reduced-motion`                     | **RESOLVED** | Motion query added; all animations/confetti/sounds disabled    |
| C5  | Color contrast failures                         | **RESOLVED** | Gold text uses `--muted-gold`; accent restricted to large text |
| C6  | Off-brand colors in Time Management             | **RESOLVED** | All colors replaced with 11-color palette                      |
| C7  | Off-brand colors in Interview Skills            | **RESOLVED** | Rebuilt on standard template; `#dc2626` removed                |

### HIGH — Fix in current sprint

| #   | Issue                                      | Status       | Resolution                                                                                 |
| --- | ------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------ |
| H1  | No `--font-heading` / `--font-body` tokens | **RESOLVED** | Font tokens added to template and lessons                                                  |
| H2  | Template variants don't exist              | **OPEN**     | Registry defines 4 variant names but CSS not yet documented. See Task 1.3 in project plan. |
| H3  | Off-palette hex values in template         | **RESOLVED** | All off-palette colors replaced with brand palette                                         |
| H4  | No skip link                               | **RESOLVED** | Skip link added                                                                            |
| H5  | No focus management on slide change        | **RESOLVED** | Focus moves to active slide heading on navigation                                          |
| H6  | 5 Cs flip cards inaccessible               | **RESOLVED** | Keyboard handlers and tabindex added                                                       |
| H7  | AudioContext created unguarded             | **RESOLVED** | Wrapped in try/catch                                                                       |
| H8  | Duplicate video URL in Time Management     | **OPEN**     | Still needs user confirmation (see Open Decisions D5)                                      |

### MEDIUM — Fix in next sprint

| #   | Issue                                                 | Status                 | Resolution                                                                                                                                                                              |
| --- | ----------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `target="_blank"` missing `rel="noopener noreferrer"` | **RESOLVED**           | Added to all external links                                                                                                                                                             |
| M2  | Sub-1rem text sizes                                   | **RESOLVED**           | Minimum sizes bumped to 1.1rem+                                                                                                                                                         |
| M3  | No spacing tokens                                     | **OPEN**               | Low priority; arbitrary literals still in use                                                                                                                                           |
| M4  | Video placeholder CSS duplicated                      | **RESOLVED**           | Moved into main CSS block                                                                                                                                                               |
| M5  | Template vs Employee Accountability sizing divergence | **RESOLVED**           | Template updated to match proven larger sizes                                                                                                                                           |
| M6  | No lesson registry                                    | **RESOLVED**           | `lesson-registry.json` created with variant, font, color, combinatorics, and quality gate tracking                                                                                      |
| M7  | Component library needs additions                     | **PARTIALLY RESOLVED** | Advanced components added (glass card, stagger reveal, gradient divider, clip-path, magnetic button, counter). Additional candidates (process-flow, comparison-columns) still possible. |
| M8  | Font override selector list incomplete                | **RESOLVED**           | Selector list expanded in `AGENT_THEMING_GUIDELINES.md`; font tokens (`--font-heading`, `--font-body`) reduce the need for manual selector lists                                        |

### LOW — Backlog

| #   | Issue                                                 | Source              |
| --- | ----------------------------------------------------- | ------------------- |
| L1  | No print stylesheet                                   | Design system audit |
| L2  | No design system versioning/changelog                 | Design system audit |
| L3  | No high-contrast mode                                 | Accessibility audit |
| L4  | Collapsed sidebar `<a>` elements remain in tab order  | Accessibility audit |
| L5  | Space key hijacks standard button activation globally | Accessibility audit |

---

## Decisions (Locked and Open)

### Locked

| #   | Decision                    | Final Value                                                                                                                                                                                                                                                            |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Accessibility rollout model | Phased WCAG 2.2 AA: Phase 1 hard gate for release, Phase 2 fast follow                                                                                                                                                                                                 |
| D2  | Color policy                | Strict fixed 11-color brand palette only, with controlled per-lesson mixing of major/minor color emphasis. No non-canonical hex values.                                                                                                                                |
| D3  | Output architecture         | Single self-contained `index.html` per lesson                                                                                                                                                                                                                          |
| D4  | Video handling rule         | Local HTML5 `<video>` if MP4 provided; placeholder if missing                                                                                                                                                                                                          |
| D6  | Interactive baseline        | Minimum 3 qualifying interactions per lesson. Qualifying types: flip cards, clickable matrix, tabs/accordions, step reveal, quiz/checkpoint. If present, they must be functionally interactive.                                                                        |
| D7  | Device QA matrix            | Lock required viewports: mobile `360x800`, tablet `768x1024`, desktop `1920x1080`. Desktop/tablet must show sidebar + active slide on one screen; mobile must show full active slide with sidebar available by toggle. No horizontal panning at any required viewport. |
| D8  | Color schema approval       | Superseded 2026-10-22 (open design standard, decision 11): builder-made designs need no color sign-off, and a BeSpoke design is used only after Britt approves it. Was: user must approve final color schema for each lesson before build finalization/release.                                                                                                                                                                                |

### Open

| #   | Question                                                               | Required Input                                |
| --- | ---------------------------------------------------------------------- | --------------------------------------------- |
| D5  | Duplicate YouTube URL in Time Management (`AtoVhZOWQZU` appears twice) | Confirm intentional or provide corrected link |

---

## Execution Plan

### Sprint 1: Stabilize the Template — COMPLETE

**Completed:** All template stabilization tasks finished. All 14 items resolved. Template is stable and frozen per governance policy.

### Sprint 2: Fix Time Management + Interview Skills — COMPLETE

**Completed:** 2026-03-01. Both lessons rebuilt on stabilized template, release-approved with all 5 quality gates passing. See `docs/qa-reports/` for evidence.

**Still open from Sprint 2:** H8 (duplicate video URL in Time Management) — awaiting user input on D5.

### Sprint 3: Template Variants + Font Library — PARTIALLY COMPLETE

| Task                                                                        | Issues Addressed | Status                                                                                                                     |
| --------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Design and implement 3-4 template variants as documented CSS class systems. | H2               | **TODO** — variant names defined in registry but CSS not documented                                                        |
| Curate a library of 18+ Google Font pairings.                               | Project plan     | **DONE** — `SPOKES Builder/font-pairings.md` created 2026-04-02 with 20 pairings (18 available)                            |
| Create `lesson-registry.json` manifest.                                     | M6               | **DONE** — registry active with variant, font, color, combinatorics, and gate tracking                                     |
| Add new components to `components.md`.                                      | M7               | **DONE** — 6 advanced components added (glass card, stagger reveal, gradient divider, clip-path, magnetic button, counter) |
| Document combinatorics design system.                                       | New              | **DONE** — added to `AGENT_THEMING_GUIDELINES.md`, `build-process.md`, `CLAUDE.md` (2026-03-09)                            |

### Sprint 4: New Lesson Builds — IN PROGRESS

Two lessons built 2026-04-02, font CSS variables fixed 2026-04-03:

| Lesson | Slides | Interactions | Videos | Status |
|--------|--------|-------------|--------|--------|
| Communicating with the Public | 33 (7 ch) | 8 (tabs, accordion, flip cards, matrix, prompts, video grid, checkpoint, reveals) | 8 embedded | QA |
| Controlling Anger | 31 (7 ch) | 6 (tabs, spinner wheel, accordion, Jeopardy, matrix, checkpoint) | 4 embedded | QA |

Both use `--font-heading` / `--font-body` CSS variables. Quality gates pending formal pass.

### Sprint 5-8: Production (13 Remaining Lessons)

Build in batches of 3, with 2-3 lessons in parallel per batch. Each batch follows:

1. Content intake review (from 6 teams using `content-intake-template.md`)
2. Variant + font assignment (using registry to avoid collisions)
3. Parallel build via agent swarm
4. Quality gate (automated brand check + manual visual review)
5. Delivery + stakeholder sign-off

**Estimated total: 55-85 hours across 5 batches**

### Deferred (Revisit Later)

| Item                                                                     | When                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Video integration (replace placeholders with local HTML5 `<video>` tags) | When MP4 files are provided                                                       |
| YouTube `<iframe>` embedding                                             | Deprecated in Phase 2. All videos must be downloaded locally to `videos/` folder. |
| Print stylesheet                                                         | After all 18 lessons are built                                                    |
| High-contrast accessibility mode                                         | After core accessibility is complete                                              |
| Design system versioning/changelog                                       | After template is stable                                                          |

---

## Conflicts Resolved

| Conflict                                                                     | Resolution                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini suggests per-lesson custom color palettes                             | **Partially adopted with constraints.** Lessons may mix color emphasis differently per module, but only using the canonical 11-color palette and contrast/anti-clash guardrails. No external custom hex colors are allowed. |
| Gemini suggests external CSS/JS files (`globals.css`)                        | **Overridden.** User decided on single self-contained `index.html` per lesson. Portability for classroom deployment is the priority.                                                                                        |
| Gemini suggests `<object>` or `<iframe>` PDF embedding                       | **Partially adopted.** We already use download links for PDFs. Inline PDF viewing is a possible future enhancement but not in scope now.                                                                                    |
| Template says "DO NOT MODIFY" but has off-palette colors                     | **Template will be updated.** The immutable CSS block needs a one-time correction to remove contradictions, then re-frozen.                                                                                                 |
| AGENT_THEMING_GUIDELINES says to freely choose `--primary`/`--accent` colors | **Already fixed.** Guidelines were rewritten to enforce the 11-color palette.                                                                                                                                               |
