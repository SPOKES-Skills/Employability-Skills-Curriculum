/** Solid background structures (color block, edge rail, frame) and the retired textures they replace. No DOM or storage. */
import { contrast, inkFor } from './builder-model.mjs';

export const STRUCTURE_IDS = ['color-block', 'edge-rail', 'frame'];
// Still accepted and rendered for saved designs; the controls no longer offer them.
export const RETIRED_IDS = ['dot-grid', 'diagonal', 'crosshatch', 'soft-gradient'];

// Rail and frame thickness, and the color-block corner square, in px on the 960 canvas.
const THICKNESS = { subtle: 6, normal: 12, bold: 20 };
const BLOCK = { subtle: 64, normal: 96, bold: 128 };
// Slides pad at least this much on every side, so a rail or frame ring stays out from under text.
const MARGIN = 20;
const MINIMUM_CONTRAST = 1.5;

/** The accent color when it stands apart from the surface, else the surface's readable ink. */
export function structureInk(catalog, design, baseHex) {
  const accent = catalog.palette.find(color => color.id === design.roles.accent).hex;
  if (contrast(accent, baseHex) >= MINIMUM_CONTRAST) return accent;
  const surface = catalog.palette.find(color => color.hex === baseHex);
  if (!surface) throw new Error('Structure surface must be a palette color.');
  return catalog.palette.find(color => color.id === inkFor(catalog, surface.id)).hex;
}

const fill = ink => `linear-gradient(${ink}, ${ink})`;

/** Hard-edged layers in one palette color at full strength. Order and lengths match across all four arrays. */
export function structureLayers(id, inkHex, strength) {
  const thickness = THICKNESS[strength], block = BLOCK[strength];
  if (!thickness) throw new Error(`Unknown structure strength: ${strength}`);
  const layers = {
    // A square in the top-right corner, clear of the watermark's default bottom-right spot.
    'color-block': [[`${block}px ${block}px`, 'right top']],
    // A stripe along the right edge; the left edge sits under the lesson sidebar.
    'edge-rail': [[`${thickness}px 100%`, 'right top']],
    // Four bars whose inner edge stays at the margin, so the ring grows outward with strength.
    frame: (inset => {
      const across = `calc(100% - ${2 * inset}px)`;
      return [
        [`${across} ${thickness}px`, `left ${inset}px top ${inset}px`], [`${across} ${thickness}px`, `left ${inset}px bottom ${inset}px`],
        [`${thickness}px ${across}`, `left ${inset}px top ${inset}px`], [`${thickness}px ${across}`, `right ${inset}px top ${inset}px`],
      ];
    })(MARGIN - thickness),
  }[id];
  if (!layers) throw new Error(`Unknown background structure: ${id}`);
  return { images: layers.map(() => fill(inkHex)), sizes: layers.map(([size]) => size), positions: layers.map(([, position]) => position), repeats: layers.map(() => 'no-repeat') };
}
