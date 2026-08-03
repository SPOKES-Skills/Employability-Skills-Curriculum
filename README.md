# Curriculum Employability Skills

SPOKES interactive employability curriculum system with standards, templates, and lesson production workflow.

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

## Current Status (high level)

- Existing lessons: 6 (3 release-approved/ready, 3 in QA — see `lesson-registry.json`)
- Program target: 18 lessons total
- Ongoing work: QA closeout for the 2026-04 lesson batch, production batching for remaining lessons

## Operational Docs in This Repo

- `lesson-registry.json` (variant/font/component tracking per lesson)
- `docs/repo-standards.md` (naming and structure policy)
- `docs/release-checklist.md` (release quality checklist)
- `docs/future-upgrades.md` (deferred optional enhancements backlog)
- `README-dashboard.md` (dashboard acceptance criteria + ownership model)
- `docs/final-product-definition.md` (authoritative final product target)
