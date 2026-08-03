# SPOKES Baseline Validation Report

> **SUPERSEDED (2026-08-03):** This report is a historical snapshot. The failures
> listed below have since been remediated — all 6 lessons currently pass the
> validator. Re-run `python3 scripts/validate-lesson.py <lesson>/index.html` for
> current results.

**Generated:** 2026-04-14
**Validator:** scripts/validate-lesson.py (SPOKES-STANDARD v1.0)
**Flag:** --caption-grace (A11Y-07 downgraded to WARN during caption production)

---

## lesson-communicating-with-the-public

```
SPOKES Lesson Validator v1.0
============================================================
[FAIL] ACC-01  A11Y-01: Tab component missing required ARIA attributes
[FAIL] ACC-02  A11Y-02: Accordion missing aria-expanded or aria-controls
[FAIL] ACC-03  A11Y-03: Danger card missing tabindex or aria-expanded/aria-pressed
[FAIL] ACC-04  A11Y-04: No skip-to-content link found
[FAIL] ACC-05  A11Y-05: No aria-live region found for slide announcements
[FAIL] ACC-06  A11Y-06: One or more videos missing aria-label
[WARN] ACC-07  A11Y-07: Only 0 caption track(s) for 8 video(s)
[FAIL] ACC-08  A11Y-08: Nav element missing aria-label
[PASS] ACC-09  A11Y-09: Navigation buttons use semantic <button> elements
[PASS] ACC-10  A11Y-10: No progress bars found (auto-pass)
[PASS] ACC-11  A11Y-11: All images have alt attributes
[FAIL] ACC-12  A11Y-12: Only 0 :focus-visible rules — need at least 6
[PASS] ACC-13  A11Y-13: html lang="en" set
[WARN] ACC-14  A11Y-14: Heading levels appear to skip (e.g. h1 to h3)
[PASS] ACC-15  A11Y-15: No empty links detected
[PASS] ACC-16  A11Y-16: Color-alone indicators check (heuristic pass)
[WARN] ACC-17  A11Y-17: Sidebar navigation may be missing ARIA attributes
[PASS] ACC-18  A11Y-18: Viewport meta tag present
[PASS] ACC-19  A11Y-19: Page has <title> element
[PASS] CLR-01  All 11 canonical palette variables present and correct
[PASS] CLR-02  No non-canonical hex colors outside :root
[PASS] CLR-03  No deprecated #c9a74a found
[PASS] CLR-04  rgba() usage is permitted
[FAIL] CLR-05  .gold text uses var(--gold) — should use var(--muted-gold) for contrast — line 642
[FAIL] CLR-06  .accent text uses var(--accent) — should use var(--dark) — line 641
[WARN] CLR-07  Hardcoded hex colors found in confetti script block
[PASS] CLR-08  No prohibited colors found
[PASS] ENG-01  Found 2 checkpoints/quizzes
[PASS] ENG-02  Post-video activity check (heuristic pass)
[WARN] ENG-03  Only 2 activity box(es) — consider adding more
[PASS] ENG-04  Interactive element ratio check (info)
[WARN] MOB-01  Danger card has :hover but no click handler found
[FAIL] MOB-02  Sidebar toggle size 36x36px — minimum is 44x44px — line 80
[PASS] MOB-03  No .nav-btn rule found (auto-pass)
[PASS] MOB-04  Touch feedback check (heuristic pass)
[PASS] NAV-01  Modern variable declarations (const/let) used
[FAIL] NAV-02  No .pause() call found — videos may continue on slide change
[FAIL] NAV-03  Missing focus management on navigation
[FAIL] NAV-04  No slide announcer found for screen readers
[PASS] NAV-05  View Transitions API integration found
[FAIL] NAV-06  No sessionStorage found — slide position not persisted
[WARN] NAV-07  No sessionStorage.getItem — slide restore may be missing
[PASS] NAV-08  No confetti feature (auto-pass)
[WARN] NAV-09  May be missing textarea/input guard in keydown handler
[WARN] NAV-10  Touch event passive option not detected
[PASS] NAV-11  switchTab function found
[PASS] NAV-12  toggleAccordion function found
[FAIL] PRF-01  One or more videos missing preload="none"
[PASS] PRF-02  Asset optimization check (info)
[PASS] PRF-03  Preconnect hints found
[PASS] RDM-01  prefers-reduced-motion media query found in CSS
[PASS] RDM-02  prefersReduced variable found in script
[PASS] RDM-03  Reduced motion guard for confetti found
[PASS] RDM-04  Sound functions respect reduced motion preference
[PASS] RDM-05  Confetti hidden in reduced motion mode
[PASS] RDM-06  View transitions respect reduced motion
[PASS] THM-01  Theme override style block present
[PASS] THM-02  Chapter scoping check (heuristic pass)
[PASS] THM-03  Chapter scoping check (heuristic pass)
[PASS] THM-04  Chapter scoping check (heuristic pass)
[PASS] THM-05  No dark theme (auto-pass)
[PASS] TYP-01  Font variables present with correct defaults
[PASS] TYP-02  No font overrides in :root block
[PASS] TYP-03  No hardcoded heading font outside :root
[PASS] TYP-04  No hardcoded body font outside :root
[WARN] TYP-05  Google Fonts link missing display=swap
============================================================
SUMMARY: 40 PASS | 10 WARN | 16 FAIL (CRITICAL)
```

