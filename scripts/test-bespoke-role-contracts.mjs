#!/usr/bin/env node
// Optional role-style contracts. Synthetic selections; no hosted or persistent service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import meta from '../bespoke/catalog.json' with { type: 'json' };
import * as Model from '../bespoke/builder-model.mjs';
import { selectionErrors, digest } from '../netlify/functions/_shared/selection.mjs';
import { compareDesign } from '../bespoke/similarity.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const payload = () => ({ schema: 'bespoke-selection/v2', date: '2026-09-24', lesson: { id: 'money-management', title: 'Synthetic role customization' }, team: { spokesperson: { name: 'Synthetic reviewer' } }, design: Model.defaultDesign(catalog) });
const sha = value => createHash('sha256').update(value).digest('hex');
const markup = design => Object.fromEntries(catalog.slideGroups.map(group => [group.id, Model.renderSlide(catalog, design, group.id)]));
const legacyFixture = () => JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
function customDesign(index = 0) {
  const design = Model.defaultDesign(catalog);
  design.roleStyles = Object.fromEntries(catalog.slideGroups.map((group, roleIndex) => {
    const style = Model.roleStyleDefaults(catalog,design,group.id);
    Object.assign(style, { backgroundMode:'gradient', primary:catalog.palette[(index+roleIndex)%11].id, secondary:catalog.palette[(index+roleIndex+2)%11].id, direction:['right','down','diagonal'][index%3], pattern:catalog.backgrounds[index%5].id, patternStrength:['subtle','normal','bold'][index%3], headingColor:catalog.palette[(index+roleIndex+4)%11].id, bodyColor:catalog.palette[(index+roleIndex+6)%11].id, headingFont:catalog.fonts[(index+roleIndex)%12].id, bodyFont:catalog.fonts[(index+roleIndex+6)%12].id, headingSize:'large',bodySize:'small',headingAlignment:'right',bodyAlignment:'left',headingVisible:true,bodyVisible:true,watermarkMode:'text',watermarkText:'Synthetic 🎓 mark',watermarkColor:catalog.palette[(index+roleIndex+8)%11].id,watermarkSize:'large',watermarkPlacement:'top-left',watermarkOpacity:'high' });
    if(group.id!=='title')style.headingText=`Synthetic ${group.id} heading 🎓`;
    if(!['title','cards'].includes(group.id))style.bodyText=`Synthetic ${group.id} supporting copy — café`;
    if(['divider','activity'].includes(group.id))style.labelText=`Synthetic ${group.id} label 🎓`;
    return [group.id,style];
  }));
  return design;
}
function pythonResult(selection) {
  const program = `import json,sys\nsys.path.insert(0,"scripts")\nfrom bespoke_model import model_result\nfrom bespoke_support import selection_digest\np=json.load(sys.stdin)\nr=model_result(p,"design")\nif not r["errors"]:r["digest"]=selection_digest(p)\nprint(json.dumps(r))`;
  return JSON.parse(execFileSync('python3',['-c',program],{cwd:root,input:JSON.stringify(selection),encoding:'utf8',maxBuffer:4*1024*1024}));
}

