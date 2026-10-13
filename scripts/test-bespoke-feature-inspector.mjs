#!/usr/bin/env node
// Feature selection, independent styling and durable full-design handoff. Synthetic storage only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import * as Model from '../bespoke/builder-model.mjs';
const browser=await browserType.launch({headless:true}),errors=[];
const current=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
const ink={gold:'rgb(211, 178, 87)',royal:'rgb(0, 19, 63)',mauve:'rgb(167, 37, 63)',light:'rgb(255, 255, 255)',accent:'rgb(55, 181, 80)'};
const computed=(p,selector)=>p.locator(selector).first().evaluate(n=>{const s=getComputedStyle(n);return {fill:s.backgroundColor,color:s.color,font:s.fontFamily,border:s.borderTopColor};});
try{
 for(const width of [1440,1000,390]){
  const server=await createDevServer({port:0});
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(server.baseUrl+'/bespoke/');await page.locator('#stage-slides').click();
   // Wide screens float the quick controls over the slide; the rest wait in the options drawer.
   const wide=width>=1101;if(wide)await page.locator('#btnMoreOptions').click();
   const view=async kind=>{await page.locator(`#previewTabs [data-view=${kind}]`).click();};
   const choose=async(selector,id)=>{await page.locator(selector).first().click();assert.equal(await page.locator('#selectedElement').inputValue(),id);assert.equal(await page.locator((wide?'#previewToolbarMount':'#selectionInspector')+' #contextToolbar').count(),1);};
   await view('cards');const before=await current(page);
   const sidebar=async()=>{
    if(await page.locator('#modelStage .slide-sidebar').isVisible())await choose('#modelStage .slide-sidebar .sample-sidebar-title','sidebar');
    else {await page.locator('#modelStage .slide-sidebar-disclosure > summary').click();assert.equal(await page.locator('#selectedElement').inputValue(),'sidebar');assert.equal(await page.locator('#modelStage .slide-sidebar-disclosure').getAttribute('open'),'');}
   };
   await sidebar();assert.deepEqual(await current(page),before,'Selection never mutates the design');
   for(const [field,value] of [['background','gold'],['color','royal'],['font','merriweather']])await page.locator('#context-'+field).selectOption(value);
   assert.deepEqual((await current(page)).roles,before.roles);assert.deepEqual((await current(page)).fonts,before.fonts);
   const sideSelector=await page.locator('#modelStage .slide-sidebar').isVisible()?'#modelStage .slide-sidebar':'#modelStage .slide-sidebar-drawer';
   const style=await computed(page,sideSelector);assert.equal(style.fill,ink.gold);assert.equal(style.color,ink.royal);assert.match(style.font,/Merriweather/);
   const styled=await current(page);await page.locator('#btnUndo').click();assert.equal((await current(page)).featureStyles.sidebar.font,'inherit');await page.locator('#btnRedo').click();assert.deepEqual(await current(page),styled);
   await page.locator('#btnResetFeature').click();assert.equal((await current(page)).featureStyles,undefined);await page.locator('#btnUndo').click();assert.deepEqual(await current(page),styled);
   if(process.env.BESPOKE_REVIEW_DIR){await fs.mkdir(process.env.BESPOKE_REVIEW_DIR,{recursive:true});await page.screenshot({path:process.env.BESPOKE_REVIEW_DIR+`/sidebar-${width}.png`,fullPage:true});}
   // Close the mobile navigation drawer before selecting slide content behind it.
   if(await page.locator('.slide-sidebar-disclosure > summary').isVisible())await page.locator('.slide-sidebar-disclosure > summary').click();
   await page.locator('#modelStage .slide-card').first().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#selectedElement').inputValue(),'box-0');assert.equal(await page.evaluate(()=>document.activeElement.id),'selectedElement','Keyboard selection moves into the feature controls');
   await page.locator('#context-background').selectOption('muted');await page.locator('#context-border').selectOption('mauve');await page.locator('#context-look').selectOption('outline');
   assert.equal((await computed(page,'#modelStage .slide-card')).border,ink.mauve);
   await page.locator('#modelStage .slide-title-bar').click({position:{x:5,y:5}});assert.equal(await page.locator('#selectedElement').inputValue(),'titlebar');await page.locator('#context-background').selectOption('gold');
   await view('video');await choose('#modelStage .slide-video-frame','video');await page.locator('#context-frame').selectOption('accent');await page.locator('#context-background').selectOption('royal');await page.locator('#context-border').selectOption('gold');
   assert.equal((await computed(page,'#modelStage .slide-video-frame > span')).fill,ink.royal);
   await choose('#modelStage .slide-button','button');await page.locator('#context-background').selectOption('mauve');await page.locator('#context-color').selectOption('light');await page.locator('#context-font').selectOption('bitter');
   let action=await computed(page,'#modelStage .slide-button');assert.equal(action.fill,ink.mauve);assert.equal(action.color,ink.light);assert.match(action.font,/Bitter/);
   await view('activity');action=await computed(page,'#modelStage .slide-button');assert.equal(action.fill,ink.mauve);assert.match(action.font,/Bitter/);
   await page.locator('#modelStage .slide-activity').click({position:{x:8,y:8}});assert.equal(await page.locator('#selectedElement').inputValue(),'activity');await page.locator('#context-background').selectOption('gold');await page.locator('#context-border').selectOption('royal');await page.locator('#context-labelStyle').selectOption('pill');assert.equal((await computed(page,'#modelStage .slide-activity-label')).border,ink.royal);
   await view('title');await choose('#modelStage .slide-logo','logo');await page.locator('#context-logo').selectOption('above');assert.equal((await current(page)).slides.title.logo,'above');
   await choose('#modelStage .slide-accent','accent');await page.locator('#context-color').selectOption('accent');
   await page.locator('#modelStage .slide-title-text').click();await page.locator('#btnAddText').click();await page.locator('#context-font').selectOption('bitter');assert.match((await computed(page,'#modelStage .slide-extra-text')).font,/Bitter/);
   await view('divider');await page.locator('#modelStage .slide-watermark').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#selectedElement').inputValue(),'watermark');await page.locator('#context-watermark-text').fill('NEXT');await page.locator('#context-watermark-text').press('Tab');assert.equal(await page.locator('#modelStage .role-watermark').textContent(),'NEXT');await page.locator('#context-font').selectOption('bitter');assert.match((await computed(page,'#modelStage .role-watermark')).font,/Bitter/);
   const saved=await current(page);assert.deepEqual(saved.featureStyles.sidebar,styled.featureStyles.sidebar,'Other features never alter navigation styling');
   await page.reload();await page.locator('#selectedElement').waitFor();assert.deepEqual(await current(page),saved);
   await view('cards');await sidebar();assert.match((await computed(page,sideSelector)).font,/Merriweather/);
   await page.addScriptTag({content:await fs.readFile('node_modules/axe-core/axe.min.js','utf8')});
   const violations=await page.evaluate(async()=>(await axe.run({include:[['#selectionInspector'],['#modelStage']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:false}}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
   assert.deepEqual(violations,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   if(width>760){const boxes=await page.evaluate(()=>['previewPane','selectionInspector'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,bottom:r.bottom};}));assert(boxes[0].right<=boxes[1].x+1);assert(boxes[0].top<boxes[1].bottom&&boxes[1].top<boxes[0].bottom);}
   await page.locator('#stage-team').click();await page.locator('#teamName').fill('Feature inspector test');await page.locator('#spokespersonName').fill('Sample');await page.locator('#spokespersonEmail').fill('sample@example.org');
   const response=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();assert.equal((await (await response).json()).ok,true);
   const state=await context.storageState();for(const origin of state.origins)origin.localStorage=origin.localStorage.filter(item=>!['bespoke-draft-v2','bespoke-previous-draft-v2'].includes(item.name));
   const reopened=await browser.newContext({storageState:state});await reopened.addInitScript(()=>window.__bespokeAutosave={enabled:false});const restore=await reopened.newPage();await restore.goto(server.baseUrl+'/bespoke/');await restore.waitForFunction(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2'))?.design.featureStyles?.sidebar?.font==='merriweather');assert.deepEqual(await current(restore),saved);await reopened.close();
   if(width===1440){
    const selection={schema:'bespoke-selection/v2',date:'2026-10-07',lesson:{id:'money-management',title:'Synthetic',displayTitle:'Synthetic',subtitle:''},team:{name:'Synthetic',spokesperson:{name:'Sample',email:'sample@example.org'}},design:saved};
    const contract=JSON.parse(execFileSync('python3',['-c',"import json,sys;sys.path.insert(0,'scripts');from bespoke_design import build_design;css,c=build_design(json.load(sys.stdin));print(json.dumps({'contract':c,'css':css}))"],{input:JSON.stringify(selection),encoding:'utf8'}));
    assert.deepEqual(contract.contract.design,saved);assert(Model.usedFontIds(catalog,saved).includes('merriweather'));assert(Model.usedFontIds(catalog,saved).includes('bitter'));
    const canonical=await context.newPage();await canonical.setContent(`<base href="${server.baseUrl}/bespoke/"><style>${contract.css}</style><aside class="sidebar"><span class="sidebar-title">Navigation</span></aside><button class="download-btn">Download</button><div class="cards-grid"><div class="card">Box</div></div><div class="activity-box"><span class="activity-label">Activity</span></div>`);
    assert.equal((await computed(canonical,'.sidebar')).fill,ink.gold);assert.match((await computed(canonical,'.sidebar-title')).font,/Merriweather/);assert.equal((await computed(canonical,'.download-btn')).fill,ink.mauve);assert.match((await computed(canonical,'.download-btn')).font,/Bitter/);assert.equal((await computed(canonical,'.card')).border,ink.mauve);assert.equal((await computed(canonical,'.activity-box')).fill,ink.gold);assert.equal((await computed(canonical,'.activity-label')).border,ink.royal);await canonical.close();
    const warn=Model.setFeatureStyle(catalog,saved,'sidebar','color','gold');assert(Model.contrastIssues(catalog,warn).some(issue=>issue.feature==='sidebar'));assert.deepEqual(Model.validateDesign(catalog,saved),[]);
    const bad=structuredClone(saved);bad.featureStyles.sidebar.unexpected='mauve';assert(Model.validateDesign(catalog,bad).length);
   }
   console.log('PASS feature clicks, isolated colors/fonts, history, responsive inspector, save/reopen and canonical handoff at '+width);
  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
