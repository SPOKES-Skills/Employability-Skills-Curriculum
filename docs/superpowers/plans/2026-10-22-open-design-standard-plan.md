# Open Design Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the SPOKES standard and agent guides around "fixed: 11 colors, logo, readability; everything else open", add validator checks that protect the logo, and clear generic defaults and logo stand-ins out of the template and component examples.

**Architecture:** Two new deterministic rules (LOGO-01, LOGO-02) go into `scripts/validate-lesson.py` as one `check_logo(doc)` function, following the file's existing one-function-per-area pattern, with subprocess tests in `scripts/test_validator.py`. Everything else is text: the standard, six agent documents, the template and `components.md`, edited to the exact wording in the spec.

**Tech Stack:** Python 3 standard library (validator and `unittest` tests), HTML and CSS (template), Markdown (standard and guides), `scripts/quality.sh` as the repository gate.

**Spec:** `docs/superpowers/specs/2026-10-22-open-design-standard-design.md`. Exact wording for every document edit lives there, in the "Changes" section; tasks below point at it rather than repeat it.

## Global Constraints

- All work on branch `standard/open-design-variety` in `.claude/worktrees/open-design-standard`. Paths are relative to that root. Nothing is pushed.
- The six released lessons (`lesson-*/index.html` and everything under `lesson-*/`) do not change: `git diff --stat origin/main -- 'lesson-*/'` stays empty.
- Colors in any new CSS or image use only the 11 canonical hex values in `CANONICAL_COLORS` (`scripts/validate-lesson.py`).
- New standard rules use the standard's existing heading format: `### `, the rule ID, a space, an em dash (U+2014), a space, then the title, exactly like the existing CLR-01 heading. The spec writes them with a colon only to keep the spec free of em dashes. No other new prose contains an em dash.
- The validator stays standard-library only. Result statuses are only `PASS`, `WARN`, `FAIL`; any `FAIL` makes the run exit 1.
- Commit messages use `type: description`, lowercase, no attribution trailers.
- Run the validator tests with `python3 -m unittest discover -s scripts -p 'test_validator.py' -v` (add `-k Logo` to run only the new ones).

## Review Focus

1. A logo `src` with a query string (`SPOKES-Logo.png?v=2`) must resolve to the file and pass when the file is the official one. Test: `test_logo01_resolves_query_string` (Task 1).
2. A logo reference whose file is missing must FAIL LOGO-01 with a "missing" message, not crash. Test: `test_logo01_reports_missing_file` (Task 1).
3. Logo sizing inside an `@media` block must still be checked. Test: `test_logo02_checks_rules_inside_media_queries` (Task 2).
4. `max-width` or `max-height` alone must never be read as a fixed `width`/`height`. Test: `test_logo02_passes_with_max_width_only` (Task 2).
5. An ordinary image whose alt only mentions SPOKES ("SPOKES Jeopardy Review Game thumbnail…" in Controlling Anger, "SPOKES-branded priority flowchart…" in Time Management) is not the logo and must not fail. A logo marked only by class with an empty alt (Employee Accountability) still counts. Tests: `test_logo_rules_ignore_images_that_only_mention_spokes` (Task 1) and `test_released_lessons_pass_logo_rules` (Task 2).

---

### Task 1: LOGO-01, the official logo file

**Files:**
- Modify: `scripts/validate-lesson.py` (imports at the top; new constant beside `CANONICAL_COLORS`; new section "Check: Logo (LOGO-01, LOGO-02)" after `check_colors`; add `check_logo` to the list in `main()` right after `check_colors`)
- Test: `scripts/test_validator.py` (new helper and class `TestLogoRules`)

