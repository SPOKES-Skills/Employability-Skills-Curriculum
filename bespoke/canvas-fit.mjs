/**
 * Make it yours: the slide wins (Rulings R21, R23, R24, R26, R30 and R31). Above phone width the editable slide is
 * drawn on the same 960px canvas as Pick a look and Send, so its layout and shape never change with the window or
 * the drawer. It then scales to fit its column's width and the room left below the toolbar band at scroll 0,
 * growing past 960 on wide windows. Short of height, it holds at the floor while most of it still shows; a slide
 * that would lose more than a fifth below the fold even at the floor is drawn at full size (no wider than its
 * column) and the page scrolls. A column too narrow to show the 960 canvas at the floor lays the slide out at its
 * own width instead, with the same height fit. Lesson output and the slide's own layout are unchanged.
 */
import {CANVAS} from './slide-frame.mjs';

// Room left between the slide and the bottom of the window.
const GAP = 16;
// The smallest legible scale. The 1024x768 laptop needs about 0.48 for a Text boxes slide.
export const MIN_SCALE = 0.45;
// At the floor, at most this share of the scaled slide may sit below the fold.
const BELOW_FOLD_SHARE = 1 / 5;
// Bands above the workspace that come and go: notices, the session strip and help.
const BANDS = ['#fileStatus', '#restoreNotice', '#accessBanner', '#teamSessionBar', '#builderHelp'];
// Browser default root text size. A larger one means the reader enlarged text, so the slide is never shrunk.
const DEFAULT_ROOT_PX = 16;
const ACTIVE = '.workspace[data-stage=slides][data-editor=true]';
const DOCKED = '(min-width:761px)';

// The height fit: any scale from MIN_SCALE up, held at MIN_SCALE while most of the slide shows, else 1 (the page scrolls).
function heightScale(top, natural, viewport) {
  const scale = (viewport - top - GAP) / natural;
  if (scale >= MIN_SCALE) return scale;
  const floored = natural * MIN_SCALE;
  return top + floored - viewport <= floored * BELOW_FOLD_SHARE ? MIN_SCALE : 1;
}

/**
 * The scale for a slide of natural height on the 960 canvas, starting top px down the page, in a column room
 * px wide and a window viewport px tall: the smaller of the width fit and the height fit. Enlarged text gets 1.
 */
export function fitScale({ top, natural, viewport, rootFont = DEFAULT_ROOT_PX, room = Infinity }) {
  if (!(natural > 0) || rootFont > DEFAULT_ROOT_PX) return 1;
  return Math.min(room / CANVAS, heightScale(top, natural, viewport));
}

/** Whether a column room px wide can show the 960 canvas at the floor or larger (Ruling R31). */
export const usesCanvas = room => room / CANVAS >= MIN_SCALE;

const enlargedText = () => parseFloat(getComputedStyle(document.documentElement).fontSize) > DEFAULT_ROOT_PX;

// The width the frame's content may take: the preview column less the frame's own padding.
function roomFor(frame) {
  const pane = getComputedStyle(frame.parentElement), own = getComputedStyle(frame);
  const px = (style, side) => parseFloat(style[`padding${side}`]) + parseFloat(style[`border${side}Width`]);
  return frame.parentElement.clientWidth - parseFloat(pane.paddingLeft) - parseFloat(pane.paddingRight) - px(own, 'Left') - px(own, 'Right');
}

function clear(frame) {
  if (!frame.hasAttribute('data-fit')) return;
  frame.removeAttribute('data-fit');
  for (const name of ['--fit-scale', '--fit-h', '--fit-w']) frame.style.removeProperty(name);
}

/**
 * Draws #modelStage on the 960 canvas, or at its column's width when the column is too narrow for that, and scales
 * it so its slide ends inside the window. Safe to call at any time.
 */
export function fitCanvas() {
  const stage = document.getElementById('modelStage'), frame = stage?.parentElement;
  if (!frame) return;
  // Phones and enlarged text keep the slide at its column's width and full size.
  if (!matchMedia(DOCKED).matches || !stage.closest(ACTIVE) || enlargedText()) return clear(frame);
  const room = roomFor(frame), canvas = usesCanvas(room);
  // canvas.css lays the stage out --fit-w px wide, scales it by --fit-scale and gives back the height it no longer takes.
  frame.dataset.fit = canvas ? 'canvas' : 'column';
  frame.style.setProperty('--fit-w', String(canvas ? CANVAS : room));
  if (!frame.style.getPropertyValue('--fit-scale')) frame.style.setProperty('--fit-scale', '1');
  const natural = stage.offsetHeight;
  // At the column's width the width fit is 1, so only the height fit (never above full size) applies.
  const scale = fitScale({ top: stage.getBoundingClientRect().top + scrollY, natural, viewport: innerHeight, room: canvas ? room : CANVAS });
  frame.style.setProperty('--fit-scale', String(scale));
  frame.style.setProperty('--fit-h', String(natural));
}

/**
 * Refits whenever the slide, its column, the toolbar band or anything above the slide changes size, including a
 * band above the workspace appearing or going (a hidden band reports a zero size), and on every stage change.
 */
export function watchCanvasFit() {
  const observer = new ResizeObserver(() => fitCanvas());
  for (const selector of ['#modelStage', '#previewPane', '#previewToolbarMount', '#startingFrom', '.preview-heading', '#previewTabs', '.app-bar', ...BANDS]) {
    const node = document.querySelector(selector);
    if (node) observer.observe(node);
  }
  new MutationObserver(() => fitCanvas()).observe(document.getElementById('workspace'), { attributes: true, attributeFilter: ['data-stage', 'data-editor', 'data-options'] });
  addEventListener('resize', () => fitCanvas());
  matchMedia(DOCKED).addEventListener('change', () => fitCanvas());
}
