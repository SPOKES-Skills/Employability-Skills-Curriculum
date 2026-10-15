> **Card styling note:** Component HTML patterns below are the same regardless of card style. Visual differences (border-radius, shadows, backgrounds) are applied via the `<style id="theme-override">` block using `[data-chapter="N"]` scoped CSS from `theme-library.css`. Do not add card-style-specific classes or inline styles to component HTML.

# SPOKES Component Library Reference

This document defines every slide type and content component available in the SPOKES presentation system. Use it as a copy-paste reference when building slides.

---

## Slide Types

## When printed

Print slides prints a picture of every slide. Each component prints as content (the same in both versions) or as an answer (Teacher copy only). A new click-to-show component needs a row here and a matching rule in `scripts/capture-print-slides.mjs` before it ships.

| Component | When printed |
|---|---|
| `slide-title`, `slide-section`, `big-statement`, standard content slide | Content. Prints as on screen. |
| `slide-video` | Left out. To keep the slide's text, add its number to `keepVideoSlides`; each player prints as a "Video: [caption]" box. |
| `slide-closing` | Content. Prints without confetti. |
| `cards-grid`, `takeaways`, `smart-stack`, `matrix-grid`, `areas-grid`, `split-layout`, `activity-box`, `content-list` | Content. Prints as on screen. |
| `dangers-grid` flip cards | Content. Two pictures: every card front, then every card back. |
| `download-resource` | Content. Prints as on screen; the button is not a link on paper. |
| Tabs, `tab-btn` / `tab-panel` | Content. One picture per tab. A tab whose panel id is in `teacherOnlyTabs` is an answer. |
| Accordions | Content. All sections open in one picture, or one picture per section when that would print below 75% scale. |
| Carousel, `carousel-card` | Content. One picture per card. |
| Quiz and checkpoint answers (`checkQuiz(this, true)`, `checkAnswer(this, true)`, `data-correct="true"`, `quiz-reveal-btn`, `revealMatchingAnswers`) | Answer. Student workbook shows the question unanswered; Teacher copy shows the answer and feedback. |
| Write-in `textarea` | Content. Prints as blank ruled lines. |
| Glass card, animated gradient divider, clip-path shape reveal, magnetic button | Content. Prints in its finished state. |
| Staggered grid reveal, scroll-triggered counter | Content. Prints in its finished state; check the picture shows every item and the final number. |

### 1. `slide-title` — Opening Title Slide

**When to use:** Always the first slide. One per presentation.

```html
<section class="slide slide-title active" data-chapter="1">
  <img src="SPOKES-Logo.png" alt="SPOKES" class="logo" />
  <h1>Lesson Title</h1>
  <div class="divider"></div>
  <p class="subtitle">Subtitle Text</p>
  <p class="copyright">Copyright &copy; 2026 WV Adult Basic Education</p>
</section>
```

**Notes:** Always include `active` class on this slide only. Logo drops in, title zooms, divider expands, subtitle fades up.

---

### 2. `slide-section` — Chapter Divider

**When to use:** First slide of every chapter (7 total, one per WIPPEA stage).

```html
<section class="slide slide-section" data-chapter="3" data-chapter-num="P1">
  <div class="section-circle">
    <img
      src="images/{{chapter-image}}"
      alt="{{image description}}"
      loading="lazy"
    />
  </div>
  <p class="chapter-label">Presentation</p>
  <h2>Chapter Title</h2>
  <div class="divider"></div>
</section>
```

**Section circle image (REQUIRED):** Every section divider must include a `.section-circle` with a relevant `<img>` inside. The image should visually relate to the chapter topic. Images go in the `images/` folder. The circle is positioned at the left side of the slide with a gold border and scale-in animation.

**`data-chapter-num` values and their meanings:**
| Value | WIPPEA Stage | Chapter Label Text |
|-------|-------------|-------------------|
| `W` | Warm-Up | `Warm-Up` |
| `I` | Introduction | `Introduction` |
| `P1` | Presentation 1 | `Presentation` |
| `P2` | Presentation 2 | `Presentation` |
| `P3` | Presentation 3 | `Presentation` |
| `E` | Evaluation | `Evaluation` |
| `A` | Application | `Application` |