## lesson-controlling-anger

```
SPOKES Lesson Validator v1.0
============================================================
[FAIL] ACC-01  A11Y-01: Tab component missing required ARIA attributes
[FAIL] ACC-02  A11Y-02: Accordion missing aria-expanded or aria-controls
[FAIL] ACC-03  A11Y-03: Danger card missing tabindex or aria-expanded/aria-pressed
[FAIL] ACC-04  A11Y-04: No skip-to-content link found
[FAIL] ACC-05  A11Y-05: No aria-live region found for slide announcements
[FAIL] ACC-06  A11Y-06: One or more videos missing aria-label
[WARN] ACC-07  A11Y-07: Only 0 caption track(s) for 4 video(s)
[FAIL] ACC-08  A11Y-08: Nav element missing aria-label
[PASS] ACC-09  A11Y-09: Navigation buttons use semantic <button> elements
[PASS] ACC-10  A11Y-10: No progress bars found (auto-pass)
[PASS] ACC-11  A11Y-11: All images have alt attributes
[FAIL] ACC-12  A11Y-12: Only 0 :focus-visible rules — need at least 6
[PASS] ACC-13  A11Y-13: html lang="en" set
[WARN] ACC-14  A11Y-14: Heading levels appear to skip (e.g. h1 to h3)
[PASS] ACC-15  A11Y-15: No empty links detected
[PASS] ACC-16  A11Y-16: Color-alone indicators check (heuristic pass)
[WARN] ACC-17  A11Y-17: Sidebar navigation may be missing ARIA attributes
[PASS] ACC-18  A11Y-18: Viewport meta tag present
[PASS] ACC-19  A11Y-19: Page has <title> element
[PASS] CLR-01  All 11 canonical palette variables present and correct
[PASS] CLR-02  No non-canonical hex colors outside :root
[PASS] CLR-03  No deprecated #c9a74a found
[PASS] CLR-04  rgba() usage is permitted
[FAIL] CLR-05  .gold text uses var(--gold) — should use var(--muted-gold) for contrast
[FAIL] CLR-06  .accent text uses var(--accent) — should use var(--dark)
[WARN] CLR-07  Hardcoded hex colors found in confetti script block
[PASS] CLR-08  No prohibited colors found
[PASS] ENG-01  Found 2 checkpoints/quizzes
[PASS] ENG-02  Post-video activity check (heuristic pass)
[WARN] ENG-03  Only 2 activity box(es) — consider adding more
[PASS] ENG-04  Interactive element ratio check (info)
[WARN] MOB-01  Danger card has :hover but no click handler found
[FAIL] MOB-02  Sidebar toggle size 36x36px — minimum is 44x44px — line 73
[PASS] MOB-03  No .nav-btn rule found (auto-pass)
[PASS] MOB-04  Touch feedback check (heuristic pass)
[PASS] NAV-01  Modern variable declarations (const/let) used
[FAIL] NAV-02  No .pause() call found — videos may continue on slide change
[FAIL] NAV-03  Missing focus management on navigation
[FAIL] NAV-04  No slide announcer found for screen readers
[PASS] NAV-05  View Transitions API integration found
[FAIL] NAV-06  No sessionStorage found — slide position not persisted
[WARN] NAV-07  No sessionStorage.getItem — slide restore may be missing
[PASS] NAV-08  No confetti feature (auto-pass)
[PASS] NAV-09  Keyboard navigation guards for text inputs present
[WARN] NAV-10  Touch event passive option not detected
[PASS] NAV-11  switchTab function found
[PASS] NAV-12  toggleAccordion function found
[FAIL] PRF-01  One or more videos missing preload="none"
[PASS] PRF-02  Asset optimization check (info)
[PASS] PRF-03  Preconnect hints found
[PASS] RDM-01  prefers-reduced-motion media query found in CSS
[PASS] RDM-02  prefersReduced variable found in script
[PASS] RDM-03  Reduced motion guard for confetti found
[PASS] RDM-04  Sound functions respect reduced motion preference
[PASS] RDM-05  Confetti hidden in reduced motion mode
[PASS] RDM-06  View transitions respect reduced motion
[PASS] THM-01  Theme override style block present
[PASS] THM-02  Chapter scoping check (heuristic pass)
[PASS] THM-03  Chapter scoping check (heuristic pass)
[PASS] THM-04  Chapter scoping check (heuristic pass)
[PASS] THM-05  No dark theme (auto-pass)
[WARN] TYP-01  Font variables present but defaults may be wrong
[FAIL] TYP-02  Font override in :root — move to theme-override: --font-heading uses "Vollkorn"; --font-body uses "Fira Sans" — line 36
[PASS] TYP-03  No hardcoded heading font outside :root
[PASS] TYP-04  No hardcoded body font outside :root
[WARN] TYP-05  Google Fonts link missing display=swap
============================================================
SUMMARY: 39 PASS | 10 WARN | 17 FAIL (CRITICAL)
```

