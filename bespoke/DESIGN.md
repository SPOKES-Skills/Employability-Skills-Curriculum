---
name: BeSpoke guided builder
description: SPOKES controls around an editable, cumulative lesson design preview.
colors:
  navy: "#00133f"
  blue: "#004071"
  action: "#007baf"
  mist: "#edf3f7"
  muted: "#526273"
  line: "#cad5df"
  paper: "#fff"
  focus: "#a7253f"
  canvas: "#f4f6f8"
  rail: "#f7f9fa"
  selected: "#edf5fa"
  input-line: "#8f9eaf"
  swatch-line: "#8191a3"
  preview-mat: "#dfe7ed"
  notice: "#fff5d7"
  scope-tint: "#fff8e6"
  readability: "#fff4f0"
  readability-ink: "#6d2434"
  lesson-green: "#37b550"
  lesson-gold: "#d3b257"
  lesson-deep-gold: "#ad8806"
  lesson-gray: "#60636b"
  lesson-silver: "#d1d3d4"
typography:
  fs-2xs:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.75rem"
  fs-xs:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.8125rem"
  fs-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.875rem"
  fs-md:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1rem"
  fs-lg:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.25rem"
  fs-xl:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.6rem"
  fs-2xl:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "2.1rem"
rounded:
  field: "5px"
  control: "6px"
  feature: "8px"
  dialog: "10px"
spacing:
  tight: "4px"
  compact: "8px"
  control: "10px"
  small: "12px"
  medium: "16px"
  group: "20px"
  section: "24px"
  frame: "28px"
  panel: "30px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.mist}"
  text-link:
    textColor: "{colors.blue}"
    padding: "0"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.field}"
    padding: "10px"
  field-select:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.field}"
    padding: "11px 34px 11px 10px"
  step-current:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "10px 8px"
  choice-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "10px 8px"
  paint-chip-selected:
    backgroundColor: "{colors.mist}"
    rounded: "{rounded.field}"
    padding: "4px 2px"
  preset:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "0 0 12px"
  preview-tab-selected:
    textColor: "{colors.blue}"
    padding: "11px 12px"
  editor-tab-selected:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.blue}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
---

# Design System: BeSpoke guided builder

## Overview

**Creative North Star: "The guided design workbench"**

This is the code-defined design system for the guided builder at `bespoke/index.html`. Its working surfaces use the existing SPOKES navy, blue, white, bridge logo, and locally hosted Outfit type. Readable controls with a 44px minimum target frame the lesson preview and the user's expressive choices. Four stages organize the task: Lesson & team, Pick a look, Make it yours and Send. Optional slide editors and Shared theme keep detailed decisions available without requiring a walkthrough.

The interface and the authored lesson design are separate layers. `builder.css` governs the builder chrome; `builder-catalog.json` supplies the editable choices; `builder-model.mjs` renders the shared lesson model. This document applies to the guided builder only. It does not restyle the dashboard, the original wizard, or any released lesson. Root `PRODUCT.md` describes the dashboard and is not a surface brief for this builder.

**Key Characteristics:**

- Stable SPOKES controls surround a visibly changing lesson artifact.
- Labels and sample previews explain choices before specialist vocabulary is needed.
- Color roles and heading/body fonts remain independently editable.
- Shared defaults and custom slide fields state their scope beside the controls and in Send's See every setting.
- State, recovery, readability, and comparison information sit near the task they explain.

## Colors

The chrome uses cool neutral surfaces, dark blue text, blue actions, and a mauve focus outline. Lesson colors are data inside the preview, not a theme for the controls.

### Primary

- **Navy** (`navy`) anchors chrome text and primary-button hover.
- **Blue** (`blue`) identifies primary actions, current navigation, selected outlines, and text links.
- **Action blue** (`action`) identifies choice hover and fine instructional rules.

### Secondary

- **Mauve focus** (`focus`) makes keyboard location visible. The same approved color is available as lesson Mauve; its chrome function remains focus.

### Neutral

- **Paper**, **canvas**, and **rail** distinguish controls, the page, and step navigation.
- **Mist** and **selected** distinguish secondary hover and chosen controls.
- **Muted** carries helper text; **line** divides regions; **input-line** delineates editable fields.
- **Swatch line** (`--swatch-line`) outlines color swatches, so White stays visible on Paper at 3.2:1. Muted replaces the two older stray grays, `#44536a` for stage and local-test text and `#647487` for layout sketches; Muted text keeps 6.3:1 on Paper and 5.6:1 on Mist.
- **Preview mat** separates the editable slide artifact from application chrome.
- **Notice**, **readability**, and **readability ink** support explanatory status and repair messages. The notice edge uses lesson Gold.
- **Scope tint** (`scope-tint`) fills the scope line under the toolbar. It is paler than Notice, so the line reads as information about the edit and not as a warning. Its edge also uses lesson Gold.

