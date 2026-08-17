# SPOKES Lesson Standard v1.0

> This is the single source of truth for all SPOKES lesson requirements.
> Agents MUST read this file before creating or modifying any lesson.
> Rules are enforced by `scripts/validate-lesson.py` via PostToolUse hook.

## How to Read This Document

Each rule has:
- **Rule ID** — unique identifier (e.g., CLR-01) used in validator output
- **Severity** — CRITICAL (blocks build), WARN (flagged), INFO (noted)
- **Validation** — deterministic (conclusively verified by parser) or heuristic (keyword presence check, manual review recommended)
- **Rule** — the testable requirement
- **Rationale** — why this rule exists

---

## Section 1: Color System

### CLR-01 — Canonical CSS Variables
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `:root` must declare exactly 11 CSS variables with canonical hex values: `--primary: #007baf`, `--accent: #37b550`, `--dark: #004071`, `--light: #ffffff`, `--muted: #edf3f7`, `--gray: #60636b`, `--gold: #d3b257`, `--royal: #00133f`, `--mauve: #a7253f`, `--offwhite: #d1d3d4`, `--muted-gold: #ad8806`.
- **Rationale:** A locked 11-color palette ensures brand consistency across all 6 lessons and prevents design system drift. Every lesson must declare the same canonical values so CSS variables resolve identically everywhere.

### CLR-02 — No Rogue Hex Colors
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** No hex color outside `:root` unless it matches one of the 11 canonical values.
- **Rationale:** Hex colors appearing outside `:root` bypass the variable system and introduce untracked colors. All color usage must flow through `var()` references or repeat only canonical hex values.

