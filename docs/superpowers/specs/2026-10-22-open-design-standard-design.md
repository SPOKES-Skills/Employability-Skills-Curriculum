# Open design standard: fixed colors, logo and readability; everything else open

Date: 2026-10-22. Owner: Britt. Branch: `standard/open-design-variety` (off `origin/main` at `9bd8b2e`).

## Problem

SPOKES has 11 brand colors, six released lessons, 18 planned and more after that. Today every lesson's look comes from a predefined theme package: one of 9 color leads, one of 6 installed font pairings, and card styles from a fixed catalog. Builders are told never to invent a theme or write custom CSS. With 18 or more lessons, the looks will repeat. Britt wants each lesson to look clearly different, in its color combinations, fonts, card designs and sidebar, while three things stay fixed: the 11 colors, the SPOKES logo and readability.

The validator (`scripts/validate-lesson.py`) already guards the colors (CLR-01 to CLR-08). The limits on variety come from the builder instructions and the standard's wording, not from the validator. Nothing protects the logo today.

## Solution

Rewrite the SPOKES standard and builder guides around "fixed vs open", add validator checks for the logo, and clear generic defaults out of the template and component examples. Goals:

1. The standard states plainly what is fixed (the 11 colors, the logo, readability) and what is open (everything else).
2. Builders design each lesson within those rules, with no predefined theme packages and no approval step for a builder-made design.
3. The logo is protected by deterministic validator checks. Resizing is allowed; a different image, recoloring or distortion is not.
4. New lessons start from a template and component examples that don't carry generic design defaults (hover lift on cards that aren't controls, decorative icons and emoji, a radial glow behind statements) or use the logo as stand-in art.
5. Every agent instruction in the repo agrees with the standard: no leftover "predefined package", "propose for approval" or color sign-off rules.

## Non-goals

- Changing the 11 colors or rules CLR-01 to CLR-08.
- Changing the six released lessons. They stay as Britt approved them on September 23, 2026, including their emoji icons, dot-grid texture, glass cards and hover lift.
- Changing BeSpoke, the theme registry format, or the v1/v2 registry connection. BeSpoke's compliance swaps and new options are the BeSpoke design agent's projects 1 and 2, on their own branch. Recording per-role colors in the registry is later work.
- The motion and "loadout" system (each slide assembling itself on a timed beat), a media-quality standard for 4K images and video, the performance budget with its quality-gate size guard, and where 4K video is hosted. These are the BeSpoke design agent's projects 3 and 4. They amend this standard after it merges; DSN-10 leaves room for them and matches their 1.5-second, move-and-fade-only motion limits.
- Building a right-hand sidebar option. The rules allow it; offering it in the template and BeSpoke is later work.
- A code check for A11Y-20 beyond the existing first-slide `scripts/a11y-check.mjs`.
- A minimum slide text size. The current lessons get measured first, as a separate step.

## Anti-goals

- Variety that breaks the fixed three: a color outside the 11, an altered logo, or text a learner can't read.
- Lessons that look machine-made: frosted glass, multi-color gradients for effect, glowing blobs, dot-grid filler, emoji or decorative icons in text, hover motion on things that aren't controls.
- Rewriting instructor-owned wording to satisfy a style rule.

## Decisions (Britt, 2026-10-22)

1. Fixed: the 11 brand colors, the SPOKES logo, readability. Everything else is open.
2. There are no predefined theme packages. Each lesson's design is made for that lesson. Builders design within the fixed rules and build in the spirit of the design rules, with no approval step for their own designs.
3. A design usually draws on 5 or 6 of the 11 colors, with one accent used with restraint. "Usually" keeps this a guide.
4. Lessons should look different; sharing some colors, fonts or card styles is fine.
5. The logo may be resized to any size. It may not be replaced by a different image.
6. Sidebar design and side (left or right) are open; the sidebar keeps working the same way.
7. Card design is open (CRD-01) and generic defaults are banned for new designs (CRD-02), following the `avoid-vibe-coded-design` skill. No simple icons.
8. Fix the template and `components.md` for new lessons; keep the six released lessons as they are.
9. Every BeSpoke design must follow the rules and needs Britt's approval before a lesson uses it. A BeSpoke design that breaks a rule is not used; it goes back to Britt.
10. The design elements Britt worked out with the BeSpoke design agent go into the standard as guidelines (Section 12, DSN-01 to DSN-10).
11. The color-specific sign-off before release is dropped. The general human check before teaching stays.
12. The theme library's glass cards, dot-grid texture, radial-glow title and gradient-filled cards are off-limits for new designs. The template's existing linear brand gradients stay.
13. The faded chapter watermark and the image circle on dividers become optional.
14. CLR-04 stays: transparent versions of the 11 colors are allowed. DSN-09 prefers solid colors and keeps transparency for overlays that help text read.
15. A title word cropped by the slide edge is allowed only when the full title also appears whole and readable on the slide.
16. Premium motion is welcome: smooth transitions, deliberate animation and a timed per-slide assembly, within the limits in DSN-10.
17. No minimum slide text size yet; the lessons get measured first.