### Editable lesson palette

All 11 approved colors stay visible in every role's palette. The catalog's display names and IDs remain authoritative; the mappings below deliberately distinguish lesson names from similarly named chrome variables.

| Catalog ID | Display name | Frontmatter token |
| --- | --- | --- |
| `primary` | Blue | `action` |
| `dark` | Navy | `blue` |
| `royal` | Royal | `navy` |
| `accent` | Green | `lesson-green` |
| `gold` | Gold | `lesson-gold` |
| `muted-gold` | Deep gold | `lesson-deep-gold` |
| `mauve` | Mauve | `focus` |
| `gray` | Gray | `lesson-gray` |
| `offwhite` | Silver | `lesson-silver` |
| `muted` | Mist | `mist` |
| `light` | White | `paper` |

The 11 shared theme roles are sidebar, title background, title second color, title text, subtitle, content background, heading, body, accent, button, and divider background. Sidebar, accent, and button surfaces receive automatic readable ink. Title, divider, text-box, video and activity editors also provide independent local background and text colors. A local value marked Use shared theme inherits the corresponding theme role; an explicit local value stays independent. Older designs without local settings keep their existing appearance, including the shared title/divider second color, heading, supporting text and decorative watermark. All eleven brand colors, including Green and Gold, are selectable for every applicable field. A choice below the modeled contrast guideline displays advisory guidance; it is still applied, rendered, saved and generated exactly. The team leader decides whether to retain it. Structural validation and access controls remain separate.

**The Two Layers Rule.** Lesson choices change the shared preview model; they never repaint the builder's navigation, fields, or status surfaces.

**The Visible Choice Rule.** Keep every approved color visible. Apply the selected color faithfully. Explain contrast in place, include the measured ratio and guideline, and offer alternatives as suggestions. Never require an override checkbox or disguise a selectable color as disabled.

## Typography

**UI font:** locally hosted Outfit (`system-ui, sans-serif` fallback), with font synthesis disabled. Chrome text uses one scale of seven steps, defined as `--fs-*` custom properties on `:root` in `builder.css` and listed in the frontmatter. Chrome `font-size` uses only these steps, and `scripts/test-bespoke-showcase.mjs` fails on visible chrome text outside them. Slide renders keep their own sizes.

| Step | Size | Used for |
| --- | --- | --- |
| `--fs-2xs` | 0.75rem (12px) | Kickers, toolbar labels, swatch names, changed tags, fine print |
| `--fs-xs` | 0.8125rem (13px) | The scope line, the save chip, look names in the strip, captions |
| `--fs-sm` | 0.875rem (14px) | Body text, fields, buttons, menus, stage pills |
| `--fs-md` | 1rem (16px) | Primary actions, section headings, the brand name, text areas, the toast |
| `--fs-lg` | 1.25rem (20px) | Panel headings and icon glyphs |
| `--fs-xl` | 1.6rem (25.6px) | The page heading, the Send heading |
| `--fs-2xl` | 2.1rem (33.6px) | The look's name on Pick a look, the Sent to Britt heading |

**Lesson fonts:** either heading or body can use any of the 12 existing local families: DM Serif Display, Outfit, Playfair Display, Inter, Merriweather, Source Sans 3, Vollkorn, Fira Sans, Crimson Pro, Work Sans, Bitter, or Raleway. There is no required pairing and no serif/sans role restriction. Presets populate the two independent selectors; they do not constrain later choices.

The model gives lesson title text a canvas-relative scale (`clamp(1.5rem, 4.8cqw, 3.7rem)`), a short measure (20ch), and tight line-height (1.12). Title subtitles scale from 1rem to 1.25rem within a 42ch measure. Content headings use `clamp(1.55rem, 3vw, 2.25rem)` and line-height 1.2. Lesson body text uses line-height 1.55; text inside boxes uses 0.92rem. These are authored-slide styles, separate from the UI hierarchy.

**The Independent Type Rule.** Preserve both 12-family selectors. Never reintroduce the original wizard's fixed font-pair restrictions.

## Layout

Desktop uses a two-region workspace: a control rail and a larger preview region. The control rail itself has a stage-navigation column (172px) and the current panel. The base workspace columns are `minmax(465px, .95fr)` and `minmax(450px, 1.3fr)`. The preview stays at the top of the viewport while the current controls scroll.

