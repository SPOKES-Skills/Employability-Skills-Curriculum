# BeSpoke decisions

## Merge of main into the presets branch, October 15, 2026

Britt directed how pull request #55 combines with main. Where the October 2 rows
below disagree, this entry wins.

| October 2 row | Now |
|---|---|
| Nine presets | Main's twelve layout presets (October 7) stand. |
| The builder link goes privately to the Team Leader, and `--rotate-team-codes` replaces edit codes | Edit access uses main's 8-character team codes, kept in each team's OneDrive folder (October 13 and 14). `--reissue all` or `--reissue <lesson-id>` replaces codes. `--rotate-team-codes` is withdrawn. |
| Team view links | Unchanged: hashed with a `view:` prefix, a broken view table turns off only view links, and the viewer copy leaves out contact details, review notes and the archived original. |
| Sidebar color and text from the preview | The preview's feature inspector (October 7) edits the sidebar. More options on the sidebar opens Shared theme, which keeps the Sidebar text color choice. |

## Lesson & team stage, October 9, 2026

Britt chose a separate first stage for Lesson & team, over a top-bar chip or a
highlighted card on the starting-looks page. The flow is now Lesson & team, Color
& layout, Customize, then Review & save. This supersedes the September 24 decision
that Start combines Lesson & team with the starting looks. The other three stages
are unchanged.

Lesson & team is its own page with the lesson, team name, spokesperson name and
spokesperson email, and a Continue to starting looks button. A new visit opens on
it. Its stage pill carries an outline and a dot until a team name and spokesperson
name are entered, then names the lesson and team in its tooltip. The stage never
blocks navigation or Save. Send to Britt still needs the spokesperson name and
returns people to this page when it is missing. A saved draft reopens on the stage
it was left on. Earlier drafts that were saved on the starting looks still open there.

## Current simplification — October 7, 2026

Britt authorized implementation in an isolated worktree: twelve distinct layout
presets with real slide thumbnails, one live preview with nearby text editing,
three text sizes, text color, Left/Center/Right alignment and Top/Middle/Bottom
placement. Solid exposes one brand-color picker; Gradient exposes independently
selectable start and end colors. The preset determines direction. Choose a layout,
Customize, Review & save replaces the earlier primary path; the detailed guide and
editors remain optional. Orientation does not mean rotation. New values must
survive existing Save/Open/recovery and generated design handoff. No merge,
deployment or curriculum construction is authorized by this implementation.

## Start flow, step path and presets: October 2, 2026

Britt approved the design in `docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md`. It replaces these earlier rows. Everything not listed here stands.

| Earlier decision | Now |
|---|---|
| Six presets (September 18) | Nine presets. Open Air, Gold Standard and Slate are new, and every preset is redesigned. `scripts/build-bespoke-presets.mjs` is the source. |
| Sidebar text color is chosen for you (September 24) | Optional choice saved as `design.roles.sidebarText`. Absent means Automatic. Advisory at 4.5 to 1. |
| Start is one page with Lesson & team, Build my own and six presets (September 24) | Two short screens, then scratch or preset. Ships in the second pull request. |
| Guide me walks slide by slide with four suggested colors (September 30) | Step by step walks twelve steps: colors, layout, fonts. Every color screen shows all eleven. Ships in the second pull request. |
| Guide me owns the preview while it runs (October 1) | A preview click opens the matching step or the preview editor. Ships in the second pull request. |
| One private link per team, and it edits (September 22) | Two links per team. The builder link edits. The team view link opens the latest saved design read-only. |
| The spokesperson operates the preview (September 22) | The saved design names a Team Leader and, when different, one builder as `team.builder.name`. The team decides together on a Teams call with the builder sharing their screen. |
| A private team link is pinned in the team's channel (September 22) | The team view link is pinned. The builder link goes privately to the Team Leader, who passes it to the one builder. Existing edit codes can be replaced with `--rotate-team-codes` without touching the encryption key. |
| A view of a design is a frozen snapshot link | The team view link always opens the latest saved design. It leaves out the Team Leader's email, the review notes and any old wizard draft. |

The saved format stays `bespoke-selection/v2`. The service is redeployed before the first pull request merges, because it bundles the schema and the catalog.

## Prior direction — September 24, 2026

