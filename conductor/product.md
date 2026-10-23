# Product: SPOKES Employability Skills Curriculum

**One-liner:** An interactive HTML-based employability skills curriculum of 18 self-contained lessons for classroom instruction.

## Problem Statement

Workforce development programs need engaging, accessible, standards-aligned lesson modules that instructors can deliver in classroom settings. Existing materials are static PowerPoints and PDFs that lack interactivity and consistent quality.

## Solution

Build 18 interactive HTML lessons using the SPOKES Builder design system. Each lesson is a single self-contained `index.html` file that runs in any browser -- no server, no install, no dependencies. Lessons follow the WIPPEA pedagogical method and meet WCAG 2.2 AA accessibility standards.

## Target Users

- **Primary:** Classroom instructors delivering employability skills training
- **Secondary:** Students/learners interacting with the lessons
- **Stakeholders:** 6 content teams providing source material per lesson topic

## Core Features

- Single-file HTML lessons (portable, no infrastructure needed)
- WIPPEA-structured pedagogical flow (Warm-up, Introduction, Presentation, Evaluation, Application)
- Sidebar navigation with progress tracking
- Minimum 3 interactive elements per lesson (tabs, accordion, checkpoint prompt)
- Instructor prompt panels (hidden by default, toggle-able)
- Responsive across mobile (360x800), tablet (768x1024), desktop (1920x1080)
- SPOKES brand-compliant color system (11-color canonical palette)
- Combinatorial design system for lesson individuality (template variants, CSS textures, font pairings, accent emphasis, component mix, optional per-lesson effects)
- Video embeds (YouTube) or placeholders when URLs unavailable
- Downloadable handouts (PDF)

## Lesson Inventory (18 total)

### Complete (3)
1. Employee Accountability (`lesson-employee-accountability/index.html`)
2. Time Management (`lesson-time-management/index.html`)
3. Interview Skills (`lesson-interview-skills/index.html`)

### Remaining (15)
Topics TBD -- sourced from 6 content teams via content intake template.

## Success Metrics

- 18 lessons built and passing all 5 quality gates
- All lessons use canonical 11-color palette only
- Each lesson's fonts follow TYP-02: self-hosted, at most two per lesson
- Template variant distribution balanced (4-6 lessons per variant)
- WCAG 2.2 AA Phase 1 compliance on all lessons
- Zero horizontal scroll at any required viewport

## Milestones

- Phase 1 target: 6 lessons complete by June 15, 2026
- Program end target: All 18 lessons complete by June 15, 2027

## Current Status (as of 2026-03-09)

- 3 lessons built and release-approved (as of 2026-03-01)
- Template stabilization work completed
- SPOKES Builder design system documented, including combinatorics system
- Combinatorics design added: CSS background textures, accent emphasis variation, optional per-lesson effects (pointer tracking, parallax, text scramble, canvas particles)
- Content intake template ready for distribution
- Lesson registry (`lesson-registry.json`) tracking active with combinatorics fields
- Advanced components added to library (glass card, stagger reveal, gradient divider, clip-path reveals, magnetic button, scroll counter)
- **Awaiting:** Source materials from content teams for lessons 4-6
- **Remaining Phase 1 infrastructure:** Template variants CSS documentation, font pairing library
