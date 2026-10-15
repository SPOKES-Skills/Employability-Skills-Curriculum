# BeSpoke builder handoff

BeSpoke v2 configures reusable visual slide roles with sample copy. It is not
curriculum authoring, unrestricted drag-and-drop deck editing, or automatic lesson
construction. Teachers can choose a layout preset or continue their current look;
both write the same cumulative design. Independent role colors, heading/body fonts and component
choices must survive every save and artifact boundary.

**October 7, 2026 update:** the primary flow is Choose a layout → Customize →
Review & save. Twelve actual layout thumbnails replace the six starting swatches.
The compact toolbar edits sample text, size, color, horizontal alignment and
vertical placement, with one additional text area per role. The preset supplies
gradient direction. Detailed controls and the guide remain optional. This is local
implementation; the hosted acceptance boundary below remains in force.

The optional role fields `headingPlacement`, `bodyPlacement`, `extraText`,
`extraColor`, `extraSize`, `extraAlignment`, `extraPlacement` and `boxHeadings`
are validated by the same model/schema at every boundary. Missing fields in older
v2 saves use renderer defaults without rewriting the source. Original title and
box-body strings remain in their existing sample fields. The Python-generated
`build-contract.json` retains the entire design; its `componentMarkup` contains
the escaped additional text and individual box headings, and `design.css` contains
alignment and placement rules. Deploy the compatible catalog, schema and model
with the service before accepting these new designs on a hosted installation.

**September 24, 2026:** this implementation is prepared for local review. Service
behavior has synthetic tests; the revised wizard/service have not been deployed
or accepted on the hosted environment. September 22 live acceptance describes the
previous v1 deployment. Do not infer hosted v2 readiness from it or from local tests.

The current user decisions are in [decisions.md](decisions.md). They supersede the
September 23 spec's restricted palette, fixed font pairing and removal of presets.
All eleven existing brand swatches remain visible for direct role painting, and
all twelve existing font families can be selected independently for headings and
body. Franklin Gothic Book remains optional and unavailable: no usable licensed
local webfont package was found.

## Instructor workflow

The current builder uses **Choose a layout → Customize → Review & save**.
The layout gallery offers twelve presets and a Lesson & team disclosure. A preset
opens Customize and can then go directly to review or receive a small edit. Title, Chapter divider, Text boxes, Video and
Activity are direct, optional editors; there is no requirement to visit them all.
Returning teams resume the current look with Continue editing or Review & save.
The gallery remains available; applying another preset asks for replacement
confirmation for an existing design, even after a fresh load.

The optional **Shared theme** disclosure in More options and Review & save groups
shared colors, fonts and texture. Preserve Sidebar, Accent and Buttons colors,
navigation/button typography, and the shared canvas/Band exterior bindings. A
color element starts in **This slide** scope: its selected swatch and paint action
use the current preview's effective local field. **Shared default** explicitly
edits the separate global value and retains custom exceptions. Choosing another
element returns to This slide; preview tabs follow the equivalent local field.
Sidebar, Accent and Buttons remain shared-only. **Fonts & texture** has its own
This slide / Shared default scope. Its controls read the effective fonts and
pattern; local edits change just that field. Pattern thumbnails reuse the model's
background recipe with the selected slide's colors, gradient and texture strength.
Plain removes texture without clearing strength. Hidden text retains font edits
without becoming visible. Scope is browser UI state, never part of a selection
or shared record. A slide field marked Shared follows the current default; Custom records an explicit
exception. Use shared theme restores only that field's inheritance on that slide.
Review reports the effective choices and exceptions for all five roles, not just
the shared font defaults. Navigation and these labels do not change the saved
selection contract or authorize a lesson build.

The [team guide](../../bespoke/team-guide.html) is the instructor-facing reference.
Its connected Save/Open/Send instructions do not establish hosted v2 acceptance.
The local preview uses Save test design/Open test design and blocks review delivery.

## Selection and recovery contract

A `bespoke-selection/v2` contains the same lesson/team metadata, date and optional
submission timestamp, plus a complete `design`:

- Eleven role colors, independent heading/body font IDs and background pattern.
- Title arrangement, logo position and background finish.
- Divider arrangement, watermark and background finish.
- One to four text boxes, optional shared title bar, paragraph/bullet/numbered
  treatment, box style and arrangement.