Each value gets a unique gradient background and a giant watermark letter.

---

### 3. `slide-video` — Video Slide (Placeholder)

**When to use:** After a content slide that introduces a video topic. Use the placeholder layout until video links are provided by the curriculum designer.

**Placeholder version (use this by default):**

```html
<section class="slide slide-video" data-chapter="3">
  <h2>Watch: Video Title</h2>
  <div class="video-container">
    <div class="video-placeholder">
      <div class="video-placeholder-icon">&#9654;</div>
      <p class="video-placeholder-title">Video Title</p>
      <p class="video-placeholder-note">Video will be added</p>
    </div>
  </div>
</section>
```

**With local video file (downloaded to project's `videos/` folder):**

```html
<section class="slide slide-video" data-chapter="3">
  <h2>Watch: Video Title</h2>
  <div
    class="video-container"
    style="position:relative; width:100%; max-width:900px; margin:0 auto;"
  >
    <video
      controls
      class="local-video"
      style="width:100%; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.15);"
      poster="videos/poster-image-name.jpg"
    >
      <source src="videos/video-file-name.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  </div>
</section>
```

**Notes:** Always prefix the h2 with "Watch: ". All videos must be downloaded and stored locally in the `videos/` subdirectory of the project. Do not use external iframe embeds like YouTube to prevent broken links when videos are taken down. The video placeholder CSS must be included in the `<style id="theme-override">` block (see `AGENT_THEMING_GUIDELINES.md`).

---

### 4. `big-statement` — Impact Statement

**When to use:** Key takeaways, transitions between topics, or inspirational quotes. Keep text short (1-2 sentences).

```html
<section class="slide big-statement" data-chapter="2">
  <h2>
    The main message with <span class="accent">highlighted words</span> and
    <span class="gold">gold emphasis</span>
  </h2>
</section>
```

**With subtitle:**

```html
<section class="slide big-statement" data-chapter="3">
  <h2>Main statement...<br /><span class="accent">Call to action?</span></h2>
  <p style="font-size: 1.5rem; margin-top: 2rem;">
    Supporting text with <span class="gold">color</span>.
  </p>
</section>
```

**Notes:** Text renders at 4.5rem, centered, max-width 900px. Use sparingly (2-4 per lesson).

---

### 5. Standard Content Slide

**When to use:** All regular slides. Gets a light gradient background automatically.

```html
<section class="slide" data-chapter="3">
  <h2>Slide Title</h2>
  <!-- Content components go here (see below) -->
</section>
```

**Optional subtitle pattern:**

```html
<p
  style="font-size: 1.4rem; color: var(--gray); margin-top: -1.5rem; margin-bottom: 2rem;"
>
  Subtitle text
</p>
```

---

### 6. `slide-closing` — Final Celebration Slide

**When to use:** Always the last slide. One per presentation. Triggers confetti and success sound.

```html
<section class="slide slide-closing" data-chapter="7" id="closingSlide">
  <div class="confetti-container" id="confettiContainer"></div>
  <div class="closing-box">
    <h3 style="color: var(--gold); font-size: 1.5rem; margin-bottom: 1.5rem;">
      Congratulations, you have completed this lesson!
    </h3>
    <p>"Inspirational quote related to lesson topic."</p>
    <div class="divider"></div>
    <h2>Closing Statement</h2>
  </div>
</section>
```

**Notes:** Must have `id="closingSlide"` and `id="confettiContainer"`. JS auto-triggers confetti and a 3-note success chord (C-E-G).

---

## Content Components

### 1. `cards-grid` — 2-Column Info Cards

**When to use:** Comparing 2-6 related concepts, listing categories, or breaking down a topic into parts.

```html
<div class="cards-grid">
  <div class="card">
    <h4>Card Title</h4>
    <p>Description text</p>
  </div>
  <div class="card gold-border">
    <h4>Card Title</h4>
    <p>Description text</p>
  </div>
  <!-- Alternate: card, card gold-border, card gold-border, card -->
</div>
```

**Variants:**

- `.card` — green left border (default)
- `.card.gold-border` — gold left border

**Guidelines:** Use 2, 4, or 6 cards for balanced 2-column layout. Alternate green/gold borders for visual variety.

---

### 2. `takeaways` — Numbered Steps/Items

**When to use:** Step-by-step instructions, discussion questions, reflection prompts, ordered lists.

```html
<div class="takeaways">
  <div class="takeaway-item">
    <div class="takeaway-num">1</div>
    <p>First item with <strong>bold emphasis</strong></p>
  </div>
  <div class="takeaway-item">
    <div class="takeaway-num alt">2</div>
    <p>Second item with <span class="accent">colored text</span></p>
  </div>
  <div class="takeaway-item">
    <div class="takeaway-num">3</div>
    <p>Third item</p>
  </div>
</div>
```

**Variants:**

- `.takeaway-num` — blue circle (default)
- `.takeaway-num.alt` — gold circle

**Guidelines:** Use 3-6 items. Alternate blue/gold for visual rhythm. Numbers animate in with a spring bounce.

---

### 3. `smart-stack` — Letter + Content Rows

**When to use:** Acronyms (SMART, FOCUS, etc.), letter-keyed definitions, any content where each row starts with a single character.

```html
<div class="smart-stack">
  <div class="smart-row">
    <div class="smart-letter">S</div>
    <div class="smart-content">
      <h4>Specific</h4>
      <p>What exactly will I accomplish?</p>
    </div>
  </div>
  <div class="smart-row">
    <div class="smart-letter alt">M</div>
    <div class="smart-content">
      <h4>Measurable</h4>
      <p>How will I track my progress?</p>
    </div>
  </div>
  <!-- Continue for each letter -->
</div>
```

**Variants:**

- `.smart-letter` — blue square (default)
- `.smart-letter.alt` — gold square

**Guidelines:** Best with 3-7 rows. Alternate blue/gold. Each row animates in with staggered delay.

---

### 4. `matrix-grid` — 2x2 Decision Matrix

**When to use:** Exactly 4 items in a quadrant layout (e.g., Eisenhower Matrix, priority grids, comparison tables).

```html
<div class="matrix-grid">
  <div class="matrix-cell do-first">
    <span class="matrix-label">Label (e.g., Urgent + Important)</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
  <div class="matrix-cell schedule">
    <span class="matrix-label">Label</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
  <div class="matrix-cell delegate">
    <span class="matrix-label">Label</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
  <div class="matrix-cell eliminate">
    <span class="matrix-label">Label</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
</div>
```

**Cell classes (exactly 4, in order):**
| Class | Color | Purpose |
|-------|-------|---------|
| `.do-first` | Blue (--primary) | Top-left, highest priority |
| `.schedule` | Green (--accent) | Top-right, important but not urgent |
| `.delegate` | Gold (--gold) | Bottom-left, urgent but less important |
| `.eliminate` | Muted gray | Bottom-right, lowest priority |

**Guidelines:** Always exactly 4 cells. Keep labels short (3-4 words), action words to 1-2 words, descriptions to ~5 words.

---

### 5. `dangers-grid` — 3D Flip Cards

**When to use:** Overview of 4-6 related dangers, myths, challenges, or concepts. Each card reveals more detail on hover.

```html
<div class="dangers-grid">
  <div class="danger-card">
    <div class="danger-card-inner">
      <div class="danger-card-front">
        <div class="danger-icon">&#128241;</div>
        <h4>Card Title</h4>
      </div>
      <div class="danger-card-back">
        <h4>Card Title</h4>
        <p>Detailed description (keep to 1-2 sentences).</p>
      </div>
    </div>
  </div>
  <!-- Repeat for each card -->
</div>
```

**Guidelines:** Use 4-6 cards. Use HTML emoji entities for icons. Front shows icon + title, back shows title + description. Cards flip on hover via CSS 3D transform.

**Common emoji entities:** `&#128241;` (phone), `&#9203;` (timer), `&#128260;` (arrows), `&#128587;` (person), `&#128736;` (wrench), `&#128170;` (muscle), `&#128161;` (lightbulb), `&#9888;` (warning)

---

### 6. `areas-grid` — 3-Column Feature Cards

**When to use:** Exactly 3 major categories with bullet point lists (benefits, features, pillars).

```html
<div class="areas-grid">
  <div class="area-card">
    <div class="area-header">
      <div class="area-icon">&#9829;</div>
      <h4>Card Title</h4>
    </div>
    <ul>
      <li>Bullet point 1</li>
      <li>Bullet point 2</li>
      <li>Bullet point 3</li>
    </ul>
  </div>
  <div class="area-card gold-card">
    <div class="area-header">
      <div class="area-icon">&#9881;</div>
      <h4>Card Title</h4>
    </div>
    <ul>
      <li>Bullet point 1</li>
      <li>Bullet point 2</li>
      <li>Bullet point 3</li>
    </ul>
  </div>
  <div class="area-card">
    <div class="area-header">
      <div class="area-icon">&#9734;</div>
      <h4>Card Title</h4>
    </div>
    <ul>
      <li>Bullet point 1</li>
      <li>Bullet point 2</li>
      <li>Bullet point 3</li>
    </ul>
  </div>
</div>
```

**Variants:**

- `.area-card` — blue background, white text (default)
- `.area-card.gold-card` — gold background, dark text

**Guidelines:** Always exactly 3 cards. Pattern: blue, gold, blue. Use 2-4 bullet points per card.

---

### 7. `split-layout` — Text + Visual Circle

**When to use:** Explanatory text paired with a visual icon/emoji. Good for definitions, key concepts, or single-topic deep dives.

```html
<div class="split-layout">
  <div class="split-text">
    <p style="font-size: 1.6rem; margin-bottom: 1.5rem;">
      Main text with <span class="highlight">blue highlights</span>.
    </p>
    <p style="font-size: 1.6rem;">
      Supporting text with <span class="accent">green emphasis</span>.
    </p>
  </div>
  <div class="split-visual">
    <div class="visual-circle">&#9733;</div>
  </div>
</div>
```

**Custom circle colors:**

```html
<div
  class="visual-circle"
  style="background: linear-gradient(135deg, var(--gold), var(--muted-gold)); font-size: 3.5rem;"
>
  &#9878;
</div>
<div
  class="visual-circle"
  style="background: linear-gradient(135deg, var(--accent), var(--primary)); font-size: 3rem;"
>
  &#8645;
</div>
<div
  class="visual-circle"
  style="background: linear-gradient(135deg, var(--mauve), var(--dark)); font-size: 3.5rem;"
>
  &#9888;
</div>
```

**Guidelines:** Keep text to 2-3 paragraphs. Font size 1.4rem-1.6rem. Circle renders at 250px (150px on mobile).

---

### 8. `activity-box` — Group Activity Callout

**When to use:** Inside a slide (often inside `split-text`) to highlight a group activity, discussion prompt, or hands-on exercise.

```html
<div class="activity-box">
  <div class="activity-label">Group Activity</div>
  <p>
    Activity instructions go here. Be specific about what students should do.
  </p>
</div>
```

**Label variations:** "Group Activity", "Discussion", "Hands-On Activity", "Reflection", "Partner Work"

**Guidelines:** Gold-bordered box. Keep instructions to 1-2 sentences. Usually placed at the bottom of a `split-text` div.

---

### 9. `download-resource` — PDF Download Container

**When to use:** When a slide references a downloadable PDF (worksheet, planner, assessment).

```html
<div class="download-resource">
  <span class="download-prompt">Instructor Resource Available</span>
  <a href="Handouts/filename.pdf" target="_blank" class="download-btn"
    >Button Label</a
  >
</div>
```

**Multiple downloads:**

```html
<div class="download-resource">
  <span class="download-prompt">Instructor Resource Available</span>
  <a href="Handouts/file1.pdf" target="_blank" class="download-btn"
    >Resource 1</a
  >
  <a href="Handouts/file2.pdf" target="_blank" class="download-btn"
    >Resource 2</a
  >
</div>
```

**Standalone download button (no container):**

```html
<a href="Handouts/filename.pdf" target="_blank" class="download-btn"
  >Button Label</a
>
```

**Guidelines:** Green buttons with down-arrow prefix. Place at bottom of slide content.

---

### 10. `content-list` — Arrow-Prefixed List

**When to use:** Simple bulleted lists with arrow or warning icons.

```html
<ul class="content-list">
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>
```

**Danger variant (warning icons instead of arrows):**

```html
<ul class="content-list danger">
  <li>Warning item 1</li>
  <li>Warning item 2</li>
</ul>
```

---

## Text Styling Classes

Use these inline classes within `<span>` tags to color-code important words:

| Class        | Color              | Usage                         |
| ------------ | ------------------ | ----------------------------- |
| `.highlight` | Blue (`--primary`) | Key terms, definitions        |
| `.accent`    | Green (`--accent`) | Positive outcomes, actions    |
| `.gold`      | Gold (`--gold`)    | Special emphasis, transitions |
| `.mauve`     | Mauve (`--mauve`)  | Warm accent, caution emphasis |

**Example:**

```html
<p>
  The goal is to <span class="highlight">maximize productivity</span> and
  <span class="accent">achieve your goals</span>.
</p>
```

---

## Component Selection Guide

| Content Type                              | Best Component                    |
| ----------------------------------------- | --------------------------------- |
| Comparing 2-6 related items               | `cards-grid`                      |
| Step-by-step instructions                 | `takeaways`                       |
| Acronym breakdown (SMART, etc.)           | `smart-stack`                     |
| 4-quadrant decision framework             | `matrix-grid`                     |
| 4-6 dangers/myths/challenges with reveals | `dangers-grid` (flip cards)       |
| 3 major categories with bullet lists      | `areas-grid`                      |
| Definition + visual icon                  | `split-layout`                    |
| Group activity or discussion prompt       | `activity-box`                    |
| Downloadable PDF resource                 | `download-resource`               |
| Simple bulleted list                      | `content-list`                    |
| Key quote or transition                   | `big-statement` (slide type)      |
| YouTube video                             | `slide-video` (slide type)        |
| Overlay / feature highlight               | `card-glass`                      |
| Grid items revealing in sequence          | `grid-stagger` with `reveal-item` |
| Animated section boundary                 | `gradient-divider`                |
| Content revealed on scroll/hover          | `clip-reveal`                     |
| High-emphasis CTA button                  | `btn-magnetic`                    |
| Statistic / percentage display            | `counter-item`                    |

---

## Advanced Components (Phase 2)

These components use modern CSS/JS techniques from the advanced design system. All respect `prefers-reduced-motion` and degrade gracefully in older browsers.

### Glass Card

**When to use:** Overlay content on gradient backgrounds, feature highlights, or translucent panels.

```html
<div class="card card-glass reveal-item">
  <h4>Feature Title</h4>
  <p>Description over a frosted translucent background.</p>
</div>
```

**CSS (add to theme-override):**

```css
.card-glass {
  background: rgba(237, 243, 247, 0.6);
  backdrop-filter: blur(16px) saturate(1.8);
  -webkit-backdrop-filter: blur(16px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-left: none;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 64, 113, 0.08);
}
```

**Guidelines:** Best on slides with gradient or image backgrounds. Ensure text meets WCAG AA contrast against blurred background — use `--dark` or `--gray` text. Fallback: browsers without `backdrop-filter` show the solid rgba background.

---

### Staggered Grid Reveal

**When to use:** Any `cards-grid` where items should animate in sequence rather than all at once.

```html
<div class="cards-grid grid-stagger">
  <div class="card reveal-item">Card 1 content...</div>
  <div class="card reveal-item">Card 2 content...</div>
  <div class="card reveal-item">Card 3 content...</div>
  <div class="card reveal-item">Card 4 content...</div>
</div>
```

**No additional CSS needed** — the `.reveal-item` class and `--reveal-i` variable are set by the IntersectionObserver in the template's navigation engine. Items animate with 60ms stagger between each.

---

### Animated Gradient Divider

**When to use:** Visual section boundaries within a slide, replacing plain `<hr>` or static dividers.

```html
<div class="gradient-divider"></div>
```

**CSS (add to theme-override):**

```css
@property --gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.gradient-divider {
  height: 4px;
  background: linear-gradient(
    var(--gradient-angle),
    var(--primary),
    var(--accent),
    var(--gold),
    var(--primary)
  );
  background-size: 300% 100%;
  animation: gradient-shift 4s ease-in-out infinite;
  border-radius: 2px;
  margin: 2rem 0;
}

@keyframes gradient-shift {
  0% {
    --gradient-angle: 0deg;
  }
  50% {
    --gradient-angle: 180deg;
  }
  100% {
    --gradient-angle: 360deg;
  }
}
```

**Guidelines:** Fallback: browsers without `@property` support show a static gradient. The `prefers-reduced-motion` blanket rule handles animation disabling automatically.

---

### Clip-Path Shape Reveals

**When to use:** Content that should reveal dramatically on scroll or hover, or angled section dividers.

**Circle reveal on scroll/hover:**

```html
<div class="card clip-reveal reveal-item">
  <h4>Hidden Detail</h4>
  <p>Content revealed with a circular wipe effect.</p>
</div>
```

**CSS:**

```css
.clip-reveal {
  clip-path: circle(0% at 50% 50%);
  transition: clip-path 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.clip-reveal.visible,
.clip-reveal:hover {
  clip-path: circle(75% at 50% 50%);
}
```

**Angled section background:**

```css
.angle-divider {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
  background: var(--primary);
  padding: 4rem 5rem 6rem;
  color: var(--light);
}
```

---

### Magnetic Button

**When to use:** High-emphasis CTA buttons (e.g., "Start Activity", "Begin Assessment"). Adds a subtle cursor-pull effect on desktop.

```html
<button class="btn-magnetic">Start Activity</button>
```

**CSS:**

```css
.btn-magnetic {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: var(--light);
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease-out,
    box-shadow 0.3s ease;
}
.btn-magnetic:hover {
  box-shadow: 0 8px 25px rgba(0, 123, 175, 0.35);
}
.btn-magnetic:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 3px;
}
```

**JS (add to script block):**

```javascript
document.querySelectorAll(".btn-magnetic").forEach((btn) => {
  btn.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || prefersReduced) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  });
  btn.addEventListener("pointerleave", () => {
    btn.style.transform = "";
  });
});
```

**Guidelines:** Touch users and reduced-motion users see standard hover effects. The button must be a `<button>` element (not `<span>` or `<div>`). Focus-visible outline uses `--gold`.

---

### Scroll-Triggered Counter

**When to use:** Statistics, percentages, or numerical data that should animate when scrolled into view.

```html
<div class="counter-item reveal-item">
  <span class="counter-value" data-target="85">0</span>
  <p>percent of employers value this skill</p>
</div>
```

**CSS:**

```css
.counter-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.75rem 0;
}
.counter-value {
  font-family: "DM Serif Display", serif;
  font-size: 2.5rem;
  font-weight: 400;
  color: var(--primary);
  min-width: 80px;
  text-align: right;
}
```

**JS (add to script block):**

```javascript
function animateCounter(el, target, duration = 1200) {
  if (prefersReduced) {
    el.textContent = target;
    return;
  }
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// Hook into reveal observer: when a .counter-value becomes visible, animate it
const counterObserver = new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    if (
      m.target.classList.contains("visible") &&
      m.target.querySelector(".counter-value")
    ) {
      const cv = m.target.querySelector(".counter-value");
      animateCounter(cv, parseInt(cv.dataset.target));
    }
  });
});
document.querySelectorAll(".counter-item.reveal-item").forEach((el) => {
  counterObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
});
```

**Guidelines:** Reduced-motion users see the final number immediately. Counter targets are set via `data-target` attribute.