**Interfaces:**
- Produces, in `scripts/validate-lesson.py`:
  - `OFFICIAL_LOGO_PATH: Path = Path(__file__).resolve().parent.parent / "SPOKES-Logo.png"`
  - `LOGO_FILE_RE = re.compile(r"spokes-logo", re.IGNORECASE)`
  - `LOGO_ALT_RE = re.compile(r"^\s*spokes(\s+logo)?\s*$|^\s*spokes\s*(?:\u2014|&mdash;|\u2013|-)\s*strategic planning", re.IGNORECASE)`: the logo's own name. `HTMLParser` decodes `&mdash;` in attributes, so the decoded dash must match too.
  - `_logo_elements(doc: Document) -> list[Element]`: `img` elements whose `src` matches `LOGO_FILE_RE`, whose class contains `logo`, or whose `alt` matches `LOGO_ALT_RE`; plus any element whose `poster` matches `LOGO_FILE_RE`.
  - `_reference_sha256(doc: Document, value: str) -> str | None`: SHA-256 hex of a `data:` URI's decoded bytes, or of the local file the reference resolves to (use `_local_reference_path`, relative to `doc.source_path.parent`); `None` when the file does not exist.
  - `check_logo(doc: Document) -> list[Result]`: returns one `LOGO-01` result in this task; Task 2 adds the `LOGO-02` result.
- Produces, in `scripts/test_validator.py`:
  - `run_validator_on_lesson(body_extra: str = "", css_extra: str = "", files: dict[str, Path] | None = None) -> tuple[int, str]`: copies `minimal-pass.html` into a temporary `lesson-test/index.html` with `css_extra` in a new `<style>` block before `</head>` and `body_extra` before `</body>`; copies `test.mp4` and `test.vtt` from `FIXTURES` plus each `files` entry (name in the lesson folder to source path); runs the validator; returns `(exit_code, stdout)`.
  - Constants `OFFICIAL_LOGO = Path(__file__).resolve().parent.parent / "SPOKES-Logo.png"` and `OTHER_IMAGE = FIXTURES / "test.png"`.

- [ ] **Step 1: Write the failing tests**

```python
class TestLogoRules(unittest.TestCase):
    LOGO_IMG = '<img src="SPOKES-Logo.png" alt="SPOKES" class="logo" />'

    def test_logo01_passes_with_official_copy(self):
        code, out = run_validator_on_lesson(self.LOGO_IMG, files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)

    def test_logo01_fails_when_logo_file_differs(self):
        _, out = run_validator_on_lesson(self.LOGO_IMG, files={"SPOKES-Logo.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_fails_when_logo_class_points_at_other_image(self):
        _, out = run_validator_on_lesson('<img src="badge.png" alt="Badge" class="logo" />',
                                         files={"badge.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_fails_when_alt_names_spokes_but_image_differs(self):
        _, out = run_validator_on_lesson('<img src="mark.png" alt="SPOKES" />',
                                         files={"mark.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo_rules_ignore_images_that_only_mention_spokes(self):
        code, out = run_validator_on_lesson('<img src="game.png" alt="SPOKES Jeopardy Review Game thumbnail" />',
                                            files={"game.png": OTHER_IMAGE})
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)

    def test_logo01_checks_css_url_reference(self):
        _, out = run_validator_on_lesson(css_extra=".hero { background-image: url('SPOKES-Logo.png'); }",
                                         files={"SPOKES-Logo.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_checks_embedded_data_uri(self):
        data = base64.b64encode(OTHER_IMAGE.read_bytes()).decode("ascii")
        _, out = run_validator_on_lesson(f'<img src="data:image/png;base64,{data}" alt="SPOKES" class="logo" />')
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_resolves_query_string(self):
        code, out = run_validator_on_lesson('<img src="SPOKES-Logo.png?v=2" alt="SPOKES" class="logo" />',
                                            files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[PASS] LOGO-01", out)

    def test_logo01_reports_missing_file(self):
        _, out = run_validator_on_lesson(self.LOGO_IMG)
        self.assertRegex(out, r"\[FAIL\] LOGO-01 .*missing")

    def test_logo01_passes_when_no_logo(self):
        code, out = run_validator_on_lesson()
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)
```

