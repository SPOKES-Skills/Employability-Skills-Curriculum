---
target: SPOKES Dashboard
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-04T17-55-18Z
slug: dashboard-html
---
Method: dual-agent (A: critique-dash-A design review · B: critique-dash-B detector/evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Offline fallback impersonates a live registry ("Registry 1.2.0" pill identical either way); pre-JS metrics are factually wrong (0 Ready vs actual 3) |
| 2 | Match System / Real World | 2 | Internal pipeline vocabulary (QA, Registry version, "18 Lessons Planned") on a teaching surface; "Module" vs "lessons" drift |
| 3 | User Control and Freedom | 2 | Empty search state offers no reset; the 12 "planned" lessons are promised but unreachable; filter state not in URL |
| 4 | Consistency and Standards | 3 | Card chrome consistent, but badge semantics inverted (QA loud gold, Ready recessive navy) and card art is six unrelated styles |
| 5 | Error Prevention | 3 | Good sanitization/escaping; but a renamed lesson renders "Ready" badge over "Coming Soon" footer |
| 6 | Recognition Rather Than Recall | 3 | No duration/slide/video info on cards (data exists in the registry); "QA" requires insider knowledge |
| 7 | Flexibility and Efficiency | 3 | One-click launch, live-count filters; no deep-linkable state |
| 8 | Aesthetic and Minimalist Design | 2 | Prime hero space spent on internal metrics; search+filters over-tool a 6-item surface |
| 9 | Error Recovery | 1 | Fetch failure invisible; no-JS shows wrong hardcoded metrics + empty grid, no noscript |
| 10 | Help and Documentation | 1 | Nothing explains QA vs Ready or orients a first-time user |
| **Total** | | **22/40** | **Acceptable (20–27): significant improvements needed** |

## Design Specificity Verdict

**Authored for SPOKES — and both assessments proved it independently.** The review verified the exact CLR-01 palette, TYP-01 flagship fonts, and per-lesson card theming keyed to each deck's registered colorLead (the hub visually forecasts the deck you launch); the mechanical scan confirmed zero off-palette hex literals — the file contains precisely the canonical 11, once each, in :root. FALLBACK_LESSONS is currently field-for-field in sync with the registry. Two brand breaks: the six card images are six unrelated visual languages (clipart, stock photo, 3D isometric, flat-lay, flat SVG, 3D figure) — a mood board, not a brand; and the detector caught what the review missed — the body background is a two-axis hairline grid (44px tiling, a recognizable AI-generated-UI tell), with a second unflagged grid overlay in the hero.

**Deterministic scan**: 1 finding (grid background, REAL, visible in gutters and between cards), 0 false positives, no locked blocks — the whole file is editable.

**Visual overlays**: skipped — no interactive browser automation this session; evidence from CLI scan, renders, and source reads.

## Overall Impression

A genuinely branded, defensively engineered hub that spends its best real estate on the wrong audience. The launcher's one job — find and launch a lesson — happens below the fold on the exact projector hardware it runs on, while internal pipeline telemetry (registry versions, QA counts, phantom "18 planned") owns the hero. Fix the fold, the contrast, and the who-is-this-for problem and this is a strong surface.

## What's Working

1. **Real brand-system execution** — exact palette, flagship fonts, and per-lesson accent theming driven by the registry's colorLead; the fallback array is verified in sync.
2. **Defensive, accessible engineering** — escapeHtml everywhere, path sanitization, aria-pressed filters, live result counts, skip link, reduced-motion handling; all links and images resolve.
3. **Card chrome and one-click launch** — fast scan differentiation, whole-card links, clear hover affordances.

## Priority Issues

1. **[P1] The primary task is below the fold at classroom resolutions.** At 1280×720 (typical projector) zero complete cards are visible; at 1024×768 the Launch buttons clip; on a phone the first card is 1.5 screens down. The hero + Project Status panel eat ~45% of vertical space. Fix: compress the hero to a single line, demote the metric panel, pull the grid up; acceptance = full first card row visible at 1280×720.
2. **[P1] WCAG AA failures on Launch CTAs and QA badges.** White on accent green ≈2.7:1; white on muted-gold ≈3.3:1 at small bold sizes (README-dashboard.md explicitly requires AA; CLR-05 documents muted-gold as large-text-only). Fix: royal text on gold/green chips — the problemSolving card already proves the pattern.
3. **[P1] The offline fallback impersonates a healthy registry.** The catch path hardcodes version + date, so a failed fetch renders pixel-identical to live (verified). When the registry bumps, the fallback will confidently lie. Fix: distinct "Offline copy · synced …" label; hoist fallback version/date into constants beside FALLBACK_LESSONS.
4. **[P2] Internal pipeline vocabulary owns the instructor surface.** "Project Status", "18 Lessons Planned" (12 phantoms), QA badges in the loudest color on the page — a substitute may skip three teachable lessons. Fix: operator language ("6 lessons available"), registry info to the footer, translate or hide status on launchable lessons.
5. **[P2] No-JS/script-failure state is a broken dashboard** — wrong hardcoded metrics, empty grid, no noscript. Six stable links should survive script failure on aging classroom machines.

## Persona Red Flags

**Alex (projector)**: no clickable cards above the fold at 1280×720; internal metrics projected to students; cards status-ordered with no cue.
**Jordan (substitute)**: gold "QA" reads as caution — may avoid half the catalog; no duration/slide/video logistics despite the data sitting in the registry; no help anywhere.
**Sam (SR/keyboard)**: operable end-to-end; but each card link's accessible name is ~35–40 words (badge+title+description+CTA+descriptive img alt inside the link — alt="" is correct there); filter buttons 40px.
**Riley (stress tester)**: network kill → silent masquerade; corrupt JSON → error swallowed, no console breadcrumb; renamed folder → self-contradictory "Ready"/"Coming Soon" card; empty registry → misleading "No lessons match the current view."; no-JS → asserts wrong numbers.
**Casey (phone)**: hero alone is ~1.5 viewports; cards fine once reached.

## Minor Observations

Grid-texture background (detector) + second hero grid overlay; dead code (.eyebrow/.subtitle CSS, ICON_MAP + getIcon + .card-icon never invoked — the registry's icon field is unused); inert noopener on same-origin links; hero (1180px) and grid (1740px) never share an alignment line; navy READY badge nearly invisible over the dark handshake photo; redundant double cache-busting; search matches the internal themeKey string; build-pill text flashes before JS replaces it.

## Questions to Consider

1. Who is the Project Status panel for? If the answer is the build pipeline, it belongs in an admin view, not projected to learners.
2. Should a lesson's pipeline status ever be an instructor's problem, if QA lessons are fully teachable?
3. Is the unit of choice "lesson" — or "today's class session"? Duration/video chips from the registry would answer the question instructors actually bring.
4. The layout is tuned for exactly 6 lessons; the hero promises 18. Design for 18 now, or stop advertising 18.
5. FALLBACK_LESSONS sync is a human-memory contract — is a trivial build step that inlines the registry cheaper than policing drift forever?
