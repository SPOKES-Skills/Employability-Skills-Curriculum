#!/usr/bin/env node
// Pure role-style contracts; no service, browser, teacher data, or lesson edits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { allBackgroundIds, applyPreset, contrastIssues, cssForDesign, defaultDesign, designSchema, effectiveRoleStyle, renderSlide, roleStyleDefaults, roleStylesSchema, setRoleStyle, structuralErrors, usedFontIds } from '../bespoke/builder-model.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../bespoke/builder-catalog.json',import.meta.url),'utf8'));
const kinds=['title','divider','cards','video','activity'];
const clone=value=>JSON.parse(JSON.stringify(value));
const start=()=>defaultDesign(catalog);
const set=(design,kind,entries)=>Object.entries(entries).reduce((next,[key,value])=>setRoleStyle(catalog,next,kind,key,value),design);
let checked=0;
function check(name,fn){fn();checked++;console.log(`PASS ${name}`);}

check('optional extension and all-inherited roles retain legacy source choices',()=>{
  const design=start(), original=clone(design);
  assert(!designSchema(catalog).required.includes('roleStyles'));
  assert.equal(roleStylesSchema(catalog).additionalProperties,false);
  for(const kind of kinds){
    const extended={...design,roleStyles:{[kind]:roleStyleDefaults(catalog,design,kind)}};
    assert.deepEqual(structuralErrors(catalog,extended),[]);
    assert.deepEqual(extended.roles,original.roles);
    assert.equal(renderSlide(catalog,extended,kind),renderSlide(catalog,design,kind));
  }
  const empty={...design,roleStyles:{}};
  assert.equal(cssForDesign(catalog,empty),cssForDesign(catalog,design));
  assert.deepEqual(contrastIssues(catalog,empty),contrastIssues(catalog,design));
});

check('roles inherit current global tokens without copying them into saved choices',()=>{
  let design=set(start(),'cards',{headingVisible:false});
  design.roles.contentBackground='mauve';design.fonts.heading='inter';
  assert.equal(effectiveRoleStyle(catalog,design,'cards').primary,'mauve');
  assert.equal(effectiveRoleStyle(catalog,design,'cards').headingFont,'inter');
  assert.equal(design.roleStyles.cards.primary,'inherit');
  assert.equal(design.roleStyles.cards.headingFont,'inherit');
  design=set(design,'cards',{primary:'gold'});design.roles.contentBackground='light';
  assert.equal(effectiveRoleStyle(catalog,design,'cards').primary,'gold');
});

check('each role independently accepts every palette color in every color field',()=>{
  for(const kind of kinds) for(const key of ['primary','secondary','headingColor','bodyColor','watermarkColor']) for(const color of catalog.palette){
    const original=start(),design=set(original,kind,{[key]:color.id});
    assert.deepEqual(structuralErrors(catalog,design),[]);
    assert.equal(effectiveRoleStyle(catalog,design,kind)[key],color.id);
    assert.deepEqual(original,start());
    for(const other of kinds.filter(item=>item!==kind)) assert.equal(renderSlide(catalog,design,other),renderSlide(catalog,original,other));
  }
});

check('all local fonts are included in standalone CSS independently of global pair',()=>{
  for(const kind of kinds) for(const type of ['heading','body']) for(const font of catalog.fonts){
    const design=set(start(),kind,{[type+'Font']:font.id}),css=cssForDesign(catalog,design,{fontBase:'./fonts'});
    assert(usedFontIds(catalog,design).includes(font.id));
    assert.equal(new Set(usedFontIds(catalog,design)).size,usedFontIds(catalog,design).length);
    for(const source of font.sources) assert(css.includes(`url("./fonts/${source.file}")`));
    assert(css.includes(`font-family:"${font.family}",${font.fallback}!important`));
  }
});

check('background modes, directions and approved texture strength remain independent',()=>{
  let design=set(start(),'title',{backgroundMode:'gradient',primary:'mauve',secondary:'accent',direction:'down',pattern:'crosshatch',patternStrength:'bold'});
  design.slides.title.layout='left';
  let css=cssForDesign(catalog,design);
  assert(css.includes('180deg in srgb'));
  assert(css.includes('0.21000000000000002')||css.includes('0.21'));
  design=set(design,'title',{backgroundMode:'solid'});css=cssForDesign(catalog,design);
  assert.equal(effectiveRoleStyle(catalog,design,'title').secondary,'accent');
  const last=css.slice(css.lastIndexOf('.bespoke-slide[data-kind="title"]'));
  assert(!last.includes('180deg in srgb'));
  for(const kind of kinds) for(const pattern of allBackgroundIds(catalog)) for(const strength of ['subtle','normal','bold']) assert.doesNotThrow(()=>cssForDesign(catalog,set(start(),kind,{pattern,patternStrength:strength})));
});