Add `import base64, shutil, tempfile` to the test file's imports.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -k Logo -v`
Expected: every `test_logo01_*` fails, because no `LOGO-01` line exists in the output yet.

- [ ] **Step 3: Implement `_logo_elements`, `_reference_sha256` and the LOGO-01 part of `check_logo` in `scripts/validate-lesson.py`**

Add `import base64` and `import hashlib`. LOGO-01 collects every reference from `_logo_elements` (`src` and `poster`) and every CSS `url(...)` in `_all_css_with_override(doc)` whose value matches `LOGO_FILE_RE`, then compares each `_reference_sha256` with the SHA-256 of `OFFICIAL_LOGO_PATH`. Messages: FAIL `Logo file missing: <ref>` or `Logo image is not the official SPOKES-Logo.png: <ref>` (first problem, with the element's line); PASS `All logo images match the official SPOKES-Logo.png`, or `No logo images found` when there are none. When `doc.source_path` is `None`, PASS with `Logo check skipped (source path unavailable)`, as `check_references` does.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -k Logo -v`
Expected: all ten Task 1 tests pass.

- [ ] **Step 5: Run the whole validator suite**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -v`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-lesson.py scripts/test_validator.py
git commit -m "feat: add LOGO-01 check for the official logo file"
```

### Task 2: LOGO-02, the logo shown unaltered; THM-04 message

**Files:**
- Modify: `scripts/validate-lesson.py` (`check_logo`; the THM-04 line in `check_theme`)
- Test: `scripts/test_validator.py` (`TestLogoRules`, new class `TestReleasedLessonsLogo`)

**Interfaces:**
- Consumes: `_logo_elements`, `check_logo`, `run_validator_on_lesson`, `OFFICIAL_LOGO` from Task 1.
- Produces: `_logo_style_problems(declarations: str) -> list[str]`, which returns the problems found in one CSS declaration block, from this fixed set: `filter`, `mix-blend-mode`, `clip-path`, `object-fit: cover`, `fixed width and height`. `check_logo` now returns two results, `LOGO-01` then `LOGO-02`.

- [ ] **Step 1: Write the failing tests**

```python
    # in TestLogoRules
    def _styled(self, css):
        return run_validator_on_lesson(self.LOGO_IMG, css_extra=css, files={"SPOKES-Logo.png": OFFICIAL_LOGO})

    def test_logo02_fails_on_filter(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { filter: grayscale(1); }")[1])

    def test_logo02_fails_on_mix_blend_mode(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { mix-blend-mode: multiply; }")[1])

    def test_logo02_fails_on_clip_path(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { clip-path: circle(40%); }")[1])

    def test_logo02_fails_on_object_fit_cover(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { width: 80px; height: 80px; object-fit: cover; }")[1])

    def test_logo02_fails_on_fixed_width_and_height(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { width: 120px; height: 40px; }")[1])

    def test_logo02_passes_with_object_fit_contain(self):
        code, out = self._styled(".logo { width: 120px; height: 120px; object-fit: contain; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_passes_with_max_width_only(self):
        code, out = self._styled(".logo { max-width: 150px; max-height: 80px; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_checks_rules_inside_media_queries(self):
        out = self._styled("@media (max-width: 600px) { .logo { width: 40px; height: 40px; } }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_on_inline_style_filter(self):
        _, out = run_validator_on_lesson('<img src="SPOKES-Logo.png" alt="SPOKES" class="logo" style="filter: invert(1)" />',
                                         files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_when_logo_is_stand_in_art(self):
        _, out = run_validator_on_lesson('<img src="SPOKES-Logo.png" alt="{{chapter image description}}" />',
                                         files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[FAIL] LOGO-02", out)


class TestReleasedLessonsLogo(unittest.TestCase):
    def test_released_lessons_pass_logo_rules(self):
        lessons = sorted((Path(__file__).resolve().parent.parent).glob("lesson-*/index.html"))
        self.assertEqual(len(lessons), 6)
        for lesson in lessons:
            out = subprocess.run([sys.executable, str(VALIDATOR), str(lesson)], capture_output=True, text=True).stdout
            self.assertIn("[PASS] LOGO-01", out, lesson.parent.name)
            self.assertIn("[PASS] LOGO-02", out, lesson.parent.name)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -k Logo -v`
Expected: the `test_logo02_*` tests and `test_released_lessons_pass_logo_rules` fail, because no `LOGO-02` line exists yet. The Task 1 tests still pass.

- [ ] **Step 3: Implement `_logo_style_problems` and the LOGO-02 part of `check_logo`**

LOGO-02 FAILs, reporting the first problem with its line, when:
- an element whose `src` or `poster` matches `LOGO_FILE_RE` has no class containing `logo` and no `alt` matching `LOGO_ALT_RE` (message: `Official logo used as stand-in art on <tag>`);
- a logo element's inline `style` has a problem from `_logo_style_problems`;
- a CSS rule from `_all_css_with_override(doc)` has a problem and targets a logo element. Parse innermost rules with `re.findall(r"([^{}]+)\{([^{}]*)\}", css)`, which also reaches rules inside `@media`. A rule targets a logo element when its selector's last compound selector names one of that element's classes (`.name`), or the selector contains `logo` or `spokes-logo`, case-insensitive.

In `_logo_style_problems`, match property names with a lookbehind such as `(?<![-\w])width\s*:` so that `max-width` and `min-height` never count. "Fixed width and height" means both properties have a numeric length and the same block has no `object-fit: contain`. `filter: none`, `mix-blend-mode: normal` and `clip-path: none` are not problems. PASS message: `Logo shown unaltered`.

In `check_theme`, change only the THM-04 message to `Guideline: one card style or per-chapter variety are both allowed`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -k Logo -v`
Expected: all `TestLogoRules` tests and `test_released_lessons_pass_logo_rules` pass.

- [ ] **Step 5: Run the whole validator suite**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -v`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-lesson.py scripts/test_validator.py
git commit -m "feat: add LOGO-02 check and soften the THM-04 message"
```

### Task 3: Template without logo stand-ins or generic defaults

**Files:**
- Create: `SPOKES Builder/images/chapter-placeholder.svg`
- Modify: `SPOKES Builder/template.html`: card hover rules (lines 603 to 617), `.big-statement` background (lines 1132 to 1140), the seven `.section-circle` images (`src="../SPOKES-Logo.png"`, from line 1918), the visual-circle star (line 2060), the video poster (line 2087)
- Test: `scripts/test_validator.py` (`TestReleasedLessonsLogo`)

**Interfaces:**
- Consumes: LOGO-02's stand-in rule from Task 2.

- [ ] **Step 1: Write the failing test**

```python
    # in TestReleasedLessonsLogo
    def test_template_passes_logo_rules(self):
        template = Path(__file__).resolve().parent.parent / "SPOKES Builder" / "template.html"
        out = subprocess.run([sys.executable, str(VALIDATOR), str(template)], capture_output=True, text=True).stdout
        self.assertIn("[PASS] LOGO-01", out)
        self.assertIn("[PASS] LOGO-02", out)
        self.assertNotIn("[FAIL]", out)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -k template_passes -v`
Expected: FAIL on `[PASS] LOGO-02`, because the template uses the logo as stand-in art in the divider circles and the video poster.

- [ ] **Step 3: Create the placeholder image**

`SPOKES Builder/images/chapter-placeholder.svg`, exactly:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Chapter image placeholder"><rect width="400" height="400" fill="#edf3f7"/><text x="200" y="212" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#60636b">Chapter image</text></svg>
```

- [ ] **Step 4: Edit the template**

- Seven `.section-circle` images: `src="../SPOKES-Logo.png"` becomes `src="images/chapter-placeholder.svg"`; keep each `alt` placeholder.
- Video slide: delete the `poster="../SPOKES-Logo.png"` attribute.
- Card hover: the selector list `.card:hover, .area-card:hover, .danger-card:hover, .matrix-cell:hover` becomes `.danger-card:hover` with the same declarations; delete the `.matrix-cell.do-first:hover, .matrix-cell.schedule:hover, .matrix-cell.delegate:hover` rule.
- `.big-statement`: replace the `radial-gradient(...)` background with `background: var(--light);`.
- `<div class="visual-circle">&#9733;</div>` becomes `<div class="visual-circle">{{Key number}}</div>`.
- Leave the template's linear gradients, `&#9654;` and `&#9776;` as they are.

- [ ] **Step 5: Verify**

Run: `python3 -m unittest discover -s scripts -p 'test_validator.py' -v`
Expected: `OK`, including `test_template_passes_logo_rules`.

Run: `grep -c 'SPOKES-Logo' "SPOKES Builder/template.html"; grep -c -E '&#9733;|radial-gradient' "SPOKES Builder/template.html"`
Expected: `2`, then `0`.

Run: `python3 -c "import re; t=open('SPOKES Builder/template.html').read(); print(sum(1 for s,b in re.findall(r'([^{}]+)\{([^{}]*)\}', t) if ':hover' in s and re.search(r'\.(card|area-card|matrix-cell)\b', s) and 'transform' in b))"`
Expected: `0`.

- [ ] **Step 6: Commit**

```bash
git add "SPOKES Builder/template.html" "SPOKES Builder/images/chapter-placeholder.svg" scripts/test_validator.py
git commit -m "fix: drop logo stand-ins, card hover lift and the radial glow from the template"
```

### Task 4: The standard

**Files:**
- Modify: `SPOKES-STANDARD.md`

- [ ] **Step 1: Apply the spec's `SPOKES-STANDARD.md` changes A to F verbatim**

A: the "What Is Fixed and What Is Open" section after "How to Read This Document". B: Section 1 renamed "Color System and Logo", LOGO-01 and LOGO-02 after CLR-08. C: A11Y-20 after A11Y-19. D: the new CMP-03 rule text, then CRD-01 and CRD-02 after CMP-03. E: TYP-02, THM-02, THM-04. F: "Section 12: Design Elements" with its intro and DSN-01 to DSN-10 after Section 11. Each new rule gets the standard's usual bullets (Severity, Validation, Rule, Rationale) as the spec gives them; DSN rules are Severity INFO, Validation guideline. Headings use the em-dash format from Global Constraints.

- [ ] **Step 2: Verify**

Run: `grep -c -E '^## What Is Fixed and What Is Open$|^### (LOGO-01|LOGO-02|A11Y-20|CRD-01|CRD-02) ' SPOKES-STANDARD.md; grep -c -E '^## Section 12: Design Elements$|^### DSN-(0[1-9]|10) ' SPOKES-STANDARD.md; grep -A2 '^### THM-04' SPOKES-STANDARD.md`
Expected: `6`, then `11`, then a "Card Style Variety" heading with an `INFO` severity line.

- [ ] **Step 3: Commit**

```bash
git add SPOKES-STANDARD.md
git commit -m "docs: open the SPOKES standard to varied designs within fixed colors, logo and readability"
```

### Task 5: Builder guides and component examples

**Files:**
- Modify: `SPOKES Builder/CLAUDE.md`, `SPOKES Builder/AGENT_THEMING_GUIDELINES.md`, `SPOKES Builder/build-process.md`, `SPOKES Builder/font-pairings.md`, `SPOKES Builder/components.md`

- [ ] **Step 1: Apply the spec's sections for the four guides verbatim**

Line numbers in the spec refer to the files at `9bd8b2e`.

- [ ] **Step 2: Replace the decorative icons in `components.md`**

- danger-icon `&#128241;` (line 345) becomes `1`.
- area-icon `&#9829;`, `&#9881;`, `&#9734;` (lines 372, 383, 394) become `1`, `2`, `3`.
- visual-circle `&#9733;`, `&#9878;`, `&#9888;` (lines 430, 442, 454) become `75%`, `2:1`, `3`.
- The "Common emoji entities" line (360) becomes: `Use a short word, a number or a real image in these spots. No emoji or decorative icons (SPOKES-STANDARD.md, CRD-02).`
- Leave the video placeholder's `&#9654;`.

- [ ] **Step 3: Verify**

Run: `grep -n -i -E 'pre-approved|pre-defined and|never invent a theme|require user approval|propose to the user for approval|not in the registry, STOP|no custom CSS outside the library|no repeats across the curriculum' "SPOKES Builder/CLAUDE.md" "SPOKES Builder/AGENT_THEMING_GUIDELINES.md" "SPOKES Builder/build-process.md" "SPOKES Builder/font-pairings.md"; grep -n -E '\(REQUIRED\)|must appear in ALL template variants' "SPOKES Builder/CLAUDE.md"; grep -o -E '&#(1[0-9]{5}|9[0-9]{3});' "SPOKES Builder/components.md" | sort -u`
Expected: no output from the first two commands, then only `&#9654;`.

- [ ] **Step 4: Commit**

```bash
git add "SPOKES Builder/CLAUDE.md" "SPOKES Builder/AGENT_THEMING_GUIDELINES.md" "SPOKES Builder/build-process.md" "SPOKES Builder/font-pairings.md" "SPOKES Builder/components.md"
git commit -m "docs: let builders design each lesson within the fixed rules"
```

### Task 6: Execution spec and runbook

**Files:**
- Modify: `SPOKES-Agent-Execution-Spec.md`, `SPOKES-Agent-Runbook.md`

- [ ] **Step 1: Apply the spec's "`SPOKES-Agent-Execution-Spec.md` and `SPOKES-Agent-Runbook.md`" section verbatim**

Renumber any list whose items are removed so the numbering stays continuous. Leave `SPOKES-Project-Plan.md` unchanged.

- [ ] **Step 2: Verify**

Run: `grep -n -i -E 'agents do not make design decisions|pre-approved|color schema' SPOKES-Agent-Execution-Spec.md SPOKES-Agent-Runbook.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add SPOKES-Agent-Execution-Spec.md SPOKES-Agent-Runbook.md
git commit -m "docs: drop design approval gates from the execution spec and runbook"
```

### Task 7: Full verification and rendered check

**Files:** none changed unless a check fails.

- [ ] **Step 1: Install the test harness in this worktree**

Run, from Britt's Terminal (needs network and writes outside the sandbox): `npm ci --no-audit --no-fund && npx playwright install chromium`
Expected: `node_modules/playwright` and `node_modules/axe-core` exist.

- [ ] **Step 2: Run every Definition of done check in the spec**

Run each command under the spec's "Definition of done" and record its output in the build report.
Expected: each matches the spec's stated result. In particular, `bash scripts/quality.sh` ends `quality.sh: all checks passed` with no `SKIPPED` line; the LOGO loop prints 14 `[PASS]` lines; `git diff --stat origin/main -- 'lesson-*/'` prints nothing.

- [ ] **Step 3: Rendered check for Britt**

Serve the worktree root with `python3 -m http.server 8790 --bind 127.0.0.1` and open `http://127.0.0.1:8790/SPOKES%20Builder/template.html`. Capture the title slide, a chapter divider, a card slide, the split-layout slide, the big-statement slide and the video slide. Send the screenshots to Britt for the spec's rendered-check approval.

- [ ] **Step 4: Report**

Write the build report in chat: each task's red and green test output, each Definition of done result, anything still failing. Do not push.
