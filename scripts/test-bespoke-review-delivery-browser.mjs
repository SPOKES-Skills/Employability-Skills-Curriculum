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
import {frameGaps,settle} from './bespoke-test-chrome.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import {defaultDesign,applyPreset,setFeatureStyle} from '../bespoke/builder-model.mjs';
import {submissionId} from '../netlify/functions/bespoke-handoff.mjs';
import {designKey} from '../bespoke/showcase-model.mjs';
const selection={schema:'bespoke-selection/v2',date:'2026-10-07',lesson:{id:'money-management',title:'Money Management'},team:{name:'Synthetic team',spokesperson:{name:'Synthetic reviewer',email:'synthetic@example.org'}},design:setFeatureStyle(catalog,defaultDesign(catalog),'sidebar','font','bitter'),alternatives:{active:'B',otherDesign:applyPreset(catalog,'modern')}};
const server=await createDevServer({port:0}),browser=await browserType.launch({headless:true});
const context=await browser.newContext(),errors=[],receipt=submissionId(selection),url='https://github.com/doclegg05/Curriculum-Employability-Skills/pull/123',artifactUrl='https://github.com/doclegg05/Curriculum-Employability-Skills/blob/'+('a'.repeat(40))+'/docs/phase-2/submissions/money-management/'+receipt+'/review.html';
// A follow-up note is a new save and a new send; its receipt and review request differ from the first.
// Each note's receipt comes from its saved selection, as in the store.
const noteUrl='https://github.com/doclegg05/Curriculum-Employability-Skills/pull/124',secondNoteUrl='https://github.com/doclegg05/Curriculum-Employability-Skills/pull/125';
let ready=false,sends=0,noteSends=0,saveConflict=false,holdSave=null,holdSend=null,shared={revision:'b'.repeat(40),savedAt:'2026-10-07T16:00:00Z',selection};const calls=[],sentNotes=[];
try{
 await context.addInitScript(()=>{window.__bespokeAutosave={enabled:false};if(!localStorage.getItem('bespoke-team-session-v2'))localStorage.setItem('bespoke-team-session-v2',JSON.stringify({lessonId:'money-management',editCode:'synthetic-review-test-access-code',revision:null,savedAt:null,baseSelectionKey:null,pendingSave:null}));});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());assert.equal(u.origin,'https://bespoke.test','Only synthetic origin is allowed');
  if(u.pathname==='/bespoke/handoff-config.json')return route.fulfill({json:{apiBase:'https://bespoke.test/api/bespoke'}});
  if(u.pathname==='/api/bespoke'){
   const body=route.request().postDataJSON();let result;calls.push(body.action);
   if(body.action==='save'&&saveConflict)return route.fulfill({status:409,json:{ok:false,error:'conflict',message:'A newer design is saved.',revision:'d'.repeat(40),savedAt:'2026-10-07T18:00:00Z'}});
   // Like the store, open returns the latest save.
   if(body.action==='save'&&holdSave)await holdSave;
   if(body.action==='save')result=shared={revision:'c'.repeat(40),savedAt:'2026-10-07T17:00:00Z',selection:body.selection};
   else if(body.action==='open')result=shared;
   else if(body.action==='send'){sends++;assert.deepEqual(body.selection.design,selection.design);assert.deepEqual(body.selection.alternatives,selection.alternatives);assert(!JSON.stringify(body.selection).includes('access-code'));sentNotes.push(body.selection.unspoken);if(holdSend)await holdSend;
    const note=Boolean(body.selection.unspoken);result={status:ready?'received':'processing',submissionId:note?submissionId(shared.selection):receipt,runId:12,url:note?[noteUrl,secondNoteUrl][noteSends++]:url,artifactUrl,revision:'a'.repeat(40)};}
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
 // The fanned slides fill their cards: no page white wedge under the top card, nothing cut off.
 await settle(page);const fan=await frameGaps(page,'#sentView .send-frame');assert.equal(fan.length,3,'three fanned slides');for(const {name,gaps} of fan)assert.ok(gaps&&gaps.every(gap=>Math.abs(gap)<=1),`${name} fills its card: gaps ${gaps}`);
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'sentHeading','entering the confirmation focuses its heading');
 assert.match(await page.locator('#sentView p').filter({hasText:'is on its way'}).textContent(),/^Your Money Management suggestion, .+, is on its way\. Britt and the program administrator will use it when they make the final design\.$/);
 assert.equal(await page.locator('#sentDetails a').getAttribute('href'),url);assert.equal(await page.locator('#sentDetails').evaluate(d=>d.open),false);
 // On the confirmation the receipt link lives only in Details: the page-wide receipt band steps aside.
 assert.equal(await page.locator('#lastReviewReceipt').isVisible(),false,'no receipt band over the confirmation');assert.equal(await page.locator('#teamSessionBar').isVisible(),false,'the strip holds nothing else, so it hides');
 await page.locator('#sentDetails > summary').click();assert.deepEqual(await page.locator(`a[href="${url}"]:visible`).evaluateAll(l=>l.map(a=>a.closest('#sentDetails')?.id)),['sentDetails'],'Details holds the only visible receipt link');await page.locator('#sentDetails > summary').click();
 for(const id of ['btnKeepEditing','btnDownloadCopy'])assert.ok((await page.locator('#'+id).boundingBox()).height>=44,id+' is at least 44px tall');
 const download=page.waitForEvent('download');await page.locator('#btnDownloadCopy').click();assert.match((await download).suggestedFilename(),/^money-management-.+-selection\.json$/);
 await page.locator('#btnKeepEditing').click();await page.locator('#workspace[data-stage=slides]').waitFor();
 assert.equal(await page.locator('#lastReviewReceipt').isVisible(),true,'other stages keep the receipt band');
 await sentView();
 await page.reload();await page.locator('#lastReviewReceipt').waitFor({state:'attached'});await sentView();
 // A follow-up note: under the buttons and above Details, it edits the same notes Send used and resends through Save then Send.
 const noteBox=page.locator('#sentView #sentNote'),noteButton=page.locator('#sentView #btnSendNote'),noteLine=page.locator('#sentView #sendFeedback');
 assert.equal(await page.getByLabel('Add a note for Britt',{exact:true}).getAttribute('id'),'sentNote','the note box has a visible label');
 assert.equal(await noteBox.inputValue(),'','the box shows the notes already sent');
 assert.equal(await noteButton.textContent(),'Send note to Britt');assert.equal(await noteButton.isDisabled(),true,'nothing new to send until the note changes');
 assert.deepEqual(await page.evaluate(()=>['btnDownloadCopy','sentNote','btnSendNote','sentDetails'].map(id=>document.getElementById(id)).map((el,i,all)=>i===0||Boolean(all[i-1].compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING))),[true,true,true,true],'the note sits under the buttons and above Details');
 for(const [name,el] of [['note box',noteBox],['note button',noteButton]]){assert.ok((await el.boundingBox()).height>=44,name+' is at least 44px tall');assert.match(await el.evaluate(n=>getComputedStyle(n).fontFamily),/Outfit/,name+' uses Outfit');}
 const note='Please keep the gold heading on the title slide.';
 await noteBox.fill(note);assert.equal(await noteButton.isDisabled(),false,'a changed note can be sent');
 await noteBox.focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.id),'btnSendNote','Tab moves from the note to its button');assert.equal(await noteButton.evaluate(b=>getComputedStyle(b).outlineStyle),'solid','the note button shows keyboard focus');
 assert(!calls.includes('save'),'the earlier flows never save');
 let release;holdSend=new Promise(resolve=>{release=resolve;});calls.length=0;
 await noteButton.click();await noteLine.filter({hasText:'Sending to Britt…'}).waitFor();
 assert.equal(await noteButton.isDisabled(),true,'the button waits while the note is in flight');
 release();holdSend=null;await page.locator(`#sentDetails a[href="${noteUrl}"]`).waitFor({state:'attached'});
 assert.deepEqual(calls,['save','send'],'the note saves, then sends');assert.equal(sentNotes.at(-1),note,'the send carries the new note');
 assert.equal(await page.locator('#sentView').isVisible(),true,'the view stays Sent to Britt');
 assert.equal(await noteLine.textContent(),'Note sent.');assert.equal(await noteButton.isDisabled(),true,'the sent note is not sent twice');
 assert.equal(await page.locator('#toast').filter({hasText:'Sent to Britt.'}).count(),0,'on Send the view confirms, not a toast');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-team-session-v2')))).lastReceipt.submissionId,submissionId(shared.selection),'the receipt is the saved note');
 await page.reload();await page.locator('#lastReviewReceipt').waitFor({state:'attached'});await sentView();
 assert.equal(await noteBox.inputValue(),note,'after a reload the box shows the note already sent');assert.equal(await noteButton.isDisabled(),true);
 // A save conflict stops before Send: the message shows beside the button and in the strip, and the note is kept.
 saveConflict=true;calls.length=0;await noteBox.fill(note+' Thank you.');await noteButton.click();
 const clash=/Someone saved a newer shared version/;await noteLine.filter({hasText:clash}).waitFor();
 assert.match(await page.locator('#fileStatus').textContent(),clash,'the strip shows the conflict too');
 assert.equal(await noteBox.inputValue(),note+' Thank you.','the note text is kept');assert.deepEqual(calls,['save'],'a failed save does not send');
 saveConflict=false;assert.deepEqual(errors,[]);
 console.log('PASS a follow-up note saves then sends, keeps the Sent to Britt view and stops on a save conflict');
 // With autosave on, a save already in flight disables the note button; when it ends the button returns and the note goes out.
 await noteBox.fill(note);await context.addInitScript(()=>{window.__bespokeAutosave={enabled:true,idleMs:300};});
 await page.reload();await page.locator('#lastReviewReceipt').waitFor({state:'attached'});await sentView();
 let releaseSave;holdSave=new Promise(resolve=>{releaseSave=resolve;});calls.length=0;
 const followUp=note+' And the berry divider, please.';await noteBox.fill(followUp);
 for(const start=Date.now();!calls.includes('save');await page.waitForTimeout(50))assert.ok(Date.now()-start<5000,'autosave starts a save');
 assert.equal(await noteButton.isDisabled(),true,'the note button waits while an automatic save is in flight');
 releaseSave();holdSave=null;await page.waitForFunction(()=>document.getElementById('btnSendNote')?.disabled===false);
 calls.length=0;await noteButton.click();await page.locator(`#sentDetails a[href="${secondNoteUrl}"]`).waitFor({state:'attached'});
 assert.deepEqual(calls,['save','send'],'after the automatic save the note saves, then sends');assert.equal(sentNotes.at(-1),followUp);
 assert.equal(await noteLine.textContent(),'Note sent.');assert.deepEqual(errors,[]);
 console.log('PASS an automatic save in flight holds the note button, which returns and sends when it ends');
 await page.locator('#stage-slides').click();await page.locator('#modelStage .slide-title-text').click();
 await page.locator('#context-color-well').click();await page.locator('#context-color-popover [role=radio][aria-checked=false]').first().click();
 await page.locator('#stage-review').click();await page.locator('#sentChangedNote').waitFor();
 assert.equal(await page.locator('#sentView').count(),0,'an edited design returns Send to normal');
 assert.match(await page.locator('#sentChangedNote').textContent(),/^Sent to Britt on .+\. You have changed it since\.$/);
 assert.equal(await page.locator('#sendPanel #sentChangedNote').count(),1,'the sent note sits in the summary panel');
 assert.deepEqual(errors,[]);
 console.log('PASS Sent to Britt shows on Send for the sent design, after a reload, and steps aside once the team edits');
 // View-only sessions never see the Sent view or its note box, even with the lead's receipt in this browser.
 const viewer=await context.newPage();viewer.on('pageerror',e=>errors.push(e.message));
 await viewer.goto('https://bespoke.test/bespoke/#view=money-management.synthetic-review-test-view-code');await viewer.locator('body[data-access=view]').waitFor();
 await viewer.locator('#stage-review').click();await viewer.locator('#sendPanel').waitFor();
 assert.equal(await viewer.locator('#sentView, #sentNote, #btnSendNote').count(),0,'a view-only session has no Sent view or note box');await viewer.close();
 // The local test preview cannot send, so the Sent view there has no note button.
 const local=await browser.newContext(),design=selection.design;
 await local.addInitScript(([draft,session])=>{window.__bespokeAutosave={enabled:false};localStorage.setItem('bespoke-draft-v2',draft);localStorage.setItem('bespoke-team-session-v2',session);},
  [JSON.stringify({design,lessonId:'money-management',changes:[],redo:[]}),JSON.stringify({lessonId:'money-management',editCode:'bespoke-local-preview-synthetic',revision:null,savedAt:null,baseSelectionKey:null,pendingSave:null,lastReceipt:{submissionId:receipt,url,receivedAt:'2026-10-07T17:00:00Z',designKey:designKey(design)}})]);
 const localPage=await local.newPage();localPage.on('pageerror',e=>errors.push(e.message));
 await localPage.goto(server.baseUrl+'/bespoke/');await localPage.locator('#localPreviewNotice').waitFor();
 await localPage.locator('#stage-review').click();await localPage.locator('#sentView').waitFor();
 assert.equal(await localPage.locator('#btnSendNote').isVisible(),false,'the local preview hides the note button');await local.close();
 assert.deepEqual(errors,[]);
 console.log('PASS view-only sessions never see the note box and the local preview hides its button');
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
