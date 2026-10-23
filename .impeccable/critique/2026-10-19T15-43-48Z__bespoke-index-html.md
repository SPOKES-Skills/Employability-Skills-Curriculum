---
target: "BeSpoke builder (PR #56)"
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-10-19T15-43-48Z
slug: bespoke-index-html
---
Method: dual-agent (A: design review · B: detector and browser evidence). Target: BeSpoke builder, PR #56 head a8b73fc, local preview.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Save and preset notices render at the top of the page while the user is scrolled far below; the save chip truncates |
| 2 | Match System / Real World | 2 | Presets say Midnight, Berry, Ocean; the editor and Review say Royal, Mauve, Blue |
| 3 | User Control and Freedom | 3 | Undo, Redo, Try another version and Compare are good; a preset cannot be previewed without applying it |
| 4 | Consistency and Standards | 1 | One stage has three names; the toolbar takes three different forms at 1024, 1280 and 1440; the drawer has three close buttons |
| 5 | Error Prevention | 3 | Confirm dialog and Undo exist; a toolbar color pick silently recolors other slides |
| 6 | Recognition Rather Than Recall | 2 | Color dots have no names; the preset name disappears after it is applied |
| 7 | Flexibility and Efficiency | 2 | Shortcuts exist; hover preview exists only inside Guide me |
| 8 | Aesthetic and Minimalist Design | 2 | Customize shows slide, toolbar, drawer, full editor, similarity meter and a stale notice at once |
| 9 | Error Recovery | 3 | Readability notes offer repairs; conflict and lock messages are clear |
| 10 | Help and Documentation | 2 | How it works still describes the old three-stage flow (builder-app.mjs:1420) |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**Review:** the chrome is category-interchangeable: a generic template gallery followed by an inspector panel, in SPOKES navy. Everything specific to SPOKES lives inside the slides (real rendered thumbnails, the WIPPEA sidebar). The rigid feeling comes from: twelve identical preset cards that all show the sample title "Make room for your next step" (builder-catalog.json:830 and on) instead of the team's lesson; a hard cut from the gallery to Customize when a preset is picked (builder-app.mjs:1391-1397); system vocabulary (Selected element, Match arrangement, Shared default); a Review stage that reads as a 583-word spec sheet ending in a text box; and no motion anywhere (the only motion rule is the reduced-motion switch-off, builder.css:112).

