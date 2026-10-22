# BeSpoke on the open design standard, with premium motion and media

Date: 2026-10-22. Owner: Britt. Branch: `claude/bespoke-open-standard`, cut from the PR #59 head (`1e5ce9d`), which sits on PR #56.

## Problem

The open design standard fixes three things in every lesson: the 11 brand colors, the SPOKES logo and readability. Everything else is open, and lessons should look clearly different from one another. Its spec is `docs/superpowers/specs/2026-10-22-open-design-standard-design.md` on branch `standard/open-design-variety` (worktree `.claude/worktrees/open-design-standard`). That spec lists "Changing BeSpoke" as a non-goal. Britt reversed that on 2026-10-22 and asked that BeSpoke follow the same design.

BeSpoke falls short in two directions. It still offers options the standard rules out (texture backgrounds, gradients, more than two typefaces). It also offers much less variety than the standard opens (four card looks, a left sidebar only).

Britt also wants lessons to feel premium. To her that means smooth transitions and animation, images and video that are well made and sharp, and slides that assemble themselves in a timed sequence ("Transformer style decks that reveal in a timed loadout"). None of this may slow the GitHub Pages site, so Britt capped images and video at 1080p.

## Solution

Four parts, built in order, each with its own plan and pull request:

1. Replace every BeSpoke option the standard rules out with a compliant one, and convert saved designs.
2. Add the variety the standard opens, plus typography, spacing and finishing details, and advisory polish notes on Send.
3. Add a timed loadout and smoother transitions to the lesson template, with a motion choice and Replay in BeSpoke.
4. Serve sharp images inside a fixed performance budget, and add a quality-gate guard that enforces it.

## Goals

1. BeSpoke offers nothing the open design standard rules out.
2. BeSpoke offers the wider variety the standard opens, plus finishing details that make a design look polished.
3. Lessons can use a timed loadout: each slide's parts enter in a set order on arrival, smoothly, without making anyone wait.
4. Images and video look sharp at up to 1080p, without sending large files to small screens.
5. A quality-gate check keeps the Pages site within a fixed performance budget.
6. Every design a team already saved still opens, converted to compliant choices, with the change explained.

## Non-goals

- Changing the 11 colors or rules CLR-01 to CLR-08.
- Changing the six released lessons.
- Building the six Round 2 lessons.
- 4K images or video, and any video host outside GitHub Pages.
- Image or video uploads in BeSpoke. Teams choose how media is treated; media itself is production work.
- Editing the lesson navigation engine (`CLAUDE.md`: defined in SPOKES-STANDARD.md Section 5).

## Anti-goals

- A slower Pages site, or a first slide that takes longer to show than it does today.
- Motion that makes a learner wait, hides content until an animation ends, or moves for someone who turned on reduced motion.
- The machine-made defaults CRD-02 lists: frosted glass, gradients for effect, glows, texture filler, emoji or decorative icons, hover motion on things that aren't controls.
- Variety that breaks the fixed three.
- A team opening its saved design and finding it silently changed.

## Constraints