Panel padding is 26px 22px 36px; preview padding is 26px 28px. Related fields and choices use small gaps (7–12px), while decision groups and major regions separate by roughly 20–30px. Choices and presets use two columns. Color choices use four columns, growing to six on wide screens. Optional role editor tabs wrap with an 8px gap and a 120px flex basis; Shared theme is a full-width disclosure above the stage's primary content.

| Viewport | Implemented composition |
| --- | --- |
| At least 1500px | Live thumbnails use a 170px rail. The central preview shows the slide on its 960px canvas at up to full size; More options opens a 380px detail panel. Stage navigation and history sit above the workspace. |
| 761–1100px | On Make it yours the thumbnails stand in a 136px column on the left, as on wide screens, so the slide keeps the height. The editing toolbar docks in a band directly above the slide; Sample text and Position wait in the Slide options drawer so the band keeps two rows. More options opens the drawer in a 280px column beside the preview. That column sticks to the top of the window and scrolls on its own, and it is gone while the drawer is closed. While Guide me runs, the thumbnails form a strip across the top and its questions take the 280px column. |
| At most 760px | Thumbnails form a horizontal scrolling strip. The preview editor and toolbar stay together; More options opens below. The Design / Preview switch shows only while Guide me runs. Lesson & team, Pick a look, Send and the Make it yours editor hide it. Touch controls have 44px targets. |
| At most 600px viewport | Generated slide styles reduce padding and collapse video/activity side layouts. |
| Above 40rem sample canvas | Content samples show the lesson's 280px vertical chapter sidebar beside the main content. |
| At most 40rem sample canvas | A labeled Sidebar sample menu opens a vertical drawer over the full-width content. |
| At most 38rem main content container | Text boxes use at most two columns, retaining the selected count, arrangement and text. |
| At most 30rem main content container | Video and activity samples stack their side-by-side content. |
| At most 22rem main content container | Text boxes reflow to one column so a narrow desktop preview remains readable. |

The preview stage, content samples and their main content region declare inline-size containers. Sidebar disclosure follows the sample canvas width; text-box, video and activity reflow follow the space actually available beside navigation. Rem thresholds also respond to enlarged text. Viewport queries still control surrounding editor layout and canonical slide padding/stacking. Divider watermarks use bounded, canvas-relative type on a single decorative line. Generated canonical slides use safe centering so long content begins at a reachable scroll position.

The sample sidebar follows the six existing lessons: a lesson-name heading, seven WIPPEA badge groups, an indented current slide, resources and a slide footer. Chapter and resource entries are inert and labeled as sample content. Narrow previews use a keyboard-operable native disclosure with a focusable scrolling drawer; its ordinary 280px width scales with text size up to the canvas width, while horizontal padding stays at most 24px. Sidebar paint recolors the visible rail or drawer immediately and keeps an open drawer open. Title and divider remain standalone component samples. The actual lesson template owns its persistent navigation and collapse behavior; this sample shell does not replace it. Source evidence and verification are recorded in [the sidebar preview report](../docs/bespoke/sidebar-preview-2026-09-24.md).

## Elevation & Depth

The chrome is mostly flat, separated by cool surface tones and thin borders. Shadows are structural: the file/recovery menu floats above the workspace, and the slide receives a light lift above its mat. Motion has its own section below. Reduced-motion preferences disable animation, transitions, and smooth scrolling.

- **Recovery menu:** `0 10px 24px #00133f20`.
- **Slide artifact:** `0 6px 18px #00133f1f`.
- **Dialog backdrop:** navy at half opacity (`#00133f80`). The dialog uses a border rather than an authored shadow.
- **Toast:** `0 10px 28px #00133f40`.

## Motion

Each motion sits inside `@media (prefers-reduced-motion: no-preference)` in `showcase.css`, and `builder.css` also turns off animation and transitions under `reduce`. Each runs once. Nothing loops.

| Moment | Motion | Duration |
| --- | --- | --- |
| Pick a look's stage swaps to a previewed or applied look | The old look fades out over the new one | 200ms |
| A color change reaches other slides | Their rail thumbnails glow gold | 1s, once |
| Toast in and out | Fade and an 8px slide | 180ms |
| Sent to Britt | Three slides settle into the fan | 400ms, once |

Slide styles apply page-wide, so the leaving look on the stage is a copy in its own shadow root with its own styles, removed when its fade ends. Under reduced motion the stage swaps at once, no copy is made, and changed thumbnails keep only their tag.

## Shapes

