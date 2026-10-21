#!/usr/bin/env node
// Simulated hosted origin, fully intercepted: no production requests or submissions.
import assert from 'node:assert/strict';
import {clickMenuItem} from './bespoke-test-navigation.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import {defaultDesign,applyPreset,setFeatureStyle} from '../bespoke/builder-model.mjs';
import {submissionId} from '../netlify/functions/bespoke-handoff.mjs';
const selection={schema:'bespoke-selection/v2',date:'2026-10-07',lesson:{id:'money-management',title:'Money Management'},team:{name:'Synthetic team',spokesperson:{name:'Synthetic reviewer',email:'synthetic@example.org'}},design:setFeatureStyle(catalog,defaultDesign(catalog),'sidebar','font','bitter'),alternatives:{active:'B',otherDesign:applyPreset(catalog,'modern')}};
const server=await createDevServer({port:0}),browser=await browserType.launch({headless:true});
const context=await browser.newContext(),errors=[],receipt=submissionId(selection),url='https://github.com/doclegg05/Curriculum-Employability-Skills/pull/123',artifactUrl='https://github.com/doclegg05/Curriculum-Employability-Skills/blob/'+('a'.repeat(40))+'/docs/phase-2/submissions/money-management/'+receipt+'/review.html';
let ready=false,sends=0;
try{
 await context.addInitScript(()=>{window.__bespokeAutosave={enabled:false};if(!localStorage.getItem('bespoke-team-session-v2'))localStorage.setItem('bespoke-team-session-v2',JSON.stringify({lessonId:'money-management',editCode:'synthetic-review-test-access-code',revision:null,savedAt:null,baseSelectionKey:null,pendingSave:null}));});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());assert.equal(u.origin,'https://bespoke.test','Only synthetic origin is allowed');
  if(u.pathname==='/bespoke/handoff-config.json')return route.fulfill({json:{apiBase:'https://bespoke.test/api/bespoke'}});
  if(u.pathname==='/api/bespoke'){
   const body=route.request().postDataJSON();let result;
   if(body.action==='open')result={revision:'b'.repeat(40),savedAt:'2026-10-07T16:00:00Z',selection};
   else if(body.action==='send'){sends++;assert.deepEqual(body.selection.design,selection.design);assert.deepEqual(body.selection.alternatives,selection.alternatives);assert(!JSON.stringify(body.selection).includes('access-code'));result={status:ready?'received':'processing',submissionId:receipt,runId:12,url,artifactUrl,revision:'a'.repeat(40)};}
   else if(body.action==='status')result={status:ready?'received':'processing',submissionId:receipt,runId:12,url,artifactUrl,revision:'a'.repeat(40)};
   else throw new Error('Unexpected synthetic action: '+body.action);
   return route.fulfill({json:{ok:true,...result}});
  }
  return route.fulfill({response:await route.fetch({url:server.baseUrl+u.pathname+u.search,headers:{...route.request().headers(),origin:server.baseUrl}})});
 });
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')console.error(m.text());});page.on('requestfailed',r=>console.error(r.url(),r.failure()));page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);await page.goto('https://bespoke.test/bespoke/');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')||'null')?.alternatives?.active==='B').catch(async e=>{console.error(await page.locator('body').innerText(),errors);throw e;});
 await clickMenuItem(page, '#btnSend');await page.locator('#fileStatus').filter({hasText:'not a receipt yet'}).waitFor();assert.equal(await page.locator('#lastReviewReceipt').isVisible(),false);
 // A pending send says so in the Send panel; a receipt confirmed on another stage is a toast, and the confirmation waits on Send.
 await page.locator('#stage-review').click();assert.equal(await page.locator('#sendFeedback').textContent(),'Sending to Britt…');assert.equal(await page.locator('#sentView').count(),0);
 await page.locator('#stage-slides').click();await page.locator('#workspace[data-stage=slides]').waitFor();
 ready=true;await page.locator('#btnCheckStatus').click();await page.locator('#lastReviewReceipt').waitFor();
 await page.locator('#toast').filter({hasText:'Sent to Britt.'}).waitFor();assert.equal(await page.locator('#sentView').isVisible(),false,'the confirmation view waits on Send');assert.match(await page.locator('#lastReviewReceipt').textContent(),/does not confirm/);assert.equal(await page.locator('#lastReviewReceipt a').last().getAttribute('href'),artifactUrl);
 await page.reload();await page.locator('#lastReviewReceipt').waitFor();assert.equal(await page.locator('#lastReviewReceipt a').first().getAttribute('href'),url);assert.equal(sends,1);
 const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-team-session-v2')));assert.equal(session.lastReceipt.submissionId,receipt);assert.deepEqual(errors,[]);
 console.log('PASS processing is not delivery; verified PR and pinned artifact remain findable after reload; no automatic review claim');
 // After Send: the confirmation replaces Send while the sent design is unchanged, and survives a reload.
 const sentView=async()=>{await page.locator('#stage-review').click();await page.locator('#sentView').waitFor();};
 await sentView();assert.match(await page.locator('#sentView').textContent(),/Sent to Britt/);
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'sentHeading','entering the confirmation focuses its heading');
 assert.match(await page.locator('#sentView p').filter({hasText:'is on its way'}).textContent(),/^Your Money Management suggestion, .+, is on its way\. Britt and the program administrator will use it when they make the final design\.$/);
 assert.equal(await page.locator('#sentDetails a').getAttribute('href'),url);assert.equal(await page.locator('#sentDetails').evaluate(d=>d.open),false);
 for(const id of ['btnKeepEditing','btnDownloadCopy'])assert.ok((await page.locator('#'+id).boundingBox()).height>=44,id+' is at least 44px tall');
 const download=page.waitForEvent('download');await page.locator('#btnDownloadCopy').click();assert.match((await download).suggestedFilename(),/^money-management-.+-selection\.json$/);
 await page.locator('#btnKeepEditing').click();await page.locator('#workspace[data-stage=slides]').waitFor();
 await sentView();
 await page.reload();await page.locator('#lastReviewReceipt').waitFor({state:'attached'});await sentView();
 await page.locator('#stage-slides').click();await page.locator('#modelStage .slide-title-text').click();
 await page.locator('#context-color-well').click();await page.locator('#context-color-popover [role=radio][aria-checked=false]').first().click();
 await page.locator('#stage-review').click();await page.locator('#sentChangedNote').waitFor();
 assert.equal(await page.locator('#sentView').count(),0,'an edited design returns Send to normal');
 assert.match(await page.locator('#sentChangedNote').textContent(),/^Sent to Britt on .+\. You have changed it since\.$/);
 assert.equal(await page.locator('#sendPanel #sentChangedNote').count(),1,'the sent note sits in the summary panel');
 assert.deepEqual(errors,[]);
 console.log('PASS Sent to Britt shows on Send for the sent design, after a reload, and steps aside once the team edits');
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bespoke-offline-review-'));
 try{
  const file=path.join(temp,'payload.json');await fs.writeFile(file,JSON.stringify(selection));
  const folder=execFileSync('python3',['scripts/bespoke-write-submission.py',file,'--repo-root',temp],{encoding:'utf8'}).trim().slice('Wrote '.length);
  const visual=await fs.readFile(path.join(folder,'review.html'),'utf8');
  const offline=await browser.newPage(),requests=[];
  offline.on('request',r=>{if(!r.url().startsWith('data:'))requests.push(r.url());});
  await offline.setContent(visual);await offline.evaluate(()=>document.fonts.ready);
  assert.equal(await offline.locator('.bespoke-slide').count(),5);
  assert.equal(await offline.locator('img.slide-logo').evaluate(image=>image.complete&&image.naturalWidth>0),true);
  assert.match(await offline.locator('[data-kind=cards] .sample-sidebar-title').first().textContent(),/Money Management/);
  assert.match(await offline.locator('[data-kind=cards] .slide-sidebar').evaluate(n=>getComputedStyle(n).fontFamily),/Bitter/);
  assert.equal(await offline.evaluate(()=>Array.from(document.fonts).some(f=>f.family.includes('Bitter')&&f.status==='loaded')),true);
  assert.deepEqual(requests,[],'Downloaded review renders without a network or checkout assets');await offline.close();
 }finally{await fs.rm(temp,{recursive:true,force:true});}
 console.log('PASS standalone submitted review renders all five slides, actual fonts and logo offline');

}finally{await context.close();await browser.close();await server.close();}