## Variables

- `BRANCH`: `standard/open-design-variety`, in the worktree `.claude/worktrees/open-design-standard`. All paths below are relative to its root.
- `BASE`: `origin/main` at `9bd8b2e`.
- `CANONICAL_LOGO`: `SPOKES-Logo.png` at the repository root (SHA-256 starts `f38094d5`).
- `PLAN`: `docs/superpowers/plans/2026-10-22-open-design-standard-plan.md`.
- `RELEASED_LESSONS`: the six `lesson-*/index.html` files on `BASE`.

## Changes

### `SPOKES-STANDARD.md`

Rule headings keep the document's existing format (rule ID, an em dash, the title). New body text uses no em dashes.

**A. New section after "How to Read This Document":**

> ## What Is Fixed and What Is Open
>
> Three things are fixed in every lesson:
>
> 1. **The 11 brand colors** (Section 1). No other colors, and each keeps its exact value.
> 2. **The SPOKES logo** (LOGO-01, LOGO-02). Always the official image. It may be shown at any size, but never replaced or altered.
> 3. **Readability** (Section 3, including A11Y-20). Every learner can read every slide.
>
> Everything else is open to variety: how a lesson combines the 11 colors, which installed fonts it uses for headings and body, and the design of its cards, chapter dividers, title slide and sidebar, including whether the sidebar sits on the left or the right. Whatever its design or side, the sidebar keeps working the same way (A11Y-17, MOB-02, NAV-13).
>
> A lesson's design usually draws on 5 or 6 of the 11 colors, with one accent used with restraint, spread across roles such as the sidebar, title and divider backgrounds, headings, accents and buttons. That leaves room for every lesson to look different.
>
> There are no predefined theme packages. Each lesson's design is made for that lesson, and lessons should look different from one another. Variety never overrides the three fixed items.
>
> **BeSpoke designs.** A design submitted through BeSpoke must follow these rules. It is used in a lesson only after Britt approves it. A design that breaks a rule is not used; it goes back to Britt.

**B. Section 1 renamed "Color System and Logo"; two new rules after CLR-08:**

> ### LOGO-01: Official Logo Image
> - **Severity:** CRITICAL
> - **Validation:** deterministic
> - **Rule:** Every SPOKES logo in a lesson must be the official image, `SPOKES-Logo.png` at the repository root. A lesson's own copy must be byte-for-byte identical to it. It may not be swapped for a different, redrawn, recolored or cropped image.
> - **Rationale:** Lessons now vary in color and type, so the logo is the constant that marks every lesson as SPOKES.
>
> ### LOGO-02: Logo Resizing Allowed
> - **Severity:** CRITICAL
> - **Validation:** deterministic
> - **Rule:** The logo may be resized to any size that suits the layout. Resizing keeps its shape: set the width or the height and leave the other `auto`, or use `object-fit: contain`. No `filter` or `mix-blend-mode` on logo images, and no `object-fit: cover` or clipping that crops it. The logo is never used as stand-in art for another image.
> - **Rationale:** Resizing fits the logo to each layout. Stretching or recoloring it on screen would show a different-looking logo even though the file is the official one.

**C. Section 3, new rule after A11Y-19:**