Britt authorized implementation of the guided visual-design builder in an
isolated worktree and a separate local Safari preview. The v2 implementation is
prepared for local review. Synthetic checks support its shared-service integration;
this does not claim a hosted v2 release, production deployment, or a completed
root quality gate. The dated verification report records actual verification.

These decisions supersede conflicting choices in the September 23
[slide-builder specification](slide-builder-spec.md), its Plan 1, and the earlier
color-role mockup. Those files remain historical planning evidence.

Britt subsequently approved the preferred three-stage flow from the September 24
[workflow review](workflow-review-2026-09-24.md): Start, optional slide editing,
then Review & save, with an optional Shared theme available throughout. The review
and its appendix remain evidence of the earlier ten-step baseline, not current
instructions or a claim of hosted acceptance.
The [implementation report](workflow-fixes-2026-09-24.md) maps all eight findings
to the resulting behavior and verification.

| Topic | Current decision |
|-------|------------------|
| Purpose | Beginners choose reusable visual slide-role designs with sample copy and a cumulative preview. This is not curriculum authoring, a drag-anywhere full deck editor or automatic lesson construction. |
| Starting path | Start combines Lesson & team with Build my own or six editable presets. Both populate the same controls/model with usable defaults. A preset can go straight to Review & save or through one editor for a tweak. Returning teams continue editing or review their current look; Change starting look is deliberate. An existing saved design receives replacement confirmation even after a fresh load, subject to the explicit current-session opt-out. Applying a preset preserves sample words and can be undone. The earlier no-preset constraint is superseded. |
| Navigation and scope | Use Start → Slide designs → Review & save. All five slide editors are optional and directly accessible; Next slide type is an aid, not a required walkthrough. Keep Shared theme as an optional persistent disclosure grouping shared colors, heading/body fonts and texture. Retain Sidebar, Accent and Buttons colors, shared navigation/button typography and canvas/Band exterior defaults. Show Shared/Custom state per inheritable field; return to shared affects only that field on that slide type. Review summarizes all five effective designs and their exceptions. |
| Colors | Select an element, then replace its color with a swatch. Show all eleven existing brand colors, including White. No two-primary/three-secondary palette membership step; no restriction that content backgrounds must be White/Mist or body text only Royal/Navy/Gray. Every one of the eleven colors is selectable for every role, including Gold and Green text. Modeled contrast is advisory throughout selection, review, save and generation. Explain the measured ratio and guideline; the team leader can keep the choice. Do not disable swatches, silently recolor, or add approval requirements. Structural/auth/conflict validation remains enforced. |
| Fonts | Preserve all twelve existing self-hosted font families. Choose shared heading and body fonts independently; slide editors may override their own fonts. Shared body typography still supplies navigation and buttons. Presets may initialize combinations. This supersedes the fixed-pairing restriction for v2; serif headings remain available. |
| Franklin Gothic Book | Optional only. A focused local check found no usable licensed webfont package. Omit it for now; do not purchase, extract Office fonts, relabel a substitute or block the builder. |
| Slide editors | Title, Chapter divider, Text boxes, Video and Activity retain independent designs under Slide designs. Text boxes have one to four boxes, an optional shared title bar, paragraph/bullet/numbered treatment, style and arrangement. Every editor is optional. A text-box choice must not reset other roles. |
| Cumulative state | Colors, fonts, samples and per-role designs survive navigation, preview switching, reload and save/reopen. Keep undo/redo, browser recovery and downloadable backups. Reducing box count preserves all four draft strings. The preview and serialized design use the same accumulated model. |
| Similarity | Keep a prominent advisory meter against actual measured reference lessons. Count exact supported choices, including fonts/colors/layout/style when comparable. Show matches, differences and unknowns. Never call this a pixel/perceptual percentage, promise uniqueness, or block selections for similarity. |
| Comparison scope | Six existing lessons only: Time Management, Interview Skills, Controlling Anger, Employee Accountability, Communicating with the Public, and Problem Solving & Decision Making. No claims about other teams' private designs or invented reservation service. |
| Migration | Preserve the complete original v1 selection verbatim inside a v2 backup. Explain approximate conversions and retain original chapter-specific styling for recovery. Do not claim the converted appearance is lossless. The original v1 schema/wizard remain available. |
| Save and Send | Preserve private team access, local-versus-confirmed-shared distinctions, version/conflict checks, idempotent retry, history and receipt-confirmed Send. The local preview uses only synthetic storage and blocks Send/status. |
| Artifacts | Validate the full v2 model at service and proposal boundaries. Share model CSS/markup with the preview. Emit full selection, intake, CSS, v2 contract and reusable component samples. Box count/title-bar/list treatment require actual markup, not CSS that merely resembles a structural change. |
| Registry boundary | Existing v1 registries cannot faithfully carry v2. Their apply tool rejects v2 explicitly until a reviewed v2 consumer exists. Choosing/saving/reviewing a visual design is still supported. |
| Build and release | Building a lesson needs separate authorization and complete approved instructor content. Publication, production settings and deployment are not authorized by this local implementation. The six Phase 1 lessons approved by Britt on September 23 are not reopened. |
| Local review | Use a separate origin such as port 8766 and external synthetic runtime storage. Preserve the older port 8765 checkout/server/Safari draft. MacDev has a Git parent; local runtime data belongs outside it, for example under `~/Library/Application Support/Codex/local-previews/`. |

