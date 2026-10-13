#!/usr/bin/env node
// Synthetic responsive/editor checks, independent of the user's browser or preview service.
import { builderDestination, EDITOR_DESTINATIONS } from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import catalog from '../bespoke/builder-catalog.json' with { type:'json' };
import { defaultDesign, cssForDesign, renderSlide } from '../bespoke/builder-model.mjs';
import { createDevServer } from './bespoke-dev-server.mjs';

const root=path.resolve(import.meta.dirname,'..'), output=process.env.BESPOKE_REVIEW_DIR;
if(output)await fs.mkdir(output,{recursive:true});
const axeSource=await fs.readFile(path.join(root,'node_modules/axe-core/axe.min.js'),'utf8');
const legacy=JSON.parse(await fs.readFile(path.join(root,'scripts/test-fixtures/bespoke/selection-money-management.json'),'utf8'));
const template=await fs.readFile(path.join(root,'SPOKES Builder/template.html'),'utf8');
const templateCss=[...template.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const templateSections=[...template.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]);
const canonicalCards=templateSections.find(s=>s.includes('class="cards-grid"')).replace('class="slide"','class="slide active"');
const canonicalDivider=templateSections.find(s=>s.includes('slide-section')).replace('slide slide-section','slide slide-section active');
const engine=process.env.BESPOKE_BROWSER||'chromium';
assert(['chromium','webkit'].includes(engine),'Use a supported isolated browser engine');
const server=await createDevServer({port:0}), browser=await ({chromium,webkit}[engine]).launch();
const evidence=[], failures=[], errors=[], external=[], contexts=[];
const cases=[{width:320,height:568},{width:390,height:844},{width:768,height:900},{width:1100,height:700},{width:1920,height:1080},{width:844,height:390},{width:390,height:568,textScale:2},{width:768,height:900,textScale:2}];
let axes=0, editorChecks=0, geometryChecks=0, canonicalChecks=0;
const report=(name,details)=>{failures.push({name,...details});console.error('FAIL '+name+': '+JSON.stringify(details));};
async function pageFor(view) {
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},reducedMotion:'reduce'});contexts.push(context);
  await context.addInitScript(()=>window.__bespokeAutosave={enabled:false});
  await context.route(/^https?:/,route=>{if(new URL(route.request().url()).origin===server.baseUrl)return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',async dialog=>{if(dialog.message().startsWith('Open this copy instead'))await dialog.accept();else {errors.push('Unexpected dialog: '+dialog.message());await dialog.dismiss();}});
  await page.goto(server.baseUrl+'/bespoke/');await page.locator('#localPreviewNotice').waitFor();
  await page.locator('#btnSave').filter({hasText:'Save test design'}).waitFor();
  if(view.textScale)await page.addStyleTag({content:`html{font-size:${view.textScale*100}%!important}`});
  await page.evaluate(()=>document.fonts.ready);return page;
}
async function surface(page,name) {if(name==='preview'&&['team','start'].includes(await page.locator('#workspace').getAttribute('data-stage')))await page.locator('#stage-slides').click();if(await page.locator('#surface-'+name).isVisible())await page.locator('#surface-'+name).click();}
function longDesign() {
  const d=defaultDesign(catalog);d.background='crosshatch';
  d.samples.title='A useful next step '.repeat(12).slice(0,catalog.sampleLimits.title);d.samples.subtitle='Long sample copy remains available and readable. '.repeat(15).slice(0,catalog.sampleLimits.subtitle);
  d.samples.boxes=Array.from({length:4},(_,i)=>`${i+1}. `+'Make a practical plan. Reflect and adjust. '.repeat(40).slice(0,catalog.sampleLimits.box-3));
  d.slides.cards.count='4';d.slides.cards.treatment='numbered';d.slides.activity.labelStyle='pill';d.slides.video.frame='accent';return d;
}
async function overflow(page,label) {
  const m=await page.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,html:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!el.closest('#stepList,.preview-tabs,.sr-only')&&getComputedStyle(el).position!=='absolute';}).map(el=>({tag:el.tagName,id:el.id,cls:el.className,right:el.getBoundingClientRect().right})).slice(0,12)}));
  evidence.push({type:'viewport',label,...m});editorChecks++;
  if(m.body>m.width+1||m.html>m.width+1)report('horizontal overflow '+label,m);
}
async function axe(page,label) {
  await page.addScriptTag({content:axeSource});
  // User-authored preview contrast is advisory; this scan covers editor controls.
  const violations=await page.evaluate(async()=> (await window.axe.run({exclude:[['#modelStage'],['.button-color-sample']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
  axes++;if(violations.length)report('editor axe '+label,{violations});
}
async function geometry(page,label) {
  const m=await page.locator('.bespoke-slide,.slide.active').evaluate(el=>{
    const r=el.getBoundingClientRect();
    // Native details can expose layout rectangles for content that is not painted.
    const boxes=[...el.querySelectorAll('h1,h2,h3,h4,p,li,.slide-logo,.slide-card,.card,.slide-activity,.slide-video-frame,.slide-video-frame>span')].filter(n=>!n.closest('details:not([open])')&&n.getBoundingClientRect().width).map(n=>{const b=n.getBoundingClientRect();return {name:n.className||n.tagName,x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,scrollW:n.scrollWidth,clientW:n.clientWidth};});
    const grid=el.querySelector('.slide-cards,.cards-grid');
    return {w:r.width,h:r.height,scrollW:el.scrollWidth,scrollH:el.scrollHeight,canonical:el.matches('.slide.active'),columns:grid?getComputedStyle(grid).gridTemplateColumns:null,boxes};
  });
  const maxHeight=m.canonical?m.scrollH:m.h;
  const escaped=m.boxes.filter(b=>b.x<-.5||b.y<-.5||b.x+b.w>m.w+.5||b.y+b.h>maxHeight+.5||b.scrollW>b.clientW+1);
  geometryChecks++;if(escaped.length||m.scrollW>m.w+1||(!m.canonical&&m.scrollH>m.h+1)){report('slide containment '+label,{...m,escaped});if(output)await page.screenshot({path:path.join(output,`failure-${label.replace(/[^a-zA-Z0-9-]/g,'-')}.png`)});}
  if(m.canonical&&m.scrollH>m.h+1) {
    const reachable=await page.locator('.slide.active').evaluate(el=>{el.scrollTop=el.scrollHeight;const last=[...el.querySelectorAll('h2,h4,p,li')].at(-1),r=el.getBoundingClientRect(),b=last.getBoundingClientRect();const result=b.bottom<=r.bottom+1&&b.bottom>=r.top;el.scrollTop=0;return result;});
    if(!reachable)report('canonical final copy not scroll reachable '+label,{});
  }
  evidence.push({type:'geometry',label,...m});
  return m;
}
try {
  for(const view of process.env.BESPOKE_QA_GEOMETRY_ONLY?[]:cases) {
    const label=`${view.width}x${view.height}${view.textScale?' text200':''}`,page=await pageFor(view);
    const labels=EDITOR_DESTINATIONS;
    for(const name of labels) {
      await builderDestination(page, name);
      await overflow(page,`${label}/${name}`);
      if(name === 'Start') {
        const lesson=page.locator('#lessonSelect'),chosen=await lesson.inputValue();await lesson.focus();
        assert(await lesson.evaluate(el=>el===document.activeElement),'Native lesson selector remains keyboard focusable');
        await page.keyboard.press('Tab');assert(await page.locator('#teamName').evaluate(el=>el===document.activeElement),'Tab leaves the native selector for the next field');
        await lesson.selectOption(chosen);assert.equal(await lesson.inputValue(),chosen,'Native select preserves its chosen value');
      }
      if(/Start|Shared colors|Text boxes|Video slide|Review & save/.test(name))await axe(page,`${label}/${name}`);
    }
    await surface(page,'preview');
    for(const kind of ['title','divider','cards','video','activity']) {
      await page.locator(`#previewTabs [data-view="${kind}"]`).click();await overflow(page,`${label}/preview-${kind}`);await geometry(page,`${label}/preview-${kind}`);
    }
    await surface(page,'design');await builderDestination(page, 'Starting look');
    await page.locator('[data-preset="modern"]').click();
    if(!await page.locator('#presetDialog').isVisible()){await builderDestination(page,'Starting look');await page.locator('[data-preset="professional"]').click();}
    await page.locator('#presetDialog').waitFor({state:'visible'});await axe(page,label+'/preset dialog');
    const dialog=await page.locator('#presetDialog').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,sw:el.scrollWidth,cw:el.clientWidth};});
    if(dialog.x<0||dialog.y<0||dialog.x+dialog.w>view.width+1||dialog.y+dialog.h>view.height+1||dialog.sw>dialog.cw+1)report('dialog containment '+label,dialog);
    for(const id of ['presetCancel','presetSkipConfirmation','presetApply']) {const node=page.locator('#'+id);await node.focus();assert(await node.evaluate(el=>el===document.activeElement),'Dialog control keyboard focus');}
    await page.keyboard.press('Tab');assert(await page.locator('#presetSkipConfirmation').evaluate(el=>el===document.activeElement),'Dialog forward focus wraps');
    await page.keyboard.press('Shift+Tab');assert(await page.locator('#presetApply').evaluate(el=>el===document.activeElement),'Dialog backward focus wraps');
    await page.keyboard.press('Escape');assert(!await page.locator('#presetDialog').isVisible());
    await surface(page,'design');await builderDestination(page, 'Video slide');
    if(output&&[320,390,768,1920].includes(view.width))await page.screenshot({path:path.join(output,`editor-${label}.png`),fullPage:true});
    console.log('CHECK editor '+label);
  }
  // Fill gaps around the narrow desktop preview and text resizing. Existing title,
  // frame and pattern suites own broad color/pixel matrices and canonical parity.
  for(const view of [{width:320,height:800},{width:768,height:900},{width:1100,height:700},{width:1920,height:1080},{width:844,height:390},{width:390,height:800,textScale:2}]) {
    const page=await pageFor(view);await surface(page,'preview');
    const canvas=await page.locator('#modelStage').evaluate(el=>el.getBoundingClientRect().width);assert(canvas>0,'Measure a visible preview canvas, not the layout gallery');
    const samplePage=await page.context().newPage();
    const fixture=longDesign();await surface(page,'design');
    await page.locator('#teamFileInput').setInputFiles({name:'synthetic-visual.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'bespoke-selection/v2',date:'2026-09-24',submittedAt:'2026-09-24T16:30:00.000Z',lesson:legacy.lesson,team:legacy.team,design:fixture}))});
    await page.locator('#fileStatus').filter({hasText:'Opened synthetic-visual.json.'}).waitFor();
    await builderDestination(page, 'Text boxes');
    for(const layout of ['columns','grid','rows']) {
      await surface(page,'design');await page.getByRole('group',{name:/Arrangement/}).locator(`[data-choice="${layout}"]`).click();
      const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
      assert.deepEqual(current,{...fixture,slides:{...fixture.slides,cards:{...fixture.slides.cards,layout}}},'Reflow must not change chosen layout, count, colors, fonts or sample text');
      await surface(page,'preview');await geometry(page,`${view.width}/${view.textScale||1}/cards/${layout}/actual-editor-maxcopy`);
    }
    for(const group of catalog.slideGroups)for(const option of group.decisions.find(d=>d.id==='layout').options) {
      const d=longDesign();d.slides[group.id].layout=option.id;
      await samplePage.setContent(`<html><head><base href="${server.baseUrl}/bespoke/"><link rel="stylesheet" href="builder.css"><style>html{font-size:${view.textScale?200:100}%}body{margin:0;width:${canvas||view.width-48}px;max-width:100%}*{box-sizing:border-box}</style><style>${cssForDesign(catalog,d)}</style></head><body>${renderSlide(catalog,d,group.id)}</body></html>`);
      await samplePage.evaluate(()=>document.fonts.ready);const sampleGeometry=await geometry(samplePage,`${view.width}/${view.textScale||1}/${group.id}/${option.id}/maxcopy`);
      const sampleContentWidth=group.id==='cards'?await samplePage.locator('.slide-content').evaluate(el=>{const css=getComputedStyle(el);return el.getBoundingClientRect().width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);}):null;
      if(output&&['activity','cards','video'].includes(group.id)&&option.id==='side')await samplePage.screenshot({path:path.join(output,`slide-${view.width}-${view.textScale||1}-${group.id}.png`),fullPage:true});
      if(['cards','divider'].includes(group.id)) {
        if(output&&((group.id==='cards'&&option.id==='columns')||(group.id==='divider'&&option.id==='number')))await samplePage.screenshot({path:path.join(output,`fixed-${view.width}-${view.textScale||1}-${group.id}.png`)});
        await samplePage.setContent(`<html><head><base href="${server.baseUrl}/bespoke/"><style>${templateCss}</style><style>html{font-size:${view.textScale?200:100}%}body{margin:0;width:${canvas}px;max-width:100%}*,*::before,*::after{animation:none!important;transition:none!important}</style><style>${cssForDesign(catalog,d)}</style></head><body>${group.id==='cards'?canonicalCards:canonicalDivider}</body></html>`);
        await samplePage.evaluate(({group,d})=>{
          if(group==='cards') {
            const grid=document.querySelector('.cards-grid'),card=grid.firstElementChild.cloneNode(true);grid.replaceChildren();
            d.samples.boxes.forEach((text,i)=>{const clone=card.cloneNode(true);clone.querySelector('h4').textContent=`Step ${i+1}`;const list=document.createElement('ol');list.className='content-list';const li=document.createElement('li');li.textContent=text;list.append(li);clone.querySelector('p').replaceWith(list);grid.append(clone);});
            document.querySelector('h2').textContent='Build a useful habit';document.querySelector('p').textContent='Synthetic canonical wrapper';
          }
        },{group:group.id,d});
        await samplePage.evaluate(()=>document.fonts.ready);
        // The sample now includes the lesson sidebar. Match the available MAIN
        // content width, not the shell width, for canonical column parity.
        if(group.id==='cards')await samplePage.locator('.slide.active').evaluate((el,width)=>{const css=getComputedStyle(el);const outer=width+parseFloat(css.paddingLeft)+parseFloat(css.paddingRight);el.style.width=outer+'px';document.body.style.width=outer+'px';},sampleContentWidth);
        const canonicalGeometry=await geometry(samplePage,`${view.width}/${view.textScale||1}/${group.id}/${option.id}/canonical`);canonicalChecks++;
        if(group.id==='cards')assert.equal(canonicalGeometry.columns.split(' ').length,sampleGeometry.columns.split(' ').length,'Canonical and generated samples reflow to the same number of columns');
        else {
          const mark=await samplePage.locator('.slide-section').evaluate(el=>{const s=getComputedStyle(el,'::after'),r=el.getBoundingClientRect();return {top:parseFloat(s.top),right:parseFloat(s.right),w:parseFloat(s.width),h:parseFloat(s.height),slideW:r.width,slideH:r.height,whiteSpace:s.whiteSpace};});
          assert.equal(mark.whiteSpace,'nowrap');assert(mark.top>=0&&mark.right>=0&&mark.top+mark.h<=mark.slideH+1&&mark.right+mark.w<=mark.slideW+1,'Canonical decorative mark is fully contained');
        }
      }
    }
  }
  if(errors.length)report('runtime errors',{errors});if(external.length)report('external requests',{external});
  if(output)await fs.writeFile(path.join(output,'visual-evidence.json'),JSON.stringify({engine,axes,editorChecks,geometryChecks,canonicalChecks,evidence,failures},null,2));
  console.log(`Visual QA (${engine}): ${axes} editor axe scans, ${editorChecks} viewport checks, ${geometryChecks} slide checks (${canonicalChecks} canonical); ${failures.length} findings.`);
  if(failures.length)process.exitCode=1;
} finally {for(const context of contexts)await context.close();await browser.close();await server.close();}