Controls have modest corners: fields, swatches' button containers, stage controls, and editor tabs use the field radius; buttons, choices, presets, and the preview mat use the control radius. Build my own and the floating file menu use the feature radius. The access dialog uses the dialog radius. Swatches and small stage numbers are circular. In CSS the four radii are `--radius-field`, `--radius-control`, `--radius-feature` and `--radius-dialog` on `:root` in `builder.css`, and the chrome uses no other corner sizes. Mood chips, stage pills and the local test pill are fully rounded (999px).

These chrome shapes do not constrain slide content. Lesson boxes support accent rails, outlines, filled treatments, and top bands; activities support boxes, callouts, banners, and side labels. Those catalog-backed variations belong to the artifact model and are preserved even where the chrome uses a quieter form language.

## Components

### Actions and recovery

Primary buttons use Blue with white text and become Navy on hover. Secondary buttons use Paper with a thin Line border and Mist hover. Buttons, text-link buttons, choices, stage navigation, preview tabs and mobile surface tabs have a 44px minimum height. Disabled buttons use half opacity. Text links remain underlined with a 3px underline offset. All focusable controls use the Mauve outline (3px, 3px offset); the programmatically focused panel suppresses its own outline.

The top bar holds Undo, Redo, the save chip, **Save for the team** and the ⋯ More actions menu. On Send the bar hides Save, because the Send panel holds both Save for the team and Send to Britt. Send to Britt never sits in the bar. It is in the More menu on every stage, with How it works, Open team design, Slide options while the editor shows, Recent choices, Previous versions, Leave session, Start a new draft and the backup actions. The local test preview hides Send to Britt and labels Save and Open as test actions. How it works opens inline under the bar. Closing it returns focus to the menu item, or to the menu button if the menu has closed. How it works has one step per stage; a disclosure explains the palette, fonts, boxes, logo, contrast, recovery and similarity guardrails. Saving guidance distinguishes the local test service from team saving and design review. The More menu is a native disclosure, and it also holds backup, restore and original-wizard access. The menu closes after a file action, on outside pointer interaction, or with Escape; Escape returns focus to its trigger. On phones the menu fits between 16px viewport insets. The team-opening dialog is a focused access task, with labeled lesson and private-code fields and explicit Open / Cancel actions. Saving a reusable visual design and authorizing a lesson build are distinct tasks.

### Fields and decisions

Field labels sit above full-width inputs, selects, and text areas with a 7px gap. Inputs and text areas use a 1px Input line and the field padding; all fields have a 44px minimum height. Selects retain native selection behavior with the field-select padding, a 1.5 line-height, an authored arrow, and platform appearance disabled so WebKit does not force a shallow control. Text areas resize vertically. Decision groups are semantic fieldsets with visible legends; chosen buttons carry `aria-pressed`, a stronger border, a selected surface, and a check mark.

The color-role selector and Apply color to selector precede the 11-color palette. Choosing an element starts in This slide scope: the selected swatch reflects its effective local color, and painting writes only that field on the visible slide. Shared default is an explicit separate scope; it writes the global default and retains local exceptions. Sidebar, Accent and Buttons have only shared scope. Preview tabs retain the equivalent element on the new slide, and selecting an element retains a compatible current preview. Scope persists only in the browser UI draft. A selected circular swatch has both a visible mark and an accessible selected label. All colors are enabled, without strike-throughs. Accessible labels identify a contrast advisory as selectable, calculated for the selected scope. The warning explains the text/background difference and why low contrast can be harder to read; it includes the actual ratio, the applicable guideline, and the team leader’s option to keep and save the design. The persistent live region announces advisories after updates.

Each slide-type editor groups its existing Arrangement controls with Background, Texture, Text and Watermark disclosures. Arrangement and Background start open; disclosure choices stay in UI memory, never in a design payload. Stable native controls retain focus after redraw. Local edits show the affected preview while preserving every other role's choices. Shared theme groups shared colors, fonts and texture in one optional disclosure, available in every stage; its open state persists through stage changes.

Shared theme's summary has a 48px minimum height. Paint colors names the selected slide and field; Shared default scope names affected Shared slide types and Custom exceptions, with links to the relevant local field. Fonts & texture has a separate Apply fonts & texture to selector, defaulting to This slide. It reads effective fonts and texture and changes only the selected local field. Its explicit Shared default option keeps global edits and custom exceptions separate. Both scope preferences persist only in the browser UI draft. Sidebar, Accent and Buttons have no misleading local-color shortcut: those colors remain shared. Navigation and button typography always use the shared body font; the canvas and Band divider exterior retain shared Content background. The seven inheritable local fields (primary/secondary background, heading/body color, heading/body font and texture) show Shared or Custom beside the control. Use shared theme in a field or its named reset button restores only that field on that slide, retaining other choices.

