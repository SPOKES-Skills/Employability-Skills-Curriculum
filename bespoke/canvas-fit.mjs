/**
 * Make it yours: the slide wins (Ruling R21). Above phone width the editable slide renders at the width of
 * its column, then scales down until all of it shows below the toolbar band at scroll 0. Lesson output and
 * the slide's own layout are unchanged; only its picture on this stage gets smaller.
 */
// Room left between the slide and the bottom of the window.
const GAP = 16;
// The slide stops shrinking here; a design with very long sample words may then run past the fold.
const MIN_SCALE = 0.35;
const ACTIVE = '.workspace[data-stage=slides][data-editor=true]';
const docked = matchMedia('(min-width:761px)');

/** The scale that fits a slide of natural height, starting top px down the page, into a window viewport px tall. */
export function fitScale({ top, natural, viewport }) {
  if (!(natural > 0)) return 1;
  return Math.min(1, Math.max(MIN_SCALE, (viewport - top - GAP) / natural));
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
  if (!docked.matches || !stage.closest(ACTIVE) || window.__bespokeCanvasFit?.enabled === false) return clear(stage);
  const natural = stage.offsetHeight;
  const scale = fitScale({ top: stage.getBoundingClientRect().top + scrollY, natural, viewport: innerHeight });
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
  docked.addEventListener('change', () => fitCanvas());
}
