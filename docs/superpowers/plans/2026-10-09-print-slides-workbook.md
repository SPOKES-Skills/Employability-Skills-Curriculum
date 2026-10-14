# Print Slides Workbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Print slides button to the six released SPOKES lessons that prints the whole deck as a Student workbook or a Teacher copy in three layouts, and make it part of the standard template for Round 2.

**Architecture:** A developer-run Playwright script (`scripts/capture-print-slides.mjs`) photographs every slide state into `lesson-*/print/*.jpg` and writes `print/manifest.js`. A shared browser script (`scripts/print-slides.js`) adds the button and a native `<dialog>`, lays the pictures out for the chosen version and layout in a hidden container, and calls `window.print()`. A fingerprint check in `quality.sh` fails when a lesson changes after its pictures were taken.

**Tech Stack:** Plain browser JavaScript (no build step, must work from `file://`), Node 20+ ESM scripts, Playwright 1.60.0 (Chromium), axe-core 4.13.0, `node:test`, Python 3 `unittest` for the validator.

**Spec:** `docs/superpowers/specs/2026-10-09-print-slides-workbook-design.md`

## Global Constraints

- The lessons open straight from a folder. Nothing may use `fetch`, modules or a server at runtime. Data reaches the page through `<script src="print/manifest.js">`, which sets `window.SPOKES_PRINT_MANIFEST`.
- Do not modify the navigation engine (SPOKES-STANDARD Section 5) or any lesson's CSS or layout. The only lesson edit is two script tags before `</body>`.
- No file more than two folders below the repo root (project `CLAUDE.md`). `lesson-x/print/s01.jpg` and `scripts/test-fixtures/print-slides.html` are fine; `scripts/test-fixtures/x/y.html` is not.
- Colors in injected CSS use the canonical palette only, through `var(--name, #hex)` with the canonical hex as fallback: `--primary #007baf`, `--dark #004071`, `--light #ffffff`, `--muted #edf3f7`, `--gray #60636b`, `--gold #d3b257`, `--royal #00133f`, `--mauve #a7253f`, `--offwhite #d1d3d4`. No other hex values.
- Capture viewport 1600 x 900 CSS px, device scale factor 1.5, JPEG quality 82.
- A lesson's pictures may not exceed 20 MB. The spec estimate is 10 to 15 MB.
- Prose in this repo avoids em dashes. In code, write the lesson title separator as `\u2014` or `&mdash;`.
- Commits use `type: description` subjects with no attribution trailers. Author must be doclegg05.
- Versions: `student`, `teacher`. Layouts: `notes` (portrait, 1 per page, ruled lines), `two` (portrait, 2 per page), `full` (landscape, 1 per page).

## Review Focus

1. A lesson copied to a classroom computer without its `print/` pictures, or with one picture missing. The teacher expects a plain message and no printout with blank boxes. Pinned by the `#broken` and `#none` fixture tests in Task 3.
2. Someone edits a lesson and forgets to retake the pictures. The quality gate must fail and name the fix command. Pinned by the `checkLesson` unit tests in Task 2 and the `--check` run in Task 5.
3. A teacher clicks Print, cancels the browser's print window, changes the layout and prints again. They expect one workbook, not two stacked. Pinned by the "print twice" fixture test in Task 3.
4. A quiz or checkpoint inside a tab that is not showing. The Student workbook must still hide answers, and the capture must not click hidden answer buttons. Pinned by the visibility filter in `clickTeacherControls` and the answer-picture listing in Task 4 Step 6.
5. A slide taller than the screen, such as Employee Accountability slide 30. The picture must include the bottom of the slide, not a clipped screen. Pinned by the tall-slide check in Task 4 Step 7.

---

## File structure

| File | Responsibility |
|---|---|
| `scripts/print-slides.js` | Browser runtime. Pure page math (exported for tests) plus button, dialog, workbook rendering and print. |
| `scripts/print-slides-lib.mjs` | Node helpers: hashing, manifest format and parse, settings validation, freshness check, file names, PDF page count. |
| `scripts/capture-print-slides.mjs` | CLI. Takes pictures with Playwright, writes manifests, and runs `--check`. |
| `scripts/test-print-slides.mjs` | `node:test` unit tests for the runtime's pure functions, loaded with `vm`. |
| `scripts/test-print-slides-lib.mjs` | `node:test` unit tests for the Node helpers. |
| `scripts/test-fixtures/print-slides.html` | Small fixture page for the dialog tests. |
| `scripts/test-print-slides-browser.mjs` | Playwright tests of the dialog on the fixture, including axe. |
| `scripts/test-print-slides-lessons.mjs` | Playwright test: six lessons by six combinations, PDF page counts. |
| `lesson-*/print/print-settings.json` | Per-lesson exceptions: `keepVideoSlides`, `teacherOnlyTabs`. |
| `lesson-*/print/manifest.js`, `lesson-*/print/*.jpg` | Generated pictures and their list. |
| `SPOKES Builder/print/manifest.js` | Placeholder (`null`) so the template passes REF-01. |
| `scripts/validate-lesson.py`, `scripts/test_validator.py` | PRT-01 rule and its tests. |
| `scripts/quality.sh` | Runs the new tests and the freshness check. |
| `SPOKES-STANDARD.md`, `SPOKES Builder/template.html`, `SPOKES Builder/build-process.md`, `SPOKES Builder/components.md` | Round 2 rules and build step. |

---

### Task 1: Page math in the runtime

**Files:**
- Create: `scripts/print-slides.js`
- Test: `scripts/test-print-slides.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces, on `window.SpokesPrintSlides` (or `module.exports`):
  - `LAYOUTS`: `{ notes: {perPage:1, orientation:"portrait", label}, two: {perPage:2, orientation:"portrait", label}, full: {perPage:1, orientation:"landscape", label} }`
  - `VERSIONS`: `{ student: {label:"Student workbook"}, teacher: {label:"Teacher copy"} }`
  - `pictureLabel(picture) -> string`, for example `"Slide 3, tab 2 of 2"`
  - `picturesFor(manifest, version) -> Array<{src, label, slide, width, height}>`
  - `buildPages(manifest, version, layout) -> Array<{kind:"cover"} | {kind:"slides", pictures: Array}>`
  - `manifestProblem(manifest) -> string | null`
  - `versionProblem(manifest, version) -> string | null`
- Manifest shape used everywhere: `{ version: 1, lessonTitle: string, sourceHash: string, pictures: Array<{ slide: int>=1, title: string, label: string, student: string | null, teacher: string, width: int, height: int }> }`. `student: null` means the picture is Teacher copy only. Paths are relative to the lesson's `index.html`, for example `"print/s03-t.jpg"`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-print-slides.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "scripts/print-slides.js"), "utf8"), sandbox);
const Print = sandbox.window.SpokesPrintSlides;
// Objects built inside the vm carry its Array prototype; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));

const manifest = {
  version: 1,
  lessonTitle: "Sample Lesson",
  sourceHash: "abc",
  pictures: [
    { slide: 1, title: "Welcome", label: "", student: "print/s01.jpg", teacher: "print/s01.jpg", width: 2400, height: 1350 },
    { slide: 3, title: "Steps", label: "tab 1 of 2", student: "print/s03.jpg", teacher: "print/s03.jpg", width: 2400, height: 1350 },
    { slide: 3, title: "Steps", label: "tab 2 of 2", student: null, teacher: "print/s03-v2-t.jpg", width: 2400, height: 1350 },
    { slide: 5, title: "Quiz", label: "", student: "print/s05.jpg", teacher: "print/s05-t.jpg", width: 2400, height: 1600 },
  ],
};
const srcs = (pages) => plain(pages.filter((p) => p.kind === "slides").flatMap((p) => p.pictures.map((x) => x.src)));

test("student notes layout is a cover plus one page per student picture", () => {
  const pages = Print.buildPages(manifest, "student", "notes");
  assert.equal(pages.length, 4);
  assert.equal(pages[0].kind, "cover");
  assert.deepEqual(srcs(pages), ["print/s01.jpg", "print/s03.jpg", "print/s05.jpg"]);
});

test("teacher copy adds teacher-only pictures and uses answer pictures", () => {
  const pages = Print.buildPages(manifest, "teacher", "notes");
  assert.equal(pages.length, 5);
  assert.deepEqual(srcs(pages), ["print/s01.jpg", "print/s03.jpg", "print/s03-v2-t.jpg", "print/s05-t.jpg"]);
});

test("two-per-page layout pairs pictures and leaves the last page half full", () => {
  const student = Print.buildPages(manifest, "student", "two");
  assert.equal(student.length, 3);
  assert.equal(student[1].pictures.length, 2);
  assert.equal(student[2].pictures.length, 1);
  assert.equal(Print.buildPages(manifest, "teacher", "two").length, 3);
});

test("full layout is one picture per landscape page", () => {
  assert.equal(Print.buildPages(manifest, "teacher", "full").length, 5);
  assert.equal(Print.LAYOUTS.full.orientation, "landscape");
  assert.equal(Print.LAYOUTS.notes.orientation, "portrait");
  assert.equal(Print.LAYOUTS.two.orientation, "portrait");
});

test("labels name the on-screen slide number and the view", () => {
  const labels = Print.buildPages(manifest, "teacher", "notes").slice(1).map((p) => p.pictures[0].label);
  assert.deepEqual(plain(labels), ["Slide 1", "Slide 3, tab 1 of 2", "Slide 3, tab 2 of 2", "Slide 5"]);
});

test("unknown version or layout throws", () => {
  assert.throws(() => Print.buildPages(manifest, "parent", "notes"), /Unknown version/);
  assert.throws(() => Print.buildPages(manifest, "student", "four"), /Unknown layout/);
});

test("manifestProblem explains a missing or damaged manifest", () => {
  assert.match(Print.manifestProblem(undefined), /not been made/);
  assert.match(Print.manifestProblem(null), /not been made/);
  assert.match(Print.manifestProblem({ lessonTitle: "X", pictures: [] }), /not been made/);
  assert.match(Print.manifestProblem({ lessonTitle: "X", pictures: [{ slide: 1, student: null, teacher: "" }] }), /damaged/);
  assert.match(Print.manifestProblem({ pictures: [manifest.pictures[0]] }), /damaged/);
  assert.equal(Print.manifestProblem(manifest), null);
});

test("a version with nothing to print is reported", () => {
  const teacherOnly = { ...manifest, pictures: [manifest.pictures[2]] };
  assert.match(Print.versionProblem(teacherOnly, "student"), /no slides/);
  assert.equal(Print.versionProblem(teacherOnly, "teacher"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-print-slides.mjs`
Expected: FAIL with `ENOENT: no such file or directory, open '.../scripts/print-slides.js'`.

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/print-slides.js`:

```js
/* SPOKES Print slides.
   Prints a lesson's slides as a workbook from the pictures listed in
   print/manifest.js (window.SPOKES_PRINT_MANIFEST), which
   scripts/capture-print-slides.mjs writes. Loaded after print/manifest.js. */