**Deterministic scan:** 0 findings in index.html and the builder scripts. 102 findings in builder.css, canvas.css and guide.css. Real: 21 distinct computed font sizes in the chrome, 22 unlisted size values in builder.css, and four colors not in DESIGN.md (#44536a renders as text, #647487 and #8191a3 in the drawer). False positives: the 13 @font-face flags (those load the 12 lesson fonts teams choose, not chrome fonts), the layout thumbnail's left bar, the segmented control's selected rule, and every flag inside the closed menu.

**Browser evidence:** one verified overlap. With Slide options open at 1440x900, the toolbar wraps to 154px tall and covers the "Make it feel distinct" panel. Paragraphs reach about 170 characters per line on Customize. The four stage pills are 36px tall (under the 44px target used everywhere else). Zero console errors.

## Overall Impression

The best moment in BeSpoke is the first look at the gallery: twelve real, colorful slides. Then picking one cuts away, the name of the chosen look vanishes, and the rest of the flow feels like filling in a settings form. The biggest opportunity is making the preset moment a reveal the team can watch, and keeping their choice visible as "theirs" all the way to the end.

## What's Working

1. The real slides are everywhere. Gallery cards and the thumbnail rail are true renders that update live, so teams judge actual slides, not abstract swatches.
2. The edit loop suits a team call: click the slide, see it change, Undo, Try another version, Compare A and B.
3. Guide me has the only warm voice in the product ("Where should the title sit on the slide?") and previews a choice on the big slide when you hover it.

## Priority Issues

**F1 [P1] Picking a preset is a cut, not a reveal.** builder-app.mjs:1391-1397 jumps to Customize, keeps the old scroll position (the toolbar lands half under the top bar), and confirms with the same yellow strip used for warnings. A second preset opens a modal. After that the preset name never appears again. On a call, the team sees the screen jump and loses the thing they just chose. Fix: show the chosen look large beside the gallery, let hover and focus preview it (reuse Guide me's preview), replace the modal with Undo, add a clear "Make it ours" step into Customize at the top of the page, and carry the name ("Starting from Midnight and gold · 2 changes"). Commands: layout, delight, animate.

**F2 [P1] Which slides a change affects is hidden.** By decision in this PR, a toolbar color pick applies to every slide that shares that color unless Only this slide is on (preview-editor.mjs:102). The badge above it says "This slide type only", and with the drawer closed (the default) no scope text shows at all. Changing the title heading to Green also turned the divider heading green with no signal. Fix without reversing the decision: delete the contradicting badge, add a one-line consequence in the toolbar ("Also changes: Divider heading"), and briefly mark the thumbnails that changed. Commands: clarify, animate.

**F3 [P1] The toolbar is not reliably next to what you clicked.** At 1440x900 with the drawer open, the box-text toolbar renders below the fold and covers the similarity panel. At 1280x800 its two rows cover Present and Try another version. At 1024 it becomes a form in a sidebar. Font, the choice that most sets the feel, is not in the toolbar at all. Fix: one placement that stays in view, one row plus an overflow menu, scroll into view on selection, add Font. Commands: layout, adapt.

**F4 [P2] The gallery is a uniform grid.** Same sample sentence and same five-line card anatomy twelve times; no lesson name although the team chose it one screen earlier; the team's own edited design never appears as a card. Fix: put the lesson's title on the thumbnails, make the slide the card with a one-line name, group the twelve into a few moods, add a "Your design" card, and call the empty path "Build my own". Commands: distill, bolder, layout.

**F5 [P2] The ending is a spec sheet.** Review is a long key and value list in a narrow column; the slide scrolls away; Save feedback appears off-screen; there is no picture of what the team is sending and no finish moment. Fix: a contact sheet of the five slides, a three-line plain summary with the specs folded away, notes, one clear save or send action, and a receipt that restates "your program lead and administrator make the final design". Commands: distill, delight, layout.

**F6 [P2] Words drift and help is stale.** The stage is "Color & layout" on the pill, "Start with color" as the heading and "starting looks" on the button. Preset color names disagree with palette names. How it works describes a flow that no longer exists. Fix: one name per thing, show the preset's color names (for example "Berry (Mauve)"), plain labels (Editing, Default, Position), rewrite How it works. Command: clarify.

## Persona Red Flags

**First-time spokesperson:** clicks "Continue to starting looks" and lands on "Start with color" under the "Color & layout" pill; looks for Build my own and finds "Customize current design"; reads "Only this slide" beside a badge saying "This slide type only" and stalls; saves and sees nothing change.

**Keyboard and screen reader user (chrome):** selectable slide parts are focusable headings and paragraphs with no button role, and the sample headings join the page outline; the toolbar's visual order does not match its tab order (canvas.css:98); Customize has about 109 focusable controls. Dialogs trap and return focus correctly.

**Four teachers on a shared Teams screen:** toolbar and thumbnail text at 0.6 to 0.75rem blurs on a compressed share; color dots have no names ("which blue?"); versions are "Option A" and "Option B" rather than "the berry one"; instant swaps make it hard to see what changed; "8 of 22" reads like a score.

## Minor Observations

- Stale notices carry across stages ("Bold berry applied" still shows on Review).
- The drawer repeats "Stage 3 of 4" and its five editor tabs duplicate the thumbnail rail.
- Compare A and B shows slides in near-square frames, distorting 16:9 designs.
- Save is the primary button on an empty stage 1; Back is disabled there.
- The mauve focus ring on a text field reads like an error state.
- builder.css redefines the workspace grid four times and canvas.css again, which explains three layouts across widths.
- The selected-element outline from Customize is still drawn on the Review preview.

## Questions to Consider

1. If what a team sends is a suggestion, why does the ending look like a form instead of something they would be proud to show?
2. What if picking a preset never left the gallery, and the twelve looks became a strip beneath the team's own edits?
3. Should Guide me's voice and hover previews be how all of BeSpoke talks, with the drawer as the expert path?
