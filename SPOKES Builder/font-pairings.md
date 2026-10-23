# SPOKES Font Pairing Library

**Purpose:** Curated pairings to start from. Any self-hosted family may be used (TYP-02), and sharing a pairing with another lesson is fine.

**Last updated:** 2026-04-02

---

## How to Use

1. Check the **Assignment Tracker** at the bottom to see what's taken
2. Choose a pairing that fits the lesson's tone (see mood tags)
3. Update the Assignment Tracker and `lesson-registry.json`

## Font Import Pattern

```html
<!-- Default fonts (always keep) -->
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<!-- Lesson-specific fonts -->
<link href="https://fonts.googleapis.com/css2?family=HEADING_FONT:wght@400;600;700&family=BODY_FONT:wght@400;500;600&display=swap" rel="stylesheet">
```

## Theme Override Pattern

```css
<style id="theme-override">
  body { font-family: 'BODY_FONT', sans-serif; }
  .slide-title h1, .slide h2, .slide h3, .card h4,
  .smart-content h4, .matrix-action, .slide-section h2 {
    font-family: 'HEADING_FONT', serif;
  }
</style>
```

---

## Pairings

### 1. DM Serif Display + Outfit *(Default)*

- **Mood:** Clean, modern, professional
- **Heading:** `'DM Serif Display', serif` — elegant serif with presence
- **Body:** `'Outfit', sans-serif` — geometric, highly readable
- **Import:** Already in template
- **Status:** ASSIGNED — Time Management, Employee Accountability

---

### 2. Playfair Display + Inter

- **Mood:** Elegant, boardroom, sophisticated
- **Heading:** `'Playfair Display', serif` — high-contrast transitional serif
- **Body:** `'Inter', sans-serif` — optimized for screens, very neutral
- **Import:** `family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600`
- **Status:** ASSIGNED — Interview Skills

---

### 3. Merriweather + Source Sans 3

- **Mood:** Trustworthy, warm, educational
- **Heading:** `'Merriweather', serif` — sturdy slab-influenced serif, reads well at large sizes
- **Body:** `'Source Sans 3', sans-serif` — Adobe's open workhorse, crisp at all sizes
- **Import:** `family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@400;500;600`
- **Status:** Available

---

### 4. Lora + Nunito

- **Mood:** Approachable, friendly, inviting
- **Heading:** `'Lora', serif` — calligraphic curves, contemporary feel
- **Body:** `'Nunito', sans-serif` — rounded terminals, soft and welcoming
- **Import:** `family=Lora:wght@400;600;700&family=Nunito:wght@400;500;600;700`
- **Status:** Available

---

### 5. Libre Baskerville + Karla

- **Mood:** Classic, literary, confident
- **Heading:** `'Libre Baskerville', serif` — web-optimized Baskerville, timeless
- **Body:** `'Karla', sans-serif` — grotesque with character, compact
- **Import:** `family=Libre+Baskerville:wght@400;700&family=Karla:wght@400;500;600;700`
- **Status:** Available

---

### 6. Bitter + Raleway

- **Mood:** Strong, structured, no-nonsense
- **Heading:** `'Bitter', serif` — slab serif designed for comfortable reading
- **Body:** `'Raleway', sans-serif` — elegant thin-to-bold weight range
- **Import:** `family=Bitter:wght@400;600;700&family=Raleway:wght@400;500;600`
- **Status:** ASSIGNED — Problem Solving & Decision Making

---

### 7. Crimson Pro + Work Sans

- **Mood:** Scholarly, refined, purposeful
- **Heading:** `'Crimson Pro', serif` — old-style proportions, reading-optimized
- **Body:** `'Work Sans', sans-serif` — grounded, wide, excellent for UI
- **Import:** `family=Crimson+Pro:wght@400;600;700&family=Work+Sans:wght@400;500;600`
- **Status:** ASSIGNED — Communicating with the Public

---

### 8. Josefin Slab + Josefin Sans

- **Mood:** Geometric, retro-modern, distinctive
- **Heading:** `'Josefin Slab', serif` — geometric slab, art deco undertones
- **Body:** `'Josefin Sans', sans-serif` — matched geometric sans, elegant
- **Import:** `family=Josefin+Slab:wght@400;600;700&family=Josefin+Sans:wght@400;500;600`
- **Status:** Available

---

### 9. Spectral + Rubik

- **Mood:** Modern editorial, tech-forward
- **Heading:** `'Spectral', serif` — designed for long-form digital reading
- **Body:** `'Rubik', sans-serif` — rounded, friendly, slightly playful
- **Import:** `family=Spectral:wght@400;600;700&family=Rubik:wght@400;500;600`
- **Status:** Available

---

### 10. Vollkorn + Fira Sans