(function (root) {
  "use strict";

  const LAYOUTS = Object.freeze({
    notes: Object.freeze({ perPage: 1, orientation: "portrait", label: "Slide with note lines" }),
    two: Object.freeze({ perPage: 2, orientation: "portrait", label: "Two slides per page" }),
    full: Object.freeze({ perPage: 1, orientation: "landscape", label: "One full slide per page" })
  });
  const VERSIONS = Object.freeze({
    student: Object.freeze({ label: "Student workbook" }),
    teacher: Object.freeze({ label: "Teacher copy" })
  });
  const NOT_MADE = "Printable slides have not been made for this lesson yet.";
  const DAMAGED = "This lesson's list of printable slides is damaged. Ask the curriculum team to retake the print pictures.";

  function pictureLabel(picture) {
    return picture.label ? "Slide " + picture.slide + ", " + picture.label : "Slide " + picture.slide;
  }

  function picturesFor(manifest, version) {
    if (!VERSIONS[version]) throw new Error("Unknown version: " + version);
    return manifest.pictures
      .filter(function (picture) { return version === "teacher" || picture.student !== null; })
      .map(function (picture) {
        return {
          src: version === "teacher" ? picture.teacher : picture.student,
          label: pictureLabel(picture),
          slide: picture.slide,
          width: picture.width,
          height: picture.height
        };
      });
  }

  function buildPages(manifest, version, layout) {
    if (!LAYOUTS[layout]) throw new Error("Unknown layout: " + layout);
    const pictures = picturesFor(manifest, version);
    const perPage = LAYOUTS[layout].perPage;
    const pages = [{ kind: "cover" }];
    for (let i = 0; i < pictures.length; i += perPage) {
      pages.push({ kind: "slides", pictures: pictures.slice(i, i + perPage) });
    }
    return pages;
  }

  function isPath(value) {
    return typeof value === "string" && value !== "";
  }

  function manifestProblem(manifest) {
    if (!manifest || !Array.isArray(manifest.pictures) || manifest.pictures.length === 0) return NOT_MADE;
    const valid = typeof manifest.lessonTitle === "string" && manifest.pictures.every(function (picture) {
      return Number.isInteger(picture.slide) && picture.slide > 0 &&
        isPath(picture.teacher) && (picture.student === null || isPath(picture.student));
    });
    return valid ? null : DAMAGED;
  }

  function versionProblem(manifest, version) {
    return picturesFor(manifest, version).length === 0
      ? "The " + VERSIONS[version].label.toLowerCase() + " has no slides to print."
      : null;
  }

  const api = Object.freeze({
    LAYOUTS: LAYOUTS,
    VERSIONS: VERSIONS,
    pictureLabel: pictureLabel,
    picturesFor: picturesFor,
    buildPages: buildPages,
    manifestProblem: manifestProblem,
    versionProblem: versionProblem
  });

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SpokesPrintSlides = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-print-slides.mjs`
Expected: PASS, `# pass 8`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/print-slides.js scripts/test-print-slides.mjs
git commit -m "feat: add print slides page math"
```

---

### Task 2: Node helpers for manifests, settings and the freshness check

**Files:**
- Create: `scripts/print-slides-lib.mjs`
- Test: `scripts/test-print-slides-lib.mjs`

**Interfaces:**
- Consumes: the manifest shape from Task 1.
- Produces (named ESM exports):
  - `sha256(content: string | Buffer) -> string` (hex)
  - `formatManifest(manifest) -> string` (the full `manifest.js` source)
  - `parseManifest(source: string) -> object | null` (throws if the global is not assigned)
  - `checkLesson(indexHtml: string | Buffer, manifestSource: string | null) -> { ok: boolean, reason: string }`
  - `missingPictures(manifest, exists: (relPath) => boolean) -> string[]`
  - `parseSettings(text: string, source: string) -> { keepVideoSlides: number[], teacherOnlyTabs: string[] }` (frozen)
  - `pictureFileName(slide: number, viewIndex: number, version: "student" | "teacher") -> string`
  - `lessonTitleFrom(documentTitle: string) -> string`
  - `pdfPageCount(pdf: Buffer) -> number`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-print-slides-lib.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLesson, formatManifest, lessonTitleFrom, missingPictures, parseManifest,
  parseSettings, pdfPageCount, pictureFileName, sha256,
} from "./print-slides-lib.mjs";

const html = "<html><body>v1</body></html>";
const manifest = {
  version: 1,
  lessonTitle: "Sample",
  sourceHash: sha256(html),
  pictures: [{ slide: 2, title: "T", label: "", student: "print/s02.jpg", teacher: "print/s02-t.jpg", width: 10, height: 5 }],
};

test("formatManifest round-trips through parseManifest", () => {
  const source = formatManifest(manifest);
  assert.match(source, /^\/\/ Generated by scripts\/capture-print-slides\.mjs/);
  assert.match(source, /window\.SPOKES_PRINT_MANIFEST = \{/);
  assert.deepEqual(parseManifest(source), manifest);
});

test("parseManifest reads the template placeholder as null", () => {
  assert.equal(parseManifest("// Placeholder\nwindow.SPOKES_PRINT_MANIFEST = null;\n"), null);
});

test("parseManifest rejects a file that does not set the global", () => {
  assert.throws(() => parseManifest("var x = 1;"), /does not set window\.SPOKES_PRINT_MANIFEST/);
});

test("checkLesson passes when the fingerprint matches", () => {
  assert.deepEqual(checkLesson(html, formatManifest(manifest)), { ok: true, reason: "" });
  assert.equal(checkLesson(Buffer.from(html), formatManifest(manifest)).ok, true);
});

test("checkLesson fails after index.html changes", () => {
  const result = checkLesson(html.replace("v1", "v2"), formatManifest(manifest));
  assert.equal(result.ok, false);
  assert.match(result.reason, /index\.html changed after the print pictures were taken/);
});

test("checkLesson fails on a missing, placeholder or unreadable manifest", () => {
  assert.match(checkLesson(html, null).reason, /print\/manifest\.js is missing/);
  assert.match(checkLesson(html, "window.SPOKES_PRINT_MANIFEST = null;").reason, /have not been taken/);
  assert.match(checkLesson(html, "window.SPOKES_PRINT_MANIFEST = {oops;").reason, /unreadable/);
});

test("missingPictures lists each absent file once, in manifest order", () => {
  const shared = { ...manifest, pictures: [...manifest.pictures, { ...manifest.pictures[0], slide: 3 }] };
  assert.deepEqual(missingPictures(shared, (file) => file === "print/s02.jpg"), ["print/s02-t.jpg"]);
  assert.deepEqual(missingPictures(manifest, () => true), []);
});

test("parseSettings fills defaults and accepts known keys", () => {
  assert.deepEqual(parseSettings("{}", "x"), { keepVideoSlides: [], teacherOnlyTabs: [] });
  assert.deepEqual(
    parseSettings('{"keepVideoSlides":[19],"teacherOnlyTabs":["sea-answers"]}', "x"),
    { keepVideoSlides: [19], teacherOnlyTabs: ["sea-answers"] },
  );
  assert.ok(Object.isFrozen(parseSettings("{}", "x")));
});

test("parseSettings rejects unknown keys and bad values with the file name", () => {
  assert.throws(() => parseSettings('{"keepVideo":[1]}', "a.json"), /a\.json: unknown setting "keepVideo"/);
  assert.throws(() => parseSettings('{"keepVideoSlides":[0]}', "a.json"), /keepVideoSlides/);
  assert.throws(() => parseSettings('{"teacherOnlyTabs":[""]}', "a.json"), /teacherOnlyTabs/);
  assert.throws(() => parseSettings("[]", "a.json"), /must be a JSON object/);
});

test("pictureFileName is stable and readable", () => {
  assert.equal(pictureFileName(3, 0, "student"), "s03.jpg");
  assert.equal(pictureFileName(3, 1, "teacher"), "s03-v2-t.jpg");
  assert.equal(pictureFileName(12, 0, "teacher"), "s12-t.jpg");
});

test("lessonTitleFrom strips the SPOKES suffix", () => {
  assert.equal(lessonTitleFrom("Time Management \u2014 SPOKES"), "Time Management");
  assert.equal(lessonTitleFrom("Problem-Solving & Decision-Making \u2014 SPOKES"), "Problem-Solving & Decision-Making");
  assert.equal(lessonTitleFrom("Plain Title"), "Plain Title");
});

test("pdfPageCount counts page objects and ignores the page tree", () => {
  const fake = Buffer.from("<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type/Page /Parent 1 0 R >>");
  assert.equal(pdfPageCount(fake), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-print-slides-lib.mjs`
Expected: FAIL with `Cannot find module '.../scripts/print-slides-lib.mjs'`.

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/print-slides-lib.mjs`:

```js
// Node-side helpers for the Print slides workbook: manifest files, per-lesson
// settings, and the freshness check run by scripts/quality.sh.
import crypto from "node:crypto";

const GLOBAL = "window.SPOKES_PRINT_MANIFEST";
const HEADER = "// Generated by scripts/capture-print-slides.mjs. Do not edit by hand.\n";
const SETTINGS_KEYS = new Set(["keepVideoSlides", "teacherOnlyTabs"]);

export function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function formatManifest(manifest) {
  return `${HEADER}${GLOBAL} = ${JSON.stringify(manifest, null, 2)};\n`;
}

export function parseManifest(source) {
  const marker = `${GLOBAL} = `;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`manifest does not set ${GLOBAL}`);
  const body = source.slice(start + marker.length).trim().replace(/;$/, "");
  return JSON.parse(body);
}

export function checkLesson(indexHtml, manifestSource) {
  if (manifestSource === null) return { ok: false, reason: "print/manifest.js is missing" };
  let manifest;
  try {
    manifest = parseManifest(manifestSource);
  } catch (error) {
    return { ok: false, reason: `print/manifest.js is unreadable (${error.message})` };
  }
  if (manifest === null) return { ok: false, reason: "print pictures have not been taken" };
  if (manifest.sourceHash !== sha256(indexHtml)) {
    return { ok: false, reason: "index.html changed after the print pictures were taken" };
  }
  return { ok: true, reason: "" };
}

export function missingPictures(manifest, exists) {
  const files = manifest.pictures.flatMap((picture) => [picture.student, picture.teacher]).filter(Boolean);
  return [...new Set(files)].filter((file) => !exists(file));
}

export function parseSettings(text, source) {
  const raw = JSON.parse(text);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${source}: settings must be a JSON object`);
  }
  const unknown = Object.keys(raw).find((key) => !SETTINGS_KEYS.has(key));
  if (unknown) throw new Error(`${source}: unknown setting "${unknown}"`);
  const keep = raw.keepVideoSlides ?? [];
  const tabs = raw.teacherOnlyTabs ?? [];
  if (!Array.isArray(keep) || !keep.every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error(`${source}: keepVideoSlides must be a list of slide numbers starting at 1`);
  }
  if (!Array.isArray(tabs) || !tabs.every((id) => typeof id === "string" && id !== "")) {
    throw new Error(`${source}: teacherOnlyTabs must be a list of tab panel ids`);
  }
  return Object.freeze({ keepVideoSlides: Object.freeze([...keep]), teacherOnlyTabs: Object.freeze([...tabs]) });
}

export function pictureFileName(slide, viewIndex, version) {
  const view = viewIndex > 0 ? `-v${viewIndex + 1}` : "";
  const teacher = version === "teacher" ? "-t" : "";
  return `s${String(slide).padStart(2, "0")}${view}${teacher}.jpg`;
}

export function lessonTitleFrom(documentTitle) {
  return documentTitle.replace(/\s+\u2014\s+SPOKES$/, "").trim();
}

export function pdfPageCount(pdf) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-print-slides-lib.mjs`
Expected: PASS, `# pass 12`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/print-slides-lib.mjs scripts/test-print-slides-lib.mjs
git commit -m "feat: add print slides manifest and freshness helpers"
```

---

### Task 3: Print slides button, dialog and workbook pages

**Files:**
- Modify: `scripts/print-slides.js` (add the DOM half below the pure functions, before `const api`)
- Create: `scripts/test-fixtures/print-slides.html`
- Test: `scripts/test-print-slides-browser.mjs`

**Interfaces:**
- Consumes: `buildPages`, `manifestProblem`, `versionProblem`, `LAYOUTS` from Task 1; `pdfPageCount` from Task 2.
- Produces, in the page DOM (later tasks and tests rely on these exact names):
  - Button `button.print-slides-btn`, text "Print slides", inserted right after `.print-all-btn` inside `.resources-section`, else after `.resources-title`, else first in the section.
  - `<dialog id="spokesPrintSlides">` containing radios `input[name="spVersion"]` (values `student`, `teacher`) and `input[name="spLayout"]` (values `notes`, `two`, `full`), `p.sp-count`, `p.sp-status`, `button.sp-cancel`, `button.sp-print`.
  - While printing: `div#spokes-print-root.sp-layout-<layout>` holding `section.sp-page` elements, `img.sp-picture[data-sp-label]`, `p.sp-cover-version`; `<style id="spokes-print-page">` with the `@page` rule; `body.sp-printing`.
  - Cleanup on the window `afterprint` event.

- [ ] **Step 1: Write the fixture page**

Create `scripts/test-fixtures/print-slides.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Fixture Lesson &mdash; SPOKES</title>
</head>
<body>
  <div class="container">
    <nav class="sidebar" aria-label="Lesson navigation">
      <div class="sidebar-title">Fixture Lesson</div>
      <div class="resources-section">
        <div class="resources-title">Resources</div>
        <button class="print-all-btn" type="button">Print All</button>
        <a class="resource-link" href="#plan">Lesson Plan</a>
      </div>
    </nav>
    <main class="main"><section class="slide active"><h1>Fixture</h1></section></main>
  </div>
  <img class="branding-logo" src="../../SPOKES-Logo.png" alt="">
  <script>
    // Every picture reuses the repo logo so the fixture needs no slide pictures.
    // #none simulates a lesson whose pictures were never taken; #broken a missing file.
    var picture = "../../SPOKES-Logo.png";
    window.SPOKES_PRINT_MANIFEST = location.hash === "#none" ? null : {
      version: 1,
      lessonTitle: "Fixture Lesson",
      sourceHash: "fixture",
      pictures: [
        { slide: 1, title: "One", label: "", student: picture, teacher: picture, width: 2400, height: 1350 },
        { slide: 2, title: "Two", label: "", student: picture, teacher: picture, width: 2400, height: 1350 },
        { slide: 3, title: "Quiz", label: "", student: picture,
          teacher: location.hash === "#broken" ? "missing-picture.jpg" : picture, width: 2400, height: 1350 }
      ]
    };
  </script>
  <script src="../print-slides.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the failing test**

Create `scripts/test-print-slides-browser.mjs`:

```js
// Dialog and print-view behavior of scripts/print-slides.js on a fixture page.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { pdfPageCount } from "./print-slides-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const fixtureUrl = pathToFileURL(path.join(root, "scripts/test-fixtures/print-slides.html")).href;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
let browser;

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function openFixture(hash = "") {
  const page = await browser.newPage();
  await page.goto(fixtureUrl + hash, { waitUntil: "load" });
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls += 1; };
  });
  return page;
}

