# Curriculum Employability Skills

SPOKES interactive employability curriculum system with standards, templates, and lesson production workflow.

## Instructor collaboration

Round 2 teams use BeSpoke during Teams calls to choose the visual style of their
lessons: colors, fonts, backgrounds, layouts and cards. Britt supplies a private
lesson link to pin in each team's private Teams channel. Teams use **Save shared
design** and **Open team design** to save and resume their shared choices across
computers. One spokesperson operates BeSpoke during the call; OneDrive can hold
optional files from **Download backup**. No lesson-writing form, coding or GitHub
account is required for this workflow.
The current local builder uses **Start → Slide designs → Review & save**. Choose a
preset or Build my own, use Shared theme and any slide editors optionally, then
review the effective design. Start with the [BeSpoke visual design guide](bespoke/team-guide.html).
Britt/builders follow [the handoff and design verification procedure](docs/bespoke/builder-handoff.md).
Administrators follow [shared service setup and hosted acceptance](docs/bespoke/auto-handoff-setup.md).
The earlier v1 hosted Save/Open/Send flow passed
[live acceptance](docs/bespoke/verification-2026-09-22.md), including two browser
sessions and a real review proposal. The current v2 builder is for local review;
its synthetic tests do not establish hosted v2 acceptance. In that local preview,
Save test design and Open test design use a local test service, and Send is disabled.
The six Phase 1 lessons are out of QA and ready for teaching (September 23, 2026).
Phase 2 (Round 2) builds six new lessons with instructor teams: Goal Setting,
Money Management - Budget, Professionalism and Diversity, Knowing Your Rights in
the Workplace, Communicating Assertively and Workplace Ethics. None is built yet;
March 2027 is the soft target. Round 2 planning lives in `docs/phase-2/`.

Earlier review evidence:
[project review dated September 22, 2026](docs/qa-reports/project-review-2026-09-22.md).

## Quick Start (3 minutes)

1. Read `SPOKES-STANDARD.md` (single source of truth for all lesson requirements)
2. Read `SPOKES-Agent-Runbook.md` (how to execute lesson work)
3. Read `SPOKES Builder/build-process.md` (build pipeline)
4. Open `SPOKES Builder/template.html` (baseline lesson shell)
5. Open `index.html` (redirects to `Dashboard.html`) to launch lessons

## Repository Structure

- `SPOKES-STANDARD.md` — single source of truth for lesson rules (validated by `scripts/validate-lesson.py`)
- `SPOKES-Agent-Execution-Spec.md` — authoritative operating spec
- `SPOKES-Agent-Runbook.md` — operational workflow for lesson execution
- `SPOKES-Project-Plan.md` — phased project delivery plan
- `SPOKES-Master-Action-Plan.md` — consolidated issue register + sprint plan
- `Dashboard.html` — curriculum launcher/dashboard (`index.html` redirects here)
- `bespoke/` — BeSpoke instructor visual design builder; v2 is under local review, with the earlier v1 hosted acceptance recorded separately
- `netlify/` — private-team Save/Open and review handoff service; deploy the staged service package
- `docs/bespoke/decisions.md` — greenlit Bespoke lock decisions
- `lesson-registry.json` — per-lesson status, theme, and quality-gate registry
- `lesson-time-management/` — Time Management lesson
- `lesson-interview-skills/` — Interview Skills lesson
- `lesson-employee-accountability/` — Employee Accountability lesson
- `lesson-communicating-with-the-public/` — Communicating with the Public lesson
- `lesson-controlling-anger/` — Controlling Anger lesson
- `lesson-problem-solving-and-decision-making/` — Problem Solving & Decision Making lesson
- `SPOKES Builder/` — design system + template assets
- `scripts/` — lesson validator, caption generator, print planner

### SPOKES Builder

- `template.html` — canonical lesson template baseline
- `build-process.md` — end-to-end lesson construction process
- `components.md` — reusable lesson UI/content components
- `content-intake-template.md` — structured intake format for source teams
- `AGENT_THEMING_GUIDELINES.md` — theming and style override guidance
- (the former `brand-palette.md` was absorbed into `SPOKES-STANDARD.md`; archived copy at `docs/archive/brand-palette.md`)

## Governance / Precedence

If docs conflict, use this order:

1. `SPOKES-STANDARD.md`
2. `SPOKES-Agent-Execution-Spec.md`
3. `SPOKES Builder/build-process.md`
4. `SPOKES-Master-Action-Plan.md`

## Build Output Contract

Each lesson ships as a **single self-contained `index.html`** with:

- WCAG-aligned accessibility baseline
- WIPPEA structural adherence
- brand-compliant color usage (canonical palette only)
- 3 required qualifying interactions (+ optional 4th+ where it adds clear value)
- validated links/resources

## Quality Gates

All lesson releases must pass:

1. Accessibility/Readability
2. Multimodal Functionality
3. WIPPEA Adherence
4. Brand/Thematic Cohesion
5. Interactive Engagement

See `SPOKES-Agent-Execution-Spec.md` for full gate criteria and severity/SLA policy.

## Offline copy for teachers

Teachers can run the released lessons with no internet, from a flash drive or a
folder on their computer. Build the copy:

```bash
python3 scripts/build-offline-package.py
```

It writes `dist/SPOKES-Lessons-Offline-<date>/` and a zip of that folder, about
550 MB. Only lessons marked `ready` in `lesson-registry.json` go in, with their
Handouts, Teacher-Resources and print pictures. Source Material, BeSpoke and the
build tools stay out. Chrome and Edge won't load caption files from a local
folder, so the build embeds each caption file in its lesson page. It stops if
any link in the copy points at a file the copy doesn't have.

Open the copy in a browser before you share the zip:

```bash
node scripts/check-offline-package.mjs dist/SPOKES-Lessons-Offline-<date>
```

Teachers unzip it and open `START HERE.html`, which carries their instructions.
A copy never updates itself. Build and share a new one after lessons change.
`scripts/quality.sh` runs the build tests and the browser check, so a lesson
change that would break the offline copy fails the gate.

## Current Status (high level)

- Phase 1: 6 lessons, all out of QA and ready for teaching (September 23, 2026)
- Phase 2 (Round 2): 6 lessons in instructor-team planning, soft target March 2027
- Program target: 18 lessons total; lessons 13–18 not yet named

## Operational Docs in This Repo

- `lesson-registry.json` (variant/font/component tracking per lesson)
- `docs/repo-standards.md` (naming and structure policy)
- `docs/release-checklist.md` (release quality checklist)
- `docs/future-upgrades.md` (deferred optional enhancements backlog)
- `README-dashboard.md` (dashboard acceptance criteria + ownership model)
- `docs/final-product-definition.md` (authoritative final product target)
