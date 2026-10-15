# BeSpoke

BeSpoke helps instructor teams choose a presentation's visual design through small
choices and a cumulative preview. It configures reusable title, chapter-divider,
text-box, video and activity designs with sample copy. It does not write curriculum,
build a complete deck, or publish lessons.

**October 7, 2026 status:** the simplified workflow is implemented for local
review in an isolated worktree. Synthetic local saving is separate from hosted
acceptance; this revision has not been merged or deployed.

## Name the team, choose, customize, review

BeSpoke opens on **Lesson & team**. Choose the lesson, name the team and enter the
spokesperson's name and email. The stage pill stays marked until the team is
identified. Nothing blocks you from moving on, but Send to Britt needs the
spokesperson's name.

1. **Choose a layout:** choose one of exactly twelve slide thumbnails: Editorial,
   Split stage, Centered, Grounded, Framed, Headline, Side rule, Horizon, Corner,
   Masthead, Two columns and Inset. These use twelve different title compositions,
   rendered with the same model as the live slide. **Other ways to start** retains the detailed guide and current-design path.
2. **Customize:** select visible text in the large preview, or use Selected element.
   Edit the words in the nearby Sample text field. Choose a text color, one of three
   sizes, Left/Center/Right alignment, and Top/Middle/Bottom placement within the
   text area. A continuous typing session is one Undo action. **Add text** adds one
   additional editable text area per slide type; select it again to edit or remove it.
   Existing box headings and bodies can be edited separately. Formatting scope is
   stated above the preview; matching box text still shares formatting.
3. **Review & save:** inspect the five reusable slide types, then use existing
   Save/Open and Files & recovery. Saving remains a visual-design review workflow.

Select Background for **Solid** (one brand-color picker) or **Gradient**
(independent start and end brand-color pickers). Changes appear immediately.
The preset supplies the direction; no direction choice is shown. Solid retains
its second color for later use. The eleven established brand colors remain available.

Undo and Redo remain beside the four stages. **More options** retains the detailed
slide choices and shared theme, without requiring a team to work through them.
The original v1 wizard remains separate at `legacy.html`.

A preset fills the same controls as individual editing. Changing a field keeps
the other choices. Applying another preset replaces the visual choices, preserves
sample text, and can be undone. An existing saved design receives the same
replacement confirmation as a design edited in the current session.

The preset confirmation offers **Cancel**, **Apply preset**, and an initially
unchecked **Don't ask again during this session** option. Only checking it and
applying a preset suppresses later preset confirmations. Cancel and Escape leave
both the design and preference unchanged. Other warnings stay active.

The preference belongs to the current tab's editing session: it survives stage
navigation and reload, and resets on Leave session, a different team/lesson,
Start a new browser draft, or a fresh tab after closing this one. It uses only
`sessionStorage`; it never enters designs, backups, history, or shared records.
If tab storage is unavailable, the preference lasts only until the page reloads.

**Shared theme** is an optional disclosure in More options and Review & save. It contains
the shared colors, heading/body fonts and texture, including Sidebar, Accent and
Buttons colors. These three colors have no local slide replacement; shared body
typography also supplies navigation and buttons. Shared content background still
supplies the lesson canvas and the exterior of a Band divider.

Each inheritable slide field is marked **Shared** or **Custom**. Shared fields
follow the corresponding current default; custom fields stay unchanged when that
default changes. **Use shared theme** restores inheritance for that field on that
slide type, keeping its other fields and the other slide designs. The effective
Review summary reports each slide's resolved choices instead of describing shared
font defaults as though every slide used them.

**Colors:** select an element, then a brand swatch to replace its color immediately.
All eleven swatches stay visible, including White. Colors are assigned directly to
sidebar, title background and its second color, title text, subtitle, content
background, headings, body, accent, buttons and divider background. There is no
preselected two-primary/three-secondary palette. All eleven colors, including Gold
and Green, are selectable for every text and background role. Low-contrast combinations show an advisory, never a veto or hidden
recoloring. Contrast is the difference between text and its background; low contrast
can make text harder to read. The warning gives the actual modeled ratio and the
3:1 heading or 4.5:1 supporting/body-text guideline. The team leader can keep the choice. Decorative
accents and text are separate roles. Selecting Buttons keeps the current preview
and shows a temporary action-button sample when that slide has no button. On phones,
the same sample also appears beside the palette. Video and Activity use their own
sample buttons. Every sample uses the selected button color with automatically chosen
legible text; sample activation does not navigate, download or submit.