// Committed1462262 appearance: extension support must not rewrite older designs.
const priorAppearance = {
  default: ['5eb1e8740a751810bd41e46dc70cb371e121d9f6965df47112dba08ca300e7ec', 'bcc22e3520b7c1966ad2efa0d3859afea1eaa93a8538068b39c2e3c1462d4cb9'],
  professional: ['c6b5f28411c43d4c85d0da493d3eb565a69455e4d558f74adebf7a5040333f80', 'bcc22e3520b7c1966ad2efa0d3859afea1eaa93a8538068b39c2e3c1462d4cb9'],
  modern: ['813deab95863b519caa4d069b799928db62706d0232cfecf942b414a98e1c6f3', 'cfa3773754ebfb17c0b577ac487b441c68eed0c67762714cde275c314a5b423d'],
  serious: ['697eafdb5f6819b951dbc4cf91f27683016ab15643f1fb7b15ec152030cb9920', 'aad50c4d822d003ceb92f78ee65b57f9b9d0736fe01e26fe665344b538b7e3f8'],
  'light-hearted': ['b20ad1a5a58c0ebf482ee0db99ec8048d1e5eaebbfade03114d4e409c72ec3d5', '443e03196325c288024935d27ea5bcbe9a30396b5da4d6249d1b6d835f71e5f6'],
  fun: ['458da934de7313d12c9ea71608ef6defe2a7711a7ce944eb8462d17b68e927bc', '615d46242267a52a6bc7c8de0c852d9469ed5d75b23ca81cd5bde56744413610'],
  outspoken: ['b4257be3a42b8fc8bd8f481b4e1c53fb6e3596b43582a0a555d89ac7b2a8ad6d', '227f1f08258c8c12172384687ee465e7c9f70c3fc27467dd992aa84a899f717f'],
};

test('default and six old v2 presets preserve exact CSS and markup without the optional extension', () => {
  // The looks teams could have saved before the presets were redesigned; this proves they still render byte for byte the same.
  const oldPresets = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/presets-2026-09.json'), 'utf8'));
  for (const [id, design] of [['default', Model.defaultDesign(catalog)], ...oldPresets.map(preset => [preset.id, structuredClone(preset.design)])]) {
    const before = structuredClone(design);
    assert.deepEqual(selectionErrors({ ...payload(), design }, 'money-management'), [], id);
    assert.equal(sha(Model.cssForDesign(catalog, design)), priorAppearance[id][0], `${id}: CSS changed without roleStyles`);
    assert.equal(sha(JSON.stringify(markup(design))), priorAppearance[id][1], `${id}: markup changed without roleStyles`);
    assert.deepEqual(design, before);
    assert.equal(Object.hasOwn(design, 'roleStyles'), false);
  }
  const legacy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json'), 'utf8'));
  const before = structuredClone(legacy);
  const migrated = Model.migrateV1(legacy, catalog, meta).design;
  assert.equal(Object.hasOwn(migrated, 'roleStyles'), false);
  assert.deepEqual(legacy, before);
  assert.deepEqual(selectionErrors({ ...payload(), design: migrated, legacySelection: legacy }, 'money-management'), []);
});

test('optional complete role styles share the generated schema and allow all brand colors and fonts', () => {
  execFileSync(process.execPath,['scripts/generate-selection-v2-schema.mjs','--check'],{cwd:root});
  const schema=JSON.parse(fs.readFileSync(path.join(root,'bespoke/selection-v2.schema.json'),'utf8'));
  assert.equal(schema.properties.design.required.includes('roleStyles'),false);
  assert.deepEqual(schema.properties.design.properties.roleStyles,Model.roleStylesSchema(catalog));
  assert.deepEqual(selectionErrors({...payload(),design:{...payload().design,roleStyles:{}}},'money-management'),[]);
  const rotations=Array.from({length:12},(_,index)=>customDesign(index));
  for(const design of rotations){
    const before=structuredClone(design);
    assert.deepEqual(Model.validateDesign(catalog,design),[]);
    assert.deepEqual(selectionErrors({...payload(),design},'money-management'),[]);
    assert.deepEqual(design,before);
  }
  for(const group of catalog.slideGroups){
    for(const field of ['primary','secondary','headingColor','bodyColor','watermarkColor'])assert.equal(new Set(rotations.map(d=>d.roleStyles[group.id][field])).size,11);
    for(const field of ['headingFont','bodyFont'])assert.equal(new Set(rotations.map(d=>d.roleStyles[group.id][field])).size,12);
  }
  const partial=payload();partial.design.roleStyles={title:Model.roleStyleDefaults(catalog,partial.design,'title')};
  assert.deepEqual(selectionErrors(partial,'money-management'),[]);
});

