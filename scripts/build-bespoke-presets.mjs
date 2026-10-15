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
  { id: 'professional', label: 'Editorial', blurb: 'A generous left-aligned title.', colorLabel: 'Paper & berry',
    roles: roles('light', 'light', 'muted', 'mauve', 'royal', 'light', 'mauve', 'royal', 'mauve', 'mauve', 'light'), fonts: ['merriweather', 'inter'], background: 'plain', direction: 'diagonal',
    slides: slides(['left', 'corner', 'solid'], ['left', 'show', 'solid'], ['3', true, 'paragraph', 'rail', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'modern', label: 'Split stage', blurb: 'Text beside a broad open panel.', colorLabel: 'Fresh green',
    roles: roles('accent', 'accent', 'muted', 'royal', 'royal', 'light', 'royal', 'royal', 'royal', 'royal', 'accent'), fonts: ['outfit', 'source-sans-3'], background: 'plain', direction: 'right',
    slides: slides(['split', 'corner', 'gradient'], ['band', 'show', 'solid'], ['3', true, 'paragraph', 'outline', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'serious', label: 'Centered', blurb: 'A balanced title at the center.', colorLabel: 'Warm gold',
    roles: roles('gold', 'gold', 'light', 'royal', 'royal', 'light', 'royal', 'royal', 'royal', 'royal', 'gold'), fonts: ['bitter', 'fira-sans'], background: 'plain', direction: 'down',
    slides: slides(['center', 'corner', 'solid'], ['number', 'show', 'solid'], ['3', true, 'paragraph', 'band', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'light-hearted', label: 'Grounded', blurb: 'A low title with room above.', colorLabel: 'Soft silver',
    roles: roles('offwhite', 'offwhite', 'light', 'royal', 'royal', 'light', 'royal', 'royal', 'gray', 'gray', 'offwhite'), fonts: ['crimson-pro', 'outfit'], background: 'plain', direction: 'diagonal',
    slides: slides(['bottom', 'corner', 'gradient'], ['center', 'show', 'solid'], ['3', true, 'paragraph', 'filled', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'fun', label: 'Framed', blurb: 'A fine frame around the message.', colorLabel: 'Midnight & gold',
    roles: roles('royal', 'royal', 'dark', 'gold', 'light', 'light', 'royal', 'royal', 'gold', 'gold', 'royal'), fonts: ['raleway', 'work-sans'], background: 'plain', direction: 'right',
    slides: slides(['frame', 'corner', 'solid'], ['band', 'show', 'solid'], ['3', true, 'paragraph', 'band', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'outspoken', label: 'Headline', blurb: 'An oversized, compact headline.', colorLabel: 'Bold berry',
    roles: roles('mauve', 'mauve', 'royal', 'light', 'light', 'light', 'mauve', 'royal', 'gold', 'gold', 'mauve'), fonts: ['work-sans', 'merriweather'], background: 'plain', direction: 'down',
    slides: slides(['headline', 'corner', 'solid'], ['left', 'show', 'solid'], ['3', true, 'paragraph', 'outline', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'sidebar', label: 'Side rule', blurb: 'A vertical rule anchors the title.', colorLabel: 'Botanical light',
    roles: roles('muted', 'muted', 'light', 'dark', 'royal', 'light', 'dark', 'royal', 'accent', 'accent', 'muted'), fonts: ['merriweather', 'inter'], background: 'plain', direction: 'diagonal',
    slides: slides(['sidebar', 'corner', 'solid'], ['left', 'show', 'solid'], ['3', true, 'paragraph', 'rail', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'horizon', label: 'Horizon', blurb: 'Title above a full-width dividing line.', colorLabel: 'Ocean blue',
    roles: roles('dark', 'dark', 'primary', 'light', 'light', 'light', 'royal', 'royal', 'gold', 'gold', 'dark'), fonts: ['outfit', 'source-sans-3'], background: 'plain', direction: 'right',
    slides: slides(['horizon', 'corner', 'gradient'], ['band', 'show', 'solid'], ['3', true, 'paragraph', 'outline', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'corner', label: 'Corner', blurb: 'A compact title in the upper corner.', colorLabel: 'Graphite',
    roles: roles('gray', 'gray', 'royal', 'light', 'light', 'light', 'royal', 'royal', 'gold', 'gold', 'gray'), fonts: ['bitter', 'fira-sans'], background: 'plain', direction: 'down',
    slides: slides(['corner', 'corner', 'solid'], ['number', 'show', 'solid'], ['3', true, 'paragraph', 'band', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'masthead', label: 'Masthead', blurb: 'A long top rule and a broad title.', colorLabel: 'Berry on white',
    roles: roles('light', 'light', 'offwhite', 'mauve', 'royal', 'light', 'mauve', 'royal', 'mauve', 'mauve', 'light'), fonts: ['crimson-pro', 'outfit'], background: 'plain', direction: 'diagonal',
    slides: slides(['masthead', 'corner', 'solid'], ['center', 'show', 'solid'], ['3', true, 'paragraph', 'filled', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'columns', label: 'Two columns', blurb: 'Title and supporting text side by side.', colorLabel: 'Golden light',
    roles: roles('gold', 'gold', 'light', 'royal', 'royal', 'light', 'royal', 'royal', 'muted-gold', 'muted-gold', 'gold'), fonts: ['raleway', 'work-sans'], background: 'plain', direction: 'right',
    slides: slides(['columns', 'corner', 'gradient'], ['band', 'show', 'solid'], ['3', true, 'paragraph', 'band', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) },
  { id: 'plaque', label: 'Inset', blurb: 'A bordered inset around the text.', colorLabel: 'Green & ink',
    roles: roles('accent', 'accent', 'muted', 'royal', 'royal', 'light', 'royal', 'royal', 'royal', 'royal', 'accent'), fonts: ['work-sans', 'merriweather'], background: 'plain', direction: 'down',
    slides: slides(['plaque', 'corner', 'solid'], ['left', 'show', 'solid'], ['3', true, 'paragraph', 'outline', 'columns'], ['stacked', 'accent', 'regular'], ['callout', 'caps']) }
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
