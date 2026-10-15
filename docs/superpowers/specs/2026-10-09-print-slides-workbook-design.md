# Print slides as a workbook

Date: 2026-10-09
Status: design approved in conversation, spec awaiting Britt's review
Branch: `claude/module-slides-pdf-booklet-2076fb`

## Problem

A teacher asked for a way to print a whole lesson presentation so it can be stapled or kept in a binder like a workbook. Print All already prints a lesson's PDF documents. It cannot print the slides, because the slides live inside the lesson's `index.html` and are not a PDF. The users of the result are SPOKES teachers printing for themselves and for students.

## Solution

A Print slides option in each released lesson, built from saved slide pictures, and the same option built into the standard template for the six Round 2 lessons.

1. 'Print slides dialog' - a button under Print All that opens a dialog with a version choice, a layout choice, and a page count.
2. 'Two versions' - a Student workbook with no answers and a Teacher copy with answers marked.
3. 'Three layouts' - slide with note lines, two slides per page, one full slide per page.
4. 'Workbook pages' - cover page, header, page numbers, on-screen slide numbers, hole-punch margin, video slides left out.
5. 'Picture script' - a Playwright script that saves every slide as a picture in both versions and writes a manifest.
6. 'Freshness check' - a quality gate step that fails when a lesson changed after its pictures were taken.
7. 'Round 2 build step' - template, build process, standard, and component docs updated so new lessons ship with the feature.

## Variables

- `REPO`: the repository root.
- `LESSONS`: the six released lessons, `lesson-communicating-with-the-public`, `lesson-controlling-anger`, `lesson-employee-accountability`, `lesson-interview-skills`, `lesson-problem-solving-and-decision-making`, `lesson-time-management`.
- `PRINT_DIR`: `<lesson>/print/`, which holds the pictures, `manifest.js`, and `print-settings.json`.
- `CAPTURE`: `scripts/capture-print-slides.mjs`.
- `RUNTIME`: `scripts/print-slides.js`.
- `VIEWPORT`: 1600 by 901 CSS pixels, device scale factor 1.5. The lessons switch to a squeezed short-screen layout at `max-height: 900px`, which clips card text, so capture runs one pixel taller.

## Implementation notes

### What Britt decided

- Two versions per lesson, a Student workbook and a Teacher copy.
- Teachers choose the layout at print time, the way PowerPoint's print menu works.
- Slides that are only a video are left out.
- The build approach is saved slide pictures plus a print view inside the lesson. Printing the live slides was rejected because the slides size themselves from the browser window with `vw`, `vh` and `clamp()`, some scroll past the screen, and an 8 inch page triggers the phone layout. Ready-made PDFs were rejected because they need 36 files to store and regenerate.
- Round 2 lessons will be built on the standard SPOKES template, `SPOKES Builder/template.html`. They will not ship on the Claude Design slide engine.

### What the teacher sees

A Print slides button sits directly under the existing Print All button in the lesson sidebar. Print All does not change.

The button opens a dialog with two choices.

- Version: Student workbook or Teacher copy.
- Layout: slide with note lines on a portrait page, two slides per page on a portrait page, or one full slide per page on a landscape page.

The dialog shows the page count for the current choice, for example "29 pages", before the teacher prints. The Print button opens the browser's normal print window. The teacher picks a printer or Save as PDF there and sets copies and double-sided printing.

Every printout has these parts.

- A cover page with the lesson title and the SPOKES logo. The Student workbook adds Name and Date lines. The Teacher copy reads "Teacher copy, includes answers".
- The lesson title at the top of each page and a page number at the bottom.
- A label on each slide with its on-screen slide number, so "turn to slide 12" works on paper.
- A wider margin for a three-hole punch: the left edge on portrait pages, the top edge on landscape pages.

Video slides are left out. Each lesson's settings file lists any slide that pairs a video with text worth keeping. Communicating with the Public slide 19 is the one known case: a grid of four videos with an intro line and a caption under each. On a listed slide each player becomes a box reading "Video: [caption]".

### What goes in each version

The lessons share a small set of click-to-show components. Each kind follows one rule.