test('closed role styles reject malformed choices, unsupported partial records and invalid Unicode', () => {
  const cases=[
    p=>{p.design.roleStyles=null;},p=>{p.design.roleStyles=[];},p=>{p.design.roleStyles.chapter={};},
    p=>{p.design.roleStyles.title={};},p=>{delete p.design.roleStyles.title.direction;},
    p=>{p.design.roleStyles.title.extra='unrecognized';},
    p=>{Object.defineProperty(p.design.roleStyles.title,'__proto__',{value:{polluted:true},enumerable:true});},
    p=>{p.design.roleStyles.title.primary='#ffffff';},p=>{p.design.roleStyles.title.bodyFont='Franklin Gothic Book';},
    p=>{p.design.roleStyles.title.watermarkOpacity=.5;},p=>{p.design.roleStyles.title.headingVisible='false';},
    p=>{p.design.roleStyles.title.headingText='duplicate title';},p=>{p.design.roleStyles.title.bodyText='duplicate subtitle';},p=>{p.design.roleStyles.cards.bodyText='duplicate box copy';},
    p=>{p.design.roleStyles.divider.headingText='x'.repeat(201);},p=>{p.design.roleStyles.activity.bodyText='x'.repeat(1201);},
    p=>{p.design.roleStyles.video.watermarkText='x'.repeat(41);},p=>{p.design.roleStyles.activity.bodyText='Invalid\ud800copy';},
    p=>{p.design.roleStyles.divider.headingText='🎓'.repeat(101);},p=>{p.design.roleStyles.video.watermarkText='🎓'.repeat(21);},
    p=>{p.design.roleStyles.title.direction='url(https://example.invalid)';},
    p=>{p.design.roleStyles.title.labelText='Unsupported label';},p=>{p.design.roleStyles.cards.labelText='Unsupported label';},p=>{p.design.roleStyles.video.labelText='Unsupported label';},
    p=>{p.design.roleStyles.activity.labelText='x'.repeat(81);},p=>{p.design.roleStyles.divider.labelText='🎓'.repeat(41);},
    p=>{p.design.roleStyles.divider.labelText='Invalid\ud800label';},p=>{p.design.roleStyles.activity.labelVisible='false';},
  ];
  for(const change of cases){
    const selection={...payload(),design:customDesign()};change(selection);
    assert(selectionErrors(selection,'money-management').length,String(change));
    assert(pythonResult(selection).errors.length,String(change));
  }
  assert.equal(Object.prototype.polluted,undefined);
});

test('Python contracts preserve every override, advisory, selected font and escaped sample without flattening', () => {
  const selection={...payload(),design:customDesign(),legacySelection:legacyFixture()};
  selection.design.roleStyles.activity.bodyText='<img src=x onerror=alert(1)> Literal sample & café 🎓';
  selection.design.roleStyles.divider.labelText='Chapter <& 🎓';
  selection.design.roleStyles.video.watermarkText='</style><script>0</script>';
  const before=structuredClone(selection),result=pythonResult(selection);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.digest,digest(selection));
  assert.equal(result.css,Model.cssForDesign(catalog,selection.design));
  assert.deepEqual(result.markup,markup(selection.design));
  assert.deepEqual(result.warnings,Model.contrastIssues(catalog,selection.design).map(item=>item.message));
  assert(result.warnings.length,'Low contrast remains advisory for the selected overrides.');
  assert.deepEqual(result.fonts.map(font=>font.id).sort(),Model.usedFontIds(catalog,selection.design).sort());
  for(const font of result.fonts)assert(result.css.includes(`font-family: "${font.family}"`));
  assert(!Object.values(result.markup).some(html=>/<(?:script|img)\b/i.test(html)));
  assert(result.markup.activity.includes('&lt;img'));
  assert(result.markup.divider.includes('Chapter &lt;&amp; 🎓'));
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bespoke-role-artifacts-'));
  try{
    const program=`import importlib.util,json,sys\nfrom pathlib import Path\nsys.path.insert(0,"scripts")\ns=importlib.util.spec_from_file_location("writer","scripts/bespoke-write-submission.py")\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\np=json.load(sys.stdin)\nprint(m.write_submission(p,Path(sys.argv[1])))`;
    const destination=execFileSync('python3',['-c',program,directory],{cwd:root,input:JSON.stringify(selection),encoding:'utf8'}).trim();
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination,'selection.json'),'utf8')),selection);
    const contract=JSON.parse(fs.readFileSync(path.join(destination,'build-contract.json'),'utf8'));
    assert.deepEqual(contract.design,selection.design);
    assert.deepEqual(contract.fonts,result.fonts);
    assert.deepEqual(contract.contrastAdvisories,result.warnings);
    assert.deepEqual(contract.componentMarkup,result.markup);
    assert(!/<script\b/i.test(fs.readFileSync(path.join(destination,'component-samples.html'),'utf8')),'Watermark text cannot end the inline stylesheet and create executable markup.');
    assert(fs.readFileSync(path.join(destination,'content-intake.md'),'utf8').includes('Role-specific styles and sample copy'));
    const check=`import importlib.util,json,sys\nsys.path.insert(0,"scripts")\ns=importlib.util.spec_from_file_location("checker","scripts/bespoke-check-design.py")\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nc=json.load(open(sys.argv[1]))\nd=m.Deck();d.feed(open(sys.argv[2]).read())\nprint(json.dumps(m.check_components(c,d)))`;
    assert.deepEqual(JSON.parse(execFileSync('python3',['-c',check,path.join(destination,'build-contract.json'),path.join(destination,'component-samples.html')],{cwd:root,encoding:'utf8'})),[]);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
  assert.deepEqual(selection,before);
});

