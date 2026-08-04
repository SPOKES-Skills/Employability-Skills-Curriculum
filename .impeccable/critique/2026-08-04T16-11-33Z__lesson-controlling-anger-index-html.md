---
target: lesson-controlling-anger deck (post-fixes)
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-04T16-11-33Z
slug: lesson-controlling-anger-index-html
---
Method: dual-agent (A: critique2-A design review · B: critique2-B detector/evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Collapsed-sidebar desktop presenting loses the numeric slide readout (position chip is mobile-only); chapter expand state not exposed to AT |
| 2 | Match System / Real World | 3 | Inherited Eisenhower visual grammar still demotes one equal category; brand green lands on "Forceful" anger style |
| 3 | User Control and Freedom | 4 | Solid — random access, swipe, session restore, quiz retry, un-flip, CC toggle |
| 4 | Consistency and Standards | 3 | ↓ glyph on open-in-tab PDF links; "Tap to reveal" shown to mouse users; gold accent decorates the negative cards on slide 5 |
| 5 | Error Prevention | 3 | Chapter-header click always navigates (place-loss trap); swipe starting in the textarea still changes slides |
| 6 | Recognition Rather Than Recall | 4 | Solid — ledes as instructions, labeled boxes, flip hints, restated sidebar titles |
| 7 | Flexibility and Efficiency | 3 | No visible wheel-prompt list for instructors; no presenter aids beyond Print All |
| 8 | Aesthetic and Minimalist Design | 3 | 340px wheel on a 1920px stage; theme-dark override flattens the three chapter card styles to one |
| 9 | Error Recovery | 3 | Quiz retry + offline Jeopardy fallback good; nothing handles a missing/blocked video or PDF |
| 10 | Help and Documentation | 3 | Teacher's Guide surfaced at cold start; WIPPEA badges never explained in-deck |
| **Total** | | **32/40** | **Good (28–35), up from 28** |

## Design Specificity Verdict

**Authored, seams narrowing.** The deck is genuinely anger-specific (iceberg framing, thermometer debrief, anger-loaded wheel, custom Jeopardy asset, handout ecosystem wired to the slides that use them) with copy written for the audience. Remaining seams: the inherited matrix vocabulary still leaks old semantics (muted "eliminate" cell demotes an equal category; green on "Forceful"); the theme-dark card override visually flattens the three chapter card styles to one glass panel (validator passes THM-04, eyes disagree); and the lesson's two canonical visuals — iceberg and thermometer — are never actually drawn in the deck.

**Deterministic scan**: 6 findings, 0 REAL in the editable layer, 0 false positives — 4 locked in the base SPOKES block (bounce easing, three layout transitions), 2 inert (overridden card border and hover glow). Both round-1 editable-layer findings are confirmed resolved. The lesson layer is detector-clean.

**Visual overlays**: skipped — no interactive browser automation in this session; evidence from CLI scan + static cascade analysis.

## Overall Impression

The interaction layer caught up with the deck's strong fundamentals: +4 points, driven by Control & Freedom and Recognition reaching 4s, a detector-clean editable layer, and accessibility engineering the review called "beyond the mandate." What remains clusters differently now: one genuine live-teaching trap in the locked engine (chapter-header navigation), a handful of scale/contrast items, and a set of emotional-safety refinements around the vulnerable moments.

## What's Working

1. **Accessibility engineering beyond the mandate** — focus landing via counter-observer, wheel sr-list + status announcements, aria-synced flip cards, text+icon quiz feedback, instant reduced-motion wheel result.
2. **Emotionally calibrated copy** — "Anger is valid — it is information", "not graded", the Speak/Listen protocol, the on-slide offline fallback sentence.
3. **Coherent identity at scale** — one voice across 33 slides; the sr-only-h2 + quote-display pattern was singled out as worth standardizing.

## Priority Issues

1. **[P1] Sidebar chapter headers navigate on every click.** Expanding a chapter to peek ahead yanks the class display to that chapter's first slide; headers also lack aria-expanded. The fix belongs in buildSidebar(), which sits inside the locked nav engine — an engine/standard amendment, not a lesson patch.
2. **[P2] Green-end matrix cells fail contrast and reward the wrong concept.** White text on the accent end of gradient cells (~2-3:1) on slides 16/28; on 28, brand green backs "Forceful" — the most destructive style. Fixable in theme-override + a markup class swap.
3. **[P2] The wheel ignores classroom scale and hides its prompts.** Px-fixed 340px wheel with 12px labels; prompts exist only in an sr-only list, so instructors can't preview or pick. Scale it in the ≥1600px block and render the list as a visible legend in the slide's dead left half.
4. **[P2] Mobile tap-targets and overlay.** Quiz options ~41px and mobile tabs ~36px (under the 44px floor); nav pill covers tappable rows mid-scroll; body 100vh risks iOS toolbar overlap (100dvh override).
5. **[P3] Reassurance gaps at the vulnerable moments.** Assessment-red frame + "CHECKPOINT" label contradicts "not graded"; no privacy line despite notes persisting locally; no opt-out phrasing on Pair & Share or wheel; the closing congratulations is the smallest text on its own slide.

## Persona Red Flags

**Alex (instructor mid-class):** chapter-header navigation trap; collapsed-sidebar desktop presenting loses the slide number; only Alex can read the 1.3rem spin result.
**Jordan (substitute, cold open):** can't preview wheel prompts (sr-only only); WIPPEA badges never decoded in-deck; Jeopardy slide offers four simultaneous paths with no primary.
**Sam (screen reader/keyboard):** chapter headers lack aria-expanded and navigate unannounced; a flipped card's name concatenates front+back (front's aria-hidden never toggles); skip-link target lacks tabindex="-1". Otherwise unusually well served.
**Casey (phone):** nav pill overlays quiz options and the fourth flip card mid-scroll; swipes starting in the textarea change slides; wheel is decorative at 200px.

## Minor Observations

Dead `.scenario-card` hover CSS; DM Serif/Outfit fonts fetched but fully overridden (standard-mandated declarations); gold border decorates the negative pair on slide 5; `.slide-list` max-height 500px will clip chapters past ~10 entries; "Tap to reveal" copy excludes mouse users; ↓ glyph on open-in-tab links; THM-04 passes in CSS but is visually erased by theme-dark — a validator-vs-eyes divergence worth a standard note.

## Questions to Consider

1. Who actually types in the reflection textarea on a projected display — should it be a genuine private-device moment (QR companion) or an honest paper prompt?
2. Should a lesson about calming use a calmer accent than alert-red mauve for its reflective moments, within the locked palette?
3. If theme-dark flattens Layer 2, should dark lessons get their own chapter-variation vocabulary that survives the inversion?
4. Is a 4-question quiz an adequate stand-in for the time block Jeopardy fills when blocked, or does Evaluation need an in-deck game-scale alternative?
5. Why does a visual medium never draw the iceberg or the thermometer — the lesson's two canonical images?