| Component | Where it appears | Student workbook | Teacher copy |
|---|---|---|---|
| Tabs | five lessons, all but Time Management | each tab is its own picture, labeled "Slide 14, tab 2 of 3" | same, plus answer tabs |
| Answer tabs | Problem Solving slides 20 and 21, "Expert Answers" and "NASA Answers" | left out | printed |
| Carousel | Employee Accountability slide 33 | each card is its own picture | same |
| Accordions | five lessons | all sections open in one picture, split into one picture per section if too tall to read | same |
| Flip cards, `danger-card` | four lessons | two pictures, all card fronts then all card backs | same |
| Write-in boxes | Controlling Anger reflection, Problem Solving action plan | blank ruled lines | blank ruled lines |
| Quizzes | Controlling Anger, Problem Solving | question and choices, no answer marked | correct answer marked, feedback and explanation printed |
| Checkpoints with an answer | Employee Accountability 27, Interview Skills 32, Time Management 32 | question and choices, no answer marked | correct answer marked, feedback printed |
| Reflection checkpoints | the other checkpoint boxes | printed as on screen | same |
| Matching game | Time Management | scenarios and categories, unmatched | correct matches shown |
| Video player | five lessons | slide left out, or a "Video: [title]" box if listed in settings | same |
| Everything else | all | printed as on screen | same |

"Too tall to read" means the open accordion would need scaling below 75% to fit the slide frame. `CAPTURE` applies this test.

The Teacher copy has the same pages as the Student workbook, plus answers. It does not add presenter notes or teacher's guide text. Those print as separate documents through Print All.

### Picture script

The navigation engine stays untouched, as SPOKES-STANDARD Section 5 requires. `CAPTURE` runs on a developer's computer with Playwright, already a dev dependency. For each lesson it does the following.

1. Opens `<lesson>/index.html` from disk at `VIEWPORT`.
2. Steps through slides with the lesson's own navigation functions.
3. Sorts each slide by the rules above, using `print-settings.json` for exceptions.
4. Applies print states by injecting CSS and clicking the lesson's own controls in the headless browser only. The lesson files on disk do not change.
5. Saves each picture as a JPEG in `PRINT_DIR`. A picture that is identical in both versions is saved once and shared.
6. Writes `PRINT_DIR/manifest.js`.

The manifest is a script that sets `window.SPOKES_PRINT_MANIFEST`. It is not a JSON file because the lessons must work when opened straight from a folder, and browsers block `fetch` on `file://`. It records the SHA-256 fingerprint of the `index.html` the pictures came from, and one entry per printed picture with its slide number, slide title, tab or section label, and its student and teacher picture paths.

`print-settings.json` holds one-off exceptions. It accepts two keys: `keepVideoSlides`, a list of slide numbers, and `teacherOnlyTabs`, a list of tab panel ids. Only `CAPTURE` reads it, so `file://` does not matter there.

`node scripts/capture-print-slides.mjs <lesson-folder>` retakes one lesson. With no argument it retakes all of them. `--check` compares fingerprints without opening a browser.

Expected size is 10 to 15 MB of pictures per lesson, 60 to 90 MB across the six. The lesson loads pictures only when the teacher prints.

### Print feature in the lesson

`RUNTIME` is a shared file, like `scripts/print-planner.js`. Each lesson loads it with one script tag after `print/manifest.js`. It does the following.

1. Adds the Print slides button below Print All.
2. Opens the dialog and computes the page count from the manifest.
3. On Print, builds the pages in a hidden container, injects an `@page` rule for the chosen orientation and margins, waits for every picture to load, then calls `window.print()`.
4. Removes the container and the `@page` rule on `afterprint`.

The page math, meaning which pictures go on which pages for a given version and layout, lives in pure functions in the same file. Tests import them directly.

Employee Accountability carries its own inline copy of the Print All code, not the shared `print-planner.js`. The new button must fit its sidebar too, with no rewrite of its Print All.

### Errors

- If the manifest is missing, the dialog says printable slides have not been made for this lesson yet and Print stays off.
- If a picture fails to load, the dialog names the slide and Print stays off. It never prints a workbook with blank pages.

### Keeping pictures current

`scripts/quality.sh` runs `node scripts/capture-print-slides.mjs --check`. If any lesson's `index.html` fingerprint differs from its manifest, the check fails and prints the command that retakes that lesson. CI runs the same gate.

The fingerprint covers `index.html` only. A changed image file inside a lesson does not trip the check. Lesson images rarely change apart from an edit to `index.html`, so this gap is accepted.

The per-edit validator, `scripts/validate-lesson.py`, checks only that the print script tags are present. It does not check freshness, so it never blocks a lesson edit midway.

### Testing

- Unit tests with `node --test` for the page math: page counts for all six combinations, shared pictures, teacher-only pictures, and the cover page.
- Unit tests for the manifest, settings and `--check` helpers: a matching fingerprint passes and a changed file fails.
- A browser test on a small fixture page for the dialog: button placement, keyboard use, Escape, focus return, an axe check of the open dialog, a missing manifest, and a picture that fails to load. `npm run a11y` audits only the first slide of each lesson and never opens a dialog, so the dialog's axe check lives here. `npm run a11y` must still pass with the new sidebar button.
- A Playwright test that opens each lesson, runs all six combinations, saves each as a PDF with `page.pdf()`, and confirms that the page count matches the dialog, every picture loaded, and each page uses the pictures the manifest names for that version.
- `validate-lesson.py` passes on all six lessons and on `SPOKES Builder/template.html` after the script tags are added.
- A human check. One lesson printed to PDF in all six combinations goes to Britt and the teacher before merge.

