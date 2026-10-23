---
target: BeSpoke builder (showcase polish after Task 10, 28d2c47)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-10-21T19-27-22Z
slug: bespoke-index-html
---
Method: dual-agent (A: design review · B: detector and browser evidence). Target: BeSpoke builder, branch claude/bespoke-showcase-polish at 28d2c47 (after Task 10 fixed the 2026-10-21T17-49-41Z P1s), local preview at 1280x800, 1440x900, 1024x768 and 390x844.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | The apply toast covers the "3 · Make it yours" and "4 · Send" pills for 4s; Undo reports in the page-top strip. |
| 2 | Match System / Real World | 3 | The Editing picker says "Heading"; the drawer says "Use shared theme · Gold". |
| 3 | User Control and Freedom | 3 | Undo, Escape and Swap starting look work; the Pick a look Undo link drops focus to BODY. |
| 4 | Consistency and Standards | 2 | Make it yours lays the slide out at column width, so its shape and layout differ from Pick a look and Send and change when the drawer opens. |
| 5 | Error Prevention | 3 | The scope line warns before a shared-color pick. |
| 6 | Recognition Rather Than Recall | 3 | The drawer's Sample title disagrees with the slide; no visible hover-to-preview hint. |
| 7 | Flexibility and Efficiency | 3 | Strip keyboard model, Ctrl+Z, Ctrl+Alt+O. |
| 8 | Aesthetic and Minimalist Design | 3 | The slide wins at 1280 and 1440; at 1024 with the drawer open the chrome still outweighs it. |
| 9 | Error Recovery | 3 | Unchanged. |
| 10 | Help and Documentation | 2 | Keyboard help is screen-reader only on desktop; "shared theme" jargon. |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** Pick a look and Send are authored for this product: an edge-to-edge slide with the lesson name, the look named in its own heading font, a mood strip, and a Send contact sheet that reads "Midnight & gold, made yours". Make it yours has moved closer: the slide now leads at 1280 and 1440 and the scope line speaks the team's language. It still reads as an inspector band over a grey mat, with a drawer in system words.

**Deterministic scan:** `detect.mjs` on `bespoke/index.html`: 0 findings. In-page injection on four stages and at 1024: the closed More menu and the unrendered texture swatches again account for most hits (false positives), slide-render hits are team content. Real chrome findings persist: line length on `p.panel-lead`, `p.preview-caption` (1280 only) and `#scopeLine`; `#scopeLine` side-tab border and 0 vertical padding; `div.segmented` padding; a kicker above the Send heading; an h1 to h3 skip in `#sendPanel` (now inside a hidden container). No horizontal overflow at 390.

**Visual overlays:** Injection succeeded in an assessor tab that has since been closed.

## Overall Impression

The two P1s from the last run are fixed and measured: every showcase frame matches its slide exactly, and the Make it yours slide is fully visible in every docked state tested (scale 0.506 to 1.0). The total holds at 28 because the fixes removed defects inside heuristics already scored 3, and a related inconsistency keeps heuristic 4 at 2: the editable slide reflows to the column width.

## What's Working

1. Showcase frames match their slides at 1024, 1280 and 1440 (hero 734x480 at 1280); the real 3:2 shape reads as a slide.
2. Make it yours keeps the whole slide on screen and refits when a notice appears or goes (0.685 with a notice, 0.758 without, at 1280); the selection outline stays visible.
3. At 1024 on Pick a look the stage and the strip show together.

## Priority Issues

**[P1] Make it yours lays the slide out at the column's width, not the 960 canvas the other stages use.**
- Why it matters: the Title slide is 2.05:1 with the drawer closed at 1280 and 1.62:1 with it open; Text boxes go from 3 across to 2 plus 1; at 1024 with the drawer open the slide's container query hides the sidebar, so "Navigation sidebar" selects a small sample pill. The team judges a layout that changes when the drawer opens and differs from what they picked and send.
- Fix: render the editable slide at the fixed 960 canvas and have `fitCanvas` scale by the smaller of column width / 960 and the height fit. Lesson output is unchanged.
- Suggested command: /impeccable layout

**[P2] At 761-1100 with the drawer open, the chrome outweighs the slide** (273x243 with Box 1 text at 1024). Fix: collapse the band to the Editing picker while the drawer is open below 1101px; keep Add text and More options on row 1 at 1440. /impeccable layout, /impeccable distill

**[P2] The apply moment is weak and the toast covers the stage pills** (known follow-up). /impeccable animate

**[P2] The look name loses its font after Pick a look, and two primaries compete** (known follow-up). /impeccable typeset

**[P2] Drawer wording** (known follow-up). /impeccable clarify

## Persona Red Flags

**Jordan:** a filled "Save test design" on the empty first stages; no hover hint; "Editing: Heading", "Use shared theme"; the drawer's Sample title disagrees with the slide.

**Sam (chrome):** the Pick a look h1 is the 12px kicker and the look name is a paragraph; Undo drops focus to BODY; the drawer's mauve focus ring reads as an error; at the 45% floor the selection ring thins to about 1.35px.

**Call spokesperson:** the toast hides the Make it yours and Send pills; opening the drawer reshapes the slide; a stale notice costs 38px of slide room; the app bar is two rows at 1024.

## Minor Observations

- On Pick a look at 1280x800 a notice pushes the strip's card names below the fold; `.look-stage` sizing ignores notice bands.
- Selecting Title at 1280 grows the toolbar and scroll anchoring moves the page about 60px.
- At 390 the slide starts at 592 of 844px; the save chip still truncates.
- Sent to Britt could not be reached in local test mode; it uses the same frame sizer, so its fan should now fill.

## Questions to Consider

- If Make it yours showed the same 960-wide slide as Pick a look and Send, would any team miss the column-width reflow?
- Below 1101px, does the toolbar band need to stay while the drawer, which repeats its fields, is open?
- What if page-top notices cleared on stage change, so a message never takes room from the slide?
