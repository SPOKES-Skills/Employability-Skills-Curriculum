# Simplified BeSpoke workflow — October 7, 2026

Implemented locally on `codex/bespoke-simple-layouts`, based on `13a808d`
(the merged Claude contextual-editor fixes in PR #42). Work stayed in the isolated
`4bd6` worktree. Other worktrees and production services were not modified.

## What changed

- Color & layout → Customize → Review & save is the primary path.
- Exactly twelve distinct title compositions: Editorial, Split stage, Centered,
  Grounded, Framed, Headline, Side rule, Horizon, Corner, Masthead, Two columns,
  and Inset. Each thumbnail renders the actual model/CSS at a scaled slide size.
  Each preset also supplies the existing five reusable slide-role designs.
- Selecting text exposes a nearby sample-text editor, color, three sizes,
  horizontal alignment, and Top/Middle/Bottom placement within the text area.
  Box headings and bodies have independent sample words. Matching box headings
  and bodies retain shared formatting, with the scope stated in the editor.
- Add text creates one additional editable area per slide role, with its own
  color, size, alignment and placement. It can be selected again or removed.
- Solid shows one brand-color picker; Gradient shows independent start/end
  pickers. The preset supplies direction. A second color survives switching to
  Solid and back. No rotation or gradient-direction decision was introduced.
- Undo/Redo remain visible; a continuous typing session forms one design-history
  entry. Detailed editors and the guide remain under optional controls.
- Existing shared Save/Open, stale-revision protection, retries, recovery and
  review-delivery behavior remain in place. Local preview blocks delivery.

## Model and handoff

The active app is `builder-app.mjs`, not the eleven-step legacy `app.js`.
New fields extend optional `roleStyles` without requiring migration of earlier v2
records. Existing title/body sample sources are retained. New box headings,
added text, placement and formatting survive browser drafts, backup files,
synthetic shared saves, reload and reopening on a fresh browser context.

The generated schema and service authority validate these fields. The Node model
and Python `build_design` path emit the complete design in `build-contract.json`,
actual escaped text in `componentMarkup`, and the corresponding CSS. Frozen
former presets retain their previous CSS and markup hashes. V1 originals remain
recoverable through the existing conversion/archive path.

## Local review

Preview: <http://127.0.0.1:8778/bespoke/>

Run from this worktree if the existing local server has stopped:

```sh
node scripts/bespoke-dev-server.mjs --port 8778 \
  --runtime-dir "$HOME/Library/Application Support/Codex/local-previews/bespoke-simple-layouts"
```

The server binds to loopback and saves synthetic designs outside Git. It does not
use provisioned team credentials or hosted storage.

Screenshots are saved under:
`/Users/brittlegg/.codex/visualizations/2026/10/07/01a1171e-a1dc-7840-932c-49c4e3689b96/bespoke/`

- `layouts-1440.png`, `layouts-390.png`: twelve-layout gallery.
- `customize-1440.png`, `customize-390.png`: selected text and contextual editing.
- `gradient-1440.png`, `gradient-390.png`: independent gradient colors.

## Verification

- New end-to-end workflow: Chromium and WebKit at 1440, 768, 390 and 320px.
  Exercises all twelve preset geometries on desktop; text editing, both axes,
  solid/gradient colors, added text, independent box words, Undo/Redo, reload,
  synthetic Save/Open and Python-generated handoff across the four sizes.
- Responsive visual QA: 48 editor axe scans, 112 viewport checks, 256 slide checks
  including 42 canonical generated cases; zero findings. Includes 200% text.
- Detailed role acceptance: 466 edits, 30 paint checks, 100 typography checks,
  20 pixel checks, 50 geometry checks and 31 accessibility scans passed.
- Old-design appearance/contract suite: all eight checks passed, including frozen
  old preset CSS/markup, strict malformed-input rejection and Python parity.
- Gitleaks scanned the worktree with no leaks; `git diff --check` passed.
- Repository quality checks completed in two stages. The full `quality.sh` run
  passed through the sidebar suite, then stopped because the help-text regression
  expected the word “editable.” That useful wording was restored. The affected
  role suite and every remaining gate command were rerun successfully, ending with
  the lesson accessibility baseline and `quality.sh: all checks passed`.
  The logs retain the initial run and resumed tail separately; this was not one
  uninterrupted clean gate invocation.

Local and synthetic evidence does not establish hosted acceptance. This work was
not merged, pushed or deployed and did not build curriculum. Deployment requires
the compatible catalog, model and schema alongside the service, followed by hosted
acceptance checks. Instructor review of the visual experience remains separate.

## Color-first preset follow-up

The starting gallery now leads with twelve named palettes and labeled color swatches.
The existing layouts span green, gold, white, silver, graphite, berry and blue,
with eight solid backgrounds and four gradients. Coordinated dividers, content
headings, navigation and accents use the same palette. All preset text passes
the shared model's contrast checks. The approved eleven colors remain editable.

Only new preset selections use these combinations. Existing saved designs retain
their full color values; a gallery card is marked selected only when it matches
the current design. Color names also appear in confirmation and history.

Follow-up verification: Chromium and WebKit completed the simple workflow at
1440, 768, 390 and 320 px, including all twelve layouts, text editing, history,
reload, save/reopen and handoff. Desktop and phone gallery axe scans found no
violations. An existing local mauve/blue saved design reopened unchanged, and
canceling the newly named preset confirmation preserved it exactly.

Color review artifacts are in the `color/` subfolder of the artifact directory
above: `presets.png`, `gallery-1440.png` and `gallery-390.png`.

The complete `bash scripts/quality.sh` passed for this follow-up in one run
(including the repository's existing lesson accessibility baseline). The current
BeSpoke visual QA recorded 48 editor axe scans, 112 viewport checks and 256 slide
checks with zero findings. Evidence: `color/quality.log` and `color/webkit.log`.