- The open design standard spec is the authority for rule IDs (LOGO-01, LOGO-02, A11Y-20, CRD-01, CRD-02, revised TYP-02 and THM-04). It is not merged yet. Parts 1 and 2 can be built against its text; final wording follows whatever Britt approves there.
- Saved designs stay `bespoke-selection/v2`. Old values convert on open the way `migrateV1` (`bespoke/builder-model.mjs:713`) converts v1 drafts: the team sees a plain list of what changed, and every backup keeps the original.
- The Netlify service bundles `bespoke/builder-model.mjs`, `bespoke/builder-catalog.json`, both selection schemas and `bespoke/catalog.json`. Any change to them means Claude stages the service and Britt deploys it before the pull request merges (auto-memory `bespoke-netlify-deploy`).
- This branch builds on PRs #56 and #59. If either changes before it lands, rebase onto the new head.
- `bespoke/builder-app.mjs` is already 2,048 lines. New logic goes into new or existing modules; new files stay under 800 lines.
- A v2 lesson build pastes `design.css`, made by `cssForDesign` (`bespoke/builder-model.mjs:471`), into `style#theme-override` unchanged (`scripts/bespoke_design.py:95`). That is the single source of lesson-side styles for every BeSpoke option. `SPOKES Builder/theme-library.css` is generated from `theme-options.json` and stays untouched. `SPOKES Builder/template.html` changes only where an option needs markup or behavior the CSS cannot give, such as the loadout or the running footer.
- CLR-04 permits `rgba()` opacity of palette colors. Shadows, the watermark's opacity and similar uses stay allowed.
- Existing motion rules apply: RDM-01, RDM-02 and RDM-06 (reduced motion), NAV-05 (View Transitions with a fallback, `template.html:2630`), PRF-01 and PRF-02 (videos never preload and load lazily).

## Decided by Britt (2026-10-22)

1. BeSpoke follows the open design standard.
2. Conflicting options are replaced with compliant ones, not just removed.
3. Add all the variety and polish elements discussed: whole-lesson choices, sidebar, title, divider, text box, video and activity additions, typography and spacing craft, finishing details and advisory polish notes (Part 2).
4. Premium means smooth transitions and animation, well-made images and video, and a timed loadout reveal.
5. Keep the risks in view. GitHub Pages must not perform poorly.
6. The performance budget below is approved.
7. Order: Part 1, then Part 2, then Part 3, then Part 4. Each part gets its own plan and pull request.
8. Images and video top out at 1080p, for performance and simple hosting on GitHub Pages. No 4K.

## Variables

- `BRANCH`: `claude/bespoke-open-standard`.
- `BASE`: `1e5ce9d`, the PR #59 head, on top of PR #56 (`ba2c6fd`).
- `STANDARD_SPEC`: `docs/superpowers/specs/2026-10-22-open-design-standard-design.md` on `standard/open-design-variety`.
- `PLAN_1` to `PLAN_4`: `docs/superpowers/plans/2026-10-22-bespoke-open-standard-part-<n>.md`, one per part.
- `GATE`: `bash scripts/quality.sh`.

## Part 1. Replace what the standard rules out

### Backgrounds

Remove Dot grid, Diagonal, Crosshatch and Soft wash (`backgrounds` in `bespoke/builder-catalog.json`; drawn by `patternFor`, `bespoke/builder-model.mjs:43-65`). They are texture filler under CRD-02.

Replace them with solid structure in palette colors:

- **Plain.** Stays.
- **Color block.** A second palette color fills a band, a half or a corner, with a hard edge.
- **Edge rail.** A solid stripe along one side, or two parallel stripes.
- **Frame.** A solid border inset from the slide edge.

The big number or word option builds on the existing watermark and is listed in Part 2.

### Title and divider gradients

Replace the Gradient option on title and divider slides (`slides.title.colors`, `slides.divider.colors`) with a two-tone split: the same two colors (`titleBackground` or `dividerBackground`, and `titleBackgroundEnd`) meeting at a hard edge, straight, diagonal or as a band. This is Claude's recommendation. The standard bans multi-color gradients used for effect, so a two-color gradient may pass; Britt decides (Open questions).

### Fonts

The revised TYP-02 allows at most two typefaces per lesson, in any combination of the installed fonts.

- The design picks one heading font and one body font from all 12, in any combination. `fontPairings` become suggestions, not limits.
- Every per-slide font choice (`headingFont`, `bodyFont`, `extraFont`, `watermarkFont` in role styles) becomes "Heading font" or "Body font".
- A design can never hold a third typeface. Enforce this in the model and the schema, not only in the controls.

### Readability

Pending Britt (Open questions, item 1). The October 7 decision says BeSpoke gathers team opinions and gates nothing on readability; the standard makes readability fixed. Guide me already shows four readable color suggestions first, with the rest behind More colors, and that is the likely pattern whichever way Britt decides.