**Divider text:** Title & divider headings controls both large title lettering and
chapter headings. Subtitle & divider supporting text controls the title subtitle,
copyright, chapter label and divider supporting copy. Content headings/body remain
independent. Shared theme exposes these shared choices and the gradient's shared
second color. The Chapter divider editor can override its own fields. Painting a
divider background preserves all selected text colors;
contrast advisories offer optional color alternatives without blocking shared saves
or generated output. Existing files and shared revisions retain their original values.
Structural, schema, access and conflict checks still apply. Generated contracts and
sample HTML carry the same nonblocking advisories. These warnings remain visible
even when the separate preset-confirmation opt-out is enabled.

**Fonts:** choose heading/title and body fonts independently from all twelve existing
self-hosted families. The six former pairings remain available through their font
families; presets can initialize combinations, but do not lock a pairing. Franklin
Gothic Book is omitted because no existing licensed webfont package was found. Its
absence does not block the builder, and no substitute is labeled as that font.

**Background pattern:** Plain, Dot grid, Diagonal, Crosshatch and Soft wash supply
the shared texture for all five slide types. A custom slide texture stays independent.
Each shared control shows a miniature on the current preview's base color. Pattern ink adapts between
White and Royal for visibility and readability without changing saved color roles.
Text boxes keep their chosen opaque reading surface. Title/divider readability checks
include the pattern and gradient layers. Plain removes texture while keeping the
selected base color, gradient or band layout. Preview and generated output share the
same treatment.

**Components:** title and divider designs have separate optional arrangement and
appearance choices. Text boxes support one to four boxes, one optional shared
title bar, paragraph/bullet/numbered treatment, box style and arrangement. Video
and activity have their own controls. Reducing the box count keeps all four draft
strings so increasing it restores the hidden text. The live preview uses the same
accumulated design used by backups, shared saves and generated artifacts.

**Title arrangements:** the preview uses a 16:9 canvas with a 420px minimum height,
and grows for long sample copy. Centered centers the text; Left aligned keeps the
same vertical grouping at the left; Bottom left moves the group down. Split panels
places the text in a separate right column with a visible panel boundary, retaining
the selected solid/gradient finish and pattern. Above the title keeps the logo with
the text group; Top corner anchors it independently. Type scales with the canvas
width rather than the browser window. These semantics also apply to generated
samples and canonical title CSS. The existing title controls stay in place.

**Video frames:** Plain removes the frame. Accent frame uses the chosen accent
with thin White or Royal separating lines, so it stays visible when the accent,
video placeholder and slide background match. The separator is decorative; saved
color choices are unchanged. The frame fits inside the same responsive 16:9 box
in the preview, generated sample and canonical video/iframe wrapper. Samples stay
inert and never load media.

**Comparison:** the advisory meter counts exact matching measured choices against
six actual presentations: Time Management, Interview Skills, Controlling Anger,
Employee Accountability, Communicating with the Public, and Problem Solving &
Decision Making. It includes comparable font, color, background, layout and component
characteristics. Details show matches, differences and unknown features. Unknown or
mixed measurements do not count as matches. The count is not a pixel or perceptual
similarity percentage, does not block a choice, and knows nothing about other teams'
private designs. Preset cards show their closest measured reference; another preset
or individual edits can provide a more distinct starting point without a uniqueness
guarantee.

## Guide me

**Choose a layout → Other ways to start** offers **Guide me step by step**. The guide asks one question per
screen, slide by slide: a starting look, a shared look (fonts, pattern, sidebar, accent and
button colors), then the title slide, chapter divider, text boxes, video slide and activity.
Each question shows its choices as small pictures drawn from the real slide styles, and
pointing at one previews it without choosing it. Color questions suggest the four most
readable colors on the current background and keep all eleven one click away. Readability
stays advisory. Every question can be skipped with **Next**, a whole slide type can be
skipped, and the guide can be left and resumed. After each slide type a recap shows the
choices, with a link back to any question. The guide writes the same saved design the free
editor writes, so nothing about saving, opening or sending changes. Undo also returns the
guide to the question where the change was made. The guide's position is kept in the
browser draft only. The code is in `guide/`; `test-bespoke-guide.mjs` and
`test-bespoke-guided-browser.mjs` check it.

## Drafts, recovery and shared work

Forward/back navigation and switching preview roles keep the design. Undo/redo
tracks recent design changes in the browser draft. Refresh restores that draft;
downloaded backups preserve the selection and its hidden sample strings. A browser
copy or downloaded backup is not a confirmed shared save.

The connected workflow retains private team access, shared Save/Open, revision
checks, history, retry protection and receipt-confirmed Send. Choose one spokesperson
to operate the design during a team call. Shared autosave runs shortly after stage
changes and after 30 seconds without a change; immediate Save is available. A failed, stale or
pending save remains visible. Restored backups and earlier versions require explicit
Save before shared autosave resumes. A stale revision is rejected rather than
replacing another computer's newer design. Keep a backup, open the latest shared
version, and recover the choices the team agrees to keep.