test('synthetic shared save, retry, history and staged service retain role styles exactly', async () => {
  const app=await createDevServer({port:0});
  const action=async(action,fields={})=>{const response=await fetch(app.baseUrl+'/api/bespoke',{method:'POST',body:JSON.stringify({action,lessonId:'money-management',editCode:LOCAL_PREVIEW_CODE,...fields})});return {status:response.status,body:await response.json()};};
  const selection={...payload(),design:customDesign()},first={selection,expectedRevision:null,mutationId:randomUUID()};
  try{
    const saved=await action('save',first);assert.equal(saved.status,200,JSON.stringify(saved.body));
    assert.equal((await action('save',first)).body.replayed,true);
    assert.deepEqual((await action('open')).body.selection,selection);
    const revised=structuredClone(selection);revised.design.roleStyles.title.headingColor='light';
    const next=await action('save',{selection:revised,expectedRevision:saved.body.revision,mutationId:randomUUID()});assert.equal(next.status,200);
    assert.equal((await action('save',{...first,mutationId:randomUUID()})).status,409);
    assert.deepEqual((await action('openRevision',{revision:saved.body.revision})).body.selection,selection);
    assert.deepEqual((await action('open')).body.selection,revised);
    assert.equal((await action('open',{editCode:'wrong-but-long-enough-synthetic'})).status,403);
  }finally{await app.close();}
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bespoke-role-stage-'));
  try{
    const stage=path.join(directory,'service');execFileSync(process.execPath,['scripts/bespoke-stage-service.mjs',stage],{cwd:root});
    const authority=await import(pathToFileURL(path.join(stage,'netlify/functions/_shared/selection.mjs')));
    assert.deepEqual(authority.selectionErrors(selection,selection.lesson.id),[]);
    assert.equal(fs.existsSync(path.join(stage,'fonts')),false);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('similarity resolves supported role overrides and reports unmeasured or mixed dimensions honestly', () => {
  const selection=payload(),design=selection.design;
  design.roleStyles={title:{...Model.roleStyleDefaults(catalog,design,'title'),primary:'gold',headingColor:'royal',headingFont:'inter',watermarkMode:'text',watermarkText:'Custom'},divider:{...Model.roleStyleDefaults(catalog,design,'divider'),headingColor:'gold',bodyColor:'royal'},cards:{...Model.roleStyleDefaults(catalog,design,'cards'),bodyFont:'inter'}};
  const reference={id:'synthetic',title:'Synthetic measured choices',roles:{titleBackground:'gold',titleText:'royal',body:design.roles.body},fonts:{heading:'inter',body:design.fonts.body},dividerText:{heading:'gold',supporting:'royal'}};
  const before=structuredClone(design),[result]=compareDesign({lessons:[reference]},design,catalog);
  for(const key of ['roles.titleBackground','roles.titleText','fonts.heading','dividerText.heading','dividerText.supporting'])assert(result.matches.some(item=>item.key===key),key);
  assert(result.unknown.some(item=>item.key==='fonts.body'&&item.reason.includes('different')));
  assert(result.unknown.some(item=>item.key==='roleStyles.title.watermarkText'));
  assert.equal(result.matches.some(item=>item.key==='fonts.body'),false);
  assert.deepEqual(design,before);
  design.roleStyles.title.headingVisible=false;
  const [hidden]=compareDesign({lessons:[reference]},design,catalog);
  for(const key of ['roles.titleText','fonts.heading','slides.title.layout'])assert(hidden.unknown.some(item=>item.key===key),key);
  const [withoutCatalog]=compareDesign({lessons:[reference]},design);
  assert(!withoutCatalog.matches.some(item=>['roles.titleText','fonts.heading'].includes(item.key)));
  design.roleStyles.divider.backgroundMode='gradient';
  const [gradient]=compareDesign({lessons:[{...reference,roles:{...reference.roles,dividerBackground:design.roles.dividerBackground}}]},design,catalog);
  assert(gradient.unknown.some(item=>item.key==='roles.dividerBackground'&&item.reason.includes('gradient')));
  design.roleStyles.activity={...Model.roleStyleDefaults(catalog,design,'activity'),labelVisible:false,labelText:'Synthetic label'};
  const [label]=compareDesign({lessons:[{...reference,slides:{activity:{labelStyle:design.slides.activity.labelStyle}}}]},design,catalog);
  assert(label.unknown.some(item=>item.key==='slides.activity.labelStyle'&&item.reason.includes('hidden')));
  assert(label.unknown.some(item=>item.key==='roleStyles.activity.labelText'&&item.reason.includes('Sample copy')));
});

test('preset replacement resets role visuals while retaining editable sample and watermark copy', () => {
  const design=customDesign();design.samples.boxes[3]='Recoverable hidden copy';
  design.roleStyles.activity.labelVisible=false;
  const next=Model.applyPreset(catalog,'modern',design);
  assert.deepEqual(next.samples,design.samples);
  for(const kind of catalog.slideGroups.map(group=>group.id)){
    assert.equal(next.roleStyles[kind].primary,'inherit');
    assert.equal(next.roleStyles[kind].headingFont,'inherit');
    assert.equal(next.roleStyles[kind].watermarkMode,'inherit');
    assert.equal(next.roleStyles[kind].labelVisible,true);
    for(const field of ['headingText','bodyText','labelText','watermarkText'])assert.equal(next.roleStyles[kind][field],design.roleStyles[kind][field]);
  }
});

test('legacy registry consumption rejects extended v2 explicitly without dropping its choices', () => {
  const selection={...payload(),design:customDesign()};
  const program=`import importlib.util,json,sys\nfrom copy import deepcopy\nsys.path.insert(0,"scripts")\ns=importlib.util.spec_from_file_location("apply","scripts/bespoke-apply-selection.py")\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\np=json.load(sys.stdin)\nt={"lessons":{}};l={"lessons":[]};before=deepcopy((p,t,l))\ntry:\n m.apply_selection(p,theme_registry=t,lesson_registry=l)\n raise AssertionError("Legacy consumer unexpectedly accepted v2")\nexcept ValueError as error:\n assert "legacy theme registry cannot represent" in str(error)\nassert (p,t,l)==before\nprint("Explicitly rejected; inputs and registries unchanged")`;
  assert.match(execFileSync('python3',['-c',program],{cwd:root,input:JSON.stringify(selection),encoding:'utf8'}),/Explicitly rejected/);
});