> ### A11Y-20: Readable Text Contrast
> - **Severity:** CRITICAL
> - **Validation:** computed. `scripts/a11y-check.mjs` measures the first slide of every deck. Other slides need review until that check covers them.
> - **Rule:** All text must reach WCAG AA contrast against the background behind it: 4.5:1, or 3:1 for text at least 24px (19px if bold). On a gradient or texture, the ratio must hold against every color in it. This applies to every slide, including title, chapter-divider and closing slides. The six lessons released on September 23, 2026 are measured against the committed baseline in `scripts/a11y-baseline.json`; new lessons must have no contrast failures.
> - **Rationale:** Color combinations are open, so a combination can put a palette color on a background where it can't be read. The fixed palette alone doesn't guarantee readable slides.

**D. Section 4, two new rules after CMP-03, and a looser CMP-03:**

CMP-03's rule becomes: "New card designs and lesson-specific components may be used right away. Add each to `SPOKES Builder/components.md` when the lesson ships, so later lessons can reuse it." (Was: "must be documented in this spec before use in new lessons.")

> ### CRD-01: Card Design Is Open
> - **Severity:** INFO
> - **Validation:** guideline
> - **Rule:** Card design is open within the fixed rules. A card may vary in:
>   - surface: a filled palette color, outline only, or a photo of the subject under a solid band that keeps text readable
>   - shape: square to fully rounded corners, cut corners, tabs, ribbons, stamp frames
>   - edges: accent rails on any side, double rails, corner marks
>   - header: a title band, an eyebrow label, a number badge
>   - depth: flat, soft shadow, hard offset shadow, stacked-paper layers
>   - layout: chosen from the content, with the most important card getting the most room (rows, columns, a timeline, a side-by-side comparison, or one large card with smaller ones)
>   - content: paragraph, bullets, numbered steps, a big number or statistic, a quote, a checklist
>   - interaction: flip, expand, reveal on tap
>
>   Cards may also vary from slide to slide, as long as the lesson still reads as one design (THM-02). Interactive cards follow A11Y-03, MOB-01 and RDM-01.
> - **Rationale:** With 18 or more lessons drawing on the same 11 colors, cards carry much of each lesson's character.
>
> ### CRD-02: No Generic Design Defaults
> - **Severity:** WARN
> - **Validation:** review
> - **Rule:** New designs avoid the defaults that make a design look machine-made: no frosted glass or blurred panels, no multi-color gradients used for effect, no glowing blobs behind headings, no dot-grid filler backgrounds, no emoji or decorative icons in headings or card text, no hover motion on cards that aren't controls, and three equal cards in a row or a bento grid only when the content calls for it. Words, numbers and real images carry the point. Any of these may stay only when the lesson's content calls for it and the reason can be given in one sentence. Instructor-authored wording stays exactly as written (see `docs/briefs/instructor-to-html-intake-2026-09-17.md`, KEEP VERBATIM); this rule governs text and design the builder adds.
> - **Rationale:** Variety should come from deliberate choices, not from defaults. The six lessons released on September 23, 2026 are not reopened by this rule.

**E. Changed rules:**

- TYP-02 rule gains: "A lesson may use any self-hosted font family in `fonts/` for headings or body, in any combination, with at most two typefaces per lesson." Rationale: "(from theme-registry.json)" becomes "(chosen in the lesson's design)".
- THM-02 rule: "color lead, sidebar color, font pairing, background texture, title slide" becomes "its color choices, fonts, background, sidebar design and side, and title slide design".
- THM-04 becomes:

> ### THM-04: Card Style Variety
> - **Severity:** INFO
> - **Validation:** guideline
> - **Rule:** A lesson may use one card style throughout or vary card styles by chapter. When it varies them, neighboring chapters should use different styles.
> - **Rationale:** Variety is a choice made for each lesson. One strong card style can carry a lesson. Rotating styles keeps a long lesson fresh.

**F. New "Section 12: Design Elements"** after Section 11 (no renumbering). Source: the element list Britt worked out with the BeSpoke design agent on 2026-10-22. Every rule here is a guideline (Severity INFO, Validation guideline). Each element uses only the 11 colors, leaves the logo untouched, keeps text readable, and adds nothing CRD-02 bans. Section intro: "Premium comes from craft and restraint: a few deliberate choices, applied the same way across the whole lesson. Premium never costs speed: every premium element stays within the performance rules (Section 8)."

