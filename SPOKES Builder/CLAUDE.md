# SPOKES Lesson Builder — Agent Instructions

You are building an interactive HTML slideshow presentation for **SPOKES** (Strategic Planning in Occupational Knowledge for Employment and Success — Skills for Life), a WV Adult Basic Education program.

> **Design rules are defined in `SPOKES-STANDARD.md` (project root).** This file covers the build process only. If this file and SPOKES-STANDARD.md conflict, the standard wins.

## What You Build

A **single self-contained `index.html` file** that is a fully interactive classroom presentation. No build tools, no frameworks, no external CDN dependencies. Fonts are **self-hosted** via `@font-face` (TYP-05). The CSS and JavaScript are embedded in the file.

**Output:** A complete project folder ready to serve and deploy.

## Reference Files

These files are in this directory (`SPOKES Builder/`):

| File                          | Purpose                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `brand-palette.md`            | **ARCHIVED** — absorbed into `SPOKES-STANDARD.md` (project root). Kept for historical reference only. |
| `template.html`               | Base skeleton HTML with all CSS/JS intact. Copy this and fill in content.                       |
| `components.md`               | Copy-paste HTML patterns for every slide type and component.                                    |
| `build-process.md`            | Step-by-step workflow, WIPPEA mapping, and verification checklist.                              |
| `AGENT_THEMING_GUIDELINES.md` | Brand color enforcement, font pairing rules, video placeholders, and template variant guidance. |
| `content-intake-template.md`  | Structured form for human content teams to deliver lesson content ready for building.           |
| `../docs/briefs/instructor-to-html-intake-2026-09-17.md` | KEEP VERBATIM rules. Instructors own meaning, AI owns format. Capture only. |

## Design Philosophy

Each SPOKES lesson has a unique visual identity created by the **two-layer theme system**:

- **Layer 1 (Lesson Identity):** Color lead, sidebar color, background texture, title slide design, and font pairing stay constant across the entire lesson.
- **Layer 2 (Chapter Variation):** Card styles, section divider styles, lead components, and secondary accents rotate between chapters for visual freshness.

Theme packages are pre-defined in `theme-registry.json` and pre-approved in bulk. The agent applies the assigned package — no design proposals or approval loops at build time.

**Reference files:**
- `theme-registry.json` — Per-lesson theme assignments
- `theme-library.css` — All reusable CSS snippets
- `SPOKES-STANDARD.md` (project root) — Canonical 11-color system and all design rules
- `font-pairings.md` — Pre-curated font library

## Build Process (10 Steps)

### Step 1: Analyze Input Materials

Read everything the user provides (PowerPoint, lesson plan, PDFs). Identify:

- Lesson topic and title
- All content points and concepts
- Video topics (placeholder slides will be built — videos are added later)
- Downloadable handouts/PDFs

### Step 2: Map Content to WIPPEA Chapters

SPOKES lessons follow the **WIPPEA** instructional framework. The standard structure has **7 chapters**, but more are allowed if the content demands it:

| #   | data-chapter | data-chapter-num | Stage          | Content                        |
| --- | ------------ | ---------------- | -------------- | ------------------------------ |
| 1   | `"1"`        | `"W"`            | Warm-Up        | Title slide + opening activity |
| 2   | `"2"`        | `"I"`            | Introduction   | Objective + framing            |
| 3   | `"3"`        | `"P1"`           | Presentation 1 | Core topic area 1              |
| 4   | `"4"`        | `"P2"`           | Presentation 2 | Core topic area 2              |
| 5   | `"5"`        | `"P3"`           | Presentation 3 | Core topic area 3              |
| 6   | `"6"`        | `"E"`            | Evaluation     | Exit ticket + assessment       |
| 7   | `"7"`        | `"A"`            | Application    | Discussion + closing           |

Additional Presentation chapters (P4, P5, etc.) may be added if the lesson has more content areas.

**Target: 25-35 slides total.**

### Step 3: Read Theme Package

1. Look up the lesson in `theme-registry.json` (the entry may originate from a **merged Bespoke PR** that ran `bespoke-apply-selection.py` — honor `varyByChapter` card styles when present)
2. Read Layer 1 properties: colorLead, sidebarColor, backgroundTexture, titleSlide, fontPairing
3. Read Layer 2 chapterStyles: per-chapter divider, cards, leadComponent, secondaryAccent
4. If the lesson is not in the registry, STOP — do not build without a theme package

### Step 4: Copy Template & Apply Theme

1. Copy `template.html` to the new project directory as `index.html`, and copy `SPOKES Builder/print/manifest.js` to `print/manifest.js` in the new project. The template loads that placeholder, and the validator's REF-01 rule blocks every edit to `index.html` while it is missing.
2. Add lesson-specific **self-hosted** `@font-face` rules in `<head>` (or a local CSS block) for the assigned pairing — look up file names in `font-pairings.md` / the repo `fonts/` directory. **Do not** add Google Fonts `<link>` tags (TYP-05). Use `font-display: swap`.
3. Generate a `<style id="theme-override">` block AFTER the main CSS block by assembling snippets from `theme-library.css` (generated from `theme-options.json`):
   - Font family overrides
   - Background texture for the assigned `backgroundTexture`
   - Color lead overrides for the assigned `colorLead`
   - Sidebar color override if `sidebarColor` is "royal"
   - Dark theme inversion if `backgroundTexture` is "dark-royal" (add `class="theme-dark"` to `.main`)
   - Title slide design CSS for the assigned `titleSlide`
   - Per-chapter card style CSS scoped to `[data-chapter="N"]` (replace SCOPE prefix) — when Bespoke set `varyByChapter`, each chapter may use a different card slug
   - Per-chapter section divider CSS scoped to `.slide-section[data-chapter="N"]` (replace DIVIDER_SCOPE prefix)
   - Per-chapter secondary accent overrides
   - Video placeholder CSS

