#!/usr/bin/env node
/** The twelve starting looks, as one table. Writes them into the builder catalog; --check only compares. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'bespoke/builder-catalog.json');
const ROLES = ['sidebar', 'titleBackground', 'titleBackgroundEnd', 'titleText', 'subtitle', 'contentBackground', 'heading', 'body', 'accent', 'button', 'dividerBackground'];
const roles = (...ids) => Object.fromEntries(ROLES.map((role, index) => [role, ids[index]]));
const slides = (title, divider, cards, video, activity) => ({
  title: { layout: title[0], logo: title[1], colors: title[2] },
  divider: { layout: divider[0], watermark: divider[1], colors: divider[2] },
  cards: { count: cards[0], titleBar: cards[1], treatment: cards[2], look: cards[3], layout: cards[4] },
  video: { layout: video[0], frame: video[1], titleStyle: video[2] },
  activity: { layout: activity[0], labelStyle: activity[1] }
});

// roles(): sidebar, title background, second color, title text, subtitle, content background, heading, body, accent, button, divider background.
export const PRESETS = [
  { id: 'professional', label: 'Professional', blurb: 'Navy and serif headings with a quiet gold accent.',
    roles: roles('dark', 'dark', 'primary', 'light', 'light', 'light', 'dark', 'royal', 'muted-gold', 'dark', 'dark'), fonts: ['merriweather', 'inter'], background: 'plain',
    slides: slides(['left', 'corner', 'gradient'], ['left', 'show', 'solid'], ['3', true, 'paragraph', 'rail', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'modern', label: 'Modern', blurb: 'Bright blue, clean type and a split title.',
    roles: roles('royal', 'primary', 'royal', 'light', 'light', 'light', 'primary', 'royal', 'primary', 'primary', 'royal'), fonts: ['outfit', 'source-sans-3'], background: 'diagonal',
    slides: slides(['split', 'corner', 'gradient'], ['left', 'hide', 'gradient'], ['2', false, 'bullets', 'outline', 'columns'], ['side', 'plain', 'large'], ['banner', 'pill']) },
  { id: 'serious', label: 'Serious', blurb: 'Royal and gray with numbered chapters.',
    roles: roles('gray', 'royal', 'gray', 'light', 'light', 'light', 'royal', 'royal', 'gray', 'royal', 'gray'), fonts: ['bitter', 'fira-sans'], background: 'plain',
    slides: slides(['center', 'above', 'solid'], ['number', 'show', 'solid'], ['3', true, 'numbered', 'band', 'rows'], ['stacked', 'plain', 'caps'], ['box', 'heading']) },
  { id: 'light-hearted', label: 'Light-hearted', blurb: 'Green and friendly, with four boxes in a grid.',
    roles: roles('accent', 'accent', 'dark', 'royal', 'royal', 'light', 'dark', 'royal', 'accent', 'dark', 'accent'), fonts: ['crimson-pro', 'outfit'], background: 'dot-grid',
    slides: slides(['center', 'corner', 'solid'], ['center', 'show', 'solid'], ['4', false, 'paragraph', 'filled', 'grid'], ['stacked', 'accent', 'regular'], ['callout', 'pill']) },
  { id: 'fun', label: 'Fun', blurb: 'Gold up front with mauve accents.',
    roles: roles('mauve', 'gold', 'muted-gold', 'royal', 'royal', 'light', 'mauve', 'royal', 'mauve', 'mauve', 'gold'), fonts: ['raleway', 'work-sans'], background: 'crosshatch',
    slides: slides(['bottom', 'corner', 'gradient'], ['band', 'show', 'solid'], ['2', true, 'bullets', 'band', 'rows'], ['side', 'accent', 'large'], ['side', 'pill']) },
  { id: 'outspoken', label: 'Outspoken', blurb: 'Bold mauve with strong bands.',
    roles: roles('royal', 'mauve', 'royal', 'light', 'light', 'light', 'mauve', 'royal', 'royal', 'mauve', 'mauve'), fonts: ['work-sans', 'merriweather'], background: 'diagonal',
    slides: slides(['split', 'above', 'gradient'], ['band', 'show', 'solid'], ['3', false, 'numbered', 'band', 'columns'], ['banner', 'accent', 'caps'], ['banner', 'caps']) },
  { id: 'open-air', label: 'Open Air', blurb: 'Light and open, with navy text on white.',
    roles: roles('muted', 'light', 'muted', 'dark', 'gray', 'light', 'primary', 'royal', 'primary', 'primary', 'muted'), fonts: ['dm-serif-display', 'outfit'], background: 'soft-gradient',
    slides: slides(['center', 'above', 'gradient'], ['center', 'hide', 'solid'], ['3', true, 'paragraph', 'outline', 'grid'], ['banner', 'plain', 'regular'], ['box', 'caps']) },
  { id: 'gold-standard', label: 'Gold Standard', blurb: 'Royal with gold lettering and a classic serif.', sidebarText: 'gold',
    roles: roles('royal', 'royal', 'dark', 'gold', 'light', 'light', 'royal', 'royal', 'muted-gold', 'royal', 'royal'), fonts: ['playfair-display', 'inter'], background: 'plain',
    slides: slides(['center', 'above', 'gradient'], ['center', 'show', 'gradient'], ['2', true, 'paragraph', 'rail', 'columns'], ['stacked', 'accent', 'large'], ['callout', 'heading']) },
  { id: 'slate', label: 'Slate', blurb: 'Cool gray with green accents.',
    roles: roles('gray', 'gray', 'royal', 'light', 'light', 'muted', 'gray', 'royal', 'accent', 'gray', 'gray'), fonts: ['vollkorn', 'fira-sans'], background: 'dot-grid',
    slides: slides(['bottom', 'corner', 'solid'], ['band', 'hide', 'solid'], ['4', false, 'bullets', 'band', 'columns'], ['side', 'plain', 'caps'], ['side', 'heading']) },
  { id: 'harvest', label: 'Harvest', blurb: 'Warm deep gold and mauve with one large box.',
    roles: roles('mauve', 'muted-gold', 'mauve', 'light', 'light', 'muted', 'muted-gold', 'royal', 'gold', 'mauve', 'muted-gold'), fonts: ['source-sans-3', 'vollkorn'], background: 'crosshatch',
    slides: slides(['left', 'corner', 'gradient'], ['number', 'show', 'solid'], ['1', true, 'paragraph', 'filled', 'rows'], ['banner', 'accent', 'large'], ['box', 'heading']) },
  { id: 'bold-statement', label: 'Bold Statement', blurb: 'Navy and bright blue with gold type and split panels.',
    roles: roles('primary', 'dark', 'primary', 'gold', 'light', 'light', 'royal', 'dark', 'gold', 'royal', 'primary'), fonts: ['inter', 'crimson-pro'], background: 'diagonal',
    slides: slides(['split', 'above', 'solid'], ['left', 'hide', 'gradient'], ['4', false, 'numbered', 'filled', 'grid'], ['side', 'plain', 'caps'], ['banner', 'pill']) },
  { id: 'fresh-start', label: 'Fresh Start', blurb: 'Airy mist and green with a left-aligned title.',
    roles: roles('offwhite', 'muted', 'accent', 'dark', 'dark', 'light', 'accent', 'gray', 'accent', 'accent', 'accent'), fonts: ['fira-sans', 'source-sans-3'], background: 'soft-gradient',
    slides: slides(['left', 'above', 'gradient'], ['number', 'hide', 'gradient'], ['3', false, 'bullets', 'rail', 'rows'], ['banner', 'plain', 'regular'], ['side', 'caps']) }
];

export function buildPresets(catalog) {
  return PRESETS.map(item => ({
    id: item.id, label: item.label, blurb: item.blurb,
    design: {
      version: '2',
      roles: item.sidebarText ? { ...item.roles, sidebarText: item.sidebarText } : item.roles,
      fonts: { heading: item.fonts[0], body: item.fonts[1] },
      slides: item.slides, background: item.background,
      samples: structuredClone(catalog.defaults.samples),
      startingPoint: item.id
    }
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = fs.readFileSync(target, 'utf8');
  const catalog = JSON.parse(raw);
  const text = JSON.stringify({ ...catalog, presets: buildPresets(catalog) }, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (text !== raw) throw new Error('Catalog presets are stale; run node scripts/build-bespoke-presets.mjs');
  } else fs.writeFileSync(target, text);
}
