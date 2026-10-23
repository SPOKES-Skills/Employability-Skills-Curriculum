---
target: BeSpoke builder (showcase polish, 07644c3)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-10-21T17-49-41Z
slug: bespoke-index-html
---
Method: dual-agent (A: design review · B: detector and browser evidence). Target: BeSpoke builder, branch claude/bespoke-showcase-polish at 07644c3, local preview at 1280x800, 1440x900, 1024x768 and 390x844. Baseline: 22/40 at a8b73fc.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toasts, "Previewing X" with a live region, change counts and changed tags work. The apply toast covers the stage pills for 4s; Undo reports in the notice strip. |
| 2 | Match System / Real World | 3 | Stage names and named swatches land. Drawer still says "Use shared theme · Green", "Custom", "Arrangement"; the Editing picker says "Heading". |
| 3 | User Control and Freedom | 3 | Undo link, Escape restores, Swap starting look, Keep editing, one Hide options button. The Undo link hides itself and focus falls to BODY. |
| 4 | Consistency and Standards | 2 | The same title slide is letterboxed on Pick a look, a different shape on Make it yours, cropped on Send. The look name changes typeface per stage. Undo uses the strip, apply uses a toast. |
| 5 | Error Prevention | 3 | The scope line warns before a pick that a shared color also changes the Divider heading. |
| 6 | Recognition Rather Than Recall | 3 | Look name and named colors carry through. The mockup's "hover to preview" hint is gone. |
| 7 | Flexibility and Efficiency | 3 | Arrow/Home/End/Enter/Escape in the strip, Ctrl+Z, Ctrl+Alt+O, mood filters, Guide me. |
| 8 | Aesthetic and Minimalist Design | 3 | Pick a look and Send are clean. On Make it yours at 1280 and below, the toolbar band outweighs the slide. |
| 9 | Error Recovery | 3 | Save and send errors now show beside the Send buttons and in the strip. Undo loses focus. |
| 10 | Help and Documentation | 2 | How it works still uses "shared theme" jargon; keyboard instructions are screen-reader only. |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** The two ends of the flow are now authored for this product. Pick a look shows the team's own lesson name on a large live slide, names each look in its own heading font and previews on hover with a cross-fade. Send and Sent to Britt read as "our suggestion" with a deck, "Midnight & gold, made yours" and a fanned confirmation. Make it yours, where teams spend most of their time, still reads as a generic inspector: a band of form fields over a grey canvas with a smaller slide, and its drawer falls back to system words.

**Deterministic scan:** `detect.mjs` on `bespoke/index.html`: 0 findings. `bespoke/team-guide.html`: 1 finding, `design-system-font` (DM Serif Display at :7), a false positive by scope because bespoke/DESIGN.md governs the builder, not the guide. In-page injection on four stages raised 40 hits; 15 are false positives from the closed More menu (the detector measures closed `<details>` content), and the slide-render hits are team content, out of scope. Six real chrome findings remain: long line length on `p.panel-lead` (about 105 characters), `p.preview-caption` (about 152) and `#scopeLine` (about 164, plus a side-tab border and 0 vertical padding); `div.segmented` cramped padding (likely intended); a kicker above the Send heading; and a skipped heading level (h1 to h3) in `#sendPanel`. The detector agrees with the review on the scope line's weight and on Send's heading structure; the review caught the letterbox and layout problems the detector cannot see.

**Visual overlays:** Injection succeeded in an assessor tab that has since been closed, so no overlay is left open.

## Overall Impression

Up six points from 22. The showcase now works at Pick a look and at Send. Two rendering defects hold it back: slide renders that do not fit their frames on every stage, and a Make it yours layout that sizes the slide after the toolbar. Fixing those two would likely clear 30/40.

## What's Working

1. Pick a look: the stage is the largest element at 1280 and 1440, every render carries the lesson name, preview is not an undo step, Escape restores, and the strip is a proper listbox with roving tabindex and a polite live region.
2. The scope line replaces the contradictory badge with plain words before and after a pick, and tags the Divider thumbnail it touched.
3. Send is a contact sheet with three plain rows, one similarity line and settings folded away; chrome text runs on 7 sizes instead of 21.

