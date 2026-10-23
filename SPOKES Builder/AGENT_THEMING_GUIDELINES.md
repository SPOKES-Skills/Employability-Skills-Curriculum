# SPOKES Lesson Builder — Agent Theming Guidelines

**CRITICAL:** There are no predefined theme packages. Design each lesson within the fixed rules, and build in the spirit of the design rules.

## Two-Layer Theme System

`theme-registry.json` records each lesson's design. If the lesson has a design there, apply it. If not, follow Step 3 of `SPOKES Builder/CLAUDE.md`. The tables below list the library's starting options, not the only options; a lesson may go beyond them within the fixed rules (`SPOKES-STANDARD.md`, What Is Fixed and What Is Open).

### Layer 1 — Lesson Identity (constant across lesson)

| Property | Source | Description |
|----------|--------|-------------|
| colorLead | theme-registry.json | Which brand color dominates (blue, mauve, gold, green, royal, or dual-tone) |
| sidebarColor | theme-registry.json | Sidebar background: "dark" (#004071) or "royal" (#00133f) |
| backgroundTexture | theme-registry.json | Content area pattern: plain, dot-grid, diagonal, crosshatch, soft-gradient, or dark-royal |
| titleSlide | theme-registry.json | Opening slide layout (15 options) |
| fontPairing | theme-registry.json + font-pairings.md | Heading + body font pair |

### Layer 2 — Chapter Variation (rotates per chapter)

| Property | Source | Description |
|----------|--------|-------------|
| cards | theme-registry.json per chapter | Card/component styling (16 options — see bespoke-library-catalog.json) |
| divider | theme-registry.json per chapter | Section divider layout (8 options; uniform per lesson from Bespoke) |
| leadComponent | theme-registry.json per chapter | First component type after section divider |
| secondaryAccent | theme-registry.json per chapter | Alternating accent color for borders/highlights |

#### FID-5 — Derived `leadComponent` / `secondaryAccent` (Bespoke)

Instructors do **not** choose these. When `scripts/bespoke-apply-selection.py` upserts a registry entry from `selection.json`, it fills Layer 2 using this fixed WIPPEA-role table:

| Chapter | leadComponent | secondaryAccent |
|---------|---------------|-----------------|
| W | takeaways | gold |
| I | cards-grid | primary |
| P1 | smart-stack | gold |
| P2 | areas-grid | primary |
| P3 | dangers-grid | gold |
| E | takeaways | primary |
| A | content-list | gold |

`secondaryAccent` alternates `gold` / `primary` (lead-appropriate default). Card styles come from the wizard (`lessonWide` or per-chapter when `varyByChapter` is true). Divider is copied from the lesson-level `dividerStyle` into every chapter.

### How to Build the Theme-Override Block

1. Get the lesson's design (Step 3 of `SPOKES Builder/CLAUDE.md`).
2. Open `theme-library.css` (generated from `theme-options.json`) and find the relevant CSS snippets. The block may combine these snippets with custom CSS within the fixed rules.
3. For Layer 1 properties: uncomment the matching snippet and add to the override block
4. For Layer 2 card styles: find the card style snippet, replace `SCOPE` with `[data-chapter="N"]`
5. For Layer 2 dividers: find the divider snippet, replace `DIVIDER_SCOPE` with `.slide-section[data-chapter="N"]`
6. For dark-royal texture: include the `.theme-dark` CSS and add `class="theme-dark"` to `.main`
7. Place the complete `<style id="theme-override">` block AFTER the main SPOKES `<style>` block
8. Honor `varyByChapter`: when true, each chapter's `cards` slug in the registry may differ — apply the matching SCOPE block per chapter

### Rules

- **Aim for a look that is clearly different from the other lessons.** Sharing some colors, fonts or card styles with another lesson is fine.
- **Custom CSS is allowed in the theme-override block.** It may use only the 11 color variables (CLR-01 to CLR-08), must keep text readable (A11Y-20), and must leave the logo unaltered (LOGO-01, LOGO-02). Reuse theme-library.css snippets where they fit.
- **Do not ad-hoc edit theme-library.css during lesson builds.** Edit `theme-options.json`, run `python3 scripts/generate-theme-library.py`, and register IDs in `bespoke-library-catalog.json` / `bespoke-library-ids.md`, then open a dedicated PR.
- **All 11 brand colors remain available.** A design usually uses 5 or 6 of them, combined in any way that keeps text readable (A11Y-20). Never add a color or change a color's value (CLR-01).
- **Off-limits for new designs (CRD-02):** the library option `cards.glass` (frosted glass). The dot-grid texture, the radial-glow title and gradient-filled cards are allowed when text on them stays readable (A11Y-20).
- **BeSpoke designs:** A BeSpoke design that breaks a rule is not used. Send it back to Britt.
- **WCAG AA contrast** must be maintained in all text/background combinations.
- **Wizard catalog:** selectable option IDs are `{family}.{slug}` — see `bespoke-library-ids.md`. Optional `blocked` + `reason` grey an option in the wizard without removing it.