> ### DSN-01: Whole-Lesson Choices
> - **Rule:** These choices are made once and applied across the whole lesson (THM-02):
>   - corner shape: square, soft, rounded or cut, applied to cards, frames and buttons together
>   - signature mark: one repeated accent, such as a rule under headings, a corner bracket, a side tab or an underline bar
>   - rule weight: hairline, medium or bold, for rails, frames and divider lines
>   - heading style: sentence case, capitals or small capitals, with weight and letter spacing
>   - number style: plain, badge, large outline numeral or tab, for numbered items, chapters and steps
>   - buttons: solid, outline or underlined link, in the lesson's corner shape. Hover effects are fine because buttons are controls.
>
> ### DSN-02: Sidebar Options
> - **Rule:** The sidebar may sit on the left or the right. Its style may be solid, a slim rail with chapter numbers, a two-tone split, or an outline with a rule. The current-chapter marker may be a bar, a filled block, a number or an underline. Navigation behavior stays the same (A11Y-17, MOB-02, NAV-13).
>
> ### DSN-03: Title Slide Options
> - **Rule:** Beyond the existing layouts, a title slide may use an oversized title word set large and cropped by the slide edge, an offset color block that crosses the edge, a ribbon or tab, a stamp frame, a big lesson number, or a two-tone diagonal cut. A cropped title word is decoration: the full title must also appear whole and readable on the slide.
>
> ### DSN-04: Chapter Divider Options
> - **Rule:** Beyond the existing layouts (center, left, band, number), a divider may use a giant chapter numeral, a two-tone split, a rail with the chapter name, a ribbon or tab, or a progress strip of solid segments showing "chapter 2 of 5". The faded chapter watermark and the image circle are optional.
>
> ### DSN-05: Video Slide Options
> - **Rule:** Video frames may use a thick border, an offset shadow, corner marks or a caption band. The video may sit left, right, or full width with a solid band.
>
> ### DSN-06: Activity Options
> - **Rule:** Activity labels may be a tab, a ribbon or a stamp. Layouts may be a checklist, numbered steps, or a prompt-and-response split.
>
> ### DSN-07: Typography Craft
> - **Rule:**
>   - Use one type scale (compact, balanced or dramatic) so headings, subheads and body step down in fixed proportions.
>   - Balance headline line breaks, avoid single-word last lines, keep heading line spacing tight, and widen letter spacing on capital-letter labels.
>   - Keep body lines to about 60 to 70 characters.
>   - Set big statistics in the heading font with matching-height numerals; use tabular digits where numbers line up in columns.
>   - Optional: a drop cap on an opening paragraph, and pull quotes with a large quotation mark in the heading font. The quotation mark is a letter, not an icon, so CRD-02 allows it.
>   - These touches change how text is set, never the words. Instructor wording stays exactly as written (KEEP VERBATIM).
>
> ### DSN-08: Layout and Spacing
> - **Rule:** Choose one spacing setting (airy, balanced or compact) and apply it to every margin and gap. Use one alignment grid across all slides, so edges line up from slide to slide. Prefer asymmetric layouts, such as one-third and two-thirds splits, over centering everything.
>
> ### DSN-09: Color Proportion
> - **Rule:** Aim for about 60% dominant color, 30% secondary and 10% accent. Prefer solid palette colors. Use transparency (CLR-04) for overlays that help text read, such as a band over a photo.
>
> ### DSN-10: Finishing Details
> - **Rule:**
>   - Give the logo clear space and a set size relative to the title (LOGO-02 allows the resizing).
>   - A running footer may show the lesson name, chapter and slide number in small capitals.
>   - Motion is deliberate and quick: one easing curve and one timing system for every entrance, and each slide's entrance finishes within about 1.5 seconds. Elements only move and fade, so layout never recalculates and motion stays smooth on school laptops. A timed per-slide assembly is welcome within these limits. Pressing Next or a key completes it at once, content is never hidden until an animation ends, and reduced motion gets everything instantly (RDM-01, RDM-02, RDM-06). The motion project will set the details.
>   - Images use one crop shape across the lesson, and text on a photo always sits on a solid band.
>   - The print workbook carries the same design (PRT-01).