Background supports an inherited finish, Solid or a two-color gradient, local primary/secondary colors and three gradient directions. The second color stays saved when hidden. Split title panels use the second color in the right panel and omit the inapplicable direction control; Solid colors both panels uniformly. Divider Band retains its colored middle panel and the shared lesson surface above and below it. Texture offers the existing five recipes and three strengths, independently per role. Plain hides the strength control without clearing it.

Text offers local heading/body colors, the twelve curated fonts, size, alignment, visibility and editable sample words. The Default choice keeps inherited sizing/alignment; explicit choices override them. Chapter and activity labels can be edited and hidden independently. Text boxes retain their four sample strings and existing treatment/count/title-bar controls. The video supporting paragraph starts hidden to preserve the old look. Hiding text retains its words and style. Watermarks offer None or custom text/number, eleven colors, three sizes, four corners and three strengths. Decorative custom marks occupy reserved space apart from reading text and never modify the required title logo. Presets reset visual settings but preserve all sample words.

### Navigation and continuity

Four named stages are **Lesson & team**, **Pick a look**, **Make it yours**, and **Send**. Their internal ids stay `team`, `start`, `slides` and `review`. Each pill shows its number and name ("2 · Pick a look"), with a check mark once the stage is passed. Lesson & team is its own first page (decisions, October 9, 2026) and its pill is marked until the team is identified. Current stage navigation uses `aria-current="step"`, an accessible Stage N of 4 name, and a visible stage counter; Back and Continue controls name the destination. Undo, Redo, and Recent choices remain adjacent to navigation. Returning teams keep their design, and **Swap starting look** on Make it yours goes back to Pick a look.

Within the Slide options drawer, the distinct Slide design editors tablist offers **Title slide**, **Chapter divider**, **Text boxes**, **Video slide**, and **Activity**. All are optional. Selected editor tabs use Mist, a Blue border and a 3px inset bottom rule; the corresponding editor has a named tabpanel. Next slide type is a convenience action, with Send after Activity.

Five separate preview tabs expose Title, Divider, Text boxes, Video, and Activity. These change the visible sample, not the editor or saved design. The selected preview tab has a blue underline and text; tablists support arrows, Home, End, Enter, and Space. Mobile Design / Preview tabs switch the visible region and retain separate scroll positions. The workspace is the single named, keyboard-focusable main landmark, with editor and preview sections inside it. The switch height is remeasured when text size or viewport changes. Stage changes move focus to the current panel. Dynamic choices, palettes, fonts, and preset controls have stable IDs so the rendering pass can restore focus after a same-stage change; open inline disclosures remain open. Design status and the mobile surface switch are contained in named landmarks.

Send's **See every setting** lists all five effective slide designs. Each has resolved colors, fonts and texture labeled Shared or Custom, retained second-color wording when unused, arrangement and local detail, plus direct Preview and Edit actions. Shared typography is explicitly identified as defaults rather than every slide's effective typography. Rows use top borders and 20px vertical padding. Definition lists stack below 1200px and pair labels with values in two columns from 1200px upward; long values wrap. On phones, Preview actions open the Preview surface, while Edit returns to Design. Readability advice, notes, saving and recovery follow the summary.

### Pick a look

The twelve editable presets are starting looks in the same model as Build my own. Choosing a look is not a lock: every color, font, arrangement, and sample remains editable.

The stage takes about 60% of the width. It shows a large render of the current look's title slide, with the lesson's name as its title until the team types their own. Its width follows the window height. It stays at least 480px wide (400px from 761px to 1100px) unless the screen is narrower than that, so the stage is still the largest element at short heights. The side column shows "Your starting look", the look's name in its own heading font at `--fs-2xl`, one line of layout and font detail, the look's colors as named dots, small renders of the other four slide types, **Make it ours →**, and an **Undo** link after an apply. The side column stays beside the stage down to 761px, so on a 1024x768 laptop the stage and the first row of looks show together. On phones (760px and narrower) the side column moves under the stage.

Below the stage, mood chips (All 12, Calm, Bold, Bright, Classic) filter a filmstrip of the twelve looks. Each look is a small render with its name. **Build my own**, **Guide me** and, while a guide is under way, **Continue guide** sit as text buttons at the end of the mood row. A team arriving with a design that matches none of the twelve looks sees a dashed **Your design** card first.