## Priority Issues

**[P1] Make it yours sizes the slide with a 16:9 formula, but the editable slide is not 16:9, so the toolbar band pushes it off screen.**
- Why it matters: at 1280x800 with Title selected the slide ends 14px below the fold; with the drawer open only 79% shows. At 1024x768 30% shows, and on Pick a look the stage and filmstrip are never on screen together. The spokesperson's audience loses the slide.
- Fix: render the editable slide on a fixed 960x540 canvas scaled to fit; measure the band with a ResizeObserver; cap the band at two rows and move Sample text and Position behind More options below 1101px; drop the empty 280px column at 761-1100 when the drawer is closed; at 1024 put the strip directly under the stage.
- Suggested command: /impeccable layout, /impeccable adapt

**[P1] Showcase renders are letterboxed or cropped.**
- Why it matters: page white shows under the Pick a look hero (30px at 1280), side-column minis and Send deck slides are cut off, and the Sent fan shows a white wedge. The showcase reads as unfinished.
- Fix: give each render a fixed 540px height with its background filling it, or size each frame from the measured render height. Never show page white around a slide. (`showcase.css:41`, `:121`)
- Suggested command: /impeccable polish

**[P2] The apply moment is weak on a shared screen.**
- Why it matters: after a hover preview, a click only changes a 12px kicker and a thumbnail outline; the toast covers the stage pills. The call cannot see that a choice was made.
- Fix: a 300ms gold lock-in around the stage, "✓ Your starting look", a primary button that names the look, the toast moved below the bar, Undo and Redo through the toast with focus kept.
- Suggested command: /impeccable animate, /impeccable delight

**[P2] The look's identity fades between stages and two primaries compete.**
- Why it matters: the look name is 33.6px in its own font on Pick a look, 14px Outfit on Make it yours, 25.6px Outfit on Send. The bar's Save is a filled primary next to Make it ours.
- Fix: set the look name in its heading font on all three stages; make the bar's Save secondary on stages 1-3.
- Suggested command: /impeccable typeset, /impeccable bolder

**[P2] Words drift in the expert layer.**
- Why it matters: "Heading", "Use shared theme · Green", "Custom", "Arrangement", two disagreeing Sample text fields and "2 changes" for one pick force translation.
- Fix: "Title text", "Same as other slides", "Only this slide"; show the lesson name in the drawer field; remove #editScope where the scope line shows.
- Suggested command: /impeccable clarify

## Persona Red Flags

**Jordan (first-timer):** "Save test design" is the primary button on an empty first stage. Nothing says hover previews. Clicking a look seems to do nothing new. "Editing: Heading", "Use shared theme" and "Custom" need translating.

**Sam (accessibility, chrome only):** On Pick a look the h1 is the 12px kicker and the look name is a paragraph. Undo drops focus to BODY. The mauve focus ring reads as an error on drawer selects. Keyboard instructions are screen-reader only. Send skips from h1 to h3.

**Spokesperson sharing a screen on a call:** Every apply toast hides the Make it yours and Send pills for 4 seconds. At 1280x800 with the drawer open the slide is cut off. On 1024 laptops the stage and filmstrip cannot both show. The slide shrinks and changes shape after Make it ours. Key text (scope line, small print, changed tag) is 12-13px and blurs first on a compressed share.

## Minor Observations

- Raise the scope line and the "This is a suggestion" small print to `--fs-sm` or `--fs-md`; the scale itself reads.
- Strip thumbnail fonts load (all twelve faces are declared at document scope); not a showcase problem.
- The Lesson & team pill shows a check and the attention dot together.
- See every setting is a scroll inside the sticky panel's scroll.
- Long line lengths on `p.panel-lead`, `p.preview-caption` and `#scopeLine`.
- The save chip still truncates; the Sent view keeps the stage pills that the mockup drops.
- `builder-app.mjs` is 2013 lines.

## Questions to Consider

- If the slide must stay the largest thing, why does Make it yours size the slide after the toolbar instead of the toolbar after the slide?
- What if applying a look visibly locked in, with a button that names it, so the call hears and sees the choice?
- Should the filmstrip come along into Make it yours as a quick swap bar?
