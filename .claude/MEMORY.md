# Project Memory

## Project Overview
- **Name**: SPOKES Employability Skills Curriculum
- **Description**: 6 self-contained interactive HTML lesson decks + dashboard launcher, validated against SPOKES-STANDARD.md
- **Tech stack**: Static HTML/CSS/JS (one index.html per lesson), Python validator/tooling, no build step
- **Repo**: origin/main (single squashed-history commit era began 2026-06-09)

## Current Status
Pre-meeting cleanup + full visual layout pass complete (team meeting with lesson creators 2026-08-17). All 6 lessons pass the validator with 0 CRITICAL; known WARNs are real, documented divergences (see below). All 199 slides visually reviewed at presentation size (1920×985) and scaled for classroom display. The CA deck carries an /impeccable polish pass (Britt-approved 2026-08-04, ported from a since-deleted prototype clone); the fixes are uncommitted.

## Last Session
- **Date**: 2026-08-04 (continued): /impeccable critique of the CA deck scored 28/40 (dual-agent review; snapshot in .impeccable/critique/). Britt approved acting on everything. Executed: mobile top-clip fix (center-justified overflow made tall-slide tops unreachable — flex-start ≤768px + toggle-clearing padding), flip cards no longer hover-flip (tap/keyboard only, "tap to reveal" hints, backs aria-hidden until flipped), new ch6 "Check Your Understanding" quiz slide + Jeopardy offline fallback, focus lands on active slide after transitions (MutationObserver on the counter — engine untouched), reflection textarea persists to sessionStorage, wheel prompts as sr-only list + hemisphere-flipped royal-on-gold labels, slide 18's 10-card wall split into two numbered-list slides, debrief slide added after the Thermometer video, poison quote now follows its video (with discussion box + short sr-only h2 for the sidebar), rubric out of the celebration box, slide 9 renamed to dedupe sidebar titles, accordion animates grid-template-rows, sidebar item contrast lifted to AA, progress bar mauve→gold. Deck is now 33 slides. ALSO: MOB-03 validator check was matching a nonexistent .nav-btn class (auto-passing); fixed to measure .key-icon across all rule blocks — this exposed real sub-44px nav buttons in the other five decks, so each got the same 2-line min-size override (their only change). All 6 decks validate 0 CRITICAL; validator test suite (41 tests) passes.
- **Date (earlier that day)**: 2026-08-04
- **What we worked on**: /impeccable polish prototype on a clone of lesson-controlling-anger (`lesson-controlling-anger-impeccable/`, videos symlinked to the original, unique `<title>` so sessionStorage keys don't collide). Fixes found by a screenshot evidence pass (14 desktop + 4 real-390px mobile):
  1. Contrast: tab-panel h3 was white-on-white (dark-theme h3 inversion vs white panel); `.accent` was --dark on royal (invisible); gold matrix cells + ch4 gold-gradient cards had small white text ~2:1 → royal text (matches danger-card-back precedent).
  2. Mobile ≤480px: flip cards collapsed to 44px slivers (`flex:1` basis-0 beats `height` in column layout) → `flex: 0 0 auto`; 481–768px overflow → `flex: 1 1 40%` (2×2 wrap).
  3. RDM: choice-wheel spinner now honors prefers-reduced-motion (instant landing) — closes the open item below.
  4. A11y: wheel canvas role="img"+label, spin result role="status", textarea aria-label, gold focus ring on dark, tablist arrow keys (nav engine already yielded arrows to tabs).
  5. Craft: square white-bg photos cropped circular (visual-circle, danger/area icons); Jeopardy external-link buttons ↗ not ↓; wheel HiDPI + font-ready redraw; 9 drifting inline kickers → `.slide-lede` class; "Presentation" label on Practice divider → "Practice"; mauve hover glow (was green) on mauve buttons.
  All CSS in theme-override only; locked base CSS + nav engine untouched. Validator 70/0/0 throughout; impeccable detect.mjs findings triaged (6 of 8 live in the locked base block, documented as out of scope).
- **What we decided**: prototype treatment = "polish" (faithful refinement), per Britt via AskUserQuestion; text-on-gold surfaces use royal, following the flip-card-back precedent.
- **Where we left off**: Britt reviewed the prototype via a local-server + before/after-gallery preview, approved it, and the polish was ported into lesson-controlling-anger/index.html (title kept as the original so sessionStorage keys are stable). Prototype clone deleted; docs/slide-index.md regenerated. Changes validated (70/0/0) but not committed.

## Open Items
- [x] Commit + PR to main (PR #3, merged 2026-08-03)
- [ ] Expected WARNs to eventually fix: interview-skills CMP-01/02 + NAV-11/12 (qa-* classes), employee-accountability NAV-11 (showTab signature)
- [ ] employee-accountability announcer omits "Slide X of Y" position (NAV-04 divergence)
- [x] controlling-anger spinner ignores prefers-reduced-motion — fixed 2026-08-04 (impeccable polish pass, ported to the real deck)
- [ ] Commit the CA impeccable work when Britt says to: lesson-controlling-anger/index.html (polish + critique fixes, 30→33 slides), docs/slide-index.md, theme-registry.json (sidebarColor royal→dark), scripts/validate-lesson.py (MOB-03 fix), 2-line MOB-03 override in the other 5 decks, .impeccable/ critique snapshot
- [x] NAV-13 APPROVED by Britt 2026-08-04 (after prototype demo) and applied to ALL SIX decks: chapter headers expand-only + aria-expanded (three touch points per deck, adapted to each engine's drift idiom); SPOKES-STANDARD.md gained rule NAV-13 (WARN); validator gained the check (71 results now); prototype clone deleted. All six decks validate green; TM/EA/CA rendered-DOM verified. Aug 17 meeting: present docs/proposal-chapter-header-navigation.md as a decision record for team ratification (it is already live)
- [x] Re-ran /impeccable critique: 28 → 32/40. Britt approved fixing all fixable round-2 items; done same session: schedule-cell accent→gold gradient + royal text (slides 16/28), green reassigned to Collaborative on 28, wheel scales to 440px at classroom size with drawWheel reading CSS size + visible 8-prompt legend (row layout), quiz/tab 44px targets, 100dvh, pill padding 5.5rem, privacy note under reflection textarea, opt-out lines on Pair & Share + wheel, closing congrats enlarged to lead the hierarchy, flip-card front aria-hidden sync, textarea swipe guard (stopPropagation), skip-link target tabindex, "Tap or click", dead .scenario-card CSS removed. Detector: 6 findings, all locked-base. NOTE: theme-override cascade trap struck a third time (.spinner-container override placed before the component's own rule) — always append overrides AFTER the rule they beat
- [ ] Critique items deliberately NOT actioned (locked nav engine/base CSS): chapter-header click force-navigates; playClickSound + reveal-item dead code; bounce easing on takeaway-num; sidebar/progress/slide-list layout transitions. Open design questions parked: WIPPEA badges student-facing, iceberg metaphor as a real visual, emotional-arc chapter theming
- [ ] Consider running the same polish patterns over the other 5 decks (invisible h3 on light panels, text-on-gold contrast, mobile flip-card flex collapse, square photos in circles are all likely to recur)
- [ ] PDF generators (generate_teachers_guides.py, generate_presenter_notes.py) are Windows-only, cannot run on this Mac; teachers-guide script has ~1,400 lines of shadowed dead code including discarded hand-authored speaker notes
- [ ] ~9.5 MB unreferenced ppt-inspiration images in communicating-with-the-public; image1.png is 10.5 MB unoptimized
- [ ] Consider Git LFS / external hosting for ~350 MB of videos
- [ ] Qualify gates still "pending" in registry for the 3 QA lessons (communicating, controlling-anger, problem-solving)

## Key Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-03 | Registry statuses: 3 lessons "ready", 3 stay "qa" | Notes said release-approved but status stuck at qa; dashboard showed "0 Ready" |
| 2026-08-03 | Hook lives in .claude/settings.json (shared), not settings.local.json | Local file is per-machine; hook is team infrastructure |
| 2026-08-03 | Validator WARNs surface real divergences instead of auto-passing | Perfect 68/0/0 scores were partly hardcoded; honesty over optics |
| 2026-08-03 | big-rocks.vtt gets music-descriptor cues, not speech captions | Video verified music-only with on-screen text (whiteboard animation) |
| 2026-08-03 | Classroom type scale: 19px root font at ≥1600×920, per deck | Britt found content too small at 1920×1080; decks are rem-based so one lever scales all; scoped to avoid the ≤900px fit-guard |
| 2026-08-03 | Scale/override blocks go at the END of theme-override | Media queries don't add specificity; later same-specificity rules silently win — bit us twice (CWP icons, PSDM closing h2) |

## Architecture Notes
- SPOKES-STANDARD.md is the single source of truth; validator scripts/validate-lesson.py enforces it via PostToolUse hook (scripts/hooks/validate-lesson-hook.sh)
- Six-way nav-engine drift exists: only reference signature switchTab(btn,panelId) has zero live call sites; three lessons use switchTab(event,tabId); consolidation is a future upgrade
- Dashboard.html fetches lesson-registry.json with a hardcoded FALLBACK_LESSONS array for file:// use — keep both in sync when editing the registry

## Known Issues
- Validator heuristic checks THM-02/03/04, A11Y-16, MOB-04, PRF-02, ENG-02, ENG-04, CLR-04 are still unconditional PASSes (documented as heuristic)
- test suite runs via `python3 -m unittest discover -s scripts -p test_validator.py` (pytest not installed)