Hover or keyboard focus previews a look on the stage without applying it. The heading reads "Previewing <name>" and a polite live region says the same. Leaving the strip or pressing Escape returns to the applied look. Clicking a look or pressing Enter applies it as one Undo step and stays on Pick a look. There is no confirmation dialog. Arrow keys move along the strip and Tab leaves it. The applied look has a gold outline and a previewed look a blue one.

### Make it yours

The slide stays the largest element on screen, with the "Your slides" thumbnail rail on its left on wide screens. A line under the top bar reads "Starting from **<look>** · N changes" with a **Swap starting look** link, or "Your design" when the look is unknown. N counts the design settings that differ from the starting look applied to the same sample words.

**Toolbar band.** Above 760px the toolbar for the selected part sits in a band directly above the slide. It never covers the slide, the rail or the slide actions. The band keeps at most two rows: whenever it is narrower than 1000px, Sample text and Position move into the drawer. That covers every window up to 1100px, an open drawer, and windows up to about 1214px with the drawer closed. The slide is drawn on the same 960px canvas as Pick a look and Send, so its layout and shape stay the same when the window changes or the drawer opens. It then scales down to fit its column and the room left under the band, so all of it shows at the top of the page. For height it shrinks only while it stays legible, to 45% at the least. When even 45% is not enough, for example because a notice or the receipt strip shows above the workspace, the slide holds at 45% as long as no more than a fifth of it falls below the fold. A slide that would lose more, such as one with very long sample words, fills the width of its column and the page scrolls. The slide never runs wider than its column, so a narrow column with the drawer open can take it below 45%. When the reader has enlarged their text the slide lays out at the width of its column at full size, as it does at 760px and narrower. The selection outline widens as the slide shrinks, so it still shows about 3px wide, and the gray mat behind the slide is only as wide as the scaled slide. The slide refits when a notice, the session strip or help appears or goes. The fields run in this order: Editing (the part picker), Sample text, Font, Size, Color, Align, Position, the add and reset actions, then **More options**, which opens the Slide options drawer. The drawer has one close button, the pinned **Hide options** bar. Escape also closes the drawer and puts focus back on **More options**. An open color popover or menu takes the first Escape. With the drawer closed, Escape on the slide selects the background.

**Named swatches.** The Color well opens a popover of the eleven palette colors. Each swatch shows its palette name under the dot.

**Scope line.** One line under the toolbar says what a color change touches, for example "Gold also changes the **Divider** heading, because they share a color." It lists up to three parts, then "and N more", and its **Change only this slide…** link opens the drawer at the Only this slide switch. With the switch on, it reads "This color stays on the Title slide only." For the sidebar, accent and buttons it reads, for example, "Changes the sidebar on every slide." The rail thumbnails of the other slides that changed glow gold once and keep a small **changed** tag until the team leaves the stage.

Readability notes shrink to one line under the slide ("1 readability note") that opens to the full advisory text. The similarity comparison is a single line on Send, not on this stage.

### Messages

Success messages, such as an applied look or a finished save, appear as a toast near the top of the window. The toast is one `#toast` live region that stays rendered, shows for four seconds, fades in and out over 180ms and ignores the pointer. Warnings, conflicts, pending sends and errors stay in the notice strip, and a stage change does not clear them.

### Send

Send has two columns. The left column holds the five slides on one sheet: the title slide large (two columns by two rows), then divider, text boxes, video and activity. Clicking one opens it in Make it yours, and the editing outline never shows here. The right column is a summary panel that stays in view on wide screens. It holds the label "Your suggestion", the heading "**<look>**, made yours" (or "Your design"), three plain rows (Look, Fonts, Your changes), the notes field "Anything Britt should know?", and **Save for the team** and **Send to Britt →** with their messages beside them. Under them sit one similarity line ("Shares 8 of 22 choices with the released lessons") with **See the comparison**, the small print "This is a suggestion. Britt and the program administrator choose the final design.", and a closed **See every setting** disclosure with the full review. The local preview keeps Send blocked.

### Sent to Britt

When the latest confirmed receipt matches the saved design and nothing has changed since, Send shows a confirmation instead. It has three of the team's slides fanned out, a green check, the heading "Sent to Britt", one sentence naming the lesson and the design, **Keep editing**, **Download a copy**, and a closed **Details** disclosure with the review request link. It shows again after a reload. A send from another stage confirms with the toast "Sent to Britt." while the view waits on Send. After the team edits, Send returns with the line "Sent to Britt on <date>. You have changed it since." A pending send reads "Sending to Britt…" in the panel.

### Cumulative preview and comparison

