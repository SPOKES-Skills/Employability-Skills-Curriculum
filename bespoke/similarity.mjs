/** Advisory exact-choice comparison. Unknown measurements never count as matches. */
import { effectiveRoleStyle, roleStyleDefaults, effectiveFeatureStyle } from './builder-model.mjs';

export const CHARACTERISTICS = Object.freeze([
  ['roles.sidebar', 'Sidebar color'],
  ['roles.titleBackground', 'Title background color'],
  ['roles.titleBackgroundEnd', 'Title second color'],
  ['roles.titleText', 'Title text color'],
  ['roles.subtitle', 'Subtitle color'],
  ['roles.contentBackground', 'Content background color'],
  ['roles.heading', 'Content heading color'],
  ['roles.body', 'Body text color'],
  ['roles.accent', 'Card accent color'],
  ['roles.button', 'Button color'],
  ['roles.dividerBackground', 'Divider background color'],
  ['dividerText.heading', 'Divider heading color'],
  ['dividerText.supporting', 'Divider supporting text color'],
  ['fonts.heading', 'Title font'],
  ['fonts.body', 'Body font'],
  ['background', 'Content background pattern'],
  ['slides.title.layout', 'Title arrangement'],
  ['slides.title.logo', 'Title logo position'],
  ['slides.title.colors', 'Title background finish'],
  ['slides.divider.layout', 'Divider arrangement'],
  ['slides.divider.watermark', 'Divider watermark'],
  ['slides.divider.colors', 'Divider background finish'],
  ['slides.cards.count', 'Text box count'],
  ['slides.cards.titleBar', 'Shared content heading'],
  ['slides.cards.treatment', 'Text box text treatment'],
  ['slides.cards.look', 'Text box edge style'],
  ['slides.cards.layout', 'Text box arrangement'],
  ['slides.video.layout', 'Video arrangement'],
  ['slides.video.frame', 'Video frame'],
  ['slides.video.titleStyle', 'Video title style'],
  ['slides.activity.layout', 'Activity arrangement'],
  ['slides.activity.labelStyle', 'Activity label style'],
].map(([key, label]) => Object.freeze({ key, label })));

function get(object, key) {
  return key.split('.').reduce((value, part) => value?.[part], object);
}

const roleLabels = { title:'Title', divider:'Divider', cards:'Text boxes', video:'Video', activity:'Activity' };
const fieldLabels = { backgroundMode:'background finish', primary:'background color', secondary:'second background color', direction:'gradient direction', pattern:'texture', patternStrength:'texture strength', headingColor:'heading color', bodyColor:'supporting text color', headingFont:'heading font', bodyFont:'supporting text font', headingSize:'heading size', bodySize:'supporting text size', headingAlignment:'heading alignment', bodyAlignment:'supporting text alignment', headingVisible:'heading visibility', bodyVisible:'supporting text visibility', headingText:'sample heading', bodyText:'sample supporting copy', labelText:'sample label', labelVisible:'label visibility', watermarkMode:'watermark', watermarkText:'watermark text', watermarkColor:'watermark color', watermarkSize:'watermark size', watermarkPlacement:'watermark placement', watermarkOpacity:'watermark opacity' };

