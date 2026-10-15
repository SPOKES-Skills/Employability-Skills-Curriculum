#!/usr/bin/env node
// End-to-end evidence for the simplified visual-design workflow, with synthetic saving only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import * as Model from '../bespoke/builder-model.mjs';
const browser=await browserType.launch({headless:true});
const server=await createDevServer({port:0});
const errors=[];
const draft=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const current=async p=>(await draft(p)).design;
const screenshots=process.env.BESPOKE_REVIEW_DIR;
try {
 assert.equal(catalog.presets.length,12);
 assert.equal(new Set(catalog.presets.map(p=>p.design.slides.title.layout)).size,12);
 // The stored former presets remain valid, byte-stable inputs with the same appearance.
 const old=JSON.parse(await fs.readFile(new URL('./test-fixtures/bespoke/legacy-builder-catalog.json',import.meta.url)));
 for(const preset of old.presets)assert.deepEqual(Model.structuralErrors(catalog,preset.design),[]);
 for(const width of [1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.baseUrl+'/bespoke/');await page.locator('#stage-start').click();await page.locator('.preset-choice').first().waitFor();
  assert.equal(await page.locator('.preset-choice').count(),12);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  if(screenshots){await fs.mkdir(screenshots,{recursive:true});await page.screenshot({path:screenshots+`/layouts-${width}.png`,fullPage:true});}
  if(width===1440){
   const shapes=[];
   for(const preset of catalog.presets){
    await page.locator('#preset-'+preset.id).click();
    if(await page.locator('#presetDialog').isVisible())await page.locator('#presetApply').click();
    assert.equal((await current(page)).slides.title.layout,preset.design.slides.title.layout);
    const shape=await page.locator('#modelStage').evaluate(stage=>{const root=stage.querySelector('.bespoke-slide').getBoundingClientRect();return [...stage.querySelectorAll('.slide-title-text,.slide-subtitle,.slide-accent')].map(n=>{const r=n.getBoundingClientRect();return [Math.round(r.x-root.x),Math.round(r.y-root.y),Math.round(r.width),Math.round(r.height)];});});
    shapes.push(JSON.stringify(shape));
    await page.locator('#stage-start').click();
   }
   assert.equal(new Set(shapes).size,12,'Twelve visibly distinct geometries, not just colors');
  }
  await page.locator('#preset-professional').click();if(await page.locator('#presetDialog').isVisible())await page.locator('#presetApply').click();
  await page.locator('#modelStage .slide-title-text').focus();await page.keyboard.press('Enter');
  await page.locator('#context-text').fill('Team style <&>');await page.locator('#context-size').selectOption('large');
  assert.equal(await page.locator('#modelStage .slide-title-text').textContent(),'Team style <&>');
  await page.locator('#btnUndo').click();assert.equal((await current(page)).roleStyles.title.headingSize,'default');
  await page.locator('#btnRedo').click();assert.equal((await current(page)).roleStyles.title.headingSize,'large');
  for(const align of ['left','center','right']){await page.locator('#context-align').selectOption(align);assert.equal(await page.locator('#modelStage .slide-title-text').evaluate(n=>getComputedStyle(n).textAlign),align);}
  const positions=[];
  for(const placement of ['top','middle','bottom']){await page.locator('#context-placement').selectOption(placement);positions.push(await page.locator('#modelStage .slide-title-text').evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().top-n.getBoundingClientRect().top;}));}
  assert(positions[0]<positions[1]&&positions[1]<positions[2],JSON.stringify(positions));
  await page.locator('#selectedElement').selectOption('background');
  assert.deepEqual(await page.locator('#context-finish option').evaluateAll(ns=>ns.map(n=>n.value)),['solid','gradient']);
  await page.locator('#context-finish').selectOption('solid');assert.equal(await page.locator('#context-second').count(),0);
  await page.locator('#context-background').selectOption('primary');
  await page.locator('#context-finish').selectOption('gradient');
  await page.locator('#context-second').selectOption('mauve');
  const first=await page.locator('#modelStage .bespoke-slide').evaluate(n=>getComputedStyle(n).backgroundImage);
  await page.locator('#context-background').selectOption('dark');
  const second=await page.locator('#modelStage .bespoke-slide').evaluate(n=>getComputedStyle(n).backgroundImage);
  await page.locator('#context-second').selectOption('royal');
  const third=await page.locator('#modelStage .bespoke-slide').evaluate(n=>getComputedStyle(n).backgroundImage);
  assert.notEqual(first,second);assert.notEqual(second,third);assert.match(third,/linear-gradient/);
  await page.locator('#btnAddText').click();await page.locator('#context-text').fill('Team note <script>');
  await page.locator('#context-color').selectOption('light');await page.locator('#context-align').selectOption('center');await page.locator('#context-placement').selectOption('middle');
  assert.equal(await page.locator('#modelStage .slide-extra-text').textContent(),'Team note <script>');
  await page.locator('#previewTabs [data-view=cards]').click();await page.locator('#modelStage .slide-card h3').first().click();await page.locator('#context-text').fill('A custom box heading');
  await page.locator('#modelStage .slide-card .slide-body').first().click();await page.locator('#context-text').fill('A custom box body');
  await page.locator('#previewTabs [data-view=title]').click();
  const saved=await current(page);await page.reload();await page.locator('#selectedElement').waitFor();assert.deepEqual(await current(page),saved);
  if(width===1440){
   await page.addScriptTag({content:await fs.readFile(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8')});
   const violations=await page.evaluate(async()=>{const r=await axe.run({exclude:[['#modelStage']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);
  }
  if(screenshots)await page.screenshot({path:screenshots+`/editor-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No overflow at '+width);
  await page.locator('#stage-team').click();
  await page.locator('#teamName').fill('Synthetic design team');await page.locator('#spokespersonName').fill('Sample Instructor');await page.locator('#spokespersonEmail').fill('sample@example.org');
  const response=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();assert.equal((await (await response).json()).ok,true);
  const selection={schema:'bespoke-selection/v2',date:'2026-10-07',lesson:{id:'money-management',title:'Synthetic',displayTitle:'Synthetic',subtitle:''},team:{name:'Synthetic',spokesperson:{name:'Sample Instructor',email:'sample@example.org'}},design:saved};
  const contract=JSON.parse(execFileSync(process.execPath,['scripts/bespoke-model-bridge.mjs','design'],{input:JSON.stringify(selection),encoding:'utf8'}));
  assert.deepEqual(contract.errors,[]);assert.match(contract.css,/align-content:end/);assert.match(contract.markup.title,/Team note &lt;script&gt;/);assert.match(contract.markup.cards,/A custom box heading/);assert.match(contract.markup.cards,/A custom box body/);
  const python=JSON.parse(execFileSync('python3',['-c',"import json,sys;sys.path.insert(0,'scripts');from bespoke_design import build_design;css,contract=build_design(json.load(sys.stdin));print(json.dumps(contract))"],{input:JSON.stringify(selection),encoding:'utf8'}));
  assert.deepEqual(python.design,saved);assert.match(python.componentMarkup.title,/Team note &lt;script&gt;/);assert.match(python.componentMarkup.cards,/A custom box heading/);
  const state=await context.storageState();for(const origin of state.origins)origin.localStorage=origin.localStorage.filter(x=>!['bespoke-draft-v2','bespoke-previous-draft-v2'].includes(x.name));
  const restored=await browser.newContext({storageState:state});await restored.addInitScript(()=>window.__bespokeAutosave={enabled:false});const reopened=await restored.newPage();await reopened.goto(server.baseUrl+'/bespoke/');await reopened.waitForFunction(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2'))?.design.roleStyles?.title?.extraText==='Team note <script>');assert.deepEqual(await current(reopened),saved);
  await restored.close();await context.close();console.log('PASS layouts, editing, gradients, axes, history, save/restore and handoff at '+width);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();}
