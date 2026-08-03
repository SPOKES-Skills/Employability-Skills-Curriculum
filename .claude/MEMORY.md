# Project Memory

## Project Overview
- **Name**: SPOKES Employability Skills Curriculum
- **Description**: 6 self-contained interactive HTML lesson decks + dashboard launcher, validated against SPOKES-STANDARD.md
- **Tech stack**: Static HTML/CSS/JS (one index.html per lesson), Python validator/tooling, no build step
- **Repo**: origin/main (single squashed-history commit era began 2026-06-09)

## Current Status
Pre-meeting cleanup + full visual layout pass complete (team meeting with lesson creators 2026-08-17). All 6 lessons pass the validator with 0 CRITICAL; known WARNs are real, documented divergences (see below). All 199 slides visually reviewed at presentation size (1920×985) and scaled for classroom display.

## Last Session
- **Date**: 2026-08-03 (second session)
- **What we worked on**: Slide-by-slide visual review of all 199 slides across 6 decks, driven by Britt's finding that content was too small with too much negative space:
  1. Built tooling — scripts/slide-index.py (regenerable slide#→line map, docs/slide-index.md) and a headless-Chrome screenshot pipeline (scratchpad, session-local) that drives each deck's NAV-07 sessionStorage restore to render any slide.
  2. Global fix in all 6 decks — `@media (min-width:1600px) and (min-height:920px) { html { font-size: 19px } }` at the END of each theme-override (cascade position matters: same-specificity rules later in the block silently beat media-query rules placed earlier). Decks are ~100% rem-based so this scales everything.
  3. TM (Britt-reviewed, approved): title-slide orphaned ::after flex spacer removed, title grid fills full height; px-fixed components grown (visual-circle 250→340, takeaway-num 40→52); 5 undersized images bumped (flowchart 330→560, seven-ways 300→520, etc.); danger-card backs: text 1.02→1.15rem (1.32 at scale), gray→ink contrast, safe-center, overflow guard; closing h2 was dark-on-dark → tm-paper.
  4. Other 5 decks: CWP icon chips 48→76/44→64; CA scale-only (already well-composed); EA + IS + PSDM sidebar labels ran words together (h2 `<br>` with no space — fixed with trailing spaces); PSDM closing h2 dark-on-dark (an OLD fix existed but a later .slide h2 rule re-broke it — re-asserted after that rule).
- **What we decided**: 19px root scale scoped ≥1600×920 so the ≤900px fit-to-slide-guard regime is untouched; IS title's flat right color panel is deliberate theme design, left as-is; scale blocks live at end of theme-override by convention.
- **Where we left off**: All 6 decks fixed, validated (0 CRITICAL), committed and pushed to main. Britt reviewed TM in full + slide 20 flip cards; other 5 decks fixed by the same verified patterns, awaiting Britt's walkthrough.

## Open Items
- [x] Commit + PR to main (PR #3, merged 2026-08-03)
- [ ] Expected WARNs to eventually fix: interview-skills CMP-01/02 + NAV-11/12 (qa-* classes), employee-accountability NAV-11 (showTab signature)
- [ ] employee-accountability announcer omits "Slide X of Y" position (NAV-04 divergence)
- [ ] controlling-anger spinner ignores prefers-reduced-motion (RDM gap, not validator-covered)
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
