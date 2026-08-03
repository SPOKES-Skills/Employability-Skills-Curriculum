# Project Memory

## Project Overview
- **Name**: SPOKES Employability Skills Curriculum
- **Description**: 6 self-contained interactive HTML lesson decks + dashboard launcher, validated against SPOKES-STANDARD.md
- **Tech stack**: Static HTML/CSS/JS (one index.html per lesson), Python validator/tooling, no build step
- **Repo**: origin/main (single squashed-history commit era began 2026-06-09)

## Current Status
Pre-meeting cleanup complete (team meeting with lesson creators 2026-08-17). All 6 lessons pass the repaired validator with 0 CRITICAL; known WARNs are real, documented divergences (see below).

## Last Session
- **Date**: 2026-08-03
- **What we worked on**: Full repo review + three fix phases:
  1. Student-facing bugs — big-rocks.vtt captions (video is music-only; wrote music-descriptor cues), switchTab icon-click bug in communicating-with-the-public, confettiTriggered guards added to time-management + interview-skills.
  2. Registry/README/cleanup — 3 release-approved lessons promoted to "ready" (registry 1.2.0), Dashboard fallback synced, README rewritten (was pre-migration stale), deleted duplicate pptx/pdf/backup HTML/__pycache__/stale Dashboard-fixes docs, added root .gitignore, normalized lesson .gitignores, superseded banners on stale docs.
  3. Hook + validator repair — hook moved to .claude/settings.json calling scripts/hooks/validate-lesson-hook.sh (stdin JSON, python3, exit-2/stderr contract; old $CLAUDE_FILE_PATH hook never fired). Validator: THM-05/A11Y-12/RDM-01/RDM-05 now read theme-override CSS, CMP-01/02 implemented, A11Y-01/NAV-11/12 keyed to markup not names, NAV-08 warns on unguarded confetti, A11Y-07 fails on cue-less VTT. Tests 41/41 green (fixtures repaired + 8 regression tests).
- **What we decided**: Keep interview-skills qa-* component classes as WARN (works at runtime, verified); confetti guard uses the reset-on-leave pattern matching the 4 reference lessons; dropped index.premium.html (Britt's call, 2026-08-03).
- **Where we left off**: PR #3 merged to main 2026-08-03. Repo is meeting-ready; remaining items below are post-meeting follow-ups.

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

## Architecture Notes
- SPOKES-STANDARD.md is the single source of truth; validator scripts/validate-lesson.py enforces it via PostToolUse hook (scripts/hooks/validate-lesson-hook.sh)
- Six-way nav-engine drift exists: only reference signature switchTab(btn,panelId) has zero live call sites; three lessons use switchTab(event,tabId); consolidation is a future upgrade
- Dashboard.html fetches lesson-registry.json with a hardcoded FALLBACK_LESSONS array for file:// use — keep both in sync when editing the registry

## Known Issues
- Validator heuristic checks THM-02/03/04, A11Y-16, MOB-04, PRF-02, ENG-02, ENG-04, CLR-04 are still unconditional PASSes (documented as heuristic)
- test suite runs via `python3 -m unittest discover -s scripts -p test_validator.py` (pytest not installed)