Out of this section and this branch: BeSpoke's own changes (the readouts, polish notes and option lists the BeSpoke design agent proposed). They land on their own branch and follow this standard once it merges.

### `SPOKES Builder/CLAUDE.md`

- Line 34 becomes: "There are no predefined theme packages. Each lesson gets its own design, using any combination of the 11 colors, the installed fonts, and card, divider, title-slide and sidebar designs. Only the 11 colors, the logo and readability are fixed (`SPOKES-STANDARD.md`, What Is Fixed and What Is Open). The lesson's design is recorded in `theme-registry.json`."
- Line 31 (the fixed Layer 1 list) and the Layer 2 description: these become the lesson's own choices. Card and divider styles "may change between chapters" instead of "rotate between chapters".
- Step 3 is renamed "Get the Lesson's Design", in this order:
  1. Use the lesson's design from `theme-registry.json` if there is one.
  2. If not, use an approved BeSpoke proposal for the lesson under `docs/phase-2/submissions/<lesson-id>/` (its `build-contract.json` and `design.css`). A BeSpoke design is used only after Britt approves it.
  3. If neither exists, design one within the fixed rules and in the spirit of the design rules.
  4. Record the design. A builder-made design lives in full in the lesson's `<style id="theme-override">` block. `theme-registry.json` records what its current format can hold; the registry format does not change on this branch.
- Step 4 (line 82): the theme-override block may combine library snippets and custom CSS within the fixed rules, instead of only snippets chosen by registry slug.
- Lines 183 and 184: the faded chapter watermark and the chapter image circle become optional design elements (DSN-04) instead of "REQUIRED" in every lesson.
- Rule 10 (line 203), "Font pairings require user approval", becomes: "Fonts: any self-hosted family in `fonts/`, at most two per lesson (TYP-02)."
- Reference list: `theme-registry.json` is the "per-lesson design record".
- Component decision guide: "Definition + visual emoji?" becomes "Definition + a real image or key number?".

### `SPOKES Builder/build-process.md`

- Line 91 ("If the lesson is not in the registry, STOP"): replaced by the same "Get the Lesson's Design" order as Builder `CLAUDE.md` Step 3.
- Line 188 ("no custom CSS outside the library"): becomes "the theme-override block uses only the 11 color variables, keeps text readable (A11Y-20) and leaves the logo unaltered (LOGO-01, LOGO-02)".
- Line 189 ("card styles change between chapters"): becomes "card styles follow THM-04 (one style throughout, or neighboring chapters differ)".

### `SPOKES Builder/font-pairings.md`

- Line 3 ("Each lesson gets a unique pairing, no repeats across the curriculum"): becomes "Curated pairings to start from. Any self-hosted family may be used (TYP-02), and sharing a pairing with another lesson is fine."
- Line 13 ("Propose to the user for approval before applying"): removed.

### `SPOKES Builder/AGENT_THEMING_GUIDELINES.md`

- Line 3: "There are no predefined theme packages. Design each lesson within the fixed rules, and build in the spirit of the design rules."
- Line 6: the registry records a lesson's design; if one is there, apply it; if not, follow Builder `CLAUDE.md` Step 3.
- Lines 11 to 26 (the Layer 1 and Layer 2 option tables): retitled as starting options from the library, not the only options.
- Lines 46 to 53 (building the theme-override block): the block may combine library snippets and custom CSS within the fixed rules.
- New line naming the library options that are off-limits for new designs under CRD-02: `cards.glass`, `backgroundTextures.dot-grid`, `titleSlides.radial-glow` and `cards.gradient-fill`.
- Line 57: "Aim for a look that is clearly different from the other lessons. Sharing some colors, fonts or card styles with another lesson is fine."
- Line 58: "Custom CSS is allowed in the theme-override block. It may use only the 11 color variables (CLR-01 to CLR-08), must keep text readable (A11Y-20), and must leave the logo unaltered (LOGO-01, LOGO-02). Reuse theme-library.css snippets where they fit."
- Line 59 is unchanged (no edits to the shared `theme-library.css` during a lesson build).
- Line 60: "All 11 brand colors remain available. A design usually uses 5 or 6 of them, combined in any way that keeps text readable (A11Y-20). Never add a color or change a color's value (CLR-01)."
- New line: "A BeSpoke design that breaks a rule is not used. Send it back to Britt."