## lesson-time-management

```
SPOKES Lesson Validator v1.0
============================================================
[PASS] ACC-01  A11Y-01: Tab ARIA roles and attributes present
[FAIL] ACC-02  A11Y-02: Accordion missing aria-expanded or aria-controls
[PASS] ACC-03  A11Y-03: Danger cards have tabindex and ARIA attributes
[FAIL] ACC-04  A11Y-04: No skip-to-content link found
[PASS] ACC-05  A11Y-05: Live region (aria-live) found
[FAIL] ACC-06  A11Y-06: One or more videos missing aria-label
[PASS] ACC-07  A11Y-07: All 5 video(s) have caption tracks
[PASS] ACC-08  A11Y-08: All nav elements have aria-label
[PASS] ACC-09  A11Y-09: Navigation buttons use semantic <button> elements
[PASS] ACC-10  A11Y-10: Progress bar has role and aria-valuenow
[PASS] ACC-11  A11Y-11: All images have alt attributes
[FAIL] ACC-12  A11Y-12: Only 0 :focus-visible rules — need at least 6
[PASS] ACC-13  A11Y-13: html lang="en" set
[WARN] ACC-14  A11Y-14: Heading levels appear to skip (e.g. h1 to h3)
[PASS] ACC-15  A11Y-15: No empty links detected
[PASS] ACC-16  A11Y-16: Color-alone indicators check (heuristic pass)
[PASS] ACC-17  A11Y-17: Sidebar navigation has proper ARIA
[PASS] ACC-18  A11Y-18: Viewport meta tag present
[PASS] ACC-19  A11Y-19: Page has <title> element
[PASS] CLR-01  All 11 canonical palette variables present and correct
[FAIL] CLR-02  Non-canonical hex colors outside :root: #c9a74a — line 998
[FAIL] CLR-03  Found deprecated color #c9a74a — use var(--muted-gold) instead — line 998
[PASS] CLR-04  rgba() usage is permitted
[PASS] CLR-05  .gold text correctly uses var(--muted-gold)
[FAIL] CLR-06  .accent text uses var(--accent) — should use var(--dark) — line 396
[PASS] CLR-07  No hardcoded confetti colors found
[PASS] CLR-08  No prohibited colors found
[PASS] ENG-01  Found 9 checkpoints/quizzes
[PASS] ENG-02  Post-video activity check (heuristic pass)
[PASS] ENG-03  Found 3 activity boxes
[PASS] ENG-04  Interactive element ratio check (info)
[PASS] MOB-01  Danger card has both hover and click support
[FAIL] MOB-02  Sidebar toggle size 36x36px — minimum is 44x44px — line 59
[PASS] MOB-03  No .nav-btn rule found (auto-pass)
[PASS] MOB-04  Touch feedback check (heuristic pass)
[PASS] NAV-01  Modern variable declarations (const/let) used
[PASS] NAV-02  Video pause on navigation detected
[FAIL] NAV-03  Missing focus management on navigation
[PASS] NAV-04  Slide announcer integration found
[WARN] NAV-05  No startViewTransition found — consider adding
[FAIL] NAV-06  No sessionStorage found — slide position not persisted
[WARN] NAV-07  No sessionStorage.getItem — slide restore may be missing
[PASS] NAV-08  No confetti feature (auto-pass)
[PASS] NAV-09  Keyboard navigation guards for text inputs present
[PASS] NAV-10  Touch events use passive listeners
[PASS] NAV-11  switchTab function found
[PASS] NAV-12  toggleAccordion function found
[FAIL] PRF-01  One or more videos missing preload="none"
[PASS] PRF-02  Asset optimization check (info)
[PASS] PRF-03  Preconnect hints found
[FAIL] RDM-01  No prefers-reduced-motion media query in CSS
[FAIL] RDM-02  No prefersReduced variable in script
[FAIL] RDM-03  Confetti function missing reduced motion check
[PASS] RDM-04  No sound functions (auto-pass)
[FAIL] RDM-05  Confetti not hidden in prefers-reduced-motion block
[PASS] RDM-06  No view transitions (auto-pass)
[PASS] THM-01  Theme override style block present
[PASS] THM-02  Chapter scoping check (heuristic pass)
[PASS] THM-03  Chapter scoping check (heuristic pass)
[PASS] THM-04  Chapter scoping check (heuristic pass)
[PASS] THM-05  No dark theme (auto-pass)
[FAIL] TYP-01  Missing font variables in :root: --font-heading, --font-body
[PASS] TYP-02  No font overrides in :root block
[WARN] TYP-03  Hardcoded 'DM Serif Display' found outside :root — use var(--font-heading)
[WARN] TYP-04  Hardcoded 'Outfit' found outside :root — use var(--font-body)
[WARN] TYP-05  Google Fonts link missing display=swap
============================================================
SUMMARY: 44 PASS | 6 WARN | 16 FAIL (CRITICAL)
```

