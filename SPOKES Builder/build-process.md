# SPOKES Lesson Build Process

This document describes the end-to-end workflow for building a SPOKES interactive HTML lesson from source materials.

---

## Build Pipeline Overview

```
INPUT                    ANALYZE                  DESIGN                   BUILD                    DELIVER
+-----------------+      +------------------+     +------------------+     +------------------+     +------------------+
| Source Materials | ---> | Content Mapping  | --> | Theme Selection  | --> | Slide Generation | --> | Project Setup    |
| - PowerPoint    |      | - WIPPEA stages  |     | - Template variant|    | - Copy template  |     | - Folder structure|
| - Lesson Plan   |      | - Slide count    |     | - Font pairing   |    | - Fill content   |     | - Verify & test  |
| - PDFs/Handouts |      | - Component picks|     | - User approval  |    | - Video placeholders|  | - Brand check    |
+-----------------+      +------------------+     +------------------+     +------------------+     +------------------+
```

---

## Step-by-Step Process

### Phase 1: Analyze Input Materials

1. **Read all source materials** (PowerPoint, lesson plan, content docs)
2. **Identify the lesson topic** — this becomes the h1 title and page title
3. **List all content points** — every concept, activity, and resource
4. **Note video topics** — identify where videos are referenced (placeholder slides will be built)
5. **Inventory handouts** — list all PDFs that need to be downloadable

### Phase 2: Map Content to WIPPEA

Organize all content into the WIPPEA chapter structure. The standard is 7 chapters, but additional chapters are allowed if content demands it:

```
Chapter 1: WARM-UP (W)        data-chapter="1"  data-chapter-num="W"
  - Title slide (always first)
  - Self-reflection or opening activity
  - Typical: 2 slides

Chapter 2: INTRODUCTION (I)   data-chapter="2"  data-chapter-num="I"
  - Section divider
  - Module objective / framing
  - Big statement (key takeaway)
  - Typical: 3 slides

Chapter 3: PRESENTATION 1 (P) data-chapter="3"  data-chapter-num="P1"
  - Section divider
  - Core content slides (2-4)
  - Optional: video placeholder slide(s)
  - Optional: big statement transition
  - Typical: 4-6 slides

Chapter 4: PRESENTATION 2 (P) data-chapter="4"  data-chapter-num="P2"
  - Section divider
  - Core content slides (3-6)
  - Tools, strategies, frameworks
  - Typical: 5-7 slides

Chapter 5: PRESENTATION 3 (P) data-chapter="5"  data-chapter-num="P3"
  - Section divider
  - Core content slides (4-8)
  - Challenges, dangers, real-world application
  - Video placeholders often go here
  - Typical: 6-12 slides

Chapter 6: EVALUATION (E)     data-chapter="6"  data-chapter-num="E"
  - Section divider
  - Exit ticket / assessment
  - Links to Pre/Post Test and Rubric
  - Typical: 2 slides

Chapter 7: APPLICATION (A)    data-chapter="7"  data-chapter-num="A"
  - Section divider
  - Round robin / group discussion
  - Closing slide (confetti)
  - Typical: 3 slides
```

Additional Presentation chapters (P4, P5, etc.) may be added with sequential data-chapter values.

**Total target: 25-35 slides**

### Phase 3: Apply Theme Package

#### Step A: Read Theme Package

1. Look up the lesson in `theme-registry.json`
2. Read Layer 1 properties: colorLead, sidebarColor, backgroundTexture, titleSlide, fontPairing
3. Read Layer 2 chapterStyles: per-chapter divider, cards, leadComponent, secondaryAccent
4. If the lesson is not in the registry, STOP — do not build without a theme package

#### Step B: Copy Template & Apply Theme