### `SPOKES-Agent-Execution-Spec.md` and `SPOKES-Agent-Runbook.md`

- Execution spec line 44 ("Agents do not make design decisions"): becomes "Agents design each lesson within `SPOKES-STANDARD.md`, What Is Fixed and What Is Open."
- Execution spec line 74 ("Theme packages are pre-approved in bulk…"): becomes "There are no predefined theme packages. Each lesson's design follows `SPOKES-STANDARD.md`, What Is Fixed and What Is Open. No per-lesson color or font approval gates."
- Execution spec line 76 ("apply it without modification"): becomes "When a lesson has a recorded design or an approved BeSpoke design, apply it."
- Execution spec lines 161 and 162 (propose colors and fonts for approval): removed.
- Execution spec line 121 (Gate 4, "Final color schema must have explicit user approval") and line 190 (the color schema approval record): removed. The general human check before teaching stays.
- Runbook line 90 ("Confirm final color schema has explicit user approval") and lines 106 and 107 (color schema approval evidence): removed.
- `SPOKES-Project-Plan.md` line 158 is a historical plan entry and stays as written.

### Validator: `scripts/validate-lesson.py`, test-first

- **Which elements count as the logo.** Any `<img>` whose `src` names `SPOKES-Logo`, whose class contains `logo`, or whose `alt` is the logo's name (`SPOKES`, `SPOKES logo`, or `SPOKES`, a dash, then `Strategic Planning…`). An image whose alt only mentions SPOKES, such as the Controlling Anger game thumbnail or the Time Management flowchart, is not the logo; any CSS `url()` naming `SPOKES-Logo`; and `data:image/...;base64` images on elements whose class contains `logo`. Checks follow each of these elements, not only selector text.
- **LOGO-01 (CRITICAL).** Find every logo reference in the lesson file: `<img>` `src` values and CSS `url()` values naming `SPOKES-Logo`, resolved relative to the lesson file, plus `data:image/...;base64` images on elements whose class names contain `logo`. Each must exist and match the SHA-256 of the repository-root `SPOKES-Logo.png`. FAIL on a missing or different file. PASS when every reference matches.
- **LOGO-02 (CRITICAL).** For CSS rules whose selector targets the logo (class names containing `logo`, or `img[src*="SPOKES-Logo"]`) and for inline `style` on logo images: FAIL on `filter` or `mix-blend-mode`; FAIL when both `width` and `height` are set to fixed lengths without `object-fit: contain`. `max-width`, `max-height`, `width` with `height: auto` and animations pass.
- **THM-04** message changes from "Chapter scoping check (heuristic pass)" to "Guideline: one card style or per-chapter variety are both allowed". It stays PASS (the validator has only PASS, WARN and FAIL).
- LOGO-01 also FAILs a logo element (by class or alt) that points to any file other than the official logo, so a swapped image is caught. LOGO-02 also FAILs `object-fit: cover` or clipping on a logo element.
- Tests in `scripts/test_validator.py` cover each LOGO case, including a swapped image and a cropped logo. All six released lessons and `SPOKES Builder/template.html` must pass.

### Template: `SPOKES Builder/template.html` (new lessons only)

- Remove the hover lift (`transform` and hover `box-shadow`) from `.card`, `.area-card` and `.matrix-cell` hover rules, which aren't controls. `.danger-card` keeps its flip and lift because it is a control.
- `.big-statement`: replace the radial-gradient background with a solid palette surface.
- `.split-visual .visual-circle`: replace the decorative `&#9733;` with a placeholder such as `{{Key number or image}}`.
- The logo is no longer stand-in art: the seven chapter-divider circle images and the video poster that point at `../SPOKES-Logo.png` get a neutral placeholder. The two real logo uses stay: the title-slide logo and the corner branding logo.
- The template's existing linear brand gradients (progress bar, divider backgrounds, content background) stay.
- Control marks stay: `&#9654;` (play) and `&#9776;` (menu).

### `SPOKES Builder/components.md` (new lessons only)

