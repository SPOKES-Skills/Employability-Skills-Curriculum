import * as Model from '../builder-model.mjs';
import { questionCopy } from './copy.mjs';

export const SUGGESTED = 4;
const clone = (v) => structuredClone(v);
const color = (catalog, id) => catalog.palette.find((c) => c.id === id);
const fontId = (catalog, family) => catalog.fonts.find((f) => f.family === family)?.id;

export function readabilityNote(ratio, minimum) {
  if (!minimum) return '';
  return ratio + 1e-9 >= minimum ? 'Easy to read' : `Hard to read (${ratio.toFixed(1)} to 1, aim for ${minimum} to 1)`;
}

const saved = (catalog, design, slide) => ({ ...Model.roleStyleDefaults(catalog, design, slide), ...design.roleStyles?.[slide] });
const fieldOf = (q) => (q.kind === 'background' ? 'primary' : q.field);

function pairingId(catalog, design) {
  const found = catalog.fontPairings.find((p) => fontId(catalog, p.heading) === design.fonts.heading && fontId(catalog, p.body) === design.fonts.body);
  return found ? found.id : '';
}

export function currentValue(catalog, design, q) {
  switch (q.kind) {
    case 'fontPairing': return pairingId(catalog, design);
    case 'pattern': return design.background;
    case 'sharedColor': return design.roles[q.role];
    case 'decision': return String(design.slides[q.group][q.decision]);
    case 'background':
    case 'textColor': return saved(catalog, design, q.slide)[fieldOf(q)];
    case 'watermark': return saved(catalog, design, 'divider').watermarkMode;
    case 'preset': return design.startingPoint;
    default: return '';
  }
}

function scorer(catalog, design, q) {
  const hex = (id) => color(catalog, id).hex;
  if (q.kind === 'sharedColor') {
    if (q.role === 'accent') {
      const surface = hex(design.roles.contentBackground);
      return { score: (c) => Model.contrast(c.hex, surface), minimum: 3 };
    }
    const white = hex('light'), royal = hex('royal');
    return { score: (c) => Math.max(Model.contrast(c.hex, white), Model.contrast(c.hex, royal)), minimum: 0 };
  }
  const style = Model.effectiveRoleStyle(catalog, design, q.slide);
  // Same rule as the model's advisory (builder-model.mjs roleContrastIssues): only headings on
  // title, divider and video slides are large text. Everything else needs 4.5 to 1.
  const headingMinimum = ['title', 'divider', 'video'].includes(q.slide) && style.headingSize !== 'small' ? 3 : 4.5;
  if (q.kind === 'background') {
    const texts = [style.headingColor];
    let minimum = headingMinimum;
    if (style.bodyVisible) { texts.push(style.bodyColor); minimum = 4.5; }
    return { score: (c) => Math.min(...texts.map((t) => Model.contrast(hex(t), c.hex))), minimum };
  }
  const surfaces = [hex(style.primary)];
  if (style.backgroundMode === 'gradient') surfaces.push(hex(style.secondary));
  return { score: (c) => Math.min(...surfaces.map((s) => Model.contrast(c.hex, s))), minimum: q.field === 'headingColor' ? headingMinimum : 4.5 };
}

function inheritedName(catalog, design, q) {
  const slide = q.slide, field = fieldOf(q);
  const probe = { ...design, roleStyles: { ...design.roleStyles, [slide]: { ...saved(catalog, design, slide), [field]: 'inherit' } } };
  return color(catalog, Model.effectiveRoleStyle(catalog, probe, slide)[field]).name;
}

const textRole = (q) => (['title', 'divider'].includes(q.slide)
  ? (q.field === 'headingColor' ? 'titleText' : 'subtitle')
  : (q.field === 'headingColor' ? 'heading' : 'body'));

// The preview's advisory accounts for textures, gradients and a band divider's outer surface, so on
// text and background questions the model decides. Passing colors keep the plain contrast ratio for ordering.
function modelJudge(catalog, design, q, score) {
  const role = q.kind === 'background' ? null : textRole(q);
  return (c) => {
    const issues = Model.contrastIssues(catalog, applyAnswer(catalog, design, q, c.id))
      .filter((i) => i.kind === q.slide && (role === null || i.role === role));
    if (!issues.length) return { ratio: score(c), note: 'Easy to read' };
    const worst = issues.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    return { ratio: worst.ratio, note: readabilityNote(worst.ratio, worst.minimum) };
  };
}