See [the current README](../../bespoke/README.md) for user steps and local startup,
and [builder handoff](builder-handoff.md) for v1/v2 contracts and rollout limits.

## Historical prototype greenlight — September 18, 2026

**Historical status: GREENLIT** (Britt, 2026-09-18). Build the prototype.

September 22 clarification: the teacher workflow is visual design only. Shared Save/Open and private team access were authorized as its implementation; neither Save nor Send builds lessons.

Source of truth at greenlight: project store `docs/bespoke-open-questions.md`. This file mirrors the locked table into the curriculum repo.

### Original locked table

The table below records the original decision vocabulary. Current September 24
overrides above control v2. In particular, D12's per-chapter variation remains a
v1 capability preserved in recovery; v2 configures reusable slide roles rather
than silently converting all chapter-specific styles.

| Item | Decision |
|------|----------|
| D6 | Keep existing colors; present for choice / legal mix-match. |
| D7 / library | Same product as wizard: catalog of colors, cards, layouts the wizard displays. |
| D10 | Send → receipt-confirmed draft PR; Britt is the visual-design review gate. A lesson build needs separate authorization and complete approved content. |
| D11 | Wizard fills `content-intake-template.md`; template canonical. |
| D12 | Opt-in vary card styles by chapter / topic; function = different library pieces for different jobs. |
| Hosting | Same repo; GitHub Pages wizard with a dedicated Netlify Save/Open service. No custom domain required. |
| Wizard | One app; team ≈ lesson + spokesperson; demo-first Spokes Model; submit → Action → lesson-tagged PR. |
| Presets | Six: Professional, Modern, Serious, Light-hearted, Fun, Outspoken. Fully editable after pick. |
| Timeline | Undetermined; prototype. |
| Build shape | Library + wizard together (one product). |

### Original build workstreams

1. Core: catalog + wizard UI + demo preview + dashboard link + Spoke Signals Action — this PR
2. Library: expanded selectable card/layout variations feeding the catalog — parallel workstream

### Original v1 library registration

Wizard loads `SPOKES Builder/bespoke-library-catalog.json` (see companion card-library PR). UI keys are `{family}.{slug}`; registry/intake fields store **slug only**. Color leads remain display/choice only (D6). Docs: `SPOKES Builder/bespoke-library-ids.md`.

### Historical concept brief

`docs/briefs/instructor-lesson-studio-concept-2026-09-17.md` (when merged from the briefs PR). Follow where it does not conflict with this lock file — **decisions win**.


## Divider text correction — September 24, 2026

`titleText` is shared by the title and divider headings; `subtitle` is shared by the
title subtitle/copyright and divider chapter labels/supporting text. Content `heading`
and `body` stay independent. Explicit choices take precedence over background-derived
ink. No additional persisted field or v2 migration is needed. Existing v2 drafts and
shared revisions open unchanged with new readability warnings where necessary. The later September 24 advisory-only color decision supersedes contrast blocking:
3:1 headings and 4.5:1 supporting text remain guidance on both title and divider
surfaces, including gradients and patterns. Writes and artifacts preserve the team
leader’s choice. Defaults/presets meet the guidance.