const dialogOpen = (page) => page.evaluate(() => document.getElementById("spokesPrintSlides").open);

test("button sits right after Print All", async () => {
  const page = await openFixture();
  assert.equal(await page.evaluate(() => document.querySelector(".print-all-btn").nextElementSibling.className), "print-slides-btn");
  assert.equal(await page.textContent(".print-slides-btn"), "Print slides");
  await page.close();
});

test("keyboard opens and Escape closes, returning focus to the button", async () => {
  const page = await openFixture();
  await page.focus(".print-slides-btn");
  await page.keyboard.press("Enter");
  assert.equal(await dialogOpen(page), true);
  await page.keyboard.press("Escape");
  assert.equal(await dialogOpen(page), false);
  assert.equal(await page.evaluate(() => document.activeElement.className), "print-slides-btn");
  await page.close();
});

test("open dialog has no axe violations", async () => {
  const page = await openFixture();
  await page.click(".print-slides-btn");
  await page.addScriptTag({ content: await readFile(require.resolve("axe-core/axe.min.js"), "utf8") });
  const ids = await page.evaluate(async (tags) => {
    const result = await window.axe.run("#spokesPrintSlides", { runOnly: { type: "tag", values: tags } });
    return result.violations.map((v) => `${v.id}: ${v.nodes.length}`);
  }, AXE_TAGS);
  assert.deepEqual(ids, []);
  await page.close();
});

test("page count follows the version and layout choice", async () => {
  const page = await openFixture();
  await page.click(".print-slides-btn");
  assert.equal(await page.textContent(".sp-count"), "4 pages including the cover");
  await page.check('input[name="spLayout"][value="two"]');
  assert.equal(await page.textContent(".sp-count"), "3 pages including the cover");
  await page.close();
});

