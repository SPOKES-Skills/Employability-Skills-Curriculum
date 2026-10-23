# Product Guidelines: SPOKES Curriculum

## Brand Identity

- **Name:** SPOKES Employability Skills Curriculum
- **Logo:** `SPOKES-Logo.png` (used in lesson headers and dashboard)
- **Palette:** Canonical 11-color system defined in `SPOKES Builder/brand-palette.md`

## Color Policy

- Strict fixed 11-color palette only -- no non-canonical hex values
- Per-lesson color mixing allowed within the palette for visual differentiation
- Builder-made lesson designs need no color sign-off; a BeSpoke design is used only after Britt approves it
- Contrast and anti-clash guardrails defined in `brand-palette.md`

## Typography

- Fonts: any self-hosted family in `fonts/`, at most two per lesson (TYP-02); sharing a pairing with another lesson is fine
- Heading fonts must be legible at 4-5rem
- Body fonts must be readable at 1.5-2rem
- Minimum text size: 1.1rem (no sub-1rem text)

## Terminology

| Term | Meaning |
|------|---------|
| WIPPEA | Warm-up, Introduction, Presentation, Practice, Evaluation, Application -- lesson structure method |
| Quality Gate | One of 5 required pass criteria for lesson release |
| Template Variant | CSS class system (classic, modern, bold, elegant) controlling visual treatment |
| Intake Template | Structured form content teams fill out per lesson |
| Theme Override | `<style id="theme-override">` block placed AFTER main CSS for per-lesson customization |
| Instructor Prompt | Hidden panel on interaction cards toggled via View Prompt/Hide Prompt |

## Tone and Voice

- Professional but approachable -- this is workforce education
- Clear, actionable language in instructor-facing content
- Encouraging, non-judgmental tone in student-facing content
- No jargon without explanation

## Error and Empty States

- Video placeholders when YouTube URLs unavailable (standard placeholder component)
- Download links must resolve to valid files -- no broken links in production
- All interactions must be functional, not decorative

## Accessibility Standards

- WCAG 2.2 AA Phase 1: hard release gate
- WCAG 2.2 AA Phase 2: fast-follow after first 3 lessons finalized
- `prefers-reduced-motion` support required
- Keyboard navigation required on all interactive elements
- ARIA attributes on all interactive components