- **Mood:** Robust, German engineering, functional
- **Heading:** `'Vollkorn', serif` — dark, sturdy, compact at large sizes
- **Body:** `'Fira Sans', sans-serif` — Mozilla's open type family, highly legible
- **Import:** `family=Vollkorn:wght@400;600;700&family=Fira+Sans:wght@400;500;600`
- **Status:** ASSIGNED — Controlling Anger

---

### 11. Cormorant Garamond + Mulish

- **Mood:** Luxurious, editorial, high-end
- **Heading:** `'Cormorant Garamond', serif` — display Garamond, dramatic at large sizes
- **Body:** `'Mulish', sans-serif` — geometric, minimal, unobtrusive
- **Import:** `family=Cormorant+Garamond:wght@400;600;700&family=Mulish:wght@400;500;600`
- **Status:** Available

---

### 12. Fraunces + Commissioner

- **Mood:** Bold, playful-professional, contemporary
- **Heading:** `'Fraunces', serif` — variable "wonky" old-style, attention-grabbing
- **Body:** `'Commissioner', sans-serif` — geometric, variable, wide weight range
- **Import:** `family=Fraunces:wght@400;600;700&family=Commissioner:wght@400;500;600`
- **Status:** Available

---

### 13. Noto Serif + Noto Sans

- **Mood:** Universal, inclusive, dependable
- **Heading:** `'Noto Serif', serif` — Google's universal coverage serif
- **Body:** `'Noto Sans', sans-serif` — matched sans, ultra-reliable rendering
- **Import:** `family=Noto+Serif:wght@400;600;700&family=Noto+Sans:wght@400;500;600`
- **Status:** Available

---

### 14. Alegreya + Alegreya Sans

- **Mood:** Literary, humanist, flowing
- **Heading:** `'Alegreya', serif` — calligraphic, dynamic, award-winning
- **Body:** `'Alegreya Sans', sans-serif` — humanist companion, warm
- **Import:** `family=Alegreya:wght@400;600;700&family=Alegreya+Sans:wght@400;500;600`
- **Status:** Available

---

### 15. Zilla Slab + IBM Plex Sans

- **Mood:** Technical, authoritative, modern
- **Heading:** `'Zilla Slab', serif` — Mozilla's slab serif, strong presence
- **Body:** `'IBM Plex Sans', sans-serif` — corporate precision, excellent x-height
- **Import:** `family=Zilla+Slab:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600`
- **Status:** Available

---

### 16. Cardo + Poppins

- **Mood:** Academic meets modern, warm contrast
- **Heading:** `'Cardo', serif` — scholar's serif, generous proportions
- **Body:** `'Poppins', sans-serif` — geometric, clean, popular
- **Import:** `family=Cardo:wght@400;700&family=Poppins:wght@400;500;600`
- **Status:** Available

---

### 17. Eczar + Jost

- **Mood:** Bold, striking, contemporary
- **Heading:** `'Eczar', serif` — high-contrast Devanagari-inspired Latin, impactful
- **Body:** `'Jost', sans-serif` — Futura-inspired geometric, clean
- **Import:** `family=Eczar:wght@400;600;700&family=Jost:wght@400;500;600`
- **Status:** Available

---

### 18. Neuton + Open Sans

- **Mood:** Clean, neutral, professional
- **Heading:** `'Neuton', serif` — thin, graceful, light modern serif
- **Body:** `'Open Sans', sans-serif` — the universal web sans-serif
- **Import:** `family=Neuton:wght@400;700&family=Open+Sans:wght@400;500;600`
- **Status:** Available

---

### 19. Rokkitt + Lato

- **Mood:** Sturdy, grounded, straightforward
- **Heading:** `'Rokkitt', serif` — friendly slab serif, wide proportions
- **Body:** `'Lato', sans-serif` — warm, humanist, excellent readability
- **Import:** `family=Rokkitt:wght@400;600;700&family=Lato:wght@400;500;600`
- **Status:** Available

---

### 20. Sora + DM Sans

- **Mood:** Tech, futuristic, minimal *(sans + sans pairing)*
- **Heading:** `'Sora', sans-serif` — geometric, wide, modern display sans
- **Body:** `'DM Sans', sans-serif` — low-contrast geometric, pairs well
- **Import:** `family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600`
- **Note:** Both sans-serif — use when a serif heading doesn't fit the lesson tone
- **Status:** Available

---

## Assignment Tracker

| # | Pairing | Lesson | Approved |
|---|---------|--------|----------|
| 1 | DM Serif Display + Outfit | Time Management | Yes (default) |
| 1 | DM Serif Display + Outfit | Employee Accountability | Yes (default) |
| 2 | Playfair Display + Inter | Interview Skills | Yes |
| 7 | Crimson Pro + Work Sans | Communicating with the Public | Yes (2026-04-02) |
| 10 | Vollkorn + Fira Sans | Controlling Anger | Yes (2026-04-02) |
| 6 | Bitter + Raleway | Problem Solving & Decision Making | Yes (2026-04-09) |

**Available:** 16 pairings remaining for 13 lessons to build.