### Ready-made looks

Keep the 12 looks as starting points. This is Claude's call: a look is where a team starts, and the team then changes it into a design made for its lesson, which is what "no predefined theme packages" asks for. Britt may tighten this (Open questions).

### Converting saved designs

Map each removed value to its nearest compliant one: textures to Plain, Gradient to the two-tone split, a third typeface to the closer of the design's heading and body fonts. Show the team which choices changed, and keep the original in every backup.

Remove values in two steps. In Part 1 the controls stop offering them, the page converts them on open, and the schema, the service and `scripts/bespoke_design.py` keep accepting them. Sent proposals still confirm, approved designs not yet built can still be built, and the live page keeps saving while a new service is deployed ahead of its pull request. Narrowing the schema is a later change, made only after Britt confirms no sent or approved design still uses a removed value.

## Part 2. More variety and polish

All new options use only the 11 colors (CLR-04 opacity allowed), leave the logo untouched and keep text readable. Each must render in BeSpoke's 960 canvas preview, reach the build contract (`scripts/bespoke-write-submission.py`), and come out of `cssForDesign` (Constraints).

### Whole-lesson choices

These tie a design together (THM-02).

- Corner shape: square, soft, rounded or cut. Applies to cards, frames and buttons together.
- Signature mark: a rule under headings, a corner bracket, a side tab or an underline bar. One per design.
- Rule weight: hairline, medium or bold, for rails, frames and divider lines.
- Heading style: sentence case, capitals or small capitals, with weight and letter spacing.
- Number style: plain, badge, large outline numeral or tab. Used for numbered items, chapters and steps.
- Buttons: solid, outline or underlined link, in the corner shape. Hover effects are allowed because buttons are controls.
- Type scale: compact, balanced or dramatic. Headings, subheads and body step down in fixed proportions instead of being sized one by one.
- Spacing: airy, balanced or compact, applied to every margin and gap.
- Logo size relative to the title, with a fixed clear space around the logo. LOGO-02 allows resizing; the logo image never changes.
- Running footer: lesson name, chapter and slide number in small capitals. On or off.

### Sidebar

- Side: left or right. The sidebar keeps working the same way (A11Y-17, MOB-02, NAV-13).
- Style: solid, slim rail with chapter numbers, two-tone split, or outline with a rule.
- Current-chapter marker: bar, filled block, number or underline.

### Title slide

Add to today's 12 layouts: oversized title word cropped by the slide edge, offset block (the title on a color block that crosses the edge), ribbon or tab, stamp frame, big lesson number, two-tone diagonal cut.

### Chapter dividers

Add to center, left, band and number: giant chapter numeral, two-tone split, rail plus chapter name, ribbon or tab, progress strip (solid segments showing "chapter 2 of 5").

### Text boxes (CRD-01)

- Shape: the whole-lesson corner shape, plus tab or ribbon tops.
- Edges: a rail on any side, double rails, or corner marks.
- Header: title band, small label above the title, or number badge.
- Depth: flat, soft shadow, hard offset shadow or stacked paper.
- Layout: rows, columns, timeline, side-by-side comparison, or one large box with smaller ones.
- Content: paragraph, bullets, steps, big number, quote or checklist.
- Interaction: flip, expand or reveal on tap. These are controls, so they may move.

### Video and activity slides

- Video frame: thick border, offset shadow, corner marks or caption band. Placement: left, right, or full width with a solid band.
- Activity label: tab, ribbon or stamp. Activity layout: checklist, numbered steps, or a prompt-and-response split.

### Typography and layout craft

These are render rules for every design, not team options, except the drop cap.

