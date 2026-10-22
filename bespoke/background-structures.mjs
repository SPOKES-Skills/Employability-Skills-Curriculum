/** Solid background structures (color block, edge rail, frame) and the retired textures they replace. No DOM or storage. */
import { contrast } from './builder-model.mjs';

export const STRUCTURE_IDS = ['color-block', 'edge-rail', 'frame'];
// Still accepted and rendered for saved designs; the controls no longer offer them.
export const RETIRED_IDS = ['dot-grid', 'diagonal', 'crosshatch', 'soft-gradient'];

// Outer margin, in px on the 960 canvas, that text never enters. Measured from the render CSS:
// title slides pad 32px top and bottom but carry a corner logo from 24px down; chapter dividers pad at least
// 1.35rem; the sample content area pads clamp(1.25rem, 3cqw, 3rem) and lesson slides pad 2rem 1.5rem.
export const STRUCTURE_MARGIN = { title: 24, divider: 20, content: 20 };
// Rail and frame-bar thickness by strength (a margin caps it). The color block takes this share of the margin.
const THICKNESS = { subtle: 6, normal: 12, bold: 20 };
const BLOCK_SHARE = { subtle: 0.5, normal: 0.75, bold: 1 };
const MINIMUM_CONTRAST = 1.5;

/** The accent when it stands apart from every base color of the surface, else the readable ink for all of them. */
export function structureInk(catalog, design, baseHexes) {
  const bases = [baseHexes].flat();
  const accent = catalog.palette.find(color => color.id === design.roles.accent).hex;
  if (bases.every(base => contrast(accent, base) >= MINIMUM_CONTRAST)) return accent;
  const [light, royal] = ['light', 'royal'].map(id => catalog.palette.find(color => color.id === id).hex);
  const worst = ink => Math.min(...bases.map(base => contrast(ink, base)));
  return worst(light) >= worst(royal) ? light : royal;
}

const fill = ink => `linear-gradient(${ink}, ${ink})`;

/** Hard-edged layers in one palette color at full strength, confined to the surface's outer margin. */
export function structureLayers(id, inkHex, strength, kind = 'content') {
  const margin = STRUCTURE_MARGIN[kind];
  if (!margin) throw new Error(`Unknown surface kind: ${kind}`);
  if (!THICKNESS[strength]) throw new Error(`Unknown structure strength: ${strength}`);
  const thickness = Math.min(THICKNESS[strength], margin), block = Math.round(margin * BLOCK_SHARE[strength]);
  const layers = {
    // A square in the bottom-right corner, inside the margin: no heading, card, logo or sidebar reaches it.
    'color-block': [[`${block}px ${block}px`, 'right bottom']],
    // A stripe along the right edge, inside the margin.
    'edge-rail': [[`${thickness}px 100%`, 'right top']],
    // Four bars whose inner edge stays at the margin, so the ring grows outward with strength.
    frame: (inset => {
      const across = `calc(100% - ${2 * inset}px)`;
      return [
        [`${across} ${thickness}px`, `left ${inset}px top ${inset}px`], [`${across} ${thickness}px`, `left ${inset}px bottom ${inset}px`],
        [`${thickness}px ${across}`, `left ${inset}px top ${inset}px`], [`${thickness}px ${across}`, `right ${inset}px top ${inset}px`],
      ];
    })(margin - thickness),
  }[id];
  if (!layers) throw new Error(`Unknown background structure: ${id}`);
  return { images: layers.map(() => fill(inkHex)), sizes: layers.map(([size]) => size), positions: layers.map(([, position]) => position), repeats: layers.map(() => 'no-repeat') };
}
