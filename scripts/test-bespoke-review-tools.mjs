#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import * as Model from '../bespoke/builder-model.mjs';
import {readabilitySuggestions} from '../bespoke/readability.mjs';
const current=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const browser=await browserType.launch({headless:true}),errors=[];
try{
 for(const width of [1440,390]){
  const server=await createDevServer({port:0}),context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(server.baseUrl+'/bespoke/');await page.locator('#stage-slides').click();
   const a=(await current(page)).design;
   await page.locator('#btnTryVersion').click();assert.deepEqual((await current(page)).alternatives,{active:'B',otherDesign:a});
   await page.locator('#modelStage .slide-title-text').click();await page.locator('#context-text').fill('Option B has its own words');await page.locator('#context-text').press('Tab');
   const b=(await current(page)).design;assert.notDeepEqual(a,b);assert.deepEqual((await current(page)).alternatives.otherDesign,a);
   await page.locator('#btnCompareVersions').click();await page.locator('#designReviewDialog iframe').first().waitFor();assert.equal(await page.locator('#designReviewDialog iframe').count(),2);
   await page.locator('#chooseOptionA').click();assert.deepEqual((await current(page)).design,a);assert.deepEqual((await current(page)).alternatives.otherDesign,b);
   await page.locator('#btnUndo').click();assert.deepEqual((await current(page)).design,b);assert.equal((await current(page)).alternatives.active,'B');
   await page.locator('#btnRedo').click();assert.deepEqual((await current(page)).design,a);
   await page.reload();await page.locator('#btnCompareVersions').waitFor();assert.deepEqual((await current(page)).alternatives,{active:'A',otherDesign:b});
   // Presentation leaves editor role, content, history and stored draft unchanged.
   const before=await current(page);await page.locator('#btnPresent').click();await page.locator('#reviewSlide').selectOption('cards');
   const presentation=page.frameLocator('#designReviewDialog iframe');await presentation.locator('.bespoke-slide[data-kind=cards]').waitFor();
   assert.equal(await presentation.locator('[data-edit-target]').count(),0);
   await page.addScriptTag({content:await fs.readFile('node_modules/axe-core/axe.min.js','utf8')});
   const accessibility=await page.evaluate(async()=>(await axe.run({include:[['#designReviewDialog']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
   assert.deepEqual(accessibility,[]);
   if(await page.locator('#btnFullScreen').count()){
    await page.locator('#btnFullScreen').click();await page.waitForFunction(()=>document.fullscreenElement||document.getElementById('reviewHint').textContent.includes('did not allow'));
    await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
   }
   await page.locator('#btnReviewNext').click();assert.equal(await page.locator('#reviewSlide').inputValue(),'video');
   await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#reviewSlide').inputValue(),'activity');
   if(process.env.BESPOKE_REVIEW_DIR){await fs.mkdir(process.env.BESPOKE_REVIEW_DIR,{recursive:true});await page.screenshot({path:process.env.BESPOKE_REVIEW_DIR+`/presentation-${width}.png`});}
   await page.frameLocator('#designReviewDialog iframe').locator('.slide-button').click();
   await page.keyboard.press('Escape');assert.equal(await page.locator('#designReviewDialog').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'btnPresent');assert.deepEqual(await current(page),before);
   // Use a deliberately unreadable solid; preview is transient and application is undoable.
   await page.locator('#selectedElement').selectOption('background');await page.locator('#context-background').selectOption('light');
   if(await page.locator('#context-finish').count())await page.locator('#context-finish').selectOption('solid');
   await page.locator('#modelStage .slide-title-text').click();await page.locator('#context-color').selectOption('light');
   const low=(await current(page)).design;await page.locator('#readabilityNotes > button').first().click();
   assert.deepEqual((await current(page)).design,low,'Suggestion preview does not save');
   await page.locator('#btnApplyReadability').click();assert.notDeepEqual((await current(page)).design,low);await page.locator('#btnUndo').click();assert.deepEqual((await current(page)).design,low);await page.locator('#btnRedo').click();
   await page.locator('#previewTabs [data-view=cards]').click();await page.locator('#modelStage .slide-card h3').first().click();assert.match(await page.locator('#formattingScope').textContent(),/all box headings/);
   await page.locator('#btnCompareVersions').click();
   if(process.env.BESPOKE_REVIEW_DIR){await page.locator('#reviewSlide').selectOption('title');for(const iframe of await page.locator('#designReviewDialog iframe').all()){const frame=await iframe.contentFrame();await frame.locator('.slide-title-text').waitFor();}await page.screenshot({path:process.env.BESPOKE_REVIEW_DIR+`/comparison-${width}.png`});}
   await page.locator('#btnExitReview').click();
   // Real local service round trip, then a fresh context with no browser draft.
   await page.locator('#stage-team').click();await page.locator('#teamName').fill('Review tools test');await page.locator('#spokespersonName').fill('Sample');await page.locator('#spokespersonEmail').fill('sample@example.org');
   const final=await current(page),response=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();assert.equal((await (await response).json()).ok,true);
   const storage=await context.storageState();for(const origin of storage.origins)origin.localStorage=origin.localStorage.filter(item=>!['bespoke-draft-v2','bespoke-previous-draft-v2'].includes(item.name));
   const fresh=await browser.newContext({storageState:storage});await fresh.addInitScript(()=>window.__bespokeAutosave={enabled:false});const reopened=await fresh.newPage();await reopened.goto(server.baseUrl+'/bespoke/');await reopened.locator('#stage-slides').click();await reopened.locator('#btnCompareVersions').waitFor();const restored=await current(reopened);assert.deepEqual(restored.design,final.design);assert.deepEqual(restored.alternatives,final.alternatives);await fresh.close();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   console.log('PASS A/B history, fresh reopen, presentation, suggestion preview/Undo and scope at '+width);
  }finally{await context.close();await server.close();}
 }
 // Gradients spanning white and dark cannot be repaired by blindly setting white text.
 let mixed=Model.defaultDesign(catalog);mixed=Model.setRoleStyle(catalog,mixed,'title','primary','light');mixed=Model.setRoleStyle(catalog,mixed,'title','secondary','royal');mixed=Model.setRoleStyle(catalog,mixed,'title','backgroundMode','gradient');
 assert.equal(readabilitySuggestions(catalog,mixed,'title',Model.contrastIssues(catalog,mixed).filter(i=>i.kind==='title')).length,0,'No text color can satisfy both extremes of this gradient');
 for(const preset of catalog.presets){const design=Model.applyPreset(catalog,preset.id,Model.defaultDesign(catalog));for(const kind of ['title','divider','cards','video','activity']){
  const low=Model.setRoleStyle(catalog,design,kind,'headingColor',Model.effectiveRoleStyle(catalog,design,kind).primary);
  const issues=Model.contrastIssues(catalog,low).filter(i=>i.kind===kind);for(const suggestion of readabilitySuggestions(catalog,low,kind,issues))assert.deepEqual(Model.validateDesign(catalog,suggestion.design),[]);
 }}
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