Title arrangements use a shared grid canvas with a 16:9 minimum proportion and a
420px minimum height. A nonvisual grid sizing item reserves space while real text
rows can grow beyond it; fixed-height cropping is avoided. Centered and Left aligned
share vertical centering with distinct horizontal alignment. Bottom left allocates
remaining space above the text. Split panels places the title/subtitle in the right
column, after a hard 38% background boundary; the right panel retains the chosen
gradient when enabled. Pattern layers remain above both panels. Narrow canvases keep
these placement differences with smaller type and natural vertical growth.

The corner logo occupies a reserved top area independently of title alignment.
Above-title logos occupy a separate grid row in the text column. All title copy,
rules and logos stay inside the canvas. Generated sample and canonical title styles
share this geometry; canonical flex spacer pseudo-elements are replaced by the same
grid sizing rule. The editor shell retains its identity; the role sections expose
local title controls using the same cumulative design.

Video frames keep the same outer 16:9 dimensions when switched. Plain removes the
border, padding, outline and shadow. Accent frame reserves an 8px inset for a 6px
chosen-accent border and 2px inner separator; a 2px inward outline separates the
outer edge. Decorative separator ink uses White or Royal according to the accent,
without modifying saved colors. The sample and canonical video/iframe children
fill the remaining content box, so media cannot paint over the frame. Canonical
inline corner/shadow styles are reset within this wrapper. All three arrangements
share the treatment; the canonical side arrangement also stacks below 600px.

The preview is a rendered reusable slide design with explicitly labeled sample content. It takes colors, fonts, arrangements, text, and backgrounds from the same model used by the reusable artifact and template override. It supports the five slide types, including one to four text boxes with paragraph, bullet, or numbered treatment. Hidden box samples remain in the draft.

Readability notes name the problematic text/background pair and provide a path back to colors. The model checks title/heading pairs at 3:1 and subtitle/body pairs at 4.5:1, including sampled gradient surfaces and composited pattern ink; this is a modeled check, not a claim of whole-page accessibility certification.

Comparison is advisory: it shows exact matching comparable choices against six released references, with matches, differences, and unknowns disclosed. It is not a perceptual percentage, a passing score, or a reservation of private team designs. Save/recovery and preview updates use status/live regions, including an explicit local-test label when that mode is active.

## Do's and Don'ts

### Do:

- Do preserve the SPOKES logo, Outfit chrome, and existing navy-blue-white identity.
- Do render previews from the shared model so guided controls, editable presets, and saved designs describe the same artifact.
- Do keep all 11 palette choices visible and all 12 font families available independently for headings and body.
- Do retain focus, open disclosures, undo history, and recoverable sample text when a choice changes.
- Do label sample content, local-test states, contrast repairs, and advisory comparison honestly.

### Don't:

- Don't apply the selected lesson palette or fonts to application chrome.
- Don't treat presets as locked themes or restore fixed font-pair restrictions.
- Don't disable or cross out low-contrast choices, silently recolor them, or turn contrast advice into a save/build approval requirement.
- Don't describe the comparison as a perceptual score or a requirement to pass.
- Don't treat a saved design or review request as authorization to build or publish a lesson.
- Don't extend this document's authority to the dashboard, original wizard, or released lessons.

### Button-color feedback

While Shared theme is open and the Buttons color role is active, show a clearly labeled temporary sample
below a buttonless slide, without changing the selected preview tab or adding a
permanent button to that slide's structure. At phone widths, also show the sample
inside the controls so its paint change is visible without switching surfaces.
Video and Activity retain their own inert sample actions. All examples reuse the
model's button background, automatic ink, body font and 44px minimum target height.


### Divider color ownership

Title & divider headings and Subtitle & divider supporting text name their element
families. Paint colors exposes background, both text roles, and Second gradient
color. This slide paints the current effective local field immediately; Shared
default changes only its separate inherited default. The Chapter divider editor
can also edit or reset its local fields; shared-scope links open the matching field.
Selecting text/second-color elements retains an already selected divider preview.
Painting one gradient stop preserves the second stop, direction, texture and all
other choices. A hidden text color or unused second stop stays saved; the helper
explains when it appears without changing visibility or background finish.
Content heading/body choices remain
independent. Low-contrast backgrounds preserve the chosen text
and show the actual result plus ratio warnings. Repair buttons change only the named
background, with Undo. These alternatives are optional; shared saving and artifact
generation preserve low-contrast choices, and both current and older v2 designs open
unchanged. Structural errors continue to block invalid records.
Reference comparison measures actual chapter heading and supporting-text colors
separately from title text; mixed or translucent reference colors stay unknown.


