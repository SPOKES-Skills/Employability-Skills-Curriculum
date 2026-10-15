# Click-to-edit feature inspector — October 7, 2026

This local follow-up preserves the approved color-first presets from `a7b5abb`.
It extends Customize so selecting a preview feature opens its controls in the
right editor sidebar. On phones, the inspector follows the preview before the
comparison section, and selecting a feature scrolls its controls into view.

## Selectable features

| Preview feature | Controls and scope |
| --- | --- |
| Navigation sidebar | Fill, text color and font across content slide navigation, independent of slide text and video placeholders |
| Action button | Fill, text color and font across video/activity buttons |
| Text | Sample words, font, color, size, alignment and placement; matching box typography remains linked with an explicit scope label |
| Added text | Independent font, color, size, alignment, placement, sample words and removal |
| Background | Solid/gradient colors, texture and slide arrangement |
| Box | Fill, border color, box style, arrangement, count and text treatment across matching boxes |
| Title bar | Fill, border color and visibility; click its heading for typography |
| Video frame | Frame treatment, placeholder color, border color and arrangement |
| Activity panel | Fill, border, arrangement and label treatment |
| Logo | The two supported logo positions; brand artwork is preserved |
| Accent rule | Shared accent color, including inherited borders and navigation markers |
| Watermark | Text, font, color, size, position, opacity and visibility |

The Selected element menu provides equivalent selection. Enter/Space on a preview
feature opens the inspector and focuses its selection control; Escape in the
preview selects the background. The mobile sample navigation menu retains its
open/close behavior. Selection itself never writes the design. Guide and Review
retain their original stage behavior, and view-only snapshots disable changes.

More slide options opens the existing detailed role controls below the inspector.
Use shared defaults removes a feature's overrides without changing other features.
All changes participate in Undo/Redo, browser drafts and full shared saves.

## Saved data and generated output

Optional, closed `design.featureStyles` records store sidebar/button
background, text color and font; box/titlebar/video/activity fill and border.
`inherit` resolves existing shared defaults. Added-text and watermark fonts are
optional fields in the existing role styles. No eager saved-data migration occurs.

The generated schema, server validation, shared model, preview, font dependencies,
Node/Python bridge and canonical CSS all understand the extension. Legacy preset
CSS/markup hashes remain unchanged. Preset replacement resets feature styling
while retaining the existing sample-copy contract. Similarity compares the actual
sidebar/button fills and box border, and identifies additional feature choices as
unmeasured rather than counting their inherited defaults as matches.

The intentionally faint watermark is named, keyboard-selectable artwork in the
editor. Its decorative text is hidden inside that accessible image; the ordinary
chapter label remains real readable text. Accessibility checks retain the wrapper
and inspector while excluding only the decorative ink from text-contrast checks.

## Verification

`scripts/test-bespoke-feature-inspector.mjs` exercises real clicks on the feature
surfaces, independent rendered colors and fonts, keyboard selection, shared-default
reset, Undo/Redo, reload, synthetic save and fresh-browser reopen at 1440, 1000 and
390 pixels. It also verifies Python-generated contracts and canonical sidebar,
button, box and activity rendering, malformed-field rejection, contrast warnings,
and inspector/selection accessibility. It is included in `scripts/quality.sh`.

Both Chromium and WebKit are used for the feature acceptance journey. Existing
preview-editor and simple-workflow checks also cover 768 and 320 pixel widths.
All tests use isolated synthetic storage. The local preview's persistent saved
state was backed up and preserved byte-for-byte when refreshing its server for
the new schema. No production service, curriculum, push, merge or deployment was
part of this change.

The complete repository checks passed in stages. The initial run passed through
workflow QA; updated shared-default wording was then checked through visual QA.
A sidebar keyboard-focus correction passed the dedicated sidebar checks in both
engines. The remaining role/layout tests passed; a video hover/frame interaction
was corrected and its full pixel/parity suite rerun before the remaining pattern,
library and lesson-baseline checks finished successfully. This was not one
uninterrupted green quality.sh run.

Recorded results include 48 editor axe scans, 112 viewport checks and 256 slide
checks with zero visual-QA findings; 466 role edits; 78 sidebar geometry checks,
22 exact sidebar paints and 15 sidebar accessibility scans in each engine; and
60 editor video-frame checks, 180 generated/canonical checks and 120 exact frame
pixel comparisons. Existing lesson accessibility baselines remain unchanged.

Evidence and desktop/phone screenshots:
`/Users/brittlegg/.codex/visualizations/2026/10/07/01a1171e-a1dc-7840-932c-49c4e3689b96/bespoke/feature-inspector/`.
The preview remains at `http://127.0.0.1:8778/bespoke/`; refresh its tab to load
the new inspector. Saved data remains in the existing external local runtime.