Replace decorative content icons in the examples (danger-icon `&#128241;`, area-icon `&#9829;` `&#9881;` `&#9734;`, visual-circle `&#9733;`, and the symbols at lines 442 and 454) with words, numbers or image placeholders. Replace the "Common emoji entities" line with guidance to use a short word, a number or a real image. The video placeholder's `&#9654;` stays.

## Left to the builder

- The exact solid surface for `.big-statement` (a palette variable that keeps A11Y-20).
- Placeholder text for removed icons, matching the template's `{{...}}` style.
- The neutral placeholder that replaces the logo in divider circles and the video poster. It uses only the 11 colors and passes A11Y-11 (alt text).
- How LOGO checks report a lesson with no logo reference (PASS with a note is the default).
- Whether `scripts/validate-bespoke-selection.py` keeps rejecting identical neighboring chapters when "vary by chapter" is on. Default: keep it; it matches THM-04's "should" for designs that choose to vary.

## Workflow

1. **Plan.** Write `PLAN` with `superpowers:writing-plans` from this spec, and commit it before any implementation change.
2. **Build.** Follow the plan's task order: validator tests first (red), then the LOGO checks (green), then the standard and guides, then the template and `components.md`.
3. **Verify.** Run every Definition of done check below and report the actual output, including anything still failing.

## Deliverables

- `SPOKES-STANDARD.md`, `SPOKES Builder/CLAUDE.md`, `SPOKES Builder/AGENT_THEMING_GUIDELINES.md`, `SPOKES Builder/build-process.md`, `SPOKES Builder/font-pairings.md`, `SPOKES-Agent-Execution-Spec.md` and `SPOKES-Agent-Runbook.md`, edited as above.
- `scripts/validate-lesson.py` with LOGO-01 and LOGO-02, and `scripts/test_validator.py` with their tests.
- `SPOKES Builder/template.html` and `SPOKES Builder/components.md`, edited as above.
- This spec and `PLAN`, committed on `BRANCH`. Nothing pushed.

## Definition of done

### Workflow completed

- `PLAN` was committed before the first implementation change.
  - Check: `git log --reverse --format='%h %s' BASE..BRANCH`
    Expected: the commit adding `PLAN` comes before every commit that touches `scripts/`, `SPOKES-STANDARD.md` or `SPOKES Builder/`.

### Standard and guides

- The standard has the new section and rules.
  - Check: `grep -c -E '^## What Is Fixed and What Is Open$|^### (LOGO-01|LOGO-02|A11Y-20|CRD-01|CRD-02) ' SPOKES-STANDARD.md`
    Expected: `6`.
- Section 12 lists the design elements.
  - Check: `grep -c -E '^## Section 12: Design Elements$|^### DSN-(0[1-9]|10) ' SPOKES-STANDARD.md`
    Expected: `11`.
- THM-04 is a guideline.
  - Check: `grep -A2 '^### THM-04' SPOKES-STANDARD.md`
    Expected: the heading says "Card Style Variety" and the severity line says `INFO`.
- No predefined-package, design-approval or color sign-off wording remains in agent instructions.
  - Check: `grep -n -i -E 'pre-approved|pre-defined and|never invent a theme|require user approval|propose to the user for approval|agents do not make design decisions|color schema|not in the registry, STOP|no custom CSS outside the library|no repeats across the curriculum' "SPOKES Builder/CLAUDE.md" "SPOKES Builder/AGENT_THEMING_GUIDELINES.md" "SPOKES Builder/build-process.md" "SPOKES Builder/font-pairings.md" SPOKES-Agent-Execution-Spec.md SPOKES-Agent-Runbook.md`
    Expected: no output.
- The divider watermark and image circle are no longer required.
  - Check: `grep -n -E '\(REQUIRED\)|must appear in ALL template variants' "SPOKES Builder/CLAUDE.md"`
    Expected: no output.
- New prose has no em dashes outside rule headings.
  - Check: `git diff BASE -U0 -- '*.md' | python3 -c "import sys; print(sum(1 for l in sys.stdin if l.startswith('+') and chr(0x2014) in l and not l.startswith('+### ')))"`
    Expected: `0`.

### Logo checks

- Each new LOGO test failed before the checks existed and passes after.
  - Check: the build report quotes the red and the green run of `python3 -m unittest discover -s scripts -p 'test_validator.py'`.
    Expected: both runs quoted; the green run reports `OK`.