check('explicit split solid is one color; split gradient preserves the two-panel seam',()=>{
  let design=start();design.slides.title.layout='split';
  design=set(design,'title',{primary:'mauve',secondary:'gold',backgroundMode:'solid',pattern:'plain'});
  let css=cssForDesign(catalog,design);
  assert(css.includes('background-color:#a7253f!important;background-image:none!important;'));
  design=set(design,'title',{backgroundMode:'gradient'});css=cssForDesign(catalog,design);
  assert(css.includes('90deg in srgb, #a7253f 38%'));
});

check('title and cards keep their original single sample text sources',()=>{
  let design=set(start(),'title',{headingText:'Saved title',bodyText:'Saved subtitle'});
  assert.equal(design.samples.title,'Saved title');assert.equal(design.samples.subtitle,'Saved subtitle');
  assert(!design.roleStyles);
  design=set(design,'title',{headingColor:'gold'});
  assert.equal(design.roleStyles.title.headingText,null);assert.equal(design.roleStyles.title.bodyText,null);
  assert.equal(effectiveRoleStyle(catalog,design,'title').headingText,'Saved title');
  assert.throws(()=>set(design,'cards',{bodyText:'duplicate boxes'}));
  assert.equal(effectiveRoleStyle(catalog,design,'cards').bodyText,null);
});

check('hidden fields, fourth box, and edited sample words survive visibility and preset changes',()=>{
  let design=start();design.samples.boxes[3]='Keep the fourth box';design.slides.cards.count='1';
  design=set(design,'cards',{headingText:'Custom cards heading',bodyVisible:false});
  design=set(design,'activity',{headingText:'Custom activity',bodyText:'Hidden but recoverable',bodyVisible:false,watermarkText:'Custom decoration',watermarkMode:'off'});
  const before=clone(design),next=applyPreset(catalog,catalog.presets[0].id,design);
  assert.deepEqual(design,before);assert.deepEqual(next.samples,design.samples);
  assert.equal(effectiveRoleStyle(catalog,next,'activity').bodyText,'Hidden but recoverable');
  assert.equal(effectiveRoleStyle(catalog,next,'cards').headingText,'Custom cards heading');
  assert.equal(next.roleStyles.activity.watermarkText,'Custom decoration');
  assert.equal(next.roleStyles.activity.backgroundMode,'inherit');
  assert.equal(next.samples.boxes[3],'Keep the fourth box');
});

check('new copy is escaped as literal text even with replacement and HTML syntax',()=>{
  const payload='<img src=x onerror=alert(1)> $& " \' &';
  for(const kind of ['divider','cards','video','activity']){
    let design=set(start(),kind,{headingText:payload,bodyVisible:true});
    if(kind!=='cards') design=set(design,kind,{bodyText:payload});
    const html=renderSlide(catalog,design,kind);
    assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));assert(html.includes('$&amp;'));
  }
});

check('video supporting copy is opt-in and independent of the sample action',()=>{
  let design=set(start(),'video',{headingColor:'gold',bodyText:'Watch this skill'});
  assert.equal(effectiveRoleStyle(catalog,design,'video').bodyVisible,false);
  assert(!renderSlide(catalog,design,'video').includes('Watch this skill'));
  design=set(design,'video',{bodyVisible:true});
  const html=renderSlide(catalog,design,'video');
  assert(html.includes('<p class="slide-body">Watch this skill</p>'));
  assert(html.includes('Sample video action (preview only)'));
});

check('chapter and activity labels stay literal and recoverable independently of other copy',()=>{
  for(const kind of ['divider','activity']){
    let design=set(start(),kind,{labelText:'<b>Label $&</b>',headingVisible:false,bodyVisible:false,labelVisible:true});
    const html=renderSlide(catalog,design,kind);
    assert(html.includes('&lt;b&gt;Label $&amp;&lt;/b&gt;'));
    assert.equal(effectiveRoleStyle(catalog,design,kind).labelVisible,true);
    const preset=applyPreset(catalog,catalog.presets[0].id,design);
    assert.equal(preset.roleStyles[kind].labelText,'<b>Label $&</b>');
    design=set(design,kind,{labelVisible:false});
    assert.equal(design.roleStyles[kind].labelText,'<b>Label $&</b>');
    assert.throws(()=>set(design,kind,{labelText:'x'.repeat(81)}));
  }
  assert.throws(()=>set(start(),'cards',{labelText:'No duplicate label'}));
});