### Step 5: Fill in Lesson Metadata

Replace these placeholders:

- `{{LESSON_TITLE}}` — in `<title>` tag and `<h1>` on title slide
- `{{SUBTITLE}}` — on the title slide `.subtitle` paragraph
- `chapterNames` object in JavaScript — update chapter names

### Step 6: Build Slides Chapter by Chapter

For each chapter:

1. Keep the `slide-section` divider (already in template)
2. Add content slides between dividers using components from `components.md`
3. Choose the right component for each piece of content (see decision guide below)
4. Maintain the `data-chapter` attribute matching the chapter number
5. **Vary component choices** — do not replicate the same sequence as other lessons

### Step 7: Add Video Slides

For each video referenced in the source materials:

1. Create a content slide that introduces the video topic
2. Follow it with a `slide-video` slide
3. Title format: `Watch: [Video Topic]`
4. **If a video file is provided**, embed it using the `<video>` pattern from `components.md` and place it in the `videos/` folder.
5. **If no video is provided**, use the video placeholder pattern from `AGENT_THEMING_GUIDELINES.md`

### Step 8: Link Resources in Sidebar

Update the `<div class="resources-section">` in the sidebar nav with links to all downloadable PDFs:

```html
<a href="Handouts/filename.pdf" target="_blank" class="resource-link"
  >Display Name</a
>
```

### Step 9: Set Up Project Folder

```
Lesson-Name/
  index.html
  SPOKES-Logo.png
  Handouts/           (student PDFs)
  Teacher-Resources/  (teacher guides)
  print/              (manifest.js placeholder, then print pictures from Step 10)
  .claude/launch.json
  .gitignore
```

### Step 10: Verify

Use the preview server to confirm:

- All slides render correctly
- Sidebar populates with correct chapter/slide names
- Video slides display properly (embedded iframes or styled placeholders)
- Download links work
- Closing slide triggers confetti
- No console errors
- **No off-brand colors** — check all CSS values against the 11-color palette in `SPOKES-STANDARD.md`
- **Print slides.** Once the deck is final, register the lesson in `lesson-registry.json`, write `print/print-settings.json` (`{}` unless a video slide keeps its text or a tab holds answers), run `node scripts/capture-print-slides.mjs lesson-<slug>`, then print both versions in all three layouts and confirm the Student workbook shows no answers. Details: `build-process.md` Phase 5 step 8. `scripts/quality.sh` fails until the pictures match the lesson.

## Component Selection Decision Guide

```
What type of content is this?

Key quote or transition statement?     --> big-statement (slide type)
Video topic?                           --> slide-video (embed if URL provided, placeholder if not)
Comparing 2-6 related items?           --> cards-grid
Ordered steps or numbered list?        --> takeaways
Acronym breakdown (letter per row)?    --> smart-stack
4-quadrant decision framework?         --> matrix-grid
4-6 items with hidden details?         --> dangers-grid (flip cards)
3 major categories with bullets?       --> areas-grid
Definition + visual emoji?             --> split-layout
Group activity or discussion prompt?   --> activity-box (inside another component)
Downloadable PDF reference?            --> download-resource (inside another component)
Simple arrow-pointed list?             --> content-list
```

## Design System Rules

See `SPOKES-STANDARD.md` for the complete rule inventory covering colors (Section 1), typography (Section 2), accessibility (Section 3), components (Section 4), navigation engine (Section 5), theme system (Section 6), mobile/touch (Section 7), performance (Section 8), engagement (Section 9), reduced motion (Section 10), and print (Section 11).

### Global Design Standards

- **Faded chapter watermark on section dividers:** Every `slide-section` must display a large, faded chapter identifier (letter or number) as a background watermark using the `::after` pseudo-element with `content: attr(data-chapter-num)`. This is a signature SPOKES design element and must appear in ALL template variants.
- **Chapter image circle on section dividers (REQUIRED):** Every `slide-section` must include a `.section-circle` div containing an `<img>` with a relevant chapter illustration. The circle appears at the left side of the slide with a gold border and animated reveal. Images should be placed in the `images/` folder and relate to the chapter topic. This is mandatory for all lessons.

### Animations

All animations are automatic via CSS. No JS needed. Each component type has staggered entry animations (0.1s-0.6s delays per item).

## Important Rules

Design constraints are in `SPOKES-STANDARD.md`. Build-process-specific rules:

1. **The only JS you change** is the `chapterNames` object to match the lesson's chapter names.
2. **data-chapter must be sequential** starting from 1. The sidebar builds itself from these attributes.
3. **First slide** must be `slide-title` with `active` class and `data-chapter="1"`.
4. **Last slide** must be `slide-closing` with `id="closingSlide"`.
5. **Every chapter** must start with a `slide-section` divider.
6. **Videos** — if a video file is provided, download it to the `videos/` folder and embed it using an HTML5 `<video>` tag. If no video is provided, use the video placeholder component.
7. **SPOKES-Logo.png** must be in the project root (same directory as index.html).
8. **File paths in links** must be relative to index.html (e.g., `Handouts/file.pdf`).
9. **File nesting** must not exceed 3 levels from project root.
10. **Font pairings require user approval** before applying to any lesson.

## File Naming Conventions

- PDFs: `SPOKES_[Module]_[Description].pdf` or `[Descriptive_Name].pdf`
- Use underscores for word separation in filenames
- Use hyphens for project folder names
- Include version numbers at end if needed: `_1`, `_2`
