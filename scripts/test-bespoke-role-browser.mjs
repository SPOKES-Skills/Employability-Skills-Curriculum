#!/usr/bin/env node
// Independent role-control acceptance: actual UI, computed paint/type, isolated
// synthetic service persistence. Never accesses a user's Safari or saved runtime.
import {builderDestination, clickMenuItem, openMoreMenu, recoveryMenu} from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserType, browserName, tabKey } from './bespoke-test-browser.mjs';
import { createDevServer, LOCAL_PREVIEW_CODE } from './bespoke-dev-server.mjs';
import { defaultDesign, roleStyleDefaults, roleStylesSchema } from '../bespoke/builder-model.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type:'json' };

const root=path.resolve(import.meta.dirname,'..');
const output=process.env.BESPOKE_REVIEW_DIR;
const focusOnly=process.env.BESPOKE_ROLE_FOCUS==='1';
if(output)await fs.mkdir(output,{recursive:true});
const legacy=JSON.parse(await fs.readFile(path.join(root,'scripts/test-fixtures/bespoke/selection-money-management.json'),'utf8'));
const axeSource=await fs.readFile(path.join(root,'node_modules/axe-core/axe.min.js'),'utf8');
const browser=await browserType.launch(),server=await createDevServer({port:0});
const contexts=[],errors=[],external=[],missing=[],evidence=[];
const stats={edits:0,paintChecks:0,typeChecks:0,pixelChecks:0,geometryChecks:0,axeScans:0};
const labels={title:'Title slide',divider:'Chapter divider',cards:'Text boxes',video:'Video slide',activity:'Activity'};
const headings={title:'.slide-title-text',divider:'.slide-heading',cards:'.slide-heading, .slide-card h3',video:'.slide-heading',activity:'.slide-heading, .slide-activity-label'};
const bodies={title:'.slide-subtitle',divider:'.slide-body:last-of-type',cards:'.slide-card .slide-body',video:'.slide-body',activity:'.slide-body'};
const rgb=id=>{const c=catalog.palette.find(c=>c.id===id);return `rgb(${[1,3,5].map(i=>parseInt(c.hex.slice(i,i+2),16)).join(', ')})`;};
const draft=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design=async page=>(await draft(page)).design;
const slide=page=>page.locator('#modelStage .bespoke-slide');
const layer=page=>page.locator('#modelStage .bespoke-slide');
const node=(page,kind,part)=>page.locator('#modelStage').locator((part==='heading'?headings:bodies)[kind]).first();
const payload=d=>({schema:'bespoke-selection/v2',date:'2026-09-24',lesson:legacy.lesson,team:{name:'Synthetic role QA',spokesperson:{name:'Sample Instructor',email:'sample@example.org'}},design:d});
async function ready(page){await page.locator('#localPreviewNotice').waitFor();await page.locator('#btnSave').filter({hasText:'Save test design'}).waitFor();}
async function pageFor(width=1440,height=1000,scale=1){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,reducedMotion:'reduce'});contexts.push(context);
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===server.baseUrl)return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  page.on('response',response=>{if(!response.url().endsWith('/api/bespoke')&&response.status()>=400)missing.push([response.url(),response.status()]);});
  await page.goto(server.baseUrl+'/bespoke/');await ready(page);
  if(scale!==1)await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  return page;
}
async function surface(page,name){const tab=page.locator('#surface-'+name);if(await tab.isVisible())await tab.click();}
const go = (page, name) => builderDestination(page, labels[name] || name);
async function preview(page,kind){await surface(page,'preview');await page.locator(`#previewTabs [data-view="${kind}"]`).click();await page.evaluate(()=>document.fonts.ready);}
async function openField(page,kind,field){
  await surface(page,'design');const control=page.locator(`#role-${kind}-${field}`);
  const details=control.locator('xpath=ancestor::details');
  for(let i=await details.count()-1;i>=0;i--){const item=details.nth(i);if(!await item.evaluate(el=>el.open))await item.locator(':scope > summary').click();}
  await control.waitFor({state:'visible'});return control;
}
async function setStyle(page,kind,field,value){
  const control=await openField(page,kind,field),before=await design(page);
  await control.focus();const type=await control.evaluate(el=>el.tagName==='SELECT'?'select':el.type);
  if(type==='select')await control.selectOption(String(value));else if(type==='checkbox'){if(await control.isChecked()!==value)await control.press('Space');}else await control.fill(value);
  const after=await design(page),expected=structuredClone(before);expected.startingPoint='custom';
  if(kind==='title'&&['headingText','bodyText'].includes(field))expected.samples[field==='headingText'?'title':'subtitle']=value;
  else {expected.roleStyles||={};expected.roleStyles[kind]={...roleStyleDefaults(catalog,before,kind),...before.roleStyles?.[kind],[field]:value};}
  assert.deepEqual(after,expected,`${kind}/${field} must change only the selected local field`);
  assert.equal(await page.evaluate(()=>document.activeElement.id),`role-${kind}-${field}`,`${kind}/${field} keeps keyboard focus`);
  stats.edits++;return after;
}
async function options(page,kind,field){
  const control=await openField(page,kind,field);const actual=await control.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
  assert.deepEqual(actual,roleStylesSchema(catalog).properties[kind].properties[field].enum,`${kind}/${field} exposes every approved choice`);
}
async function css(page,kind,part,property){return node(page,kind,part).evaluate((el,key)=>getComputedStyle(el)[key],property);}
async function visible(page,kind,part){return node(page,kind,part).isVisible();}
async function choose(page,group,value){await surface(page,'design');await page.getByRole('group',{name:new RegExp(group)}).locator(`[data-choice="${value}"]`).click();}
async function backup(page){
  if(!await page.locator('#btnDownloadBackup').isVisible())await page.locator('.more-menu > summary').click();
  const event=page.waitForEvent('download',{timeout:10000});await page.locator('#btnDownloadBackup').click();const file=await event.catch(async error=>{throw new Error(error.message+'; backup status: '+await page.locator('#fileStatus').textContent());});
  const result=JSON.parse(await fs.readFile(await file.path(),'utf8'));await recoveryMenu(page, false);return result;
}
async function upload(page,value,name='synthetic-role-design.json'){
  await page.locator('#teamFileInput').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await page.locator('#fileStatus').filter({hasText:`Opened ${name}.`}).waitFor();
}
async function save(page){
  const request=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();
  const response=await request;assert.equal(response.status(),200,await response.text());
  await page.locator('#fileStatus').filter({hasText:/Local test design saved|already up to date/}).waitFor();
}
async function remote(action='open'){
  const response=await fetch(server.baseUrl+'/api/bespoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,lessonId:'money-management',editCode:LOCAL_PREVIEW_CODE})});
  assert.equal(response.status,200);return response.json();
}
async function geometry(page,label){
  const m=await slide(page).evaluate(el=>{
    const root=el.getBoundingClientRect(),visible=n=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&n.getBoundingClientRect().width&&!n.closest('details:not([open])');};
    const boxes=[...el.querySelectorAll('h1,h2,h3,p,li,.slide-logo,.role-watermark,.slide-card,.slide-video-frame,.slide-activity')].filter(visible).map(n=>{const r=n.getBoundingClientRect();return {name:n.className||n.tagName,x:r.x-root.x,y:r.y-root.y,w:r.width,h:r.height,sw:n.scrollWidth,cw:n.clientWidth};});
    return {w:root.width,h:root.height,sw:el.scrollWidth,sh:el.scrollHeight,viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,boxes};
  });
  const escaped=m.boxes.filter(b=>b.x<-.75||b.y<-.75||b.x+b.w>m.w+.75||b.y+b.h>m.h+.75||b.sw>b.cw+1);
  assert(m.pageWidth<=m.viewport+1,`${label}: document overflow`);assert(m.sw<=m.w+1&&m.sh<=m.h+1,`${label}: slide overflow`);assert.deepEqual(escaped,[],`${label}: visible sample copy/decoration stays contained`);
  evidence.push({label,...m});stats.geometryChecks++;
}
async function axe(page,label){
  await page.addScriptTag({content:axeSource});
  const violations=await page.evaluate(async()=> (await window.axe.run({exclude:[['#modelStage'],['.button-color-sample']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[],label+' editor accessibility (chosen sample contrast excluded)');stats.axeScans++;
}

async function focusedRegressions(){
  const page=await pageFor();await upload(page,payload(defaultDesign(catalog)));
  assert.match(await page.locator('#fileStatus').textContent(),/choose Save test design to save it to the local test service/);
  assert.doesNotMatch(await page.locator('#fileStatus').textContent(),/team access|Save shared design/);
  await save(page);assert.equal(await page.locator('#fileStatus').textContent(),'Local test design saved.');
  await save(page);await page.locator('#fileStatus').filter({hasText:'The local test design was already up to date.'}).waitFor();
  for(const [kind,part,name,selector] of [['activity','heading','Activity label','.slide-activity-label'],['divider','body','Chapter label','.slide-chapter-label']]){
    await go(page,kind);await setStyle(page,kind,'labelText',name+' example');await setStyle(page,kind,part+'Text','Retained main copy');await setStyle(page,kind,part+'Visible',false);
    const label=page.locator('#modelStage '+selector);assert(await label.isVisible());assert(!await page.locator(`#role-${kind}-${part}Text`).isVisible(),'Main sample-copy input stays hidden');
    for(const [suffix,value] of [['Color','mauve'],['Font','bitter'],['Size','large'],['Alignment','right']]){
      const control=page.getByRole('combobox',{name:name+' '+suffix.toLowerCase(),exact:true});assert.equal(await control.getAttribute('id'),`role-${kind}-${part}${suffix}`,'Label-only typography has its own accurate accessible name');
      await setStyle(page,kind,part+suffix,value);
    }
    assert.equal(await label.evaluate(el=>getComputedStyle(el).color),rgb('mauve'));assert((await label.evaluate(el=>getComputedStyle(el).fontFamily)).includes('Bitter'));assert.equal(await label.evaluate(el=>getComputedStyle(el).textAlign),'right');
    const large=await label.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));await setStyle(page,kind,part+'Size','small');assert((await label.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))<large);
    const retained=await design(page);await setStyle(page,kind,'labelVisible',false);assert(!await page.locator(`#role-${kind}-${part}Color`).isVisible());await setStyle(page,kind,'labelVisible',true);assert.deepEqual(await design(page),retained,'Hidden label typography and main-copy choices survive');
    await setStyle(page,kind,part+'Visible',true);assert.equal(await page.locator(`#role-${kind}-${part}Text`).inputValue(),'Retained main copy');
  }
  await go(page,'activity');await setStyle(page,'activity','backgroundMode','solid');await setStyle(page,'activity','primary','dark');await setStyle(page,'activity','headingColor','dark');
  const text=page.locator('#section-activity-text');await text.locator(':scope > summary').click();assert.equal(await text.evaluate(el=>el.open),false);
  const unchanged=await design(page);await page.locator('#readabilityNotes').getByRole('button',{name:'Edit activity colors',exact:true}).click();
  assert.equal(await text.evaluate(el=>el.open),true,'Same-step contrast edit shortcut opens the previously closed Text section');assert.equal(await page.evaluate(()=>document.activeElement.id),'role-activity-headingColor');assert(await page.locator('#role-activity-headingColor').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Explicit contrast edit jump scrolls the focused color control into view');assert.deepEqual(await design(page),unchanged,'Contrast shortcut does not rewrite selected colors');
  console.log('PASS focused label-only typography, same-step contrast editing, and local-mode import/save wording');
}

try{
  await focusedRegressions();
  if(!focusOnly){
  const page=await pageFor();await upload(page,payload(defaultDesign(catalog)));await go(page,'Starting look');
  assert(await page.locator('#startingLookChoices').isVisible(),'Beginner introduction is on the first step');
  const beforeHelp=await design(page);await clickMenuItem(page, '#btnHelp');
  const help=await page.locator('#builderHelp').textContent();
  for(const pattern of [/editable/i,/sample/i,/eleven/i,/two or three/i,/twelve/i,/four/i,/logo/i,/leader/i,/Undo/i,/Previous versions/i,/six/i,/unmeasured/i,/private/i,/test space/i])assert.match(help,pattern);
  assert.equal(await page.locator('#btnHelp').getAttribute('aria-expanded'),'true');await axe(page,'Getting started help');
  await page.locator('#btnCloseHelp').click();assert.equal(await page.evaluate(()=>document.activeElement.matches('.more-menu > summary')),true);assert.deepEqual(await design(page),beforeHelp);

  for(const kind of Object.keys(labels)){
    await go(page,kind);await setStyle(page,kind,'backgroundMode','solid');
    await setStyle(page,kind,'bodyVisible',true);
    for(const field of ['backgroundMode','primary','headingColor','bodyColor','headingFont','bodyFont','headingSize','bodySize','headingAlignment','bodyAlignment','pattern','watermarkMode'])await options(page,kind,field);
    await setStyle(page,kind,'pattern','plain');
    for(const color of ['primary','light','mauve']){await setStyle(page,kind,'primary',color);assert.equal(await layer(page,kind).evaluate(el=>getComputedStyle(el).backgroundColor),rgb(color));stats.paintChecks++;}
    await setStyle(page,kind,'primary','inherit');assert.equal(await layer(page).evaluate(el=>getComputedStyle(el).backgroundColor),rgb((await design(page)).roles[kind==='title'?'titleBackground':kind==='divider'?'dividerBackground':'contentBackground']));
    await setStyle(page,kind,'primary','dark');await setStyle(page,kind,'backgroundMode','inherit');await setStyle(page,kind,'backgroundMode','gradient');await options(page,kind,'secondary');assert.equal(await page.locator(`#role-${kind}-direction`).count(),0,'Direction belongs to the preset');
    await setStyle(page,kind,'secondary','light');await setStyle(page,kind,'secondary','inherit');await setStyle(page,kind,'secondary','gold');
    const gradient=await layer(page,kind).evaluate(el=>getComputedStyle(el).backgroundImage);assert(gradient.includes(rgb('dark'))&&gradient.includes(rgb('gold')));stats.paintChecks++;
    await setStyle(page,kind,'backgroundMode','solid');assert(!await page.locator(`#role-${kind}-secondary`).isVisible(),'Second color hides for a solid background');
    assert.equal((await design(page)).roleStyles[kind].secondary,'gold');await setStyle(page,kind,'backgroundMode','gradient');assert.equal(await page.locator(`#role-${kind}-secondary`).inputValue(),'gold');
    let plain;
    for(const pattern of catalog.backgrounds.map(p=>p.id)){
      await setStyle(page,kind,'pattern',pattern);await preview(page,kind);const png=await slide(page).screenshot();
      const image=await layer(page,kind).evaluate(el=>getComputedStyle(el).backgroundImage);
      if(pattern==='plain'){plain=png;assert(!/radial-gradient|repeating-linear-gradient/.test(image));}
      else {const delta=await pixelDifference(page,plain,png);assert(delta.changedFraction>.001,`${kind}/${pattern}: texture visibly changes canvas`);evidence.push({kind,pattern,delta});stats.pixelChecks++;}
    }
    await setStyle(page,kind,'pattern','crosshatch');await options(page,kind,'patternStrength');
    const strengths=[];for(const value of ['subtle','normal','bold']){await setStyle(page,kind,'patternStrength',value);strengths.push(await layer(page,kind).evaluate(el=>getComputedStyle(el).backgroundImage));}assert.equal(new Set(strengths).size,3,'Texture strength has three distinct painted treatments');await setStyle(page,kind,'pattern','inherit');assert.equal((await layer(page).evaluate(el=>getComputedStyle(el).backgroundImage)).match(/linear-gradient/g)?.length,1,'Shared plain texture removes the local pattern');await setStyle(page,kind,'pattern','crosshatch');
    for(const part of ['heading','body']){
      await setStyle(page,kind,part+'Visible',true);
      for(const color of ['light','accent','gold']){await setStyle(page,kind,part+'Color',color);assert.equal(await css(page,kind,part,'color'),rgb(color));stats.typeChecks++;}
      await setStyle(page,kind,part+'Color','inherit');assert.equal(await css(page,kind,part,'color'),rgb((await design(page)).roles[['title','divider'].includes(kind)?part==='heading'?'titleText':'subtitle':part]));await setStyle(page,kind,part+'Color','gold');
      for(const font of ['bitter','raleway','source-sans-3']){await setStyle(page,kind,part+'Font',font);await page.evaluate(()=>document.fonts.ready);assert((await css(page,kind,part,'fontFamily')).includes(catalog.fonts.find(f=>f.id===font).family));stats.typeChecks++;}
      await setStyle(page,kind,part+'Font','inherit');const inherited=await design(page);assert((await css(page,kind,part,'fontFamily')).includes(catalog.fonts.find(f=>f.id===inherited.fonts[part]).family));await setStyle(page,kind,part+'Font','source-sans-3');
      const sizes=[];for(const value of ['small','default','large']){await setStyle(page,kind,part+'Size',value);sizes.push(parseFloat(await css(page,kind,part,'fontSize')));}assert(sizes[0]<sizes[1]&&sizes[1]<sizes[2],`${kind}/${part}: all three sizes visibly differ`);
      for(const align of ['left','center','right','layout']){await setStyle(page,kind,part+'Alignment',align);if(align!=='layout')assert.equal(await css(page,kind,part,'textAlign'),align);stats.typeChecks++;}
      if(!(kind==='cards'&&part==='body')){const text=`Synthetic ${kind} ${part} <b>sample</b>`;await setStyle(page,kind,part+'Text',text);const copy=page.locator('#modelStage').locator((part==='heading'?headings:bodies)[kind]).filter({hasText:text});assert(await copy.count()>0,`${kind}/${part}: copy is literal text`);assert.equal(await copy.locator('b').count(),0);}
      const retained=await design(page);await setStyle(page,kind,part+'Visible',false);assert(!await visible(page,kind,part));await setStyle(page,kind,part+'Visible',true);assert(await visible(page,kind,part));assert.deepEqual(await design(page),retained,'Showing text restores its exact style and copy');
    }
    if(['divider','activity'].includes(kind)){
      await setStyle(page,kind,'labelText',`Synthetic ${kind} <b>label</b>`);
      const label=page.locator('#modelStage '+(kind==='divider'?'.slide-chapter-label':'.slide-activity-label'));
      assert.equal(await label.textContent(),`Synthetic ${kind} <b>label</b>`);assert.equal(await label.locator('b').count(),0);
      const retained=await design(page);await setStyle(page,kind,'labelVisible',false);assert(!await label.isVisible());await setStyle(page,kind,'labelVisible',true);assert(await label.isVisible());assert.deepEqual(await design(page),retained);
      const related=kind==='divider'?'bodyVisible':'headingVisible';await setStyle(page,kind,related,false);assert(await label.isVisible(),'Label visibility is independent of its typography source');await setStyle(page,kind,related,true);assert.deepEqual(await design(page),retained);
    }
    await setStyle(page,kind,'watermarkMode','text');await setStyle(page,kind,'watermarkText',`Review <mark> ${kind}`);
    for(const field of ['watermarkColor','watermarkSize','watermarkPlacement','watermarkOpacity'])await options(page,kind,field);
    const watermark=page.locator('#modelStage .role-watermark');assert.equal(await watermark.getAttribute('role'),'img');assert.match(await watermark.getAttribute('aria-label'),/^Decorative watermark:/);assert.equal(await watermark.locator('[aria-hidden=true]').count(),1);assert.equal(await watermark.locator('mark').count(),0);assert((await watermark.textContent()).includes(`<mark>`));
    for(const color of ['light','mauve']){await setStyle(page,kind,'watermarkColor',color);assert.equal(await watermark.evaluate(el=>getComputedStyle(el).color),rgb(color));stats.paintChecks++;}
    const sizes=[];for(const value of ['small','medium','large']){await setStyle(page,kind,'watermarkSize',value);sizes.push(await watermark.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)));}assert(sizes[0]<sizes[1]&&sizes[1]<sizes[2]);
    const opacity=[];for(const value of ['low','medium','high']){await setStyle(page,kind,'watermarkOpacity',value);opacity.push(await watermark.evaluate(el=>parseFloat(getComputedStyle(el).opacity)));}assert(opacity[0]<opacity[1]&&opacity[1]<opacity[2]);
    await setStyle(page,kind,'watermarkText','MARK');
    const placements={};for(const value of ['top-left','top-right','bottom-left','bottom-right']){await setStyle(page,kind,'watermarkPlacement',value);placements[value]=await watermark.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const r=[...range.getClientRects()].at(-1),root=el.closest('.bespoke-slide').getBoundingClientRect();return {x:r.x-root.x,y:r.y-root.y};});}
    assert(placements['top-right'].x>placements['top-left'].x+20&&placements['bottom-right'].x>placements['bottom-left'].x+20,`${kind}: watermark side changes glyph position ${JSON.stringify(placements)}`);
    assert(placements['bottom-left'].y>placements['top-left'].y+20,`${kind}: watermark top/bottom changes actual placement`);
    const retained=await design(page);await setStyle(page,kind,'watermarkMode','off');assert.equal(await watermark.count(),0);await setStyle(page,kind,'watermarkMode','inherit');assert.equal(await watermark.count(),0);if(kind==='divider')assert(await page.locator('#modelStage .slide-watermark').isVisible());await setStyle(page,kind,'watermarkMode','text');assert.deepEqual(await design(page),retained);
    await preview(page,kind);await geometry(page,'customized '+kind);
    assert.equal(await slide(page).locator('video,iframe,audio').count(),0,'Role samples stay inert');
    if(kind==='title')assert(await slide(page).locator('.slide-logo').isVisible(),'Required title logo remains present');
    console.log('PASS independent controls and actual preview '+kind);
  }

  const allLocal=await design(page);
  await go(page,'title');await preview(page,'activity');
  assert.equal(await page.locator('#editor-activity').getAttribute('aria-selected'),'true','Thumbnail navigation keeps detailed controls aligned with the visible slide');
  assert.deepEqual(await design(page),allLocal,'Navigating thumbnails does not change any visual choices');
  await go(page,'title');await setStyle(page,'title','headingColor','light');
  assert.equal(await slide(page).getAttribute('data-kind'),'title','Editing a local control reveals the relevant role even after selecting another preview tab');
  await page.locator('#btnUndo').click();assert.deepEqual(await design(page),allLocal);
  await go(page,'Shared typography');await page.locator('#font-heading').selectOption('inter');
  assert.deepEqual((await design(page)).roleStyles,allLocal.roleStyles,'Shared defaults preserve all explicit local styles');
  for(const kind of Object.keys(labels)){await preview(page,kind);assert((await css(page,kind,'heading','fontFamily')).includes('Source Sans 3'),'Explicit local heading fonts survive shared default changes');}
  await surface(page,'design');await page.locator('#btnUndo').click();assert.deepEqual(await design(page),allLocal);
  const cumulative=await design(page);await page.locator('#btnUndo').click();assert.notDeepEqual(await design(page),cumulative);await page.locator('#btnRedo').click();assert.deepEqual(await design(page),cumulative);
  for(const kind of Object.keys(labels)){await go(page,kind);await preview(page,kind);assert.deepEqual(await design(page),cumulative);}
  if(output)await fs.writeFile(path.join(output,`customized-design-${browserName}.json`),JSON.stringify(payload(cumulative),null,2));
  const exported=await backup(page);assert.deepEqual(exported.design,cumulative);assert(!JSON.stringify(exported).includes(LOCAL_PREVIEW_CODE));
  await save(page);await page.reload();await ready(page);assert.deepEqual(await design(page),cumulative);assert.deepEqual((await remote()).selection.design,cumulative);
  const reopened=await pageFor();assert.deepEqual(await design(reopened),cumulative);await go(reopened,'activity');await setStyle(reopened,'activity','bodyColor','mauve');await save(reopened);
  await clickMenuItem(reopened, '#btnHistory');await reopened.locator('#historyPanel button').nth(1).click();await reopened.locator('#fileStatus').filter({hasText:'Previous choices loaded'}).waitFor();assert.deepEqual(await design(reopened),cumulative);assert.equal((await draft(reopened)).autosavePaused,true);await save(reopened);
  const recovered=await pageFor();await upload(recovered,exported);assert.deepEqual(await design(recovered),cumulative);
  await go(recovered,'Starting look');await recovered.locator('[data-preset="professional"]').click();if(await recovered.locator('#presetDialog').isVisible())await recovered.locator('#presetApply').click();
  const preset=await design(recovered);assert.deepEqual(preset.samples,cumulative.samples);
  for(const kind of Object.keys(labels)){assert.equal(preset.roleStyles[kind].headingText,cumulative.roleStyles[kind].headingText);assert.equal(preset.roleStyles[kind].bodyText,cumulative.roleStyles[kind].bodyText);assert.equal(preset.roleStyles[kind].labelText,cumulative.roleStyles[kind].labelText);assert.equal(preset.roleStyles[kind].watermarkText,cumulative.roleStyles[kind].watermarkText);assert.equal(preset.roleStyles[kind].primary,'inherit');}
  const old=defaultDesign(catalog);delete old.roleStyles;await upload(recovered,payload(old),'old-v2.json');assert.deepEqual(await design(recovered),old,'Old v2 opens without materializing role overrides');
  await upload(recovered,legacy,'original-v1.json');assert.deepEqual((await draft(recovered)).legacySelection,legacy,'Complete original v1 retained');
  console.log('PASS cumulative local styles through history, Undo, reload, backup, Save/reopen and older imports');

  const long=structuredClone(cumulative);long.samples.title='Make a useful plan together. '.repeat(10).slice(0,200);long.samples.subtitle='Keep learning one practical step at a time. '.repeat(15).slice(0,500);
  long.samples.boxes=Array.from({length:4},(_,i)=>(`Box ${i+1}. `+'Consider a practical next step. '.repeat(50)).slice(0,1200));long.slides.cards.count='4';long.slides.cards.titleBar=true;long.slides.cards.treatment='numbered';long.slides.title.layout='split';long.slides.title.logo='corner';long.slides.video.frame='accent';long.slides.activity.layout='side';
  for(const kind of Object.keys(labels)){const s=long.roleStyles[kind];s.headingColor='light';s.bodyColor='light';s.primary='dark';s.secondary='primary';s.headingSize='large';s.bodySize='large';s.headingAlignment='left';s.bodyAlignment='left';s.watermarkText='SAMPLE DESIGN';if(kind!=='title')s.headingText=('A practical next step for '+kind+'. ').repeat(10).slice(0,200);if(!['title','cards'].includes(kind))s.bodyText='Keep your idea clear and give it enough space. '.repeat(30).slice(0,1200);}
  for(const view of [{width:1440,height:1000},{width:1024,height:850},{width:390,height:844},{width:320,height:568},{width:390,height:844,scale:2}]){
    const mobile=await pageFor(view.width,view.height,view.scale||1);await upload(mobile,payload(long));
    for(const kind of Object.keys(labels)){
      await go(mobile,kind);await axe(mobile,`${view.width}/${view.scale||1}/${kind}`);await preview(mobile,kind);await geometry(mobile,`${view.width}/${view.scale||1}/${kind}/long`);
      if(output&&kind==='video')await mobile.screenshot({path:path.join(output,`roles-${browserName}-${view.width}-${view.scale||1}.png`),fullPage:true});
    }
    await go(mobile,'cards');
    for(const count of ['1','2','3','4']){await choose(mobile,'Number of text boxes',count);assert.equal(await mobile.locator('#modelStage .slide-card').count(),Number(count));assert.deepEqual((await design(mobile)).samples.boxes,long.samples.boxes);await preview(mobile,'cards');await geometry(mobile,`${view.width}/cards-${count}`);}
    await surface(mobile,'design');await openMoreMenu(mobile);await mobile.locator('#btnHelp').focus();await mobile.keyboard.press('Enter');assert(await mobile.locator('#builderHelp').isVisible());await axe(mobile,`${view.width}/help`);await mobile.locator('#btnCloseHelp').click();assert.equal(await mobile.evaluate(()=>document.activeElement.matches('.more-menu > summary')),true);
    await go(mobile,'activity');const control=await openField(mobile,'activity','primary');await control.focus();await mobile.keyboard.press(tabKey);assert.notEqual(await mobile.evaluate(()=>document.activeElement.id),'role-activity-primary','Keyboard can leave each native control');
    console.log(`PASS responsive role editor ${view.width}px text${view.scale||1}`);
  }
  }
  assert.deepEqual(errors,[],'No page errors');assert.deepEqual(external,[],'No external requests');assert.deepEqual(missing,[],'No missing local assets');
  if(output)await fs.writeFile(path.join(output,`role-evidence-${browserName}.json`),JSON.stringify({browserName,stats,evidence},null,2));
  console.log(`${browserName} role browser acceptance: ${JSON.stringify(stats)}`);
}finally{for(const context of contexts)await context.close();await browser.close();await server.close();}