### Background-pattern feedback

In This slide scope, the selected pattern is the effective texture of the previewed
role. A choice changes its local pattern only, including an existing override.
Shared default changes the global pattern followed by inheriting fields; explicit
local textures remain independent. Texture layers sit above the
chosen color, split panel, band or gradient; Plain removes only the texture. Dot grid
uses 5px dots on 24px spacing, Diagonal uses 2px lines on 22px spacing, Crosshatch uses
1.5px lines on a 32px grid, and Soft wash is a broad diagonal tint. Decorative ink is
White or Royal, chosen for visible separation from the base, with the opposite tone
used when needed to retain already-readable title/divider text. Stored base/text
colors never change. Contrast sampling includes the actual opacity range and grid
intersections; unresolved failures remain explicit warnings. Local pattern thumbnails
reuse the exact model background recipe, including the current primary/secondary
colors, gradient direction, split/Band arrangement and texture strength. Shared-default
thumbnails are identified as shared colors at Standard strength. Changing preview
tabs refreshes effective selections and thumbnails without editing the design.
Plain keeps the saved Subtle, Standard or Stronger strength for a later pattern;
there is no zero-strength setting. Font selections likewise read the effective local
font in This slide scope; a hidden text field keeps its font without being revealed,
with that state explained beside the selector.

### Preview editor interaction

The cumulative slide is the primary editing surface. Five live thumbnails sit to
its left; selecting visible text, a box or background exposes native formatting
controls above it. More options retains the complete existing editor and explicit
Shared default controls. The scope line under the toolbar names the other slide
parts a color change reaches (see Make it yours). Selection markings are
UI only. Browser reload restores the options disclosure; saved designs retain the
existing model contract. Guide me, Pick a look and Send remain available.

Only Make it yours edits through the preview. While Guide me runs it owns
the preview, so the toolbar is hidden and slide elements are not selectable. On Pick a look
and Send the slides are for looking at; clicking a slide on Send opens it in Make it yours.
Selectable text keeps its visible words as its accessible name; the background and
boxes are labeled groups, and the selected element carries `aria-current="true"`.


## Simplified workflow — October 7, 2026

Mode: Operate. Retain the SPOKES typography, navy controls and neutral workspace.
The first stage is a full-width gallery of twelve real slide compositions, with
team details and alternate paths disclosed only when needed. Choosing a preset
opens the large live preview. The compact toolbar follows the selected element,
including sample text, color, three sizes, alignment and placement. Background
controls offer Solid or Gradient and one or two brand-color pickers. Presets own
the gradient direction. Detailed choices remain in More options.

New role fields are optional when opening earlier v2 saves. The shared model
validates and renders them for browser drafts, shared saves and generated design
contracts. This is a local review implementation, not a hosted release.

### Color-first starting gallery — October 7, 2026

Lead with named palettes and visible, text-labeled swatches above each layout name.
Use the approved palette across light and dark surfaces, strong green and gold,
neutral silver and graphite, white, berry and ocean blue. Eight solids and four
gradients distinguish twelve compositions without adding another workflow step.
Keep readable text on every starter and preserve full saved-design colors.

### Feature inspector — October 7, 2026

Keep the approved color-first gallery. During Customize (now Make it yours), a right-hand panel
showed controls for the clicked preview feature (since October 19 they sit in the toolbar band above the slide), with a visible selection outline
and scope description. Text, backgrounds, navigation, action buttons, box surfaces,
title bars, logo, accent rule, video frame, activity panel and watermark are
selectable with pointer or keyboard. The Editing menu is an equivalent
entry point. On phones the inspector follows the preview and selection brings
it into view; on tablets it stays beside the preview. More slide options remains
optional. Guide and Review keep their separate behavior.

Navigation and buttons have independent fill, text color and font. Box surfaces,
title bars, video frames and activity panels have independent fills and borders.
Shared defaults remain an explicit reset, with Undo/Redo and full saved restore.
Added text and watermarks have independent font choices. Decorative watermark
artwork is exposed as a named image during editing, with its text editable in the
inspector, rather than treating its intentionally faint ink as body text.

## Review additions — 2026-10-07

Present and Compare use protected, window-filling review dialogs while the editor
retains its selection and scroll position. Desktop compares A/B side by side;
phones stack them with a persistent exit control. Current choice and formatting
scope use plain labels. Readability suggestions require an explicit preview and
application and remain undoable. Both alternatives persist; delivery and actual
review remain separate states. See `docs/bespoke/review-tools-2026-10-07.md` for
the complete contract and local/hosted evidence boundary.
