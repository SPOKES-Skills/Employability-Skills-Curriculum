---
target: lesson-controlling-anger deck
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-04T15-20-34Z
slug: lesson-controlling-anger-index-html
---
Method: dual-agent (A: critique-A design review · B: critique-B detector/evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Slide counter buried below 11 resource links; invisible when sidebar collapsed (mobile default) |
| 2 | Match System / Real World | 3 | WIPPEA badges (W/I/P/E/A) are curriculum jargon surfaced to students |
| 3 | User Control and Freedom | 3 | Peeking at a chapter list force-navigates the projected deck to that chapter |
| 4 | Consistency and Standards | 3 | Two sidebar entries both titled "The Anger Iceberg"; external game link wears download-button clothing |
| 5 | Error Prevention | 3 | Reflection textarea lost on refresh; hover auto-flip causes accidental reveals |
| 6 | Recognition Rather Than Recall | 3 | Flip cards (slide 13) give zero cue they flip — back content undiscoverable |
| 7 | Flexibility and Efficiency | 3 | No slide overview/number entry; focus resets to body every slide change |
| 8 | Aesthetic and Minimalist Design | 3 | 10-card wall on slide 18; instructor PDFs headline the student-facing title slide |
| 9 | Error Recovery | 2 | Blocked/offline Jeopardy dead-ends the whole Evaluation chapter; no fallbacks anywhere |
| 10 | Help and Documentation | 2 | Nothing in-deck explains flip cards, wheel contents, or how the deck is meant to be run |
| **Total** | | **28/40** | **Good (28–35): solid foundation, address weak areas** |

## Design Specificity Verdict

**Authored, with template seams showing.** The deck does not read as category-interchangeable: the royal/mauve dark identity fits the subject's gravity (unique among the six lessons), the SPOKES-branded Jeopardy asset carries lesson-specific categories, wheel prompts retrieve actual lesson concepts, and the copy is written for this audience's real world (write-ups, STAR method, de-escalation). The seams: components repurposed from the time-management lesson leak their old semantics — the muted "eliminate" quadrant style visually demotes "People" (slide 16) and "Indirect Control" (slide 28) though they are peers, and decorative gold-border alternation implies categories that don't exist. The lesson's central metaphor — the anger iceberg — is a bullet list next to a circle photo, not an iceberg.

**Deterministic scan** (7 findings, 0 false positives): 4 sit in the locked SPOKES base system (bounce easing on takeaway numbers; sidebar/progress-bar/slide-list layout-property transitions) — real but out of lesson scope by standard; 1 is real and fixable in the lesson layer (accordion max-height animation, line 2411); 2 never render (the flagged 6px card border and green hover glow are overridden by the theme) — with one sharp catch the design review missed: the overriding hover rule substitutes the same colored-glow pattern in mauve, so the antipattern survives visually in an editable location. Detector and review agree independently that chapter-scoped styles, not the base card system, define what actually renders.

**Visual overlays**: skipped — no interactive browser automation is available in this session (headless screenshots only), so no user-visible overlay exists; evidence came from the CLI scan plus direct source verification.

## Overall Impression

A dignified, genuinely authored deck whose fundamentals — emotional arc, copy, theme-subject fit — are stronger than its interaction layer. The score concentrates its losses in three places: an interaction pattern that hides its own teaching content (flip cards), mobile scroll behavior that clips slide tops unreachably, and an Evaluation chapter with a single external point of failure. Fix those and this is a 32+ deck.

## What's Working

1. **Theme–subject fit.** The royal/mauve/gold dark theme gives anger management for adults a serious register, and the dark inversion is executed with reasoned contrast decisions (gold emphasis remapping, royal-on-gold cells, glass cards).
2. **Copy that anticipates learner shame.** "(not graded)", "Anger is valid — it is information", "Letting go is not weakness". Written for adult basic education, not generic corporate training.
3. **Retrieval-practice loop.** Wheel prompts deliberately pull concepts back from earlier chapters; the branded Jeopardy asset makes review feel like part of the product.

## Priority Issues

1. **[P1] Mobile tall slides clip their tops unreachably.** `.slide.active` centers content while being the scroll container; overflow spills both directions and everything above the scroll origin is unreachable — verified at 390px on slide 13 (title cut off). Any tall slide is affected. *Fix:* `justify-content: flex-start` on `.slide.active` in the ≤768px media query. *Command:* /impeccable adapt
2. **[P1] Flip-card interaction is self-defeating (slide 13).** Hover auto-flip reveals all four backs in one mouse sweep; on touch the emulated mouseenter+click flips-and-unflips in a single tap (reads as broken); fronts carry no cue they flip, so the de-escalation guidance on the backs may never be seen. Screen readers additionally hear front+back text concatenated, pre-announcing the hidden answer. *Fix:* remove the mouseenter listener, add a "tap to reveal" affordance, hide the back from the accessibility tree until flipped. *Command:* /impeccable polish
3. **[P2] The Evaluation chapter is one external single point of failure.** Chapter 6 is a single slide whose only content is jeopardylabs.com — commonly blocked by school filters, useless offline, no in-deck quiz or printable fallback. ENG-01's intent (checkpoint in Evaluation) is unmet. *Fix:* add a 3–5 question in-deck checkpoint slide + link a printable review handout. *Command:* /impeccable harden
4. **[P2] Slide 18's 10-card wall invents false categories.** Ten simultaneous cards, and the alternating glass/gold styles resolve into a dark column vs a gold column — asserting a two-group taxonomy of rules that doesn't exist. Same miscue pairs "Unhealthy Anger" with "Anger as a Tool" via gold accents on slide 5. *Fix:* split into two slides of five (or three thematic groups) with one card style; assign slide-5 accents by meaning. *Command:* /impeccable layout
5. **[P2] Keyboard/SR users are dumped to document top on every slide change.** The blur-only focus reset means re-tabbing through ~20 sidebar stops per slide, thirty times per lesson. *Fix:* focus the active slide container (`tabindex="-1"` + `focus({preventScroll:true})`) after transition. *Command:* /impeccable harden

## Persona Red Flags

**Jordan (substitute teacher, cold open):** flip cards look static (teaching content never surfaces); two identical "The Anger Iceberg" sidebar entries; peeking at a chapter jumps the projected deck mid-lecture; the Thermometer video (17) has no debrief prompt before the 10-rules wall; a filtered Jeopardy site dead-ends slide 26 with no plan B.

**Sam (screen reader / keyboard only):** ~20 tab stops to re-reach content after every slide change; wheel prompts exist only as canvas pixels (only the post-spin result is readable); flip-card accessible names concatenate front + hidden back; sidebar inactive items measure ≈3.85:1 at 13.6px — below AA. Genuinely good: slide announcer, captions + CC toggle, tablist arrow keys, skip link.

**Casey (phone, distracted):** lands mid-card on tall slides with the title unreachable; first tap on a flip card appears broken; the nav pill overlaps content on tall slides; prev/next buttons ~35px and styled as keycap hints rather than buttons; with sidebar collapsed there is no visible slide-position indicator.

## Minor Observations

- Progress bar's royal left end camouflages against the royal stage; reads shorter than it is.
- Reflection textarea is the deck's one data-loss vector (refresh restores the slide, discards the writing).
- Wheel labels: 11px canvas text, left hemisphere upside-down, white-on-gold slice ≈2.2:1.
- Accordion max-height animation is the one detector finding fixable in the lesson layer; the mauve hover glow repeats the colored-glow pattern in an editable rule.
- Prev/next buttons measure ~35px yet MOB-03 passes the validator — the validator's check may be looking at the wrong element; worth auditing the check itself.
- ENG-02 gaps after videos 17 and 24; quote slide 23 spoils the video that follows it; "Course Rubric" download sits inside the celebration box at the emotional peak.
- Sidebar title for slide 23 is the entire four-line poison quote (titles scraped from h2 with no short-title override).
- Dead code: `playClickSound()` never invoked; `.reveal-item` observer system has zero matching elements.
- WIPPEA badges are instructor scaffolding rendered student-facing.

## Questions to Consider

1. If the flip-card backs hold the lesson's actual workplace guidance, why is it gated behind the least discoverable interaction — should backs be the visible content, fronts the headers?
2. Should a projected classroom deck have a typing surface at all? Would "think silently, then pair-share" plus the printed Iceberg handout serve the vulnerable moment better than an unpersisted, possibly-projected textarea?
3. What does this deck believe assessment is, if the only Evaluation activity lives on a blockable third-party site — should the SPOKES standard require Evaluation chapters to be self-sufficient offline?
4. Chapter theming rotates on a registry schedule — what if it tracked the lesson's emotional arc instead (cooling from mauve heat toward calm navy as students move from triggers to resolution)?
5. Slide 23 tells the poison quote, slide 24 shows it — should the big statement come after the video as the echo, with the debrief prompt ENG-02 already asks for?