function roleComparison(design, catalog) {
  const kinds = Object.keys(design.roleStyles || {}).filter(kind => Object.hasOwn(roleLabels, kind));
  if (!kinds.length) return null;
  const values = new Map(), reasons = new Map(), extra = [];
  const affected = ['roles.titleBackground','roles.titleBackgroundEnd','roles.titleText','roles.subtitle','roles.contentBackground','roles.heading','roles.body','roles.dividerBackground','dividerText.heading','dividerText.supporting','fonts.heading','fonts.body','background','slides.title.layout','slides.title.colors','slides.divider.layout','slides.divider.watermark','slides.divider.colors','slides.cards.titleBar','slides.video.titleStyle','slides.activity.labelStyle'];
  if (!catalog) {
    for (const key of affected) { values.set(key,null); reasons.set(key,'Role-specific choices need the current catalog to be compared safely.'); }
    return { values, reasons, extra };
  }
  const styles = Object.fromEntries(Object.keys(roleLabels).map(kind => [kind,effectiveRoleStyle(catalog,design,kind)]));
  const hidden = (key, label) => { values.set(key,null); reasons.set(key,`${label} is hidden in the current design.`); };
  const text = (key, kind, field, visibility) => {
    if (!styles[kind][visibility]) hidden(key,roleLabels[kind]+' text');
    else values.set(key,styles[kind][field]);
  };
  const consensus = (key, field, visibility, gradient = false) => {
    // The reference content-text selectors explicitly exclude video slides.
    const content = ['cards','activity'].map(kind=>styles[kind]);
    if ((visibility && content.some(style=>!style[visibility])) || (gradient && content.some(style=>style.backgroundMode==='gradient')) || new Set(content.map(style=>style[field])).size!==1) {
      values.set(key,null); reasons.set(key,'The content roles have different, hidden, or layered choices; the reference has one shared measurement.');
    } else values.set(key,content[0][field]);
  };
  if (kinds.includes('title')) {
    values.set('roles.titleBackground',styles.title.primary);
    values.set('roles.titleBackgroundEnd',styles.title.secondary);
    text('roles.titleText','title','headingColor','headingVisible');
    text('roles.subtitle','title','bodyColor','bodyVisible');
    text('fonts.heading','title','headingFont','headingVisible');
    const raw = design.roleStyles.title;
    if (raw.backgroundMode!=='inherit') values.set('slides.title.colors',styles.title.backgroundMode);
    const expected = design.slides.title.layout==='center'?'center':'left';
    if (!styles.title.headingVisible || styles.title.headingAlignment!==expected) {
      values.set('slides.title.layout',null); reasons.set('slides.title.layout','Custom heading alignment or hidden text is not measured by the reference arrangement.');
    }
  }
  if (kinds.includes('divider')) {
    const raw = design.roleStyles.divider;
    if (styles.divider.backgroundMode==='gradient') {
      values.set('roles.dividerBackground',null); reasons.set('roles.dividerBackground','A divider gradient has no single solid background swatch in the reference measurement.');
    } else values.set('roles.dividerBackground',styles.divider.primary);
    text('dividerText.heading','divider','headingColor','headingVisible');
    text('dividerText.supporting','divider','bodyColor','bodyVisible');
    if (raw.backgroundMode!=='inherit') values.set('slides.divider.colors',styles.divider.backgroundMode);
    if (raw.watermarkMode!=='inherit') values.set('slides.divider.watermark',styles.divider.watermarkMode==='text' && styles.divider.watermarkText.trim()?'show':'hide');
    const expected = ['center','band'].includes(design.slides.divider.layout)?'center':'left';
    if (!styles.divider.headingVisible || styles.divider.headingAlignment!==expected) {
      values.set('slides.divider.layout',null); reasons.set('slides.divider.layout','Custom heading alignment or hidden text is not measured by the reference arrangement.');
    }
  }
  if (kinds.some(kind=>['cards','activity'].includes(kind))) {
    consensus('roles.contentBackground','primary',null,true);
    consensus('roles.heading','headingColor','headingVisible');
    consensus('roles.body','bodyColor','bodyVisible');
    consensus('fonts.body','bodyFont','bodyVisible');
    consensus('background','pattern');
    if (!styles.cards.headingVisible) values.set('slides.cards.titleBar',false);
  }
  if (kinds.includes('video') && (design.roleStyles.video.headingSize!=='default' || !styles.video.headingVisible)) {
    values.set('slides.video.titleStyle',null); reasons.set('slides.video.titleStyle','Custom heading size or hidden text has no measured reference title-style equivalent.');
  }
  if (kinds.includes('activity') && !styles.activity.labelVisible) hidden('slides.activity.labelStyle','Activity label');
  const measured = {
    title: new Set(['primary','secondary','headingColor','bodyColor','headingFont','backgroundMode']),
    divider: new Set(['primary','headingColor','bodyColor','backgroundMode','watermarkMode']),
    cards: new Set(['primary','headingColor','bodyColor','bodyFont','pattern']),
    activity: new Set(['primary','headingColor','bodyColor','bodyFont','pattern']),
    video: new Set(),
  };
  for (const kind of kinds) {
    const defaults = roleStyleDefaults(catalog,design,kind);
    for (const [field,value] of Object.entries(design.roleStyles[kind])) {
      if (value===defaults[field] || measured[kind].has(field)) continue;
      extra.push({ key:`roleStyles.${kind}.${field}`, label:`${roleLabels[kind]} ${fieldLabels[field]||field}`, reason:field.endsWith('Text')?'Sample copy is not compared with instructor-authored lesson text.':'This role-specific characteristic has not been measured in the six reference lessons.', source:null });
    }
  }
  return { values, reasons, extra };
}

/**
 * Compares supported visual characteristics, not pixels or perceptual likeness.
 * Ranked by number of shared measured characteristics, then coverage, then id.
 * A reference with few known measurements cannot win merely by matching 1 of 1.
 * No suggestion, restriction, or design mutation is performed here.
 */
export function compareDesign(fingerprints, design, catalog) {
  const resolved = roleComparison(design, catalog)||{values:new Map(),reasons:new Map(),extra:[]};
  for(const [feature,style] of Object.entries(design.featureStyles||{})){
    const measured={sidebar:{background:'roles.sidebar'},button:{background:'roles.button'},box:{border:'roles.accent'}}[feature]||{};
    for(const [field,value] of Object.entries(style))if(value!=='inherit'){
      if(measured[field]){resolved.values.set(measured[field],catalog?effectiveFeatureStyle(catalog,design,feature)[field]:null);if(!catalog)resolved.reasons.set(measured[field],'Feature choices need the current catalog to compare safely.');}
      else resolved.extra.push({key:`featureStyles.${feature}.${field}`,label:`${feature} ${field}`,reason:'This independent feature choice has not been measured in the reference lessons.',source:null});
    }
  }
  return (fingerprints?.lessons || []).map((lesson) => {
    const matches = [], differences = [], unknown = [];
    for (const { key, label } of CHARACTERISTICS) {
      const referenceValue = get(lesson, key);
      const designValue = resolved?.values.has(key) ? resolved.values.get(key) : get(design, key === 'dividerText.heading' ? 'roles.titleText' : key === 'dividerText.supporting' ? 'roles.subtitle' : key);
      const source = lesson.evidence?.[key] || null;
      if (referenceValue == null || designValue == null) {
        unknown.push({ key, label, reason: resolved?.reasons.get(key) || (referenceValue == null
          ? source?.reason || 'This characteristic is not measured in the reference lesson.'
          : 'This characteristic is not set in the current design.'), source });
        continue;
      }
      const detail = { key, label, referenceValue, designValue, source };
      (referenceValue === designValue ? matches : differences).push(detail);
    }
    unknown.push(...(resolved?.extra || []));
    return {
      id: lesson.id, title: lesson.title,
      shared: matches.length, total: matches.length + differences.length,
      matches, differences, unknown,
      source: lesson.source || null,
      advisory: true, rankBasis: 'shared-count',
    };
  }).sort((a, b) => b.shared - a.shared || b.total - a.total || a.id.localeCompare(b.id));
}