function rankColors(catalog, design, q) {
  const { score, minimum } = scorer(catalog, design, q);
  const current = currentValue(catalog, design, q);
  const judge = ['background', 'textColor'].includes(q.kind) ? modelJudge(catalog, design, q, score) : null;
  const ranked = catalog.palette
    .map((c, i) => ({ c, i, ...(judge ? judge(c) : { ratio: score(c), note: readabilityNote(score(c), minimum) }) }))
    .sort((a, b) => b.ratio - a.ratio || a.i - b.i)
    .map(({ c, ratio, note }) => ({ id: c.id, label: c.name, hex: c.hex, ratio, note }));
  const suggested = ranked.slice(0, SUGGESTED);
  let more = ranked.slice(SUGGESTED);
  if (current !== 'inherit' && !suggested.some((o) => o.id === current)) {
    const pick = more.find((o) => o.id === current);
    if (pick) { suggested.push({ ...pick, current: true }); more = more.filter((o) => o.id !== current); }
  }
  return { suggested, more };
}

export function optionsFor(catalog, design, q) {
  switch (q.kind) {
    case 'fontPairing': return { options: catalog.fontPairings.map((p) => ({ id: p.id, label: p.label, detail: p.mood })), more: [] };
    case 'pattern': return { options: catalog.backgrounds.map((b) => ({ id: b.id, label: b.label })), more: [] };
    case 'sharedColor': { const r = rankColors(catalog, design, q); return { options: r.suggested, more: r.more }; }
    case 'decision': {
      const meta = catalog.slideGroups.find((g) => g.id === q.group).decisions.find((d) => d.id === q.decision);
      return { options: meta.options.map((o) => ({ id: String(o.id), label: o.label })), more: [] };
    }
    case 'background':
    case 'textColor': {
      const r = rankColors(catalog, design, q);
      const inherit = { id: 'inherit', label: 'Match shared look', detail: inheritedName(catalog, design, q) };
      return { options: [inherit, ...r.suggested], more: r.more };
    }
    case 'watermark': return { options: [{ id: 'inherit', label: 'Show the chapter number' }, { id: 'off', label: 'No watermark' }], more: [] };
    case 'preset': return { options: catalog.presets.map((p) => ({ id: p.id, label: p.label, detail: p.blurb })), more: [] };
    default: return { options: [], more: [] };
  }
}

export function applyAnswer(catalog, design, q, id) {
  switch (q.kind) {
    case 'fontPairing': {
      const p = catalog.fontPairings.find((x) => x.id === id);
      const next = clone(design);
      next.fonts.heading = fontId(catalog, p.heading);
      next.fonts.body = fontId(catalog, p.body);
      return next;
    }
    case 'pattern': return { ...clone(design), background: id };
    case 'sharedColor': { const next = clone(design); next.roles[q.role] = id; return next; }
    case 'decision': {
      const meta = catalog.slideGroups.find((g) => g.id === q.group).decisions.find((d) => d.id === q.decision);
      const next = clone(design);
      next.slides[q.group][q.decision] = meta.type === 'boolean' ? id === 'true' : id;
      return next;
    }
    case 'background':
    case 'textColor': return Model.setSharedColor(catalog, design, q.slide, fieldOf(q), id, { keepOnSlide: true });
    case 'watermark': {
      const next = Model.setRoleStyle(catalog, design, 'divider', 'watermarkMode', id);
      // The model shows the legacy watermark only while the divider's own watermark choice is not hide.
      if (id === 'inherit') next.slides.divider.watermark = 'show';
      return next;
    }
    case 'preset': return Model.applyPreset(catalog, id, design);
    default: throw new Error(`Question "${q.id}" has no answers`);
  }
}

function labelOfCurrent(catalog, design, q) {
  const value = currentValue(catalog, design, q);
  if (value === 'inherit' && ['background', 'textColor'].includes(q.kind)) return `Match shared look (${inheritedName(catalog, design, q)})`;
  const { options, more } = optionsFor(catalog, design, q);
  const hit = [...options, ...more].find((o) => o.id === value);
  if (hit) return hit.label;
  return q.kind === 'watermark' && value === 'text' ? 'Custom watermark' : 'Custom';
}

export function recapLines(catalog, design, questions) {
  return questions
    .filter((q) => q.kind !== 'recap')
    .map((q) => ({ id: q.id, text: `${questionCopy(q).title}: ${labelOfCurrent(catalog, design, q)}` }));
}
