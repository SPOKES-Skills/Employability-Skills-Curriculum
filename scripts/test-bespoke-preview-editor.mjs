#!/usr/bin/env node
import {otherStartingPaths} from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDevServer} from './bespoke-dev-server.mjs';
import {defaultDesign} from '../bespoke/builder-model.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import {browserType} from './bespoke-test-browser.mjs';
let server;
const browser=await browserType.launch({headless:true});
const errors=[];
const axeSource=await fs.readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../node_modules/axe-core/axe.min.js'),'utf8');
const draft=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const current=async page=>(await draft(page)).design;
try{
 // BESPOKE_PREVIEW_WIDTHS='' skips the per-width journey to run only the scenarios after it.
 const widths=process.env.BESPOKE_PREVIEW_WIDTHS===undefined?[1440,768,390,320]:process.env.BESPOKE_PREVIEW_WIDTHS.split(',').filter(Boolean).map(Number);
 for(const width of widths){
  server=await createDevServer({port:0});
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__bespokeAutosave={enabled:false};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.baseUrl+'/bespoke/');await page.locator('#localPreviewNotice').waitFor({state:'visible'});
  const before=await current(page);
  if(await page.locator('#surface-preview').isVisible())await page.locator('#surface-preview').click();
  await page.locator('#stage-slides').click();
  await page.locator('#modelStage .slide-title-text').click();
  assert.equal(await page.locator('#workspace').getAttribute('data-editor'),'true');
  assert.equal(await page.locator('#detailControls').isVisible(),false);
  assert.match(await page.locator('#editScope').textContent(),/Title slide only/);
  for(const control of await page.locator('#contextToolbar select, #contextToolbar button').all())assert((await control.boundingBox()).height>=44,'Contextual controls have a 44px target on every engine');
  await page.addScriptTag({content:axeSource});
  const accessibility=await page.evaluate(()=>axe.run({include:[['#contextToolbar'],['#modelStage']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:false}}}));
  assert.deepEqual(accessibility.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],'Editor selection semantics at '+width);
  // Wide screens keep font in the options drawer; open it to reach the control.
  if(width>=1101)await page.locator('#btnMoreOptions').click();
  await page.locator('#context-font').selectOption('inter');
  assert.equal((await current(page)).roleStyles.title.headingFont,'inter');
  assert.deepEqual((await current(page)).roles,before.roles);
  await page.locator('#context-size').selectOption('large');
  const edited=await current(page);
  assert.equal((await page.locator('#modelStage .editor-selected').count()),1);
  await page.locator('#btnUndo').click();assert.equal((await current(page)).roleStyles.title.headingSize,'default');
  await page.locator('#btnRedo').click();assert.deepEqual(await current(page),edited);
  // Native form keyboard history does not consume design history.
  const count=(await draft(page)).changes.length;await page.locator('#context-font').focus();await page.keyboard.press('Control+z');assert.equal((await draft(page)).changes.length,count);
  await page.locator('#previewTabs [data-view=title]').focus();await page.keyboard.press(width>1100?'ArrowDown':'ArrowRight');
  assert.equal(await page.locator('#previewTabs [aria-selected=true]').getAttribute('data-view'),'divider');
  await page.keyboard.press('Home');assert.deepEqual(await current(page),edited,'Thumbnail keyboard navigation is not a design mutation');
  await page.locator('#previewTabs [data-view=cards]').click();
  await page.locator('#modelStage .slide-card').first().focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#editScope').textContent(),/ALL boxes/);
  await page.locator('#context-look').selectOption('outline');await page.locator('#context-layout').selectOption('grid');
  const cards=await current(page);assert.equal(cards.slides.cards.look,'outline');assert.equal(cards.slides.cards.layout,'grid');
  assert.deepEqual(cards.roleStyles.title,edited.roleStyles.title);
  await page.locator('#modelStage .slide-card').first().focus();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#selectedElement').inputValue(),'background');
  await page.locator('#context-finish').selectOption('solid');await page.locator('#context-background').selectOption('light');
  // On wide screens the drawer is already open from the font step above.
  if(!await page.locator('#detailControls').isVisible())await page.locator('#btnMoreOptions').click();assert.equal(await page.locator('#detailControls').isVisible(),true);
  await page.locator('#btnCloseOptions').click();assert.equal(await page.locator('#detailControls').isVisible(),false);
  // Picker is the native keyboard equivalent of clicking visible text.
  await page.locator('#selectedElement').selectOption('heading-1');assert.equal(width>=1101?await page.locator('#context-font').count()===1:await page.locator('#context-font').isVisible(),true);
  assert.match(await page.locator('#editScope').textContent(),/ALL box headings/);
  await page.locator('#context-color').selectOption('royal');
  const saved=await current(page);await page.reload();await page.locator('#selectedElement').waitFor();assert.deepEqual(await current(page),saved);
  await page.locator('#stage-team').click();
  if(await page.locator('#surface-design').isVisible())await page.locator('#surface-design').click();
  await page.locator('#teamName').fill('Preview editor test');await page.locator('#spokespersonName').fill('Sample Instructor');await page.locator('#spokespersonEmail').fill('sample@example.org');
  const save=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();assert.equal((await (await save).json()).ok,true);
  const session=await context.storageState();
  for(const origin of session.origins)origin.localStorage=origin.localStorage.filter(item=>!['bespoke-draft-v2','bespoke-previous-draft-v2'].includes(item.name));
  const reopenedContext=await browser.newContext({storageState:session,viewport:{width,height:1000}});
  await reopenedContext.addInitScript(()=>{window.__bespokeAutosave={enabled:false};});
  const reopened=await reopenedContext.newPage();await reopened.goto(server.baseUrl+'/bespoke/');
  await reopened.waitForFunction(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2'))?.design.roleStyles?.title?.headingSize==='large');assert.deepEqual(await current(reopened),saved);await reopenedContext.close();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'page overflow at '+width);
  await page.locator('#stage-slides').click();await page.locator('#previewTabs [data-view=title]').click();await page.locator('#modelStage .slide-title-text').click();
  if(process.env.BESPOKE_REVIEW_DIR){await fs.mkdir(process.env.BESPOKE_REVIEW_DIR,{recursive:true});await page.screenshot({path:process.env.BESPOKE_REVIEW_DIR+'/editor-'+width+'.png',fullPage:true});}
  await context.close();await server.close();server=null;console.log('PASS preview selection, scopes, history, persistence and layout at '+width+'px');
 }

 // Each scenario below starts from a fresh server and browser, at the width it names.
 const failures=[];
 async function check(name,body){try{await body();}catch(e){failures.push(name+': '+e.message.split('\n')[0]);console.error('FAIL '+name+': '+e.message.split('\n')[0]);if(server){await server.close();server=null;}}}
 async function fresh(width,height=1000){
  server=await createDevServer({port:0});
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__bespokeAutosave={enabled:false};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.baseUrl+'/bespoke/');await page.locator('#localPreviewNotice').waitFor({state:'visible'});
  return {page,done:async()=>{await context.close();await server.close();server=null;}};
 }
 const stepId=async page=>(await draft(page)).stepId;
 const beside=async(page,a,b)=>page.evaluate(([a,b])=>{const x=document.querySelector(a).getBoundingClientRect(),y=document.querySelector(b).getBoundingClientRect();return {sameRow:x.top<y.bottom&&y.top<x.bottom,leftOf:x.right<=y.left+1,a:[x.left|0,x.top|0,x.width|0],b:[y.left|0,y.top|0,y.width|0]};},[a,b]);
 await check('guide',async()=>{
  const {page,done}=await fresh(1440);
  await page.locator('#stage-start').click();await otherStartingPaths(page);await page.locator('#btnGuideMe').click();await page.locator('.guide-count').waitFor();
  const question=await page.locator('.guide-count').textContent();
  await page.locator('#modelStage .slide-title-text').click();
  assert.equal(await page.locator('.guide-count').count(),1,'Clicking the preview keeps Guide me open');
  assert.equal(await page.locator('.guide-count').textContent(),question,'and on the same question');
  assert.equal(await page.locator('#contextToolbar').isVisible(),false,'Guide me owns the preview, so the formatting toolbar is hidden');
  assert.equal(await page.locator('#modelStage [data-edit-target][tabindex="0"]').count(),0,'Slide elements are not tab stops while guiding');
  await done();console.log('PASS preview clicks leave Guide me alone');
 });
 for(const stage of ['review'])await check('stage '+stage,async()=>{
  const {page,done}=await fresh(1440);
  await page.locator('#stage-'+stage).click();
  await page.locator('#modelStage .slide-title-text').click();
  assert.equal(await stepId(page),stage,'Clicking the preview on '+stage+' does not change stage');
  assert.equal(await page.locator('#modelStage [data-edit-target][tabindex="0"]').count(),0,'Slide elements are not tab stops on '+stage);
  await page.locator('#btnEditSlide').click();
  assert.equal(await stepId(page),'slides','Edit this slide opens the slide editor');
  assert.equal(await page.locator('#workspace').getAttribute('data-editor'),'true');
  await done();console.log('PASS the '+stage+' stage keeps its place until Edit this slide');
 });
 for(const [lw,lh] of [[1000,800],[844,390],[768,900]])await check('layout '+lw,async()=>{
  const {page,done}=await fresh(lw,lh);
  await page.locator('#stage-slides').click();await page.locator('#modelStage .slide-title-text').click();
  await page.locator('#btnMoreOptions').click();await page.locator('#detailControls').waitFor({state:'visible'});
  const options=await beside(page,'#previewPane','#chromeRail');
  assert.ok(options.sameRow&&options.leftOf,'More options opens beside the preview at '+lw+'px: '+JSON.stringify(options));
  const gap=await page.evaluate(()=>document.getElementById('previewPane').getBoundingClientRect().top-document.getElementById('slideRail').getBoundingClientRect().bottom);
  assert.ok(gap<60,'The preview starts right under the thumbnails at '+lw+'px, not after a gap of '+Math.round(gap)+'px');
  await page.locator('#btnCloseOptions').click();
  await page.locator('#stage-start').click();await otherStartingPaths(page);await page.locator('#btnGuideMe').click();await page.locator('.guide-count').waitFor();
  const guided=await beside(page,'#previewPane','#chromeRail');
  assert.ok(guided.sameRow&&guided.leftOf,'Guide me sits beside the preview at '+lw+'px: '+JSON.stringify(guided));
  await done();console.log('PASS options and the guide stay beside the preview at '+lw+'px');
 });
 await check('a11y',async()=>{
  const {page,done}=await fresh(1440);
  await page.locator('#stage-slides').click();
  const named=await page.evaluate(()=>[...document.querySelectorAll('#modelStage [data-edit-target]')].map(n=>({tag:n.tagName,label:n.getAttribute('aria-label'),role:n.getAttribute('role'),container:n.matches('.bespoke-slide,.slide-card'),text:/^(heading|body|extra)/.test(n.dataset.editTarget)})));
  for(const n of named.filter(n=>n.text))assert.equal(n.label,null,'A '+n.tag+' keeps its visible text as its name: '+JSON.stringify(n));
  for(const n of named.filter(n=>!n.text))assert(n.label,'Non-text features have an accessible name');
  for(const n of named.filter(n=>n.container)){assert.equal(n.role,'group');assert.match(n.label||'',/^(Background|Box \d)$/);}
  await page.locator('#modelStage .slide-title-text').click();
  const current=await page.evaluate(()=>[...document.querySelectorAll('#modelStage [aria-current="true"]')].map(n=>n.className));
  assert.equal(current.length,1,'Exactly one slide element is marked current');
  assert.match(current[0],/slide-title-text/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#modelStage .bespoke-slide').getAttribute('aria-current'),'true','Escape moves the current mark to the background');
  await done();console.log('PASS slide elements keep their names and expose which one is selected');
 });
 assert.deepEqual(failures,[]);
 server=await createDevServer({port:0});
 const fixture=JSON.parse(await fs.readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'test-fixtures/bespoke/selection-money-management.json'),'utf8'));
 const payload={schema:'bespoke-selection/v2',date:'2026-10-01',lesson:fixture.lesson,team:{name:'Synthetic snapshot',spokesperson:{name:'Sample Instructor',email:'sample@example.org'}},design:defaultDesign(catalog)};
 const viewContext=await browser.newContext({viewport:{width:1440,height:1000}}),view=await viewContext.newPage();
 await view.goto(server.baseUrl+'/bespoke/#s='+encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64')));
 await view.locator('body[data-access=view]').waitFor();await view.locator('#stage-slides').click();
 const styleBefore=await view.locator('#designStyle').textContent();await view.locator('#modelStage .slide-title-text').click();
 for(const control of await view.locator('#contextToolbar select').all())assert(await control.isDisabled(),'View snapshots cannot mutate through the toolbar');
 assert.match(await view.locator('.toolbar-readonly').textContent(),/View only/);
 await view.keyboard.press('Control+z');assert.equal(await view.locator('#designStyle').textContent(),styleBefore);
 assert.equal(await view.evaluate(()=>localStorage.getItem('bespoke-draft-v2')),null,'Inspecting a view snapshot cannot replace a browser draft');
 await viewContext.close();await server.close();server=null;console.log('PASS read-only snapshot selection and mutation boundaries');
 assert.deepEqual(errors,[]);
}finally{await browser.close();if(server)await server.close();}
