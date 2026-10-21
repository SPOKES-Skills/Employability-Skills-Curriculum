/**
 * Make it yours: the slide wins (Rulings R21 and R23). Above phone width the editable slide renders at the
 * width of its column, then scales down until all of it shows below the toolbar band at scroll 0, as long as
 * it stays legible. A slide that would need to shrink past the floor keeps full size and the page scrolls.
 * Lesson output and the slide's own layout are unchanged; only its picture on this stage gets smaller.
 */
// Room left between the slide and the bottom of the window.
const GAP = 16;
// The smallest legible scale. The 1024x768 laptop needs about 0.48 for a Text boxes slide.
export const MIN_SCALE = 0.45;
// Browser default root text size. A larger one means the reader enlarged text, so the slide is never shrunk.
const DEFAULT_ROOT_PX = 16;
const ACTIVE = '.workspace[data-stage=slides][data-editor=true]';
const DOCKED = '(min-width:761px)';

/**
 * The scale that fits a slide of natural height, starting top px down the page, into a window viewport px
 * tall. Never above 1, never below MIN_SCALE: past the floor, or with enlarged text, it stays 1.
 */
export function fitScale({ top, natural, viewport, rootFont = DEFAULT_ROOT_PX }) {
  if (!(natural > 0) || rootFont > DEFAULT_ROOT_PX) return 1;
  const scale = (viewport - top - GAP) / natural;
  return scale >= 1 || scale < MIN_SCALE ? 1 : scale;
}

function clear(stage) {
  if (!stage.style.transform) return;
  for (const name of ['transform', 'transform-origin', 'margin-bottom']) stage.style.removeProperty(name);
}

/** Scales #modelStage so its slide ends inside the window. Safe to call at any time. */
export function fitCanvas() {
  const stage = document.getElementById('modelStage');
  if (!stage) return;
  // Slide geometry suites measure the slide's own layout and turn the fit off, as they turn autosave off.
  if (!matchMedia(DOCKED).matches || !stage.closest(ACTIVE) || window.__bespokeCanvasFit?.enabled === false) return clear(stage);
  const natural = stage.offsetHeight;
  const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const scale = fitScale({ top: stage.getBoundingClientRect().top + scrollY, natural, viewport: innerHeight, rootFont });
  if (scale === 1) return clear(stage);
  stage.style.transform = `scale(${scale})`;
  stage.style.transformOrigin = '50% 0';
  // The scaled picture is shorter than the slide's layout box; the negative margin gives that room back.
  stage.style.marginBottom = `${(scale - 1) * natural}px`;
}

/** Refits whenever the slide, the band or anything above the slide changes size, and on every stage change. */
export function watchCanvasFit() {
  const observer = new ResizeObserver(() => fitCanvas());
  for (const selector of ['#modelStage', '#previewToolbarMount', '#startingFrom', '.preview-heading', '#previewTabs', '.app-bar']) {
    const node = document.querySelector(selector);
    if (node) observer.observe(node);
  }
  new MutationObserver(() => fitCanvas()).observe(document.getElementById('workspace'), { attributes: true, attributeFilter: ['data-stage', 'data-editor', 'data-options'] });
  addEventListener('resize', () => fitCanvas());
  matchMedia(DOCKED).addEventListener('change', () => fitCanvas());
}