### Round 2 lessons

- `SPOKES Builder/template.html` gets the two script tags and the `print/` folder convention, so every new lesson starts with the button. `SPOKES Builder/print/manifest.js` holds an empty placeholder, because the validator's REF-01 rule fails a script link to a missing file. A lesson built from the template shows "not made yet" until its pictures are taken.
- `SPOKES Builder/build-process.md` gets a step after the deck is final: run `CAPTURE`, then review the six sample PDFs.
- `SPOKES-STANDARD.md` gets Section 11, Print, with rule PRT-01. Every lesson loads `print/manifest.js` and `scripts/print-slides.js`. Severity WARN in the per-edit validator. Freshness is enforced by `quality.sh`.
- `SPOKES Builder/components.md` gets a "When printed" line for each component, naming it content or answer. A new click-to-show component must declare this before it ships, and `CAPTURE` must get a matching rule.

## Workflow

1. **Plan.** Write an implementation plan from this spec with the `superpowers:writing-plans` skill. Save it under `docs/superpowers/plans/` before writing any implementation code.
2. **Build.** Implement the plan task by task, in plan order, on `claude/module-slides-pdf-booklet-2076fb`. Start with the page math tests, then `RUNTIME`, then `CAPTURE` on one lesson, then the other five, then the Round 2 docs.
3. **Verify.** Check every Definition of Done item with the command it names. Fix failures and rerun the affected checks. Report actual results, including anything still failing.

## Deliverables

- `scripts/print-slides.js`
- `scripts/capture-print-slides.mjs`
- Tests: page math and `--check` under `node --test`, and a Playwright print test.
- For each of `LESSONS`: a `print/` folder with pictures, `manifest.js`, and `print-settings.json`, plus the two script tags in `index.html`.
- `scripts/quality.sh` running the freshness check and the new tests.
- `scripts/validate-lesson.py` with rule PRT-01.
- `SPOKES-STANDARD.md` Section 11, and updates to `SPOKES Builder/template.html`, `SPOKES Builder/build-process.md`, and `SPOKES Builder/components.md`.
- Six sample PDFs, one lesson in every version and layout, sent to Britt.

## Definition of done

### Workflow completed

- The plan exists and predates the implementation commits.
  - Check: `git log --diff-filter=A --format=%h -- docs/superpowers/plans/*print-slides*`
    Expected: one commit, older than the first commit touching `scripts/print-slides.js`.

### Every lesson prints

- All six lessons load the print feature.
  - Check: `grep -l 'scripts/print-slides.js' lesson-*/index.html | wc -l`
    Expected: `6`.
- Every combination of version and layout prints the promised pages with every picture loaded.
  - Check: the Playwright print test named in the plan.
    Expected: 36 passing cases, six lessons by six combinations, exit code 0.
- The Student workbook hides answers and the Teacher copy shows them.
  - Check: Britt reviews the six sample PDFs, looking at the quiz, checkpoint and matching slides.
    Expected: approved.

### Pictures stay current

- The freshness check passes on a clean tree and fails after an edit.
  - Check: the `--check` unit test named in the plan, then `node scripts/capture-print-slides.mjs --check`.
    Expected: the test passes and the command exits 0.
- The full quality gate passes.
  - Check: `bash scripts/quality.sh`
    Expected: exit code 0.

### The dialog is accessible

- The dialog passes an axe check while open and works by keyboard.
  - Check: `node --test scripts/test-print-slides-browser.mjs`
    Expected: exit code 0.
- The new sidebar button adds no accessibility failures.
  - Check: `npm run a11y`
    Expected: exit code 0.

### Round 2 is covered

- The template carries the feature and passes the validator.
  - Check: `grep -c 'print-slides.js' "SPOKES Builder/template.html" && python3 scripts/validate-lesson.py "SPOKES Builder/template.html"`
    Expected: `1`, then no CRITICAL failures.
- The standard defines PRT-01.
  - Check: `grep -n 'PRT-01' SPOKES-STANDARD.md scripts/validate-lesson.py`
    Expected: at least one line in each file.

## Out of scope

- Folded booklet ordering. Britt confirmed "booklet" meant a stapled or binder workbook.
- Presenter notes and teacher's guide text in the Teacher copy.
- Any change to Print All's existing behavior.
- The Claude Design slide engine, `slides-shared/deck-stage.js`. Round 2 ships on the standard template.
- Changes to the navigation engine or to lesson layouts.