- Balanced line breaks in headings (`text-wrap: balance`) and no single-word last lines in body text (`text-wrap: pretty`).
- Tight heading line spacing; wider letter spacing on capital-letter labels.
- Body lines capped at about 60 to 70 characters.
- Big statistics in the heading font with lining numerals; tabular numerals where numbers line up in columns.
- Pull quotes with a large quotation mark set in the heading font. It is a letter, not an icon, so CRD-02 allows it.
- Optional drop cap on an opening paragraph (team option).
- One alignment grid shared by every slide, so edges line up from slide to slide.
- More asymmetric layouts, such as one-third and two-thirds splits.
- Instructor wording stays exactly as written (KEEP VERBATIM). These rules change how text is set, never the words.

### Advisory polish notes on Send

Suggestions shown on Send, never blocks:

- "Uses 6 of 11 colors", against the standard's guide of usually 5 or 6.
- The accent color fills more than two roles.
- About 60% dominant, 30% secondary and 10% accent as a proportion guide.
- Mixed corner shapes, more than one signature mark, or body lines longer than the cap.

## Part 3. Motion and the timed loadout

### How a loadout behaves

When a slide arrives, its parts enter in a fixed order: background first, then frame and rails, then the heading, then each card or content item, one after another on a set beat. "Transformer style" is Britt's phrase; Claude's reading is parts sliding in and locking into place. Britt confirms or corrects this before Part 3 is planned (Open questions).

- The whole sequence finishes in about 1.5 seconds.
- Only `transform` and `opacity` animate, so the browser never recalculates layout and school laptops stay smooth.
- One easing curve and one beat for every lesson element.
- Next, Space, an arrow key or a click finishes the loadout at once. The following press moves on as usual.
- With reduced motion on, nothing moves and everything shows at once (RDM-01, RDM-02).
- All content is in the page and readable by screen readers from the start. Nothing is hidden from assistive technology while it animates, and nothing disappears afterward.
- Video never autoplays.

Slide-to-slide transitions keep using View Transitions with the existing fallback (NAV-05, RDM-06), tuned to the same easing curve.

### Where it lives

The loadout is part of the slide content layer, in `SPOKES Builder/template.html` and `theme-library.css`. It does not edit the navigation engine.

### In BeSpoke

Teams choose a motion style: none, subtle (one short fade) or loadout. The preview has a Replay control so the team can watch it again.

### In the standard

Part 3 proposes motion rules (for example a MOT section) for the open design standard. Britt approves their wording there.

## Part 4. Images and video on a performance budget

### What exists today

Lesson videos are served from GitHub Pages; the largest is 41 MB (`lesson-interview-skills/videos/what-to-wear.mp4`). The packed repository is 680 MB. GitHub Pages caps a published site at about 1 GB and refuses files over 100 MB.

### Performance budget (approved)

- **First slide.** The page, styles, fonts and first-slide images come to under about 1.5 MB before the first slide shows. Images and video on later slides load only as the learner nears them.
- **Images.** AVIF or WebP in two widths, 960 and 1920 pixels, with `srcset` and `sizes` so the browser picks the smaller one when it looks sharp. 1920 is double the 960 slide canvas, so slides stay sharp on high-density screens. Each 1920-wide file stays under about 400 KB.
- **Animation.** As in Part 3: moving and fading only, about 1.5 seconds, skippable, still under reduced motion.
- **Video.** 1080p at most, served from Pages with no preloading (PRF-01).
- **Budget guard.** A script in `scripts/quality.sh` fails the gate when a new file passes 50 MB, a lesson's first-slide payload passes 1.5 MB, or the published site passes 900 MB, which leaves room under the 1 GB cap. Files already in the repository count toward the site total but are not failed individually.

### Image treatment

- One crop shape per lesson.
- Text over a photo always sits on a solid band in a palette color (CRD-01, A11Y-20).
- Every image has alt text (A11Y-11).
- In BeSpoke, teams choose the crop shape and band style. The images themselves come from production.

## Calls Claude made