## lesson-employee-accountability

```
SPOKES Lesson Validator v1.0
============================================================
[PASS] ACC-01  A11Y-01: Tab ARIA roles and attributes present
[PASS] ACC-02  A11Y-02: Accordion ARIA attributes present
[PASS] ACC-03  A11Y-03: Danger cards have tabindex and ARIA attributes
[FAIL] ACC-04  A11Y-04: No skip-to-content link found
[PASS] ACC-05  A11Y-05: Live region (aria-live) found
[PASS] ACC-06  A11Y-06: No videos found (auto-pass)
[PASS] ACC-07  A11Y-07: No videos — captions check auto-pass
[PASS] ACC-08  A11Y-08: All nav elements have aria-label
[PASS] ACC-09  A11Y-09: Navigation buttons use semantic <button> elements
[PASS] ACC-10  A11Y-10: Progress bar has role and aria-valuenow
[PASS] ACC-11  A11Y-11: All images have alt attributes
[PASS] ACC-12  A11Y-12: Found 8 :focus-visible rules (>= 6)
[PASS] ACC-13  A11Y-13: html lang="en" set
[WARN] ACC-14  A11Y-14: Heading levels appear to skip (e.g. h1 to h3)
[PASS] ACC-15  A11Y-15: No empty links detected
[PASS] ACC-16  A11Y-16: Color-alone indicators check (heuristic pass)
[PASS] ACC-17  A11Y-17: Sidebar navigation has proper ARIA
[PASS] ACC-18  A11Y-18: Viewport meta tag present
[PASS] ACC-19  A11Y-19: Page has <title> element
[PASS] CLR-01  All 11 canonical palette variables present and correct
[PASS] CLR-02  No non-canonical hex colors outside :root
[PASS] CLR-03  No deprecated #c9a74a found
[PASS] CLR-04  rgba() usage is permitted
[FAIL] CLR-05  .gold text uses var(--gold) — should use var(--muted-gold) for contrast — line 580
[FAIL] CLR-06  .accent text uses var(--accent) — should use var(--dark)
[WARN] CLR-07  Hardcoded hex colors found in confetti script block
[PASS] CLR-08  No prohibited colors found
[PASS] ENG-01  Found 7 checkpoints/quizzes
[PASS] ENG-02  Post-video activity check (heuristic pass)
[PASS] ENG-03  Found 4 activity boxes
[PASS] ENG-04  Interactive element ratio check (info)
[PASS] MOB-01  Danger card has both hover and click support
[FAIL] MOB-02  Sidebar toggle size 36x36px — minimum is 44x44px — line 71
[PASS] MOB-03  No .nav-btn rule found (auto-pass)
[PASS] MOB-04  Touch feedback check (heuristic pass)
[PASS] NAV-01  Modern variable declarations (const/let) used
[FAIL] NAV-02  No .pause() call found — videos may continue on slide change
[PASS] NAV-03  Focus management (activeElement/blur) present
[PASS] NAV-04  Slide announcer integration found
[WARN] NAV-05  No startViewTransition found — consider adding
[FAIL] NAV-06  No sessionStorage found — slide position not persisted
[WARN] NAV-07  No sessionStorage.getItem — slide restore may be missing
[PASS] NAV-08  Confetti trigger guard present
[PASS] NAV-09  Keyboard navigation guards for text inputs present
[WARN] NAV-10  Touch event passive option not detected
[PASS] NAV-11  No tab switching needed (auto-pass)
[PASS] NAV-12  toggleAccordion function found
[PASS] PRF-01  No videos — preload check auto-pass
[PASS] PRF-02  Asset optimization check (info)
[PASS] PRF-03  Preconnect hints found
[PASS] RDM-01  prefers-reduced-motion media query found in CSS
[FAIL] RDM-02  No prefersReduced variable in script
[FAIL] RDM-03  Confetti function missing reduced motion check
[FAIL] RDM-04  Sound functions missing reduced motion check
[FAIL] RDM-05  Confetti not hidden in prefers-reduced-motion block
[PASS] RDM-06  No view transitions (auto-pass)
[PASS] THM-01  Theme override style block present
[PASS] THM-02  Chapter scoping check (heuristic pass)
[PASS] THM-03  Chapter scoping check (heuristic pass)
[PASS] THM-04  Chapter scoping check (heuristic pass)
[PASS] THM-05  No dark theme (auto-pass)
[FAIL] TYP-01  Missing font variables in :root: --font-heading, --font-body
[PASS] TYP-02  No font overrides in :root block
[WARN] TYP-03  Hardcoded 'DM Serif Display' found outside :root — use var(--font-heading)
[WARN] TYP-04  Hardcoded 'Outfit' found outside :root — use var(--font-body)
[WARN] TYP-05  Google Fonts link missing display=swap
============================================================
SUMMARY: 47 PASS | 8 WARN | 11 FAIL (CRITICAL)
```

