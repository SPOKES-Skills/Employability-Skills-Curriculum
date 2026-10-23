# Tech Stack: SPOKES Curriculum

## Output Format

Single self-contained `index.html` per lesson. No external dependencies, no server required. Portability for classroom deployment is the priority.

## Frontend (In-Lesson)

| Technology | Purpose | Notes |
|------------|---------|-------|
| HTML5 | Lesson structure | Semantic elements, ARIA attributes |
| CSS3 | Styling and layout | CSS custom properties for theming, grid/flexbox for responsive layout |
| Vanilla JavaScript | Interactivity | Slide navigation, sidebar, interactions, confetti |
| Self-hosted fonts | Typography | Font files in `fonts/`; at most two per lesson (TYP-02), and lessons may share a pairing |

No frameworks. No build tools. No npm. Everything is inline in the single HTML file.

## Design System

| Asset | Location | Purpose |
|-------|----------|---------|
| `SPOKES Builder/template.html` | Canonical template baseline | Starting point for all lesson builds |
| `SPOKES Builder/brand-palette.md` | Color system | 11-color canonical palette with contrast guardrails |
| `SPOKES Builder/components.md` | Component library | Reusable UI/content patterns |
| `SPOKES Builder/AGENT_THEMING_GUIDELINES.md` | Theming guide | How to apply per-lesson theme overrides |
| `SPOKES Builder/build-process.md` | Build pipeline | 8-phase verification checklist |
| `SPOKES Builder/content-intake-template.md` | Intake form | Structured format for content teams |

## Handout Generation (Project 1 only)

| Technology | Purpose |
|------------|---------|
| Python 3 | PDF generation scripts |
| ReportLab (assumed) | PDF library for handout generation |

Scripts: `generate_handout_*.py`, `generate_rubric.py` in lesson-employee-accountability folder.

## Infrastructure

- **Hosting:** Local file system / classroom computers (no server)
- **Version Control:** Git (repo-level)
- **Dashboard:** `Dashboard.html` -- curriculum launcher linking to all lessons

## Quality Tooling

- Manual QA against 5-gate checklist
- Brand color compliance: grep for non-palette hex values in `index.html`
- Device QA matrix: 360x800, 768x1024, 1920x1080
- `lesson-registry.json`: tracks variant, font, component usage, gate results per lesson

## Template Variants

4 allowed CSS class variants for visual diversity:
- `variant-classic`
- `variant-modern`
- `variant-bold`
- `variant-elegant`

## Key Constraints

- No external CSS/JS files -- everything inline
- No npm, no build step, no bundler
- No `target="_blank"` without `rel="noopener noreferrer"`
- AudioContext wrapped in try/catch
- `<button>` elements for all clickable controls (not `<span>`)