### CLR-03 — Undocumented Colors Prohibited
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `#c9a74a` and any other undocumented color is prohibited.
- **Rationale:** `#c9a74a` appeared as a rogue gold variant in multiple lessons during audits. It is not part of the canonical palette and must be replaced with `--gold` (#d3b257) or `--muted-gold` (#ad8806) as appropriate.

### CLR-04 — RGBA Opacity Variations Permitted
- **Severity:** INFO
- **Validation:** deterministic
- **Rule:** Opacity variations of canonical colors via `rgba()` are permitted.
- **Rationale:** Transparent overlays and subtle backgrounds are common design needs. Using `rgba()` with canonical RGB values is safe because the base color remains on-palette.

### CLR-05 — Gold Text Must Use Muted-Gold
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `.slide .gold` must resolve to `var(--muted-gold)`, never `var(--gold)`.
- **Rationale:** `--gold` (#d3b257) has a contrast ratio of only 2.04:1 on white, failing all WCAG AA thresholds. `--muted-gold` (#ad8806) achieves 3.33:1, passing for large text. All gold text on light backgrounds must use the darker variant.

### CLR-06 — Accent Text Must Use Dark
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `.slide .accent` must resolve to `var(--dark)`, never `var(--accent)` for text on light backgrounds. Note: `brand-palette.md` recommends a future `--accent-text` variable (#1e7a2e) for accessible green text. Until the palette is expanded to 12 colors, the `--dark` override is the approved workaround. This means there is currently no accessible green text option — this is a known trade-off, not a bug.
- **Rationale:** `--accent` (#37b550) has a contrast ratio of only 2.66:1 on white, failing all WCAG AA thresholds. Until an `--accent-text` color is added to the palette, `--dark` (#004071, 10.65:1) is the approved accessible substitute for green-emphasis text.

### CLR-07 — Confetti Colors From CSS Variables
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Confetti color arrays must read from CSS variables via `getComputedStyle`, not hardcode hex. Validation: heuristic — checks for hex arrays near confetti-related code.
- **Rationale:** Hardcoded hex arrays in confetti functions duplicate the palette outside the CSS variable system, creating a maintenance burden and drift risk when palette values change.

### CLR-08 — Prohibited Color List
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Prohibited colors from brand-palette.md must not appear anywhere in the file. The prohibited list includes: bright reds (`#DC2626`, `#991b1b`, `#FF6B6B`), oranges (`#EA580C`, `#ff6b35`), purples (`#4C1D95`, `#6c23b5`, `#2E1065`), off-palette grays (`#E0E0E0`, `#E5E7EB`, `#5A6A7A`), off-palette blues (`#2D6DB5`, `#1E4A7D`, `#1A365D`, `#2B6CB0`), and any hex value not listed in the Complete Palette (CLR-01).
- **Rationale:** These specific colors were identified in brand-palette.md as explicitly prohibited. They conflict with the SPOKES brand identity and introduce visual inconsistency across lessons.

---

## Section 2: Typography

### TYP-01 — Font Variable Declarations
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `:root` must declare `--font-heading: "DM Serif Display", serif` and `--font-body: "Outfit", sans-serif`.
- **Rationale:** DM Serif Display and Outfit are the default SPOKES font pairing. Declaring them as CSS variables in `:root` enables lesson-specific overrides via the theme system while maintaining a consistent fallback.

### TYP-02 — Font Overrides in Theme Block
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Lesson-specific font overrides go in `<style id="theme-override">`, never in `:root`.
- **Rationale:** `:root` defines the canonical defaults. Lesson-specific font pairings (from theme-registry.json) must override in the theme block to maintain clean separation between defaults and customizations, and to ensure the override cascade works correctly.

### TYP-03 — Heading Selectors Use Variable
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All heading selectors (`.slide h2`, `.card h4`, etc.) must use `var(--font-heading)`, not hardcoded font names.
- **Rationale:** Hardcoded font names bypass the variable system and break when a lesson's theme override changes the font pairing. Using `var(--font-heading)` ensures all headings respond to theme changes automatically.

### TYP-04 — Body Selectors Use Variable
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All body selectors must use `var(--font-body)`, not hardcoded font names.
- **Rationale:** Same reasoning as TYP-03 — body text must respond to theme font pairing changes through the variable system rather than hardcoded values.

### TYP-05 — Self-Hosted Fonts With Display Swap
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All fonts must be self-hosted from the repo `fonts/` directory via `@font-face` rules with `font-display: swap`. External font CDN links (`fonts.googleapis.com` / `fonts.gstatic.com`) are prohibited.
- **Rationale:** Self-hosted fonts render identically offline, over `file://`, and behind school content filters — CDN links fail silently in all three cases, degrading each lesson's registered typography to fallback stacks. `font-display: swap` still applies so text is never invisible while local files load. (Updated 2026-08-17; previously this rule required Google Fonts links to carry `display=swap`.)

---

## Section 3: Accessibility

### A11Y-01 — Tab ARIA Pattern
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Tabs must use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`.
- **Rationale:** The WAI-ARIA tabs pattern is required for screen readers to identify tab interfaces and communicate the selected state. Without these roles and properties, tabs appear as generic elements with no discernible purpose to assistive technology users.

### A11Y-02 — Accordion ARIA Pattern
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Accordions must use `aria-expanded`, `aria-controls`, and respond to Enter/Space key.
- **Rationale:** Accordions hide content by default. Without `aria-expanded`, screen reader users cannot determine whether content is visible. Keyboard support (Enter/Space) is required because many users navigate via keyboard or switch devices.

### A11Y-03 — Flip Card Accessibility
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Flip cards must have click handler, keydown handler (Enter/Space), `tabindex="0"`, and a toggle state attribute (`aria-expanded` or `aria-pressed` — both are valid ARIA patterns). Existing lessons using `aria-pressed` (e.g., Time Management) do not need migration. New lessons should prefer `aria-expanded`.
- **Rationale:** Flip cards in 4 of 6 lessons were hover-only, making them completely inaccessible on mobile and to keyboard users. Click, keyboard, and ARIA state are all required for WCAG compliance. Both `aria-expanded` and `aria-pressed` are semantically valid for toggle interactions.

### A11Y-04 — Skip Navigation Link
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** A skip navigation link must be the first focusable element in `<body>`.
- **Rationale:** WCAG 2.4.1 (Level A) requires a mechanism to bypass blocks of content repeated on multiple pages. In SPOKES lessons, the sidebar navigation is a repeated block — a skip link lets keyboard users jump directly to the main content.

### A11Y-05 — Slide Change Announcer
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** An `aria-live="polite"` announcer region must exist and announce slide changes as "Slide X of Y: [title]".
- **Rationale:** Slide transitions are visual events invisible to screen readers. An `aria-live` region announces the current position and slide title, giving non-sighted users orientation within the presentation.

### A11Y-06 — Video Aria Labels
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All `<video>` elements must have an `aria-label` describing the content.
- **Rationale:** Without an `aria-label`, screen readers announce video elements generically (e.g., "video"). A descriptive label tells users what the video contains before they decide to play it.

### A11Y-07 — Video Captions Required
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** All `<video>` elements must have a `<track kind="captions">` with a VTT file.
- **Rationale:** WCAG 1.2.2 (Level A) requires captions for prerecorded audio content. 18 of 23 videos across SPOKES lessons lack captions, which is the most numerous CRITICAL accessibility violation in the curriculum.

### A11Y-08 — Nav Aria Labels
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** `<nav>` elements must have `aria-label`.
- **Rationale:** When multiple `<nav>` landmarks exist (sidebar + main navigation), screen readers need `aria-label` to differentiate them. Without labels, users hear "navigation" repeated with no way to distinguish regions.

### A11Y-09 — Navigation Buttons Not Spans
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Navigation prev/next controls must be `<button>` elements, not `<span>`.
- **Rationale:** `<span>` elements have no implicit role, are not focusable, and do not respond to keyboard events. `<button>` provides all of these natively, ensuring navigation works for keyboard and assistive technology users.

### A11Y-10 — Progress Bar ARIA
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Progress bar must have `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- **Rationale:** Without the progressbar role and value attributes, screen readers cannot convey the user's position within the lesson. This is important for orientation, especially in 25-35 slide presentations.

### A11Y-11 — Image Alt Text
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All `<img>` must have `alt`. Decorative images must use `alt="" aria-hidden="true"`.
- **Rationale:** WCAG 1.1.1 (Level A) requires text alternatives for non-text content. Missing `alt` attributes cause screen readers to read the filename, which is meaningless. Decorative images must be explicitly hidden to avoid clutter.

### A11Y-12 — Focus Visible Styles
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `:focus-visible` styles must exist on all interactive elements. Validation: deterministic proxy — confirm at least 6 `:focus-visible` rules exist in CSS. Manual review recommended for completeness.
- **Rationale:** WCAG 2.4.7 (Level AA) requires visible focus indicators. `:focus-visible` provides focus rings for keyboard users without showing them on mouse click. The proxy check of 6+ rules covers the minimum interactive element types (buttons, links, tabs, accordions, flip cards, nav controls).

### A11Y-13 — HTML Lang Attribute
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `<html>` element must have `lang="en"` attribute (WCAG 3.1.1 Level A).
- **Rationale:** The `lang` attribute tells screen readers which language to use for pronunciation. Without it, screen readers may use the wrong language engine, making content unintelligible.

### A11Y-14 — Heading Hierarchy
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Heading hierarchy must not skip levels (no `<h1>` followed by `<h3>` without `<h2>`) within any slide (WCAG 1.3.1).
- **Rationale:** Screen reader users navigate by heading level. Skipped levels (e.g., h1 to h3) break this navigation model and suggest missing content structure.

### A11Y-15 — Discernible Link Text
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All `<a>` elements must have discernible link text — no empty hrefs, no "click here" without context (WCAG 2.4.4 Level A).
- **Rationale:** Screen readers often present links as a list. Links with no text or generic text like "click here" provide no information about the destination out of context.

### A11Y-16 — Color Not Sole Indicator
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Information must not be conveyed by color alone. Quiz correct/incorrect feedback and checkpoint results must use text or icons in addition to color (WCAG 1.4.1 Level A).
- **Rationale:** Users with color vision deficiencies cannot distinguish correct from incorrect answers if the only difference is green vs. red. Text labels or icons provide a redundant channel.

### A11Y-17 — Sidebar ARIA
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Sidebar `<nav>` must have `aria-label="Lesson chapters"`. Sidebar toggle must have `aria-expanded` and `aria-controls`. Chapter badges in collapsed state must have `aria-label` with full chapter name.
- **Rationale:** The sidebar is the primary navigation mechanism for SPOKES lessons. Without proper ARIA attributes, screen reader users cannot determine whether the sidebar is open or closed, and collapsed chapter badges (showing only letters like "W", "I", "P") are meaningless without full-name labels.

### A11Y-18 — Viewport Meta Tag
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** `<meta name="viewport" content="width=device-width, initial-scale=1">` must be present in `<head>`.
- **Rationale:** Without the viewport meta tag, mobile browsers render at desktop width and scale down, making text unreadable and tap targets impossible to hit. This is a baseline requirement for responsive design and mobile accessibility.

### A11Y-19 — Title Element
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** `<title>` element must be present and match the lesson name. This is also required for the sessionStorage keying mechanism (NAV-06).
- **Rationale:** WCAG 2.4.2 (Level A) requires descriptive page titles. Additionally, NAV-06 uses `document.title` as the sessionStorage key, so the title must be present and unique per lesson to prevent cross-lesson state collisions.

---

## Section 4: Components

### CMP-01 — Standard Tab Button Class
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Tab buttons must use class `tab-btn` (not `qa-tab-btn` or variants).
- **Rationale:** Interview Skills uses a `qa-tab-btn` prefix that diverges from the standard class name used in all other lessons. Consistent class names ensure the CSS and JavaScript tab handlers work without lesson-specific branches.

### CMP-02 — Standard Accordion Class
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Accordion items must use class `accordion-*` (not `qa-accordion-*` or variants).
- **Rationale:** Same reasoning as CMP-01 — the `qa-` prefix in Interview Skills creates an unnecessary variant that complicates the shared CSS/JS component model.

### CMP-03 — Custom Component Documentation
- **Severity:** INFO
- **Validation:** heuristic
- **Rule:** Lesson-specific components (Jeopardy, spin wheel, etc.) are permitted but must be documented in this spec before use in new lessons.
- **Rationale:** Custom components add maintenance burden and cross-lesson inconsistency. Requiring documentation before reuse ensures deliberate adoption rather than ad-hoc proliferation.

---

## Section 5: Navigation Engine — Generation D (Canonical)

Generation D merges the best features from three incompatible navigation engine implementations found across the 6 lessons:

- **ES6 syntax** (from Gen B/C)
- **View Transitions API with graceful fallback** (from Gen A)
- **Video pause on departing slide** (from Gen B)
- **`activeElement.blur()` after transition** (from Gen C)
- **Screen reader announcer** (from Gen B/C)
- **`confettiTriggered` boolean guard** (from Gen C)
- **`sessionStorage` persistence** (new)
- **Touch swipe scoped to `.main` with `{ passive: true }`** (from Gen B)

### NAV-01 — ES6 Syntax
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** `showSlide()` must use ES6 syntax (`const`/`let`, arrow functions).
- **Rationale:** ES6 syntax prevents accidental variable hoisting bugs (`var` scoping), improves readability, and aligns all 6 lessons to the same JavaScript generation. Arrow functions also preserve `this` context in callbacks.

### NAV-02 — Video Pause on Departure
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** `showSlide()` must pause all videos on the departing slide.
- **Rationale:** Without pausing, videos continue playing audio after the user navigates away, creating a confusing experience where sound comes from an invisible slide. This is especially disruptive in classroom settings.

### NAV-03 — Active Element Blur After Transition
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** `showSlide()` must call `document.activeElement?.blur()` after transition.
- **Rationale:** Without blur, the previously focused element (e.g., a "Next" button) retains focus on the new slide, causing the screen reader to announce stale content and keyboard navigation to start from the wrong position.

### NAV-04 — Aria-Live Announcer Update
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** `showSlide()` must update the `aria-live` announcer with slide number and title.
- **Rationale:** Slide transitions are visual-only events. The announcer provides the equivalent information to screen reader users: which slide they are on and what it is about. Without this, non-sighted users lose all orientation.

### NAV-05 — View Transitions API with Fallback
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** `showSlide()` must use View Transitions API with fallback: `if (document.startViewTransition) { ... } else { doTransition(); }`.
- **Rationale:** The View Transitions API provides smooth cross-fade animations between slides in supporting browsers. The fallback ensures lessons still work in browsers without the API. This was already present in Gen A lessons and is preserved in Gen D.

### NAV-06 — Session Storage Save
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** `showSlide()` must save `currentIndex` to `sessionStorage` keyed by `document.title`.
- **Rationale:** Zero session persistence was found across all 6 lessons. A page refresh restarts from slide 0, losing the instructor's place in a 25-35 slide presentation. `sessionStorage` persists within the browser tab session without leaking state across tabs or lessons.

### NAV-07 — Session Storage Restore
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** Page load must restore `currentIndex` from `sessionStorage`, falling back to 0.
- **Rationale:** The complement to NAV-06 — saving state is useless without restoring it. The fallback to 0 handles first visits and cleared storage gracefully.

### NAV-08 — Confetti Boolean Guard
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Confetti must use a `confettiTriggered` boolean guard to prevent re-fire.
- **Rationale:** Without a guard, navigating away from and back to the closing slide fires confetti again. Repeated confetti is distracting and degrades the celebratory moment into an annoyance. Gen C lessons already implement this pattern.

### NAV-09 — Keyboard Handler Guards
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** Keyboard handler must guard against `textarea`, `input`, `[role="tablist"]` focus before consuming Space/Arrow keys.
- **Rationale:** Without guards, pressing Space to type in a textarea or arrow keys to navigate a tablist triggers slide navigation instead, making form inputs and tab components unusable via keyboard.

### NAV-10 — Touch Swipe Scoping
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Touch swipe must be scoped to `.main` element (not `document`) with `{ passive: true }`.
- **Rationale:** Document-level touch handlers intercept sidebar swipes and browser gestures. Scoping to `.main` ensures swipe navigation only activates on the slide area. `{ passive: true }` tells the browser the handler will not call `preventDefault()`, enabling smooth scrolling performance.

### NAV-11 — Tab Function Signature
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Tab function signature: `switchTab(btn, panelId)`.
- **Rationale:** Three different tab function signatures exist across lessons. Standardizing to `switchTab(btn, panelId)` enables shared documentation, consistent ARIA handling, and easier maintenance.

### NAV-12 — Accordion Function Signature
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Accordion function signature: `toggleAccordion(btn)`.
- **Rationale:** Same reasoning as NAV-11 — standardizing the accordion toggle function signature eliminates cross-lesson divergence and simplifies the component model.

### NAV-13 — Chapter Header Disclosure
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Sidebar chapter-header activation toggles list expansion only and maintains `aria-expanded`; navigation occurs via the slide items inside the expanded list.
- **Rationale:** Header-click navigation moved the projected deck whenever an instructor peeked at a chapter mid-lecture, and screen-reader users received an unannounced context change from a control with no disclosure state. Expand-only headers with `aria-expanded` make the sidebar a safe wayfinding surface. Approved 2026-08-04 (docs/proposal-chapter-header-navigation.md) and applied to all six lessons the same day.

---

## Section 6: Theme System

### THM-01 — Theme Override Block Placement
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Theme overrides must live in `<style id="theme-override">` placed after the main `<style>` block.
- **Rationale:** CSS cascade requires overrides to appear after the base styles they modify. Placing the theme block before the main block would cause base styles to win, silently breaking the theme. The `id="theme-override"` attribute makes the block identifiable to both agents and the validator.

### THM-02 — Layer 1 Consistency
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Layer 1 (lesson identity) properties — color lead, sidebar color, font pairing, background texture, title slide — must be constant across all slides in a lesson. Font pairing overrides are governed by TYP-02 (must be in `<style id="theme-override">`, never in `:root`).
- **Rationale:** Layer 1 defines the lesson's identity. If these properties change mid-lesson, the presentation feels disjointed and breaks the two-layer theme architecture where Layer 1 is constant and Layer 2 provides chapter-level variation.

### THM-03 — Layer 2 Chapter Scoping
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Layer 2 (chapter variation) must be scoped via `[data-chapter="N"]` selectors.
- **Rationale:** Without chapter-scoped selectors, chapter-specific card styles and accents bleed across the entire lesson. `data-chapter` scoping ensures each chapter has its own visual treatment while Layer 1 remains constant.

### THM-04 — Adjacent Chapter Differentiation
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** No two adjacent chapters may share the same card style.
- **Rationale:** Visual freshness is a core design principle — repeating the same card style in consecutive chapters makes the lesson feel monotonous. The theme registry pre-assigns different styles per chapter, and this rule enforces that contract.

### THM-05 — Dark Theme Class
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Dark theme lessons must add `class="theme-dark"` to `.main` and provide full text/component color inversion.
- **Rationale:** The Controlling Anger lesson uses a dark theme as its reference implementation. Without the `theme-dark` class on `.main`, dark theme CSS selectors have no hook, and without full color inversion, text becomes invisible against dark backgrounds.

---

## Section 7: Mobile / Touch

### MOB-01 — No Hover-Only Interactions
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** All interactive elements must have click/tap handlers — no hover-only interactions for content access.
- **Rationale:** Hover states do not exist on touchscreen devices. Flip cards in 4 of 6 lessons used CSS `:hover` as the only trigger, making the back-side content completely inaccessible on tablets and phones used in classrooms.

### MOB-02 — Sidebar Toggle Tap Target
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Sidebar toggle must be at least 44x44px (WCAG 2.5.8 Level AA).
- **Rationale:** The sidebar toggle was 36x36px across all lessons, violating WCAG 2.5.8's minimum target size of 44x44px. Undersized targets cause repeated mis-taps, especially for users with motor impairments.

### MOB-03 — Navigation Button Tap Target
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** Navigation prev/next buttons must be at least 44x44px (WCAG 2.5.8 Level AA).
- **Rationale:** Same reasoning as MOB-02 — navigation buttons are the most frequently tapped elements and must meet the 44x44px minimum for reliable touch interaction.

### MOB-04 — Touch Feedback for Hover Effects
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Hover-triggered visual effects should have `:active` or `.tapped` CSS equivalents for touch feedback.
- **Rationale:** Desktop hover effects (card lifts, color shifts) provide important interaction feedback that is lost on touch devices. `:active` and `.tapped` states provide equivalent tactile feedback when the user touches an element.

---

## Section 8: Performance

### PRF-01 — Video Preload None
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** All `<video>` elements must have `preload="none"`.
- **Rationale:** Lessons contain up to 8 videos. Without `preload="none"`, the browser attempts to buffer all videos on page load, consuming bandwidth and delaying initial render — especially problematic on classroom Wi-Fi with multiple simultaneous users.

### PRF-02 — Lazy Video Loading
- **Severity:** INFO
- **Validation:** heuristic
- **Rule:** Active slide video loading via `data-src` to `src` swap in `showSlide()` is recommended.
- **Rationale:** Even with `preload="none"`, browsers may still download video metadata. Deferring the `src` attribute entirely until the slide is active eliminates all unnecessary network requests for off-screen videos.

### PRF-03 — External Origin Preconnect
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** With self-hosted fonts (TYP-05) decks need no `preconnect` hints. If an external origin is ever reintroduced, it must carry a `preconnect` hint in `<head>`.
- **Rationale:** `preconnect` establishes the TCP connection and TLS handshake before the resource is requested, reducing load time by 100-300ms per origin. Self-hosted assets make this moot — zero external origins is the preferred state. (Updated 2026-08-17; previously required preconnect hints for Google Fonts.)

---

## Section 9: Engagement

### ENG-01 — Minimum Checkpoints
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Each lesson must have at least 2 checkpoint/quiz components (1+ in Practice chapters, 1+ in Evaluation).
- **Rationale:** WIPPEA methodology requires distributed formative checks throughout the lesson. Audits found 0-1 checkpoints per lesson, which provides insufficient formative assessment for instructors to gauge student understanding.

### ENG-02 — Post-Video Discussion Prompts
- **Severity:** WARN
- **Validation:** heuristic
- **Rule:** Every video slide must be immediately followed by a slide containing a discussion prompt, reflection question, or activity-box.
- **Rationale:** Videos without follow-up prompts become passive viewing experiences. Time Management has 5 videos with zero discussion prompts. A follow-up slide activates the learning by asking students to process what they watched.

### ENG-03 — Minimum Activity Boxes
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Each lesson must have at least 3 activity-box instances (1 in Warm-Up, 1+ in Practice, 1 in Application).
- **Rationale:** Activity boxes are the primary vehicle for student participation. WIPPEA requires active learning in Warm-Up (engagement), Practice (application), and Application (transfer). Fewer than 3 indicates insufficient student interaction.

### ENG-04 — Interactive Content Ratio
- **Severity:** INFO
- **Validation:** heuristic
- **Rule:** At least 40% of content slides (excluding title/closing/dividers) must contain interactive components.
- **Rationale:** Interactive components (tabs, accordions, flip cards, quizzes, activity boxes) transform passive slide decks into engaging presentations. A 40% threshold ensures lessons are participatory rather than lecture-only.

---

## Section 10: Reduced Motion

### RDM-01 — CSS Reduced Motion Media Query
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** CSS must include `@media (prefers-reduced-motion: reduce)` that sets all `animation` and `transition` to `0.01ms`.
- **Rationale:** Users who enable reduced motion in their OS settings (due to vestibular disorders, motion sensitivity, or preference) must have animations suppressed. Setting durations to `0.01ms` (rather than `0s`) prevents some browsers from skipping the animation entirely and breaking state-dependent CSS.

### RDM-02 — JS Reduced Motion Detection
- **Severity:** CRITICAL
- **Validation:** deterministic
- **Rule:** JS must define `const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches`.
- **Rationale:** CSS media queries only suppress CSS animations. JavaScript-driven animations (confetti, sound effects, View Transitions API) require a JS-side check to respect the user's preference. This variable provides a single boolean guard for all JS motion code.

### RDM-03 — Confetti Respects Reduced Motion
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** `triggerConfetti()` must check `prefersReduced` before firing.
- **Rationale:** Confetti involves rapid particle motion across the entire screen — exactly the kind of animation that triggers vestibular discomfort. The JS guard prevents confetti from firing when the user has requested reduced motion.

### RDM-04 — Sound Respects Reduced Motion
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** Sound functions (`playClickSound`, `playSuccessSound`) must check `prefersReduced` before playing. Validator auto-PASSes if no sound functions exist in the lesson.
- **Rationale:** Users who enable reduced motion often also prefer reduced sensory stimulation. Suppressing sound effects alongside visual motion provides a consistent low-stimulation experience. The auto-PASS exception handles lessons like Time Management that have no sound functions.

### RDM-05 — Confetti Container Hidden
- **Severity:** WARN
- **Validation:** deterministic
- **Rule:** Reduced-motion CSS must include `.confetti, .confetti-container { display: none }`.
- **Rationale:** Even with JS guards preventing new confetti, residual confetti DOM elements from earlier interactions may still be visible. CSS `display: none` provides a defense-in-depth layer that hides any confetti elements regardless of how they were created.

### RDM-06 — View Transitions Skip
- **Severity:** CRITICAL
- **Validation:** heuristic
- **Rule:** `showSlide()` must skip `document.startViewTransition()` when `prefersReduced` is true. The View Transitions API operates outside the CSS `transition` property system and is not suppressed by RDM-01's CSS rule.
- **Rationale:** The View Transitions API creates cross-fade animations between DOM states. Unlike CSS transitions, these are not governed by the `transition` property and therefore are not suppressed by RDM-01's `0.01ms` override. An explicit JS check is the only way to prevent these animations for reduced-motion users.