## lesson-interview-skills

```
SPOKES Lesson Validator v1.0
============================================================
[PASS] ACC-01  A11Y-01: No tab components found (auto-pass)
[PASS] ACC-02  A11Y-02: Accordion ARIA attributes present
[FAIL] ACC-03  A11Y-03: Danger card missing tabindex or aria-expanded/aria-pressed
[PASS] ACC-04  A11Y-04: Skip link present
[PASS] ACC-05  A11Y-05: Live region (aria-live) found
[PASS] ACC-06  A11Y-06: All videos have aria-label
[WARN] ACC-07  A11Y-07: Only 0 caption track(s) for 2 video(s)
[PASS] ACC-08  A11Y-08: All nav elements have aria-label
[PASS] ACC-09  A11Y-09: Navigation buttons use semantic <button> elements
[PASS] ACC-10  A11Y-10: Progress bar has role and aria-valuenow
[PASS] ACC-11  A11Y-11: All images have alt attributes
[PASS] ACC-12  A11Y-12: Found 6 :focus-visible rules (>= 6)
[PASS] ACC-13  A11Y-13: html lang="en" set
[WARN] ACC-14  A11Y-14: Heading levels appear to skip (e.g. h1 to h3)
[PASS] ACC-15  A11Y-15: No empty links detected
[PASS] ACC-16  A11Y-16: Color-alone indicators check (heuristic pass)
[PASS] ACC-17  A11Y-17: Sidebar navigation has proper ARIA
[PASS] ACC-18  A11Y-18: Viewport meta tag present
[PASS] ACC-19  A11Y-19: Page has <title> element
[PASS] CLR-01  All 11 canonical palette variables present and correct
[PASS] CLR-02  No non-canonical hex colors outside :root
[PASS] CLR-03  No deprecated #c9a74a found
[PASS] CLR-04  rgba() usage is permitted
[PASS] CLR-05  .gold text correctly uses var(--muted-gold)
[FAIL] CLR-06  .accent text uses var(--accent) — should use var(--dark)
[WARN] CLR-07  Hardcoded hex colors found in confetti script block
[PASS] CLR-08  No prohibited colors found
[WARN] ENG-01  Only 0 checkpoint(s) — consider adding more
[PASS] ENG-02  Post-video activity check (heuristic pass)
[PASS] ENG-03  Found 4 activity boxes
[PASS] ENG-04  Interactive element ratio check (info)
[PASS] MOB-01  Danger card has both hover and click support
[FAIL] MOB-02  Sidebar toggle size 36x36px — minimum is 44x44px — line 70
[PASS] MOB-03  No .nav-btn rule found (auto-pass)
[PASS] MOB-04  Touch feedback check (heuristic pass)
[PASS] NAV-01  Modern variable declarations (const/let) used
[PASS] NAV-02  Video pause on navigation detected
[FAIL] NAV-03  Missing focus management on navigation
[PASS] NAV-04  Slide announcer integration found
[WARN] NAV-05  No startViewTransition found — consider adding
[FAIL] NAV-06  No sessionStorage found — slide position not persisted
[WARN] NAV-07  No sessionStorage.getItem — slide restore may be missing
[PASS] NAV-08  No confetti feature (auto-pass)
[PASS] NAV-09  Keyboard navigation guards for text inputs present
[WARN] NAV-10  Touch event passive option not detected
[PASS] NAV-11  No tab switching needed (auto-pass)
[PASS] NAV-12  No accordion toggling needed (auto-pass)
[FAIL] PRF-01  One or more videos missing preload="none"
[PASS] PRF-02  Asset optimization check (info)
[PASS] PRF-03  Preconnect hints found
[PASS] RDM-01  prefers-reduced-motion media query found in CSS
[PASS] RDM-02  prefersReduced variable found in script
[PASS] RDM-03  Reduced motion guard for confetti found
[PASS] RDM-04  Sound functions respect reduced motion preference
[FAIL] RDM-05  Confetti not hidden in prefers-reduced-motion block
[PASS] RDM-06  No view transitions (auto-pass)
[PASS] THM-01  Theme override style block present
[PASS] THM-02  Chapter scoping check (heuristic pass)
[PASS] THM-03  Chapter scoping check (heuristic pass)
[PASS] THM-04  Chapter scoping check (heuristic pass)
[PASS] THM-05  No dark theme (auto-pass)
[FAIL] TYP-01  Missing font variables in :root: --font-heading, --font-body
[PASS] TYP-02  No font overrides in :root block
[WARN] TYP-03  Hardcoded 'DM Serif Display' found outside :root — use var(--font-heading)
[WARN] TYP-04  Hardcoded 'Outfit' found outside :root — use var(--font-body)
[WARN] TYP-05  Google Fonts link missing display=swap
============================================================
SUMMARY: 48 PASS | 10 WARN | 8 FAIL (CRITICAL)
```

