# NAV-13: Chapter headers expand without navigating

**Status:** APPROVED by Britt and implemented in all six lessons, 2026-08-04.
SPOKES-STANDARD.md now carries the rule as NAV-13 (WARN, heuristic), and
`scripts/validate-lesson.py` enforces it. This document remains as the
decision record — present at the 2026-08-17 team meeting for ratification.
**Affects:** Navigation engine (`buildSidebar()`), all six lessons — SPOKES-STANDARD.md Section 5
**Origin:** /impeccable critique of lesson-controlling-anger, 2026-08-04 (P1 finding, both runs)

## The problem

Clicking a sidebar chapter header does two things at once: it expands the
chapter's slide list **and** navigates to that chapter's first slide.

- An instructor who expands "Practice Activities" mid-lecture to peek at
  what's coming yanks the projected display to that chapter's first slide,
  losing their place in front of the class.
- For screen-reader users this is an unannounced context change, and the
  headers expose no `aria-expanded` state, so the expand/collapse behavior
  is invisible to assistive technology.

## Proposed engine change

In `buildSidebar()`:

1. Chapter-header click (and Enter/Space) **toggles expansion only**.
2. Navigation happens through the slide items inside the expanded list
   (already the case) — the first slide of a chapter is always the first
   item, so reaching it costs one extra click.
3. Headers get `aria-expanded="true|false"` kept in sync with the
   `.expanded` class.

This is a Gen-D refinement in the spirit of NAV-03/NAV-04: preserve the
engine's behavior contract while removing an unannounced context change.

## Why not patch it per-lesson

The behavior lives in the locked "SPOKES NAVIGATION ENGINE — DO NOT MODIFY"
block that all six lessons copy verbatim. A lesson-level workaround would
shadow the engine with a capture-phase click interceptor — fragile, per-deck,
and it would drift the decks further apart when the stated goal is
consolidation. One engine change + re-propagation fixes all six identically.

## Implementation notes (2026-08-04)

Applied to all six decks despite six-way engine drift: CA/PSDM (createElement
+ `function(header)` style), CWP (attributes set post-hoc in the same
forEach), EA/IS/TM (innerHTML template string + `activateChapter()`), each in
its own idiom. Three touch points per deck: header creation gains
`aria-expanded="false"`, the click/keydown activation toggles expansion +
state only, and `showSlide()`'s auto-expand of the active chapter syncs the
attribute. Verified per deck: validator green (NAV-13 PASS), and rendered-DOM
checks show every header carrying `aria-expanded` with exactly the active
chapter expanded on load. The prototype clone used for the approval demo has
been removed.

## Standard impact

- SPOKES-STANDARD.md Section 5: add a rule (suggest NAV-13) — "Chapter
  header activation toggles expansion only and maintains `aria-expanded`;
  navigation occurs via slide items."
- A11Y-17 (sidebar ARIA) already requires `aria-expanded` on the sidebar
  *toggle*; NAV-13 would extend the same expectation to chapter headers.
- Validator: extend `scripts/validate-lesson.py` with a heuristic check for
  `aria-expanded` handling in `buildSidebar()`.
