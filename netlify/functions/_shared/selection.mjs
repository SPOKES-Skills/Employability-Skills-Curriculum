/** Server-side authority: committed schema plus current catalog constraints. */
import { createHash } from 'node:crypto';
import schema from '../../../bespoke/selection.schema.json' with { type: 'json' };
import schemaV2 from '../../../bespoke/selection-v2.schema.json' with { type: 'json' };
import builderCatalog from '../../../bespoke/builder-catalog.json' with { type: 'json' };
import { validateDesign } from '../../../bespoke/builder-model.mjs';
import catalog from '../../../SPOKES Builder/bespoke-library-catalog.json' with { type: 'json' };
import meta from '../../../bespoke/catalog.json' with { type: 'json' };

export const LESSON_IDS = meta.lessons.map(item => item.id);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function check(value, rule, at = '$', forSend = true) {
  const errors = [];
  const types = Array.isArray(rule.type) ? rule.type : [rule.type];
  const matches = type => type === undefined || (type === 'object' ? object(value) : type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : typeof value === type);
  if (!types.some(matches)) return [`${at}: wrong field type`];
  if (Object.hasOwn(rule, 'const') && value !== rule.const) errors.push(`${at}: wrong schema`);
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${at}: unavailable choice`);
  if (value === null) return errors;
  if (typeof value === 'string') {
    if ([...value].some(character => { const code = character.codePointAt(0); return code >= 0xd800 && code <= 0xdfff; })) errors.push(`${at}: invalid Unicode text`);
    // Archived v1 drafts can legitimately predate a spokesperson name. Keep
    // that original unchanged; only the current envelope must be Send-ready.
    const draftName = at.endsWith('.team.spokesperson.name') && (!forSend || at.startsWith('$.legacySelection.'));
    if (rule.minLength && [...value].length < rule.minLength && !draftName) errors.push(`${at}: missing text`);
    if (rule.maxLength && [...value].length > rule.maxLength) errors.push(`${at}: text is too long`);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${at}: invalid format`);
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${at}: too few items`);
    if (rule.maxItems !== undefined && value.length > rule.maxItems) errors.push(`${at}: too many items`);
    if (rule.items) value.forEach((child, index) => errors.push(...check(child, rule.items, `${at}[${index}]`, forSend)));
  }
  if (object(value)) {
    for (const key of rule.required || []) if (!Object.hasOwn(value, key)) errors.push(`${at}.${key}: required`);
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(rule.properties || {}, key)) errors.push(...check(child, rule.properties[key], `${at}.${key}`, forSend));
      else if (rule.additionalProperties === false) errors.push(`${at}.${key}: unknown field`);
    }
  }
  return errors;
}

export function selectionErrors(selection, lessonId, forSend = true) {
  const isV2 = selection?.schema === 'bespoke-selection/v2';
  const errors = check(selection, isV2 ? schemaV2 : schema, '$', forSend);
  if (errors.length) return errors;
  if (selection.lesson.id !== lessonId || !LESSON_IDS.includes(lessonId)) errors.push('Choose the matching lesson.');
  if (!selection.lesson.title.trim() || (forSend && !selection.team.spokesperson.name.trim())) errors.push('Add the lesson title and spokesperson name.');
  const date = new Date(`${selection.date}T00:00:00Z`);
  if (Number(selection.date.slice(0, 4)) < 1 || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== selection.date) errors.push('The saved date is invalid.');
  if (isV2) {
    errors.push(...validateDesign(builderCatalog, selection.design).map(error => `design: ${error}`));
    if (selection.alternatives) errors.push(...validateDesign(builderCatalog, selection.alternatives.otherDesign).map(error => `alternatives: ${error}`));
    if (selection.legacySelection) {
      if (selection.legacySelection.schema !== 'bespoke-selection/v1') errors.push('legacySelection: only an original v1 selection is allowed.');
      else errors.push(...selectionErrors(selection.legacySelection, selection.legacySelection.lesson?.id, false).map(error => `legacySelection: ${error}`));
    }
    return errors;
  }
  const fields = { colorLead: 'colorLeads', sidebarColor: 'sidebarColors', backgroundTexture: 'backgroundTextures', titleSlide: 'titleSlides', dividerStyle: 'dividers' };
  const allowed = (family, slug) => catalog.families[family]?.options.some(option => option.slug === slug && !option.blocked);
  for (const [field, family] of Object.entries(fields)) if (!allowed(family, selection.theme[field])) errors.push(`${field}: unavailable choice`);
  if (!meta.fontPairings.some(pair => pair.id === selection.theme.fontPairing) || !meta.presets.some(preset => preset.id === selection.presetId)) errors.push('The selected font or preset is unavailable.');
  const cards = selection.theme.cards;
  if (!allowed('cards', cards.lessonWide)) errors.push('The selected card style is unavailable.');
  if (cards.varyByChapter) {
    if (!object(cards.chapterStyles)) errors.push('Chapter styles are required.');
    else {
      let previous;
      for (const chapter of meta.chapterKeys) {
        const slug = cards.chapterStyles[chapter];
        if (!allowed('cards', slug) || slug === previous) errors.push(`${chapter}: choose an available style different from the previous chapter`);
        previous = slug;
      }
    }
  }
  // These are builder references, not a place to carry unvalidated extra data.
  // Exact string references also keep our canonical JSON identical to Python's
  // sort_keys/ensure_ascii=False output (there are no numeric JSON fields).
  if (selection.theme.catalogIds) {
    const expected = Object.fromEntries(Object.entries(fields).map(([field, family]) => [field, `${family}.${selection.theme[field]}`]));
    expected.cards = cards.varyByChapter && object(cards.chapterStyles)
      ? Object.fromEntries(meta.chapterKeys.map(chapter => [chapter, `cards.${cards.chapterStyles[chapter]}`])) : `cards.${cards.lessonWide}`;
    for (const [field, value] of Object.entries(selection.theme.catalogIds)) {
      if (!Object.hasOwn(expected, field) || canonicalJson(value) !== canonicalJson(expected[field])) errors.push(`catalogIds.${field}: reference differs from the selected design`);
    }
  }
  return errors;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function digest(value) { return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex'); }
export function semanticDigest(selection) {
  const { submittedAt, date, ...meaning } = selection;
  return digest(meaning);
}
export function submissionId(selection) { return `${selection.date}-${digest(selection).slice(0, 16)}`; }
