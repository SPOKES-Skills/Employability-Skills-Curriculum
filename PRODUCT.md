# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Instructors** (WV adult basic education): open the Dashboard to find and launch one of six lesson decks, usually projected in class (1280×720 / 1024×768 common). Speed to launch matters mid-class.
- **Adult learners**: see the projected hub; may open lessons on shared or personal devices.
- **Stakeholders** (program directors, funders, partners): shown the Dashboard as the face of the SPOKES curriculum — e.g., the 2026-08-17 team/creator meeting. First impressions carry weight beyond daily utility. (Confirmed 2026-08-04.)

## Product Purpose

The Dashboard is the hub and launcher for the six-lesson SPOKES Employability Skills curriculum. Success, confirmed 2026-08-04: a first-time visitor should walk away thinking **"I want to open these lessons"** — appetite first ("theater lobby for the show"), while an instructor can still find and launch the right lesson in seconds.

## Positioning

The only surface that presents the whole SPOKES curriculum at once. Its unfair asset: each lesson is a fully themed interactive deck with its own registered identity (color lead, font pairing, artwork) — the hub can forecast six real, distinct personalities that a generic course catalog cannot.

## Operating Context

- Classroom projectors and aging school machines; school network content filters.
- Must work over `file://` and offline (registry fetch falls back to a synced built-in list; the page labels the offline state honestly).
- Cards launch lessons in the same tab; lesson decks save per-lesson slide position in sessionStorage.
- No build step, no server dependency; single static HTML file.

## Capabilities and Constraints

- Loads `lesson-registry.json` (per-lesson: title, description, status, colorLead/themeKey, fontPair, `slides`, `videos`, `interactions.implemented`); `FALLBACK_LESSONS` in the file mirrors it (sync contract + `FALLBACK_SYNCED` date).
- Must degrade without JavaScript (noscript link list) and state failures honestly (no fake registry health).
- The six lesson decks are governed by SPOKES-STANDARD.md (locked 11-color palette, nav engine); **the hub itself is explicitly NOT bound by the lesson design system** — confirmed 2026-08-04: free to carry its own palette/typography as the curriculum's front door, provided it still reads as SPOKES.
- Lessons with `status` qa/ready/complete are all launchable; pipeline status is not an instructor concern (removed from the surface 2026-08-04).
- **The curriculum will grow to 18 modules** (confirmed 2026-08-04). The Dashboard's structure must scale from today's 6 to 18 without redesign — grouping, density, and wayfinding chosen for 18, rendered with 6.

## Brand Commitments

- SPOKES name and bridge logo (`SPOKES-Logo.png`, green/blue bridge mark); © WV Adult Basic Education.
- Professional public-program identity — credible to schools and funders; never novelty for its own sake.
- The six decks' registered identities are fixed product facts; the hub should honor/forecast them, not repaint them.

## Evidence on Hand

- Six real lesson decks (`lesson-*/index.html`), each self-contained with videos, handouts, teacher guides.
- `lesson-registry.json` v1.2.0 with per-lesson metadata including real slide/video counts (measured 2026-08-04).
- Six card images in six unrelated visual styles (known weak asset; duotone treatment exists as mitigation).
- ~350 MB of local lesson videos; per-lesson poster SVGs inside decks.
- **Absent — do not fabricate:** testimonials, learner outcome data, enrollment numbers, partner logos.

## Product Principles

1. **Appetite first.** The page's job is making people want to open the lessons; everything decorative serves that pull.
2. **Instructor speed is sacred.** Find-and-launch in seconds; a full card row with CTAs stays visible at 1280×720.
3. **Honest states.** Offline, script-failure, and empty states tell the truth; nothing masquerades as healthier than it is.
4. **Six personalities, one family.** The decks' registered identities are the hub's raw material — forecast them rather than flattening them.
5. **Works everywhere WV schools are.** Old machines, content filters, offline, no build step, AA contrast.

## Accessibility & Inclusion

WCAG AA text contrast (documented requirement in README-dashboard.md); fully keyboard/screen-reader operable; `prefers-reduced-motion` respected; 44px touch targets on interactive controls.