## lesson-problem-solving-and-decision-making

```
SPOKES Lesson Validator v1.0
============================================================
[FAIL] ACC-01  A11Y-01: Tab component missing required ARIA attributes
[PASS] ACC-02  A11Y-02: No accordion components found (auto-pass)
[FAIL] ACC-03  A11Y-03: Danger card missing tabindex or aria-expanded/aria-pressed
[FAIL] ACC-04  A11Y-04: No skip-to-content link found
[FAIL] ACC-05  A11Y-05: No aria-live region found for slide announcements
[FAIL] ACC-06  A11Y-06: One or more videos missing aria-label
[WARN] ACC-07  A11Y-07: Only 0 caption track(s) for 4 video(s)
[FAIL] ACC-08  A11Y-08: Nav element missing aria-label
[PASS] ACC-09  A11Y-09: Navigation buttons use semantic <button> elements
[PASS] ACC-10  A11Y-10: No progress bars found (auto-pass)
[PASS] ACC-11  A11Y-11: All images have alt attributes
[FAIL] ACC-12  A11Y-12: Only 0 :focus-visible rules — need at least 6
[PASS] ACC-13  A11Y-13: html lang="en" set
[WARN] ACC-14  A11Y-14: Heading levels appear to skip (e.g. h1 to h3)
[PASS] ACC-15  A11Y-15: No empty links detected
[PASS] ACC-16  A11Y-16: Color-alone indicators check (heuristic pass)
[WARN] ACC-17  A11Y-17: Sidebar navigation may be missing ARIA attributes
[PASS] ACC-18  A11Y-18: Viewport meta tag present
[PASS] ACC-19  A11Y-19: Page has <title> element
[PASS] CLR-01  All 11 canonical palette variables present and correct
[PASS] CLR-02  No non-canonical hex colors outside :root
[PASS] CLR-03  No deprecated #c9a74a found
[PASS] CLR-04  rgba() usage is permitted
[FAIL] CLR-05  .gold text uses var(--gold) — should use var(--muted-gold) for contrast
[FAIL] CLR-06  .accent text uses var(--accent) — should use var(--dark)
[WARN] CLR-07  Hardcoded hex colors found in confetti script block
[PASS] CLR-08  No prohibited colors found
[PASS] ENG-01  Found 22 checkpoints/quizzes
[PASS] ENG-02  Post-video activity check (heuristic pass)
[WARN] ENG-03  Only 2 activity box(es) — consider adding more
[PASS] ENG-04  Interactive element ratio check (info)
[WARN] MOB-01  Danger card has :hover but no click handler found
[FAIL] MOB-02  Sidebar toggle size 36x36px — minimum is 44x44px — line 73
[PASS] MOB-03  No .nav-btn rule found (auto-pass)
[PASS] MOB-04  Touch feedback check (heuristic pass)
[PASS] NAV-01  Modern variable declarations (const/let) used
[FAIL] NAV-02  No .pause() call found — videos may continue on slide change
[FAIL] NAV-03  Missing focus management on navigation
[FAIL] NAV-04  No slide announcer found for screen readers
[PASS] NAV-05  View Transitions API integration found
[FAIL] NAV-06  No sessionStorage found — slide position not persisted
[WARN] NAV-07  No sessionStorage.getItem — slide restore may be missing
[PASS] NAV-08  No confetti feature (auto-pass)
[PASS] NAV-09  Keyboard navigation guards for text inputs present
[WARN] NAV-10  Touch event passive option not detected
[PASS] NAV-11  switchTab function found
[PASS] NAV-12  toggleAccordion function found
[FAIL] PRF-01  One or more videos missing preload="none"
[PASS] PRF-02  Asset optimization check (info)
[PASS] PRF-03  Preconnect hints found
[PASS] RDM-01  prefers-reduced-motion media query found in CSS
[PASS] RDM-02  prefersReduced variable found in script
[PASS] RDM-03  Reduced motion guard for confetti found
[PASS] RDM-04  Sound functions respect reduced motion preference
[PASS] RDM-05  Confetti hidden in reduced motion mode
[PASS] RDM-06  View transitions respect reduced motion
[PASS] THM-01  Theme override style block present
[PASS] THM-02  Chapter scoping check (heuristic pass)
[PASS] THM-03  Chapter scoping check (heuristic pass)
[PASS] THM-04  Chapter scoping check (heuristic pass)
[PASS] THM-05  No dark theme (auto-pass)
[PASS] TYP-01  Font variables present with correct defaults
[PASS] TYP-02  No font overrides in :root block
[PASS] TYP-03  No hardcoded heading font outside :root
[PASS] TYP-04  No hardcoded body font outside :root
[WARN] TYP-05  Google Fonts link missing display=swap
============================================================
SUMMARY: 42 PASS | 9 WARN | 15 FAIL (CRITICAL)
```

## Summary

| Lesson | PASS | WARN | FAIL |
|--------|------|------|------|
| lesson-communicating-with-the-public | 40 | 10 | 16 |
| lesson-controlling-anger | 39 | 10 | 17 |
| lesson-time-management | 44 | 6 | 16 |
| lesson-employee-accountability | 47 | 8 | 11 |
| lesson-interview-skills | 48 | 10 | 8 |
| lesson-problem-solving-and-decision-making | 42 | 9 | 15 |
| **TOTAL** | **260** | **53** | **83** |