- Video arrangement/frame/heading style and activity arrangement/label style.
- Title/subtitle and all four sample-box strings, including currently hidden boxes.
- The optional preset origin represented by `design.startingPoint` (`custom` after
  individual visual edits).
- Optional `design.featureStyles` records for sidebar, button, box, titlebar, video
  and activity preserve independent component fills, borders and navigation/button
  text color and font. These closed records use `inherit` for defaults, and are
  applied consistently to preview, component markup and generated CSS.
- Optional `design.roleStyles` records for title, divider, cards, video and activity:
  independent background/gradient, texture strength, heading/body typography and
  visibility, sample words, chapter/activity labels and decorative watermarks.
  Explicit inherit values follow shared defaults. Hidden choices retain their values.

Each present role record is closed and includes the original required fields;
the October 7 additions are optional for backward compatibility. Designs without the extension
retain their earlier CSS and sample markup exactly; there is no eager migration of
stored drafts. Older strict consumers reject the extension instead of discarding
it. Use the updated schema, model, service and Python bridge together. Presets reset
visual choices while preserving all sample words. Start and header help
explain this workflow and the brand, contrast and comparison guardrails. See the
[implementation and evidence report](role-customization-2026-09-24.md).

The live preview, CSS and component samples derive from
`bespoke/builder-model.mjs`. The closed schema is generated from the same catalog
by `scripts/generate-selection-v2-schema.mjs`. Python tools call the committed
Node bridge for the same validation and rendering authority; Node.js 22+ is an
explicit dependency. Invalid catalog values, malformed arrays and arbitrary CSS
are rejected at shared-save/build boundaries. Contrast is advisory-only: all eleven
brand colors are permitted for every role, and low-contrast choices remain exact
through shared save, reopen and generation. The bridge returns separate warnings;
Python validation reports them without failure, and generated v2 contracts and sample
HTML carry the same advisories. The team leader can retain the choice. Auth, revision,
receipt and structural checks are unchanged. No approval checkbox or new role is added.

V1 remains valid under its unchanged schema. V1 conversion is approximate and
shows warnings for styles with no exact counterpart. Keep the original v1 payload
verbatim in optional `legacySelection`; its independent validation must not be
replaced by a free-form archive. Earlier incomplete shared drafts can retain an
empty spokesperson in that archive, while the current envelope must be complete
for Send. Do not delete the original chapter-specific styling or sample text just
because the new reusable-role model cannot render it identically.

## Local preview and synthetic persistence

From this isolated worktree:

```sh
node scripts/bespoke-dev-server.mjs --port 8766 \
  --runtime-dir "/Users/brittlegg/Library/Application Support/Codex/local-previews/bespoke-guided-builder"
```

