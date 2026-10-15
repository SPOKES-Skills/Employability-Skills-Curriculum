/** Shared, deterministic BeSpoke model. No DOM, storage, network or hidden defaults. */
const clone = value => JSON.parse(JSON.stringify(value));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const kebab = value => value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const findColor = (catalog, id) => catalog.palette.find(color => color.id === id);
const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Keep the existing UTF-16 length limits without cutting a Unicode surrogate pair.
const truncateSample = (value, limit) => {
  const text = value.slice(0, limit);
  return /[\uD800-\uDBFF]$/.test(text) && /[\uDC00-\uDFFF]/.test(value.charAt(text.length)) ? text.slice(0, -1) : text;
};

export function contrast(first, second) {
  const luminance = hex => rgb(hex).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

export function inkFor(catalog, id) {
  const surface = findColor(catalog, id);
  if (!surface) throw new Error(`Unknown brand color: ${id}`);
  return contrast(findColor(catalog, 'light').hex, surface.hex) >= contrast(findColor(catalog, 'royal').hex, surface.hex) ? 'light' : 'royal';
}

const optionalRoles = catalog => catalog.optionalRoles || [];

/** Sidebar text is Automatic unless the design names a color. */
export function sidebarInk(catalog, design) {
  return design.roles.sidebarText || inkFor(catalog, design.roles.sidebar);
}

export function setSidebarText(catalog, design, colorId) {
  if (colorId !== 'auto' && !findColor(catalog, colorId)) throw new Error(`Unknown brand color: ${colorId}`);
  const { sidebarText, ...roles } = design.roles;
  return { ...clone(design), roles: colorId === 'auto' ? roles : { ...roles, sidebarText: colorId } };
}

const blend = (base, ink, alpha) => '#' + rgb(base).map((v, channel) => Math.round(v * (1 - alpha) + rgb(ink)[channel] * alpha).toString(16).padStart(2, '0')).join('');

/** Decorative ink adapts to the surface; saved base/text colors are never modified. */
export function patternFor(catalog, design, surface) {
  const id = design.background;
  if (!catalog.backgrounds.some(item => item.id === id)) throw new Error('Unknown background pattern.');
  const peaks = { plain: 0, 'dot-grid': .2, diagonal: .18, crosshatch: 1 - (1 - .14) ** 2, 'soft-gradient': .24 };
  const base = findColor(catalog, design.roles[surface]).hex;
  const gradient = surface === 'titleBackground' ? design.slides.title.colors === 'gradient' || design.slides.title.layout === 'split' : surface === 'dividerBackground' && design.slides.divider.colors === 'gradient';
  const bases = gradient ? gradientSamples(base, findColor(catalog, design.roles.titleBackgroundEnd).hex) : [base];
  const foregrounds = surface === 'contentBackground' ? [] : [['titleText', 3], ['subtitle', 4.5]].map(([role, minimum]) => ({ hex: findColor(catalog, design.roles[role]).hex, minimum }));
  let ink = findColor(catalog, inkFor(catalog, design.roles[surface])).hex;
  // Prefer visible ink, but choose its opposite when that keeps already-readable
  // title/divider text readable (especially White lettering over a Blue gradient).
  const preservesReadability = candidate => foregrounds.every(({ hex, minimum }) => bases.every(bg => contrast(hex, bg) < minimum || Array.from({ length: 9 }, (_, i) => contrast(hex, blend(bg, candidate, peaks[id] * i / 8))).every(ratio => ratio >= minimum)));
  const opposite = findColor(catalog, ink === findColor(catalog, 'light').hex ? 'royal' : 'light').hex;
  if (!preservesReadability(ink) && preservesReadability(opposite)) ink = opposite;
  const tint = alpha => `rgba(${rgb(ink).join(', ')}, ${alpha})`;
  const patterns = {
    plain: { images: [], sizes: [] },
    'dot-grid': { images: [`radial-gradient(circle, ${tint(.2)} 2.5px, transparent 3px)`], sizes: ['24px 24px'] },
    diagonal: { images: [`repeating-linear-gradient(135deg, ${tint(.18)} 0 2px, transparent 2px 22px)`], sizes: ['auto'] },
    crosshatch: { images: [`linear-gradient(${tint(.14)} 1.5px, transparent 1.5px)`, `linear-gradient(90deg, ${tint(.14)} 1.5px, transparent 1.5px)`], sizes: ['32px 32px', '32px 32px'] },
    'soft-gradient': { images: [`linear-gradient(135deg, ${tint(.24)}, ${tint(0)} 75%)`], sizes: ['100% 100%'] },
  };
  return { ...patterns[id], peakAlpha: peaks[id], ink };
}

function patternedSurfaces(catalog, design, surface, bases) {
  const pattern = patternFor(catalog, design, surface);
  if (!pattern.peakAlpha) return bases;
  // Include the full opacity range and overlapping grid lines, not only the base.
  return bases.flatMap(hex => Array.from({ length: 9 }, (_, index) => blend(hex, pattern.ink, pattern.peakAlpha * index / 8)));
}

/** Same layer recipe in the editor, miniatures, reusable artifacts and canonical CSS. */
export function patternBackground(catalog, design, surface, baseImage, baseSize = '100% 100%') {
  const pattern = patternFor(catalog, design, surface);
  const images = [...pattern.images, ...(baseImage ? [baseImage] : [])];
  const sizes = [...pattern.sizes, ...(baseImage ? [baseSize] : [])];
  const positions = [...pattern.images.map(() => 'left top'), ...(baseImage ? ['center'] : [])];
  const repeats = [...pattern.images.map(() => 'repeat'), ...(baseImage ? ['no-repeat'] : [])];
  return `background-image:${images.join(', ') || 'none'}; background-size:${sizes.join(', ') || 'auto'}; background-position:${positions.join(', ') || 'left top'}; background-repeat:${repeats.join(', ') || 'no-repeat'};`;
}

export const defaultDesign = catalog => clone(catalog.defaults);
export const ROLE_STYLE_KINDS = ['title', 'divider', 'cards', 'video', 'activity'];

// Optional feature overrides preserve the appearance of every older v2 design.
const FEATURE_FIELDS = {sidebar:['background','color','font'],button:['background','color','font'],box:['background','border'],titlebar:['background','border'],video:['background','border'],activity:['background','border']};
export function featureStylesSchema(catalog) {
  return {type:'object',additionalProperties:false,properties:Object.fromEntries(Object.entries(FEATURE_FIELDS).map(([feature,fields])=>[feature,{type:'object',additionalProperties:false,required:fields,properties:Object.fromEntries(fields.map(key=>[key,{enum:['inherit',...(key==='font'?catalog.fonts:catalog.palette).map(item=>item.id)]}]))}]))};
}
export function effectiveFeatureStyle(catalog,design,feature) {
  if(!FEATURE_FIELDS[feature])throw new Error('Unknown preview feature.');
  const kind={box:'cards',titlebar:'cards',video:'video',activity:'activity'}[feature];
  const background=feature==='sidebar'||feature==='video'?design.roles.sidebar:feature==='button'?design.roles.button:effectiveRoleStyle(catalog,design,kind).primary;
  const saved=design.featureStyles?.[feature]||{};
  const style={background,color:inkFor(catalog,saved.background&&saved.background!=='inherit'?saved.background:background),font:design.fonts.body,border:design.roles.accent};
  for(const key of FEATURE_FIELDS[feature])if(saved[key]&&saved[key]!=='inherit')style[key]=saved[key];
  return style;
}
export function setFeatureStyle(catalog,design,feature,key,value) {
  if(!FEATURE_FIELDS[feature]?.includes(key))throw new Error('Unknown preview feature field.');
  const next=clone(design);
  next.featureStyles={...next.featureStyles,[feature]:{...Object.fromEntries(FEATURE_FIELDS[feature].map(field=>[field,'inherit'])),...next.featureStyles?.[feature],[key]:value}};
  next.startingPoint='custom';
  const errors=structuralErrors(catalog,next);if(errors.length)throw new Error(errors.join(' '));
  return next;
}

/** Inheritance is saved explicitly; sample sources are never duplicated. */
export function roleStyleDefaults(catalog, design, kind) {
  if (!ROLE_STYLE_KINDS.includes(kind)) throw new Error(`Unknown slide role: ${kind}`);
  return { backgroundMode:'inherit', primary:'inherit', secondary:'inherit', direction:'diagonal', pattern:'inherit', patternStrength:'normal', headingColor:'inherit', bodyColor:'inherit', headingFont:'inherit', bodyFont:'inherit', headingSize:'default', bodySize:'default', headingAlignment:'layout', bodyAlignment:'layout', headingPlacement:'layout', bodyPlacement:'layout', extraText:null, extraFont:'inherit', extraColor:'inherit', extraSize:'default', extraAlignment:'left', extraPlacement:'bottom', boxHeadings:null, headingVisible:true, bodyVisible:kind!=='video', headingText:null, bodyText:null, labelText:null, labelVisible:true, watermarkMode:'inherit', watermarkText:kind==='divider'?'02':'SPOKES', watermarkColor:'inherit', watermarkFont:'inherit', watermarkSize:'medium', watermarkPlacement:'bottom-right', watermarkOpacity:'low' };
}

export function roleStylesSchema(catalog) {
  const enumeration = values => ({enum:values});
  const color = () => enumeration(['inherit', ...catalog.palette.map(item => item.id)]);
  const font = () => enumeration(['inherit', ...catalog.fonts.map(item => item.id)]);
  const text = maxLength => ({type:['string','null'],maxLength});
  const properties = Object.fromEntries(ROLE_STYLE_KINDS.map(kind => {
    const fields = {
      backgroundMode:enumeration(['inherit','solid','gradient']), primary:color(), secondary:color(), direction:enumeration(['right','down','diagonal']),
      pattern:enumeration(['inherit',...catalog.backgrounds.map(item=>item.id)]), patternStrength:enumeration(['subtle','normal','bold']),
      headingColor:color(),bodyColor:color(),headingFont:font(),bodyFont:font(),headingSize:enumeration(['small','default','large']),bodySize:enumeration(['small','default','large']),
      headingAlignment:enumeration(['layout','left','center','right']),bodyAlignment:enumeration(['layout','left','center','right']),
      headingPlacement:enumeration(['layout','top','middle','bottom']),bodyPlacement:enumeration(['layout','top','middle','bottom']),
      extraText:text(500),extraFont:font(),extraColor:color(),extraSize:enumeration(['small','default','large']),extraAlignment:enumeration(['left','center','right']),extraPlacement:enumeration(['top','middle','bottom']),boxHeadings:{type:['array','null'],minItems:4,maxItems:4,items:{type:'string',maxLength:100}},headingVisible:{type:'boolean'},bodyVisible:{type:'boolean'},
      headingText:kind==='title'?{const:null}:text(200),bodyText:['title','cards'].includes(kind)?{const:null}:text(1200),
      labelText:['divider','activity'].includes(kind)?text(80):{const:null},labelVisible:{type:'boolean'},
      watermarkMode:enumeration(['inherit','off','text']),watermarkText:{type:'string',maxLength:40},watermarkColor:color(),watermarkFont:font(),watermarkSize:enumeration(['small','medium','large']),watermarkPlacement:enumeration(['top-left','top-right','bottom-left','bottom-right']),watermarkOpacity:enumeration(['low','medium','high'])
    };
    return [kind,{type:'object',additionalProperties:false,required:Object.keys(fields).filter(key=>!['headingPlacement','bodyPlacement','extraText','extraFont','watermarkFont','extraColor','extraSize','extraAlignment','extraPlacement','boxHeadings'].includes(key)),properties:fields}];
  }));
  return {type:'object',additionalProperties:false,properties};
}

export function effectiveRoleStyle(catalog, design, kind) {
  const style = {...roleStyleDefaults(catalog,design,kind),...design.roleStyles?.[kind]};
  const special = kind==='title'||kind==='divider';
  const background = kind==='title'?'titleBackground':kind==='divider'?'dividerBackground':'contentBackground';
  for (const [key,value] of Object.entries({primary:design.roles[background],secondary:design.roles.titleBackgroundEnd,headingColor:design.roles[special?'titleText':'heading'],bodyColor:design.roles[special?'subtitle':'body'],extraColor:design.roles[special?'subtitle':'body'],extraFont:design.fonts.body,headingFont:design.fonts.heading,bodyFont:design.fonts.body,pattern:design.background,watermarkColor:design.roles[special?'titleText':'heading']})) if(style[key]==='inherit') style[key]=value;
  if(style.watermarkFont==='inherit')style.watermarkFont=style.headingFont;
  if(style.backgroundMode==='inherit') style.backgroundMode=special&&(design.slides[kind].colors==='gradient'||kind==='title'&&design.slides.title.layout==='split')?'gradient':'solid';
  const centered=kind==='title'?['center','frame','horizon'].includes(design.slides.title.layout):kind==='divider'?['center','band'].includes(design.slides.divider.layout):false;
  for(const key of ['headingAlignment','bodyAlignment']) if(style[key]==='layout') style[key]=centered?'center':'left';
  if(style.watermarkMode==='inherit') style.watermarkMode=kind==='divider'&&design.slides.divider.watermark!=='hide'?'legacy':'off';
  const copy={title:[design.samples.title,design.samples.subtitle],divider:['Put it into practice','One clear step at a time'],cards:['Build a useful habit',null],video:['See a skill in action','Watch for one action you could try.'],activity:['Try it together','Choose one next step. Tell a partner what you will try, and ask what could make it easier.']}[kind];
  for(const [index,key] of ['headingText','bodyText'].entries()) if(style[key]===null) style[key]=copy[index];
  if(style.labelText===null) style.labelText={divider:'CHAPTER TWO',activity:'Partner practice'}[kind]??null;
  return style;
}
export const resolveRoleStyle = effectiveRoleStyle;

export function usedFontIds(catalog, design) {
  const ids=[design.fonts.heading,design.fonts.body];
  for(const kind of Object.keys(design.roleStyles||{})) { const style=effectiveRoleStyle(catalog,design,kind); ids.push(style.headingFont,style.bodyFont);if(style.extraText!==null)ids.push(style.extraFont);if(style.watermarkMode==='text')ids.push(style.watermarkFont); }
  for(const feature of ['sidebar','button'])if(design.featureStyles?.[feature])ids.push(effectiveFeatureStyle(catalog,design,feature).font);
  return [...new Set(ids)];
}

export function setRoleStyle(catalog, design, kind, key, value) {
  const next=clone(design), defaults=roleStyleDefaults(catalog,design,kind);
  if(!own(defaults,key)) throw new Error(`Unknown role style field: ${key}`);
  if(kind==='title'&&['headingText','bodyText'].includes(key)) next.samples[key==='headingText'?'title':'subtitle']=value;
  else {
    next.roleStyles={...next.roleStyles,[kind]:{...defaults,...next.roleStyles?.[kind],[key]:value}};
  }
  const errors=structuralErrors(catalog,next);
  if(errors.length) throw new Error(errors.join(' '));
  next.startingPoint='custom';
  return next;
}

export function applyPreset(catalog, id, currentDesign) {
  const preset = catalog.presets.find(item => item.id === id);
  if (!preset) throw new Error(`Unknown starting point: ${id}`);
  const design = clone(preset.design);
  if (currentDesign?.samples && !structuralErrors(catalog, currentDesign).length) {
    design.samples = clone(currentDesign.samples);
    for(const [kind,style] of Object.entries(currentDesign.roleStyles||{})) {
      const copy=Object.fromEntries(['headingText','bodyText','labelText','watermarkText','extraText','boxHeadings'].filter(key=>style[key]!==undefined&&style[key]!==roleStyleDefaults(catalog,design,kind)[key]).map(key=>[key,style[key]]));
      if(Object.keys(copy).length) { design.roleStyles||={}; design.roleStyles[kind]={...roleStyleDefaults(catalog,design,kind),...design.roleStyles?.[kind],...copy}; }
    }
  }
  return design;
}

/** JSON-schema mirrors structural validation. Contrast is advisory, not validity. */
export function designSchema(catalog) {
  const record = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
  const enumeration = values => ({ enum: values });
  const schema = record({
    version: { const: '2' },
    roles: record(Object.fromEntries(catalog.roles.map(role => [role.id, enumeration(catalog.palette.map(color => color.id))]))),
    fonts: record(Object.fromEntries(['heading', 'body'].map(role => [role, enumeration(catalog.fonts.map(font => font.id))]))),
    slides: record(Object.fromEntries(catalog.slideGroups.map(group => [group.id, record(Object.fromEntries(group.decisions.map(decision => [decision.id, enumeration(decision.options.map(option => option.id))])))]))),
    background: enumeration(catalog.backgrounds.map(item => item.id)),
    samples: record({ title: { type: 'string', maxLength: catalog.sampleLimits.title }, subtitle: { type: 'string', maxLength: catalog.sampleLimits.subtitle }, boxes: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string', maxLength: catalog.sampleLimits.box } } }),
    startingPoint: enumeration(['custom', ...catalog.presets.map(item => item.id)])
  });
  // Added after record() computed `required`, so these stay optional.
  for (const role of optionalRoles(catalog)) schema.properties.roles.properties[role.id] = enumeration(catalog.palette.map(color => color.id));
  schema.properties.roleStyles=roleStylesSchema(catalog);
  schema.properties.featureStyles=featureStylesSchema(catalog);
  return schema;
}

/** Structural validity is separate from the team's visual/readability decisions. */
export function structuralErrors(catalog, design) {
  const errors = [];
  const keys = (value, allowed, label, optional=[]) => {
    if (!object(value)) { errors.push(`${label} must be an object.`); return false; }
    for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${label}: unknown field ${key}.`);
    for (const key of allowed) if (!optional.includes(key) && !own(value, key)) errors.push(`${label}: missing ${key}.`);
    return true;
  };
  if (!keys(design, ['version', 'roles', 'fonts', 'slides', 'background', 'samples', 'startingPoint', 'roleStyles', 'featureStyles'], 'Design',['roleStyles','featureStyles'])) return errors;
  if (design.version !== '2') errors.push('Design version must be 2.');
  const optional = optionalRoles(catalog).map(role => role.id);
  if (keys(design.roles, [...catalog.roles.map(role => role.id), ...optional], 'Colors', optional)) {
    for (const role of catalog.roles) if (!findColor(catalog, design.roles[role.id])) errors.push(`${role.label}: choose a brand color.`);
    for (const role of optionalRoles(catalog)) if (own(design.roles, role.id) && !findColor(catalog, design.roles[role.id])) errors.push(`${role.label}: choose a brand color.`);
  }
  if (keys(design.fonts, ['heading', 'body'], 'Fonts')) for (const role of ['heading', 'body']) if (!catalog.fonts.some(font => font.id === design.fonts[role])) errors.push(`${role} font is not in the existing font library.`);
  if (keys(design.slides, catalog.slideGroups.map(group => group.id), 'Slides')) {
    for (const group of catalog.slideGroups) {
      if (!keys(design.slides[group.id], group.decisions.map(d => d.id), group.label)) continue;
      for (const decision of group.decisions) if (!decision.options.some(option => option.id === design.slides[group.id][decision.id])) errors.push(`${group.label}, ${decision.label}: choose an available option.`);
    }
  }
  if (!catalog.backgrounds.some(item => item.id === design.background)) errors.push('Choose an available background finish.');
  if (!['custom', ...catalog.presets.map(item => item.id)].includes(design.startingPoint)) errors.push('Unknown starting point.');
  if (keys(design.samples, ['title', 'subtitle', 'boxes'], 'Sample text')) {
    for (const key of ['title', 'subtitle']) if (typeof design.samples[key] !== 'string' || design.samples[key].length > catalog.sampleLimits[key]) errors.push(`Sample ${key} must be text with at most ${catalog.sampleLimits[key]} characters.`);
    if (!Array.isArray(design.samples.boxes) || design.samples.boxes.length !== 4 || design.samples.boxes.some(text => typeof text !== 'string' || text.length > catalog.sampleLimits.box)) errors.push(`Keep four sample text boxes, each with at most ${catalog.sampleLimits.box} characters. Hidden boxes remain recoverable.`);
  }
  if(own(design,'roleStyles')&&keys(design.roleStyles,ROLE_STYLE_KINDS,'Role styles',ROLE_STYLE_KINDS)) {
    const schema=roleStylesSchema(catalog);
    for(const [kind,style] of Object.entries(design.roleStyles)) {
      const fields=schema.properties[kind]?.properties;
      if(!fields||!keys(style,Object.keys(fields),`${kind} style`,Object.keys(fields).filter(key=>!schema.properties[kind].required.includes(key)))) continue;
      for(const [key,definition] of Object.entries(fields)) {
        if(!own(style,key))continue;
        const value=style[key];
        if(key==='boxHeadings'){if(value!==null&&(!Array.isArray(value)||value.length!==4||value.some(v=>typeof v!=='string'||v.length>100||(v.isWellFormed&&!v.isWellFormed()))))errors.push(`${kind} style: invalid boxHeadings.`);continue;}
        const valid=own(definition,'const')?value===definition.const:definition.enum?definition.enum.includes(value):definition.type==='boolean'?typeof value==='boolean':value===null&&Array.isArray(definition.type)||typeof value==='string'&&value.length<=definition.maxLength&&(!value.isWellFormed||value.isWellFormed());
        if(!valid) errors.push(`${kind} style: invalid ${key}.`);
      }
    }
  }
  if(own(design,'featureStyles')&&keys(design.featureStyles,Object.keys(FEATURE_FIELDS),'Feature styles',Object.keys(FEATURE_FIELDS))) {
    const schema=featureStylesSchema(catalog);
    for(const [feature,style] of Object.entries(design.featureStyles)) {
      const fields=schema.properties[feature]?.properties;
      if(!fields||!keys(style,Object.keys(fields),feature+' style'))continue;
      for(const [key,definition] of Object.entries(fields))if(!definition.enum.includes(style[key]))errors.push(feature+' style: invalid '+key+'.');
    }
  }
  return errors;
}

function gradientSamples(first, second) {
  const a = rgb(first), b = rgb(second);
  return Array.from({ length: 33 }, (_, index) => `#${a.map((v, channel) => Math.round(v + (b[channel] - v) * index / 32).toString(16).padStart(2, '0')).join('')}`);
}

const roleBackgroundChanged = style => ['backgroundMode','primary','secondary','pattern'].some(key=>style[key]!=='inherit')||style.direction!=='diagonal'||style.patternStrength!=='normal';
function rolePattern(catalog, design, kind) {
  const style=effectiveRoleStyle(catalog,design,kind), strength={subtle:.5,normal:1,bold:1.5}[style.patternStrength];
  const a=findColor(catalog,style.primary).hex,b=findColor(catalog,style.secondary).hex;
  const bases=style.backgroundMode==='gradient'?gradientSamples(a,b):[a];
  const alphas={plain:0,'dot-grid':.2*strength,diagonal:.18*strength,crosshatch:1-(1-.14*strength)**2,'soft-gradient':.24*strength};
  let ink=findColor(catalog,inkFor(catalog,style.primary)).hex;
  const preserves=candidate=>['heading','body'].every(type=>!style[type+'Visible']||bases.every(base=>contrast(findColor(catalog,style[type+'Color']).hex,base)<4.5||Array.from({length:9},(_,i)=>contrast(findColor(catalog,style[type+'Color']).hex,blend(base,candidate,alphas[style.pattern]*i/8))).every(r=>r>=4.5)));
  const opposite=findColor(catalog,ink===findColor(catalog,'light').hex?'royal':'light').hex;
  if(!preserves(ink)&&preserves(opposite)) ink=opposite;
  const tint=alpha=>`rgba(${rgb(ink).join(', ')}, ${alpha*strength})`;
  const recipes={plain:[[],[]],'dot-grid':[[`radial-gradient(circle, ${tint(.2)} 2.5px, transparent 3px)`],['24px 24px']],diagonal:[[`repeating-linear-gradient(135deg, ${tint(.18)} 0 2px, transparent 2px 22px)`],['auto']],crosshatch:[[`linear-gradient(${tint(.14)} 1.5px, transparent 1.5px)`,`linear-gradient(90deg, ${tint(.14)} 1.5px, transparent 1.5px)`],['32px 32px','32px 32px']],'soft-gradient':[[`linear-gradient(135deg, ${tint(.24)}, ${tint(0)} 75%)`],['100% 100%']]};
  const [images,sizes]=recipes[style.pattern];
  return {images,sizes,ink,peakAlpha:alphas[style.pattern],bases};
}

// Pattern-choice thumbnails use the same effective surface recipe as the slide.
export function roleBackgroundCss(catalog,design,kind) {
  const style=effectiveRoleStyle(catalog,design,kind), pattern=rolePattern(catalog,design,kind);
  const a=findColor(catalog,style.primary).hex,b=findColor(catalog,style.secondary).hex;
  const split=kind==='title'&&design.slides.title.layout==='split';
  const angle={right:'90deg',down:'180deg',diagonal:'135deg'}[style.direction];
  const gradient=style.backgroundMode==='gradient'?(split?`linear-gradient(90deg in srgb, ${a} 38%, ${blend(a,b,.35)} 38%, ${b} 100%)`:`linear-gradient(${angle} in srgb, ${a}, ${b})`):'';
  const band=kind==='divider'&&design.slides.divider.layout==='band';
  const baseImage=gradient||(band?`linear-gradient(${a},${a})`:'');
  const images=[...pattern.images,...(baseImage?[baseImage]:[])],sizes=[...pattern.sizes,...(baseImage?[band?'100% 70%':'100% 100%']:[])];
  const positions=[...pattern.images.map(()=>'left top'),...(baseImage?['center']:[])];
  return `background-color:${band?findColor(catalog,design.roles.contentBackground).hex:a};background-image:${images.join(', ')||'none'};background-size:${sizes.join(', ')||'auto'};background-position:${positions.join(', ')||'left top'};background-repeat:${[...pattern.images.map(()=>'repeat'),...(baseImage?['no-repeat']:[])].join(', ')||'no-repeat'};`;
}

function roleContrastIssues(catalog,design,kind) {
  const saved=design.roleStyles[kind],style=effectiveRoleStyle(catalog,design,kind),special=['title','divider'].includes(kind),surface=kind==='title'?'titleBackground':kind==='divider'?'dividerBackground':'contentBackground';
  const pattern=rolePattern(catalog,design,kind),changed=roleBackgroundChanged(saved);
  let surfaces;
  if(changed) {
    const bases=[...pattern.bases,...(kind==='divider'&&design.slides.divider.layout==='band'?[findColor(catalog,design.roles.contentBackground).hex]:[])];
    surfaces=bases.flatMap(base=>Array.from({length:9},(_,i)=>blend(base,pattern.ink,pattern.peakAlpha*i/8)));
  }
  else if(special) {
    const gradient=design.slides[kind].colors==='gradient'||kind==='title'&&design.slides.title.layout==='split';
    const base=findColor(catalog,design.roles[surface]).hex;
    surfaces=patternedSurfaces(catalog,design,surface,gradient?gradientSamples(base,findColor(catalog,design.roles.titleBackgroundEnd).hex):[base]);
    if(kind==='divider'&&design.slides.divider.layout==='band') surfaces.push(findColor(catalog,design.roles.contentBackground).hex);
  } else surfaces=[findColor(catalog,design.roles.contentBackground).hex];
  return ['heading','body',...(style.extraText!==null?['extra']:[])].flatMap(type=>{
    if(type!=='extra'&&!style[type+'Visible']&&!(style.labelVisible&&(kind==='divider'&&type==='body'||kind==='activity'&&type==='heading'))) return [];
    const fg=findColor(catalog,style[type+'Color']),ratio=Math.min(...surfaces.map(bg=>contrast(fg.hex,bg)));
    // Small headings and card/activity labels can be normal-sized text. Use the
    // stricter text guideline instead of assuming every heading is large/bold.
    const minimum=type==='heading'&&['title','divider','video'].includes(kind)&&style.headingSize!=='small'?3:4.5;
    if(ratio+1e-9>=minimum) return [];
    return [{kind,textType:type,role:type==='heading'?(special?'titleText':'heading'):(special?'subtitle':'body'),surface,ratio,minimum,related:[`roleStyles.${kind}`,surface,'titleBackgroundEnd',type==='heading'?(special?'titleText':'heading'):(special?'subtitle':'body'),'background'],message:`${catalog.slideGroups.find(item=>item.id===kind).label} ${type} text: ${fg.name} has an estimated minimum ${ratio.toFixed(2)}:1 over the selected surface and texture, below the ${minimum}:1 guideline. Gradient and texture values are sampled; verify the rendered composition.`}];
  });
}

/** Nonblocking contrast guidance, including gradient and decorative pattern ink. */
export function contrastIssues(catalog, design) {
  if (structuralErrors(catalog, design).length) return [];
  const issues = [];
  const color = role => findColor(catalog, design.roles[role]);
  const textPair = (role, surface, minimum, gradientEnd, patterned = false) => {
    const fg = color(role), bg = color(surface);
    const bases = gradientEnd ? gradientSamples(bg.hex, color(gradientEnd).hex) : [bg.hex];
    const surfaces = patterned ? patternedSurfaces(catalog, design, surface, bases) : bases;
    const ratio = Math.min(...surfaces.map(hex => contrast(fg.hex, hex)));
    if (ratio + 1e-9 < minimum) issues.push({ role, surface, ratio, minimum, related: [role, surface, ...(gradientEnd ? [gradientEnd] : []), ...(patterned ? ['background'] : [])], message: `${catalog.roles.find(r => r.id === role).label}: ${fg.name} on ${catalog.roles.find(r => r.id === surface).label.toLowerCase()} (${bg.name}${gradientEnd ? ` to ${color(gradientEnd).name}` : ''}${patterned && design.background !== 'plain' ? `, ${catalog.backgrounds.find(item => item.id === design.background).label}` : ''}) measures ${ratio.toFixed(2)}:1, below the ${minimum}:1 guideline for ${minimum === 3 ? 'headings' : 'supporting and body text'}.` });
  };
  const end = design.slides.title.colors === 'gradient' || design.slides.title.layout === 'split' ? 'titleBackgroundEnd' : undefined;
  if(!design.roleStyles?.title) { textPair('titleText', 'titleBackground', 3, end, true); textPair('subtitle', 'titleBackground', 4.5, end, true); }
  if(['cards','video','activity'].some(kind=>!design.roleStyles?.[kind])) { textPair('heading', 'contentBackground', 3); textPair('body', 'contentBackground', 4.5); }
  const dividerEnd = design.slides.divider.colors === 'gradient' ? 'titleBackgroundEnd' : undefined;
  if(!design.roleStyles?.divider) { textPair('titleText', 'dividerBackground', 3, dividerEnd, true); textPair('subtitle', 'dividerBackground', 4.5, dividerEnd, true); }
  if (design.roles.sidebarText) {
    const fg = color('sidebarText'), bg = color('sidebar'), ratio = contrast(fg.hex, bg.hex);
    if (ratio + 1e-9 < 4.5) issues.push({ role: 'sidebarText', surface: 'sidebar', ratio, minimum: 4.5, related: ['sidebarText', 'sidebar'], message: `Sidebar text: ${fg.name} on the sidebar (${bg.name}) is ${ratio.toFixed(1)} to 1. Aim for 4.5 to 1.` });
  }
  for(const kind of Object.keys(design.roleStyles||{})) issues.push(...roleContrastIssues(catalog,design,kind));
  for(const [feature,saved] of Object.entries(design.featureStyles||{})) {
    const style=effectiveFeatureStyle(catalog,design,feature),kind={box:'cards',titlebar:'cards',activity:'activity',video:'video'}[feature];
    const pairs=['sidebar','button','video'].includes(feature)?[['text',style.color]]:saved.background!=='inherit'?(feature==='titlebar'?[['heading',effectiveRoleStyle(catalog,design,kind).headingColor]]:[['heading',effectiveRoleStyle(catalog,design,kind).headingColor],['body',effectiveRoleStyle(catalog,design,kind).bodyColor]]):[];
    for(const [type,ink] of pairs){const ratio=contrast(findColor(catalog,ink).hex,findColor(catalog,style.background).hex);if(ratio<4.5)issues.push({feature,kind,role:type,surface:feature,related:['featureStyles.'+feature],ratio,minimum:4.5,message:feature[0].toUpperCase()+feature.slice(1)+' '+type+' measures '+ratio.toFixed(2)+':1 against its fill, below the 4.5:1 text guideline.'});}
  }
  return issues;
}

export const validateDesign = (catalog, design) => structuralErrors(catalog, design);

/** Every brand color is selectable for every role; warnings never veto a choice. */
export function colorAvailability(catalog, design, roleId, colorId) {
  const role = catalog.roles.find(item => item.id === roleId);
  if (!role || !findColor(catalog, colorId)) return { ok: false, reason: 'Choose an existing role and brand color.', warnings: [] };
  const trial = { ...design, roles: { ...design.roles, [roleId]: colorId } };
  const shapeErrors = structuralErrors(catalog, trial);
  if (shapeErrors.length) return { ok: false, reason: shapeErrors[0], warnings: shapeErrors };
  const warnings = contrastIssues(catalog, trial).filter(issue => issue.related.includes(roleId)).map(issue => issue.message);
  return { ok: true, reason: '', warnings };
}

export function roleOptions(catalog, design, roleId) {
  return catalog.palette.map(item => ({ ...item, ...colorAvailability(catalog, design, roleId, item.id) }));
}

/** Only locally edited roles add rules; legacy render output remains unchanged. */
function roleStyleCss(catalog,design,scope,canonical) {
  const blocks=[];
  const lessonRoots={title:'.slide-title',divider:'.slide.slide-section',cards:'.slide:not(.slide-video):not(.slide-section):has(.cards-grid)',video:'.slide.slide-video:not(.slide-title):not(.slide-section)',activity:'.slide:not(.slide-section):has(.activity-box)'};
  const previewText={title:['.slide-title-text','.slide-subtitle'],divider:['.slide-heading','.slide-body'],cards:[':is(.slide-heading,.slide-card h3)','.slide-card .slide-body'],video:['.slide-heading','.slide-body'],activity:[':is(.slide-heading,.slide-activity-label)','.slide-body']};
  const lessonText={title:['h1',':is(.subtitle,.copyright)'],divider:['h2',':is(p,.chapter-label)'],cards:[':is(h2,h3,h4)',':is(p,li)'],video:['h2','p:not(:has(.video-btn)):not(:has(.download-btn))'],activity:[':is(h2,h3,.activity-label)',':is(p,li)']};
  for(const [kind,stored] of Object.entries(design.roleStyles||{})) {
    const saved={...roleStyleDefaults(catalog,design,kind),...stored};
    const style=effectiveRoleStyle(catalog,design,kind), preview=`${scope}[data-kind="${kind}"]`, lesson=lessonRoots[kind];
    const rule=(p,l,css)=>{if(css) blocks.push(`${p}${canonical?`, ${l}`:''}{${css}}`);};
    if(canonical&&kind==='activity'&&design.slides.activity.layout==='side') blocks.push(`@container(max-width:30rem){${lesson} .activity-box{grid-template-columns:minmax(0,1fr);}}`);
    if(canonical&&kind==='video'&&design.slides.video.layout==='side'&&(style.bodyVisible||style.watermarkMode==='text')) blocks.push(`${lesson}{grid-auto-rows:max-content;align-content:safe center;}`);
    if(roleBackgroundChanged(saved)) {
      // Canonical lessons also have highly specific slide background recipes.
      // Only explicit role backgrounds take precedence over those recipes.
      rule(preview,lesson,roleBackgroundCss(catalog,design,kind).replace(/;/g,'!important;'));
      // Let text and reusable boxes share the chosen role composition. Borders,
      // button colors, video frames and the separate lesson sidebar stay intact.
      if(!['title','divider'].includes(kind)) rule(`${preview} :is(.slide-card,.slide-title-bar,.slide-activity,.slide-heading)`,`${lesson} :is(.card,.activity-box,h2,h3,h4,p,li)`,'background-color:transparent;background-image:none;');
    }
    for(const [index,type] of ['heading','body'].entries()) {
      const declarations=['min-width:0','overflow-wrap:anywhere'];
      const p=`${preview} ${previewText[kind][index]}`,l=`${lesson} ${lessonText[kind][index]}`;
      if(saved[type+'Color']!=='inherit') declarations.push(`color:${findColor(catalog,style[type+'Color']).hex}!important`);
      if(saved[type+'Font']!=='inherit') {const font=catalog.fonts.find(item=>item.id===style[type+'Font']);declarations.push(`font-family:"${font.family}",${font.fallback}!important`);}
      if(saved[type+'Size']!=='default') {
        const size=type==='body'?{small:'.85rem',large:'1.3rem'}[style.bodySize]:kind==='title'?{small:'clamp(1.25rem,3.6cqw,2.6rem)',large:'clamp(1.8rem,6cqw,4.5rem)'}[style.headingSize]:{small:'1.1rem',large:'2.8rem'}[style.headingSize];
        declarations.push(`font-size:${size}!important`);
      }
      if(saved[type+'Alignment']!=='layout') {
        declarations.push(`text-align:${style[type+'Alignment']}!important`);
        if(['title','divider'].includes(kind)) declarations.push(`align-self:stretch;justify-self:${{left:'start',center:'center',right:'end'}[style[type+'Alignment']]};width:100%`);
      }
      if(style[type+'Placement']!=='layout') {
        declarations.push(`min-height:${type==='heading'?'10':'8'}rem;display:block;align-content:${{top:'start',middle:'center',bottom:'end'}[style[type+'Placement']]}`);
      }
      if(!style[type+'Visible']) {
        const pVisibility=kind==='divider'&&type==='body'?`${preview} .slide-body:not(:first-of-type)`:kind==='activity'&&type==='heading'?`${preview} .slide-heading`:p;
        const lVisibility=kind==='divider'&&type==='body'?`${lesson} p:not(.chapter-label)`:kind==='activity'&&type==='heading'?`${lesson} :is(h2,h3)`:l;
        rule(pVisibility,lVisibility,'display:none!important');
      }
      rule(p,l,declarations.join(';'));
      // List items and inline canonical spans often declare their own colors.
      const descendants=[];
      if(saved[type+'Color']!=='inherit') descendants.push('color:inherit!important');
      if(saved[type+'Font']!=='inherit') descendants.push('font-family:inherit!important');
      if(saved[type+'Size']!=='default') descendants.push('font-size:inherit!important');
      rule(`${p} :is(li,span,strong,em)`,`${l} :is(li,span,strong,em)`,descendants.join(';'));
    }
    if(style.extraText!==null)rule(`${preview} .slide-extra-text`,`${lesson} .slide-extra-text`,`grid-column:1 / -1;grid-row:8;position:relative;z-index:1;min-height:8rem;width:100%;margin:1rem 0 0;align-content:${{top:'start',middle:'center',bottom:'end'}[style.extraPlacement]};text-align:${style.extraAlignment}!important;color:${findColor(catalog,style.extraColor).hex}!important;font-family:"${catalog.fonts.find(font=>font.id===style.extraFont).family}",${catalog.fonts.find(font=>font.id===style.extraFont).fallback}!important;font-size:${{small:'.85rem',default:'1rem',large:'1.3rem'}[style.extraSize]}!important;white-space:normal;overflow-wrap:anywhere;`);
    if(!style.labelVisible&&['divider','activity'].includes(kind)) rule(`${preview} ${kind==='divider'?'.slide-body:first-of-type':'.slide-activity-label'}`,`${lesson} ${kind==='divider'?'.chapter-label':'.activity-label'}`,'display:none!important');
    if(saved.watermarkMode!=='inherit') {
      if(kind==='divider') rule(`${preview} .slide-watermark`,`${lesson}::after`,'display:none;');
      if(saved.watermarkMode==='text') {
        // Real divider templates include a positioned chapter illustration. A
        // custom text mark reserves space for that image as well as the copy.
        if(canonical&&kind==='divider') blocks.push(`${lesson} .section-circle{position:static;inset:auto;transform:none;flex:0 0 auto;align-self:center;width:min(280px,100%);height:auto;aspect-ratio:1;margin:0 0 1.5rem;}`);
        const top=style.watermarkPlacement.startsWith('top'),right=style.watermarkPlacement.endsWith('right');
        const size={small:'clamp(1.25rem,4cqw,2.5rem)',medium:'clamp(1.5rem,7cqw,4rem)',large:'clamp(2rem,10cqw,6rem)'}[style.watermarkSize];
        const font=catalog.fonts.find(item=>item.id===style.watermarkFont);
        const css=`display:block;flex:0 0 auto;position:static;inset:auto;transform:none;box-sizing:border-box;width:100%;max-width:100%;min-width:0;max-height:none;height:auto;margin:${top?'0 0 1rem':'1rem 0 0'};padding:0;overflow-wrap:anywhere;white-space:normal;overflow:visible;line-height:1.15;text-align:${right?'right':'left'};font-family:"${font.family}",${font.fallback};font-size:${size};font-weight:400;color:${findColor(catalog,style.watermarkColor).hex};opacity:${{low:.12,medium:.25,high:.45}[style.watermarkOpacity]};pointer-events:none;user-select:none;order:${top?-1:999};grid-column:1 / -1;grid-row:${top?1:kind==='title'?7:'auto'};align-self:${top?'start':'end'};`;
        // CSS content is decorative; no arbitrary text is interpreted as CSS.
        const content=[...style.watermarkText].map(char=>`\\${char.codePointAt(0).toString(16)} `).join('');
        rule(`${preview} .role-watermark`,kind==='title'?`${lesson}.active::after`:`${lesson}::after`,`${css}${canonical?`content:"${content}" / "";`:''}`);
      }
    }
  }
  return blocks;
}

/** Generated styles are shared by the wizard, reusable-role artifact, and canonical template override. */
export function cssForDesign(catalog, design, { scope = '.bespoke-slide', fontBase = '../fonts', canonical = true } = {}) {
  const errors = structuralErrors(catalog, design);
  if (errors.length) throw new Error(errors.join(' '));
  if (!/^[.#][a-zA-Z][\w-]*$/.test(scope) || !/^[./\w-]+$/.test(fontBase)) throw new Error('Unsafe CSS scope or font path.');
  const fonts = ['heading', 'body'].map(role => catalog.fonts.find(font => font.id === design.fonts[role]));
  const blocks = usedFontIds(catalog,design).map(id=>catalog.fonts.find(font=>font.id===id)).flatMap(font => font.sources.map(source => `@font-face { font-family: "${font.family}"; src: url("${fontBase}/${source.file}") format("woff2"); font-weight: ${source.weight}; font-style: normal; font-display: swap; }`));
  const vars = catalog.palette.map(color => `--${color.id}: ${color.hex};`);
  for (const role of catalog.roles) {
    const id = design.roles[role.id];
    vars.push(`--role-${kebab(role.id)}: var(--${id});`, `--role-${kebab(role.id)}-rgb: ${rgb(findColor(catalog, id).hex).join(', ')};`);
    if (role.ink) vars.push(`--role-${kebab(role.id)}-ink: var(--${role.id === 'sidebar' ? sidebarInk(catalog, design) : inkFor(catalog, id)});`);
  }
  fonts.forEach((font, index) => vars.push(`--font-${['heading', 'body'][index]}: "${font.family}", ${font.fallback};`));
  const title = design.slides.title, divider = design.slides.divider, cards = design.slides.cards, video = design.slides.video, activity = design.slides.activity;
  vars.push(`--bespoke-box-count: ${cards.count};`);
  blocks.push(`${scope}${canonical ? ', body' : ''} { ${vars.join(' ')} }`);
  const rule = (preview, lesson, declarations) => blocks.push(`${preview}${canonical && lesson ? `, ${lesson}` : ''} { ${declarations} }`);
  const kind = type => `${scope}[data-kind="${type}"]`;
  const selector = className => `${scope} ${className}`;
  blocks.push(`${scope}, ${scope} * { box-sizing: border-box; }`);
  rule(scope, '', 'position: relative; isolation: isolate; min-height: 360px; padding: clamp(1.35rem, 4vw, 3.5rem); color: var(--role-body); background-color: var(--role-content-background); font-family: var(--font-body); overflow-wrap: anywhere;');
  rule(selector('.slide-body'), 'body, .slide p, .card p, .content-list li, .chapter-label', 'font-family: var(--font-body);');
  rule(`${selector('.slide-heading')}, ${selector('.slide-title-text')}, ${selector('.slide-card h3')}`, '.slide-title h1, .slide h2, .slide h3, .card h4, .smart-content h4, .matrix-action, .slide-section h2', 'font-family: var(--font-heading); font-weight: 400;');
  rule(selector(':is(.slide-sidebar, .slide-sidebar-drawer, .slide-sidebar-disclosure > summary)'), '.sidebar, .sidebar-toggle', 'background: var(--role-sidebar); color: var(--role-sidebar-ink);');
  if (canonical) blocks.push('.sidebar .sidebar-title, .sidebar .resources-title, .sidebar .chapter-header, .sidebar .slide-item, .sidebar .resource-link { color: var(--role-sidebar-ink); }\n.sidebar .chapter-header:hover, .sidebar .slide-item:hover, .sidebar .resource-link:hover { color: var(--role-sidebar-ink); background: transparent; text-decoration: underline; }\n.sidebar .slide-item.active, .sidebar .chapter-item.active > .chapter-header { color: var(--role-sidebar-ink); background: transparent; border-left-color: var(--role-accent); box-shadow: inset 3px 0 0 var(--role-accent); }');
  // Represent the lesson shell: a 280px left chapter column, never a top header.
  // Only sample markup uses this grid; the actual template owns its navigation.
  const contentSlides = ['cards','video','activity'].map(kind).join(', ');
  rule(contentSlides, '', 'container-type:inline-size; display:grid; grid-template-columns:min(280px,100%) minmax(0,1fr); padding:0; min-height:480px; align-items:stretch; align-content:start;');
  rule(selector('.slide-content'), '', 'min-width:0; container-type:inline-size; padding:clamp(1.25rem,3cqw,3rem);');
  rule(selector(':is(.slide-sidebar, .slide-sidebar-drawer)'), '', 'padding:2rem min(1.5rem,24px); font-family:var(--font-body); font-size:.85rem; line-height:1.45; display:flex; flex-direction:column; gap:1rem; min-width:0;');
  rule(selector('.sample-sidebar-title'), '', 'margin:0; font-size:.875rem; font-weight:600; text-transform:uppercase; letter-spacing:.08em; padding-bottom:1rem; border-bottom:1px solid currentColor;');
  rule(selector('.sample-sidebar-note'), '', 'font-size:.75rem;');
  rule(selector('.sample-chapters'), '', 'display:flex; flex-direction:column; gap:.25rem; list-style:none; padding:0; margin:0;');
  rule(selector('.sample-chapter'), '', 'display:flex; align-items:center; gap:.5rem; padding:.65rem .5rem; border-left:3px solid transparent; border-radius:.5rem; font-size:.85rem;');
  rule(selector('.sample-chapter[data-current]'), '', 'border-left-color:var(--role-accent); font-weight:700;');
  rule(selector('.sample-chapter svg'), '', 'width:.6rem; height:.6rem; flex-shrink:0;');
  rule(selector('.sample-badge'), '', 'font-size:.65rem; font-weight:700; border-radius:.25rem; padding:.15rem .4rem; flex-shrink:0;');
  for (const [badge, color] of [['w','gold'],['i','primary'],['p','accent'],['e','gold'],['a','dark']]) {
    rule(selector('.sample-badge[data-badge="'+badge+'"]'), '', 'background:var(--'+color+');color:var(--'+inkFor(catalog,color)+');');
  }
  rule(selector('.sample-slide-name'), '', 'display:block; margin:.15rem 0 .5rem 1rem; padding:.4rem .65rem; border-left:3px solid var(--role-accent); font-size:.8rem;');
  rule(selector('.sample-resources'), '', 'margin-top:auto; padding-top:1rem; border-top:1px solid currentColor; display:grid; gap:.5rem; font-size:.8rem;');
  rule(selector('.sample-resources strong'), '', 'font-size:.75rem; text-transform:uppercase; letter-spacing:.08em;');
  rule(selector('.sample-slide-counter'), '', 'padding-top:1rem; border-top:1px solid currentColor; font-size:.75rem;');
  rule(selector('.slide-sidebar-disclosure'), '', 'display:none; min-width:0;');
  rule(selector('.slide-sidebar-disclosure > summary'), '', 'list-style:none; display:flex; align-items:center; gap:.5rem; width:fit-content; max-width:100%; min-height:44px; padding:.65rem .8rem; border-radius:.35rem; cursor:pointer; font-size:.85rem;');
  rule(selector('.slide-sidebar-disclosure > summary::-webkit-details-marker'), '', 'display:none;');
  rule(selector('.slide-sidebar-disclosure > summary svg'), '', 'width:20px; height:20px; flex-shrink:0;');
  rule(selector('.slide-sidebar-disclosure > summary:focus-visible'), '', 'outline:3px solid var(--role-sidebar-ink); outline-offset:-5px;');
  rule(selector('.slide-sidebar-drawer'), '', 'position:absolute; z-index:3; top:3.75rem; left:0; width:min(17.5rem,100%); max-height:calc(100% - 3.75rem); overflow-y:auto; box-shadow:4px 6px 14px rgba(0,0,0,.2);');
  rule(selector('.slide-sidebar-drawer:focus-visible'), '', 'outline:3px solid var(--role-sidebar-ink); outline-offset:-5px;');
  rule(selector('.slide-heading'), '.slide:not(.slide-title):not(.slide-section) h2, .card h4', 'color: var(--role-heading);');
  rule(selector('.slide-body'), '.slide:not(.slide-title):not(.slide-section) p, .content-list li, .card p', 'color: var(--role-body); line-height: 1.55;');
  rule(selector('.slide-accent'), '.divider', 'background: var(--role-accent);');
  rule(selector('.slide-button'), '.download-btn, .video-btn', 'background: var(--role-button); color: var(--role-button-ink); border: 0; border-radius: .4rem; padding: .65rem 1.1rem; font-family: var(--font-body); font-size: 1rem; line-height: 1.4; min-height: 44px;');
  rule(selector('.slide-logo'), '', 'font-family: var(--font-body); font-weight: 600; letter-spacing: .14em; font-size: .85rem; margin-bottom: 2rem;');
  rule(selector('img.slide-logo'), '', 'display:block; width:5rem; height:5rem; object-fit:contain; background:var(--light); border-radius:.4rem; padding:.4rem;');
  // A real slide canvas supplies free space for vertical placement. Type responds
  // to this canvas, not the browser width; long copy can grow it without clipping.
  const split = title.layout === 'split', centered = title.layout === 'center';
  const splitMid = blend(findColor(catalog, design.roles.titleBackground).hex, findColor(catalog, design.roles.titleBackgroundEnd).hex, .35);
  const titleBackground = split ? (title.colors === 'gradient' ? `linear-gradient(90deg, var(--role-title-background) 38%, ${splitMid} 38%, var(--role-title-background-end) 100%)` : 'linear-gradient(90deg, var(--role-title-background) 38%, var(--role-title-background-end) 38%)') : title.colors === 'gradient' ? 'linear-gradient(135deg, var(--role-title-background), var(--role-title-background-end))' : 'var(--role-title-background)';
  rule(kind('title'), '.slide-title', `container-type:inline-size; box-sizing:border-box; width:100%; min-width:0; max-width:100%; min-height:420px; height:auto; overflow:visible; position:relative; padding: ${title.logo === 'corner' ? '112px' : '32px'} 6% 32px; grid-template-columns:${split ? '36% minmax(0,1fr)' : 'minmax(0,1fr)'}; column-gap:${split ? '6%' : '0'}; grid-template-rows:minmax(0,1fr) repeat(5,auto) ${title.layout === 'bottom' ? '0' : 'minmax(0,1fr)'}; justify-items:${centered ? 'center' : 'start'}; align-items:start; align-content:stretch; text-align:${centered ? 'center' : 'left'}; background-color:var(--role-title-background); ${patternBackground(catalog, design, 'titleBackground', titleBackground.startsWith('linear-gradient') ? titleBackground : undefined)}`);
  rule(kind('title'), '.slide-title.active', 'display:grid;');
  // Invisible grid sizer supplies a 16:9 minimum (content is 88% of the canvas).
  // Real text rows can exceed it, unlike a fixed aspect-ratio height.
  rule(`${kind('title')}::before`, '.slide-title.active::before', `content:'';display:block;grid-column:1 / -1;grid-row:1 / 8;height:max(${title.logo === 'corner' ? 276 : 356}px,calc(100cqw / .88 * 9 / 16 - ${title.logo === 'corner' ? 144 : 64}px));min-width:0;justify-self:stretch;pointer-events:none;visibility:hidden;`);
  if (canonical) blocks.push('.slide-title.active::after{content:none;display:none;}');
  const titleColumn = split ? 2 : 1;
  rule(`${kind('title')} .slide-title-text`, '.slide-title h1', `grid-column:${titleColumn}; grid-row:3; min-width:0; max-width:20ch; color:var(--role-title-text); font-size:clamp(1.5rem,4.8cqw,3.7rem); line-height:1.12; margin:0 0 16px; overflow-wrap:anywhere;`);
  rule(`${kind('title')} .slide-subtitle`, '.slide-title .subtitle', `grid-column:${titleColumn}; grid-row:5; min-width:0; max-width:42ch; color:var(--role-subtitle); font-family:var(--font-body); font-size:clamp(1rem,1.8cqw,1.25rem); line-height:1.5; margin:0; overflow-wrap:anywhere;`);
  rule(`${kind('title')} .slide-logo`, '.slide-title .logo', `grid-column:${titleColumn}; grid-row:2; width:clamp(48px,7cqw,80px); height:clamp(48px,7cqw,80px); max-width:100%; box-sizing:border-box; object-fit:contain; background:var(--light); color:var(--royal); border-radius:.4rem; padding:.4rem; font-size:.7rem; letter-spacing:0; display:grid; place-items:center; ${title.logo === 'corner' ? 'position:absolute;top:24px;right:6%;margin:0;grid-area:auto;' : 'position:static;margin:0 0 20px;'}`);
  rule(`${kind('title')} .slide-accent`, '.slide-title .divider', `grid-column:${titleColumn}; grid-row:4; width:clamp(40px,8cqw,80px); height:4px; margin:0 0 16px; background:var(--role-accent);`);
  if (canonical) blocks.push(`.slide-title .copyright{grid-column:${titleColumn};grid-row:6;color:var(--role-subtitle);font-family:var(--font-body);font-size:.85rem;line-height:1.5;margin:16px 0 0;}`);
  const dividerBackground = divider.colors === 'gradient' ? 'linear-gradient(135deg,var(--role-divider-background),var(--role-title-background-end))' : 'var(--role-divider-background)';
  rule(kind('divider'), '.slide-section, .slide-section[data-chapter-num]', `container-type:inline-size; background-color:var(--role-divider-background); ${patternBackground(catalog, design, 'dividerBackground', divider.colors === 'gradient' ? dividerBackground : undefined)} color:var(--role-subtitle); text-align:${divider.layout === 'center' || divider.layout === 'band' ? 'center' : 'left'}; align-items:${divider.layout === 'center' || divider.layout === 'band' ? 'center' : 'flex-start'}; position:relative;`);
  rule(kind('divider'), '', 'display:flex; flex-direction:column; justify-content:center;');
  rule(`${kind('divider')} .slide-heading`, '.slide-section h2', 'color:var(--role-title-text); position:relative; z-index:1;');
  rule(`${kind('divider')} .slide-body`, '.slide-section p, .slide-section .chapter-label', 'color:var(--role-subtitle); position:relative; z-index:1;');
  if (divider.layout === 'band') rule(kind('divider'), '.slide-section, .slide-section[data-chapter-num]', `background-color:var(--role-content-background); ${patternBackground(catalog, design, 'dividerBackground', divider.colors === 'gradient' ? dividerBackground : 'linear-gradient(var(--role-divider-background),var(--role-divider-background))', '100% 70%')}`);
  // Keep the decorative chapter mark in one bounded line. Enlarging text must not
  // wrap its digits into a second line beyond the slide or clip meaningful copy.
  rule(selector('.slide-watermark'), '.slide-section::after', `display:${divider.watermark === 'hide' ? 'none' : 'block'}; position:absolute; right:6%; top:5%; max-width:88%; max-height:90%; overflow:hidden; white-space:nowrap; transform:none; font-size:min(${divider.layout === 'number' ? '12rem,56cqw' : '9rem,42cqw'}); line-height:1; color:var(--role-title-text); opacity:.12; pointer-events:none;`);
  rule(`${kind('cards')}, ${kind('video')}, ${kind('activity')}`, '.slide:not(.slide-title):not(.slide-section)', `background-color:var(--role-content-background); ${patternBackground(catalog, design, 'contentBackground')}`);
  if (canonical) blocks.push('.main {background-color:var(--role-content-background);background-image:none;}');
  // Content text stays on its chosen opaque surface. Title/divider contrast includes pattern ink.
  rule(`${selector('.slide-card')}, ${selector('.slide-title-bar')}, ${selector('.slide-activity')}, ${selector('.slide-heading')}`, '.slide:not(.slide-title):not(.slide-section) h2, .slide:not(.slide-title):not(.slide-section) h3, .slide:not(.slide-title):not(.slide-section) p, .slide:not(.slide-title):not(.slide-section) li', 'background-color:var(--role-content-background);');
  rule(`${kind('divider')} .slide-heading`, '', 'background:transparent;');
  const columns = cards.layout === 'rows' ? 1 : cards.layout === 'grid' ? Math.min(2, Number(cards.count)) : Number(cards.count);
  rule(kind('cards'), '.slide', 'container-type:inline-size;');
  // The template centers fixed-height slides. Safe centering keeps the beginning
  // of long generated content reachable when the slide needs vertical scrolling.
  if (canonical) blocks.push('.slide.active{justify-content:safe center;}');
  rule(selector('.slide-cards'), '.cards-grid', `display:grid; grid-template-columns:repeat(${columns},minmax(0,1fr)); gap:1rem; align-items:stretch;`);
  rule(selector('.slide-card'), '.card', `min-width:0; overflow-wrap:anywhere; background:var(--role-content-background); color:var(--role-body); padding:1.1rem; border-radius:${cards.look === 'filled' ? '1rem' : '.3rem'}; border:${cards.look === 'outline' ? '2px solid var(--role-accent)' : '0'}; box-shadow:${cards.look === 'filled' ? 'inset 0 0 0 2px var(--role-accent)' : 'none'};`);
  if (cards.look === 'rail') rule(selector('.slide-card'), '.card', 'border-left:5px solid var(--role-accent);');
  if (cards.look === 'band') rule(selector('.slide-card'), '.card', 'border-top:8px solid var(--role-accent);');
  rule(selector('.slide-card h3'), '.card h4', 'color:var(--role-heading); margin:0 0 .6rem; font-size:1.25rem;');
  rule(selector('.slide-card .slide-body'), '', 'margin:0; font-size:.92rem;');
  rule(selector('.slide-card li'), '.content-list li', 'color:var(--role-body);');
  rule(`${selector('.slide-card ul')}, ${selector('.slide-card ol')}`, '', 'padding-left:1.2rem;');
  rule(selector('.slide-title-bar'), '', 'padding: .8rem 0; margin:0 0 1rem; border-bottom:3px solid var(--role-accent);');
  rule(`${selector('.slide-title-bar')} .slide-heading`, '', 'margin:0;');
  rule(selector('.slide-heading'), '', 'font-size:clamp(1.55rem,3vw,2.25rem); margin:0 0 1rem; line-height:1.2;');
  // Reserve the frame inside the box so it cannot be clipped or covered by media.
  // Decorative keylines separate the exact chosen accent from matching surfaces.
  const videoKeyline = `var(--${inkFor(catalog, design.roles.accent)})`;
  rule(selector('.slide-video-frame'), '.video-container', `box-sizing:border-box; width:100%; max-width:100%; aspect-ratio:16/9; min-width:0; min-height:0; overflow:hidden; background:${video.frame === 'accent' ? videoKeyline : 'var(--role-sidebar)'}; color:var(--role-sidebar-ink); border:${video.frame === 'accent' ? '6px solid var(--role-accent)' : '0'}; padding:${video.frame === 'accent' ? '2px' : '0'}; outline:${video.frame === 'accent' ? `2px solid ${videoKeyline}` : '0'}; outline-offset:-2px; box-shadow:none; display:grid; grid-template: minmax(0,1fr) / minmax(0,1fr); place-items:stretch; border-radius:.5rem;`);
  rule(selector('.slide-video-frame > span'), '.video-container > video, .video-container > iframe', 'position:static; display:block; box-sizing:border-box; width:100%; height:100%; min-width:0; min-height:0; max-width:100%; background:var(--role-sidebar); object-fit:contain; border:0; border-radius:0!important; box-shadow:none!important;');
  rule(selector('.slide-video-frame > span'), '', 'display:grid; place-items:center;');
  rule(`${kind('video')} .slide-heading`, '.slide-video h2', `font-size:${video.titleStyle === 'large' ? '2.6rem' : video.titleStyle === 'caps' ? '1.2rem' : '2rem'}; text-transform:${video.titleStyle === 'caps' ? 'uppercase' : 'none'}; letter-spacing:${video.titleStyle === 'caps' ? '.08em' : 'normal'};`);
  if (video.layout === 'side') rule(`${kind('video')} .slide-video-layout`, '.slide-video.active', 'display:grid; grid-template-columns:minmax(0,1fr) minmax(0,2fr); gap:1.5rem; align-items:center;');
  if (video.layout === 'banner') rule(`${kind('video')} .slide-heading`, '.slide-video h2', 'padding:.8rem; border-bottom:4px solid var(--role-accent);');
  rule(selector('.slide-activity'), '.activity-box', `padding:1.5rem; border:2px solid var(--role-accent); border-radius:.5rem; background:var(--role-content-background);`);
  if (activity.layout === 'callout') rule(selector('.slide-activity'), '.activity-box', 'border:0; border-left:6px solid var(--role-accent); border-radius:0;');
  if (activity.layout === 'side') rule(selector('.slide-activity'), '.activity-box', 'display:grid; grid-template-columns:minmax(0,1fr) minmax(0,2fr); gap:1.5rem; align-items:start;');
  rule(selector('.slide-activity-label'), '.activity-label', `font-family:var(--font-${activity.labelStyle === 'heading' ? 'heading' : 'body'}); color:var(--role-heading); font-size:${activity.labelStyle === 'heading' ? '1.5rem' : '.95rem'}; text-transform:${activity.labelStyle === 'caps' ? 'uppercase' : 'none'};`);
  if (activity.labelStyle === 'pill' || activity.layout === 'banner') rule(selector('.slide-activity-label'), '.activity-label', `display:${activity.layout === 'banner' ? 'block' : 'inline-block'}; border:2px solid var(--role-accent); padding:.5rem .8rem; border-radius:${activity.layout === 'banner' ? '0' : '2rem'};`);
  blocks.push(`@media(max-width:600px) { ${scope} {padding:1.25rem;min-height:300px;} ${selector('.slide-cards')} {grid-template-columns:repeat(${cards.layout === 'rows' || cards.count === '1' ? 1 : 2},minmax(0,1fr));gap:.7rem;} ${selector('.slide-card')} {padding:.8rem;} ${selector('.slide-video-layout')},${selector('.slide-activity')} {grid-template-columns:1fr;} }`);
  // The editor's preview can be narrow even on a desktop-sized viewport. Reflow
  // boxes against their actual slide width, including enlarged text in rem units.
  const cardGrids = `${selector('.slide-cards')}${canonical ? ', .cards-grid' : ''}`;
  blocks.push(`@container(max-width:38rem){${cardGrids}{grid-template-columns:repeat(${Math.min(columns,2)},minmax(0,1fr));}}`);
  blocks.push(`@container(max-width:22rem){${cardGrids}{grid-template-columns:minmax(0,1fr);}}`);
  // A narrow preview behaves like collapsed lesson navigation. The native sample
  // disclosure shows the vertical panel without taking width from the main copy.
  blocks.push(`@container(max-width:40rem){${selector('.slide-sidebar')}{display:none;}${selector('.slide-sidebar-disclosure')}{display:block;grid-column:1 / -1;margin:1rem 1.25rem 0;}${selector('.slide-content')}{grid-column:1 / -1;}}`);
  blocks.push(`@container(max-width:30rem){${selector('.slide-video-layout')},${selector('.slide-activity')}{grid-template-columns:minmax(0,1fr);}}`);
  if (canonical && video.layout === 'side') blocks.push('@media(max-width:600px){.slide-video.active{grid-template-columns:minmax(0,1fr);}}');
  const layouts = {
    frame: {root:'border:2px solid var(--role-accent);outline:12px solid var(--role-title-background);outline-offset:-14px;padding-inline:12%;justify-items:center;text-align:center;',heading:'max-width:18ch;',accent:'width:32px;height:3px;'},
    headline: {root:'justify-items:start;grid-template-rows:0 auto auto auto auto auto 1fr;',heading:'font-size:clamp(2rem,8cqw,6rem);max-width:12ch;line-height:1;letter-spacing:-.03em;',accent:'width:100%;height:2px;'},
    sidebar: {root:'padding-left:20%;',heading:'max-width:18ch;',accent:'position:absolute;grid-area:auto;left:10%;top:24%;height:52%;width:5px;'},
    horizon: {root:'justify-items:center;text-align:center;grid-template-rows:1fr auto auto auto auto auto 1fr;',heading:'max-width:24ch;',accent:'width:100%;height:2px;margin-block:16px 28px;'},
    corner: {root:'grid-template-rows:0 auto auto auto auto auto 1fr;justify-items:start;padding-top:48px;',heading:'max-width:13ch;font-size:clamp(1.5rem,4cqw,3rem);',accent:'width:40px;'},
    masthead: {root:'grid-template-rows:0 auto auto auto auto auto 1fr;padding-top:140px;',heading:'max-width:24ch;',accent:'position:absolute;grid-area:auto;top:110px;left:6%;width:88%;height:6px;'},
    columns: {root:'grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:10%;',heading:'grid-column:1;grid-row:3 / 6;max-width:12ch;',body:'grid-column:2;grid-row:3 / 6;align-self:center;max-width:24ch;',accent:'position:absolute;grid-area:auto;left:50%;top:28%;height:44%;width:2px;'},
    plaque: {root:'padding-inline:16%;justify-items:start;',heading:'border:2px solid var(--role-accent);padding:24px;max-width:22ch;',body:'padding-inline:24px;',accent:'display:none;'}
  };
  const composition=layouts[title.layout];
  if(composition){
    rule(kind('title'),'.slide-title',composition.root);
    rule(`${kind('title')} .slide-title-text`,'.slide-title h1',composition.heading);
    rule(`${kind('title')} .slide-subtitle`,'.slide-title .subtitle',composition.body||'');
    rule(`${kind('title')} .slide-accent`,'.slide-title .divider',composition.accent);
  }
  blocks.push(...roleStyleCss(catalog,design,scope,canonical));
  blocks.push(...featureStyleCss(catalog,design,scope,canonical));
  return `${blocks.join('\n')}\n`;
}

function featureStyleCss(catalog,design,scope,canonical) {
  const blocks=[],hex=id=>findColor(catalog,id).hex;
  const selectors={sidebar:[':is(.slide-sidebar,.slide-sidebar-drawer,.slide-sidebar-disclosure > summary)',':is(.sidebar,.sidebar-toggle)'],button:['.slide-button',':is(.download-btn,.video-btn)'],box:['.slide-card','.cards-grid .card'],titlebar:['.slide-title-bar','.bespoke-title-bar'],video:['.slide-video-frame','.video-container'],activity:['.slide-activity','.activity-box']};
  for(const [feature,saved] of Object.entries(design.featureStyles||{})) {
    const style=effectiveFeatureStyle(catalog,design,feature),[preview,lesson]=selectors[feature];
    const rule=(suffix,css)=>blocks.push(`${scope} ${preview}${suffix}${canonical?`, ${lesson}${suffix}`:''}{${css}}`);
    if(['sidebar','button'].includes(feature)) {
      const font=catalog.fonts.find(item=>item.id===style.font);
      rule('',`background:${hex(style.background)}!important;color:${hex(style.color)}!important;font-family:"${font.family}",${font.fallback}!important;`);
      rule(' *','font-family:inherit!important;');
      rule(' :not(.sample-badge):not(.chapter-badge)','color:inherit!important;');
    } else {
      if(saved.background!=='inherit'){
        rule('',`background:${hex(style.background)}!important;`);
        if(feature==='video')rule(' > span',`background:${hex(style.background)}!important;color:${hex(style.color)}!important;`);
        else rule(' :is(h2,h3,h4,p,li,.slide-body,.slide-activity-label)','background:transparent!important;');
      }
      if(saved.border!=='inherit'){
        rule('',`border-color:${hex(style.border)}!important;`);
        if(feature==='box'&&design.slides.cards.look==='filled')rule('',`box-shadow:inset 0 0 0 2px ${hex(style.border)}!important;`);
        if(feature==='activity')blocks.push(`${scope} .slide-activity .slide-activity-label${canonical?', .activity-box .activity-label':''}{border-color:${hex(style.border)}!important;}`);
        if(feature==='video'&&design.slides.video.frame==='accent')rule('',`outline-color:${hex(inkFor(catalog,style.border))}!important;background:${hex(inkFor(catalog,style.border))}!important;`);
      }
    }
  }
  return blocks;
}

/** Inert by design: preview actions have no navigation, download, or submit behavior. */
export function renderSampleButton(label = 'Sample handout') {
  return `<button type="button" class="slide-button" aria-label="${escape(label)} (preview only)">${escape(label)}</button>`;
}

/** Sample copy demonstrates reusable visual roles only; it never becomes instructor lesson content. */
export function renderSlide(catalog, design, kind, options = {}) {
  const errors = structuralErrors(catalog, design);
  if (errors.length) throw new Error(errors.join(' '));
  if (!catalog.slideGroups.some(group => group.id === kind)) throw new Error(`Unknown slide role: ${kind}`);
  const title = escape(options.title ?? design.samples.title);
  const subtitle = escape(options.subtitle ?? design.samples.subtitle);
  if (options.logoUrl && (!/^(?:\.\.?\/)*(?:[\w -]+\/)*[\w -]+\.(?:png|svg|webp)$/.test(options.logoUrl))) throw new Error('Use an existing relative local logo asset.');
  const logo = options.logoUrl ? `<img class="slide-logo" src="${escape(options.logoUrl)}" alt="SPOKES" width="80" height="80">` : '<div class="slide-logo" aria-label="SPOKES sample brand">SPOKES</div>';
  const attributes = Object.entries(design.slides[kind]).map(([key, value]) => `data-${kebab(key)}="${escape(value)}"`).join(' ');
  const currentChapter = kind === 'activity' ? 6 : 2;
  const currentSlide = escape(design.roleStyles?.[kind]?effectiveRoleStyle(catalog,design,kind).headingText:{cards:'Build a useful habit',video:'See a skill in action',activity:'Try it together'}[kind]);
  const chapters = [['w','Warm-Up'],['i','Introduction'],['p','Sample chapter 1'],['p','Sample chapter 2'],['p','Sample chapter 3'],['e','Evaluation'],['a','Application']];
  const arrow = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1 7 5 3 9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  const navigation = '<div class="sample-sidebar-note">Sample sidebar</div><div class="sample-sidebar-title">'+escape(options.lessonTitle || 'Sample lesson')+'</div><ul class="sample-chapters">'+chapters.map(([badge,label],index)=>'<li><div class="sample-chapter"'+(index===currentChapter?' data-current="true"':'')+'>'+arrow+'<span class="sample-badge" data-badge="'+badge+'">'+badge.toUpperCase()+'</span><span>'+label+'</span></div>'+(index===currentChapter?'<span class="sample-slide-name" aria-current="page">'+currentSlide+'</span>':'')+'</li>').join('')+'</ul><div class="sample-resources"><strong>Resources</strong><span>Sample handout</span></div><div class="sample-slide-counter">Sample slide · preview only</div>';
  const sidebar = '<aside class="slide-sidebar" aria-label="Sample chapter navigation">'+navigation+'</aside><details class="slide-sidebar-disclosure"><summary aria-label="Open or close the sample sidebar"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="2"/></svg><span>Sidebar · sample</span></summary><aside class="slide-sidebar-drawer" aria-label="Sample chapter navigation" tabindex="0">'+navigation+'</aside></details>';
  const boxes = design.samples.boxes.slice(0, Number(design.slides.cards.count)).map((text, index) => {
    const lines = text.split(/\n+/).filter(Boolean);
    const treatment = design.slides.cards.treatment;
    const copy = treatment === 'paragraph' ? `<p class="slide-body">${escape(text).replace(/\n/g, '<br>')}</p>` : `<${treatment === 'bullets' ? 'ul' : 'ol'} class="slide-body">${lines.map(line => `<li>${escape(line)}</li>`).join('')}</${treatment === 'bullets' ? 'ul' : 'ol'}>`;
    return `<section class="slide-card bespoke-box"><h3>${escape(design.roleStyles?.cards?.boxHeadings?.[index]??`Step ${index + 1}`)}</h3>${copy}</section>`;
  }).join('');
  const views = {
    title: `${logo}<h2 class="slide-title-text">${title}</h2><div class="slide-accent" aria-hidden="true"></div><p class="slide-subtitle">${subtitle}</p>`,
    divider: `<span class="slide-watermark" aria-hidden="true">02</span><p class="slide-body">CHAPTER TWO</p><h2 class="slide-heading">Put it into practice</h2><p class="slide-body">One clear step at a time</p>`,
    cards: `${sidebar}<div class="slide-content">${design.slides.cards.titleBar ? '<header class="slide-title-bar bespoke-title-bar"><h2 class="slide-heading">Build a useful habit</h2></header>' : ''}<div class="slide-cards bespoke-boxes">${boxes}</div></div>`,
    video: `${sidebar}<div class="slide-content"><div class="slide-video-layout"><h2 class="slide-heading">See a skill in action</h2><div class="slide-video-frame" role="img" aria-label="Sample video placeholder; no video is loaded"><span>▶ &nbsp; Sample video</span></div></div><p>${renderSampleButton('Sample video action')}</p></div>`,
    activity: `${sidebar}<div class="slide-content"><h2 class="slide-heading">Try it together</h2><div class="slide-activity"><span class="slide-activity-label">Partner practice</span><p class="slide-body">Choose one next step. Tell a partner what you will try, and ask what could make it easier.</p></div><p>${renderSampleButton()}</p></div>`
  };
  if(design.roleStyles?.[kind]) {
    const style=effectiveRoleStyle(catalog,design,kind);
    if(kind!=='title') {
      const headings={divider:'Put it into practice',cards:'Build a useful habit',video:'See a skill in action',activity:'Try it together'};
      views[kind]=views[kind].replace(`<h2 class="slide-heading">${headings[kind]}</h2>`,()=>`<h2 class="slide-heading">${escape(style.headingText).replace(/\n/g,'<br>')}</h2>`);
      if(kind==='divider') views[kind]=views[kind].replace('One clear step at a time',()=>escape(style.bodyText).replace(/\n/g,'<br>'));
      if(kind==='activity') views[kind]=views[kind].replace('Choose one next step. Tell a partner what you will try, and ask what could make it easier.',()=>escape(style.bodyText).replace(/\n/g,'<br>'));
      if(kind==='video'&&style.bodyVisible) views[kind]=views[kind].replace('<p><button',()=>`<p class="slide-body">${escape(style.bodyText).replace(/\n/g,'<br>')}</p><p><button`);
      if(kind==='divider'&&(design.roleStyles[kind].labelText!==null||!style.labelVisible)) views[kind]=views[kind].replace('<p class="slide-body">CHAPTER TWO</p>',()=>`<p class="slide-body slide-chapter-label">${escape(style.labelText)}</p>`);
      if(kind==='activity') views[kind]=views[kind].replace('<span class="slide-activity-label">Partner practice</span>',()=>`<span class="slide-activity-label">${escape(style.labelText)}</span>`);
    }
    if(style.watermarkMode==='text') {
      const watermark=`<div class="role-watermark" aria-hidden="true">${escape(style.watermarkText)}</div>`;
      if(['title','divider'].includes(kind)) views[kind]=style.watermarkPlacement.startsWith('top')?watermark+views[kind]:views[kind]+watermark;
      else if(style.watermarkPlacement.startsWith('top')) views[kind]=views[kind].replace('<div class="slide-content">',()=>'<div class="slide-content">'+watermark);
      else views[kind]=views[kind].replace(/<\/div>$/,()=>watermark+'</div>');
    }
  }
  const extra=effectiveRoleStyle(catalog,design,kind);
  if(extra.extraText!==null) {
    const text=`<p class="slide-extra-text">${escape(extra.extraText).replace(/\n/g,'<br>')}</p>`;
    if(['title','divider'].includes(kind))views[kind]+=text;
    else views[kind]=views[kind].replace(/<\/div>$/,()=>text+'</div>');
  }
  return `<article class="bespoke-slide" data-kind="${kind}" ${attributes} aria-label="${escape(catalog.slideGroups.find(group => group.id === kind).label)} sample">${views[kind]}</article>`;
}

/** v1 stays available in its original backup. Mapping is deliberately disclosed, never described as lossless. */
export function migrateV1(payload, catalog, meta = {}) {
  const theme = payload?.theme;
  if (!object(theme)) throw new Error('The older design has no theme to recover.');
  const design = defaultDesign(catalog);
  const warnings = ['This is a new editable version of the older design. Keep the original v1 backup to reopen its exact chapter-specific styling.'];
  const colorLeads = { blue: ['primary', 'dark', 'primary'], royal: ['royal', 'dark', 'royal'], green: ['accent', 'primary', 'primary'], mauve: ['mauve', 'royal', 'mauve'], gold: ['muted-gold', 'primary', 'muted-gold'], 'dual-blue-green': ['primary', 'accent', 'primary'], 'dual-gold-green': ['muted-gold', 'accent', 'muted-gold'], 'dual-mauve-blue': ['mauve', 'primary', 'mauve'], 'dual-mauve-gold': ['mauve', 'muted-gold', 'mauve'] };
  const lead = colorLeads[theme.colorLead];
  if (lead) {
    [design.roles.titleBackground, design.roles.titleBackgroundEnd, design.roles.heading] = lead;
    design.roles.accent = lead[2]; design.roles.button = lead[2]; design.roles.dividerBackground = lead[0];
  } else warnings.push(`The old color lead ${theme.colorLead || '(missing)'} is unavailable; review every color.`);
  if (findColor(catalog, theme.sidebarColor)) design.roles.sidebar = theme.sidebarColor;
  const pair = (meta.fontPairings || catalog.fontPairings || []).find(item => item.id === theme.fontPairing);
  if (pair) for (const role of ['heading', 'body']) { const font = catalog.fonts.find(item => item.family === pair[role]); if (font) design.fonts[role] = font.id; }
  else warnings.push('The old font pairing could not be resolved; review the independent font choices.');
  if (catalog.backgrounds.some(item => item.id === theme.backgroundTexture)) design.background = theme.backgroundTexture;
  else if (theme.backgroundTexture === 'dark-royal') { design.background = 'plain'; design.roles.contentBackground = 'royal'; design.roles.heading = 'light'; design.roles.body = 'light'; warnings.push('Dark Royal was converted to a plain Royal surface with White text. Review the new component styling.'); }
  const titles = { 'centered-gradient': 'center', 'split-hero': 'split', 'offset-left': 'left', 'bottom-anchored': 'bottom' };
  design.slides.title.layout = titles[theme.titleSlide] || 'center';
  if (!titles[theme.titleSlide]) warnings.push(`Title style ${theme.titleSlide || '(missing)'} has no exact new equivalent; a centered layout is shown.`);
  const dividers = { 'gradient-sweep': 'center', 'centered-badge': 'center', 'bold-full-bleed': 'center', 'gold-rail': 'left', 'framed-gold': 'center' };
  design.slides.divider.layout = dividers[theme.dividerStyle] || 'center';
  warnings.push(`Divider ${theme.dividerStyle || '(missing)'} is approximated by the new divider controls; compare the original before accepting.`);
  const cards = { 'left-border': 'rail', outlined: 'outline', 'sharp-border': 'outline', pill: 'filled', layered: 'filled', 'stamp-frame': 'outline' };
  const oldCard = theme.cards?.lessonWide;
  design.slides.cards.look = cards[oldCard] || 'rail';
  warnings.push(`Cards (${oldCard || 'older styling'}) use the closest new reusable box style. Box count, title bar and text treatment need review.`);
  if (theme.cards?.varyByChapter) warnings.push('Different card styles by chapter are retained only in the original backup; this builder edits one reusable content design.');
  const oldSamples = payload.previewSamples || payload.samples || {};
  const sampleTitle = oldSamples.title || payload.lesson?.displayTitle || payload.lesson?.title;
  if (typeof sampleTitle === 'string') design.samples.title = truncateSample(sampleTitle, catalog.sampleLimits.title);
  const sampleSubtitle = oldSamples.subtitle ?? payload.lesson?.subtitle;
  if (typeof sampleSubtitle === 'string') design.samples.subtitle = truncateSample(sampleSubtitle, catalog.sampleLimits.subtitle);
  if (typeof payload.sampleContent?.bullets === 'string') { design.samples.boxes[0] = truncateSample(payload.sampleContent.bullets, catalog.sampleLimits.box); design.slides.cards.treatment = 'bullets'; }
  if (typeof payload.sampleContent?.mythReality === 'string') design.samples.boxes[1] = truncateSample(payload.sampleContent.mythReality, catalog.sampleLimits.box);
  warnings.push(...contrastIssues(catalog, design).map(issue => `Contrast advisory: ${issue.message}`));
  return { design, warnings };
}