check('sample sidebar follows edited role heading without interpreting markup',()=>{
  for(const kind of ['cards','video','activity']){
    const design=set(start(),kind,{headingText:'<script>custom $&</script>'}),html=renderSlide(catalog,design,kind);
    const labels=[...html.matchAll(/class="sample-slide-name"[^>]*>(.*?)<\/span>/g)].map(match=>match[1]);
    assert.deepEqual(labels,['&lt;script&gt;custom $&amp;&lt;/script&gt;','&lt;script&gt;custom $&amp;&lt;/script&gt;']);
    assert(!html.includes('<script>'));
  }
});

check('custom watermarks are decorative, escaped and reserved in every placement',()=>{
  for(const kind of kinds) for(const placement of ['top-left','top-right','bottom-left','bottom-right']){
    const design=set(start(),kind,{watermarkMode:'text',watermarkText:'</style><script>x</script>',watermarkPlacement:placement,watermarkColor:'mauve',watermarkSize:'large',watermarkOpacity:'high'});
    const html=renderSlide(catalog,design,kind),css=cssForDesign(catalog,design);
    assert(html.includes('class="role-watermark" aria-hidden="true"'));
    assert(!html.includes('<script>'));assert(!css.includes('</style>'));assert(css.includes('\\3c '));
    assert(css.includes('position:static;inset:auto'));assert(css.includes('white-space:normal'));assert(css.includes('opacity:0.45'));
    assert(css.includes(' / "";'));
  }
});

check('visibility and typography rules affect role copy without hiding the separate sidebar',()=>{
  const design=set(start(),'activity',{headingVisible:false,bodyVisible:false,headingFont:'inter',bodyFont:'outfit',headingSize:'large',bodySize:'small',headingAlignment:'right',bodyAlignment:'center'});
  const html=renderSlide(catalog,design,'activity'),css=cssForDesign(catalog,design);
  assert(html.includes('Sample chapter navigation'));assert(html.includes('Choose one next step.'));
  const extension=css.slice(css.indexOf('.bespoke-slide[data-kind="activity"] :is(.slide-heading,.slide-activity-label)'));
  assert(extension.includes('text-align:right!important'));assert(extension.includes('text-align:center!important'));assert(extension.includes('display:none!important'));
  assert(!extension.includes('slide-sidebar'));
});

check('contrast warnings follow role compositions and never veto color selections',()=>{
  let design=set(start(),'cards',{backgroundMode:'solid',primary:'light',headingColor:'light',bodyColor:'light',pattern:'plain'});
  assert.deepEqual(structuralErrors(catalog,design),[]);
  let warnings=contrastIssues(catalog,design).filter(item=>item.kind==='cards');
  assert.equal(warnings.length,2);assert(warnings.every(item=>item.ratio===1&&item.related.includes('roleStyles.cards')));
  design=set(design,'cards',{headingVisible:false,bodyVisible:false});
  assert.equal(contrastIssues(catalog,design).filter(item=>item.kind==='cards').length,0);
  design=set(start(),'divider',{backgroundMode:'gradient',primary:'mauve',secondary:'accent',headingColor:'light',bodyColor:'light',pattern:'crosshatch',patternStrength:'bold'});
  warnings=contrastIssues(catalog,design).filter(item=>item.kind==='divider');
  assert(warnings.length);assert(warnings.every(item=>Number.isFinite(item.ratio)&&item.message.includes('sampled')));
});

check('closed complete styles reject unknown, partial, duplicate and malformed input',()=>{
  const valid=set(start(),'activity',{bodyText:'Fine'});
  for(const mutate of [d=>d.roleStyles.extra={},d=>delete d.roleStyles.activity.primary,d=>d.roleStyles.activity.surprise=true,d=>d.roleStyles.activity.headingVisible='yes',d=>d.roleStyles.activity.pattern='remote-image',d=>d.roleStyles.activity.primary='#ffffff',d=>d.roleStyles.activity.headingText='x'.repeat(201),d=>d.roleStyles.activity.bodyText='x'.repeat(1201),d=>d.roleStyles.activity.watermarkText='x'.repeat(41),d=>d.roleStyles.activity.watermarkText='\ud800',d=>d.roleStyles.activity=null,d=>d.roleStyles=[]]){
    const design=clone(valid);mutate(design);assert(structuralErrors(catalog,design).length);assert.throws(()=>renderSlide(catalog,design,'activity'));
  }
  assert.throws(()=>set(start(),'title',{headingText:'x'.repeat(catalog.sampleLimits.title+1)}));
  assert.throws(()=>set(start(),'activity',{madeUp:'choice'}));
});

console.log(`BeSpoke role model: ${checked} checks passed.`);