Open [the local preview](http://127.0.0.1:8766/bespoke/). This uses a distinct origin
from the saved checkout at port 8765, preserving its browser draft. The dev server
binds to loopback, serves approved builder assets, and replaces the handoff config
with a synthetic service on its own origin. No private team access is needed.
Save/Open/history exercise the real revision and retry handler with local data;
Send and review-status calls are blocked. Disk persistence is optional and must
remain outside every Git checkout. MacDev itself has a Git parent, so use the
external runtime path above. No runtime data belongs in a proposal.

The exported test API is `await createDevServer({port: 0, runtimeDir})`, returning
`server`, `baseUrl`, `runtimeFile` and async `close()`. Omitting `runtimeDir` uses
memory only. Closing the server does not delete an external persisted runtime.

## Receive a teacher file

For an authorized design-proposal intake, run:

```sh
python3 scripts/bespoke-write-submission.py "/absolute/path/to/team-selection.json"
```

The writer validates first and produces an immutable folder:

```text
docs/phase-2/submissions/<lesson-id>/<date>-<selection-digest>/
  selection.json
  content-intake.md
  design.css
  build-contract.json
  component-samples.html   # v2 only
```

Different contents get different digest folders. An exact retry leaves completed
intake edits and proposal history intact. `selection.json` keeps the full design
and any original v1 recovery payload. Sample copy stays labeled as sample material;
it is never assigned to a teaching stage. The canonical content-intake template
remains for a later separately authorized build, not a teacher prerequisite.
`component-samples.html` is a reusable visual demonstration, not a completed lesson.
Its relative base resolves the existing repository font assets when served at the
normal submission location.

The writer itself does not open a PR, access OneDrive, apply registries, build or
publish. After the compatible hosted service and workflow are deployed and
accepted, authenticated Send can create the draft design proposal through Spoke
Signals. **Processing is not delivery:** the matching proposal receipt is required.
Save retries retain mutation identity; Send uses the confirmed saved selection.
The handler preserves authorization before storage access, stale-revision rejection,
encrypted shared drafts, history and retry/receipt behavior.

Private team links and service credentials must stay out of proposals/logs.
Proposals are public repository artifacts; use work contact details and non-sensitive
sample text. [Shared service setup](auto-handoff-setup.md) describes provisioning
and hosted acceptance. Deploy the updated service authority/schema/model before
exposing v2 writes, then perform hosted acceptance. No deployment or production
configuration change is included in this local implementation.

## For a separately authorized lesson build

Confirm explicit build authorization, approved instructor content, required source
files, permissions and the reviewed proposal. A visual-design approval neither
supplies content nor authorizes an agent to invent it. The existing six Phase 1
releases already have Britt's September 23 approval; this work does not reopen them.

**V2 registry limitation:** `scripts/bespoke-apply-selection.py` deliberately rejects
v2 selections because the existing v1 theme registry cannot represent independent
colors, fonts and structural choices. Keep the complete v2 artifacts. A separately
reviewed v2 registry consumer is required before registry-based construction can
use them. Never flatten the design to a preset or pretend CSS alone creates text
boxes, a title bar or list structure.

For an existing v1 proposal only, registry preparation remains an explicit builder
step in the authorized lesson-build branch:

```sh
python3 scripts/bespoke-apply-selection.py --selection "<approved-v1-proposal>/selection.json" --dry-run
```

Removing `--dry-run` writes pending registry entries. Existing released lessons
cannot be replaced. Updating a different pending proposal requires review and
`--expected-selection-sha256 <current-digest>`. Keep Dashboard's offline catalog
consistent with authorized registry changes; do not mark a pending lesson ready.

## Preserve the approved design

The v2 contract records the complete model, selection/CSS/catalog/model digests,
font assets, shared component markup and structural requirements. V1 contracts
retain their original theme/template/chapter-map form. Use the approved artifact
versions; do not silently regenerate a changed look from later code.

1. Preserve the canonical lesson navigation/content architecture when separately
   building a lesson. Adapt the approved v2 role markup explicitly; its data
   attributes and structural classes are part of the contract.
2. Insert the complete `design.css` in the final `<style id="theme-override">`
   after base CSS, and add the selection SHA-256 meta tag from the contract.
3. For v2, create the saved number of real text boxes, the saved title-bar presence
   and actual `p`, `ul` or `ol` markup. Retain the chosen per-role attributes. For
   v1, retain its chapter map and any required `theme-dark` class.
4. Keep selected self-hosted font paths valid relative to the finished HTML.
5. Run the design checker, lesson validator and appropriate full quality gate.

```sh
python3 scripts/bespoke-check-design.py "<approved-proposal>/build-contract.json" "lesson-<id>/index.html"
python3 scripts/validate-lesson.py "lesson-<id>/index.html"
bash scripts/quality.sh
```

These are required verification actions, not a statement that a lesson or the
current root gate has passed. The design checker is static: inspect fonts,
contrast, overflow, all component roles and projection/mobile layouts in a browser.
Teacher/Britt acceptance of the completed appearance and content remains separate.

## Similarity and historical limits

`lesson-fingerprints.json` records measured evidence from six actual presentations;
`similarity.mjs` counts matching supported choices and exposes unknown dimensions.
Divider text is measured separately against actual chapter headings and supporting
copy; the current design derives those colors from `titleText` and `subtitle`.
It compares colors, independent fonts, backgrounds and meaningful component/layout
choices where measurable. Mixed/custom/unmeasured reference features remain unknown.
This is advisory exact-choice overlap, not a perceptual percentage or a check
against private team designs. It cannot certify that a new design is unique.

The preserved v1 library blocks defective `split-panel` dividers and `gradient-fill`
cards. Its optional per-chapter variation and fixed pairing rules describe the old
model. The new reusable-role builder does not flatten or delete that old information;
it keeps the original v1 selection for recovery and explains the conversion.
