/**
 * Showcase renders (Pick a look, Send, Sent to Britt). Each slide is drawn CANVAS px wide and at least
 * --show-h px tall (showcase.css), then scaled to its frame. The frame takes the slide's own shape, so the
 * slide fills it exactly: no page white under a short slide and nothing cut off a tall one.
 */
export const CANVAS = 960;

const slideIn = frame => frame.querySelector(':scope > .bespoke-slide') ?? frame.shadowRoot?.querySelector('.bespoke-slide');

/** Sizes frames from their slides. scaleVar is the custom property a frame's CSS scales its slide by. */
export function frameSizer(scaleVar) {
  const slides = new WeakMap(), frames = new WeakMap(), widths = new WeakMap();
  const fit = frame => {
    const slide = slides.get(frame), width = widths.get(frame);
    if (!slide || !width || !slide.offsetHeight) return;
    frame.style.setProperty(scaleVar, String(width / CANVAS));
    frame.style.aspectRatio = `${CANVAS} / ${slide.offsetHeight}`;
  };
  // Frames report their width; slides report a height change (a late font, for one). Either one refits the frame.
  const observer = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) {
      if (slides.has(target)) widths.set(target, contentRect.width);
      fit(frames.get(target) ?? target);
    }
  });
  return {
    observe(frame) {
      const slide = slideIn(frame);
      if (!slide) return;
      slides.set(frame, slide);
      frames.set(slide, frame);
      observer.observe(frame);
      observer.observe(slide);
    },
    forget(frame) {
      const slide = slides.get(frame);
      observer.unobserve(frame);
      if (slide) observer.unobserve(slide);
    }
  };
}