1. Copy `template.html` to the new project directory as `index.html`, and copy `SPOKES Builder/print/manifest.js` to `print/manifest.js` in the new project. The template loads that placeholder, and the validator's REF-01 rule blocks every edit to `index.html` while it is missing.
2. Add lesson-specific Google Font `<link>` tags in `<head>` (look up import URL in `font-pairings.md`)
3. Generate a `<style id="theme-override">` block AFTER the main CSS block by assembling snippets from `theme-library.css`:
   - Font family overrides
   - Background texture for the assigned `backgroundTexture`
   - Color lead overrides for the assigned `colorLead`
   - Sidebar color override if `sidebarColor` is "royal"
   - Dark theme inversion if `backgroundTexture` is "dark-royal" (add `class="theme-dark"` to `.main`)
   - Title slide design CSS for the assigned `titleSlide`
   - Per-chapter card style CSS scoped to `[data-chapter="N"]` (replace SCOPE prefix)
   - Per-chapter section divider CSS scoped to `.slide-section[data-chapter="N"]` (replace DIVIDER_SCOPE prefix)
   - Per-chapter secondary accent overrides
   - Video placeholder CSS

### Phase 4: Select Components for Each Slide

For each content slide, choose the best component:

```
Is this a key quote or transition?
  YES --> big-statement slide type

Does it reference a video?
  YES --> slide-video with placeholder (separate slide after intro)

Does it compare 2-6 related items?
  YES --> cards-grid

Is it a step-by-step process or ordered list?
  YES --> takeaways

Is it an acronym breakdown?
  YES --> smart-stack

Is it a 4-quadrant framework?
  YES --> matrix-grid

Does it show 4-6 dangers/myths with reveals?
  YES --> dangers-grid (flip cards)

Is it 3 major categories with details?
  YES --> areas-grid (3-column)

Is it a definition or concept with a visual?
  YES --> split-layout

Does it have a group activity?
  YES --> include activity-box inside the slide

Does it reference a downloadable PDF?
  YES --> include download-resource at bottom

Is there a simple list?
  YES --> content-list
```

### Phase 5: Build the Presentation

1. **Copy `template.html`** to the new project as `index.html`
2. **Add font imports** — add lesson-specific Google Font `<link>` tags in `<head>`
3. **Add theme override** — add `<style id="theme-override">` block AFTER main CSS with:
   - Font family overrides
   - Combinatorial design overrides (Subtle CSS pattern backgrounds on `.main`, or card shadow/border variations)
   - Video placeholder CSS (from `AGENT_THEMING_GUIDELINES.md`)
4. **Replace placeholders:**
   - `{{LESSON_TITLE}}` in `<title>`, `<h1>`, and anywhere else
   - `{{SUBTITLE}}` on the title slide
   - Chapter names in `chapterNames` JavaScript object
5. **Build slides chapter by chapter:**
   - Start with the section divider for each chapter
   - Add content slides using the selected components
   - Add video placeholder slides after their introducing slides (or actual `<video>` tags if local MP4 files are provided in the `videos/` folder)
6. **Link resources:**
   - Update the sidebar `<div class="resources-section">` with PDF links
   - Add `download-resource` containers on relevant slides
7. **Set the closing slide:**
   - Choose an inspirational quote related to the lesson topic
   - Set the closing statement
8. **Take the print pictures (after the deck is final):**
   - Register the lesson in `lesson-registry.json` so the picture script finds it
   - Write `print/print-settings.json`: `{}` by default; list slide numbers in `keepVideoSlides` to keep a video slide's text, and answer tab panel ids in `teacherOnlyTabs`
   - Run `node scripts/capture-print-slides.mjs lesson-<slug>`
   - Print the lesson to PDF in all three layouts, both versions, and check that the Student workbook shows no answers
   - Retake the pictures after any later edit to `index.html`; `scripts/quality.sh` fails until you do

### Phase 6: Brand Compliance Check

**Before delivering, verify ALL colors are brand-compliant:**

- Search the entire file for any hex color (`#`) that is not one of the 11 approved brand colors: `#007baf`, `#37b550`, `#004071`, `#FFFFFF`, `#EDF3F7`, `#60636b`, `#d3b257`, `#00133f`, `#a7253f`, `#d1d3d4`, `#ad8806`
- Opacity variations of brand colors are OK (e.g., `rgba(0, 123, 175, 0.1)`)
- Consult `../SPOKES-STANDARD.md` for the full prohibited colors list and contrast reference
- No colors outside the 11-color palette should exist
- Verify theme-override block was generated from theme-library.css — no custom CSS outside the library
- Verify card styles change between chapters (check [data-chapter] scoping)

