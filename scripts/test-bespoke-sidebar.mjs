#!/usr/bin/env node
// Sidebar preview checks use an ephemeral synthetic service and isolated browsers.
import { builderDestination } from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import catalog from '../bespoke/builder-catalog.json' with {type:'json'};
import { cssForDesign, renderSlide, inkFor } from '../bespoke/builder-model.mjs';
import { createDevServer } from './bespoke-dev-server.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';

const root=path.resolve(import.meta.dirname,'..'),output=process.env.BESPOKE_REVIEW_DIR;
if(output)await fs.mkdir(output,{recursive:true});
const engine=process.env.BESPOKE_BROWSER||'chromium';
assert(['chromium','webkit'].includes(engine));
const axeSource=await fs.readFile(path.join(root,'node_modules/axe-core/axe.min.js'),'utf8');
const template=await fs.readFile(path.join(root,'SPOKES Builder/template.html'),'utf8');
const templateCss=[...template.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const templateNav=template.match(/<nav class="sidebar"[\s\S]*?<\/nav>/)[0];
const server=await createDevServer({port:0}),browser=await ({chromium,webkit}[engine]).launch();
const contexts=[],errors=[],requests=[],evidence=[];
let geometryChecks=0,paints=0,axes=0,generatedChecks=0;
const color=id=>{const hex=catalog.palette.find(c=>c.id===id).hex;return `rgb(${[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)).join(', ')})`;};
async function pageFor(width,height=900,scale=1) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});contexts.push(context);
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  await context.route(/^https?:/,route=>{requests.push(route.request());return new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort();});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const page=await context.newPage();await page.goto(server.baseUrl+'/bespoke/');
  await page.locator('#btnSave').filter({hasText:'Save test design'}).waitFor();
  if(scale!==1)await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
  await page.evaluate(()=>document.fonts.ready);return page;
}
async function surface(page,name) {if(await page.locator('#surface-'+name).isVisible())await page.locator('#surface-'+name).click();}
const go = builderDestination;
async function preview(page,kind) {if(['team','start'].includes(await page.locator('#workspace').getAttribute('data-stage'))){await page.locator('#stage-slides').click();if(!await page.locator('#detailControls').isVisible())await page.locator('#btnMoreOptions').click();}await surface(page,'preview');await page.locator(`#previewTabs [data-view="${kind}"]`).click();await page.evaluate(()=>document.fonts.ready);}
const design=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
async function openDrawer(page) {
  const summary=page.locator('#modelStage .slide-sidebar-disclosure > summary');
  if(await summary.isVisible()&&!await summary.evaluate(el=>el.parentElement.open))await summary.click();
  return summary;
}
async function check(page,label,{generated=false}={}) {
  const slide=page.locator(generated?'.bespoke-slide':'#modelStage .bespoke-slide');
  const m=await slide.evaluate(el=>{
    const r=el.getBoundingClientRect(),box=n=>{if(!n)return null;const b=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,scrollW:n.scrollWidth,clientW:n.clientWidth,background:s.backgroundColor,color:s.color,display:s.display};};
    const nav=el.querySelector(':scope > .slide-sidebar'),main=el.querySelector(':scope > .slide-content'),details=el.querySelector('.slide-sidebar-disclosure'),summary=details?.querySelector('summary'),drawer=details?.querySelector('.slide-sidebar-drawer');
    return {w:r.width,h:r.height,rootFontSize:parseFloat(getComputedStyle(document.documentElement).fontSize),scrollW:el.scrollWidth,columns:getComputedStyle(el).gridTemplateColumns,nav:box(nav),main:box(main),summary:box(summary),drawer:box(drawer),open:details?.open,
      mainCopy:[...main.querySelectorAll('.slide-heading,.slide-card,.slide-activity,.slide-video-frame')].map(box)};
  });
  assert(m.nav&&m.main&&m.summary&&m.drawer,label+': full and narrow navigation structures exist');
  assert(m.scrollW<=m.w+1,label+': canvas fits horizontally');
  const within=b=>b.x>=-.5&&b.y>=-.5&&b.x+b.w<=m.w+.5&&b.y+b.h<=m.h+.5;
  assert(within(m.main),label+': main content contained');
  if(m.nav.w) {
    assert(Math.abs(m.nav.w-280)<1,label+': expanded rail matches280px reference width');
    assert(m.nav.h>m.nav.w,label+': navigation is a vertical rail');
    assert(m.nav.x+m.nav.w<=m.main.x+1,label+': sidebar sits beside, not above, content');
    assert(m.summary.w===0,label+': compact disclosure hidden on full rail');
  } else {
    assert(m.summary.w>0,label+': narrow preview exposes its sidebar sample');
    assert(m.main.w>=m.w-1,label+': narrow navigation leaves full content width');
    if(m.open){assert(within(m.drawer),label+': expanded narrow drawer stays within sample canvas');assert(m.drawer.w<=Math.min(17.5*m.rootFontSize,m.w)+.5,label+': drawer adapts reference width to enlarged text within the canvas');}
  }
  for(const b of m.mainCopy)assert(within(b)&&b.scrollW<=b.clientW+1,label+': content boxes remain contained');
  const interactive=await slide.locator('.slide-sidebar a[href],.slide-sidebar button,.slide-sidebar input,.slide-sidebar-drawer a[href],.slide-sidebar-drawer button,.slide-sidebar-drawer input').count();
  assert.equal(interactive,0,label+': sample chapter/resource entries remain inert');
  assert.equal(await slide.locator('video,iframe,audio').count(),0,label+': no media is loaded');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': no document overflow');
  evidence.push({label,...m});geometryChecks++;return m;
}
async function screenshot(page,name) {
  // A full-page capture at scrollY=0 avoids depicting offscreen fixed controls at
  // their scrolled document offsets. This changes only the isolated test viewport.
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(output,name),fullPage:true});
}
async function axe(page,label) {
  await page.addScriptTag({content:axeSource});
  const violations=await page.evaluate(async()=> (await window.axe.run({exclude:[['.slide-watermark']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[],label+': accessibility scan');axes++;
}
try {
  for(const {width,height,scale} of [{width:1920,height:1080,scale:1},{width:1440,height:900,scale:1},{width:1100,height:800,scale:1},{width:768,height:900,scale:1},{width:390,height:844,scale:1},{width:320,height:568,scale:1},{width:390,height:568,scale:2}]) {
    const page=await pageFor(width,height,scale),label=`${width}/${scale}`;
    await go(page,'Shared colors');await page.locator('#colorRole').selectOption('sidebar');
    const initial=await design(page);
    for(const kind of ['cards','video','activity']) {
      await preview(page,kind);
      const toggle=page.locator('#modelStage .slide-sidebar-disclosure > summary');
      if(await toggle.isVisible()&&await toggle.evaluate(el=>el.parentElement.open))await toggle.click();
      await check(page,`${label}/${kind}/closed`);
      if(width===390)await axe(page,`${label}/${kind}/closed`);
      if(output&&kind==='video'&&[1100,390,320].includes(width))await screenshot(page,`sidebar-${width}-${scale}-closed.png`);
      const summary=await openDrawer(page);await check(page,`${label}/${kind}/open`);
      if(await summary.isVisible()){
        const drawer=page.locator('#modelStage .slide-sidebar-drawer');await drawer.focus();assert(await drawer.evaluate(el=>el===document.activeElement),'Scrollable sample drawer is keyboard focusable');
        const needsScroll=await drawer.evaluate(el=>el.scrollHeight>el.clientHeight+1);
        if(needsScroll){await drawer.press('End');await page.waitForFunction(()=>{const el=document.querySelector('#modelStage .slide-sidebar-drawer');return el.scrollTop+el.clientHeight>=el.scrollHeight-2;});}
        const footer=await drawer.locator('.sample-slide-counter').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.top>=p.top-1&&r.bottom<=p.bottom+1;});assert(footer,'Footer remains reachable inside open sidebar');
        await drawer.evaluate(el=>el.scrollTop=0);
        if(scale===2) {
          const labels=await drawer.locator('.sample-chapter > span:last-child').evaluateAll(nodes=>nodes.slice(0,2).map(node=>{const range=document.createRange();range.selectNodeContents(node);return {text:node.textContent,lines:range.getClientRects().length,width:node.getBoundingClientRect().width};}));
          assert(labels.every(item=>item.lines<=2),'Enlarged Warm-Up and Introduction labels remain readable without letter columns');
          evidence.push({label:label+'/'+kind+'/enlarged-labels',labels});
        }
        await summary.focus();await page.keyboard.press('Enter');assert(!await summary.evaluate(el=>el.parentElement.open),'Keyboard closes the sample drawer');
        await page.keyboard.press('Space');assert(await summary.evaluate(el=>el.parentElement.open),'Keyboard opens the sample drawer');
      }
      assert.deepEqual(await design(page),initial,'Opening sample navigation does not mutate the design');
      if(output&&((width===1920&&kind==='cards')||([1100,390,320].includes(width)&&kind==='video')))await screenshot(page,`sidebar-${width}-${scale}-open.png`);
      if(width===1920||width===390)await axe(page,`${label}/${kind}`);
    }
    // The title/divider arrangement canvas remains its own existing role sample.
    for(const kind of ['title','divider']) {await preview(page,kind);assert.equal(await page.locator('#modelStage .slide-sidebar,#modelStage .slide-sidebar-disclosure').count(),0);}
    if(![1920,390].includes(width)||scale!==1)continue;
    await go(page,'Start');await page.locator('#teamName').fill('Synthetic sidebar team');await page.locator('#spokespersonName').fill('Sample Instructor');await page.locator('#spokespersonEmail').fill('sidebar@example.org');
    await go(page,'Shared colors');await page.locator('#colorRole').selectOption('sidebar');await preview(page,'cards');await openDrawer(page);
    const before=await design(page);let firstPng;
    for(const choice of catalog.palette) {
      await surface(page,'design');await page.locator(`[data-color="${choice.id}"]`).click();await surface(page,'preview');
      const expected={...before,startingPoint:'custom',roles:{...before.roles,sidebar:choice.id}};
      assert.deepEqual(await design(page),expected,'Sidebar paint changes only its own role');
      const m=await check(page,`${label}/paint-${choice.id}`),node=page.locator(m.nav.w?'#modelStage .bespoke-slide > .slide-sidebar':'#modelStage .slide-sidebar-drawer');
      if(!m.nav.w)assert(m.open,'Open drawer survives immediate paint rerender');
      assert.equal(await node.evaluate(el=>getComputedStyle(el).backgroundColor),color(choice.id));
      assert.equal(await node.evaluate(el=>getComputedStyle(el).color),color(inkFor(catalog,choice.id)));
      const png=await node.screenshot();if(firstPng){const delta=await pixelDifference(page,firstPng,png);assert(delta.changedFraction>.1,'Painting visibly changes the vertical navigation area');}else firstPng=png;
      paints++;
    }
    const final=await design(page);await surface(page,'design');await page.locator('#btnUndo').click();assert.notEqual((await design(page)).roles.sidebar,final.roles.sidebar);
    await page.locator('#btnRedo').click();assert.deepEqual(await design(page),final);
    const saved=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');await page.locator('#btnSave').click();assert.equal((await saved).status(),200);
    await page.locator('#fileStatus').filter({hasText:/Local test design saved|already up to date/}).waitFor();await page.reload();await page.locator('#btnSave').filter({hasText:'Save test design'}).waitFor();assert.deepEqual(await design(page),final);
    const reopened=await pageFor(width,height);assert.deepEqual(await design(reopened),final);await preview(reopened,'video');await openDrawer(reopened);await check(reopened,label+'/reopened');
    const generatedPage=await page.context().newPage();
    for(const kind of ['cards','video','activity']) {
      await preview(page,kind);await openDrawer(page);const live=await check(page,label+'/'+kind+'/parity-source');
      await generatedPage.setContent(`<base href="${server.baseUrl}/bespoke/"><style>html,body{margin:0}main{width:${live.w}px;max-width:100%}*{box-sizing:border-box}</style><style>${cssForDesign(catalog,final)}</style><main>${renderSlide(catalog,final,kind)}</main>`);
      const summary=generatedPage.locator('.slide-sidebar-disclosure > summary');if(await summary.isVisible())await summary.click();await generatedPage.evaluate(()=>document.fonts.ready);
      const generated=await check(generatedPage,label+'/'+kind+'/generated',{generated:true});assert.equal(generated.nav.w,live.nav.w);assert.equal(generated.main.w,live.main.w);generatedChecks++;
    }
    await generatedPage.setContent(`<base href="${server.baseUrl}/bespoke/"><style>${templateCss}</style><style>${cssForDesign(catalog,final)}</style>${templateNav}`);
    assert.equal(await generatedPage.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor),color(final.roles.sidebar));
    assert.equal(await generatedPage.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().width),280,'Canonical template retains its own280px navigation geometry');
  }
  assert.deepEqual(errors,[],'No browser errors');assert(!requests.some(r=>new URL(r.url()).origin!==server.baseUrl),'No external requests');
  assert(!requests.some(r=>r.resourceType()==='media'),'No media requests');
  if(output)await fs.writeFile(path.join(output,'sidebar-evidence.json'),JSON.stringify({engine,geometryChecks,paints,axes,generatedChecks,evidence},null,2));
  console.log(`Sidebar (${engine}): ${geometryChecks} geometry checks, ${paints} exact role paints, ${axes} accessibility scans, ${generatedChecks} generated parity cases; state, keyboard and inert navigation checks passed.`);
} finally {for(const context of contexts)await context.close();await browser.close();await server.close();}
