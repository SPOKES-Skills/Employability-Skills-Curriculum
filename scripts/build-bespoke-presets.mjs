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

// The title-slide style every preset ships with. Only the gradient direction differs between rows.
// A frozen copy, not roleStyleDefaults(): saved designs must not change when the defaults grow.
const TITLE_STYLE = {
  backgroundMode: 'inherit', primary: 'inherit', secondary: 'inherit', direction: 'diagonal', pattern: 'inherit', patternStrength: 'normal',
  headingColor: 'inherit', bodyColor: 'inherit', headingFont: 'inherit', bodyFont: 'inherit', headingSize: 'default', bodySize: 'default',
  headingAlignment: 'layout', bodyAlignment: 'layout', headingPlacement: 'layout', bodyPlacement: 'layout',
  extraText: null, extraColor: 'inherit', extraSize: 'default', extraAlignment: 'left', extraPlacement: 'bottom', boxHeadings: null,
  headingVisible: true, bodyVisible: true, headingText: null, bodyText: null, labelText: null, labelVisible: true,
  watermarkMode: 'inherit', watermarkText: 'SPOKES', watermarkColor: 'inherit', watermarkSize: 'medium', watermarkPlacement: 'bottom-right', watermarkOpacity: 'low'
};

// roles(): sidebar, title background, second color, title text, subtitle, content background, heading, body, accent, button, divider background.
// A row may add sidebarText to fix the sidebar text color; without it the color is Automatic.
export const PRESETS = [
  { id: 'professional', label: 'Editorial', blurb: 'A generous left-aligned title.', colorLabel: 'Berry & silver',
    roles: roles('light', 'offwhite', 'muted', 'mauve', 'dark', 'offwhite', 'mauve', 'royal', 'mauve', 'mauve', 'light'), fonts: ['source-sans-3', 'inter'], background: 'plain', direction: 'diagonal',
    slides: slides(['left', 'corner', 'solid'], ['band', 'show', 'gradient'], ['2', true, 'bullets', 'band', 'columns'], ['side', 'plain', 'caps'], ['box', 'pill']) },
  { id: 'modern', label: 'Split stage', blurb: 'Text beside a broad open panel.', colorLabel: 'Green on navy',
    roles: roles('accent', 'accent', 'muted', 'royal', 'royal', 'dark', 'muted', 'muted', 'accent', 'accent', 'accent'), fonts: ['playfair-display', 'source-sans-3'], background: 'color-block', direction: 'right',
    slides: slides(['split', 'above', 'gradient'], ['left', 'show', 'solid'], ['3', true, 'bullets', 'outline', 'columns'], ['side', 'plain', 'caps'], ['banner', 'pill']) },
  { id: 'serious', label: 'Centered', blurb: 'A balanced title at the center.', colorLabel: 'Deep gold',
    roles: roles('light', 'gold', 'offwhite', 'royal', 'dark', 'muted-gold', 'dark', 'royal', 'royal', 'royal', 'offwhite'), fonts: ['bitter', 'fira-sans'], background: 'frame', direction: 'down',
    slides: slides(['center', 'above', 'gradient'], ['number', 'show', 'solid'], ['3', true, 'bullets', 'band', 'rows'], ['side', 'accent', 'regular'], ['box', 'caps']) },
  { id: 'light-hearted', label: 'Grounded', blurb: 'A low title with room above.', colorLabel: 'Silver & sky blue',
    roles: roles('light', 'offwhite', 'muted', 'gray', 'royal', 'offwhite', 'gray', 'dark', 'primary', 'primary', 'light'), fonts: ['outfit', 'work-sans'], background: 'color-block', direction: 'diagonal',
    slides: slides(['bottom', 'above', 'gradient'], ['band', 'show', 'solid'], ['4', true, 'numbered', 'filled', 'rows'], ['banner', 'accent', 'regular'], ['banner', 'caps']) },
  { id: 'fun', label: 'Framed', blurb: 'A fine frame around the message.', colorLabel: 'Midnight, berry & gold',
    roles: roles('mauve', 'dark', 'mauve', 'offwhite', 'offwhite', 'dark', 'offwhite', 'offwhite', 'gold', 'gold', 'mauve'), fonts: ['fira-sans', 'work-sans'], background: 'plain', direction: 'right',
    slides: slides(['frame', 'corner', 'gradient'], ['number', 'hide', 'solid'], ['2', true, 'numbered', 'filled', 'grid'], ['side', 'plain', 'large'], ['banner', 'pill']) },
  { id: 'outspoken', label: 'Headline', blurb: 'An oversized, compact headline.', colorLabel: 'Bold berry',
    roles: roles('offwhite', 'mauve', 'dark', 'offwhite', 'muted', 'mauve', 'gold', 'light', 'offwhite', 'light', 'dark'), fonts: ['bitter', 'fira-sans'], background: 'edge-rail', direction: 'down',
    slides: slides(['headline', 'corner', 'solid'], ['number', 'show', 'gradient'], ['3', true, 'bullets', 'outline', 'rows'], ['stacked', 'plain', 'caps'], ['callout', 'heading']) },
  { id: 'sidebar', label: 'Side rule', blurb: 'A vertical rule anchors the title.', colorLabel: 'Green & silver',
    roles: roles('muted-gold', 'light', 'accent', 'royal', 'royal', 'offwhite', 'gray', 'dark', 'muted-gold', 'muted-gold', 'accent'), fonts: ['fira-sans', 'outfit'], background: 'plain', direction: 'diagonal',
    slides: slides(['sidebar', 'corner', 'solid'], ['number', 'show', 'gradient'], ['4', true, 'paragraph', 'filled', 'rows'], ['side', 'plain', 'large'], ['side', 'pill']) },
  { id: 'horizon', label: 'Horizon', blurb: 'Title above a full-width dividing line.', colorLabel: 'Ocean blue',
    roles: roles('muted', 'light', 'primary', 'royal', 'dark', 'primary', 'offwhite', 'light', 'muted', 'light', 'gold'), fonts: ['merriweather', 'inter'], background: 'color-block', direction: 'right',
    slides: slides(['horizon', 'above', 'solid'], ['number', 'show', 'solid'], ['2', true, 'numbered', 'rail', 'columns'], ['stacked', 'plain', 'caps'], ['side', 'caps']) },
  { id: 'corner', label: 'Corner', blurb: 'A compact title in the upper corner.', colorLabel: 'Graphite',
    roles: roles('light', 'dark', 'gray', 'muted', 'muted', 'gray', 'muted', 'muted', 'gold', 'gold', 'dark'), fonts: ['vollkorn', 'outfit'], background: 'frame', direction: 'down',
    slides: slides(['corner', 'corner', 'gradient'], ['band', 'hide', 'solid'], ['2', true, 'bullets', 'rail', 'columns'], ['side', 'accent', 'caps'], ['box', 'caps']) },
  { id: 'masthead', label: 'Masthead', blurb: 'A long top rule and a broad title.', colorLabel: 'Berry & gray',
    roles: roles('gray', 'light', 'gray', 'mauve', 'mauve', 'offwhite', 'dark', 'dark', 'gray', 'gray', 'light'), fonts: ['inter', 'vollkorn'], background: 'color-block', direction: 'diagonal',
    slides: slides(['masthead', 'corner', 'solid'], ['band', 'hide', 'solid'], ['3', true, 'bullets', 'rail', 'rows'], ['stacked', 'plain', 'regular'], ['side', 'heading']) },
  { id: 'columns', label: 'Two columns', blurb: 'Title and supporting text side by side.', colorLabel: 'Golden light',
    roles: roles('offwhite', 'gold', 'muted-gold', 'royal', 'royal', 'gold', 'mauve', 'dark', 'dark', 'mauve', 'muted-gold'), fonts: ['raleway', 'vollkorn'], background: 'edge-rail', direction: 'right',
    slides: slides(['columns', 'corner', 'solid'], ['band', 'hide', 'gradient'], ['3', true, 'bullets', 'rail', 'columns'], ['banner', 'accent', 'large'], ['banner', 'caps']) },
  { id: 'plaque', label: 'Inset', blurb: 'A bordered inset around the text.', colorLabel: 'Green & ink',
    roles: roles('offwhite', 'dark', 'accent', 'muted', 'offwhite', 'accent', 'dark', 'royal', 'royal', 'light', 'dark'), fonts: ['dm-serif-display', 'source-sans-3'], background: 'frame', direction: 'down',
    slides: slides(['plaque', 'above', 'solid'], ['band', 'show', 'solid'], ['2', true, 'numbered', 'filled', 'rows'], ['stacked', 'plain', 'large'], ['box', 'heading']) }
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
      startingPoint: item.id,
      roleStyles: { title: { ...TITLE_STYLE, direction: item.direction } }
    },
    colorLabel: item.colorLabel
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
