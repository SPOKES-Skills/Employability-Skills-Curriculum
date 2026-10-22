# Workflow: SPOKES Curriculum Development

## Development Methodology

Sprinted, agent-driven development with user approval gates. Follows the SPOKES Agent Execution Model defined in `SPOKES-Agent-Execution-Spec.md`.

## Per-Lesson Build Workflow

### A. Intake and Validation
- Verify source materials exist (PowerPoint, PDFs, handouts)
- Build asset checklist with missing/complete status
- Resolve missing critical inputs before build

### B. WIPPEA Mapping
- Map content to WIPPEA stages (W, I, P1, P2, P3+, E, A)
- Validate logical flow between stages

### C. Build
1. Start from approved template baseline (`SPOKES Builder/template.html`)
2. Design the lesson within `SPOKES-STANDARD.md`, What Is Fixed and What Is Open
3. Embed YouTube or use placeholder
4. Add 3+ qualifying interactive elements (tabs, accordion, checkpoint prompt)
5. Add instructor prompt panels (hidden by default)
6. Add validated download links

### D. Hard Gate QA (all 5 must pass)
1. Accessibility and Readability
2. Multimodal Core Functionality
3. WIPPEA Method Adherence
4. Brand and Thematic Cohesion
5. Interactive Engagement

### E. Release Decision
- Block if any Critical defects remain
- Ensure High defects are sprint-committed
- Create fast-follow ticket list for Phase 2 accessibility

## Severity / SLA

| Severity | Policy |
|----------|--------|
| Critical | Fix before merge/release |
| High | Fix within current sprint |
| Medium | Fix within 2 sprints |
| Low | Backlog as capacity allows |

## Sprint Cadence

- Capacity: 20-25 agent runtime hours/week
- Agents: 1-8 depending on scope
- Template freeze per sprint (changes require approval)

## Git Conventions

- Repo-level git for the curriculum
- Individual project folders may have their own `.git`
- Commit messages should describe what changed and why

## Quality Gates

See `SPOKES-Agent-Execution-Spec.md` Section 3 for full gate criteria.
See `docs/release-checklist.md` for release checklist.
See `docs/qa-evidence-template.md` for required QA evidence format.

## Required Artifacts Per Lesson

1. `index.html` (the lesson)
2. Media and handout link inventory (pass/fail)
3. Gate report (Gate 1-5 results, defects by severity, release decision)
4. Fast-follow log for deferred Phase 2 items

## Document Precedence

If documents conflict:
1. `SPOKES-Agent-Execution-Spec.md`
2. `docs/final-product-definition.md`
3. `SPOKES Builder/brand-palette.md`
4. `SPOKES Builder/build-process.md`
5. `SPOKES-Master-Action-Plan.md`

## Escalation Triggers

Escalate immediately if:
- A hard gate cannot be validated due to missing criteria
- Palette/theming conflicts appear between spec documents
- Accessibility blocker cannot be remediated within sprint
- A template-level change is needed after template freeze
