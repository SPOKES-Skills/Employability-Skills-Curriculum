#!/usr/bin/env node
// Real editor controls and inert generated/canonical media; never touches user state.
import { builderDestination, switchSurface } from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { browserType } from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type:'json' };
import { defaultDesign, inkFor } from '../bespoke/builder-model.mjs';
import { createDevServer } from './bespoke-dev-server.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';

const root = path.resolve(import.meta.dirname, '..'), output = process.env.BESPOKE_REVIEW_DIR;
if (output) await fs.mkdir(output, {recursive:true});
const legacy = JSON.parse(await fs.readFile(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json')));
const template = await fs.readFile(path.join(root, 'SPOKES Builder/template.html'), 'utf8');
const templateCss = [...template.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
// Keep the actual wrapper and inline sizing, but strip sources/poster/tracks so no media loads.
const canonicalVideo = template.match(/<section class="slide slide-video"[\s\S]*?<\/section>/)[0]
  .replace('slide slide-video','slide slide-video active').replace(/<source[^>]*>|<track[^>]*>/g,'')
  .replace(/poster="[^"]*"/g,'').replaceAll('{{Video Title}}','Synthetic video');
const canonicalIframe = canonicalVideo.replace(/<video[\s\S]*?<\/video>/,'<iframe title="Synthetic inert frame" sandbox></iframe>');
const scenarios = [
  {name:'blue-on-blue',sidebar:'primary',accent:'primary',contentBackground:'gold'},
  {name:'all-blue',sidebar:'primary',accent:'primary',contentBackground:'primary'},
  {name:'all-white',sidebar:'light',accent:'light',contentBackground:'light'},
  {name:'all-royal',sidebar:'royal',accent:'royal',contentBackground:'royal'},
  {name:'accent-matches-background',sidebar:'primary',accent:'gold',contentBackground:'gold'},
];
const layouts = ['stacked','side','banner'];
const payload = design => ({schema:'bespoke-selection/v2',date:'2026-09-24',submittedAt:'2026-09-24T16:30:00.000Z',lesson:legacy.lesson,team:legacy.team,design});
const channels = id => [1,3,5].map(i=>parseInt(catalog.palette.find(c=>c.id===id).hex.slice(i,i+2),16));
const color = id => `rgb(${channels(id).join(', ')})`;
const evidence = [], contexts = [], requests = [], errors = [];
const server = await createDevServer({port:0}), browser = await browserType.launch();
async function editor(width) {
  const context = await browser.newContext({viewport:{width,height:1080},reducedMotion:'reduce'});contexts.push(context);
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  await context.route(/^https?:/,route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  context.on('request',request=>requests.push(request));
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const page = await context.newPage();page.on('dialog',dialog=>dialog.accept());
  await page.goto(server.baseUrl+'/bespoke/');await page.locator('#localPreviewNotice').waitFor();
  await page.locator('#btnSave').filter({hasText:'Save test design'}).waitFor();return page;
}
const saved = page=>page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
async function designSurface(page) {if(await page.locator('#surface-design').isVisible())await page.locator('#surface-design').click();}
const go = builderDestination;
async function choose(page,label,value) {await designSurface(page);await page.getByRole('group',{name:new RegExp(label)}).locator(`[data-choice="${value}"]`).click();}
async function preview(page,width) {if(width===390)await switchSurface(page,'preview');await page.evaluate(()=>document.fonts.ready);}
async function measure(frame) {
  return frame.evaluate(el=>{
    const b=el.getBoundingClientRect(), child=el.firstElementChild, c=child.getBoundingClientRect(), s=getComputedStyle(el), cs=getComputedStyle(child);
    const slide=el.closest('.bespoke-slide,.slide'),r=slide.getBoundingClientRect();
    return {w:b.width,h:b.height,x:b.x-r.x,y:b.y-r.y,slideW:r.width,slideH:r.height,scrollW:slide.scrollWidth,
      border:s.borderTopWidth,borderColor:s.borderTopColor,padding:s.paddingTop,outline:s.outlineWidth,outlineColor:s.outlineColor,shadow:s.boxShadow,
      child:{x:c.x-b.x,y:c.y-b.y,w:c.width,h:c.height,background:cs.backgroundColor,position:cs.position},
      columns:getComputedStyle(slide).gridTemplateColumns};
  });
}
function check(m,design,label) {
  const accent=design.slides.video.frame==='accent', inset=accent?8:0;
  assert.equal(m.border,accent?'6px':'0px',label+': border');assert.equal(m.padding,accent?'2px':'0px');
  assert.equal(m.outline,accent?'2px':'0px');assert.equal(m.shadow,'none');
  if(accent){assert.equal(m.borderColor,color(design.roles.accent));assert.equal(m.outlineColor,color(inkFor(catalog,design.roles.accent)));}
  assert.equal(m.child.background,color(design.roles.sidebar));
  assert(Math.abs(m.w/m.h-16/9)<.02,label+': responsive aspect ratio');
  assert(m.x>=-1&&m.x+m.w<=m.slideW+1&&m.y>=-1&&m.y+m.h<=m.slideH+1,label+': frame contained');
  assert(m.scrollW<=m.slideW+1,label+': no horizontal overflow');
  assert(Math.abs(m.child.x-inset)<1&&Math.abs(m.child.y-inset)<1,label+': media respects frame inset');
  assert(Math.abs(m.child.w-(m.w-inset*2))<1&&Math.abs(m.child.h-(m.h-inset*2))<1,label+': media stays inside frame');
}
async function pixels(page,png,design) {
  const rows=await page.evaluate(async encoded=>{
    const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);bitmap.close();
    return [1,4,7].map(y=>[...c.getImageData(Math.floor(canvas.width/2),y,1,1).data].slice(0,3));
  },png.toString('base64'));
  const keyline=channels(inkFor(catalog,design.roles.accent)),accent=channels(design.roles.accent),surface=channels(design.roles.sidebar);
  assert.deepEqual(rows,design.slides.video.frame==='accent'?[keyline,accent,keyline]:[surface,surface,surface], 'Rendered frame pixels follow the chosen accent and separating keylines');
  return rows;
}
let editorChecks=0, generatedChecks=0, parity=0;
try {
  for(const width of [1920,390]) {
    const page=await editor(width), generatedPage=await page.context().newPage();
    for(const scenario of scenarios) {
      const design=defaultDesign(catalog);const {name,...roles}=scenario;Object.assign(design.roles,roles);
      design.fonts={heading:'raleway',body:'source-sans-3'};design.background='crosshatch';
      await designSurface(page);
      await page.locator('#teamFileInput').setInputFiles({name:'synthetic-video.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload(design)))});
      await page.locator('#fileStatus').filter({hasText:'Opened synthetic-video.json.'}).waitFor();await go(page,'Video slide');
      for(const layout of layouts) {
        await choose(page,'Arrangement',layout);let plain;
        for(const frame of ['plain','accent']) {
          await choose(page,'Video frame',frame);const expected={...design,startingPoint:'custom',slides:{...design.slides,video:{...design.slides.video,layout,frame}}};
          assert.deepEqual(await saved(page),expected,'Frame selection only changes its own design choice');
          await preview(page,width);await page.mouse.move(0,0); // Inspect artwork without the editor hover indicator.
          const slide=page.locator('#modelStage [data-kind="video"]'),frameNode=slide.locator('.slide-video-frame');
          assert.equal(await slide.locator('video,iframe').count(),0,'Editor sample remains inert');
          const m=await measure(frameNode);check(m,expected,`editor ${width}/${name}/${layout}/${frame}`);
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Editor viewport does not overflow');
          const png=await frameNode.screenshot(), bands=await pixels(page,png,expected);editorChecks++;
          if(frame==='plain')plain=png;else{
            const delta=await pixelDifference(page,plain,png);assert(delta.changedFraction>.008,'Frame must visibly change even with matching colors');
            evidence.push({width,name,layout,...m,...delta});
          }
          if(output&&layout==='banner'&&['blue-on-blue','all-white','all-royal'].includes(name))await slide.screenshot({path:path.join(output,`video-${width}-${name}-${frame}.png`)});

          const generated=JSON.parse(execFileSync(process.execPath,['scripts/bespoke-model-bridge.mjs','design'],{cwd:root,input:JSON.stringify(payload(expected)),encoding:'utf8'}));assert.deepEqual(generated.errors,[]);
          for(const kind of ['sample','video','iframe']) {
            const markup=kind==='sample'?generated.markup.video:kind==='video'?canonicalVideo:canonicalIframe;
            await generatedPage.setContent(`<html><head><base href="${server.baseUrl}/bespoke/"><style>${kind==='sample'?'':templateCss}</style><style>html,body{margin:0;padding:0}main{width:${m.slideW}px;max-width:100%}*,*::before,*::after{animation:none!important;transition:none!important}</style><style>${generated.css}</style></head><body><main>${markup}</main></body></html>`);
            await generatedPage.evaluate(()=>document.fonts.ready);
            const node=generatedPage.locator(kind==='sample'?'.slide-video-frame':'.video-container'),gm=await measure(node);
            check(gm,expected,`${kind} ${width}/${name}/${layout}/${frame}`);generatedChecks++;
            const gpng=await node.screenshot();
            if(frame==='accent'||kind==='sample'){assert.deepEqual(await pixels(generatedPage,gpng,expected),bands,'Generated/canonical frame bands match live preview pixels');parity++;}
            if(kind==='sample'){assert.equal(gm.w,m.w);assert.equal(gm.h,m.h);}
            if(kind!=='sample'&&width===390&&layout==='side')assert(!gm.columns.includes(' '),'Canonical side layout stacks on phone');
            if(kind==='video')assert(await node.locator('video').evaluate(el=>el.paused&&!el.autoplay&&el.networkState===0),'Native video remains unloaded and paused');
          }
        }
      }
    }
    const final=await saved(page);
    await designSurface(page);await page.locator('#btnUndo').click();assert.equal((await saved(page)).slides.video.frame,'plain');
    await page.locator('#btnRedo').click();assert.deepEqual(await saved(page),final);
    await go(page,'Shared typography');await go(page,'Video slide');assert.deepEqual(await saved(page),final);
    const response=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();assert.equal((await response).status(),200);
    await page.locator('#fileStatus').filter({hasText:/Local test design saved|already up to date/}).waitFor();
    await page.reload();await page.locator('#localPreviewNotice').waitFor();await go(page,'Video slide');assert.deepEqual(await saved(page),final);
    const reopened=await editor(width);await go(reopened,'Video slide');assert.deepEqual(await saved(reopened),final);
    await preview(reopened,width);check(await measure(reopened.locator('#modelStage .slide-video-frame')),final,'reopened');
    console.log(`PASS video frames at ${width}px: all arrangements, matching colors, real pixels, media containment and durable recovery`);
  }
  assert.deepEqual(errors,[],'No browser runtime errors');
  assert(!requests.some(r=>r.resourceType()==='media'||/\.(mp4|vtt)(?:\?|$)/.test(r.url())),'No media was loaded');
  // WebKit reports our in-memory PNG decoding as blob: image requests. These
  // never use the network; retain the external HTTP(S) dependency assertion.
  assert.deepEqual(requests.filter(r=>/^https?:/.test(r.url())&&new URL(r.url()).origin!==server.baseUrl).map(r=>({url:r.url(),type:r.resourceType()})),[],'No external network requests');
  if(output)await fs.writeFile(path.join(output,'video-frame-evidence.json'),JSON.stringify(evidence,null,2));
  console.log(`Video frame checks: ${editorChecks} editor, ${generatedChecks} generated/canonical, ${parity} exact frame-band pixel parity comparisons.`);
} finally {for(const context of contexts)await context.close();await browser.close();await server.close();}