- Released lessons and the template pass both logo rules.
  - Check: `for f in lesson-*/index.html "SPOKES Builder/template.html"; do python3 scripts/validate-lesson.py "$f" | grep -E 'LOGO-0[12]'; done`
    Expected: 14 lines, every one starting `[PASS]`.

### Template and components

- The template carries no decorative star, no radial background, and no hover lift on non-control cards.
  - Check: `grep -c -E '&#9733;|radial-gradient' "SPOKES Builder/template.html"`
    Expected: `0`.
  - Check: `python3 -c "import re; t=open('SPOKES Builder/template.html').read(); print(sum(1 for s,b in re.findall(r'([^{}]+)\{([^{}]*)\}', t) if ':hover' in s and re.search(r'\.(card|area-card|matrix-cell)\b', s) and 'transform' in b))"`
    Expected: `0`.
- The template uses the logo only for the real logo: the title slide and the corner branding.
  - Check: `grep -c 'SPOKES-Logo' "SPOKES Builder/template.html"`
    Expected: `2`.
- `components.md` keeps only the play mark.
  - Check: `grep -o -E '&#(1[0-9]{5}|9[0-9]{3});' "SPOKES Builder/components.md" | sort -u`
    Expected: only `&#9654;`.

### Repository gate

- The full quality gate passes with nothing skipped.
  - Check: `bash scripts/quality.sh > "$TMPDIR/q.log" 2>&1; echo "exit=$?"; grep -c SKIPPED "$TMPDIR/q.log"`
    Expected: `exit=0` and `0`.
- The six released lessons are unchanged.
  - Check: `git diff --stat BASE -- 'lesson-*/'`
    Expected: no output.

### Rollback point

- The archive tag holds the old rules.
  - Check: `git cat-file -t archive/design-rules-v1; git show archive/design-rules-v1:"SPOKES Builder/AGENT_THEMING_GUIDELINES.md" | grep -c 'pre-defined and pre-approved'`
    Expected: `tag`, then `1`.

### Rendered check

- New lessons look right after the template changes.
  - Check: Britt reviews a rendered preview of `SPOKES Builder/template.html` with a sample theme.
    Expected: approved.

## Rollback

The design rules as they stood before this change are kept in the annotated tag `archive/design-rules-v1`, on `9bd8b2e` (the `origin/main` this branch starts from, fetched 2026-10-22). It holds the predefined theme packages, catalog-only styles, the required THM-04, the template with its logo stand-ins, and the validator without LOGO checks. The tag lives in this Mac's repository until Britt pushes it: `git push origin archive/design-rules-v1`.

To roll back after this branch merges, on a new branch:

1. Restore every file this branch edits: `git restore --source=archive/design-rules-v1 -- SPOKES-STANDARD.md "SPOKES Builder/CLAUDE.md" "SPOKES Builder/AGENT_THEMING_GUIDELINES.md" "SPOKES Builder/build-process.md" "SPOKES Builder/font-pairings.md" "SPOKES Builder/components.md" "SPOKES Builder/template.html" SPOKES-Agent-Execution-Spec.md SPOKES-Agent-Runbook.md scripts/validate-lesson.py scripts/test_validator.py`
2. Delete `SPOKES Builder/images/chapter-placeholder.svg`.
3. Run `bash scripts/quality.sh`, then commit.

Reverting the merge commit (`git revert -m 1 <merge commit>`) does the same in one step while nothing else has changed those files. The six released lessons never change on this branch, so they need no rollback. A lesson built under the open rules keeps its own design; rolling back the rules does not restyle it.

## Follow-ups (outside this branch)

1. Measure body text sizes in the current lessons, then decide whether to adopt a minimum slide text size.
2. The BeSpoke design agent's four projects, each on its own branch: BeSpoke compliance swaps; BeSpoke variety and polish options; the motion and loadout system; and the media-quality standard with its performance budget, size guard and 4K video hosting. Projects 3 and 4 amend this standard after it merges.
3. A registry format that records per-role colors, so the newer BeSpoke's designs can drive a lesson build.
4. A right-hand sidebar option in the template and BeSpoke.
5. Extending `scripts/a11y-check.mjs` so A11Y-20 is measured on every slide, not only the first.
