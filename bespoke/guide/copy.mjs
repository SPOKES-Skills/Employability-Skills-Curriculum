import { SECTIONS } from './questions.mjs';

export const FORBIDDEN = /\b([Rr]oles?|[Hh]ex|[Cc][Ss][Ss]|[Rr][Gg][Bb][Aa]?|[Tt]oken|[Ss]cope|[Ii]nherit|[Gg]radient stop)\b|#[0-9a-f]{3,6}\b|[a-z][A-Z][a-z]/;

const SLIDE = {
  title: 'title slide', divider: 'chapter divider', cards: 'text boxes', video: 'video slide', activity: 'activity slide'
};
export const slideName = (kind) => SLIDE[kind];
export const sectionLabel = (id) => SECTIONS.find((s) => s.id === id).label;

const FIXED = {
  team: ['Your team', 'Confirm the lesson and who is leading the design.'],
  preset: ['Starting look', 'Pick a starting look, or keep the design you have.'],
  'shared.fonts': ['Fonts', 'Which font pairing should every slide use?'],
  'shared.pattern': ['Background detail', 'Should slide backgrounds have a detail, such as a rail or a frame?'],
  'shared.sidebar': ['Sidebar color', 'What color should the lesson sidebar be?'],
  'shared.accent': ['Accent color', 'What color should lines, edges and markers be?'],
  'shared.button': ['Button color', 'What color should buttons be?'],
  'title.layout': ['Title layout', 'Where should the title sit on the slide?'],
  'title.logo': ['Logo position', 'Where should the SPOKES logo go?'],
  'divider.layout': ['Divider layout', 'How should chapter dividers be laid out?'],
  'divider.watermark': ['Chapter watermark', 'Show the large faint chapter number behind the title?'],
  'cards.count': ['Number of boxes', 'How many text boxes should the slide hold?'],
  'cards.titleBar': ['Title bar', 'Should the boxes share one title bar?'],
  'cards.treatment': ['Box text', 'How should the text inside each box read?'],
  'cards.look': ['Box style', 'What should each box look like?'],
  'cards.layout': ['Box layout', 'How should the boxes be arranged?'],
  'video.layout': ['Video layout', 'How should the video sit on the slide?'],
  'video.frame': ['Video frame', 'Should the video have a colored frame?'],
  'video.titleStyle': ['Video heading', 'How should the video heading look?'],
  'activity.layout': ['Activity layout', 'How should the activity box be laid out?'],
  'activity.labelStyle': ['Activity label', 'How should the activity label look?']
};

const HEADING = { title: 'Title color', divider: 'Chapter heading color', cards: 'Heading color', video: 'Heading color', activity: 'Heading color' };
const TEXT = { title: 'Subtitle color', divider: 'Supporting text color', cards: 'Box text color', video: 'Text color', activity: 'Text color' };

export function questionCopy(q) {
  if (FIXED[q.id]) return { title: FIXED[q.id][0], prompt: FIXED[q.id][1] };
  const name = SLIDE[q.slide];
  if (q.kind === 'background') return { title: 'Background', prompt: `What color should the ${name} background be?` };
  if (q.kind === 'recap') return { title: `Your ${name}`, prompt: 'Here is your finished slide. Happy with it?' };
  if (q.kind === 'textColor') {
    const title = (q.field === 'headingColor' ? HEADING : TEXT)[q.slide];
    return { title, prompt: `What color should the ${title.toLowerCase().replace(/ color$/, '')} be on the ${name}?` };
  }
  throw new Error(`No copy for question "${q.id}"`);
}