A v1 backup opens as an **explained conversion**, not a promise of identical
appearance. The exact source selection remains in `legacySelection` in every v2
backup and can be downloaded separately on Review. Older title/divider/card options
may have no exact equivalent; chapter-specific styling remains in that original
backup. Review conversion and readability notes before saving the new design. The
original wizard remains at `bespoke/legacy.html`; its storage keys are separate.

For the deployed workflow, original private team links grant real access and must
stay within the intended team. **Leave session** removes
remembered access and local drafts, not shared work. View links are read-only
snapshots, not live collaboration or team access. They can contain readable sample
text and contact details. Review proposals are public repository artifacts; use
work contact details and non-sensitive sample copy.

**Send to Britt** uses the confirmed saved selection. Processing is not delivery;
only the matching proposal receipt establishes that Britt received the review
request. Local preview disables Send and receipt-status requests completely.

## Local review

For this simplified-workflow worktree, use port **8778** and runtime directory
`~/Library/Application Support/Codex/local-previews/bespoke-simple-layouts`.

Use HTTP so catalogs and fonts load. A `file://` preview cannot load the wizard's
catalogs. From this isolated worktree:

```sh
node scripts/bespoke-dev-server.mjs --port 8778 \
  --runtime-dir "/Users/brittlegg/Library/Application Support/Codex/local-previews/bespoke-simple-layouts"
```

Open [the local builder](http://127.0.0.1:8778/bespoke/). The server binds only to
loopback and overrides the handoff configuration with its own synthetic draft
service. **Save test design**, Open and history use only local test data, with the
same revision and retry handler. No real team code or hosted-service connection is
needed. The external runtime directory keeps these drafts across server restarts;
omitting `--runtime-dir` keeps them only in memory. Do not place runtime data in
MacDev or another Git checkout. Stop the foreground server with Ctrl-C.

Port 8778 is separate from the earlier previews at 8765, 8766 and 8767.
Keep those servers and browser drafts intact while reviewing this workflow.
Local testing does not establish online multi-device or hosted delivery acceptance.

## Sources and integration

| File | Responsibility |
|------|----------------|
| `bespoke/builder-catalog.json` | Eleven brand colors, twelve font families, editable presets, role choices and sample limits |
| `bespoke/builder-model.mjs` | Model validation, readability, v1 conversion, shared CSS and escaped component markup |
| `bespoke/builder-app.mjs` | Guided controls, cumulative draft, preview, undo and connected-save UI |
| `bespoke/selection-v2.schema.json` | Closed generated schema for the complete v2 selection |
| `bespoke/lesson-fingerprints.json` | Measurements and evidence from six actual reference lessons |
| `bespoke/similarity.mjs` | Advisory exact-choice comparison with explicit unknowns |
| `netlify/functions/_shared/selection.mjs` | v1/v2 service authority; the existing handler retains access/revision/receipt protection |
| `scripts/bespoke-model-bridge.mjs` | Node bridge sharing that authority and model with Python proposal tools |
| `bespoke/selection.schema.json`, `bespoke/legacy.html` | Preserved v1 schema and original wizard |

Node.js 22+ is required for v2 validation/artifact generation. The proposal writer
produces the full selection, canonical content intake, CSS, v2 build contract and
reusable component samples. Its checker verifies actual box count, title-bar
presence and paragraph/list markup; matching CSS alone cannot implement structural
choices. See [builder handoff](../docs/bespoke/builder-handoff.md).

V2 cannot be flattened into the legacy v1 theme registry. Registry application
fails explicitly until there is a reviewed v2 consumer. That limitation does not
prevent choosing, saving or reviewing a v2 visual design. A lesson build and
publication still require separate authorization and approved instructor content.
The six previously approved Phase 1 releases are not reopened by this work.

Before a hosted rollout, deploy the compatible service authority/schema/model and
verify hosted acceptance before exposing v2 writes to teams. Follow
[shared service setup](../docs/bespoke/auto-handoff-setup.md); never put credentials
in browser assets or repository files. This local implementation did not perform
a deployment or change production configuration.

## Checks and historical references

```sh
node scripts/test-bespoke-simple-workflow.mjs
node scripts/generate-selection-v2-schema.mjs --check
python3 -m unittest discover -s scripts -p 'test_bespoke*.py' -v
node --test scripts/test-bespoke-handoff.mjs scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-dev-server.mjs
bash scripts/quality.sh
```

These are verification commands, not a claim that every gate has passed. The
current implementation's evidence belongs in its dated verification report.
Read [decisions](../docs/bespoke/decisions.md) for the September 24 overrides. The
September 23 slide-builder specification and color mockup remain historical design
records; their restricted palette, fixed pairing and no-preset constraints are
superseded. The [team meeting guide](team-guide.html) describes the four-stage
builder, optional editors, shared defaults and recovery. The original wizard is
preserved separately; its historical sequence is not the current builder's flow.