test("print builds the workbook, then afterprint removes it", async () => {
  const page = await openFixture();
  await page.click(".print-slides-btn");
  await page.check('input[name="spVersion"][value="teacher"]');
  await page.click(".sp-print");
  await page.waitForFunction(() => window.__printCalls === 1);
  const info = await page.evaluate(() => ({
    pages: document.querySelectorAll("#spokes-print-root .sp-page").length,
    printing: document.body.classList.contains("sp-printing"),
    rule: document.getElementById("spokes-print-page").textContent,
    cover: document.querySelector(".sp-cover-version").textContent,
    labels: [...document.querySelectorAll("img.sp-picture")].map((img) => img.dataset.spLabel),
    open: document.getElementById("spokesPrintSlides").open,
  }));
  assert.deepEqual(info, {
    pages: 4,
    printing: true,
    rule: "@page { size: letter portrait; margin: 0.5in 0.5in 0.5in 1in; }",
    cover: "Teacher copy, includes answers",
    labels: ["Slide 1", "Slide 2", "Slide 3"],
    open: false,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  assert.equal(await page.evaluate(() => document.getElementById("spokes-print-root")), null);
  assert.equal(await page.evaluate(() => document.body.classList.contains("sp-printing")), false);
  await page.close();
});

test("printing twice without afterprint leaves one workbook", async () => {
  const page = await openFixture();
  for (const layout of ["notes", "full"]) {
    await page.click(".print-slides-btn");
    await page.check(`input[name="spLayout"][value="${layout}"]`);
    await page.click(".sp-print");
  }
  await page.waitForFunction(() => window.__printCalls === 2);
  assert.equal(await page.evaluate(() => document.querySelectorAll("#spokes-print-root").length), 1);
  assert.equal(await page.evaluate(() => document.querySelectorAll("#spokes-print-page").length), 1);
  assert.match(await page.evaluate(() => document.getElementById("spokes-print-page").textContent), /letter landscape/);
  await page.close();
});

test("a picture that fails to load stops printing and says which slide", async () => {
  const page = await openFixture("#broken");
  await page.click(".print-slides-btn");
  await page.check('input[name="spVersion"][value="teacher"]');
  await page.click(".sp-print");
  await page.waitForSelector(".sp-status:not([hidden])");
  assert.match(await page.textContent(".sp-status"), /Slide 3 could not be loaded, so nothing was printed/);
  assert.equal(await page.evaluate(() => window.__printCalls), 0);
  assert.equal(await page.evaluate(() => document.getElementById("spokes-print-root")), null);
  assert.equal(await dialogOpen(page), true);
  await page.close();
});

test("a lesson without pictures explains and disables Print", async () => {
  const page = await openFixture("#none");
  await page.click(".print-slides-btn");
  assert.match(await page.textContent(".sp-status"), /have not been made for this lesson yet/);
  assert.equal(await page.isDisabled(".sp-print"), true);
  assert.equal(await page.textContent(".sp-count"), "");
  await page.close();
});

test("the printed PDF has exactly the promised pages in every layout", async () => {
  const page = await openFixture();
  for (const [layout, expected] of [["notes", 4], ["two", 3], ["full", 4]]) {
    await page.click(".print-slides-btn");
    await page.check(`input[name="spLayout"][value="${layout}"]`);
    await page.click(".sp-print");
    await page.waitForSelector("#spokes-print-root");
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    assert.equal(pdfPageCount(pdf), expected, `${layout} layout`);
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  }
  await page.close();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/test-print-slides-browser.mjs`
Expected: FAIL. The first test fails with `TypeError: Cannot read properties of null (reading 'className')` because no button exists yet.

- [ ] **Step 4: Add the DOM half to `scripts/print-slides.js`**

Insert this block directly above the line `const api = Object.freeze({`:

```js
  // ---- Page side ----------------------------------------------------------
  const BUTTON_CLASS = "print-slides-btn";
  const DIALOG_ID = "spokesPrintSlides";
  const ROOT_ID = "spokes-print-root";
  const PAGE_RULE_ID = "spokes-print-page";
  const STYLE_ID = "spokes-print-slides-styles";
  const PAGE_RULES = Object.freeze({
    portrait: "@page { size: letter portrait; margin: 0.5in 0.5in 0.5in 1in; }",
    landscape: "@page { size: letter landscape; margin: 1in 0.5in 0.5in 0.5in; }"
  });

  const STYLES = [
    ".print-slides-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;",
    "  margin: 0 0 0.85rem; padding: 0.65rem 0.75rem; border: 1px solid rgba(211,178,87,0.72); border-radius: 8px;",
    "  background: transparent; color: var(--light, #ffffff); font-family: var(--font-body, inherit);",
    "  font-size: 0.82rem; font-weight: 700; cursor: pointer; }",
    ".print-slides-btn::before { content: \"\\2399\"; color: var(--gold, #d3b257); font-size: 1rem; line-height: 1; }",
    ".print-slides-btn:hover, .print-slides-btn:focus-visible { background: rgba(211,178,87,0.16);",
    "  outline: 2px solid var(--gold, #d3b257); outline-offset: 2px; }",
    ".sp-dialog { width: calc(100% - 2rem); max-width: 30rem; border: none; border-radius: 12px; padding: 1.5rem;",
    "  background: var(--light, #ffffff); color: var(--royal, #00133f); font-family: var(--font-body, Arial, sans-serif);",
    "  box-shadow: 0 18px 50px rgba(0,19,63,0.35); }",
    ".sp-dialog::backdrop { background: rgba(0,19,63,0.55); }",
    ".sp-dialog h2 { margin: 0 0 1rem; font-size: 1.35rem; color: var(--royal, #00133f); }",
    ".sp-dialog fieldset { margin: 0 0 1rem; padding: 0.75rem 1rem; border: 1px solid var(--offwhite, #d1d3d4); border-radius: 8px; }",
    ".sp-dialog legend { padding: 0 0.35rem; font-weight: 700; }",
    ".sp-dialog label { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; cursor: pointer; }",
    ".sp-count { margin: 0 0 0.75rem; font-weight: 700; }",
    ".sp-status { margin: 0 0 0.75rem; padding: 0.6rem 0.75rem; border-radius: 6px;",
    "  background: rgba(167,37,63,0.08); color: var(--mauve, #a7253f); }",
    ".sp-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }",
    ".sp-actions button { min-height: 44px; padding: 0.5rem 1.1rem; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; }",
    ".sp-cancel { background: var(--light, #ffffff); border: 1px solid var(--gray, #60636b); color: var(--royal, #00133f); }",
    ".sp-print { background: var(--dark, #004071); border: 1px solid var(--dark, #004071); color: var(--light, #ffffff); }",
    ".sp-print:disabled { background: var(--offwhite, #d1d3d4); border-color: var(--offwhite, #d1d3d4); color: var(--royal, #00133f); cursor: not-allowed; }",
    ".sp-dialog button:focus-visible, .sp-dialog input:focus-visible { outline: 3px solid var(--primary, #007baf); outline-offset: 2px; }",
    "#spokes-print-root { display: none; }",
    "@media print {",
    "  html, body { height: auto !important; overflow: visible !important; background: var(--light, #ffffff) !important; }",
    "  body.sp-printing > *:not(#spokes-print-root) { display: none !important; }",
    "  body.sp-printing #spokes-print-root { display: block; color: var(--royal, #00133f); font-family: Arial, Helvetica, sans-serif; }",
    "  .sp-page { box-sizing: border-box; width: 7in; height: calc(10in - 2px); display: flex; flex-direction: column;",
    "    overflow: hidden; break-after: page; page-break-after: always; }",
    "  .sp-layout-full .sp-page { width: 10in; height: calc(6.5in - 2px); }",
    "  .sp-page:last-child { break-after: auto; page-break-after: auto; }",
    "  .sp-head { box-sizing: border-box; height: 0.35in; padding-bottom: 0.08in; font-size: 10pt; font-weight: 700;",
    "    border-bottom: 1px solid var(--gray, #60636b); }",
    "  .sp-foot { box-sizing: border-box; height: 0.35in; padding-top: 0.1in; font-size: 9pt; text-align: right; }",
    "  .sp-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.2in; padding-top: 0.15in; }",
    "  .sp-slot { margin: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; }",
    "  .sp-picture { display: block; max-width: 100%; object-fit: contain; border: 1px solid var(--offwhite, #d1d3d4); }",
    "  .sp-slot figcaption { margin-top: 0.05in; font-size: 9pt; }",
    "  .sp-layout-notes .sp-picture { max-height: 4.3in; }",
    "  .sp-layout-two .sp-slot { flex: 1; }",
    "  .sp-layout-two .sp-picture { max-height: 4.1in; }",
    "  .sp-layout-full .sp-picture { max-height: 5.3in; }",
    "  .sp-lines { flex: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact;",
    "    background: repeating-linear-gradient(to bottom, transparent 0, transparent 0.33in, var(--gray, #60636b) 0.33in, var(--gray, #60636b) calc(0.33in + 1px)); }",
    "  .sp-cover { justify-content: center; align-items: center; gap: 0.3in; text-align: center; }",
    "  .sp-logo { max-width: 3in; max-height: 1.5in; }",
    "  .sp-cover h1 { margin: 0; font-size: 30pt; }",
    "  .sp-cover-version { margin: 0; font-size: 14pt; }",
    "  .sp-write { width: 4.5in; margin: 0; padding-bottom: 0.05in; text-align: left; font-size: 13pt;",
    "    border-bottom: 1px solid var(--royal, #00133f); }",
    "}"
  ].join("\n");

  const DIALOG_HTML = [
    '<h2 id="spokesPrintSlidesTitle">Print slides</h2>',
    "<fieldset><legend>Version</legend>",
    '<label><input type="radio" name="spVersion" value="student" checked> Student workbook</label>',
    '<label><input type="radio" name="spVersion" value="teacher"> Teacher copy, includes answers</label>',
    "</fieldset>",
    "<fieldset><legend>Layout</legend>",
    '<label><input type="radio" name="spLayout" value="notes" checked> Slide with note lines</label>',
    '<label><input type="radio" name="spLayout" value="two"> Two slides per page</label>',
    '<label><input type="radio" name="spLayout" value="full"> One full slide per page, landscape</label>',
    "</fieldset>",
    '<p class="sp-count" aria-live="polite"></p>',
    '<p class="sp-status" role="alert" hidden></p>',
    '<div class="sp-actions">',
    '<button type="button" class="sp-cancel">Cancel</button>',
    '<button type="button" class="sp-print">Print</button>',
    "</div>"
  ].join("");

  function el(tag, props, children) {
    const node = document.createElement(tag);
    const options = props || {};
    if (options.id) node.id = options.id;
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    document.head.appendChild(el("style", { id: STYLE_ID, text: STYLES }));
  }

  function ensureButton() {
    const section = document.querySelector(".resources-section");
    if (!section) return null;
    const existing = section.querySelector("." + BUTTON_CLASS);
    if (existing) return existing;
    const button = el("button", { className: BUTTON_CLASS, text: "Print slides" });
    button.type = "button";
    const anchor = section.querySelector(".print-all-btn") || section.querySelector(".resources-title");
    if (anchor) anchor.after(button);
    else section.prepend(button);
    return button;
  }

  function ensureDialog() {
    const existing = document.getElementById(DIALOG_ID);
    if (existing) return existing;
    const dialog = el("dialog", { id: DIALOG_ID, className: "sp-dialog" });
    dialog.setAttribute("aria-labelledby", "spokesPrintSlidesTitle");
    dialog.innerHTML = DIALOG_HTML;
    document.body.appendChild(dialog);
    return dialog;
  }

  function selected(dialog, name) {
    return dialog.querySelector('input[name="' + name + '"]:checked').value;
  }

  function showStatus(dialog, message) {
    const status = dialog.querySelector(".sp-status");
    status.hidden = !message;
    status.textContent = message || "";
  }

  function refreshDialog(dialog) {
    const manifest = root.SPOKES_PRINT_MANIFEST;
    const version = selected(dialog, "spVersion");
    const problem = manifestProblem(manifest) || versionProblem(manifest, version);
    showStatus(dialog, problem);
    dialog.querySelector(".sp-print").disabled = Boolean(problem);
    dialog.querySelector(".sp-count").textContent = problem
      ? ""
      : buildPages(manifest, version, selected(dialog, "spLayout")).length + " pages including the cover";
  }

  function logoSource() {
    const logo = document.querySelector(".branding-logo");
    return logo ? logo.getAttribute("src") : "SPOKES-Logo.png";
  }

  function renderCover(context) {
    const logo = el("img", { className: "sp-logo" });
    logo.alt = "SPOKES";
    logo.onerror = function () { logo.remove(); };
    logo.src = context.logoSrc;
    const isTeacher = context.version === "teacher";
    const parts = [
      logo,
      el("h1", { text: context.manifest.lessonTitle }),
      el("p", { className: "sp-cover-version", text: isTeacher ? "Teacher copy, includes answers" : "Student workbook" })
    ];
    if (!isTeacher) {
      parts.push(el("p", { className: "sp-write", text: "Name" }), el("p", { className: "sp-write", text: "Date" }));
    }
    return el("section", { className: "sp-page sp-cover" }, parts);
  }

  function renderSlidePage(page, context, number, total) {
    const figures = page.pictures.map(function (picture) {
      const img = el("img", { className: "sp-picture" });
      img.alt = picture.label;
      img.dataset.spLabel = picture.label;
      img.src = picture.src;
      return el("figure", { className: "sp-slot" }, [img, el("figcaption", { text: picture.label })]);
    });
    if (context.layout === "notes") {
      const lines = el("div", { className: "sp-lines" });
      lines.setAttribute("aria-hidden", "true");
      figures.push(lines);
    }
    return el("section", { className: "sp-page" }, [
      el("header", { className: "sp-head", text: context.manifest.lessonTitle }),
      el("div", { className: "sp-body" }, figures),
      el("footer", { className: "sp-foot", text: "Page " + number + " of " + total })
    ]);
  }

  function renderWorkbook(pages, context) {
    const sections = pages.map(function (page, index) {
      return page.kind === "cover" ? renderCover(context) : renderSlidePage(page, context, index + 1, pages.length);
    });
    return el("div", { id: ROOT_ID, className: "sp-layout-" + context.layout }, sections);
  }

  function firstFailedPicture(container) {
    const pictures = Array.from(container.querySelectorAll("img.sp-picture"));
    return Promise.all(pictures.map(function (img) {
      return img.decode().then(function () { return null; }, function () { return img.dataset.spLabel; });
    })).then(function (results) { return results.find(Boolean) || null; });
  }

  function cleanupPrint() {
    const workbook = document.getElementById(ROOT_ID);
    if (workbook) workbook.remove();
    const rule = document.getElementById(PAGE_RULE_ID);
    if (rule) rule.remove();
    document.body.classList.remove("sp-printing");
  }

  async function printWorkbook(dialog) {
    cleanupPrint();
    const manifest = root.SPOKES_PRINT_MANIFEST;
    const version = selected(dialog, "spVersion");
    const layout = selected(dialog, "spLayout");
    const context = { manifest: manifest, version: version, layout: layout, logoSrc: logoSource() };
    const workbook = renderWorkbook(buildPages(manifest, version, layout), context);
    document.body.appendChild(workbook);
    const failed = await firstFailedPicture(workbook);
    if (failed) {
      workbook.remove();
      showStatus(dialog, failed + " could not be loaded, so nothing was printed. Ask the curriculum team to retake the print pictures.");
      return;
    }
    document.head.appendChild(el("style", { id: PAGE_RULE_ID, text: PAGE_RULES[LAYOUTS[layout].orientation] }));
    document.body.classList.add("sp-printing");
    dialog.close();
    root.print();
  }

  function bindEvents(button, dialog) {
    button.addEventListener("click", function () {
      refreshDialog(dialog);
      dialog.showModal();
    });
    dialog.addEventListener("change", function () { refreshDialog(dialog); });
    dialog.addEventListener("close", function () { button.focus(); });
    dialog.querySelector(".sp-cancel").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector(".sp-print").addEventListener("click", function () {
      printWorkbook(dialog).catch(function (error) {
        cleanupPrint();
        showStatus(dialog, "Printing stopped: " + error.message);
      });
    });
    root.addEventListener("afterprint", cleanupPrint);
  }

  function init() {
    injectStyles();
    const button = ensureButton();
    if (!button) return;
    bindEvents(button, ensureDialog());
  }
```

Then replace the export footer at the bottom of the file:

```js
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SpokesPrintSlides = api;
```

with:

```js
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SpokesPrintSlides = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
```

- [ ] **Step 5: Run the browser tests**

Run: `node --test scripts/test-print-slides-browser.mjs`
Expected: PASS, `# pass 9`, `# fail 0`.

If the PDF test reports one extra page per layout, a `.sp-page` is overflowing its page box. Reduce the `.sp-page` height in `STYLES` by another `2px`, not the `@page` margins, and rerun.

- [ ] **Step 6: Run the unit tests again to confirm the vm load still skips the DOM**

Run: `node --test scripts/test-print-slides.mjs`
Expected: PASS, `# pass 8`.

- [ ] **Step 7: Commit**

```bash
git add scripts/print-slides.js scripts/test-fixtures/print-slides.html scripts/test-print-slides-browser.mjs
git commit -m "feat: add print slides dialog and workbook pages"
```

---

### Task 4: Picture script, proven on Problem Solving

**Files:**
- Create: `scripts/capture-print-slides.mjs`
- Create: `lesson-problem-solving-and-decision-making/print/print-settings.json`

**Interfaces:**
- Consumes: everything exported by `scripts/print-slides-lib.mjs` (Task 2).
- Produces:
  - CLI `node scripts/capture-print-slides.mjs [lesson-folder ...]` writes `<lesson>/print/*.jpg` and `<lesson>/print/manifest.js`.
  - CLI `node scripts/capture-print-slides.mjs --check [lesson-folder ...]` exits 0 when every lesson is current, 1 otherwise, 2 on bad arguments.
  - Lessons come from `lesson-registry.json` entries whose `path` exists, so Round 2 lessons join automatically when registered.

- [ ] **Step 1: Write the Problem Solving settings**

Create `lesson-problem-solving-and-decision-making/print/print-settings.json`:

```json
{
  "teacherOnlyTabs": ["sea-answers", "lunar-answers"]
}
```

- [ ] **Step 2: Write the script**

Create `scripts/capture-print-slides.mjs`:

```js
#!/usr/bin/env node
// Takes the pictures behind each lesson's Print slides workbook.
//   node scripts/capture-print-slides.mjs                  retake every registered lesson
//   node scripts/capture-print-slides.mjs <lesson-folder>  retake one lesson
//   node scripts/capture-print-slides.mjs --check          exit 1 if any lesson changed since its pictures
// Clicks and CSS are applied only inside the headless browser; lesson files are never edited.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  checkLesson, formatManifest, lessonTitleFrom, missingPictures, parseManifest,
  parseSettings, pictureFileName, sha256,
} from "./print-slides-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIEWPORT = Object.freeze({ width: 1600, height: 900 });
const DEVICE_SCALE = 1.5;
const JPEG_QUALITY = 82;
// An open accordion taller than this would print below 75% scale, so it splits.
const MAX_READABLE_HEIGHT = Math.round(VIEWPORT.height / 0.75);
const MAX_LESSON_BYTES = 20 * 1024 * 1024;
const TEACHER_SELECTORS = Object.freeze([
  '[onclick*="checkQuiz(this, true)"]',
  '[onclick*="checkAnswer(this, true)"]',
  '.qa-choice-btn[data-correct="true"]',
  ".quiz-reveal-btn",
  '.match-control-btn[onclick*="revealMatchingAnswers"]',
]);
const CAPTURE_CSS = `
nav.sidebar, .sidebar-toggle, .progress-bar, .nav-hint, .nav-pos, .branding-logo, .skip-link,
.video-toolbar, .flip-hint, .print-slides-btn, #spokesPrintSlides { display: none !important; }
textarea { color: transparent !important; resize: none !important;
  background: repeating-linear-gradient(to bottom, transparent 0, transparent 35px, #60636b 35px, #60636b 36px) !important; }
textarea::placeholder { color: transparent !important; }
.sp-video-box { display: flex; align-items: center; justify-content: center; aspect-ratio: 16 / 9; width: 100%;
  box-sizing: border-box; padding: 1rem; border: 3px dashed currentColor; border-radius: 12px;
  font-size: 1.3rem; font-weight: 700; text-align: center; }
`;

class UsageError extends Error {}

function registeredLessons() {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "lesson-registry.json"), "utf8"));
  return registry.lessons
    .filter((lesson) => lesson.path && fs.existsSync(path.join(root, lesson.path)))
    .map((lesson) => path.dirname(lesson.path))
    .sort();
}

function parseArgs(argv) {
  const known = registeredLessons();
  const named = argv.filter((arg) => arg !== "--check").map((arg) => arg.replace(/\/+$/, ""));
  const unknown = named.filter((name) => !known.includes(name));
  if (unknown.length) throw new UsageError(`unknown lesson folder ${unknown.join(", ")}. Known: ${known.join(", ")}`);
  return { check: argv.includes("--check"), lessons: named.length ? named : known };
}

function readManifestSource(dir) {
  const file = path.join(dir, "print", "manifest.js");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function runCheck(lessons) {
  let failures = 0;
  for (const lesson of lessons) {
    const dir = path.join(root, lesson);
    const source = readManifestSource(dir);
    const result = checkLesson(fs.readFileSync(path.join(dir, "index.html")), source);
    const missing = result.ok ? missingPictures(parseManifest(source), (file) => fs.existsSync(path.join(dir, file))) : [];
    if (result.ok && missing.length === 0) {
      console.log(`  ${lesson}: print pictures current`);
      continue;
    }
    failures += 1;
    const reason = result.ok ? `missing ${missing.join(", ")}` : result.reason;
    console.error(`  ${lesson}: ${reason}. Fix: node scripts/capture-print-slides.mjs ${lesson}`);
  }
  return failures === 0 ? 0 : 1;
}

function loadSettings(dir) {
  const file = path.join(dir, "print", "print-settings.json");
  return parseSettings(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "{}", path.relative(root, file));
}

// ---- Functions below run inside the page through page.evaluate --------------

function describeSlide() {
  const slide = document.querySelector(".slide.active");
  const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");
  const tabs = [...slide.querySelectorAll(".tab-btn, .qa-tab-btn")].map((button, index) => ({
    index,
    panelId: button.getAttribute("aria-controls") || ((button.getAttribute("onclick") || "").match(/'([^']+)'/) || [])[1] || "",
  }));
  return {
    title: slide.dataset.sidebarTitle || text(slide.querySelector("h1, h2")),
    hasVideo: Boolean(slide.querySelector("video")),
    tabs,
    carouselSteps: slide.querySelectorAll(".carousel-card").length,
    flipCards: slide.querySelectorAll(".danger-card").length,
    accordionSections: slide.querySelectorAll(".accordion-item").length || slide.querySelectorAll(".qa-accordion-body").length,
  };
}

function applyAction(action) {
  const slide = document.querySelector(".slide.active");
  const setItemOpen = (item, open) => {
    item.classList.toggle("open", open);
    item.querySelector(".accordion-body")?.classList.toggle("open", open);
    item.querySelector(".accordion-btn")?.classList.toggle("active", open);
    item.querySelector(".accordion-header, .accordion-btn")?.setAttribute("aria-expanded", String(open));
  };
  if (action.type === "tab") {
    slide.querySelectorAll(".tab-btn, .qa-tab-btn")[action.index].click();
    return;
  }
  if (action.type === "carousel") {
    const dot = slide.querySelector(`.carousel-dot[data-step="${action.index}"]`);
    if (!dot) throw new Error(`carousel dot ${action.index} not found`);
    dot.click();
    return;
  }
  if (action.type === "flip") {
    slide.querySelectorAll(".danger-card").forEach((card) => card.click());
    const stuck = [...slide.querySelectorAll(".danger-card")].filter((card) => !card.matches(".flipped, .is-flipped"));
    if (stuck.length) throw new Error(`${stuck.length} flip card(s) did not turn over`);
    return;
  }
  if (action.type === "accordion") {
    const wanted = (index) => action.only === null || action.only === index;
    const items = [...slide.querySelectorAll(".accordion-item")];
    if (items.length) {
      items.forEach((item, index) => setItemOpen(item, wanted(index)));
      return;
    }
    slide.querySelectorAll(".qa-accordion-body").forEach((body, index) => {
      body.hidden = !wanted(index);
      slide.querySelector(`[aria-controls="${body.id}"]`)?.setAttribute("aria-expanded", String(wanted(index)));
    });
    return;
  }
  if (action.type === "video-placeholder") {
    slide.querySelectorAll("video").forEach((video) => {
      const holder = video.closest(".video-wrapper") || video;
      const item = video.closest(".video-grid-item, .video-container");
      const caption = (item && item.querySelector("p")) || slide.querySelector("h2");
      const box = document.createElement("div");
      box.className = "sp-video-box";
      box.textContent = `Video: ${caption ? caption.textContent.replace(/\s+/g, " ").trim() : ""}`;
      holder.replaceWith(box);
    });
    return;
  }
  throw new Error(`unknown capture action ${action.type}`);
}

function clickTeacherControls(selectors) {
  const slide = document.querySelector(".slide.active");
  const visible = [...slide.querySelectorAll(selectors.join(","))].filter((el) => el.getClientRects().length > 0);
  visible.forEach((el) => el.click());
  return visible.length;
}

async function finishRendering() {
  await document.fonts.ready;
  const slide = document.querySelector(".slide.active");
  await Promise.all([...slide.querySelectorAll("img")].map((img) =>
    img.decode().catch(() => { throw new Error(`image failed to load: ${img.getAttribute("src")}`); })));
  document.getAnimations().forEach((animation) => animation.finish());
}

// ---- Node side ---------------------------------------------------------------

async function settle(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(finishRendering);
}

async function openSlide(page, url, index) {
  await page.goto(url, { waitUntil: "load" });
  await page.addStyleTag({ content: CAPTURE_CSS });
  await page.evaluate((i) => {
    const item = document.querySelector(`.slide-item[data-slide="${i}"]`);
    if (!item) throw new Error(`sidebar item for slide index ${i} not found`);
    item.click();
  }, index);
  await settle(page);
}

async function applyActions(page, actions) {
  for (const action of actions) {
    await page.evaluate(applyAction, action);
    await settle(page);
  }
}

const slideHeight = (page) => page.evaluate(() => document.querySelector(".slide.active").scrollHeight);

async function shoot(page) {
  let height = VIEWPORT.height;
  for (let pass = 0; pass < 3; pass += 1) {
    const needed = await slideHeight(page);
    if (needed <= height + 2) break;
    height = needed;
    await page.setViewportSize({ width: VIEWPORT.width, height });
    await settle(page);
  }
  const slide = page.locator(".slide.active");
  const buffer = await slide.screenshot({ type: "jpeg", quality: JPEG_QUALITY, animations: "disabled" });
  const box = await slide.boundingBox();
  if (height !== VIEWPORT.height) {
    await page.setViewportSize(VIEWPORT);
    await settle(page);
  }
  return { buffer, width: Math.round(box.width * DEVICE_SCALE), height: Math.round(box.height * DEVICE_SCALE) };
}

function planViews(info, settings, slideNumber) {
  const kinds = [
    info.tabs.length && "tabs", info.carouselSteps && "a carousel",
    info.flipCards && "flip cards", info.accordionSections && "an accordion",
  ].filter(Boolean);
  if (kinds.length > 1) throw new Error(`slide ${slideNumber} mixes ${kinds.join(" and ")}; add a capture rule for it`);
  const base = settings.keepVideoSlides.includes(slideNumber) ? [{ type: "video-placeholder" }] : [];
  const view = (label, actions, teacherOnly = false) => ({ label, actions: [...base, ...actions], teacherOnly });
  if (info.tabs.length) {
    return info.tabs.map((tab, i) => view(`tab ${i + 1} of ${info.tabs.length}`, [{ type: "tab", index: tab.index }],
      settings.teacherOnlyTabs.includes(tab.panelId)));
  }
  if (info.carouselSteps) {
    return Array.from({ length: info.carouselSteps }, (_, i) =>
      view(`card ${i + 1} of ${info.carouselSteps}`, [{ type: "carousel", index: i }]));
  }
  if (info.flipCards) return [view("card fronts", []), view("card backs", [{ type: "flip" }])];
  if (info.accordionSections) return [view("", [{ type: "accordion", only: null }])];
  return [view("", [])];
}

async function splitTallAccordion(page, views, info) {
  await applyActions(page, views[0].actions);
  if ((await slideHeight(page)) <= MAX_READABLE_HEIGHT) return views;
  const base = views[0].actions.slice(0, -1);
  return Array.from({ length: info.accordionSections }, (_, i) => ({
    label: `section ${i + 1} of ${info.accordionSections}`,
    actions: [...base, { type: "accordion", only: i }],
    teacherOnly: false,
  }));
}

async function captureView(page, view) {
  await applyActions(page, view.actions);
  const student = view.teacherOnly ? null : await shoot(page);
  const clicked = await page.evaluate(clickTeacherControls, TEACHER_SELECTORS);
  if (clicked > 0) await settle(page);
  const teacher = clicked > 0 || view.teacherOnly ? await shoot(page) : student;
  return { student, teacher };
}

function savePicture(printDir, fileName, shot) {
  fs.writeFileSync(path.join(printDir, fileName), shot.buffer);
  return `print/${fileName}`;
}

async function captureSlide(page, url, index, settings, printDir) {
  const slideNumber = index + 1;
  await openSlide(page, url, index);
  const info = await page.evaluate(describeSlide);
  if (info.hasVideo && !settings.keepVideoSlides.includes(slideNumber)) return [];
  let views = planViews(info, settings, slideNumber);
  if (info.accordionSections) views = await splitTallAccordion(page, views, info);
  const pictures = [];
  for (const [viewIndex, view] of views.entries()) {
    await openSlide(page, url, index);
    const { student, teacher } = await captureView(page, view);
    const studentPath = student ? savePicture(printDir, pictureFileName(slideNumber, viewIndex, "student"), student) : null;
    const same = student !== null && sha256(student.buffer) === sha256(teacher.buffer);
    const teacherPath = same ? studentPath : savePicture(printDir, pictureFileName(slideNumber, viewIndex, "teacher"), teacher);
    pictures.push({ slide: slideNumber, title: info.title, label: view.label, student: studentPath,
      teacher: teacherPath, width: teacher.width, height: teacher.height });
  }
  return pictures;
}

function jpegBytes(printDir) {
  return fs.readdirSync(printDir).filter((f) => f.endsWith(".jpg"))
    .reduce((sum, f) => sum + fs.statSync(path.join(printDir, f)).size, 0);
}

async function captureLesson(browser, lesson) {
  const dir = path.join(root, lesson);
  const indexPath = path.join(dir, "index.html");
  const settings = loadSettings(dir);
  const printDir = path.join(dir, "print");
  fs.mkdirSync(printDir, { recursive: true });
  fs.readdirSync(printDir).filter((f) => f.endsWith(".jpg")).forEach((f) => fs.rmSync(path.join(printDir, f)));
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE, reducedMotion: "reduce", serviceWorkers: "block",
  });
  // file:// lessons are local; deny any remote request so pictures never depend on the network.
  await context.route(/^https?:\/\//, (route) => route.abort());
  const page = await context.newPage();
  const url = pathToFileURL(indexPath).href;
  try {
    await page.goto(url, { waitUntil: "load" });
    const slideCount = await page.evaluate(() => document.querySelectorAll(".slide").length);
    const lessonTitle = lessonTitleFrom(await page.title());
    const pictures = [];
    for (let index = 0; index < slideCount; index += 1) {
      pictures.push(...(await captureSlide(page, url, index, settings, printDir)));
    }
    const manifest = { version: 1, lessonTitle, sourceHash: sha256(fs.readFileSync(indexPath)), pictures };
    fs.writeFileSync(path.join(printDir, "manifest.js"), formatManifest(manifest));
    return {
      pictures: pictures.length,
      teacherOnly: pictures.filter((p) => p.student === null).length,
      withAnswers: pictures.filter((p) => p.student !== null && p.student !== p.teacher).length,
      bytes: jpegBytes(printDir),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const { check, lessons } = parseArgs(process.argv.slice(2));
  if (check) return runCheck(lessons);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const lesson of lessons) {
      const s = await captureLesson(browser, lesson);
      const mb = (s.bytes / 1048576).toFixed(1);
      console.log(`  ${lesson}: ${s.pictures} pictures, ${s.teacherOnly} teacher only, ${s.withAnswers} with answers, ${mb} MB`);
      if (s.bytes > MAX_LESSON_BYTES) {
        throw new Error(`${lesson} pictures total ${mb} MB, over the 20 MB limit. Lower JPEG_QUALITY or DEVICE_SCALE.`);
      }
    }
  } finally {
    await browser.close();
  }
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (error) => {
    console.error(`capture-print-slides: ${error.message}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  },
);
```

- [ ] **Step 3: Check argument handling**

Run: `node scripts/capture-print-slides.mjs lesson-nope; echo "exit $?"`
Expected: `capture-print-slides: unknown lesson folder lesson-nope. Known: lesson-communicating-with-the-public, ...` then `exit 2`.

Run: `node scripts/capture-print-slides.mjs --check lesson-problem-solving-and-decision-making; echo "exit $?"`
Expected: `lesson-problem-solving-and-decision-making: print/manifest.js is missing. Fix: node scripts/capture-print-slides.mjs lesson-problem-solving-and-decision-making` then `exit 1`.

- [ ] **Step 4: Capture Problem Solving**

Run: `node scripts/capture-print-slides.mjs lesson-problem-solving-and-decision-making`
Expected: one summary line for the lesson, exit 0, under 20 MB. The lesson has 28 slides and 4 video slides, so expect at least 24 pictures plus the extra tab and card views, and `2 teacher only`.

- [ ] **Step 5: Confirm the freshness check now passes**

Run: `node scripts/capture-print-slides.mjs --check lesson-problem-solving-and-decision-making; echo "exit $?"`
Expected: `print pictures current`, `exit 0`.

- [ ] **Step 6: List the answer pictures and compare with the spec**

Run:

```bash
node --input-type=module -e '
import fs from "node:fs";
import { parseManifest } from "./scripts/print-slides-lib.mjs";
const m = parseManifest(fs.readFileSync("lesson-problem-solving-and-decision-making/print/manifest.js", "utf8"));
for (const p of m.pictures) if (p.student !== p.teacher) console.log(p.slide, p.label || "-", p.student ?? "TEACHER ONLY", p.teacher);'
```

Expected: slide 3 (quiz) with a separate teacher picture; slide 20 and slide 21 each with one `TEACHER ONLY` tab; no other slides. Video slides 2, 6, 10 and 15 do not appear anywhere in the manifest.

- [ ] **Step 7: Look at the pictures**

Open these with the Read tool and confirm each by eye:

- `print/s03.jpg` shows "Reveal Answer" buttons and no answers. `print/s03-t.jpg` shows all four answers.
- `print/s08.jpg` shows card fronts. `print/s08-v2.jpg` shows every card back.
- `print/s12.jpg` through `print/s12-v4.jpg` show tabs 1 to 4, one open in each.
- `print/s20-v3-t.jpg` shows the Expert Answers tab.
- `print/s24.jpg` shows ruled lines in the three action plan boxes and no placeholder text.
- No picture shows the sidebar, the progress bar, the arrow hint or a half-faded element.

If a picture is wrong, fix the matching rule in `scripts/capture-print-slides.mjs`, rerun Step 4, and look again. Do not edit the lesson.

- [ ] **Step 8: Commit the script and settings only**

The pictures are retaken in Task 5 after the script tags change `index.html`, so they are not committed here.

```bash
git add scripts/capture-print-slides.mjs lesson-problem-solving-and-decision-making/print/print-settings.json
git commit -m "feat: add print slides capture script"
```

---

### Task 5: Wire the six lessons and take their pictures

**Files:**
- Create: `lesson-*/print/print-settings.json` for the five lessons that do not have one yet
- Create: `lesson-*/print/manifest.js` placeholders, then generated manifests and pictures
- Modify: each of the six `lesson-*/index.html` (two script tags before `</body>`)
- Modify: `bespoke/lesson-fingerprints.json` (regenerated)

**Interfaces:**
- Consumes: `scripts/print-slides.js` (Task 3), `scripts/capture-print-slides.mjs` (Task 4).
- Produces: six lessons whose `--check` passes.

- [ ] **Step 1: Write the settings files**

`lesson-communicating-with-the-public/print/print-settings.json`:

```json
{
  "keepVideoSlides": [19]
}
```

For `lesson-controlling-anger`, `lesson-employee-accountability`, `lesson-interview-skills` and `lesson-time-management`, write `print/print-settings.json` containing:

```json
{}
```

- [ ] **Step 2: Write placeholder manifests**

REF-01 in the validator fails a `<script src>` that points at a missing file, so each lesson gets a placeholder before its tags are added.

```bash
for lesson in lesson-communicating-with-the-public lesson-controlling-anger lesson-employee-accountability \
  lesson-interview-skills lesson-problem-solving-and-decision-making lesson-time-management; do
  printf '%s\n' '// Placeholder until scripts/capture-print-slides.mjs takes this lesson'"'"'s pictures.' \
    'window.SPOKES_PRINT_MANIFEST = null;' > "$lesson/print/manifest.js"
done
```

- [ ] **Step 3: Add the script tags**

The tags go after every existing script, so Print All is already in the sidebar when Print slides looks for it. Run this one-off edit:

```bash
node -e '
const fs = require("node:fs");
const tags = "  <script src=\"print/manifest.js\"></script>\n  <script src=\"../scripts/print-slides.js\"></script>\n";
for (const lesson of process.argv.slice(1)) {
  const file = `${lesson}/index.html`;
  const html = fs.readFileSync(file, "utf8");
  if (html.includes("scripts/print-slides.js")) { console.log(`${file}: already wired`); continue; }
  const at = html.lastIndexOf("</body>");
  if (at === -1) throw new Error(`${file}: no </body>`);
  fs.writeFileSync(file, html.slice(0, at) + tags + html.slice(at));
  console.log(`${file}: wired`);
}' lesson-communicating-with-the-public lesson-controlling-anger lesson-employee-accountability \
   lesson-interview-skills lesson-problem-solving-and-decision-making lesson-time-management
```

Expected: six `wired` lines. Then confirm the diff is only the tags:

Run: `git diff --stat -- 'lesson-*/index.html'`
Expected: six files, `2 insertions(+)` each, no deletions.

- [ ] **Step 4: Run the validator on all six**

Run: `for f in lesson-*/index.html; do python3 scripts/validate-lesson.py "$f" | tail -1; done`
Expected: six `SUMMARY:` lines, each with `0 FAIL`.

- [ ] **Step 5: Regenerate the BeSpoke lesson fingerprints**

`quality.sh` fails when a lesson's `index.html` hash differs from `bespoke/lesson-fingerprints.json`.

Run: `node scripts/generate-lesson-fingerprints.mjs && node scripts/generate-lesson-fingerprints.mjs --check; echo "exit $?"`
Expected: `exit 0`.

Run: `git diff -U0 bespoke/lesson-fingerprints.json`
Expected: only the six per-lesson `index.html` hash lines change. If any measured value changes, stop and report it to Britt, because the button altered what BeSpoke measures.

- [ ] **Step 6: Run the accessibility ratchet**

Run: `npm run a11y`
Expected: `a11y-check: PASS`. A new `list` or other rule on any lesson means the button landed inside a `<ul>`. Fix `ensureButton` in `scripts/print-slides.js`, not the lesson.

- [ ] **Step 7: Commit the wiring**

```bash
git add lesson-*/index.html lesson-*/print/print-settings.json lesson-*/print/manifest.js bespoke/lesson-fingerprints.json
git commit -m "feat: load print slides in the six released lessons"
```

- [ ] **Step 8: Take every lesson's pictures**

Run: `node scripts/capture-print-slides.mjs`
Expected: six summary lines, each under 20 MB, exit 0. Note the MB figures for the final report.

- [ ] **Step 9: Check the pictures that carry special rules**

Open with the Read tool and confirm by eye:

- Communicating with the Public `print/s19.jpg`: four dashed "Video: ..." boxes with captions, plus the intro line. No other video slide (6, 11, 14, 28) is in the manifest.
- Controlling Anger `print/s29.jpg` shows the quiz with no answer marked; `print/s29-t.jpg` marks the four correct answers.
- Employee Accountability `print/s27.jpg` and `print/s27-t.jpg`: checkpoint without and with the answer. `print/s30.jpg` shows the whole slide, including the bottom. `print/s33.jpg` to `print/s33-v3.jpg`: the three carousel cards.
- Interview Skills `print/s31*.jpg`: all three accordion sections open, or one per picture if the slide was split. `print/s32-t.jpg` shows the exit ticket answer.
- Time Management `print/s16-t.jpg` shows all four matches; `print/s32-t.jpg` shows the checkpoint answer.

- [ ] **Step 10: Confirm all six are current**

Run: `node scripts/capture-print-slides.mjs --check; echo "exit $?"`
Expected: six `print pictures current` lines, `exit 0`.

- [ ] **Step 11: Commit the pictures**

```bash
git add lesson-*/print
git commit -m "feat: add print pictures for the six released lessons"
```

---

### Task 6: Lesson print test and quality gate

**Files:**
- Create: `scripts/test-print-slides-lessons.mjs`
- Modify: `scripts/quality.sh`

**Interfaces:**
- Consumes: the lesson manifests (Task 5), `parseManifest` and `pdfPageCount` (Task 2), DOM names from Task 3.
- Produces: 36 subtests named `<lesson> > <version> <layout>`; with `PRINT_SAMPLES_DIR` set, six sample PDFs for `PRINT_SAMPLE_LESSON` (default `lesson-problem-solving-and-decision-making`).

- [ ] **Step 1: Write the test**

Create `scripts/test-print-slides-lessons.mjs`:

```js
// Prints every released lesson in every version and layout and checks the PDF.
// PRINT_SAMPLES_DIR=<dir> also saves one lesson's six PDFs for human review.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { parseManifest, pdfPageCount } from "./print-slides-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSIONS = ["student", "teacher"];
const LAYOUTS = ["notes", "two", "full"];
const SAMPLES_DIR = process.env.PRINT_SAMPLES_DIR || "";
const SAMPLE_LESSON = process.env.PRINT_SAMPLE_LESSON || "lesson-problem-solving-and-decision-making";
const lessons = JSON.parse(fs.readFileSync(path.join(root, "lesson-registry.json"), "utf8")).lessons
  .filter((lesson) => lesson.path && fs.existsSync(path.join(root, lesson.path)))
  .map((lesson) => path.dirname(lesson.path))
  .sort();
let browser;

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

function expectedSources(manifest, version) {
  return manifest.pictures
    .filter((picture) => version === "teacher" || picture.student !== null)
    .map((picture) => (version === "teacher" ? picture.teacher : picture.student));
}

for (const lesson of lessons) {
  test(lesson, async (t) => {
    const manifest = parseManifest(fs.readFileSync(path.join(root, lesson, "print", "manifest.js"), "utf8"));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root, lesson, "index.html")).href, { waitUntil: "load" });
    await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
    for (const version of VERSIONS) {
      for (const layout of LAYOUTS) {
        await t.test(`${version} ${layout}`, async () => {
          await page.click(".print-slides-btn");
          await page.check(`input[name="spVersion"][value="${version}"]`);
          await page.check(`input[name="spLayout"][value="${layout}"]`);
          const promised = parseInt(await page.textContent(".sp-count"), 10);
          await page.evaluate(() => { window.__printed = false; });
          await page.click(".sp-print");
          await page.waitForFunction(() => window.__printed === true);
          const shown = await page.evaluate(() => [...document.querySelectorAll("#spokes-print-root img.sp-picture")]
            .map((img) => ({ src: img.getAttribute("src"), loaded: img.complete && img.naturalWidth > 0 })));
          assert.deepEqual(shown.map((s) => s.src), expectedSources(manifest, version));
          assert.deepEqual(shown.filter((s) => !s.loaded), []);
          await page.emulateMedia({ media: "print" });
          const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
          await page.emulateMedia({ media: "screen" });
          assert.equal(pdfPageCount(pdf), promised);
          if (SAMPLES_DIR && lesson === SAMPLE_LESSON) {
            fs.mkdirSync(SAMPLES_DIR, { recursive: true });
            fs.writeFileSync(path.join(SAMPLES_DIR, `${lesson}-${version}-${layout}.pdf`), pdf);
          }
          await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
        });
      }
    }
    await page.close();
  });
}
```

- [ ] **Step 2: Run it and keep the samples**

Run: `PRINT_SAMPLES_DIR="$TMPDIR/print-samples" node --test --test-reporter=spec scripts/test-print-slides-lessons.mjs | tee "$TMPDIR/print-lessons.txt" | tail -8`
Expected: `fail 0` in the summary, and six PDFs in `$TMPDIR/print-samples`.

Run: `grep -cE '(student|teacher) (notes|two|full)' "$TMPDIR/print-lessons.txt"`
Expected: `36`, one passing line per lesson, version and layout.

If a page count is one higher than promised for a layout, a `.sp-page` overflows. Apply the Task 3 Step 5 fix and rerun both browser test files.

- [ ] **Step 3: Prove the test catches stale or broken output**

Temporarily remove one picture and confirm the test fails, then restore it:

```bash
mv lesson-time-management/print/s01.jpg "$TMPDIR/s01.jpg"
node --test scripts/test-print-slides-lessons.mjs 2>&1 | grep -E '^# (pass|fail)'
mv "$TMPDIR/s01.jpg" lesson-time-management/print/s01.jpg
```

Expected: `# fail` greater than 0 while the file is gone. `git status --short lesson-time-management/print` prints nothing afterward.

- [ ] **Step 4: Wire the quality gate**

In `scripts/quality.sh`, replace:

```bash
echo "==> registry / dashboard fallback sync"
python3 scripts/check-registry-sync.py
```

with:

```bash
echo "==> registry / dashboard fallback sync"
python3 scripts/check-registry-sync.py

echo "==> print slides pictures current"
node scripts/capture-print-slides.mjs --check
```

Replace:

```bash
node --test scripts/test-bespoke-dev-server.mjs scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-handoff.mjs scripts/test-bespoke-provision.mjs scripts/test-bespoke-brief.mjs scripts/test-bespoke-guide.mjs
```

with:

```bash
node --test scripts/test-bespoke-dev-server.mjs scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-handoff.mjs scripts/test-bespoke-provision.mjs scripts/test-bespoke-brief.mjs scripts/test-bespoke-guide.mjs scripts/test-print-slides.mjs scripts/test-print-slides-lib.mjs
```

Replace:

```bash
  node scripts/generate-lesson-fingerprints.mjs --check
```

with:

```bash
  node scripts/generate-lesson-fingerprints.mjs --check
  echo "==> print slides dialog and lesson printouts"
  node --test scripts/test-print-slides-browser.mjs scripts/test-print-slides-lessons.mjs
```

- [ ] **Step 5: Run the full gate**

Run: `bash scripts/quality.sh; echo "exit $?"`
Expected: ends with `quality.sh: all checks passed` and `exit 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/test-print-slides-lessons.mjs scripts/quality.sh
git commit -m "test: print every lesson in every version and layout"
```

- [ ] **Step 7: Send the samples to Britt**

Send the six PDFs from `$TMPDIR/print-samples` with SendUserFile. Ask Britt and the teacher to check the quiz on slide 3, the answer tabs on slides 20 and 21, the flip cards on slide 8, and the note lines on slide 24. Continue with Tasks 7 and 8 while they review; do not open the PR until they approve.

---

### Task 7: Validator rule PRT-01

**Files:**
- Modify: `scripts/validate-lesson.py` (new `check_print`, registered in `main()`)
- Test: `scripts/test_validator.py`

**Interfaces:**
- Consumes: `Result`, `Document`, `parse_document` already in `validate-lesson.py`.
- Produces: rule id `PRT-01`, status `PASS` or `WARN`. It never returns `FAIL`, so the per-edit hook never blocks on it.

- [ ] **Step 1: Write the failing tests**

In `scripts/test_validator.py`, insert this class directly above the final `if __name__ == "__main__":` block:

```python
class TestPrintRule(unittest.TestCase):
    """PRT-01: lessons load print/manifest.js before ../scripts/print-slides.js."""

    def _load_mod(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "validate_lesson", Path(__file__).parent / "validate-lesson.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def _prt(self, html):
        mod = self._load_mod()
        return next(r for r in mod.check_print(mod.parse_document(html)) if r.rule_id == "PRT-01")

    def test_prt01_passes_with_both_scripts_in_order(self):
        r = self._prt('<html><body><script src="print/manifest.js"></script>'
                      '<script src="../scripts/print-slides.js"></script></body></html>')
        self.assertEqual(r.status, "PASS")

    def test_prt01_warns_when_scripts_missing(self):
        r = self._prt('<html><body></body></html>')
        self.assertEqual(r.status, "WARN")
        self.assertIn("print/manifest.js", r.message)
        self.assertIn("../scripts/print-slides.js", r.message)

    def test_prt01_warns_when_runtime_loads_first(self):
        r = self._prt('<html><body>\n<script src="../scripts/print-slides.js"></script>\n'
                      '<script src="print/manifest.js"></script>\n</body></html>')
        self.assertEqual(r.status, "WARN")
        self.assertIn("after", r.message)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -k TestPrintRule -v`
Expected: 3 errors, `AttributeError: module 'validate_lesson' has no attribute 'check_print'`.

- [ ] **Step 3: Implement the rule**

In `scripts/validate-lesson.py`, add this function directly above the `main()` definition:

```python
# ---------------------------------------------------------------------------
# Check: Print (PRT-01)
# ---------------------------------------------------------------------------
def check_print(doc: Document) -> list[Result]:
    """PRT-01: the lesson loads its print pictures list, then the shared print script."""
    lines = {"print/manifest.js": None, "../scripts/print-slides.js": None}
    for element in doc.elements:
        if element.tag != "script":
            continue
        src = (element.attrs.get("src") or "").split("?")[0]
        for name in lines:
            if src.endswith(name) and lines[name] is None:
                lines[name] = element.line
    missing = [name for name, line in lines.items() if line is None]
    if missing:
        return [Result("PRT-01", "WARN", f"Print slides not loaded: missing {', '.join(missing)}", 0)]
    if lines["../scripts/print-slides.js"] < lines["print/manifest.js"]:
        return [Result("PRT-01", "WARN", "Load print/manifest.js before ../scripts/print-slides.js, not after",
                       lines["../scripts/print-slides.js"])]
    return [Result("PRT-01", "PASS", "Print slides manifest and script loaded in order", 0)]
```

In `main()`, change the check list from:

```python
                   check_mobile, check_performance, check_references, check_engagement,
                   check_reduced_motion]:
```

to:

```python
                   check_mobile, check_performance, check_references, check_engagement,
                   check_reduced_motion, check_print]:
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' 2>&1 | tail -3`
Expected: `OK`.

Run: `for f in lesson-*/index.html; do python3 scripts/validate-lesson.py "$f" | grep PRT-01; done`
Expected: six `[PASS] PRT-01` lines.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-lesson.py scripts/test_validator.py
git commit -m "feat: add PRT-01 print slides validator rule"
```

---

### Task 8: Template and Round 2 build documents

**Files:**
- Create: `SPOKES Builder/print/manifest.js`
- Modify: `SPOKES Builder/template.html` (before `</body>`, line 2733 at plan time)
- Modify: `SPOKES-STANDARD.md` (append Section 11 after line 486)
- Modify: `SPOKES Builder/build-process.md` (Phase 5 step 8, Phase 7 tree, Phase 8 checklist)
- Modify: `SPOKES Builder/components.md` (new "When printed" table)

**Interfaces:**
- Consumes: PRT-01 (Task 7), the CLI (Task 4).
- Produces: a template that passes the validator with `[PASS] PRT-01`.

- [ ] **Step 1: Write the template placeholder**

Create `SPOKES Builder/print/manifest.js`:

```js
// Placeholder. A lesson built from this template shows "not made yet" in the
// Print slides dialog until scripts/capture-print-slides.mjs replaces this file.
window.SPOKES_PRINT_MANIFEST = null;
```

- [ ] **Step 2: Add the tags to the template**

In `SPOKES Builder/template.html`, replace the closing lines:

```html
</body>
</html>
```

with:

```html
  <script src="print/manifest.js"></script>
  <script src="../scripts/print-slides.js"></script>
</body>
</html>
```

Run: `python3 scripts/validate-lesson.py "SPOKES Builder/template.html" | grep -E 'PRT-01|REF-01|SUMMARY'`
Expected: `[PASS] PRT-01`, no `[FAIL] REF-01`, and `0 FAIL` in the summary.

- [ ] **Step 3: Add Section 11 to the standard**

Every rule heading in `SPOKES-STANDARD.md` separates the id and name with an em dash, so this step writes it as `\u2014` to keep the plan free of em dashes:

```bash
python3 - <<'EOF'
section = (
    "\n---\n\n"
    "## Section 11: Print\n\n"
    "### PRT-01 \u2014 Print Slides Loaded\n"
    "- **Severity:** WARN\n"
    "- **Validation:** deterministic\n"
    "- **Rule:** Every lesson loads `print/manifest.js` and then `../scripts/print-slides.js`, after its other scripts. "
    "Freshness is separate: `node scripts/capture-print-slides.mjs --check` in `scripts/quality.sh` fails when "
    "`index.html` changed after the print pictures were taken.\n"
    "- **Rationale:** Teachers print lessons as stapled or binder workbooks in a Student version and a Teacher "
    "version with answers. The Print slides button prints saved pictures of each slide, because the live slides "
    "size themselves from the screen and do not survive a paper page.\n"
)
with open("SPOKES-STANDARD.md", "a", encoding="utf-8") as f:
    f.write(section)
EOF
tail -8 SPOKES-STANDARD.md
```

Expected: the file ends with the Section 11 heading, the PRT-01 heading and its four bullets.

- [ ] **Step 4: Add the build step**

In `SPOKES Builder/build-process.md`, replace:

```markdown
7. **Set the closing slide:**
   - Choose an inspirational quote related to the lesson topic
   - Set the closing statement
```

with:

```markdown
7. **Set the closing slide:**
   - Choose an inspirational quote related to the lesson topic
   - Set the closing statement
8. **Take the print pictures (after the deck is final):**
   - Register the lesson in `lesson-registry.json` so the picture script finds it
   - Write `print/print-settings.json`: `{}` by default; list slide numbers in `keepVideoSlides` to keep a video slide's text, and answer tab panel ids in `teacherOnlyTabs`
   - Run `node scripts/capture-print-slides.mjs lesson-<slug>`
   - Print the lesson to PDF in all three layouts, both versions, and check that the Student workbook shows no answers
   - Retake the pictures after any later edit to `index.html`; `scripts/quality.sh` fails until you do
```

Replace:

```markdown
  videos/                 <-- All local video files (.mp4)
    video_file_name.mp4
    ...
```

with:

```markdown
  videos/                 <-- All local video files (.mp4)
    video_file_name.mp4
    ...
  print/                  <-- Print slides pictures (generated, see Phase 5 step 8)
    print-settings.json
    manifest.js
    s01.jpg ...
```

Replace:

```markdown
- [ ] **Resources sidebar** links work
```

with:

```markdown
- [ ] **Resources sidebar** links work
- [ ] **Print slides** button prints both versions in all three layouts, and `node scripts/capture-print-slides.mjs --check` passes
```

- [ ] **Step 5: Add the "When printed" table to the component library**

In `SPOKES Builder/components.md`, insert this section directly above the first component heading, `### 1. \`slide-title\``:

```markdown
## When printed

Print slides prints a picture of every slide. Each component prints as content (the same in both versions) or as an answer (Teacher copy only). A new click-to-show component needs a row here and a matching rule in `scripts/capture-print-slides.mjs` before it ships.

| Component | When printed |
|---|---|
| `slide-title`, `slide-section`, `big-statement`, standard content slide | Content. Prints as on screen. |
| `slide-video` | Left out. To keep the slide's text, add its number to `keepVideoSlides`; each player prints as a "Video: [caption]" box. |
| `slide-closing` | Content. Prints without confetti. |
| `cards-grid`, `takeaways`, `smart-stack`, `matrix-grid`, `areas-grid`, `split-layout`, `activity-box`, `content-list` | Content. Prints as on screen. |
| `dangers-grid` flip cards | Content. Two pictures: every card front, then every card back. |
| `download-resource` | Content. Prints as on screen; the button is not a link on paper. |
| Tabs, `tab-btn` / `tab-panel` | Content. One picture per tab. A tab whose panel id is in `teacherOnlyTabs` is an answer. |
| Accordions | Content. All sections open in one picture, or one picture per section when that would print below 75% scale. |
| Carousel, `carousel-card` | Content. One picture per card. |
| Quiz and checkpoint answers (`checkQuiz(this, true)`, `checkAnswer(this, true)`, `data-correct="true"`, `quiz-reveal-btn`, `revealMatchingAnswers`) | Answer. Student workbook shows the question unanswered; Teacher copy shows the answer and feedback. |
| Write-in `textarea` | Content. Prints as blank ruled lines. |
| Glass card, animated gradient divider, clip-path shape reveal, magnetic button | Content. Prints in its finished state. |
| Staggered grid reveal, scroll-triggered counter | Content. Prints in its finished state; check the picture shows every item and the final number. |
```

- [ ] **Step 6: Check the edits**

Run: `python3 scripts/validate-lesson.py "SPOKES Builder/template.html" | tail -1 && grep -n 'PRT-01' SPOKES-STANDARD.md scripts/validate-lesson.py && grep -c 'When printed' "SPOKES Builder/components.md"`
Expected: a summary with `0 FAIL`, at least one `PRT-01` line in each file, then `1`.

- [ ] **Step 7: Commit**

```bash
git add "SPOKES Builder/print/manifest.js" "SPOKES Builder/template.html" SPOKES-STANDARD.md \
  "SPOKES Builder/build-process.md" "SPOKES Builder/components.md"
git commit -m "docs: build print slides into the template and Round 2 process"
```

---

### Task 9: Final verification, project memory and PR

**Files:**
- Modify: `.claude/MEMORY.md`

- [ ] **Step 1: Run every Definition of Done check from the spec**

```bash
git log --diff-filter=A --format='%h %ad' --date=iso -- docs/superpowers/plans/2026-10-09-print-slides-workbook.md
git log --format='%h %ad' --date=iso -- scripts/print-slides.js | tail -1
grep -l 'scripts/print-slides.js' lesson-*/index.html | wc -l
node --test --test-reporter=spec scripts/test-print-slides-lessons.mjs 2>&1 | grep -cE '(student|teacher) (notes|two|full)'
node --test scripts/test-print-slides.mjs scripts/test-print-slides-lib.mjs 2>&1 | grep -E '^# (pass|fail)'
node scripts/capture-print-slides.mjs --check; echo "exit $?"
node --test scripts/test-print-slides-browser.mjs 2>&1 | grep -E '^# (pass|fail)'
npm run a11y 2>&1 | tail -1
grep -c 'print-slides.js' "SPOKES Builder/template.html" && python3 scripts/validate-lesson.py "SPOKES Builder/template.html" | tail -1
grep -n 'PRT-01' SPOKES-STANDARD.md scripts/validate-lesson.py | head -3
bash scripts/quality.sh 2>&1 | tail -1
du -sh lesson-*/print | sort -h
```

Expected, in order: the plan commit is older than the first `print-slides.js` commit; `6`; `36`; `# pass 20`, `# fail 0`; six current lines and `exit 0`; `# pass 9`; `a11y-check: PASS`; `1` then `0 FAIL`; PRT-01 lines in both files; `quality.sh: all checks passed`; six folder sizes, each under 20 MB.

- [ ] **Step 2: Update project memory**

In `.claude/MEMORY.md`, overwrite the "Last Session" section with today's date, what was built, and where it stopped (waiting on Britt's sample review, or the PR number). Add an Open Items line for the teacher's sample review, and a Key Decisions row:

```markdown
| 2026-10-09 | Print slides prints saved slide pictures, not live slides | Live slides size from the screen with vw/vh and clamp(); pictures match the screen in every browser |
```

```bash
git add .claude/MEMORY.md
git commit -m "docs: record the print slides session in project memory"
```

- [ ] **Step 3: Push and open the PR after Britt approves the samples**

```bash
git push -u origin claude/module-slides-pdf-booklet-2076fb
gh pr create --base main --title "feat: print lesson slides as a workbook" --body-file "$TMPDIR/print-slides-pr.md"
```

Write `$TMPDIR/print-slides-pr.md` through the unslop skill first. It covers what changed, the 60 to 90 MB of pictures, the retake command, and a test plan with `- [ ]` items for the 36-case test, the quality gate and the teacher's paper check. Do not arm auto-merge.