### Phase 7: Set Up Project Structure

```
New-Lesson-Project/
  index.html              <-- The presentation
  SPOKES-Logo.png         <-- Copy from existing project
  Handouts/               <-- All student-facing PDFs
    Self_Assessment.pdf
    Worksheet_1.pdf
    Pre_Post_Test.pdf
    Rubric.pdf
    ...
  Teacher-Resources/      <-- Teacher-facing materials
    Teachers Guide.pdf
    Talking Points.pdf
    ...
  videos/                 <-- All local video files (.mp4)
    video_file_name.mp4
    ...
  print/                  <-- Print slides pictures (generated, see Phase 5 step 8)
    print-settings.json
    manifest.js
    s01.jpg ...
  .claude/
    launch.json           <-- Preview server config (see below)
  .gitignore              <-- Standard ignore file (see below)
```

**`.claude/launch.json`:**

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "lesson-name",
      "runtimeExecutable": "python",
      "runtimeArgs": ["-m", "http.server", "8085"],
      "port": 8085
    }
  ]
}
```

**`.gitignore`:**

```
~$*
*.tmp
*.bak
.claude/
Thumbs.db
.DS_Store
desktop.ini
```

### Phase 8: Final Verification

Run through this checklist before delivering:

- [ ] **Title slide** renders with logo, title, subtitle, copyright
- [ ] **All section dividers** show correct WIPPEA badge and watermark
- [ ] **Sidebar** auto-populates with all chapters and slides
- [ ] **Slide counter** shows correct total
- [ ] **Video placeholder slides** display styled placeholder box, or **Local video slides** play successfully from the `videos/` folder (no broken iframes)
- [ ] **All download buttons** link to correct PDFs
- [ ] **Resources sidebar** links work
- [ ] **Print slides** button prints both versions in all three layouts, and `node scripts/capture-print-slides.mjs --check` passes
- [ ] **Keyboard navigation** works (ArrowRight, ArrowLeft, Space)
- [ ] **Closing slide** triggers confetti and success sound
- [ ] **No console errors** in browser dev tools
- [ ] **Brand colors only** — no reds, oranges, maroons, or off-palette colors
- [ ] **Controlled color mixing applied** — lesson uses a differentiated major/minor palette emphasis vs adjacent lessons
- [ ] **No clashing color pairings** — avoids accent-on-accent clash combinations; contrast and harmony checks pass
- [ ] **Final color schema approved by user** — explicit sign-off recorded before release
- [ ] **Font pairing** matches the approved selection
- [ ] **Component mix** differs from other lessons in the curriculum
- [ ] **Responsive** layout works at 768px and 480px widths
- [ ] **Reduced motion** tested — toggle `prefers-reduced-motion: reduce` in DevTools; verify no animations, no confetti, no sounds, all content visible immediately
- [ ] **IntersectionObserver reveals** tested — `.reveal-item` elements stagger in on slide entry; scrollable slides trigger on scroll
- [ ] **View Transitions** graceful fallback confirmed — Chrome/Edge smooth cross-fade; Firefox/Safari use existing slideIn animation
- [ ] **Optional per-lesson effects** (if used) are gated on `prefersReduced` and pause when slide is not active


## BeSpoke team handoff and design acceptance

For an approved Round 2 team file, follow
[the builder handoff](../docs/bespoke/builder-handoff.md) before beginning a build.
The validated proposal contains immutable selection.json, canonical intake,
design.css and build-contract.json. Preserve the team's complete Word intake and
source versions; preview samples are not the finished curriculum. Britt's reviewed
merge is required before lesson construction. After building, run the design
contract checker as well as the normal lesson/quality gates and obtain teacher
acceptance of the rendered result. No new lesson is authorized merely by receiving
a file.