- Two-tone split as the replacement for gradients.
- The 12 looks stay as starting points.
- Diagonal and Crosshatch count as texture filler along with Dot grid.
- Budget numbers: 1.5 MB first slide, 400 KB per 1920-wide image, 50 MB per new file, 900 MB site.
- Motion style names: none, subtle and loadout.
- Removed values leave the controls first and the schema later, after Britt confirms no live design uses them.
- `cssForDesign` is the single source of lesson-side styles; `theme-library.css` stays untouched.

## Left to the builder

- How the loadout detects a slide's arrival without editing the navigation engine.
- Exact geometry for each new layout, frame and mark, within the 960 canvas.
- Option labels in BeSpoke, following its plain-word style (`bespoke/DESIGN.md`).
- How the budget guard measures the first-slide payload.
- The conversion message wording for saved designs.

## Open questions for Britt

1. **Readability in BeSpoke.** The standard makes readability fixed; the October 7 decision says BeSpoke is advisory and gates nothing. Choose one: pickers hide unreadable colors, pickers show them locked with a short reason, or BeSpoke stays advisory and Britt's approval catches problems.
2. **Two-color gradients.** Keep a two-color gradient on title and divider slides, or use only the two-tone split.
3. **Ready-made looks.** Keep the 12 as starting points, or have a look set only layout and card shape while colors and fonts come from the team's design brief.
4. **The loadout picture.** Confirm or correct the reading in Part 3 before it is planned.
5. **Approval wording.** The standard's own open question (every BeSpoke design needs Britt's approval, or only one that breaks a rule) decides how Send describes what happens next.

## Workflow

1. **Answer.** Britt answers the open questions that block a part before that part is planned. Item 1 blocks Part 1; item 4 blocks Part 3.
2. **Plan.** Write `PLAN_<n>` for the next part with `superpowers:writing-plans`, and commit it before any implementation change for that part.
3. **Build.** Test first. Run `GATE` after each task.
4. **Stage.** For a part that changes a file the service bundles, Claude stages the service and Britt deploys it before the pull request merges.
5. **Verify.** Run every Definition of done check below that applies to the part, and report the actual output.

## Deliverables

- This design, committed on `BRANCH`.
- Per part: its plan, its code and tests, updated `bespoke/DESIGN.md`, `docs/bespoke/decisions.md` and `bespoke/team-guide.html` where the part changes what teams see, and one pull request.
- Part 2 also: the new options in `cssForDesign`, and `SPOKES Builder/template.html` changes only where an option needs markup.
- Part 3 also: proposed motion rules for `STANDARD_SPEC`.
- Part 4 also: the budget guard script, wired into `scripts/quality.sh`.

## Definition of done

Each part's plan adds its own checks. These hold for the whole project.

- Part 1 offers no ruled-out background.
  - Check: `python3 -c "import json; print([b['id'] for b in json.load(open('bespoke/builder-catalog.json'))['backgrounds'] if b['id'] in ('dot-grid','diagonal','crosshatch','soft-gradient')])"`
    Expected: `[]`.
- Removed values still pass the service until the schema is narrowed.
  - Check: a contract test saves a design that uses each removed value through the service handler.
    Expected: accepted.
- No design can hold more than two typefaces.
  - Check: a model test applies every preset and every font control, then counts distinct font ids in the design.
    Expected: at most 2 in every case.
- Saved designs still open.
  - Check: a test opens a saved design that uses each removed value.
    Expected: it opens, every removed value is converted, the team sees the list of changes, and the backup holds the original.
- The budget guard runs in the gate.
  - Check: `grep -n 'budget' scripts/quality.sh`
    Expected: the guard's command is listed.
- Reduced motion stops the loadout.
  - Check: a browser test opens a lesson with reduced motion on.
    Expected: every slide's content is visible on arrival with no running animations.
- The gate passes.
  - Check: `bash scripts/quality.sh`
    Expected: exit 0.
- The service is staged before any part that changes a bundled file merges.
  - Check: the pull request names the stage directory and Britt's deploy.
    Expected: present for Parts 1 and 2.
